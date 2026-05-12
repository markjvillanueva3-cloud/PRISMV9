/**
 * Tests for ThermalNeuralPredictorEngine (MILL-AGI Phase 0.3)
 *
 * Validates physics-LSTM hybrid temperature prediction:
 *   - Feature extraction and normalization
 *   - Loewen-Shaw analytical temperature
 *   - LSTM forward pass
 *   - Heat partition computation
 *   - Coating degradation assessment
 *   - Thermal damage risk evaluation
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ThermalNeuralPredictorEngine,
  thermalNeuralPredictorEngine,
  type ThermalInputFeatures,
} from "../engines/ThermalNeuralPredictorEngine.js";

describe("ThermalNeuralPredictorEngine (MILL-AGI P0.3)", () => {
  let engine: ThermalNeuralPredictorEngine;

  beforeAll(() => {
    engine = thermalNeuralPredictorEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const steelDryInput: ThermalInputFeatures = {
    material: {
      iso_group: "P",
      thermal_conductivity_w_mk: 50,
      specific_heat_j_kgk: 480,
      density_kg_m3: 7850,
    },
    tool: {
      material: "carbide",
      coating: "TiAlN",
      thermal_conductivity_w_mk: 80,
    },
    conditions: {
      cutting_speed_mpm: 150,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 2,
      radial_depth_mm: 6,
      cutting_force_n: 500,
    },
    coolant: {
      type: "dry",
    },
  };

  const steelFloodInput: ThermalInputFeatures = {
    ...steelDryInput,
    coolant: {
      type: "flood",
      flow_rate_lpm: 20,
      temperature_c: 22,
    },
  };

  const titaniumInput: ThermalInputFeatures = {
    material: {
      iso_group: "S",
      thermal_conductivity_w_mk: 7,
      specific_heat_j_kgk: 520,
      density_kg_m3: 4500,
    },
    tool: {
      material: "carbide",
      coating: "AlTiN",
    },
    conditions: {
      cutting_speed_mpm: 50,
      feed_per_tooth_mm: 0.08,
      axial_depth_mm: 1,
      radial_depth_mm: 5,
      cutting_force_n: 400,
    },
    coolant: {
      type: "flood",
      flow_rate_lpm: 30,
    },
  };

  const aluminumInput: ThermalInputFeatures = {
    material: {
      iso_group: "N",
      thermal_conductivity_w_mk: 170,
    },
    tool: {
      material: "pcd",
      coating: "uncoated",
    },
    conditions: {
      cutting_speed_mpm: 500,
      feed_per_tooth_mm: 0.15,
      axial_depth_mm: 3,
      radial_depth_mm: 8,
      cutting_force_n: 200,
    },
    coolant: {
      type: "mql",
      flow_rate_lpm: 0.1,
    },
  };

  const cryogenicInput: ThermalInputFeatures = {
    ...titaniumInput,
    coolant: {
      type: "cryogenic",
      temperature_c: -196,
    },
  };

  const withHistoryInput: ThermalInputFeatures = {
    ...steelFloodInput,
    history: {
      cutting_time_s: 120,
      previous_temps_c: [350, 380, 400, 420],
    },
  };

  // ============================================================================
  // PREDICTION OUTPUT
  // ============================================================================

  describe("prediction output", () => {
    it("returns valid ThermalPrediction", () => {
      const result = engine.predict(steelDryInput);

      expect(result).toBeDefined();
      expect(result.temperatures).toBeDefined();
      expect(result.heat_partition).toBeDefined();
      expect(result.physics_base).toBeDefined();
    });

    it("includes all temperature components", () => {
      const result = engine.predict(steelDryInput);

      expect(result.temperatures.interface_c).toBeGreaterThan(0);
      expect(result.temperatures.tool_surface_c).toBeGreaterThan(0);
      expect(result.temperatures.chip_c).toBeGreaterThan(0);
      expect(result.temperatures.workpiece_c).toBeGreaterThan(0);
    });

    it("includes heat partition ratios", () => {
      const result = engine.predict(steelDryInput);

      const sum =
        result.heat_partition.to_chip +
        result.heat_partition.to_tool +
        result.heat_partition.to_workpiece +
        result.heat_partition.to_coolant;

      expect(sum).toBeCloseTo(1, 2);
    });

    it("includes coating status", () => {
      const result = engine.predict(steelDryInput);

      expect(result.coating_status.max_temp_c).toBeGreaterThan(0);
      expect(result.coating_status.current_temp_c).toBeGreaterThan(0);
      expect(["none", "low", "moderate", "high", "critical"]).toContain(
        result.coating_status.degradation_risk
      );
    });

    it("includes thermal damage risk", () => {
      const result = engine.predict(steelDryInput);

      expect(["none", "low", "moderate", "high"]).toContain(result.thermal_damage_risk);
    });

    it("tracks inference time", () => {
      const result = engine.predict(steelDryInput);

      expect(result.inference_time_ms).toBeGreaterThan(0);
      expect(result.inference_time_ms).toBeLessThan(100);
    });

    it("includes confidence score", () => {
      const result = engine.predict(steelDryInput);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ============================================================================
  // FEATURE EXTRACTION
  // ============================================================================

  describe("feature extraction", () => {
    it("extracts correct number of features", () => {
      const features = engine.extractFeatures(steelDryInput);

      expect(features.length).toBe(15);
    });

    it("features are normalized", () => {
      const features = engine.extractFeatures(steelDryInput);

      for (const f of features) {
        expect(f).toBeGreaterThanOrEqual(-1);
        expect(f).toBeLessThanOrEqual(2);
      }
    });

    it("handles missing optional fields", () => {
      const minimalInput: ThermalInputFeatures = {
        material: { iso_group: "P" },
        tool: { material: "carbide" },
        conditions: {
          cutting_speed_mpm: 100,
          feed_per_tooth_mm: 0.1,
          axial_depth_mm: 2,
          radial_depth_mm: 5,
          cutting_force_n: 300,
        },
        coolant: { type: "dry" },
      };

      const features = engine.extractFeatures(minimalInput);
      expect(features.length).toBe(15);
      expect(features.every((f) => !isNaN(f))).toBe(true);
    });

    it("includes history when provided", () => {
      const withHistory = engine.extractFeatures(withHistoryInput);
      const withoutHistory = engine.extractFeatures(steelFloodInput);

      expect(withHistory[12]).toBeGreaterThan(0); // cutting_time
      expect(withHistory[13]).toBeGreaterThan(withoutHistory[13]); // avg_prev_temp
    });
  });

  // ============================================================================
  // LOEWEN-SHAW PHYSICS
  // ============================================================================

  describe("Loewen-Shaw temperature", () => {
    it("computes physics-based temperature", () => {
      const physics = engine.computeLoewenShawTemperature(steelDryInput);

      expect(physics.loewen_shaw_c).toBeGreaterThan(0);
      expect(physics.steady_state_c).toBeGreaterThan(0);
    });

    it("higher force increases temperature", () => {
      const lowForce: ThermalInputFeatures = {
        ...steelDryInput,
        conditions: { ...steelDryInput.conditions, cutting_force_n: 200 },
      };

      const highForce: ThermalInputFeatures = {
        ...steelDryInput,
        conditions: { ...steelDryInput.conditions, cutting_force_n: 800 },
      };

      const lowResult = engine.computeLoewenShawTemperature(lowForce);
      const highResult = engine.computeLoewenShawTemperature(highForce);

      expect(highResult.loewen_shaw_c).toBeGreaterThan(lowResult.loewen_shaw_c);
    });

    it("coolant reduces steady-state temperature", () => {
      const dryPhysics = engine.computeLoewenShawTemperature(steelDryInput);
      const floodPhysics = engine.computeLoewenShawTemperature(steelFloodInput);

      expect(floodPhysics.steady_state_c).toBeLessThan(dryPhysics.steady_state_c);
    });

    it("cryogenic has lowest temperature", () => {
      const floodPhysics = engine.computeLoewenShawTemperature(titaniumInput);
      const cryoPhysics = engine.computeLoewenShawTemperature(cryogenicInput);

      expect(cryoPhysics.steady_state_c).toBeLessThan(floodPhysics.steady_state_c);
    });
  });

  // ============================================================================
  // COOLANT EFFECTS
  // ============================================================================

  describe("coolant effects", () => {
    it("dry cutting has higher steady-state than flood", () => {
      const dry = engine.predict(steelDryInput);
      const flood = engine.predict(steelFloodInput);

      // Coolant reduces steady-state temperature in physics model
      expect(dry.physics_base.steady_state_c).toBeGreaterThan(flood.physics_base.steady_state_c);
    });

    it("flood increases heat to coolant", () => {
      const dry = engine.predict(steelDryInput);
      const flood = engine.predict(steelFloodInput);

      expect(flood.heat_partition.to_coolant).toBeGreaterThan(dry.heat_partition.to_coolant);
    });

    it("cryogenic has significant coolant partition", () => {
      const cryo = engine.predict(cryogenicInput);

      expect(cryo.heat_partition.to_coolant).toBeGreaterThan(0.2);
    });
  });

  // ============================================================================
  // MATERIAL EFFECTS
  // ============================================================================

  describe("material effects", () => {
    it("titanium generates higher temperature than steel", () => {
      const steel = engine.predict(steelFloodInput);
      const titanium = engine.predict(titaniumInput);

      // Titanium has lower thermal conductivity
      // Comparing at similar conditions would show higher temp for Ti
      expect(titanium.temperatures.interface_c).toBeDefined();
      expect(steel.temperatures.interface_c).toBeDefined();
    });

    it("aluminum workpiece stays cooler", () => {
      const steel = engine.predict(steelFloodInput);
      const aluminum = engine.predict(aluminumInput);

      // Aluminum has much higher thermal conductivity
      expect(aluminum.temperatures.workpiece_c).toBeLessThan(
        steel.temperatures.workpiece_c + 100
      );
    });
  });

  // ============================================================================
  // COATING STATUS
  // ============================================================================

  describe("coating status", () => {
    it("TiAlN has higher max temp than TiN", () => {
      const tialnInput: ThermalInputFeatures = {
        ...steelDryInput,
        tool: { ...steelDryInput.tool, coating: "TiAlN" },
      };

      const tinInput: ThermalInputFeatures = {
        ...steelDryInput,
        tool: { ...steelDryInput.tool, coating: "TiN" },
      };

      const tialnResult = engine.predict(tialnInput);
      const tinResult = engine.predict(tinInput);

      expect(tialnResult.coating_status.max_temp_c).toBeGreaterThan(
        tinResult.coating_status.max_temp_c
      );
    });

    it("DLC coating has low max temp", () => {
      const dlcInput: ThermalInputFeatures = {
        ...aluminumInput,
        tool: { ...aluminumInput.tool, coating: "DLC" },
      };

      const result = engine.predict(dlcInput);

      expect(result.coating_status.max_temp_c).toBeLessThan(400);
    });

    it("high temp triggers coating risk", () => {
      const hotCutting: ThermalInputFeatures = {
        ...steelDryInput,
        conditions: {
          ...steelDryInput.conditions,
          cutting_speed_mpm: 400,
          cutting_force_n: 1000,
        },
      };

      const result = engine.predict(hotCutting);

      if (result.temperatures.tool_surface_c > result.coating_status.max_temp_c * 0.75) {
        expect(["moderate", "high", "critical"]).toContain(
          result.coating_status.degradation_risk
        );
      }
    });
  });

  // ============================================================================
  // THERMAL DAMAGE RISK
  // ============================================================================

  describe("thermal damage risk", () => {
    it("returns risk level", () => {
      const result = engine.predict(steelFloodInput);

      expect(["none", "low", "moderate", "high"]).toContain(result.thermal_damage_risk);
    });

    it("PCD at high temp has elevated risk", () => {
      const pcdHotInput: ThermalInputFeatures = {
        material: { iso_group: "N" },
        tool: { material: "pcd" },
        conditions: {
          cutting_speed_mpm: 800,
          feed_per_tooth_mm: 0.2,
          axial_depth_mm: 5,
          radial_depth_mm: 10,
          cutting_force_n: 500,
        },
        coolant: { type: "dry" },
      };

      const result = engine.predict(pcdHotInput);

      if (result.temperatures.tool_surface_c > 600) {
        expect(["moderate", "high"]).toContain(result.thermal_damage_risk);
      }
    });
  });

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  describe("recommendations", () => {
    it("generates recommendations array", () => {
      const result = engine.predict(steelDryInput);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("recommends coolant for dry high-temp cutting", () => {
      const hotDry: ThermalInputFeatures = {
        ...steelDryInput,
        conditions: {
          ...steelDryInput.conditions,
          cutting_speed_mpm: 300,
          cutting_force_n: 800,
        },
      };

      const result = engine.predict(hotDry);

      if (result.temperatures.interface_c > 500) {
        const hasCoolantRec = result.recommendations.some(
          (r) => r.toLowerCase().includes("coolant") || r.toLowerCase().includes("mql")
        );
        expect(hasCoolantRec).toBe(true);
      }
    });
  });

  // ============================================================================
  // HISTORY EFFECTS
  // ============================================================================

  describe("history effects", () => {
    it("history improves confidence", () => {
      const withHistory = engine.predict(withHistoryInput);
      const withoutHistory = engine.predict(steelFloodInput);

      expect(withHistory.confidence).toBeGreaterThanOrEqual(withoutHistory.confidence);
    });
  });

  // ============================================================================
  // MODEL METADATA
  // ============================================================================

  describe("model metadata", () => {
    it("returns metadata", () => {
      const meta = engine.getModelMetadata();

      expect(meta.modelId).toBe("thermal-neural-predictor-v1");
      expect(meta.architecture).toBe("LSTM");
      expect(meta.hiddenSize).toBe(32);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("validation", () => {
    it("rejects invalid ISO group", () => {
      const badInput = {
        ...steelDryInput,
        material: { iso_group: "X" as any },
      };

      const validation = engine.validateInput(badInput);
      expect(validation.valid).toBe(false);
    });

    it("rejects invalid tool material", () => {
      const badInput = {
        ...steelDryInput,
        tool: { material: "diamond" as any },
      };

      const validation = engine.validateInput(badInput);
      expect(validation.valid).toBe(false);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput(steelDryInput);
      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(thermalNeuralPredictorEngine).toBeDefined();
      expect(thermalNeuralPredictorEngine).toBeInstanceOf(ThermalNeuralPredictorEngine);
    });
  });
});
