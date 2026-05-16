#!/usr/bin/env node
/**
 * engine-node-extractor.test.mjs — tests for NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE
 * Run: node --test scripts/lib/engine-node-extractor.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classNameFromPath,
  readEngineFile,
  extractEngineNodes,
  mergeIntoGraph,
} from "./engine-node-extractor.mjs";

function mkTmp(prefix = "engine-test-") {
  const dir = path.join(os.tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }

describe("classNameFromPath", () => {
  test("strips .ts extension and accepts CamelCase basenames", () => {
    assert.equal(classNameFromPath("/x/y/MillForceEngine.ts"), "MillForceEngine");
    assert.equal(classNameFromPath("FooEngine.ts"), "FooEngine");
  });

  test("strips .mjs and .js too", () => {
    assert.equal(classNameFromPath("BarEngine.mjs"), "BarEngine");
    assert.equal(classNameFromPath("BarEngine.js"), "BarEngine");
  });

  test("returns null for lowercase-first filenames", () => {
    assert.equal(classNameFromPath("lowercase.ts"), null);
  });

  test("returns null for non-string input", () => {
    assert.equal(classNameFromPath(null), null);
    assert.equal(classNameFromPath(undefined), null);
    assert.equal(classNameFromPath(123), null);
  });
});

describe("readEngineFile", () => {
  test("extracts class name from `export class X`", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "FooEngine.ts");
      fs.writeFileSync(file, `export class FooEngine { static do() {} }`);
      const r = readEngineFile(file);
      assert.equal(r.className, "FooEngine");
    } finally { cleanup(dir); }
  });

  test("extracts class name from `export default class X`", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "BarEngine.ts");
      fs.writeFileSync(file, `export default class BarEngine {}`);
      const r = readEngineFile(file);
      assert.equal(r.className, "BarEngine");
    } finally { cleanup(dir); }
  });

  test("extracts JSDoc first-line summary", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "BazEngine.ts");
      fs.writeFileSync(file, `/**\n * BazEngine — does the baz thing\n * with extra detail.\n */\nexport class BazEngine {}`);
      const r = readEngineFile(file);
      assert.match(r.jsdoc, /does the baz thing/);
    } finally { cleanup(dir); }
  });

  test("extracts engine imports as deps", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "QuxEngine.ts");
      fs.writeFileSync(file, `
