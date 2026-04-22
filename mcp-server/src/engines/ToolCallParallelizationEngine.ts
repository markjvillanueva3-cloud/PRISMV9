/**
 * ToolCallParallelizationEngine
 *
 * Tracks sequences of tool calls and detects when independent calls
 * were made sequentially that could have been parallelized.
 *
 * Insight: CLAUDE.md mandates parallel calls for independent operations.
 * Each round-trip costs ~500-2000ms wall time + token overhead.
 * 8 sequential reads = 8 round-trips. 8 parallel reads = 1 round-trip.
 *
 * Detection rules:
 *   - Same tool repeated within window with no dependency = parallelizable
 *   - Independent reads of different files = parallelizable
 *   - Reads followed by edits OF THOSE FILES = sequential (correct)
 *   - Bash commands with shared cwd = parallelizable (independent)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

export type ToolName =
  | "Read"
  | "Write"
  | "Edit"
  | "Glob"
  | "Grep"
  | "Bash"
  | "PowerShell"
  | "Agent"
  | "WebFetch"
  | "WebSearch"
  | "Task"
  | "Other";

export interface ToolCall {
  id: string;
  tool: ToolName;
  timestamp: string;
  inputs: Record<string, any>;
  /** Files referenced by this call (for dependency tracking) */
  filesReferenced: string[];
  /** Was this call in a parallel batch (multiple in same message)? */
  inParallelBatch: boolean;
  /** Approximate token cost (output tokens consumed) */
  tokenCost: number;
}

export interface ParallelizationOpportunity {
  callIds: string[];
  tool: ToolName;
  reason: string;
  wastedRoundTrips: number;
  estimatedTokenWaste: number;
  estimatedTimeSavedMs: number;
}

export interface ParallelizationReport {
  totalCalls: number;
  parallelCalls: number;
  sequentialCalls: number;
  parallelizationRate: number;
  opportunities: ParallelizationOpportunity[];
  totalWastedRoundTrips: number;
  totalEstimatedTokenWaste: number;
  totalEstimatedTimeSavedMs: number;
  recommendations: string[];
}

interface State {
  sessionId: string;
  calls: ToolCall[];
  reports: ParallelizationReport[];
}

const STATE_DIR = "H:/prism/state/tool-call-parallelization";
const getStateFile = (sessionId?: string): string => {
  const id = sessionId || process.env.CLAUDE_SESSION_ID || "default";
  return `${STATE_DIR}/parallelization-${id}.json`;
};

const PARALLEL_WINDOW_MS = 1000;
const ROUND_TRIP_TOKEN_COST = 30;
const ROUND_TRIP_LATENCY_MS = 500;
const MAX_CALLS = 1000;

// Tools that are read-only and can almost always be parallelized
const READ_ONLY_TOOLS: Set<ToolName> = new Set(["Read", "Glob", "Grep", "WebFetch", "WebSearch"]);

// Tools that mutate state and need careful sequencing
const MUTATING_TOOLS: Set<ToolName> = new Set(["Write", "Edit", "Bash", "PowerShell"]);

