/**
 * OptimizationReportEngine — PP-REV-MS0 U-REV01/U-REV02
 *
 * Takes original G-code, runs it through PostProcessorPipelineEngine,
 * and produces a structured before/after optimization report showing
 * exactly what PRISM improved and by how much.
 *
 * The report is THE sales pitch: "We found 23% cycle time savings,
 * 3 tool life risks, 47s of air cutting detected."
 *
 * Output formats: Markdown (printable), JSON (web UI), HTML (self-contained)
 *
 * @module engines/OptimizationReportEngine
 * @version 1.0.0 PP-REV-MS0
 */

import { postProcessorPipelineEngine, type PipelineInput, type PipelineOutput, type MachineContext, type MaterialContext, type ToolContext } from "./PostProcessorPipelineEngine.js";
import { computeDiff, runABComparison, type ValidationInput, type DiffResult, type ComparisonResult } from "./PostValidationSuiteEngine.js";
import { cycleTimeEstimatorEngine, type CycleTimeResult } from "./CycleTimeEstimatorEngine.js";
import { setupSheetFromGCodeEngine, type SetupSheetResult } from "./SetupSheetFromGCodeEngine.js";
import { toolChangeOptimizationEngine, type ToolChangeResult } from "./ToolChangeOptimizationEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface OptimizationReportInput {
  /** Original G-code program */
  gcode: string;
  /** Machine context (resolved or name-only for auto-resolution) */
  machine?: MachineContext | { name: string; [k: string]: unknown };
  /** Material context */
  material?: MaterialContext | { name: string; iso_group?: string; [k: string]: unknown };
  /** Tool definitions */
  tools?: ToolContext[];
  /** Controller family */
  controller?: string;
  /** Optimization aggressiveness (0-1) */
  aggressiveness?: number;
  /** Target tolerance in mm */
  tolerance_mm?: number;
  /** Target surface finish in µm */
  surface_finish_Ra?: number;
  /** Output format */
  format?: "markdown" | "json" | "html";
  /** Program name for report header */
  program_name?: string;
}

export interface ToolReport {
  tool_number: number;
  tool_type: string;
  diameter_mm: number;
  blocks_optimized: number;
  original_rpm_range: [number, number];
  optimized_rpm_range: [number, number];
  original_feed_range: [number, number];
  optimized_feed_range: [number, number];
  max_force_N: number;
  max_power_kW: number;
  optimization_reasons: string[];
}

export interface ReportSummary {
  program_name: string;
  machine_name: string;
  material_name: string;
  controller: string;
  total_blocks: number;
  blocks_optimized: number;
  optimization_pct: number;
  cycle_time_original_sec: number;
  cycle_time_optimized_sec: number;
  cycle_time_saved_sec: number;
  cycle_time_saved_pct: number;
  feed_changes: number;
  rpm_changes: number;
  max_force_N: number;
  avg_force_N: number;
  max_power_kW: number;
  recommendations: string[];
  tool_count: number;
  stages_executed: number;
  pipeline_duration_ms: number;
}

export interface OptimizationReport {
  summary: ReportSummary;
  per_tool: ToolReport[];
  diff: DiffResult;
  comparison: ComparisonResult;
  cycle_time: CycleTimeResult | null;
  setup_sheet: SetupSheetResult | null;
  tool_optimization: ToolChangeResult | null;
  recommendations: string[];
  report_markdown: string;
  report_json: string;
  report_html: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

class OptimizationReportEngineImpl {

