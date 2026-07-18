/**
 * Tests for the SFC combinatorial BASELINE GENERIC PARAMS step (U-CSFH-08, the moat).
 *
 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
 *
 * Fixtures flow through the REAL comparator (compareRecords) so this exercises the
 * 07 -> 08 pipeline, then derive the baseline. Pins each path: vendor_corroborated /
 * prism_only / low_confidence (divergent + poor containment), tapping SEGREGATION (+ drilling now ELIGIBLE),
 * thin-regime insufficient_data, envelope math, vendor bias direction, provenance
 * counts, gate-fail exclusion from the envelope, the report rollup, and empty input.
 * A real-engine E2E proves the load-bearing honesty invariant: with no vendor data
 * NO regime may be 'vendor_corroborated'.
 */
import { describe, it, expect } from "vitest";
import { SpeedFeedCombinatorialComparatorEngine } from "../../data/sfc-combinatorial-compare.js";
import { SpeedFeedBaselineGenericParamsEngine } from "../../data/sfc-combinatorial-baseline-params.js";
import { CombinatorialSpeedFeedHarnessDriver, type DrivenCell } from "../../data/sfc-combinatorial-driver.js";
import type { SampledCell, Operation } from "../../data/sfc-combinatorial-sampler.js";
import type { ISOGroup, CutType } from "../../data/sfc-combinatorial-axes.js";
import type { CitedDataRow } from "../../data/sfc-combinatorial-datasource.js";
import type { CellGateVerdict, GateStatus } from "../../data/sfc-combinatorial-gates.js";

// ---- fixtures --------------------------------------------------------------
const mkGate = (overall: GateStatus): CellGateVerdict => ({
  units: { status: overall, failures: [], caveats: [] },
  chatter: { status: overall, failures: [], caveats: [] },
  physics: { status: overall, failures: [], caveats: [] },
  overall, failures: [], caveats: [],
});

interface CellOver {
  iso?: ISOGroup; op?: Operation; ct?: CutType; vc?: number; feed?: number;
  vendorVc?: number; vendorFz?: number; resolved?: boolean; overall?: GateStatus; driven?: boolean;
}

function mkCell(o: CellOver = {}): DrivenCell {
  const driven = o.driven ?? true;
  const resolved = o.resolved ?? true;
  const sample: SampledCell = {
    operation: o.op ?? "milling", strategy: "hsm", cut_type: o.ct ?? "finishing", tool_material: "carbide",
    iso_group: o.iso ?? "P", representative_material: "steel", diameter_mm: 12, flutes: 4,
    machine_power_kw: 15, hardness_hb: 220, coolant: "flood",
  };
  const citation: CitedDataRow = resolved
    ? { resolved: true, vc_mpm: o.vendorVc ?? 150, fz_mm: o.vendorFz ?? 0.05, provenance: { source: "vendor_catalog", detail: "seco:JS512 (exact)", confidence: 0.9, citation_quality: "tool_specific", catalog: "seco", match_tier: "exact" }, errors: [] }
    : { resolved: false, vc_mpm: null, fz_mm: null, provenance: { source: "unresolved", detail: "no match", confidence: 0, citation_quality: "none" }, errors: ["skip"] };
  return {
    driven, sample,
    summary: driven ? { cutting_speed_mpm: o.vc ?? 150, spindle_rpm: 4000, feed_rate_mmmin: o.feed ?? 800, mrr_cm3min: 35, resultant_force_N: 800, required_power_kw: 4.2 } : null,
    gate: driven ? mkGate(o.overall ?? "pass") : null,
    citation,
    error: driven ? null : "chip_width_mm must be positive",
  };
}
const cells = (n: number, o: CellOver = {}): DrivenCell[] => Array.from({ length: n }, () => mkCell(o));
const derive = (recs: DrivenCell[], opts = {}) =>
  SpeedFeedBaselineGenericParamsEngine.deriveBaseline(SpeedFeedCombinatorialComparatorEngine.compareRecords(recs), opts);
const regimeOf = (recs: DrivenCell[], key: string, opts = {}) =>
  derive(recs, opts).regimes.find((r) => r.regime === key)!;

