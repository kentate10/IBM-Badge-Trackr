"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SectionBarDatum = {
  name: string;
  met: number;
  inProgress: number;
  blocked: number;
  expired: number;
  notMet: number;
};

export default function SectionBarChart({ data }: { data: SectionBarDatum[] }) {
  const height = Math.max(220, data.length * 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} stackOffset="expand">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: "#334155" }} />
        <Tooltip formatter={(v: number, name: string) => [v, name]} />
        <Bar dataKey="met" stackId="a" fill="#10b981" name="Met" radius={[4, 0, 0, 4]} />
        <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
        <Bar dataKey="blocked" stackId="a" fill="#ea580c" name="Blocked" />
        <Bar dataKey="expired" stackId="a" fill="#8b5cf6" name="Expired" />
        <Bar dataKey="notMet" stackId="a" fill="#f43f5e" name="Not Met" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
