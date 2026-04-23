/**
 * WEDMLearningLoopEngine
 * U-PROD-20: Continuous learning from WEDM job outcomes
 *
 * Features:
 * - Records predicted vs actual cutting parameters
 * - Updates prediction confidence based on outcomes
 * - Tracks material/wire/thickness correlation patterns
 * - Suggests parameter adjustments based on history
 */

export interface JobOutcome {
  job_id: string;
  timestamp: Date;
  material: string;
  thickness_mm: number;
  wire_type: string;
  wire_diameter_mm: number;
  predicted: {
    cutting_speed_mm_min: number;
    wire_tension_N: number;
    peak_current_A: number;
    passes: number;
    time_min: number;
  };
  actual: {
    cutting_speed_mm_min: number;
    wire_tension_N: number;
    peak_current_A: number;
    passes: number;
    time_min: number;
    wire_breaks: number;
    surface_finish_Ra_um?: number;
  };
  success: boolean;
  notes?: string;
}

export interface LearningStats {
  total_jobs: number;
  success_rate: number;
  avg_speed_deviation_percent: number;
  avg_time_deviation_percent: number;
  wire_break_rate: number;
  materials_tracked: string[];
}

export interface ParameterAdjustment {
  parameter: string;
  suggested_factor: number;
  confidence: number;
  based_on_jobs: number;
  reason: string;
}

export interface LearningRecommendation {
  material: string;
  thickness_range_mm: [number, number];
  adjustments: ParameterAdjustment[];
  overall_confidence: number;
}

export class WEDMLearningLoopEngine {
  private outcomes: JobOutcome[] = [];
  private materialStats = new Map<string, {
    jobs: number;
    successes: number;
    speedDeviations: number[];
    timeDeviations: number[];
    wireBreaks: number;
  }>();

