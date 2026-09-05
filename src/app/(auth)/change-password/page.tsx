import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getSettings } from "@/modules/settings/service";
import { AuthBrandPanel, AuthLogo } from "../auth-shell";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const settings = await getSettings();

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel settings={settings} />

      {/* Right panel */}
      <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-slate-50 px-4 py-10">
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-blue-500/5" />
        <div className="pointer-events-none absolute -bottom-40 -right-10 h-[28rem] w-[28rem] rounded-full bg-blue-500/5" />

        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5 sm:p-10">
          <div className="text-center">
            <AuthLogo settings={settings} className="mx-auto h-14 w-14 object-contain" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">{settings.companyName}</h2>
            <p className="text-sm text-slate-500">Asset Management System</p>
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              {session.mustChangePassword
                ? "You need to set a new password before continuing."
                : "Enter your current password and choose a new one."}
            </p>
          </div>

          <div className="mt-8">
            <ChangePasswordForm />
          </div>

          {!session.mustChangePassword && (
            <div className="mt-5 text-center">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>Secure</span>
            <span className="text-slate-300">|</span>
            <span>Reliable</span>
            <span className="text-slate-300">|</span>
            <span>Organized</span>
          </div>
        </div>
      </div>
    </div>
  );
}
