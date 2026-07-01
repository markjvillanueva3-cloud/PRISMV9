/**
 * ContextWindowMapEngine - Maps context window contents
 *
 * Maintains a live inventory of what's consuming context space:
 * system prompts, file contents, tool outputs, conversation turns.
 * Provides visualization and identifies largest consumers.
 *
 * @version 1.0.0
 */

export type SegmentType =
  | "system"
  | "file"
  | "tool-output"
  | "conversation"
  | "memory"
  | "error"
  | "other";

export interface ContextSegment {
  id: string;
  type: SegmentType;
  label: string;
  tokens: number;
  addedAt: number;
  stale: boolean;
}

export interface ContextMap {
  segments: ContextSegment[];
  totalTokens: number;
  byType: Record<string, { count: number; tokens: number }>;
  largestSegments: ContextSegment[];
  staleTokens: number;
}

export class ContextWindowMapEngine {
  private segments: ContextSegment[] = [];
  private contextLimit: number;
  private staleThresholdMs: number;

  constructor(contextLimit = 200000, staleThresholdSeconds = 600) {
    this.contextLimit = contextLimit;
    this.staleThresholdMs = staleThresholdSeconds * 1000;
  }

  /**
   * Add a segment to the map.
   */
  add(type: SegmentType, label: string, tokens: number): string {
    const id = type + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    this.segments.push({
      id,
      type,
      label,
      tokens,
      addedAt: Date.now(),
      stale: false,
    });
    return id;
  }

  /**
   * Remove a segment.
   */
  remove(id: string): boolean {
    const idx = this.segments.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.segments.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Mark a segment as stale.
   */
  markStale(id: string): void {
    const seg = this.segments.find((s) => s.id === id);
    if (seg) seg.stale = true;
  }

  /**
   * Auto-detect stale segments based on age.
   */
  detectStale(): number {
    const now = Date.now();
    let count = 0;
    for (const seg of this.segments) {
      if (!seg.stale && now - seg.addedAt > this.staleThresholdMs) {
        seg.stale = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get the full context map.
   */
  map(): ContextMap {
    this.detectStale();
    const totalTokens = this.segments.reduce((s, seg) => s + seg.tokens, 0);

    const byType: Record<string, { count: number; tokens: number }> = {};
    for (const seg of this.segments) {
      const entry = byType[seg.type] ?? { count: 0, tokens: 0 };
      entry.count++;
      entry.tokens += seg.tokens;
      byType[seg.type] = entry;
    }

    const largestSegments = [...this.segments]
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    const staleTokens = this.segments
      .filter((s) => s.stale)
      .reduce((sum, s) => sum + s.tokens, 0);

    return { segments: this.segments, totalTokens, byType, largestSegments, staleTokens };
  }

  /**
   * Get utilization percentage.
   */
  utilization(): number {
    const total = this.segments.reduce((s, seg) => s + seg.tokens, 0);
    return Math.round((total / this.contextLimit) * 100);
  }

  /**
   * ASCII bar chart of context usage by type.
   */
  chart(): string {
    const m = this.map();
    const maxBar = 30;
    const lines: string[] = [];
    const entries = Object.entries(m.byType).sort((a, b) => b[1].tokens - a[1].tokens);

    for (const [type, data] of entries) {
      const ratio = m.totalTokens > 0 ? data.tokens / m.totalTokens : 0;
      const bar = "#".repeat(Math.round(ratio * maxBar));
      const pct = Math.round(ratio * 100);
      lines.push(
        type.padEnd(14) +
          " " +
          bar.padEnd(maxBar) +
          " " +
          pct +
          "% (" +
          data.tokens +
          " tok)",
      );
    }

    return lines.join("\n");
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    const m = this.map();
    return (
      "Context: " +
      m.totalTokens +
      "/" +
      this.contextLimit +
      " (" +
      this.utilization() +
      "%) | " +
      m.segments.length +
      " segments | " +
      m.staleTokens +
      " stale tokens"
    );
  }

  /**
   * Get reclaimable tokens (stale segments).
   */
  reclaimable(): { segments: ContextSegment[]; totalTokens: number } {
    const stale = this.segments.filter((s) => s.stale);
    return {
      segments: stale,
      totalTokens: stale.reduce((s, seg) => s + seg.tokens, 0),
    };
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.segments = [];
  }
}

export const contextWindowMapEngine = new ContextWindowMapEngine();
