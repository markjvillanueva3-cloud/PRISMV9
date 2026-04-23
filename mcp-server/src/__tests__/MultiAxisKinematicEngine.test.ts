/**
 * MultiAxisKinematicEngine tests — MILL-MASTER Phase 4 (5-Axis Hardening)
 *
 * Validates kinematic analysis on 5-axis G-code:
 *   - detectSingularities: risk-scored hits (critical <2°, warning <8°, info <15°)
 *   - optimizeRotaryMotion: shortest-path unwinding + micro-rotation elimination
 *   - analyzeReachability: axis-limit violations + utilization stats
 *   - transformCoordinates: kinematic retransformation across machine types
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial inputs,
 * ≥3 kinematic configurations (head-table, table-table, head-head) spanned.
 */
import { describe, it, expect } from "vitest";
import {
  multiAxisKinematicEngine,
  type MachineKinematics,
  type FiveAxisMove,
} from "../engines/MultiAxisKinematicEngine.js";
import { ACTIONS as CAM_ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ── Fixtures ──────────────────────────────────────────────────────────────
const AC_TABLE_TABLE: MachineKinematics = {
  type: "table-table",
  primary_rotary: "A",
  secondary_rotary: "C",
  pivot_point: { x: 0, y: 0, z: 0 },
  rotary_limits: { primary_min: -120, primary_max: 120, secondary_min: -360, secondary_max: 360 },
  continuous_rotary: [false, true],
};

const BC_HEAD_TABLE: MachineKinematics = {
  type: "head-table",
  primary_rotary: "B",
  secondary_rotary: "C",
  pivot_point: { x: 0, y: 0, z: 150 },
  rotary_limits: { primary_min: -110, primary_max: 110, secondary_min: -360, secondary_max: 360 },
  continuous_rotary: [false, true],
};

const AB_HEAD_HEAD: MachineKinematics = {
  type: "head-head",
  primary_rotary: "A",
  secondary_rotary: "B",
  pivot_point: { x: 0, y: 0, z: 200 },
  rotary_limits: { primary_min: -90, primary_max: 90, secondary_min: -90, secondary_max: 90 },
  continuous_rotary: [false, false],
};

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine.detectSingularities", () => {
  it("head-table: primary B≈0° (tool vertical) flagged critical", () => {
    const gcode = [
      "G1 X10 Y0 Z0 B0.5 C30 F500",
      "G1 X20 Y0 Z0 B1.5 C45 F500",
      "G1 X30 Y0 Z0 B5 C60 F500",
    ].join("\n");
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, BC_HEAD_TABLE);
    expect(analysis.safe).toBe(false);
    const critical = analysis.singularities.filter((hit) => hit.risk === "critical");
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].proximity_deg).toBeLessThan(2.0);
  });

  it("head-table: primary B=20° (well clear of singularity) returns safe", () => {
    const gcode = [
      "G1 X10 Y0 Z0 B20 C30 F500",
      "G1 X20 Y0 Z0 B25 C45 F500",
    ].join("\n");
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, BC_HEAD_TABLE);
    expect(analysis.safe).toBe(true);
    expect(analysis.singularities.length).toBe(0);
    expect(analysis.summary).toContain("No singularity");
  });

  it("table-table: primary A≈0 triggers singularity (no unique C decomposition)", () => {
    const gcode = "G1 X0 Y0 Z0 A0.8 C15 F500";
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, AC_TABLE_TABLE);
    expect(analysis.safe).toBe(false);
    const hit = analysis.singularities[0];
    expect(hit.risk).toBe("critical");
    expect(hit.proximity_deg).toBeLessThan(2.0);
  });

  it("proximity thresholds: 2° critical, 5° warning, 12° info", () => {
    const gcode = [
      "G1 X0 Y0 Z0 B1.5 C0 F500", // 1.5° → critical
      "G1 X1 Y0 Z0 B5 C0 F500",   // 5° → warning
      "G1 X2 Y0 Z0 B12 C0 F500",  // 12° → info
      "G1 X3 Y0 Z0 B20 C0 F500",  // 20° → no hit (over 15° threshold)
    ].join("\n");
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, BC_HEAD_TABLE);
    const risks = analysis.singularities.map((hit) => hit.risk);
    expect(risks).toContain("critical");
    expect(risks).toContain("warning");
    expect(risks).toContain("info");
    // The 20° point should NOT appear at all
    const overThreshold = analysis.singularities.filter((hit) => hit.proximity_deg > 15);
    expect(overThreshold.length).toBe(0);
  });

  it("empty g-code produces empty result and safe=true", () => {
    const analysis = multiAxisKinematicEngine.detectSingularities("", BC_HEAD_TABLE);
    expect(analysis.safe).toBe(true);
    expect(analysis.singularities.length).toBe(0);
    expect(analysis.summary).toContain("Analyzed 0");
  });

  it("g-code with comments only is treated as zero moves", () => {
    const gcode = [
      "(This is a comment)",
      "; another comment",
      "(O100)",
    ].join("\n");
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, BC_HEAD_TABLE);
    expect(analysis.safe).toBe(true);
    expect(analysis.singularities.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine.optimizeRotaryMotion", () => {
  it("shortest-path unwinding: 170→-170 on continuous C rewrites to +190 (saves 320°)", () => {
    // Naive path 170 → -170 is -340°; shortest is +20°.
    // New target 170 + 20 = 190, within limits [-360, 360], so engine applies it.
    const gcode = [
      "G1 X0 Y0 Z0 A30 C170 F500",
      "G1 X10 Y0 Z0 A30 C-170 F500",
    ].join("\n");
    const opt = multiAxisKinematicEngine.optimizeRotaryMotion(gcode, AC_TABLE_TABLE);
    expect(opt.modified_count).toBeGreaterThanOrEqual(1);
    expect(opt.total_saved_deg).toBeGreaterThan(300);
    expect(opt.moves[1].secondary_deg).toBeCloseTo(190, 1);
  });

  it("micro-rotation (<0.05°) is collapsed to previous value", () => {
    const gcode = [
      "G1 X0 Y0 Z0 A30 C10 F500",
      "G1 X1 Y0 Z0 A30.02 C10 F500", // 0.02° A delta — micro
    ].join("\n");
    const opt = multiAxisKinematicEngine.optimizeRotaryMotion(gcode, AC_TABLE_TABLE);
    expect(opt.modified_count).toBeGreaterThanOrEqual(1);
    expect(opt.moves[1].primary_deg).toBe(30);
  });

  it("non-continuous axis: large move NOT unwound (would exceed limits)", () => {
    const nonContinuous: MachineKinematics = { ...AC_TABLE_TABLE, continuous_rotary: [false, false] };
    const gcode = [
      "G1 X0 Y0 Z0 A30 C350 F500",
      "G1 X10 Y0 Z0 A30 C10 F500",
    ].join("\n");
    const opt = multiAxisKinematicEngine.optimizeRotaryMotion(gcode, nonContinuous);
    // Shortest-path unwinding requires continuous_rotary[1] = true; here it's false.
    // So the large delta is NOT rewritten.
    expect(opt.moves[1].secondary_deg).toBe(10);
  });

  it("single-move program is a no-op (fewer than 2 moves)", () => {
    const gcode = "G1 X0 Y0 Z0 A30 C45 F500";
    const opt = multiAxisKinematicEngine.optimizeRotaryMotion(gcode, AC_TABLE_TABLE);
    expect(opt.modified_count).toBe(0);
    expect(opt.total_saved_deg).toBe(0);
    expect(opt.changes[0]).toMatch(/No optimization/);
  });

  it("already-optimal g-code: no saving, modified_count=0", () => {
    const gcode = [
      "G1 X0 Y0 Z0 A30 C10 F500",
      "G1 X1 Y0 Z0 A30 C20 F500",
      "G1 X2 Y0 Z0 A30 C30 F500",
    ].join("\n");
    const opt = multiAxisKinematicEngine.optimizeRotaryMotion(gcode, AC_TABLE_TABLE);
    expect(opt.modified_count).toBe(0);
    expect(opt.total_saved_deg).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine.analyzeReachability", () => {
  it("positions within limits: reachable=true, violations empty, usage stats", () => {
    const gcode = [
      "G1 X0 Y0 Z0 A30 C90 F500",
      "G1 X1 Y0 Z0 A-30 C-90 F500",
    ].join("\n");
    const analysis = multiAxisKinematicEngine.analyzeReachability(gcode, AC_TABLE_TABLE);
    expect(analysis.reachable).toBe(true);
    expect(analysis.violations.length).toBe(0);
    expect(analysis.utilization.primary_range_used).toEqual([-30, 30]);
    expect(analysis.utilization.secondary_range_used).toEqual([-90, 90]);
    // primary used range = 60, limit range = 240 → 25% utilization
    expect(analysis.utilization.primary_utilization_pct).toBeCloseTo(25, 1);
  });

  it("primary axis outside limits: violation with overshoot in degrees", () => {
    const gcode = "G1 X0 Y0 Z0 A150 C0 F500"; // 150 > primary_max 120 → overshoot 30
    const analysis = multiAxisKinematicEngine.analyzeReachability(gcode, AC_TABLE_TABLE);
    expect(analysis.reachable).toBe(false);
    expect(analysis.violations.length).toBe(1);
    const violation = analysis.violations[0];
    expect(violation.axis).toBe("A");
    expect(violation.required_deg).toBe(150);
    expect(violation.limit_deg).toBe(120);
    expect(violation.overshoot_deg).toBe(30);
  });

  it("secondary axis below min: violation reports min as nearest limit", () => {
    const headHead = AB_HEAD_HEAD; // B limits ±90
    const gcode = "G1 X0 Y0 Z0 A30 B-120 F500"; // -120 < -90 → overshoot 30
    const analysis = multiAxisKinematicEngine.analyzeReachability(gcode, headHead);
    expect(analysis.reachable).toBe(false);
    const violation = analysis.violations[0];
    expect(violation.axis).toBe("B");
    expect(violation.limit_deg).toBe(-90);
    expect(violation.overshoot_deg).toBe(30);
  });

  it("summary reports max overshoot when violations exist", () => {
    const gcode = [
      "G1 X0 Y0 Z0 A150 C0 F500",   // overshoot 30
      "G1 X1 Y0 Z0 A200 C0 F500",   // overshoot 80 — larger
    ].join("\n");
    const analysis = multiAxisKinematicEngine.analyzeReachability(gcode, AC_TABLE_TABLE);
    expect(analysis.reachable).toBe(false);
    expect(analysis.summary).toContain("UNREACHABLE");
    expect(analysis.summary).toContain("80.0");
  });

  it("empty g-code reports zero utilization and reachable=true", () => {
    const analysis = multiAxisKinematicEngine.analyzeReachability("", AC_TABLE_TABLE);
    expect(analysis.reachable).toBe(true);
    expect(analysis.utilization.primary_utilization_pct).toBe(0);
    expect(analysis.violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine.transformCoordinates", () => {
  it("transforms a single move between machine kinematics without crashing", () => {
    const moves: FiveAxisMove[] = [
      { line: 1, x: 10, y: 20, z: 30, primary_deg: 15, secondary_deg: 45, feed: 500 },
    ];
    const out = multiAxisKinematicEngine.transformCoordinates(moves, AC_TABLE_TABLE, BC_HEAD_TABLE);
    expect(out.moves.length).toBe(1);
    expect(out.recalculated_count).toBe(1);
    const m = out.moves[0];
    expect(Number.isFinite(m.x)).toBe(true);
    expect(Number.isFinite(m.y)).toBe(true);
    expect(Number.isFinite(m.primary_deg)).toBe(true);
    expect(Number.isFinite(m.secondary_deg)).toBe(true);
  });

  it("source→target where target axis limits are exceeded emits a warning", () => {
    const tightTarget: MachineKinematics = {
      ...BC_HEAD_TABLE,
      rotary_limits: { primary_min: -5, primary_max: 5, secondary_min: -5, secondary_max: 5 },
    };
    const moves: FiveAxisMove[] = [
      { line: 1, x: 0, y: 0, z: 0, primary_deg: 60, secondary_deg: 60, feed: 500 },
    ];
    const out = multiAxisKinematicEngine.transformCoordinates(moves, AC_TABLE_TABLE, tightTarget);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("empty move list produces empty output with no warnings", () => {
    const out = multiAxisKinematicEngine.transformCoordinates([], AC_TABLE_TABLE, BC_HEAD_TABLE);
    expect(out.moves.length).toBe(0);
    expect(out.recalculated_count).toBe(0);
    expect(out.warnings.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine — adversarial inputs", () => {
  it("g-code with non-standard line endings (\\r\\n) still parses", () => {
    const gcode = "G1 X0 Y0 Z0 A10 C0 F500\r\nG1 X1 Y0 Z0 A20 C0 F500";
    const analysis = multiAxisKinematicEngine.analyzeReachability(gcode, AC_TABLE_TABLE);
    expect(analysis.utilization.primary_range_used).toEqual([10, 20]);
  });

  it("g-code with no rotary axis words produces zero moves", () => {
    const gcode = "G1 X10 Y20 Z30 F500\nG1 X20 Y20 Z30 F500";
    const analysis = multiAxisKinematicEngine.detectSingularities(gcode, AC_TABLE_TABLE);
    expect(analysis.safe).toBe(true);
    expect(analysis.summary).toContain("Analyzed 0 moves");
  });

  it("huge g-code (500 lines) completes without crashing", () => {
    const lines: string[] = [];
    for (let i = 0; i < 500; i++) {
      lines.push(`G1 X${i} Y0 Z0 A${i % 90} C${i % 360} F500`);
    }
    const analysis = multiAxisKinematicEngine.analyzeReachability(lines.join("\n"), AC_TABLE_TABLE);
    expect(analysis.utilization.primary_range_used[0]).toBeGreaterThanOrEqual(0);
    expect(analysis.utilization.primary_range_used[1]).toBeLessThanOrEqual(89);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MultiAxisKinematicEngine — dispatcher wiring parity", () => {
  it("camDispatcher ACTIONS includes all 4 kinematic_* actions", () => {
    expect(CAM_ACTIONS).toContain("kinematic_singularity");
    expect(CAM_ACTIONS).toContain("kinematic_transform");
    expect(CAM_ACTIONS).toContain("kinematic_optimize");
    expect(CAM_ACTIONS).toContain("kinematic_reachability");
  });

  it("lazy-import round-trip: dispatcher pattern returns working engine", async () => {
    const mod = await import("../engines/MultiAxisKinematicEngine.js");
    const viaLazy = mod.multiAxisKinematicEngine;
    const analysis = viaLazy.analyzeReachability(
      "G1 X0 Y0 Z0 A10 C0 F500",
      AC_TABLE_TABLE,
    );
    expect(analysis.reachable).toBe(true);
  });

  it("dispatcher-style params survive round-trip for kinematic_reachability", async () => {
    const params = {
      gcode: "G1 X0 Y0 Z0 A30 C90 F500",
      kinematics: AC_TABLE_TABLE,
    };
    const mod = await import("../engines/MultiAxisKinematicEngine.js");
    const eng = mod.multiAxisKinematicEngine;
    const out = eng.analyzeReachability(params.gcode, params.kinematics);
    expect(out.reachable).toBe(true);
    expect(out.utilization.primary_range_used).toEqual([30, 30]);
  });
});
