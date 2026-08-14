import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} — Agentes IA para PyMEs`,
  description:
    "Framework modular de agentes IA para pequeñas empresas: recepción, citas, cotizaciones y seguimiento en un solo dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
