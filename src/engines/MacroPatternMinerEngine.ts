/**
 * MacroPatternMinerEngine — Mine macro programming patterns from CNC programs
 *
 * Analyzes parsed Okuma programs to extract:
 *   - Variable naming conventions (V1-V100 for dims, V20-V30 for drills, etc.)
 *   - IF/GOTO branching patterns for optional features
 *   - Calculated RPM formulas (SFM * 3.82 / DIA)
 *   - Common macro header structures (parametric templates)
 *   - Variable assignment statistics
 *
 * Feeds into OkumaMacroHeaderGenerator for automatic macro program creation.
 *
 * @module MacroPatternMinerEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram, OkumaVariable } from "./OkumaOSPParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface VariablePattern {
  /** Variable name (V1, V20, VC100, etc.) */
  name: string;
  /** What this variable typically represents */
  typical_purpose: string;
  /** Observed values from programs */
  observed_values: number[];
  /** Comments seen alongside this variable */
  observed_comments: string[];
  /** How many programs use this variable */
  frequency: number;
  /** Local (V1-V100) or common (VC100+) */
  scope: "local" | "common";
  /** Value range [min, max] */
  range: [number, number];
}

export interface BranchingPattern {
  /** Condition expression (e.g., "[V1 GT 2.0]") */
  condition: string;
  /** Target label (e.g., "NLARGE") */
  target_label: string;
  /** Purpose inferred from context */
  purpose: string;
  /** How many programs use this pattern */
  frequency: number;
}

export interface RPMFormulaPattern {
  /** Raw expression from program */
  expression: string;
  /** Parsed formula description */
  description: string;
  /** Unit system detected */
  unit_system: "imperial" | "metric";
  /** Variable holding SFM/SCS value */
  sfm_variable?: string;
  /** Variable holding diameter */
  dia_variable?: string;
  /** Output variable holding RPM */
  rpm_variable?: string;
  /** Programs containing this pattern */
  frequency: number;
}

export interface MacroHeaderTemplate {
  /** Template name */
  name: string;
  /** Part dimension variables */
  dimensions: Array<{ var: string; purpose: string; typical_range: [number, number] }>;
  /** Drill parameter variables */
  drill_params: Array<{ var: string; purpose: string }>;
  /** Speed/feed variables */
  speed_feed_vars: Array<{ var: string; purpose: string }>;
  /** Clearance/limit variables */
  clearance_vars: Array<{ var: string; purpose: string }>;
  /** Calculated RPM variables */
  calculated_vars: Array<{ var: string; formula: string }>;
  /** Programs this template was derived from */
  source_programs: string[];
}

export interface MacroMineResult {
  variable_patterns: VariablePattern[];
  branching_patterns: BranchingPattern[];
  rpm_formulas: RPMFormulaPattern[];
  header_templates: MacroHeaderTemplate[];
  stats: {
    total_programs: number;
    programs_with_macros: number;
    total_variables: number;
    unique_variables: number;
    total_branches: number;
    total_rpm_formulas: number;
    avg_variables_per_program: number;
  };
}

// ============================================================================
// VARIABLE PURPOSE INFERENCE
// ============================================================================

/** Infer variable purpose from its comment or value range */
function inferPurpose(name: string, comment: string, values: number[]): string {
  const cUpper = comment.toUpperCase();

  // Direct comment match
  if (cUpper.includes("STOCK") && cUpper.includes("DIA")) return "stock_diameter";
  if (cUpper.includes("FINISH") && cUpper.includes("OD")) return "finish_od";
  if (cUpper.includes("FINISH") && cUpper.includes("ID")) return "finish_id";
  if (cUpper.includes("DRILL") && cUpper.includes("SIZE")) return "drill_size";
  if (cUpper.includes("PART") && cUpper.includes("LEN")) return "part_length";
  if (cUpper.includes("STICKOUT")) return "stickout";
  if (cUpper.includes("SFM") || cUpper.includes("SURFACE") && cUpper.includes("SPEED")) return "sfm";
  if (cUpper.includes("FEED")) return "feed_rate";
  if (cUpper.includes("DOC") || cUpper.includes("DEPTH") && cUpper.includes("CUT")) return "depth_of_cut";
  if (cUpper.includes("PECK")) return "peck_depth";
  if (cUpper.includes("POINT") && cUpper.includes("ANGLE")) return "drill_point_angle";
  if (cUpper.includes("ALLOWANCE")) return "finish_allowance";
  if (cUpper.includes("CLEARANCE")) return "clearance";
  if (cUpper.includes("RPM") || cUpper.includes("MAX")) return "rpm_limit";
  if (cUpper.includes("COUNTER") || cUpper.includes("COUNT")) return "part_counter";
  if (cUpper.includes("BATCH") || cUpper.includes("QTY")) return "batch_quantity";

  // Infer from variable number conventions
  const num = parseInt(name.replace(/[VCvc]/g, ""), 10);
  if (name.toUpperCase().startsWith("VC")) {
    if (num >= 200 && num < 300) return "counter_persistent";
    if (num >= 300) return "shared_parameter";
    return "common_variable";
  }

  // V-variable number range conventions (from shop macros)
  if (num >= 1 && num <= 10) return "part_dimension";
  if (num >= 20 && num <= 30) return "drill_parameter";
  if (num >= 35 && num <= 38) return "stock_allowance";
  if (num >= 40 && num <= 44) return "depth_of_cut";
  if (num >= 45 && num <= 56) return "speed_feed";
  if (num >= 60 && num <= 66) return "clearance_limit";
  if (num >= 70 && num <= 85) return "calculated_rpm";
  if (num >= 100) return "common_variable";

  return "unknown";
}

