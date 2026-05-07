/**
 * NeuralCADGenerationEngine — PHASE24 wiring tests.
 *
 * Covers the deterministic surface: extractFeaturesFromText, parseInput,
 * featuresToDescription, blueprintToDescription, blueprintToFeatures,
 * capabilities, validate. The async generate() pipeline needs a backend
 * and is exercised by the dispatcher e2e suite.
 */
import { describe, it, expect } from "vitest";
import {
  NeuralCADGenerationEngine,
  neuralCADGenerationEngine,
  type FeatureSpec,
  type BlueprintData,
} from "../engines/NeuralCADGenerationEngine.js";

describe("NeuralCADGenerationEngine", () => {
  it("singleton is a real NeuralCADGenerationEngine instance", () => {
    expect(neuralCADGenerationEngine).toBeInstanceOf(NeuralCADGenerationEngine);
  });

  it("getCapabilities returns 5 capability slots", () => {
    const caps = neuralCADGenerationEngine.getCapabilities();
    expect(caps.length).toBe(5);
    const names = caps.map(c => c.name).sort();
    expect(names).toEqual([
      "generate",
      "list_patterns",
      "parse_input",
      "to_cadquery",
      "validate",
    ]);
  });

  it("validate rejects null", () => {
    expect(neuralCADGenerationEngine.validate(null)).toBe("input must be an object");
  });

  it("validate accepts empty object", () => {
    expect(neuralCADGenerationEngine.validate({})).toBe(null);
  });

  it("extractFeaturesFromText returns array for any text", () => {
    const f = neuralCADGenerationEngine.extractFeaturesFromText("");
    expect(Array.isArray(f)).toBe(true);
    expect(f.length).toBe(0);
  });

  it("extractFeaturesFromText finds features in 'flange' text", () => {
    const f = neuralCADGenerationEngine.extractFeaturesFromText("flange with bolts");
    expect(Array.isArray(f)).toBe(true);
  });

  it("featuresToDescription handles empty list", () => {
    expect(neuralCADGenerationEngine.featuresToDescription([])).toBe("Simple part");
  });

  it("featuresToDescription emits readable text for non-empty list", () => {
    const f: FeatureSpec[] = [{ type: "cylinder", params: { diameter: 30, length: 50 } }];
    const desc = neuralCADGenerationEngine.featuresToDescription(f);
    expect(desc.startsWith("Part with: cylinder(")).toBe(true);
    expect(desc.includes("diameter=30")).toBe(true);
    expect(desc.includes("length=50")).toBe(true);
  });

  it("blueprintToDescription includes material + dimensions when present", () => {
    const bp: BlueprintData = {
      material: "AISI 1018",
      dimensions: [
        { name: "OD", value: 50, unit: "mm" },
        { name: "ID", value: 25, unit: "mm" },
      ],
      features: ["cylinder"],
    };
    const desc = neuralCADGenerationEngine.blueprintToDescription(bp);
    expect(desc.includes("Material: AISI 1018")).toBe(true);
    expect(desc.includes("OD=50mm")).toBe(true);
    expect(desc.includes("ID=25mm")).toBe(true);
  });

  it("blueprintToDescription on empty blueprint is empty string", () => {
    const bp: BlueprintData = { dimensions: [], features: [] };
    expect(neuralCADGenerationEngine.blueprintToDescription(bp)).toBe("");
  });

  it("blueprintToFeatures returns array for blueprint with features", () => {
    const bp: BlueprintData = {
      dimensions: [],
      features: ["flange"],
    };
    const f = neuralCADGenerationEngine.blueprintToFeatures(bp);
    expect(Array.isArray(f)).toBe(true);
  });

  it("parseInput type=text routes to text path with description set", () => {
    const parsed = neuralCADGenerationEngine.parseInput({
      type: "text",
      text: "make a 25mm shaft",
    });
    expect(parsed.description).toBe("make a 25mm shaft");
    expect(Array.isArray(parsed.features)).toBe(true);
  });

  it("parseInput type=features routes to feature path with auto-description", () => {
    const parsed = neuralCADGenerationEngine.parseInput({
      type: "features",
      features: [{ type: "cylinder", params: { diameter: 30, length: 50 } }],
    });
    expect(parsed.features.length).toBe(1);
    expect(parsed.description.startsWith("Part with:")).toBe(true);
  });

  it("parseInput type=tokens emits raw-token marker description", () => {
    const parsed = neuralCADGenerationEngine.parseInput({ type: "tokens" });
    expect(parsed.description).toBe("Raw token sequence");
  });

  it("class instances are independent of singleton", () => {
    const fresh = new NeuralCADGenerationEngine();
    expect(fresh).not.toBe(neuralCADGenerationEngine);
    expect(fresh.getCapabilities().length).toBe(5);
  });
});
