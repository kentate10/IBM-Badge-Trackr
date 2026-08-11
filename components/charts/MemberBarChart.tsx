"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MemberBarDatum = { name: string; pct: number };

function colorFor(pct: number) {
  if (pct >= 100) return "#10b981";
  if (pct >= 50) return "#f59e0b";
  return "#f43f5e";
}

export default function MemberBarChart({ data }: { data: MemberBarDatum[] }) {
  const height = Math.max(220, data.length * 28);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "#334155" }} />
        <Tooltip formatter={(v: number) => [`${v}%`, "Completado"]} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((d) => (
            <Cell key={d.name} fill={colorFor(d.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
