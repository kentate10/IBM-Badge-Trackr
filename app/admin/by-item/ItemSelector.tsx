"use client";

import { useRouter } from "next/navigation";

type ItemOption = { key: string; label: string; section: string };

export default function ItemSelector({ items, current }: { items: ItemOption[]; current: string }) {
  const router = useRouter();

  const bySection = new Map<string, ItemOption[]>();
  for (const it of items) {
    if (!bySection.has(it.section)) bySection.set(it.section, []);
    bySection.get(it.section)!.push(it);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="item-select" className="text-xs font-medium text-slate-500">
        Requerimiento
      </label>
      <select
        id="item-select"
        value={current}
        onChange={(e) => router.push(`/admin/by-item?item=${encodeURIComponent(e.target.value)}`)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      >
        {[...bySection.entries()].map(([section, opts]) => (
          <optgroup key={section} label={section}>
            {opts.map((it) => (
              <option key={it.key} value={it.key}>
                {it.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
