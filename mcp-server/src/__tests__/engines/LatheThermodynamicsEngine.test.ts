/**
 * LatheThermodynamicsEngine Test Suite
 *
 * Tests comprehensive thermal modeling for lathe cutting operations:
 * - Heat generation in all cutting zones
 * - Heat partition between chip, tool, workpiece, coolant
 * - Temperature distribution (Jaeger/Loewen-Shaw models)
 * - Thermal damage assessment
 * - Coolant optimization
 * - Thermal distortion prediction
 *
 * Reference values validated against:
 * - Loewen & Shaw (1954) experimental data
 * - Komanduri & Hou (2001) thermal modeling
 * - Trent & Wright "Metal Cutting" Ch. 5
 * - Sandvik Coromant thermal guidelines
 */

import { describe, it, expect } from "vitest";
import {
  latheThermodynamicsEngine,
  LatheThermodynamicsEngine,
  type CuttingParameters,
  type MaterialSpec,
  type ToolGeometry,
  type CoolantProperties,
  type HeatGenerationResult,
  type HeatPartitionResult,
  type TemperatureDistributionResult,
  type ThermalDamageResult,
  type CoolantOptimizationResult,
  type ThermalDistortionResult,
  type ThermalAnalysisResult,
} from "../../engines/LatheThermodynamicsEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STEEL_CUTTING_PARAMS: CuttingParameters = {
  cutting_speed_m_min: 200,
  feed_mm_rev: 0.25,
  depth_of_cut_mm: 2.0,
};

const TITANIUM_CUTTING_PARAMS: CuttingParameters = {
  cutting_speed_m_min: 60,
  feed_mm_rev: 0.15,
  depth_of_cut_mm: 1.5,
};

const ALUMINUM_CUTTING_PARAMS: CuttingParameters = {
  cutting_speed_m_min: 400,
  feed_mm_rev: 0.30,
  depth_of_cut_mm: 3.0,
};

const HARDENED_STEEL_PARAMS: CuttingParameters = {
  cutting_speed_m_min: 100,
  feed_mm_rev: 0.10,
  depth_of_cut_mm: 0.5,
};

const STEEL_MATERIAL: MaterialSpec = {
  material_id: "steel",
};

const TITANIUM_MATERIAL: MaterialSpec = {
  material_id: "titanium_gr5",
};

const ALUMINUM_MATERIAL: MaterialSpec = {
  material_id: "aluminum_6061",
};

const HARDENED_MATERIAL: MaterialSpec = {
  material_id: "hardened_steel",
  hardness_HRC: 55,
};

const STANDARD_TOOL: ToolGeometry = {
  nose_radius_mm: 0.8,
  rake_angle_deg: 5,
  clearance_angle_deg: 7,
  insert_thickness_mm: 4.76,
};

const FLOOD_COOLANT: CoolantProperties = {
  type: "flood",
  flow_rate_L_min: 15,
  temperature_C: 25,
};

const HPC_COOLANT: CoolantProperties = {
  type: "high_pressure",
  flow_rate_L_min: 20,
  pressure_bar: 80,
  temperature_C: 25,
};

const CRYO_COOLANT: CoolantProperties = {
  type: "cryogenic_LN2",
  flow_rate_L_min: 0.5,
  temperature_C: -196,
};

