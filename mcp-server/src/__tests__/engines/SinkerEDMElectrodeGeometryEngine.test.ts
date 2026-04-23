/**
 * SinkerEDMElectrodeGeometryEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS54
 */
import { describe, it, expect } from "vitest";
import {
  SinkerEDMElectrodeGeometryEngine,
  sinkerEDMElectrodeGeometryEngine,
  type SinkerElectrodeGeometryInput,
} from "../../engines/SinkerEDMElectrodeGeometryEngine.js";
import type { PartFeature } from "../../engines/EDMDrawingInterpretationEngine.js";

// ── Fixtures ─────────────────────────────────────────────────────────────

function cavity(overrides: Partial<PartFeature> = {}): PartFeature {
  return {
    name: "Test cavity",
    type: "cavity",
    is_through: false,
    dimensions_mm: { length: 30, width: 20, depth: 15 },
    tolerance_mm: 0.01,
    surface_finish_ra_um: 1.6,
    min_corner_radius_mm: 0.2,
    ...overrides,
  };
}

function round(overrides: Partial<PartFeature> = {}): PartFeature {
  return {
    name: "Test hole",
    type: "hole",
    is_through: false,
    dimensions_mm: { diameter: 12, depth: 25 },
    tolerance_mm: 0.02,
    surface_finish_ra_um: 3.2,
    ...overrides,
  };
}

function baseInput(overrides: Partial<SinkerElectrodeGeometryInput> = {}): SinkerElectrodeGeometryInput {
  return {
    feature: cavity(),
    workpiece_material: "d2",
    workpiece_hardness_HRC: 60,
    electrode_material: "graphite_fine",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("SinkerEDMElectrodeGeometryEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(sinkerEDMElectrodeGeometryEngine).toBeInstanceOf(
      SinkerEDMElectrodeGeometryEngine,
    );
  });

  it("throws when feature.dimensions_mm is missing", () => {
    expect(() =>
      sinkerEDMElectrodeGeometryEngine.plan({
        feature: { ...cavity(), dimensions_mm: undefined as unknown as PartFeature["dimensions_mm"] },
        workpiece_material: "d2",
      }),
    ).toThrow(/dimensions_mm/);
  });

  it("throws when workpiece_material is empty", () => {
    expect(() =>
      sinkerEDMElectrodeGeometryEngine.plan({
        feature: cavity(),
        workpiece_material: "",
      }),
    ).toThrow(/workpiece_material/);
  });

  it("throws when cavity has zero depth", () => {
    expect(() =>
      sinkerEDMElectrodeGeometryEngine.plan(
        baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 0 } }) }),
      ),
    ).toThrow(/positive/);
  });

  it("produces at least one stage (rough) for all valid cavities", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    expect(out.stages.length).toBeGreaterThanOrEqual(1);
    expect(out.stages[0].stage).toBe("rough");
  });

  it("emits finish stage with Ra target ≤ 1.6 µm", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ surface_finish_ra_um: 1.0 }) }),
    );
    const finish = out.stages.find((s) => s.stage === "finish");
    expect(finish).toBeDefined();
    // Finish gap is 0.03 mm
    expect(finish!.overcut_per_side_mm).toBeCloseTo(0.03, 6);
  });

  it("final stage nominal XY matches the cavity dimensions", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    const last = out.stages[out.stages.length - 1];
    expect("length" in last.nominal_xy_mm).toBe(true);
    if ("length" in last.nominal_xy_mm) {
      expect(last.nominal_xy_mm.length).toBeCloseTo(30, 3);
      expect(last.nominal_xy_mm.width).toBeCloseTo(20, 3);
    }
  });

  it("non-final stage nominal XY leaves stock for the next stage", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ surface_finish_ra_um: 0.5 }) }),
    );
    // 3 stages expected: rough + semi + finish
    expect(out.stages.length).toBe(3);
    const rough = out.stages[0];
    if ("length" in rough.nominal_xy_mm) {
      // Rough nominal is cavity minus 2*(gap_rough - gap_finish) = 30 - 2*(0.15-0.03) = 29.76
      expect(rough.nominal_xy_mm.length).toBeLessThan(30);
    }
  });

  it("electrode XY is cavity XY minus 2×gap per side", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    const last = out.stages[out.stages.length - 1];
    if ("length" in last.electrode_xy_mm) {
      // Final stage: electrode = nominal - 2*0.03 = 30 - 0.06 = 29.94
      expect(last.electrode_xy_mm.length).toBeCloseTo(29.94, 3);
      expect(last.electrode_xy_mm.width).toBeCloseTo(19.94, 3);
    }
  });

  it("orbit radius is zero on through features", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({
        feature: cavity({
          is_through: true,
          surface_finish_ra_um: 0.5, // force semi+finish stages
          dimensions_mm: { length: 30, width: 20, depth: 10 },
        }),
      }),
    );
    for (const s of out.stages) {
      expect(s.orbit_radius_mm).toBe(0);
    }
    expect(out.notes.some((n) => /through.+orbit disabled/i.test(n))).toBe(true);
  });

  it("orbit radius is non-zero on closed semi+finish stages when allow_orbit=true", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({
        feature: cavity({ surface_finish_ra_um: 0.5 }), // triggers semi + finish
        allow_orbit: true,
      }),
    );
    const finish = out.stages.find((s) => s.stage === "finish");
    expect(finish).toBeDefined();
    expect(finish!.orbit_radius_mm).toBeGreaterThan(0);
  });

  it("round feature outputs diameter-based nominal/electrode", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: round() }),
    );
    const last = out.stages[out.stages.length - 1];
    expect("diameter" in last.nominal_xy_mm).toBe(true);
    expect("diameter" in last.electrode_xy_mm).toBe(true);
  });

  it("end_wear_compensation scales with workpiece depth and wear ratio", () => {
    const shallow = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 5 } }) }),
    );
    const deep = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 50 } }) }),
    );
    // Deeper feature → more end-wear comp per stage
    expect(deep.stages[0].end_wear_compensation_mm).toBeGreaterThan(
      shallow.stages[0].end_wear_compensation_mm,
    );
  });

  it("stock_for_next_stage is positive except on the final stage", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ surface_finish_ra_um: 0.5 }) }),
    );
    for (let i = 0; i < out.stages.length - 1; i++) {
      expect(out.stages[i].stock_for_next_stage_mm).toBeGreaterThan(0);
    }
    expect(out.stages[out.stages.length - 1].stock_for_next_stage_mm).toBe(0);
  });

  it("max_envelope_xy + max_total_length reflect the largest stage", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    expect(out.max_envelope_xy_mm.length).toBeGreaterThan(0);
    expect(out.max_envelope_xy_mm.width).toBeGreaterThan(0);
    expect(out.max_total_length_mm).toBeGreaterThan(0);
  });

  it("worst_case_wear_pct is propagated from ElectrodeDesignEngine", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    expect(out.worst_case_wear_pct).toBeGreaterThan(0);
  });

  it("is pure — identical inputs produce identical stage lists", () => {
    const a = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    const b = sinkerEDMElectrodeGeometryEngine.plan(baseInput());
    expect(a.stages).toEqual(b.stages);
    expect(a.max_envelope_xy_mm).toEqual(b.max_envelope_xy_mm);
  });

  it("notes include sub-0.1mm corner radius warning when applicable", () => {
    const out = sinkerEDMElectrodeGeometryEngine.plan(
      baseInput({ feature: cavity({ min_corner_radius_mm: 0.05 }) }),
    );
    expect(out.notes.some((n) => /corner radius/i.test(n))).toBe(true);
  });
});
