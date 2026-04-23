/**
 * VariabilitySourceTrackerEngine — Track Where Variability Comes From
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Tracks sources of variability in manufacturing processes. Knowing the
 * source enables compensation and prediction.
 *
 * Sources: material batch, tool wear, thermal drift, environment,
 * setup differences, operator variation.
 *
 * @module engines/VariabilitySourceTrackerEngine
 */

export type VariabilitySource =
  | "material_batch"
  | "tool_wear"
  | "thermal_drift"
  | "environmental"
  | "setup_variation"
  | "operator_variation"
  | "machine_state"
  | "measurement_noise"
  | "unknown";

export interface VariabilityObservation {
  id: string;
  timestamp: string;
  parameter: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  deviationPercent: number;
  source: VariabilitySource;
  confidence: number;
  context: Record<string, unknown>;
}

export interface SourceAttribution {
  source: VariabilitySource;
  contribution: number;
  observations: number;
  avgDeviation: number;
  trend: "increasing" | "stable" | "decreasing";
}

export interface VariabilityReport {
  parameter: string;
  totalObservations: number;
  avgDeviation: number;
  maxDeviation: number;
  sources: SourceAttribution[];
  recommendations: string[];
}

class VariabilitySourceTrackerEngine {
  private observations: VariabilityObservation[] = [];
  private idCounter = 0;
  private readonly maxObservations = 5000;

