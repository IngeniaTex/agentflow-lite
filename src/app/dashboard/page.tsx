import Link from "next/link";
import {
  CalendarCheck,
  FileText,
  ListChecks,
  MessageSquare,
  Repeat,
  UserPlus,
} from "lucide-react";

import { AiRecommendations } from "@/components/dashboard/ai-recommendations";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appointmentStatusLabels, customerStatusLabels } from "@/lib/labels";
import { getAiRecommendations, getDashboardSummary } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { formatDateTime, formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [summary, recommendations, recentCustomers, upcomingAppointments, recentConversations] =
    await Promise.all([
      getDashboardSummary(companyId),
      getAiRecommendations(companyId),
      prisma.customer.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: { companyId, status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] } },
        include: { customer: { select: { name: true } } },
        orderBy: { requestedDate: "asc" },
        take: 5,
      }),
      prisma.conversation.findMany({
        where: { companyId },
        include: {
          customer: { select: { name: true } },
          agent: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <>
      <PageHeader
        title={`Hola, ${session.user.name?.split(" ")[0] ?? "equipo"} 👋`}
        description={`Resumen operativo de ${session.user.companyName}.`}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Prospectos nuevos" value={summary.newLeads} icon={UserPlus} tone="sky" />
        <StatCard
          label="Citas solicitadas"
          value={summary.appointmentsRequested}
          icon={CalendarCheck}
          tone="amber"
        />
        <StatCard
          label="Cotizaciones generadas"
          value={summary.quotesGenerated}
          icon={FileText}
          tone="violet"
        />
        <StatCard
          label="Tareas pendientes"
          value={summary.pendingTasks}
          icon={ListChecks}
          tone="rose"
        />
        <StatCard
          label="Clientes en seguimiento"
          value={summary.customersInFollowUp}
          icon={Repeat}
          tone="emerald"
        />
        <StatCard
          label="Conversaciones atendidas por IA"
          value={summary.aiConversations}
          icon={MessageSquare}
          tone="primary"
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos prospectos</CardTitle>
              <CardDescription>Capturados por los agentes o cargados por el equipo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCustomers.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no hay prospectos.</p>
              )}
              {recentCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href="/dashboard/customers"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer.serviceInterest ?? "Sin servicio de interés"} ·{" "}
                      {formatRelative(customer.createdAt)}
                    </p>
                  </div>
                  <Badge status={customer.status}>
                    {customerStatusLabels[customer.status] ?? customer.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas citas</CardTitle>
              <CardDescription>Solicitudes que esperan confirmación del equipo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
              )}
              {upcomingAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href="/dashboard/appointments"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {appointment.customer.name} · {appointment.service}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(appointment.confirmedDate ?? appointment.requestedDate)}
                    </p>
                  </div>
                  <Badge status={appointment.status}>
                    {appointmentStatusLabels[appointment.status] ?? appointment.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <AiRecommendations items={recommendations} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversaciones recientes</CardTitle>
              <CardDescription>Atendidas por los agentes IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentConversations.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin conversaciones todavía.</p>
              )}
              {recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href="/dashboard/conversations"
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
                >
                  <p className="text-sm font-medium">
                    {conversation.customer?.name ?? "Visitante del chat"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {conversation.summary ?? "Conversación en curso"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {conversation.agent?.name ?? "Sin agente"} ·{" "}
                    {formatRelative(conversation.updatedAt)}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
