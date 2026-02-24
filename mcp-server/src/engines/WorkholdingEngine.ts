/**
 * PRISM Manufacturing Intelligence - Workholding Validation Engine
 * Physics-based calculations for workholding safety validation
 * 
 * SAFETY CRITICAL: Inadequate workholding = part ejection, injury, death
 * 
 * Models Implemented:
 * - Clamp Force Requirements (friction-based)
 * - Pull-out Resistance (axial drilling/tapping)
 * - Lift-off Moment Analysis (rotational stability)
 * - Part Deflection (beam theory)
 * - Vacuum Fixture Holding Force
 * - Magnetic Chuck Calculations
 * - Dynamic Force Amplification
 * 
 * @version 1.0.0
 * @module WorkholdingEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Cutting force components from machining operation
 */
export interface CuttingForces {
  Fc: number;           // Tangential/main cutting force [N]
  Ff: number;           // Feed force [N]
  Fp: number;           // Passive/radial force [N]
  F_resultant?: number; // Resultant force [N]
  torque?: number;      // Spindle torque [Nm]
}

/**
 * Workholding device types
 */
export type WorkholdingType = 
  | 'VICE_SMOOTH'
  | 'VICE_SERRATED'
  | 'VICE_SOFT_JAWS'
  | 'HYDRAULIC_CLAMP'
  | 'TOGGLE_CLAMP'
  | 'STRAP_CLAMP'
  | 'VACUUM_FIXTURE'
  | 'MAGNETIC_CHUCK'
  | 'COLLET'
  | 'THREE_JAW_CHUCK'
  | 'FOUR_JAW_CHUCK'
  | 'FIXTURE_PLATE'
  | 'TOMBSTONE'
  | 'CUSTOM';

/**
 * Surface condition affecting friction
 */
export type SurfaceCondition = 'DRY' | 'OILY' | 'COOLANT_WET' | 'RUSTY' | 'GROUND' | 'AS_CAST';

/**
 * Workholding device specification
 */
export interface WorkholdingDevice {
  type: WorkholdingType;
  jawWidth?: number;           // Width of clamping jaws [mm]
  jawHeight?: number;          // Height of jaws [mm]
  maxClampForce?: number;      // Maximum clamping force [N]
  currentClampForce?: number;  // Applied clamping force [N]
  numberOfJaws?: number;       // Number of clamping points
  frictionCoefficient?: number; // Override default μ
  surfaceCondition?: SurfaceCondition;
  serrated?: boolean;
  jawMaterial?: string;
}

/**
 * Part/workpiece specification
 */
export interface WorkpieceSpec {
  material: string;
  elasticModulus: number;      // E [GPa]
  yieldStrength?: number;      // σy [MPa]
  length: number;              // L [mm]
  width: number;               // W [mm]
  height: number;              // H [mm]
  wallThickness?: number;      // For thin-walled parts [mm]
  weight?: number;             // Part weight [kg]
  surfaceFinish?: number;      // Ra [μm]
  magneticPermeability?: number; // For magnetic chucks
}

/**
 * Clamp configuration
 */
export interface ClampConfiguration {
  device: WorkholdingDevice;
  clampLocations: ClampLocation[];
  supportLocations?: SupportLocation[];
  partOrientation: 'HORIZONTAL' | 'VERTICAL' | 'ANGLED';
  partAngle?: number;          // Angle from horizontal [degrees]
}

/**
 * Individual clamp location
 */
export interface ClampLocation {
  id: string;
  x: number;                   // X position [mm]
  y: number;                   // Y position [mm]
  z: number;                   // Z position [mm]
  forceDirection: 'DOWN' | 'SIDE' | 'UP' | 'ANGLED';
  forceAngle?: number;         // Force angle [degrees]
  clampForce: number;          // Applied force at this location [N]
  contactArea?: number;        // Contact area [mm²]
}

/**
 * Support/rest location
 */
export interface SupportLocation {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'FIXED' | 'ADJUSTABLE' | 'SPRING_LOADED';
}

/**
 * Machining operation for force analysis
 */
export interface MachiningOperation {
  operationType: 'MILLING' | 'DRILLING' | 'TAPPING' | 'TURNING' | 'BORING' | 'REAMING';
  cuttingForces: CuttingForces;
  forceApplicationPoint: { x: number; y: number; z: number };
  forceDirection?: { x: number; y: number; z: number };
  isInterrupted?: boolean;     // Interrupted cut flag
  entryAngle?: number;         // Tool entry angle [degrees]
  dynamicFactor?: number;      // Override dynamic amplification
}

/**
 * Vacuum fixture specification
 */
export interface VacuumFixtureSpec {
  vacuumPressure: number;      // Vacuum level [kPa] (85 typical)
  sealArea: number;            // Sealed area [mm²]
  sealEfficiency: number;      // η (0.0-1.0)
  numberOfZones?: number;      // Independent vacuum zones
  sealType: 'O_RING' | 'GASKET' | 'FOAM' | 'MACHINED_CHANNEL';
  surfaceFinishRa?: number;    // Part surface finish [μm]
}

/**
 * Magnetic chuck specification
 */
export interface MagneticChuckSpec {
  chuckType: 'PERMANENT' | 'ELECTROMAGNETIC' | 'ELECTROPERMANENT';
  poleSpacing: number;         // Distance between poles [mm]
  holdingForce: number;        // Rated holding force [N/cm²]
  contactArea: number;         // Part contact area [mm²]
  partThickness: number;       // Part thickness [mm]
  partPermeability: number;    // Relative magnetic permeability
  airGap?: number;             // Air gap if any [mm]
}

/**
 * Clamp force calculation result
 */
export interface ClampForceResult {
  requiredClampForce: number;  // Minimum required [N]
  appliedClampForce: number;   // Currently applied [N]
  safetyFactor: number;        // Achieved safety factor
  minimumSafetyFactor: number; // Required safety factor
  isSafe: boolean;
  frictionCoefficient: number;
  dynamicFactor: number;
  warnings: string[];
  recommendations: string[];
  calculation: {
    cuttingForceUsed: number;
    frictionUsed: number;
    safetyFactorUsed: number;
    formula: string;
  };
}

/**
 * Pull-out resistance result
 */
