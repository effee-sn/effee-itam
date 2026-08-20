import type { RoleScope } from "@/generated/prisma/client";

// A "dimension" is one independent All/Department/Owned setting, backed by 3 permission
// codes (`<codePrefix>_all` / `_department` / `_self`) rather than a separate schema
// concept. Each module currently has exactly one dimension (its own data-visibility
// scope), but a module can have more than one if it ever needs to scope two independent
// things. `id` is the key used in the `moduleScopes` map baked into the session; `module`
// is which permission-group card on the Roles page it's rendered inside; `codePrefix` is
// the permission-code namespace. Adding a new dimension to an existing module, or a new
// scoped module entirely, means adding an entry here, seeding its 3 permission codes, and
// granting them where appropriate — the deliberate, updatable boundary, same as adding any
// other new permission already requires.
export type ScopeDimension = { id: string; module: string; codePrefix: string; label: string };

export const SCOPE_DIMENSIONS: ScopeDimension[] = [
  { id: "assets", module: "assets", codePrefix: "assets.scope", label: "Data visibility" },
];

export const SCOPE_LEVELS: { value: RoleScope; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DEPARTMENT", label: "Own department only" },
  { value: "SELF", label: "Assigned to me only" },
];

// True for any permission code that belongs to some scope dimension — used to separate
// scope checkboxes from regular action-permission checkboxes wherever permissions are
// listed/rendered (e.g. role-form.tsx's action-permission grid, seed.ts's "grant every
// non-scope permission" shorthand for admin roles).
export function isScopeCode(code: string): boolean {
  return SCOPE_DIMENSIONS.some((d) => SCOPE_LEVELS.some((l) => code === `${d.codePrefix}_${l.value.toLowerCase()}`));
}

// Fail-closed precedence: most restrictive wins if more than one scope code is somehow
// granted for the same dimension (shouldn't happen — the UI enforces one-at-a-time — but
// the data doesn't forbid it). Missing entirely -> SELF, not ALL, so a role that's never
// been given an explicit scope for a dimension can't accidentally see/act on everything.
export function resolveScopeDimension(permissions: string[], dimension: ScopeDimension): RoleScope {
  if (permissions.includes(`${dimension.codePrefix}_self`)) return "SELF";
  if (permissions.includes(`${dimension.codePrefix}_department`)) return "DEPARTMENT";
  if (permissions.includes(`${dimension.codePrefix}_all`)) return "ALL";
  return "SELF";
}

export function resolveModuleScopes(permissions: string[]): Record<string, RoleScope> {
  return Object.fromEntries(SCOPE_DIMENSIONS.map((d) => [d.id, resolveScopeDimension(permissions, d)]));
}

// Breadth ranking for the view-switcher below: ALL sees the most, SELF the least. A user
// can always narrow their own view to anything at or below their role's ceiling, but never
// broaden past it — that's an access-control boundary, not a display preference.
const SCOPE_RANK: Record<RoleScope, number> = { SELF: 0, DEPARTMENT: 1, ALL: 2 };

// Every scope level the user is actually allowed to switch their own view to, from
// broadest to narrowest, given their role's ceiling for a module. A SELF ceiling has
// nothing to switch between — callers should hide the switcher entirely in that case.
export function availableScopeLevels(ceiling: RoleScope): RoleScope[] {
  return SCOPE_LEVELS.map((l) => l.value).filter((level) => SCOPE_RANK[level] <= SCOPE_RANK[ceiling]);
}

// Resolves the effective scope to actually query with: the requested view, clamped down
// to the role's ceiling if it asks for something broader (or isn't a real scope value at
// all — e.g. a tampered-with query string). Never trust the client-supplied view as-is.
export function clampScope(ceiling: RoleScope, requestedView: string | undefined): RoleScope {
  if (!requestedView) return ceiling;
  const requested = requestedView.toUpperCase();
  if (requested !== "ALL" && requested !== "DEPARTMENT" && requested !== "SELF") return ceiling;
  return SCOPE_RANK[requested as RoleScope] <= SCOPE_RANK[ceiling] ? (requested as RoleScope) : ceiling;
}
