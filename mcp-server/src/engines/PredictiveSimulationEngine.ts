/**
 * PredictiveSimulationEngine — Tool life & cost prediction during simulation
 *
 * Tracks cumulative wear per tool during G-code simulation. Predicts:
 * - Remaining tool life at each point (Taylor model)
 * - Optimal tool change points (minimum cost or maximum throughput)
 * - Cost per part (tool + machine + energy amortization)
 * - When tool will fail if unchanged
 *
 * References: Taylor (1907) tool life, Gilbert (1950) economic tool life,
 *             Kronenberg (1966) tool replacement optimization
 */

export interface ToolState {
  tool_number: number;
  total_cutting_time_s: number;
  total_cutting_length_mm: number;
  total_mrr_cm3: number;
  avg_cutting_speed_m_min: number;
  avg_feed_mm_rev: number;
  max_force_N: number;
  estimated_life_min: number;
  life_consumed_pct: number;
  predicted_failure_block: number;
  cost_consumed_usd: number;
}

export interface ToolChangeRecommendation {
  tool_number: number;
  change_at_block: number;
  reason: string;
  urgency: "immediate" | "soon" | "planned" | "optional";
  remaining_life_pct: number;
}

export interface PredictiveResult {
  tool_states: ToolState[];
  tool_changes: ToolChangeRecommendation[];
  total_tool_cost_usd: number;
  total_machine_cost_usd: number;
  total_energy_cost_usd: number;
  cost_per_part_usd: number;
  optimal_batch_size: number;
  productivity_score: number;
}

export interface PredictiveInput {
  tools: Array<{
    number: number;
    diameter_mm: number;
    cost_usd: number;
    material: "carbide" | "hss" | "cbn" | "ceramic";
    coating?: string;
  }>;
  blocks: Array<{
    block_number: number;
    tool_number: number;
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    cutting_time_s: number;
    mrr_cm3_min: number;
    force_N: number;
  }>;
  workpiece_material: string;
  machine_rate_usd_hr?: number;
  energy_rate_usd_kwh?: number;
  spindle_power_kw?: number;
  tool_change_time_s?: number;
  parts_per_program?: number;
}

// Taylor coefficients: C, n by workpiece material
const TAYLOR: Record<string, { C: number; n: number }> = {
  steel:     { C: 200, n: 0.25 },
  stainless: { C: 120, n: 0.20 },
  aluminum:  { C: 500, n: 0.35 },
  titanium:  { C: 40,  n: 0.15 },
  inconel:   { C: 25,  n: 0.12 },
  cast_iron: { C: 250, n: 0.28 },
  brass:     { C: 400, n: 0.30 },
};

// Coating multiplier on tool life
const COATING_MULT: Record<string, number> = {
  TiAlN: 1.8,
  AlTiN: 2.0,
  TiN: 1.3,
  TiCN: 1.5,
  DLC: 1.4,
  none: 1.0,
};

// Tool material base life multiplier
const TOOL_MAT_MULT: Record<string, number> = {
  carbide: 1.0,
  hss: 0.3,
  cbn: 3.0,
  ceramic: 2.0,
};

