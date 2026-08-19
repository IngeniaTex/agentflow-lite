import { NextResponse } from "next/server";

import { runOrchestrator } from "@/lib/ai-orchestrator";
import { activeProvider } from "@/lib/ai-provider";
import { apiError } from "@/lib/api";
import { publicDemoCompanyId } from "@/lib/constants";
import { checkChatRateLimit, rateLimitConfig } from "@/lib/rate-limit";
import { getApiSession } from "@/lib/require-session";
import { chatMessageSchema } from "@/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chat público del cliente final (no requiere sesión).
 *
 * Si hay sesión activa usa el companyId de la sesión; si no, opera sobre la
 * empresa demo (`publicDemoCompanyId`) hasta que exista multi-tenant por dominio.
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
    const { message, conversationId, visitor } = chatMessageSchema.parse(body);

    const companyId = session?.user.companyId ?? publicDemoCompanyId;

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

/** Estado del chat: útil para saber qué proveedor responde (o si es el modo mock). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: activeProvider,
    companyId: publicDemoCompanyId,
    limits: {
      porIp: rateLimitConfig.perIpMax,
      ventanaMinutos: Math.round(rateLimitConfig.perIpWindowMs / 60000),
      globalDiario: rateLimitConfig.globalDailyMax,
    },
  });
}
