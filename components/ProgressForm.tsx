"use client";

import { useMemo, useState } from "react";
import type { Status } from "@prisma/client";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";

export type ItemRow = {
  skillItemId: string;
  key: string;
  label: string;
  section: string;
  hasPercent: boolean;
  optional: boolean;
  helpText: string | null;
  status: Status;
  percent: number;
};

export default function ProgressForm({ memberId, items }: { memberId: string; items: ItemRow[] }) {
  const [rows, setRows] = useState<ItemRow[]>(items);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => rows.some((r, i) => r.status !== items[i].status || r.percent !== items[i].percent),
    [rows, items]
  );

  const sections = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const r of rows) {
      if (!map.has(r.section)) map.set(r.section, []);
      map.get(r.section)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  function updateRow(skillItemId: string, patch: Partial<ItemRow>) {
    setRows((prev) =>
      prev.map((r) =>
        r.skillItemId === skillItemId
          ? {
              ...r,
              ...patch,
              // Keep percent and status in sensible sync for the common case,
              // without fighting a user who wants to set them independently.
              percent:
                patch.status === "MET" && patch.percent === undefined && r.hasPercent
                  ? 100
                  : patch.status === "NOT_MET" && patch.percent === undefined && r.hasPercent && r.percent === 0
                    ? 0
                    : (patch.percent ?? r.percent),
            }
          : r
      )
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const changed = rows.filter((r, i) => r.status !== items[i].status || r.percent !== items[i].percent);
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          updates: changed.map((r) => ({ skillItemId: r.skillItemId, status: r.status, percent: r.percent })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
      } else {
        setSavedAt(new Date());
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {sections.map(([section, sectionRows]) => (
        <div key={section} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-700">{section}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sectionRows.map((row) => (
              <div key={row.skillItemId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {row.label}
                    {row.optional && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Opcional
                      </span>
                    )}
                  </p>
                  {row.helpText && <p className="mt-0.5 text-xs text-slate-400">{row.helpText}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(row.skillItemId, { status: e.target.value as Status })}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {row.hasPercent && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.percent}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          updateRow(row.skillItemId, { percent: v });
                        }}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm">
          {error && <span className="text-rose-600">{error}</span>}
          {!error && savedAt && !dirty && (
            <span className="text-emerald-600">Guardado {savedAt.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          {!error && dirty && <span className="text-amber-600">Tenés cambios sin guardar</span>}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
