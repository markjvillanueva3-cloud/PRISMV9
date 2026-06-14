/**
 * Tests for LaserAGIMasterEngine — laser-machining domain AGI master
 * (AGI-MASTER-PARITY-MS30 / P0-U03).
 *
 * Assertions check genuine routing/reasoning behaviour: keyword→capability
 * matching, canonical-workflow ordering, the two-dispatcher span, the
 * zero-match fallback, the multi-operation warning, mode-specific reasoning
 * traces, and the confidence model — so each test fails if the logic regresses.
 */

import { describe, it, expect } from "vitest";
import { laserAGIMasterEngine } from "../engines/LaserAGIMasterEngine.js";

/** Capability ids in the engine's catalog, in canonical workflow order. */
const WORKFLOW_ORDER = [
  "material",
  "machine",
  "assist_gas",
  "calculate",
  "cut",
  "weld",
  "drill",
  "mark",
  "adaptive_tuning",
];

/** The nine verified dispatcher actions the catalog routes to. */
const KNOWN_ACTIONS = new Set([
  "laser_materials",
  "laser_machines",
  "laser_gas_recommend",
  "laser_calculate",
  "laser_cut_program",
  "laser_weld_program",
  "laser_drill_program",
  "laser_mark_program",
  "laser_lora_config",
]);

describe("LaserAGIMasterEngine — intent routing", () => {
  it("routes a single-capability intent to the matching capability", () => {
    const r = laserAGIMasterEngine.reason({ intent: "cut the contour" });
    expect(r.provenance.fallbackPlan).toBe(false);
    const cut = r.enginePlan.find((p) => p.capabilityId === "cut")!;
    expect(cut.action).toBe("laser_cut_program");
    expect(cut.dispatcher).toBe("prism_cam");
    expect(cut.matchedKeywords).toContain("cut");
    expect(cut.matchedKeywords).toContain("contour");
  });

  it("orders a multi-capability plan by canonical laser workflow", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "select fiber machine, calculate power, then cut",
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    // canonical workflow order: machine(2) → calculate(4) → cut(5)
    expect(ids).toEqual(["machine", "calculate", "cut"]);
    expect(r.enginePlan.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it("folds material and constraints into the match haystack", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "plan the job",
      material: "stainless reflectivity",
      constraints: ["nitrogen assist gas"],
    });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("material"); // via "reflectivity"
    expect(ids).toContain("assist_gas"); // via "nitrogen"/"assist"/"gas"
  });

  it("every routed plan item points at a real verified dispatcher action", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "calculate power and run a weld seam",
    });
    expect(r.enginePlan.length).toBeGreaterThan(0);
    for (const item of r.enginePlan) {
      expect(KNOWN_ACTIONS.has(item.action)).toBe(true);
      expect(["prism_edm", "prism_cam"]).toContain(item.dispatcher);
    }
  });

  it("routes prism_cam program actions for operation capabilities", () => {
    const r = laserAGIMasterEngine.reason({ intent: "drill a percussion hole" });
    const drill = r.enginePlan.find((p) => p.capabilityId === "drill")!;
    expect(drill.dispatcher).toBe("prism_cam");
    expect(drill.action).toBe("laser_drill_program");
  });

  it("routes prism_edm actions for process-setup capabilities", () => {
    const r = laserAGIMasterEngine.reason({ intent: "calculate the power" });
    const calc = r.enginePlan.find((p) => p.capabilityId === "calculate")!;
    expect(calc.dispatcher).toBe("prism_edm");
    expect(calc.action).toBe("laser_calculate");
  });

  it("routes the adaptive-tuning capability to laser_lora_config", () => {
    const r = laserAGIMasterEngine.reason({ intent: "adaptive tuning cadence" });
    const adaptive = r.enginePlan.find(
      (p) => p.capabilityId === "adaptive_tuning",
    )!;
    expect(adaptive.dispatcher).toBe("prism_edm");
    expect(adaptive.action).toBe("laser_lora_config");
  });
});

describe("LaserAGIMasterEngine — fallback routing", () => {
  it("routes the full workflow when no keyword matches", () => {
    const r = laserAGIMasterEngine.reason({ intent: "qqq xyzzy zzz" });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(9);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.enginePlan.map((p) => p.capabilityId)).toEqual(WORKFLOW_ORDER);
  });

  it("assigns the fixed low fallback confidence on a zero-match intent", () => {
    const r = laserAGIMasterEngine.reason({ intent: "qqq xyzzy zzz" });
    expect(r.confidence).toBeCloseTo(0.25, 5);
  });

  it("treats a whitespace-only intent as a fallback, not an error", () => {
    const r = laserAGIMasterEngine.reason({ intent: "   " });
    expect(r.provenance.fallbackPlan).toBe(true);
    expect(r.enginePlan).toHaveLength(9);
  });
});

