import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession, setSessionCookie } from "@/lib/session";
import { changePassword, buildSession } from "@/modules/auth/service";
import { changePasswordSchema } from "@/modules/auth/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    }

    const body = changePasswordSchema.parse(await request.json());
    await changePassword(session.userId, body.currentPassword, body.newPassword);

    // Re-issue the session token so mustChangePassword: false takes effect immediately —
    // without this, the still-valid old JWT would keep claiming mustChangePassword: true
    // and the middleware would redirect right back to /change-password.
    const { token } = await buildSession(session.userId);
    await setSessionCookie(token);

    return apiSuccess({ changed: true });
  } catch (error) {
    return apiError(error);
  }
}
