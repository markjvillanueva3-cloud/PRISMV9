#!/usr/bin/env node
/**
 * cad-part-alter.mjs -- PART ALTERING via parametric templates (slot:delta, U-CAD-PART-ALTER). Take an
 * existing part (from a text/print request), change one or more DRIVING dimensions, and regenerate -- the
 * derived equations (inner = outer - 2*wall, groove floor = dia/2 - depth, ...) recompute automatically.
 * This is the operator's "dimensions can be variably inputed and not hard locked" made concrete: edit a
 * variable, get a correct new part, no re-derivation.
 *
 *   node scripts/cad-part-alter.mjs "<request>" --set base_dia=50 [--set base_height=30 ...]
 *   node scripts/cad-part-alter.mjs "<request>" --set dia=40 --exec     # also run cadquery + measure
 *
 * Flags: --set k=v (repeatable) · --exec (execute the altered script + report STEP dims) · --show-base
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { emitPrimitiveCode } from "./lib/cad-primitive-emit.mjs";
import { emitFeatureCode } from "./lib/cad-feature-emit.mjs";
import { paramsFromDims, alterParams, renderParametricScript, hasTemplate, TEMPLATES } from "./lib/cad-parametric-templates.mjs";
import { codeInvalidReason } from "./cad-text-to-cadquery.mjs";
import { extractBboxMm, extractRadiiMm } from "./lib/step-dimension-extract.mjs";

function parseArgs(argv) {
  const overrides = {}; const flags = new Set(); const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--set") { const kv = argv[++i] || ""; const eq = kv.indexOf("="); if (eq < 0) throw new Error(`--set expects k=v, got '${kv}'`); overrides[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim(); }
    else if (a.startsWith("--")) flags.add(a.slice(2));
    else positional.push(a);
  }
  return { request: positional.join(" ").trim(), overrides, flags };
}

function executeStep(code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alter-"));
  const py = path.join(dir, "m.py"), st = path.join(dir, "m.step");
  fs.writeFileSync(py, code);
  try {
    execFileSync(process.env.PRISM_PYTHON || "H:/Tools/python/python.exe", [py], { env: { ...process.env, OUTPUT_STEP: st }, timeout: 60000, stdio: "pipe" });
    const t = fs.readFileSync(st, "utf8");
    const b = extractBboxMm(t);
    const r = [...new Set(extractRadiiMm(t).radiiMm.map((x) => +x.toFixed(3)))].sort((a, b) => a - b);
    return { ok: true, bbox: (b.dims || []).map((x) => +x.toFixed(3)).join(" x "), radii: r.join(", ") };
  } catch (e) { return { ok: false, err: String(e?.message ?? e).slice(0, 160) }; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function main() {
  let parsed;
  try { parsed = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`[cad-part-alter] ${e.message}`); process.exit(2); }
  const { request, overrides, flags } = parsed;
  if (!request) { console.error('usage: node scripts/cad-part-alter.mjs "<request>" --set var=val [--set ...] [--exec]'); process.exit(2); }

  const e = emitPrimitiveCode(request) || emitFeatureCode(request);
  if (!e) { console.error("[cad-part-alter] no deterministic shape for this request (parametric alter covers the deterministic shape families)."); process.exit(1); }
  if (!hasTemplate(e.shape)) { console.error(`[cad-part-alter] shape '${e.shape}' has no parametric template.`); process.exit(1); }

  const base = paramsFromDims(e.shape, e.dimsMm);
  if (flags.has("show-base")) console.error(`[base ${e.shape}] ${Object.entries(base).map(([k, v]) => `${k}=${v}`).join(" ")}  (driving: ${TEMPLATES[e.shape].params.map((p) => p.name).join(", ")})`);

  let altered;
  try { altered = alterParams(e.shape, base, overrides); } catch (err) { console.error(`[cad-part-alter] ${err.message}`); process.exit(1); }
  if (!altered.changed.length && Object.keys(overrides).length) console.error("[cad-part-alter] note: overrides matched the existing values -- no change.");

  const code = renderParametricScript(e.shape, altered.params);
  const invalid = codeInvalidReason(code, { requestIsMetric: /\bmm\b/i.test(request) && !/\binch|\bin\b|"/i.test(request) });
  if (invalid) { console.error(`[cad-part-alter] refusing to emit -- ${invalid}`); process.exit(1); }

  process.stdout.write(code + "\n");

  if (flags.has("exec")) {
    const r = executeStep(code);
    if (r.ok) console.error(`[exec ${e.shape}] changed {${altered.changed.join(", ")}} -> bbox ${r.bbox}  radii ${r.radii}`);
    else console.error(`[exec] FAILED: ${r.err}`);
  }
}

main();
