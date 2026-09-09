import { publicDemoCompanyId } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Resolución de empresa para el chat público (sin sesión).
 *
 * Orden de prioridad:
 *   1. Slug explícito en la URL  -> /chat/<slug>
 *   2. Dominio de la petición    -> Company.chatDomain
 *   3. Empresa por defecto       -> NEXT_PUBLIC_DEMO_COMPANY_ID
 *
 * El paso 3 mantiene vivo el /chat de siempre. Las rutas del dashboard NO usan
 * esto: ahí el tenant sale del JWT (`src/lib/require-session.ts`).
 */

export interface PublicCompany {
  id: string;
  name: string;
  slug: string;
}

const SELECT = { id: true, name: true, slug: true } as const;

/** Formato de slug aceptado: minúsculas, números y guiones simples. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Convierte un nombre en slug: "Clínica Dental" -> "clinica-dental". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Normaliza el Host de la petición: quita puerto y `www.`.
 * "WWW.Bella.MX:3000" -> "bella.mx"
 */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const clean = host.trim().toLowerCase().split(",")[0]!.split(":")[0]!.replace(/^www\./, "");
  return clean.length > 0 ? clean : null;
}

/** Empresa del chat público. Devuelve null si no existe ninguna coincidencia. */
export async function resolvePublicCompany(options: {
  slug?: string | null;
  host?: string | null;
}): Promise<PublicCompany | null> {
  const slug = options.slug?.trim().toLowerCase();

  // 1. Slug explícito: si viene y no existe, es un 404, no un fallback silencioso.
  if (slug) {
    if (!SLUG_PATTERN.test(slug)) return null;
    return prisma.company.findUnique({ where: { slug }, select: SELECT });
  }

  // 2. Dominio propio.
  const host = normalizeHost(options.host);
  if (host) {
    const byDomain = await prisma.company.findUnique({
      where: { chatDomain: host },
      select: SELECT,
    });
    if (byDomain) return byDomain;
  }

  // 3. Empresa por defecto del despliegue.
  return prisma.company.findUnique({ where: { id: publicDemoCompanyId }, select: SELECT });
}
