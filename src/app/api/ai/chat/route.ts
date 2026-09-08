import { NextResponse } from "next/server";

import { runOrchestrator } from "@/lib/ai-orchestrator";
import { activeProvider } from "@/lib/ai-provider";
import { apiError } from "@/lib/api";
import { checkChatRateLimit, rateLimitConfig } from "@/lib/rate-limit";
import { getApiSession } from "@/lib/require-session";
import { resolvePublicCompany } from "@/lib/tenant";
import { chatMessageSchema } from "@/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chat del cliente final (no requiere sesión).
 *
 * El tenant se resuelve así:
 *   - con sesión  -> la empresa del usuario (canal DASHBOARD)
 *   - sin sesión  -> slug de la URL, dominio de la petición o empresa por
 *                    defecto, en ese orden (ver src/lib/tenant.ts)
 */
export async function POST(request: Request) {
  try {
    const session = await getApiSession();

    // El tope solo aplica a visitantes anónimos: el equipo con sesión no se limita.
    if (!session) {
      const limit = checkChatRateLimit(request);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: limit.message, scope: limit.scope },
          {
            status: 429,
            headers: { "Retry-After": String(limit.retryAfterSeconds) },
          },
        );
      }
    }

    const body = await request.json();
    const { message, conversationId, visitor, companySlug } = chatMessageSchema.parse(body);

    let companyId: string;
    if (session) {
      companyId = session.user.companyId;
    } else {
      const company = await resolvePublicCompany({
        slug: companySlug,
        host: request.headers.get("host"),
      });
      if (!company) {
        return NextResponse.json(
          { error: "Este chat no está disponible: la empresa no existe." },
          { status: 404 },
        );
      }
      companyId = company.id;
    }

    const result = await runOrchestrator({
      companyId,
      message,
      conversationId,
      visitor,
      channel: session ? "DASHBOARD" : "WEB_CHAT",
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

/** Estado del chat: qué proveedor responde y a qué empresa atiende esta URL. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = await resolvePublicCompany({
    slug: searchParams.get("empresa"),
    host: request.headers.get("host"),
  });

  return NextResponse.json({
    ok: true,
    mode: activeProvider,
    company: company ? { id: company.id, name: company.name, slug: company.slug } : null,
    limits: {
      porIp: rateLimitConfig.perIpMax,
      ventanaMinutos: Math.round(rateLimitConfig.perIpWindowMs / 60000),
      globalDiario: rateLimitConfig.globalDailyMax,
    },
  });
}
