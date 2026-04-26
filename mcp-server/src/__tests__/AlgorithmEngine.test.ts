/**
 * AlgorithmEngine Tests — Unified typed algorithm management
 *
 * Tests calculate, validate, list, info, batch, benchmark methods
 * with real algorithms from the registry.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { AlgorithmEngine, algorithmEngine } from "../engines/AlgorithmEngine.js";
import type { AlgorithmCalculateResult, AlgorithmBatchResult } from "../engines/AlgorithmEngine.js";

describe("AlgorithmEngine", () => {
  let engine: AlgorithmEngine;

  // Correct input params for kienzle: chip_thickness_mm, chip_width_mm
  const kienzleParams = {
    chip_thickness_mm: 0.2,
    chip_width_mm: 2.0,
    material: "steel",
  };

  // Correct input params for chip_thinning: fz_mm, ae_mm, tool_diameter_mm
  const chipThinningParams = {
    fz_mm: 0.1,
    ae_mm: 5.0,
    tool_diameter_mm: 12.0,
  };

  beforeEach(() => {
    engine = new AlgorithmEngine();
  });

  describe("calculate", () => {
    it("executes kienzle algorithm and returns correct cutting force", () => {
      const result = engine.calculate({
        algorithm_id: "kienzle",
        params: kienzleParams,
      });

      expect(result.algorithm_id).toBe("kienzle");
      expect(result.algorithm_name).toBe("Kienzle Specific Cutting Force Model");
      // Fc should be a positive force value in Newtons
      expect(result.result.Fc.value).toBeGreaterThan(100); // Typical cutting force > 100N
      expect(result.result.Fc.value).toBeLessThan(10000); // But < 10kN for these params
      expect(result.result.Fc.unit).toBe("N");
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.execution_time_ms).toBeLessThan(1000); // Should complete in < 1s
    });

    it("executes chip_thinning algorithm with correct compensation", () => {
      const result = engine.calculate({
        algorithm_id: "chip_thinning",
        params: chipThinningParams,
      });

      expect(result.algorithm_id).toBe("chip_thinning");
      // radial_immersion = ae/D = 5/12 ≈ 0.4167
      expect(result.result.radial_immersion).toBeCloseTo(5.0 / 12.0, 4);
      // effective_chip_mm should be less than fz due to thinning
      expect(result.result.effective_chip_mm.value).toBeGreaterThan(0);
      expect(result.result.effective_chip_mm.value).toBeLessThan(chipThinningParams.fz_mm);
      expect(result.result.effective_chip_mm.unit).toBe("mm");
    });

    it("throws for unknown algorithm with descriptive message", () => {
      expect(() =>
        engine.calculate({ algorithm_id: "nonexistent_algo", params: {} })
      ).toThrow('Unknown algorithm: "nonexistent_algo". Use algorithm_list to see available IDs.');
    });

    it("throws validation error for missing required params", () => {
      expect(() =>
        engine.calculate({
          algorithm_id: "kienzle",
          params: {},
        })
      ).toThrow(/Validation failed.*chip_thickness_mm/);
    });

    it("throws validation error for negative chip_thickness", () => {
      expect(() =>
        engine.calculate({
          algorithm_id: "kienzle",
          params: { chip_thickness_mm: -0.1, chip_width_mm: 2.0 },
        })
      ).toThrow(/Validation failed.*chip_thickness_mm/);
    });
  });

  describe("validate", () => {
    it("returns valid true for correct kienzle params", () => {
      const result = engine.validate({
        algorithm_id: "kienzle",
        params: kienzleParams,
      });

      expect(result.algorithm_id).toBe("kienzle");
      expect(result.validation.valid).toBe(true);
      expect(result.validation.issues.filter(i => i.severity === "error")).toHaveLength(0);
    });

    it("returns valid false with issues for empty params", () => {
      const result = engine.validate({
        algorithm_id: "kienzle",
        params: {},
      });

      expect(result.validation.valid).toBe(false);
      expect(result.validation.issues.length).toBeGreaterThan(0);
      expect(result.validation.issues.some((i) => i.severity === "error")).toBe(true);
    });

    it("returns error issue for unknown algorithm", () => {
      const result = engine.validate({ algorithm_id: "fake_algo", params: {} });

      expect(result.validation.valid).toBe(false);
      expect(result.validation.issues[0].field).toBe("algorithm_id");
      expect(result.validation.issues[0].message).toContain("Unknown algorithm");
    });

    it("returns warnings for out-of-range values", () => {
      const result = engine.validate({
        algorithm_id: "kienzle",
        params: {
          chip_thickness_mm: 0.005, // Below min 0.01
          chip_width_mm: 2.0,
        },
      });

      // Should have warnings for clamped value
      expect(result.validation.issues.some((i) => i.severity === "warning")).toBe(true);
    });
  });

  describe("list", () => {
    it("returns all 8 registered algorithms with correct structure", () => {
      const result = engine.list();

      expect(result.total).toBe(8);
      expect(result.algorithms.length).toBe(8);
      expect(result.domains.length).toBeGreaterThan(0);
      expect(result.safety_summary.critical).toBeGreaterThanOrEqual(0);
      expect(result.safety_summary.standard).toBeGreaterThanOrEqual(0);
      expect(result.safety_summary.informational).toBeGreaterThanOrEqual(0);
      expect(result.safety_summary.critical + result.safety_summary.standard + result.safety_summary.informational).toBe(8);
    });

    it("filters by domain and returns only matching algorithms", () => {
      const all = engine.list();
      const firstDomain = all.domains[0];
      const filtered = engine.list({ domain: firstDomain });

      expect(filtered.total).toBeLessThanOrEqual(all.total);
      expect(filtered.algorithms.every((a) => a.domain === firstDomain)).toBe(true);
    });

    it("filters by safety_class critical returns subset", () => {
      const all = engine.list();
      const critical = engine.list({ safety_class: "critical" });

      expect(critical.total).toBe(all.safety_summary.critical);
      expect(critical.algorithms.every((a) => a.safety_class === "critical")).toBe(true);
    });
  });

  describe("info", () => {
    it("returns complete metadata for kienzle algorithm", () => {
      const info = engine.info("kienzle");

      expect(info).not.toBeNull();
      expect(info!.id).toBe("kienzle_force");
      expect(info!.name).toBe("Kienzle Specific Cutting Force Model");
      expect(info!.domain).toBe("physics");
      expect(info!.category).toBe("cutting_force");
      expect(info!.version).toBe("1.0.0");
    });

    it("returns null for unknown algorithm ID", () => {
      const info = engine.info("nonexistent_algorithm");
      expect(info).toBeNull();
    });

    it("returns metadata with references for kienzle", () => {
      const info = engine.info("kienzle");
      expect(info!.references!.length).toBeGreaterThan(0);
      expect(info!.references![0].authors).toContain("Kienzle");
    });
  });

  describe("batch", () => {
    it("executes two algorithms and returns both results", () => {
      const result = engine.batch({
        calculations: [
          { algorithm_id: "kienzle", params: kienzleParams },
          { algorithm_id: "chip_thinning", params: chipThinningParams },
        ],
      });

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(2);

      const kienzleResult = result.results[0] as AlgorithmCalculateResult;
      const chipResult = result.results[1] as AlgorithmCalculateResult;
      expect(kienzleResult.algorithm_id).toBe("kienzle");
      expect(chipResult.algorithm_id).toBe("chip_thinning");
      expect(result.total_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("continues on error by default and reports failure", () => {
      const result = engine.batch({
        calculations: [
          { algorithm_id: "kienzle", params: kienzleParams },
          { algorithm_id: "fake_algo", params: {} },
          { algorithm_id: "chip_thinning", params: chipThinningParams },
        ],
      });

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      const errorResult = result.results[1] as { algorithm_id: string; error: string };
      expect(errorResult.error).toContain("Unknown algorithm");
    });

    it("stops on first error when stop_on_error is true", () => {
      const result = engine.batch({
        calculations: [
          { algorithm_id: "fake_algo", params: {} },
          { algorithm_id: "kienzle", params: kienzleParams },
        ],
        stop_on_error: true,
      });

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.results.length).toBe(1);
    });
  });

  describe("benchmark", () => {
    it("returns timing breakdown for kienzle algorithm", () => {
      const result = engine.benchmark({
        algorithm_id: "kienzle",
        params: kienzleParams,
      });

      expect(result.algorithm_id).toBe("kienzle");
      expect(result.algorithm_name).toBe("Kienzle Specific Cutting Force Model");
      expect(result.validation_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.total_time_ms).toBeCloseTo(result.validation_time_ms + result.execution_time_ms, 1);
    });

    it("throws for unknown algorithm with message", () => {
      expect(() =>
        engine.benchmark({ algorithm_id: "nonexistent", params: {} })
      ).toThrow('Unknown algorithm: "nonexistent"');
    });
  });

  describe("getters", () => {
    it("count returns exactly 8 algorithms", () => {
      expect(engine.count).toBe(8);
    });

    it("algorithmIds returns array with all 8 algorithm IDs", () => {
      const ids = engine.algorithmIds;
      expect(ids.length).toBe(8);
      expect(ids).toContain("kienzle");
      expect(ids).toContain("taylor");
      expect(ids).toContain("chip_thinning");
      expect(ids).toContain("power_torque");
    });
  });

  describe("singleton", () => {
    it("algorithmEngine singleton instance works correctly", () => {
      expect(algorithmEngine).toBeInstanceOf(AlgorithmEngine);
      expect(algorithmEngine.count).toBe(8);
      const result = algorithmEngine.info("kienzle");
      expect(result!.id).toBe("kienzle_force");
    });
  });
});
