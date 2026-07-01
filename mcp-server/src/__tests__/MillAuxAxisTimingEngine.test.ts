import { describe, it, expect } from "vitest";
import {
  millAuxAxisTimingEngine as eng,
  DEFAULT_RAPID_RATE_MM_MIN,
  DEFAULT_SPINDLE_ACCEL_RPM_S,
  type MillAuxAxisTimingInput,
  type MillAuxAxisOpInput,
} from "../engines/MillAuxAxisTimingEngine.js";

function op(o: Partial<MillAuxAxisOpInput> & { op: string; cut_time_s: number }): MillAuxAxisOpInput {
  return { ...o };
}

function nominal(ops: MillAuxAxisOpInput[] = []): MillAuxAxisTimingInput {
  return {
    operations: ops.length > 0 ? ops : [
      op({ op: "face_top", cut_time_s: 30, rapid_distance_mm: 200, spindle_rpm: 8000, coolant_on: true }),
      op({ op: "drill_holes", cut_time_s: 45, spindle_rpm: 5000, atc_swap: true }),
      op({ op: "finish_periphery", cut_time_s: 60, spindle_rpm: 10000, atc_swap: true, sharp_corner_count: 4 }),
    ],
  };
}

describe("MillAuxAxisTimingEngine", () => {
  it("getStats: 14 components, 7 mill-canonical aux axes, Mazak/DMG/Makino refs", () => {
    const s = eng.getStats();
    expect(s.components).toBe(14);
    expect(s.mill_canonical_aux_axes.length).toBe(7);
    expect(s.mill_canonical_aux_axes).toContain("atc_swap");
    expect(s.mill_canonical_aux_axes).toContain("rotary_a_index");
    expect(s.mill_canonical_aux_axes).toContain("pallet_change");
    expect(s.reference).toMatch(/Mazak|DMG|Makino|Renishaw|Heidenhain/);
  });

  it("throws on invalid input (null + missing operations[] + negative cut_time)", () => {
    expect(() => eng.analyze(null as never)).toThrow(/input required/);
    expect(() => eng.analyze({ operations: undefined as never })).toThrow(/operations\[\] required/);
    expect(() => eng.analyze({ operations: [op({ op: "bad", cut_time_s: -1 })] })).toThrow(/cut_time_s must be >= 0/);
  });

  it("nominal 3-op input produces 14 components with correct cut_time sum", () => {
    const r = eng.analyze(nominal());
    expect(r.components.length).toBe(14);
    const cutComp = r.components.find(c => c.name === "cut_time")!;
    expect(cutComp.time_s).toBe(135); // 30 + 45 + 60
  });

  it("percentages sum to ~100 across all components", () => {
    const r = eng.analyze(nominal());
    const sum = r.components.reduce((s, c) => s + c.pct, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("rapid_traverse: 200mm at default 30000mm/min = 0.4s", () => {
    const r = eng.analyze({
      operations: [op({ op: "rapid", cut_time_s: 0, rapid_distance_mm: 200 })],
    });
    const rapid = r.components.find(c => c.name === "rapid_traverse")!;
    // 200/30000 × 60 = 0.4s
    expect(rapid.time_s).toBeCloseTo(0.4, 2);
  });

  it("spindle_accel: 0→8000 rpm at 3750 rpm/s = 2.13s", () => {
    const r = eng.analyze({
      operations: [op({ op: "ramp", cut_time_s: 0, spindle_rpm: 8000 })],
    });
    const acc = r.components.find(c => c.name === "spindle_accel")!;
    expect(acc.time_s).toBeCloseTo(8000 / DEFAULT_SPINDLE_ACCEL_RPM_S, 1);
  });

  it("spindle_decel: final rpm > 0 → triggers decel time", () => {
    const r = eng.analyze({
      operations: [op({ op: "ramp", cut_time_s: 0, spindle_rpm: 5000 })],
    });
    const dec = r.components.find(c => c.name === "spindle_decel")!;
    expect(dec.time_s).toBeCloseTo(5000 / DEFAULT_SPINDLE_ACCEL_RPM_S, 1);
  });

  it("ATC swap kind: chain (3.0s) > drum (2.5s) > swing_arm (1.8s) > umbrella (1.5s)", () => {
    const ops = [op({ op: "tc1", cut_time_s: 0, atc_swap: true })];
    const r_umbrella = eng.analyze({ operations: ops, atc_kind: "umbrella" });
    const r_swing = eng.analyze({ operations: ops, atc_kind: "swing_arm" });
    const r_drum = eng.analyze({ operations: ops, atc_kind: "drum" });
    const r_chain = eng.analyze({ operations: ops, atc_kind: "chain" });
    const t = (r: typeof r_umbrella) => r.components.find(c => c.name === "atc_swap")!.time_s;
    expect(t(r_umbrella)).toBeLessThan(t(r_swing));
    expect(t(r_swing)).toBeLessThan(t(r_drum));
    expect(t(r_drum)).toBeLessThan(t(r_chain));
  });

  it("rotary A: |0° → 90°| at 90 deg/s = 1s travel + 0.4s base = 1.4s", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "first", cut_time_s: 0, a_axis_deg: 0 }),
        op({ op: "second", cut_time_s: 0, a_axis_deg: 90 }),
      ],
    });
    const rotA = r.components.find(c => c.name === "rotary_a_index")!;
    expect(rotA.time_s).toBeCloseTo(1.4, 1); // 0.4 base + 90/90 = 1.4
  });

  it("rotary A: no movement (same angle) → 0 index time", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "first", cut_time_s: 0, a_axis_deg: 45 }),
        op({ op: "second", cut_time_s: 0, a_axis_deg: 45 }),
      ],
    });
    const rotA = r.components.find(c => c.name === "rotary_a_index")!;
    expect(rotA.time_s).toBe(0);
  });

  it("tilt B: |0° → 30°| at 60 deg/s = 0.5 + 0.5 = 1.0s", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "first", cut_time_s: 0, b_axis_deg: 0 }),
        op({ op: "second", cut_time_s: 0, b_axis_deg: 30 }),
      ],
    });
    const tiltB = r.components.find(c => c.name === "tilt_b_index")!;
    expect(tiltB.time_s).toBeCloseTo(1.0, 1); // 0.5 + 30/60 = 1.0
  });

  it("head C index only fires when target differs from prev", () => {
    const r_same = eng.analyze({
      operations: [
        op({ op: "first", cut_time_s: 0, c_head_index_deg: 0 }),
        op({ op: "second", cut_time_s: 0, c_head_index_deg: 0 }),
      ],
    });
    const r_diff = eng.analyze({
      operations: [
        op({ op: "first", cut_time_s: 0, c_head_index_deg: 0 }),
        op({ op: "second", cut_time_s: 0, c_head_index_deg: 90 }),
      ],
    });
    expect(r_same.components.find(c => c.name === "head_c_index")!.time_s).toBe(0);
    expect(r_diff.components.find(c => c.name === "head_c_index")!.time_s).toBe(2); // default 2s
  });

  it("pallet change fires per op with pallet_shuttle_stations >= 1", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "pal1", cut_time_s: 0, pallet_shuttle_stations: 1 }),
        op({ op: "pal2", cut_time_s: 0, pallet_shuttle_stations: 2 }),
      ],
    });
    const pallet = r.components.find(c => c.name === "pallet_change")!;
    expect(pallet.time_s).toBe(60); // 2 × 30s
  });

  it("probe cycle: 3 touches × default 4.5s = 13.5s", () => {
    const r = eng.analyze({
      operations: [op({ op: "probe", cut_time_s: 0, probe_touch_count: 3 })],
    });
    const probe = r.components.find(c => c.name === "probe_cycle")!;
    expect(probe.time_s).toBeCloseTo(13.5, 1);
  });

  it("vise actuate adds 2s per actuating op", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "load", cut_time_s: 0, vise_actuate: true }),
        op({ op: "cut", cut_time_s: 30 }),
        op({ op: "unload", cut_time_s: 0, vise_actuate: true }),
      ],
    });
    expect(r.components.find(c => c.name === "vise_actuate")!.time_s).toBe(4); // 2 × 2s
  });

  it("dwell G4 sums across ops", () => {
    const r = eng.analyze({
      operations: [
        op({ op: "dwell1", cut_time_s: 0, dwell_g4_s: 0.5 }),
        op({ op: "dwell2", cut_time_s: 0, dwell_g4_s: 1.5 }),
      ],
    });
    expect(r.components.find(c => c.name === "dwell_g4")!.time_s).toBe(2);
  });

  it("lookahead: 10 corners × default 0.05s = 0.5s", () => {
    const r = eng.analyze({
      operations: [op({ op: "corners", cut_time_s: 0, sharp_corner_count: 10 })],
    });
    expect(r.components.find(c => c.name === "lookahead")!.time_s).toBeCloseTo(0.5, 2);
  });

  it("reasoning highlights dominant component", () => {
    const r = eng.analyze({
      operations: [op({ op: "long_cut", cut_time_s: 1000, atc_swap: true })],
    });
    expect(r.reasoning.some(s => /Dominant: cut_time/.test(s))).toBe(true);
  });

  it("reasoning narrates ATC kind", () => {
    const r = eng.analyze({
      operations: [op({ op: "tc", cut_time_s: 1, atc_swap: true })],
      atc_kind: "chain",
    });
    expect(r.reasoning.some(s => /ATC kind: chain/.test(s))).toBe(true);
  });

  it("variability ≥3: 3-axis VMC (no rotary), 4-axis (rotary only), full 5-axis (rotary+tilt+head)", () => {
    const r_3 = eng.analyze({
      operations: [op({ op: "face", cut_time_s: 60, spindle_rpm: 8000 })],
    });
    const r_4 = eng.analyze({
      operations: [
        op({ op: "face_a0", cut_time_s: 30, a_axis_deg: 0 }),
        op({ op: "face_a90", cut_time_s: 30, a_axis_deg: 90 }),
      ],
    });
    const r_5 = eng.analyze({
      operations: [
        op({ op: "start", cut_time_s: 30, a_axis_deg: 0, b_axis_deg: 0, c_head_index_deg: 0 }),
        op({ op: "tilt", cut_time_s: 30, a_axis_deg: 45, b_axis_deg: 30, c_head_index_deg: 90 }),
      ],
    });
    // 3-axis: zero rotary + tilt + head
    expect(r_3.components.find(c => c.name === "rotary_a_index")!.time_s).toBe(0);
    expect(r_3.components.find(c => c.name === "tilt_b_index")!.time_s).toBe(0);
    // 4-axis: rotary only
    expect(r_4.components.find(c => c.name === "rotary_a_index")!.time_s).toBeGreaterThan(0);
    expect(r_4.components.find(c => c.name === "tilt_b_index")!.time_s).toBe(0);
    // 5-axis: rotary + tilt + head all > 0
    expect(r_5.components.find(c => c.name === "rotary_a_index")!.time_s).toBeGreaterThan(0);
    expect(r_5.components.find(c => c.name === "tilt_b_index")!.time_s).toBeGreaterThan(0);
    expect(r_5.components.find(c => c.name === "head_c_index")!.time_s).toBeGreaterThan(0);
  });

  it("custom rapid rate flows into rapid_traverse", () => {
    const r1 = eng.analyze({
      operations: [op({ op: "r", cut_time_s: 0, rapid_distance_mm: 600 })],
      rapid_rate_mm_min: 60_000,
    });
    const r2 = eng.analyze({
      operations: [op({ op: "r", cut_time_s: 0, rapid_distance_mm: 600 })],
      rapid_rate_mm_min: 30_000,
    });
    // r1 should be exactly half of r2 (twice as fast)
    expect(r1.components.find(c => c.name === "rapid_traverse")!.time_s).toBeCloseTo(
      r2.components.find(c => c.name === "rapid_traverse")!.time_s / 2,
      2,
    );
  });

  it("total_time_s matches sum of components and total_time_min = total/60", () => {
    const r = eng.analyze(nominal());
    const componentSum = r.components.reduce((s, c) => s + c.time_s, 0);
    expect(r.total_time_s).toBeCloseTo(componentSum, 1);
    expect(r.total_time_min).toBeCloseTo(r.total_time_s / 60, 2);
  });

  it("determinism: same input twice → identical results", () => {
    const i = nominal();
    expect(eng.analyze(i)).toEqual(eng.analyze(i));
  });

  it("empty operations → all components 0, no division errors", () => {
    const r = eng.analyze({ operations: [] });
    expect(r.total_time_s).toBe(0);
    expect(r.components.every(c => c.time_s === 0 && c.pct === 0)).toBe(true);
  });

  it("adversarial: huge spindle ramp (0→50000 rpm) computes finite accel", () => {
    const r = eng.analyze({
      operations: [op({ op: "huge_ramp", cut_time_s: 0, spindle_rpm: 50_000 })],
    });
    const acc = r.components.find(c => c.name === "spindle_accel")!;
    expect(Number.isFinite(acc.time_s)).toBe(true);
    expect(acc.time_s).toBeGreaterThan(0);
  });

  it("default rapid rate matches DEFAULT_RAPID_RATE_MM_MIN", () => {
    expect(DEFAULT_RAPID_RATE_MM_MIN).toBe(30_000);
  });
});
