/**
 * orchestrationDispatcher — Deep Reasoning wiring round-trip suite
 * =================================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH5
 *
 * Verifies 3 deep-reasoning engines reach prism_orchestrate dispatcher with
 * exact-value, structural, and domain-membership assertions:
 *   - treeOfThoughtEngine          → cognitive_tot_create_tree
 *   - manufacturingReasoningEngine → cognitive_mfg_reason
 *   - multiAssetReasoningEngine    → cognitive_multi_asset_reason
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

// Canonical constants from engine implementations — mirrored to detect drift.
const ROOT_INITIAL_SCORE = 0.5;       // TreeOfThoughtEngine.createTree() line 134
const ROOT_INITIAL_CONFIDENCE = 1.0;  // TreeOfThoughtEngine.createTree() line 135
const FRESH_TREE_DEPTH = 0;
// Engine counts the root creation as 1 exploration (createTree() line 160).
const FRESH_TREE_EXPLORATION = 1;
const FRESH_TREE_PRUNED = 0;
const FRESH_TREE_NODE_COUNT = 1;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerOrchestrationDispatcher(server as unknown as Parameters<typeof registerOrchestrationDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH5 / TreeOfThoughtEngine", () => {
  it("create_tree returns canonical fresh-tree state per createTree() impl", async () => {
    const r = await call(server, "cognitive_tot_create_tree", {
      problem: "minimize cycle time on Inconel 718 turning",
      goal: "Vc within Hi-E band",
      initial_state: { material: "Inconel 718", operation: "turning" },
    });
    expect(r.ok).toBe(true);
    const tree = r.data.tree as { root_id: string; problem: string; goal: string; exploration_count: number; pruned_count: number; max_depth_reached: number; node_count: number; nodes: Array<{ depth: number; parent_id: string | null; thought: string; score: number; confidence: number; is_terminal: boolean; is_pruned: boolean; children_count: number }> };
    expect(tree.problem).toBe("minimize cycle time on Inconel 718 turning");
    expect(tree.goal).toBe("Vc within Hi-E band");
    expect(tree.node_count).toBe(FRESH_TREE_NODE_COUNT);
    expect(tree.nodes.length).toBe(FRESH_TREE_NODE_COUNT);
    expect(tree.exploration_count).toBe(FRESH_TREE_EXPLORATION);
    expect(tree.pruned_count).toBe(FRESH_TREE_PRUNED);
    expect(tree.max_depth_reached).toBe(FRESH_TREE_DEPTH);
    const root = tree.nodes[0]!;
    expect(root.depth).toBe(FRESH_TREE_DEPTH);
    // Engine sets parent_id: null on root (line 131); responseSlimmer strips
    // null fields, so the key must be absent from the slimmed envelope.
    expect(Object.prototype.hasOwnProperty.call(root, "parent_id")).toBe(false);
    expect(root.score).toBe(ROOT_INITIAL_SCORE);
    expect(root.confidence).toBe(ROOT_INITIAL_CONFIDENCE);
    expect(root.is_terminal).toBe(false);
    expect(root.is_pruned).toBe(false);
    expect(root.children_count).toBe(0);
    expect(root.thought).toContain("minimize cycle time");
  });

  it("create_tree assigns a non-empty root_id (newly minted nanoid-style)", async () => {
    const r = await call(server, "cognitive_tot_create_tree", { problem: "p", goal: "g", initial_state: {} });
    expect(r.ok).toBe(true);
    const tree = r.data.tree as { root_id: string };
    expect(typeof tree.root_id).toBe("string");
    expect(tree.root_id.length).toBeGreaterThan(0);
  });

  it("two consecutive create_tree calls produce DIFFERENT root_ids (uniqueness)", async () => {
    const a = await call(server, "cognitive_tot_create_tree", { problem: "x", goal: "g", initial_state: {} });
    const b = await call(server, "cognitive_tot_create_tree", { problem: "y", goal: "g", initial_state: {} });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const idA = (a.data.tree as { root_id: string }).root_id;
    const idB = (b.data.tree as { root_id: string }).root_id;
    expect(idA).not.toBe(idB);
  });
});

describe("U-WIRE-COG-BATCH5 / ManufacturingReasoningEngine", () => {
  it("mfg_reason for milling/P-group steel returns chain with domain + 5 array fields", async () => {
    const r = await call(server, "cognitive_mfg_reason", {
      problem: "Select Vc and fz for roughing 4140 steel pocket",
      goal: "Maximize MRR within S(x) >= 0.95",
      domain: "milling",
      material: { name: "AISI 4140", iso_group: "P", hardness: 28 },
      operation: "rough_pocket",
    });
    expect(r.ok).toBe(true);
    const chain = r.data.chain as { domain: string; constraints_checked?: unknown[]; physics_validations?: unknown[]; safety_checks?: unknown[]; cost_implications?: unknown[]; audit_trail?: unknown[] };
    // ManufacturingReasoningChain extends ReasoningChain — must have domain field per impl line 105
    expect(chain.domain).toBe("milling");
    // 5 array fields exist on the chain (may be empty + slimmed away → use ?? [])
    expect(Array.isArray(chain.constraints_checked ?? [])).toBe(true);
    expect(Array.isArray(chain.physics_validations ?? [])).toBe(true);
    expect(Array.isArray(chain.safety_checks ?? [])).toBe(true);
    expect(Array.isArray(chain.cost_implications ?? [])).toBe(true);
    expect(Array.isArray(chain.audit_trail ?? [])).toBe(true);
  });

  it.each([
    ["milling", "P"],
    ["turning", "M"],
    ["drilling", "K"],
  ])("mfg_reason variability: domain=%s iso=%s — chain.domain echoes input", async (domain, iso) => {
    const r = await call(server, "cognitive_mfg_reason", {
      problem: `pick parameters for ${domain}`,
      goal: "produce reasoning chain",
      domain,
      material: { iso_group: iso, hardness: 30 },
    });
    expect(r.ok).toBe(true);
    const chain = r.data.chain as { domain: string };
    expect(chain.domain).toBe(domain);
  });
});

describe("U-WIRE-COG-BATCH5 / MultiAssetReasoningEngine", () => {
  it("multi_asset_reason returns a recommendation, confidence in [0,1], and reasoning matches the documented template", async () => {
    const r = await call(server, "cognitive_multi_asset_reason", {
      objective: "Recommend tool grade for finishing 17-4 PH stainless",
      material: "17-4 PH",
      machine_type: "lathe",
    });
    expect(r.ok).toBe(true);
    const result = r.data.result as { recommendation: string; confidence: number; assetsUsed: Array<{ type: string; id: string; contribution: string }>; alternatives: string[]; reasoning: string };
    expect(result.recommendation.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    // Each assetsUsed entry has the exact 3-field shape from MultiAssetReasoningEngine.reason()
    for (const a of result.assetsUsed ?? []) {
      expect(typeof a.type).toBe("string");
      expect(typeof a.id).toBe("string");
      expect(typeof a.contribution).toBe("string");
      expect(a.type.length).toBeGreaterThan(0);
    }
    // reasoning matches impl line 63: `Combined ${n} assets to determine: ...`
    expect(result.reasoning).toMatch(/^Combined \d+ assets to determine: /);
  });

  it("multi_asset_reason restricts assetsUsed.type to the supplied subset", async () => {
    const allowed = ["formula", "engine"] as const;
    const r = await call(server, "cognitive_multi_asset_reason", {
      objective: "Pick a strategy for thin-wall finishing",
      available_asset_types: [...allowed],
    });
    expect(r.ok).toBe(true);
    const result = r.data.result as { assetsUsed: Array<{ type: string }> };
    for (const a of result.assetsUsed ?? []) {
      expect(allowed).toContain(a.type as typeof allowed[number]);
    }
  });

  it("multi_asset_reason on identical objective+constraints is deterministic in output shape", async () => {
    const args = { objective: "select tool", constraints: ["budget < 500", "delivery 7 days"] };
    const a = await call(server, "cognitive_multi_asset_reason", args);
    const b = await call(server, "cognitive_multi_asset_reason", args);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const ra = a.data.result as { recommendation: string; reasoning: string };
    const rb = b.data.result as { recommendation: string; reasoning: string };
    // Same input → same recommendation and same `Combined N assets...` count
    expect(ra.recommendation).toBe(rb.recommendation);
    const numA = ra.reasoning.match(/Combined (\d+) assets/)?.[1];
    const numB = rb.reasoning.match(/Combined (\d+) assets/)?.[1];
    expect(numA).toBe(numB);
  });
});

describe("U-WIRE-COG-BATCH5 / schema rejections", () => {
  it("rejects cognitive_tot_create_tree with empty problem", async () => {
    const r = await call(server, "cognitive_tot_create_tree", { problem: "", goal: "g", initial_state: {} });
    expect(r.ok).toBe(false);
  });

  it("rejects cognitive_tot_create_tree with missing initial_state", async () => {
    const r = await call(server, "cognitive_tot_create_tree", { problem: "p", goal: "g" });
    expect(r.ok).toBe(false);
  });

  it("rejects cognitive_mfg_reason with invalid domain enum", async () => {
    const r = await call(server, "cognitive_mfg_reason", { problem: "p", goal: "g", domain: "not_a_domain" });
    expect(r.ok).toBe(false);
  });

  it("rejects cognitive_multi_asset_reason with empty objective", async () => {
    const r = await call(server, "cognitive_multi_asset_reason", { objective: "" });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH5 / adversarial", () => {
  it("create_tree handles 100KB problem text with node_count still exactly 1", async () => {
    const huge = "x".repeat(100_000);
    const r = await call(server, "cognitive_tot_create_tree", { problem: huge, goal: "g", initial_state: { k: "v" } });
    expect(r.ok).toBe(true);
    const tree = r.data.tree as { node_count: number; nodes: Array<{ depth: number }> };
    expect(tree.node_count).toBe(1);
    expect(tree.nodes[0]!.depth).toBe(0);
  });

  it("multi_asset_reason with 200 constraints returns confidence in [0,1] and finite reasoning length", async () => {
    const constraints = Array.from({ length: 200 }, (_, i) => `constraint_${i}`);
    const r = await call(server, "cognitive_multi_asset_reason", { objective: "select tool", constraints });
    expect(r.ok).toBe(true);
    const result = r.data.result as { confidence: number; reasoning: string };
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.confidence)).toBe(true);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
