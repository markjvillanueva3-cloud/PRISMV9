/**
 * PRISM Manufacturing Intelligence - Tool Breakage Prediction Engine
 * Physics-based prediction of tool failure before it happens
 * 
 * SAFETY CRITICAL: Broken tools = flying debris = injury/death
 * 
 * Models Implemented:
 * - Bending Stress Analysis (cantilever beam)
 * - Torsional Stress Analysis
 * - Combined Stress (von Mises criterion)
 * - Tool Deflection Prediction
 * - Fatigue Life Estimation (S-N curve)
 * - Chip Load Validation
 * - Breakage Probability Assessment
 * 
 * @version 1.0.0
 * @module ToolBreakageEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Tool material types with properties
 */
export type ToolMaterial = 
  | 'HSS'           // High Speed Steel
  | 'COBALT_HSS'    // Cobalt HSS (M42, etc.)
  | 'CARBIDE'       // Solid Carbide
  | 'CARBIDE_COATED'// Coated Carbide
  | 'CERMET'        // Ceramic-Metal composite
  | 'CERAMIC'       // Ceramic
  | 'CBN'           // Cubic Boron Nitride
  | 'PCD';          // Polycrystalline Diamond

/**
 * Tool geometry specification
 */
export interface ToolGeometry {
  diameter: number;           // Tool diameter [mm]
  shankDiameter: number;      // Shank diameter [mm]
  fluteLength: number;        // Cutting length [mm]
  overallLength: number;      // Total length [mm]
  stickout: number;           // Stickout from holder [mm]
  numberOfFlutes: number;     // Number of cutting edges
  helixAngle?: number;        // Helix angle [degrees]
  rakeAngle?: number;         // Rake angle [degrees]
  coreRatio?: number;         // Core diameter / tool diameter (0.5-0.7 typical)
  neckDiameter?: number;      // Neck diameter if necked [mm]
  neckLength?: number;        // Neck length [mm]
}

/**
 * Tool material properties
 */
export interface ToolMaterialProperties {
  material: ToolMaterial;
  elasticModulus: number;     // E [GPa]
  yieldStrength: number;      // σy [MPa]
  ultimateStrength: number;   // σu [MPa]
  enduranceLimit: number;     // σe [MPa] for fatigue
  hardness: number;           // HRC
  toughness: number;          // Fracture toughness [MPa√m]
  fatigueExponent?: number;   // m in S-N curve
}

/**
 * Cutting conditions for analysis
 */
export interface CuttingConditions {
  cuttingSpeed: number;       // Vc [m/min]
  feedPerTooth: number;       // fz [mm/tooth]
  axialDepth: number;         // ap [mm]
  radialDepth: number;        // ae [mm]
  spindleSpeed: number;       // n [rpm]
  feedRate?: number;          // F [mm/min]
}

/**
 * Cutting forces for stress calculation
 */
export interface CuttingForces {
  Fc: number;                 // Tangential force [N]
  Ff: number;                 // Feed force [N]
  Fp: number;                 // Radial/passive force [N]
  torque?: number;            // Spindle torque [Nm]
}

/**
 * Stress analysis result
 */
export interface StressResult {
  bendingStress: number;      // σ_bend [MPa]
  torsionalStress: number;    // τ [MPa]
  vonMisesStress: number;     // σ_vm [MPa]
  maxPrincipalStress: number; // σ1 [MPa]
  stressRatio: number;        // σ_vm / σ_yield
  isSafe: boolean;
  safetyFactor: number;
  criticalLocation: string;
  warnings: string[];
}

/**
 * Deflection analysis result
 */
export interface DeflectionResult {
  maxDeflection: number;      // δ [mm]
  deflectionAtTip: number;    // Deflection at tool tip [mm]
  deflectionRatio: number;    // δ / diameter
  allowableDeflection: number;// Based on tolerance [mm]
  isSafe: boolean;
  safetyFactor: number;
  surfaceFinishImpact: string;
  warnings: string[];
}

/**
 * Chip load analysis result
 */
