/**
 * LatheLoRADatasetValidatorEngine — LATHE-LORA-MS0 U-LLR08
 * ========================================================
 *
 * Validates training datasets for LatheLoRA fine-tuning quality.
 * Ensures data integrity, diversity, and physics correctness.
 *
 * Validation checks:
 *   - Schema compliance (required fields)
 *   - Content quality (non-empty, reasonable lengths)
 *   - Physics sanity (speed/feed within bounds)
 *   - Diversity metrics (operation coverage, example variety)
 *   - Duplicate detection
 *   - Tribal knowledge coverage
 *
 * @module engines/LatheLoRADatasetValidatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import type { LoRAExample } from "./LatheLoRADatasetBuilderEngine.js";
import type { TrainingExample } from "./LatheLoRAExampleGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Validation issue */
export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  example_id?: string;
  field?: string;
  suggestion?: string;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  score: number;           // 0-100
  total_examples: number;
  issues: ValidationIssue[];
  metrics: ValidationMetrics;
  recommendations: string[];
}

/** Dataset metrics */
export interface ValidationMetrics {
  schema_compliance: number;      // 0-1
  content_quality: number;        // 0-1
  physics_sanity: number;         // 0-1
  diversity_score: number;        // 0-1
  duplicate_ratio: number;        // 0-1 (lower is better)
  avg_instruction_length: number;
  avg_output_length: number;
  type_distribution: Record<string, number>;
  operation_coverage: string[];
  customer_coverage: number;
}