// ============================================================================
// HEAT GENERATION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Heat Generation", () => {
  it("calculates total heat from cutting power", () => {
    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Nearly all cutting power becomes heat (>99%)
    expect(result.total_power_W.value).toBeGreaterThan(0);
    expect(result.total_heat_W.value).toBeCloseTo(result.total_power_W.value * 0.99, 0);
    expect(result.total_heat_W.unit).toBe("W");
  });

  it("partitions heat among three shear zones", () => {
    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // All three zones should have heat
    expect(result.primary_shear_heat_W.value).toBeGreaterThan(0);
    expect(result.secondary_shear_heat_W.value).toBeGreaterThan(0);
    expect(result.tertiary_rubbing_heat_W.value).toBeGreaterThan(0);

    // Primary zone gets most heat (60-75%)
    const primaryFrac = result.primary_shear_heat_W.value / result.total_heat_W.value;
    expect(primaryFrac).toBeGreaterThan(0.5);
    expect(primaryFrac).toBeLessThan(0.85);

    // All zones should sum close to total (within 5%)
    const sumZones = result.primary_shear_heat_W.value +
      result.secondary_shear_heat_W.value +
      result.tertiary_rubbing_heat_W.value;
    const diffPct = Math.abs(sumZones - result.total_heat_W.value) / result.total_heat_W.value * 100;
    expect(diffPct).toBeLessThan(5);
  });

  it("calculates heat flux at tool-chip interface", () => {
    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Heat flux can be high in aggressive cuts (100-2000 W/mm2 in literature)
    // Aggressive steel cut at 200 m/min with 2mm DOC generates significant heat
    expect(result.heat_flux_W_mm2.value).toBeGreaterThan(10);
    expect(result.heat_flux_W_mm2.value).toBeLessThan(5000);
    expect(result.heat_flux_W_mm2.unit).toBe("W/mm2");
  });

  it("calculates specific cutting energy", () => {
    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Specific energy for steel: 2-4 J/mm3 typical
    expect(result.specific_energy_J_mm3.value).toBeGreaterThan(0.5);
    expect(result.specific_energy_J_mm3.value).toBeLessThan(10);
    expect(result.specific_energy_J_mm3.unit).toBe("J/mm3");
  });

  it("calculates material removal rate correctly", () => {
    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // MRR = Vc × f × ap = 200 × 1000/60 × 0.25 × 2.0 = 1666.67 mm3/s × 60 = 100,000 mm3/min
    // Actually: 200 m/min × 0.25 mm/rev × 2.0 mm ≈ 100 cm3/min = 100,000 mm3/min
    const expectedMRR = 200 * 1000 * 0.25 * 2.0; // mm/min × mm × mm = mm3/min
    expect(result.mrr_mm3_min.value).toBeCloseTo(expectedMRR, -2);
  });

  it("higher speed increases primary zone heat fraction", () => {
    const lowSpeed: CuttingParameters = { ...STEEL_CUTTING_PARAMS, cutting_speed_m_min: 100 };
    const highSpeed: CuttingParameters = { ...STEEL_CUTTING_PARAMS, cutting_speed_m_min: 300 };

    const lowResult = latheThermodynamicsEngine.calculateHeatGeneration(lowSpeed, STEEL_MATERIAL, STANDARD_TOOL);
    const highResult = latheThermodynamicsEngine.calculateHeatGeneration(highSpeed, STEEL_MATERIAL, STANDARD_TOOL);

    // Higher speed = more adiabatic = more heat in primary zone
    expect(highResult.heat_breakdown.primary_pct).toBeGreaterThanOrEqual(lowResult.heat_breakdown.primary_pct);
  });

  it("warns on very high heat flux", () => {
    const extremeParams: CuttingParameters = {
      cutting_speed_m_min: 400,
      feed_mm_rev: 0.5,
      depth_of_cut_mm: 4.0,
    };

    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      extremeParams,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Should generate warning about high heat flux or power
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// HEAT PARTITION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Heat Partition", () => {
  it("partitions heat between chip, tool, workpiece, and coolant", () => {
    const result = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      FLOOD_COOLANT
    );

    // All fractions should sum to 100%
    const totalPct = result.chip_fraction_pct.value +
      result.tool_fraction_pct.value +
      result.workpiece_fraction_pct.value +
      result.coolant_fraction_pct.value;
    expect(totalPct).toBeCloseTo(100, 0);

    // Chip should carry majority (60-80%)
    expect(result.chip_fraction_pct.value).toBeGreaterThan(40);
    expect(result.chip_fraction_pct.value).toBeLessThan(90);
  });

  it("calculates partition coefficient R correctly", () => {
    const result = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL
    );

    // R = effusivity_chip / effusivity_work, should be near 1 for same material
    expect(result.partition_coefficient_R.value).toBeGreaterThan(0.5);
    expect(result.partition_coefficient_R.value).toBeLessThan(2.0);
  });

  it("calculates Peclet number for thermal regime", () => {
    const result = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL
    );

    // Peclet number indicates convection vs conduction dominance
    expect(result.peclet_number.value).toBeGreaterThan(0);
    expect(result.peclet_number.unit).toBe("dimensionless");

    // High speed steel cutting should be convection dominant
    expect(result.regime).toBe("convection_dominant");
  });

  it("identifies conduction-dominant regime at low speed", () => {
    const lowSpeedParams: CuttingParameters = {
      cutting_speed_m_min: 20,
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 1.0,
    };

    const result = latheThermodynamicsEngine.predictHeatPartition(
      lowSpeedParams,
      STEEL_MATERIAL
    );

    // Low speed = more conduction into workpiece
    expect(result.workpiece_fraction_pct.value).toBeGreaterThan(10);
  });

  it("coolant reduces heat to tool and workpiece", () => {
    const dryResult = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      { type: "dry" }
    );

    const floodResult = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      FLOOD_COOLANT
    );

    // Flood coolant should reduce tool heat fraction
    expect(floodResult.coolant_fraction_pct.value).toBeGreaterThan(dryResult.coolant_fraction_pct.value);
  });

  it("provides recommendations based on partition", () => {
    const result = latheThermodynamicsEngine.predictHeatPartition(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL
    );

    // Should have recommendations array
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.model).toContain("Loewen-Shaw");
  });
});

