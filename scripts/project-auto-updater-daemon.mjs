#!/usr/bin/env node
/**
 * project-auto-updater-daemon.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B5/U-PROJECT-AUTO-UPDATER — daemon + cron runner.
 *
 * Drives `ProjectAutoUpdaterEngine`:
 *   1. Loads the TS engine via `tsx/esm/api` (no build dependency).
 *   2. Resolves an Ollama-summarise adapter if reachable; else literal mode.
 *   3. Either:
 *      a. `--once` — single processProjects() pass + exit (cron entry).
 *      b. `--watch` — fs.watch the project root with debounced re-process.
 *   4. Emits one-line JSON status per pass to the cron log.
 *
 * Usage:
 *   node scripts/project-auto-updater-daemon.mjs --once
 *   node scripts/project-auto-updater-daemon.mjs --watch
 *   node scripts/project-auto-updater-daemon.mjs --once --dry-run
 *   node scripts/project-auto-updater-daemon.mjs --once --no-ollama
 *   node scripts/project-auto-updater-daemon.mjs --once --project <p> --json
 *
 * Exit codes: 0 = pass OK (or empty), 1 = engine failure, 2 = argv error.
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, watch as fsWatch, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ENGINE_PATH = join(
  PRISM_ROOT, "mcp-server", "src", "engines", "ProjectAutoUpdaterEngine.ts",
);
const CRON_LOG = join(PRISM_ROOT, "state", "shared", "project-auto-updater-cron.jsonl");

const OLLAMA_HOST =
  process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_TIMEOUT_MS = (() => {
  const raw = Number(process.env.PRISM_PAU_OLLAMA_TIMEOUT_MS ?? 60_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
})();
const OLLAMA_MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MiB
const WATCH_DEBOUNCE_MS = (() => {
  const raw = Number(process.env.PRISM_PAU_WATCH_DEBOUNCE_MS ?? 1000);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
})();

// ---- args -------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    once: false, watch: false, dryRun: false, noOllama: false,
    vaultRoot: undefined, projectRoot: undefined, json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--once") opts.once = true;
    else if (a === "--watch") opts.watch = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--no-ollama") opts.noOllama = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--vault") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) { console.error("--vault requires a path"); process.exit(2); }
      opts.vaultRoot = resolve(v);
    } else if (a === "--project") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) { console.error("--project requires a path"); process.exit(2); }
      opts.projectRoot = resolve(v);
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node scripts/project-auto-updater-daemon.mjs (--once | --watch) " +
          "[--dry-run] [--no-ollama] [--vault PATH] [--project PATH] [--json]",
      );
      process.exit(0);
    } else { console.error(`Unknown arg: ${a}`); process.exit(2); }
  }
  if (opts.once && opts.watch) {
    console.error("--once and --watch are mutually exclusive");
    process.exit(2);
  }
  if (!opts.once && !opts.watch) opts.once = true;
  return opts;
}

// ---- ollama probe + adapter -------------------------------------------------

async function probeOllama() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

function buildOllamaClient() {
  return {
    async summarise({ model, system, prompt }) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
      try {
        const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, system, prompt, stream: false }),
          signal: ctrl.signal,
        });
        if (!res.ok) return null;
        const cl = Number(res.headers.get("content-length"));
        if (Number.isFinite(cl) && cl > OLLAMA_MAX_BODY_BYTES) return null;
        const bodyText = await res.text();
        if (bodyText.length > OLLAMA_MAX_BODY_BYTES) return null;
        let j;
        try { j = JSON.parse(bodyText); } catch { return null; }
        if (j === null || typeof j !== "object") return null;
        const out = typeof j.response === "string" ? j.response.trim() : null;
        return out && out.length > 0 ? out : null;
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    },
  };
}

// ---- engine loader (tsx) ----------------------------------------------------

async function loadEngineModule() {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const mcpPkgRequire = createRequire(
    pathToFileURL(join(PRISM_ROOT, "mcp-server", "package.json")),
  );
  const tsxApiPath = mcpPkgRequire.resolve("tsx/esm/api");
  const tsx = await import(pathToFileURL(tsxApiPath).href);
  return tsx.tsImport(pathToFileURL(ENGINE_PATH).href, import.meta.url);
}

// ---- single pass ------------------------------------------------------------

async function runOnce(engineMod, opts, ollamaClient) {
  let result;
  try {
    result = await engineMod.runProjectAutoUpdater({
      vaultRoot: opts.vaultRoot,
      projectRoot: opts.projectRoot,
      ollamaClient,
      ollamaModel: "qwen2.5-coder",
      dryRun: opts.dryRun,
      now: Date.now(),
    });
  } catch (err) {
    return { ok: false, stage: "process", error: String(err?.message ?? err) };
  }
  return {
    ok: true,
    generatedAt: result.generatedAt,
    projectRoot: result.scan.projectRoot,
    foldersScanned: result.scan.changes.length,
    foldersFound: result.scan.availability.projectFoldersFound,
    summary: result.summary,
    meetsProcessingFloor: result.meetsProcessingFloor,
    synthesizer: result.synthesizer,
    warnings: result.warnings.slice(0, 5),
    durationMs: result.durationMs,
  };
}

// ---- watch mode -------------------------------------------------------------

async function runWatch(engineMod, opts, ollamaClient) {
  const initialScan = await engineMod.projectAutoUpdaterEngine.scanProjects({
    vaultRoot: opts.vaultRoot,
    projectRoot: opts.projectRoot,
  });
  const projectRoot = initialScan.projectRoot;
  if (!existsSync(projectRoot)) {
    console.error(
      `[watch] project root does not exist: ${projectRoot}\n` +
        `[watch] create it first: mkdir -p ${projectRoot}`,
    );
    process.exit(1);
  }
  console.error(`[watch] watching ${projectRoot} (debounce ${WATCH_DEBOUNCE_MS}ms)`);

  const startup = await runOnce(engineMod, opts, ollamaClient);
  emitStatus(startup, opts.json);
  appendCronLog(startup);

  let debounceTimer = null;
  let inFlight = false;
  let queuedPass = false;

  const triggerPass = () => {
    if (inFlight) { queuedPass = true; return; }
    inFlight = true;
    void (async () => {
      try {
        const status = await runOnce(engineMod, opts, ollamaClient);
        emitStatus(status, opts.json);
        appendCronLog(status);
      } catch (err) {
        const fail = { ok: false, stage: "process", error: String(err?.message ?? err) };
        emitStatus(fail, opts.json);
        appendCronLog(fail);
      } finally {
        inFlight = false;
        if (queuedPass) {
          queuedPass = false;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(triggerPass, WATCH_DEBOUNCE_MS);
        }
      }
    })();
  };

  // recursive:true so a note edited inside any project subfolder fires. The
  // engine writes overview.md; the change-signature dedupe prevents an
  // infinite write→event→pass loop (the next pass sees the signature already
  // recorded and skips). Still ignore the .tmp churn.
  const watcher = fsWatch(
    projectRoot, { persistent: true, recursive: true },
    (eventType, filename) => {
      if (filename && (filename.endsWith(".tmp") || filename.startsWith("."))) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerPass, WATCH_DEBOUNCE_MS);
    },
  );
  watcher.on("error", (err) => {
    console.error(`[watch] fs.watch error: ${String(err?.message ?? err)}`);
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.error(`[watch] received ${signal}, shutting down`);
    if (debounceTimer) clearTimeout(debounceTimer);
    try { watcher.close(); } catch { /* swallow */ }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// ---- status emission --------------------------------------------------------

