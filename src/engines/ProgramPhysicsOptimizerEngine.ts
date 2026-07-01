/**
 * ProgramPhysicsOptimizerEngine — Per-block physics optimization of CNC programs
 *
 * For each G1/G2/G3 cutting block in a parsed program:
 *   1. Resolve material (via MaterialResolverForProgramsEngine)
 *   2. Resolve tool geometry (via ToolResolverForProgramsEngine)
 *   3. Calculate Kienzle cutting force at current parameters
 *   4. Check power against machine spindle capacity
 *   5. Check deflection for boring/slender parts
 *   6. Optimize Vc for target tool life (Taylor)
 *   7. Optimize feed for target Ra (Brammertz)
 *   8. Emit optimized S/F values
 *
 * Preserves rapids, non-cutting blocks, safety codes (M1, M5, G50, M8/M9).
 *
 * Ref: Kienzle (1952), Taylor (1907), Brammertz (1961), Sandvik Coromant
 *
 * @module ProgramPhysicsOptimizerEngine
 */

import { log } from "../utils/Logger.js";
import {
  kienzleForce,
  taylorLife,
  predictedRa,
  rpmFromVc,
  cuttingPower,
  toolDeflection,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_TURNING_SPEEDS,
  CANONICAL_TURNING_FEEDS,
  type ISOGroup,
} from "../physics/constants.js";
import type { OkumaProgram, OkumaToolSection } from "./OkumaOSPParserEngine.js";
import { materialResolverForProgramsEngine } from "./MaterialResolverForProgramsEngine.js";
import type { ResolvedMaterial } from "./MaterialResolverForProgramsEngine.js";
import { toolResolverForProgramsEngine } from "./ToolResolverForProgramsEngine.js";
import type { ResolvedTool } from "./ToolResolverForProgramsEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Per-block optimization result */
export interface BlockOptimization {
  /** Line number in program */
  line: number;
  /** Original line text */
  original_text: string;
  /** Whether this is a cutting block */
  is_cutting: boolean;
  /** Optimized line text (same as original for non-cutting) */
  optimized_text: string;
  /** Original S value (SFM or RPM) */
  original_speed: number;
  /** Optimized S value */
  optimized_speed: number;
  /** Original feed */
  original_feed: number;
  /** Optimized feed */
  optimized_feed: number;
  /** Kienzle cutting force [N] */
  cutting_force_N: number;
  /** Required power [kW] */
  power_kW: number;
  /** Predicted surface finish [Ra µm] */
  predicted_Ra_um: number;
  /** Tool deflection [mm] */
  deflection_mm: number;
  /** Estimated tool life [min] at optimized speed */
  tool_life_min: number;
  /** Whether any parameter was changed */
  changed: boolean;
  /** Optimization notes */
  notes: string[];
}

/** Tool optimization context */
export interface ToolOptContext {
  /** Resolved tool info */
  tool: ResolvedTool;
  /** Current speed mode: css or rpm */
  speed_mode: "css" | "rpm";
  /** Current CSS/SFM value */
  css_value: number;
  /** Current RPM value */
  rpm_value: number;
  /** Current feed rate */
  feed_rate: number;
  /** G50 speed clamp */
  g50_rpm: number;
  /** Depth of cut [mm] */
  depth_of_cut_mm: number;
}

/** Optimization input */
export interface ProgramOptimizeInput {
  /** Parsed program */
  program: OkumaProgram;
  /** Unit system */
  unit_system?: "imperial" | "metric";
  /** Machine max power [kW] (default: 15) */
  machine_max_power_kw?: number;
  /** Machine max RPM (default: 4200) */
  machine_max_rpm?: number;
  /** Target tool life [min] (default: 15) */
  target_tool_life_min?: number;
  /** Target surface finish [Ra µm] (default: 1.6 for finishing, 6.3 for roughing) */
  target_Ra_rough_um?: number;
  target_Ra_finish_um?: number;
  /** Customer name for material hint */
  customer_name?: string;
  /** Power utilization limit (default: 0.80) */
  power_utilization?: number;
  /** Max deflection [mm] (default: 0.025) */
  max_deflection_mm?: number;
}

