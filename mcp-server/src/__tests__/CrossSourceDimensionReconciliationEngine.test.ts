/**
 * Tests for CrossSourceDimensionReconciliationEngine — reconciling dimension candidates
 * from print(OCR) / CAD(geometry) / CNC(toolpath) into a consensus set.
 * Real reference-value assertions (R9): exact consensus values, the noisy-OR confidence
 * boost for cross-source agreement, same-source-not-double-counted, label-keyed conflict
 * flagging, type-aware (linear vs angular) tolerance, and fail-loud drop of garbage.
 */
import { describe, it, expect } from "vitest";
import {
  CrossSourceDimensionReconciliationEngine,
  crossSourceDimensionReconciliationEngine,
  valuesMatch,
  combineConfidence,
  DEFAULT_SOURCE_CONFIDENCE,
  type DimCandidate,
} from "../engines/CrossSourceDimensionReconciliationEngine.js";

const eng = new CrossSourceDimensionReconciliationEngine();

describe("valuesMatch — type-aware tolerance", () => {
  it("linear: 1% relative + 0.05mm absolute floor", () => {
    expect(valuesMatch(25.4, 25.404, "linear")).toBe(true);   // 0.016% < 1%
    expect(valuesMatch(25.4, 26.0, "linear")).toBe(false);     // 2.36% > 1%
    expect(valuesMatch(0.5, 0.54, "linear")).toBe(true);        // abs floor saves it
    expect(valuesMatch(0.5, 0.6, "linear")).toBe(false);
  });
  it("angular uses a 0.5° band, not a relative %", () => {
    expect(valuesMatch(45.0, 45.3, "angular")).toBe(true);
    expect(valuesMatch(45.0, 46.0, "angular")).toBe(false);
  });
  it("non-finite never matches", () => {
    expect(valuesMatch(NaN, 5, "linear")).toBe(false);
    expect(valuesMatch(5, Infinity, "linear")).toBe(false);
  });
});

describe("combineConfidence — noisy-OR agreement boost", () => {
  it("single source returns its own confidence", () => {
    expect(combineConfidence([0.7])).toBe(0.7);
  });
  it("two independent sources compound: 1−(1−0.7)(1−0.95) = 0.985", () => {
    expect(combineConfidence([0.7, 0.95])).toBe(0.985);
  });
  it("caps at 0.99 (never claims certainty)", () => {
    expect(combineConfidence([0.9, 0.9, 0.95])).toBe(0.99);
  });
  it("empty → 0", () => {
    expect(combineConfidence([])).toBe(0);
  });
});

describe("reconcile — cross-source agreement", () => {
  it("3 sources agreeing on a diameter → ONE confirmed dim, capped confidence, consensus value", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7 },
      { value_mm: 10.02, type: "diameter", source: "cad", confidence: 0.95 },
      { value_mm: 9.99, type: "diameter", source: "cnc", confidence: 0.9 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.status).toBe("confirmed");
    expect(d.sources.sort()).toEqual(["cad", "cnc", "print"]);
    expect(d.metric_sources.sort()).toEqual(["cad", "print"]); // CNC is presence-only, does NOT vote
    expect(d.cnc_presence).toBe(true);            // but CNC corroborates the feature was machined
    expect(d.value_trusted).toBe(true);
    expect(d.confidence).toBe(0.985);             // noisy-OR of the 2 METRIC sources (cnc excluded)
    expect(d.value_mm).toBeCloseTo(10.0, 1);      // confidence-weighted consensus of print+cad only
    expect(d.spread_mm).toBe(0.02);               // 10.02 − 10.0 (metric spread; cnc 9.99 not counted)
    expect(r.coverage.confirmed).toBe(1);
    expect(r.coverage.multi_source_rate).toBe(1);
  });

  it("2 sources agreeing → confirmed, confidence 0.985", () => {
    const r = eng.reconcile([
      { value_mm: 50.0, type: "linear", source: "print", confidence: 0.7 },
      { value_mm: 50.03, type: "linear", source: "cad", confidence: 0.95 },
    ]);
    expect(r.dimensions[0].status).toBe("confirmed");
    expect(r.dimensions[0].confidence).toBe(0.985);
    expect(r.dimensions[0].sources.length).toBe(2);
  });

  it("confidence-weighted consensus pulls toward the higher-confidence source", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "linear", source: "print", confidence: 0.7 },
      { value_mm: 10.05, type: "linear", source: "cad", confidence: 0.95 },
    ]);
    // (10.0*0.7 + 10.05*0.95)/1.65 = 10.0288...
    expect(r.dimensions[0].value_mm).toBeCloseTo(10.0288, 3);
  });

  it("single source → single_source status + that source's prior confidence", () => {
    const r = eng.reconcile([{ value_mm: 25.4, type: "diameter", source: "print" }]);
    expect(r.dimensions[0].status).toBe("single_source");
    expect(r.dimensions[0].confidence).toBe(DEFAULT_SOURCE_CONFIDENCE.print); // 0.70 prior
    expect(r.coverage.confirmed).toBe(0);
    expect(r.coverage.single_source).toBe(1);
  });

  it("two reads from the SAME source are NOT double-counted as independent corroboration", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7 },
      { value_mm: 10.01, type: "diameter", source: "print", confidence: 0.7 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].sources).toEqual(["print"]);
    expect(r.dimensions[0].status).toBe("single_source");
    expect(r.dimensions[0].confidence).toBe(0.7);  // NOT 0.91 — same source isn't independent
    expect(r.dimensions[0].contributions).toHaveLength(2);
  });
});

