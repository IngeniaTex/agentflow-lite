import { AGENT_SLUGS, type AgentSlug } from "@/lib/constants";

/** Herramientas internas que un agente puede ejecutar. */
export type AgentTool =
  | "create_customer"
  | "update_customer_status"
  | "create_task"
  | "create_appointment_request"
  | "generate_quote"
  | "generate_follow_up_message"
  | "summarize_conversation"
  | "send_notification"; // preparado para el futuro

/** Intenciones detectadas por el orquestador. */
export type Intent =
  | "GENERAL"
  | "FAQ"
  | "APPOINTMENT"
  | "QUOTE"
  | "FOLLOW_UP";

export interface AgentDefinition {
  slug: AgentSlug;
  name: string;
  department: string;
  description: string;
  defaultPrompt: string;
  basePrice: number;
  /** Herramientas permitidas para este agente. */
  tools: AgentTool[];
  /** Intenciones que este agente atiende. */
  intents: Intent[];
  /** Palabras clave para la detección de intención sin LLM. */
  keywords: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    slug: AGENT_SLUGS.RECEPTIONIST,
    name: "Recepcionista IA",
    department: "Atención al cliente",
    description:
      "Atiende clientes, responde preguntas frecuentes y captura datos de prospectos.",
    defaultPrompt: `Eres la recepcionista virtual del negocio. Tu objetivo es atender a los clientes con calidez y profesionalismo, responder preguntas frecuentes con la información del negocio y capturar los datos de contacto del prospecto (nombre, teléfono, correo y servicio de interés).
Reglas:
- Responde siempre en español, breve y claro (máximo 4 oraciones).
- Si no tienes un dato exacto (precio, horario, disponibilidad), dilo con honestidad y ofrece confirmarlo con el equipo.
- Nunca inventes promociones, precios cerrados ni compromisos médicos o legales.
- Antes de crear una cita o cotización, solicita siempre nombre completo, número de teléfono y correo electrónico.`,
    basePrice: 499,
    tools: ["create_customer", "create_task", "summarize_conversation"],
    intents: ["GENERAL", "FAQ"],
    keywords: [
      "hola",
      "buenas",
      "informacion",
      "información",
      "horario",
      "horarios",
      "ubicacion",
      "ubicación",
      "direccion",
      "dirección",
      "telefono",
      "teléfono",
      "atienden",
      "abren",
      "cierran",
      "duda",
      "pregunta",
    ],
  },
  {
    slug: AGENT_SLUGS.APPOINTMENTS,
    name: "Agente de Citas",
    department: "Operaciones",
    description:
      "Crea solicitudes de cita, confirma disponibilidad y genera tareas de confirmación.",
    defaultPrompt: `Eres el agente de citas del negocio. Tu objetivo es registrar solicitudes de cita y dejar todo listo para que el equipo confirme.
Reglas:
- Responde en español, breve y claro.
- Confirma el servicio y la fecha/hora tentativa que pide el cliente.
- Aclara siempre que la cita queda como SOLICITADA hasta que el equipo confirme disponibilidad.
- Pide nombre completo, número de teléfono y correo electrónico si aún no los tienes.
- No crees la solicitud de cita hasta contar con los tres datos.
- Nunca garantices un horario específico como confirmado.`,
    basePrice: 699,
    tools: ["create_customer", "create_appointment_request", "create_task", "send_notification"],
    intents: ["APPOINTMENT"],
    keywords: [
      "cita",
      "citas",
      "agendar",
      "agenda",
      "reservar",
      "reserva",
      "apartar",
      "turno",
      "consulta",
      "disponibilidad",
      "horario disponible",
      "cuando puedo ir",
      "cuándo puedo ir",
    ],
  },
  {
    slug: AGENT_SLUGS.QUOTES,
    name: "Agente de Cotizaciones",
    department: "Ventas",
    description:
      "Genera cotizaciones simples o preliminares con base en los servicios configurados.",
    defaultPrompt: `Eres el agente de cotizaciones del negocio. Tu objetivo es generar una cotización preliminar clara con base en los servicios y precios configurados.
Reglas:
- Responde en español, breve y claro.
- Usa únicamente los precios de la base de conocimiento; si no existe el precio, da un rango estimado y márcalo como preliminar.
- Indica siempre que la cotización es preliminar y está sujeta a valoración.
- Pide nombre completo, número de teléfono y correo electrónico si aún no los tienes.
- No crees la cotización hasta contar con los tres datos.
- Invita al cliente a agendar una valoración para cerrar el precio final.`,
    basePrice: 699,
    tools: ["create_customer", "generate_quote", "update_customer_status", "create_task"],
    intents: ["QUOTE"],
    keywords: [
      "cotizacion",
      "cotización",
      "cotizar",
      "precio",
      "precios",
      "costo",
      "costos",
      "cuanto cuesta",
      "cuánto cuesta",
      "cuanto vale",
      "cuánto vale",
      "tarifa",
      "presupuesto",
      "promocion",
      "promoción",
    ],
  },
  {
    slug: AGENT_SLUGS.FOLLOW_UP,
    name: "Agente de Seguimiento",
    department: "Retención",
    description:
      "Detecta prospectos pendientes, sugiere mensajes y crea tareas de seguimiento.",
    defaultPrompt: `Eres el agente de seguimiento del negocio. Tu objetivo es retomar el contacto con prospectos pendientes y proponer el siguiente paso.
Reglas:
- Responde en español, cordial y breve, sin presionar al cliente.
- Propón un siguiente paso concreto (agendar, confirmar o cotizar).
- Genera un mensaje de seguimiento listo para enviar por WhatsApp o correo.
- Nunca inventes historial que no aparezca en el contexto.`,
    basePrice: 499,
    tools: [
      "generate_follow_up_message",
      "create_task",
      "update_customer_status",
      "send_notification",
    ],
    intents: ["FOLLOW_UP"],
    keywords: [
      "seguimiento",
      "recordatorio",
      "sigo esperando",
      "no me han contactado",
      "me quedo pendiente",
      "me quedó pendiente",
      "pendiente",
      "retomar",
      "volver a contactar",
    ],
  },
];

export function getAgentDefinition(slug: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((agent) => agent.slug === slug);
}

export function getAgentForIntent(intent: Intent): AgentDefinition {
  return (
    AGENT_DEFINITIONS.find((agent) => agent.intents.includes(intent)) ??
    AGENT_DEFINITIONS[0]
  );
}

export function agentAllows(slug: string, tool: AgentTool): boolean {
  const definition = getAgentDefinition(slug);
  return !!definition?.tools.includes(tool);
}
