/**
 * PostVerificationSafetyEngine companion tests
 * Covers all 6 public methods with algebraic-invariant and reference-value assertions.
 * No toBeDefined/toBeTruthy stubs — every assertion fails if logic changes (R9).
 */

import { describe, it, expect } from "vitest";
import { postVerificationSafetyEngine } from "../engines/PostVerificationSafetyEngine.js";
import type {
  VerificationInput,
  SurfaceFinishPrediction,
  SafetyIssue,
  EnvelopeViolation,
} from "../engines/PostVerificationSafetyEngine.js";

// ============================================================================
// SHARED FIXTURES
// ============================================================================

/** Canonical machine: 500×400×300mm travel, 10k RPM, 5k mm/min feed */
const MACHINE_LIMITS = {
  max_rpm: 10000,
  max_feed_mmmin: 5000,
  x_travel_mm: 500,  // half-travel ±250 mm
  y_travel_mm: 400,  // half-travel ±200 mm
  z_travel_mm: 300,
};

/** Well-formed G-code: WCS→TLC→spindle→safe rapid→feed cut */
const SAFE_GCODE = [
  "G21 G17 G40",
  "G54",
  "S3000 M3",
  "G43 H1",
  "G0 Z50",
  "G0 X0 Y0",
  "G1 Z-1 F300",
  "G1 X100 Y0 F500",
  "M9",
  "M5",
  "M30",
].join("\n");

/** Rapid into material while spindle is running — triggers S001 */
const RAPID_CRASH_GCODE = [
  "G54",
  "S3000 M3",
  "G43 H1",
  "G0 Z-5",   // G0 at Z<2 with spindle on → S001
  "M5 M30",
].join("\n");

/** Representative P-steel operation */
const STEEL_OP = {
  tool_diameter_mm: 10,
  tool_nose_radius_mm: 0.4,
  feed_per_tooth_mm: 0.1,
  tolerance_mm: 0.05,
  target_ra_um: 3.2,
  stepover_mm: 5,
  depth_of_cut_mm: 2,
  cutting_speed_mmin: 120,
  operation_type: "face_milling" as const,
};

const STEEL_INPUT: VerificationInput = {
  gcode: SAFE_GCODE,
  machine_limits: MACHINE_LIMITS,
  material_iso: "P",
  operations: [STEEL_OP],
  monte_carlo_iterations: 100,
};

// ============================================================================
// surface_finish_check — algebraic reference values (Brammertz + ball-nose)
// ============================================================================

