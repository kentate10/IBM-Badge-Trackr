"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }
      router.push(data.role === "admin" ? "/admin" : "/select-member");
      router.refresh();
    } catch {
      setError("Error de conexión, intenta de nuevo");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            B
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Badge Acceleration Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">2026 Core Skills Expectations — IBM Consulting Costa Rica</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Contraseña de acceso
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Miembros del equipo: usen la contraseña compartida.
            <br />
            Ken: usa la contraseña de administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
