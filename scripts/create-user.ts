/**
 * Crea (o actualiza) usuarios del dashboard a partir de archivos JSON.
 *
 * No hay UI de administración de usuarios ni ruta /api/users: el seed solo crea
 * el ADMIN y el OPERATOR de la empresa demo. Este script cubre el resto.
 *
 * Los archivos viven en ./Users (ignorada por git, porque llevan contraseñas):
 *
 *   npm run user:create                      # procesa todos los .json de ./Users
 *   npm run user:create -- --file Users/equipo.json
 *   npm run user:create -- --dry-run         # valida sin escribir en la base
 *
 * Cada archivo es un objeto o un arreglo de objetos:
 *
 *   [
 *     { "email": "ana@empresa.test", "name": "Ana Ruiz", "role": "VIEWER" },
 *     { "email": "luis@empresa.test", "role": "ADMIN", "password": "…", "update": true }
 *   ]
 *
 * Solo `email` es obligatorio. Si omites `password` se genera una y se imprime
 * al final (no se guarda en el archivo). `update: true` permite cambiar rol o
 * contraseña de un correo que ya existe.
 *
 * Para escribir en PRODUCCIÓN (Supabase) en vez de la base local:
 *   set -a; source .env.supabase.local; set +a
 *   npm run user:create
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

const USERS_DIR = resolve(process.cwd(), "Users");

/** Plantilla que se escribe cuando ./Users está vacía. */
const TEMPLATE = [
  {
    email: "nuevo@agentflow.test",
    name: "Nombre Apellido",
    role: "VIEWER",
    password: "cambia-esta-contrasena",
  },
];

const userSchema = z
  .object({
    email: z.string().email("no es un correo válido"),
    name: z.string().min(1, "no puede estar vacío").optional(),
    role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR"),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    password: z.string().min(8, "debe tener al menos 8 caracteres").optional(),
    /** Empresa destino; por defecto la del seed. */
    companyId: z.string().min(1).optional(),
    /** Permite sobrescribir un correo que ya existe. */
    update: z.boolean().default(false),
  })
  // Un campo mal escrito ("correo", "rol") debe fallar, no ignorarse en silencio.
  .strict();

type UserEntry = z.infer<typeof userSchema>;

/** Lee --clave valor de process.argv. */
function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** Normaliza antes de validar para aceptar "viewer" y "  Correo@X.test ". */
function normalize(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const entry = { ...(raw as Record<string, unknown>) };
  if (typeof entry.email === "string") entry.email = entry.email.toLowerCase().trim();
  if (typeof entry.name === "string") entry.name = entry.name.trim();
  if (typeof entry.role === "string") entry.role = entry.role.toUpperCase().trim();
  if (typeof entry.status === "string") entry.status = entry.status.toUpperCase().trim();
  return entry;
}

/** Contraseña de 24 caracteres sin símbolos que compliquen copiar y pegar. */
const generatePassword = () => randomBytes(18).toString("base64url").slice(0, 24);

/** Archivos .json a procesar: el de --file, o todos los de ./Users. */
function resolveFiles(): string[] {
  const single = arg("file");
  if (single) {
    const path = resolve(process.cwd(), single);
    if (!existsSync(path)) fail(`No existe el archivo "${single}".`);
    return [path];
  }

  if (!existsSync(USERS_DIR)) {
    mkdirSync(USERS_DIR, { recursive: true });
  }

  const files = readdirSync(USERS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .sort()
    .map((file) => join(USERS_DIR, file));

  if (files.length === 0) {
    const example = join(USERS_DIR, "ejemplo.json");
    if (!existsSync(example)) {
      writeFileSync(example, `${JSON.stringify(TEMPLATE, null, 2)}\n`, "utf8");
    }
    fail(
      `La carpeta ./Users no tenía ningún .json.\n` +
        `  Creé Users/ejemplo.json como plantilla: edítalo y vuelve a ejecutar\n` +
        `  el comando. La carpeta está ignorada por git.`,
    );
  }

  return files;
}

/** Lee un archivo y devuelve sus entradas ya validadas. */
function readEntries(path: string): { entry: UserEntry; origin: string }[] {
  const label = basename(path);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} no es JSON válido: ${(error as Error).message}`);
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) fail(`${label} está vacío.`);

  return list.map((raw, index) => {
    const where = Array.isArray(parsed) ? `${label}[${index}]` : label;
    const result = userSchema.safeParse(normalize(raw));

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `    ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
        .join("\n");
      fail(`${where} tiene datos inválidos:\n${issues}`);
    }

    return { entry: result.data, origin: where };
  });
}

