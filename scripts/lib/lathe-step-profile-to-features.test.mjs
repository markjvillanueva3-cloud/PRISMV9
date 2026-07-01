#!/usr/bin/env node
/**
 * Tests for lathe-step-profile-to-features.mjs (KIENZLE G1 STEP closed-loop).
 * Run: node scripts/lib/lathe-step-profile-to-features.test.mjs
 * R9: real reference values + algebraic invariants (units rail, diameter=2r, never-coerce).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { unitScale, profileToTurningFeatures } from "./lathe-step-profile-to-features.mjs";

// ---- unitScale -----------------------------------------------------------
test("unitScale: inch -> 25.4, mm -> 1, else null (refuse to guess)", () => {
  assert.equal(unitScale("inch"), 25.4);
  assert.equal(unitScale("mm"), 1);
  assert.equal(unitScale("m"), null);        // metre is a 1000x risk -> refuse
  assert.equal(unitScale("unknown"), null);
  assert.equal(unitScale(undefined), null);
});

// helper: a constant-radius silhouette (a cylinder) of radius r over z in [0,len]
const cyl = (r, len, n = 6) =>
  Array.from({ length: n }, (_, i) => ({ z: (len * i) / (n - 1), r }));

// ---- happy path: clean mm cylinder --------------------------------------
test("clean mm cylinder -> 1 od_contour, diameter=2r, length=span, oversize bar", () => {
  const out = profileToTurningFeatures({ units: "mm", od_profile: cyl(10, 50) });
  assert.equal(out.ok, true);
  assert.equal(out.scale, 1);
  assert.equal(out.features.length, 1);
  const f = out.features[0];
  assert.equal(f.type, "od_contour");
  assert.equal(f.od_mm, 20);            // 2 * 10
  assert.equal(f.length_mm, 50);
  assert.equal(out.finished_od_mm, 20);
  assert.equal(out.bar_stock_od_mm, 23); // od + 3mm roughing allowance
  assert.ok(out.bar_stock_od_mm > out.finished_od_mm, "bar must be oversize so roughing has stock");
  assert.equal(out.part_length_mm, 50);
});

// ---- units: inch scales by 25.4 -----------------------------------------
test("inch profile scales diameter and length by 25.4", () => {
  const out = profileToTurningFeatures({ units: "inch", od_profile: cyl(0.5, 2) });
  assert.equal(out.ok, true);
  assert.equal(out.scale, 25.4);
  assert.equal(out.features[0].od_mm, 25.4);   // 2 * 0.5 * 25.4
  assert.equal(out.features[0].length_mm, 50.8); // 2 * 25.4
});

// ---- tube: od + id -> two features, bore captured -----------------------
test("tube (od + id) -> od_contour + id_contour with bore diameter", () => {
  const out = profileToTurningFeatures({ units: "mm", od_profile: cyl(10, 40), id_profile: cyl(4, 40) });
  assert.equal(out.ok, true);
  assert.equal(out.features.length, 2);
  const idf = out.features.find((f) => f.type === "id_contour");
  assert.ok(idf, "id_contour present");
  assert.equal(idf.id_mm, 8);     // 2 * 4
  assert.equal(out.bore_id_mm, 8);
});

// ---- units rail: unknown / metre -> refuse (no program from a guessed scale) ----
test("units unknown -> ok:false (25.4x rail, never guess)", () => {
  const out = profileToTurningFeatures({ units: "unknown", od_profile: cyl(10, 50) });
  assert.equal(out.ok, false);
  assert.match(out.reason, /units|rail/i);
});
test("units metre -> ok:false (1000x risk refused)", () => {
  assert.equal(profileToTurningFeatures({ units: "m", od_profile: cyl(10, 50) }).ok, false);
});

// ---- degenerate: <2 finite od points -> not turnable --------------------
test("od_profile with <2 finite points -> ok:false", () => {
  assert.equal(profileToTurningFeatures({ units: "mm", od_profile: [{ z: 0, r: 10 }] }).ok, false);
  assert.equal(profileToTurningFeatures({ units: "mm", od_profile: [] }).ok, false);
});

// ---- never-coerce: NaN/Infinity/r<=0 points are DROPPED, not coerced -----
test("non-finite / non-positive radii are dropped, not coerced", () => {
  const out = profileToTurningFeatures({
    units: "mm",
    od_profile: [
      { z: 0, r: 0 },          // axis end -> dropped
      { z: 10, r: NaN },       // dropped
      { z: 20, r: Infinity },  // dropped
      { z: 30, r: 12 },        // kept
      { z: 40, r: 12 },        // kept
    ],
  });
  assert.equal(out.ok, true);
  assert.equal(out.features[0].profile_points.length, 2); // only the 2 finite positive points
  assert.equal(out.features[0].od_mm, 24);
});

// ---- invariant: profile_points sorted ascending by Z --------------------
test("profile_points are sorted ascending by Z regardless of input order", () => {
  const out = profileToTurningFeatures({
    units: "mm",
    od_profile: [{ z: 50, r: 10 }, { z: 0, r: 10 }, { z: 25, r: 10 }],
  });
  const zs = out.features[0].profile_points.map((p) => p.Z);
  assert.deepEqual(zs, [...zs].sort((a, b) => a - b));
  assert.equal(zs[0], 0);
  assert.equal(zs[zs.length - 1], 50);
});

// ---- adversarial: stepped (multi-diameter) profile keeps max as od_mm ----
test("stepped profile uses MAX diameter as od_mm + bar stock", () => {
  const out = profileToTurningFeatures({
    units: "mm",
    od_profile: [{ z: 0, r: 8 }, { z: 10, r: 8 }, { z: 10, r: 15 }, { z: 30, r: 15 }],
  });
  assert.equal(out.ok, true);
  assert.equal(out.features[0].od_mm, 30); // 2 * 15 (the largest step)
  assert.equal(out.bar_stock_od_mm, 33);
});

// ---- real contract: step-mesh-rotational-profile emits {a, r} (axial=a), null-r bins ----
test("real {a,r} shape (axial key 'a', nullable r) -> features built", () => {
  const out = profileToTurningFeatures({
    units: "mm",
    od_profile: [
      { a: -9.41, r: 6.43 },
      { a: -9.24, r: null },   // empty bin -> dropped, not coerced
      { a: -9.06, r: 6.55 },
      { a: -8.0, r: 7.0 },
      { a: 0, r: 7.69 },       // max radius bin
    ],
  });
  assert.equal(out.ok, true);
  assert.equal(out.features[0].type, "od_contour");
  assert.equal(out.features[0].od_mm, 15.38); // 2 * 7.69
  assert.equal(out.features[0].profile_points.length, 4); // the null-r bin dropped
  // axial span = 0 - (-9.41) = 9.41
  assert.equal(out.part_length_mm, 9.41);
});

// ---- adversarial: null profile object -> graceful ok:false --------------
test("null/empty profile -> ok:false (no throw)", () => {
  assert.equal(profileToTurningFeatures(null).ok, false);
  assert.equal(profileToTurningFeatures({}).ok, false);
});