/** Full optimization result */
export interface ProgramOptimizeResult {
  /** Resolved material */
  material: ResolvedMaterial;
  /** Resolved tools */
  tools: ResolvedTool[];
  /** Per-block optimization results */
  blocks: BlockOptimization[];
  /** Optimized program text */
  optimized_text: string;
  /** Optimized lines */
  optimized_lines: string[];
  /** Summary statistics */
  summary: {
    total_blocks: number;
    cutting_blocks: number;
    blocks_changed: number;
    original_cycle_time_est_sec: number;
    optimized_cycle_time_est_sec: number;
    time_savings_pct: number;
    avg_tool_life_min: number;
    worst_Ra_original_um: number;
    worst_Ra_optimized_um: number;
    max_power_kW: number;
    max_deflection_mm: number;
    max_force_N: number;
    safety_issues: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum change threshold — don't change S/F by less than this % */
const MIN_CHANGE_PCT = 5;

/** Default machine parameters (Okuma Genos L400II-e) */
const DEFAULT_MACHINE = {
  max_power_kw: 15,
  max_rpm: 4200,
};

/** Feed conversion: ipm → mm/rev at typical RPM */
const IPR_TO_MMREV = 25.4; // 1 ipr = 25.4 mm/rev

// ============================================================================
// ENGINE
// ============================================================================

export class ProgramPhysicsOptimizerEngine {
  /**
   * Optimize a parsed CNC program using physics models.
   */
  optimize(input: ProgramOptimizeInput): ProgramOptimizeResult {
    const unitSystem = input.unit_system ?? "imperial";
    const maxPower = input.machine_max_power_kw ?? DEFAULT_MACHINE.max_power_kw;
    const maxRPM = input.machine_max_rpm ?? DEFAULT_MACHINE.max_rpm;
    const targetLife = input.target_tool_life_min ?? 15;
    const targetRaRough = input.target_Ra_rough_um ?? 6.3;
    const targetRaFinish = input.target_Ra_finish_um ?? 1.6;
    const powerLimit = (input.power_utilization ?? 0.80) * maxPower;
    const maxDeflection = input.max_deflection_mm ?? 0.025;

    // 1. Resolve material
    const material = materialResolverForProgramsEngine.resolve({
      program: input.program,
      customer_name: input.customer_name,
      unit_system: unitSystem,
    });

    // 2. Resolve tools
    const toolResult = toolResolverForProgramsEngine.resolveAll({
      program: input.program,
      unit_system: unitSystem,
    });
    const toolMap = new Map<number, ResolvedTool>();
    for (const t of toolResult.tools) {
      toolMap.set(t.station, t);
    }

    // 3. Walk program lines, optimize cutting blocks
    const blocks: BlockOptimization[] = [];
    let currentTool = 0;
    let currentCtx: ToolOptContext | null = null;
    let speedMode: "css" | "rpm" = "css";
    let currentCSS = 0;
    let currentRPM = 0;
    let currentFeed = 0;
    let currentG50 = 2500;

    for (let i = 0; i < input.program.rawLines.length; i++) {
      const line = input.program.rawLines[i];
      const trimmed = line.trim().toUpperCase();

      // Track tool changes
      const toolMatch = trimmed.match(/^T(\d{2})/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1], 10);
        const tool = toolMap.get(currentTool);
        if (tool) {
          currentCtx = {
            tool,
            speed_mode: speedMode,
            css_value: currentCSS,
            rpm_value: currentRPM,
            feed_rate: currentFeed,
            g50_rpm: currentG50,
            depth_of_cut_mm: 2.0, // default DOC
          };
        }
      }

      // Track G50
      const g50Match = trimmed.match(/G50\s+S(\d+)/);
      if (g50Match) {
        currentG50 = parseInt(g50Match[1], 10);
        if (currentCtx) currentCtx.g50_rpm = currentG50;
      }

      // Track G96/G97
      if (/G96/.test(trimmed)) {
        speedMode = "css";
        const sm = trimmed.match(/S(\d+)/);
        if (sm) {
          currentCSS = parseInt(sm[1], 10);
          if (currentCtx) currentCtx.css_value = currentCSS;
        }
      }
      if (/G97/.test(trimmed)) {
        speedMode = "rpm";
        const sm = trimmed.match(/S(\d+)/);
        if (sm) {
          currentRPM = parseInt(sm[1], 10);
          if (currentCtx) currentCtx.rpm_value = currentRPM;
        }
      }

      // Track feed
      const fm = trimmed.match(/F([\d.]+)/);
      if (fm) {
        currentFeed = parseFloat(fm[1]);
        if (currentCtx) currentCtx.feed_rate = currentFeed;
      }

      // Determine if cutting block
      const isCutting = /\b(G1|G01|G2|G02|G3|G03)\b/.test(trimmed) && currentFeed > 0;
      const isSafetyLine = /\b(G50|M1|M5|M8|M9|M30|M3|M4)\b/.test(trimmed);
      const isRapid = /\b(G0|G00)\b/.test(trimmed);

      if (!isCutting || !currentCtx || isSafetyLine) {
        // Non-cutting block — preserve unchanged
        blocks.push({
          line: i + 1,
          original_text: line,
          is_cutting: false,
          optimized_text: line,
          original_speed: 0,
          optimized_speed: 0,
          original_feed: 0,
          optimized_feed: 0,
          cutting_force_N: 0,
          power_kW: 0,
          predicted_Ra_um: 0,
          deflection_mm: 0,
          tool_life_min: 0,
          changed: false,
          notes: [],
        });
        continue;
      }

      // ── Optimize cutting block ───────────────────────────────────
      const block = this._optimizeCuttingBlock(
        line, i + 1, currentCtx, material, unitSystem,
        targetLife, targetRaRough, targetRaFinish,
        powerLimit, maxRPM, maxDeflection,
      );
      blocks.push(block);

      // Update current state if speed/feed changed
      if (block.changed && block.optimized_speed > 0) {
        currentCSS = block.optimized_speed;
      }
      if (block.changed && block.optimized_feed > 0) {
        currentFeed = block.optimized_feed;
      }
    }

    // 4. Build optimized text
    const optimizedLines = blocks.map(b => b.optimized_text);
    const optimizedText = optimizedLines.join("\n");

    // 5. Compute summary
    const cuttingBlocks = blocks.filter(b => b.is_cutting);
    const changedBlocks = blocks.filter(b => b.changed);
    const toolLives = cuttingBlocks.filter(b => b.tool_life_min > 0).map(b => b.tool_life_min);
    const avgLife = toolLives.length > 0
      ? toolLives.reduce((a, b) => a + b, 0) / toolLives.length
      : 0;

    // Estimate cycle time from feed rates and block lengths
    const origCycle = this._estimateCycleTime(blocks, false);
    const optCycle = this._estimateCycleTime(blocks, true);
    const timeSavings = origCycle > 0 ? ((origCycle - optCycle) / origCycle) * 100 : 0;

    const worstRaOrig = Math.max(...cuttingBlocks.map(b => {
      if (b.original_feed > 0 && currentCtx) {
        const r_e = currentCtx.tool.nose_radius_mm;
        return r_e > 0 ? predictedRa(b.original_feed, r_e) : 0;
      }
      return 0;
    }), 0);

    const worstRaOpt = Math.max(...cuttingBlocks.map(b => b.predicted_Ra_um), 0);
    const maxPowerUsed = Math.max(...cuttingBlocks.map(b => b.power_kW), 0);
    const maxDefl = Math.max(...cuttingBlocks.map(b => b.deflection_mm), 0);
    const maxForce = Math.max(...cuttingBlocks.map(b => b.cutting_force_N), 0);
    const safetyIssues = cuttingBlocks.filter(b =>
      b.notes.some(n => n.startsWith("SAFETY:")),
    ).length;

    log.info(
      `[ProgramPhysicsOptimizer] ${changedBlocks.length}/${cuttingBlocks.length} blocks optimized, ` +
      `time savings: ${timeSavings.toFixed(1)}%, avg tool life: ${avgLife.toFixed(1)} min`,
    );

    return {
      material,
      tools: toolResult.tools,
      blocks,
      optimized_text: optimizedText,
      optimized_lines: optimizedLines,
      summary: {
        total_blocks: blocks.length,
        cutting_blocks: cuttingBlocks.length,
        blocks_changed: changedBlocks.length,
        original_cycle_time_est_sec: origCycle,
        optimized_cycle_time_est_sec: optCycle,
        time_savings_pct: Math.round(timeSavings * 10) / 10,
        avg_tool_life_min: Math.round(avgLife * 10) / 10,
        worst_Ra_original_um: Math.round(worstRaOrig * 100) / 100,
        worst_Ra_optimized_um: Math.round(worstRaOpt * 100) / 100,
        max_power_kW: Math.round(maxPowerUsed * 100) / 100,
        max_deflection_mm: Math.round(maxDefl * 10000) / 10000,
        max_force_N: Math.round(maxForce),
        safety_issues: safetyIssues,
      },
    };
  }

