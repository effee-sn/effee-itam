/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useWatch } from "react-hook-form";
import { type LucideIcon, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

/**
 * One titled block of related fields — the structure GLPI's own asset forms use, and what
 * the purpose-built Computer and Monitor forms are built from. Shared so the two can't drift
 * into looking like different products.
 *
 * Rendered as a card with a tinted icon square, title and subtitle. Children lay out in a
 * two-column grid; a field that needs the full width sets `sm:col-span-2` on itself. A whole
 * section can span both grid columns by passing `className="lg:col-span-2"`.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A labelled checkbox row, used for the yes/no hardware features on a monitor. */
export function CheckboxField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-blue-600 accent-blue-600 focus:ring-blue-500 dark:border-neutral-600"
        {...props}
      />
      {label}
    </label>
  );
}

/** A red asterisk after a required field's label. */
export function RequiredMark() {
  return <span className="text-rose-500"> *</span>;
}

/**
 * The Notes card, with a live character counter — identical on every asset form. Takes the
 * form's `control` (to watch the value for the counter) and `register`.
 */
export function NotesCard({
  control,
  register,
  maxLength = 500,
}: {
  control: any;
  register: any;
  maxLength?: number;
}) {
  const value = (useWatch({ control, name: "notes" }) as string) ?? "";
  return (
    <FormSection icon={StickyNote} title="Notes" description="Additional notes or remarks." className="lg:col-span-2">
      <div className="sm:col-span-2">
        <Textarea
          id="notes"
          rows={4}
          maxLength={maxLength}
          placeholder="Add any additional information..."
          {...register("notes")}
        />
        <div className="mt-1 text-right text-xs text-neutral-400">
          {value.length}/{maxLength}
        </div>
      </div>
    </FormSection>
  );
}

/**
 * The bottom action bar shared by every asset form: primary submit + Cancel, with an optional
 * hint on the right.
 */
export function FormActions({
  pending,
  submitLabel,
  submitIcon: SubmitIcon,
  cancelHref,
  hint,
}: {
  pending: boolean;
  submitLabel: string;
  submitIcon?: LucideIcon;
  cancelHref: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {SubmitIcon && <SubmitIcon className="h-4 w-4" />}
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </Link>
      </div>
      {hint && <p className="text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}

/** Wrapper that lays the form's section cards out in the two-column grid the mockups use. */
export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 [&_[data-slot=input]]:h-10! [&_[data-slot=input]]:px-3! [&_[data-slot=select-trigger]]:h-10! [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:px-3!">
      {children}
    </div>
  );
}