export interface ChipLoadResult {
  actualChipLoad: number;     // fz [mm/tooth]
  maxRecommended: number;     // fz_max [mm/tooth]
  minRecommended: number;     // fz_min [mm/tooth]
  chipLoadRatio: number;      // actual / max
  chipThickness: number;      // h [mm]
  isSafe: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Fatigue analysis result
 */
export interface FatigueResult {
  cyclesAccumulated: number;  // Current cycle count
  cyclesRemaining: number;    // Estimated remaining
  fatigueLife: number;        // Total expected cycles
  damageAccumulated: number;  // Miner's rule damage (0-1)
  remainingLife: number;      // Percentage remaining
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warnings: string[];
  recommendations: string[];
}

/**
 * Comprehensive breakage prediction result
 */
export interface BreakagePrediction {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakageProbability: number;// 0-100%
  primaryFailureMode: string;
  stress: StressResult;
  deflection: DeflectionResult;
  chipLoad: ChipLoadResult;
  fatigue?: FatigueResult;
  safeCuttingLimits: SafeCuttingLimits;
  immediateAction: string;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

/**
 * Safe cutting parameter limits
 */
export interface SafeCuttingLimits {
  maxAxialDepth: number;      // ap_max [mm]
  maxRadialDepth: number;     // ae_max [mm]
  maxFeedPerTooth: number;    // fz_max [mm/tooth]
  maxCuttingSpeed: number;    // Vc_max [m/min]
  maxSpindleSpeed: number;    // n_max [rpm]
  maxTorque: number;          // T_max [Nm]
  maxForce: number;           // F_max [N]
  derateFactor: number;       // Safety derating applied
}

// ============================================================================
// CONSTANTS & MATERIAL DATA
// ============================================================================

/**
 * Tool material properties database
 */
const TOOL_MATERIAL_PROPERTIES: Record<ToolMaterial, ToolMaterialProperties> = {
  HSS: {
    material: 'HSS',
    elasticModulus: 210,
    yieldStrength: 2000,
    ultimateStrength: 2500,
    enduranceLimit: 700,
    hardness: 64,
    toughness: 20,
    fatigueExponent: 8
  },
  COBALT_HSS: {
    material: 'COBALT_HSS',
    elasticModulus: 215,
    yieldStrength: 2200,
    ultimateStrength: 2800,
    enduranceLimit: 800,
    hardness: 67,
    toughness: 18,
    fatigueExponent: 8
  },
  CARBIDE: {
    material: 'CARBIDE',
    elasticModulus: 580,
    yieldStrength: 3500,      // Transverse rupture strength
    ultimateStrength: 4000,
    enduranceLimit: 1200,
    hardness: 92,             // HRA
    toughness: 12,
    fatigueExponent: 10
  },
  CARBIDE_COATED: {
    material: 'CARBIDE_COATED',
    elasticModulus: 580,
    yieldStrength: 3500,
    ultimateStrength: 4000,
    enduranceLimit: 1200,
    hardness: 92,
    toughness: 12,
    fatigueExponent: 10
  },
  CERMET: {
    material: 'CERMET',
    elasticModulus: 450,
    yieldStrength: 2500,
    ultimateStrength: 3000,
    enduranceLimit: 900,
    hardness: 91,
    toughness: 8,
    fatigueExponent: 12
  },
  CERAMIC: {
    material: 'CERAMIC',
    elasticModulus: 400,
    yieldStrength: 3000,
    ultimateStrength: 3500,
    enduranceLimit: 1000,
    hardness: 94,
    toughness: 4,
    fatigueExponent: 15
  },
  CBN: {
    material: 'CBN',
    elasticModulus: 680,
    yieldStrength: 4000,
    ultimateStrength: 4500,
    enduranceLimit: 1500,
    hardness: 4500,           // Knoop
    toughness: 6,
    fatigueExponent: 12
  },
  PCD: {
    material: 'PCD',
    elasticModulus: 850,
    yieldStrength: 3000,
    ultimateStrength: 3500,
    enduranceLimit: 1000,
    hardness: 8000,           // Knoop
    toughness: 3,
    fatigueExponent: 15
  }
};

/**
 * Recommended chip load ranges by tool diameter and material
 * Values in mm/tooth
 */
const CHIP_LOAD_RECOMMENDATIONS: Record<ToolMaterial, Record<string, { min: number; max: number }>> = {
  HSS: {
    'd<3': { min: 0.01, max: 0.03 },
    'd3-6': { min: 0.02, max: 0.05 },
    'd6-12': { min: 0.03, max: 0.08 },
    'd12-25': { min: 0.05, max: 0.12 },
    'd>25': { min: 0.08, max: 0.20 }
  },
  COBALT_HSS: {
    'd<3': { min: 0.01, max: 0.035 },
    'd3-6': { min: 0.02, max: 0.06 },
    'd6-12': { min: 0.04, max: 0.10 },
    'd12-25': { min: 0.06, max: 0.15 },
    'd>25': { min: 0.10, max: 0.25 }
  },
  CARBIDE: {
    'd<3': { min: 0.02, max: 0.05 },
    'd3-6': { min: 0.03, max: 0.08 },
    'd6-12': { min: 0.05, max: 0.12 },
    'd12-25': { min: 0.08, max: 0.18 },
    'd>25': { min: 0.12, max: 0.30 }
  },
  CARBIDE_COATED: {
    'd<3': { min: 0.02, max: 0.06 },
    'd3-6': { min: 0.03, max: 0.10 },
    'd6-12': { min: 0.06, max: 0.15 },
    'd12-25': { min: 0.10, max: 0.22 },
    'd>25': { min: 0.15, max: 0.35 }
  },
  CERMET: {
    'd<3': { min: 0.01, max: 0.04 },
    'd3-6': { min: 0.02, max: 0.06 },
    'd6-12': { min: 0.04, max: 0.10 },
    'd12-25': { min: 0.06, max: 0.15 },
    'd>25': { min: 0.10, max: 0.25 }
  },
  CERAMIC: {
    'd<3': { min: 0.005, max: 0.02 },
    'd3-6': { min: 0.01, max: 0.03 },
    'd6-12': { min: 0.02, max: 0.05 },
    'd12-25': { min: 0.03, max: 0.08 },
    'd>25': { min: 0.05, max: 0.12 }
  },
  CBN: {
    'd<3': { min: 0.005, max: 0.02 },
    'd3-6': { min: 0.01, max: 0.04 },
    'd6-12': { min: 0.02, max: 0.06 },
    'd12-25': { min: 0.04, max: 0.10 },
    'd>25': { min: 0.06, max: 0.15 }
  },
  PCD: {
    'd<3': { min: 0.01, max: 0.03 },
    'd3-6': { min: 0.02, max: 0.05 },
    'd6-12': { min: 0.03, max: 0.08 },
    'd12-25': { min: 0.05, max: 0.12 },
    'd>25': { min: 0.08, max: 0.20 }
  }
};

/**
 * Deflection limits as ratio of tool diameter
 */
const DEFLECTION_LIMITS = {
  ROUGHING: 0.05,        // 5% of diameter
  SEMI_FINISH: 0.02,     // 2% of diameter
  FINISHING: 0.01,       // 1% of diameter
  PRECISION: 0.005       // 0.5% of diameter
};

/**
 * Safety factors for different operations
 */
const SAFETY_FACTORS = {
  STRESS_STATIC: 2.0,
  STRESS_DYNAMIC: 3.0,
  STRESS_INTERRUPTED: 4.0,
  DEFLECTION: 1.5,
  FATIGUE: 2.5
};

// ============================================================================
// TOOL BREAKAGE ENGINE CLASS
// ============================================================================

class ToolBreakageEngine {

