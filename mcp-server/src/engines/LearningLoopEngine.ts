/**
 * LearningLoopEngine — Learning from Corrections
 *
 * AGENT ROADMAP: U-AGT06 (MS2)
 *
 * Tracks when the agent makes mistakes and learns from corrections.
 * Builds a correction database that improves future responses.
 *
 * Learning Types:
 * - Value corrections (wrong number → correct number)
 * - Approach corrections (wrong method → correct method)
 * - Context corrections (missing context → added context)
 * - Preference corrections (style adjustments)
 *
 * @module engines/LearningLoopEngine
 */

import {
  agentMemoryFabricEngine,
  MemoryEntry,
} from "./AgentMemoryFabricEngine.js";

/**
 * A correction record
 */
export interface Correction {
  /** Unique ID */
  id: string;
  /** Type of correction */
  type: "value" | "approach" | "context" | "preference" | "safety";
  /** What was wrong */
  incorrect: string;
  /** What should have been said/done */
  correct: string;
  /** Why it was wrong */
  reason?: string;
  /** Domain (speed_feed, tooling, material, etc.) */
  domain: string;
  /** Related entities */
  entities: string[];
  /** Severity: how bad was the mistake? 1-10 */
  severity: number;
  /** Has this correction been applied successfully? */
  verified: boolean;
  /** Number of times this pattern has recurred */
  recurrences: number;
  /** Created timestamp */
  createdAt: string;
  /** Last triggered timestamp */
  lastTriggeredAt?: string;
}

/**
 * Learning statistics
 */
export interface LearningStats {
  /** Total corrections recorded */
  totalCorrections: number;
  /** Corrections by type */
  byType: Record<string, number>;
  /** Corrections by domain */
  byDomain: Record<string, number>;
  /** Average severity */
  avgSeverity: number;
  /** Most common mistake patterns */
  commonPatterns: { pattern: string; count: number }[];
  /** Improvement rate (verified / total) */
  improvementRate: number;
}

/**
 * Check result when applying learned corrections
 */
export interface CorrectionCheck {
  /** Was a correction triggered? */
  triggered: boolean;
  /** The matching correction if found */
  correction?: Correction;
  /** Suggested fix */
  suggestion?: string;
  /** Confidence in the suggestion */
  confidence: number;
}

/**
 * LearningLoopEngine — Learns from mistakes
 */
export class LearningLoopEngine {
  private corrections: Correction[] = [];
  private initialized = false;

  /**
   * Initialize from memory fabric
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await agentMemoryFabricEngine.initialize();

    // Load existing corrections from memory
    const memories = await agentMemoryFabricEngine.query({
      type: "correction",
    });

    for (const mem of memories) {
      try {
        const data = JSON.parse(mem.content);
        this.corrections.push({
          id: mem.id,
          type: data.type || "value",
          incorrect: data.wrong || data.incorrect,
          correct: data.correct,
          reason: data.reason || data.context,
          domain: this.inferDomain(data.wrong || "", data.correct || ""),
          entities: mem.relatedEntity ? [mem.relatedEntity] : [],
          severity: Math.round((1 - (mem.confidence || 0.5)) * 10),
          verified: mem.reinforcements > 0,
          recurrences: mem.reinforcements,
          createdAt: mem.createdAt,
          lastTriggeredAt: mem.lastAccessedAt,
        });
      } catch {
        // Skip malformed entries
      }
    }

    this.initialized = true;
  }

  /**
   * Record a new correction
   */
  async recordCorrection(
    incorrect: string,
    correct: string,
    options: {
      type?: Correction["type"];
      reason?: string;
      domain?: string;
      entities?: string[];
      severity?: number;
    } = {}
  ): Promise<Correction> {
    await this.initialize();

    const correction: Correction = {
      id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: options.type || this.inferCorrectionType(incorrect, correct),
      incorrect,
      correct,
      reason: options.reason,
      domain: options.domain || this.inferDomain(incorrect, correct),
      entities: options.entities || this.extractEntities(incorrect + " " + correct),
      severity: options.severity || this.assessSeverity(incorrect, correct),
      verified: false,
      recurrences: 0,
      createdAt: new Date().toISOString(),
    };

    // Save to memory
    await agentMemoryFabricEngine.rememberCorrection(
      incorrect,
      correct,
      options.reason || "User correction",
      {
        relatedEntity: correction.entities[0],
        tags: [correction.type, correction.domain, ...correction.entities],
      }
    );

    this.corrections.push(correction);
    return correction;
  }

