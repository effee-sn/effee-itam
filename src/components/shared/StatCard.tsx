export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