  // ==========================================================================
  // STRESS ANALYSIS
  // ==========================================================================

  /**
   * Calculate tool stress from cutting forces
   * 
   * Models tool as cantilever beam with combined bending and torsion
   * 
   * Bending: σ = 32FL / (πd³)
   * Torsion: τ = 16T / (πd³)
   * von Mises: σ_vm = √(σ² + 3τ²)
   * 
   * @param tool - Tool geometry
   * @param forces - Cutting forces
   * @param material - Tool material type
   * @param isInterrupted - Whether cutting is interrupted
   * @returns Stress analysis result
   */
  calculateToolStress(
    tool: ToolGeometry,
    forces: CuttingForces,
    material: ToolMaterial = 'CARBIDE',
    isInterrupted: boolean = false
  ): StressResult {
    const warnings: string[] = [];
    const props = TOOL_MATERIAL_PROPERTIES[material];

    // Determine critical diameter (smallest cross-section)
    let criticalDiameter = tool.shankDiameter;
    let criticalLocation = 'Shank';
    
    if (tool.neckDiameter && tool.neckDiameter < criticalDiameter) {
      criticalDiameter = tool.neckDiameter;
      criticalLocation = 'Neck';
    }
    
    // For endmills, check core diameter
    const coreRatio = tool.coreRatio || 0.5;
    const coreDiameter = tool.diameter * coreRatio;
    if (coreDiameter < criticalDiameter) {
      criticalDiameter = coreDiameter;
      criticalLocation = 'Flute core';
    }

    // Effective length (stickout)
    const L = tool.stickout;

    // Resultant radial force for bending
    const F_radial = Math.sqrt(Math.pow(forces.Ff, 2) + Math.pow(forces.Fp, 2));

    // Bending stress: σ = 32 × F × L / (π × d³)
    const d3 = Math.pow(criticalDiameter, 3);
    const bendingStress = (32 * F_radial * L) / (Math.PI * d3);

    // Torque (from tangential force or direct)
    const torque = forces.torque || (forces.Fc * tool.diameter / 2000); // Nm
    
    // Torsional stress: τ = 16 × T × 1000 / (π × d³)
    const torsionalStress = (16 * torque * 1000) / (Math.PI * d3);

    // von Mises combined stress: σ_vm = √(σ² + 3τ²)
    const vonMisesStress = Math.sqrt(
      Math.pow(bendingStress, 2) + 3 * Math.pow(torsionalStress, 2)
    );

    // Maximum principal stress (for brittle materials)
    const maxPrincipalStress = (bendingStress / 2) + 
      Math.sqrt(Math.pow(bendingStress / 2, 2) + Math.pow(torsionalStress, 2));

    // Stress ratio
    const stressRatio = vonMisesStress / props.yieldStrength;

    // Safety factor determination
    let requiredSF = SAFETY_FACTORS.STRESS_STATIC;
    if (isInterrupted) {
      requiredSF = SAFETY_FACTORS.STRESS_INTERRUPTED;
    }

    const safetyFactor = props.yieldStrength / vonMisesStress;
    const isSafe = safetyFactor >= requiredSF;

    // Warnings
    if (stressRatio > 0.8) {
      warnings.push(`CRITICAL: Stress ratio ${(stressRatio * 100).toFixed(1)}% of yield strength`);
    } else if (stressRatio > 0.5) {
      warnings.push(`WARNING: Elevated stress at ${(stressRatio * 100).toFixed(1)}% of yield`);
    }

    if (bendingStress > torsionalStress * 2) {
      warnings.push('Bending-dominated stress - consider shorter stickout');
    }

    if (L / tool.diameter > 4) {
      warnings.push(`High L/D ratio (${(L / tool.diameter).toFixed(1)}) increases breakage risk`);
    }

    if (tool.neckDiameter && tool.neckDiameter < tool.shankDiameter * 0.7) {
      warnings.push('Thin neck is stress concentration point');
    }

    return {
      bendingStress: parseFloat(bendingStress.toFixed(2)),
      torsionalStress: parseFloat(torsionalStress.toFixed(2)),
      vonMisesStress: parseFloat(vonMisesStress.toFixed(2)),
      maxPrincipalStress: parseFloat(maxPrincipalStress.toFixed(2)),
      stressRatio: parseFloat(stressRatio.toFixed(3)),
      isSafe,
      safetyFactor: parseFloat(safetyFactor.toFixed(2)),
      criticalLocation,
      warnings
    };
  }

