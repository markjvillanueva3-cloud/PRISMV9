/**
 * Tests for cad-dimtol-validate.mjs (T-DIMTOL harness, slot:delta). Hermetic: fs injected, gate
 * logic tested with synthetic radii (no STEP parse). Run: node scripts/cad-dimtol-validate.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gateParts, collectClassParts } from "./cad-dimtol-validate.mjs";

// ---- gateParts: pure leave-one-out gate ----
test("gateParts: homogeneous parts (identical dists) all pass (passRate 1.0)", () => {
  const radii = [1, 2, 3, 4, 5, 6, 7, 8];
  const parts = Array.from({ length: 5 }, (_, i) => ({ file: `p${i}`, radii: radii.slice() }));
  const r = gateParts(parts);
  assert.equal(r.evaluated, 5);
  assert.equal(r.passed, 5, "each held-out part matches an identical pool -> drawn:true");
  assert.equal(r.passRate, 1);
});

test("gateParts: a dimensionally-disjoint outlier part is FLAGGED (drawn:false)", () => {
  const parts = [
    { file: "a", radii: [1, 2, 3, 4, 5] },
    { file: "b", radii: [1, 2, 3, 4, 5] },
    { file: "c", radii: [1000, 1001, 1002, 1003] }, // outlier
  ];
  const r = gateParts(parts);
  assert.equal(r.evaluated, 3);
  const c = r.results.find((x) => x.file === "c");
  assert.ok(!c.drawn, "the disjoint part must be flagged as drift");
  assert.equal(c.D, 1);
});

test("gateParts: learned pool below MIN_RADII is skipped (not evaluated)", () => {
  const parts = [{ file: "a", radii: [1, 2] }, { file: "b", radii: [3, 4] }];
  const r = gateParts(parts); // each leave-one-out pool has 2 radii < MIN_RADII(3)
  assert.equal(r.evaluated, 0);
  assert.equal(r.passRate, null);
});

test("gateParts: empty / non-array -> evaluated 0, passRate null, no throw", () => {
  assert.deepEqual(gateParts([]), { evaluated: 0, passed: 0, passRate: null, results: [] });
  assert.deepEqual(gateParts(null), { evaluated: 0, passed: 0, passRate: null, results: [] });
});

// ---- collectClassParts: file selection + injected fs ----
const STEP = (radii) => "SI_UNIT(.MILLI.,.METRE.);\n" + radii.map((r, i) => `CIRCLE('',#${i + 10},${r});`).join("\n");
const manifest = {
  entries: [
    { part_class: "die", ext: ".step", abs_path: "/x/die_big.step", size_bytes: 9000 },
    { part_class: "die", ext: ".step", abs_path: "/x/die_small.step", size_bytes: 100 },
    { part_class: "die", ext: ".ipt", abs_path: "/x/die.ipt", size_bytes: 50 },      // non-STEP -> excluded
    { part_class: "general", ext: ".step", abs_path: "/x/gen.step", size_bytes: 80 }, // other class
    { part_class: "die", ext: ".step", abs_path: "/x/die_unreadable.step", size_bytes: 70 },
  ],
};

test("collectClassParts: filters by class+STEP-ext, smallest-first, skips read errors + thin parts", () => {
  const reads = [];
  const readFileImpl = (p) => {
    reads.push(p);
    if (p.endsWith("die_unreadable.step")) throw new Error("EIO");
    if (p.endsWith("die_small.step")) return STEP([5, 6, 7, 8]); // 4 radii -> kept
    if (p.endsWith("die_big.step")) return STEP([2]);            // 1 radius < MIN_RADII -> dropped
    return STEP([1, 2, 3]);
  };
  const parts = collectClassParts("die", { manifest, readFileImpl, sampleN: 10 });
  // only die .step files are read (3 of them), smallest-first; .ipt + general excluded
  assert.ok(reads.every((p) => p.includes("die_") && p.endsWith(".step")), "only die STEP files read");
  assert.ok(reads.indexOf("/x/die_unreadable.step") < reads.indexOf("/x/die_big.step"), "smallest size_bytes read first");
  // die_small (4 radii) kept; die_big (1 radius) dropped; die_unreadable (throws) skipped
  assert.equal(parts.length, 1);
  assert.equal(parts[0].file, "die_small.step");
  assert.deepEqual(parts[0].radii, [5, 6, 7, 8]);
});

test("collectClassParts: sampleN caps the number of files read", () => {
  const readFileImpl = () => STEP([1, 2, 3]);
  const parts = collectClassParts("die", { manifest, readFileImpl, sampleN: 1 });
  assert.ok(parts.length <= 1, "sampleN=1 reads at most one file");
});
