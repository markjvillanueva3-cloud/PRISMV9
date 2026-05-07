/**
 * PhysicsFeatureExtractorEngine.test.ts
 * U-NN-FEAT03 — verifies the 5 physics features are computed correctly,
 * gracefully handle missing inputs, and produce values that match the
 * canonical formulas from physics/constants.ts.
 */

import { describe, it, expect } from "vitest";
import {
  PhysicsFeatureExtractorEngine,
  PHYSICS_FEATURE_DIM,
  PHYSICS_FEATURE_INDEX,
  physicsFeatureExtractorEngine,
} from "../engines/PhysicsFeatureExtractorEngine.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  kienzleForce,
  taylorLife,
} from "../physics/constants.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const SCHEMA_VERSION = "1.1.0";

function makeRecord(partial: {
  process?: "mill" | "lathe" | "wedm";
  bridge?: "sf" | "post" | "feature" | "ai" | "router";
  request?: Record<string, unknown>;
}): OutcomeRecord {
  return {
    schemaVersion: SCHEMA_VERSION as never,
    id: "test",
    ts: "2026-05-07T00:00:00Z",
    bridge: (partial.bridge ?? "sf") as never,
    process: partial.process ?? "mill",
    request_summary: (partial.request ?? {}) as never,
    response_summary: {},
  };
}

