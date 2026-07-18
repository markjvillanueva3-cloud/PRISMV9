/**
 * Tests for cam-emit-learned-order.mjs buildBootstrapArtifact — the pure core of the no-corpus
 * persist path. Real-data grounded against the planner's actual LATHE_OP_ORDER + the real
 * CAM-ORDER-LEARN-REPORT.json shape.
 *
 *   node --test scripts/cam-emit-learned-order.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBootstrapArtifact } from "./cam-emit-learned-order.mjs";
import { LATHE_OP_ORDER } from "./lib/cam-part-program-planner.mjs";
import { LEARNED_ORDER_KIND, loadLearnedOrder } from "./lib/cam-learned-order-store.mjs";

const NOW = "2026-06-02T17:00:00.000Z";
const REPORT = { kind: "cam_order_learn_report", sampled: 2005, programs_with_ops: 2000, minSupport: 50, minConfidence: 0.75, corpus_suggested_order: ["facing", "OD_roughing"], disagreements: [] };
const LOOP = { mean_sequence_fidelity: 0.9376, inversions: 80 };

test("buildBootstrapArtifact wraps the real LATHE_OP_ORDER with report + loop provenance", () => {
  const art = buildBootstrapArtifact(LATHE_OP_ORDER, REPORT, LOOP, NOW);
  assert.equal(art.kind, LEARNED_ORDER_KIND);
  assert.equal(art.learnedAt, NOW);
  assert.match(art.source, /bootstrap/);
  // order is the real curated map, value-for-value
  for (const [f, r] of Object.entries(LATHE_OP_ORDER)) assert.equal(art.order[f], r);
  // provenance carries report + loop fidelity
  assert.equal(art.provenance.sampled, 2005);
  assert.equal(art.provenance.programs_with_ops, 2000);
  assert.equal(art.provenance.mean_sequence_fidelity, 0.9376);
  assert.equal(art.provenance.loop_inversions, 80);
  assert.equal(art.provenance.persisted_by, "cam-emit-learned-order.mjs");
});

test("buildBootstrapArtifact tolerates absent reports (null) — provenance degrades to nulls, still valid", () => {
  const art = buildBootstrapArtifact(LATHE_OP_ORDER, null, null, NOW);
  assert.equal(art.kind, LEARNED_ORDER_KIND);
  assert.equal(art.provenance.sampled, null);
  assert.equal(art.provenance.mean_sequence_fidelity, undefined); // loop block skipped when loopReport null
  // the produced artifact round-trips through the loader
  const res = loadLearnedOrder("/p", {}, { readImpl: () => JSON.stringify(art), warn: () => {} });
  assert.equal(res.valid, true);
  assert.equal(res.order.facing, LATHE_OP_ORDER.facing);
});

test("buildBootstrapArtifact accepts sequence_fidelity (singular) loop-report key as a fallback", () => {
  const art = buildBootstrapArtifact(LATHE_OP_ORDER, REPORT, { sequence_fidelity: 0.91 }, NOW);
  assert.equal(art.provenance.mean_sequence_fidelity, 0.91);
});
