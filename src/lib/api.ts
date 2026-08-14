import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiAuthError } from "@/lib/require-session";

/** Respuesta uniforme de error para los route handlers. */
export function apiError(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        issues: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  console.error("[api] error inesperado:", error);
  const message = error instanceof Error ? error.message : "Error interno del servidor";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Convierte los Decimal de Prisma en números serializables. */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "object" && value !== null && "toNumber" in value
        ? Number(value.toString())
        : value,
    ),
  );
}
