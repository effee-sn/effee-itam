"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DataPoint = { label: string; value: number };
export type ChartRow = DataPoint & { fullLabel: string; isOther?: boolean };

const ROW_HEIGHT = 34;

function truncate(s: string, n = 18): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Rank descending and cap the number of bars: the top items are shown individually
 * and everything past the cap is folded into a single "Other" row. This is what keeps
 * the chart a fixed size — without it, one bar was rendered per department, so the card
 * grew unbounded (36px taller for every department) as the org added more of them.
 * Exported for testing.
 */
export function foldTopN(data: DataPoint[], maxItems: number): ChartRow[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxItems) {
    return sorted.map((d) => ({ ...d, fullLabel: d.label }));
  }
  const top = sorted.slice(0, maxItems - 1);
  const rest = sorted.slice(maxItems - 1);
  const otherValue = rest.reduce((sum, d) => sum + d.value, 0);
  return [
    ...top.map((d) => ({ ...d, fullLabel: d.label })),
    { label: `Other (${rest.length})`, fullLabel: `${rest.length} smaller groups`, value: otherValue, isOther: true },
  ];
}

export function HorizontalBarChart({
  data,
  valueLabel = "Count",
  maxItems = 8,
}: {
  data: DataPoint[];
  valueLabel?: string;
  maxItems?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No data yet.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const rows = foldTopN(data, maxItems);
  const height = rows.length * ROW_HEIGHT + 16;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 44, top: 4, bottom: 4 }}>
        {/* X axis hidden: the value sits directly on each bar (LabelList below), which reads
            faster than a scale on a compact dashboard card. */}
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fill: "var(--viz-axis)", fontSize: 12 }}
          tickFormatter={(v: string) => truncate(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as ChartRow;
            const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div
                style={{
                  background: "var(--viz-tooltip-bg)",
                  border: "1px solid var(--viz-grid)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{row.fullLabel}</div>
                <div style={{ color: "var(--viz-axis)", fontVariantNumeric: "tabular-nums" }}>
                  {row.value} {valueLabel} · {pct}%
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
          {rows.map((row, i) => (
            // The "Other" aggregate is muted so it reads as a rollup, not a real category.
            <Cell key={i} fill={row.isOther ? "var(--viz-axis)" : "var(--viz-series-1)"} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fill: "var(--viz-axis)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
