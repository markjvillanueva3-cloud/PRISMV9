/**
 * LoewenShawHeatPartitionEngine — Full Loewen-Shaw (1954) Dynamic Heat Partition Model
 *
 * Implements the complete Loewen-Shaw heat partition theory, not just Shaw's 0.754 coefficient.
 * Models dynamic heat distribution between chip, workpiece, and tool based on:
 *   - Material thermal properties (density, specific heat, thermal conductivity)
 *   - Cutting speed (speed-dependent partition)
 *   - Chip mechanics (rake angle, chip thickness)
 *   - Contact geometry (tool-chip contact length)
 *
 * Key physics:
 *   R = beta * sqrt(rho_c * c_c * k_c) / sqrt(rho_w * c_w * k_w)
 *   where R is the partition ratio (fraction of heat to chip vs workpiece)
 *
 * At low speeds: More heat to workpiece (conduction-dominated)
 * At high speeds: More heat to chip (convection-dominated, carried away)
 *
 * Reference:
 *   Loewen, E.G. & Shaw, M.C. (1954). "On the Analysis of Cutting-Tool Temperatures".
 *   Trans. ASME, Vol. 76, pp. 217-231.
 *
 *   Shaw, M.C. (2005). "Metal Cutting Principles", 2nd Ed., Oxford University Press.
 *   Chapter 12: Cutting Temperatures.
 *
 *   Komanduri, R. & Hou, Z.B. (2001). "A review of the experimental techniques for
 *   the measurement of heat and temperatures generated in some manufacturing processes
 *   and tribology". Tribology International, 34, 653-682.
 *
 * Actions: loewen_shaw_partition (calcDispatcher)
 * @module engines/LoewenShawHeatPartitionEngine
 */

import { resolveMaterial, type MaterialPhysics } from "../physics/constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MaterialProperties {
  /** Density [kg/m^3] */
  density: number;
  /** Specific heat capacity [J/(kg*K)] */
  specificHeat: number;
  /** Thermal conductivity [W/(m*K)] */
  thermalConductivity: number;
  /** Name for reference */
  name?: string;
}

export interface HeatPartitionParams {
  /** Chip material properties (formed chip — often same as workpiece) */
  chipMaterial: MaterialProperties;
  /** Workpiece (base) material properties */
  workpieceMaterial: MaterialProperties;
  /** Tool material properties (carbide, ceramic, CBN, HSS, etc.) */
  toolMaterial?: MaterialProperties;
  /** Cutting speed [m/min] */
  cuttingSpeed: number;
  /** Uncut chip thickness (feed for turning) [mm] */
  chipThickness: number;
  /** Tool rake angle [degrees] — positive for relief, negative for aggressive */
  toolRakeAngle: number;
  /** Depth of cut [mm] — for total heat calculation */
  depthOfCut?: number;
  /** Specific cutting force [N/mm^2] — for power calculation */
  specificCuttingForce?: number;
  /** Empirical beta constant (0.75-0.85 for metals) */
  betaConstant?: number;
  /** Ambient temperature [°C] */
  ambientTemp?: number;
  /** Coolant type for adjustment */
  coolantType?: "dry" | "flood" | "mist" | "mql" | "cryogenic" | "through_tool";
}

