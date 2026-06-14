// graphsage-predictor.heterophily.test.mjs (U-AISYN-GNN-HETERO-PREDICT-FIX, slot:alpha 2026-06-11)
// Regression-locks the heterophily hop-inference that lets the predictor reproduce a H2GCN
// checkpoint's widened features (egoDim*(1+hops)) at inference. Before this, the eval ALWAYS
// deferred on the inputDim(3072) != featureDim(768) mismatch, so heterophily could never be graded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { heterophilyHopsForCheckpoint } from "./graphsage-predictor.mjs";

test("happy: a 3-hop heterophily checkpoint (768 -> 3072) infers 3 hops on the embedding path", () => {
  assert.equal(heterophilyHopsForCheckpoint(3072, 768, "embedding"), 3);
});

test("happy: 1-hop (768 -> 1536) and 2-hop (768 -> 2304) infer correctly", () => {
  assert.equal(heterophilyHopsForCheckpoint(1536, 768, "embedding"), 1);
  assert.equal(heterophilyHopsForCheckpoint(2304, 768, "embedding"), 2);
});

test("legacy: inputDim == baseDim (no heterophily) returns 0 (byte-identical legacy path)", () => {
  assert.equal(heterophilyHopsForCheckpoint(768, 768, "embedding"), 0);
  assert.equal(heterophilyHopsForCheckpoint(8, 8, "embedding"), 0);
});

test("failure: projected feature source NEVER expands (heterophily is trained on embeddings only)", () => {
  // 3072 % 8 == 0 would spuriously infer 383 hops if the source were not gated.
  assert.equal(heterophilyHopsForCheckpoint(3072, 8, "projected"), 0);
  assert.equal(heterophilyHopsForCheckpoint(768, 8, "projected"), 0);
});

test("failure: non-integer multiple returns 0 (a genuine mismatch must still throw downstream, not silently expand)", () => {
  assert.equal(heterophilyHopsForCheckpoint(3000, 768, "embedding"), 0, "3000/768 is not integer");
  assert.equal(heterophilyHopsForCheckpoint(1000, 768, "embedding"), 0);
});

test("adversarial: non-finite / zero / negative dims guard to 0 (no NaN hops, no crash)", () => {
  assert.equal(heterophilyHopsForCheckpoint(NaN, 768, "embedding"), 0);
  assert.equal(heterophilyHopsForCheckpoint(3072, 0, "embedding"), 0);
  assert.equal(heterophilyHopsForCheckpoint(3072, -768, "embedding"), 0);
  assert.equal(heterophilyHopsForCheckpoint(Infinity, 768, "embedding"), 0);
  assert.equal(heterophilyHopsForCheckpoint(3072.5, 768, "embedding"), 0, "non-integer inputDim");
});

test("adversarial: inputDim smaller than baseDim returns 0 (shrink is never heterophily)", () => {
  assert.equal(heterophilyHopsForCheckpoint(384, 768, "embedding"), 0);
});
