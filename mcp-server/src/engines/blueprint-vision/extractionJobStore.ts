/**
 * extractionJobStore.ts -- durable per-job-file store for async blueprint-OCR extraction jobs
 * (U-XRAY-EXTRACTION-JOB-STORE). The foundation of the async VLM-OCR path of POST /api/v1/drawing/extract:
 * a PDF/raster upload enqueues a job here, a background runner advances it, and the poll endpoint reads it.
 *
 * Design:
 *  - PER-JOB FILES (`<dir>/<jobId>.json`), NOT one shared JSON blob -- so concurrent jobs on DIFFERENT
 *    ids never race on a single file (each job's writes are independent). NB the same-id running-claim
 *    (get-then-write in `transition`) assumes a SINGLE in-process dispatcher (the Express server) -- it is
 *    NOT a cross-process compare-and-swap; if multi-process dispatch is ever added, gate the claim with an
 *    O_EXCL/`wx` lock-file. The runner is the single serialization point under the current deployment.
 *  - FORWARD-ONLY status: queued -> running -> done|failed (terminal). `canTransition` rejects illegal
 *    moves (e.g. done -> running) so a late/duplicate worker can never resurrect or corrupt a finished job.
 *  - ATOMIC writes (temp file + rename) so a crash mid-write never leaves a torn record.
 *  - schemaVersion on every record (N-1 migration discipline).
 *  - Timestamps are INJECTED (nowIso/nowMs args) so the pure logic is deterministically testable.
 */
import * as fs from "fs";
import * as path from "path";

export const EXTRACTION_JOB_SCHEMA_VERSION = "1.0.0";

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface ExtractionJobRecord {
  schemaVersion: string;
  jobId: string;
  status: JobStatus;
  producer: string; // e.g. "ocr-ensemble"
  source: string; // the uploaded file path / id being extracted
  createdAt: string; // ISO
  updatedAt: string; // ISO
  result?: unknown; // { contract, plan } on done
  error?: string; // on failed
}

/** Legal forward transitions. Terminal states (done/failed) accept none. */
const FORWARD: Record<JobStatus, JobStatus[]> = {
  queued: ["running", "failed"],
  running: ["done", "failed"],
  done: [],
  failed: [],
};

/** Pure: may a job move `from` -> `to`? Forward-only; terminal states are frozen. */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return (FORWARD[from] ?? []).includes(to);
}

/** jobId charset guard -- the id becomes a filename, so reject anything that could traverse/escape. */
function sanitizeJobId(jobId: string): string {
  if (typeof jobId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) {
    throw new Error(`invalid jobId (must match [A-Za-z0-9_-]{1,128}): ${String(jobId).slice(0, 32)}`);
  }
  return jobId;
}

export class ExtractionJobStore {
  private readonly dir: string;
  private tmpSeq = 0;

  constructor(dir: string) {
    this.dir = dir;
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private fileFor(jobId: string): string {
    return path.join(this.dir, `${sanitizeJobId(jobId)}.json`);
  }

  private writeAtomic(file: string, rec: ExtractionJobRecord): void {
    // Collision-unique temp name (pid + per-instance seq) so two writes with the SAME updatedAt never
    // target the same temp path; the temp is co-located with the target so the rename is same-filesystem.
    const tmp = `${file}.tmp-${process.pid}-${this.tmpSeq++}`;
    fs.writeFileSync(tmp, JSON.stringify(rec, null, 2), "utf-8");
    fs.renameSync(tmp, file); // atomic on same filesystem
  }

  /** Create a new queued job. Throws if the jobId already exists (no silent clobber). */
  create(args: { jobId: string; producer: string; source: string; nowIso: string }): ExtractionJobRecord {
    this.ensureDir();
    const file = this.fileFor(args.jobId);
    if (fs.existsSync(file)) throw new Error(`job already exists: ${args.jobId}`);
    const rec: ExtractionJobRecord = {
      schemaVersion: EXTRACTION_JOB_SCHEMA_VERSION,
      jobId: args.jobId,
      status: "queued",
      producer: args.producer,
      source: args.source,
      createdAt: args.nowIso,
      updatedAt: args.nowIso,
    };
    this.writeAtomic(file, rec);
    return rec;
  }

  /** Read a job, or null if it does not exist. Returns null (never throws) on a corrupt/torn file. */
  get(jobId: string): ExtractionJobRecord | null {
    let file: string;
    try {
      file = this.fileFor(jobId);
    } catch {
      return null; // an invalid jobId cannot name an existing job
    }
    if (!fs.existsSync(file)) return null;
    try {
      const rec = JSON.parse(fs.readFileSync(file, "utf-8")) as ExtractionJobRecord;
      return rec && typeof rec === "object" && rec.jobId === jobId ? rec : null;
    } catch {
      return null;
    }
  }

  /**
   * Advance a job to `to`, applying `result` (done) or `error` (failed). Returns {ok:false} with a reason
   * (never throws) when the job is missing or the transition is illegal -- the caller decides how to surface.
   */
  transition(
    jobId: string,
    to: JobStatus,
    patch: { result?: unknown; error?: string; nowIso: string },
  ): { ok: true; record: ExtractionJobRecord } | { ok: false; reason: string } {
    const current = this.get(jobId);
    if (!current) return { ok: false, reason: `job not found: ${jobId}` };
    if (!canTransition(current.status, to)) {
      return { ok: false, reason: `illegal transition ${current.status} -> ${to} for ${jobId}` };
    }
    const next: ExtractionJobRecord = {
      ...current,
      status: to,
      updatedAt: patch.nowIso,
      ...(patch.result !== undefined ? { result: patch.result } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
    };
    this.writeAtomic(this.fileFor(jobId), next);
    return { ok: true, record: next };
  }

  /** Remove terminal (done/failed) jobs older than maxAgeMs. Returns the count removed. */
  prune(nowMs: number, maxAgeMs: number): number {
    if (!fs.existsSync(this.dir)) return 0;
    let removed = 0;
    for (const name of fs.readdirSync(this.dir)) {
      if (!name.endsWith(".json")) continue;
      const file = path.join(this.dir, name);
      try {
        const rec = JSON.parse(fs.readFileSync(file, "utf-8")) as ExtractionJobRecord;
        const terminal = rec.status === "done" || rec.status === "failed";
        const age = nowMs - Date.parse(rec.updatedAt);
        if (terminal && Number.isFinite(age) && age > maxAgeMs) {
          fs.unlinkSync(file);
          removed++;
        }
      } catch {
        // skip unreadable/torn files -- prune is best-effort cleanup, not a consistency gate
      }
    }
    return removed;
  }
}
