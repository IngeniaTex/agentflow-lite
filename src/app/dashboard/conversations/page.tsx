import { ConversationsView } from "@/components/conversations/conversations-view";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversaciones" };

export default async function ConversationsPage() {
  const session = await requireSession();

  const conversations = await prisma.conversation.findMany({
    where: { companyId: session.user.companyId },
    include: {
      customer: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Conversaciones"
        description="Historial de conversaciones atendidas por los agentes IA."
      />
      <ConversationsView conversations={conversations} />
    </>
  );
}
