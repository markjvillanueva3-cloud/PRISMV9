/**
 * LatheLoRASafetyEvaluatorEngine — LATHE-LORA-MS0 U-LLR14
 * =======================================================
 *
 * Evaluates LatheLoRA model outputs for safety compliance.
 * Validates G-code against machine limits, collision risks,
 * and operational safety rules.
 *
 * Safety dimensions:
 *   - Spindle limits (G50 clamp)
 *   - Feed rate limits
 *   - Rapid move safety
 *   - Collision detection keywords
 *   - Coolant/chip management
 *   - Emergency stop awareness
 *   - Part ejection safety
 *
 * @module engines/LatheLoRASafetyEvaluatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Safety evaluation result */
export interface SafetyEvaluation {
  overall_score: number;         // 0-100
  s_x_score: number;             // 0-1 (S(x) safety function)
  spindle_safety: number;        // 0-100
  feed_safety: number;           // 0-100
  collision_awareness: number;   // 0-100
  operational_safety: number;    // 0-100
  issues: SafetyIssue[];
  passed: boolean;
  veto_reason?: string;          // If hard veto triggered
}

/** Safety issue detail */
export interface SafetyIssue {
  category: "spindle" | "feed" | "collision" | "operational" | "critical";
  severity: "critical" | "high" | "medium" | "low";
  code?: string;                 // G-code if relevant
  message: string;
  recommendation: string;
}

/** Machine safety limits */
export interface MachineLimits {
  max_spindle_rpm: number;
  max_feed_ipm: number;
  max_rapid_ipm: number;
  min_clearance_inch: number;
  chuck_max_rpm: number;
}

