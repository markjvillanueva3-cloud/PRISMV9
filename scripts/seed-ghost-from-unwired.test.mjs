#!/usr/bin/env node
/**
 * seed-ghost-from-unwired.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
 * Run: node --test scripts/seed-ghost-from-unwired.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inferDispatcher,
  splitCamelCase,
  listUnwiredEngines,
  buildGhostFromUnwired,
  DISPATCHER_INFERENCE_RULES,
  MIN_CONFIDENCE,
} from "./seed-ghost-from-unwired.mjs";

describe("splitCamelCase", () => {
  test("simple CamelCase → space-separated", () => {
    assert.equal(splitCamelCase("MillForceEngine"), "Mill Force Engine");
  });
  test("consecutive caps → split at last", () => {
    assert.equal(splitCamelCase("GCodeEngine"), "G Code Engine");
  });
  test("snake_case → space", () => {
    assert.equal(splitCamelCase("mill_force_engine"), "mill force engine");
  });
  test("kebab-case → space", () => {
    assert.equal(splitCamelCase("mill-force-engine"), "mill force engine");
  });
  test("empty / non-string → empty", () => {
    assert.equal(splitCamelCase(""), "");
    assert.equal(splitCamelCase(null), "");
    assert.equal(splitCamelCase(42), "");
  });
  test("already-spaced preserved", () => {
    assert.equal(splitCamelCase("Mill Force"), "Mill Force");
  });
});

describe("inferDispatcher", () => {
  test("physics keyword (force) → prism_calc with high confidence", () => {
    const r = inferDispatcher("MillForceEngine");
    assert.equal(r.dispatcher, "prism_calc");
    assert.ok(r.confidence >= 0.8);
  });
  test("safety keyword (collision) → prism_safety", () => {
    const r = inferDispatcher("CollisionDetectorEngine");
    assert.equal(r.dispatcher, "prism_safety");
  });
  test("CAM keyword (gcode) → prism_cam", () => {
    const r = inferDispatcher("GCodeTemplateEngine");
    assert.equal(r.dispatcher, "prism_cam");
  });
  test("lathe keyword → prism_turning", () => {
    const r = inferDispatcher("LatheGroovePostEngine");
    assert.equal(r.dispatcher, "prism_turning");
  });
  test("AI keyword (neural) → prism_ai", () => {
    const r = inferDispatcher("NeuralPredictorEngine");
    assert.equal(r.dispatcher, "prism_ai");
  });
  test("session keyword (handoff) → prism_session", () => {
    const r = inferDispatcher("HandoffPersistenceEngine");
    assert.equal(r.dispatcher, "prism_session");
  });
  test("no keyword match → UNKNOWN with confidence 0", () => {
    // Use a deliberately keyword-free name (no domain words after the camelCase
    // split). "XyzzyFooBar" → tokenized "Xyzzy Foo Bar" — no rule matches.
    const r = inferDispatcher("XyzzyFooBar");
    assert.equal(r.dispatcher, "UNKNOWN");
    assert.equal(r.confidence, 0);
  });
  test("empty / non-string → UNKNOWN", () => {
    assert.equal(inferDispatcher("").dispatcher, "UNKNOWN");
    assert.equal(inferDispatcher(null).dispatcher, "UNKNOWN");
    assert.equal(inferDispatcher(undefined).dispatcher, "UNKNOWN");
  });
  test("DISPATCHER_INFERENCE_RULES is frozen + non-empty", () => {
    assert.ok(DISPATCHER_INFERENCE_RULES.length >= 10);
    assert.throws(() => { DISPATCHER_INFERENCE_RULES.push({}); });
  });
});

describe("listUnwiredEngines", () => {
  test("engine NOT in any dispatcher → unwired", () => {
    const engDir = path.join(os.tmpdir(), `eng-${Date.now()}`);
    const dispDir = path.join(os.tmpdir(), `disp-${Date.now()}`);
    try {
      fs.mkdirSync(engDir, { recursive: true });
      fs.mkdirSync(dispDir, { recursive: true });
      fs.writeFileSync(path.join(engDir, "WiredEngine.ts"), "export class WiredEngine {}");
      fs.writeFileSync(path.join(engDir, "UnwiredEngine.ts"), "export class UnwiredEngine {}");
      fs.writeFileSync(path.join(dispDir, "fooDispatcher.ts"), "import { WiredEngine } from '../../engines/WiredEngine';");
      const r = listUnwiredEngines(engDir, dispDir);
      assert.equal(r.length, 1);
      assert.equal(r[0].name, "UnwiredEngine");
    } finally {
      try { fs.rmSync(engDir, { recursive: true, force: true }); } catch { /* ignore */ }
      try { fs.rmSync(dispDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("skips .test.ts + .d.ts + index", () => {
    const engDir = path.join(os.tmpdir(), `eng2-${Date.now()}`);
    const dispDir = path.join(os.tmpdir(), `disp2-${Date.now()}`);
    try {
      fs.mkdirSync(engDir, { recursive: true });
      fs.mkdirSync(dispDir, { recursive: true });
      fs.writeFileSync(path.join(engDir, "RealEngine.ts"), "x");
      fs.writeFileSync(path.join(engDir, "ShouldSkip.test.ts"), "x");
      fs.writeFileSync(path.join(engDir, "ShouldSkip.d.ts"), "x");
      fs.writeFileSync(path.join(engDir, "index.ts"), "x");
      // empty dispatcher dir
      const r = listUnwiredEngines(engDir, dispDir);
      assert.equal(r.length, 1);
      assert.equal(r[0].name, "RealEngine");
    } finally {
      try { fs.rmSync(engDir, { recursive: true, force: true }); } catch { /* ignore */ }
      try { fs.rmSync(dispDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  test("missing dirs → empty array (no throw)", () => {
    const r = listUnwiredEngines("/nope/eng", "/nope/disp");
    assert.deepEqual(r, []);
  });

  test("respects --limit opt", () => {
    const engDir = path.join(os.tmpdir(), `eng3-${Date.now()}`);
    const dispDir = path.join(os.tmpdir(), `disp3-${Date.now()}`);
    try {
      fs.mkdirSync(engDir, { recursive: true });
      fs.mkdirSync(dispDir, { recursive: true });
      for (let i = 0; i < 10; i++) fs.writeFileSync(path.join(engDir, `E${i}.ts`), "x");
      const r = listUnwiredEngines(engDir, dispDir, { limit: 3 });
      assert.equal(r.length, 3);
    } finally {
      try { fs.rmSync(engDir, { recursive: true, force: true }); } catch { /* ignore */ }
      try { fs.rmSync(dispDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });
});

describe("buildGhostFromUnwired", () => {
  test("high-confidence engine → emits node + edge", () => {
    const r = buildGhostFromUnwired({ name: "MillForceEngine", path: "x", mtime: null, sizeKB: 5 });
    assert.equal(r.node.kind, "ghost.unwired-engine");
    assert.equal(r.node.layer, "L13");
    assert.equal(r.node.proposed_wiring, "prism_calc");
    assert.ok(r.edge);
    assert.equal(r.edge.relation, "proposed-wire");
    assert.equal(r.edge.from, "ghost.unwired.MillForceEngine");
  });
  test("unknown engine → emits node BUT no edge", () => {
    const r = buildGhostFromUnwired({ name: "RandomBlobThing", path: "x", mtime: null, sizeKB: 5 });
    assert.equal(r.node.proposed_wiring, "UNKNOWN");
    assert.equal(r.edge, null);
  });
  test("size scaling clamped to 2..12", () => {
    const small = buildGhostFromUnwired({ name: "X", path: "x", mtime: null, sizeKB: 1 });
    const huge = buildGhostFromUnwired({ name: "Y", path: "x", mtime: null, sizeKB: 500 });
    assert.ok(small.node.size >= 2);
    assert.ok(huge.node.size <= 12);
  });
  test("MIN_CONFIDENCE gate honored", () => {
    // Confidence exactly at threshold emits edge
    const sample = buildGhostFromUnwired({ name: "BlueprintIntakeEngine", path: "x", mtime: null, sizeKB: 5 });
    assert.equal(sample.node.confidence >= MIN_CONFIDENCE, sample.edge !== null);
  });
});
