"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  appointmentStatusLabels,
  customerStatusLabels,
  quoteStatusLabels,
  taskStatusLabels,
} from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";

/**
 * Paleta validada (checks de la guía de visualización):
 * un solo tono azul para magnitud; el naranja queda como segundo slot
 * categórico cuando una gráfica necesite dos series.
 */
const SERIES_1 = "#2a78d6";
const SERIES_1_SOFT = "#9ec5f4";
const AXIS = "#64748b";
const GRID = "#e2e8f0";
const SURFACE = "#ffffff";

interface ChartData {
  conversationsPerDay: { day: string; label: string; total: number }[];
  customersByStatus: { status: string; total: number }[];
  appointments: {
    requested: number;
    confirmed: number;
    conversionRate: number;
    byStatus: { status: string; total: number }[];
  };
  quotes: { status: string; total: number; amount: number }[];
  tasks: { status: string; total: number }[];
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: Record<string, unknown> }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {entry.value} {suffix ?? ""}
      </p>
    </div>
  );
}

const axisProps = {
  stroke: GRID,
  tick: { fill: AXIS, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export function MetricsCharts({ data }: { data: ChartData }) {
  const customers = data.customersByStatus.map((row) => ({
    ...row,
    label: customerStatusLabels[row.status] ?? row.status,
  }));

  const quotes = data.quotes.map((row) => ({
    ...row,
    label: quoteStatusLabels[row.status] ?? row.status,
  }));

  const tasks = data.tasks.map((row) => ({
    ...row,
    label: taskStatusLabels[row.status] ?? row.status,
  }));

  const appointments = [
    { label: "Solicitadas", total: data.appointments.requested },
    { label: "Confirmadas", total: data.appointments.confirmed },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Conversaciones por día</CardTitle>
          <CardDescription>Conversaciones iniciadas en los últimos 7 días.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.conversationsPerDay} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="fillConversations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_1} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={SERIES_1} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip suffix="conversaciones" />} cursor={{ stroke: GRID }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  fill="url(#fillConversations)"
                  dot={{ r: 4, fill: SERIES_1, stroke: SURFACE, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: SERIES_1, stroke: SURFACE, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prospectos por estado</CardTitle>
          <CardDescription>Distribución del embudo de clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={customers}
                layout="vertical"
                margin={{ top: 4, right: 32, bottom: 4, left: 24 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="label" width={130} {...axisProps} />
                <Tooltip content={<ChartTooltip suffix="prospectos" />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="total" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="total" position="right" fill={AXIS} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citas solicitadas vs confirmadas</CardTitle>
          <CardDescription>
            Tasa de confirmación:{" "}
            <strong className="text-foreground">{data.appointments.conversionRate}%</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointments} margin={{ top: 16, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip suffix="citas" />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={64}>
                  <LabelList dataKey="total" position="top" fill={AXIS} fontSize={12} />
                  {appointments.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.label === "Confirmadas" ? SERIES_1 : SERIES_1_SOFT}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cotizaciones por estado</CardTitle>
          <CardDescription>
            Monto total:{" "}
            <strong className="text-foreground">
              {formatCurrency(quotes.reduce((sum, row) => sum + row.amount, 0))}
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quotes}
                layout="vertical"
                margin={{ top: 4, right: 32, bottom: 4, left: 24 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="label" width={130} {...axisProps} />
                <Tooltip content={<ChartTooltip suffix="cotizaciones" />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="total" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="total" position="right" fill={AXIS} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tareas por estado</CardTitle>
          <CardDescription>Carga operativa del equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tasks}
                layout="vertical"
                margin={{ top: 4, right: 32, bottom: 4, left: 24 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="label" width={110} {...axisProps} />
                <Tooltip content={<ChartTooltip suffix="tareas" />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="total" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="total" position="right" fill={AXIS} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Detalle de citas por estado</CardTitle>
          <CardDescription>Vista en tabla para lectura accesible de los datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Estado</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.appointments.byStatus.map((row) => (
                <tr key={row.status} className="border-b border-border last:border-0">
                  <td className="py-2">{appointmentStatusLabels[row.status] ?? row.status}</td>
                  <td className="py-2 font-medium">{row.total}</td>
                </tr>
              ))}
              {data.appointments.byStatus.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-muted-foreground">
                    Sin citas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
