"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarCheck,
  ChartNoAxesColumn,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agentes", icon: Bot },
  { href: "/dashboard/customers", label: "Clientes", icon: Users },
  { href: "/dashboard/conversations", label: "Conversaciones", icon: MessageSquare },
  { href: "/dashboard/appointments", label: "Citas", icon: CalendarCheck },
  { href: "/dashboard/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/dashboard/tasks", label: "Tareas", icon: ListChecks },
  { href: "/dashboard/metrics", label: "Métricas", icon: ChartNoAxesColumn },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-card lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">Agentes IA para PyMEs</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-5 pb-6 lg:block">
        <Link
          href="/chat"
          target="_blank"
          className="block rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <strong className="block text-foreground">Chat público</strong>
          Abre /chat para simular la experiencia del cliente final.
        </Link>
      </div>
    </aside>
  );
}
