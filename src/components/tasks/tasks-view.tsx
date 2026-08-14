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
import { taskPriorityLabels, taskStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  priority: string;
  status: string;
  customer: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
}

const STATUSES = Object.keys(taskStatusLabels);
const PRIORITIES = Object.keys(taskPriorityLabels);

export function TasksView({
  tasks,
  customers,
  canEdit,
}: {
  tasks: TaskRow[];
  customers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = tasks.filter((task) => !statusFilter || task.status === statusFilter);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);

    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la tarea");
      return;
    }

    form.reset();
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function patchTask(id: string, body: Record<string, string>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
              {taskStatusLabels[status]}
            </option>
          ))}
        </Select>
        {canEdit && (
          <Button
            className="ml-auto"
            onClick={() => setShowForm((value) => !value)}
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4" /> {showForm ? "Cancelar" : "Nueva tarea"}
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva tarea</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" name="title" required placeholder="Confirmar cita con Ana" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerId">Cliente relacionado</Label>
                <Select id="customerId" name="customerId" defaultValue="">
                  <option value="">Sin cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha límite</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select id="priority" name="priority" defaultValue="MEDIUM">
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {taskPriorityLabels[priority]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="PENDING">
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {taskStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" />
              </div>

              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar tarea
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
                <TableHead>Tarea</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Fecha límite</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableEmpty colSpan={6}>No hay tareas registradas.</TableEmpty>}
              {filtered.map((task) => (
                <TableRow key={task.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{task.customer?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.agent?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(task.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge status={task.priority}>{taskPriorityLabels[task.priority]}</Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={task.status}
                        onChange={(event) => patchTask(task.id, { status: event.target.value })}
                        className="h-8 w-40 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {taskStatusLabels[status]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge status={task.status}>{taskStatusLabels[task.status]}</Badge>
                    )}
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
