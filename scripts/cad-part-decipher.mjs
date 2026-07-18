// cad-part-decipher.mjs -- bridge the kernel-validated real-part ledger into Stage-2 mfg logic
// (U-DELTA-CAD-PART-DECIPHER, slot:delta).
//
// Operator work order (closed-loop CAD training):
//   "...decipher the print... adding material for finishing operations, adding features for
//    clamping or work holding..." over EVERY cad file in the H drive.
//
// The Fusion kernel loop (cad-fusion-live-roundtrip.mjs) has already kernel-VALIDATED 2217 real
// JM parts -> state/shared/cad-fusion-live/kernel-gt.jsonl. Each row carries {label, partClass,
// kernelEnvelopeMm}. But a kernel bbox is NOT a manufacturing decipher: mfgInterpretation()
// (cad-mfg-logic.mjs) needs {shape, dims}. NOTHING classifies shape from a kernel bbox (grep-
// confirmed 2026-07-01). This module is that missing bridge.
//
// DISCIPLINE (R5 deterministic-first, then a reasoning model on the residual only):
//   classifyPartFromKernel() is a PURE, FREE ($0) classifier over (bbox symmetry + shop-name
//   keywords + partClass). It emits a confidence:
//     high    -- a name token AND geometry corroborate (round: a two-equal AABB pair supplies the
//                 diameter; prismatic: name + partClass agree)  -> deciphered deterministically
//     medium  -- a single signal (partClass alone, or a prismatic name without a class match)
//     ambiguous -- no signal, CONFLICTING signals (round token AND prismatic token), or a round
//                 name with NO two-equal AABB pair (the diameter is not reliably extractable) ->
//                 shape 'unknown', needsReasoning:true, dims:[], NO fabrication. This bucket is the
//                 frontier the parallel-Hermes decipher pass owns (built next, on this PROVEN core
//                 -- R13 logical order).
//
// UNITS: kernelEnvelopeMm is mm (kernel ground truth). A bad bbox (not 3 positive finite mm)
// THROWS -- units-first, never silently coerce (the 25.4x class). No heuristic-fill on unknowns
// (delta soul refuse-list). Downstream force/collision adequacy stays with the safety engines.

import { mfgInterpretation, ROUND_SHAPES } from "./cad-mfg-logic.mjs";
import fs from "node:fs";
import path from "node:path";

// ---- signal vocabularies (shop-language part names) -------------------------------------------
// Whole-token round indicators (turned / chucked BODIES). NOTE "BORE" is deliberately absent -- a
// bore is a REMOVED internal feature (cad-mfg-logic.mjs envelopeOf models it as such), NOT a body
// shape; a "PUNCH BLOCK 1.000 BORE" is a prismatic block, not a turned part (scrutiny arm B P1).
const ROUND_TOKENS = new Set([
  "ROUND", "BUSHING", "BUSH", "SHAFT", "PIN", "PINION", "RING", "DISC", "DISK", "HUB",
  "COLLAR", "SLEEVE", "IMPELLER", "BLISK", "NOZZLE", "SPACER", "WASHER", "ROLLER", "BEARING", "PLUG",
]);
// A diameter CALLOUT is a round signal ONLY when numeric-adjacent -- "2.500DIA", "⌀25", "Ø.75" --
// never a bare letter run like RADIAL / DIAGONAL / MEDIAN (which contain "DIA" but no digit touch).
// Glyphs: ⌀ = U+2300 DIAMETER SIGN (the drawing glyph), Ø = U+00D8 (scrutiny arm B P2: was ∅ U+2205).
const DIA_CALLOUT = /[\d.]\s*(?:DIA|⌀|Ø)|(?:DIA|⌀|Ø)\s*[\d.]/i;
// Whole-token prismatic indicators (vised / fixtured blocks & plates).
const PRISM_TOKENS = new Set([
  "DIE", "TRIM", "PLATE", "BLOCK", "PUNCH", "BRACKET", "HEX", "SQ", "SQUARE", "RAIL", "BAR",
  "GUIDE", "FORM", "INSERT", "JAW", "GIB", "WEDGE", "SLIDE", "STRIPPER", "SHOE",
]);
// partClass -> default shape family (from the ledger's coarse classifier).
const CLASS_ROUND = new Set(["shaft", "bushing", "impeller", "blisk", "valve_body"]);
const CLASS_PRISM = new Set(["die", "extrude_punch", "bracket"]);

