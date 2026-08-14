import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Sidebar } from "@/components/layout/sidebar";
import { requireSession } from "@/lib/require-session";

/**
 * Layout protegido: si no hay sesión, `requireSession()` redirige a /login.
 * Esta es la segunda barrera de seguridad además del middleware.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { name, email, role, companyName } = session.user;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          name={name ?? "Usuario"}
          email={email}
          role={role}
          companyName={companyName}
        />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
