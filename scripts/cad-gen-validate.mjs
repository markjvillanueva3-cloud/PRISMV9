#!/usr/bin/env node
/*
 * cad-gen-validate.mjs -- trunk-side STEP validity checker for the CAD-gen overnight loop
 * (DELTA-CAD-COMPLETION / U-CAD-GEN-VALIDATE, slot:delta 2026-06-26).
 *
 * The gen loop stages model.step files but can't validate them on trunk (the deep cad-analyze-step.mjs
 * is slot-delta-only -> analysisExit 1). This is the lightweight trunk-side "test" signal: re-import
 * each staged STEP via cadquery (cad-gen-validate-check.py) and confirm it is a real manifold solid
 * (>=1 solid body). $0 (local cadquery), no-merge, COMPLEMENTS (not dups, R8) the slot-delta deep
 * dim-analyzer. Reports valid-rate + solid/face counts -> a real T2-ish accuracy signal.
 *
 * Usage:
 *   node scripts/cad-gen-validate.mjs            # validate all staged STEPs -> console + JSON
 *   node scripts/cad-gen-validate.mjs --json
 *   node scripts/cad-gen-validate.mjs --limit N
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const STAGE_DIR = path.join(ROOT, "state", "shared", "cad-text-gen");
const OUT_DIR = path.join(ROOT, "state", "shared", "cad-gen-loop");
const CHECK_PY = path.join(ROOT, "scripts", "cad-gen-validate-check.py");
const PYTHON = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const REPORT = path.join(OUT_DIR, "validation-report.json");
const PER_CHECK_TIMEOUT_MS = 60000;

/* Find all staged model.step files (recursive, bounded). */
export function findStagedSteps(stageDir, maxScan = 20000) {
  const out = [];
  const stack = [stageDir];
  let scanned = 0;
  while (stack.length && scanned < maxScan && out.length < 5000) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      scanned++;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === "model.step") out.push(full);
    }
  }
  return out;
}

/* Classify a python check result (one JSON line on stdout) into a validation record. */
export function classifyValidation(stepPath, runOut) {
  let parsed = null;
  try { parsed = JSON.parse(String(runOut || "").trim().split(/\r?\n/).filter(Boolean).pop() || "{}"); } catch { /* non-json */ }
  if (!parsed || typeof parsed.valid !== "boolean") {
    return { step: stepPath, valid: false, solids: 0, faces: 0, error: "no-parse" };
  }
  return { step: stepPath, valid: parsed.valid, solids: parsed.solids || 0, faces: parsed.faces || 0, error: parsed.error || null };
}

export function summarizeValidation(records) {
  const valid = records.filter((r) => r.valid).length;
  const faces = records.filter((r) => r.valid).map((r) => r.faces);
  return {
    total: records.length,
    valid,
    invalid: records.length - valid,
    validRate: records.length ? +(valid / records.length).toFixed(3) : 0,
    avgFaces: faces.length ? +(faces.reduce((a, b) => a + b, 0) / faces.length).toFixed(1) : 0,
  };
}

export function defaultCheckRunner(stepPath) {
  try {
    return execFileSync(PYTHON, [CHECK_PY, stepPath], { encoding: "utf8", windowsHide: true, timeout: PER_CHECK_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return String(e.stdout || `{"valid":false,"error":"check exit ${e.status}"}`);
  }
}

export function runValidation({ steps, runner, limit, log }) {
  const slice = limit && limit > 0 ? steps.slice(0, limit) : steps;
  const out = [];
  for (let i = 0; i < slice.length; i++) {
    const rec = classifyValidation(slice[i], runner(slice[i]));
    log(`[${i + 1}/${slice.length}] ${rec.valid ? "VALID" : "INVALID"} solids=${rec.solids} faces=${rec.faces} ${path.basename(path.dirname(slice[i]))}`);
    out.push(rec);
  }
  return out;
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const li = argv.indexOf("--limit");
  const limit = li >= 0 ? (Number.parseInt(argv[li + 1], 10) || 0) : 0;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const steps = findStagedSteps(STAGE_DIR);
  if (steps.length === 0) { process.stdout.write(`no staged model.step under ${path.relative(ROOT, STAGE_DIR)}\n`); process.exit(0); }
  const log = argv.includes("--json") ? () => {} : (m) => process.stdout.write(m + "\n");
  const records = runValidation({ steps, runner: defaultCheckRunner, limit, log });
  const sum = { ...summarizeValidation(records), generatedAt: new Date().toISOString() };
  fs.writeFileSync(REPORT, JSON.stringify({ ...sum, records }, null, 2));
  if (argv.includes("--json")) process.stdout.write(JSON.stringify(sum) + "\n");
  else process.stdout.write(`VALIDATION: ${sum.valid}/${sum.total} valid (rate ${sum.validRate}) avgFaces ${sum.avgFaces} -> ${path.relative(ROOT, REPORT)}\n`);
}
