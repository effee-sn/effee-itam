import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";
import { requiredPermissionFor } from "@/lib/route-permissions";

// Builds the redirect target from the request's own Host header rather than from
// `request.url`. Behind a reverse proxy, `request.url`'s origin is Next's internal one
// (observed: http://localhost:3000) even when nginx correctly forwards Host and
// X-Forwarded-Host — so NextResponse.redirect(new URL(path, request.url)) sends the browser
// to localhost:3000 instead of the address the user actually typed. Next's middleware
// requires an absolute Location (a relative one throws ERR_INVALID_URL), so we can't dodge
// the origin question — we resolve it from the proxy headers explicitly instead.
function redirectTo(request: NextRequest, path: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  // No Host header at all (shouldn't happen over HTTP/1.1) — fall back to request.url so a
  // redirect still happens rather than throwing.
  const base = host ? `${proto}://${host}` : request.url;
  return NextResponse.redirect(new URL(path, base));
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (session) {
      return redirectTo(request, "/dashboard");
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: { message: "Not authenticated", code: "UNAUTHENTICATED" } },
        { status: 401 },
      );
    }
    return redirectTo(request, "/login");
  }

  // A freshly created/imported user, or anyone whose password an admin just reset, must
  // change it before touching the rest of the app. /api/auth is already excluded by the
  // matcher below, so the change-password API call itself is never blocked by this.
  if (session.mustChangePassword && pathname !== "/change-password") {
    return redirectTo(request, "/change-password");
  }

  // Permission gate. Mirrors the requirePageSession("<perm>") at the top of each page, but
  // enforced HERE because a Server Component redirect() doesn't produce a real HTTP redirect
  // in this app (the layout streams before the page's redirect throws — see route-permissions.ts).
  // A user who lacks the page's permission is sent to /dashboard, which every authenticated user
  // can see. requirePageSession still runs server-side as the actual guarantee.
  const requiredPermission = requiredPermissionFor(pathname);
  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    return redirectTo(request, "/dashboard");
  }

  // The per-type asset lists (/assets/computers, /assets/printers/new …) are for roles that
  // manage the whole estate. Anyone with a narrower scope gets the single combined list at
  // /assets/mine instead, which is also the only asset entry their sidebar offers.
  //
  // This lives in middleware rather than in the page because `redirect()` from a Server
  // Component does NOT produce an HTTP redirect in this app — it answers 200 with the
  // redirect encoded in the RSC payload, so a typed URL or a bookmark just renders a
  // not-found shell. Middleware issues a real 307.
  //
  // Matched structurally instead of against a list of slugs, so adding an asset type needs no
  // change here: anything under /assets/ that isn't `mine` and isn't a numeric asset id is a
  // type page. Asset detail (/assets/42, /assets/42/edit) stays reachable for everyone —
  // getRoleScope() already limits those to rows the user may see.
  const assetSegment = /^\/assets\/([^/]+)/.exec(pathname)?.[1];
  if (
    assetSegment &&
    assetSegment !== "mine" &&
    !/^\d+$/.test(assetSegment) &&
    (session.moduleScopes?.assets ?? "SELF") !== "ALL"
  ) {
    return redirectTo(request, "/assets/mine");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // `api/inventory` is excluded alongside `api/auth`: it's the machine-to-machine inventory
    // ingest, which has no session and does its own optional-token check.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/inventory|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
