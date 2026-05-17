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
  type ISOGroup,
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

// Wear/Life engines (9) — MS-WIRE-1/U-WIRE-03
import { toolWearRateEngine } from "./ToolWearRateEngine.js";
import { toolWearProgressionEngine } from "./ToolWearProgressionEngine.js";
import { advancedWearPhysicsEngine } from "./AdvancedWearPhysicsEngine.js";
import { archardAdhesiveWearEngine } from "./ArchardAdhesiveWearEngine.js";
import { stochasticToolWearEngine } from "./StochasticToolWearEngine.js";
import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
import { bayesianToolLifeEngine } from "./BayesianToolLifeEngine.js";
import { toolLifeAdaptiveEngine } from "./ToolLifeAdaptiveEngine.js";
import { advancedCuttingPhenomenaEngine } from "./AdvancedCuttingPhenomenaEngine.js";

// Stability engines (9) — MS-WIRE-1/U-WIRE-05
import { chatterPredictionEngine } from "./ChatterPredictionEngine.js";
import { regenerativeChatterPredictor } from "./RegenerativeChatterPredictor.js";
import { stochasticChatterEngine } from "./StochasticChatterEngine.js";
import { mdofStabilityEngine } from "./MDOFStabilityEngine.js";
import { stabilityRPMRewriter } from "./StabilityRPMRewriterEngine.js";
import { vibrationAnalysisEngine } from "./VibrationAnalysisEngine.js";
import { dampingOptimizationEngine } from "./DampingOptimizationEngine.js";
import { machineVibrationEngine } from "./MachineVibrationEngine.js";
import { thinFloorVibrationEngine } from "./ThinFloorVibrationEngine.js";

// Deflection engines (7) — MS-WIRE-1/U-WIRE-04
import { partDeflectionEngine } from "./PartDeflectionEngine.js";
import { boringBarDeflectionEngine } from "./BoringBarDeflectionEngine.js";
import { stochasticDeflectionEngine } from "./StochasticDeflectionEngine.js";
import { timoshenkoDeflectionEngine } from "./TimoshenkoDeflectionEngine.js";
import { toolAssemblyDeflectionEngine } from "./ToolAssemblyDeflectionEngine.js";
import { workpieceDeflectionCompensationEngine } from "./WorkpieceDeflectionCompensationEngine.js";
import { surfaceLocationErrorEngine } from "./SurfaceLocationErrorEngine.js";

// Additional force/physics engines (6) — MS-WIRE-1/U-WIRE-01 (extends existing 5)
import { cuttingMechanicsEngine } from "./CuttingMechanicsEngine.js";
import { advancedCuttingPhysicsEngine } from "./AdvancedCuttingPhysicsEngine.js";
import { advancedCuttingPhysicsExtEngine } from "./AdvancedCuttingPhysicsExtEngine.js";
import { fundamentalPhysicsCompletionEngine } from "./FundamentalPhysicsCompletionEngine.js";
import { drillBreakthroughForceEngine } from "./DrillBreakthroughForceEngine.js";
import { cutterContactEngine } from "./CutterContactEngine.js";

// Thermal engines (7 more) — MS-WIRE-1/U-WIRE-02 (extends existing 4)
import { cuttingThermalEngine } from "./CuttingThermalEngine.js";
import { thermalModelingEngine } from "./ThermalModelingEngine.js";
import { thermalExpansionEngine } from "./ThermalExpansionEngine.js";
import { lamThermalSofteningEngine } from "./LAMThermalSofteningEngine.js";
import { thermalFieldToolpathEngine } from "./ThermalFieldToolpathEngine.js";
import { thermalCompensationModelEngine } from "./ThermalCompensationModelEngine.js";
import { thermalSimEngine } from "./ThermalSimEngine.js";

// Surface engines (5 more) — MS-WIRE-1/U-WIRE-06 (extends existing 2)
import { surfaceFinishEngine } from "./SurfaceFinishEngine.js";
import { surfaceRoughnessEngine } from "./SurfaceRoughnessEngine.js";
import { stochasticSurfaceFinishEngine } from "./StochasticSurfaceFinishEngine.js";
import { surfaceIntegrityPredictorEngine } from "./SurfaceIntegrityPredictorEngine.js";
import { roughnessConversionEngine } from "./RoughnessConversionEngine.js";

// Material engines (5) — MS-WIRE-1/Material layer
import { johnsonCookEngine } from "./JohnsonCookEngine.js";
import { constitutiveModelEngine } from "./ConstitutiveModelEngine.js";
import { materialInterpolationEngine } from "./MaterialInterpolationEngine.js";
import { materialEquivalenceEngine } from "./MaterialEquivalenceEngine.js";
import { materialBatchVariabilityEngine } from "./MaterialBatchVariabilityEngine.js";

// Extended thermal (5 more)
import { thermalFatigueEngine } from "./ThermalFatigueEngine.js";
import { thermalGrowthCompensationEngine } from "./ThermalGrowthCompensationEngine.js";
import { thermalExpansionJointEngine } from "./ThermalExpansionJointEngine.js";
import { thermalSprayEngine } from "./ThermalSprayEngine.js";
import { InverseThermalCompensationEngine } from "./InverseThermalCompensationEngine.js";
const inverseThermalCompensationEngine = new InverseThermalCompensationEngine();

// Extended stability (4 more)
import { vibrationAssistedMachiningEngine } from "./VibrationAssistedMachiningEngine.js";
import { vibrationDampeningEngine } from "./VibrationDampeningEngine.js";
import { vibrationIsolationEngine } from "./VibrationIsolationEngine.js";
import { vibrationIsolatorEngine } from "./VibrationIsolatorEngine.js";

// Extended surface (3 more)
import { ContactMechanicsSurfaceEngine } from "./ContactMechanicsSurfaceEngine.js";
import { surfaceFinishDatabaseEngine } from "./SurfaceFinishDatabaseEngine.js";
import { surfaceTreatmentEngine } from "./SurfaceTreatmentEngine.js";
const contactMechanicsSurfaceEngine = new ContactMechanicsSurfaceEngine();

// Spindle engines (5) — MS-WIRE-1/Force+Power layer
import { spindlePowerCheckEngine } from "./SpindlePowerCheckEngine.js";
import { spindleTorqueCurveEngine } from "./SpindleTorqueCurveEngine.js";
import { spindleBearingLoadEngine } from "./SpindleBearingLoadEngine.js";
import { spindleRunoutEngine } from "./SpindleRunoutEngine.js";
import { forceCapabilityEngine } from "./ForceCapabilityEngine.js";

