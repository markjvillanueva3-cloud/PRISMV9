#!/usr/bin/env node
/**
 * cad-gen-accuracy.mjs (U-DELTA-CADGEN-KERNEL-ACCURACY, slot:delta 2026-06-29)
 *
 * Closes the CAD-generation loop with an AUTHORITATIVE dimensional-accuracy check. The generator
 * (cad-text-to-cadquery.mjs) validates STRUCTURE (valid manifold STEP) but graded dims off the point-cloud
 * bbox (extractBboxMm) -- which is UNRELIABLE for any part with a hole/curve (proven this session: a correct
 * 50x30x20 plate-with-hole reads [50,50,30] from points). So a dimensionally-correct part can false-FAIL and
 * a wrong one false-PASS. This grades the generated STEP's KERNEL bbox (Fusion /import @ :18362, the
 * authoritative envelope) against the dims the REQUEST stated -- the real "is generation accurate" signal.
 *
 *   --step <path> --expect 50x30x20          grade a pre-generated STEP against explicit dims
 *   --request "<text>"                        parse explicit dims from the text, grade the latest staged STEP
 *   --port 18362  --tol 0.02                  Fusion port + relative tolerance (default 2%)
 *
 * Pure helpers (parseRequestedDims/gradeDimAccuracy) are exported + unit-tested; the live leg fails loud
 * if Fusion is unreachable and never fabricates a verdict.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KERNEL_OCCURRENCE_TRAVERSAL_CODE, parseKernelExecResult } from "./cad-fusion-live-roundtrip.mjs";

const DEFAULT_PORT = 18362;
const DEFAULT_REL_TOL = 0.02; // 2% -- generation is "accurate" within 2% of the stated dim
const IN_TO_MM = 25.4;

/**
 * Extract the explicit overall dimensions [L,W,H] (mm, descending) a request STATES, or null when none.
 * Handles "50mm x 30mm x 20mm", "50 x 30 x 20 mm", "2 x 1 x 0.5 inch", "50x30x20", unit per-number or
 * trailing. Inch -> mm. Returns { dimsMm:[desc], unit, raw:[L,W,H as-written] } or null. Pure.
 */
export function parseRequestedDims(request) {
  const s = String(request || "").toLowerCase();
  // three numbers separated by x/×/* with an optional unit after each or after the last
  const triple = s.match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches|")?\s*[x×*]\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches|")?\s*[x×*]\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches|")?/);
  if (!triple) return null;
  const nums = [Number(triple[1]), Number(triple[3]), Number(triple[5])];
  if (!nums.every((n) => Number.isFinite(n) && n > 0)) return null;
  const unitTok = triple[6] || triple[4] || triple[2] || "mm"; // prefer the last-stated unit, else mm
  const isInch = /in|inch|"/.test(unitTok);
  const isCm = unitTok === "cm";
  const scale = isInch ? IN_TO_MM : isCm ? 10 : 1;
  const dimsMm = nums.map((n) => Math.round(n * scale * 100) / 100).sort((a, b) => b - a);
  return { dimsMm, unit: isInch ? "inch" : isCm ? "cm" : "mm", raw: nums };
}

/**
 * Grade a generated part's KERNEL dims against the requested dims. Both are sorted-descending [L,W,H] so
 * orientation does not matter. Returns { accurate, maxRelErr, perAxisRelErr:[..], kernelDims, requestedDims }.
 * accurate = every axis within relTol. Null inputs -> { accurate:false, reason }. Pure.
 */
export function gradeDimAccuracy(kernelDims, requestedDims, relTol = DEFAULT_REL_TOL) {
  if (!Array.isArray(kernelDims) || kernelDims.length !== 3 || !Array.isArray(requestedDims) || requestedDims.length !== 3) {
    return { accurate: false, reason: "missing kernel or requested dims", kernelDims: kernelDims ?? null, requestedDims: requestedDims ?? null };
  }
  const k = [...kernelDims].sort((a, b) => b - a);
  const r = [...requestedDims].sort((a, b) => b - a);
  const perAxisRelErr = r.map((want, i) => (want > 0 ? Math.abs(k[i] - want) / want : (k[i] === 0 ? 0 : 1)));
  const maxRelErr = Math.max(...perAxisRelErr);
  return {
    accurate: maxRelErr <= relTol,
    maxRelErr: Math.round(maxRelErr * 1e4) / 1e4,
    perAxisRelErr: perAxisRelErr.map((e) => Math.round(e * 1e4) / 1e4),
    kernelDims: k, requestedDims: r,
  };
}

