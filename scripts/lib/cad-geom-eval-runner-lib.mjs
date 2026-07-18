#!/usr/bin/env node
/**
 * cad-geom-eval-runner-lib.mjs -- DELTA-CAD-COMPLETION / U-DELTA-GEOM-EVAL-RUNNER (geometry modality).
 *
 * PURE core of the geometry-modality holdout runner (scripts/cad-geom-eval-holdout.mjs) -- the .mjs/TS
 * bridge that makes cadGeomEvalHarness.ts (mcp-server/src/engines/cad/) executable end-to-end against
 * the frozen geom-50 split. The runner imports the COMPILED harness from mcp-server/dist (the
 * established scripts/ pattern -- e.g. build-machine-lora-datasets.mjs distResolver); THIS lib holds
 * everything hermetic-testable WITHOUT dist: dist-staleness fail-loud, arg parsing, predictions-dir
 * mapping (full-path-keyed denominator, ambiguity fail-loud), STEP perturbation for the self-test,
 * weakened-gate warnings, and the report shape (mirrors the dim modality's cad-eval-holdout.mjs).
 *
 * WHY the staleness gate is a THROW, not a warning: a stale dist can predate the engine's
 * U-CAD-COMPARE-UNIT-NORMALIZE inch->mm fix and silently mis-measure inch parts 25.4x (the UNITS-FIRST
 * trap). An eval gate that scores with a unit-blind comparator is worse than no gate (R12).
 *
 * Pure: no dist import, no process.exit; fs functions are injectable for hermetic tests.
 */
import { statSync as defaultStatSync, existsSync as defaultExistsSync } from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------------------------------------
 * Dist freshness (fail-loud .mjs/TS bridge precondition)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Assert every compiled dist file exists AND is at least as new as its TS source. THROWS otherwise
 * (fail-loud: a missing dist means "never built"; an older dist means the source changed after the
 * last build -- scoring with it would silently use stale comparator semantics, incl. the 25.4x
 * inch/mm trap the engine's unit-normalize fix closed).
 * @param {Array<{src:string, dist:string}>} pairs  source .ts -> compiled dist .js
 * @param {(p:string)=>{mtimeMs:number}} [statFn]   injectable for hermetic tests
 * @returns {{checked:number}}
 */
export function assertDistFresh(pairs, statFn = defaultStatSync) {
  if (!Array.isArray(pairs) || pairs.length === 0) throw new Error("assertDistFresh: no src/dist pairs given");
  // build:incremental (tsc) regenerates the per-file dist/engines/*.js this runner imports;
  // build:fast (esbuild) only bundles dist/index.js and would loop this very error.
  // [[reference_delta_dist_buildfast_vs_incremental_2026_06_10]]
  const rebuild = "run: (cd mcp-server && npm run build:incremental) then re-run this command";
  for (const { src, dist } of pairs) {
    let srcStat;
    try { srcStat = statFn(src); }
    catch { throw new Error(`harness source missing: ${src} -- cannot verify dist freshness`); }
    let distStat;
    try { distStat = statFn(dist); }
    catch { throw new Error(`compiled dist missing: ${dist} -- ${rebuild}`); }
    if (distStat.mtimeMs < srcStat.mtimeMs) {
      throw new Error(
        `STALE dist: ${dist} (built ${new Date(distStat.mtimeMs).toISOString()}) is OLDER than its source ` +
        `${src} (modified ${new Date(srcStat.mtimeMs).toISOString()}). A stale comparator can mis-measure ` +
        `inch parts 25.4x -- refusing to score. ${rebuild}`,
      );
    }
  }
  return { checked: pairs.length };
}

/* ------------------------------------------------------------------------------------------------
 * Arg parsing (runner CLI surface)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Parse the geometry-runner argv (already sliced past node+script). Mirrors the dim runner's flag
 * style. Returns { ok, errors[], opts } -- never throws, never exits (the runner maps !ok -> exit 2).
 * Modes are mutually exclusive: --predictions <map.json> | --predictions-dir <dir> | --self-test.
 */
export function parseGeomArgs(args) {
  const errors = [];
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const num = (f) => {
    const v = get(f);
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) errors.push(`${f} is not a number: ${v}`);
    return Number.isFinite(n) ? n : null;
  };
  const opts = {
    split: get("--split"),
    predictions: get("--predictions"),
    predictionsDir: get("--predictions-dir"),
    selfTest: args.includes("--self-test"),
    perturbPct: num("--perturb-pct") ?? 10,
    limit: num("--limit") ?? 0, // 0 = all held parts (self-test); >0 caps for a quick smoke (reported loudly)
    json: args.includes("--json"),
    minPassFraction: num("--min-pass-fraction"),
    minMeanTopology: num("--min-mean-topology"),
    minCoverage: num("--min-coverage"),
  };
  if (!opts.split) errors.push("missing --split <geom-split.json>");
  const modes = [opts.predictions ? 1 : 0, opts.predictionsDir ? 1 : 0, opts.selfTest ? 1 : 0]
    .reduce((a, b) => a + b, 0);
  if (modes === 0) errors.push("choose a mode: --predictions <map.json> | --predictions-dir <dir> | --self-test");
  if (modes > 1) errors.push("--predictions, --predictions-dir and --self-test are mutually exclusive");
  if (opts.perturbPct <= 0) errors.push(`--perturb-pct must be > 0 (got ${opts.perturbPct})`);
  if (opts.limit < 0) errors.push(`--limit must be >= 0 (got ${opts.limit})`);
  return { ok: errors.length === 0, errors, opts };
}

