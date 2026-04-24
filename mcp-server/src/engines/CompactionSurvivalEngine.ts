/**
 * CompactionSurvivalEngine
 *
 * Ensures critical context survives compaction by scoring and prioritizing
 * what information must be preserved in handoffs and summaries.
 *
 * Key insight: Not all context is equal. Task state > decisions > exploration.
 */

import { existsSync, mkdirSync } from "node:fs";
import { atomicWriteJson, safeReadJson, snapshotLastGood } from "../utils/atomicSessionWrite.js";

export type ContextType =
  | "task_state"      // Current task, what's in progress
  | "decision"        // Key decisions made, why
  | "file_edit"       // Files modified, what changed
  | "error_fix"       // Errors encountered and how fixed
  | "user_preference" // User preferences learned
  | "discovery"       // Things discovered about codebase
  | "exploration"     // General exploration (lowest priority)
  | "conversation";   // General conversation

export interface ContextItem {
  id: string;
  type: ContextType;
  content: string;
  timestamp: string;
  priority: number;      // 1-10, higher = more critical
  tokens: number;
  survivalScore: number; // Computed: priority * recency * importance
  references: string[];  // Files/engines referenced
}

export interface SurvivalPlan {
  mustPreserve: ContextItem[];
  shouldPreserve: ContextItem[];
  canDrop: ContextItem[];
  totalTokens: number;
  preservedTokens: number;
  compressionRatio: number;
}

interface State {
  items: ContextItem[];
  sessionId: string;
  compactionCount: number;
}

const STATE_DIR = "H:/prism/state/compaction-survival";
const getStateFile = (sessionId?: string) => {
  const id = sessionId || process.env.CLAUDE_SESSION_ID || "default";
  return `${STATE_DIR}/survival-${id}.json`;
};
const PRIORITY_WEIGHTS: Record<ContextType, number> = {
  task_state: 10,
  decision: 9,
  error_fix: 8,
  file_edit: 7,
  user_preference: 6,
  discovery: 4,
  exploration: 2,
  conversation: 1,
};
const MAX_ITEMS = 100;
const RECENCY_DECAY = 0.95; // Older items decay in importance

