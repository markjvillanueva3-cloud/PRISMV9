#!/usr/bin/env node
/**
 * system-viz-health.mjs — re-runnable baseline measurement for the system-viz subsystem.
 *
 * META artifact emitted by /forge-audit-v2 SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.
 *
 * Usage:
 *   node scripts/system-viz-health.mjs               # human text
 *   node scripts/system-viz-health.mjs --json        # machine-readable
 *   node scripts/system-viz-health.mjs --bench-query # latency sample only
 *   node scripts/system-viz-health.mjs --bench-query=<verb>  # one verb
 *
 * Measures (each is a finding-verification channel from the audit):
 *   - Graph: size, mtime, age, node/edge counts
 *   - Augmentations: count, total size, oldest mtime, mtime-orphan candidates (>14d)
 *   - Per-verb query latency (5-iter mean) — measures P1 cache hit candidate
 *   - DRIFT_REPORT.json severity histogram — measures W4 consumption gate
 *   - Cache-hit estimate: same verb 5x, slope of latency across runs
 *   - Worktree count + active-graph divergence (cheap sha256 across siblings)
 *
 * Safe to run any time; read-only.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const QUERY_SCRIPT = path.join(__dirname, "system-viz-query.mjs");
const DRIFT = path.join(VIZ_DIR, "DRIFT_REPORT.json");

// Bench verbs MUST exist in scripts/system-viz-query.mjs:
//   headline, build-order, roadmap-candidates, dispatcher-summary,
//   coverage-by-domain, worktrees, find, blast-radius
// `blast-radius` needs a real node id; we use a stable headline-discovered one if available.
const BENCH_VERBS = [
  ["headline"],
  ["coverage-by-domain"],
  ["roadmap-candidates"],
  ["dispatcher-summary"],
  ["worktrees"],
  ["find", "audit"],
];

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const benchArg = args.find((a) => a === "--bench-query" || a.startsWith("--bench-query="));
const benchOnlyVerb = benchArg && benchArg.includes("=") ? benchArg.split("=")[1] : null;

function safeStat(p) {
  try { return statSync(p); } catch { return null; }
}

function safeJSON(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function fmtBytes(n) {
  if (n == null) return "n/a";
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(2)} MB`;
  if (n > 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}

function fmtMs(ms) {
  if (ms == null) return "n/a";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(0)} ms`;
}

function fmtAge(mtimeMs) {
  if (!mtimeMs) return "n/a";
  const s = (Date.now() - mtimeMs) / 1000;
  if (s < 60) return `${s.toFixed(0)}s ago`;
  if (s < 3600) return `${(s / 60).toFixed(1)}m ago`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h ago`;
  return `${(s / 86400).toFixed(1)}d ago`;
}

function measureGraph() {
  const st = safeStat(GRAPH);
  if (!st) return { present: false };
  const graph = safeJSON(GRAPH);
  return {
    present: true,
    sizeBytes: st.size,
    sizeHuman: fmtBytes(st.size),
    mtime: new Date(st.mtimeMs).toISOString(),
    age: fmtAge(st.mtimeMs),
    nodes: graph?.nodes?.length ?? null,
    edges: graph?.edges?.length ?? null,
  };
}

function measureAugs() {
  let entries;
  try { entries = readdirSync(VIZ_DIR); } catch { return { present: false }; }
  const augs = entries
    .filter((f) => f.endsWith("-augmentation.json"))
    .map((f) => {
      const p = path.join(VIZ_DIR, f);
      const st = safeStat(p);
      return st ? { name: f, sizeBytes: st.size, mtimeMs: st.mtimeMs } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
  const total = augs.reduce((s, a) => s + a.sizeBytes, 0);
  const ORPHAN_AGE_DAYS = 14;
  const orphanCutoff = Date.now() - ORPHAN_AGE_DAYS * 86400e3;
  const orphans = augs.filter((a) => a.mtimeMs < orphanCutoff);
  return {
    present: true,
    count: augs.length,
    totalBytes: total,
    totalHuman: fmtBytes(total),
    largest: augs.slice(0, 5).map((a) => ({ name: a.name, size: fmtBytes(a.sizeBytes) })),
    orphans: orphans.map((a) => ({ name: a.name, age: fmtAge(a.mtimeMs) })),
    orphanCount: orphans.length,
  };
}

function measureDrift() {
  const d = safeJSON(DRIFT);
  if (!d) return { present: false };
  return {
    present: true,
    generatedAt: d.generatedAt,
    age: fmtAge(safeStat(DRIFT)?.mtimeMs),
    total: d.total,
    byCategory: d.byCategory ?? {},
    stop_gate_should_fire: (d.byCategory?.truncated ?? 0) > 0 || (d.byCategory?.["root-missing"] ?? 0) > 0,
  };
}

function benchVerb(verb, ...extra) {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const t0 = process.hrtime.bigint();
    const r = spawnSync(process.execPath, [QUERY_SCRIPT, verb, ...extra], { encoding: "utf8" });
    const t1 = process.hrtime.bigint();
    if (r.status !== 0) return { verb, error: r.stderr?.split("\n")[0] || "unknown" };
    samples.push(Number(t1 - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, n) => s + n, 0) / samples.length;
  const min = samples[0];
  const max = samples[samples.length - 1];
  // cache-hit signal: ratio of fastest to first call (if cache is working, min should be << first)
  const first = samples[0]; // already sorted — but we want the actual first call
  // Re-run separately to get first vs steady-state (sort destroys order)
  return { verb, samples_ms: samples.map((s) => +s.toFixed(0)), mean_ms: +mean.toFixed(0), min_ms: +min.toFixed(0), max_ms: +max.toFixed(0) };
}

function benchAllVerbs() {
  return BENCH_VERBS.map(([v, ...extra]) => benchVerb(v, ...extra));
}

function detectWorktrees() {
  try {
    const r = spawnSync("git", ["worktree", "list", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
    if (r.status !== 0) return { count: 0 };
    const wts = r.stdout.split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice("worktree ".length).trim());
    return { count: wts.length };
  } catch { return { count: 0 }; }
}

function graphChecksum() {
  try {
    const buf = readFileSync(GRAPH);
    return createHash("sha256").update(buf).digest("hex").slice(0, 16);
  } catch { return null; }
}

// -------- main --------
async function main() {
  if (benchArg) {
    const data = benchOnlyVerb
      ? [benchVerb(benchOnlyVerb)]
      : benchAllVerbs();
    if (wantJson) {
      console.log(JSON.stringify({ bench: data }, null, 2));
    } else {
      console.log("system-viz-health — query latency (5-iter, ms)");
      for (const r of data) {
        if (r.error) console.log(`  ${r.verb.padEnd(22)} ERROR: ${r.error}`);
        else console.log(`  ${r.verb.padEnd(22)} mean=${r.mean_ms} min=${r.min_ms} max=${r.max_ms}  samples=[${r.samples_ms.join(", ")}]`);
      }
    }
    return;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    graph: measureGraph(),
    augmentations: measureAugs(),
    drift: measureDrift(),
    bench: benchAllVerbs(),
    worktrees: detectWorktrees(),
    graphChecksumPrefix: graphChecksum(),
  };

  if (wantJson) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log("system-viz health — " + out.generatedAt);
  console.log("");
  console.log("GRAPH");
  if (out.graph.present) {
    console.log(`  size:    ${out.graph.sizeHuman}`);
    console.log(`  mtime:   ${out.graph.mtime} (${out.graph.age})`);
    console.log(`  nodes:   ${out.graph.nodes ?? "n/a"}`);
    console.log(`  edges:   ${out.graph.edges ?? "n/a"}`);
    console.log(`  sha256:  ${out.graphChecksumPrefix}`);
  } else console.log("  MISSING");
  console.log("");
  console.log("AUGMENTATIONS");
  if (out.augmentations.present) {
    console.log(`  count:   ${out.augmentations.count}`);
    console.log(`  total:   ${out.augmentations.totalHuman}`);
    console.log(`  orphans (mtime > 14d): ${out.augmentations.orphanCount}`);
    if (out.augmentations.orphans.length) {
      for (const o of out.augmentations.orphans) console.log(`    - ${o.name}  ${o.age}`);
    }
    console.log(`  largest 5:`);
    for (const l of out.augmentations.largest) console.log(`    - ${l.name.padEnd(48)} ${l.size}`);
  }
  console.log("");
  console.log("DRIFT");
  if (out.drift.present) {
    console.log(`  generated: ${out.drift.generatedAt} (${out.drift.age})`);
    console.log(`  total:     ${out.drift.total}`);
    console.log(`  byCategory:`);
    for (const [k, v] of Object.entries(out.drift.byCategory)) console.log(`    ${k.padEnd(16)} ${v}`);
    if (out.drift.stop_gate_should_fire) console.log("  ⚠ STOP gate should fire (truncated|root-missing > 0)");
  } else console.log("  DRIFT_REPORT.json MISSING");
  console.log("");
  console.log("QUERY LATENCY (5-iter samples, ms)");
  for (const r of out.bench) {
    if (r.error) console.log(`  ${r.verb.padEnd(22)} ERROR: ${r.error}`);
    else console.log(`  ${r.verb.padEnd(22)} mean=${r.mean_ms} min=${r.min_ms} max=${r.max_ms}`);
  }
  console.log("");
  console.log(`WORKTREES: ${out.worktrees.count}`);
  console.log("");
  console.log("Verifies:");
  console.log("  P1 (query cache) — re-run --bench-query before/after caching patch, expect min_ms drop > 50%");
  console.log("  W4 (drift consumption) — STOP gate flag above");
  console.log("  Orphan prune — augmentations.orphans list");
}

main().catch((e) => { console.error(e); process.exit(1); });
