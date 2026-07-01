/**
 * holder-geometry.test.mjs — tests for the CAM-agnostic holder collision-profile model.
 * node:test (matches cimco-tmlib.test.mjs). Real-grounded reference values, adversarial
 * inputs, and a REAL round-trip through the shipped cimco-tmlib emitter (proves the
 * holder body emits non-zero, correctly-oriented segments — the P0 the gate caught).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MM_PER_INCH,
  ER_COLLET,
  selectHolder,
  holderProfile,
  shaftProfile,
  defaultProjection,
  normalizeToolMm,
  buildAssembly,
  toCimcoSegments,
} from "../holder-geometry.mjs";
import { holderToXml, buildLibraryXml, parseLibraryXml } from "../cimco-tmlib.mjs";

const round4 = (x) => Number(x.toFixed(4));

// ── selectHolder — smallest ER that grips the shank (DIN 6499 capacities) ──────
test("selectHolder picks smallest ER that grips the shank", () => {
  assert.equal(selectHolder(3.175).id, "ER8");  // 1/8" → ER8 (0.5–5.0)
  assert.equal(selectHolder(6.35).id, "ER11");  // 1/4" → ER11 (0.5–7.0)
  assert.equal(selectHolder(9.525).id, "ER16"); // 3/8" → ER16 (1.0–10.0)
  assert.equal(selectHolder(12.7).id, "ER20");  // 1/2" → ER20 (1.0–13.0)
  assert.equal(selectHolder(25.0).id, "ER40");  // ~1"  → ER40 (3.0–26.0)
  assert.equal(selectHolder(30.0).id, "ER50");  // → ER50 (6.0–34.0), within capacity
});

test("selectHolder flags oversize only beyond ER50 capacity (34 mm)", () => {
  assert.equal(selectHolder(30).oversize, false); // within ER50
  const h = selectHolder(40);
  assert.equal(h.id, "ER50");
  assert.equal(h.oversize, true);
});

test("selectHolder falls back to ER8 below smallest grip and never throws on tiny", () => {
  const h = selectHolder(0.2);
  assert.equal(h.id, "ER8");
  assert.equal(h.oversize, false);
});

test("selectHolder honors explicit holderId override", () => {
  assert.equal(selectHolder(99, { holderId: "ER25" }).id, "ER25");
});

test("selectHolder throws on non-finite / non-positive shank (fail-loud, no guess)", () => {
  assert.throws(() => selectHolder(NaN));
  assert.throws(() => selectHolder(Infinity));
  assert.throws(() => selectHolder(0));
  assert.throws(() => selectHolder(-5));
  assert.throws(() => selectHolder("5"));
});

// ── holderProfile — conservative full-OD stepped cylinder, tip→spindle ─────────
test("holderProfile builds conservative full-OD nut+body cylinders", () => {
  const h = selectHolder(12.7); // ER20: nutDia 34, nutLen 24, bodyDia 42, bodyLen 38
  const p = holderProfile(h);
  assert.equal(p.segments.length, 2);
  // nut: full-OD straight cylinder (no optimistic chamfer — fail-safe)
  assert.deepEqual(p.segments[0], { lowerDia: 34, upperDia: 34, height: 24 });
  // body: straight cylinder behind the nut
  assert.deepEqual(p.segments[1], { lowerDia: 42, upperDia: 42, height: 38 });
  assert.equal(p.length, 62);   // 24 + 38
  assert.equal(p.noseDia, 34);  // nose at full nut OD (conservative)
});

test("holderProfile segment heights/diameters are all positive (valid collision body)", () => {
  for (const id of Object.keys(ER_COLLET)) {
    const p = holderProfile(selectHolder(ER_COLLET[id].clampMax, { holderId: id }));
    for (const s of p.segments) {
      assert.ok(s.height > 0, `${id} segment height must be > 0`);
      assert.ok(s.lowerDia > 0 && s.upperDia > 0, `${id} diameters must be > 0`);
    }
  }
});

test("holderProfile throws on malformed holder", () => {
  assert.throws(() => holderProfile({}));
  assert.throws(() => holderProfile({ nutDia: NaN, bodyDia: 30 }));
});

// ── toCimcoSegments — VERIFIED adapter: non-zero, spindle→tip, Upper=spindle ───
test("toCimcoSegments reverses tip→spindle to CIMCO spindle→tip and renames fields", () => {
  const profile = holderProfile(selectHolder(12.7)); // ER20 [nut34, body42] tip→spindle
  const segs = toCimcoSegments(profile);
  // CIMCO order = spindle→tip: body (42, wider, at spindle) first, then nut (34, toward tip)
  assert.deepEqual(segs[0], { upper: 42, lower: 42, length: 38 });
  assert.deepEqual(segs[1], { upper: 34, lower: 34, length: 24 });
});

test("toCimcoSegments round-trips through the SHIPPED cimco-tmlib emitter as NON-ZERO holder", () => {
  // This is the regression-lock for the P0 the per-file gate caught: passing the raw
  // {lowerDia,upperDia,height} profile straight into holderToXml emitted Upper/Lower/
  // Length="0" → zero-size false-safe holder. The adapter must emit real geometry.
  const profile = holderProfile(selectHolder(12.7));
  const xml = holderToXml(
    { type: "MillingHolder", description: "ER20 Collet Chuck", segments: toCimcoSegments(profile), unitSystem: "Metric" },
    { unitSystem: "Metric" }
  );
  const parsed = parseLibraryXml(buildLibraryXml([xml]));
  assert.equal(parsed.holders.length, 1);
  const segs = parsed.holders[0].segments;
  assert.equal(segs.length, 2);
  // NON-ZERO (the bug was all-zero) and correctly oriented (spindle/body 42 first)
  assert.equal(segs[0].upper, 42);
  assert.equal(segs[0].length, 38);
  assert.equal(segs[1].upper, 34);
  for (const s of segs) {
    assert.ok(s.upper > 0 && s.lower > 0 && s.length > 0, "every emitted segment must be non-zero");
  }
});

test("toCimcoSegments throws on a non-profile input (fail-loud)", () => {
  assert.throws(() => toCimcoSegments(null));
  assert.throws(() => toCimcoSegments({}));
});

// ── normalizeToolMm — UNITS-FIRST inch↔mm + defaults + oalDefaulted flag ───────
test("MM_PER_INCH is the canonical inch→mm factor", () => {
  assert.equal(MM_PER_INCH, 25.4);
});

test("normalizeToolMm converts INCH-native records (the 25.4× rail)", () => {
  const rec = { id: "harvey_843_0015_0023_2fl", name: "0.015\" 2FL", type: "endmill_square",
    diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, shank: 0.125 };
  const n = normalizeToolMm(rec, { nativeUnit: "inch" });
  assert.equal(n.diameter_mm, round4(0.015 * MM_PER_INCH)); // 0.381
  assert.equal(n.shankDia_mm, round4(0.125 * MM_PER_INCH)); // 3.175
  assert.equal(n.fluteLen_mm, round4(0.023 * MM_PER_INCH)); // 0.5842
  assert.equal(n.oal_mm, round4(1.5 * MM_PER_INCH));        // 38.1
  assert.equal(n.flutes, 2);
  assert.equal(n.oalDefaulted, false); // OAL was supplied
});

test("normalizeToolMm passes mm-native records through unscaled", () => {
  const n = normalizeToolMm({ diameter: 10, shank: 10, loc: 30, oal: 80, flutes: 4 }, { nativeUnit: "mm" });
  assert.equal(n.diameter_mm, 10);
  assert.equal(n.oal_mm, 80);
  assert.equal(n.oalDefaulted, false);
});

test("normalizeToolMm flags fabricated OAL (oalDefaulted) when absent", () => {
  const n = normalizeToolMm({ diameter: 10 }, { nativeUnit: "mm" });
  assert.equal(n.fluteLen_mm, 30); // 3× dia
  assert.ok(n.oal_mm > n.fluteLen_mm, "OAL must exceed flute length");
  assert.equal(n.oalDefaulted, true); // fabricated → flagged for exporters
});

test("normalizeToolMm returns null on no usable diameter (never fabricates)", () => {
  assert.equal(normalizeToolMm({ name: "x" }), null);
  assert.equal(normalizeToolMm({ diameter: 0 }), null);
  assert.equal(normalizeToolMm({ diameter: -3 }), null);
  assert.equal(normalizeToolMm({ diameter: NaN }), null);
  assert.equal(normalizeToolMm(null), null);
  assert.equal(normalizeToolMm("nope"), null);
});

// ── shaftProfile — exposed tool body above the flutes ─────────────────────────
test("shaftProfile models the shank above the flutes when stickout exceeds flute length", () => {
  const segs = shaftProfile({ diameter_mm: 6, shankDia_mm: 6, fluteLen_mm: 20, oal_mm: 60 }, 40);
  assert.equal(segs.length, 1);
  assert.deepEqual(segs[0], { lowerDia: 6, upperDia: 6, height: 20 });
});

test("shaftProfile is empty when the holder sits at the flute top (stickout ≤ flute)", () => {
  assert.equal(shaftProfile({ diameter_mm: 6, shankDia_mm: 6, fluteLen_mm: 20, oal_mm: 60 }, 20).length, 0);
});

// ── defaultProjection — conservative, never above OAL ─────────────────────────
test("defaultProjection = min(flute + 2·dia, OAL) and never exceeds OAL", () => {
  assert.equal(defaultProjection({ diameter_mm: 10, fluteLen_mm: 30, oal_mm: 80 }), 50); // 30+20
  assert.equal(defaultProjection({ diameter_mm: 10, fluteLen_mm: 30, oal_mm: 40 }), 40); // clamp to OAL
  const p = defaultProjection({ diameter_mm: 0.381, fluteLen_mm: 0.5842, oal_mm: 38.1 });
  assert.ok(p >= 0.5842 && p <= 38.1, "clears flutes, never exceeds OAL");
});

// ── buildAssembly — the canonical CAM collision assembly ───────────────────────
test("buildAssembly produces a complete tool+holder collision assembly (inch corpus)", () => {
  const rec = { id: "harvey_843_0015_0023_2fl", name: "0.015\" 2FL Square EM", type: "endmill_square",
    diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, shank: 0.125 };
  const a = buildAssembly(rec, { nativeUnit: "inch" });
  assert.ok(a);
  assert.equal(a.holder.id, "ER8"); // 3.175 mm shank
  assert.equal(a.holder.profile.segments.length, 2);
  assert.equal(a.oalDefaulted, false);
  assert.equal(a.gaugeLengthMm, round4(a.projectionMm + a.holder.profile.length));
  assert.ok(a.gaugeLengthMm > a.projectionMm, "gauge length includes the holder body");
});

test("buildAssembly clamps a too-long projection override to the tool OAL (fail-safe)", () => {
  const a = buildAssembly({ diameter: 10, shank: 10, loc: 30, oal: 120 }, { nativeUnit: "mm", projectionMm: 200 });
  assert.equal(a.projectionMm, 120); // clamped to OAL — can't model a non-existent over-long body
});

test("buildAssembly honors a valid (within-OAL) projection override", () => {
  const a = buildAssembly({ diameter: 10, shank: 10, loc: 30, oal: 120 }, { nativeUnit: "mm", projectionMm: 60 });
  assert.equal(a.projectionMm, 60);
});

test("buildAssembly returns null for un-normalizable tools", () => {
  assert.equal(buildAssembly({ name: "no-dia" }), null);
});
