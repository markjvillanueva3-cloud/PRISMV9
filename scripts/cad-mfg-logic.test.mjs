// Tests for cad-mfg-logic.mjs -- Stage-2 CAD manufacturing logic (U-DELTA-CAD-MFG-LOGIC, slot:delta).
// Reference values are hand-computed from the cited machining-practice allowances; failure +
// adversarial modes prove the units-first fail-loud + no-fabrication discipline (R9/R15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStockBody, proposeWorkholding, mfgInterpretation, ROUND_SHAPES, __test } from "./cad-mfg-logic.mjs";

const approx = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} ~= ${b}`);
const plate = (l, w, t) => ({ shape: "square-plate", dims: [
  { type: "linear", nominal: l }, { type: "linear", nominal: w }, { type: "linear", nominal: t },
] });
const disc = (d, t) => ({ shape: "disc", dims: [{ type: "diameter", nominal: d }, { type: "linear", nominal: t }] });

// ---- deriveStockBody (the "add material for finishing operations" half) ----

test("deriveStockBody: mill plate -> finished + 2*(rough+finish)/side, rounded up; finish stock reported", () => {
  const r = deriveStockBody(plate(50.8, 25.4, 12.7)); // 2x1x0.5 in, mill default
  assert.equal(r.applicable, true);
  assert.equal(r.process, "mill");
  // mill: finish 0.15/side + rough 0.85/side = 1.0/side -> grow 2.0/axis
  approx(r.totalAllowancePerSideMm, 1.0);
  // 50.8 + 2.0 = 52.8 -> round up to 0.5 -> 53.0 ; 25.4+2=27.4->27.5 ; 12.7+2=14.7->15.0
  assert.deepEqual(r.stockDims, [53.0, 27.5, 15.0]);
  assert.deepEqual(r.addedPerDimMm, [2.2, 2.1, 2.3]);
  // the finishing component specifically (what the finish pass removes) is 0.15/side for mill profile
  approx(r.finishAllowancePerSideMm.profile, 0.15);
});

test("deriveStockBody: lathe disc uses OD allowance (0.15/side) + lathe roughing (1.0)", () => {
  const r = deriveStockBody(disc(38.1, 6.35), { process: "lathe" });
  assert.equal(r.process, "lathe");
  approx(r.totalAllowancePerSideMm, 1.15); // 0.15 od + 1.0 rough
  // 38.1 + 2.3 = 40.4 -> 40.5 ; 6.35 + 2.3 = 8.65 -> 9.0
  assert.deepEqual(r.stockDims, [9.0, 40.5]); // linears first, then diameters (envelope order)
});

test("deriveStockBody: configurable roughing + round increment honored", () => {
  const r = deriveStockBody(plate(50, 50, 10), { roughingPerSideMm: 0, roundMm: 0.1 });
  // mill finish 0.15/side, rough 0 -> grow 0.3 ; 50+0.3=50.3 (already on 0.1) ; 10+0.3=10.3
  approx(r.totalAllowancePerSideMm, 0.15);
  assert.deepEqual(r.stockDims, [50.3, 50.3, 10.3]);
});

test("deriveStockBody: HOLE/counterbore feature dims are EXCLUDED from the stock envelope (not grown like an OD) -- scrutiny arm B P1", () => {
  const holedPlate = { shape: "square-plate", dims: [
    { type: "linear", nominal: 50.8 }, { type: "linear", nominal: 50.8 }, { type: "linear", nominal: 9.525 },
    { type: "diameter", nominal: 6.35, feature: "hole" },
    { type: "diameter", nominal: 12.7, feature: "counterbore" },
  ] };
  const r = deriveStockBody(holedPlate);
  // ONLY the 3 cube extents grow; the holes are NOT added to / grown in the stock body
  assert.deepEqual(r.stockDims, [53.0, 53.0, 12.0]);
  assert.equal(r.finishedDims.length, 3, "holes excluded from the external envelope");
  // holes surfaced separately, rough UNDERSIZE (rough = nominal - 2*boreFinish, mill bore 0.1/side)
  assert.equal(r.internalFeatures.length, 2);
  const hole = r.internalFeatures.find((f) => f.nominal === 6.35);
  approx(hole.roughBoreNominalMm, 6.15); // 6.35 - 2*0.1
  assert.equal(hole.feature, "hole");
});
test("deriveStockBody: ONLY hole features, no external envelope -> applicable:false (a hole is not a stock body)", () => {
  const r = deriveStockBody({ shape: "unknown", dims: [{ type: "diameter", nominal: 6.35, feature: "hole" }] });
  assert.equal(r.applicable, false);
  assert.match(r.reason, /holes\/bores alone|envelope/i);
});

// ---- failure modes (fail loud, never fabricate) ----

test("deriveStockBody: empty / unparseable dims -> applicable:false, never a fabricated stock", () => {
  const r = deriveStockBody({ shape: "unknown", dims: [] });
  assert.equal(r.applicable, false);
  assert.deepEqual(r.stockDims, []);
  assert.match(r.reason, /envelope|unparseable/i);
});
test("deriveStockBody: a non-positive nominal dim THROWS (units-first, no silent coerce)", () => {
  assert.throws(() => deriveStockBody({ shape: "rect", dims: [{ type: "linear", nominal: 0 }] }), /positive finite/);
  assert.throws(() => deriveStockBody({ shape: "rect", dims: [{ type: "linear", nominal: -5 }] }), /positive finite/);
});
test("deriveStockBody: negative roughing allowance THROWS", () => {
  assert.throws(() => deriveStockBody(plate(50, 50, 10), { roughingPerSideMm: -1 }), />= 0 finite/);
});

// ---- proposeWorkholding (the "add features for clamping or work holding" half) ----

test("proposeWorkholding: prismatic plate -> milling vise on two parallel faces", () => {
  const w = proposeWorkholding(plate(50.8, 50.8, 9.525));
  assert.equal(w.applicable, true);
  assert.match(w.method, /vise/i);
  approx(w.gripDepthMm, 6.35); // min(thickness 9.525, MIN_GRIP 6.35)
  assert.ok(w.addedFeatures.some((f) => /clamping stock/i.test(f)));
  assert.equal(w.warnings.length, 0);
});
test("proposeWorkholding: THIN plate -> fixture/toe-clamps + warning (cannot vise safely)", () => {
  const w = proposeWorkholding(plate(100, 100, 3.0)); // 3 mm < 6.35 grip
  assert.match(w.method, /fixture|toe.?clamp/i);
  assert.ok(w.warnings.some((x) => /thin part/i.test(x)));
  assert.ok(w.addedFeatures.length >= 1);
});
test("proposeWorkholding: round disc -> 3-jaw chuck on OD; short axial warns", () => {
  const w = proposeWorkholding(disc(38.1, 6.35));
  assert.match(w.method, /chuck/i);
  assert.deepEqual(w.gripSurfaces, ["OD 38.1 mm"]);
  assert.ok(w.warnings.some((x) => /grip|short axial/i.test(x)), "6.35 mm long disc -> short chuck grip warning");
});
test("proposeWorkholding: a bored disc chucks on the ENVELOPE OD, never a feature bore -- scrutiny arm B P1", () => {
  const bored = { shape: "disc", dims: [
    { type: "diameter", nominal: 38.1 }, { type: "linear", nominal: 12.7 },
    { type: "diameter", nominal: 20.0, feature: "bore" },
  ] };
  const w = proposeWorkholding(bored);
  assert.deepEqual(w.gripSurfaces, ["OD 38.1 mm"], "grip the OD, not the 20 mm bore");
});
test("proposeWorkholding: long cylinder -> chuck, adequate grip, no warning", () => {
  const w = proposeWorkholding({ shape: "cylinder", dims: [{ type: "diameter", nominal: 19.05 }, { type: "linear", nominal: 76.2 }] });
  assert.match(w.method, /chuck/i);
  approx(w.gripDepthMm, 12.7); // min(76.2*0.25=19.05, MIN_GRIP*2=12.7)
  assert.equal(w.warnings.length, 0);
});
test("proposeWorkholding: UNKNOWN shape -> applicable:false, never fabricates a strategy (soul rule)", () => {
  const w = proposeWorkholding({ shape: "blob", dims: [{ type: "linear", nominal: 10 }] });
  assert.equal(w.applicable, false);
  assert.equal(w.method, "unknown");
  assert.match(w.reason, /not deciphered|defer to Fusion/i);
});

// ---- mfgInterpretation (full Stage-2) + helpers ----

test("ROUND_SHAPES: canonical turned-shape set (chuck on OD) -- consumed by proposeWorkholding + the sweep's mfg-coverage", () => {
  for (const s of ["disc", "cylinder", "cone", "two-body"]) assert.ok(ROUND_SHAPES.has(s), `${s} is a round/turned shape`);
  for (const s of ["cube", "rect", "square-plate", "square-tube", "unknown"]) assert.ok(!ROUND_SHAPES.has(s), `${s} is NOT round`);
  assert.equal(ROUND_SHAPES.size, 4);
});
test("mfgInterpretation: valid decipher -> stock + workholding together; empty -> applicable:false", () => {
  const full = mfgInterpretation(plate(50.8, 25.4, 12.7));
  assert.equal(full.applicable, true);
  assert.equal(full.stock.applicable, true);
  assert.equal(full.workholding.applicable, true);
  assert.equal(mfgInterpretation({ dims: [] }).applicable, false);
  assert.equal(mfgInterpretation(null).applicable, false);
});
test("helpers: roundUpTo never rounds down; envelopeOf splits linear vs diameter; processAllowance maps turning->lathe", () => {
  approx(__test.roundUpTo(52.8, 0.5), 53.0);
  approx(__test.roundUpTo(53.0, 0.5), 53.0); // exact stays put
  const e = __test.envelopeOf([{ type: "linear", nominal: 10 }, { type: "diameter", nominal: 5 }, { type: "radius", nominal: 2 }]);
  assert.deepEqual(e.linears, [10]);
  assert.deepEqual(e.diameters, [5]);
  // a feature diameter routes to features, NOT the external envelope (the P1 fix)
  const e2 = __test.envelopeOf([{ type: "diameter", nominal: 50 }, { type: "diameter", nominal: 6, feature: "hole" }]);
  assert.deepEqual(e2.diameters, [50]);
  assert.equal(e2.features.length, 1);
  assert.equal(__test.processAllowance("turning").key, "lathe");
  assert.equal(__test.processAllowance(undefined).key, "mill");
});