  private config = {
    min_jobs_for_recommendation: 3,
    speed_deviation_threshold: 0.15,
    time_deviation_threshold: 0.20,
    confidence_decay_per_day: 0.01,
    max_history_days: 365,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Record a job outcome for learning
   */
  recordOutcome(outcome: JobOutcome): void {
    this.outcomes.push(outcome);
    this.updateMaterialStats(outcome);
  }

  /**
   * Update material-specific statistics
   */
  private updateMaterialStats(outcome: JobOutcome): void {
    const key = `${outcome.material}_${Math.round(outcome.thickness_mm / 5) * 5}`;

    if (!this.materialStats.has(key)) {
      this.materialStats.set(key, {
        jobs: 0,
        successes: 0,
        speedDeviations: [],
        timeDeviations: [],
        wireBreaks: 0,
      });
    }

    const stats = this.materialStats.get(key)!;
    stats.jobs++;
    if (outcome.success) stats.successes++;
    stats.wireBreaks += outcome.actual.wire_breaks;

    // Calculate deviations
    const speedDev = (outcome.actual.cutting_speed_mm_min - outcome.predicted.cutting_speed_mm_min) /
      outcome.predicted.cutting_speed_mm_min;
    const timeDev = (outcome.actual.time_min - outcome.predicted.time_min) /
      outcome.predicted.time_min;

    stats.speedDeviations.push(speedDev);
    stats.timeDeviations.push(timeDev);
  }

  /**
   * Get learning statistics
   */
  getStats(): LearningStats {
    const totalJobs = this.outcomes.length;
    if (totalJobs === 0) {
      return {
        total_jobs: 0,
        success_rate: 0,
        avg_speed_deviation_percent: 0,
        avg_time_deviation_percent: 0,
        wire_break_rate: 0,
        materials_tracked: [],
      };
    }

    const successes = this.outcomes.filter(o => o.success).length;
    const totalBreaks = this.outcomes.reduce((sum, o) => sum + o.actual.wire_breaks, 0);

    let totalSpeedDev = 0;
    let totalTimeDev = 0;

    for (const outcome of this.outcomes) {
      const speedDev = Math.abs(
        (outcome.actual.cutting_speed_mm_min - outcome.predicted.cutting_speed_mm_min) /
        outcome.predicted.cutting_speed_mm_min
      );
      const timeDev = Math.abs(
        (outcome.actual.time_min - outcome.predicted.time_min) /
        outcome.predicted.time_min
      );
      totalSpeedDev += speedDev;
      totalTimeDev += timeDev;
    }

    const materials = new Set(this.outcomes.map(o => o.material));

    return {
      total_jobs: totalJobs,
      success_rate: successes / totalJobs,
      avg_speed_deviation_percent: (totalSpeedDev / totalJobs) * 100,
      avg_time_deviation_percent: (totalTimeDev / totalJobs) * 100,
      wire_break_rate: totalBreaks / totalJobs,
      materials_tracked: Array.from(materials),
    };
  }

  /**
   * Get recommendations for a specific material/thickness
   */
  getRecommendations(
    material: string,
    thicknessMm: number
  ): LearningRecommendation | null {
    const key = `${material}_${Math.round(thicknessMm / 5) * 5}`;
    const stats = this.materialStats.get(key);

    if (!stats || stats.jobs < this.config.min_jobs_for_recommendation) {
      return null;
    }

    const adjustments: ParameterAdjustment[] = [];

    // Analyze speed deviations
    const avgSpeedDev = stats.speedDeviations.reduce((a, b) => a + b, 0) / stats.speedDeviations.length;
    if (Math.abs(avgSpeedDev) > this.config.speed_deviation_threshold) {
      adjustments.push({
        parameter: 'cutting_speed_mm_min',
        suggested_factor: 1 + avgSpeedDev,
        confidence: Math.min(0.95, 0.5 + stats.jobs * 0.1),
        based_on_jobs: stats.jobs,
        reason: avgSpeedDev > 0
          ? 'Historical data shows faster speeds were achievable'
          : 'Historical data shows slower speeds were needed',
      });
    }

    // Analyze wire break rate
    const breakRate = stats.wireBreaks / stats.jobs;
    if (breakRate > 0.1) {
      adjustments.push({
        parameter: 'peak_current_A',
        suggested_factor: 0.9,
        confidence: Math.min(0.9, 0.4 + stats.jobs * 0.08),
        based_on_jobs: stats.jobs,
        reason: `Wire break rate ${(breakRate * 100).toFixed(0)}% suggests reducing current`,
      });
    }

    // Analyze time deviations
    const avgTimeDev = stats.timeDeviations.reduce((a, b) => a + b, 0) / stats.timeDeviations.length;
    if (Math.abs(avgTimeDev) > this.config.time_deviation_threshold) {
      adjustments.push({
        parameter: 'time_estimate',
        suggested_factor: 1 + avgTimeDev,
        confidence: Math.min(0.95, 0.5 + stats.jobs * 0.1),
        based_on_jobs: stats.jobs,
        reason: avgTimeDev > 0
          ? 'Jobs typically take longer than estimated'
          : 'Jobs typically complete faster than estimated',
      });
    }

    const overallConfidence = adjustments.length > 0
      ? adjustments.reduce((sum, a) => sum + a.confidence, 0) / adjustments.length
      : 0;

    return {
      material,
      thickness_range_mm: [thicknessMm - 2.5, thicknessMm + 2.5],
      adjustments,
      overall_confidence: overallConfidence,
    };
  }

  /**
   * Apply learned adjustments to predictions
   */
  applyLearning(
    material: string,
    thicknessMm: number,
    predictions: {
      cutting_speed_mm_min: number;
      peak_current_A: number;
      time_min: number;
    }
  ): {
    adjusted_speed: number;
    adjusted_current: number;
    adjusted_time: number;
    adjustments_applied: string[];
  } {
    const recommendations = this.getRecommendations(material, thicknessMm);

    let adjustedSpeed = predictions.cutting_speed_mm_min;
    let adjustedCurrent = predictions.peak_current_A;
    let adjustedTime = predictions.time_min;
    const adjustmentsApplied: string[] = [];

    if (recommendations) {
      for (const adj of recommendations.adjustments) {
        if (adj.confidence > 0.6) {
          switch (adj.parameter) {
            case 'cutting_speed_mm_min':
              adjustedSpeed *= adj.suggested_factor;
              adjustmentsApplied.push(`Speed × ${adj.suggested_factor.toFixed(2)}`);
              break;
            case 'peak_current_A':
              adjustedCurrent *= adj.suggested_factor;
              adjustmentsApplied.push(`Current × ${adj.suggested_factor.toFixed(2)}`);
              break;
            case 'time_estimate':
              adjustedTime *= adj.suggested_factor;
              adjustmentsApplied.push(`Time × ${adj.suggested_factor.toFixed(2)}`);
              break;
          }
        }
      }
    }

    return {
      adjusted_speed: adjustedSpeed,
      adjusted_current: adjustedCurrent,
      adjusted_time: adjustedTime,
      adjustments_applied: adjustmentsApplied,
    };
  }

  /**
   * Get outcomes for a specific material
   */
  getOutcomesByMaterial(material: string): JobOutcome[] {
    return this.outcomes.filter(o => o.material === material);
  }

  /**
   * Clear old outcomes beyond retention period
   */
  pruneOldOutcomes(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.max_history_days);

    const before = this.outcomes.length;
    this.outcomes = this.outcomes.filter(o => o.timestamp >= cutoff);

    // Rebuild material stats
    this.materialStats.clear();
    for (const outcome of this.outcomes) {
      this.updateMaterialStats(outcome);
    }

    return before - this.outcomes.length;
  }

  /**
   * Export learning data for persistence
   */
  exportData(): { outcomes: JobOutcome[]; exported_at: Date } {
    return {
      outcomes: [...this.outcomes],
      exported_at: new Date(),
    };
  }

  /**
   * Import learning data
   */
  importData(data: { outcomes: JobOutcome[] }): void {
    for (const outcome of data.outcomes) {
      this.recordOutcome({
        ...outcome,
        timestamp: new Date(outcome.timestamp),
      });
    }
  }
}

export const wedmLearningLoopEngine = new WEDMLearningLoopEngine();
