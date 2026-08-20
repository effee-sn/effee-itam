import { z } from "zod";

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(150),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
