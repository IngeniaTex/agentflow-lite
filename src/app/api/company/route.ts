import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { updateCompanySchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { companyId } = await requireApiSession();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { knowledgeSources: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json(serialize(company));
  } catch (error) {
    return apiError(error);
  }
}

/** Editar la configuración del negocio: solo ADMIN. */
export async function PATCH(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const data = updateCompanySchema.parse(await request.json());

    const company = await prisma.company.update({ where: { id: companyId }, data });
    return NextResponse.json(serialize(company));
  } catch (error) {
    // `slug` y `chatDomain` son únicos entre todas las empresas: sin esto, que
    // otra ya use el mismo valor saldría como un 500 genérico.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "";
      const field = target.includes("chatDomain") ? "dominio" : "identificador de chat";
      return NextResponse.json(
        { error: `Ese ${field} ya lo usa otra empresa. Elige otro.` },
        { status: 409 },
      );
    }
    return apiError(error);
  }
}