export interface PulloutResult {
  axialForceApplied: number;   // Drilling/tapping axial force [N]
  resistanceForce: number;     // Workholding resistance [N]
  safetyFactor: number;
  isSafe: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Lift-off moment analysis result
 */
export interface LiftoffResult {
  cuttingMoment: number;       // Moment from cutting forces [Nm]
  resistingMoment: number;     // Moment from clamping [Nm]
  pivotPoint: { x: number; y: number; z: number };
  safetyFactor: number;
  isSafe: boolean;
  criticalDirection: string;
  warnings: string[];
  recommendations: string[];
}

/**
 * Part deflection result
 */
export interface DeflectionResult {
  maxDeflection: number;       // Maximum deflection [mm]
  deflectionLocation: { x: number; y: number; z: number };
  allowableDeflection: number; // Based on tolerance [mm]
  isSafe: boolean;
  stressAtClamp: number;       // Stress at clamp point [MPa]
  yieldSafetyFactor: number;
  warnings: string[];
  recommendations: string[];
  beamModel: string;
}

/**
 * Vacuum fixture validation result
 */
export interface VacuumValidationResult {
  holdingForce: number;        // Total holding force [N]
  requiredForce: number;       // Force needed to resist cutting [N]
  safetyFactor: number;
  isSafe: boolean;
  effectiveSealArea: number;   // After efficiency factor [mm²]
  warnings: string[];
  recommendations: string[];
}

/**
 * Comprehensive workholding validation result
 */
export interface WorkholdingValidationResult {
  overallSafe: boolean;
  overallSafetyFactor: number;
  clampForce: ClampForceResult;
  pullout?: PulloutResult;
  liftoff: LiftoffResult;
  deflection?: DeflectionResult;
  vacuum?: VacuumValidationResult;
  criticalFailureMode: string;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

// ============================================================================
// CONSTANTS & LOOKUP TABLES
// ============================================================================

/**
 * Friction coefficients by workholding type and surface condition
 * Conservative values for safety
 */
const FRICTION_COEFFICIENTS: Record<WorkholdingType, Record<SurfaceCondition, number>> = {
  VICE_SMOOTH: {
    DRY: 0.15,
    OILY: 0.08,
    COOLANT_WET: 0.10,
    RUSTY: 0.20,
    GROUND: 0.12,
    AS_CAST: 0.18
  },
  VICE_SERRATED: {
    DRY: 0.30,
    OILY: 0.20,
    COOLANT_WET: 0.22,
    RUSTY: 0.35,
    GROUND: 0.28,
    AS_CAST: 0.32
  },
  VICE_SOFT_JAWS: {
    DRY: 0.25,
    OILY: 0.15,
    COOLANT_WET: 0.18,
    RUSTY: 0.28,
    GROUND: 0.22,
    AS_CAST: 0.26
  },
  HYDRAULIC_CLAMP: {
    DRY: 0.18,
    OILY: 0.10,
    COOLANT_WET: 0.12,
    RUSTY: 0.22,
    GROUND: 0.15,
    AS_CAST: 0.20
  },
  TOGGLE_CLAMP: {
    DRY: 0.20,
    OILY: 0.12,
    COOLANT_WET: 0.14,
    RUSTY: 0.25,
    GROUND: 0.18,
    AS_CAST: 0.22
  },
  STRAP_CLAMP: {
    DRY: 0.18,
    OILY: 0.10,
    COOLANT_WET: 0.12,
    RUSTY: 0.22,
    GROUND: 0.15,
    AS_CAST: 0.20
  },
  VACUUM_FIXTURE: {
    DRY: 0.0,  // N/A - uses area-based calculation
    OILY: 0.0,
    COOLANT_WET: 0.0,
    RUSTY: 0.0,
    GROUND: 0.0,
    AS_CAST: 0.0
  },
  MAGNETIC_CHUCK: {
    DRY: 0.0,  // N/A - uses magnetic calculation
    OILY: 0.0,
    COOLANT_WET: 0.0,
    RUSTY: 0.0,
    GROUND: 0.0,
    AS_CAST: 0.0
  },
  COLLET: {
    DRY: 0.35,
    OILY: 0.25,
    COOLANT_WET: 0.28,
    RUSTY: 0.40,
    GROUND: 0.32,
    AS_CAST: 0.36
  },
  THREE_JAW_CHUCK: {
    DRY: 0.30,
    OILY: 0.20,
    COOLANT_WET: 0.22,
    RUSTY: 0.35,
    GROUND: 0.28,
    AS_CAST: 0.32
  },
  FOUR_JAW_CHUCK: {
    DRY: 0.30,
    OILY: 0.20,
    COOLANT_WET: 0.22,
    RUSTY: 0.35,
    GROUND: 0.28,
    AS_CAST: 0.32
  },
  FIXTURE_PLATE: {
    DRY: 0.20,
    OILY: 0.12,
    COOLANT_WET: 0.14,
    RUSTY: 0.25,
    GROUND: 0.18,
    AS_CAST: 0.22
  },
  TOMBSTONE: {
    DRY: 0.20,
    OILY: 0.12,
    COOLANT_WET: 0.14,
    RUSTY: 0.25,
    GROUND: 0.18,
    AS_CAST: 0.22
  },
  CUSTOM: {
    DRY: 0.15,  // Conservative default
    OILY: 0.08,
    COOLANT_WET: 0.10,
    RUSTY: 0.18,
    GROUND: 0.12,
    AS_CAST: 0.16
  }
};

/**
 * Dynamic force amplification factors
 * Interrupted cuts and entry/exit create impact loads
 */
const DYNAMIC_FACTORS: Record<string, number> = {
  CONTINUOUS_CUT: 1.0,
  LIGHT_INTERRUPTED: 1.5,
  HEAVY_INTERRUPTED: 2.0,
  SLOTTING: 2.5,
  PLUNGE_MILLING: 2.0,
  DRILLING_ENTRY: 1.3,
  DRILLING_EXIT: 1.8,
  TAPPING: 1.5,
  HIGH_SPEED_ENTRY: 2.5
};

/**
 * Minimum safety factors by application
 */
const SAFETY_FACTORS = {
  ROUGHING: 3.0,
  SEMI_FINISH: 2.5,
  FINISHING: 2.0,
  HIGH_SPEED: 3.5,
  HEAVY_INTERRUPTED: 4.0,
  DRILLING: 2.5,
  TAPPING: 3.0
};

/**
 * Vacuum seal efficiency by type and surface finish
 */
const VACUUM_SEAL_EFFICIENCY: Record<string, Record<string, number>> = {
  O_RING: {
    'Ra<1.6': 0.95,
    'Ra1.6-3.2': 0.90,
    'Ra3.2-6.3': 0.85,
    'Ra>6.3': 0.75
  },
  GASKET: {
    'Ra<1.6': 0.90,
    'Ra1.6-3.2': 0.85,
    'Ra3.2-6.3': 0.80,
    'Ra>6.3': 0.70
  },
  FOAM: {
    'Ra<1.6': 0.85,
    'Ra1.6-3.2': 0.80,
    'Ra3.2-6.3': 0.75,
    'Ra>6.3': 0.65
  },
  MACHINED_CHANNEL: {
    'Ra<1.6': 0.92,
    'Ra1.6-3.2': 0.88,
    'Ra3.2-6.3': 0.82,
    'Ra>6.3': 0.72
  }
};

/**
 * Magnetic permeability of common materials
 */
const MAGNETIC_PERMEABILITY: Record<string, number> = {
  'CARBON_STEEL': 100,
  'LOW_ALLOY_STEEL': 80,
  'CAST_IRON': 60,
  'TOOL_STEEL': 50,
  'STAINLESS_400': 40,
  'STAINLESS_300': 1.0,  // Non-magnetic
  'ALUMINUM': 1.0,        // Non-magnetic
  'COPPER': 1.0,          // Non-magnetic
  'TITANIUM': 1.0,        // Non-magnetic
  'NICKEL_ALLOY': 1.5
};

// ============================================================================
// EXTRACTED SOURCE FILE CATALOG — MEDIUM-priority workholding modules
// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (27-file batch)
// ============================================================================

export const WORKHOLDING_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
}> = {
  PRISM_FIXTURE_DATABASE: {
    filename: "PRISM_FIXTURE_DATABASE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 325,
    safety_class: "MEDIUM",
    description: "Fixture database — catalog of vises, chucks, collets, vacuum fixtures, and magnetic chucks with dimensional specs, clamping-force ratings, and suitability matrices.",
  },
  PRISM_WORKHOLDING_DATABASE: {
    filename: "PRISM_WORKHOLDING_DATABASE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 259,
    safety_class: "MEDIUM",
    description: "Workholding database — friction coefficients, jaw-material pairings, surface-condition modifiers, and clamping-force lookup tables for safety validation.",
  },
  PRISM_WORKHOLDING_ENGINE: {
    filename: "PRISM_WORKHOLDING_ENGINE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 119,
    safety_class: "MEDIUM",
    description: "Workholding engine (extracted JS) — legacy implementation of clamping-force, pull-out resistance, and lift-off moment calculations prior to TypeScript rewrite.",
  },
};

// ============================================================================
// WORKHOLDING ENGINE CLASS
// ============================================================================

class WorkholdingEngine {
  
