/**
 * cadRegressionTestSchema — Zod boundary-validation tests (CAD-INFRA-MS0/U-CINF03)
 *
 * Verifies that TestBatchSchema and TestFileEntrySchema accept well-formed
 * payloads and reject malformed input with structured ZodErrors.
 *
 * 10 test cases:
 *  1. valid minimal batch (no artifacts, no timestamps on entries)
 *  2. valid full batch (all optional fields populated)
 *  3. invalid status enum on a file entry
 *  4. invalid errorType enum on a file entry
 *  5. missing schemaVersion on batch
 *  6. wrong schemaVersion literal (value 2 instead of 1)
 *  7. negative durationMs (violated nonnegative constraint)
 *  8. non-integer retries (fractional number)
 *  9. missing batchId
 * 10. malformed datetime string on startedAt
 *
 * @milestone CAD-INFRA-MS0/U-CINF03
 */

import { describe, it, expect } from "vitest";
import {
  TestBatchSchema,
  TestFileEntrySchema,
  parseTestBatch,
  validateTestBatch,
} from "../schemas/cadRegressionTestSchema.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const VALID_FILE_ENTRY = {
  fileId: "abc123",
  status: "pass",
  errorType: "none",
  durationMs: 1234,
  retries: 0,
  artifacts: {},
};

const VALID_BATCH = {
  batchId: "550e8400-e29b-41d4-a716-446655440000",
  schemaVersion: 1,
  stats: {
    total: 1,
    completed: 1,
    passed: 1,
    failed: 0,
    skipped: 0,
    errored: 0,
  },
  lastCheckpoint: "2026-04-19T00:00:00.000Z",
  createdAt: "2026-04-19T00:00:00.000Z",
  updatedAt: "2026-04-19T00:00:00.000Z",
  files: {
    abc123: VALID_FILE_ENTRY,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TestBatchSchema (CAD-INFRA-MS0/U-CINF03)", () => {

  // Case 1 — valid minimal batch
  it("accepts a valid minimal batch (no optional file timestamps or artifacts)", () => {
    const result = validateTestBatch(VALID_BATCH);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.batchId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.data!.schemaVersion).toBe(1);
      expect(result.data!.stats.total).toBe(1);
      expect(result.data!.files["abc123"].status).toBe("pass");
    }
  });

  // Case 2 — valid full batch with all optional fields populated
  it("accepts a full batch with optional timestamps and all artifact paths", () => {
    const fullEntry = {
      ...VALID_FILE_ENTRY,
      status: "fail",
      errorType: "comparison",
      durationMs: 5678,
      retries: 2,
      startedAt: "2026-04-19T00:01:00.000Z",
      completedAt: "2026-04-19T00:01:05.678Z",
      artifacts: {
        expectedStep: "/artifacts/expected.step",
        actualStep: "/artifacts/actual.step",
        diffPng: "/artifacts/diff.png",
        errorLog: "/artifacts/error.log",
      },
    };
    const batch = { ...VALID_BATCH, files: { file1: fullEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.files["file1"].errorType).toBe("comparison");
      expect(result.data!.files["file1"].artifacts.diffPng).toBe("/artifacts/diff.png");
    }
  });

  // Case 3 — invalid status enum
  it("rejects an invalid status enum value on a file entry", () => {
    const badEntry = { ...VALID_FILE_ENTRY, status: "unknown-status" };
    const batch = { ...VALID_BATCH, files: { abc123: badEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error!.flatten();
      // The error path leads into files.abc123.status
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/status/);
    }
  });

  // Case 4 — invalid errorType enum
  it("rejects an invalid errorType enum value on a file entry", () => {
    const badEntry = { ...VALID_FILE_ENTRY, errorType: "network" };
    const batch = { ...VALID_BATCH, files: { abc123: badEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/errorType/);
    }
  });

  // Case 5 — missing schemaVersion
  it("rejects batch with missing schemaVersion", () => {
    const { schemaVersion: _omit, ...noVersion } = VALID_BATCH;
    const result = validateTestBatch(noVersion);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/schemaVersion/);
    }
  });

  // Case 6 — wrong schemaVersion literal (2 instead of 1)
  it("rejects batch with schemaVersion literal 2 (must be exactly 1)", () => {
    const batch = { ...VALID_BATCH, schemaVersion: 2 };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/schemaVersion/);
    }
  });

  // Case 7 — negative durationMs
  it("rejects negative durationMs (violates nonnegative constraint)", () => {
    const badEntry = { ...VALID_FILE_ENTRY, durationMs: -1 };
    const batch = { ...VALID_BATCH, files: { abc123: badEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/durationMs/);
    }
  });

  // Case 8 — non-integer retries
  it("rejects fractional retries (violates int constraint)", () => {
    const badEntry = { ...VALID_FILE_ENTRY, retries: 1.5 };
    const batch = { ...VALID_BATCH, files: { abc123: badEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/retries/);
    }
  });

  // Case 9 — missing batchId
  it("rejects batch with missing batchId", () => {
    const { batchId: _omit, ...noBatchId } = VALID_BATCH;
    const result = validateTestBatch(noBatchId);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/batchId/);
    }
  });

  // Case 10 — malformed datetime on startedAt
  it("rejects a malformed datetime string on startedAt", () => {
    const badEntry = { ...VALID_FILE_ENTRY, startedAt: "not-a-date" };
    const batch = { ...VALID_BATCH, files: { abc123: badEntry } };
    const result = validateTestBatch(batch);
    expect(result.success).toBe(false);
    if (!result.success) {
      const allIssues = JSON.stringify(result.error!.issues);
      expect(allIssues).toMatch(/startedAt/);
    }
  });

});

// ─── parseTestBatch (throws on invalid) ─────────────────────────────────────

describe("parseTestBatch()", () => {
  it("returns typed TestBatch on valid input", () => {
    const batch = parseTestBatch(VALID_BATCH);
    expect(batch.batchId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(batch.schemaVersion).toBe(1);
  });

  it("throws ZodError on invalid input", () => {
    expect(() => parseTestBatch({ batchId: "not-a-uuid" })).toThrow();
  });
});

// ─── TestFileEntrySchema (standalone) ───────────────────────────────────────

describe("TestFileEntrySchema standalone", () => {
  it("accepts all valid status enum values", () => {
    const statuses = ["pending", "running", "pass", "fail", "skip", "error"] as const;
    for (const status of statuses) {
      const result = TestFileEntrySchema.safeParse({ ...VALID_FILE_ENTRY, status });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid errorType enum values", () => {
    const types = ["format", "parse", "generation", "comparison", "timeout", "crash", "none"] as const;
    for (const errorType of types) {
      const result = TestFileEntrySchema.safeParse({ ...VALID_FILE_ENTRY, errorType });
      expect(result.success).toBe(true);
    }
  });
});
