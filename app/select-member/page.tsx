import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleBandLabel } from "@/lib/labels";
import MemberPickerButton from "./MemberPickerButton";

export default async function SelectMemberPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const members = await prisma.member.findMany({
    orderBy: [{ role: "asc" }, { band: "asc" }, { name: "asc" }],
  });

  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const key = roleBandLabel(m.role, m.band);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-slate-900">¿Quién sos?</h1>
      <p className="mt-1 text-sm text-slate-500">
        Elegí tu nombre para ver y actualizar tu progreso. Podés cambiarlo luego desde tu página.
      </p>

      <div className="mt-8 space-y-8">
        {[...groups.entries()].map(([label, list]) => (
          <div key={label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((m) => (
                <MemberPickerButton key={m.id} id={m.id} name={m.name} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