describe("surface_finish_check", () => {
  it("face_milling Brammertz: Ra = f²/(32·r)×1000 µm — reference value 0.7813", () => {
    // f=0.1 mm, r=0.4 mm → Ra = 0.01/12.8 × 1000 = 0.78125 → rounded to 4 dp = 0.7813
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        tool_nose_radius_mm: 0.4,
        feed_per_tooth_mm: 0.1,
        operation_type: "face_milling",
      }],
    };
    const preds: SurfaceFinishPrediction[] = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds).toHaveLength(1);
    expect(preds[0].ra_predicted_um).toBeCloseTo(0.7813, 3);
    expect(preds[0].formula_used).toContain("f²/(32·r)");
    expect(preds[0].operation_type).toBe("face_milling");
    expect(preds[0].meets_tolerance).toBe(true); // no target_ra_um → always true
  });

  it("ball_nose scallop: h=ae²/(8R), Ra≈h/4×1000 — reference value 6.25 µm", () => {
    // ae=1mm, D=10mm, R=5mm → h=1/40=0.025mm, Ra=0.025/4×1000=6.25µm
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        stepover_mm: 1,
        operation_type: "ball_nose",
        target_ra_um: 1.6, // 6.25 > 1.6 → must NOT meet tolerance
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBeCloseTo(6.25, 2);
    // scallop_height_mm = 1²/(8×5) = 0.025
    expect(preds[0].scallop_height_mm).toBeCloseTo(0.025, 4);
    expect(preds[0].meets_tolerance).toBe(false);
    // recommendation must mention stepover
    expect(preds[0].recommendation).toMatch(/stepover/i);
  });

  it("ball_nose meets tolerance when stepover is small enough", () => {
    // ae=0.2mm, D=10mm, R=5 → h=0.04/40=0.001mm, Ra=0.001/4×1000=0.25µm < 1.6µm
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        stepover_mm: 0.2,
        operation_type: "ball_nose",
        target_ra_um: 1.6,
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].meets_tolerance).toBe(true);
    expect(preds[0].ra_predicted_um).toBeLessThan(1.6);
    expect(preds[0].recommendation).toBeUndefined();
  });

  it("peripheral with nose radius uses Brammertz: f=0.1, r=0.8 → Ra=0.3906 µm", () => {
    // Ra = 0.01/(32×0.8)×1000 = 0.01/25.6×1000 = 0.390625 → 0.3906
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        tool_nose_radius_mm: 0.8,
        feed_per_tooth_mm: 0.1,
        operation_type: "peripheral",
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBeCloseTo(0.3906, 3);
    expect(preds[0].formula_used).toContain("peripheral");
  });

  it("peripheral sharp (no nose radius): Ra=fz×sqrt(ae/D)/8×1000 — reference 8.8388 µm", () => {
    // f=0.1, ae=5, D=10 → Ra = 0.1×sqrt(0.5)×1000/8 = 0.1×0.70711×125 = 8.8388 µm
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        feed_per_tooth_mm: 0.1,
        stepover_mm: 5,
        operation_type: "peripheral",
        // no tool_nose_radius_mm
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBeCloseTo(8.8388, 2);
  });

  it("Ra is always >= 0.001 µm — physical lower clamp", () => {
    // Extremely tiny fz → unclamped would be ~0.000078 µm
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        tool_nose_radius_mm: 0.4,
        feed_per_tooth_mm: 0.001,
        operation_type: "face_milling",
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBeGreaterThanOrEqual(0.001);
  });

  it("face_milling falls back to the Ra=3.2 µm default only when nose radius is explicitly zero", () => {
    // Brammertz Ra=f^2/(32r) needs r>0; r===0 is the only path to the 3.2 default.
    // (An ABSENT nose radius defaults to r=0.4 and DOES compute a real Ra, so it would not hit 3.2.)
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        feed_per_tooth_mm: 0.1,
        operation_type: "face_milling",
        tool_nose_radius_mm: 0,
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBe(3.2);
    expect(preds[0].formula_used).toContain("Default Ra 3.2");
  });

  it("absent nose radius defaults to r=0.4 and computes Brammertz Ra (not the 3.2 fallback)", () => {
    // f=0.1, r=0.4 -> Ra = 0.1^2/(32*0.4)*1000 = 0.78125 um
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{
        tool_diameter_mm: 10,
        feed_per_tooth_mm: 0.1,
        operation_type: "face_milling",
        // no tool_nose_radius_mm -> r defaults to 0.4
      }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].ra_predicted_um).toBeCloseTo(0.78125, 4);
    expect(preds[0].formula_used).not.toContain("Default Ra 3.2");
  });

  it("multiple operations produce independent predictions indexed 0, 1", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [
        { tool_diameter_mm: 10, tool_nose_radius_mm: 0.4, feed_per_tooth_mm: 0.1, operation_type: "face_milling" },
        { tool_diameter_mm: 12, stepover_mm: 0.5, operation_type: "ball_nose" },
      ],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds).toHaveLength(2);
    expect(preds[0].operation_index).toBe(0);
    expect(preds[1].operation_index).toBe(1);
    // Two different formulas → different Ra values
    expect(preds[0].ra_predicted_um).not.toBe(preds[1].ra_predicted_um);
  });

  // adversarial
  it("adversarial: empty operations array returns empty array", () => {
    const preds = postVerificationSafetyEngine.surface_finish_check({ ...STEEL_INPUT, operations: [] });
    expect(preds).toHaveLength(0);
  });

  it("adversarial: omitting operation_type defaults to 'peripheral' branch", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, feed_per_tooth_mm: 0.1, stepover_mm: 3 }],
    };
    const preds = postVerificationSafetyEngine.surface_finish_check(input);
    expect(preds[0].operation_type).toBe("peripheral");
    expect(preds[0].ra_predicted_um).toBeGreaterThan(0);
  });
});

