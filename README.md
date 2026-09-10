# AgentFlow Lite

**AgentFlow Lite** es un template inicial para construir un **Framework Modular de Agentes IA para PyMEs**.

Permite que pequeños negocios, profesionales independientes y emprendedores activen agentes IA especializados para **atender clientes, organizar prospectos, agendar citas, generar cotizaciones simples, crear tareas, dar seguimiento y analizar métricas** desde un dashboard sencillo.

Esta versión incluye **autenticación básica** para proteger el dashboard, con dos usuarios de prueba (administrador y operador). El **chat público para clientes finales funciona sin login**.

---

## Índice

1. [Qué incluye el MVP](#qué-incluye-el-mvp)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura](#arquitectura)
4. [Instalación local](#instalación-local)
5. [Variables de entorno](#variables-de-entorno)
6. [Usuarios de prueba](#usuarios-de-prueba)
7. [Rutas principales](#rutas-principales)
8. [Agentes incluidos](#agentes-incluidos)
9. [Modelo de datos](#modelo-de-datos)
10. [Reglas de acceso](#reglas-de-acceso)
11. [Flujo de prueba sugerido](#flujo-de-prueba-sugerido)
12. [Estructura del proyecto](#estructura-del-proyecto)
13. [Roadmap](#roadmap)

---

## Qué incluye el MVP

| Módulo | Descripción |
| --- | --- |
| **Autenticación básica** | Login con email + contraseña, logout, sesión JWT, protección de rutas y usuarios seed. |
| **Dashboard** | Resumen operativo: prospectos nuevos, citas solicitadas, cotizaciones, tareas pendientes, clientes en seguimiento, conversaciones IA y recomendaciones IA simuladas. |
| **Agentes** | Catálogo de 4 agentes base, activación por empresa y prompt personalizable. |
| **Clientes y prospectos** | Alta, búsqueda, filtros y cambio de estado dentro del embudo. |
| **Conversaciones** | Historial de conversaciones atendidas por IA con resumen y mensajes. |
| **Citas** | Solicitudes de cita, confirmación y cambio de estado. |
| **Cotizaciones** | Cotizaciones simples con monto, estado y seguimiento. |
| **Tareas** | Pendientes operativos con prioridad, fecha límite y estado. |
| **Métricas** | Conversaciones por día, prospectos por estado, citas solicitadas vs confirmadas, cotizaciones y tareas por estado. |
| **Chat demo público** | `/chat` sin login: detecta intención, elige agente, responde y crea registros reales. |
| **Configuración** | Datos del negocio y base de conocimiento que alimentan a los agentes. |

**Aún no implementado (a propósito):** registro público, recuperación de contraseña, confirmación por email, OAuth, MFA, permisos avanzados e invitación de usuarios.

---

## Stack tecnológico

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS 4** + componentes estilo **shadcn/ui** (`src/components/ui`)
- **Prisma ORM** + **PostgreSQL** (compatible con Supabase)
- **Auth.js / NextAuth v5** con `CredentialsProvider` + **bcryptjs**
- **Anthropic SDK** y **OpenAI SDK** (proveedor seleccionable; modo mock si no hay API key)
- **Zod** + **React Hook Form**
- **Recharts**, **Lucide React**, **date-fns**
- **Resend** preparado para emails (deshabilitado si no hay API key)

---

## Arquitectura

### General

```txt
Cliente final
  ↓
Web Chat público (/chat)
  ↓
API Backend (/api/ai/chat)
  ↓
Orquestador IA (src/lib/ai-orchestrator.ts)
  ↓
Catálogo de agentes (src/lib/agent-definitions.ts)
  ↓
Herramientas internas (src/lib/agent-tools.ts)
  ↓
Base de datos PostgreSQL (Prisma)
  ↓
Dashboard empresarial protegido por login
```

### Autenticación

```txt
Usuario interno
  ↓
/login
  ↓
Credenciales email + password
  ↓
Auth.js Credentials Provider (src/lib/auth.ts)
  ↓
Validación contra la tabla User
  ↓
bcrypt.compare(password, passwordHash)
  ↓
Sesión JWT { id, companyId, companyName, role, name, email }
  ↓
Dashboard protegido (middleware + layout)
```

La protección tiene **dos barreras**:

1. `middleware.ts` — redirige a `/login` antes de renderizar cualquier ruta protegida.
2. `src/app/dashboard/layout.tsx` — llama a `requireSession()` en el servidor.

Las rutas de API protegidas usan `requireApiSession()` y **todas las consultas filtran por el `companyId` de la sesión**.

### Cómo responde el orquestador

1. Detecta la intención del mensaje (`GENERAL`, `FAQ`, `APPOINTMENT`, `QUOTE`, `FOLLOW_UP`).
2. Selecciona el agente activo de la empresa que atiende esa intención.
3. Genera la respuesta con el proveedor activo (`AI_PROVIDER`):
   - con **Anthropic (Claude)** si existe `ANTHROPIC_API_KEY`; el esquema JSON se
     valida del lado del servidor, así que la forma de la respuesta llega garantizada,
   - con **OpenAI** si existe `OPENAI_API_KEY`,
   - con el **modo mock** basado en reglas si no hay llave (o si la llamada falla).
4. Ejecuta **solo las herramientas permitidas** para ese agente (crear cliente, crear cita, generar cotización, crear tarea, resumir conversación…).
5. Guarda mensajes, actualiza el estado del prospecto y registra eventos de métrica.

---

## Instalación local

### 1. Requisitos

- Node.js 20+
- Una base de datos **PostgreSQL** (local o Supabase)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar el entorno

```bash
cp .env.example .env
```

Edita `.env` y coloca tu `DATABASE_URL`. Opciones:

| Opción | `DATABASE_URL` |
| --- | --- |
| **Postgres local incluido** (sin instalar nada) | `npm i -D embedded-postgres` y luego `npm run db:local` en una terminal aparte → `postgresql://agentflow:agentflow@localhost:55432/agentflow_lite` (los datos viven en `./.localdb`). |
| **Supabase** (sin instalar nada) | Crea un proyecto en supabase.com y copia la cadena de conexión (usa el puerto `5432` o el pooler `6543` con `?pgbouncer=true`). |
| **PostgreSQL local (macOS)** | `brew install postgresql@16 && brew services start postgresql@16` → `postgresql://$(whoami)@localhost:5432/agentflow_lite` |
| **Docker** | `docker run --name agentflow-db -e POSTGRES_PASSWORD=agentflow -e POSTGRES_DB=agentflow_lite -p 5432:5432 -d postgres:16` → `postgresql://postgres:agentflow@localhost:5432/agentflow_lite` |

Genera también un secreto de sesión:

```bash
openssl rand -base64 32
```

y colócalo en `NEXTAUTH_SECRET` **y** `AUTH_SECRET`.

### 4. Preparar la base de datos

```bash
npm run prisma:generate   # cliente de Prisma
npm run prisma:migrate     # aplica las migraciones
npm run prisma:seed        # carga los datos demo
```

### 5. Iniciar la aplicación

```bash
npm run dev
```

Abre <http://localhost:3000>.

### Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye `prisma generate`) |
| `npm run start` | Servidor de producción |
| `npm run lint` | Linter |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:migrate` | Crea/aplica migraciones |
| `npm run prisma:push` | Sincroniza el esquema sin migraciones |
| `npm run prisma:seed` | Carga los datos demo |
| `npm run prisma:studio` | Explorador visual de la base de datos |
| `npm run db:reset` | Reinicia la base de datos y vuelve a sembrar |
| `npm run db:local` | Levanta un PostgreSQL local en `./.localdb` (requiere `npm i -D embedded-postgres`) |

---

## Despliegue en producción (Vercel + Supabase)

Guía para poner el demo en línea y validarlo con usuarios reales.

### 1. Base de datos (Supabase)

Crea un proyecto y copia **dos** cadenas de conexión distintas:

| Variable | Puerto | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | `6543` (pooler) | la app en serverless — agrega `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `5432` (directa) | migraciones de Prisma; el pooler no las soporta |

### 2. Repositorio y deploy

```bash
git remote add origin git@github.com:<usuario>/agentflow-lite.git
git push -u origin main
```

Importa el repo en Vercel. El framework se detecta solo y `npm run build` ya
ejecuta `prisma generate`.

### 3. Variables de entorno en Vercel

```env
DATABASE_URL     = postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL       = postgresql://…supabase.com:5432/postgres
AUTH_SECRET      = <openssl rand -base64 32>
NEXTAUTH_SECRET  = <el mismo valor>
AUTH_TRUST_HOST  = true
AI_PROVIDER      = anthropic          # anthropic | openai | mock
ANTHROPIC_API_KEY = sk-ant-…
ANTHROPIC_MODEL  = claude-opus-5
OPENAI_API_KEY   = sk-…
OPENAI_MODEL     = gpt-4o-mini
NEXT_PUBLIC_APP_NAME        = AgentFlow Lite
NEXT_PUBLIC_DEMO_COMPANY_ID = demo-company-001
```

No hace falta `NEXTAUTH_URL`: la configuración usa `trustHost` y Vercel provee el host.

### 4. Migrar y sembrar producción

Desde tu máquina, apuntando a la base de producción:

```bash
DATABASE_URL="<pooler>" DIRECT_URL="<directa>" npx prisma migrate deploy
DATABASE_URL="<pooler>" DIRECT_URL="<directa>" npm run prisma:seed
```

### 5. Antes de compartir la URL

- **Rota las contraseñas anteriores a este cambio.** `password123` estuvo en este README y en el
  historial de git, así que cualquier base sembrada antes sigue siendo accesible con ella:
  `npm run user:create -- --email admin@agentflow.test --password '…' --update`.
- El chat crea registros reales; usa el seed para limpiar entre demostraciones.
- Verifica qué proveedor responde y si estás en modo mock (ver abajo).

### Límites del chat público

`/api/ai/chat` no requiere sesión, así que aplica dos topes configurables. Los
visitantes anónimos se limitan; el equipo con sesión iniciada no.

| Variable | Default | Qué controla |
| --- | --- | --- |
| `CHAT_RATE_LIMIT_PER_IP` | `10` | mensajes por IP en la ventana (`0` pausa el chat sin redeploy) |
| `CHAT_RATE_LIMIT_WINDOW_MS` | `600000` | tamaño de la ventana (10 minutos) |
| `CHAT_RATE_LIMIT_GLOBAL_DAILY` | `300` | techo diario de todo el demo, protege la factura de OpenAI |

Al excederse, la API responde `429` con `Retry-After` y el chat muestra el mensaje
al visitante. El contador vive en memoria del proceso: en serverless es un tope
aproximado por instancia, suficiente para un demo. Para cuotas estrictas, mover a
Upstash Redis.

### ¿Qué proveedor está respondiendo?

Si la llamada al modelo falla, el orquestador **cae a mock en silencio** (solo deja
log en el servidor). Para comprobar en qué modo estás:

```bash
curl https://<tu-dominio>/api/ai/chat
# {"ok":true,"mode":"anthropic", …}   → anthropic | openai | mock
```

La interfaz del chat también muestra la etiqueta **Claude**, **OpenAI** o **Modo mock**
en cada respuesta. Si aparece "Modo mock" con la llave configurada, revisa la llave o el
billing del proveedor, no el código.

Para cambiar de proveedor basta con editar `AI_PROVIDER` en Vercel y redesplegar; no hay
que tocar código.

---

## Variables de entorno

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agentflow_lite"
DIRECT_URL="postgresql://user:password@localhost:5432/agentflow_lite"

NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="replace-with-a-secure-random-secret"
AUTH_TRUST_HOST="true"

# Proveedor de IA: "anthropic", "openai" o "mock".
# Vacío = autodetecta (Anthropic si hay llave, luego OpenAI, luego mock).
AI_PROVIDER="anthropic"

ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-opus-5"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

RESEND_API_KEY=""
EMAIL_FROM="noreply@example.com"

NEXT_PUBLIC_APP_NAME="AgentFlow Lite"
NEXT_PUBLIC_DEMO_COMPANY_ID="demo-company-001"

# Límites del chat público (opcionales — ver sección de despliegue)
CHAT_RATE_LIMIT_PER_IP="10"
CHAT_RATE_LIMIT_WINDOW_MS="600000"
CHAT_RATE_LIMIT_GLOBAL_DAILY="300"
```

- En local, `DIRECT_URL` puede ser idéntica a `DATABASE_URL`. En producción con
  pooler (Supabase) deben ser distintas: ver la sección de despliegue.
- `AI_PROVIDER` elige quién responde. Un proveedor **sin su llave cae al modo mock**
  en lugar de fallar, y lo avisa en el log del servidor.
- Si **no hay ninguna llave**, el sistema usa **respuestas mock** (reglas + base de
  conocimiento). El chat lo indica con la etiqueta *Modo mock*.
- Con llave configurada, el orquestador llama al modelo y cae al modo mock solo si la
  llamada falla.
- **Claude Opus 5 no acepta `temperature`** (devuelve 400); el comportamiento se guía
  desde el prompt. El proveedor de OpenAI sí la usa.
- `RESEND_API_KEY` queda preparado para la Fase 2: sin llave, las notificaciones solo se registran en consola.

---

## Usuarios de prueba

El seed crea la empresa demo **Clínica Médica Horizonte** (`demo-company-001`) y dos usuarios:

| Rol | Email |
| --- | --- |
| **ADMIN** | `admin@agentflow.test` |
| **OPERATOR** | `operador@agentflow.test` |

La contraseña **no está en el repositorio**: el seed genera una al azar y la imprime una sola vez al
terminar. Para fijarla tú:

```bash
SEED_PASSWORD='la-que-quieras' npm run prisma:seed
```

Se guardan hasheadas con bcrypt. La pantalla de login no muestra ninguna credencial.

El seed también carga: 4 agentes activos, 7 entradas de base de conocimiento, 5 clientes, 3 conversaciones con mensajes, 3 citas, 3 cotizaciones, 5 tareas y ~90 eventos de métrica de los últimos 7 días.

---

## Rutas principales

### Públicas

| Ruta | Descripción |
| --- | --- |
| `/` | Landing del producto |
| `/login` | Inicio de sesión |
| `/chat` | Chat demo público (experiencia del cliente final) |
| `/api/ai/chat` | Endpoint del orquestador (usa la empresa demo si no hay sesión) |

### Protegidas

| Ruta | Descripción |
| --- | --- |
| `/dashboard` | Resumen operativo |
| `/dashboard/agents` | Administración de agentes |
| `/dashboard/customers` | Clientes y prospectos |
| `/dashboard/conversations` | Conversaciones |
| `/dashboard/appointments` | Citas |
| `/dashboard/quotes` | Cotizaciones |
| `/dashboard/tasks` | Tareas |
| `/dashboard/metrics` | Métricas |
| `/dashboard/settings` | Configuración del negocio y base de conocimiento |

### API

`/api/customers`, `/api/conversations`, `/api/appointments`, `/api/quotes`, `/api/tasks`, `/api/agents`, `/api/metrics`, `/api/company`, `/api/knowledge` — todas requieren sesión y filtran por `companyId`.

---

## Agentes incluidos

| Agente | Objetivo | Herramientas permitidas |
| --- | --- | --- |
| **Recepcionista IA** | Atender clientes, responder preguntas frecuentes y capturar prospectos. | Crear cliente · Crear tarea · Resumir conversación |
| **Agente de Citas** | Crear solicitudes de cita y tareas de confirmación. | Crear cliente · Crear solicitud de cita · Crear tarea · Enviar notificación *(futuro)* |
| **Agente de Cotizaciones** | Generar cotizaciones simples o preliminares. | Crear cliente · Generar cotización · Actualizar estado del cliente · Crear tarea |
| **Agente de Seguimiento** | Identificar clientes pendientes y generar mensajes de seguimiento. | Generar mensaje de seguimiento · Crear tarea · Actualizar estado del cliente · Enviar notificación *(futuro)* |

El orquestador **nunca ejecuta una herramienta que el agente no tenga permitida** (`agentAllows()` en `src/lib/agent-definitions.ts`).

---

## Modelo de datos

| Modelo | Contenido |
| --- | --- |
| `Company` | Datos del negocio, horario y tono de comunicación |
| `User` | Usuarios internos con `passwordHash`, `role` (ADMIN/OPERATOR/VIEWER) y `status` |
| `Agent` | Catálogo global de agentes |
| `CompanyAgent` | Agentes activos por empresa, con prompt y configuración propios |
| `KnowledgeSource` | Base de conocimiento (FAQ, servicios, precios, políticas) |
| `Customer` | Prospectos y clientes con estado del embudo |
| `Conversation` / `Message` | Conversaciones por canal y sus mensajes |
| `Appointment` | Solicitudes de cita |
| `Quote` | Cotizaciones |
| `Task` | Pendientes operativos |
| `MetricEvent` | Eventos para las métricas |

**Estados de cliente:** Nuevo · Contactado · Cita solicitada · Cita confirmada · Cotización solicitada · Cotización enviada · En seguimiento · Convertido · Perdido.
**Citas:** Solicitada · Confirmada · Reagendada · Cancelada · Completada.
**Cotizaciones:** Borrador · Enviada · Aprobada · Rechazada · Requiere ajuste.
**Tareas:** Pendiente · En progreso · Completada · Vencida · Cancelada.
**Canales:** Chat web · Dashboard · WhatsApp *(preparado)* · Email *(preparado)*.

---

## Reglas de acceso

| Acción | ADMIN | OPERATOR |
| --- | :---: | :---: |
| Ver dashboard, clientes, conversaciones y métricas | ✅ | ✅ |
| Gestionar clientes, citas, cotizaciones y tareas | ✅ | ✅ |
| Ver agentes y configuración | ✅ | ✅ |
| Activar/desactivar agentes y editar sus prompts | ✅ | ❌ |
| Editar la configuración del negocio y la base de conocimiento | ✅ | ❌ |
| Eliminar registros | ✅ | ❌ |

Las restricciones se aplican **en el servidor** (`requireApiSession(["ADMIN"])`), no solo ocultando botones.

---

## Flujo de prueba sugerido

1. Entra a `/login` e inicia sesión como **admin** (`admin@agentflow.test`, con la contraseña que
   imprimió el seed).
2. Valida la redirección a `/dashboard` y revisa las tarjetas y recomendaciones IA.
3. Entra a `/dashboard/agents` y confirma que existan **4 agentes activos**.
4. Cierra sesión y entra como **operador** (`operador@agentflow.test`, misma contraseña).
5. Abre `/chat` en otra pestaña y escribe:

   ```txt
   Hola, quiero una consulta de medicina general el viernes.
   ```

   El **Agente de Citas** responde y crea prospecto + cita + tarea.
6. Escribe también:

   ```txt
   Quiero saber cuánto cuesta una consulta de medicina general.
   ```

   El **Agente de Cotizaciones** responde con el precio de la base de conocimiento y crea la cotización.
7. Revisa `/dashboard/conversations`, `/dashboard/appointments`, `/dashboard/tasks` y `/dashboard/quotes`: los registros aparecen ahí.

---

## Estructura del proyecto

```txt
/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── page.tsx                 # landing pública
│   │   ├── login/page.tsx
│   │   ├── chat/page.tsx            # chat público
│   │   ├── dashboard/               # rutas protegidas
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── ai/chat/route.ts
│   │       ├── customers/ · conversations/ · appointments/
│   │       ├── quotes/ · tasks/ · agents/ · metrics/
│   │       └── company/ · knowledge/
│   ├── components/
│   │   ├── ui/                      # kit estilo shadcn/ui
│   │   ├── auth/ · layout/ · dashboard/ · agents/
│   │   ├── customers/ · conversations/ · appointments/
│   │   └── quotes/ · tasks/ · metrics/ · settings/ · chat/
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth + Credentials + bcrypt
│   │   ├── auth.config.ts           # config compartida (Edge-safe)
│   │   ├── require-session.ts       # requireSession / getCurrentCompanyId
│   │   ├── prisma.ts · mock-ai.ts
│   │   ├── ai-provider.ts            # selector AI_PROVIDER
│   │   ├── anthropic.ts · openai.ts  # proveedores
│   │   ├── agent-prompt.ts           # prompt + esquema JSON compartidos
│   │   ├── ai-orchestrator.ts · agent-definitions.ts · agent-tools.ts
│   │   ├── metrics.ts · labels.ts · date-parsing.ts · utils.ts
│   │   └── api.ts · constants.ts · email.ts
│   ├── schemas/                     # validaciones Zod
│   └── types/                       # tipos e augmentación de next-auth
├── middleware.ts
├── .env.example
└── README.md
```

### Modo demo vs sesión

El modo demo fijo (`demoUserId`) fue reemplazado por la sesión:

- **Rutas protegidas** → `getCurrentCompanyId()` lee `session.user.companyId`.
- **Chat público** → usa `publicDemoCompanyId` (`demo-company-001`).
- **Seed** → mantiene `demoCompanyId = "demo-company-001"` como empresa inicial.

---

## Roadmap

**Fase 2** — roles y permisos avanzados, recuperación de contraseña, invitación de usuarios, mejor configuración de agentes, Google Calendar API, cotizaciones en PDF, reportes mensuales con IA.

**Fase 3** — WhatsApp Business API, billing por agente, límites por plan, marketplace interno de agentes, plantillas por industria, base de conocimiento con pgvector.

**Fase 4** — agentes avanzados por departamento, motor de automatizaciones, métricas avanzadas, multi-sucursal, integraciones con CRM, pagos (Stripe / Mercado Pago), app móvil.

---

## Notas

Este template **no busca ser el producto final**: su objetivo es validar rápidamente el MVP 1 con una capa básica de acceso, sobre una base funcional, limpia y extensible.
