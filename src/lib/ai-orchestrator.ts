import type { Channel, MetricEventType } from "@prisma/client";

import {
  AGENT_DEFINITIONS,
  agentAllows,
  getAgentDefinition,
  getAgentForIntent,
  type AgentDefinition,
  type Intent,
} from "@/lib/agent-definitions";
import {
  recordMetric,
  toolCreateAppointmentRequest,
  toolCreateTask,
  toolGenerateQuote,
  toolSaveFollowUpMessage,
  toolSendNotification,
  toolSummarizeConversation,
  toolUpdateCustomerStatus,
  toolUpsertCustomer,
} from "@/lib/agent-tools";
import { generateAgentDecision, isModelEnabled } from "@/lib/ai-provider";
import { parseSpanishDate, safeParseISO } from "@/lib/date-parsing";
import { buildMockDecision, detectIntent, type AgentContext } from "@/lib/mock-ai";
import { prisma } from "@/lib/prisma";
import type { AgentDecision, ChatTurnResult, ExecutedAction } from "@/types";

export interface OrchestratorInput {
  companyId: string;
  message: string;
  conversationId?: string | null;
  customerId?: string | null;
  channel?: Channel;
  visitor?: { name?: string; phone?: string; email?: string };
}

/**
 * Orquestador IA.
 *
 * Chat público -> detección de intención -> selección de agente ->
 * generación de respuesta (Anthropic, OpenAI o mock) -> ejecución de herramientas
 * permitidas -> persistencia de conversación, registros y métricas.
 */
export async function runOrchestrator(input: OrchestratorInput): Promise<ChatTurnResult> {
  const { companyId, message } = input;
  const channel: Channel = input.channel ?? "WEB_CHAT";

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      industry: true,
      description: true,
      phone: true,
      email: true,
      address: true,
      businessHours: true,
      tone: true,
    },
  });

  if (!company) {
    throw new Error(`La empresa ${companyId} no existe. Ejecuta el seed primero.`);
  }

  const [knowledge, companyAgents] = await Promise.all([
    prisma.knowledgeSource.findMany({
      where: { companyId, status: "PUBLISHED" },
      select: { title: true, type: true, content: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.companyAgent.findMany({
      where: { companyId, isActive: true },
      include: { agent: true },
    }),
  ]);

  // 1. Intención y agente
  const intent = detectIntent(message);
  const definition = pickAgentDefinition(intent, companyAgents.map((ca) => ca.agent.slug));
  const companyAgent = companyAgents.find((ca) => ca.agent.slug === definition.slug);
  const agentRecord =
    companyAgent?.agent ??
    (await prisma.agent.findUnique({ where: { slug: definition.slug } }));

  const effectiveDefinition: AgentDefinition = companyAgent?.customPrompt
    ? { ...definition, defaultPrompt: companyAgent.customPrompt }
    : definition;

  // 2. Conversación (existente o nueva)
  const conversation = await resolveConversation({
    companyId,
    conversationId: input.conversationId,
    customerId: input.customerId,
    channel,
    agentId: agentRecord?.id ?? null,
  });

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { sender: true, content: true },
  });

  const existingCustomer = conversation.customerId
    ? await prisma.customer.findFirst({
        where: { id: conversation.customerId, companyId },
      })
    : null;

  const context: AgentContext = {
    company,
    knowledge,
    history,
    customerName: existingCustomer?.name?.startsWith("Prospecto")
      ? null
      : existingCustomer?.name ?? input.visitor?.name ?? null,
  };

  // 3. Mensaje entrante
  await prisma.message.create({
    data: { conversationId: conversation.id, sender: "CUSTOMER", content: message },
  });

  // 4. Respuesta del agente (proveedor activo con fallback a mock)
  let decision: AgentDecision | null = null;
  if (isModelEnabled) {
    decision = await generateAgentDecision(message, context, effectiveDefinition, intent);
  }
  if (!decision) {
    decision = buildMockDecision(message, context, intent);
  }

  // 5. Ejecución de herramientas permitidas
  const actions: ExecutedAction[] = [];
  const metrics: MetricEventType[] = ["MESSAGE_RECEIVED", "AI_RESPONSE"];

  const detectedCustomer = {
    ...decision.customer,
    name: decision.customer?.name ?? input.visitor?.name,
    phone: decision.customer?.phone ?? input.visitor?.phone,
    email: decision.customer?.email ?? input.visitor?.email,
  };

  const hasContactData = Boolean(
    detectedCustomer.name ||
      detectedCustomer.phone ||
      detectedCustomer.email ||
      decision.appointment ||
      decision.quote,
  );

  let customerId = conversation.customerId ?? null;

  if (hasContactData && agentAllows(definition.slug, "create_customer")) {
    const customer = await toolUpsertCustomer({
      companyId,
      data: detectedCustomer,
      source: channel === "WEB_CHAT" ? "WEB_CHAT" : "DASHBOARD",
      existingCustomerId: customerId,
      status: statusForIntent(decision.intent),
    });
    if (!customerId) {
      metrics.push("LEAD_CREATED");
      actions.push({ tool: "create_customer", label: "Prospecto registrado", recordId: customer.id });
    }
    customerId = customer.id;
  }

  // Cita
  if (decision.appointment && customerId && agentAllows(definition.slug, "create_appointment_request")) {
    const requestedDateValue = safeParseISO(
      decision.appointment.requestedDate,
      parseSpanishDate(message),
    );

    const appointment = await toolCreateAppointmentRequest(companyId, customerId, {
      ...decision.appointment,
      requestedDateValue,
    });

    metrics.push("APPOINTMENT_REQUESTED");
    actions.push({
      tool: "create_appointment_request",
      label: "Solicitud de cita creada",
      recordId: appointment.id,
    });

    await toolUpdateCustomerStatus(companyId, customerId, "APPOINTMENT_REQUESTED", requestedDateValue);

    if (agentAllows(definition.slug, "create_task")) {
      const task = await toolCreateTask({
        companyId,
        customerId,
        agentId: agentRecord?.id,
        title: `Confirmar cita de ${decision.appointment.service}`,
        description: `Solicitud generada por ${definition.name} desde el chat. Confirmar disponibilidad con el cliente.`,
        dueDate: requestedDateValue,
        priority: "HIGH",
      });
      metrics.push("TASK_CREATED");
      actions.push({ tool: "create_task", label: "Tarea de confirmación creada", recordId: task.id });
    }

    if (agentAllows(definition.slug, "send_notification")) {
      await toolSendNotification({
        companyId,
        channel,
        to: detectedCustomer.email ?? detectedCustomer.phone,
        subject: "Solicitud de cita recibida",
        body: `Se registró una solicitud de cita para ${decision.appointment.service}.`,
      });
    }
  }

  // Cotización
  if (decision.quote && customerId && agentAllows(definition.slug, "generate_quote")) {
    const quote = await toolGenerateQuote(companyId, customerId, decision.quote);
    metrics.push("QUOTE_CREATED");
    actions.push({ tool: "generate_quote", label: "Cotización preliminar creada", recordId: quote.id });

    if (agentAllows(definition.slug, "update_customer_status")) {
      await toolUpdateCustomerStatus(companyId, customerId, "QUOTE_REQUESTED");
    }

    if (agentAllows(definition.slug, "create_task")) {
      const task = await toolCreateTask({
        companyId,
        customerId,
        agentId: agentRecord?.id,
        title: `Revisar y enviar cotización de ${decision.quote.service}`,
        description: "Cotización preliminar generada por IA; validar montos antes de enviarla.",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: "MEDIUM",
      });
      metrics.push("TASK_CREATED");
      actions.push({ tool: "create_task", label: "Tarea de cotización creada", recordId: task.id });
    }
  }

  // Seguimiento
  if (decision.followUpMessage && agentAllows(definition.slug, "generate_follow_up_message")) {
    await toolSaveFollowUpMessage(conversation.id, decision.followUpMessage);
    actions.push({ tool: "generate_follow_up_message", label: "Mensaje de seguimiento sugerido" });

    if (customerId && agentAllows(definition.slug, "update_customer_status")) {
      await toolUpdateCustomerStatus(companyId, customerId, "FOLLOW_UP");
    }

    if (agentAllows(definition.slug, "create_task")) {
      const task = await toolCreateTask({
        companyId,
        customerId,
        agentId: agentRecord?.id,
        title: "Dar seguimiento al prospecto",
        description: decision.followUpMessage,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        priority: "MEDIUM",
      });
      metrics.push("FOLLOW_UP_CREATED", "TASK_CREATED");
      actions.push({ tool: "create_task", label: "Tarea de seguimiento creada", recordId: task.id });
    }
  }

  // 6. Respuesta del agente + resumen
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "AGENT",
      content: decision.reply,
      metadata: {
        agentSlug: definition.slug,
        intent: decision.intent,
        source: decision.source,
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      customerId: customerId ?? undefined,
      agentId: agentRecord?.id ?? undefined,
    },
  });

  if (decision.summary && agentAllows(definition.slug, "summarize_conversation")) {
    await toolSummarizeConversation(conversation.id, decision.summary, agentRecord?.id);
    actions.push({ tool: "summarize_conversation", label: "Conversación resumida" });
  } else if (decision.summary) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { summary: decision.summary, status: "HANDLED_BY_AI" },
    });
  }

  // 7. Métricas
  await Promise.all(
    metrics.map((type) =>
      recordMetric(companyId, type, { agentSlug: definition.slug, intent: decision.intent }),
    ),
  );

  return {
    conversationId: conversation.id,
    reply: decision.reply,
    agent: { slug: definition.slug, name: definition.name },
    intent: decision.intent,
    actions,
    source: decision.source,
  };
}