export class ToolCallParallelizationEngine {
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
    return { sessionId, calls: [], reports: [] };
  }

  private saveState(): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    if (this.state.calls.length > MAX_CALLS) {
      this.state.calls = this.state.calls.slice(-MAX_CALLS);
    }
    writeFileSync(getStateFile(this.state.sessionId), JSON.stringify(this.state, null, 2));
  }

  private generateId(): string {
    return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /** Extract file references from tool inputs for dependency analysis */
  private extractFiles(tool: ToolName, inputs: Record<string, any>): string[] {
    const files: string[] = [];
    if (inputs.file_path) files.push(String(inputs.file_path));
    if (inputs.path) files.push(String(inputs.path));
    if (inputs.notebook_path) files.push(String(inputs.notebook_path));
    if (Array.isArray(inputs.paths)) {
      for (const p of inputs.paths) files.push(String(p));
    }
    return files;
  }

  /**
   * Record a tool call with metadata for later analysis.
   */
  recordCall(
    tool: ToolName,
    inputs: Record<string, any>,
    options: { inParallelBatch?: boolean; tokenCost?: number } = {}
  ): ToolCall {
    const call: ToolCall = {
      id: this.generateId(),
      tool,
      timestamp: new Date().toISOString(),
      inputs: { ...inputs },
      filesReferenced: this.extractFiles(tool, inputs),
      inParallelBatch: options.inParallelBatch ?? false,
      tokenCost: options.tokenCost ?? ROUND_TRIP_TOKEN_COST,
    };
    this.state.calls.push(call);
    this.saveState();
    return call;
  }

  /**
   * Determine if two calls have a data dependency.
   * If callB reads/edits a file that callA wrote/edited, they must be sequential.
   */
  private hasDependency(callA: ToolCall, callB: ToolCall): boolean {
    if (!MUTATING_TOOLS.has(callA.tool)) return false;
    const aFiles = new Set(callA.filesReferenced);
    for (const f of callB.filesReferenced) {
      if (aFiles.has(f)) return true;
    }
    return false;
  }

  /**
   * Check if a sequence of calls could have been a parallel batch.
   * Returns true if all calls are independent (no shared files, no mutating order).
   */
  private isParallelizable(calls: ToolCall[]): boolean {
    if (calls.length < 2) return false;
    // Check pairwise dependencies
    for (let i = 0; i < calls.length; i++) {
      for (let j = i + 1; j < calls.length; j++) {
        if (this.hasDependency(calls[i], calls[j])) return false;
        if (this.hasDependency(calls[j], calls[i])) return false;
      }
    }
    // All read-only = always parallelizable
    if (calls.every((c) => READ_ONLY_TOOLS.has(c.tool))) return true;
    // All same tool, no shared files = parallelizable
    const firstTool = calls[0].tool;
    if (calls.every((c) => c.tool === firstTool)) {
      const allFiles = calls.flatMap((c) => c.filesReferenced);
      const uniqueFiles = new Set(allFiles);
      return allFiles.length === uniqueFiles.size;
    }
    return false;
  }

  /**
   * Find clusters of sequential calls that should have been parallel.
   * A cluster is a contiguous run of single-call messages within a time window.
   */
  private findOpportunities(): ParallelizationOpportunity[] {
    const opportunities: ParallelizationOpportunity[] = [];
    const calls = this.state.calls;
    if (calls.length < 2) return opportunities;

    // Group consecutive non-parallel calls within window
    let cluster: ToolCall[] = [];
    let lastTimestamp = 0;

    const flushCluster = (): void => {
      if (cluster.length >= 2 && this.isParallelizable(cluster)) {
        const wasted = cluster.length - 1;
        opportunities.push({
          callIds: cluster.map((c) => c.id),
          tool: cluster[0].tool,
          reason: this.explainParallelizable(cluster),
          wastedRoundTrips: wasted,
          estimatedTokenWaste: wasted * ROUND_TRIP_TOKEN_COST,
          estimatedTimeSavedMs: wasted * ROUND_TRIP_LATENCY_MS,
        });
      }
      cluster = [];
    };

    for (const call of calls) {
      const ts = new Date(call.timestamp).getTime();
      if (call.inParallelBatch) {
        flushCluster();
        continue;
      }
      if (cluster.length === 0) {
        cluster.push(call);
        lastTimestamp = ts;
        continue;
      }
      // Within window AND compatible (PARALLEL_WINDOW_MS already in ms; previous *60 was a bug — flagged 60s window)
      const sameWindow = ts - lastTimestamp <= PARALLEL_WINDOW_MS;
      if (sameWindow && this.isParallelizable([...cluster, call])) {
        cluster.push(call);
        lastTimestamp = ts;
      } else {
        flushCluster();
        cluster = [call];
        lastTimestamp = ts;
      }
    }
    flushCluster();
    return opportunities;
  }

  private explainParallelizable(calls: ToolCall[]): string {
    if (calls.every((c) => READ_ONLY_TOOLS.has(c.tool))) {
      return `${calls.length} read-only ${calls[0].tool} calls with no shared dependencies`;
    }
    return `${calls.length} ${calls[0].tool} calls on independent files`;
  }

  /**
   * Generate a parallelization report for the current session.
   */
  analyze(): ParallelizationReport {
    const totalCalls = this.state.calls.length;
    const parallelCalls = this.state.calls.filter((c) => c.inParallelBatch).length;
    const sequentialCalls = totalCalls - parallelCalls;
    const opportunities = this.findOpportunities();

    const totalWastedRoundTrips = opportunities.reduce((sum, o) => sum + o.wastedRoundTrips, 0);
    const totalEstimatedTokenWaste = opportunities.reduce(
      (sum, o) => sum + o.estimatedTokenWaste,
      0
    );
    const totalEstimatedTimeSavedMs = opportunities.reduce(
      (sum, o) => sum + o.estimatedTimeSavedMs,
      0
    );

    const parallelizationRate = totalCalls > 0 ? parallelCalls / totalCalls : 1;

    const recommendations: string[] = [];
    if (parallelizationRate < 0.3 && totalCalls >= 5) {
      recommendations.push(
        `Only ${(parallelizationRate * 100).toFixed(0)}% of calls were parallel. Batch independent operations.`
      );
    }
    if (totalWastedRoundTrips >= 3) {
      recommendations.push(
        `${totalWastedRoundTrips} round-trips wasted on sequential calls. Consider parallel batches.`
      );
    }
    if (opportunities.length === 0 && totalCalls >= 5) {
      recommendations.push("Good parallelization discipline observed.");
    }

    const report: ParallelizationReport = {
      totalCalls,
      parallelCalls,
      sequentialCalls,
      parallelizationRate,
      opportunities,
      totalWastedRoundTrips,
      totalEstimatedTokenWaste,
      totalEstimatedTimeSavedMs,
      recommendations,
    };

    this.state.reports.push(report);
    if (this.state.reports.length > 50) {
      this.state.reports = this.state.reports.slice(-50);
    }
    this.saveState();
    return report;
  }

  /** Get raw call log */
  getCalls(): ToolCall[] {
    return [...this.state.calls];
  }

  /** Get historical reports */
  getReports(): ParallelizationReport[] {
    return [...this.state.reports];
  }

  /** Reset state (for testing or new session) */
  reset(): void {
    this.state = {
      sessionId: process.env.CLAUDE_SESSION_ID || "default",
      calls: [],
      reports: [],
    };
    this.saveState();
  }
}

export const toolCallParallelizationEngine = new ToolCallParallelizationEngine();
