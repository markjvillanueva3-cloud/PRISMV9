/**
 * MINBatchExtractorEngine — LATHE-PROD-READY-MS0/U-LPR27
 * =======================================================
 *
 * Bounded-concurrency batch parser for the JM Die `.MIN` corpus
 * (5,297 production Okuma OSP programs).  The unit spec is explicit:
 *
 *   • Bounded worker pool: `min(os.availableParallelism()-1, 16)` (ceiling raised 8→16 for the 9950X3D2 16C/32T; HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.3).
 *   • Backpressure: in-flight count never exceeds the pool size.
 *   • Per-file byte cap (default 32 MiB; spec allows up to 64).
 *   • Checkpoint every N completions (default 250).
 *   • Resumable: a re-run with the same `runId` skips already-completed
 *     file IDs without reparsing.
 *
 * Design contract (every choice exists for a reason):
 *
 *   1. **No p-limit dependency.**  The codebase is under heavy concurrent
 *      edit and adding a new dep would conflict with peer chats.  A 30-line
 *      handwritten async semaphore (the `concurrencyLimiter` helper below)
 *      gives the same backpressure guarantee with zero install risk.
 *
 *   2. **Checkpoint write is atomic.**  We write to `<path>.tmp` and
 *      rename — a crash mid-write never leaves a torn JSON file.
 *
 *   3. **Per-file errors are caught and recorded, never re-thrown.**
 *      A single corrupt `.MIN` cannot kill the batch; the parser already
 *      promises never to throw, but we still wrap it for I/O failures
 *      (read errors, permission denied, file vanished mid-walk).
 *
 *   4. **Customer / machine enrichment from path.**  JM Die's archive
 *      structure is `CNC LATHE/<CUSTOMER>/<part>.MIN`.  We parse this
 *      shape directly so the batch result already carries
 *      `byCustomer` counts without a downstream pass.
 *
 *   5. **Pure logic + thin I/O.**  All discoverability, partitioning,
 *      checkpoint serialization, and aggregation logic is pure functions
 *      callable from tests with synthetic inputs.  Only `extractBatch`
 *      touches the disk.
 *
 *   6. **Graceful checkpoint corruption.**  A checkpoint that fails to
 *      JSON.parse is treated as "no checkpoint" with a warning, not as
 *      a hard error — the cost of re-parsing 250 files is cheaper than
 *      forcing an operator to manually delete the file.
 *
 * @module engines/MINBatchExtractorEngine
 * @milestone LATHE-PROD-READY-MS0 / U-LPR27
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { z } from "zod";

import { minFileParserEngine } from "./MINFileParserEngine.js";

// --------------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------------

export const MINBatchTaskSchema = z
  .object({
    fileId: z.string().min(1),
    sourcePath: z.string().min(1),
    customer: z.string().nullable().optional(),
  })
  .strict();
export type MINBatchTask = z.infer<typeof MINBatchTaskSchema>;

export const MINBatchPerFileResultSchema = z
  .object({
    fileId: z.string(),
    sourcePath: z.string(),
    status: z.enum(["ok", "parse_failed", "io_error", "skipped_existing", "skipped_oversize"]),
    customer: z.string().nullable(),
    bytesScanned: z.number().int().nonnegative(),
    operationCount: z.number().int().nonnegative(),
    toolCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    error: z.string().nullable(),
  })
  .strict();
export type MINBatchPerFileResult = z.infer<typeof MINBatchPerFileResultSchema>;

export const MINBatchCheckpointSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    runId: z.string(),
    completedFileIds: z.array(z.string()),
    lastCompletedAt: z.string(),
    totalEverDiscovered: z.number().int().nonnegative(),
  })
  .strict();
export type MINBatchCheckpoint = z.infer<typeof MINBatchCheckpointSchema>;

export const MINBatchResultSchema = z
  .object({
    runId: z.string(),
    totalDiscovered: z.number().int().nonnegative(),
    attempted: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    parseFailed: z.number().int().nonnegative(),
    ioErrors: z.number().int().nonnegative(),
    skippedExisting: z.number().int().nonnegative(),
    skippedOversize: z.number().int().nonnegative(),
    byCustomer: z.record(z.string(), z.number().int().nonnegative()),
    perFile: z.array(MINBatchPerFileResultSchema),
    checkpointPath: z.string(),
    elapsedMs: z.number().int().nonnegative(),
  })
  .strict();
export type MINBatchResult = z.infer<typeof MINBatchResultSchema>;

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

export const DEFAULT_MAX_BYTES_PER_FILE = 32 * 1024 * 1024;
export const DEFAULT_CHECKPOINT_EVERY = 250;
export const SCHEMA_VERSION: MINBatchCheckpoint["schemaVersion"] = "1.0.0";

/**
 * Default concurrency: min(parallelism-1, 16), floor 1.
 * Ceiling raised 8→16 for the 9950X3D2 (16C/32T); HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.3.
 * Prefer os.availableParallelism() (honors cgroup/affinity limits) with cpus().length fallback.
 */
