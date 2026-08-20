/**
 * One titled block of related fields — the structure GLPI's own asset forms use, and what
 * the purpose-built Computer and Monitor forms are built from. Shared so the two can't drift
 * into looking like different products.
 *
 * Children lay out in a two-column grid; a field that needs the full width sets
 * `sm:col-span-2` on itself.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-5 dark:border-neutral-800">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
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
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4" {...props} />
      {label}
    </label>
  );
}
