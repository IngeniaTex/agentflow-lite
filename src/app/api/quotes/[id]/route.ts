import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateQuoteSchema } from "@/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const { id } = await params;
    const data = updateQuoteSchema.parse(await request.json());

    const existing = await prisma.quote.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const quote = await prisma.quote.update({
      where: { id },
      data,
      include: { customer: { select: { id: true, name: true } } },
    });

    if (data.status === "SENT") {
      await Promise.all([
        prisma.customer.updateMany({
          where: { id: quote.customerId, companyId },
          data: { status: "QUOTE_SENT", lastContactAt: new Date() },
        }),
        prisma.metricEvent.create({
          data: { companyId, type: "QUOTE_SENT", metadata: { quoteId: id } },
        }),
      ]);
    }

    if (data.status === "APPROVED") {
      await prisma.customer.updateMany({
        where: { id: quote.customerId, companyId },
        data: { status: "CONVERTED", lastContactAt: new Date() },
      });
    }

    return NextResponse.json(serialize(quote));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const { id } = await params;

    const result = await prisma.quote.deleteMany({ where: { id, companyId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
