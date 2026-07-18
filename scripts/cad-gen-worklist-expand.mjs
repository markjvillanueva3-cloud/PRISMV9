#!/usr/bin/env node
/*
 * cad-gen-worklist-expand.mjs -- deterministic parametric CAD-gen spec generator
 * (DELTA-CAD-COMPLETION / U-CAD-GEN-WORKLIST-EXPAND, slot:delta 2026-06-26).
 *
 * Scales the cad-gen-overnight-loop worklist with HIGH-QUALITY parametric specs (part archetype +
 * swept inch dimensions), NOT dim-only OCR rows (those lack geometry -> low-fidelity gen, R12). Each
 * generated line is a complete text part-spec the text->CAD lane (cad-text-to-cadquery) can model.
 * Deterministic (fixed dimension sweeps, no RNG) so reruns are stable + dedup-safe.
 *
 * Usage:
 *   node scripts/cad-gen-worklist-expand.mjs            # append new specs to the default worklist
 *   node scripts/cad-gen-worklist-expand.mjs --print    # print generated specs, do not write
 *   node scripts/cad-gen-worklist-expand.mjs --worklist <file>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const DEFAULT_WORKLIST = path.join(ROOT, "state", "shared", "cad-gen-loop", "worklist.txt");

/*
 * Archetype templates: each is a function of a dimension tuple -> a complete inch part-spec string.
 * Dimension sweeps are fixed arrays (deterministic). JM Die convention is INCH; specs say "inch"
 * explicitly so the codegen unit-rule (IN=25.4) fires.
 */
