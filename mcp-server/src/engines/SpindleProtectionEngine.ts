/**
 * PRISM Manufacturing Intelligence - Spindle Load Protection Engine
 * Real-time spindle protection from overload conditions
 * 
 * SAFETY CRITICAL: Spindle damage = $50K+ replacement, production downtime
 * 
 * Protection Modes:
 * - Torque Overload Protection
 * - Power Draw Monitoring
 * - Speed vs Load Validation
 * - Thermal Protection
 * - Acceleration/Deceleration Limits
 * 
 * @version 1.0.0
 * @module SpindleProtectionEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Spindle type classification
 */
export type SpindleType = 
  | 'BELT_DRIVE'
  | 'GEAR_DRIVE'
  | 'DIRECT_DRIVE'
  | 'INTEGRAL_MOTOR'
  | 'HIGH_SPEED_ELECTRIC';

/**
 * Spindle bearing type
 */
export type BearingType = 
  | 'ANGULAR_CONTACT'
  | 'ROLLER'
  | 'HYBRID_CERAMIC'
  | 'AIR_BEARING'
  | 'MAGNETIC';

/**
 * Cooling system type
 */
export type CoolingType = 
  | 'AIR_COOLED'
  | 'OIL_MIST'
  | 'OIL_JET'
  | 'WATER_COOLED'
  | 'CHILLER';

/**
 * Spindle specification
 */
export interface SpindleSpec {
  spindleId?: string;
  type: SpindleType;
  bearingType: BearingType;
  coolingType: CoolingType;
  
  // Power & Torque
  ratedPower: number;           // Continuous power [kW]
  peakPower: number;            // Peak power (30 min) [kW]
  ratedTorque: number;          // Continuous torque [Nm]
  peakTorque: number;           // Peak torque [Nm]
  
  // Speed Range
  minSpeed: number;             // Minimum speed [rpm]
  maxSpeed: number;             // Maximum speed [rpm]
  ratedSpeed: number;           // Speed at rated power [rpm]
  
  // Torque-Speed Curve (corner speed)
  cornerSpeed: number;          // Speed where constant torque ends [rpm]
  
  // Thermal
  maxTemperature: number;       // Max bearing temperature [°C]
  warningTemperature: number;   // Warning threshold [°C]
  ambientTemperature?: number;  // Operating ambient [°C]
  thermalTimeConstant?: number; // Thermal time constant [minutes]
  
  // Mechanical
  maxRadialLoad: number;        // Max radial load at spindle nose [N]
  maxAxialLoad: number;         // Max axial (thrust) load [N]
  runoutTIR?: number;           // Total indicated runout [μm]
  
  // Acceleration
  accelTime?: number;           // 0 to max speed time [seconds]
  decelTime?: number;           // Max to 0 time [seconds]
  maxAccelRate?: number;        // Max acceleration [rpm/s]
}

/**
 * Current spindle operating state
 */
export interface SpindleState {
  currentSpeed: number;         // Current speed [rpm]
  commandedSpeed: number;       // Commanded speed [rpm]
  currentTorque: number;        // Current torque [Nm]
  currentPower: number;         // Current power draw [kW]
  loadPercent: number;          // Load as % of rated
  temperature: number;          // Current temperature [°C]
  vibrationLevel?: number;      // Vibration [mm/s RMS]
  runTime: number;              // Continuous run time [minutes]
}

/**
 * Cutting operation requirements
 */
export interface CuttingRequirements {
  requiredTorque: number;       // Torque needed [Nm]
  requiredPower: number;        // Power needed [kW]
  targetSpeed: number;          // Desired speed [rpm]
  operationType: 'ROUGHING' | 'FINISHING' | 'DRILLING' | 'TAPPING' | 'HIGH_SPEED';
  duration?: number;            // Expected duration [minutes]
  isInterrupted?: boolean;      // Interrupted cutting
}

/**
 * Torque check result
 */
export interface TorqueCheckResult {
  requiredTorque: number;       // Torque needed [Nm]
  availableTorque: number;      // Torque available at speed [Nm]
  torqueMargin: number;         // Available - Required [Nm]
  loadPercent: number;          // % of available torque
  isSafe: boolean;
  isWithinContinuous: boolean;  // Within continuous rating
  isWithinPeak: boolean;        // Within peak rating
  maxDuration?: number;         // Max duration at this load [min]
  warnings: string[];
  recommendations: string[];
}

