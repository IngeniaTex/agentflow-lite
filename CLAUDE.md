# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

AgentFlow Lite — framework modular de agentes IA para PyMEs. Next.js 15 (App Router) + Prisma +
PostgreSQL + NextAuth v5. Todo el código, comentarios y UI están **en español**; mantén ese idioma
al escribir código nuevo, comentarios y textos de interfaz.

## Comandos

```bash
npm run db:local        # Postgres embebido en localhost:55432, datos en ./.localdb — deja la terminal abierta
npm run prisma:migrate  # migrate dev (crea migración)
npm run prisma:seed     # empresa demo + 2 usuarios + 4 agentes + datos de ejemplo
npm run dev             # http://localhost:3000
npm run build           # prisma generate && next build
npm run lint
npm run prisma:studio
npm run db:reset        # migrate reset (borra y resiembra)
npm run user:create     # da de alta los .json de ./Users (--dry-run para validar sin escribir)
npm run company:create  # alta completa de empresa desde los .json de ./Empresas
```

No hay UI de administración de usuarios ni ruta `/api/users`: el único código que toca
`prisma.user` es `src/lib/auth.ts` (validar el login). Los usuarios se crean con el seed o con
`scripts/create-user.ts`, que lee los `.json` de **`./Users`** (carpeta ignorada por git porque
lleva contraseñas en claro). Cada archivo es un objeto o un arreglo; solo `email` es obligatorio:

```json
[{ "email": "ana@empresa.test", "name": "Ana Ruiz", "role": "VIEWER" }]
```

`role` default `OPERATOR`; sin `password` se genera una y se imprime una sola vez; `"update": true`
es obligatorio para sobrescribir un correo existente. Con `--email` sigue funcionando el modo de
argumentos sueltos. Para escribir en Supabase, `source .env.supabase.local` antes (el script imprime
el host destino).

Tampoco hay registro ni alta de empresas: `scripts/onboard-company.ts` lee los `.json` de
**`./Empresas`** (también ignorada) y crea empresa + usuarios + `company_agents` + base de
conocimiento **en una transacción**. Exige al menos un usuario `ADMIN` y valida los slugs de agente
contra la tabla `agents`, así que el seed debe haber corrido antes. Los correos son únicos en toda
la plataforma, no por empresa.

**No hay framework de tests en el proyecto** — ni jest, ni vitest, ni playwright. Para verificar
cambios: `npx tsc --noEmit`, `npm run lint`, y ejercitar la app con `curl` contra `npm run dev`.

### Trampa de `embedded-postgres`

`embedded-postgres` **no está en `package.json` a propósito** (su postinstall descarga un binario de
Postgres que inflaría el build de Vercel). Se instala aparte:

```bash
npm i -D embedded-postgres --no-save
```

Cualquier `npm install` posterior la elimina y `npm run db:local` falla con
"Falta la dependencia opcional `embedded-postgres`". Reinstálala con el comando de arriba.

### Producción (Supabase) desde local

`.env.supabase.local` (ignorado por git) tiene las cadenas de Supabase. Las variables del shell
**ganan sobre `.env`**, así que esto migra producción sin tocar la base local:

```bash
set -a; source .env.supabase.local; set +a
npx prisma migrate deploy
npm run prisma:seed
```

Si la contraseña trae `/ ? # @ :` hay que percent-encodearla o la cadena de conexión se rompe al
parsear el host.

## Arquitectura

### Autenticación en dos capas (no unificar)

`middleware.ts` corre en **Edge Runtime** y solo puede importar `src/lib/auth.config.ts` — ese
archivo no importa Prisma ni bcrypt por eso. El `CredentialsProvider` real vive en
`src/lib/auth.ts` (Node.js). Si añades algo a `auth.config.ts` que toque Prisma, el middleware
deja de compilar.

`authConfig.secret` lee `AUTH_SECRET ?? NEXTAUTH_SECRET`. Si ambas faltan, `NextAuth()` lanza
`MissingSecret` **al inicializar el módulo**, y todo lo que importe `@/lib/auth` devuelve 500
(`/login`, `/dashboard`, `/api/auth/*`) mientras `/` y `/chat` siguen en 200. Ese patrón de fallos
es el síntoma característico.

`trustHost: true` está fijo en código: la variable `AUTH_TRUST_HOST` **nunca se lee**.

### Multi-tenant por sesión