export const ARCHETYPES = [
  { name: "cube", dims: [0.5, 1.0, 1.5, 2.0], spec: (a) => `a ${a} inch cube` },
  { name: "cylinder", dims: [[1.0, 1.0], [1.5, 2.0], [0.75, 3.0], [2.0, 0.5]], spec: ([d, h]) => `a ${d} inch diameter by ${h} inch tall cylinder` },
  { name: "plate", dims: [[2, 1, 0.25], [3, 2, 0.5], [4, 3, 0.75], [1.5, 1.5, 0.375]], spec: ([l, w, t]) => `a ${l} inch by ${w} inch by ${t} inch rectangular plate` },
  { name: "cube-thru-hole", dims: [[1.0, 0.25], [1.5, 0.375], [2.0, 0.5]], spec: ([a, d]) => `a ${a} inch cube with a ${d} inch diameter through hole centered on the top face` },
  { name: "disc-bore", dims: [[1.5, 0.25, 0.5], [2.0, 0.375, 0.75], [1.0, 0.1875, 0.375]], spec: ([od, t, bore]) => `a ${od} inch diameter disc ${t} inch thick with a ${bore} inch diameter central bore` },
  { name: "bushing", dims: [[1.0, 0.5, 1.25], [0.75, 0.375, 1.0], [1.5, 0.75, 2.0]], spec: ([od, bore, len]) => `a bushing: ${od} inch outer diameter, ${bore} inch bore, ${len} inch long` },
  { name: "stepped-bore", dims: [[2.0, 1.0, 0.6, 0.5], [1.5, 0.875, 0.5, 0.4], [2.5, 1.25, 0.75, 0.625]], spec: ([od, h, d1, d2]) => `a stepped bore part: ${od} inch diameter by ${h} inch tall, with a ${d1} inch diameter bore stepping down to a ${d2} inch diameter bore through the rest` },
  // block thickness `h` is an EXPLICIT swept dim and always exceeds pocket depth `pd` (a pocket >= stock
  // thickness is a through-cut/degenerate floor -- geometrically contradictory training data; fixed 2026-06-26).
  { name: "block-pocket", dims: [[3, 2, 1.0, 0.5, 1.0], [2, 2, 0.75, 0.4, 0.75], [4, 3, 1.5, 0.75, 1.5]], spec: ([l, w, h, pd, pw]) => `a ${l} inch by ${w} inch by ${h} inch block with a ${pd} inch deep ${pw} inch wide pocket centered on top` },
  { name: "shaft-keyway", dims: [[1.0, 4.0], [0.75, 3.0], [1.25, 5.0]], spec: ([d, len]) => `a ${d} inch diameter shaft ${len} inch long with a 0.125 inch by 0.0625 inch keyway running the full length` },
  { name: "washer", dims: [[0.5, 1.0, 0.0625], [0.375, 0.875, 0.0625], [0.625, 1.25, 0.125]], spec: ([id, od, t]) => `a flat washer: ${id} inch inner diameter, ${od} inch outer diameter, ${t} inch thick` },
  { name: "flange-hub", dims: [[1.0, 0.25, 0.5, 1.0], [1.5, 0.375, 0.75, 1.25], [2.0, 0.5, 1.0, 1.5]], spec: ([fd, ft, hd, hl]) => `a ${fd} inch diameter flange ${ft} inch thick on a ${hd} inch diameter ${hl} inch long hub` },
  { name: "ring", dims: [[1.25, 1.0, 0.5], [1.5, 1.25, 0.75], [1.0, 0.75, 0.375]], spec: ([od, id, t]) => `a spacer ring: ${od} inch outer diameter, ${id} inch inner diameter, ${t} inch tall` },
  // JM Die shop-representative parts (dies / punches / bushings) -- all geometric primitives the gen
  // handles (steps/chamfers/keyways were in the 36/36-valid set), so they extend test coverage to the
  // actual shop work without risking the valid-rate.
  { name: "die-button", dims: [[0.75, 0.5, 1.0], [1.0, 0.625, 1.25], [0.5, 0.375, 0.75]], spec: ([headD, bodyD, h]) => `a die button: a ${headD} inch diameter head 0.25 inch tall on a ${bodyD} inch diameter body, ${h} inch tall overall` },
  { name: "punch-blank", dims: [[0.375, 2.0], [0.5, 2.5], [0.25, 1.5]], spec: ([d, len]) => `a punch blank: a ${d} inch diameter cylinder ${len} inch long with a 0.03 inch chamfer on each end` },
  { name: "pilot-punch", dims: [[0.5, 0.25, 0.375], [0.625, 0.3125, 0.5], [0.375, 0.1875, 0.25]], spec: ([bodyD, tipD, tipLen]) => `a pilot punch: a ${bodyD} inch diameter body 1.5 inch long stepping down to a ${tipD} inch diameter pilot tip ${tipLen} inch long` },
  { name: "keyed-bushing", dims: [[1.0, 0.5, 1.0], [1.25, 0.625, 1.25], [0.875, 0.5, 0.875]], spec: ([od, bore, len]) => `a keyed bushing: ${od} inch outer diameter, ${bore} inch bore, ${len} inch long, with a 0.125 inch wide by 0.0625 inch deep keyway in the bore` },
  // Expansion wave 2 (2026-06-26, slot:delta) -- 10 archetypes built ONLY from features proven valid in
  // the 62/62-valid corpus (v-groove, chamfer, step, taper, bore, slot, groove, stacked-cylinder,
  // hollow-extrude). Strictly avoids union/boolean of two free bodies (unproven -> would risk the
  // 100% valid-rate, R12). Grows training-corpus diversity toward the actual shop work.
  { name: "v-block", dims: [[1.5, 0.5], [2.0, 0.75], [1.0, 0.375]], spec: ([a, d]) => `a v-block: a ${a} inch cube with a 90 degree v-groove ${d} inch deep across the top face` },
  { name: "chamfered-block", dims: [[2, 1, 0.75, 0.125], [3, 2, 1.0, 0.1875], [1.5, 1.5, 0.5, 0.0625]], spec: ([l, w, h, c]) => `a ${l} inch by ${w} inch by ${h} inch block with a ${c} inch by 45 degree chamfer on all four top edges` },
  { name: "slotted-plate", dims: [[3, 2, 0.5, 1.5, 0.375, 0.25], [4, 3, 0.75, 2.0, 0.5, 0.375], [2, 2, 0.5, 1.0, 0.25, 0.25]], spec: ([l, w, t, sl, sw, sd]) => `a ${l} inch by ${w} inch by ${t} inch plate with a ${sl} inch long by ${sw} inch wide slot milled ${sd} inch deep, centered` },
  { name: "counterbore-plate", dims: [[2, 2, 0.5, 0.25, 0.5, 0.25], [3, 2, 0.75, 0.375, 0.625, 0.3], [2.5, 2.5, 0.625, 0.3125, 0.5625, 0.25]], spec: ([l, w, t, d, cbd, cbz]) => `a ${l} inch by ${w} inch by ${t} inch plate with a ${d} inch diameter through hole counterbored to ${cbd} inch diameter ${cbz} inch deep on the top face` },
  { name: "stepped-shaft", dims: [[0.5, 1.0, 0.75, 0.5], [0.75, 1.5, 1.0, 0.75], [1.0, 2.0, 1.5, 1.0]], spec: ([d1, l1, d2, l2]) => `a stepped shaft: ${d1} inch diameter by ${l1} inch long, stepping up to ${d2} inch diameter by ${l2} inch long` },
  { name: "frustum", dims: [[2.0, 1.0, 1.5], [1.5, 0.75, 1.0], [1.0, 0.5, 2.0]], spec: ([d1, d2, h]) => `a truncated cone: ${d1} inch diameter base tapering to ${d2} inch diameter top over ${h} inch height` },
  { name: "grooved-shaft", dims: [[1.0, 3.0, 0.125, 0.0625, 0.5], [0.75, 2.5, 0.0938, 0.0625, 0.375], [1.25, 4.0, 0.1875, 0.0938, 0.75]], spec: ([d, len, gw, gd, pos]) => `a ${d} inch diameter shaft ${len} inch long with a ${gw} inch wide by ${gd} inch deep groove cut around it ${pos} inch from one end` },
  { name: "counterbored-boss", dims: [[1.5, 1.0, 0.5, 0.75, 0.375], [2.0, 1.25, 0.625, 1.0, 0.5], [1.0, 0.75, 0.375, 0.5, 0.25]], spec: ([od, h, bd, cbd, cbz]) => `a boss: a ${od} inch diameter cylinder ${h} inch tall with a ${bd} inch diameter bore counterbored to ${cbd} inch diameter ${cbz} inch deep` },
  { name: "square-tube", dims: [[1.5, 0.25, 3.0], [2.0, 0.375, 4.0], [1.0, 0.1875, 2.0]], spec: ([o, wall, len]) => `a square tube: ${o} inch square outside with ${wall} inch wall thickness, ${len} inch long` },
  { name: "shouldered-disc", dims: [[2.0, 0.375, 1.0, 0.5], [2.5, 0.5, 1.25, 0.625], [1.5, 0.25, 0.75, 0.375]], spec: ([d1, t1, d2, t2]) => `a shouldered disc: a ${d1} inch diameter by ${t1} inch thick base with a ${d2} inch diameter by ${t2} inch tall raised boss centered on top` },
];

