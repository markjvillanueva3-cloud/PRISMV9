// scripts/lora-dataset-builder.test.mjs
// Tests for U-LORA-MASTER-CORPUS-TRAINER (dataset-builder scope).
// Run: node --test scripts/lora-dataset-builder.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  shuffle,
  readCorpus,
  groupByTrack,
  stratifiedSplit,
  writeSplits,
  buildDatasets,
} = await import("./lora-dataset-builder.mjs");

function makeTempCorpus(tuples) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-corpus-"));
  const p = path.join(dir, "corpus.jsonl");
  fs.writeFileSync(p, tuples.map((t) => JSON.stringify(t)).join("\n") + "\n");
  return { p, dir };
}

// ─── shuffle ───────────────────────────────────────────────────────────────
test("shuffle: same seed → same output (reproducible)", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = shuffle(input, 42);
  const b = shuffle(input, 42);
  assert.deepEqual(a, b);
});

test("shuffle: different seeds → different output", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = shuffle(input, 42);
  const b = shuffle(input, 99);
  assert.notDeepEqual(a, b);
});

test("shuffle: preserves all elements (no loss)", () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, 42);
  assert.deepEqual(out.slice().sort(), [1, 2, 3, 4, 5]);
});

test("shuffle: empty array → empty array", () => {
  assert.deepEqual(shuffle([], 42), []);
});

// ─── readCorpus ────────────────────────────────────────────────────────────
test("readCorpus: throws when file missing", () => {
  assert.throws(() => readCorpus(path.join(os.tmpdir(), `nonexistent-${process.pid}.jsonl`)), /corpus file not found/);
});

test("readCorpus: parses JSONL + skips corrupt", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-rc-"));
  const p = path.join(dir, "c.jsonl");
  fs.writeFileSync(p, '{"a":1}\nnot-json\n{"a":2}\n');
  const got = readCorpus(p);
  assert.equal(got.length, 2);
  assert.equal(got[0].a, 1);
  assert.equal(got[1].a, 2);
});

// ─── groupByTrack ──────────────────────────────────────────────────────────
test("groupByTrack: groups by string trackField", () => {
  const tuples = [
    { track: "roughing", input: "a" },
    { track: "finishing", input: "b" },
    { track: "roughing", input: "c" },
  ];
  const m = groupByTrack(tuples, "track");
  assert.equal(m.size, 2);
  assert.equal(m.get("roughing").length, 2);
  assert.equal(m.get("finishing").length, 1);
});

test("groupByTrack: missing/non-string track field → '_unclassified'", () => {
  const tuples = [
    { track: "valid", input: "a" },
    { input: "b" }, // missing
    { track: 42, input: "c" }, // non-string
    { track: "", input: "d" }, // empty
  ];
  const m = groupByTrack(tuples, "track");
  assert.equal(m.get("valid").length, 1);
  assert.equal(m.get("_unclassified").length, 3);
});

test("groupByTrack: throws on bad trackField arg", () => {
  assert.throws(() => groupByTrack([], ""), /non-empty string/);
  assert.throws(() => groupByTrack([], null), /non-empty string/);
});

// ─── stratifiedSplit ───────────────────────────────────────────────────────
test("stratifiedSplit: per-track train/val split with default valFraction=0.15", () => {
  const grouped = new Map();
  grouped.set("A", Array.from({ length: 100 }, (_, i) => ({ id: `A${i}` })));
  grouped.set("B", Array.from({ length: 20 }, (_, i) => ({ id: `B${i}` })));
  const splits = stratifiedSplit(grouped);
  // A: 100 * 0.15 = 15 val, 85 train
  assert.equal(splits.A.valN, 15);
  assert.equal(splits.A.trainN, 85);
  assert.equal(splits.A.train.length, 85);
  assert.equal(splits.A.val.length, 15);
  // B: 20 * 0.15 = 3 val, 17 train
  assert.equal(splits.B.valN, 3);
  assert.equal(splits.B.trainN, 17);
});

test("stratifiedSplit: min 1 val for any track with >=2 tuples", () => {
  const grouped = new Map();
  grouped.set("tiny", [{ id: 1 }, { id: 2 }]);
  const splits = stratifiedSplit(grouped, { valFraction: 0.01 });
  // floor(2 * 0.01) = 0, but min-1 rule kicks in
  assert.equal(splits.tiny.valN, 1);
  assert.equal(splits.tiny.trainN, 1);
});

test("stratifiedSplit: single-element track → 0 val, 1 train", () => {
  const grouped = new Map();
  grouped.set("singleton", [{ id: 1 }]);
  const splits = stratifiedSplit(grouped);
  assert.equal(splits.singleton.valN, 0);
  assert.equal(splits.singleton.trainN, 1);
});

test("stratifiedSplit: rejects out-of-range valFraction", () => {
  const grouped = new Map([["A", [{ id: 1 }, { id: 2 }]]]);
  assert.throws(() => stratifiedSplit(grouped, { valFraction: 0 }), /valFraction/);
  assert.throws(() => stratifiedSplit(grouped, { valFraction: 1 }), /valFraction/);
  assert.throws(() => stratifiedSplit(grouped, { valFraction: -0.1 }), /valFraction/);
});

