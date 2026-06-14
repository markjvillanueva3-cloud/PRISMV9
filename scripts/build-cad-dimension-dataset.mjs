#!/usr/bin/env node
/**
 * build-cad-dimension-dataset.mjs -- producer: mine REAL cylindrical/circular feature radii from the
 * JM-Die STEP corpus -> per-class dimensional CAD-generation training pairs
 * (U-CAD-DIM-RADII, slot:india 2026-06-11). The first DIMENSIONAL (values, not presence) training
 * signal for delta's CAD closed loop -- the accuracy lever.
 *
 * Reads the recovered corpus manifest (entries with part_class + abs_path), reads each STEP file,
 * extracts unit-normalized radii via scripts/lib/step-dimension-extract.mjs, aggregates per class,
 * and writes per-class radius-distribution pairs to state/shared/lora/cad-dimension-dataset.jsonl.
 * Registered as an advisory lora-training-jsonl source so the fleet assembler folds it into the
 * CAD-gen corpus. UNITS-FIRST: files with an unresolvable unit are SKIPPED + counted (R12 -- never
 * fabricate a dimension in an unknown unit; a 25.4x inch/mm error is the failure this guards).
 *
 * Usage:
 *   node scripts/build-cad-dimension-dataset.mjs                 # dry-run counts
 *   node scripts/build-cad-dimension-dataset.mjs --out           # write the dataset
 *   node scripts/build-cad-dimension-dataset.mjs --max-per-class 60 --json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractRadiiMm, radiusStats, dimensionTrainingPair, extractBboxMm, bboxStats, bboxTrainingPair } from "./lib/step-dimension-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MANIFEST = path.join(ROOT, "mcp-server", "data", "state", "cad-corpus-manifest-recovered.json");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "cad-dimension-dataset.jsonl");
const DEFAULT_MAX_PER_CLASS = 120; // bound corpus reads; per-class radius distributions converge well before this
// A machined PART in the JM-Die corpus is sub-metre; files with a larger envelope are misclassified
// ASSEMBLIES / machine models / vise+fixture setups (e.g. a 6.3m "OKUMA MU400VA MACHINE CAD MODEL"
// landed in 'plate'). Excluding them keeps the dimensional GT a part-level signal, not assembly noise.
const PART_ENVELOPE_CEILING_MM = 1500;

/**
 * Pure core: given STEP manifest entries + a reader, mine per-class radii and build dimensional
 * pairs. `entries` = [{ part_class, abs_path, ext }]. Returns { pairs, perClass, filesRead,
 * filesSkippedUnit, filesUnreadable }.
 */
export function buildDimensionPairs({ entries, readFileImpl, maxPerClass = DEFAULT_MAX_PER_CLASS }) {
  const steps = (Array.isArray(entries) ? entries : []).filter((e) => e && (e.ext === ".step" || e.ext === ".stp") && e.part_class && e.abs_path);
  const byClass = new Map(); // class -> { radii:[], bboxes:[], files:0 }
  const seenPerClass = new Map();
  let filesRead = 0, filesSkippedUnit = 0, filesUnreadable = 0, filesSkippedOversize = 0;

  for (const e of steps) {
    const n = seenPerClass.get(e.part_class) || 0;
    if (n >= maxPerClass) continue;
    let text;
    try { text = readFileImpl(e.abs_path, "utf8"); } catch { filesUnreadable += 1; continue; }
    seenPerClass.set(e.part_class, n + 1);
    const { unit, radiiMm } = extractRadiiMm(text);
    if (unit === "unknown") { filesSkippedUnit += 1; continue; }
    const bbox = extractBboxMm(text); // part envelope (may be null if <2 points)
    // Plausibility guard: a >1.5m envelope is a misclassified assembly/machine, not a machined part.
    // Exclude the WHOLE file (its radii are assembly noise too), not just its bbox.
    if (bbox && bbox.maxExtentMm > PART_ENVELOPE_CEILING_MM) { filesSkippedOversize += 1; continue; }
    filesRead += 1;
    const hasRadii = radiiMm.length > 0;
    if (!hasRadii && !bbox) continue;
    const bucket = byClass.get(e.part_class) || { radii: [], bboxes: [], files: 0 };
    if (hasRadii) bucket.radii.push(...radiiMm);
    if (bbox) bucket.bboxes.push(bbox);
    bucket.files += 1;
    byClass.set(e.part_class, bucket);
  }

  const pairs = [];
  const perClass = [];
  for (const [partClass, b] of [...byClass.entries()].sort((a, c) => a[0].localeCompare(c[0]))) {
    const rStats = radiusStats(b.radii);
    const rPair = dimensionTrainingPair(partClass, rStats, b.files);
    const eStats = bboxStats(b.bboxes);
    const ePair = bboxTrainingPair(partClass, eStats);
    if (rPair) pairs.push(rPair);
    if (ePair) pairs.push(ePair);
    if (rPair || ePair) {
      perClass.push({
        partClass, files: b.files,
        radii: rStats ? rStats.count : 0, medianRadiusMm: rStats ? rStats.medianMm : null,
        envelopeMm: eStats ? `${eStats.medianL}x${eStats.medianW}x${eStats.medianH}` : null,
      });
    }
  }
  return { pairs, perClass, filesRead, filesSkippedUnit, filesUnreadable, filesSkippedOversize };
}

function loadManifestEntries(manifestPath) {
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return Array.isArray(m.entries) ? m.entries : [];
}

function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const mpcIdx = args.indexOf("--max-per-class");
  const maxPerClass = mpcIdx >= 0 ? Number(args[mpcIdx + 1]) || DEFAULT_MAX_PER_CLASS : DEFAULT_MAX_PER_CLASS;

  let entries;
  try { entries = loadManifestEntries(DEFAULT_MANIFEST); }
  catch { process.stdout.write(`ERR: manifest not found at ${DEFAULT_MANIFEST}\n`); process.exit(2); }

  const res = buildDimensionPairs({ entries, readFileImpl: fs.readFileSync, maxPerClass });
  if (write) writeJsonlAtomic(DEFAULT_OUT, res.pairs);

  const summary = {
    pairs: res.pairs.length,
    classes: res.perClass.length,
    filesRead: res.filesRead,
    filesSkippedUnknownUnit: res.filesSkippedUnit,
    filesSkippedOversize: res.filesSkippedOversize,
    filesUnreadable: res.filesUnreadable,
    perClass: res.perClass,
    written: write ? DEFAULT_OUT : undefined,
  };
  if (asJson) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }
  process.stdout.write(`cad dimensional radii+envelope -> CAD-gen training: ${res.pairs.length} pairs / ${res.perClass.length} classes (read ${res.filesRead}, ${res.filesSkippedUnit} unknown-unit, ${res.filesSkippedOversize} oversize-assembly, ${res.filesUnreadable} unreadable)\n`);
  for (const c of res.perClass) process.stdout.write(`  - ${c.partClass}: ${c.radii} radii (median ${c.medianRadiusMm}mm) / envelope ${c.envelopeMm || "n/a"} mm / ${c.files} files\n`);
  process.stdout.write(write ? `Wrote -> ${DEFAULT_OUT}\n` : "(dry-run; pass --out to write)\n");
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_MANIFEST, DEFAULT_OUT, DEFAULT_MAX_PER_CLASS };
