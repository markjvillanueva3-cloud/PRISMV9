#!/usr/bin/env node
/**
 * lathe-prism-accuracy.mjs -- slot:whiskey  [the real PRISM-accuracy consumer]
 * ==========================================================================
 * The LAST piece of the exact per-pair accuracy loop: score the PRISM wizard's
 * per-op params (persisted on .MIN-paired Rung C-STEP steps by
 * U-W-RUNGC-OP-PARAMS-PERSIST) against the paired JM .MIN program, param-for-param,
 * via the exact scorer -- the per-part PRISM-accuracy % the band score cannot give.
 *
 * VOCAB SEAM (R16, surfaced building this): the wizard emits op-types like "od_rough"
 * while parseMinOpParams emits "rough" (band-ish). So both sides are NORMALIZED to the
 * common op BAND (classifyOpBand) before matchOpPairsByType pairs them -- otherwise the
 * raw-type match finds no common type. (rev-over-rev worked without this because both
 * sides came from the same extractor; cross-source needs the normalization.)
 *
 * `scorePrismVsMin` is PURE (op_params + .MIN text in, verdict out) -- unit-testable.
 * main() reads the live Rung C-STEP dashboard; until a Rung C-STEP run populates
 * `op_params` on the 28 .MIN-paired steps it HONESTLY reports 0 scoreable parts (R12).
 *
 * Usage: node scripts/lathe-prism-accuracy.mjs [--tol 10]
 * Output: state/shared/dashboards/lathe-prism-accuracy.json (+ console summary)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classifyOpBand } from "./lib/lathe-band-score.mjs";
import { parseMinOpParams } from "./lib/lathe-min-op-params.mjs";
import { matchOpPairsByType, matchOpBandRepresentative, scorePairSet } from "./lib/lathe-pair-accuracy.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const DASH = join(REPO, "state", "shared", "dashboards");

/** Normalize an op-list's operation_type to its common BAND so cross-source ops pair. */
function toBand(ops) {
  return (Array.isArray(ops) ? ops : []).map((o) => ({ ...o, operation_type: classifyOpBand(o?.operation_type) }));
}

/**
 * PURE: score PRISM wizard per-op params against a paired JM .MIN program's text.
 * @param {Array<{operation_type:string, cutting_speed_m_min:number, feed_mm_rev:number}>} opParams
 * @param {string} minText  raw paired .MIN program text
 * @returns the scorePairSet verdict ({n_ops_scored, verdict, median_*_error_pct, ...})
 */
export function scorePrismVsMin(opParams, minText, opts = {}) {
  const refOps = parseMinOpParams(minText).ops;
  // representative (default): PRISM's single OD op vs JM's MEDIAN OD op of that band -- the
  // trustworthy comparison on rich multi-op JM programs. strict (opts.strict): the original
  // k-th-op-by-band pairing, kept so both numbers are reported (R12 -- never hide the strict one).
  const pairs = opts.strict
    ? matchOpPairsByType(toBand(opParams), toBand(refOps))
    : matchOpBandRepresentative(opParams, refOps, opts);
  return scorePairSet(pairs, opts);
}

function safeRead(fp) {
  try { return readFileSync(fp, "utf8"); } catch { return ""; }
}

function main() {
  const argv = process.argv;
  let tol = 10;
  for (let i = 2; i < argv.length; i++) if (argv[i] === "--tol") tol = parseFloat(argv[++i]) || tol;

  let dash;
  try { dash = JSON.parse(readFileSync(join(DASH, "lathe-rungc-step.json"), "utf8")); }
  catch { console.log(JSON.stringify({ ok: false, error: "lathe-rungc-step.json not found -- run lathe-rungc-step-loop.mjs first" })); return; }

  const steps = (dash.steps || []).filter((s) => Array.isArray(s.op_params) && s.op_params.length > 0 && Array.isArray(s.paired_min) && s.paired_min.length > 0);

  // Score every paired part under BOTH matchers: representative (default headline) and strict (k-th).
  const runMode = (strict) => {
    const verdicts = { match: 0, close: 0, divergent: 0, "no-scoreable-ops": 0 };
    const perPart = [];
    for (const s of steps) {
      const r = scorePrismVsMin(s.op_params, safeRead(s.paired_min[0]), { tolPct: tol, strict });
      verdicts[r.verdict] = (verdicts[r.verdict] ?? 0) + 1;
      perPart.push({ part_number: s.part_number, paired_min: s.paired_min[0], ...r });
    }
    const scored = perPart.filter((p) => p.verdict !== "no-scoreable-ops").length;
    return { verdicts, perPart, parts_scored: scored, accuracy_match_pct: scored ? Math.round((verdicts.match / scored) * 1000) / 10 : null };
  };
  const representative = runMode(false);
  const strict = runMode(true);

  const report = {
    schemaVersion: "1.1.0",
    measure: "EXACT PRISM-vs-JM per-part accuracy (wizard params vs the paired .MIN, param-for-param)",
    tol_pct: tol,
    paired_steps_with_op_params: steps.length,
    representative: {
      note: "PRISM's OD op vs JM's MEDIAN OD op of each band (dia_in>=0.2in) -- trustworthy on rich multi-op JM programs",
      parts_scored: representative.parts_scored, verdicts: representative.verdicts, accuracy_match_pct: representative.accuracy_match_pct,
    },
    strict: {
      note: "original k-th-op-by-band pairing -- confounded by near-center finish ops; the lower-bound, kept for comparison (R12)",
      parts_scored: strict.parts_scored, verdicts: strict.verdicts, accuracy_match_pct: strict.accuracy_match_pct,
    },
    honest_note: steps.length === 0
      ? "0 .MIN-paired steps carry op_params yet -- run lathe-rungc-step-loop.mjs (post U-W-RUNGC-OP-PARAMS-PERSIST) to populate them, then re-run this."
      : "real exact PRISM-vs-JM accuracy over the .MIN-paired Rung C-STEP parts; representative is the headline, strict is the confounded lower bound.",
    sample_parts: representative.perPart.slice(0, 12),
  };
  mkdirSync(DASH, { recursive: true });
  writeFileSync(join(DASH, "lathe-prism-accuracy.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, paired_steps_with_op_params: steps.length,
    representative: { parts_scored: representative.parts_scored, verdicts: representative.verdicts, accuracy_match_pct: representative.accuracy_match_pct },
    strict: { parts_scored: strict.parts_scored, verdicts: strict.verdicts, accuracy_match_pct: strict.accuracy_match_pct },
    note: report.honest_note }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
