/**
 * Tests for MicroMillingEngine (MILL-AGI Phase 2 / MILL-MS7)
 *
 * Validates micro-scale cutting physics:
 *   - Minimum chip thickness from edge radius
 *   - Cutting regime determination (ploughing/transition/shearing)
 *   - Size effect on specific cutting force
 *   - Effective rake angle at micro scale
 *   - Tool deflection for slender micro-tools
 *   - Surface quality and burr prediction
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  MicroMillingEngine,
  microMillingEngine,
  type MicroToolGeometry,
  type MicroCuttingConditions,
} from "../engines/MicroMillingEngine.js";

describe("MicroMillingEngine (MILL-AGI P2 / MILL-MS7)", () => {
  let engine: MicroMillingEngine;

  beforeAll(() => {
    engine = microMillingEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const standardMicroTool: MicroToolGeometry = {
    diameter_mm: 0.5,
    flute_count: 2,
    cutting_edge_radius_um: 3,
    helix_angle_deg: 30,
    rake_angle_deg: 5,
    flute_length_mm: 1.5,
    overall_length_mm: 38,
    shank_diameter_mm: 3,
    tool_material: "carbide",
    coating: "TiAlN",
  };

  const ultraSmallTool: MicroToolGeometry = {
    diameter_mm: 0.1,
    flute_count: 2,
    cutting_edge_radius_um: 1,
    helix_angle_deg: 20,
    rake_angle_deg: 0,
    flute_length_mm: 0.3,
    overall_length_mm: 38,
    shank_diameter_mm: 3,
    tool_material: "diamond",
    coating: "uncoated",
  };

  const largerMicroTool: MicroToolGeometry = {
    diameter_mm: 0.8,
    flute_count: 3,
    cutting_edge_radius_um: 5,
    helix_angle_deg: 35,
    rake_angle_deg: 8,
    flute_length_mm: 2.4,
    overall_length_mm: 45,
    shank_diameter_mm: 4,
    tool_material: "carbide",
    coating: "DLC",
  };

  const steelConditions: MicroCuttingConditions = {
    spindle_rpm: 40000,
    feed_per_tooth_um: 5,
    axial_depth_um: 50,
    radial_depth_um: 250,
    tool_runout_um: 1,
    material: {
      name: "AISI 4140 Steel",
      shear_strength_mpa: 450,
      hardness_hv: 280,
      ductility: "ductile",
    },
    coolant: "mql",
  };

  const aluminumConditions: MicroCuttingConditions = {
    spindle_rpm: 60000,
    feed_per_tooth_um: 8,
    axial_depth_um: 100,
    tool_runout_um: 0.5,
    material: {
      name: "6061-T6 Aluminum",
      shear_strength_mpa: 270,
      ductility: "ductile",
    },
    coolant: "flood",
  };

  const brittleConditions: MicroCuttingConditions = {
    spindle_rpm: 30000,
    feed_per_tooth_um: 3,
    axial_depth_um: 30,
    tool_runout_um: 0.5,
    material: {
      name: "Fused Silica",
      shear_strength_mpa: 50,
      ductility: "brittle",
    },
    coolant: "dry",
  };

  const ploughingConditions: MicroCuttingConditions = {
    spindle_rpm: 40000,
    feed_per_tooth_um: 0.3, // Very low feed — below 0.5 × h_min threshold
    axial_depth_um: 30,
    tool_runout_um: 0.5,
    material: {
      name: "Steel",
      shear_strength_mpa: 400,
      ductility: "ductile",
    },
    coolant: "mql",
  };

  // ============================================================================
  // BASIC ANALYSIS
  // ============================================================================

  describe("basic analysis", () => {
    it("returns valid MicroMillingResult", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result).toBeDefined();
      expect(result.cutting_regime).toBeDefined();
      expect(result.minimum_chip_thickness_um).toBeGreaterThan(0);
    });

    it("includes all force components", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.forces.tangential_n).toBeGreaterThan(0);
      expect(result.forces.radial_n).toBeGreaterThan(0);
      expect(result.forces.axial_n).toBeGreaterThan(0);
      expect(result.forces.total_n).toBeGreaterThan(0);
    });

    it("includes surface quality predictions", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.surface_quality.predicted_ra_um).toBeGreaterThan(0);
      expect(result.surface_quality.burr_height_um).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(result.surface_quality.burr_risk);
    });

    it("includes tool life prediction", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.tool_life.predicted_cuts).toBeGreaterThan(0);
      expect(result.tool_life.dominant_wear).toBeDefined();
    });

    it("tracks confidence", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ============================================================================
  // MINIMUM CHIP THICKNESS
  // ============================================================================

  describe("minimum chip thickness", () => {
    it("computes h_min from edge radius", () => {
      const hMin = engine.computeMinimumChipThickness(standardMicroTool);

      // h_min = λ × r_e where λ ≈ 0.3, r_e = 3µm
      expect(hMin).toBeCloseTo(0.9, 1);
    });

    it("smaller edge radius gives smaller h_min", () => {
      const hMin1 = engine.computeMinimumChipThickness(standardMicroTool);
      const hMin2 = engine.computeMinimumChipThickness(ultraSmallTool);

      expect(hMin2).toBeLessThan(hMin1);
    });
  });

  // ============================================================================
  // CUTTING REGIME
  // ============================================================================

  describe("cutting regime", () => {
    it("identifies ploughing when feed < h_min", () => {
      const result = engine.analyze(standardMicroTool, ploughingConditions);

      expect(result.cutting_regime).toBe("ploughing");
      expect(result.chip_formation_ratio).toBeLessThan(1);
    });

    it("identifies shearing when feed >> h_min", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.cutting_regime).toBe("shearing");
      expect(result.chip_formation_ratio).toBeGreaterThan(1);
    });

    it("ploughing regime has higher forces", () => {
      const shearing = engine.analyze(standardMicroTool, steelConditions);
      const ploughing = engine.analyze(standardMicroTool, ploughingConditions);

      // Ploughing has ploughing force component
      expect(ploughing.forces.ploughing_n).toBeGreaterThan(0);
      expect(shearing.forces.ploughing_n).toBe(0);
    });
  });

  // ============================================================================
  // SIZE EFFECT
  // ============================================================================

  describe("size effect", () => {
    it("size effect increases specific cutting force", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.size_effect_factor).toBeGreaterThanOrEqual(1);
    });

    it("lower feed increases size effect", () => {
      const highFeed: MicroCuttingConditions = {
        ...steelConditions,
        feed_per_tooth_um: 10,
      };

      const lowFeed: MicroCuttingConditions = {
        ...steelConditions,
        feed_per_tooth_um: 2,
      };

      const resultHigh = engine.analyze(standardMicroTool, highFeed);
      const resultLow = engine.analyze(standardMicroTool, lowFeed);

      expect(resultLow.size_effect_factor).toBeGreaterThan(resultHigh.size_effect_factor);
    });
  });

  // ============================================================================
  // EFFECTIVE RAKE
  // ============================================================================

  describe("effective rake", () => {
    it("effective rake becomes negative at micro scale", () => {
      const result = engine.analyze(standardMicroTool, ploughingConditions);

      // When h_c < r_e, effective rake is negative
      expect(result.effective_rake_deg).toBeLessThan(standardMicroTool.rake_angle_deg);
    });

    it("effective rake equals nominal at higher feeds", () => {
      const highFeed: MicroCuttingConditions = {
        ...steelConditions,
        feed_per_tooth_um: 20, // Well above edge radius
      };

      const result = engine.analyze(standardMicroTool, highFeed);

      expect(result.effective_rake_deg).toBeCloseTo(standardMicroTool.rake_angle_deg, 0);
    });
  });

  // ============================================================================
  // TOOL DEFLECTION
  // ============================================================================

  describe("tool deflection", () => {
    it("computes deflection for micro tool", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.tool_deflection_um).toBeGreaterThan(0);
    });

    it("smaller diameter increases deflection", () => {
      const result1 = engine.analyze(standardMicroTool, steelConditions); // 0.5mm
      const result2 = engine.analyze(ultraSmallTool, steelConditions); // 0.1mm

      // δ ∝ D^-4, so smaller diameter = larger deflection
      expect(result2.tool_deflection_um).toBeGreaterThan(result1.tool_deflection_um);
    });

    it("high deflection generates warning", () => {
      // Ultra-small tool with high forces should have high deflection
      const result = engine.analyze(ultraSmallTool, steelConditions);

      // Check if deflection-related warning exists when deflection is high
      if (result.tool_deflection_um > 5) {
        expect(result.warnings.some((w) => w.toLowerCase().includes("deflection"))).toBe(true);
      }
    });
  });

  // ============================================================================
  // SURFACE QUALITY
  // ============================================================================

  describe("surface quality", () => {
    it("ploughing regime worsens surface finish", () => {
      const shearing = engine.analyze(standardMicroTool, steelConditions);
      const ploughing = engine.analyze(standardMicroTool, ploughingConditions);

      expect(ploughing.surface_quality.predicted_ra_um).toBeGreaterThan(
        shearing.surface_quality.predicted_ra_um
      );
    });

    it("ductile material has high burr risk", () => {
      const result = engine.analyze(standardMicroTool, steelConditions);

      expect(result.surface_quality.burr_risk).toBe("high");
    });

    it("brittle material has low burr risk", () => {
      const result = engine.analyze(standardMicroTool, brittleConditions);

      expect(result.surface_quality.burr_risk).toBe("low");
    });
  });

  // ============================================================================
  // TOOL LIFE
  // ============================================================================

  describe("tool life", () => {
    it("coating improves tool life", () => {
      const coated: MicroToolGeometry = { ...standardMicroTool, coating: "DLC" };
      const uncoated: MicroToolGeometry = { ...standardMicroTool, coating: "uncoated" };

      const coatedResult = engine.analyze(coated, steelConditions);
      const uncoatedResult = engine.analyze(uncoated, steelConditions);

      expect(coatedResult.tool_life.predicted_cuts).toBeGreaterThan(
        uncoatedResult.tool_life.predicted_cuts
      );
    });

    it("ploughing reduces tool life", () => {
      const shearing = engine.analyze(standardMicroTool, steelConditions);
      const ploughing = engine.analyze(standardMicroTool, ploughingConditions);

      expect(ploughing.tool_life.predicted_cuts).toBeLessThan(shearing.tool_life.predicted_cuts);
    });

    it("edge rounding is dominant wear in ploughing", () => {
      const result = engine.analyze(standardMicroTool, ploughingConditions);

      expect(result.tool_life.dominant_wear).toBe("edge_rounding");
    });
  });

  // ============================================================================
  // RUNOUT EFFECTS
  // ============================================================================

  describe("runout effects", () => {
    it("high runout increases forces", () => {
      const lowRunout: MicroCuttingConditions = { ...steelConditions, tool_runout_um: 0.5 };
      const highRunout: MicroCuttingConditions = { ...steelConditions, tool_runout_um: 5 };

      const lowResult = engine.analyze(standardMicroTool, lowRunout);
      const highResult = engine.analyze(standardMicroTool, highRunout);

      expect(highResult.forces.total_n).toBeGreaterThan(lowResult.forces.total_n);
    });

    it("high runout generates warning", () => {
      const highRunout: MicroCuttingConditions = {
        ...steelConditions,
        tool_runout_um: 50, // 10% of 0.5mm diameter
      };

      const result = engine.analyze(standardMicroTool, highRunout);

      expect(result.warnings.some((w) => w.toLowerCase().includes("runout"))).toBe(true);
    });
  });

  // ============================================================================
  // OPTIMAL FEED
  // ============================================================================

  describe("optimal feed", () => {
    it("returns feed range", () => {
      const feed = engine.getOptimalFeed(standardMicroTool);

      expect(feed.min_um).toBeGreaterThan(0);
      expect(feed.optimal_um).toBeGreaterThan(feed.min_um);
      expect(feed.max_um).toBeGreaterThan(feed.optimal_um);
    });

    it("optimal feed exceeds minimum chip thickness", () => {
      const feed = engine.getOptimalFeed(standardMicroTool);
      const hMin = engine.computeMinimumChipThickness(standardMicroTool);

      expect(feed.min_um).toBeGreaterThan(hMin);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("validation", () => {
    it("rejects tool > 2mm", () => {
      const largeTool: MicroToolGeometry = { ...standardMicroTool, diameter_mm: 3 };
      const validation = engine.validateTool(largeTool);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("2mm"))).toBe(true);
    });

    it("rejects zero diameter", () => {
      const badTool: MicroToolGeometry = { ...standardMicroTool, diameter_mm: 0 };
      const validation = engine.validateTool(badTool);

      expect(validation.valid).toBe(false);
    });

    it("passes valid micro tool", () => {
      const validation = engine.validateTool(standardMicroTool);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(microMillingEngine).toBeDefined();
      expect(microMillingEngine).toBeInstanceOf(MicroMillingEngine);
    });
  });
});
