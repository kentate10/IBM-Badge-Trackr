"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavProps = {
  role: "member" | "admin";
  memberName?: string;
};

export default function Nav({ role, memberName }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links =
    role === "admin"
      ? [
          { href: "/admin", label: "Panel" },
          { href: "/admin/scope", label: "Scope" },
          { href: "/admin/members", label: "Equipo" },
          { href: "/admin/by-item", label: "Por requerimiento" },
          { href: "/links", label: "Links" },
        ]
      : [
          { href: memberName ? pathname : "/select-member", label: "Mi progreso" },
          { href: "/links", label: "Links" },
        ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              B
            </span>
            Badge Acceleration
          </span>
          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {role === "member" && (
            <Link href="/select-member" className="text-slate-500 hover:text-slate-800">
              Cambiar de persona
            </Link>
          )}
          {role === "admin" && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">Admin</span>}
          <button onClick={logout} className="text-slate-500 hover:text-slate-800">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
