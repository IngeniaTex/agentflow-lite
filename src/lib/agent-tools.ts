import type {
  AppointmentStatus,
  Channel,
  CustomerSource,
  CustomerStatus,
  MetricEventType,
  Prisma,
  QuoteStatus,
  TaskPriority,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { DetectedAppointment, DetectedCustomer, DetectedQuote } from "@/types";

/**
 * Herramientas internas que los agentes pueden ejecutar.
 * Todas escriben en la base de datos filtrando por `companyId`.
 */

interface CustomerToolInput {
  companyId: string;
  data: DetectedCustomer;
  source?: CustomerSource;
  status?: CustomerStatus;
  existingCustomerId?: string | null;
}

/** create_customer — crea o actualiza el prospecto detectado en la conversación. */
export async function toolUpsertCustomer({
  companyId,
  data,
  source = "WEB_CHAT",
  status,
  existingCustomerId,
}: CustomerToolInput) {
  const now = new Date();

  if (existingCustomerId) {
    return prisma.customer.update({
      where: { id: existingCustomerId },
      data: {
        name: data.name || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        serviceInterest: data.serviceInterest || undefined,
        status: status || undefined,
        lastContactAt: now,
      },
    });
  }

  // Reutiliza el prospecto si ya existe por email o teléfono.
  const existing =
    data.email || data.phone
      ? await prisma.customer.findFirst({
          where: {
            companyId,
            OR: [
              data.email ? { email: data.email } : undefined,
              data.phone ? { phone: data.phone } : undefined,
            ].filter(Boolean) as Prisma.CustomerWhereInput[],
          },
        })
      : null;

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: data.name || existing.name,
        phone: data.phone || existing.phone,
        email: data.email || existing.email,
        serviceInterest: data.serviceInterest || existing.serviceInterest,
        status: status || existing.status,
        lastContactAt: now,
      },
    });
  }

  return prisma.customer.create({
    data: {
      companyId,
      name: data.name?.trim() || "Prospecto del chat",
      phone: data.phone,
      email: data.email,
      serviceInterest: data.serviceInterest,
      source,
      status: status ?? "NEW",
      lastContactAt: now,
      notes: "Prospecto capturado automáticamente por la Recepcionista IA.",
    },
  });
}

/** update_customer_status — mueve al prospecto en el embudo. */
export async function toolUpdateCustomerStatus(
  companyId: string,
  customerId: string,
  status: CustomerStatus,
  nextActionAt?: Date,
) {
  return prisma.customer.updateMany({
    where: { id: customerId, companyId },
    data: { status, nextActionAt, lastContactAt: new Date() },
  });
}

/** create_appointment_request — registra la solicitud de cita. */
export async function toolCreateAppointmentRequest(
  companyId: string,
  customerId: string,
  data: DetectedAppointment & { requestedDateValue: Date; status?: AppointmentStatus },
) {
  return prisma.appointment.create({
    data: {
      companyId,
      customerId,
      service: data.service,
      requestedDate: data.requestedDateValue,
      status: data.status ?? "REQUESTED",
      notes: data.notes,
    },
  });
}

/** generate_quote — crea la cotización preliminar. */
export async function toolGenerateQuote(
  companyId: string,
  customerId: string,
  data: DetectedQuote & { status?: QuoteStatus },
) {
  return prisma.quote.create({
    data: {
      companyId,
      customerId,
      service: data.service,
      description: data.description,
      amount: data.amount,
      currency: data.currency ?? "MXN",
      status: data.status ?? "DRAFT",
      notes: data.notes,
    },
  });
}

/** create_task — genera una tarea operativa para el equipo. */
export async function toolCreateTask(input: {
  companyId: string;
  title: string;
  description?: string;
  customerId?: string | null;
  agentId?: string | null;
  dueDate?: Date;
  priority?: TaskPriority;
}) {
  return prisma.task.create({
    data: {
      companyId: input.companyId,
      customerId: input.customerId ?? undefined,
      agentId: input.agentId ?? undefined,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority ?? "MEDIUM",
      status: "PENDING",
    },
  });
}

/** summarize_conversation — guarda el resumen y el estado de la conversación. */
export async function toolSummarizeConversation(
  conversationId: string,
  summary: string,
  agentId?: string | null,
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      summary,
      status: "HANDLED_BY_AI",
      agentId: agentId ?? undefined,
    },
  });
}

/** generate_follow_up_message — guarda el mensaje sugerido en la conversación. */
export async function toolSaveFollowUpMessage(
  conversationId: string,
  message: string,
) {
  return prisma.message.create({
    data: {
      conversationId,
      sender: "SYSTEM",
      content: message,
      metadata: { kind: "follow_up_suggestion" },
    },
  });
}

/**
 * send_notification — preparado para el futuro (Resend / WhatsApp).
 * Hoy solo deja traza en consola para no bloquear el MVP.
 */
export async function toolSendNotification(payload: {
  companyId: string;
  channel: Channel;
  to?: string | null;
  subject: string;
  body: string;
}) {
  console.info("[notification:pendiente]", payload.subject, "->", payload.to ?? "sin destino");
  return { queued: false, reason: "Integración de notificaciones pendiente (Fase 2)" };
}

/** Registra un evento de métrica. */
export async function recordMetric(
  companyId: string,
  type: MetricEventType,
  metadata?: Prisma.InputJsonValue,
  value = 1,
) {
  return prisma.metricEvent.create({
    data: { companyId, type, value, metadata },
  });
}
