import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Sidebar } from "@/components/layout/sidebar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

/**
 * Layout protegido: si no hay sesión, `requireSession()` redirige a /login.
 * Esta es la segunda barrera de seguridad además del middleware.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { name, email, role, companyName, companyId } = session.user;

  // Enlace al chat de la empresa del usuario (visible para todos los roles).
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, chatDomain: true },
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        chatPath={company ? `/chat/${company.slug}` : null}
        chatDomain={company?.chatDomain ?? null}
      />
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
