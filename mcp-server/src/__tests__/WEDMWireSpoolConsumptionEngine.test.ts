/**
 * WEDMWireSpoolConsumptionEngine — unit tests
 * P2P-FULLSTACK-MS0 / U-P2PFS41
 */
import { describe, it, expect } from "vitest";
import {
  WEDMWireSpoolConsumptionEngine,
  wedmWireSpoolConsumptionEngine,
  type WireSpoolConsumptionInput,
} from "../engines/WEDMWireSpoolConsumptionEngine.js";
import { WEDM_SPOOL_SPEC } from "../physics/wedm-constants.js";

// ── Fixtures ──────────────────────────────────────────────────────────

const FRESH_8KG_0_25 = WEDM_SPOOL_SPEC.default_capacity_m_8kg_brass_025; // 15000

function base(overrides: Partial<WireSpoolConsumptionInput> = {}): WireSpoolConsumptionInput {
  return {
    total_wire_m: 5000,
    spool_capacity_m: FRESH_8KG_0_25,
    auto_threader_available: true,
    machine_rate_usd_hr: 85,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("WEDMWireSpoolConsumptionEngine", () => {
  const engine = new WEDMWireSpoolConsumptionEngine();

  describe("zero-change jobs", () => {
    it("needs no mid-job change when total ≤ (fresh − buffer)", () => {
      const r = engine.calculate(base({ total_wire_m: 5000 }));
      expect(r.spool_changes_required).toBe(0);
      expect(r.change_points_m).toHaveLength(0);
      expect(r.mid_job_change_risk).toBe("none");
      expect(r.spools_required).toBe(1);
    });

    it("reports remaining wire after the job correctly", () => {
      const r = engine.calculate(base({ total_wire_m: 6000 }));
      // 15000 − 6000 = 9000 m remaining
      expect(r.wire_remaining_after_job_m).toBeCloseTo(9000, 3);
    });

    it("still issues a plan-ahead rec when remaining < 2× buffer", () => {
      // buffer = 500 → warn when remaining < 1000.
      // total = 14200 → remaining = 800 < 1000
      const r = engine.calculate(base({ total_wire_m: 14200 }));
      expect(r.mid_job_change_risk).toBe("none");
      expect(r.recommendations.some((x) => /plan a fresh spool/i.test(x))).toBe(true);
    });
  });

  describe("single mid-job change", () => {
    it("identifies exactly one change when total straddles usable capacity", () => {
      // usable from fresh = 15000 − 500 = 14500
      // total = 20000 → one change at 14500 m
      const r = engine.calculate(base({ total_wire_m: 20000 }));
      expect(r.spool_changes_required).toBe(1);
      expect(r.mid_job_change_risk).toBe("single_change");
      expect(r.change_points_m).toEqual([14500]);
      expect(r.spools_required).toBe(2);
    });

    it("accounts for a partial starting spool", () => {
      // starting remaining = 5000 → usable = 4500
      // total = 10000 → first change at 4500; 5500 left ≤ 14500 → done
      const r = engine.calculate(
        base({ total_wire_m: 10000, wire_remaining_m: 5000 }),
      );
      expect(r.spool_changes_required).toBe(1);
      expect(r.change_points_m).toEqual([4500]);
      expect(r.spools_required).toBe(2);
    });
  });

  describe("multiple changes / high exposure", () => {
    it("reports 2 changes for total that spans 2 fresh-spool-usables past start", () => {
      // remaining=15000 → usable=14500 (first change @14500)
      // 2nd spool usable=14500 → 2nd change @29000
      // total = 30000 → after 2nd change, 1000 m left → done.
      const r = engine.calculate(base({ total_wire_m: 30000 }));
      expect(r.spool_changes_required).toBe(2);
      expect(r.change_points_m).toEqual([14500, 29000]);
      expect(r.mid_job_change_risk).toBe("multiple_changes");
    });

    it("flags high_exposure at ≥ high_exposure_change_count changes", () => {
      // 4 changes → high_exposure (threshold = 3)
      const r = engine.calculate(base({ total_wire_m: 60000 }));
      expect(r.spool_changes_required).toBeGreaterThanOrEqual(
        WEDM_SPOOL_SPEC.high_exposure_change_count,
      );
      expect(r.mid_job_change_risk).toBe("high_exposure");
      expect(r.warnings.some((w) => /jumbo|batching/i.test(w))).toBe(true);
    });

    it("change points are strictly increasing cumulative consumption values", () => {
      const r = engine.calculate(base({ total_wire_m: 60000 }));
      for (let i = 1; i < r.change_points_m.length; i++) {
        expect(r.change_points_m[i]).toBeGreaterThan(r.change_points_m[i - 1]);
      }
    });
  });

  describe("downtime + cost", () => {
    it("uses auto-thread time (30 s = 0.5 min) when auto_threader_available=true", () => {
      const r = engine.calculate(base({ total_wire_m: 20000, auto_threader_available: true }));
      expect(r.per_change_time_min).toBeCloseTo(WEDM_SPOOL_SPEC.auto_thread_min, 3);
      expect(r.total_change_time_min).toBeCloseTo(1 * WEDM_SPOOL_SPEC.auto_thread_min, 3);
    });

    it("uses manual-thread time (5 min) otherwise, and costs at machine rate", () => {
      const r = engine.calculate(
        base({ total_wire_m: 20000, auto_threader_available: false, machine_rate_usd_hr: 120 }),
      );
      expect(r.per_change_time_min).toBeCloseTo(WEDM_SPOOL_SPEC.manual_thread_min, 3);
      // 1 change × 5 min × $120/hr = $10.00
      expect(r.total_change_cost_usd).toBeCloseTo(10.0, 3);
    });

    it("recommends auto-threader when manual and changes > 0", () => {
      const r = engine.calculate(
        base({ total_wire_m: 20000, auto_threader_available: false }),
      );
      expect(r.recommendations.some((x) => /auto-threader/i.test(x))).toBe(true);
    });
  });

  describe("input validation", () => {
    it("rejects non-positive total_wire_m", () => {
      expect(() => engine.calculate(base({ total_wire_m: 0 }))).toThrow(/total_wire_m/);
    });

    it("rejects non-positive spool_capacity_m", () => {
      expect(() => engine.calculate(base({ spool_capacity_m: -5 }))).toThrow(
        /spool_capacity_m/,
      );
    });

    it("rejects wire_remaining_m outside [0, capacity]", () => {
      expect(() =>
        engine.calculate(base({ wire_remaining_m: -1 })),
      ).toThrow(/wire_remaining_m/);
      expect(() =>
        engine.calculate(base({ wire_remaining_m: FRESH_8KG_0_25 + 1 })),
      ).toThrow(/wire_remaining_m/);
    });

    it("rejects negative machine rate", () => {
      expect(() => engine.calculate(base({ machine_rate_usd_hr: -10 }))).toThrow(
        /machine_rate_usd_hr/,
      );
    });
  });

  describe("singleton export", () => {
    it("exports a reusable singleton", () => {
      expect(wedmWireSpoolConsumptionEngine).toBeInstanceOf(WEDMWireSpoolConsumptionEngine);
      const r = wedmWireSpoolConsumptionEngine.calculate(base());
      expect(r.spool_changes_required).toBe(0);
    });
  });
});
