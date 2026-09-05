import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/modules/rbac/permissions";
import { listAssets } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import { listUsers } from "@/modules/users/service";
import { listDepartments } from "@/modules/departments/service";
import { listVendors } from "@/modules/vendors/service";

const LIMIT = 6;

export type SearchHit = { id: number; title: string; subtitle: string; href: string };
export type SearchResults = { assets: SearchHit[]; users: SearchHit[]; departments: SearchHit[]; vendors: SearchHit[] };

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);

    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    const empty: SearchResults = { assets: [], users: [], departments: [], vendors: [] };
    if (q.length < 1) return apiSuccess({ results: empty });

    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };

    const [assets, users, departments, vendors] = await Promise.all([
      hasPermission(session, "assets.view")
        ? listAssets({ search: q, page: 1, pageSize: LIMIT, actor })
        : Promise.resolve({ items: [], total: 0 }),
      hasPermission(session, "users.view")
        ? listUsers({ search: q, page: 1, pageSize: LIMIT })
        : Promise.resolve({ items: [], total: 0 }),
      hasPermission(session, "departments.view")
        ? listDepartments({ search: q, page: 1, pageSize: LIMIT })
        : Promise.resolve({ items: [], total: 0 }),
      hasPermission(session, "vendors.view")
        ? listVendors({ search: q, page: 1, pageSize: LIMIT })
        : Promise.resolve({ items: [], total: 0 }),
    ]);

    const results: SearchResults = {
      assets: assets.items.map((a) => ({
        id: a.id,
        title: a.assetTag,
        subtitle: [descriptorFor(a.assetType).labelSingular, [a.brand, a.model].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
        href: `/assets/${a.id}`,
      })),
      users: users.items.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: [u.employeeId, u.department?.name].filter(Boolean).join(" · "),
        href: `/users/${u.id}`,
      })),
      departments: departments.items.map((d) => ({ id: d.id, title: d.name, subtitle: "Department", href: `/departments` })),
      vendors: vendors.items.map((v) => ({
        id: v.id,
        title: v.name,
        subtitle: [v.contactPerson, v.email].filter(Boolean).join(" · ") || "Vendor",
        href: `/vendors/${v.id}`,
      })),
    };

    return apiSuccess({ results });
  } catch (error) {
    return apiError(error);
  }
}
