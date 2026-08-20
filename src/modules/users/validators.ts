import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const createUserSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email("Enter a valid email address"),
  phone: optionalText(30),
  departmentId: z.number().int().positive("Department is required"),
  roleId: z.number().int().positive("Role is required"),
  designation: optionalText(150),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email("Enter a valid email address"),
  phone: optionalText(30),
  departmentId: z.number().int().positive("Department is required"),
  roleId: z.number().int().positive("Role is required"),
  designation: optionalText(150),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
