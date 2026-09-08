import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatWidget } from "@/components/chat/chat-widget";
import { Button } from "@/components/ui/button";
import type { PublicCompany } from "@/lib/tenant";

/**
 * Pantalla del chat público, compartida por /chat y /chat/<slug>.
 * La empresa ya viene resuelta por la página que la renderiza.
 */
export function ChatScreen({ company }: { company: PublicCompany }) {
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
        <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribe como lo haría un cliente. Cada mensaje pasa por el orquestador, que elige al
          agente adecuado y crea registros reales (prospectos, citas, cotizaciones y tareas) en el
          dashboard de {company.name}.
        </p>
      </div>

      <ChatWidget companyName={company.name} companySlug={company.slug} />

      <p className="text-xs text-muted-foreground">
        La etiqueta del encabezado indica qué motor responde: Claude, OpenAI o el modo mock basado
        en reglas cuando no hay ninguna llave configurada.
      </p>
    </main>
  );
}