  // ==========================================================================
  // DEFLECTION ANALYSIS
  // ==========================================================================

  /**
   * Calculate tool deflection under cutting forces
   * 
   * Models tool as cantilever beam:
   * δ = 64 × F × L³ / (3 × E × π × d⁴)
   * 
   * @param tool - Tool geometry
   * @param forces - Cutting forces  
   * @param material - Tool material type
   * @param operationType - Operation type for limits
   * @param tolerance - Part tolerance for comparison [mm]
   * @returns Deflection analysis result
   */
  calculateToolDeflection(
    tool: ToolGeometry,
    forces: CuttingForces,
    material: ToolMaterial = 'CARBIDE',
    operationType: 'ROUGHING' | 'SEMI_FINISH' | 'FINISHING' | 'PRECISION' = 'FINISHING',
    tolerance?: number
  ): DeflectionResult {
    const warnings: string[] = [];
    const props = TOOL_MATERIAL_PROPERTIES[material];

    // Effective diameter for stiffness (use shank for most of length)
    const d = tool.shankDiameter;
    const L = tool.stickout;
    const E = props.elasticModulus * 1000; // Convert GPa to MPa

    // Resultant radial force
    const F = Math.sqrt(Math.pow(forces.Ff, 2) + Math.pow(forces.Fp, 2));

    // Deflection at tip: δ = 64 × F × L³ / (3 × E × π × d⁴)
    const d4 = Math.pow(d, 4);
    const L3 = Math.pow(L, 3);
    const deflection = (64 * F * L3) / (3 * E * Math.PI * d4);

    // Deflection ratio
    const deflectionRatio = deflection / tool.diameter;

    // Allowable deflection based on operation type
    const allowableRatio = DEFLECTION_LIMITS[operationType];
    let allowableDeflection = tool.diameter * allowableRatio;
    
    // If tolerance provided, use 30% of tolerance as limit
    if (tolerance) {
      allowableDeflection = Math.min(allowableDeflection, tolerance * 0.3);
    }

    const safetyFactor = allowableDeflection / deflection;
    const isSafe = deflection <= allowableDeflection;

    // Surface finish impact assessment
    let surfaceFinishImpact = 'Minimal';
    if (deflectionRatio > 0.03) {
      surfaceFinishImpact = 'Severe - visible chatter marks';
    } else if (deflectionRatio > 0.02) {
      surfaceFinishImpact = 'Significant - may cause chatter';
    } else if (deflectionRatio > 0.01) {
      surfaceFinishImpact = 'Moderate - surface quality affected';
    }

    // Warnings
    if (deflectionRatio > 0.05) {
      warnings.push(`CRITICAL: Deflection ${(deflectionRatio * 100).toFixed(2)}% of diameter`);
    } else if (deflectionRatio > 0.02) {
      warnings.push(`WARNING: High deflection ${(deflectionRatio * 100).toFixed(2)}% of diameter`);
    }

    if (L / d > 5) {
      warnings.push(`Very long reach (L/D=${(L / d).toFixed(1)}) - deflection will be significant`);
    }

    if (!isSafe) {
      warnings.push(`Deflection ${deflection.toFixed(4)}mm exceeds allowable ${allowableDeflection.toFixed(4)}mm`);
    }

    return {
      maxDeflection: parseFloat(deflection.toFixed(4)),
      deflectionAtTip: parseFloat(deflection.toFixed(4)),
      deflectionRatio: parseFloat(deflectionRatio.toFixed(4)),
      allowableDeflection: parseFloat(allowableDeflection.toFixed(4)),
      isSafe,
      safetyFactor: parseFloat(safetyFactor.toFixed(2)),
      surfaceFinishImpact,
      warnings
    };
  }

