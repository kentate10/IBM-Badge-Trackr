"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Details = {
  name: string;
  email: string;
  slackHandle: string | null;
  yearsAtIbm: number | null;
  isManager: boolean;
};

// Plain profile-field editor (name, email, Slack, years at IBM, isManager) —
// sibling to MemberRoleEditor.tsx, which stays dedicated to role/band and its
// specific warning copy. Same open/edit/save/cancel shape as that component
// so the two feel consistent side by side on /member/[id].
export default function MemberDetailsEditor({ memberId, initial }: { memberId: string; initial: Details }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Details>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    form.name !== initial.name ||
    form.email !== initial.email ||
    (form.slackHandle ?? "") !== (initial.slackHandle ?? "") ||
    (form.yearsAtIbm ?? null) !== (initial.yearsAtIbm ?? null) ||
    form.isManager !== initial.isManager;

  function cancel() {
    setOpen(false);
    setForm(initial);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/member/update-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...form }),
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
      <button onClick={() => setOpen(true)} className="mt-1 text-xs font-medium text-blue-600 hover:underline">
        Editar datos
      </button>
    );
  }

  return (
    <div className="mt-2 flex max-w-md flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="text-xs text-slate-500">
        Nombre
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="text-xs text-slate-500">
        Email
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="text-xs text-slate-500">
        Slack
        <input
          value={form.slackHandle ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, slackHandle: e.target.value }))}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="text-xs text-slate-500">
        Años en IBM
        <input
          type="number"
          min={0}
          step={0.1}
          value={form.yearsAtIbm ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, yearsAtIbm: e.target.value === "" ? null : Number(e.target.value) }))}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={form.isManager}
          onChange={(e) => setForm((f) => ({ ...f, isManager: e.target.checked }))}
          className="rounded border-slate-300"
        />
        Es manager
      </label>

      <div className="flex items-center gap-2 pt-1">
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
      </div>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
