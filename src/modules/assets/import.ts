import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/modules/audit/log";
import { macAddressPattern, imeiPattern } from "./validators";
import {
  assertSerialAvailable,
  assertMacAddressAvailable,
  assertImeiAvailable,
  assertMobileNumberAvailable,
} from "./service";
import { descriptorFor, ASSET_TYPES_ORDERED } from "./types/registry";
import { allImportHeaders, buildDetailFromRow, HEADER_ALIASES } from "./columns";
import type { AssetStatus, AssetType } from "@/generated/prisma/client";

// Headers come from the shared column definitions in ./columns, which export uses too —
// so export remains a valid import template and a renamed field can't leave the two out of
// step (it previously did: import still wrote a Computer field that had been renamed, which
// TypeScript couldn't catch because the relation key is computed).
export const IMPORT_HEADERS = allImportHeaders();

const VALID_STATUSES: AssetStatus[] = ["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED", "LOST"];

/** Header -> cell text. Missing columns simply read as "". */
type ParsedRow = Record<string, string>;

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

export async function parseAssetImportFile(
  buffer: Buffer,
): Promise<{ rows: ParsedRow[] } | { error: string }> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's own .d.ts declares an ambient global `Buffer extends ArrayBuffer`, which
    // merges with (and is incompatible with) @types/node's real Buffer — same runtime
    // value, just a type-declaration clash between the two packages.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { error: "Could not read this file — make sure it's a valid .xlsx file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "The file has no sheets." };

  const known = new Set(IMPORT_HEADERS);
  const headerIndex: Record<string, number> = {};
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const raw = cellText(cell);
    // Older exports used combined headers ("Serial Number / Mobile Number"); map them onto
    // the current names so an existing file still imports.
    const header = HEADER_ALIASES[raw] ?? raw;
    if (known.has(header)) headerIndex[header] = colNumber;
  });

  // Every row's type comes from its "Asset Type" column (categories were removed). An old file's
  // "Category" column is aliased to "Asset Type" above, so this covers both new and old files.
  if (!headerIndex["Asset Type"]) {
    return { error: 'This file is missing an "Asset Type" column, which every asset needs.' };
  }

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: ParsedRow = {};
    let hasAnyValue = false;
    for (const header of IMPORT_HEADERS) {
      const colNumber = headerIndex[header];
      const text = colNumber ? cellText(row.getCell(colNumber)) : "";
      values[header] = text;
      if (text) hasAnyValue = true;
    }
    if (hasAnyValue) rows.push(values);
  }

  return { rows };
}

export type ImportRowResult = {
  row: number;
  status: "created" | "error";
  assetTag?: string;
  message?: string;
};

export type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

