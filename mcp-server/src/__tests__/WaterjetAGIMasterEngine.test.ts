/**
 * Tests for WaterjetAGIMasterEngine — waterjet-machining domain AGI master
 * (AGI-MASTER-PARITY-MS30 / P0-U04).
 *
 * Assertions check genuine routing/reasoning behaviour: keyword→capability
 * matching, canonical-workflow ordering, the two-dispatcher span, the
 * zero-match fallback, the dual-cut-mode warning, mode-specific reasoning
 * traces, and the confidence model — so each test fails if the logic regresses.
 */

import { describe, it, expect } from "vitest";
import { waterjetAGIMasterEngine } from "../engines/WaterjetAGIMasterEngine.js";

/** Capability ids in the engine's catalog, in canonical workflow order. */
const WORKFLOW_ORDER = [
  "material",
  "abrasive",
  "calculate",
  "quality",
  "abrasive_cut",
  "pure_cut",
  "taper_comp",
  "depth_control",
  "adaptive_tuning",
];

describe("WaterjetAGIMasterEngine — intent routing", () => {
  it("routes a single-capability intent to the matching capability", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "compensate the taper" });
    expect(r.provenance.fallbackPlan).toBe(false);
    const taper = r.enginePlan.find((p) => p.capabilityId === "taper_comp")!;
    expect(taper.action).toBe("waterjet_taper_program");
    expect(taper.dispatcher).toBe("prism_cam");
    expect(taper.matchedKeywords).toContain("taper");
  });

  it("orders a multi-capability plan by canonical waterjet workflow", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "select garnet, calculate pressure, then abrasive cut metal",
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    // canonical workflow order: abrasive(2) → calculate(3) → abrasive_cut(5)
    expect(ids).toEqual(["abrasive", "calculate", "abrasive_cut"]);
    expect(r.enginePlan.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it("folds material and constraints into the match haystack", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "plan the job",
      material: "stainless laminate",
      constraints: ["garnet mesh 80"],
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("material"); // via "laminate"
    expect(ids).toContain("abrasive"); // via "garnet"/"mesh"
  });

  it("every routed plan item points at a real catalog dispatcher action", () => {
    // derived from the live catalog — cannot drift from a hardcoded copy
    const catalogActions = new Set(
      waterjetAGIMasterEngine.listCapabilities().map((c) => c.action),
    );
    const r = waterjetAGIMasterEngine.reason({
      intent: "calculate pressure and run an abrasive cut on steel",
    });
    expect(r.enginePlan.length).toBeGreaterThan(0);
    for (const item of r.enginePlan) {
      expect(catalogActions.has(item.action)).toBe(true);
      expect(["prism_edm", "prism_cam"]).toContain(item.dispatcher);
    }
  });

  it("routes prism_cam program actions for cut capabilities", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "pure cut foam gasket" });
    const pure = r.enginePlan.find((p) => p.capabilityId === "pure_cut")!;
    expect(pure.dispatcher).toBe("prism_cam");
    expect(pure.action).toBe("waterjet_pure_program");
  });

  it("routes prism_edm actions for process-setup capabilities", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "calculate the pressure" });
    const calc = r.enginePlan.find((p) => p.capabilityId === "calculate")!;
    expect(calc.dispatcher).toBe("prism_edm");
    expect(calc.action).toBe("waterjet_calculate");
  });

  it("routes the adaptive-tuning capability to waterjet_lora_config", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "adaptive tuning cadence",
    });
    const adaptive = r.enginePlan.find(
      (p) => p.capabilityId === "adaptive_tuning",
    )!;
    expect(adaptive.dispatcher).toBe("prism_edm");
    expect(adaptive.action).toBe("waterjet_lora_config");
  });
});

describe("WaterjetAGIMasterEngine — fallback routing", () => {
  it("routes the full workflow when no keyword matches", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "qqq xyzzy zzz" });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(9);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.enginePlan.map((p) => p.capabilityId)).toEqual(WORKFLOW_ORDER);
  });

  it("scores a zero-match fallback below any matched route", () => {
    const fallback = waterjetAGIMasterEngine.reason({ intent: "qqq xyzzy zzz" });
    const matched = waterjetAGIMasterEngine.reason({
      intent: "compensate the taper",
    });
    // a matched route's confidence formula floors at 0.4; fallback sits below it
    expect(fallback.confidence).toBeGreaterThan(0);
    expect(fallback.confidence).toBeLessThan(0.4);
    expect(fallback.confidence).toBeLessThan(matched.confidence);
  });

  it("treats a whitespace-only intent as a fallback, not an error", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "   " });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(9);
  });
});

