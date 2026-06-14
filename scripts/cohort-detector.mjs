#!/usr/bin/env node
/**
 * cohort-detector.mjs — Stage 1 of the lego-stacking cross-domain
 * compatibility plan. Streams system-graph.json + samples engine file
 * headers for vintage markers; clusters every L5/L6 node into a vintage
 * cohort. Unblocks Stage 2 (batch-compat-scorer).
 *
 * Per /goal directive 2026-05-24 "wire and bridge all relevant nodes…"
 * and the user's lego-stacking strategic plan: rather than rewriting
 * older nodes, identify cohorts so adapter shims can snap them together.
 *
 * Cohort signals (combined heuristic):
 *   - file mtime quartile (1=oldest, 4=newest)
 *   - schemaVersion frontmatter / inline const (regex)
 *   - "iter\d+" tag in comment header (recent slot-work conventions)
 *   - deprecation marker comments
 *   - import style (require vs import, .js vs .ts module specifier)
 *
 * Outputs:
 *   state/shared/specs/PRISM-COHORTS.json   — full per-node assignments
 *   state/shared/specs/PRISM-COHORTS.md     — operator digest
 *
 * Re-runnable in ~6s (mostly the streaming graph read). Per
 * forge-audit-v2 §6A compounding-gains: a one-shot cohort audit is
 * worthless in 30 days; this re-runs.
 */

import fs from "node:fs";
import path from "node:path";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "..");
const GRAPH_PATH = path.join(REPO_ROOT, "state/shared/system-viz/system-graph.json");
const ENGINES_DIR = path.join(REPO_ROOT, "mcp-server/src/engines");
const OUT_DIR = path.join(REPO_ROOT, "state/shared/specs");
const OUT_JSON = path.join(OUT_DIR, "PRISM-COHORTS.json");
const OUT_MD = path.join(OUT_DIR, "PRISM-COHORTS.md");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const n = arr[i + 1];
    if (n === undefined || n.startsWith("--")) return [[k, true]];
    return [[k, n]];
  }),
);
const JSON_MODE = args.json === true;
const SAMPLE_HEAD_BYTES = 4096; // only read the first ~4KB of each engine file for header signals

// ─── Header-signal parser ─────────────────────────────────────────────

function parseHeader(content) {
  const sig = { schemaVersion: null, iterTag: null, deprecated: false, importStyle: null, msTag: null };
  // schemaVersion: `"schemaVersion": "1.2.3"` or `schemaVersion: "1.2.3"`
  const sv = content.match(/schemaVersion["']?\s*[:=]\s*["']([0-9.]+)["']/i);
  if (sv) sig.schemaVersion = sv[1];
  // iter tag: comment like "iter19, 2026-05-24"
  const iter = content.match(/iter(\d+)/i);
  if (iter) sig.iterTag = `iter${iter[1]}`;
  // MS-tag: comment like "[FOO-MS3]/U-BAR"
  const ms = content.match(/\[([A-Z][A-Z0-9-]+-MS\d+)\]/);
  if (ms) sig.msTag = ms[1];
  // deprecation
  if (/@deprecated|DEPRECATED|deprecated:/.test(content)) sig.deprecated = true;
  // import style
  if (/^import\s.*from\s["'][^"']+\.js["']/m.test(content)) sig.importStyle = "esm-js";
  else if (/^import\s.*from\s["'][^"']+["']/m.test(content)) sig.importStyle = "esm-plain";
  else if (/require\(['"][^'"]+['"]\)/.test(content)) sig.importStyle = "cjs";
  return sig;
}

