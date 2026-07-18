#!/usr/bin/env node
/**
 * cad-self-check.mjs (U-DELTA-CAD-SELF-CHECK, slot:delta 2026-06-29)
 *
 * Stage-0 of the operator's closed-loop CAD validation architecture: the 2D-SKETCH self-check -- the FIRST
 * line of self-checking a generated CAD model against its ORIGINAL print. Wires the two adapters
 * (cad-print-dims.mjs) into the pure comparison core (cad-print-dim-match.mjs) and produces a runnable verdict:
 *
 *   original print  --(OCR extractor)-->  dimsFromVisionExtraction --> PrintDim[]  \
 *                                                                                    >-- scorePrintMatch --> verdict
 *   generated part  --(STEP/kernel)----->  dimsFromPartSpec ---------> PrintDim[]  /
 *
 * BBOX-RELIABILITY GATE (proven this session): a generated part's POINT-CLOUD bbox is UNRELIABLE for any
 * part with a hole/curve. When the part spec comes from a curved/holed STEP (pointBboxReliable=false), a
 * LINEAR (envelope) mismatch is ADVISORY -- re-verify the envelope against the authoritative Fusion kernel
 * bbox (:18362, cad-gen-accuracy.mjs) before trusting it. Feature dims (diameter/radius) stay authoritative
 * (the STEP radius literals are reliable). This is the cheap first gate; the kernel import is the expensive one.
 *
 * Pure core (runSelfCheck) exported + unit-tested; the live legs (STEP read, file IO) fail loud, never fabricate.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { harvestCorpusRow } from "./lib/step-dimension-extract.mjs";
import { dimsFromVisionExtraction, dimsFromPartSpec, canonicalizeCircularDims } from "./cad-print-dims.mjs";
import { scorePrintMatch } from "./cad-print-dim-match.mjs";

/**
 * Run the Stage-0 self-check on two ALREADY-canonical PrintDim[] sets (units resolved to mm upstream).
 * Returns the scorePrintMatch report plus { stage, bboxAdvisory }: bboxAdvisory=true means a LINEAR mismatch
 * rests on an unreliable point-cloud bbox and must be re-checked against the Fusion kernel bbox. Both sides
 * are circular-normalized (diameter<->radius convention) first so a hole dimensioned Ø on the print matches
 * its radius literal in the generated STEP. Pure.
 */
export function runSelfCheck({ printDims, partDims, relTol, bboxReliable = true, normalizeCircular = true } = {}) {
  const p = normalizeCircular ? canonicalizeCircularDims(printDims) : printDims;
  const q = normalizeCircular ? canonicalizeCircularDims(partDims) : partDims;
  const report = scorePrintMatch(p, q, relTol ? { relTol } : {});
  // The bbox advisory fires ONLY when a LINEAR (envelope) dim is itself in doubt -- a failed or missing linear
  // dim on an unreliable point-cloud bbox may be an artifact, re-verify vs the Fusion kernel bbox. A FEATURE
  // (diameter/radius) miss is authoritative even on an unreliable bbox (STEP radius literals are reliable),
  // so it must NOT raise the advisory.
  const linearFailed = report.failures.some((f) => String(f.type).toLowerCase() === "linear")
    || report.missing.some((m) => String(m.type).toLowerCase() === "linear");
  const bboxAdvisory = !bboxReliable && linearFailed;
  return { stage: "2d-self-check", bboxReliable: !!bboxReliable, bboxAdvisory, ...report };
}

/**
 * Build a generated-part spec from STEP text via the corpus harvester (point bbox + reliable feature radii).
 * Returns { bboxMm, radiiMm, bboxReliable, geometryClass, unit }. `bboxReliable` carries the point-bbox
 * trust flag straight from the geometry classifier. IO-free given text (caller reads the file).
 */
export function partSpecFromStepText(text, { label = "part" } = {}) {
  const row = harvestCorpusRow({ text, label });
  return {
    bboxMm: Array.isArray(row.pointEnvelopeMm) ? row.pointEnvelopeMm : [],
    radiiMm: Array.isArray(row.radiiMm) ? row.radiiMm : [],
    bboxReliable: !!row.pointBboxReliable,
    geometryClass: row.geometryClass ?? null,
    unit: row.unit ?? null,
  };
}

