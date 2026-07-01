// scripts/build-cad-geometry-composition-dataset.test.mjs
// Tests for the U-CAD-GEOM-COMPOSITION builder.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDataset, DEFAULT_REPORT } from "./build-cad-geometry-composition-dataset.mjs";

const FAKE_REPORT = JSON.stringify({
  per_class: [
    { part_class: "die", files_parse_ok: 75, total_cylindrical: 1711, total_toroidal: 349, total_conical: 758, total_b_spline: 2969, geometry_complexity: { simple: 38, medium: 24, complex: 13 } },
    { part_class: "empty", files_parse_ok: 0 },
  ],
});

describe("buildDataset", () => {
  it("builds composition pairs from an injected report, skips 0-file classes", () => {
    const ds = buildDataset({ readFileImpl: () => FAKE_REPORT });
    assert.equal(ds.present, true);
    assert.equal(ds.uniquePairs, 1); // die only (empty has 0 files)
    assert.match(ds.rows[0].output, /~22\.8 cylindrical/);
  });
  it("absent report -> present:false, 0 pairs (fail-soft)", () => {
    const ds = buildDataset({ readFileImpl: () => { throw new Error("ENOENT"); } });
    assert.equal(ds.present, false);
    assert.deepEqual(ds.rows, []);
  });
  it("LIVE: the real STEP report yields all 11 classes' composition pairs", () => {
    const ds = buildDataset({ report: DEFAULT_REPORT });
    assert.equal(ds.present, true, "real STEP report should be present");
    assert.equal(ds.uniquePairs, 11, `expected 11 composition pairs, got ${ds.uniquePairs}`);
  });
});
