// scripts/lib/trainset-to-lora-pairs.test.mjs
// Tests for the U-XRAY-BLUEPRINT-LORA-STAGE pure adapter. Reference values + invariants — the
// adapter feeds india's LoRA trainset, so a wrong mapping = silently training on malformed/leaked
// labels. Each test encodes WHY a mapping rule matters (string coercion, trainable-gate, context fold).

import { test } from "node:test";
import assert from "node:assert/strict";

import { trainsetRowToPairs, trainsetToLoRAPairs } from "./trainset-to-lora-pairs.mjs";

const ROW = {
  part: "PRISM_2475-037",
  image: "state/shared/ocr-training-loop/extrude_punch.png",
  source: "ensemble-distillation",
  labels: [
    { type: "diameter", value_mm: 12.7, n_models: 2, agreement_fraction: 1, corroboration: 2, expected_accuracy: 0.9, tier: "gold", trainable: true },
    { type: "linear", value_mm: 25.4, n_models: 2, agreement_fraction: 1, corroboration: 2, expected_accuracy: 0.9, tier: "gold", trainable: true },
    { type: "radius", value_mm: 3.0, n_models: 2, agreement_fraction: 0.5, corroboration: 1, expected_accuracy: 0.57, tier: "bronze", trainable: false }, // excluded
  ],
};

test("adapter: only TRAINABLE labels become pairs (gated bronze excluded)", () => {
  const pairs = trainsetRowToPairs(ROW);
  assert.equal(pairs.length, 2);                          // 2 trainable, bronze dropped
  assert.deepEqual(pairs.map((p) => p.extractionType).sort(), ["diameter", "linear"]);
});

test("adapter: groundTruthValue is a STRING (bridge field type)", () => {
  const p = trainsetRowToPairs(ROW)[0];
  assert.equal(typeof p.groundTruthValue, "string");
  assert.equal(p.groundTruthValue, "12.7");
});

test("adapter: context folds type + all dropped signals (the prompt only carries context)", () => {
  const p = trainsetRowToPairs(ROW)[0];
  assert.match(p.context, /type=diameter/);
  assert.match(p.context, /value_mm=12.7/);
  assert.match(p.context, /tier=gold/);
  assert.match(p.context, /agreement_fraction=1/);
  assert.match(p.context, /src=ensemble-distillation/);
});

test("adapter: required bridge fields present + correct", () => {
  const p = trainsetRowToPairs(ROW)[0];
  for (const k of ["pairId", "customer", "partNumber", "pdfPath", "extractionType", "groundTruthValue", "context"]) {
    assert.ok(k in p, `missing field ${k}`);
  }
  assert.equal(p.partNumber, "PRISM_2475-037");
  assert.equal(p.pdfPath, "state/shared/ocr-training-loop/extrude_punch.png");
});

