/**
 * Alta de una empresa real: empresa + usuarios + agentes activos + base de
 * conocimiento, en una sola pasada.
 *
 * No hay registro público ni UI para crear empresas: el seed solo crea la demo.
 * Este script cubre el alta; el resto de la configuración ya se hace desde el
 * dashboard con el usuario ADMIN que aquí se crea.
 *
 * Los archivos viven en ./Empresas (ignorada por git: llevan contraseñas):
 *
 *   npm run company:create                          # procesa ./Empresas/*.json
 *   npm run company:create -- --file Empresas/x.json
 *   npm run company:create -- --dry-run             # valida sin escribir
 *
 * Para dar de alta en PRODUCCIÓN (Supabase):
 *   set -a; source .env.supabase.local; set +a
 *   npm run company:create
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

/** Copias locales de src/lib/tenant.ts: los scripts no resuelven el alias `@/`. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const prisma = new PrismaClient();

const COMPANIES_DIR = resolve(process.cwd(), "Empresas");

/** Plantilla que se escribe cuando ./Empresas está vacía. */
const TEMPLATE = {
  company: {
    id: "mi-empresa-001",
    name: "Nombre del negocio",
    slug: "mi-empresa",
    chatDomain: null,
    industry: "Giro (ej. Salud dental)",
    description: "Una o dos frases: qué hace el negocio. La usan los agentes.",
    phone: "+52 55 0000 0000",
    email: "contacto@mi-empresa.test",
    website: "https://mi-empresa.test",
    address: "Calle y colonia",
    businessHours: "Lunes a viernes de 9:00 a 19:00",
    tone: "profesional y cercano",
  },
  users: [
    { email: "admin@mi-empresa.test", name: "Nombre Admin", role: "ADMIN" },
    { email: "recepcion@mi-empresa.test", name: "Nombre Recepción", role: "OPERATOR" },
  ],
  agents: ["recepcionista-ia", "agente-de-citas"],
  knowledge: [
    {
      title: "Servicios y precios",
      type: "PRICING",
      content: "Consulta general: $500. Limpieza: $800. Los precios son preliminares.",
    },
    {
      title: "Horarios y ubicación",
      type: "FAQ",
      content: "Atendemos de lunes a viernes de 9:00 a 19:00 en Calle y colonia.",
    },
  ],
};

const userSchema = z
  .object({
    email: z.string().email("no es un correo válido"),
    name: z.string().min(1).optional(),
    role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR"),
    password: z.string().min(8, "debe tener al menos 8 caracteres").optional(),
  })
  .strict();

