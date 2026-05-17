#!/usr/bin/env node
/**
 * queue-processor-daemon.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B3/U-QUEUE-PROCESSOR — daemon + cron runner.
 *
 * Drives `QueueProcessorEngine` end-to-end:
 *   1. Loads the TS engine via `tsx/esm/api` (no build dependency).
 *   2. Resolves an Ollama-generate adapter if the daemon is reachable;
 *      otherwise the engine's claude-flag fallback owns the output.
 *   3. Either:
 *      a. `--once` — single processQueue() pass and exits (cron entry).
 *      b. `--watch` — fs.watch the queue dir + debounced re-process loop.
 *   4. Emits a one-line JSON status to stdout per pass for the cron log.
 *
 * Usage:
 *   node scripts/queue-processor-daemon.mjs --once             # cron entry
 *   node scripts/queue-processor-daemon.mjs --watch            # long-running watcher
 *   node scripts/queue-processor-daemon.mjs --once --dry-run   # scan only, no writes
 *   node scripts/queue-processor-daemon.mjs --once --no-ollama # force claude-flag mode
 *   node scripts/queue-processor-daemon.mjs --once --queue <p> # override queue root
 *   node scripts/queue-processor-daemon.mjs --once --json      # status as JSON only
 *
 * Exit codes:
 *   0 — at least one entry processed (or empty queue, which is also "OK")
 *   1 — synthesizer / engine failure
 *   2 — argv parse error
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, watch as fsWatch, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ENGINE_PATH = join(
  PRISM_ROOT,
  "mcp-server",
  "src",
  "engines",
  "QueueProcessorEngine.ts",
);
const CRON_LOG = join(PRISM_ROOT, "state", "shared", "queue-processor-cron.jsonl");

const OLLAMA_HOST =
  process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

// Ollama timeouts: queue items are generally larger than daily-context excerpts
// (up to 8 KiB), and qwen2.5-coder responses can take 30-90 s on a cold load.
// Default 90 s; operator can override via PRISM_QUEUE_OLLAMA_TIMEOUT_MS.
const OLLAMA_TIMEOUT_MS = (() => {
  const raw = Number(process.env.PRISM_QUEUE_OLLAMA_TIMEOUT_MS ?? 90_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 90_000;
})();
// Cap on Ollama response body to prevent OOM from a pathological reply.
const OLLAMA_MAX_BODY_BYTES = 4 * 1024 * 1024; // 4 MiB

// Watch-mode debounce: collapse a burst of fs.watch events (one per byte of a
// large file write) into a single processQueue call. 750 ms balances "operator
// dropped a file, expect a quick response" with "don't process mid-write".
const WATCH_DEBOUNCE_MS = (() => {
  const raw = Number(process.env.PRISM_QUEUE_WATCH_DEBOUNCE_MS ?? 750);
  return Number.isFinite(raw) && raw > 0 ? raw : 750;
})();

// ---- args -------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    once: false,
    watch: false,
    dryRun: false,
    noOllama: false,
    queueRoot: undefined,
    generatedRoot: undefined,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--once") opts.once = true;
    else if (a === "--watch") opts.watch = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--no-ollama") opts.noOllama = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--queue") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) {
        console.error("--queue requires a path argument");
        process.exit(2);
      }
      opts.queueRoot = resolve(v);
    } else if (a === "--generated") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) {
        console.error("--generated requires a path argument");
        process.exit(2);
      }
      opts.generatedRoot = resolve(v);
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node scripts/queue-processor-daemon.mjs (--once | --watch) " +
          "[--dry-run] [--no-ollama] [--queue PATH] [--generated PATH] [--json]",
      );
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  // Mutually exclusive modes; default to --once when neither is set so a bare
  // invocation is "drain the queue once" (cron-friendly).
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

/**
 * Build an OllamaQueueClient that uses /api/generate. Returns null body on
 * any setup failure — the engine treats null body as route-downgrade-to-claude.
 */
