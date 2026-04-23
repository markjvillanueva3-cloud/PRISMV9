/**
 * ContextCheckpointEngine — AI-MAX-ROADMAP U-AIMAX08
 * ====================================================
 *
 * Automatic session-state checkpointing at edit-count thresholds
 * with 95%+ recovery after compaction.
 *
 * Problem:
 *   Claude sessions lose fidelity across /compact and crashes. A
 *   handoff file captures the next-action directive but not the
 *   full in-flight state (open tasks, pending files, decisions
 *   made this session). When compaction lands mid-work, re-
 *   establishing the mental model costs a full round of file reads
 *   and grep.
 *
 * Solution:
 *   Write a compact JSON snapshot of session state at 15, 25, 35
 *   edit thresholds (and any custom set). On session-resume (or
 *   post-compact), load the most recent checkpoint and restore.
 *   Each checkpoint < 1MB by hard schema-level size cap.
 *
 * Integration:
 *   * recordEdit() called by PostToolUse(Write|Edit) hook.
 *   * createCheckpoint() triggered automatically at threshold.
 *   * recoverState() called by SessionStart hook / PostCompact.
 *
 * Schema v1:
 *   {
 *     schemaVersion: 1,
 *     sessionId, checkpointId, editCount, createdAt,
 *     summary,          // short text
 *     pendingTasks,     // ["Task #17: ..."]
 *     filesInFlight,    // {path, role, status}
 *     recentDecisions,  // ["chose CP-SAT-style solver", ...]
 *     memoryAnchors,    // ["key=value", ...]
 *     handoffDirective, // next-action one-liner
 *   }
 *
 * Recovery score:
 *   recover(current): number in [0,1] = fraction of schema-required
 *   fields non-empty after load. ≥ 0.95 = pass.
 *
 * Hard caps:
 *   * MAX_CHECKPOINT_BYTES = 1 MB. serializer throws if exceeded.
 *   * MAX_CHECKPOINTS_PER_SESSION = 10 (pruned FIFO).
 *
 * @module engines/ContextCheckpointEngine
 * @version 1.0.0
 */

// ================================================================
// TYPES
// ================================================================

export const CONTEXT_CHECKPOINT_SCHEMA_VERSION = 1;

export const DEFAULT_EDIT_THRESHOLDS = [15, 25, 35] as const;
export const MAX_CHECKPOINT_BYTES = 1_048_576; // 1 MB hard cap
export const MAX_CHECKPOINTS_PER_SESSION = 10;

export interface FileInFlight {
  path: string;
  role: "reading" | "editing" | "created" | "deleted";
  status: "in_progress" | "saved" | "abandoned";
}

export interface CheckpointSnapshot {
  schemaVersion: number;
  sessionId: string;
  checkpointId: string;
  editCount: number;
  createdAt: string;
  summary: string;
  pendingTasks: string[];
  filesInFlight: FileInFlight[];
  recentDecisions: string[];
  memoryAnchors: string[];
  handoffDirective: string;
}

export interface RecoveryResult {
  snapshot: CheckpointSnapshot;
  /** Score in [0,1] — fraction of required fields non-empty. */
  fidelity: number;
  /** Names of required fields that were empty or missing. */
  missingFields: string[];
  /** True if fidelity >= 0.95 threshold. */
  passed: boolean;
}

export interface CheckpointConfig {
  thresholds: number[];
  maxBytes: number;
  maxCheckpointsPerSession: number;
  clockMs: () => number;
}

export const DEFAULT_CONFIG: CheckpointConfig = {
  thresholds: [...DEFAULT_EDIT_THRESHOLDS],
  maxBytes: MAX_CHECKPOINT_BYTES,
  maxCheckpointsPerSession: MAX_CHECKPOINTS_PER_SESSION,
  clockMs: () => Date.now(),
};

export interface SessionEditState {
  sessionId: string;
  editCount: number;
  lastThresholdFired: number;
}

// ================================================================
// ENGINE
// ================================================================

class ContextCheckpointEngineImpl {
  private config: CheckpointConfig = { ...DEFAULT_CONFIG };
  /** In-memory checkpoint store keyed by (sessionId → checkpoints[]). */
  private store = new Map<string, CheckpointSnapshot[]>();
  /** Edit counters per session. */
  private edits = new Map<string, SessionEditState>();

