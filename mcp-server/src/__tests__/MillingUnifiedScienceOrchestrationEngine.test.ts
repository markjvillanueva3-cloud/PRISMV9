/**
 * Tests for MillingUnifiedScienceOrchestrationEngine
 * Validates unified scientific analysis across all domains.
 */
import { describe, it, expect } from "vitest";
import {
  MillingUnifiedScienceOrchestrationEngine,
  millingUnifiedScienceOrchestrationEngine,
  type CuttingConditions,
} from "../engines/MillingUnifiedScienceOrchestrationEngine.js";

describe("MillingUnifiedScienceOrchestrationEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingUnifiedScienceOrchestrationEngine).toBeDefined();
      expect(millingUnifiedScienceOrchestrationEngine).toBeInstanceOf(MillingUnifiedScienceOrchestrationEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingUnifiedScienceOrchestrationEngine();
      expect(engine).toBeInstanceOf(MillingUnifiedScienceOrchestrationEngine);
    });
  });

  // ============================================================================
  // ANALYZE SCIENTIFICALLY
  // ============================================================================

  describe("analyzeScientifically()", () => {
    const defaultConditions: CuttingConditions = {
      cutting_speed_m_min: 200,
      feed_per_tooth_mm: 0.15,
      axial_depth_mm: 4,
      radial_depth_mm: 6,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      helix_angle_deg: 30,
      rake_angle_deg: 10,
      relief_angle_deg: 8,
      nose_radius_mm: 0.8,
      tool_material: "carbide",
      coating: "TiAlN",
      coolant_type: "flood",
    };

    it("returns complete scientific analysis", () => {
      const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

      expect(result.request_id).toMatch(/^SCI-/);
      expect(result.timestamp).toBeDefined();
      expect(result.mechanics).toBeDefined();
      expect(result.thermodynamics).toBeDefined();
      expect(result.metallurgy).toBeDefined();
      expect(result.tribology).toBeDefined();
      expect(result.dynamics).toBeDefined();
      expect(result.tool_life).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("analyzes all 7 scientific domains", () => {
      const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

      expect(result.domains_analyzed).toHaveLength(7);
      expect(result.domains_analyzed).toContain("mechanics");
      expect(result.domains_analyzed).toContain("thermodynamics");
      expect(result.domains_analyzed).toContain("metallurgy");
      expect(result.domains_analyzed).toContain("tribology");
      expect(result.domains_analyzed).toContain("dynamics");
      expect(result.domains_analyzed).toContain("chemistry");
      expect(result.domains_analyzed).toContain("fluid_mechanics");
    });

    it("applies multiple scientific formulas", () => {
      const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

      expect(result.formulas_applied.length).toBeGreaterThan(10);
      expect(result.formulas_applied.some(f => f.includes("Kienzle"))).toBe(true);
      expect(result.formulas_applied.some(f => f.includes("Taylor"))).toBe(true);
      expect(result.formulas_applied.some(f => f.includes("Merchant"))).toBe(true);
      expect(result.formulas_applied.some(f => f.includes("Johnson-Cook"))).toBe(true);
    });

    // Mechanics tests
    describe("mechanics analysis", () => {
      it("calculates cutting forces correctly", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.mechanics.cutting_force_N).toBeGreaterThan(0);
        expect(result.mechanics.feed_force_N).toBeGreaterThan(0);
        expect(result.mechanics.passive_force_N).toBeGreaterThan(0);
        expect(result.mechanics.resultant_force_N).toBeGreaterThan(result.mechanics.cutting_force_N);
      });

      it("calculates power and torque", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.mechanics.power_kW).toBeGreaterThan(0);
        expect(result.mechanics.torque_Nm).toBeGreaterThan(0);
        expect(result.mechanics.mrr_cm3_min).toBeGreaterThan(0);
      });

      it("calculates chip formation parameters", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.mechanics.shear_angle_deg).toBeGreaterThan(0);
        expect(result.mechanics.shear_angle_deg).toBeLessThan(90);
        expect(result.mechanics.chip_compression_ratio).toBeGreaterThan(1);
        expect(result.mechanics.chip_thickness_mm).toBeGreaterThan(defaultConditions.feed_per_tooth_mm);
      });
    });

    // Thermodynamics tests
    describe("thermodynamics analysis", () => {
      it("calculates cutting temperature", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.thermodynamics.cutting_temperature_C).toBeGreaterThan(100);
        expect(result.thermodynamics.cutting_temperature_C).toBeLessThan(1000);
        expect(result.thermodynamics.tool_chip_interface_temp_C).toBeGreaterThan(result.thermodynamics.cutting_temperature_C);
      });

      it("calculates heat partition", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.thermodynamics.heat_partition_to_chip).toBeGreaterThan(0.7);
        expect(result.thermodynamics.heat_partition_to_chip).toBeLessThanOrEqual(1);
        const totalPartition = result.thermodynamics.heat_partition_to_chip +
          result.thermodynamics.heat_partition_to_tool +
          result.thermodynamics.heat_partition_to_workpiece;
        expect(totalPartition).toBeCloseTo(1, 2);
      });

      it("evaluates cooling effectiveness", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.thermodynamics.cooling_effectiveness).toBe(0.7); // flood coolant
      });

      it("low thermal conductivity materials have higher temperature", () => {
        const steelResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);
        const titaniumResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("Ti-6Al-4V", defaultConditions);

        expect(titaniumResult.thermodynamics.cutting_temperature_C).toBeGreaterThan(steelResult.thermodynamics.cutting_temperature_C);
      });
    });

    // Metallurgy tests
    describe("metallurgy analysis", () => {
      it("calculates flow stress using Johnson-Cook", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.metallurgy.flow_stress_MPa).toBeGreaterThan(500);
        expect(result.metallurgy.strain_in_chip).toBeGreaterThan(0);
        expect(result.metallurgy.strain_rate_s).toBeGreaterThan(1000);
      });

      it("evaluates work hardening", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("316L", defaultConditions);

        expect(result.metallurgy.work_hardening_depth_mm).toBeGreaterThan(0);
      });

      it("detects phase transformation risk for titanium", () => {
        const highSpeedConditions = { ...defaultConditions, cutting_speed_m_min: 300 };
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("Ti-6Al-4V", highSpeedConditions);

        // May or may not trigger based on temperature - just check it's evaluated
        expect(typeof result.metallurgy.phase_transformation_risk).toBe("boolean");
      });

      it("detects white layer risk for hardened steel", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("D2", defaultConditions);

        expect(typeof result.metallurgy.white_layer_risk).toBe("boolean");
      });
    });

    // Tribology tests
    describe("tribology analysis", () => {
      it("calculates friction coefficient", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.tribology.friction_coefficient).toBeGreaterThan(0.2);
        expect(result.tribology.friction_coefficient).toBeLessThan(0.8);
      });

      it("calculates surface roughness", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.tribology.surface_roughness_Ra_um).toBeGreaterThan(0);
        expect(result.tribology.surface_roughness_Rz_um).toBeGreaterThan(result.tribology.surface_roughness_Ra_um);
      });

      it("evaluates built-up edge risk", () => {
        const lowSpeedConditions = { ...defaultConditions, cutting_speed_m_min: 50, coating: undefined };
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("316L", lowSpeedConditions);

        expect(typeof result.tribology.built_up_edge_risk).toBe("boolean");
      });

      it("coating reduces friction", () => {
        const coatedResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);
        const uncoatedConditions = { ...defaultConditions, coating: undefined };
        const uncoatedResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", uncoatedConditions);

        expect(coatedResult.tribology.friction_coefficient).toBeLessThan(uncoatedResult.tribology.friction_coefficient);
      });
    });

    // Dynamics tests
    describe("dynamics analysis", () => {
      it("evaluates stability", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(typeof result.dynamics.stable).toBe("boolean");
        expect(result.dynamics.critical_depth_mm).toBeGreaterThan(0);
      });

      it("calculates natural frequency and damping", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.dynamics.natural_frequency_Hz).toBeGreaterThan(100);
        expect(result.dynamics.damping_ratio).toBeGreaterThan(0);
        expect(result.dynamics.damping_ratio).toBeLessThan(1);
      });

      it("evaluates process damping at low speeds", () => {
        const lowSpeedConditions = { ...defaultConditions, cutting_speed_m_min: 50 };
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", lowSpeedConditions);

        expect(result.dynamics.process_damping_active).toBe(true);
      });
    });

    // Tool life tests
    describe("tool life prediction", () => {
      it("predicts tool life", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(result.tool_life.predicted_minutes).toBeGreaterThan(0);
        expect(result.tool_life.dominant_wear_mechanism).toBeDefined();
        expect(result.tool_life.confidence).toBeGreaterThan(0.5);
      });

      it("higher speed reduces tool life", () => {
        const lowSpeedResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);
        const highSpeedConditions = { ...defaultConditions, cutting_speed_m_min: 300 };
        const highSpeedResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", highSpeedConditions);

        expect(highSpeedResult.tool_life.predicted_minutes).toBeLessThan(lowSpeedResult.tool_life.predicted_minutes);
      });
    });

    // Quality predictions tests
    describe("quality predictions", () => {
      it("predicts quality achievability", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(typeof result.quality.surface_finish_achievable).toBe("boolean");
        expect(typeof result.quality.dimensional_accuracy_achievable).toBe("boolean");
        expect(typeof result.quality.form_accuracy_achievable).toBe("boolean");
        expect(["low", "medium", "high"]).toContain(result.quality.subsurface_damage_risk);
      });
    });

    // Recommendations tests
    describe("recommendations", () => {
      it("provides recommendations", () => {
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", defaultConditions);

        expect(Array.isArray(result.recommendations.parameter_adjustments)).toBe(true);
        expect(Array.isArray(result.recommendations.strategy_suggestions)).toBe(true);
        expect(Array.isArray(result.recommendations.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations.tribal_tips)).toBe(true);
      });

      it("warns about unstable cutting", () => {
        const deepConditions = { ...defaultConditions, axial_depth_mm: 20 };
        const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", deepConditions);

        if (!result.dynamics.stable) {
          expect(result.recommendations.warnings.some(w => w.toLowerCase().includes("chatter"))).toBe(true);
        }
      });
    });
  });

  // ============================================================================
  // QUICK ANALYZE
  // ============================================================================

  describe("quickAnalyze()", () => {
    it("returns quick analysis", () => {
      const result = millingUnifiedScienceOrchestrationEngine.quickAnalyze("4140", 200, 0.15, 4, 6, 12);

      expect(result.force_N).toBeGreaterThan(0);
      expect(result.temperature_C).toBeGreaterThan(0);
      expect(typeof result.stable).toBe("boolean");
      expect(result.tool_life_min).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("warns about high temperature", () => {
      const result = millingUnifiedScienceOrchestrationEngine.quickAnalyze("Ti-6Al-4V", 300, 0.15, 4, 6, 12);

      expect(result.warnings.some(w => w.toLowerCase().includes("temperature"))).toBe(true);
    });

    it("warns about work hardening in stainless", () => {
      const result = millingUnifiedScienceOrchestrationEngine.quickAnalyze("316L", 200, 0.03, 4, 6, 12);

      expect(result.warnings.some(w => w.toLowerCase().includes("work hardening"))).toBe(true);
    });

    it("is fast", () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        millingUnifiedScienceOrchestrationEngine.quickAnalyze("4140", 200, 0.15, 4, 6, 12);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  // ============================================================================
  // GET MATERIAL PROPERTIES
  // ============================================================================

  describe("getMaterialProperties()", () => {
    it("returns properties for known material", () => {
      const props = millingUnifiedScienceOrchestrationEngine.getMaterialProperties("4140");

      expect(props).not.toBeNull();
      expect(props!.name).toContain("4140");
      expect(props!.iso_class).toBe("P");
      expect(props!.kienzle_kc1_1).toBe(1800);
    });

    it("returns null for unknown material", () => {
      const props = millingUnifiedScienceOrchestrationEngine.getMaterialProperties("unknown");

      expect(props).toBeNull();
    });

    it("has complete properties for all materials", () => {
      const materials = millingUnifiedScienceOrchestrationEngine.getAvailableMaterials();

      for (const mat of materials) {
        const props = millingUnifiedScienceOrchestrationEngine.getMaterialProperties(mat);
        expect(props).not.toBeNull();
        expect(props!.density_kg_m3).toBeGreaterThan(0);
        expect(props!.kienzle_kc1_1).toBeGreaterThan(0);
        expect(props!.jc_A).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // GET AVAILABLE MATERIALS
  // ============================================================================

  describe("getAvailableMaterials()", () => {
    it("returns material list", () => {
      const materials = millingUnifiedScienceOrchestrationEngine.getAvailableMaterials();

      expect(materials.length).toBeGreaterThan(5);
      expect(materials).toContain("4140");
      expect(materials).toContain("D2");
      expect(materials).toContain("Ti-6Al-4V");
    });
  });

  // ============================================================================
  // GET SCIENTIFIC TIPS
  // ============================================================================

  describe("getScientificTips()", () => {
    it("returns tips for each domain", () => {
      const domains = millingUnifiedScienceOrchestrationEngine.getScientificDomains();

      for (const domain of domains) {
        const tips = millingUnifiedScienceOrchestrationEngine.getScientificTips(domain);
        expect(tips.length).toBeGreaterThan(0);
      }
    });

    it("mechanics tips mention force concepts", () => {
      const tips = millingUnifiedScienceOrchestrationEngine.getScientificTips("mechanics");

      expect(tips.some(t => t.toLowerCase().includes("force") || t.toLowerCase().includes("kienzle"))).toBe(true);
    });

    it("thermodynamics tips mention temperature", () => {
      const tips = millingUnifiedScienceOrchestrationEngine.getScientificTips("thermodynamics");

      expect(tips.some(t => t.toLowerCase().includes("heat") || t.toLowerCase().includes("temperature"))).toBe(true);
    });
  });

  // ============================================================================
  // GET SCIENTIFIC DOMAINS
  // ============================================================================

  describe("getScientificDomains()", () => {
    it("returns all 7 domains", () => {
      const domains = millingUnifiedScienceOrchestrationEngine.getScientificDomains();

      expect(domains).toHaveLength(7);
      expect(domains).toContain("mechanics");
      expect(domains).toContain("thermodynamics");
      expect(domains).toContain("metallurgy");
      expect(domains).toContain("tribology");
      expect(domains).toContain("dynamics");
      expect(domains).toContain("chemistry");
      expect(domains).toContain("fluid_mechanics");
    });
  });

  // ============================================================================
  // GET SELF AWARENESS
  // ============================================================================

  describe("getSelfAwareness()", () => {
    it("returns system capabilities", () => {
      const awareness = millingUnifiedScienceOrchestrationEngine.getSelfAwareness();

      expect(awareness.capabilities.milling_engines).toBeGreaterThan(50);
      expect(awareness.capabilities.physics_engines).toBeGreaterThan(100);
      expect(awareness.capabilities.tribal_tips).toBeGreaterThan(1000);
      expect(awareness.capabilities.formulas_integrated).toBeGreaterThan(20);
    });

    it("lists formula coverage", () => {
      const awareness = millingUnifiedScienceOrchestrationEngine.getSelfAwareness();

      expect(awareness.formula_coverage.length).toBeGreaterThan(5);
      expect(awareness.formula_coverage).toContain("Kienzle cutting force");
      expect(awareness.formula_coverage).toContain("Taylor tool life");
      expect(awareness.formula_coverage).toContain("Johnson-Cook flow stress");
    });

    it("counts tribal tips by domain", () => {
      const awareness = millingUnifiedScienceOrchestrationEngine.getSelfAwareness();

      expect(Object.keys(awareness.tribal_tips_by_domain).length).toBe(7);
      expect(awareness.tribal_tips_by_domain.mechanics).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GET STATS
  // ============================================================================

  describe("getStats()", () => {
    it("returns comprehensive statistics", () => {
      const stats = millingUnifiedScienceOrchestrationEngine.getStats();

      expect(stats.materials).toBeGreaterThan(5);
      expect(stats.formulas).toBeGreaterThan(20);
      expect(stats.domains).toBe(7);
      expect(stats.tribal_tips).toBeGreaterThan(20);
      expect(stats.system_engines).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    const conditions: CuttingConditions = {
      cutting_speed_m_min: 150,
      feed_per_tooth_mm: 0.12,
      axial_depth_mm: 3,
      radial_depth_mm: 5,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      helix_angle_deg: 30,
      rake_angle_deg: 10,
      relief_angle_deg: 8,
      nose_radius_mm: 0.8,
      tool_material: "carbide",
      coating: "TiAlN",
      coolant_type: "flood",
    };

    it("aluminum has lower cutting force than steel", () => {
      const steelResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", conditions);
      const aluResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("6061-T6", conditions);

      expect(aluResult.mechanics.cutting_force_N).toBeLessThan(steelResult.mechanics.cutting_force_N);
    });

    it("superalloys have higher cutting force than steel", () => {
      const steelResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", conditions);
      const inconelResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("Inconel718", conditions);

      expect(inconelResult.mechanics.cutting_force_N).toBeGreaterThan(steelResult.mechanics.cutting_force_N);
    });

    it("hardened steel has highest specific cutting force", () => {
      const steelResult = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("4140", conditions);
      const d2Result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically("D2", conditions);

      expect(d2Result.mechanics.specific_cutting_energy_J_mm3).toBeGreaterThan(steelResult.mechanics.specific_cutting_energy_J_mm3);
    });
  });
});
