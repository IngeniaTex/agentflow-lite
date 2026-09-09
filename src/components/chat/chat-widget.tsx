"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatTurnResult } from "@/types";

interface ChatMessage {
  id: string;
  sender: "CUSTOMER" | "AGENT";
  content: string;
  agentName?: string;
  actions?: { tool: string; label: string }[];
}

const SUGGESTIONS = [
  "Hola, quiero saber cuánto cuesta una limpieza dental.",
  "Quiero agendar una cita para el viernes.",
  "Me puedes hacer una cotización.",
];

export function ChatWidget({
  companyName,
  companySlug,
}: {
  companyName: string;
  /** Empresa a la que se dirigen los mensajes; la resuelve la página. */
  companySlug: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "AGENT",
      agentName: "Recepcionista IA",
      content: `¡Hola! Soy la asistente virtual de ${companyName}. Puedo darte información, agendar una cita o prepararte una cotización. ¿En qué te ayudo?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<"anthropic" | "openai" | "mock" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/ai/chat?empresa=${encodeURIComponent(companySlug)}`)
      .then((response) => response.json())
      .then((data) => setMode(data.mode))
      .catch(() => setMode(null));
  }, [companySlug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, sender: "CUSTOMER", content },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId, companySlug }),
      });

      if (response.status === 429) {
        const { error } = await response.json().catch(() => ({ error: null }));
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-limit`,
            sender: "AGENT",
            agentName: "Sistema",
            content: error ?? "Alcanzaste el límite de mensajes del demo. Intenta más tarde.",
          },
        ]);
        return;
      }

      if (!response.ok) throw new Error("La respuesta del agente falló");

      const data: ChatTurnResult = await response.json();
      setConversationId(data.conversationId);
      setMode(data.source);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-agent`,
          sender: "AGENT",
          content: data.reply,
          agentName: data.agent.name,
          actions: data.actions,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          sender: "AGENT",
          agentName: "Sistema",
          content:
            "No pude procesar tu mensaje. Revisa que la base de datos esté configurada y vuelve a intentarlo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{companyName}</p>
            <p className="text-xs text-muted-foreground">Asistente virtual · responde al momento</p>
          </div>
        </div>
        {mode && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            {mode === "anthropic" ? "Claude" : mode === "openai" ? "OpenAI" : "Modo mock"}
          </span>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
        {messages.map((message) => {
          const isCustomer = message.sender === "CUSTOMER";
          return (
            <div
              key={message.id}
              className={cn("flex gap-2", isCustomer ? "justify-end" : "justify-start")}
            >
              {!isCustomer && (
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Bot className="h-3.5 w-3.5 text-secondary-foreground" />
                </span>
              )}
              <div className="max-w-[80%] space-y-2">
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    isCustomer ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {!isCustomer && message.agentName && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {message.agentName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.actions && message.actions.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {message.actions.map((action, index) => (
                      <li
                        key={`${action.tool}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                      >
                        <Sparkles className="h-3 w-3" /> {action.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {isCustomer && (
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> El agente está escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              disabled={loading}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe tu mensaje…"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || input.trim().length === 0}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