const onboardingSchema = z
  .object({
    company: z
      .object({
        /** Si lo omites se genera un cuid. */
        id: z.string().min(1).optional(),
        name: z.string().min(1, "la empresa necesita nombre"),
        /** URL del chat público (/chat/<slug>). Se deriva del nombre si falta. */
        slug: z
          .string()
          .regex(SLUG_PATTERN, "solo minúsculas, números y guiones (ej. mi-empresa)")
          .optional(),
        /** Dominio propio que servirá el chat, sin www ni puerto. */
        chatDomain: z
          .string()
          .transform((value) => value.trim().toLowerCase().replace(/^www\./, ""))
          .nullable()
          .optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email("no es un correo válido").optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        businessHours: z.string().optional(),
        tone: z.string().optional(),
      })
      .strict(),
    users: z.array(userSchema).min(1, "hace falta al menos un usuario"),
    /** Slugs del catálogo global a activar para esta empresa. */
    agents: z.array(z.string().min(1)).default([]),
    knowledge: z
      .array(
        z
          .object({
            title: z.string().min(1),
            type: z
              .enum(["FAQ", "SERVICE", "POLICY", "PRICING", "DOCUMENT", "OTHER"])
              .default("FAQ"),
            content: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

type Onboarding = z.infer<typeof onboardingSchema>;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const generatePassword = () => randomBytes(18).toString("base64url").slice(0, 24);

/** Normaliza para aceptar "admin", " Correo@X " y tipos en minúsculas. */
function normalize(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const data = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(data.users)) {
    data.users = data.users.map((user) => {
      if (typeof user !== "object" || user === null) return user;
      const entry = { ...(user as Record<string, unknown>) };
      if (typeof entry.email === "string") entry.email = entry.email.toLowerCase().trim();
      if (typeof entry.name === "string") entry.name = entry.name.trim();
      if (typeof entry.role === "string") entry.role = entry.role.toUpperCase().trim();
      return entry;
    });
  }

  if (Array.isArray(data.agents)) {
    data.agents = data.agents.map((slug) =>
      typeof slug === "string" ? slug.toLowerCase().trim() : slug,
    );
  }

  if (Array.isArray(data.knowledge)) {
    data.knowledge = data.knowledge.map((item) => {
      if (typeof item !== "object" || item === null) return item;
      const entry = { ...(item as Record<string, unknown>) };
      if (typeof entry.type === "string") entry.type = entry.type.toUpperCase().trim();
      return entry;
    });
  }

  return data;
}

function resolveFiles(): string[] {
  const single = arg("file");
  if (single) {
    const path = resolve(process.cwd(), single);
    if (!existsSync(path)) fail(`No existe el archivo "${single}".`);
    return [path];
  }

  if (!existsSync(COMPANIES_DIR)) mkdirSync(COMPANIES_DIR, { recursive: true });

  const files = readdirSync(COMPANIES_DIR)
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .sort()
    .map((file) => join(COMPANIES_DIR, file));

  if (files.length === 0) {
    const example = join(COMPANIES_DIR, "ejemplo.json");
    if (!existsSync(example)) {
      writeFileSync(example, `${JSON.stringify(TEMPLATE, null, 2)}\n`, "utf8");
    }
    fail(
      "La carpeta ./Empresas no tenía ningún .json.\n" +
        "  Creé Empresas/ejemplo.json como plantilla: edítalo y vuelve a ejecutar\n" +
        "  el comando. La carpeta está ignorada por git.",
    );
  }

  return files;
}

function readFile(path: string): { data: Onboarding; label: string } {
  const label = basename(path);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} no es JSON válido: ${(error as Error).message}`);
  }

  const result = onboardingSchema.safeParse(normalize(parsed));
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `    ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");
    fail(`${label} tiene datos inválidos:\n${issues}`);
  }

  // Un ADMIN es indispensable: sin él nadie puede configurar la empresa.
  if (!result.data.users.some((user) => user.role === "ADMIN")) {
    fail(`${label}: hace falta al menos un usuario con "role": "ADMIN".`);
  }

  return { data: result.data, label };
}

async function onboard(data: Onboarding, label: string, dryRun: boolean) {
  const { company: input } = data;

  // El catálogo de agentes es global y lo crea el seed.
  const catalog = await prisma.agent.findMany({ select: { id: true, slug: true, name: true } });
  if (catalog.length === 0) {
    fail("La base no tiene catálogo de agentes. Ejecuta `npm run prisma:seed` primero.");
  }

  const unknown = data.agents.filter((slug) => !catalog.some((agent) => agent.slug === slug));
  if (unknown.length > 0) {
    fail(
      `${label}: agente(s) desconocido(s): ${unknown.join(", ")}\n` +
        `  Slugs disponibles:\n${catalog.map((a) => `    ${a.slug}  (${a.name})`).join("\n")}`,
    );
  }

  // Correos ya usados por otra empresa: el correo es único global.
  const taken = await prisma.user.findMany({
    where: { email: { in: data.users.map((user) => user.email) } },
    select: { email: true, company: { select: { name: true } } },
  });
  if (taken.length > 0) {
    fail(
      `${label}: estos correos ya existen (son únicos en toda la plataforma):\n` +
        taken.map((u) => `    ${u.email} → ${u.company.name}`).join("\n"),
    );
  }

  if (input.id) {
    const existing = await prisma.company.findUnique({
      where: { id: input.id },
      select: { name: true },
    });
    if (existing) fail(`${label}: ya existe una empresa con id "${input.id}" (${existing.name}).`);
  }

  // El slug es la URL del chat público: se deriva del nombre si no viene.
  const slug = input.slug ?? slugify(input.name);
  if (!SLUG_PATTERN.test(slug)) {
    fail(`${label}: no pude derivar un slug de "${input.name}". Ponlo a mano con "slug".`);
  }
  const slugTaken = await prisma.company.findUnique({ where: { slug }, select: { name: true } });
  if (slugTaken) {
    fail(`${label}: el slug "${slug}" ya lo usa ${slugTaken.name}. Elige otro con "slug".`);
  }

  const chatDomain = input.chatDomain ?? null;
  if (chatDomain) {
    const domainTaken = await prisma.company.findUnique({
      where: { chatDomain },
      select: { name: true },
    });
    if (domainTaken) {
      fail(`${label}: el dominio "${chatDomain}" ya lo usa ${domainTaken.name}.`);
    }
  }

  const passwords = data.users.map((user) => user.password ?? generatePassword());

  if (dryRun) {
    return { companyId: input.id ?? "(cuid generado)", slug, chatDomain, passwords };
  }

  // Todo o nada: una empresa a medias es peor que ninguna.
  const companyId = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        name: input.name,
        slug,
        chatDomain,
        industry: input.industry,
        description: input.description,
        phone: input.phone,
        email: input.email,
        website: input.website,
        address: input.address,
        businessHours: input.businessHours,
        tone: input.tone ?? "profesional y cercano",
      },
    });

    for (const [index, user] of data.users.entries()) {
      await tx.user.create({
        data: {
          companyId: company.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          passwordHash: await bcrypt.hash(passwords[index], 10),
          role: user.role,
          status: "ACTIVE",
        },
      });
    }

    for (const slug of data.agents) {
      const agent = catalog.find((item) => item.slug === slug)!;
      await tx.companyAgent.create({
        data: { companyId: company.id, agentId: agent.id, isActive: true, monthlyLimit: 1000 },
      });
    }

    for (const item of data.knowledge) {
      await tx.knowledgeSource.create({
        data: {
          companyId: company.id,
          title: item.title,
          type: item.type,
          content: item.content,
          status: "PUBLISHED",
        },
      });
    }

    return company.id;
  });

  return { companyId, slug, chatDomain, passwords };
}

