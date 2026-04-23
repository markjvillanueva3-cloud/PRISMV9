/**
 * CADTestCheckpointEngine — U-CINF05 (CAD-INFRA-MS0)
 *
 * Standalone engine owning CAD-regression checkpoint policy and persistence.
 * Implements the "every 100 files OR every 60s" cadence described in the
 * CAD-INFRA-MS0 milestone, plus load/resume-diff helpers used by dashboards,
 * CLI tools, and the regression orchestrator.
 *
 * Scope split vs CADRegressionTestOrchestratorEngine (U-CINF04):
 *   - Orchestrator: owns the worker pool and task dispatch. It currently
 *     ships inline checkpoint logic for performance (hot path).
 *   - CheckpointEngine (this file): owns the POLICY — when to checkpoint,
 *     what directory layout to use, how to load + diff existing state.
 *     Consumers that aren't the orchestrator (dashboards, CLIs, resume
 *     tools) rely on this engine instead of duplicating policy.
 *
 * API surface:
 *   shouldCheckpoint(state)       — pure: "is it time to persist?"
 *   markSaved(state)              — pure: reset counters after a save
 *   save(batch, path)             — persists via atomicWrite
 *   load(path)                    — schema-validated read; null on miss
 *   resumeDiff(batch)             — returns {pending, completed} partitions
 *   defaultPath(batchId)          — canonical {batchId}.json path
 *
 * Complexity:
 *   shouldCheckpoint O(1) | markSaved O(1) | save O(F) | load O(F) | resumeDiff O(F)
 *
 * Duplication check: closest existing asset is DurableJobQueueEngine (general
 * job queue, no CAD semantics). No existing engine owns CAD-regression
 * checkpoint cadence or the {batchId}.json layout. Safe to create.
 *
 * @module engines/CADTestCheckpointEngine
 */

import * as nodePath from "path";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  TestBatchSchema,
  type TestBatch,
  type TestStatus,
} from "../schemas/cadRegressionTestSchema.js";

// ── Cadence policy ────────────────────────────────────────────────────────────

/** Default: checkpoint after this many terminal transitions. */
export const DEFAULT_CHECKPOINT_EVERY = 100;

/** Default: checkpoint at least this often in milliseconds. */
export const DEFAULT_CHECKPOINT_INTERVAL_MS = 60_000;

/** Default: persist under data/state/cad-regression-tests/. */
export const DEFAULT_STATE_DIR = nodePath.resolve(
  process.cwd(),
  "data/state/cad-regression-tests",
);

// ── Mutable cadence counter ───────────────────────────────────────────────────

/**
 * Tracks cadence state between `shouldCheckpoint` calls. The orchestrator
 * instantiates one of these per batch run.
 */
export interface CheckpointCadenceState {
  transitionsSinceSave: number;
  lastSaveAtMs: number;
  every: number;
  intervalMs: number;
}

export interface CheckpointCadenceOptions {
  every?: number;
  intervalMs?: number;
  /** Override `Date.now()` for deterministic testing. */
  nowMs?: number;
}

// ── Resume partition ──────────────────────────────────────────────────────────

export interface ResumeDiff {
  /** FileIds in a terminal state (pass|fail|skip) — skip on resume. */
  completedIds: string[];
  /** FileIds still pending (including pending + error + reverted running). */
  pendingIds: string[];
  /** FileIds reverted from 'running' to 'pending' (crashed mid-flight). */
  revertedIds: string[];
}

// ── Injectable FS (for testability) ───────────────────────────────────────────