describe("LaserAGIMasterEngine — multi-operation handling", () => {
  it("warns when an intent routes more than one operation type", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "cut and weld and drill",
    });
    const ops = r.enginePlan
      .map((p) => p.capabilityId)
      .filter((id) => ["cut", "weld", "drill", "mark"].includes(id));
    expect(ops).toEqual(["cut", "weld", "drill"]);
    expect(
      r.warnings.some((w) => w.toLowerCase().includes("operation")),
    ).toBe(true);
  });

  it("does not warn for a single-operation intent", () => {
    const r = laserAGIMasterEngine.reason({ intent: "cut the profile" });
    expect(
      r.warnings.some((w) => w.toLowerCase().includes("operation type")),
    ).toBe(false);
  });
});

describe("LaserAGIMasterEngine — confidence model", () => {
  it("keeps confidence within [0, 1] across varied intents", () => {
    for (const intent of [
      "cut",
      "material machine gas calculate cut weld drill mark adaptive",
      "qqq",
      "weld the seam",
    ]) {
      const r = laserAGIMasterEngine.reason({ intent });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("scores a rich multi-capability intent above a one-word intent", () => {
    const rich = laserAGIMasterEngine.reason({
      intent: "material machine gas calculate cut adaptive tuning",
    });
    const sparse = laserAGIMasterEngine.reason({ intent: "cut" });
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });
});

describe("LaserAGIMasterEngine — reasoning modes", () => {
  it("defaults to chain_of_thought when reasoningMode is omitted", () => {
    const r = laserAGIMasterEngine.reason({ intent: "cut the contour" });
    expect(r.reasoningMode).toBe("chain_of_thought");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Chain complete");
  });

  it("emits a premise-and-conclusion trace in deductive mode", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "cut the contour",
      reasoningMode: "deductive",
    });
    expect(r.reasoningSteps[0].thought).toContain("Premise");
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Conclusion");
  });

  it("enumerates then converges in multi_path mode", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "cut the contour",
      reasoningMode: "multi_path",
    });
    // multi_path's final step is the convergence step
    expect(r.reasoningSteps.at(-1)!.thought).toContain("Converge");
  });

  it("maps onto the workflow template in analogical mode", () => {
    const r = laserAGIMasterEngine.reason({
      intent: "cut the contour",
      reasoningMode: "analogical",
    });
    expect(r.reasoningSteps[0].thought).toContain("template");
  });

  it("numbers reasoning steps contiguously from 1", () => {
    // intent matches only "cut" → chain_of_thought emits
    // 1 interpret + 1 stage + 1 closing = 3 steps numbered [1,2,3].
    const r = laserAGIMasterEngine.reason({ intent: "cut the contour" });
    expect(r.reasoningSteps).toHaveLength(3);
    expect(r.reasoningSteps.map((s) => s.step)).toEqual([1, 2, 3]);
  });
});

describe("LaserAGIMasterEngine — recommendations & provenance", () => {
  it("flags missing parameter calc and material for an operation intent", () => {
    const r = laserAGIMasterEngine.reason({ intent: "cut the contour" });
    const ids = r.enginePlan.map((p) => p.capabilityId);
    expect(ids).toContain("cut");
    expect(ids).not.toContain("calculate");
    expect(ids).not.toContain("material");
    const topics = r.recommendations.map((rec) => rec.topic);
    expect(topics).toContain("execution"); // always emitted
    expect(topics).toContain("parameters"); // operation without calculate
    expect(topics).toContain("material"); // operation without material
  });

  it("reports honest provenance counts", () => {
    const r = laserAGIMasterEngine.reason({ intent: "cut the contour" });
    expect(r.provenance.enginesConsidered).toBe(9);
    expect(r.provenance.enginesRouted).toBe(r.enginePlan.length);
    expect(r.provenance.catalogVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("LaserAGIMasterEngine — input validation & immutability", () => {
  it("throws on an empty intent", () => {
    expect(() => laserAGIMasterEngine.reason({ intent: "" })).toThrow();
  });

  it("throws on an unknown reasoning mode", () => {
    expect(() =>
      laserAGIMasterEngine.reason({
        intent: "cut the contour",
        reasoningMode: "telepathy" as never,
      }),
    ).toThrow();
  });

  it("returns a defensive copy of the capability catalog", () => {
    const caps = laserAGIMasterEngine.listCapabilities();
    expect(caps).toHaveLength(9);
    const fresh = laserAGIMasterEngine.listCapabilities();
    expect(caps[0]).not.toBe(fresh[0]);
    caps[0].keywords.push("zzz-not-a-real-keyword");
    const after = laserAGIMasterEngine.listCapabilities();
    expect(after[0].keywords).not.toContain("zzz-not-a-real-keyword");
  });
});
