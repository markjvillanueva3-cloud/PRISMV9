#!/usr/bin/env node
/**
 * Tests for step-mesh-rotational-profile.mjs -- slot:whiskey [KIENZLE G1 keystone]
 * Run: node scripts/lib/step-mesh-rotational-profile.test.mjs
 * R9: real-value asserts on synthetic meshes with KNOWN geometry (no GPU/STEP needed).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toTriples, boundingBox, radialProfile, meshToRotationalProfile, selectBestBodyProfile,
} from "./step-mesh-rotational-profile.mjs";

// --- synthetic-mesh generators (surface vertices on a body of revolution) ----
const TAU = Math.PI * 2;
/** Place a point on `axis` at axial coord `a`, perpendicular radius `r`, angle `th`. */
function pt(axis, a, r, th) {
  const c = Math.cos(th) * r, s = Math.sin(th) * r;
  return axis === "x" ? [a, c, s] : axis === "y" ? [c, a, s] : [c, s, a];
}
/** Cylindrical surface (radius R) from aMin..aMax along `axis`, optional flat end caps.
 * levelStep 0.25 keeps the mesh dense (real occt tessellations are dense; a sparse z-grid
 * vs the 1.0-wide profile bins would alternate which surface lands in each bin). */
function cyl(R, aMin, aMax, axis = "z", { nTheta = 48, levelStep = 0.25, capped = false, capRings = 6 } = {}) {
  const out = [];
  const nLevels = Math.max(8, Math.ceil((aMax - aMin) / levelStep));
  for (let i = 0; i <= nLevels; i++) {
    const a = aMin + (i / nLevels) * (aMax - aMin);
    for (let j = 0; j < nTheta; j++) out.push(pt(axis, a, R, (j / nTheta) * TAU));
  }
  if (capped) for (const a of [aMin, aMax]) for (let ring = 0; ring <= capRings; ring++) {
    const r = (ring / capRings) * R;
    for (let j = 0; j < nTheta; j++) out.push(pt(axis, a, r, (j / nTheta) * TAU));
  }
  return out;
}
function flatten(triples) { const o = []; for (const t of triples) o.push(t[0], t[1], t[2]); return o; }
/** Square-cross-section prism shell along z (a non-axisymmetric "fixture" body). */
function boxBody(half = 10, len = 48) {
  const out = [];
  for (let zi = 0; zi <= 192; zi++) { const z = (zi / 192) * len;
    for (let e = 0; e < 40; e++) { const u = -half + (e / 39) * 2 * half;
      out.push([u, half, z], [u, -half, z], [half, u, z], [-half, u, z]); } }
  return out;
}
const odBinNear = (prof, a) => prof.od_profile.reduce((best, q) => (q.r != null && Math.abs(q.a - a) < Math.abs((best?.a ?? 1e9) - a) ? q : best), null);

