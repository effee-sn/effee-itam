"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type GlobalProgressContextValue = {
  isPending: boolean;
  start: () => void;
  stop: () => void;
  navigate: (path: string) => void;
};

const GlobalProgressContext = createContext<GlobalProgressContextValue | null>(null);

export function useGlobalProgress() {
  const ctx = useContext(GlobalProgressContext);
  if (!ctx) throw new Error("useGlobalProgress must be used within GlobalProgressProvider");
  return ctx;
}

// If a navigation never commits (deduped, aborted, or the click didn't actually navigate), the
// bar would otherwise hang forever. This ceiling guarantees it always clears itself.
const FAILSAFE_MS = 8000;

/**
 * Watches the committed route (path + query) and reports when it changes. Isolated in its own
 * component so `useSearchParams` sits behind a Suspense boundary — required because the provider
 * lives in the root layout, which some pages prerender statically.
 */
function RouteWatcher({ onArrive }: { onArrive: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  useEffect(() => {
    onArrive();
  }, [key, onArrive]);
  return null;
}

export function GlobalProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // `navigating` tracks a route change in flight; `manualCount` tracks explicit non-navigation
  // work (exports, uploads) that wants to show the bar. They're kept separate so a stuck manual
  // op can't be cleared by a route change and vice-versa.
  const [navigating, setNavigating] = useState(false);
  const [manualCount, setManualCount] = useState(0);
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginNav = useCallback(() => {
    setNavigating(true);
    if (failsafe.current) clearTimeout(failsafe.current);
    failsafe.current = setTimeout(() => setNavigating(false), FAILSAFE_MS);
  }, []);

  const endNav = useCallback(() => {
    setNavigating(false);
    if (failsafe.current) {
      clearTimeout(failsafe.current);
      failsafe.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (failsafe.current) clearTimeout(failsafe.current);
  }, []);

  const start = useCallback(() => setManualCount((c) => c + 1), []);
  const stop = useCallback(() => setManualCount((c) => Math.max(0, c - 1)), []);

  // Programmatic navigation (e.g. after a form save). We show the bar and let the router do the
  // navigation natively — the route-change effect above hides it once the page arrives. No
  // useTransition: its isPending is the thing that used to hang.
  const navigate = useCallback(
    (path: string) => {
      beginNav();
      router.push(path);
      router.refresh();
    },
    [router, beginNav],
  );

  // Observe (don't hijack) internal link clicks so the bar starts the instant the user clicks,
  // before Next's own soft navigation resolves. We deliberately do NOT preventDefault or
  // stopPropagation here — letting <Link> handle the navigation avoids the double-push / event
  // interference that made clicks occasionally do nothing.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("/api/")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page — no navigation will happen, so don't show a bar that would never clear.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      beginNav();
    }

    // Capture phase: observe the click before <Link>'s own handler runs (it calls
    // preventDefault to do the SPA navigation), so we can start the bar without interfering.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [beginNav]);

  const visible = navigating || manualCount > 0;
  const contextValue = useMemo(
    () => ({ isPending: visible, start, stop, navigate }),
    [visible, start, stop, navigate],
  );

  return (
    <GlobalProgressContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <RouteWatcher onArrive={endNav} />
      </Suspense>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent">
        {visible && <div className="h-full w-1/3 animate-[route-progress_1s_ease-in-out_infinite] bg-brand" />}
      </div>
      {children}
    </GlobalProgressContext.Provider>
  );
}
