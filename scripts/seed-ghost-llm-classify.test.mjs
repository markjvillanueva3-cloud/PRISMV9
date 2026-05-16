#!/usr/bin/env node
/**
 * seed-ghost-llm-classify.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS2/U-LLM-CLASSIFY
 * Run: node --test scripts/seed-ghost-llm-classify.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readEngineHeader,
  buildBatchPrompt,
  callOllamaBatch,
  parseBatchResponse,
  chunkBatches,
  classificationToGraphUpdate,
  VALID_DISPATCHERS,
  LLM_CONFIDENCE,
  DEFAULT_MODEL,
} from "./seed-ghost-llm-classify.mjs";

describe("readEngineHeader", () => {
  test("reads first N lines of file", () => {
    const tmp = path.join(os.tmpdir(), `header-test-${Date.now()}.ts`);
    try {
      fs.writeFileSync(tmp, Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n"));
      const r = readEngineHeader(tmp, 10);
      assert.equal(r.split("\n").length, 10);
      assert.match(r, /^line 0\n/);
    } finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
  });
  test("missing file → empty string", () => {
    assert.equal(readEngineHeader("/this/does/not/exist.ts"), "");
  });
  test("respects maxLines default + override", () => {
    const tmp = path.join(os.tmpdir(), `header-default-${Date.now()}.ts`);
    try {
      fs.writeFileSync(tmp, Array.from({ length: 100 }, (_, i) => `L${i}`).join("\n"));
      const def = readEngineHeader(tmp);
      assert.equal(def.split("\n").length, 30);
      const five = readEngineHeader(tmp, 5);
      assert.equal(five.split("\n").length, 5);
    } finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
  });
});

describe("buildBatchPrompt", () => {
  test("includes all engine names + headers", () => {
    const engines = [
      { name: "AlphaEngine", header: "export class AlphaEngine {}" },
      { name: "BravoEngine", header: "export class BravoEngine {}" },
    ];
    const p = buildBatchPrompt(engines);
    assert.match(p, /AlphaEngine/);
    assert.match(p, /BravoEngine/);
    assert.match(p, /export class AlphaEngine/);
  });
  test("lists all VALID_DISPATCHERS in the prompt", () => {
    const p = buildBatchPrompt([{ name: "X", header: "" }]);
    for (const d of VALID_DISPATCHERS) {
      assert.match(p, new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
  test("instructs JSON-only response format", () => {
    const p = buildBatchPrompt([{ name: "X", header: "" }]);
    assert.match(p, /valid JSON/i);
    assert.match(p, /no markdown/i);
  });
});

describe("parseBatchResponse", () => {
  const engines = [{ name: "MillForce" }, { name: "LatheGroove" }];

  test("happy path — clean JSON array", () => {
    const raw = '[{"engine":"MillForce","dispatcher":"prism_calc"},{"engine":"LatheGroove","dispatcher":"prism_turning"}]';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 2);
    assert.equal(r[0].engine, "MillForce");
    assert.equal(r[0].dispatcher, "prism_calc");
  });

  test("strips markdown fences", () => {
    const raw = '```json\n[{"engine":"MillForce","dispatcher":"prism_calc"}]\n```';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 1);
  });

  test("rejects invalid dispatcher names", () => {
    const raw = '[{"engine":"MillForce","dispatcher":"prism_invalid_xyz"}]';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 0);
  });

  test("rejects engine names not in input batch", () => {
    const raw = '[{"engine":"DifferentEngine","dispatcher":"prism_calc"}]';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 0);
  });

  test("handles preamble/trailing text around JSON", () => {
    const raw = 'Here is my classification:\n[{"engine":"MillForce","dispatcher":"prism_calc"}]\nLet me know if you need adjustments.';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 1);
    assert.equal(r[0].dispatcher, "prism_calc");
  });

  test("malformed JSON → empty array", () => {
    assert.deepEqual(parseBatchResponse("[{not valid", engines), []);
    assert.deepEqual(parseBatchResponse("not json at all", engines), []);
    assert.deepEqual(parseBatchResponse("", engines), []);
    assert.deepEqual(parseBatchResponse(null, engines), []);
  });

  test("non-array JSON → empty array", () => {
    assert.deepEqual(parseBatchResponse('{"engine":"MillForce"}', engines), []);
  });

  test("partial / mixed valid+invalid → keeps valid only", () => {
    const raw = '[{"engine":"MillForce","dispatcher":"prism_calc"},{"engine":"LatheGroove","dispatcher":"made_up_dispatcher"}]';
    const r = parseBatchResponse(raw, engines);
    assert.equal(r.length, 1);
    assert.equal(r[0].engine, "MillForce");
  });
});

describe("callOllamaBatch", () => {
  const engines = [{ name: "X", header: "x" }];

  test("happy path with injected fetch", async () => {
    const fakeFetch = async (url, opts) => ({
      ok: true,
      status: 200,
      json: async () => ({ response: '[{"engine":"X","dispatcher":"prism_calc"}]' }),
    });
    const r = await callOllamaBatch(engines, { fetchImpl: fakeFetch });
    assert.equal(r.ok, true);
    assert.equal(r.parsed.length, 1);
  });

  test("HTTP error → ok:false", async () => {
    const fakeFetch = async () => ({ ok: false, status: 500 });
    const r = await callOllamaBatch(engines, { fetchImpl: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /HTTP 500/);
  });

  test("network error → ok:false", async () => {
    const fakeFetch = async () => { throw new Error("ECONNREFUSED"); };
    const r = await callOllamaBatch(engines, { fetchImpl: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /ECONNREFUSED/);
  });

  test("timeout via AbortController", async () => {
    const fakeFetch = (url, opts) => new Promise((resolve, reject) => {
      opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
    });
    const r = await callOllamaBatch(engines, { fetchImpl: fakeFetch, timeoutMs: 50 });
    assert.equal(r.ok, false);
  });
});

describe("chunkBatches", () => {
  test("splits array into batches of size n", () => {
    const r = chunkBatches([1, 2, 3, 4, 5, 6, 7], 3);
    assert.equal(r.length, 3);
    assert.deepEqual(r[0], [1, 2, 3]);
    assert.deepEqual(r[1], [4, 5, 6]);
    assert.deepEqual(r[2], [7]);
  });
  test("empty array → empty", () => {
    assert.deepEqual(chunkBatches([], 5), []);
  });
  test("batch larger than array → single batch", () => {
    assert.deepEqual(chunkBatches([1, 2], 10), [[1, 2]]);
  });
});

describe("constants", () => {
  test("VALID_DISPATCHERS frozen + non-empty", () => {
    assert.ok(VALID_DISPATCHERS.length >= 10);
    assert.throws(() => { VALID_DISPATCHERS.push("x"); });
  });
  test("LLM_CONFIDENCE in valid 0..1 range, capped below sibling tier", () => {
    assert.ok(LLM_CONFIDENCE > 0 && LLM_CONFIDENCE < 0.7);
  });
  test("DEFAULT_MODEL is a string", () => {
    assert.equal(typeof DEFAULT_MODEL, "string");
    assert.match(DEFAULT_MODEL, /^qwen/);
  });
});

// classificationToGraphUpdate — the merge helper extracted for the tier-5 gate
// (NN-GRAPH-MS0/U-NNG-INFERENCE-FIFTH-TIER). It must keep the LLM 4-tier
// behaviour byte-identical (a classification with no confidence/reason gets the
// LLM defaults) while ALSO honoring a GNN classification's own confidence/reason.
describe("classificationToGraphUpdate (tier-5 merge helper)", () => {
  const ghostNode = () => ({
    id: "ghost.unwired.X", kind: "ghost.unwired-engine",
    label: "XEngine", proposed_wiring: "UNKNOWN",
  });

  test("LLM-shape classification gets the LLM confidence + reason defaults", () => {
    const node = ghostNode();
    const edge = classificationToGraphUpdate(
      node, { engine: "XEngine", dispatcher: "prism_cam" }, "qwen2.5-coder:7b");
    assert.equal(node.proposed_wiring, "prism_cam");
    assert.equal(node.confidence, LLM_CONFIDENCE);
    assert.equal(node.reason, "LLM-classified via qwen2.5-coder:7b");
    assert.match(node.info, /prism_cam/);
    assert.match(node.info, /confidence 0\.55/, "info mirrors the formatted confidence");
    assert.equal(edge.intensity, LLM_CONFIDENCE);
  });

  test("GNN-shape classification carries its own confidence + reason", () => {
    const node = ghostNode();
    const c = {
      engine: "XEngine", dispatcher: "prism_turning",
      confidence: 0.74, reason: "GNN tier-5 k-NN label-prop (voteShare 0.81, k=12)",
    };
    const edge = classificationToGraphUpdate(node, c, "qwen2.5-coder:7b");
    assert.equal(node.confidence, 0.74);
    assert.equal(node.reason, c.reason);
    assert.match(node.info, /GNN tier-5/);
    assert.match(node.info, /confidence 0\.74/, "info mirrors the formatted confidence");
    assert.equal(edge.intensity, 0.74);
  });

  test("returns a well-formed proposed-wire edge", () => {
    const edge = classificationToGraphUpdate(
      ghostNode(), { engine: "XEngine", dispatcher: "prism_calc", confidence: 0.8, reason: "r" }, "m");
    assert.deepEqual(edge, {
      from: "ghost.unwired.X", to: "dispatcher.prism_calc", type: "ghost-wire",
      relation: "proposed-wire", status: "proposed", intensity: 0.8,
    });
  });

  test("rejects an invalid / __proto__ dispatcher with null (node untouched)", () => {
    for (const bad of ["__proto__", "constructor", "notprism", "", "prism_", "PRISM_CAM"]) {
      const node = ghostNode();
      const edge = classificationToGraphUpdate(
        node, { engine: "XEngine", dispatcher: bad, confidence: 0.9, reason: "r" }, "m");
      assert.equal(edge, null, bad);
      assert.equal(node.proposed_wiring, "UNKNOWN", `${bad} must not mutate the node`);
    }
  });

  test("returns null for a missing node or classification", () => {
    assert.equal(classificationToGraphUpdate(null, { dispatcher: "prism_cam" }, "m"), null);
    assert.equal(classificationToGraphUpdate(ghostNode(), null, "m"), null);
  });

  test("non-finite confidence falls back to the LLM confidence", () => {
    for (const badConf of [NaN, Infinity, "0.5", undefined]) {
      const node = ghostNode();
      const edge = classificationToGraphUpdate(
        node, { engine: "XEngine", dispatcher: "prism_cam", confidence: badConf, reason: "r" }, "m");
      assert.equal(node.confidence, LLM_CONFIDENCE, String(badConf));
      assert.equal(edge.intensity, LLM_CONFIDENCE);
    }
  });

  test("empty-string reason falls back to the LLM default reason", () => {
    const node = ghostNode();
    classificationToGraphUpdate(
      node, { engine: "XEngine", dispatcher: "prism_cam", confidence: 0.7, reason: "" }, "qwen");
    assert.equal(node.reason, "LLM-classified via qwen");
  });
});
