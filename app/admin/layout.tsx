import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/select-member");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav role="admin" />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