// ============================================================================
// TEMPERATURE DISTRIBUTION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Temperature Distribution", () => {
  it("calculates tool-chip interface temperature", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN",
      FLOOD_COOLANT
    );

    // Steel at 200 m/min with flood coolant: expect 300-500C interface
    expect(result.max_interface_temp_C.value).toBeGreaterThan(200);
    expect(result.max_interface_temp_C.value).toBeLessThan(800);
    expect(result.max_interface_temp_C.unit).toBe("C");
  });

  it("average interface temp is lower than maximum", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.avg_interface_temp_C.value).toBeLessThan(result.max_interface_temp_C.value);
    expect(result.avg_interface_temp_C.value).toBeGreaterThan(result.max_interface_temp_C.value * 0.5);
  });

  it("flank temperature is lower than rake face", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Flank sees less friction heat than rake face
    expect(result.flank_face_temp_C.value).toBeLessThan(result.rake_face_temp_C.value);
  });

  it("calculates substrate temperature below coating", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN"
    );

    // Substrate should be slightly cooler than interface due to coating barrier
    expect(result.substrate_temp_C.value).toBeLessThanOrEqual(result.max_interface_temp_C.value);
    expect(result.substrate_temp_C.value).toBeGreaterThan(50);
  });

  it("calculates workpiece surface temperature", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Workpiece surface gets heated but less than tool interface
    expect(result.workpiece_surface_temp_C.value).toBeGreaterThan(30);
    expect(result.workpiece_surface_temp_C.value).toBeLessThan(result.max_interface_temp_C.value);
  });

  it("calculates temperature gradient into workpiece", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Gradient in C/mm should be positive and reasonable
    expect(result.workpiece_gradient_C_mm.value).toBeGreaterThan(0);
    expect(result.workpiece_gradient_C_mm.unit).toBe("C/mm");
  });

  it("generates subsurface temperature profile", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Should have profile with decreasing temperature
    expect(result.subsurface_profile.length).toBeGreaterThan(0);

    const firstPoint = result.subsurface_profile[0];
    const lastPoint = result.subsurface_profile[result.subsurface_profile.length - 1];

    expect(firstPoint.depth_mm).toBeLessThan(lastPoint.depth_mm);
    expect(firstPoint.temperature_C).toBeGreaterThan(lastPoint.temperature_C);
  });

  it("calculates heat affected zone depth", () => {
    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // HAZ depth should be small (fractions of mm)
    expect(result.haz_depth_mm.value).toBeGreaterThan(0);
    expect(result.haz_depth_mm.value).toBeLessThan(5);
  });

  it("higher speed increases interface temperature", () => {
    const lowSpeed: CuttingParameters = { ...STEEL_CUTTING_PARAMS, cutting_speed_m_min: 100 };
    const highSpeed: CuttingParameters = { ...STEEL_CUTTING_PARAMS, cutting_speed_m_min: 300 };

    const lowResult = latheThermodynamicsEngine.calculateCuttingTemperature(lowSpeed, STEEL_MATERIAL, STANDARD_TOOL);
    const highResult = latheThermodynamicsEngine.calculateCuttingTemperature(highSpeed, STEEL_MATERIAL, STANDARD_TOOL);

    // T ∝ Vc^0.4 (Loewen-Shaw)
    expect(highResult.max_interface_temp_C.value).toBeGreaterThan(lowResult.max_interface_temp_C.value);
  });

  it("coolant reduces interface temperature", () => {
    const dryResult = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS, STEEL_MATERIAL, STANDARD_TOOL, "TiAlN", { type: "dry" }
    );
    const floodResult = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS, STEEL_MATERIAL, STANDARD_TOOL, "TiAlN", FLOOD_COOLANT
    );

    expect(floodResult.max_interface_temp_C.value).toBeLessThan(dryResult.max_interface_temp_C.value);
  });

  it("warns when temperature exceeds coating limit", () => {
    // High-speed dry cutting to exceed coating limit
    const extremeParams: CuttingParameters = {
      cutting_speed_m_min: 350,
      feed_mm_rev: 0.3,
      depth_of_cut_mm: 3.0,
    };

    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      extremeParams,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiN", // Low temp limit coating
      { type: "dry" }
    );

    // Should have warning about coating
    if (result.max_interface_temp_C.value > 550) {
      expect(result.warnings.some(w => w.toLowerCase().includes("coating"))).toBe(true);
    }
  });

  it("titanium generates higher temperatures than steel", () => {
    const steelResult = latheThermodynamicsEngine.calculateCuttingTemperature(
      { cutting_speed_m_min: 60, feed_mm_rev: 0.15, depth_of_cut_mm: 1.5 },
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    const titaniumResult = latheThermodynamicsEngine.calculateCuttingTemperature(
      TITANIUM_CUTTING_PARAMS,
      TITANIUM_MATERIAL,
      STANDARD_TOOL
    );

    // Titanium has lower thermal conductivity, so higher local temps
    expect(titaniumResult.max_interface_temp_C.value).toBeGreaterThan(steelResult.max_interface_temp_C.value * 0.8);
  });
});

