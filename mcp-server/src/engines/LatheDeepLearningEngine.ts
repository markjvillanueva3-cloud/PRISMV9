/**
 * LatheDeepLearningEngine — Adaptive Learning & Pattern Recognition for Lathe Operations
 * ========================================================================================
 * AI-powered learning system that improves recommendations over time:
 *
 *   Core Capabilities:
 *   1. Job Pattern Recognition — Identify similar historical jobs
 *   2. Outcome Learning — Learn from success/failure feedback
 *   3. Parameter Adaptation — Adjust recommendations based on results
 *   4. Knowledge Synthesis — Build expertise from accumulated data
 *   5. Anomaly Detection — Identify unusual patterns in machining data
 *   6. Trend Analysis — Track performance over time
 *   7. Recommendation Confidence — Score based on historical accuracy
 *
 *   Learning Domains:
 *   - Material behavior patterns
 *   - Tool performance trends
 *   - Machine-specific adaptations
 *   - Operator preferences
 *   - Environmental factors (coolant, temperature)
 *
 * @module engines/LatheDeepLearningEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-13
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Historical job record for pattern matching */
export interface HistoricalJob {
  job_id: string;
  timestamp: Date;
  material: string;
  hardness_hrc?: number;
  operation: string;
  machine_type: string;

  // Parameters used
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;

  // Outcomes
  surface_finish_ra: number;
  tool_wear_vb_mm: number;
  cycle_time_sec: number;
  success: boolean;

  // Context
  coolant_type?: string;
  tool_grade?: string;
  operator_id?: string;
}

/** Pattern match result */
export interface PatternMatch {
  job_id: string;
  similarity_score: number;  // 0-100
  matching_factors: string[];
  differentiating_factors: string[];
  outcome_summary: string;
  recommendation_confidence: number;
}

/** Learning feedback */
export interface LearningFeedback {
  job_id: string;
  predicted_parameters: {
    speed: number;
    feed: number;
    doc: number;
  };
  actual_outcome: {
    success: boolean;
    surface_finish_ra?: number;
    tool_life_minutes?: number;
    cycle_time_sec?: number;
    issues?: string[];
  };
  adjustment_needed: boolean;
  notes?: string;
}

/** Adapted parameters based on learning */
export interface AdaptedParameters {
  original: {
    speed_m_min: number;
    feed_mm_rev: number;
    doc_mm: number;
  };
  adapted: {
    speed_m_min: number;
    feed_mm_rev: number;
    doc_mm: number;
  };
  adaptation_factors: AdaptationFactor[];
  confidence: number;
  data_points_used: number;
}

export interface AdaptationFactor {
  factor: string;
  adjustment_percent: number;
  reason: string;
  source: "historical" | "feedback" | "domain_knowledge";
}

/** Knowledge synthesis result */
export interface SynthesizedKnowledge {
  topic: string;
  key_insights: string[];
  statistical_summary: {
    data_points: number;
    success_rate: number;
    avg_tool_life_min: number;
    avg_surface_finish_ra: number;
  };
  best_practices: string[];
  common_issues: string[];
  confidence_level: "low" | "medium" | "high" | "very_high";
}

/** Anomaly detection result */
export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_type?: "parameter" | "outcome" | "trend" | "correlation";
  description: string;
  severity: "info" | "warning" | "critical";
  expected_range?: { min: number; max: number; unit: string };
  actual_value?: number;
  recommendation: string;
}

/** Trend analysis result */
export interface TrendAnalysis {
  metric: string;
  period: string;
  trend: "improving" | "stable" | "degrading" | "volatile";
  change_percent: number;
  data_points: number;
  statistical_significance: number;
  contributing_factors: string[];
  forecast: string;
}

/** Recommendation with confidence */
export interface ConfidentRecommendation {
  parameter: string;
  recommended_value: number;
  unit: string;
  confidence: number;  // 0-100
  confidence_factors: string[];
  historical_success_rate: number;
  similar_jobs_count: number;
  range: { min: number; max: number };
}

// ============================================================================
// SIMULATED KNOWLEDGE BASE
// ============================================================================

/**
 * Simulated historical job database for pattern matching.
 * In production, this would be stored in a database with ML embeddings.
 */
