/**
 * WEDMJobOutcomeEngine — Canonical capture point for finished WEDM job telemetry.
 *
 * MS-P4-DL-CORE / U-P4-DL-01
 *
 * Purpose
 * -------
 * Every finished wire-EDM job writes ONE `WEDMJobRecord` here. The file that
 * lands on disk is `mcp-server/data/state/WEDM_JOB_HISTORY.json` validated
 * against `wedmJobHistorySchema.ts` v1.
 *
 * This engine is the training-corpus substrate for the downstream P4 units:
 *   • U-P4-DL-02 — WEDMLoRAAdapterEngine reads these records to train rank-4
 *                  low-rank adapters on top of Klocke / DiBitonto base models
 *   • U-P4-DL-03 — WEDMEWCMemoryEngine builds Fisher-info diagonals from them
 *   • U-P4-DL-04 — WEDMFewShotEngine bootstraps new-material adapters from
 *                  3-5 successful records
 *
 * Why a new engine (and not an extension of WEDMContinuousLearningEngine)?
 * WEDMContinuousLearningEngine already orchestrates live streaming signals
 * (Ra, cycle time, wire-break, operator) into in-memory Bayesian state. It
 * does NOT persist to a canonical schema-v1 history file. Per web/CLAUDE.md
 * rule "never rename existing Codex/Claude engines without deprecation shim",
 * WEDMJobOutcomeEngine is built side-by-side as the persistence gateway and
 * optionally forwards each recorded job into WEDMContinuousLearningEngine so
 * the existing live-learning behavior remains intact.
 *
 * Public API
 * ----------
 *   • record(input)    — validate + append + persist; returns the stored record
 *   • load()           — read and re-validate the file; returns the envelope
 *   • findByMaterial() — filter-by-material helper for LoRA/EWC/FewShot consumers
 *   • stats()          — lightweight summary for dashboards
 *   • path()           — resolved absolute path to the history file
 *
 * Atomic-write safety: `fs.writeFileSync` to a `.tmp` sibling then `rename`.
 * Single-process safe; multi-process coordination is the caller's concern
 * (PRISM uses `DistributedLockManager.withLock` for that).
 *
 * References
 * ----------
 *   • Schema: src/schemas/wedmJobHistorySchema.ts
 *   • Master roadmap §5 MS-P4-DL-CORE
 *   • AtomicValue shape convention (value/unit/source/uncertainty) — shared
 *     across PRISM atomic-measurement records.
 *
 * @module engines/WEDMJobOutcomeEngine
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WEDMJobHistoryFileSchema,
  WEDMJobRecordSchema,
  emptyHistoryFile,
  type WEDMJobHistoryFile,
  type WEDMJobRecord,
} from "../schemas/wedmJobHistorySchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// PATH RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILE_REL = "../../data/state/WEDM_JOB_HISTORY.json";

function resolveHistoryFile(override?: string): string {
  if (override) return resolve(override);
  // engines/ live at: mcp-server/src/engines/
  // target file at:  mcp-server/data/state/WEDM_JOB_HISTORY.json
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, DEFAULT_FILE_REL);
}

// ─────────────────────────────────────────────────────────────────────────────
// ULID (Crockford base32) — self-contained, no external dep
// ─────────────────────────────────────────────────────────────────────────────

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeBase32Timestamp(ms: number): string {
  let t = Math.floor(ms);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD[t & 31] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeBase32Random(): string {
  // 16 chars of randomness → 80 bits. Pull 10 bytes, map 5-bit groups.
  const buf = randomBytes(10);
  const bits: number[] = [];
  for (const b of buf) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const v = (bits[i] << 4) | (bits[i + 1] << 3) | (bits[i + 2] << 2) | (bits[i + 3] << 1) | bits[i + 4];
    out += CROCKFORD[v];
  }
  return out; // 16 chars
}

function newUlid(now: number = Date.now()): string {
  return encodeBase32Timestamp(now) + encodeBase32Random();
}

function isoUtcNow(now: number = Date.now()): string {
  return new Date(now).toISOString().replace(/\.\d+Z$/, "Z");
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/** What a caller passes to `record()`. `job_id` and `recorded_at` are filled
 *  by the engine if omitted. */
