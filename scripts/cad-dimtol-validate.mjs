#!/usr/bin/env node
/**
 * cad-dimtol-validate.mjs -- the T-DIMTOL harness (U-DELTA-DIMTOL-DB, slot:delta 2026-06-28).
 *
 * Runs the KS drift gate (scripts/lib/cad-dimtol-ks-validate.mjs) over REAL per-class STEP radii
 * (via scripts/lib/step-dimension-extract.mjs::extractRadiiMm) from the cad-corpus-manifest:
 * leave-one-part-out -> pool the rest of the class as the learned distribution -> KS-test the held-out
 * part's radii vs it -> gate p > alpha (drawn = consistent with class, no drift). Reports per-class
 * pass-rate. Proves the DIMTOL distribution DB is representative (or surfaces drift).
 *
 * Reads the SMALLEST N STEP files per class (fast I/O; size_bytes from the manifest). Unit-unknown
 * files are skipped by extractRadiiMm (units-first, never fabricate). Pure-ish: fs injected for tests.
 *
 * Usage:
 *   node scripts/cad-dimtol-validate.mjs --class die --sample 40 --json
 *   node scripts/cad-dimtol-validate.mjs --all --sample 30
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractRadiiMm } from "./lib/step-dimension-extract.mjs";
import { validateDimDrift } from "./lib/cad-dimtol-ks-validate.mjs";
import { bucketedDrift } from "./lib/cad-dim-scale-buckets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "mcp-server", "data", "state", "cad-corpus-manifest.json");
const MIN_RADII = 3;        // a part needs >=3 radii to be a meaningful sample
const DEFAULT_SAMPLE = 30;  // smallest-N STEP files per class (bounded I/O)

/**
 * Collect per-part radii arrays for one class (smallest `sampleN` STEP files). Pure w.r.t. injected fs.
 * Returns [{ file, radii }] for parts that yielded >= MIN_RADII radii in a known unit.
 */
export function collectClassParts(cls, { manifest, readFileImpl = fs.readFileSync, sampleN = DEFAULT_SAMPLE } = {}) {
  const stepExts = new Set([".step", ".stp"]);
  const files = (manifest.entries || [])
    .filter((e) => e.part_class === cls && stepExts.has(String(e.ext).toLowerCase()))
    .sort((a, b) => (a.size_bytes || 0) - (b.size_bytes || 0))
    .slice(0, sampleN);
  const parts = [];
  for (const e of files) {
    let text = "";
    try { text = readFileImpl(e.abs_path, "utf8"); } catch { continue; }
    const { radiiMm } = extractRadiiMm(text);
    if (Array.isArray(radiiMm) && radiiMm.length >= MIN_RADII) parts.push({ file: path.basename(e.abs_path), radii: radiiMm });
  }
  return parts;
}

/**
 * PURE leave-one-part-out KS gate over pre-collected parts ([{file, radii}]). Pool every other
 * part's radii as the learned class distribution, KS-test the held-out part against it.
 * Returns { evaluated, passed, passRate, results }. Hermetically testable (no fs / no STEP parse).
 */
export function gateParts(parts, opts = {}) {
  const arr = Array.isArray(parts) ? parts : [];
  const results = [];
  let passed = 0, evaluated = 0;
  for (let i = 0; i < arr.length; i++) {
    const heldout = arr[i].radii;
    const learned = arr.flatMap((p, j) => (j === i ? [] : (Array.isArray(p.radii) ? p.radii : [])));
    if (learned.length < MIN_RADII) continue; // need a learned pool
    const r = opts.bucketed ? bucketedDrift(learned, heldout, opts) : validateDimDrift(learned, heldout, opts);
    evaluated++;
    if (r.drawn) passed++;
    results.push({ file: arr[i].file, drawn: r.drawn, pValue: r.pValue ?? null, D: r.D ?? null, byBucket: r.byBucket });
  }
  return { evaluated, passed, passRate: evaluated ? passed / evaluated : null, results };
}

/** Leave-one-part-out KS gate over a class (collects parts from the corpus, then gates). */
export function validateClass(cls, opts = {}) {
  const parts = collectClassParts(cls, opts);
  return { cls, parts: parts.length, ...gateParts(parts, opts) };
}

function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const bucketed = args.includes("--bucketed");
  const sampleN = parseInt(get("--sample", String(DEFAULT_SAMPLE)), 10) || DEFAULT_SAMPLE;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch (e) { process.stderr.write(`manifest read fail: ${e.message}\n`); process.exit(2); }

  let classes;
  if (args.includes("--all")) {
    classes = [...new Set((manifest.entries || []).map((e) => e.part_class))].filter(Boolean).sort();
  } else {
    classes = [get("--class", "die")];
  }
  const out = classes.map((c) => validateClass(c, { manifest, sampleN, bucketed }));
  if (asJson) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    for (const r of out) {
      process.stdout.write(`[T-DIMTOL] ${r.cls}: ${r.parts} parts sampled, ${r.evaluated} evaluated, ${r.passed} consistent (passRate ${r.passRate == null ? "n/a" : (100 * r.passRate).toFixed(0) + "%"})\n`);
    }
  }
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main();

export { MANIFEST };
