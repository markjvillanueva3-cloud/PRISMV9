/**
 * ContextInventoryEngine — Inventories what's currently in context
 *
 * Tracks what information has been loaded into the conversation context
 * (files read, searches done, decisions made) to prevent duplicate
 * loading and enable smart context management.
 *
 * Token savings: 500-5000 tokens per session by preventing re-reads
 * and enabling context-aware tool decisions.
 *
 * @version 1.0.0
 */

export type ContextEntryType = "file" | "search" | "decision" | "fact" | "schema" | "config";

export interface ContextEntry {
  type: ContextEntryType;
  key: string;
  summary: string;
  tokens: number;
  timestamp: number;
  stale: boolean;
}

export class ContextInventoryEngine {
  private entries = new Map<string, ContextEntry>();

  /**
   * Register content in context.
   */
  add(type: ContextEntryType, key: string, summary: string, tokens: number): void {
    this.entries.set(key, {
      type,
      key,
      summary,
      tokens,
      timestamp: Date.now(),
      stale: false,
    });
  }

  /**
   * Check if content is already in context.
   */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Get a context entry.
   */
  get(key: string): ContextEntry | undefined {
    return this.entries.get(key);
  }

  /**
   * Mark an entry as stale (e.g., file was edited elsewhere).
   */
  markStale(key: string): void {
    const entry = this.entries.get(key);
    if (entry) entry.stale = true;
  }

  /**
   * Remove an entry.
   */
  remove(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Get total tokens in context.
   */
  totalTokens(): number {
    return [...this.entries.values()].reduce((s, e) => s + e.tokens, 0);
  }

  /**
   * Get entries by type.
   */
  byType(type: ContextEntryType): ContextEntry[] {
    return [...this.entries.values()].filter(e => e.type === type);
  }

  /**
   * Get stale entries that should be refreshed or removed.
   */
  staleEntries(): ContextEntry[] {
    return [...this.entries.values()].filter(e => e.stale);
  }

  /**
   * Find entries matching a search term.
   */
  search(term: string): ContextEntry[] {
    const lower = term.toLowerCase();
    return [...this.entries.values()].filter(
      e => e.key.toLowerCase().includes(lower) || e.summary.toLowerCase().includes(lower)
    );
  }

  /**
   * Get full inventory summary.
   */
  summary(): string {
    const byType = new Map<ContextEntryType, { count: number; tokens: number }>();
    for (const entry of this.entries.values()) {
      const existing = byType.get(entry.type) || { count: 0, tokens: 0 };
      existing.count++;
      existing.tokens += entry.tokens;
      byType.set(entry.type, existing);
    }

    const lines = [`Context: ${this.entries.size} entries, ~${Math.round(this.totalTokens() / 1000)}K tokens`];
    for (const [type, { count, tokens }] of byType) {
      lines.push(`  ${type}: ${count} (${Math.round(tokens / 1000)}K)`);
    }

    const stale = this.staleEntries();
    if (stale.length > 0) {
      lines.push(`  Stale: ${stale.length} entries (refresh recommended)`);
    }

    return lines.join("\n");
  }

  /**
   * One-liner.
   */
  oneLiner(): string {
    const stale = this.staleEntries().length;
    return `${this.entries.size} items ~${Math.round(this.totalTokens() / 1000)}K${stale > 0 ? ` (${stale} stale)` : ""}`;
  }

  /**
   * Reset.
   */
  reset(): void {
    this.entries.clear();
  }
}

export const contextInventoryEngine = new ContextInventoryEngine();