  setConfig(patch: Partial<CheckpointConfig>): CheckpointConfig {
    const merged = { ...this.config, ...patch };
    if (merged.thresholds.length === 0) {
      throw new Error("thresholds must be non-empty");
    }
    for (const t of merged.thresholds) {
      if (!Number.isInteger(t) || t < 1) {
        throw new Error(`threshold ${t} must be positive integer`);
      }
    }
    // Must be ascending
    for (let i = 1; i < merged.thresholds.length; i += 1) {
      if (merged.thresholds[i] <= merged.thresholds[i - 1]) {
        throw new Error("thresholds must be strictly ascending");
      }
    }
    if (merged.maxBytes < 1024) {
      throw new Error("maxBytes must be >= 1024");
    }
    if (
      !Number.isInteger(merged.maxCheckpointsPerSession) ||
      merged.maxCheckpointsPerSession < 1
    ) {
      throw new Error("maxCheckpointsPerSession must be positive integer");
    }
    this.config = merged;
    return { ...this.config };
  }

  getConfig(): CheckpointConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------
  // Edit tracking + threshold detection
  // --------------------------------------------------------------

  /** Increment the edit counter for a session. */
  recordEdit(sessionId: string): SessionEditState {
    if (!sessionId) throw new Error("sessionId required");
    const cur = this.edits.get(sessionId) ?? {
      sessionId,
      editCount: 0,
      lastThresholdFired: 0,
    };
    cur.editCount += 1;
    this.edits.set(sessionId, cur);
    return { ...cur };
  }

  /**
   * Is it time to create a checkpoint? Returns the highest unfired
   * threshold reached, or null if none.
   */
  shouldCheckpoint(sessionId: string): number | null {
    const state = this.edits.get(sessionId);
    if (!state) return null;
    let fired: number | null = null;
    for (const t of this.config.thresholds) {
      if (state.editCount >= t && t > state.lastThresholdFired) {
        fired = t;
      }
    }
    return fired;
  }

  getEditState(sessionId: string): SessionEditState | null {
    const s = this.edits.get(sessionId);
    return s ? { ...s } : null;
  }

  // --------------------------------------------------------------
  // Checkpoint create + retrieve
  // --------------------------------------------------------------

  createCheckpoint(input: {
    sessionId: string;
    summary: string;
    pendingTasks?: string[];
    filesInFlight?: FileInFlight[];
    recentDecisions?: string[];
    memoryAnchors?: string[];
    handoffDirective: string;
  }): CheckpointSnapshot {
    if (!input.sessionId) throw new Error("sessionId required");
    if (typeof input.summary !== "string") {
      throw new Error("summary must be string");
    }
    if (typeof input.handoffDirective !== "string") {
      throw new Error("handoffDirective must be string");
    }

    const state = this.edits.get(input.sessionId) ?? {
      sessionId: input.sessionId,
      editCount: 0,
      lastThresholdFired: 0,
    };

    const checkpointId = `${input.sessionId}-${state.editCount}-${this.config.clockMs()}`;
    const snapshot: CheckpointSnapshot = {
      schemaVersion: CONTEXT_CHECKPOINT_SCHEMA_VERSION,
      sessionId: input.sessionId,
      checkpointId,
      editCount: state.editCount,
      createdAt: new Date(this.config.clockMs()).toISOString(),
      summary: input.summary,
      pendingTasks: input.pendingTasks ?? [],
      filesInFlight: input.filesInFlight ?? [],
      recentDecisions: input.recentDecisions ?? [],
      memoryAnchors: input.memoryAnchors ?? [],
      handoffDirective: input.handoffDirective,
    };

    // Size cap
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > this.config.maxBytes) {
      throw new Error(
        `checkpoint too large: ${serialized.length} > ${this.config.maxBytes} bytes`,
      );
    }

    // Persist + prune
    const list = this.store.get(input.sessionId) ?? [];
    list.push(snapshot);
    if (list.length > this.config.maxCheckpointsPerSession) {
      list.splice(0, list.length - this.config.maxCheckpointsPerSession);
    }
    this.store.set(input.sessionId, list);

    // Update threshold-fired marker so we don't re-fire at the
    // same threshold.
    const threshold = this.shouldCheckpoint(input.sessionId);
    if (threshold !== null) {
      state.lastThresholdFired = threshold;
      this.edits.set(input.sessionId, state);
    }