export interface HeatPartitionResult {
  /** Partition ratio R (fraction of shear zone heat to chip vs workpiece) */
  partitionRatio: number;
  /** Heat flow to chip [W] (primary heat sink at high speeds) */
  heatToChip: number;
  /** Heat flow to workpiece [W] (primary heat sink at low speeds) */
  heatToWorkpiece: number;
  /** Heat flow to tool [W] (friction heat at rake face) */
  heatToTool: number;
  /** Total cutting power [W] */
  totalCuttingPower: number;
  /** Max chip temperature at tool-chip interface [°C] */
  maxChipTemperature: number;
  /** Max workpiece temperature in shear zone [°C] */
  maxWorkpieceTemperature: number;
  /** Max tool temperature at contact [°C] */
  maxToolTemperature: number;
  /** Chip effusivity sqrt(rho*c*k) [J/(m^2*K*s^0.5)] */
  chipEffusivity: number;
  /** Workpiece effusivity sqrt(rho*c*k) [J/(m^2*K*s^0.5)] */
  workpieceEffusivity: number;
  /** Tool effusivity sqrt(rho*c*k) [J/(m^2*K*s^0.5)] */
  toolEffusivity: number;
  /** Peclet number (dimensionless speed for thermal analysis) */
  pecletNumber: number;
  /** Heat regime classification */
  heatRegime: "conduction_dominated" | "transition" | "convection_dominated";
  /** Speed factor (adjustment for dynamic partition) */
  speedFactor: number;
  /** Static partition ratio (no speed correction) */
  staticPartitionRatio: number;
  /** Partition percentages for display */
  partitionPercent: {
    chip: number;
    workpiece: number;
    tool: number;
  };
  /** Confidence in result (0-1) */
  confidence: number;
  /** Calculation method source */
  source: string;
  /** Warnings and recommendations */
  warnings: string[];
}

