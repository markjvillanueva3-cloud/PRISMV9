/**
 * Tests for the SFC combinatorial harness DRIVER (U-CSFH-06-DRIVER).
 *
 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
 *
 * Two layers (pure-core + injected-readers rule):
 *   1. DI unit tests with a fast FAKE calculator + fake vendor provider -- pin the
 *      driven/error/gate-tally/citation paths + the cell->input mapping + the
 *      NEVER-FABRICATE contract (engine throw => driven:false, summary null).
 *   2. A real-data E2E through `withRealEngine()` driving a tiny capped N of cells
 *      through the actual SFC engine -- proves the full pipeline runs end to end
 *      and emits real physics summaries + gate verdicts.
 */
import { describe, it, expect } from "vitest";
import {
  CombinatorialSpeedFeedHarnessDriver,
  type CalculatorProvider,
} from "../../data/sfc-combinatorial-driver.js";
import { enumerateRange } from "../../data/sfc-combinatorial-enumerator.js";
import type { SampledCell } from "../../data/sfc-combinatorial-sampler.js";
import {
  SpeedFeedCombinatorialDataSourceEngine,
  type VendorCatalogProvider,
} from "../../data/sfc-combinatorial-datasource.js";
import type { UltimateSpeedFeedInput, UltimateSpeedFeedResult } from "../../engines/UltimateSpeedFeedEngine.js";
import type { SpeedFeedCatalogMatch } from "../../engines/SpeedFeedCatalogJoinerEngine.js";

// ---- fakes -----------------------------------------------------------------
type Src = "calculated" | "lookup" | "inferred" | "user_input" | "default";
const ov = (value: number, unit: string, source: Src = "calculated") => ({
  value, unit, source, confidence: 0.9,
});

/** Minimal UltimateSpeedFeedResult shaped just enough for the gate + summary. */
function fakeResult(over: Partial<{ stable: boolean; warnings: string[]; inferred: string[] }> = {}): UltimateSpeedFeedResult {
  const r = {
    cutting_speed: ov(120, "m/min"),
    spindle_rpm: ov(3000, "RPM"),
    feed_rate: ov(450, "mm/min"),
    mrr: ov(35, "cm³/min"),
    forces: { resultant_force_N: ov(800, "N") },
    power: { required_power_kw: ov(4.2, "kW") },
    stability: { is_stable: over.stable ?? true, critical_depth_mm: { ...ov(5, "mm"), source: "calculated" as Src } },
    inferred_parameters: over.inferred ?? [],
    warnings: over.warnings ?? [],
  };
  return r as unknown as UltimateSpeedFeedResult; // test fixture: only gate+summary fields read
}

const fastCalc: CalculatorProvider = { calculate: () => fakeResult() };
const throwingCalc: CalculatorProvider = {
  calculate: () => {
    throw new Error("chip_width_mm must be positive");
  },
};
const unstableCalc: CalculatorProvider = { calculate: () => fakeResult({ stable: false }) };

const fakeMatch: SpeedFeedCatalogMatch = {
  vc_mpm: 150, fz_mm: 0.05, vc_range: [100, 200], fz_range: [0.03, 0.07],
  source_catalog: "seco", matched_series: "JS512", match_tier: "exact", confidence: 0.9,
};
const vendorOk: VendorCatalogProvider = { lookup: () => fakeMatch };
const vendorNull: VendorCatalogProvider = { lookup: () => null };
const dsOk = () => new SpeedFeedCombinatorialDataSourceEngine(vendorOk);
const dsNull = () => new SpeedFeedCombinatorialDataSourceEngine(vendorNull);

// ---- DI unit tests ---------------------------------------------------------
describe("toInput -- cell -> engine input mapping (no fabricated fields)", () => {
  it("maps every SampledCell axis to its UltimateSpeedFeedInput field", () => {
    const s = {
      operation: "milling" as const, strategy: "hsm" as const, cut_type: "finishing" as const,
      tool_material: "carbide" as const, iso_group: "P" as const, representative_material: "steel",
      diameter_mm: 12, flutes: 4, machine_power_kw: 15, hardness_hb: 220, coolant: "flood" as const,
    };
    const inp: UltimateSpeedFeedInput = CombinatorialSpeedFeedHarnessDriver.toInput(s);
    expect(inp.material).toBe("steel");
    expect(inp.iso_group).toBe("P");
    expect(inp.hardness_hb).toBe(220);
    expect(inp.tool_diameter_mm).toBe(12);
    expect(inp.flutes).toBe(4);
    expect(inp.tool_material).toBe("carbide");
    expect(inp.operation).toBe("milling");
    expect(inp.cut_type).toBe("finishing");
    expect(inp.strategy).toBe("hsm");
    expect(inp.machine_power_kw).toBe(15);
    expect(inp.coolant).toBe("flood");
  });
});

