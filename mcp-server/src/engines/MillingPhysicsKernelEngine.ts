/**
 * MillingPhysicsKernelEngine.ts
 *
 * FACADE ENGINE — Unifies all milling physics calculations through a single API.
 * Does NOT implement formulas — delegates to existing canonical engines.
 *
 * This is the SINGLE POINT OF ENTRY for milling physics in PRISM.
 * All milling intelligence engines should import from here, not directly
 * from individual physics engines.
 *
 * Delegates to:
 * - constants.ts: kienzleForce, taylorLife, extendedTaylorLife, toolDeflection
 * - ChipFormationPredictionEngine: Merchant shear angle, chip morphology
 * - LoewenShawHeatPartitionEngine: Loewen-Shaw 1954 temperature model
 * - AdvancedCuttingMathEngine: Helix angle force decomposition
 *
 * @module engines/MillingPhysicsKernelEngine
 * @version 1.0.0
 */

import {
  kienzleForce,
  taylorLife,
  extendedTaylorLife,
  extendedTaylorExponents,
  toolDeflection,
  predictedRa,
} from "../physics/constants.js";

import { chipFormationPredictionEngine } from "./ChipFormationPredictionEngine.js";
import { loewenShawHeatPartitionEngine } from "./LoewenShawHeatPartitionEngine.js";
import { advancedCuttingMathEngine } from "./AdvancedCuttingMathEngine.js";

// === PHASE 1 WIRING: Additional Physics Engines ===
// Force engines (5)
import { kienzleForceModelEngine } from "./KienzleForceModelEngine.js";
import { cuttingForceEngine } from "./CuttingForceEngine.js";
import { stochasticCuttingForceEngine } from "./StochasticCuttingForceEngine.js";
import { cuttingPowerBudgetEngine } from "./CuttingPowerBudgetEngine.js";
import { specificCuttingEnergyEngine } from "./SpecificCuttingEnergyEngine.js";

// Thermal engines (3)
import { cuttingTemperatureEngine } from "./CuttingTemperatureEngine.js";
import { thermalWearCouplingEngine } from "./ThermalWearCouplingEngine.js";
import { stochasticThermalEngine } from "./StochasticThermalEngine.js";

// Deflection engines (1)
import { toolDeflectionPredictionEngine } from "./ToolDeflectionPredictionEngine.js";

