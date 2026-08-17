"use client";

import { useMemo, useState } from "react";
import type { Status } from "@prisma/client";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";

export type ScopeCell =
  | { applicable: true; skillItemId: string; status: Status; percent: number }
  | { applicable: false };

export type ScopeRow = { memberId: string; name: string; band: string; cells: ScopeCell[] };

// Same click-to-manage pattern as app/admin/by-item/ItemProgressTable.tsx,
// transposed: that table is one requirement x every applicable person, this
// one is one person x every scoped requirement (matching the reference
// screenshots' layout). Reuses the exact same /api/progress endpoint, which
// already accepts multiple skillItem updates per member in one call.
export default function ScopeTable({
  title,
  columns,
  rows: initialRows,
}: {
  title: string;
  columns: string[];
  rows: ScopeRow[];
}) {
  const [rows, setRows] = useState<ScopeRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = useMemo(
    () =>
      rows.some((row, ri) =>
        row.cells.some((cell, ci) => {
          const initial = initialRows[ri].cells[ci];
          if (!cell.applicable || !initial.applicable) return false;
          return cell.status !== initial.status || cell.percent !== initial.percent;
        })
      ),
    [rows, initialRows]
  );

  function updateCell(memberId: string, colIndex: number, patch: { status?: Status; percent?: number }) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.memberId !== memberId) return row;
        return {
          ...row,
          cells: row.cells.map((cell, i) => {
            if (i !== colIndex || !cell.applicable) return cell;
            const nextStatus = patch.status ?? cell.status;
            const nextPercent = patch.percent !== undefined ? patch.percent : patch.status === "MET" ? 100 : cell.percent;
            return { ...cell, status: nextStatus, percent: nextPercent };
          }),
        };
      })
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const requests: Promise<Response>[] = [];
      rows.forEach((row, ri) => {
        const updates: { skillItemId: string; status: Status; percent: number }[] = [];
        row.cells.forEach((cell, ci) => {
          if (!cell.applicable) return;
          const initial = initialRows[ri].cells[ci];
          if (!initial.applicable) return;
          if (cell.status !== initial.status || cell.percent !== initial.percent) {
            updates.push({ skillItemId: cell.skillItemId, status: cell.status, percent: cell.percent });
          }
        });
        if (updates.length > 0) {
          requests.push(
            fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ memberId: row.memberId, updates }),
            })
          );
        }
      });
      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) {
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
    return <p className="py-8 text-center text-sm text-slate-400">Nadie aplica todavía.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{rows.length} personas</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <th className="whitespace-nowrap px-3 py-2.5">Nombre</th>
              <th className="whitespace-nowrap px-3 py-2.5">Banda</th>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.memberId}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.band}</td>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2">
                    {!cell.applicable ? (
                      <span className="text-xs text-slate-300">N/A</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          value={cell.status}
                          onChange={(e) => updateCell(row.memberId, ci, { status: e.target.value as Status })}
                          className="rounded-md border border-slate-300 px-1.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={cell.percent}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            updateCell(row.memberId, ci, { percent: v });
                          }}
                          className="w-11 rounded-md border border-slate-300 px-1 py-1 text-right text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </td>
                ))}
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