test("toTriples: flat array, object array, and empty/null", () => {
  assert.deepEqual(toTriples([1, 2, 3, 4, 5, 6]), [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(toTriples([{ x: 1, y: 2, z: 3 }]), [[1, 2, 3]]);
  assert.deepEqual(toTriples([]), []);
  assert.deepEqual(toTriples(null), []);
});

test("boundingBox: known extents + center", () => {
  const bb = boundingBox([[-1, -2, -3], [1, 2, 3]]);
  assert.deepEqual(bb.min, [-1, -2, -3]);
  assert.deepEqual(bb.max, [1, 2, 3]);
  assert.deepEqual(bb.center, [0, 0, 0]);
  assert.deepEqual(bb.size, [2, 4, 6]);
});

test("solid capped cylinder (R=10, L=50, z-axis): correct OD, NO false bore from end caps", () => {
  const m = meshToRotationalProfile(flatten(cyl(10, 0, 50, "z", { capped: true })));
  assert.equal(m.revolution_axis, "z");
  assert.ok(Math.abs(m.max_od_diameter - 20) < 1, `OD ~20, got ${m.max_od_diameter}`);
  assert.ok(Math.abs(m.axis_length - 50) < 1, `len ~50, got ${m.axis_length}`);
  assert.equal(m.has_bore, false, "end-cap disks must NOT be read as a bore (contiguity filter)");
  assert.ok(m.symmetry_score < 0.05, `clean body of revolution, got ${m.symmetry_score}`);
  assert.equal(m.suspect, false, "a centered clean cylinder is NOT suspect");
});

test("tube (Router=10, Rinner=5, z-axis): bore detected with correct ID diameter", () => {
  const m = meshToRotationalProfile(flatten([...cyl(10, 0, 50, "z"), ...cyl(5, 0, 50, "z")]));
  assert.equal(m.has_bore, true);
  assert.ok(Math.abs(m.max_od_diameter - 20) < 1, `OD ~20, got ${m.max_od_diameter}`);
  assert.ok(Math.abs(m.min_id_diameter - 10) < 2, `ID ~10, got ${m.min_id_diameter}`);
});

test("revolution axis detected when cylinder lies along X (not the default Z)", () => {
  const m = meshToRotationalProfile(flatten(cyl(8, -20, 20, "x")));
  assert.equal(m.revolution_axis, "x");
  assert.ok(Math.abs(m.max_od_diameter - 16) < 1, `OD ~16, got ${m.max_od_diameter}`);
});

test("stepped shaft (R=10 for a<25, R=6 for a>=25): od_profile follows the step", () => {
  const big = cyl(10, 0, 25, "z", { capped: false });
  const small = cyl(6, 25, 50, "z", { capped: false });
  const m = meshToRotationalProfile(flatten([...big, ...small]));
  const lo = odBinNear(m, 10), hi = odBinNear(m, 40);
  assert.ok(Math.abs(lo.r - 10) < 1.5, `near a=10 OD radius ~10, got ${lo.r}`);
  assert.ok(Math.abs(hi.r - 6) < 1.5, `near a=40 OD radius ~6, got ${hi.r}`);
  assert.ok(Math.abs(m.max_od_diameter - 20) < 1.5);
});

test("adversarial: empty mesh throws (fail loud, not a silent null profile)", () => {
  assert.throws(() => meshToRotationalProfile([]), /no vertices/);
  assert.throws(() => meshToRotationalProfile({ vertices: [] }), /no vertices/);
});

test("adversarial: a non-symmetric box scores WORSE than a clean cylinder (suspect flag)", () => {
  // square-cross-section prism along z (side 20): corners r=sqrt(200)~14.1, faces r=10
  const box = [];
  for (let zi = 0; zi <= 192; zi++) { const z = zi * 0.25;   // dense z (0..48)
    for (let e = 0; e < 40; e++) { const u = -10 + (e / 39) * 20;
      box.push([u, 10, z], [u, -10, z], [10, u, z], [-10, u, z]); } }
  const cylM = meshToRotationalProfile(flatten(cyl(10, 0, 48, "z")));
  const boxM = meshToRotationalProfile(flatten(box));
  assert.ok(cylM.symmetry_score < boxM.symmetry_score, `cyl ${cylM.symmetry_score} should be < box ${boxM.symmetry_score}`);
  assert.ok(boxM.symmetry_score > 0.03, `box not perfectly symmetric, got ${boxM.symmetry_score}`);
  assert.equal(boxM.suspect, true, "a non-axisymmetric box must be flagged suspect (not a clean turned solid)");
});

test("off-center feature: centroid (not bbox-center) keeps the revolution axis = z + flags suspect", () => {
  // clean cylinder centered at origin + a radial boss in +x at mid-length -> bbox center shifts off
  // the true axis; the centroid (dominated by the symmetric cylinder) stays near it.
  const base = cyl(10, 0, 50, "z");
  const boss = [];
  for (let zi = 0; zi <= 40; zi++) { const z = 20 + zi * 0.25;
    for (let rr = 10; rr <= 28; rr += 0.5) boss.push([rr, 0, z]); }
  const m = meshToRotationalProfile(flatten([...base, ...boss]));
  assert.equal(m.revolution_axis, "z", "centroid keeps the dominant cylinder axis (bbox center could flip it to x)");
  assert.equal(m.suspect, true, "an off-center boss => not a clean body of revolution");
  assert.ok(Math.abs(m.axis_center[0]) < 9, `centroid x pulled toward the axis, got ${m.axis_center[0]} (bbox center x ~9)`);
});

test("non-finite vertices are REJECTED (no crash, no fake on-axis point coerced from NaN)", () => {
  const good = flatten(cyl(10, 0, 50, "z"));
  const withBad = [...good, NaN, NaN, NaN, Infinity, 0, 0, 1, NaN, 2];  // 3 bad triples appended
  const m = meshToRotationalProfile(withBad);
  assert.equal(m.vertex_count, good.length / 3, "bad triples dropped, not coerced");
  assert.ok(Math.abs(m.max_od_diameter - 20) < 1, `still correct OD, got ${m.max_od_diameter}`);
});

test("selectBestBodyProfile: picks the clean turned body out of a multi-body set (part + fixture box)", () => {
  const part = flatten(cyl(8, 0, 60, "z"));      // clean turned part
  const fixture = flatten(boxBody(12, 40));       // non-axisymmetric fixture body
  const r = selectBestBodyProfile([part, fixture]);
  assert.equal(r.suspect, false, "the clean cylinder body is selected, not the combined/box");
  assert.ok(Math.abs(r.max_od_diameter - 16) < 1.5, `part OD ~16, got ${r.max_od_diameter}`);
  assert.notEqual(r.body_index, -1, "picked a single clean body, not the combined-all");
  assert.ok(r.candidates_evaluated >= 2 && Array.isArray(r.body_candidates));
  assert.equal(r.pick_ambiguous, false, "one clean body + a suspect fixture -> unambiguous");
});

test("selectBestBodyProfile: single body -> candidates_evaluated 1 (no combined double-count)", () => {
  const r = selectBestBodyProfile([flatten(cyl(7, 0, 40, "z"))]);
  assert.equal(r.candidates_evaluated, 1, "one body, NOT double-counted as the combined");
  assert.equal(r.body_index, 0);
  assert.equal(r.suspect, false);
  assert.equal(r.pick_ambiguous, false);
});

test("selectBestBodyProfile: two comparably-large clean bodies -> pick_ambiguous=true (part vs fixture)", () => {
  const r = selectBestBodyProfile([flatten(cyl(10, 0, 50, "z")), flatten(cyl(9, 0, 48, "z"))]);
  assert.equal(r.suspect, false);
  assert.equal(r.pick_ambiguous, true, "two similar clean bodies -> size alone can't pick the part");
});

test("selectBestBodyProfile: no clean body (two fixtures) -> least-bad, stays suspect (honest)", () => {
  const r = selectBestBodyProfile([flatten(boxBody(10, 40)), flatten(boxBody(8, 30))]);
  assert.equal(r.suspect, true, "no clean body of revolution -> must NOT pass a fixture off as the part");
});

test("selectBestBodyProfile: empty/null input throws (fail loud)", () => {
  assert.throws(() => selectBestBodyProfile([]), /no mesh data/);
  assert.throws(() => selectBestBodyProfile(null), /no mesh data/);
});

test("radialProfile: bored length contiguous -> kept; isolated inner bin -> dropped", () => {
  // outer cylinder full length + inner wall only across the MIDDLE (contiguous run)
  const verts = [...cyl(10, 0, 50, "z"), ...cyl(4, 15, 35, "z")];
  const triples = toTriples(flatten(verts));
  const bb = boundingBox(triples);
  const { id } = radialProfile(triples, 2, bb, { bins: 50 });
  const bored = id.filter((q) => q.r != null);
  assert.ok(bored.length >= 3, `bore run kept, got ${bored.length} bins`);
  for (const q of bored) assert.ok(q.a > 10 && q.a < 40, `bore bins inside the middle, got a=${q.a}`);
});
