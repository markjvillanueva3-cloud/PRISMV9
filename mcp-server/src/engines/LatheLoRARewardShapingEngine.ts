/**
 * LatheLoRARewardShapingEngine — LATHE-LORA-MS0 U-LLR11
 * =====================================================
 *
 * Shapes rewards for LatheLoRA training to encourage:
 *   - Physics-correct outputs (Kienzle, Taylor)
 *   - Valid G-code syntax
 *   - Safety compliance
 *   - Manufacturing best practices
 *
 * Reward components:
 *   - Syntax validity (G-code structure)
 *   - Physics accuracy (speed/feed ranges)
 *   - Safety compliance (clamps, limits)
 *   - Reasoning quality (CoT coherence)
 *   - Domain alignment (manufacturing terminology)
 *
 * @module engines/LatheLoRARewardShapingEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Reward component */
export interface RewardComponent {
  name: string;
  weight: number;
  score: number;       // 0-1
  details: string;
}

/** Reward result */
export interface RewardResult {
  total_reward: number;       // -1 to 1
  components: RewardComponent[];
  penalty_reasons: string[];
  bonus_reasons: string[];
  physics_accuracy: number;
  safety_score: number;
}

/** Reward configuration */
export interface RewardConfig {
  syntax_weight: number;
  physics_weight: number;
  safety_weight: number;
  reasoning_weight: number;
  domain_weight: number;
  penalty_severity: "strict" | "moderate" | "lenient";
}

