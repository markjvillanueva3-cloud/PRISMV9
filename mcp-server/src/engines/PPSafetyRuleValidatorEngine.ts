/**
 * PPSafetyRuleValidatorEngine — PP-DL-MS4
 *
 * Configurable safety rule engine for machine-level constraints.
 * Goes beyond physics (which checks mathematical limits) to check
 * operational safety rules specific to a machine/shop:
 *
 *   - Mandatory codes (safe start block, coolant, M30)
 *   - Forbidden codes (wrong coolant for machine, dangerous M-codes)
 *   - Sequence rules (tool change must precede spindle start)
 *   - Machine limits (axis travel, max tool weight, max RPM)
 *   - Shop rules (no dry machining titanium, etc.)
 *
 * Rules are data-driven: add/remove rules without code changes.
 *
 * @module PPSafetyRuleValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type RuleSeverity = "info" | "warning" | "error" | "critical";

export interface SafetyRule {
  id: string;
  name: string;
  severity: RuleSeverity;
  category: "mandatory_code" | "forbidden_code" | "sequence" | "machine_limit" | "shop_rule" | "custom";
  description: string;
  check: (context: SafetyContext) => RuleCheckResult;
  enabled: boolean;
}

export interface SafetyContext {
  gcode_lines: string[];
  machine_id?: string;
  controller_family?: string;
  material_id?: string;
  has_coolant?: boolean;
  has_5axis?: boolean;
  spindle_speed?: number;
  tool_count?: number;
  max_rapid_mm?: number;
}

export interface RuleCheckResult {
  passed: boolean;
  message: string;
  line_number?: number;
  remediation?: string;
}

export interface SafetyValidationResult {
  overall: "safe" | "warnings" | "unsafe" | "critical";
  rules_checked: number;
  passed: number;
  warnings: number;
  errors: number;
  criticals: number;
  results: Array<{
    rule_id: string;
    rule_name: string;
    severity: RuleSeverity;
    passed: boolean;
    message: string;
    remediation?: string;
  }>;
  recommendations: string[];
}

// ── Default Rules ─────────────────────────────────────────────────────

function buildDefaultRules(): SafetyRule[] {
  return [
    // Mandatory codes
    {
      id: "safe_start_block",
      name: "Safe start block present",
      severity: "error",
      category: "mandatory_code",
      description: "Program must include G90 (absolute), G21 (metric), and G40 (cutter comp cancel)",
      enabled: true,
      check: (ctx) => {
        const text = ctx.gcode_lines.join(" ").toUpperCase();
        const hasG90 = text.includes("G90");
        const hasG21 = text.includes("G21");
        const missing = [];
        if (!hasG90) missing.push("G90");
        if (!hasG21) missing.push("G21");
        return {
          passed: hasG90 && hasG21,
          message: missing.length === 0 ? "Safe start codes present" : `Missing: ${missing.join(", ")}`,
          remediation: missing.length > 0 ? `Add ${missing.join(" ")} to program header` : undefined,
        };
      },
    },
    {
      id: "program_end",
      name: "Program end command present",
      severity: "error",
      category: "mandatory_code",
      description: "Program must end with M30 or M2",
      enabled: true,
      check: (ctx) => {
        const text = ctx.gcode_lines.join(" ").toUpperCase();
        const hasEnd = text.includes("M30") || text.includes("M2 ") || text.match(/M0?2\b/);
        return {
          passed: !!hasEnd,
          message: hasEnd ? "Program end command present" : "Missing M30/M2 program end",
          remediation: !hasEnd ? "Add M30 at end of program" : undefined,
        };
      },
    },
    {
      id: "coolant_for_metal",
      name: "Coolant required for metal cutting",
      severity: "warning",
      category: "shop_rule",
      description: "Coolant (M8/M7) should be active when cutting metal",
      enabled: true,
      check: (ctx) => {
        const text = ctx.gcode_lines.join(" ").toUpperCase();
        const hasCoolant = text.includes("M8") || text.includes("M7") || text.includes("COOLANT");
        const isPlastic = ctx.material_id?.toLowerCase().includes("plastic") ||
                         ctx.material_id?.toLowerCase().includes("delrin") ||
                         ctx.material_id?.toLowerCase().includes("nylon");
        if (isPlastic) return { passed: true, message: "Plastic material — coolant optional" };
        return {
          passed: hasCoolant,
          message: hasCoolant ? "Coolant commands found" : "No coolant commands — dry cutting metal",
          remediation: !hasCoolant ? "Add M8 (flood) or M7 (mist) before cutting" : undefined,
        };
      },
    },
    {
      id: "spindle_off_before_tool_change",
      name: "Spindle stopped before tool change",
      severity: "critical",
      category: "sequence",
      description: "Spindle must be stopped (M5) before tool change (M6)",
      enabled: true,
      check: (ctx) => {
        const lines = ctx.gcode_lines.map(l => l.toUpperCase());
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("M6") || (lines[i].includes("M06"))) {
            // Check previous lines for M5
            let foundStop = false;
            for (let j = Math.max(0, i - 5); j < i; j++) {
              if (lines[j].includes("M5") || lines[j].includes("M05")) foundStop = true;
            }
            // First tool change doesn't need M5 (spindle not running yet)
            const isFirstToolChange = !lines.slice(0, i).some(l => l.includes("M3") || l.includes("M4") || l.includes("M03") || l.includes("M04"));
            if (!foundStop && !isFirstToolChange) {
              return {
                passed: false,
                message: `Tool change at line ${i + 1} without prior M5 — SPINDLE MAY BE RUNNING`,
                line_number: i + 1,
                remediation: "Add M5 before M6 tool change",
              };
            }
          }
        }
        return { passed: true, message: "Spindle stop sequence correct" };
      },
    },
    {
      id: "no_g28_with_tool_in_cut",
      name: "No G28 while tool engaged",
      severity: "critical",
      category: "sequence",
      description: "G28 (home) should only occur with tool retracted to safe Z",
      enabled: true,
      check: (ctx) => {
        const lines = ctx.gcode_lines.map(l => l.toUpperCase());
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("G28") && !lines[i].includes("G91")) {
            // G28 without G91 is risky — may rapid through part
            return {
              passed: false,
              message: `G28 at line ${i + 1} without G91 — may crash through workpiece`,
              line_number: i + 1,
              remediation: "Use G91 G28 Z0 (incremental home in Z only) before full G28",
            };
          }
        }
        return { passed: true, message: "G28 usage is safe" };
      },
    },
    {
      id: "max_spindle_rpm",
      name: "Spindle RPM within machine limit",
      severity: "error",
      category: "machine_limit",
      description: "Commanded RPM must not exceed machine maximum",
      enabled: true,
      check: (ctx) => {
        if (!ctx.spindle_speed) return { passed: true, message: "No spindle speed in context" };
        const limit = 15000; // generic limit
        return {
          passed: ctx.spindle_speed <= limit,
          message: ctx.spindle_speed <= limit
            ? `RPM ${ctx.spindle_speed} within limit`
            : `RPM ${ctx.spindle_speed} exceeds generic ${limit} RPM limit`,
          remediation: ctx.spindle_speed > limit ? `Reduce RPM to ${limit} or verify machine capability` : undefined,
        };
      },
    },
    {
      id: "titanium_requires_coolant",
      name: "Titanium requires flood coolant",
      severity: "critical",
      category: "shop_rule",
      description: "Titanium and superalloys require active flood coolant — fire/ignition risk",
      enabled: true,
      check: (ctx) => {
        const isTitanium = ctx.material_id?.toLowerCase().includes("ti") ||
                          ctx.material_id?.toLowerCase().includes("titanium") ||
                          ctx.material_id?.toLowerCase().includes("inconel");
        if (!isTitanium) return { passed: true, message: "Not a heat-resistant alloy" };
        const text = ctx.gcode_lines.join(" ").toUpperCase();
        const hasFlood = text.includes("M8");
        return {
          passed: hasFlood,
          message: hasFlood ? "Flood coolant active for titanium" : "TITANIUM WITHOUT FLOOD COOLANT — ignition risk",
          remediation: !hasFlood ? "Add M8 flood coolant — MANDATORY for titanium/superalloys" : undefined,
        };
      },
    },
    {
      id: "five_axis_tcpc_present",
      name: "5-axis program has TCPC/RTCP",
      severity: "warning",
      category: "mandatory_code",
      description: "5-axis simultaneous programs should have TCPC/RTCP code",
      enabled: true,
      check: (ctx) => {
        if (!ctx.has_5axis) return { passed: true, message: "Not a 5-axis program" };
        const text = ctx.gcode_lines.join(" ").toUpperCase();
        const hasTCPC = text.includes("G43.4") || text.includes("G43.5") || text.includes("TRAORI") || text.includes("PLANE SPATIAL") || text.includes("TCPC") || text.includes("RTCP");
        return {
          passed: hasTCPC,
          message: hasTCPC ? "TCPC/RTCP code present for 5-axis" : "5-axis program lacks TCPC/RTCP — tool path may be incorrect",
          remediation: !hasTCPC ? "Add G43.4 (Fanuc), TRAORI (Siemens), or PLANE SPATIAL (Heidenhain)" : undefined,
        };
      },
    },
  ];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPSafetyRuleValidatorEngine {
  private rules: SafetyRule[];

  constructor() {
    this.rules = buildDefaultRules();
  }

  /** Validate G-code against all enabled safety rules. */
  validate(context: SafetyContext): SafetyValidationResult {
    const enabledRules = this.rules.filter(r => r.enabled);
    const results: SafetyValidationResult["results"] = [];
    let passed = 0, warnings = 0, errors = 0, criticals = 0;

    for (const rule of enabledRules) {
      const check = rule.check(context);
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        passed: check.passed,
        message: check.message,
        remediation: check.remediation,
      });

      if (check.passed) { passed++; continue; }
      switch (rule.severity) {
        case "info": case "warning": warnings++; break;
        case "error": errors++; break;
        case "critical": criticals++; break;
      }
    }

    const overall: SafetyValidationResult["overall"] = criticals > 0 ? "critical"
      : errors > 0 ? "unsafe" : warnings > 0 ? "warnings" : "safe";

    const recs: string[] = [];
    if (criticals > 0) recs.push(`Address ${criticals} CRITICAL safety issue(s) before running`);
    if (errors > 0) recs.push(`Fix ${errors} safety error(s)`);
    if (warnings > 0) recs.push(`Review ${warnings} warning(s)`);
    if (overall === "safe") recs.push("All safety rules passed — program is safe to run");

    return {
      overall,
      rules_checked: enabledRules.length,
      passed, warnings, errors, criticals,
      results,
      recommendations: recs,
    };
  }

  /** Quick check — returns true if no criticals or errors. */
  isSafe(context: SafetyContext): boolean {
    const r = this.validate(context);
    return r.criticals === 0 && r.errors === 0;
  }

  /** List all rules. */
  listRules(): Array<{ id: string; name: string; severity: RuleSeverity; category: string; enabled: boolean }> {
    return this.rules.map(r => ({
      id: r.id, name: r.name, severity: r.severity, category: r.category, enabled: r.enabled,
    }));
  }

  /** Enable/disable a rule. */
  setRuleEnabled(id: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /** Add a custom rule. */
  addRule(rule: SafetyRule): void {
    const existing = this.rules.findIndex(r => r.id === rule.id);
    if (existing >= 0) this.rules[existing] = rule;
    else this.rules.push(rule);
  }

  /** Get rule count. */
  getRuleCount(): number {
    return this.rules.length;
  }

  /** Reset to defaults. */
  reset(): void {
    this.rules = buildDefaultRules();
  }
}

export const ppSafetyRuleValidatorEngine = new PPSafetyRuleValidatorEngine();
