/**
 * PrintToProgramToQuoteBridgeEngine — bridges the full print→CNC pipeline into the quote
 *
 * Operator directive (continued): "synergize the quoting feature to ... full
 * print to cnc program (cad generation and cam programming factored in)
 * pipelines to get more accurate run times, setup time, tooling required,
 * machine hours, overhead, employee pay rate, electricity used".
 *
 * When operator runs the full pipeline (blueprint → CAD recognize → CAM
 * program → post → G-code), capture the totals (estimated G-code runtime,
 * tool list, setup count, op count) and feed them through the same
 * shop-profile rate tables that WizardToQuoteBridge uses.
 *
 * Composes with ShopProfileTemplateEngine for rates + electricity.
 * Composes with GCodeTimeEstimatorEngine when available (lazy import; falls
 * back to caller-supplied cycle time when not).
 *
 * @milestone QUOTING-SYNERGY-MS0/U-PRINT-TO-PROGRAM-TO-QUOTE (charlie /goal-20 iter11)
 */

export interface PipelineSummary {
  /** Domain inferred from the part — drives machine selection. */
  domain: "mill" | "lathe" | "wedm" | "sinker_edm" | "grinder";
  /** Machine family selected by the pipeline. */
  machine_family: string;
  /** Material code from CAD/print recognition. */
  material: string;
  /** Estimated total cycle minutes from G-code (or caller hint). 0 + gcode_text → auto-estimated. */
  estimated_cycle_min: number;
  /** Estimated setup minutes (programming + fixturing). */
  estimated_setup_min: number;
  /** Tools used (deduplicated by id). Empty + gcode_text → auto-populated from G-code T-words. */
  tool_ids: string[];
  /** Number of distinct CAM ops. 0 + gcode_text → uses cutting-block count as proxy. */
  op_count: number;
  /** Programming hours (separate from setup — CAM prog labor, billed at programmer rate). */
  programming_hours?: number;
  /** Optional CAD generation hours (when print didn't supply CAD). */
  cad_generation_hours?: number;
  /** Operator quantity. */
  quantity: number;
  /** Optional raw G-code text — when supplied AND estimated_cycle_min=0, auto-estimated via GCodeTimeEstimatorEngine. */
  gcode_text?: string;
  /** Optional G-code dialect override (auto-detected when unset). */
  gcode_dialect?: "fanuc_mill" | "mazak_lathe" | "sodick_wedm" | "auto";
  /** Optional machine rapid rate (mm/min) for rapid-time estimation (default 30000). */
  machine_rapid_rate_mm_per_min?: number;
  /** Optional tool-change overhead (seconds per change) — default 8. */
  tool_change_overhead_s?: number;
}

export interface PipelineQuoteBridgeResult {
  ok: boolean;
  reason?: string;
  /** Wall-clock machine hours (cycle ÷ utilization). */
  machine_hours_wall_clock: number;
  machine_cost_usd: number;
  setup_cost_usd: number;
  /** Programming hours × programmer rate. */
  programming_cost_usd: number;
  /** CAD generation hours × programmer rate. */
  cad_generation_cost_usd: number;
  /** Labor on the running operator (concurrent with cycle). */
  labor_cost_usd: number;
  electricity_cost_usd: number;
  total_direct_cost_usd: number;
  overhead_cost_usd: number;
  cost_per_part_usd: number;
  /** Tooling-required summary. */
  tool_count: number;
  op_count: number;
  profile_id: string;
  warnings: string[];
  /** When gcode_text was supplied, the auto-estimate breakdown for audit trail. */
  gcode_estimate?: {
    used: boolean;
    dialect?: string;
    block_count?: number;
    cutting_block_count?: number;
    rapid_block_count?: number;
    tool_change_count?: number;
    time_in_cut_min?: number;
    rapid_time_min?: number;
    total_time_min?: number;
    tools_used?: number[];
    reason?: string;
  };
}

