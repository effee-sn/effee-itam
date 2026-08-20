"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });

    // A full page load, not router.push(). Signing out invalidates the session cookie that
    // every Server Component on screen was rendered with, and the App Router's client cache
    // still holds the logged-in tree — so a soft navigation can leave the old UI on screen
    // until the user refreshes by hand. `replace` rather than `assign` so the browser's Back
    // button doesn't return to a stale, signed-in-looking page.
    window.location.replace("/login");
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={loading}>
      {loading ? "Signing out..." : "Log out"}
    </Button>
  );
}
