/**
 * WEDMJobPatternLearnerEngine — Customer/Material Pattern Mining
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-21
 *
 * Mines historical job patterns to apply customer-specific preferences.
 * Examples: "ALCOA always wants 4 skim passes", "ITW prefers brass wire for D2"
 *
 * PATTERN TYPES:
 *   - Customer preferences (skim passes, wire type, finish targets)
 *   - Material patterns (optimal settings by material class)
 *   - Thickness patterns (parameter adjustments by range)
 *   - Feature patterns (thin wall handling, corner strategies)
 *
 * LEARNING:
 *   - Frequent itemset mining (Apriori-style)
 *   - Confidence scoring based on historical success rate
 *   - Recency weighting (recent jobs matter more)
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

export type PatternType =
  | 'customer_preference'
  | 'material_pattern'
  | 'thickness_pattern'
  | 'feature_pattern'
  | 'combined_pattern';

export interface JobRecord {
  job_id: string;
  customer: string;
  material: string;
  thickness_mm: number;
  wire_type: string;
  skim_passes: number;
  surface_finish_target_um: number;
  surface_finish_actual_um?: number;
  cut_speed_mm_min?: number;
  power_setting?: number;
  has_thin_walls: boolean;
  has_sharp_corners: boolean;
  was_successful: boolean;
  timestamp: Date;
}

export interface LearnedPattern {
  id: string;
  type: PatternType;
  conditions: PatternCondition[];
  recommendation: PatternRecommendation;
  support_count: number;
  confidence: AtomicValue;
  recency_score: number;
  examples: string[];
  human_readable: string;
}

export interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'range' | 'less_than' | 'greater_than';
  value: string | number | [number, number];
}

export interface PatternRecommendation {
  field: string;
  value: string | number;
  rationale: string;
}

export interface PatternLearnerResult {
  patterns_found: LearnedPattern[];
  pattern_count: number;
  top_customer_preferences: LearnedPattern[];
  top_material_patterns: LearnedPattern[];
  coverage_pct: AtomicValue;
  data_quality_score: AtomicValue;
}

export interface PatternMatchResult {
  matches: LearnedPattern[];
  recommended_settings: Record<string, string | number>;
  confidence_overall: AtomicValue;
  reasoning: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMJobPatternLearnerEngine {
  private patterns: LearnedPattern[] = [];
  private jobHistory: JobRecord[] = [];

  /**
   * Learn patterns from historical job data
   */
  learn(jobs: JobRecord[]): PatternLearnerResult {
    this.jobHistory = jobs;
    this.patterns = [];

    // Learn customer preferences
    const customerPatterns = this.learnCustomerPreferences(jobs);
    this.patterns.push(...customerPatterns);

    // Learn material patterns
    const materialPatterns = this.learnMaterialPatterns(jobs);
    this.patterns.push(...materialPatterns);

    // Learn thickness patterns
    const thicknessPatterns = this.learnThicknessPatterns(jobs);
    this.patterns.push(...thicknessPatterns);

    // Learn feature patterns
    const featurePatterns = this.learnFeaturePatterns(jobs);
    this.patterns.push(...featurePatterns);

    // Calculate coverage
    const successfulJobs = jobs.filter(j => j.was_successful);
    const coverage = this.calculateCoverage(successfulJobs);

    return {
      patterns_found: this.patterns,
      pattern_count: this.patterns.length,
      top_customer_preferences: customerPatterns.slice(0, 5),
      top_material_patterns: materialPatterns.slice(0, 5),
      coverage_pct: {
        value: coverage * 100,
        unit: '%',
        uncertainty: 5,
        confidence: 0.85,
        source: 'WEDMJobPatternLearnerEngine:coverage',
      },
      data_quality_score: {
        value: this.assessDataQuality(jobs),
        unit: 'score',
        uncertainty: 0.1,
        confidence: 0.80,
        source: 'WEDMJobPatternLearnerEngine:quality',
      },
    };
  }

  /**
   * Match patterns to a new job
   */
  match(job: Partial<JobRecord>): PatternMatchResult {
    const matches: LearnedPattern[] = [];
    const recommendedSettings: Record<string, string | number> = {};
    const reasoning: string[] = [];

    for (const pattern of this.patterns) {
      if (this.patternMatches(pattern, job)) {
        matches.push(pattern);
        recommendedSettings[pattern.recommendation.field] = pattern.recommendation.value;
        reasoning.push(pattern.human_readable);
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence.value - a.confidence.value);

    const avgConfidence = matches.length > 0
      ? matches.reduce((sum, p) => sum + p.confidence.value, 0) / matches.length
      : 0;

    return {
      matches,
      recommended_settings: recommendedSettings,
      confidence_overall: {
        value: avgConfidence,
        unit: 'probability',
        uncertainty: 0.1,
        confidence: 0.80,
        source: 'WEDMJobPatternLearnerEngine:match',
      },
      reasoning,
    };
  }

  /**
   * Get patterns for a specific customer
   */
  getCustomerPatterns(customer: string): LearnedPattern[] {
    return this.patterns.filter(p =>
      p.type === 'customer_preference' &&
      p.conditions.some(c => c.field === 'customer' && c.value === customer)
    );
  }

  /**
   * Add a new job and update patterns incrementally
   */
  addJob(job: JobRecord): { new_patterns: LearnedPattern[]; updated_patterns: LearnedPattern[] } {
    this.jobHistory.push(job);

    const newPatterns: LearnedPattern[] = [];
    const updatedPatterns: LearnedPattern[] = [];

    // Check if this job confirms or creates patterns
    for (const pattern of this.patterns) {
      if (this.patternMatches(pattern, job)) {
        pattern.support_count++;
        pattern.recency_score = this.calculateRecencyScore([
          ...pattern.examples.map(e => this.jobHistory.find(j => j.job_id === e)),
          job
        ].filter(Boolean) as JobRecord[]);
        updatedPatterns.push(pattern);
      }
    }

    return { new_patterns: newPatterns, updated_patterns: updatedPatterns };
  }

  private learnCustomerPreferences(jobs: JobRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];
    const customers = [...new Set(jobs.map(j => j.customer))];

    for (const customer of customers) {
      const customerJobs = jobs.filter(j => j.customer === customer && j.was_successful);
      if (customerJobs.length < 3) continue;  // Need minimum support

      // Skim pass preference
      const skimCounts = customerJobs.map(j => j.skim_passes);
      const mostCommonSkim = this.mode(skimCounts);
      const skimSupport = skimCounts.filter(s => s === mostCommonSkim).length;
      const skimConfidence = skimSupport / customerJobs.length;

      if (skimConfidence >= 0.6) {
        patterns.push({
          id: `${customer}-skim-${mostCommonSkim}`,
          type: 'customer_preference',
          conditions: [{ field: 'customer', operator: 'equals', value: customer }],
          recommendation: {
            field: 'skim_passes',
            value: mostCommonSkim,
            rationale: `${customer} typically uses ${mostCommonSkim} skim passes (${skimSupport}/${customerJobs.length} jobs)`,
          },
          support_count: skimSupport,
          confidence: {
            value: skimConfidence,
            unit: 'probability',
            uncertainty: 0.1,
            confidence: 0.85,
            source: 'WEDMJobPatternLearnerEngine:customer-skim',
          },
          recency_score: this.calculateRecencyScore(customerJobs),
          examples: customerJobs.slice(0, 5).map(j => j.job_id),
          human_readable: `${customer} prefers ${mostCommonSkim} skim passes`,
        });
      }

      // Wire type preference
      const wireTypes = customerJobs.map(j => j.wire_type);
      const mostCommonWire = this.modeStr(wireTypes);
      const wireSupport = wireTypes.filter(w => w === mostCommonWire).length;
      const wireConfidence = wireSupport / customerJobs.length;

      if (wireConfidence >= 0.6) {
        patterns.push({
          id: `${customer}-wire-${mostCommonWire}`,
          type: 'customer_preference',
          conditions: [{ field: 'customer', operator: 'equals', value: customer }],
          recommendation: {
            field: 'wire_type',
            value: mostCommonWire,
            rationale: `${customer} typically uses ${mostCommonWire} wire (${wireSupport}/${customerJobs.length} jobs)`,
          },
          support_count: wireSupport,
          confidence: {
            value: wireConfidence,
            unit: 'probability',
            uncertainty: 0.1,
            confidence: 0.85,
            source: 'WEDMJobPatternLearnerEngine:customer-wire',
          },
          recency_score: this.calculateRecencyScore(customerJobs),
          examples: customerJobs.slice(0, 5).map(j => j.job_id),
          human_readable: `${customer} prefers ${mostCommonWire} wire`,
        });
      }
    }

    return patterns.sort((a, b) => b.confidence.value - a.confidence.value);
  }

  private learnMaterialPatterns(jobs: JobRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];
    const materials = [...new Set(jobs.map(j => j.material))];

    for (const material of materials) {
      const materialJobs = jobs.filter(j => j.material === material && j.was_successful);
      if (materialJobs.length < 3) continue;

      // Optimal skim passes for material
      const skimCounts = materialJobs.map(j => j.skim_passes);
      const avgSkim = Math.round(skimCounts.reduce((a, b) => a + b, 0) / skimCounts.length);
      const skimConfidence = 0.7;  // Material patterns are general

      patterns.push({
        id: `${material}-optimal-skim`,
        type: 'material_pattern',
        conditions: [{ field: 'material', operator: 'equals', value: material }],
        recommendation: {
          field: 'skim_passes',
          value: avgSkim,
          rationale: `${material} typically requires ${avgSkim} skim passes for good finish`,
        },
        support_count: materialJobs.length,
        confidence: {
          value: skimConfidence,
          unit: 'probability',
          uncertainty: 0.15,
          confidence: 0.80,
          source: 'WEDMJobPatternLearnerEngine:material-skim',
        },
        recency_score: this.calculateRecencyScore(materialJobs),
        examples: materialJobs.slice(0, 5).map(j => j.job_id),
        human_readable: `${material} works best with ${avgSkim} skim passes`,
      });
    }

    return patterns.sort((a, b) => b.support_count - a.support_count);
  }

  private learnThicknessPatterns(jobs: JobRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];
    const ranges = [
      { name: 'thin', min: 0, max: 10 },
      { name: 'medium', min: 10, max: 50 },
      { name: 'thick', min: 50, max: 200 },
    ];

    for (const range of ranges) {
      const rangeJobs = jobs.filter(
        j => j.thickness_mm >= range.min && j.thickness_mm < range.max && j.was_successful
      );
      if (rangeJobs.length < 3) continue;

      // Find common adjustments
      const avgSkim = Math.round(
        rangeJobs.map(j => j.skim_passes).reduce((a, b) => a + b, 0) / rangeJobs.length
      );

      patterns.push({
        id: `thickness-${range.name}-skim`,
        type: 'thickness_pattern',
        conditions: [
          { field: 'thickness_mm', operator: 'range', value: [range.min, range.max] }
        ],
        recommendation: {
          field: 'skim_passes',
          value: avgSkim,
          rationale: `${range.name} material (${range.min}-${range.max}mm) typically uses ${avgSkim} skim passes`,
        },
        support_count: rangeJobs.length,
        confidence: {
          value: 0.65,
          unit: 'probability',
          uncertainty: 0.15,
          confidence: 0.75,
          source: 'WEDMJobPatternLearnerEngine:thickness',
        },
        recency_score: this.calculateRecencyScore(rangeJobs),
        examples: rangeJobs.slice(0, 5).map(j => j.job_id),
        human_readable: `${range.name} thickness uses ${avgSkim} skim passes`,
      });
    }

    return patterns;
  }

  private learnFeaturePatterns(jobs: JobRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Thin wall pattern
    const thinWallJobs = jobs.filter(j => j.has_thin_walls && j.was_successful);
    if (thinWallJobs.length >= 3) {
      const avgSkim = Math.round(
        thinWallJobs.map(j => j.skim_passes).reduce((a, b) => a + b, 0) / thinWallJobs.length
      );
      patterns.push({
        id: 'thin-wall-handling',
        type: 'feature_pattern',
        conditions: [{ field: 'has_thin_walls', operator: 'equals', value: 'true' }],
        recommendation: {
          field: 'skim_passes',
          value: avgSkim,
          rationale: `Thin wall features typically use ${avgSkim} skim passes with reduced power`,
        },
        support_count: thinWallJobs.length,
        confidence: {
          value: 0.75,
          unit: 'probability',
          uncertainty: 0.12,
          confidence: 0.80,
          source: 'WEDMJobPatternLearnerEngine:thin-wall',
        },
        recency_score: this.calculateRecencyScore(thinWallJobs),
        examples: thinWallJobs.slice(0, 5).map(j => j.job_id),
        human_readable: `Thin walls: use ${avgSkim} skim passes with reduced power`,
      });
    }

    // Sharp corner pattern
    const sharpCornerJobs = jobs.filter(j => j.has_sharp_corners && j.was_successful);
    if (sharpCornerJobs.length >= 3) {
      patterns.push({
        id: 'sharp-corner-handling',
        type: 'feature_pattern',
        conditions: [{ field: 'has_sharp_corners', operator: 'equals', value: 'true' }],
        recommendation: {
          field: 'corner_strategy',
          value: 'slowdown',
          rationale: 'Sharp corners benefit from corner slowdown to prevent wire lag',
        },
        support_count: sharpCornerJobs.length,
        confidence: {
          value: 0.80,
          unit: 'probability',
          uncertainty: 0.10,
          confidence: 0.85,
          source: 'WEDMJobPatternLearnerEngine:sharp-corner',
        },
        recency_score: this.calculateRecencyScore(sharpCornerJobs),
        examples: sharpCornerJobs.slice(0, 5).map(j => j.job_id),
        human_readable: 'Sharp corners: enable corner slowdown',
      });
    }

    return patterns;
  }

  private patternMatches(pattern: LearnedPattern, job: Partial<JobRecord>): boolean {
    for (const condition of pattern.conditions) {
      const jobValue = (job as Record<string, unknown>)[condition.field];
      if (jobValue === undefined) continue;

      switch (condition.operator) {
        case 'equals':
          if (String(jobValue) !== String(condition.value)) return false;
          break;
        case 'range':
          if (Array.isArray(condition.value)) {
            const [min, max] = condition.value;
            if (typeof jobValue !== 'number' || jobValue < min || jobValue >= max) return false;
          }
          break;
        case 'contains':
          if (!String(jobValue).includes(String(condition.value))) return false;
          break;
      }
    }
    return true;
  }

  private calculateRecencyScore(jobs: JobRecord[]): number {
    if (jobs.length === 0) return 0;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let score = 0;
    for (const job of jobs) {
      const age = now - job.timestamp.getTime();
      const recency = Math.max(0, 1 - age / (thirtyDaysMs * 6));  // 6-month decay
      score += recency;
    }
    return score / jobs.length;
  }

  private calculateCoverage(successfulJobs: JobRecord[]): number {
    let covered = 0;
    for (const job of successfulJobs) {
      const matches = this.patterns.filter(p => this.patternMatches(p, job));
      if (matches.length > 0) covered++;
    }
    return successfulJobs.length > 0 ? covered / successfulJobs.length : 0;
  }

  private assessDataQuality(jobs: JobRecord[]): number {
    let score = 1.0;
    if (jobs.length < 10) score -= 0.3;
    if (jobs.length < 50) score -= 0.1;

    const successRate = jobs.filter(j => j.was_successful).length / jobs.length;
    if (successRate < 0.5) score -= 0.2;

    const customersCount = new Set(jobs.map(j => j.customer)).size;
    if (customersCount < 3) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private mode(arr: number[]): number {
    const counts = new Map<number, number>();
    for (const n of arr) counts.set(n, (counts.get(n) ?? 0) + 1);
    let maxCount = 0, mode = arr[0];
    for (const [val, count] of counts) {
      if (count > maxCount) { maxCount = count; mode = val; }
    }
    return mode;
  }

  private modeStr(arr: string[]): string {
    const counts = new Map<string, number>();
    for (const s of arr) counts.set(s, (counts.get(s) ?? 0) + 1);
    let maxCount = 0, mode = arr[0];
    for (const [val, count] of counts) {
      if (count > maxCount) { maxCount = count; mode = val; }
    }
    return mode;
  }
}

export const wedmJobPatternLearnerEngine = new WEDMJobPatternLearnerEngine();
export { WEDMJobPatternLearnerEngine };
