import { Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Recommendation {
  title: string;
  detail: string;
  agent: string;
  tone: string;
}

const TONES: Record<string, string> = {
  amber: "border-amber-200 bg-amber-50/60",
  sky: "border-sky-200 bg-sky-50/60",
  violet: "border-violet-200 bg-violet-50/60",
  rose: "border-rose-200 bg-rose-50/60",
  emerald: "border-emerald-200 bg-emerald-50/60",
};

export function AiRecommendations({ items }: { items: Recommendation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Recomendaciones IA
        </CardTitle>
        <CardDescription>
          Sugerencias simuladas a partir de tus datos operativos (Fase 2: reporte generado con IA).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className={cn("rounded-lg border p-3", TONES[item.tone] ?? "border-border bg-muted/40")}
          >
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">→ {item.agent}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
