/**
 * OutcomeTrackingEngine — Phase 0.19 U-LLM5
 *
 * Log real shop outcomes for every program PRISM produces so downstream
 * learning loops (U-LLM6 IncrementalLearning, CausalReasoningEngine,
 * TransferLearningBridge) can train on truthful signal instead of
 * synthetic self-play.
 *
 * One outcome per machine run, stored as JSON lines at
 * `<data>/outcomes/outcomes.jsonl`. Append-only on disk; the in-memory
 * index is rebuilt lazily on first read after process start.
 *
 * Design rules:
 *   1. Never throw on missing-file — first write creates the path.
 *   2. Zod-validate every payload; reject the write rather than store
 *      garbage that would poison the learning set.
 *   3. Per-file write chain prevents partial lines under concurrent
 *      logging (common in orchestrated multi-agent runs).
 *   4. Queries are in-memory filters, not a database. If the file grows
 *      past a few hundred MB we can rotate or promote to SQLite; for
 *      now plain JSONL keeps the dataset forkable and diffable.
 *
 * @module engines/OutcomeTrackingEngine
 * @milestone PP-0.19-U-LLM5
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const SCHEMA_VERSION = 1 as const;

export const OUTCOME_KINDS = ["good", "scrap", "adjusted", "aborted"] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export const OutcomeInputSchema = z.object({
  programId: z.string().min(1),
  outcome: z.enum(OUTCOME_KINDS),
  machineId: z.string().optional(),
  materialId: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  operatorId: z.string().optional(),
  notes: z.string().optional(),
  metrics: z
    .object({
      cycleTimeSec: z.number().nonnegative().optional(),
      surfaceFinishRaUm: z.number().nonnegative().optional(),
      toolWearMm: z.number().nonnegative().optional(),
      dimensionalErrorMm: z.number().optional(),
      scrapReason: z.string().optional(),
    })
    .optional(),
  adjustments: z
    .object({
      feedRatePct: z.number().optional(),
      spindleRpmPct: z.number().optional(),
      depthOfCutPct: z.number().optional(),
      stepoverPct: z.number().optional(),
      coolantChange: z.string().optional(),
      toolChange: z.string().optional(),
      freeText: z.string().optional(),
    })
    .optional(),
});

export type OutcomeInput = z.infer<typeof OutcomeInputSchema>;

export interface OutcomeRecord extends OutcomeInput {
  /** ISO-8601 UTC timestamp of when the outcome was recorded. */
  recordedAt: string;
  /** Monotonic id scoped to this engine instance — useful for ordering. */
  seq: number;
  schemaVersion: typeof SCHEMA_VERSION;
}

export interface OutcomeQuery {
  programId?: string;
  machineId?: string;
  materialId?: string;
  outcome?: OutcomeKind | OutcomeKind[];
  sinceIso?: string;
  untilIso?: string;
  limit?: number;
}

export interface OutcomeStats {
  total: number;
  byKind: Record<OutcomeKind, number>;
  goodRate: number;
  scrapRate: number;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
}

const writeChains = new Map<string, Promise<void>>();

function serialize<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(filePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  writeChains.set(
    filePath,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export class OutcomeTrackingEngine {
  private readonly filePath: string;
  private cache: OutcomeRecord[] | null = null;
  private nextSeq = 0;

  constructor(
    dataDir: string = path.resolve(process.cwd(), "data", "outcomes"),
    filename = "outcomes.jsonl",
  ) {
    this.filePath = path.join(dataDir, filename);
  }

  /** Test/ops hook: disk path for the log. */
  getLogPath(): string {
    return this.filePath;
  }

  /** Log an outcome. Throws only on validation failure; I/O failures bubble. */
  async log(input: OutcomeInput): Promise<OutcomeRecord> {
    const parsed = OutcomeInputSchema.parse(input);
    const records = await this.loadCache();
    const seq = this.nextSeq++;
    const record: OutcomeRecord = {
      ...parsed,
      recordedAt: new Date().toISOString(),
      seq,
      schemaVersion: SCHEMA_VERSION,
    };
    await this.appendRecord(record);
    records.push(record);
    return record;
  }

  /** Read matching records. `limit` is applied after filtering, newest-first. */
  async query(filter: OutcomeQuery = {}): Promise<OutcomeRecord[]> {
    const all = await this.loadCache();
    const kinds = Array.isArray(filter.outcome)
      ? new Set(filter.outcome)
      : filter.outcome
        ? new Set<OutcomeKind>([filter.outcome])
        : null;

    const since = filter.sinceIso ? Date.parse(filter.sinceIso) : -Infinity;
    const until = filter.untilIso ? Date.parse(filter.untilIso) : Infinity;

    const filtered = all.filter((r) => {
      if (filter.programId && r.programId !== filter.programId) return false;
      if (filter.machineId && r.machineId !== filter.machineId) return false;
      if (filter.materialId && r.materialId !== filter.materialId) return false;
      if (kinds && !kinds.has(r.outcome)) return false;
      const t = Date.parse(r.recordedAt);
      if (Number.isFinite(t) && (t < since || t > until)) return false;
      return true;
    });

    filtered.sort(
      (a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt),
    );
    return filter.limit && filter.limit > 0
      ? filtered.slice(0, filter.limit)
      : filtered;
  }

  /** Convenience: outcomes for a specific program in recording order. */
  async forProgram(programId: string): Promise<OutcomeRecord[]> {
    const rows = await this.query({ programId });
    return rows.sort((a, b) => a.seq - b.seq);
  }

  /** Aggregate counts for dashboard/telemetry. */
  async stats(filter: OutcomeQuery = {}): Promise<OutcomeStats> {
    const rows = await this.query(filter);
    const byKind: Record<OutcomeKind, number> = {
      good: 0,
      scrap: 0,
      adjusted: 0,
      aborted: 0,
    };
    for (const r of rows) byKind[r.outcome]++;
    const total = rows.length;
    return {
      total,
      byKind,
      goodRate: total ? byKind.good / total : 0,
      scrapRate: total ? byKind.scrap / total : 0,
      firstRecordedAt:
        total > 0 ? rows[rows.length - 1].recordedAt : null,
      lastRecordedAt: total > 0 ? rows[0].recordedAt : null,
    };
  }

  /** Force cache reload from disk. Useful in tests and after external edits. */
  async reload(): Promise<void> {
    this.cache = null;
    this.nextSeq = 0;
    await this.loadCache();
  }

  // ── internals ────────────────────────────────────────────────────────

  private async loadCache(): Promise<OutcomeRecord[]> {
    if (this.cache !== null) return this.cache;
    if (!existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = await readFile(this.filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: OutcomeRecord[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as OutcomeRecord;
        if (typeof obj.seq === "number" && obj.seq >= this.nextSeq) {
          this.nextSeq = obj.seq + 1;
        }
        parsed.push(obj);
      } catch {
        // Skip malformed lines rather than poison the cache.
      }
    }
    this.cache = parsed;
    return this.cache;
  }

  private async appendRecord(record: OutcomeRecord): Promise<void> {
    const dir = path.dirname(this.filePath);
    await serialize(this.filePath, async () => {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await appendFile(this.filePath, JSON.stringify(record) + "\n", "utf-8");
    });
  }
}

export const outcomeTrackingEngine = new OutcomeTrackingEngine();