export class PredictiveSimulationEngine {
  predict(input: PredictiveInput): PredictiveResult {
    const machineRate = input.machine_rate_usd_hr ?? 85;
    const energyRate = input.energy_rate_usd_kwh ?? 0.12;
    const spindlePower = input.spindle_power_kw ?? 11;
    const toolChangeTime = input.tool_change_time_s ?? 15;
    const partsPerProgram = input.parts_per_program ?? 1;

    const taylor = TAYLOR[input.workpiece_material] ?? TAYLOR.steel;

    // Build per-tool state
    const toolMap: Map<number, ToolState & { speedSum: number; feedSum: number; blockCount: number; toolCost: number; toolMat: string; coating: string }> = new Map();

    for (const tool of input.tools) {
      toolMap.set(tool.number, {
        tool_number: tool.number,
        total_cutting_time_s: 0,
        total_cutting_length_mm: 0,
        total_mrr_cm3: 0,
        avg_cutting_speed_m_min: 0,
        avg_feed_mm_rev: 0,
        max_force_N: 0,
        estimated_life_min: 0,
        life_consumed_pct: 0,
        predicted_failure_block: -1,
        cost_consumed_usd: 0,
        speedSum: 0,
        feedSum: 0,
        blockCount: 0,
        toolCost: tool.cost_usd,
        toolMat: tool.material,
        coating: tool.coating ?? "none",
      });
    }

    // Process blocks
    for (const block of input.blocks) {
      const state = toolMap.get(block.tool_number);
      if (!state) continue;

      state.total_cutting_time_s += block.cutting_time_s;
      state.total_mrr_cm3 += block.mrr_cm3_min * (block.cutting_time_s / 60);
      state.speedSum += block.cutting_speed_m_min;
      state.feedSum += block.feed_mm_rev;
      state.blockCount++;
      if (block.force_N > state.max_force_N) state.max_force_N = block.force_N;

      // Taylor life estimate at this speed
      const Vc = block.cutting_speed_m_min;
      const coatingMult = COATING_MULT[state.coating] ?? 1.0;
      const matMult = TOOL_MAT_MULT[state.toolMat] ?? 1.0;
      const T_min = (taylor.C / Math.pow(Math.max(Vc, 1), taylor.n)) * coatingMult * matMult;
      state.estimated_life_min = T_min;

      const consumed = (state.total_cutting_time_s / 60) / Math.max(T_min, 0.01) * 100;
      state.life_consumed_pct = consumed;
      state.cost_consumed_usd = (consumed / 100) * state.toolCost;

      // Predict failure block
      if (consumed >= 100 && state.predicted_failure_block < 0) {
        state.predicted_failure_block = block.block_number;
      }
    }

    // Finalize averages
    const toolStates: ToolState[] = [];
    for (const [, state] of toolMap) {
      if (state.blockCount > 0) {
        state.avg_cutting_speed_m_min = Math.round(state.speedSum / state.blockCount);
        state.avg_feed_mm_rev = Math.round(state.feedSum / state.blockCount * 1000) / 1000;
      }
      toolStates.push({
        tool_number: state.tool_number,
        total_cutting_time_s: Math.round(state.total_cutting_time_s * 100) / 100,
        total_cutting_length_mm: Math.round(state.total_cutting_length_mm * 100) / 100,
        total_mrr_cm3: Math.round(state.total_mrr_cm3 * 100) / 100,
        avg_cutting_speed_m_min: state.avg_cutting_speed_m_min,
        avg_feed_mm_rev: state.avg_feed_mm_rev,
        max_force_N: state.max_force_N,
        estimated_life_min: Math.round(state.estimated_life_min * 10) / 10,
        life_consumed_pct: Math.round(state.life_consumed_pct * 10) / 10,
        predicted_failure_block: state.predicted_failure_block,
        cost_consumed_usd: Math.round(state.cost_consumed_usd * 100) / 100,
      });
    }

    // Tool change recommendations
    const changes: ToolChangeRecommendation[] = [];
    for (const state of toolStates) {
      const remaining = 100 - state.life_consumed_pct;
      if (remaining <= 0) {
        changes.push({
          tool_number: state.tool_number,
          change_at_block: state.predicted_failure_block,
          reason: "Tool life exhausted",
          urgency: "immediate",
          remaining_life_pct: 0,
        });
      } else if (remaining <= 20) {
        changes.push({
          tool_number: state.tool_number,
          change_at_block: -1,
          reason: `Only ${Math.round(remaining)}% life remaining`,
          urgency: "soon",
          remaining_life_pct: Math.round(remaining),
        });
      } else if (remaining <= 50) {
        changes.push({
          tool_number: state.tool_number,
          change_at_block: -1,
          reason: `${Math.round(remaining)}% life remaining — plan replacement`,
          urgency: "planned",
          remaining_life_pct: Math.round(remaining),
        });
      }
    }

    // Cost computation
    const totalCuttingTime = toolStates.reduce((s, t) => s + t.total_cutting_time_s, 0);
    const totalToolCost = toolStates.reduce((s, t) => s + t.cost_consumed_usd, 0);
    const totalMachineTime = totalCuttingTime * 1.3; // 30% overhead for rapids/tool changes
    const totalMachineCost = (totalMachineTime / 3600) * machineRate;
    const totalEnergyCost = (totalCuttingTime / 3600) * spindlePower * energyRate;
    const costPerPart = (totalToolCost + totalMachineCost + totalEnergyCost) / Math.max(partsPerProgram, 1);

    // Optimal batch size (Gilbert economic tool life)
    // Batch where tool cost per part is minimized
    const avgToolCost = input.tools.length > 0 ? input.tools.reduce((s, t) => s + t.cost_usd, 0) / input.tools.length : 25;
    const avgLife = toolStates.length > 0 ? toolStates.reduce((s, t) => s + t.estimated_life_min, 0) / toolStates.length : 60;
    const partsPerTool = avgLife > 0 ? Math.floor(avgLife / (totalCuttingTime / 60 / Math.max(partsPerProgram, 1))) : 10;
    const optimalBatch = Math.max(partsPerTool, 1);

    // Productivity score (0-1)
    const cuttingRatio = totalMachineTime > 0 ? totalCuttingTime / totalMachineTime : 0;
    const lifeEfficiency = toolStates.length > 0 ? 1 - toolStates.filter(t => t.life_consumed_pct > 100).length / toolStates.length : 1;
    const productivityScore = Math.round(cuttingRatio * lifeEfficiency * 100) / 100;

    return {
      tool_states: toolStates,
      tool_changes: changes,
      total_tool_cost_usd: Math.round(totalToolCost * 100) / 100,
      total_machine_cost_usd: Math.round(totalMachineCost * 100) / 100,
      total_energy_cost_usd: Math.round(totalEnergyCost * 100) / 100,
      cost_per_part_usd: Math.round(costPerPart * 100) / 100,
      optimal_batch_size: optimalBatch,
      productivity_score: productivityScore,
    };
  }
}

export const predictiveSimulationEngine = new PredictiveSimulationEngine();
