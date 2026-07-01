#!/usr/bin/env node
/**
 * outcome-bus-diversity-audit.mjs -- INDIA-REMAINING-WORK #24 audit substrate (slot:india 2026-06-16).
 *
 * Measures the diversity of `state/shared/outcome-bus.jsonl` -- the closed-loop training signal feed.
 * The Phase-C-3 ledger finding noted the bus was 99.97% one-emitter (`outcome-bus-auto-tap`), and the
 * compounding-loop framing in CLAUDE.md S7 calls for cross-galaxy emission diversity. This is the
 * REPRODUCIBLE measurement substrate that turns a one-off shell finding into a gating diagnostic
 * any chat can re-run + cite.
 *
 * R8: zero reinvention -- pure read over an existing JSONL; report per-emitter / per-slot / per-domain
 *     counts + a normalized Shannon entropy + the monoculture share + binomial CIs.
 * R12 (india discipline encoded in code -- NEVER a softened metric):
 *   (a) REFUSE-GATE: empty/<MIN_MEANINGFUL_N=200 records -> {ok:false,refused:true}, exit 2. A
 *       diversity score on a tiny sample is binomially meaningless; grow the bus first.
 *   (b) MONOCULTURE flag: any single source >= MONOCULTURE_FLOOR (0.95) of all rows -> healthy=false
 *       + name the dominant emitter. The compound-loop signal is BROKEN regardless of total volume
 *       when one emitter dominates.
 *   (c) `--strict` CI gate fails CLOSED on monoculture (exit 1), so consumers can wire this into
 *       a recurring check without papering over the regression.
 *
 * Outputs (default text + --json):
 *   - totalRows, distinctSources, distinctSlots, distinctDomains
 *   - dominantSource + share + 95% binomial CI (Wilson interval)
 *   - sourceShannon (normalized 0..1; higher = more diverse), top-N tables
 *   - healthy + reason
 *
 * Usage:
 *   node scripts/outcome-bus-diversity-audit.mjs [--path <file>] [--top-n 10] [--strict] [--json]
 *     [--monoculture-floor 0.95] [--min-n 200]
 *
 * @module scripts/outcome-bus-diversity-audit
 */

import fs from "node:fs";
import path from "node:path";

/** Below this row count the diversity metrics are binomially meaningless (see Wilson CI half-width). */
export const MIN_MEANINGFUL_N = 200;
/** Any single emitter at or above this share = monoculture. The current outcome-bus had 99.97% (Phase C-3). */
export const MONOCULTURE_FLOOR = 0.95;
const DEFAULT_PATH = "state/shared/outcome-bus.jsonl";
const DEFAULT_TOP_N = 10;
const WILSON_Z = 1.959964;

/**
 * Wilson-score 95% CI for a binomial proportion p = k/n. Standard normal approximation but with
 * the score-test correction so the interval stays inside [0,1] at extreme p (no Wald-pathology
 * around p=1.0, which is exactly where the monoculture lives). Returns [lo, hi].
 */
export function wilsonCi(k, n, z = WILSON_Z) {
  if (n <= 0) return [0, 0];
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

/**
 * Normalized Shannon entropy in [0, 1]: H / log2(K), where K = number of distinct labels.
 * Returns 0 on a single-label distribution (or K<=1), 1 on uniform. NaN-safe: if any count is 0 it
 * is dropped from the sum (xlog(x) -> 0).
 */
export function normalizedShannon(counts) {
  const vals = Object.values(counts).filter((v) => v > 0);
  const K = vals.length;
  if (K <= 1) return 0;
  let total = 0;
  for (const v of vals) total += v;
  let H = 0;
  for (const v of vals) {
    const p = v / total;
    H -= p * Math.log2(p);
  }
  return H / Math.log2(K);
}

/** Pure histogram over a single field. Skips rows where the field is missing/empty/null. */
export function tallyField(rows, field) {
  const counts = Object.create(null);
  for (const r of rows) {
    const v = r[field];
    if (v === undefined || v === null || v === "") continue;
    const k = String(v);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/** Top-N {label, count, share}. share = count / totalNonEmpty (NOT totalRows, since the field may be missing). */
export function topN(counts, totalNonEmpty, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count, share: totalNonEmpty > 0 ? count / totalNonEmpty : 0 }));
}

/**
 * Parse a JSONL file into an array of records. Malformed lines are SKIPPED with a tracked
 * `malformedLines` count so callers can flag bus corruption (R12 -- never a silent drop).
 */
export function parseOutcomeBusJsonl(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let malformedLines = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      malformedLines += 1;
    }
  }
  return { rows, malformedLines };
}

/**
 * Pure audit core. Input: raw row array (caller produces it via parseOutcomeBusJsonl OR injects
 * synthetic data in tests). Output: {ok:true, ...report} or {ok:false, refused?, error}.
 */
