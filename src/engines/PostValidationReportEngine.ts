/**
 * PostValidationReportEngine — Structured validation report generation
 *
 * Takes ValidationResult from PostValidationHardeningEngine and produces
 * human-readable reports in multiple formats:
 *
 *   - text: Plain-text summary suitable for G-code header comments
 *   - json: Structured JSON for API consumers / UI rendering
 *   - detailed: Full per-block report with remediation recommendations
 *
 * Each report includes:
 *   1. Pass/fail verdict per validation dimension
 *   2. Per-block flag list with severity color-coding
 *   3. Specific parameter adjustment recommendations
 *   4. Machine capability summary for operator reference
 *
 * References:
 *   - AS9102 Rev C (First Article Inspection), adapted for G-code validation
 *   - ISO 22514-7 (Capability of measurement processes)
 *
 * @module engines/PostValidationReportEngine
 * @version 1.0.0
 */

import type {
  ValidationResult,
  ValidationFlag,
  ValidationSummary,
  ValidationSeverity,
} from "./PostValidationHardeningEngine.js";
import type { MachineContext } from "./PostProcessorPipelineEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type ReportFormat = "text" | "json" | "detailed";

export interface ReportInput {
  action: "generate_report" | "summary_only";
  /** Validation result from PostValidationHardeningEngine */
  validation: ValidationResult;
  /** Machine context for capability summary section */
  machine?: MachineContext;
  /** Output format */
  format?: ReportFormat;
  /** Include remediation recommendations */
  include_recommendations?: boolean;
  /** Program name for report header */
  program_name?: string;
}

export interface DimensionVerdict {
  dimension: string;
  passed: boolean;
  block_count: number;
  warn_count: number;
  info_count: number;
  worst_severity: ValidationSeverity;
  recommendations: string[];
}

export interface ReportResult {
  /** Formatted report content (text, JSON string, or detailed text) */
  content: string;
  /** Structured verdicts per dimension */
  verdicts: DimensionVerdict[];
  /** Overall pass/fail */
  passed: boolean;
  /** Report metadata */
  metadata: {
    format: ReportFormat;
    generated_at: string;
    machine_id?: string;
    machine_name?: string;
    program_name?: string;
    total_flags: number;
  };
  /** Warnings about report generation */
  warnings: string[];
}

// ─── Dimension Labels ───────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  spindle_rpm: "Spindle RPM",
  feed_rate: "Feed Rate",
  axis_travel: "Axis Travel / Work Envelope",
  tool_capacity: "Tool Magazine Capacity",
  coolant: "Coolant System",
  power: "Spindle Power",
  work_offset: "Work Coordinate Offset",
  syntax: "G-code Syntax",
};

const SEVERITY_ICON: Record<ValidationSeverity, string> = {
  BLOCK: "[FAIL]",
  WARN: "[WARN]",
  INFO: "[INFO]",
};

// ─── Engine ─────────────────────────────────────────────────────────

