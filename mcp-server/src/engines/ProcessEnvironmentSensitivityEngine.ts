/**
 * ProcessEnvironmentSensitivityEngine — Environmental Factor Analysis
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Tracks and quantifies ALL environmental factors that can affect machining:
 *
 * Physical Environment:
 * - Temperature (ambient, coolant, machine components)
 * - Humidity (affects some materials, lubricant performance)
 * - Barometric pressure (air bearing performance)
 * - Vibration (from nearby machines, floor, traffic)
 * - Air quality (dust, mist contamination)
 *
 * Machine Environment:
 * - Thermal state (spindle, axes, structure)
 * - Mechanical condition (backlash, wear)
 * - Fluid states (coolant, hydraulic, lubrication)
 * - Electrical stability (voltage fluctuations)
 *
 * Temporal Factors:
 * - Time of day (temperature cycles, load cycles)
 * - Day of week (maintenance schedules)
 * - Season (HVAC effects, humidity)
 * - Machine uptime (thermal equilibrium)
 *
 * Calculates sensitivity coefficients: how much each parameter
 * shifts per unit change in environmental factor.
 *
 * @module engines/ProcessEnvironmentSensitivityEngine
 */

// ============================================================================
// ENVIRONMENTAL FACTOR TYPES
// ============================================================================

export interface TemperatureEnvironment {
  ambient: number; // °C
  coolantSupply: number; // °C
  coolantReturn: number; // °C (shows heat pickup)
  spindleHead: number; // °C
  xAxisMotor: number; // °C
  yAxisMotor: number; // °C
  zAxisMotor: number; // °C
  hydraulicOil: number; // °C
  machineStructure: number; // °C
  measurementProbe: number; // °C (critical for gauging)
}

export interface HumidityEnvironment {
  relativeHumidity: number; // %
  dewPoint: number; // °C
  condensationRisk: boolean;
}

export interface VibrationEnvironment {
  floorVibration: number; // mm/s RMS
  nearbyMachineVibration: number; // mm/s RMS
  trafficVibration: number; // mm/s RMS (forklift, truck)
  hvacVibration: number; // mm/s RMS
  dominantFrequency: number; // Hz
  isolationEfficiency: number; // 0-1 (machine isolation)
}

export interface FluidEnvironment {
  coolantLevel: number; // %
  coolantConcentration: number; // %
  coolantPH: number;
  coolantBacteriaLevel: "low" | "medium" | "high";
  coolantFoaming: boolean;
  hydraulicPressure: number; // bar
  hydraulicTemperature: number; // °C
  hydraulicContamination: number; // NAS class
  wayLubeLevel: number; // %
  airSupplyPressure: number; // bar
  airSupplyDewPoint: number; // °C
}

export interface ElectricalEnvironment {
  lineVoltage: number; // V
  voltageStability: number; // % variation
  powerFactor: number;
  harmonicDistortion: number; // % THD
  groundingQuality: "good" | "marginal" | "poor";
}

export interface TemporalFactors {
  timeOfDay: number; // 0-24
  dayOfWeek: number; // 0-6 (Sun-Sat)
  dayOfYear: number; // 1-365
  machineUptimeMinutes: number;
  timeSinceLastMaintenance: number; // hours
  timeSinceSpindleWarmup: number; // minutes
  productionShift: "day" | "afternoon" | "night" | "weekend";
}

export interface FullEnvironment {
  timestamp: string;
  temperature: TemperatureEnvironment;
  humidity: HumidityEnvironment;
  vibration: VibrationEnvironment;
  fluids: FluidEnvironment;
  electrical: ElectricalEnvironment;
  temporal: TemporalFactors;
}

// ============================================================================
// SENSITIVITY COEFFICIENTS
// ============================================================================

export interface SensitivityCoefficient {
  parameter: string; // affected machining parameter
  factor: string; // environmental factor
  sensitivity: number; // change per unit
  unit: string; // unit of sensitivity
  direction: "positive" | "negative" | "nonlinear";
  threshold?: number; // factor value where effect becomes significant
  saturation?: number; // factor value where effect saturates
  confidence: number; // 0-1
  source: string; // calibration, literature, estimate
}

export interface EnvironmentalCorrection {
  parameter: string;
  nominalValue: number;
  correctedValue: number;
  totalCorrection: number;
  corrections: Array<{
    factor: string;
    contribution: number;
    coefficient: SensitivityCoefficient;
  }>;
  confidence: number;
}

