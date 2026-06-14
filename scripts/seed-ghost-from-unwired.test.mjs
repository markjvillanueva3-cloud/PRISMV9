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
  MCP_TOOL_TO_DISP_NODE_ID,
  mcpToolToDispNodeId,
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

describe("U-VIZ-G4-SEEDER-FIX — MCP tool name → graph node id (2026-05-20 sierra)", () => {
  // Live G4 dead-pixel sweep on 2026-05-20 found 569 dead edges in the merged
  // ~250K-node system-graph.json; ~500 traced to this seeder emitting
  // `dispatcher.<mcp_tool_name>` edge targets that never existed in-graph
  // (real ids are `disp.<file-derived>`). These tests pin the fix.

  test("MCP_TOOL_TO_DISP_NODE_ID is frozen + non-empty", () => {
    assert.ok(Object.keys(MCP_TOOL_TO_DISP_NODE_ID).length >= 16);
    assert.throws(() => { MCP_TOOL_TO_DISP_NODE_ID.injected = "disp.fake"; });
  });

  test("every value uses the canonical `disp.` prefix (G1 PREFIX_TO_TYPE SSOT)", () => {
    for (const [k, v] of Object.entries(MCP_TOOL_TO_DISP_NODE_ID)) {
      assert.ok(typeof v === "string" && v.length > 0, `${k} → empty/non-string`);
      assert.ok(v.startsWith("disp."), `${k} → ${v} (must start with 'disp.')`);
      // Inverse guard — the historical bug prefix must NEVER reappear here.
      assert.ok(!v.startsWith("dispatcher."), `${k} → ${v} (must NOT use legacy 'dispatcher.' prefix)`);
    }
  });

  test("every dispatcher emitted by inference rules has a mapping entry", () => {
    const ruleTargets = new Set(DISPATCHER_INFERENCE_RULES.map((r) => r.dispatcher));
    const mapped = new Set(Object.keys(MCP_TOOL_TO_DISP_NODE_ID));
    const missing = [...ruleTargets].filter((t) => !mapped.has(t));
    assert.deepEqual(missing, [], `inference rules emit dispatcher names with no graph-id mapping: ${missing.join(", ")}`);
  });

  test("mcpToolToDispNodeId — happy path (canonical 16 mappings)", () => {
    assert.equal(mcpToolToDispNodeId("prism_calc"), "disp.calcdispatcher");
    assert.equal(mcpToolToDispNodeId("prism_safety"), "disp.safetydispatcher");
    assert.equal(mcpToolToDispNodeId("prism_cam"), "disp.camdispatcher");
    assert.equal(mcpToolToDispNodeId("prism_ai"), "disp.aireasoningdispatcher");
    assert.equal(mcpToolToDispNodeId("prism_intelligence"), "disp.intelligencedispatcher");
    assert.equal(mcpToolToDispNodeId("prism_5axis"), "disp.fiveaxisdispatcher");
  });

  test("mcpToolToDispNodeId — UNKNOWN inference target → harmless fallback", () => {
    // UNKNOWN never reaches edge emission anyway (MIN_CONFIDENCE-gated upstream),
    // but the resolver still must not throw and must not emit the legacy prefix.
    const r = mcpToolToDispNodeId("UNKNOWN");
    assert.equal(r, "disp.unknown");
    assert.ok(!r.startsWith("dispatcher."));
  });

  test("mcpToolToDispNodeId — unmapped key → `disp.<lowercased>` fallback (better than legacy 'dispatcher.*')", () => {
    // R12: a future inference rule whose target isn't in the map should
    // surface as ONE dead pixel on the next G4 sweep, not silently miswire.
    // The fallback uses the canonical `disp.` prefix so the wrong-pattern bug
    // (dead-edge target never exists in graph) is bounded to one edge.
    const r = mcpToolToDispNodeId("prism_brand_new_tool");
    assert.equal(r, "disp.prism_brand_new_tool");
    assert.ok(r.startsWith("disp."));
    assert.ok(!r.startsWith("dispatcher."));
  });

  test("mcpToolToDispNodeId — empty/non-string → 'disp.unknown' (no throw)", () => {
    assert.equal(mcpToolToDispNodeId(""), "disp.unknown");
    assert.equal(mcpToolToDispNodeId(null), "disp.unknown");
    assert.equal(mcpToolToDispNodeId(undefined), "disp.unknown");
    assert.equal(mcpToolToDispNodeId(42), "disp.unknown");
    assert.equal(mcpToolToDispNodeId({}), "disp.unknown");
  });

  test("mcpToolToDispNodeId — adversarial: NaN, Infinity, prototype-pollution", () => {
    assert.equal(mcpToolToDispNodeId(NaN), "disp.unknown");
    assert.equal(mcpToolToDispNodeId(Infinity), "disp.unknown");
    // Prototype-key lookup must NOT succeed (the map is Object.freeze of a
    // plain object literal; accessing `__proto__` or `constructor` should miss
    // and fall through to the fallback, NOT return a Function object).
    const proto = mcpToolToDispNodeId("__proto__");
    assert.equal(typeof proto, "string");
    assert.ok(proto.startsWith("disp."));
    const ctor = mcpToolToDispNodeId("constructor");
    assert.equal(typeof ctor, "string");
    assert.ok(ctor.startsWith("disp."));
  });

  test("buildGhostFromUnwired — edge.to uses `disp.<file>` not `dispatcher.<mcp_tool>` (THE CORE REGRESSION GUARD)", () => {
    // The bug: for EVERY high-confidence inference, edge.to was
    // `dispatcher.<inf.dispatcher>` — a node id that NEVER existed in the
    // graph. This is the test that pins the fix.
    const samples = [
      ["MillForceEngine", "disp.calcdispatcher"],
      ["CollisionDetectorEngine", "disp.safetydispatcher"],
      ["GCodeTemplateEngine", "disp.camdispatcher"],
      ["LatheGroovePostEngine", "disp.turningdispatcher"],
      ["NeuralPredictorEngine", "disp.aireasoningdispatcher"],
    ];
    for (const [engineName, expected] of samples) {
      const r = buildGhostFromUnwired({ name: engineName, path: "x", mtime: null, sizeKB: 5 });
      assert.ok(r.edge, `${engineName} should emit an edge`);
      assert.equal(r.edge.to, expected, `${engineName} → wrong edge.to`);
      assert.ok(r.edge.to.startsWith("disp."), `${engineName} → edge.to must use canonical 'disp.' prefix`);
      assert.ok(!r.edge.to.startsWith("dispatcher."), `${engineName} → edge.to must NEVER use legacy 'dispatcher.' prefix`);
    }
  });

  test("buildGhostFromUnwired — UNKNOWN inference preserves no-edge behavior (existing contract intact)", () => {
    const r = buildGhostFromUnwired({ name: "XyzzyFooBar", path: "x", mtime: null, sizeKB: 5 });
    assert.equal(r.node.proposed_wiring, "UNKNOWN");
    assert.equal(r.edge, null, "UNKNOWN must NOT emit an edge — preserves MIN_CONFIDENCE gate");
  });

  test("source guard — legacy `dispatcher.${inf.dispatcher}` literal is GONE from edge construction", () => {
    // Fail-on-revert oracle. If anyone re-introduces the original buggy
    // template literal, this test screams.
    const SRC = fs.readFileSync(
      path.join(import.meta.dirname, "seed-ghost-from-unwired.mjs"),
      "utf8",
    );
    assert.ok(
      !SRC.includes("`dispatcher.${inf.dispatcher}`"),
      "seed-ghost must NEVER emit `dispatcher.<mcp_tool_name>` edge targets — use mcpToolToDispNodeId() instead",
    );
    // Positive — the new resolver call must be present at the edge site.
    assert.ok(
      SRC.includes("mcpToolToDispNodeId(inf.dispatcher)"),
      "edge.to must route through mcpToolToDispNodeId() to translate MCP tool name → real graph node id",
    );
  });
});

