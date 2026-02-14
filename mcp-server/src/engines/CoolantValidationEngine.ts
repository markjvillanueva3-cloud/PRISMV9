/**
 * PRISM Manufacturing Intelligence - Coolant Flow Validation Engine
 * Ensures adequate cooling and chip evacuation for safe machining
 * 
 * SAFETY CRITICAL: Inadequate coolant = tool failure, fire, thermal damage
 * 
 * Models Implemented:
 * - Flow rate requirements by operation
 * - Through-spindle coolant (TSC) validation
 * - Chip evacuation for deep holes
 * - MQL (Minimum Quantity Lubrication) parameters
 * - Thermal management validation
 * 
 * @version 1.0.0
 * @module CoolantValidationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Coolant delivery method
 */
export type CoolantDelivery = 
  | 'FLOOD'              // External flood coolant
  | 'THROUGH_SPINDLE'    // Through-spindle coolant (TSC)
  | 'THROUGH_TOOL'       // Through-tool coolant
  | 'MQL'                // Minimum Quantity Lubrication
  | 'AIR_BLAST'          // Compressed air only
  | 'CRYOGENIC'          // LN2 or CO2 cooling
  | 'DRY';               // No coolant

/**
 * Coolant type
 */
export type CoolantType = 
  | 'WATER_SOLUBLE'      // Water-based emulsion
  | 'SEMI_SYNTHETIC'     // Part synthetic, part oil
  | 'FULL_SYNTHETIC'     // Fully synthetic
  | 'STRAIGHT_OIL'       // Neat cutting oil
  | 'MQL_OIL'            // MQL-specific oil
  | 'COMPRESSED_AIR'
  | 'LIQUID_NITROGEN'
  | 'LIQUID_CO2';

/**
 * Operation type for coolant requirements
 */
export type CoolantOperation = 
  | 'MILLING_GENERAL'
  | 'MILLING_HSM'
  | 'DRILLING_SHALLOW'   // L/D < 3
  | 'DRILLING_DEEP'      // L/D 3-10
  | 'DRILLING_GUNDRILLING' // L/D > 10
  | 'TAPPING'
  | 'REAMING'
  | 'BORING'
  | 'TURNING'
  | 'GRINDING';

/**
 * Coolant system specification
 */
export interface CoolantSystem {
  delivery: CoolantDelivery;
  coolantType: CoolantType;
  flowRate: number;           // Available flow [L/min]
  pressure: number;           // Available pressure [bar]
  concentration?: number;     // Coolant concentration [%]
  temperature?: number;       // Coolant temperature [°C]
  filtration?: number;        // Filtration level [μm]
  tankCapacity?: number;      // Tank size [L]
}

/**
 * Tool coolant specification
 */
export interface ToolCoolantSpec {
  hasThroughCoolant: boolean;
  coolantHoleDiameter?: number;  // [mm]
  numberOfHoles?: number;
  minPressure?: number;          // Minimum required [bar]
  minFlow?: number;              // Minimum required [L/min]
}

/**
 * Operation parameters for coolant calculation
 */
export interface OperationParams {
  operation: CoolantOperation;
  toolDiameter: number;          // [mm]
  cuttingSpeed: number;          // Vc [m/min]
  feedRate: number;              // [mm/min]
  depthOfCut?: number;           // ap [mm]
  holeDepth?: number;            // For drilling [mm]
  materialHardness?: number;     // Workpiece hardness [HRC]
  materialType?: 'STEEL' | 'STAINLESS' | 'ALUMINUM' | 'TITANIUM' | 'CAST_IRON' | 'SUPERALLOY';
}

/**
 * Flow validation result
 */
export interface FlowValidationResult {
  requiredFlow: number;          // Required flow [L/min]
  availableFlow: number;         // Available flow [L/min]
  flowMargin: number;            // Excess flow [L/min]
  isAdequate: boolean;
  utilizationPercent: number;
  warnings: string[];
  recommendations: string[];
}

/**
 * Pressure validation result
 */
export interface PressureValidationResult {
  requiredPressure: number;      // Required [bar]
  availablePressure: number;     // Available [bar]
  pressureMargin: number;        // Excess [bar]
  isAdequate: boolean;
  chipEvacuationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
  recommendations: string[];
}

/**
 * Chip evacuation result
 */
