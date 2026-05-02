/**
 * Fusion360SafetyHooksEngine.test.ts
 *
 * Coverage:
 *   - happy path: empty context → 15 untriggered findings, verdict PASS
 *   - each of 15 rules fires under the right context
 *   - severity → verdict mapping (any critical = BLOCK; any warning = WARN; else PASS)
 *   - validateAll batch path with mixed PASS/WARN/BLOCK ops
 *   - schema rejection on bad inputs
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360SafetyHooksEngine,
  SafetyValidationResultSchema,
  OperationContextSchema,
  SafetySeveritySchema,
  type OperationContext,
  type SafetyFinding,
} from "../engines/Fusion360SafetyHooksEngine.js";

function findRule(findings: SafetyFinding[], rule_id: string): SafetyFinding {
  const f = findings.find(x => x.rule_id === rule_id);
  if (f === undefined) throw new Error(`finding for rule ${rule_id} missing`);
  return f;
}

// ── 1. Happy path ──────────────────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — happy path", () => {
  it("empty context produces 15 untriggered findings, verdict PASS", () => {
    const r = Fusion360SafetyHooksEngine.validate({});
    expect(r.rules_evaluated).toBe(15);
    expect(r.triggered_count).toBe(0);
    expect(r.critical_count).toBe(0);
    expect(r.warning_count).toBe(0);
    expect(r.info_count).toBe(0);
    expect(r.verdict).toBe("PASS");
    for (const f of r.findings) {
      expect(f.triggered).toBe(false);
      expect(f.message).toBe("");
    }
  });

  it("getRules returns exactly 15 rule descriptions", () => {
    const rules = Fusion360SafetyHooksEngine.getRules();
    expect(rules.length).toBe(15);
    const ids = new Set(rules.map(r => r.rule_id));
    expect(ids.size).toBe(15);
  });

  it("RULES exposes the same 15 rules statically", () => {
    expect(Fusion360SafetyHooksEngine.RULES.length).toBe(15);
  });

  it("validation result parses cleanly through schema", () => {
    const r = Fusion360SafetyHooksEngine.validate({});
    expect(() => SafetyValidationResultSchema.parse(r)).not.toThrow();
  });
});

// ── 2. Per-rule trigger conditions ─────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — per-rule triggers", () => {
  it("adaptive_engagement fires when adaptive cycle has ae > 50%", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_adaptive: true, ae_pct: 75 });
    expect(findRule(r.findings, "adaptive_engagement").triggered).toBe(true);
  });

  it("mfg_ext_license_required fires when license=false but cycle requires it", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      cycle_code: "PROBE:WCS", cycle_requires_mfg_ext: true, has_mfg_ext_license: false,
    });
    const f = findRule(r.findings, "mfg_ext_license_required");
    expect(f.triggered).toBe(true);
    expect(f.severity).toBe("critical");
    expect(r.verdict).toBe("BLOCK");
  });

  it("helical_entry_pocket fires on closed pocket without helical entry", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_pocket: true, has_helical_entry: false });
    const f = findRule(r.findings, "helical_entry_pocket");
    expect(f.triggered).toBe(true);
    expect(f.severity).toBe("critical");
  });

  it("lead_in_arc_finishing fires on finishing contour without lead-in arc", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_finishing_contour: true, has_lead_in_arc: false });
    expect(findRule(r.findings, "lead_in_arc_finishing").triggered).toBe(true);
  });

  it("tcp_kinematic_match fires on 5-axis cycle without kinematic file", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_5axis: true, has_kinematic_file: false });
    expect(findRule(r.findings, "tcp_kinematic_match").severity).toBe("critical");
    expect(findRule(r.findings, "tcp_kinematic_match").triggered).toBe(true);
  });

  it("high_feed_axial_engagement fires when ap > 5% × tool_dia for high-feed cutter", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      is_high_feed_tool: true, tool_diameter_mm: 25, ap_mm: 3,
    });
    expect(findRule(r.findings, "high_feed_axial_engagement").triggered).toBe(true);
  });

  it("tool_stickout_vs_depth fires when stickout < feature_depth + 5mm", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      tool_stickout_mm: 30, feature_depth_mm: 40,
    });
    const f = findRule(r.findings, "tool_stickout_vs_depth");
    expect(f.triggered).toBe(true);
    expect(f.severity).toBe("critical");
  });

  it("coolant_through_spindle fires on deep drilling without through-spindle coolant", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      is_drilling: true, hole_depth_mm: 60, drill_diameter_mm: 8,
      has_through_spindle_coolant: false,
    });
    expect(findRule(r.findings, "coolant_through_spindle").triggered).toBe(true);
  });

  it("rigid_tap_rpm_limit fires when RPM exceeds controller cap", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      is_rigid_tap: true, rpm: 3000, controller_max_rigid_tap_rpm: 1000,
    });
    expect(findRule(r.findings, "rigid_tap_rpm_limit").severity).toBe("critical");
    expect(findRule(r.findings, "rigid_tap_rpm_limit").triggered).toBe(true);
  });

  it("probing_clearance fires when probing retract < 5mm", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_probing: true, retract_height_mm: 2 });
    expect(findRule(r.findings, "probing_clearance").triggered).toBe(true);
  });

  it("swarf_tilt_angle fires when swarf tilt exceeds machine envelope", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      is_swarf: true, swarf_tilt_deg: 75, machine_max_tilt_deg: 45,
    });
    const f = findRule(r.findings, "swarf_tilt_angle");
    expect(f.triggered).toBe(true);
    expect(f.severity).toBe("critical");
  });

  it("ramp_angle_pocket fires when pocket ramp > 5°", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_pocket: true, ramp_angle_deg: 8 });
    expect(findRule(r.findings, "ramp_angle_pocket").triggered).toBe(true);
  });

  it("retract_clears_clamps fires when retract < fixture + 5mm", () => {
    const r = Fusion360SafetyHooksEngine.validate({ retract_height_mm: 30, fixture_height_mm: 30 });
    expect(findRule(r.findings, "retract_clears_clamps").severity).toBe("critical");
    expect(findRule(r.findings, "retract_clears_clamps").triggered).toBe(true);
  });

  it("material_chip_load_match fires when fz outside ±50% of ISO baseline", () => {
    // ISO N (alu) baseline 0.15 mm/tooth; ±50% = [0.075, 0.225]. fz=0.30 is outside.
    const r = Fusion360SafetyHooksEngine.validate({ iso_group: "N", fz_mm: 0.30 });
    expect(findRule(r.findings, "material_chip_load_match").triggered).toBe(true);
  });

  it("material_chip_load_match does NOT fire when fz within ±50% baseline", () => {
    const r = Fusion360SafetyHooksEngine.validate({ iso_group: "N", fz_mm: 0.15 });
    expect(findRule(r.findings, "material_chip_load_match").triggered).toBe(false);
  });

  it("spindle_balance_rpm fires when RPM exceeds tool/holder balance rating", () => {
    const r = Fusion360SafetyHooksEngine.validate({ rpm: 25000, tool_max_rpm_balance: 18000 });
    expect(findRule(r.findings, "spindle_balance_rpm").triggered).toBe(true);
  });
});

// ── 3. Verdict mapping ────────────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — verdict mapping", () => {
  it("any critical trigger → BLOCK", () => {
    const r = Fusion360SafetyHooksEngine.validate({ is_pocket: true, has_helical_entry: false });
    expect(r.verdict).toBe("BLOCK");
    expect(r.critical_count).toBeGreaterThan(0);
  });

  it("warning without critical → WARN", () => {
    const r = Fusion360SafetyHooksEngine.validate({
      is_finishing_contour: true, has_lead_in_arc: false,
    });
    expect(r.verdict).toBe("WARN");
    expect(r.critical_count).toBe(0);
    expect(r.warning_count).toBe(1);
  });

  it("no triggers → PASS", () => {
    const r = Fusion360SafetyHooksEngine.validate({});
    expect(r.verdict).toBe("PASS");
    expect(r.triggered_count).toBe(0);
  });
});

// ── 4. Batch validation ───────────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — validateAll", () => {
  it("rolls up totals across operations", () => {
    const ops: OperationContext[] = [
      { operation_name: "clean", iso_group: "N", fz_mm: 0.15 },               // PASS
      { operation_name: "warn", is_finishing_contour: true, has_lead_in_arc: false }, // WARN
      { operation_name: "block", is_pocket: true, has_helical_entry: false }, // BLOCK
    ];
    const r = Fusion360SafetyHooksEngine.validateAll(ops);
    expect(r.operation_count).toBe(3);
    expect(r.results.length).toBe(3);
    expect(r.totals.critical).toBeGreaterThanOrEqual(1);
    expect(r.totals.warning).toBeGreaterThanOrEqual(1);
    expect(r.overall_verdict).toBe("BLOCK");
  });

  it("overall_verdict = PASS when all operations pass", () => {
    const r = Fusion360SafetyHooksEngine.validateAll([{}, {}]);
    expect(r.overall_verdict).toBe("PASS");
    expect(r.totals.critical).toBe(0);
    expect(r.totals.warning).toBe(0);
  });

  it("operation_index matches input order", () => {
    const r = Fusion360SafetyHooksEngine.validateAll([
      { operation_name: "first" },
      { operation_name: "second" },
      { operation_name: "third" },
    ]);
    expect(r.results[0].operation_index).toBe(0);
    expect(r.results[1].operation_index).toBe(1);
    expect(r.results[2].operation_index).toBe(2);
    expect(r.results[0].operation_name).toBe("first");
  });
});

// ── 5. Schema validation ──────────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — schema validation", () => {
  it("OperationContextSchema rejects negative tool_diameter_mm (adversarial)", () => {
    expect(() => OperationContextSchema.parse({ tool_diameter_mm: -1 })).toThrow();
  });

  it("OperationContextSchema rejects ae_pct > 100", () => {
    expect(() => OperationContextSchema.parse({ ae_pct: 150 })).toThrow();
  });

  it("OperationContextSchema rejects negative rpm", () => {
    expect(() => OperationContextSchema.parse({ rpm: -1 })).toThrow();
  });

  it("SafetySeveritySchema rejects unknown severity", () => {
    const bad: unknown = "blocker";
    expect(() => SafetySeveritySchema.parse(bad)).toThrow();
  });
});

// ── 6. Audit invariant ────────────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — audit", () => {
  it("auditEngine succeeds — 15 rules + empty context produces 0 triggers", () => {
    const audit = Fusion360SafetyHooksEngine.auditEngine();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });
});

// ── 7. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360SafetyHooksEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes safety hooks actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_safety_validate");
    expect(mod.ACTIONS).toContain("cam_fusion360_safety_validate_all");
    expect(mod.ACTIONS).toContain("cam_fusion360_safety_rules");
    expect(mod.ACTIONS).toContain("cam_fusion360_safety_audit");
  });

  it("engine reachable via the dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/Fusion360SafetyHooksEngine.js");
    expect(mod.Fusion360SafetyHooksEngine.RULES.length).toBe(15);
    const r = mod.Fusion360SafetyHooksEngine.validate({});
    expect(r.verdict).toBe("PASS");
  });
});
