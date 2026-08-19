import OpenAI from "openai";

import type { AgentDefinition, Intent } from "@/lib/agent-definitions";
import {
  buildHistoryMessages,
  buildSystemPrompt,
  coerceDecision,
} from "@/lib/agent-prompt";
import type { AgentContext } from "@/lib/mock-ai";
import type { AgentDecision } from "@/types";

const apiKey = process.env.OPENAI_API_KEY?.trim();

/** true cuando hay API key de OpenAI configurada. */
export const isOpenAIEnabled = Boolean(apiKey);

export const openai = isOpenAIEnabled ? new OpenAI({ apiKey }) : null;

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

/**
 * Llama a OpenAI y devuelve la decisión del agente.
 * Devuelve null ante cualquier error para que el orquestador use el modo mock.
 *
 * `json_object` solo garantiza JSON válido (no la forma), por eso `coerceDecision`
 * hace la validación real.
 */
export async function generateAgentDecision(
  message: string,
  context: AgentContext,
  agent: AgentDefinition,
  fallbackIntent: Intent,
): Promise<AgentDecision | null> {
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(agent, context) },
        ...buildHistoryMessages(context),
        { role: "user", content: message },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return coerceDecision(JSON.parse(content), fallbackIntent, "openai");
  } catch (error) {
    console.error("[openai] falló la generación, se usa el modo mock:", error);
    return null;
  }
}
