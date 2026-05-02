/**
 * Fusion360SafetyHooksEngine — Fusion 360-Specific Safety Validations
 *
 * 15 safety rules covering the most common mistakes when programming
 * Fusion 360 toolpaths. Each rule produces a structured finding with
 * severity, trigger status, message, and a concrete fix suggestion.
 *
 * Sister engine: MastercamSafetyHooksEngine (same 15-rule shape, Fusion-
 * specific content). Both engines expose the same SafetyFinding /
 * SafetyValidationResult / BatchValidationResult types so the cross-CAM
 * safety dispatcher can call them uniformly.
 *
 * Rules:
 *   1.  adaptive_engagement          — Adaptive Clearing engagement angle vs tool/material
 *   2.  mfg_ext_license_required     — cycle requires Mfg Ext but not licensed
 *   3.  helical_entry_pocket         — closed pockets need helical or pre-drilled entry
 *   4.  lead_in_arc_finishing        — finishing contours need lead-in/lead-out arcs
 *   5.  tcp_kinematic_match          — 5-axis TCP cycle requires kinematic file installed
 *   6.  high_feed_axial_engagement   — high-feed cutters need shallow axial DOC
 *   7.  tool_stickout_vs_depth       — stickout exceeds feature depth + clearance
 *   8.  coolant_through_spindle      — drilling L/D > 5 requires through-spindle coolant
 *   9.  rigid_tap_rpm_limit          — rigid tap RPM bounded by controller capability
 *  10.  probing_clearance            — probing skip-cycle needs adequate clearance
 *  11.  swarf_tilt_angle             — swarf needs 5-axis tilt within machine envelope
 *  12.  ramp_angle_pocket            — pocket ramp angle within tool capability
 *  13.  retract_clears_clamps        — retract height clears stock + fixture + clamps
 *  14.  material_chip_load_match     — chip load within ISO group ±50% of baseline
 *  15.  spindle_balance_rpm          — RPM within tool/holder balance rating
 *
 * Methods:
 *   validate(operation):              SafetyValidationResult
 *   validateAll(operations[]):        BatchValidationResult
 *   getRules():                       SafetyRuleDescription[]
 *
 * @engine Fusion360SafetyHooksEngine
 * @dispatcher camDispatcher
 * @actions cam_fusion360_safety_validate, cam_fusion360_safety_validate_all,
 *          cam_fusion360_safety_rules, cam_fusion360_safety_audit
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-SAFETY-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SafetySeveritySchema = z.enum(["critical", "warning", "info"]);
export type SafetySeverity = z.infer<typeof SafetySeveritySchema>;

export const SafetyFindingSchema = z.object({
  rule_id: z.string().min(1),
  severity: SafetySeveritySchema,
  triggered: z.boolean(),
  message: z.string(),
  fix_suggestion: z.string(),
});
export type SafetyFinding = z.infer<typeof SafetyFindingSchema>;

export const SafetyVerdictSchema = z.enum(["PASS", "WARN", "BLOCK"]);
export type SafetyVerdict = z.infer<typeof SafetyVerdictSchema>;

export const SafetyValidationResultSchema = z.object({
  rules_evaluated: z.number().int().nonnegative(),
  triggered_count: z.number().int().nonnegative(),
  critical_count: z.number().int().nonnegative(),
  warning_count: z.number().int().nonnegative(),
  info_count: z.number().int().nonnegative(),
  verdict: SafetyVerdictSchema,
  findings: z.array(SafetyFindingSchema),
});
export type SafetyValidationResult = z.infer<typeof SafetyValidationResultSchema>;

export const ISOGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]);
export type ISOGroup = z.infer<typeof ISOGroupSchema>;

/**
 * Operation context for validation. Fields are individually optional so the
 * caller can validate partial data and still get useful findings on the
 * fields that ARE present (untriggered findings on missing fields).
 */
