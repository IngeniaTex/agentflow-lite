"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Loader2, Wrench, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

export interface AgentCardData {
  id: string;
  name: string;
  slug: string;
  department: string;
  description: string;
  defaultPrompt: string;
  basePrice: number;
  isActive: boolean;
  customPrompt: string | null;
  monthlyLimit: number | null;
  conversations: number;
  tools: string[];
}

const TOOL_LABELS: Record<string, string> = {
  create_customer: "Crear cliente",
  update_customer_status: "Actualizar estado del cliente",
  create_task: "Crear tarea",
  create_appointment_request: "Crear solicitud de cita",
  generate_quote: "Generar cotización",
  generate_follow_up_message: "Generar mensaje de seguimiento",
  summarize_conversation: "Resumir conversación",
  send_notification: "Enviar notificación (futuro)",
};

export function AgentsGrid({ agents, canManage }: { agents: AgentCardData[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function patchAgent(agentId: string, body: Record<string, unknown>) {
    setSaving(agentId);
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, ...body }),
    });
    setSaving(null);
    setEditing(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {agents.map((agent) => (
        <Card key={agent.id} className={isPending ? "opacity-70" : undefined}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <CardDescription>{agent.department}</CardDescription>
                </div>
              </div>
              <Badge status={agent.isActive ? "ACTIVE" : "INACTIVE"}>
                {agent.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{agent.description}</p>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1">
                Desde {formatCurrency(agent.basePrice)}/mes
              </span>
              <span className="rounded-md bg-muted px-2 py-1">
                {agent.conversations} conversaciones
              </span>
              {agent.monthlyLimit ? (
                <span className="rounded-md bg-muted px-2 py-1">
                  Límite {agent.monthlyLimit}/mes
                </span>
              ) : null}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Wrench className="h-3 w-3" /> Herramientas permitidas
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <li
                    key={tool}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {TOOL_LABELS[tool] ?? tool}
                  </li>
                ))}
              </ul>
            </div>

            {editing === agent.id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  patchAgent(agent.id, {
                    customPrompt: String(formData.get("customPrompt") ?? ""),
                    isActive: agent.isActive,
                  });
                }}
                className="space-y-2"
              >
                <Textarea
                  name="customPrompt"
                  defaultValue={agent.customPrompt ?? agent.defaultPrompt}
                  className="min-h-32 text-xs"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving === agent.id}>
                    {saving === agent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Guardar prompt
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <details className="rounded-lg border border-border bg-muted/40 p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Ver prompt {agent.customPrompt ? "personalizado" : "por defecto"}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {agent.customPrompt ?? agent.defaultPrompt}
                </p>
              </details>
            )}

            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={agent.isActive ? "outline" : "default"}
                  disabled={saving === agent.id}
                  onClick={() => patchAgent(agent.id, { isActive: !agent.isActive })}
                >
                  {saving === agent.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {agent.isActive ? "Desactivar" : "Activar"}
                </Button>
                {editing !== agent.id && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(agent.id)}>
                    Editar prompt
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
