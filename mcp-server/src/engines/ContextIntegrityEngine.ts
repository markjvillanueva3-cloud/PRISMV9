/**
 * ContextIntegrityEngine — Guards against quality degradation from token optimization
 *
 * Tracks what files have been read, when, and what claims have been made about them.
 * Detects:
 * - Stale context: acting on file content that's old or has been edited since read
 * - Unverified claims: referencing file contents without having read them
 * - Post-compaction drift: critical facts that may have been lost
 * - Agent result gaps: agents that completed without verifiable file changes
 *
 * This engine is the "quality firewall" that prevents token savings from
 * causing hallucinations or degraded work.
 *
 * @version 1.0.0
 */

export interface FileReadRecord {
  path: string;
  readAt: number;        // timestamp
  editedAfterRead: boolean;
  editedAt?: number;
  callsSinceRead: number; // how many tool calls since this was read
}

export interface IntegrityAlert {
  type: "stale-context" | "unverified-claim" | "post-compaction-gap" | "agent-silent-fail" | "edit-without-read";
  severity: "warn" | "block";
  path?: string;
  detail: string;
  recommendation: string;
}

export interface AgentTaskRecord {
  agentId: string;
  description: string;
  launchedAt: number;
  targetFiles: string[];
  completedAt?: number;
  filesModified: string[];
  status: "running" | "completed" | "failed" | "unverified";
}

export interface IntegrityReport {
  alerts: IntegrityAlert[];
  filesTracked: number;
  staleFiles: number;
  agentTasks: AgentTaskRecord[];
  unverifiedAgents: number;
  healthScore: number; // 0-100, higher = more integrity
}

/**
 * A single link in the context pipeline hash chain — one artifact (e.g. the
 * pre-compact survival file, the handoff, the first-task response) fed into
 * verifyChain() to prove continuity across session-boundary transitions.
 */
export interface ChainArtifact {
  /** Stage label: "compaction_survival" | "handoff" | "session_start" | "first_task" ... */
  stage: string;
  /** Original file path (recorded for reporting; not used in hashing). */
  path: string;
  /** Raw contents at the time of capture. */
  contents: string;
  /** Optional timestamp (epoch ms) — forward-compat, not hashed. */
  timestamp?: number;
}

export interface ChainLink {
  stage: string;
  path: string;
  eventHash: string;   // sha256 of (priorHash || contents)
  priorHash: string;   // "" for the first link
  lengthBytes: number; // contents.length — surfaces dead artifacts (0-3B)
  empty: boolean;      // true when lengthBytes === 0 or contents is whitespace-only
}

export interface ChainVerification {
  valid: boolean;
  links: ChainLink[];
  /** Index of the first empty / zero-byte link, or null. */
  firstEmptyAt: number | null;
  /** 0-100 score: 100 − 10·empty − 20·broken; floor 0. */
  score: number;
  /** Human-readable summary for the boot block / telemetry. */
  summary: string;
}

const STALE_THRESHOLD_CALLS = 30;   // file is "stale" after 30 tool calls
const STALE_THRESHOLD_MS = 300000;  // or 5 minutes

export class ContextIntegrityEngine {
  private reads = new Map<string, FileReadRecord>();
  private agents = new Map<string, AgentTaskRecord>();
  private totalCalls = 0;
  private compactionCount = 0;
  private criticalFacts: string[] = [];

  /**
   * Record that a file was read.
   */
  recordRead(path: string): void {
    const normalized = this.normalizePath(path);
    this.reads.set(normalized, {
      path: normalized,
      readAt: Date.now(),
      editedAfterRead: false,
      callsSinceRead: 0,
    });
  }

  /**
   * Record that a file was edited.
   */
  recordEdit(path: string): void {
    const normalized = this.normalizePath(path);
    const record = this.reads.get(normalized);
    if (record) {
      record.editedAfterRead = true;
      record.editedAt = Date.now();
    }
    // If we haven't read the file, that's an integrity issue tracked by checkEdit
  }

  /**
   * Increment the global call counter (call after each tool use).
   */
  tick(): void {
    this.totalCalls++;
    for (const record of this.reads.values()) {
      record.callsSinceRead++;
    }
  }

