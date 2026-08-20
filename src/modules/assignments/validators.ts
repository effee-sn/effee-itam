import { z } from "zod";

const optionalNotes = z.string().trim().max(500).optional().or(z.literal(""));

export const assignAssetSchema = z.object({
  toUserId: z.number().int().positive("User is required"),
  notes: optionalNotes,
});
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;

export const returnAssetSchema = z.object({
  notes: optionalNotes,
});
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;

export const transferAssetSchema = z.object({
  toUserId: z.number().int().positive("User is required"),
  notes: optionalNotes,
});
export type TransferAssetInput = z.infer<typeof transferAssetSchema>;
