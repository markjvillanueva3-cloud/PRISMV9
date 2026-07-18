/**
 * PrintAccuracyProofEngine — 100% accuracy proof harness for the corpus.
 *
 * PRINT-OCR-100PCT-MS0/U3 — reads every PrintCorpusRow written by U2,
 * cross-validates against ground truth (GroundTruthRegistryEngine + JM-DIE
 * inspection data + Docustrata + operator-confirmed), and produces a
 * coverage report. The goal-complete-gate Stop hook reads this report and
 * BLOCKS goal-completion below 100%.
 *
 * Design properties:
 *   - **Fail loud below 100%** (per R12). Coverage is a triple:
 *       (rows_with_ground_truth, rows_passing_100pct, rows_total)
 *     A row "passes" iff scanStatus="verified_100pct" AND
 *     accuracyAgainstGroundTruth===1.0 AND operatorVerdict="approved".
 *   - **Per-customer coverage** — separate coverage % per customer to
 *     pinpoint where the gap is.
 *   - **No silent acceptance** — rows with confidenceFloor !== "normal" or
 *     accuracyAgainstGroundTruth < 1.0 surface in the report as
 *     `requires_operator_review`. The harness NEVER auto-flips a row to
 *     verified_100pct; only an operator can.
 *   - **Streaming** — uses writer.iterAllRows() so it scales to 76,166 rows.
 *   - **Idempotent** — running the harness twice produces the same report.
 *
 * Used by:
 *   - .claude/hooks/print-accuracy-100pct-gate.mjs (Stop hook) — reads
 *     report; blocks Stop if coverage<100% AND goal is the 100% directive.
 *   - U4 wiki+tribal batch generator — pattern-mines the
 *     `requires_operator_review` list to find weak-spot patterns.
 */

import type { PrintCorpusTableWriter } from "./PrintCorpusTableWriter.js";
import type {
  PrintCorpusRow,
  ScanStatus,
  GroundTruthSource,
} from "../schemas/PrintCorpusRow.js";

export interface AccuracyVerdict {
  rowId: string;
  sourceSha256: string;
  sourcePath: string;
  customer: string | null;
  passes100pct: boolean;
  reason: string;
  scanStatus: ScanStatus;
  groundTruthAvailable: boolean;
  groundTruthSource: GroundTruthSource;
  accuracyAgainstGroundTruth: number | null;
  weakestRegionConfidence: number;
  requiresOperatorReview: boolean;
}

export interface CustomerCoverage {
  customer: string;
  totalRows: number;
  passingRows: number;
  withGroundTruth: number;
  pendingReview: number;
  coveragePct: number;
}

export interface AccuracyReport {
  generatedAt: string;
  totalRows: number;
  passingRows: number;
  rowsWithGroundTruth: number;
  rowsPendingReview: number;
  rowsFailedExtraction: number;
  rowsRejected: number;
  overallCoveragePct: number;
  isOneHundredPercent: boolean;
  byCustomer: CustomerCoverage[];
  rowsRequiringReview: AccuracyVerdict[];
  /** Schema version for downstream consumers. */
  schemaVersion: "1.0.0";
}

const PASS_PCT = 100;

/** Classify a single row against the 100% gate. */
export function classifyRow(row: PrintCorpusRow): AccuracyVerdict {
  const base = {
    rowId: row.rowId,
    sourceSha256: row.sourceSha256,
    sourcePath: row.sourcePath,
    customer: row.customer,
    scanStatus: row.scanStatus,
    groundTruthAvailable: row.groundTruthAvailable,
    groundTruthSource: row.groundTruthSource,
    accuracyAgainstGroundTruth: row.accuracyAgainstGroundTruth,
    weakestRegionConfidence: row.weakestRegionConfidence,
    requiresOperatorReview: row.requiresOperatorReview,
  };

  if (row.scanStatus === "extraction_failed") {
    return { ...base, passes100pct: false, reason: "extraction_failed" };
  }
  if (row.scanStatus === "rejected_below_100pct") {
    return { ...base, passes100pct: false, reason: "rejected_below_100pct" };
  }
  if (row.scanStatus !== "verified_100pct") {
    return { ...base, passes100pct: false, reason: `not_yet_verified (status=${row.scanStatus})` };
  }
  if (!row.groundTruthAvailable) {
    return { ...base, passes100pct: false, reason: "ground_truth_missing" };
  }
  if (row.accuracyAgainstGroundTruth !== 1.0) {
    return {
      ...base,
      passes100pct: false,
      reason: `accuracy<1.0 (actual=${row.accuracyAgainstGroundTruth})`,
    };
  }
  if (row.operatorVerdict !== "approved") {
    return { ...base, passes100pct: false, reason: `operator_verdict=${row.operatorVerdict}` };
  }
  return { ...base, passes100pct: true, reason: "PASS" };
}