export function runDiversityAudit(rows, opts = {}) {
  const minN = opts.minN ?? MIN_MEANINGFUL_N;
  const monoFloor = opts.monocultureFloor ?? MONOCULTURE_FLOOR;
  const topNCount = opts.topN ?? DEFAULT_TOP_N;
  const malformedLines = opts.malformedLines ?? 0;

  if (!Array.isArray(rows)) {
    return { ok: false, error: "rows must be an array" };
  }
  if (rows.length < minN) {
    return {
      ok: false,
      refused: true,
      error: `insufficient outcome-bus rows: n=${rows.length} < MIN=${minN}. A diversity score on <${minN} rows ` +
        `is binomially meaningless; grow the bus before reporting on it.`,
      totalRows: rows.length,
    };
  }
  if (!(monoFloor > 0 && monoFloor <= 1)) {
    return { ok: false, error: `monocultureFloor must be in (0, 1]; got ${monoFloor}` };
  }

  const sourceCounts = tallyField(rows, "source");
  const slotCounts = tallyField(rows, "slot");
  const domainCounts = tallyField(rows, "domain");
  const sourceTotal = Object.values(sourceCounts).reduce((a, v) => a + v, 0);

  const topSources = topN(sourceCounts, sourceTotal, topNCount);
  const dominant = topSources[0] ?? null;
  const dominantShare = dominant ? dominant.share : 0;
  const dominantCi = dominant ? wilsonCi(dominant.count, sourceTotal) : [0, 0];

  // Monoculture rule: the dominant emitter's LOWER 95% CI bound clears the floor. Using the lower
  // bound (not the point estimate) keeps us from flagging on small-sample wobble around the floor.
  const monoculture = dominantCi[0] >= monoFloor;
  const healthy = !monoculture;
  const reason = healthy
    ? `diverse: top emitter '${dominant?.label}' share=${(dominantShare * 100).toFixed(2)}% [CI ` +
      `${(dominantCi[0] * 100).toFixed(2)}, ${(dominantCi[1] * 100).toFixed(2)}] below ${(monoFloor * 100).toFixed(0)}%`
    : `MONOCULTURE: top emitter '${dominant?.label}' share=${(dominantShare * 100).toFixed(2)}% [CI ` +
      `${(dominantCi[0] * 100).toFixed(2)}, ${(dominantCi[1] * 100).toFixed(2)}] at/above ${(monoFloor * 100).toFixed(0)}% -- ` +
      `the closed-loop signal collapses to one emitter; per-galaxy diversity is the lever, NOT volume.`;

  return {
    ok: true,
    totalRows: rows.length,
    malformedLines,
    distinctSources: Object.keys(sourceCounts).length,
    distinctSlots: Object.keys(slotCounts).length,
    distinctDomains: Object.keys(domainCounts).length,
    dominantSource: dominant?.label ?? null,
    dominantShare,
    dominantCi95: dominantCi,
    sourceShannonNormalized: normalizedShannon(sourceCounts),
    slotShannonNormalized: normalizedShannon(slotCounts),
    domainShannonNormalized: normalizedShannon(domainCounts),
    topSources,
    topSlots: topN(slotCounts, rows.length, topNCount),
    topDomains: topN(domainCounts, rows.length, topNCount),
    healthy,
    monoculture,
    monocultureFloor: monoFloor,
    reason,
  };
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

/** Coerce a CLI numeric arg, throwing rather than silently turning NaN. */
function parseFiniteNumber(name, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`--${name} must be a finite number; got ${JSON.stringify(raw)}`);
  return n;
}

export function parseArgs(argv) {
  const out = { path: DEFAULT_PATH, topN: DEFAULT_TOP_N, json: false, strict: false, monocultureFloor: MONOCULTURE_FLOOR, minN: MIN_MEANINGFUL_N };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--path") out.path = argv[++i];
    else if (a === "--top-n") out.topN = parseFiniteNumber("top-n", argv[++i]);
    else if (a === "--monoculture-floor") out.monocultureFloor = parseFiniteNumber("monoculture-floor", argv[++i]);
    else if (a === "--min-n") out.minN = parseFiniteNumber("min-n", argv[++i]);
    else if (a === "--json") out.json = true;
    else if (a === "--strict") out.strict = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\//, ""));
  const filePath = path.isAbsolute(args.path) ? args.path : path.join(repoRoot, args.path);
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`FAILED to load bus: ${err.message}`);
    process.exit(2);
  }
  const { rows, malformedLines } = parseOutcomeBusJsonl(text);
  const report = runDiversityAudit(rows, {
    topN: args.topN,
    monocultureFloor: args.monocultureFloor,
    minN: args.minN,
    malformedLines,
  });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!report.ok) {
    console.error(`REFUSED/FAILED: ${report.error}`);
  } else {
    console.log(`outcome-bus diversity audit (path=${filePath})`);
    console.log(`  totalRows=${report.totalRows} malformed=${report.malformedLines}`);
    console.log(`  distinctSources=${report.distinctSources} distinctSlots=${report.distinctSlots} distinctDomains=${report.distinctDomains}`);
    console.log(`  sourceShannonNorm=${report.sourceShannonNormalized.toFixed(4)} (0=monoculture, 1=uniform)`);
    console.log(`  healthy=${report.healthy} reason: ${report.reason}`);
    console.log(`  top sources:`);
    for (const s of report.topSources) console.log(`    ${(s.share * 100).toFixed(2).padStart(6)}%  ${String(s.count).padStart(8)}  ${s.label}`);
  }
  // Exit codes: 2 = refused/failed/load-fail; 1 = monoculture under --strict; 0 = ok.
  if (!report.ok) process.exit(2);
  if (args.strict && report.monoculture) process.exit(1);
  process.exit(0);
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main().catch((err) => {
    console.error(`outcome-bus-diversity-audit crashed: ${err.stack || err}`);
    process.exit(2);
  });
}