  /**
   * Generate a complete optimization report.
   * Runs the pipeline on the input G-code, computes diff/comparison,
   * estimates cycle time, and formats the report in all three formats.
   */
  async generate(input: OptimizationReportInput): Promise<OptimizationReport> {
    const programName = input.program_name ?? "PROGRAM";
    const controller = (input.controller ?? "fanuc") as any;

    // 1. Run the pipeline
    const pipelineInput: PipelineInput = {
      gcode: input.gcode,
      machine: input.machine as any,
      material: input.material as any,
      tools: input.tools,
      controller,
      aggressiveness: input.aggressiveness ?? 0.5,
      tolerance_mm: input.tolerance_mm,
      surface_finish_Ra: input.surface_finish_Ra,
    };

    const pipeResult = await postProcessorPipelineEngine.process(pipelineInput);

    // 2. Compute diff between original and optimized
    const diff = computeDiff(input.gcode, pipeResult.output_gcode);

    // 3. Run A/B comparison
    const machineLimits = pipeResult.resolved.machine
      ? { max_rpm: pipeResult.resolved.machine.max_rpm, max_feed: 25000, max_power_kW: pipeResult.resolved.machine.max_power_kW }
      : { max_rpm: 12000, max_feed: 25000, max_power_kW: 30 };

    const valInput: ValidationInput = {
      original_gcode: input.gcode,
      optimized_gcode: pipeResult.output_gcode,
      controller,
      machine_limits: machineLimits,
      material_iso: (pipeResult.resolved.material?.iso_group ?? "P") as string,
      operations: pipeResult.resolved.tools?.map((t, i) => ({
        tool_number: parseInt(t.id) || (i + 1),
        tool_diameter_mm: t.diameter_mm,
        operation_type: "general",
      })) ?? [],
    };

    const comparison = runABComparison(valInput);

    // 4. Cycle time estimation
    let cycleTime: CycleTimeResult | null = null;
    try {
      const ctOriginal = cycleTimeEstimatorEngine.estimateFromGCode(input.gcode, {
        controller: controller as any,
        include_breakdown: true,
      });
      const ctOptimized = cycleTimeEstimatorEngine.estimateFromGCode(pipeResult.output_gcode, {
        controller: controller as any,
        include_breakdown: true,
      });
      // Use the optimized cycle time as the primary result
      cycleTime = ctOptimized;
      // Override comparison times with accurate estimates
      comparison.cycle_time_original_sec = ctOriginal.total_seconds;
      comparison.cycle_time_optimized_sec = ctOptimized.total_seconds;
      comparison.time_saved_sec = ctOriginal.total_seconds - ctOptimized.total_seconds;
      comparison.time_saved_percent = ctOriginal.total_seconds > 0
        ? ((ctOriginal.total_seconds - ctOptimized.total_seconds) / ctOriginal.total_seconds) * 100
        : 0;
    } catch {
      // Cycle time estimation is non-critical
    }

    // 5. Generate setup sheet from optimized output
    let setupSheet: SetupSheetResult | null = null;
    try {
      setupSheet = setupSheetFromGCodeEngine.generateSetupSheet(pipeResult.output_gcode, {
        controller: controller as any,
        part_number: programName,
        operation_name: programName,
        machine_name: (input.machine as any)?.name,
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });
    } catch {
      // Setup sheet is non-critical
    }

    // 5b. Tool change optimization analysis
    let toolOptimization: ToolChangeResult | null = null;
    try {
      // Extract tool sequence from pipeline blocks
      const toolSequence: { id: string; tool_id: string; tool_diameter_mm: number }[] = [];
      let opIdx = 0;
      let prevTool = "";
      for (const block of pipeResult.blocks) {
        const toolNum = block.tool_number ?? (block as any).T;
        if (toolNum !== undefined && String(toolNum) !== prevTool) {
          const toolId = `T${toolNum}`;
          const toolCtx = pipeResult.resolved.tools?.find(t => t.id === String(toolNum) || t.id === toolId);
          toolSequence.push({
            id: `op${++opIdx}`,
            tool_id: toolId,
            tool_diameter_mm: toolCtx?.diameter_mm ?? 10,
          });
          prevTool = String(toolNum);
        }
      }
      if (toolSequence.length >= 2) {
        toolOptimization = toolChangeOptimizationEngine.optimizeToolChanges(toolSequence, []);
      }
    } catch {
      // Tool optimization is non-critical
    }

    // 6. Build per-tool breakdown
    const perTool = this._buildPerToolReport(pipeResult);

    // 7. Build recommendations
    const recommendations = this._buildRecommendations(pipeResult, diff, comparison, perTool);
    if (toolOptimization && toolOptimization.changes_saved > 0) {
      recommendations.push(`Tool change optimization: ${toolOptimization.changes_saved} unnecessary tool changes found, saving ~${toolOptimization.time_saved_sec}s`);
    }

    // 8. Build summary
    const forces = pipeResult.blocks.filter(b => b.forces).map(b => b.forces!);
    const maxForce = forces.length > 0 ? Math.max(...forces.map(f => f.Fc_N)) : 0;
    const avgForce = forces.length > 0 ? forces.reduce((s, f) => s + f.Fc_N, 0) / forces.length : 0;
    const maxPower = forces.length > 0 ? Math.max(...forces.map(f => f.power_kW)) : 0;

    const summary: ReportSummary = {
      program_name: programName,
      machine_name: pipeResult.resolved.machine?.name ?? "Unknown Machine",
      material_name: pipeResult.resolved.material?.name ?? "Unknown Material",
      controller,
      total_blocks: pipeResult.blocks.length,
      blocks_optimized: pipeResult.blocks.filter(b => b.optimization).length,
      optimization_pct: pipeResult.blocks.length > 0
        ? Math.round(pipeResult.blocks.filter(b => b.optimization).length / pipeResult.blocks.length * 100)
        : 0,
      cycle_time_original_sec: comparison.cycle_time_original_sec,
      cycle_time_optimized_sec: comparison.cycle_time_optimized_sec,
      cycle_time_saved_sec: comparison.time_saved_sec,
      cycle_time_saved_pct: Math.round(comparison.time_saved_percent * 10) / 10,
      feed_changes: diff.feed_changes.count,
      rpm_changes: diff.rpm_changes.count,
      max_force_N: Math.round(maxForce),
      avg_force_N: Math.round(avgForce),
      max_power_kW: Math.round(maxPower * 100) / 100,
      recommendations,
      tool_count: perTool.length,
      stages_executed: pipeResult.stages.filter(s => s.status === "pass").length,
      pipeline_duration_ms: pipeResult.total_duration_ms,
    };

    // 9. Format outputs
    const report_markdown = this._formatMarkdown(summary, perTool, diff, comparison, recommendations, setupSheet);
    const report_json = JSON.stringify({ summary, per_tool: perTool, diff, comparison, cycle_time: cycleTime, setup_sheet: setupSheet, tool_optimization: toolOptimization, recommendations }, null, 2);
    const report_html = this._formatHTML(summary, perTool, recommendations, setupSheet);

    return {
      summary,
      per_tool: perTool,
      diff,
      comparison,
      cycle_time: cycleTime,
      setup_sheet: setupSheet,
      tool_optimization: toolOptimization,
      recommendations,
      report_markdown,
      report_json,
      report_html,
    };
  }