No hay modo demo fijo. Todo dato del dashboard se filtra por el `companyId` que viene del JWT.
`src/lib/require-session.ts` es la única puerta:

| Helper | Uso | Falla con |
|---|---|---|
| `requireSession()` | páginas del dashboard (server components) | `redirect("/login")` |
| `getCurrentCompanyId()` | páginas que solo necesitan el tenant | `redirect("/login")` |
| `requireApiSession(roles?)` | route handlers | lanza `ApiAuthError` 401/403 |

**Toda query de Prisma debe llevar `companyId` en el `where`.** No hay row-level security abajo.

El chat público tiene su propia puerta: **`src/lib/tenant.ts`**, con esta prioridad:

1. **slug de la URL** — `/chat/<slug>` contra `Company.slug` (único). Si el slug no existe, `404`;
   nunca cae al default, porque un enlace mal escrito no debe atender como otra empresa.
2. **dominio de la petición** — el `Host` normalizado (sin `www.` ni puerto) contra
   `Company.chatDomain` (único, opcional).
3. **empresa por defecto** — `publicDemoCompanyId` (`NEXT_PUBLIC_DEMO_COMPANY_ID`), que mantiene
   vivo el `/chat` de siempre.

En `POST /api/ai/chat` **la sesión gana sobre todo lo anterior**: un usuario autenticado siempre
escribe en su propia empresa aunque mande otro `companySlug`. Esa precedencia es lo que impide
escribir en un tenant ajeno desde el chat.

Trampa del middleware: `PUBLIC_ROUTES` compara con `includes(path)`, así que `/chat/<slug>` necesita
el `path.startsWith("/chat/")` explícito o el visitante anónimo acaba en `/login`.

### Matriz de roles

Se deriva del argumento de `requireApiSession()`, no de una tabla de permisos:

- **sin argumento** → ADMIN, OPERATOR, VIEWER → todos los `GET`
- **`["ADMIN","OPERATOR"]`** → `POST` y `PATCH` de customers, tasks, appointments, quotes
- **`["ADMIN"]`** → todos los `DELETE`, más `PATCH /api/agents`, `PATCH /api/company`,
  `POST|DELETE /api/knowledge`

VIEWER es solo lectura por API, pero **puede abrir todas las páginas del dashboard** — esas rutas
solo comprueban que exista sesión. El seed no crea ningún usuario VIEWER.

### Convención de route handlers

Todos siguen la misma forma (ver `src/app/api/tasks/route.ts` como referencia):

```ts
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { companyId } = await requireApiSession(["ADMIN", "OPERATOR"]);
    const data = createTaskSchema.parse(await request.json());   // zod desde @/schemas
    ...
    return NextResponse.json(serialize(result), { status: 201 }); // serialize: Decimal -> number
  } catch (error) {
    return apiError(error);   // mapea ApiAuthError 401/403, ZodError 422, resto 500
  }
}
```

`serialize()` de `src/lib/api.ts` es obligatorio en cualquier respuesta con `Decimal` de Prisma
(`Quote.amount`, `Agent.basePrice`) — si no, la serialización JSON falla.

### Cadena de proveedores de IA

```
ai-orchestrator.ts
  └── ai-provider.ts        selecciona proveedor, nunca lanza
        ├── anthropic.ts    output_config.format = json_schema (esquema del lado servidor)
        ├── openai.ts       response_format json_object (solo valida sintaxis, no forma)
        └── (null) → mock-ai.ts
```

`AI_PROVIDER` = `anthropic` | `openai` | `mock`. Vacío = autodetecta (Anthropic si hay llave, luego
OpenAI, luego mock). **Un proveedor sin su API key cae a mock con un `console.warn`, no falla.**
Cualquier error del SDK también cae a mock. Consecuencia: el chat siempre responde, así que para
saber qué está contestando hay que mirar el campo `mode`/`source`:

```bash
curl -s localhost:3000/api/ai/chat   # {"ok":true,"mode":"anthropic"|"openai"|"mock"}
```

`src/lib/agent-prompt.ts` es compartido: prompt del sistema, historial (`slice(-8)`), el JSON Schema
y `coerceDecision()`. **Cualquier cambio al contrato de decisión va ahí**, no en los archivos de
proveedor, para que ambos produzcan la misma estructura.

Notas del SDK: Claude Opus 5 **rechaza `temperature` con un 400** — `anthropic.ts` no la manda;
`openai.ts` sí (`0.4`, válida ahí). `max_tokens` es obligatorio en Anthropic. `anthropic.ts` trata
`stop_reason: "refusal"` y `"max_tokens"` como fallo → mock.

