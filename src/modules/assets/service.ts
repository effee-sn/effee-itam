import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import { clampScope } from "@/lib/scope";
import type { AssetStatus, AssetType, Prisma, RoleScope } from "@/generated/prisma/client";
import type { AssetInput } from "./validators";
import { descriptorFor } from "./types/registry";


/**
 * Row-level visibility on top of the assets.view permission, driven by the acting
 * user's per-module role scope: SELF sees only assets assigned to them, DEPARTMENT sees
 * only their own department's assets, ALL sees everything. `moduleScopes` is a map of
 * module-string -> RoleScope, baked into the session at login (derived from granted
 * `<module>.scope_*` permission codes) — this is the shared actor shape reused by every
 * module that needs scope, not just Assets.
 */
export type ScopeActor = { moduleScopes: Record<string, RoleScope>; userId: number; departmentId: number };

// `view`, when given, is the user's own on-page choice to narrow their view (via the
// Assets list's scope switcher) to something at or below their role's actual ceiling —
// clampScope refuses to let it broaden past that ceiling, so this is always safe to pass
// straight from a query string without validating it first.
export function getRoleScope(actor: ScopeActor, view?: string): Prisma.AssetWhereInput {
  const scope = clampScope(actor.moduleScopes["assets"], view);
  if (scope === "SELF") {
    return { currentAssignedUserId: actor.userId };
  }
  if (scope === "DEPARTMENT") {
    return { departmentId: actor.departmentId };
  }
  return {};
}

// Search branches for fields that live in a per-type detail table rather than on the asset
// itself. Prisma turns each into an `id IN (SELECT asset_id FROM ...)` subquery, so they're
// only worth emitting when the list could actually contain that type — a Computers list
// should never be probing phones.imei.
const DETAIL_SEARCH_BRANCHES: Partial<Record<AssetType, (search: string) => Prisma.AssetWhereInput>> = {
  PHONE: (search) => ({ phone: { imei: { contains: search } } }),
  SIM_CARD: (search) => ({ simCard: { mobileNumber: { contains: search } } }),
};

// The relations every asset read needs. Kept as constants so list, export and detail queries
// can't drift apart on what they include.
const ASSET_BASE_INCLUDE = {
  vendor: true,
  department: true,
  currentAssignedUser: true,
} as const;

// All 7 detail relations. Only one is ever non-null for a given asset (OTHER has none), and
// they're unique-key lookups, so including them all is cheaper than branching per type.
const ASSET_DETAIL_INCLUDE = {
  computer: true,
  monitor: true,
  printer: true,
  phone: true,
  simCard: true,
  networkDevice: true,
  peripheral: true,
} as const;

function buildAssetsWhere({
  search,
  status,
  actor,
  view,
  deleted,
  assetType,
}: {
  search?: string;
  status?: AssetStatus;
  actor: ScopeActor;
  view?: string;
  deleted?: boolean;
  assetType?: AssetType;
}): Prisma.AssetWhereInput {
  const detailBranches = assetType
    ? [DETAIL_SEARCH_BRANCHES[assetType]].filter(Boolean)
    : Object.values(DETAIL_SEARCH_BRANCHES);

  return {
    deletedAt: deleted ? { not: null } : null,
    ...getRoleScope(actor, view),
    ...(assetType ? { assetType } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { assetTag: { contains: search } },
            { serialNumber: { contains: search } },
            { hostname: { contains: search } },
            { macAddress: { contains: search } },
            { brand: { contains: search } },
            { model: { contains: search } },
            ...detailBranches.map((branch) => branch!(search)),
          ],
        }
      : {}),
  };
}

/**
 * Asset tags are typed in by hand — nothing is generated. They're the label physically stuck
 * on the thing, so whatever is on the sticker is what goes in the box.
 *
 * Deliberately NOT scoped to `deletedAt: null`, unlike the serial/MAC/IMEI checks. Those
 * identifiers are freed for reuse when an asset is deleted; `assets.asset_tag` has a real
 * DB-level unique index covering every row, deleted or not. Filtering by deletedAt here would
 * let a tag belonging to a soft-deleted asset pass this check and then blow up as a raw,
 * unhandled Prisma unique-constraint error on save.
 */
