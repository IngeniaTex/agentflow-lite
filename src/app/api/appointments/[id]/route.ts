import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateAppointmentSchema } from "@/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const { id } = await params;
    const data = updateAppointmentSchema.parse(await request.json());

    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const confirming = data.status === "CONFIRMED";

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        service: data.service,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
        confirmedDate: data.confirmedDate
          ? new Date(data.confirmedDate)
          : confirming
            ? (existing.confirmedDate ?? existing.requestedDate)
            : undefined,
        status: data.status,
        notes: data.notes,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    if (confirming) {
      await Promise.all([
        prisma.customer.updateMany({
          where: { id: appointment.customerId, companyId },
          data: { status: "APPOINTMENT_CONFIRMED", lastContactAt: new Date() },
        }),
        prisma.metricEvent.create({
          data: { companyId, type: "APPOINTMENT_CONFIRMED", metadata: { appointmentId: id } },
        }),
      ]);
    }

    return NextResponse.json(serialize(appointment));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const { id } = await params;

    const result = await prisma.appointment.deleteMany({ where: { id, companyId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
