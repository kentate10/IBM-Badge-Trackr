"use client";

import { useState } from "react";

export type CommentRow = {
  id: string;
  author: string | null;
  body: string;
  createdAt: string; // ISO string — serialized server-side, formatted here
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Timestamped, append-only notes feed on a member's profile — separate from
// the legacy single Member.notes field (left untouched). Visible to anyone
// who can see this profile (admin or the member themselves); only admins get
// the add/delete controls. See app/api/member/comments/route.ts.
export default function MemberComments({
  memberId,
  initialComments,
  isAdmin,
}: {
  memberId: string;
  initialComments: CommentRow[];
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addComment() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/member/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, body: text.trim(), author: author.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el comentario");
        return;
      }
      setComments((prev) => [data.comment as CommentRow, ...prev]);
      setText("");
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch("/api/member/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
      if (!res.ok) {
        setError("No se pudo borrar el comentario");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Comentarios</h3>
        <span className="text-xs text-slate-400">{comments.length}</span>
      </div>

      {isAdmin && (
        <div className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Agregar un comentario..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="w-40 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addComment}
              disabled={saving || !text.trim()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Agregar comentario"}
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Todavía no hay comentarios.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {c.author || "Admin"} · {formatDate(c.createdAt)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    disabled={deletingId === c.id}
                    className="text-xs text-slate-400 hover:text-rose-600 disabled:opacity-40"
                    title="Borrar comentario"
                  >
                    {deletingId === c.id ? "Borrando..." : "Borrar"}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
