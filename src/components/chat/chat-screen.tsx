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
        {/* Sin botón al dashboard: esta pantalla la ven los clientes finales. */}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pregúntanos por nuestros servicios, precios u horarios, agenda una cita o pide una
          cotización. Te respondemos al momento.
        </p>
      </div>

      <ChatWidget companyName={company.name} companySlug={company.slug} />
    </main>
  );
}
