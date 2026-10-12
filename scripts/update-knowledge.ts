/**
 * Actualiza la base de conocimiento de una empresa YA EXISTENTE a partir del
 * mismo .json que usa `npm run company:create` (./Empresas/<empresa>.json).
 *
 * La empresa se localiza por `company.slug`. De ese archivo solo se leen
 * `company` y `knowledge`; `users` y `agents` se ignoran.
 *
 *   npm run knowledge:update -- --file Empresas/x.json   # una empresa
 *   npm run knowledge:update                             # todas las de ./Empresas
 *   npm run knowledge:update -- --dry-run                # muestra los cambios sin escribir
 *   npm run knowledge:update -- --prune                  # archiva lo que ya no está en el .json
 *   npm run knowledge:update -- --company                # también actualiza el perfil de la empresa
 *
 * Reglas:
 *   - Cada entrada se identifica por su `title`: si existe se actualiza, si no se crea.
 *   - Sin `--prune` nunca se toca lo que no está en el archivo (se lista como aviso).
 *   - `--prune` ARCHIVA (no borra): el chat deja de usarlas y se pueden recuperar.
 *   - `--company` sobrescribe giro, descripción, contacto, horario y tono con los
 *     del archivo. Sin la bandera, lo editado desde el dashboard se respeta.
 *     Nunca cambia `id`, `slug` ni `chatDomain`.
 *
 * Para PRODUCCIÓN (Supabase):
 *   set -a; source .env.supabase.local; set +a
 *   npm run knowledge:update -- --file Empresas/x.json
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const COMPANIES_DIR = resolve(process.cwd(), "Empresas");

/** Mismos límites que `createKnowledgeSchema` de src/schemas (el alias `@/` no resuelve aquí). */
const knowledgeSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    type: z
      .string()
      .transform((value) => value.toUpperCase().trim())
      .pipe(z.enum(["FAQ", "SERVICE", "POLICY", "PRICING", "DOCUMENT", "OTHER"]))
      .default("FAQ"),
    content: z.string().trim().min(5).max(5000),
  })
  .strict();

const fileSchema = z.object({
  company: z.object({
    slug: z.string().min(1, "hace falta company.slug para encontrar la empresa"),
    name: z.string().optional(),
    industry: z.string().optional(),
    description: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("no es un correo válido").optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    businessHours: z.string().optional(),
    tone: z.string().optional(),
  }),
  knowledge: z.array(knowledgeSchema).min(1, "el archivo no trae entradas en knowledge"),
});

type KnowledgeFile = z.infer<typeof fileSchema>;

/** Campos del perfil que `--company` copia del archivo a la base. */
const PROFILE_FIELDS = [
  "industry",
  "description",
  "phone",
  "email",
  "website",
  "address",
  "businessHours",
  "tone",
] as const;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function resolveFiles(): string[] {
  const single = arg("file");
  if (single) {
    const path = resolve(process.cwd(), single);
    if (!existsSync(path)) fail(`No existe el archivo "${single}".`);
    return [path];
  }

  if (!existsSync(COMPANIES_DIR)) fail("No existe la carpeta ./Empresas.");
  const files = readdirSync(COMPANIES_DIR)
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .sort()
    .map((file) => join(COMPANIES_DIR, file));
  if (files.length === 0) fail("La carpeta ./Empresas no tiene ningún .json.");
  return files;
}

function readFile(path: string): { data: KnowledgeFile; label: string } {
  const label = basename(path);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} no es JSON válido: ${(error as Error).message}`);
  }

  const result = fileSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `    ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");
    fail(`${label} tiene datos inválidos:\n${issues}`);
  }

  // El título es la llave: dos entradas con el mismo título se pisarían.
  const seen = new Set<string>();
  for (const item of result.data.knowledge) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) fail(`${label}: el título "${item.title}" está repetido en knowledge.`);
    seen.add(key);
  }

  return { data: result.data, label };
}

