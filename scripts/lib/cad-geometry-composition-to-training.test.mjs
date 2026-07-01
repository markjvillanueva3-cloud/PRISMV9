// scripts/lib/cad-geometry-composition-to-training.test.mjs
// Tests for U-CAD-GEOM-COMPOSITION: STEP per-class composition -> CAD-gen training pairs.
// Reference values are the REAL die per_class entry (cad-corpus-step-geometry-report.json).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compositionPair, reportToCompositionPairs } from "./cad-geometry-composition-to-training.mjs";

// Real die entry: 75 files, cyl=1711, tor=349, con=758, bspl=2969, complexity {38/24/13}.
const DIE = {
  part_class: "die", files_examined: 75, files_parse_ok: 75,
  total_cylindrical: 1711, total_toroidal: 349, total_conical: 758, total_b_spline: 2969,
  geometry_complexity: { simple: 38, medium: 24, complex: 13 },
};

describe("compositionPair", () => {
  it("HAPPY: die -> per-part averages (1711/75=22.8 cyl, 2969/75=39.6 bspl) + complexity 51/32/17", () => {
    const p = compositionPair(DIE);
    assert.ok(p);
    assert.match(p.instruction, /classified as "die".*from 75 STEP files/);
    assert.match(p.output, /~22\.8 cylindrical/);
    assert.match(p.output, /~4\.7 toroidal/);
    assert.match(p.output, /~10\.1 conical/);
    assert.match(p.output, /~39\.6 B-spline/);
    assert.match(p.output, /51% simple, 32% medium, 17% complex/); // 38/24/13 of 75
  });

  it("complexity clause omitted when the histogram is absent or all-zero", () => {
    const noGc = compositionPair({ ...DIE, geometry_complexity: undefined });
    assert.doesNotMatch(noGc.output, /Complexity distribution/);
    const zeroGc = compositionPair({ ...DIE, geometry_complexity: { simple: 0, medium: 0, complex: 0 } });
    assert.doesNotMatch(zeroGc.output, /Complexity distribution/);
  });

  it("FAILURE: files_parse_ok=0 -> null (no parsed parts = no grounded composition, R12)", () => {
    assert.equal(compositionPair({ ...DIE, files_parse_ok: 0 }), null);
  });
  it("FAILURE: no part_class -> null", () => {
    assert.equal(compositionPair({ ...DIE, part_class: "" }), null);
  });
  it("adversarial: null / non-object -> null (no throw)", () => {
    assert.doesNotThrow(() => {
      assert.equal(compositionPair(null), null);
      assert.equal(compositionPair(42), null);
    });
  });
  it("missing totals default to 0 (never NaN in the output)", () => {
    const sparse = { part_class: "x", files_parse_ok: 4 };
    const p = compositionPair(sparse);
    assert.match(p.output, /~0 cylindrical/);
    assert.doesNotMatch(p.output, /NaN/);
  });
});

describe("reportToCompositionPairs", () => {
  it("converts a per_class report, dedups by instruction, skips no-data classes", () => {
    const report = { per_class: [DIE, { part_class: "empty", files_parse_ok: 0 }, DIE] };
    const pairs = reportToCompositionPairs(report);
    assert.equal(pairs.length, 1); // die once (dedup), empty skipped (0 files)
    assert.match(pairs[0].instruction, /"die"/);
  });
  it("adversarial: malformed report (no per_class) -> []", () => {
    assert.deepEqual(reportToCompositionPairs(null), []);
    assert.deepEqual(reportToCompositionPairs({}), []);
  });
});
