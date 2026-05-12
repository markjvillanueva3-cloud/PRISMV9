/**
 * ContextRetentionEngine — Critical Fact Preservation
 *
 * AGENT ROADMAP: U-AGT05 (MS2)
 *
 * Identifies and preserves critical facts that must survive context
 * compaction. Extracts key information from conversations and marks
 * them for retention.
 *
 * Critical Fact Types:
 * - Machine-specific settings (speeds, feeds, offsets)
 * - Material properties learned from experience
 * - Customer preferences and requirements
 * - Safety constraints and limits
 * - User corrections (highest priority)
 *
 * @module engines/ContextRetentionEngine
 */

import {
  agentMemoryFabricEngine,
  MemoryEntry,
} from "./AgentMemoryFabricEngine.js";

/**
 * A critical fact extracted from conversation
 */
export interface CriticalFact {
  /** The fact content */
  content: string;
  /** Why this is critical */
  reason: string;
  /** Category of fact */
  category:
    | "machine"
    | "material"
    | "customer"
    | "safety"
    | "correction"
    | "preference"
    | "process";
  /** Importance score 1-10 */
  importance: number;
  /** Related entities */
  entities: string[];
  /** Source message/context */
  sourceContext?: string;
}

/**
 * Retention decision
 */
export interface RetentionDecision {
  /** Should this be retained? */
  retain: boolean;
  /** Why this decision was made */
  reason: string;
  /** How long to retain (null = forever) */
  retentionDays?: number;
}

/**
 * Context summary for compaction survival
 */
export interface CompactionSurvivalContext {
  /** Critical facts that must survive */
  facts: CriticalFact[];
  /** User preferences */
  preferences: string[];
  /** Active constraints */
  constraints: string[];
  /** Current work context */
  workContext: string;
  /** Estimated token cost */
  tokenCost: number;
}

/**
 * ContextRetentionEngine — Preserves critical information
 */
export class ContextRetentionEngine {
  /** Patterns that indicate critical information */
  private readonly criticalPatterns = [
    // Machine settings
    { pattern: /offset|compensation|calibration/i, category: "machine" as const, importance: 8 },
    { pattern: /tool\s*(length|diameter|radius)/i, category: "machine" as const, importance: 7 },
    { pattern: /work\s*offset|G5[4-9]/i, category: "machine" as const, importance: 9 },

    // Material properties
    { pattern: /hardness|HRC|Rockwell/i, category: "material" as const, importance: 7 },
    { pattern: /heat\s*treat|temper|anneal/i, category: "material" as const, importance: 8 },
    { pattern: /kc1|specific\s*cutting\s*force/i, category: "material" as const, importance: 9 },

    // Safety constraints
    { pattern: /max(imum)?\s*(speed|rpm|sfm)/i, category: "safety" as const, importance: 10 },
    { pattern: /never|always|must|required|forbidden/i, category: "safety" as const, importance: 9 },
    { pattern: /crash|collision|danger|warning/i, category: "safety" as const, importance: 10 },

    // Customer requirements
    { pattern: /customer\s*(wants|requires|specified)/i, category: "customer" as const, importance: 8 },
    { pattern: /tolerance|precision|accuracy/i, category: "customer" as const, importance: 7 },
    { pattern: /deadline|due\s*date|ship\s*date/i, category: "customer" as const, importance: 6 },

    // Process knowledge
    { pattern: /feed\s*rate|speed|rpm|ipm|sfm/i, category: "process" as const, importance: 6 },
    { pattern: /depth\s*of\s*cut|doc|woc/i, category: "process" as const, importance: 6 },
    { pattern: /coolant|mist|flood/i, category: "process" as const, importance: 5 },

    // Corrections (highest priority)
    { pattern: /wrong|incorrect|that's\s*not|actually|instead/i, category: "correction" as const, importance: 10 },
    { pattern: /should\s*be|needs\s*to\s*be|change\s*to/i, category: "correction" as const, importance: 9 },
  ];

  /**
   * Extract critical facts from text
   */
  extractCriticalFacts(text: string): CriticalFact[] {
    const facts: CriticalFact[] = [];
    const sentences = this.splitIntoSentences(text);

    for (const sentence of sentences) {
      const matchedPatterns = this.criticalPatterns.filter((p) =>
        p.pattern.test(sentence)
      );

      if (matchedPatterns.length > 0) {
        // Use highest importance match
        const bestMatch = matchedPatterns.reduce((a, b) =>
          a.importance > b.importance ? a : b
        );

        facts.push({
          content: sentence.trim(),
          reason: `Matches ${bestMatch.category} pattern`,
          category: bestMatch.category,
          importance: bestMatch.importance,
          entities: this.extractEntities(sentence),
          sourceContext: text.slice(0, 100),
        });
      }
    }

    // Dedupe by content similarity
    return this.deduplicateFacts(facts);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Machine names
    const machineMatch = text.match(
      /(?:Okuma|Haas|Hurco|Mazak|DMG|Roku-Roku|Mitsubishi)\s*\w*/gi
    );
    if (machineMatch) entities.push(...machineMatch);

    // Material names
    const materialMatch = text.match(
      /(?:D2|S7|M2|A2|H13|4140|1018|6061|7075|Ti-?6Al-?4V|Inconel|carbide)/gi
    );
    if (materialMatch) entities.push(...materialMatch);

    // Tool types
    const toolMatch = text.match(
      /(?:end\s*mill|face\s*mill|drill|tap|reamer|boring\s*bar|insert)/gi
    );
    if (toolMatch) entities.push(...toolMatch);

    return [...new Set(entities)];
  }

  /**
   * Deduplicate facts by content similarity
   */
  private deduplicateFacts(facts: CriticalFact[]): CriticalFact[] {
    const unique: CriticalFact[] = [];

    for (const fact of facts) {
      const isDupe = unique.some(
        (u) =>
          u.content.toLowerCase() === fact.content.toLowerCase() ||
          this.jaccardSimilarity(u.content, fact.content) > 0.7
      );

      if (!isDupe) {
        unique.push(fact);
      }
    }

    return unique;
  }

  /**
   * Calculate Jaccard similarity between two strings
   */
  private jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Decide if a fact should be retained
   */
  decideRetention(fact: CriticalFact): RetentionDecision {
    // Safety and corrections are always retained
    if (fact.category === "safety" || fact.category === "correction") {
      return {
        retain: true,
        reason: `${fact.category} facts are always retained for safety`,
        retentionDays: undefined, // Forever
      };
    }

    // High importance facts retained longer
    if (fact.importance >= 8) {
      return {
        retain: true,
        reason: `High importance fact (${fact.importance}/10)`,
        retentionDays: 365,
      };
    }

    // Medium importance
    if (fact.importance >= 5) {
      return {
        retain: true,
        reason: `Medium importance fact (${fact.importance}/10)`,
        retentionDays: 90,
      };
    }

    // Low importance - retain but shorter
    return {
      retain: true,
      reason: `Low importance fact (${fact.importance}/10)`,
      retentionDays: 30,
    };
  }

  /**
   * Save critical facts to memory fabric
   */
  async saveCriticalFacts(facts: CriticalFact[]): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];