  // ─── Per-Tool Breakdown ──────────────────────────────────────────

  private _buildPerToolReport(pipe: PipelineOutput): ToolReport[] {
    const toolMap = new Map<number, ToolReport>();

    for (const block of pipe.blocks) {
      if (!block.optimization || block.move_type === "G0") continue;
      const tn = block.tool_number ?? 0;
      if (tn === 0) continue;

      if (!toolMap.has(tn)) {
        const tool = pipe.resolved.tools.find(t => parseInt(t.id) === tn) ?? pipe.resolved.tools[0];
        toolMap.set(tn, {
          tool_number: tn,
          tool_type: tool?.type ?? "unknown",
          diameter_mm: tool?.diameter_mm ?? 0,
          blocks_optimized: 0,
          original_rpm_range: [Infinity, 0],
          optimized_rpm_range: [Infinity, 0],
          original_feed_range: [Infinity, 0],
          optimized_feed_range: [Infinity, 0],
          max_force_N: 0,
          max_power_kW: 0,
          optimization_reasons: [],
        });
      }

      const tr = toolMap.get(tn)!;
      tr.blocks_optimized++;

      const opt = block.optimization;
      if (opt.original_rpm > 0) {
        tr.original_rpm_range[0] = Math.min(tr.original_rpm_range[0], opt.original_rpm);
        tr.original_rpm_range[1] = Math.max(tr.original_rpm_range[1], opt.original_rpm);
      }
      tr.optimized_rpm_range[0] = Math.min(tr.optimized_rpm_range[0], opt.optimized_rpm);
      tr.optimized_rpm_range[1] = Math.max(tr.optimized_rpm_range[1], opt.optimized_rpm);

      if (opt.original_feed > 0) {
        tr.original_feed_range[0] = Math.min(tr.original_feed_range[0], opt.original_feed);
        tr.original_feed_range[1] = Math.max(tr.original_feed_range[1], opt.original_feed);
      }
      tr.optimized_feed_range[0] = Math.min(tr.optimized_feed_range[0], opt.optimized_feed);
      tr.optimized_feed_range[1] = Math.max(tr.optimized_feed_range[1], opt.optimized_feed);

      if (block.forces) {
        tr.max_force_N = Math.max(tr.max_force_N, block.forces.Fc_N);
        tr.max_power_kW = Math.max(tr.max_power_kW, block.forces.power_kW);
      }

      for (const r of opt.reasons) {
        if (!tr.optimization_reasons.includes(r) && tr.optimization_reasons.length < 10) {
          tr.optimization_reasons.push(r);
        }
      }
    }

    // Fix Infinity values for tools with no range data
    for (const tr of toolMap.values()) {
      if (tr.original_rpm_range[0] === Infinity) tr.original_rpm_range = [0, 0];
      if (tr.optimized_rpm_range[0] === Infinity) tr.optimized_rpm_range = [0, 0];
      if (tr.original_feed_range[0] === Infinity) tr.original_feed_range = [0, 0];
      if (tr.optimized_feed_range[0] === Infinity) tr.optimized_feed_range = [0, 0];
    }

    return [...toolMap.values()].sort((a, b) => a.tool_number - b.tool_number);
  }