// Fixture/workholding engines (4) — MS-WIRE-1/Workholding layer (affects deflection)
import { fixtureClampingEngine } from "./FixtureClampingEngine.js";
import { fixtureDynamicsEngine } from "./FixtureDynamicsEngine.js";
import { fixturePlateEngine } from "./FixturePlateEngine.js";
import { latheWorkholdingEngine } from "./LatheWorkholdingEngine.js";

// Surface geometry engines (4 more) — MS-WIRE-1/U-WIRE-06 final
import { offsetSurfaceEngine } from "./OffsetSurfaceEngine.js";
import { parametricSurfaceEngine } from "./ParametricSurfaceEngine.js";
import { surfaceReconstructionEngine } from "./SurfaceReconstructionEngine.js";
import { surfaceIntersectionEngine } from "./SurfaceIntersectionEngine.js";

// Spindle monitoring engines (5 more) — final batch
import { spindleLoadMonitorEngine } from "./SpindleLoadMonitorEngine.js";
import { spindleSpeedVariationEngine } from "./SpindleSpeedVariationEngine.js";
import { spindleHarmonicsQualityEngine } from "./SpindleHarmonicsQualityEngine.js";
import { spindleProtectionEngine } from "./SpindleProtectionEngine.js";
import { adaptiveSpindleControlEngine } from "./AdaptiveSpindleControlEngine.js";

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
      // Get exponents from lookup if not provided. The constants helper uses
      // {a, b} naming (matching ISO 3685 Annex C); the local engine surface
      // uses {p, q} naming (matching Kalpakjian's textbook). They are the
      // same exponents — just two notations in the literature.
      let pVal = p;
      let qVal = q;
      if ((p === undefined || q === undefined) && iso_group) {
        const exponents = extendedTaylorExponents(iso_group as ISOGroup);
        pVal = p ?? exponents.a;
        qVal = q ?? exponents.b;
      }

      // Constants signature: extendedTaylorLife(V, f, d, n, C, a, b) — 7 args.
      // T = (C / (V × f^a × d^b))^(1/n). `coating` doesn't enter the formula;
      // its effect is baked into the C constant chosen upstream.
      const toolLife = extendedTaylorLife(
        Vc, f ?? 0.1, ap ?? 1.0,
        n, C, pVal ?? 0.3, qVal ?? 0.15
      );

      return {
        tool_life_min: {
          value: toolLife,
          unit: "min",
          source: "Extended Taylor: T = (C / (Vc × f^p × ap^q))^(1/n)",
        },
        model_used: "extended_taylor",
        exponents: { n, p: pVal, q: qVal },
      };
    } else {
      // Basic Taylor: T = (C/Vc)^(1/n). Coating effect baked into C upstream.
      void coating;
      const toolLife = taylorLife(C, n, Vc);

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
    // Translate the MPK abbreviated keys into the canonical
    // MillingForceInput interface that KienzleForceModelEngine expects.
    // The abbreviations (fz, ap, ae, d, z) come from the ISO 3002 / DIN 6580
    // milling-force literature; the engine's named form is more verbose
    // for API clarity. `cutting_speed_mpm` is dropped at this boundary —
    // Kienzle force does not depend on Vc (Vc only enters power).
    void input.cutting_speed_mpm;
    void input.helix_angle_deg;
    void input.rake_angle_deg;
    void input.flank_wear_mm;
    return kienzleForceModelEngine.calculateMillingForces({
      kc1_1: input.kc1_1,
      mc: input.mc,
      feed_per_tooth_mm: input.fz,
      axial_depth_mm: input.ap,
      radial_depth_mm: input.ae,
      tool_diameter_mm: input.d,
      flutes: input.z,
      milling_type: input.down_milling === false ? "up" : "down",
    });
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
  // WEAR / LIFE ENGINES — MS-WIRE-1 / U-WIRE-03 (9 engines)
  // =========================================================================

  /**
   * Tool wear rate (Taylor C/n per tool-material pairing).
   * Delegates to: ToolWearRateEngine.calculate()
   */
  calculateWearRate(input: {
    cutting_speed_mpm: number;
    feed_mm?: number;
    depth_of_cut_mm?: number;
    tool_material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
    workpiece?: "steel" | "aluminum" | "stainless" | "cast_iron" | "titanium" | "inconel";
    coating?: string;
  }) {
    return toolWearRateEngine.calculate(input as any);
  }

  /**
   * Tool wear progression — three-stage wear curve (initial → steady → accelerated).
   * Delegates to: ToolWearProgressionEngine.calculate()
   */
  calculateWearProgression(input: Parameters<typeof toolWearProgressionEngine.calculate>[0]) {
    return toolWearProgressionEngine.calculate(input);
  }

  /**
   * Advanced wear physics — Kannatey-Asibu stochastic, Fick crater, notch, flank ODE.
   * Delegates to: AdvancedWearPhysicsEngine (multiple mechanisms).
   */
  calculateAdvancedWear(mechanism: "kannateyAsibu" | "fickCrater" | "notch" | "logNormalLife" |
                                    "rabinowiczAbrasive" | "flankWearODE" | "combined",
                        input: any) {
    switch (mechanism) {
      case "kannateyAsibu": return advancedWearPhysicsEngine.kannateyAsibuStochastic(input);
      case "fickCrater":    return advancedWearPhysicsEngine.fickCraterWear(input);
      case "notch":         return advancedWearPhysicsEngine.notchWear(input);
      case "logNormalLife": return advancedWearPhysicsEngine.logNormalToolLife(input);
      case "rabinowiczAbrasive": return advancedWearPhysicsEngine.rabinowiczAbrasiveWear(input);
      case "flankWearODE":  return advancedWearPhysicsEngine.flankWearODE(input);
      case "combined":      return advancedWearPhysicsEngine.combinedWearMechanisms(input);
    }
  }

  /**
   * Archard adhesive wear model (K·F·L / H).
   * Delegates to: ArchardAdhesiveWearEngine.calculate()
   */
  calculateArchardWear(input: Parameters<typeof archardAdhesiveWearEngine.calculate>[0]) {
    return archardAdhesiveWearEngine.calculate(input);
  }

  /**
   * Stochastic tool wear with Latin Hypercube sampling + Weibull fitting.
   * Delegates to: StochasticToolWearEngine methods.
   */
  calculateStochasticWear(method: "taylor" | "extendedTaylor" | "usui" | "fosmTaylor",
                          input: any) {
    switch (method) {
      case "taylor":         return stochasticToolWearEngine.taylorLife(input.V, input.n, input.C);
      case "extendedTaylor": return stochasticToolWearEngine.extendedTaylorLife(
                                      input.V, input.f, input.d, input.n, input.C, input.a, input.b);
      case "usui":           return stochasticToolWearEngine.usuiWearRate(input.F_n, input.V, input.T, input.A, input.B);
      case "fosmTaylor":     return stochasticToolWearEngine.fosmTaylor(input);
    }
  }

  /**
   * Stochastic tool life — Weibull distribution with Monte Carlo.
   * Delegates to: StochasticToolLifeEngine.compute()
   */
  calculateStochasticToolLife(input: Parameters<typeof stochasticToolLifeEngine.compute>[0]) {
    return stochasticToolLifeEngine.compute(input);
  }

  /**
   * Bayesian tool life predictor — Gaussian Process regression that learns from observations.
   * Delegates to: BayesianToolLifeEngine.
   */
  createBayesianToolLifePredictor(config?: Parameters<typeof bayesianToolLifeEngine.createPredictor>[0]) {
    return bayesianToolLifeEngine.createPredictor(config);
  }

  /**
   * Adaptive tool life — Weibull reliability/hazard-based replacement scheduling.
   * Delegates to: ToolLifeAdaptiveEngine.
   */
  predictAdaptiveToolLife(input: Parameters<typeof toolLifeAdaptiveEngine.predict>[0]) {
    return toolLifeAdaptiveEngine.predict(input);
  }

  /**
   * Advanced cutting phenomena (BUE, chip segmentation, dead metal zone, burr, etc.).
   * Delegates to: AdvancedCuttingPhenomenaEngine.
   */
  analyzeAdvancedCuttingPhenomena(input: any) {
    const e: any = advancedCuttingPhenomenaEngine;
    // Engine exposes multiple specialized methods; caller provides routed input
    if (input?.phenomenon && typeof e[input.phenomenon] === "function") {
      return e[input.phenomenon](input);
    }
    // Fallback: return engine itself for direct method access
    return e;
  }

  // =========================================================================
  // STABILITY / CHATTER ENGINES — MS-WIRE-1 / U-WIRE-05 (9 engines)
  // =========================================================================

  /**
   * Chatter prediction with stability lobes, critical speeds, and chatter detection.
   * Delegates to: ChatterPredictionEngine.
   */
  predictChatter(method: "stabilityLobes" | "checkStability" | "detectChatter" | "criticalSpeeds" | "detectSTFT",
                 input: any) {
    switch (method) {
      case "stabilityLobes":  return chatterPredictionEngine.generateStabilityLobes(input);
      case "checkStability":  return chatterPredictionEngine.checkStability(input);
      case "detectChatter":   return chatterPredictionEngine.detectChatter(input);
      case "criticalSpeeds":  return chatterPredictionEngine.criticalSpeeds(input);
      case "detectSTFT":      return chatterPredictionEngine.detectChatterSTFT(input);
    }
  }

  /**
   * Regenerative chatter prediction (Altintas-Budak SLD + stability lobes).
   * Delegates to: RegenerativeChatterPredictor.
   */
  predictRegenerativeChatter(input: Parameters<typeof regenerativeChatterPredictor.predict>[0]) {
    return regenerativeChatterPredictor.predict(input);
  }

  /**
   * Generate stability lobes across RPM range via regenerative chatter model.
   * Delegates to: RegenerativeChatterPredictor.stabilityLobes().
   */
  generateRegenerativeLobes(
    input: Parameters<typeof regenerativeChatterPredictor.stabilityLobes>[0],
    rpmRange: [number, number],
  ) {
    return regenerativeChatterPredictor.stabilityLobes(input, rpmRange);
  }

  /**
   * Stochastic chatter with FRF uncertainty — Monte Carlo + FOSM + chance-constrained.
   * Delegates to: StochasticChatterEngine.compute().
   */
  calculateStochasticChatter(input: Parameters<typeof stochasticChatterEngine.compute>[0]) {
    return stochasticChatterEngine.compute(input);
  }

  /**
   * Multi-DOF chatter stability (eigenvalue + SDOF comparison + tap-test FRF).
   * Delegates to: MDOFStabilityEngine.
   */
  analyzeMDOFStability(method: "compute" | "eigenvalue" | "compareSDOF" | "importFRF" | "analyticalModes",
                        input: any) {
    switch (method) {
      case "compute":           return mdofStabilityEngine.compute(input);
      case "eigenvalue":        return mdofStabilityEngine.computeWithEigenvalue(input);
      case "compareSDOF":       return mdofStabilityEngine.compareSDOFvsMDOF(input);
      case "importFRF":         return mdofStabilityEngine.importFRFFromTapTest(input);
      case "analyticalModes":   return mdofStabilityEngine.analyticalToolModes(input);
    }
  }

  /**
   * Rewrite G-code RPMs to avoid chatter zones using SLD analysis.
   * Delegates to: StabilityRPMRewriterEngine.
   */
  rewriteStableRPM(gcode: string, config: Parameters<typeof stabilityRPMRewriter.rewrite>[1]) {
    return stabilityRPMRewriter.rewrite(gcode, config);
  }

  /**
   * Analyze G-code for chatter risk without rewriting.
   * Delegates to: StabilityRPMRewriterEngine.analyzeChatterRisk().
   */
  analyzeChatterRiskInGCode(gcode: string, config: Parameters<typeof stabilityRPMRewriter.analyzeChatterRisk>[1]) {
    return stabilityRPMRewriter.analyzeChatterRisk(gcode, config);
  }

  /**
   * Generate analytical SLD (stability lobe diagram).
   * Delegates to: StabilityRPMRewriterEngine.generateAnalyticalSLD().
   */
  generateAnalyticalSLD(params: Parameters<typeof stabilityRPMRewriter.generateAnalyticalSLD>[0]) {
    return stabilityRPMRewriter.generateAnalyticalSLD(params);
  }

  /**
   * Vibration analysis — SDOF/MDOF natural frequencies, forced response, modal.
   * Delegates to: VibrationAnalysisEngine.
   */
  analyzeVibration(method: "sdofNatural" | "sdofFree" | "sdofForced" | "frf" | "modal",
                   input: any) {
    switch (method) {
      case "sdofNatural":  return vibrationAnalysisEngine.sdofNaturalFrequency(input);
      case "sdofFree":     return vibrationAnalysisEngine.sdofFreeResponse(
                                    input.zeta, input.omega_n, input.x0, input.v0, input.t_span);
      case "sdofForced":   return vibrationAnalysisEngine.sdofForcedResponse(
                                    input.system, input.F0, input.omega, input.t_span);
      case "frf":          return vibrationAnalysisEngine.generateFRF(
                                    input.system, input.freq_range);
      case "modal":        return vibrationAnalysisEngine.modalAnalysis(input.M, input.K);
    }
  }

  /**
   * Damping optimization — variable helix, variable pitch, tuned mass damper comparison.
   * Delegates to: DampingOptimizationEngine.
   */
  optimizeDamping(input: Parameters<typeof dampingOptimizationEngine.optimize>[0]) {
    return dampingOptimizationEngine.optimize(input);
  }

  /**
   * Design variable-helix tool for chatter suppression.
   * Delegates to: DampingOptimizationEngine.designVariableHelixTool().
   */
  designVariableHelixTool(input: Parameters<typeof dampingOptimizationEngine.designVariableHelixTool>[0]) {
    return dampingOptimizationEngine.designVariableHelixTool(input);
  }

  /**
   * Machine vibration analysis — structural modes, base/spindle vibration.
   * Delegates to: MachineVibrationEngine.calculate().
   */
  analyzeMachineVibration(input: Parameters<typeof machineVibrationEngine.calculate>[0]) {
    return machineVibrationEngine.calculate(input);
  }

  /**
   * Thin-floor/thin-wall vibration analysis — pocket floors, wall deflection.
   * Delegates to: ThinFloorVibrationEngine.
   */
  analyzeThinFeatureVibration(
    method: "analyze" | "minThickness",
    input: any,
  ) {
    if (method === "analyze") return thinFloorVibrationEngine.analyze(input);
    return thinFloorVibrationEngine.minThickness(input.props, input.target_deflection_um);
  }

  // =========================================================================
  // DEFLECTION ENGINES — MS-WIRE-1 / U-WIRE-04 (7 engines)
  // =========================================================================

  /**
   * Part deflection under cutting force (Euler-Bernoulli beam + stress analysis).
   * Delegates to: PartDeflectionEngine.calculate().
   */
  calculatePartDeflection(input: Parameters<typeof partDeflectionEngine.calculate>[0]) {
    return partDeflectionEngine.calculate(input);
  }

  /**
   * Boring bar deflection (L/D stickout with cantilever + shank joint compliance).
   * Delegates to: BoringBarDeflectionEngine.calculate().
   */
  calculateBoringBarDeflection(input: Parameters<typeof boringBarDeflectionEngine.calculate>[0]) {
    return boringBarDeflectionEngine.calculate(input);
  }

  /**
   * Stochastic deflection with Monte Carlo + sensitivity analysis.
   * Delegates to: StochasticDeflectionEngine.analyze().
   */
  calculateStochasticDeflection(input: Parameters<typeof stochasticDeflectionEngine.analyze>[0]) {
    return stochasticDeflectionEngine.analyze(input);
  }

  /**
   * Timoshenko beam deflection (shear-corrected for short/stubby tools).
   * Delegates to: TimoshenkoDeflectionEngine.calculate().
   */
  calculateTimoshenkoDeflection(input: Parameters<typeof timoshenkoDeflectionEngine.calculate>[0]) {
    return timoshenkoDeflectionEngine.calculate(input);
  }

  /**
   * Tool assembly deflection (stacked holder + tool + extension compliance).
   * Delegates to: ToolAssemblyDeflectionEngine.compute().
   */
  calculateAssemblyDeflection(input: Parameters<typeof toolAssemblyDeflectionEngine.compute>[0]) {
    return toolAssemblyDeflectionEngine.compute(input);
  }

  /**
   * Workpiece deflection compensation (G-code path offset based on deflection).
   * Delegates to: WorkpieceDeflectionCompensationEngine.calculate().
   */
  calculateWorkpieceCompensation(...args: Parameters<typeof workpieceDeflectionCompensationEngine.calculate>) {
    return workpieceDeflectionCompensationEngine.calculate(...args);
  }

  /**
   * Surface Location Error prediction (regenerative chatter-induced error).
   * Delegates to: SurfaceLocationErrorEngine.
   */
  predictSurfaceLocationError(method: "predictSLE" | "optimizeRPM" | "combinedFinish", input: any) {
    switch (method) {
      case "predictSLE":     return surfaceLocationErrorEngine.predictSLE(input);
      case "optimizeRPM":    return surfaceLocationErrorEngine.optimizeRPMForSLE(input);
      case "combinedFinish": return surfaceLocationErrorEngine.combinedFinishPrediction(input);
    }
  }

  // =========================================================================
  // ADDITIONAL FORCE / PHYSICS ENGINES — MS-WIRE-1 / U-WIRE-01 extension (6 more)
  // =========================================================================

  /**
   * Cutting mechanics — Merchant shear angle analysis, milling forces,
   * cutting temperature, crater wear via analytical models.
   * Delegates to: CuttingMechanicsEngine.
   */
  analyzeCuttingMechanics(method: "merchant" | "millingForces" | "cuttingTemp" | "craterWear" |
                                   "materialData" | "listMaterials",
                          input?: any) {
    switch (method) {
      case "merchant":       return cuttingMechanicsEngine.merchantAnalysis(input);
      case "millingForces":  return cuttingMechanicsEngine.millingForces(
                                      input.params, input.f_z_mm, input.a_p_mm, input.a_e_mm, input.D_mm, input.z);
      case "cuttingTemp":    return cuttingMechanicsEngine.cuttingTemperature(input);
      case "craterWear":     return cuttingMechanicsEngine.craterWear(input);
      case "materialData":   return cuttingMechanicsEngine.getMaterialCuttingData(input);
      case "listMaterials":  return cuttingMechanicsEngine.listMaterials();
    }
  }

  /**
   * Advanced cutting physics — Oxley predictive, oblique cutting, size effect,
   * Recht shear instability, chip breaking, process damping.
   * Delegates to: AdvancedCuttingPhysicsEngine.
   */
  analyzeAdvancedCuttingPhysics(method: "oxley" | "oblique" | "sizeEffect" |
                                         "rechtInstability" | "chipBreaking" | "processDamping",
                                 input: any) {
    switch (method) {
      case "oxley":            return advancedCuttingPhysicsEngine.oxleyPredictive(input);
      case "oblique":          return advancedCuttingPhysicsEngine.obliqueCutting(input);
      case "sizeEffect":       return advancedCuttingPhysicsEngine.sizeEffect(input);
      case "rechtInstability": return advancedCuttingPhysicsEngine.rechtShearInstability(input);
      case "chipBreaking":     return advancedCuttingPhysicsEngine.chipBreakingCriterion(input);
      case "processDamping":   return advancedCuttingPhysicsEngine.processDamping(input);
    }
  }

  /**
   * Extended advanced cutting physics — additional specialized phenomena.
   * Delegates to: AdvancedCuttingPhysicsExtEngine.
   */
  getAdvancedCuttingPhysicsExt() {
    return advancedCuttingPhysicsExtEngine;
  }

  /**
   * Fundamental physics completion — Archard wear, Merchant shear/force circle,
   * single-grit mechanics, grinding thermal, Hertz contact.
   * Delegates to: FundamentalPhysicsCompletionEngine.
   */
  analyzeFundamentalPhysics(method: "archardWear" | "archardTool" | "merchantShear" |
                                     "merchantForce" | "singleGrit" | "grindingThermal" | "hertzContact",
                             input: any) {
    switch (method) {
      case "archardWear":     return fundamentalPhysicsCompletionEngine.archardWear(input);
      case "archardTool":     return fundamentalPhysicsCompletionEngine.archardToolWear(input);
      case "merchantShear":   return fundamentalPhysicsCompletionEngine.merchantShearAngle(input);
      case "merchantForce":   return fundamentalPhysicsCompletionEngine.merchantForceCircle(input);
      case "singleGrit":      return fundamentalPhysicsCompletionEngine.singleGritMechanics(input);
      case "grindingThermal": return fundamentalPhysicsCompletionEngine.grindingThermalModel(input);
      case "hertzContact":    return fundamentalPhysicsCompletionEngine.hertzContact(input);
    }
  }

  /**
   * Drill breakthrough force — predicts force/stress spike at drill exit.
   * Delegates to: DrillBreakthroughForceEngine.calculate().
   */
  calculateDrillBreakthroughForce(input: Parameters<typeof drillBreakthroughForceEngine.calculate>[0]) {
    return drillBreakthroughForceEngine.calculate(input);
  }

  /**
   * Cutter contact point computation (CC/CL for 5-axis toolpath).
   * Delegates to: CutterContactEngine (module-based).
   */
  getCutterContactEngine() {
    return cutterContactEngine;
  }

  // =========================================================================
  // ADDITIONAL THERMAL ENGINES — MS-WIRE-1 / U-WIRE-02 extension (7 more)
  // =========================================================================

  /**
   * Detailed cutting thermal analysis (shear plane, tool-chip interface, heat partition).
   * Delegates to: CuttingThermalEngine.
   */
  analyzeCuttingThermal(method: "shearPlane" | "toolChipInterface" | "heatPartition", input: any) {
    switch (method) {
      case "shearPlane":        return cuttingThermalEngine.shearPlaneTemperature(input);
      case "toolChipInterface": return cuttingThermalEngine.toolChipInterfaceTemp(input);
      case "heatPartition":     return cuttingThermalEngine.heatPartition(input);
    }
  }

  /**
   * Analytical thermal models (Loewen-Shaw, Trigger, thermal expansion).
   * Delegates to: ThermalModelingEngine.
   */
  analyzeThermalModel(method: "loewenShaw" | "trigger" | "expansion", input: any) {
    switch (method) {
      case "loewenShaw": return thermalModelingEngine.loewenShawTemperature(input);
      case "trigger":    return thermalModelingEngine.triggerTemperature(input);
      case "expansion":  return thermalModelingEngine.thermalExpansion(input);
    }
  }

  /**
   * Thermal expansion calculations (linear, machine tool, compensation).
   * Delegates to: ThermalExpansionEngine.
   */
  analyzeThermalExpansion(method: "linear" | "machineError" | "compensation" | "getCTE", input: any) {
    switch (method) {
      case "linear":       return thermalExpansionEngine.linearExpansion(
                                    input.originalLength, input.temperatureChange, input.material, input.CTE);
      case "machineError": return thermalExpansionEngine.machineToolThermalError(input.geometry, input.temps);
      case "compensation": return thermalExpansionEngine.thermalCompensation(
                                    input.geometry, input.temps, input.targetTemp);
      case "getCTE":       return thermalExpansionEngine.getCTE(input);
    }
  }

  /**
   * Laser-assisted machining thermal softening (preheat profile, force reduction,
   * tool life, optimal spacing, process window).
   * Delegates to: LAMThermalSofteningEngine.
   */
  analyzeLAMThermal(method: "preheat" | "forceReduction" | "toolLife" | "spacing" | "processWindow",
                    input: any) {
    switch (method) {
      case "preheat":         return lamThermalSofteningEngine.preheatProfile(input);
      case "forceReduction":  return lamThermalSofteningEngine.forceReduction(input);
      case "toolLife":        return lamThermalSofteningEngine.lamToolLife(input);
      case "spacing":         return lamThermalSofteningEngine.optimalSpacing(input);
      case "processWindow":   return lamThermalSofteningEngine.processWindow(input);
    }
  }

  /**
   * Thermal field along toolpath (grid-based time-stepped thermal sim).
   * Delegates to: ThermalFieldToolpathEngine.
   */
  analyzeThermalField(method: "initialize" | "applyHeat" | "step" | "coolZones" | "route", input: any) {
    switch (method) {
      case "initialize":  return thermalFieldToolpathEngine.initializeGrid(
                                  input.width_mm, input.height_mm, input.resolution);
      case "applyHeat":   return thermalFieldToolpathEngine.applyHeatSource(
                                  input.grid, input.x_mm, input.y_mm, input.heat_W, input.duration_s);
      case "step":        return thermalFieldToolpathEngine.stepTimeForward(
                                  input.grid, input.dt_s, input.convection_coef);
      case "coolZones":   return thermalFieldToolpathEngine.findCoolZones(input.grid, input.threshold_C);
      case "route":       return thermalFieldToolpathEngine.routeToolpath(input);
    }
  }

  /**
   * Thermal compensation model — predict error based on machine state.
   * Delegates to: ThermalCompensationModelEngine.compute().
   */
  computeThermalCompensation(input: Parameters<typeof thermalCompensationModelEngine.compute>[0]) {
    return thermalCompensationModelEngine.compute(input);
  }

  /**
   * Thermal sim — general thermal prediction (duration, temperature profile).
   * Delegates to: ThermalSimEngine.predict().
   */
  predictThermal(input: Parameters<typeof thermalSimEngine.predict>[0]) {
    return thermalSimEngine.predict(input);
  }

  // =========================================================================
  // ADDITIONAL SURFACE ENGINES — MS-WIRE-1 / U-WIRE-06 extension (5 more)
  // =========================================================================

  /**
   * General surface finish prediction (Brammertz-style Ra with machining).
   * Delegates to: SurfaceFinishEngine.predict().
   */
  predictSurfaceFinish2(input: Parameters<typeof surfaceFinishEngine.predict>[0]) {
    return surfaceFinishEngine.predict(input);
  }

  /**
   * Surface roughness calculation (Ra/Rz/Rq from machining parameters).
   * Delegates to: SurfaceRoughnessEngine.calculate().
   */
  calculateSurfaceRoughness2(input: Parameters<typeof surfaceRoughnessEngine.calculate>[0]) {
    return surfaceRoughnessEngine.calculate(input);
  }

  /**
   * Stochastic surface finish — Monte Carlo Ra with uncertainty propagation.
   * Delegates to: StochasticSurfaceFinishEngine.compute().
   */
  calculateStochasticSurfaceFinish(input: Parameters<typeof stochasticSurfaceFinishEngine.compute>[0]) {
    return stochasticSurfaceFinishEngine.compute(input);
  }

  /**
   * Surface integrity prediction — AtomicValue wrapped detailed integrity analysis.
   * Delegates to: SurfaceIntegrityPredictorEngine.compute().
   */
  predictSurfaceIntegrity(input: Parameters<typeof surfaceIntegrityPredictorEngine.compute>[0]) {
    return surfaceIntegrityPredictorEngine.compute(input);
  }

  /**
   * Surface roughness conversion (Ra ↔ Rz ↔ Rq ↔ Rp ↔ Rv).
   * Delegates to: RoughnessConversionEngine.
   */
  getRoughnessConverter() {
    return roughnessConversionEngine;
  }

  // =========================================================================
  // MATERIAL ENGINES — MS-WIRE-1 / Material layer (5 engines)
  // =========================================================================

  /**
   * Johnson-Cook flow stress model with strain, strain rate, temperature.
   * σ = [A + B·ε^n][1 + C·ln(ε̇/ε̇₀)][1 - ((T-T_ref)/(T_melt-T_ref))^m]
   * Delegates to: JohnsonCookEngine.
   */
  calculateJohnsonCookFlowStress(
    params: Parameters<typeof johnsonCookEngine.calculateFlowStress>[0],
    strain: number,
    strain_rate: number,
    temperature: number,
  ) {
    return johnsonCookEngine.calculateFlowStress(params, strain, strain_rate, temperature);
  }

  /**
   * Get Johnson-Cook parameters for a material.
   * Delegates to: JohnsonCookEngine.getParams().
   */
  getJohnsonCookParams(materialId: string) {
    return johnsonCookEngine.getParams(materialId);
  }

  /**
   * Advanced constitutive models (Zerilli-Armstrong, MTS, Voce, PTW, Paris, Norton creep).
   * Delegates to: ConstitutiveModelEngine.
   */
  applyConstitutiveModel(
    model: "zerilliArmstrong" | "mechanicalThresholdStress" | "voceHardening" |
           "prestonTonksWallace" | "parisLaw" | "nortonCreep",
    input: any,
  ) {
    switch (model) {
      case "zerilliArmstrong":         return constitutiveModelEngine.zerilliArmstrong(input);
      case "mechanicalThresholdStress": return constitutiveModelEngine.mechanicalThresholdStress(input);
      case "voceHardening":            return constitutiveModelEngine.voceHardening(input);
      case "prestonTonksWallace":      return constitutiveModelEngine.prestonTonksWallace(input);
      case "parisLaw":                 return constitutiveModelEngine.parisLaw(input);
      case "nortonCreep":              return constitutiveModelEngine.nortonCreep(input);
    }
  }

  /**
   * Material property interpolation — find similar materials, interpolate missing values.
   * Delegates to: MaterialInterpolationEngine.
   */
  interpolateMaterial(method: "findSimilar" | "interpolate" | "compare" | "list", input?: any) {
    switch (method) {
      case "findSimilar":  return materialInterpolationEngine.findSimilar(
                                  input.target, input.count, input.criteria);
      case "interpolate":  return materialInterpolationEngine.interpolateParams(
                                  input.unknownMaterial, input.knownSimilar, input.property);
      case "compare":      return materialInterpolationEngine.compareMaterials(input.matA, input.matB);
      case "list":         return materialInterpolationEngine.listMaterials();
    }
  }

  /**
   * Material equivalence — find DIN/ISO/AISI/JIS equivalents.
   * Delegates to: MaterialEquivalenceEngine.
   */
  findMaterialEquivalent(input: Parameters<typeof materialEquivalenceEngine.findEquivalent>[0]) {
    return materialEquivalenceEngine.findEquivalent(input);
  }

  /**
   * Material batch variability analysis — within-batch and batch-to-batch uncertainty.
   * Delegates to: MaterialBatchVariabilityEngine.analyze().
   */
  analyzeMaterialBatchVariability(input: Parameters<typeof materialBatchVariabilityEngine.analyze>[0]) {
    return materialBatchVariabilityEngine.analyze(input);
  }

  // =========================================================================
  // EXTENDED THERMAL (5 more) — MS-WIRE-1/U-WIRE-02 further extension
  // =========================================================================

  /** Thermal fatigue (cyclic thermal stress, Coffin-Manson). */
  calculateThermalFatigue(input: Parameters<typeof thermalFatigueEngine.calculate>[0]) {
    return thermalFatigueEngine.calculate(input);
  }

  /** Thermal growth compensation (machine warm-up compensation). */
  calculateThermalGrowthCompensation(input: Parameters<typeof thermalGrowthCompensationEngine.calculate>[0]) {
    return thermalGrowthCompensationEngine.calculate(input);
  }

  /** Thermal expansion joint sizing (gap, interference). */
  calculateThermalExpansionJoint(input: Parameters<typeof thermalExpansionJointEngine.calculate>[0]) {
    return thermalExpansionJointEngine.calculate(input);
  }

  /** Thermal spray coating (deposition, bond strength). */
  calculateThermalSpray(input: Parameters<typeof thermalSprayEngine.calculate>[0]) {
    return thermalSprayEngine.calculate(input);
  }

  /** Inverse thermal compensation (infer heat source from measured error). */
  calculateInverseThermal(input: Parameters<typeof inverseThermalCompensationEngine.calculate>[0]) {
    return inverseThermalCompensationEngine.calculate(input);
  }

  // =========================================================================
  // EXTENDED STABILITY (4 more) — MS-WIRE-1/U-WIRE-05 further extension
  // =========================================================================

  /** Vibration-assisted machining (UVAM ultrasonic-assisted). */
  calculateVAM(input: Parameters<typeof vibrationAssistedMachiningEngine.calculate>[0]) {
    return vibrationAssistedMachiningEngine.calculate(input);
  }

  /** Vibration dampening system design. */
  calculateVibrationDampening(input: Parameters<typeof vibrationDampeningEngine.calculate>[0]) {
    return vibrationDampeningEngine.calculate(input);
  }

  /** Vibration isolation (passive/active). */
  calculateVibrationIsolation(input: Parameters<typeof vibrationIsolationEngine.calculate>[0]) {
    return vibrationIsolationEngine.calculate(input);
  }

  /** Vibration isolator (rubber/spring/air mount sizing). */
  calculateVibrationIsolator(input: Parameters<typeof vibrationIsolatorEngine.calculate>[0]) {
    return vibrationIsolatorEngine.calculate(input);
  }

  // =========================================================================
  // EXTENDED SURFACE (3 more) — MS-WIRE-1/U-WIRE-06 further extension
  // =========================================================================

  /** Contact mechanics for surface (asperity deformation, real contact area). */
  calculateContactMechanicsSurface(input: Parameters<typeof contactMechanicsSurfaceEngine.calculate>[0]) {
    return contactMechanicsSurfaceEngine.calculate(input);
  }

  /** Surface finish database lookup (empirical data by process/material). */
  getSurfaceFinishDatabase() {
    return surfaceFinishDatabaseEngine;
  }

  /** Surface treatment effects (shot peen, nitriding, coating). */
  calculateSurfaceTreatment(input: Parameters<typeof surfaceTreatmentEngine.calculate>[0]) {
    return surfaceTreatmentEngine.calculate(input);
  }

  // =========================================================================
  // SPINDLE / POWER ENGINES (5) — MS-WIRE-1/Power layer
  // =========================================================================

  /** Spindle power check — validates required power vs machine capability. */
  getSpindlePowerCheck() {
    return spindlePowerCheckEngine;
  }

  /** Spindle torque curve — computes available torque at RPM from motor profile. */
  calculateSpindleTorqueCurve(input: Parameters<typeof spindleTorqueCurveEngine.calculate>[0]) {
    return spindleTorqueCurveEngine.calculate(input);
  }

  /** Spindle bearing load — calculates radial/axial bearing loads from cutting. */
  calculateSpindleBearingLoad(input: Parameters<typeof spindleBearingLoadEngine.calculate>[0]) {
    return spindleBearingLoadEngine.calculate(input);
  }

  /** Spindle runout — predicts TIR error at tool tip from spindle/holder/tool. */
  calculateSpindleRunout(input: Parameters<typeof spindleRunoutEngine.calculate>[0]) {
    return spindleRunoutEngine.calculate(input);
  }

  /** Force capability — checks if machine can handle required cutting force. */
  getForceCapability() {
    return forceCapabilityEngine;
  }

  // =========================================================================
  // FIXTURE / WORKHOLDING ENGINES (4) — MS-WIRE-1/Workholding layer
  // Affects workpiece deflection and stability during cutting.
  // =========================================================================

  /** Fixture clamping force — required clamp force for cutting force resistance. */
  calculateFixtureClamping(input: Parameters<typeof fixtureClampingEngine.compute>[0]) {
    return fixtureClampingEngine.compute(input);
  }

  /** Fixture dynamics — natural frequency, modal analysis of fixture. */
  calculateFixtureDynamics(input: Parameters<typeof fixtureDynamicsEngine.calculate>[0]) {
    return fixtureDynamicsEngine.calculate(input);
  }

  /** Fixture plate deflection — plate flex under clamp + cut force. */
  calculateFixturePlate(input: Parameters<typeof fixturePlateEngine.calculate>[0]) {
    return fixturePlateEngine.calculate(input);
  }

  /** Lathe workholding (chuck, collet, steady rest). */
  getLatheWorkholding() {
    return latheWorkholdingEngine;
  }

  // =========================================================================
  // SURFACE GEOMETRY ENGINES (4) — MS-WIRE-1/U-WIRE-06 final
  // =========================================================================

  /** Offset surface — compute constant-distance offset surface (toolpath). */
  getOffsetSurface() { return offsetSurfaceEngine; }

  /** Parametric surface — NURBS/Bezier surface evaluation, derivatives. */
  getParametricSurface() { return parametricSurfaceEngine; }

  /** Surface reconstruction from point cloud (scan → NURBS fit). */
  getSurfaceReconstruction() { return surfaceReconstructionEngine; }

  /** Surface intersection — find curves of intersection between surfaces. */
  getSurfaceIntersection() { return surfaceIntersectionEngine; }

  // =========================================================================
  // SPINDLE MONITORING ENGINES (5) — final batch
  // =========================================================================

  /** Spindle load monitor — real-time load tracking, anomaly detection. */
  getSpindleLoadMonitor() { return spindleLoadMonitorEngine; }

  /** Spindle speed variation — SSV chatter-suppression scheduling. */
  getSpindleSpeedVariation() { return spindleSpeedVariationEngine; }

  /** Spindle harmonics quality — vibration harmonic analysis for health. */
  getSpindleHarmonicsQuality() { return spindleHarmonicsQualityEngine; }

  /** Spindle protection — overload/thermal/vibration protection logic. */
  getSpindleProtection() { return spindleProtectionEngine; }

  /** Adaptive spindle control — real-time RPM/feed adjustment from sensors. */
  getAdaptiveSpindleControl() { return adaptiveSpindleControlEngine; }

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
      // Wear/Life engines (MS-WIRE-1/U-WIRE-03)
      "ToolWearRateEngine (Taylor C/n per tool-material pairing)",
      "ToolWearProgressionEngine (three-stage wear curve)",
      "AdvancedWearPhysicsEngine (Kannatey-Asibu, Fick crater, flank ODE, Rabinowicz)",
      "ArchardAdhesiveWearEngine (K·F·L / H adhesive wear model)",
      "StochasticToolWearEngine (LHS + Weibull fitting, FOSM Taylor)",
      "StochasticToolLifeEngine (Weibull Monte Carlo)",
      "BayesianToolLifeEngine (Gaussian Process regression)",
      "ToolLifeAdaptiveEngine (Weibull reliability/hazard replacement)",
      "AdvancedCuttingPhenomenaEngine (BUE, chip segmentation, burr formation)",
      // Stability engines (MS-WIRE-1/U-WIRE-05)
      "ChatterPredictionEngine (stability lobes, detection, critical speeds, STFT)",
      "RegenerativeChatterPredictor (Altintas-Budak regenerative SLD)",
      "StochasticChatterEngine (Monte Carlo FRF uncertainty, FOSM, chance-constrained)",
      "MDOFStabilityEngine (multi-DOF eigenvalue stability, tap-test FRF)",
      "StabilityRPMRewriterEngine (G-code RPM rewriting via SLD analysis)",
      "VibrationAnalysisEngine (SDOF/MDOF natural freq, forced response, modal)",
      "DampingOptimizationEngine (variable helix/pitch, tuned mass damper)",
      "MachineVibrationEngine (structural modes, base/spindle vibration)",
      "ThinFloorVibrationEngine (thin-floor/thin-wall vibration)",
      // Deflection engines (MS-WIRE-1/U-WIRE-04)
      "PartDeflectionEngine (Euler-Bernoulli beam + stress analysis)",
      "BoringBarDeflectionEngine (L/D cantilever + shank joint compliance)",
      "StochasticDeflectionEngine (Monte Carlo + sensitivity analysis)",
      "TimoshenkoDeflectionEngine (shear-corrected beam for short tools)",
      "ToolAssemblyDeflectionEngine (stacked holder + tool + extension)",
      "WorkpieceDeflectionCompensationEngine (G-code path offset)",
      "SurfaceLocationErrorEngine (regenerative chatter-induced surface error)",
      // Additional force/physics engines (MS-WIRE-1/U-WIRE-01 extension)
      "CuttingMechanicsEngine (Merchant analysis, milling forces, cutting temp)",
      "AdvancedCuttingPhysicsEngine (Oxley, oblique, size effect, Recht instability)",
      "AdvancedCuttingPhysicsExtEngine (extended specialized phenomena)",
      "FundamentalPhysicsCompletionEngine (Archard, Merchant, Hertz, grinding)",
      "DrillBreakthroughForceEngine (exit force/stress spike prediction)",
      "CutterContactEngine (CC/CL 5-axis toolpath geometry)",
      // Thermal engines (MS-WIRE-1/U-WIRE-02 extension)
      "CuttingThermalEngine (shear plane, tool-chip interface, heat partition)",
      "ThermalModelingEngine (Loewen-Shaw, Trigger, thermal expansion)",
      "ThermalExpansionEngine (linear, machine tool error, compensation)",
      "LAMThermalSofteningEngine (laser-assisted preheat, force reduction, process window)",
      "ThermalFieldToolpathEngine (grid-based time-stepped thermal sim)",
      "ThermalCompensationModelEngine (machine-state-based error prediction)",
      "ThermalSimEngine (general thermal prediction)",
      // Surface engines (MS-WIRE-1/U-WIRE-06 extension)
      "SurfaceFinishEngine (general Brammertz Ra prediction)",
      "SurfaceRoughnessEngine (Ra/Rz/Rq from params)",
      "StochasticSurfaceFinishEngine (Monte Carlo Ra with uncertainty)",
      "SurfaceIntegrityPredictorEngine (AtomicValue wrapped integrity)",
      "RoughnessConversionEngine (Ra/Rz/Rq/Rp/Rv conversions)",
      // Material engines (MS-WIRE-1/Material layer)
      "JohnsonCookEngine (σ = [A+Bε^n][1+C·ln(ε̇/ε̇₀)][1-T*^m])",
      "ConstitutiveModelEngine (Zerilli-Armstrong, MTS, Voce, PTW, Paris, Norton)",
      "MaterialInterpolationEngine (find similar, interpolate, compare)",
      "MaterialEquivalenceEngine (DIN/ISO/AISI/JIS equivalents)",
      "MaterialBatchVariabilityEngine (within/between batch uncertainty)",
      // Extended thermal (5 more)
      "ThermalFatigueEngine (cyclic thermal stress, Coffin-Manson)",
      "ThermalGrowthCompensationEngine (machine warm-up compensation)",
      "ThermalExpansionJointEngine (gap/interference sizing)",
      "ThermalSprayEngine (coating deposition, bond strength)",
      "InverseThermalCompensationEngine (infer heat source from error)",
      // Extended stability (4 more)
      "VibrationAssistedMachiningEngine (UVAM ultrasonic-assisted)",
      "VibrationDampeningEngine (damping system design)",
      "VibrationIsolationEngine (passive/active isolation)",
      "VibrationIsolatorEngine (rubber/spring/air mount sizing)",
      // Extended surface (3 more)
      "ContactMechanicsSurfaceEngine (asperity deformation, real contact area)",
      "SurfaceFinishDatabaseEngine (empirical finish data)",
      "SurfaceTreatmentEngine (shot peen, nitriding, coating)",
      // Spindle/power engines (MS-WIRE-1/Power layer)
      "SpindlePowerCheckEngine (power vs capability validator)",
      "SpindleTorqueCurveEngine (available torque at RPM from motor profile)",
      "SpindleBearingLoadEngine (radial/axial bearing load)",
      "SpindleRunoutEngine (TIR at tool tip from spindle/holder/tool)",
      "ForceCapabilityEngine (machine force-handling check)",
      // Fixture/workholding engines (MS-WIRE-1/Workholding layer)
      "FixtureClampingEngine (clamp force sizing for cutting resistance)",
      "FixtureDynamicsEngine (natural frequency, modal)",
      "FixturePlateEngine (plate flex under clamp + cut force)",
      "LatheWorkholdingEngine (chuck, collet, steady rest)",
      // Surface geometry engines
      "OffsetSurfaceEngine (constant-distance offset surface for toolpath)",
      "ParametricSurfaceEngine (NURBS/Bezier surface evaluation)",
      "SurfaceReconstructionEngine (point cloud → NURBS fit)",
      "SurfaceIntersectionEngine (curves of intersection between surfaces)",
      // Spindle monitoring engines
      "SpindleLoadMonitorEngine (real-time load tracking)",
      "SpindleSpeedVariationEngine (SSV chatter suppression)",
      "SpindleHarmonicsQualityEngine (vibration harmonic health)",
      "SpindleProtectionEngine (overload/thermal/vibration)",
      "AdaptiveSpindleControlEngine (real-time RPM/feed adjustment)",
    ];
  }

  /**
   * Get count of wired engines by category.
   */
  getWiringStats(): Record<string, number> {
    return {
      core_physics: 5,      // constants.ts functions
      chip_formation: 1,    // ChipFormationPredictionEngine
      thermal: 16,          // 11 + 5 more (ThermalFatigue, ThermalGrowth, ThermalExpansionJoint,
                            //  ThermalSpray, InverseThermal)
      force: 11,            // Kienzle, CuttingForce, Stochastic, Power, Energy + 6 new
                            // (Mechanics, AdvancedPhysics, AdvancedExt, Fundamental, Drill, CutterContact)
      math: 1,              // AdvancedCuttingMath
      deflection: 8,        // ToolDeflectionPrediction + 7 new (Part, BoringBar, Stochastic,
                            // Timoshenko, ToolAssembly, WorkpieceCompensation, SurfaceLocationError)
      stability: 14,        // 10 + 4 more (VAM, VibrationDampening, VibrationIsolation, VibrationIsolator)
      surface: 14,          // 10 + 4 more (OffsetSurface, ParametricSurface, SurfaceReconstruction, SurfaceIntersection)
      wear_life: 9,         // WearRate, Progression, AdvancedWear, Archard, StochasticWear,
                            // StochasticLife, Bayesian, Adaptive, AdvancedPhenomena
      material: 5,          // JohnsonCook, Constitutive, Interpolation, Equivalence, BatchVariability
      spindle_power: 10,    // 5 + 5 more (LoadMonitor, SpeedVariation, Harmonics, Protection, AdaptiveControl)
      workholding: 4,       // FixtureClamping, FixtureDynamics, FixturePlate, LatheWorkholding
      total_engines: 94,
      total_functions: 104,
    };
  }
}

// Export singleton
export const millingPhysicsKernelEngine = new MillingPhysicsKernelEngine();
export { MillingPhysicsKernelEngine };