export interface ChipEvacuationResult {
  ldRatio: number;               // Length/Diameter ratio
  evacuationType: 'STANDARD' | 'PECK_CYCLE' | 'HIGH_PRESSURE' | 'GUNDRILLING';
  minPressureRequired: number;   // [bar]
  minFlowRequired: number;       // [L/min]
  peckDepthRecommended?: number; // [mm]
  dwellTimeRecommended?: number; // [sec]
  isAdequate: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * MQL validation result
 */
export interface MQLValidationResult {
  oilFlowRate: number;           // [mL/hr]
  airPressure: number;           // [bar]
  airFlow: number;               // [L/min]
  isSuitable: boolean;
  operationCompatibility: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'NOT_RECOMMENDED';
  warnings: string[];
  recommendations: string[];
}

/**
 * Comprehensive coolant validation result
 */
export interface CoolantValidationResult {
  overallAdequate: boolean;
  flow: FlowValidationResult;
  pressure: PressureValidationResult;
  chipEvacuation?: ChipEvacuationResult;
  mql?: MQLValidationResult;
  thermalStatus: 'SAFE' | 'MARGINAL' | 'RISK';
  recommendedDelivery: CoolantDelivery;
  recommendedType: CoolantType;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

// ============================================================================
// CONSTANTS & REFERENCE DATA
// ============================================================================

/**
 * Flow rate requirements by operation [L/min per mm diameter]
 */
const FLOW_REQUIREMENTS: Record<CoolantOperation, number> = {
  MILLING_GENERAL: 0.5,
  MILLING_HSM: 0.3,           // Less flow needed, air blast often OK
  DRILLING_SHALLOW: 0.8,
  DRILLING_DEEP: 1.5,
  DRILLING_GUNDRILLING: 3.0,
  TAPPING: 1.0,
  REAMING: 0.6,
  BORING: 0.5,
  TURNING: 0.4,
  GRINDING: 2.0               // High flow for grinding
};

/**
 * Pressure requirements by L/D ratio for drilling [bar]
 */
const PRESSURE_BY_LD: Record<string, number> = {
  'LD<3': 10,
  'LD3-5': 20,
  'LD5-8': 40,
  'LD8-12': 70,
  'LD12-20': 100,
  'LD>20': 150
};

/**
 * Material factor for coolant requirements
 */
const MATERIAL_FACTORS: Record<string, number> = {
  ALUMINUM: 0.7,
  CAST_IRON: 0.6,      // Often machined dry
  STEEL: 1.0,
  STAINLESS: 1.3,
  TITANIUM: 1.5,
  SUPERALLOY: 1.8
};

/**
 * MQL oil consumption rates [mL/hr]
 */
const MQL_CONSUMPTION: Record<CoolantOperation, { min: number; max: number }> = {
  MILLING_GENERAL: { min: 20, max: 50 },
  MILLING_HSM: { min: 10, max: 30 },
  DRILLING_SHALLOW: { min: 30, max: 80 },
  DRILLING_DEEP: { min: 50, max: 150 },
  DRILLING_GUNDRILLING: { min: 100, max: 300 },
  TAPPING: { min: 40, max: 100 },
  REAMING: { min: 20, max: 50 },
  BORING: { min: 20, max: 60 },
  TURNING: { min: 15, max: 40 },
  GRINDING: { min: 0, max: 0 }  // MQL not recommended for grinding
};

/**
 * Recommended coolant types by material
 */
const RECOMMENDED_COOLANT: Record<string, CoolantType> = {
  ALUMINUM: 'SEMI_SYNTHETIC',
  CAST_IRON: 'WATER_SOLUBLE',
  STEEL: 'WATER_SOLUBLE',
  STAINLESS: 'FULL_SYNTHETIC',
  TITANIUM: 'FULL_SYNTHETIC',
  SUPERALLOY: 'STRAIGHT_OIL'
};

// ============================================================================
// COOLANT VALIDATION ENGINE CLASS
// ============================================================================

class CoolantValidationEngine {

  // ==========================================================================
  // FLOW VALIDATION
  // ==========================================================================

  /**
   * Validate coolant flow rate for operation
   * 
   * @param system - Coolant system specification
   * @param params - Operation parameters
   * @returns Flow validation result
   */
  validateCoolantFlow(
    system: CoolantSystem,
    params: OperationParams
  ): FlowValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Base flow requirement
    const baseFlow = FLOW_REQUIREMENTS[params.operation] || 0.5;
    
