import { NextResponse } from "next/server";

import { apiError, serialize } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-session";
import { createKnowledgeSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { companyId } = await requireApiSession();
    const items = await prisma.knowledgeSource.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(serialize(items));
  } catch (error) {
    return apiError(error);
  }
}

/** Alta de contenido en la base de conocimiento: solo ADMIN. */
export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const data = createKnowledgeSchema.parse(await request.json());

    const item = await prisma.knowledgeSource.create({ data: { ...data, companyId } });
    return NextResponse.json(serialize(item), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    const result = await prisma.knowledgeSource.deleteMany({ where: { id, companyId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
