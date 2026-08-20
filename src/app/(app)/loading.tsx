export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
      </div>
      <div className="space-y-3 rounded-md border p-4 dark:border-neutral-800">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-8 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        ))}
      </div>
    </div>
  );
}
