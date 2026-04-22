/**
 * ConversationStaleDetectorEngine
 *
 * Identifies conversation segments that can be safely DROPPED before
 * compaction. Complements CompactionSurvivalEngine which scores what
 * to KEEP — this engine identifies what to drop with high confidence.
 *
 * Drop signals:
 *   - resolved_error: error was hit, then a fix was applied that worked
 *   - completed_task: task marked completed, no further references
 *   - abandoned_plan: plan created but superseded by a different approach
 *   - failed_exploration: exploration that did not yield useful info
 *   - duplicate_attempt: same operation tried multiple times with same result
 *   - stale_status_check: status check whose subject moved on
 *
 * Keep signals (override drop):
 *   - referenced_recently: still mentioned in last N items
 *   - linked_to_active_task: task in_progress depends on it
 *   - canonical_reference: contains a canonical decision or fact
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

export type SegmentType =
  | "user_message"
  | "assistant_response"
  | "tool_call"
  | "tool_result"
  | "system_reminder";

export type DropReason =
  | "resolved_error"
  | "completed_task"
  | "abandoned_plan"
  | "failed_exploration"
  | "duplicate_attempt"
  | "stale_status_check";

export type KeepReason =
  | "referenced_recently"
  | "linked_to_active_task"
  | "canonical_reference"
  | "user_preference";

export interface ConversationSegment {
  id: string;
  type: SegmentType;
  timestamp: string;
  /** First N chars used for keyword/identifier extraction */
  summary: string;
  /** Topics/identifiers extracted (file paths, error codes, task IDs, etc.) */
  topics: string[];
  tokens: number;
  /** Status this segment represents, if any */
  status?: "open" | "resolved" | "abandoned" | "completed";
  /** ID of segment this resolves/supersedes (if any) */
  resolves?: string;
}

export interface DropDecision {
  segmentId: string;
  drop: boolean;
  dropReasons: DropReason[];
  keepReasons: KeepReason[];
  confidence: number;  // 0..1
  estimatedTokensSaved: number;
}

export interface PruneReport {
  totalSegments: number;
  totalTokens: number;
  droppable: DropDecision[];
  protectedCount: number;
  estimatedTokensSaved: number;
  estimatedRetentionRate: number;
  recommendations: string[];
}

interface State {
  sessionId: string;
  segments: ConversationSegment[];
}

const STATE_DIR = "H:/prism/state/conversation-stale-detector";
const getStateFile = (sessionId?: string): string => {
  const id = sessionId || process.env.CLAUDE_SESSION_ID || "default";
  return `${STATE_DIR}/segments-${id}.json`;
};

const MAX_SEGMENTS = 500;
const RECENT_WINDOW = 20;
const MIN_DROP_CONFIDENCE = 0.6;

/** Patterns that mark a segment as canonical (must keep) */
const CANONICAL_PATTERNS: RegExp[] = [
  /\bdecision\b.*?(made|chose|picked)/i,
  /\bcanonical\b/i,
  /\bnever\b.*?(do|use|change)/i,
  /\bMUST\b|\bMANDATORY\b/i,
  /user (preference|wants|prefers|requires)/i,
];

/** Patterns indicating a successful resolution */
const RESOLUTION_PATTERNS: RegExp[] = [
  /\bfixed\b/i,
  /\bresolved\b/i,
  /\bworking now\b/i,
  /\ball tests pass\b/i,
  /\bsuccess(fully)?\b/i,
];

/** Patterns indicating a task completion */
const COMPLETION_PATTERNS: RegExp[] = [
  /\btask completed\b/i,
  /\bdone\b/i,
  /\bfinished\b/i,
  /✓|✅/,
];

/** Patterns indicating exploration with no payoff */
const FAILED_EXPLORATION_PATTERNS: RegExp[] = [
  /no.*matches found/i,
  /not found/i,
  /no.*results/i,
  /\b0 results\b/i,
];

