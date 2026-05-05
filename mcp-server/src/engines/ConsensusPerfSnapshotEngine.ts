/**
 * ConsensusPerfSnapshotEngine — capture timestamped snapshots of the
 * consensus performance state for drift comparison.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-PERF-SNAPSHOT.
 *
 * Why this exists
 * ---------------
 * U-CONSENSUS-DRIFT-DETECTOR ships the pure compute layer: given two
 * perf-state snapshots, classify regressions per (vendor, taskType).
 * Without a snapshot history, the detector has nothing to compare —
 * the live perf-state is a single point in time, not a baseline.
 *
 * This engine owns the snapshot lifecycle:
 *   - capture  : copy live perf-state to a timestamped snapshot file
 *   - list     : enumerate snapshots in chronological order
 *   - load     : read a snapshot file → PerformanceState + metadata
 *   - prune    : retain only the most recent N snapshots
 *   - getLatestPair : pick (before, after) for drift comparison
 *
 * Storage convention: `${snapshotDir}/perf-${ISO_TS}__${label}.json`
 * Example: `state/shared/CONSENSUS_PERF_SNAPSHOTS/perf-2026-05-05T18-00-00-000Z__hourly.json`
 *
 * Atomic writes via tmp+rename. Snapshot files are immutable once
 * written. Pruning is opt-in (caller passes keepLast).
 *
 * Scheduled use
 * -------------
 * The credit-cron CLI is the natural caller: each cron run captures a
 * snapshot before applying credit, giving the drift detector a fresh
 * "before" baseline to compare against the post-run "after" state.
 *
 * @module engines/ConsensusPerfSnapshotEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { consensusModelPerformanceEngine } from "./ConsensusModelPerformanceEngine.js";
import type { PerformanceState } from "./ConsensusModelPerformanceEngine.js";

const DEFAULT_SNAPSHOT_DIR = "H:/prism/state/shared/CONSENSUS_PERF_SNAPSHOTS";
const SNAPSHOT_PREFIX = "perf-";
const SNAPSHOT_SUFFIX = ".json";
const FILENAME_LABEL_SEP = "__";

export interface CaptureSnapshotInput {
  /** Live perf-state file path. Default = ConsensusModelPerformanceEngine canonical. */
  perfStatePath?: string | null;
  /** Directory where snapshot files are written. */
  snapshotDir?: string;
  /** Short label appended to the filename (e.g. "hourly", "pre-cron"). Default "manual". */
  label?: string;
  /** Override the timestamp (test injection). */
  now?: Date;
}

export interface CaptureSnapshotResult {
  ok: boolean;
  snapshotPath: string;
  ts: string;
  label: string;
  vendorCount: number;
  taskCount: number;
  error: string | null;
}

export interface SnapshotMeta {
  filename: string;
  fullPath: string;
  ts: string;
  label: string;
}

export interface SnapshotPayload extends SnapshotMeta {
  state: PerformanceState;
}

export interface PruneOpts {
  snapshotDir?: string;
  /** Number of most-recent snapshots to retain. Older snapshots are deleted. */
  keepLast: number;
}

export interface PruneResult {
  ok: boolean;
  kept: SnapshotMeta[];
  pruned: SnapshotMeta[];
  error: string | null;
}

export interface LatestPairOpts {
  snapshotDir?: string;
  /** Minimum age (ms) the "before" snapshot must have relative to "after". Default 0 (just take previous). */
  minSpanMs?: number;
}

export interface LatestPairResult {
  ok: boolean;
  before: SnapshotPayload | null;
  after: SnapshotPayload | null;
  error: string | null;
}

