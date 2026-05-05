#!/usr/bin/env node
/**
 * populate-tribal-vault.mjs — one-shot population of knowledge/tribal/
 * from the in-memory TribalKnowledgeEngine ledger.
 *
 * Reads every tip via TribalKnowledgeEngine.search({limit: 99999}) and
 * hands the array to TribalVaultPopulatorEngine.populate() which writes
 * one .md file per tip with frontmatter + Obsidian wikilink backlinks.
 *
 * Designed as a one-shot batch op (P1-U03 deliverable). Idempotent on
 * each tip's content hash so reruns are cheap. The MemoryConsolidation
 * Stop hook (P1-U02) handles incremental writes for newly-discovered
 * patterns; this script's job is the initial backfill.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U03.
 *
 * Usage:
 *   node mcp-server/scripts/populate-tribal-vault.mjs               # default
 *   node mcp-server/scripts/populate-tribal-vault.mjs --quiet       # no stdout
 *   node mcp-server/scripts/populate-tribal-vault.mjs --dry-run     # plan only
 *   node mcp-server/scripts/populate-tribal-vault.mjs --json        # JSON summary
 *   node mcp-server/scripts/populate-tribal-vault.mjs --max=500     # cap tip count
 *   node mcp-server/scripts/populate-tribal-vault.mjs --no-embed    # skip Qdrant attempt
 *
 * Env overrides:
 *   PRISM_TRIBAL_DIR         — vault root (default: H:/prism/knowledge/tribal)
 *   PRISM_TRIBAL_MAX_TIPS    — default 99999
 *   PRISM_QDRANT_URL         — Qdrant base URL (default: http://127.0.0.1:6333)
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const TRIBAL_ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "TribalKnowledgeEngine.js");
const TRIBAL_ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "TribalKnowledgeEngine.ts");
const POPULATOR_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "TribalVaultPopulatorEngine.js");
const POPULATOR_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "TribalVaultPopulatorEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const LOG_FILE = process.env.PRISM_TRIBAL_VAULT_LOG
  ?? join(REPO_ROOT, "state", "shared", "tribal-vault-populate.log");

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const DRY_RUN = args.has("--dry-run");
const JSON_OUT = args.has("--json");
const NO_EMBED = args.has("--no-embed");
const MAX_TIPS = (() => {
  const arg = [...args].find((a) => a.startsWith("--max="));
  if (arg) return Number.parseInt(arg.split("=")[1], 10);
  return Number.parseInt(process.env.PRISM_TRIBAL_MAX_TIPS ?? "99999", 10);
})();

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

async function loadTipsViaTsx() {
  const bootstrapPath = join(tmpdir(), `tribal-load-${process.pid}-${Date.now()}.mts`);
  const code = [
    `import { tribalKnowledgeEngine } from ${JSON.stringify(pathToFileURL(TRIBAL_ENGINE_SRC).href)};`,
    `try {`,
    `  const tips = tribalKnowledgeEngine.search({ limit: ${MAX_TIPS} });`,
    `  process.stdout.write(JSON.stringify({ ok: true, tips }));`,
    `} catch (e) {`,
    `  process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e), tips: [] }));`,
    `}`,
  ].join("\n");
  writeFileSync(bootstrapPath, code, "utf-8");
  return await new Promise((resolve) => {
    const child = spawn(TSX_BIN, [bootstrapPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString("utf-8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf-8"); });
    child.on("close", () => {
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch {
        log(`load tips stdout=${stdout.slice(0, 200)} stderr=${stderr.slice(0, 200)}`);
        resolve({ ok: false, error: "tsx subprocess returned non-json", tips: [] });
      }
    });
  });
}

async function loadTipsViaDist() {
  const mod = await import(pathToFileURL(TRIBAL_ENGINE_DIST).href);
  const engine = mod.tribalKnowledgeEngine;
  const tips = engine.search({ limit: MAX_TIPS });
  return { ok: true, tips };
}

async function loadPopulator() {
  if (existsSync(POPULATOR_DIST)) {
    const mod = await import(pathToFileURL(POPULATOR_DIST).href);
    return { mode: "dist", engine: mod.tribalVaultPopulatorEngine };
  }
  if (existsSync(POPULATOR_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`populator unavailable: dist=${existsSync(POPULATOR_DIST)} src=${existsSync(POPULATOR_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

async function runPopulateViaTsx(tips, vaultRoot, dryRun, maxBacklinks) {
  const bootstrapPath = join(tmpdir(), `tribal-populate-${process.pid}-${Date.now()}.mts`);
  // Tips can be very large; pass through a temp JSON file rather than embedding inline.
  const tipsPath = join(tmpdir(), `tribal-tips-${process.pid}-${Date.now()}.json`);
  writeFileSync(tipsPath, JSON.stringify(tips), "utf-8");
  const code = [
    `import { readFileSync } from "node:fs";`,
    `import { tribalVaultPopulatorEngine } from ${JSON.stringify(pathToFileURL(POPULATOR_SRC).href)};`,
    `try {`,
    `  const tips = JSON.parse(readFileSync(${JSON.stringify(tipsPath)}, "utf-8"));`,
    `  const r = await tribalVaultPopulatorEngine.populate({`,
    `    tips,`,
    `    vaultRoot: ${JSON.stringify(vaultRoot)},`,
    `    dryRun: ${dryRun},`,
    `    maxBacklinks: ${maxBacklinks},`,
    `  });`,
    `  process.stdout.write(JSON.stringify(r));`,
    `} catch (e) {`,
    `  process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));`,
    `}`,
  ].join("\n");
  writeFileSync(bootstrapPath, code, "utf-8");
  return await new Promise((resolve) => {
    const child = spawn(TSX_BIN, [bootstrapPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString("utf-8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf-8"); });
    child.on("close", () => {
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { unlinkSync(tipsPath); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch {
        log(`populate stdout=${stdout.slice(0, 200)} stderr=${stderr.slice(0, 200)}`);
        resolve({ ok: false, error: "tsx subprocess returned non-json" });
      }
    });
  });
}

async function probeQdrant() {
  if (NO_EMBED) return { up: false, reason: "disabled by --no-embed" };
  const url = process.env.PRISM_QDRANT_URL ?? "http://127.0.0.1:6333";
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`${url}/collections`, { signal: ctrl.signal });
    clearTimeout(timeout);
    return { up: r.ok, reason: r.ok ? null : `HTTP ${r.status}` };
  } catch (e) {
    return { up: false, reason: String((e && e.message) || e) };
  }
}

async function main() {
  const start = Date.now();
  const summary = {
    ok: true,
    tipsLoaded: 0,
    filesWritten: 0,
    filesSkipped: 0,
    filesFailed: 0,
    embedAttempted: false,
    qdrantUp: false,
    durationMs: 0,
    error: null,
  };

  // Step 1: load tips
  let tipsResult;
  try {
    if (existsSync(TRIBAL_ENGINE_DIST)) {
      tipsResult = await loadTipsViaDist();
    } else {
      tipsResult = await loadTipsViaTsx();
    }
  } catch (e) {
    summary.ok = false;
    summary.error = `load tips: ${e?.message ?? e}`;
    log(summary.error);
    finish(summary, start);
    return;
  }
  if (!tipsResult.ok) {
    summary.ok = false;
    summary.error = tipsResult.error;
    log(`tip load failed: ${tipsResult.error}`);
    finish(summary, start);
    return;
  }

  const tips = Array.isArray(tipsResult.tips) ? tipsResult.tips : [];
  summary.tipsLoaded = tips.length;
  log(`loaded ${tips.length} tips`);

  if (tips.length === 0) {
    log("no tips to populate — exiting");
    finish(summary, start);
    return;
  }

  // Step 2: probe Qdrant (advisory only — actual embed gated on populator opts.embed)
  const qProbe = await probeQdrant();
  summary.qdrantUp = qProbe.up;
  if (!qProbe.up) log(`qdrant probe: down (${qProbe.reason})`);

  // Step 3: populate vault
  const vaultRoot = process.env.PRISM_TRIBAL_DIR ?? join(REPO_ROOT, "knowledge", "tribal");
  let populateResult;
  try {
    const populator = await loadPopulator();
    if (populator.mode === "tsx-subprocess") {
      populateResult = await runPopulateViaTsx(tips, vaultRoot, DRY_RUN, 5);
    } else {
      // No embed callback wired in dist mode by default — Qdrant integration is
      // a separate unit (P0-U02). When the embed callback is needed, the caller
      // can re-import this module and pass one. The advisory Qdrant probe above
      // tells operators whether the embed surface would have been reachable.
      populateResult = await populator.engine.populate({
        tips, vaultRoot, dryRun: DRY_RUN, maxBacklinks: 5,
      });
    }
  } catch (e) {
    summary.ok = false;
    summary.error = `populate: ${e?.message ?? e}`;
    log(summary.error);
    finish(summary, start);
    return;
  }

  summary.filesWritten = populateResult.filesWritten ?? 0;
  summary.filesSkipped = populateResult.filesSkipped ?? 0;
  summary.filesFailed = populateResult.filesFailed ?? 0;
  summary.ok = populateResult.ok ?? false;
  if (populateResult.error) summary.error = populateResult.error;

  log(`populate: written=${summary.filesWritten} skipped=${summary.filesSkipped} failed=${summary.filesFailed} qdrant=${summary.qdrantUp}`);
  finish(summary, start);
}

function finish(summary, start) {
  summary.durationMs = Date.now() - start;
  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(summary) + "\n");
    } else {
      process.stdout.write(
        `populate-tribal-vault: tips=${summary.tipsLoaded} written=${summary.filesWritten} skipped=${summary.filesSkipped} failed=${summary.filesFailed} qdrant=${summary.qdrantUp ? "up" : "down"} ${summary.durationMs}ms\n`,
      );
    }
  }
  process.exit(0);
}

const WATCHDOG_MS = 600_000; // 10 min — large tip batches can take a while
setTimeout(() => { log(`watchdog fired after ${WATCHDOG_MS}ms`); process.exit(0); }, WATCHDOG_MS).unref();

main().catch((e) => { log(`unhandled: ${e?.message ?? e}`); process.exit(0); });
