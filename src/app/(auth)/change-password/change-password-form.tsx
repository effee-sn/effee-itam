"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, KeyRound, Eye, EyeOff, ArrowRight } from "lucide-react";
import { changePasswordSchema, type ChangePasswordInput } from "@/modules/auth/validators";

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(data: ChangePasswordInput) {
    setServerError(null);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      setServerError(json.error?.message ?? "Could not change password");
      return;
    }
    // Full page load, not router.push(): the session cookie's mustChangePassword flag has just
    // been cleared and the cached signed-in tree must be re-rendered (see git history).
    setRedirecting(true);
    window.location.assign("/dashboard");
  }

  const pending = isSubmitting || redirecting;
  const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5" noValidate>
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your current password"
            className={inputCls}
            {...register("currentPassword")}
          />
          <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showCurrent ? "Hide password" : "Show password"}>
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.currentPassword && <p className="mt-1 text-sm text-rose-600">{errors.currentPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter a new password"
            className={inputCls}
            {...register("newPassword")}
          />
          <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showNew ? "Hide password" : "Show password"}>
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && <p className="mt-1 text-sm text-rose-600">{errors.newPassword.message}</p>}
      </div>

      {serverError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{serverError}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save New Password"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