// ---- DI unit tests ---------------------------------------------------------
describe("deriveBaseline -- regime status + confidence", () => {
  it("6 cited+match milling cells => baseline, vc envelope, containment 1, vendor_corroborated", () => {
    const r = regimeOf(cells(6, { vc: 150, vendorVc: 150 }), "P:milling:finishing");
    expect(r.status).toBe("baseline");
    expect(r.vc_mpm).not.toBeNull();
    expect(r.vc_mpm!.n).toBe(6);
    expect(r.containment_frac).toBe(1);
    expect(r.divergent_frac).toBe(0);
    expect(r.confidence).toBe("vendor_corroborated");
    expect(r.bias_vc_pct).toBeCloseTo(0, 6);
  });

  it("6 driven but UNCITED cells => baseline with a PRISM-only envelope (no vendor prior)", () => {
    const r = regimeOf(cells(6, { resolved: false }), "P:milling:finishing");
    expect(r.status).toBe("baseline");
    expect(r.vc_mpm!.n).toBe(6);
    expect(r.bias_vc_pct).toBeNull();      // no_vendor_prior
    expect(r.containment_frac).toBeNull();
    expect(r.confidence).toBe("prism_only"); // never vendor_corroborated without vendor data
    expect(r.provenance.n_cited).toBe(0);
  });

  it("tapping regime => segregated_operation (no envelope), reason names the pitch-locked / proxy basis", () => {
    const r = regimeOf(cells(6, { op: "tapping" }), "P:tapping:finishing");
    expect(r.status).toBe("segregated_operation");
    expect(r.vc_mpm).toBeNull();
    expect(r.confidence).toBe("none");
    expect(r.reason).toContain("tapping");
    expect(r.reason).toContain("pitch-locked"); // honest, operation-specific reason (not a stale hardcode)
  });

  it("drilling is NO LONGER segregated by default (U-OSC9-DRILL-CHIPGEOM fixed its chip geometry)", () => {
    // 6 gate-pass driven drilling cells now yield a real baseline envelope, not segregation.
    const r = regimeOf(cells(6, { op: "drilling", vc: 150, vendorVc: 150 }), "P:drilling:finishing");
    expect(r.status).toBe("baseline");
    expect(r.status).not.toBe("segregated_operation");
    expect(r.vc_mpm!.n).toBe(6);
  });

  it("a thin regime (< minRegimeN clean cells) => insufficient_data", () => {
    const r = regimeOf(cells(3, {}), "P:milling:finishing");
    expect(r.status).toBe("insufficient_data");
    expect(r.vc_mpm).toBeNull();
    expect(r.reason).toContain("thin");
  });

  it("divergent-dominated cited regime => low_confidence, divergent_frac 1", () => {
    const r = regimeOf(cells(6, { vc: 250, vendorVc: 150 }), "P:milling:finishing"); // +66% => divergent
    expect(r.status).toBe("baseline");
    expect(r.divergent_frac).toBe(1);
    expect(r.confidence).toBe("low_confidence");
  });

  it("PRISM systematically over vendor (+30%) => bias_vc_pct ~ +30, poor containment => low_confidence", () => {
    const r = regimeOf(cells(6, { vc: 195, vendorVc: 150 }), "P:milling:finishing"); // +30% => prism_higher (not match, not divergent)
    expect(r.bias_vc_pct).toBeCloseTo(30, 3);
    expect(r.containment_frac).toBe(0);
    expect(r.confidence).toBe("low_confidence");
  });
});

describe("deriveBaseline -- envelope, provenance, gate exclusion", () => {
  it("vc envelope reflects the spread of PRISM cutting speeds (min/max/mean/p50)", () => {
    const recs = [100, 120, 140, 160, 180, 200].map((v) => mkCell({ vc: v, vendorVc: v }));
    const r = regimeOf(recs, "P:milling:finishing");
    expect(r.vc_mpm!.min).toBe(100);
    expect(r.vc_mpm!.max).toBe(200);
    expect(r.vc_mpm!.mean).toBeCloseTo(150, 6);
    expect(r.vc_mpm!.p50).toBe(160); // sorted[round(0.5*5)=3]
  });

  it("provenance counts split clean vs cited (citation_coverage)", () => {
    const r = regimeOf([...cells(3, { resolved: true }), ...cells(3, { resolved: false })], "P:milling:finishing");
    expect(r.provenance.n_total).toBe(6);
    expect(r.provenance.n_clean).toBe(6);
    expect(r.provenance.n_cited).toBe(3);
    expect(r.provenance.citation_coverage).toBeCloseTo(0.5, 6);
  });

  it("gate-FAIL cells are excluded from the clean envelope count", () => {
    // 4 pass + 2 fail => n_clean 4 < default minRegimeN 5 => insufficient_data
    const r = regimeOf([...cells(4, { overall: "pass" }), ...cells(2, { overall: "fail" })], "P:milling:finishing");
    expect(r.provenance.n_clean).toBe(4);
    expect(r.status).toBe("insufficient_data");
  });
});