async function main() {
  const fs = await import("node:fs");
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const relTol = parseFloat(get("--tol", "0.02")) || 0.02;
  const assumeUnits = get("--assume-units", null);
  const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));

  // ----- ORIGINAL print side: --print <OCR extraction> OR --print-dims <canonical PrintDim[]> -----
  let printDims = null, dropped = [];
  const printPath = get("--print", null), printDimsPath = get("--print-dims", null);
  if (printDimsPath) { printDims = readJson(printDimsPath); printDims = Array.isArray(printDims) ? printDims : printDims?.dims || []; }
  else if (printPath) { const r = dimsFromVisionExtraction(readJson(printPath), { assumeUnits }); printDims = r.dims; dropped = r.dropped; }
  if (!Array.isArray(printDims)) { process.stderr.write("cad-self-check: need --print <extraction.json> or --print-dims <PrintDim.json>\n"); process.exit(2); }

  // ----- GENERATED part side: --part-step <STEP file> OR --part <spec.json> -----
  let partDims = null, bboxReliable = true, partMeta = {};
  const partStep = get("--part-step", null), partSpecPath = get("--part", null);
  if (partStep) {
    const text = fs.readFileSync(path.resolve(partStep), "utf8");
    const spec = partSpecFromStepText(text, { label: path.basename(partStep) });
    partDims = dimsFromPartSpec(spec); bboxReliable = spec.bboxReliable; partMeta = { geometryClass: spec.geometryClass, unit: spec.unit, bboxMm: spec.bboxMm };
  } else if (partSpecPath) { const spec = readJson(partSpecPath); partDims = dimsFromPartSpec(spec); bboxReliable = spec.bboxReliable !== false; }
  if (!Array.isArray(partDims)) { process.stderr.write("cad-self-check: need --part-step <file.step> or --part <spec.json>\n"); process.exit(2); }

  const verdict = runSelfCheck({ printDims, partDims, relTol, bboxReliable });
  const out = { ...verdict, droppedPrintDims: dropped, partMeta };
  if (!args.includes("--no-write")) {
    try {
      const rep = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "state", "shared", "cad-fusion-live", `self-check-${(partStep ? path.basename(partStep, ".step") : "adhoc").slice(0, 60)}.json`);
      fs.mkdirSync(path.dirname(rep), { recursive: true }); fs.writeFileSync(rep, JSON.stringify({ schemaVersion: "1.0.0", ...out }, null, 2) + "\n");
    } catch (e) { process.stderr.write(`report write warn: ${e.message}\n`); }
  }
  if (asJson) { process.stdout.write(JSON.stringify(out, null, 2) + "\n"); process.exit(verdict.accurate ? 0 : 1); }
  process.stdout.write(`[CAD-SELF-CHECK] ${verdict.accurate ? "✓ MATCH" : "✗ MISMATCH"}  score ${(100 * verdict.score).toFixed(0)}%  (dimAcc ${(100 * verdict.dimAccuracy).toFixed(0)}%, complete ${(100 * verdict.completeness).toFixed(0)}%)\n`);
  process.stdout.write(`  matched ${verdict.matchedCount} · missing ${verdict.missingCount} · extra ${verdict.extraCount}${verdict.bboxAdvisory ? "  ⚠ bbox ADVISORY (point-cloud unreliable -> re-verify envelope vs Fusion kernel bbox)" : ""}\n`);
  // display in the operator's original convention: a circular feature compared as radius but dimensioned Ø
  // is shown as a diameter at 2x its compared (radius) value.
  const disp = (d) => (d.dimAs === "diameter" ? { label: "diameter", nominal: d.nominal * 2, actual: d.actual != null ? d.actual * 2 : d.actual } : { label: d.type, nominal: d.nominal, actual: d.actual });
  for (const m of verdict.missing) { const s = disp(m); process.stdout.write(`  MISSING ${s.label} ${s.nominal}\n`); }
  for (const f of verdict.failures) { const s = disp(f); process.stdout.write(`  OUT-OF-TOL ${s.label} want ${s.nominal} got ${s.actual} (${(100 * f.relErr).toFixed(1)}%)\n`); }
  if (dropped.length) process.stdout.write(`  ${dropped.length} print dim(s) DROPPED (unit-unresolved) -- surfaced, not coerced\n`);
  process.exit(verdict.accurate ? 0 : 1);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