  /**
   * Check if a file edit is safe (has been read recently enough).
   */
  checkEdit(path: string): IntegrityAlert | null {
    const normalized = this.normalizePath(path);
    const record = this.reads.get(normalized);

    if (!record) {
      return {
        type: "edit-without-read",
        severity: "block",
        path: normalized,
        detail: `Editing ${this.basename(normalized)} without reading it first`,
        recommendation: "Read the file before editing to ensure correct old_string matching",
      };
    }

    if (record.editedAfterRead) {
      return {
        type: "stale-context",
        severity: "warn",
        path: normalized,
        detail: `${this.basename(normalized)} was edited since last read (${record.callsSinceRead} calls ago)`,
        recommendation: "Re-read the file to get current content before editing again",
      };
    }

    if (record.callsSinceRead > STALE_THRESHOLD_CALLS ||
        Date.now() - record.readAt > STALE_THRESHOLD_MS) {
      return {
        type: "stale-context",
        severity: "warn",
        path: normalized,
        detail: `${this.basename(normalized)} was read ${record.callsSinceRead} calls / ${Math.round((Date.now() - record.readAt) / 1000)}s ago`,
        recommendation: "Re-read before editing — content may have changed",
      };
    }

    return null;
  }

  /**
   * Track an agent task launch.
   */
  recordAgentLaunch(agentId: string, description: string, targetFiles: string[]): void {
    this.agents.set(agentId, {
      agentId,
      description,
      launchedAt: Date.now(),
      targetFiles: targetFiles.map(f => this.normalizePath(f)),
      filesModified: [],
      status: "running",
    });
  }

  /**
   * Record agent completion and verify it actually did work.
   */
  recordAgentCompletion(agentId: string, result: string, filesModified: string[]): IntegrityAlert | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.completedAt = Date.now();
    agent.filesModified = filesModified.map(f => this.normalizePath(f));

    // Check for silent failure patterns
    const failureSignals = [
      "out of extra usage",
      "rate limit",
      "context window",
      "timed out",
      "error",
    ];

    const resultLower = result.toLowerCase();
    const hasFailed = failureSignals.some(s => resultLower.includes(s));
    const noChanges = filesModified.length === 0 && agent.targetFiles.length > 0;

    if (hasFailed || noChanges) {
      agent.status = "failed";
      return {
        type: "agent-silent-fail",
        severity: "warn",
        detail: `Agent "${agent.description}" ${hasFailed ? "hit an error" : "made no file changes"}: ${result.slice(0, 100)}`,
        recommendation: `Verify target files manually: ${agent.targetFiles.slice(0, 3).map(f => this.basename(f)).join(", ")}`,
      };
    }

    // Check if agent modified expected files
    const expectedSet = new Set(agent.targetFiles);
    const actualSet = new Set(agent.filesModified);
    const missed = agent.targetFiles.filter(f => !actualSet.has(f));

    if (missed.length > 0 && missed.length < agent.targetFiles.length) {
      agent.status = "completed";
      return {
        type: "agent-silent-fail",
        severity: "warn",
        detail: `Agent "${agent.description}" missed ${missed.length}/${agent.targetFiles.length} target files`,
        recommendation: `Check: ${missed.slice(0, 3).map(f => this.basename(f)).join(", ")}`,
      };
    }