import { Alpha } from "../engines/AlphaEngine.js";
import type { Bravo } from "../engines/BravoEngine.js";
export class QuxEngine {}
`);
      const r = readEngineFile(file);
      assert.ok(r.deps.includes("AlphaEngine"));
      assert.ok(r.deps.includes("BravoEngine"));
    } finally { cleanup(dir); }
  });

  test("does not include self in deps", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "SelfEngine.ts");
      fs.writeFileSync(file, `import "../engines/SelfEngine.js"; export class SelfEngine {}`);
      const r = readEngineFile(file);
      assert.ok(!r.deps.includes("SelfEngine"));
    } finally { cleanup(dir); }
  });

  test("falls back to filename when no `export class` present", () => {
    const dir = mkTmp();
    try {
      const file = path.join(dir, "OrphanEngine.ts");
      fs.writeFileSync(file, `export const x = 1;`);
      const r = readEngineFile(file);
      assert.equal(r.className, "OrphanEngine");
    } finally { cleanup(dir); }
  });

  test("missing file → safe defaults (no throw)", () => {
    const r = readEngineFile("/nope/missing/file.ts");
    assert.equal(r.className, null);
    assert.deepEqual(r.exports, []);
    assert.deepEqual(r.deps, []);
  });
});

describe("extractEngineNodes", () => {
  test("walks directory and emits node per engine", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "AlphaEngine.ts"), `export class AlphaEngine {}`);
      fs.writeFileSync(path.join(dir, "BravoEngine.ts"), `export class BravoEngine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      const labels = r.nodes.map(n => n.label).sort();
      assert.deepEqual(labels, ["AlphaEngine", "BravoEngine"]);
      assert.equal(r.stats.emitted, 2);
    } finally { cleanup(dir); }
  });

  test("skips .test.ts and .d.ts files", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "FooEngine.ts"), `export class FooEngine {}`);
      fs.writeFileSync(path.join(dir, "FooEngine.test.ts"), `export class FooEngineTest {}`);
      fs.writeFileSync(path.join(dir, "types.d.ts"), `export type X = string;`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      assert.equal(r.stats.emitted, 1);
      assert.equal(r.stats.skipped >= 2, true);
    } finally { cleanup(dir); }
  });

  test("emits engine_import edges for cross-engine deps", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "AlphaEngine.ts"), `
import { Bravo } from "../engines/BravoEngine.js";
export class AlphaEngine {}
`);
      fs.writeFileSync(path.join(dir, "BravoEngine.ts"), `export class BravoEngine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      const edge = r.edges.find(e => e.from === "engine.AlphaEngine" && e.to === "engine.BravoEngine");
      assert.ok(edge);
      assert.equal(edge.type, "engine_import");
    } finally { cleanup(dir); }
  });

  test("missing dir → empty result, no throw", () => {
    const r = extractEngineNodes("/nope/missing");
    assert.deepEqual(r.nodes, []);
    assert.deepEqual(r.edges, []);
    assert.equal(r.stats.scanned, 0);
  });

  test("node IDs follow engine.<ClassName> convention", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "MyEngine.ts"), `export class MyEngine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      assert.equal(r.nodes[0].id, "engine.MyEngine");
    } finally { cleanup(dir); }
  });

  test("each node has kind=engine + layer=L5", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "X1Engine.ts"), `export class X1Engine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      assert.equal(r.nodes[0].kind, "engine");
      assert.equal(r.nodes[0].layer, "L5");
    } finally { cleanup(dir); }
  });

  test("layer override honored", () => {
    const dir = mkTmp();
    try {
      fs.writeFileSync(path.join(dir, "X2Engine.ts"), `export class X2Engine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir, layer: "L7" });
      assert.equal(r.nodes[0].layer, "L7");
    } finally { cleanup(dir); }
  });

  test("info field carries JSDoc first line (truncated to 200 chars)", () => {
    const dir = mkTmp();
    try {
      const longDesc = "x".repeat(500);
      fs.writeFileSync(path.join(dir, "BigEngine.ts"), `/**\n * BigEngine — ${longDesc}\n */\nexport class BigEngine {}`);
      const r = extractEngineNodes(dir, { repoRoot: dir });
      assert.ok(r.nodes[0].info.length <= 200);
    } finally { cleanup(dir); }
  });
});

describe("mergeIntoGraph", () => {
  test("merges new nodes + edges into graph", () => {
    const graph = { nodes: [{ id: "old.1" }], edges: [] };
    const ext = {
      nodes: [{ id: "engine.New", kind: "engine" }],
      edges: [{ from: "engine.New", to: "engine.Other", type: "engine_import" }],
    };
    const out = mergeIntoGraph(graph, ext);
    assert.equal(out.nodes.length, 2);
    assert.equal(out.edges.length, 1);
  });

  test("idempotent — re-merging same input doesn't duplicate", () => {
    const graph = { nodes: [{ id: "old.1" }], edges: [] };
    const ext = {
      nodes: [{ id: "engine.A", kind: "engine" }],
      edges: [{ from: "engine.A", to: "engine.B", type: "engine_import" }],
    };
    const out1 = mergeIntoGraph(graph, ext);
    const out2 = mergeIntoGraph(out1, ext);
    assert.equal(out2.nodes.length, out1.nodes.length);
    assert.equal(out2.edges.length, out1.edges.length);
  });

  test("does NOT mutate input graph", () => {
    const graph = { nodes: [{ id: "a" }], edges: [] };
    const before = JSON.stringify(graph);
    mergeIntoGraph(graph, { nodes: [{ id: "b" }], edges: [] });
    assert.equal(JSON.stringify(graph), before);
  });

  test("rejects invalid graph", () => {
    assert.throws(() => mergeIntoGraph(null, { nodes: [], edges: [] }));
    assert.throws(() => mergeIntoGraph({}, { nodes: [], edges: [] }));
  });

  test("empty extraction is a no-op", () => {
    const graph = { nodes: [{ id: "x" }], edges: [{ from: "x", to: "y", type: "ghost-wire" }] };
    const out = mergeIntoGraph(graph, { nodes: [], edges: [] });
    assert.equal(out.nodes.length, 1);
    assert.equal(out.edges.length, 1);
  });
});
