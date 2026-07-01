/**
 * QuotingTrainingLoopEngine — Docustrata quote-execution variance (U-QP-DOCUSTRATA-VARIANCE, charlie 2026-06-03).
 *
 * Consumes the Docustrata invoice document by measuring how close JM's actual invoices were to the
 * quoted prices (a quote-execution-accuracy metric, DISTINCT from the FMV under-quote assessment).
 * Verifies the FRESHNESS PREFLIGHT (soul: no consuming a stale bootstrap distribution unflagged) +
 * the variance math. All assertions are concrete-value.
 */
import { describe, it, expect } from "vitest";
import {
  assessQuoteExecutionVariance,
  docustrataIsPlaceholder,
  type DocustrataDoc,
} from "../engines/QuotingTrainingLoopEngine.js";

// Placeholder/bootstrap doc (mirrors the real curated fixture's `source`). band 5%:
//  L1 quote100/inv110 → +10% (above, outside band) · L2 100/90 → -10% (below, outside) · L3 100/102 → +2% (within)
const DOC_PLACEHOLDER: DocustrataDoc = {
  source: "manual-curation-bootstrap",
  note: "iter42 bootstrap fixture — PLACEHOLDER until real invoice extraction lands",
  invoices: [
    { customer: "ATF", part_id: "P1", predicted_quote_usd: 100, actual_invoice_usd: 110 },
    { customer: "ATF", part_id: "P2", predicted_quote_usd: 100, actual_invoice_usd: 90 },
    { customer: "ALLFAST", part_id: "P3", predicted_quote_usd: 100, actual_invoice_usd: 102 },
  ],
};

describe("docustrataIsPlaceholder — freshness preflight", () => {
  it("flags bootstrap / manual-curation / placeholder sources as placeholder", () => {
    expect(docustrataIsPlaceholder({ source: "manual-curation-bootstrap" })).toBe(true);
    expect(docustrataIsPlaceholder({ note: "this is a PLACEHOLDER until real extraction" })).toBe(true);
    expect(docustrataIsPlaceholder({ source: "bootstrap-fixture" })).toBe(true);
  });
  it("treats a clean (real-extraction) source as NOT placeholder", () => {
    expect(docustrataIsPlaceholder({ source: "pdf-extraction-v2", note: "verified real invoices" })).toBe(false);
  });
  it("treats absent/null doc as placeholder (safe — never silently consumed as real)", () => {
    expect(docustrataIsPlaceholder(null)).toBe(true);
    expect(docustrataIsPlaceholder(undefined)).toBe(true);
  });
});

describe("assessQuoteExecutionVariance — quote vs invoice accuracy", () => {
  it("classifies above/below/within-band and computes mean abs variance", () => {
    const a = assessQuoteExecutionVariance(DOC_PLACEHOLDER, { bandPct: 5 });
    expect(a.ok).toBe(true);
    expect(a.total_lines).toBe(3);
    // above/below = direction (sign); within = magnitude (|var|<=band) — orthogonal axes that overlap.
    expect(a.invoiced_above_quote_count).toBe(2); // L1 +10% AND L3 +2% are both > 0 (above quote)
    expect(a.invoiced_below_quote_count).toBe(1); // L2 -10%
    expect(a.within_band_count).toBe(1); // L3 +2% (|2| <= 5) — also counted in "above", by design
    // mean |variance| = (10 + 10 + 2) / 3 = 7.33
    expect(a.mean_abs_variance_pct).toBe(7.33);
  });

  it("flags placeholder source ADVISORY-ONLY (soul: must not feed the live calibration factor)", () => {
    const a = assessQuoteExecutionVariance(DOC_PLACEHOLDER);
    expect(a.source_is_placeholder).toBe(true);
    expect(a.advisory).toBe(true);
    expect(a.caveat).toContain("MUST NOT feed");
  });

  it("a real (non-placeholder) source is not flagged + carries the distinct-metric caveat", () => {
    const real: DocustrataDoc = {
      source: "pdf-extraction-v2",
      note: "verified",
      invoices: [{ customer: "X", part_id: "R1", predicted_quote_usd: 200, actual_invoice_usd: 205 }],
    };
    const a = assessQuoteExecutionVariance(real, { bandPct: 5 });
    expect(a.source_is_placeholder).toBe(false);
    expect(a.within_band_count).toBe(1); // +2.5% within band 5
    expect(a.caveat).toContain("distinct from the FMV under-quote");
  });

  it("worst_variances sorted by absolute variance descending", () => {
    const a = assessQuoteExecutionVariance(DOC_PLACEHOLDER, { bandPct: 5, topN: 2 });
    expect(a.worst_variances.length).toBe(2);
    // L1 (|10|) and L2 (|10|) outrank L3 (|2|); both 10 — the top two must both be the 10% lines
    expect(Math.abs(a.worst_variances[0].variance_pct)).toBe(10);
    expect(Math.abs(a.worst_variances[1].variance_pct)).toBe(10);
  });

  it("skips quote<=0 (no ratio) and non-finite rows", () => {
    const doc: DocustrataDoc = {
      source: "real",
      invoices: [
        { customer: "A", part_id: "OK", predicted_quote_usd: 100, actual_invoice_usd: 110 },
        { customer: "B", part_id: "ZERO", predicted_quote_usd: 0, actual_invoice_usd: 50 },
        { customer: "C", part_id: "NAN", predicted_quote_usd: NaN, actual_invoice_usd: 100 },
      ],
    };
    const a = assessQuoteExecutionVariance(doc);
    expect(a.total_lines).toBe(1); // only the valid OK row
  });

  it("empty/null doc → ok:false, zero lines, placeholder-safe", () => {
    const a = assessQuoteExecutionVariance(null);
    expect(a.ok).toBe(false);
    expect(a.total_lines).toBe(0);
    expect(a.source_is_placeholder).toBe(true);
    expect(a.mean_abs_variance_pct).toBe(0);
  });
});
