/**
 * Límite de uso para la ruta pública del chat.
 *
 * `/api/ai/chat` no requiere sesión, así que sin un tope cualquiera podría
 * disparar el consumo de OpenAI. Se aplican dos capas:
 *
 *   1. Por IP    — evita que un visitante monopolice el demo.
 *   2. Global    — techo diario que protege la factura del proyecto completo.
 *
 * Implementación en memoria del proceso: suficiente para un demo y sin
 * dependencias externas. En serverless cada instancia lleva su propio contador
 * y se reinicia en un cold start, así que es un tope aproximado, no una cuota
 * exacta. Para límites estrictos, sustituir por Upstash Redis en la Fase 2.
 */

const PER_IP_MAX = Number(process.env.CHAT_RATE_LIMIT_PER_IP ?? 10);
const PER_IP_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000);
const GLOBAL_MAX_PER_DAY = Number(process.env.CHAT_RATE_LIMIT_GLOBAL_DAILY ?? 300);

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Evita que el Map crezca sin control con IPs que ya expiraron. */
function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function hit(key: string, max: number, windowMs: number, now: number) {
  // max = 0 apaga la ruta por completo (útil para congelar el demo sin redeploy).
  if (max <= 0) return { allowed: false, remaining: 0, resetAt: now + windowMs };

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}

/** Obtiene la IP del visitante detrás del proxy de Vercel. */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}

export interface RateLimitResult {
  allowed: boolean;
  scope: "ip" | "global" | null;
  retryAfterSeconds: number;
  message?: string;
}

/** Aplica ambas capas. Devuelve `allowed: false` con el motivo si se excede. */
export function checkChatRateLimit(request: Request): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const global = hit("global", GLOBAL_MAX_PER_DAY, 24 * 60 * 60 * 1000, now);
  if (!global.allowed) {
    return {
      allowed: false,
      scope: "global",
      retryAfterSeconds: Math.max(1, Math.ceil((global.resetAt - now) / 1000)),
      message:
        "El demo alcanzó su límite de mensajes por hoy. Vuelve mañana o escríbenos para una demostración en vivo.",
    };
  }

  const perIp = hit(`ip:${clientIp(request)}`, PER_IP_MAX, PER_IP_WINDOW_MS, now);
  if (!perIp.allowed) {
    const minutes = Math.max(1, Math.ceil((perIp.resetAt - now) / 60000));
    return {
      allowed: false,
      scope: "ip",
      retryAfterSeconds: Math.max(1, Math.ceil((perIp.resetAt - now) / 1000)),
      message:
        PER_IP_MAX <= 0
          ? "El chat del demo está pausado por ahora. Escríbenos para una demostración en vivo."
          : `Alcanzaste el límite de ${PER_IP_MAX} mensajes del demo. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`,
    };
  }

  return { allowed: true, scope: null, retryAfterSeconds: 0 };
}

export const rateLimitConfig = {
  perIpMax: PER_IP_MAX,
  perIpWindowMs: PER_IP_WINDOW_MS,
  globalDailyMax: GLOBAL_MAX_PER_DAY,
};
