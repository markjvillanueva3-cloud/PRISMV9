// scripts/system-viz-node-dispatch.test.mjs

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  parseActionWikiId,
  parseActionLabel,
  parseDispatcherRouterId,
  parseDispatcherRouterLabel,
  parseUnitId,
  parseMilestoneId,
  routeNode,
  loadGraph,
  findNode,
  main,
} from "./system-viz-node-dispatch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, "system-viz-node-dispatch.mjs");
const REPO_ROOT = resolve(__dirname, "..");

// ---------- parseArgs ----------------------------------------------------

describe("parseArgs", () => {
  test("defaults", () => {
    const o = parseArgs([]);
    assert.equal(o.nodeId, null);
    assert.equal(o.graphPath, null);
    assert.equal(o.json, true);
  });

  test("--node-id sets nodeId", () => {
    assert.equal(parseArgs(["--node-id", "ghost.ms.foo"]).nodeId, "ghost.ms.foo");
  });

  test("--text flips to text mode", () => {
    assert.equal(parseArgs(["--text"]).json, false);
  });

  test("--graph-path passes through", () => {
    assert.equal(parseArgs(["--graph-path", "/tmp/g.json"]).graphPath, "/tmp/g.json");
  });

  test("unknown flag throws BAD_ARG", () => {
    assert.throws(() => parseArgs(["--bogus"]), /unknown flag/);
  });
});

// ---------- ID parsers ---------------------------------------------------

describe("parseActionWikiId", () => {
  test("canonical action wiki id", () => {
    const p = parseActionWikiId("wiki.architecture.actions_calc_gcode-envelope");
    assert.deepEqual(p, { dispatcher: "calc", action: "gcode_envelope" });
  });

  test("multi-segment action", () => {
    const p = parseActionWikiId("wiki.architecture.actions_cam_cam-hypermill-inhost-frame-to-envelope");
    assert.equal(p.dispatcher, "cam");
    assert.equal(p.action, "cam_hypermill_inhost_frame_to_envelope");
  });

  test("returns null on non-action ids", () => {
    assert.equal(parseActionWikiId("wiki.architecture.engines_foo"), null);
    assert.equal(parseActionWikiId("ghost.ms.bar"), null);
    assert.equal(parseActionWikiId(null), null);
    assert.equal(parseActionWikiId(""), null);
  });
});

describe("parseDispatcherRouterId", () => {
  test("canonical dispatcher router id", () => {
    const p = parseDispatcherRouterId("formula.adjusted.businessdispatcher");
    assert.deepEqual(p, { dispatcher: "business" });
  });

  test("camFunctionDispatcher → camfunction", () => {
    const p = parseDispatcherRouterId("formula.adjusted.camfunctiondispatcher");
    assert.equal(p.dispatcher, "camfunction");
  });

  test("returns null on non-router ids", () => {
    assert.equal(parseDispatcherRouterId("formula.adjusted.notarouter"), null);
    assert.equal(parseDispatcherRouterId(null), null);
  });
});

describe("parseUnitId", () => {
  test("canonical unit id", () => {
    const p = parseUnitId("ghost.ms.cam-parity-agi-ms0.u-camp01");
    assert.deepEqual(p, { milestoneSlug: "cam-parity-agi-ms0", unitId: "U-CAMP01" });
  });

  test("upper-cases unit id, preserves milestone slug case", () => {
    const p = parseUnitId("ghost.ms.svb-ms0.u-p0-hook-orphan-reconcile");
    assert.equal(p.unitId, "U-P0-HOOK-ORPHAN-RECONCILE");
    assert.equal(p.milestoneSlug, "svb-ms0");
  });

  test("returns null on milestone ids (no .u-prefix)", () => {
    assert.equal(parseUnitId("ghost.ms.cam-parity-agi-ms0"), null);
  });
});

describe("parseMilestoneId", () => {
  test("canonical milestone id", () => {
    const p = parseMilestoneId("ghost.ms.coord-ms0");
    assert.deepEqual(p, { milestoneSlug: "coord-ms0" });
  });

  test("returns null on unit ids", () => {
    assert.equal(parseMilestoneId("ghost.ms.cam-parity-agi-ms0.u-camp01"), null);
  });
});

