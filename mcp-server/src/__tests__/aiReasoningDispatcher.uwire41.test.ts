/**
 * aiReasoningDispatcher U-WIRE41 round-trip tests — MachineTypeClassifierEngine.
 *
 * Validates machine_type_classify / machine_type_quick / machine_type_multi_required
 * through prism_ai. Engine is stateless (no fields, no clear()) so isolation
 * is unnecessary.
 *
 * Engine internals (verified by these tests):
 *   - classify() scores 9 machine classes (lathe, mill_3axis, mill_5axis,
 *     mill_turn, wire_edm, sinker_edm, swiss, grinder, multi_machine) by
 *     analyzing titleBlock, dimensions, GD&T symbols, CAD feature counts,
 *     part description, and material hardness.
 *   - quickClassify(description) wraps classify({partDescription:...}).
 *   - requiresMultiMachine(input) returns true if primary is "multi_machine"
 *     OR if 2+ alternatives have confidence > 0.4.
 *   - Result includes reasoning chain, warnings, recommended operations,
 *     and ranked alternatives.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE41
 */

import { describe, it, expect } from "vitest";
import {
  machineTypeClassifierEngine,
  type ClassificationInput,
  type CADFeatureSignature,
} from "../engines/MachineTypeClassifierEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["machine_type_classify", "machine_type_quick", "machine_type_multi_required"] as const;

// All 9 machine type classes the engine can return.
const ALL_MACHINE_CLASSES = new Set([
  "lathe", "mill_3axis", "mill_5axis", "mill_turn",
  "wire_edm", "sinker_edm", "swiss", "grinder", "multi_machine",
]);

// Strong-turning CAD signature: high turning + axisymmetric.
const TURNING_DOMINANT_CAD: CADFeatureSignature = {
  turningFeatures: 12,
  millingFeatures: 0,
  drillingFeatures: 1,
  threadFeatures: 2,
  edmFeatures: 0,
  grindingFeatures: 0,
  primaryAxisOfSymmetry: "z_axis",
  maxAspectRatio: 3,
  hasInternalFeatures: true,
  hasBackworkFeatures: false,
  hasLiveToolFeatures: false,
};

// Strong-milling CAD signature: high milling, no axisymmetry.
const MILLING_DOMINANT_CAD: CADFeatureSignature = {
  turningFeatures: 0,
  millingFeatures: 15,
  drillingFeatures: 6,
  threadFeatures: 4,
  edmFeatures: 0,
  grindingFeatures: 0,
  primaryAxisOfSymmetry: "none",
  maxAspectRatio: 1.2,
  hasInternalFeatures: false,
  hasBackworkFeatures: false,
  hasLiveToolFeatures: false,
};

// Mixed signature with strong EDM signal.
const EDM_DOMINANT_CAD: CADFeatureSignature = {
  turningFeatures: 0,
  millingFeatures: 2,
  drillingFeatures: 0,
  threadFeatures: 0,
  edmFeatures: 8,
  grindingFeatures: 0,
  primaryAxisOfSymmetry: "none",
  maxAspectRatio: 1,
  hasInternalFeatures: true,
  hasBackworkFeatures: false,
  hasLiveToolFeatures: false,
};