async function main() {
  const dryRun = hasFlag("dry-run");
  const files = resolveFiles();

  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1] ?? "desconocido";
  console.log(`\n${dryRun ? "Validando" : "Dando de alta"} ${files.length} empresa(s) — base: ${host}`);

  for (const path of files) {
    const { data, label } = readFile(path);
    const { companyId, slug, chatDomain, passwords } = await onboard(data, label, dryRun);

    console.log(`\n── ${data.company.name} ${dryRun ? "(en seco)" : ""}`);
    console.log(`   companyId: ${companyId}`);
    console.log(`   chat      : /chat/${slug}${chatDomain ? `  ·  ${chatDomain}` : ""}`);

    console.table(
      data.users.map((user, index) => ({
        correo: user.email,
        rol: user.role,
        contraseña: user.password
          ? "(la del archivo)"
          : dryRun
            ? "(se generará)"
            : passwords[index],
      })),
    );

    console.log(
      `   agentes activos     : ${data.agents.length > 0 ? data.agents.join(", ") : "ninguno (actívalos desde /dashboard/agents)"}`,
    );
    console.log(`   contenido de la base: ${data.knowledge.length} entrada(s)`);

    if (!dryRun) {
      console.log(
        `\n   Siguiente paso: entra a /login con el ADMIN y revisa /dashboard/settings.\n` +
          `   El chat del cliente final ya responde en /chat/${slug}` +
          (chatDomain
            ? `\n   y en https://${chatDomain} cuando apuntes el DNS al despliegue.`
            : "."),
      );
    }
  }

  console.log();
}

main()
  .catch((error) => {
    console.error("\n✗ Falló el alta:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