export const OperationContextSchema = z.object({
  operation_name: z.string().optional(),
  cycle_code: z.string().optional(),
  cycle_requires_mfg_ext: z.boolean().optional(),
  has_mfg_ext_license: z.boolean().optional(),
  is_adaptive: z.boolean().optional(),
  is_5axis: z.boolean().optional(),
  is_swarf: z.boolean().optional(),
  has_kinematic_file: z.boolean().optional(),
  is_pocket: z.boolean().optional(),
  is_finishing_contour: z.boolean().optional(),
  is_high_feed_tool: z.boolean().optional(),
  is_drilling: z.boolean().optional(),
  is_rigid_tap: z.boolean().optional(),
  is_probing: z.boolean().optional(),
  has_helical_entry: z.boolean().optional(),
  has_lead_in_arc: z.boolean().optional(),
  has_through_spindle_coolant: z.boolean().optional(),
  iso_group: ISOGroupSchema.optional(),
  tool_diameter_mm: z.number().positive().optional(),
  tool_stickout_mm: z.number().positive().optional(),
  tool_flutes: z.number().int().positive().optional(),
  tool_max_rpm_balance: z.number().positive().optional(),
  feature_depth_mm: z.number().nonnegative().optional(),
  hole_depth_mm: z.number().nonnegative().optional(),
  drill_diameter_mm: z.number().positive().optional(),
  rpm: z.number().nonnegative().optional(),
  feed_mmpm: z.number().nonnegative().optional(),
  fz_mm: z.number().nonnegative().optional(),
  ap_mm: z.number().nonnegative().optional(),
  ae_pct: z.number().min(0).max(100).optional(),
  retract_height_mm: z.number().optional(),
  fixture_height_mm: z.number().nonnegative().optional(),
  ramp_angle_deg: z.number().optional(),
  swarf_tilt_deg: z.number().optional(),
  machine_max_tilt_deg: z.number().optional(),
  controller_max_rigid_tap_rpm: z.number().positive().optional(),
});
export type OperationContext = z.infer<typeof OperationContextSchema>;

export const SafetyRuleDescriptionSchema = z.object({
  rule_id: z.string(),
  description: z.string(),
  severity: SafetySeveritySchema,
});
export type SafetyRuleDescription = z.infer<typeof SafetyRuleDescriptionSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function nominal(rule_id: string, severity: SafetySeverity): SafetyFinding {
  return { rule_id, severity, triggered: false, message: "", fix_suggestion: "" };
}

function trigger(rule_id: string, severity: SafetySeverity, message: string, fix: string): SafetyFinding {
  return { rule_id, severity, triggered: true, message, fix_suggestion: fix };
}

// ── ISO group baseline chip loads (mm/tooth, finishing) ─────────────────────

const FZ_BASELINE_FINISHING_MM: Readonly<Record<ISOGroup, number>> = Object.freeze({
  P: 0.10,
  M: 0.08,
  K: 0.12,
  N: 0.15,
  S: 0.05,
  H: 0.04,
});

const FZ_TOLERANCE_PCT = 50;

// ── Rules ────────────────────────────────────────────────────────────────────

const RULES: SafetyRuleDescription[] = [
  { rule_id: "adaptive_engagement",       description: "Adaptive Clearing engagement angle within tool/material limit", severity: "warning"  },
  { rule_id: "mfg_ext_license_required",  description: "Cycle requires Mfg Extension license",                           severity: "critical" },
  { rule_id: "helical_entry_pocket",      description: "Closed pocket requires helical or pre-drilled entry",            severity: "critical" },
  { rule_id: "lead_in_arc_finishing",     description: "Finishing contour needs lead-in/lead-out arcs",                  severity: "warning"  },
  { rule_id: "tcp_kinematic_match",       description: "5-axis TCP cycle requires kinematic file installed on machine",  severity: "critical" },
  { rule_id: "high_feed_axial_engagement",description: "High-feed cutter needs shallow axial DOC (≤ 0.05 × dia)",        severity: "warning"  },
  { rule_id: "tool_stickout_vs_depth",    description: "Tool stickout must exceed feature depth + clearance",            severity: "critical" },
  { rule_id: "coolant_through_spindle",   description: "Deep drilling (L/D > 5) requires through-spindle coolant",       severity: "warning"  },
  { rule_id: "rigid_tap_rpm_limit",       description: "Rigid tap RPM bounded by controller capability",                 severity: "critical" },
  { rule_id: "probing_clearance",         description: "Probing skip-cycle needs adequate retract clearance",            severity: "warning"  },
  { rule_id: "swarf_tilt_angle",          description: "Swarf cut needs 5-axis tilt within machine envelope",            severity: "critical" },
  { rule_id: "ramp_angle_pocket",         description: "Pocket ramp angle within tool capability (≤ 5° general)",        severity: "warning"  },
  { rule_id: "retract_clears_clamps",     description: "Retract height clears stock + fixture + clamps",                 severity: "critical" },
  { rule_id: "material_chip_load_match",  description: "Chip load (fz) within ISO group baseline ±50%",                  severity: "warning"  },
  { rule_id: "spindle_balance_rpm",       description: "RPM within tool/holder balance rating",                          severity: "warning"  },
];

