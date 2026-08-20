import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const vendorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  contactPerson: optionalText(150),
  phone: optionalText(30),
  email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]).optional(),
  address: optionalText(2000),
});
export type VendorInput = z.infer<typeof vendorSchema>;
