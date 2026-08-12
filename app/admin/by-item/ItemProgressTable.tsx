"use client";

import { useMemo, useState } from "react";
import type { Status } from "@prisma/client";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";

export type ItemMemberRow = {
  memberId: string;
  name: string;
  roleBand: string;
  status: Status;
  percent: number;
};

export default function ItemProgressTable({
  skillItemId,
  hasPercent,
  rows: initialRows,
}: {
  skillItemId: string;
  hasPercent: boolean;
  rows: ItemMemberRow[];
}) {
  const [rows, setRows] = useState<ItemMemberRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = useMemo(
    () => rows.some((r, i) => r.status !== initialRows[i].status || r.percent !== initialRows[i].percent),
    [rows, initialRows]
  );

  function updateRow(memberId: string, patch: Partial<ItemMemberRow>) {
    setRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId
          ? {
              ...r,
              ...patch,
              percent:
                patch.status === "MET" && patch.percent === undefined && hasPercent
                  ? 100
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
      const changed = rows.filter((r, i) => r.status !== initialRows[i].status || r.percent !== initialRows[i].percent);
      const results = await Promise.all(
        changed.map((r) =>
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: r.memberId,
              updates: [{ skillItemId, status: r.status, percent: r.percent }],
            }),
          })
        )
      );
      if (results.some((res) => !res.ok)) {
        setError("Algunos cambios no se guardaron, revisá e intentá de nuevo");
      } else {
        setSavedAt(new Date());
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Este requerimiento no aplica a nadie del equipo.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Rol / Banda</th>
              <th className="px-4 py-2.5">Status</th>
              {hasPercent && <th className="px-4 py-2.5">%</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.memberId}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{row.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{row.roleBand}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(row.memberId, { status: e.target.value as Status })}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                {hasPercent && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.percent}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          updateRow(row.memberId, { percent: v });
                        }}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm">
          {error && <span className="text-rose-600">{error}</span>}
          {!error && savedAt && !dirty && (
            <span className="text-emerald-600">
              Guardado {savedAt.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
            </span>
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
