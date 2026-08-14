"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { knowledgeTypeLabels } from "@/lib/labels";

export interface CompanyData {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  businessHours: string | null;
  tone: string | null;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  content: string;
  status: string;
}

export function SettingsView({
  company,
  knowledge,
  canEdit,
}: {
  company: CompanyData;
  knowledge: KnowledgeItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSavingCompany(true);
    setMessage(null);
    setError(null);

    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingCompany(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar la configuración");
      return;
    }

    setMessage("Configuración actualizada");
    startTransition(() => router.refresh());
  }

  async function addKnowledge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSavingKnowledge(true);
    setError(null);

    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingKnowledge(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar el contenido");
      return;
    }

    form.reset();
    startTransition(() => router.refresh());
  }

  async function removeKnowledge(id: string) {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del negocio</CardTitle>
          <CardDescription>
            Esta información alimenta el contexto de todos los agentes IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveCompany} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={company.name} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Giro</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={company.industry ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={company.phone ?? ""} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={company.email ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                id="website"
                name="website"
                defaultValue={company.website ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                defaultValue={company.address ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="businessHours">Horario de atención</Label>
              <Input
                id="businessHours"
                name="businessHours"
                defaultValue={company.businessHours ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tone">Tono de comunicación</Label>
              <Input id="tone" name="tone" defaultValue={company.tone ?? ""} disabled={!canEdit} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={company.description ?? ""}
                disabled={!canEdit}
              />
            </div>

            {message && <p className="text-sm text-emerald-600 sm:col-span-2">{message}</p>}
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

            {canEdit && (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={savingCompany}>
                  {savingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base de conocimiento</CardTitle>
          <CardDescription>
            Servicios, precios y preguntas frecuentes que los agentes usan para responder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <form onSubmit={addKnowledge} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" required placeholder="Limpieza dental" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select id="type" name="type" defaultValue="FAQ">
                    {Object.entries(knowledgeTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Contenido</Label>
                <Textarea
                  id="content"
                  name="content"
                  required
                  placeholder="La limpieza dental cuesta $800 MXN e incluye..."
                />
              </div>
              <Button type="submit" size="sm" disabled={savingKnowledge}>
                {savingKnowledge ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Agregar contenido
              </Button>
            </form>
          )}

          <ul className="space-y-2">
            {knowledge.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Aún no hay contenido en la base de conocimiento.
              </li>
            )}
            {knowledge.map((item) => (
              <li key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={item.status}>{knowledgeTypeLabels[item.type] ?? item.type}</Badge>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeKnowledge(item.id)}
                        aria-label={`Eliminar ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