const EQ_REL_TOL = 0.03; // two extents "equal" within 3% of the larger -> geometrically round-consistent

function tokenize(label) {
  return String(label).toUpperCase().split(/[^A-Z0-9⌀Ø]+/).filter(Boolean);
}
function twoEqual(a, b) {
  return Math.abs(a - b) <= EQ_REL_TOL * Math.max(a, b);
}
function assertBbox(bbox, label) {
  if (!Array.isArray(bbox) || bbox.length !== 3) {
    throw new Error(`cad-part-decipher: ${label}: kernelEnvelopeMm must be [x,y,z] mm, got ${JSON.stringify(bbox)}`);
  }
  for (const v of bbox) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      throw new Error(`cad-part-decipher: ${label}: bbox extent must be a positive finite mm value, got ${v}`);
    }
  }
}

/**
 * classifyPartFromKernel -- deterministic shape/dims decipher from a kernel-ledger row.
 * @param {{label:string, partClass?:string, bboxMm:number[]}} rec
 * @returns {{shape:string, dims:Array, process:string|null, confidence:'high'|'medium'|'ambiguous',
 *            needsReasoning:boolean, signals:object, reason?:string}}
 */
export function classifyPartFromKernel(rec) {
  const label = rec && rec.label;
  if (typeof label !== "string" || !label.trim()) {
    throw new Error(`cad-part-decipher: a part row must carry a non-empty label, got ${JSON.stringify(label)}`);
  }
  const bbox = rec.bboxMm || rec.kernelEnvelopeMm;
  assertBbox(bbox, label);
  const partClass = String(rec.partClass || "").toLowerCase();

  const tokens = tokenize(label);
  const up = label.toUpperCase();
  const nameRound = tokens.some((t) => ROUND_TOKENS.has(t)) || DIA_CALLOUT.test(up);
  const namePrism = tokens.some((t) => PRISM_TOKENS.has(t));
  const classRound = CLASS_ROUND.has(partClass);
  const classPrism = CLASS_PRISM.has(partClass);

  // Geometry: sort extents descending; a pair within tol is round-consistent (AABB of a turned body
  // is [D, D, L]). A round body MUST have a two-equal pair -- without one the diameter cannot be
  // reliably extracted, so a round-named part with an all-unequal AABB is DEFERRED, never fabricated.
  const [L, M, S] = [...bbox].sort((a, b) => b - a);
  const eqLM = twoEqual(L, M), eqMS = twoEqual(M, S), eqLS = twoEqual(L, S);
  const geomTwoEqual = eqLM || eqMS || eqLS;

  const signals = { nameRound, namePrism, classRound, classPrism, geomTwoEqual, sorted: [L, M, S] };

  const mkRound = (conf) => {
    // diameter = the ~equal pair; length = the odd extent (whether largest or smallest).
    let dia, len;
    if (eqLM) { dia = (L + M) / 2; len = S; }
    else if (eqMS) { dia = (M + S) / 2; len = L; }
    else { dia = (L + S) / 2; len = M; } // eqLS (only reached when geomTwoEqual holds)
    const shape = len >= dia ? "cylinder" : "disc";
    return {
      shape, process: "lathe", confidence: conf, needsReasoning: false, signals,
      dims: [{ type: "diameter", nominal: Number(dia.toFixed(4)) }, { type: "linear", nominal: Number(len.toFixed(4)) }],
    };
  };
  const mkPrismatic = (conf) => {
    // square-plate when the two largest faces are equal and clearly thicker than the third; else rect.
    const shape = eqLM && !eqMS ? "square-plate" : "rect";
    return {
      shape, process: "mill", confidence: conf, needsReasoning: false, signals,
      dims: [L, M, S].map((v) => ({ type: "linear", nominal: Number(v.toFixed(4)) })),
    };
  };
  const mkAmbiguous = (reason) => ({
    shape: "unknown", dims: [], process: null, confidence: "ambiguous", needsReasoning: true, signals, reason,
  });

  // Conflicting name signals -> undecidable deterministically (e.g. "ROUND DIE PLATE").
  if (nameRound && namePrism) {
    return mkAmbiguous("conflicting round + prismatic name tokens -> parallel-Hermes decipher");
  }
  // Clear round name: emit ONLY if geometry corroborates (a diameter needs a two-equal pair).
  if (nameRound) {
    return geomTwoEqual ? mkRound("high")
      : mkAmbiguous("round name token but no two-equal AABB pair -> diameter not reliably extractable, defer to Hermes");
  }
  // Clear prismatic name: a block/plate is prismatic regardless of symmetry; class lifts to high.
  if (namePrism) return mkPrismatic(classPrism ? "high" : "medium");
  // No name signal -> fall to partClass (round still needs geometric corroboration).
  if (classRound && !classPrism) {
    return geomTwoEqual ? mkRound("medium")
      : mkAmbiguous(`partClass='${partClass}' suggests round but no two-equal AABB pair -> defer to Hermes`);
  }
  if (classPrism && !classRound) return mkPrismatic("medium");
  // No name AND no class signal (general/casing, opaque number) -> defer to Hermes, never guess.
  return mkAmbiguous(`no round/prismatic name token and partClass='${partClass || "?"}' carries no shape signal`);
}

