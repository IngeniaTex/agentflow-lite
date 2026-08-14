/** Etiquetas en español y estilos de badge para los enums del dominio. */

export const customerStatusLabels: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  APPOINTMENT_REQUESTED: "Cita solicitada",
  APPOINTMENT_CONFIRMED: "Cita confirmada",
  QUOTE_REQUESTED: "Cotización solicitada",
  QUOTE_SENT: "Cotización enviada",
  FOLLOW_UP: "En seguimiento",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

export const customerSourceLabels: Record<string, string> = {
  WEB_CHAT: "Chat web",
  DASHBOARD: "Dashboard",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  REFERRAL: "Referido",
  OTHER: "Otro",
};

export const channelLabels: Record<string, string> = {
  WEB_CHAT: "Chat web",
  DASHBOARD: "Dashboard",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export const conversationStatusLabels: Record<string, string> = {
  OPEN: "Abierta",
  HANDLED_BY_AI: "Atendida por IA",
  NEEDS_HUMAN: "Requiere humano",
  CLOSED: "Cerrada",
};

export const appointmentStatusLabels: Record<string, string> = {
  REQUESTED: "Solicitada",
  CONFIRMED: "Confirmada",
  RESCHEDULED: "Reagendada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

export const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  NEEDS_ADJUSTMENT: "Requiere ajuste",
};

export const taskStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

export const taskPriorityLabels: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const messageSenderLabels: Record<string, string> = {
  CUSTOMER: "Cliente",
  AGENT: "Agente IA",
  SYSTEM: "Sistema",
  USER: "Equipo",
};

export const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Lectura",
};

export const knowledgeTypeLabels: Record<string, string> = {
  FAQ: "Pregunta frecuente",
  SERVICE: "Servicio",
  POLICY: "Política",
  PRICING: "Precios",
  DOCUMENT: "Documento",
  OTHER: "Otro",
};

export const metricEventLabels: Record<string, string> = {
  CONVERSATION_STARTED: "Conversaciones iniciadas",
  MESSAGE_RECEIVED: "Mensajes recibidos",
  AI_RESPONSE: "Respuestas IA",
  LEAD_CREATED: "Prospectos creados",
  APPOINTMENT_REQUESTED: "Citas solicitadas",
  APPOINTMENT_CONFIRMED: "Citas confirmadas",
  QUOTE_CREATED: "Cotizaciones creadas",
  QUOTE_SENT: "Cotizaciones enviadas",
  TASK_CREATED: "Tareas creadas",
  TASK_COMPLETED: "Tareas completadas",
  FOLLOW_UP_CREATED: "Seguimientos creados",
};

/** Color de badge por estado (clases Tailwind). */
export const statusTone: Record<string, string> = {
  // Clientes
  NEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CONTACTED: "bg-slate-50 text-slate-700 ring-slate-600/20",
  APPOINTMENT_REQUESTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPOINTMENT_CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  QUOTE_REQUESTED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  QUOTE_SENT: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  FOLLOW_UP: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CONVERTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  LOST: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Citas / cotizaciones / tareas
  REQUESTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  RESCHEDULED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DRAFT: "bg-slate-50 text-slate-700 ring-slate-600/20",
  SENT: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  NEEDS_ADJUSTMENT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-600/20",
  OVERDUE: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Conversaciones
  OPEN: "bg-sky-50 text-sky-700 ring-sky-600/20",
  HANDLED_BY_AI: "bg-violet-50 text-violet-700 ring-violet-600/20",
  NEEDS_HUMAN: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-slate-50 text-slate-700 ring-slate-600/20",
  // Prioridades
  LOW: "bg-slate-50 text-slate-700 ring-slate-600/20",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-600/20",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
  URGENT: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Roles / genéricos
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-600/20",
  OPERATOR: "bg-sky-50 text-sky-700 ring-sky-600/20",
  VIEWER: "bg-slate-50 text-slate-700 ring-slate-600/20",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  INACTIVE: "bg-slate-50 text-slate-700 ring-slate-600/20",
  BETA: "bg-violet-50 text-violet-700 ring-violet-600/20",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ARCHIVED: "bg-slate-50 text-slate-700 ring-slate-600/20",
};

export function toneFor(status: string) {
  return statusTone[status] ?? "bg-slate-50 text-slate-700 ring-slate-600/20";
}
