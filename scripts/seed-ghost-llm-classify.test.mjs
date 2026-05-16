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