export class PrintAccuracyProofEngine {
  public readonly schemaVersion = "1.0.0" as const;

  constructor(private readonly writer: PrintCorpusTableWriter) {}

  /** Build the full accuracy report by streaming all rows. */
  buildReport(opts: { nowFn?: () => Date } = {}): AccuracyReport {
    const now = opts.nowFn ?? (() => new Date());
    let totalRows = 0;
    let passingRows = 0;
    let rowsWithGroundTruth = 0;
    let rowsPendingReview = 0;
    let rowsFailedExtraction = 0;
    let rowsRejected = 0;
    const byCustomerMap = new Map<string, CustomerCoverage>();
    const rowsRequiringReview: AccuracyVerdict[] = [];

    for (const row of this.writer.iterAllRows()) {
      totalRows++;
      const verdict = classifyRow(row);

      if (verdict.passes100pct) passingRows++;
      if (row.groundTruthAvailable) rowsWithGroundTruth++;
      if (row.requiresOperatorReview && row.operatorVerdict === "pending") {
        rowsPendingReview++;
        rowsRequiringReview.push(verdict);
      }
      if (row.scanStatus === "extraction_failed") rowsFailedExtraction++;
      if (row.scanStatus === "rejected_below_100pct") rowsRejected++;

      const customerKey = row.customer ?? "<no-customer>";
      const cc = byCustomerMap.get(customerKey) ?? {
        customer: customerKey,
        totalRows: 0,
        passingRows: 0,
        withGroundTruth: 0,
        pendingReview: 0,
        coveragePct: 0,
      };
      cc.totalRows++;
      if (verdict.passes100pct) cc.passingRows++;
      if (row.groundTruthAvailable) cc.withGroundTruth++;
      if (row.requiresOperatorReview && row.operatorVerdict === "pending") cc.pendingReview++;
      byCustomerMap.set(customerKey, cc);
    }

    // Finalise per-customer percentages.
    const byCustomer: CustomerCoverage[] = [];
    for (const cc of byCustomerMap.values()) {
      cc.coveragePct = cc.totalRows === 0 ? 0 : (cc.passingRows / cc.totalRows) * PASS_PCT;
      byCustomer.push(cc);
    }
    byCustomer.sort((a, b) => a.coveragePct - b.coveragePct); // worst first

    const overallCoveragePct = totalRows === 0 ? 0 : (passingRows / totalRows) * PASS_PCT;
    // 100% means: every row passes AND there's at least one row (no vacuous PASS).
    const isOneHundredPercent = totalRows > 0 && passingRows === totalRows;

    return {
      generatedAt: now().toISOString(),
      totalRows,
      passingRows,
      rowsWithGroundTruth,
      rowsPendingReview,
      rowsFailedExtraction,
      rowsRejected,
      overallCoveragePct,
      isOneHundredPercent,
      byCustomer,
      rowsRequiringReview,
      schemaVersion: "1.0.0",
    };
  }

  /** Convenience: short verdict suitable for a Stop-hook block message. */
  formatHookMessage(report: AccuracyReport): string {
    if (report.isOneHundredPercent) {
      return `✓ 100% extraction accuracy proven across ${report.totalRows} prints.`;
    }
    const failed = report.totalRows - report.passingRows;
    const worst = report.byCustomer[0];
    const worstStr = worst
      ? ` worst customer: ${worst.customer} (${worst.coveragePct.toFixed(2)}% of ${worst.totalRows})`
      : "";
    return [
      `✗ 100% accuracy gate FAILED.`,
      `Coverage: ${report.passingRows}/${report.totalRows} = ${report.overallCoveragePct.toFixed(2)}%`,
      `(${failed} prints not yet verified;${worstStr})`,
      `Pending operator review: ${report.rowsPendingReview} · failed extraction: ${report.rowsFailedExtraction}`,
      `Source: state/shared/print-corpus-tables/rows.jsonl`,
    ].join(" ");
  }
}
