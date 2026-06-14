/**
 * Tests for JointSpeedFeedOptimizer — joint Vc/f max-MRR solver.
 *
 * Karpathy R9 — tests verify INTENT not behavior. Each test names WHY the
 * invariant matters. Tests use CANONICAL inputs from the existing
 * KienzleForceModel + ExtendedTaylorModel models (composition; no physics
 * duplicated here).
 *
 * Variability floor: 3 ISO groups (P/M/N) × 2 operations (turning/milling).
 * Coverage floor: happy path + ≥3 failure modes + ≥2 adversarial.
 */

import { describe, it, expect } from "vitest";
import {
  optimizeJoint,
  computePower_W,
  computeToolLife_min,
  computeMRR_mm3_min,
  JointSpeedFeedOptimizer,
  type JointOptimizerInput,
} from "../algorithms/JointSpeedFeedOptimizer.js";

/** Reasonable baseline input — 1018 steel, P-group, VF-2 spindle envelope. */
const BASELINE: JointOptimizerInput = {
  iso_group: "P",
  operation: "turning",
  ap_mm: 2.0,
  rake_angle_deg: 6,
  lead_angle_deg: 90,
  coating: "TiAlN",
  T_target_min: 30,
  P_max_W: 15000,
  Vc_min_m_min: 50,
  Vc_max_m_min: 400,
  f_min_mm: 0.05,
  f_max_mm: 0.4,
};

describe("JointSpeedFeedOptimizer — pure delegations", () => {
  describe("computePower_W (composes KienzleForceModel)", () => {
    it("returns positive finite power for valid Vc/f/ap", () => {
      const r = computePower_W({ Vc_m_min: 200, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 });
      expect(r.power_W).toBeGreaterThan(0);
      expect(Number.isFinite(r.power_W)).toBe(true);
      expect(r.force_N).toBeGreaterThan(0);
    });
    it("returns 0 power when Vc=0 (no chip removed)", () => {
      const r = computePower_W({ Vc_m_min: 0, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 });
      expect(r.power_W).toBe(0);
    });
    it("returns INFINITY when any input non-finite (R12 fail-loud)", () => {
      const r = computePower_W({ Vc_m_min: NaN, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 });
      expect(r.power_W).toBe(Number.POSITIVE_INFINITY);
    });
    it("power scales with Vc (monotonic increasing)", () => {
      const p100 = computePower_W({ Vc_m_min: 100, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 }).power_W;
      const p200 = computePower_W({ Vc_m_min: 200, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 }).power_W;
      const p300 = computePower_W({ Vc_m_min: 300, f_mm: 0.2, ap_mm: 2.0, operation: "turning", rake_deg: 6, lead_deg: 90 }).power_W;
      expect(p100).toBeLessThan(p200);
      expect(p200).toBeLessThan(p300);
    });
  });

  describe("computeToolLife_min (composes ExtendedTaylorModel)", () => {
    it("returns positive finite life for valid input", () => {
      const r = computeToolLife_min({ Vc_m_min: 150, f_mm: 0.2, ap_mm: 2.0, iso_group: "P", coating: "TiAlN" });
      expect(r.life_min).toBeGreaterThan(0);
      expect(Number.isFinite(r.life_min)).toBe(true);
    });
    it("life is monotonic DECREASING in Vc (faster = shorter)", () => {
      const t100 = computeToolLife_min({ Vc_m_min: 100, f_mm: 0.2, ap_mm: 2.0, iso_group: "P" }).life_min;
      const t300 = computeToolLife_min({ Vc_m_min: 300, f_mm: 0.2, ap_mm: 2.0, iso_group: "P" }).life_min;
      expect(t100).toBeGreaterThan(t300);
    });
    it("returns 0 for Vc=0 (no cutting → no wear)", () => {
      const r = computeToolLife_min({ Vc_m_min: 0, f_mm: 0.2, ap_mm: 2.0, iso_group: "P" });
      expect(r.life_min).toBe(0);
    });
  });

  describe("computeMRR_mm3_min (pure unit-bridge)", () => {
    it("MRR = Vc·1000·f·ap (m/min → mm³/min unit conversion)", () => {
      expect(computeMRR_mm3_min(100, 0.2, 2.0)).toBeCloseTo(100 * 1000 * 0.2 * 2.0);
    });
    it("returns 0 on any zero/non-finite input", () => {
      expect(computeMRR_mm3_min(0, 0.2, 2.0)).toBe(0);
      expect(computeMRR_mm3_min(100, 0, 2.0)).toBe(0);
      expect(computeMRR_mm3_min(NaN, 0.2, 2.0)).toBe(0);
      expect(computeMRR_mm3_min(100, 0.2, Infinity)).toBe(0);
    });
  });
});

