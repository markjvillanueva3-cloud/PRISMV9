import { describe, it, expect } from "vitest";
import { latheAuxAxisTimingEngine } from "../engines/LatheAuxAxisTimingEngine.js";

describe("LatheAuxAxisTimingEngine", () => {
  it("produces 12 components", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [{ op: "rough", cut_time_s: 30 }],
    });
    expect(r.components.length).toBe(12);
  });

  it("cut_time is sum across ops", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [
        { op: "rough", cut_time_s: 30 },
        { op: "finish", cut_time_s: 45 },
      ],
    });
    const cut = r.components.find((c) => c.name === "cut_time")!;
    expect(cut.time_s).toBe(75);
  });

  it("rapid_traverse = distance / rapid_rate × 60", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      rapid_rate_mm_min: 30000,
      operations: [{ op: "rough", cut_time_s: 10, rapid_distance_mm: 500 }],
    });
    // 500/30000 × 60 = 1 s
    const rapid = r.components.find((c) => c.name === "rapid_traverse")!;
    expect(rapid.time_s).toBe(1);
  });

  it("spindle accel reflects rpm change and accel rate", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      spindle_accel_rpm_s: 100,
      operations: [
        { op: "a", cut_time_s: 10, spindle_rpm: 2000 },
        { op: "b", cut_time_s: 10, spindle_rpm: 3000 },
      ],
    });
    // 2000/100 + 1000/100 = 30s
    const acc = r.components.find((c) => c.name === "spindle_accel")!;
    expect(acc.time_s).toBe(30);
  });

  it("spindle decel at end back to 0", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      spindle_accel_rpm_s: 100,
      operations: [{ op: "a", cut_time_s: 10, spindle_rpm: 2000 }],
    });
    // Final rpm 2000 → decel = 2000/100 = 20s
    const dec = r.components.find((c) => c.name === "spindle_decel")!;
    expect(dec.time_s).toBe(20);
  });

  it("turret index uses BMT defaults when unspecified", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [
        { op: "a", cut_time_s: 1, turret_delta_positions: 1 },
        { op: "b", cut_time_s: 1, turret_delta_positions: 3 },
      ],
    });
    // BMT defaults: base 0.2, step 0.08 → (0.2 + 1*0.08) + (0.2 + 3*0.08) = 0.28 + 0.44 = 0.72
    const turret = r.components.find((c) => c.name === "turret_index")!;
    expect(turret.time_s).toBeCloseTo(0.72, 2);
  });

  it("VDI turret is slower than BMT", () => {
    const bmt = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [{ op: "a", cut_time_s: 1, turret_delta_positions: 4 }],
    });
    const vdi = latheAuxAxisTimingEngine.analyze({
      turret: "VDI",
      operations: [{ op: "a", cut_time_s: 1, turret_delta_positions: 4 }],
    });
    const tBmt = bmt.components.find((c) => c.name === "turret_index")!.time_s;
    const tVdi = vdi.components.find((c) => c.name === "turret_index")!.time_s;
    expect(tVdi).toBeGreaterThan(tBmt);
  });

  it("gang_tool has zero turret index time", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "gang_tool",
      operations: [{ op: "a", cut_time_s: 1, turret_delta_positions: 4 }],
    });
    const turret = r.components.find((c) => c.name === "turret_index")!;
    expect(turret.time_s).toBe(0);
  });

  it("accumulates chuck/tailstock/catcher/coolant/dwell events", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [
        { op: "a", cut_time_s: 1, chuck_actuate: true, coolant_on: true, dwell_g4_s: 2 },
        { op: "b", cut_time_s: 1, tailstock_move: true, part_catcher: true },
      ],
    });
    expect(r.components.find((c) => c.name === "chuck_actuate")!.time_s).toBe(1.5);
    expect(r.components.find((c) => c.name === "coolant_settle")!.time_s).toBe(0.3);
    expect(r.components.find((c) => c.name === "dwell_g4")!.time_s).toBe(2);
    expect(r.components.find((c) => c.name === "tailstock")!.time_s).toBe(3);
    expect(r.components.find((c) => c.name === "part_catcher")!.time_s).toBe(2.5);
  });

  it("lookahead scales with corner count", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      lookahead_per_corner_s: 0.1,
      operations: [{ op: "a", cut_time_s: 1, sharp_corner_count: 20 }],
    });
    expect(r.components.find((c) => c.name === "lookahead")!.time_s).toBe(2);
  });

  it("tool_change adds live tool engagement", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      live_tool_engage_s: 0.8,
      operations: [
        { op: "a", cut_time_s: 1, live_tool_engage: true },
        { op: "b", cut_time_s: 1, live_tool_engage: true },
      ],
    });
    expect(r.components.find((c) => c.name === "tool_change")!.time_s).toBeCloseTo(1.6, 2);
  });

  it("total_time_s = sum of components", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [{ op: "a", cut_time_s: 30, rapid_distance_mm: 1000 }],
    });
    const sum = r.components.reduce((s, c) => s + c.time_s, 0);
    expect(r.total_time_s).toBeCloseTo(sum, 2);
  });

  it("component percentages sum to ~100", () => {
    const r = latheAuxAxisTimingEngine.analyze({
      turret: "BMT",
      operations: [
        { op: "a", cut_time_s: 30, rapid_distance_mm: 500, chuck_actuate: true },
      ],
    });
    const pctSum = r.components.reduce((s, c) => s + c.pct, 0);
    expect(pctSum).toBeCloseTo(100, 0);
  });

  it("getStats returns 12 components", () => {
    expect(latheAuxAxisTimingEngine.getStats().components).toBe(12);
  });
});
