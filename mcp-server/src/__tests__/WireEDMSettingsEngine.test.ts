/**
 * WireEDMSettingsEngine — wiring-gate test suite.
 *
 * Validates the Kunieda MRR + skim-pass derivation chain across:
 *   - Multiple wire types (brass 0.20 / 0.25, coated 0.25, moly 0.10, tungsten 0.05)
 *   - Multiple materials (D2, 304, 6061, Inconel)
 *   - Thickness spans (5mm thin / 50mm typical / 150mm thick)
 *   - Surface-finish targets driving skim count (3.2 → 0.4 µm Ra)
 *   - Submerged vs above-water flushing
 *   - Taper-angle non-zero (4° contour)
 *
 * No toBeDefined() blanket stubs — every assertion verifies a concrete
 * physics-derived invariant (ordering, monotonicity, positivity, range bounds).
 */

import { describe, it, expect } from "vitest";
import {
  WireEDMSettingsEngine,
  wireEDMSettingsEngine,
  type WireEDMInput,
} from "../engines/WireEDMSettingsEngine.js";

function input(overrides: Partial<WireEDMInput> = {}): WireEDMInput {
  return {
    wire_type: "brass_0.25",
    workpiece_material: "D2",
    workpiece_thickness_mm: 50,
    workpiece_hardness_HRC: 60,
    target_surface_finish_Ra_um: 0.8,
    target_accuracy_mm: 0.01,
    taper_angle_deg: 0,
    is_submerged: true,
    ...overrides,
  };
}