// ---------- routeNode — precedence ---------------------------------------

describe("parseActionLabel — case-preserving recovery", () => {
  test("canonical action label", () => {
    assert.deepEqual(parseActionLabel("calc:`gcode_envelope`"), {
      dispatcher: "calc", action: "gcode_envelope",
    });
  });

  test("camelCase dispatcher recovered from label", () => {
    assert.deepEqual(parseActionLabel("adaptiveControl:`acal`"), {
      dispatcher: "adaptiveControl", action: "acal",
    });
  });

  test("camelCase action recovered from label", () => {
    assert.deepEqual(parseActionLabel("adaptiveControl:`adaChat`"), {
      dispatcher: "adaptiveControl", action: "adaChat",
    });
  });

  test("returns null on non-canonical labels", () => {
    assert.equal(parseActionLabel("router · business"), null);
    assert.equal(parseActionLabel("plain text"), null);
    assert.equal(parseActionLabel(null), null);
  });
});

describe("parseDispatcherRouterLabel", () => {
  test("recovers camelCase from canonical router label", () => {
    assert.deepEqual(parseDispatcherRouterLabel("router · adaptiveControl"), {
      dispatcher: "adaptiveControl",
    });
  });

  test("ignores trailing engine-count parens", () => {
    assert.deepEqual(parseDispatcherRouterLabel("router · cam\n(9 engines)"), {
      dispatcher: "cam",
    });
  });

  test("returns null on non-router labels", () => {
    assert.equal(parseDispatcherRouterLabel("calc:`gcode_envelope`"), null);
    assert.equal(parseDispatcherRouterLabel(null), null);
  });
});

describe("routeNode — direct action wiki precedence (label-first, camelCase-preserving)", () => {
  test("label preferred over lossy id (P0 fix — adaptiveControl preserved)", () => {
    const r = routeNode({
      id: "wiki.architecture.actions_adaptivecontrol_adachat",
      kind: "wiki_entry",
      label: "adaptiveControl:`adaChat`",
      layer: "L8",
    });
    assert.equal(r.kind, "direct-action");
    assert.equal(r.dispatcher, "prism_adaptiveControl");
    assert.equal(r.action, "adaChat");
    assert.equal(r.confidence, 1.0);
    assert.equal(r.reason, "action-wiki-label-match");
  });

  test("L8 action wiki with simple lowercase dispatcher", () => {
    const r = routeNode({
      id: "wiki.architecture.actions_calc_gcode-envelope",
      kind: "wiki_entry",
      label: "calc:`gcode_envelope`",
      layer: "L8",
    });
    assert.equal(r.dispatcher, "prism_calc");
    assert.equal(r.action, "gcode_envelope");
    assert.equal(r.confidence, 1.0);
  });

  test("missing label falls back to lossy-id parse with reduced confidence", () => {
    const r = routeNode({
      id: "wiki.architecture.actions_cam_cam-hypermill-inhost-frame-to-envelope",
      kind: "wiki_entry",
      // no label
    });
    assert.equal(r.kind, "direct-action");
    assert.equal(r.dispatcher, "prism_cam");
    assert.equal(r.action, "cam_hypermill_inhost_frame_to_envelope");
    assert.equal(r.confidence, 0.85);
    assert.equal(r.reason, "action-wiki-id-match-lossy-case");
  });
});

describe("routeNode — dispatcher router (P1 fix: master_index_query, not dispatcher_map_compact)", () => {
  test("router node routes to master_index_query (filter arg not supported by dispatcher_map_compact)", () => {
    const r = routeNode({
      id: "formula.adjusted.businessdispatcher",
      kind: "dispatcher_router",
      label: "router · business",
    });
    assert.equal(r.kind, "dispatcher-introspect");
    assert.equal(r.dispatcher, "prism_session");
    assert.equal(r.action, "master_index_query");
    assert.equal(r.args.query, "business");
    // Should NOT emit a dispatcher_map_compact route (that action ignores filter)
    assert.notEqual(r.action, "dispatcher_map_compact");
  });

  test("camelCase router dispatcher recovered from label", () => {
    const r = routeNode({
      id: "formula.adjusted.adaptivecontroldispatcher",
      kind: "dispatcher_router",
      label: "router · adaptiveControl\n(9 engines)",
    });
    assert.equal(r.args.query, "adaptiveControl");
  });
});