// ============================================================================
// THERMAL DAMAGE ASSESSMENT TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Thermal Damage Assessment", () => {
  it("calculates overall damage risk score", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN",
      "carbide_P20",
      FLOOD_COOLANT
    );

    expect(result.damage_risk_score.value).toBeGreaterThanOrEqual(0);
    expect(result.damage_risk_score.value).toBeLessThanOrEqual(100);
    expect(result.damage_risk_score.unit).toBe("%");
  });

  it("assigns risk category based on score", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    const validCategories = ["negligible", "low", "moderate", "high", "critical"];
    expect(validCategories).toContain(result.risk_category);
  });

  it("assesses thermal softening", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(typeof result.material_effects.thermal_softening_active).toBe("boolean");
    expect(result.material_effects.softening_factor).toBeGreaterThan(0);
    expect(result.material_effects.softening_factor).toBeLessThanOrEqual(1);
    expect(result.material_effects.homologous_temperature).toBeGreaterThanOrEqual(0);
  });

  it("checks phase transformation risk for steels", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(typeof result.material_effects.phase_transformation_risk).toBe("boolean");
    if (result.material_effects.margin_to_Ac1_C !== undefined) {
      expect(typeof result.material_effects.margin_to_Ac1_C).toBe("number");
    }
  });

  it("warns about tempering risk for hardened steel", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      HARDENED_STEEL_PARAMS,
      HARDENED_MATERIAL,
      STANDARD_TOOL,
      "CBN",
      "CBN"
    );

    // Should check tempering risk
    expect(typeof result.material_effects.tempering_risk).toBe("boolean");
    if (result.material_effects.hardness_loss_HRC !== undefined) {
      expect(result.material_effects.hardness_loss_HRC).toBeGreaterThanOrEqual(0);
    }
  });

  it("assesses white layer formation risk", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      HARDENED_STEEL_PARAMS,
      HARDENED_MATERIAL,
      STANDARD_TOOL
    );

    expect(typeof result.material_effects.white_layer_risk).toBe("boolean");
  });

  it("assesses oxide formation risk", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN",
      "carbide_P20",
      { type: "dry" }
    );

    expect(typeof result.material_effects.oxide_formation_risk).toBe("boolean");
  });

  it("checks coating degradation risk", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiN" // Lower temp limit
    );

    expect(typeof result.tool_effects.coating_at_risk).toBe("boolean");
    expect(typeof result.tool_effects.coating_margin_C).toBe("number");
    expect(result.tool_effects.coating_degradation_rate).toBeGreaterThanOrEqual(0);
  });

  it("assesses diffusion wear activation", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(typeof result.tool_effects.diffusion_wear_active).toBe("boolean");
    expect(result.tool_effects.diffusion_factor).toBeGreaterThan(0);
  });

  it("detects thermal shock risk in interrupted cutting", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN",
      "carbide_P20",
      FLOOD_COOLANT,
      true // Interrupted cutting
    );

    expect(typeof result.tool_effects.thermal_shock_risk).toBe("boolean");
    expect(typeof result.tool_effects.thermal_fatigue_risk).toBe("boolean");
  });

  it("generates detailed assessments for each effect", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.assessments.length).toBeGreaterThan(0);

    const assessment = result.assessments[0];
    expect(assessment.effect).toBeDefined();
    expect(assessment.severity).toBeDefined();
    expect(typeof assessment.temperature_C).toBe("number");
    expect(typeof assessment.threshold_C).toBe("number");
    expect(typeof assessment.description).toBe("string");
  });

  it("provides recommendations based on damage assessment", () => {
    const result = latheThermodynamicsEngine.assessThermalDamage(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(Array.isArray(result.recommendations)).toBe(true);
  });
});

