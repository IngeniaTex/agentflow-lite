import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateTaskSchema } from "@/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const { id } = await params;
    const data = updateTaskSchema.parse(await request.json());

    const existing = await prisma.task.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        customerId: data.customerId === null ? null : data.customerId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority,
        status: data.status,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await prisma.metricEvent.create({
        data: { companyId, type: "TASK_COMPLETED", metadata: { taskId: id } },
      });
    }

    return NextResponse.json(serialize(task));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const { id } = await params;

    const result = await prisma.task.deleteMany({ where: { id, companyId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