/**
 * decipherKernelPart -- classify then attach the full Stage-2 mfg interpretation.
 * Ambiguous parts carry mfg.applicable=false + needsReasoning (the Hermes-residual marker).
 */
export function decipherKernelPart(rec) {
  const classification = classifyPartFromKernel(rec);
  const mfg = classification.needsReasoning
    ? { applicable: false, needsReasoning: true, reason: classification.reason }
    : mfgInterpretation({ shape: classification.shape, dims: classification.dims }, { process: classification.process });
  // Invariant: a deterministically-emitted round shape must be one the downstream consumer handles.
  if (!classification.needsReasoning && classification.process === "lathe" && !ROUND_SHAPES.has(classification.shape)) {
    throw new Error(`cad-part-decipher: emitted lathe shape '${classification.shape}' not in ROUND_SHAPES`);
  }
  return {
    label: rec.label,
    partClass: rec.partClass || null,
    bboxMm: rec.bboxMm || rec.kernelEnvelopeMm,
    classification,
    mfg,
  };
}

/**
 * runCorpusDecipher -- deterministic decipher over EVERY kernel-validated part (ALL MEANS ALL).
 * Streams the ledger, dedups by label, buckets by confidence/shape, and (optionally) writes a
 * resumable decipher dataset. The `ambiguous` bucket is the exact work-list for the parallel-Hermes
 * pass. Returns coverage numbers -- never "looks fine" (R15 validate). Parse failures and bad-bbox
 * throws are counted SEPARATELY (threwParse vs threwDecipher) so the coverage report names which.
 *
 * @param {string} ledgerPath  kernel-gt.jsonl
 * @param {{limit?:number, outPath?:string, requireKernelValid?:boolean, resume?:boolean}} [opts]
 */