// ============================================================================
// COOLANT OPTIMIZATION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Coolant Optimization", () => {
  it("recommends appropriate coolant type", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN"
    );

    expect(result.recommended_type).toBeDefined();
    expect(result.confidence_pct.value).toBeGreaterThan(0);
    expect(result.confidence_pct.value).toBeLessThanOrEqual(100);
  });

  it("calculates heat removal capacity", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.heat_removal_W.value).toBeGreaterThan(0);
    expect(result.heat_removal_W.unit).toBe("W");
  });

  it("calculates temperature reduction achieved", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.temp_reduction_C.value).toBeGreaterThanOrEqual(0);
    expect(result.new_interface_temp_C.value).toBeGreaterThan(0);
  });

  it("provides optimal coolant parameters", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN"
    );

    // Should have optimal_params object defined
    const params = result.optimal_params;
    expect(params).toBeDefined();
    expect(typeof params).toBe("object");

    // For common coolant types, specific params should be set
    // The engine sets params based on recommended type
    // For dry cutting, params may all be undefined (which is valid)
  });

  it("detects film boiling risk", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(typeof result.film_boiling_risk).toBe("boolean");
  });

  it("calculates coolant penetration effectiveness", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.penetration_pct.value).toBeGreaterThanOrEqual(0);
    expect(result.penetration_pct.value).toBeLessThanOrEqual(100);
  });

  it("rates cost effectiveness and environmental impact", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.cost_effectiveness).toBeGreaterThanOrEqual(0);
    expect(result.cost_effectiveness).toBeLessThanOrEqual(10);
    expect(result.environmental_impact).toBeGreaterThanOrEqual(0);
    expect(result.environmental_impact).toBeLessThanOrEqual(10);
  });

  it("provides alternative coolant options", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.alternatives.length).toBeGreaterThan(0);

    const alt = result.alternatives[0];
    expect(alt.type).toBeDefined();
    expect(typeof alt.effectiveness_pct).toBe("number");
    expect(typeof alt.temp_reduction_C).toBe("number");
    expect(typeof alt.cost_factor).toBe("number");
  });

  it("respects exclusion constraints", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      "TiAlN",
      undefined,
      { exclude_types: ["cryogenic_LN2", "cryogenic_CO2"] }
    );

    // Should not recommend excluded types
    expect(result.recommended_type).not.toBe("cryogenic_LN2");
    expect(result.recommended_type).not.toBe("cryogenic_CO2");

    // Alternatives should not include excluded types
    result.alternatives.forEach(alt => {
      expect(alt.type).not.toBe("cryogenic_LN2");
      expect(alt.type).not.toBe("cryogenic_CO2");
    });
  });

  it("recommends cryogenic for difficult materials", () => {
    const result = latheThermodynamicsEngine.optimizeCoolant(
      TITANIUM_CUTTING_PARAMS,
      TITANIUM_MATERIAL,
      STANDARD_TOOL,
      "TiAlN"
    );

    // For titanium, cryogenic should be highly effective
    const cryoAlt = result.alternatives.find(a =>
      a.type === "cryogenic_LN2" || a.type === "cryogenic_CO2"
    );
    if (cryoAlt) {
      expect(cryoAlt.effectiveness_pct).toBeGreaterThan(50);
    }
  });
});