  // ==========================================================================
  // CLAMP FORCE CALCULATIONS
  // ==========================================================================

  /**
   * Calculate required clamp force to resist cutting forces
   * 
   * Formula: F_clamp = (F_cutting × SafetyFactor × DynamicFactor) / μ
   * 
   * @param cuttingForces - Forces from machining operation
   * @param device - Workholding device specification
   * @param operation - Machining operation details
   * @param safetyFactorOverride - Optional safety factor override
   * @returns Clamp force calculation result
   */
  calculateClampForceRequired(
    cuttingForces: CuttingForces,
    device: WorkholdingDevice,
    operation: MachiningOperation,
    safetyFactorOverride?: number
  ): ClampForceResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get friction coefficient
    const surfaceCondition = device.surfaceCondition || 'DRY';
    let mu = device.frictionCoefficient;
    
    if (!mu) {
      mu = FRICTION_COEFFICIENTS[device.type]?.[surfaceCondition];
      if (!mu) {
        mu = 0.12; // Very conservative default
        warnings.push(`Unknown workholding type/condition, using conservative μ=${mu}`);
      }
    }

    // Validate friction coefficient
    if (mu < 0.05) {
      warnings.push(`Extremely low friction coefficient (${mu}). Verify surface condition.`);
    }

    // Determine dynamic factor
    let dynamicFactor = operation.dynamicFactor || 1.0;
    if (!operation.dynamicFactor) {
      if (operation.isInterrupted) {
        dynamicFactor = DYNAMIC_FACTORS.HEAVY_INTERRUPTED;
      } else if (operation.operationType === 'DRILLING') {
        dynamicFactor = DYNAMIC_FACTORS.DRILLING_ENTRY;
      } else if (operation.operationType === 'TAPPING') {
        dynamicFactor = DYNAMIC_FACTORS.TAPPING;
      } else {
        dynamicFactor = DYNAMIC_FACTORS.CONTINUOUS_CUT;
      }
    }

    // Determine safety factor
    let safetyFactor = safetyFactorOverride || SAFETY_FACTORS.ROUGHING;
    if (!safetyFactorOverride) {
      if (operation.isInterrupted) {
        safetyFactor = SAFETY_FACTORS.HEAVY_INTERRUPTED;
      } else if (operation.operationType === 'TAPPING') {
        safetyFactor = SAFETY_FACTORS.TAPPING;
      } else if (operation.operationType === 'DRILLING') {
        safetyFactor = SAFETY_FACTORS.DRILLING;
      }
    }

    // Calculate resultant cutting force in plane perpendicular to clamp
    // For horizontal clamping, we resist Ff (feed) and Fp (radial)
    // Fc (tangential) is typically vertical, resisted by part weight + friction
    const F_cutting = Math.sqrt(
      Math.pow(cuttingForces.Ff, 2) + 
      Math.pow(cuttingForces.Fp, 2)
    );

    // Calculate required clamp force
    // F_clamp = F_cutting × SafetyFactor × DynamicFactor / μ
    const requiredClampForce = (F_cutting * safetyFactor * dynamicFactor) / mu;

    // Get applied clamp force
    const appliedClampForce = device.currentClampForce || device.maxClampForce || 0;
    
    // Check if max clamp force is sufficient
    if (device.maxClampForce && requiredClampForce > device.maxClampForce) {
      warnings.push(
        `Required clamp force (${requiredClampForce.toFixed(0)}N) exceeds ` +
        `device maximum (${device.maxClampForce}N)`
      );
      recommendations.push('Consider using higher capacity workholding or reducing cutting forces');
    }

