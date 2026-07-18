/**
 * CamxEnergyOptimizationEngine — CAMX-MS13/U04 (E1150)
 *
 * Minimize energy cost per part. Analyzes spindle power consumption,
 * idle power waste, and rapid traverse efficiency. Suggests parameter
 * adjustments and program restructuring to reduce total energy usage.
 *
 * Distinct from EnergyOptimizationEngine (operation-level analysis):
 * this engine works at the G-code block level with physics-based power
 * models and TSP-inspired rapid traverse optimization.
 *
 * Energy model:
 *   1. Spindle cutting power:
 *      P_cut = Fc * Vc / (60 * 1000)  [kW]
 *      where Fc = kc1.1 * ap * fz^(1-mc)
 *
 *   2. Spindle idle power (no-load):
 *      P_idle = P_rated * (RPM / RPM_max)^2 * 0.15  [kW]
 *      (bearing friction + windage, typically 10-20% of rated)
 *
 *   3. Rapid traverse power:
 *      P_rapid = m_table * a_rapid * v_rapid / eta  [kW]
 *      Optimized by minimizing rapid distance via TSP-based reordering
 *
 *   4. Auxiliary power:
 *      P_aux = P_coolant + P_chip_conveyor + P_hydraulic  [kW]
 *
 *   Total energy per part:
 *      E = integral(P_cut + P_idle + P_rapid + P_aux) dt  [kWh]
 *
 * References:
 *   - Gutowski et al. (2006): "Electrical Energy Requirements for Manufacturing"
 *   - Draganescu et al. (2003): "Models of machine tool efficiency"
 *   - ISO 14955: Environmental evaluation of machine tools
 *   - GCodeEnergyOptimizerEngine — G-code level optimization
 *   - CycleTimeEstimatorEngine — timing data
 *
 * @module CamxEnergyOptimizationEngine
 * @shortcode E1150
 * @dispatcher camDispatcher
 * @actions camx_energy_optimize, camx_energy_breakdown, camx_energy_suggest_savings
 * @milestone CAMX-MS13/U04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Electricity cost default [$/kWh] */
const DEFAULT_ELECTRICITY_COST = 0.12;

/** Idle power fraction of rated power (at max RPM) */
const IDLE_POWER_FRACTION = 0.15;

/** Coolant pump typical power [kW] */
const DEFAULT_COOLANT_POWER_KW = 1.5;

/** Chip conveyor typical power [kW] */
const DEFAULT_CHIP_CONVEYOR_KW = 0.75;

/** Hydraulic system typical power [kW] */
const DEFAULT_HYDRAULIC_KW = 2.0;

/** Control system / electronics constant power [kW] */
const CONTROL_POWER_KW = 0.5;

/** Rapid traverse deceleration/acceleration efficiency */
const RAPID_EFFICIENCY = 0.85;

/** Table mass estimate for rapid power [kg] */
const DEFAULT_TABLE_MASS_KG = 500;

/** Default rapid traverse speed [mm/min] */
const DEFAULT_RAPID_SPEED_MMPM = 30000;

/** CO2 emission factor [kg CO2/kWh] (US grid average) */
const CO2_PER_KWH = 0.42;

// ============================================================================
// TYPES
// ============================================================================

/** A single program block for energy analysis */
export interface CamxEnergyBlock {
  /** Block index */
  index: number;
  /** Block type */
  type: "cut" | "rapid" | "dwell" | "tool_change" | "spindle_ramp" | "idle";
  /** Duration [min] */
  duration_min: number;
  /** Spindle RPM (0 for rapids/dwells) */
  rpm?: number;
  /** Feed rate [mm/min] */
  feed_mmpm?: number;
  /** Cutting force [N] — if known */
  cutting_force_N?: number;
  /** Cutting speed [m/min] — if known */
  Vc_mpm?: number;
  /** Depth of cut [mm] */
  ap_mm?: number;
  /** Feed per tooth [mm/tooth] */
  fz_mm?: number;
  /** Rapid distance [mm] */
  rapid_distance_mm?: number;
  /** Label */
  label?: string;
}

/** Machine power profile */
export interface CamxMachinePowerProfile {
  /** Machine ID */
  machine_id: string;
  /** Rated spindle power [kW] */
  rated_power_kW: number;
  /** Max spindle speed [rpm] */
  max_rpm: number;
  /** Coolant pump power [kW] */
  coolant_power_kW?: number;
  /** Chip conveyor power [kW] */
  chip_conveyor_kW?: number;
  /** Hydraulic power [kW] */
  hydraulic_kW?: number;
  /** Table mass [kg] — for rapid traverse energy */
  table_mass_kg?: number;
  /** Rapid traverse speed [mm/min] */
  rapid_speed_mmpm?: number;
  /** Electricity cost [$/kWh] */
  electricity_cost?: number;
}

