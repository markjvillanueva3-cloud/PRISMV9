#!/usr/bin/env node
/**
 * emit-node-memory-pointers.mjs
 *
 * Driver: walks every wiki sub-directory tracked in WIKI_KINDS and emits a
 * memory-vault pointer at knowledge/memories/reference/node_<kind>_<slug>.md
 * for every wiki entry. Idempotent (uses preserveHuman to keep operator
 * additions below the AUTO marker block).
 *
 * Why: the operator asked for "wiki, memories that can be indexed by nodes
 * for all engines, algorithms, formulas, mathematical concepts with auto
 * populating anytime either domain gains another node". The 26-step
 * regen-wiki-from-viz.mjs orchestrator builds the wiki side; this script
 * mirrors every wiki entry into a memory-vault pointer so the memory side
 * is also node-indexed.
 *
 * Flags:
 *   --dry-run        plan but do not write
 *   --since <ms>     only consider wiki files newer than this epoch-ms
 *   --since-cache    use the sidecar cache mtime as the floor (incremental)
 *   --limit <n>      cap per-kind for tracer runs
 *   --json           emit a JSON summary to stdout
 *   --quiet          suppress per-step output
 *
 * Exit codes: 0 ok · 1 partial errors · 2 input missing.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planEmissions, applyEmissions } from "./lib/emit-node-memory-pointer.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const CACHE_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/.node-memory-pointers-cache.json");

function parseArgs(argv) {
  const out = { dryRun: false, sinceMs: 0, sinceCache: false, limit: 0, json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a === "--json") out.json = true;
    else if (a === "--since-cache") out.sinceCache = true;
    else if (a === "--since") out.sinceMs = Number(argv[++i] || 0);
    else if (a === "--limit") out.limit = Number(argv[++i] || 0);
  }
  return out;
}

function readCache() {
  try { return JSON.parse(readFileSync(CACHE_PATH, "utf8")); } catch { return null; }
}

function writeCache(payload) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch {}
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const wikiRoot = resolve(PRISM_ROOT, "knowledge/wiki");
  if (!existsSync(wikiRoot)) {
    process.stderr.write(`[emit-node-pointers] wiki root missing: ${wikiRoot}\n`);
    process.exit(2);
  }

  const generatedAt = new Date().toISOString().split("T")[0];
  let since = flags.sinceMs;
  if (flags.sinceCache) {
    const cache = readCache();
    if (cache && typeof cache.lastRunMs === "number") since = cache.lastRunMs;
  }

  const t0 = Date.now();
  const plans = planEmissions({
    prismRoot: PRISM_ROOT,
    generatedAt,
    since,
    limit: flags.limit,
  });
  const res = applyEmissions(plans, { dryRun: flags.dryRun });
  const elapsed = Date.now() - t0;

  const summary = {
    ok: res.errors === 0,
    planned: plans.length,
    created: res.created,
    updated: res.updated,
    skipped: res.skipped,
    errors: res.errors,
    elapsed_ms: elapsed,
    since,
    dry_run: flags.dryRun,
    generated_at: generatedAt,
  };

  if (!flags.dryRun && res.errors === 0) {
    writeCache({ lastRunMs: Date.now(), summary });
  }

  if (flags.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else if (!flags.quiet) {
    process.stdout.write(
      `[emit-node-pointers] ${summary.created} created · ${summary.updated} updated · ${summary.skipped} skipped · ${summary.errors} errors (${elapsed}ms, ${plans.length} planned)\n`,
    );
  }

  process.exit(res.errors === 0 ? 0 : 1);
}

main();
