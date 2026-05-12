/**
 * MS-WIRE-2: Algorithm Registry Wiring Tests
 *
 * Validates that all 51 algorithms are properly wired into ALGORITHM_REGISTRY.
 * Tests:
 * - Registry completeness (51 algorithms)
 * - Algorithm instantiation via createAlgorithm()
 * - Category coverage (12 categories)
 * - Metadata availability
 * - Basic validation and calculation
 */

import { describe, it, expect } from "vitest";
import {
  ALGORITHM_REGISTRY,
  createAlgorithm,
  listAlgorithms,
  type AlgorithmId,
} from "../algorithms/index.js";

// ═══════════════════════════════════════════════════════════════════
// REGISTRY COMPLETENESS TESTS
// ═══════════════════════════════════════════════════════════════════

describe("MS-WIRE-2: Algorithm Registry Wiring", () => {
  describe("Registry Completeness", () => {
    it("should have 51 algorithms in ALGORITHM_REGISTRY", () => {
      const count = Object.keys(ALGORITHM_REGISTRY).length;
      expect(count).toBe(51);
    });

    it("should list 51 algorithms via listAlgorithms()", () => {
      const ids = listAlgorithms();
      expect(ids.length).toBe(51);
    });

    it("should have all algorithm IDs unique", () => {
      const ids = listAlgorithms();
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY COVERAGE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Category Coverage", () => {
    const EXPECTED_CATEGORIES: Record<string, AlgorithmId[]> = {
      signal_processing: ["fft", "wavelet", "stft", "spindle_vib_fft"],
      control: ["kalman", "pid", "fuzzy", "adaptive_controller"],
      optimization: ["genetic", "particle_swarm", "simulated_annealing", "bayesian_opt", "ant_colony"],
      manufacturing_physics: [
        "kienzle", "taylor", "johnson_cook", "surface_finish", "stability_lobe",
        "chip_thinning", "thermal_partition", "power_torque", "tool_deflection", "tool_wear",
        "chip_breaking", "chip_evacuation", "chip_volume_rate", "gilbert_mrr", "frf_stability", "coolant_flow",
      ],
      ml_inference: [
        "neural_inference", "decision_tree", "clustering", "regression",
        "anomaly_detector", "time_series", "ensemble_predictor", "bayesian_wear",
      ],
      geometry_math: ["minkowski", "interpolation", "swept_volume", "cwez_buffer"],
      thermal: ["thermal_fea", "jaeger_temp"],
      fea_structural: ["fea_2d", "rcsa"],
      wear: ["usui_wear"],
      planning: ["csp_setup", "dp_multipass", "ilp_assignment"],
      stochastic: ["monte_carlo"],
      digital_twin: ["digital_twin"],
    };

    for (const [category, expectedIds] of Object.entries(EXPECTED_CATEGORIES)) {
      it(`should have ${expectedIds.length} algorithms in ${category} category`, () => {
        for (const id of expectedIds) {
          expect(ALGORITHM_REGISTRY[id]).toBeDefined();
        }
      });
    }

    it("should have all algorithms in EXPECTED_CATEGORIES sum to 51", () => {
      const total = Object.values(EXPECTED_CATEGORIES).reduce((sum, ids) => sum + ids.length, 0);
      expect(total).toBe(51);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ALGORITHM INSTANTIATION TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Algorithm Instantiation", () => {
    const ids = listAlgorithms();

    it.each(ids)("createAlgorithm('%s') should return a valid algorithm", (id) => {
      const algo = createAlgorithm(id);
      expect(algo).not.toBeNull();
    });

    it("createAlgorithm('invalid_id') should return null", () => {
      const algo = createAlgorithm("invalid_id");
      expect(algo).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // METADATA AVAILABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Algorithm Metadata", () => {
    const SAMPLE_ALGORITHMS: AlgorithmId[] = [
      "kienzle", "taylor", "fft", "kalman", "genetic", "monte_carlo",
    ];

    it.each(SAMPLE_ALGORITHMS)("%s should have getMetadata() method", (id) => {
      const algo = createAlgorithm(id);
      expect(algo).not.toBeNull();
      expect(typeof algo!.getMetadata).toBe("function");
    });

    it.each(SAMPLE_ALGORITHMS)("%s metadata should have required fields", (id) => {
      const algo = createAlgorithm(id);
      const meta = algo!.getMetadata();
      expect(meta).toHaveProperty("id");
      expect(meta).toHaveProperty("name");
      expect(meta).toHaveProperty("domain");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION METHOD TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Algorithm Validation", () => {
    it("kienzle should validate correct input", () => {
      const algo = createAlgorithm("kienzle");
      const result = algo!.validate({
        material: "steel",
        iso_group: "P",
        chip_thickness_mm: 0.2,
        chip_width_mm: 2.0,
      });
      expect(result.valid).toBe(true);
    });

    it("taylor should validate correct input", () => {
      const algo = createAlgorithm("taylor");
      const result = algo!.validate({
        Vc_m_min: 200,
        material: "steel",
        iso_group: "P",
        f_mm: 0.2,
        ap_mm: 2.0,
      });
      expect(result.valid).toBe(true);
    });

    it("monte_carlo should validate correct input", () => {
      const algo = createAlgorithm("monte_carlo");
      const result = algo!.validate({
        variables: [
          { name: "vc", distribution: "normal", mean: 200, std: 10 },
        ],
        model_type: "tool_life",
        n_samples: 100,
      });
      expect(result.valid).toBe(true);
    });

    it("genetic should validate correct input", () => {
      const algo = createAlgorithm("genetic");
      const result = algo!.validate({
        dimensions: 3,
        lower_bounds: [0, 0, 0],
        upper_bounds: [100, 100, 100],
        objectives: 2,
      });
      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATION TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Algorithm Calculation", () => {
    it("kienzle should calculate cutting force", () => {
      const algo = createAlgorithm("kienzle");
      const result = algo!.calculate({
        material: "steel",
        iso_group: "P",
        chip_thickness_mm: 0.2,
        chip_width_mm: 2.0,
      });
      // Kienzle returns Fc as AtomicValue with .value property
      expect(result).toHaveProperty("Fc");
      expect(result.Fc.value).toBeGreaterThan(0);
    });

    it("taylor should calculate tool life", () => {
      const algo = createAlgorithm("taylor");
      const result = algo!.calculate({
        Vc_m_min: 200,
        material: "steel",
        iso_group: "P",
        f_mm: 0.2,
        ap_mm: 2.0,
      });
      // Taylor returns tool_life_min as AtomicValue
      expect(result).toHaveProperty("tool_life_min");
      expect(result.tool_life_min.value).toBeGreaterThan(0);
    });

    it("surface_finish should calculate Ra", () => {
      const algo = createAlgorithm("surface_finish");
      const result = algo!.calculate({
        feed_mm: 0.15,
        tool_radius_mm: 0.8,
        Vc_m_min: 200,
      });
      // SurfaceFinish returns Ra as AtomicValue
      expect(result).toHaveProperty("Ra");
      expect(result.Ra.value).toBeGreaterThan(0);
    });

    it("power_torque should calculate spindle power", () => {
      const algo = createAlgorithm("power_torque");
      const result = algo!.calculate({
        Fc_N: 1000,
        Vc_m_min: 200,
        spindle_rpm: 3000,
      });
      // PowerTorque returns cutting_power_kW as AtomicValue
      expect(result).toHaveProperty("cutting_power_kW");
      expect(result.cutting_power_kW.value).toBeGreaterThan(0);
    });

    it("chip_thinning should calculate effective chip thickness", () => {
      const algo = createAlgorithm("chip_thinning");
      const result = algo!.calculate({
        fz_mm: 0.1,
        tool_diameter_mm: 12,
        ae_mm: 3,
      });
      // ChipThinning returns effective_chip_mm as AtomicValue
      expect(result).toHaveProperty("effective_chip_mm");
      expect(result.effective_chip_mm.value).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ALGORITHM INTERFACE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe("Algorithm Interface Compliance", () => {
    const ids = listAlgorithms();

    it.each(ids)("%s should have validate() method", (id) => {
      const algo = createAlgorithm(id);
      expect(typeof algo!.validate).toBe("function");
    });

    it.each(ids)("%s should have calculate() method", (id) => {
      const algo = createAlgorithm(id);
      expect(typeof algo!.calculate).toBe("function");
    });

    it.each(ids)("%s should have getMetadata() method", (id) => {
      const algo = createAlgorithm(id);
      expect(typeof algo!.getMetadata).toBe("function");
    });
  });
});
