#!/usr/bin/env node
/**
 * gen-cad-nl-corpus.mjs — Generate 500-sample NL intent corpus for
 * CADIntentDecomposerEngine (U-CADC-AI02).
 *
 * Writes JSONL lines of `{ nl, expect: { cadSystem, tier, hasFeature } }`.
 * Samples are seeded + deterministic so tests are reproducible.
 *
 * Output: data/test-corpora/cad-nl-intent-500.jsonl
 */

import fs from "node:fs";
import path from "node:path";

const CAD_SYSTEMS = [
  { key: "solidworks", words: ["SolidWorks", "solidworks"] },
  { key: "fusion360", words: ["Fusion 360", "fusion360", "fusion"] },
  { key: "mastercam", words: ["Mastercam", "mastercam"] },
  { key: "hypermill", words: ["hyperMILL", "hypermill"] },
  { key: "hypercad_s", words: ["hyperCAD-S", "hypercad"] },
  { key: "inventor", words: ["Inventor", "Inventor IPT"] },
  { key: "inventor_hsm", words: ["Inventor HSM", "inventor hsm"] },
  { key: "freecad", words: ["FreeCAD", "freecad"] },
  { key: "cadquery", words: ["CadQuery", "cadquery"] },
  { key: "catia_v5", words: ["CATIA V5", "catia"] },
  { key: "creo", words: ["Creo", "creo"] },
  { key: "nx", words: ["Siemens NX", "NX"] },
  { key: "onshape", words: ["Onshape", "onshape"] },
  { key: "rhino", words: ["Rhino", "Rhinoceros"] },
];

// Deterministic PRNG (Mulberry32) seeded.
function prng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20260421);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const irand = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const choice = (p) => rand() < p;

const MATERIALS = [
  "6061-T6",
  "7075",
  "4140",
  "1018",
  "D2 tool steel",
  "M2",
  "A2",
  "S7",
  "H13",
  "Ti-6Al-4V",
  "Inconel 718",
  "303 stainless",
  "316 stainless",
  "brass",
  "copper",
  "graphite",
];

const THREADS = ["M6", "M8", "M10", "M10x1.5", "M12", "1/4-20", "3/8-16", "1/2-13", "#10-32"];

// ──── Sample generators (tier + hasFeature) ───────────────────────────────

function cadSuffix(sys) {
  return ` in ${pick(sys.words)}`;
}

function toleranceSuffix() {
  return choice(0.3)
    ? ` ±${(rand() * 0.02 + 0.001).toFixed(3)}mm`
    : "";
}