/* ------------------------------------------------------------------------------------------------
 * Predictions input shaping (denominator ALWAYS keyed by the held part's UNIQUE FULL abs_path)
 * ---------------------------------------------------------------------------------------------- */

/** Extract the held entries array from a frozen split object (or a bare entry array). */
export function heldEntriesOf(splitOrEntries) {
  if (Array.isArray(splitOrEntries)) return splitOrEntries;
  const held = splitOrEntries && splitOrEntries.held;
  return Array.isArray(held) ? held : [];
}

/**
 * Validate a {heldAbsPath -> predictedFilePath} map loaded from --predictions JSON. Keys pass through
 * to the harness (which normalizes them against the split's abs_paths); values must be non-empty
 * strings. THROWS on a non-object or non-string value (a malformed prediction set must never score).
 */
export function predsFromJsonMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("--predictions must be a JSON object: { \"<held abs_path>\": \"<predicted geometry file path>\" }");
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "string" || !v.trim()) throw new Error(`--predictions value for key '${k}' is not a file path string`);
    out[k] = v;
  }
  return out;
}

/**
 * Map a flat predictions DIRECTORY onto held parts by case-insensitive BASENAME -- a lookup
 * CONVENIENCE only; the returned map is keyed by the held part's FULL abs_path, so the eval
 * denominator can never stem-collide (the dim-modality coverage-inflation lesson).
 * FAIL-LOUD ambiguity: if one dir file's basename matches 2+ held parts (held parts sharing a stem),
 * THROWS -- that assignment cannot be disambiguated by convention; use an explicit --predictions map.
 * @param {Array<{abs_path:string}>} heldEntries  from the frozen split
 * @param {string[]} dirFiles  basenames present in the predictions dir (flat, non-recursive)
 * @param {string} dirPath  the predictions dir (values are joined onto it)
 * @returns {{predByPath:Record<string,string>, unmatchedDirFiles:string[]}}
 */
export function predsFromDir(heldEntries, dirFiles, dirPath) {
  const byBase = new Map(); // lower basename -> [held abs_path...]
  for (const e of heldEntries) {
    if (!e || typeof e.abs_path !== "string" || !e.abs_path.trim()) continue;
    const base = path.basename(e.abs_path).toLowerCase();
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(e.abs_path);
  }
  const predByPath = {};
  const unmatchedDirFiles = [];
  for (const f of dirFiles) {
    const holders = byBase.get(String(f).toLowerCase());
    if (!holders || holders.length === 0) { unmatchedDirFiles.push(f); continue; }
    if (holders.length > 1) {
      throw new Error(
        `ambiguous predictions-dir match: '${f}' matches ${holders.length} held parts sharing that basename ` +
        `(${holders.join(" | ")}). Basename matching cannot disambiguate -- supply an explicit ` +
        `--predictions map keyed by the full held abs_path.`,
      );
    }
    predByPath[holders[0]] = path.join(dirPath, f);
  }
  return { predByPath, unmatchedDirFiles };
}

