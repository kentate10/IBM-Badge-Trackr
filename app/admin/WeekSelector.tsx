"use client";

import { useRouter } from "next/navigation";

type WeekOption = { label: string; teamPercent: number };

export default function WeekSelector({ weeks, current }: { weeks: WeekOption[]; current: string | null }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="week-select" className="text-xs font-medium text-slate-500">
        Semana
      </label>
      <select
        id="week-select"
        value={current ?? "__live__"}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v === "__live__" ? "/admin" : `/admin?week=${encodeURIComponent(v)}`);
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      >
        <option value="__live__">En vivo (ahora)</option>
        {weeks.map((w) => (
          <option key={w.label} value={w.label}>
            {w.label} · {Math.round(w.teamPercent)}%
          </option>
        ))}
      </select>
    </div>
  );
}