describe("JointSpeedFeedOptimizer — optimizeJoint() happy paths", () => {
  it("BASELINE P-turning: returns feasible solution with finite Vc/f/MRR", () => {
    const r = optimizeJoint(BASELINE);
    expect(r.feasible).toBe(true);
    expect(r.Vc_m_min.value).toBeGreaterThan(BASELINE.Vc_min_m_min);
    expect(r.Vc_m_min.value).toBeLessThanOrEqual(BASELINE.Vc_max_m_min);
    expect(r.f_mm.value).toBeGreaterThanOrEqual(BASELINE.f_min_mm);
    expect(r.f_mm.value).toBeLessThanOrEqual(BASELINE.f_max_mm);
    expect(r.MRR_mm3_min.value).toBeGreaterThan(0);
    expect(["tool_life", "power", "Vc_upper", "f_upper"]).toContain(r.binding_constraint);
  });

  it("M-group (stainless): solution respects T_target within tolerance", () => {
    const r = optimizeJoint({ ...BASELINE, iso_group: "M", T_target_min: 20 });
    expect(r.feasible).toBe(true);
    // T_target met within bisection resolution (1% slack)
    expect(r.T_min_at_solution.value).toBeGreaterThanOrEqual(r.binding_constraint === "tool_life" ? 19.5 : 0);
  });

  it("N-group (aluminum, low-resistance): higher Vc than P-group at same constraints", () => {
    const rP = optimizeJoint(BASELINE);
    const rN = optimizeJoint({ ...BASELINE, iso_group: "N" });
    expect(rP.feasible && rN.feasible).toBe(true);
    expect(rN.Vc_m_min.value).toBeGreaterThan(rP.Vc_m_min.value);
  });

  it("milling operation also produces feasible solution", () => {
    const r = optimizeJoint({ ...BASELINE, operation: "milling" });
    expect(r.feasible).toBe(true);
    expect(r.MRR_mm3_min.value).toBeGreaterThan(0);
  });

  it("AtomicValue outputs carry source provenance (not 'infeasible')", () => {
    const r = optimizeJoint(BASELINE);
    expect(r.P_W_at_solution.source).toContain("KienzleForceModel");
    expect(r.T_min_at_solution.source).toContain("ExtendedTaylorModel");
    expect(r.Vc_m_min.source).toContain("JointSpeedFeedOptimizer");
  });
});

describe("JointSpeedFeedOptimizer — power-bound regime", () => {
  // At ap=2.0 baseline, full-MRR (f=0.4, Vc≈122 m/min on Taylor isoline) needs
  // ~3-7kW depending on coating/lead. Setting P_max=3000W tightens below the
  // free-running Taylor-only optimum and forces the bisection to drop f.
  const TIGHT_P_MAX = 3000;
  const LOOSE_P_MAX = 12000;

  it("tight power budget binds 'power' constraint (not tool_life)", () => {
    const r = optimizeJoint({ ...BASELINE, P_max_W: TIGHT_P_MAX });
    expect(r.feasible).toBe(true);
    expect(r.binding_constraint).toBe("power");
    // Power at solution is at the ceiling (within bisection-tolerance window)
    expect(r.P_W_at_solution.value).toBeLessThanOrEqual(TIGHT_P_MAX + 100);
  });

  it("when power binds, increasing P_max yields higher MRR (sanity check)", () => {
    const tight = optimizeJoint({ ...BASELINE, P_max_W: TIGHT_P_MAX });
    const loose = optimizeJoint({ ...BASELINE, P_max_W: LOOSE_P_MAX });
    expect(tight.feasible).toBe(true);
    expect(loose.feasible).toBe(true);
    expect(loose.MRR_mm3_min.value).toBeGreaterThan(tight.MRR_mm3_min.value);
  });
});