/** Import a STEP into live Fusion and read its KERNEL bbox (authoritative). Throws on an unreachable bridge. */
export async function kernelDimsOf(stepPath, { baseUrl, fetchImpl = fetch } = {}) {
  const call = async (p, method, body) => {
    const init = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) init.body = JSON.stringify(body);
    return (await fetchImpl(`${baseUrl}${p}`, init)).json();
  };
  const label = path.basename(stepPath);
  const nw = await call("/new", "POST", { name: `PRISM-GENACC-${label}`, parametric: true });
  if (!nw?.success) throw new Error(`/new failed: ${nw?.error ?? "unknown"}`);
  try {
    const imp = await call("/import", "POST", { path: stepPath });
    if (!imp?.success) throw new Error(`/import failed: ${imp?.error ?? "unknown"}`);
    let dims = imp.bounding_box_mm;
    if (!Array.isArray(dims)) {
      const ex = await call("/execute", "POST", { code: KERNEL_OCCURRENCE_TRAVERSAL_CODE });
      dims = ex?.success ? parseKernelExecResult(ex.result) : null;
    }
    if (!Array.isArray(dims)) throw new Error("no kernel bbox from /import or /execute");
    return dims;
  } finally {
    try { await call("/close", "POST", { names: [nw.document_name || `PRISM-GENACC-${label}`], force: true }); } catch { /* best-effort */ }
  }
}

const STAGING_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "state", "shared", "cad-text-gen");

// Canonical closed-loop accuracy suite: explicit-dim requests spanning archetypes (plate/cylinder/block/
// cube/thin) + units (mm/inch) + features (holes/bore). Each `expect` is the TRUE overall envelope in mm
// (sorted-desc internally by the grader). Generation is "accurate" when the KERNEL bbox matches within tol.
export const CANONICAL_SUITE = [
  { request: "a 50mm x 30mm x 20mm rectangular plate with a 10mm diameter center hole", expectMm: [50, 30, 20] },
  { request: "a cylindrical bushing 25mm outer diameter x 40mm long with a 12mm bore", expectMm: [40, 25, 25] },
  { request: "a 60mm x 40mm x 25mm steel block", expectMm: [60, 40, 25] },
  { request: "a 30mm x 30mm x 30mm cube", expectMm: [30, 30, 30] },
  { request: "a 2 inch x 1 inch x 0.5 inch block", expectMm: [50.8, 25.4, 12.7] },
  { request: "an 80mm x 80mm x 5mm flat plate with four 8mm corner holes", expectMm: [80, 80, 5] },
];

/**
 * Aggregate suite per-case results -> { total, generated, accurate, accuracyRate, inaccurate, genFailed }.
 * A case is `genFail` (generation/exec error), `accurate`, or `inaccurate` (generated but dims off). Pure.
 */
export function aggregateSuite(results) {
  const r = Array.isArray(results) ? results : [];
  const genFailed = r.filter((x) => !x || x.genFail);
  const generated = r.filter((x) => x && !x.genFail);
  const accurate = generated.filter((x) => x.accurate);
  const inaccurate = generated.filter((x) => !x.accurate);
  return {
    total: r.length,
    generated: generated.length,
    accurate: accurate.length,
    accuracyRate: generated.length ? accurate.length / generated.length : null,
    inaccurate: inaccurate.map((x) => ({ request: x.request, kernelDims: x.kernelDims, requestedDims: x.requestedDims, maxRelErr: x.maxRelErr })),
    genFailed: genFailed.map((x) => ({ request: x?.request ?? "(unknown)", reason: x?.reason ?? "generation/exec failed" })),
  };
}

