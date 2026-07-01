/**
 * CompactionStrategyEngine - Intelligent context compaction decisions
 *
 * When context window pressure builds, decides what to keep, compress,
 * or drop. Prioritizes recent edits, active file content, and error
 * context over old reads, verbose outputs, and stale data.
 *
 * @version 1.0.0
 */

export type ContentCategory =
  | "active-edit"
  | "recent-read"
  | "stale-read"
  | "tool-output"
  | "error-context"
  | "conversation"
  | "system-prompt"
  | "unknown";

export type Action = "keep" | "compress" | "drop";

export interface ContentBlock {
  id: string;
  category: ContentCategory;
  tokens: number;
  age: number;
  importance: number;
  content?: string;
}

export interface CompactionPlan {
  keep: ContentBlock[];
  compress: ContentBlock[];
  drop: ContentBlock[];
  savedTokens: number;
  retainedTokens: number;
  compressionRatio: number;
}

const CATEGORY_PRIORITY: Record<ContentCategory, number> = {
  "system-prompt": 100,
  "error-context": 90,
  "active-edit": 85,
  "recent-read": 60,
  "conversation": 50,
  "tool-output": 30,
  "stale-read": 20,
  "unknown": 10,
};

const COMPRESSION_RATIOS: Record<ContentCategory, number> = {
  "system-prompt": 1.0,
  "error-context": 0.7,
  "active-edit": 0.8,
  "recent-read": 0.5,
  "conversation": 0.6,
  "tool-output": 0.3,
  "stale-read": 0.2,
  "unknown": 0.4,
};

export class CompactionStrategyEngine {
  private targetUtilization: number;

  constructor(targetUtilization = 0.7) {
    this.targetUtilization = targetUtilization;
  }

  /**
   * Create a compaction plan given content blocks and target budget.
   */
  plan(blocks: ContentBlock[], budgetTokens: number): CompactionPlan {
    // Score each block
    const scored = blocks.map((b) => ({
      block: b,
      score: this.score(b),
    }));

    // Sort by score descending (highest priority first)
    scored.sort((a, b) => b.score - a.score);

    const keep: ContentBlock[] = [];
    const compress: ContentBlock[] = [];
    const drop: ContentBlock[] = [];
    let usedTokens = 0;
    const target = budgetTokens * this.targetUtilization;

    for (const { block, score } of scored) {
      if (usedTokens + block.tokens <= target) {
        // Fits in budget — keep
        keep.push(block);
        usedTokens += block.tokens;
      } else if (score > 40) {
        // Important but doesn't fit — compress
        const compressedTokens = Math.ceil(
          block.tokens * (COMPRESSION_RATIOS[block.category] ?? 0.5),
        );
        if (usedTokens + compressedTokens <= budgetTokens) {
          compress.push(block);
          usedTokens += compressedTokens;
        } else {
          drop.push(block);
        }
      } else {
        // Low priority — drop
        drop.push(block);
      }
    }

    const originalTokens = blocks.reduce((s, b) => s + b.tokens, 0);
    const savedTokens = originalTokens - usedTokens;

    return {
      keep,
      compress,
      drop,
      savedTokens,
      retainedTokens: usedTokens,
      compressionRatio:
        originalTokens > 0 ? Math.round((usedTokens / originalTokens) * 100) : 100,
    };
  }

  /**
   * Auto-categorize content based on heuristics.
   */
  categorize(content: string, tool?: string, ageSeconds?: number): ContentCategory {
    if (tool === "Edit" || tool === "Write") return "active-edit";
    if (tool === "Read") {
      return (ageSeconds ?? 0) > 300 ? "stale-read" : "recent-read";
    }
    if (tool === "Bash" || tool === "Grep" || tool === "Glob") return "tool-output";
    if (content.includes("Error") || content.includes("error") || content.includes("FAIL")) {
      return "error-context";
    }
    return "unknown";
  }

  /**
   * Estimate how much can be saved from current context.
   */
  estimateSavings(
    blocks: ContentBlock[],
    budgetTokens: number,
  ): { canSave: number; percent: number } {
    const plan = this.plan(blocks, budgetTokens);
    const total = blocks.reduce((s, b) => s + b.tokens, 0);
    return {
      canSave: plan.savedTokens,
      percent: total > 0 ? Math.round((plan.savedTokens / total) * 100) : 0,
    };
  }

  /**
   * One-liner recommendation.
   */
  recommend(blocks: ContentBlock[], budgetTokens: number): string {
    const plan = this.plan(blocks, budgetTokens);
    return (
      "Compaction: keep " +
      plan.keep.length +
      ", compress " +
      plan.compress.length +
      ", drop " +
      plan.drop.length +
      " | save ~" +
      plan.savedTokens +
      " tokens (" +
      plan.compressionRatio +
      "% retained)"
    );
  }

  private score(block: ContentBlock): number {
    const categoryScore = CATEGORY_PRIORITY[block.category] ?? 10;
    const ageDecay = Math.max(0, 1 - block.age / 3600);
    const importanceBoost = block.importance * 10;
    return categoryScore * ageDecay + importanceBoost;
  }
}

export const compactionStrategyEngine = new CompactionStrategyEngine();