  /**
   * Infer correction type from content
   */
  private inferCorrectionType(
    incorrect: string,
    correct: string
  ): Correction["type"] {
    const incLower = incorrect.toLowerCase();
    const corLower = correct.toLowerCase();

    // Value correction: numbers changed
    const incNumbers = incorrect.match(/[\d.]+/g);
    const corNumbers = correct.match(/[\d.]+/g);
    if (incNumbers && corNumbers && incNumbers.join() !== corNumbers.join()) {
      return "value";
    }

    // Safety correction
    if (
      corLower.includes("never") ||
      corLower.includes("danger") ||
      corLower.includes("maximum") ||
      corLower.includes("minimum")
    ) {
      return "safety";
    }

    // Preference correction
    if (
      corLower.includes("prefer") ||
      corLower.includes("always use") ||
      corLower.includes("style")
    ) {
      return "preference";
    }

    // Context correction
    if (correct.length > incorrect.length * 1.5) {
      return "context";
    }

    // Default to approach
    return "approach";
  }

  /**
   * Infer domain from content
   */
  private inferDomain(incorrect: string, correct: string): string {
    const combined = (incorrect + " " + correct).toLowerCase();

    if (combined.match(/speed|sfm|rpm|velocity/)) return "speed_feed";
    if (combined.match(/feed|ipm|ipr|fpt/)) return "speed_feed";
    if (combined.match(/tool|insert|endmill|drill/)) return "tooling";
    if (combined.match(/material|steel|aluminum|carbide/)) return "material";
    if (combined.match(/tolerance|precision|accuracy/)) return "quality";
    if (combined.match(/safety|max|min|limit|never/)) return "safety";
    if (combined.match(/program|gcode|g-code|nc/)) return "programming";
    if (combined.match(/machine|spindle|axis|turret/)) return "machine";

    return "general";
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Materials
    const materials = text.match(
      /\b(D2|S7|M2|A2|H13|4140|1018|6061|7075|Ti-6Al-4V|Inconel)\b/gi
    );
    if (materials) entities.push(...materials);

    // Machines
    const machines = text.match(
      /\b(Okuma|Haas|Hurco|Mazak|DMG|Mitsubishi)\b/gi
    );
    if (machines) entities.push(...machines);

    // Tools
    const tools = text.match(
      /\b(endmill|drill|tap|reamer|boring bar|insert)\b/gi
    );
    if (tools) entities.push(...tools);

    return [...new Set(entities)];
  }

  /**
   * Assess severity of mistake
   */
  private assessSeverity(incorrect: string, correct: string): number {
    const incLower = incorrect.toLowerCase();
    const corLower = correct.toLowerCase();

    // Safety-related mistakes are most severe
    if (
      corLower.includes("crash") ||
      corLower.includes("danger") ||
      corLower.includes("damage")
    ) {
      return 10;
    }

    // Large numeric differences
    const incNum = parseFloat(incorrect.match(/[\d.]+/)?.[0] || "0");
    const corNum = parseFloat(correct.match(/[\d.]+/)?.[0] || "0");
    if (incNum > 0 && corNum > 0) {
      const ratio = Math.max(incNum, corNum) / Math.min(incNum, corNum);
      if (ratio > 5) return 8;
      if (ratio > 2) return 6;
    }

    // Default moderate severity
    return 5;
  }

  /**
   * Check if a response should be corrected
   */
  async checkForCorrection(
    proposedResponse: string
  ): Promise<CorrectionCheck> {
    await this.initialize();

    const responseLower = proposedResponse.toLowerCase();

    for (const corr of this.corrections) {
      const incorrectLower = corr.incorrect.toLowerCase();

      // Check for similar content
      if (this.containsSimilar(responseLower, incorrectLower)) {
        // Update recurrence count
        corr.recurrences++;
        corr.lastTriggeredAt = new Date().toISOString();

        return {
          triggered: true,
          correction: corr,
          suggestion: `Previously corrected: "${corr.incorrect}" should be "${corr.correct}"${corr.reason ? ` (${corr.reason})` : ""}`,
          confidence: 0.8 + corr.recurrences * 0.02,
        };
      }
    }

    return {
      triggered: false,
      confidence: 0,
    };
  }

