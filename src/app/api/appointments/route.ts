import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { createAppointmentSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { companyId } = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const appointments = await prisma.appointment.findMany({
      where: { companyId, status: status as never },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { requestedDate: "asc" },
      take: 200,
    });

    return NextResponse.json(serialize(appointments));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const data = createAppointmentSchema.parse(await request.json());

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        customerId: data.customerId,
        service: data.service,
        requestedDate: new Date(data.requestedDate),
        confirmedDate: data.confirmedDate ? new Date(data.confirmedDate) : undefined,
        status: data.status,
        notes: data.notes,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    await prisma.metricEvent.create({
      data: { companyId, type: "APPOINTMENT_REQUESTED", metadata: { origin: "dashboard" } },
    });

    return NextResponse.json(serialize(appointment), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
