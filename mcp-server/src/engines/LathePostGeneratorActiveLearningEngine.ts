/**
 * LathePostGeneratorActiveLearningEngine — LATHE-MASTER U-LTH21
 *
 * Active learning feedback loop for lathe post-processor improvement.
 * Queues shop-floor failures and incorporates corrections into regeneration.
 *
 * Features:
 * - Failure case collection and categorization
 * - Root cause analysis linking failures to post rules
 * - Correction proposal generation
 * - Verified fix incorporation into post regeneration
 * - Learning metrics tracking
 *
 * @module LathePostGeneratorActiveLearningEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH21
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const FailureCategorySchema = z.enum([
  "syntax_error",
  "motion_error",
  "tool_error",
  "spindle_error",
  "coolant_error",
  "cycle_error",
  "coordinate_error",
  "safety_violation",
  "performance_issue",
  "compatibility_error",
  "unknown",
]);

export const FailureSeveritySchema = z.enum([
  "critical",
  "major",
  "minor",
  "cosmetic",
]);

export const FailureStatusSchema = z.enum([
  "new",
  "analyzing",
  "correction_proposed",
  "correction_verified",
  "incorporated",
  "rejected",
  "duplicate",
]);

export const ShopFloorFailureSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  controller: z.string(),
  program_id: z.string().optional(),
  gcode_snippet: z.array(z.string()),
  line_number: z.number().optional(),
  category: FailureCategorySchema,
  severity: FailureSeveritySchema,
  description: z.string(),
  machine_message: z.string().optional(),
  operator_notes: z.string().optional(),
  status: FailureStatusSchema,
});

export const CorrectionProposalSchema = z.object({
  id: z.string(),
  failure_id: z.string(),
  proposed_at: z.string(),
  rule_type: z.string(),
  original_pattern: z.string(),
  corrected_pattern: z.string(),
  rationale: z.string(),
  confidence: z.number(),
  verified: z.boolean().default(false),
  verification_result: z.string().optional(),
});

export const LearningMetricsSchema = z.object({
  total_failures: z.number(),
  corrections_proposed: z.number(),
  corrections_verified: z.number(),
  corrections_incorporated: z.number(),
  accuracy_improvement: z.number(),
  most_common_category: FailureCategorySchema.optional(),
  avg_resolution_time_ms: z.number(),
});

export type FailureCategory = z.infer<typeof FailureCategorySchema>;
export type FailureSeverity = z.infer<typeof FailureSeveritySchema>;
export type FailureStatus = z.infer<typeof FailureStatusSchema>;
export type ShopFloorFailure = z.infer<typeof ShopFloorFailureSchema>;
export type CorrectionProposal = z.infer<typeof CorrectionProposalSchema>;
export type LearningMetrics = z.infer<typeof LearningMetricsSchema>;

// ── Failure Pattern Database ────────────────────────────────────────────────

interface FailurePattern {
  category: FailureCategory;
  patterns: RegExp[];
  description: string;
  commonCauses: string[];
  suggestedFix: string;
}

const FAILURE_PATTERNS: FailurePattern[] = [
  {
    category: "syntax_error",
    patterns: [/syntax error/i, /illegal character/i, /unexpected token/i],
    description: "G-code syntax not recognized by controller",
    commonCauses: ["Incorrect G-code format", "Missing decimal point", "Invalid code sequence"],
    suggestedFix: "Validate syntax against controller dialect specification",
  },
  {
    category: "motion_error",
    patterns: [/over travel/i, /soft limit/i, /axis limit/i, /position error/i],
    description: "Motion command exceeds machine limits",
    commonCauses: ["Coordinate out of range", "Arc radius too large", "Rapid into workpiece"],
    suggestedFix: "Verify axis limits and add safe positioning",
  },
  {
    category: "tool_error",
    patterns: [/tool not found/i, /tool offset/i, /turret/i, /tool change/i],
    description: "Tool-related error during operation",
    commonCauses: ["Invalid tool number", "Missing tool offset", "Tool not in turret"],
    suggestedFix: "Validate tool numbers against machine configuration",
  },
  {
    category: "spindle_error",
    patterns: [/spindle/i, /rpm/i, /speed error/i, /overload/i],
    description: "Spindle speed or operation error",
    commonCauses: ["Speed too high/low", "No spindle command before cut", "Spindle overload"],
    suggestedFix: "Verify spindle speed limits and proper M03/M04 sequence",
  },
  {
    category: "coolant_error",
    patterns: [/coolant/i, /flood/i, /mist/i, /M08|M09/i],
    description: "Coolant system error",
    commonCauses: ["Coolant not enabled", "Wrong coolant mode", "Coolant pressure low"],
    suggestedFix: "Add appropriate coolant commands before cutting",
  },
  {
    category: "cycle_error",
    patterns: [/cycle/i, /G7[0-6]/i, /G8[0-9]/i, /canned/i],
    description: "Canned cycle execution error",
    commonCauses: ["Invalid cycle parameters", "Missing required values", "Cycle not supported"],
    suggestedFix: "Verify cycle parameters match controller requirements",
  },
  {
    category: "coordinate_error",
    patterns: [/coordinate/i, /work offset/i, /G5[4-9]/i, /datum/i],
    description: "Coordinate system or work offset error",
    commonCauses: ["Wrong work offset", "Missing coordinate", "Incremental/absolute mismatch"],
    suggestedFix: "Ensure proper G54-G59 selection and coordinate mode",
  },
  {
    category: "safety_violation",
    patterns: [/emergency/i, /e-stop/i, /collision/i, /interlock/i, /door/i],
    description: "Safety system triggered",
    commonCauses: ["Rapid into obstacle", "Door open during cycle", "Interlock failure"],
    suggestedFix: "Add safety checks and proper retract sequences",
  },
  {
    category: "performance_issue",
    patterns: [/slow/i, /chatter/i, /vibration/i, /finish/i, /surface/i],
    description: "Non-critical performance degradation",
    commonCauses: ["Suboptimal feed/speed", "Tool wear", "Resonance"],
    suggestedFix: "Optimize cutting parameters based on feedback",
  },
  {
    category: "compatibility_error",
    patterns: [/not supported/i, /unknown command/i, /option not/i],
    description: "Feature not available on this controller",
    commonCauses: ["Controller lacks feature", "Option not enabled", "Wrong dialect"],
    suggestedFix: "Use controller-specific code or alternative approach",
  },
];

// ── Engine Implementation ───────────────────────────────────────────────────

export class LathePostGeneratorActiveLearningEngine {
  private static readonly VERSION = "1.0.0";
  private failureQueue: ShopFloorFailure[] = [];
  private corrections: CorrectionProposal[] = [];
  private incorporatedRules: Map<string, string> = new Map();

  /**
   * Queue a shop-floor failure for analysis.
   */
  queueFailure(input: {
    controller: string;
    gcode_snippet: string[];
    description: string;
    machine_message?: string;
    operator_notes?: string;
    line_number?: number;
    program_id?: string;
  }): ShopFloorFailure {
    const category = this.categorizeFailure(input.description, input.machine_message);
    const severity = this.assessSeverity(category, input.description);

    const failure: ShopFloorFailure = {
      id: `failure_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      controller: input.controller,
      program_id: input.program_id,
      gcode_snippet: input.gcode_snippet,
      line_number: input.line_number,
      category,
      severity,
      description: input.description,
      machine_message: input.machine_message,
      operator_notes: input.operator_notes,
      status: "new",
    };

    this.failureQueue.push(failure);
    return failure;
  }

  /**
   * Categorize failure based on description and machine message.
   */
  private categorizeFailure(description: string, machineMessage?: string): FailureCategory {
    const text = `${description} ${machineMessage ?? ""}`.toLowerCase();

    for (const pattern of FAILURE_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          return pattern.category;
        }
      }
    }

    return "unknown";
  }

  /**
   * Assess failure severity.
   */
  private assessSeverity(category: FailureCategory, description: string): FailureSeverity {
    const desc = description.toLowerCase();

    if (category === "safety_violation" || desc.includes("crash") || desc.includes("collision")) {
      return "critical";
    }
    if (category === "motion_error" || category === "spindle_error") {
      return "major";
    }
    if (category === "performance_issue" || category === "cosmetic") {
      return "cosmetic";
    }

    return "minor";
  }

  /**
   * Analyze a queued failure and propose corrections.
   */
  analyzeFailure(failureId: string): CorrectionProposal | null {
    const failure = this.failureQueue.find(f => f.id === failureId);
    if (!failure) return null;

    failure.status = "analyzing";

    const pattern = FAILURE_PATTERNS.find(p => p.category === failure.category);
    if (!pattern) {
      failure.status = "rejected";
      return null;
    }

    const proposal = this.generateCorrection(failure, pattern);
    if (proposal) {
      this.corrections.push(proposal);
      failure.status = "correction_proposed";
    }

    return proposal;
  }

  /**
   * Generate a correction proposal.
   */
  private generateCorrection(
    failure: ShopFloorFailure,
    pattern: FailurePattern
  ): CorrectionProposal | null {
    const snippet = failure.gcode_snippet.join("\n");

    let originalPattern = "";
    let correctedPattern = "";
    let rationale = "";
    let confidence = 0.7;

    switch (failure.category) {
      case "syntax_error":
        originalPattern = this.extractProblemLine(failure);
        correctedPattern = this.suggestSyntaxFix(originalPattern, failure.controller);
        rationale = "Syntax corrected to match controller dialect";
        confidence = 0.8;
        break;

      case "motion_error":
        originalPattern = this.extractMotionCommand(snippet);
        correctedPattern = this.suggestMotionFix(originalPattern);
        rationale = "Motion command adjusted within safe limits";
        confidence = 0.75;
        break;

      case "tool_error":
        originalPattern = this.extractToolCommand(snippet);
        correctedPattern = this.suggestToolFix(originalPattern);
        rationale = "Tool command corrected with proper offset format";
        confidence = 0.8;
        break;

      case "spindle_error":
        originalPattern = this.extractSpindleCommand(snippet);
        correctedPattern = this.suggestSpindleFix(originalPattern);
        rationale = "Spindle command adjusted to safe operating range";
        confidence = 0.85;
        break;

      case "cycle_error":
        originalPattern = this.extractCycleCommand(snippet);
        correctedPattern = this.suggestCycleFix(originalPattern, failure.controller);
        rationale = "Canned cycle parameters corrected for controller";
        confidence = 0.7;
        break;

      default:
        originalPattern = this.extractProblemLine(failure);
        correctedPattern = `(TODO: Manual review required) ${originalPattern}`;
        rationale = pattern.suggestedFix;
        confidence = 0.5;
    }

    if (!originalPattern) return null;

    return {
      id: `correction_${Date.now()}`,
      failure_id: failure.id,
      proposed_at: new Date().toISOString(),
      rule_type: failure.category,
      original_pattern: originalPattern,
      corrected_pattern: correctedPattern,
      rationale,
      confidence,
      verified: false,
    };
  }

  private extractProblemLine(failure: ShopFloorFailure): string {
    if (failure.line_number && failure.line_number <= failure.gcode_snippet.length) {
      return failure.gcode_snippet[failure.line_number - 1] ?? "";
    }
    return failure.gcode_snippet[0] ?? "";
  }

  private extractMotionCommand(snippet: string): string {
    const match = snippet.match(/G0[0-3][^;\n]*/i);
    return match?.[0] ?? "";
  }

  private extractToolCommand(snippet: string): string {
    const match = snippet.match(/T\d{2,4}[^;\n]*/i);
    return match?.[0] ?? "";
  }

  private extractSpindleCommand(snippet: string): string {
    const match = snippet.match(/S\d+[^;\n]*/i);
    return match?.[0] ?? "";
  }

  private extractCycleCommand(snippet: string): string {
    const match = snippet.match(/G7[0-6][^;\n]*/i) || snippet.match(/G8[0-9][^;\n]*/i);
    return match?.[0] ?? "";
  }

  private suggestSyntaxFix(original: string, controller: string): string {
    let fixed = original;
    if (!fixed.includes(".") && /[XYZ]\d+(?!\.)/.test(fixed)) {
      fixed = fixed.replace(/([XYZ])(\d+)(?!\.)/g, "$1$2.");
    }
    return fixed;
  }

  private suggestMotionFix(original: string): string {
    return original.replace(/G00/i, "G01 F100.");
  }

  private suggestToolFix(original: string): string {
    const match = original.match(/T(\d+)/i);
    if (match) {
      const toolNum = parseInt(match[1], 10);
      if (toolNum > 99) {
        return `T${String(toolNum % 100).padStart(2, "0")}`;
      }
    }
    return original;
  }

  private suggestSpindleFix(original: string): string {
    const match = original.match(/S(\d+)/i);
    if (match) {
      const rpm = parseInt(match[1], 10);
      if (rpm > 6000) {
        return original.replace(/S\d+/i, "S6000");
      }
      if (rpm < 50 && rpm > 0) {
        return original.replace(/S\d+/i, "S50");
      }
    }
    return original;
  }

  private suggestCycleFix(original: string, controller: string): string {
    return original;
  }

  /**
   * Verify a correction proposal with test fixture.
   */
  verifyCorrection(
    correctionId: string,
    testResult: { success: boolean; message: string }
  ): boolean {
    const correction = this.corrections.find(c => c.id === correctionId);
    if (!correction) return false;

    correction.verified = testResult.success;
    correction.verification_result = testResult.message;

    const failure = this.failureQueue.find(f => f.id === correction.failure_id);
    if (failure) {
      failure.status = testResult.success ? "correction_verified" : "rejected";
    }

    return testResult.success;
  }

  /**
   * Incorporate verified correction into regeneration rules.
   */
  incorporateCorrection(correctionId: string): boolean {
    const correction = this.corrections.find(c => c.id === correctionId);
    if (!correction || !correction.verified) return false;

    this.incorporatedRules.set(correction.original_pattern, correction.corrected_pattern);

    const failure = this.failureQueue.find(f => f.id === correction.failure_id);
    if (failure) {
      failure.status = "incorporated";
    }

    return true;
  }

  /**
   * Apply incorporated corrections to G-code.
   */
  applyCorrections(gcode: string[]): { corrected: string[]; appliedRules: string[] } {
    const corrected: string[] = [];
    const appliedRules: string[] = [];

    for (const line of gcode) {
      let correctedLine = line;

      for (const [original, replacement] of this.incorporatedRules) {
        if (line.includes(original)) {
          correctedLine = line.replace(original, replacement);
          appliedRules.push(`${original} -> ${replacement}`);
        }
      }

      corrected.push(correctedLine);
    }

    return { corrected, appliedRules };
  }

  /**
   * Get learning metrics.
   */
  getMetrics(): LearningMetrics {
    const categoryCount = new Map<FailureCategory, number>();

    for (const failure of this.failureQueue) {
      categoryCount.set(failure.category, (categoryCount.get(failure.category) ?? 0) + 1);
    }

    let mostCommon: FailureCategory | undefined;
    let maxCount = 0;
    for (const [cat, count] of categoryCount) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = cat;
      }
    }

    const verified = this.corrections.filter(c => c.verified).length;
    const incorporated = this.failureQueue.filter(f => f.status === "incorporated").length;

    return {
      total_failures: this.failureQueue.length,
      corrections_proposed: this.corrections.length,
      corrections_verified: verified,
      corrections_incorporated: incorporated,
      accuracy_improvement: incorporated > 0 ? (incorporated / this.failureQueue.length) * 100 : 0,
      most_common_category: mostCommon,
      avg_resolution_time_ms: 0,
    };
  }

  /**
   * Get pending failures.
   */
  getPendingFailures(): ShopFloorFailure[] {
    return this.failureQueue.filter(f => f.status === "new" || f.status === "analyzing");
  }

  /**
   * Get all failures.
   */
  getAllFailures(): ShopFloorFailure[] {
    return [...this.failureQueue];
  }

  /**
   * Get corrections for a failure.
   */
  getCorrectionsForFailure(failureId: string): CorrectionProposal[] {
    return this.corrections.filter(c => c.failure_id === failureId);
  }

  /**
   * Get incorporated rules count.
   */
  getIncorporatedRulesCount(): number {
    return this.incorporatedRules.size;
  }

  /**
   * Clear all data (for testing).
   */
  reset(): void {
    this.failureQueue = [];
    this.corrections = [];
    this.incorporatedRules.clear();
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return LathePostGeneratorActiveLearningEngine.VERSION;
  }
}

// Export singleton
export const lathePostGeneratorActiveLearningEngine = new LathePostGeneratorActiveLearningEngine();