describe("graph write — compact serialization (V8 string-cap regression guard)", () => {
  // Regression (2026-05-18, hotel): the merged system-graph.json is ~390 MB.
  // Pretty-printing it (`JSON.stringify(g, null, 2)`) inflates the string past
  // V8's ~512 MB max-string-length cap → `RangeError: Invalid string length`,
  // which crashed the seed stage out of every `regen-viz --full` once the graph
  // crossed the size threshold. Both write sites (--apply + --revert) must
  // serialize compact, matching merge-augmentations.mjs's `JSON.stringify(G)`.
  // Structural source guard — same oracle class as regen-viz-seed-ghost-stage.test.mjs.
  const SRC = fs.readFileSync(
    path.join(import.meta.dirname, "seed-ghost-from-unwired.mjs"),
    "utf8",
  );
  test("never pretty-prints the merged graph (would exceed V8 string cap)", () => {
    assert.ok(
      !SRC.includes("JSON.stringify(g, null, 2)"),
      "seed-ghost must NOT pretty-print the ~390MB merged graph — use compact JSON.stringify(g)",
    );
  });
  test("both graph write sites (--apply + --revert) serialize compact", () => {
    const compactWrites = SRC.match(/atomicWrite\(GRAPH_PATH, JSON\.stringify\(g\)\)/g) || [];
    assert.equal(
      compactWrites.length,
      2,
      "expected exactly 2 compact graph writes (the --apply and --revert paths)",
    );
  });
});