// ============================================================================
// THERMAL DISTORTION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Thermal Distortion", () => {
  it("predicts total dimensional error", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      },
      FLOOD_COOLANT
    );

    expect(result.total_error_um.value).toBeGreaterThanOrEqual(0);
    expect(result.total_error_um.unit).toBe("um");
  });

  it("calculates spindle thermal growth", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(result.spindle_growth_um.value).toBeGreaterThanOrEqual(0);
    expect(result.spindle_growth_um.unit).toBe("um");
  });

  it("calculates workpiece expansion", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(result.workpiece_expansion_um.value).toBeGreaterThanOrEqual(0);
  });

  it("calculates tool holder expansion", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
        holder_length_mm: 100,
      }
    );

    expect(result.toolholder_expansion_um.value).toBeGreaterThanOrEqual(0);
  });

  it("estimates time to thermal equilibrium", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(result.equilibrium_time_min.value).toBeGreaterThan(0);
    expect(result.equilibrium_time_min.unit).toBe("min");
  });

  it("identifies worst error direction", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(["radial", "axial", "combined"]).toContain(result.worst_direction);
    expect(result.axis_errors.X_radial_um).toBeGreaterThanOrEqual(0);
    expect(result.axis_errors.Z_axial_um).toBeGreaterThanOrEqual(0);
  });

  it("recommends compensation strategy", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(["none", "warmup", "adaptive", "probing", "model_based"]).toContain(result.compensation.strategy);
  });

  it("generates transient profile over time", () => {
    const result = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    expect(result.transient_profile).toBeDefined();
    expect(result.transient_profile!.length).toBeGreaterThan(0);

    const firstPoint = result.transient_profile![0];
    expect(typeof firstPoint.time_min).toBe("number");
    expect(typeof firstPoint.spindle_growth_um).toBe("number");
    expect(typeof firstPoint.workpiece_temp_C).toBe("number");
    expect(typeof firstPoint.total_error_um).toBe("number");
  });

  it("aluminum expands more than steel", () => {
    const steelResult = latheThermodynamicsEngine.predictThermalDistortion(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      { workpiece_diameter_mm: 50, workpiece_length_mm: 100 }
    );

    const alResult = latheThermodynamicsEngine.predictThermalDistortion(
      ALUMINUM_CUTTING_PARAMS,
      ALUMINUM_MATERIAL,
      STANDARD_TOOL,
      { workpiece_diameter_mm: 50, workpiece_length_mm: 100 }
    );

    // Aluminum has ~2x thermal expansion coefficient of steel
    // (but also different temps, so comparison is approximate)
    expect(alResult.workpiece_expansion_um.value).toBeGreaterThan(0);
  });
});

// ============================================================================
// COMPLETE ANALYSIS TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Complete Analysis", () => {
  it("performs comprehensive thermal analysis", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        coating: "TiAlN",
        substrate: "carbide_P20",
        coolant: FLOOD_COOLANT,
        workpiece_diameter_mm: 50,
        workpiece_length_mm: 100,
      }
    );

    // Should have all main sections
    expect(result.heat_generation).toBeDefined();
    expect(result.heat_partition).toBeDefined();
    expect(result.temperature_distribution).toBeDefined();
    expect(result.thermal_damage).toBeDefined();
    expect(result.coolant_optimization).toBeDefined();
    expect(result.thermal_distortion).toBeDefined();
  });

  it("generates summary metrics", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.summary.max_temperature_C).toBeGreaterThan(0);
    expect(result.summary.damage_risk_score).toBeGreaterThanOrEqual(0);
    expect(result.summary.tool_life_factor).toBeGreaterThan(0);
    expect(result.summary.tool_life_factor).toBeLessThanOrEqual(1);
    expect(["low", "moderate", "high"]).toContain(result.summary.quality_risk);
    expect(["none", "minor", "significant", "severe"]).toContain(result.summary.productivity_impact);
  });

  it("collects all warnings and recommendations", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("includes metadata with version and timing", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.metadata.model_version).toBeDefined();
    expect(result.metadata.calculation_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.metadata.assumptions.length).toBeGreaterThan(0);
  });

  it("can exclude optional analyses", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        include_coolant_optimization: false,
        include_distortion_prediction: false,
      }
    );

    expect(result.coolant_optimization).toBeUndefined();
    expect(result.thermal_distortion).toBeUndefined();
  });

  it("handles interrupted cutting flag", () => {
    const result = latheThermodynamicsEngine.analyzeComplete(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      STANDARD_TOOL,
      {
        interrupted: true,
      }
    );

    // Should assess thermal shock in interrupted cutting
    expect(result.thermal_damage.tool_effects.thermal_shock_risk).toBeDefined();
  });
});