  // ─── Recommendations ─────────────────────────────────────────────

  private _buildRecommendations(
    pipe: PipelineOutput,
    diff: DiffResult,
    comparison: ComparisonResult,
    perTool: ToolReport[],
  ): string[] {
    const recs: string[] = [];

    // Cycle time
    if (comparison.time_saved_percent > 5) {
      recs.push(`Cycle time reduced by ${comparison.time_saved_percent.toFixed(1)}% (${comparison.time_saved_sec.toFixed(1)}s saved per part)`);
    }

    // Force warnings
    for (const tr of perTool) {
      if (tr.max_force_N > 5000) {
        recs.push(`T${tr.tool_number}: High cutting force (${tr.max_force_N.toFixed(0)}N) — consider reducing depth of cut or using larger diameter`);
      }
      if (tr.max_power_kW > (pipe.resolved.machine?.max_power_kW ?? 30) * 0.8) {
        recs.push(`T${tr.tool_number}: Power usage at ${((tr.max_power_kW / (pipe.resolved.machine?.max_power_kW ?? 30)) * 100).toFixed(0)}% of machine capacity — reduce aggressiveness for safety margin`);
      }
    }

    // Missing features from pipeline warnings
    for (const w of pipe.warnings ?? []) {
      if (w.startsWith("SAFETY:") || w.startsWith("PLAYBOOK:") || w.startsWith("COOLANT:")) {
        recs.push(w);
      }
    }

    // Feed change summary
    if (diff.feed_changes.count > 0) {
      recs.push(`${diff.feed_changes.count} feed rate changes applied (avg ${diff.feed_changes.avg_delta_percent > 0 ? "+" : ""}${diff.feed_changes.avg_delta_percent.toFixed(1)}%)`);
    }

    // RPM changes
    if (diff.rpm_changes.count > 0) {
      recs.push(`${diff.rpm_changes.count} spindle speed adjustments for optimal cutting speed`);
    }

    // HSM injection
    const hsmStage = pipe.stages.find(s => s.stage === "3.5_controller_features");
    if (hsmStage?.data && (hsmStage.data as any).features_injected?.length > 0) {
      recs.push(`Controller-specific HSM codes injected: ${(hsmStage.data as any).features_injected.join(", ")}`);
    }

    if (recs.length === 0) {
      recs.push("Program is already well-optimized — minimal changes recommended");
    }

    return recs;
  }

  // ─── Markdown Format ─────────────────────────────────────────────