const RULE_INDEX = new Map<string, SafetyRuleDescription>();
for (const r of RULES) RULE_INDEX.set(r.rule_id, r);

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360SafetyHooksEngine {
  static readonly RULES: readonly SafetyRuleDescription[] = Object.freeze([...RULES]);

  static getRules(): SafetyRuleDescription[] {
    return [...RULES];
  }

  static validate(context: OperationContext): SafetyValidationResult {
    const ctx = OperationContextSchema.parse(context);
    const findings: SafetyFinding[] = [];

    // 1. adaptive_engagement
    if (ctx.is_adaptive === true && ctx.ae_pct !== undefined && ctx.ae_pct > 50) {
      findings.push(trigger("adaptive_engagement", "warning",
        `Adaptive Clearing with ae=${ctx.ae_pct}% exceeds typical 35-50% engagement window`,
        "Lower radial step-over to 35-45% of tool diameter for adaptive clearing chip control"));
    } else {
      findings.push(nominal("adaptive_engagement", "warning"));
    }

    // 2. mfg_ext_license_required
    if (ctx.cycle_requires_mfg_ext === true && ctx.has_mfg_ext_license === false) {
      findings.push(trigger("mfg_ext_license_required", "critical",
        `Cycle "${ctx.cycle_code ?? "?"}" requires Manufacturing Extension license`,
        "Either subscribe to Manufacturing Extension or pick a base-license cycle (3-axis equivalent)"));
    } else {
      findings.push(nominal("mfg_ext_license_required", "critical"));
    }

    // 3. helical_entry_pocket
    if (ctx.is_pocket === true && ctx.has_helical_entry === false) {
      findings.push(trigger("helical_entry_pocket", "critical",
        "Closed pocket without helical entry — risks plunge into solid material",
        "Set entry to Helical (recommended) or Predrill at the entry point"));
    } else {
      findings.push(nominal("helical_entry_pocket", "critical"));
    }

    // 4. lead_in_arc_finishing
    if (ctx.is_finishing_contour === true && ctx.has_lead_in_arc === false) {
      findings.push(trigger("lead_in_arc_finishing", "warning",
        "Finishing contour without lead-in/lead-out arcs — leaves witness marks at entry/exit",
        "Add lead-in arc (radius ≈ 0.5 × tool dia) and matching lead-out under Linking → Lead-In/Out"));
    } else {
      findings.push(nominal("lead_in_arc_finishing", "warning"));
    }

    // 5. tcp_kinematic_match
    if (ctx.is_5axis === true && ctx.has_kinematic_file === false) {
      findings.push(trigger("tcp_kinematic_match", "critical",
        "5-axis cycle requires machine kinematic file installed on the controller",
        "Install the .kinematics file (Heidenhain) or correct G68.2/G43.4 vector file (FANUC) on the machine"));
    } else {
      findings.push(nominal("tcp_kinematic_match", "critical"));
    }

    // 6. high_feed_axial_engagement
    if (ctx.is_high_feed_tool === true && ctx.tool_diameter_mm !== undefined && ctx.ap_mm !== undefined) {
      const limit = ctx.tool_diameter_mm * 0.05;
      if (ctx.ap_mm > limit) {
        findings.push(trigger("high_feed_axial_engagement", "warning",
          `High-feed cutter ap=${ctx.ap_mm}mm exceeds ${limit.toFixed(2)}mm limit (5% of tool dia)`,
          "Reduce axial DOC to ≤ 5% of tool diameter for high-feed cutters"));
      } else {
        findings.push(nominal("high_feed_axial_engagement", "warning"));
      }
    } else {
      findings.push(nominal("high_feed_axial_engagement", "warning"));
    }

    // 7. tool_stickout_vs_depth
    if (ctx.tool_stickout_mm !== undefined && ctx.feature_depth_mm !== undefined) {
      const required = ctx.feature_depth_mm + 5;
      if (ctx.tool_stickout_mm < required) {
        findings.push(trigger("tool_stickout_vs_depth", "critical",
          `Stickout ${ctx.tool_stickout_mm}mm < required ${required}mm (depth + 5mm clearance)`,
          "Increase tool projection from holder or use a longer-reach tool"));
      } else {
        findings.push(nominal("tool_stickout_vs_depth", "critical"));
      }
    } else {
      findings.push(nominal("tool_stickout_vs_depth", "critical"));
    }

    // 8. coolant_through_spindle
    if (ctx.is_drilling === true && ctx.hole_depth_mm !== undefined && ctx.drill_diameter_mm !== undefined) {
      const ld = ctx.hole_depth_mm / ctx.drill_diameter_mm;
      if (ld > 5 && ctx.has_through_spindle_coolant === false) {
        findings.push(trigger("coolant_through_spindle", "warning",
          `Drilling L/D=${ld.toFixed(1)} without through-spindle coolant — chip evacuation risk`,
          "Enable through-spindle coolant or switch to peck cycle with extended retract"));
      } else {
        findings.push(nominal("coolant_through_spindle", "warning"));
      }
    } else {
      findings.push(nominal("coolant_through_spindle", "warning"));
    }

    // 9. rigid_tap_rpm_limit
    if (ctx.is_rigid_tap === true && ctx.rpm !== undefined && ctx.controller_max_rigid_tap_rpm !== undefined) {
      if (ctx.rpm > ctx.controller_max_rigid_tap_rpm) {
        findings.push(trigger("rigid_tap_rpm_limit", "critical",
          `Rigid tap RPM ${ctx.rpm} exceeds controller limit ${ctx.controller_max_rigid_tap_rpm}`,
          "Lower spindle speed or switch to floating-tap holder"));
      } else {
        findings.push(nominal("rigid_tap_rpm_limit", "critical"));
      }
    } else {
      findings.push(nominal("rigid_tap_rpm_limit", "critical"));
    }

    // 10. probing_clearance
    if (ctx.is_probing === true && ctx.retract_height_mm !== undefined && ctx.retract_height_mm < 5) {
      findings.push(trigger("probing_clearance", "warning",
        `Probing retract ${ctx.retract_height_mm}mm < 5mm minimum — risk of probe collision on rapid`,
        "Set probing retract height to ≥ 5mm (or 10mm for stylus extensions)"));
    } else {
      findings.push(nominal("probing_clearance", "warning"));
    }

    // 11. swarf_tilt_angle
    if (ctx.is_swarf === true && ctx.swarf_tilt_deg !== undefined && ctx.machine_max_tilt_deg !== undefined) {
      if (Math.abs(ctx.swarf_tilt_deg) > ctx.machine_max_tilt_deg) {
        findings.push(trigger("swarf_tilt_angle", "critical",
          `Swarf tilt ${ctx.swarf_tilt_deg}° exceeds machine envelope ${ctx.machine_max_tilt_deg}°`,
          "Reduce part tilt or pick a 3+2 indexed strategy that respects the envelope"));
      } else {
        findings.push(nominal("swarf_tilt_angle", "critical"));
      }
    } else {
      findings.push(nominal("swarf_tilt_angle", "critical"));
    }

    // 12. ramp_angle_pocket
    if (ctx.is_pocket === true && ctx.ramp_angle_deg !== undefined && ctx.ramp_angle_deg > 5) {
      findings.push(trigger("ramp_angle_pocket", "warning",
        `Pocket ramp angle ${ctx.ramp_angle_deg}° > 5° general limit — risk of tool deflection`,
        "Lower ramp angle to ≤ 3° for steel, ≤ 5° for aluminum, or use helical entry"));
    } else {
      findings.push(nominal("ramp_angle_pocket", "warning"));
    }

    // 13. retract_clears_clamps
    if (ctx.retract_height_mm !== undefined && ctx.fixture_height_mm !== undefined) {
      const required = ctx.fixture_height_mm + 5;
      if (ctx.retract_height_mm < required) {
        findings.push(trigger("retract_clears_clamps", "critical",
          `Retract ${ctx.retract_height_mm}mm < fixture ${ctx.fixture_height_mm}mm + 5mm clearance`,
          "Raise rapid retract above fixture top + 5mm minimum (10mm preferred for clamps)"));
      } else {
        findings.push(nominal("retract_clears_clamps", "critical"));
      }
    } else {
      findings.push(nominal("retract_clears_clamps", "critical"));
    }

    // 14. material_chip_load_match
    if (ctx.iso_group !== undefined && ctx.fz_mm !== undefined) {
      const baseline = FZ_BASELINE_FINISHING_MM[ctx.iso_group];
      const lo = baseline * (1 - FZ_TOLERANCE_PCT / 100);
      const hi = baseline * (1 + FZ_TOLERANCE_PCT / 100);
      if (ctx.fz_mm < lo || ctx.fz_mm > hi) {
        findings.push(trigger("material_chip_load_match", "warning",
          `fz=${ctx.fz_mm}mm outside ISO ${ctx.iso_group} baseline ${baseline}mm ±${FZ_TOLERANCE_PCT}%`,
          `Adjust feed to land fz between ${lo.toFixed(3)} and ${hi.toFixed(3)} mm/tooth`));
      } else {
        findings.push(nominal("material_chip_load_match", "warning"));
      }
    } else {
      findings.push(nominal("material_chip_load_match", "warning"));
    }

    // 15. spindle_balance_rpm
    if (ctx.rpm !== undefined && ctx.tool_max_rpm_balance !== undefined && ctx.rpm > ctx.tool_max_rpm_balance) {
      findings.push(trigger("spindle_balance_rpm", "warning",
        `RPM ${ctx.rpm} exceeds tool/holder balance rating ${ctx.tool_max_rpm_balance}`,
        "Use a balanced tool holder rated for the target RPM, or reduce spindle speed"));
    } else {
      findings.push(nominal("spindle_balance_rpm", "warning"));
    }

    // Roll-up
    let critical = 0, warning = 0, info = 0, triggered = 0;
    for (const f of findings) {
      if (f.triggered) {
        triggered += 1;
        if (f.severity === "critical") critical += 1;
        else if (f.severity === "warning") warning += 1;
        else info += 1;
      }
    }
    const verdict: SafetyVerdict = critical > 0 ? "BLOCK" : warning > 0 ? "WARN" : "PASS";

    return SafetyValidationResultSchema.parse({
      rules_evaluated: findings.length,
      triggered_count: triggered,
      critical_count: critical,
      warning_count: warning,
      info_count: info,
      verdict,
      findings,
    });
  }

  static validateAll(operations: OperationContext[]): {
    operation_count: number;
    results: Array<{ operation_index: number; operation_name?: string } & SafetyValidationResult>;
    totals: { total_triggered: number; critical: number; warning: number; info: number };
    overall_verdict: SafetyVerdict;
  } {
    const results = operations.map((op, i) => ({
      operation_index: i,
      operation_name: op.operation_name,
      ...Fusion360SafetyHooksEngine.validate(op),
    }));
    let critical = 0, warning = 0, info = 0, total = 0;
    for (const r of results) {
      total += r.triggered_count;
      critical += r.critical_count;
      warning += r.warning_count;
      info += r.info_count;
    }
    const overall_verdict: SafetyVerdict = critical > 0 ? "BLOCK" : warning > 0 ? "WARN" : "PASS";
    return {
      operation_count: operations.length,
      results,
      totals: { total_triggered: total, critical, warning, info },
      overall_verdict,
    };
  }

  static auditEngine(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (RULES.length !== 15) errors.push(`expected 15 rules, got ${RULES.length}`);
    const ids = new Set<string>();
    for (const r of RULES) {
      if (ids.has(r.rule_id)) errors.push(`duplicate rule id "${r.rule_id}"`);
      ids.add(r.rule_id);
    }
    // Empty context should produce 15 findings, all untriggered.
    const empty = Fusion360SafetyHooksEngine.validate({});
    if (empty.rules_evaluated !== 15) errors.push(`empty context did not evaluate 15 rules`);
    if (empty.triggered_count !== 0) errors.push(`empty context triggered ${empty.triggered_count} findings (expected 0)`);
    if (empty.verdict !== "PASS") errors.push(`empty context verdict was ${empty.verdict} (expected PASS)`);
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360SafetyHooksEngine = Fusion360SafetyHooksEngine;