    // Calculate achieved safety factor
    const achievedSafetyFactor = appliedClampForce > 0 
      ? (appliedClampForce * mu) / (F_cutting * dynamicFactor)
      : 0;

    const isSafe = achievedSafetyFactor >= safetyFactor;

    if (!isSafe) {
      warnings.push(
        `UNSAFE: Achieved safety factor (${achievedSafetyFactor.toFixed(2)}) ` +
        `below minimum (${safetyFactor})`
      );
      recommendations.push(
        `Increase clamp force to at least ${requiredClampForce.toFixed(0)}N`
      );
    }

    // Additional warnings
    if (surfaceCondition === 'OILY' || surfaceCondition === 'COOLANT_WET') {
      warnings.push('Wet/oily surface reduces friction. Ensure adequate clamping.');
    }

    if (dynamicFactor > 2.0) {
      recommendations.push(
        'High dynamic factor due to interrupted cutting. Consider climb milling to reduce impact.'
      );
    }

    return {
      requiredClampForce: Math.round(requiredClampForce),
      appliedClampForce: Math.round(appliedClampForce),
      safetyFactor: parseFloat(achievedSafetyFactor.toFixed(2)),
      minimumSafetyFactor: safetyFactor,
      isSafe,
      frictionCoefficient: mu,
      dynamicFactor,
      warnings,
      recommendations,
      calculation: {
        cuttingForceUsed: Math.round(F_cutting),
        frictionUsed: mu,
        safetyFactorUsed: safetyFactor,
        formula: `F_clamp = (${F_cutting.toFixed(0)} × ${safetyFactor} × ${dynamicFactor}) / ${mu} = ${requiredClampForce.toFixed(0)}N`
      }
    };
  }

  // ==========================================================================
  // PULL-OUT RESISTANCE
  // ==========================================================================

  /**
   * Calculate pull-out resistance for drilling/tapping operations
   * 
   * Pull-out can occur when axial drilling force exceeds friction resistance
   * Critical for: deep drilling, tapping, boring
   * 
   * @param axialForce - Axial force from operation [N]
   * @param clampConfig - Clamping configuration
   * @param device - Workholding device
   * @param safetyFactor - Minimum safety factor (default 2.5)
   * @returns Pull-out resistance result
   */
  calculatePulloutResistance(
    axialForce: number,
    clampConfig: ClampConfiguration,
    device: WorkholdingDevice,
    safetyFactor: number = 2.5
  ): PulloutResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get friction coefficient
    const surfaceCondition = device.surfaceCondition || 'DRY';
    let mu = device.frictionCoefficient || 
             FRICTION_COEFFICIENTS[device.type]?.[surfaceCondition] || 
             0.12;

    // Calculate total normal force from all clamps
    let totalNormalForce = 0;
    for (const clamp of clampConfig.clampLocations) {
      // Only clamps applying force perpendicular to pull direction contribute
      if (clamp.forceDirection === 'DOWN' || clamp.forceDirection === 'SIDE') {
        totalNormalForce += clamp.clampForce;
      } else if (clamp.forceDirection === 'ANGLED' && clamp.forceAngle) {
        // Component perpendicular to axial direction
        totalNormalForce += clamp.clampForce * Math.cos(clamp.forceAngle * Math.PI / 180);
      }
    }

    // Resistance force = μ × N_total × 2 (friction on both sides typically)
    const numberOfFrictionSurfaces = device.numberOfJaws || 2;
    const resistanceForce = mu * totalNormalForce * numberOfFrictionSurfaces;

    // Calculate achieved safety factor
    const achievedSafetyFactor = axialForce > 0 ? resistanceForce / axialForce : Infinity;
    const isSafe = achievedSafetyFactor >= safetyFactor;

    if (!isSafe) {
      warnings.push(
        `PULL-OUT RISK: Safety factor (${achievedSafetyFactor.toFixed(2)}) ` +
        `below minimum (${safetyFactor})`
      );
      const requiredNormalForce = (axialForce * safetyFactor) / (mu * numberOfFrictionSurfaces);
      recommendations.push(
        `Increase total clamping force to at least ${requiredNormalForce.toFixed(0)}N`
      );
      recommendations.push('Consider using workstop/positive stop against axial force');
    }

    if (axialForce > 5000) {
      warnings.push('High axial force. Consider peck drilling or reduce feed rate.');
    }

