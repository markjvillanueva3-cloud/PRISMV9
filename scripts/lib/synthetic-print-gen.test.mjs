// scripts/lib/synthetic-print-gen.test.mjs
// Tests for the synthetic dimensioned-drawing generator (U-PSGB-XRAY-CLOSED-LOOP).
// Invokes the python generator and validates the PNG + ground-truth sidecar.
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scoreDimensionSet } from "./dimension-set-score.mjs";

const LENGTH_TYPES = ["linear", "diameter", "radius", "chamfer"]; // graded by nominal_mm
const ALL_DIM_TYPES = [...LENGTH_TYPES, "angular"];                // angular = degrees (nominal_deg)

const PY = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const GEN = new URL("./synthetic-print-gen.py", import.meta.url).pathname.replace(/^\//, "");
const MM_PER_IN = 25.4;

function gen(seed, difficulty = "easy") {
  const png = join(tmpdir(), `syn-test-${seed}-${Date.now()}.png`);
  const r = spawnSync(PY, [GEN, "--out", png, "--seed", String(seed), "--units", "in", "--difficulty", difficulty], { encoding: "utf8", timeout: 60000 });
  const truthPath = png + ".truth.json";
  const truth = existsSync(truthPath) ? JSON.parse(readFileSync(truthPath, "utf8")) : null;
  return { png, status: r.status, stderr: r.stderr, truth, cleanup: () => { try { unlinkSync(png); unlinkSync(truthPath); } catch { /* ignore */ } } };
}

test("generates a valid PNG + truth sidecar", () => {
  const g = gen(42);
  try {
    assert.equal(g.status, 0, "gen exit 0; stderr=" + (g.stderr || "").slice(0, 200));
    assert.ok(existsSync(g.png), "PNG written");
    assert.ok(statSync(g.png).size > 2000, "PNG is non-trivial");
    assert.ok(g.truth, "truth sidecar written");
  } finally { g.cleanup(); }
});

test("truth dims span all types; LENGTH dims are positive mm, ANGULAR is degrees (not mm)", () => {
  const g = gen(7);
  try {
    assert.ok(Array.isArray(g.truth.dimensions) && g.truth.dimensions.length >= 5, "linear×2 + diameter + radius + chamfer + angular");
    assert.equal(g.truth.n_dims, g.truth.dimensions.length);
    const seen = new Set();
    for (const d of g.truth.dimensions) {
      assert.ok(ALL_DIM_TYPES.includes(d.type), "valid dim type: " + d.type);
      seen.add(d.type);
      if (d.type === "angular") {
        // angular is DEGREES — must NOT carry a length mm value (the units-confusion guard)
        assert.equal(d.nominal_mm, null, "angular nominal_mm is null (it is degrees, not a length)");
        assert.ok(Number.isFinite(d.nominal_deg) && d.nominal_deg > 0 && d.nominal_deg <= 360, "angular degrees: " + d.nominal_deg);
      } else {
        assert.ok(Number.isFinite(d.nominal_mm) && d.nominal_mm > 0, `${d.type} finite positive mm: ` + d.nominal_mm);
      }
    }
    // every type the generator promises is actually emitted
    for (const t of ["linear", "diameter", "radius", "chamfer", "angular"]) assert.ok(seen.has(t), "emits " + t);
    // n_length_dims excludes angular
    assert.equal(g.truth.n_length_dims, g.truth.dimensions.filter((d) => d.nominal_mm != null).length);
    // GD&T present + structurally valid (tolerance is a length, datum refs tied)
    assert.ok(Array.isArray(g.truth.gdt) && g.truth.gdt.length >= 1, "gdt FCF present");
    const fcf = g.truth.gdt[0];
    assert.ok(fcf.symbol && Number.isFinite(fcf.tolerance_mm) && fcf.tolerance_mm > 0, "FCF symbol + length tolerance");
    assert.ok(Array.isArray(fcf.datum_refs) && fcf.datum_refs.length >= 1, "FCF tied to ≥1 datum");
    assert.equal(g.truth.units, "in");
    assert.ok(g.truth.title_block.part_number && g.truth.title_block.material, "title block populated");
  } finally { g.cleanup(); }
});

test("type-aware scorer EXERCISE: length dims self-score perfect; a radius never cross-matches a linear of equal mm", () => {
  const g = gen(7);
  try {
    // self-score the LENGTH dims (angular dropped by the length scorer) → perfect recovery, type-aware
    const lengthDims = g.truth.dimensions.filter((d) => d.nominal_mm != null);
    const self = scoreDimensionSet(lengthDims, lengthDims);
    assert.equal(self.matched, lengthDims.length, "every length dim matches itself");
    assert.equal(self.recall, 1); assert.equal(self.type_aware, true);
    // cross-type guard using a REAL generated value: a radius must NOT match a linear of equal magnitude
    const radius = lengthDims.find((d) => d.type === "radius");
    assert.ok(radius, "radius present");
    const cross = scoreDimensionSet([{ type: "linear", nominal_mm: radius.nominal_mm }], [{ type: "radius", nominal_mm: radius.nominal_mm }]);
    assert.equal(cross.matched, 0, "type-aware: linear≠radius even at identical mm");
  } finally { g.cleanup(); }
});

test("deterministic: same seed → identical truth", () => {
  const a = gen(123), b = gen(123);
  try {
    assert.deepEqual(a.truth.dimensions, b.truth.dimensions);
    assert.equal(a.truth.title_block.part_number, b.truth.title_block.part_number);
  } finally { a.cleanup(); b.cleanup(); }
});

test("different seeds → different drawings (not a constant)", () => {
  const a = gen(1), b = gen(999);
  try {
    const sameDims = JSON.stringify(a.truth.dimensions) === JSON.stringify(b.truth.dimensions);
    assert.ok(!sameDims, "distinct seeds should yield distinct dimension sets");
  } finally { a.cleanup(); b.cleanup(); }
});

test("hard mode: valid degraded print, truth records nominal ONLY (tolerance is a distractor), key-parity with easy", () => {
  const h = gen(4242, "hard"), e = gen(4242, "easy");
  try {
    assert.equal(h.status, 0, "hard gen exit 0; stderr=" + (h.stderr || "").slice(0, 200));
    assert.equal(h.truth.difficulty, "hard");
    assert.ok(statSync(h.png).size > 2000, "degraded PNG still non-trivial");
    // per-type dim key shape — length dims {type,nominal_mm}; angular {type,nominal_deg,nominal_mm}.
    // The rendered ±tolerance / 45° are distractors, NOT scored fields.
    for (const d of h.truth.dimensions) {
      if (d.type === "angular") {
        assert.deepEqual(Object.keys(d).sort(), ["nominal_deg", "nominal_mm", "type"]);
        assert.equal(d.nominal_mm, null);
      } else {
        assert.deepEqual(Object.keys(d).sort(), ["nominal_mm", "type"]);
        assert.ok(Number.isFinite(d.nominal_mm) && d.nominal_mm > 0);
      }
    }
    // schema key-parity: hard truth has the same top-level keys as easy (+ no extras that break consumers)
    assert.deepEqual(Object.keys(h.truth).sort(), Object.keys(e.truth).sort());
  } finally { h.cleanup(); e.cleanup(); }
});
test("LENGTH dimension values are in plausible engineering range (0.1mm–250mm), inch-derived", () => {
  const g = gen(55);
  try {
    for (const d of g.truth.dimensions) {
      if (d.nominal_mm == null) continue; // angular (degrees) is not a length
      assert.ok(d.nominal_mm >= 0.1 && d.nominal_mm <= 250, "mm in range: " + d.nominal_mm);
      // inch round-trip sanity: mm/25.4 within float tolerance of a 3-decimal inch value
      const inch = d.nominal_mm / MM_PER_IN;
      assert.ok(Math.abs(inch * MM_PER_IN - d.nominal_mm) < 1e-6, "mm is inch*25.4");
    }
  } finally { g.cleanup(); }
});
