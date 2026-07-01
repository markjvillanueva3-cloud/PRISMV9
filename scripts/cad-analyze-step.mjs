#!/usr/bin/env node
/*
 * cad-analyze-step.mjs -- STEP-file inspector + manifold-solid validity gate (slot:delta, 2026-06-26).
 *
 * Long-referenced as a real tool (TOOLBELT.md, PATHS.md, the delta-cad-awareness-inject hook, and
 * cad-text-to-cadquery.mjs:344) but NEVER built -- so the gen lane's inline analysis spawned a MISSING
 * module, exited 1 with empty stdout, and recorded a FALSE learningSignal:"fail" for EVERY text->CAD
 * generation (including the 63/63 canonically-valid ones), uniformly poisoning the closed-loop training
 * outcome ledger (CADTrialErrorLearningEngine). This IS that tool.
 *
 * Validity verdict REUSES the working trunk validator scripts/cad-gen-validate-check.py (cadquery
 * re-import -> {valid,solids,faces}); it does NOT reinvent it (R5/R8) -- so "valid" means the SAME thing
 * here, in cad-gen-validate.mjs, and in the gen learning signal (one definition, no divergence -- the
 * divergence between two validators is exactly the bug this fixes). Adds pure STEP-text inspection
 * (schema, unit, entity count, coordinate range, circle radii) -- the documented "inspect
 * schema/entities/coords/radii" purpose -- with zero extra deps.
 *
 * Exit code is the closed-loop contract (cad-text-to-cadquery.classifyGenerationOutcome reads it):
 *   0 = valid manifold solid (>=1 solid) ; 1 = invalid / parse-fail ; 2 = usage / file-not-found.
 *
 * Usage: node scripts/cad-analyze-step.mjs <model.step> [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const PYTHON = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const CHECK_PY = path.join(ROOT, "scripts", "cad-gen-validate-check.py");

/*
 * Pure: parse STEP text for schema / unit / entity-count / coordinate-range / circle radii. No deps,
 * no I/O -- a lightweight inspector that beats opening a 30K STEP in Read. Units follow the
 * UNITS-FIRST safety rule (CONVERSION_BASED_UNIT 0.0254 = inch ; SI_UNIT .MILLI..METRE. = mm).
 */
export function parseStepText(text) {
  const t = String(text || "");
  const schemaM = t.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const unit = /CONVERSION_BASED_UNIT\s*\(\s*'INCH'|\.INCH\.|0\.0254/i.test(t) ? "inch"
    : /SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\./i.test(t) ? "mm"
    : /SI_UNIT\s*\(\s*\$\s*,\s*\.METRE\./i.test(t) ? "m"
    : "unknown";
  const entityCount = (t.match(/#\d+\s*=/g) || []).length;
  // Single-pass min/max -- NOT Math.min(...coords): a spread of a large NURBS coord set overflows
  // the call stack ("Maximum call stack size exceeded" on blisk.stp's 223 NURBS faces). Tracking the
  // range during the scan also avoids materializing a multi-100k-element coords array (memory win).
  // [[reference_cad_analyze_step_nurbs_overflow_2026_06_26]]
  let cMin = Infinity, cMax = -Infinity, coordCount = 0;
  for (const m of t.matchAll(/CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([^)]*)\)/gi)) {
    for (const n of m[1].split(",")) {
      const v = Number(n.trim());
      if (Number.isFinite(v)) { coordCount++; if (v < cMin) cMin = v; if (v > cMax) cMax = v; }
    }
  }
  const coordRange = coordCount ? { min: cMin, max: cMax } : null;
  const radii = [];
  for (const m of t.matchAll(/CIRCLE\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9.eE+-]+)/gi)) {
    const r = Number(m[1]); if (Number.isFinite(r)) radii.push(r);
  }
  const hasManifold = /MANIFOLD_SOLID_BREP|CLOSED_SHELL|ADVANCED_BREP_SHAPE_REPRESENTATION/i.test(t);
  return { schema: schemaM ? schemaM[1] : null, unit, entityCount, coordRange, radii, hasManifold };
}

/*
 * Pure: classify a cad-gen-validate-check.py result (one JSON line) into {valid, exitCode, ...}. The
 * python prints JSON even for an invalid STEP, so validity is read from the JSON `valid` field +
 * solids>=1, NOT from python's exit code. An unparseable/empty result (python itself failed) is
 * treated as invalid (exit 1) with the reason surfaced -- fail-loud, never silently "pass".
 */
export function classifyValidity(pyOut) {
  let parsed = null;
  try { parsed = typeof pyOut === "string" ? JSON.parse(pyOut.trim()) : pyOut; } catch { parsed = null; }
  if (!parsed || typeof parsed !== "object") {
    return { valid: false, exitCode: 1, solids: 0, faces: 0, error: "validator produced no parseable result" };
  }
  const solids = Number(parsed.solids) || 0;
  const valid = parsed.valid === true && solids >= 1;
  return { valid, exitCode: valid ? 0 : 1, solids, faces: Number(parsed.faces) || 0, ...(parsed.error ? { error: String(parsed.error) } : {}) };
}

/* Run the python manifold-solid validator. Returns its stdout (JSON) or "" if python itself failed. */
function runPyCheck(stepPath) {
  const r = spawnSync(PYTHON, [CHECK_PY, stepPath], { encoding: "utf8", timeout: 60_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  return String(r.stdout || "");
}

/*
 * Orchestrate inspection + validity for a single STEP. runPy/readImpl/existsImpl are injectable so the
 * orchestration is unit-testable without a live python+cadquery env (R9). Returns a structured result
 * carrying the contract exitCode.
 */
export function analyzeStep(stepPath, { runPy = runPyCheck, readImpl = fs.readFileSync, existsImpl = fs.existsSync } = {}) {
  if (!stepPath) return { ok: false, exitCode: 2, error: "no STEP path argument" };
  if (!existsImpl(stepPath)) return { ok: false, exitCode: 2, error: `file not found: ${stepPath}` };
  let inspect = null;
  try { inspect = parseStepText(readImpl(stepPath, "utf8")); } catch (e) { inspect = { error: `read failed: ${e?.message || e}` }; }
  const verdict = classifyValidity(runPy(stepPath));
  return { ok: verdict.valid, exitCode: verdict.exitCode, step: stepPath, ...verdict, inspect };
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const stepPath = argv.find((a) => !a.startsWith("--"));
  const out = analyzeStep(stepPath);
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(out.exitCode);
}
