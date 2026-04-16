/**
 * InsertGradeSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { insertGradeSelectionEngine } from "../engines/InsertGradeSelectionEngine.js";

describe("InsertGradeSelectionEngine", () => {
  const base = {
    workpiece_material: "medium_carbon_steel" as const,
    operation: "roughing" as const,
  };

  it("iso range > 0", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(r.iso_range.value).toBeGreaterThan(0);
  });

  it("iso application group is valid", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(["P", "M", "K", "N", "S", "H"]).toContain(r.iso_application_group);
  });

  it("substrate class is string", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(typeof r.substrate_class).toBe("string");
  });

  it("chipbreaker is string", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(typeof r.chipbreaker).toBe("string");
  });

  it("recommendations is array", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it("surfaces playbook guidance in recommendations", () => {
    const r = insertGradeSelectionEngine.calculate(base);
    expect(r.recommendations.some((rec) => rec.includes("[Playbook"))).toBe(true);
  });
});