describe("routeNode — milestone/unit (P1 fix: unit_key not unit_id; no milestone_id)", () => {
  test("unit node → prism_dev:roadmap_tool_plan_query with unit_key", () => {
    const r = routeNode({
      id: "ghost.ms.cam-parity-agi-ms0.u-camp01",
      kind: "planned-unit",
      label: "U-CAMP01",
    });
    assert.equal(r.kind, "unit-query");
    assert.equal(r.dispatcher, "prism_dev");
    assert.equal(r.action, "roadmap_tool_plan_query");
    // Contract: dispatcher reads params.unit_key (devDispatcher.ts:4691)
    assert.equal(r.args.unit_key, "U-CAMP01");
    // milestone_id MUST NOT be emitted — dispatcher doesn't accept it
    assert.equal(r.args.milestone_id, undefined);
    assert.equal(r.args.unit_id, undefined);
  });

  test("priority-unit routes via unit_key", () => {
    const r = routeNode({
      id: "ghost.ms.svb-ms0.u-p0-hook-orphan-reconcile",
      kind: "priority-unit",
      label: "U-P0-HOOK-ORPHAN-RECONCILE",
    });
    assert.equal(r.args.unit_key, "U-P0-HOOK-ORPHAN-RECONCILE");
  });

  test("bridge-unit routes via unit_key", () => {
    const r = routeNode({
      id: "ghost.ms.bridge-synergy.u-b07",
      kind: "bridge-unit",
      label: "U-B07",
    });
    assert.equal(r.args.unit_key, "U-B07");
  });

  test("milestone node → master_index_query (no milestone-scoped roadmap action exists)", () => {
    const r = routeNode({
      id: "ghost.ms.coord-ms0",
      kind: "milestone",
      label: "🔻 COORD-MS0",
    });
    assert.equal(r.kind, "milestone-query");
    assert.equal(r.dispatcher, "prism_session");
    assert.equal(r.action, "master_index_query");
    assert.equal(r.args.query, "COORD-MS0");
    // Must NOT route to roadmap_tool_plan_query — it accepts unit_key only
    assert.notEqual(r.action, "roadmap_tool_plan_query");
  });
});

describe("routeNode — engine node (P1 fix: prism_agent:capabilities, not prism_session)", () => {
  test("engine routes to prism_agent:capabilities with op=engine_dependents + name", () => {
    const r = routeNode({
      id: "reg.aisubsystemregistry",
      kind: "engine",
      label: "AISubsystem",
    });
    assert.equal(r.kind, "engine-dependents");
    // Contract: engine_dependents lives in agentDispatcher.ts:314, NOT session
    assert.equal(r.dispatcher, "prism_agent");
    assert.equal(r.action, "capabilities");
    assert.equal(r.args.op, "engine_dependents");
    assert.equal(r.args.name, "AISubsystem");
  });

  test("engine without label falls back to id as name", () => {
    const r = routeNode({ id: "reg.foo", kind: "engine" });
    assert.equal(r.args.name, "reg.foo");
  });
});

