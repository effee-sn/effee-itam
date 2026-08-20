import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;