/**
 * Power check result
 */
export interface PowerCheckResult {
  requiredPower: number;        // Power needed [kW]
  availablePower: number;       // Power available [kW]
  powerMargin: number;          // Available - Required [kW]
  loadPercent: number;          // % of rated power
  isSafe: boolean;
  isWithinContinuous: boolean;
  isWithinPeak: boolean;
  efficiency?: number;          // Estimated efficiency
  warnings: string[];
  recommendations: string[];
}

/**
 * Speed validation result
 */
export interface SpeedCheckResult {
  requestedSpeed: number;       // Requested speed [rpm]
  maxSafeSpeed: number;         // Max safe at current load [rpm]
  minSafeSpeed: number;         // Min safe for operation [rpm]
  isSafe: boolean;
  speedMargin: number;          // % margin to limit
  torqueAtSpeed: number;        // Available torque at speed [Nm]
  powerAtSpeed: number;         // Available power at speed [kW]
  warnings: string[];
  recommendations: string[];
}

/**
 * Thermal check result
 */
export interface ThermalCheckResult {
  currentTemperature: number;   // Current temp [°C]
  warningThreshold: number;     // Warning level [°C]
  maxThreshold: number;         // Max allowed [°C]
  temperatureMargin: number;    // Margin to max [°C]
  projectedTemperature: number; // Projected after duration [°C]
  isSafe: boolean;
  thermalStatus: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'CRITICAL';
  coolingAdequate: boolean;
  maxSafeDuration: number;      // Max time at current load [min]
  warnings: string[];
  recommendations: string[];
}

/**
 * Complete spindle envelope result
 */
export interface SpindleEnvelopeResult {
  torque: TorqueCheckResult;
  power: PowerCheckResult;
  speed: SpeedCheckResult;
  thermal: ThermalCheckResult;
  overallSafe: boolean;
  criticalLimitation: string;
  operatingPoint: {
    speed: number;
    torque: number;
    power: number;
    loadPercent: number;
  };
  safeEnvelope: {
    maxSpeed: number;
    maxTorque: number;
    maxPower: number;
    maxDuration: number;
  };
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

/**
 * Default spindle specifications by type
 */
const DEFAULT_SPINDLE_SPECS: Record<SpindleType, Partial<SpindleSpec>> = {
  BELT_DRIVE: {
    ratedPower: 11,
    peakPower: 15,
    ratedTorque: 70,
    peakTorque: 95,
    minSpeed: 50,
    maxSpeed: 8000,
    ratedSpeed: 1500,
    cornerSpeed: 1500,
    maxTemperature: 70,
    warningTemperature: 60,
    maxRadialLoad: 5000,
    maxAxialLoad: 3000
  },
  GEAR_DRIVE: {
    ratedPower: 18.5,
    peakPower: 22,
    ratedTorque: 350,
    peakTorque: 420,
    minSpeed: 20,
    maxSpeed: 6000,
    ratedSpeed: 500,
    cornerSpeed: 500,
    maxTemperature: 65,
    warningTemperature: 55,
    maxRadialLoad: 8000,
    maxAxialLoad: 6000
  },
  DIRECT_DRIVE: {
    ratedPower: 22,
    peakPower: 30,
    ratedTorque: 120,
    peakTorque: 160,
    minSpeed: 100,
    maxSpeed: 12000,
    ratedSpeed: 1750,
    cornerSpeed: 1750,
    maxTemperature: 60,
    warningTemperature: 50,
    maxRadialLoad: 4000,
    maxAxialLoad: 2500
  },
  INTEGRAL_MOTOR: {
    ratedPower: 30,
    peakPower: 40,
    ratedTorque: 95,
    peakTorque: 130,
    minSpeed: 500,
    maxSpeed: 15000,
    ratedSpeed: 3000,
    cornerSpeed: 3000,
    maxTemperature: 55,
    warningTemperature: 45,
    maxRadialLoad: 3000,
    maxAxialLoad: 2000
  },
  HIGH_SPEED_ELECTRIC: {
    ratedPower: 15,
    peakPower: 20,
    ratedTorque: 12,
    peakTorque: 16,
    minSpeed: 5000,
    maxSpeed: 42000,
    ratedSpeed: 12000,
    cornerSpeed: 12000,
    maxTemperature: 50,
    warningTemperature: 40,
    maxRadialLoad: 1500,
    maxAxialLoad: 800
  }
};

/**
 * Safety margins by operation type
 */
const SAFETY_MARGINS: Record<string, number> = {
  ROUGHING: 0.85,      // Use max 85% of capacity
  FINISHING: 0.70,     // Use max 70% for stability
  DRILLING: 0.80,      // 80% for drilling
  TAPPING: 0.60,       // 60% - tapping is sensitive
  HIGH_SPEED: 0.75     // 75% for HSM
};

/**
 * Thermal time constants by cooling type [minutes]
 */
const THERMAL_TIME_CONSTANTS: Record<CoolingType, number> = {
  AIR_COOLED: 45,
  OIL_MIST: 35,
  OIL_JET: 25,
  WATER_COOLED: 20,
  CHILLER: 15
};

/**
 * Peak duration limits [minutes]
 */
const PEAK_DURATION_LIMITS = {
  TORQUE: 30,          // Max 30 min at peak torque
  POWER: 30,           // Max 30 min at peak power
  THERMAL_WARNING: 15  // 15 min above warning temp
};

// ============================================================================
// SPINDLE PROTECTION ENGINE CLASS
// ============================================================================

class SpindleProtectionEngine {

