import OpenAI from "openai";

import type { AgentDefinition, Intent } from "@/lib/agent-definitions";
import type { AgentContext } from "@/lib/mock-ai";
import type { AgentDecision } from "@/types";

const apiKey = process.env.OPENAI_API_KEY?.trim();

/** true cuando hay API key configurada; si no, el sistema usa respuestas mock. */
export const isOpenAIEnabled = Boolean(apiKey);

export const openai = isOpenAIEnabled ? new OpenAI({ apiKey }) : null;

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

function buildSystemPrompt(agent: AgentDefinition, context: AgentContext) {
  const { company, knowledge } = context;

  const businessInfo = [
    `Negocio: ${company.name}`,
    company.industry && `Giro: ${company.industry}`,
    company.description && `Descripción: ${company.description}`,
    company.businessHours && `Horario: ${company.businessHours}`,
    company.phone && `Teléfono: ${company.phone}`,
    company.email && `Email: ${company.email}`,
    company.address && `Dirección: ${company.address}`,
    company.tone && `Tono de comunicación: ${company.tone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const knowledgeBase = knowledge.length
    ? knowledge
        .map((item) => `- [${item.type}] ${item.title}: ${item.content}`)
        .join("\n")
    : "Sin base de conocimiento cargada.";

  return `${agent.defaultPrompt}

## Información del negocio
${businessInfo}

## Base de conocimiento
${knowledgeBase}

## Formato de salida
Responde ÚNICAMENTE con un objeto JSON válido con esta forma:
{
  "reply": "respuesta al cliente en español",
  "intent": "GENERAL" | "FAQ" | "APPOINTMENT" | "QUOTE" | "FOLLOW_UP",
  "summary": "resumen corto de la conversación",
  "customer": { "name": string|null, "phone": string|null, "email": string|null, "serviceInterest": string|null },
  "appointment": { "service": string, "requestedDate": "YYYY-MM-DDTHH:mm:ss.sssZ", "notes": string|null } | null,
  "quote": { "service": string, "description": string|null, "amount": number, "currency": "MXN", "notes": string|null } | null,
  "followUpMessage": string|null
}
Reglas del JSON:
- Incluye "appointment" solo si el cliente pide agendar.
- Incluye "quote" solo si el cliente pide precio o cotización, con un monto numérico.
- Usa la fecha actual (${new Date().toISOString()}) para resolver expresiones como "el viernes" o "mañana".
- No agregues texto fuera del JSON.`;
}

const VALID_INTENTS: Intent[] = ["GENERAL", "FAQ", "APPOINTMENT", "QUOTE", "FOLLOW_UP"];

function coerceDecision(raw: unknown, fallbackIntent: Intent): AgentDecision | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown> & {
    reply?: unknown;
    intent?: Intent;
    summary?: unknown;
    customer?: Record<string, string | null | undefined>;
    appointment?: Record<string, string | null | undefined>;
    quote?: Record<string, string | number | null | undefined>;
    followUpMessage?: unknown;
  };
  if (typeof data.reply !== "string" || data.reply.trim().length === 0) return null;

  const intent: Intent =
    data.intent && VALID_INTENTS.includes(data.intent) ? data.intent : fallbackIntent;

  const decision: AgentDecision = {
    intent,
    reply: data.reply.trim(),
    summary: typeof data.summary === "string" ? data.summary : undefined,
    source: "openai",
  };

  if (data.customer && typeof data.customer === "object") {
    decision.customer = {
      name: data.customer.name ?? undefined,
      phone: data.customer.phone ?? undefined,
      email: data.customer.email ?? undefined,
      serviceInterest: data.customer.serviceInterest ?? undefined,
    };
  }

  if (data.appointment && typeof data.appointment === "object" && data.appointment.service) {
    decision.appointment = {
      service: String(data.appointment.service),
      requestedDate: String(data.appointment.requestedDate ?? ""),
      notes: data.appointment.notes ?? undefined,
    };
  }

  if (data.quote && typeof data.quote === "object" && data.quote.service) {
    const amount = Number(data.quote.amount);
    decision.quote = {
      service: String(data.quote.service),
      description: data.quote.description ? String(data.quote.description) : undefined,
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      currency: data.quote.currency ? String(data.quote.currency) : "MXN",
      notes: data.quote.notes ? String(data.quote.notes) : undefined,
    };
  }

  if (typeof data.followUpMessage === "string" && data.followUpMessage.trim()) {
    decision.followUpMessage = data.followUpMessage.trim();
  }

  return decision;
}

/**
 * Llama a OpenAI y devuelve la decisión del agente.
 * Devuelve null ante cualquier error para que el orquestador use el modo mock.
 */
export async function generateAgentDecision(
  message: string,
  context: AgentContext,
  agent: AgentDefinition,
  fallbackIntent: Intent,
): Promise<AgentDecision | null> {
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(agent, context) },
        ...context.history.slice(-8).map((entry) => ({
          role: entry.sender === "CUSTOMER" ? ("user" as const) : ("assistant" as const),
          content: entry.content,
        })),
        { role: "user", content: message },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return coerceDecision(JSON.parse(content), fallbackIntent);
  } catch (error) {
    console.error("[openai] fallo la generación, se usa el modo mock:", error);
    return null;
  }
}
