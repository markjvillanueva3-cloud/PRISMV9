#!/usr/bin/env node
/**
 * summarize-directives-via-ollama.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02
 *
 * Runs DirectiveSummarizerEngine across all state/shared/CLAUDE-CODEX-*.md
 * files and persists the cache at knowledge/directives/SUMMARIES.{md,json}.
 *
 * Usage:
 *   node mcp-server/scripts/summarize-directives-via-ollama.mjs           # try Ollama, fall back to heuristic per-file
 *   node mcp-server/scripts/summarize-directives-via-ollama.mjs --no-ollama
 *   node mcp-server/scripts/summarize-directives-via-ollama.mjs --stats   # print cache without rebuilding
 *   node mcp-server/scripts/summarize-directives-via-ollama.mjs --check   # report freshness, exit 3 if stale
 *
 * Exit codes:
 *   0 = success / cache fresh
 *   1 = no directives found
 *   2 = build failed (write error)
 *   3 = stale (only with --check)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENGINE_BUILT = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "DirectiveSummarizerEngine.js");
const ENGINE_SRC = path.join(REPO_ROOT, "mcp-server", "src", "engines", "DirectiveSummarizerEngine.ts");

const args = new Set(process.argv.slice(2));
const NO_OLLAMA = args.has("--no-ollama");
const STATS_ONLY = args.has("--stats");
const CHECK_ONLY = args.has("--check");

const SUCCESS = 0;
const NO_DIRECTIVES = 1;
const BUILD_FAILED = 2;
const STALE = 3;

function log(msg) {
  process.stderr.write(`[summarize-directives] ${msg}\n`);
}

async function loadEngine() {
  if (fs.existsSync(ENGINE_BUILT)) {
    return import(pathToFileURL(ENGINE_BUILT).href);
  }
  try {
    return await import(pathToFileURL(ENGINE_SRC).href);
  } catch (e) {
    log(`cannot load DirectiveSummarizerEngine: ${e?.message ?? e}`);
    log("Run \"npm run build\" first, or invoke via tsx.");
    process.exit(BUILD_FAILED);
  }
}

async function main() {
  const mod = await loadEngine();
  const engine = mod.directiveSummarizerEngine ?? new mod.DirectiveSummarizerEngine();
  const files = engine.listDirectiveFiles();

  if (files.length === 0) {
    log("no CLAUDE-CODEX-*.md files found in state/shared/");
    process.exit(NO_DIRECTIVES);
  }

  if (CHECK_ONLY) {
    const cache = engine.read();
    if (cache === null) {
      log("cache missing");
      process.exit(STALE);
    }
    // Stale if any source file has been modified more recently than the cache
    const cacheMtime = new Date(cache.built_at).getTime();
    let stalest = null;
    for (const f of files) {
      const src = fs.statSync(f).mtimeMs;
      if (src > cacheMtime) { stalest = path.basename(f); break; }
    }
    if (stalest !== null) {
      log(`cache stale: ${stalest} modified after build`);
      process.exit(STALE);
    }
    log(`cache fresh — ${cache.total_files} entries built ${cache.built_at}`);
    process.exit(SUCCESS);
  }

  if (STATS_ONLY) {
    const cache = engine.read();
    if (cache === null) {
      log("cache missing — run without --stats to build");
      process.exit(NO_DIRECTIVES);
    }
    process.stdout.write(JSON.stringify({
      schemaVersion: cache.schemaVersion,
      built_at: cache.built_at,
      total_files: cache.total_files,
      ollama_used: cache.ollama_used,
      heuristic_used: cache.heuristic_used,
      summaries: cache.summaries.map((s) => ({ file_name: s.file_name, title: s.title, mode: s.mode })),
    }, null, 2) + "\n");
    process.exit(SUCCESS);
  }

  log(`summarizing ${files.length} directives (ollama=${!NO_OLLAMA})...`);
  const start = Date.now();
  const result = await engine.buildAndPersist({ useOllama: !NO_OLLAMA });
  if (!result.ok) {
    log(`build failed: ${result.error}`);
    process.exit(BUILD_FAILED);
  }
  const elapsed = Date.now() - start;
  log(`built ${result.cache.total_files} summaries in ${elapsed}ms (ollama=${result.cache.ollama_used}, heuristic=${result.cache.heuristic_used})`);
  log(`  md   → ${result.md_path}`);
  log(`  json → ${result.json_path}`);
  process.exit(SUCCESS);
}

main().catch((e) => {
  log(`unhandled: ${e?.message ?? e}`);
  process.exit(BUILD_FAILED);
});
