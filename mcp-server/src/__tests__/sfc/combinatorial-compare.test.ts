/**
 * Tests for the SFC combinatorial COMPARE step (U-CSFH-07-COMPARE).
 *
 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
 *
 * Two layers:
 *   1. DI unit tests with hand-built DrivenCell fixtures -- pin each verdict path
 *      (match / prism_higher / vendor_higher / divergent / uncited / error), the
 *      signed-delta direction, the fz envelope gate, the non-positive-vendor abstain,
 *      gate-fail feed-eligibility exclusion, the delta distribution stats, and the
 *      empty-input case.
 *   2. A real-data E2E driving real cells (no vendor context) through the REAL engine
 *      then comparing -- proves the honest dominant case: with no cited vendor row
 *      every driven cell ABSTAINS as `uncited` (citedCount 0, vcDelta null), never a
 *      fabricated agreement.
 */
import { describe, it, expect } from "vitest";
import {
  SpeedFeedCombinatorialComparatorEngine,
  type CompareVerdict,
} from "../../data/sfc-combinatorial-compare.js";
import { CombinatorialSpeedFeedHarnessDriver, type DrivenCell } from "../../data/sfc-combinatorial-driver.js";
import type { SampledCell } from "../../data/sfc-combinatorial-sampler.js";
import type { CitedDataRow } from "../../data/sfc-combinatorial-datasource.js";
import type { CellGateVerdict, GateStatus } from "../../data/sfc-combinatorial-gates.js";

// ---- fixtures --------------------------------------------------------------
const SAMPLE: SampledCell = {
  operation: "milling", strategy: "hsm", cut_type: "finishing", tool_material: "carbide",
  iso_group: "P", representative_material: "steel", diameter_mm: 12, flutes: 4,
  machine_power_kw: 15, hardness_hb: 220, coolant: "flood",
};

const mkGate = (overall: GateStatus): CellGateVerdict => ({
  units: { status: overall, failures: [], caveats: [] },
  chatter: { status: overall, failures: [], caveats: [] },
  physics: { status: overall, failures: [], caveats: [] },
  overall, failures: [], caveats: [],
});

interface RowOver {
  driven?: boolean;
  resolved?: boolean;
  vc?: number;       // PRISM cutting_speed_mpm
  rpm?: number;      // PRISM spindle_rpm (default 4000 so fz = feed/(rpm*flutes) is exact)
  feed?: number;     // PRISM feed_rate_mmmin (default 800 => fz 0.05 at rpm 4000, flutes 4)
  vendorVc?: number; // cited vc_mpm
  vendorFz?: number; // cited fz_mm
  overall?: GateStatus;
}

/** Build a DrivenCell fixture. Defaults: driven+cited, PRISM == vendor (a clean match). */
function mkRow(over: RowOver = {}): DrivenCell {
  const driven = over.driven ?? true;
  const resolved = over.resolved ?? true;
  const citation: CitedDataRow = resolved
    ? {
        resolved: true, vc_mpm: over.vendorVc ?? 150, fz_mm: over.vendorFz ?? 0.05,
        provenance: { source: "vendor_catalog", detail: "seco:JS512 (exact)", confidence: 0.9, citation_quality: "tool_specific", catalog: "seco", match_tier: "exact" },
        errors: [],
      }
    : {
        resolved: false, vc_mpm: null, fz_mm: null,
        provenance: { source: "unresolved", detail: "no vendor match", confidence: 0, citation_quality: "none" },
        errors: ["vendor_catalog skipped"],
      };
  return {
    driven,
    sample: SAMPLE,
    summary: driven
      ? { cutting_speed_mpm: over.vc ?? 150, spindle_rpm: over.rpm ?? 4000, feed_rate_mmmin: over.feed ?? 800, mrr_cm3min: 35, resultant_force_N: 800, required_power_kw: 4.2 }
      : null,
    gate: driven ? mkGate(over.overall ?? "pass") : null,
    citation,
    error: driven ? null : "chip_width_mm must be positive",
  };
}

const verdictOf = (rec: DrivenCell): CompareVerdict =>
  SpeedFeedCombinatorialComparatorEngine.compareRecords([rec]).comparisons[0]!.verdict;

