import { z } from "zod";
import { SCOPE_DIMENSIONS, SCOPE_LEVELS } from "@/lib/scope";

// Exported separately (pre-refine) so callers that only need the plain-object shape —
// e.g. the form's metadata-only sub-schema via .omit({ permissionCodes: true }) — can
// still use ZodObject methods that aren't available once .refine() below wraps it in a
// ZodEffects.
export const roleBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50)
    .regex(/^[A-Za-z0-9_ ]+$/, "Use only letters, numbers, spaces and underscores"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  // Data-visibility scope (All/Department/Owned per dimension) is modeled as ordinary
  // permission codes (e.g. "assets.scope_department"), not a separate field — see
  // src/lib/scope.ts. The refine below is defense-in-depth: the UI enforces exactly one
  // scope code per dimension via mutually-exclusive checkboxes, but the data itself
  // doesn't forbid a direct API call from submitting zero or more than one.
  permissionCodes: z.array(z.string()),
});

export const roleSchema = roleBaseSchema
  .refine(
    (data) => {
      for (const dimension of SCOPE_DIMENSIONS) {
        const count = SCOPE_LEVELS.filter((level) =>
          data.permissionCodes.includes(`${dimension.codePrefix}_${level.value.toLowerCase()}`),
        ).length;
        if (count !== 1) return false;
      }
      return true;
    },
    { message: "Each data-visibility setting needs exactly one level selected" },
  );
export type RoleInput = z.infer<typeof roleSchema>;
