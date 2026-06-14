/**
 * Tests for SinkerAGIMasterEngine — die-sinking-EDM domain AGI master
 * (AGI-MASTER-PARITY-MS30 / P0-U02).
 *
 * Assertions check genuine routing/reasoning behaviour: keyword→capability
 * matching, canonical-workflow ordering, the zero-match fallback, mode-
 * specific reasoning traces, and the confidence model — so each test fails
 * if the orchestration logic regresses.
 */

import { describe, it, expect } from "vitest";
import { sinkerAGIMasterEngine } from "../engines/SinkerAGIMasterEngine.js";

/** Capability ids in the engine's catalog, in canonical workflow order. */
const WORKFLOW_ORDER = [
  "material",
  "electrode_plan",
  "calculate",
  "recommend",
  "flushing",
  "wear_compensation",
  "vdi_finish",
  "inspection",
];

describe("SinkerAGIMasterEngine — intent routing", () => {
  it("routes a single-capability intent to the matching capability", () => {
    const r = sinkerAGIMasterEngine.reason({ intent: "inspect the cavity" });
    expect(r.provenance.fallbackPlan).toBe(false);
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("inspection");
    const inspect = r.enginePlan.find((p) => p.capabilityId === "inspection")!;
    expect(inspect.dispatcherAction).toBe("sinker_edm_electrode_inspect");
    // intent "inspect the cavity" — both keywords must be the recorded reason
    expect(inspect.matchedKeywords).toContain("inspect");
    expect(inspect.matchedKeywords).toContain("cavity");
  });

  it("orders a multi-capability plan by canonical die-sinking workflow", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "design the electrode, calculate the burn, then inspect",
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toEqual(["electrode_plan", "calculate", "inspection"]);
    // order field is 1-based and contiguous
    expect(r.enginePlan.map((p) => p.order)).toEqual([1, 2, 3]);
    // each routed capability precedes the next in WORKFLOW_ORDER
    const idx = ids.map((id) => WORKFLOW_ORDER.indexOf(id));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("folds material and constraints into the match haystack", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "plan the job",
      material: "graphite electrode",
      constraints: ["minimise flushing debris"],
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("material"); // via "graphite"
    expect(ids).toContain("electrode_plan"); // via "electrode"
    expect(ids).toContain("flushing"); // via "flushing"/"debris" from constraints
  });

  it("every routed plan item points at a real sinker_* dispatcher action", () => {
    // The eight verified prism_edm sinker actions the catalog routes to.
    const KNOWN_ACTIONS = new Set([
      "sinker_materials",
      "sinker_edm_electrode_plan",
      "sinker_calculate",
      "sinker_recommend",
      "sinker_edm_flush_recommend",
      "sinker_edm_wear_compensate",
      "sinker_vdi_scale",
      "sinker_edm_electrode_inspect",
    ]);
    const r = sinkerAGIMasterEngine.reason({
      intent: "calculate burn settings and recommend a register",
    });
    expect(r.enginePlan.length).toBeGreaterThan(0);
    for (const item of r.enginePlan) {
      expect(KNOWN_ACTIONS.has(item.dispatcherAction)).toBe(true);
    }
  });
});

describe("SinkerAGIMasterEngine — fallback routing", () => {
  it("routes the full workflow when no keyword matches", () => {
    const r = sinkerAGIMasterEngine.reason({ intent: "xyzzy qqq zzz" });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(8);
    expect(r.warnings.length).toBeGreaterThan(0);
    // fallback plan is still ordered by workflow precedence
    expect(r.enginePlan.map((p) => p.capabilityId)).toEqual(WORKFLOW_ORDER);
  });

  it("assigns the fixed low fallback confidence on a zero-match intent", () => {
    const r = sinkerAGIMasterEngine.reason({ intent: "xyzzy qqq zzz" });
    expect(r.confidence).toBeCloseTo(0.25, 5);
  });

  it("treats a whitespace-only intent as a fallback, not an error", () => {
    // "   " satisfies z.string().min(1) but tokenizes to nothing.
    const r = sinkerAGIMasterEngine.reason({ intent: "   " });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(8);
  });
});

