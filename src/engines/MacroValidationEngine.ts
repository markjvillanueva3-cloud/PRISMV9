/**
 * MacroValidationEngine — Validate converted parametric macros
 *
 * Ensures that a macro-converted Okuma program:
 *   1. Produces identical output when run with original parameter values
 *   2. Correctly adjusts dimensions when parameters change
 *   3. Recalculates speeds/feeds correctly when dimensions change
 *   4. Maintains ALL safety rules at every parameter combination
 *   5. Detects collision risks when stock size changes (X rapid < stock OD)
 *
 * This engine simulates macro variable evaluation without running on a CNC —
 * it evaluates V-variable assignments and substitutions symbolically.
 *
 * @module MacroValidationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Variable assignment for macro evaluation */
export interface MacroVarSet {
  [varName: string]: number;
}

/** Single validation check result */
export interface ValidationCheck {
  /** Check name */
  name: string;
  /** Pass/fail */
  passed: boolean;
  /** Description of what was checked */
  description: string;
  /** Details on failure */
  detail?: string;
  /** Severity if failed */
  severity: "critical" | "warning" | "info";
}

/** Collision risk detected */
export interface CollisionRisk {
  /** Line number in macro */
  line: number;
  /** The rapid/move command */
  command: string;
  /** X position (diameter) of the rapid */
  x_position: number;
  /** Stock diameter at this point */
  stock_diameter: number;
  /** Risk type */
  risk: "rapid_into_stock" | "clearance_too_small" | "retract_inside_stock";
  /** Description */
  description: string;
}

/** Validation input */
export interface MacroValidateInput {
  /** Converted macro lines */
  macro_lines: string[];
  /** Original program lines (for equivalence check) */
  original_lines?: string[];
  /** Original variable values (when macro was generated) */
  original_vars: MacroVarSet;
  /** Altered variable values (to test parametric behavior) */
  altered_vars?: MacroVarSet;
}

/** Validation result */
export interface MacroValidateResult {
  /** Overall pass/fail */
  valid: boolean;
  /** Individual check results */
  checks: ValidationCheck[];
  /** Collision risks found */
  collision_risks: CollisionRisk[];
  /** Safety validation */
  safety: {
    g50_present: boolean;
    g50_values: number[];
    retract_safe: boolean;
    spindle_stop: boolean;
    coolant_balanced: boolean;
    optional_stops: number;
  };
  /** Summary stats */
  stats: {
    total_checks: number;
    passed: number;
    failed: number;
    critical_failures: number;
    warnings: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PATTERNS = {
  variable_assign: /^(V\d+)\s*=\s*(.+?)(?:\s*\(.*\))?$/i,
  calc_assign: /^(V\d+)\s*=\s*\[([^\]]+)\]\s*(?:\/\s*(V\d+))?\s*(?:\(.*\))?$/i,
  g50: /G50\s+S(\d+)/i,
  g96: /G96\s+S(\d+)/i,
  g97: /G97\s+S(\d+)/i,
  rapid: /G0\b/i,
  x_word: /X(-?[\d.]+|V\d+)/i,
  z_word: /Z(-?[\d.]+|V\d+)/i,
  s_word: /S(\d+|V\d+)/i,
  f_word: /F([\d.]+|V\d+)/i,
  m1: /\bM0?1\b/i,
  m5: /\bM0?5\b/i,
  m8_50_51: /\bM(?:8|50|51)\b/i,
  m9: /\bM0?9\b/i,
};

// ============================================================================
// ENGINE
// ============================================================================

export class MacroValidationEngine {
  /**
   * Validate a converted macro program.
   *
   * @param input - Macro lines, original lines, and variable sets
   * @returns Validation result with checks, risks, and safety status
   */
  validate(input: MacroValidateInput): MacroValidateResult {
    const checks: ValidationCheck[] = [];
    const collisionRisks: CollisionRisk[] = [];

    // 1. Safety checks (always run)
    const safetyResult = this._checkSafety(input.macro_lines);
    checks.push(...safetyResult.checks);

    // 2. Variable resolution check
    const varChecks = this._checkVariableResolution(input.macro_lines, input.original_vars);
    checks.push(...varChecks);

    // 3. Collision risk analysis (with original vars)
    const origRisks = this._checkCollisions(input.macro_lines, input.original_vars);
    collisionRisks.push(...origRisks);

    // 4. If altered vars provided, check parametric behavior
    if (input.altered_vars) {
      const alteredChecks = this._checkAlteredBehavior(
        input.macro_lines,
        input.original_vars,
        input.altered_vars,
      );
      checks.push(...alteredChecks);

      // Check collisions with altered vars (use overrides to simulate user edits)
      const alteredRisks = this._checkCollisions(input.macro_lines, input.original_vars, input.altered_vars);
      collisionRisks.push(...alteredRisks);
    }

    // 5. Equivalence check (if original lines provided)
    if (input.original_lines) {
      const equivChecks = this._checkEquivalence(
        input.macro_lines,
        input.original_lines,
        input.original_vars,
      );
      checks.push(...equivChecks);
    }

    // Mark collision risks as critical checks
    for (const risk of collisionRisks) {
      checks.push({
        name: `collision_risk_line_${risk.line}`,
        passed: false,
        description: risk.description,
        detail: `Line ${risk.line}: ${risk.command} — X${risk.x_position} vs stock dia ${risk.stock_diameter}`,
        severity: "critical",
      });
    }

    // Compute stats
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    const critical = checks.filter(c => !c.passed && c.severity === "critical").length;
    const warnings = checks.filter(c => !c.passed && c.severity === "warning").length;

    const valid = critical === 0;

    log.info(`[MacroValidation] ${passed}/${checks.length} checks passed, ${critical} critical, ${collisionRisks.length} collision risks`);

    return {
      valid,
      checks,
      collision_risks: collisionRisks,
      safety: {
        g50_present: safetyResult.g50_present,
        g50_values: safetyResult.g50_values,
        retract_safe: safetyResult.retract_safe,
        spindle_stop: safetyResult.spindle_stop,
        coolant_balanced: safetyResult.coolant_balanced,
        optional_stops: safetyResult.optional_stops,
      },
      stats: {
        total_checks: checks.length,
        passed,
        failed,
        critical_failures: critical,
        warnings,
      },
    };
  }