    // Material factor
    const materialFactor = params.materialType 
      ? MATERIAL_FACTORS[params.materialType] || 1.0 
      : 1.0;

    // Calculate required flow
    let requiredFlow = baseFlow * params.toolDiameter * materialFactor;

    // Adjust for cutting speed (higher speed = more heat = more coolant)
    if (params.cuttingSpeed > 200) {
      requiredFlow *= 1.2;
    } else if (params.cuttingSpeed > 300) {
      requiredFlow *= 1.4;
    }

    // MQL uses much less flow
    if (system.delivery === 'MQL') {
      requiredFlow = 0.001; // Minimal flow for MQL
    }

    // Dry or air blast
    if (system.delivery === 'DRY' || system.delivery === 'AIR_BLAST') {
      return {
        requiredFlow: 0,
        availableFlow: 0,
        flowMargin: 0,
        isAdequate: true,
        utilizationPercent: 0,
        warnings: system.delivery === 'DRY' 
          ? ['Dry machining - ensure material/operation is suitable'] 
          : [],
        recommendations: []
      };
    }

    const availableFlow = system.flowRate;
    const flowMargin = availableFlow - requiredFlow;
    const isAdequate = availableFlow >= requiredFlow;
    const utilizationPercent = (requiredFlow / availableFlow) * 100;

    if (!isAdequate) {
      warnings.push(`Insufficient flow: need ${requiredFlow.toFixed(1)} L/min, have ${availableFlow.toFixed(1)} L/min`);
      recommendations.push('Increase coolant pump capacity or reduce cutting parameters');
    }

    if (utilizationPercent > 80) {
      warnings.push('Flow utilization above 80% - limited reserve capacity');
    }

    if (params.operation.includes('DRILLING') && system.delivery === 'FLOOD') {
      recommendations.push('Consider through-spindle coolant for better chip evacuation');
    }