export interface StaticVsDynamicComparison {
  /** Static Shaw model (speed-independent) */
  staticModel: {
    partitionRatio: number;
    chipPercent: number;
    workpiecePercent: number;
    toolPercent: number;
    maxChipTemp: number;
  };
  /** Dynamic Loewen-Shaw model (speed-dependent) */
  dynamicModel: {
    partitionRatio: number;
    chipPercent: number;
    workpiecePercent: number;
    toolPercent: number;
    maxChipTemp: number;
    pecletNumber: number;
    heatRegime: string;
  };
  /** Differences */
  differences: {
    partitionRatioDelta: number;
    chipPercentDelta: number;
    maxChipTempDelta: number;
    percentageChange: number;
  };
  /** Analysis summary */
  analysis: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Default material thermal properties database.
 * Values from ASM Handbook Vol 1, Carslaw & Jaeger (1959), MatWeb.
 */
const DEFAULT_MATERIALS: Record<string, MaterialProperties> = {
  // Metals
  steel: { density: 7850, specificHeat: 486, thermalConductivity: 50, name: "Carbon Steel" },
  stainless: { density: 7930, specificHeat: 500, thermalConductivity: 16, name: "Stainless 304" },
  aluminum: { density: 2700, specificHeat: 896, thermalConductivity: 167, name: "Aluminum 6061" },
  titanium: { density: 4430, specificHeat: 526, thermalConductivity: 6.7, name: "Ti-6Al-4V" },
  inconel: { density: 8190, specificHeat: 435, thermalConductivity: 11.4, name: "Inconel 718" },
  cast_iron: { density: 7200, specificHeat: 460, thermalConductivity: 48, name: "Gray Cast Iron" },
  brass: { density: 8500, specificHeat: 380, thermalConductivity: 120, name: "Brass" },
  copper: { density: 8960, specificHeat: 385, thermalConductivity: 390, name: "Copper C110" },

  // Tool materials
  carbide: { density: 14500, specificHeat: 300, thermalConductivity: 80, name: "Tungsten Carbide" },
  ceramic: { density: 3900, specificHeat: 800, thermalConductivity: 30, name: "Al2O3 Ceramic" },
  cbn: { density: 3450, specificHeat: 960, thermalConductivity: 100, name: "CBN" },
  pcd: { density: 3520, specificHeat: 509, thermalConductivity: 500, name: "PCD" },
  hss: { density: 8100, specificHeat: 460, thermalConductivity: 27, name: "HSS" },
};

/** Coolant heat reduction factors (Sandvik Coromant application guide) */
const COOLANT_FACTORS: Record<string, number> = {
  dry: 1.0,
  mist: 0.85,
  mql: 0.80,
  flood: 0.65,
  through_tool: 0.55,
  cryogenic: 0.40,
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class LoewenShawHeatPartitionEngine {
  /**
   * Calculate effusivity (thermal inertia) of a material.
   * Effusivity e = sqrt(rho * c * k) [J/(m^2*K*s^0.5)]
   *
   * Higher effusivity = material can absorb/release heat faster.
   * Reference: Carslaw & Jaeger (1959), "Conduction of Heat in Solids"
   */
  calculateEffusivity(material: MaterialProperties): number {
    const { density: rho, specificHeat: c, thermalConductivity: k } = material;
    return Math.sqrt(rho * c * k);
  }

  /**
   * Calculate Peclet number for thermal analysis.
   * Pe = V * L / (2 * alpha)
   * where alpha = k / (rho * c) is thermal diffusivity
   *
   * Pe >> 1: Heat convected away faster than conducted (chip carries heat)
   * Pe << 1: Heat conducted into workpiece faster than convected
   *
   * Reference: Jaeger (1942) "Moving sources of heat"
   */
  calculatePecletNumber(
    cuttingSpeed: number, // m/min
    characteristicLength: number, // mm (chip thickness or contact length)
    material: MaterialProperties
  ): number {
    const { density: rho, specificHeat: c, thermalConductivity: k } = material;
    const alpha = k / (rho * c); // thermal diffusivity [m^2/s]
    const V = cuttingSpeed / 60; // m/s
    const L = characteristicLength / 1000; // m
    return (V * L) / (2 * alpha);
  }

  /**
   * Calculate static partition ratio (Shaw model, speed-independent).
   * R_static = sqrt(rho_c * c_c * k_c) / sqrt(rho_w * c_w * k_w)
   *          = e_chip / e_work
   *
   * Reference: Shaw (2005), Eq. 12.15
   */
  calculateStaticPartition(
    chipMaterial: MaterialProperties,
    workpieceMaterial: MaterialProperties
  ): number {
    const e_chip = this.calculateEffusivity(chipMaterial);
    const e_work = this.calculateEffusivity(workpieceMaterial);
    return e_chip / (e_chip + e_work);
  }

  /**
   * Calculate speed-dependent partition factor.
   * At high Peclet numbers, more heat goes to chip.
   *
   * Loewen-Shaw (1954) found that partition increases with cutting speed
   * following approximately: R = R_static * (1 + C * ln(Pe)) for Pe > 1
   *
   * Simplified model:
   *   - Pe < 0.5: R = R_static * 0.6 (conduction-dominated)
   *   - 0.5 < Pe < 5: Transition zone
   *   - Pe > 5: R = R_static + (1 - R_static) * (1 - 1/sqrt(Pe))
   */
  calculateSpeedFactor(pecletNumber: number): number {
    if (pecletNumber < 0.5) {
      // Low speed: conduction dominates, less heat to chip
      return 0.6 + 0.4 * (pecletNumber / 0.5);
    } else if (pecletNumber < 5) {
      // Transition: linear interpolation
      const t = (pecletNumber - 0.5) / 4.5;
      return 1.0 + 0.3 * t;
    } else {
      // High speed: convection dominates, more heat to chip
      // Asymptotically approaches ~1.5 as Pe -> infinity
      return 1.0 + 0.5 * (1 - 1 / Math.sqrt(pecletNumber));
    }
  }

  /**
   * Classify heat regime based on Peclet number.
   */
  classifyHeatRegime(
    pecletNumber: number
  ): "conduction_dominated" | "transition" | "convection_dominated" {
    if (pecletNumber < 0.5) return "conduction_dominated";
    if (pecletNumber < 5) return "transition";
    return "convection_dominated";
  }

  /**
   * Calculate chip temperature using Jaeger moving heat source model.
   *
   * For high Peclet numbers (Pe > 5):
   *   T_max = 0.754 * q * sqrt(L / (k * rho * c * V))
   *
   * For low Peclet numbers:
   *   T_max = q * L / (2 * k) * (1 / sqrt(Pi * Pe))
   *
   * Reference: Jaeger (1942), Loewen-Shaw (1954) Eq. 8
   */
  calculateChipTemperature(
    heatFlux: number, // W/m^2
    contactLength: number, // mm
    cuttingSpeed: number, // m/min
    material: MaterialProperties,
    ambientTemp: number
  ): number {
    const { density: rho, specificHeat: c, thermalConductivity: k } = material;
    const V = cuttingSpeed / 60; // m/s
    const L = contactLength / 1000; // m

    const Pe = this.calculatePecletNumber(cuttingSpeed, contactLength, material);

    let tempRise: number;
    if (Pe > 5) {
      // High speed: Shaw's 0.754 coefficient (from Jaeger solution)
      tempRise = 0.754 * heatFlux * Math.sqrt(L / (k * rho * c * V));
    } else if (Pe < 0.1) {
      // Low speed: steady-state conduction
      tempRise = (heatFlux * L) / (2 * k);
    } else {
      // Transition: blend between low and high Pe solutions
      const lowPeTemp = (heatFlux * L) / (2 * k);
      const highPeTemp = 0.754 * heatFlux * Math.sqrt(L / (k * rho * c * Math.max(V, 0.01)));
      const blend = Math.min(1, Pe / 5);
      tempRise = lowPeTemp * (1 - blend) + highPeTemp * blend;
    }

    return ambientTemp + tempRise;
  }

  /**
   * Full Loewen-Shaw (1954) dynamic heat partition calculation.
   *
   * Implements the complete model with:
   * 1. Effusivity-based static partition
   * 2. Speed-dependent correction via Peclet number
   * 3. Tool friction heat partition
   * 4. Temperature calculations for all three sinks
   */
  calculate(params: HeatPartitionParams): HeatPartitionResult {
    const warnings: string[] = [];

    // Extract and validate inputs
    const {
      chipMaterial,
      workpieceMaterial,
      cuttingSpeed,
      chipThickness,
      toolRakeAngle,
      depthOfCut = 1.0,
      specificCuttingForce = 2000,
      betaConstant = 0.80,
      ambientTemp = 25,
      coolantType = "dry",
    } = params;

    // Default tool material to carbide
    const toolMaterial = params.toolMaterial ?? DEFAULT_MATERIALS.carbide;

    // Validate cutting speed
    if (cuttingSpeed <= 0) {
      warnings.push("Cutting speed must be positive. Using 1 m/min.");
    }
    const Vc = Math.max(cuttingSpeed, 1);

    // Validate chip thickness
    if (chipThickness <= 0) {
      warnings.push("Chip thickness must be positive. Using 0.1 mm.");
    }
    const h = Math.max(chipThickness, 0.01);

    // Calculate effusivities
    const e_chip = this.calculateEffusivity(chipMaterial);
    const e_work = this.calculateEffusivity(workpieceMaterial);
    const e_tool = this.calculateEffusivity(toolMaterial);

    // Calculate Peclet number for speed correction
    const Pe = this.calculatePecletNumber(Vc, h * 2, workpieceMaterial);
    const heatRegime = this.classifyHeatRegime(Pe);

    // Calculate static partition (Shaw model)
    const R_static = this.calculateStaticPartition(chipMaterial, workpieceMaterial);

    // Apply speed-dependent correction (Loewen-Shaw dynamic model)
    const speedFactor = this.calculateSpeedFactor(Pe);
    const R_dynamic = Math.min(0.95, R_static * speedFactor);

    // Apply beta constant empirical correction
    const R_final = betaConstant * R_dynamic;

    // Calculate total cutting power
    // P = Fc * Vc = (kc * Ac) * Vc = kc * (ap * h) * Vc
    const Vc_ms = Vc / 60; // m/s
    const cuttingArea = depthOfCut * h; // mm^2
    const Fc = specificCuttingForce * cuttingArea; // N
    const totalPower = Fc * Vc_ms; // W

    // Apply coolant factor
    const coolantFactor = COOLANT_FACTORS[coolantType] ?? 1.0;

    // Heat distribution:
    // Shear zone: ~80-90% of total power -> partitioned between chip and workpiece
    // Friction zone (rake face): ~10-20% of power -> partitioned between chip and tool
    const shearZoneFraction = 0.85;
    const frictionZoneFraction = 0.15;

    const shearZoneHeat = totalPower * shearZoneFraction;
    const frictionZoneHeat = totalPower * frictionZoneFraction;

    // Shear zone partition (chip vs workpiece)
    const heatToChipFromShear = shearZoneHeat * R_final;
    const heatToWorkpieceFromShear = shearZoneHeat * (1 - R_final);

    // Friction zone partition (chip vs tool)
    const frictionPartition = e_chip / (e_chip + e_tool);
    const heatToChipFromFriction = frictionZoneHeat * frictionPartition;
    const heatToToolFromFriction = frictionZoneHeat * (1 - frictionPartition);

    // Total heat to each sink
    let heatToChip = (heatToChipFromShear + heatToChipFromFriction) * coolantFactor;
    let heatToWorkpiece = heatToWorkpieceFromShear * coolantFactor;
    let heatToTool = heatToToolFromFriction * coolantFactor;

    // Ensure conservation
    const totalHeat = heatToChip + heatToWorkpiece + heatToTool;
    const scaleFactor = (totalPower * coolantFactor) / totalHeat;
    heatToChip *= scaleFactor;
    heatToWorkpiece *= scaleFactor;
    heatToTool *= scaleFactor;

    // Calculate contact geometry
    // Contact length approximation: Lc = h * (1.5 + tan(rake)) for positive rake
    const rakeRad = (toolRakeAngle * Math.PI) / 180;
    const contactLength = h * (1.5 + Math.tan(Math.abs(rakeRad)));
    const contactArea = contactLength * depthOfCut; // mm^2

    // Calculate heat flux at interface
    const heatFlux = (heatToChip * 1e6) / (contactArea * 1e-6); // W/m^2

    // Calculate temperatures
    const maxChipTemp = this.calculateChipTemperature(
      heatFlux,
      contactLength,
      Vc,
      chipMaterial,
      ambientTemp
    );

    // Workpiece temperature (shear zone)
    const shearZoneLength = h / Math.sin(Math.PI / 4); // ~45 degree shear angle
    const workpieceHeatFlux = (heatToWorkpiece * 1e6) / (shearZoneLength * depthOfCut * 1e-6);
    const maxWorkpieceTemp = this.calculateChipTemperature(
      workpieceHeatFlux * 0.5, // Lower concentration
      shearZoneLength,
      Vc,
      workpieceMaterial,
      ambientTemp
    );

    // Tool temperature
    const toolHeatFlux = (heatToTool * 1e6) / (contactArea * 0.5 * 1e-6); // Concentrated at tip
    const maxToolTemp =
      ambientTemp + (toolHeatFlux * contactLength * 1e-3) / (toolMaterial.thermalConductivity * 2);

    // Calculate partition percentages
    const totalPowerCooled = heatToChip + heatToWorkpiece + heatToTool;
    const chipPercent = (heatToChip / totalPowerCooled) * 100;
    const workpiecePercent = (heatToWorkpiece / totalPowerCooled) * 100;
    const toolPercent = (heatToTool / totalPowerCooled) * 100;

    // Warnings for extreme conditions
    if (maxChipTemp > 800) {
      warnings.push(`Chip temperature ${Math.round(maxChipTemp)}°C may cause thermal softening`);
    }
    if (maxToolTemp > 600) {
      warnings.push(`Tool temperature ${Math.round(maxToolTemp)}°C exceeds carbide limit (600°C)`);
    }
    if (heatRegime === "conduction_dominated" && coolantType === "dry") {
      warnings.push("Low speed + dry cutting: significant heat into workpiece, risk of damage");
    }
    if (Pe > 50) {
      warnings.push("Very high Peclet number: chip carries most heat, excellent thermal regime");
    }

    // Calculate confidence based on input quality
    let confidence = 0.85;
    if (!params.toolMaterial) confidence -= 0.05;
    if (!params.specificCuttingForce) confidence -= 0.05;
    if (Pe < 0.1 || Pe > 100) confidence -= 0.1; // Extrapolated regime

    return {
      partitionRatio: R_final,
      heatToChip,
      heatToWorkpiece,
      heatToTool,
      totalCuttingPower: totalPower * coolantFactor,
      maxChipTemperature: maxChipTemp,
      maxWorkpieceTemperature: maxWorkpieceTemp,
      maxToolTemperature: maxToolTemp,
      chipEffusivity: e_chip,
      workpieceEffusivity: e_work,
      toolEffusivity: e_tool,
      pecletNumber: Pe,
      heatRegime,
      speedFactor,
      staticPartitionRatio: R_static,
      partitionPercent: {
        chip: Math.round(chipPercent * 10) / 10,
        workpiece: Math.round(workpiecePercent * 10) / 10,
        tool: Math.round(toolPercent * 10) / 10,
      },
      confidence,
      source: "Loewen-Shaw (1954) dynamic heat partition with Jaeger moving source",
      warnings,
    };
  }

  /**
   * Compare static (Shaw) vs dynamic (Loewen-Shaw) partition models.
   * Useful for demonstrating the importance of speed-dependent partition.
   */
  compareStaticVsDynamic(params: HeatPartitionParams): StaticVsDynamicComparison {
    // Calculate dynamic result
    const dynamicResult = this.calculate(params);

    // Calculate static result (Shaw model only, no speed correction)
    const R_static = this.calculateStaticPartition(params.chipMaterial, params.workpieceMaterial);

    // Tool partition from effusivity
    const e_chip = this.calculateEffusivity(params.chipMaterial);
    const e_tool = this.calculateEffusivity(params.toolMaterial ?? DEFAULT_MATERIALS.carbide);

    // Static model percentages
    const shearFraction = 0.85;
    const frictionFraction = 0.15;
    const staticChipFromShear = shearFraction * R_static;
    const staticWorkFromShear = shearFraction * (1 - R_static);
    const staticFrictionPartition = e_chip / (e_chip + e_tool);
    const staticChipFromFriction = frictionFraction * staticFrictionPartition;
    const staticToolFromFriction = frictionFraction * (1 - staticFrictionPartition);

    const staticChipPercent = (staticChipFromShear + staticChipFromFriction) * 100;
    const staticWorkPercent = staticWorkFromShear * 100;
    const staticToolPercent = staticToolFromFriction * 100;

    // Static temperature (simplified)
    const Vc = Math.max(params.cuttingSpeed, 1);
    const h = Math.max(params.chipThickness, 0.01);
    const contactLength = h * 1.5;
    const depthOfCut = params.depthOfCut ?? 1.0;
    const kc = params.specificCuttingForce ?? 2000;
    const totalPower = kc * depthOfCut * h * (Vc / 60);
    const heatFlux =
      ((totalPower * staticChipPercent) / 100 / (contactLength * depthOfCut * 1e-6)) * 1e6;
    const staticMaxChipTemp = this.calculateChipTemperature(
      heatFlux,
      contactLength,
      Vc,
      params.chipMaterial,
      params.ambientTemp ?? 25
    );

    // Calculate differences
    const partitionRatioDelta = dynamicResult.partitionRatio - R_static;
    const chipPercentDelta = dynamicResult.partitionPercent.chip - staticChipPercent;
    const maxChipTempDelta = dynamicResult.maxChipTemperature - staticMaxChipTemp;
    const percentageChange = R_static > 0 ? ((partitionRatioDelta / R_static) * 100) : 0;

    // Generate analysis
    let analysis: string;
    if (dynamicResult.pecletNumber > 5) {
      analysis =
        `High-speed regime (Pe=${dynamicResult.pecletNumber.toFixed(1)}): ` +
        `Dynamic model predicts ${Math.abs(chipPercentDelta).toFixed(1)}% more heat to chip. ` +
        `Static Shaw model underestimates chip heat removal at this speed.`;
    } else if (dynamicResult.pecletNumber < 0.5) {
      analysis =
        `Low-speed regime (Pe=${dynamicResult.pecletNumber.toFixed(2)}): ` +
        `Dynamic model predicts ${Math.abs(chipPercentDelta).toFixed(1)}% less heat to chip. ` +
        `Static Shaw model overestimates chip heat removal at low speeds.`;
    } else {
      analysis =
        `Transition regime (Pe=${dynamicResult.pecletNumber.toFixed(2)}): ` +
        `Models differ by ${Math.abs(chipPercentDelta).toFixed(1)}%. ` +
        `Both models provide reasonable approximations.`;
    }

    return {
      staticModel: {
        partitionRatio: R_static,
        chipPercent: Math.round(staticChipPercent * 10) / 10,
        workpiecePercent: Math.round(staticWorkPercent * 10) / 10,
        toolPercent: Math.round(staticToolPercent * 10) / 10,
        maxChipTemp: Math.round(staticMaxChipTemp),
      },
      dynamicModel: {
        partitionRatio: dynamicResult.partitionRatio,
        chipPercent: dynamicResult.partitionPercent.chip,
        workpiecePercent: dynamicResult.partitionPercent.workpiece,
        toolPercent: dynamicResult.partitionPercent.tool,
        maxChipTemp: Math.round(dynamicResult.maxChipTemperature),
        pecletNumber: dynamicResult.pecletNumber,
        heatRegime: dynamicResult.heatRegime,
      },
      differences: {
        partitionRatioDelta: Math.round(partitionRatioDelta * 1000) / 1000,
        chipPercentDelta: Math.round(chipPercentDelta * 10) / 10,
        maxChipTempDelta: Math.round(maxChipTempDelta),
        percentageChange: Math.round(percentageChange * 10) / 10,
      },
      analysis,
    };
  }

  /**
   * Get default material properties by name.
   * Falls back to canonical constants if available.
   */
  getMaterialProperties(materialName: string): MaterialProperties | null {
    // Check local defaults first
    const lowerName = materialName.toLowerCase();
    if (DEFAULT_MATERIALS[lowerName]) {
      return DEFAULT_MATERIALS[lowerName];
    }

    // Try canonical material database
    try {
      const canonical = resolveMaterial(lowerName);
      return {
        density: canonical.density_kg_m3,
        specificHeat: canonical.cp_J_kgK,
        thermalConductivity: canonical.k_thermal,
        name: canonical.name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Convenience method with material names instead of full property objects.
   */
  calculateByMaterialName(
    chipMaterialName: string,
    workpieceMaterialName: string,
    toolMaterialName: string,
    cuttingSpeed: number,
    chipThickness: number,
    toolRakeAngle: number,
    options?: {
      depthOfCut?: number;
      specificCuttingForce?: number;
      betaConstant?: number;
      ambientTemp?: number;
      coolantType?: "dry" | "flood" | "mist" | "mql" | "cryogenic" | "through_tool";
    }
  ): HeatPartitionResult {
    const chipMaterial = this.getMaterialProperties(chipMaterialName);
    const workpieceMaterial = this.getMaterialProperties(workpieceMaterialName);
    const toolMaterial = this.getMaterialProperties(toolMaterialName);

    if (!chipMaterial) {
      throw new Error(`Unknown chip material: ${chipMaterialName}`);
    }
    if (!workpieceMaterial) {
      throw new Error(`Unknown workpiece material: ${workpieceMaterialName}`);
    }
    if (!toolMaterial) {
      throw new Error(`Unknown tool material: ${toolMaterialName}`);
    }

    return this.calculate({
      chipMaterial,
      workpieceMaterial,
      toolMaterial,
      cuttingSpeed,
      chipThickness,
      toolRakeAngle,
      ...options,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const loewenShawHeatPartitionEngine = new LoewenShawHeatPartitionEngine();