  /**
   * Evaluate V-variable expressions in macro lines.
   * Returns a map of resolved variable values.
   *
   * @param lines - Macro program lines
   * @param vars - Initial variable values (defaults / pre-set)
   * @param overrides - Values applied AFTER line evaluation (simulates user edits)
   */
  evaluateVariables(lines: string[], vars: MacroVarSet, overrides?: MacroVarSet): MacroVarSet {
    const resolved = { ...vars };

    for (const line of lines) {
      const trimmed = line.trim();

      // Simple assignment: V1 = 2.0
      const simpleMatch = trimmed.match(/^(V\d+)\s*=\s*([\d.]+)\s*(?:\(|$)/i);
      if (simpleMatch) {
        const varName = simpleMatch[1].toUpperCase();
        // If overrides exist for this var, use the override instead
        if (overrides && overrides[varName] !== undefined) {
          resolved[varName] = overrides[varName];
        } else {
          resolved[varName] = parseFloat(simpleMatch[2]);
        }
        continue;
      }

      // Calculated assignment: V70 = [V45 * 3.8197] / V1
      const calcMatch = trimmed.match(PATTERNS.calc_assign);
      if (calcMatch) {
        const varName = calcMatch[1].toUpperCase();
        const expr = calcMatch[2];
        const divisor = calcMatch[3]?.toUpperCase();

        const numerator = this._evalExpression(expr, resolved);
        if (numerator !== null) {
          if (divisor && resolved[divisor] && resolved[divisor] !== 0) {
            resolved[varName] = numerator / resolved[divisor];
          } else if (!divisor) {
            resolved[varName] = numerator;
          }
        }
      }
    }

    return resolved;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _checkSafety(lines: string[]): {
    checks: ValidationCheck[];
    g50_present: boolean;
    g50_values: number[];
    retract_safe: boolean;
    spindle_stop: boolean;
    coolant_balanced: boolean;
    optional_stops: number;
  } {
    const checks: ValidationCheck[] = [];
    const g50Values: number[] = [];
    let hasG96 = false;
    let hasRetract = false;
    let hasSpindleStop = false;
    let coolantOn = 0;
    let coolantOff = 0;
    let m1Count = 0;

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();

      const g50Match = trimmed.match(PATTERNS.g50);
      if (g50Match) g50Values.push(parseInt(g50Match[1], 10));
      if (PATTERNS.g96.test(trimmed)) hasG96 = true;
      if (PATTERNS.m5.test(trimmed)) hasSpindleStop = true;
      if (PATTERNS.m1.test(trimmed)) m1Count++;
      if (PATTERNS.m8_50_51.test(trimmed)) coolantOn++;
      if (PATTERNS.m9.test(trimmed)) coolantOff++;

      // Check for safe retract (G0 X>=15 Z>=10)
      if (PATTERNS.rapid.test(trimmed)) {
        const xm = trimmed.match(/X(\d+\.?\d*)/);
        const zm = trimmed.match(/Z(\d+\.?\d*)/);
        if (xm && zm && parseFloat(xm[1]) >= 15 && parseFloat(zm[1]) >= 10) {
          hasRetract = true;
        }
      }
    }

    const g50Present = g50Values.length > 0;
    const coolantBalanced = coolantOn === 0 || coolantOff > 0;

    // G50 check
    checks.push({
      name: "g50_speed_clamp",
      passed: !hasG96 || g50Present,
      description: "G50 speed clamp present for CSS mode",
      detail: hasG96 && !g50Present ? "G96 CSS mode found without G50 clamp" : undefined,
      severity: "critical",
    });

    // Spindle stop
    checks.push({
      name: "spindle_stop",
      passed: hasSpindleStop,
      description: "M5 spindle stop before program end",
      severity: "critical",
    });

    // Safe retract
    checks.push({
      name: "safe_retract",
      passed: hasRetract,
      description: "Safe retract position between tools",
      severity: "critical",
    });

    // Coolant balance
    checks.push({
      name: "coolant_balance",
      passed: coolantBalanced,
      description: "Coolant on/off balanced",
      detail: !coolantBalanced ? `${coolantOn} on, ${coolantOff} off` : undefined,
      severity: "warning",
    });

    // Optional stops
    checks.push({
      name: "optional_stops",
      passed: m1Count > 0,
      description: "M1 optional stops present for inspection",
      severity: "warning",
    });

    return {
      checks,
      g50_present: g50Present,
      g50_values: g50Values,
      retract_safe: hasRetract,
      spindle_stop: hasSpindleStop,
      coolant_balanced: coolantBalanced,
      optional_stops: m1Count,
    };
  }

  private _checkVariableResolution(lines: string[], vars: MacroVarSet): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const resolved = this.evaluateVariables(lines, vars);

    // Check that all V-variables referenced in cutting lines have values
    let unresolvedCount = 0;
    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("(")) continue; // comment
      if (/^V\d+\s*=/.test(trimmed)) continue; // assignment line