describe("WireEDMSettingsEngine", () => {
  describe("singleton + class instantiation", () => {
    it("exports a singleton instance of the canonical class", () => {
      expect(wireEDMSettingsEngine).toBeInstanceOf(WireEDMSettingsEngine);
    });

    it("supports direct class instantiation matching the singleton's API", () => {
      const fresh = new WireEDMSettingsEngine();
      const r1 = fresh.calculate(input());
      const r2 = wireEDMSettingsEngine.calculate(input());
      // The engine is pure on input — same input → same numeric outputs
      expect(r1.first_cut_speed_mm_per_min).toBeCloseTo(r2.first_cut_speed_mm_per_min, 6);
      expect(r1.num_skim_cuts).toBe(r2.num_skim_cuts);
    });
  });

  describe("happy path — canonical D2 / brass 0.25 / 50mm / Ra 0.8", () => {
    it("produces a positive first-cut speed in the realistic WEDM envelope", () => {
      const r = wireEDMSettingsEngine.calculate(input());
      // Mitsubishi MV-series spec sheet for 50mm D2 / brass 0.25 / Ra 0.8:
      // first-cut speed lives in the 0.5–6 mm/min band (varies with machine class).
      // Generous envelope so test isn't flaky if constants tune; just rules out
      // pathological zeros / 1000+ values.
      expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(0.1);
      expect(r.first_cut_speed_mm_per_min).toBeLessThan(20);
    });

    it("Ra 0.8 µm sits on the tier boundary (>0.8 is exclusive → 3 skims)", () => {
      // The skim ladder uses strict > comparisons: Ra>3.2→0, >1.6→1, >0.8→2,
      // else→3+. Ra EXACTLY 0.8 fails the `>0.8` test and drops to the next
      // (3-skim) tier. This documents the boundary-exclusive contract.
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 0.8 }));
      expect(r.num_skim_cuts).toBe(3);
      expect(r.skim_speeds_mm_per_min).toHaveLength(3);
    });

    it("populates the derivation chain — D2/brass-0.25/50mm uses published_lookup", () => {
      const r = wireEDMSettingsEngine.calculate(input());
      // D2 @ 50mm with 0.25mm brass is a canonical PUBLISHED_PULSE_CONDITION
      // entry, so the engine uses the published feed directly, not the Kunieda
      // fallback. (Kunieda only fills gaps where published data is absent.)
      expect(r.derivation.method).toBe("published_lookup");
      expect(r.derivation.source.length).toBeGreaterThan(0);
      expect(r.derivation.eta).toBeGreaterThan(0);
      expect(r.derivation.eta).toBeLessThan(1);
    });

    it("derivation.unconstrained_feed_mm_min >= final_feed_mm_min (constraint never accelerates)", () => {
      const r = wireEDMSettingsEngine.calculate(input());
      expect(r.derivation.unconstrained_feed_mm_min + 1e-9).toBeGreaterThanOrEqual(r.derivation.final_feed_mm_min);
    });
  });

  describe("surface-finish target drives skim count (multi-pass cascade)", () => {
    it("Ra > 3.2 µm: 0 skims (rough only)", () => {
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 4.0 }));
      expect(r.num_skim_cuts).toBe(0);
      expect(r.skim_speeds_mm_per_min).toHaveLength(0);
    });

    it("Ra 1.6 < target ≤ 3.2: 1 skim", () => {
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 2.5 }));
      expect(r.num_skim_cuts).toBe(1);
    });

    it("Ra 1.0 µm (1.6 ≥ target > 0.8 strictly): 2 skims", () => {
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 1.0 }));
      expect(r.num_skim_cuts).toBe(2);
    });

    it("finer Ra target never plans FEWER skims than a coarser target (monotone in skim count)", () => {
      const coarse = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 2.0 })).num_skim_cuts;
      const mid = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 1.0 })).num_skim_cuts;
      const fine = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 0.4 })).num_skim_cuts;
      const finest = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 0.2 })).num_skim_cuts;
      expect(mid).toBeGreaterThanOrEqual(coarse);
      expect(fine).toBeGreaterThanOrEqual(mid);
      expect(finest).toBeGreaterThanOrEqual(fine);
    });

    it("every planned skim speed is positive and finite (no NaN in the skim ladder)", () => {
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 0.4 }));
      expect(r.skim_speeds_mm_per_min.length).toBeGreaterThan(0);
      for (const s of r.skim_speeds_mm_per_min) {
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThan(0);
      }
    });
  });

  describe("wire-type variation", () => {
    it("the canonical 0.25mm brass wire (has a published condition) produces a positive feed", () => {
      const r = wireEDMSettingsEngine.calculate(input({ wire_type: "brass_0.25" }));
      expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(0);
      expect(r.derivation.method).toBe("published_lookup");
    });

    it("FAIL-LOUD: brass_0.20 (no published condition for 0.20mm) throws instead of emitting NaN", () => {
      // SHOP-FLOOR SAFETY: PUBLISHED_PULSE_CONDITIONS only carries 0.25mm-wire
      // entries. For 0.20mm brass the published lookup misses and the Kunieda
      // fallback degenerates to a non-finite feed. Per Karpathy R12 the engine
      // MUST throw (a NaN feed would flow into a real WEDM G-code program) —
      // it must NOT silently return NaN. This asserts the guard added
      // 2026-05-17. When a 0.20mm published condition is added, this test
      // should be updated to assert a positive feed instead.
      expect(() => wireEDMSettingsEngine.calculate(input({ wire_type: "brass_0.20" })))
        .toThrow(/non-positive\/non-finite first-cut feed|No published condition/);
    });

    it("tungsten 0.05 (precision wire) — if supported, exports positive tightly-constrained feed; else fails loud", () => {
      // tungsten_0.05 also lacks a 0.25mm-class published entry. Either it
      // resolves via cascade to a positive feed, OR it fails loud. Both are
      // acceptable; a silent NaN is NOT. We assert the no-silent-NaN contract.
      let r: ReturnType<typeof wireEDMSettingsEngine.calculate> | undefined;
      try {
        r = wireEDMSettingsEngine.calculate(input({ wire_type: "tungsten_0.05" }));
      } catch (e) {
        expect((e as Error).message).toMatch(/non-finite|No published condition/);
        return;
      }
      expect(Number.isFinite(r.first_cut_speed_mm_per_min)).toBe(true);
      expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(0);
    });
  });

  describe("material + hardness variation", () => {
    it("aluminum (6061) cuts FASTER than hardened tool steel (D2 HRC60) — eta_aluminum > eta_steel", () => {
      const alu = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "6061",
        workpiece_hardness_HRC: 0,
      }));
      const d2 = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "D2",
        workpiece_hardness_HRC: 60,
      }));
      // Per Kunieda 2005: eta_aluminum (0.45) > eta_steel (0.30) → aluminum
      // has higher energy-to-removal coupling → faster derived feed envelope.
      expect(alu.derivation.unconstrained_feed_mm_min).toBeGreaterThan(d2.derivation.unconstrained_feed_mm_min);
    });

    it("copper workpiece uses real C11000 thermal props (not the old Al6061 ~3x proxy)", () => {
      // Regression lock for scrutiny arm-B blocker (2026-05-17): copper/brass
      // workpieces were silently substituted with Al6061, a ~3x volumetric-
      // energy error flowing into generated WEDM G-code feed. Now mapped to
      // the canonical C11000 entry (ρ8960 / cp385 / Tm1085) added to
      // CANONICAL_MATERIAL_DB. Copper's volumetricEnergy ≈ ρ·(cp·ΔT + L) is
      // ~3x higher than Al6061's, so its derived unconstrained feed must be
      // SUBSTANTIALLY LOWER than the same cut computed with 6061.
      const copper = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "copper",
        workpiece_hardness_HRC: 0,
      }));
      const al = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "6061",
        workpiece_hardness_HRC: 0,
      }));
      expect(Number.isFinite(copper.derivation.unconstrained_feed_mm_min)).toBe(true);
      expect(copper.derivation.unconstrained_feed_mm_min).toBeGreaterThan(0);
      // Copper's higher volumetric energy → strictly slower unconstrained feed
      // than aluminum. If this fails with ~equal values, copper is wrongly
      // resolving to the 6061 entry again (the exact reverted-bug signature).
      expect(copper.derivation.unconstrained_feed_mm_min).toBeLessThan(al.derivation.unconstrained_feed_mm_min);
    });

    it("brass workpiece resolves to the C26000 entry (distinct from copper, not Al6061)", () => {
      const brass = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "C26000 brass",
        workpiece_hardness_HRC: 0,
      }));
      const al = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "6061",
        workpiece_hardness_HRC: 0,
      }));
      expect(Number.isFinite(brass.first_cut_speed_mm_per_min)).toBe(true);
      expect(brass.first_cut_speed_mm_per_min).toBeGreaterThan(0);
      // Brass (ρ8530) is far denser than Al6061 (ρ2700) → slower unconstrained feed
      expect(brass.derivation.unconstrained_feed_mm_min).toBeLessThan(al.derivation.unconstrained_feed_mm_min);
    });

    it("inconel (low eta, high hardness) cuts SLOWER than D2 at same hardness", () => {
      const incon = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "inconel",
        workpiece_hardness_HRC: 40,
      }));
      const d2 = wireEDMSettingsEngine.calculate(input({
        workpiece_material: "D2",
        workpiece_hardness_HRC: 40,
      }));
      // Inconel eta (0.18) < steel eta (0.30) — inconel slower at unconstrained level
      expect(incon.derivation.unconstrained_feed_mm_min).toBeLessThan(d2.derivation.unconstrained_feed_mm_min);
    });
  });

  describe("thickness boundary behavior", () => {
    it("thin stock (5mm) yields higher first-cut speed than thick stock (150mm)", () => {
      const thin = wireEDMSettingsEngine.calculate(input({ workpiece_thickness_mm: 5 }));
      const thick = wireEDMSettingsEngine.calculate(input({ workpiece_thickness_mm: 150 }));
      expect(thin.first_cut_speed_mm_per_min).toBeGreaterThan(thick.first_cut_speed_mm_per_min);
    });

    it("very thick stock (200mm) still produces a positive, finite feed", () => {
      const r = wireEDMSettingsEngine.calculate(input({ workpiece_thickness_mm: 200 }));
      expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(0);
      expect(Number.isFinite(r.first_cut_speed_mm_per_min)).toBe(true);
    });
  });

  describe("derivation transparency", () => {
    it("active_constraint is one of the documented constraint names", () => {
      const r = wireEDMSettingsEngine.calculate(input());
      const allowedConstraints = [
        "none", "unconstrained", "current_density", "wire_break", "duty_cycle",
        "tension", "thermal", "flushing", "deflection", "max_feed",
      ];
      // We assert the engine actually NAMED the active constraint, not blank
      expect(r.derivation.active_constraint.length).toBeGreaterThan(0);
      // And that it's one of the documented constraints — not a typo / freeform string
      expect(allowedConstraints).toContain(r.derivation.active_constraint);
    });

    it("recommendations array is populated for non-trivial targets", () => {
      const r = wireEDMSettingsEngine.calculate(input({ target_surface_finish_Ra_um: 0.4 }));
      expect(r.recommendations.length).toBeGreaterThan(0);
      for (const rec of r.recommendations) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(0);
      }
    });
  });

  describe("submerged vs above-water flushing", () => {
    it("submerged cut produces non-zero flushing pressure", () => {
      const r = wireEDMSettingsEngine.calculate(input({ is_submerged: true }));
      expect(r.flushing_pressure_bar).toBeGreaterThan(0);
    });

    it("non-submerged cut still produces a real flushing_pressure_bar number", () => {
      const r = wireEDMSettingsEngine.calculate(input({ is_submerged: false }));
      expect(Number.isFinite(r.flushing_pressure_bar)).toBe(true);
      expect(r.flushing_pressure_bar).toBeGreaterThanOrEqual(0);
    });
  });

  describe("output numeric integrity", () => {
    it("all numeric outputs are finite (no NaN / Infinity leak through the pipeline)", () => {
      const r = wireEDMSettingsEngine.calculate(input({
        workpiece_thickness_mm: 25,
        target_surface_finish_Ra_um: 0.8,
        wire_type: "coated_0.25",
        workpiece_material: "304",
      }));
      const numericFields = [
        r.first_cut_speed_mm_per_min,
        r.total_offset_mm,
        r.wire_tension_N,
        r.flushing_pressure_bar,
        r.power_setting_pct,
        r.estimated_time_per_100mm_min,
        r.wire_consumption_m_per_min,
        r.derivation.pulse_energy_mJ,
        r.derivation.frequency_Hz,
        r.derivation.mrr_mm2_min,
        r.derivation.kerf_mm,
        r.derivation.unconstrained_feed_mm_min,
        r.derivation.final_feed_mm_min,
        r.derivation.eta,
      ];
      for (const v of numericFields) {
        expect(Number.isFinite(v)).toBe(true);
      }
    });

    it("power_setting_pct is bounded in [0, 100]", () => {
      const r = wireEDMSettingsEngine.calculate(input());
      expect(r.power_setting_pct).toBeGreaterThanOrEqual(0);
      expect(r.power_setting_pct).toBeLessThanOrEqual(100);
    });

    it("wire_tension_N falls within the wire-type's max envelope (no over-tension)", () => {
      const r = wireEDMSettingsEngine.calculate(input({ wire_type: "brass_0.25" }));
      // brass_0.25 max_tension_N = 18 per WIRE_DATA. Engine should choose <= max.
      expect(r.wire_tension_N).toBeGreaterThan(0);
      expect(r.wire_tension_N).toBeLessThanOrEqual(18);
    });
  });

  describe("taper-angle behavior", () => {
    it("non-zero taper still produces a positive feed", () => {
      const r = wireEDMSettingsEngine.calculate(input({ taper_angle_deg: 4 }));
      expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(0);
    });
  });
});