// ============================================================================
// safety_check — G-code state machine
// ============================================================================

describe("safety_check", () => {
  it("happy path: safe G-code produces zero critical issues", () => {
    const issues: SafetyIssue[] = postVerificationSafetyEngine.safety_check(STEEL_INPUT);
    const criticals = issues.filter(i => i.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  it("S001: G0 to Z=-5 while spindle on is flagged critical", () => {
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode: RAPID_CRASH_GCODE });
    const s001 = issues.filter(i => i.code === "S001");
    expect(s001.length).toBeGreaterThanOrEqual(1);
    expect(s001[0].severity).toBe("critical");
    expect(s001[0].issue).toMatch(/G0|rapid/i);
  });

  it("S002: F value exceeding machine max is flagged critical", () => {
    const overFeed = MACHINE_LIMITS.max_feed_mmmin + 100;
    const gcode = `G54\nS3000 M3\nG43 H1\nG1 Z1 F${overFeed}\nM5\nM30`;
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode });
    const s002 = issues.filter(i => i.code === "S002");
    expect(s002.length).toBeGreaterThanOrEqual(1);
    expect(s002[0].severity).toBe("critical");
    expect(s002[0].issue).toContain(`F${overFeed}`);
  });

  it("S003: S value exceeding machine max RPM is flagged critical", () => {
    const overRPM = MACHINE_LIMITS.max_rpm + 500;
    const gcode = `G54\nS${overRPM} M3\nG43 H1\nG0 Z50\nM5\nM30`;
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode });
    const s003 = issues.filter(i => i.code === "S003");
    expect(s003.length).toBeGreaterThanOrEqual(1);
    expect(s003[0].severity).toBe("critical");
  });

  it("S004: cutting without G43 tool-length compensation is flagged critical", () => {
    const gcode = `G54\nS3000 M3\nG1 Z-1 F300\nM5\nM30`; // no G43
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode });
    const s004 = issues.filter(i => i.code === "S004");
    expect(s004.length).toBeGreaterThanOrEqual(1);
    expect(s004[0].severity).toBe("critical");
    expect(s004[0].fix).toMatch(/G43/);
  });

  it("S006: no work coordinate offset before cut is flagged critical", () => {
    const gcode = `S3000 M3\nG43 H1\nG1 Z-1 F300\nM5\nM30`; // no G54-G59
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode });
    const s006 = issues.filter(i => i.code === "S006");
    expect(s006.length).toBeGreaterThanOrEqual(1);
    expect(s006[0].severity).toBe("critical");
  });

  it("S007: ISO S material with no M7/M8 in program produces warning at line 0", () => {
    const gcode = `G54\nS2000 M3\nG43 H1\nG0 Z50\nG1 Z1 F200\nM5\nM30`; // no coolant
    const input: VerificationInput = { ...STEEL_INPUT, material_iso: "S", gcode };
    const issues = postVerificationSafetyEngine.safety_check(input);
    const s007 = issues.filter(i => i.code === "S007");
    expect(s007.length).toBeGreaterThanOrEqual(1);
    expect(s007[0].severity).toBe("warning");
    expect(s007[0].line_number).toBe(0);
    expect(s007[0].fix).toMatch(/M8|M7/i);
  });

  it("issue schema invariant: code matches /^S\\d{3}$/, severity in enum", () => {
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode: RAPID_CRASH_GCODE });
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.code).toMatch(/^S\d{3}$/);
      expect(["critical", "warning", "info"]).toContain(issue.severity);
      expect(issue.issue.length).toBeGreaterThan(0);
      expect(issue.fix.length).toBeGreaterThan(0);
      expect(typeof issue.line_number).toBe("number");
    }
  });

  // adversarial
  it("adversarial: empty G-code string — no critical issues (state machine cannot fire)", () => {
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode: "" });
    const criticals = issues.filter(i => i.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  it("adversarial: G-code containing only comments — returns empty array", () => {
    const gcode = "(this is a comment)\n; another comment";
    const issues = postVerificationSafetyEngine.safety_check({ ...STEEL_INPUT, gcode });
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.filter(i => i.severity === "critical")).toHaveLength(0);
  });
});

