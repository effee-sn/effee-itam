"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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

export function GlobalProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [manualCount, setManualCount] = useState(0);

  // Stable identities are required (used as useEffect/useMemo dependencies here and by
  // callers) — an unstable function/object here would re-run effects every render.
  const start = useCallback(() => {
    setManualCount((count) => count + 1);
  }, []);
  const stop = useCallback(() => {
    setManualCount((count) => Math.max(0, count - 1));
  }, []);

  // The transition (and its isPending) is owned by this provider, which is mounted once
  // at the root and never unmounts — unlike the component that calls navigate() (e.g. a
  // form on the page being navigated away FROM), which unmounts partway through the very
  // navigation it triggered. If each caller tracked its own local useTransition instead,
  // its "pending -> false" effect would never get a chance to fire post-unmount, leaving
  // the bar stuck forever. Routing all navigation through one long-lived transition avoids
  // that class of bug entirely.
  const navigate = useCallback(
    (path: string) => {
      startTransition(() => {
        router.push(path);
        router.refresh();
      });
    },
    [router, startTransition],
  );

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
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
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      // Take over the navigation ourselves (instead of just observing) so we can track
      // it with useTransition's isPending, which stays true until the destination page's
      // data-fetching has actually finished — not just until the URL changes. Relying on
      // usePathname()/router-state alone made the bar disappear before the page was ready.
      event.preventDefault();
      event.stopPropagation();

      startTransition(() => {
        router.push(url.pathname + url.search);
      });
    }

    // Capture phase: run before Next's own <Link> click handler (attached on the anchor
    // itself) can call preventDefault() and start its own navigation.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router, startTransition]);

  const visible = isTransitionPending || manualCount > 0;
  const contextValue = useMemo(
    () => ({ isPending: visible, start, stop, navigate }),
    [visible, start, stop, navigate],
  );

  return (
    <GlobalProgressContext.Provider value={contextValue}>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent">
        {visible && (
          <div className="h-full w-1/3 animate-[route-progress_1s_ease-in-out_infinite] bg-brand" />
        )}
      </div>
      {children}
    </GlobalProgressContext.Provider>
  );
}
