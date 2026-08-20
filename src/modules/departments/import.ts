import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/modules/audit/log";

// Mirrors the column order produced by /api/departments/export — export doubles as the
// import template, so round-tripping a file (export, edit, re-import) just works.
export const IMPORT_HEADERS = ["Name"] as const;

type ParsedRow = Record<(typeof IMPORT_HEADERS)[number], string>;

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

export async function parseDepartmentImportFile(
  buffer: Buffer,
): Promise<{ rows: ParsedRow[] } | { error: string }> {
  const workbook = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { error: "Could not read this file — make sure it's a valid .xlsx file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "The file has no sheets." };

  const headerIndex: Partial<Record<(typeof IMPORT_HEADERS)[number], number>> = {};
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = cellText(cell);
    if ((IMPORT_HEADERS as readonly string[]).includes(text)) {
      headerIndex[text as (typeof IMPORT_HEADERS)[number]] = colNumber;
    }
  });

  if (!headerIndex["Name"]) {
    return { error: 'This file is missing a "Name" column.' };
  }

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values = {} as ParsedRow;
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
  name?: string;
  message?: string;
};

export type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

export async function importDepartmentRows(rows: ParsedRow[], actorUserId: number): Promise<ImportSummary> {
  const results: ImportRowResult[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 1-indexing, +1 for the header row
    const row = rows[i];
    try {
      const name = row["Name"].trim();
      if (!name) throw new Error("Name is required");

      const existing = await prisma.department.findFirst({
        where: { name, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new Error(`Department "${name}" already exists`);

      const department = await prisma.department.create({ data: { name } });

      await auditLog({
        userId: actorUserId,
        action: "CREATE",
        module: "departments",
        entityType: "Department",
        entityId: department.id,
        description: "Imported from file",
      });

      created++;
      results.push({ row: rowNum, status: "created", name: department.name });
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
