#!/usr/bin/env node
/**
 * run-daily-context.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW — cron runner.
 *
 * Drives `DailyContextWorkflowEngine` end-to-end:
 *   1. Loads the TS engine via `tsx/esm/api` (no build dependency).
 *   2. Resolves an Ollama-summariser adapter if the daemon is reachable;
 *      otherwise the engine's literal fallback owns the output.
 *   3. Calls `buildAndOptionallyWriteDailyContext({write:true})` to write
 *      `${vaultRoot}/generated/DAILY-CONTEXT-YYYY-MM-DD.md`.
 *   4. Emits a one-line JSON status to stdout for the cron log.
 *
 * Usage:
 *   node scripts/run-daily-context.mjs               # write today's brief
 *   node scripts/run-daily-context.mjs --dry-run     # print to stdout, no write
 *   node scripts/run-daily-context.mjs --no-ollama   # force literal mode
 *   node scripts/run-daily-context.mjs --vault <p>   # override vault root
 *   node scripts/run-daily-context.mjs --json        # status as JSON only
 *
 * Exit codes: 0 = brief produced (or dry-run OK); 1 = synth failure.
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ENGINE_PATH = join(PRISM_ROOT, "mcp-server", "src", "engines", "DailyContextWorkflowEngine.ts");
const CRON_LOG = join(PRISM_ROOT, "state", "shared", "daily-context-cron.jsonl");

const OLLAMA_HOST = process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_TIMEOUT_MS = (() => {
  const raw = Number(process.env.PRISM_DAILY_CONTEXT_OLLAMA_TIMEOUT_MS ?? 30_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
})();
// Cap on Ollama response body so a pathological reply can't OOM the cron.
const OLLAMA_MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MiB

// ---- args -------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { dryRun: false, noOllama: false, vaultRoot: undefined, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--no-ollama") opts.noOllama = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--vault") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) {
        console.error("--vault requires a path argument");
        process.exit(2);
      }
      opts.vaultRoot = resolve(v);
    }
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/run-daily-context.mjs [--dry-run] [--no-ollama] [--vault PATH] [--json]");
      process.exit(0);
    }
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
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
 * Build an OllamaSummariseClient that uses /api/generate. Returns null on
 * any setup failure — the engine treats null client as literal mode.
 */
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
        // Body-size guard: read as text with a cap to prevent OOM from a
        // pathological response (proxy mis-config, gateway-injected payload).
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

// ---- main -------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);

  // Load the TS engine via tsx loader resolved from mcp-server/node_modules.
  // (tsx isn't installed at the repo root, so we can't bare-import it from
  // here — same pattern as tribal-consolidate-weekly.mjs.)
  let engineMod;
  try {
    const { createRequire } = await import("node:module");
    const { pathToFileURL } = await import("node:url");
    const mcpPkgRequire = createRequire(pathToFileURL(join(PRISM_ROOT, "mcp-server", "package.json")));
    const tsxApiPath = mcpPkgRequire.resolve("tsx/esm/api");
    const tsx = await import(pathToFileURL(tsxApiPath).href);
    engineMod = await tsx.tsImport(pathToFileURL(ENGINE_PATH).href, import.meta.url);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, stage: "load-engine", error: String(err?.message ?? err) }));
    process.exit(1);
  }

  // Decide Ollama vs literal.
  let ollamaClient;
  let synthesizerHint = "literal";
  if (!opts.noOllama) {
    const ollamaUp = await probeOllama();
    if (ollamaUp) {
      ollamaClient = buildOllamaClient();
      synthesizerHint = "ollama-probed";
    }
  }

  // Compose engine opts.
  const engineOpts = {
    vaultRoot: opts.vaultRoot,
    now: Date.now(),
    ollamaClient,
    ollamaModel: "qwen2.5-coder",
    write: !opts.dryRun,
  };

  let brief;
  try {
    brief = await engineMod.buildAndOptionallyWriteDailyContext(engineOpts);
  } catch (err) {
    const status = { ok: false, stage: "synthesize", synthesizerHint, error: String(err?.message ?? err) };
    appendCronLog(status);
    if (opts.json) console.log(JSON.stringify(status));
    else console.error(`daily-context: synthesize failed: ${status.error}`);
    process.exit(1);
  }

  const status = {
    ok: true,
    briefDate: brief.briefDate,
    written: brief.written,
    outputPath: brief.outputPath,
    sourceCount: brief.sourceCount,
    meetsSourceFloor: brief.meetsSourceFloor,
    synthesizer: brief.synthesizer,
    durationMs: brief.durationMs,
    warnings: brief.warnings,
    generatedAt: brief.generatedAt,
  };
  appendCronLog(status);

  if (opts.json) {
    // Always single-line JSON on stdout when --json is requested, INCLUDING
    // the dry-run case (arm-A P0-4 / arm-B P1-5 fix). For dry-run we embed
    // the markdown into the JSON so CI consumers get one parseable line.
    const payload = opts.dryRun ? { ...status, dryRun: true, markdown: brief.markdown } : status;
    console.log(JSON.stringify(payload));
  } else if (opts.dryRun) {
    // Human dry-run: markdown to stdout, hint to stderr (won't pollute the JSON path).
    process.stdout.write(brief.markdown);
    process.stderr.write(`\n[dry-run] would have written: ${brief.outputPath}\n`);
  } else {
    console.log(`daily-context: wrote ${brief.outputPath} (sources=${brief.sourceCount}, synth=${brief.synthesizer}, floor=${brief.meetsSourceFloor})`);
    if (brief.warnings.length > 0) {
      console.log(`  warnings: ${brief.warnings.join("; ")}`);
    }
  }
}

function appendCronLog(status) {
  try {
    mkdirSync(dirname(CRON_LOG), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...status }) + "\n";
    writeFileSync(CRON_LOG, line, { flag: "a" });
  } catch (err) {
    // Log-write failure is non-fatal (the cron still produced the brief +
    // emitted status to stdout) but surface it on stderr instead of silently
    // swallowing — arm-B P2-3 (R12 fail-loud for degraded paths).
    process.stderr.write(`daily-context: cron-log append failed: ${String(err?.message ?? err)}\n`);
  }
}

main().catch((err) => {
  console.error(`daily-context: fatal: ${err?.message ?? err}`);
  process.exit(1);
});