/* ------------------------------------------------------------------------------------------------
 * Self-test support (prove the pipeline without a model -- R12: no fabricated predictions)
 * ---------------------------------------------------------------------------------------------- */

/** Text CAD formats CADGeometryComparisonEngine actually parses (of the exts geom splits carry).
 *  Binary parasolid (.x_t/.x_b) parses as UNKNOWN -> empty metrics -> a compare-to-self would be a
 *  VACUOUS pass (0==0 on every metric); the self-test EXCLUDES those and says so, rather than
 *  padding its "~100%" with vacuous passes. */
export const SELFTEST_PARSEABLE_EXTS = [".step", ".stp", ".igs", ".iges", ".dxf", ".stl"];
/** Only STEP is perturbed (coordinate-scale); IGES is fixed-column -- a naive numeric rewrite risks
 *  corrupting the format rather than perturbing the geometry. */
export const SELFTEST_PERTURBABLE_EXTS = [".step", ".stp"];

/**
 * Partition held entries for the self-test: identity-comparable (parseable + on disk), perturbable
 * (STEP subset of identity), unsupported (engine can't parse -> excluded, reported), missing files.
 * @param {(p:string)=>boolean} [existsFn] injectable for hermetic tests
 */
export function splitSelfTestSets(heldEntries, existsFn = defaultExistsSync) {
  const identity = [], perturbable = [], unsupported = [], missingFiles = [];
  for (const e of heldEntries) {
    if (!e || typeof e.abs_path !== "string" || !e.abs_path.trim()) continue;
    const p = e.abs_path;
    const ext = path.extname(p).toLowerCase();
    if (!SELFTEST_PARSEABLE_EXTS.includes(ext)) { unsupported.push(p); continue; }
    if (!existsFn(p)) { missingFiles.push(p); continue; }
    identity.push(p);
    if (SELFTEST_PERTURBABLE_EXTS.includes(ext)) perturbable.push(p);
  }
  return { identity, perturbable, unsupported, missingFiles };
}

// Same triplet shape the engine's extractBoundingBoxFromSTEP matches, so a perturbation here is
// GUARANTEED visible to the comparator (perturbing text the engine ignores would be a vacuous test).
const STEP_POINT_RE = /(CARTESIAN_POINT\s*\([^)]*,\s*\(\s*)([-\d.eE+]+)(\s*,\s*)([-\d.eE+]+)(\s*,\s*)([-\d.eE+]+)(\s*\))/gi;

/**
 * Scale every CARTESIAN_POINT coordinate in STEP content by (1 + fraction) -- a uniform geometric
 * scale, so bbox axes grow by exactly `fraction` and the bbox-proxy volume by (1+fraction)^3-1,
 * while topology/feature counts stay identical (GRADED degradation, not obliteration). The file
 * stays parseable and its unit declaration is untouched (both sides of a compare normalize to mm
 * identically -- the perturbation survives inch files unchanged).
 * THROWS if zero points were perturbed: a no-op perturbation would fake the degradation proof.
 * @returns {{content:string, pointsPerturbed:number}}
 */
export function perturbStepContent(content, fraction) {
  if (typeof content !== "string" || !content) throw new Error("perturbStepContent: empty content");
  if (!Number.isFinite(fraction) || fraction === 0) throw new Error(`perturbStepContent: bad fraction ${fraction}`);
  const scale = 1 + fraction;
  let count = 0;
  const out = content.replace(STEP_POINT_RE, (_m, pre, x, s1, y, s2, z, post) => {
    const sx = parseFloat(x) * scale, sy = parseFloat(y) * scale, sz = parseFloat(z) * scale;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz)) return _m; // leave unparseable triplets alone
    count++;
    return `${pre}${sx}${s1}${sy}${s2}${sz}${post}`;
  });
  if (count === 0) {
    throw new Error("perturbStepContent: no CARTESIAN_POINT coordinates found -- perturbation would be a no-op (vacuous self-test)");
  }
  return { content: out, pointsPerturbed: count };
}