  /**
   * Check if text contains similar content
   */
  private containsSimilar(text: string, pattern: string): boolean {
    // Direct substring match
    if (text.includes(pattern)) return true;

    // Word overlap check
    const textWords = new Set(text.split(/\s+/));
    const patternWords = pattern.split(/\s+/);

    const matchCount = patternWords.filter((w) => textWords.has(w)).length;
    const matchRatio = matchCount / patternWords.length;

    // Require BOTH a high ratio AND an absolute floor of shared words. Without
    // the floor a short pattern false-triggers on unrelated prose: a 3-word
    // pattern (e.g. "feed rate 0.010") sharing just two common words ("feed",
    // "rate") with an unrelated response scores ratio 0.67 (> 0.6) and would
    // wrongly match. Short EXACT patterns are already covered by the substring
    // match above, so this floor only removes spurious fuzzy matches, not real ones.
    const MIN_OVERLAP_WORDS = 3;
    return matchRatio > 0.6 && matchCount >= MIN_OVERLAP_WORDS;
  }

  /**
   * Verify a correction was applied successfully
   */
  async verifyCorrection(correctionId: string): Promise<boolean> {
    await this.initialize();

    const corr = this.corrections.find((c) => c.id === correctionId);
    if (!corr) return false;

    corr.verified = true;
    return true;
  }

  /**
   * Get corrections for a specific domain
   */
  async getByDomain(domain: string): Promise<Correction[]> {
    await this.initialize();
    return this.corrections.filter((c) => c.domain === domain);
  }

  /**
   * Get corrections for specific entities
   */
  async getByEntity(entity: string): Promise<Correction[]> {
    await this.initialize();
    const entityLower = entity.toLowerCase();
    return this.corrections.filter((c) =>
      c.entities.some((e) => e.toLowerCase() === entityLower)
    );
  }

  /**
   * Get most severe unverified corrections
   */
  async getCriticalCorrections(limit = 10): Promise<Correction[]> {
    await this.initialize();

    return this.corrections
      .filter((c) => !c.verified && c.severity >= 7)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, limit);
  }

  /**
   * Get frequently recurring corrections
   */
  async getRecurringCorrections(minRecurrences = 2): Promise<Correction[]> {
    await this.initialize();

    return this.corrections
      .filter((c) => c.recurrences >= minRecurrences)
      .sort((a, b) => b.recurrences - a.recurrences);
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<LearningStats> {
    await this.initialize();

    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    let totalSeverity = 0;
    let verifiedCount = 0;

    for (const corr of this.corrections) {
      byType[corr.type] = (byType[corr.type] || 0) + 1;
      byDomain[corr.domain] = (byDomain[corr.domain] || 0) + 1;
      totalSeverity += corr.severity;
      if (corr.verified) verifiedCount++;
    }

    // Find common patterns
    const patternCounts: Record<string, number> = {};
    for (const corr of this.corrections) {
      const key = `${corr.domain}:${corr.type}`;
      patternCounts[key] = (patternCounts[key] || 0) + 1;
    }

    const commonPatterns = Object.entries(patternCounts)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCorrections: this.corrections.length,
      byType,
      byDomain,
      avgSeverity:
        this.corrections.length > 0
          ? totalSeverity / this.corrections.length
          : 0,
      commonPatterns,
      improvementRate:
        this.corrections.length > 0
          ? verifiedCount / this.corrections.length
          : 1,
    };
  }

  /**
   * Generate learning summary for context injection
   */
  async getLearningContext(maxTokens = 500): Promise<string> {
    await this.initialize();

    if (this.corrections.length === 0) {
      return "No corrections recorded yet.";
    }

    const lines: string[] = ["Key corrections to remember:"];
    let tokenCount = 10;

    // Sort by severity and recurrence
    const sorted = [...this.corrections].sort(
      (a, b) => b.severity + b.recurrences * 2 - (a.severity + a.recurrences * 2)
    );

    for (const corr of sorted) {
      const line = `- ${corr.domain}: "${corr.incorrect}" → "${corr.correct}"`;
      const tokens = Math.ceil(line.length / 4);

      if (tokenCount + tokens > maxTokens) break;
      lines.push(line);
      tokenCount += tokens;
    }

    return lines.join("\n");
  }

  /**
   * Clear all corrections (for testing)
   */
  async clearAll(): Promise<void> {
    this.corrections = [];
    // Mark initialized so a subsequent lazy initialize() does NOT reload the
    // persisted corrections from the shared agentMemoryFabricEngine. Without
    // this, every accessor (checkForCorrection / getByDomain / ...) re-runs
    // initialize() on a freshly-cleared engine and repopulates it from
    // process-wide persistence -- defeating this "clear for testing" helper and
    // leaking cross-run corrections into a supposedly-empty store.
    this.initialized = true;
  }
}

// Export singleton
export const learningLoopEngine = new LearningLoopEngine();