  // ── Private ─────────��───────────────────────────────────────────────

  private _optimizeCuttingBlock(
    line: string,
    lineNum: number,
    ctx: ToolOptContext,
    material: ResolvedMaterial,
    unitSystem: string,
    targetLife: number,
    targetRaRough: number,
    targetRaFinish: number,
    powerLimit: number,
    maxRPM: number,
    maxDeflection: number,
  ): BlockOptimization {
    const notes: string[] = [];
    const isoGroup = material.iso_group;
    const noseR = ctx.tool.nose_radius_mm;
    const isFinishing = ctx.tool.tool_type === "od_finishing" ||
      ctx.tool.tool_type === "boring_bar_finish" ||
      ctx.tool.tool_type === "id_finishing";
    const isGrooveCutoff = ctx.tool.tool_type === "groove" ||
      ctx.tool.tool_type === "cutoff";
    const isThreading = ctx.tool.tool_type === "thread_external" ||
      ctx.tool.tool_type === "thread_internal";

    // Parse current speed and feed from context
    let origSpeed = ctx.css_value; // SFM or m/min
    let origFeed = ctx.feed_rate;  // ipr or mm/rev

    // Convert to metric for physics calculations
    let Vc_mpm: number; // cutting speed [m/min]
    let feed_mmrev: number; // feed [mm/rev]
    let ap_mm = ctx.depth_of_cut_mm; // depth of cut [mm]

    if (unitSystem === "imperial") {
      Vc_mpm = origSpeed * 0.3048; // SFM → m/min
      feed_mmrev = origFeed * 25.4; // ipr → mm/rev
    } else {
      Vc_mpm = origSpeed;
      feed_mmrev = origFeed;
    }

    // Skip optimization for threading and groove/cutoff (safety-sensitive)
    if (isThreading) {
      notes.push("Threading block — preserved unchanged (safety)");
      return this._unchangedBlock(line, lineNum, origSpeed, origFeed);
    }

    // ── Kienzle force ──
    const Fc = kienzleForce(material.kc1_1, material.mc, ap_mm, feed_mmrev);

    // ── Power check ──
    const power = cuttingPower(Fc, Vc_mpm);

    // ── Tool deflection (boring bars) ──
    let deflection = 0;
    if (ctx.tool.tool_type === "boring_bar" || ctx.tool.tool_type === "boring_bar_finish") {
      const toolDia = ctx.tool.diameter_mm > 0 ? ctx.tool.diameter_mm : 20;
      deflection = toolDeflection(Fc, ctx.tool.stickout_mm, toolDia);
    }

    // ── Optimize cutting speed ──
    const optVc = this._optimizeSpeed(
      Vc_mpm, isoGroup, isFinishing, targetLife, material, notes,
    );

    // ── Optimize feed ──
    const optFeed = this._optimizeFeed(
      feed_mmrev, noseR, isFinishing, isGrooveCutoff,
      targetRaFinish, targetRaRough, notes,
    );

    // ── Power-limit check ──
    let finalVc = optVc;
    let finalFeed = optFeed;
    const optFc = kienzleForce(material.kc1_1, material.mc, ap_mm, finalFeed);
    let optPower = cuttingPower(optFc, finalVc);

    if (optPower > powerLimit) {
      // Reduce speed to fit within power limit
      finalVc = finalVc * (powerLimit / optPower) * 0.95;
      optPower = cuttingPower(optFc, finalVc);
      notes.push(`SAFETY: Power limited from ${optPower.toFixed(1)} to ${powerLimit.toFixed(1)} kW`);
    }

    // ── Deflection check for boring bars ──
    if (deflection > maxDeflection && ctx.tool.tool_type.startsWith("boring")) {
      const reductionFactor = maxDeflection / deflection;
      finalFeed = finalFeed * Math.sqrt(reductionFactor); // Fc ∝ f, deflection ∝ Fc
      notes.push(`Deflection limited: feed reduced to ${finalFeed.toFixed(4)} mm/rev`);
    }

    // ── Convert back to program units ──
    let optSpeedProg: number;
    let optFeedProg: number;
    if (unitSystem === "imperial") {
      optSpeedProg = Math.round(finalVc / 0.3048); // m/min → SFM
      optFeedProg = Math.round(finalFeed / 25.4 * 10000) / 10000; // mm/rev → ipr
    } else {
      optSpeedProg = Math.round(finalVc);
      optFeedProg = Math.round(finalFeed * 10000) / 10000;
    }

    // ── Check if change is significant enough ──
    const speedChangePct = origSpeed > 0
      ? Math.abs(optSpeedProg - origSpeed) / origSpeed * 100
      : 0;
    const feedChangePct = origFeed > 0
      ? Math.abs(optFeedProg - origFeed) / origFeed * 100
      : 0;

    const changed = speedChangePct >= MIN_CHANGE_PCT || feedChangePct >= MIN_CHANGE_PCT;

    // ── Build optimized line ──
    let optimizedLine = line;
    if (changed) {
      // Replace F value in the line
      if (feedChangePct >= MIN_CHANGE_PCT) {
        optimizedLine = optimizedLine.replace(
          /F[\d.]+/i,
          `F${optFeedProg}`,
        );
      }
      // Note: Speed (G96 S) changes are tracked but applied at the tool section level,
      // not per cutting block, since CSS applies to the entire tool section
    }

    // ── Compute final metrics ──
    const finalFc = kienzleForce(material.kc1_1, material.mc, ap_mm, finalFeed);
    const finalPower = cuttingPower(finalFc, finalVc);
    const finalRa = noseR > 0 ? predictedRa(finalFeed, noseR) : 0;
    const finalLife = taylorLife(material.taylor_C, material.taylor_n, finalVc);

    return {
      line: lineNum,
      original_text: line,
      is_cutting: true,
      optimized_text: optimizedLine,
      original_speed: origSpeed,
      optimized_speed: optSpeedProg,
      original_feed: origFeed,
      optimized_feed: optFeedProg,
      cutting_force_N: Math.round(finalFc),
      power_kW: Math.round(finalPower * 100) / 100,
      predicted_Ra_um: Math.round(finalRa * 100) / 100,
      deflection_mm: deflection,
      tool_life_min: Math.round(finalLife * 10) / 10,
      changed,
      notes,
    };
  }