    for (const fact of facts) {
      const decision = this.decideRetention(fact);

      if (decision.retain) {
        const entry = await agentMemoryFabricEngine.rememberFact(
          fact.content,
          {
            relatedEntity: fact.entities[0],
            tags: [fact.category, ...fact.entities.slice(0, 3)],
            confidence: fact.importance / 10,
            priority: fact.importance,
            source: fact.category === "correction" ? "correction" : "inference",
          }
        );
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Extract and save critical facts from conversation
   */
  async processConversation(
    messages: string[]
  ): Promise<{ extracted: number; saved: number }> {
    const allFacts: CriticalFact[] = [];

    for (const msg of messages) {
      const facts = this.extractCriticalFacts(msg);
      allFacts.push(...facts);
    }

    const dedupedFacts = this.deduplicateFacts(allFacts);
    const saved = await this.saveCriticalFacts(dedupedFacts);

    return {
      extracted: dedupedFacts.length,
      saved: saved.length,
    };
  }

  /**
   * Build compaction survival context
   */
  async buildSurvivalContext(
    maxTokens = 2000
  ): Promise<CompactionSurvivalContext> {
    await agentMemoryFabricEngine.initialize();

    // Get critical memories
    const safetyFacts = await agentMemoryFabricEngine.query({
      tags: ["safety"],
      sortBy: "priority",
      limit: 20,
    });

    const corrections = await agentMemoryFabricEngine.query({
      type: "correction",
      limit: 10,
    });

    const preferences = await agentMemoryFabricEngine.query({
      type: "preference",
      limit: 10,
    });

    const recentContext = await agentMemoryFabricEngine.query({
      type: "context",
      maxAgeDays: 1,
      limit: 5,
    });

    // Build facts list
    const facts: CriticalFact[] = [];
    let tokenCount = 0;

    // Safety first
    for (const mem of safetyFacts) {
      const tokens = Math.ceil(mem.content.length / 4);
      if (tokenCount + tokens > maxTokens * 0.4) break;
      facts.push({
        content: mem.content,
        reason: "Safety fact",
        category: "safety",
        importance: 10,
        entities: mem.relatedEntity ? [mem.relatedEntity] : [],
      });
      tokenCount += tokens;
    }

    // Then corrections
    for (const mem of corrections) {
      const tokens = Math.ceil(mem.content.length / 4);
      if (tokenCount + tokens > maxTokens * 0.6) break;
      facts.push({
        content: mem.content,
        reason: "Correction",
        category: "correction",
        importance: 10,
        entities: mem.relatedEntity ? [mem.relatedEntity] : [],
      });
      tokenCount += tokens;
    }

    // Build preferences list
    const prefStrings = preferences.map((p) => p.content);

    // Build work context
    const workContext = recentContext
      .map((c) => c.content)
      .join(" | ")
      .slice(0, 500);

    return {
      facts,
      preferences: prefStrings,
      constraints: safetyFacts.map((s) => s.content).slice(0, 5),
      workContext,
      tokenCost: tokenCount,
    };
  }

  /**
   * Check if a message contains critical information
   */
  hasCriticalInfo(message: string): boolean {
    return this.criticalPatterns.some((p) => p.pattern.test(message));
  }

  /**
   * Get importance score for a message
   */
  getImportanceScore(message: string): number {
    const matches = this.criticalPatterns.filter((p) =>
      p.pattern.test(message)
    );

    if (matches.length === 0) return 0;
    return Math.max(...matches.map((m) => m.importance));
  }

  /**
   * Summarize facts for context injection
   */
  summarizeFacts(facts: CriticalFact[]): string {
    if (facts.length === 0) return "No critical facts stored.";

    const byCategory: Record<string, string[]> = {};
    for (const fact of facts) {
      if (!byCategory[fact.category]) {
        byCategory[fact.category] = [];
      }
      byCategory[fact.category].push(fact.content);
    }

    return Object.entries(byCategory)
      .map(([cat, items]) => `${cat}: ${items.slice(0, 3).join("; ")}`)
      .join("\n");
  }
}

// Export singleton
export const contextRetentionEngine = new ContextRetentionEngine();
