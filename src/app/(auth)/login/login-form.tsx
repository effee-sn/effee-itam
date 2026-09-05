"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginSchema, type LoginInput } from "@/modules/auth/validators";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      setServerError(json.error?.message ?? "Login failed");
      return;
    }
    // A full page load, not router.push(), so middleware runs and the signed-in tree replaces
    // this page cleanly (see git history for the full rationale).
    setRedirecting(true);
    window.location.assign("/dashboard");
  }

  const pending = isSubmitting || redirecting;

  const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  // method="post" matters even before hydration: a native GET submit would put credentials in
  // the URL. POST keeps them in the request body.
  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="email" type="email" autoComplete="username" placeholder="Enter your email address" className={inputCls} {...register("email")} />
        </div>
        {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={`${inputCls} pr-11`}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col items-end gap-1">
        <button type="button" onClick={() => setShowForgot((s) => !s)} className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Forgot password?
        </button>
        {showForgot && (
          <p className="text-xs text-slate-500">Please contact your administrator to reset your password.</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign In"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