  /** Optimize cutting speed using Taylor life and canonical ranges */
  private _optimizeSpeed(
    currentVc: number,
    isoGroup: ISOGroup,
    isFinishing: boolean,
    targetLife: number,
    material: ResolvedMaterial,
    notes: string[],
  ): number {
    // Get canonical speed range
    const canonicalSpeeds = CANONICAL_TURNING_SPEEDS[isoGroup];
    const targetVc = isFinishing ? canonicalSpeeds.finish : canonicalSpeeds.rough;

    // Calculate Vc for target tool life using Taylor
    const C = material.taylor_C;
    const n = material.taylor_n;
    // T = (C/Vc)^(1/n) → Vc = C / T^n
    const vcForTargetLife = C / Math.pow(targetLife, n);

    // Use the lower of target life speed and canonical max (both in m/min)
    let optVc = Math.min(vcForTargetLife, targetVc);

    // Never reduce speed below 70% of current (conservative)
    if (optVc < currentVc * 0.7) {
      optVc = currentVc * 0.7;
      notes.push(`Speed floor: kept at 70% of original (${(currentVc * 0.7).toFixed(0)} m/min)`);
    }

    // Never increase more than 30% above current (safety)
    if (optVc > currentVc * 1.3) {
      optVc = currentVc * 1.3;
      notes.push(`Speed ceiling: capped at 130% of original`);
    }

    if (Math.abs(optVc - currentVc) / currentVc > 0.05) {
      notes.push(
        `Speed: ${currentVc.toFixed(0)} → ${optVc.toFixed(0)} m/min ` +
        `(target life=${targetLife} min, Taylor Vc=${vcForTargetLife.toFixed(0)})`,
      );
    }

    return optVc;
  }

