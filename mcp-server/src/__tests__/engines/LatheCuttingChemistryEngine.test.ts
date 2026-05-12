/**
 * LatheCuttingChemistryEngine Tests
 *
 * Tests for chemical phenomena in lathe cutting:
 * - Coolant chemistry analysis
 * - Oxidation kinetics
 * - Diffusion wear prediction
 * - Material-coolant compatibility
 * - Chemical wear assessment
 * - Coolant selection
 * - Concentration optimization
 * - Environmental safety
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  latheCuttingChemistryEngine,
  LatheCuttingChemistryEngine,
  type CoolantChemistryInput,
  type OxidationInput,
  type DiffusionWearInput,
  type CompatibilityInput,
  type ChemicalWearInput,
  type CoolantSelectionInput,
  type ConcentrationOptInput,
  type EnvironmentalInput,
} from "../../engines/LatheCuttingChemistryEngine.js";

describe("LatheCuttingChemistryEngine", () => {
  let engine: LatheCuttingChemistryEngine;

  beforeAll(() => {
    engine = latheCuttingChemistryEngine;
  });

  // =========================================================================
  // COOLANT CHEMISTRY ANALYSIS
  // =========================================================================

  describe("analyzeCoolantChemistry", () => {
    it("should analyze fresh coolant chemistry correctly", () => {
      const input: CoolantChemistryInput = {
        coolant_type: "semi_synthetic",
        concentration_pct: 6,
        water_hardness_ppm: 150,
        temperature_C: 25,
        age_weeks: 0,
        tramp_oil_pct: 0,
      };

      const result = engine.analyzeCoolantChemistry(input);

      expect(result.effective_ph.value).toBeGreaterThan(8.5);
      expect(result.effective_ph.value).toBeLessThan(10.0);
      expect(result.emulsion_stability.value).toBeGreaterThan(0.8);
      expect(result.biocide_effectiveness.value).toBeGreaterThan(0.8);
      expect(result.corrosion_risk.value).toBeLessThan(0.3);
    });

    it("should detect pH drop in aged coolant", () => {
      const input: CoolantChemistryInput = {
        coolant_type: "water_soluble_oil",
        concentration_pct: 5,
        age_weeks: 12,
        tramp_oil_pct: 2,
      };

      const result = engine.analyzeCoolantChemistry(input);

      // pH should drop with age
      expect(result.effective_ph.value).toBeLessThan(9.0);
      expect(result.emulsion_stability.value).toBeLessThan(0.8);
      expect(result.biocide_effectiveness.value).toBeLessThan(0.7);
    });

    it("should warn about hard water effects", () => {
      const input: CoolantChemistryInput = {
        coolant_type: "water_soluble_oil",
        concentration_pct: 5,
        water_hardness_ppm: 450,
      };

      const result = engine.analyzeCoolantChemistry(input);

      expect(result.emulsion_stability.value).toBeLessThan(0.8);
      expect(result.recommended_adjustments.some(r => r.includes("Hard water"))).toBe(true);
    });

    it("should flag critical low pH", () => {
      const input: CoolantChemistryInput = {
        coolant_type: "water_soluble_oil",
        ph_measured: 7.5,
      };

      const result = engine.analyzeCoolantChemistry(input);

      expect(result.effective_ph.value).toBe(7.5);
      expect(result.safety_warnings.some(w => w.includes("CRITICAL"))).toBe(true);
      expect(result.corrosion_risk.value).toBeGreaterThanOrEqual(0.4);
    });

    it("should handle high tramp oil contamination", () => {
      const input: CoolantChemistryInput = {
        coolant_type: "semi_synthetic",
        concentration_pct: 6,
        tramp_oil_pct: 5,
      };

      const result = engine.analyzeCoolantChemistry(input);

      expect(result.emulsion_stability.value).toBeLessThan(0.7);
      expect(result.safety_warnings.some(w => w.includes("Tramp oil"))).toBe(true);
    });
  });

  // =========================================================================
  // OXIDATION KINETICS
  // =========================================================================

  describe("calculateOxidationRate", () => {
    it("should calculate parabolic oxidation for carbon steel", () => {
      const input: OxidationInput = {
        material: "carbon_steel",
        temperature_C: 500,
        time_minutes: 10,
      };

      const result = engine.calculateOxidationRate(input);

      expect(result.oxide_thickness_um.value).toBeGreaterThan(0);
      expect(result.oxidation_rate_um_per_min.value).toBeGreaterThan(0);
      expect(result.oxide_type).toBe("Fe2O3/Fe3O4");
      expect(result.is_protective).toBe(false);
    });

    it("should show protective oxide on stainless steel", () => {
      const input: OxidationInput = {
        material: "stainless_304",
        temperature_C: 600,
        time_minutes: 10,
      };

      const result = engine.calculateOxidationRate(input);

      expect(result.oxide_type).toBe("Cr2O3");
      expect(result.is_protective).toBe(true);
      expect(result.scale_adherence.value).toBeGreaterThan(0.7);
    });

    it("should show minimal oxidation for aluminum due to Al2O3", () => {
      const input: OxidationInput = {
        material: "aluminum_6061",
        temperature_C: 150,
        time_minutes: 10,
      };

      const result = engine.calculateOxidationRate(input);

      expect(result.oxide_type).toBe("Al2O3");
      expect(result.is_protective).toBe(true);
      // Aluminum oxide is very thin and protective
      expect(result.oxide_thickness_um.value).toBeLessThan(1);
    });

    it("should reduce oxidation in inert atmosphere", () => {
      const inputAir: OxidationInput = {
        material: "carbon_steel",
        temperature_C: 500,
        time_minutes: 10,
        atmosphere: "air",
      };

      const inputInert: OxidationInput = {
        material: "carbon_steel",
        temperature_C: 500,
        time_minutes: 10,
        atmosphere: "inert",
      };

      const resultAir = engine.calculateOxidationRate(inputAir);
      const resultInert = engine.calculateOxidationRate(inputInert);

      expect(resultInert.oxide_thickness_um.value).toBeLessThan(resultAir.oxide_thickness_um.value * 0.1);
    });

    it("should increase oxidation rate with temperature (Arrhenius)", () => {
      const input400: OxidationInput = {
        material: "carbon_steel",
        temperature_C: 400,
        time_minutes: 10,
      };

      const input600: OxidationInput = {
        material: "carbon_steel",
        temperature_C: 600,
        time_minutes: 10,
      };

      const result400 = engine.calculateOxidationRate(input400);
      const result600 = engine.calculateOxidationRate(input600);

      // Oxidation rate should increase significantly with temperature
      expect(result600.oxidation_rate_um_per_min.value).toBeGreaterThan(
        result400.oxidation_rate_um_per_min.value * 2
      );
    });
  });

  // =========================================================================
  // DIFFUSION WEAR PREDICTION
  // =========================================================================

  describe("predictDiffusionWear", () => {
    it("should predict diffusion wear for uncoated carbide in steel", () => {
      const input: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 700,
        contact_time_seconds: 60,
      };

      const result = engine.predictDiffusionWear(input);

      expect(result.diffusion_depth_um.value).toBeGreaterThan(0);
      expect(result.diffusion_coefficient_m2_s.value).toBeGreaterThan(0);
      expect(result.activation_energy_kJ_mol.value).toBeGreaterThan(100);
      expect(result.primary_diffusing_species).toContain("C");
    });

    it("should show higher diffusion for titanium machining", () => {
      const inputSteel: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 700,
        contact_time_seconds: 60,
      };

      const inputTi: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "titanium_6al4v",
        interface_temperature_C: 700,
        contact_time_seconds: 60,
      };

      const resultSteel = engine.predictDiffusionWear(inputSteel);
      const resultTi = engine.predictDiffusionWear(inputTi);

      // Titanium should show higher diffusion wear
      expect(resultTi.wear_rate_um_per_hour.value).toBeGreaterThan(
        resultSteel.wear_rate_um_per_hour.value
      );
    });

    it("should show coating benefit (reduced diffusion)", () => {
      const inputUncoated: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 700,
        contact_time_seconds: 60,
      };

      const inputCoated: DiffusionWearInput = {
        tool_material: "carbide_pvd",
        tool_coating: "TiAlN",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 700,
        contact_time_seconds: 60,
      };

      const resultUncoated = engine.predictDiffusionWear(inputUncoated);
      const resultCoated = engine.predictDiffusionWear(inputCoated);

      // Coated should have lower diffusion rate
      expect(resultCoated.diffusion_depth_um.value).toBeLessThan(
        resultUncoated.diffusion_depth_um.value
      );
    });

    it("should estimate coating breakdown time", () => {
      const input: DiffusionWearInput = {
        tool_material: "carbide_pvd",
        tool_coating: "TiAlN",
        workpiece_material: "titanium_6al4v",
        interface_temperature_C: 800,
        contact_time_seconds: 60,
      };

      const result = engine.predictDiffusionWear(input);

      expect(result.coating_breakdown_time_min).toBeDefined();
      expect(result.coating_breakdown_time_min!.value).toBeGreaterThan(0);
    });

    it("should follow Arrhenius temperature dependence", () => {
      const input600: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 600,
        contact_time_seconds: 60,
      };

      const input800: DiffusionWearInput = {
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 800,
        contact_time_seconds: 60,
      };

      const result600 = engine.predictDiffusionWear(input600);
      const result800 = engine.predictDiffusionWear(input800);

      // Higher temperature should significantly increase diffusion
      expect(result800.diffusion_coefficient_m2_s.value).toBeGreaterThan(
        result600.diffusion_coefficient_m2_s.value * 5
      );
    });
  });

  // =========================================================================
  // MATERIAL-COOLANT COMPATIBILITY
  // =========================================================================

  describe("assessCompatibility", () => {
    it("should rate aluminum + semi-synthetic as excellent", () => {
      const input: CompatibilityInput = {
        coolant_type: "semi_synthetic",
        additives: [],
        workpiece_material: "aluminum_6061",
      };

      const result = engine.assessCompatibility(input);

      expect(result.overall_rating).toBe("excellent");
      expect(result.staining_risk.value).toBeLessThan(0.3);
    });

    it("should prohibit water-based coolants for magnesium", () => {
      const input: CompatibilityInput = {
        coolant_type: "water_soluble_oil",
        additives: [],
        workpiece_material: "magnesium_az31",
      };

      const result = engine.assessCompatibility(input);

      expect(result.overall_rating).toBe("prohibited");
      expect(result.fire_risk.value).toBeGreaterThan(0.7);
      expect(result.specific_reactions.some(r => r.includes("HYDROGEN"))).toBe(true);
    });

    it("should warn about sulfur + copper reaction", () => {
      const input: CompatibilityInput = {
        coolant_type: "straight_oil",
        additives: ["ep_sulfur"],
        workpiece_material: "copper_c110",
      };

      const result = engine.assessCompatibility(input);

      expect(result.staining_risk.value).toBeGreaterThan(0.6);
      expect(result.specific_reactions.some(r => r.includes("discoloration") || r.includes("staining"))).toBe(true);
    });

    it("should warn about chlorine + titanium SCC risk", () => {
      const input: CompatibilityInput = {
        coolant_type: "water_soluble_oil",
        additives: ["ep_chlorine"],
        workpiece_material: "titanium_6al4v",
      };

      const result = engine.assessCompatibility(input);

      expect(result.stress_corrosion_risk.value).toBeGreaterThan(0.5);
      expect(result.specific_reactions.some(r => r.includes("stress corrosion") || r.includes("CRITICAL"))).toBe(true);
    });

    it("should handle brass + amine (ammonia) reaction", () => {
      const input: CompatibilityInput = {
        coolant_type: "semi_synthetic",
        additives: ["amine"],
        workpiece_material: "brass_c360",
      };

      const result = engine.assessCompatibility(input);

      // Brass has inherent SCC risk, amine increases it via ammonia breakdown
      expect(result.stress_corrosion_risk.value).toBeGreaterThanOrEqual(0.2);
      // Check for ammonia reaction warning
      expect(result.specific_reactions.some(r =>
        r.toLowerCase().includes("ammonia") ||
        r.toLowerCase().includes("amine") ||
        r.toLowerCase().includes("stress corrosion")
      )).toBe(true);
    });
  });

  // =========================================================================
  // CHEMICAL WEAR ASSESSMENT
  // =========================================================================

  describe("assessChemicalWear", () => {
    it("should identify dissolution as dominant for titanium + uncoated carbide", () => {
      const input: ChemicalWearInput = {
        workpiece_material: "titanium_6al4v",
        tool_material: "carbide_uncoated",
        cutting_speed_m_min: 60,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        operation: "od_roughing",
      };

      const result = engine.assessChemicalWear(input);

      expect(result.dominant_mechanism).toBe("dissolution");
      expect(result.mechanism_contributions.dissolution.value).toBeGreaterThan(0.5);
    });

    it("should identify attrition for cast iron machining", () => {
      const input: ChemicalWearInput = {
        workpiece_material: "cast_iron_gray",
        tool_material: "carbide_cvd",
        cutting_speed_m_min: 150,
        feed_mm_rev: 0.3,
        depth_of_cut_mm: 3,
        operation: "od_roughing",
      };

      const result = engine.assessChemicalWear(input);

      expect(result.mechanism_contributions.attrition.value).toBeGreaterThan(0.3);
      expect(result.reaction_products.some(r => r.includes("Graphite"))).toBe(true);
    });

    it("should estimate interface temperature", () => {
      const input: ChemicalWearInput = {
        workpiece_material: "inconel_718",
        tool_material: "ceramic_sialon",
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 1,
        operation: "od_finishing",
      };

      const result = engine.assessChemicalWear(input);

      // Interface temperature should be significantly above ambient
      expect(result.interface_temperature_C.value).toBeGreaterThan(100);
      expect(result.interface_temperature_C.value).toBeLessThan(1200);
    });

    it("should provide mitigation strategies", () => {
      const input: ChemicalWearInput = {
        workpiece_material: "titanium_6al4v",
        tool_material: "carbide_uncoated",
        cutting_speed_m_min: 80,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
        operation: "od_roughing",
      };

      const result = engine.assessChemicalWear(input);

      expect(result.mitigation_strategies.length).toBeGreaterThan(0);
      expect(result.mitigation_strategies.some(m => m.includes("coating") || m.includes("AlTiN"))).toBe(true);
    });
  });

  // =========================================================================
  // COOLANT SELECTION
  // =========================================================================

  describe("selectCoolant", () => {
    it("should select appropriate coolant for aluminum finishing", () => {
      const input: CoolantSelectionInput = {
        workpiece_material: "aluminum_6061",
        operation: "od_finishing",
        cutting_speed_m_min: 300,
        tool_material: "carbide_pvd",
        surface_finish_required_Ra_um: 1.6,
      };

      const result = engine.selectCoolant(input);

      expect(["semi_synthetic", "full_synthetic"]).toContain(result.recommended_coolant);
      expect(result.suitability_score.value).toBeGreaterThan(0.7);
      expect(result.chemistry_notes.some(n => n.includes("Aluminum") || n.includes("pH"))).toBe(true);
    });

    it("should recommend MQL or dry for cast iron", () => {
      const input: CoolantSelectionInput = {
        workpiece_material: "cast_iron_gray",
        operation: "od_roughing",
        cutting_speed_m_min: 120,
        tool_material: "carbide_cvd",
      };

      const result = engine.selectCoolant(input);

      expect(["mql_oil", "straight_oil"]).toContain(result.recommended_coolant);
    });

    it("should require high lubricity for threading", () => {
      const input: CoolantSelectionInput = {
        workpiece_material: "alloy_steel",
        operation: "threading_external",
        cutting_speed_m_min: 80,
        tool_material: "carbide_pvd",
      };

      const result = engine.selectCoolant(input);

      expect(result.recommended_additives).toContain("fatty_acid");
      expect(result.concentration_pct.value).toBeGreaterThan(8);
    });

    it("should consider environmental priority", () => {
      const input: CoolantSelectionInput = {
        workpiece_material: "carbon_steel",
        operation: "od_roughing",
        cutting_speed_m_min: 150,
        tool_material: "carbide_cvd",
        environmental_priority: true,
      };

      const result = engine.selectCoolant(input);

      expect(["vegetable_ester", "mql_oil", "full_synthetic"]).toContain(result.recommended_coolant);
      expect(result.chemistry_notes.some(n => n.includes("Environmental") || n.includes("Bio"))).toBe(true);
    });

    it("should provide alternatives", () => {
      const input: CoolantSelectionInput = {
        workpiece_material: "stainless_304",
        operation: "od_roughing",
        cutting_speed_m_min: 100,
        tool_material: "carbide_pvd",
      };

      const result = engine.selectCoolant(input);

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0].score).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // CONCENTRATION OPTIMIZATION
  // =========================================================================

  describe("optimizeCoolantConcentration", () => {
    it("should optimize concentration for roughing", () => {
      const input: ConcentrationOptInput = {
        coolant_type: "semi_synthetic",
        operation: "od_roughing",
        workpiece_material: "carbon_steel",
        cutting_speed_m_min: 150,
      };

      const result = engine.optimizeCoolantConcentration(input);

      expect(result.optimal_concentration_pct.value).toBeGreaterThan(5);
      expect(result.optimal_concentration_pct.value).toBeLessThan(12);
      expect(result.cooling_capacity.value).toBeGreaterThan(0.7);
    });

    it("should recommend higher concentration for threading", () => {
      const inputRough: ConcentrationOptInput = {
        coolant_type: "semi_synthetic",
        operation: "od_roughing",
        workpiece_material: "alloy_steel",
        cutting_speed_m_min: 100,
      };

      const inputThread: ConcentrationOptInput = {
        coolant_type: "semi_synthetic",
        operation: "threading_external",
        workpiece_material: "alloy_steel",
        cutting_speed_m_min: 60,
      };

      const resultRough = engine.optimizeCoolantConcentration(inputRough);
      const resultThread = engine.optimizeCoolantConcentration(inputThread);

      // Threading requires higher concentration for lubricity
      expect(resultThread.optimal_concentration_pct.value).toBeGreaterThan(
        resultRough.optimal_concentration_pct.value
      );
      // Lubricity index should be at least equal for threading
      expect(resultThread.lubricity_index.value).toBeGreaterThanOrEqual(
        resultRough.lubricity_index.value
      );
    });

    it("should estimate cost per liter", () => {
      const input: ConcentrationOptInput = {
        coolant_type: "full_synthetic",
        operation: "od_finishing",
        workpiece_material: "stainless_304",
        cutting_speed_m_min: 120,
      };

      const result = engine.optimizeCoolantConcentration(input);

      expect(result.cost_per_liter.value).toBeGreaterThan(0);
      expect(result.cost_per_liter.unit).toBe("$/L");
    });

    it("should recommend adjustment from current concentration", () => {
      const input: ConcentrationOptInput = {
        coolant_type: "water_soluble_oil",
        operation: "od_roughing",
        workpiece_material: "carbon_steel",
        cutting_speed_m_min: 150,
        current_concentration_pct: 3,  // Too low
      };

      const result = engine.optimizeCoolantConcentration(input);

      expect(result.optimal_concentration_pct.value).toBeGreaterThan(3);
      expect(result.recommendations.some(r => r.includes("Increase"))).toBe(true);
      expect(result.projected_tool_life_improvement_pct.value).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // ENVIRONMENTAL SAFETY
  // =========================================================================

  describe("assessEnvironmentalSafety", () => {
    it("should assess mist generation", () => {
      const input: EnvironmentalInput = {
        coolant_type: "water_soluble_oil",
        additives: [],
        sump_volume_liters: 200,
        spindle_rpm: 3000,
        enclosure_type: "partial",
      };

      const result = engine.assessEnvironmentalSafety(input);

      expect(result.mist_generation_mg_m3.value).toBeGreaterThan(0);
      expect(result.required_ppe.length).toBeGreaterThan(0);
    });

    it("should flag NIOSH REL exceedance", () => {
      const input: EnvironmentalInput = {
        coolant_type: "straight_oil",
        additives: [],
        sump_volume_liters: 100,
        spindle_rpm: 6000,
        enclosure_type: "open",
        air_flow_m3_min: 5,
      };

      const result = engine.assessEnvironmentalSafety(input);

      // Open enclosure + high RPM + straight oil = high mist
      expect(result.niosh_rel_exceeded).toBe(true);
      expect(result.required_ppe.some(p => p.includes("Respiratory"))).toBe(true);
    });

    it("should assess fire risk for straight oil", () => {
      const input: EnvironmentalInput = {
        coolant_type: "straight_oil",
        additives: [],
        sump_volume_liters: 150,
        spindle_rpm: 5000,
      };

      const result = engine.assessEnvironmentalSafety(input);

      expect(["moderate", "high"]).toContain(result.fire_risk_level);
      expect(result.flash_point_C.value).toBeLessThan(200);
    });

    it("should assess dermatitis risk with sensitizing additives", () => {
      const inputBase: EnvironmentalInput = {
        coolant_type: "water_soluble_oil",
        additives: [],
        sump_volume_liters: 200,
      };

      const inputSens: EnvironmentalInput = {
        coolant_type: "water_soluble_oil",
        additives: ["biocide_formaldehyde", "amine"],
        sump_volume_liters: 200,
      };

      const resultBase = engine.assessEnvironmentalSafety(inputBase);
      const resultSens = engine.assessEnvironmentalSafety(inputSens);

      expect(resultSens.dermatitis_risk.value).toBeGreaterThan(resultBase.dermatitis_risk.value);
    });

    it("should recommend appropriate PPE", () => {
      const input: EnvironmentalInput = {
        coolant_type: "semi_synthetic",
        additives: ["biocide_isothiazolinone"],
        sump_volume_liters: 200,
        spindle_rpm: 2000,
        enclosure_type: "full",
      };

      const result = engine.assessEnvironmentalSafety(input);

      expect(result.required_ppe).toContain("Safety glasses");
      expect(result.disposal_classification).toBeTruthy();
    });

    it("should reduce mist with full enclosure", () => {
      const inputOpen: EnvironmentalInput = {
        coolant_type: "water_soluble_oil",
        additives: [],
        sump_volume_liters: 200,
        spindle_rpm: 3000,
        enclosure_type: "open",
      };

      const inputFull: EnvironmentalInput = {
        coolant_type: "water_soluble_oil",
        additives: [],
        sump_volume_liters: 200,
        spindle_rpm: 3000,
        enclosure_type: "full",
      };

      const resultOpen = engine.assessEnvironmentalSafety(inputOpen);
      const resultFull = engine.assessEnvironmentalSafety(inputFull);

      expect(resultFull.mist_generation_mg_m3.value).toBeLessThan(
        resultOpen.mist_generation_mg_m3.value
      );
    });
  });

  // =========================================================================
  // COMPREHENSIVE ANALYSIS
  // =========================================================================

  describe("comprehensiveAnalysis", () => {
    it("should provide complete analysis for typical operation", () => {
      const result = engine.comprehensiveAnalysis({
        workpiece_material: "stainless_304",
        tool_material: "carbide_pvd",
        tool_coating: "TiAlN",
        operation: "od_roughing",
        cutting_speed_m_min: 120,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        coolant_type: "semi_synthetic",
        coolant_concentration_pct: 6,
      });

      expect(result.coolant_recommendation).toBeDefined();
      expect(result.chemical_wear).toBeDefined();
      expect(result.compatibility).toBeDefined();
      expect(result.concentration_optimization).toBeDefined();
      expect(result.oxidation).toBeDefined();
      expect(result.diffusion).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should identify high-risk combinations", () => {
      const result = engine.comprehensiveAnalysis({
        workpiece_material: "titanium_6al4v",
        tool_material: "carbide_uncoated",
        operation: "od_roughing",
        cutting_speed_m_min: 80,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
      });

      // Should identify dissolution as dominant mechanism
      expect(result.chemical_wear.dominant_mechanism).toBe("dissolution");
      // Should recommend coating
      expect(result.coolant_recommendation.chemistry_notes.some(n =>
        n.includes("Titanium") || n.includes("Chlorine")
      )).toBe(true);
    });

    it("should include interface temperature in summary", () => {
      const result = engine.comprehensiveAnalysis({
        workpiece_material: "alloy_steel",
        tool_material: "carbide_cvd",
        operation: "od_roughing",
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.3,
        depth_of_cut_mm: 3,
      });

      expect(result.summary.some(s => s.includes("Interface temperature"))).toBe(true);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle unknown material gracefully", () => {
      const result = engine.calculateOxidationRate({
        material: "unknown_alloy" as any,
        temperature_C: 500,
        time_minutes: 10,
      });

      expect(result.oxide_thickness_um.warning).toContain("Unknown material");
    });

    it("should handle zero time input", () => {
      const result = engine.calculateOxidationRate({
        material: "carbon_steel",
        temperature_C: 500,
        time_minutes: 0,
      });

      expect(result.oxide_thickness_um.value).toBe(0);
    });

    it("should handle extreme temperatures", () => {
      const result = engine.predictDiffusionWear({
        tool_material: "carbide_uncoated",
        workpiece_material: "carbon_steel",
        interface_temperature_C: 1200,
        contact_time_seconds: 60,
      });

      expect(result.diffusion_depth_um.value).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes("CRITICAL") || r.includes("900"))).toBe(true);
    });

    it("should handle straight oil concentration (100%)", () => {
      const result = engine.optimizeCoolantConcentration({
        coolant_type: "straight_oil",
        operation: "threading_external",
        workpiece_material: "alloy_steel",
        cutting_speed_m_min: 60,
      });

      expect(result.optimal_concentration_pct.value).toBe(100);
    });
  });

  // =========================================================================
  // SINGLETON EXPORT
  // =========================================================================

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(latheCuttingChemistryEngine).toBeDefined();
      expect(latheCuttingChemistryEngine).toBeInstanceOf(LatheCuttingChemistryEngine);
    });

    it("should have all public methods", () => {
      expect(typeof latheCuttingChemistryEngine.analyzeCoolantChemistry).toBe("function");
      expect(typeof latheCuttingChemistryEngine.calculateOxidationRate).toBe("function");
      expect(typeof latheCuttingChemistryEngine.predictDiffusionWear).toBe("function");
      expect(typeof latheCuttingChemistryEngine.assessCompatibility).toBe("function");
      expect(typeof latheCuttingChemistryEngine.assessChemicalWear).toBe("function");
      expect(typeof latheCuttingChemistryEngine.selectCoolant).toBe("function");
      expect(typeof latheCuttingChemistryEngine.optimizeCoolantConcentration).toBe("function");
      expect(typeof latheCuttingChemistryEngine.assessEnvironmentalSafety).toBe("function");
      expect(typeof latheCuttingChemistryEngine.comprehensiveAnalysis).toBe("function");
    });
  });
});