// Stability engines (1)
import { chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";

// Surface engines (2)
import { surfaceFinishPredictorEngine } from "./SurfaceFinishPredictorEngine.js";
import { surfaceIntegrityEngine } from "./SurfaceIntegrityEngine.js";

// ==================== TYPE DEFINITIONS ====================

interface AtomicValue {
  value: number;
  unit: string;
  source: string;
  uncertainty?: number;
  warning?: string;
}

interface MillingForceInput {
  kc1_1: number;           // Specific cutting force at h=1mm [N/mm²]
  mc: number;              // Kienzle exponent (typically 0.25)
  ap: number;              // Axial depth of cut [mm]
  fz: number;              // Feed per tooth [mm]
  ae?: number;             // Radial depth of cut [mm] (for engagement angle)
  helix_angle_deg?: number; // Tool helix angle for force decomposition
  tool_diameter_mm?: number; // For engagement calculations
}

interface MillingForceResult {
  tangential_force_N: AtomicValue;
  radial_force_N: AtomicValue;
  axial_force_N: AtomicValue;
  resultant_force_N: AtomicValue;
  specific_cutting_force_N_mm2: AtomicValue;
  power_kW: AtomicValue;
}

interface ToolLifeInput {
  C: number;               // Taylor constant
  n: number;               // Speed exponent
  Vc: number;              // Cutting speed [m/min]
  coating?: string;        // Tool coating
  // Extended Taylor (optional)
  p?: number;              // Feed exponent
  q?: number;              // Depth exponent
  f?: number;              // Feed rate [mm]
  ap?: number;             // Axial depth [mm]
  iso_group?: string;      // For exponent lookup
}

interface ToolLifeResult {
  tool_life_min: AtomicValue;
  model_used: "basic_taylor" | "extended_taylor";
  exponents: { n: number; p?: number; q?: number };
}

interface ChipFormationInput {
  cutting_speed_m_min: number;
  feed_mm: number;
  depth_of_cut_mm?: number;
  rake_angle_deg: number;
  friction_coefficient?: number;
  workpiece_hardness_hrc?: number;
  coolant_active?: boolean;
  workpiece_ductility?: "brittle" | "moderate" | "ductile" | "very_ductile";
  tool_has_chipbreaker?: boolean;
}

interface TemperatureInput {
  Vc: number;              // Cutting speed [m/min]
  fz: number;              // Feed per tooth [mm] (used as chip thickness)
  ap: number;              // Axial depth [mm]
  Fc?: number;             // Cutting force [N] (for specific cutting force calc)
  workpiece: {
    thermal_conductivity_w_mk: number;
    specific_heat_j_kgk: number;
    density_kg_m3: number;
    name?: string;
  };
  tool?: {
    thermal_conductivity_w_mk: number;
    specific_heat_j_kgk?: number;
    density_kg_m3?: number;
    name?: string;
  };
  rake_angle_deg?: number;
  specific_cutting_force_N_mm2?: number;
  coolant_type?: "dry" | "flood" | "mist" | "mql" | "cryogenic" | "through_tool";
}

interface TemperatureResult {
  chip_temperature_C: AtomicValue;
  tool_face_temperature_C: AtomicValue;
  heat_partition_chip: AtomicValue;
  heat_partition_tool: AtomicValue;
  heat_partition_workpiece: AtomicValue;
}

interface DeflectionInput {
  force_N: number;
  tool_stickout_mm: number;
  tool_diameter_mm: number;
  elastic_modulus_MPa?: number; // Default: carbide 600,000
}

interface DeflectionResult {
  deflection_mm: AtomicValue;
  acceptable: boolean;
  max_recommended_mm: number;
}

// ==================== MAIN ENGINE ====================

class MillingPhysicsKernelEngine {
  private readonly SOURCE = "MillingPhysicsKernelEngine";

  /**
   * Calculate milling forces using Kienzle model with optional helix decomposition.
   *
   * Delegates to:
   * - kienzleForce() from constants.ts
   * - helixAngleForceDecomposition() from AdvancedCuttingMathEngine
   */
  calculateMillingForces(input: MillingForceInput): MillingForceResult {
    const { kc1_1, mc, ap, fz, helix_angle_deg = 30, tool_diameter_mm = 10, ae = tool_diameter_mm } = input;

    // 1. Calculate tangential force using Kienzle model
    const Fc = kienzleForce(kc1_1, mc, ap, fz);

    // 2. Decompose into axial/radial using helix angle
    const decomposition = advancedCuttingMathEngine.helixAngleForceDecomposition({
      tangential_force_N: Fc,
      helix_angle_deg: helix_angle_deg,
      cutter_diameter_mm: tool_diameter_mm,
    });

    // 3. Calculate specific cutting force
    const chipArea = ap * fz;
    const kc = chipArea > 0 ? Fc / chipArea : kc1_1;

    // 4. Estimate power (P = Fc × Vc / 60000)
    // Note: Vc not in input, estimate from typical values or return placeholder
    const powerEstimate = Fc * 100 / 60000; // Assume Vc ≈ 100 m/min

    // 5. Calculate resultant force
    const Fa = decomposition.axial_force_N.value;
    const Fr = decomposition.radial_force_N.value;
    const F_resultant = Math.sqrt(Fc * Fc + Fa * Fa + Fr * Fr);

    return {
      tangential_force_N: {
        value: Fc,
        unit: "N",
        source: "Kienzle model (constants.ts)",
      },
      radial_force_N: decomposition.radial_force_N,
      axial_force_N: decomposition.axial_force_N,
      resultant_force_N: {
        value: F_resultant,
        unit: "N",
        source: "RSS of Fc, Fa, Fr",
      },
      specific_cutting_force_N_mm2: {
        value: kc,
        unit: "N/mm²",
        source: "kc = Fc / (ap × fz)",
      },
      power_kW: {
        value: powerEstimate,
        unit: "kW",
        source: "P = Fc × Vc / 60000 (estimated Vc=100)",
        warning: "Vc not provided, using estimate",
      },
    };
  }

  /**
   * Calculate tool life using Taylor or Extended Taylor equation.
   *
   * Delegates to:
   * - taylorLife() from constants.ts (basic)
   * - extendedTaylorLife() from constants.ts (with feed/depth exponents)
   * - extendedTaylorExponents() for ISO group lookup
   */
  calculateToolLife(input: ToolLifeInput): ToolLifeResult {
    const { C, n, Vc, coating, p, q, f, ap, iso_group } = input;

    // Determine if we should use extended Taylor
    const useExtended = (p !== undefined && q !== undefined && f !== undefined && ap !== undefined)
                     || iso_group !== undefined;

    if (useExtended) {
      // Get exponents from lookup if not provided
      let pVal = p;
      let qVal = q;
      if ((p === undefined || q === undefined) && iso_group) {
        const exponents = extendedTaylorExponents(iso_group);
        pVal = p ?? exponents.p;
        qVal = q ?? exponents.q;
      }

      const toolLife = extendedTaylorLife(
        C, n, pVal ?? 0.3, qVal ?? 0.15,
        Vc, f ?? 0.1, ap ?? 1.0, coating
      );

      return {
        tool_life_min: {
          value: toolLife,
          unit: "min",
          source: "Extended Taylor: T = C / (Vc^n × f^p × ap^q)",
        },
        model_used: "extended_taylor",
        exponents: { n, p: pVal, q: qVal },
      };
    } else {
      // Basic Taylor
      const toolLife = taylorLife(C, n, Vc, coating);

      return {
        tool_life_min: {
          value: toolLife,
          unit: "min",
          source: "Taylor: T = (C/Vc)^(1/n)",
        },
        model_used: "basic_taylor",
        exponents: { n },
      };
    }
  }

  /**
   * Predict chip formation characteristics including Merchant shear angle.
   *
   * Delegates to: ChipFormationPredictionEngine
   */
  predictChipFormation(input: ChipFormationInput) {
    return chipFormationPredictionEngine.calculate({
      cutting_speed_m_min: input.cutting_speed_m_min,
      feed_mm_rev: input.feed_mm,
      depth_of_cut_mm: input.depth_of_cut_mm ?? 1.0,
      rake_angle_deg: input.rake_angle_deg,
      friction_coefficient: input.friction_coefficient,
      workpiece_hardness_hrc: input.workpiece_hardness_hrc,
      coolant_active: input.coolant_active,
      workpiece_ductility: input.workpiece_ductility,
      tool_has_chipbreaker: input.tool_has_chipbreaker,
    });
  }

  /**
   * Calculate cutting temperatures using Loewen-Shaw heat partition model.
   *
   * Delegates to: LoewenShawHeatPartitionEngine
   */
  calculateCuttingTemperature(input: TemperatureInput): TemperatureResult {
    // Default carbide tool properties
    const toolProps = input.tool ?? {
      thermal_conductivity_w_mk: 100,  // Carbide typical
      specific_heat_j_kgk: 250,
      density_kg_m3: 14500,
      name: "carbide",
    };

    // Calculate specific cutting force if Fc provided
    const chipArea = input.ap * input.fz;
    const kc = input.Fc && chipArea > 0 ? input.Fc / chipArea : input.specific_cutting_force_N_mm2 ?? 2000;

    const result = loewenShawHeatPartitionEngine.calculate({
      chipMaterial: {
        density: input.workpiece.density_kg_m3,
        specificHeat: input.workpiece.specific_heat_j_kgk,
        thermalConductivity: input.workpiece.thermal_conductivity_w_mk,
        name: input.workpiece.name ?? "workpiece",
      },
      workpieceMaterial: {
        density: input.workpiece.density_kg_m3,
        specificHeat: input.workpiece.specific_heat_j_kgk,
        thermalConductivity: input.workpiece.thermal_conductivity_w_mk,
        name: input.workpiece.name ?? "workpiece",
      },
      toolMaterial: {
        density: toolProps.density_kg_m3 ?? 14500,
        specificHeat: toolProps.specific_heat_j_kgk ?? 250,
        thermalConductivity: toolProps.thermal_conductivity_w_mk,
        name: toolProps.name ?? "carbide",
      },
      cuttingSpeed: input.Vc,
      chipThickness: input.fz,
      toolRakeAngle: input.rake_angle_deg ?? 5,
      depthOfCut: input.ap,
      specificCuttingForce: kc,
      coolantType: input.coolant_type,
    });

    return {
      chip_temperature_C: {
        value: result.maxChipTemperature,
        unit: "°C",
        source: "Loewen-Shaw 1954 heat partition model",
      },
      tool_face_temperature_C: {
        value: result.maxToolTemperature,
        unit: "°C",
        source: "Loewen-Shaw 1954 heat partition model",
      },
      heat_partition_chip: {
        value: result.partitionPercent.chip / 100,
        unit: "fraction",
        source: "Loewen-Shaw R_L factor",
      },
      heat_partition_tool: {
        value: result.partitionPercent.tool / 100,
        unit: "fraction",
        source: "Loewen-Shaw R_L factor",
      },
      heat_partition_workpiece: {
        value: result.partitionPercent.workpiece / 100,
        unit: "fraction",
        source: "Loewen-Shaw R_L factor",
      },
    };
  }

  /**
   * Calculate tool deflection using cantilever beam theory.
   *
   * Delegates to: toolDeflection() from constants.ts
   */
  calculateToolDeflection(input: DeflectionInput): DeflectionResult {
    const { force_N, tool_stickout_mm, tool_diameter_mm, elastic_modulus_MPa = 600000 } = input;

    const deflection = toolDeflection(force_N, tool_stickout_mm, tool_diameter_mm, elastic_modulus_MPa);

    // Rule of thumb: deflection should be < 0.1 × finish tolerance
    // For typical 0.01mm finish tolerance, max 0.001mm deflection
    // For roughing, allow up to 0.05mm
    const maxRecommended = 0.05; // mm (roughing)
    const acceptable = deflection < maxRecommended;

    return {
      deflection_mm: {
        value: deflection,
        unit: "mm",
        source: "Euler-Bernoulli cantilever: δ = FL³/3EI",
      },
      acceptable,
      max_recommended_mm: maxRecommended,
    };
  }

  /**
   * Calculate predicted surface roughness Ra.
   *
   * Delegates to: predictedRa() from constants.ts
   */
  calculateSurfaceRoughness(fz: number, cornerRadius_mm: number): AtomicValue {
    const ra = predictedRa(fz, cornerRadius_mm);
    return {
      value: ra,
      unit: "µm",
      source: "Brammertz kinematic roughness: Ra = fz²/(32×re)×1000",
    };
  }

  /**
   * Helix angle force decomposition convenience wrapper.
   *
   * Delegates to: AdvancedCuttingMathEngine.helixAngleForceDecomposition()
   */
  decomposeHelixForces(tangential_force_N: number, helix_angle_deg: number) {
    return advancedCuttingMathEngine.helixAngleForceDecomposition({
      tangential_force_N,
      helix_angle_deg,
    });
  }

  /**
   * Get full physics state for a milling operation.
   * Combines force, temperature, deflection, and chip formation analysis.
   */
  getFullPhysicsState(input: {
    material: {
      kc1_1: number;
      mc: number;
      thermal_conductivity_w_mk: number;
      specific_heat_j_kgk: number;
      density_kg_m3: number;
      hardness_hrc?: number;
    };
    tool: {
      diameter_mm: number;
      stickout_mm: number;
      helix_angle_deg: number;
      rake_angle_deg: number;
      corner_radius_mm: number;
      thermal_conductivity_w_mk: number;
      coating?: string;
    };
    cutting: {
      Vc: number;
      fz: number;
      ap: number;
      ae: number;
    };
    taylor?: {
      C: number;
      n: number;
      iso_group?: string;
    };
  }) {
    // 1. Calculate forces
    const forces = this.calculateMillingForces({
      kc1_1: input.material.kc1_1,
      mc: input.material.mc,
      ap: input.cutting.ap,
      fz: input.cutting.fz,
      ae: input.cutting.ae,
      helix_angle_deg: input.tool.helix_angle_deg,
      tool_diameter_mm: input.tool.diameter_mm,
    });

    // 2. Calculate temperature
    const temperature = this.calculateCuttingTemperature({
      Vc: input.cutting.Vc,
      fz: input.cutting.fz,
      ap: input.cutting.ap,
      Fc: forces.tangential_force_N.value,
      workpiece: {
        thermal_conductivity_w_mk: input.material.thermal_conductivity_w_mk,
        specific_heat_j_kgk: input.material.specific_heat_j_kgk,
        density_kg_m3: input.material.density_kg_m3,
      },
      tool: {
        thermal_conductivity_w_mk: input.tool.thermal_conductivity_w_mk,
        specific_heat_j_kgk: 250,  // Carbide typical
        density_kg_m3: 14500,      // Carbide typical
      },
      rake_angle_deg: input.tool.rake_angle_deg,
    });

    // 3. Calculate deflection
    const deflection = this.calculateToolDeflection({
      force_N: forces.resultant_force_N.value,
      tool_stickout_mm: input.tool.stickout_mm,
      tool_diameter_mm: input.tool.diameter_mm,
    });

    // 4. Calculate surface roughness
    const surfaceRoughness = this.calculateSurfaceRoughness(
      input.cutting.fz,
      input.tool.corner_radius_mm
    );

    // 5. Calculate tool life (if Taylor constants provided)
    let toolLife: ToolLifeResult | undefined;
    if (input.taylor) {
      toolLife = this.calculateToolLife({
        C: input.taylor.C,
        n: input.taylor.n,
        Vc: input.cutting.Vc,
        coating: input.tool.coating,
        iso_group: input.taylor.iso_group,
        f: input.cutting.fz,
        ap: input.cutting.ap,
      });
    }

    // 6. Predict chip formation
    const chipFormation = this.predictChipFormation({
      cutting_speed_m_min: input.cutting.Vc,
      feed_mm: input.cutting.fz,
      depth_of_cut_mm: input.cutting.ap,
      rake_angle_deg: input.tool.rake_angle_deg,
      workpiece_hardness_hrc: input.material.hardness_hrc,
    });

    return {
      forces,
      temperature,
      deflection,
      surfaceRoughness,
      toolLife,
      chipFormation,
      source: this.SOURCE,
      engines_consulted: this.getWiredEngines(),
    };
  }

  // =========================================================================
  // PHASE 1 WIRING: ADDITIONAL FORCE ENGINES
  // =========================================================================

  /**
   * Full Kienzle model with rake/wear/speed corrections.
   * Delegates to: KienzleForceModelEngine.calculateSpecificCuttingForce()
   */
  calculateKienzleSpecificForce(input: {
    kc1_1: number;
    mc: number;
    feed_mm: number;
    depth_of_cut_mm: number;
    approach_angle_deg?: number;
    rake_angle_deg?: number;
    flank_wear_mm?: number;
    cutting_speed_mpm?: number;
    tool_diameter_mm?: number;
  }) {
    return kienzleForceModelEngine.calculateSpecificCuttingForce(input);
  }

  /**
   * Multi-component force calculation (Fc, Ff, Fp, resultant, torque, power).
   * Delegates to: KienzleForceModelEngine.calculateForceComponents()
   */
  calculateForceComponents(input: {
    operation: "turning" | "milling";
    kc1_1: number;
    mc: number;
    feed_mm: number;
    depth_of_cut_mm: number;
    cutting_speed_mpm: number;
    tool_diameter_mm?: number;
    flutes?: number;
    radial_depth_mm?: number;
    approach_angle_deg?: number;
    rake_angle_deg?: number;
    helix_angle_deg?: number;
    flank_wear_mm?: number;
  }) {
    return kienzleForceModelEngine.calculateForceComponents(input);
  }

  /**
   * Instantaneous and average milling forces with engagement modeling.
   * Delegates to: KienzleForceModelEngine.calculateMillingForces()
   */
  calculateInstantaneousMillingForces(input: {
    kc1_1: number;
    mc: number;
    fz: number;
    ap: number;
    ae: number;
    d: number;
    z: number;
    cutting_speed_mpm: number;
    helix_angle_deg?: number;
    down_milling?: boolean;
    rake_angle_deg?: number;
    flank_wear_mm?: number;
  }) {
    return kienzleForceModelEngine.calculateMillingForces(input);
  }

  /**
   * Multi-component cutting force with material lookup.
   * Delegates to: CuttingForceEngine.calculate()
   */
  calculateCuttingForce(input: {
    operation?: "turning" | "milling" | "drilling";
    material_type?: "steel" | "aluminum" | "titanium" | "stainless" | "cast_iron" | "brass";
    depth_of_cut_mm: number;
    feed_mm: number;
    cutting_speed_mpm?: number;
    lead_angle_deg?: number;
    rake_angle_deg?: number;
    tool_diameter_mm?: number;
    flutes?: number;
    radial_engagement_mm?: number;
  }) {
    return cuttingForceEngine.calculate(input);
  }

  /**
   * Monte Carlo stochastic force with uncertainty quantification.
   * Delegates to: StochasticCuttingForceEngine.compute()
   *
   * Uses Latin Hypercube Sampling + Sobol sensitivity indices.
   */
  calculateStochasticForce(input: {
    material: string;
    depth_mm: number;
    feed_mm: number;
    width_mm?: number;
    tool_diameter_mm: number;
    flute_count: number;
    rake_angle_deg?: number;
    edge_radius_um?: number;
    runout_um?: number;
    n_trials?: number;
    method?: "mc" | "fosm" | "both";
  }) {
    return stochasticCuttingForceEngine.compute(input);
  }

  /**
   * Power budget analysis (spindle, feed drive, efficiency).
   * Delegates to: CuttingPowerBudgetEngine.calculate()
   *
   * Validates parameters against machine power/torque envelope.
   */
  calculatePowerBudget(input: {
    machine_power_kW: number;
    machine_max_torque_Nm?: number;
    machine_base_rpm?: number;
    machine_max_rpm?: number;
    cutting_speed_m_min: number;
    tool_diameter_mm?: number;
    workpiece_diameter_mm?: number;
    feed_mm_rev?: number;
    feed_mm_tooth?: number;
    flutes?: number;
    depth_of_cut_mm: number;
    width_of_cut_mm?: number;
    material_kc1_1?: number;
    material_mc?: number;
    iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  }) {
    return cuttingPowerBudgetEngine.calculate(input);
  }

  /**
   * Specific cutting energy and efficiency analysis.
   * Delegates to: SpecificCuttingEnergyEngine.calculate()
   *
   * Models energy per volume removed, CO₂ equivalent, machine efficiency.
   */
  calculateSpecificEnergy(input: {
    cutting_force_N?: number;
    chip_width_mm?: number;
    chip_thickness_mm?: number;
    kc1_1?: number;
    mc?: number;
    feed_mm?: number;
    mrr_cm3_min?: number;
    cutting_speed_m_min?: number;
    depth_of_cut_mm?: number;
    width_of_cut_mm?: number;
  }) {
    return specificCuttingEnergyEngine.calculate(input);
  }

  // =========================================================================
  // PHASE 1 WIRING: ADDITIONAL THERMAL ENGINES
  // =========================================================================

  /**
   * Trigger temperature model for tool-chip interface.
   * Delegates to: CuttingTemperatureEngine.calculate()
   *
   * Based on Loewen-Shaw + Sandvik Thermal Load Guide.
   */
  calculateTriggerTemperature(input: {
    cutting_speed_mpm: number;
    feed_mm: number;
    depth_of_cut_mm?: number;
    material_type?: "steel" | "aluminum" | "titanium" | "stainless" | "cast_iron" | "inconel";
    tool_coating?: "uncoated" | "TiN" | "TiCN" | "TiAlN" | "AlCrN" | "diamond" | "CBN";
    coolant?: "flood" | "mist" | "mql" | "dry" | "through_tool" | "cryogenic";
    ambient_temp_c?: number;
  }) {
    return cuttingTemperatureEngine.calculate(input);
  }

  /**
   * Coupled force-temperature-wear-deflection ODE solver.
   * Delegates to: ThermalWearCouplingEngine.analyze()
   *
   * This is the most sophisticated physics model — it couples:
   * - Cutting force → temperature → wear rate → force increase → ...
   * - Uses RK4 ODE integration for time-stepping
   * - Based on Usui (1978) wear model: dW/dt = A·σ_n·V_s·exp(-B/T)
   */
  analyzeThermalWearCoupling(input: {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    initial_force_N: number;
    tool_diameter_mm?: number;
    tool_overhang_mm?: number;
    tool_E_GPa?: number;
    usui_C1?: number;
    usui_C2?: number;
    wear_force_factor?: number;
    wear_limit_mm?: number;
    time_steps?: number;
    dt_minutes?: number;
  }) {
    return thermalWearCouplingEngine.analyze(input);
  }

  /**
   * Monte Carlo thermal analysis with uncertainty.
   * Delegates to: StochasticThermalEngine.compute()
   *
   * Uses Jaeger moving heat source + Loewen-Shaw partition.
   * Returns coating exceedance probability.
   */
  calculateStochasticThermal(input: {
    material: string;
    cutting_speed_mpm: number;
    feed_mm: number;
    depth_mm: number;
    width_mm?: number;
    tool_diameter_mm: number;
    coolant_type: "flood" | "mql" | "dry" | "cryogenic";
    coating?: "TiAlN" | "TiN" | "AlCrN" | "uncoated" | "diamond";
    coating_max_temp_c?: number;
    n_trials?: number;
    method?: "mc" | "fosm" | "both";
  }) {
    return stochasticThermalEngine.compute(input);
  }

  // =========================================================================
  // PHASE 1 WIRING: DEFLECTION ENGINES
  // =========================================================================

  /**
   * Advanced tool deflection with stepped shaft modeling.
   * Delegates to: ToolDeflectionPredictionEngine.calculate()
   *
   * More sophisticated than constants.ts toolDeflection() — includes:
   * - Holder + tool stepped shaft modeling
   * - Flute count effective inertia reduction
   * - Helix angle axial force component
   * - Stress analysis and safety factor
   */
  calculateAdvancedToolDeflection(input: {
    tool_diameter_mm: number;
    tool_overhang_mm: number;
    cutting_force_N: number;
    force_direction?: "radial" | "tangential" | "axial";
    tool_material?: "carbide" | "hss" | "ceramic" | "cermet" | "cbn" | "pcd";
    holder_diameter_mm?: number;
    holder_length_mm?: number;
    flute_count?: number;
    helix_angle_deg?: number;
    tolerance_target_mm?: number;
  }) {
    return toolDeflectionPredictionEngine.calculate(input);
  }

  // =========================================================================
  // PHASE 1 WIRING: STABILITY ENGINES
  // =========================================================================

  /**
   * Generate stability lobe diagram (SLD) using Altintas-Budak model.
   * Delegates to: ChatterStabilityLobeEngine.compute()
   *
   * This is the canonical milling stability model used industry-wide.
   * Returns: critical axial depth vs RPM curve, safe operating regions.
   */
  generateStabilityLobes(input: {
    tool: {
      diameter_mm: number;
      flute_count: number;
      overhang_mm: number;
      material: "carbide" | "hss" | "cermet";
    };
    workpiece: {
      iso_group: "P" | "M" | "K" | "N" | "S" | "H";
      kc11_mpa?: number;
    };
    machine: {
      machine_id?: string;
      natural_frequency_hz?: number;
      damping_ratio?: number;
      stiffness_n_um?: number;
      max_rpm: number;
      min_rpm?: number;
    };
    cutting: {
      radial_immersion_ratio: number;
      up_milling: boolean;
      cutting_speed_mpm?: number;
    };
    rpm_range?: [number, number];
    rpm_points?: number;
  }) {
    return chatterStabilityLobeEngine.compute(input);
  }

  // =========================================================================
  // PHASE 1 WIRING: SURFACE ENGINES
  // =========================================================================

  /**
   * Predict surface finish along toolpath with algorithm effects.
   * Delegates to: SurfaceFinishPredictorEngine.predict()
   *
   * Includes: Brammertz Ra, scallop height, waviness, algorithm corrections.
   */
  predictSurfaceFinish(input: {
    segments: Array<{
      fz: number;
      stepover_mm: number;
      cusp_angle_deg?: number;
      surface_speed_mpm?: number;
      inclination_deg?: number;
    }>;
    tool: {
      corner_radius_mm: number;
      ball_radius_mm?: number;
      edge_radius_um?: number;
      flute_count?: number;
    };
    algorithm?: string;
    target_ra_um?: number;
    material?: string;
    coolant?: string;
  }) {
    return surfaceFinishPredictorEngine.predict(input);
  }

  /**
   * Calculate optimal feed per tooth for target Ra.
   * Delegates to: SurfaceFinishPredictorEngine.optimalFeedForRa()
   */
  optimalFeedForTargetRa(target_ra_um: number, toolRadius_mm: number, edgeRadius_um: number = 5): number {
    return surfaceFinishPredictorEngine.optimalFeedForRa(target_ra_um, toolRadius_mm, edgeRadius_um);
  }

  /**
   * Analyze surface integrity (residual stress, white layer, fatigue).
   * Delegates to: SurfaceIntegrityEngine.calculate()
   *
   * Critical for aerospace/medical where surface integrity affects fatigue life.
   */
  analyzeSurfaceIntegrity(input: {
    process?: "turning" | "milling" | "grinding" | "hard_turning" | "edm" | "honing" | "polishing" | "shot_peen";
    feed_mm_rev?: number;
    tool_nose_radius_mm?: number;
    cutting_speed_m_min?: number;
    depth_of_cut_mm?: number;
    material?: "steel" | "stainless" | "titanium" | "nickel_alloy" | "aluminum";
    coolant?: "flood" | "mql" | "dry" | "cryogenic";
    tool_condition?: "sharp" | "moderate_wear" | "worn";
  }) {
    return surfaceIntegrityEngine.calculate(input);
  }

  // =========================================================================
  // ENGINE REGISTRY
  // =========================================================================

  /**
   * List all wired engines for introspection.
   */
  getWiredEngines(): string[] {
    return [
      // Core physics (from constants.ts)
      "constants.ts (kienzleForce, taylorLife, extendedTaylorLife, toolDeflection, predictedRa)",
      // Chip formation
      "ChipFormationPredictionEngine (Merchant shear angle, chip morphology)",
      // Thermal - Loewen-Shaw
      "LoewenShawHeatPartitionEngine (1954 heat partition model)",
      // Math utilities
      "AdvancedCuttingMathEngine (helix force decomposition)",
      // Force engines (Phase 1)
      "KienzleForceModelEngine (full Kienzle with corrections, milling engagement)",
      "CuttingForceEngine (multi-component with material lookup)",
      "StochasticCuttingForceEngine (Monte Carlo force uncertainty)",
      "CuttingPowerBudgetEngine (spindle/feed power analysis)",
      "SpecificCuttingEnergyEngine (energy classification)",
      // Thermal engines (Phase 1)
      "CuttingTemperatureEngine (Trigger model)",
      "ThermalWearCouplingEngine (RK4 ODE coupled analysis)",
      "StochasticThermalEngine (Monte Carlo thermal uncertainty)",
      // Deflection engines (Phase 1 continued)
      "ToolDeflectionPredictionEngine (stepped shaft, stress analysis)",
      // Stability engines (Phase 1 continued)
      "ChatterStabilityLobeEngine (Altintas-Budak SLD)",
      // Surface engines (Phase 1 continued)
      "SurfaceFinishPredictorEngine (Brammertz Ra, scallop, algorithm effects)",
      "SurfaceIntegrityEngine (residual stress, white layer, fatigue)",
    ];
  }

  /**
   * Get count of wired engines by category.
   */
  getWiringStats(): Record<string, number> {
    return {
      core_physics: 5,      // constants.ts functions
      chip_formation: 1,    // ChipFormationPredictionEngine
      thermal: 4,           // Loewen-Shaw, CuttingTemp, ThermalWear, StochasticThermal
      force: 5,             // Kienzle, CuttingForce, Stochastic, Power, Energy
      math: 1,              // AdvancedCuttingMath
      deflection: 1,        // ToolDeflectionPrediction
      stability: 1,         // ChatterStabilityLobe
      surface: 2,           // SurfaceFinishPredictor, SurfaceIntegrity
      total_engines: 16,
      total_functions: 21,
    };
  }
}

// Export singleton
export const millingPhysicsKernelEngine = new MillingPhysicsKernelEngine();
export { MillingPhysicsKernelEngine };
