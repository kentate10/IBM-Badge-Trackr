"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MemberPickerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pick() {
    setLoading(true);
    const res = await fetch("/api/auth/select-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id }),
    });
    if (res.ok) {
      router.push(`/member/${id}`);
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={pick}
      disabled={loading}
      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
    >
      {loading ? "Entrando..." : name}
    </button>
  );
}
