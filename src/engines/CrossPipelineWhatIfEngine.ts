/**
 * CrossPipelineWhatIfEngine — unified what-if analysis across all pipelines.
 *
 * "What if I change material/tool/parameters?" — instant delta across S/F,
 * forces, cost, cycle time, tool life, feasibility.
 *
 * Runs SpeedFeedOrchestratorEngine.compute() for baseline, merges baseline +
 * changes, runs SFO again, computes percentage deltas, generates human-readable
 * impact summary, recommendations, and trade-off analysis.
 *
 * @module engines/CrossPipelineWhatIfEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WhatIfInput {
  /** Baseline scenario */
  baseline: {
    material: string;
    tool_diameter_mm: number;
    flutes: number;
    operation?: string;
    cut_type?: string;
    ap_mm?: number;
    ae_mm?: number;
    machine?: string;
    tool_material?: string;
    coolant_type?: string;
  };
  /** What-if changes — only specify what changes */
  changes: {
    material?: string;
    tool_diameter_mm?: number;
    flutes?: number;
    operation?: string;
    cut_type?: string;
    ap_mm?: number;
    ae_mm?: number;
    tool_material?: string;
    coolant_type?: string;
    machine?: string;
  };
}

export interface ScenarioResult {
  spindle_rpm: number;
  feed_rate_mmmin: number;
  cutting_force_N: number;
  power_kW: number;
  tool_life_min: number;
  surface_finish_Ra_um: number;
  deflection_um: number;
  mrr_cm3min: number;
  cost_per_part_usd: number;
  cycle_time_s: number;
}

export interface WhatIfDelta {
  spindle_rpm_pct: number;
  feed_rate_pct: number;
  cutting_force_pct: number;
  power_pct: number;
  tool_life_pct: number;
  surface_finish_pct: number;
  deflection_pct: number;
  mrr_pct: number;
  cost_per_part_pct: number;
  cycle_time_pct: number;
}

