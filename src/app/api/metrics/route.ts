import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { getAiRecommendations, getMetricsPayload } from "@/lib/metrics";
import { requireApiSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

/** Métricas básicas de la empresa de la sesión. */
export async function GET() {
  try {
    const { companyId } = await requireApiSession();

    const [payload, recommendations] = await Promise.all([
      getMetricsPayload(companyId),
      getAiRecommendations(companyId),
    ]);

    return NextResponse.json(serialize({ ...payload, recommendations }));
  } catch (error) {
    return apiError(error);
  }
}
