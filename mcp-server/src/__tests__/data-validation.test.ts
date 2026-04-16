/**
 * Tests for DataValidationEngine — DQ-MS1
 */
import { describe, it, expect } from "vitest";
import { DataValidationEngine } from "../engines/DataValidationEngine.js";

describe("DataValidationEngine", () => {
  it("creates instance", () => {
    const engine = new DataValidationEngine();
    expect(engine).toBeDefined();
    expect(engine.stats().validation_count).toBe(0);
  });

  // ── Material Validation ─────────────────────────────────────────

  it("validates valid material", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateMaterial({
      name: "AISI 4140",
      hardness_hrc: 28,
      tensile_strength_mpa: 950,
      density_kg_m3: 7850,
      iso_group: "P",
    });
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(80);
    expect(result.issues.length).toBe(0);
  });

  it("rejects missing material name", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateMaterial({});
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.field === "name")).toBe(true);
  });

  it("detects out-of-range hardness", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateMaterial({
      name: "Test", hardness_hrc: 80,
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0].field).toBe("hardness_hrc");
  });

  it("warns on unusual tensile/hardness ratio", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateMaterial({
      name: "Odd", hardness_hrc: 30, tensile_strength_mpa: 3000,
    });
    const warning = result.issues.find(
      i => i.field === "tensile_strength_mpa" && i.severity === "warning"
    );
    expect(warning).toBeDefined();
  });

  it("rejects invalid ISO group", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateMaterial({
      name: "Test", iso_group: "Z",
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0].field).toBe("iso_group");
  });

  // ── Cutting Parameter Validation ────────────────────────────────

  it("validates valid cutting params", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateCuttingParams({
      speed_mpm: 200,
      feed_mmpt: 0.1,
      depth_mm: 3,
      width_mm: 10,
      tool_diameter_mm: 12,
      spindle_rpm: 5305,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects negative values", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateCuttingParams({ speed_mpm: -10 });
    expect(result.valid).toBe(false);
    expect(result.issues[0].severity).toBe("error");
  });

  it("warns on speed/RPM inconsistency", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateCuttingParams({
      speed_mpm: 100,
      spindle_rpm: 10000,
      tool_diameter_mm: 12,
    });
    const warning = result.issues.find(i => i.field === "speed_mpm");
    expect(warning).toBeDefined();
  });

  it("warns on excessive depth", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateCuttingParams({
      depth_mm: 50,
      tool_diameter_mm: 10,
    });
    expect(
      result.issues.some(i => i.field === "depth_mm")
    ).toBe(true);
  });

  it("errors on width exceeding diameter", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateCuttingParams({
      width_mm: 15,
      tool_diameter_mm: 12,
    });
    expect(result.valid).toBe(false);
  });

  // ── Job Validation ──────────────────────────────────────────────

  it("validates complete job", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateJob({
      part_name: "Bracket",
      material: "6061-T6",
      quantity: 100,
      machine: "Haas VF-2",
      operations: [{ type: "milling", tool: "12mm endmill" }],
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
    });
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(80);
  });

  it("requires part_name, material, quantity, machine", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateJob({});
    expect(result.valid).toBe(false);
    const errorFields = result.issues
      .filter(i => i.severity === "error")
      .map(i => i.field);
    expect(errorFields).toContain("part_name");
    expect(errorFields).toContain("material");
    expect(errorFields).toContain("quantity");
    expect(errorFields).toContain("machine");
  });

  it("warns on missing operations", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateJob({
      part_name: "X", material: "Y", quantity: 1, machine: "Z",
    });
    expect(
      result.issues.some(i => i.field === "operations")
    ).toBe(true);
  });

  it("warns on past due date", () => {
    const engine = new DataValidationEngine();
    const result = engine.validateJob({
      part_name: "X", material: "Y", quantity: 1, machine: "Z",
      due_date: "2020-01-01T00:00:00Z",
    });
    expect(
      result.issues.some(
        i => i.field === "due_date" && i.severity === "warning"
      )
    ).toBe(true);
  });

  it("increments validation count", () => {
    const engine = new DataValidationEngine();
    engine.validateMaterial({ name: "A" });
    engine.validateCuttingParams({});
    engine.validateJob({ part_name: "B", material: "C", quantity: 1, machine: "D" });
    expect(engine.stats().validation_count).toBe(3);
  });

  it("exports singleton", async () => {
    const { dataValidationEngine } = await import(
      "../engines/DataValidationEngine.js"
    );
    expect(dataValidationEngine).toBeDefined();
    expect(dataValidationEngine).toBeInstanceOf(DataValidationEngine);
  });
});