    return {
      requiredFlow: parseFloat(requiredFlow.toFixed(2)),
      availableFlow: parseFloat(availableFlow.toFixed(2)),
      flowMargin: parseFloat(flowMargin.toFixed(2)),
      isAdequate,
      utilizationPercent: parseFloat(utilizationPercent.toFixed(1)),
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // PRESSURE VALIDATION (TSC)
  // ==========================================================================

  /**
   * Check through-spindle coolant pressure requirements
   * 
   * @param system - Coolant system
   * @param params - Operation parameters
   * @param toolSpec - Tool coolant specification
   * @returns Pressure validation result
   */
  checkThroughSpindleCoolant(
    system: CoolantSystem,
    params: OperationParams,
    toolSpec?: ToolCoolantSpec
  ): PressureValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check if TSC is applicable
    if (system.delivery !== 'THROUGH_SPINDLE' && system.delivery !== 'THROUGH_TOOL') {
      return {
        requiredPressure: 0,
        availablePressure: system.pressure,
        pressureMargin: system.pressure,
        isAdequate: true,
        chipEvacuationRisk: 'LOW',
        warnings: ['Not using through-spindle coolant'],
        recommendations: []
      };
    }

    // Calculate L/D ratio for drilling
    let ldRatio = 1;
    if (params.holeDepth && params.toolDiameter) {
      ldRatio = params.holeDepth / params.toolDiameter;
    }

    // Determine required pressure
    let requiredPressure: number;
    if (ldRatio < 3) requiredPressure = PRESSURE_BY_LD['LD<3'];
    else if (ldRatio < 5) requiredPressure = PRESSURE_BY_LD['LD3-5'];
    else if (ldRatio < 8) requiredPressure = PRESSURE_BY_LD['LD5-8'];
    else if (ldRatio < 12) requiredPressure = PRESSURE_BY_LD['LD8-12'];
    else if (ldRatio < 20) requiredPressure = PRESSURE_BY_LD['LD12-20'];
    else requiredPressure = PRESSURE_BY_LD['LD>20'];

    // Material adjustment
    if (params.materialType === 'TITANIUM' || params.materialType === 'SUPERALLOY') {
      requiredPressure *= 1.3;
    }

    // Tool specification override
    if (toolSpec?.minPressure && toolSpec.minPressure > requiredPressure) {
      requiredPressure = toolSpec.minPressure;
    }

    const availablePressure = system.pressure;
    const pressureMargin = availablePressure - requiredPressure;
    const isAdequate = availablePressure >= requiredPressure;

    // Chip evacuation risk
    let chipEvacuationRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (pressureMargin < 0) {
      chipEvacuationRisk = 'HIGH';
    } else if (pressureMargin < requiredPressure * 0.2) {
      chipEvacuationRisk = 'MEDIUM';
    }

    if (!isAdequate) {
      warnings.push(`Insufficient TSC pressure: need ${requiredPressure.toFixed(0)} bar, have ${availablePressure.toFixed(0)} bar`);
      recommendations.push('Upgrade high-pressure coolant system');
      recommendations.push(`For L/D ${ldRatio.toFixed(1)}, consider peck drilling cycle`);
    }

    if (ldRatio > 5 && !toolSpec?.hasThroughCoolant) {
      warnings.push('Deep hole without through-tool coolant - high chip packing risk');
      recommendations.push('Use through-coolant drill');
    }

    return {
      requiredPressure: parseFloat(requiredPressure.toFixed(1)),
      availablePressure: parseFloat(availablePressure.toFixed(1)),
      pressureMargin: parseFloat(pressureMargin.toFixed(1)),
      isAdequate,
      chipEvacuationRisk,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // CHIP EVACUATION
  // ==========================================================================

  /**
   * Calculate chip evacuation requirements for deep holes
   * 
   * @param params - Operation parameters
   * @param system - Coolant system
   * @returns Chip evacuation result
   */
  calculateChipEvacuation(
    params: OperationParams,
    system: CoolantSystem
  ): ChipEvacuationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Calculate L/D ratio
    const holeDepth = params.holeDepth || params.toolDiameter * 2;
    const ldRatio = holeDepth / params.toolDiameter;

    // Determine evacuation strategy
    let evacuationType: 'STANDARD' | 'PECK_CYCLE' | 'HIGH_PRESSURE' | 'GUNDRILLING';
    let minPressureRequired: number;
    let minFlowRequired: number;
    let peckDepthRecommended: number | undefined;
    let dwellTimeRecommended: number | undefined;

    if (ldRatio <= 3) {
      evacuationType = 'STANDARD';
      minPressureRequired = 10;
      minFlowRequired = params.toolDiameter * 0.5;
    } else if (ldRatio <= 8) {
      evacuationType = 'PECK_CYCLE';
      minPressureRequired = 40;
      minFlowRequired = params.toolDiameter * 1.0;
      peckDepthRecommended = params.toolDiameter * 1.5;
      dwellTimeRecommended = 0.5;
    } else if (ldRatio <= 20) {
      evacuationType = 'HIGH_PRESSURE';
      minPressureRequired = 70;
      minFlowRequired = params.toolDiameter * 2.0;
      peckDepthRecommended = params.toolDiameter * 1.0;
      dwellTimeRecommended = 1.0;
    } else {
      evacuationType = 'GUNDRILLING';
      minPressureRequired = 150;
      minFlowRequired = params.toolDiameter * 3.0;
    }

    // Material adjustment
    const materialFactor = params.materialType 
      ? MATERIAL_FACTORS[params.materialType] || 1.0 
      : 1.0;
    minPressureRequired *= materialFactor;
    minFlowRequired *= materialFactor;

    // Check adequacy
    const isAdequate = system.pressure >= minPressureRequired && 
                       system.flowRate >= minFlowRequired;

    if (!isAdequate) {
      if (system.pressure < minPressureRequired) {
        warnings.push(`Pressure too low for L/D ${ldRatio.toFixed(1)} (need ${minPressureRequired.toFixed(0)} bar)`);
      }
      if (system.flowRate < minFlowRequired) {
        warnings.push(`Flow too low for chip evacuation (need ${minFlowRequired.toFixed(1)} L/min)`);
      }
    }

    if (evacuationType === 'PECK_CYCLE') {
      recommendations.push(`Use peck cycle with ${peckDepthRecommended?.toFixed(1)}mm peck depth`);
      recommendations.push(`Dwell ${dwellTimeRecommended}s at bottom for chip clearing`);
    }

    if (evacuationType === 'GUNDRILLING') {
      warnings.push('Very deep hole - gundrilling recommended');
      recommendations.push('Use single-flute gundrill with through-coolant');
      recommendations.push('Consider dedicated gundrilling machine');
    }

    if (ldRatio > 5 && system.delivery === 'FLOOD') {
      warnings.push('Flood coolant insufficient for deep hole');
      recommendations.push('Upgrade to through-spindle coolant');
    }

    return {
      ldRatio: parseFloat(ldRatio.toFixed(2)),
      evacuationType,
      minPressureRequired: parseFloat(minPressureRequired.toFixed(1)),
      minFlowRequired: parseFloat(minFlowRequired.toFixed(1)),
      peckDepthRecommended: peckDepthRecommended ? parseFloat(peckDepthRecommended.toFixed(2)) : undefined,
      dwellTimeRecommended,
      isAdequate,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // MQL VALIDATION
  // ==========================================================================

  /**
   * Validate MQL (Minimum Quantity Lubrication) parameters
   * 
   * @param params - Operation parameters
   * @param mqlFlow - MQL oil flow rate [mL/hr]
   * @param airPressure - Air pressure [bar]
   * @returns MQL validation result
   */
  validateMQLParameters(
    params: OperationParams,
    mqlFlow: number,
    airPressure: number = 6
  ): MQLValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get MQL consumption range
    const consumption = MQL_CONSUMPTION[params.operation] || { min: 20, max: 50 };

    // Check if MQL is suitable for operation
    let operationCompatibility: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'NOT_RECOMMENDED';
    
    if (params.operation === 'GRINDING') {
      operationCompatibility = 'NOT_RECOMMENDED';
      warnings.push('MQL not recommended for grinding - use flood coolant');
    } else if (params.operation === 'DRILLING_GUNDRILLING') {
      operationCompatibility = 'NOT_RECOMMENDED';
      warnings.push('MQL insufficient for gundrilling - use high-pressure coolant');
    } else if (params.operation === 'DRILLING_DEEP') {
      operationCompatibility = 'MARGINAL';
      warnings.push('MQL may be insufficient for deep drilling');
      recommendations.push('Ensure through-tool MQL delivery');
    } else if (params.operation === 'MILLING_HSM' || params.operation === 'MILLING_GENERAL') {
      operationCompatibility = 'EXCELLENT';
    } else {
      operationCompatibility = 'GOOD';
    }

    // Material compatibility
    if (params.materialType === 'TITANIUM' || params.materialType === 'SUPERALLOY') {
      if (operationCompatibility === 'EXCELLENT') operationCompatibility = 'GOOD';
      else if (operationCompatibility === 'GOOD') operationCompatibility = 'MARGINAL';
      warnings.push(`${params.materialType} may require more lubrication than MQL provides`);
    }

    // Validate flow
    let isSuitable = true;
    if (mqlFlow < consumption.min) {
      warnings.push(`MQL flow (${mqlFlow} mL/hr) below minimum (${consumption.min} mL/hr)`);
      isSuitable = false;
    } else if (mqlFlow > consumption.max) {
      recommendations.push(`MQL flow (${mqlFlow} mL/hr) exceeds typical (${consumption.max} mL/hr) - may cause buildup`);
    }

    // Validate air pressure
    const minAirPressure = 4;
    const optimalAirPressure = 6;
    if (airPressure < minAirPressure) {
      warnings.push(`Air pressure (${airPressure} bar) too low - minimum ${minAirPressure} bar`);
      isSuitable = false;
    }

    // Air flow estimate (typical MQL systems)
    const airFlow = airPressure * 15; // Rough estimate: ~15 L/min per bar

    if (operationCompatibility === 'NOT_RECOMMENDED') {
      isSuitable = false;
    }

    return {
      oilFlowRate: mqlFlow,
      airPressure,
      airFlow: parseFloat(airFlow.toFixed(1)),
      isSuitable,
      operationCompatibility,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // COMPREHENSIVE VALIDATION
  // ==========================================================================

  /**
   * Comprehensive coolant validation for operation
   * 
   * @param system - Coolant system specification
   * @param params - Operation parameters
   * @param toolSpec - Tool coolant specification (optional)
   * @returns Complete coolant validation result
   */
  validateCoolant(
    system: CoolantSystem,
    params: OperationParams,
    toolSpec?: ToolCoolantSpec
  ): CoolantValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Flow validation
    const flow = this.validateCoolantFlow(system, params);
    warnings.push(...flow.warnings);
    recommendations.push(...flow.recommendations);

    // Pressure validation (for TSC)
    const pressure = this.checkThroughSpindleCoolant(system, params, toolSpec);
    warnings.push(...pressure.warnings);
    recommendations.push(...pressure.recommendations);

    // Chip evacuation (for drilling)
    let chipEvacuation: ChipEvacuationResult | undefined;
    if (params.operation.includes('DRILLING') && params.holeDepth) {
      chipEvacuation = this.calculateChipEvacuation(params, system);
      warnings.push(...chipEvacuation.warnings);
      recommendations.push(...chipEvacuation.recommendations);
    }

    // MQL validation (if applicable)
    let mql: MQLValidationResult | undefined;
    if (system.delivery === 'MQL') {
      mql = this.validateMQLParameters(params, system.flowRate * 60, 6);
      warnings.push(...mql.warnings);
      recommendations.push(...mql.recommendations);
    }

    // Thermal status assessment
    let thermalStatus: 'SAFE' | 'MARGINAL' | 'RISK' = 'SAFE';
    if (!flow.isAdequate || pressure.chipEvacuationRisk === 'HIGH') {
      thermalStatus = 'RISK';
    } else if (flow.utilizationPercent > 80 || pressure.chipEvacuationRisk === 'MEDIUM') {
      thermalStatus = 'MARGINAL';
    }

    // Recommend delivery method
    let recommendedDelivery = system.delivery;
    if (params.holeDepth && params.holeDepth / params.toolDiameter > 5) {
      recommendedDelivery = 'THROUGH_SPINDLE';
    }
    if (params.operation === 'MILLING_HSM' && system.delivery === 'FLOOD') {
      recommendedDelivery = 'AIR_BLAST'; // HSM often better with air
    }

    // Recommend coolant type
    const recommendedType = params.materialType 
      ? RECOMMENDED_COOLANT[params.materialType] || 'WATER_SOLUBLE'
      : 'WATER_SOLUBLE';

    // Overall adequacy
    const overallAdequate = flow.isAdequate && 
                            pressure.isAdequate && 
                            (!chipEvacuation || chipEvacuation.isAdequate) &&
                            (!mql || mql.isSuitable);

    return {
      overallAdequate,
      flow,
      pressure,
      chipEvacuation,
      mql,
      thermalStatus,
      recommendedDelivery,
      recommendedType,
      warnings: [...new Set(warnings)],
      recommendations: [...new Set(recommendations)],
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get coolant recommendations for material/operation combination
   */
  getCoolantRecommendations(
    materialType: string,
    operation: CoolantOperation
  ): { delivery: CoolantDelivery; type: CoolantType; notes: string[] } {
    const notes: string[] = [];

    // Determine recommended delivery
    let delivery: CoolantDelivery = 'FLOOD';
    if (operation.includes('DRILLING_DEEP') || operation.includes('GUNDRILLING')) {
      delivery = 'THROUGH_SPINDLE';
      notes.push('Through-spindle required for chip evacuation');
    } else if (operation === 'MILLING_HSM') {
      delivery = 'AIR_BLAST';
      notes.push('Air blast often preferred for HSM to avoid thermal shock');
    } else if (operation === 'GRINDING') {
      delivery = 'FLOOD';
      notes.push('High-volume flood coolant essential for grinding');
    }

    // Determine recommended type
    let type: CoolantType = RECOMMENDED_COOLANT[materialType] || 'WATER_SOLUBLE';
    
    // Material-specific notes
    if (materialType === 'ALUMINUM') {
      notes.push('Avoid high-pH coolants to prevent staining');
    } else if (materialType === 'CAST_IRON') {
      notes.push('Can often machine dry or with minimal lubrication');
    } else if (materialType === 'TITANIUM') {
      notes.push('Requires aggressive cooling - titanium is thermally sensitive');
    } else if (materialType === 'SUPERALLOY') {
      notes.push('Consider cryogenic cooling for best results');
    }

    return { delivery, type, notes };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const coolantValidationEngine = new CoolantValidationEngine();

export { CoolantValidationEngine };
