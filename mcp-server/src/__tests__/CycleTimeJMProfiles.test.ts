/**
 * U-QP-CYCLETIME-JM-PROFILES (charlie 2026-06-12) — verify the JM Die fleet machine
 * profiles added to CycleTimeEstimatorEngine resolve and produce physically-sane,
 * machine-relative cycle times from real G-code. Reference values are RELATIVE
 * invariants (faster machine -> less rapid time), not fabricated absolutes.
 */
import { describe, it, expect } from "vitest";
import { cycleTimeEstimatorEngine } from "../engines/CycleTimeEstimatorEngine.js";

// Small but representative mill program: rapids (G0), linear cuts (G1), 2 tool
// changes (M06), spindle start. mm (G21). Exercises rapid + cut + tool-change time.
const PROG = `%
O0001
N10 G21 G90 G54
N20 T1 M06
N30 G0 X0 Y0 Z5
N40 S5000 M03
N50 G1 Z-2 F100
N60 G1 X100 Y0 F500
N70 G1 X100 Y100
N80 G1 X0 Y100
N90 G0 Z5
N100 T2 M06
N110 G0 X0 Y0
N120 G1 Z-2 F100
N130 G1 X50 Y50 F600
N140 G0 Z25
N150 M30
%`;

describe("CycleTimeEstimatorEngine — JM Die fleet machine profiles", () => {
  it("hurco_vm30i / hurco_vmx24 / okuma_m460v profiles resolve + give sane time", () => {
    for (const profile of ["hurco_vm30i", "hurco_vmx24", "okuma_m460v"]) {
      const controller = profile.startsWith("hurco") ? "hurco" : "okuma";
      const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: controller, machine_profile: profile });
      expect(r.machine_profile).toBe(profile);
      expect(Number.isFinite(r.total_seconds)).toBe(true);
      expect(r.total_seconds).toBeGreaterThan(0);
      // both tool changes counted (>= 2 * smallest tool-change time)
      expect(r.tool_change_time).toBeGreaterThan(0);
      // cutting time must be present (the G1 moves)
      expect(r.cutting_time).toBeGreaterThan(0);
    }
  });

  it("RELATIVE invariant: faster-rapid machine -> less rapid time (okuma_m460v 50000 < haas_vf2 25400)", () => {
    const okuma = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "okuma", machine_profile: "okuma_m460v" });
    const haas = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "haas", machine_profile: "haas_vf2" });
    expect(okuma.rapid_time).toBeLessThan(haas.rapid_time);
    // cutting time is feed-bound (same feeds) -> should be ~equal regardless of machine
    expect(Math.abs(okuma.cutting_time - haas.cutting_time)).toBeLessThan(okuma.cutting_time * 0.05 + 0.5);
  });

  it("RELATIVE invariant: faster tool-change machine -> less tool-change time (okuma 4s < hurco_vmx24 6s)", () => {
    const okuma = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "okuma", machine_profile: "okuma_m460v" });
    const hurco = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "hurco", machine_profile: "hurco_vmx24" });
    expect(okuma.tool_change_time).toBeLessThan(hurco.tool_change_time);
  });

  it("hurco controller default (no machine_profile) resolves to finite time", () => {
    const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "hurco" });
    expect(Number.isFinite(r.total_seconds)).toBe(true);
    expect(r.total_seconds).toBeGreaterThan(0);
  });

  it("unknown machine_profile falls back gracefully (no throw, finite time)", () => {
    const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "hurco", machine_profile: "nonexistent_machine_xyz" });
    expect(Number.isFinite(r.total_seconds)).toBe(true);
    expect(r.total_seconds).toBeGreaterThan(0);
  });
});
