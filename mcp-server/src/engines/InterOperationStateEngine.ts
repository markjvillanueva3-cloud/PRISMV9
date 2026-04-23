/**
 * InterOperationStateEngine — State Handoff Between Operations
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Tracks and transfers state between operations. What happened in roughing
 * affects what should happen in semi-finish. What happened in semi-finish
 * affects finishing parameters.
 *
 * State includes:
 * - Tool wear accumulated
 * - Thermal state of part and machine
 * - Stock condition (remaining material profile)
 * - Surface condition from previous op
 * - Chip buildup / coolant condition
 * - Vibration patterns observed
 *
 * @module engines/InterOperationStateEngine
 */

import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { variabilitySourceTrackerEngine } from "./VariabilitySourceTrackerEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";

export interface ThermalState {
  partTemperature: number; // °C
  spindleTemperature: number; // °C
  coolantTemperature: number; // °C
  ambientTemperature: number; // °C
  thermalExpansion: number; // μm estimated
  timeSinceLastCut: number; // seconds
}

export interface StockCondition {
  remainingAllowance: number; // mm
  surfaceHardness: number; // HRC (may have work hardened)
  surfaceRoughness: number; // Ra
  residualStress: "compressive" | "tensile" | "neutral";
  chipLoadHistory: number[]; // recent chip loads
}

export interface MachineState {
  spindleWarmupMinutes: number;
  axisBacklash: { x: number; y: number; z: number }; // μm
  vibrationBaseline: number; // g
  coolantLevel: number; // %
  coolantConcentration: number; // %
}

export interface OperationState {
  operationId: string;
  timestamp: string;
  toolId: string;
  toolWearAfter: number; // %
  thermal: ThermalState;
  stock: StockCondition;
  machine: MachineState;
  actualCycleTime: number; // seconds
  qualityMetrics: {
    dimensionalDeviation: number; // mm
    surfaceFinishAchieved: number; // Ra
    roundnessError: number; // mm
  };
  anomalies: string[];
}

export interface OperationRecommendation {
  parameter: string;
  adjustment: number; // multiplier
  reason: string;
  confidence: number;
  source: "thermal" | "wear" | "stock" | "vibration" | "historical";
}

class InterOperationStateEngine {
  private operationHistory: OperationState[] = [];
  private currentJobId: string = "";
  private readonly maxHistory = 100;

  /**
   * Start tracking a new job
   */
  startJob(jobId: string): void {
    this.currentJobId = jobId;
    this.operationHistory = [];
  }

  /**
   * Record state after an operation completes
   */
  recordOperationState(state: OperationState): void {
    this.operationHistory.push(state);
    if (this.operationHistory.length > this.maxHistory) {
      this.operationHistory.shift();
    }

    // Feed to variability tracking
    if (state.qualityMetrics.dimensionalDeviation > 0) {
      variabilitySourceTrackerEngine.recordObservation({
        parameter: "dimensional_deviation",
        expectedValue: 0,
        actualValue: state.qualityMetrics.dimensionalDeviation,
        context: {
          tool_usage_minutes: state.toolWearAfter,
          temperature_change: state.thermal.partTemperature - 20,
          operation_id: state.operationId,
        },
      });
    }
  }

  /**
   * Get recommendations for next operation based on prior state
   */
  getNextOperationRecommendations(
    nextOpType: "roughing" | "semi-finish" | "finishing",
    targetTolerance: number
  ): OperationRecommendation[] {
    const recommendations: OperationRecommendation[] = [];
    const lastOp = this.operationHistory[this.operationHistory.length - 1];

    if (!lastOp) return recommendations;

    // Thermal compensation
    if (lastOp.thermal.partTemperature > 30) {
      const tempRise = lastOp.thermal.partTemperature - 20;
      // Steel expands ~12 μm/m/°C
      const expansion = tempRise * 12 * 0.001; // mm per meter of part

      if (expansion > targetTolerance * 0.1) {
        recommendations.push({
          parameter: "wait_time",
          adjustment: Math.ceil(tempRise / 2), // wait 1 min per 2°C
          reason: `Part temperature ${lastOp.thermal.partTemperature}°C - thermal expansion ${(expansion * 1000).toFixed(1)}μm`,
          confidence: 0.85,
          source: "thermal",
        });
      }

      if (nextOpType === "finishing") {
        recommendations.push({
          parameter: "depth_of_cut",
          adjustment: 0.8, // reduce 20%
          reason: "Reduce heat input to minimize additional thermal growth",
          confidence: 0.75,
          source: "thermal",
        });
      }
    }

    // Tool wear compensation
    if (lastOp.toolWearAfter > 30) {
      recommendations.push({
        parameter: "feed_rate",
        adjustment: 1 - (lastOp.toolWearAfter - 30) * 0.005, // reduce 0.5% per % wear above 30%
        reason: `Tool wear at ${lastOp.toolWearAfter}% - compensate with feed reduction`,
        confidence: 0.8,
        source: "wear",
      });
    }

    // Stock condition adjustments
    if (lastOp.stock.surfaceHardness > 45) {
      // Work hardened surface
      recommendations.push({
        parameter: "cutting_speed",
        adjustment: 0.85,
        reason: `Surface work hardened to ${lastOp.stock.surfaceHardness} HRC`,
        confidence: 0.7,
        source: "stock",
      });
    }

    if (lastOp.stock.surfaceRoughness > 6.3 && nextOpType !== "roughing") {
      recommendations.push({
        parameter: "depth_of_cut",
        adjustment: 1.2, // increase to remove rough surface
        reason: `Rough surface (Ra ${lastOp.stock.surfaceRoughness}) needs more stock removal`,
        confidence: 0.65,
        source: "stock",
      });
    }

    // Machine state considerations
    if (lastOp.machine.vibrationBaseline > 0.5) {
      recommendations.push({
        parameter: "spindle_speed",
        adjustment: 0.95,
        reason: `Elevated vibration (${lastOp.machine.vibrationBaseline}g) - reduce speed`,
        confidence: 0.6,
        source: "vibration",
      });
    }

    // Spindle warmup
    if (lastOp.thermal.timeSinceLastCut > 300 && lastOp.machine.spindleWarmupMinutes < 15) {
      recommendations.push({
        parameter: "warmup_time",
        adjustment: 5, // minutes
        reason: "Spindle cooled down - recommend warmup cycle",
        confidence: 0.9,
        source: "thermal",
      });
    }

    // Historical learning from variability
    const evaluation = variabilityEnvelopeEngine.evaluate(
      "dimensional_deviation",
      targetTolerance
    );
    if (evaluation.percentile < 0.5) {
      // We're targeting tighter than typical
      recommendations.push({
        parameter: "feed_rate",
        adjustment: 0.9,
        reason: "Target tolerance tighter than p50 historical - conservative approach",
        confidence: 0.7,
        source: "historical",
      });
    }

    return recommendations;
  }