### Orquestador y permisos de herramientas

`src/lib/ai-orchestrator.ts` es el corazón. Flujo de un turno de chat:

1. `detectIntent(message)` — **por palabras clave, sin LLM** (`mock-ai.ts`). Una intención de cita
   gana sobre una de precio cuando ambas puntúan igual.
2. Se elige el `AgentDefinition` de la intención, restringido a los agentes activos de la empresa.
3. `companyAgent.customPrompt` sobrescribe el `defaultPrompt` si existe.
4. Se persiste el mensaje del cliente, se genera la decisión, se ejecutan herramientas.
5. Cada herramienta pasa por **`agentAllows(slug, tool)`** — si el agente no la declara en su lista
   `tools`, la acción simplemente no ocurre aunque el modelo la pida.
6. Se persiste la respuesta y se registran `MetricEvent`.

**`src/lib/agent-definitions.ts` es el punto de extensión.** Un agente nuevo se define ahí
(slug, prompt, `tools`, `intents`, `keywords`) y se siembra en `prisma/seed.ts`.

### Doble fuente de verdad de los agentes

Los agentes viven en dos lugares unidos por el `slug`:

- **`AGENT_DEFINITIONS`** (código) — prompt, herramientas permitidas, intenciones, keywords
- **tabla `agents`** (base, creada por el seed) — id, precio, estado; `company_agents` la activa por empresa

Al añadir o renombrar un agente hay que tocar **ambos**. Un slug en código sin fila en la base
degrada silenciosamente (`agentRecord` queda `null` y la conversación se guarda sin `agentId`).

### Rate limit del chat público

`src/lib/rate-limit.ts` — dos capas (por IP y tope global diario), **en memoria del proceso**. En
serverless cada instancia lleva su contador y se reinicia en cold start: es un tope aproximado.
`CHAT_RATE_LIMIT_PER_IP=0` apaga la ruta entera sin redeploy.

Trampa: se leen con `Number(process.env.X ?? default)`. Una variable **definida y vacía** da
`Number("")` = `0`, no el default — o sea, apaga el chat. Vacío no es lo mismo que ausente.

### Base de datos

`prisma/schema.prisma` usa dos URLs: `url = DATABASE_URL` (la app; en producción el pooler de
Supabase en `:6543`) y `directUrl = DIRECT_URL` (migraciones y shadow DB; conexión directa `:5432`).
En runtime **solo se usa `DATABASE_URL`**. El host directo de Supabase es IPv6-only.

`onDelete` es deliberado: `Cascade` desde `Company` hacia todo; `SetNull` en las FK opcionales
(`Conversation.customerId`, `Task.agentId`) para no perder historial al borrar un cliente o agente.

`Company.slug` es obligatorio y único: la migración `20260907190000_empresa_slug_y_dominio` lo
rellena desde el nombre (sin acentos, en SQL) antes de exigir `NOT NULL`. Cualquier código nuevo que
cree empresas debe darle valor — hoy solo lo hacen `prisma/seed.ts` y `scripts/onboard-company.ts`.

En `updateCompanySchema`, `chatDomain` distingue **ausente** (no tocar) de **`""`** (desvincular).
Un `.transform()` que colapse `undefined` en `null` hace que un PATCH parcial borre el dominio.

## Estado conocido

- El seed ya no trae contraseña fija: usa `SEED_PASSWORD` o genera una al azar y la imprime una
  sola vez. El login y la portada tampoco muestran credenciales. Pero `password123` sigue en el
  historial de git, así que **toda base sembrada antes de ese cambio sigue abierta** hasta que se
  roten esos usuarios con `scripts/create-user.ts --update`.
- Las contraseñas reales de local y producción viven en `docs/CREDENCIALES.md` (ignorado por git).
- `src/lib/email.ts` existe pero **nadie importa `@/lib/email`**; `toolSendNotification` devuelve
  `{ queued: false }`. `RESEND_API_KEY` y `EMAIL_FROM` no hacen nada todavía.
- `next.config.ts` pone `eslint.ignoreDuringBuilds: true` — el build no falla por lint, hay que
  correr `npm run lint` a mano.
- `docs/ENTORNO.md` y `docs/CASOS-DE-USO.md` están en `.gitignore` (contienen valores reales).