/** Selecciona el agente activo de la empresa que corresponde a la intención. */
function pickAgentDefinition(intent: Intent, activeSlugs: string[]): AgentDefinition {
  const preferred = getAgentForIntent(intent);
  if (activeSlugs.length === 0 || activeSlugs.includes(preferred.slug)) return preferred;

  const fallback = activeSlugs
    .map((slug) => getAgentDefinition(slug))
    .find((definition): definition is AgentDefinition => Boolean(definition));

  return fallback ?? AGENT_DEFINITIONS[0];
}

async function resolveConversation(params: {
  companyId: string;
  conversationId?: string | null;
  customerId?: string | null;
  channel: Channel;
  agentId: string | null;
}) {
  if (params.conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: params.conversationId, companyId: params.companyId },
    });
    if (existing) return existing;
  }

  const conversation = await prisma.conversation.create({
    data: {
      companyId: params.companyId,
      customerId: params.customerId ?? undefined,
      agentId: params.agentId ?? undefined,
      channel: params.channel,
      status: "OPEN",
    },
  });

  await recordMetric(params.companyId, "CONVERSATION_STARTED", { channel: params.channel });
  return conversation;
}

function statusForIntent(intent: Intent) {
  switch (intent) {
    case "APPOINTMENT":
      return "APPOINTMENT_REQUESTED" as const;
    case "QUOTE":
      return "QUOTE_REQUESTED" as const;
    case "FOLLOW_UP":
      return "FOLLOW_UP" as const;
    default:
      return undefined;
  }
}
