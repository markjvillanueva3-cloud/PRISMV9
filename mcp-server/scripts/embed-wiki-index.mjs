#!/usr/bin/env node
/**
 * embed-wiki-index.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P4-U04
 *
 * Pre-builds the TF-IDF index for knowledge/wiki/index.md and persists it to
 * mcp-server/data/state/wiki-query-index.json. Subsequent calls to
 *   prism_memory:semantic_search { kind: "wiki", query }
 * load the cached index without re-parsing index.md.
 *
 * Usage:
 *   node mcp-server/scripts/embed-wiki-index.mjs           # build + persist
 *   node mcp-server/scripts/embed-wiki-index.mjs --stats   # only print stats
 *   node mcp-server/scripts/embed-wiki-index.mjs --check   # verify cache freshness
 *
 * Exit codes:
 *   0 = success / cache up to date
 *   1 = wiki/index.md missing
 *   2 = build failed (write error)
 *
 * Note: This script is invoked from the repo root. We resolve paths via
 * import.meta.url so it works from any CWD (e.g. via npm scripts, CI).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// Resolve paths the same way the engine does — robust to cwd
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENGINE_PATH = path.join(REPO_ROOT, "mcp-server", "src", "engines", "WikiIndexQueryEngine.ts");
const ENGINE_PATH_BUILT = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "WikiIndexQueryEngine.js");
const WIKI_INDEX_MD = path.join(REPO_ROOT, "knowledge", "wiki", "index.md");
const CACHE_PATH = path.join(REPO_ROOT, "mcp-server", "data", "state", "wiki-query-index.json");

const args = new Set(process.argv.slice(2));
const STATS_ONLY = args.has("--stats");
const CHECK_ONLY = args.has("--check");

const SUCCESS = 0;
const NO_WIKI = 1;
const BUILD_FAILED = 2;
const STALE = 3;

function log(level, msg) {
  const tag = level === "error" ? "[embed-wiki]" : "[embed-wiki]";
  process.stderr.write(`${tag} ${msg}\n`);
}

async function loadEngine() {
  // Prefer the built JS (production), fall back to .ts (dev) via tsx if available.
  if (fs.existsSync(ENGINE_PATH_BUILT)) {
    return import(pathToFileURL(ENGINE_PATH_BUILT).href);
  }
  // Try the source path — works under tsx/vitest/dev runs, fails on plain node.
  try {
    return await import(pathToFileURL(ENGINE_PATH).href);
  } catch (e) {
    log("error", `cannot load WikiIndexQueryEngine: ${e?.message ?? e}`);
    log("error", `tried: ${ENGINE_PATH_BUILT}, ${ENGINE_PATH}`);
    log("error", "Run \"npm run build\" first, or invoke this script via tsx.");
    process.exit(BUILD_FAILED);
  }
}

async function main() {
  if (!fs.existsSync(WIKI_INDEX_MD)) {
    log("error", `knowledge/wiki/index.md not found at ${WIKI_INDEX_MD}`);
    process.exit(NO_WIKI);
  }

  if (CHECK_ONLY) {
    if (!fs.existsSync(CACHE_PATH)) {
      log("info", "cache missing — run without --check to build");
      process.exit(STALE);
    }
    const wikiMtime = fs.statSync(WIKI_INDEX_MD).mtimeMs;
    const cacheMtime = fs.statSync(CACHE_PATH).mtimeMs;
    if (cacheMtime < wikiMtime) {
      log("info", `cache stale: wiki ${new Date(wikiMtime).toISOString()} > cache ${new Date(cacheMtime).toISOString()}`);
      process.exit(STALE);
    }
    log("info", "cache fresh");
    process.exit(SUCCESS);
  }

  const mod = await loadEngine();
  const engine = mod.wikiIndexQueryEngine ?? new mod.WikiIndexQueryEngine();

  if (STATS_ONLY) {
    const s = engine.stats();
    process.stdout.write(JSON.stringify(s, null, 2) + "\n");
    process.exit(SUCCESS);
  }

  const result = engine.buildAndPersist();
  if (!result.ok) {
    log("error", `build failed: ${result.error}`);
    process.exit(BUILD_FAILED);
  }

  log("info", `built TF-IDF index for ${result.total_entries} wiki entries → ${result.cache_path}`);
  process.exit(SUCCESS);
}

main().catch((e) => {
  log("error", `unhandled: ${e?.message ?? e}`);
  process.exit(BUILD_FAILED);
});
