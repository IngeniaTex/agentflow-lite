import type { Intent } from "@/lib/agent-definitions";

/** Datos de contacto detectados en la conversación. */
export interface DetectedCustomer {
  name?: string;
  phone?: string;
  email?: string;
  serviceInterest?: string;
}

export interface DetectedAppointment {
  service: string;
  /** Fecha ISO solicitada por el cliente. */
  requestedDate: string;
  notes?: string;
}

export interface DetectedQuote {
  service: string;
  description?: string;
  amount: number;
  currency?: string;
  notes?: string;
}

/**
 * Resultado del "razonamiento" del agente: la respuesta al cliente más los
 * datos estructurados que el orquestador convierte en registros.
 */
export interface AgentDecision {
  intent: Intent;
  reply: string;
  summary?: string;
  customer?: DetectedCustomer;
  appointment?: DetectedAppointment;
  quote?: DetectedQuote;
  followUpMessage?: string;
  source: "anthropic" | "openai" | "mock";
}

/** Acción ejecutada por una herramienta interna (se devuelve al cliente del chat). */
export interface ExecutedAction {
  tool: string;
  label: string;
  recordId?: string;
}

export interface ChatTurnResult {
  conversationId: string;
  reply: string;
  agent: { slug: string; name: string };
  intent: Intent;
  actions: ExecutedAction[];
  source: "anthropic" | "openai" | "mock";
}

export interface DashboardSummary {
  newLeads: number;
  appointmentsRequested: number;
  quotesGenerated: number;
  pendingTasks: number;
  customersInFollowUp: number;
  aiConversations: number;
}