  // ==========================================================================
  // CHIP LOAD ANALYSIS
  // ==========================================================================

  /**
   * Validate chip load against tool recommendations
   * 
   * @param tool - Tool geometry
   * @param conditions - Cutting conditions
   * @param material - Tool material type
   * @param workpieceMaterial - Workpiece material category
   * @returns Chip load analysis result
   */
  checkChipLoadLimits(
    tool: ToolGeometry,
    conditions: CuttingConditions,
    material: ToolMaterial = 'CARBIDE',
    workpieceMaterial: 'STEEL' | 'STAINLESS' | 'ALUMINUM' | 'CAST_IRON' | 'SUPERALLOY' = 'STEEL'
  ): ChipLoadResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get chip load recommendations for tool size
    const chipLoadTable = CHIP_LOAD_RECOMMENDATIONS[material];
    let sizeCategory = 'd>25';
    if (tool.diameter < 3) sizeCategory = 'd<3';
    else if (tool.diameter < 6) sizeCategory = 'd3-6';
    else if (tool.diameter < 12) sizeCategory = 'd6-12';
    else if (tool.diameter < 25) sizeCategory = 'd12-25';

    const baseRecommendation = chipLoadTable[sizeCategory];
    
    // Adjust for workpiece material
    let materialFactor = 1.0;
    switch (workpieceMaterial) {
      case 'ALUMINUM': materialFactor = 1.5; break;
      case 'CAST_IRON': materialFactor = 1.2; break;
      case 'STAINLESS': materialFactor = 0.7; break;
      case 'SUPERALLOY': materialFactor = 0.5; break;
      default: materialFactor = 1.0;
    }

    const minRecommended = baseRecommendation.min * materialFactor;
    const maxRecommended = baseRecommendation.max * materialFactor;

    // Actual chip load
    const actualChipLoad = conditions.feedPerTooth;

    // Calculate actual chip thickness (accounting for radial engagement)
    const engagementRatio = conditions.radialDepth / tool.diameter;
    const chipThickness = actualChipLoad * Math.sqrt(engagementRatio);

    // Chip load ratio
    const chipLoadRatio = actualChipLoad / maxRecommended;

    // Safety assessment
    let isSafe = true;
    
    if (actualChipLoad > maxRecommended) {
      isSafe = false;
      warnings.push(
        `OVERLOAD: Chip load ${actualChipLoad.toFixed(3)}mm exceeds max ${maxRecommended.toFixed(3)}mm`
      );
      recommendations.push(`Reduce feed per tooth to ≤ ${maxRecommended.toFixed(3)}mm`);
    }

    if (actualChipLoad < minRecommended) {
      warnings.push(
        `UNDERLOAD: Chip load ${actualChipLoad.toFixed(3)}mm below min ${minRecommended.toFixed(3)}mm`
      );
      recommendations.push('Increase feed to avoid rubbing and work hardening');
    }

    // Additional warnings
    if (chipLoadRatio > 0.9) {
      warnings.push('Operating near maximum chip load - reduced tool life expected');
    }

    if (actualChipLoad > tool.diameter * 0.1) {
      warnings.push('Very high chip load relative to tool diameter');
      recommendations.push('Consider larger diameter tool');
    }

    // L/D ratio warning
    const LD = tool.stickout / tool.diameter;
    if (LD > 4 && chipLoadRatio > 0.7) {
      warnings.push(`High L/D (${LD.toFixed(1)}) with high chip load increases breakage risk`);
      recommendations.push('Reduce chip load for long reach operations');
    }

