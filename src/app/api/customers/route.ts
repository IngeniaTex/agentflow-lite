import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { createCustomerSchema } from "@/schemas";

export const dynamic = "force-dynamic";

/** Lista los prospectos de la empresa de la sesión. */
export async function GET(request: Request) {
  try {
    const { companyId } = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("q")?.trim();

    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        status: status as never,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json(serialize(customers));
  } catch (error) {
    return apiError(error);
  }
}

/** Crea un prospecto desde el dashboard. */
export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const data = createCustomerSchema.parse(await request.json());

    const customer = await prisma.customer.create({
      data: { ...data, companyId, lastContactAt: new Date() },
    });

    await prisma.metricEvent.create({
      data: { companyId, type: "LEAD_CREATED", metadata: { origin: "dashboard" } },
    });

    return NextResponse.json(serialize(customer), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
