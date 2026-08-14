import { PageHeader } from "@/components/layout/page-header";
import { TasksView } from "@/components/tasks/tasks-view";
import { prisma } from "@/lib/prisma";
import { hasRole, requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tareas" };

export default async function TasksPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [tasks, customers] = await Promise.all([
    prisma.task.findMany({
      where: { companyId },
      include: {
        customer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
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
        title="Tareas"
        description="Pendientes operativos creados por los agentes IA y por tu equipo."
      />
      <TasksView
        tasks={tasks}
        customers={customers}
        canEdit={hasRole(session.user.role, ["ADMIN", "OPERATOR"])}
      />
    </>
  );
}