describe("drive -- DI fast fake", () => {
  it("drives a capped N, populating summary + gate + tallies", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsNull());
    const res = d.drive({ maxCells: 10 });
    expect(res.total).toBe(10);
    expect(res.drivenCount).toBe(10);
    expect(res.errorCount).toBe(0);
    expect(res.gateTally.pass).toBe(10); // clean fake => all pass
    for (const rec of res.records) {
      expect(rec.driven).toBe(true);
      expect(rec.summary).not.toBeNull();
      expect(rec.summary!.cutting_speed_mpm).toBe(120);
      expect(rec.summary!.mrr_cm3min).toBe(35);
      expect(rec.gate!.overall).toBe("pass");
    }
  });

  it("an engine THROW yields driven:false + null summary (never fabricates)", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(throwingCalc, dsNull());
    const res = d.drive({ maxCells: 5 });
    expect(res.drivenCount).toBe(0);
    expect(res.errorCount).toBe(5);
    for (const rec of res.records) {
      expect(rec.driven).toBe(false);
      expect(rec.summary).toBeNull();
      expect(rec.gate).toBeNull();
      expect(rec.error).toContain("chip_width_mm");
    }
  });

  it("an unstable engine result FAILs the chatter gate (tally counts it)", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(unstableCalc, dsNull());
    const res = d.drive({ maxCells: 4 });
    expect(res.gateTally.fail).toBe(4);
    expect(res.gateTally.pass).toBe(0);
    for (const rec of res.records) expect(rec.gate!.overall).toBe("fail");
  });

  it("maxCells=0 drives nothing; default drives all 1716", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsNull());
    expect(d.drive({ maxCells: 0 }).total).toBe(0);
    expect(d.drive().total).toBe(1716);
  });

  it("vendorContext drives tool-specific citations (citedCount tracks them)", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsOk());
    const res = d.drive({
      maxCells: 6,
      vendorContext: () => ({ manufacturer: "Seco", tool_id_or_series: "JS512" }),
    });
    expect(res.citedCount).toBe(6); // every cell cites (fake always matches at 'exact')
    for (const rec of res.records) {
      expect(rec.citation.resolved).toBe(true);
      expect(rec.citation.provenance.citation_quality).toBe("tool_specific");
    }
  });

  it("without vendorContext, citations are unresolved (coverage-gap signal, not error)", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsOk());
    const res = d.drive({ maxCells: 3 });
    expect(res.citedCount).toBe(0);
    for (const rec of res.records) expect(rec.citation.resolved).toBe(false);
  });

  it("a THROWN cell still carries its resolved citation (driven:false but cited)", () => {
    // Citation resolves BEFORE the engine call, so an engine throw must NOT lose the
    // provenance. driven:false + citation.resolved:true is the unambiguous shape a
    // downstream consumer reads to tell "vendor had data but the engine could not compute"
    // from "engine drove and was validated". Never-fabricate ordering contract.
    const d = new CombinatorialSpeedFeedHarnessDriver(throwingCalc, dsOk());
    const res = d.drive({
      maxCells: 3,
      vendorContext: () => ({ manufacturer: "Seco", tool_id_or_series: "JS512" }),
    });
    expect(res.drivenCount).toBe(0);
    expect(res.citedCount).toBe(3); // every cell cited even though none drove
    for (const rec of res.records) {
      expect(rec.driven).toBe(false);
      expect(rec.summary).toBeNull();
      expect(rec.gate).toBeNull();
      expect(rec.citation.resolved).toBe(true); // failed-to-drive != failed-to-cite
    }
  });

  it("seed forwards to the sampler (determinism)", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsNull());
    const a = d.drive({ seed: 7, maxCells: 20 });
    const b = d.drive({ seed: 7, maxCells: 20 });
    expect(a.records.map((r) => r.sample)).toEqual(b.records.map((r) => r.sample));
  });
});

