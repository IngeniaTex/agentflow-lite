# Pendientes

## Optimizar el uso de tokens del chat

Hoy, con un proveedor de IA configurado, **cada mensaje del cliente hace una llamada al modelo** y
cada llamada envía la base de conocimiento completa en el prompt del sistema. El modo mock (que
responde desde la base de conocimiento sin tokens) solo entra sin llave o si la llamada falla.

Orden sugerido (de menor a mayor riesgo):

- [ ] **1. Saltar el modelo cuando la respuesta ya está decidida.** Si la intención es cita o
  cotización y faltan nombre, teléfono o correo, la puerta de contacto reemplaza la respuesta del
  modelo de todos modos. Detectarlo antes de llamar a `generateAgentDecision()` en
  `src/lib/ai-orchestrator.ts` y responder directo. No cambia el comportamiento.
- [ ] **2. Caché de prompt de Anthropic.** El prompt del sistema es casi fijo por empresa, pero
  `buildSystemPrompt()` (`src/lib/agent-prompt.ts`) incluye `new Date().toISOString()`, que cambia en
  cada llamada e invalida el caché. Mover la fecha al mensaje del usuario y marcar el `system` con
  `cache_control`. Verificar con `usage.cache_read_input_tokens` > 0.
- [ ] **3. Enviar solo las entradas relevantes** de la base de conocimiento (top 3–4 por
  `matchService()`) en lugar de todas. Ahorro proporcional al tamaño de la base; riesgo de omitir
  contexto útil.
- [ ] **4. Responder FAQ sin modelo** cuando la coincidencia con la base es muy alta (horario,
  ubicación, contacto). Mayor ahorro, pero respuestas menos naturales; medir antes cuántas preguntas
  son repetitivas.
- [ ] **5. Elegir el modelo por costo/calidad** con pruebas reales (`ANTHROPIC_MODEL`).

Para medir: el campo `source` de cada respuesta (`anthropic` | `openai` | `mock`) y el `usage` de
cada llamada a Anthropic.
