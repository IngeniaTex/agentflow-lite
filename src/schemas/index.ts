import { z } from "zod";

export * from "./auth";

// ---------------------------------------------------------------- Enums Zod
export const customerStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "APPOINTMENT_REQUESTED",
  "APPOINTMENT_CONFIRMED",
  "QUOTE_REQUESTED",
  "QUOTE_SENT",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
]);

export const customerSourceSchema = z.enum([
  "WEB_CHAT",
  "DASHBOARD",
  "WHATSAPP",
  "EMAIL",
  "REFERRAL",
  "OTHER",
]);

export const appointmentStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
]);

export const quoteStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "NEEDS_ADJUSTMENT",
]);

export const taskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "OVERDUE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), {
    message: "Fecha inválida",
  });

// ------------------------------------------------------------------ Cliente
export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  phone: optionalText,
  email: z
    .union([z.string().email("Correo inválido"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  serviceInterest: optionalText,
  source: customerSourceSchema.default("DASHBOARD"),
  status: customerStatusSchema.default("NEW"),
  notes: optionalText,
  nextActionAt: optionalDate,
});

export const updateCustomerSchema = createCustomerSchema.partial();

// --------------------------------------------------------------------- Cita
export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  service: z.string().trim().min(2, "El servicio es obligatorio").max(160),
  requestedDate: z.string().min(1, "La fecha solicitada es obligatoria"),
  confirmedDate: z.string().optional().nullable(),
  status: appointmentStatusSchema.default("REQUESTED"),
  notes: optionalText,
});

export const updateAppointmentSchema = z.object({
  service: z.string().trim().min(2).max(160).optional(),
  requestedDate: z.string().optional(),
  confirmedDate: z.string().optional().nullable(),
  status: appointmentStatusSchema.optional(),
  notes: optionalText,
});

// -------------------------------------------------------------- Cotización
export const createQuoteSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  service: z.string().trim().min(2, "El servicio es obligatorio").max(160),
  description: optionalText,
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().trim().length(3).default("MXN"),
  status: quoteStatusSchema.default("DRAFT"),
  notes: optionalText,
});

export const updateQuoteSchema = z.object({
  service: z.string().trim().min(2).max(160).optional(),
  description: optionalText,
  amount: z.coerce.number().positive().optional(),
  currency: z.string().trim().length(3).optional(),
  status: quoteStatusSchema.optional(),
  notes: optionalText,
});

// ------------------------------------------------------------------- Tarea
export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(160),
  description: optionalText,
  customerId: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: taskPrioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("PENDING"),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: optionalText,
  customerId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
});

// ------------------------------------------------------------------ Empresa
export const updateCompanySchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  industry: optionalText,
  description: optionalText,
  phone: optionalText,
  email: z
    .union([z.string().email("Correo inválido"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  website: optionalText,
  address: optionalText,
  businessHours: optionalText,
  tone: optionalText,
});

// ------------------------------------------------------- Agentes por empresa
export const toggleCompanyAgentSchema = z.object({
  agentId: z.string().min(1),
  isActive: z.boolean(),
});

export const updateCompanyAgentSchema = z.object({
  agentId: z.string().min(1),
  customPrompt: optionalText,
  monthlyLimit: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// --------------------------------------------------------- Conocimiento
export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(["FAQ", "SERVICE", "POLICY", "PRICING", "DOCUMENT", "OTHER"]).default("FAQ"),
  content: z.string().trim().min(5).max(5000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});

// --------------------------------------------------------------------- Chat
export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Escribe un mensaje").max(1000),
  conversationId: z.string().optional().nullable(),
  visitor: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
