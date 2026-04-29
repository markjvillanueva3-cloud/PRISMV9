/**
 * aiReasoningDispatcher U-WIRE33 round-trip tests — MultiAssetReasoningEngine.
 *
 * Validates multi_asset_reason / multi_asset_types / multi_asset_reset through
 * prism_ai. Engine has reset() so beforeEach() guarantees fresh state.
 *
 * Engine internals (verified by these tests):
 *   - selectRelevantAssets() pattern-matches lower-cased objective against
 *     keyword sets {"force"|"cutting"} → kienzle_force formula + Cutting-
 *     ForceEngine; {"tool"|"life"} → taylor_tool_life formula;
 *     {"speed"|"feed"} → SpeedFeedOrchestratorEngine.
 *   - confidence = clamp(avg(relevance) - 0.05*constraints.length, [0.1,1.0]).
 *   - Empty assets → "Unable to determine recommendation" + confidence=0.1.
 *   - Returned assetsUsed sorted descending by relevance.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE33
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  multiAssetReasoningEngine,
  type ReasoningContext,
} from "../engines/MultiAssetReasoningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["multi_asset_reason", "multi_asset_types", "multi_asset_reset"] as const;

describe("U-WIRE33 — engine direct: MultiAssetReasoningEngine", () => {
  beforeEach(() => {
    multiAssetReasoningEngine.reset();
  });

  it("reason on cutting-force objective returns kienzle_force formula + CuttingForceEngine assets", async () => {
    const ctx: ReasoningContext = {
      objective: "Calculate cutting force for facing operation in steel",
    };
    const r = await multiAssetReasoningEngine.reason(ctx);
    const ids = r.assetsUsed.map((a) => a.id);
    expect(ids.includes("kienzle_force")).toBe(true);
    expect(ids.includes("CuttingForceEngine")).toBe(true);
    // Sorted descending by relevance — kienzle_force (0.9) before CuttingForceEngine (0.85)
    const kIdx = ids.indexOf("kienzle_force");
    const cIdx = ids.indexOf("CuttingForceEngine");
    expect(kIdx).toBeLessThan(cIdx);
    // Confidence = avg(0.9, 0.85) - 0 = 0.875
    expect(r.confidence).toBeCloseTo(0.875, 4);
    expect(r.recommendation).toContain("2 assets");
  });

  it("reason on speed-feed objective surfaces SpeedFeedOrchestratorEngine with relevance 0.95", async () => {
    const r = await multiAssetReasoningEngine.reason({ objective: "Optimize speed feed for milling" });
    const sf = r.assetsUsed.find((a) => a.id === "SpeedFeedOrchestratorEngine");
    if (!sf) throw new Error("SpeedFeedOrchestratorEngine not selected for speed/feed objective");
    expect(sf.type).toBe("engine");
    // Top asset by sort order should also be SpeedFeedOrchestratorEngine (0.95 > others)
    expect(r.assetsUsed[0].id).toBe("SpeedFeedOrchestratorEngine");
    // Confidence reflects 0.95 dominance
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.confidence).toBeLessThanOrEqual(1.0);
  });

  it("reason on tool-life objective surfaces taylor_tool_life formula", async () => {
    const r = await multiAssetReasoningEngine.reason({ objective: "Predict tool life for finishing" });
    expect(r.assetsUsed.some((a) => a.id === "taylor_tool_life")).toBe(true);
  });

  it("reason on irrelevant objective with no matching keywords returns 0 assets + confidence=0.1 + fallback message", async () => {
    const r = await multiAssetReasoningEngine.reason({ objective: "philosophical question about machining" });
    expect(r.assetsUsed.length).toBe(0);
    expect(r.confidence).toBeCloseTo(0.1, 5);
    expect(r.recommendation).toBe("Unable to determine recommendation without relevant assets");
  });

  it("reason confidence drops by 0.05 per constraint (additive penalty)", async () => {
    const objective = "Calculate cutting force in steel"; // 2 assets, avg 0.875
    const noConstraints = await multiAssetReasoningEngine.reason({ objective });
    const oneConstraint = await multiAssetReasoningEngine.reason({ objective, constraints: ["c1"] });
    const fiveConstraints = await multiAssetReasoningEngine.reason({
      objective,
      constraints: ["c1", "c2", "c3", "c4", "c5"],
    });
    expect(noConstraints.confidence).toBeCloseTo(0.875, 4);
    expect(oneConstraint.confidence).toBeCloseTo(0.825, 4);
    // 0.875 - 0.25 = 0.625
    expect(fiveConstraints.confidence).toBeCloseTo(0.625, 4);
  });

  it("reason confidence clamps to floor 0.1 when penalty exceeds avg relevance", async () => {
    const constraints = Array.from({ length: 100 }, (_, i) => `c${i}`); // 100 * 0.05 = 5.0 penalty
    const r = await multiAssetReasoningEngine.reason({
      objective: "Calculate cutting force in steel",
      constraints,
    });
    expect(r.confidence).toBeCloseTo(0.1, 5);
  });

  it("reason availableAssetTypes filter restricts which asset categories are considered", async () => {
    // Asking for cutting-force but excluding 'formula' should drop kienzle_force.
    const r = await multiAssetReasoningEngine.reason({
      objective: "Calculate cutting force in steel",
      availableAssetTypes: ["engine"], // only engines, no formulas
    });
    const ids = r.assetsUsed.map((a) => a.id);
    expect(ids.includes("kienzle_force")).toBe(false);
    expect(ids.includes("CuttingForceEngine")).toBe(true);
  });

  it("reason returns alternatives array of length 2 (conservative + aggressive)", async () => {
    const r = await multiAssetReasoningEngine.reason({ objective: "any objective will do here" });
    expect(r.alternatives.length).toBe(2);
    expect(r.alternatives[0].toLowerCase()).toContain("conservative");
    expect(r.alternatives[1].toLowerCase()).toContain("aggressive");
  });

  it("reason 'reasoning' field reports asset count and recommendation", async () => {
    const r = await multiAssetReasoningEngine.reason({ objective: "Calculate cutting force in steel" });
    expect(r.reasoning).toContain(`Combined ${r.assetsUsed.length} assets`);
    expect(r.reasoning).toContain(r.recommendation);
  });

  it("getAssetTypes returns the canonical 7 categories (engine/formula/algorithm/tool/material/machine/strategy)", () => {
    const types = multiAssetReasoningEngine.getAssetTypes();
    expect(types).toEqual(["engine", "formula", "algorithm", "tool", "material", "machine", "strategy"]);
  });

  it("getAssetTypes returns a fresh array (mutation does not affect engine state)", () => {
    const a = multiAssetReasoningEngine.getAssetTypes();
    a.push("contaminated");
    const b = multiAssetReasoningEngine.getAssetTypes();
    expect(b.includes("contaminated")).toBe(false);
    expect(b.length).toBe(7);
  });
});

describe("U-WIRE33 — schema integrity", () => {
  it("all 3 multi_asset_* actions in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of NEW_ACTIONS) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 3 actions with safeParse", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of NEW_ACTIONS) {
      const schema = map[a];
      expect(schema === null || schema === undefined).toBe(false);
      expect(typeof (schema as { safeParse?: unknown }).safeParse).toBe("function");
    }
  });

  it("multi_asset_reason requires context.objective (non-empty string)", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.multi_asset_reason.safeParse({}).success).toBe(false);
    expect(map.multi_asset_reason.safeParse({ context: {} }).success).toBe(false);
    expect(map.multi_asset_reason.safeParse({ context: { objective: "" } }).success).toBe(false);
    expect(map.multi_asset_reason.safeParse({ context: { objective: "x" } }).success).toBe(true);
  });

  it("multi_asset_reason accepts optional constraints/availableAssetTypes/material/machineType arrays/strings", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.multi_asset_reason.safeParse({
        context: {
          objective: "x",
          constraints: ["a", "b"],
          availableAssetTypes: ["engine", "formula"],
          material: "steel",
          machineType: "milling",
        },
      }).success,
    ).toBe(true);
    // Wrong type — constraints must be array of strings
    expect(
      map.multi_asset_reason.safeParse({ context: { objective: "x", constraints: "not-an-array" } }).success,
    ).toBe(false);
  });

  it("multi_asset_types and multi_asset_reset accept empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.multi_asset_types.safeParse({}).success).toBe(true);
    expect(map.multi_asset_reset.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE33 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    multiAssetReasoningEngine.reset();
  });

  it("multi_asset_reason happy path returns recommendation+confidence+assetsUsed[]+alternatives[]+reasoning", async () => {
    const r = await executeAIReasoningAction("multi_asset_reason" as AIReasoningAction, {
      context: { objective: "Calculate cutting force for steel facing" },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      recommendation?: string;
      confidence?: number;
      assetsUsed?: Array<{ type?: string; id?: string; contribution?: string }>;
      alternatives?: string[];
      reasoning?: string;
    };
    expect(typeof data.recommendation).toBe("string");
    expect((data.recommendation ?? "").length).toBeGreaterThan(0);
    expect(typeof data.confidence).toBe("number");
    expect(data.confidence).toBeGreaterThanOrEqual(0.1);
    expect(data.confidence).toBeLessThanOrEqual(1.0);
    expect(Array.isArray(data.assetsUsed)).toBe(true);
    expect((data.assetsUsed ?? []).length).toBeGreaterThan(0);
    expect((data.assetsUsed ?? [])[0].id).toBe("kienzle_force");
    expect(data.alternatives?.length).toBe(2);
    expect((data.reasoning ?? "")).toContain("Combined");
  });

  it("multi_asset_reason on irrelevant objective returns empty assetsUsed + confidence=0.1", async () => {
    const r = await executeAIReasoningAction("multi_asset_reason" as AIReasoningAction, {
      context: { objective: "philosophical musings" },
    });
    expect(r.success).toBe(true);
    const data = r.data as { assetsUsed?: unknown[]; confidence?: number; recommendation?: string };
    // Slim may strip empty arrays; treat undefined as 0.
    const used = data.assetsUsed ?? [];
    expect(used.length).toBe(0);
    expect(data.confidence).toBeCloseTo(0.1, 5);
    expect(data.recommendation).toBe("Unable to determine recommendation without relevant assets");
  });

  it("multi_asset_types returns the 7 canonical asset types and count=7", async () => {
    const r = await executeAIReasoningAction("multi_asset_types" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { types?: string[]; count?: number };
    expect(data.types).toEqual(["engine", "formula", "algorithm", "tool", "material", "machine", "strategy"]);
    expect(data.count).toBe(7);
  });

  it("multi_asset_reset returns {reset:true}", async () => {
    const r = await executeAIReasoningAction("multi_asset_reset" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { reset?: boolean };
    expect(data.reset).toBe(true);
  });

  it("multi_asset_reason FAIL: missing context → schema rejects", async () => {
    const r = await executeAIReasoningAction("multi_asset_reason" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("multi_asset_reason FAIL: empty objective → schema rejects (min(1))", async () => {
    const bad: Record<string, unknown> = { context: { objective: "" } };
    const r = await executeAIReasoningAction("multi_asset_reason" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("multi_asset_reason FAIL: wrong-typed constraints → schema rejects", async () => {
    const bad: Record<string, unknown> = { context: { objective: "x", constraints: "not-an-array" } };
    const r = await executeAIReasoningAction("multi_asset_reason" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("U-WIRE33 — singleton continuity", () => {
  it("multiAssetReasoningEngine singleton same across re-imports", async () => {
    const mod = await import("../engines/MultiAssetReasoningEngine.js");
    expect(mod.multiAssetReasoningEngine).toBe(multiAssetReasoningEngine);
  });
});
