import { AGENT_DEFINITIONS, type AgentDefinition, type Intent } from "@/lib/agent-definitions";
import { parseSpanishDate } from "@/lib/date-parsing";
import type { AgentDecision } from "@/types";

export interface KnowledgeItem {
  title: string;
  type: string;
  content: string;
}

export interface AgentContext {
  company: {
    name: string;
    industry?: string | null;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    businessHours?: string | null;
    tone?: string | null;
  };
  knowledge: KnowledgeItem[];
  history: { sender: string; content: string }[];
  customerName?: string | null;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Detección de intención por palabras clave (sin LLM). */
export function detectIntent(message: string): Intent {
  const text = normalize(message);

  const score = (agent: AgentDefinition) =>
    agent.keywords.reduce(
      (total, keyword) => (text.includes(normalize(keyword)) ? total + 1 : total),
      0,
    );

  const ranked = AGENT_DEFINITIONS.map((agent) => ({ agent, score: score(agent) })).sort(
    (a, b) => b.score - a.score,
  );

  // Una intención de cita gana sobre una de precio cuando ambas aparecen
  // ("quiero agendar una limpieza, ¿cuánto cuesta?" -> primero la cita).
  const appointment = ranked.find((r) => r.agent.intents.includes("APPOINTMENT"));
  const quote = ranked.find((r) => r.agent.intents.includes("QUOTE"));
  if (appointment && appointment.score > 0 && quote && appointment.score >= quote.score) {
    return "APPOINTMENT";
  }

  const best = ranked[0];
  if (!best || best.score === 0) return "GENERAL";
  return best.agent.intents[0];
}

export function extractContactData(message: string) {
  const email = message.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const phone = message.match(/(?:\+?\d[\s-]?){8,14}\d/)?.[0]?.trim();
  const name = message.match(
    /\b(?:me llamo|mi nombre es|soy)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+)?)/i,
  )?.[1];

  return {
    email,
    phone,
    name: name ? name.replace(/\s+/g, " ").trim() : undefined,
  };
}

/** Busca el servicio mencionado dentro de la base de conocimiento. */
export function matchService(message: string, knowledge: KnowledgeItem[]) {
  const text = normalize(message);

  for (const item of knowledge) {
    const title = normalize(item.title);
    const words = title.split(/\s+/).filter((word) => word.length > 3);
    const matches = words.filter((word) => text.includes(word)).length;
    if (words.length > 0 && matches >= Math.min(2, words.length)) {
      return item;
    }
  }
  return undefined;
}

/** Extrae el primer monto ($800, 800 MXN, 1,200) de un texto. */
export function extractAmount(text: string): number | undefined {
  const match = text.match(/\$?\s?(\d{1,3}(?:[,.]\d{3})+|\d{3,6})(?:\.\d{2})?/);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/[,.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function knowledgeSnippet(context: AgentContext, message: string) {
  const match = matchService(message, context.knowledge);
  if (match) return match.content;
  const faq = context.knowledge.find((item) => item.type === "FAQ");
  return faq?.content;
}

function greeting(context: AgentContext) {
  return context.customerName ? `Hola ${context.customerName}` : "¡Hola!";
}

/**
 * Genera la respuesta y los datos estructurados sin llamar a OpenAI.
 * Se usa cuando `OPENAI_API_KEY` está vacío o cuando la llamada falla.
 */
export function buildMockDecision(
  message: string,
  context: AgentContext,
  intent: Intent = detectIntent(message),
): AgentDecision {
  const contact = extractContactData(message);
  const service = matchService(message, context.knowledge);
  const serviceName = service?.title ?? "Servicio general";
  const company = context.company.name;

  const baseCustomer = {
    ...contact,
    serviceInterest: service?.title,
  };

  if (intent === "APPOINTMENT") {
    const requestedDate = parseSpanishDate(message);
    const fecha = requestedDate.toLocaleString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      intent,
      source: "mock",
      reply: `${greeting(context)} Con gusto registro tu solicitud de cita para ${serviceName.toLowerCase()} en ${company}. La dejo como *solicitada* para el ${fecha}; el equipo te confirma la disponibilidad por teléfono o WhatsApp. ¿Me compartes tu nombre y número de contacto para la confirmación?`,
      summary: `Solicitud de cita para ${serviceName}.`,
      customer: baseCustomer,
      appointment: {
        service: serviceName,
        requestedDate: requestedDate.toISOString(),
        notes: `Solicitada desde el chat web: "${message.slice(0, 180)}"`,
      },
    };
  }

  if (intent === "QUOTE") {
    const amount =
      (service ? extractAmount(service.content) : undefined) ??
      extractAmount(message) ??
      800;

    return {
      intent,
      source: "mock",
      reply: `${greeting(context)} Te comparto una cotización preliminar de ${serviceName.toLowerCase()} en ${company}: aproximadamente $${amount.toLocaleString("es-MX")} MXN. Es un estimado sujeto a valoración; si quieres, agendamos una valoración sin costo para confirmar el precio final.`,
      summary: `Cotización preliminar de ${serviceName} por $${amount}.`,
      customer: baseCustomer,
      quote: {
        service: serviceName,
        description: `Cotización preliminar generada por el Agente de Cotizaciones a partir del chat.`,
        amount,
        currency: "MXN",
        notes: knowledgeSnippet(context, message)?.slice(0, 240),
      },
    };
  }

  if (intent === "FOLLOW_UP") {
    const followUpMessage = `Hola${context.customerName ? ` ${context.customerName}` : ""}, te escribimos de ${company} para dar seguimiento a tu interés en ${serviceName.toLowerCase()}. ¿Te ayudamos a agendar esta semana?`;
    return {
      intent,
      source: "mock",
      reply: `${greeting(context)} Ya registré tu seguimiento en ${company}. Un miembro del equipo te contactará muy pronto para retomar el tema de ${serviceName.toLowerCase()}.`,
      summary: `Seguimiento solicitado sobre ${serviceName}.`,
      customer: baseCustomer,
      followUpMessage,
    };
  }

  const snippet = knowledgeSnippet(context, message);
  const hours = context.company.businessHours
    ? ` Nuestro horario es ${context.company.businessHours}.`
    : "";

  return {
    intent: snippet ? "FAQ" : "GENERAL",
    source: "mock",
    reply: snippet
      ? `${greeting(context)} ${snippet}${hours} ¿Te gustaría agendar una cita o recibir una cotización?`
      : `${greeting(context)} Soy la recepcionista virtual de ${company}.${hours} Puedo ayudarte a agendar una cita, darte una cotización preliminar o resolver tus dudas. ¿Qué necesitas?`,
    summary: "Consulta general atendida por la Recepcionista IA.",
    customer: baseCustomer,
  };
}