  /** Optimize feed rate using Brammertz surface finish model */
  private _optimizeFeed(
    currentFeed: number,
    noseRadius: number,
    isFinishing: boolean,
    isGrooveCutoff: boolean,
    targetRaFinish: number,
    targetRaRough: number,
    notes: string[],
  ): number {
    // For groove/cutoff: only allow decrease (safety rule)
    if (isGrooveCutoff) {
      return currentFeed; // Preserve — SafetyGate handles this
    }

    // If no nose radius info, can't optimize feed for Ra
    if (noseRadius <= 0) return currentFeed;

    // Brammertz: Ra = f^2 / (32 × r_ε) × 1000 [µm]
    // Inverse: f = sqrt(Ra × 32 × r_ε / 1000) [mm]
    const targetRa = isFinishing ? targetRaFinish : targetRaRough;
    const feedForTargetRa = Math.sqrt(targetRa * 32 * noseRadius / 1000);

    let optFeed = feedForTargetRa;

    // Never increase feed more than 20% (conservative)
    if (optFeed > currentFeed * 1.2) {
      optFeed = currentFeed * 1.2;
      notes.push(`Feed ceiling: capped at 120% of original`);
    }

    // Never reduce below 50% (still need to cut)
    if (optFeed < currentFeed * 0.5) {
      optFeed = currentFeed * 0.5;
      notes.push(`Feed floor: kept at 50% of original`);
    }

    if (Math.abs(optFeed - currentFeed) / currentFeed > 0.05) {
      const currentRa = predictedRa(currentFeed, noseRadius);
      const optRa = predictedRa(optFeed, noseRadius);
      notes.push(
        `Feed: ${currentFeed.toFixed(4)} → ${optFeed.toFixed(4)} mm/rev ` +
        `(Ra: ${currentRa.toFixed(2)} → ${optRa.toFixed(2)} µm, target=${targetRa})`,
      );
    }

    return optFeed;
  }

