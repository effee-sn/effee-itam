import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "green" | "purple" | "orange" | "red" | "slate";

// Full class strings (Tailwind can't see dynamically-built names).
const TONES: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  purple: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  orange: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  red: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-tight text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
      </div>
      {caption && <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">{caption}</p>}
    </div>
  );
}
