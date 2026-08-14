import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatWidget } from "@/components/chat/chat-widget";
import { Button } from "@/components/ui/button";
import { APP_NAME, publicDemoCompanyId } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: `Chat demo · ${APP_NAME}` };

/**
 * Chat público: no requiere autenticación.
 * Opera sobre la empresa demo (`publicDemoCompanyId`).
 */
export default async function ChatPage() {
  const company = await prisma.company
    .findUnique({
      where: { id: publicDemoCompanyId },
      select: { name: true },
    })
    .catch(() => null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/login">Entrar al dashboard</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat demo público</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simula la experiencia del cliente final. Cada mensaje pasa por el orquestador, que elige
          al agente adecuado y crea registros reales (prospectos, citas, cotizaciones y tareas) en
          el dashboard.
        </p>
      </div>

      <ChatWidget companyName={company?.name ?? "el negocio demo"} />

      <p className="text-xs text-muted-foreground">
        Sin <code className="rounded bg-muted px-1 py-0.5">OPENAI_API_KEY</code> el sistema responde
        con el modo mock basado en reglas; con la llave configurada, responde con OpenAI.
      </p>
    </main>
  );
}
