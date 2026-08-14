import { PageHeader } from "@/components/layout/page-header";
import { QuotesView } from "@/components/quotes/quotes-view";
import { prisma } from "@/lib/prisma";
import { hasRole, requireSession } from "@/lib/require-session";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cotizaciones" };

export default async function QuotesPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [quotes, customers] = await Promise.all([
    prisma.quote.findMany({
      where: { companyId },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
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
        title="Cotizaciones"
        description="Cotizaciones preliminares generadas por IA y por tu equipo."
      />
      <QuotesView
        quotes={quotes.map((quote) => ({ ...quote, amount: toNumber(quote.amount) }))}
        customers={customers}
        canEdit={hasRole(session.user.role, ["ADMIN", "OPERATOR"])}
      />
    </>
  );
}