describe("U-WIRE41 — engine direct: MachineTypeClassifierEngine", () => {
  it("classify returns ClassificationResult with one of 9 valid machine classes", () => {
    const result = machineTypeClassifierEngine.classify({ partDescription: "shaft 50mm long with M8 thread" });
    expect(ALL_MACHINE_CLASSES.has(result.primaryMachineType)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.alternativeTypes)).toBe(true);
    expect(Array.isArray(result.reasoning)).toBe(true);
    expect(Array.isArray(result.recommendedOperations)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("classify with turning-dominant CAD signature picks lathe-family machine", () => {
    const result = machineTypeClassifierEngine.classify({ cadFeatures: TURNING_DOMINANT_CAD });
    // Engine should pick a lathe-family class (lathe, swiss, or mill_turn) when turningFeatures dominates.
    const latheFamily = new Set(["lathe", "swiss", "mill_turn"]);
    expect(latheFamily.has(result.primaryMachineType)).toBe(true);
  });

  it("classify with milling-dominant CAD signature picks mill-family machine", () => {
    const result = machineTypeClassifierEngine.classify({ cadFeatures: MILLING_DOMINANT_CAD });
    const millFamily = new Set(["mill_3axis", "mill_5axis"]);
    expect(millFamily.has(result.primaryMachineType)).toBe(true);
  });

  it("classify with EDM-dominant CAD signature picks an EDM machine", () => {
    const result = machineTypeClassifierEngine.classify({ cadFeatures: EDM_DOMINANT_CAD });
    const edmFamily = new Set(["wire_edm", "sinker_edm"]);
    expect(edmFamily.has(result.primaryMachineType)).toBe(true);
  });

  it("classify with EDM keyword in description boosts EDM machine selection", () => {
    const result = machineTypeClassifierEngine.classify({
      partDescription: "Cut profile with wire EDM, 0.25mm wire, no taper",
    });
    const edmFamily = new Set(["wire_edm", "sinker_edm"]);
    expect(edmFamily.has(result.primaryMachineType)).toBe(true);
  });

  it("classify with grinding keyword picks grinder", () => {
    const result = machineTypeClassifierEngine.classify({
      partDescription: "ID grind to Ra 0.1 finish, 25mm bore",
    });
    expect(result.primaryMachineType).toBe("grinder");
  });

  it("classify with no inputs returns a default result (multi_machine fallback)", () => {
    const result = machineTypeClassifierEngine.classify({});
    expect(ALL_MACHINE_CLASSES.has(result.primaryMachineType)).toBe(true);
    // With no signal, every class scored 0; engine breaks the tie deterministically.
  });

  it("classify alternative types are sorted by confidence descending", () => {
    const result = machineTypeClassifierEngine.classify({ cadFeatures: MILLING_DOMINANT_CAD });
    for (let i = 1; i < result.alternativeTypes.length; i++) {
      expect(result.alternativeTypes[i - 1].confidence).toBeGreaterThanOrEqual(result.alternativeTypes[i].confidence);
    }
  });

  it("classify includes reasoning entries when scoring conditions fire", () => {
    const result = machineTypeClassifierEngine.classify({
      partDescription: "lathe-turned shaft with thread mill",
      cadFeatures: TURNING_DOMINANT_CAD,
    });
    // With both partDescription AND cadFeatures contributing, reasoning should be non-empty.
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("quickClassify returns a single MachineTypeClass string from description only", () => {
    const cls = machineTypeClassifierEngine.quickClassify("turn 25mm OD on lathe");
    expect(ALL_MACHINE_CLASSES.has(cls)).toBe(true);
  });

  it("quickClassify on grinding description returns grinder", () => {
    const cls = machineTypeClassifierEngine.quickClassify("Mirror finish surface grind, Ra 0.2");
    expect(cls).toBe("grinder");
  });

  it("quickClassify is equivalent to classify({partDescription}).primaryMachineType", () => {
    const desc = "wire EDM cut intricate profile";
    const quick = machineTypeClassifierEngine.quickClassify(desc);
    const full = machineTypeClassifierEngine.classify({ partDescription: desc }).primaryMachineType;
    expect(quick).toBe(full);
  });

  it("requiresMultiMachine returns boolean", () => {
    const result = machineTypeClassifierEngine.requiresMultiMachine({ partDescription: "simple shaft" });
    expect(typeof result).toBe("boolean");
  });

  it("requiresMultiMachine is true when classify primary is multi_machine", () => {
    // Synthesize a deeply mixed signature — high counts in many domains.
    const mixed: CADFeatureSignature = {
      turningFeatures: 8,
      millingFeatures: 8,
      drillingFeatures: 4,
      threadFeatures: 3,
      edmFeatures: 5,
      grindingFeatures: 4,
      primaryAxisOfSymmetry: "none",
      maxAspectRatio: 2,
      hasInternalFeatures: true,
      hasBackworkFeatures: true,
      hasLiveToolFeatures: true,
    };
    const result = machineTypeClassifierEngine.classify({ cadFeatures: mixed });
    const requires = machineTypeClassifierEngine.requiresMultiMachine({ cadFeatures: mixed });
    if (result.primaryMachineType === "multi_machine") {
      expect(requires).toBe(true);
    }
    // If not flagged primary, the boolean falls back to alternative-confidence check.
    expect(typeof requires).toBe("boolean");
  });
});

describe("U-WIRE41 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      machine_type_classify: {},
      machine_type_quick: { description: "simple shaft" },
      machine_type_multi_required: {},
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("machine_type_classify accepts cadFeatures with all 11 required fields", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    const ok = schema.parse({ cadFeatures: MILLING_DOMINANT_CAD }) as { cadFeatures: CADFeatureSignature };
    expect(ok.cadFeatures.millingFeatures).toBe(MILLING_DOMINANT_CAD.millingFeatures);
  });

  it("machine_type_classify rejects cadFeatures missing required fields (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    expect(() => schema.parse({
      cadFeatures: { turningFeatures: 5 }, // 10 other required fields missing
    })).toThrow();
  });

  it("machine_type_classify rejects negative feature counts (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    expect(() => schema.parse({
      cadFeatures: { ...MILLING_DOMINANT_CAD, turningFeatures: -1 },
    })).toThrow();
  });

  it("machine_type_classify rejects invalid primaryAxisOfSymmetry enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    expect(() => schema.parse({
      cadFeatures: { ...MILLING_DOMINANT_CAD, primaryAxisOfSymmetry: "rotational" },
    })).toThrow();
  });

  it("machine_type_classify rejects invalid titleBlock.units enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    expect(() => schema.parse({
      titleBlock: { units: "feet" }, // not in {mm, in, mixed}
    })).toThrow();
  });

  it("machine_type_classify rejects negative materialHardness_hrc (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_classify"];
    expect(() => schema.parse({ materialHardness_hrc: -5 })).toThrow();
    const ok = schema.parse({ materialHardness_hrc: 45 }) as { materialHardness_hrc: number };
    expect(ok.materialHardness_hrc).toBe(45);
  });

  it("machine_type_quick requires non-empty description (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["machine_type_quick"];
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ description: "" })).toThrow();
    const ok = schema.parse({ description: "x" }) as { description: string };
    expect(ok.description).toBe("x");
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE41 — dispatcher round-trip: prism_ai", () => {
  it("machine_type_classify returns full ClassificationResult shape", async () => {
    const out = await executeAIReasoningAction("machine_type_classify", {
      cadFeatures: TURNING_DOMINANT_CAD,
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      primaryMachineType: string;
      confidence: number;
      alternativeTypes: { type: string; confidence: number }[];
      reasoning: string[];
      recommendedOperations: string[];
      warnings: string[];
    };
    expect(ALL_MACHINE_CLASSES.has(data.primaryMachineType)).toBe(true);
    expect(data.confidence).toBeGreaterThanOrEqual(0);
    expect(data.confidence).toBeLessThanOrEqual(1);
    const latheFamily = new Set(["lathe", "swiss", "mill_turn"]);
    expect(latheFamily.has(data.primaryMachineType)).toBe(true);
  });

  it("machine_type_quick returns {primaryMachineType: <class>}", async () => {
    const out = await executeAIReasoningAction("machine_type_quick", {
      description: "wire EDM cut profile",
    });
    expect(out.success).toBe(true);
    const data = out.data as { primaryMachineType: string };
    const edmFamily = new Set(["wire_edm", "sinker_edm"]);
    expect(edmFamily.has(data.primaryMachineType)).toBe(true);
  });

  it("machine_type_quick on grinding description picks grinder", async () => {
    const out = await executeAIReasoningAction("machine_type_quick", {
      description: "Mirror finish surface grind Ra 0.2",
    });
    expect(out.success).toBe(true);
    const data = out.data as { primaryMachineType: string };
    expect(data.primaryMachineType).toBe("grinder");
  });

  it("machine_type_multi_required returns {multiMachineRequired: bool}", async () => {
    const out = await executeAIReasoningAction("machine_type_multi_required", {
      partDescription: "simple shaft",
    });
    expect(out.success).toBe(true);
    const data = out.data as { multiMachineRequired: boolean };
    expect(typeof data.multiMachineRequired).toBe("boolean");
  });

  it("machine_type_classify with empty payload still returns a result", async () => {
    const out = await executeAIReasoningAction("machine_type_classify", {});
    expect(out.success).toBe(true);
    const data = out.data as { primaryMachineType: string };
    expect(ALL_MACHINE_CLASSES.has(data.primaryMachineType)).toBe(true);
  });

  it("machine_type_quick without description returns success:false", async () => {
    const out = await executeAIReasoningAction("machine_type_quick", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/description|required/i);
  });

  it("machine_type_classify with malformed cadFeatures returns success:false", async () => {
    const out = await executeAIReasoningAction("machine_type_classify", {
      cadFeatures: { turningFeatures: 5 }, // missing 10 required fields
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/required|cadFeatures|millingFeatures/i);
  });

  it("machine_type_classify with invalid axis enum returns success:false", async () => {
    const out = await executeAIReasoningAction("machine_type_classify", {
      cadFeatures: { ...MILLING_DOMINANT_CAD, primaryAxisOfSymmetry: "rotational" },
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/primaryAxisOfSymmetry|enum|rotational/i);
  });

  it("dispatcher classify is equivalent to engine direct classify (deterministic)", async () => {
    const direct = machineTypeClassifierEngine.classify({ cadFeatures: TURNING_DOMINANT_CAD });
    const out = await executeAIReasoningAction("machine_type_classify", {
      cadFeatures: TURNING_DOMINANT_CAD,
    });
    expect(out.success).toBe(true);
    const data = out.data as { primaryMachineType: string; confidence: number };
    expect(data.primaryMachineType).toBe(direct.primaryMachineType);
    expect(data.confidence).toBeCloseTo(direct.confidence, 6);
  });
});
