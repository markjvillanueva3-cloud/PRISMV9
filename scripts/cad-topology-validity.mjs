// cad-topology-validity.mjs -- node CLI + importable wrapper for the OCCT-kernel CAD validity gate
// (U-CADGEN-TOPOLOGY-VALIDITY, slot:delta 2026-07-04). Delegates the actual B-rep check to
// cad-topology-validity.py (cadquery Shape.isValid()), because reliable topology needs the KERNEL, not
// regex on STEP text (the regex Euler gate false-flagged holed parts and was deleted). This is the
// closed-loop's topological validity signal: a gen that "executed" (produced a .step) can still be a
// self-intersecting / non-manifold / open solid -> scrap. valid=false is a distinct, fail-loud learning
// signal from a dimensional miss.
//
// The python is invoked ONCE per batch (cadquery imported once) via --stdin, so validating the whole
// corpus is a single subprocess, not N spawns.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GEN_DIR = path.resolve(ROOT, "state", "shared", "cad-text-gen");
const PY = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PY_SCRIPT = path.resolve(__dirname, "cad-topology-validity.py");

/**
 * Parse the python batch output: one JSON object per line. The OCCT font subsystem prints a warning
 * line ("'name' table stringOffset incorrect") to stdout on some fonts -- skip any line that is not a
 * JSON object so it never corrupts a result.
 */
export function parseBatch(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip a torn/partial line */ }
  }
  return out;
}

/**
 * Validate STEP paths through the kernel. `runner(paths)->resultObjects[]` is injectable for tests so the
 * pure orchestration is unit-testable without spawning python.
 * @returns Array<{path,valid,V,E,F,solids,error}>
 */
export function validateSteps(paths, { runner, timeoutMs = 300000 } = {}) {
  if (!Array.isArray(paths) || paths.length === 0) return [];
  if (runner) return runner(paths);
  const out = execFileSync(PY, [PY_SCRIPT, "--stdin"], {
    input: paths.join("\n"), encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs, windowsHide: true,
  });
  return parseBatch(out);
}

export function validateStep(stepPath, opts) {
  return validateSteps([stepPath], opts)[0] || { path: stepPath, valid: null, error: "no-result" };
}

/** Summarize a batch of results into {total, valid, invalid, unanalyzable, invalidPaths}. */
export function summarize(results) {
  const s = { total: results.length, valid: 0, invalid: 0, unanalyzable: 0, invalidPaths: [] };
  for (const r of results) {
    if (r.valid === true) s.valid++;
    else if (r.valid === false) { s.invalid++; if (s.invalidPaths.length < 20) s.invalidPaths.push(r.path); }
    else s.unanalyzable++;
  }
  return s;
}

export const __test = { parseBatch, validateSteps, summarize };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  if (args.includes("--corpus")) {
    let dirs = [];
    try { dirs = fs.readdirSync(GEN_DIR); } catch { dirs = []; }
    const paths = dirs.map((d) => path.join(GEN_DIR, d, "model.step")).filter((p) => fs.existsSync(p));
    const results = validateSteps(paths);
    const s = summarize(results);
    if (json) console.log(JSON.stringify(s, null, 2));
    else {
      console.log(`cad-topology-validity (OCCT kernel): ${s.valid}/${s.total} valid, ${s.invalid} INVALID, ${s.unanalyzable} unanalyzable`);
      for (const p of s.invalidPaths) console.log(`  INVALID: ${path.basename(path.dirname(p))}`);
    }
  } else {
    const target = args.find((a) => !a.startsWith("--"));
    if (!target) { console.error("usage: node scripts/cad-topology-validity.mjs <model.step | gen-dir> [--json]  |  --corpus"); process.exit(2); }
    const sp = target.endsWith(".step") ? target : path.join(target, "model.step");
    const r = validateStep(sp);
    console.log(json ? JSON.stringify(r, null, 2)
      : `${r.valid === true ? "VALID" : r.valid === false ? "INVALID" : "UNANALYZABLE"}  ${sp}  ::  ${r.error || `V=${r.V} E=${r.E} F=${r.F} solids=${r.solids}`}`);
    if (r.valid === false) process.exit(1);
  }
}