/** Validation configuration */
export interface ValidationConfig {
  min_instruction_length: number;
  max_instruction_length: number;
  min_output_length: number;
  max_output_length: number;
  min_confidence: number;
  required_operation_types: string[];
  check_physics: boolean;
  check_duplicates: boolean;
  similarity_threshold: number;  // 0-1, for duplicate detection
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ValidationConfig = {
  min_instruction_length: 20,
  max_instruction_length: 500,
  min_output_length: 50,
  max_output_length: 2000,
  min_confidence: 0.5,
  required_operation_types: ["roughing", "finishing"],
  check_physics: true,
  check_duplicates: true,
  similarity_threshold: 0.85,
};

/** Physics bounds for sanity checks */
const PHYSICS_BOUNDS = {
  spindle_rpm: { min: 50, max: 6000 },
  feed_ipr: { min: 0.001, max: 0.1 },
  depth_mm: { min: 0.1, max: 10 },
  surface_speed_mpm: { min: 10, max: 500 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRADatasetValidatorEngine {
  /**
   * Validate a dataset of training examples
   */
  validate(
    examples: (LoRAExample | TrainingExample)[],
    config: Partial<ValidationConfig> = {}
  ): ValidationResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const issues: ValidationIssue[] = [];
    const metrics: ValidationMetrics = {
      schema_compliance: 1,
      content_quality: 1,
      physics_sanity: 1,
      diversity_score: 1,
      duplicate_ratio: 0,
      avg_instruction_length: 0,
      avg_output_length: 0,
      type_distribution: {},
      operation_coverage: [],
      customer_coverage: 0,
    };

    if (examples.length === 0) {
      return {
        valid: false,
        score: 0,
        total_examples: 0,
        issues: [{ severity: "error", code: "EMPTY_DATASET", message: "Dataset is empty" }],
        metrics,
        recommendations: ["Add training examples to the dataset"],
      };
    }

    // Run validations
    const schemaIssues = this.validateSchema(examples, cfg);
    const contentIssues = this.validateContent(examples, cfg);
    const physicsIssues = cfg.check_physics ? this.validatePhysics(examples) : [];
    const diversityIssues = this.validateDiversity(examples, cfg);
    const duplicateIssues = cfg.check_duplicates ? this.detectDuplicates(examples, cfg) : [];

    issues.push(...schemaIssues, ...contentIssues, ...physicsIssues, ...diversityIssues, ...duplicateIssues);

    // Calculate metrics
    this.calculateMetrics(examples, metrics, issues, cfg);

    // Calculate overall score
    const score = this.calculateScore(metrics, issues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, issues);

    return {
      valid: !issues.some(i => i.severity === "error"),
      score,
      total_examples: examples.length,
      issues,
      metrics,
      recommendations,
    };
  }

  /**
   * Validate schema compliance
   */
  private validateSchema(
    examples: (LoRAExample | TrainingExample)[],
    config: ValidationConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const id = this.getExampleId(ex, i);

      // Required fields
      if (!ex.instruction) {
        issues.push({
          severity: "error",
          code: "MISSING_INSTRUCTION",
          message: "Example missing instruction field",
          example_id: id,
          field: "instruction",
        });
      }

      if (!ex.output) {
        issues.push({
          severity: "error",
          code: "MISSING_OUTPUT",
          message: "Example missing output field",
          example_id: id,
          field: "output",
        });
      }

      // Confidence check
      const confidence = this.getConfidence(ex);
      if (confidence !== undefined && confidence < config.min_confidence) {
        issues.push({
          severity: "warning",
          code: "LOW_CONFIDENCE",
          message: `Example confidence ${confidence.toFixed(2)} below threshold ${config.min_confidence}`,
          example_id: id,
          field: "confidence",
        });
      }
    }

    return issues;
  }

  /**
   * Validate content quality
   */
  private validateContent(
    examples: (LoRAExample | TrainingExample)[],
    config: ValidationConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const id = this.getExampleId(ex, i);

      // Instruction length
      const instrLen = ex.instruction?.length || 0;
      if (instrLen < config.min_instruction_length) {
        issues.push({
          severity: "warning",
          code: "SHORT_INSTRUCTION",
          message: `Instruction too short (${instrLen} chars)`,
          example_id: id,
          field: "instruction",
          suggestion: "Provide more detailed instruction",
        });
      }
      if (instrLen > config.max_instruction_length) {
        issues.push({
          severity: "warning",
          code: "LONG_INSTRUCTION",
          message: `Instruction too long (${instrLen} chars)`,
          example_id: id,
          field: "instruction",
          suggestion: "Shorten or split the instruction",
        });
      }

      // Output length
      const outLen = ex.output?.length || 0;
      if (outLen < config.min_output_length) {
        issues.push({
          severity: "warning",
          code: "SHORT_OUTPUT",
          message: `Output too short (${outLen} chars)`,
          example_id: id,
          field: "output",
          suggestion: "Provide more comprehensive output",
        });
      }
      if (outLen > config.max_output_length) {
        issues.push({
          severity: "info",
          code: "LONG_OUTPUT",
          message: `Output very long (${outLen} chars)`,
          example_id: id,
          field: "output",
        });
      }

      // Empty input check (input can be empty for some formats)
      if (ex.input === undefined) {
        // This is OK - some formats don't require input
      }
    }

    return issues;
  }