async function update(data: KnowledgeFile, label: string, options: Options) {
  const company = await prisma.company.findUnique({
    where: { slug: data.company.slug },
    select: { id: true, name: true },
  });
  if (!company) {
    const message =
      `${label}: no existe ninguna empresa con slug "${data.company.slug}".\n` +
      `  Para darla de alta usa: npm run company:create -- --file Empresas/${label}`;
    // Con --file es un error; recorriendo ./Empresas solo se salta esa empresa.
    if (options.single) fail(message);
    console.warn(`\n⚠ ${message}`);
    return;
  }

  const existing = await prisma.knowledgeSource.findMany({
    where: { companyId: company.id },
    select: { id: true, title: true, type: true, content: true, status: true },
  });
  const byTitle = new Map(existing.map((item) => [item.title.toLowerCase(), item]));
  const incoming = new Set(data.knowledge.map((item) => item.title.toLowerCase()));

  const toCreate = data.knowledge.filter((item) => !byTitle.has(item.title.toLowerCase()));
  const toUpdate = data.knowledge.filter((item) => {
    const current = byTitle.get(item.title.toLowerCase());
    return (
      current &&
      (current.type !== item.type ||
        current.content !== item.content ||
        current.status !== "PUBLISHED")
    );
  });
  const unchanged = data.knowledge.length - toCreate.length - toUpdate.length;
  const leftovers = existing.filter(
    (item) => !incoming.has(item.title.toLowerCase()) && item.status !== "ARCHIVED",
  );

  const profile = Object.fromEntries(
    PROFILE_FIELDS.filter((field) => data.company[field] !== undefined).map((field) => [
      field,
      data.company[field],
    ]),
  );

  console.log(`\n── ${company.name} (${data.company.slug}) ${options.dryRun ? "(en seco)" : ""}`);
  console.log(`   nuevas      : ${toCreate.length}`);
  toCreate.forEach((item) => console.log(`     + ${item.title}`));
  console.log(`   actualizadas: ${toUpdate.length}`);
  toUpdate.forEach((item) => console.log(`     ~ ${item.title}`));
  console.log(`   sin cambios : ${unchanged}`);

  if (leftovers.length > 0) {
    console.log(
      options.prune
        ? `   archivadas  : ${leftovers.length}`
        : `   fuera del archivo (no se tocan; usa --prune para archivarlas): ${leftovers.length}`,
    );
    leftovers.forEach((item) => console.log(`     ${options.prune ? "-" : "?"} ${item.title}`));
  }
  if (options.company) {
    console.log(`   perfil      : ${Object.keys(profile).join(", ") || "(sin campos en el archivo)"}`);
  }

  if (options.dryRun) return;

  await prisma.$transaction(
    async (tx) => {
      for (const item of toCreate) {
        await tx.knowledgeSource.create({
          data: { companyId: company.id, ...item, status: "PUBLISHED" },
        });
      }
      for (const item of toUpdate) {
        const current = byTitle.get(item.title.toLowerCase())!;
        await tx.knowledgeSource.update({
          where: { id: current.id },
          data: { title: item.title, type: item.type, content: item.content, status: "PUBLISHED" },
        });
      }
      if (options.prune && leftovers.length > 0) {
        await tx.knowledgeSource.updateMany({
          where: { companyId: company.id, id: { in: leftovers.map((item) => item.id) } },
          data: { status: "ARCHIVED" },
        });
      }
      if (options.company && Object.keys(profile).length > 0) {
        await tx.company.update({ where: { id: company.id }, data: profile });
      }
    },
    { maxWait: 20_000, timeout: 90_000 },
  );
}

interface Options {
  dryRun: boolean;
  prune: boolean;
  company: boolean;
  single: boolean;
}

async function main() {
  const options: Options = {
    dryRun: hasFlag("dry-run"),
    prune: hasFlag("prune"),
    company: hasFlag("company"),
    single: Boolean(arg("file")),
  };
  const files = resolveFiles();

  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1] ?? "desconocido";
  console.log(
    `\n${options.dryRun ? "Revisando" : "Actualizando"} la base de conocimiento de ${files.length} empresa(s) — base: ${host}`,
  );

  // Se valida todo antes de escribir nada: un archivo roto no deja a medias a los demás.
  const parsed = files.map(readFile);
  for (const { data, label } of parsed) {
    await update(data, label, options);
  }

  console.log();
}

main()
  .catch((error) => {
    console.error("\n✗ Falló la actualización:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
