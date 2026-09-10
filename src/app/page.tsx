import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Repeat,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/constants";

const AGENTS = [
  {
    icon: MessageSquare,
    name: "Recepcionista IA",
    description: "Atiende clientes, responde preguntas frecuentes y captura prospectos.",
  },
  {
    icon: CalendarCheck,
    name: "Agente de Citas",
    description: "Crea solicitudes de cita y genera tareas de confirmación.",
  },
  {
    icon: FileText,
    name: "Agente de Cotizaciones",
    description: "Genera cotizaciones preliminares con tus servicios y precios.",
  },
  {
    icon: Repeat,
    name: "Agente de Seguimiento",
    description: "Detecta prospectos pendientes y sugiere mensajes de seguimiento.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-14">
      <header className="flex items-center justify-between">
        <BrandLogo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/chat">Probar el chat</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </nav>
      </header>

      <section className="flex flex-col items-start gap-6">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          MVP 1 · Framework modular de agentes IA
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Activa agentes IA que atienden, agendan, cotizan y dan seguimiento por tu negocio.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          {APP_NAME} conecta un chat público con un orquestador de agentes especializados. Cada
          conversación se convierte en prospectos, citas, cotizaciones y tareas dentro de un
          dashboard sencillo para tu equipo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/chat">
              Probar el chat demo <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">
              <LayoutDashboard className="h-4 w-4" /> Entrar al dashboard
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((agent) => (
          <Card key={agent.name}>
            <CardHeader>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <agent.icon className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Cómo funciona</h2>
        <CardContent className="mt-4 grid gap-4 p-0 text-sm text-muted-foreground sm:grid-cols-3">
          <p>
            <strong className="text-foreground">1. El cliente escribe.</strong> El chat público
            recibe el mensaje sin necesidad de login.
          </p>
          <p>
            <strong className="text-foreground">2. El orquestador decide.</strong> Detecta la
            intención y elige al agente adecuado con sus herramientas permitidas.
          </p>
          <p>
            <strong className="text-foreground">3. Tu equipo opera.</strong> Prospectos, citas,
            cotizaciones, tareas y métricas quedan listos en el dashboard.
          </p>
        </CardContent>
      </section>

      <footer className="mt-auto border-t border-border pt-6 text-sm text-muted-foreground">
        {APP_NAME} · Template inicial para validar el MVP con PyMEs.
      </footer>
    </main>
  );
}