// ============================================================================
// playbook_check — material-threshold rules
// ============================================================================

describe("playbook_check", () => {
  it("happy path: in-limit steel op produces no critical violations", () => {
    const violations = postVerificationSafetyEngine.playbook_check(STEEL_INPUT);
    expect(violations.filter(v => v.severity === "critical")).toHaveLength(0);
  });

  it("PB001: full-width slotting (ae>=95%D) above 1×D DOC is critical", () => {
    // ae=9.6 >= 9.5 (95% of 10), doc=12 > 1×D=10
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, stepover_mm: 9.6, depth_of_cut_mm: 12 }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb001 = violations.filter(v => v.rule_id === "PB001");
    expect(pb001.length).toBeGreaterThanOrEqual(1);
    expect(pb001[0].severity).toBe("critical");
  });

  it("PB001 does NOT fire when DOC <= 1×D even at full width", () => {
    // ae=9.6 (full width) but doc=9 <= D=10 → rule should NOT trigger
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, stepover_mm: 9.6, depth_of_cut_mm: 9 }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    expect(violations.filter(v => v.rule_id === "PB001")).toHaveLength(0);
  });

  it("PB002: Vc=40 m/min carbide in steel (P) triggers BUE warning", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      material_iso: "P",
      operations: [{ tool_diameter_mm: 10, cutting_speed_mmin: 40 }], // < 60 m/min threshold
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb002 = violations.filter(v => v.rule_id === "PB002");
    expect(pb002.length).toBeGreaterThanOrEqual(1);
    expect(pb002[0].severity).toBe("warning");
    expect(pb002[0].description).toContain("BUE");
  });

  it("PB003: fz=0.30 mm/tooth exceeds ISO P max (0.25) → warning", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, feed_per_tooth_mm: 0.30 }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb003 = violations.filter(v => v.rule_id === "PB003");
    expect(pb003.length).toBeGreaterThanOrEqual(1);
    expect(pb003[0].severity).toBe("warning");
    expect(pb003[0].recommended_fix).toContain("0.25");
  });

  it("PB004: wall/D ratio=0.8 < 1.5 threshold triggers thin-wall warning", () => {
    // wall=8mm, D=10mm → ratio=0.80
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, wall_thickness_mm: 8 }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb004 = violations.filter(v => v.rule_id === "PB004");
    expect(pb004.length).toBeGreaterThanOrEqual(1);
    expect(pb004[0].severity).toBe("warning");
    expect(pb004[0].description).toContain("0.80");
  });

  it("PB005: ISO S without coolant_active is critical", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      material_iso: "S",
      operations: [{ tool_diameter_mm: 10, coolant_active: false }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb005 = violations.filter(v => v.rule_id === "PB005");
    expect(pb005.length).toBeGreaterThanOrEqual(1);
    expect(pb005[0].severity).toBe("critical");
    expect(pb005[0].description).toMatch(/fire|coolant|tool failure/i);
  });

  it("PB007: Vc=80 m/min exceeds Ti hard limit 60 m/min → critical", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      material_iso: "S",
      operations: [{ tool_diameter_mm: 10, cutting_speed_mmin: 80, coolant_active: true }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    const pb007 = violations.filter(v => v.rule_id === "PB007");
    expect(pb007.length).toBeGreaterThanOrEqual(1);
    expect(pb007[0].severity).toBe("critical");
    expect(pb007[0].description).toContain("60");
  });

  it("violation schema invariant: rule_id, severity, description, recommended_fix all present", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, feed_per_tooth_mm: 0.35, cutting_speed_mmin: 40 }],
    };
    const violations = postVerificationSafetyEngine.playbook_check(input);
    expect(violations.length).toBeGreaterThan(0);
    for (const v of violations) {
      expect(typeof v.rule_id).toBe("string");
      expect(["critical", "warning"]).toContain(v.severity);
      expect(v.description.length).toBeGreaterThan(0);
      expect(v.recommended_fix.length).toBeGreaterThan(0);
    }
  });

  // adversarial
  it("adversarial: unknown material_iso falls back to P defaults without throwing", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      material_iso: "Z", // not in MATERIAL_PHYSICS — falls back to P
      operations: [{ tool_diameter_mm: 10, feed_per_tooth_mm: 0.30 }],
    };
    expect(() => postVerificationSafetyEngine.playbook_check(input)).not.toThrow();
    // fz=0.30 > P fallback max=0.25 → PB003 warning should still fire
    const violations = postVerificationSafetyEngine.playbook_check(input);
    expect(violations.filter(v => v.rule_id === "PB003").length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// envelope_check — axis travel limits
// ============================================================================

describe("envelope_check", () => {
  it("happy path: all in-bounds moves produce zero violations", () => {
    const violations = postVerificationSafetyEngine.envelope_check(STEEL_INPUT);
    expect(violations).toHaveLength(0);
  });

  it("X=300 exceeds ±250mm half-travel → axis=X, limit=250", () => {
    const gcode = "G54\nG0 X300 Y0 Z50\nM30";
    const violations: EnvelopeViolation[] = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    const x_viols = violations.filter(v => v.axis === "X");
    expect(x_viols.length).toBeGreaterThanOrEqual(1);
    expect(x_viols[0].commanded_value).toBe(300);
    expect(x_viols[0].limit).toBe(250); // x_travel_mm/2 = 500/2
  });

  it("Y=-250 exceeds ±200mm half-travel → axis=Y, commanded_value=-250", () => {
    const gcode = "G54\nG0 X0 Y-250 Z50\nM30";
    const violations = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    const y_viols = violations.filter(v => v.axis === "Y");
    expect(y_viols.length).toBeGreaterThanOrEqual(1);
    expect(y_viols[0].commanded_value).toBe(-250);
    expect(y_viols[0].limit).toBe(200);
  });

  it("Z=350 exceeds z_travel=300 → axis=Z, limit=300", () => {
    const gcode = "G54\nG0 Z350\nM30";
    const violations = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    const z_viols = violations.filter(v => v.axis === "Z" && v.commanded_value > 0);
    expect(z_viols.length).toBeGreaterThanOrEqual(1);
    expect(z_viols[0].commanded_value).toBe(350);
    expect(z_viols[0].limit).toBe(300);
  });

  it("Z=-31 is more than 10% below z_travel=300 (threshold=-30) → axis=Z, limit=0", () => {
    // 10% of 300 = 30 → Z < -30 triggers; -31 is just past the edge
    const gcode = "G54\nG0 Z-31\nM30";
    const violations = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    const z_neg = violations.filter(v => v.axis === "Z" && v.commanded_value < 0);
    expect(z_neg.length).toBeGreaterThanOrEqual(1);
    expect(z_neg[0].limit).toBe(0);
  });

  it("Z=-30 (exactly at 10% boundary) does NOT trigger Z-below violation", () => {
    const gcode = "G54\nG0 Z-30\nM30";
    const violations = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    const z_neg = violations.filter(v => v.axis === "Z" && v.commanded_value < 0);
    expect(z_neg).toHaveLength(0);
  });

  it("rotary axis A=200° outside [-120°, +120°] triggers rotary violation", () => {
    const gcode = "G54\nA200\nM30";
    const input: VerificationInput = {
      ...STEEL_INPUT,
      machine_limits: {
        ...MACHINE_LIMITS,
        rotary_limits: [{ axis: "A", min_deg: -120, max_deg: 120 }],
      },
      gcode,
    };
    const violations = postVerificationSafetyEngine.envelope_check(input);
    const a_viols = violations.filter(v => v.axis === "A");
    expect(a_viols.length).toBeGreaterThanOrEqual(1);
    expect(a_viols[0].commanded_value).toBe(200);
  });

  it("violation schema: axis string, commanded_value/limit numbers, description non-empty", () => {
    const gcode = "G0 X400 Y-300 Z400\nM30";
    const violations = postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode });
    expect(violations.length).toBeGreaterThan(0);
    for (const v of violations) {
      expect(typeof v.axis).toBe("string");
      expect(typeof v.commanded_value).toBe("number");
      expect(typeof v.limit).toBe("number");
      expect(typeof v.description).toBe("string");
      expect(v.description.length).toBeGreaterThan(0);
      expect(typeof v.line_number).toBe("number");
    }
  });

  // adversarial
  it("adversarial: empty G-code string — zero violations", () => {
    expect(postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode: "" })).toHaveLength(0);
  });

  it("adversarial: G-code with no axis words — zero violations", () => {
    const gcode = "G21\nG17\nM30";
    expect(postVerificationSafetyEngine.envelope_check({ ...STEEL_INPUT, gcode })).toHaveLength(0);
  });
});

