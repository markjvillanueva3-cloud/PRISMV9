// scripts/build-cad-ground-truth-dataset.test.mjs
// Tests for the U-CAD-GT-FEATURE-PRIORS builder: GT-dir scan -> deduped CAD-gen dataset.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadGtArtifacts, buildDataset, DEFAULT_GT_DIR } from "./build-cad-ground-truth-dataset.mjs";

const die = JSON.stringify({ part_class: "die", prints: [{ dimensions: [
  { kind: "central_oil_hole", evidence_ratio: 0.95, evidence_count: 71 },
  { kind: "bevel_face_chamfer", evidence_ratio: 0.51, evidence_count: 38 },
] }] });
const plate = JSON.stringify({ part_class: "plate", prints: [{ dimensions: [
  { kind: "central_oil_hole", evidence_ratio: 1.0, evidence_count: 30 },
] }] });

const FAKE = {
  "cad-prototype-die-2026-05-19.json": die,
  "cad-prototype-plate-2026-05-19.json": plate,
  "README.md": "ignore me",                 // not a catalog
  "cad-prototype-broken-2026-05-19.json": "{ not json",
};
const fakeReaddir = () => Object.keys(FAKE);
const fakeRead = (p) => {
  const name = String(p).replace(/\\/g, "/").split("/").pop();
  if (!(name in FAKE)) throw new Error("ENOENT");
  return FAKE[name];
};

describe("loadGtArtifacts", () => {
  it("loads only cad-prototype-*.json, counts invalid JSON, ignores other files", () => {
    const r = loadGtArtifacts({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    assert.equal(r.files, 3);       // die, plate, broken (README excluded)
    assert.equal(r.artifacts.length, 2); // broken failed to parse
    assert.equal(r.invalid, 1);
  });
  it("missing dir -> empty, never throws (fail-soft)", () => {
    assert.doesNotThrow(() => {
      const r = loadGtArtifacts({ readdirImpl: () => { throw new Error("ENOENT"); } });
      assert.deepEqual(r, { artifacts: [], files: 0, invalid: 0 });
    });
  });
});

describe("buildDataset", () => {
  it("builds deduped pairs across classes (die + plate)", () => {
    const ds = buildDataset({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    assert.equal(ds.classes, 2);
    assert.ok(ds.uniquePairs >= 4); // die: 1 class + 2 feat; plate: 1 class + 1 feat
    assert.ok(ds.rows.some((p) => /classified as "die"/.test(p.instruction)));
    assert.ok(ds.rows.some((p) => /classified as "plate"/.test(p.instruction)));
  });

  it("LIVE: the real GT dir yields all 11 classes and a non-trivial pair count", () => {
    const ds = buildDataset({ gtDir: DEFAULT_GT_DIR });
    // 11 real classes (blisk/bracket/bushing/casing/die/extrude_punch/general/impeller/plate/shaft/valve_body)
    assert.equal(ds.classes, 11, `expected 11 classes, got ${ds.classes}`);
    assert.ok(ds.uniquePairs >= 11, `expected >=11 pairs (>=1 class pair each), got ${ds.uniquePairs}`);
    assert.equal(ds.invalid, 0, "no malformed GT catalogs expected");
  });
});
