/**
 * LatheLoRATribalAugmentationEngine — LATHE-LORA-MS0 U-LLR28
 * ==========================================================
 *
 * Augments LatheLoRA outputs with tribal knowledge from JM Die archive.
 * Injects shop floor wisdom, anti-patterns, and experiential rules.
 *
 * Features:
 *   - Tribal tip injection
 *   - Playbook rule application
 *   - Anti-pattern warnings
 *   - Experience-based corrections
 *
 * @module engines/LatheLoRATribalAugmentationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tribal tip source */
export type TipSource = "jm_die" | "okuma" | "playbook" | "community" | "handbook";

/** Tribal tip */
export interface TribalTip {
  id: string;
  content: string;
  source: TipSource;
  material?: string;
  operation?: string;
  machine?: string;
  keywords: string[];
  priority: number;
  verified: boolean;
}

/** Playbook rule */
export interface PlaybookRule {
  id: string;
  condition: string;
  action: string;
  rationale: string;
  category: string;
  severity: "info" | "warning" | "critical";
}

/** Augmentation result */
export interface AugmentationResult {
  original_response: string;
  augmented_response: string;
  tips_applied: TribalTip[];
  rules_triggered: PlaybookRule[];
  warnings: string[];
  confidence_boost: number;
}

/** Engine configuration */
export interface TribalConfig {
  max_tips_per_response: number;
  min_relevance_score: number;
  include_rationale: boolean;
  warn_on_anti_patterns: boolean;
  source_priority: TipSource[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: TribalConfig = {
  max_tips_per_response: 3,
  min_relevance_score: 0.5,
  include_rationale: true,
  warn_on_anti_patterns: true,
  source_priority: ["jm_die", "okuma", "playbook", "handbook", "community"],
};

/** JM Die tribal tips for lathe operations */
const JM_DIE_TIPS: TribalTip[] = [
  {
    id: "jm-001",
    content: "For D2 tool steel, reduce SFM by 20% compared to 4140 and use heavy coolant flood.",
    source: "jm_die",
    material: "D2",
    operation: "turning",
    keywords: ["d2", "tool steel", "sfm", "coolant"],
    priority: 9,
    verified: true,
  },
  {
    id: "jm-002",
    content: "When roughing cold heading dies, take 0.150\" DOC max to avoid deflection — dies are long and slender.",
    source: "jm_die",
    operation: "roughing",
    keywords: ["roughing", "die", "doc", "deflection"],
    priority: 8,
    verified: true,
  },
  {
    id: "jm-003",
    content: "Always verify G50 spindle limit before running. Our Okuma LB3000 has a 4000 RPM max on the main spindle.",
    source: "jm_die",
    machine: "okuma",
    keywords: ["g50", "spindle", "rpm", "limit", "okuma"],
    priority: 10,
    verified: true,
  },
  {
    id: "jm-004",
    content: "For carbide inserts on hardened D2 (>58 HRC), use CNMG with TiAlN coating — our standard is IC907 grade.",
    source: "jm_die",
    material: "D2",
    keywords: ["carbide", "insert", "d2", "hardened", "cnmg", "coating"],
    priority: 8,
    verified: true,
  },
  {
    id: "jm-005",
    content: "Finish pass on die face: 0.005\" DOC, 0.004 IPR, CSS 280 SFM for mirror finish.",
    source: "jm_die",
    operation: "finishing",
    keywords: ["finish", "die", "face", "mirror", "sfm"],
    priority: 7,
    verified: true,
  },
  {
    id: "jm-006",
    content: "When boring long holes, retract every 2x diameter to clear chips — prevents drill grabbing.",
    source: "jm_die",
    operation: "boring",
    keywords: ["boring", "retract", "chips", "drill", "peck"],
    priority: 8,
    verified: true,
  },
  {
    id: "jm-007",
    content: "For threading on the Okuma, use G76 compound cycle with 29° infeed for better chip control.",
    source: "jm_die",
    operation: "threading",
    machine: "okuma",
    keywords: ["thread", "g76", "infeed", "chip"],
    priority: 7,
    verified: true,
  },
  {
    id: "jm-008",
    content: "M2 high-speed steel needs flood coolant at all times — it work hardens quickly without it.",
    source: "jm_die",
    material: "M2",
    keywords: ["m2", "hss", "coolant", "work harden"],
    priority: 9,
    verified: true,
  },
];

/** Okuma-specific tips */
const OKUMA_TIPS: TribalTip[] = [
  {
    id: "okuma-001",
    content: "Use G96 S### G50 S#### pattern — G96 enables CSS, G50 sets max RPM clamp.",
    source: "okuma",
    machine: "okuma",
    keywords: ["g96", "g50", "css", "spindle"],
    priority: 9,
    verified: true,
  },
  {
    id: "okuma-002",
    content: "For Okuma OSP-P300, use M68 to clamp chuck, M69 to unclamp before part ejection.",
    source: "okuma",
    machine: "okuma",
    keywords: ["m68", "m69", "chuck", "clamp"],
    priority: 7,
    verified: true,
  },
  {
    id: "okuma-003",
    content: "G28 U0 W0 returns to machine home — always use before tool change to ensure clearance.",
    source: "okuma",
    machine: "okuma",
    keywords: ["g28", "home", "tool change", "clearance"],
    priority: 8,
    verified: true,
  },
];

/** Playbook rules (anti-patterns and best practices) */
const PLAYBOOK_RULES: PlaybookRule[] = [
  {
    id: "rule-001",
    condition: "SFM > 500 for steel",
    action: "Reduce SFM to max 500 SFM",
    rationale: "Excessive SFM causes rapid insert wear and potential tool failure",
    category: "safety",
    severity: "warning",
  },
  {
    id: "rule-002",
    condition: "No G50 spindle clamp in program",
    action: "Add G50 S#### before G96",
    rationale: "Without spindle limit, small diameters can exceed safe RPM",
    category: "safety",
    severity: "critical",
  },
  {
    id: "rule-003",
    condition: "DOC > 0.200\" for finishing",
    action: "Reduce DOC to < 0.020\" for finish passes",
    rationale: "Heavy DOC ruins surface finish and causes chatter",
    category: "quality",
    severity: "warning",
  },
  {
    id: "rule-004",
    condition: "Feed > tool nose radius × 0.8",
    action: "Reduce feed to nose_radius × 0.5 or less",
    rationale: "High feed relative to nose radius leaves scallop marks",
    category: "quality",
    severity: "info",
  },
  {
    id: "rule-005",
    condition: "No coolant specified for steel",
    action: "Enable flood coolant M08",
    rationale: "Dry machining steel causes heat buildup and rapid wear",
    category: "tool_life",
    severity: "warning",
  },
  {
    id: "rule-006",
    condition: "Rapid (G00) toward part",
    action: "Verify clearance before rapid approach",
    rationale: "Rapid collision with part = catastrophic damage",
    category: "safety",
    severity: "critical",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRATribalAugmentationEngine {
  private config: TribalConfig = DEFAULT_CONFIG;
  private tips: TribalTip[] = [...JM_DIE_TIPS, ...OKUMA_TIPS];
  private rules: PlaybookRule[] = [...PLAYBOOK_RULES];

  /**
   * Set configuration
   */
  setConfig(config: Partial<TribalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): TribalConfig {
    return { ...this.config };
  }

  /**
   * Add custom tribal tip
   */
  addTip(tip: TribalTip): void {
    this.tips.push(tip);
  }

  /**
   * Add custom playbook rule
   */
  addRule(rule: PlaybookRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all tips
   */
  getTips(source?: TipSource): TribalTip[] {
    if (source) {
      return this.tips.filter(t => t.source === source);
    }
    return [...this.tips];
  }

  /**
   * Get all rules
   */
  getRules(category?: string): PlaybookRule[] {
    if (category) {
      return this.rules.filter(r => r.category === category);
    }
    return [...this.rules];
  }

  /**
   * Calculate relevance score for tip
   */
  private calculateRelevance(tip: TribalTip, response: string, query: string): number {
    const combined = `${response} ${query}`.toLowerCase();
    let score = 0;

    // Keyword matching
    const matchedKeywords = tip.keywords.filter(k => combined.includes(k.toLowerCase()));
    score += (matchedKeywords.length / tip.keywords.length) * 0.6;

    // Material/operation/machine matching
    if (tip.material && combined.includes(tip.material.toLowerCase())) score += 0.15;
    if (tip.operation && combined.includes(tip.operation.toLowerCase())) score += 0.15;
    if (tip.machine && combined.includes(tip.machine.toLowerCase())) score += 0.10;

    // Priority boost
    score += (tip.priority / 10) * 0.1;

    return Math.min(1, score);
  }

  /**
   * Find relevant tips for response
   */
  findRelevantTips(response: string, query: string): Array<{ tip: TribalTip; relevance: number }> {
    const scored = this.tips.map(tip => ({
      tip,
      relevance: this.calculateRelevance(tip, response, query),
    }));

    // Filter by minimum relevance and sort by relevance + priority
    return scored
      .filter(s => s.relevance >= this.config.min_relevance_score)
      .sort((a, b) => {
        const aScore = a.relevance + a.tip.priority / 10;
        const bScore = b.relevance + b.tip.priority / 10;
        return bScore - aScore;
      })
      .slice(0, this.config.max_tips_per_response);
  }

  /**
   * Check for triggered playbook rules
   */
  checkRules(response: string, query: string): PlaybookRule[] {
    const lower = response.toLowerCase();
    const triggered: PlaybookRule[] = [];

    // Check each rule condition
    for (const rule of this.rules) {
      let matches = false;

      // Simple pattern matching for conditions
      if (rule.id === "rule-001") {
        // SFM > 500 for steel
        const sfmMatch = response.match(/(\d+)\s*sfm/i);
        if (sfmMatch && parseInt(sfmMatch[1]) > 500 && lower.includes("steel")) {
          matches = true;
        }
      }

      if (rule.id === "rule-002") {
        // No G50 in response that has G96
        if (lower.includes("g96") && !lower.includes("g50")) {
          matches = true;
        }
      }

      if (rule.id === "rule-003") {
        // DOC > 0.200 for finishing
        const docMatch = response.match(/0\.(\d{3})/);
        if (docMatch && parseInt(docMatch[1]) > 200 && lower.includes("finish")) {
          matches = true;
        }
      }

      if (rule.id === "rule-005") {
        // No coolant for steel
        if (lower.includes("steel") && !lower.includes("coolant") && !lower.includes("m08") && !lower.includes("flood")) {
          matches = true;
        }
      }

      if (rule.id === "rule-006") {
        // Rapid toward part without clearance check
        if (lower.includes("g00") && !lower.includes("clearance") && !lower.includes("verify")) {
          matches = true;
        }
      }

      if (matches) {
        triggered.push(rule);
      }
    }

    return triggered;
  }

  /**
   * Augment response with tribal knowledge
   */
  augment(response: string, query: string): AugmentationResult {
    const relevantTips = this.findRelevantTips(response, query);
    const triggeredRules = this.checkRules(response, query);
    const warnings: string[] = [];

    // Build augmented response
    let augmented = response;

    // Add critical warnings first
    const criticalRules = triggeredRules.filter(r => r.severity === "critical");
    if (criticalRules.length > 0 && this.config.warn_on_anti_patterns) {
      const criticalWarnings = criticalRules.map(r => `⚠️ CRITICAL: ${r.action}. ${r.rationale}`);
      warnings.push(...criticalWarnings);
      augmented = `${response}\n\n---\n**Critical Safety Notes:**\n${criticalWarnings.join("\n")}`;
    }

    // Add tips
    if (relevantTips.length > 0) {
      const tipTexts = relevantTips.map(({ tip }) => {
        let text = `💡 ${tip.content}`;
        if (this.config.include_rationale && tip.source !== "handbook") {
          text += ` (Source: ${tip.source})`;
        }
        return text;
      });

      augmented += `\n\n**Shop Floor Tips:**\n${tipTexts.join("\n")}`;
    }

    // Add non-critical warnings
    const otherRules = triggeredRules.filter(r => r.severity !== "critical");
    for (const rule of otherRules) {
      warnings.push(`${rule.severity.toUpperCase()}: ${rule.action}`);
    }

    // Calculate confidence boost from tribal knowledge
    const confidenceBoost = Math.min(0.15, relevantTips.length * 0.03 + (criticalRules.length > 0 ? 0.05 : 0));

    return {
      original_response: response,
      augmented_response: augmented,
      tips_applied: relevantTips.map(t => t.tip),
      rules_triggered: triggeredRules,
      warnings,
      confidence_boost: confidenceBoost,
    };
  }

  /**
   * Search tips by keyword
   */
  searchTips(keyword: string): TribalTip[] {
    const lower = keyword.toLowerCase();
    return this.tips.filter(t =>
      t.keywords.some(k => k.toLowerCase().includes(lower)) ||
      t.content.toLowerCase().includes(lower)
    );
  }

  /**
   * Get tips by material
   */
  getTipsByMaterial(material: string): TribalTip[] {
    const lower = material.toLowerCase();
    return this.tips.filter(t =>
      t.material?.toLowerCase() === lower ||
      t.keywords.some(k => k.toLowerCase() === lower)
    );
  }

  /**
   * Get tips by operation
   */
  getTipsByOperation(operation: string): TribalTip[] {
    const lower = operation.toLowerCase();
    return this.tips.filter(t =>
      t.operation?.toLowerCase() === lower ||
      t.keywords.some(k => k.toLowerCase() === lower)
    );
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_tips: number;
    tips_by_source: Record<TipSource, number>;
    total_rules: number;
    rules_by_severity: Record<string, number>;
  } {
    const tipsBySource: Record<TipSource, number> = {
      jm_die: 0,
      okuma: 0,
      playbook: 0,
      community: 0,
      handbook: 0,
    };

    for (const tip of this.tips) {
      tipsBySource[tip.source]++;
    }

    const rulesBySeverity: Record<string, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    for (const rule of this.rules) {
      rulesBySeverity[rule.severity]++;
    }

    return {
      total_tips: this.tips.length,
      tips_by_source: tipsBySource,
      total_rules: this.rules.length,
      rules_by_severity: rulesBySeverity,
    };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.tips = [...JM_DIE_TIPS, ...OKUMA_TIPS];
    this.rules = [...PLAYBOOK_RULES];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRATribalAugmentationEngine = new LatheLoRATribalAugmentationEngine();