describe("JointSpeedFeedOptimizer — infeasibility (R12 fail-loud)", () => {
  it("power unsatisfiable even at f_min → infeasible with f_lower binding", () => {
    const r = optimizeJoint({ ...BASELINE, P_max_W: 100, ap_mm: 4.0, f_min_mm: 0.3 });
    expect(r.feasible).toBe(false);
    expect(r.binding_constraint).toBe("f_lower");
    expect(r.notes.length).toBeGreaterThan(0);
  });
  it("T_target unreachable even at Vc_min → infeasible", () => {
    const r = optimizeJoint({ ...BASELINE, T_target_min: 600, Vc_min_m_min: 250, Vc_max_m_min: 400 });
    expect(r.feasible).toBe(false);
    expect(r.binding_constraint).toBe("Vc_lower");
  });
  it("Vc range collapsed → infeasible with explanatory note", () => {
    const r = optimizeJoint({ ...BASELINE, Vc_min_m_min: 200, Vc_max_m_min: 200 });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("Vc range");
  });
  it("feed range collapsed → infeasible", () => {
    const r = optimizeJoint({ ...BASELINE, f_min_mm: 0.2, f_max_mm: 0.2 });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("feed range");
  });
});

describe("JointSpeedFeedOptimizer — adversarial inputs", () => {
  it("NaN ap_mm → infeasible (no crash)", () => {
    const r = optimizeJoint({ ...BASELINE, ap_mm: NaN });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("non-finite");
  });
  it("Infinity P_max_W → infeasible (no silent-pass)", () => {
    const r = optimizeJoint({ ...BASELINE, P_max_W: Infinity });
    expect(r.feasible).toBe(false);
  });
  it("negative T_target → infeasible", () => {
    const r = optimizeJoint({ ...BASELINE, T_target_min: -10 });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("non-positive");
  });
  it("unknown iso_group → infeasible with named diagnostic", () => {
    const r = optimizeJoint({ ...BASELINE, iso_group: "ZZ" as JointOptimizerInput["iso_group"] });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("unknown iso_group: ZZ");
  });
  it("T_target below floor (0.5 min) → infeasible", () => {
    const r = optimizeJoint({ ...BASELINE, T_target_min: 0.5 });
    expect(r.feasible).toBe(false);
    expect(r.notes.join("|")).toContain("floor");
  });
});

describe("JointSpeedFeedOptimizer — algebraic invariants", () => {
  it("MRR at solution equals Vc·1000·f·ap (unit-bridge consistency)", () => {
    const r = optimizeJoint(BASELINE);
    expect(r.feasible).toBe(true);
    const expectedMRR = r.Vc_m_min.value * 1000 * r.f_mm.value * BASELINE.ap_mm;
    expect(r.MRR_mm3_min.value).toBeCloseTo(expectedMRR, 1);
  });
  it("solution iterations are bounded (≤ 200, no runaway loops)", () => {
    const r = optimizeJoint(BASELINE);
    expect(r.iterations).toBeLessThanOrEqual(200);
  });
  it("deterministic — same input → same output", () => {
    const r1 = optimizeJoint(BASELINE);
    const r2 = optimizeJoint(BASELINE);
    expect(r1.Vc_m_min.value).toBe(r2.Vc_m_min.value);
    expect(r1.f_mm.value).toBe(r2.f_mm.value);
    expect(r1.MRR_mm3_min.value).toBe(r2.MRR_mm3_min.value);
    expect(r1.binding_constraint).toBe(r2.binding_constraint);
  });
});

describe("JointSpeedFeedOptimizer — singleton + exports", () => {
  it("JointSpeedFeedOptimizer.version is '1.0.0'", () => {
    expect(JointSpeedFeedOptimizer.version).toBe("1.0.0");
  });
  it("singleton exposes the 4 public functions", () => {
    expect(typeof JointSpeedFeedOptimizer.optimizeJoint).toBe("function");
    expect(typeof JointSpeedFeedOptimizer.computePower_W).toBe("function");
    expect(typeof JointSpeedFeedOptimizer.computeToolLife_min).toBe("function");
    expect(typeof JointSpeedFeedOptimizer.computeMRR_mm3_min).toBe("function");
  });
});
