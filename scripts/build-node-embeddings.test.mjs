#!/usr/bin/env node
/**
 * build-node-embeddings.test.mjs — tests for NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
 * Run: node --test scripts/build-node-embeddings.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  nodeEmbedText,
  nodeContentHash,
  quantize,
  dequantize,
  pMap,
} from "./build-node-embeddings.mjs";

describe("nodeEmbedText", () => {
  test("joins kind | label | info", () => {
    const t = nodeEmbedText({ kind: "engine", label: "MillForceEngine", info: "Kienzle force model" });
    assert.equal(t, "engine | MillForceEngine | Kienzle force model");
  });

  test("falls back to id when label missing", () => {
    const t = nodeEmbedText({ kind: "engine", id: "engine.Foo" });
    assert.equal(t, "engine | engine.Foo");
  });

  test("omits empty fields", () => {
    const t = nodeEmbedText({ kind: "engine", label: "X" });
    assert.equal(t, "engine | X");
  });

  test("empty/invalid input → empty string", () => {
    assert.equal(nodeEmbedText(null), "");
    assert.equal(nodeEmbedText(undefined), "");
    assert.equal(nodeEmbedText("not an object"), "");
    assert.equal(nodeEmbedText({}), "");
  });

  test("truncates to 1200 chars", () => {
    const t = nodeEmbedText({ kind: "e", label: "L", info: "x".repeat(5000) });
    assert.ok(t.length <= 1200);
  });
});

describe("nodeContentHash", () => {
  test("deterministic for same node", () => {
    const n = { id: "engine.A", kind: "engine", label: "A", info: "desc" };
    assert.equal(nodeContentHash(n), nodeContentHash(n));
  });

  test("changes when embed text changes", () => {
    const h1 = nodeContentHash({ id: "engine.A", kind: "engine", label: "A", info: "v1" });
    const h2 = nodeContentHash({ id: "engine.A", kind: "engine", label: "A", info: "v2" });
    assert.notEqual(h1, h2);
  });

  test("changes when id changes", () => {
    const h1 = nodeContentHash({ id: "engine.A", label: "X" });
    const h2 = nodeContentHash({ id: "engine.B", label: "X" });
    assert.notEqual(h1, h2);
  });

  test("returns 12-char hex", () => {
    const h = nodeContentHash({ id: "x", label: "y" });
    assert.equal(h.length, 12);
    assert.match(h, /^[0-9a-f]{12}$/);
  });
});

describe("quantize / dequantize", () => {
  test("quantize returns {s, q} with int8 range", () => {
    const vec = [0.5, -0.3, 0.8, -0.1];
    const { s, q } = quantize(vec);
    assert.equal(typeof s, "number");
    assert.equal(q.length, vec.length);
    for (const x of q) assert.ok(x >= -127 && x <= 127 && Number.isInteger(x));
  });

  test("dequantize approximately reconstructs unit-normalized vector", () => {
    const vec = [3, 4, 0, 0]; // norm = 5 → unit = [0.6, 0.8, 0, 0]
    const rec = quantize(vec);
    const back = dequantize({ ...rec, q: rec.q });
    // cosine of reconstructed vs unit should be ~1
    const unit = [0.6, 0.8, 0, 0];
    let dot = 0, nb = 0, nu = 0;
    for (let i = 0; i < 4; i++) { dot += back[i] * unit[i]; nb += back[i] ** 2; nu += unit[i] ** 2; }
    const cos = dot / (Math.sqrt(nb) * Math.sqrt(nu) || 1);
    assert.ok(cos > 0.99, `cosine ${cos} should be >0.99`);
  });

  test("dequantize handles invalid record → null", () => {
    assert.equal(dequantize(null), null);
    assert.equal(dequantize({}), null);
    assert.equal(dequantize({ q: "not array", s: 1 }), null);
    assert.equal(dequantize({ q: [1, 2], s: "not number" }), null);
  });

  test("quantize handles zero vector without NaN", () => {
    const { s, q } = quantize([0, 0, 0]);
    assert.ok(Number.isFinite(s));
    for (const x of q) assert.ok(Number.isFinite(x));
  });
});

describe("pMap — bounded concurrency", () => {
  test("preserves order", async () => {
    const r = await pMap([1, 2, 3, 4, 5], 2, async (x) => x * 10);
    assert.deepEqual(r, [10, 20, 30, 40, 50]);
  });

  test("respects concurrency limit", async () => {
    let active = 0, maxActive = 0;
    await pMap([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 10));
      active--;
    });
    assert.ok(maxActive <= 3, `maxActive=${maxActive} should be <=3`);
  });

  test("empty array → empty result", async () => {
    const r = await pMap([], 4, async (x) => x);
    assert.deepEqual(r, []);
  });

  test("concurrency larger than array size works", async () => {
    const r = await pMap([1, 2], 100, async (x) => x + 1);
    assert.deepEqual(r, [2, 3]);
  });

  test("propagates fn results including async work", async () => {
    const r = await pMap([1, 2, 3], 2, async (x) => {
      await new Promise(res => setTimeout(res, 1));
      return x * x;
    });
    assert.deepEqual(r, [1, 4, 9]);
  });
});