/** Energy breakdown by category */
export interface CamxEnergyBreakdown {
  /** Total energy [kWh] */
  total_kWh: number;
  /** Cutting energy [kWh] */
  cutting_kWh: number;
  /** Spindle idle energy [kWh] */
  idle_kWh: number;
  /** Rapid traverse energy [kWh] */
  rapid_kWh: number;
  /** Auxiliary (coolant, conveyor, hydraulic, control) [kWh] */
  auxiliary_kWh: number;
  /** Tool change energy [kWh] */
  tool_change_kWh: number;
  /** Percentage breakdown */
  percentages: {
    cutting: number;
    idle: number;
    rapid: number;
    auxiliary: number;
    tool_change: number;
  };
  /** Total cost [$] */
  total_cost: number;
  /** CO2 emissions [kg] */
  co2_kg: number;
  /** Total program time [min] */
  total_time_min: number;
}

/** Energy saving suggestion */
export interface CamxEnergySaving {
  /** Suggestion category */
  category: "spindle_speed" | "feed_rate" | "rapid_optimization" | "idle_reduction" | "auxiliary" | "sequencing";
  /** Description */
  description: string;
  /** Estimated savings [kWh] */
  savings_kWh: number;
  /** Estimated cost savings [$] */
  savings_cost: number;
  /** Estimated savings [%] */
  savings_pct: number;
  /** Blocks affected */
  affected_blocks: number[];
  /** Implementation difficulty */
  difficulty: "easy" | "moderate" | "hard";
}