export interface WhatIfResult {
  baseline: ScenarioResult;
  modified: ScenarioResult;
  delta: WhatIfDelta;
  /** Human-readable one-liner, e.g. "Switching to Ti6Al4V: -65% speed, +85% force, -40% tool life, +120% cost" */
  impact_summary: string;
  recommendations: string[];
  trade_offs: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

/** Compute percentage change, safe against zero division */
function pctChange(baseline: number, modified: number): number {
  if (baseline === 0) return modified === 0 ? 0 : 100;
  return ((modified - baseline) / Math.abs(baseline)) * 100;
}

/** Format a percentage change as "+X%" or "-X%" */
function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(0)}%`;
}

/** Map WhatIfInput baseline/changes to OrchestratorInput */
function toOrchestratorInput(scenario: WhatIfInput["baseline"]): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (scenario.material) input.material = scenario.material;
  if (scenario.tool_diameter_mm != null) input.tool_diameter_mm = scenario.tool_diameter_mm;
  if (scenario.flutes != null) input.flutes = scenario.flutes;
  if (scenario.operation) input.operation = scenario.operation;
  if (scenario.cut_type) input.cut_type = scenario.cut_type;
  if (scenario.ap_mm != null) input.axial_depth_mm = scenario.ap_mm;
  if (scenario.ae_mm != null) input.radial_depth_mm = scenario.ae_mm;
  if (scenario.machine) input.machine_name = scenario.machine;
  if (scenario.tool_material) input.tool_material = scenario.tool_material;
  if (scenario.coolant_type) input.coolant_type = scenario.coolant_type;
  // Request full detail for complete metrics
  input.output_detail = "full";
  return input;
}

/** Extract ScenarioResult from OrchestratorResult */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractScenarioResult(orch: any): ScenarioResult {
  const rpm = orch.spindle_rpm ?? 0;
  const feedRate = orch.feed_rate_mmmin ?? 0;
  const force = orch.tangential_force_N ?? 0;
  const power = orch.power_kw ?? 0;
  const life = orch.tool_life_min ?? 0;
  const ra = orch.surface_finish_Ra_um ?? 0;
  const defl = orch.deflection_um ?? 0;
  const mrr = orch.mrr_cm3min ?? 0;

  // Estimate cost from tool life + machine cost (simplified Gilbert model)
  const machineCostPerMin = 1.5; // $/min default
  const toolCost = 25; // $ default tool cost
  const toolChangeTime = 2; // min
  const cycleLength = life > 0 ? life : 30; // min per tool life cycle
  const costPerMin = machineCostPerMin + (toolCost + machineCostPerMin * toolChangeTime) / cycleLength;

  // Estimate cycle time from MRR (assume 100 cm³ stock removal)
  const stockVolume = 100; // cm³ default
  const cuttingTime = mrr > 0 ? (stockVolume / mrr) * 60 : 0; // seconds
  const cycleTime = cuttingTime * 1.3; // 30% overhead for rapids, tool changes

  const costPerPart = (cycleTime / 60) * costPerMin;

  return {
    spindle_rpm: rpm,
    feed_rate_mmmin: feedRate,
    cutting_force_N: force,
    power_kW: power,
    tool_life_min: life,
    surface_finish_Ra_um: ra,
    deflection_um: defl,
    mrr_cm3min: mrr,
    cost_per_part_usd: Math.round(costPerPart * 100) / 100,
    cycle_time_s: Math.round(cycleTime * 100) / 100,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossPipelineWhatIfEngine {
  /** Lazy-loaded SFO reference */
  private _sfo: any = null;

  /** Get or lazy-load SpeedFeedOrchestratorEngine */
  private getSFO(): any {
    if (!this._sfo) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("./SpeedFeedOrchestratorEngine.js");
      this._sfo = mod.speedFeedOrchestratorEngine ?? mod.default;
    }
    return this._sfo;
  }

  /** Async lazy-load for dispatcher context */
  private async getSFOAsync(): Promise<any> {
    if (!this._sfo) {
      const mod = await import("./SpeedFeedOrchestratorEngine.js");
      this._sfo = mod.speedFeedOrchestratorEngine ?? (mod as any).default;
    }
    return this._sfo;
  }

  /**
   * Run what-if analysis: compute baseline, apply changes, compare.
   * @param input - Baseline scenario + proposed changes
   * @returns Full delta analysis with recommendations
   */
  analyze(input: WhatIfInput): WhatIfResult {
    log.info("[CrossPipelineWhatIfEngine] Starting what-if analysis");

    // Validate input
    if (!input?.baseline?.material || !input?.baseline?.tool_diameter_mm) {
      throw new Error("What-if analysis requires at least baseline.material and baseline.tool_diameter_mm");
    }
    if (!input?.changes || Object.keys(input.changes).length === 0) {
      throw new Error("What-if analysis requires at least one change to compare");
    }

    const sfo = this.getSFO();

    // 1. Compute baseline scenario
    const baselineInput = toOrchestratorInput(input.baseline);
    const baselineOrch = sfo.compute(baselineInput);
    const baseline = extractScenarioResult(baselineOrch);

    // 2. Merge baseline + changes → modified scenario
    const mergedScenario = { ...input.baseline, ...input.changes };
    const modifiedInput = toOrchestratorInput(mergedScenario);
    const modifiedOrch = sfo.compute(modifiedInput);
    const modified = extractScenarioResult(modifiedOrch);

    // 3. Compute percentage deltas
    const delta: WhatIfDelta = {
      spindle_rpm_pct: pctChange(baseline.spindle_rpm, modified.spindle_rpm),
      feed_rate_pct: pctChange(baseline.feed_rate_mmmin, modified.feed_rate_mmmin),
      cutting_force_pct: pctChange(baseline.cutting_force_N, modified.cutting_force_N),
      power_pct: pctChange(baseline.power_kW, modified.power_kW),
      tool_life_pct: pctChange(baseline.tool_life_min, modified.tool_life_min),
      surface_finish_pct: pctChange(baseline.surface_finish_Ra_um, modified.surface_finish_Ra_um),
      deflection_pct: pctChange(baseline.deflection_um, modified.deflection_um),
      mrr_pct: pctChange(baseline.mrr_cm3min, modified.mrr_cm3min),
      cost_per_part_pct: pctChange(baseline.cost_per_part_usd, modified.cost_per_part_usd),
      cycle_time_pct: pctChange(baseline.cycle_time_s, modified.cycle_time_s),
    };

    // Round all deltas
    for (const key of Object.keys(delta) as (keyof WhatIfDelta)[]) {
      delta[key] = Math.round(delta[key] * 10) / 10;
    }

    // 4. Generate impact summary
    const impact_summary = this.buildImpactSummary(input, delta);

    // 5. Generate recommendations
    const recommendations = this.buildRecommendations(input, delta, baseline, modified);

    // 6. Generate trade-offs
    const trade_offs = this.buildTradeOffs(delta);

    log.info("[CrossPipelineWhatIfEngine] What-if analysis complete");
    return { baseline, modified, delta, impact_summary, recommendations, trade_offs };
  }

  /**
   * Async variant for dispatcher context (lazy import).
   */
  async analyzeAsync(input: WhatIfInput): Promise<WhatIfResult> {
    await this.getSFOAsync();
    return this.analyze(input);
  }

  // --------------------------------------------------------------------------
  // Impact Summary
  // --------------------------------------------------------------------------

  private buildImpactSummary(input: WhatIfInput, delta: WhatIfDelta): string {
    const changeDescriptions: string[] = [];

    // Describe what changed
    const changes = input.changes;
    if (changes.material) changeDescriptions.push(`material→${changes.material}`);
    if (changes.tool_diameter_mm) changeDescriptions.push(`D=${changes.tool_diameter_mm}mm`);
    if (changes.flutes) changeDescriptions.push(`${changes.flutes}F`);
    if (changes.operation) changeDescriptions.push(`op=${changes.operation}`);
    if (changes.cut_type) changeDescriptions.push(`${changes.cut_type}`);
    if (changes.ap_mm != null) changeDescriptions.push(`ap=${changes.ap_mm}mm`);
    if (changes.ae_mm != null) changeDescriptions.push(`ae=${changes.ae_mm}mm`);
    if (changes.tool_material) changeDescriptions.push(`tool=${changes.tool_material}`);
    if (changes.coolant_type) changeDescriptions.push(`coolant=${changes.coolant_type}`);
    if (changes.machine) changeDescriptions.push(`machine=${changes.machine}`);

    const changeStr = changeDescriptions.join(", ");

    // Pick the most significant deltas (|pct| > 10)
    const significantDeltas: string[] = [];
    const deltaEntries: [string, number][] = [
      ["speed", delta.spindle_rpm_pct],
      ["feed", delta.feed_rate_pct],
      ["force", delta.cutting_force_pct],
      ["power", delta.power_pct],
      ["tool life", delta.tool_life_pct],
      ["Ra", delta.surface_finish_pct],
      ["deflection", delta.deflection_pct],
      ["MRR", delta.mrr_pct],
      ["cost", delta.cost_per_part_pct],
      ["cycle time", delta.cycle_time_pct],
    ];

    // Sort by absolute magnitude, take top 4
    deltaEntries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    for (const [name, pct] of deltaEntries.slice(0, 4)) {
      if (Math.abs(pct) >= 5) {
        significantDeltas.push(`${fmtPct(pct)} ${name}`);
      }
    }

    if (significantDeltas.length === 0) {
      return `Changing ${changeStr}: minimal impact (<5% on all metrics)`;
    }
    return `Changing ${changeStr}: ${significantDeltas.join(", ")}`;
  }

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------

  private buildRecommendations(
    input: WhatIfInput,
    delta: WhatIfDelta,
    baseline: ScenarioResult,
    modified: ScenarioResult
  ): string[] {
    const recs: string[] = [];

    // Force increase >50%: warn about deflection, suggest reduced depth
    if (delta.cutting_force_pct > 50) {
      recs.push(
        `Cutting force increases ${fmtPct(delta.cutting_force_pct)} — consider reducing axial depth (ap) or radial engagement (ae) to stay within safe deflection limits.`
      );
    }

    // Tool life decrease >50%: warn about cost impact, suggest coolant upgrade
    if (delta.tool_life_pct < -50) {
      recs.push(
        `Tool life drops ${fmtPct(delta.tool_life_pct)} — consider upgrading coolant to through-tool or MQL, or switching to a more wear-resistant tool material/coating.`
      );
    }

    // Surface finish improvement >20%: note benefit
    if (delta.surface_finish_pct < -20) {
      recs.push(
        `Surface finish improves ${fmtPct(Math.abs(delta.surface_finish_pct))} (lower Ra) — potential to skip a finishing pass, saving cycle time.`
      );
    }

    // Surface finish degradation >20%
    if (delta.surface_finish_pct > 20) {
      recs.push(
        `Surface finish degrades ${fmtPct(delta.surface_finish_pct)} — may require an additional finishing pass. Consider reducing feed per tooth or increasing corner radius.`
      );
    }

    // MRR change >30%: productivity impact
    if (delta.mrr_pct > 30) {
      recs.push(
        `Material removal rate increases ${fmtPct(delta.mrr_pct)} — significant productivity gain. Verify machine spindle power can sustain the higher load (${modified.power_kW.toFixed(1)} kW required).`
      );
    }
    if (delta.mrr_pct < -30) {
      recs.push(
        `Material removal rate drops ${fmtPct(delta.mrr_pct)} — consider increasing engagement or switching to a more aggressive strategy (trochoidal, adaptive) to recover productivity.`
      );
    }

    // Deflection increase >40%
    if (delta.deflection_pct > 40) {
      recs.push(
        `Tool deflection increases ${fmtPct(delta.deflection_pct)} — risk of chatter and dimensional error. Consider a shorter stickout, larger tool diameter, or shrink-fit holder.`
      );
    }

    // Power increase >60%: machine limit warning
    if (delta.power_pct > 60) {
      recs.push(
        `Power demand increases ${fmtPct(delta.power_pct)} (${modified.power_kW.toFixed(1)} kW) — verify this is within machine spindle capacity.`
      );
    }

    // Cost increase >40%
    if (delta.cost_per_part_pct > 40) {
      recs.push(
        `Cost per part increases ${fmtPct(delta.cost_per_part_pct)} — driven primarily by ${delta.tool_life_pct < -20 ? "reduced tool life" : "longer cycle time"}. Evaluate if the change provides sufficient quality or capability benefits.`
      );
    }

    // Material change: specific advice
    if (input.changes.material) {
      recs.push(
        `Material change detected — verify workholding clamping force is adequate for new material's cutting forces (${modified.cutting_force_N.toFixed(0)} N tangential).`
      );
    }

    // Diameter change: chip load reminder
    if (input.changes.tool_diameter_mm && input.changes.tool_diameter_mm !== input.baseline.tool_diameter_mm) {
      const bigger = input.changes.tool_diameter_mm > input.baseline.tool_diameter_mm;
      recs.push(
        bigger
          ? `Larger tool diameter allows higher MRR but requires more spindle torque at lower RPM. Ensure the machine has adequate torque at ${modified.spindle_rpm.toFixed(0)} RPM.`
          : `Smaller tool diameter increases RPM but reduces stiffness. Verify stickout ratio (L/D) stays below 4:1 for roughing or 6:1 for finishing.`
      );
    }

    return recs;
  }

  // --------------------------------------------------------------------------
  // Trade-Offs
  // --------------------------------------------------------------------------

  private buildTradeOffs(delta: WhatIfDelta): string[] {
    const tradeOffs: string[] = [];

    // Productivity vs cost
    if (delta.mrr_pct > 15 && delta.cost_per_part_pct > 10) {
      tradeOffs.push(`Higher productivity (${fmtPct(delta.mrr_pct)} MRR) at higher cost (${fmtPct(delta.cost_per_part_pct)} per part).`);
    }
    if (delta.mrr_pct < -15 && delta.cost_per_part_pct < -10) {
      tradeOffs.push(`Lower productivity (${fmtPct(delta.mrr_pct)} MRR) but lower cost (${fmtPct(delta.cost_per_part_pct)} per part).`);
    }

    // Quality vs productivity
    if (delta.surface_finish_pct < -15 && delta.mrr_pct < -10) {
      tradeOffs.push(`Better surface finish (${fmtPct(Math.abs(delta.surface_finish_pct))} lower Ra) at the expense of productivity (${fmtPct(delta.mrr_pct)} MRR).`);
    }
    if (delta.surface_finish_pct > 15 && delta.mrr_pct > 10) {
      tradeOffs.push(`Higher productivity (${fmtPct(delta.mrr_pct)} MRR) at the expense of surface quality (${fmtPct(delta.surface_finish_pct)} Ra).`);
    }

    // Tool life vs productivity
    if (delta.tool_life_pct < -20 && delta.mrr_pct > 15) {
      tradeOffs.push(`Faster material removal (${fmtPct(delta.mrr_pct)} MRR) but shorter tool life (${fmtPct(delta.tool_life_pct)}). Evaluate batch size to determine net benefit.`);
    }
    if (delta.tool_life_pct > 20 && delta.mrr_pct < -15) {
      tradeOffs.push(`Longer tool life (${fmtPct(delta.tool_life_pct)}) but slower cutting (${fmtPct(delta.mrr_pct)} MRR). Favorable for expensive tools or hard-to-index setups.`);
    }

    // Force vs deflection
    if (delta.cutting_force_pct > 20 && delta.deflection_pct > 20) {
      tradeOffs.push(`Higher forces (${fmtPct(delta.cutting_force_pct)}) compound with deflection (${fmtPct(delta.deflection_pct)}). Dimensional accuracy may be affected.`);
    }

    // Power vs cost
    if (delta.power_pct > 25 && delta.cycle_time_pct < -15) {
      tradeOffs.push(`More spindle power used (${fmtPct(delta.power_pct)}) but shorter cycle time (${fmtPct(delta.cycle_time_pct)}). Energy cost vs throughput gain.`);
    }

    // If no significant trade-offs detected
    if (tradeOffs.length === 0) {
      // Check if it's a clear win or loss
      const positives = [delta.mrr_pct > 10, delta.tool_life_pct > 10, delta.surface_finish_pct < -10, delta.cost_per_part_pct < -10].filter(Boolean).length;
      const negatives = [delta.mrr_pct < -10, delta.tool_life_pct < -10, delta.surface_finish_pct > 10, delta.cost_per_part_pct > 10].filter(Boolean).length;

      if (positives >= 3 && negatives === 0) {
        tradeOffs.push("The proposed change is a clear improvement across multiple metrics — recommended.");
      } else if (negatives >= 3 && positives === 0) {
        tradeOffs.push("The proposed change degrades multiple metrics — reconsider or compensate with other parameter adjustments.");
      } else {
        tradeOffs.push("No significant trade-offs detected — the change has relatively balanced impact.");
      }
    }

    return tradeOffs;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const crossPipelineWhatIfEngine = new CrossPipelineWhatIfEngine();
export default CrossPipelineWhatIfEngine;
