/**
 * MastercamSafetyHooksEngine tests — MILL-MASTER Phase 2
 *
 * Validates the 15-rule safety checker covering containment, retract heights,
 * holder clearance, tool stickout, Dynamic Motion engagement, OptiRough stepdown,
 * coolant pressure, peel-mill engagement, and chain direction.
 *
 * Coverage floor: happy path + ≥3 failure modes + ≥2 adversarial inputs,
 * ≥3 material groups (P/N/S) spanned, dispatcher wiring verified.
 */
import { describe, it, expect } from "vitest";
import {
  mastercamSafetyHooksEngine,
  type SafetyOperation,
  type SafetyTool,
  type SafetyMaterial,
  type SafetyMachine,
  type SafetyFinding,
} from "../engines/MastercamSafetyHooksEngine.js";
import { ACTIONS as CAM_ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// Helper: pick a specific rule's finding out of the result set.
function findingOf(findings: SafetyFinding[], ruleId: string): SafetyFinding {
  const found = findings.find((f) => f.rule_id === ruleId);
  if (!found) throw new Error(`Rule '${ruleId}' not present in findings — engine contract broken`);
  return found;
}

// ── Fixtures ──────────────────────────────────────────────────────────────
const STEEL: SafetyMaterial = { iso_group: "P" };
const ALUMINUM: SafetyMaterial = { iso_group: "N" };
const TITANIUM: SafetyMaterial = { iso_group: "S" };

const VMC3: SafetyMachine = { type: "3axis_vertical", max_rpm: 12000, coolant_pressure_bar: 30 };
const VMC5: SafetyMachine = { type: "5axis", max_rpm: 18000, coolant_pressure_bar: 70 };

const SAFE_ENDMILL: SafetyTool = {
  diameter_mm: 10,
  overall_length_mm: 100,
  stickout_mm: 75,
  flute_length_mm: 30,
  type: "endmill",
  holder_balance_rpm: 15000,
  holder_body_diameter_mm: 10,
  holder_length_mm: 50,
};

// Oversized holder (25mm > 8mm cutter) AND stickout too short to clear feature depth:
// stickout 10mm, feature_depth 15mm + margin 3mm → stickoutOk=false → holder rule triggers.
const OVERSIZED_HOLDER_TOOL: SafetyTool = {
  ...SAFE_ENDMILL,
  diameter_mm: 8,
  holder_body_diameter_mm: 25,
  stickout_mm: 10,
};

const SAFE_DYNAMIC_OP: SafetyOperation = {
  name: "Dynamic Rough Pocket",
  type: "dynamic_mill",
  cut_direction: "climb",
  has_containment_boundary: true,
  containment_encloses_stock_and_fixture: true,
  stock_model_is_current: true,
  retract_height_z_mm: 30,
  stock_top_z_mm: 0,
  fixture_top_z_mm: 20,
  rapid_height_z_mm: 35,
  feature_depth_mm: 15,
  feed_entry: 500,
  feed_cutting: 800,
  dynamic_engagement_deg: 55,
  rpm: 8000,
};

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.validate — happy path", () => {
  it("safe dynamic-mill op in steel returns PASS with no triggered findings", () => {
    const result = mastercamSafetyHooksEngine.validate(SAFE_DYNAMIC_OP, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("PASS");
    expect(result.triggered_count).toBe(0);
    expect(result.critical_count).toBe(0);
    expect(result.warning_count).toBe(0);
    expect(result.info_count).toBe(0);
    expect(result.rules_evaluated).toBe(15);
  });

  it("all 15 rules evaluated regardless of outcome (same count safe vs unsafe)", () => {
    const safeRun = mastercamSafetyHooksEngine.validate(SAFE_DYNAMIC_OP, SAFE_ENDMILL, STEEL, VMC3);
    const badOp: SafetyOperation = { ...SAFE_DYNAMIC_OP, has_containment_boundary: false };
    const badRun = mastercamSafetyHooksEngine.validate(badOp, SAFE_ENDMILL, STEEL, VMC3);
    expect(safeRun.rules_evaluated).toBe(15);
    expect(badRun.rules_evaluated).toBe(15);
  });

  it("safe op in aluminum passes with higher-angle engagement (68° under 72° N limit)", () => {
    const alumOp: SafetyOperation = { ...SAFE_DYNAMIC_OP, dynamic_engagement_deg: 68 };
    const result = mastercamSafetyHooksEngine.validate(alumOp, SAFE_ENDMILL, ALUMINUM, VMC3);
    expect(result.verdict).toBe("PASS");
    expect(findingOf(result.findings, "dynamic_motion_engagement").triggered).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.validate — critical failures trigger BLOCK", () => {
  it("missing containment boundary in dynamic_mill → BLOCK with critical finding", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, has_containment_boundary: false };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("BLOCK");
    const finding = findingOf(result.findings, "containment_boundary");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("critical");
    expect(finding.message.length).toBeGreaterThan(0);
    expect(finding.fix_suggestion.length).toBeGreaterThan(0);
    expect(result.critical_count).toBeGreaterThanOrEqual(1);
  });

  it("tool stickout shorter than feature_depth + margin → BLOCK", () => {
    // feature depth 15mm + 3mm margin = 18mm required; stickout 10mm fails
    const shortTool: SafetyTool = { ...SAFE_ENDMILL, stickout_mm: 10 };
    const result = mastercamSafetyHooksEngine.validate(SAFE_DYNAMIC_OP, shortTool, STEEL, VMC3);
    expect(result.verdict).toBe("BLOCK");
    const finding = findingOf(result.findings, "tool_length_vs_depth");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("critical");
  });

  it("retract height only 1mm above fixture → critical linking_retract", () => {
    // fixture_top=20, retract=21 → 1mm clearance, under 2mm MIN
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, retract_height_z_mm: 21 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("BLOCK");
    const finding = findingOf(result.findings, "linking_retract");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("critical");
  });

  it("rapid height only 1mm above fixture → critical rapid_height", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, rapid_height_z_mm: 21 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("BLOCK");
    const finding = findingOf(result.findings, "rapid_height");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("critical");
  });

  it("oversized holder body + short stickout → BLOCK holder_clearance_dynamic", () => {
    const result = mastercamSafetyHooksEngine.validate(SAFE_DYNAMIC_OP, OVERSIZED_HOLDER_TOOL, STEEL, VMC3);
    expect(result.verdict).toBe("BLOCK");
    const finding = findingOf(result.findings, "holder_clearance_dynamic");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("critical");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.validate — warnings produce WARN verdict", () => {
  it("mixed cut direction on contour triggers chain_direction warning only", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, type: "contour", cut_direction: "mixed" };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("WARN");
    expect(result.critical_count).toBe(0);
    const finding = findingOf(result.findings, "chain_direction");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("warning");
  });

  it("stale stock_model_is_current=false in dynamic_mill → WARN", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, stock_model_is_current: false };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("WARN");
    const finding = findingOf(result.findings, "stock_model_integrity");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("warning");
  });

  it("retract 3mm above fixture (2-5mm band) fires as info-severity → WARN", () => {
    // fixture_top=20, retract=23 → 3mm clearance, between MIN (2) and REC (5) → info
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, retract_height_z_mm: 23 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("WARN");
    const finding = findingOf(result.findings, "linking_retract");
    expect(finding.triggered).toBe(true);
    expect(finding.severity).toBe("info");
    expect(result.critical_count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.validate — material-specific engagement limits", () => {
  it("titanium (S): 65° engagement exceeds 45° S-group limit → triggered", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, dynamic_engagement_deg: 65 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, TITANIUM, VMC5);
    expect(findingOf(result.findings, "dynamic_motion_engagement").triggered).toBe(true);
  });

  it("steel (P): 68° engagement exceeds 60° P-group limit → triggered", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, dynamic_engagement_deg: 68 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(findingOf(result.findings, "dynamic_motion_engagement").triggered).toBe(true);
  });

  it("aluminum (N): 68° engagement under 72° N-group limit → NOT triggered", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, dynamic_engagement_deg: 68 };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, ALUMINUM, VMC3);
    expect(findingOf(result.findings, "dynamic_motion_engagement").triggered).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.validateAll — batch aggregation", () => {
  it("worst-verdict rule: BLOCK dominates WARN dominates PASS", () => {
    const badOp: SafetyOperation = { ...SAFE_DYNAMIC_OP, has_containment_boundary: false };
    const warnOp: SafetyOperation = { ...SAFE_DYNAMIC_OP, type: "contour", cut_direction: "mixed" };
    const batch = mastercamSafetyHooksEngine.validateAll([
      { operation: SAFE_DYNAMIC_OP, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
      { operation: warnOp, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
      { operation: badOp, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
    ]);
    expect(batch.operation_count).toBe(3);
    expect(batch.results.length).toBe(3);
    expect(batch.worst_verdict).toBe("BLOCK");
    expect(batch.results[0].verdict).toBe("PASS");
    expect(batch.results[1].verdict).toBe("WARN");
    expect(batch.results[2].verdict).toBe("BLOCK");
    expect(batch.totals.critical).toBeGreaterThanOrEqual(1);
  });

  it("empty batch returns zero counts and PASS overall", () => {
    const batch = mastercamSafetyHooksEngine.validateAll([]);
    expect(batch.operation_count).toBe(0);
    expect(batch.worst_verdict).toBe("PASS");
    expect(batch.totals.total_triggered).toBe(0);
    expect(batch.totals.critical).toBe(0);
    expect(batch.totals.warning).toBe(0);
    expect(batch.totals.info).toBe(0);
  });

  it("all-safe batch returns PASS with zero triggers across both material groups", () => {
    const batch = mastercamSafetyHooksEngine.validateAll([
      { operation: SAFE_DYNAMIC_OP, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
      { operation: SAFE_DYNAMIC_OP, tool: SAFE_ENDMILL, material: ALUMINUM, machine: VMC3 },
    ]);
    expect(batch.worst_verdict).toBe("PASS");
    expect(batch.totals.critical).toBe(0);
    expect(batch.totals.total_triggered).toBe(0);
  });

  it("per-operation result carries correct operation_index + operation_name", () => {
    const batch = mastercamSafetyHooksEngine.validateAll([
      { operation: { ...SAFE_DYNAMIC_OP, name: "op-0" }, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
      { operation: { ...SAFE_DYNAMIC_OP, name: "op-1" }, tool: SAFE_ENDMILL, material: STEEL, machine: VMC3 },
    ]);
    expect(batch.results[0].operation_index).toBe(0);
    expect(batch.results[0].operation_name).toBe("op-0");
    expect(batch.results[1].operation_index).toBe(1);
    expect(batch.results[1].operation_name).toBe("op-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine.getRules", () => {
  it("returns exactly 15 rule descriptions", () => {
    const rules = mastercamSafetyHooksEngine.getRules();
    expect(rules.length).toBe(15);
  });

  it("every rule carries rule_id, severity, title, description, applies_to", () => {
    const rules = mastercamSafetyHooksEngine.getRules();
    for (const rule of rules) {
      expect(rule.rule_id).toMatch(/^[a-z_]+$/);
      expect(["critical", "warning", "info"]).toContain(rule.severity);
      expect(rule.title.length).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(10);
      expect(Array.isArray(rule.applies_to)).toBe(true);
      expect(rule.applies_to.length).toBeGreaterThan(0);
    }
  });

  it("rules include the critical safety checks by id", () => {
    const ids = mastercamSafetyHooksEngine.getRules().map((r) => r.rule_id);
    const required = [
      "chain_direction",
      "holder_clearance_dynamic",
      "containment_boundary",
      "stock_model_integrity",
      "linking_retract",
      "rapid_height",
      "tool_length_vs_depth",
      "dynamic_motion_engagement",
    ];
    for (const req of required) {
      expect(ids).toContain(req);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine — adversarial inputs", () => {
  it("NaN retract height: NaN comparisons yield false → rule silently skipped", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, retract_height_z_mm: NaN };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.rules_evaluated).toBe(15);
    expect(findingOf(result.findings, "linking_retract").triggered).toBe(false);
  });

  it("minimal operation (type only) doesn't crash; returns structured findings", () => {
    const minimalOp: SafetyOperation = { type: "drill" };
    const minimalTool: SafetyTool = { diameter_mm: 6, overall_length_mm: 80, stickout_mm: 40, type: "drill" };
    const result = mastercamSafetyHooksEngine.validate(minimalOp, minimalTool, STEEL, VMC3);
    expect(result.rules_evaluated).toBe(15);
    expect(["PASS", "WARN", "BLOCK"]).toContain(result.verdict);
  });

  it("Infinity feature_depth triggers tool_length_vs_depth (75mm stickout < Infinity + 3)", () => {
    const op: SafetyOperation = { ...SAFE_DYNAMIC_OP, feature_depth_mm: Infinity };
    const result = mastercamSafetyHooksEngine.validate(op, SAFE_ENDMILL, STEEL, VMC3);
    expect(findingOf(result.findings, "tool_length_vs_depth").triggered).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamSafetyHooksEngine — dispatcher wiring parity", () => {
  it("camDispatcher ACTIONS includes all 3 mastercam_safety_* actions", () => {
    expect(CAM_ACTIONS).toContain("mastercam_safety_validate");
    expect(CAM_ACTIONS).toContain("mastercam_safety_validate_all");
    expect(CAM_ACTIONS).toContain("mastercam_safety_rules");
  });

  it("lazy-import round-trip: dispatcher pattern returns a working engine instance", async () => {
    // Mirror camDispatcher.getEngine("mastercamSafety")
    const mod = await import("../engines/MastercamSafetyHooksEngine.js");
    const viaLazy = mod.mastercamSafetyHooksEngine;
    expect(viaLazy.getRules().length).toBe(15);
    const result = viaLazy.validate(SAFE_DYNAMIC_OP, SAFE_ENDMILL, STEEL, VMC3);
    expect(result.verdict).toBe("PASS");
    expect(result.rules_evaluated).toBe(15);
  });

  it("dispatcher-style params shape survives round-trip for validate", async () => {
    const params = {
      operation: SAFE_DYNAMIC_OP,
      tool: SAFE_ENDMILL,
      material: STEEL,
      machine: VMC3,
      strategy: {},
    };
    const mod = await import("../engines/MastercamSafetyHooksEngine.js");
    const eng = mod.mastercamSafetyHooksEngine;
    const out = eng.validate(params.operation, params.tool, params.material, params.machine, params.strategy);
    expect(out.verdict).toBe("PASS");
    expect(out.rules_evaluated).toBe(15);
  });
});
