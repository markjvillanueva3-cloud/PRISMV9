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
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const FINGERPRINT_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/.wiki-regen-fingerprint");

const args = new Set(process.argv.slice(2));
const FLAGS = { dryRun: args.has("--dry-run"), quiet: args.has("--quiet"), force: args.has("--force") };

// Efficiency gate: the orchestrator is ~8min on a 150K-node graph and the
// post-commit hook fires it on EVERY commit — even commits that don't touch
// the graph or the filesystem inputs. Fingerprint = graph size+mtime + node/edge
// count from the JSON header + a hash of the generator script list. If unchanged
// since the last successful run, skip the whole chain (unless --force).
function computeFingerprint() {
  const parts = [];
  try {
    const st = statSync(GRAPH_PATH);
    parts.push(`g:${st.size}:${Math.round(st.mtimeMs)}`);
    // Cheap content signal: read just the first 4KB which contains the meta header
    // (generatedAt, headline counts) without parsing the 95MB body.
    const head = readFileSync(GRAPH_PATH, "utf8").slice(0, 4096);
    parts.push(`h:${createHash("sha1").update(head).digest("hex").slice(0, 16)}`);
  } catch { parts.push("g:missing"); }
  // Generator-list hash so a code change to the orchestrator forces a rebuild.
  parts.push(`gens:${createHash("sha1").update(GENERATORS.join("|")).digest("hex").slice(0, 8)}`);
  // Also fold in the mtime of a couple of non-graph inputs so skill/hook/tribal
  // changes don't get masked.
  for (const p of [
    resolve(PRISM_ROOT, ".claude/commands"),
    resolve(PRISM_ROOT, ".claude/hooks"),
    resolve(PRISM_ROOT, "knowledge/tribal"),
    resolve(PRISM_ROOT, "extracted_modules/FINAL_EXTRACTION_SUMMARY.json"),
  ]) {
    try { parts.push(`i:${Math.round(statSync(p).mtimeMs)}`); } catch {}
  }
  return parts.join(" ");
}

const GENERATORS = [
  "generate-layer-wiki.mjs",
  "generate-domain-wiki.mjs",
  "generate-dispatcher-wiki.mjs",
  "generate-engine-wiki.mjs",
  "generate-action-wiki.mjs",
  "generate-registry-wiki.mjs",
  "generate-frontend-wiki.mjs",
  "generate-milestone-wiki.mjs",
  "generate-misc-l8-wiki.mjs",   // JM-Die customers, combos, design specs, data catalogs, extracts, novel formulas
  "generate-skill-wiki.mjs",
  "generate-hook-wiki.mjs",
  "generate-formula-algo-wiki.mjs",
  "generate-monolith-wiki.mjs",
  "generate-extracted-modules-wiki.mjs",  // per-module entries for the v8.89 decomposition (~1.7K)
  "generate-courses-wiki.mjs",            // PRISM Academy courses + 5 MIT OCW courses + 220-course KB index
  "generate-tribal-index.mjs",
  "generate-tribal-wiki.mjs",             // per-category tribal index pages (~73); tips themselves are indexed by build-wiki-leaf-index
  "generate-test-wiki.mjs",               // per-test entries (~3.4K); incremental (mtime sidecar) so steady-state runs are fast
  "generate-domain-mermaid.mjs",
  "generate-layer-stack-overview.mjs",
  "system-viz-obsidian-bridge-v2.mjs",
  "export-graph-cypher.mjs",
  // crosslink injector runs after all content generators so it sees every leaf entry
  "inject-wiki-crosslinks.mjs",
  // leaf-index built after crosslinks so it captures the latest content;
  // feeds wiki-precheck-inject.mjs so the ~14K leaf entries are recall-searchable
  "build-wiki-leaf-index.mjs",
  // embeddings built from the fresh leaf-index — int8 vectors for the recall
  // hook's semantic fallback. No-ops gracefully if Ollama is unreachable.
  "build-wiki-embeddings.mjs",
  // lint runs near-last so it measures the post-crosslink orphan rate
  "lint-wiki-orphans.mjs",
  // coverage audit runs LAST — cross-references the graph vs the leaf-index vs the
  // generator list → WIKI-COVERAGE-AUDIT.md (the "is the wiki brain complete?" oracle)
  "audit-wiki-coverage.mjs",
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

  // Skip the ~8min chain if nothing relevant changed since the last run.
  const fp = computeFingerprint();
  if (!FLAGS.dryRun && !FLAGS.force) {
    let prev = "";
    try { prev = readFileSync(FINGERPRINT_PATH, "utf8").trim(); } catch {}
    if (prev === fp) {
      log(`[regen-wiki] up-to-date (fingerprint unchanged) — skipping. Use --force to rebuild anyway.\n`);
      return;
    }
  }

  const t0 = Date.now();
  const results = [];
  for (const g of GENERATORS) results.push(runGenerator(g));
  const total = Date.now() - t0;

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  log(`[regen-wiki] done: ${okCount}/${results.length} OK · ${failCount} fail · total ${total}ms\n`);

  // Persist the fingerprint only on a clean run so a partial-failure rebuild
  // re-attempts next time. (The gate above reads this; without the write it
  // would never short-circuit.)
  if (failCount === 0 && !FLAGS.dryRun) {
    try { mkdirSync(dirname(FINGERPRINT_PATH), { recursive: true }); writeFileSync(FINGERPRINT_PATH, fp, "utf8"); } catch {}
  }

  if (failCount > 0) process.exit(1);
}

main();
