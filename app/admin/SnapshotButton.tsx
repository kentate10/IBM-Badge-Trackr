"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SnapshotButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Guardado: ${data.membersSnapshotted} personas — ${data.label}`);
        router.refresh();
      } else {
        setMessage(data.error ?? "Error al guardar");
      }
    } catch {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-slate-500">{message}</span>}
      <button
        onClick={save}
        disabled={loading}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar snapshot quincenal"}
      </button>
    </div>
  );
}