export class ConsensusPerfSnapshotEngine {
  /**
   * Capture a snapshot of the live perf-state. Reads the live file,
   * writes an immutable copy with a timestamped filename. Atomic via
   * tmp+rename. Fail-open: returns ok:false on read/write failure.
   */
  captureSnapshot(input: CaptureSnapshotInput = {}): CaptureSnapshotResult {
    const snapshotDir = input.snapshotDir ?? DEFAULT_SNAPSHOT_DIR;
    const label = this.sanitizeLabel(input.label ?? "manual");
    const ts = (input.now ?? new Date()).toISOString();
    const filename = this.buildFilename(ts, label);
    const fullPath = path.join(snapshotDir, filename);

    try {
      const state = consensusModelPerformanceEngine.loadState((input.perfStatePath ?? null) as string | null);
      const vendorCount = Object.keys(state.vendors ?? {}).length;
      let taskCount = 0;
      for (const v of Object.values(state.vendors ?? {})) {
        taskCount += Object.keys(v?.tasks ?? {}).length;
      }
      fs.mkdirSync(snapshotDir, { recursive: true });
      const tmp = `${fullPath}.${process.pid}.${Date.now()}.tmp`;
      const payload: SnapshotPayload = {
        filename,
        fullPath,
        ts,
        label,
        state,
      };
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf-8");
      try {
        fs.renameSync(tmp, fullPath);
      } catch {
        try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
        fs.renameSync(tmp, fullPath);
      }
      return { ok: true, snapshotPath: fullPath, ts, label, vendorCount, taskCount, error: null };
    } catch (e) {
      return {
        ok: false,
        snapshotPath: fullPath,
        ts,
        label,
        vendorCount: 0,
        taskCount: 0,
        error: (e as Error).message,
      };
    }
  }

  /**
   * List snapshot files in chronological order (oldest first). Returns
   * an empty array if the directory is missing or unreadable.
   */
  listSnapshots(snapshotDir: string = DEFAULT_SNAPSHOT_DIR): SnapshotMeta[] {
    if (!fs.existsSync(snapshotDir)) return [];
    let entries: string[];
    try {
      entries = fs.readdirSync(snapshotDir);
    } catch {
      return [];
    }
    const metas: SnapshotMeta[] = [];
    for (const name of entries) {
      const meta = this.parseFilename(name, snapshotDir);
      if (meta) metas.push(meta);
    }
    metas.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    return metas;
  }

