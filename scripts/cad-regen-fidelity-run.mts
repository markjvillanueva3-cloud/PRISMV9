/**
 * scripts/cad-regen-fidelity-run.mts -- headless CAD regen-fidelity runner (slot:delta, T3 geometry half).
 *
 * U-CAD-REGEN-FIDELITY-RUN. Records REAL dimensional-fidelity + self-consistency numbers across the
 * 240 cadquery-generated prismatic STEPs (state/shared/cad-text-gen/<slug>/model.step) + a reference
 * STEP measurement pass, into CAD-REGEN-FIDELITY-RESULT-<date>.json.
 *
 * HONEST SCOPE (R12, per the 2026-06-26 recon): a TRUE NURBS regen-fidelity run is MERGE-GATED (no
 * B_SPLINE_SURFACE emitter exists in any branch). This records what IS achievable headless on trunk:
 *   (A) generated-prismatic: measured bbox vs the spec's intended bbox (dim band mean<=2%/worst<=6%)
 *       + determinism (compare(step,step).overallPassed -- the measure+compare pipeline is consistent);
 *   (B) reference measurement: bbox + entity counts + compare(ref,ref) self-consistency (NURBS-safe
 *       post analyzer-overflow fix 88c20606bd).
 * It NEVER claims the merge-gated NURBS regen fidelity; that is surfaced in `gated{}`.
 *
 * The pure core (parse/dim-delta/band/aggregate) is in scripts/lib/cad-regen-fidelity-lib.mjs (R8);
 * this is the I/O boundary. Composes the VERIFIED engine API: cadGeometryComparisonEngine.extractMetrics
 * (CADGeometryComparisonEngine.ts:397, pure-TS regex, no python) + .compare (:1074, returns overallPassed).
 * Per-call thresholds are passed to compare() -- the global singleton thresholds are NEVER mutated.
 *
 * RUN VIA TSX (NodeNext .js->.ts engine import; bare node hits the Node-24 trap):
 *   npx tsx scripts/cad-regen-fidelity-run.mts --json
 *   npx tsx scripts/cad-regen-fidelity-run.mts --apply --limit 240
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { cadGeometryComparisonEngine } from "../mcp-server/src/engines/CADGeometryComparisonEngine.js";
import {
  parseInchesFromSpec,
  dimFidelity,
  bandPass,
  aggregate,
  INCH_TO_MM,
  DEFAULT_BAND,
  invalidRefBasenameSet,
} from "./lib/cad-regen-fidelity-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
export const GEN_DIR = path.join(REPO_ROOT, "state/shared/cad-text-gen");
export const REF_DIR = path.join(REPO_ROOT, "resources/CAD FILES");
export const RESULT_PATH = path.join(REPO_ROOT, "state/shared/specs/CAD-REGEN-FIDELITY-RESULT-2026-06-26.json");
const SCHEMA_VERSION = "1.0.0";
// Per-call thresholds (NEVER setThresholds -- that mutates the global singleton; recon blocker #3).
const COMPARE_THRESHOLDS = { bboxDeltaPercent: 2, volumeDeltaPercent: 5, topologySimilarityMin: 0.8, featureCountDeltaPercent: 20 };

interface GenPart {
  slug: string;
  dir: string;
  stepPath: string;
  request: string;
  analysisExit: number | null;
}

/** Read a JSON file fail-soft (-> null). */
function readJsonSoft(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Enumerate generated parts that have a model.step on disk. */
export function listGeneratedParts(genDir: string = GEN_DIR, limit = Infinity): GenPart[] {
  let dirs: string[];
  try {
    dirs = fs.readdirSync(genDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  const out: GenPart[] = [];
  for (const slug of dirs) {
    const dir = path.join(genDir, slug);
    const stepPath = path.join(dir, "model.step");
    if (!fs.existsSync(stepPath)) continue;
    const req = readJsonSoft(path.join(dir, "request.json"));
    const status = readJsonSoft(path.join(dir, "status.json"));
    out.push({
      slug,
      dir,
      stepPath,
      request: typeof req?.request === "string" ? (req.request as string) : "",
      analysisExit: typeof status?.analysisExit === "number" ? (status.analysisExit as number) : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Measure one STEP: bbox (mm) + volume + determinism (compare to itself -> overallPassed). */
export function measurePart(stepPath: string): {
  ok: boolean;
  bboxMm: number[];
  volume: number;
  volumeMethod: string;
  entityCount: number;
  determinismPassed: boolean;
  error: string | null;
} {
  try {
    const m = cadGeometryComparisonEngine.extractMetrics(stepPath);
    const bboxMm = [m.boundingBox.sizeX, m.boundingBox.sizeY, m.boundingBox.sizeZ];
    const cmp = cadGeometryComparisonEngine.compare(stepPath, stepPath, COMPARE_THRESHOLDS);
    const entityCount = Object.values(m.topology?.entityTypes ?? {}).reduce((s: number, n) => s + Number(n || 0), 0);
    return {
      ok: true,
      bboxMm,
      volume: m.volume,
      volumeMethod: m.volumeMethod ?? "none",
      entityCount,
      determinismPassed: cmp.overallPassed === true,
      error: null,
    };
  } catch (e) {
    return { ok: false, bboxMm: [], volume: 0, volumeMethod: "none", entityCount: 0, determinismPassed: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Evaluate one generated part: measurement + intended-dim band (where the spec parses). */
export function evalGeneratedPart(part: GenPart) {
  const meas = measurePart(part.stepPath);
  const spec = parseInchesFromSpec(part.request);
  // Dim band ONLY on bboxMeasurable archetypes (cubes) -- extractMetrics' point-cloud bbox is exact
  // for all-planar parts but UNDER-measures curved geometry (a cylinder reads ~[radius,0,length]).
  const bboxMeasurable = spec.parsed && spec.bboxMeasurable === true;
  let fid: ReturnType<typeof dimFidelity> | null = null;
  let passed = false;
  if (bboxMeasurable && meas.ok) {
    const intendedMm = spec.dimsInch.map((v: number) => v * INCH_TO_MM);
    fid = dimFidelity(intendedMm, meas.bboxMm);
    passed = bandPass(fid, meas.determinismPassed);
  }
  return {
    slug: part.slug,
    request: part.request,
    intentParsed: spec.parsed,
    bboxMeasurable,
    intentReason: spec.parsed ? spec.archetype : spec.reason,
    measured: meas.ok ? { bboxMm: meas.bboxMm.map((v) => +v.toFixed(4)), volumeMethod: meas.volumeMethod, entityCount: meas.entityCount } : null,
    determinismPassed: meas.determinismPassed,
    analysisExit: part.analysisExit,
    fid: fid && fid.ok ? { meanDeltaPct: +fid.meanDeltaPct.toFixed(4), worstDeltaPct: +fid.worstDeltaPct.toFixed(4) } : null,
    passed,
    error: meas.error,
  };
}

/** Evaluate one reference STEP: measurement + self-consistency (NO intended dims -- not a regen). */
export function evalReferencePart(refPath: string) {
  const meas = measurePart(refPath);
  return {
    file: path.basename(refPath),
    measured: meas.ok ? { bboxMm: meas.bboxMm.map((v) => +v.toFixed(2)), volumeMethod: meas.volumeMethod, entityCount: meas.entityCount } : null,
    selfConsistencyPassed: meas.determinismPassed, // compare(ref,ref).overallPassed
    analyzerNoOverflow: meas.ok, // extractMetrics succeeded (the 88c20606bd fix path)
    error: meas.error,
  };
}

/**
 * Load the topologically-INVALID reference basenames to exclude, from the corpus topology-audit report
 * (scripts/cad-corpus-topology-audit.mjs --write). Fail-soft: a missing/corrupt report -> empty set (no
 * exclusion), so the fidelity run never breaks when the audit has not been run on this host.
 */
export function loadInvalidRefSet(reportPath: string = path.join(REPO_ROOT, "state/shared/cad-corpus-topology-report.json")): Set<string> {
  try {
    const rep = JSON.parse(fs.readFileSync(reportPath, "utf8")) as { invalidPaths?: unknown };
    return invalidRefBasenameSet(rep?.invalidPaths as string[] | undefined);
  } catch {
    return new Set();
  }
}

/**
 * List reference STEP files in resources/CAD FILES (cap for runtime), EXCLUDING topologically-broken parts.
 * A non-manifold/self-intersecting reference is meaningless ground truth (measuring a gen against it
 * pollutes referenceMeasurement), so it is dropped BEFORE the cap -- reclaiming the slot for a valid part.
 * The live corpus census (2026-07-04) found 2 broken refs (Body 1.step, Full Part.step) that sort within
 * the first `cap` alphabetically, so without this filter they WOULD be measured.
 */
export function listReferenceParts(refDir: string = REF_DIR, cap = 12, invalid: Set<string> = loadInvalidRefSet()): string[] {
  try {
    return fs
      .readdirSync(refDir)
      .filter((f) => /\.(step|stp)$/i.test(f))
      .filter((f) => !invalid.has(f.toLowerCase()))
      .slice(0, cap)
      .map((f) => path.join(refDir, f));
  } catch {
    return [];
  }
}

/** Build the full result artifact. `stampedAt` is injected (no Date.now in the builder). */
export function buildResult(generated: ReturnType<typeof evalGeneratedPart>[], reference: ReturnType<typeof evalReferencePart>[], stampedAt: string) {
  const agg = aggregate(generated);
  // R12: surface the REAL findings, not just buried per-part data. A bboxMeasurable (cube) part that
  // fails the band is a genuine generation defect -- the measurement is exact for cubes, so a 100%
  // delta means the generated geometry is wrong (e.g. the v-block emitted at 2x Z extent).
  const generationDefects = generated
    .filter((p) => p.bboxMeasurable && p.determinismPassed && !p.passed && p.fid)
    .map((p) => ({ slug: p.slug, request: p.request, measuredBboxMm: p.measured?.bboxMm, worstDeltaPct: p.fid?.worstDeltaPct, analysisExit: p.analysisExit }));
  return {
    schemaVersion: SCHEMA_VERSION,
    artifact: "CAD-REGEN-FIDELITY-RESULT",
    stampedAt,
    kernel: "cadquery-2.8.0 (trunk headless) + CADGeometryComparisonEngine",
    band: DEFAULT_BAND,
    scope: "ACHIEVABLE-ON-TRUNK: generated-prismatic dimensional-fidelity + self-consistency, and reference-corpus measurement. NOT the merge-gated NURBS regen (see gated).",
    aggregate: agg,
    generatedPrismatic: generated,
    referenceMeasurement: reference,
    gated: {
      nurbsRegenFidelity: "MERGE+BUILD-gated: no B_SPLINE_SURFACE emitter exists on trunk or in slot/delta (recon 2026-06-26). A blisk-class regen-fidelity (re-emit the NURBS net, compare ~0% surface) is NOT achievable headless on trunk.",
      faceCountFidelityRatio: "slot/delta-only tooling (cad-corpus-fidelity-ratio.mjs / cad-step-topology-validate.mjs) -- unblocks at U-MERGE-SLOT-DELTA.",
    },
    findings: {
      generationDefects,
      generationDefectNote: generationDefects.length
        ? `${generationDefects.length} cube part(s) FAILED the dim band despite exact point-cloud measurement -> REAL generation defect (cadquery emitted wrong geometry). A v-block emitted at 2x Z extent is the canonical case.`
        : "no generation defects among bboxMeasurable parts",
      measurementLimitation: "extractMetrics' bbox is CARTESIAN_POINT-cloud-derived: EXACT for all-planar parts (cubes) but UNDER-measures curved geometry (cylinder reads ~[radius,0,length]). Curved + plate parts are excluded from the dim band and kept for determinism only.",
    },
    verdict: {
      determinismPassRate: agg.determinismPassRate,
      dimBandPassRate: agg.dimBandPassRate,
      bandMet: agg.bandMet,
      note: "T2(held-out-50) and T3(print-callout) gates are NOT satisfied by this artifact -- this is the generation-fidelity/self-consistency evidence the analyzer fix (88c20606bd) unblocked.",
    },
  };
}

function argVal(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<number> {
  const json = hasFlag("json");
  const limitRaw = Number(argVal("limit", "240"));
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.trunc(limitRaw)) : 240;
  const apply = hasFlag("apply");

  const genParts = listGeneratedParts(GEN_DIR, limit);
  const generated = genParts.map(evalGeneratedPart);
  const reference = listReferenceParts().map(evalReferencePart);
  const result = buildResult(generated, reference, new Date().toISOString());

  let written = false;
  if (apply) {
    try {
      fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
      fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2), "utf8");
      written = true;
    } catch {
      written = false;
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ ...result, written, applied: apply }) + "\n");
  } else {
    const a = result.aggregate;
    process.stdout.write(
      `[CAD-REGEN-FIDELITY] generated=${generated.length} reference=${reference.length}\n` +
        `  determinism pass-rate: ${a.determinismPassRate} (${a.total} parts)\n` +
        `  dim-band evaluated: ${a.dimEvaluatedParts} | band-pass: ${a.dimBandPassParts} (rate ${a.dimBandPassRate})\n` +
        `  mean dim delta: ${a.meanDimDeltaPct}% | worst: ${a.worstDimDeltaPct}% | bandMet(<=2/<=6): ${a.bandMet}\n` +
        `  reference self-consistency: ${reference.filter((r) => r.selfConsistencyPassed).length}/${reference.length} | analyzer no-overflow: ${reference.filter((r) => r.analyzerNoOverflow).length}/${reference.length}\n` +
        `  written=${written} applied=${apply}\n`,
    );
  }
  return 0;
}

const invokedDirectly = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    return Boolean(argv1) && import.meta.url.replace(/\\/g, "/").endsWith(argv1.split("/").pop() || " ");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main()
    .then((code) => process.exit(typeof code === "number" ? code : 0))
    .catch((err) => {
      process.stderr.write(`cad-regen-fidelity-run FATAL: ${err && err.stack ? err.stack : err}\n`);
      process.exit(1);
    });
}
