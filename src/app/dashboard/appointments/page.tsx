import { AppointmentsView } from "@/components/appointments/appointments-view";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { hasRole, requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Citas" };

export default async function AppointmentsPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [appointments, customers] = await Promise.all([
    prisma.appointment.findMany({
      where: { companyId },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { requestedDate: "asc" },
      take: 200,
    }),
    prisma.customer.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Citas"
        description="Solicitudes generadas por el Agente de Citas y por tu equipo."
      />
      <AppointmentsView
        appointments={appointments}
        customers={customers}
        canEdit={hasRole(session.user.role, ["ADMIN", "OPERATOR"])}
      />
    </>
  );
}
