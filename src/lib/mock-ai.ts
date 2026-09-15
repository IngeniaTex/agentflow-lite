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
  customerPhone?: string | null;
  customerEmail?: string | null;
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
  // ("quiero agendar una consulta, ¿cuánto cuesta?" -> primero la cita).
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

function contactFromConversation(message: string, context: AgentContext) {
  const current = extractContactData(message);
  const previous = [...context.history]
    .reverse()
    .filter((turn) => turn.sender === "CUSTOMER")
    .map((turn) => extractContactData(turn.content));

  return {
    name: current.name ?? context.customerName ?? previous.find((item) => item.name)?.name,
    phone: current.phone ?? context.customerPhone ?? previous.find((item) => item.phone)?.phone,
    email: current.email ?? context.customerEmail ?? previous.find((item) => item.email)?.email,
  };
}

function missingContactPrompt(contact: ReturnType<typeof contactFromConversation>) {
  const missing = [
    !contact.name && "nombre completo",
    !contact.phone && "número de teléfono",
    !contact.email && "correo electrónico",
  ].filter(Boolean) as string[];

  if (missing.length === 0) return null;
  const fields =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} y ${missing.at(-1)}`;
  return `Antes de continuar necesito tu ${fields}. Puedes ${missing.length === 1 ? "compartirlo" : "compartirlos"} en este chat.`;
}

/** Busca el servicio mencionado dentro de la base de conocimiento. */
export function matchService(message: string, knowledge: KnowledgeItem[]) {
  const text = normalize(message);
  const ignored = new Set(["para", "como", "desde", "hasta", "sobre", "entre", "servicio"]);

  const ranked = knowledge
    .map((item) => {
      const words = normalize(`${item.title} ${item.content}`)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2 && !ignored.has(word));
      const uniqueWords = [...new Set(words)];
      const matches = uniqueWords.filter((word) => text.includes(word)).length;
      const titleMatches = normalize(item.title)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2 && text.includes(word)).length;
      return { item, score: matches + titleMatches * 2 };
    })
    .sort((a, b) => b.score - a.score);

  return (ranked[0]?.score ?? 0) >= 2 ? ranked[0].item : undefined;
}

/** Extrae el primer monto ($800, 800 MXN, 1,200) de un texto. */
export function extractAmount(text: string): number | undefined {
  const match = text.match(/\$?\s?(\d{1,3}(?:[,.]\d{3})+|\d{3,6})(?:\.\d{2})?/);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/[,.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function serviceFromConversation(context: AgentContext, message: string) {
  const current = matchService(message, context.knowledge);
  if (current) return current;

  for (const turn of [...context.history].reverse()) {
    if (turn.sender !== "CUSTOMER") continue;
    const previous = matchService(turn.content, context.knowledge);
    if (previous) return previous;
  }
  return undefined;
}

function defaultService(context: AgentContext) {
  const profile = normalize(
    `${context.company.industry ?? ""} ${context.company.description ?? ""}`,
  );
  if (/medic|salud|clinic/.test(profile)) return "Consulta de medicina general";
  if (/software|tecnolog|digital|sistemas/.test(profile)) return "Consultoría tecnológica";
  return "Servicio solicitado";
}

function knowledgeSnippet(context: AgentContext, message: string) {
  const match = serviceFromConversation(context, message);
  if (match) return match.content;
  return undefined;
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
  const contact = contactFromConversation(message, context);
  const service = serviceFromConversation(context, message);
  const serviceName = service?.title ?? defaultService(context);
  const company = context.company.name;

  const baseCustomer = {
    ...contact,
    serviceInterest: service?.title,
  };

  if (intent === "APPOINTMENT") {
    const contactPrompt = missingContactPrompt(contact);
    if (contactPrompt) {
      return {
        intent,
        source: "mock",
        reply: `${greeting(context)} Con gusto te ayudo a solicitar una cita para ${serviceName.toLowerCase()} en ${company}. ${contactPrompt}`,
        summary: `Solicitud de cita para ${serviceName}; datos de contacto pendientes.`,
        customer: baseCustomer,
      };
    }

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
      reply: `${greeting(context)} Gracias, ya tengo tu nombre, teléfono y correo. Registro tu solicitud de cita para ${serviceName.toLowerCase()} en ${company}. La dejo como *solicitada* para el ${fecha}; el equipo te confirma la disponibilidad por teléfono o correo.`,
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
    const contactPrompt = missingContactPrompt(contact);
    if (contactPrompt) {
      return {
        intent,
        source: "mock",
        reply: `${greeting(context)} Con gusto preparo una cotización preliminar de ${serviceName.toLowerCase()} en ${company}. ${contactPrompt}`,
        summary: `Cotización de ${serviceName}; datos de contacto pendientes.`,
        customer: baseCustomer,
      };
    }

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
      : `${greeting(context)} Soy la recepcionista virtual de ${company}.${hours} Puedo explicarte nuestros servicios, proceso de trabajo y tiempos estimados, además de ayudarte a agendar una llamada o preparar una cotización preliminar. ¿Qué proyecto tienes en mente?`,
    summary: "Consulta general atendida por la Recepcionista IA.",
    customer: baseCustomer,
  };
}