describe("reconcile — conflict detection (flag, never average)", () => {
  it("same labeled feature with divergent values across sources → flagged conflict, NOT merged", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7, label: "bore" },
      { value_mm: 12.0, type: "diameter", source: "cad", confidence: 0.95, label: "bore" },
    ]);
    expect(r.dimensions).toHaveLength(2);          // NOT averaged into one 11.0
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].label).toBe("bore");
    expect(r.conflicts[0].type).toBe("diameter");
    expect(r.conflicts[0].spread_mm).toBe(2);
    expect(r.conflicts[0].values).toHaveLength(2);
  });

  it("different unlabeled features of the same type → two valid dims, NO false conflict", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print" },
      { value_mm: 20.0, type: "diameter", source: "cad" },
    ]);
    expect(r.dimensions).toHaveLength(2);
    expect(r.conflicts).toHaveLength(0);
  });
});

describe("reconcile — CNC is presence-only (never votes the value, no gradient poison)", () => {
  it("a CNC G-code coordinate corroborates the feature but NEVER pulls the metric consensus value", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7 },
      { value_mm: 10.02, type: "diameter", source: "cad", confidence: 0.95 },
      { value_mm: 9.99, type: "diameter", source: "cnc", confidence: 0.9 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.status).toBe("confirmed");                       // 2 DIMENSIONAL sources agree
    expect(d.metric_sources.sort()).toEqual(["cad", "print"]);
    expect(d.cnc_presence).toBe(true);
    expect(d.value_trusted).toBe(true);
    // value = (10.0*0.7 + 10.02*0.95)/1.65 = 10.0115 — the CNC 9.99 is EXCLUDED.
    // (a naive 3-way weighted mean would be 10.0039 — proving the toolpath coord did not poison it)
    expect(d.value_mm).toBeCloseTo(10.0115, 3);
    expect(d.confidence).toBe(0.985);                         // noisy-OR(0.7,0.95), NOT 0.99
    expect(d.spread_mm).toBe(0.02);                           // metric spread only (10.02 − 10.0)
    expect(d.contributions.find((c) => c.source === "cnc")!.role).toBe("presence");
    expect(d.contributions.find((c) => c.source === "cad")!.role).toBe("metric");
  });

  it("a CNC-only feature is presence_only with an UNtrusted value (a coordinate is not a nominal)", () => {
    const r = eng.reconcile([{ value_mm: 12.0, type: "diameter", source: "cnc", confidence: 0.9 }]);
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.status).toBe("presence_only");
    expect(d.value_trusted).toBe(false);
    expect(d.cnc_presence).toBe(true);
    expect(d.metric_sources).toEqual([]);
    expect(d.value_mm).toBe(12.0);                            // reported for association/review, untrusted
    expect(d.confidence).toBe(0.9);                          // presence-detection conf (cnc prior), not 0/0.99
    expect(r.coverage.presence_only).toBe(1);
    expect(r.coverage.confirmed).toBe(0);
    expect(r.coverage.single_source).toBe(0);
  });

  it("two CNC coords of the same feature → ONE presence_only dim, same source not double-counted", () => {
    const r = eng.reconcile([
      { value_mm: 12.0, type: "diameter", source: "cnc", confidence: 0.9 },
      { value_mm: 12.01, type: "diameter", source: "cnc", confidence: 0.9 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.status).toBe("presence_only");
    expect(d.sources).toEqual(["cnc"]);
    expect(d.confidence).toBe(0.9);                          // NOT 0.99 — one source isn't independent corroboration
    expect(d.contributions).toHaveLength(2);
  });

  it("a labeled CNC-only coordinate NEVER raises a false conflict against a real metric dim (value_trusted gate)", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7, label: "bore" },
      { value_mm: 50.0, type: "diameter", source: "cnc", confidence: 0.9, label: "bore" }, // toolpath coord, NOT a nominal
    ]);
    // Two clusters share the label "bore", but the CNC one is presence_only → must NOT be flagged a value conflict.
    expect(r.dimensions).toHaveLength(2);
    expect(r.conflicts).toHaveLength(0);
    const metricDim = r.dimensions.find((d) => d.value_trusted)!;
    expect(metricDim.status).toBe("single_source");
    expect(metricDim.value_mm).toBe(10.0);
    expect(r.dimensions.find((d) => !d.value_trusted)!.status).toBe("presence_only");
  });

  it("CNC presence corroborates a lone metric source WITHOUT promoting it to confirmed", () => {
    const r = eng.reconcile([
      { value_mm: 8.0, type: "diameter", source: "print", confidence: 0.7 },
      { value_mm: 8.01, type: "diameter", source: "cnc", confidence: 0.9 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.status).toBe("single_source");                  // only 1 DIMENSIONAL source
    expect(d.metric_sources).toEqual(["print"]);
    expect(d.cnc_presence).toBe(true);
    expect(d.value_trusted).toBe(true);
    expect(d.value_mm).toBe(8.0);                            // print value only — CNC 8.01 excluded
    expect(d.confidence).toBe(0.7);                          // print prior, NOT boosted by cnc
  });
});

