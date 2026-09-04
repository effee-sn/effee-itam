"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DataPoint = { label: string; value: number };
export type ChartRow = DataPoint & { fullLabel: string; isOther?: boolean };

const ROW_HEIGHT = 40;

// Categorical palette — one colour per bar, readable on both light and dark cards.
// "Other" is deliberately grey so a rollup never looks like a real category.
const PALETTE = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#6366f1", "#14b8a6"];
const OTHER_COLOR = "#94a3b8";

function truncate(s: string, n = 16): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Rank descending and cap the number of bars: top items shown individually, the rest folded into a
 * single "Other" row so the chart is a fixed height however many categories exist. Exported for tests.
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
    return <p className="py-8 text-center text-sm text-neutral-500">No data yet.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const rows = foldTopN(data, maxItems);
  const height = rows.length * ROW_HEIGHT + 34; // + room for the x-axis

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--viz-axis)", fontSize: 11 }}
          axisLine={{ stroke: "var(--viz-grid)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={116}
          tick={{ fill: "var(--viz-axis)", fontSize: 12 }}
          tickFormatter={(v: string) => truncate(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as ChartRow;
            const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div
                style={{
                  background: "var(--viz-tooltip-bg)",
                  border: "1px solid var(--viz-grid)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,.08)",
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
        <Bar dataKey="value" name={valueLabel} radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}>
          {rows.map((row, i) => (
            <Cell key={i} fill={row.isOther ? OTHER_COLOR : PALETTE[i % PALETTE.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fill: "var(--viz-axis)", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
