import { format, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import type { DashboardSummary } from "@/types";

/** Tarjetas del resumen operativo del dashboard. */
export async function getDashboardSummary(companyId: string): Promise<DashboardSummary> {
  const [newLeads, appointmentsRequested, quotesGenerated, pendingTasks, followUp, aiConversations] =
    await Promise.all([
      prisma.customer.count({ where: { companyId, status: "NEW" } }),
      prisma.appointment.count({ where: { companyId, status: "REQUESTED" } }),
      prisma.quote.count({ where: { companyId } }),
      prisma.task.count({ where: { companyId, status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] } } }),
      prisma.customer.count({ where: { companyId, status: "FOLLOW_UP" } }),
      prisma.conversation.count({ where: { companyId, status: "HANDLED_BY_AI" } }),
    ]);

  return {
    newLeads,
    appointmentsRequested,
    quotesGenerated,
    pendingTasks,
    customersInFollowUp: followUp,
    aiConversations,
  };
}

/** Conversaciones iniciadas por día (últimos N días). */
export async function getConversationsPerDay(companyId: string, days = 7) {
  const from = startOfDay(subDays(new Date(), days - 1));

  const events = await prisma.metricEvent.findMany({
    where: { companyId, type: "CONVERSATION_STARTED", createdAt: { gte: from } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    buckets.set(day, 0);
  }

  for (const event of events) {
    const key = format(event.createdAt, "yyyy-MM-dd");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([day, total]) => ({
    day,
    label: format(new Date(`${day}T12:00:00`), "EEE d", { locale: es }),
    total,
  }));
}

export async function getCustomersByStatus(companyId: string) {
  const rows = await prisma.customer.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
  });
  return rows.map((row) => ({ status: row.status as string, total: row._count._all }));
}

export async function getTasksByStatus(companyId: string) {
  const rows = await prisma.task.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
  });
  return rows.map((row) => ({ status: row.status as string, total: row._count._all }));
}

export async function getQuotesByStatus(companyId: string) {
  const rows = await prisma.quote.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
    _sum: { amount: true },
  });
  return rows.map((row) => ({
    status: row.status as string,
    total: row._count._all,
    amount: Number(row._sum.amount ?? 0),
  }));
}

export async function getAppointmentsStats(companyId: string) {
  const rows = await prisma.appointment.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
  const requested = rows.reduce((total, row) => total + row._count._all, 0);
  const confirmed = (byStatus.CONFIRMED ?? 0) + (byStatus.COMPLETED ?? 0);

  return {
    byStatus: rows.map((row) => ({ status: row.status as string, total: row._count._all })),
    requested,
    confirmed,
    conversionRate: requested === 0 ? 0 : Math.round((confirmed / requested) * 100),
  };
}

/**
 * Recomendaciones IA simuladas: reglas simples sobre los datos del negocio.
 * En la Fase 2 se sustituyen por un reporte generado con el modelo.
 */
export async function getAiRecommendations(companyId: string) {
  const [staleLeads, overdueTasks, draftQuotes, unconfirmed] = await Promise.all([
    prisma.customer.count({
      where: {
        companyId,
        status: { in: ["NEW", "CONTACTED", "FOLLOW_UP"] },
        lastContactAt: { lt: subDays(new Date(), 2) },
      },
    }),
    prisma.task.count({ where: { companyId, status: "OVERDUE" } }),
    prisma.quote.count({ where: { companyId, status: "DRAFT" } }),
    prisma.appointment.count({ where: { companyId, status: "REQUESTED" } }),
  ]);

  const recommendations: { title: string; detail: string; agent: string; tone: string }[] = [];

  if (unconfirmed > 0) {
    recommendations.push({
      title: `Confirma ${unconfirmed} cita${unconfirmed === 1 ? "" : "s"} pendiente${unconfirmed === 1 ? "" : "s"}`,
      detail:
        "Hay solicitudes de cita esperando confirmación. Confirmarlas hoy reduce las cancelaciones.",
      agent: "Agente de Citas",
      tone: "amber",
    });
  }

  if (staleLeads > 0) {
    recommendations.push({
      title: `${staleLeads} prospecto${staleLeads === 1 ? "" : "s"} sin contacto reciente`,
      detail: "El Agente de Seguimiento puede generar mensajes listos para enviar por WhatsApp.",
      agent: "Agente de Seguimiento",
      tone: "sky",
    });
  }

  if (draftQuotes > 0) {
    recommendations.push({
      title: `${draftQuotes} cotización${draftQuotes === 1 ? "" : "es"} en borrador`,
      detail: "Revisa los montos generados por IA y envíalas para no perder la oportunidad.",
      agent: "Agente de Cotizaciones",
      tone: "violet",
    });
  }

  if (overdueTasks > 0) {
    recommendations.push({
      title: `${overdueTasks} tarea${overdueTasks === 1 ? "" : "s"} vencida${overdueTasks === 1 ? "" : "s"}`,
      detail: "Reasigna o cierra las tareas vencidas para mantener el pipeline limpio.",
      agent: "Recepcionista IA",
      tone: "rose",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Todo al día",
      detail: "No hay pendientes críticos. Buen momento para cargar más contenido a la base de conocimiento.",
      agent: "Recepcionista IA",
      tone: "emerald",
    });
  }

  return recommendations;
}

/** Payload completo de la sección de métricas. */
export async function getMetricsPayload(companyId: string) {
  const [summary, conversationsPerDay, customersByStatus, appointments, quotes, tasks] =
    await Promise.all([
      getDashboardSummary(companyId),
      getConversationsPerDay(companyId, 7),
      getCustomersByStatus(companyId),
      getAppointmentsStats(companyId),
      getQuotesByStatus(companyId),
      getTasksByStatus(companyId),
    ]);

  return { summary, conversationsPerDay, customersByStatus, appointments, quotes, tasks };
}
