#!/usr/bin/env node
/**
 * cad-geom-eval-holdout.mjs -- DELTA-CAD-COMPLETION / U-DELTA-GEOM-EVAL-RUNNER (geometry modality).
 *
 * The GEOMETRY sibling of scripts/cad-eval-holdout.mjs (dim modality): scores a model's PREDICTED
 * B-Rep geometry files against the frozen geom-50 held-out split, via the TS harness
 * mcp-server/src/engines/cad/cadGeomEvalHarness.ts (which composes CADGeometryComparisonEngine --
 * volume/bbox/topology-Jaccard). This runner is the .mjs/TS BRIDGE that makes the harness executable
 * end-to-end: it imports the COMPILED harness from mcp-server/dist (the established scripts/ pattern,
 * e.g. build-machine-lora-datasets.mjs) and FAILS LOUD if dist is missing or OLDER than the harness /
 * comparison-engine sources -- a stale comparator can predate the inch->mm unit-normalize fix and
 * silently mis-measure inch parts 25.4x (UNITS-FIRST rail).
 *
 * Modes (mutually exclusive):
 *   --predictions <map.json>   { "<held abs_path>": "<predicted geometry file path>", ... }
 *                              (india's model-output contract -- keys are the split's truth abs_paths,
 *                               any case/separator; the harness normalizes FULL paths, never stems)
 *   --predictions-dir <dir>    flat dir of predicted files matched to held parts by basename
 *                              (THROWS on ambiguity; denominators stay keyed by full held path)
 *   --self-test                R12 pipeline proof WITHOUT a model: scores each held geometry against
 *                              ITSELF (expect passFraction 1) then against a +perturb-pct% coordinate-
 *                              scaled copy (expect graded degradation + gate FAIL). Binary parasolid
 *                              (.x_b) held parts are EXCLUDED (engine parses them as UNKNOWN -> a
 *                              vacuous 0==0 pass) and reported, never silently counted.
 *
 * Usage:
 *   node scripts/cad-geom-eval-holdout.mjs --split state/shared/cad-holdout/geom-50.json \
 *        (--predictions <preds.json> | --predictions-dir <dir> | --self-test [--perturb-pct 10] [--limit N]) \
 *        [--min-pass-fraction 0.9] [--min-mean-topology 0.9] [--min-coverage 0.5] [--json]
 * Exit: 0 gate PASS (self-test: verdict ok) | 1 gate FAIL | 2 bad args/IO/stale-dist.
 */
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { argv, exit } from "node:process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertDistFresh, parseGeomArgs, heldEntriesOf, predsFromJsonMap, predsFromDir,
  splitSelfTestSets, perturbStepContent, weakenedGateWarnings, buildGeomReport, selfTestVerdict,
} from "./lib/cad-geom-eval-runner-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The two files whose semantics this runner depends on: the harness (held-out discipline + gate) and
// the comparison engine (metrics; carries the U-CAD-COMPARE-UNIT-NORMALIZE inch->mm fix).
const DIST_PAIRS = [
  {
    src: path.join(ROOT, "mcp-server/src/engines/cad/cadGeomEvalHarness.ts"),
    dist: path.join(ROOT, "mcp-server/dist/engines/cad/cadGeomEvalHarness.js"),
  },
  {
    src: path.join(ROOT, "mcp-server/src/engines/CADGeometryComparisonEngine.ts"),
    dist: path.join(ROOT, "mcp-server/dist/engines/CADGeometryComparisonEngine.js"),
  },
];

function fail(msg) { process.stderr.write(`[geom-eval-holdout] ${msg}\n`); exit(2); }

function loadJson(p, label) {
  if (!existsSync(p)) fail(`--${label} not found: ${p}`);
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`--${label} is not valid JSON: ${e && e.message ? e.message : e}`); }
}