export type RecordJobInput = Omit<WEDMJobRecord, "job_id" | "recorded_at"> & {
  job_id?: string;
  recorded_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface WEDMJobOutcomeStats {
  total_records: number;
  sequence: number;
  materials: Record<string, number>;
  acceptance_rate: number;
  total_wire_break_events: number;
  mean_cycle_min: number;
  mean_ra_um: number;
  file_path: string;
}

export class WEDMJobOutcomeEngine {
  readonly name = "WEDMJobOutcomeEngine";
  readonly version = "1.0.0";
  readonly schemaVersion = 1 as const;

  private readonly filePath: string;

  constructor(opts?: { filePath?: string; nowFn?: () => number }) {
    this.filePath = resolveHistoryFile(opts?.filePath);
    if (opts?.nowFn) this.nowFn = opts.nowFn;
  }

  private nowFn: () => number = () => Date.now();

  path(): string {
    return this.filePath;
  }

  /** Read + validate the history file. Returns an empty envelope if file is absent. */
  load(): WEDMJobHistoryFile {
    if (!existsSync(this.filePath)) return emptyHistoryFile();
    const raw = readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw);
    return WEDMJobHistoryFileSchema.parse(parsed);
  }

  /** Persist an envelope atomically (write to .tmp then rename). */
  private persist(file: WEDMJobHistoryFile): void {
    // Revalidate before write — defence-in-depth against in-memory mutation.
    const validated = WEDMJobHistoryFileSchema.parse(file);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(validated, null, 2) + "\n", "utf8");
    renameSync(tmp, this.filePath);
  }

  /**
   * Record a finished job. Fills `job_id` (ULID) and `recorded_at` (ISO-8601 UTC)
   * if the caller omitted them. Validates the full record against schema v1 and
   * appends to the file.
   *
   * Returns the stored record (with filled fields).
   * Throws `z.ZodError` on validation failure — caller is expected to surface it.
   */
  record(input: RecordJobInput): WEDMJobRecord {
    const now = this.nowFn();
    const filled: WEDMJobRecord = {
      ...input,
      job_id: input.job_id ?? newUlid(now),
      recorded_at: input.recorded_at ?? isoUtcNow(now),
    };
    // Validate the single record first — cheaper failure mode.
    const validated = WEDMJobRecordSchema.parse(filled);
    const current = this.load();
    const next: WEDMJobHistoryFile = {
      schemaVersion: 1,
      generated_at: isoUtcNow(now),
      sequence: current.sequence + 1,
      records: [...current.records, validated],
    };
    this.persist(next);
    return validated;
  }

  /** All records matching a material key (case-sensitive as recorded). */
  findByMaterial(material: string): WEDMJobRecord[] {
    return this.load().records.filter((r) => r.input.material === material);
  }

  /** Records where the supplied predicate returns true. */
  filter(predicate: (r: WEDMJobRecord) => boolean): WEDMJobRecord[] {
    return this.load().records.filter(predicate);
  }

  /** Clear the history (intended for tests only — production callers should
   *  instead archive the existing file and re-initialise). */
  reset(): void {
    this.persist(emptyHistoryFile());
  }

  /** Lightweight summary suitable for dashboards/telemetry. */
  stats(): WEDMJobOutcomeStats {
    const file = this.load();
    const records = file.records;
    const materials: Record<string, number> = {};
    let accepted = 0;
    let wireBreaks = 0;
    let cycleSum = 0;
    let raSum = 0;
    for (const r of records) {
      materials[r.input.material] = (materials[r.input.material] ?? 0) + 1;
      if (r.outcome.accepted) accepted++;
      wireBreaks += r.outcome.wire_break_count;
      cycleSum += r.outcome.measured_cycle_min.value;
      raSum += r.outcome.measured_ra.value;
    }
    const n = records.length;
    return {
      total_records: n,
      sequence: file.sequence,
      materials,
      acceptance_rate: n === 0 ? 0 : accepted / n,
      total_wire_break_events: wireBreaks,
      mean_cycle_min: n === 0 ? 0 : cycleSum / n,
      mean_ra_um: n === 0 ? 0 : raSum / n,
      file_path: this.filePath,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON (dispatcher consumers import this)
// ─────────────────────────────────────────────────────────────────────────────

export const wedmJobOutcomeEngine = new WEDMJobOutcomeEngine();