// ============================================================================
// ENGINE
// ============================================================================

export class MacroPatternMinerEngine {
  /**
   * Mine macro patterns from parsed Okuma programs.
   */
  mine(programs: OkumaProgram[]): MacroMineResult {
    const varMap = new Map<string, {
      values: number[];
      comments: string[];
      programs: Set<string>;
      scope: "local" | "common";
    }>();
    const branchPatterns: Map<string, { target: string; purpose: string; count: number }> = new Map();
    const rpmFormulas: Map<string, { desc: string; unit: "imperial" | "metric"; count: number }> = new Map();
    let programsWithMacros = 0;
    let totalBranches = 0;

    for (const prog of programs) {
      if (!prog.hasMacroVariables && prog.variables.length === 0) continue;
      programsWithMacros++;

      // Extract variable patterns
      for (const v of prog.variables) {
        const key = v.name.toUpperCase();
        if (!varMap.has(key)) {
          varMap.set(key, {
            values: [],
            comments: [],
            programs: new Set(),
            scope: key.startsWith("VC") ? "common" : "local",
          });
        }
        const entry = varMap.get(key)!;
        const numVal = typeof v.value === "number" ? v.value : parseFloat(String(v.value));
        if (!isNaN(numVal)) entry.values.push(numVal);
        if (v.comment) entry.comments.push(v.comment);
        entry.programs.add(prog.filename);
      }

      // Extract branching patterns (IF/GOTO)
      for (const line of prog.rawLines) {
        const trimmed = line.trim().toUpperCase();
        const ifMatch = trimmed.match(/IF\s*\[([^\]]+)\]\s*\/GOTO\s+(\w+)/);
        if (ifMatch) {
          totalBranches++;
          const condition = ifMatch[1].trim();
          const target = ifMatch[2];
          const key = `${condition}→${target}`;
          if (!branchPatterns.has(key)) {
            branchPatterns.set(key, {
              target,
              purpose: this._inferBranchPurpose(condition, target),
              count: 0,
            });
          }
          branchPatterns.get(key)!.count++;
        }
      }

      // Extract RPM calculation formulas
      for (const line of prog.rawLines) {
        const trimmed = line.trim();
        // Match patterns like V70=[V45*3.82]/V1
        const rpmMatch = trimmed.match(/(V\d+)\s*=\s*\[([^\]]+)\]\s*\/\s*(V\d+)/i);
        if (rpmMatch) {
          const expr = trimmed;
          if (expr.includes("3.82") || expr.includes("3.8197")) {
            const key = "imperial_sfm_to_rpm";
            if (!rpmFormulas.has(key)) {
              rpmFormulas.set(key, {
                desc: "Imperial SFM→RPM: RPM = SFM × 3.82 / DIA",
                unit: "imperial",
                count: 0,
              });
            }
            rpmFormulas.get(key)!.count++;
          } else if (expr.includes("1000") && expr.includes("3.14")) {
            const key = "metric_scs_to_rpm";
            if (!rpmFormulas.has(key)) {
              rpmFormulas.set(key, {
                desc: "Metric SCS→RPM: RPM = SCS × 1000 / (π × DIA)",
                unit: "metric",
                count: 0,
              });
            }
            rpmFormulas.get(key)!.count++;
          }
        }
      }
    }

    // Build variable patterns
    const variablePatterns: VariablePattern[] = [...varMap.entries()]
      .map(([name, data]) => ({
        name,
        typical_purpose: inferPurpose(
          name,
          data.comments.join(" "),
          data.values,
        ),
        observed_values: data.values,
        observed_comments: [...new Set(data.comments)].slice(0, 5),
        frequency: data.programs.size,
        scope: data.scope,
        range: data.values.length > 0
          ? [Math.min(...data.values), Math.max(...data.values)] as [number, number]
          : [0, 0] as [number, number],
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Build branching patterns
    const branchingPatterns: BranchingPattern[] = [...branchPatterns.entries()]
      .map(([key, data]) => ({
        condition: key.split("→")[0],
        target_label: data.target,
        purpose: data.purpose,
        frequency: data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Build RPM formulas
    const rpmFormulaPatterns: RPMFormulaPattern[] = [...rpmFormulas.entries()]
      .map(([key, data]) => ({
        expression: key,
        description: data.desc,
        unit_system: data.unit,
        frequency: data.count,
      }));

    // Build header templates
    const headerTemplates = this._buildHeaderTemplates(variablePatterns, programs);

    const totalVars = variablePatterns.reduce((s, v) => s + v.observed_values.length, 0);

    return {
      variable_patterns: variablePatterns,
      branching_patterns: branchingPatterns,
      rpm_formulas: rpmFormulaPatterns,
      header_templates: headerTemplates,
      stats: {
        total_programs: programs.length,
        programs_with_macros: programsWithMacros,
        total_variables: totalVars,
        unique_variables: variablePatterns.length,
        total_branches: totalBranches,
        total_rpm_formulas: rpmFormulaPatterns.length,
        avg_variables_per_program: programsWithMacros > 0
          ? Math.round(totalVars / programsWithMacros * 10) / 10
          : 0,
      },
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _inferBranchPurpose(condition: string, target: string): string {
    const condUpper = condition.toUpperCase();
    const targetUpper = target.toUpperCase();

    if (targetUpper.includes("END") || targetUpper.includes("DONE")) return "loop_exit";
    if (targetUpper.includes("SKIP")) return "optional_feature_skip";
    if (targetUpper.includes("BAR") || targetUpper.includes("NBAR")) return "bar_feeder_loop";
    if (condUpper.includes("GE") || condUpper.includes("GT")) return "counter_check";
    if (condUpper.includes("EQ") && condUpper.includes("0")) return "skip_if_zero";
    return "conditional_branch";
  }

  private _buildHeaderTemplates(
    patterns: VariablePattern[],
    programs: OkumaProgram[],
  ): MacroHeaderTemplate[] {
    // Group by purpose to build template structure
    const dims = patterns.filter(p => p.typical_purpose === "part_dimension" || p.typical_purpose.includes("diameter") || p.typical_purpose.includes("length"));
    const drills = patterns.filter(p => p.typical_purpose.includes("drill") || p.typical_purpose === "peck_depth");
    const speedFeeds = patterns.filter(p => p.typical_purpose.includes("speed") || p.typical_purpose.includes("feed") || p.typical_purpose === "sfm");
    const clearances = patterns.filter(p => p.typical_purpose.includes("clearance") || p.typical_purpose.includes("limit") || p.typical_purpose.includes("rpm_limit"));
    const calculated = patterns.filter(p => p.typical_purpose.includes("calculated") || p.typical_purpose.includes("rpm") && p.scope === "local");

    if (dims.length === 0 && drills.length === 0) return [];

    const macroPrograms = programs.filter(p => p.hasMacroVariables);
    const template: MacroHeaderTemplate = {
      name: "Standard Okuma Macro Header",
      dimensions: dims.slice(0, 10).map(d => ({
        var: d.name,
        purpose: d.typical_purpose,
        typical_range: d.range,
      })),
      drill_params: drills.slice(0, 8).map(d => ({
        var: d.name,
        purpose: d.typical_purpose,
      })),
      speed_feed_vars: speedFeeds.slice(0, 12).map(d => ({
        var: d.name,
        purpose: d.typical_purpose,
      })),
      clearance_vars: clearances.slice(0, 7).map(d => ({
        var: d.name,
        purpose: d.typical_purpose,
      })),
      calculated_vars: calculated.slice(0, 10).map(d => ({
        var: d.name,
        formula: `${d.typical_purpose} (auto-calculated)`,
      })),
      source_programs: macroPrograms.slice(0, 5).map(p => p.filename),
    };

    return [template];
  }
}

export const macroPatternMinerEngine = new MacroPatternMinerEngine();