function printReport(rep, label) {
  console.log(`[geom-eval-holdout]${label ? ` ${label}:` : ""} held=${rep.heldTotal} scored=${rep.scored} coverage=${rep.coverage}`);
  const a = rep.aggregate;
  console.log(`  passFraction=${a.passFraction} meanPassRate=${a.meanPassRate} meanTopologySimilarity=${a.meanTopologySimilarity}`);
  console.log(`  missing-prediction=${rep.missingPrediction} compare-errors=${rep.compareErrors} non-held-predictions=${rep.nonHeldPredictions}`);
  console.log(`  GATE: ${rep.gate.pass ? "PASS" : "FAIL"}${rep.gate.reasons.length ? " -- " + rep.gate.reasons.join("; ") : ""}`);
}

async function main() {
  const parsed = parseGeomArgs(argv.slice(2));
  if (!parsed.ok) fail(parsed.errors.join("; "));
  const o = parsed.opts;

  // .mjs/TS bridge precondition: dist must exist and be fresh (THROWS -> exit 2).
  try { assertDistFresh(DIST_PAIRS, statSync); }
  catch (e) { fail(e.message); }
  const harness = await import(pathToFileURL(DIST_PAIRS[0].dist).href);
  const { geomEvalHeldOut, gateGeomEval, DEFAULT_MIN_PASS_FRACTION, DEFAULT_MIN_MEAN_TOPOLOGY, DEFAULT_MIN_COVERAGE } = harness;

  const split = loadJson(o.split, "split");
  const held = heldEntriesOf(split);
  if (held.length === 0) fail(`--split has no held entries: ${o.split}`);

  const gateOpts = { minPassFraction: o.minPassFraction ?? undefined, minMeanTopology: o.minMeanTopology ?? undefined, minCoverage: o.minCoverage ?? undefined };
  // R12 auditability (mirrors the dim runner): a CI line that lowers a floor below the default
  // contract quietly neuters the gate -- surface it loudly. Defaults come from the harness, never inlined.
  const weakened = weakenedGateWarnings(
    { minPassFraction: o.minPassFraction, minMeanTopology: o.minMeanTopology, minCoverage: o.minCoverage },
    { minPassFraction: DEFAULT_MIN_PASS_FRACTION, minMeanTopology: DEFAULT_MIN_MEAN_TOPOLOGY, minCoverage: DEFAULT_MIN_COVERAGE },
  );
  if (weakened.length) console.error(`[geom-eval-holdout] gate WEAKENED below the default contract: ${weakened.join(", ")}`);

  /* ---------------- self-test mode: prove the pipeline without a model ---------------- */
  if (o.selfTest) {
    const sets = splitSelfTestSets(held);
    let identityPaths = sets.identity;
    let perturbPaths = sets.perturbable;
    if (o.limit > 0) {
      identityPaths = identityPaths.slice(0, o.limit);
      perturbPaths = perturbPaths.filter((p) => identityPaths.includes(p));
      console.error(`[geom-eval-holdout] --limit ${o.limit}: scoring ${identityPaths.length}/${sets.identity.length} identity parts -- NOT a full self-test (R12)`);
    }
    if (sets.unsupported.length) {
      console.error(`[geom-eval-holdout] ${sets.unsupported.length} held part(s) EXCLUDED from self-test (engine parses as UNKNOWN -> vacuous pass): ${sets.unsupported.map((p) => path.basename(p)).join(", ")}`);
    }
    if (sets.missingFiles.length) {
      console.error(`[geom-eval-holdout] ${sets.missingFiles.length} held file(s) NOT on disk: ${sets.missingFiles.join(", ")}`);
    }
    if (identityPaths.length === 0) fail("self-test has 0 scoreable held files -- nothing to prove");

    // Phase 1 -- identity: truth vs itself. The FULL split stays the denominator (heldTotal honest);
    // excluded/missing parts show up as missingPrediction, visible in coverage.
    const identityPred = Object.fromEntries(identityPaths.map((p) => [p, p]));
    const t0 = Date.now();
    const identityResult = geomEvalHeldOut(identityPred, split);
    const identityReport = buildGeomReport(identityResult, gateGeomEval(identityResult, gateOpts), { phase: "identity", ms: Date.now() - t0 });

    // Phase 2 -- perturbed: truth vs a coordinate-scaled copy (STEP only). Uniform scale by
    // perturb-pct: bbox axes shift exactly that %, bbox-proxy volume by (1+f)^3-1, topology
    // unchanged -> GRADED degradation (passRate ~0.5), never obliteration.
    const tmp = mkdtempSync(path.join(tmpdir(), "prism-geom-selftest-"));
    let perturbedReport;
    try {
      const fraction = o.perturbPct / 100;
      const perturbedPred = {};
      let totalPoints = 0;
      for (let i = 0; i < perturbPaths.length; i++) {
        const src = perturbPaths[i];
        const { content, pointsPerturbed } = perturbStepContent(readFileSync(src, "utf8"), fraction);
        const out = path.join(tmp, `${i}-${path.basename(src)}`); // index prefix: basenames may repeat across dirs
        writeFileSync(out, content, "utf8");
        perturbedPred[src] = out;
        totalPoints += pointsPerturbed;
      }
      console.error(`[geom-eval-holdout] perturbed ${perturbPaths.length} STEP file(s) by +${o.perturbPct}% (${totalPoints} points scaled)`);
      const t1 = Date.now();
      const perturbedResult = geomEvalHeldOut(perturbedPred, split);
      perturbedReport = buildGeomReport(perturbedResult, gateGeomEval(perturbedResult, gateOpts), { phase: "perturbed", perturbPct: o.perturbPct, ms: Date.now() - t1 });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    const verdict = selfTestVerdict(identityReport, perturbedReport, { limited: o.limit > 0 });
    if (o.json) {
      console.log(JSON.stringify({ modality: "geometry", mode: "self-test", verdict, identity: identityReport, perturbed: perturbedReport,
        excludedUnsupported: sets.unsupported.length, missingFiles: sets.missingFiles.length, limited: o.limit > 0 }, null, 2));
    } else {
      printReport(identityReport, "IDENTITY (truth vs itself)");
      printReport(perturbedReport, `PERTURBED (+${o.perturbPct}% coordinate scale)`);
      console.log(`  SELF-TEST: ${verdict.ok ? "OK -- pipeline proven (identity ~100%, perturbed degraded + gate FAIL)" : "BROKEN -- " + verdict.reasons.join("; ")}`);
    }
    exit(verdict.ok ? 0 : 1);
  }

  /* ---------------- prediction modes: score a real model's output ---------------- */
  let predByPath;
  let unmatchedDirFiles = [];
  if (o.predictions) {
    predByPath = predsFromJsonMap(loadJson(o.predictions, "predictions"));
  } else {
    if (!existsSync(o.predictionsDir)) fail(`--predictions-dir not found: ${o.predictionsDir}`);
    let files;
    try { files = readdirSync(o.predictionsDir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name); }
    catch (e) { fail(`cannot read --predictions-dir: ${e.message}`); }
    try { ({ predByPath, unmatchedDirFiles } = predsFromDir(held, files, o.predictionsDir)); }
    catch (e) { fail(e.message); } // ambiguity THROW -> exit 2
    if (unmatchedDirFiles.length) {
      console.error(`[geom-eval-holdout] ${unmatchedDirFiles.length} prediction file(s) match NO held part (check naming): ${unmatchedDirFiles.slice(0, 10).join(", ")}${unmatchedDirFiles.length > 10 ? " ..." : ""}`);
    }
  }

  const result = geomEvalHeldOut(predByPath, split);
  const gate = gateGeomEval(result, gateOpts);
  const report = buildGeomReport(result, gate, unmatchedDirFiles.length ? { unmatchedDirFiles: unmatchedDirFiles.length } : {});

  if (o.json) console.log(JSON.stringify(report, null, 2));
  else {
    printReport(report, "");
    if (result.compareErrors.length) console.log(`  compare-error keys (first 5): ${result.compareErrors.slice(0, 5).join(" | ")}`);
  }
  exit(gate.pass ? 0 : 1);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