export class ConversationStaleDetectorEngine {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    const sessionId = process.env.CLAUDE_SESSION_ID || "default";
    try {
      const file = getStateFile(sessionId);
      if (existsSync(file)) {
        return JSON.parse(readFileSync(file, "utf-8"));
      }
    } catch {
      // ignore
    }
    return { sessionId, segments: [] };
  }

  private saveState(): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    if (this.state.segments.length > MAX_SEGMENTS) {
      this.state.segments = this.state.segments.slice(-MAX_SEGMENTS);
    }
    writeFileSync(getStateFile(this.state.sessionId), JSON.stringify(this.state, null, 2));
  }

  private generateId(): string {
    return `seg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Extract identifiers from text: file paths, error codes, task IDs, function names */
  private extractTopics(text: string): string[] {
    const topics = new Set<string>();
    const filePathPattern = /[\w/.-]+\.(ts|js|mjs|md|json|py|tsx|jsx|sh|yml|yaml)/g;
    const errorPattern = /\b[A-Z]+[_-]?\d+\b|\bE\d+\b|\bERR_\w+\b/g;
    const taskPattern = /\bU-[A-Z]+\d+\b|\btask[#\s]?(\d+)\b|\bunit[#\s]?(\d+)\b/gi;
    const functionPattern = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\(/g;

    for (const m of text.matchAll(filePathPattern)) topics.add(m[0]);
    for (const m of text.matchAll(errorPattern)) topics.add(m[0]);
    for (const m of text.matchAll(taskPattern)) topics.add(m[0]);
    for (const m of text.matchAll(functionPattern)) topics.add(m[0].slice(0, -1));

    return [...topics];
  }

  /**
   * Record a conversation segment for stale-analysis.
   */
  recordSegment(
    type: SegmentType,
    text: string,
    options: {
      status?: ConversationSegment["status"];
      resolves?: string;
    } = {}
  ): ConversationSegment {
    const summary = text.slice(0, 200);
    const segment: ConversationSegment = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      summary,
      topics: this.extractTopics(text),
      tokens: this.estimateTokens(text),
      status: options.status,
      resolves: options.resolves,
    };
    this.state.segments.push(segment);
    this.saveState();
    return segment;
  }

  /** Check if any pattern matches the segment summary */
  private matches(patterns: RegExp[], text: string): boolean {
    for (const p of patterns) {
      if (p.test(text)) return true;
    }
    return false;
  }

  /** Check if topics from this segment are referenced in recent segments */
  private isReferencedRecently(segment: ConversationSegment, currentIdx: number): boolean {
    const recentSegments = this.state.segments.slice(
      Math.max(0, currentIdx + 1),
      currentIdx + 1 + RECENT_WINDOW
    );
    if (segment.topics.length === 0) return false;
    for (const recent of recentSegments) {
      for (const topic of segment.topics) {
        if (recent.topics.includes(topic)) return true;
      }
    }
    return false;
  }

  /** Check if a segment was explicitly resolved by a later segment */
  private wasResolved(segment: ConversationSegment): boolean {
    for (const other of this.state.segments) {
      if (other.resolves === segment.id) return true;
    }
    return false;
  }

  /**
   * Score a segment: should it be dropped before compaction?
   */
  private scoreSegment(segment: ConversationSegment, idx: number): DropDecision {
    const dropReasons: DropReason[] = [];
    const keepReasons: KeepReason[] = [];

    // Check drop signals
    if (segment.status === "resolved" || this.wasResolved(segment)) {
      dropReasons.push("resolved_error");
    }
    if (segment.status === "completed" || this.matches(COMPLETION_PATTERNS, segment.summary)) {
      dropReasons.push("completed_task");
    }
    if (segment.status === "abandoned") {
      dropReasons.push("abandoned_plan");
    }
    if (this.matches(FAILED_EXPLORATION_PATTERNS, segment.summary)) {
      dropReasons.push("failed_exploration");
    }
    if (this.matches(RESOLUTION_PATTERNS, segment.summary) && segment.type === "tool_result") {
      dropReasons.push("resolved_error");
    }
    // Detect duplicate attempts (same topics, same type, no status change)
    const similar = this.state.segments.filter(
      (s) =>
        s.id !== segment.id &&
        s.type === segment.type &&
        s.topics.length > 0 &&
        s.topics.every((t) => segment.topics.includes(t))
    );
    if (similar.length >= 2) {
      dropReasons.push("duplicate_attempt");
    }

    // Check keep signals
    if (this.matches(CANONICAL_PATTERNS, segment.summary)) {
      keepReasons.push("canonical_reference");
    }
    if (this.isReferencedRecently(segment, idx)) {
      keepReasons.push("referenced_recently");
    }
    if (segment.status === "open") {
      keepReasons.push("linked_to_active_task");
    }

    // Confidence calculation
    const dropWeight = dropReasons.length;
    const keepWeight = keepReasons.length * 1.5; // keep signals weighted higher
    const total = dropWeight + keepWeight;
    let confidence = total > 0 ? dropWeight / total : 0;

    // Hard rule: any keep_reason at high confidence overrides drop
    if (keepReasons.includes("canonical_reference")) {
      confidence = 0;
    }

    const drop = confidence >= MIN_DROP_CONFIDENCE && keepReasons.length === 0;

    return {
      segmentId: segment.id,
      drop,
      dropReasons,
      keepReasons,
      confidence,
      estimatedTokensSaved: drop ? segment.tokens : 0,
    };
  }

  /**
   * Generate prune report identifying droppable segments.
   */
  prune(): PruneReport {
    const decisions: DropDecision[] = [];
    let totalTokens = 0;
    for (let i = 0; i < this.state.segments.length; i++) {
      const segment = this.state.segments[i];
      totalTokens += segment.tokens;
      decisions.push(this.scoreSegment(segment, i));
    }

    const droppable = decisions.filter((d) => d.drop);
    const protectedCount = decisions.filter((d) => d.keepReasons.length > 0).length;
    const estimatedTokensSaved = droppable.reduce((s, d) => s + d.estimatedTokensSaved, 0);
    const estimatedRetentionRate =
      totalTokens > 0 ? (totalTokens - estimatedTokensSaved) / totalTokens : 1;

    const recommendations: string[] = [];
    if (droppable.length >= 5) {
      recommendations.push(
        `${droppable.length} segments safe to drop, freeing ~${estimatedTokensSaved} tokens.`
      );
    }
    if (estimatedTokensSaved >= 2000) {
      recommendations.push(
        `Significant savings available: ${estimatedTokensSaved} tokens from stale content.`
      );
    }
    if (droppable.length === 0 && this.state.segments.length >= 10) {
      recommendations.push("No clearly stale segments — compaction will need lossy summary.");
    }

    return {
      totalSegments: this.state.segments.length,
      totalTokens,
      droppable,
      protectedCount,
      estimatedTokensSaved,
      estimatedRetentionRate,
      recommendations,
    };
  }

  /** Mark a segment's status (e.g., to mark a task done) */
  markStatus(segmentId: string, status: ConversationSegment["status"]): boolean {
    const seg = this.state.segments.find((s) => s.id === segmentId);
    if (!seg) return false;
    seg.status = status;
    this.saveState();
    return true;
  }

  /** Reset state */
  reset(): void {
    this.state = {
      sessionId: process.env.CLAUDE_SESSION_ID || "default",
      segments: [],
    };
    this.saveState();
  }

  /** Get raw segments */
  getSegments(): ConversationSegment[] {
    return [...this.state.segments];
  }
}

export const conversationStaleDetectorEngine = new ConversationStaleDetectorEngine();
