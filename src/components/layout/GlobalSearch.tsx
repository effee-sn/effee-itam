"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  Search,
  X,
  Boxes,
  Users,
  Building2,
  Contact,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

type Hit = { id: number; title: string; subtitle: string; href: string };
type Results = { assets: Hit[]; users: Hit[]; departments: Hit[]; vendors: Hit[] };
type GroupKey = keyof Results;

const EMPTY: Results = { assets: [], users: [], departments: [], vendors: [] };

const GROUPS: { key: GroupKey; label: string; icon: LucideIcon; perm: string; tint: string }[] = [
  { key: "assets", label: "Assets", icon: Boxes, perm: "assets.view", tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  { key: "users", label: "Users", icon: Users, perm: "users.view", tint: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
  { key: "departments", label: "Departments", icon: Building2, perm: "departments.view", tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  { key: "vendors", label: "Vendors", icon: Contact, perm: "vendors.view", tint: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
];

export function GlobalSearch() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | GroupKey>("all");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const groups = useMemo(() => GROUPS.filter((g) => hasPermission(g.perm)), [hasPermission]);

  // Open on Ctrl/Cmd+K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
    else {
      setQuery("");
      setResults(EMPTY);
      setTab("all");
      setActive(0);
    }
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (id !== reqId.current) return; // a newer request superseded this one
        setResults(json.success ? (json.data.results as Results) : EMPTY);
      } catch {
        if (id === reqId.current) setResults(EMPTY);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  // Flat list of the currently visible hits, for keyboard navigation.
  const visible = useMemo(() => {
    const keys = tab === "all" ? groups.map((g) => g.key) : [tab];
    const flat: { group: (typeof GROUPS)[number]; hit: Hit }[] = [];
    for (const g of GROUPS) {
      if (!keys.includes(g.key)) continue;
      for (const hit of results[g.key]) flat.push({ group: g, hit });
    }
    return flat;
  }, [results, tab, groups]);

  useEffect(() => {
    setActive(0);
  }, [query, tab]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = visible[active];
      if (item) go(item.hit.href);
    }
  }

  const groupCount = (k: GroupKey) => results[k].length;
  const hasQuery = query.trim().length > 0;
  const anyResults = visible.length > 0;

  return (
    <>
      {/* Trigger (looks like a search bar) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-lg items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white hover:text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search assets, users, departments...</span>
        <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium sm:block dark:border-neutral-700 dark:bg-neutral-800">
          Ctrl + K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onKeyDown={onKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800">
              <Search className="h-5 w-5 shrink-0 text-neutral-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Module tabs */}
            {groups.length > 1 && (
              <div className="flex flex-wrap gap-1.5 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                <TabButton active={tab === "all"} onClick={() => setTab("all")}>All</TabButton>
                {groups.map((g) => (
                  <TabButton key={g.key} active={tab === g.key} onClick={() => setTab(g.key)}>
                    <g.icon className="h-3.5 w-3.5" /> {g.label}
                    {hasQuery && groupCount(g.key) > 0 && <span className="ml-0.5 text-[11px] text-neutral-400">{groupCount(g.key)}</span>}
                  </TabButton>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!hasQuery ? (
                <p className="px-3 py-10 text-center text-sm text-neutral-400">Type to search across your modules.</p>
              ) : !anyResults && !loading ? (
                <p className="px-3 py-10 text-center text-sm text-neutral-400">No results for &quot;{query.trim()}&quot;.</p>
              ) : (
                GROUPS.filter((g) => (tab === "all" ? groups.some((x) => x.key === g.key) : g.key === tab) && results[g.key].length > 0).map((g) => (
                  <div key={g.key} className="mb-1">
                    <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {g.label} <span className="text-neutral-300 dark:text-neutral-600">{results[g.key].length}</span>
                    </div>
                    {results[g.key].map((hit) => {
                      const idx = visible.findIndex((v) => v.group.key === g.key && v.hit.id === hit.id);
                      const isActive = idx === active;
                      return (
                        <button
                          key={`${g.key}-${hit.id}`}
                          type="button"
                          onMouseMove={() => setActive(idx)}
                          onClick={() => go(hit.href)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${g.tint}`}>
                            <g.icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{hit.title}</span>
                            {hit.subtitle && <span className="block truncate text-xs text-neutral-500">{hit.subtitle}</span>}
                          </span>
                          {isActive && <CornerDownLeft className="h-4 w-4 shrink-0 text-neutral-400" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-400 dark:border-neutral-800">
              <span className="flex items-center gap-1"><Hint><ArrowUp className="h-3 w-3" /></Hint><Hint><ArrowDown className="h-3 w-3" /></Hint> Navigate</span>
              <span className="flex items-center gap-1"><Hint><CornerDownLeft className="h-3 w-3" /></Hint> Select</span>
              <span className="flex items-center gap-1"><Hint>esc</Hint> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-sans dark:border-neutral-700 dark:bg-neutral-800">
      {children}
    </kbd>
  );
}