describe("reconcile — types + failure modes + adversarial", () => {
  it("angular candidates cluster by degree band, independent of linear dims", () => {
    const r = eng.reconcile([
      { value_mm: 45.0, type: "angular", source: "print", confidence: 0.7 },
      { value_mm: 45.3, type: "angular", source: "cad", confidence: 0.9 }, // 2 metric sources → confirmed
      { value_mm: 30.0, type: "linear", source: "cad", confidence: 0.95 },
    ]);
    const ang = r.dimensions.find((d) => d.type === "angular")!;
    expect(ang.status).toBe("confirmed");
    expect(ang.sources.length).toBe(2);
    expect(r.dimensions.find((d) => d.type === "linear")!.status).toBe("single_source");
  });

  it("drops non-finite values + invalid sources, counts them, keeps the valid one", () => {
    const r = eng.reconcile([
      { value_mm: NaN, type: "linear", source: "print" },
      { value_mm: Infinity, type: "linear", source: "cad" },
      { value_mm: 5, type: "linear", source: "bogus" as any },
      { value_mm: 25.4, type: "diameter", source: "cnc", confidence: 0.9 },
    ]);
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].value_mm).toBe(25.4);
    expect(r.coverage.candidates_in).toBe(4);
    expect(r.coverage.candidates_dropped).toBe(3);
  });

  it("empty / non-array input → empty report, no crash", () => {
    const r = eng.reconcile([]);
    expect(r.dimensions).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.coverage.total).toBe(0);
    expect(r.coverage.multi_source_rate).toBe(0);
    expect(eng.reconcile(null as any).coverage.total).toBe(0);
  });

  it("coverage reports the distinct sources present + multi_source_rate", () => {
    const r = eng.reconcile([
      { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7 },
      { value_mm: 10.0, type: "diameter", source: "cad", confidence: 0.95 }, // confirmed
      { value_mm: 99.0, type: "linear", source: "cnc", confidence: 0.9 },     // single
    ]);
    expect(r.coverage.total).toBe(2);
    expect(r.coverage.confirmed).toBe(1);
    expect(r.coverage.multi_source_rate).toBe(0.5);
    expect(r.coverage.sources_present.sort()).toEqual(["cad", "cnc", "print"]);
  });

  it("exports a shared singleton", () => {
    expect(crossSourceDimensionReconciliationEngine).toBeInstanceOf(CrossSourceDimensionReconciliationEngine);
  });
});
