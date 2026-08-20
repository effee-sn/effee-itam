import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { ingestInventory } from "@/modules/inventory/service";
import { inventorySchema } from "@/modules/inventory/validators";

// Treat an explicit `null` the same as an omitted field, everywhere in the payload. The agent
// builds objects with fixed keys and fills unknowns with null (a motherboard with no serial, an OS
// field WMI didn't return); the validators use `.optional()`, which accepts a missing key but
// rejects null — so an otherwise-valid report would 400 on the first null. Newer agents strip nulls
// themselves; this keeps the server tolerant of any copy that doesn't.
function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripNulls) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out as T;
  }
  return value;
}

// Machine-to-machine endpoint for the PowerShell inventory agent. Deliberately NOT behind the
// session middleware (it's excluded in middleware.ts) — a Windows machine has no login session.
//
// Auth is OPTIONAL and off by default: set INVENTORY_TOKEN on the server to require agents to
// send a matching `X-Inventory-Token` header. Leave it unset for an open, trusted internal
// network. Either way the endpoint only ever writes inventory data — it can't read anything.
export async function POST(request: NextRequest) {
  try {
    const expected = process.env.INVENTORY_TOKEN;
    if (expected && expected.length > 0) {
      const provided = request.headers.get("x-inventory-token");
      if (provided !== expected) {
        throw new AppError("UNAUTHENTICATED", "Invalid or missing inventory token", 401);
      }
    }

    const body = inventorySchema.parse(stripNulls(await request.json()));
    const result = await ingestInventory(body);
    return apiSuccess(result);
  } catch (error) {
    // This is a machine-to-machine endpoint, so — unlike the app's human-facing routes — a
    // validation failure should say EXACTLY which field(s) were wrong and why. The agent logs
    // this response, which is what makes a "Bad Request" diagnosable instead of opaque. Every
    // failing field is listed with its path (e.g. "monitors.0.model: String must contain at most
    // 191 character(s)"), not just the first, so one run surfaces all problems at once.
    if (error instanceof ZodError) {
      const details = error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      return NextResponse.json(
        {
          success: false,
          error: { message: `Validation failed: ${details.join("; ")}`, code: "VALIDATION_ERROR", details },
        },
        { status: 400 },
      );
    }
    return apiError(error);
  }
}