  private _formatMarkdown(
    summary: ReportSummary,
    perTool: ToolReport[],
    diff: DiffResult,
    comparison: ComparisonResult,
    recs: string[],
    setupSheet?: SetupSheetResult | null,
  ): string {
    const lines: string[] = [];

    lines.push(`# PRISM Optimization Report`);
    lines.push(`## ${summary.program_name}`);
    lines.push(``);
    lines.push(`**Machine:** ${summary.machine_name} | **Material:** ${summary.material_name} | **Controller:** ${summary.controller}`);
    lines.push(`**Generated:** ${new Date().toISOString().split("T")[0]} | **Pipeline:** ${summary.stages_executed} stages in ${summary.pipeline_duration_ms}ms`);
    lines.push(``);

    // Executive Summary
    lines.push(`## Executive Summary`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Blocks optimized | ${summary.blocks_optimized}/${summary.total_blocks} (${summary.optimization_pct}%) |`);
    lines.push(`| Cycle time saved | ${summary.cycle_time_saved_sec.toFixed(1)}s (${summary.cycle_time_saved_pct}%) |`);
    lines.push(`| Feed changes | ${summary.feed_changes} |`);
    lines.push(`| RPM changes | ${summary.rpm_changes} |`);
    lines.push(`| Max cutting force | ${summary.max_force_N} N |`);
    lines.push(`| Max spindle power | ${summary.max_power_kW} kW |`);
    lines.push(`| Tools analyzed | ${summary.tool_count} |`);
    lines.push(``);

    // Per-Tool Breakdown
    if (perTool.length > 0) {
      lines.push(`## Per-Tool Breakdown`);
      lines.push(``);
      lines.push(`| Tool | Type | Dia | Blocks | RPM (orig→opt) | Feed (orig→opt) | Fc max | P max |`);
      lines.push(`|------|------|-----|--------|----------------|-----------------|--------|-------|`);
      for (const t of perTool) {
        lines.push(`| T${t.tool_number} | ${t.tool_type} | ${t.diameter_mm}mm | ${t.blocks_optimized} | ${t.original_rpm_range[1]}→${t.optimized_rpm_range[0]}-${t.optimized_rpm_range[1]} | ${t.original_feed_range[1]}→${t.optimized_feed_range[0]}-${t.optimized_feed_range[1]} | ${t.max_force_N.toFixed(0)}N | ${t.max_power_kW.toFixed(1)}kW |`);
      }
      lines.push(``);
    }

    // Setup Sheet
    if (setupSheet?.setup_sheet) {
      const ss = setupSheet.setup_sheet;
      lines.push(`## Setup Sheet — What You Need Before You Start`);
      lines.push(``);
      if (ss.tools.length > 0) {
        lines.push(`### Tool List`);
        lines.push(`| # | H | D | Description | RPM | Feed | Coolant | Min Z |`);
        lines.push(`|---|---|---|-------------|-----|------|---------|-------|`);
        for (const t of ss.tools) {
          const minZ = t.z_depths.length > 0 ? Math.min(...t.z_depths).toFixed(1) : "—";
          lines.push(`| T${t.number} | H${t.offset_h} | D${t.offset_d} | ${t.description_guess} | ${t.rpm_values[0] ?? "—"} | ${t.feed_values[0] ?? "—"} | ${t.coolant} | ${minZ} |`);
        }
        lines.push(``);
      }
      if (ss.work_offsets.length > 0) {
        lines.push(`### Work Offsets`);
        for (const o of ss.work_offsets) {
          lines.push(`- **${o.code}** — used ${o.use_count} time(s)`);
        }
        lines.push(``);
      }
      lines.push(`### Cycle Time Estimate`);
      lines.push(`- **${ss.cycle_time_est_s > 0 ? (ss.cycle_time_est_s / 60).toFixed(1) + " min" : "N/A"}** estimated cycle time`);
      lines.push(`- Coolant required: **${ss.coolant_required ? "Yes" : "No"}**`);
      lines.push(``);
      if (ss.safety_notes.length > 0) {
        lines.push(`### Safety Notes`);
        for (const note of ss.safety_notes) {
          lines.push(`- ${note}`);
        }
        lines.push(``);
      }
    }

    // Recommendations
    lines.push(`## Recommendations`);
    lines.push(``);
    for (const r of recs) {
      lines.push(`- ${r}`);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(`*Generated by PRISM Manufacturing Intelligence Platform*`);

    return lines.join("\n");
  }

  // ─── HTML Format ─────────────────────────────────────────────────

  private _formatHTML(
    summary: ReportSummary,
    perTool: ToolReport[],
    recs: string[],
    setupSheet?: SetupSheetResult | null,
  ): string {
    const savedPct = summary.cycle_time_saved_pct;
    const savedColor = savedPct > 10 ? "#16a34a" : savedPct > 0 ? "#ca8a04" : "#dc2626";

    const toolRows = perTool.map(t => `
      <tr>
        <td>T${t.tool_number}</td>
        <td>${t.tool_type}</td>
        <td>${t.diameter_mm}mm</td>
        <td>${t.blocks_optimized}</td>
        <td>${t.original_rpm_range[1]} → ${t.optimized_rpm_range[0]}-${t.optimized_rpm_range[1]}</td>
        <td>${t.original_feed_range[1]} → ${t.optimized_feed_range[0]}-${t.optimized_feed_range[1]}</td>
        <td>${t.max_force_N.toFixed(0)} N</td>
        <td>${t.max_power_kW.toFixed(1)} kW</td>
      </tr>`).join("\n");

    const recItems = recs.map(r => `<li>${r}</li>`).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PRISM Optimization Report — ${summary.program_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; max-width: 900px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; margin-bottom: 8px; }
  .header .meta { font-size: 13px; opacity: 0.85; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .section { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px; }
  .section h2 { font-size: 16px; margin-bottom: 12px; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 14px; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
  .footer a { color: #7c3aed; }
</style>
</head>
<body>
  <div class="header">
    <h1>PRISM Optimization Report</h1>
    <div class="meta">${summary.program_name} | ${summary.machine_name} | ${summary.material_name} | ${summary.controller} | ${new Date().toISOString().split("T")[0]}</div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="value" style="color:${savedColor}">${savedPct}%</div>
      <div class="label">Cycle Time Saved</div>
    </div>
    <div class="card">
      <div class="value">${summary.blocks_optimized}/${summary.total_blocks}</div>
      <div class="label">Blocks Optimized</div>
    </div>
    <div class="card">
      <div class="value">${summary.max_force_N}N</div>
      <div class="label">Max Cutting Force</div>
    </div>
  </div>

  <div class="section">
    <h2>Per-Tool Breakdown</h2>
    <table>
      <thead>
        <tr><th>Tool</th><th>Type</th><th>Dia</th><th>Blocks</th><th>RPM (orig→opt)</th><th>Feed (orig→opt)</th><th>Fc max</th><th>Power</th></tr>
      </thead>
      <tbody>${toolRows}</tbody>
    </table>
  </div>

  ${setupSheet?.setup_sheet ? `<div class="section">
    <h2>Setup Sheet — What You Need Before You Start</h2>
    <table>
      <thead><tr><th>#</th><th>H</th><th>Description</th><th>RPM</th><th>Feed</th><th>Coolant</th><th>Min Z</th></tr></thead>
      <tbody>${setupSheet.setup_sheet.tools.map(t => `<tr><td>T${t.number}</td><td>H${t.offset_h}</td><td>${t.description_guess}</td><td>${t.rpm_values[0] ?? "—"}</td><td>${t.feed_values[0] ?? "—"}</td><td>${t.coolant}</td><td>${t.z_depths.length > 0 ? Math.min(...t.z_depths).toFixed(1) : "—"}</td></tr>`).join("")}</tbody>
    </table>
    <p style="margin-top:12px;font-size:13px;color:#64748b">Offsets: ${setupSheet.setup_sheet.work_offsets.map(o => o.code).join(", ") || "G54"} | Coolant: ${setupSheet.setup_sheet.coolant_required ? "Required" : "Not required"} | Est. cycle: ${setupSheet.setup_sheet.cycle_time_est_s > 0 ? (setupSheet.setup_sheet.cycle_time_est_s / 60).toFixed(1) + " min" : "N/A"}</p>
  </div>` : ""}

  <div class="section">
    <h2>Recommendations</h2>
    <ul>${recItems}</ul>
  </div>

  <div class="footer">
    Generated by <a href="https://prism.com">PRISM Manufacturing Intelligence</a> — Physics-optimized CNC post processing
  </div>
</body>
</html>`;
  }
}

export const optimizationReportEngine = new OptimizationReportEngineImpl();