    return {
      actualChipLoad: parseFloat(actualChipLoad.toFixed(4)),
      maxRecommended: parseFloat(maxRecommended.toFixed(4)),
      minRecommended: parseFloat(minRecommended.toFixed(4)),
      chipLoadRatio: parseFloat(chipLoadRatio.toFixed(3)),
      chipThickness: parseFloat(chipThickness.toFixed(4)),
      isSafe,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // FATIGUE ANALYSIS
  // ==========================================================================

  /**
   * Estimate tool fatigue life and remaining cycles
   * 
   * Uses simplified S-N curve approach:
   * N = (σ_e / σ_a)^m
   * 
   * Miner's rule for damage accumulation:
   * D = Σ(n_i / N_i)
   * 
   * @param tool - Tool geometry
   * @param forces - Cutting forces
   * @param material - Tool material type
   * @param cyclesAccumulated - Cycles already performed
   * @param isInterrupted - Interrupted cutting (more severe)
   * @returns Fatigue analysis result
   */
  estimateToolFatigue(
    tool: ToolGeometry,
    forces: CuttingForces,
    material: ToolMaterial = 'CARBIDE',
    cyclesAccumulated: number = 0,
    isInterrupted: boolean = false
  ): FatigueResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const props = TOOL_MATERIAL_PROPERTIES[material];

    // Calculate stress for fatigue
    const stressResult = this.calculateToolStress(tool, forces, material, isInterrupted);
    const stressAmplitude = stressResult.vonMisesStress;

    // Fatigue life estimation using S-N curve
    // N = (σ_e / σ_a)^m
    const m = props.fatigueExponent || 10;
    let fatigueLife: number;

    if (stressAmplitude >= props.enduranceLimit) {
      // Finite life regime
      fatigueLife = Math.pow(props.enduranceLimit / stressAmplitude, m) * 1e6;
    } else {
      // Infinite life (practically very high)
      fatigueLife = 1e9;
    }

    // Apply interrupted cutting factor (reduces life significantly)
    if (isInterrupted) {
      fatigueLife *= 0.3; // Interrupted cutting reduces fatigue life by ~70%
    }

    // Miner's rule damage
    const damageAccumulated = cyclesAccumulated / fatigueLife;
    const cyclesRemaining = Math.max(0, fatigueLife - cyclesAccumulated);
    const remainingLife = Math.max(0, (1 - damageAccumulated) * 100);

    // Risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (damageAccumulated > 0.9) {
      riskLevel = 'CRITICAL';
    } else if (damageAccumulated > 0.7) {
      riskLevel = 'HIGH';
    } else if (damageAccumulated > 0.5) {
      riskLevel = 'MEDIUM';
    }

    // Warnings and recommendations
    if (riskLevel === 'CRITICAL') {
      warnings.push('CRITICAL: Tool has exceeded expected fatigue life');
      recommendations.push('Replace tool immediately');
    } else if (riskLevel === 'HIGH') {
      warnings.push('HIGH RISK: Tool approaching end of fatigue life');
      recommendations.push('Plan tool replacement soon');
    } else if (riskLevel === 'MEDIUM') {
      warnings.push('Moderate fatigue accumulation - monitor closely');
    }

    if (stressAmplitude > props.enduranceLimit * 0.8) {
      warnings.push('Stress near endurance limit - limited fatigue life');
      recommendations.push('Reduce cutting forces to extend tool life');
    }

