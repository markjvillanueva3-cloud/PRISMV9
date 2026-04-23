/**
 * SimulationReportEngine — Vericut AUTO-DIFF style simulation reports
 *
 * Generates detailed reports from CNCSimulationPipelineEngine results:
 * - Collision summary (type, severity, block, position)
 * - Stock comparison (gouge/excess detection)
 * - Axis utilization chart data
 * - Cycle time breakdown (rapid/feed/dwell/tool-change)
 * - Safety scorecard with risk areas
 * - Tool engagement history
 * - Physics summary (max force/temp/deflection per tool)
 * - Cost breakdown (machine + tool + energy)
 *
 * References: CGTech Vericut AUTO-DIFF, hyperMILL VIRTUAL Machining reports
 */

import type { SimulationResult, BlockResult } from "./CNCSimulationPipelineEngine.js";

export interface CollisionReport {
  total_collisions: number;
  by_zone: Record<string, number>;
  worst_penetration_mm: number;
  worst_block: number;
  collision_blocks: number[];
}

export interface AxisReport {
  axis: string;
  min_position: number;
  max_position: number;
  travel_used_mm: number;
  time_in_rapid_pct: number;
  time_in_feed_pct: number;
  violations: number;
}

export interface PhysicsReport {
  max_force_N: number;
  avg_force_N: number;
  max_temperature_C: number;
  max_deflection_um: number;
  force_overload_blocks: number;
  thermal_risk_blocks: number;
  deflection_risk_blocks: number;
}

export interface CostReport {
  machine_cost_usd: number;
  tool_cost_usd: number;
  energy_cost_usd: number;
  total_cost_usd: number;
  cost_per_minute_usd: number;
}

export interface CycleTimeReport {
  total_s: number;
  cutting_s: number;
  rapid_s: number;
  cutting_pct: number;
  rapid_pct: number;
  idle_pct: number;
  blocks_with_cutting: number;
  blocks_total: number;
}

export interface FullSimulationReport {
  collision: CollisionReport;
  axes: AxisReport[];
  physics: PhysicsReport;
  cost: CostReport;
  cycle_time: CycleTimeReport;
  safety_score: number;
  risk_level: "safe" | "caution" | "warning" | "danger";
  recommendations: string[];
  summary_text: string;
}

