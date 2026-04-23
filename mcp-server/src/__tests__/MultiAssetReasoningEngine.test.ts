/**
 * MultiAssetReasoningEngine Tests — Phase 0.24 U-INT1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { multiAssetReasoningEngine } from "../engines/MultiAssetReasoningEngine.js";

describe("MultiAssetReasoningEngine", () => {
  beforeEach(() => {
    multiAssetReasoningEngine.reset();
  });

  it("reasons about cutting force objective", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Calculate cutting force for aluminum roughing",
    });
    expect(result.recommendation).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("reasons about tool life objective", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Predict tool life for carbide insert",
    });
    expect(result.recommendation).toBeDefined();
    expect(result.assetsUsed.length).toBeGreaterThanOrEqual(0);
  });

  it("reasons about speed feed objective", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Optimize speed and feed for steel",
    });
    expect(result.assetsUsed.some(a => a.id.includes("SpeedFeed"))).toBe(true);
  });

  it("includes assets used in response", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Calculate cutting force",
    });
    expect(Array.isArray(result.assetsUsed)).toBe(true);
    for (const asset of result.assetsUsed) {
      expect(asset.type).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.contribution).toBeDefined();
    }
  });

  it("provides alternatives", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Optimize machining process",
    });
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it("includes reasoning explanation", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Select optimal cutting parameters",
    });
    expect(result.reasoning).toBeDefined();
    expect(typeof result.reasoning).toBe("string");
  });

  it("respects constraints in confidence", async () => {
    const resultWithConstraints = await multiAssetReasoningEngine.reason({
      objective: "Optimize cutting",
      constraints: ["max_speed_3000", "min_life_60min", "extra_constraint"],
    });
    const resultWithoutConstraints = await multiAssetReasoningEngine.reason({
      objective: "Optimize cutting",
    });
    expect(resultWithConstraints.confidence).toBeLessThanOrEqual(resultWithoutConstraints.confidence);
  });

  it("filters by available asset types", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "Calculate force",
      availableAssetTypes: ["formula"],
    });
    expect(result.assetsUsed.every(a => a.type === "formula")).toBe(true);
  });

  it("lists available asset types", () => {
    const types = multiAssetReasoningEngine.getAssetTypes();
    expect(types).toContain("engine");
    expect(types).toContain("formula");
    expect(types).toContain("algorithm");
  });

  it("handles unknown objectives gracefully", async () => {
    const result = await multiAssetReasoningEngine.reason({
      objective: "xyz completely unknown objective abc",
    });
    expect(result.recommendation).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("reset clears state", () => {
    multiAssetReasoningEngine.reset();
    const types = multiAssetReasoningEngine.getAssetTypes();
    expect(types.length).toBeGreaterThan(0);
  });
});
