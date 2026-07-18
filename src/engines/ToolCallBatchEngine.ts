/**
 * ToolCallBatchEngine — Tool call batching advisor
 *
 * Analyzes sequences of tool calls and recommends batching opportunities
 * to reduce round-trip overhead. Tracks call patterns and suggests
 * combining parallel-safe calls.
 *
 * Token savings: Reduces tool call overhead by identifying parallel opportunities.
 *
 * @version 1.0.0
 */

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface BatchOpportunity {
  calls: ToolCall[];
  reason: string;
  estimatedSaving: number; // tokens saved
}

// Tools that are always safe to run in parallel
const PARALLEL_SAFE = new Set([
  "Read", "Grep", "Glob", "WebSearch", "WebFetch",
  "ToolSearch", "Agent",
]);

// Tools that modify state — must be sequential
const SEQUENTIAL = new Set([
  "Write", "Edit", "Bash", "NotebookEdit",
]);

// Common multi-call patterns and their optimized alternatives
const PATTERNS: Array<{
  name: string;
  match: (calls: ToolCall[]) => ToolCall[] | null;
  suggestion: string;
  saving: number;
}> = [
  {
    name: "multiple-reads",
    match: (calls) => {
      const reads = calls.filter(c => c.tool === "Read");
      return reads.length >= 2 ? reads : null;
    },
    suggestion: "Issue all Read calls in a single parallel batch",
    saving: 200, // ~200 tokens overhead per extra sequential call
  },
  {
    name: "grep-then-read",
    match: (calls) => {
      for (let i = 0; i < calls.length - 1; i++) {
        if (calls[i].tool === "Grep" && calls[i + 1].tool === "Read") {
          const grepPath = String(calls[i].params.path || "");
          const readPath = String(calls[i + 1].params.file_path || "");
          if (grepPath && readPath && readPath.includes(grepPath)) {
            return [calls[i], calls[i + 1]];
          }
        }
      }
      return null;
    },
    suggestion: "Use Grep with content output_mode and context lines instead of Grep → Read",
    saving: 1500, // avoid full file read
  },
  {
    name: "multiple-globs",
    match: (calls) => {
      const globs = calls.filter(c => c.tool === "Glob");
      if (globs.length < 2) return null;
      const samePath = globs.every(g =>
        String(g.params.path || "") === String(globs[0].params.path || "")
      );
      return samePath ? globs : null;
    },
    suggestion: "Combine Glob patterns with brace expansion: **/*.{ts,tsx,js}",
    saving: 300,
  },
  {
    name: "read-then-grep-same",
    match: (calls) => {
      for (let i = 0; i < calls.length - 1; i++) {
        if (calls[i].tool === "Read" && calls[i + 1].tool === "Grep") {
          const readPath = String(calls[i].params.file_path || "");
          const grepPath = String(calls[i + 1].params.path || "");
          if (readPath && grepPath && readPath === grepPath) {
            return [calls[i], calls[i + 1]];
          }
        }
      }
      return null;
    },
    suggestion: "Already Read the file — search the content in context instead of Grep",
    saving: 500,
  },
  {
    name: "sequential-independent-reads",
    match: (calls) => {
      const sequential: ToolCall[] = [];
      for (let i = 0; i < calls.length - 1; i++) {
        if (PARALLEL_SAFE.has(calls[i].tool) && PARALLEL_SAFE.has(calls[i + 1].tool)) {
          if (calls[i + 1].timestamp - calls[i].timestamp < 2000) { // within 2s = likely sequential
            sequential.push(calls[i]);
            if (!sequential.includes(calls[i + 1])) sequential.push(calls[i + 1]);
          }
        }
      }
      return sequential.length >= 2 ? sequential : null;
    },
    suggestion: "These independent tool calls can run in parallel — issue them in a single batch",
    saving: 150 * 2, // ~150 tokens overhead per sequential roundtrip
  },
];

export class ToolCallBatchEngine {
  private history: ToolCall[] = [];
  private readonly maxHistory = 50;

  /**
   * Record a tool call.
   */
  record(tool: string, params: Record<string, unknown> = {}): void {
    this.history.push({ tool, params, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Analyze recent calls for batching opportunities.
   */
  analyze(windowSize = 10): BatchOpportunity[] {
    const recent = this.history.slice(-windowSize);
    const opportunities: BatchOpportunity[] = [];

    for (const pattern of PATTERNS) {
      const matched = pattern.match(recent);
      if (matched) {
        opportunities.push({
          calls: matched,
          reason: `${pattern.name}: ${pattern.suggestion}`,
          estimatedSaving: pattern.saving,
        });
      }
    }

    return opportunities;
  }

  /**
   * Check if a pending call can be batched with recent calls.
   */
  canBatch(tool: string): { batchable: boolean; with: string[] } {
    if (!PARALLEL_SAFE.has(tool)) {
      return { batchable: false, with: [] };
    }

    const recent = this.history.slice(-5);
    const pending = recent
      .filter(c => PARALLEL_SAFE.has(c.tool) && Date.now() - c.timestamp < 3000)
      .map(c => c.tool);

    return {
      batchable: pending.length > 0,
      with: [...new Set(pending)],
    };
  }

  /**
   * Get call frequency stats.
   */
  getStats(): { total: number; byTool: Record<string, number>; parallelRatio: number } {
    const byTool: Record<string, number> = {};
    let parallelSafe = 0;

    for (const call of this.history) {
      byTool[call.tool] = (byTool[call.tool] || 0) + 1;
      if (PARALLEL_SAFE.has(call.tool)) parallelSafe++;
    }

    return {
      total: this.history.length,
      byTool,
      parallelRatio: this.history.length > 0
        ? Math.round((parallelSafe / this.history.length) * 100)
        : 0,
    };
  }

  /**
   * Get a compact summary of optimization opportunities.
   */
  getSummary(): string {
    const opps = this.analyze();
    if (opps.length === 0) return "No batching opportunities in recent calls.";

    const totalSaving = opps.reduce((s, o) => s + o.estimatedSaving, 0);
    const lines = opps.map(o => `- ${o.reason} (~${o.estimatedSaving} tokens)`);
    return `${opps.length} batching opportunities (~${totalSaving} tokens saveable):\n${lines.join("\n")}`;
  }

  /**
   * Reset history.
   */
  reset(): void {
    this.history = [];
  }
}

export const toolCallBatchEngine = new ToolCallBatchEngine();