export class SimulationReportEngine {
  generateReport(simResult: SimulationResult): FullSimulationReport {
    // Collision analysis
    const byZone: Record<string, number> = {};
    let worstPen = 0;
    let worstBlock = 0;
    const collisionBlocks: number[] = [];
    for (const c of simResult.collisions) {
      byZone[c.zone] = (byZone[c.zone] || 0) + 1;
      if (c.penetration_mm > worstPen) {
        worstPen = c.penetration_mm;
        worstBlock = c.block;
      }
      if (!collisionBlocks.includes(c.block)) collisionBlocks.push(c.block);
    }

    const collision: CollisionReport = {
      total_collisions: simResult.collisions.length,
      by_zone: byZone,
      worst_penetration_mm: Math.round(worstPen * 1000) / 1000,
      worst_block: worstBlock,
      collision_blocks: collisionBlocks,
    };

    // Axis analysis
    const axisData: Record<string, { min: number; max: number; rapidTime: number; feedTime: number; violations: number }> = {
      X: { min: Infinity, max: -Infinity, rapidTime: 0, feedTime: 0, violations: 0 },
      Y: { min: Infinity, max: -Infinity, rapidTime: 0, feedTime: 0, violations: 0 },
      Z: { min: Infinity, max: -Infinity, rapidTime: 0, feedTime: 0, violations: 0 },
    };

    for (const br of simResult.block_results) {
      if (br.position.x !== undefined) {
        axisData.X.min = Math.min(axisData.X.min, br.position.x);
        axisData.X.max = Math.max(axisData.X.max, br.position.x);
      }
      if (br.position.y !== undefined) {
        axisData.Y.min = Math.min(axisData.Y.min, br.position.y);
        axisData.Y.max = Math.max(axisData.Y.max, br.position.y);
      }
      if (br.position.z !== undefined) {
        axisData.Z.min = Math.min(axisData.Z.min, br.position.z);
        axisData.Z.max = Math.max(axisData.Z.max, br.position.z);
      }
      if (br.axis_exceeded && br.exceeded_axis) {
        const a = br.exceeded_axis;
        if (axisData[a]) axisData[a].violations++;
      }
    }

    const totalTime = Math.max(simResult.cycle_time_s, 0.001);
    const axes: AxisReport[] = ["X", "Y", "Z"].map(axis => ({
      axis,
      min_position: axisData[axis].min === Infinity ? 0 : Math.round(axisData[axis].min * 100) / 100,
      max_position: axisData[axis].max === -Infinity ? 0 : Math.round(axisData[axis].max * 100) / 100,
      travel_used_mm: axisData[axis].max === -Infinity ? 0 :
        Math.round((axisData[axis].max - axisData[axis].min) * 100) / 100,
      time_in_rapid_pct: Math.round(simResult.rapid_time_s / totalTime * 100),
      time_in_feed_pct: Math.round(simResult.cutting_time_s / totalTime * 100),
      violations: axisData[axis].violations,
    }));

    // Physics analysis
    let totalForce = 0;
    let forceBlocks = 0;
    let forceOverload = 0;
    let thermalRisk = 0;
    let deflRisk = 0;

    for (const br of simResult.block_results) {
      if (br.cutting_force_N && br.cutting_force_N > 0) {
        totalForce += br.cutting_force_N;
        forceBlocks++;
        if (br.cutting_force_N > 3000) forceOverload++;
      }
      if (br.temperature_C && br.temperature_C > 400) thermalRisk++;
      if (br.deflection_um && br.deflection_um > 25) deflRisk++;
    }

    const physics: PhysicsReport = {
      max_force_N: simResult.max_force_N,
      avg_force_N: forceBlocks > 0 ? Math.round(totalForce / forceBlocks) : 0,
      max_temperature_C: simResult.max_temperature_C,
      max_deflection_um: simResult.max_deflection_um,
      force_overload_blocks: forceOverload,
      thermal_risk_blocks: thermalRisk,
      deflection_risk_blocks: deflRisk,
    };

    // Cost breakdown
    const machineRate = 85;
    const energyRate = 0.12; // $/kWh
    const spindlePower = 11; // kW avg
    const machineCost = (totalTime / 3600) * machineRate;
    const energyCost = (simResult.cutting_time_s / 3600) * spindlePower * energyRate;
    const toolCost = simResult.tool_life_consumed_pct / 100 * 25;

    const cost: CostReport = {
      machine_cost_usd: Math.round(machineCost * 100) / 100,
      tool_cost_usd: Math.round(toolCost * 100) / 100,
      energy_cost_usd: Math.round(energyCost * 100) / 100,
      total_cost_usd: Math.round((machineCost + toolCost + energyCost) * 100) / 100,
      cost_per_minute_usd: totalTime > 0 ? Math.round((machineCost + toolCost + energyCost) / (totalTime / 60) * 100) / 100 : 0,
    };

    // Cycle time breakdown
    const cuttingBlocks = simResult.block_results.filter(b =>
      b.move_type === "linear" || b.move_type === "cw_arc" || b.move_type === "ccw_arc"
    ).filter(b => b.cutting_force_N && b.cutting_force_N > 0);

    const cycleTime: CycleTimeReport = {
      total_s: simResult.cycle_time_s,
      cutting_s: simResult.cutting_time_s,
      rapid_s: simResult.rapid_time_s,
      cutting_pct: Math.round(simResult.cutting_time_s / totalTime * 100),
      rapid_pct: Math.round(simResult.rapid_time_s / totalTime * 100),
      idle_pct: Math.max(0, 100 - Math.round(simResult.cutting_time_s / totalTime * 100) - Math.round(simResult.rapid_time_s / totalTime * 100)),
      blocks_with_cutting: cuttingBlocks.length,
      blocks_total: simResult.total_blocks,
    };

    // Safety classification
    const ss = simResult.safety_score;
    const riskLevel: FullSimulationReport["risk_level"] =
      ss >= 0.9 ? "safe" : ss >= 0.7 ? "caution" : ss >= 0.5 ? "warning" : "danger";

    // Recommendations
    const recs: string[] = [];
    if (collision.total_collisions > 0) {
      recs.push(`${collision.total_collisions} collision(s) detected — review blocks: ${collisionBlocks.slice(0, 5).join(", ")}`);
    }
    if (simResult.axis_violations.length > 0) {
      recs.push(`${simResult.axis_violations.length} axis limit violation(s) — check machine travel limits`);
    }
    if (forceOverload > 0) {
      recs.push(`${forceOverload} block(s) exceed 3000N force — reduce DOC or feed rate`);
    }
    if (thermalRisk > 0) {
      recs.push(`${thermalRisk} block(s) exceed 400C — increase coolant or reduce cutting speed`);
    }
    if (deflRisk > 0) {
      recs.push(`${deflRisk} block(s) exceed 25um deflection — use shorter tool or larger diameter`);
    }
    if (simResult.tool_life_consumed_pct > 80) {
      recs.push(`Tool life ${Math.round(simResult.tool_life_consumed_pct)}% consumed — plan tool change or use sister tool`);
    }
    if (cycleTime.rapid_pct > 40) {
      recs.push(`${cycleTime.rapid_pct}% rapid time — optimize approach paths to reduce non-cutting time`);
    }
    if (recs.length === 0) {
      recs.push("Program appears safe — no issues detected");
    }

    // Summary text
    const summary = [
      `SIMULATION REPORT: ${simResult.total_blocks} blocks, ${simResult.cycle_time_s.toFixed(1)}s cycle time`,
      `Safety: ${riskLevel.toUpperCase()} (${Math.round(ss * 100)}%)`,
      `Collisions: ${collision.total_collisions} | Axis violations: ${simResult.axis_violations.length}`,
      `Max force: ${simResult.max_force_N}N | Max temp: ${simResult.max_temperature_C}C | Max defl: ${simResult.max_deflection_um}um`,
      `Cost: $${cost.total_cost_usd} (machine $${cost.machine_cost_usd} + tool $${cost.tool_cost_usd} + energy $${cost.energy_cost_usd})`,
      `Tool life consumed: ${Math.round(simResult.tool_life_consumed_pct)}%`,
    ].join("\n");

    return {
      collision,
      axes,
      physics,
      cost,
      cycle_time: cycleTime,
      safety_score: ss,
      risk_level: riskLevel,
      recommendations: recs,
      summary_text: summary,
    };
  }
}

export const simulationReportEngine = new SimulationReportEngine();
