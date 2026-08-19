import type { AgentDefinition, Intent } from "@/lib/agent-definitions";
import type { AgentContext } from "@/lib/mock-ai";
import type { AgentDecision } from "@/types";

/**
 * Prompt y validación compartidos por los proveedores de IA.
 *
 * Vive aparte para que Anthropic y OpenAI produzcan exactamente la misma
 * decisión: si el formato cambia, cambia una sola vez.
 */

export const VALID_INTENTS: Intent[] = [
  "GENERAL",
  "FAQ",
  "APPOINTMENT",
  "QUOTE",
  "FOLLOW_UP",
];

export function buildSystemPrompt(agent: AgentDefinition, context: AgentContext) {
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

/** Últimos turnos de la conversación en el formato user/assistant que usan ambos SDKs. */
export function buildHistoryMessages(context: AgentContext) {
  return context.history.slice(-8).map((entry) => ({
    role: entry.sender === "CUSTOMER" ? ("user" as const) : ("assistant" as const),
    content: entry.content,
  }));
}

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;

/**
 * Esquema JSON de `AgentDecision`.
 *
 * Anthropic lo aplica del lado del servidor (`output_config.format`), así que la
 * forma llega garantizada; `coerceDecision` sigue validando el contenido.
 */
export const AGENT_DECISION_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Respuesta al cliente, en español." },
    intent: { type: "string", enum: VALID_INTENTS },
    summary: nullableString,
    customer: {
      anyOf: [
        {
          type: "object",
          properties: {
            name: nullableString,
            phone: nullableString,
            email: nullableString,
            serviceInterest: nullableString,
          },
          required: ["name", "phone", "email", "serviceInterest"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
    appointment: {
      anyOf: [
        {
          type: "object",
          properties: {
            service: { type: "string" },
            requestedDate: {
              type: "string",
              description: "Fecha ISO 8601, por ejemplo 2026-08-21T10:00:00.000Z",
            },
            notes: nullableString,
          },
          required: ["service", "requestedDate", "notes"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
    quote: {
      anyOf: [
        {
          type: "object",
          properties: {
            service: { type: "string" },
            description: nullableString,
            amount: { type: "number" },
            currency: { type: "string" },
            notes: nullableString,
          },
          required: ["service", "description", "amount", "currency", "notes"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
    followUpMessage: nullableString,
  },
  required: [
    "reply",
    "intent",
    "summary",
    "customer",
    "appointment",
    "quote",
    "followUpMessage",
  ],
  additionalProperties: false,
} as const;

/**
 * Valida la respuesta del modelo y la convierte en `AgentDecision`.
 * Devuelve null si el JSON no sirve, para que el orquestador caiga al modo mock.
 */
export function coerceDecision(
  raw: unknown,
  fallbackIntent: Intent,
  source: AgentDecision["source"],
): AgentDecision | null {
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
    source,
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
