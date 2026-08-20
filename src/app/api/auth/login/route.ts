import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/session";
import { login } from "@/modules/auth/service";
import { loginSchema } from "@/modules/auth/validators";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for");

    const { token, payload } = await login(body.email, body.password, ipAddress);
    await setSessionCookie(token);

    return apiSuccess({ user: payload });
  } catch (error) {
    return apiError(error);
  }
}
