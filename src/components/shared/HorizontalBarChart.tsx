"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DataPoint = { label: string; value: number };

export function HorizontalBarChart({
  data,
  valueLabel = "Count",
}: {
  data: DataPoint[];
  valueLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--viz-axis)", fontSize: 12 }}
          axisLine={{ stroke: "var(--viz-grid)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={100}
          tick={{ fill: "var(--viz-axis)", fontSize: 12 }}
          axisLine={{ stroke: "var(--viz-grid)" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--viz-tooltip-bg)",
            border: "1px solid var(--viz-grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" name={valueLabel} fill="var(--viz-series-1)" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