test("stratifiedSplit: same seed → same partition (reproducibility)", () => {
  const tuples = Array.from({ length: 50 }, (_, i) => ({ id: `T${i}` }));
  const grouped = new Map([["A", tuples]]);
  const a = stratifiedSplit(grouped, { seed: 100 });
  const b = stratifiedSplit(grouped, { seed: 100 });
  assert.deepEqual(a.A.val.map((t) => t.id), b.A.val.map((t) => t.id));
});

// ─── writeSplits ───────────────────────────────────────────────────────────
test("writeSplits: writes per-track {train,val}.new.jsonl + manifest.new.json", () => {
  const grouped = new Map();
  grouped.set("roughing", Array.from({ length: 10 }, (_, i) => ({ id: `R${i}` })));
  grouped.set("finishing", Array.from({ length: 5 }, (_, i) => ({ id: `F${i}` })));
  const splits = stratifiedSplit(grouped);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-w-"));
  const { manifestPath, manifest } = writeSplits(splits, dir);
  assert.ok(fs.existsSync(manifestPath));
  assert.match(manifestPath, /manifest\.new\.json$/);
  assert.equal(manifest.trackCount, 2);
  assert.equal(manifest.totalTuples, 15);
  for (const track of ["roughing", "finishing"]) {
    const trainPath = path.join(dir, `${track}-train.new.jsonl`);
    const valPath = path.join(dir, `${track}-val.new.jsonl`);
    assert.ok(fs.existsSync(trainPath));
    assert.ok(fs.existsSync(valPath));
  }
});

test("writeSplits: sanitizes track names with unsafe chars", () => {
  const grouped = new Map();
  grouped.set("cam/rough#1!", [{ id: 1 }, { id: 2 }]);
  const splits = stratifiedSplit(grouped);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-san-"));
  writeSplits(splits, dir);
  const files = fs.readdirSync(dir);
  const trainFile = files.find((f) => f.endsWith("-train.new.jsonl"));
  assert.ok(trainFile);
  // Unsafe chars replaced with underscores
  assert.doesNotMatch(trainFile, /[/#!]/);
});

// ─── buildDatasets (top-level) ─────────────────────────────────────────────
test("buildDatasets: end-to-end pipeline (read corpus → group → split → write)", () => {
  // 8 per-track CAM tuples — matches the india gap-plan target
  const tracks = ["cam_roughing", "cam_finishing", "cam_engraving", "cam_drilling", "cam_chamfer", "cam_milling_3d", "cam_threading", "cam_facing"];
  const tuples = [];
  for (const t of tracks) {
    for (let i = 0; i < 20; i++) tuples.push({ track: t, input: `${t}-${i}`, output: `out-${i}` });
  }
  const { p: corpusPath } = makeTempCorpus(tuples);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-bd-"));
  const { manifest } = buildDatasets({
    corpusPath,
    trackField: "track",
    outputDir: outDir,
    valFraction: 0.15,
    seed: 42,
  });
  assert.equal(manifest.trackCount, 8);
  assert.equal(manifest.totalTuples, 160);
  // Each track: 20 * 0.15 = 3 val, 17 train
  for (const t of tracks) {
    assert.equal(manifest.tracks[t].valN, 3);
    assert.equal(manifest.tracks[t].trainN, 17);
  }
});

test("buildDatasets: throws on empty corpus", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lora-empty-"));
  const p = path.join(dir, "empty.jsonl");
  fs.writeFileSync(p, "");
  assert.throws(
    () => buildDatasets({ corpusPath: p, trackField: "track", outputDir: dir }),
    /0 valid tuples/,
  );
});

// ─── variability ──────────────────────────────────────────────────────────
test("variability: 3 different track-field names yield correct partitions", () => {
  const cases = [
    { field: "track", tuples: [{ track: "A", x: 1 }, { track: "A", x: 2 }, { track: "B", x: 3 }, { track: "B", x: 4 }] },
    { field: "operation_type", tuples: [{ operation_type: "X", v: 1 }, { operation_type: "X", v: 2 }, { operation_type: "Y", v: 3 }, { operation_type: "Y", v: 4 }] },
    { field: "cam_strategy", tuples: [{ cam_strategy: "P", k: 1 }, { cam_strategy: "P", k: 2 }, { cam_strategy: "Q", k: 3 }, { cam_strategy: "Q", k: 4 }] },
  ];
  for (const c of cases) {
    const { p } = makeTempCorpus(c.tuples);
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `lora-v-${c.field}-`));
    const { manifest } = buildDatasets({ corpusPath: p, trackField: c.field, outputDir: outDir });
    assert.equal(manifest.trackCount, 2, `field=${c.field} should produce 2 tracks`);
    assert.equal(manifest.totalTuples, 4);
  }
});