/**
 * Run the suite: for each case, generate(request) -> stepPath, then validate(stepPath) -> kernelDims, grade
 * vs expectMm. `generate`/`validate` are injected (testable; the CLI wires the real spawn + Fusion import).
 * A generate/validate throw -> that case is recorded genFail, never aborts the suite (R12).
 */
export async function runSuite(cases, { generate, validate, relTol = DEFAULT_REL_TOL, onCase = null } = {}) {
  if (typeof generate !== "function" || typeof validate !== "function") throw new Error("runSuite: generate + validate required");
  const results = [];
  for (const c of Array.isArray(cases) ? cases : []) {
    let row;
    try {
      const stepPath = await generate(c.request);
      if (!stepPath) { row = { request: c.request, genFail: true, reason: "no STEP produced" }; }
      else {
        const kernelDims = await validate(stepPath);
        const v = gradeDimAccuracy(kernelDims, c.expectMm, relTol);
        row = { request: c.request, genFail: false, ...v };
      }
    } catch (e) { row = { request: c.request, genFail: true, reason: String(e?.message ?? e) }; }
    results.push(row);
    if (typeof onCase === "function") { try { onCase(row); } catch { /* reporting best-effort */ } }
  }
  return { results, summary: aggregateSuite(results) };
}

/** Newest staged model.step under the gen-staging root (for --request without --step). */
function latestStagedStep() {
  try {
    const dirs = fs.readdirSync(STAGING_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
    const withStep = dirs.map((d) => path.join(STAGING_ROOT, d.name, "model.step")).filter((p) => fs.existsSync(p));
    // staging dirs are `<slug>-<ms>`; sort by the trailing timestamp descending
    withStep.sort((a, b) => (Number(b.match(/-(\d+)[\\/]model\.step$/)?.[1]) || 0) - (Number(a.match(/-(\d+)[\\/]model\.step$/)?.[1]) || 0));
    return withStep[0] || null;
  } catch { return null; }
}

async function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const port = parseInt(process.env.PRISM_FUSION_DELTA_PORT || get("--port", String(DEFAULT_PORT)), 10) || DEFAULT_PORT;
  const relTol = parseFloat(get("--tol", String(DEFAULT_REL_TOL))) || DEFAULT_REL_TOL;
  const baseUrl = `http://127.0.0.1:${port}`;
  const noWrite = args.includes("--no-write");
  const GEN_TIMEOUT_MS = 200000; // Ollama 32b generation can take a couple minutes per part

  // ---- SUITE mode: generate the canonical spec set -> kernel-validate each -> accuracy report ----
  if (args.includes("--suite")) {
    try {
      const h = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
      if (h?.status !== "ok") throw new Error(JSON.stringify(h));
    } catch (e) { process.stderr.write(`Fusion bridge :${port} unreachable (${e.message}). Open Fusion + run the PRISM add-in.\n`); process.exit(2); }
    const { spawnSync } = await import("node:child_process");
    const genScript = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cad-text-to-cadquery.mjs");
    const model = get("--model", null);
    const limit = parseInt(get("--limit", "0"), 10) || 0;
    const cases = limit ? CANONICAL_SUITE.slice(0, limit) : CANONICAL_SUITE;
    const generate = async (request) => {
      const argv = [genScript, request, "--json"]; if (model) { argv.push("--model", model); }
      const res = spawnSync(process.execPath, argv, { timeout: GEN_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }); // array args -> no shell injection
      let dir = null; try { dir = JSON.parse(res.stdout).dir; } catch { /* non-json output -> genFail */ }
      if (!dir) return null;
      const sp = path.join(dir, "model.step");
      return fs.existsSync(sp) ? sp : null;
    };
    const validate = (sp) => kernelDimsOf(path.resolve(sp), { baseUrl });
    const onCase = (row) => process.stderr.write(`  ${row.genFail ? "GENFAIL" : row.accurate ? "OK " : "BAD"} ${String(row.request).slice(0, 56)}${row.genFail ? ` (${row.reason})` : ` err ${(100 * (row.maxRelErr || 0)).toFixed(1)}%`}\n`);
    const { results, summary } = await runSuite(cases, { generate, validate, relTol, onCase });
    const reportPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "state", "shared", "cad-fusion-live", "gen-accuracy-suite.json");
    if (!noWrite) { try { fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify({ schemaVersion: "1.0.0", port, relTol, ...summary, results }, null, 2) + "\n"); } catch (e) { process.stderr.write(`suite report write warn: ${e.message}\n`); } }
    if (asJson) { process.stdout.write(JSON.stringify({ summary, results }, null, 2) + "\n"); process.exit(summary.accuracyRate === 1 ? 0 : 1); }
    process.stdout.write(`[CAD-GEN-ACCURACY-SUITE] ${summary.accurate}/${summary.generated} accurate (${summary.accuracyRate == null ? "n/a" : (100 * summary.accuracyRate).toFixed(0) + "%"}), ${summary.genFailed.length} gen-failed -> ${reportPath}\n`);
    for (const i of summary.inaccurate) { process.stdout.write(`  BAD ${String(i.request).slice(0, 50)}: kernel [${i.kernelDims.join("x")}] vs requested [${i.requestedDims.join("x")}] (${(100 * i.maxRelErr).toFixed(1)}%)\n`); }
    for (const g of summary.genFailed) { process.stdout.write(`  GENFAIL ${String(g.request).slice(0, 50)}: ${g.reason}\n`); }
    process.exit(summary.accuracyRate === 1 && summary.genFailed.length === 0 ? 0 : 1);
  }

  // resolve requested dims: --expect LxWxH wins, else parse from --request
  let requestedDims = null;
  const expect = get("--expect", null);
  if (expect) { const p = parseRequestedDims(expect); requestedDims = p?.dimsMm ?? null; }
  else { const req = get("--request", null); if (req) { const p = parseRequestedDims(req); requestedDims = p?.dimsMm ?? null; } }
  if (!requestedDims) { process.stderr.write("cad-gen-accuracy: need explicit dims via --expect LxWxH or a --request that states dims (e.g. '50mm x 30mm x 20mm')\n"); process.exit(2); }

  const stepArg = get("--step", null) || latestStagedStep();
  // the Fusion add-in runs in its own process/cwd -> /import needs an ABSOLUTE path (relative fails "file does not exist")
  const stepPath = stepArg ? path.resolve(stepArg) : null;
  if (!stepPath || !fs.existsSync(stepPath)) { process.stderr.write(`cad-gen-accuracy: STEP not found (${stepPath ?? "--step missing + no staged model.step"})\n`); process.exit(2); }

  // fail loud if the bridge is down (never fabricate an accuracy verdict)
  try {
    const h = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
    if (h?.status !== "ok") throw new Error(JSON.stringify(h));
  } catch (e) { process.stderr.write(`Fusion bridge :${port} unreachable (${e.message}). Open Fusion + run the PRISM add-in.\n`); process.exit(2); }

  let kernelDims;
  try { kernelDims = await kernelDimsOf(stepPath, { baseUrl }); }
  catch (e) { process.stderr.write(`kernel measure failed: ${e.message}\n`); process.exit(2); }

  const verdict = gradeDimAccuracy(kernelDims, requestedDims, relTol);
  if (asJson) { process.stdout.write(JSON.stringify({ stepPath, port, relTol, ...verdict }, null, 2) + "\n"); }
  else {
    process.stdout.write(`[CAD-GEN-ACCURACY] ${verdict.accurate ? "✓ ACCURATE" : "✗ INACCURATE"} (maxErr ${(100 * verdict.maxRelErr).toFixed(2)}%, tol ${(100 * relTol).toFixed(0)}%)\n`);
    process.stdout.write(`  kernel    [${verdict.kernelDims.join(" x ")}] mm\n  requested [${verdict.requestedDims.join(" x ")}] mm\n  per-axis err ${verdict.perAxisRelErr.map((e) => (100 * e).toFixed(1) + "%").join(", ")}\n`);
  }
  process.exit(verdict.accurate ? 0 : 1);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