// ---- DI unit tests ---------------------------------------------------------
describe("compare -- per-cell verdict classification", () => {
  it("PRISM == vendor (within envelope) => match, zero deltas, comparable + feed-eligible", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow()]);
    const c = r.comparisons[0]!;
    expect(c.verdict).toBe("match");
    expect(c.vc_delta_pct).toBeCloseTo(0, 6);
    expect(c.fz_delta_pct!).toBeCloseTo(0, 6); // feed 800/(4000*4)=0.05 == vendor 0.05
    expect(r.comparableCount).toBe(1);
    expect(r.feedEligibleCount).toBe(1);
    expect(r.citedCount).toBe(1);
  });

  it("PRISM vc 30% over vendor (outside 25%, within 40%) => prism_higher, positive delta", () => {
    const c = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ vc: 195, vendorVc: 150 })]).comparisons[0]!;
    expect(c.verdict).toBe("prism_higher");
    expect(c.vc_delta_pct).toBeCloseTo(30, 4);
  });

  it("vendor vc 30% over PRISM => vendor_higher, negative delta", () => {
    const c = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ vc: 105, vendorVc: 150 })]).comparisons[0]!;
    expect(c.verdict).toBe("vendor_higher");
    expect(c.vc_delta_pct).toBeCloseTo(-30, 4);
  });

  it("|vc delta| > 40% => divergent (checked before direction)", () => {
    expect(verdictOf(mkRow({ vc: 250, vendorVc: 150 }))).toBe("divergent"); // +66.7%
    expect(verdictOf(mkRow({ vc: 75, vendorVc: 150 }))).toBe("divergent");  // -50%
  });

  it("an out-of-envelope fz (vc equal) prevents match -- fz gate breaks agreement", () => {
    // feed 1120 @ rpm 4000, flutes 4 => fz 0.07 vs vendor 0.05 => +40% (> 30% gate)
    const c = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ vc: 150, vendorVc: 150, feed: 1120 })]).comparisons[0]!;
    expect(c.verdict).not.toBe("match");
    expect(c.verdict).toBe("prism_higher"); // vc equal, fz +40% -> fz-driven, PRISM recommends higher feed/tooth
    expect(c.fz_delta_pct).toBeCloseTo(40, 3);
  });

  it("no resolved citation => uncited (ABSTAINS, no delta, not comparable)", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ resolved: false })]);
    const c = r.comparisons[0]!;
    expect(c.verdict).toBe("uncited");
    expect(c.vc_delta_pct).toBeNull();
    expect(c.vendor_vc_mpm).toBeNull();
    expect(r.comparableCount).toBe(0);
    expect(r.citedCount).toBe(0);
  });

  it("cited but non-positive vendor vc => uncited (no usable benchmark, no div-by-zero)", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ vendorVc: 0 })]);
    expect(r.comparisons[0]!.verdict).toBe("uncited");
    expect(r.comparableCount).toBe(0);
  });

  it("a non-driven cell (engine threw) => error, null deltas, never comparable", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([mkRow({ driven: false })]);
    const c = r.comparisons[0]!;
    expect(c.verdict).toBe("error");
    expect(c.prism_vc_mpm).toBeNull();
    expect(c.vc_delta_pct).toBeNull();
    expect(r.drivenCount).toBe(0);
    expect(r.comparableCount).toBe(0);
  });

  it("a gate-FAIL match cell still classifies match but is EXCLUDED from feed-eligible", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([
      mkRow({ overall: "pass" }), // clean match
      mkRow({ overall: "fail" }), // same numbers but gate failed
    ]);
    expect(r.verdictTally.match).toBe(2);   // comparison is independent of the gate
    expect(r.comparableCount).toBe(2);
    expect(r.feedEligibleCount).toBe(1);    // only the gate-pass cell may feed the baseline
  });
});

describe("compare -- delta distribution stats", () => {
  it("aggregates signed vc deltas (bias + dispersion + percentiles) over the comparable subset", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([
      mkRow({ vc: 195, vendorVc: 150 }), // +30
      mkRow({ vc: 105, vendorVc: 150 }), // -30
      mkRow({ vc: 150, vendorVc: 150 }), //   0
    ]);
    expect(r.vcDelta).not.toBeNull();
    expect(r.vcDelta!.n).toBe(3);
    expect(r.vcDelta!.meanSigned).toBeCloseTo(0, 6);  // symmetric => zero bias
    expect(r.vcDelta!.meanAbs).toBeCloseTo(20, 6);    // (30+30+0)/3
    expect(r.vcDelta!.p10).toBeCloseTo(-30, 4);
    expect(r.vcDelta!.p50).toBeCloseTo(0, 4);
    expect(r.vcDelta!.p90).toBeCloseTo(30, 4);
  });

  it("empty input => zeroed tally, null stats, no fabricated rows", () => {
    const r = SpeedFeedCombinatorialComparatorEngine.compareRecords([]);
    expect(r.total).toBe(0);
    expect(r.comparisons).toHaveLength(0);
    expect(r.vcDelta).toBeNull();
    expect(r.fzDelta).toBeNull();
    expect(Object.values(r.verdictTally).every((n) => n === 0)).toBe(true);
  });

  it("compare(DriveResult) forwards records identically to compareRecords", () => {
    const records = [mkRow(), mkRow({ vc: 250, vendorVc: 150 })];
    const viaResult = SpeedFeedCombinatorialComparatorEngine.compare({
      records, drivenCount: 2, errorCount: 0, gateTally: { pass: 2, honest_limited: 0, fail: 0 }, citedCount: 2, total: 2,
    });
    const viaRecords = SpeedFeedCombinatorialComparatorEngine.compareRecords(records);
    expect(viaResult.verdictTally).toEqual(viaRecords.verdictTally);
    expect(viaResult.comparableCount).toBe(viaRecords.comparableCount);
  });
});

// ---- real-data E2E ---------------------------------------------------------
describe("real-data E2E (withRealEngine + compare, no vendor context)", () => {
  it("drives real cells then compares -- every driven cell ABSTAINS as uncited (honest, no fabricated agreement)", () => {
    const driver = CombinatorialSpeedFeedHarnessDriver.withRealEngine();
    const driveResult = driver.drive({ maxCells: 8 }); // no vendorContext => no citations resolve
    const report = SpeedFeedCombinatorialComparatorEngine.compare(driveResult);
    expect(report.total).toBe(8);
    expect(report.drivenCount).toBeGreaterThan(0);
    expect(report.citedCount).toBe(0);        // nothing cited => nothing comparable
    expect(report.comparableCount).toBe(0);
    expect(report.feedEligibleCount).toBe(0);
    expect(report.vcDelta).toBeNull();        // no fabricated distribution
    expect(report.verdictTally.uncited).toBe(report.drivenCount); // driven-but-uncited all abstain
    expect(report.verdictTally.uncited + report.verdictTally.error).toBe(report.total);
  });
});
