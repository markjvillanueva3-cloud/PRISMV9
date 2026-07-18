// reconcileCandidates.integration.test.ts -- U-XRAY-RECONCILE-CANDIDATES (end-to-end seam)
// Executable proof that the .mjs source-adapters (reconcile-candidate-adapters) emit DimCandidate[]
// the .ts CrossSourceDimensionReconciliationEngine consumes into a sensible consensus -- the R15
// round-trip THROUGH the consumer, not just unit-tested in isolation. Covers the metric (cad/print)
// vs presence (cnc) distinction + the noisy-OR confidence lift the adapters are designed to feed.

import { describe, it, expect } from "vitest";
import { CrossSourceDimensionReconciliationEngine } from "../engines/CrossSourceDimensionReconciliationEngine.js";
// the source-adapter trio lives in the repo-root scripts/lib (shared .mjs, no TS build dependency)
import { buildPartCandidates } from "../../../scripts/lib/reconcile-candidate-adapters.mjs";

describe("reconcile candidate adapters -> engine (end-to-end)", () => {
  const engine = new CrossSourceDimensionReconciliationEngine();

  it("cad+print metric + cnc presence at one value -> a CONFIRMED consensus dim with noisy-OR lift", () => {
    const candidates = buildPartCandidates({
      cadGT: { calloutDimsMm: [12.7], featureDiametersMm: [12.7], envelopeMm: [], gtReliable: true }, // cad 0.95
      programGT: { clusteredDiametersIn: [0.5] }, // 0.5in -> 12.7mm, cnc presence (prior 0.90)
      ocrDimsMm: [{ value_mm: 12.7, type: "diameter", confidence: 0.7 }], // print metric 0.70
    });
    // 3 candidates in, all at 12.7mm -> the engine must cluster them into ONE reconciled dim.
    expect(candidates).toHaveLength(3);
    const report = engine.reconcile(candidates);
    const dim = report.dimensions.find((d) => Math.abs(d.value_mm - 12.7) < 0.1);
    expect(dim?.value_mm).toBeCloseTo(12.7, 1); // the consensus value (proves the cluster formed)
    expect(dim?.status).toBe("confirmed"); // >=2 distinct METRIC sources (cad + print) agree
    expect(dim?.value_trusted).toBe(true);
    expect(dim?.cnc_presence).toBe(true); // the cnc adapter corroborated the feature was machined
    expect(dim?.confidence).toBeGreaterThan(0.95); // noisy-OR(0.95, 0.70) ~ 0.985 > either source alone
    expect(dim?.sources).toEqual(expect.arrayContaining(["cad", "print", "cnc"]));
    expect(report.coverage.confirmed).toBeGreaterThanOrEqual(1);
  });

  it("cnc-only candidates -> presence_only (value is a coordinate, NOT a trusted nominal)", () => {
    const report = engine.reconcile(buildPartCandidates({ programGT: { clusteredDiametersIn: [1.0] } }));
    const dim = report.dimensions.find((d) => Math.abs(d.value_mm - 25.4) < 0.1);
    expect(dim?.value_mm).toBeCloseTo(25.4, 1);
    expect(dim?.status).toBe("presence_only");
    expect(dim?.value_trusted).toBe(false); // CNC X is a position, not a print nominal
    expect(dim?.cnc_presence).toBe(true);
  });

  it("every adapter-emitted candidate is engine-valid (sources_present spans cad+cnc, none dropped)", () => {
    const candidates = buildPartCandidates({
      cadGT: { calloutDimsMm: [12.7, 50.8], featureDiametersMm: [12.7], envelopeMm: [50.8], gtReliable: true },
      programGT: { clusteredDiametersIn: [0.5, 1.0], lengthIn: 2.0 },
    });
    expect(candidates.length).toBe(5); // 2 cad (1 dia + 1 envelope) + 3 cnc (2 dia + 1 length)
    const report = engine.reconcile(candidates);
    expect(report.coverage.total).toBeGreaterThanOrEqual(2);
    expect(report.coverage.sources_present).toEqual(expect.arrayContaining(["cad", "cnc"]));
  });

  it("a CNC coordinate does NOT conflict-with, override, or average a differing CAD nominal (presence != nominal)", () => {
    // CAD envelope 76.2mm (metric, trusted nominal) + program feed-Z 50.8mm (cnc presence) -- same
    // feature label (overall_length) but DIFFERENT values. The engine must NOT (a) average them into a
    // fake 63.5mm nominal, (b) let the CNC coordinate override the CAD nominal, nor (c) raise a false
    // conflict -- a CNC X/Z is a position, NOT a competing print nominal (the verified metric/presence
    // model). The safety property: a toolpath coordinate can never corrupt a CAD-trusted dimension.
    const candidates = buildPartCandidates({
      cadGT: { calloutDimsMm: [76.2], featureDiametersMm: [], envelopeMm: [76.2], gtReliable: true },
      programGT: { clusteredDiametersIn: [], lengthIn: 2.0 }, // 2.0in -> 50.8mm
    });
    const lengths = candidates.filter((c) => c.label === "overall_length");
    expect(lengths.map((c) => c.value_mm).sort((a: number, b: number) => a - b)).toEqual([50.8, 76.2]);
    const report = engine.reconcile(candidates);
    // never averaged into a fake 63.5mm nominal (R12).
    expect(report.dimensions.some((d) => Math.abs(d.value_mm - 63.5) < 0.5)).toBe(false);
    // a CNC coordinate is NOT a competing nominal -> no false conflict raised.
    expect(report.conflicts).toEqual([]);
    // the CAD value stays the trusted overall_length nominal.
    const cadDim = report.dimensions.find((d) => Math.abs(d.value_mm - 76.2) < 0.5);
    expect(cadDim?.value_trusted).toBe(true);
  });

  it("empty candidates -> a graceful empty report (no throw)", () => {
    const report = engine.reconcile(buildPartCandidates({}));
    expect(report.dimensions).toEqual([]);
    expect(report.conflicts).toEqual([]);
    expect(report.coverage.total).toBe(0);
  });
});
