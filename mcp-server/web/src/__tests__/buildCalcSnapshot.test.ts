import { describe, it, expect } from "vitest";
import { buildCalcSnapshot } from "../components/sfc/buildCalcSnapshot";
import { MATERIALS } from "../data/materials";
import { getOperationById } from "../data/operations";
import type { SfcParams } from "../components/sfc/ParameterPanel";
import type { SfcCalculateResult } from "../types/sfc";

// Real fixtures (no stubs).
const material = MATERIALS[0]!;                       // AISI 1045
const operation = getOperationById("slot_milling")!;  // a real (nested) operation
const params: SfcParams = {
  tool_diameter: 12, number_of_teeth: 4, depth: 2, width: 6, tool_material: "Carbide", coolant: "flood",
};
const result: SfcCalculateResult = { cutting_speed: 200, feed_per_tooth: 0.1, spindle_speed: 5305, feed_rate: 2122 };

describe("buildCalcSnapshot", () => {
  it("records the core selections + the optimization GOAL (so history/comparison disambiguate goals)", () => {
    const snap = buildCalcSnapshot(material, operation, "EM-12", params, "productivity", result, "calc-test-1", 123456);
    expect(snap).toMatchObject({
      id: "calc-test-1",
      materialName: material.name,
      materialId: material.id,
      materialGroup: material.group,
      operationLabel: operation.label,
      operationId: operation.id,
      toolName: "EM-12",
      optimizeFor: "productivity",   // THE fix -- the goal is now recorded
      ts: 123456,
    });
    expect(snap.result).toBe(result);
  });

  it("records each distinct goal (cost vs productivity are not collapsed)", () => {
    const cost = buildCalcSnapshot(material, operation, undefined, params, "cost", result, "a", 1);
    const prod = buildCalcSnapshot(material, operation, undefined, params, "productivity", result, "b", 2);
    expect(cost.optimizeFor).toBe("cost");
    expect(prod.optimizeFor).toBe("productivity");
  });

  it("copies params so the snapshot is immutable against later page edits", () => {
    const snap = buildCalcSnapshot(material, operation, undefined, params, "balanced", result, "c", 3);
    expect(snap.params).toEqual(params);
    expect(snap.params).not.toBe(params); // a copy, not the same reference
  });

  it("preserves an absent tool (no tool selected -> toolName undefined)", () => {
    const snap = buildCalcSnapshot(material, operation, undefined, params, "balanced", result, "d", 4);
    expect(snap.toolName).toBe(undefined);
  });
});