export class PrintToProgramToQuoteBridgeEngine {
  /**
   * Translate full-pipeline summary → quote-time cost breakdown.
   * Includes programming + CAD-generation costs that the wizard path skips.
   */
  async bridge(pipeline: PipelineSummary, opts: { profile_id?: string; operator_tier?: "apprentice" | "operator" | "senior" | "master" | "programmer" } = {}): Promise<PipelineQuoteBridgeResult> {
    const empty: PipelineQuoteBridgeResult = {
      ok: false, machine_hours_wall_clock: 0, machine_cost_usd: 0, setup_cost_usd: 0,
      programming_cost_usd: 0, cad_generation_cost_usd: 0, labor_cost_usd: 0,
      electricity_cost_usd: 0, total_direct_cost_usd: 0, overhead_cost_usd: 0,
      cost_per_part_usd: 0, tool_count: 0, op_count: 0, profile_id: opts.profile_id ?? "jm-die", warnings: [],
    };
    if (!pipeline || typeof pipeline.machine_family !== "string") {
      return { ...empty, reason: "pipeline.machine_family required" };
    }
    if (!Number.isFinite(pipeline.estimated_cycle_min) || pipeline.estimated_cycle_min < 0) {
      return { ...empty, reason: "estimated_cycle_min must be non-negative finite" };
    }
    if (!Number.isFinite(pipeline.quantity) || pipeline.quantity <= 0) {
      return { ...empty, reason: "quantity must be positive finite" };
    }

    const warnings: string[] = [];

    // ── U-GCODE-TO-CYCLE-FOR-PRINT-PIPELINE (iter13) ──
    // When gcode_text is supplied, auto-estimate cycle + tool list when caller left them 0/empty.
    // Caller-supplied values ALWAYS take precedence — auto-estimate only fills genuine gaps.
    let effectiveCycleMin = pipeline.estimated_cycle_min;
    let effectiveToolIds = Array.isArray(pipeline.tool_ids) ? [...pipeline.tool_ids] : [];
    let effectiveOpCount = pipeline.op_count;
    let gcodeEstimate: PipelineQuoteBridgeResult["gcode_estimate"];

    if (typeof pipeline.gcode_text === "string" && pipeline.gcode_text.trim().length > 0) {
      try {
        const { gCodeTimeEstimatorEngine } = await import("./GCodeTimeEstimatorEngine.js");
        const analysis = gCodeTimeEstimatorEngine.analyze(pipeline.gcode_text, {
          dialect: pipeline.gcode_dialect,
          machineRapidRateMmPerMin: pipeline.machine_rapid_rate_mm_per_min,
          toolChangeOverheadS: pipeline.tool_change_overhead_s,
        });
        if (analysis.ok) {
          const autoCycleMin = analysis.total_time_s / 60;
          // Only override when caller left estimated_cycle_min at 0 (genuine gap).
          if (effectiveCycleMin === 0) {
            effectiveCycleMin = autoCycleMin;
          }
          // Auto-populate tool_ids when empty.
          if (effectiveToolIds.length === 0 && analysis.tools_used.length > 0) {
            effectiveToolIds = analysis.tools_used.map(n => `T${n}`);
          }
          // Auto-populate op_count when 0 — cutting-block count is a rough proxy.
          if (effectiveOpCount === 0 && analysis.cutting_block_count > 0) {
            effectiveOpCount = analysis.cutting_block_count;
            warnings.push(`op_count auto-derived from cutting-block count (${analysis.cutting_block_count}) — rough proxy, prefer CAM-supplied value when available`);
          }
          gcodeEstimate = {
            used: true,
            dialect: analysis.dialect,
            block_count: analysis.block_count,
            cutting_block_count: analysis.cutting_block_count,
            rapid_block_count: analysis.rapid_block_count,
            tool_change_count: analysis.tool_change_count,
            time_in_cut_min: round2(analysis.time_in_cut_s / 60),
            rapid_time_min: round2(analysis.rapid_time_s / 60),
            total_time_min: round2(autoCycleMin),
            tools_used: analysis.tools_used,
          };
        } else {
          warnings.push(`gcode_text supplied but estimator refused: ${analysis.reason ?? "unknown"}`);
          gcodeEstimate = { used: false, reason: analysis.reason ?? "estimator-refused" };
        }
      } catch (e) {
        warnings.push(`GCodeTimeEstimatorEngine threw — caller-supplied values used (${e instanceof Error ? e.message : String(e)})`);
        gcodeEstimate = { used: false, reason: "estimator-threw" };
      }
    }

    const { shopProfileTemplateEngine } = await import("./ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile(opts.profile_id);

    const machine = shopProfileTemplateEngine.getMachineRate(profile, pipeline.machine_family);
    if (machine.source === "default") {
      warnings.push(`machine_family "${pipeline.machine_family}" not in profile "${profile.profile_id}" — using default rate`);
    }

    const cycleHours = effectiveCycleMin / 60;
    const machineEntry = profile.machines.find(m => m.family.toLowerCase() === pipeline.machine_family.toLowerCase());
    const utilization = machineEntry?.utilization_pct ?? 0.75;
    const wallClockHours = utilization > 0 ? cycleHours / utilization : cycleHours;

    const machineCost = round2(wallClockHours * machine.rate_usd_per_hr);

    const setupHours = Math.max(0, pipeline.estimated_setup_min) / 60;
    const setupCost = round2(setupHours * profile.setup_rate_usd_per_hr);

    const progHours = Math.max(0, pipeline.programming_hours ?? 0);
    const progRate = shopProfileTemplateEngine.getLaborRate(profile, "programmer");
    const programmingCost = round2(progHours * progRate);

    const cadHours = Math.max(0, pipeline.cad_generation_hours ?? 0);
    const cadCost = round2(cadHours * progRate);

    const tier = opts.operator_tier ?? "operator";
    const laborRate = shopProfileTemplateEngine.getLaborRate(profile, tier);
    const laborCost = round2(wallClockHours * laborRate);

    const electricity = shopProfileTemplateEngine.electricityCost(profile, {
      machine_family: pipeline.machine_family,
      cycle_time_hr: cycleHours,
    });

    const directCost = round2(machineCost + setupCost + programmingCost + cadCost + laborCost + electricity.cost_usd);
    const overheadCost = round2(directCost * profile.overhead_pct / 100);
    const totalLotCost = round2(directCost + overheadCost);
    const costPerPart = round2(totalLotCost / pipeline.quantity);

    return {
      ok: true,
      machine_hours_wall_clock: round2(wallClockHours),
      machine_cost_usd: machineCost,
      setup_cost_usd: setupCost,
      programming_cost_usd: programmingCost,
      cad_generation_cost_usd: cadCost,
      labor_cost_usd: laborCost,
      electricity_cost_usd: electricity.cost_usd,
      total_direct_cost_usd: directCost,
      overhead_cost_usd: overheadCost,
      cost_per_part_usd: costPerPart,
      tool_count: new Set(effectiveToolIds).size,
      op_count: effectiveOpCount,
      profile_id: profile.profile_id,
      warnings,
      gcode_estimate: gcodeEstimate,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const printToProgramToQuoteBridgeEngine = new PrintToProgramToQuoteBridgeEngine();
export default printToProgramToQuoteBridgeEngine;