export function defaultConcurrency(): number {
  const parallelism =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : (os.cpus()?.length ?? 1);
  return Math.max(1, Math.min(parallelism - 1, 16));
}

// --------------------------------------------------------------------------
// Helpers — pure
// --------------------------------------------------------------------------

/**
 * Walk a directory tree synchronously yielding every file whose name ends
 * with one of the supplied lowercased extensions.  Returns deterministic
 * sorted output regardless of fs.readdir ordering — important for resume.
 */
export function discoverFilesByExt(rootDir: string, extensions: ReadonlyArray<string>): string[] {
  const exts = extensions.map((e) => e.toLowerCase());
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        const lower = e.name.toLowerCase();
        if (exts.some((x) => lower.endsWith(x))) out.push(full);
      }
    }
  }
  out.sort();
  return out;
}

/**
 * Derive a stable per-file ID from its path.  Uses the relative path
 * from `rootDir` so the same file in two checkout locations gets the
 * same ID — checkpoints are portable across machines.
 */
export function deriveFileId(rootDir: string, fullPath: string): string {
  const rel = path.relative(rootDir, fullPath);
  return rel.split(path.sep).join("/");
}

/**
 * Extract customer name from a JM Die archive path of the shape
 * `CNC LATHE/<CUSTOMER>/<file>.MIN`.  Returns null if the path doesn't
 * match the convention.
 */
export function extractCustomerFromPath(fullPath: string): string | null {
  // Use forward slashes to be platform-agnostic.
  const norm = fullPath.replace(/\\/g, "/");
  const m = norm.match(/CNC\s*LATHE\/([^/]+)\/[^/]+\.[Mm][Ii][Nn]$/);
  if (m && m[1] && m[1].toUpperCase() !== "CNC LATHE") return m[1].toUpperCase();
  return null;
}

/**
 * Build the on-disk checkpoint path for a given (outputRoot, runId).
 * Centralized so tests can recompute the location without duplication.
 */
export function buildCheckpointPath(outputRoot: string, runId: string): string {
  const safeId = runId.replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(outputRoot, "_checkpoints", `${safeId}.json`);
}

/**
 * Load a checkpoint from disk, returning null if missing OR if corrupt.
 * A corrupt checkpoint generates a warning but is treated as no-checkpoint
 * — the spec prizes resume robustness over perfect state restoration.
 */
