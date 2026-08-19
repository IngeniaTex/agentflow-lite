import Anthropic from "@anthropic-ai/sdk";

import type { AgentDefinition, Intent } from "@/lib/agent-definitions";
import {
  AGENT_DECISION_SCHEMA,
  buildHistoryMessages,
  buildSystemPrompt,
  coerceDecision,
} from "@/lib/agent-prompt";
import type { AgentContext } from "@/lib/mock-ai";
import type { AgentDecision } from "@/types";

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

/** true cuando hay API key de Anthropic configurada. */
export const isAnthropicEnabled = Boolean(apiKey);

export const anthropic = isAnthropicEnabled ? new Anthropic({ apiKey }) : null;

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";

/**
 * `max_tokens` es obligatorio en la API de Anthropic y limita razonamiento +
 * respuesta juntos. 8192 sobra para un JSON de chat y evita truncar a la mitad.
 */
const MAX_TOKENS = 8192;

/**
 * Llama a Claude y devuelve la decisión del agente.
 * Devuelve null ante cualquier error para que el orquestador use el modo mock.
 *
 * A diferencia de OpenAI, aquí el esquema JSON se aplica del lado del servidor
 * (`output_config.format`), así que la forma de la respuesta llega garantizada.
 * Nota: Claude Opus 5 no acepta `temperature` — se guía con el prompt.
 */
export async function generateAgentDecision(
  message: string,
  context: AgentContext,
  agent: AgentDefinition,
  fallbackIntent: Intent,
): Promise<AgentDecision | null> {
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(agent, context),
      output_config: {
        // `low` mantiene el chat ágil; el esquema garantiza la forma del JSON.
        effort: "low",
        format: { type: "json_schema", schema: AGENT_DECISION_SCHEMA },
      },
      messages: [...buildHistoryMessages(context), { role: "user", content: message }],
    });

    if (response.stop_reason === "refusal") {
      console.error("[anthropic] la respuesta fue rechazada, se usa el modo mock");
      return null;
    }
    if (response.stop_reason === "max_tokens") {
      console.error("[anthropic] respuesta truncada por max_tokens, se usa el modo mock");
      return null;
    }

    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) return null;

    return coerceDecision(JSON.parse(text), fallbackIntent, "anthropic");
  } catch (error) {
    console.error("[anthropic] falló la generación, se usa el modo mock:", error);
    return null;
  }
}
