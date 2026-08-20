import { getSettings } from "@/modules/settings/service";
import { LoginForm } from "./login-form";

// Render per-request instead of prerendering at build time, so the company logo/name always
// reflect the current Settings row — otherwise a logo uploaded after `npm run build` never
// shows on the login page until the next rebuild. Also removes the build-time dependency on
// the Settings row existing (previously the reason seeding had to happen before building).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1 text-center">
          {settings.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoPath}
              alt={settings.companyName}
              className="mx-auto mb-2 h-12 w-12 object-contain"
            />
          )}
          <h1 className="text-xl font-semibold">{settings.companyName}</h1>
          <p className="text-sm text-neutral-500">Sign in to your account</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
