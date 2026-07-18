// Tests for build-cad-decipher-lora.mjs -- corpus decipher -> LoRA training feed
// (U-DELTA-CAD-DECIPHER-LORA, slot:delta). Reference values come from real decipher-row shapes;
// skip cases prove the no-guess discipline (never train an unsure/unapplicable row).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deterministicPair, hermesPair, buildPairs, __test } from "./build-cad-decipher-lora.mjs";

// a realistic deterministic decipher row (shape of decipherKernelPart output)
const detRow = (over = {}) => ({
  label: "DIE BLOCK 7", partClass: "die", bboxMm: [50.8, 25.4, 12.7],
  classification: { shape: "rect", needsReasoning: false, confidence: "high" },
  mfg: {
    applicable: true, process: "mill", shape: "rect",
    stock: {
      applicable: true, process: "mill", finishedDims: [50.8, 25.4, 12.7], stockDims: [53, 27.5, 15],
      addedPerDimMm: [2.2, 2.1, 2.3], finishAllowancePerSideMm: { profile: 0.15, face: 0.15, bore: 0.1 },
    },
    workholding: { applicable: true, method: "milling vise on two parallel faces, part on parallels", gripSurfaces: ["two opposing parallel faces"] },
  },
  ...over,
});

test("deterministicPair: emits a grounded instruction/output with stock + workholding", () => {
  const p = deterministicPair(detRow());
  assert.match(p.instruction, /rect part \(class "die"\)/);
  assert.match(p.instruction, /50.80 x 25.40 x 12.70 mm/);
  assert.match(p.output, /Raw stock 53.00 x 27.50 x 15.00 mm/);
  assert.match(p.output, /2.20\/2.10\/2.30 mm\/axis/);
  assert.match(p.output, /finish 0.15 mm\/side/);
  assert.match(p.output, /milling vise/);
  assert.equal(p.source, "cad-decipher-deterministic");
  assert.equal(p.shape, "rect");
});

test("deterministicPair: lathe process reports the OD finish allowance", () => {
  const row = detRow({
    classification: { shape: "cylinder", needsReasoning: false },
    mfg: {
      applicable: true, process: "lathe", shape: "cylinder",
      stock: { applicable: true, process: "lathe", finishedDims: [38.1, 60], stockDims: [40.5, 62.5], addedPerDimMm: [2.4, 2.5], finishAllowancePerSideMm: { od: 0.15, face: 0.1, bore: 0.15 } },
      workholding: { applicable: true, method: "lathe 3-jaw chuck on the largest OD", gripSurfaces: ["OD 38.1 mm"] },
    },
  });
  const p = deterministicPair(row);
  assert.match(p.output, /finish 0.15 mm\/side/); // od, not profile
  assert.match(p.output, /chuck.*OD 38.1 mm/);
});

test("deterministicPair: needsReasoning / non-applicable / missing-stock rows -> null (never trained)", () => {
  assert.equal(deterministicPair({ classification: { needsReasoning: true }, mfg: { applicable: false } }), null);
  assert.equal(deterministicPair({ classification: { shape: "rect", needsReasoning: false }, mfg: { applicable: false } }), null);
  assert.equal(deterministicPair({ classification: { shape: "rect", needsReasoning: false }, mfg: { applicable: true, stock: { applicable: false } } }), null);
  assert.equal(deterministicPair(null), null);
});

test("hermesPair: a resolved family -> grounded pair with workholding + finish stock", () => {
  const p = hermesPair({ label: "CASING WITH SINGLE SIDE BORE", partClass: "casing", bboxMm: [63.88, 50.93, 50.93], hermes: { family: "prismatic", confidence: 0.7, workholding: "milling vise", finishStockMmPerSide: 0.5, reason: "boxy housing" } });
  assert.match(p.instruction, /"CASING WITH SINGLE SIDE BORE".*class "casing"/);
  assert.match(p.instruction, /63.88 x 50.93 x 50.93 mm/);
  assert.match(p.output, /A prismatic part/);
  assert.match(p.output, /milling vise/);
  assert.match(p.output, /Finish stock ~0.5 mm\/side/);
  assert.match(p.output, /\(boxy housing\)/);
  assert.equal(p.source, "cad-decipher-hermes");
});

test("hermesPair: family 'unsure' or missing -> null (never train a guess)", () => {
  assert.equal(hermesPair({ label: "X", bboxMm: [1, 2, 3], hermes: { family: "unsure", confidence: 0.4 } }), null);
  assert.equal(hermesPair({ label: "X", bboxMm: [1, 2, 3], hermes: null }), null);
  assert.equal(hermesPair({ label: "X", bboxMm: [1, 2, 3] }), null);
});

test("hermesPair: round family with no workholding phrase -> sensible default (chuck on OD)", () => {
  const p = hermesPair({ label: "SHAFT", partClass: "shaft", bboxMm: [20, 20, 100], hermes: { family: "round", confidence: 0.9 } });
  assert.match(p.output, /3-jaw chuck on the OD/);
});

test("buildPairs: merges both datasets, dedups by (instruction,output), counts skips", () => {
  // buildPairs reads file paths, so pass temp jsonl fixtures
  const det = path.join(os.tmpdir(), `det-${process.pid}.jsonl`);
  const herm = path.join(os.tmpdir(), `herm-${process.pid}.jsonl`);
  fs.writeFileSync(det, [JSON.stringify(detRow()), JSON.stringify(detRow()), JSON.stringify({ classification: { needsReasoning: true }, mfg: { applicable: false } })].join("\n"));
  fs.writeFileSync(herm, [
    JSON.stringify({ label: "MYSTERY", partClass: "general", bboxMm: [60, 60, 20], hermes: { family: "round", confidence: 0.8, workholding: "chuck" } }),
    JSON.stringify({ label: "Z", bboxMm: [1, 2, 3], hermes: { family: "unsure" } }),
  ].join("\n"));
  const { pairs, stats } = buildPairs(det, herm);
  fs.unlinkSync(det); fs.unlinkSync(herm);
  assert.equal(stats.fromDeterministic, 1, "two identical det rows dedup to 1");
  assert.equal(stats.skippedDeterministic, 1, "the needsReasoning row skipped");
  assert.equal(stats.fromHermes, 1, "one resolved hermes row");
  assert.equal(stats.skippedHermes, 1, "the unsure row skipped");
  assert.equal(stats.total, 2);
  assert.equal(pairs.length, 2);
});

test("buildPairs: corrupt jsonl lines are COUNTED, never silently dropped (R12)", () => {
  const det = path.join(os.tmpdir(), `det-corrupt-${process.pid}.jsonl`);
  const herm = path.join(os.tmpdir(), `herm-corrupt-${process.pid}.jsonl`);
  fs.writeFileSync(det, [JSON.stringify(detRow()), "{ torn line", JSON.stringify(detRow())].join("\n"));
  fs.writeFileSync(herm, "not json at all");
  const { stats } = buildPairs(det, herm);
  fs.unlinkSync(det); fs.unlinkSync(herm);
  assert.equal(stats.corruptDeterministic, 1, "the torn det line is counted");
  assert.equal(stats.corruptHermes, 1, "the non-json hermes line is counted");
  assert.equal(stats.fromDeterministic, 1, "valid rows still parse (2 identical dedup to 1)");
  assert.equal(stats.detRows, 2, "detRows counts parsed rows only");
});

test("fmtMm: formats a mm vector to 2dp; non-array -> n/a", () => {
  assert.equal(__test.fmtMm([50.8, 25.4]), "50.80 x 25.40 mm");
  assert.equal(__test.fmtMm(null), "n/a");
});