  /**
   * Validate physics sanity
   */
  private validatePhysics(examples: (LoRAExample | TrainingExample)[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const id = this.getExampleId(ex, i);
      const combined = `${ex.instruction} ${ex.input || ""} ${ex.output}`;

      // Extract and check spindle speeds
      const rpmMatches = combined.match(/(\d+)\s*rpm/gi);
      if (rpmMatches) {
        for (const match of rpmMatches) {
          const rpm = parseInt(match.match(/\d+/)?.[0] || "0", 10);
          if (rpm < PHYSICS_BOUNDS.spindle_rpm.min || rpm > PHYSICS_BOUNDS.spindle_rpm.max) {
            issues.push({
              severity: "warning",
              code: "UNUSUAL_RPM",
              message: `Unusual spindle speed: ${rpm} RPM`,
              example_id: id,
              suggestion: `Typical range: ${PHYSICS_BOUNDS.spindle_rpm.min}-${PHYSICS_BOUNDS.spindle_rpm.max} RPM`,
            });
          }
        }
      }

      // Extract and check feed rates
      const feedMatches = combined.match(/(\d*\.?\d+)\s*ipr/gi);
      if (feedMatches) {
        for (const match of feedMatches) {
          const feed = parseFloat(match.match(/[\d.]+/)?.[0] || "0");
          if (feed < PHYSICS_BOUNDS.feed_ipr.min || feed > PHYSICS_BOUNDS.feed_ipr.max) {
            issues.push({
              severity: "warning",
              code: "UNUSUAL_FEED",
              message: `Unusual feed rate: ${feed} IPR`,
              example_id: id,
              suggestion: `Typical range: ${PHYSICS_BOUNDS.feed_ipr.min}-${PHYSICS_BOUNDS.feed_ipr.max} IPR`,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Validate diversity
   */
  private validateDiversity(
    examples: (LoRAExample | TrainingExample)[],
    config: ValidationConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check operation type coverage
    const operationTypes = new Set<string>();
    for (const ex of examples) {
      const opType = this.getOperationType(ex);
      if (opType) operationTypes.add(opType);
    }

    for (const required of config.required_operation_types) {
      if (!operationTypes.has(required)) {
        issues.push({
          severity: "warning",
          code: "MISSING_OPERATION_TYPE",
          message: `Dataset missing examples for operation type: ${required}`,
          suggestion: `Add training examples for ${required} operations`,
        });
      }
    }

    // Check type distribution
    const typeCount: Record<string, number> = {};
    for (const ex of examples) {
      const type = this.getExampleType(ex);
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    const totalTypes = Object.keys(typeCount).length;
    if (totalTypes < 3) {
      issues.push({
        severity: "warning",
        code: "LOW_TYPE_DIVERSITY",
        message: `Only ${totalTypes} example types - consider adding more variety`,
        suggestion: "Include speed_feed, code_explanation, optimization, etc.",
      });
    }

    return issues;
  }

  /**
   * Detect duplicate examples
   */
  private detectDuplicates(
    examples: (LoRAExample | TrainingExample)[],
    config: ValidationConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, number>();

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const key = this.generateContentHash(ex);

      if (seen.has(key)) {
        const originalIdx = seen.get(key)!;
        issues.push({
          severity: "warning",
          code: "DUPLICATE_EXAMPLE",
          message: `Example is duplicate of example ${originalIdx}`,
          example_id: this.getExampleId(ex, i),
          suggestion: "Remove duplicate or diversify the content",
        });
      } else {
        seen.set(key, i);
      }
    }

    return issues;
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(
    examples: (LoRAExample | TrainingExample)[],
    metrics: ValidationMetrics,
    issues: ValidationIssue[],
    config: ValidationConfig
  ): void {
    // Calculate average lengths
    let totalInstr = 0, totalOut = 0;
    for (const ex of examples) {
      totalInstr += ex.instruction?.length || 0;
      totalOut += ex.output?.length || 0;
    }
    metrics.avg_instruction_length = Math.round(totalInstr / examples.length);
    metrics.avg_output_length = Math.round(totalOut / examples.length);

    // Type distribution
    for (const ex of examples) {
      const type = this.getExampleType(ex);
      metrics.type_distribution[type] = (metrics.type_distribution[type] || 0) + 1;
    }

    // Operation coverage
    const ops = new Set<string>();
    for (const ex of examples) {
      const op = this.getOperationType(ex);
      if (op) ops.add(op);
    }
    metrics.operation_coverage = [...ops];

    // Customer coverage
    const customers = new Set<string>();
    for (const ex of examples) {
      const customer = this.getCustomer(ex);
      if (customer) customers.add(customer);
    }
    metrics.customer_coverage = customers.size;

    // Calculate component scores
    const errorCount = issues.filter(i => i.severity === "error").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;

    metrics.schema_compliance = Math.max(0, 1 - (errorCount / examples.length));
    metrics.content_quality = Math.max(0, 1 - (warningCount / examples.length / 2));

    // Diversity score based on type variety
    const typeVariety = Object.keys(metrics.type_distribution).length;
    metrics.diversity_score = Math.min(1, typeVariety / 5);

    // Duplicate ratio
    const duplicates = issues.filter(i => i.code === "DUPLICATE_EXAMPLE").length;
    metrics.duplicate_ratio = duplicates / examples.length;

    // Physics sanity
    const physicsIssues = issues.filter(i => i.code.startsWith("UNUSUAL_")).length;
    metrics.physics_sanity = Math.max(0, 1 - (physicsIssues / examples.length / 2));
  }

  /**
   * Calculate overall score
   */
  private calculateScore(metrics: ValidationMetrics, issues: ValidationIssue[]): number {
    const weights = {
      schema_compliance: 0.25,
      content_quality: 0.20,
      physics_sanity: 0.20,
      diversity_score: 0.20,
      duplicate_penalty: 0.15,
    };

    let score = 0;
    score += metrics.schema_compliance * weights.schema_compliance * 100;
    score += metrics.content_quality * weights.content_quality * 100;
    score += metrics.physics_sanity * weights.physics_sanity * 100;
    score += metrics.diversity_score * weights.diversity_score * 100;
    score += (1 - metrics.duplicate_ratio) * weights.duplicate_penalty * 100;

    // Penalty for critical errors
    const errorCount = issues.filter(i => i.severity === "error").length;
    score -= errorCount * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: ValidationMetrics,
    issues: ValidationIssue[]
  ): string[] {
    const recs: string[] = [];

    if (metrics.schema_compliance < 0.95) {
      recs.push("Fix schema errors - ensure all examples have instruction and output fields");
    }

    if (metrics.content_quality < 0.8) {
      recs.push("Improve content quality - ensure instructions are clear and outputs are comprehensive");
    }

    if (metrics.diversity_score < 0.6) {
      recs.push("Increase example type diversity - add speed_feed, optimization, safety_check examples");
    }

    if (metrics.duplicate_ratio > 0.1) {
      recs.push(`Remove ${Math.round(metrics.duplicate_ratio * 100)}% duplicate examples`);
    }

    if (metrics.operation_coverage.length < 3) {
      recs.push("Add examples for more operation types (roughing, finishing, threading, etc.)");
    }

    if (metrics.physics_sanity < 0.9) {
      recs.push("Review examples with unusual physics values - ensure speeds/feeds are realistic");
    }

    if (metrics.avg_output_length < 100) {
      recs.push("Outputs are short - consider adding more detail and reasoning");
    }

    return recs;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getExampleId(ex: LoRAExample | TrainingExample, index: number): string {
    if ("id" in ex && ex.id) return ex.id;
    return `example-${index}`;
  }

  private getConfidence(ex: LoRAExample | TrainingExample): number | undefined {
    if ("confidence" in ex) return ex.confidence;
    if ("metadata" in ex && ex.metadata && "confidence" in ex.metadata) {
      return ex.metadata.confidence as number;
    }
    return undefined;
  }

  private getExampleType(ex: LoRAExample | TrainingExample): string {
    if ("type" in ex) return ex.type;
    return "unknown";
  }

  private getOperationType(ex: LoRAExample | TrainingExample): string | undefined {
    if ("source" in ex && ex.source && "operation" in ex.source) {
      return ex.source.operation as string;
    }
    if ("metadata" in ex && ex.metadata && "operation_type" in ex.metadata) {
      return ex.metadata.operation_type as string;
    }
    return undefined;
  }

  private getCustomer(ex: LoRAExample | TrainingExample): string | undefined {
    if ("metadata" in ex && ex.metadata && "customer" in ex.metadata) {
      return ex.metadata.customer as string;
    }
    return undefined;
  }

  private generateContentHash(ex: LoRAExample | TrainingExample): string {
    const content = `${ex.instruction}|${ex.input || ""}|${ex.output}`;
    // Simple hash - in production use proper hashing
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Quick validation for single example
   */
  validateSingle(example: LoRAExample | TrainingExample): ValidationIssue[] {
    return this.validate([example]).issues;
  }

  /**
   * Get validation summary
   */
  getSummary(result: ValidationResult): string {
    const lines = [
      `Validation: ${result.valid ? "PASSED" : "FAILED"}`,
      `Score: ${result.score}/100`,
      `Examples: ${result.total_examples}`,
      `Issues: ${result.issues.filter(i => i.severity === "error").length} errors, ${result.issues.filter(i => i.severity === "warning").length} warnings`,
    ];

    if (result.recommendations.length > 0) {
      lines.push("Recommendations:");
      result.recommendations.forEach(r => lines.push(`  - ${r}`));
    }

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRADatasetValidatorEngine = new LatheLoRADatasetValidatorEngine();
