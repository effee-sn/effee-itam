import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "./validators";
import { createUser } from "./service";

// Deliberately NOT a mirror of /api/users/export's header order: "Password" replaces
// "Status" here. A new user's password can't be exported (only a hash is stored) but must
// be supplied to create one; status can be set on export (informational) but not on create
// — createUser() always creates ACTIVE, same as the manual "New User" form. So re-importing
// an exported file needs a Password column added by hand; it isn't a drop-in round-trip
// the way Assets/Departments import is.
export const IMPORT_HEADERS = [
  "Employee ID",
  "Name",
  "Email",
  "Phone",
  "Department",
  "Role",
  "Designation",
  "Password",
] as const;

type ParsedRow = Record<(typeof IMPORT_HEADERS)[number], string>;

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

export async function parseUserImportFile(buffer: Buffer): Promise<{ rows: ParsedRow[] } | { error: string }> {
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

  for (const required of ["Employee ID", "Name", "Email", "Department", "Role", "Password"] as const) {
    if (!headerIndex[required]) {
      return { error: `This file is missing a "${required}" column.` };
    }
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
  employeeId?: string;
  message?: string;
};

export type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

export async function importUserRows(rows: ParsedRow[], actorUserId: number): Promise<ImportSummary> {
  const [departments, roles] = await Promise.all([
    prisma.department.findMany({ where: { deletedAt: null } }),
    prisma.role.findMany(),
  ]);
  const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
  const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));

  const results: ImportRowResult[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 1-indexing, +1 for the header row
    const row = rows[i];
    try {
      const departmentName = row["Department"].trim();
      const department = departmentByName.get(departmentName.toLowerCase());
      if (!department) throw new Error(`Department "${departmentName}" not found`);

      const roleName = row["Role"].trim();
      const role = roleByName.get(roleName.toLowerCase());
      if (!role) throw new Error(`Role "${roleName}" not found`);

      const candidate = {
        employeeId: row["Employee ID"].trim(),
        name: row["Name"].trim(),
        email: row["Email"].trim(),
        phone: row["Phone"].trim(),
        departmentId: department.id,
        roleId: role.id,
        designation: row["Designation"].trim(),
        password: row["Password"].trim(),
      };
      const parsed = createUserSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid row");
      }

      const user = await createUser(parsed.data, actorUserId);

      created++;
      results.push({ row: rowNum, status: "created", employeeId: user.employeeId });
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
