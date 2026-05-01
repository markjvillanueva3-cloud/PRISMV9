/**
 * BatchPhysicsOptimizationEngine — Run physics optimization on batches of programs
 *
 * Orchestrates the full optimization pipeline for multiple programs:
 *   1. Resolve material per program
 *   2. Resolve tools per program
 *   3. Run per-block Kienzle/Taylor/Brammertz optimization
 *   4. Generate per-program comparison reports
 *   5. Produce fleet-wide summary with total time savings
 *
 * @module BatchPhysicsOptimizationEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram } from "./OkumaOSPParserEngine.js";
import { programPhysicsOptimizerEngine } from "./ProgramPhysicsOptimizerEngine.js";
import type { ProgramOptimizeResult } from "./ProgramPhysicsOptimizerEngine.js";
import { optimizationReportGeneratorEngine } from "./OptimizationReportGeneratorEngine.js";
import type { OptimizationReport } from "./OptimizationReportGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Single program optimization record */
export interface OptimizationRecord {
  /** Program filename */
  filename: string;
  /** Whether optimization succeeded */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Optimization result */
  result?: ProgramOptimizeResult;
  /** Comparison report */
  report?: OptimizationReport;
}

/** Batch optimization input */
export interface BatchOptimizeInput {
  /** Parsed programs */
  programs: OkumaProgram[];
  /** Unit system */
  unit_system?: "imperial" | "metric";
  /** Machine max power [kW] */
  machine_max_power_kw?: number;
  /** Machine max RPM */
  machine_max_rpm?: number;
  /** Target tool life [min] */
  target_tool_life_min?: number;
  /** Max programs to optimize */
  max_programs?: number;
  /** Sort by: "recent" or "line_count" */
  sort_by?: "recent" | "line_count";
  /** Customer name for material hint */
  customer_name?: string;
}