const HISTORICAL_JOBS: HistoricalJob[] = [
  {
    job_id: "JOB-2024-001",
    timestamp: new Date("2024-01-15"),
    material: "4140_steel",
    hardness_hrc: 28,
    operation: "roughing",
    machine_type: "2_axis_cnc",
    cutting_speed_m_min: 180,
    feed_mm_rev: 0.3,
    depth_of_cut_mm: 3.0,
    surface_finish_ra: 3.2,
    tool_wear_vb_mm: 0.15,
    cycle_time_sec: 145,
    success: true,
    coolant_type: "flood",
    tool_grade: "GC4325",
  },
  {
    job_id: "JOB-2024-002",
    timestamp: new Date("2024-01-18"),
    material: "4140_steel",
    hardness_hrc: 32,
    operation: "finishing",
    machine_type: "live_tooling",
    cutting_speed_m_min: 220,
    feed_mm_rev: 0.12,
    depth_of_cut_mm: 0.5,
    surface_finish_ra: 0.8,
    tool_wear_vb_mm: 0.08,
    cycle_time_sec: 95,
    success: true,
    coolant_type: "mist",
    tool_grade: "GC4315",
  },
  {
    job_id: "JOB-2024-003",
    timestamp: new Date("2024-02-01"),
    material: "316_stainless",
    hardness_hrc: 22,
    operation: "roughing",
    machine_type: "2_axis_cnc",
    cutting_speed_m_min: 120,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2.5,
    surface_finish_ra: 4.8,
    tool_wear_vb_mm: 0.22,
    cycle_time_sec: 180,
    success: true,
    coolant_type: "high_pressure",
    tool_grade: "GC2025",
  },
  {
    job_id: "JOB-2024-004",
    timestamp: new Date("2024-02-10"),
    material: "316_stainless",
    hardness_hrc: 25,
    operation: "threading",
    machine_type: "live_tooling",
    cutting_speed_m_min: 80,
    feed_mm_rev: 1.5,  // Thread pitch
    depth_of_cut_mm: 0.2,
    surface_finish_ra: 1.6,
    tool_wear_vb_mm: 0.1,
    cycle_time_sec: 65,
    success: true,
    coolant_type: "flood",
    tool_grade: "thread_insert",
  },
  {
    job_id: "JOB-2024-005",
    timestamp: new Date("2024-02-15"),
    material: "6061_aluminum",
    hardness_hrc: 0,
    operation: "roughing",
    machine_type: "swiss_type",
    cutting_speed_m_min: 600,
    feed_mm_rev: 0.15,
    depth_of_cut_mm: 1.5,
    surface_finish_ra: 1.2,
    tool_wear_vb_mm: 0.05,
    cycle_time_sec: 35,
    success: true,
    coolant_type: "flood",
    tool_grade: "uncoated_carbide",
  },
  {
    job_id: "JOB-2024-006",
    timestamp: new Date("2024-03-01"),
    material: "ti_6al4v",
    hardness_hrc: 36,
    operation: "finishing",
    machine_type: "y_axis",
    cutting_speed_m_min: 55,
    feed_mm_rev: 0.08,
    depth_of_cut_mm: 0.3,
    surface_finish_ra: 0.6,
    tool_wear_vb_mm: 0.12,
    cycle_time_sec: 210,
    success: true,
    coolant_type: "high_pressure",
    tool_grade: "S40T",
  },
  {
    job_id: "JOB-2024-007",
    timestamp: new Date("2024-03-05"),
    material: "4140_steel",
    hardness_hrc: 52,  // Hardened
    operation: "hard_turning",
    machine_type: "2_axis_cnc",
    cutting_speed_m_min: 150,
    feed_mm_rev: 0.08,
    depth_of_cut_mm: 0.15,
    surface_finish_ra: 0.4,
    tool_wear_vb_mm: 0.18,
    cycle_time_sec: 120,
    success: true,
    coolant_type: "dry",
    tool_grade: "CBN",
  },
  // Add some failed jobs for learning
  {
    job_id: "JOB-2024-008",
    timestamp: new Date("2024-03-10"),
    material: "316_stainless",
    hardness_hrc: 28,
    operation: "roughing",
    machine_type: "2_axis_cnc",
    cutting_speed_m_min: 180,  // Too fast for stainless
    feed_mm_rev: 0.35,
    depth_of_cut_mm: 4.0,
    surface_finish_ra: 8.5,
    tool_wear_vb_mm: 0.45,
    cycle_time_sec: 95,
    success: false,  // Rapid tool wear
    coolant_type: "flood",
    tool_grade: "GC4325",
  },
  {
    job_id: "JOB-2024-009",
    timestamp: new Date("2024-03-12"),
    material: "6061_aluminum",
    hardness_hrc: 0,
    operation: "finishing",
    machine_type: "swiss_type",
    cutting_speed_m_min: 400,
    feed_mm_rev: 0.05,
    depth_of_cut_mm: 0.2,
    surface_finish_ra: 0.3,
    tool_wear_vb_mm: 0.02,
    cycle_time_sec: 45,
    success: true,
    coolant_type: "flood",
    tool_grade: "PCD",
  },
  {
    job_id: "JOB-2024-010",
    timestamp: new Date("2024-03-15"),
    material: "inconel_718",
    hardness_hrc: 40,
    operation: "roughing",
    machine_type: "y_axis",
    cutting_speed_m_min: 35,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 1.0,
    surface_finish_ra: 4.2,
    tool_wear_vb_mm: 0.28,
    cycle_time_sec: 320,
    success: true,
    coolant_type: "high_pressure",
    tool_grade: "ceramic_whisker",
  },
];

