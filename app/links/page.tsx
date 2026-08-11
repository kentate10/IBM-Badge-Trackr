import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const links = await prisma.linkResource.findMany({ orderBy: { displayOrder: "asc" } });
  const groups = new Map<string, typeof links>();
  for (const l of links) {
    if (!groups.has(l.category)) groups.set(l.category, []);
    groups.get(l.category)!.push(l);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav role={session.role} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">Links importantes</h1>
        <p className="mt-1 text-sm text-slate-500">Todo lo que necesitás para revisar y completar tu progreso.</p>

        <div className="mt-6 space-y-6">
          {[...groups.entries()].map(([category, list]) => (
            <div key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-slate-700">{category}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {list.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-blue-600">{link.title}</p>
                    {link.description && <p className="mt-0.5 text-xs text-slate-500">{link.description}</p>}
                    <p className="mt-0.5 truncate text-xs text-slate-400">{link.url}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