describe("routeNode — fallback", () => {
  test("unknown kind → master_index_query with label, confidence 0.35", () => {
    const r = routeNode({
      id: "unknown.shape.x",
      kind: "unknown",
      label: "some search term",
    });
    assert.equal(r.kind, "master-index-fallback");
    assert.equal(r.dispatcher, "prism_session");
    assert.equal(r.action, "master_index_query");
    assert.equal(r.args.query, "some search term");
    // Confidence lowered from 0.5 to 0.35 so click-handler can gate UI on confidence ≥ 0.5
    assert.equal(r.confidence, 0.35);
  });

  test("null/undefined node → empty-query fallback confidence 0", () => {
    const r = routeNode(null);
    assert.equal(r.kind, "master-index-fallback");
    assert.equal(r.confidence, 0);
    assert.equal(r.args.query, "");
  });

  test("node without id → fallback confidence 0", () => {
    const r = routeNode({ kind: "engine" });
    assert.equal(r.confidence, 0);
  });

  test("planned-unit with malformed id falls through to fallback", () => {
    const r = routeNode({
      id: "not-a-unit-id",
      kind: "planned-unit",
      label: "some unit",
    });
    assert.equal(r.kind, "master-index-fallback");
  });
});

// ---------- graph I/O ----------------------------------------------------

describe("loadGraph / findNode", () => {
  test("missing file throws GRAPH_NOT_FOUND", () => {
    assert.throws(() => loadGraph("/nope/missing.json"), /system-graph not found/);
  });

  test("findNode returns null for missing id", () => {
    const fakeGraph = { nodes: [{ id: "a" }, { id: "b" }] };
    assert.equal(findNode(fakeGraph, "z"), null);
    assert.equal(findNode(fakeGraph, "a").id, "a");
  });

  test("findNode tolerates missing nodes array", () => {
    assert.equal(findNode({}, "a"), null);
    assert.equal(findNode(null, "a"), null);
  });
});

// ---------- CLI smoke + real-data E2E ------------------------------------

describe("CLI smoke", () => {
  function runCli(args) {
    return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: "utf8", timeout: 60_000, cwd: REPO_ROOT,
    });
  }

  test("--help → exit 0", () => {
    const r = runCli(["--help"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /system-viz-node-dispatch/);
  });

  test("missing --node-id → exit 2", () => {
    const r = runCli([]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--node-id required/);
  });

  test("unknown flag → exit 2", () => {
    const r = runCli(["--nope"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown flag/);
  });

  test("REAL-DATA E2E — known action wiki node resolves", () => {
    const r = runCli([
      "--node-id", "wiki.architecture.actions_calc_gcode-envelope",
    ]);
    if (r.status !== 0) {
      // Live graph may not contain this exact node — accept skip but never crash with code other than 0|2
      assert.equal(r.status, 2, `unexpected status: ${r.status} stderr=${r.stderr}`);
      assert.match(r.stderr, /node not found|graph/);
      return;
    }
    const out = JSON.parse(r.stdout);
    assert.equal(out.route.kind, "direct-action");
    // New contract: prism_<dispatcher> prefix matches actual MCP tool name
    assert.equal(out.route.dispatcher, "prism_calc");
    assert.equal(out.route.action, "gcode_envelope");
    // Confidence 1.0 if label parsed (camelCase recovery), 0.85 if id-only
    assert.ok(out.route.confidence === 1.0 || out.route.confidence === 0.85);
  });

  test("REAL-DATA E2E — known milestone node resolves", () => {
    const r = runCli([
      "--node-id", "ghost.ms.coord-ms0",
    ]);
    if (r.status === 0) {
      const out = JSON.parse(r.stdout);
      // Live milestone may be classified as milestone OR unknown depending on graph regen
      assert.ok(
        ["milestone-query", "master-index-fallback"].includes(out.route.kind),
        `unexpected route kind: ${out.route.kind}`,
      );
    } else {
      assert.equal(r.status, 2);
    }
  });

  test("REAL-DATA E2E — nonexistent node id → exit 2", () => {
    const r = runCli([
      "--node-id", "this.node.does.not.exist.zzzzz",
    ]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /node not found/);
  });
});

// ---------- main() with explicit args ------------------------------------

describe("main() programmatic", () => {
  test("help via main → 0", () => {
    const code = main(["--help"]);
    assert.equal(code, 0);
  });

  test("missing node-id via main → 2", () => {
    const code = main([]);
    assert.equal(code, 2);
  });

  test("bad graph path via main → 2", () => {
    const code = main(["--node-id", "x", "--graph-path", "/nope/missing.json"]);
    assert.equal(code, 2);
  });
});
