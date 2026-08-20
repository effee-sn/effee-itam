import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { clearSessionCookie, getSession } from "@/lib/session";
import { logout } from "@/modules/auth/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session) {
      const ipAddress = request.headers.get("x-forwarded-for");
      await logout(session.userId, ipAddress);
    }
    await clearSessionCookie();

    return apiSuccess({ loggedOut: true });
  } catch (error) {
    return apiError(error);
  }
}
