import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "@/components/settings/settings-view";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [company, knowledge] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.knowledgeSource.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const canEdit = isAdmin(session.user.role);

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos del negocio y base de conocimiento que usan los agentes IA."
      />
      {!canEdit && (
        <p className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Tu rol es Operador: puedes consultar la configuración, pero solo un administrador puede
          editarla.
        </p>
      )}
      <SettingsView company={company} knowledge={knowledge} canEdit={canEdit} />
    </>
  );
}
