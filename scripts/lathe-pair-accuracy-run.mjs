#!/usr/bin/env node
/**
 * lathe-pair-accuracy-run.mjs -- slot:whiskey  [exact per-pair accuracy DRIVER]
 * ==========================================================================
 * Closes the per-pair accuracy loop end-to-end on the REAL JM .MIN corpus:
 *   group .MIN by part number (>=2 revisions = a comparable pair, same set
 *   lathe-rungc-pairing reports) -> parse each revision into per-op params
 *   (parseMinOpParams) -> align ops by type/ordinal (matchOpPairsByType) ->
 *   score param-for-param closeness (scorePairSet) -> per-part verdict + aggregate.
 *
 * HONEST SCOPE (R12): with no PRISM-generated .MIN on disk and part GEOMETRY not
 * cleanly recoverable from a finished .MIN (that is why the closed loop scores vs
 * the statistical CLOUD, not per-part), this driver compares JM REVISION-vs-REVISION
 * of the same part. That measures the SHOP's own rev-over-rev parameter CONSISTENCY
 * (the inherent variability the wizard is ultimately judged against) AND proves the
 * extract->match->score machinery works on live data -- it is NOT a PRISM-accuracy
 * number (that needs the wizard run on recovered geometry; the ~10 print-bearing parts
 * are the path, a separate increment).
 *
 * Single node process -- no subprocess, no MCP, no wizard run. Bounded by --sample.
 *
 * Usage: node scripts/lathe-pair-accuracy-run.mjs [--sample 40] [--tol 10] [--all]
 * Output: state/shared/dashboards/lathe-pair-accuracy.json (+ console summary)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { groupByPart } from "./lib/lathe-part-number.mjs";
import { parseMinOpParams } from "./lib/lathe-min-op-params.mjs";
import { matchOpPairsByType, scorePairSet } from "./lib/lathe-pair-accuracy.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const DASH = join(REPO, "state", "shared", "dashboards");

function parseArgs(argv) {
  const a = { sample: 40, tol: 10, all: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--sample") a.sample = parseInt(argv[++i], 10) || a.sample;
    else if (t === "--tol") a.tol = parseFloat(argv[++i]) || a.tol;
    else if (t === "--all") a.all = true;
  }
  return a;
}

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) walk(fp, acc);
    else if (/\.min$/i.test(e.name)) acc.push(fp);
  }
}

function safeRead(fp) {
  try { return readFileSync(fp, "utf8"); } catch { return ""; }
}

function main() {
  const args = parseArgs(process.argv);
  const files = [];
  walk(ROOT, files);
  const groups = groupByPart(files);

  // comparable pairs: parts with >=2 revisions; pair the two most-recent-by-name (deterministic sort).
  const comparable = [];
  for (const [part, paths] of groups) {
    if (paths.length >= 2) {
      const sorted = [...paths].sort();
      comparable.push({ part, a: sorted[sorted.length - 1], b: sorted[sorted.length - 2] });
    }
  }
  comparable.sort((x, y) => x.part.localeCompare(y.part));
  const work = args.all ? comparable : comparable.slice(0, args.sample);

  const verdicts = { match: 0, close: 0, divergent: 0, "no-scoreable-ops": 0 };
  const perPart = [];
  const sfmErrs = [];
  const iprErrs = [];
  for (const { part, a, b } of work) {
    const genOps = parseMinOpParams(safeRead(a)).ops;   // "generated" stand-in = newer revision
    const refOps = parseMinOpParams(safeRead(b)).ops;   // "reference" = prior revision
    const r = scorePairSet(matchOpPairsByType(genOps, refOps), { tolPct: args.tol });
    verdicts[r.verdict] = (verdicts[r.verdict] ?? 0) + 1;
    if (r.median_sfm_error_pct != null) sfmErrs.push(r.median_sfm_error_pct);
    if (r.median_ipr_error_pct != null) iprErrs.push(r.median_ipr_error_pct);
    perPart.push({ part, ...r });
  }

  const median = (arr) => {
    const xs = arr.filter(Number.isFinite).sort((p, q) => p - q);
    if (!xs.length) return null;
    const m = Math.floor(xs.length / 2);
    return Math.round((xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2) * 10) / 10;
  };
  const scoredParts = perPart.filter((p) => p.verdict !== "no-scoreable-ops").length;
  const report = {
    schemaVersion: "1.0.0",
    measure: "JM rev-over-rev parameter CONSISTENCY (NOT PRISM accuracy -- see header)",
    tol_pct: args.tol,
    total_programs: files.length,
    comparable_parts: comparable.length,
    parts_scored: work.length,
    parts_with_scoreable_ops: scoredParts,
    verdicts,
    consistent_pct: scoredParts ? Math.round((verdicts.match / scoredParts) * 1000) / 10 : null,
    median_of_part_median_sfm_error_pct: median(sfmErrs),
    median_of_part_median_ipr_error_pct: median(iprErrs),
    sample_parts: perPart.slice(0, 12),
  };
  mkdirSync(DASH, { recursive: true });
  writeFileSync(join(DASH, "lathe-pair-accuracy.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: true,
    comparable_parts: comparable.length,
    parts_scored: work.length,
    parts_with_scoreable_ops: scoredParts,
    verdicts,
    consistent_pct: report.consistent_pct,
    median_sfm_err_pct: report.median_of_part_median_sfm_error_pct,
    median_ipr_err_pct: report.median_of_part_median_ipr_error_pct,
  }, null, 2));
}

main();