export interface EnvironmentalRisk {
  factor: string;
  currentValue: number;
  optimalRange: { min: number; max: number };
  severity: "nominal" | "marginal" | "warning" | "critical";
  affectedParameters: string[];
  recommendation: string;
}

// ============================================================================
// DEFAULT SENSITIVITY COEFFICIENTS
// ============================================================================

const DEFAULT_COEFFICIENTS: SensitivityCoefficient[] = [
  // Temperature effects on dimensions
  {
    parameter: "z_axis_position",
    factor: "spindle_temperature",
    sensitivity: 1.5, // μm per °C
    unit: "μm/°C",
    direction: "positive",
    threshold: 25,
    confidence: 0.9,
    source: "machine_calibration",
  },
  {
    parameter: "x_axis_position",
    factor: "ambient_temperature",
    sensitivity: 0.8, // μm per °C per meter
    unit: "μm/°C/m",
    direction: "positive",
    threshold: 18,
    confidence: 0.85,
    source: "literature",
  },
  {
    parameter: "part_dimension",
    factor: "part_temperature",
    sensitivity: 12, // μm per °C per meter (steel)
    unit: "μm/°C/m",
    direction: "positive",
    confidence: 0.95,
    source: "physics",
  },

  // Humidity effects
  {
    parameter: "surface_finish",
    factor: "relative_humidity",
    sensitivity: 0.01, // Ra increase per % RH above 60%
    unit: "Ra/% RH",
    direction: "positive",
    threshold: 60,
    confidence: 0.5,
    source: "empirical",
  },

  // Vibration effects
  {
    parameter: "surface_roughness",
    factor: "floor_vibration",
    sensitivity: 0.5, // Ra μm per mm/s
    unit: "Ra/(mm/s)",
    direction: "positive",
    threshold: 0.1,
    confidence: 0.7,
    source: "empirical",
  },
  {
    parameter: "dimensional_accuracy",
    factor: "floor_vibration",
    sensitivity: 2, // μm per mm/s
    unit: "μm/(mm/s)",
    direction: "positive",
    threshold: 0.1,
    confidence: 0.7,
    source: "empirical",
  },

  // Coolant effects
  {
    parameter: "tool_life",
    factor: "coolant_concentration",
    sensitivity: 3, // % tool life per % concentration
    unit: "%/%",
    direction: "nonlinear",
    threshold: 4, // below 4% is marginal
    saturation: 12, // above 12% no additional benefit
    confidence: 0.6,
    source: "literature",
  },
  {
    parameter: "surface_finish",
    factor: "coolant_temperature",
    sensitivity: 0.02, // Ra per °C above 30
    unit: "Ra/°C",
    direction: "positive",
    threshold: 30,
    confidence: 0.5,
    source: "estimate",
  },

  // Time effects
  {
    parameter: "z_axis_drift",
    factor: "machine_uptime",
    sensitivity: -0.5, // μm per hour (negative = settling)
    unit: "μm/h",
    direction: "negative",
    saturation: 120, // stable after 2 hours
    confidence: 0.8,
    source: "calibration",
  },

  // Electrical effects
  {
    parameter: "spindle_speed_accuracy",
    factor: "voltage_variation",
    sensitivity: 0.1, // % speed error per % voltage drop
    unit: "%/%",
    direction: "negative",
    threshold: 2,
    confidence: 0.7,
    source: "literature",
  },

  // Air pressure effects
  {
    parameter: "air_bearing_stiffness",
    factor: "air_supply_pressure",
    sensitivity: 5, // % stiffness per bar
    unit: "%/bar",
    direction: "positive",
    threshold: 5.5, // below 5.5 bar is marginal
    confidence: 0.8,
    source: "manufacturer",
  },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class ProcessEnvironmentSensitivityEngine {
  private coefficients: SensitivityCoefficient[] = [...DEFAULT_COEFFICIENTS];
  private environmentHistory: FullEnvironment[] = [];
  private readonly maxHistory = 1440; // 24 hours at 1-minute intervals

  /**
   * Calculate environmental corrections for machining parameters
   */
  calculateCorrections(
    environment: FullEnvironment,
    parameters: Array<{
      name: string;
      nominalValue: number;
      unit: string;
    }>
  ): EnvironmentalCorrection[] {
    const corrections: EnvironmentalCorrection[] = [];

    for (const param of parameters) {
      const relevantCoeffs = this.coefficients.filter(c => c.parameter === param.name);
      const paramCorrections: EnvironmentalCorrection["corrections"] = [];
      let totalCorrection = 0;
      let confidenceSum = 0;

      for (const coeff of relevantCoeffs) {
        const factorValue = this.getFactorValue(coeff.factor, environment);
        if (factorValue === null) continue;

        let contribution = 0;

        // Apply threshold
        if (coeff.threshold !== undefined && coeff.direction !== "negative") {
          if (factorValue < coeff.threshold) continue;
          contribution = (factorValue - coeff.threshold) * coeff.sensitivity;
        } else if (coeff.threshold !== undefined && coeff.direction === "negative") {
          if (factorValue > coeff.threshold) continue;
          contribution = (coeff.threshold - factorValue) * coeff.sensitivity;
        } else {
          contribution = factorValue * coeff.sensitivity;
        }

        // Apply saturation
        if (coeff.saturation !== undefined) {
          const saturatedValue = Math.min(factorValue, coeff.saturation);
          const baseValue = coeff.threshold ?? 0;
          contribution = (saturatedValue - baseValue) * coeff.sensitivity;
        }

        // Direction
        if (coeff.direction === "negative") {
          contribution = -contribution;
        }

        if (Math.abs(contribution) > 0.001) {
          paramCorrections.push({
            factor: coeff.factor,
            contribution,
            coefficient: coeff,
          });
          totalCorrection += contribution;
          confidenceSum += coeff.confidence;
        }
      }

      const avgConfidence = paramCorrections.length > 0
        ? confidenceSum / paramCorrections.length
        : 1;

      corrections.push({
        parameter: param.name,
        nominalValue: param.nominalValue,
        correctedValue: param.nominalValue + totalCorrection,
        totalCorrection,
        corrections: paramCorrections,
        confidence: avgConfidence,
      });
    }

    return corrections;
  }

  /**
   * Get factor value from environment
   */
  private getFactorValue(factor: string, env: FullEnvironment): number | null {
    const mapping: Record<string, () => number> = {
      spindle_temperature: () => env.temperature.spindleHead,
      ambient_temperature: () => env.temperature.ambient,
      part_temperature: () => env.temperature.ambient + 5, // estimate
      coolant_temperature: () => env.temperature.coolantSupply,
      relative_humidity: () => env.humidity.relativeHumidity,
      floor_vibration: () => env.vibration.floorVibration,
      coolant_concentration: () => env.fluids.coolantConcentration,
      machine_uptime: () => env.temporal.machineUptimeMinutes / 60,
      voltage_variation: () => (env.electrical.lineVoltage - 480) / 480 * 100,
      air_supply_pressure: () => env.fluids.airSupplyPressure,
    };

    const getter = mapping[factor];
    return getter ? getter() : null;
  }

  /**
   * Assess environmental risks
   */
  assessEnvironmentalRisks(environment: FullEnvironment): EnvironmentalRisk[] {
    const risks: EnvironmentalRisk[] = [];

    // Temperature risks
    if (environment.temperature.ambient < 18 || environment.temperature.ambient > 25) {
      risks.push({
        factor: "ambient_temperature",
        currentValue: environment.temperature.ambient,
        optimalRange: { min: 18, max: 25 },
        severity: environment.temperature.ambient < 15 || environment.temperature.ambient > 28 ? "critical" : "warning",
        affectedParameters: ["dimensional_accuracy", "surface_finish"],
        recommendation: environment.temperature.ambient < 18
          ? "Wait for shop to warm up or enable supplemental heating"
          : "Enable additional cooling or schedule precision work for cooler periods",
      });
    }

    // Spindle thermal drift
    const spindleDrift = Math.abs(environment.temperature.spindleHead - environment.temperature.ambient);
    if (spindleDrift > 10) {
      risks.push({
        factor: "spindle_thermal_drift",
        currentValue: spindleDrift,
        optimalRange: { min: 0, max: 10 },
        severity: spindleDrift > 20 ? "critical" : "warning",
        affectedParameters: ["z_axis_position", "tool_length"],
        recommendation: "Run spindle warmup cycle before precision work",
      });
    }

    // Humidity risks
    if (environment.humidity.relativeHumidity > 70) {
      risks.push({
        factor: "relative_humidity",
        currentValue: environment.humidity.relativeHumidity,
        optimalRange: { min: 30, max: 60 },
        severity: environment.humidity.relativeHumidity > 80 ? "critical" : "warning",
        affectedParameters: ["corrosion_risk", "coolant_performance"],
        recommendation: "Enable dehumidification, ensure part protection",
      });
    }
    if (environment.humidity.condensationRisk) {
      risks.push({
        factor: "condensation",
        currentValue: 1,
        optimalRange: { min: 0, max: 0 },
        severity: "critical",
        affectedParameters: ["surface_quality", "rust_prevention"],
        recommendation: "STOP precision work, increase ambient temperature above dew point",
      });
    }

    // Vibration risks
    if (environment.vibration.floorVibration > 0.5) {
      risks.push({
        factor: "floor_vibration",
        currentValue: environment.vibration.floorVibration,
        optimalRange: { min: 0, max: 0.3 },
        severity: environment.vibration.floorVibration > 1 ? "critical" : "warning",
        affectedParameters: ["surface_finish", "dimensional_accuracy"],
        recommendation: "Identify vibration source, schedule precision work when quiet",
      });
    }

    // Coolant risks
    if (environment.fluids.coolantConcentration < 5) {
      risks.push({
        factor: "coolant_concentration",
        currentValue: environment.fluids.coolantConcentration,
        optimalRange: { min: 6, max: 10 },
        severity: environment.fluids.coolantConcentration < 3 ? "critical" : "warning",
        affectedParameters: ["tool_life", "corrosion_protection"],
        recommendation: "Add coolant concentrate immediately",
      });
    }
    if (environment.fluids.coolantBacteriaLevel === "high") {
      risks.push({
        factor: "coolant_bacteria",
        currentValue: 3,
        optimalRange: { min: 0, max: 1 },
        severity: "critical",
        affectedParameters: ["health_safety", "coolant_performance"],
        recommendation: "Treat coolant with biocide or schedule sump clean",
      });
    }
    if (environment.fluids.coolantPH < 8.5 || environment.fluids.coolantPH > 9.5) {
      risks.push({
        factor: "coolant_pH",
        currentValue: environment.fluids.coolantPH,
        optimalRange: { min: 8.5, max: 9.5 },
        severity: "warning",
        affectedParameters: ["corrosion_protection", "tool_life"],
        recommendation: "Adjust coolant pH or replace",
      });
    }

    // Hydraulic risks
    if (environment.fluids.hydraulicTemperature > 55) {
      risks.push({
        factor: "hydraulic_temperature",
        currentValue: environment.fluids.hydraulicTemperature,
        optimalRange: { min: 35, max: 50 },
        severity: environment.fluids.hydraulicTemperature > 65 ? "critical" : "warning",
        affectedParameters: ["clamping_force", "axis_positioning"],
        recommendation: "Check hydraulic cooler, reduce duty cycle",
      });
    }

    // Air supply risks
    if (environment.fluids.airSupplyPressure < 5.5) {
      risks.push({
        factor: "air_supply_pressure",
        currentValue: environment.fluids.airSupplyPressure,
        optimalRange: { min: 6, max: 7 },
        severity: environment.fluids.airSupplyPressure < 5 ? "critical" : "warning",
        affectedParameters: ["tool_change", "air_bearing", "chip_blow"],
        recommendation: "Check compressor, air leaks, or filter restrictions",
      });
    }

    // Electrical risks
    if (environment.electrical.voltageStability > 5) {
      risks.push({
        factor: "voltage_stability",
        currentValue: environment.electrical.voltageStability,
        optimalRange: { min: 0, max: 3 },
        severity: environment.electrical.voltageStability > 10 ? "critical" : "warning",
        affectedParameters: ["spindle_speed", "servo_accuracy"],
        recommendation: "Investigate power supply, consider voltage regulator",
      });
    }

    // Temporal risks
    if (environment.temporal.timeSinceSpindleWarmup < 15) {
      risks.push({
        factor: "spindle_warmup",
        currentValue: environment.temporal.timeSinceSpindleWarmup,
        optimalRange: { min: 15, max: 999 },
        severity: environment.temporal.timeSinceSpindleWarmup < 5 ? "critical" : "warning",
        affectedParameters: ["dimensional_accuracy", "spindle_runout"],
        recommendation: "Complete warmup cycle before precision cutting",
      });
    }

    return risks;
  }

  /**
   * Calculate optimal operating window
   */
  calculateOptimalWindow(environment: FullEnvironment): {
    recommendation: "proceed" | "caution" | "delay" | "abort";
    optimalTimeWindow?: { start: number; end: number }; // hours from now
    corrections: Record<string, number>;
    reasons: string[];
  } {
    const risks = this.assessEnvironmentalRisks(environment);
    const criticalRisks = risks.filter(r => r.severity === "critical");
    const warningRisks = risks.filter(r => r.severity === "warning");

    let recommendation: "proceed" | "caution" | "delay" | "abort";
    const reasons: string[] = [];

    if (criticalRisks.length > 2) {
      recommendation = "abort";
      reasons.push(...criticalRisks.map(r => `Critical: ${r.factor}`));
    } else if (criticalRisks.length > 0) {
      recommendation = "delay";
      reasons.push(...criticalRisks.map(r => `Critical: ${r.factor}`));
    } else if (warningRisks.length > 3) {
      recommendation = "caution";
      reasons.push(`${warningRisks.length} warning conditions present`);
    } else {
      recommendation = "proceed";
    }

    // Calculate corrections
    const corrections: Record<string, number> = {};
    const envCorrections = this.calculateCorrections(environment, [
      { name: "z_axis_position", nominalValue: 0, unit: "mm" },
      { name: "dimensional_accuracy", nominalValue: 0, unit: "mm" },
    ]);

    for (const corr of envCorrections) {
      if (Math.abs(corr.totalCorrection) > 0.001) {
        corrections[corr.parameter] = corr.totalCorrection;
      }
    }

    // Predict better time
    let optimalTimeWindow: { start: number; end: number } | undefined;

    // Early morning typically has better temperature stability
    const currentHour = environment.temporal.timeOfDay;
    if (currentHour >= 10 && currentHour <= 14) {
      // Afternoon is often worst
      optimalTimeWindow = { start: 6, end: 9 }; // suggest early morning
    }

    return { recommendation, optimalTimeWindow, corrections, reasons };
  }

  /**
   * Record environment for trend analysis
   */
  recordEnvironment(environment: FullEnvironment): void {
    this.environmentHistory.push(environment);
    if (this.environmentHistory.length > this.maxHistory) {
      this.environmentHistory.shift();
    }
  }

  /**
   * Get environmental trends
   */
  getEnvironmentTrends(hours: number = 4): {
    temperatureTrend: "rising" | "falling" | "stable";
    vibrationTrend: "rising" | "falling" | "stable";
    stabilityScore: number; // 0-1 (1 = very stable)
  } {
    const samples = Math.min(hours * 60, this.environmentHistory.length);
    if (samples < 10) {
      return { temperatureTrend: "stable", vibrationTrend: "stable", stabilityScore: 0.5 };
    }

    const recent = this.environmentHistory.slice(-samples);
    const temps = recent.map(e => e.temperature.ambient);
    const vibs = recent.map(e => e.vibration.floorVibration);

    const tempSlope = this.linearRegression(temps);
    const vibSlope = this.linearRegression(vibs);

    const temperatureTrend = tempSlope > 0.1 ? "rising" : tempSlope < -0.1 ? "falling" : "stable";
    const vibrationTrend = vibSlope > 0.01 ? "rising" : vibSlope < -0.01 ? "falling" : "stable";

    // Stability = low variance
    const tempVariance = this.variance(temps);
    const vibVariance = this.variance(vibs);
    const stabilityScore = Math.max(0, 1 - tempVariance / 10 - vibVariance * 10);

    return { temperatureTrend, vibrationTrend, stabilityScore };
  }

  private linearRegression(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  /**
   * Add custom sensitivity coefficient
   */
  addCoefficient(coeff: SensitivityCoefficient): void {
    const existing = this.coefficients.findIndex(
      c => c.parameter === coeff.parameter && c.factor === coeff.factor
    );
    if (existing >= 0) {
      this.coefficients[existing] = coeff;
    } else {
      this.coefficients.push(coeff);
    }
  }

  /**
   * Get all coefficients
   */
  getCoefficients(): SensitivityCoefficient[] {
    return [...this.coefficients];
  }
}

export const processEnvironmentSensitivityEngine = new ProcessEnvironmentSensitivityEngine();
