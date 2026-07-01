/**
 * ToolCallDeduplicatorEngine — Deduplicates redundant tool calls
 *
 * Tracks recent tool calls and identifies exact or near duplicates.
 * Used by hooks to block repeated calls within a time window.
 *
 * Token savings: 100-2000 tokens per deduplicated call.
 *
 * @version 1.0.0
 */

export interface DeduplicateResult {
  isDuplicate: boolean;
  originalTimestamp?: number;
  age?: number; // seconds since original
  reason?: string;
}

interface CallRecord {
  tool: string;
  hash: string;
  timestamp: number;
  params: string;
}

export class ToolCallDeduplicatorEngine {
  private calls: CallRecord[] = [];
  private windowMs: number;
  private maxRecords: number;

  constructor(windowSeconds = 120, maxRecords = 200) {
    this.windowMs = windowSeconds * 1000;
    this.maxRecords = maxRecords;
  }

  /**
   * Check if a tool call is a duplicate.
   */
  check(tool: string, params: Record<string, unknown>): DeduplicateResult {
    const hash = this.hashCall(tool, params);
    const now = Date.now();

    // Clean old entries
    this.calls = this.calls.filter(c => now - c.timestamp < this.windowMs);

    // Find exact match
    const existing = this.calls.find(c => c.hash === hash);
    if (existing) {
      const age = Math.round((now - existing.timestamp) / 1000);
      return {
        isDuplicate: true,
        originalTimestamp: existing.timestamp,
        age,
        reason: `Exact duplicate of ${tool} call from ${age}s ago`,
      };
    }

    // Find near-duplicate (same tool + similar params)
    const nearMatch = this.calls.find(c =>
      c.tool === tool && this.similarity(c.params, JSON.stringify(params)) > 0.9
    );
    if (nearMatch) {
      const age = Math.round((now - nearMatch.timestamp) / 1000);
      return {
        isDuplicate: true,
        originalTimestamp: nearMatch.timestamp,
        age,
        reason: `Near-duplicate of ${tool} call from ${age}s ago (>90% similar)`,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Record a tool call (call after check to avoid self-dedup).
   */
  record(tool: string, params: Record<string, unknown>): void {
    const hash = this.hashCall(tool, params);
    this.calls.push({
      tool,
      hash,
      timestamp: Date.now(),
      params: JSON.stringify(params),
    });

    // Trim to max
    if (this.calls.length > this.maxRecords) {
      this.calls = this.calls.slice(-this.maxRecords);
    }
  }

  /**
   * Get dedup statistics.
   */
  stats(): { totalRecorded: number; uniqueTools: number; windowSeconds: number } {
    return {
      totalRecorded: this.calls.length,
      uniqueTools: new Set(this.calls.map(c => c.tool)).size,
      windowSeconds: this.windowMs / 1000,
    };
  }

  /**
   * Reset.
   */
  reset(): void {
    this.calls = [];
  }

  private hashCall(tool: string, params: Record<string, unknown>): string {
    const key = `${tool}:${JSON.stringify(params, Object.keys(params).sort())}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const chr = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString(36);
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;

    // For short strings, require exact match (short params differ meaningfully)
    if (maxLen < 50) return a === b ? 1 : 0;

    // Count matching characters at same position
    const minLen = Math.min(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matches++;
    }

    return matches / maxLen;
  }
}

export const toolCallDeduplicatorEngine = new ToolCallDeduplicatorEngine();
