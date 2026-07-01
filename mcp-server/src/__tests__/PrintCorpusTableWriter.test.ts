/**
 * Tests for the PrintCorpusRow schema + PrintCorpusTableWriter.
 *
 * PRINT-OCR-100PCT-MS0/U1 — every test verifies a REAL invariant (no
 * .toBeDefined() stubs). Failure modes covered:
 *   - schema rejects invalid sha (length, hex)
 *   - schema rejects out-of-range enums
 *   - HARD RULE R2: verified_100pct without operator approval rejected
 *   - HARD RULE R5: operator fields consistency
 *   - writer dedups on sourceSha256
 *   - writer index + rows.jsonl roundtrip (read returns exactly what was written)
 *   - checkpoint roundtrip (resumability invariant)
 *   - per-customer sub-table mirrors main jsonl
 *   - iterAllRows yields every written row, in write order
 *   - computeWorstFloor returns weakest floor (rank-based)
 *   - aggregateConfidence sums regions + finds weakest confidence
 *   - empty-pages edge case
 *   - missing-sha read returns null
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  PrintCorpusRowSchema,
  type PrintCorpusRow,
  computeWorstFloor,
  aggregateConfidence,
} from "../schemas/PrintCorpusRow.js";
import type { BlueprintExtraction } from "../engines/BlueprintExtractionRAGEngine.js";
import { PrintCorpusTableWriter } from "../engines/PrintCorpusTableWriter.js";

const VALID_SHA = "a".repeat(64);
const VALID_SHA_B = "b".repeat(64);
const VALID_SHA_C = "c".repeat(64);

function makePage(overrides: Partial<BlueprintExtraction> = {}): BlueprintExtraction {
  return {
    extractionId: overrides.extractionId ?? "ext-1",
    pdfPath: overrides.pdfPath ?? "/tmp/test.pdf",
    page: overrides.page ?? 1,
    customer: overrides.customer,
    familyMatchId: overrides.familyMatchId ?? null,
    regions: overrides.regions ?? [
      {
        regionId: "r-1",
        dimType: "linear",
        value: "25.4",
        confidence: 0.92,
        confidenceLower: 0.85,
        confidenceUpper: 0.97,
      },
    ],
    sources: overrides.sources ?? [
      { kind: "corpus", id: "s-1", title: "JM Die ITW family", score: 0.81 },
    ],
    confidenceFloor: overrides.confidenceFloor ?? "normal",
    contradictionsDetected: overrides.contradictionsDetected ?? [],
    extractedAt: overrides.extractedAt ?? "2026-05-21T00:00:00Z",
    backendId: overrides.backendId ?? "test-backend-v1",
  };
}

function makeRow(overrides: Partial<PrintCorpusRow> = {}): PrintCorpusRow {
  const pages = overrides.pages ?? [makePage()];
  // Nullable fields use `in`-check so an explicit `null` override is honored
  // (??-coalescing would replace null with the default — masking the test).
  return {
    rowId: overrides.rowId ?? "row-1",
    sourceSha256: overrides.sourceSha256 ?? VALID_SHA,
    sourcePath: overrides.sourcePath ?? "/tmp/test.pdf",
    sourceKind: overrides.sourceKind ?? "jm_die",
    sourceFormat: overrides.sourceFormat ?? "pdf",
    pageCount: overrides.pageCount ?? pages.length,
    customer: "customer" in overrides ? (overrides.customer as string | null) : "ITW",
    partNumber: "partNumber" in overrides ? (overrides.partNumber as string | null) : "PN-001",
    revision: "revision" in overrides ? (overrides.revision as string | null) : "A",
    pages,
    worstConfidenceFloor: overrides.worstConfidenceFloor ?? "normal",
    totalRegions: overrides.totalRegions ?? 1,
    weakestRegionConfidence: overrides.weakestRegionConfidence ?? 0.92,
    scanStatus: overrides.scanStatus ?? "extracted",
    scannedAt: overrides.scannedAt ?? "2026-05-21T00:00:00Z",
    scanLatencyMs: overrides.scanLatencyMs ?? 1200,
    groundTruthAvailable: overrides.groundTruthAvailable ?? false,
    groundTruthSource: overrides.groundTruthSource ?? "none",
    accuracyAgainstGroundTruth: overrides.accuracyAgainstGroundTruth ?? null,
    accuracyVerifiedAt: overrides.accuracyVerifiedAt ?? null,
    requiresOperatorReview: overrides.requiresOperatorReview ?? true,
    operatorReviewedBy: overrides.operatorReviewedBy ?? null,
    operatorReviewedAt: overrides.operatorReviewedAt ?? null,
    operatorVerdict: overrides.operatorVerdict ?? "pending",
    isAnonymizable: overrides.isAnonymizable ?? true,
    anonymizationBlockedReason: overrides.anonymizationBlockedReason ?? null,
  };
}

let tmpDir: string;
let writer: PrintCorpusTableWriter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-corpus-test-"));
  writer = new PrintCorpusTableWriter(tmpDir);
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("PrintCorpusRow schema", () => {
  it("accepts a valid minimal row", () => {
    const row = makeRow();
    expect(() => PrintCorpusRowSchema.parse(row)).not.toThrow();
  });

  it("R1: rejects sha256 of wrong length", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(makeRow({ sourceSha256: "abc123" })),
    ).toThrow(/64-char/);
  });

  it("R1: rejects sha256 with non-hex characters", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({ sourceSha256: "z".repeat(64) }),
      ),
    ).toThrow(/64-char/);
  });

  it("R2: rejects verified_100pct with operatorVerdict=pending", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({
          scanStatus: "verified_100pct",
          operatorVerdict: "pending",
          groundTruthAvailable: true,
        }),
      ),
    ).toThrow(/R2/);
  });

  it("R2: rejects verified_100pct without groundTruthAvailable", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({
          scanStatus: "verified_100pct",
          operatorVerdict: "approved",
          operatorReviewedBy: "op-1",
          operatorReviewedAt: "2026-05-21T01:00:00Z",
          groundTruthAvailable: false,
        }),
      ),
    ).toThrow(/R2/);
  });

  it("R2: accepts verified_100pct when both gates are satisfied", () => {
    const row = makeRow({
      scanStatus: "verified_100pct",
      operatorVerdict: "approved",
      operatorReviewedBy: "op-1",
      operatorReviewedAt: "2026-05-21T01:00:00Z",
      groundTruthAvailable: true,
      groundTruthSource: "jm_die_inspection",
      accuracyAgainstGroundTruth: 1.0,
      accuracyVerifiedAt: "2026-05-21T01:00:00Z",
    });
    expect(() => PrintCorpusRowSchema.parse(row)).not.toThrow();
  });

  it("R5: rejects approved verdict with null reviewedBy", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({
          operatorVerdict: "approved",
          operatorReviewedBy: null,
          operatorReviewedAt: "2026-05-21T01:00:00Z",
        }),
      ),
    ).toThrow(/R5/);
  });

  it("R5: rejects pending verdict with non-null reviewedAt", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({
          operatorVerdict: "pending",
          operatorReviewedBy: null,
          operatorReviewedAt: "2026-05-21T01:00:00Z",
        }),
      ),
    ).toThrow(/R5/);
  });

  it("rejects unknown scanStatus", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({ scanStatus: "scanning_in_quantum_superposition" as never }),
      ),
    ).toThrow();
  });

  it("rejects empty pages array", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(makeRow({ pages: [] })),
    ).toThrow();
  });

  it("rejects accuracyAgainstGroundTruth > 1", () => {
    expect(() =>
      PrintCorpusRowSchema.parse(
        makeRow({
          accuracyAgainstGroundTruth: 1.5,
        }),
      ),
    ).toThrow();
  });
});

describe("computeWorstFloor", () => {
  it("returns the lowest-rank floor across pages", () => {
    const pages: BlueprintExtraction[] = [
      makePage({ confidenceFloor: "normal" }),
      makePage({ confidenceFloor: "low_no_vision" }),
      makePage({ confidenceFloor: "low_no_prior" }),
    ];
    expect(computeWorstFloor(pages)).toBe("low_no_vision");
  });

  it("returns normal when all pages are normal", () => {
    const pages = [
      makePage({ confidenceFloor: "normal" }),
      makePage({ confidenceFloor: "normal" }),
    ];
    expect(computeWorstFloor(pages)).toBe("normal");
  });

  it("throws on empty pages array", () => {
    expect(() => computeWorstFloor([])).toThrow(/empty/);
  });
});

describe("aggregateConfidence", () => {
  it("sums regions and finds weakest per-region confidence", () => {
    const pages: BlueprintExtraction[] = [
      makePage({
        regions: [
          {
            regionId: "r-a",
            dimType: "linear",
            value: "1",
            confidence: 0.9,
            confidenceLower: 0.8,
            confidenceUpper: 1.0,
          },
          {
            regionId: "r-b",
            dimType: "diameter",
            value: "2",
            confidence: 0.6,
            confidenceLower: 0.5,
            confidenceUpper: 0.7,
          },
        ],
      }),
      makePage({
        regions: [
          {
            regionId: "r-c",
            dimType: "linear",
            value: "3",
            confidence: 0.75,
            confidenceLower: 0.65,
            confidenceUpper: 0.85,
          },
        ],
      }),
    ];
    const agg = aggregateConfidence(pages);
    expect(agg.totalRegions).toBe(3);
    expect(agg.weakestRegionConfidence).toBeCloseTo(0.6, 6);
  });

  it("returns 0 weakest when no pages have any regions", () => {
    const pages = [makePage({ regions: [] })];
    const agg = aggregateConfidence(pages);
    expect(agg.totalRegions).toBe(0);
    expect(agg.weakestRegionConfidence).toBe(0);
  });
});

describe("PrintCorpusTableWriter writes + reads", () => {
  it("writes a row and reads it back identically", () => {
    const row = makeRow();
    const writeResult = writer.write(row);
    expect(writeResult.status).toBe("written");
    expect(writeResult.rowId).toBe(row.rowId);
    expect(writeResult.byteOffset).toBe(0);

    const got = writer.read(row.sourceSha256);
    expect(got).not.toBeNull();
    expect(got!.rowId).toBe(row.rowId);
    expect(got!.sourceSha256).toBe(row.sourceSha256);
    expect(got!.pages).toEqual(row.pages);
    expect(got!.customer).toBe(row.customer);
  });

  it("dedups on sourceSha256 — second write is already_exists", () => {
    const row = makeRow();
    writer.write(row);
    const second = writer.write({ ...row, rowId: "row-1-attempt-2" });
    expect(second.status).toBe("already_exists");
    expect(second.rowId).toBe("row-1-attempt-2");
    // Only ONE row should be on disk.
    expect(writer.totalRowCount()).toBe(1);
    // First write's rowId persisted (not overwritten).
    const got = writer.read(row.sourceSha256);
    expect(got!.rowId).toBe("row-1");
  });

  it("has(sha) returns true after write, false for unknown sha", () => {
    const row = makeRow();
    expect(writer.has(row.sourceSha256)).toBe(false);
    writer.write(row);
    expect(writer.has(row.sourceSha256)).toBe(true);
    expect(writer.has(VALID_SHA_B)).toBe(false);
  });

  it("read returns null for unknown sha", () => {
    expect(writer.read(VALID_SHA)).toBeNull();
  });

  it("writes 3 rows and iterAllRows yields all 3 in order", () => {
    const a = makeRow({ rowId: "row-a", sourceSha256: VALID_SHA });
    const b = makeRow({ rowId: "row-b", sourceSha256: VALID_SHA_B });
    const c = makeRow({ rowId: "row-c", sourceSha256: VALID_SHA_C });
    writer.write(a);
    writer.write(b);
    writer.write(c);
    const all = Array.from(writer.iterAllRows());
    expect(all).toHaveLength(3);
    expect(all.map((r) => r.rowId)).toEqual(["row-a", "row-b", "row-c"]);
  });

  it("allShas returns every written sha", () => {
    writer.write(makeRow({ rowId: "a", sourceSha256: VALID_SHA }));
    writer.write(makeRow({ rowId: "b", sourceSha256: VALID_SHA_B }));
    const shas = writer.allShas();
    expect(shas.sort()).toEqual([VALID_SHA, VALID_SHA_B].sort());
  });

  it("rejects schema-violating row at write time", () => {
    expect(() =>
      writer.write(makeRow({ sourceSha256: "bad" })),
    ).toThrow();
    // Nothing should be written.
    expect(writer.totalRowCount()).toBe(0);
  });
});

describe("PrintCorpusTableWriter checkpoint", () => {
  it("creates checkpoint on first write and updates on subsequent writes", () => {
    expect(writer.readCheckpoint()).toBeNull();
    writer.write(makeRow({ sourceSha256: VALID_SHA, scannedAt: "2026-05-21T00:00:00Z" }));
    const cp1 = writer.readCheckpoint();
    expect(cp1).not.toBeNull();
    expect(cp1!.schemaVersion).toBe("1.0.0");
    expect(cp1!.totalRowsWritten).toBe(1);
    expect(cp1!.shasSeen).toContain(VALID_SHA);

    writer.write(
      makeRow({ sourceSha256: VALID_SHA_B, scannedAt: "2026-05-21T01:00:00Z" }),
    );
    const cp2 = writer.readCheckpoint();
    expect(cp2!.totalRowsWritten).toBe(2);
    expect(cp2!.shasSeen).toContain(VALID_SHA_B);
    expect(cp2!.lastScannedAt).toBe("2026-05-21T01:00:00Z");
  });

  it("dedup write does NOT inflate checkpoint counts", () => {
    writer.write(makeRow({ sourceSha256: VALID_SHA }));
    writer.write(makeRow({ sourceSha256: VALID_SHA, rowId: "dup" }));
    const cp = writer.readCheckpoint();
    expect(cp!.totalRowsWritten).toBe(1);
    expect(cp!.shasSeen).toHaveLength(1);
  });
});

describe("PrintCorpusTableWriter per-customer sub-table", () => {
  it("mirrors rows into by-customer/<slug>.jsonl", () => {
    writer.write(makeRow({ customer: "ITW", sourceSha256: VALID_SHA }));
    writer.write(
      makeRow({ customer: "Alcoa", sourceSha256: VALID_SHA_B }),
    );
    const itwPath = path.join(tmpDir, "by-customer", "ITW.jsonl");
    const alcoaPath = path.join(tmpDir, "by-customer", "Alcoa.jsonl");
    expect(fs.existsSync(itwPath)).toBe(true);
    expect(fs.existsSync(alcoaPath)).toBe(true);
    expect(fs.readFileSync(itwPath, "utf-8").split("\n").filter(Boolean)).toHaveLength(1);
    expect(fs.readFileSync(alcoaPath, "utf-8").split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("sanitizes customer names with special chars in the slug", () => {
    writer.write(
      makeRow({ customer: "A&P / Smith Co.", sourceSha256: VALID_SHA }),
    );
    const files = fs.readdirSync(path.join(tmpDir, "by-customer"));
    expect(files).toHaveLength(1);
    // Slug should be all alnum/_/- only.
    expect(files[0]).toMatch(/^[a-zA-Z0-9_-]+\.jsonl$/);
  });

  it("does NOT create a by-customer entry when customer is null", () => {
    writer.write(makeRow({ customer: null, sourceSha256: VALID_SHA }));
    const files = fs.readdirSync(path.join(tmpDir, "by-customer"));
    expect(files).toHaveLength(0);
  });
});

describe("PrintCorpusTableWriter atomicity", () => {
  it("index.json + rows.jsonl stay consistent after malformed-input rejection", () => {
    writer.write(makeRow({ sourceSha256: VALID_SHA }));
    // Attempt a bad write — should throw without touching disk.
    expect(() =>
      writer.write(makeRow({ sourceSha256: "bad", rowId: "r-bad" })),
    ).toThrow();
    // Valid write again — should land at offset > 0 (not overwriting).
    const r = writer.write(makeRow({ sourceSha256: VALID_SHA_B, rowId: "r-2" }));
    expect(r.status).toBe("written");
    expect(r.byteOffset).toBeGreaterThan(0);
    expect(writer.totalRowCount()).toBe(2);
  });
});