function mkHole() {
  const sys = pick(CAD_SYSTEMS);
  const d = pick([3, 4, 5, 6, 6.35, 8, 10, 12, 12.7, 15, 20]);
  const depth = pick([5, 8, 10, 15, 20, 25]);
  const mat = choice(0.5) ? ` in ${pick(MATERIALS)}` : "";
  const nl = `drill a ${d}mm hole ${depth}mm deep${mat}${toleranceSuffix()}${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkHoleInch() {
  const sys = pick(CAD_SYSTEMS);
  const d = pick(["0.25", "0.375", "0.5", "0.75", "1.0", "1.25"]);
  const depth = pick(["0.25", "0.5", "1.0", "1.5"]);
  const mat = choice(0.5) ? ` in ${pick(MATERIALS)}` : "";
  const nl = `drill a ${d}" hole ${depth}" deep${mat}${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkBoltCircle() {
  const sys = pick(CAD_SYSTEMS);
  const n = pick([4, 6, 8, 12]);
  const thr = pick(THREADS);
  const bcd = pick([50, 75, 100, 150, 200]);
  const nl = `add a circular pattern of ${n} ${thr} holes on a ${bcd}mm BCD${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkRectExtrude() {
  const sys = pick(CAD_SYSTEMS);
  const L = pick([20, 25, 40, 50, 80, 100, 150, 200]);
  const W = pick([10, 15, 20, 30, 50, 75, 100]);
  const H = pick([5, 8, 10, 15, 20, 25, 30]);
  const nl = `rectangle extrude ${L}x${W}x${H}mm${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkFilletChamfer() {
  const sys = pick(CAD_SYSTEMS);
  const r = pick([0.5, 1, 2, 3, 5]);
  const op = choice(0.5) ? "fillet" : "chamfer";
  const nl = `${op} edges ${r}mm size${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkAssembly() {
  const sys = pick(CAD_SYSTEMS);
  const n = pick([2, 3, 4, 5, 8]);
  const m = pick([2, 4, 6, 8]);
  const nl = `build an assembly with ${n} parts and ${m} mates${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "assembly", hasFeature: false } };
}

function mkComplexPart() {
  const sys = pick(CAD_SYSTEMS);
  const n = pick([2, 3, 4]);
  const nl = `multi-body part with ${n} variants${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "part", hasFeature: false } };
}

function mkRevolve() {
  const sys = pick(CAD_SYSTEMS);
  const L = pick([20, 30, 50, 80, 100]);
  const W = pick([5, 10, 15, 20, 25]);
  const nl = `revolve a ${L}x${W}mm profile${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkShell() {
  const sys = pick(CAD_SYSTEMS);
  const t = pick([1, 2, 3, 4, 5]);
  const nl = `shell the part with ${t}mm thickness${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkLinearPattern() {
  const sys = pick(CAD_SYSTEMS);
  const n = pick([3, 4, 5, 6, 8, 10]);
  const p = pick([10, 15, 20, 25, 30]);
  const nl = `linear pattern of ${n} holes at ${p}mm pitch${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkPocket() {
  const sys = pick(CAD_SYSTEMS);
  const kind = choice(0.5) ? "rectangle" : "circle";
  const depth = pick([2, 5, 8, 10, 15]);
  if (kind === "rectangle") {
    const L = pick([20, 30, 50, 80]);
    const W = pick([10, 15, 25, 40]);
    const nl = `cut a rectangle pocket ${L}x${W}x${depth}mm${cadSuffix(sys)}`;
    return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
  }
  const d = pick([10, 20, 30, 50]);
  const nl = `cut a circle pocket ${d}mm dia ${depth}mm deep${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkExportStep() {
  const sys = pick(CAD_SYSTEMS);
  const nl = `export STEP AP242${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

function mkBoolean() {
  const sys = pick(CAD_SYSTEMS);
  const op = choice(0.5) ? "union" : "subtract";
  const nl = `${op} bodies${cadSuffix(sys)}`;
  return { nl, expect: { cadSystem: sys.key, tier: "op", hasFeature: true } };
}

const GENS = [
  mkHole,
  mkHole,
  mkHole,
  mkHoleInch,
  mkBoltCircle,
  mkRectExtrude,
  mkRectExtrude,
  mkFilletChamfer,
  mkAssembly,
  mkComplexPart,
  mkRevolve,
  mkShell,
  mkLinearPattern,
  mkPocket,
  mkPocket,
  mkExportStep,
  mkBoolean,
];

// ──── Drive ──────────────────────────────────────────────────────────────

const TARGET = 500;
const lines = [];
const seen = new Set();
let guard = 0;
while (lines.length < TARGET && guard < TARGET * 20) {
  const gen = GENS[Math.floor(rand() * GENS.length)];
  const sample = gen();
  const key = sample.nl;
  if (seen.has(key)) {
    guard++;
    continue;
  }
  seen.add(key);
  lines.push(JSON.stringify(sample));
  guard++;
}

if (lines.length !== TARGET) {
  console.error(`Only produced ${lines.length} unique samples after ${guard} iters`);
  process.exit(1);
}

const out = path.resolve(process.cwd(), "data/test-corpora/cad-nl-intent-500.jsonl");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log(`wrote ${lines.length} samples → ${out}`);
