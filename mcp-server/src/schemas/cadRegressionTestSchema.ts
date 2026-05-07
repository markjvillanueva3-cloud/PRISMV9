/**
 * PRISM CAD-INFRA — CAD Regression Test State Zod Schemas
 * =========================================================
 *
 * Zod schemas for CAD regression test run state. Used by the CAD regression
 * test runner to validate batch state files loaded from / persisted to disk,
 * ensuring structural integrity across resume cycles, parallel workers, and
 * dashboard consumers.
 *
 * Schemas:
 *   TestFileEntrySchema — per-file test result record
 *   TestBatchSchema     — top-level batch container with stats + file map
 *
 * Types (z.infer exports):
 *   TestFileEntry, TestBatch, TestStatus, ErrorType
 *
 * Helpers:
 *   parseTestBatch(), validateTestBatch()
 *
 * @milestone CAD-INFRA-MS0/U-CINF03
 * @module schemas/cadRegressionTestSchema
 */

import { z } from "zod";

// ─── Enums ─────────────────────────────────────────────────────────────────

/**
 * Lifecycle status of a single CAD test file within a batch run.
 *
 * pending   — queued, not yet dispatched
 * running   — worker has started processing
 * pass      — comparison succeeded within tolerance
 * fail      — comparison exceeded tolerance or assertion failed
 * skip      — excluded by filter or missing baseline
 * error     — unexpected exception / infrastructure failure
 */
export const TestStatusEnum = z.enum([
  "pending",
  "running",
  "pass",
  "fail",
  "skip",
  "error",
]);
export type TestStatus = z.infer<typeof TestStatusEnum>;

/**
 * Categorises the root-cause class when status is "fail" or "error".
 * Use "none" for passing / skipped entries.
 *
 * format     — input file unreadable or unsupported format
 * parse      — CAD kernel parse error
 * generation — toolpath / CAM generation error
 * comparison — diff exceeded tolerance threshold
 * timeout    — worker exceeded wall-clock limit
 * crash      — unhandled exception / OOM
 * none       — no error (pass / skip)
 */
export const ErrorTypeEnum = z.enum([
  "format",
  "parse",
  "generation",
  "comparison",
  "timeout",
  "crash",
  "none",
]);
export type ErrorType = z.infer<typeof ErrorTypeEnum>;

// ─── TestFileEntry ──────────────────────────────────────────────────────────

/**
 * Per-file test result record stored inside TestBatch.files.
 * Keyed by fileId in the parent record map.
 */
export const TestFileEntrySchema = z.object({
  /** Stable identifier for the CAD file under test (e.g. SHA-256 prefix or path hash). */
  fileId: z.string().min(1).describe("Stable identifier for the CAD test file"),

  /** Current lifecycle status of this test entry. */
  status: TestStatusEnum.describe("Lifecycle status of the test entry"),

  /** Root-cause classification when status is fail or error; use 'none' otherwise. */
  errorType: ErrorTypeEnum.describe("Root-cause category of failure or 'none'"),

  /** Wall-clock duration of the test execution in milliseconds (0 if not yet completed). */
  durationMs: z
    .number()
    .nonnegative()
    .describe("Execution wall-clock duration in milliseconds"),

  /** Number of automatic retries attempted before reaching current status. */
  retries: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of automatic retries attempted"),

  /** File-system or object-store paths for test artifacts produced during the run. */
  artifacts: z
    .object({
      /** Path to the expected (baseline) step/toolpath file. */
      expectedStep: z.string().optional().describe("Path to expected baseline step file"),
      /** Path to the actual (generated) step/toolpath file. */
      actualStep: z.string().optional().describe("Path to actual generated step file"),
      /** Path to a rendered PNG diff overlay image. */
      diffPng: z.string().optional().describe("Path to PNG diff overlay image"),
      /** Path to the captured error log for this file. */
      errorLog: z.string().optional().describe("Path to error log for this file"),
    })
    .describe("Artifact paths produced during the test run"),

  /** ISO 8601 timestamp when test execution started; absent if pending. */
  startedAt: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 timestamp when test execution started"),

  /** ISO 8601 timestamp when test execution completed; absent if running/pending. */
  completedAt: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 timestamp when test execution completed"),
});

export type TestFileEntry = z.infer<typeof TestFileEntrySchema>;

// ─── TestBatch ──────────────────────────────────────────────────────────────

/**
 * Top-level batch container. Persisted to disk as JSON between worker
 * checkpoints and loaded by the dashboard / resume logic.
 *
 * schemaVersion is a literal(1) so migrations can hard-fail on version mismatch.
 */
export const TestBatchSchema = z.object({
  /** UUID uniquely identifying this batch run. */
  batchId: z.string().uuid().describe("UUID identifying this batch run"),

  /** Schema version — must be 1. Bump triggers migration. */
  schemaVersion: z.literal(1).describe("State file schema version (must be 1)"),

  /** Aggregate counters derived from the files map. Updated at each checkpoint. */
  stats: z
    .object({
      /** Total number of files in the batch. */
      total: z.number().int().nonnegative().describe("Total files in batch"),
      /** Files that have reached a terminal state (pass|fail|skip|error). */
      completed: z.number().int().nonnegative().describe("Files in terminal state"),
      /** Files that passed comparison. */
      passed: z.number().int().nonnegative().describe("Files that passed"),
      /** Files that failed comparison or assertion. */
      failed: z.number().int().nonnegative().describe("Files that failed"),
      /** Files that were skipped. */
      skipped: z.number().int().nonnegative().describe("Files that were skipped"),
      /** Files that ended in error (infrastructure/crash). */
      errored: z.number().int().nonnegative().describe("Files that errored"),
    })
    .describe("Aggregate batch statistics"),

  /** ISO 8601 timestamp of the most recent state checkpoint write. */
  lastCheckpoint: z
    .string()
    .datetime()
    .describe("ISO 8601 timestamp of last checkpoint write"),

  /** ISO 8601 timestamp when this batch was created. */
  createdAt: z.string().datetime().describe("ISO 8601 timestamp when batch was created"),

  /** ISO 8601 timestamp of last update to any field in this document. */
  updatedAt: z
    .string()
    .datetime()
    .describe("ISO 8601 timestamp of last document update"),

  /**
   * Map of fileId → TestFileEntry.
   * Using z.record(z.string(), ...) to allow arbitrary string keys.
   */
  files: z
    .record(z.string(), TestFileEntrySchema)
    .describe("Map of fileId to test file entry"),
});

export type TestBatch = z.infer<typeof TestBatchSchema>;

// ─── Parse / Validate Helpers ───────────────────────────────────────────────

/**
 * Parse and validate a test batch JSON object. Returns validated TestBatch or throws
 * a ZodError with full path annotations on failure.
 */
export function parseTestBatch(data: unknown): TestBatch {
  return TestBatchSchema.parse(data);
}

/**
 * Safely validate a test batch JSON object.
 * Returns { success: true, data } on success or { success: false, error } on failure.
 * Never throws — suitable for use in resume/checkpoint loaders.
 */
export function validateTestBatch(data: unknown): {
  success: boolean;
  data?: TestBatch;
  error?: z.ZodError;
} {
  const result = TestBatchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