function emitStatus(status, jsonMode) {
  if (jsonMode) { console.log(JSON.stringify(status)); return; }
  if (!status.ok) {
    console.error(`project-auto-updater: ${status.stage} failed: ${status.error}`);
    return;
  }
  const s = status.summary;
  console.log(
    `project-auto-updater: scanned=${status.foldersScanned}/${status.foldersFound} ` +
      `ollama=${s.ollama} literal=${s.literal} skipped=${s.skipped} ` +
      `rejected=${s.rejected} failed=${s.failed} ` +
      `floor=${status.meetsProcessingFloor} synth=${status.synthesizer}`,
  );
  if (status.warnings.length > 0) {
    for (const w of status.warnings) console.log(`  warn: ${w}`);
  }
}

function appendCronLog(status) {
  try {
    mkdirSync(dirname(CRON_LOG), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...status }) + "\n";
    writeFileSync(CRON_LOG, line, { flag: "a" });
  } catch (err) {
    process.stderr.write(
      `project-auto-updater: cron-log append failed: ${String(err?.message ?? err)}\n`,
    );
  }
}

// ---- main -------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);

  let engineMod;
  try {
    engineMod = await loadEngineModule();
  } catch (err) {
    const status = { ok: false, stage: "load-engine", error: String(err?.message ?? err) };
    appendCronLog(status);
    if (opts.json) console.log(JSON.stringify(status));
    else console.error(`project-auto-updater: ${status.stage}: ${status.error}`);
    process.exit(1);
  }

  let ollamaClient;
  if (!opts.noOllama) {
    const ollamaUp = await probeOllama();
    if (ollamaUp) ollamaClient = buildOllamaClient();
  }

  if (opts.watch) {
    await runWatch(engineMod, opts, ollamaClient);
    return;
  }

  const status = await runOnce(engineMod, opts, ollamaClient);
  appendCronLog(status);
  emitStatus(status, opts.json);
  process.exit(status.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`project-auto-updater: fatal: ${err?.message ?? err}`);
  process.exit(1);
});