/** Material behavior patterns learned from historical data */
const MATERIAL_PATTERNS: Record<string, {
  optimal_speed_factor: number;
  tool_wear_factor: number;
  work_hardening_tendency: number;
  surface_finish_sensitivity: number;
}> = {
  "mild_steel": { optimal_speed_factor: 1.0, tool_wear_factor: 1.0, work_hardening_tendency: 0.1, surface_finish_sensitivity: 0.5 },
  "4140_steel": { optimal_speed_factor: 0.85, tool_wear_factor: 1.2, work_hardening_tendency: 0.2, surface_finish_sensitivity: 0.6 },
  "316_stainless": { optimal_speed_factor: 0.55, tool_wear_factor: 1.8, work_hardening_tendency: 0.8, surface_finish_sensitivity: 0.7 },
  "6061_aluminum": { optimal_speed_factor: 2.5, tool_wear_factor: 0.3, work_hardening_tendency: 0.0, surface_finish_sensitivity: 0.4 },
  "ti_6al4v": { optimal_speed_factor: 0.25, tool_wear_factor: 2.5, work_hardening_tendency: 0.4, surface_finish_sensitivity: 0.8 },
  "inconel_718": { optimal_speed_factor: 0.15, tool_wear_factor: 3.5, work_hardening_tendency: 0.9, surface_finish_sensitivity: 0.9 },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheDeepLearningEngine {
  private learningHistory: LearningFeedback[] = [];

  /**
   * Find similar historical jobs for pattern matching.
   */
  findSimilarJobs(
    material: string,
    operation: string,
    machineType?: string,
    hardness?: number,
    topN: number = 5
  ): PatternMatch[] {
    log.info(`[LatheDeepLearning] Finding similar jobs for ${material}/${operation}`);

    const matches: PatternMatch[] = [];

    for (const job of HISTORICAL_JOBS) {
      let similarity = 0;
      const matchingFactors: string[] = [];
      const differentiatingFactors: string[] = [];

      // Material match (most important)
      if (job.material.toLowerCase().includes(material.toLowerCase()) ||
          material.toLowerCase().includes(job.material.split("_")[0].toLowerCase())) {
        similarity += 40;
        matchingFactors.push("Same material family");
      } else {
        differentiatingFactors.push(`Different material: ${job.material}`);
      }

      // Operation match
      if (job.operation === operation) {
        similarity += 25;
        matchingFactors.push("Same operation");
      } else if (
        (operation === "finishing" && job.operation === "hard_turning") ||
        (operation === "roughing" && job.operation.includes("rough"))
      ) {
        similarity += 15;
        matchingFactors.push("Similar operation type");
      } else {
        differentiatingFactors.push(`Different operation: ${job.operation}`);
      }

      // Machine type match
      if (machineType && job.machine_type === machineType) {
        similarity += 15;
        matchingFactors.push("Same machine type");
      } else if (machineType) {
        similarity += 5;  // Partial credit for any CNC
        differentiatingFactors.push(`Different machine: ${job.machine_type}`);
      }

      // Hardness proximity
      if (hardness !== undefined && job.hardness_hrc !== undefined) {
        const hardnessDiff = Math.abs(hardness - job.hardness_hrc);
        if (hardnessDiff <= 5) {
          similarity += 15;
          matchingFactors.push("Similar hardness range");
        } else if (hardnessDiff <= 10) {
          similarity += 8;
          matchingFactors.push("Moderate hardness difference");
        } else {
          differentiatingFactors.push(`Hardness diff: ${hardnessDiff} HRC`);
        }
      }

      // Success bonus
      if (job.success) {
        similarity += 5;
        matchingFactors.push("Successful outcome");
      }

      if (similarity > 20) {  // Minimum threshold
        matches.push({
          job_id: job.job_id,
          similarity_score: Math.min(100, similarity),
          matching_factors: matchingFactors,
          differentiating_factors: differentiatingFactors,
          outcome_summary: job.success
            ? `Success: Ra ${job.surface_finish_ra}, tool wear ${job.tool_wear_vb_mm}mm`
            : `Failed: Excessive wear/poor finish`,
          recommendation_confidence: job.success ? similarity * 0.9 : similarity * 0.3,
        });
      }
    }

    // Sort by similarity and return top N
    return matches
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, topN);
  }

  /**
   * Process learning feedback to adapt future recommendations.
   */
  processLearningFeedback(feedback: LearningFeedback): {
    learned: boolean;
    adaptations: string[];
    new_confidence: number;
  } {
    log.info(`[LatheDeepLearning] Processing feedback for ${feedback.job_id}`);

    this.learningHistory.push(feedback);
    const adaptations: string[] = [];

    if (!feedback.actual_outcome.success) {
      // Learn from failure
      if (feedback.actual_outcome.issues) {
        for (const issue of feedback.actual_outcome.issues) {
          if (issue.toLowerCase().includes("tool wear") || issue.toLowerCase().includes("tool life")) {
            adaptations.push("Reduce cutting speed by 10-15% for similar materials");
            adaptations.push("Consider tougher tool grade");
          }
          if (issue.toLowerCase().includes("chatter") || issue.toLowerCase().includes("vibration")) {
            adaptations.push("Reduce depth of cut or increase feed");
            adaptations.push("Check workholding rigidity for similar setups");
          }
          if (issue.toLowerCase().includes("surface") || issue.toLowerCase().includes("finish")) {
            adaptations.push("Reduce feed rate for finish passes");
            adaptations.push("Check tool nose radius selection");
          }
        }
      }
    } else {
      // Learn from success - note what worked
      adaptations.push("Parameters validated - can be used as baseline for similar jobs");

      if (feedback.actual_outcome.tool_life_minutes && feedback.actual_outcome.tool_life_minutes > 30) {
        adaptations.push("Good tool life achieved - parameters conservative enough");
      }
      if (feedback.actual_outcome.surface_finish_ra && feedback.actual_outcome.surface_finish_ra < 1.0) {
        adaptations.push("Excellent finish achieved - feed/speed combination works well");
      }
    }

    // Calculate new confidence based on feedback history
    const successCount = this.learningHistory.filter(f => f.actual_outcome.success).length;
    const totalCount = this.learningHistory.length;
    const newConfidence = (successCount / totalCount) * 100;

    return {
      learned: adaptations.length > 0,
      adaptations,
      new_confidence: Math.round(newConfidence),
    };
  }

  /**
   * Adapt parameters based on accumulated learning.
   */
  adaptParameters(
    material: string,
    operation: string,
    baseSpeed: number,
    baseFeed: number,
    baseDoc: number
  ): AdaptedParameters {
    log.info(`[LatheDeepLearning] Adapting parameters for ${material}/${operation}`);

    const adaptationFactors: AdaptationFactor[] = [];
    let speedMult = 1.0;
    let feedMult = 1.0;
    let docMult = 1.0;

    // Apply material pattern learning
    const pattern = MATERIAL_PATTERNS[material.toLowerCase()] ||
                    MATERIAL_PATTERNS["mild_steel"];

    if (pattern.optimal_speed_factor !== 1.0) {
      speedMult *= pattern.optimal_speed_factor;
      adaptationFactors.push({
        factor: "material_behavior",
        adjustment_percent: Math.round((pattern.optimal_speed_factor - 1) * 100),
        reason: `Material ${material} requires speed adjustment`,
        source: "domain_knowledge",
      });
    }

    if (pattern.tool_wear_factor > 1.5) {
      speedMult *= 0.9;  // Reduce speed for high-wear materials
      adaptationFactors.push({
        factor: "tool_wear_protection",
        adjustment_percent: -10,
        reason: "High-wear material - protecting tool life",
        source: "domain_knowledge",
      });
    }

    // Apply operation-specific adjustments
    if (operation === "finishing") {
      feedMult *= 0.5;
      docMult *= 0.3;
      adaptationFactors.push({
        factor: "finishing_optimization",
        adjustment_percent: -50,
        reason: "Finishing requires lower feed for surface quality",
        source: "domain_knowledge",
      });
    } else if (operation === "threading") {
      speedMult *= 0.7;
      adaptationFactors.push({
        factor: "threading_safety",
        adjustment_percent: -30,
        reason: "Threading requires slower speed for accuracy",
        source: "domain_knowledge",
      });
    }

    // Apply learning from historical feedback
    const relevantFeedback = this.learningHistory.filter(f =>
      f.predicted_parameters.speed >= baseSpeed * 0.8 &&
      f.predicted_parameters.speed <= baseSpeed * 1.2
    );

    if (relevantFeedback.length > 0) {
      const successRate = relevantFeedback.filter(f => f.actual_outcome.success).length / relevantFeedback.length;
      if (successRate < 0.7) {
        speedMult *= 0.9;
        adaptationFactors.push({
          factor: "historical_feedback",
          adjustment_percent: -10,
          reason: `Low success rate (${Math.round(successRate * 100)}%) in similar range`,
          source: "feedback",
        });
      }
    }

    // Calculate adapted values
    const adaptedSpeed = Math.round(baseSpeed * speedMult);
    const adaptedFeed = Math.round(baseFeed * feedMult * 1000) / 1000;
    const adaptedDoc = Math.round(baseDoc * docMult * 10) / 10;

    // Calculate confidence based on data availability
    const similarJobs = this.findSimilarJobs(material, operation);
    const confidence = Math.min(95, 50 + similarJobs.length * 10 + relevantFeedback.length * 5);

    return {
      original: {
        speed_m_min: baseSpeed,
        feed_mm_rev: baseFeed,
        doc_mm: baseDoc,
      },
      adapted: {
        speed_m_min: adaptedSpeed,
        feed_mm_rev: adaptedFeed,
        doc_mm: adaptedDoc,
      },
      adaptation_factors: adaptationFactors,
      confidence,
      data_points_used: similarJobs.length + relevantFeedback.length,
    };
  }

  /**
   * Synthesize knowledge from accumulated data.
   */
  synthesizeKnowledge(
    topic: "material" | "operation" | "machine" | "tool",
    subject: string
  ): SynthesizedKnowledge {
    log.info(`[LatheDeepLearning] Synthesizing knowledge for ${topic}:${subject}`);

    // Filter relevant jobs
    let relevantJobs: HistoricalJob[];
    switch (topic) {
      case "material":
        relevantJobs = HISTORICAL_JOBS.filter(j =>
          j.material.toLowerCase().includes(subject.toLowerCase())
        );
        break;
      case "operation":
        relevantJobs = HISTORICAL_JOBS.filter(j =>
          j.operation.toLowerCase().includes(subject.toLowerCase())
        );
        break;
      case "machine":
        relevantJobs = HISTORICAL_JOBS.filter(j =>
          j.machine_type.toLowerCase().includes(subject.toLowerCase())
        );
        break;
      case "tool":
        relevantJobs = HISTORICAL_JOBS.filter(j =>
          j.tool_grade?.toLowerCase().includes(subject.toLowerCase())
        );
        break;
      default:
        relevantJobs = [];
    }

    // Calculate statistics
    const successCount = relevantJobs.filter(j => j.success).length;
    const avgToolLife = relevantJobs.length > 0
      ? relevantJobs.reduce((sum, j) => sum + (15 / j.tool_wear_vb_mm), 0) / relevantJobs.length  // Estimate
      : 0;
    const avgFinish = relevantJobs.length > 0
      ? relevantJobs.reduce((sum, j) => sum + j.surface_finish_ra, 0) / relevantJobs.length
      : 0;

    // Generate insights
    const insights: string[] = [];
    const bestPractices: string[] = [];
    const commonIssues: string[] = [];

    if (topic === "material") {
      const pattern = MATERIAL_PATTERNS[subject.toLowerCase()];
      if (pattern) {
        if (pattern.work_hardening_tendency > 0.5) {
          insights.push("Material shows significant work hardening tendency");
          bestPractices.push("Avoid dwelling - keep tool moving");
          bestPractices.push("Use sharp cutting edges");
          commonIssues.push("Surface hardening if improper speeds used");
        }
        if (pattern.tool_wear_factor > 2) {
          insights.push("High tool wear rate - plan for shorter tool life");
          bestPractices.push("Use premium coatings (TiAlN, PVD)");
          bestPractices.push("High-pressure coolant recommended");
          commonIssues.push("Rapid crater wear at high speeds");
        }
        if (pattern.optimal_speed_factor > 2) {
          insights.push("Material machines at high speeds");
          bestPractices.push("Maximize spindle utilization");
          bestPractices.push("Consider polished cutting edges");
        }
      }
    }

    // Determine confidence level
    let confidenceLevel: "low" | "medium" | "high" | "very_high";
    if (relevantJobs.length >= 10 && successCount / relevantJobs.length > 0.8) {
      confidenceLevel = "very_high";
    } else if (relevantJobs.length >= 5) {
      confidenceLevel = "high";
    } else if (relevantJobs.length >= 2) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "low";
    }

    return {
      topic: `${topic}:${subject}`,
      key_insights: insights.length > 0 ? insights : ["Limited data - building knowledge base"],
      statistical_summary: {
        data_points: relevantJobs.length,
        success_rate: relevantJobs.length > 0 ? successCount / relevantJobs.length : 0,
        avg_tool_life_min: Math.round(avgToolLife),
        avg_surface_finish_ra: Math.round(avgFinish * 10) / 10,
      },
      best_practices: bestPractices.length > 0 ? bestPractices : ["Gather more data for reliable practices"],
      common_issues: commonIssues.length > 0 ? commonIssues : ["No recurring issues identified yet"],
      confidence_level: confidenceLevel,
    };
  }

  /**
   * Detect anomalies in machining data.
   */
  detectAnomaly(
    metric: "tool_wear" | "surface_finish" | "cycle_time" | "cutting_force",
    value: number,
    material: string,
    operation: string
  ): AnomalyResult {
    log.info(`[LatheDeepLearning] Checking anomaly for ${metric}=${value}`);

    // Get expected ranges based on historical data and domain knowledge
    const ranges: Record<string, Record<string, { min: number; max: number; unit: string }>> = {
      tool_wear: {
        roughing: { min: 0.05, max: 0.3, unit: "mm" },
        finishing: { min: 0.02, max: 0.15, unit: "mm" },
        threading: { min: 0.03, max: 0.2, unit: "mm" },
      },
      surface_finish: {
        roughing: { min: 1.6, max: 6.3, unit: "Ra µm" },
        finishing: { min: 0.2, max: 1.6, unit: "Ra µm" },
        threading: { min: 0.8, max: 3.2, unit: "Ra µm" },
      },
      cycle_time: {
        roughing: { min: 30, max: 300, unit: "sec" },
        finishing: { min: 20, max: 150, unit: "sec" },
        threading: { min: 15, max: 120, unit: "sec" },
      },
      cutting_force: {
        roughing: { min: 500, max: 3000, unit: "N" },
        finishing: { min: 100, max: 800, unit: "N" },
        threading: { min: 200, max: 1200, unit: "N" },
      },
    };

    const opRanges = ranges[metric]?.[operation] || ranges[metric]?.["roughing"];
    if (!opRanges) {
      return {
        is_anomaly: false,
        description: "Unable to determine expected range",
        severity: "info",
        recommendation: "Collect more baseline data",
      };
    }

    // Check if value is outside expected range
    if (value < opRanges.min * 0.5) {
      return {
        is_anomaly: true,
        anomaly_type: "parameter",
        description: `${metric} value ${value} is suspiciously low`,
        severity: "warning",
        expected_range: opRanges,
        actual_value: value,
        recommendation: "Verify measurement accuracy - value seems too good",
      };
    }

    if (value > opRanges.max * 1.5) {
      return {
        is_anomaly: true,
        anomaly_type: "parameter",
        description: `${metric} value ${value} exceeds normal range significantly`,
        severity: "critical",
        expected_range: opRanges,
        actual_value: value,
        recommendation: "Investigate root cause - possible tool/setup issue",
      };
    }

    if (value > opRanges.max) {
      return {
        is_anomaly: true,
        anomaly_type: "parameter",
        description: `${metric} value ${value} is above normal range`,
        severity: "warning",
        expected_range: opRanges,
        actual_value: value,
        recommendation: "Monitor closely - approaching limits",
      };
    }

    return {
      is_anomaly: false,
      description: `${metric} value ${value} is within expected range`,
      severity: "info",
      expected_range: opRanges,
      actual_value: value,
      recommendation: "No action needed",
    };
  }

  /**
   * Analyze trends in performance data.
   */
  analyzeTrend(
    metric: "tool_life" | "surface_finish" | "productivity" | "scrap_rate",
    dataPoints: number[],
    period: string = "last_30_days"
  ): TrendAnalysis {
    log.info(`[LatheDeepLearning] Analyzing trend for ${metric}`);

    if (dataPoints.length < 3) {
      return {
        metric,
        period,
        trend: "stable",
        change_percent: 0,
        data_points: dataPoints.length,
        statistical_significance: 0,
        contributing_factors: ["Insufficient data for trend analysis"],
        forecast: "Collect more data points for reliable trending",
      };
    }

    // Calculate trend using simple linear regression
    const n = dataPoints.length;
    const xMean = (n - 1) / 2;
    const yMean = dataPoints.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (dataPoints[i] - yMean);
      denominator += (i - xMean) ** 2;
    }
    const slope = numerator / denominator;

    // Calculate R-squared for significance
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = yMean + slope * (i - xMean);
      ssRes += (dataPoints[i] - predicted) ** 2;
      ssTot += (dataPoints[i] - yMean) ** 2;
    }
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    // Determine trend direction and magnitude
    const changePercent = yMean > 0 ? (slope * n / yMean) * 100 : 0;
    let trend: "improving" | "stable" | "degrading" | "volatile";

    // For tool_life and productivity, positive is improving
    // For surface_finish and scrap_rate, negative is improving
    const improvementIsPositive = metric === "tool_life" || metric === "productivity";

    if (rSquared < 0.3) {
      trend = "volatile";
    } else if (Math.abs(changePercent) < 5) {
      trend = "stable";
    } else if ((improvementIsPositive && changePercent > 0) || (!improvementIsPositive && changePercent < 0)) {
      trend = "improving";
    } else {
      trend = "degrading";
    }

    // Generate contributing factors
    const factors: string[] = [];
    if (trend === "degrading") {
      factors.push("Check tooling condition");
      factors.push("Review recent parameter changes");
      factors.push("Verify coolant concentration");
    } else if (trend === "improving") {
      factors.push("Recent optimizations taking effect");
      factors.push("Possible operator skill improvement");
    }

    return {
      metric,
      period,
      trend,
      change_percent: Math.round(changePercent * 10) / 10,
      data_points: n,
      statistical_significance: Math.round(rSquared * 100),
      contributing_factors: factors.length > 0 ? factors : ["No specific factors identified"],
      forecast: trend === "degrading"
        ? "Intervention recommended to reverse negative trend"
        : trend === "improving"
        ? "Continue current practices - positive momentum"
        : "Performance is stable",
    };
  }

  /**
   * Generate recommendation with confidence scoring.
   */
  getConfidentRecommendation(
    parameter: "speed" | "feed" | "depth_of_cut",
    material: string,
    operation: string,
    machineType?: string
  ): ConfidentRecommendation {
    log.info(`[LatheDeepLearning] Getting confident recommendation for ${parameter}`);

    // Find similar historical jobs
    const similarJobs = this.findSimilarJobs(material, operation, machineType);
    const successfulJobs = similarJobs.filter(j => j.recommendation_confidence > 50);

    // Base values from domain knowledge
    const baseValues: Record<string, Record<string, { value: number; unit: string; range: { min: number; max: number } }>> = {
      speed: {
        mild_steel: { value: 200, unit: "m/min", range: { min: 150, max: 280 } },
        stainless: { value: 120, unit: "m/min", range: { min: 80, max: 160 } },
        aluminum: { value: 500, unit: "m/min", range: { min: 300, max: 800 } },
        titanium: { value: 55, unit: "m/min", range: { min: 35, max: 80 } },
        default: { value: 180, unit: "m/min", range: { min: 100, max: 250 } },
      },
      feed: {
        roughing: { value: 0.25, unit: "mm/rev", range: { min: 0.15, max: 0.4 } },
        finishing: { value: 0.1, unit: "mm/rev", range: { min: 0.05, max: 0.15 } },
        threading: { value: 1.0, unit: "mm/rev", range: { min: 0.5, max: 3.0 } },
        default: { value: 0.2, unit: "mm/rev", range: { min: 0.1, max: 0.3 } },
      },
      depth_of_cut: {
        roughing: { value: 2.5, unit: "mm", range: { min: 1.0, max: 5.0 } },
        finishing: { value: 0.3, unit: "mm", range: { min: 0.1, max: 0.5 } },
        threading: { value: 0.2, unit: "mm", range: { min: 0.1, max: 0.4 } },
        default: { value: 1.5, unit: "mm", range: { min: 0.5, max: 3.0 } },
      },
    };

    // Get base recommendation
    let baseRec: { value: number; unit: string; range: { min: number; max: number } };
    if (parameter === "speed") {
      const matKey = material.toLowerCase().includes("stainless") ? "stainless" :
                     material.toLowerCase().includes("aluminum") ? "aluminum" :
                     material.toLowerCase().includes("titan") ? "titanium" :
                     material.toLowerCase().includes("steel") ? "mild_steel" : "default";
      baseRec = baseValues.speed[matKey];
    } else {
      const opKey = operation.toLowerCase().includes("finish") ? "finishing" :
                    operation.toLowerCase().includes("thread") ? "threading" :
                    operation.toLowerCase().includes("rough") ? "roughing" : "default";
      baseRec = baseValues[parameter][opKey];
    }

    // Calculate confidence factors
    const confidenceFactors: string[] = [];
    let confidence = 50;  // Base confidence

    if (successfulJobs.length >= 3) {
      confidence += 20;
      confidenceFactors.push(`${successfulJobs.length} successful similar jobs found`);
    } else if (successfulJobs.length >= 1) {
      confidence += 10;
      confidenceFactors.push(`${successfulJobs.length} similar job(s) found`);
    } else {
      confidenceFactors.push("No similar jobs found - using domain knowledge");
    }

    // Historical success rate
    const successRate = similarJobs.length > 0
      ? similarJobs.filter(j => j.recommendation_confidence > 50).length / similarJobs.length
      : 0.5;

    if (successRate > 0.8) {
      confidence += 15;
      confidenceFactors.push(`High historical success rate: ${Math.round(successRate * 100)}%`);
    }

    // Material pattern knowledge
    if (MATERIAL_PATTERNS[material.toLowerCase()]) {
      confidence += 10;
      confidenceFactors.push("Material behavior pattern available");
    }

    return {
      parameter,
      recommended_value: baseRec.value,
      unit: baseRec.unit,
      confidence: Math.min(95, confidence),
      confidence_factors: confidenceFactors,
      historical_success_rate: successRate,
      similar_jobs_count: similarJobs.length,
      range: baseRec.range,
    };
  }

  /**
   * Get learning statistics.
   */
  getLearningStats(): {
    total_feedback: number;
    success_rate: number;
    total_historical_jobs: number;
    materials_covered: string[];
    operations_covered: string[];
  } {
    const successCount = this.learningHistory.filter(f => f.actual_outcome.success).length;

    return {
      total_feedback: this.learningHistory.length,
      success_rate: this.learningHistory.length > 0
        ? successCount / this.learningHistory.length
        : 0,
      total_historical_jobs: HISTORICAL_JOBS.length,
      materials_covered: [...new Set(HISTORICAL_JOBS.map(j => j.material))],
      operations_covered: [...new Set(HISTORICAL_JOBS.map(j => j.operation))],
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheDeepLearningEngine = new LatheDeepLearningEngine();