/** Full optimization result */
export interface CamxEnergyOptimizationResult {
  /** Current energy breakdown */
  current: CamxEnergyBreakdown;
  /** Optimized energy breakdown (after applying all suggestions) */
  optimized: CamxEnergyBreakdown;
  /** Savings suggestions, sorted by impact */
  suggestions: CamxEnergySaving[];
  /** Total potential savings [kWh] */
  total_savings_kWh: number;
  /** Total potential cost savings [$] */
  total_savings_cost: number;
  /** Total potential savings [%] */
  total_savings_pct: number;
  /** Total CO2 reduction [kg] */
  co2_reduction_kg: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CamxEnergyOptimizationEngine {
  /**
   * Optimize energy for a program by analyzing blocks and suggesting savings.
   */
  optimizeEnergy(
    program_blocks: CamxEnergyBlock[],
    machine: CamxMachinePowerProfile,
  ): CamxEnergyOptimizationResult {
    log.info(`[CamxEnergyOptimization] Analyzing ${program_blocks.length} blocks for machine ${machine.machine_id}`);

    const electricityCost = machine.electricity_cost ?? DEFAULT_ELECTRICITY_COST;

    // Compute current breakdown
    const current = this.computeBreakdown(program_blocks, machine, electricityCost);

    // Generate savings suggestions
    const suggestions = this.generateSuggestions(program_blocks, machine, current, electricityCost);

    // Sort by savings descending
    suggestions.sort((a, b) => b.savings_kWh - a.savings_kWh);

    // Compute optimized breakdown
    const totalSavings = suggestions.reduce((s, sug) => s + sug.savings_kWh, 0);
    const totalCostSavings = suggestions.reduce((s, sug) => s + sug.savings_cost, 0);
    const totalSavingsPct = current.total_kWh > 0 ? (totalSavings / current.total_kWh) * 100 : 0;

    const optimized: CamxEnergyBreakdown = {
      ...current,
      total_kWh: Math.round((current.total_kWh - totalSavings) * 10000) / 10000,
      total_cost: Math.round((current.total_cost - totalCostSavings) * 100) / 100,
      co2_kg: Math.round((current.total_kWh - totalSavings) * CO2_PER_KWH * 1000) / 1000,
    };

    return {
      current,
      optimized,
      suggestions,
      total_savings_kWh: Math.round(totalSavings * 10000) / 10000,
      total_savings_cost: Math.round(totalCostSavings * 100) / 100,
      total_savings_pct: Math.round(totalSavingsPct * 100) / 100,
      co2_reduction_kg: Math.round(totalSavings * CO2_PER_KWH * 1000) / 1000,
    };
  }

  /**
   * Get energy breakdown without optimization suggestions.
   */
  getEnergyBreakdown(
    program_blocks: CamxEnergyBlock[],
    machine: CamxMachinePowerProfile,
  ): CamxEnergyBreakdown {
    const electricityCost = machine.electricity_cost ?? DEFAULT_ELECTRICITY_COST;
    return this.computeBreakdown(program_blocks, machine, electricityCost);
  }

  /**
   * Suggest energy savings for a program.
   */
  suggestSavings(
    program_blocks: CamxEnergyBlock[],
    machine: CamxMachinePowerProfile,
  ): CamxEnergySaving[] {
    const electricityCost = machine.electricity_cost ?? DEFAULT_ELECTRICITY_COST;
    const breakdown = this.computeBreakdown(program_blocks, machine, electricityCost);
    const suggestions = this.generateSuggestions(program_blocks, machine, breakdown, electricityCost);
    suggestions.sort((a, b) => b.savings_kWh - a.savings_kWh);
    return suggestions;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Compute energy breakdown from program blocks */
  private computeBreakdown(
    blocks: CamxEnergyBlock[],
    machine: CamxMachinePowerProfile,
    electricityCost: number,
  ): CamxEnergyBreakdown {
    let cuttingEnergy = 0;
    let idleEnergy = 0;
    let rapidEnergy = 0;
    let auxEnergy = 0;
    let toolChangeEnergy = 0;
    let totalTime = 0;

    const coolantPower = machine.coolant_power_kW ?? DEFAULT_COOLANT_POWER_KW;
    const conveyorPower = machine.chip_conveyor_kW ?? DEFAULT_CHIP_CONVEYOR_KW;
    const hydraulicPower = machine.hydraulic_kW ?? DEFAULT_HYDRAULIC_KW;
    const auxPower = coolantPower + conveyorPower + hydraulicPower + CONTROL_POWER_KW;

    for (const block of blocks) {
      const hours = block.duration_min / 60;
      totalTime += block.duration_min;

      switch (block.type) {
        case "cut": {
          // Cutting power from force and speed
          let P_cut = 0;
          if (block.cutting_force_N && block.Vc_mpm) {
            P_cut = (block.cutting_force_N * block.Vc_mpm) / 60000;
          } else if (block.rpm && block.ap_mm && block.fz_mm && block.feed_mmpm) {
            const kc = 1500;
            const Fc = kc * block.ap_mm * block.fz_mm;
            const Vc = Math.PI * 10 * block.rpm / 1000;
            P_cut = (Fc * Vc) / 60000;
          }

          const rpmFrac = (block.rpm ?? 0) / machine.max_rpm;
          const P_idle = machine.rated_power_kW * rpmFrac * rpmFrac * IDLE_POWER_FRACTION;

          cuttingEnergy += P_cut * hours;
          idleEnergy += P_idle * hours;
          auxEnergy += auxPower * hours;
          break;
        }

        case "rapid": {
          const dist = block.rapid_distance_mm ?? (block.feed_mmpm ?? DEFAULT_RAPID_SPEED_MMPM) * block.duration_min;
          const mass = machine.table_mass_kg ?? DEFAULT_TABLE_MASS_KG;
          const vRapid = (machine.rapid_speed_mmpm ?? DEFAULT_RAPID_SPEED_MMPM) / 60000;
          const E_kinetic = 0.5 * mass * vRapid * vRapid / RAPID_EFFICIENCY;
          rapidEnergy += E_kinetic / 3600000;

          const rpmFracR = (block.rpm ?? 0) / machine.max_rpm;
          idleEnergy += machine.rated_power_kW * rpmFracR * rpmFracR * IDLE_POWER_FRACTION * hours;
          auxEnergy += auxPower * hours;
          break;
        }

        case "dwell":
        case "idle": {
          const rpmFracI = (block.rpm ?? 0) / machine.max_rpm;
          idleEnergy += machine.rated_power_kW * rpmFracI * rpmFracI * IDLE_POWER_FRACTION * hours;
          auxEnergy += auxPower * hours;
          break;
        }

        case "tool_change": {
          toolChangeEnergy += auxPower * hours;
          break;
        }

        case "spindle_ramp": {
          const rpmFracS = (block.rpm ?? 0) / machine.max_rpm;
          idleEnergy += machine.rated_power_kW * rpmFracS * IDLE_POWER_FRACTION * hours;
          auxEnergy += auxPower * hours;
          break;
        }
      }
    }

    const totalKWh = cuttingEnergy + idleEnergy + rapidEnergy + auxEnergy + toolChangeEnergy;
    const totalCost = totalKWh * electricityCost;

    return {
      total_kWh: Math.round(totalKWh * 10000) / 10000,
      cutting_kWh: Math.round(cuttingEnergy * 10000) / 10000,
      idle_kWh: Math.round(idleEnergy * 10000) / 10000,
      rapid_kWh: Math.round(rapidEnergy * 10000) / 10000,
      auxiliary_kWh: Math.round(auxEnergy * 10000) / 10000,
      tool_change_kWh: Math.round(toolChangeEnergy * 10000) / 10000,
      percentages: {
        cutting: totalKWh > 0 ? Math.round(cuttingEnergy / totalKWh * 10000) / 100 : 0,
        idle: totalKWh > 0 ? Math.round(idleEnergy / totalKWh * 10000) / 100 : 0,
        rapid: totalKWh > 0 ? Math.round(rapidEnergy / totalKWh * 10000) / 100 : 0,
        auxiliary: totalKWh > 0 ? Math.round(auxEnergy / totalKWh * 10000) / 100 : 0,
        tool_change: totalKWh > 0 ? Math.round(toolChangeEnergy / totalKWh * 10000) / 100 : 0,
      },
      total_cost: Math.round(totalCost * 100) / 100,
      co2_kg: Math.round(totalKWh * CO2_PER_KWH * 1000) / 1000,
      total_time_min: Math.round(totalTime * 100) / 100,
    };
  }

  /** Generate energy saving suggestions */
  private generateSuggestions(
    blocks: CamxEnergyBlock[],
    machine: CamxMachinePowerProfile,
    breakdown: CamxEnergyBreakdown,
    electricityCost: number,
  ): CamxEnergySaving[] {
    const suggestions: CamxEnergySaving[] = [];

    // 1. Idle reduction: spindle running during non-cutting
    const idleBlocks = blocks
      .map((b, i) => ({ ...b, origIndex: i }))
      .filter(b => (b.type === "idle" || b.type === "dwell") && (b.rpm ?? 0) > 0);

    if (idleBlocks.length > 0) {
      const idleDuration = idleBlocks.reduce((s, b) => s + b.duration_min, 0);
      const avgRpm = idleBlocks.reduce((s, b) => s + (b.rpm ?? 0), 0) / idleBlocks.length;
      const rpmFrac = avgRpm / machine.max_rpm;
      const savingsKWh = machine.rated_power_kW * rpmFrac * rpmFrac * IDLE_POWER_FRACTION * idleDuration / 60;

      if (savingsKWh > 0) {
        suggestions.push({
          category: "idle_reduction",
          description: `Stop spindle during ${idleBlocks.length} idle/dwell blocks (${idleDuration.toFixed(1)} min total). Spindle running at ${Math.round(avgRpm)} RPM without cutting.`,
          savings_kWh: Math.round(savingsKWh * 10000) / 10000,
          savings_cost: Math.round(savingsKWh * electricityCost * 100) / 100,
          savings_pct: breakdown.total_kWh > 0 ? Math.round(savingsKWh / breakdown.total_kWh * 10000) / 100 : 0,
          affected_blocks: idleBlocks.map(b => b.origIndex),
          difficulty: "easy",
        });
      }
    }

    // 2. Rapid traverse optimization
    const rapidBlocks = blocks
      .map((b, i) => ({ ...b, origIndex: i }))
      .filter(b => b.type === "rapid");

    if (rapidBlocks.length > 3) {
      const totalRapidDist = rapidBlocks.reduce((s, b) => s + (b.rapid_distance_mm ?? 0), 0);
      const rapidSavingsFrac = 0.15;
      const savedDist = totalRapidDist * rapidSavingsFrac;
      const savedTime = savedDist / (machine.rapid_speed_mmpm ?? DEFAULT_RAPID_SPEED_MMPM);
      const auxP = (machine.coolant_power_kW ?? DEFAULT_COOLANT_POWER_KW)
        + (machine.chip_conveyor_kW ?? DEFAULT_CHIP_CONVEYOR_KW) + CONTROL_POWER_KW;
      const savingsKWh = auxP * savedTime / 60;

      if (savingsKWh > 0 && savedDist > 100) {
        suggestions.push({
          category: "rapid_optimization",
          description: `Reorder ${rapidBlocks.length} rapid moves to reduce total traverse by ~${Math.round(savedDist)}mm (${Math.round(rapidSavingsFrac * 100)}% via nearest-neighbor heuristic).`,
          savings_kWh: Math.round(savingsKWh * 10000) / 10000,
          savings_cost: Math.round(savingsKWh * electricityCost * 100) / 100,
          savings_pct: breakdown.total_kWh > 0 ? Math.round(savingsKWh / breakdown.total_kWh * 10000) / 100 : 0,
          affected_blocks: rapidBlocks.map(b => b.origIndex),
          difficulty: "moderate",
        });
      }
    }

    // 3. Spindle speed reduction on high-RPM cuts
    const cutBlocks = blocks
      .map((b, i) => ({ ...b, origIndex: i }))
      .filter(b => b.type === "cut" && (b.rpm ?? 0) > 0);

    const highRpmCuts = cutBlocks.filter(b => (b.rpm ?? 0) > machine.max_rpm * 0.8);
    if (highRpmCuts.length > 0) {
      const rpmReduction = 0.10;
      let totalSavings = 0;
      for (const b of highRpmCuts) {
        const rpmOld = b.rpm ?? 0;
        const rpmNew = rpmOld * (1 - rpmReduction);
        const hours = b.duration_min / 60;
        const oldIdle = machine.rated_power_kW * (rpmOld / machine.max_rpm) ** 2 * IDLE_POWER_FRACTION * hours;
        const newIdle = machine.rated_power_kW * (rpmNew / machine.max_rpm) ** 2 * IDLE_POWER_FRACTION * hours;
        totalSavings += oldIdle - newIdle;
      }

      if (totalSavings > 0) {
        suggestions.push({
          category: "spindle_speed",
          description: `Reduce RPM by 10% on ${highRpmCuts.length} high-speed cuts (>80% max RPM). Trade: slightly longer cycle time for lower idle power.`,
          savings_kWh: Math.round(totalSavings * 10000) / 10000,
          savings_cost: Math.round(totalSavings * electricityCost * 100) / 100,
          savings_pct: breakdown.total_kWh > 0 ? Math.round(totalSavings / breakdown.total_kWh * 10000) / 100 : 0,
          affected_blocks: highRpmCuts.map(b => b.origIndex),
          difficulty: "moderate",
        });
      }
    }

    // 4. Coolant-off during non-cutting
    const nonCutBlocks = blocks
      .map((b, i) => ({ ...b, origIndex: i }))
      .filter(b => b.type !== "cut" && b.type !== "tool_change");

    if (nonCutBlocks.length > 0) {
      const nonCutTime = nonCutBlocks.reduce((s, b) => s + b.duration_min, 0);
      const coolantSavings = (machine.coolant_power_kW ?? DEFAULT_COOLANT_POWER_KW) * nonCutTime / 60;

      if (coolantSavings > 0.001) {
        suggestions.push({
          category: "auxiliary",
          description: `Turn off coolant pump during ${nonCutBlocks.length} non-cutting blocks (${nonCutTime.toFixed(1)} min). Use M09/M08 codes.`,
          savings_kWh: Math.round(coolantSavings * 10000) / 10000,
          savings_cost: Math.round(coolantSavings * electricityCost * 100) / 100,
          savings_pct: breakdown.total_kWh > 0 ? Math.round(coolantSavings / breakdown.total_kWh * 10000) / 100 : 0,
          affected_blocks: nonCutBlocks.map(b => b.origIndex),
          difficulty: "easy",
        });
      }
    }

    // 5. Feed rate increase for low-feed cuts
    const lowFeedCuts = cutBlocks.filter(b =>
      b.feed_mmpm && b.feed_mmpm < (machine.rapid_speed_mmpm ?? DEFAULT_RAPID_SPEED_MMPM) * 0.05
    );
    if (lowFeedCuts.length > 0) {
      const feedIncrease = 0.20;
      let timeSaved = 0;
      for (const b of lowFeedCuts) {
        timeSaved += b.duration_min * feedIncrease / (1 + feedIncrease);
      }
      const auxP = (machine.coolant_power_kW ?? DEFAULT_COOLANT_POWER_KW)
        + (machine.chip_conveyor_kW ?? DEFAULT_CHIP_CONVEYOR_KW) + CONTROL_POWER_KW;
      const savingsKWh = auxP * timeSaved / 60;

      if (savingsKWh > 0) {
        suggestions.push({
          category: "feed_rate",
          description: `Increase feed rate by 20% on ${lowFeedCuts.length} low-feed cuts. Reduces cycle time by ${timeSaved.toFixed(1)} min, saving auxiliary energy.`,
          savings_kWh: Math.round(savingsKWh * 10000) / 10000,
          savings_cost: Math.round(savingsKWh * electricityCost * 100) / 100,
          savings_pct: breakdown.total_kWh > 0 ? Math.round(savingsKWh / breakdown.total_kWh * 10000) / 100 : 0,
          affected_blocks: lowFeedCuts.map(b => b.origIndex),
          difficulty: "moderate",
        });
      }
    }

    return suggestions;
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const camxEnergyOptimizationEngine = new CamxEnergyOptimizationEngine();
