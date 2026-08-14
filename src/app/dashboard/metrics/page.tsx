import { CalendarCheck, FileText, ListChecks, MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MetricsCharts } from "@/components/metrics/metrics-charts";
import { StatCard } from "@/components/dashboard/stat-card";
import { getMetricsPayload } from "@/lib/metrics";
import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas" };

export default async function MetricsPage() {
  const session = await requireSession();
  const data = await getMetricsPayload(session.user.companyId);

  const totalConversations = data.conversationsPerDay.reduce((sum, row) => sum + row.total, 0);

  return (
    <>
      <PageHeader
        title="Métricas"
        description="Indicadores básicos para validar el valor de los agentes IA."
      />

      <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversaciones (7 días)"
          value={totalConversations}
          icon={MessageSquare}
          tone="primary"
        />
        <StatCard
          label="Citas confirmadas"
          value={`${data.appointments.confirmed}/${data.appointments.requested}`}
          hint={`Tasa de confirmación ${data.appointments.conversionRate}%`}
          icon={CalendarCheck}
          tone="emerald"
        />
        <StatCard
          label="Cotizaciones"
          value={data.quotes.reduce((sum, row) => sum + row.total, 0)}
          icon={FileText}
          tone="violet"
        />
        <StatCard
          label="Tareas pendientes"
          value={data.summary.pendingTasks}
          icon={ListChecks}
          tone="rose"
        />
      </section>

      <MetricsCharts data={data} />
    </>
  );
}