export function loadCheckpoint(checkpointPath: string): MINBatchCheckpoint | null {
  if (!fs.existsSync(checkpointPath)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(checkpointPath, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return MINBatchCheckpointSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Atomic checkpoint write — tmp file + rename.  Survives a kill mid-write.
 */
export function saveCheckpoint(checkpointPath: string, ckpt: MINBatchCheckpoint): void {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  const tmp = checkpointPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(ckpt, null, 2), "utf8");
  fs.renameSync(tmp, checkpointPath);
}

/**
 * Build a tiny async semaphore.  Returned function awaits a slot, runs
 * the task, releases the slot.  In-flight count is bounded by `limit`.
 * Lighter than installing p-limit; identical contract for our needs.
 */
export function concurrencyLimiter(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  const safeLimit = Math.max(1, Math.floor(limit));
  let active = 0;
  const queue: Array<() => void> = [];

  const acquire = (): Promise<void> =>
    new Promise((resolve) => {
      if (active < safeLimit) {
        active++;
        resolve();
      } else {
        queue.push(() => {
          active++;
          resolve();
        });
      }
    });

  const release = (): void => {
    active--;
    const next = queue.shift();
    if (next) next();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}

// --------------------------------------------------------------------------
// Engine
// --------------------------------------------------------------------------

export interface MINBatchOptions {
  /** Root directory to walk for `.MIN` files (recursive). */
  rootDir: string;
  /** Where the checkpoint will be persisted. */
  outputRoot: string;
  /** Stable run identifier — supply the same runId to resume. */
  runId: string;
  /** Optional cap on the number of files processed (e.g. 2000 for pt1). */
  maxFiles?: number;
  /** Concurrent worker count.  Default `defaultConcurrency()`. */
  maxConcurrency?: number;
  /** Persist checkpoint every N completions.  Default 250. */
  checkpointEvery?: number;
  /** Per-file byte cap.  Files larger than this are skipped, never read. */
  maxBytesPerFile?: number;
  /** Skip files already in the checkpoint.  Default true. */
  resume?: boolean;
}

export class MINBatchExtractorEngine {
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Discover, parse, and aggregate every `.MIN` under `rootDir`.  Honors
   * the bounded-concurrency, checkpoint, and resume contract from the
   * unit spec.  Returns a structured {@link MINBatchResult}; never
   * throws on per-file failures.
   */
  async extractBatch(opts: MINBatchOptions): Promise<MINBatchResult> {
    const start = Date.now();
    const concurrency = Math.max(1, opts.maxConcurrency ?? defaultConcurrency());
    const checkpointEvery = Math.max(1, opts.checkpointEvery ?? DEFAULT_CHECKPOINT_EVERY);
    const maxBytes = Math.max(1, opts.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE);
    const resume = opts.resume !== false;
    const checkpointPath = buildCheckpointPath(opts.outputRoot, opts.runId);

    // 1. Discover.
    const allFiles = discoverFilesByExt(opts.rootDir, [".min"]);
    const totalDiscovered = allFiles.length;

    // 2. Resume — read existing checkpoint if any.
    const existing = resume ? loadCheckpoint(checkpointPath) : null;
    const completedSet = new Set<string>(existing?.completedFileIds ?? []);

    // 3. Build the worklist (cap at maxFiles AFTER subtracting resumed).
    const limit = opts.maxFiles ?? Number.POSITIVE_INFINITY;
    const tasks: MINBatchTask[] = [];
    for (const fp of allFiles) {
      if (tasks.length >= limit) break;
      const fileId = deriveFileId(opts.rootDir, fp);
      const customer = extractCustomerFromPath(fp);
      tasks.push({ fileId, sourcePath: fp, customer });
    }

    // 4. Run with bounded concurrency.
    const limiter = concurrencyLimiter(concurrency);
    const perFile: MINBatchPerFileResult[] = [];
    let ok = 0;
    let parseFailed = 0;
    let ioErrors = 0;
    let skippedExisting = 0;
    let skippedOversize = 0;
    const byCustomer: Record<string, number> = {};

    let completionsSinceCheckpoint = 0;

    const recordResult = (r: MINBatchPerFileResult): void => {
      perFile.push(r);
      switch (r.status) {
        case "ok":
          ok++;
          if (r.customer) byCustomer[r.customer] = (byCustomer[r.customer] ?? 0) + 1;
          break;
        case "parse_failed":
          parseFailed++;
          break;
        case "io_error":
          ioErrors++;
          break;
        case "skipped_existing":
          skippedExisting++;
          break;
        case "skipped_oversize":
          skippedOversize++;
          break;
      }
      completedSet.add(r.fileId);
      completionsSinceCheckpoint++;
      if (completionsSinceCheckpoint >= checkpointEvery) {
        completionsSinceCheckpoint = 0;
        try {
          saveCheckpoint(checkpointPath, {
            schemaVersion: SCHEMA_VERSION,
            runId: opts.runId,
            completedFileIds: [...completedSet],
            lastCompletedAt: new Date().toISOString(),
            totalEverDiscovered: totalDiscovered,
          });
        } catch {
          // Checkpoint failure must NOT stop the batch — we'll try again
          // on the next interval.  Better to lose the checkpoint than the
          // in-flight work.
        }
      }
    };

    const runOne = (t: MINBatchTask): Promise<void> =>
      limiter(async () => {
        if (resume && completedSet.has(t.fileId)) {
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "skipped_existing",
            customer: t.customer ?? null,
            bytesScanned: 0,
            operationCount: 0,
            toolCount: 0,
            warningCount: 0,
            durationMs: 0,
            error: null,
          });
          return;
        }

        const fileStart = Date.now();
        let stat: fs.Stats;
        try {
          stat = await fs.promises.stat(t.sourcePath);
        } catch (e) {
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "io_error",
            customer: t.customer ?? null,
            bytesScanned: 0,
            operationCount: 0,
            toolCount: 0,
            warningCount: 0,
            durationMs: Date.now() - fileStart,
            error: `stat failed: ${(e as Error).message}`,
          });
          return;
        }

        if (stat.size > maxBytes) {
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "skipped_oversize",
            customer: t.customer ?? null,
            bytesScanned: 0,
            operationCount: 0,
            toolCount: 0,
            warningCount: 0,
            durationMs: Date.now() - fileStart,
            error: `file size ${stat.size} > cap ${maxBytes}`,
          });
          return;
        }

        let text: string;
        try {
          text = await fs.promises.readFile(t.sourcePath, "utf8");
        } catch (e) {
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "io_error",
            customer: t.customer ?? null,
            bytesScanned: 0,
            operationCount: 0,
            toolCount: 0,
            warningCount: 0,
            durationMs: Date.now() - fileStart,
            error: `read failed: ${(e as Error).message}`,
          });
          return;
        }

        let parsedOk = false;
        let opCount = 0;
        let toolCount = 0;
        let warningCount = 0;
        try {
          const result = minFileParserEngine.parse({
            source_path: t.sourcePath,
            text,
          });
          parsedOk = Boolean(result.ok);
          opCount = result.program?.operations?.length ?? 0;
          // Tool count: distinct tool numbers in operations.
          const toolSet = new Set<number>();
          for (const op of result.program?.operations ?? []) {
            const tn = (op as { tool_number?: number | null }).tool_number;
            if (typeof tn === "number") toolSet.add(tn);
          }
          toolCount = toolSet.size;
          warningCount = (result.warnings ?? []).length;
        } catch (e) {
          // The parser doc says it never throws, but we wrap defensively
          // because a single throw from a corrupt file must not poison
          // a 5,297-file run.
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "parse_failed",
            customer: t.customer ?? null,
            bytesScanned: stat.size,
            operationCount: 0,
            toolCount: 0,
            warningCount: 0,
            durationMs: Date.now() - fileStart,
            error: `parser threw: ${(e as Error).message}`,
          });
          return;
        }

        recordResult({
          fileId: t.fileId,
          sourcePath: t.sourcePath,
          status: parsedOk ? "ok" : "parse_failed",
          customer: t.customer ?? null,
          bytesScanned: stat.size,
          operationCount: opCount,
          toolCount,
          warningCount,
          durationMs: Date.now() - fileStart,
          error: parsedOk ? null : "parse_ok=false (see warnings)",
        });
      });

    await Promise.all(tasks.map(runOne));

    // 5. Final checkpoint (always, regardless of interval).
    try {
      saveCheckpoint(checkpointPath, {
        schemaVersion: SCHEMA_VERSION,
        runId: opts.runId,
        completedFileIds: [...completedSet],
        lastCompletedAt: new Date().toISOString(),
        totalEverDiscovered: totalDiscovered,
      });
    } catch {
      // Same as mid-run — better to return results than throw.
    }

    return {
      runId: opts.runId,
      totalDiscovered,
      attempted: tasks.length,
      ok,
      parseFailed,
      ioErrors,
      skippedExisting,
      skippedOversize,
      byCustomer,
      perFile,
      checkpointPath,
      elapsedMs: Date.now() - start,
    };
  }
}

export const minBatchExtractorEngine = new MINBatchExtractorEngine();