    return { ...snapshot, filesInFlight: snapshot.filesInFlight.map((f) => ({ ...f })) };
  }

  /** Latest checkpoint for a session, or null. */
  latestCheckpoint(sessionId: string): CheckpointSnapshot | null {
    const list = this.store.get(sessionId);
    if (!list || list.length === 0) return null;
    return this.cloneSnapshot(list[list.length - 1]);
  }

  /** All checkpoints for a session (oldest → newest). */
  listCheckpoints(sessionId: string): CheckpointSnapshot[] {
    const list = this.store.get(sessionId) ?? [];
    return list.map((s) => this.cloneSnapshot(s));
  }

  getCheckpointById(sessionId: string, checkpointId: string): CheckpointSnapshot | null {
    const list = this.store.get(sessionId) ?? [];
    for (const s of list) {
      if (s.checkpointId === checkpointId) return this.cloneSnapshot(s);
    }
    return null;
  }

  // --------------------------------------------------------------
  // Recovery (the 95% fidelity gate from the milestone)
  // --------------------------------------------------------------

  /**
   * Recover the latest checkpoint and score its fidelity. Returns a
   * RecoveryResult; caller can gate on `passed === true`.
   *
   * Fidelity = fraction of schema-required fields that are non-
   * empty. Required: summary, handoffDirective, and ≥1 of
   * {pendingTasks, filesInFlight, recentDecisions, memoryAnchors}.
   */
  recoverState(sessionId: string): RecoveryResult | null {
    const snap = this.latestCheckpoint(sessionId);
    if (!snap) return null;
    const required = [
      { name: "summary", filled: snap.summary.trim().length > 0 },
      { name: "handoffDirective", filled: snap.handoffDirective.trim().length > 0 },
      { name: "sessionId", filled: snap.sessionId.length > 0 },
      { name: "editCount", filled: snap.editCount >= 0 },
      { name: "createdAt", filled: !!snap.createdAt },
    ];
    // Rich-content check: at least one of the array fields populated
    const richFilled =
      snap.pendingTasks.length +
        snap.filesInFlight.length +
        snap.recentDecisions.length +
        snap.memoryAnchors.length >
      0;
    required.push({ name: "richContent", filled: richFilled });

    const filled = required.filter((r) => r.filled).length;
    const total = required.length;
    const fidelity = filled / total;
    const missing = required.filter((r) => !r.filled).map((r) => r.name);
    return {
      snapshot: snap,
      fidelity,
      missingFields: missing,
      passed: fidelity >= 0.95,
    };
  }

  // --------------------------------------------------------------
  // Serialization for persistence (the auto-compact hook path)
  // --------------------------------------------------------------

  /** Serialize a snapshot to a compact JSON string. */
  serialize(snapshot: CheckpointSnapshot): string {
    return JSON.stringify(snapshot);
  }

  /** Deserialize + schema-version validate. */
  deserialize(json: string): CheckpointSnapshot {
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      throw new Error(`invalid JSON: ${e.message}`);
    }
    if (parsed.schemaVersion !== CONTEXT_CHECKPOINT_SCHEMA_VERSION) {
      throw new Error(
        `schemaVersion mismatch: got ${parsed.schemaVersion}, expected ${CONTEXT_CHECKPOINT_SCHEMA_VERSION}`,
      );
    }
    const required = [
      "sessionId",
      "checkpointId",
      "editCount",
      "createdAt",
      "summary",
      "pendingTasks",
      "filesInFlight",
      "recentDecisions",
      "memoryAnchors",
      "handoffDirective",
    ];
    for (const k of required) {
      if (!(k in parsed)) throw new Error(`missing field: ${k}`);
    }
    return parsed as CheckpointSnapshot;
  }

  /** Import a raw snapshot into the store (e.g. from a previous session). */
  ingestExternal(snapshot: CheckpointSnapshot): CheckpointSnapshot {
    if (snapshot.schemaVersion !== CONTEXT_CHECKPOINT_SCHEMA_VERSION) {
      throw new Error("schemaVersion mismatch on ingest");
    }
    const list = this.store.get(snapshot.sessionId) ?? [];
    list.push(snapshot);
    if (list.length > this.config.maxCheckpointsPerSession) {
      list.splice(0, list.length - this.config.maxCheckpointsPerSession);
    }
    this.store.set(snapshot.sessionId, list);
    return this.cloneSnapshot(snapshot);
  }

  // --------------------------------------------------------------
  // Administration
  // --------------------------------------------------------------

  totalCheckpoints(): number {
    let n = 0;
    for (const list of this.store.values()) n += list.length;
    return n;
  }

  knownSessions(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Reset edit counters without discarding checkpoints (used when
   * a session resumes post-compact and we want the next threshold
   * cycle to restart from 0).
   */
  resetEdits(sessionId: string): void {
    this.edits.delete(sessionId);
  }

  reset(): void {
    this.store.clear();
    this.edits.clear();
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------
  private cloneSnapshot(s: CheckpointSnapshot): CheckpointSnapshot {
    return {
      ...s,
      pendingTasks: [...s.pendingTasks],
      filesInFlight: s.filesInFlight.map((f) => ({ ...f })),
      recentDecisions: [...s.recentDecisions],
      memoryAnchors: [...s.memoryAnchors],
    };
  }
}

export const contextCheckpointEngine = new ContextCheckpointEngineImpl();
export type ContextCheckpointEngine = typeof contextCheckpointEngine;
