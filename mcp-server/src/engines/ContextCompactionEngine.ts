/**
 * ContextCompactionEngine — Efficient Context Management
 *
 * AGENT ROADMAP: U-AGT14 (MS4)
 *
 * Manages context window efficiently:
 * - Auto-compact when context exceeds threshold
 * - Compacts history, summarizes prior turns
 * - Preserves critical facts, discards stale info
 * - User-marked 'remember this' survives compaction
 *
 * @module engines/ContextCompactionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Context item types */
export type ContextItemType =
  | "user_message"
  | "assistant_response"
  | "tool_call"
  | "tool_result"
  | "system_message"
  | "critical_fact"
  | "user_instruction"
  | "memory_anchor";

/** Context item priority */
export type ContextPriority = "critical" | "high" | "medium" | "low" | "ephemeral";

/** Context item */
export interface ContextItem {
  id: string;
  type: ContextItemType;
  content: string;
  timestamp: string;
  tokenCount: number;
  priority: ContextPriority;
  preserveOnCompact: boolean;
  metadata?: ContextItemMetadata;
}

/** Context item metadata */
export interface ContextItemMetadata {
  role?: "user" | "assistant" | "system";
  toolName?: string;
  entities?: string[];
  summarized?: boolean;
  originalTokenCount?: number;
  turnIndex?: number;
}

/** Conversation context */
export interface ConversationContext {
  id: string;
  items: ContextItem[];
  totalTokens: number;
  maxTokens: number;
  compactionCount: number;
  createdAt: string;
  lastCompactedAt?: string;
}

/** Compaction configuration */
export interface CompactionConfig {
  maxTokens?: number;
  targetTokens?: number;
  preserveCritical?: boolean;
  preserveRecentTurns?: number;
  summarizeBefore?: number;
  minSummaryItems?: number;
}

/** Compaction result */
export interface CompactionResult {
  success: boolean;
  originalTokens: number;
  compactedTokens: number;
  itemsRemoved: number;
  itemsSummarized: number;
  criticalPreserved: number;
  durationMs: number;
  summary?: string;
}

/** Compaction strategy */
export type CompactionStrategy =
  | "recent_priority"    // Keep recent, summarize old
  | "importance_based"   // Keep important regardless of age
  | "aggressive"         // Minimize tokens aggressively
  | "balanced";          // Balance recency and importance

/** Token estimate for common items */
const TOKEN_ESTIMATES = {
  AVERAGE_WORD: 1.3,
  AVERAGE_LINE: 10,
  SUMMARY_OVERHEAD: 50,
  MIN_SUMMARY: 20
};

// ============================================================================
// ENGINE
// ============================================================================

export class ContextCompactionEngine {
  private readonly defaultConfig: Required<CompactionConfig> = {
    maxTokens: 24000,
    targetTokens: 16000,
    preserveCritical: true,
    preserveRecentTurns: 5,
    summarizeBefore: 10,
    minSummaryItems: 3
  };

  private contextCounter = 0;
  private itemCounter = 0;

