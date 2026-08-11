"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role, Band } from "@prisma/client";
import { ROLE_LABELS, BAND_LABELS } from "@/lib/labels";

const ROLES = Object.keys(ROLE_LABELS) as Role[];
const BANDS = Object.keys(BAND_LABELS) as Band[];

export default function MemberRoleEditor({
  memberId,
  initialRole,
  initialBand,
}: {
  memberId: string;
  initialRole: Role;
  initialBand: Band;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(initialRole);
  const [band, setBand] = useState<Band>(initialBand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = role !== initialRole || band !== initialBand;

  function cancel() {
    setOpen(false);
    setRole(initialRole);
    setBand(initialBand);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/member/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role, band }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        setSaving(false);
        return;
      }
      setOpen(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-medium text-blue-600 hover:underline"
      >
        Cambiar rol / banda
      </button>
    );
  }

  return (
    <div className="mt-2 flex max-w-md flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <select
        value={band}
        onChange={(e) => setBand(e.target.value as Band)}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
      >
        {BANDS.map((b) => (
          <option key={b} value={b}>
            {BAND_LABELS[b]}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
      <button onClick={cancel} className="text-sm text-slate-500 hover:text-slate-700">
        Cancelar
      </button>
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}
      {dirty && !error && (
        <span className="w-full text-xs text-amber-600">
          Esto cambia qué campos ve esta persona. El progreso anterior no se borra, pero queda oculto si ya no aplica a
          su nuevo rol/banda.
        </span>
      )}
    </div>
  );
}
