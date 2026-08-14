import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { createTaskSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { companyId } = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const tasks = await prisma.task.findMany({
      where: { companyId, status: status as never },
      include: {
        customer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 200,
    });

    return NextResponse.json(serialize(tasks));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const data = createTaskSchema.parse(await request.json());

    const task = await prisma.task.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        customerId: data.customerId || undefined,
        agentId: data.agentId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority,
        status: data.status,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    await prisma.metricEvent.create({
      data: { companyId, type: "TASK_CREATED", metadata: { origin: "dashboard" } },
    });

    return NextResponse.json(serialize(task), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
