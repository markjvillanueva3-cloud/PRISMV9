// scripts/build-cad-dimension-dataset.test.mjs
// Tests for the U-CAD-DIM-RADII miner core (hermetic; injected manifest + reader).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDimensionPairs } from "./build-cad-dimension-dataset.mjs";

const INCH = "CONVERSION_BASED_UNIT ( 'INCH', #1 ) LENGTH_UNIT";
const cyl = (r) => `#9 = CYLINDRICAL_SURFACE ( 'NONE', #2, ${r} )`;

const FILES = {
  "die1.step": INCH + "\n" + cyl(0.1) + "\n" + cyl(0.2),   // inch -> 2.54, 5.08 mm
  "die2.step": INCH + "\n" + cyl(0.3),                      // inch -> 7.62 mm
  "noUnit.step": "no unit\n" + cyl(0.5),                    // unknown unit -> skipped
  "shaft1.step": "SI_UNIT ( .MILLI., .METRE. )\n" + cyl(4), // mm -> 4 mm
};
const entries = [
  { ext: ".step", part_class: "die", abs_path: "die1.step" },
  { ext: ".step", part_class: "die", abs_path: "die2.step" },
  { ext: ".step", part_class: "die", abs_path: "noUnit.step" },
  { ext: ".step", part_class: "shaft", abs_path: "shaft1.step" },
  { ext: ".png", part_class: "die", abs_path: "ignore.png" }, // non-STEP -> ignored
  { ext: ".step", part_class: "die", abs_path: "missing.step" }, // unreadable
];
const reader = (p) => { if (!(p in FILES)) throw new Error("ENOENT"); return FILES[p]; };

describe("buildDimensionPairs", () => {
  it("aggregates radii per class (unit-normalized), builds one pair per class", () => {
    const r = buildDimensionPairs({ entries, readFileImpl: reader });
    assert.equal(r.pairs.length, 2); // die + shaft
    const die = r.perClass.find((c) => c.partClass === "die");
    assert.equal(die.radii, 3);  // 0.1,0.2,0.3 in (2.54,5.08,7.62 mm) across die1+die2
    assert.equal(die.files, 2);
    assert.equal(die.medianRadiusMm, 5.08);
  });
  it("UNITS-FIRST: unknown-unit files are SKIPPED + counted (never mixed into mm stats)", () => {
    const r = buildDimensionPairs({ entries, readFileImpl: reader });
    assert.equal(r.filesSkippedUnit, 1); // noUnit.step
    // the 0.5 radius from noUnit.step must NOT appear in die's stats (only 3 inch radii)
    assert.equal(r.perClass.find((c) => c.partClass === "die").radii, 3);
  });
  it("unreadable files are skipped + counted, not fatal", () => {
    const r = buildDimensionPairs({ entries, readFileImpl: reader });
    assert.equal(r.filesUnreadable, 1); // missing.step
  });
  it("maxPerClass caps reads per class", () => {
    const r = buildDimensionPairs({ entries, readFileImpl: reader, maxPerClass: 1 });
    // die capped at 1 file read (die1) -> 2 radii
    assert.equal(r.perClass.find((c) => c.partClass === "die").radii, 2);
  });
  it("plausibility guard: a >1.5m envelope file (misclassified assembly) is SKIPPED whole (radii excluded too)", () => {
    const MM = "SI_UNIT ( .MILLI., .METRE. )";
    const cp = (x) => `#1 = CARTESIAN_POINT ( 'NONE', ( ${x}, 0, 0 ) )`;
    const files2 = { ...FILES, "machine.step": MM + "\n" + cp(0) + "\n" + cp(2000) + "\n" + cyl(7) }; // 2000mm extent
    const entries2 = [...entries, { ext: ".step", part_class: "die", abs_path: "machine.step" }];
    const reader2 = (p) => { if (!(p in files2)) throw new Error("ENOENT"); return files2[p]; };
    const r = buildDimensionPairs({ entries: entries2, readFileImpl: reader2 });
    assert.equal(r.filesSkippedOversize, 1);
    // the machine's radius (7mm) must NOT appear in die stats (still only the 3 inch radii)
    assert.equal(r.perClass.find((c) => c.partClass === "die").radii, 3);
  });

  it("adversarial: empty entries -> no pairs, no throw", () => {
    assert.doesNotThrow(() => {
      const r = buildDimensionPairs({ entries: [], readFileImpl: reader });
      assert.deepEqual(r.pairs, []);
    });
  });
});