  /**
   * Create new conversation context
   */
  createContext(maxTokens?: number): ConversationContext {
    return {
      id: this.generateContextId(),
      items: [],
      totalTokens: 0,
      maxTokens: maxTokens ?? this.defaultConfig.maxTokens,
      compactionCount: 0,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Add item to context
   */
  addItem(
    context: ConversationContext,
    type: ContextItemType,
    content: string,
    options?: {
      priority?: ContextPriority;
      preserveOnCompact?: boolean;
      metadata?: ContextItemMetadata;
    }
  ): ContextItem {
    const tokenCount = this.estimateTokens(content);
    const priority = options?.priority ?? this.inferPriority(type, content);
    const preserveOnCompact = options?.preserveOnCompact ??
      (priority === "critical" || type === "user_instruction" || type === "memory_anchor");

    const item: ContextItem = {
      id: this.generateItemId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      tokenCount,
      priority,
      preserveOnCompact,
      metadata: {
        ...options?.metadata,
        turnIndex: context.items.filter(i =>
          i.type === "user_message" || i.type === "assistant_response"
        ).length
      }
    };

    context.items.push(item);
    context.totalTokens += tokenCount;

    return item;
  }

  /**
   * Mark item for preservation (user "remember this")
   */
  markForPreservation(context: ConversationContext, itemId: string): boolean {
    const item = context.items.find(i => i.id === itemId);
    if (!item) return false;

    item.preserveOnCompact = true;
    item.priority = "critical";
    item.type = "memory_anchor";
    return true;
  }

  /**
   * Check if compaction is needed
   */
  needsCompaction(context: ConversationContext, config?: CompactionConfig): boolean {
    // Use config maxTokens, then context maxTokens, then default
    const maxTokens = config?.maxTokens ?? context.maxTokens;
    return context.totalTokens > maxTokens;
  }

  /**
   * Compact the context
   */
  compact(
    context: ConversationContext,
    strategy: CompactionStrategy = "balanced",
    config?: CompactionConfig
  ): CompactionResult {
    const startTime = Date.now();
    const cfg = { ...this.defaultConfig, ...config };
    const originalTokens = context.totalTokens;

    let itemsRemoved = 0;
    let itemsSummarized = 0;
    let criticalPreserved = 0;

    // Separate items by preservation status
    const preserved: ContextItem[] = [];
    const compactable: ContextItem[] = [];

    for (const item of context.items) {
      if (item.preserveOnCompact || item.priority === "critical") {
        preserved.push(item);
        criticalPreserved++;
      } else {
        compactable.push(item);
      }
    }

    // Apply strategy
    let newItems: ContextItem[];
    let summaryText: string | undefined;

    switch (strategy) {
      case "recent_priority":
        ({ items: newItems, summary: summaryText, removed: itemsRemoved, summarized: itemsSummarized } =
          this.compactRecentPriority(compactable, preserved, cfg));
        break;

      case "importance_based":
        ({ items: newItems, summary: summaryText, removed: itemsRemoved, summarized: itemsSummarized } =
          this.compactImportanceBased(compactable, preserved, cfg));
        break;

      case "aggressive":
        ({ items: newItems, summary: summaryText, removed: itemsRemoved, summarized: itemsSummarized } =
          this.compactAggressive(compactable, preserved, cfg));
        break;

      case "balanced":
      default:
        ({ items: newItems, summary: summaryText, removed: itemsRemoved, summarized: itemsSummarized } =
          this.compactBalanced(compactable, preserved, cfg));
        break;
    }

    // Update context
    context.items = newItems;
    context.totalTokens = newItems.reduce((sum, item) => sum + item.tokenCount, 0);
    context.compactionCount++;
    context.lastCompactedAt = new Date().toISOString();

    return {
      success: true,
      originalTokens,
      compactedTokens: context.totalTokens,
      itemsRemoved,
      itemsSummarized,
      criticalPreserved,
      durationMs: Date.now() - startTime,
      summary: summaryText
    };
  }

  /**
   * Recent priority compaction: Keep recent turns, summarize old
   */
  private compactRecentPriority(
    compactable: ContextItem[],
    preserved: ContextItem[],
    cfg: Required<CompactionConfig>
  ): { items: ContextItem[]; summary?: string; removed: number; summarized: number } {
    // Sort by turn index (most recent last)
    const sorted = [...compactable].sort((a, b) => {
      const turnA = a.metadata?.turnIndex ?? 0;
      const turnB = b.metadata?.turnIndex ?? 0;
      return turnA - turnB;
    });

    // Keep recent turns
    const recentCutoff = Math.max(0, sorted.length - cfg.preserveRecentTurns * 2);
    const recent = sorted.slice(recentCutoff);
    const old = sorted.slice(0, recentCutoff);

    // Summarize old items
    let summary: string | undefined;
    let summarized = 0;

    if (old.length >= cfg.minSummaryItems) {
      summary = this.generateSummary(old);
      summarized = old.length;
    }

    // Build result
    const items: ContextItem[] = [...preserved];

    if (summary) {
      items.push({
        id: this.generateItemId(),
        type: "system_message",
        content: `[Prior conversation summary: ${summary}]`,
        timestamp: new Date().toISOString(),
        tokenCount: this.estimateTokens(summary) + TOKEN_ESTIMATES.SUMMARY_OVERHEAD,
        priority: "medium",
        preserveOnCompact: false,
        metadata: { summarized: true, originalTokenCount: old.reduce((s, i) => s + i.tokenCount, 0) }
      });
    }

    items.push(...recent);

    return {
      items,
      summary,
      removed: old.length - (summary ? 1 : 0),
      summarized
    };
  }

  /**
   * Importance-based compaction: Keep important regardless of age
   */
  private compactImportanceBased(
    compactable: ContextItem[],
    preserved: ContextItem[],
    cfg: Required<CompactionConfig>
  ): { items: ContextItem[]; summary?: string; removed: number; summarized: number } {
    // Score each item
    const scored = compactable.map(item => ({
      item,
      score: this.scoreImportance(item)
    })).sort((a, b) => b.score - a.score);

    // Keep items until we hit target
    const items: ContextItem[] = [...preserved];
    let currentTokens = preserved.reduce((s, i) => s + i.tokenCount, 0);
    const kept: ContextItem[] = [];
    const discarded: ContextItem[] = [];

    for (const { item } of scored) {
      if (currentTokens + item.tokenCount <= cfg.targetTokens) {
        kept.push(item);
        currentTokens += item.tokenCount;
      } else {
        discarded.push(item);
      }
    }

    // Summarize discarded
    let summary: string | undefined;
    let summarized = 0;

    if (discarded.length >= cfg.minSummaryItems) {
      summary = this.generateSummary(discarded);
      summarized = discarded.length;
    }

    if (summary) {
      items.push({
        id: this.generateItemId(),
        type: "system_message",
        content: `[Compacted context: ${summary}]`,
        timestamp: new Date().toISOString(),
        tokenCount: this.estimateTokens(summary) + TOKEN_ESTIMATES.SUMMARY_OVERHEAD,
        priority: "medium",
        preserveOnCompact: false,
        metadata: { summarized: true }
      });
    }

    // Sort kept items by original order (turn index)
    kept.sort((a, b) => (a.metadata?.turnIndex ?? 0) - (b.metadata?.turnIndex ?? 0));
    items.push(...kept);

    return {
      items,
      summary,
      removed: discarded.length - (summary ? 1 : 0),
      summarized
    };
  }

  /**
   * Aggressive compaction: Minimize tokens as much as possible
   */
  private compactAggressive(
    compactable: ContextItem[],
    preserved: ContextItem[],
    cfg: Required<CompactionConfig>
  ): { items: ContextItem[]; summary?: string; removed: number; summarized: number } {
    // Keep only last 2 turns
    const recent = compactable.slice(-4);
    const old = compactable.slice(0, -4);

    // Generate aggressive summary
    const summary = this.generateAggressiveSummary(old);
    const summarized = old.length;

    const items: ContextItem[] = [...preserved];

    if (summary && old.length > 0) {
      items.push({
        id: this.generateItemId(),
        type: "system_message",
        content: `[Context: ${summary}]`,
        timestamp: new Date().toISOString(),
        tokenCount: this.estimateTokens(summary),
        priority: "low",
        preserveOnCompact: false,
        metadata: { summarized: true }
      });
    }

    items.push(...recent);

    return {
      items,
      summary,
      removed: old.length,
      summarized
    };
  }

  /**
   * Balanced compaction: Balance recency and importance
   */
  private compactBalanced(
    compactable: ContextItem[],
    preserved: ContextItem[],
    cfg: Required<CompactionConfig>
  ): { items: ContextItem[]; summary?: string; removed: number; summarized: number } {
    // Calculate recency + importance scores
    const now = Date.now();
    const scored = compactable.map(item => {
      const age = now - new Date(item.timestamp).getTime();
      const ageScore = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24h
      const importanceScore = this.scoreImportance(item);
      return {
        item,
        score: ageScore * 0.4 + importanceScore * 0.6
      };
    }).sort((a, b) => b.score - a.score);

    // Split by threshold
    const threshold = 0.3;
    const keep = scored.filter(s => s.score >= threshold).map(s => s.item);
    const summarize = scored.filter(s => s.score < threshold).map(s => s.item);

    // Ensure we don't exceed target
    let currentTokens = preserved.reduce((s, i) => s + i.tokenCount, 0);
    const finalKeep: ContextItem[] = [];
    const toSummarize: ContextItem[] = [...summarize];

    for (const item of keep) {
      if (currentTokens + item.tokenCount <= cfg.targetTokens) {
        finalKeep.push(item);
        currentTokens += item.tokenCount;
      } else {
        toSummarize.push(item);
      }
    }

    // Generate summary
    let summary: string | undefined;
    let summarized = 0;

    if (toSummarize.length >= cfg.minSummaryItems) {
      summary = this.generateSummary(toSummarize);
      summarized = toSummarize.length;
    }

    const items: ContextItem[] = [...preserved];

    if (summary) {
      items.push({
        id: this.generateItemId(),
        type: "system_message",
        content: `[Earlier in this conversation: ${summary}]`,
        timestamp: new Date().toISOString(),
        tokenCount: this.estimateTokens(summary) + TOKEN_ESTIMATES.SUMMARY_OVERHEAD,
        priority: "medium",
        preserveOnCompact: false,
        metadata: { summarized: true }
      });
    }

    // Sort by original order
    finalKeep.sort((a, b) => (a.metadata?.turnIndex ?? 0) - (b.metadata?.turnIndex ?? 0));
    items.push(...finalKeep);

    return {
      items,
      summary,
      removed: toSummarize.length - (summary ? 1 : 0),
      summarized
    };
  }

  /**
   * Generate summary of items
   */
  private generateSummary(items: ContextItem[]): string {
    // Extract key topics and actions
    const topics: string[] = [];
    const actions: string[] = [];

    for (const item of items) {
      if (item.type === "user_message") {
        // Extract user intents
        const content = item.content.toLowerCase();
        if (content.includes("calculate")) topics.push("calculations");
        if (content.includes("quote")) topics.push("quoting");
        if (content.includes("tool") || content.includes("machine")) topics.push("tooling/machines");
        if (content.includes("material")) topics.push("materials");
      } else if (item.type === "tool_call") {
        actions.push(item.metadata?.toolName || "tool execution");
      } else if (item.type === "assistant_response") {
        // Mark that we provided responses
        if (item.content.length > 100) {
          actions.push("detailed response provided");
        }
      }
    }

    // Deduplicate
    const uniqueTopics = [...new Set(topics)];
    const uniqueActions = [...new Set(actions)];

    // Build summary
    const parts: string[] = [];

    if (uniqueTopics.length > 0) {
      parts.push(`Discussed: ${uniqueTopics.join(", ")}`);
    }

    if (uniqueActions.length > 0) {
      parts.push(`Actions: ${uniqueActions.slice(0, 3).join(", ")}`);
    }

    if (parts.length === 0) {
      parts.push(`${items.length} prior exchanges`);
    }

    return parts.join(". ");
  }

  /**
   * Generate aggressive summary
   */
  private generateAggressiveSummary(items: ContextItem[]): string {
    if (items.length === 0) return "";

    const userMessages = items.filter(i => i.type === "user_message").length;
    const toolCalls = items.filter(i => i.type === "tool_call").length;

    return `${userMessages} user turns, ${toolCalls} tool calls`;
  }

  /**
   * Score item importance (0-1)
   */
  private scoreImportance(item: ContextItem): number {
    let score = 0.5;

    // Priority-based
    switch (item.priority) {
      case "critical": score = 1.0; break;
      case "high": score = 0.8; break;
      case "medium": score = 0.5; break;
      case "low": score = 0.3; break;
      case "ephemeral": score = 0.1; break;
    }

    // Type-based adjustments
    switch (item.type) {
      case "user_instruction": score = Math.max(score, 0.9); break;
      case "critical_fact": score = Math.max(score, 0.95); break;
      case "memory_anchor": score = 1.0; break;
      case "tool_result": score = Math.min(score, 0.6); break;
    }

    // Content-based adjustments
    if (item.metadata?.entities && item.metadata.entities.length > 0) {
      score = Math.min(1, score + 0.1);
    }

    return score;
  }

  /**
   * Infer priority from type and content
   */
  private inferPriority(type: ContextItemType, content: string): ContextPriority {
    if (type === "critical_fact" || type === "memory_anchor") {
      return "critical";
    }

    if (type === "user_instruction") {
      return "high";
    }

    const lower = content.toLowerCase();

    // Check for explicit importance markers
    if (lower.includes("important") || lower.includes("remember")) {
      return "high";
    }

    // Check for critical keywords
    if (lower.includes("safety") || lower.includes("danger") || lower.includes("critical")) {
      return "critical";
    }

    // Tool results are usually ephemeral
    if (type === "tool_result") {
      return "low";
    }

    return "medium";
  }

  /**
   * Estimate token count for content
   */
  estimateTokens(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }
    // Rough estimation: ~1.3 tokens per word for English
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words * TOKEN_ESTIMATES.AVERAGE_WORD);
  }

