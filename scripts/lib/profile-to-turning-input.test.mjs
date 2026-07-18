#!/usr/bin/env node
/**
 * Tests for profile-to-turning-input.mjs -- slot:whiskey [KIENZLE G1].
 * Run: node scripts/lib/profile-to-turning-input.test.mjs
 * R9: real-value asserts on the geometry->TurningInput contract mapping.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { profileToTurningInput } from "./profile-to-turning-input.mjs";

// A clean OD-only rotational profile (cylinder R=10, L=50, mm), shaped like
// selectBestBodyProfile/meshToRotationalProfile output.
function cleanProfile(over = {}) {
  return {
    revolution_axis: "z", symmetry_score: 0.01, suspect: false, pick_ambiguous: false,
    axis_center: [0, 0, 0], axis_length: 50, max_od_diameter: 20, min_id_diameter: null,
    has_bore: false, vertex_count: 1000, units: "mm",
    od_profile: [{ a: 0.5, r: 10 }, { a: 25, r: 10 }, { a: 49.5, r: 10 }],
    id_profile: [{ a: 0.5, r: null }, { a: 49.5, r: null }],
    ...over,
  };
}

test("clean OD-only profile (mm) -> valid TurningInput with od_contour + profile_points", () => {
  const r = profileToTurningInput(cleanProfile());
  assert.equal(r.ok, true);
  assert.equal(r.units_resolved, "mm");
  const ti = r.turning_input;
  assert.equal(ti.part_length_mm, 50);
  assert.equal(ti.finished_od_mm, 20);
  assert.equal(ti.bar_stock_od_mm, 22, "bar stock = OD + 2mm margin");
  assert.equal(ti.material.iso_group, "P");
  assert.equal(r.material_assumed, true, "no material given -> default flagged");
  assert.equal(ti.features.length, 1);
  const f = ti.features[0];
  assert.equal(f.type, "od_contour");
  assert.equal(f.od_mm, 20);
  assert.equal(f.length_mm, 50);
  assert.equal(f.profile_points.length, 3);
  assert.deepEqual(f.profile_points[0], { X: 20, Z: 0, type: "linear" });   // r10->dia20, a0.5-aMin0.5 -> Z0
  assert.deepEqual(f.profile_points[2], { X: 20, Z: 49, type: "linear" });
});

test("bored profile -> adds id_contour feature with id_mm", () => {
  const r = profileToTurningInput(cleanProfile({
    has_bore: true, min_id_diameter: 8,
    id_profile: [{ a: 0.5, r: 4 }, { a: 49.5, r: 4 }],
  }));
  assert.equal(r.ok, true);
  assert.equal(r.turning_input.features.length, 2);
  const bore = r.turning_input.features[1];
  assert.equal(bore.type, "id_contour");
  assert.equal(bore.id_mm, 8);
  assert.deepEqual(bore.profile_points[0], { X: 8, Z: 0, type: "linear" });   // r4 -> dia8
});

test("inch units are converted to mm (units-first, never left in inch)", () => {
  const r = profileToTurningInput(cleanProfile({
    units: "inch", max_od_diameter: 1, axis_length: 2,
    od_profile: [{ a: 0, r: 0.5 }, { a: 2, r: 0.5 }],
  }));
  assert.equal(r.ok, true);
  assert.equal(r.units_resolved, "inch");
  assert.equal(r.turning_input.part_length_mm, 50.8, "2in -> 50.8mm");
  assert.equal(r.turning_input.finished_od_mm, 25.4, "1in dia -> 25.4mm");
  assert.equal(r.turning_input.features[0].profile_points[0].X, 25.4, "r0.5in -> dia 25.4mm");
});

test("suspect profile is REFUSED (loop must only score clean geometry)", () => {
  const r = profileToTurningInput(cleanProfile({ suspect: true }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "suspect-profile-skipped");
});

test("pick_ambiguous profile is REFUSED", () => {
  const r = profileToTurningInput(cleanProfile({ pick_ambiguous: true }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "ambiguous-body-skipped");
});

test("unknown units are REFUSED, never guessed (units-first 25.4x rail)", () => {
  const r = profileToTurningInput(cleanProfile({ units: "unknown" }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /units-unknown-refused/);
});

test("explicit material -> not flagged assumed; bad iso_group falls back to P", () => {
  const r = profileToTurningInput(cleanProfile(), { materialName: "4140 Steel", isoGroup: "ZZ" });
  assert.equal(r.material_assumed, false);
  assert.equal(r.turning_input.material.material_name, "4140 Steel");
  assert.equal(r.turning_input.material.iso_group, "P", "invalid iso_group -> P");
});

test("adversarial: no usable OD / no length / null profile -> throws (fail loud)", () => {
  assert.throws(() => profileToTurningInput(cleanProfile({ max_od_diameter: null })), /max_od_diameter/);
  assert.throws(() => profileToTurningInput(cleanProfile({ max_od_diameter: NaN })), /max_od_diameter/);
  assert.throws(() => profileToTurningInput(cleanProfile({ axis_length: 0 })), /axis_length/);
  assert.throws(() => profileToTurningInput(null), /no profile/);
});