describe("PhysicsFeatureExtractorEngine", () => {
  // ───────── shape & graceful degradation ─────────

  it("returns Float64Array of length PHYSICS_FEATURE_DIM (=5)", () => {
    const f = PhysicsFeatureExtractorEngine.extract(makeRecord({}));
    expect(f).toBeInstanceOf(Float64Array);
    expect(f.length).toBe(PHYSICS_FEATURE_DIM);
    expect(PHYSICS_FEATURE_DIM).toBe(5);
  });

  it("returns all-zeros for an empty record (no material, no numerics)", () => {
    const f = PhysicsFeatureExtractorEngine.extract(makeRecord({}));
    for (let i = 0; i < f.length; i++) {
      expect(f[i]).toBe(0);
    }
  });

  it("returns 0 for affected feature when material is missing but numerics present", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        request: {
          // no material
          tool_diameter_mm: 10,
          depth_of_cut_mm: 2,
          spindle_rpm: 5000,
          feed_rate_mm_min: 800,
        },
      }),
    );
    // Kienzle and Taylor need material → 0.
    expect(f[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N]).toBe(0);
    expect(f[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN]).toBe(0);
    expect(f[PHYSICS_FEATURE_INDEX.THERMAL_LOAD_W]).toBe(0); // depends on Fc
    // Chatter risk needs only D & ap → non-zero.
    expect(f[PHYSICS_FEATURE_INDEX.CHATTER_RISK_IDX]).toBeCloseTo(0.2, 6);
    // Surface Ra needs only fz → non-zero.
    expect(f[PHYSICS_FEATURE_INDEX.SURFACE_RA_UM]).toBeGreaterThan(0);
  });

  it("never throws on NaN/negative/non-finite inputs — returns 0 for affected slots", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        request: {
          material: "1018",
          tool_diameter_mm: -5,
          depth_of_cut_mm: NaN,
          spindle_rpm: Infinity,
          feed_rate_mm_min: -100,
        },
      }),
    );
    for (let i = 0; i < f.length; i++) {
      expect(Number.isFinite(f[i])).toBe(true);
      expect(f[i]).toBeGreaterThanOrEqual(0);
    }
  });

  // ───────── Kienzle force ─────────

  it("Kienzle force matches canonical formula: Fc = kc1_1 · ap · h^(1-mc)", () => {
    const ap = 2; // mm
    const D = 10; // mm
    const rpm = 5000;
    const feedMmMin = 800;
    const flutes = 4; // engine assumes 4 for milling
    const fz = feedMmMin / (rpm * flutes); // = 0.04 mm/tooth
    const { kc1_1, mc } = CANONICAL_KIENZLE.P; // 1018 is ISO P
    const expected = kienzleForce(kc1_1, mc, ap, fz);

    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "mill",
        request: {
          material: "1018",
          tool_diameter_mm: D,
          depth_of_cut_mm: ap,
          spindle_rpm: rpm,
          feed_rate_mm_min: feedMmMin,
        },
      }),
    );
    // Within 1% of canonical Kienzle
    expect(f[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N]).toBeCloseTo(expected, 0);
    expect(f[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N]).toBeGreaterThan(0);
  });

  it("Kienzle force differs across ISO groups (P=1800 vs N=700 vs S=2800)", () => {
    function force(material: string): number {
      const f = PhysicsFeatureExtractorEngine.extract(
        makeRecord({
          process: "mill",
          request: {
            material,
            tool_diameter_mm: 10,
            depth_of_cut_mm: 2,
            spindle_rpm: 5000,
            feed_rate_mm_min: 800,
          },
        }),
      );
      return f[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N];
    }
    const steel = force("1018");
    const aluminum = force("6061");
    const titanium = force("Ti-6Al-4V");

    // ISO P (kc1_1=1800) > ISO N (kc1_1=700)
    expect(steel).toBeGreaterThan(aluminum);
    // ISO S (kc1_1=2800) > ISO P (kc1_1=1800)
    expect(titanium).toBeGreaterThan(steel);
    // Approximate ratios: titanium/steel ≈ 2800/1800 ≈ 1.56 (with rake/mc adjustments)
    expect(titanium / steel).toBeGreaterThan(1.3);
    expect(titanium / steel).toBeLessThan(1.8);
  });

  // ───────── Taylor tool life ─────────

  it("Taylor life matches canonical formula: T = (C/Vc)^(1/n)", () => {
    const D = 12;
    const rpm = 4000;
    const Vc_calc = (Math.PI * D * rpm) / 1000; // m/min
    const { C, n } = CANONICAL_TAYLOR.P;
    const expected = taylorLife(C, n, Vc_calc);

    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "lathe",
        request: {
          material: "4140",
          tool_diameter_mm: D,
          spindle_rpm: rpm,
          depth_of_cut_mm: 1,
          feed_rate_mm_min: 200,
        },
      }),
    );
    expect(f[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN]).toBeCloseTo(expected, 1);
    expect(f[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN]).toBeGreaterThan(0);
  });

  it("Taylor life decreases as cutting speed increases (V·T^n=C)", () => {
    function life(rpm: number): number {
      const f = PhysicsFeatureExtractorEngine.extract(
        makeRecord({
          process: "lathe",
          request: {
            material: "1018",
            tool_diameter_mm: 12,
            spindle_rpm: rpm,
            depth_of_cut_mm: 1,
            feed_rate_mm_min: 200,
          },
        }),
      );
      return f[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN];
    }
    const slow = life(1000);
    const fast = life(8000);
    expect(slow).toBeGreaterThan(fast);
  });

  it("Taylor life uses derived Vc when cutting_speed_m_min is absent", () => {
    const D = 10;
    const rpm = 3000;
    const Vc_derived = (Math.PI * D * rpm) / 1000; // ≈ 94.25 m/min

    const fNoVc = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "lathe",
        request: {
          material: "1018",
          tool_diameter_mm: D,
          spindle_rpm: rpm,
        },
      }),
    );
    const fWithVc = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "lathe",
        request: {
          material: "1018",
          cutting_speed_m_min: Vc_derived,
        },
      }),
    );
    expect(fNoVc[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN]).toBeCloseTo(
      fWithVc[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN],
      3,
    );
  });

  // ───────── Chatter risk ─────────

  it("chatter risk index is ap/D slenderness ratio", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        request: {
          tool_diameter_mm: 10,
          depth_of_cut_mm: 4,
        },
      }),
    );
    // ap/D = 4/10 = 0.4
    expect(f[PHYSICS_FEATURE_INDEX.CHATTER_RISK_IDX]).toBeCloseTo(0.4, 6);
  });

  it("chatter risk index clipped to upper bound (slenderness > 10 → 10)", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        request: {
          tool_diameter_mm: 1,
          depth_of_cut_mm: 50, // ap/D = 50, exceeds clip
        },
      }),
    );
    expect(f[PHYSICS_FEATURE_INDEX.CHATTER_RISK_IDX]).toBe(10);
  });

  // ───────── Surface Ra ─────────

  it("surface Ra follows Brammertz: Ra ≈ fz²/(32·r) · 1000 with r=0.4 mm default", () => {
    const rpm = 5000;
    const feedMmMin = 800;
    const flutes = 4;
    const fz = feedMmMin / (rpm * flutes); // 0.04
    const r = 0.4;
    const expected_Ra_um = (fz * fz) / (32 * r) * 1000; // ≈ 0.125

    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "mill",
        request: {
          tool_diameter_mm: 10,
          spindle_rpm: rpm,
          feed_rate_mm_min: feedMmMin,
        },
      }),
    );
    expect(f[PHYSICS_FEATURE_INDEX.SURFACE_RA_UM]).toBeCloseTo(expected_Ra_um, 4);
  });

  it("surface Ra grows quadratically with feed-per-tooth", () => {
    function ra(feedMmMin: number): number {
      const f = PhysicsFeatureExtractorEngine.extract(
        makeRecord({
          process: "mill",
          request: {
            tool_diameter_mm: 10,
            spindle_rpm: 5000,
            feed_rate_mm_min: feedMmMin,
          },
        }),
      );
      return f[PHYSICS_FEATURE_INDEX.SURFACE_RA_UM];
    }
    // Doubling feed should ~quadruple Ra (Ra ∝ fz²)
    const ra1 = ra(400);
    const ra2 = ra(800);
    expect(ra2 / ra1).toBeCloseTo(4, 1);
  });

  // ───────── Thermal load ─────────

  it("thermal_load_W = Kienzle force · Vc / 60 (cuttingPower converted from kW)", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        process: "mill",
        request: {
          material: "1018",
          tool_diameter_mm: 10,
          depth_of_cut_mm: 2,
          spindle_rpm: 5000,
          feed_rate_mm_min: 800,
        },
      }),
    );
    const Fc = f[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N];
    const Vc = (Math.PI * 10 * 5000) / 1000; // m/min ≈ 157
    const expected = (Fc * Vc) / 60; // W
    expect(f[PHYSICS_FEATURE_INDEX.THERMAL_LOAD_W]).toBeCloseTo(expected, 0);
  });

  it("thermal_load_W is 0 when force is 0 (no material → no force → no power)", () => {
    const f = PhysicsFeatureExtractorEngine.extract(
      makeRecord({
        request: {
          tool_diameter_mm: 10,
          depth_of_cut_mm: 2,
          spindle_rpm: 5000,
          feed_rate_mm_min: 800,
        },
      }),
    );
    expect(f[PHYSICS_FEATURE_INDEX.THERMAL_LOAD_W]).toBe(0);
  });

  // ───────── Batch ─────────

  it("extractBatch returns flat row-major Float64Array of (N × 5)", () => {
    const records = [
      makeRecord({ request: { material: "1018", tool_diameter_mm: 10, depth_of_cut_mm: 2, spindle_rpm: 5000, feed_rate_mm_min: 800 } }),
      makeRecord({ request: { material: "6061", tool_diameter_mm: 12, depth_of_cut_mm: 3, spindle_rpm: 8000, feed_rate_mm_min: 1500 } }),
      makeRecord({ request: { material: "Ti-6Al-4V", tool_diameter_mm: 8, depth_of_cut_mm: 1, spindle_rpm: 2000, feed_rate_mm_min: 200 } }),
    ];
    const flat = PhysicsFeatureExtractorEngine.extractBatch(records);
    expect(flat.length).toBe(records.length * PHYSICS_FEATURE_DIM);

    // First row matches single-record extract
    const single0 = PhysicsFeatureExtractorEngine.extract(records[0]);
    for (let i = 0; i < PHYSICS_FEATURE_DIM; i++) {
      expect(flat[i]).toBeCloseTo(single0[i], 6);
    }
    // Last row matches single-record extract
    const single2 = PhysicsFeatureExtractorEngine.extract(records[2]);
    const offset = (records.length - 1) * PHYSICS_FEATURE_DIM;
    for (let i = 0; i < PHYSICS_FEATURE_DIM; i++) {
      expect(flat[offset + i]).toBeCloseTo(single2[i], 6);
    }
  });

  // ───────── Singleton ─────────

  it("singleton export is a working instance", () => {
    expect(physicsFeatureExtractorEngine).toBeInstanceOf(PhysicsFeatureExtractorEngine);
  });

  // ───────── Determinism ─────────

  it("extract is pure: same record produces identical output across calls", () => {
    const r = makeRecord({
      request: {
        material: "316",
        tool_diameter_mm: 6,
        depth_of_cut_mm: 1.5,
        spindle_rpm: 4000,
        feed_rate_mm_min: 500,
      },
    });
    const f1 = PhysicsFeatureExtractorEngine.extract(r);
    const f2 = PhysicsFeatureExtractorEngine.extract(r);
    for (let i = 0; i < PHYSICS_FEATURE_DIM; i++) {
      expect(f1[i]).toBe(f2[i]);
    }
  });
});
