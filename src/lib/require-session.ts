import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";

/**
 * Helpers de sesión para rutas protegidas.
 *
 * Reemplazan al antiguo modo demo fijo (`demoUserId` / `demoCompanyId`):
 * todo dato del dashboard se filtra por el `companyId` de la sesión.
 */

/** Sesión obligatoria en páginas del dashboard. Redirige a /login si no existe. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/login");
  }
  return session;
}

/** companyId de la sesión activa (rutas protegidas). */
export async function getCurrentCompanyId(): Promise<string> {
  const session = await requireSession();
  return session.user.companyId;
}

/** Usuario de la sesión activa. */
export async function getCurrentUser() {
  const session = await requireSession();
  return session.user;
}

/** Verifica rol sin lanzar redirección (para ocultar/mostrar acciones en UI). */
export function hasRole(role: UserRole | undefined, allowed: UserRole[]) {
  return !!role && allowed.includes(role);
}

export function isAdmin(role: UserRole | undefined) {
  return role === "ADMIN";
}

/** Variante para route handlers: devuelve null en vez de redirigir. */
export async function getApiSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  return session;
}

/** Error tipado para respuestas 401/403 en las API. */
export class ApiAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

/**
 * Exige sesión en un route handler y devuelve { userId, companyId, role }.
 * Lanza ApiAuthError si no hay sesión o el rol no está permitido.
 */
export async function requireApiSession(allowedRoles?: UserRole[]) {
  const session = await getApiSession();
  if (!session) {
    throw new ApiAuthError("No autenticado", 401);
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new ApiAuthError("No autorizado para esta acción", 403);
  }
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
    name: session.user.name ?? "",
  };
}
