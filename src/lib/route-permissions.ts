/**
 * Which permission each protected page requires — the source for the MIDDLEWARE permission gate.
 *
 * This mirrors the `requirePageSession("<perm>")` call at the top of each page. It lives in
 * middleware because a Server Component `redirect()` does NOT produce a real HTTP redirect in
 * this app: the (app) layout renders and streams the shell (the sidebar needs the session)
 * before the page's redirect throws, so the 200 status is already committed and the redirect
 * degrades to a not-found shell. Middleware runs before any rendering, so its redirect is a
 * real 307. `requirePageSession` stays in place as the server-side guarantee — it still stops
 * the page from rendering — and also covers client-side (soft) navigations, where redirect()
 * does work. This table only provides the clean redirect for hard page loads.
 *
 * Ordered — first match wins — so the more specific routes (…/new, …/edit) sit before the
 * general list route. A path matching nothing here needs only a valid session (e.g.
 * /dashboard, /change-password), which middleware has already verified.
 *
 * KEEP IN SYNC with the `requirePageSession(...)` calls under src/app/(app). The route test in
 * the suite hits one route per permission with a role that lacks it and asserts the redirect,
 * so drift here is caught.
 */
export const ROUTE_PERMISSIONS: readonly { pattern: RegExp; permission: string }[] = [
  // Assets — specific before general.
  { pattern: /^\/assets\/[^/]+\/new(\/.*)?$/, permission: "assets.create" }, // /assets/computers/new, /assets/phones/new, …
  { pattern: /^\/assets\/\d+\/edit(\/.*)?$/, permission: "assets.edit" }, // /assets/123/edit
  { pattern: /^\/assets(\/.*)?$/, permission: "assets.view" }, // /assets/mine, /assets/computers, /assets/123, …

  // Roles.
  { pattern: /^\/roles\/new(\/.*)?$/, permission: "roles.create" },
  { pattern: /^\/roles\/\d+\/edit(\/.*)?$/, permission: "roles.edit" },
  { pattern: /^\/roles(\/.*)?$/, permission: "roles.view" },

  // Discovered inventory (admin onboarding tool).
  { pattern: /^\/discovered(\/.*)?$/, permission: "assets.create" },

  // Single-permission modules.
  { pattern: /^\/users(\/.*)?$/, permission: "users.view" },
  { pattern: /^\/vendors(\/.*)?$/, permission: "vendors.view" },
  { pattern: /^\/departments(\/.*)?$/, permission: "departments.view" },
  { pattern: /^\/reports(\/.*)?$/, permission: "reports.view" },
  { pattern: /^\/audit-logs(\/.*)?$/, permission: "audit.view" },
  { pattern: /^\/settings(\/.*)?$/, permission: "settings.view" },
];

/** The permission a path requires, or null when a valid session alone is enough. */
export function requiredPermissionFor(pathname: string): string | null {
  return ROUTE_PERMISSIONS.find((r) => r.pattern.test(pathname))?.permission ?? null;
}
