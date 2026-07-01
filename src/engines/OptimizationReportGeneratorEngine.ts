/**
 * OptimizationReportGeneratorEngine — Before/after comparison report
 *
 * For each optimized program, produces a structured comparison:
 *   - Per-block: original S/F, optimized S/F, Fc, power, deflection, Ra, tool life
 *   - Per-tool: aggregated metrics for each tool station
 *   - Summary: cycle time savings, tool life improvement, surface finish, safety
 *
 * Output format suitable for display in PRISM web UI and CLI.
 *
 * @module OptimizationReportGeneratorEngine
 */

import { log } from "../utils/Logger.js";
import type { ProgramOptimizeResult, BlockOptimization } from "./ProgramPhysicsOptimizerEngine.js";
import type { ResolvedMaterial } from "./MaterialResolverForProgramsEngine.js";
import type { ResolvedTool } from "./ToolResolverForProgramsEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Per-tool section in the report */
export interface ToolReport {
  /** Tool station number */
  station: number;
  /** Tool type */
  tool_type: string;
  /** Tool comment from program */
  comment: string;
  /** Original speed (SFM/RPM) */
  original_speed: number;
  /** Optimized speed */
  optimized_speed: number;
  /** Speed change % */
  speed_change_pct: number;
  /** Original feed */
  original_feed: number;
  /** Optimized feed */
  optimized_feed: number;
  /** Feed change % */
  feed_change_pct: number;
  /** Max cutting force in this tool's blocks [N] */
  max_force_N: number;
  /** Max power [kW] */
  max_power_kW: number;
  /** Max deflection [mm] */
  max_deflection_mm: number;
  /** Worst predicted Ra [µm] */
  worst_Ra_um: number;
  /** Estimated tool life [min] */
  tool_life_min: number;
  /** Number of cutting blocks */
  cutting_blocks: number;
  /** Number of blocks changed */
  blocks_changed: number;
  /** Notes/warnings */
  notes: string[];
}

