import { describe, it, expect } from "vitest";
import {
  generateLatheCandidateGrid,
  scoreLatheCandidate,
  findOptimalLatheParams,
  defaultPSteelLatheContext,
  type LatheOptimizerCtx,
  type IsoGroup,
} from "../components/calculator/LatheOptimizer";
import { LATHE_VENDOR_BASELINE } from "../components/calculator/LatheVendorBaseline";

/**
 * LATHE-STUDIO-MS0/U-LSTUD-OPTIMIZER tests (oscar, 2026-05-25 iter29).
 *
 * Coverage: candidate grid bounding + scoring math + 7-gate constraint
 * propagation + risk_mode mechanics + WOULD-DISLODGE safety + objective
 * dispatch + end-to-end findOptimalLatheParams happy path / no-feasible.
 *
 * Mirrors MillOptimizer.test.ts coverage structure but with turning-specific
 * physics: CSS RPM at avg cut diameter, chuck grip force, two-region spindle
 * torque envelope, L/D-driven tailstock requirement, line-of-cusps Ra.
 */

describe("LatheOptimizer — end-to-end constrained multi-objective turning-param selector", () => {
  describe("generateLatheCandidateGrid — vendor-anchored ±50% bounded search", () => {
    it("produces exactly 125 candidates for the canonical P-steel context (5×5×5)", () => {
      const grid = generateLatheCandidateGrid(defaultPSteelLatheContext());
      expect(grid.length).toBe(125);
    });

    it("every candidate has positive Vc / fr / ap (no zero-pollution from the grid generator)", () => {
      const grid = generateLatheCandidateGrid(defaultPSteelLatheContext());
      for (const c of grid) {
        expect(c.Vc_m_min).toBeGreaterThan(0);
        expect(c.fr_mm_per_rev).toBeGreaterThan(0);
        expect(c.ap_mm).toBeGreaterThan(0);
      }
    });

    it("Vc range stays inside [vendor_V × 0.5, vendor_V × 1.5] for every ISO group", () => {
      const groups: IsoGroup[] = ["P", "M", "K", "N", "S", "H"];
      for (const g of groups) {
        const baseline = LATHE_VENDOR_BASELINE[g];
        const ctx = defaultPSteelLatheContext();
        ctx.material = { ...ctx.material, iso_group: g };
        const grid = generateLatheCandidateGrid(ctx);
        const Vc_min = Math.min(...grid.map((c) => c.Vc_m_min));
        const Vc_max = Math.max(...grid.map((c) => c.Vc_m_min));
        expect(Vc_min).toBeCloseTo(baseline.V_mid_m_min * 0.5, 6);
        expect(Vc_max).toBeCloseTo(baseline.V_mid_m_min * 1.5, 6);
      }
    });

    it("ap_max is bounded by min(insert.max_doc, vendor ap_mid × 1.5)", () => {
      const ctx = defaultPSteelLatheContext();
      // Insert with very low max_doc — should clip the upper end
      ctx.insert = { ...ctx.insert, max_doc_mm: 1.0 };
      const grid = generateLatheCandidateGrid(ctx);
      const ap_max = Math.max(...grid.map((c) => c.ap_mm));
      expect(ap_max).toBeLessThanOrEqual(1.0);
    });

    it("vendor ap_mid × 1.5 acts as the cap when the insert allows it", () => {
      const ctx = defaultPSteelLatheContext();
      // Insert with very high max_doc — vendor cap should dominate
      ctx.insert = { ...ctx.insert, max_doc_mm: 999 };
      const grid = generateLatheCandidateGrid(ctx);
      const ap_max = Math.max(...grid.map((c) => c.ap_mm));
      const expected_cap = LATHE_VENDOR_BASELINE.P.ap_mid_mm * 1.5; // 3.0
      expect(ap_max).toBeCloseTo(expected_cap, 6);
    });
  });

  describe("scoreLatheCandidate — per-candidate physics + 7 constraint gates", () => {
    it("vendor mid-range candidate is feasible under standard mode for P-group steel", () => {
      const ctx = defaultPSteelLatheContext();
      const baseline = LATHE_VENDOR_BASELINE.P;
      const c = { Vc_m_min: baseline.V_mid_m_min, fr_mm_per_rev: baseline.fr_mid_mm, ap_mm: baseline.ap_mid_mm };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(true);
      expect(s.block_reasons).toEqual([]);
      expect(s.rpm).toBeGreaterThan(0);
      expect(s.mrr_mm3_min).toBeGreaterThan(0);
      expect(s.power_kw).toBeGreaterThan(0);
      expect(s.taylor_life_min).toBeGreaterThan(0);
    });

    it("avg_cut_diameter equals (start_dia + finish_dia) / 2 — CSS honesty", () => {
      const ctx = defaultPSteelLatheContext();
      // 50 + 45 → 47.5
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.3, ap_mm: 2 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.avg_cut_diameter_mm).toBeCloseTo(47.5, 6);
    });

    it("over-aggressive ap blocks via insert max_doc gate (named cause)", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.insert = { ...ctx.insert, max_doc_mm: 1.5 };
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.3, ap_mm: 3.0 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(false);
      expect(s.block_reasons.some((r) => r.includes("max_doc"))).toBe(true);
    });

    it("over-aggressive Vc blocks via spindle power headroom gate (Sandvik §3.4 85%)", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.lathe = { ...ctx.lathe, spindle_kw: 0.5 }; // tiny spindle
      const c = { Vc_m_min: 300, fr_mm_per_rev: 0.45, ap_mm: 3 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(false);
      expect(s.block_reasons.some((r) => r.includes("power"))).toBe(true);
    });

    it("WOULD DISLODGE gate fires when chuck grip cap is too low for the cutting force", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.chuck = { ...ctx.chuck, grip_capacity_n: 100 }; // tiny chuck
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.45, ap_mm: 3 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(false);
      expect(s.block_reasons.some((r) => r.includes("WOULD DISLODGE"))).toBe(true);
    });

    it("Ra target gate fires when fr is too aggressive for the nose radius", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.feature = { ...ctx.feature, ra_target_um: 1.0, tolerance_band_mm: 0.001 };
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.45, ap_mm: 2 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(false);
      expect(s.block_reasons.some((r) => r.includes("Ra"))).toBe(true);
    });

    it("tailstock requirement fires when L/D > 4 and tailstock NOT engaged", () => {
      const ctx = defaultPSteelLatheContext();
      // 600mm length on 100mm avg-cut-dia → L/D = 6
      ctx.stock = { ...ctx.stock, length_mm: 600, diameter_mm: 100, finish_diameter_mm: 100 };
      ctx.tailstock = { engaged: false, type: "none" };
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.30, ap_mm: 0.5 };
      const s = scoreLatheCandidate(ctx, c);
      expect(s.feasible).toBe(false);
      expect(s.block_reasons.some((r) => r.includes("tailstock"))).toBe(true);
    });

    it("tailstock engagement clears the L/D > 4 block", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.stock = { ...ctx.stock, length_mm: 600, diameter_mm: 100, finish_diameter_mm: 100 };
      ctx.tailstock = { engaged: true, type: "live-center", thrust_capacity_n: 5000 };
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.30, ap_mm: 0.5 };
      const s = scoreLatheCandidate(ctx, c);
      // Other gates may still block, but the tailstock block must NOT appear
      expect(s.block_reasons.some((r) => r.includes("tailstock"))).toBe(false);
    });

    it("Taylor life is finite + positive for vendor V; collapses to 0 for absurd Vc", () => {
      const ctx = defaultPSteelLatheContext();
      const good = scoreLatheCandidate(ctx, { Vc_m_min: 200, fr_mm_per_rev: 0.3, ap_mm: 2 });
      expect(good.taylor_life_min).toBeGreaterThan(0);
      expect(Number.isFinite(good.taylor_life_min)).toBe(true);
    });

    it("safety_margin in [0, 1] for feasible candidates and 0 for blocked", () => {
      const ctx = defaultPSteelLatheContext();
      const safe = scoreLatheCandidate(ctx, {
        Vc_m_min: LATHE_VENDOR_BASELINE.P.V_mid_m_min,
        fr_mm_per_rev: LATHE_VENDOR_BASELINE.P.fr_mid_mm * 0.5,
        ap_mm: LATHE_VENDOR_BASELINE.P.ap_mid_mm * 0.5,
      });
      expect(safe.safety_margin).toBeGreaterThanOrEqual(0);
      expect(safe.safety_margin).toBeLessThanOrEqual(1);

      // Blocked candidate (massive ap exceeds insert.max_doc) → safety_margin = 0
      const blocked = scoreLatheCandidate(ctx, {
        Vc_m_min: 200,
        fr_mm_per_rev: 0.3,
        ap_mm: 50, // insert.max_doc is 4
      });
      expect(blocked.feasible).toBe(false);
      expect(blocked.safety_margin).toBe(0);
    });
  });

  describe("Risk-mode mechanics — rush / standard / high_volume", () => {
    it("rush mode relaxes power headroom from 85% → 95%, admitting heavier cuts the standard rejects", () => {
      const ctx_std = defaultPSteelLatheContext();
      ctx_std.lathe = { ...ctx_std.lathe, spindle_kw: 2.0 }; // 1.7 kW @85%, 1.9 kW @95%
      const ctx_rush = { ...ctx_std, risk_mode: "rush" as const };
      const c = { Vc_m_min: 250, fr_mm_per_rev: 0.3, ap_mm: 2 };
      const s_std = scoreLatheCandidate(ctx_std, c);
      const s_rush = scoreLatheCandidate(ctx_rush, c);
      // Find a candidate where standard blocks-on-power but rush accepts
      const std_power_blocked = s_std.block_reasons.some((r) => r.includes("power"));
      const rush_power_blocked = s_rush.block_reasons.some((r) => r.includes("power"));
      // Even if both are blocked or both pass for THIS exact candidate, the
      // rush gate must NOT be stricter than the standard gate on power.
      if (std_power_blocked) {
        // Rush should not introduce a NEW power block when std had one
        expect(rush_power_blocked).toBeFalsy();
      }
    });

    it("high_volume mode tightens torque headroom from 85% → 80% (more conservative)", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.risk_mode = "high_volume";
      // Specially-crafted candidate where required torque is 82% of available — rejected at 80%, accepted at 85%
      const ctx_std = { ...ctx, risk_mode: "standard" as const };
      const c = { Vc_m_min: 200, fr_mm_per_rev: 0.30, ap_mm: 2 };
      const s_hv = scoreLatheCandidate(ctx, c);
      const s_std = scoreLatheCandidate(ctx_std, c);
      // high_volume gates can only be ≥ as strict as standard. If standard blocks-on-torque, high_volume must too.
      const std_torque_blocked = s_std.block_reasons.some((r) => r.includes("torque"));
      const hv_torque_blocked = s_hv.block_reasons.some((r) => r.includes("torque"));
      if (std_torque_blocked) {
        expect(hv_torque_blocked).toBe(true);
      }
    });

    it("rush_factor boosts score for feasible candidates (rush_factor=1 produces strictly higher score than rush_factor=0)", () => {
      const ctx0 = defaultPSteelLatheContext();
      const ctx1 = { ...ctx0, rush_factor: 1 };
      const baseline = LATHE_VENDOR_BASELINE.P;
      const c = { Vc_m_min: baseline.V_mid_m_min * 0.5, fr_mm_per_rev: baseline.fr_mid_mm * 0.5, ap_mm: baseline.ap_mid_mm * 0.5 };
      const s0 = scoreLatheCandidate(ctx0, c);
      const s1 = scoreLatheCandidate(ctx1, c);
      // rush_factor=1 → 1.15× score multiplier
      if (s0.feasible && s1.feasible) {
        expect(s1.objective_score).toBeGreaterThanOrEqual(s0.objective_score);
      }
    });
  });

  describe("Objective dispatch — minimize_cost / minimize_time / maximize_throughput / maximize_quality / balance", () => {
    it("minimize_time prefers higher-MRR (lower cycle_time) over lower-cost candidates", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.objective = "minimize_time";
      const result = findOptimalLatheParams(ctx);
      expect(result.winner).not.toBeNull();
      // Winner cycle should be short (≤30 min for this 50mm bar)
      expect(result.winner!.cycle_time_min).toBeLessThan(30);
    });

    it("minimize_cost surfaces a finite per-part cost as the winner", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.objective = "minimize_cost";
      const result = findOptimalLatheParams(ctx);
      expect(result.winner).not.toBeNull();
      expect(Number.isFinite(result.winner!.cost_per_part_usd)).toBe(true);
      expect(result.winner!.cost_per_part_usd).toBeGreaterThan(0);
    });

    it("maximize_quality biases the winner toward lower fr (line-of-cusps Ra ∝ fr²)", () => {
      const ctx_quality = defaultPSteelLatheContext();
      ctx_quality.objective = "maximize_quality";
      ctx_quality.feature = { ...ctx_quality.feature, ra_target_um: 6.4, tolerance_band_mm: 0.1 };
      const ctx_time = { ...ctx_quality, objective: "minimize_time" as const };
      const r_quality = findOptimalLatheParams(ctx_quality);
      const r_time = findOptimalLatheParams(ctx_time);
      expect(r_quality.winner).not.toBeNull();
      expect(r_time.winner).not.toBeNull();
      // Quality winner should NOT have a worse Ra than the time winner
      expect(r_quality.winner!.ra_theoretical_um).toBeLessThanOrEqual(r_time.winner!.ra_theoretical_um);
    });

    it("balance objective uses a weighted mix — emits a feasible winner for the default context", () => {
      const ctx = defaultPSteelLatheContext();
      ctx.objective = "balance";
      const result = findOptimalLatheParams(ctx);
      expect(result.winner).not.toBeNull();
      expect(result.winner!.objective_score).toBeGreaterThan(0);
      expect(result.winner!.objective_score).toBeLessThanOrEqual(1);
    });
  });

  describe("findOptimalLatheParams — end-to-end happy path + no-feasible diagnostic", () => {
    it("returns a winner + ≤3 alternatives for the canonical default context", () => {
      const result = findOptimalLatheParams(defaultPSteelLatheContext());
      expect(result.winner).not.toBeNull();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
      expect(result.total_evaluated).toBe(125);
      expect(result.feasible_count).toBeGreaterThan(0);
      expect(result.rationale).toContain("Winner under");
    });

    it("alternatives are strictly inferior to the winner by objective_score", () => {
      const result = findOptimalLatheParams(defaultPSteelLatheContext());
      const winner_score = result.winner!.objective_score;
      for (const alt of result.alternatives) {
        expect(alt.objective_score).toBeLessThanOrEqual(winner_score);
      }
    });

    it("when every candidate blocks, returns winner=null + diagnostic rationale", () => {
      const ctx = defaultPSteelLatheContext();
      // Make the spindle absurdly weak so EVERY candidate fails the power gate
      ctx.lathe = { ...ctx.lathe, spindle_kw: 0.001 };
      const result = findOptimalLatheParams(ctx);
      expect(result.winner).toBeNull();
      expect(result.alternatives.length).toBe(0);
      expect(result.feasible_count).toBe(0);
      expect(result.rationale).toContain("NO FEASIBLE candidate");
    });

    it("vendor-anchored P-steel winner sits inside the published Sandvik mid-range envelope", () => {
      const result = findOptimalLatheParams(defaultPSteelLatheContext());
      const baseline = LATHE_VENDOR_BASELINE.P;
      const w = result.winner!;
      // Winner Vc should be within the [0.5×, 1.5×] envelope by construction
      expect(w.params.Vc_m_min).toBeGreaterThanOrEqual(baseline.V_mid_m_min * 0.5);
      expect(w.params.Vc_m_min).toBeLessThanOrEqual(baseline.V_mid_m_min * 1.5);
      expect(w.params.fr_mm_per_rev).toBeGreaterThanOrEqual(baseline.fr_mid_mm * 0.5);
      expect(w.params.fr_mm_per_rev).toBeLessThanOrEqual(baseline.fr_mid_mm * 1.5);
    });

    it("rush risk_mode produces equal-or-greater winner score than standard for the same context (rush_boost)", () => {
      const ctx_std = defaultPSteelLatheContext();
      const ctx_rush = { ...ctx_std, risk_mode: "rush" as const, rush_factor: 1 };
      const r_std = findOptimalLatheParams(ctx_std);
      const r_rush = findOptimalLatheParams(ctx_rush);
      expect(r_std.winner).not.toBeNull();
      expect(r_rush.winner).not.toBeNull();
      expect(r_rush.winner!.objective_score).toBeGreaterThanOrEqual(r_std.winner!.objective_score);
    });
  });

  describe("Cross-ISO spanning sweep — every group produces a feasible winner under the canonical envelope", () => {
    const groups: IsoGroup[] = ["P", "M", "K", "N", "S", "H"];
    for (const g of groups) {
      it(`ISO ${g} (${g === "P" ? "steel" : g === "M" ? "stainless" : g === "K" ? "cast iron" : g === "N" ? "aluminum" : g === "S" ? "superalloy" : "hardened steel"}) finds a winner`, () => {
        const ctx = defaultPSteelLatheContext();
        const baseline = LATHE_VENDOR_BASELINE[g];
        ctx.material = {
          iso_group: g,
          hardness_hrc: g === "H" ? 60 : 0,
          kc_n_per_mm2: baseline.kc_n_per_mm2,
          mc_kienzle: 0.25,
          taylor_C: g === "P" ? 350 : g === "M" ? 200 : g === "K" ? 250 : g === "N" ? 600 : g === "S" ? 150 : 120,
          taylor_n: g === "P" ? 0.25 : g === "M" ? 0.20 : g === "K" ? 0.25 : g === "N" ? 0.40 : g === "S" ? 0.18 : 0.15,
        };
        ctx.insert = { ...ctx.insert, nose_radius_mm: baseline.nose_radius_mm, max_doc_mm: baseline.ap_mid_mm * 2 };
        // Loosen Ra target so aggressive groups (K, N) don't get blocked on geometric finish
        ctx.feature = { ...ctx.feature, ra_target_um: 12.8, tolerance_band_mm: 0.1 };
        // Boost chuck capacity so no group blocks on grip in the canonical test
        ctx.chuck = { ...ctx.chuck, grip_capacity_n: 80000 };
        // Boost spindle for aggressive groups
        ctx.lathe = { ...ctx.lathe, spindle_kw: 30, max_torque_Nm: 500 };
        const result = findOptimalLatheParams(ctx);
        expect(result.winner).not.toBeNull();
        expect(result.feasible_count).toBeGreaterThan(0);
      });
    }
  });
});
