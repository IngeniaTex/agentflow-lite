import { AgentsGrid } from "@/components/agents/agents-grid";
import { PageHeader } from "@/components/layout/page-header";
import { getAgentDefinition } from "@/lib/agent-definitions";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/require-session";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agentes" };

export default async function AgentsPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const agents = await prisma.agent.findMany({
    where: { status: { not: "INACTIVE" } },
    include: {
      companyAgents: { where: { companyId } },
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const data = agents.map((agent) => {
    const companyAgent = agent.companyAgents[0];
    return {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      department: agent.department,
      description: agent.description,
      defaultPrompt: agent.defaultPrompt,
      basePrice: toNumber(agent.basePrice),
      isActive: companyAgent?.isActive ?? false,
      customPrompt: companyAgent?.customPrompt ?? null,
      monthlyLimit: companyAgent?.monthlyLimit ?? null,
      conversations: agent._count.conversations,
      tools: getAgentDefinition(agent.slug)?.tools ?? [],
    };
  });

  const activeCount = data.filter((agent) => agent.isActive).length;

  return (
    <>
      <PageHeader
        title="Agentes"
        description={`${activeCount} de ${data.length} agentes activos para ${session.user.companyName}.`}
      />
      {!isAdmin(session.user.role) && (
        <p className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Tu rol es Operador: puedes consultar los agentes, pero solo un administrador puede
          activarlos o editar su prompt.
        </p>
      )}
      <AgentsGrid agents={data} canManage={isAdmin(session.user.role)} />
    </>
  );
}