  // ==========================================================================
  // TORQUE PROTECTION
  // ==========================================================================

  /**
   * Check if required torque is within spindle capacity
   * 
   * Torque-speed relationship:
   * - Below corner speed: Constant torque region
   * - Above corner speed: Torque falls as T = P × 9549 / n
   * 
   * @param spindle - Spindle specification
   * @param requirements - Cutting requirements
   * @param state - Current spindle state (optional)
   * @returns Torque check result
   */
  checkSpindleTorque(
    spindle: SpindleSpec,
    requirements: CuttingRequirements,
    state?: SpindleState
  ): TorqueCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const speed = requirements.targetSpeed;
    const requiredTorque = requirements.requiredTorque;

    // Calculate available torque at speed
    let availableTorque: number;
    let availablePeakTorque: number;

    if (speed <= spindle.cornerSpeed) {
      // Constant torque region
      availableTorque = spindle.ratedTorque;
      availablePeakTorque = spindle.peakTorque;
    } else {
      // Constant power region: T = P × 9549 / n
      availableTorque = (spindle.ratedPower * 9549) / speed;
      availablePeakTorque = (spindle.peakPower * 9549) / speed;
    }

    // Apply safety margin based on operation
    const safetyMargin = SAFETY_MARGINS[requirements.operationType] || 0.80;
    const safeTorque = availableTorque * safetyMargin;

    // Calculate margins
    const torqueMargin = availableTorque - requiredTorque;
    const loadPercent = (requiredTorque / availableTorque) * 100;

    // Safety checks
    const isWithinContinuous = requiredTorque <= availableTorque;
    const isWithinPeak = requiredTorque <= availablePeakTorque;
    const isSafe = requiredTorque <= safeTorque;

    // Calculate max duration if in peak zone
    let maxDuration: number | undefined;
    if (requiredTorque > availableTorque && requiredTorque <= availablePeakTorque) {
      maxDuration = PEAK_DURATION_LIMITS.TORQUE;
      warnings.push(`Operating in PEAK torque zone - max ${maxDuration} minutes`);
    }

    // Warnings and recommendations
    if (!isWithinPeak) {
      warnings.push(`CRITICAL: Required torque (${requiredTorque.toFixed(1)}Nm) exceeds peak capacity (${availablePeakTorque.toFixed(1)}Nm)`);
      recommendations.push('Reduce depth of cut or feed rate');
      recommendations.push('Consider gear range change if available');
    } else if (!isWithinContinuous) {
      warnings.push(`WARNING: Torque exceeds continuous rating - time limited operation`);
      recommendations.push('Plan for cooling periods between cuts');
    } else if (!isSafe) {
      warnings.push(`Torque at ${loadPercent.toFixed(0)}% of capacity - reduced margin for safety`);
      recommendations.push('Consider reducing cutting parameters for longer tool life');
    }

    if (speed < spindle.cornerSpeed * 0.3) {
      warnings.push('Very low speed - motor may have reduced torque output');
    }