  /** Create an unchanged block result */
  private _unchangedBlock(
    line: string,
    lineNum: number,
    speed: number,
    feed: number,
  ): BlockOptimization {
    return {
      line: lineNum,
      original_text: line,
      is_cutting: true,
      optimized_text: line,
      original_speed: speed,
      optimized_speed: speed,
      original_feed: feed,
      optimized_feed: feed,
      cutting_force_N: 0,
      power_kW: 0,
      predicted_Ra_um: 0,
      deflection_mm: 0,
      tool_life_min: 0,
      changed: false,
      notes: ["Preserved unchanged"],
    };
  }

  /** Estimate cycle time from block feed rates (simplified) */
  private _estimateCycleTime(
    blocks: BlockOptimization[],
    useOptimized: boolean,
  ): number {
    let totalSec = 0;
    for (const block of blocks) {
      if (!block.is_cutting) continue;
      // Use the program-unit feed values (both original and optimized are in same units)
      const feed = useOptimized ? block.optimized_feed : block.original_feed;
      if (feed <= 0) continue;
      // Estimate: assume 25mm cut length, 1000 RPM average
      // Feed in program units (ipr or mm/rev) — normalize to mm/rev for estimation
      // If feed < 1.0, likely ipr or mm/rev; multiply by 25.4 if ipr to get mm/rev
      const feedMmRev = feed < 1.0 ? feed * 25.4 : feed; // heuristic: ipr < 1.0
      const cutLength = 25; // mm
      const avgRPM = 1000;
      const feedMmMin = feedMmRev * avgRPM;
      if (feedMmMin > 0) {
        totalSec += (cutLength / feedMmMin) * 60;
      }
    }
    return Math.round(totalSec);
  }
}

export const programPhysicsOptimizerEngine = new ProgramPhysicsOptimizerEngine();
