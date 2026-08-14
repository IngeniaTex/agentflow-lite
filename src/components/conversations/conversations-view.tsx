"use client";

import { useState } from "react";
import { Bot, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  channelLabels,
  conversationStatusLabels,
  messageSenderLabels,
} from "@/lib/labels";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

export interface ConversationRow {
  id: string;
  channel: string;
  status: string;
  summary: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  customer: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
  messages: {
    id: string;
    sender: string;
    content: string;
    createdAt: Date | string;
  }[];
}

export function ConversationsView({ conversations }: { conversations: ConversationRow[] }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? null);
  const [channelFilter, setChannelFilter] = useState("");

  const filtered = conversations.filter(
    (conversation) => !channelFilter || conversation.channel === channelFilter,
  );
  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-4">
      <Select
        value={channelFilter}
        onChange={(event) => setChannelFilter(event.target.value)}
        className="w-52"
      >
        <option value="">Todos los canales</option>
        {Object.entries(channelLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="max-h-[70vh] overflow-y-auto scrollbar-thin">
          <CardContent className="space-y-2 p-3">
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No hay conversaciones.</p>
            )}
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  selected?.id === conversation.id
                    ? "border-primary bg-secondary/60"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {conversation.customer?.name ?? "Visitante del chat"}
                  </p>
                  <Badge status={conversation.status}>
                    {conversationStatusLabels[conversation.status] ?? conversation.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {conversation.summary ?? conversation.messages[0]?.content ?? "Sin mensajes"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {channelLabels[conversation.channel] ?? conversation.channel} ·{" "}
                  {conversation.agent?.name ?? "Sin agente"} ·{" "}
                  {formatRelative(conversation.updatedAt)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex max-h-[70vh] flex-col">
          {selected ? (
            <>
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base">
                  {selected.customer?.name ?? "Visitante del chat"}
                </CardTitle>
                <CardDescription>
                  {channelLabels[selected.channel] ?? selected.channel} ·{" "}
                  {selected.agent?.name ?? "Sin agente asignado"} ·{" "}
                  {formatDateTime(selected.createdAt)}
                </CardDescription>
                {selected.summary && (
                  <p className="mt-2 rounded-md bg-muted p-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">Resumen IA:</strong> {selected.summary}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-3 overflow-y-auto p-5 scrollbar-thin">
                {selected.messages.map((message) => {
                  const isCustomer = message.sender === "CUSTOMER";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-2", isCustomer ? "justify-start" : "justify-end")}
                    >
                      {isCustomer && (
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                          isCustomer
                            ? "bg-muted text-foreground"
                            : message.sender === "SYSTEM"
                              ? "border border-dashed border-border bg-card text-muted-foreground"
                              : "bg-primary text-primary-foreground",
                        )}
                      >
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide opacity-70">
                          {messageSenderLabels[message.sender] ?? message.sender}
                        </p>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-1 text-[10px] opacity-60">
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                      {!isCustomer && (
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Bot className="h-3.5 w-3.5 text-secondary-foreground" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </>
          ) : (
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Selecciona una conversación para ver el detalle.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
