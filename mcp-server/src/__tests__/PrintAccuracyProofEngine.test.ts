/**
 * Tests for PrintAccuracyProofEngine (PRINT-OCR-100PCT-MS0/U3).
 *
 * Real invariants. The 100% gate is the entire reason this engine exists —
 * every test asserts a specific failure or PASS condition, not just presence.
 *
 * Failure modes covered:
 *   - empty corpus → totalRows=0, isOneHundredPercent=false (vacuous PASS forbidden)
 *   - 1 row, scanStatus=extracted (not verified) → 0% coverage
 *   - 1 row, scanStatus=verified_100pct + approved + accuracy=1.0 → 100%
 *   - 1 row, verified_100pct + accuracy=0.99 → classifier rejects
 *   - Mixed corpus: per-customer coverage % is accurate
 *   - Failed extraction is counted in rowsFailedExtraction
 *   - Pending review surfaces in rowsRequiringReview list
 *   - Operator verdict=rejected → passes100pct=false with reason
 *   - report.isOneHundredPercent strictly requires totalRows > 0
 *   - report sorted by worst customer first
 *   - hook message handles 100% AND below-100% cases
 *   - classifyRow standalone: reason string is informative for each failure
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PrintCorpusTableWriter } from "../engines/PrintCorpusTableWriter.js";
import {
  PrintAccuracyProofEngine,
  classifyRow,
} from "../engines/PrintAccuracyProofEngine.js";
import type { PrintCorpusRow } from "../schemas/PrintCorpusRow.js";
import type { BlueprintExtraction } from "../engines/BlueprintExtractionRAGEngine.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const SHA_E = "e".repeat(64);

function makePage(): BlueprintExtraction {
  return {
    extractionId: "ext-1",
    pdfPath: "/tmp/x.pdf",
    page: 1,
    familyMatchId: null,
    regions: [
      {
        regionId: "r-1",
        dimType: "linear",
        value: "1.0",
        confidence: 0.95,
        confidenceLower: 0.9,
        confidenceUpper: 1.0,
      },
    ],
    sources: [{ kind: "corpus", id: "s-1", title: "t", score: 0.7 }],
    confidenceFloor: "normal",
    contradictionsDetected: [],
    extractedAt: "2026-05-21T00:00:00Z",
    backendId: "test",
  };
}

function makeRow(overrides: Partial<PrintCorpusRow> = {}): PrintCorpusRow {
  return {
    rowId: overrides.rowId ?? "row-1",
    sourceSha256: overrides.sourceSha256 ?? SHA_A,
    sourcePath: overrides.sourcePath ?? "/tmp/x.pdf",
    sourceKind: overrides.sourceKind ?? "jm_die",
    sourceFormat: overrides.sourceFormat ?? "pdf",
    pageCount: 1,
    customer: "customer" in overrides ? (overrides.customer as string | null) : "ITW",
    partNumber: "partNumber" in overrides ? (overrides.partNumber as string | null) : "P-1",
    revision: "revision" in overrides ? (overrides.revision as string | null) : null,
    pages: [makePage()],
    worstConfidenceFloor: overrides.worstConfidenceFloor ?? "normal",
    totalRegions: 1,
    weakestRegionConfidence: overrides.weakestRegionConfidence ?? 0.95,
    scanStatus: overrides.scanStatus ?? "extracted",
    scannedAt: "2026-05-21T00:00:00Z",
    scanLatencyMs: 100,
    groundTruthAvailable: overrides.groundTruthAvailable ?? false,
    groundTruthSource: overrides.groundTruthSource ?? "none",
    accuracyAgainstGroundTruth:
      "accuracyAgainstGroundTruth" in overrides
        ? (overrides.accuracyAgainstGroundTruth as number | null)
        : null,
    accuracyVerifiedAt:
      "accuracyVerifiedAt" in overrides
        ? (overrides.accuracyVerifiedAt as string | null)
        : null,
    requiresOperatorReview: overrides.requiresOperatorReview ?? false,
    operatorReviewedBy:
      "operatorReviewedBy" in overrides
        ? (overrides.operatorReviewedBy as string | null)
        : null,
    operatorReviewedAt:
      "operatorReviewedAt" in overrides
        ? (overrides.operatorReviewedAt as string | null)
        : null,
    operatorVerdict: overrides.operatorVerdict ?? "pending",
    isAnonymizable: true,
    anonymizationBlockedReason: null,
  };
}

function makeVerifiedRow(overrides: Partial<PrintCorpusRow> = {}): PrintCorpusRow {
  return makeRow({
    scanStatus: "verified_100pct",
    operatorVerdict: "approved",
    operatorReviewedBy: "op-1",
    operatorReviewedAt: "2026-05-21T01:00:00Z",
    groundTruthAvailable: true,
    groundTruthSource: "jm_die_inspection",
    accuracyAgainstGroundTruth: 1.0,
    accuracyVerifiedAt: "2026-05-21T01:00:00Z",
    ...overrides,
  });
}

let writerDir: string;
let writer: PrintCorpusTableWriter;
let proof: PrintAccuracyProofEngine;

beforeEach(() => {
  writerDir = fs.mkdtempSync(path.join(os.tmpdir(), "accuracy-proof-test-"));
  writer = new PrintCorpusTableWriter(writerDir);
  proof = new PrintAccuracyProofEngine(writer);
});

afterEach(() => {
  try {
    fs.rmSync(writerDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("classifyRow — per-row verdict", () => {
  it("PASS when verified + approved + accuracy=1.0 + ground-truth available", () => {
    const v = classifyRow(makeVerifiedRow());
    expect(v.passes100pct).toBe(true);
    expect(v.reason).toBe("PASS");
  });

  it("FAIL with reason 'extraction_failed' for extraction_failed status", () => {
    const v = classifyRow(makeRow({ scanStatus: "extraction_failed" }));
    expect(v.passes100pct).toBe(false);
    expect(v.reason).toBe("extraction_failed");
  });

  it("FAIL with reason 'not_yet_verified' for extracted status", () => {
    const v = classifyRow(makeRow({ scanStatus: "extracted" }));
    expect(v.passes100pct).toBe(false);
    expect(v.reason).toContain("not_yet_verified");
    expect(v.reason).toContain("extracted");
  });

  it("FAIL with reason 'ground_truth_missing' for verified row without GT", () => {
    const v = classifyRow(
      makeVerifiedRow({ groundTruthAvailable: false, groundTruthSource: "none" }),
    );
    expect(v.passes100pct).toBe(false);
    expect(v.reason).toBe("ground_truth_missing");
  });

  it("FAIL with reason 'accuracy<1.0' when accuracy=0.99", () => {
    const row = {
      ...makeVerifiedRow(),
      accuracyAgainstGroundTruth: 0.99,
    } as PrintCorpusRow;
    const v = classifyRow(row);
    expect(v.passes100pct).toBe(false);
    expect(v.reason).toContain("accuracy<1.0");
    expect(v.reason).toContain("0.99");
  });

  it("FAIL with reason 'operator_verdict=rejected' for rejected row", () => {
    const row = {
      ...makeVerifiedRow(),
      operatorVerdict: "rejected" as const,
    };
    const v = classifyRow(row);
    expect(v.passes100pct).toBe(false);
    expect(v.reason).toBe("operator_verdict=rejected");
  });

  it("verdict carries row identity for traceability", () => {
    const v = classifyRow(
      makeVerifiedRow({ rowId: "trace-1", sourceSha256: SHA_B, customer: "TraceCo" }),
    );
    expect(v.rowId).toBe("trace-1");
    expect(v.sourceSha256).toBe(SHA_B);
    expect(v.customer).toBe("TraceCo");
  });
});

describe("PrintAccuracyProofEngine.buildReport", () => {
  it("empty corpus → isOneHundredPercent=false (no vacuous PASS)", () => {
    const r = proof.buildReport();
    expect(r.totalRows).toBe(0);
    expect(r.passingRows).toBe(0);
    expect(r.isOneHundredPercent).toBe(false);
    expect(r.overallCoveragePct).toBe(0);
    expect(r.byCustomer).toHaveLength(0);
    expect(r.rowsRequiringReview).toHaveLength(0);
  });

  it("single verified row → 100% coverage + isOneHundredPercent=true", () => {
    writer.write(makeVerifiedRow());
    const r = proof.buildReport();
    expect(r.totalRows).toBe(1);
    expect(r.passingRows).toBe(1);
    expect(r.overallCoveragePct).toBe(100);
    expect(r.isOneHundredPercent).toBe(true);
    expect(r.rowsPendingReview).toBe(0);
    expect(r.rowsFailedExtraction).toBe(0);
  });

  it("single unverified row → 0% coverage + isOneHundredPercent=false", () => {
    writer.write(makeRow({ requiresOperatorReview: true }));
    const r = proof.buildReport();
    expect(r.totalRows).toBe(1);
    expect(r.passingRows).toBe(0);
    expect(r.overallCoveragePct).toBe(0);
    expect(r.isOneHundredPercent).toBe(false);
    expect(r.rowsPendingReview).toBe(1);
    expect(r.rowsRequiringReview).toHaveLength(1);
    expect(r.rowsRequiringReview[0].passes100pct).toBe(false);
  });

  it("mixed: 3 verified + 1 failed + 1 pending → coverage 60%", () => {
    writer.write(makeVerifiedRow({ rowId: "v-1", sourceSha256: SHA_A, customer: "ITW" }));
    writer.write(makeVerifiedRow({ rowId: "v-2", sourceSha256: SHA_B, customer: "ITW" }));
    writer.write(makeVerifiedRow({ rowId: "v-3", sourceSha256: SHA_C, customer: "Alcoa" }));
    writer.write(
      makeRow({
        rowId: "f-1",
        sourceSha256: SHA_D,
        customer: "ITW",
        scanStatus: "extraction_failed",
        worstConfidenceFloor: "low_no_vision",
      }),
    );
    writer.write(
      makeRow({
        rowId: "p-1",
        sourceSha256: SHA_E,
        customer: "Alcoa",
        requiresOperatorReview: true,
      }),
    );
    const r = proof.buildReport();
    expect(r.totalRows).toBe(5);
    expect(r.passingRows).toBe(3);
    expect(r.overallCoveragePct).toBe(60);
    expect(r.rowsFailedExtraction).toBe(1);
    expect(r.rowsPendingReview).toBe(1);
    expect(r.isOneHundredPercent).toBe(false);
  });

  it("per-customer coverage % computed accurately (ITW partial + Alcoa 100%)", () => {
    // ITW: 2 verified + 1 failed = 66.67%
    writer.write(makeVerifiedRow({ rowId: "v-1", sourceSha256: SHA_A, customer: "ITW" }));
    writer.write(makeVerifiedRow({ rowId: "v-2", sourceSha256: SHA_B, customer: "ITW" }));
    writer.write(
      makeRow({
        rowId: "f-1",
        sourceSha256: SHA_C,
        customer: "ITW",
        scanStatus: "extraction_failed",
        worstConfidenceFloor: "low_no_vision",
      }),
    );
    // Alcoa: 1 verified = 100%
    writer.write(makeVerifiedRow({ rowId: "v-3", sourceSha256: SHA_D, customer: "Alcoa" }));

    const r = proof.buildReport();
    expect(r.byCustomer).toHaveLength(2);
    const itw = r.byCustomer.find((c) => c.customer === "ITW")!;
    const alcoa = r.byCustomer.find((c) => c.customer === "Alcoa")!;
    expect(itw.totalRows).toBe(3);
    expect(itw.passingRows).toBe(2);
    expect(itw.coveragePct).toBeCloseTo(200 / 3, 5);
    expect(alcoa.totalRows).toBe(1);
    expect(alcoa.passingRows).toBe(1);
    expect(alcoa.coveragePct).toBe(100);

    // Sorted worst-first.
    expect(r.byCustomer[0].customer).toBe("ITW");
    expect(r.byCustomer[1].customer).toBe("Alcoa");
  });

  it("null-customer rows grouped under '<no-customer>'", () => {
    writer.write(
      makeRow({ sourceSha256: SHA_A, customer: null, scanStatus: "extracted" }),
    );
    const r = proof.buildReport();
    expect(r.byCustomer).toHaveLength(1);
    expect(r.byCustomer[0].customer).toBe("<no-customer>");
    expect(r.byCustomer[0].totalRows).toBe(1);
    expect(r.byCustomer[0].passingRows).toBe(0);
  });

  it("rowsWithGroundTruth count is exactly the GT-available rows", () => {
    writer.write(makeVerifiedRow({ sourceSha256: SHA_A })); // GT available
    writer.write(
      makeRow({
        sourceSha256: SHA_B,
        groundTruthAvailable: true,
        groundTruthSource: "operator_confirmed",
        operatorVerdict: "approved",
        operatorReviewedBy: "op-2",
        operatorReviewedAt: "2026-05-21T01:00:00Z",
        scanStatus: "verified_100pct",
        accuracyAgainstGroundTruth: 1.0,
      }),
    ); // GT available
    writer.write(makeRow({ sourceSha256: SHA_C, requiresOperatorReview: true })); // no GT
    const r = proof.buildReport();
    expect(r.rowsWithGroundTruth).toBe(2);
  });

  it("schemaVersion is '1.0.0'", () => {
    const r = proof.buildReport();
    expect(r.schemaVersion).toBe("1.0.0");
  });

  it("nowFn override gives deterministic generatedAt", () => {
    const frozen = new Date("2026-05-21T15:00:00.000Z");
    const r = proof.buildReport({ nowFn: () => frozen });
    expect(r.generatedAt).toBe("2026-05-21T15:00:00.000Z");
  });

  it("rowsRequiringReview list contains every pending-review row's verdict", () => {
    writer.write(
      makeRow({ rowId: "p-1", sourceSha256: SHA_A, requiresOperatorReview: true }),
    );
    writer.write(
      makeRow({ rowId: "p-2", sourceSha256: SHA_B, requiresOperatorReview: true }),
    );
    writer.write(makeVerifiedRow({ rowId: "v-1", sourceSha256: SHA_C }));
    const r = proof.buildReport();
    expect(r.rowsRequiringReview).toHaveLength(2);
    const ids = r.rowsRequiringReview.map((v) => v.rowId).sort();
    expect(ids).toEqual(["p-1", "p-2"]);
    expect(r.rowsRequiringReview.every((v) => v.passes100pct === false)).toBe(true);
  });
});

describe("PrintAccuracyProofEngine.formatHookMessage", () => {
  it("100% case message names total + omits FAILED marker", () => {
    writer.write(makeVerifiedRow());
    const r = proof.buildReport();
    const msg = proof.formatHookMessage(r);
    expect(msg).toContain("100% extraction accuracy proven");
    expect(msg).toContain("1 prints");
    expect(msg).not.toContain("FAILED");
  });

  it("below-100% message names worst customer + rows.jsonl source", () => {
    writer.write(makeVerifiedRow({ sourceSha256: SHA_A, customer: "Alcoa" }));
    writer.write(
      makeRow({ sourceSha256: SHA_B, customer: "ITW", scanStatus: "extracted" }),
    );
    const r = proof.buildReport();
    const msg = proof.formatHookMessage(r);
    expect(msg).toContain("FAILED");
    expect(msg).toContain("1/2");
    expect(msg).toContain("ITW");
    expect(msg).toContain("rows.jsonl");
  });
});
