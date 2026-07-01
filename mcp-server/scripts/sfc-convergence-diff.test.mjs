/**
 * Tests for sfc-convergence-diff pure helpers (U-SFC-CONVERGENCE-DIFF).
 * Real reference-value asserts on the diff math + the two-shape metric extraction (no engine I/O).
 */
import { describe, it, expect } from "vitest";
import { pctDiff, extractMetrics, buildDiffRows, classifyCaseSafety, flagImplausibleProdVc } from "./sfc-convergence-diff.mjs";

describe("pctDiff", () => {
  it("computes signed percent change from base to target", () => {
    expect(pctDiff(80, 160)).toBe(100);   // +100% (the measured steel divergence)
    expect(pctDiff(160, 80)).toBe(-50);   // -50%
    expect(pctDiff(100, 125)).toBe(25);
  });
  it("uses |base| so a negative base still gives the right sign", () => {
    expect(pctDiff(-10, -5)).toBe(50);    // moved up by 5 on a base magnitude of 10
  });
  it("null-safe: non-numbers / non-finite / undefined-ratio -> null", () => {
    expect(pctDiff(0, 5)).toBe(null);     // division by zero base -> undefined
    expect(pctDiff(0, 0)).toBe(0);        // 0->0 is a defined 0% change
    expect(pctDiff(undefined, 5)).toBe(null);
    expect(pctDiff(5, NaN)).toBe(null);
    expect(pctDiff(Infinity, 5)).toBe(null);
  });
});

describe("extractMetrics (orchestrator vs engine result shapes)", () => {
  it("orchestrator: reads flat *_mpm/_N/_kw/_min fields (incl. {value} wrapper)", () => {
    const orch = { cutting_speed_mpm: 80.3, spindle_rpm: 2557, tangential_force_N: 577, power_kw: 0.77, tool_life_min: 360, surface_finish_Ra_um: 0.8 };
    const m = extractMetrics(orch, "orchestrator");
    expect(m.vc).toBe(80.3); expect(m.fc).toBe(577); expect(m.life).toBe(360); expect(m.ra).toBe(0.8);
    // also handles the {value:{...}} envelope shape
    expect(extractMetrics({ value: orch }, "orchestrator").vc).toBe(80.3);
  });
  it("engine: unwraps AtomicValue {value} from nested cutting_speed/forces/tool_life", () => {
    const eng = {
      cutting_speed: { value: 160 }, spindle_rpm: { value: 5093 },
      forces: { tangential_force_N: { value: 1035 } }, power: { required_power_kw: { value: 2.8 } },
      tool_life: { life_minutes: { value: 36 } }, surface_finish: { practical_ra_um: { value: 2.7 } },
    };
    const m = extractMetrics(eng, "engine");
    expect(m.vc).toBe(160); expect(m.rpm).toBe(5093); expect(m.fc).toBe(1035);
    expect(m.power).toBe(2.8); expect(m.life).toBe(36); expect(m.ra).toBe(2.7);
  });
  it("engine: missing nested fields -> undefined (no throw)", () => {
    const m = extractMetrics({}, "engine");
    expect(m.vc === undefined).toBe(true);
    expect(m.fc === undefined).toBe(true);
  });
});

describe("buildDiffRows", () => {
  it("builds a 6-metric row set with correct diff% (the measured steel case)", () => {
    const prod = { vc: 80.3, rpm: 2557, fc: 577, power: 0.77, life: 360, ra: 0.8 };
    const target = { vc: 160, rpm: 5093, fc: 1035, power: 2.8, life: 36, ra: 2.7 };
    const rows = buildDiffRows(prod, target);
    expect(rows).toHaveLength(6);
    const vcRow = rows.find((r) => r.metric.startsWith("Vc"));
    expect(vcRow.prod).toBe(80.3); expect(vcRow.target).toBe(160);
    expect(vcRow.diffPct).toBeCloseTo(99.3, 0);  // ~+99% (the documented divergence)
    const lifeRow = rows.find((r) => r.metric.startsWith("Tool life"));
    expect(lifeRow.diffPct).toBeCloseTo(-90, 0); // ~-90% tool life
  });
  it("missing metric -> diffPct null, does not throw", () => {
    const rows = buildDiffRows({ vc: 100 }, { vc: undefined });
    expect(rows.find((r) => r.metric.startsWith("Vc")).diffPct).toBe(null);
  });
});

describe("classifyCaseSafety", () => {
  it("flags production over-speed the engine fixes (HB500 case: prod 6min -> engine 185min)", () => {
    const r = classifyCaseSafety({ life: 6 }, { life: 185 });
    expect(r.flag).toBe("production-overspeed-engine-safer");
    expect(r.reason).toContain("6min");
    expect(r.reason).toContain("185min");
  });
  it("flags when the convergence would run HOTTER (engine life below floor and below production)", () => {
    const r = classifyCaseSafety({ life: 360 }, { life: 5 });
    expect(r.flag).toBe("convergence-introduces-short-life");
  });
  it("ok when neither side is below the life floor (steel rough: 360 -> 36)", () => {
    expect(classifyCaseSafety({ life: 360 }, { life: 36 }).flag).toBe("ok");
  });
  it("production short but engine not a clear fix (6 -> 10, not >2x) -> ok, not over-speed-fix", () => {
    expect(classifyCaseSafety({ life: 6 }, { life: 10 }).flag).toBe("ok");
  });
  it("unknown when tool-life missing on either side", () => {
    expect(classifyCaseSafety({ life: undefined }, { life: 100 }).flag).toBe("unknown");
    expect(classifyCaseSafety({ life: 100 }, { life: NaN }).flag).toBe("unknown");
  });
  it("respects a custom life floor", () => {
    // prod 12min: ok at floor 10, but over-speed-fix at floor 15 (engine 185 > 2x)
    expect(classifyCaseSafety({ life: 12 }, { life: 185 }, 10).flag).toBe("ok");
    expect(classifyCaseSafety({ life: 12 }, { life: 185 }, 15).flag).toBe("production-overspeed-engine-safer");
  });
});

describe("flagImplausibleProdVc (broken-turning detector)", () => {
  it("flags an implausibly low production Vc (the 1.8 m/min broken-turning case)", () => {
    expect(flagImplausibleProdVc({ vc: 1.8 })).toBe(true);
    expect(flagImplausibleProdVc({ vc: 1.9 })).toBe(true);
  });
  it("does NOT flag a plausible production Vc (milling 80, turning 185)", () => {
    expect(flagImplausibleProdVc({ vc: 80.3 })).toBe(false);
    expect(flagImplausibleProdVc({ vc: 185 })).toBe(false);
  });
  it("non-number / missing Vc -> not flagged (avoids false positives on n/a)", () => {
    expect(flagImplausibleProdVc({ vc: undefined })).toBe(false);
    expect(flagImplausibleProdVc({ vc: NaN })).toBe(false);
    expect(flagImplausibleProdVc({})).toBe(false);
  });
  it("respects a custom floor", () => {
    expect(flagImplausibleProdVc({ vc: 8 }, 5)).toBe(false);
    expect(flagImplausibleProdVc({ vc: 8 }, 10)).toBe(true);
  });
});