export function runCorpusDecipher(ledgerPath, opts = {}) {
  const requireValid = opts.requireKernelValid !== false;
  const raw = fs.readFileSync(ledgerPath, "utf8").trim();
  const lines = raw ? raw.split("\n") : [];

  const seen = new Set();
  if (opts.resume && opts.outPath && fs.existsSync(opts.outPath)) {
    for (const l of fs.readFileSync(opts.outPath, "utf8").trim().split("\n")) {
      try { const o = JSON.parse(l); if (o && o.label) seen.add(o.label); } catch { /* skip */ }
    }
  }

  const stats = {
    total: lines.length, considered: 0, deciphered: 0,
    skippedInvalidKernel: 0, skippedDuplicate: 0, threwParse: 0, threwDecipher: 0,
    byConfidence: { high: 0, medium: 0, ambiguous: 0 },
    byShape: {}, residualForHermes: 0, samples: [],
  };
  const out = opts.outPath ? [] : null;

  for (const line of lines) {
    if (opts.limit && stats.considered >= opts.limit) break;
    let rec;
    try { rec = JSON.parse(line); } catch { stats.threwParse++; continue; }
    if (requireValid && !rec.kernelValid) { stats.skippedInvalidKernel++; continue; }
    if (rec.label && seen.has(rec.label)) { stats.skippedDuplicate++; continue; }
    stats.considered++;
    let result;
    try {
      result = decipherKernelPart(rec);
    } catch {
      stats.threwDecipher++; // a bad-geometry row is surfaced here, never counted deciphered (R12)
      continue;
    }
    if (rec.label) seen.add(rec.label);
    stats.deciphered++;
    stats.byConfidence[result.classification.confidence]++;
    stats.byShape[result.classification.shape] = (stats.byShape[result.classification.shape] || 0) + 1;
    if (result.classification.needsReasoning) stats.residualForHermes++;
    if (stats.samples.length < 8) {
      stats.samples.push({
        label: result.label, shape: result.classification.shape,
        conf: result.classification.confidence,
        stock: result.mfg.stock ? result.mfg.stock.stockDims : null,
        hold: result.mfg.workholding ? result.mfg.workholding.method : (result.mfg.needsReasoning ? "needs-reasoning" : null),
      });
    }
    if (out) out.push(JSON.stringify(result));
  }

  if (out && opts.outPath) {
    fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
    if (opts.resume) {
      if (out.length) fs.appendFileSync(opts.outPath, out.join("\n") + "\n");
    } else {
      const tmp = `${opts.outPath}.tmp`; // atomic: write tmp then rename, never a torn dataset on crash
      fs.writeFileSync(tmp, out.join("\n") + (out.length ? "\n" : ""));
      fs.renameSync(tmp, opts.outPath);
    }
  }
  return stats;
}

export const __test = { classifyPartFromKernel, tokenize, twoEqual, DIA_CALLOUT, ROUND_TOKENS, PRISM_TOKENS, EQ_REL_TOL };

// ---- CLI -------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("cad-part-decipher.mjs")) {
  const args = process.argv.slice(2);
  // Return the token after a flag ONLY if it is a real value (not the next flag). This lets `--out`
  // stand alone (default path) without swallowing a following `--json` (was a real bug: `--out --json`
  // wrote a file literally named "--json").
  const get = (f, d) => { const i = args.indexOf(f); if (i < 0) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : d; };
  const ledger = get("--corpus", "state/shared/cad-fusion-live/kernel-gt.jsonl");
  const limit = get("--limit", null);
  const outPath = args.includes("--out") ? get("--out", "state/shared/cad-fusion-live/part-decipher.jsonl") : null;
  const stats = runCorpusDecipher(ledger, {
    limit: limit ? Number(limit) : undefined,
    outPath, resume: args.includes("--resume"),
  });
  if (args.includes("--json")) console.log(JSON.stringify(stats, null, 2));
  else {
    console.log(`corpus decipher: ${stats.deciphered}/${stats.considered} deciphered (of ${stats.total} ledger rows)`);
    console.log(`  confidence: high=${stats.byConfidence.high} medium=${stats.byConfidence.medium} ambiguous=${stats.byConfidence.ambiguous}`);
    console.log(`  residual for parallel-Hermes: ${stats.residualForHermes}`);
    console.log(`  byShape: ${JSON.stringify(stats.byShape)}`);
    console.log(`  skipped: invalid-kernel=${stats.skippedInvalidKernel} dup=${stats.skippedDuplicate} threw(parse=${stats.threwParse} decipher=${stats.threwDecipher})`);
    if (outPath) console.log(`  wrote -> ${outPath}`);
  }
}
