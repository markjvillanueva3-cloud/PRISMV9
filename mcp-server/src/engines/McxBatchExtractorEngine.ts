/**
 * McxBatchExtractorEngine — LATHE-PROD-READY-MS0/U-LPR28
 * =======================================================
 *
 * Bounded-concurrency batch extractor for the JM Die Mastercam binary
 * corpus — 3,713 `.mcx-8` + 1,825 `.MCX` + future `.mcam`.  Sibling
 * implementation to {@link ./MINBatchExtractorEngine}: same checkpoint
 * shape, same atomic write+rename, same skip-if-completed resume
 * contract.  Differences:
 *
 *   • Source format: binary (delegates to {@link mcxProgramParserEngine}
 *     for metadata extraction).  No SDK dependency.
 *   • Per-file output: McxProgramMetadata (NOT MIN ParseResult).
 *   • Aggregations: byFormat (.mcx / .mcx-8 / .mcx-9 / .mcam),
 *     byMagicVerified (true/false), byCustomer (parsed from path).
 *
 * Why a sibling class instead of a single shared engine?  The two
 * parsers have different per-file APIs (text+source_path vs
 * Buffer+filename), different status semantics (MIN's parse_ok carries
 * a populated program; Mcx's parse_ok asserts the *metadata* parsed
 * cleanly, not that the file is a real Mastercam container — that's
 * the magic_verified field).  Premature abstraction here would force
 * downstream callers to constantly disambiguate; a tiny duplication of
 * the 30-line concurrencyLimiter is the cheaper trade.
 *
 * Hard contract (every choice has a reason worth defending):
 *
 *   1. **Never throws on per-file failures.**  A single corrupt .mcx-8
 *      cannot poison a 5,538-file run.  Both file I/O and parser calls
 *      are wrapped; status is carried in `MCxBatchPerFileResult.status`.
 *
 *   2. **Bounded concurrency (default `min(availableParallelism-1, 16)`).**  Same
 *      handwritten async semaphore as the MIN sibling — no p-limit
 *      dependency, no install conflict with peer chats.
 *
 *   3. **Atomic checkpoint write.**  Tmp + rename so a crash mid-write
 *      never leaves a torn JSON file.
 *
 *   4. **Resume-by-default.**  A re-run with the same `runId` skips
 *      already-completed file IDs.  `resume: false` opts out.
 *
 *   5. **Bounded I/O.**  Honors the McxProgramParserEngine 64 MiB cap
 *      via opts.maxBytes — defaults to 32 MiB for a JM Die corpus
 *      that tops out around 1.5 MiB per file.
 *
 *   6. **Pure helpers + thin I/O.**  All discovery, partitioning,
 *      checkpoint serialization, and aggregation logic is exported
 *      pure functions callable directly from tests.  Only
 *      `extractBatch` touches the disk.
 *
 * @module engines/McxBatchExtractorEngine
 * @milestone LATHE-PROD-READY-MS0 / U-LPR28
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { z } from "zod";

import {
  mcxProgramParserEngine,
  type McxFormat,
  type McxProgramMetadata,
} from "./McxProgramParserEngine.js";

// --------------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------------

export const McxBatchTaskSchema = z
  .object({
    fileId: z.string().min(1),
    sourcePath: z.string().min(1),
    customer: z.string().nullable().optional(),
  })
  .strict();
export type McxBatchTask = z.infer<typeof McxBatchTaskSchema>;

export const McxBatchPerFileResultSchema = z
  .object({
    fileId: z.string(),
    sourcePath: z.string(),
    status: z.enum([
      "ok",
      "parse_failed",
      "io_error",
      "skipped_existing",
      "skipped_oversize",
    ]),
    customer: z.string().nullable(),
    format: z.enum([".mcx", ".mcx-8", ".mcx-9", ".mcam", "unknown"]),
    magicVerified: z.boolean(),
    bytesScanned: z.number().int().nonnegative(),
    zlibChunks: z.number().int().nonnegative(),
    estimatedOperations: z.number().int().nonnegative(),
    embeddedStringCount: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    error: z.string().nullable(),
  })
  .strict();
export type McxBatchPerFileResult = z.infer<typeof McxBatchPerFileResultSchema>;

export const McxBatchCheckpointSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    runId: z.string(),
    completedFileIds: z.array(z.string()),
    lastCompletedAt: z.string(),
    totalEverDiscovered: z.number().int().nonnegative(),
  })
  .strict();
export type McxBatchCheckpoint = z.infer<typeof McxBatchCheckpointSchema>;

export const McxBatchResultSchema = z
  .object({
    runId: z.string(),
    totalDiscovered: z.number().int().nonnegative(),
    attempted: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    parseFailed: z.number().int().nonnegative(),
    ioErrors: z.number().int().nonnegative(),
    skippedExisting: z.number().int().nonnegative(),
    skippedOversize: z.number().int().nonnegative(),
    byFormat: z.record(z.string(), z.number().int().nonnegative()),
    byCustomer: z.record(z.string(), z.number().int().nonnegative()),
    byMagicVerified: z.object({
      verified: z.number().int().nonnegative(),
      unverified: z.number().int().nonnegative(),
    }),
    perFile: z.array(McxBatchPerFileResultSchema),
    checkpointPath: z.string(),
    elapsedMs: z.number().int().nonnegative(),
  })
  .strict();
export type McxBatchResult = z.infer<typeof McxBatchResultSchema>;

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

export const DEFAULT_MAX_BYTES_PER_FILE = 32 * 1024 * 1024;
export const DEFAULT_CHECKPOINT_EVERY = 250;
export const SCHEMA_VERSION: McxBatchCheckpoint["schemaVersion"] = "1.0.0";

export const MCX_EXTENSIONS: ReadonlyArray<string> = Object.freeze([
  ".mcx",
  ".mcx-8",
  ".mcx-9",
  ".mcam",
]);

/**
 * Default concurrency: min(parallelism-1, 16), floor 1.
 * Ceiling raised 8→16 for the 9950X3D2 (16C/32T); HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.3.
 * Prefer os.availableParallelism() (honors cgroup/affinity limits) with cpus().length fallback.
 * Clone-of MINBatchExtractorEngine.defaultConcurrency (keep both in lockstep).
 */