export async function assertAssetTagAvailable(assetTag: string, excludeId?: number) {
  const existing = await prisma.asset.findFirst({
    where: { assetTag, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    throw new AppError(
      "DUPLICATE",
      existing.deletedAt
        ? "That asset tag belongs to a deleted asset. Restore it, or use a different tag."
        : "An asset with this tag already exists",
      409,
    );
  }
}

// Only genuinely shared fields. Type-specific ones (OS, domain, workgroup, Intune, IMEI…)
// live on their type's detail row — see normalizeDetailInput.
function normalizeAssetInput(data: AssetInput) {
  return {
    serialNumber: data.serialNumber || null,
    hostname: data.hostname || null,
    macAddress: data.macAddress || null,
    ipAddress: data.ipAddress || null,
    brand: data.brand || null,
    model: data.model || null,
    vendorId: data.vendorId || null,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    invoiceNumber: data.invoiceNumber || null,
    warrantyStart: data.warrantyStart ? new Date(data.warrantyStart) : null,
    warrantyEnd: data.warrantyEnd ? new Date(data.warrantyEnd) : null,
    cost: data.cost || null,
    departmentId: data.departmentId || null,
    notes: data.notes || null,
  };
}

export async function assertSerialAvailable(serialNumber: string, excludeId?: number) {
  const existing = await prisma.asset.findFirst({
    where: { serialNumber, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "An asset with this serial number already exists", 409);
  }
}

export async function assertMacAddressAvailable(macAddress: string, excludeId?: number) {
  const existing = await prisma.asset.findFirst({
    where: { macAddress, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "An asset with this MAC address already exists", 409);
  }
}

// IMEI now lives on the phones detail table. Note `excludeId` is still an ASSET id (every
// caller has one), so the exclusion is applied to the related asset, not the phone row.
// Soft-delete-scoped like the others: deleting a phone frees its IMEI for reuse.
export async function assertImeiAvailable(imei: string, excludeId?: number) {
  const existing = await prisma.phone.findFirst({
    where: {
      imei,
      asset: { deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "An asset with this IMEI already exists", 409);
  }
}

// SIM mobile numbers used to be stored in serialNumber, so they were covered incidentally by
// assertSerialAvailable. Now they have their own column, that coverage has to be replaced or
// two SIMs could silently share a number.
export async function assertMobileNumberAvailable(mobileNumber: string, excludeId?: number) {
  const existing = await prisma.simCard.findFirst({
    where: {
      mobileNumber,
      asset: { deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A SIM card with this mobile number already exists", 409);
  }
}

export async function listAssets({
  search,
  status,
  page,
  pageSize,
  actor,
  view,
  deleted,
  assetType,
}: {
  search?: string;
  status?: AssetStatus;
  page: number;
  pageSize: number;
  actor: ScopeActor;
  view?: string;
  deleted?: boolean;
  assetType?: AssetType;
}) {
  const where = buildAssetsWhere({ search, status, actor, view, deleted, assetType });

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { ...ASSET_BASE_INCLUDE, ...ASSET_DETAIL_INCLUDE },
    }),
    prisma.asset.count({ where }),
  ]);

  return { items, total };
}

export async function listAssetsForExport({
  search,
  status,
  actor,
  view,
  assetType,
}: {
  search?: string;
  status?: AssetStatus;
  actor: ScopeActor;
  view?: string;
  assetType?: AssetType;
}) {
  const where = buildAssetsWhere({ search, status, actor, view, assetType });

  return prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { ...ASSET_BASE_INCLUDE, ...ASSET_DETAIL_INCLUDE },
  });
}

/**
 * How many assets of each type this actor can see, for the type tabs on the combined
 * My/Department Assets list.
 *
 * Deliberately scope-only — no search or status filter. The tab strip stays the same shape
 * while you type in the search box, which is what makes it usable; the counts are "what I
 * have", not "what currently matches".
 */
export async function countAssetsByType(actor: ScopeActor): Promise<Record<string, number>> {
  const grouped = await prisma.asset.groupBy({
    by: ["assetType"],
    where: { deletedAt: null, ...getRoleScope(actor) },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.assetType, g._count._all]));
}

export async function listAssetOptions(actor?: ScopeActor) {
  return prisma.asset.findMany({
    where: { deletedAt: null, ...(actor ? getRoleScope(actor) : {}) },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, brand: true, model: true },
  });
}

// For the "Replace with New" picker — only genuinely free assets can take over for a
// retiring one, and the asset being replaced can't be offered as its own replacement.
export async function listAvailableAssetOptions(excludeId?: number) {
  return prisma.asset.findMany({
    where: { deletedAt: null, status: "AVAILABLE", ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, brand: true, model: true },
  });
}

export async function getAssetById(id: number, actor: ScopeActor) {
  const scope = getRoleScope(actor);
  // ALL scope returns {} — "no restriction". It MUST NOT go inside an OR: an empty object as an
  // OR member matches NOTHING in Prisma (not everything), which would 404 every asset for an
  // admin. So only the restrictive scopes (SELF/DEPARTMENT) get the OR; ALL just filters by id.
  const isUnrestricted = Object.keys(scope).length === 0;
  const scopeWhere: Prisma.AssetWhereInput = isUnrestricted
    ? {}
    : {
        // In scope OR connected to an in-scope computer — so a device plugged into your own
        // machine opens from its Connected Devices list even if it isn't separately assigned to
        // you (e.g. out for repair). View only; assign/return/edit stay permission-gated.
        OR: [scope, { connectedToComputer: { computerAsset: { deletedAt: null, ...scope } } }],
      };
  return prisma.asset.findFirst({
    where: { id, deletedAt: null, ...scopeWhere },
    include: {
      ...ASSET_BASE_INCLUDE,
      ...ASSET_DETAIL_INCLUDE,
      images: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Builds the type-specific detail row for an asset from submitted form data, keyed by the
 * field names declared in the type's registry entry. Returns `null` for OTHER, which has no
 * detail table.
 *
 * Numeric fields arrive as digit-strings (see optionalIntText in ./validators — Zod coercion
 * would break zodResolver's typing), so they're parsed here.
 */
function normalizeDetailInput(
  assetType: AssetType,
  data: AssetInput & Record<string, unknown>,
): Record<string, unknown> | null {
  const descriptor = descriptorFor(assetType);
  if (!descriptor.modelKey) return null;

  const detail: Record<string, unknown> = {};
  for (const field of descriptor.fields) {
    const raw = data[field.key];

    if (field.kind === "checkbox") {
      detail[field.key] = raw === true;
      continue;
    }
    if (raw === undefined || raw === null || raw === "") {
      detail[field.key] = null;
      continue;
    }
    if (field.kind === "number") {
      const parsed = Number.parseInt(String(raw), 10);
      detail[field.key] = Number.isFinite(parsed) ? parsed : null;
      continue;
    }
    if (field.kind === "date") {
      const parsed = new Date(String(raw));
      detail[field.key] = Number.isNaN(parsed.getTime()) ? null : parsed;
      continue;
    }
    // "decimal" is handed to Prisma as a string — Decimal columns accept that, and it
    // avoids float rounding on values like a 23.8" screen.
    detail[field.key] = String(raw);
  }
  return detail;
}

/**
 * Uniqueness for identifiers that live on detail rows rather than the asset itself.
 * `excludeAssetId` is an ASSET id (what every caller has), applied to the related asset.
 */
async function assertDetailUniqueness(detail: Record<string, unknown> | null, excludeAssetId?: number) {
  if (!detail) return;
  if (typeof detail.imei === "string" && detail.imei) {
    await assertImeiAvailable(detail.imei, excludeAssetId);
  }
  if (typeof detail.mobileNumber === "string" && detail.mobileNumber) {
    await assertMobileNumberAvailable(detail.mobileNumber, excludeAssetId);
  }
}

export async function createAsset(data: AssetInput, actorUserId: number) {
  const assetTag = data.assetTag.trim();
  await assertAssetTagAvailable(assetTag);

  if (data.serialNumber) {
    await assertSerialAvailable(data.serialNumber);
  }
  if (data.macAddress) {
    await assertMacAddressAvailable(data.macAddress);
  }

  // The type comes from whichever type-specific form posted this. Zod has already checked it
  // against the AssetType enum, so it can't be an arbitrary string.
  const assetType = data.assetType;

  const detail = normalizeDetailInput(assetType, data);
  const relationKey = descriptorFor(assetType).relationKey;

  // IMEI and mobile number live on detail rows, so they're only checkable once the type is
  // known and the detail payload is built.
  await assertDetailUniqueness(detail);

  const asset = await prisma.asset.create({
    data: {
      ...normalizeAssetInput(data),
      assetTag,
      assetType,
      // Create the type's detail row alongside the asset, so every asset always has exactly
      // one — the invariant Migration B established and the verification asserts.
      ...(relationKey && detail ? { [relationKey]: { create: detail } } : {}),
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "assets",
    entityType: "Asset",
    entityId: asset.id,
  });

  return asset;
}

export async function updateAsset(id: number, data: AssetInput, actorUserId: number) {
  // The tag is editable: it's typed by hand, so a typo has no other way to be corrected.
  const assetTag = data.assetTag.trim();
  await assertAssetTagAvailable(assetTag, id);

  if (data.serialNumber) {
    await assertSerialAvailable(data.serialNumber, id);
  }
  if (data.macAddress) {
    await assertMacAddressAvailable(data.macAddress, id);
  }

  // An asset's type is fixed once created and is read from the DB, never from the request:
  // each type has its own form, so there is no "change the type" path, and honouring a
  // client-sent type here would let a crafted request strand the old detail row.
  const { assetType } = await prisma.asset.findUniqueOrThrow({
    where: { id },
    select: { assetType: true },
  });

  const detail = normalizeDetailInput(assetType, data);
  const relationKey = descriptorFor(assetType).relationKey;

  await assertDetailUniqueness(detail, id);

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      ...normalizeAssetInput(data),
      assetTag,
      ...(data.status ? { status: data.status } : {}),
      // upsert rather than update, so an asset created before its detail table existed still
      // gets one on first edit.
      ...(relationKey && detail
        ? { [relationKey]: { upsert: { create: detail, update: detail } } }
        : {}),
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: asset.id,
  });

  return asset;
}

export async function deleteAsset(id: number, actorUserId: number) {
  await prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: actorUserId,
    action: "DELETE",
    module: "assets",
    entityType: "Asset",
    entityId: id,
  });
}

export async function restoreAsset(id: number, actorUserId: number) {
  // Serial Number/MAC/IMEI/mobile number (unlike Asset Tag) are freed up for reuse once an
  // asset is deleted — so another, currently-active asset could legitimately have been
  // created with the same value in the meantime. Restoring must not silently create two
  // active assets sharing an identifier that's supposed to be unique among active assets.
  //
  // IMEI and mobile number now live in detail tables, so they MUST be read through the
  // relations below. Reading `asset.imei` off the base row instead would yield undefined once
  // that column is dropped, making the `if` fall through and silently disabling the guard.
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id },
    include: { phone: true, simCard: true },
  });
  if (asset.serialNumber) await assertSerialAvailable(asset.serialNumber, id);
  if (asset.macAddress) await assertMacAddressAvailable(asset.macAddress, id);
  if (asset.phone?.imei) await assertImeiAvailable(asset.phone.imei, id);
  if (asset.simCard?.mobileNumber) await assertMobileNumberAvailable(asset.simCard.mobileNumber, id);

  await prisma.asset.update({ where: { id }, data: { deletedAt: null } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: id,
    description: "Asset restored",
  });
}

export async function addAssetImage(assetId: number, filePath: string, actorUserId: number) {
  const image = await prisma.assetImage.create({ data: { assetId, filePath } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: assetId,
    description: "Image added",
  });
  return image;
}

export async function removeAssetImage(imageId: number, actorUserId: number) {
  const image = await prisma.assetImage.delete({ where: { id: imageId } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: image.assetId,
    description: "Image removed",
  });
  return image;
}

export async function addAssetDocument(
  assetId: number,
  filePath: string,
  label: string | undefined,
  actorUserId: number,
) {
  const document = await prisma.assetDocument.create({ data: { assetId, filePath, label } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: assetId,
    description: "Document added",
  });
  return document;
}

export async function removeAssetDocument(documentId: number, actorUserId: number) {
  const document = await prisma.assetDocument.delete({ where: { id: documentId } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: document.assetId,
    description: "Document removed",
  });
  return document;
}
