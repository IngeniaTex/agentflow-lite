import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

/** Lista las conversaciones atendidas por IA de la empresa de la sesión. */
export async function GET(request: Request) {
  try {
    const { companyId } = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") ?? undefined;

    const conversations = await prisma.conversation.findMany({
      where: { companyId, channel: channel as never },
      include: {
        customer: { select: { id: true, name: true, phone: true, status: true } },
        agent: { select: { id: true, name: true, slug: true } },
        messages: { orderBy: { createdAt: "asc" } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(serialize(conversations));
  } catch (error) {
    return apiError(error);
  }
}
