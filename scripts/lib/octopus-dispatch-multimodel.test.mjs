// scripts/lib/octopus-dispatch-multimodel.test.mjs
//
// OCTOPUS-HERMES-MULTIMODEL -- the ledger mapper must surface MULTIPLE distinct xai
// (Grok) voices as DISTINCT model-tagged ids (the loss function: "the ledger shows
// >=2 distinct Grok models"), while a single Grok voice stays bare "xai" (back-compat)
// and the ollama diverse-panel tagging is unchanged. mapConsensusToLedger is pure -> no
// network. These pin the ledger half of the multi-model feature; the engine seating half
// is proven by the engine unit test + the live tsx validation.

import test from "node:test";
import assert from "node:assert/strict";
import { mapConsensusToLedger } from "./octopus-dispatch.mjs";

test("map: two DISTINCT xai Grok voices get distinct model-tagged ids (LOSS FUNCTION)", () => {
  const cr = {
    ok: true,
    successCount: 2,
    consensus: { answer: "Use trochoidal milling.", confidence: 0.8 },
    responses: [
      { model: "grok-4.3", vendor: "xai", ok: true, error: null },
      { model: "grok-4.20-0309-reasoning", vendor: "xai", ok: true, error: null },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const ids = out.voices.map((v) => v.id).sort();
  assert.deepEqual(ids, ["xai:grok-4.20-0309-reasoning", "xai:grok-4.3"]);
  assert.equal(new Set(ids).size, 2); // DISTINGUISHABLE -- not both collapsed to "xai"
});

test("map: a SINGLE xai Grok voice stays bare 'xai' (back-compat, no id churn)", () => {
  const cr = {
    ok: true,
    successCount: 1,
    consensus: { answer: "ok", confidence: 0.7 },
    responses: [
      { model: "grok-4.3", vendor: "xai", ok: true, error: null },
      { model: "qwen2.5-coder:32b", vendor: "ollama", ok: true, error: null },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const xai = out.voices.find((v) => v.id.startsWith("xai"));
  assert.equal(xai.id, "xai"); // single xai voice -> bare, unchanged from pre-feature
});

test("map: ollama diverse-panel tagging unchanged with one ollama voice (back-compat)", () => {
  const cr = {
    ok: true,
    successCount: 1,
    consensus: { answer: "ok", confidence: 0.7 },
    responses: [{ model: "qwen2.5-coder:32b", vendor: "ollama", ok: true, error: null }],
  };
  const out = mapConsensusToLedger(cr);
  assert.equal(out.voices[0].id, "ollama:qwen2.5-coder:32b"); // ollama ALWAYS model-tagged
});

test("map: mixed panel -- 2 xai + 2 ollama all distinctly tagged (multi-model + multi-local)", () => {
  const cr = {
    ok: true,
    successCount: 4,
    consensus: { answer: "ok", confidence: 0.8 },
    responses: [
      { model: "grok-4.3", vendor: "xai", ok: true, error: null },
      { model: "grok-build-0.1", vendor: "xai", ok: true, error: null },
      { model: "qwen2.5-coder:32b", vendor: "ollama", ok: true, error: null },
      { model: "gpt-oss:20b", vendor: "ollama", ok: true, error: null },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const ids = out.voices.map((v) => v.id).sort();
  assert.deepEqual(ids, [
    "ollama:gpt-oss:20b",
    "ollama:qwen2.5-coder:32b",
    "xai:grok-4.3",
    "xai:grok-build-0.1",
  ]);
  assert.equal(new Set(ids).size, 4); // 4 distinct voices, zero collapse
});

test("map: a FAILED multi-model xai voice keeps its model in the id (diagnosable failure)", () => {
  const cr = {
    ok: true,
    successCount: 1,
    consensus: { answer: "ok", confidence: 0.6 },
    responses: [
      { model: "grok-4.3", vendor: "xai", ok: true, error: null },
      { model: "grok-build-0.1", vendor: "xai", ok: false, error: "hermes-proxy timeout" },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const failed = out.voices.find((v) => v.verdict.startsWith("failed"));
  assert.equal(failed.id, "xai:grok-build-0.1"); // ledger names WHICH Grok model failed
});