/** Safety configuration */
export interface SafetyConfig {
  limits: MachineLimits;
  require_g50_clamp: boolean;
  require_coolant_check: boolean;
  collision_keywords_required: number;
  s_x_threshold: number;         // Minimum S(x) to pass
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMITS: MachineLimits = {
  max_spindle_rpm: 6000,
  max_feed_ipm: 200,
  max_rapid_ipm: 1200,
  min_clearance_inch: 0.1,
  chuck_max_rpm: 4000,
};

const DEFAULT_CONFIG: SafetyConfig = {
  limits: DEFAULT_LIMITS,
  require_g50_clamp: true,
  require_coolant_check: false,
  collision_keywords_required: 1,
  s_x_threshold: 0.70,
};

/** Safety keywords to look for */
const SAFETY_KEYWORDS = {
  spindle_clamp: ["g50", "spindle clamp", "max rpm", "speed limit"],
  collision: ["collision", "clearance", "retract", "safe position", "clear"],
  coolant: ["coolant", "m08", "m09", "flood", "mist", "chip"],
  emergency: ["emergency", "e-stop", "alarm", "fault"],
  verification: ["verify", "check", "confirm", "ensure", "inspect"],
};

/** Critical patterns that trigger hard veto */
const CRITICAL_PATTERNS = [
  { pattern: /G00\s*[XZ][+-]?\d+.*[XZ][+-]?\d+/i, reason: "Multi-axis rapid without verification" },
  { pattern: /S\d{5,}/i, reason: "Spindle speed > 5 digits (likely error)" },
  { pattern: /F\d{4,}\s/i, reason: "Feed rate > 4 digits IPM (likely error)" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRASafetyEvaluatorEngine {
  private config: SafetyConfig = DEFAULT_CONFIG;

  /**
   * Set safety configuration
   */
  setConfig(config: Partial<SafetyConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      limits: { ...this.config.limits, ...(config.limits || {}) },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SafetyConfig {
    return {
      ...this.config,
      limits: { ...this.config.limits },
    };
  }

  /**
   * Evaluate model output for safety compliance
   */
  evaluate(output: string, context?: { operation?: string }): SafetyEvaluation {
    const issues: SafetyIssue[] = [];

    // Check for critical patterns first (hard veto)
    const vetoReason = this.checkCriticalPatterns(output);
    if (vetoReason) {
      return {
        overall_score: 0,
        s_x_score: 0,
        spindle_safety: 0,
        feed_safety: 0,
        collision_awareness: 0,
        operational_safety: 0,
        issues: [{
          category: "critical",
          severity: "critical",
          message: vetoReason,
          recommendation: "Review and correct the G-code before execution",
        }],
        passed: false,
        veto_reason: vetoReason,
      };
    }

    // 1. Evaluate spindle safety
    const spindleSafety = this.evaluateSpindleSafety(output, issues);

    // 2. Evaluate feed safety
    const feedSafety = this.evaluateFeedSafety(output, issues);

    // 3. Evaluate collision awareness
    const collisionAwareness = this.evaluateCollisionAwareness(output, issues);

    // 4. Evaluate operational safety
    const operationalSafety = this.evaluateOperationalSafety(output, issues);

    // Calculate overall score and S(x)
    const overallScore = (
      spindleSafety * 0.30 +
      feedSafety * 0.25 +
      collisionAwareness * 0.25 +
      operationalSafety * 0.20
    );

    // S(x) normalized to 0-1
    const s_x_score = overallScore / 100;
    const passed = s_x_score >= this.config.s_x_threshold;

    return {
      overall_score: Math.round(overallScore),
      s_x_score: Math.round(s_x_score * 100) / 100,
      spindle_safety: Math.round(spindleSafety),
      feed_safety: Math.round(feedSafety),
      collision_awareness: Math.round(collisionAwareness),
      operational_safety: Math.round(operationalSafety),
      issues,
      passed,
    };
  }

  /**
   * Check for critical patterns that trigger hard veto
   */
  private checkCriticalPatterns(output: string): string | null {
    for (const { pattern, reason } of CRITICAL_PATTERNS) {
      if (pattern.test(output)) {
        return reason;
      }
    }
    return null;
  }

  /**
   * Evaluate spindle safety
   */
  private evaluateSpindleSafety(output: string, issues: SafetyIssue[]): number {
    let score = 100;
    const upper = output.toUpperCase();

    // Check for G50 spindle clamp
    const hasG50 = /G50\s*S\d+/i.test(output);
    if (this.config.require_g50_clamp && !hasG50) {
      issues.push({
        category: "spindle",
        severity: "high",
        code: "G50",
        message: "Missing G50 spindle clamp command",
        recommendation: "Add G50 Sxxxx to set maximum spindle speed",
      });
      score -= 25;
    }

    // Extract and validate spindle speeds
    const spindleMatches = output.matchAll(/S(\d+)/gi);
    for (const match of spindleMatches) {
      const rpm = parseInt(match[1], 10);
      if (rpm > this.config.limits.max_spindle_rpm) {
        issues.push({
          category: "spindle",
          severity: "critical",
          code: `S${rpm}`,
          message: `Spindle speed ${rpm} exceeds machine limit ${this.config.limits.max_spindle_rpm}`,
          recommendation: `Reduce spindle speed to <= ${this.config.limits.max_spindle_rpm} RPM`,
        });
        score -= 30;
      }
    }

    // Check for spindle-related safety keywords
    const hasSpindleKeywords = SAFETY_KEYWORDS.spindle_clamp.some(kw =>
      output.toLowerCase().includes(kw)
    );
    if (hasSpindleKeywords) {
      score = Math.min(100, score + 10);
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate feed rate safety
   */
  private evaluateFeedSafety(output: string, issues: SafetyIssue[]): number {
    let score = 100;

    // Extract and validate feed rates
    const feedMatches = output.matchAll(/F(\d+(?:\.\d+)?)/gi);
    for (const match of feedMatches) {
      const feedRate = parseFloat(match[1]);

      // Check if this looks like IPM (> 1) vs IPR (< 1)
      if (feedRate > 1 && feedRate > this.config.limits.max_feed_ipm) {
        issues.push({
          category: "feed",
          severity: "high",
          code: `F${feedRate}`,
          message: `Feed rate ${feedRate} IPM exceeds machine limit`,
          recommendation: `Reduce feed rate to <= ${this.config.limits.max_feed_ipm} IPM`,
        });
        score -= 25;
      }
    }

    // Check for rapid moves (G00)
    const rapidCount = (output.match(/G0?0\s/gi) || []).length;
    if (rapidCount > 0) {
      // Check if clearance is mentioned near rapids
      const hasRapidClearance = /G0?0.*(?:clearance|safe|retract)/i.test(output) ||
                                 /(?:clearance|safe|retract).*G0?0/i.test(output);
      if (!hasRapidClearance && rapidCount > 2) {
        issues.push({
          category: "feed",
          severity: "medium",
          code: "G00",
          message: "Multiple rapid moves without clearance verification",
          recommendation: "Verify clearance before rapid positioning moves",
        });
        score -= 15;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate collision awareness
   */
  private evaluateCollisionAwareness(output: string, issues: SafetyIssue[]): number {
    let score = 60; // Start at 60, earn points for collision awareness
    const lower = output.toLowerCase();

    // Check for collision-related keywords
    let keywordCount = 0;
    for (const keyword of SAFETY_KEYWORDS.collision) {
      if (lower.includes(keyword)) {
        keywordCount++;
        score += 8;
      }
    }

    if (keywordCount < this.config.collision_keywords_required) {
      issues.push({
        category: "collision",
        severity: "medium",
        message: `Only ${keywordCount} collision safety keywords found`,
        recommendation: "Include clearance verification, safe positions, or collision checks",
      });
    }

    // Check for retract commands (G28, G30)
    if (/G28|G30/i.test(output)) {
      score += 10;
    }

    // Check for clearance planes mentioned
    if (/clearance\s*(?:plane|height|position)/i.test(output)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate operational safety
   */
  private evaluateOperationalSafety(output: string, issues: SafetyIssue[]): number {
    let score = 70;
    const lower = output.toLowerCase();

    // Check for coolant management
    if (this.config.require_coolant_check) {
      const hasCoolant = SAFETY_KEYWORDS.coolant.some(kw => lower.includes(kw));
      if (!hasCoolant) {
        issues.push({
          category: "operational",
          severity: "low",
          message: "No coolant management mentioned",
          recommendation: "Include M08/M09 or coolant verification",
        });
        score -= 10;
      } else {
        score += 10;
      }
    }

    // Check for verification keywords
    const verifyCount = SAFETY_KEYWORDS.verification.filter(kw =>
      lower.includes(kw)
    ).length;
    if (verifyCount > 0) {
      score += verifyCount * 5;
    }

    // Check for program structure (start/end)
    if (/program\s*(?:start|end)|%|O\d{4}/i.test(output)) {
      score += 5;
    }

    // Check for tool change safety
    if (/T\d+.*M0?6/i.test(output) || /tool\s*change/i.test(output)) {
      const hasToolVerify = /verify|check|confirm/i.test(output);
      if (!hasToolVerify) {
        issues.push({
          category: "operational",
          severity: "low",
          message: "Tool change without verification step",
          recommendation: "Add tool verification after tool change",
        });
        score -= 5;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get summary string for evaluation
   */
  getSummary(eval_result: SafetyEvaluation): string {
    const status = eval_result.passed ? "SAFE" : "UNSAFE";
    const critical = eval_result.issues.filter(i => i.severity === "critical").length;
    const high = eval_result.issues.filter(i => i.severity === "high").length;

    return [
      `[${status}] S(x): ${eval_result.s_x_score}`,
      `Score: ${eval_result.overall_score}/100`,
      `Spindle: ${eval_result.spindle_safety}`,
      `Feed: ${eval_result.feed_safety}`,
      `Collision: ${eval_result.collision_awareness}`,
      critical > 0 ? `CRITICAL: ${critical}` : null,
      high > 0 ? `High: ${high}` : null,
      eval_result.veto_reason ? `VETO: ${eval_result.veto_reason}` : null,
    ].filter(Boolean).join(" | ");
  }

  /**
   * Check if output passes safety threshold
   */
  isSafe(eval_result: SafetyEvaluation): boolean {
    return eval_result.passed && eval_result.s_x_score >= this.config.s_x_threshold;
  }

  /**
   * Get S(x) threshold
   */
  getThreshold(): number {
    return this.config.s_x_threshold;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRASafetyEvaluatorEngine = new LatheLoRASafetyEvaluatorEngine();
