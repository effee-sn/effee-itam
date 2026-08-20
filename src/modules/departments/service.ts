import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import type { DepartmentInput } from "./validators";

export async function listDepartments({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.department.count({ where }),
  ]);

  return { items, total };
}

export async function listDepartmentOptions() {
  return prisma.department.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

export async function listDepartmentsForExport(search?: string) {
  return prisma.department.findMany({
    where: { deletedAt: null, ...(search ? { name: { contains: search } } : {}) },
    orderBy: { name: "asc" },
  });
}

async function assertNameAvailable(name: string, excludeId?: number) {
  const existing = await prisma.department.findFirst({
    where: { name, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A department with this name already exists", 409);
  }
}

export async function createDepartment(data: DepartmentInput, actorUserId: number) {
  await assertNameAvailable(data.name);
  const department = await prisma.department.create({ data });
  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "departments",
    entityType: "Department",
    entityId: department.id,
  });
  return department;
}

export async function updateDepartment(id: number, data: DepartmentInput, actorUserId: number) {
  await assertNameAvailable(data.name, id);
  const department = await prisma.department.update({ where: { id }, data });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "departments",
    entityType: "Department",
    entityId: department.id,
  });
  return department;
}

export async function deleteDepartment(id: number, actorUserId: number) {
  await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: actorUserId,
    action: "DELETE",
    module: "departments",
    entityType: "Department",
    entityId: id,
  });
}