async function main() {
  // Compatibilidad: si aún pasas --email, se usa ese usuario y se ignora ./Users.
  const inlineEmail = arg("email");
  const dryRun = hasFlag("dry-run");

  const pending: { entry: UserEntry; origin: string }[] = inlineEmail
    ? readInlineEntry(inlineEmail)
    : resolveFiles().flatMap(readEntries);

  // Un correo repetido entre archivos deja un resultado dependiente del orden.
  const seen = new Map<string, string>();
  for (const { entry, origin } of pending) {
    const previous = seen.get(entry.email);
    if (previous) fail(`${entry.email} aparece dos veces (${previous} y ${origin}).`);
    seen.set(entry.email, origin);
  }

  const companies = new Map<string, { id: string; name: string }>();
  const defaultCompanyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "demo-company-001";

  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1] ?? "desconocido";
  console.log(
    `\n${dryRun ? "Validando" : "Escribiendo"} ${pending.length} usuario(s) — base: ${host}\n`,
  );

  const results: Record<string, string>[] = [];
  const errors: string[] = [];

  for (const { entry, origin } of pending) {
    const companyId = entry.companyId ?? defaultCompanyId;

    // Cachea la empresa: varios usuarios suelen compartirla.
    if (!companies.has(companyId)) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      });
      if (!company) {
        const existing = await prisma.company.findMany({ select: { id: true, name: true } });
        fail(
          `${origin}: no existe la empresa "${companyId}".` +
            (existing.length
              ? `\n  Empresas disponibles:\n${existing
                  .map((c) => `    ${c.id}  (${c.name})`)
                  .join("\n")}`
              : "\n  No hay ninguna empresa: ejecuta primero `npm run prisma:seed`."),
        );
      }
      companies.set(companyId, company);
    }
    const company = companies.get(companyId)!;

    const already = await prisma.user.findUnique({
      where: { email: entry.email },
      select: { id: true },
    });

    if (already && !entry.update) {
      errors.push(`${entry.email} ya existe (${origin}). Añade "update": true para sobrescribirlo.`);
      continue;
    }

    const password = entry.password ?? generatePassword();

    if (!dryRun) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.upsert({
        where: { email: entry.email },
        update: {
          passwordHash,
          role: entry.role,
          status: entry.status,
          ...(entry.name ? { name: entry.name } : {}),
        },
        create: {
          email: entry.email,
          name: entry.name ?? entry.email.split("@")[0],
          passwordHash,
          role: entry.role,
          status: entry.status,
          companyId: company.id,
        },
      });
    }

    results.push({
      correo: entry.email,
      rol: entry.role,
      contraseña: entry.password
        ? "(la del archivo)"
        : dryRun
          ? "(se generará)" // en seco no se muestra: la real se genera al escribir
          : password,
      empresa: company.name,
      accion: already ? "actualizado" : "creado",
    });
  }

  if (results.length > 0) {
    console.table(results);
    const generated = results.filter((r) => r["contraseña"] !== "(la del archivo)").length;
    if (generated > 0 && !dryRun) {
      console.log(`Guarda las ${generated} contraseña(s) generada(s): no vuelven a mostrarse.`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} usuario(s) omitido(s):`);
    for (const error of errors) console.error(`  - ${error}`);
  }

  const verb = dryRun ? "validado(s), sin escribir" : "escrito(s)";
  const mark = errors.length === 0 ? "✓" : "•";
  console.log(`\n${mark} ${results.length} usuario(s) ${verb}, ${errors.length} omitido(s).\n`);

  if (errors.length > 0) process.exitCode = 1;
}

/** Modo compatible con la versión anterior del script (--email, --role, …). */
function readInlineEntry(email: string): { entry: UserEntry; origin: string }[] {
  const result = userSchema.safeParse(
    normalize({
      email,
      name: arg("name"),
      role: arg("role") ?? "OPERATOR",
      password: arg("password"),
      companyId: arg("company"),
      update: hasFlag("update"),
    }),
  );

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `    --${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");
    fail(`Argumentos inválidos:\n${issues}`);
  }

  return [{ entry: result.data, origin: "argumentos" }];
}

main()
  .catch((error) => {
    console.error("\n✗ Falló la creación de usuarios:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