describe("WaterjetAGIMasterEngine — dual cut-mode handling", () => {
  it("warns when an intent routes both abrasive and pure cut modes", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "abrasive cut and pure cut",
    });
    const modes = r.enginePlan
      .map((p) => p.capabilityId)
      .filter((id) => ["abrasive_cut", "pure_cut"].includes(id));
    expect(modes).toEqual(["abrasive_cut", "pure_cut"]);
    // the warning names both conflicting cut modes
    expect(
      r.warnings.some(
        (w) =>
          w.toLowerCase().includes("abrasive") &&
          w.toLowerCase().includes("pure"),
      ),
    ).toBe(true);
  });

  it("does not warn for a single cut-mode intent", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "cut thick steel" });
    expect(r.warnings).toHaveLength(0);
  });
});

describe("WaterjetAGIMasterEngine — confidence model", () => {
  it("keeps confidence within [0, 1] across varied intents", () => {
    for (const intent of [
      "taper",
      "material abrasive garnet calculate pressure quality cut steel",
      "qqq",
      "pure cut foam",
    ]) {
      const r = waterjetAGIMasterEngine.reason({ intent });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("scores a rich multi-capability intent above a one-word intent", () => {
    const rich = waterjetAGIMasterEngine.reason({
      intent: "material garnet abrasive calculate pressure quality adaptive",
    });
    const sparse = waterjetAGIMasterEngine.reason({ intent: "taper" });
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });
});

describe("WaterjetAGIMasterEngine — reasoning modes", () => {
  it("defaults to chain_of_thought when reasoningMode is omitted", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "compensate the taper" });
    expect(r.reasoningMode).toBe("chain_of_thought");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Chain complete");
  });

  it("emits a premise-and-conclusion trace in deductive mode", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "compensate the taper",
      reasoningMode: "deductive",
    });
    expect(r.reasoningSteps[0].thought).toContain("Premise");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Conclusion");
  });

  it("enumerates then converges in multi_path mode", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "compensate the taper",
      reasoningMode: "multi_path",
    });
    // multi_path's final step is the convergence step
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Converge");
  });

  it("maps onto the workflow template in analogical mode", () => {
    const r = waterjetAGIMasterEngine.reason({
      intent: "compensate the taper",
      reasoningMode: "analogical",
    });
    expect(r.reasoningSteps[0].thought).toContain("template");
  });

  it("numbers reasoning steps and ties the stage step to the route", () => {
    // intent matches only "taper_comp" → chain_of_thought emits
    // 1 interpret + 1 stage + 1 closing = 3 steps numbered [1,2,3].
    const r = waterjetAGIMasterEngine.reason({ intent: "compensate the taper" });
    expect(r.reasoningSteps).toHaveLength(3);
    expect(r.reasoningSteps.map((s) => s.step)).toEqual([1, 2, 3]);
    // the stage step names the routed capability and its real action
    expect(r.reasoningSteps[1].thought).toContain("taper_comp");
    expect(r.reasoningSteps[1].thought).toContain("waterjet_taper_program");
  });
});

describe("WaterjetAGIMasterEngine — recommendations & provenance", () => {
  it("flags missing calc and abrasive selection for an abrasive-cut intent", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "cut thick steel contour" });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("abrasive_cut");
    expect(ids).not.toContain("calculate");
    expect(ids).not.toContain("abrasive");
    const topics = r.recommendations.map((rec) => rec.topic);
    expect(topics).toContain("execution"); // always emitted
    expect(topics).toContain("parameters"); // cut without calculate
    expect(topics).toContain("abrasive"); // abrasive_cut without abrasive selection
  });

  it("reports honest provenance counts", () => {
    const r = waterjetAGIMasterEngine.reason({ intent: "compensate the taper" });
    expect(r.provenance.enginesConsidered).toBe(9);
    expect(r.provenance.enginesRouted).toBe(r.enginePlan.length);
    expect(r.provenance.catalogVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("WaterjetAGIMasterEngine — input validation & immutability", () => {
  it("throws on an empty intent", () => {
    expect(() => waterjetAGIMasterEngine.reason({ intent: "" })).toThrow();
  });

  it("throws on an unknown reasoning mode", () => {
    expect(() =>
      waterjetAGIMasterEngine.reason({
        intent: "compensate the taper",
        reasoningMode: "telepathy" as never,
      }),
    ).toThrow();
  });

  it("returns a defensive copy of the capability catalog", () => {
    const caps = waterjetAGIMasterEngine.listCapabilities();
    expect(caps).toHaveLength(9);
    const fresh = waterjetAGIMasterEngine.listCapabilities();
    expect(caps[0]).not.toBe(fresh[0]);
    caps[0].keywords.push("zzz-not-a-real-keyword");
    const after = waterjetAGIMasterEngine.listCapabilities();
    expect(after[0].keywords).not.toContain("zzz-not-a-real-keyword");
  });
});