  /**
   * Get context statistics
   */
  getStats(context: ConversationContext): {
    totalItems: number;
    totalTokens: number;
    maxTokens: number;
    utilizationPercent: number;
    compactionCount: number;
    itemsByType: Record<ContextItemType, number>;
    criticalItems: number;
  } {
    const itemsByType: Record<string, number> = {};
    let criticalItems = 0;

    for (const item of context.items) {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      if (item.priority === "critical" || item.preserveOnCompact) {
        criticalItems++;
      }
    }

    return {
      totalItems: context.items.length,
      totalTokens: context.totalTokens,
      maxTokens: context.maxTokens,
      utilizationPercent: Math.round((context.totalTokens / context.maxTokens) * 100),
      compactionCount: context.compactionCount,
      itemsByType: itemsByType as Record<ContextItemType, number>,
      criticalItems
    };
  }

  /**
   * Extract critical facts from context
   */
  extractCriticalFacts(context: ConversationContext): string[] {
    return context.items
      .filter(item => item.priority === "critical" || item.type === "critical_fact")
      .map(item => item.content);
  }

  /**
   * Render context to string (for debugging/export)
   */
  renderContext(context: ConversationContext): string {
    const lines: string[] = [
      `Context ID: ${context.id}`,
      `Tokens: ${context.totalTokens}/${context.maxTokens}`,
      `Compactions: ${context.compactionCount}`,
      "---"
    ];

    for (const item of context.items) {
      const prefix = item.preserveOnCompact ? "[PRESERVE] " : "";
      const typeLabel = item.type.replace(/_/g, " ").toUpperCase();
      lines.push(`${prefix}[${typeLabel}] ${item.content.slice(0, 100)}${item.content.length > 100 ? "..." : ""}`);
    }

    return lines.join("\n");
  }

  // ============================================================================
  // ID GENERATION
  // ============================================================================

  private generateContextId(): string {
    return `ctx_${Date.now()}_${++this.contextCounter}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${++this.itemCounter}`;
  }
}

// Export singleton
export const contextCompactionEngine = new ContextCompactionEngine();
