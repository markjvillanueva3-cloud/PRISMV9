/**
 * WEDMDeviationToTipEngine — Convert Prediction Deviations to Tribal Tips
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-22
 *
 * Auto-generates tip candidates when actual results deviate from predictions.
 * Example: "Actual Ra 15% better than predicted for D2 at 30mm" becomes a tribal tip.
 *
 * TIP GENERATION:
 *   - Positive deviations → "consider aggressive settings" tips
 *   - Negative deviations → "be conservative" tips
 *   - Consistent patterns → high-confidence tips
 *
 * INTEGRATION:
 *   - Feeds into TribalKnowledgeEngine
 *   - Tips tagged with material, thickness, wire type
 *   - Confidence based on number of observations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  confidence: number;
  source: string;
  warning?: string;
}

export type DeviationType = 'surface_finish' | 'cut_speed' | 'wire_consumption' | 'cycle_time' | 'accuracy';

export interface DeviationRecord {
  job_id: string;
  deviation_type: DeviationType;
  predicted_value: number;
  actual_value: number;
  unit: string;
  material: string;
  thickness_mm: number;
  wire_type: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface GeneratedTip {
  id: string;
  category: 'wedm' | 'surface_finish' | 'speed_feed' | 'wire';
  subcategory: string;
  title: string;
  content: string;
  material_scope: string[];
  thickness_range_mm: [number, number];
  wire_scope: string[];
  confidence: AtomicValue;
  observation_count: number;
  avg_deviation_pct: number;
  source_jobs: string[];
  auto_generated: true;
  requires_review: boolean;
  created_at: Date;
}

export interface TipGenerationResult {
  tips_generated: GeneratedTip[];
  tips_pending_review: GeneratedTip[];
  deviations_analyzed: number;
  patterns_found: number;
  coverage_by_type: Record<DeviationType, number>;
}

export interface DeviationPattern {
  type: DeviationType;
  material: string;
  thickness_range: [number, number];
  wire_type: string;
  avg_deviation_pct: number;
  direction: 'better' | 'worse';
  observation_count: number;
  confidence: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEVIATION_THRESHOLD_PCT = 10;  // Minimum deviation to generate tip
const MIN_OBSERVATIONS = 3;           // Minimum observations for pattern
const HIGH_CONFIDENCE_OBSERVATIONS = 10;

// ============================================================================
// ENGINE
// ============================================================================

class WEDMDeviationToTipEngine {
  private deviations: DeviationRecord[] = [];
  private generatedTips: GeneratedTip[] = [];

  /**
   * Analyze deviations and generate tips
   */
  analyze(deviations: DeviationRecord[]): TipGenerationResult {
    this.deviations = deviations;
    this.generatedTips = [];

    // Group deviations by pattern
    const patterns = this.identifyPatterns(deviations);

    // Generate tips from significant patterns
    for (const pattern of patterns) {
      if (pattern.observation_count >= MIN_OBSERVATIONS &&
          Math.abs(pattern.avg_deviation_pct) >= DEVIATION_THRESHOLD_PCT) {
        const tip = this.generateTip(pattern);
        this.generatedTips.push(tip);
      }
    }

    // Calculate coverage
    const coverage: Record<DeviationType, number> = {
      surface_finish: 0,
      cut_speed: 0,
      wire_consumption: 0,
      cycle_time: 0,
      accuracy: 0,
    };
    for (const d of deviations) {
      coverage[d.deviation_type]++;
    }

    return {
      tips_generated: this.generatedTips,
      tips_pending_review: this.generatedTips.filter(t => t.requires_review),
      deviations_analyzed: deviations.length,
      patterns_found: patterns.length,
      coverage_by_type: coverage,
    };
  }

  /**
   * Add a single deviation and check if it creates/updates a tip
   */
  addDeviation(deviation: DeviationRecord): {
    tip_created: GeneratedTip | null;
    tip_updated: GeneratedTip | null;
    pattern_strengthened: boolean;
  } {
    this.deviations.push(deviation);

    // Find matching pattern
    const matchingTip = this.generatedTips.find(t =>
      t.material_scope.includes(deviation.material) &&
      deviation.thickness_mm >= t.thickness_range_mm[0] &&
      deviation.thickness_mm < t.thickness_range_mm[1] &&
      t.wire_scope.includes(deviation.wire_type)
    );

    if (matchingTip) {
      // Update existing tip
      matchingTip.observation_count++;
      matchingTip.source_jobs.push(deviation.job_id);
      const deviationPct = ((deviation.actual_value - deviation.predicted_value) /
        deviation.predicted_value) * 100;
      matchingTip.avg_deviation_pct =
        (matchingTip.avg_deviation_pct * (matchingTip.observation_count - 1) + deviationPct) /
        matchingTip.observation_count;

      // Increase confidence if more observations
      if (matchingTip.observation_count >= HIGH_CONFIDENCE_OBSERVATIONS) {
        matchingTip.confidence.value = Math.min(0.95, matchingTip.confidence.value + 0.05);
        matchingTip.requires_review = false;
      }

      return { tip_created: null, tip_updated: matchingTip, pattern_strengthened: true };
    }

    // Check if we now have enough observations for a new pattern
    const similarDeviations = this.deviations.filter(d =>
      d.material === deviation.material &&
      d.wire_type === deviation.wire_type &&
      d.deviation_type === deviation.deviation_type &&
      Math.abs(d.thickness_mm - deviation.thickness_mm) < 10
    );

    if (similarDeviations.length >= MIN_OBSERVATIONS) {
      const avgDeviation = similarDeviations.reduce((sum, d) =>
        sum + ((d.actual_value - d.predicted_value) / d.predicted_value) * 100, 0
      ) / similarDeviations.length;

      if (Math.abs(avgDeviation) >= DEVIATION_THRESHOLD_PCT) {
        const newTip = this.generateTip({
          type: deviation.deviation_type,
          material: deviation.material,
          thickness_range: this.getThicknessRange(deviation.thickness_mm),
          wire_type: deviation.wire_type,
          avg_deviation_pct: avgDeviation,
          direction: avgDeviation > 0 ? 'better' : 'worse',
          observation_count: similarDeviations.length,
          confidence: 0.7,
        });
        this.generatedTips.push(newTip);
        return { tip_created: newTip, tip_updated: null, pattern_strengthened: false };
      }
    }

    return { tip_created: null, tip_updated: null, pattern_strengthened: false };
  }

  /**
   * Get all generated tips
   */
  getTips(): GeneratedTip[] {
    return this.generatedTips;
  }

  /**
   * Get tips by material
   */
  getTipsByMaterial(material: string): GeneratedTip[] {
    return this.generatedTips.filter(t => t.material_scope.includes(material));
  }

  /**
   * Export tips for integration with TribalKnowledgeEngine
   */
  exportForTribalKnowledge(): {
    tips: Array<{
      id: string;
      category: string;
      content: string;
      confidence: number;
      source: string;
    }>;
  } {
    return {
      tips: this.generatedTips
        .filter(t => !t.requires_review)
        .map(t => ({
          id: t.id,
          category: t.category,
          content: t.content,
          confidence: t.confidence.value,
          source: 'WEDMDeviationToTipEngine:auto-generated',
        })),
    };
  }

  private identifyPatterns(deviations: DeviationRecord[]): DeviationPattern[] {
    const patterns: DeviationPattern[] = [];
    const grouped = this.groupDeviations(deviations);

    for (const [key, group] of grouped) {
      const [type, material, thicknessRange, wireType] = key.split('|');
      const avgDeviation = group.reduce((sum, d) =>
        sum + ((d.actual_value - d.predicted_value) / d.predicted_value) * 100, 0
      ) / group.length;

      // Determine direction based on metric type
      // For surface_finish, wire_consumption, cycle_time: lower is better (negative deviation = better)
      // For cut_speed: higher is better (positive deviation = better)
      const direction = this.interpretDeviationDirection(type as DeviationType, avgDeviation);

      patterns.push({
        type: type as DeviationType,
        material,
        thickness_range: JSON.parse(thicknessRange),
        wire_type: wireType,
        avg_deviation_pct: avgDeviation,
        direction,
        observation_count: group.length,
        confidence: this.calculatePatternConfidence(group.length, avgDeviation),
      });
    }

    return patterns;
  }

  private groupDeviations(deviations: DeviationRecord[]): Map<string, DeviationRecord[]> {
    const groups = new Map<string, DeviationRecord[]>();

    for (const d of deviations) {
      const thicknessRange = this.getThicknessRange(d.thickness_mm);
      const key = `${d.deviation_type}|${d.material}|${JSON.stringify(thicknessRange)}|${d.wire_type}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(d);
    }

    return groups;
  }

  private getThicknessRange(thickness_mm: number): [number, number] {
    if (thickness_mm < 5) return [0, 5];
    if (thickness_mm < 10) return [5, 10];
    if (thickness_mm < 25) return [10, 25];
    if (thickness_mm < 50) return [25, 50];
    if (thickness_mm < 100) return [50, 100];
    return [100, 500];
  }

  private interpretDeviationDirection(type: DeviationType, avgDeviation: number): 'better' | 'worse' {
    // For these metrics, LOWER actual value = BETTER outcome
    const lowerIsBetter: DeviationType[] = ['surface_finish', 'wire_consumption', 'cycle_time'];
    // For cut_speed, HIGHER = BETTER
    // For accuracy, depends on context (handled separately)

    if (lowerIsBetter.includes(type)) {
      // Negative deviation (actual < predicted) means better
      return avgDeviation < 0 ? 'better' : 'worse';
    } else if (type === 'cut_speed') {
      // Positive deviation (actual > predicted) means better
      return avgDeviation > 0 ? 'better' : 'worse';
    } else {
      // Default: lower is better
      return avgDeviation < 0 ? 'better' : 'worse';
    }
  }

  private calculatePatternConfidence(observations: number, avgDeviation: number): number {
    let confidence = 0.5;

    // More observations = higher confidence
    if (observations >= HIGH_CONFIDENCE_OBSERVATIONS) confidence += 0.3;
    else if (observations >= MIN_OBSERVATIONS) confidence += 0.15;

    // Larger deviation = higher confidence (clearer signal)
    if (Math.abs(avgDeviation) > 25) confidence += 0.1;
    if (Math.abs(avgDeviation) > 40) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  private generateTip(pattern: DeviationPattern): GeneratedTip {
    const tipId = `auto-${pattern.type}-${pattern.material}-${pattern.thickness_range[0]}-${pattern.thickness_range[1]}-${Date.now()}`;

    const title = this.generateTipTitle(pattern);
    const content = this.generateTipContent(pattern);
    const category = this.mapTypeToCategory(pattern.type);
    const subcategory = pattern.type;

    return {
      id: tipId,
      category,
      subcategory,
      title,
      content,
      material_scope: [pattern.material],
      thickness_range_mm: pattern.thickness_range,
      wire_scope: [pattern.wire_type],
      confidence: {
        value: pattern.confidence,
        unit: 'probability',
        uncertainty: 0.1,
        confidence: 0.85,
        source: 'WEDMDeviationToTipEngine:pattern-analysis',
      },
      observation_count: pattern.observation_count,
      avg_deviation_pct: pattern.avg_deviation_pct,
      source_jobs: [],
      auto_generated: true,
      requires_review: pattern.observation_count < HIGH_CONFIDENCE_OBSERVATIONS,
      created_at: new Date(),
    };
  }

  private generateTipTitle(pattern: DeviationPattern): string {
    const direction = pattern.direction === 'better' ? 'Better' : 'Worse';
    const metric = this.getMetricName(pattern.type);
    return `${direction} ${metric} for ${pattern.material} at ${pattern.thickness_range[0]}-${pattern.thickness_range[1]}mm`;
  }

  private generateTipContent(pattern: DeviationPattern): string {
    const direction = pattern.direction === 'better' ? 'better' : 'worse';
    const directionAdvice = pattern.direction === 'better'
      ? 'Consider more aggressive parameters for faster cycle times.'
      : 'Use conservative parameters to achieve predicted results.';

    const metric = this.getMetricName(pattern.type);
    const deviation = Math.abs(pattern.avg_deviation_pct).toFixed(0);

    return `Actual ${metric} is consistently ${deviation}% ${direction} than predicted ` +
      `for ${pattern.material} at ${pattern.thickness_range[0]}-${pattern.thickness_range[1]}mm ` +
      `with ${pattern.wire_type} wire. ${directionAdvice} ` +
      `Based on ${pattern.observation_count} observations.`;
  }

  private getMetricName(type: DeviationType): string {
    const names: Record<DeviationType, string> = {
      surface_finish: 'surface finish (Ra)',
      cut_speed: 'cutting speed',
      wire_consumption: 'wire consumption',
      cycle_time: 'cycle time',
      accuracy: 'dimensional accuracy',
    };
    return names[type];
  }

  private mapTypeToCategory(type: DeviationType): 'wedm' | 'surface_finish' | 'speed_feed' | 'wire' {
    const mapping: Record<DeviationType, 'wedm' | 'surface_finish' | 'speed_feed' | 'wire'> = {
      surface_finish: 'surface_finish',
      cut_speed: 'speed_feed',
      wire_consumption: 'wire',
      cycle_time: 'wedm',
      accuracy: 'wedm',
    };
    return mapping[type];
  }
}

export const wedmDeviationToTipEngine = new WEDMDeviationToTipEngine();
export { WEDMDeviationToTipEngine };