/** Batch optimization result */
export interface BatchOptimizeResult {
  /** Individual records */
  records: OptimizationRecord[];
  /** Fleet-wide summary */
  fleet_summary: {
    total_programs: number;
    successful: number;
    failed: number;
    total_cutting_blocks: number;
    total_blocks_optimized: number;
    total_original_cycle_sec: number;
    total_optimized_cycle_sec: number;
    total_time_savings_sec: number;
    total_time_savings_pct: number;
    avg_tool_life_min: number;
    programs_with_safety_issues: number;
    material_distribution: Record<string, number>;
    avg_optimization_coverage_pct: number;
  };
  /** Fleet text report */
  fleet_report: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class BatchPhysicsOptimizationEngine {
  /**
   * Optimize a batch of programs.
   */
  optimizeBatch(input: BatchOptimizeInput): BatchOptimizeResult {
    const unitSystem = input.unit_system ?? "imperial";
    const maxPrograms = input.max_programs ?? 100;

    let programs = [...input.programs];
    if (input.sort_by === "line_count") {
      programs.sort((a, b) => b.lineCount - a.lineCount);
    }
    programs = programs.slice(0, maxPrograms);

    const records: OptimizationRecord[] = [];
    const materialDist: Record<string, number> = {};

    for (const prog of programs) {
      try {
        const result = programPhysicsOptimizerEngine.optimize({
          program: prog,
          unit_system: unitSystem,
          machine_max_power_kw: input.machine_max_power_kw,
          machine_max_rpm: input.machine_max_rpm,
          target_tool_life_min: input.target_tool_life_min,
          customer_name: input.customer_name,
        });

        const report = optimizationReportGeneratorEngine.generate(
          prog.filename,
          result,
        );

        // Track material distribution
        const mat = result.material.iso_group;
        materialDist[mat] = (materialDist[mat] ?? 0) + 1;

        records.push({
          filename: prog.filename,
          success: true,
          result,
          report,
        });
      } catch (err: any) {
        log.warn(`[BatchOptimization] Failed to optimize ${prog.filename}: ${err.message}`);
        records.push({
          filename: prog.filename,
          success: false,
          error: err.message ?? String(err),
        });
      }
    }

    // Build fleet summary
    const successful = records.filter(r => r.success);
    const totalCutting = successful.reduce(
      (s, r) => s + (r.result?.summary.cutting_blocks ?? 0), 0,
    );
    const totalChanged = successful.reduce(
      (s, r) => s + (r.result?.summary.blocks_changed ?? 0), 0,
    );
    const totalOrigCycle = successful.reduce(
      (s, r) => s + (r.result?.summary.original_cycle_time_est_sec ?? 0), 0,
    );
    const totalOptCycle = successful.reduce(
      (s, r) => s + (r.result?.summary.optimized_cycle_time_est_sec ?? 0), 0,
    );
    const toolLives = successful
      .map(r => r.result?.summary.avg_tool_life_min ?? 0)
      .filter(l => l > 0);
    const avgLife = toolLives.length > 0
      ? toolLives.reduce((a, b) => a + b, 0) / toolLives.length
      : 0;
    const safetyIssues = successful.filter(
      r => (r.result?.summary.safety_issues ?? 0) > 0,
    ).length;
    const coverages = successful
      .map(r => r.report?.summary.optimization_coverage_pct ?? 0);
    const avgCoverage = coverages.length > 0
      ? coverages.reduce((a, b) => a + b, 0) / coverages.length
      : 0;

    const timeSavingsSec = totalOrigCycle - totalOptCycle;
    const timeSavingsPct = totalOrigCycle > 0
      ? (timeSavingsSec / totalOrigCycle) * 100
      : 0;

    const fleetSummary: BatchOptimizeResult["fleet_summary"] = {
      total_programs: programs.length,
      successful: successful.length,
      failed: records.length - successful.length,
      total_cutting_blocks: totalCutting,
      total_blocks_optimized: totalChanged,
      total_original_cycle_sec: totalOrigCycle,
      total_optimized_cycle_sec: totalOptCycle,
      total_time_savings_sec: timeSavingsSec,
      total_time_savings_pct: Math.round(timeSavingsPct * 10) / 10,
      avg_tool_life_min: Math.round(avgLife * 10) / 10,
      programs_with_safety_issues: safetyIssues,
      material_distribution: materialDist,
      avg_optimization_coverage_pct: Math.round(avgCoverage * 10) / 10,
    };

    const fleetReport = this._formatFleetReport(fleetSummary, records);

    log.info(
      `[BatchOptimization] ${successful.length}/${programs.length} programs optimized, ` +
      `${timeSavingsSec}s total savings (${timeSavingsPct.toFixed(1)}%)`,
    );

    return {
      records,
      fleet_summary: fleetSummary,
      fleet_report: fleetReport,
    };
  }

  private _formatFleetReport(
    summary: BatchOptimizeResult["fleet_summary"],
    records: OptimizationRecord[],
  ): string {
    const lines: string[] = [];
    const sep = "=".repeat(72);

    lines.push(sep);
    lines.push("FLEET-WIDE PHYSICS OPTIMIZATION REPORT");
    lines.push(sep);
    lines.push("");
    lines.push(`Programs analyzed:       ${summary.total_programs}`);
    lines.push(`Successfully optimized:  ${summary.successful}`);
    lines.push(`Failed:                  ${summary.failed}`);
    lines.push("");
    lines.push(`Total cutting blocks:    ${summary.total_cutting_blocks}`);
    lines.push(`Blocks optimized:        ${summary.total_blocks_optimized}`);
    lines.push(`Optimization coverage:   ${summary.avg_optimization_coverage_pct}%`);
    lines.push("");
    lines.push(`Total cycle time (orig): ${summary.total_original_cycle_sec}s`);
    lines.push(`Total cycle time (opt):  ${summary.total_optimized_cycle_sec}s`);
    lines.push(`Total time savings:      ${summary.total_time_savings_sec}s (${summary.total_time_savings_pct}%)`);
    lines.push("");
    lines.push(`Avg tool life:           ${summary.avg_tool_life_min} min`);
    lines.push(`Safety issues found:     ${summary.programs_with_safety_issues} programs`);
    lines.push("");

    // Material distribution
    lines.push("Material Distribution:");
    for (const [iso, count] of Object.entries(summary.material_distribution).sort()) {
      lines.push(`  ${iso}: ${count} programs`);
    }
    lines.push("");

    // Top 10 programs by time savings
    const sorted = records
      .filter(r => r.success && r.result)
      .sort((a, b) =>
        (b.result!.summary.time_savings_pct) - (a.result!.summary.time_savings_pct),
      )
      .slice(0, 10);

    if (sorted.length > 0) {
      lines.push("Top 10 Programs by Time Savings:");
      for (const r of sorted) {
        const s = r.result!.summary;
        lines.push(
          `  ${r.filename.padEnd(30)} ${s.time_savings_pct}% savings, ` +
          `${s.blocks_changed}/${s.cutting_blocks} blocks, ` +
          `max ${s.max_power_kW} kW, ${s.safety_issues} safety issues`,
        );
      }
    }

    lines.push("");
    lines.push(sep);

    return lines.join("\n");
  }
}

export const batchPhysicsOptimizationEngine = new BatchPhysicsOptimizationEngine();