    return {
      axialForceApplied: Math.round(axialForce),
      resistanceForce: Math.round(resistanceForce),
      safetyFactor: parseFloat(achievedSafetyFactor.toFixed(2)),
      isSafe,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // LIFT-OFF MOMENT ANALYSIS
  // ==========================================================================

  /**
   * Analyze lift-off moment to ensure rotational stability
   * 
   * Lift-off occurs when cutting moment exceeds clamping resistance moment
   * Part rotates around pivot point (typically edge of support)
   * 
   * @param cuttingForces - Forces from machining
   * @param operation - Machining operation details
   * @param clampConfig - Clamping configuration
   * @param workpiece - Workpiece specification
   * @param safetyFactor - Minimum safety factor (default 2.0)
   * @returns Lift-off analysis result
   */
  analyzeLiftoffMoment(
    cuttingForces: CuttingForces,
    operation: MachiningOperation,
    clampConfig: ClampConfiguration,
    workpiece: WorkpieceSpec,
    safetyFactor: number = 2.0
  ): LiftoffResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Determine pivot point (edge of support closest to cutting)
    const cutPoint = operation.forceApplicationPoint;
    let pivotPoint = { x: 0, y: 0, z: 0 };
    
    // Find support closest to cutting point
    if (clampConfig.supportLocations && clampConfig.supportLocations.length > 0) {
      let minDist = Infinity;
      for (const support of clampConfig.supportLocations) {
        const dist = Math.sqrt(
          Math.pow(support.x - cutPoint.x, 2) +
          Math.pow(support.y - cutPoint.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          pivotPoint = { x: support.x, y: support.y, z: support.z };
        }
      }
    } else {
      // Default: assume pivot at part edge
      pivotPoint = { x: 0, y: 0, z: 0 };
    }

    // Calculate moment arm from pivot to cutting point
    const momentArmX = cutPoint.x - pivotPoint.x;
    const momentArmY = cutPoint.y - pivotPoint.y;
    const momentArm = Math.sqrt(momentArmX * momentArmX + momentArmY * momentArmY);

    // Calculate cutting moment (force × arm)
    // Main cutting force Fc typically acts to lift the part
    const cuttingMoment = cuttingForces.Fc * (momentArm / 1000); // Convert to Nm

    // Calculate resisting moment from clamps
    let resistingMoment = 0;
    let criticalDirection = '';
    
    for (const clamp of clampConfig.clampLocations) {
      // Distance from clamp to pivot
      const clampArmX = clamp.x - pivotPoint.x;
      const clampArmY = clamp.y - pivotPoint.y;
      const clampArm = Math.sqrt(clampArmX * clampArmX + clampArmY * clampArmY);
      
      // Clamp force creates resisting moment
      resistingMoment += clamp.clampForce * (clampArm / 1000);
    }

    // Add part weight contribution if horizontal
    if (clampConfig.partOrientation === 'HORIZONTAL' && workpiece.weight) {
      const partWeight = workpiece.weight * 9.81; // N
      const cogArm = workpiece.length / 2 - pivotPoint.x; // Approximate
      resistingMoment += partWeight * (cogArm / 1000);
    }

    // Calculate achieved safety factor
    const achievedSafetyFactor = cuttingMoment > 0 
      ? resistingMoment / cuttingMoment 
      : Infinity;
    const isSafe = achievedSafetyFactor >= safetyFactor;

    // Determine critical direction
    if (momentArmX > momentArmY) {
      criticalDirection = 'X-axis rotation (about Y)';
    } else {
      criticalDirection = 'Y-axis rotation (about X)';
    }

    if (!isSafe) {
      warnings.push(
        `LIFT-OFF RISK: Safety factor (${achievedSafetyFactor.toFixed(2)}) ` +
        `below minimum (${safetyFactor})`
      );
      recommendations.push('Move clamps farther from pivot point');
      recommendations.push('Increase clamp force');
      recommendations.push('Add support closer to cutting location');
      recommendations.push('Reduce cutting forces (lower feed/depth)');
    }

    if (momentArm > 100) {
      warnings.push(
        `Large moment arm (${momentArm.toFixed(0)}mm). ` +
        `Consider supporting part closer to cutting location.`
      );
    }

    return {
      cuttingMoment: parseFloat(cuttingMoment.toFixed(2)),
      resistingMoment: parseFloat(resistingMoment.toFixed(2)),
      pivotPoint,
      safetyFactor: parseFloat(achievedSafetyFactor.toFixed(2)),
      isSafe,
      criticalDirection,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // PART DEFLECTION ANALYSIS
  // ==========================================================================

  /**
   * Calculate part deflection under clamping and cutting forces
   * 
   * Uses beam theory approximations:
   * - Cantilever: δ = FL³ / (3EI)
   * - Simply supported: δ = FL³ / (48EI)
   * - Fixed-fixed: δ = FL³ / (192EI)
   * 
   * @param cuttingForces - Forces from machining
   * @param operation - Machining operation
   * @param workpiece - Workpiece specification
   * @param clampConfig - Clamping configuration
   * @param tolerance - Part tolerance for allowable deflection [mm]
   * @returns Deflection analysis result
   */
  calculatePartDeflection(
    cuttingForces: CuttingForces,
    operation: MachiningOperation,
    workpiece: WorkpieceSpec,
    clampConfig: ClampConfiguration,
    tolerance: number = 0.05
  ): DeflectionResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Determine beam model based on support configuration
    let beamModel = 'CANTILEVER';
    let deflectionCoefficient = 3; // For FL³/(3EI)
    
    const numSupports = clampConfig.supportLocations?.length || 0;
    const numClamps = clampConfig.clampLocations.length;
    
    if (numSupports >= 2 || numClamps >= 2) {
      beamModel = 'SIMPLY_SUPPORTED';
      deflectionCoefficient = 48;
    }
    if (numClamps >= 3 && numSupports >= 2) {
      beamModel = 'FIXED_FIXED';
      deflectionCoefficient = 192;
    }

    // Calculate moment of inertia
    // For rectangular section: I = bh³/12
    const b = workpiece.width;
    const h = workpiece.wallThickness || workpiece.height;
    const I = (b * Math.pow(h, 3)) / 12; // mm⁴

    // Elastic modulus (convert GPa to N/mm²)
    const E = workpiece.elasticModulus * 1000; // N/mm²

    // Span length (distance between supports or to free end)
    let L = workpiece.length;
    if (clampConfig.supportLocations && clampConfig.supportLocations.length >= 2) {
      // Distance between outermost supports
      const xs = clampConfig.supportLocations.map(s => s.x);
      L = Math.max(...xs) - Math.min(...xs);
    }

    // Force causing deflection (typically radial/passive force)
    const F = cuttingForces.Fp || cuttingForces.Fc * 0.4;

    // Calculate deflection
    // δ = F × L³ / (coeff × E × I)
    const deflection = (F * Math.pow(L, 3)) / (deflectionCoefficient * E * I);

    // Allowable deflection (typically 20-50% of tolerance)
    const allowableDeflection = tolerance * 0.3;

    const isSafeDeflection = deflection <= allowableDeflection;

    // Calculate stress at clamp point (bending stress)
    // σ = M × y / I = (F × L × h/2) / I
    const M = F * L; // Maximum moment at fixed end
    const y = h / 2; // Distance to outer fiber
    const stressAtClamp = (M * y) / I; // MPa

    // Yield safety factor
    const yieldStrength = workpiece.yieldStrength || 250; // Default mild steel
    const yieldSafetyFactor = yieldStrength / stressAtClamp;

    if (!isSafeDeflection) {
      warnings.push(
        `EXCESSIVE DEFLECTION: ${deflection.toFixed(3)}mm exceeds ` +
        `allowable ${allowableDeflection.toFixed(3)}mm`
      );
      recommendations.push('Add intermediate supports');
      recommendations.push('Reduce cutting forces');
      recommendations.push('Use backing plate or support jaws');
    }

    if (stressAtClamp > yieldStrength * 0.6) {
      warnings.push(
        `High stress at clamp point (${stressAtClamp.toFixed(0)}MPa). ` +
        `Risk of permanent deformation.`
      );
      recommendations.push('Increase clamping area');
      recommendations.push('Use soft jaws to distribute load');
    }

    if (workpiece.wallThickness && workpiece.wallThickness < 3) {
      warnings.push('Thin-walled part. Extra care required for clamping.');
      recommendations.push('Consider vacuum fixture or custom soft jaws');
    }

    // Deflection location (typically at mid-span or free end)
    const deflectionLocation = beamModel === 'CANTILEVER'
      ? { x: L, y: workpiece.width / 2, z: workpiece.height }
      : { x: L / 2, y: workpiece.width / 2, z: workpiece.height };

    return {
      maxDeflection: parseFloat(deflection.toFixed(4)),
      deflectionLocation,
      allowableDeflection: parseFloat(allowableDeflection.toFixed(4)),
      isSafe: isSafeDeflection && yieldSafetyFactor > 1.5,
      stressAtClamp: parseFloat(stressAtClamp.toFixed(1)),
      yieldSafetyFactor: parseFloat(yieldSafetyFactor.toFixed(2)),
      warnings,
      recommendations,
      beamModel
    };
  }

  // ==========================================================================
  // VACUUM FIXTURE VALIDATION
  // ==========================================================================

  /**
   * Validate vacuum fixture holding capability
   * 
   * Formula: F_hold = P_vacuum × A_seal × η
   * 
   * @param vacuumSpec - Vacuum fixture specification
   * @param cuttingForces - Forces to resist
   * @param safetyFactor - Minimum safety factor (default 2.0)
   * @returns Vacuum validation result
   */
  validateVacuumFixture(
    vacuumSpec: VacuumFixtureSpec,
    cuttingForces: CuttingForces,
    safetyFactor: number = 2.0
  ): VacuumValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get seal efficiency based on type and surface finish
    let efficiency = vacuumSpec.sealEfficiency;
    if (!efficiency && vacuumSpec.surfaceFinishRa) {
      const sealType = vacuumSpec.sealType;
      let finishCategory = 'Ra<1.6';
      if (vacuumSpec.surfaceFinishRa > 6.3) finishCategory = 'Ra>6.3';
      else if (vacuumSpec.surfaceFinishRa > 3.2) finishCategory = 'Ra3.2-6.3';
      else if (vacuumSpec.surfaceFinishRa > 1.6) finishCategory = 'Ra1.6-3.2';
      
      efficiency = VACUUM_SEAL_EFFICIENCY[sealType]?.[finishCategory] || 0.75;
    }
    efficiency = efficiency || 0.80;

    // Calculate effective seal area
    const effectiveSealArea = vacuumSpec.sealArea * efficiency;

    // Calculate holding force
    // F = P × A (P in kPa = kN/m², A in mm² → convert)
    const holdingForce = vacuumSpec.vacuumPressure * (effectiveSealArea / 1000); // N

    // Calculate resultant force to resist (horizontal forces)
    const resultantForce = Math.sqrt(
      Math.pow(cuttingForces.Ff, 2) + 
      Math.pow(cuttingForces.Fp, 2)
    );

    const requiredForce = resultantForce * safetyFactor;
    const achievedSafetyFactor = holdingForce / resultantForce;
    const isSafe = achievedSafetyFactor >= safetyFactor;

    if (!isSafe) {
      warnings.push(
        `INSUFFICIENT VACUUM HOLDING: Safety factor (${achievedSafetyFactor.toFixed(2)}) ` +
        `below minimum (${safetyFactor})`
      );
      const requiredArea = (requiredForce * 1000) / (vacuumSpec.vacuumPressure * efficiency);
      recommendations.push(
        `Increase seal area to at least ${requiredArea.toFixed(0)}mm²`
      );
      recommendations.push('Improve surface finish for better seal');
      recommendations.push('Check vacuum system for leaks');
    }

    if (vacuumSpec.vacuumPressure < 80) {
      warnings.push(`Low vacuum pressure (${vacuumSpec.vacuumPressure}kPa). Standard is 85kPa.`);
      recommendations.push('Check vacuum pump capacity and lines');
    }

    if (efficiency < 0.80) {
      warnings.push(`Low seal efficiency (${(efficiency * 100).toFixed(0)}%)`);
      recommendations.push('Improve part surface finish or use better seal type');
    }

    // Vertical force check (part lifting)
    if (cuttingForces.Fc > holdingForce * 0.5) {
      warnings.push('High vertical cutting force may cause part lift-off');
      recommendations.push('Reduce axial depth of cut');
    }

    return {
      holdingForce: Math.round(holdingForce),
      requiredForce: Math.round(requiredForce),
      safetyFactor: parseFloat(achievedSafetyFactor.toFixed(2)),
      isSafe,
      effectiveSealArea: Math.round(effectiveSealArea),
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // MAGNETIC CHUCK CALCULATIONS
  // ==========================================================================

  /**
   * Calculate magnetic chuck holding force
   * 
   * Factors affecting holding:
   * - Part material permeability
   * - Part thickness (thin parts = weaker holding)
   * - Air gap (surface finish)
   * - Contact area
   * 
   * @param chuckSpec - Magnetic chuck specification
   * @param cuttingForces - Forces to resist
   * @param safetyFactor - Minimum safety factor (default 2.5)
   * @returns Holding force and safety assessment
   */
  calculateMagneticHolding(
    chuckSpec: MagneticChuckSpec,
    cuttingForces: CuttingForces,
    safetyFactor: number = 2.5
  ): VacuumValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Base holding force from chuck rating
    const ratedForce = chuckSpec.holdingForce; // N/cm²
    const contactAreaCm2 = chuckSpec.contactArea / 100; // Convert mm² to cm²
    
    let baseHoldingForce = ratedForce * contactAreaCm2;

    // Material permeability factor
    // Non-magnetic materials cannot be held!
    if (chuckSpec.partPermeability <= 1.0) {
      warnings.push('MATERIAL IS NON-MAGNETIC - Cannot use magnetic chuck');
      return {
        holdingForce: 0,
        requiredForce: Math.round(Math.sqrt(
          Math.pow(cuttingForces.Ff, 2) + Math.pow(cuttingForces.Fp, 2)
        )),
        safetyFactor: 0,
        isSafe: false,
        effectiveSealArea: 0,
        warnings,
        recommendations: ['Use vice, vacuum, or mechanical clamping instead']
      };
    }

    // Permeability derating (normalized to carbon steel = 100)
    const permeabilityFactor = Math.min(1.0, chuckSpec.partPermeability / 100);
    baseHoldingForce *= permeabilityFactor;

    // Thickness derating (thin parts = weaker magnetic circuit)
    // Full force above 10mm thickness, linear derating below
    let thicknessFactor = 1.0;
    if (chuckSpec.partThickness < 10) {
      thicknessFactor = chuckSpec.partThickness / 10;
      warnings.push(
        `Thin part (${chuckSpec.partThickness}mm) reduces magnetic holding by ` +
        `${((1 - thicknessFactor) * 100).toFixed(0)}%`
      );
    }
    baseHoldingForce *= thicknessFactor;

    // Air gap derating (surface finish)
    let airGapFactor = 1.0;
    if (chuckSpec.airGap && chuckSpec.airGap > 0) {
      // Force drops significantly with air gap
      airGapFactor = 1 / (1 + chuckSpec.airGap * 2);
      warnings.push(`Air gap (${chuckSpec.airGap}mm) significantly reduces holding force`);
    }
    baseHoldingForce *= airGapFactor;

    const holdingForce = baseHoldingForce;

    // Calculate resultant cutting force
    const resultantForce = Math.sqrt(
      Math.pow(cuttingForces.Ff, 2) + 
      Math.pow(cuttingForces.Fp, 2)
    );

    const achievedSafetyFactor = holdingForce / resultantForce;
    const isSafe = achievedSafetyFactor >= safetyFactor;

    if (!isSafe) {
      warnings.push(
        `INSUFFICIENT MAGNETIC HOLDING: Safety factor (${achievedSafetyFactor.toFixed(2)}) ` +
        `below minimum (${safetyFactor})`
      );
      recommendations.push('Increase contact area');
      recommendations.push('Improve part surface finish (reduce air gap)');
      recommendations.push('Reduce cutting forces');
    }

    // Check for part slide (horizontal forces vs friction)
    // Magnetic force acts vertically, horizontal resistance is μ × F_magnetic
    const magneticFriction = 0.25; // Typical steel on chuck
    const slideResistance = holdingForce * magneticFriction;
    const horizontalForce = Math.sqrt(
      Math.pow(cuttingForces.Ff, 2) + 
      Math.pow(cuttingForces.Fp, 2)
    );
    
    if (horizontalForce > slideResistance) {
      warnings.push('PART SLIDE RISK: Horizontal forces exceed friction resistance');
      recommendations.push('Add side stops or workstops');
      recommendations.push('Reduce cutting forces');
    }

    return {
      holdingForce: Math.round(holdingForce),
      requiredForce: Math.round(resultantForce * safetyFactor),
      safetyFactor: parseFloat(achievedSafetyFactor.toFixed(2)),
      isSafe,
      effectiveSealArea: Math.round(chuckSpec.contactArea * permeabilityFactor * thicknessFactor),
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // COMPREHENSIVE VALIDATION
  // ==========================================================================

  /**
   * Perform comprehensive workholding validation
   * 
   * Checks all failure modes:
   * - Clamp force adequacy
   * - Pull-out resistance (if drilling/tapping)
   * - Lift-off moment
   * - Part deflection
   * - Vacuum/magnetic if applicable
   * 
   * @param operation - Machining operation
   * @param workpiece - Workpiece specification
   * @param clampConfig - Clamping configuration
   * @param options - Additional options
   * @returns Comprehensive validation result
   */
  validateWorkholding(
    operation: MachiningOperation,
    workpiece: WorkpieceSpec,
    clampConfig: ClampConfiguration,
    options?: {
      tolerance?: number;
      vacuumSpec?: VacuumFixtureSpec;
      magneticSpec?: MagneticChuckSpec;
    }
  ): WorkholdingValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let overallSafe = true;
    let criticalFailureMode = 'NONE';
    let minSafetyFactor = Infinity;

    // 1. Clamp Force Check
    const clampResult = this.calculateClampForceRequired(
      operation.cuttingForces,
      clampConfig.device,
      operation
    );
    
    if (!clampResult.isSafe) {
      overallSafe = false;
      if (clampResult.safetyFactor < minSafetyFactor) {
        minSafetyFactor = clampResult.safetyFactor;
        criticalFailureMode = 'CLAMP_FORCE_INSUFFICIENT';
      }
    }
    warnings.push(...clampResult.warnings);
    recommendations.push(...clampResult.recommendations);

    // 2. Pull-out Check (for drilling/tapping)
    let pulloutResult: PulloutResult | undefined;
    if (operation.operationType === 'DRILLING' || 
        operation.operationType === 'TAPPING' ||
        operation.operationType === 'BORING') {
      const axialForce = operation.cuttingForces.Ff * 1.5; // Conservative
      pulloutResult = this.calculatePulloutResistance(
        axialForce,
        clampConfig,
        clampConfig.device
      );
      
      if (!pulloutResult.isSafe) {
        overallSafe = false;
        if (pulloutResult.safetyFactor < minSafetyFactor) {
          minSafetyFactor = pulloutResult.safetyFactor;
          criticalFailureMode = 'PULLOUT_RISK';
        }
      }
      warnings.push(...pulloutResult.warnings);
      recommendations.push(...pulloutResult.recommendations);
    }

    // 3. Lift-off Moment Check
    const liftoffResult = this.analyzeLiftoffMoment(
      operation.cuttingForces,
      operation,
      clampConfig,
      workpiece
    );
    
    if (!liftoffResult.isSafe) {
      overallSafe = false;
      if (liftoffResult.safetyFactor < minSafetyFactor) {
        minSafetyFactor = liftoffResult.safetyFactor;
        criticalFailureMode = 'LIFTOFF_MOMENT';
      }
    }
    warnings.push(...liftoffResult.warnings);
    recommendations.push(...liftoffResult.recommendations);

    // 4. Deflection Check (if thin-walled or tight tolerance)
    let deflectionResult: DeflectionResult | undefined;
    if (workpiece.wallThickness || options?.tolerance) {
      deflectionResult = this.calculatePartDeflection(
        operation.cuttingForces,
        operation,
        workpiece,
        clampConfig,
        options?.tolerance || 0.05
      );
      
      if (!deflectionResult.isSafe) {
        overallSafe = false;
        criticalFailureMode = 'EXCESSIVE_DEFLECTION';
      }
      warnings.push(...deflectionResult.warnings);
      recommendations.push(...deflectionResult.recommendations);
    }

    // 5. Vacuum/Magnetic Check
    let vacuumResult: VacuumValidationResult | undefined;
    if (options?.vacuumSpec) {
      vacuumResult = this.validateVacuumFixture(
        options.vacuumSpec,
        operation.cuttingForces
      );
      if (!vacuumResult.isSafe) {
        overallSafe = false;
        if (vacuumResult.safetyFactor < minSafetyFactor) {
          minSafetyFactor = vacuumResult.safetyFactor;
          criticalFailureMode = 'VACUUM_INSUFFICIENT';
        }
      }
      warnings.push(...vacuumResult.warnings);
      recommendations.push(...vacuumResult.recommendations);
    }

    if (options?.magneticSpec) {
      vacuumResult = this.calculateMagneticHolding(
        options.magneticSpec,
        operation.cuttingForces
      );
      if (!vacuumResult.isSafe) {
        overallSafe = false;
        if (vacuumResult.safetyFactor < minSafetyFactor) {
          minSafetyFactor = vacuumResult.safetyFactor;
          criticalFailureMode = 'MAGNETIC_INSUFFICIENT';
        }
      }
      warnings.push(...vacuumResult.warnings);
      recommendations.push(...vacuumResult.recommendations);
    }

    // Determine overall safety factor
    const safetyFactors = [
      clampResult.safetyFactor,
      pulloutResult?.safetyFactor,
      liftoffResult.safetyFactor,
      deflectionResult?.yieldSafetyFactor,
      vacuumResult?.safetyFactor
    ].filter((sf): sf is number => sf !== undefined && isFinite(sf));

    const overallSafetyFactor = Math.min(...safetyFactors);

    // Deduplicate warnings and recommendations
    const uniqueWarnings = [...new Set(warnings)];
    const uniqueRecommendations = [...new Set(recommendations)];

    return {
      overallSafe,
      overallSafetyFactor: parseFloat(overallSafetyFactor.toFixed(2)),
      clampForce: clampResult,
      pullout: pulloutResult,
      liftoff: liftoffResult,
      deflection: deflectionResult,
      vacuum: vacuumResult,
      criticalFailureMode,
      warnings: uniqueWarnings,
      recommendations: uniqueRecommendations,
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get friction coefficient for workholding type
   */
  getFrictionCoefficient(
    type: WorkholdingType, 
    condition: SurfaceCondition
  ): number {
    return FRICTION_COEFFICIENTS[type]?.[condition] || 0.12;
  }

  /**
   * Get dynamic factor for operation type
   */
  getDynamicFactor(operationType: string, isInterrupted: boolean): number {
    if (isInterrupted) return DYNAMIC_FACTORS.HEAVY_INTERRUPTED;
    
    switch (operationType) {
      case 'DRILLING': return DYNAMIC_FACTORS.DRILLING_ENTRY;
      case 'TAPPING': return DYNAMIC_FACTORS.TAPPING;
      case 'SLOTTING': return DYNAMIC_FACTORS.SLOTTING;
      default: return DYNAMIC_FACTORS.CONTINUOUS_CUT;
    }
  }

  /**
   * Get recommended safety factor for operation
   */
  getRecommendedSafetyFactor(operationType: string, isInterrupted: boolean): number {
    if (isInterrupted) return SAFETY_FACTORS.HEAVY_INTERRUPTED;
    
    switch (operationType) {
      case 'DRILLING': return SAFETY_FACTORS.DRILLING;
      case 'TAPPING': return SAFETY_FACTORS.TAPPING;
      default: return SAFETY_FACTORS.ROUGHING;
    }
  }

  /**
   * Get magnetic permeability for material
   */
  getMagneticPermeability(material: string): number {
    const normalized = material.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return MAGNETIC_PERMEABILITY[normalized] || 1.0;
  }

  /**
   * Estimate cutting forces from parameters (simplified)
   * For detailed forces, use ManufacturingCalculations engine
   */
  estimateCuttingForces(
    kc1_1: number,      // Specific cutting force [N/mm²]
    mc: number,         // Kienzle exponent
    ap: number,         // Axial depth [mm]
    ae: number,         // Radial depth [mm]
    fz: number,         // Feed per tooth [mm]
    D: number,          // Tool diameter [mm]
    z: number = 4       // Number of teeth
  ): CuttingForces {
    // Chip thickness (average)
    const h = fz * Math.sqrt(ae / D);
    
    // Chip width (engaged arc)
    const phi = Math.acos(1 - 2 * ae / D);
    const b = ap;
    
    // Kienzle cutting force
    const kc = kc1_1 * Math.pow(h, -mc);
    const Fc = kc * h * b * z * (phi / (2 * Math.PI));
    
    // Feed and radial forces (empirical ratios)
    const Ff = Fc * 0.4;
    const Fp = Fc * 0.5;
    
    return {
      Fc: Math.round(Fc),
      Ff: Math.round(Ff),
      Fp: Math.round(Fp),
      F_resultant: Math.round(Math.sqrt(Fc*Fc + Ff*Ff + Fp*Fp))
    };
  }

  // ==========================================================================
  // SOURCE FILE CATALOG ACCESSORS
  // ==========================================================================

  /**
   * Return the full extracted-source-file catalog for workholding modules.
   */
  static getSourceFileCatalog(): typeof WORKHOLDING_SOURCE_FILE_CATALOG {
    return WORKHOLDING_SOURCE_FILE_CATALOG;
  }

  /**
   * Enumerate catalog entries with aggregate stats.
   */
  catalogSourceFiles(): {
    totalFiles: number;
    totalLines: number;
    byCategory: Record<string, string[]>;
    entries: typeof WORKHOLDING_SOURCE_FILE_CATALOG;
  } {
    const entries = WORKHOLDING_SOURCE_FILE_CATALOG;
    const keys = Object.keys(entries);

    const byCategory: Record<string, string[]> = {};
    let totalLines = 0;

    for (const key of keys) {
      const entry = entries[key as keyof typeof entries];
      totalLines += entry.lines;
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry.filename);
    }

    return { totalFiles: keys.length, totalLines, byCategory, entries };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const workholdingEngine = new WorkholdingEngine();

// Export types and engine
export { WorkholdingEngine };