/* ------------------------------------------------------------------------------------------------
 * Gate-weakening audit + report shape (mirrors the dim runner)
 * ---------------------------------------------------------------------------------------------- */

/**
 * R12 auditability (mirror of the dim runner's WEAKENED warning): a CI line that lowers a floor
 * below the default contract quietly neuters the eval gate -- surface it loudly. Defaults are passed
 * IN (they live canonically in cadGeomEvalHarness.ts; the runner imports them from dist -- this lib
 * never re-inlines them).
 * @returns {string[]} human-readable weakening descriptions (empty = contract intact)
 */
export function weakenedGateWarnings(opts, defaults) {
  const w = [];
  const { minPassFraction, minMeanTopology, minCoverage } = opts ?? {};
  if (minPassFraction != null && minPassFraction < defaults.minPassFraction) {
    w.push(`min-pass-fraction=${minPassFraction} (<default ${defaults.minPassFraction})`);
  }
  if (minMeanTopology != null && minMeanTopology < defaults.minMeanTopology) {
    w.push(`min-mean-topology=${minMeanTopology} (<default ${defaults.minMeanTopology})`);
  }
  if (minCoverage != null && minCoverage < defaults.minCoverage) {
    w.push(`min-coverage=${minCoverage} (<default ${defaults.minCoverage})`);
  }
  return w;
}

/**
 * The geometry modality's JSON report -- same shape family as the dim runner's (gate + aggregate +
 * scored/heldTotal/coverage + count fields), with the geometry-specific compareErrors in place of the
 * dim-only missingTruth (geometry truth IS the held file itself).
 */
export function buildGeomReport(result, gate, extra = {}) {
  return {
    modality: "geometry",
    gate,
    aggregate: result.aggregate,
    scored: result.scored,
    heldTotal: result.heldTotal,
    coverage: gate.coverage,
    missingPrediction: result.missingPrediction.length,
    compareErrors: result.compareErrors.length,
    nonHeldPredictions: result.nonHeldPredictions.length,
    ...extra,
  };
}

/**
 * Deterministic self-test verdict (R12: the pipeline is "proven" only if BOTH directions hold):
 * identity (truth vs itself) must score passFraction 1 with zero compare errors, and the perturbed
 * copy must show GRADED degradation -- strictly lower meanPassRate + passFraction, and a FAILING gate.
 * A FULL run additionally requires the identity GATE to pass (incl. its coverage floor); a --limit
 * smoke run (opts.limited) skips ONLY that gate requirement -- a capped run can never meet the
 * coverage floor over the full held denominator, and shrinking the denominator instead is exactly
 * the coverage-inflation failure mode this modality refuses.
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function selfTestVerdict(identityReport, perturbedReport, opts = {}) {
  const reasons = [];
  const iAgg = identityReport?.aggregate ?? {};
  const pAgg = perturbedReport?.aggregate ?? {};
  if (!opts.limited && !identityReport?.gate?.pass) {
    reasons.push("identity phase gate FAILED (compare-to-self must pass the full gate on an unlimited run)");
  }
  if (iAgg.passFraction !== 1) reasons.push(`identity passFraction ${iAgg.passFraction} !== 1`);
  if ((identityReport?.compareErrors ?? 0) !== 0) reasons.push(`identity phase had ${identityReport.compareErrors} compare error(s)`);
  if (perturbedReport?.gate?.pass) reasons.push("perturbed phase gate PASSED (a scaled copy must fail the gate)");
  if (!(Number.isFinite(pAgg.meanPassRate) && Number.isFinite(iAgg.meanPassRate) && pAgg.meanPassRate < iAgg.meanPassRate)) {
    reasons.push(`perturbed meanPassRate ${pAgg.meanPassRate} not < identity ${iAgg.meanPassRate} (no graded degradation)`);
  }
  if (!(Number.isFinite(pAgg.passFraction) && pAgg.passFraction < iAgg.passFraction)) {
    reasons.push(`perturbed passFraction ${pAgg.passFraction} not < identity ${iAgg.passFraction}`);
  }
  return { ok: reasons.length === 0, reasons };
}
