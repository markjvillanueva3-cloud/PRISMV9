import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts";
const ACTIONS = [
  "tribal_outcome_bridge_status",
  "knowledge_graph_project",
  "graph_importance_rank_global",
  "approval_chain_get",
];
const CALLS = [
  "TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes(",
  "KnowledgeGraphFeatureProjectorEngine.project(",
  "graphImportanceEngine.rankGlobal(",
  "approvalChainEngine.getChain(",
];

describe("WIRE-AI-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");

  it("VICTOR_AI_DIRECT_ACTIONS array carries all 4 strings", () => {
    for (const a of ACTIONS) assert.ok(d.includes('"' + a + '"'), 'missing "' + a + '"');
  });
  it("VICTOR_AI_DIRECT_ACTIONS is spread into ALL_AI_ACTIONS", () => {
    assert.ok(d.includes("...VICTOR_AI_DIRECT_ACTIONS"), "missing spread in ALL_AI_ACTIONS");
  });
  it("VICTOR_AI_DIRECT_SCHEMAS is spread into ALL_AI_SCHEMAS", () => {
    assert.ok(d.includes("...VICTOR_AI_DIRECT_SCHEMAS"), "missing spread in ALL_AI_SCHEMAS");
  });
  it("AIAction union includes VictorAIDirectAction", () => {
    assert.ok(d.includes("| VictorAIDirectAction"), "AIAction must include VictorAIDirectAction");
  });
  it("each action has a dispatch case calling the correct method", () => {
    for (const a of ACTIONS) assert.ok(d.includes('case "' + a + '"'), 'dispatch case missing for "' + a + '"');
    for (const c of CALLS) assert.ok(d.includes(c), "missing call: " + c);
  });
  it("WIRE-AI-DIRECT-MS0 doctrine header present", () => {
    assert.ok(d.includes("WIRE-AI-DIRECT-MS0"), "doctrine header missing");
  });
});
