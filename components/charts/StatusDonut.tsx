"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_LABELS, STATUS_STYLES, STATUS_ORDER } from "@/lib/labels";
import type { Status } from "@prisma/client";

export default function StatusDonut({ counts }: { counts: Record<Status, number> }) {
  const data = STATUS_ORDER.map((s) => ({ name: STATUS_LABELS[s], value: counts[s] ?? 0, status: s }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_STYLES[d.status].hex} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} campos`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-900">{total}</span>
        <span className="text-xs text-slate-400">campos totales</span>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d) => (
          <span key={d.status} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_STYLES[d.status].hex }} />
            {d.name} ({d.value})
          </span>
        ))}
      </div>
    </div>
  );
}