  /**
   * Record a variability observation
   */
  recordObservation(data: {
    parameter: string;
    expectedValue: number;
    actualValue: number;
    context: Record<string, unknown>;
  }): VariabilityObservation {
    const deviation = data.actualValue - data.expectedValue;
    const deviationPercent = (deviation / data.expectedValue) * 100;
    const source = this.attributeSource(data.context, deviation);

    const observation: VariabilityObservation = {
      id: `VO-${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      parameter: data.parameter,
      expectedValue: data.expectedValue,
      actualValue: data.actualValue,
      deviation,
      deviationPercent,
      source: source.source,
      confidence: source.confidence,
      context: data.context,
    };

    this.observations.push(observation);
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }

    return observation;
  }

  /**
   * Attribute variability to most likely source
   */
  private attributeSource(
    context: Record<string, unknown>,
    deviation: number
  ): { source: VariabilitySource; confidence: number } {
    const scores: Record<VariabilitySource, number> = {
      material_batch: 0,
      tool_wear: 0,
      thermal_drift: 0,
      environmental: 0,
      setup_variation: 0,
      operator_variation: 0,
      machine_state: 0,
      measurement_noise: 0,
      unknown: 0.1,
    };

    if (context.material_batch_changed) scores.material_batch += 0.4;
    if (context.material_hardness_variance) scores.material_batch += 0.3;

    if (context.tool_usage_minutes && Number(context.tool_usage_minutes) > 30) {
      scores.tool_wear += 0.3 + Math.min(0.4, Number(context.tool_usage_minutes) / 200);
    }
    if (context.tool_changed_recently) scores.tool_wear -= 0.3;

    if (context.temperature_change && Math.abs(Number(context.temperature_change)) > 2) {
      scores.thermal_drift += 0.3 + Math.min(0.3, Math.abs(Number(context.temperature_change)) / 10);
    }
    if (context.machine_warmup_minutes && Number(context.machine_warmup_minutes) < 15) {
      scores.thermal_drift += 0.2;
    }

    if (context.ambient_temp_change || context.humidity_change) {
      scores.environmental += 0.2;
    }

    if (context.setup_changed || context.fixture_changed) {
      scores.setup_variation += 0.4;
    }
    if (context.first_part_after_setup) {
      scores.setup_variation += 0.3;
    }

    if (context.operator_changed) {
      scores.operator_variation += 0.3;
    }
    if (context.operator_experience === "novice") {
      scores.operator_variation += 0.2;
    }

    if (context.machine_error_codes || context.spindle_vibration_high) {
      scores.machine_state += 0.4;
    }

    if (Math.abs(deviation) < 0.01 * Number(context.expected_value || 100)) {
      scores.measurement_noise += 0.3;
    }

    let maxSource: VariabilitySource = "unknown";
    let maxScore = 0;
    for (const [source, score] of Object.entries(scores) as [VariabilitySource, number][]) {
      if (score > maxScore) {
        maxScore = score;
        maxSource = source;
      }
    }

    return {
      source: maxSource,
      confidence: Math.min(0.95, maxScore),
    };
  }

  /**
   * Generate variability report for a parameter
   */
  generateReport(parameter: string): VariabilityReport {
    const relevant = this.observations.filter(o => o.parameter === parameter);

    if (relevant.length === 0) {
      return {
        parameter,
        totalObservations: 0,
        avgDeviation: 0,
        maxDeviation: 0,
        sources: [],
        recommendations: ["No observations recorded for this parameter"],
      };
    }

    const avgDeviation = relevant.reduce((sum, o) => sum + Math.abs(o.deviation), 0) / relevant.length;
    const maxDeviation = Math.max(...relevant.map(o => Math.abs(o.deviation)));

    const sourceGroups = new Map<VariabilitySource, VariabilityObservation[]>();
    for (const obs of relevant) {
      if (!sourceGroups.has(obs.source)) {
        sourceGroups.set(obs.source, []);
      }
      sourceGroups.get(obs.source)!.push(obs);
    }

    const sources: SourceAttribution[] = [];
    for (const [source, observations] of sourceGroups) {
      const avgDev = observations.reduce((sum, o) => sum + Math.abs(o.deviation), 0) / observations.length;
      const contribution = observations.length / relevant.length;

      const recentCount = observations.filter(
        o => new Date(o.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
      const oldCount = observations.length - recentCount;
      const trend: "increasing" | "stable" | "decreasing" =
        recentCount > oldCount * 1.5 ? "increasing" : recentCount < oldCount * 0.5 ? "decreasing" : "stable";

      sources.push({
        source,
        contribution,
        observations: observations.length,
        avgDeviation: avgDev,
        trend,
      });
    }

    sources.sort((a, b) => b.contribution - a.contribution);

    const recommendations = this.generateRecommendations(sources);

    return {
      parameter,
      totalObservations: relevant.length,
      avgDeviation,
      maxDeviation,
      sources,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on variability sources
   */
  private generateRecommendations(sources: SourceAttribution[]): string[] {
    const recommendations: string[] = [];

    for (const source of sources.slice(0, 3)) {
      if (source.contribution < 0.1) continue;

      switch (source.source) {
        case "material_batch":
          recommendations.push("Implement incoming material inspection and tracking");
          recommendations.push("Consider material pre-qualification or certification");
          break;
        case "tool_wear":
          recommendations.push("Implement tool life monitoring and predictive replacement");
          recommendations.push("Consider adaptive feed rate compensation for tool wear");
          break;
        case "thermal_drift":
          recommendations.push("Extend machine warm-up time before production");
          recommendations.push("Implement thermal compensation in CNC controller");
          break;
        case "environmental":
          recommendations.push("Improve shop temperature/humidity control");
          recommendations.push("Schedule precision work during stable environmental periods");
          break;
        case "setup_variation":
          recommendations.push("Standardize setup procedures with checklists");
          recommendations.push("Implement first article verification protocol");
          break;
        case "operator_variation":
          recommendations.push("Develop standardized operating procedures");
          recommendations.push("Implement operator training and certification");
          break;
        case "machine_state":
          recommendations.push("Schedule preventive maintenance");
          recommendations.push("Monitor spindle vibration and axis backlash");
          break;
        case "measurement_noise":
          recommendations.push("Calibrate measurement equipment");
          recommendations.push("Implement repeated measurements for critical dimensions");
          break;
      }
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  /**
   * Get all reports
   */
  getAllReports(): VariabilityReport[] {
    const parameters = new Set(this.observations.map(o => o.parameter));
    return Array.from(parameters).map(p => this.generateReport(p));
  }

  /**
   * Get observations for analysis
   */
  getObservations(filter?: {
    parameter?: string;
    source?: VariabilitySource;
    since?: string;
  }): VariabilityObservation[] {
    return this.observations.filter(o => {
      if (filter?.parameter && o.parameter !== filter.parameter) return false;
      if (filter?.source && o.source !== filter.source) return false;
      if (filter?.since && o.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalObservations: number;
    parametersTracked: number;
    topSources: { source: VariabilitySource; count: number }[];
    avgConfidence: number;
  } {
    const parameters = new Set(this.observations.map(o => o.parameter));
    const sourceCounts = new Map<VariabilitySource, number>();

    for (const o of this.observations) {
      sourceCounts.set(o.source, (sourceCounts.get(o.source) || 0) + 1);
    }

    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgConfidence = this.observations.length > 0
      ? this.observations.reduce((sum, o) => sum + o.confidence, 0) / this.observations.length
      : 0;

    return {
      totalObservations: this.observations.length,
      parametersTracked: parameters.size,
      topSources,
      avgConfidence,
    };
  }

  /**
   * Export for persistence
   */
  export(): VariabilityObservation[] {
    return [...this.observations];
  }

  /**
   * Import from persistence
   */
  import(data: VariabilityObservation[]): void {
    this.observations = data;
    this.idCounter = Math.max(0, ...data.map(o => parseInt(o.id.replace("VO-", "")) || 0));
  }
}

export const variabilitySourceTrackerEngine = new VariabilitySourceTrackerEngine();
