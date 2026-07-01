// Tests for cad-part-decipher.mjs -- kernel-bbox -> Stage-2 mfg decipher bridge
// (U-DELTA-CAD-PART-DECIPHER, slot:delta). Reference values are hand-derived from real JM
// part shapes; failure + adversarial modes prove the fail-loud + no-fabrication discipline (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyPartFromKernel, decipherKernelPart, runCorpusDecipher, __test,
} from "./cad-part-decipher.mjs";
import { ROUND_SHAPES } from "./cad-mfg-logic.mjs";

// ---- classifyPartFromKernel: prismatic (die/plate) --------------------------------------------

test("classify: 'DIE HEX TRIM' block (name DIE+HEX+TRIM, class die, two-equal faces) -> square-plate + mill, high", () => {
  const c = classifyPartFromKernel({ label: "02-TH-0037 DIE HEX TRIM - MACHINE 5", partClass: "die", kernelEnvelopeMm: [31.88, 31.88, 19.63] });
  assert.equal(c.shape, "square-plate"); // two largest equal (31.88), third smaller
  assert.equal(c.process, "mill");
  assert.equal(c.confidence, "high"); // name prismatic + class prismatic
  assert.equal(c.needsReasoning, false);
  assert.deepEqual(c.dims.map((d) => d.nominal), [31.88, 31.88, 19.63]);
  assert.ok(c.dims.every((d) => d.type === "linear"));
});

test("classify: unequal prismatic plate -> rect (not square-plate)", () => {
  const c = classifyPartFromKernel({ label: "GUIDE PLATE 44", partClass: "die", kernelEnvelopeMm: [120, 60, 15] });
  assert.equal(c.shape, "rect");
  assert.equal(c.process, "mill");
  assert.equal(c.confidence, "high");
});

test("classify: die class with an opaque number-only name -> prismatic medium (class signal only)", () => {
  const c = classifyPartFromKernel({ label: "TH-0092", partClass: "die", kernelEnvelopeMm: [50, 40, 12] });
  assert.equal(c.process, "mill");
  assert.equal(c.confidence, "medium"); // class prismatic, no name token
  assert.equal(c.needsReasoning, false);
});

// ---- classifyPartFromKernel: round (bushing/shaft/ring) ----------------------------------------

test("classify: 'MAIN BUSHING' D=D long (name + class + two-equal) -> cylinder + lathe, high", () => {
  const c = classifyPartFromKernel({ label: "MAIN BUSHING", partClass: "bushing", kernelEnvelopeMm: [50.0, 50.0, 80.0] });
  assert.equal(c.shape, "cylinder"); // length 80 >= dia 50
  assert.equal(c.process, "lathe");
  assert.equal(c.confidence, "high");
  assert.ok(ROUND_SHAPES.has(c.shape));
  const dia = c.dims.find((d) => d.type === "diameter");
  const len = c.dims.find((d) => d.type === "linear");
  assert.equal(dia.nominal, 50.0);
  assert.equal(len.nominal, 80.0);
});

test("classify: 'SPACER RING' short axial (name round, geom two-equal, class general) -> disc + lathe", () => {
  const c = classifyPartFromKernel({ label: "SPACER RING", partClass: "general", kernelEnvelopeMm: [60, 60, 8] });
  assert.equal(c.shape, "disc"); // length 8 < dia 60
  assert.equal(c.process, "lathe");
  assert.equal(c.confidence, "high"); // name round + geom two-equal
  assert.equal(c.dims.find((d) => d.type === "diameter").nominal, 60);
});

test("classify: diameter callout embedded in a token ('2.500DIA') is a round signal (numeric-adjacent)", () => {
  const c = classifyPartFromKernel({ label: "PLUG 2.500DIA", partClass: "general", kernelEnvelopeMm: [63.5, 63.5, 40] });
  assert.equal(c.process, "lathe");
  assert.ok(ROUND_SHAPES.has(c.shape));
});

// ADVERSARIAL (scrutiny arm B P1): a bare "DIA" letter-run must NOT trigger round -- the callout
// must be numeric-adjacent. RADIAL/DIAGONAL/MEDIAN contain "DIA" but are not diameters.
test("classify: 'RADIAL FORMING DIE' is a prismatic die, NOT round (DIA-in-RADIAL is not a callout)", () => {
  const c = classifyPartFromKernel({ label: ".25 RADIAL FORMING DIE - HURCO", partClass: "die", kernelEnvelopeMm: [90, 60, 25] });
  assert.equal(c.shape, "rect");
  assert.equal(c.process, "mill");
  assert.equal(c.confidence, "high"); // DIE token + die class; RADIAL must not demote it to ambiguous
  assert.equal(c.signals.nameRound, false, "'RADIAL' must not set nameRound");
});
test("classify: 'DIAGONAL BRACE' does not fire the round signal on the DIA substring", () => {
  const c = classifyPartFromKernel({ label: "DIAGONAL BRACE", partClass: "general", kernelEnvelopeMm: [120, 40, 8] });
  assert.equal(c.signals.nameRound, false);
});