  /**
   * Load a single snapshot file and return its payload. Fail-open:
   * returns null on read/parse error.
   */
  loadSnapshot(snapshotPath: string): SnapshotPayload | null {
    try {
      const raw = fs.readFileSync(snapshotPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<SnapshotPayload>;
      if (
        typeof parsed?.ts !== "string" ||
        typeof parsed?.label !== "string" ||
        !parsed?.state ||
        typeof parsed.state !== "object"
      ) {
        return null;
      }
      return {
        filename: parsed.filename ?? path.basename(snapshotPath),
        fullPath: parsed.fullPath ?? snapshotPath,
        ts: parsed.ts,
        label: parsed.label,
        state: parsed.state as PerformanceState,
      };
    } catch {
      return null;
    }
  }

  /**
   * Retain only the `keepLast` most recent snapshots; delete older ones.
   * Fail-open: errors during deletion are recorded but don't abort the
   * pruning loop. Setting keepLast=0 deletes ALL snapshots.
   */
  pruneSnapshots(opts: PruneOpts): PruneResult {
    const dir = opts.snapshotDir ?? DEFAULT_SNAPSHOT_DIR;
    const keep = Math.max(0, Math.floor(opts.keepLast));
    if (!Number.isFinite(opts.keepLast) || opts.keepLast < 0) {
      return { ok: false, kept: [], pruned: [], error: "keepLast must be a non-negative integer" };
    }

    const all = this.listSnapshots(dir);
    if (all.length === 0) {
      return { ok: true, kept: [], pruned: [], error: null };
    }
    // Newest first for retention; oldest are pruned.
    const newestFirst = [...all].reverse();
    const kept = newestFirst.slice(0, keep);
    const toPrune = newestFirst.slice(keep);
    const pruned: SnapshotMeta[] = [];
    let firstError: string | null = null;
    for (const meta of toPrune) {
      try {
        fs.unlinkSync(meta.fullPath);
        pruned.push(meta);
      } catch (e) {
        if (!firstError) firstError = (e as Error).message;
      }
    }
    return { ok: firstError === null, kept, pruned, error: firstError };
  }

  /**
   * Pick a (before, after) pair for drift comparison. "after" is the
   * most recent snapshot; "before" is the most recent snapshot whose
   * timestamp is at least `minSpanMs` older than "after". Returns
   * nulls when there are fewer than two qualifying snapshots.
   */
  getLatestPair(opts: LatestPairOpts = {}): LatestPairResult {
    const dir = opts.snapshotDir ?? DEFAULT_SNAPSHOT_DIR;
    const minSpanMs = Math.max(0, opts.minSpanMs ?? 0);
    const all = this.listSnapshots(dir);
    if (all.length < 2) {
      return { ok: false, before: null, after: null, error: "need at least 2 snapshots" };
    }
    const after = all[all.length - 1];
    const afterTime = Date.parse(after.ts);
    let before: SnapshotMeta | null = null;
    for (let i = all.length - 2; i >= 0; i--) {
      const candidate = all[i];
      const candTime = Date.parse(candidate.ts);
      if (Number.isFinite(afterTime) && Number.isFinite(candTime)) {
        if (afterTime - candTime >= minSpanMs) {
          before = candidate;
          break;
        }
      } else {
        // Unparseable timestamp — fall back to ordering only.
        before = candidate;
        break;
      }
    }
    if (!before) {
      return { ok: false, before: null, after: null, error: "no snapshot satisfies minSpanMs" };
    }
    const beforePayload = this.loadSnapshot(before.fullPath);
    const afterPayload = this.loadSnapshot(after.fullPath);
    if (!beforePayload || !afterPayload) {
      return { ok: false, before: null, after: null, error: "failed to load snapshot payload" };
    }
    return { ok: true, before: beforePayload, after: afterPayload, error: null };
  }

  // ---------- internals ----------

  /** Sanitize a label for use in a filename: alnum + dash/underscore only. */
  private sanitizeLabel(label: string): string {
    const cleaned = label.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return cleaned.length === 0 ? "manual" : cleaned;
  }

  /** Build a filesystem-safe filename: ISO timestamp with `:` and `.` replaced. */
  private buildFilename(isoTs: string, label: string): string {
    const safeTs = isoTs.replace(/:/g, "-").replace(/\./g, "-");
    return `${SNAPSHOT_PREFIX}${safeTs}${FILENAME_LABEL_SEP}${label}${SNAPSHOT_SUFFIX}`;
  }

  /** Parse a snapshot filename back to its components. Returns null on mismatch. */
  private parseFilename(filename: string, snapshotDir: string): SnapshotMeta | null {
    if (!filename.startsWith(SNAPSHOT_PREFIX) || !filename.endsWith(SNAPSHOT_SUFFIX)) return null;
    const stem = filename.slice(SNAPSHOT_PREFIX.length, -SNAPSHOT_SUFFIX.length);
    const sepIdx = stem.indexOf(FILENAME_LABEL_SEP);
    if (sepIdx < 0) return null;
    const tsPart = stem.slice(0, sepIdx);
    const label = stem.slice(sepIdx + FILENAME_LABEL_SEP.length);
    // Reverse the filename-safe substitution: `2026-05-05T18-00-00-000Z` → `2026-05-05T18:00:00.000Z`
    // Two `-` after the `T` are time-component separators; the next `-` is fractional seconds.
    const tIdx = tsPart.indexOf("T");
    if (tIdx < 0) return null;
    const datePart = tsPart.slice(0, tIdx);
    const timeRest = tsPart.slice(tIdx + 1);
    const parts = timeRest.split("-");
    if (parts.length < 4) return null;
    const ts = `${datePart}T${parts[0]}:${parts[1]}:${parts[2]}.${parts.slice(3).join("-")}`;
    return {
      filename,
      fullPath: path.join(snapshotDir, filename),
      ts,
      label,
    };
  }
}

export const consensusPerfSnapshotEngine = new ConsensusPerfSnapshotEngine();