    return {
      cyclesAccumulated,
      cyclesRemaining: Math.round(cyclesRemaining),
      fatigueLife: Math.round(fatigueLife),
      damageAccumulated: parseFloat(damageAccumulated.toFixed(4)),
      remainingLife: parseFloat(remainingLife.toFixed(1)),
      riskLevel,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // SAFE CUTTING LIMITS
  // ==========================================================================

  /**
   * Calculate maximum safe cutting parameters for a tool
   * 
   * @param tool - Tool geometry
   * @param material - Tool material type
   * @param operationType - Operation type
   * @param workpieceMaterial - Workpiece material
   * @returns Safe cutting limits
   */
  getSafeCuttingLimits(
    tool: ToolGeometry,
    material: ToolMaterial = 'CARBIDE',
    operationType: 'ROUGHING' | 'SEMI_FINISH' | 'FINISHING' | 'PRECISION' = 'FINISHING',
    workpieceMaterial: 'STEEL' | 'STAINLESS' | 'ALUMINUM' | 'CAST_IRON' | 'SUPERALLOY' = 'STEEL'
  ): SafeCuttingLimits {
    const props = TOOL_MATERIAL_PROPERTIES[material];

    // Get chip load limits
    const chipLoadTable = CHIP_LOAD_RECOMMENDATIONS[material];
    let sizeCategory = 'd>25';
    if (tool.diameter < 3) sizeCategory = 'd<3';
    else if (tool.diameter < 6) sizeCategory = 'd3-6';
    else if (tool.diameter < 12) sizeCategory = 'd6-12';
    else if (tool.diameter < 25) sizeCategory = 'd12-25';

    const chipLoadRange = chipLoadTable[sizeCategory];

    // Material factor
    let materialFactor = 1.0;
    switch (workpieceMaterial) {
      case 'ALUMINUM': materialFactor = 1.5; break;
      case 'CAST_IRON': materialFactor = 1.2; break;
      case 'STAINLESS': materialFactor = 0.7; break;
      case 'SUPERALLOY': materialFactor = 0.5; break;
    }

    // L/D derating
    const LD = tool.stickout / tool.diameter;
    let LDDerating = 1.0;
    if (LD > 6) LDDerating = 0.3;
    else if (LD > 5) LDDerating = 0.5;
    else if (LD > 4) LDDerating = 0.7;
    else if (LD > 3) LDDerating = 0.85;

    // Operation derating
    let opDerating = 1.0;
    switch (operationType) {
      case 'PRECISION': opDerating = 0.5; break;
      case 'FINISHING': opDerating = 0.7; break;
      case 'SEMI_FINISH': opDerating = 0.85; break;
      case 'ROUGHING': opDerating = 1.0; break;
    }

    const derateFactor = LDDerating * opDerating;

    // Maximum axial depth (typically 1-2× diameter for endmills)
    const maxAxialDepth = tool.fluteLength * 0.8 * derateFactor;

    // Maximum radial depth
    const maxRadialDepth = tool.diameter * (operationType === 'ROUGHING' ? 0.5 : 0.3) * derateFactor;

    // Maximum feed per tooth
    const maxFeedPerTooth = chipLoadRange.max * materialFactor * derateFactor;

    // Maximum cutting speed (based on tool material and workpiece)
    let baseSpeed = 200; // m/min for carbide in steel
    switch (workpieceMaterial) {
      case 'ALUMINUM': baseSpeed = 500; break;
      case 'CAST_IRON': baseSpeed = 150; break;
      case 'STAINLESS': baseSpeed = 100; break;
      case 'SUPERALLOY': baseSpeed = 50; break;
    }
    if (material === 'HSS' || material === 'COBALT_HSS') {
      baseSpeed *= 0.3;
    }
    const maxCuttingSpeed = baseSpeed;

    // Maximum spindle speed
    const maxSpindleSpeed = (maxCuttingSpeed * 1000) / (Math.PI * tool.diameter);

    // Maximum torque (based on shank strength)
    const shankArea = Math.PI * Math.pow(tool.shankDiameter / 2, 2);
    const maxTorque = (props.yieldStrength * shankArea * tool.shankDiameter / 2) / 
                      (1000 * SAFETY_FACTORS.STRESS_STATIC * 16 / Math.PI);

    // Maximum force
    const maxForce = (props.yieldStrength * Math.PI * Math.pow(tool.shankDiameter, 3)) / 
                     (32 * tool.stickout * SAFETY_FACTORS.STRESS_STATIC);

    return {
      maxAxialDepth: parseFloat(maxAxialDepth.toFixed(2)),
      maxRadialDepth: parseFloat(maxRadialDepth.toFixed(2)),
      maxFeedPerTooth: parseFloat(maxFeedPerTooth.toFixed(4)),
      maxCuttingSpeed: parseFloat(maxCuttingSpeed.toFixed(0)),
      maxSpindleSpeed: parseFloat(maxSpindleSpeed.toFixed(0)),
      maxTorque: parseFloat(maxTorque.toFixed(2)),
      maxForce: parseFloat(maxForce.toFixed(0)),
      derateFactor: parseFloat(derateFactor.toFixed(2))
    };
  }

  // ==========================================================================
  // COMPREHENSIVE BREAKAGE PREDICTION
  // ==========================================================================

  /**
   * Comprehensive tool breakage risk assessment
   * 
   * Combines all analysis methods to predict breakage probability
   * 
   * @param tool - Tool geometry
   * @param forces - Cutting forces
   * @param conditions - Cutting conditions
   * @param material - Tool material type
   * @param options - Additional options
   * @returns Complete breakage prediction
   */
  predictBreakage(
    tool: ToolGeometry,
    forces: CuttingForces,
    conditions: CuttingConditions,
    material: ToolMaterial = 'CARBIDE',
    options?: {
      workpieceMaterial?: 'STEEL' | 'STAINLESS' | 'ALUMINUM' | 'CAST_IRON' | 'SUPERALLOY';
      operationType?: 'ROUGHING' | 'SEMI_FINISH' | 'FINISHING' | 'PRECISION';
      isInterrupted?: boolean;
      cyclesAccumulated?: number;
      tolerance?: number;
    }
  ): BreakagePrediction {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const workpieceMaterial = options?.workpieceMaterial || 'STEEL';
    const operationType = options?.operationType || 'FINISHING';
    const isInterrupted = options?.isInterrupted || false;

    // 1. Stress Analysis
    const stress = this.calculateToolStress(tool, forces, material, isInterrupted);
    warnings.push(...stress.warnings);

    // 2. Deflection Analysis
    const deflection = this.calculateToolDeflection(
      tool, forces, material, operationType, options?.tolerance
    );
    warnings.push(...deflection.warnings);

    // 3. Chip Load Analysis
    const chipLoad = this.checkChipLoadLimits(tool, conditions, material, workpieceMaterial);
    warnings.push(...chipLoad.warnings);
    recommendations.push(...chipLoad.recommendations);

    // 4. Fatigue Analysis (if cycles provided)
    let fatigue: FatigueResult | undefined;
    if (options?.cyclesAccumulated !== undefined) {
      fatigue = this.estimateToolFatigue(
        tool, forces, material, options.cyclesAccumulated, isInterrupted
      );
      warnings.push(...fatigue.warnings);
      recommendations.push(...fatigue.recommendations);
    }

    // 5. Safe Cutting Limits
    const safeLimits = this.getSafeCuttingLimits(tool, material, operationType, workpieceMaterial);

    // Calculate breakage probability
    let breakageProbability = 0;
    let primaryFailureMode = 'None identified';

    // Stress contribution (40% weight)
    if (stress.stressRatio > 1.0) {
      breakageProbability += 40;
      primaryFailureMode = 'Stress overload';
    } else if (stress.stressRatio > 0.8) {
      breakageProbability += 30;
      if (primaryFailureMode === 'None identified') primaryFailureMode = 'High stress';
    } else if (stress.stressRatio > 0.5) {
      breakageProbability += 15;
    }

    // Deflection contribution (25% weight)
    if (deflection.deflectionRatio > 0.05) {
      breakageProbability += 25;
      if (primaryFailureMode === 'None identified') primaryFailureMode = 'Excessive deflection';
    } else if (deflection.deflectionRatio > 0.02) {
      breakageProbability += 15;
    } else if (deflection.deflectionRatio > 0.01) {
      breakageProbability += 5;
    }

    // Chip load contribution (20% weight)
    if (chipLoad.chipLoadRatio > 1.0) {
      breakageProbability += 20;
      if (primaryFailureMode === 'None identified') primaryFailureMode = 'Chip overload';
    } else if (chipLoad.chipLoadRatio > 0.9) {
      breakageProbability += 10;
    }

    // Fatigue contribution (15% weight)
    if (fatigue) {
      if (fatigue.damageAccumulated > 0.9) {
        breakageProbability += 15;
        if (primaryFailureMode === 'None identified') primaryFailureMode = 'Fatigue failure';
      } else if (fatigue.damageAccumulated > 0.7) {
        breakageProbability += 10;
      } else if (fatigue.damageAccumulated > 0.5) {
        breakageProbability += 5;
      }
    }

    // Determine overall risk
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let immediateAction = 'Continue monitoring';

    if (breakageProbability > 70) {
      overallRisk = 'CRITICAL';
      immediateAction = 'STOP IMMEDIATELY - Tool failure imminent';
    } else if (breakageProbability > 50) {
      overallRisk = 'HIGH';
      immediateAction = 'Reduce cutting parameters or replace tool';
    } else if (breakageProbability > 25) {
      overallRisk = 'MEDIUM';
      immediateAction = 'Monitor closely, consider parameter reduction';
    }

    // Deduplicate
    const uniqueWarnings = [...new Set(warnings)];
    const uniqueRecommendations = [...new Set(recommendations)];

    return {
      overallRisk,
      breakageProbability: Math.min(100, Math.round(breakageProbability)),
      primaryFailureMode,
      stress,
      deflection,
      chipLoad,
      fatigue,
      safeCuttingLimits: safeLimits,
      immediateAction,
      warnings: uniqueWarnings,
      recommendations: uniqueRecommendations,
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get material properties for a tool material
   */
  getToolMaterialProperties(material: ToolMaterial): ToolMaterialProperties {
    return TOOL_MATERIAL_PROPERTIES[material];
  }

  /**
   * Estimate cutting forces from parameters (simplified Kienzle)
   */
  estimateCuttingForces(
    kc1_1: number,           // Specific cutting force [N/mm²]
    mc: number,              // Kienzle exponent
    conditions: CuttingConditions,
    toolDiameter: number,
    numberOfFlutes: number
  ): CuttingForces {
    // Average chip thickness
    const h = conditions.feedPerTooth * Math.sqrt(conditions.radialDepth / toolDiameter);
    
    // Specific cutting force
    const kc = kc1_1 * Math.pow(h, -mc);
    
    // Chip area
    const A = conditions.axialDepth * h;
    
    // Tangential force (per tooth, then total)
    const Fc_tooth = kc * A;
    const engagedTeeth = numberOfFlutes * (conditions.radialDepth / toolDiameter) * 0.5;
    const Fc = Fc_tooth * Math.max(1, engagedTeeth);
    
    // Feed and radial forces (empirical ratios)
    const Ff = Fc * 0.4;
    const Fp = Fc * 0.5;
    
    // Torque
    const torque = Fc * toolDiameter / 2000;
    
    return {
      Fc: Math.round(Fc),
      Ff: Math.round(Ff),
      Fp: Math.round(Fp),
      torque: parseFloat(torque.toFixed(2))
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const toolBreakageEngine = new ToolBreakageEngine();

export { ToolBreakageEngine };