describe("deriveBaseline -- report rollup + edges", () => {
  it("rolls up emitted / segregated / insufficient across regimes", () => {
    const recs = [
      ...cells(5, { iso: "P", op: "milling", vc: 150, vendorVc: 150 }), // baseline (corroborated)
      ...cells(6, { iso: "P", op: "tapping" }),                         // segregated (non-calibratable)
      ...cells(3, { iso: "M", op: "reaming" }),                         // insufficient
    ];
    const rep = derive(recs);
    expect(rep.emittedCount).toBe(1);
    expect(rep.segregatedCount).toBe(1);
    expect(rep.insufficientCount).toBe(1);
    expect(rep.regimes).toHaveLength(3);
    expect(rep.generatedFrom.total_cells).toBe(14);
    expect(rep.schemaVersion).toBe("1.1.0");
  });

  it("empty report => no regimes, zeroed counts", () => {
    const rep = SpeedFeedBaselineGenericParamsEngine.deriveBaseline(
      SpeedFeedCombinatorialComparatorEngine.compareRecords([]),
    );
    expect(rep.regimes).toHaveLength(0);
    expect(rep.emittedCount).toBe(0);
    expect(rep.segregatedCount).toBe(0);
    expect(rep.insufficientCount).toBe(0);
    expect(rep.generatedFrom.total_cells).toBe(0);
  });

  it("minRegimeN override lets a smaller regime emit a baseline", () => {
    const r = regimeOf(cells(3, { vc: 150, vendorVc: 150 }), "P:milling:finishing", { minRegimeN: 3, minCitedForCorroboration: 3 });
    expect(r.status).toBe("baseline");
    expect(r.vc_mpm!.n).toBe(3);
  });

  it("segregateOperations override ([]) suppresses the default tapping segregation (U-CSFH-11 toggle)", () => {
    const recs = cells(6, { op: "tapping", vc: 150, vendorVc: 150 });
    expect(regimeOf(recs, "P:tapping:finishing").status).toBe("segregated_operation"); // default segregates tapping
    const overridden = regimeOf(recs, "P:tapping:finishing", { segregateOperations: [] });
    expect(overridden.status).toBe("baseline"); // override lets the regime through
    expect(overridden.vc_mpm!.n).toBe(6);
  });
});

// ---- cut_type resolution (U-FT-11-PRE) -------------------------------------
describe("deriveBaseline -- per-cut_type regime resolution (U-FT-11-PRE)", () => {
  it("splits one (iso, operation) into separate per-cut_type regimes the DL loop can read", () => {
    // 6 roughing + 6 finishing milling cells, same iso+op -> TWO regimes keyed by cut_type,
    // each carrying its own cut_type field (segment key iso|_|cut_type). They must NOT merge.
    const recs = [
      ...cells(6, { ct: "roughing", vc: 150, vendorVc: 150 }),
      ...cells(6, { ct: "finishing", vc: 150, vendorVc: 150 }),
    ];
    const rep = derive(recs);
    const keys = rep.regimes.map((r) => r.regime);
    expect(keys).toContain("P:milling:roughing");
    expect(keys).toContain("P:milling:finishing");
    const rough = rep.regimes.find((r) => r.regime === "P:milling:roughing")!;
    const finish = rep.regimes.find((r) => r.regime === "P:milling:finishing")!;
    expect(rough.cut_type).toBe("roughing");
    expect(finish.cut_type).toBe("finishing");
    expect(rough.vc_mpm!.n).toBe(6); // NOT 12 -> the two cut_types did not average together
    expect(finish.vc_mpm!.n).toBe(6);
    expect(rep.regimes.filter((r) => r.operation === "milling").length).toBe(2);
  });

  it("every emitted regime carries a cut_type that matches its regime key suffix", () => {
    const rep = derive(cells(6, { ct: "semi_finishing", vc: 150, vendorVc: 150 }));
    const r = rep.regimes.find((x) => x.operation === "milling")!;
    expect(r.cut_type).toBe("semi_finishing");
    expect(r.regime).toBe("P:milling:semi_finishing");
    expect(r.regime.endsWith(`:${r.cut_type}`)).toBe(true);
  });
});

// ---- real-data E2E ---------------------------------------------------------
describe("real-data E2E (withRealEngine -> compare -> deriveBaseline)", () => {
  it("with no vendor data, NO regime is vendor_corroborated (honest segregation end-to-end)", () => {
    const drive = CombinatorialSpeedFeedHarnessDriver.withRealEngine().drive({ maxCells: 8 });
    const report = SpeedFeedCombinatorialComparatorEngine.compare(drive);
    const baseline = SpeedFeedBaselineGenericParamsEngine.deriveBaseline(report);
    // The load-bearing invariant: you cannot corroborate against data you do not have.
    expect(baseline.regimes.every((r) => r.confidence !== "vendor_corroborated")).toBe(true);
    expect(baseline.regimes.every((r) => r.bias_vc_pct === null)).toBe(true); // no cited cells => no bias
    expect(baseline.regimes.every((r) => r.containment_frac === null && r.divergent_frac === null)).toBe(true);
    expect(baseline.emittedCount + baseline.segregatedCount + baseline.insufficientCount).toBe(baseline.regimes.length);
    expect(baseline.generatedFrom.total_cells).toBe(8);
  });
});