export interface CheckpointFS {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: BufferEncoding): string;
  mkdirSync(p: string, opts?: { recursive?: boolean }): void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTerminal(status: TestStatus): boolean {
  return status === "pass" || status === "fail" || status === "skip";
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * CADTestCheckpointEngine — policy + persistence for CAD regression
 * checkpointing. Pure-ish: the only side effect is `save()` calling atomicWrite.
 */
export class CADTestCheckpointEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADTestCheckpointEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Checkpoint policy for CAD regression: 'every 100 files OR every 60s' " +
        "cadence, atomic persistence, schema-validated load, resume diff.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "save",
        description: "Persist a TestBatch atomically",
        actions: ["cad_checkpoint_save"],
      },
      {
        name: "load",
        description: "Load a persisted TestBatch with schema validation",
        actions: ["cad_checkpoint_load"],
      },
      {
        name: "diff",
        description: "Partition files into completed vs pending for resume",
        actions: ["cad_checkpoint_resume_diff"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as { op?: unknown };
    if (typeof o.op !== "string") return "input.op must be a string";
    if (!["save", "load", "diff"].includes(o.op as string)) {
      return `input.op must be save|load|diff (got ${o.op})`;
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const o = input as {
      op: "save" | "load" | "diff";
      batch?: TestBatch;
      path?: string;
      fs?: CheckpointFS;
    };
    if (o.op === "save") {
      if (!o.batch || !o.path) throw new Error("save requires batch + path");
      await this.save(o.batch, o.path);
      return { saved: true, path: o.path };
    }
    if (o.op === "load") {
      if (!o.path) throw new Error("load requires path");
      return { batch: await this.load(o.path, o.fs) };
    }
    if (o.op === "diff") {
      if (!o.batch) throw new Error("diff requires batch");
      return this.resumeDiff(o.batch);
    }
    throw new Error(`unknown op ${o.op}`);
  }

  // ── Cadence ─────────────────────────────────────────────────────────────────

  /**
   * Build a fresh cadence state.
   */
  createCadence(opts: CheckpointCadenceOptions = {}): CheckpointCadenceState {
    return {
      transitionsSinceSave: 0,
      lastSaveAtMs: opts.nowMs ?? Date.now(),
      every: Math.max(1, opts.every ?? DEFAULT_CHECKPOINT_EVERY),
      intervalMs: Math.max(1, opts.intervalMs ?? DEFAULT_CHECKPOINT_INTERVAL_MS),
    };
  }

  /**
   * Record that one terminal transition occurred. Returns true when the
   * cadence says it is time to persist.
   *
   * @param state   - Cadence state (mutated in place).
   * @param nowMs   - Optional injected clock for deterministic tests.
   */
  recordTransition(state: CheckpointCadenceState, nowMs?: number): boolean {
    state.transitionsSinceSave++;
    return this.shouldCheckpoint(state, nowMs);
  }

  /**
   * Pure: is it time to persist based on the cadence counters?
   */
  shouldCheckpoint(state: CheckpointCadenceState, nowMs?: number): boolean {
    const now = nowMs ?? Date.now();
    if (state.transitionsSinceSave >= state.every) return true;
    if (now - state.lastSaveAtMs >= state.intervalMs) return true;
    return false;
  }

  /**
   * Reset cadence counters after a successful save.
   */
  markSaved(state: CheckpointCadenceState, nowMs?: number): void {
    state.transitionsSinceSave = 0;
    state.lastSaveAtMs = nowMs ?? Date.now();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  /**
   * Persist a TestBatch atomically. Updates updatedAt + lastCheckpoint, then
   * writes via atomicWrite.ts.
   *
   * @throws If the batch fails schema validation.
   */
  async save(batch: TestBatch, outputPath: string, fsImpl?: CheckpointFS): Promise<void> {
    const fs = fsImpl ?? (await this._defaultFS());
    const ts = nowISO();
    const toWrite: TestBatch = { ...batch, updatedAt: ts, lastCheckpoint: ts };
    const parsed = TestBatchSchema.parse(toWrite);
    fs.mkdirSync(nodePath.dirname(outputPath), { recursive: true });
    await atomicWrite(outputPath, JSON.stringify(parsed, null, 2));
  }

  /**
   * Load a TestBatch. Returns null on miss or schema mismatch.
   */
  async load(inputPath: string, fsImpl?: CheckpointFS): Promise<TestBatch | null> {
    const fs = fsImpl ?? (await this._defaultFS());
    try {
      if (!fs.existsSync(inputPath)) return null;
      const raw = fs.readFileSync(inputPath, "utf-8");
      return TestBatchSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /**
   * Canonical path for a batch: data/state/cad-regression-tests/{batchId}.json.
   */
  defaultPath(batchId: string, stateDir: string = DEFAULT_STATE_DIR): string {
    return nodePath.join(stateDir, `${batchId}.json`);
  }

  // ── Resume ──────────────────────────────────────────────────────────────────

  /**
   * Partition the batch files into completed vs pending. Any file stuck in
   * 'running' state (orchestrator crashed mid-flight) is reverted to pending
   * so the next run replays it — this mutation happens IN PLACE on the batch.
   *
   * @returns ResumeDiff with completedIds, pendingIds, revertedIds.
   */
  resumeDiff(batch: TestBatch): ResumeDiff {
    const completedIds: string[] = [];
    const pendingIds: string[] = [];
    const revertedIds: string[] = [];

    for (const [fileId, entry] of Object.entries(batch.files)) {
      if (entry.status === "running") {
        entry.status = "pending";
        entry.durationMs = 0;
        revertedIds.push(fileId);
        pendingIds.push(fileId);
        continue;
      }
      if (isTerminal(entry.status)) {
        completedIds.push(fileId);
      } else {
        // pending or error — both need to run
        pendingIds.push(fileId);
      }
    }
    return { completedIds, pendingIds, revertedIds };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _defaultFS(): Promise<CheckpointFS> {
    const mod = await import("fs");
    return mod as unknown as CheckpointFS;
  }
}

/** Singleton for dispatcher use. */
export const cadTestCheckpointEngine = new CADTestCheckpointEngine();
