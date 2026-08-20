import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: error.code } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: { message: error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
      },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json(
    { success: false, error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
    { status: 500 },
  );
}
