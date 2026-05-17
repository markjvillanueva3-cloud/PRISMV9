#!/usr/bin/env node
/**
 * run-knowledge-distillation.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION — cron entrypoint.
 *
 * Loads KnowledgeDistillationEngine via tsx/esm/api (no build dependency),
 * probes Ollama, and runs one distill pass. Emits one-line JSON status to
 * stdout + appends to the cron log. Invoked by
 * scripts/cron/knowledge-distillation-cron.ps1 (monthly) or manually.
 *
 * Usage:
 *   node scripts/run-knowledge-distillation.mjs            # write DISTILL refs
 *   node scripts/run-knowledge-distillation.mjs --dry-run  # scan only
 *   node scripts/run-knowledge-distillation.mjs --no-ollama
 *   node scripts/run-knowledge-distillation.mjs --json
 *
 * Exit codes: 0 = pass OK (or empty), 1 = engine failure, 2 = argv error.
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ENGINE_PATH = join(
  PRISM_ROOT, "mcp-server", "src", "engines", "KnowledgeDistillationEngine.ts",
);
const CRON_LOG = join(PRISM_ROOT, "state", "shared", "knowledge-distillation-cron.jsonl");

const OLLAMA_HOST =
  process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_TIMEOUT_MS = (() => {
  const raw = Number(process.env.PRISM_KD_OLLAMA_TIMEOUT_MS ?? 120_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 120_000;
})();
const OLLAMA_MAX_BODY_BYTES = 4 * 1024 * 1024;

function parseArgs(argv) {
  const opts = { dryRun: false, noOllama: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--no-ollama") opts.noOllama = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/run-knowledge-distillation.mjs [--dry-run] [--no-ollama] [--json]");
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

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

function appendCronLog(status) {
  try {
    mkdirSync(dirname(CRON_LOG), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...status }) + "\n";
    writeFileSync(CRON_LOG, line, { flag: "a" });
  } catch (err) {
    process.stderr.write(
      `knowledge-distillation: cron-log append failed: ${String(err?.message ?? err)}\n`,
    );
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  let engineMod;
  try {
    engineMod = await loadEngineModule();
  } catch (err) {
    const status = { ok: false, stage: "load-engine", error: String(err?.message ?? err) };
    appendCronLog(status);
    if (opts.json) console.log(JSON.stringify(status));
    else console.error(`knowledge-distillation: ${status.stage}: ${status.error}`);
    process.exit(1);
  }

  let ollamaClient;
  if (!opts.noOllama) {
    const up = await probeOllama();
    if (up) ollamaClient = buildOllamaClient();
  }

  let result;
  try {
    result = await engineMod.runKnowledgeDistillation({
      ollamaClient,
      ollamaModel: "qwen2.5-coder",
      dryRun: opts.dryRun,
      now: Date.now(),
    });
  } catch (err) {
    const status = { ok: false, stage: "distill", error: String(err?.message ?? err) };
    appendCronLog(status);
    if (opts.json) console.log(JSON.stringify(status));
    else console.error(`knowledge-distillation: distill failed: ${status.error}`);
    process.exit(1);
  }

  const status = {
    ok: true,
    generatedAt: result.generatedAt,
    referencesRoot: result.scan.referencesRoot,
    clusters: result.scan.clusters.length,
    notesFoundInWindow: result.scan.availability.notesFoundInWindow,
    summary: result.summary,
    meetsProcessingFloor: result.meetsProcessingFloor,
    synthesizer: result.synthesizer,
    warnings: result.warnings.slice(0, 5),
    durationMs: result.durationMs,
  };
  appendCronLog(status);

  if (opts.json) {
    console.log(JSON.stringify(status));
  } else {
    const s = result.summary;
    console.log(
      `knowledge-distillation: clusters=${status.clusters} ollama=${s.ollama} ` +
        `literal=${s.literal} skipped=${s.skipped} rejected=${s.rejected} ` +
        `failed=${s.failed} floor=${status.meetsProcessingFloor} synth=${status.synthesizer}`,
    );
    if (status.warnings.length > 0) {
      for (const w of status.warnings) console.log(`  warn: ${w}`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(`knowledge-distillation: fatal: ${err?.message ?? err}`);
  process.exit(1);
});