    if (requirements.isInterrupted && loadPercent > 70) {
      warnings.push('Interrupted cutting with high load - increased stress on spindle');
      recommendations.push('Reduce parameters for interrupted cuts');
    }

    return {
      requiredTorque: parseFloat(requiredTorque.toFixed(2)),
      availableTorque: parseFloat(availableTorque.toFixed(2)),
      torqueMargin: parseFloat(torqueMargin.toFixed(2)),
      loadPercent: parseFloat(loadPercent.toFixed(1)),
      isSafe,
      isWithinContinuous,
      isWithinPeak,
      maxDuration,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // POWER PROTECTION
  // ==========================================================================

  /**
   * Check if required power is within spindle capacity
   * 
   * Power = Torque × Speed / 9549
   * 
   * @param spindle - Spindle specification
   * @param requirements - Cutting requirements  
   * @param state - Current spindle state (optional)
   * @returns Power check result
   */
  checkSpindlePower(
    spindle: SpindleSpec,
    requirements: CuttingRequirements,
    state?: SpindleState
  ): PowerCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const requiredPower = requirements.requiredPower;
    const speed = requirements.targetSpeed;

    // Available power
    let availablePower = spindle.ratedPower;
    let availablePeakPower = spindle.peakPower;

    // Below corner speed, power is limited by torque
    if (speed < spindle.cornerSpeed) {
      availablePower = (spindle.ratedTorque * speed) / 9549;
      availablePeakPower = (spindle.peakTorque * speed) / 9549;
    }

    // Apply safety margin
    const safetyMargin = SAFETY_MARGINS[requirements.operationType] || 0.80;
    const safePower = availablePower * safetyMargin;

    // Calculate margins
    const powerMargin = availablePower - requiredPower;
    const loadPercent = (requiredPower / availablePower) * 100;

    // Safety checks
    const isWithinContinuous = requiredPower <= availablePower;
    const isWithinPeak = requiredPower <= availablePeakPower;
    const isSafe = requiredPower <= safePower;

    // Efficiency estimate (varies with load)
    let efficiency = 0.90;
    if (loadPercent < 25) efficiency = 0.75;
    else if (loadPercent < 50) efficiency = 0.85;
    else if (loadPercent > 90) efficiency = 0.88;

    // Warnings
    if (!isWithinPeak) {
      warnings.push(`CRITICAL: Required power (${requiredPower.toFixed(1)}kW) exceeds peak capacity (${availablePeakPower.toFixed(1)}kW)`);
      recommendations.push('Reduce MRR - lower feed or depth');
      recommendations.push('Split operation into multiple passes');
    } else if (!isWithinContinuous) {
      warnings.push(`WARNING: Power exceeds continuous rating - time limited`);
      recommendations.push(`Max duration: ${PEAK_DURATION_LIMITS.POWER} minutes at this power`);
    } else if (!isSafe) {
      warnings.push(`Power at ${loadPercent.toFixed(0)}% - approaching continuous limit`);
    }

    if (loadPercent < 20) {
      warnings.push('Low spindle utilization - consider increasing parameters');
    }

    if (speed < spindle.cornerSpeed && loadPercent > 80) {
      recommendations.push('Increase speed to access full power (above corner speed)');
    }

    return {
      requiredPower: parseFloat(requiredPower.toFixed(2)),
      availablePower: parseFloat(availablePower.toFixed(2)),
      powerMargin: parseFloat(powerMargin.toFixed(2)),
      loadPercent: parseFloat(loadPercent.toFixed(1)),
      isSafe,
      isWithinContinuous,
      isWithinPeak,
      efficiency,
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // SPEED VALIDATION
  // ==========================================================================

  /**
   * Validate spindle speed for given load conditions
   * 
   * @param spindle - Spindle specification
   * @param requestedSpeed - Desired speed [rpm]
   * @param currentLoad - Current load as torque [Nm] or power [kW]
   * @param loadType - Whether load is torque or power
   * @returns Speed validation result
   */
  validateSpindleSpeed(
    spindle: SpindleSpec,
    requestedSpeed: number,
    currentLoad: number,
    loadType: 'TORQUE' | 'POWER' = 'TORQUE'
  ): SpeedCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic speed limits
    let maxSafeSpeed = spindle.maxSpeed;
    let minSafeSpeed = spindle.minSpeed;

    // Adjust for load
    if (loadType === 'TORQUE' && currentLoad > 0) {
      // At high torque, may need to limit speed
      if (currentLoad > spindle.ratedTorque * 0.9) {
        maxSafeSpeed = Math.min(maxSafeSpeed, spindle.cornerSpeed * 1.2);
        warnings.push('High torque load - speed limited to near corner speed');
      }
    } else if (loadType === 'POWER' && currentLoad > 0) {
      // At high power, check thermal limits
      if (currentLoad > spindle.ratedPower * 0.9) {
        // May need to limit for thermal reasons at high speed
        if (requestedSpeed > spindle.ratedSpeed * 1.5) {
          warnings.push('High power + high speed - increased thermal load');
        }
      }
    }

    // Calculate torque and power at requested speed
    let torqueAtSpeed: number;
    let powerAtSpeed: number;

    if (requestedSpeed <= spindle.cornerSpeed) {
      torqueAtSpeed = spindle.ratedTorque;
      powerAtSpeed = (spindle.ratedTorque * requestedSpeed) / 9549;
    } else {
      torqueAtSpeed = (spindle.ratedPower * 9549) / requestedSpeed;
      powerAtSpeed = spindle.ratedPower;
    }

    // Safety checks
    const isSafe = requestedSpeed >= minSafeSpeed && requestedSpeed <= maxSafeSpeed;
    const speedMargin = ((maxSafeSpeed - requestedSpeed) / maxSafeSpeed) * 100;

    // Warnings
    if (requestedSpeed > maxSafeSpeed) {
      warnings.push(`CRITICAL: Requested speed (${requestedSpeed} rpm) exceeds max (${maxSafeSpeed} rpm)`);
      recommendations.push(`Reduce speed to maximum ${maxSafeSpeed} rpm`);
    } else if (requestedSpeed < minSafeSpeed) {
      warnings.push(`Speed (${requestedSpeed} rpm) below minimum (${minSafeSpeed} rpm)`);
      recommendations.push('Use gear range or different spindle for low speed');
    }

    if (requestedSpeed > spindle.maxSpeed * 0.95) {
      warnings.push('Operating near maximum speed - reduced bearing life');
    }

    if (requestedSpeed < spindle.cornerSpeed * 0.5) {
      recommendations.push('Low speed operation - ensure adequate torque for cutting');
    }

    return {
      requestedSpeed,
      maxSafeSpeed,
      minSafeSpeed,
      isSafe,
      speedMargin: parseFloat(speedMargin.toFixed(1)),
      torqueAtSpeed: parseFloat(torqueAtSpeed.toFixed(2)),
      powerAtSpeed: parseFloat(powerAtSpeed.toFixed(2)),
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // THERMAL PROTECTION
  // ==========================================================================

  /**
   * Monitor spindle thermal status and predict temperature rise
   * 
   * Temperature model: T(t) = T_ambient + ΔT × (1 - e^(-t/τ))
   * Where ΔT is proportional to power dissipation
   * 
   * @param spindle - Spindle specification
   * @param state - Current spindle state
   * @param requirements - Cutting requirements (for projection)
   * @returns Thermal check result
   */
  monitorSpindleThermal(
    spindle: SpindleSpec,
    state: SpindleState,
    requirements?: CuttingRequirements
  ): ThermalCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const currentTemp = state.temperature;
    const warningThreshold = spindle.warningTemperature;
    const maxThreshold = spindle.maxTemperature;
    const ambientTemp = spindle.ambientTemperature || 25;

    // Temperature margin
    const temperatureMargin = maxThreshold - currentTemp;

    // Thermal time constant
    const tau = spindle.thermalTimeConstant || 
                THERMAL_TIME_CONSTANTS[spindle.coolingType] || 30;

    // Estimate steady-state temperature rise based on load
    const loadFactor = state.loadPercent / 100;
    const maxTempRise = (maxThreshold - ambientTemp) * 0.8; // 80% of max rise at 100% load
    const steadyStateTempRise = maxTempRise * Math.pow(loadFactor, 1.5);
    const steadyStateTemp = ambientTemp + steadyStateTempRise;

    // Project temperature after duration
    let projectedTemperature = currentTemp;
    let duration = requirements?.duration || 30; // Default 30 min projection

    if (requirements) {
      // T(t) = T_ss - (T_ss - T_current) × e^(-t/τ)
      const tempDiff = steadyStateTemp - currentTemp;
      projectedTemperature = steadyStateTemp - tempDiff * Math.exp(-duration / tau);
    }

    // Thermal status
    let thermalStatus: 'NORMAL' | 'ELEVATED' | 'WARNING' | 'CRITICAL' = 'NORMAL';
    if (currentTemp >= maxThreshold) {
      thermalStatus = 'CRITICAL';
    } else if (currentTemp >= warningThreshold) {
      thermalStatus = 'WARNING';
    } else if (currentTemp >= warningThreshold - 5) {
      thermalStatus = 'ELEVATED';
    }

    // Is cooling adequate?
    const coolingAdequate = projectedTemperature < warningThreshold;

    // Calculate max safe duration at current load
    let maxSafeDuration = Infinity;
    if (steadyStateTemp > maxThreshold) {
      // Calculate time to reach max temp
      // maxThreshold = T_ss - (T_ss - T_current) × e^(-t/τ)
      // Solve for t
      const ratio = (steadyStateTemp - maxThreshold) / (steadyStateTemp - currentTemp);
      if (ratio > 0 && ratio < 1) {
        maxSafeDuration = -tau * Math.log(ratio);
      } else {
        maxSafeDuration = 0; // Already above or would exceed
      }
    }

    const isSafe = thermalStatus !== 'CRITICAL' && 
                   projectedTemperature < maxThreshold;

    // Warnings and recommendations
    if (thermalStatus === 'CRITICAL') {
      warnings.push('CRITICAL: Spindle temperature at maximum - STOP IMMEDIATELY');
      recommendations.push('Allow spindle to cool before continuing');
      recommendations.push('Check cooling system for issues');
    } else if (thermalStatus === 'WARNING') {
      warnings.push(`WARNING: Temperature (${currentTemp}°C) above warning threshold`);
      recommendations.push('Reduce cutting parameters');
      recommendations.push('Check coolant flow and temperature');
    } else if (thermalStatus === 'ELEVATED') {
      warnings.push('Temperature elevated - monitor closely');
    }

    if (projectedTemperature > warningThreshold) {
      warnings.push(`Projected temperature (${projectedTemperature.toFixed(1)}°C) will exceed warning after ${duration} min`);
      recommendations.push('Plan cooling breaks');
    }

    if (!coolingAdequate) {
      recommendations.push('Consider reducing load or improving cooling');
    }

    if (state.runTime > 60 && loadFactor > 0.8) {
      warnings.push('Extended high-load operation - thermal accumulation');
    }

    return {
      currentTemperature: currentTemp,
      warningThreshold,
      maxThreshold,
      temperatureMargin: parseFloat(temperatureMargin.toFixed(1)),
      projectedTemperature: parseFloat(projectedTemperature.toFixed(1)),
      isSafe,
      thermalStatus,
      coolingAdequate,
      maxSafeDuration: Math.min(999, Math.round(maxSafeDuration)),
      warnings,
      recommendations
    };
  }

  // ==========================================================================
  // COMPLETE ENVELOPE VALIDATION
  // ==========================================================================

  /**
   * Get complete spindle safe operating envelope
   * 
   * Combines all protection checks into comprehensive result
   * 
   * @param spindle - Spindle specification
   * @param requirements - Cutting requirements
   * @param state - Current spindle state
   * @returns Complete envelope result
   */
  getSpindleSafeEnvelope(
    spindle: SpindleSpec,
    requirements: CuttingRequirements,
    state?: SpindleState
  ): SpindleEnvelopeResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Default state if not provided
    const currentState: SpindleState = state || {
      currentSpeed: requirements.targetSpeed,
      commandedSpeed: requirements.targetSpeed,
      currentTorque: requirements.requiredTorque,
      currentPower: requirements.requiredPower,
      loadPercent: 0,
      temperature: spindle.ambientTemperature || 30,
      runTime: 0
    };

    // Run all checks
    const torqueCheck = this.checkSpindleTorque(spindle, requirements, currentState);
    const powerCheck = this.checkSpindlePower(spindle, requirements, currentState);
    const speedCheck = this.validateSpindleSpeed(
      spindle, 
      requirements.targetSpeed, 
      requirements.requiredTorque,
      'TORQUE'
    );
    const thermalCheck = this.monitorSpindleThermal(spindle, currentState, requirements);

    // Aggregate warnings
    warnings.push(...torqueCheck.warnings);
    warnings.push(...powerCheck.warnings);
    warnings.push(...speedCheck.warnings);
    warnings.push(...thermalCheck.warnings);

    // Aggregate recommendations (deduplicated)
    const allRecs = [
      ...torqueCheck.recommendations,
      ...powerCheck.recommendations,
      ...speedCheck.recommendations,
      ...thermalCheck.recommendations
    ];
    recommendations.push(...[...new Set(allRecs)]);

    // Overall safety
    const overallSafe = torqueCheck.isSafe && 
                        powerCheck.isSafe && 
                        speedCheck.isSafe && 
                        thermalCheck.isSafe;

    // Determine critical limitation
    let criticalLimitation = 'None';
    if (!torqueCheck.isWithinPeak) {
      criticalLimitation = 'Torque exceeds peak capacity';
    } else if (!powerCheck.isWithinPeak) {
      criticalLimitation = 'Power exceeds peak capacity';
    } else if (!speedCheck.isSafe) {
      criticalLimitation = 'Speed outside safe range';
    } else if (thermalCheck.thermalStatus === 'CRITICAL') {
      criticalLimitation = 'Thermal limit reached';
    } else if (!torqueCheck.isSafe) {
      criticalLimitation = 'Torque margin insufficient';
    } else if (!powerCheck.isSafe) {
      criticalLimitation = 'Power margin insufficient';
    } else if (!thermalCheck.isSafe) {
      criticalLimitation = 'Thermal protection engaged';
    }

    // Operating point
    const operatingPoint = {
      speed: requirements.targetSpeed,
      torque: requirements.requiredTorque,
      power: requirements.requiredPower,
      loadPercent: Math.max(torqueCheck.loadPercent, powerCheck.loadPercent)
    };

    // Safe envelope
    const safetyMargin = SAFETY_MARGINS[requirements.operationType] || 0.80;
    const safeEnvelope = {
      maxSpeed: speedCheck.maxSafeSpeed,
      maxTorque: parseFloat((speedCheck.torqueAtSpeed * safetyMargin).toFixed(2)),
      maxPower: parseFloat((speedCheck.powerAtSpeed * safetyMargin).toFixed(2)),
      maxDuration: Math.min(
        torqueCheck.maxDuration || 999,
        thermalCheck.maxSafeDuration
      )
    };

    return {
      torque: torqueCheck,
      power: powerCheck,
      speed: speedCheck,
      thermal: thermalCheck,
      overallSafe,
      criticalLimitation,
      operatingPoint,
      safeEnvelope,
      warnings: [...new Set(warnings)],
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get default spindle spec by type
   */
  getDefaultSpindleSpec(type: SpindleType): SpindleSpec {
    const defaults = DEFAULT_SPINDLE_SPECS[type];
    return {
      type,
      bearingType: 'ANGULAR_CONTACT',
      coolingType: 'OIL_JET',
      ratedPower: defaults.ratedPower!,
      peakPower: defaults.peakPower!,
      ratedTorque: defaults.ratedTorque!,
      peakTorque: defaults.peakTorque!,
      minSpeed: defaults.minSpeed!,
      maxSpeed: defaults.maxSpeed!,
      ratedSpeed: defaults.ratedSpeed!,
      cornerSpeed: defaults.cornerSpeed!,
      maxTemperature: defaults.maxTemperature!,
      warningTemperature: defaults.warningTemperature!,
      maxRadialLoad: defaults.maxRadialLoad!,
      maxAxialLoad: defaults.maxAxialLoad!
    };
  }

  /**
   * Calculate torque from cutting force and diameter
   */
  calculateTorqueFromForce(cuttingForce: number, toolDiameter: number): number {
    // T = F × r = F × D/2 / 1000 (convert mm to m, result in Nm)
    return (cuttingForce * toolDiameter) / 2000;
  }

  /**
   * Calculate power from torque and speed
   */
  calculatePower(torque: number, speed: number): number {
    // P = T × n / 9549 (kW)
    return (torque * speed) / 9549;
  }

  /**
   * Calculate torque from power and speed
   */
  calculateTorque(power: number, speed: number): number {
    // T = P × 9549 / n (Nm)
    return (power * 9549) / speed;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const spindleProtectionEngine = new SpindleProtectionEngine();

export { SpindleProtectionEngine };