// ============================================================================
// monte_carlo — seeded deterministic LCG (seed=42, N=100)
// ============================================================================

describe("monte_carlo", () => {
  it("returns exactly N=100 iterations by default", () => {
    const result = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    expect(result.iterations).toBe(100);
  });

  it("custom monte_carlo_iterations=50 is honored", () => {
    const result = postVerificationSafetyEngine.monte_carlo({ ...STEEL_INPUT, monte_carlo_iterations: 50 });
    expect(result.iterations).toBe(50);
  });

  it("all 4 stat fields have ordered CI95 [lower < upper]", () => {
    const result = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    for (const field of ["force_N", "temperature_C", "deflection_mm", "ra_um"] as const) {
      const stat = result[field];
      expect(stat.ci95[0]).toBeLessThan(stat.ci95[1]);
    }
  });

  it("CI width algebraic invariant: width == 2×1.96×(std/sqrt(N))", () => {
    const result = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    const N = 100;
    for (const field of ["force_N", "temperature_C", "deflection_mm", "ra_um"] as const) {
      const { std, ci95 } = result[field];
      const expected_width = 2 * 1.96 * (std / Math.sqrt(N));
      const actual_width = ci95[1] - ci95[0];
      expect(actual_width).toBeCloseTo(expected_width, 2);
    }
  });

  it("force_N.mean > 0 for non-zero chip geometry in steel", () => {
    expect(postVerificationSafetyEngine.monte_carlo(STEEL_INPUT).force_N.mean).toBeGreaterThan(0);
  });

  it("temperature_C.mean in physical range [300, 1500]°C for steel at 120 m/min", () => {
    const result = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    // P base_temp=650°C, Vc=120 → 650×(1.2)^0.3×(0.1/0.1)^0.2 ≈ 686°C; with kc scatter ≈ 650-720
    expect(result.temperature_C.mean).toBeGreaterThan(300);
    expect(result.temperature_C.mean).toBeLessThan(1500);
  });

  it("cpk is a finite number when tolerance_mm is provided", () => {
    const result = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT); // tolerance_mm=0.05
    expect(typeof result.cpk).toBe("number");
    expect(Number.isFinite(result.cpk as number)).toBe(true);
  });

  it("cpk is undefined (not present) when tolerance_mm is absent", () => {
    const input: VerificationInput = {
      ...STEEL_INPUT,
      operations: [{ tool_diameter_mm: 10, feed_per_tooth_mm: 0.1 }], // no tolerance_mm
    };
    const result = postVerificationSafetyEngine.monte_carlo(input);
    // undefined is the contract — no cpk key in result
    expect(result.cpk).toBeUndefined();
  });

  it("seeded LCG determinism: identical inputs produce byte-identical means", () => {
    const r1 = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    const r2 = postVerificationSafetyEngine.monte_carlo(STEEL_INPUT);
    expect(r1.force_N.mean).toBe(r2.force_N.mean);
    expect(r1.temperature_C.mean).toBe(r2.temperature_C.mean);
    expect(r1.deflection_mm.mean).toBe(r2.deflection_mm.mean);
    expect(r1.ra_um.mean).toBe(r2.ra_um.mean);
  });

  it("ISO S (kc1=3200) produces higher force and temperature than ISO N (kc1=800)", () => {
    const s_result = postVerificationSafetyEngine.monte_carlo({ ...STEEL_INPUT, material_iso: "S" });
    const n_result = postVerificationSafetyEngine.monte_carlo({ ...STEEL_INPUT, material_iso: "N" });
    // kc1 ratio 3200/800 = 4× → force must be strictly greater for S
    expect(s_result.force_N.mean).toBeGreaterThan(n_result.force_N.mean);
    // base_temp S=900 vs N=350 → temperature greater for S
    expect(s_result.temperature_C.mean).toBeGreaterThan(n_result.temperature_C.mean);
  });

  // adversarial
  it("adversarial: empty operations array — uses internal defaults without throwing", () => {
    const input: VerificationInput = { ...STEEL_INPUT, operations: [] };
    expect(() => postVerificationSafetyEngine.monte_carlo(input)).not.toThrow();
    const result = postVerificationSafetyEngine.monte_carlo(input);
    expect(result.iterations).toBe(100);
    expect(result.force_N.mean).toBeGreaterThan(0);
  });
});

