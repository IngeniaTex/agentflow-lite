import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { createQuoteSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { companyId } = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const quotes = await prisma.quote.findMany({
      where: { companyId, status: status as never },
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(serialize(quotes));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const data = createQuoteSchema.parse(await request.json());

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const quote = await prisma.quote.create({
      data: { ...data, companyId },
      include: { customer: { select: { id: true, name: true } } },
    });

    await prisma.metricEvent.create({
      data: { companyId, type: "QUOTE_CREATED", metadata: { origin: "dashboard" } },
    });

    return NextResponse.json(serialize(quote), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
