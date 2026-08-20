"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/modules/auth/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  // Stays true from the moment we hand off to the browser until the new page replaces this
  // one, so the button can't be clicked twice during the load.
  const [redirecting, setRedirecting] = useState(false);
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

    // A full page load, not router.push(). Everything behind /dashboard is rendered from the
    // session cookie this request just set, and the App Router's client cache still holds the
    // signed-out tree — a soft navigation can leave the login page on screen until a manual
    // refresh. Going through the browser also lets middleware do its job, so a user who must
    // change their password lands on /change-password rather than the dashboard.
    setRedirecting(true);
    window.location.assign("/dashboard");
  }

  const pending = isSubmitting || redirecting;

  // method="post" matters even though submission is handled in JS: if someone clicks Sign in
  // before the page has hydrated, the browser performs a NATIVE submit, and a GET form would
  // put the email and password in the query string — visible in the address bar, in browser
  // history, and in server access logs. POST keeps them in the request body.
  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="username" {...register("email")} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
