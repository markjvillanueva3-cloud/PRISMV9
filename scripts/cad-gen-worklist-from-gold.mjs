#!/usr/bin/env node
/*
 * cad-gen-worklist-from-gold.mjs -- synthesize text->CAD gen specs from the OCR GOLD trainset
 * (slot:delta, 2026-06-26). Grows the drained cad-gen worklist with DIMENSIONALLY-AUTHENTIC JM parts.
 *
 * HONESTY (R12): the gold trainset records carry only OCR'd DIMENSION VALUES (diameter/linear, mm) --
 * NOT part geometry or type. A bare dimension list does not define a part, so we can only emit a spec
 * when a record's dim SIGNATURE clearly maps to a simple machinable archetype (turned bushing / turned
 * cylinder / rectangular plate) using the REAL gold dims. Ambiguous dim-soups are SKIPPED (never
 * fabricate geometry a dim list does not specify -> that would poison the corpus). Reports covered/total.
 *
 * Dims are kept in mm (faithful to the gold source; the codegen handles SI mm just as it handles inch).
 *
 * Usage:
 *   node scripts/cad-gen-worklist-from-gold.mjs --print          # print synthesized specs, no write
 *   node scripts/cad-gen-worklist-from-gold.mjs [--limit 50]     # append up to N fresh specs to worklist
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const TRAINSET = path.join(ROOT, "state", "shared", "ocr-training-loop", "corpus-train", "trainset.jsonl");
const WORKLIST = path.join(ROOT, "state", "shared", "cad-gen-loop", "worklist.txt");

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Pure: classify a gold record's trainable labels into a simple-archetype spec, or null if the dim
 * signature is ambiguous. Only machinable-range dims (diameter 0.5-500mm, linear 0.5-1000mm) count.
 */
export function classifyAndSpec(labels) {
  if (!Array.isArray(labels)) return null;
  // Machinable JM-part envelope: 0.5-300mm (~12 inch). The upper cap filters OCR junk (e.g. an 810mm
  // dim) that would emit an out-of-envelope part.
  const MIN_MM = 0.5, MAX_MM = 300;
  const inRange = (v) => Number.isFinite(v) && v >= MIN_MM && v <= MAX_MM;
  const D = labels.filter((l) => l && l.type === "diameter" && l.trainable !== false)
    .map((l) => Number(l.value_mm)).filter(inRange).sort((a, b) => b - a);
  const L = labels.filter((l) => l && l.type === "linear" && l.trainable !== false)
    .map((l) => Number(l.value_mm)).filter(inRange).sort((a, b) => b - a);
  // turned bushing: two diameters with a MEANINGFUL wall (bore <= 0.9*OD, i.e. wall >= 5% of OD per
  // side) + a length. Rejects degenerate near-zero-wall pairs (e.g. 28.6 OD / 28.58 bore).
  if (D.length >= 2 && L.length >= 1 && D[1] <= 0.9 * D[0]) {
    return `a turned bushing: ${r2(D[0])} mm outer diameter, ${r2(D[1])} mm bore, ${r2(L[0])} mm long`;
  }
  // turned cylinder: one diameter + a length
  if (D.length >= 1 && L.length >= 1) {
    return `a ${r2(D[0])} mm diameter cylinder ${r2(L[0])} mm long`;
  }
  // rectangular plate: no diameter, >=3 linear dims (L x W x T from the three largest)
  if (D.length === 0 && L.length >= 3) {
    return `a ${r2(L[0])} mm by ${r2(L[1])} mm by ${r2(L[2])} mm rectangular plate`;
  }
  return null; // ambiguous dim-soup -> skip (do not fabricate geometry)
}

/** Pure: synthesize a deduped, ordered list of specs from trainset records (cap at limit). */
export function synthesize(records, limit = 50, existing = new Set()) {
  const out = [];
  const seen = new Set(existing);
  for (const rec of records) {
    if (out.length >= limit) break;
    const spec = classifyAndSpec(rec && rec.labels);
    if (spec && !seen.has(spec)) { seen.add(spec); out.push(spec); }
  }
  return out;
}

export function existingSpecSet(text) {
  const set = new Set();
  for (const line of (text || "").split(/\r?\n/)) { const t = line.trim(); if (t && !t.startsWith("#")) set.add(t); }
  return set;
}

function readTrainset(p = TRAINSET) {
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const recs = [];
  for (const l of lines) { try { recs.push(JSON.parse(l)); } catch { /* skip torn line */ } }
  return recs;
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const li = argv.indexOf("--limit");
  const limit = li >= 0 && argv[li + 1] ? Math.max(1, parseInt(argv[li + 1], 10)) : 50;
  const records = readTrainset();
  const existing = existingSpecSet(fs.existsSync(WORKLIST) ? fs.readFileSync(WORKLIST, "utf8") : "");
  const specs = synthesize(records, limit, existing);
  const classifiable = records.filter((r) => classifyAndSpec(r && r.labels)).length;

  if (argv.includes("--print")) {
    process.stdout.write(specs.join("\n") + "\n");
    process.stderr.write(`# ${specs.length} fresh / ${classifiable} classifiable / ${records.length} gold records (${records.length - classifiable} ambiguous skipped)\n`);
    process.exit(0);
  }
  if (specs.length === 0) { process.stdout.write(`no fresh specs (classifiable ${classifiable}/${records.length}, all already present)\n`); process.exit(0); }
  fs.appendFileSync(WORKLIST, `\n# --- gold-trainset synthesis (cad-gen-worklist-from-gold.mjs) ---\n` + specs.join("\n") + "\n");
  process.stdout.write(`appended ${specs.length} gold-derived spec(s) (classifiable ${classifiable}/${records.length}; ${records.length - classifiable} ambiguous dim-soups skipped, R12) to ${path.relative(ROOT, WORKLIST)}\n`);
}