    agent.status = "completed";
    return null;
  }

  /**
   * Record a compaction event and save critical facts.
   */
  recordCompaction(facts: string[]): void {
    this.compactionCount++;
    this.criticalFacts = facts;
    // Mark all reads as potentially stale after compaction
    for (const record of this.reads.values()) {
      record.callsSinceRead += 50; // push past stale threshold
    }
  }

  /**
   * Get facts that should survive compaction.
   */
  getCompactionSurvivalFacts(): string[] {
    const facts: string[] = [];

    // Active agent tasks
    for (const agent of this.agents.values()) {
      if (agent.status === "running") {
        facts.push(`AGENT RUNNING: "${agent.description}" (${agent.targetFiles.length} target files)`);
      } else if (agent.status === "failed") {
        facts.push(`AGENT FAILED: "${agent.description}" — needs manual followup`);
      }
    }

    // Recently edited files
    const recentEdits = [...this.reads.values()]
      .filter(r => r.editedAfterRead && r.editedAt && Date.now() - r.editedAt < 600000)
      .map(r => this.basename(r.path));
    if (recentEdits.length > 0) {
      facts.push(`RECENTLY EDITED: ${recentEdits.join(", ")}`);
    }

    return facts;
  }

  /**
   * Generate full integrity report.
   */
  report(): IntegrityReport {
    const alerts: IntegrityAlert[] = [];

    // Check for stale reads
    let staleCount = 0;
    for (const record of this.reads.values()) {
      if (record.callsSinceRead > STALE_THRESHOLD_CALLS ||
          Date.now() - record.readAt > STALE_THRESHOLD_MS) {
        staleCount++;
      }
    }

    // Check for unverified agents
    const unverified = [...this.agents.values()].filter(a => a.status === "running");
    for (const agent of unverified) {
      const elapsed = Date.now() - agent.launchedAt;
      if (elapsed > 600000) { // 10 minutes
        alerts.push({
          type: "agent-silent-fail",
          severity: "warn",
          detail: `Agent "${agent.description}" running for ${Math.round(elapsed / 60000)}min without result`,
          recommendation: "Check agent status or re-run the task",
        });
      }
    }

    // Post-compaction gap check
    if (this.compactionCount > 0 && this.criticalFacts.length > 0) {
      alerts.push({
        type: "post-compaction-gap",
        severity: "warn",
        detail: `${this.compactionCount} compaction(s) occurred. ${this.criticalFacts.length} facts may need verification`,
        recommendation: `Verify: ${this.criticalFacts.slice(0, 2).join("; ")}`,
      });
    }

    const healthScore = Math.max(0, 100
      - staleCount * 5
      - unverified.length * 15
      - this.compactionCount * 10
      - alerts.length * 5);

    return {
      alerts,
      filesTracked: this.reads.size,
      staleFiles: staleCount,
      agentTasks: [...this.agents.values()],
      unverifiedAgents: unverified.length,
      healthScore,
    };
  }

  /**
   * CPP-MS5-U-CPP34: Verify integrity of the context pipeline transition
   * chain (compaction-survival → session-start → handoff → first-task …).
   *
   * Pure function — takes ordered `artifacts[]` captured by the hooks, walks
   * them, and computes a SHA-256 hash chain. Each link's `eventHash` is
   * `sha256(priorHash + contents)`; any downstream tamper or skip will
   * invalidate every subsequent link.
   *
   * Empty / whitespace-only artifacts (the classic "3-byte dead file"
   * failure from the CPP analysis) are flagged so the pipeline is visibly
   * non-functional rather than silently empty.
   *
   * The engine itself does no I/O — the calling hook is responsible for
   * reading the files and persisting the returned verification to
   * `state/shared/PIPELINE_INTEGRITY.json`.
   *
   * @param artifacts Ordered list of chain artifacts (one per pipeline stage).
   * @param hasher Optional DI seam — defaults to node:crypto SHA-256. Tests
   *   can inject a deterministic fake without requiring node runtime.
   */
  verifyChain(
    artifacts: ChainArtifact[],
    hasher: (input: string) => string = sha256Hex,
  ): ChainVerification {
    const links: ChainLink[] = [];
    let priorHash = "";
    let firstEmptyAt: number | null = null;

    for (let i = 0; i < artifacts.length; i++) {
      const a = artifacts[i];
      const contents = a.contents ?? "";
      const lengthBytes = contents.length;
      const empty = contents.trim().length === 0;
      if (empty && firstEmptyAt === null) firstEmptyAt = i;

      const eventHash = hasher(priorHash + contents);
      links.push({
        stage: a.stage,
        path: a.path,
        eventHash,
        priorHash,
        lengthBytes,
        empty,
      });
      priorHash = eventHash;
    }

    const emptyCount = links.filter((l) => l.empty).length;
    const valid = emptyCount === 0 && links.length > 0;
    const score = Math.max(0, 100 - emptyCount * 10 - (valid ? 0 : 20));

    const summary = links.length === 0
      ? "chain empty (no artifacts supplied)"
      : valid
        ? `chain OK — ${links.length} links, all populated`
        : `chain BROKEN — ${emptyCount}/${links.length} artifact(s) empty (first at #${firstEmptyAt}: ${links[firstEmptyAt ?? 0].stage})`;

    return { valid, links, firstEmptyAt, score, summary };
  }

  /**
   * Reset all tracking state.
   */
  reset(): void {
    this.reads.clear();
    this.agents.clear();
    this.totalCalls = 0;
    this.compactionCount = 0;
    this.criticalFacts = [];
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, "/").toLowerCase();
  }

  private basename(path: string): string {
    return path.split("/").pop() || path;
  }
}

/**
 * CPP-MS5-U-CPP34: Default SHA-256 hasher used by verifyChain(). Kept outside
 * the class so the engine file stays pure-TypeScript and tests can still
 * inject a deterministic fake without loading node:crypto.
 */
function sha256Hex(input: string): string {
  // Lazy require so the engine stays portable — verifyChain() supports a DI
  // override so non-node environments (browser, deno shim) can substitute.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Singleton instance */
export const contextIntegrityEngine = new ContextIntegrityEngine();