export function defaultConcurrency(): number {
  const parallelism =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : (os.cpus()?.length ?? 1);
  return Math.max(1, Math.min(parallelism - 1, 16));
}

// --------------------------------------------------------------------------
// Helpers — pure, tested directly
// --------------------------------------------------------------------------

/**
 * Walk a directory tree synchronously yielding every file whose lowercased
 * basename ends with one of the supplied lowercased extensions.  Returns
 * deterministic sorted output regardless of fs.readdir ordering — required
 * for resume-correctness.
 */
export function discoverFilesByExt(
  rootDir: string,
  extensions: ReadonlyArray<string>,
): string[] {
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

/** Stable per-file ID = forward-slash-normalised path relative to rootDir. */
export function deriveFileId(rootDir: string, fullPath: string): string {
  const rel = path.relative(rootDir, fullPath);
  return rel.split(path.sep).join("/");
}

/**
 * Extract customer name from a JM Die archive path of the shape
 * `CNC LATHE/<CUSTOMER>/<file>.mcx*` or
 * `CNC OKUMA MULTUS/<CUSTOMER>/<file>.mcx*` etc.  Returns null when the
 * convention isn't matched — downstream callers treat null as "unknown
 * customer" without error.
 */
export function extractCustomerFromPath(fullPath: string): string | null {
  const norm = fullPath.replace(/\\/g, "/");
  // Match any JM Die machine root (CNC LATHE / CNC MILL HAAS / WIRE EDM /
  // ROKU-ROKU / CNC OKUMA MULTUS / OKUMA / HAAS-HURCO).
  const m = norm.match(
    /(?:CNC\s+LATHE|CNC\s+MILL\s+HAAS|WIRE\s+EDM|ROKU[- ]?ROKU|CNC\s+OKUMA\s+MULTUS|HAAS-HURCO|OKUMA)\/([^/]+)\/[^/]+\.(?:mcx-?\d?|mcam)$/i,
  );
  if (m && m[1]) {
    const cand = m[1].toUpperCase();
    // Filter the machine-root word itself appearing as the customer slot
    if (
      cand !== "CNC LATHE" &&
      cand !== "CNC MILL HAAS" &&
      cand !== "WIRE EDM" &&
      cand !== "OKUMA"
    ) {
      return cand;
    }
  }
  return null;
}

export function buildCheckpointPath(outputRoot: string, runId: string): string {
  const safeId = runId.replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(outputRoot, "_checkpoints", `mcx-${safeId}.json`);
}

export function loadCheckpoint(checkpointPath: string): McxBatchCheckpoint | null {
  if (!fs.existsSync(checkpointPath)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(checkpointPath, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return McxBatchCheckpointSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function saveCheckpoint(
  checkpointPath: string,
  ckpt: McxBatchCheckpoint,
): void {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  const tmp = checkpointPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(ckpt, null, 2), "utf8");
  fs.renameSync(tmp, checkpointPath);
}

export function concurrencyLimiter(
  limit: number,
): <T>(task: () => Promise<T>) => Promise<T> {
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

export interface McxBatchOptions {
  rootDir: string;
  outputRoot: string;
  runId: string;
  maxFiles?: number;
  maxConcurrency?: number;
  checkpointEvery?: number;
  maxBytesPerFile?: number;
  resume?: boolean;
}

export class McxBatchExtractorEngine {
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Discover, parse, and aggregate every Mastercam binary under
   * `rootDir`.  Honors the bounded-concurrency, checkpoint, and resume
   * contract.  Returns a structured {@link McxBatchResult}; never
   * throws on per-file failures.
   */
  async extractBatch(opts: McxBatchOptions): Promise<McxBatchResult> {
    const start = Date.now();
    const concurrency = Math.max(1, opts.maxConcurrency ?? defaultConcurrency());
    const checkpointEvery = Math.max(
      1,
      opts.checkpointEvery ?? DEFAULT_CHECKPOINT_EVERY,
    );
    const maxBytes = Math.max(
      1,
      opts.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE,
    );
    const resume = opts.resume !== false;
    const checkpointPath = buildCheckpointPath(opts.outputRoot, opts.runId);

    // 1. Discover.
    const allFiles = discoverFilesByExt(opts.rootDir, MCX_EXTENSIONS);
    const totalDiscovered = allFiles.length;

    // 2. Resume — read existing checkpoint if any.
    const existing = resume ? loadCheckpoint(checkpointPath) : null;
    const completedSet = new Set<string>(existing?.completedFileIds ?? []);

    // 3. Build the worklist (cap at maxFiles AFTER discovery).
    const limit = opts.maxFiles ?? Number.POSITIVE_INFINITY;
    const tasks: McxBatchTask[] = [];
    for (const fp of allFiles) {
      if (tasks.length >= limit) break;
      const fileId = deriveFileId(opts.rootDir, fp);
      const customer = extractCustomerFromPath(fp);
      tasks.push({ fileId, sourcePath: fp, customer });
    }

    // 4. Run with bounded concurrency.
    const limiter = concurrencyLimiter(concurrency);
    const perFile: McxBatchPerFileResult[] = [];
    let ok = 0;
    let parseFailed = 0;
    let ioErrors = 0;
    let skippedExisting = 0;
    let skippedOversize = 0;
    const byFormat: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    let verifiedCount = 0;
    let unverifiedCount = 0;

    let completionsSinceCheckpoint = 0;

    const recordResult = (r: McxBatchPerFileResult): void => {
      perFile.push(r);
      switch (r.status) {
        case "ok":
          ok++;
          byFormat[r.format] = (byFormat[r.format] ?? 0) + 1;
          if (r.customer) byCustomer[r.customer] = (byCustomer[r.customer] ?? 0) + 1;
          if (r.magicVerified) verifiedCount++;
          else unverifiedCount++;
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
          // Same contract as MIN sibling — checkpoint failure must not
          // stop the batch, we'll try again on the next interval.
        }
      }
    };

    const placeholderFor = (
      t: McxBatchTask,
      status: McxBatchPerFileResult["status"],
      durationMs: number,
      error: string | null,
      bytesScanned: number = 0,
    ): McxBatchPerFileResult => ({
      fileId: t.fileId,
      sourcePath: t.sourcePath,
      status,
      customer: t.customer ?? null,
      format: "unknown",
      magicVerified: false,
      bytesScanned,
      zlibChunks: 0,
      estimatedOperations: 0,
      embeddedStringCount: 0,
      durationMs,
      error,
    });

    const runOne = (t: McxBatchTask): Promise<void> =>
      limiter(async () => {
        if (resume && completedSet.has(t.fileId)) {
          recordResult(placeholderFor(t, "skipped_existing", 0, null));
          return;
        }

        const fileStart = Date.now();
        let stat: fs.Stats;
        try {
          stat = await fs.promises.stat(t.sourcePath);
        } catch (e) {
          recordResult(
            placeholderFor(
              t,
              "io_error",
              Date.now() - fileStart,
              `stat failed: ${(e as Error).message}`,
            ),
          );
          return;
        }

        if (stat.size > maxBytes) {
          recordResult(
            placeholderFor(
              t,
              "skipped_oversize",
              Date.now() - fileStart,
              `file size ${stat.size} > cap ${maxBytes}`,
            ),
          );
          return;
        }

        let metadata: McxProgramMetadata;
        try {
          metadata = mcxProgramParserEngine.parseFile(t.sourcePath, {
            maxBytes,
          });
        } catch (e) {
          // mcxProgramParserEngine documents "never throws" — defensive
          // wrap so a single regression cannot kill a 5,538-file run.
          recordResult({
            fileId: t.fileId,
            sourcePath: t.sourcePath,
            status: "parse_failed",
            customer: t.customer ?? null,
            format: "unknown",
            magicVerified: false,
            bytesScanned: stat.size,
            zlibChunks: 0,
            estimatedOperations: 0,
            embeddedStringCount: 0,
            durationMs: Date.now() - fileStart,
            error: `parser threw: ${(e as Error).message}`,
          });
          return;
        }

        const status: McxBatchPerFileResult["status"] = metadata.parse_ok
          ? "ok"
          : "parse_failed";
        const fmt: McxFormat = metadata.format;
        recordResult({
          fileId: t.fileId,
          sourcePath: t.sourcePath,
          status,
          customer: t.customer ?? null,
          format: fmt,
          magicVerified: metadata.magic_verified,
          bytesScanned: metadata.bytes_scanned,
          zlibChunks: metadata.zlib_chunks,
          estimatedOperations: metadata.estimated_operations,
          embeddedStringCount: metadata.embedded_strings.length,
          durationMs: Date.now() - fileStart,
          error: status === "ok" ? null : (metadata.errors[0] ?? "parse_ok=false"),
        });
      });

    await Promise.all(tasks.map(runOne));

    // 5. Final checkpoint, regardless of interval.
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
      byFormat,
      byCustomer,
      byMagicVerified: { verified: verifiedCount, unverified: unverifiedCount },
      perFile,
      checkpointPath,
      elapsedMs: Date.now() - start,
    };
  }
}

export const mcxBatchExtractorEngine = new McxBatchExtractorEngine();
