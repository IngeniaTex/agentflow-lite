import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateCompanyAgentSchema } from "@/schemas";

export const dynamic = "force-dynamic";

/** Catálogo global de agentes + estado de activación para la empresa. */
export async function GET() {
  try {
    const { companyId } = await requireApiSession();

    const agents = await prisma.agent.findMany({
      where: { status: { not: "INACTIVE" } },
      orderBy: { createdAt: "asc" },
      include: {
        companyAgents: { where: { companyId } },
        _count: { select: { conversations: true } },
      },
    });

    return NextResponse.json(
      serialize(
        agents.map((agent) => ({
          ...agent,
          companyAgent: agent.companyAgents[0] ?? null,
          isActive: agent.companyAgents[0]?.isActive ?? false,
        })),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}

/** Activa/desactiva o configura un agente para la empresa. Solo ADMIN. */
export async function PATCH(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const data = updateCompanyAgentSchema.parse(await request.json());

    const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    const companyAgent = await prisma.companyAgent.upsert({
      where: { companyId_agentId: { companyId, agentId: data.agentId } },
      update: {
        customPrompt: data.customPrompt,
        monthlyLimit: data.monthlyLimit,
        isActive: data.isActive ?? true,
      },
      create: {
        companyId,
        agentId: data.agentId,
        customPrompt: data.customPrompt,
        monthlyLimit: data.monthlyLimit ?? 1000,
        isActive: data.isActive ?? true,
      },
      include: { agent: true },
    });

    return NextResponse.json(serialize(companyAgent));
  } catch (error) {
    return apiError(error);
  }
}