/** Full optimization report */
export interface OptimizationReport {
  /** Program filename */
  filename: string;
  /** Material information */
  material: {
    name: string;
    iso_group: string;
    hardness_hb: number;
    confidence: number;
    source: string;
  };
  /** Per-tool reports */
  tools: ToolReport[];
  /** Block-level detail table */
  block_table: Array<{
    line: number;
    tool: number;
    orig_S: number;
    opt_S: number;
    orig_F: number;
    opt_F: number;
    Fc_N: number;
    power_kW: number;
    defl_mm: number;
    Ra_um: number;
    life_min: number;
    changed: boolean;
  }>;
  /** Summary */
  summary: {
    total_tools: number;
    total_cutting_blocks: number;
    blocks_optimized: number;
    original_cycle_time_sec: number;
    optimized_cycle_time_sec: number;
    time_savings_pct: number;
    time_savings_sec: number;
    avg_tool_life_min: number;
    worst_Ra_original_um: number;
    worst_Ra_optimized_um: number;
    ra_improvement_pct: number;
    max_power_kW: number;
    max_force_N: number;
    max_deflection_mm: number;
    safety_issues: number;
    optimization_coverage_pct: number;
  };
  /** Text report for display */
  text_report: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class OptimizationReportGeneratorEngine {
  /**
   * Generate a comparison report from optimization results.
   */
  generate(
    filename: string,
    result: ProgramOptimizeResult,
  ): OptimizationReport {
    // Build per-tool reports
    const toolReports = this._buildToolReports(result);

    // Build block table
    const blockTable = this._buildBlockTable(result);

    // Build summary
    const summary = this._buildSummary(result, toolReports);

    // Generate text report
    const textReport = this._formatTextReport(filename, result, toolReports, summary);

    log.info(
      `[OptimizationReport] ${filename}: ${summary.blocks_optimized}/${summary.total_cutting_blocks} blocks optimized, ` +
      `${summary.time_savings_pct}% time savings`,
    );

    return {
      filename,
      material: {
        name: result.material.name,
        iso_group: result.material.iso_group,
        hardness_hb: result.material.hardness_hb,
        confidence: result.material.confidence,
        source: result.material.source,
      },
      tools: toolReports,
      block_table: blockTable,
      summary,
      text_report: textReport,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────

  private _buildToolReports(result: ProgramOptimizeResult): ToolReport[] {
    const reports: ToolReport[] = [];

    for (const tool of result.tools) {
      // Find cutting blocks for this tool
      const toolBlocks = this._getBlocksForTool(result.blocks, tool.station, result);
      const cuttingBlocks = toolBlocks.filter(b => b.is_cutting);

      if (cuttingBlocks.length === 0) {
        reports.push({
          station: tool.station,
          tool_type: tool.tool_type,
          comment: tool.comment,
          original_speed: 0,
          optimized_speed: 0,
          speed_change_pct: 0,
          original_feed: 0,
          optimized_feed: 0,
          feed_change_pct: 0,
          max_force_N: 0,
          max_power_kW: 0,
          max_deflection_mm: 0,
          worst_Ra_um: 0,
          tool_life_min: 0,
          cutting_blocks: 0,
          blocks_changed: 0,
          notes: ["No cutting blocks found for this tool"],
        });
        continue;
      }

      const origSpeed = cuttingBlocks[0].original_speed;
      const optSpeed = cuttingBlocks[0].optimized_speed;
      const origFeed = cuttingBlocks[0].original_feed;
      const optFeed = cuttingBlocks[0].optimized_feed;

      reports.push({
        station: tool.station,
        tool_type: tool.tool_type,
        comment: tool.comment,
        original_speed: origSpeed,
        optimized_speed: optSpeed,
        speed_change_pct: origSpeed > 0
          ? Math.round((optSpeed - origSpeed) / origSpeed * 1000) / 10
          : 0,
        original_feed: origFeed,
        optimized_feed: optFeed,
        feed_change_pct: origFeed > 0
          ? Math.round((optFeed - origFeed) / origFeed * 1000) / 10
          : 0,
        max_force_N: Math.max(...cuttingBlocks.map(b => b.cutting_force_N), 0),
        max_power_kW: Math.max(...cuttingBlocks.map(b => b.power_kW), 0),
        max_deflection_mm: Math.max(...cuttingBlocks.map(b => b.deflection_mm), 0),
        worst_Ra_um: Math.max(...cuttingBlocks.map(b => b.predicted_Ra_um), 0),
        tool_life_min: cuttingBlocks[0].tool_life_min,
        cutting_blocks: cuttingBlocks.length,
        blocks_changed: cuttingBlocks.filter(b => b.changed).length,
        notes: [...new Set(cuttingBlocks.flatMap(b => b.notes))],
      });
    }

    return reports;
  }

  private _getBlocksForTool(
    blocks: BlockOptimization[],
    station: number,
    result: ProgramOptimizeResult,
  ): BlockOptimization[] {
    // Find blocks between tool changes
    const lines = result.optimized_lines;
    let inTool = false;
    const toolBlocks: BlockOptimization[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const text = blocks[i].original_text.trim().toUpperCase();
      const tMatch = text.match(/^T(\d{2})/);
      if (tMatch) {
        inTool = parseInt(tMatch[1], 10) === station;
      }
      if (inTool) {
        toolBlocks.push(blocks[i]);
      }
    }

    return toolBlocks;
  }

  private _buildBlockTable(
    result: ProgramOptimizeResult,
  ): OptimizationReport["block_table"] {
    let currentTool = 0;
    return result.blocks
      .filter(b => b.is_cutting)
      .map(b => {
        // Track tool from context
        const text = b.original_text.trim().toUpperCase();
        const tMatch = text.match(/^T(\d{2})/);
        if (tMatch) currentTool = parseInt(tMatch[1], 10);

        return {
          line: b.line,
          tool: currentTool,
          orig_S: b.original_speed,
          opt_S: b.optimized_speed,
          orig_F: b.original_feed,
          opt_F: b.optimized_feed,
          Fc_N: b.cutting_force_N,
          power_kW: b.power_kW,
          defl_mm: b.deflection_mm,
          Ra_um: b.predicted_Ra_um,
          life_min: b.tool_life_min,
          changed: b.changed,
        };
      });
  }

  private _buildSummary(
    result: ProgramOptimizeResult,
    toolReports: ToolReport[],
  ): OptimizationReport["summary"] {
    const s = result.summary;
    const timeSavingsSec = s.original_cycle_time_est_sec - s.optimized_cycle_time_est_sec;

    const raImprovePct = s.worst_Ra_original_um > 0
      ? Math.round((s.worst_Ra_original_um - s.worst_Ra_optimized_um) / s.worst_Ra_original_um * 1000) / 10
      : 0;

    const optimizationCoverage = s.cutting_blocks > 0
      ? Math.round(s.blocks_changed / s.cutting_blocks * 1000) / 10
      : 0;

    return {
      total_tools: toolReports.length,
      total_cutting_blocks: s.cutting_blocks,
      blocks_optimized: s.blocks_changed,
      original_cycle_time_sec: s.original_cycle_time_est_sec,
      optimized_cycle_time_sec: s.optimized_cycle_time_est_sec,
      time_savings_pct: s.time_savings_pct,
      time_savings_sec: timeSavingsSec,
      avg_tool_life_min: s.avg_tool_life_min,
      worst_Ra_original_um: s.worst_Ra_original_um,
      worst_Ra_optimized_um: s.worst_Ra_optimized_um,
      ra_improvement_pct: raImprovePct,
      max_power_kW: s.max_power_kW,
      max_force_N: s.max_force_N,
      max_deflection_mm: s.max_deflection_mm,
      safety_issues: s.safety_issues,
      optimization_coverage_pct: optimizationCoverage,
    };
  }

  private _formatTextReport(
    filename: string,
    result: ProgramOptimizeResult,
    toolReports: ToolReport[],
    summary: OptimizationReport["summary"],
  ): string {
    const lines: string[] = [];
    const sep = "=".repeat(72);
    const sep2 = "-".repeat(72);

    lines.push(sep);
    lines.push(`PHYSICS OPTIMIZATION REPORT: ${filename}`);
    lines.push(sep);
    lines.push("");

    // Material
    lines.push(`Material: ${result.material.name} (${result.material.iso_group})`);
    lines.push(`  Hardness: ${result.material.hardness_hb} HB`);
    lines.push(`  Kienzle: kc1.1=${result.material.kc1_1} N/mm², mc=${result.material.mc}`);
    lines.push(`  Confidence: ${(result.material.confidence * 100).toFixed(0)}% (${result.material.source})`);
    lines.push("");

    // Per-tool summary
    lines.push(sep2);
    lines.push("TOOL SUMMARY");
    lines.push(sep2);
    lines.push(
      "Stn | Type           | Orig S  → Opt S  | Orig F   → Opt F   | Fc(N) | P(kW) | Ra(µm) | Life",
    );
    lines.push(sep2);

    for (const t of toolReports) {
      lines.push(
        `T${String(t.station).padStart(2, "0")} | ${t.tool_type.padEnd(14)} ` +
        `| ${String(t.original_speed).padStart(6)} → ${String(t.optimized_speed).padStart(6)} ` +
        `| ${t.original_feed.toFixed(4).padStart(8)} → ${t.optimized_feed.toFixed(4).padStart(8)} ` +
        `| ${String(t.max_force_N).padStart(5)} ` +
        `| ${t.max_power_kW.toFixed(1).padStart(5)} ` +
        `| ${t.worst_Ra_um.toFixed(2).padStart(6)} ` +
        `| ${t.tool_life_min.toFixed(0).padStart(4)}m`,
      );
    }
    lines.push("");

    // Overall summary
    lines.push(sep2);
    lines.push("OPTIMIZATION SUMMARY");
    lines.push(sep2);
    lines.push(`  Cutting blocks:      ${summary.total_cutting_blocks}`);
    lines.push(`  Blocks optimized:    ${summary.blocks_optimized} (${summary.optimization_coverage_pct}%)`);
    lines.push(`  Cycle time (est):    ${summary.original_cycle_time_sec}s → ${summary.optimized_cycle_time_sec}s (${summary.time_savings_pct}% savings)`);
    lines.push(`  Avg tool life:       ${summary.avg_tool_life_min} min`);
    lines.push(`  Worst Ra (orig):     ${summary.worst_Ra_original_um} µm`);
    lines.push(`  Worst Ra (opt):      ${summary.worst_Ra_optimized_um} µm (${summary.ra_improvement_pct}% improvement)`);
    lines.push(`  Max power:           ${summary.max_power_kW} kW`);
    lines.push(`  Max force:           ${summary.max_force_N} N`);
    lines.push(`  Max deflection:      ${summary.max_deflection_mm} mm`);
    lines.push(`  Safety issues:       ${summary.safety_issues}`);
    lines.push("");
    lines.push(sep);

    return lines.join("\n");
  }
}

export const optimizationReportGeneratorEngine = new OptimizationReportGeneratorEngine();
