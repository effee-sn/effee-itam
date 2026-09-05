"use client";

import { useEffect, useRef, useState } from "react";
import { User as UserIcon, Search, ChevronDown, Check } from "lucide-react";

type UserOption = { id: number; name: string; employeeId: string };

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Searchable user select with avatars — the "Search users…" control in the Assign dialog. */
export function UserPicker({
  users,
  value,
  onChange,
  placeholder = "Select user",
}: {
  users: UserOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = users.find((u) => String(u.id) === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => `${u.name} ${u.employeeId}`.toLowerCase().includes(q))
    : users;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition-colors focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <UserIcon className="h-4 w-4 shrink-0 text-neutral-400" />
        {selected ? (
          <span className="truncate text-neutral-800 dark:text-neutral-200">
            {selected.name} <span className="text-neutral-400">({selected.employeeId})</span>
          </span>
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">No users found</li>
            )}
            {filtered.map((u) => {
              const active = String(u.id) === value;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(u.id));
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      active ? "bg-blue-50 dark:bg-blue-500/15" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${colorFor(u.name)}`}>
                      {initialsOf(u.name)}
                    </span>
                    <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">
                      {u.name} <span className="text-neutral-400">({u.employeeId})</span>
                    </span>
                    {active && <Check className="ml-auto h-4 w-4 shrink-0 text-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