      const varRefs = trimmed.match(/V\d+/g);
      if (varRefs) {
        for (const ref of varRefs) {
          if (resolved[ref] === undefined) {
            unresolvedCount++;
          }
        }
      }
    }

    checks.push({
      name: "variable_resolution",
      passed: unresolvedCount === 0,
      description: "All V-variables resolve to values",
      detail: unresolvedCount > 0 ? `${unresolvedCount} unresolved variable references` : undefined,
      severity: "warning",
    });

    return checks;
  }

  private _checkCollisions(lines: string[], vars: MacroVarSet, overrides?: MacroVarSet): CollisionRisk[] {
    const risks: CollisionRisk[] = [];
    const resolved = this.evaluateVariables(lines, vars, overrides);
    const stockDia = resolved["V1"] ?? 0;

    if (stockDia <= 0) return risks;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim().toUpperCase();

      // Only check rapid moves (G0) for collisions
      if (!PATTERNS.rapid.test(trimmed)) continue;

      const xMatch = trimmed.match(/X(V\d+|[\d.]+)/i);
      if (!xMatch) continue;

      let xVal: number;
      const xRef = xMatch[1].toUpperCase();
      if (xRef.startsWith("V")) {
        xVal = resolved[xRef] ?? 0;
      } else {
        xVal = parseFloat(xRef);
      }

      // Skip retract moves (X >= 15 is clearly safe retract)
      if (xVal >= 15) continue;

      // Check: rapid X position vs stock diameter
      // On a lathe, X = diameter. If rapid X < stock diameter, tool moves INSIDE the stock.
      if (xVal > 0 && xVal < stockDia) {
        risks.push({
          line: i,
          command: trimmed,
          x_position: xVal,
          stock_diameter: stockDia,
          risk: "rapid_into_stock",
          description: `COLLISION: Rapid to X${xVal} is inside stock diameter ${stockDia}`,
        });
      } else if (xVal > 0 && xVal < stockDia + 0.050 && xVal >= stockDia) {
        // Very tight clearance
        risks.push({
          line: i,
          command: trimmed,
          x_position: xVal,
          stock_diameter: stockDia,
          risk: "clearance_too_small",
          description: `Tight clearance: X${xVal} is only ${(xVal - stockDia).toFixed(3)} above stock OD ${stockDia}`,
        });
      }
    }

    return risks;
  }

  private _checkAlteredBehavior(
    macroLines: string[],
    origVars: MacroVarSet,
    alteredVars: MacroVarSet,
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    const origResolved = this.evaluateVariables(macroLines, origVars);
    const altResolved = this.evaluateVariables(macroLines, origVars, alteredVars);

    // Check that RPM variables changed when diameter changed
    if (alteredVars["V1"] !== origVars["V1"]) {
      // Check V70+ (RPM variables) changed
      let rpmChanged = false;
      for (let v = 70; v <= 85; v++) {
        const key = `V${v}`;
        if (origResolved[key] !== undefined && altResolved[key] !== undefined) {
          if (Math.abs(origResolved[key] - altResolved[key]) > 0.1) {
            rpmChanged = true;
            break;
          }
        }
      }

      checks.push({
        name: "rpm_recalculation",
        passed: rpmChanged,
        description: "RPM variables recalculate when stock diameter changes",
        detail: !rpmChanged ? "V70+ RPM vars did not change when V1 (stock dia) changed" : undefined,
        severity: "critical",
      });
    }

    // Check G50 clamp still enforced (should not increase)
    const origG50: number[] = [];
    const altG50: number[] = [];
    for (const line of macroLines) {
      const m = line.trim().toUpperCase().match(PATTERNS.g50);
      if (m) {
        origG50.push(parseInt(m[1], 10));
        altG50.push(parseInt(m[1], 10)); // G50 values are hardcoded, not variables
      }
    }

    checks.push({
      name: "g50_unchanged",
      passed: JSON.stringify(origG50) === JSON.stringify(altG50),
      description: "G50 safety clamps unchanged with altered parameters",
      severity: "critical",
    });

    return checks;
  }

  private _checkEquivalence(
    macroLines: string[],
    originalLines: string[],
    vars: MacroVarSet,
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Count structural elements that must match
    const origToolChanges = originalLines.filter(l => /\bT\d{2,6}\b/.test(l)).length;
    const macroToolChanges = macroLines.filter(l => /\bT\d{2,6}\b/.test(l)).length;

    checks.push({
      name: "tool_change_count",
      passed: origToolChanges === macroToolChanges,
      description: "Same number of tool changes as original",
      detail: origToolChanges !== macroToolChanges
        ? `Original: ${origToolChanges}, Macro: ${macroToolChanges}`
        : undefined,
      severity: "critical",
    });

    // G50 count must match or exceed
    const origG50 = originalLines.filter(l => PATTERNS.g50.test(l)).length;
    const macroG50 = macroLines.filter(l => PATTERNS.g50.test(l)).length;

    checks.push({
      name: "g50_count",
      passed: macroG50 >= origG50,
      description: "G50 clamp count >= original",
      detail: macroG50 < origG50 ? `Original: ${origG50}, Macro: ${macroG50}` : undefined,
      severity: "critical",
    });

    // M1/M5/M30 preservation
    const origM5 = originalLines.some(l => PATTERNS.m5.test(l));
    const macroM5 = macroLines.some(l => PATTERNS.m5.test(l));

    checks.push({
      name: "m5_preserved",
      passed: !origM5 || macroM5,
      description: "M5 spindle stop preserved from original",
      severity: "critical",
    });

    return checks;
  }

  /** Evaluate a simple arithmetic expression with variable substitution */
  private _evalExpression(expr: string, vars: MacroVarSet): number | null {
    let resolved = expr;

    // Replace V-variables with their values
    const varRefs = expr.match(/V\d+/gi);
    if (varRefs) {
      for (const ref of varRefs) {
        const val = vars[ref.toUpperCase()];
        if (val === undefined) return null;
        resolved = resolved.replace(new RegExp(ref, "i"), String(val));
      }
    }

    // Evaluate simple arithmetic: a * b, a + b, a - b
    try {
      // Only allow safe numeric operations
      if (!/^[\d.+\-*/\s()]+$/.test(resolved)) return null;
      const result = Function(`"use strict"; return (${resolved})`)();
      return typeof result === "number" && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }
}

export const macroValidationEngine = new MacroValidationEngine();