// ADVERSARIAL (scrutiny arm B P1): a bore is an internal FEATURE, not a round body. A punch block
// WITH a bore is prismatic, not turned.
test("classify: 'PUNCH BLOCK 1.000 BORE' is a prismatic block (BORE is a feature, not a round body)", () => {
  const c = classifyPartFromKernel({ label: "2ND PUNCH BLOCK 1.000 BORE", partClass: "die", kernelEnvelopeMm: [76.2, 50.8, 25.4] });
  assert.equal(c.shape, "rect");
  assert.equal(c.process, "mill");
  assert.equal(c.needsReasoning, false, "BLOCK/PUNCH prismatic, no false round-conflict from BORE");
  assert.equal(c.signals.nameRound, false);
});

// ADVERSARIAL (scrutiny arm A P2): a round NAME with no two-equal AABB pair cannot yield a reliable
// diameter -> defer to Hermes, never fabricate dia=(L+M)/2 from unequal extents.
test("classify: 'SHAFT' with a fully-unequal AABB -> ambiguous (no fabricated diameter)", () => {
  const c = classifyPartFromKernel({ label: "STEP SHAFT", partClass: "shaft", kernelEnvelopeMm: [100, 40, 20] });
  assert.equal(c.needsReasoning, true);
  assert.equal(c.shape, "unknown");
  assert.deepEqual(c.dims, []);
  assert.match(c.reason, /two-equal|defer/i);
});

// ---- ambiguous / adversarial: NEVER fabricate a shape ------------------------------------------

test("classify: opaque number, class general, no two-equal -> ambiguous, needsReasoning, NO fabrication", () => {
  const c = classifyPartFromKernel({ label: "PART 12345", partClass: "general", kernelEnvelopeMm: [40, 30, 10] });
  assert.equal(c.shape, "unknown");
  assert.equal(c.needsReasoning, true);
  assert.equal(c.confidence, "ambiguous");
  assert.deepEqual(c.dims, []); // never invents dims
  assert.match(c.reason, /no round\/prismatic name token/i);
});

test("classify: CONFLICTING signals ('ROUND DIE PLATE') -> ambiguous (deterministically undecidable)", () => {
  const c = classifyPartFromKernel({ label: "ROUND DIE PLATE", partClass: "die", kernelEnvelopeMm: [80, 80, 20] });
  assert.equal(c.shape, "unknown");
  assert.equal(c.needsReasoning, true);
  assert.match(c.reason, /conflicting/i);
});

test("classify: 'casing' class with no name token -> ambiguous (class carries no shape signal)", () => {
  const c = classifyPartFromKernel({ label: "0091", partClass: "casing", kernelEnvelopeMm: [63.88, 50.93, 50.93] });
  assert.equal(c.needsReasoning, true);
});

// ---- fail-loud (units-first) -------------------------------------------------------------------

test("classify: empty / missing label THROWS (a part must be identifiable)", () => {
  assert.throws(() => classifyPartFromKernel({ label: "", kernelEnvelopeMm: [1, 2, 3] }), /non-empty label/);
  assert.throws(() => classifyPartFromKernel({ kernelEnvelopeMm: [1, 2, 3] }), /non-empty label/);
});
test("classify: bbox not length-3 or non-positive THROWS (units-first, no silent coerce)", () => {
  assert.throws(() => classifyPartFromKernel({ label: "x", kernelEnvelopeMm: [1, 2] }), /\[x,y,z\]/);
  assert.throws(() => classifyPartFromKernel({ label: "x", kernelEnvelopeMm: [1, 0, 3] }), /positive finite/);
  assert.throws(() => classifyPartFromKernel({ label: "x", kernelEnvelopeMm: [1, -5, 3] }), /positive finite/);
  assert.throws(() => classifyPartFromKernel({ label: "x", kernelEnvelopeMm: [1, NaN, 3] }), /positive finite/);
});

// ---- decipherKernelPart: wires the full Stage-2 mfg interpretation ------------------------------

test("decipher: prismatic die -> mfg stock grown from bbox + vise workholding", () => {
  const r = decipherKernelPart({ label: "DIE BLOCK 7", partClass: "die", kernelEnvelopeMm: [50.8, 25.4, 12.7] });
  assert.equal(r.mfg.applicable, true);
  assert.equal(r.mfg.process, "mill");
  assert.equal(r.mfg.stock.applicable, true);
  // mill grow = 2*(0.15 finish + 0.85 rough) = 2.0/axis, round up 0.5: 52.8->53, 27.4->27.5, 14.7->15
  assert.deepEqual(r.mfg.stock.stockDims, [53.0, 27.5, 15.0]);
  assert.match(r.mfg.workholding.method, /vise/i);
});