describe("SinkerAGIMasterEngine — confidence model", () => {
  it("keeps confidence within [0, 1] across varied intents", () => {
    for (const intent of [
      "inspect",
      "design electrode calculate burn flushing wear inspect finish material",
      "qqq",
      "recommend settings",
    ]) {
      const r = sinkerAGIMasterEngine.reason({ intent });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("scores a rich multi-capability intent above a one-word intent", () => {
    const rich = sinkerAGIMasterEngine.reason({
      intent:
        "design electrode calculate burn flushing wear inspect finish material",
    });
    const sparse = sinkerAGIMasterEngine.reason({ intent: "inspect" });
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });
});

describe("SinkerAGIMasterEngine — reasoning modes", () => {
  it("defaults to chain_of_thought when reasoningMode is omitted", () => {
    const r = sinkerAGIMasterEngine.reason({ intent: "inspect cavity" });
    expect(r.reasoningMode).toBe("chain_of_thought");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Chain complete");
  });

  it("emits a premise-and-conclusion trace in deductive mode", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "calculate the burn",
      reasoningMode: "deductive",
    });
    expect(r.reasoningSteps[0].thought).toContain("Premise");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Conclusion");
  });

  it("enumerates then converges in multi_path mode", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "calculate the burn",
      reasoningMode: "multi_path",
    });
    expect(r.reasoningSteps.some((s) => s.thought.includes("Converge"))).toBe(
      true,
    );
  });

  it("maps onto the workflow template in analogical mode", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "calculate the burn",
      reasoningMode: "analogical",
    });
    expect(r.reasoningSteps[0].thought).toContain("template");
  });

  it("numbers reasoning steps contiguously from 1", () => {
    // intent matches flushing + inspection → chain_of_thought emits
    // 1 interpret + 2 stage + 1 closing = 4 steps, numbered [1,2,3,4].
    const r = sinkerAGIMasterEngine.reason({ intent: "inspect cavity flushing" });
    expect(r.reasoningSteps).toHaveLength(4);
    expect(r.reasoningSteps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
  });
});

describe("SinkerAGIMasterEngine — recommendations & provenance", () => {
  it("flags missing QC and flushing when a burn is planned without them", () => {
    const r = sinkerAGIMasterEngine.reason({
      intent: "calculate the burn parameters",
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("calculate");
    expect(ids).not.toContain("inspection");
    expect(ids).not.toContain("flushing");
    const topics = r.recommendations.map((rec) => rec.topic);
    expect(topics).toContain("execution"); // always emitted
    expect(topics).toContain("quality"); // burn planned without inspection
    expect(topics).toContain("stability"); // burn planned without flushing
  });

  it("reports honest provenance counts", () => {
    const r = sinkerAGIMasterEngine.reason({ intent: "inspect cavity" });
    expect(r.provenance.enginesConsidered).toBe(8);
    expect(r.provenance.enginesRouted).toBe(r.enginePlan.length);
    expect(r.provenance.catalogVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("SinkerAGIMasterEngine — input validation & immutability", () => {
  it("throws on an empty intent", () => {
    expect(() => sinkerAGIMasterEngine.reason({ intent: "" })).toThrow();
  });

  it("throws on an unknown reasoning mode", () => {
    expect(() =>
      sinkerAGIMasterEngine.reason({
        intent: "inspect cavity",
        reasoningMode: "telepathy" as never,
      }),
    ).toThrow();
  });

  it("returns a defensive copy of the capability catalog", () => {
    const caps = sinkerAGIMasterEngine.listCapabilities();
    expect(caps).toHaveLength(8);
    const fresh = sinkerAGIMasterEngine.listCapabilities();
    // each call yields fresh objects, not shared references
    expect(caps[0]).not.toBe(fresh[0]);
    // mutating the returned catalog must not corrupt the shared module state
    caps[0].keywords.push("zzz-not-a-real-keyword");
    const after = sinkerAGIMasterEngine.listCapabilities();
    expect(after[0].keywords).not.toContain("zzz-not-a-real-keyword");
  });
});
