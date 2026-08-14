import { CustomersView } from "@/components/customers/customers-view";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { hasRole, requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes y prospectos" };

export default async function CustomersPage() {
  const session = await requireSession();

  const customers = await prisma.customer.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Clientes y prospectos"
        description="Prospectos capturados por los agentes IA y por tu equipo."
      />
      <CustomersView
        customers={customers}
        canEdit={hasRole(session.user.role, ["ADMIN", "OPERATOR"])}
      />
    </>
  );
}
