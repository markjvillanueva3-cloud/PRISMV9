#!/usr/bin/env node
/**
 * regen-wiki-from-viz.mjs
 *
 * Orchestrator: runs every viz→wiki generator in sequence after the
 * system-viz graph regenerates. Wire into SessionStart, the system-viz-
 * on-commit hook, or invoke via slash command after `/system-viz`.
 *
 * Generators (run in dependency order):
 *   1. generate-layer-wiki.mjs       — 13 per-layer entries
 *   2. generate-domain-wiki.mjs      — 38 per-engine-domain entries
 *   3. generate-dispatcher-wiki.mjs  — 97 per-dispatcher entries
 *   4. generate-layer-stack-overview.mjs — single overview entry w/ Mermaid
 *
 * Each generator is idempotent and updates wiki/index.md in-place between
 * marker comments. Total runtime ~200ms on the current 126K-node graph.
 *
 * Flags:
 *   --dry-run   pass through to all generators (don't write)
 *   --quiet     suppress per-step success lines (errors still print)
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");

const args = new Set(process.argv.slice(2));
const FLAGS = { dryRun: args.has("--dry-run"), quiet: args.has("--quiet") };

const GENERATORS = [
  "generate-layer-wiki.mjs",
  "generate-domain-wiki.mjs",
  "generate-dispatcher-wiki.mjs",
  "generate-engine-wiki.mjs",
  "generate-action-wiki.mjs",
  "generate-registry-wiki.mjs",
  "generate-frontend-wiki.mjs",
  "generate-milestone-wiki.mjs",
  "generate-skill-wiki.mjs",
  "generate-hook-wiki.mjs",
  "generate-formula-algo-wiki.mjs",
  "generate-monolith-wiki.mjs",
  "generate-tribal-index.mjs",
  "generate-domain-mermaid.mjs",
  "generate-layer-stack-overview.mjs",
  "system-viz-obsidian-bridge-v2.mjs",
  "export-graph-cypher.mjs",
  // crosslink injector runs after all content generators so it sees every leaf entry
  "inject-wiki-crosslinks.mjs",
  // leaf-index built after crosslinks so it captures the latest content;
  // feeds wiki-precheck-inject.mjs so the ~13.7K leaf entries are recall-searchable
  "build-wiki-leaf-index.mjs",
  // lint runs LAST so it measures the post-crosslink orphan rate
  "lint-wiki-orphans.mjs",
];

function log(line) {
  if (!FLAGS.quiet) process.stdout.write(line);
}

function err(line) {
  process.stderr.write(line);
}

function runGenerator(name) {
  const script = resolve(__dirname, name);
  if (!existsSync(script)) {
    err(`[regen-wiki] missing: ${name}\n`);
    return { ok: false, name, error: "missing" };
  }
  const cmd = process.execPath;
  // Child generators read the full 95MB graph; default 1.5GB heap is too small
  // when several large-graph workflows run in sequence on Windows (heap-corruption
  // at STATUS_HEAP_CORRUPTION 0xC0000374). Lift to 8 GB.
  const cliArgs = ["--max-old-space-size=8192", script];
  if (FLAGS.dryRun) cliArgs.push("--dry-run");
  const t0 = Date.now();
  const res = spawnSync(cmd, cliArgs, { encoding: "utf8" });
  const elapsed = Date.now() - t0;
  if (res.status !== 0) {
    err(`[regen-wiki] FAIL ${name} (exit ${res.status}, ${elapsed}ms)\n`);
    if (res.stderr) err(res.stderr);
    return { ok: false, name, error: res.stderr || `exit ${res.status}` };
  }
  const summary = (res.stdout || "").trim().split("\n").pop() || "ok";
  log(`[regen-wiki] OK   ${name.padEnd(40)} ${elapsed}ms  ${summary}\n`);
  return { ok: true, name, elapsed, summary };
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    err(`[regen-wiki] graph missing at ${GRAPH_PATH}\n`);
    err(`[regen-wiki] run \`/system-viz\` or \`node scripts/generate-system-viz.mjs\` first\n`);
    process.exit(2);
  }
  const ageMs = Date.now() - statSync(GRAPH_PATH).mtimeMs;
  const ageMin = Math.round(ageMs / 60000);
  log(`[regen-wiki] graph age: ${ageMin}min · ${FLAGS.dryRun ? "DRY-RUN" : "writing"}\n`);

  const t0 = Date.now();
  const results = [];
  for (const g of GENERATORS) results.push(runGenerator(g));
  const total = Date.now() - t0;

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  log(`[regen-wiki] done: ${okCount}/${results.length} OK · ${failCount} fail · total ${total}ms\n`);

  if (failCount > 0) process.exit(1);
}

main();
