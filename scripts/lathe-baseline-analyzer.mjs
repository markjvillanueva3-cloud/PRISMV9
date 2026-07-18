#!/usr/bin/env node
/**
 * lathe-baseline-analyzer.mjs
 *
 * Reads training-loop output JSONL (one record per .MIN program) and emits
 * aggregate statistics for operator review. Surfaces:
 *   - quality_score distribution + histogram bins
 *   - per-operation observed frequency
 *   - insert-code coverage rate (programs with explicit ANSI codes)
 *   - G-code distribution (which canned cycles are actually used)
 *   - top quality-issue clusters
 *
 * Pure-fn `analyzeRecords` export + CLI wrapper.
 *
 * USAGE:
 *   node scripts/lathe-baseline-analyzer.mjs --in iter-N-<ts>.jsonl
 *   node scripts/lathe-baseline-analyzer.mjs --in <jsonl> --json
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-QUALITY-CORPUS-BASELINE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUALITY_BINS = [
  { label: "0-40 (POOR)",     min: 0,  max: 40 },
  { label: "40-55 (AMATEUR)", min: 40, max: 55 },
  { label: "55-70 (MEDIOCRE)",min: 55, max: 70 },
  { label: "70-85 (GOOD)",    min: 70, max: 85 },
  { label: "85-100 (EXPERT)", min: 85, max: 101 },
];

function binFor(score) {
  if (typeof score !== "number") return null;
  for (const b of QUALITY_BINS) if (score >= b.min && score < b.max) return b.label;
  return null;
}

function tally(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topN(map, n) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, count: v }));
}

/** Pure-fn analyzer — testable in isolation. */
export function analyzeRecords(records) {
  const scoreDist = new Map();
  const ops = new Map();
  const inserts = new Map();
  const gCodes = new Map();
  const isoGroups = new Map();
  const scores = [];
  let withInserts = 0;
  let scored = 0;
  let parsed = 0;

  for (const r of records) {
    const s = r?.summary?.quality_score;
    const bin = binFor(s);
    if (bin) { tally(scoreDist, bin); scores.push(s); scored++; }

    if (r?.iso_group) tally(isoGroups, r.iso_group);

    for (const op of r?.summary?.operations_observed || []) tally(ops, op);
    const ins = r?.summary?.inserts_observed || [];
    for (const code of ins) tally(inserts, code);
    if (ins.length > 0) withInserts++;

    const parseStage = (r?.stages || []).find(st => st.name === "PARSE");
    if (parseStage?.ok) {
      parsed++;
      for (const g of parseStage.g_codes || []) tally(gCodes, g);
    }
  }

  scores.sort((a, b) => a - b);
  const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : null;
  const mean = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const p10 = scores.length > 0 ? scores[Math.floor(scores.length * 0.10)] : null;
  const p90 = scores.length > 0 ? scores[Math.floor(scores.length * 0.90)] : null;

  return {
    total_programs: records.length,
    parsed_ok: parsed,
    scored: scored,
    with_explicit_inserts: withInserts,
    insert_coverage_pct: records.length > 0 ? Math.round((withInserts / records.length) * 100) : 0,
    quality: {
      mean, median, p10, p90,
      distribution: [...scoreDist.entries()].map(([k, v]) => ({ bin: k, count: v })),
    },
    iso_groups: [...isoGroups.entries()].map(([k, v]) => ({ iso: k, count: v })),
    top_operations: topN(ops, 10),
    top_inserts: topN(inserts, 10),
    top_g_codes: topN(gCodes, 15),
  };
}

function loadJsonl(p) {
  const out = [];
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch {/* skip malformed */}
  }
  return out;
}

function formatPretty(a) {
  const lines = [];
  lines.push("=== LATHE BASELINE ANALYSIS ===");
  lines.push("Programs:       " + a.total_programs);
  lines.push("Parsed OK:      " + a.parsed_ok);
  lines.push("Scored:         " + a.scored);
  lines.push("Insert coverage:" + " " + a.insert_coverage_pct + "% (" + a.with_explicit_inserts + " of " + a.total_programs + ")");
  lines.push("");
  lines.push("Quality score distribution:");
  lines.push("  mean=" + a.quality.mean + "  median=" + a.quality.median + "  p10=" + a.quality.p10 + "  p90=" + a.quality.p90);
  for (const d of a.quality.distribution) lines.push("  " + d.bin.padEnd(22) + " " + d.count);
  lines.push("");
  lines.push("ISO groups represented:");
  for (const i of a.iso_groups) lines.push("  ISO-" + i.iso + " " + i.count);
  lines.push("");
  lines.push("Top operations observed:");
  for (const op of a.top_operations) lines.push("  " + op.key.padEnd(18) + " " + op.count);
  lines.push("");
  lines.push("Top insert geometries:");
  for (const ins of a.top_inserts) lines.push("  " + ins.key.padEnd(10) + " " + ins.count);
  lines.push("");
  lines.push("Top G-codes (canned cycles + modal):");
  for (const g of a.top_g_codes) lines.push("  " + g.key.padEnd(6) + " " + g.count);
  return lines.join("\n");
}

function parseArgs(argv) {
  const a = { in: null, json: false, out: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--in") a.in = argv[++i];
    else if (argv[i] === "--json") a.json = true;
    else if (argv[i] === "--out") a.out = argv[++i];
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.in) { process.stderr.write("Usage: --in <jsonl-path> [--json] [--out summary.json]\n"); process.exit(2); }
  if (!fs.existsSync(args.in)) { process.stderr.write("JSONL not found: " + args.in + "\n"); process.exit(2); }
  const records = loadJsonl(args.in);
  const result = analyzeRecords(records);
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(result, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(formatPretty(result) + "\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