function parseImportDate(text: string, label: string): Date | null {
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label} "${text}"`);
  return date;
}

export async function importAssetRows(rows: ParsedRow[], actorUserId: number): Promise<ImportSummary> {
  const [vendors, departments, users] = await Promise.all([
    prisma.vendor.findMany({ where: { deletedAt: null } }),
    prisma.department.findMany({ where: { deletedAt: null } }),
    prisma.user.findMany({ where: { deletedAt: null } }),
  ]);

  // "Computer", "SIM Card"… -> the AssetType enum. Accepts the label a person would actually
  // type (and what export writes) rather than the raw enum value.
  const typeByLabel = new Map<string, AssetType>(
    ASSET_TYPES_ORDERED.map((d) => [d.labelSingular.toLowerCase(), d.assetType]),
  );
  for (const d of ASSET_TYPES_ORDERED) {
    typeByLabel.set(d.assetType.toLowerCase(), d.assetType);
    typeByLabel.set(d.assetType.replace(/_/g, " ").toLowerCase(), d.assetType);
  }

  const vendorByName = new Map(vendors.map((v) => [v.name.toLowerCase(), v]));
  const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
  const usersByName = new Map<string, { id: number }[]>();
  for (const user of users) {
    const key = user.name.toLowerCase();
    usersByName.set(key, [...(usersByName.get(key) ?? []), user]);
  }

  const results: ImportRowResult[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 1-indexing, +1 for the header row
    const row = rows[i];
    try {
      const typeName = row["Asset Type"].trim();
      if (!typeName) throw new Error("Asset Type is required");
      const assetType = typeByLabel.get(typeName.toLowerCase());
      if (!assetType) {
        throw new Error(
          `Asset Type "${typeName}" not recognised — use one of: ${ASSET_TYPES_ORDERED.map((d) => d.labelSingular).join(", ")}`,
        );
      }

      // Required: tags are typed by hand, so an import can't invent one either. A row with a
      // blank tag is reported as an error rather than silently given a made-up value.
      const assetTag = row["Asset Tag"].trim();
      if (!assetTag) throw new Error("Asset Tag is required");
      // Unlike Serial Number/MAC/IMEI (deliberately soft-delete-scoped, since those can be
      // reused once an asset is deleted), Asset Tag has a real DB-level unique constraint that
      // applies to every row regardless of deletedAt. So this check must NOT filter by
      // deletedAt: null, or a tag belonging to an already-deleted asset would pass here and
      // then fail as a raw, unhandled Prisma unique-constraint error at create().
      const existingTag = await prisma.asset.findFirst({
        where: { assetTag },
        select: { id: true, deletedAt: true },
      });
      if (existingTag) {
        throw new Error(
          existingTag.deletedAt
            ? `Asset Tag "${assetTag}" belongs to a deleted asset — restore it or use a different tag`
            : `Asset Tag "${assetTag}" already exists`,
        );
      }

      // Type-specific values, built from the registry so they always match the current
      // fields. Validated below before the row is written.
      const detailData = buildDetailFromRow(assetType, row);

      const serialNumber = row["Serial Number"].trim() || null;
      if (serialNumber) await assertSerialAvailable(serialNumber);

      const macAddress = row["MAC Address"].trim() || null;
      if (macAddress) {
        if (!macAddressPattern.test(macAddress)) {
          throw new Error(`Invalid MAC Address "${macAddress}" (expected format 00:1A:2B:3C:4D:5E)`);
        }
        await assertMacAddressAvailable(macAddress);
      }

      // IMEI lives on the phone detail row now, so it's validated from there rather than
      // from a base column.
      const imei = typeof detailData.imei === "string" ? detailData.imei : null;
      if (imei) {
        if (!imeiPattern.test(imei)) {
          throw new Error(`Invalid IMEI "${imei}" (expected a 15-digit number)`);
        }
        await assertImeiAvailable(imei);
      }

      const mobileNumber = typeof detailData.mobileNumber === "string" ? detailData.mobileNumber : null;
      if (mobileNumber) await assertMobileNumberAvailable(mobileNumber);

      let vendorId: number | null = null;
      const vendorName = row["Vendor"].trim();
      if (vendorName) {
        let vendor = vendorByName.get(vendorName.toLowerCase());
        if (!vendor) {
          vendor = await prisma.vendor.create({ data: { name: vendorName } });
          vendorByName.set(vendorName.toLowerCase(), vendor);
        }
        vendorId = vendor.id;
      }

      let departmentId: number | null = null;
      const departmentName = row["Department"].trim();
      if (departmentName) {
        let department = departmentByName.get(departmentName.toLowerCase());
        if (!department) {
          department = await prisma.department.create({ data: { name: departmentName } });
          departmentByName.set(departmentName.toLowerCase(), department);
        }
        departmentId = department.id;
      }

      let assignedUserId: number | null = null;
      let warning: string | undefined;
      const assignedName = row["Assigned To"].trim();
      if (assignedName) {
        const matches = usersByName.get(assignedName.toLowerCase()) ?? [];
        if (matches.length === 1) {
          assignedUserId = matches[0].id;
        } else if (matches.length === 0) {
          warning = `"${assignedName}" not found as a user — imported unassigned`;
        } else {
          warning = `"${assignedName}" matches more than one user — imported unassigned`;
        }
      }

      let status: AssetStatus;
      const statusInput = row["Status"].trim().toUpperCase();
      if (statusInput) {
        if (!VALID_STATUSES.includes(statusInput as AssetStatus)) {
          throw new Error(`Invalid Status "${row["Status"]}"`);
        }
        status = statusInput as AssetStatus;
      } else {
        status = assignedUserId ? "ASSIGNED" : "AVAILABLE";
      }

      const purchaseDate = parseImportDate(row["Purchase Date"], "Purchase Date");
      const warrantyStart = parseImportDate(row["Warranty Start"], "Warranty Start");
      const warrantyEnd = parseImportDate(row["Warranty End"], "Warranty End");

      let cost: string | null = null;
      const costInput = row["Cost"].trim();
      if (costInput) {
        if (!/^\d+(\.\d{1,2})?$/.test(costInput)) throw new Error(`Invalid Cost "${costInput}"`);
        cost = costInput;
      }

      // Imported assets need their type's detail row too, same as createAsset — otherwise a
      // bulk import silently produces assets missing the detail row everything else assumes.
      // detailData was built from the registry above, so it always matches the current
      // fields — no hand-written per-type mapping to fall out of date.
      const detailRelation = descriptorFor(assetType).relationKey;

      const asset = await prisma.asset.create({
        data: {
          assetTag,
          assetType,
          ...(detailRelation ? { [detailRelation]: { create: detailData } } : {}),
          serialNumber,
          hostname: row["Hostname"].trim() || null,
          macAddress,
          ipAddress: row["IP Address"].trim() || null,
          brand: row["Brand"].trim() || null,
          model: row["Model"].trim() || null,
          vendorId,
          purchaseDate,
          invoiceNumber: row["Invoice Number"].trim() || null,
          warrantyStart,
          warrantyEnd,
          cost,
          departmentId,
          currentAssignedUserId: assignedUserId,
          status,
          notes: row["Notes"].trim() || null,
        },
      });

      if (assignedUserId) {
        await prisma.assetAssignment.create({
          data: {
            assetId: asset.id,
            action: "ASSIGN",
            toUserId: assignedUserId,
            performedByUserId: actorUserId,
            notes: "Imported with an existing assignment",
          },
        });
      }

      await auditLog({
        userId: actorUserId,
        action: "CREATE",
        module: "assets",
        entityType: "Asset",
        entityId: asset.id,
        description: "Imported from file",
      });

      created++;
      results.push({ row: rowNum, status: "created", assetTag: asset.assetTag, message: warning });
    } catch (error) {
      results.push({
        row: rowNum,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { total: rows.length, created, failed: rows.length - created, results };
}