export class CompactionSurvivalEngine {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    const sessionId = process.env.CLAUDE_SESSION_ID || "default";
    const fallback: State = { items: [], sessionId, compactionCount: 0 };
    const stateFile = getStateFile(sessionId);
    const loaded = safeReadJson<State>(stateFile, fallback);
    // Snapshot a known-good copy right after successful load, so future
    // crashes mid-save can fall back to the last readable state.
    if (loaded !== fallback) snapshotLastGood(stateFile, loaded);
    return loaded;
  }

  private saveState(): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    const stateFile = getStateFile(this.state.sessionId);
    atomicWriteJson(stateFile, this.state);
  }

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  private generateId(): string {
    return `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private computeSurvivalScore(item: ContextItem): number {
    const basePriority = PRIORITY_WEIGHTS[item.type] || 1;
    const ageMs = Date.now() - new Date(item.timestamp).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const recencyFactor = Math.pow(RECENCY_DECAY, ageHours);
    const referenceFactor = 1 + (item.references.length * 0.1);

    return basePriority * recencyFactor * referenceFactor * (item.priority / 10);
  }

  /**
   * Record a context item for potential survival
   */
  record(
    type: ContextType,
    content: string,
    options: {
      priority?: number;
      references?: string[];
    } = {}
  ): ContextItem {
    const item: ContextItem = {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      priority: options.priority ?? PRIORITY_WEIGHTS[type],
      tokens: this.estimateTokens(content),
      survivalScore: 0,
      references: options.references ?? [],
    };

    item.survivalScore = this.computeSurvivalScore(item);
    this.state.items.push(item);

    // Prune if over limit
    if (this.state.items.length > MAX_ITEMS) {
      this.state.items = this.state.items
        .sort((a, b) => b.survivalScore - a.survivalScore)
        .slice(0, MAX_ITEMS);
    }

    this.saveState();
    return item;
  }

  /**
   * Generate a survival plan for upcoming compaction
   */
  planSurvival(targetTokens: number): SurvivalPlan {
    // Recompute all scores with current time
    for (const item of this.state.items) {
      item.survivalScore = this.computeSurvivalScore(item);
    }

    const sorted = [...this.state.items].sort((a, b) => b.survivalScore - a.survivalScore);

    const mustPreserve: ContextItem[] = [];
    const shouldPreserve: ContextItem[] = [];
    const canDrop: ContextItem[] = [];

    let usedTokens = 0;
    const mustPreserveThreshold = targetTokens * 0.6;
    const shouldPreserveThreshold = targetTokens * 0.9;

    for (const item of sorted) {
      if (usedTokens + item.tokens <= mustPreserveThreshold && item.survivalScore >= 5) {
        mustPreserve.push(item);
        usedTokens += item.tokens;
      } else if (usedTokens + item.tokens <= shouldPreserveThreshold && item.survivalScore >= 2) {
        shouldPreserve.push(item);
        usedTokens += item.tokens;
      } else {
        canDrop.push(item);
      }
    }

    const totalTokens = this.state.items.reduce((sum, i) => sum + i.tokens, 0);

    return {
      mustPreserve,
      shouldPreserve,
      canDrop,
      totalTokens,
      preservedTokens: usedTokens,
      compressionRatio: totalTokens > 0 ? usedTokens / totalTokens : 1,
    };
  }

  /**
   * Generate handoff content from survival plan
   */
  generateHandoff(targetTokens: number = 2000): string {
    const plan = this.planSurvival(targetTokens);
    const lines: string[] = [];

    lines.push("## Critical Context (Must Survive)");
    for (const item of plan.mustPreserve.slice(0, 10)) {
      lines.push(`- [${item.type}] ${item.content.slice(0, 200)}${item.content.length > 200 ? "..." : ""}`);
    }

    if (plan.shouldPreserve.length > 0) {
      lines.push("\n## Important Context");
      for (const item of plan.shouldPreserve.slice(0, 5)) {
        lines.push(`- [${item.type}] ${item.content.slice(0, 150)}${item.content.length > 150 ? "..." : ""}`);
      }
    }

    lines.push(`\n_Preserved ${plan.preservedTokens} of ${plan.totalTokens} tokens (${(plan.compressionRatio * 100).toFixed(0)}%)_`);

    return lines.join("\n");
  }

  /**
   * Mark compaction occurred, boost surviving items
   */
  markCompaction(): void {
    this.state.compactionCount++;
    // Items that survived compaction get priority boost
    for (const item of this.state.items) {
      item.priority = Math.min(10, item.priority + 0.5);
    }
    this.saveState();
  }

  /**
   * Get items by type
   */
  getByType(type: ContextType): ContextItem[] {
    return this.state.items
      .filter((i) => i.type === type)
      .sort((a, b) => b.survivalScore - a.survivalScore);
  }

  /**
   * Get stats about current context pool
   */
  getStats(): {
    totalItems: number;
    totalTokens: number;
    compactionCount: number;
    byType: Record<ContextType, number>;
    avgSurvivalScore: number;
  } {
    const byType: Record<string, number> = {};
    let totalScore = 0;

    for (const item of this.state.items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalScore += item.survivalScore;
    }

    return {
      totalItems: this.state.items.length,
      totalTokens: this.state.items.reduce((sum, i) => sum + i.tokens, 0),
      compactionCount: this.state.compactionCount,
      byType: byType as Record<ContextType, number>,
      avgSurvivalScore: this.state.items.length > 0 ? totalScore / this.state.items.length : 0,
    };
  }

  /**
   * Clear all context (for testing or reset)
   */
  reset(): void {
    this.state = {
      items: [],
      sessionId: `session_${Date.now()}`,
      compactionCount: 0,
    };
    this.saveState();
  }
}

export const compactionSurvivalEngine = new CompactionSurvivalEngine();
