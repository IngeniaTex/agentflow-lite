import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateCustomerSchema } from "@/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        appointments: { orderBy: { requestedDate: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { createdAt: "desc" } },
        conversations: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(serialize(customer));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const { id } = await params;
    const data = updateCustomerSchema.parse(await request.json());

    const result = await prisma.customer.updateMany({
      where: { id, companyId },
      data: { ...data, lastContactAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    return NextResponse.json(serialize(customer));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const { id } = await params;

    const result = await prisma.customer.deleteMany({ where: { id, companyId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
