import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/modules/settings/service";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
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
          <h1 className="text-xl font-semibold">Change Password</h1>
          <p className="text-sm text-neutral-500">
            {session.mustChangePassword
              ? "You need to set a new password before continuing."
              : "Enter your current password and choose a new one."}
          </p>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
