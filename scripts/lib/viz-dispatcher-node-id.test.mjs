#!/usr/bin/env node
/**
 * Tests for viz-dispatcher-node-id.mjs — the canonical MCP-tool → disp node-id
 * resolver. Real assertions (reference values + the dead-edge regression that
 * motivated the module), NOT toBeDefined stubs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId } from "./viz-dispatcher-node-id.mjs";

test("the load-bearing G4 case: prism_calc resolves to the file-derived disp node id (NOT dispatcher.prism_calc)", () => {
  assert.equal(mcpToolToDispNodeId("prism_calc"), "disp.calcdispatcher");
  // The exact bug this module kills — the old producers emitted this dead target:
  assert.notEqual(mcpToolToDispNodeId("prism_calc"), "dispatcher.prism_calc");
});

test("every table entry resolves to its file-derived disp.* id", () => {
  const expected = {
    prism_calc: "disp.calcdispatcher",
    prism_safety: "disp.safetydispatcher",
    prism_cam: "disp.camdispatcher",
    prism_cad: "disp.caddispatcher",
    prism_turning: "disp.turningdispatcher",
    prism_5axis: "disp.fiveaxisdispatcher",
    prism_ai: "disp.aireasoningdispatcher",
    prism_intelligence: "disp.intelligencedispatcher",
    prism_omega: "disp.omegadispatcher",
    prism_memory: "disp.memorydispatcher",
    prism_session: "disp.sessiondispatcher",
    prism_dev: "disp.devdispatcher",
    prism_orchestrate: "disp.orchestrationdispatcher",
    prism_skill_script: "disp.skillscriptdispatcher",
    prism_guard: "disp.guarddispatcher",
    prism_intake: "disp.intakedispatcher",
    prism_data: "disp.datadispatcher",
    prism_validation: "disp.validationdispatcher",
    prism_machinelive: "disp.machinelivedispatcher",
    prism_multiop: "disp.multiopdispatcher",
  };
  for (const [mcp, node] of Object.entries(expected)) {
    assert.equal(mcpToolToDispNodeId(mcp), node, `${mcp} should map to ${node}`);
  }
  // Both directions: the frozen table itself matches.
  assert.deepEqual({ ...MCP_TOOL_TO_DISP_NODE_ID }, expected);
});

test("all resolved ids carry the canonical disp. prefix — never the legacy dispatcher. prefix", () => {
  for (const mcp of Object.keys(MCP_TOOL_TO_DISP_NODE_ID)) {
    const id = mcpToolToDispNodeId(mcp);
    assert.ok(id.startsWith("disp."), `${mcp} → ${id} must start with disp.`);
    assert.ok(!id.startsWith("dispatcher."), `${mcp} → ${id} must NOT start with dispatcher.`);
  }
});

test("R12 fallback: an unknown prism_* name lowercases to disp.<name> (one honest dead pixel, not a malformed prefix)", () => {
  assert.equal(mcpToolToDispNodeId("prism_shop"), "disp.prism_shop");
  assert.equal(mcpToolToDispNodeId("prism_Newthing"), "disp.prism_newthing");
});

test("prototype-chain guard: __proto__/constructor never leak Object.prototype", () => {
  assert.equal(mcpToolToDispNodeId("__proto__"), "disp.__proto__");
  assert.equal(mcpToolToDispNodeId("constructor"), "disp.constructor");
  assert.equal(typeof mcpToolToDispNodeId("__proto__"), "string");
});

test("empty / non-string input → disp.unknown (harmless; UNKNOWN is confidence-gated upstream)", () => {
  assert.equal(mcpToolToDispNodeId(""), "disp.unknown");
  assert.equal(mcpToolToDispNodeId(null), "disp.unknown");
  assert.equal(mcpToolToDispNodeId(undefined), "disp.unknown");
  assert.equal(mcpToolToDispNodeId(42), "disp.unknown");
  assert.equal(mcpToolToDispNodeId({}), "disp.unknown");
});

test("table is frozen (immutable SSOT)", () => {
  assert.ok(Object.isFrozen(MCP_TOOL_TO_DISP_NODE_ID));
  assert.throws(() => { MCP_TOOL_TO_DISP_NODE_ID.prism_calc = "x"; }, TypeError);
});

test("SSOT parity: seed-ghost-from-unwired re-exports the SAME table (drift guard)", async () => {
  const seeder = await import("../seed-ghost-from-unwired.mjs");
  // After the U-VIZ-G4-DEAD-EDGE refactor the seeder re-exports the lib's table.
  assert.deepEqual(
    { ...seeder.MCP_TOOL_TO_DISP_NODE_ID },
    { ...MCP_TOOL_TO_DISP_NODE_ID },
    "seed-ghost-from-unwired.MCP_TOOL_TO_DISP_NODE_ID drifted from the shared lib — re-wire the re-export",
  );
  assert.equal(seeder.mcpToolToDispNodeId("prism_cam"), mcpToolToDispNodeId("prism_cam"));
});