class PostValidationReportEngineImpl {
  /**
   * Generate a validation report.
   *
   * @param input - Validation result and formatting options
   * @returns Formatted report with verdicts and recommendations
   */
  async process(input: ReportInput): Promise<ReportResult> {
    switch (input.action) {
      case "generate_report":
        return this.generateReport(input);
      case "summary_only":
        return this.generateReport({ ...input, format: "text", include_recommendations: false });
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  private generateReport(input: ReportInput): ReportResult {
    const format = input.format ?? "text";
    const includeRecs = input.include_recommendations ?? true;
    const { validation, machine } = input;
    const warnings: string[] = [];

    // Build per-dimension verdicts
    const dimensions = this.extractDimensions(validation.flags);
    const verdicts: DimensionVerdict[] = dimensions.map(dim =>
      this.buildVerdict(dim, validation.flags, includeRecs)
    );

    // Validate report input sanity
    if (validation.flags.length === 0 && !validation.summary.passed) {
      warnings.push("Validation reports failure but has no flags — possible upstream error");
    }

    const metadata = {
      format,
      generated_at: new Date().toISOString(),
      machine_id: machine?.id ?? validation.summary.machine_id,
      machine_name: machine?.name ?? validation.summary.machine_name,
      program_name: input.program_name,
      total_flags: validation.flags.length,
    };

    let content: string;
    switch (format) {
      case "json":
        content = JSON.stringify({
          passed: validation.summary.passed,
          summary: validation.summary,
          verdicts,
          flags: validation.flags,
          machine_capabilities: machine ? this.formatMachineCapabilities(machine) : undefined,
          metadata,
        }, null, 2);
        break;
      case "detailed":
        content = this.formatDetailed(validation, verdicts, machine, input.program_name);
        break;
      case "text":
      default:
        content = this.formatText(validation, verdicts, machine, input.program_name);
        break;
    }

    return {
      content,
      verdicts,
      passed: validation.summary.passed,
      metadata,
      warnings,
    };
  }

  // ─── Verdict Building ───────────────────────────────────────────

  private extractDimensions(flags: ValidationFlag[]): string[] {
    const dims = new Set(flags.map(f => f.dimension));
    return Array.from(dims).sort();
  }

  private buildVerdict(dimension: string, flags: ValidationFlag[], includeRecs: boolean): DimensionVerdict {
    const dimFlags = flags.filter(f => f.dimension === dimension);
    const blockCount = dimFlags.filter(f => f.severity === "BLOCK").length;
    const warnCount = dimFlags.filter(f => f.severity === "WARN").length;
    const infoCount = dimFlags.filter(f => f.severity === "INFO").length;

    let worstSeverity: ValidationSeverity = "INFO";
    if (warnCount > 0) worstSeverity = "WARN";
    if (blockCount > 0) worstSeverity = "BLOCK";

    const recommendations: string[] = [];
    if (includeRecs) {
      // Deduplicate suggestions
      const seen = new Set<string>();
      for (const flag of dimFlags) {
        if (flag.suggestion && !seen.has(flag.suggestion)) {
          seen.add(flag.suggestion);
          recommendations.push(flag.suggestion);
        }
      }
      // Add dimension-specific recommendations
      if (blockCount > 0) {
        recommendations.push(...this.getDimensionRemediation(dimension, dimFlags));
      }
    }

    return {
      dimension,
      passed: blockCount === 0,
      block_count: blockCount,
      warn_count: warnCount,
      info_count: infoCount,
      worst_severity: worstSeverity,
      recommendations,
    };
  }

  private getDimensionRemediation(dimension: string, flags: ValidationFlag[]): string[] {
    switch (dimension) {
      case "spindle_rpm": {
        const maxActual = Math.max(...flags.filter(f => typeof f.actual === "number").map(f => f.actual as number));
        const limit = flags[0]?.limit;
        return [`Reduce max RPM from ${maxActual} to at most ${limit}`];
      }
      case "axis_travel":
        return [
          "Verify WCS origin placement relative to machine home",
          "Check fixture offset doesn't push part outside envelope",
        ];
      case "feed_rate":
        return ["Check program units (mm vs inch) — F values may need unit conversion"];
      case "tool_capacity":
        return ["Consider splitting into multiple setups or using sister tooling"];
      default:
        return [];
    }
  }

  // ─── Text Formatting ────────────────────────────────────────────

  private formatText(
    validation: ValidationResult,
    verdicts: DimensionVerdict[],
    machine?: MachineContext,
    programName?: string,
  ): string {
    const lines: string[] = [];
    const sep = "=".repeat(60);
    const subsep = "-".repeat(60);

    lines.push(sep);
    lines.push("  POST VALIDATION REPORT");
    if (programName) lines.push(`  Program: ${programName}`);
    if (machine) lines.push(`  Machine: ${machine.name} (${machine.brand})`);
    lines.push(`  Result: ${validation.summary.passed ? "PASSED" : "FAILED"}`);
    lines.push(`  Flags: ${validation.summary.block_count} BLOCK / ${validation.summary.warn_count} WARN / ${validation.summary.info_count} INFO`);
    lines.push(sep);
    lines.push("");

    // Per-dimension verdicts
    for (const v of verdicts) {
      const label = DIMENSION_LABELS[v.dimension] ?? v.dimension;
      const status = v.passed ? "PASS" : "FAIL";
      lines.push(`  ${status}  ${label}: ${v.block_count}B / ${v.warn_count}W / ${v.info_count}I`);
    }
    lines.push("");

    // BLOCK-level flags only in text mode
    const blockFlags = validation.flags.filter(f => f.severity === "BLOCK");
    if (blockFlags.length > 0) {
      lines.push(subsep);
      lines.push("  BLOCKING ISSUES (must fix before running):");
      lines.push(subsep);
      for (const flag of blockFlags) {
        lines.push(`  Line ${flag.line}: ${flag.message}`);
        if (flag.suggestion) lines.push(`    -> ${flag.suggestion}`);
      }
    }

    return lines.join("\n");
  }

  private formatDetailed(
    validation: ValidationResult,
    verdicts: DimensionVerdict[],
    machine?: MachineContext,
    programName?: string,
  ): string {
    const lines: string[] = [];
    const sep = "=".repeat(72);
    const subsep = "-".repeat(72);

    lines.push(sep);
    lines.push("  DETAILED POST VALIDATION REPORT");
    if (programName) lines.push(`  Program: ${programName}`);
    if (machine) {
      lines.push(`  Machine: ${machine.name} (${machine.brand})`);
      lines.push(`  Controller: ${machine.controller}${machine.controller_version ? " " + machine.controller_version : ""}`);
      lines.push(`  Max RPM: ${machine.max_rpm} | Max Power: ${machine.max_power_kW} kW`);
      lines.push(`  Work Volume: X${machine.work_volume.x} Y${machine.work_volume.y} Z${machine.work_volume.z} mm`);
      if (machine.atc_capacity) lines.push(`  ATC Capacity: ${machine.atc_capacity} tools`);
      if (machine.coolant_types) lines.push(`  Coolant: ${machine.coolant_types.join(", ")}`);
    }
    lines.push(`  Generated: ${new Date().toISOString()}`);
    lines.push(sep);
    lines.push("");

    lines.push(`  OVERALL: ${validation.summary.passed ? "PASSED" : "FAILED"}`);
    lines.push(`  Lines checked: ${validation.summary.lines_checked}`);
    lines.push(`  Lines flagged: ${validation.summary.lines_flagged}`);
    lines.push("");

    // Per-dimension detail
    for (const v of verdicts) {
      const label = DIMENSION_LABELS[v.dimension] ?? v.dimension;
      lines.push(subsep);
      lines.push(`  ${v.passed ? "PASS" : "FAIL"}  ${label}`);
      lines.push(subsep);

      const dimFlags = validation.flags.filter(f => f.dimension === v.dimension);
      for (const flag of dimFlags) {
        lines.push(`    ${SEVERITY_ICON[flag.severity]} Line ${flag.line}: ${flag.message}`);
        lines.push(`      Code: ${flag.text}`);
        lines.push(`      Actual: ${flag.actual} | Limit: ${flag.limit}`);
        if (flag.suggestion) {
          lines.push(`      Fix: ${flag.suggestion}`);
        }
        lines.push("");
      }

      if (v.recommendations.length > 0) {
        lines.push("    Recommendations:");
        for (const rec of v.recommendations) {
          lines.push(`      * ${rec}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  // ─── Machine Capabilities ──────────────────────────────────────

  private formatMachineCapabilities(machine: MachineContext): Record<string, unknown> {
    return {
      id: machine.id,
      name: machine.name,
      brand: machine.brand,
      controller: machine.controller,
      max_rpm: machine.max_rpm,
      max_power_kW: machine.max_power_kW,
      work_volume: machine.work_volume,
      rapid_rate: machine.rapid_rate_mm_min,
      axes: machine.axes,
      atc_capacity: machine.atc_capacity,
      coolant_types: machine.coolant_types,
    };
  }
}

/** Singleton export */
export const postValidationReportEngine = new PostValidationReportEngineImpl();