// ---- driveCells (U-FT-04: explicit-cell driving + FAST flag) ----------------
describe("driveCells -- explicit enumerated cells + fastBulk", () => {
  const cells: SampledCell[] = enumerateRange(0, 12); // a real enumerated slice

  it("drives an explicit cell list with the same DrivenCell shape as drive()", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsNull());
    const res = d.driveCells(cells);
    expect(res.total).toBe(12);
    expect(res.drivenCount).toBe(12);
    expect(res.errorCount).toBe(0);
    expect(res.gateTally.pass).toBe(12);
    for (const rec of res.records) {
      expect(rec.driven).toBe(true);
      expect(rec.summary!.cutting_speed_mpm).toBe(120);
      expect(rec.summary!.required_power_kw).toBe(4.2);
      expect(rec.gate!.overall).toBe("pass");
    }
  });

  it("threads fast_bulk:true into the engine input ONLY when fastBulk is set", () => {
    const seenWith: UltimateSpeedFeedInput[] = [];
    const seenWithout: UltimateSpeedFeedInput[] = [];
    const recWith: CalculatorProvider = { calculate: (i) => { seenWith.push(i); return fakeResult(); } };
    const recWithout: CalculatorProvider = { calculate: (i) => { seenWithout.push(i); return fakeResult(); } };
    new CombinatorialSpeedFeedHarnessDriver(recWith, dsNull()).driveCells(cells, { fastBulk: true });
    new CombinatorialSpeedFeedHarnessDriver(recWithout, dsNull()).driveCells(cells);
    expect(seenWith.length).toBe(12);
    expect(seenWith.every((i) => i.fast_bulk === true)).toBe(true);
    expect(seenWithout.every((i) => i.fast_bulk === undefined)).toBe(true);
  });

  it("never fabricates: a throwing engine yields driven:false + null summary per cell", () => {
    const d = new CombinatorialSpeedFeedHarnessDriver(throwingCalc, dsNull());
    const res = d.driveCells(cells);
    expect(res.drivenCount).toBe(0);
    expect(res.errorCount).toBe(12);
    expect(res.records.every((r) => r.driven === false && r.summary === null)).toBe(true);
  });

  it("empty cell list drives nothing cleanly", () => {
    const res = new CombinatorialSpeedFeedHarnessDriver(fastCalc, dsNull()).driveCells([]);
    expect(res.total).toBe(0);
    expect(res.drivenCount).toBe(0);
    expect(res.gateTally).toEqual({ pass: 0, honest_limited: 0, fail: 0 });
  });

  it("real engine drives an enumerated slice in FAST mode (E2E, real physics)", () => {
    const d = CombinatorialSpeedFeedHarnessDriver.withRealEngine();
    const slice = enumerateRange(0, 6).concat(enumerateRange(1_000_000, 6)); // two regimes
    const res = d.driveCells(slice, { fastBulk: true });
    expect(res.total).toBe(12);
    expect(res.drivenCount + res.errorCount).toBe(12);
    expect(res.drivenCount).toBeGreaterThan(0);
    for (const rec of res.records) {
      if (rec.driven) {
        expect(rec.summary!.cutting_speed_mpm).toBeGreaterThan(0);
        expect(["pass", "honest_limited", "fail"]).toContain(rec.gate!.overall);
      }
    }
  });
});

// ---- real-data E2E ---------------------------------------------------------
describe("real-data E2E (withRealEngine, tiny capped N)", () => {
  it("drives 8 cells through the REAL SFC engine end-to-end with real physics", () => {
    const d = CombinatorialSpeedFeedHarnessDriver.withRealEngine();
    const res = d.drive({ maxCells: 8 });
    expect(res.total).toBe(8);
    // The real engine should drive (not throw) on these valid sampled cells.
    expect(res.drivenCount).toBeGreaterThan(0);
    expect(res.drivenCount + res.errorCount).toBe(8);
    for (const rec of res.records) {
      if (rec.driven) {
        // Lower bound discriminates real physics from a degenerate near-zero result:
        // the slowest sampled regime (titanium/S-group) still cuts well above 5 m/min,
        // so `> 5` would catch an inference path that collapsed Vc to ~0 (a `> 0` guard
        // would not). Not pinned to an exact value (the engine infers from defaults).
        expect(rec.summary!.cutting_speed_mpm).toBeGreaterThan(5);
        expect(rec.summary!.spindle_rpm).toBeGreaterThan(0);
        expect(rec.summary!.mrr_cm3min).toBeGreaterThanOrEqual(0);
        expect(["pass", "honest_limited", "fail"]).toContain(rec.gate!.overall);
      }
    }
  });
});
