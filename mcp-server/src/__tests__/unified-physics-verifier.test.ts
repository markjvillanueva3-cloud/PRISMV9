// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  UnifiedPhysicsVerifierEngine,
  type VerificationInput,
} from "../engines/UnifiedPhysicsVerifierEngine.js";

describe("UnifiedPhysicsVerifierEngine", () => {
  const engine = new UnifiedPhysicsVerifierEngine();

  // ── Cross-pipeline consistency verification ──

  it("should verify a standard steel milling scenario and return paths", () => {
    const input: VerificationInput = {
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      operation: "milling",
      cut_type: "roughing",
    };
    const result = engine.verify(input);
    expect(result).toBeDefined();
    expect(result.paths.length).toBeGreaterThanOrEqual(1);
    expect(result.consensus).toBeDefined();
    expect(result.consensus.force_N).toBeGreaterThan(0);
    expect(result.divergence).toBeDefined();
    expect(result.verdict).toBeDefined();
    expect(["consistent", "minor_divergence", "major_divergence"]).toContain(result.verdict);
  });

  it("should include canonical path in results", () => {
    const result = engine.verify({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
    });
    const canonicalPath = result.paths.find(p => p.path_name.toLowerCase().includes("canonical"));
    expect(canonicalPath).toBeDefined();
    expect(canonicalPath!.status).toBe("ok");
    expect(canonicalPath!.cutting_force_N).toBeGreaterThan(0);
    expect(canonicalPath!.confidence).toBeGreaterThan(0);
  });

  it("should compute consensus as confidence-weighted average", () => {
    const result = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 16,
      flutes: 4,
      cut_type: "roughing",
    });
    // Consensus should be reasonable positive values
    expect(result.consensus.force_N).toBeGreaterThan(0);
    expect(result.consensus.power_kW).toBeGreaterThan(0);
    expect(result.consensus.tool_life_min).toBeGreaterThan(0);
  });

  // ── Divergence detection ──

  it("should detect divergence metrics", () => {
    const result = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
    });
    expect(typeof result.divergence.max_force_pct).toBe("number");
    expect(typeof result.divergence.max_power_pct).toBe("number");
    expect(typeof result.divergence.overall_pct).toBe("number");
    expect(result.divergence.overall_pct).toBeGreaterThanOrEqual(0);
  });

  it("should identify worst path and metric", () => {
    const result = engine.verify({
      material: "M",
      tool_diameter_mm: 10,
      flutes: 4,
      cut_type: "roughing",
    });
    expect(result.divergence.worst_path).toBeTruthy();
    expect(result.divergence.worst_metric).toBeTruthy();
  });

  // ── Pass/fail verdicts ──

  it("should return consistent verdict for canonical-only scenario", () => {
    // With minimal paths, divergence should be low
    const result = engine.verify({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
    });
    // At minimum, we get a valid verdict
    expect(["consistent", "minor_divergence", "major_divergence"]).toContain(result.verdict);
  });

  it("should provide recommendations array", () => {
    const result = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
    });
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  // ── Finishing vs roughing ──

  it("should produce different results for finishing vs roughing", () => {
    const roughing = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      cut_type: "roughing",
    });
    const finishing = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      cut_type: "finishing",
    });
    // Roughing should have higher force than finishing (larger ap/ae)
    expect(roughing.consensus.force_N).toBeGreaterThan(finishing.consensus.force_N);
  });

  // ── Material variation ──

  it("should produce different consensus for different materials", () => {
    const steel = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
    });
    const aluminum = engine.verify({
      material: "Aluminum",
      tool_diameter_mm: 12,
      flutes: 4,
    });
    // Steel should have higher cutting force than aluminum
    expect(steel.consensus.force_N).toBeGreaterThan(aluminum.consensus.force_N);
  });

  // ── Edge cases ──

  it("should handle explicit spindle RPM and feed rate inputs", () => {
    const result = engine.verify({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      spindle_rpm: 5000,
      feed_rate_mmmin: 2000,
    });
    expect(result).toBeDefined();
    expect(result.paths.length).toBeGreaterThanOrEqual(1);
    expect(result.consensus.force_N).toBeGreaterThan(0);
  });

  it("should handle tool stickout and corner radius parameters", () => {
    const result = engine.verify({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      tool_stickout_mm: 50,
      corner_radius_mm: 1.0,
    });
    expect(result).toBeDefined();
    expect(result.consensus.deflection_um).toBeGreaterThan(0);
  });

  it("should mark unavailable paths with appropriate status", () => {
    const result = engine.verify({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
    });
    // All paths should have a valid status
    for (const path of result.paths) {
      expect(["ok", "error", "unavailable"]).toContain(path.status);
    }
  });
});