function cohortLabelFor(sig, mtimeQuartile) {
  // Combine signals into a cohort label. Most-specific wins.
  if (sig.deprecated) return "deprecated";
  if (sig.iterTag) {
    const n = parseInt(sig.iterTag.slice(4), 10);
    if (n >= 24) return "iter24+ (generic-bridge era, 2026-05-24)";
    if (n >= 19) return "iter19-23 (JM-Die-page era, 2026-05-24)";
    if (n >= 12) return "iter12-18 (slot-worktree+SLOT-RECLAIM, mid-2026-05)";
    return "iter<12 (pre-slot-worktree, early 2026-05)";
  }
  if (sig.msTag) {
    if (sig.msTag.includes("MS3") || sig.msTag.includes("MS4") || sig.msTag.includes("MS5")) return `${sig.msTag} (mid-milestone era)`;
    if (sig.msTag.includes("MS0") || sig.msTag.includes("MS1")) return `${sig.msTag} (early-milestone era)`;
    return sig.msTag;
  }
  if (sig.importStyle === "cjs") return "cjs-era (pre-ESM migration)";
  if (sig.importStyle === "esm-plain") return "esm-plain (pre-NodeNext .js suffix)";
  if (sig.importStyle === "esm-js") return "esm-js (current — NodeNext convention)";
  return `mtime-q${mtimeQuartile} (no header signals)`;
}

// ─── Main ─────────────────────────────────────────────────────────────

console.error(`[cohort-detector] streaming ${GRAPH_PATH}…`);
const t0 = Date.now();
const graph = readGraphStreaming(GRAPH_PATH);
console.error(`[cohort-detector] read ${(graph.nodes?.length ?? 0).toLocaleString()} nodes in ${Date.now() - t0}ms`);

