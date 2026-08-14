"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

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
import { quoteStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface QuoteRow {
  id: string;
  service: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  customer: { id: string; name: string };
}

const STATUSES = Object.keys(quoteStatusLabels);

export function QuotesView({
  quotes,
  customers,
  canEdit,
}: {
  quotes: QuoteRow[];
  customers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = quotes.filter((quote) => !statusFilter || quote.status === statusFilter);
  const total = filtered.reduce((sum, quote) => sum + quote.amount, 0);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);

    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la cotización");
      return;
    }

    form.reset();
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-52"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {quoteStatusLabels[status]}
            </option>
          ))}
        </Select>
        <p className="text-sm text-muted-foreground">
          Monto total filtrado: <strong className="text-foreground">{formatCurrency(total)}</strong>
        </p>
        {canEdit && (
          <Button
            className="ml-auto"
            onClick={() => setShowForm((value) => !value)}
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4" /> {showForm ? "Cancelar" : "Nueva cotización"}
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva cotización</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerId">Cliente *</Label>
                <Select id="customerId" name="customerId" required defaultValue="">
                  <option value="" disabled>
                    Selecciona un cliente
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Servicio *</Label>
                <Input id="service" name="service" required placeholder="Limpieza dental" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto (MXN) *</Label>
                <Input id="amount" name="amount" type="number" min="1" step="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="DRAFT">
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {quoteStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" placeholder="Qué incluye el servicio" />
              </div>

              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cotización
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
                <TableHead>Servicio</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableEmpty colSpan={6}>No hay cotizaciones registradas.</TableEmpty>
              )}
              {filtered.map((quote) => (
                <TableRow key={quote.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{quote.customer.name}</TableCell>
                  <TableCell className="text-sm">{quote.service}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(quote.amount, quote.currency)}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={quote.status}
                        onChange={(event) => updateStatus(quote.id, event.target.value)}
                        className="h-8 w-44 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {quoteStatusLabels[status]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge status={quote.status}>{quoteStatusLabels[quote.status]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-64 text-sm text-muted-foreground">
                    <p className="line-clamp-2">{quote.description ?? "—"}</p>
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