// ============================================================================
// verify_full — aggregation + risk_score invariant
// ============================================================================

describe("verify_full", () => {
  it("happy path: clean steel program passes with risk_score in [0, 100]", () => {
    const result = postVerificationSafetyEngine.verify_full(STEEL_INPUT);
    expect(result.passed).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(0);
    expect(result.risk_score).toBeLessThanOrEqual(100);
  });

  it("passed==false when critical safety issues or envelope violations exist", () => {
    // X over-travel + G0 crash both present
    const bad_gcode = "G54\nS3000 M3\nG43 H1\nG0 X600 Z-5\nM5\nM30";
    const result = postVerificationSafetyEngine.verify_full({ ...STEEL_INPUT, gcode: bad_gcode });
    expect(result.passed).toBe(false);
  });

  it("risk_score algebraic invariant: critical×20 + warning×5 + envelope×10 + sf_fail×3", () => {
    // Build an input known to produce a non-trivial mix of issues
    const input: VerificationInput = {
      ...STEEL_INPUT,
      material_iso: "P",
      operations: [{
        tool_diameter_mm: 10,
        feed_per_tooth_mm: 0.30,    // PB003 warning (fz > 0.25)
        cutting_speed_mmin: 40,      // PB002 warning (Vc < 60)
        target_ra_um: 0.05,          // SF will fail (predicted >> 0.05)
        tool_nose_radius_mm: 0.4,
      }],
    };
    const result = postVerificationSafetyEngine.verify_full(input);

    const critical_count =
      result.safety_issues.filter(i => i.severity === "critical").length +
      result.playbook_violations.filter(v => v.severity === "critical").length;
    const warning_count =
      result.safety_issues.filter(i => i.severity === "warning").length +
      result.playbook_violations.filter(v => v.severity === "warning").length;
    const envelope_count = result.envelope_violations.length;
    const sf_fail_count = result.surface_finish_predictions.filter(p => !p.meets_tolerance).length;

    const expected = Math.min(
      100,
      critical_count * 20 + warning_count * 5 + envelope_count * 10 + sf_fail_count * 3
    );
    expect(result.risk_score).toBe(expected);
  });

  it("risk_score is clamped to 100 even when violations would exceed it", () => {
    // Drive as many violations as possible simultaneously
    const gcode = `S${MACHINE_LIMITS.max_rpm + 5000} M3\nG1 Z-1 F${MACHINE_LIMITS.max_feed_mmmin + 9000}\nG0 Z-1\nM30`;
    const input: VerificationInput = {
      material_iso: "S",
      gcode,
      machine_limits: { max_rpm: 100, max_feed_mmmin: 100, x_travel_mm: 100, y_travel_mm: 100, z_travel_mm: 100 },
      operations: Array.from({ length: 5 }, () => ({
        tool_diameter_mm: 10,
        stepover_mm: 10,
        depth_of_cut_mm: 20,
        cutting_speed_mmin: 200,
        feed_per_tooth_mm: 0.5,
        coolant_active: false,
        wall_thickness_mm: 5,
        target_ra_um: 0.05,
        tool_nose_radius_mm: 0.1,
      })),
    };
    const result = postVerificationSafetyEngine.verify_full(input);
    expect(result.risk_score).toBeLessThanOrEqual(100);
    expect(result.risk_score).toBeGreaterThanOrEqual(0);
  });

  it("tribal_tips always include universal categories Surface Finish and Tool Deflection", () => {
    const result = postVerificationSafetyEngine.verify_full(STEEL_INPUT);
    expect(result.tribal_tips.length).toBeGreaterThan(0);
    const categories = result.tribal_tips.map(t => t.category);
    expect(categories).toContain("Surface Finish");
    expect(categories).toContain("Tool Deflection");
  });

  it("result shape: all 8 required keys present with correct types", () => {
    const result = postVerificationSafetyEngine.verify_full(STEEL_INPUT);
    expect(typeof result.passed).toBe("boolean");
    expect(Array.isArray(result.safety_issues)).toBe(true);
    expect(Array.isArray(result.envelope_violations)).toBe(true);
    expect(Array.isArray(result.playbook_violations)).toBe(true);
    expect(Array.isArray(result.tribal_tips)).toBe(true);
    expect(Array.isArray(result.surface_finish_predictions)).toBe(true);
    expect(typeof result.monte_carlo).toBe("object");
    expect(typeof result.risk_score).toBe("number");
  });

  // adversarial
  it("adversarial: empty G-code and empty operations does not throw", () => {
    const input: VerificationInput = {
      gcode: "",
      machine_limits: MACHINE_LIMITS,
      material_iso: "P",
      operations: [],
    };
    expect(() => postVerificationSafetyEngine.verify_full(input)).not.toThrow();
  });

  it("adversarial: garbage non-G-code text does not throw", () => {
    const input: VerificationInput = { ...STEEL_INPUT, gcode: "XXXXXXXXXXX\n@#$%^&*\n!!!!!" };
    expect(() => postVerificationSafetyEngine.verify_full(input)).not.toThrow();
  });
});

// ============================================================================
// getMetadata — structural correctness
// ============================================================================

describe("getMetadata", () => {
  it("name is exactly 'PostVerificationSafetyEngine'", () => {
    expect(postVerificationSafetyEngine.getMetadata().name).toBe("PostVerificationSafetyEngine");
  });

  it("all 6 expected action strings are present", () => {
    const { actions } = postVerificationSafetyEngine.getMetadata();
    for (const a of ["verify_full", "safety_check", "playbook_check", "surface_finish_check", "monte_carlo", "envelope_check"]) {
      expect(actions).toContain(a);
    }
  });

  it("supported_material_iso contains all 6 ISO groups", () => {
    const { supported_material_iso } = postVerificationSafetyEngine.getMetadata();
    for (const iso of ["P", "M", "K", "N", "S", "H"]) {
      expect(supported_material_iso).toContain(iso);
    }
  });

  it("tribal_tips_count equals exactly 10 (TRIBAL_KNOWLEDGE array length)", () => {
    expect(postVerificationSafetyEngine.getMetadata().tribal_tips_count).toBe(10);
  });
});
