"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { customerSourceLabels, customerStatusLabels } from "@/lib/labels";
import { formatDate, formatRelative } from "@/lib/utils";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  serviceInterest: string | null;
  source: string;
  status: string;
  notes: string | null;
  lastContactAt: Date | string | null;
  nextActionAt: Date | string | null;
}

const STATUSES = Object.keys(customerStatusLabels);

export function CustomersView({
  customers,
  canEdit,
}: {
  customers: CustomerRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = customers.filter((customer) => {
    const matchesQuery =
      query.trim().length === 0 ||
      [customer.name, customer.email, customer.phone, customer.serviceInterest]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = !statusFilter || customer.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear el prospecto");
      return;
    }

    form.reset();
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, correo o teléfono"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-52"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {customerStatusLabels[status]}
            </option>
          ))}
        </Select>
        {canEdit && (
          <Button onClick={() => setShowForm((value) => !value)} variant={showForm ? "outline" : "default"}>
            <Plus className="h-4 w-4" /> {showForm ? "Cancelar" : "Nuevo prospecto"}
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo prospecto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" required placeholder="Ana Ramírez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" placeholder="+52 55 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" placeholder="cliente@correo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceInterest">Servicio de interés</Label>
                <Input id="serviceInterest" name="serviceInterest" placeholder="Consulta de medicina general" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="NEW">
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {customerStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origen</Label>
                <Select id="source" name="source" defaultValue="DASHBOARD">
                  {Object.entries(customerSourceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" placeholder="Contexto útil para el equipo" />
              </div>

              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar prospecto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último contacto</TableHead>
                <TableHead>Próxima acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableEmpty colSpan={6}>No hay prospectos que coincidan con el filtro.</TableEmpty>
              )}
              {filtered.map((customer) => (
                <TableRow key={customer.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customerSourceLabels[customer.source] ?? customer.source}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>{customer.phone ?? "—"}</p>
                    <p className="text-xs">{customer.email ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">{customer.serviceInterest ?? "—"}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={customer.status}
                        onChange={(event) => updateStatus(customer.id, event.target.value)}
                        className="h-8 w-44 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {customerStatusLabels[status]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge status={customer.status}>
                        {customerStatusLabels[customer.status] ?? customer.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelative(customer.lastContactAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(customer.nextActionAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
