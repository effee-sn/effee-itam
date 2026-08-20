import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { isScopeCode } from "../src/lib/scope";

const ROLES = [
  { name: "SUPER_ADMIN", description: "Full access to every module and setting", isSystem: true },
  {
    name: "IT_ADMIN",
    description: "Manages assets, users, vendors, and day-to-day IT operations",
    isSystem: true,
  },
  {
    name: "IT_EXECUTIVE",
    description: "Handles asset assignment/return and views reports",
    isSystem: true,
  },
  {
    name: "DEPT_HEAD",
    description: "Views and reports on their own department's assets",
    isSystem: true,
  },
  { name: "EMPLOYEE", description: "Views only the assets assigned to them", isSystem: true },
] as const;

const PERMISSIONS = [
  { code: "assets.view", module: "assets", description: "View assets" },
  { code: "assets.create", module: "assets", description: "Create assets" },
  { code: "assets.edit", module: "assets", description: "Edit assets" },
  { code: "assets.delete", module: "assets", description: "Delete assets" },
  { code: "assets.assign", module: "assets", description: "Assign assets to users" },
  { code: "assets.return", module: "assets", description: "Return/transfer assigned assets" },
  { code: "assets.view_history", module: "assets", description: "View an asset's past assignment history" },
  { code: "assets.view_deleted", module: "assets", description: "View deleted assets and restore them" },
  // Data-visibility scope, modeled as ordinary permission codes rather than a separate
  // schema concept — see src/lib/scope.ts. Exactly one of these 3 per module should be
  // granted to a role; enforced by roleSchema's refine and the Roles UI's mutually-
  // exclusive checkboxes, resolved defensively (most-restrictive-wins) if that's ever
  // violated — see resolveModuleScope in src/lib/scope.ts.
  { code: "assets.scope_all", module: "assets", description: "Data visibility: see all assets" },
  {
    code: "assets.scope_department",
    module: "assets",
    description: "Data visibility: see own department's assets only",
  },
  { code: "assets.scope_self", module: "assets", description: "Data visibility: see only assets assigned to them" },
  { code: "users.view", module: "users", description: "View users" },
  { code: "users.create", module: "users", description: "Create users" },
  { code: "users.edit", module: "users", description: "Edit users" },
  { code: "reports.view", module: "reports", description: "View reports" },
  { code: "reports.export", module: "reports", description: "Export reports" },
  { code: "departments.view", module: "departments", description: "View departments" },
  { code: "departments.create", module: "departments", description: "Create departments" },
  { code: "departments.edit", module: "departments", description: "Edit departments" },
  { code: "departments.delete", module: "departments", description: "Delete departments" },
  { code: "vendors.view", module: "vendors", description: "View vendors" },
  { code: "vendors.create", module: "vendors", description: "Create vendors" },
  { code: "vendors.edit", module: "vendors", description: "Edit vendors" },
  { code: "vendors.delete", module: "vendors", description: "Delete vendors" },
  { code: "audit.view", module: "audit", description: "View the audit log trail" },
  { code: "settings.view", module: "settings", description: "View system settings" },
  { code: "settings.edit", module: "settings", description: "Edit system settings" },
  { code: "roles.view", module: "roles", description: "View roles and permissions" },
  { code: "roles.create", module: "roles", description: "Create custom roles" },
  { code: "roles.edit", module: "roles", description: "Edit role permissions" },
  { code: "roles.delete", module: "roles", description: "Delete custom roles" },
] as const;

// Every non-scope permission — used as the base grant for the two ALL-access system
// roles, which then get exactly one scope level (the broadest, "all") layered on top per
// scope dimension, rather than PERMISSIONS.map(p => p.code) (which would grant all 3
// conflicting scope levels per dimension at once). Uses the shared isScopeCode helper
// rather than a bare ".scope_" substring check, so a code shaped like
// "<module>.<action>_scope_all" is still correctly recognised as a scope code.
const ALL_NON_SCOPE_CODES = PERMISSIONS.filter((p) => !isScopeCode(p.code)).map((p) => p.code);

const ALL_SCOPE = ["assets.scope_all"];
const DEPARTMENT_SCOPE = ["assets.scope_department"];
const SELF_SCOPE = ["assets.scope_self"];

const ROLE_PERMISSIONS: Record<(typeof ROLES)[number]["name"], readonly string[]> = {
  SUPER_ADMIN: [...ALL_NON_SCOPE_CODES, ...ALL_SCOPE],
  IT_ADMIN: [...ALL_NON_SCOPE_CODES, ...ALL_SCOPE],
  IT_EXECUTIVE: [
    "assets.view",
    "assets.assign",
    "assets.return",
    "assets.view_history",
    "reports.view",
    "reports.export",
    "departments.view",
    "vendors.view",
    ...ALL_SCOPE,
  ],
  DEPT_HEAD: [
    "assets.view",
    "assets.view_history",
    "reports.view",
    "reports.export",
    ...DEPARTMENT_SCOPE,
  ],
  EMPLOYEE: ["assets.view", ...SELF_SCOPE],
};

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: role,
    });
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { module: permission.module, description: permission.description },
      create: permission,
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();

  for (const role of roles) {
    const grantedCodes = ROLE_PERMISSIONS[role.name as (typeof ROLES)[number]["name"]];
    // Custom roles are the admin's to configure — the seed has no opinion and must not touch
    // them. Only the seeded system roles are reconciled below.
    if (!grantedCodes) continue;

    for (const code of grantedCodes) {
      const permission = permissions.find((p) => p.code === code);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    // Scope codes are mutually exclusive within a dimension, and resolveScopeDimension picks
    // the MOST RESTRICTIVE when a role somehow holds more than one (fail-closed). Upserting
    // alone can therefore silently downgrade a role forever: a DEPT_HEAD left holding a stale
    // `assets.scope_self` from an older seed kept resolving to SELF, so department heads saw
    // only their own assets instead of their department's. Nothing ever removed it, because
    // the loop above only adds.
    //
    // So for system roles, revoke the scope levels this seed did NOT grant. Scoped to scope
    // codes only — ordinary permissions an admin added on top of a system role are left alone.
    const granted = new Set<string>(grantedCodes);
    const staleScopeIds = permissions
      .filter((p) => isScopeCode(p.code) && !granted.has(p.code))
      .map((p) => p.id);
    if (staleScopeIds.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { in: staleScopeIds } },
      });
    }
  }

  let itDepartment = await prisma.department.findFirst({ where: { name: "IT", deletedAt: null } });
  if (!itDepartment) {
    itDepartment = await prisma.department.create({ data: { name: "IT" } });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@itam.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail, deletedAt: null } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        employeeId: "EMP0001",
        name: "Super Admin",
        email: adminEmail,
        passwordHash,
        roleId: superAdminRole.id,
        departmentId: itDepartment.id,
        designation: "System Administrator",
        mustChangePassword: true,
      },
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, companyName: "Company Name" },
  });

  console.log("Seed complete.");
  console.log(`Super Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("Change this password immediately after first login.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
