/**
 * Base de datos PostgreSQL local para desarrollo, sin instalar nada global.
 *
 * Uso:
 *   npm i -D embedded-postgres     # solo la primera vez
 *   npm run db:local               # deja esta terminal abierta
 *
 * Conexión resultante (ya documentada en .env.example):
 *   postgresql://agentflow:agentflow@localhost:55432/agentflow_lite
 *
 * Los datos se guardan en ./.localdb (ignorado por git).
 * Si prefieres Supabase, Docker o un Postgres instalado, ignora este script
 * y solo cambia DATABASE_URL en .env.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, ".localdb");
const PORT = 55432;
const URL = `postgresql://agentflow:agentflow@localhost:${PORT}/agentflow_lite`;

/** ¿Hay algo escuchando ya en el puerto? */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net
      .connect({ port, host: "127.0.0.1" })
      .setTimeout(1000)
      .on("connect", () => {
        socket.end();
        resolve(true);
      })
      .on("timeout", () => {
        socket.destroy();
        resolve(false);
      })
      .on("error", () => resolve(false));
  });
}

/** PID del postmaster registrado en el lock file, si sigue vivo. */
function runningPostmasterPid() {
  const lockFile = join(dataDir, "postmaster.pid");
  if (!existsSync(lockFile)) return null;

  const pid = Number(readFileSync(lockFile, "utf8").split("\n")[0]);
  if (!Number.isInteger(pid) || pid <= 0) return null;

  try {
    process.kill(pid, 0); // solo comprueba existencia
    return pid;
  } catch {
    return null; // lock file huérfano (el proceso ya no existe)
  }
}

// ── 1. ¿Ya está corriendo? ───────────────────────────────────────────────────
const pid = runningPostmasterPid();
if (pid || (await isPortInUse(PORT))) {
  console.log("");
  console.log(`  PostgreSQL local YA está corriendo${pid ? ` (PID ${pid})` : ""}.`);
  console.log(`  Úsalo directamente:  ${URL}`);
  console.log("");
  console.log("  No necesitas abrir otra instancia: ya puedes ejecutar `npm run dev`.");
  console.log(`  Para detenerlo:  kill ${pid ?? "<pid>"}`);
  console.log("");
  process.exit(0);
}

// Lock file huérfano de un cierre abrupto: se puede limpiar sin riesgo.
const staleLock = join(dataDir, "postmaster.pid");
if (existsSync(staleLock)) {
  console.log("• Limpiando postmaster.pid huérfano de un cierre previo …");
  rmSync(staleLock);
}

// ── 2. Cargar la dependencia opcional ────────────────────────────────────────
let EmbeddedPostgres;
try {
  ({ default: EmbeddedPostgres } = await import("embedded-postgres"));
} catch {
  console.error(
    [
      "",
      "  Falta la dependencia opcional `embedded-postgres`.",
      "",
      "  Instálala con:  npm i -D embedded-postgres",
      "  Luego ejecuta:  npm run db:local",
      "",
      "  (Alternativas: Supabase, Docker o un PostgreSQL instalado — ver README)",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "agentflow",
  password: "agentflow",
  port: PORT,
  persistent: true,
});

// ── 3. Arrancar ──────────────────────────────────────────────────────────────
try {
  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    console.log("• Inicializando PostgreSQL local en ./.localdb …");
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase("agentflow_lite");
    console.log("• Base de datos `agentflow_lite` creada");
  } catch {
    console.log("• Base de datos `agentflow_lite` ya existía");
  }
} catch (error) {
  console.error("");
  console.error("  No se pudo iniciar PostgreSQL local.");
  console.error(`  Detalle: ${error?.message ?? error}`);
  console.error("");
  console.error("  Sugerencias:");
  console.error(`   • Revisa si el puerto ${PORT} está ocupado:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
  console.error("   • Borra ./.localdb para empezar de cero (se pierden los datos demo)");
  console.error("     y vuelve a ejecutar: npm run db:local && npm run prisma:migrate && npm run prisma:seed");
  console.error("");
  process.exit(1);
}

console.log("");
console.log("  PostgreSQL local listo en:");
console.log(`  ${URL}`);
console.log("");
console.log("  Deja esta terminal abierta. Ctrl+C para detenerlo.");
console.log("");

const shutdown = async () => {
  console.log("\n• Deteniendo PostgreSQL local …");
  await pg.stop().catch(() => {});
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