test("adapter: pairId unique across rows with the SAME part (rowIdx disambiguates)", () => {
  const rows = [ROW, ROW]; // same part twice
  const pairs = trainsetToLoRAPairs(rows);
  assert.equal(pairs.length, 4);                          // 2 trainable × 2 rows
  const ids = new Set(pairs.map((p) => p.pairId));
  assert.equal(ids.size, 4, "all pairIds must be unique");
  assert.match(pairs[0].pairId, /#0:/);
  assert.match(pairs[2].pairId, /#1:/);
});

test("adapter: numeric value_mm coerced via Number (e.g. would normalize a leading-dot string)", () => {
  const row = { part: "P", image: "i.png", labels: [{ type: "linear", value_mm: ".5", trainable: true }] };
  // value_mm ".5" (string) → Number(".5")=0.5 → String(0.5)="0.5" (leading zero restored)
  const p = trainsetRowToPairs(row)[0];
  assert.equal(p.groundTruthValue, "0.5");
});

test("adapter: edge cases — empty/null/no-labels/no-value → no pairs, no throw", () => {
  assert.deepEqual(trainsetRowToPairs(null), []);
  assert.deepEqual(trainsetRowToPairs({}), []);
  assert.deepEqual(trainsetRowToPairs({ labels: "nope" }), []);
  assert.deepEqual(trainsetRowToPairs({ part: "P", labels: [{ type: "x", trainable: true }] }), []); // no value_mm
  assert.deepEqual(trainsetRowToPairs({ part: "P", labels: [{ type: "x", value_mm: NaN, trainable: true }] }), []);
  assert.deepEqual(trainsetToLoRAPairs(null), []);
  assert.deepEqual(trainsetToLoRAPairs([]), []);
});

test("adapter: a row with zero trainable labels yields zero pairs (single-model run → nothing leaks)", () => {
  const soloRow = { part: "P", image: "i.png", source: "ensemble-distillation", labels: [
    { type: "diameter", value_mm: 10, tier: "no_corroboration", trainable: false },
    { type: "linear", value_mm: 20, tier: "no_corroboration", trainable: false },
  ] };
  assert.deepEqual(trainsetRowToPairs(soloRow), []);
});

// ── GD&T pairs (U-XRAY-GDT-LABEL-TIER) ─────────────────────────────────────────

test("adapter: a trainable GD&T label becomes a gdt pair, groundTruthValue = FCF text", () => {
  const row = { part: "PN", image: "g.png", source: "ensemble-distillation", labels: [], gdt_labels: [
    { symbol: "position", fcf_text: "position 0.1mm MMC [A|B]", n_models: 2, corroboration: 2, agreement_fraction: 1, expected_accuracy: 0.92, tier: "gold", calibration_basis: "dimension-agreement", trainable: true },
  ] };
  const pairs = trainsetRowToPairs(row);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].extractionType, "gdt");
  assert.equal(pairs[0].groundTruthValue, "position 0.1mm MMC [A|B]");
  assert.equal(typeof pairs[0].groundTruthValue, "string");
  assert.match(pairs[0].context, /calibration_basis=dimension-agreement/);
  assert.match(pairs[0].context, /tier=gold/);
  assert.equal(pairs[0].pdfPath, "g.png");
});

test("adapter: non-trainable GD&T labels and empty-FCF labels produce no pairs", () => {
  const row = { part: "PN", image: "g.png", gdt_labels: [
    { symbol: "flatness", fcf_text: "flatness 0.05", tier: "no_corroboration", trainable: false }, // not trainable
    { symbol: "position", fcf_text: "", tier: "gold", trainable: true },                            // no usable FCF
    { symbol: "position", tier: "gold", trainable: true },                                          // fcf_text absent
  ] };
  assert.deepEqual(trainsetRowToPairs(row), []);
});

test("adapter: a gdt-only row (no `labels` field) still yields gdt pairs (guard handles either array)", () => {
  const row = { part: "PN", image: "g.png", gdt_labels: [
    { symbol: "runout", fcf_text: "runout 0.02 [A]", n_models: 3, corroboration: 3, tier: "gold", trainable: true },
  ] };
  const pairs = trainsetRowToPairs(row);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].extractionType, "gdt");
  assert.equal(pairs[0].groundTruthValue, "runout 0.02 [A]");
});

test("adapter: mixed row emits both dim and gdt pairs with distinct pairIds", () => {
  const row = { part: "PN", image: "g.png", source: "ensemble-distillation",
    labels: [{ type: "diameter", value_mm: 12.7, n_models: 2, corroboration: 2, tier: "gold", trainable: true }],
    gdt_labels: [{ symbol: "position", fcf_text: "position 0.1 [A]", n_models: 2, corroboration: 2, tier: "gold", trainable: true }],
  };
  const pairs = trainsetRowToPairs(row);
  assert.equal(pairs.length, 2);
  const types = pairs.map((p) => p.extractionType).sort();
  assert.deepEqual(types, ["diameter", "gdt"]);
  const ids = new Set(pairs.map((p) => p.pairId));
  assert.equal(ids.size, 2, "dim and gdt pairIds are distinct");
});
