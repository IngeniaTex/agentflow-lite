/**
 * Constantes globales de Aiwork.
 *
 * El modo demo fijo (demoCompanyId / demoUserId) fue reemplazado por la sesión:
 * - Rutas protegidas del dashboard -> `getCurrentCompanyId()` (src/lib/require-session.ts)
 * - Rutas públicas del chat        -> `publicDemoCompanyId`
 * - Seed                           -> `demoCompanyId`
 */

/** Empresa inicial creada por el seed. */
export const demoCompanyId =
  process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "demo-company-001";

/** Empresa usada por el chat público mientras no exista multi-tenant por dominio. */
export const publicDemoCompanyId = demoCompanyId;

/** Slug fijo de la empresa demo para el chat público. */
export const publicDemoCompanySlug = "clinica-medica-horizonte";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Aiwork";

/** Slugs del catálogo base de agentes. */
export const AGENT_SLUGS = {
  RECEPTIONIST: "recepcionista-ia",
  APPOINTMENTS: "agente-de-citas",
  QUOTES: "agente-de-cotizaciones",
  FOLLOW_UP: "agente-de-seguimiento",
} as const;

export type AgentSlug = (typeof AGENT_SLUGS)[keyof typeof AGENT_SLUGS];