  /**
   * Predict quality outcome based on current state and parameters
   */
  predictQualityOutcome(
    params: {
      cuttingSpeed: number;
      feedRate: number;
      depthOfCut: number;
      toolWear: number;
    },
    targetRa: number,
    targetDimension: number
  ): {
    predictedRa: number;
    predictedDimensionalError: number;
    confidence: number;
    risks: string[];
  } {
    const risks: string[] = [];
    const lastOp = this.operationHistory[this.operationHistory.length - 1];

    // Surface finish prediction (simplified Brammertz formula)
    // Ra ≈ (f² / (8 × r)) × 1000 where f=feed/rev, r=nose radius
    const noseRadius = 0.8; // mm, typical
    const feedPerRev = params.feedRate / params.cuttingSpeed * Math.PI * 10; // approximate
    const theoreticalRa = (feedPerRev * feedPerRev / (8 * noseRadius)) * 1000;

    // Adjust for tool wear
    const wearFactor = 1 + params.toolWear * 0.02;
    let predictedRa = theoreticalRa * wearFactor;

    // Thermal effect on surface
    if (lastOp && lastOp.thermal.partTemperature > 40) {
      predictedRa *= 1.1;
      risks.push("Elevated part temperature may degrade surface finish");
    }

    // Dimensional prediction
    let predictedDimensionalError = 0;

    // Thermal expansion
    if (lastOp) {
      const expansion = (lastOp.thermal.partTemperature - 20) * 12 * 0.001;
      predictedDimensionalError += expansion;
    }

    // Tool wear causes dimension drift (typically undersized for OD)
    predictedDimensionalError += params.toolWear * 0.001;

    // Deflection under load (simplified)
    const deflection = params.depthOfCut * params.feedRate * 0.0001;
    predictedDimensionalError += deflection;

    // Risk assessment
    if (predictedRa > targetRa * 1.2) {
      risks.push(`Predicted Ra (${predictedRa.toFixed(2)}) exceeds target by >20%`);
    }
    if (predictedDimensionalError > targetDimension * 0.5) {
      risks.push(`Predicted dimensional error (${(predictedDimensionalError * 1000).toFixed(1)}μm) uses >50% of tolerance`);
    }

    // Confidence based on available data
    let confidence = 0.5;
    if (this.operationHistory.length > 5) confidence += 0.2;
    if (lastOp) confidence += 0.15;
    if (params.toolWear < 30) confidence += 0.1;

    return {
      predictedRa,
      predictedDimensionalError,
      confidence: Math.min(0.95, confidence),
      risks,
    };
  }

  /**
   * Get full state history for analysis
   */
  getOperationHistory(): OperationState[] {
    return [...this.operationHistory];
  }

  /**
   * Get last operation state
   */
  getLastOperationState(): OperationState | null {
    return this.operationHistory[this.operationHistory.length - 1] || null;
  }

  /**
   * Calculate accumulated state metrics
   */
  getAccumulatedMetrics(): {
    totalCuttingTime: number;
    avgThermalRise: number;
    totalMaterialRemoved: number;
    operationCount: number;
  } {
    if (this.operationHistory.length === 0) {
      return {
        totalCuttingTime: 0,
        avgThermalRise: 0,
        totalMaterialRemoved: 0,
        operationCount: 0,
      };
    }

    const totalCuttingTime = this.operationHistory.reduce((sum, op) => sum + op.actualCycleTime, 0);
    const avgThermalRise = this.operationHistory.reduce(
      (sum, op) => sum + op.thermal.partTemperature - 20, 0
    ) / this.operationHistory.length;

    return {
      totalCuttingTime,
      avgThermalRise,
      totalMaterialRemoved: 0, // Would need stock tracking
      operationCount: this.operationHistory.length,
    };
  }
}

export const interOperationStateEngine = new InterOperationStateEngine();