/* Generate the full deterministic spec set (archetype x dimension sweep). */
export function generateSpecs() {
  const out = [];
  for (const a of ARCHETYPES) for (const d of a.dims) out.push(a.spec(d));
  return out;
}

/* Parse an existing worklist into a Set of specs (for dedup; ignores blanks + # comments). */
export function existingSpecSet(text) {
  const set = new Set();
  for (const line of (text || "").split(/\r?\n/)) { const t = line.trim(); if (t && !t.startsWith("#")) set.add(t); }
  return set;
}

/* Return only the generated specs not already present. */
export function newSpecs(generated, existing) {
  return generated.filter((s) => !existing.has(s));
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const wlIdx = argv.indexOf("--worklist");
  const worklist = wlIdx >= 0 && argv[wlIdx + 1] ? argv[wlIdx + 1] : DEFAULT_WORKLIST;
  const generated = generateSpecs();
  if (argv.includes("--print")) { process.stdout.write(generated.join("\n") + "\n"); process.exit(0); }
  const existing = existingSpecSet(fs.existsSync(worklist) ? fs.readFileSync(worklist, "utf8") : "");
  const fresh = newSpecs(generated, existing);
  if (fresh.length === 0) { process.stdout.write(`worklist already has all ${generated.length} generated specs -- nothing to append.\n`); process.exit(0); }
  fs.appendFileSync(worklist, `\n# --- parametric expansion (cad-gen-worklist-expand.mjs) ---\n` + fresh.join("\n") + "\n");
  process.stdout.write(`appended ${fresh.length} new spec(s) (${generated.length} generated, ${existing.size} already present) to ${path.relative(ROOT, worklist)}\n`);
}