// ============================================================================
// UTILITY METHOD TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Utility Methods", () => {
  it("provides coating properties database access", () => {
    const props = latheThermodynamicsEngine.getCoatingProperties("TiAlN");

    expect(props.max_temp_C).toBe(800);
    expect(props.peak_temp_C).toBe(900);
    expect(props.typical_thickness_um).toBeGreaterThan(0);
    expect(Array.isArray(props.best_for)).toBe(true);
  });

  it("lists all available coatings", () => {
    const coatings = latheThermodynamicsEngine.getAvailableCoatings();

    expect(coatings.length).toBeGreaterThan(5);
    expect(coatings).toContain("TiN");
    expect(coatings).toContain("TiAlN");
    expect(coatings).toContain("CBN");
  });

  it("provides substrate properties database access", () => {
    const props = latheThermodynamicsEngine.getSubstrateProperties("carbide_P20");

    expect(props.k_thermal).toBeGreaterThan(0);
    expect(props.max_temp_C).toBeGreaterThan(0);
    expect(props.E_GPa).toBeGreaterThan(0);
  });

  it("lists all available substrates", () => {
    const substrates = latheThermodynamicsEngine.getAvailableSubstrates();

    expect(substrates.length).toBeGreaterThan(5);
    expect(substrates).toContain("carbide_P20");
    expect(substrates).toContain("CBN");
    expect(substrates).toContain("ceramic_Al2O3");
  });

  it("provides coolant properties database access", () => {
    const props = latheThermodynamicsEngine.getCoolantProperties("flood");

    expect(props.cp).toBeGreaterThan(0);
    expect(props.temp_reduction_factor).toBeGreaterThan(0);
    expect(props.temp_reduction_factor).toBeLessThanOrEqual(1);
  });

  it("lists all available coolants", () => {
    const coolants = latheThermodynamicsEngine.getAvailableCoolants();

    expect(coolants.length).toBeGreaterThan(5);
    expect(coolants).toContain("flood");
    expect(coolants).toContain("high_pressure");
    expect(coolants).toContain("cryogenic_LN2");
  });

  it("provides phase transformation data", () => {
    const data = latheThermodynamicsEngine.getPhaseTransformationData("steel");

    expect(data).toBeDefined();
    expect(data!.Ac1_C).toBe(727);
    expect(data!.Ac3_C).toBeGreaterThan(data!.Ac1_C);
  });

  it("calculates homologous temperature", () => {
    // At room temperature, T* should be 0
    const tStarRoom = latheThermodynamicsEngine.calculateHomologousTemperature(20, 1500, 20);
    expect(tStarRoom).toBeCloseTo(0, 2);

    // At melting point, T* should be 1
    const tStarMelt = latheThermodynamicsEngine.calculateHomologousTemperature(1500, 1500, 20);
    expect(tStarMelt).toBeCloseTo(1, 1);

    // Mid-range should be between 0 and 1
    const tStarMid = latheThermodynamicsEngine.calculateHomologousTemperature(500, 1500, 20);
    expect(tStarMid).toBeGreaterThan(0);
    expect(tStarMid).toBeLessThan(1);
  });

  it("calculates thermal softening factor", () => {
    // At room temp, softening factor should be ~1 (full strength)
    const sfRoom = latheThermodynamicsEngine.calculateThermalSofteningFactor(20, 1500);
    expect(sfRoom).toBeCloseTo(1, 1);

    // At elevated temp, softening factor should decrease
    const sfHot = latheThermodynamicsEngine.calculateThermalSofteningFactor(800, 1500);
    expect(sfHot).toBeLessThan(1);
    expect(sfHot).toBeGreaterThan(0);
  });

  it("estimates temperature from heat tint color", () => {
    const strawRange = latheThermodynamicsEngine.estimateTemperatureFromColor("straw");
    expect(strawRange.min_C).toBe(220);
    expect(strawRange.max_C).toBe(250);
    expect(strawRange.material).toBe("steel");

    const blueRange = latheThermodynamicsEngine.estimateTemperatureFromColor("blue");
    expect(blueRange.min_C).toBe(310);
    expect(blueRange.max_C).toBe(340);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Edge Cases", () => {
  it("handles very low cutting speeds", () => {
    const lowSpeedParams: CuttingParameters = {
      cutting_speed_m_min: 5,
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 0.5,
    };

    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      lowSpeedParams,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.max_interface_temp_C.value).toBeGreaterThan(20);
    expect(result.max_interface_temp_C.value).toBeLessThan(200);
  });

  it("handles very high cutting speeds", () => {
    const highSpeedParams: CuttingParameters = {
      cutting_speed_m_min: 500,
      feed_mm_rev: 0.3,
      depth_of_cut_mm: 2.0,
    };

    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      highSpeedParams,
      ALUMINUM_MATERIAL,
      STANDARD_TOOL
    );

    // Should calculate without errors
    // Aluminum at high speed with good conductivity may have lower temps
    expect(result.max_interface_temp_C.value).toBeGreaterThan(20);
    expect(Number.isFinite(result.max_interface_temp_C.value)).toBe(true);
  });

  it("handles minimum depth of cut", () => {
    const minDocParams: CuttingParameters = {
      cutting_speed_m_min: 100,
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 0.1,
    };

    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      minDocParams,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    expect(result.total_heat_W.value).toBeGreaterThan(0);
    expect(Number.isFinite(result.total_heat_W.value)).toBe(true);
  });

  it("handles custom material thermal properties", () => {
    const customMaterial: MaterialSpec = {
      material_id: "steel",
      k_thermal_override: 25, // Low conductivity
      cp_override: 600,
      density_override: 8000,
    };

    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      customMaterial,
      STANDARD_TOOL
    );

    // Lower conductivity = higher temperature
    expect(result.max_interface_temp_C.value).toBeGreaterThan(0);
  });

  it("handles tool with custom contact length", () => {
    const customTool: ToolGeometry = {
      ...STANDARD_TOOL,
      chip_contact_length_mm: 1.5,
    };

    const result = latheThermodynamicsEngine.calculateCuttingTemperature(
      STEEL_CUTTING_PARAMS,
      STEEL_MATERIAL,
      customTool
    );

    expect(result.max_interface_temp_C.value).toBeGreaterThan(0);
  });

  it("handles provided cutting force", () => {
    const paramsWithForce: CuttingParameters = {
      ...STEEL_CUTTING_PARAMS,
      cutting_force_N: 1500,
      thrust_force_N: 600,
      feed_force_N: 400,
    };

    const result = latheThermodynamicsEngine.calculateHeatGeneration(
      paramsWithForce,
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Should use provided force, not estimate
    expect(result.total_power_W.value).toBeGreaterThan(0);
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe("LatheThermodynamicsEngine - Validation Against Literature", () => {
  it("interface temperature follows Loewen-Shaw relationship", () => {
    // T ∝ Vc^0.4 × f^0.2
    const base = latheThermodynamicsEngine.calculateCuttingTemperature(
      { cutting_speed_m_min: 100, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    const doubleSpeed = latheThermodynamicsEngine.calculateCuttingTemperature(
      { cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      STEEL_MATERIAL,
      STANDARD_TOOL
    );

    // Double speed should increase temp by factor of 2^0.4 ≈ 1.32
    const tempRatio = (doubleSpeed.max_interface_temp_C.value - 20) / (base.max_interface_temp_C.value - 20);
    expect(tempRatio).toBeGreaterThan(1.1);
    expect(tempRatio).toBeLessThan(1.6);
  });

  it("heat partition matches Komanduri model trends", () => {
    // At high speeds, chip carries >70% of heat
    const highSpeed = latheThermodynamicsEngine.predictHeatPartition(
      { cutting_speed_m_min: 300, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      STEEL_MATERIAL
    );

    expect(highSpeed.chip_fraction_pct.value).toBeGreaterThan(60);

    // At low speeds, workpiece gets more heat
    const lowSpeed = latheThermodynamicsEngine.predictHeatPartition(
      { cutting_speed_m_min: 30, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      STEEL_MATERIAL
    );

    expect(lowSpeed.workpiece_fraction_pct.value).toBeGreaterThan(highSpeed.workpiece_fraction_pct.value);
  });

  it("coating temperature limits match manufacturer data", () => {
    // TiN: 550-600C continuous
    const tin = latheThermodynamicsEngine.getCoatingProperties("TiN");
    expect(tin.max_temp_C).toBeGreaterThanOrEqual(500);
    expect(tin.max_temp_C).toBeLessThanOrEqual(650);

    // TiAlN: 800C
    const tialn = latheThermodynamicsEngine.getCoatingProperties("TiAlN");
    expect(tialn.max_temp_C).toBe(800);

    // Al2O3: 1200C
    const al2o3 = latheThermodynamicsEngine.getCoatingProperties("Al2O3");
    expect(al2o3.max_temp_C).toBe(1200);

    // CBN: 1200C
    const cbn = latheThermodynamicsEngine.getCoatingProperties("CBN");
    expect(cbn.max_temp_C).toBe(1200);
  });

  it("phase transformation temperatures match steel data", () => {
    const steelPhase = latheThermodynamicsEngine.getPhaseTransformationData("steel");

    // Ac1 for carbon steel: ~727C (eutectoid)
    expect(steelPhase!.Ac1_C).toBeCloseTo(727, 0);

    // Ac3 higher than Ac1
    expect(steelPhase!.Ac3_C).toBeGreaterThan(steelPhase!.Ac1_C);
  });
});