// Build engine-file index with mtime + sampled-header signals
console.error(`[cohort-detector] scanning ${ENGINES_DIR}…`);
const engineFiles = fs.readdirSync(ENGINES_DIR).filter(f => f.endsWith(".ts"));
const engineMeta = [];
for (const f of engineFiles) {
  const p = path.join(ENGINES_DIR, f);
  try {
    const stat = fs.statSync(p);
    if (!stat.isFile()) continue;
    const fd = fs.openSync(p, "r");
    const buf = Buffer.alloc(Math.min(SAMPLE_HEAD_BYTES, stat.size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const content = buf.toString("utf8");
    const sig = parseHeader(content);
    engineMeta.push({
      name: f.replace(/\.ts$/, ""),
      mtimeMs: stat.mtimeMs,
      sizeBytes: stat.size,
      ...sig,
    });
  } catch { /* skip unreadable */ }
}
console.error(`[cohort-detector] sampled ${engineMeta.length} engine file headers`);

// mtime quartile
const mtimes = engineMeta.map(e => e.mtimeMs).sort((a, b) => a - b);
const q = (p) => mtimes[Math.floor(p * mtimes.length)] ?? mtimes[mtimes.length - 1];
const q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
function mtimeQuartile(ms) {
  if (ms <= q1) return 1;
  if (ms <= q2) return 2;
  if (ms <= q3) return 3;
  return 4;
}
for (const e of engineMeta) {
  e.mtimeQuartile = mtimeQuartile(e.mtimeMs);
  e.cohort = cohortLabelFor(e, e.mtimeQuartile);
}

// Roll up cohort populations
const byCohort = {};
for (const e of engineMeta) {
  byCohort[e.cohort] = byCohort[e.cohort] ?? { cohort: e.cohort, count: 0, totalBytes: 0, engines: [], oldestMs: Infinity, newestMs: 0 };
  byCohort[e.cohort].count++;
  byCohort[e.cohort].totalBytes += e.sizeBytes;
  byCohort[e.cohort].engines.push(e.name);
  if (e.mtimeMs < byCohort[e.cohort].oldestMs) byCohort[e.cohort].oldestMs = e.mtimeMs;
  if (e.mtimeMs > byCohort[e.cohort].newestMs) byCohort[e.cohort].newestMs = e.mtimeMs;
}
const cohortList = Object.values(byCohort).sort((a, b) => b.count - a.count).map(c => ({
  ...c,
  engines: c.engines.slice(0, 30),
  hasMoreEngines: c.engines.length > 30,
  oldestIso: new Date(c.oldestMs).toISOString(),
  newestIso: new Date(c.newestMs).toISOString(),
  spanDays: Math.round((c.newestMs - c.oldestMs) / 86_400_000),
}));

const out = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  generatedBy: "cohort-detector.mjs (slot:romeo iter28, 2026-05-24)",
  source: {
    enginesDir: ENGINES_DIR,
    graphPath: GRAPH_PATH,
    engineFileCount: engineMeta.length,
    graphNodeCount: graph.nodes?.length ?? 0,
  },
  mtimeQuartileThresholds: {
    q25: new Date(q1).toISOString(),
    q50: new Date(q2).toISOString(),
    q75: new Date(q3).toISOString(),
  },
  cohortCount: cohortList.length,
  cohorts: cohortList,
  perEngineDetail: engineMeta.map(e => ({
    name: e.name,
    cohort: e.cohort,
    mtimeQuartile: e.mtimeQuartile,
    schemaVersion: e.schemaVersion,
    iterTag: e.iterTag,
    msTag: e.msTag,
    deprecated: e.deprecated,
    importStyle: e.importStyle,
  })),
  caveat: "Cohort assignment is heuristic — file mtime + sampled header. Operator MUST eyeball cohort boundaries before acting on them. Mis-classified engines should be tagged explicitly in their file header.",
  mustHumanVerify: true,
};

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(0);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

// Markdown digest
const md = [];
md.push(`# PRISM Cohorts — vintage clustering of L5 engines`);
md.push(``);
md.push(`**Generated:** ${out.generatedAt}`);
md.push(`**Engine files scanned:** ${out.source.engineFileCount.toLocaleString()}`);
md.push(`**Cohorts discovered:** ${out.cohortCount}`);
md.push(`**mtime quartile thresholds:** q25=${out.mtimeQuartileThresholds.q25.slice(0, 10)} q50=${out.mtimeQuartileThresholds.q50.slice(0, 10)} q75=${out.mtimeQuartileThresholds.q75.slice(0, 10)}`);
md.push(``);
md.push(`> **${out.caveat}**`);
md.push(``);
md.push(`## Cohort rollup`);
md.push(``);
md.push(`| Cohort | Engine count | Total KB | Oldest | Newest | Span (days) |`);
md.push(`|---|---:|---:|---|---|---:|`);
for (const c of cohortList) {
  md.push(`| ${c.cohort} | ${c.count} | ${(c.totalBytes / 1024).toFixed(0)} | ${c.oldestIso.slice(0, 10)} | ${c.newestIso.slice(0, 10)} | ${c.spanDays} |`);
}
md.push(``);
md.push(`## Per-cohort sample engines (first 30)`);
md.push(``);
for (const c of cohortList) {
  md.push(`### ${c.cohort} (${c.count} engines)`);
  md.push(``);
  for (const e of c.engines) md.push(`- ${e}`);
  if (c.hasMoreEngines) md.push(`- _… and ${c.count - 30} more_`);
  md.push(``);
}
md.push(`## How to consume`);
md.push(``);
md.push(`Stage 2 (batch-compat-scorer.mjs) consumes \`PRISM-COHORTS.json\` to score every (oldCohort × newCohort) pair on API-shape match + domain alignment + bridge-cost class. Each lego-stacking adapter shim in Stage 3 targets one or more high-leverage (oldCohort, newCohort) pairs from Stage 2's heat-map.`);
md.push(``);
md.push(`## Re-run`);
md.push(``);
md.push(`\`\`\`bash`);
md.push(`node H:/prism/scripts/cohort-detector.mjs           # full run`);
md.push(`node H:/prism/scripts/cohort-detector.mjs --json    # machine-readable`);
md.push(`\`\`\``);
fs.writeFileSync(OUT_MD, md.join("\n"));

console.error(``);
console.error(`─── Cohort detector — done ─────────────────────────────────`);
console.error(`  Engines scanned:  ${out.source.engineFileCount.toLocaleString()}`);
console.error(`  Cohorts found:    ${out.cohortCount}`);
console.error(`  Top cohort:       ${cohortList[0].cohort} (${cohortList[0].count} engines)`);
console.error(`  Outputs:`);
console.error(`    ${OUT_JSON}`);
console.error(`    ${OUT_MD}`);
console.error(`────────────────────────────────────────────────────────────`);
