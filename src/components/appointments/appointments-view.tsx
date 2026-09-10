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
import { appointmentStatusLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export interface AppointmentRow {
  id: string;
  service: string;
  requestedDate: Date | string;
  confirmedDate: Date | string | null;
  status: string;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null };
}

const STATUSES = Object.keys(appointmentStatusLabels);

export function AppointmentsView({
  appointments,
  customers,
  canEdit,
}: {
  appointments: AppointmentRow[];
  customers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = appointments.filter(
    (appointment) => !statusFilter || appointment.status === statusFilter,
  );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);

    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la cita");
      return;
    }

    form.reset();
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
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
              {appointmentStatusLabels[status]}
            </option>
          ))}
        </Select>
        {canEdit && (
          <Button
            onClick={() => setShowForm((value) => !value)}
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4" /> {showForm ? "Cancelar" : "Nueva cita"}
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva solicitud de cita</CardTitle>
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
                <Input id="service" name="service" required placeholder="Consulta de medicina general" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedDate">Fecha solicitada *</Label>
                <Input id="requestedDate" name="requestedDate" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="REQUESTED">
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {appointmentStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" placeholder="Preferencias del cliente" />
              </div>

              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cita
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
                <TableHead>Fecha solicitada</TableHead>
                <TableHead>Fecha confirmada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableEmpty colSpan={6}>No hay citas registradas.</TableEmpty>}
              {filtered.map((appointment) => (
                <TableRow key={appointment.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell>
                    <p className="font-medium">{appointment.customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.customer.phone ?? "Sin teléfono"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{appointment.service}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(appointment.requestedDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(appointment.confirmedDate)}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={appointment.status}
                        onChange={(event) => updateStatus(appointment.id, event.target.value)}
                        className="h-8 w-40 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {appointmentStatusLabels[status]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge status={appointment.status}>
                        {appointmentStatusLabels[appointment.status]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 text-sm text-muted-foreground">
                    <p className="line-clamp-2">{appointment.notes ?? "—"}</p>
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