function buildOllamaClient() {
  return {
    async generate({ model, system, prompt }) {
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
        try {
          j = JSON.parse(bodyText);
        } catch {
          return null;
        }
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
  // tsx isn't installed at the repo root; resolve it from mcp-server/.
  // Same pattern as run-daily-context.mjs + tribal-consolidate-weekly.mjs.
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
  const engineOpts = {
    queueRoot: opts.queueRoot,
    generatedRoot: opts.generatedRoot,
    ollamaClient,
    ollamaModel: "qwen2.5-coder",
    dryRun: opts.dryRun,
    now: Date.now(),
  };

  let result;
  try {
    result = await engineMod.runQueueProcessor(engineOpts);
  } catch (err) {
    return {
      ok: false,
      stage: "process",
      error: String(err?.message ?? err),
    };
  }

  return {
    ok: true,
    generatedAt: result.generatedAt,
    queueRoot: result.scan.queueRoot,
    entriesScanned: result.scan.entries.length,
    candidateFilesFound: result.scan.availability.candidateFilesFound,
    summary: result.summary,
    meetsProcessingFloor: result.meetsProcessingFloor,
    synthesizer: result.synthesizer,
    warningsCount: result.warnings.length,
    warnings: result.warnings.slice(0, 5),
    durationMs: result.durationMs,
  };
}

// ---- watch mode -------------------------------------------------------------

async function runWatch(engineMod, opts, ollamaClient) {
  // Resolve queueRoot via a no-op dry-run scan so we honour the engine's
  // default-root resolution rather than recomputing it here.
  const initialScan = await engineMod.queueProcessorEngine.scanQueue({
    queueRoot: opts.queueRoot,
    generatedRoot: opts.generatedRoot,
  });
  const queueRoot = initialScan.queueRoot;
  const generatedRoot = initialScan.generatedRoot;
  if (!existsSync(queueRoot)) {
    console.error(
      `[watch] queue root does not exist: ${queueRoot}\n` +
        `[watch] create it first: mkdir -p ${queueRoot}`,
    );
    process.exit(1);
  }
  // Guard against infinite write→event→pass→write loop if a misconfig puts
  // generatedRoot inside queueRoot. fs.watch is non-recursive on Win by
  // default so subdir events don't fire, but on Linux+macOS recursive-by-
  // observation differs; defensive reject is cheap. (Arm B P1#1.)
  const sep = queueRoot.includes("\\") ? "\\" : "/";
  if (generatedRoot === queueRoot || generatedRoot.startsWith(queueRoot + sep)) {
    console.error(
      `[watch] generatedRoot must not be inside queueRoot (would loop): ` +
        `queueRoot=${queueRoot} generatedRoot=${generatedRoot}`,
    );
    process.exit(1);
  }

  console.error(`[watch] watching ${queueRoot} (debounce ${WATCH_DEBOUNCE_MS}ms)`);

  // Initial pass on startup — process anything sitting in the queue.
  const startup = await runOnce(engineMod, opts, ollamaClient);
  emitStatus(startup, opts.json);
  appendCronLog(startup);

  let debounceTimer = null;
  let inFlight = false;
  let queuedPass = false;

  const triggerPass = () => {
    if (inFlight) {
      queuedPass = true;
      return;
    }
    inFlight = true;
    // Intentionally fire-and-forget: this Promise drives the next pass; its
    // final `inFlight = false` is what allows triggerPass() to be called again.
    // All errors are caught inside (try/finally + runOnce never throws).
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
          // Reset debounce so we don't immediately re-trigger.
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(triggerPass, WATCH_DEBOUNCE_MS);
        }
      }
    })();
  };

  const watcher = fsWatch(queueRoot, { persistent: true }, (eventType, filename) => {
    // Ignore events for our own write targets (.processed/, .claude-queue/).
    if (filename === ".processed" || filename === ".claude-queue") return;
    if (filename && filename.startsWith(".")) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerPass, WATCH_DEBOUNCE_MS);
  });
  // Watcher error handler — without this, a deleted queueRoot crashes the
  // process via unhandled exception. (Arm B P2#5.) Fail-loud per R12 rather
  // than silently stop firing.
  watcher.on("error", (err) => {
    console.error(`[watch] fs.watch error: ${String(err?.message ?? err)}`);
    process.exit(1);
  });

  // Graceful shutdown — clear timer + close watcher so the runner exits
  // cleanly. Without these the daemon hangs on SIGTERM/SIGINT.
  const shutdown = (signal) => {
    console.error(`[watch] received ${signal}, shutting down`);
    if (debounceTimer) clearTimeout(debounceTimer);
    try {
      watcher.close();
    } catch {
      /* swallow */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// ---- status emission --------------------------------------------------------

function emitStatus(status, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(status));
    return;
  }
  if (!status.ok) {
    console.error(`queue-processor: ${status.stage} failed: ${status.error}`);
    return;
  }
  const s = status.summary;
  console.log(
    `queue-processor: scanned=${status.entriesScanned}/${status.candidateFilesFound} ` +
      `ollama=${s.ollama} claude=${s.claude} rejected=${s.rejected} ` +
      `skipped=${s.skipped} failed=${s.failed} ` +
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
      `queue-processor: cron-log append failed: ${String(err?.message ?? err)}\n`,
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
    const status = {
      ok: false,
      stage: "load-engine",
      error: String(err?.message ?? err),
    };
    appendCronLog(status);
    if (opts.json) console.log(JSON.stringify(status));
    else console.error(`queue-processor: ${status.stage}: ${status.error}`);
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

  // --once mode
  const status = await runOnce(engineMod, opts, ollamaClient);
  appendCronLog(status);
  emitStatus(status, opts.json);
  process.exit(status.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`queue-processor: fatal: ${err?.message ?? err}`);
  process.exit(1);
});
