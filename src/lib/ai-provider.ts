import type { AgentDefinition, Intent } from "@/lib/agent-definitions";
import {
  generateAgentDecision as generateWithAnthropic,
  isAnthropicEnabled,
} from "@/lib/anthropic";
import type { AgentContext } from "@/lib/mock-ai";
import {
  generateAgentDecision as generateWithOpenAI,
  isOpenAIEnabled,
} from "@/lib/openai";
import type { AgentDecision } from "@/types";

/**
 * Selector de proveedor de IA.
 *
 * `AI_PROVIDER` decide quién responde: `anthropic`, `openai` o `mock`.
 * Si no se define, gana Anthropic cuando hay llave, luego OpenAI, luego mock.
 * Un proveedor sin llave cae a mock en lugar de fallar.
 */

export type AiProvider = "anthropic" | "openai" | "mock";

function resolveProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (configured === "mock") return "mock";

  if (configured === "anthropic") {
    if (isAnthropicEnabled) return "anthropic";
    console.warn("[ai] AI_PROVIDER=anthropic pero falta ANTHROPIC_API_KEY; se usa mock.");
    return "mock";
  }

  if (configured === "openai") {
    if (isOpenAIEnabled) return "openai";
    console.warn("[ai] AI_PROVIDER=openai pero falta OPENAI_API_KEY; se usa mock.");
    return "mock";
  }

  if (configured) {
    console.warn(`[ai] AI_PROVIDER="${configured}" no es válido; se autodetecta.`);
  }

  // Autodetección: Anthropic primero, luego OpenAI.
  if (isAnthropicEnabled) return "anthropic";
  if (isOpenAIEnabled) return "openai";
  return "mock";
}

export const activeProvider: AiProvider = resolveProvider();

/** true cuando responde un modelo real (no el modo mock por reglas). */
export const isModelEnabled = activeProvider !== "mock";

/**
 * Genera la decisión del agente con el proveedor activo.
 * Devuelve null si no hay proveedor o si la llamada falla: el orquestador
 * entonces usa `buildMockDecision`.
 */
export async function generateAgentDecision(
  message: string,
  context: AgentContext,
  agent: AgentDefinition,
  fallbackIntent: Intent,
): Promise<AgentDecision | null> {
  switch (activeProvider) {
    case "anthropic":
      return generateWithAnthropic(message, context, agent, fallbackIntent);
    case "openai":
      return generateWithOpenAI(message, context, agent, fallbackIntent);
    default:
      return null;
  }
}