test("decipher: round bushing -> lathe stock + chuck workholding (process routed to lathe)", () => {
  const r = decipherKernelPart({ label: "BRONZE BUSHING", partClass: "bushing", kernelEnvelopeMm: [38.1, 38.1, 60] });
  assert.equal(r.mfg.process, "lathe");
  assert.match(r.mfg.workholding.method, /chuck/i);
  assert.deepEqual(r.mfg.workholding.gripSurfaces, ["OD 38.1 mm"]);
});

test("decipher: ambiguous part -> mfg.applicable false + needsReasoning marker (the Hermes-residual flag)", () => {
  const r = decipherKernelPart({ label: "9999", partClass: "general", kernelEnvelopeMm: [40, 30, 10] });
  assert.equal(r.mfg.applicable, false);
  assert.equal(r.mfg.needsReasoning, true);
});

// ---- runCorpusDecipher: ALL-MEANS-ALL over a ledger, dedup, buckets ----------------------------

function writeLedger(rows) {
  const p = path.join(os.tmpdir(), `kgt-${process.pid}-${rows.length}.jsonl`);
  fs.writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return p;
}

test("runCorpusDecipher: processes EVERY valid row, dedups by label, buckets confidence + residual", () => {
  const ledger = writeLedger([
    { label: "DIE A", partClass: "die", kernelValid: true, kernelEnvelopeMm: [50, 50, 10] },      // square-plate high
    { label: "SHAFT B", partClass: "shaft", kernelValid: true, kernelEnvelopeMm: [20, 20, 100] }, // cylinder high
    { label: "9999", partClass: "general", kernelValid: true, kernelEnvelopeMm: [40, 30, 10] },   // ambiguous
    { label: "DIE A", partClass: "die", kernelValid: true, kernelEnvelopeMm: [50, 50, 10] },      // DUPLICATE -> skipped
    { label: "REJECT", partClass: "die", kernelValid: false, kernelEnvelopeMm: [1, 2, 3] },       // invalid-kernel -> skipped
  ]);
  const s = runCorpusDecipher(ledger);
  fs.unlinkSync(ledger);
  assert.equal(s.total, 5);
  assert.equal(s.considered, 3, "2 unique valid + 1 ambiguous; dup + invalid excluded");
  assert.equal(s.deciphered, 3);
  assert.equal(s.skippedDuplicate, 1);
  assert.equal(s.skippedInvalidKernel, 1);
  assert.equal(s.byConfidence.high, 2);
  assert.equal(s.byConfidence.ambiguous, 1);
  assert.equal(s.residualForHermes, 1);
  assert.equal(s.threwParse, 0);
  assert.equal(s.threwDecipher, 0);
});

test("runCorpusDecipher: bad-bbox vs bad-JSON are counted SEPARATELY, never a silent pass (fail-loud)", () => {
  const ledger = writeLedger([
    { label: "GOOD", partClass: "die", kernelValid: true, kernelEnvelopeMm: [50, 50, 10] },
    { label: "BAD", partClass: "die", kernelValid: true, kernelEnvelopeMm: [50, 0, 10] }, // 0 extent -> throws inside decipher
  ]);
  // inject a corrupt JSON line so the two failure classes are distinguishable
  fs.appendFileSync(ledger, "{not valid json\n");
  const s = runCorpusDecipher(ledger);
  fs.unlinkSync(ledger);
  assert.equal(s.deciphered, 1);
  assert.equal(s.threwDecipher, 1, "the zero-extent part is surfaced as threwDecipher, not deciphered");
  assert.equal(s.threwParse, 1, "the corrupt line is threwParse, distinct from a bad-geometry row");
});

test("runCorpusDecipher: --limit bounds the pass; --out writes one JSON line per deciphered part", () => {
  const ledger = writeLedger([
    { label: "DIE 1", partClass: "die", kernelValid: true, kernelEnvelopeMm: [50, 50, 10] },
    { label: "DIE 2", partClass: "die", kernelValid: true, kernelEnvelopeMm: [60, 40, 12] },
    { label: "DIE 3", partClass: "die", kernelValid: true, kernelEnvelopeMm: [70, 30, 14] },
  ]);
  const out = path.join(os.tmpdir(), `decipher-out-${process.pid}.jsonl`);
  const s = runCorpusDecipher(ledger, { limit: 2, outPath: out });
  const written = fs.readFileSync(out, "utf8").trim().split("\n");
  fs.unlinkSync(ledger); fs.unlinkSync(out);
  assert.equal(s.considered, 2);
  assert.equal(written.length, 2);
  assert.ok(JSON.parse(written[0]).mfg.stock.stockDims.length === 3);
});

// ---- helpers -----------------------------------------------------------------------------------

test("helpers: tokenize splits on non-alnum + uppercases; twoEqual honors the 3% relative tol", () => {
  assert.deepEqual(__test.tokenize("02-TH_0037 die.hex"), ["02", "TH", "0037", "DIE", "HEX"]);
  assert.ok(__test.twoEqual(50, 51));   // 2% < 3%
  assert.ok(!__test.twoEqual(50, 60));  // 20% > 3%
  assert.equal(__test.EQ_REL_TOL, 0.03);
});