/** Physics check result */
export interface PhysicsCheck {
  parameter: string;
  value: number;
  unit: string;
  valid: boolean;
  expected_range: [number, number];
  deviation: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: RewardConfig = {
  syntax_weight: 0.2,
  physics_weight: 0.3,
  safety_weight: 0.25,
  reasoning_weight: 0.15,
  domain_weight: 0.1,
  penalty_severity: "moderate",
};

/** Physics bounds */
const PHYSICS_BOUNDS = {
  spindle_rpm: { min: 50, max: 6000 },
  feed_ipr: { min: 0.001, max: 0.1 },
  feed_mmrev: { min: 0.02, max: 2.5 },
  depth_mm: { min: 0.1, max: 10 },
  surface_speed_mpm: { min: 10, max: 500 },
  surface_speed_sfm: { min: 30, max: 1500 },
  cutting_force_n: { min: 50, max: 10000 },
};

/** G-code patterns */
const GCODE_PATTERNS = {
  valid_g: /G\d{1,3}(\.\d)?/gi,
  valid_m: /M\d{1,3}/gi,
  coordinate: /[XYZ][+-]?\d+\.?\d*/gi,
  spindle: /S\d+/gi,
  feed: /F\d*\.?\d+/gi,
  tool: /T\d{2,4}/gi,
};

/** Safety keywords */
const SAFETY_KEYWORDS = [
  "g50", "clamp", "limit", "verify", "check", "safety",
  "collision", "clearance", "retract", "coolant",
];

/** Domain terminology */
const DOMAIN_TERMS = [
  "roughing", "finishing", "threading", "grooving", "facing",
  "spindle", "chuck", "turret", "tool", "insert",
  "css", "rpm", "sfm", "ipr", "mmrev",
  "depth", "pass", "cycle", "program", "operation",
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRARewardShapingEngine {
  private config: RewardConfig = DEFAULT_CONFIG;

  /**
   * Set reward configuration
   */
  setConfig(config: Partial<RewardConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RewardConfig {
    return { ...this.config };
  }

  /**
   * Calculate reward for a model output
   */
  calculateReward(
    output: string,
    context?: { instruction?: string; expected_type?: string }
  ): RewardResult {
    const components: RewardComponent[] = [];
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // 1. Syntax validity
    const syntaxScore = this.checkSyntax(output);
    components.push({
      name: "syntax",
      weight: this.config.syntax_weight,
      score: syntaxScore.score,
      details: syntaxScore.details,
    });
    if (syntaxScore.score < 0.5) penalties.push("Poor G-code syntax");
    if (syntaxScore.score > 0.9) bonuses.push("Excellent G-code structure");

    // 2. Physics accuracy
    const physicsScore = this.checkPhysics(output);
    components.push({
      name: "physics",
      weight: this.config.physics_weight,
      score: physicsScore.score,
      details: physicsScore.details,
    });
    if (physicsScore.score < 0.5) penalties.push("Physics values out of range");
    if (physicsScore.score > 0.9) bonuses.push("Physics calculations accurate");

    // 3. Safety compliance
    const safetyScore = this.checkSafety(output);
    components.push({
      name: "safety",
      weight: this.config.safety_weight,
      score: safetyScore.score,
      details: safetyScore.details,
    });
    if (safetyScore.score < 0.5) penalties.push("Safety considerations missing");
    if (safetyScore.score > 0.9) bonuses.push("Good safety awareness");

    // 4. Reasoning quality
    const reasoningScore = this.checkReasoning(output);
    components.push({
      name: "reasoning",
      weight: this.config.reasoning_weight,
      score: reasoningScore.score,
      details: reasoningScore.details,
    });
    if (reasoningScore.score < 0.5) penalties.push("Weak reasoning chain");
    if (reasoningScore.score > 0.9) bonuses.push("Clear reasoning provided");

    // 5. Domain alignment
    const domainScore = this.checkDomainAlignment(output);
    components.push({
      name: "domain",
      weight: this.config.domain_weight,
      score: domainScore.score,
      details: domainScore.details,
    });
    if (domainScore.score < 0.5) penalties.push("Off-topic content");
    if (domainScore.score > 0.9) bonuses.push("Strong domain knowledge");

    // Calculate total reward
    let totalReward = components.reduce(
      (sum, c) => sum + c.score * c.weight,
      0
    );

    // Apply penalties based on severity
    const penaltyFactor = this.config.penalty_severity === "strict" ? 0.3 :
                          this.config.penalty_severity === "moderate" ? 0.15 : 0.05;
    totalReward -= penalties.length * penaltyFactor;

    // Apply bonuses
    totalReward += bonuses.length * 0.05;

    // Clamp to [-1, 1]
    totalReward = Math.max(-1, Math.min(1, totalReward * 2 - 1));

    return {
      total_reward: totalReward,
      components,
      penalty_reasons: penalties,
      bonus_reasons: bonuses,
      physics_accuracy: physicsScore.score,
      safety_score: safetyScore.score,
    };
  }

  /**
   * Check G-code syntax validity
   */
  private checkSyntax(output: string): { score: number; details: string } {
    const upper = output.toUpperCase();
    let score = 0.5; // Base score
    const findings: string[] = [];

    // Check for valid G-codes
    const gCodes = upper.match(GCODE_PATTERNS.valid_g) || [];
    if (gCodes.length > 0) {
      score += 0.1;
      findings.push(`Found ${gCodes.length} G-codes`);
    }

    // Check for valid M-codes
    const mCodes = upper.match(GCODE_PATTERNS.valid_m) || [];
    if (mCodes.length > 0) {
      score += 0.05;
    }

    // Check for coordinates
    const coords = upper.match(GCODE_PATTERNS.coordinate) || [];
    if (coords.length > 0) {
      score += 0.1;
    }

    // Check for spindle/feed commands
    if (GCODE_PATTERNS.spindle.test(upper)) score += 0.1;
    if (GCODE_PATTERNS.feed.test(upper)) score += 0.1;

    // Check for structural elements
    if (upper.includes("**") || upper.includes("##")) {
      score += 0.05; // Markdown formatting
    }

    return {
      score: Math.min(1, score),
      details: findings.length > 0 ? findings.join(", ") : "Basic syntax check",
    };
  }

  /**
   * Check physics accuracy
   */
  private checkPhysics(output: string): { score: number; details: string } {
    const checks: PhysicsCheck[] = [];
    let validCount = 0;
    let totalCount = 0;

    // Extract and check RPM values
    const rpmMatches = output.match(/(\d+)\s*rpm/gi);
    if (rpmMatches) {
      for (const match of rpmMatches) {
        const value = parseInt(match.match(/\d+/)?.[0] || "0", 10);
        const valid = value >= PHYSICS_BOUNDS.spindle_rpm.min &&
                      value <= PHYSICS_BOUNDS.spindle_rpm.max;
        checks.push({
          parameter: "spindle_rpm",
          value,
          unit: "RPM",
          valid,
          expected_range: [PHYSICS_BOUNDS.spindle_rpm.min, PHYSICS_BOUNDS.spindle_rpm.max],
          deviation: valid ? 0 : Math.abs(value - (PHYSICS_BOUNDS.spindle_rpm.min + PHYSICS_BOUNDS.spindle_rpm.max) / 2),
        });
        totalCount++;
        if (valid) validCount++;
      }
    }

    // Extract and check feed rates (IPR)
    const feedMatches = output.match(/(\d*\.?\d+)\s*ipr/gi);
    if (feedMatches) {
      for (const match of feedMatches) {
        const value = parseFloat(match.match(/[\d.]+/)?.[0] || "0");
        const valid = value >= PHYSICS_BOUNDS.feed_ipr.min &&
                      value <= PHYSICS_BOUNDS.feed_ipr.max;
        checks.push({
          parameter: "feed_ipr",
          value,
          unit: "IPR",
          valid,
          expected_range: [PHYSICS_BOUNDS.feed_ipr.min, PHYSICS_BOUNDS.feed_ipr.max],
          deviation: valid ? 0 : Math.abs(value - (PHYSICS_BOUNDS.feed_ipr.min + PHYSICS_BOUNDS.feed_ipr.max) / 2),
        });
        totalCount++;
        if (valid) validCount++;
      }
    }

    // Check for Kienzle/Taylor references (bonus)
    const hasKienzle = /kienzle|kc1\.1|kc1_1/i.test(output);
    const hasTaylor = /taylor|tool\s*life/i.test(output);
    let bonusScore = 0;
    if (hasKienzle) bonusScore += 0.1;
    if (hasTaylor) bonusScore += 0.1;

    // Calculate score
    let score = 0.5; // Base score
    if (totalCount > 0) {
      score = (validCount / totalCount) * 0.8 + 0.2;
    }
    score = Math.min(1, score + bonusScore);

    const details = checks.length > 0
      ? `Checked ${totalCount} values, ${validCount} valid`
      : "No numeric physics values found";

    return { score, details };
  }

  /**
   * Check safety compliance
   */
  private checkSafety(output: string): { score: number; details: string } {
    const lower = output.toLowerCase();
    let score = 0.4; // Base score
    const found: string[] = [];

    for (const keyword of SAFETY_KEYWORDS) {
      if (lower.includes(keyword)) {
        score += 0.06;
        found.push(keyword);
      }
    }

    // Specific safety checks
    if (/g50\s*s\d+/i.test(output)) {
      score += 0.1; // Spindle clamp mentioned
      found.push("G50 clamp");
    }

    if (/collision|clearance/i.test(output)) {
      score += 0.05;
    }

    if (/verify|check|ensure/i.test(output)) {
      score += 0.05;
    }

    return {
      score: Math.min(1, score),
      details: found.length > 0 ? `Safety terms: ${found.join(", ")}` : "Limited safety content",
    };
  }

  /**
   * Check reasoning quality
   */
  private checkReasoning(output: string): { score: number; details: string } {
    let score = 0.3; // Base score
    const indicators: string[] = [];

    // Check for reasoning indicators
    if (/because|therefore|since|thus/i.test(output)) {
      score += 0.15;
      indicators.push("causal reasoning");
    }

    if (/first|then|next|finally|step/i.test(output)) {
      score += 0.1;
      indicators.push("sequential structure");
    }

    if (/recommend|suggest|advise/i.test(output)) {
      score += 0.1;
      indicators.push("recommendations");
    }

    if (/analysis|evaluate|consider/i.test(output)) {
      score += 0.1;
      indicators.push("analytical content");
    }

    // Check for structured output
    if (output.includes("**") && output.includes(":")) {
      score += 0.1;
      indicators.push("structured format");
    }

    // Length consideration (too short = weak reasoning)
    if (output.length > 200) {
      score += 0.1;
    } else if (output.length < 50) {
      score -= 0.1;
    }

    return {
      score: Math.min(1, Math.max(0, score)),
      details: indicators.length > 0 ? indicators.join(", ") : "Basic response",
    };
  }

  /**
   * Check domain alignment
   */
  private checkDomainAlignment(output: string): { score: number; details: string } {
    const lower = output.toLowerCase();
    let score = 0.3;
    let termCount = 0;

    for (const term of DOMAIN_TERMS) {
      if (lower.includes(term)) {
        termCount++;
      }
    }

    // Score based on term density
    score += Math.min(0.5, termCount * 0.05);

    // Bonus for manufacturing-specific content
    if (/lathe|turning|cnc|okuma/i.test(output)) {
      score += 0.1;
    }

    // Penalty for off-topic content
    if (/sorry|apologize|cannot|unable/i.test(output)) {
      score -= 0.2;
    }

    return {
      score: Math.min(1, Math.max(0, score)),
      details: `${termCount} domain terms found`,
    };
  }

  /**
   * Get reward summary
   */
  getSummary(result: RewardResult): string {
    const lines = [
      `Total Reward: ${result.total_reward.toFixed(3)}`,
      `Physics: ${(result.physics_accuracy * 100).toFixed(0)}%`,
      `Safety: ${(result.safety_score * 100).toFixed(0)}%`,
    ];

    if (result.penalty_reasons.length > 0) {
      lines.push(`Penalties: ${result.penalty_reasons.join(", ")}`);
    }
    if (result.bonus_reasons.length > 0) {
      lines.push(`Bonuses: ${result.bonus_reasons.join(", ")}`);
    }

    return lines.join(" | ");
  }

  /**
   * Check if output meets minimum threshold
   */
  meetsThreshold(result: RewardResult, threshold: number = 0): boolean {
    return result.total_reward >= threshold;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRARewardShapingEngine = new LatheLoRARewardShapingEngine();
