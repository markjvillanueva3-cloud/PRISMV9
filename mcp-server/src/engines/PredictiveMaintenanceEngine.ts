/**
 * PredictiveMaintenanceEngine — R21-MS1
 *
 * Tool wear prediction, replacement scheduling, failure risk assessment,
 * and maintenance interval optimization. Builds on R15 tool life models,
 * R17 closed-loop feedback, and R18 quality metrics.
 *
 * Actions:
 *   pm_predict_wear      — predict remaining tool life and wear state
 *   pm_schedule           — generate replacement schedule for tool set
 *   pm_failure_risk       — assess failure probability for current conditions
 *   pm_optimize_intervals — optimize maintenance intervals for cost/risk balance
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface ToolState {
  tool_id: string;
  tool_type: string;
  material_cutting: string;
  diameter_mm: number;
  current_usage_min: number;
  max_life_min: number;
  flank_wear_mm: number;
  max_flank_wear_mm: number;
  crater_wear_ratio: number;
  cutting_speed_m_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  pieces_produced: number;
}

interface WearPrediction {
  tool_id: string;
  current_wear_pct: number;
  predicted_remaining_min: number;
  predicted_remaining_pieces: number;
  wear_rate_mm_per_min: number;
  confidence: number;
  risk_level: "low" | "medium" | "high" | "critical";
  recommended_action: string;
}

interface ScheduleEntry {
  tool_id: string;
  tool_type: string;
  current_wear_pct: number;
  replacement_due_min: number;
  replacement_due_pieces: number;
  priority: "immediate" | "soon" | "planned" | "monitor";
  estimated_cost: number;
  risk_if_delayed: string;
}

interface FailureRisk {
  tool_id: string;
  failure_probability: number;
  failure_mode: string;
  severity: "minor" | "moderate" | "severe" | "catastrophic";
  risk_score: number;
  contributing_factors: { factor: string; weight: number; value: number }[];
  mitigation: string;
}

// ── Tool Material Database ─────────────────────────────────────────────────

const TOOL_MATERIALS: Record<string, {
  base_life_min: number;
  taylor_n: number;
  taylor_C: number;
  max_flank_wear_mm: number;
  cost_per_edge: number;
  failure_modes: string[];
}> = {
  carbide_uncoated: {
    base_life_min: 30, taylor_n: 0.25, taylor_C: 200,
    max_flank_wear_mm: 0.3, cost_per_edge: 8,
    failure_modes: ["flank_wear", "crater_wear", "chipping", "fracture"],
  },
  carbide_coated: {
    base_life_min: 60, taylor_n: 0.30, taylor_C: 350,
    max_flank_wear_mm: 0.3, cost_per_edge: 15,
    failure_modes: ["flank_wear", "coating_delamination", "crater_wear", "thermal_crack"],
  },
  cermet: {
    base_life_min: 45, taylor_n: 0.28, taylor_C: 280,
    max_flank_wear_mm: 0.25, cost_per_edge: 20,
    failure_modes: ["flank_wear", "notch_wear", "chipping"],
  },
  ceramic: {
    base_life_min: 20, taylor_n: 0.35, taylor_C: 500,
    max_flank_wear_mm: 0.2, cost_per_edge: 35,
    failure_modes: ["fracture", "thermal_shock", "notch_wear"],
  },
  cbn: {
    base_life_min: 40, taylor_n: 0.40, taylor_C: 600,
    max_flank_wear_mm: 0.2, cost_per_edge: 80,
    failure_modes: ["chipping", "chemical_wear", "diffusion_wear"],
  },
  hss: {
    base_life_min: 15, taylor_n: 0.125, taylor_C: 70,
    max_flank_wear_mm: 0.5, cost_per_edge: 3,
    failure_modes: ["flank_wear", "plastic_deformation", "built_up_edge"],
  },
};

// Workpiece material difficulty factors
const MATERIAL_DIFFICULTY: Record<string, number> = {
  aluminum: 0.3, brass: 0.4, mild_steel: 0.6, carbon_steel: 0.7,
  alloy_steel: 0.85, stainless_steel: 1.0, titanium: 1.4,
  inconel: 1.8, hardened_steel: 1.5, cast_iron: 0.65,
  copper: 0.45, tool_steel: 1.1,
};

// ── Helper Functions ───────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

function getToolMaterial(toolType: string): typeof TOOL_MATERIALS[string] {
  const key = toolType.toLowerCase().replace(/[\s-]/g, "_");
  return TOOL_MATERIALS[key] ?? TOOL_MATERIALS.carbide_coated;
}

function getMaterialDifficulty(material: string): number {
  const key = material.toLowerCase().replace(/[\s-]/g, "_");
  return MATERIAL_DIFFICULTY[key] ?? 0.8;
}

function predictWear(state: ToolState): WearPrediction {
  const toolMat = getToolMaterial(state.tool_type);
  const difficulty = getMaterialDifficulty(state.material_cutting);
  const maxWear = state.max_flank_wear_mm || toolMat.max_flank_wear_mm;

  // Current wear percentage
  const wearPct = state.flank_wear_mm / maxWear;

  // Wear rate: flank wear per minute (adjusted by difficulty)
  const wearRate = state.current_usage_min > 0
    ? (state.flank_wear_mm / state.current_usage_min)
    : (maxWear / (toolMat.base_life_min / difficulty));

  // Remaining life
  const remainingWear = maxWear - state.flank_wear_mm;
  const remainingMin = wearRate > 0 ? remainingWear / wearRate : toolMat.base_life_min;

  // Pieces remaining (extrapolate)
  const piecesPerMin = state.pieces_produced > 0 && state.current_usage_min > 0
    ? state.pieces_produced / state.current_usage_min : 1;
  const remainingPieces = Math.floor(remainingMin * piecesPerMin);

  // Confidence based on data quality
  const confidence = Math.min(0.95, 0.5 + (state.current_usage_min / toolMat.base_life_min) * 0.3
    + (state.pieces_produced > 0 ? 0.15 : 0));

  // Risk level
  const risk: WearPrediction["risk_level"] =
    wearPct >= 0.9 ? "critical" :
    wearPct >= 0.75 ? "high" :
    wearPct >= 0.5 ? "medium" : "low";

  // Recommended action
  const action =
    wearPct >= 0.9 ? "Replace immediately — exceeding safe wear limit" :
    wearPct >= 0.75 ? "Schedule replacement within next batch" :
    wearPct >= 0.5 ? "Monitor closely — plan replacement" :
    "Continue use — normal wear progression";

  return {
    tool_id: state.tool_id,
    current_wear_pct: round2(wearPct * 100),
    predicted_remaining_min: round2(remainingMin),
    predicted_remaining_pieces: remainingPieces,
    wear_rate_mm_per_min: round3(wearRate),
    confidence: round2(confidence),
    risk_level: risk,
    recommended_action: action,
  };
}

function assessFailureRisk(state: ToolState): FailureRisk {
  const toolMat = getToolMaterial(state.tool_type);
  const difficulty = getMaterialDifficulty(state.material_cutting);
  const maxWear = state.max_flank_wear_mm || toolMat.max_flank_wear_mm;
  const wearPct = state.flank_wear_mm / maxWear;

  const factors: FailureRisk["contributing_factors"] = [];

  // Factor 1: Wear level
  const wearFactor = Math.min(1, wearPct * 1.2);
  factors.push({ factor: "flank_wear_level", weight: 0.35, value: round2(wearFactor) });

  // Factor 2: Crater wear
  const craterFactor = state.crater_wear_ratio ?? 0;
  factors.push({ factor: "crater_wear_ratio", weight: 0.20, value: round2(craterFactor) });

  // Factor 3: Cutting speed aggressiveness
  const speedRef = toolMat.taylor_C * Math.pow(toolMat.base_life_min, -toolMat.taylor_n);
  const speedAggressiveness = state.cutting_speed_m_min > 0 ? state.cutting_speed_m_min / speedRef : 0.5;
  factors.push({ factor: "speed_aggressiveness", weight: 0.20, value: round2(Math.min(1, speedAggressiveness)) });

  // Factor 4: Material difficulty
  const diffFactor = Math.min(1, difficulty / 1.5);
  factors.push({ factor: "material_difficulty", weight: 0.15, value: round2(diffFactor) });

  // Factor 5: Usage beyond expected life
  const lifeFactor = state.current_usage_min > toolMat.base_life_min / difficulty
    ? Math.min(1, (state.current_usage_min / (toolMat.base_life_min / difficulty)) - 0.5)
    : 0;
  factors.push({ factor: "life_exceedance", weight: 0.10, value: round2(lifeFactor) });

  // Calculate weighted failure probability
  const probability = factors.reduce((sum, f) => sum + f.weight * f.value, 0);

  // Determine primary failure mode
  const modes = toolMat.failure_modes;
  const failureMode = wearPct > 0.8 ? modes[0]
    : craterFactor > 0.5 ? (modes.find(m => m.includes("crater")) ?? modes[1])
    : speedAggressiveness > 0.9 ? (modes.find(m => m.includes("thermal") || m.includes("fracture")) ?? modes[0])
    : modes[0];

  // Severity
  const severity: FailureRisk["severity"] =
    probability >= 0.8 ? "catastrophic" :
    probability >= 0.5 ? "severe" :
    probability >= 0.3 ? "moderate" : "minor";

  // Risk score (0-100)
  const riskScore = round2(probability * 100);

  // Mitigation
  const mitigation =
    probability >= 0.7 ? "Immediate tool change required. Inspect workpiece for damage." :
    probability >= 0.4 ? "Reduce cutting speed by 15-20%. Schedule tool change after current batch." :
    probability >= 0.2 ? "Monitor vibration and surface finish. Plan proactive replacement." :
    "Normal operation. Continue with standard monitoring.";

  return {
    tool_id: state.tool_id,
    failure_probability: round2(probability),
    failure_mode: failureMode,
    severity,
    risk_score: riskScore,
    contributing_factors: factors,
    mitigation,
  };
}

// ── Action Handlers ────────────────────────────────────────────────────────

function pmPredictWear(params: Record<string, unknown>): unknown {
  const state: ToolState = {
    tool_id: String(params.tool_id ?? "T001"),
    tool_type: String(params.tool_type ?? "carbide_coated"),
    material_cutting: String(params.material ?? "carbon_steel"),
    diameter_mm: Number(params.diameter_mm ?? 10),
    current_usage_min: Number(params.current_usage_min ?? 0),
    max_life_min: Number(params.max_life_min ?? 0),
    flank_wear_mm: Number(params.flank_wear_mm ?? 0),
    max_flank_wear_mm: Number(params.max_flank_wear_mm ?? 0),
    crater_wear_ratio: Number(params.crater_wear_ratio ?? 0),
    cutting_speed_m_min: Number(params.cutting_speed_m_min ?? 0),
    feed_per_tooth_mm: Number(params.feed_per_tooth_mm ?? 0),
    depth_of_cut_mm: Number(params.depth_of_cut_mm ?? 0),
    pieces_produced: Number(params.pieces_produced ?? 0),
  };

  const prediction = predictWear(state);

  return {
    tool_state: {
      tool_id: state.tool_id,
      tool_type: state.tool_type,
      material: state.material_cutting,
      current_usage_min: state.current_usage_min,
      flank_wear_mm: state.flank_wear_mm,
    },
    prediction,
    tool_material_info: {
      base_life_min: getToolMaterial(state.tool_type).base_life_min,
      max_flank_wear_mm: getToolMaterial(state.tool_type).max_flank_wear_mm,
      cost_per_edge: getToolMaterial(state.tool_type).cost_per_edge,
    },
    material_difficulty: getMaterialDifficulty(state.material_cutting),
  };
}

function pmSchedule(params: Record<string, unknown>): unknown {
  const tools: ToolState[] = [];
  if (Array.isArray(params.tools)) {
    for (const t of params.tools) {
      const tObj = t as Record<string, unknown>;
      tools.push({
        tool_id: String(tObj.tool_id ?? `T${tools.length + 1}`),
        tool_type: String(tObj.tool_type ?? "carbide_coated"),
        material_cutting: String(tObj.material ?? params.material ?? "carbon_steel"),
        diameter_mm: Number(tObj.diameter_mm ?? 10),
        current_usage_min: Number(tObj.current_usage_min ?? 0),
        max_life_min: Number(tObj.max_life_min ?? 0),
        flank_wear_mm: Number(tObj.flank_wear_mm ?? 0),
        max_flank_wear_mm: Number(tObj.max_flank_wear_mm ?? 0),
        crater_wear_ratio: Number(tObj.crater_wear_ratio ?? 0),
        cutting_speed_m_min: Number(tObj.cutting_speed_m_min ?? 0),
        feed_per_tooth_mm: Number(tObj.feed_per_tooth_mm ?? 0),
        depth_of_cut_mm: Number(tObj.depth_of_cut_mm ?? 0),
        pieces_produced: Number(tObj.pieces_produced ?? 0),
      });
    }
  } else {
    tools.push({
      tool_id: String(params.tool_id ?? "T001"),
      tool_type: String(params.tool_type ?? "carbide_coated"),
      material_cutting: String(params.material ?? "carbon_steel"),
      diameter_mm: Number(params.diameter_mm ?? 10),
      current_usage_min: Number(params.current_usage_min ?? 0),
      max_life_min: Number(params.max_life_min ?? 0),
      flank_wear_mm: Number(params.flank_wear_mm ?? 0),
      max_flank_wear_mm: Number(params.max_flank_wear_mm ?? 0),
      crater_wear_ratio: Number(params.crater_wear_ratio ?? 0),
      cutting_speed_m_min: Number(params.cutting_speed_m_min ?? 0),
      feed_per_tooth_mm: Number(params.feed_per_tooth_mm ?? 0),
      depth_of_cut_mm: Number(params.depth_of_cut_mm ?? 0),
      pieces_produced: Number(params.pieces_produced ?? 0),
    });
  }

  const schedule: ScheduleEntry[] = tools.map(state => {
    const prediction = predictWear(state);
    const toolMat = getToolMaterial(state.tool_type);
    const wearPct = prediction.current_wear_pct / 100;

    const priority: ScheduleEntry["priority"] =
      wearPct >= 0.9 ? "immediate" :
      wearPct >= 0.75 ? "soon" :
      wearPct >= 0.5 ? "planned" : "monitor";

    const riskIfDelayed =
      wearPct >= 0.9 ? "Catastrophic — tool breakage, workpiece damage" :
      wearPct >= 0.75 ? "High — degraded surface finish, dimensional drift" :
      wearPct >= 0.5 ? "Medium — accelerating wear, schedule proactively" :
      "Low — normal operation, routine monitoring";

    return {
      tool_id: state.tool_id,
      tool_type: state.tool_type,
      current_wear_pct: prediction.current_wear_pct,
      replacement_due_min: prediction.predicted_remaining_min,
      replacement_due_pieces: prediction.predicted_remaining_pieces,
      priority,
      estimated_cost: toolMat.cost_per_edge,
      risk_if_delayed: riskIfDelayed,
    };
  });

  const priorityOrder = { immediate: 0, soon: 1, planned: 2, monitor: 3 };
  schedule.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const totalCost = schedule.reduce((s, e) => s + e.estimated_cost, 0);
  const immediate = schedule.filter(e => e.priority === "immediate").length;
  const soon = schedule.filter(e => e.priority === "soon").length;

  return {
    total_tools: schedule.length,
    schedule,
    summary: {
      immediate_replacements: immediate,
      soon_replacements: soon,
      planned_replacements: schedule.filter(e => e.priority === "planned").length,
      monitoring: schedule.filter(e => e.priority === "monitor").length,
      total_replacement_cost: round2(totalCost),
    },
    urgency: immediate > 0 ? "critical" : soon > 0 ? "warning" : "normal",
  };
}

function pmFailureRisk(params: Record<string, unknown>): unknown {
  const state: ToolState = {
    tool_id: String(params.tool_id ?? "T001"),
    tool_type: String(params.tool_type ?? "carbide_coated"),
    material_cutting: String(params.material ?? "carbon_steel"),
    diameter_mm: Number(params.diameter_mm ?? 10),
    current_usage_min: Number(params.current_usage_min ?? 0),
    max_life_min: Number(params.max_life_min ?? 0),
    flank_wear_mm: Number(params.flank_wear_mm ?? 0),
    max_flank_wear_mm: Number(params.max_flank_wear_mm ?? 0),
    crater_wear_ratio: Number(params.crater_wear_ratio ?? 0),
    cutting_speed_m_min: Number(params.cutting_speed_m_min ?? 0),
    feed_per_tooth_mm: Number(params.feed_per_tooth_mm ?? 0),
    depth_of_cut_mm: Number(params.depth_of_cut_mm ?? 0),
    pieces_produced: Number(params.pieces_produced ?? 0),
  };

  const risk = assessFailureRisk(state);
  const prediction = predictWear(state);

  return {
    tool_state: {
      tool_id: state.tool_id,
      tool_type: state.tool_type,
      material: state.material_cutting,
      flank_wear_mm: state.flank_wear_mm,
      current_usage_min: state.current_usage_min,
    },
    failure_risk: risk,
    wear_prediction: {
      remaining_min: prediction.predicted_remaining_min,
      remaining_pieces: prediction.predicted_remaining_pieces,
      wear_rate: prediction.wear_rate_mm_per_min,
    },
    known_failure_modes: getToolMaterial(state.tool_type).failure_modes,
  };
}

function pmOptimizeIntervals(params: Record<string, unknown>): unknown {
  const toolType = String(params.tool_type ?? "carbide_coated");
  const material = String(params.material ?? "carbon_steel");
  const batchSize = Number(params.batch_size ?? 100);
  const cycleTimeMin = Number(params.cycle_time_min ?? 5);
  const scrapCost = Number(params.scrap_cost_per_piece ?? 50);
  const downtimeCostPerMin = Number(params.downtime_cost_per_min ?? 2);
  const changeTimeMin = Number(params.tool_change_time_min ?? 5);

  const toolMat = getToolMaterial(toolType);
  const difficulty = getMaterialDifficulty(material);
  const effectiveLife = toolMat.base_life_min / difficulty;
  const costPerEdge = toolMat.cost_per_edge;

  const intervals = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map(pct => {
    const intervalMin = effectiveLife * pct;
    const piecesPerInterval = Math.max(1, Math.floor(intervalMin / cycleTimeMin));
    const intervalsNeeded = Math.ceil(batchSize / piecesPerInterval);

    const toolCost = intervalsNeeded * costPerEdge;
    const downtimeCost = intervalsNeeded * changeTimeMin * downtimeCostPerMin;

    // Failure risk increases at higher wear percentages
    const failureProbPerPiece = pct > 0.8 ? (pct - 0.8) * 0.1 : 0;
    const expectedScrapPieces = batchSize * failureProbPerPiece;
    const scrapCostTotal = expectedScrapPieces * scrapCost;

    const totalCost = toolCost + downtimeCost + scrapCostTotal;
    const totalTimeMin = batchSize * cycleTimeMin + intervalsNeeded * changeTimeMin;

    return {
      replacement_at_wear_pct: round2(pct * 100),
      interval_min: round2(intervalMin),
      pieces_per_interval: piecesPerInterval,
      tool_changes_needed: intervalsNeeded,
      cost_breakdown: {
        tool_cost: round2(toolCost),
        downtime_cost: round2(downtimeCost),
        scrap_risk_cost: round2(scrapCostTotal),
        total_cost: round2(totalCost),
      },
      total_time_min: round2(totalTimeMin),
      cost_per_piece: round2(totalCost / batchSize),
      productivity_pcs_per_hr: round2((60 / totalTimeMin) * batchSize),
    };
  });

  const optimum = intervals.reduce((best, curr) =>
    curr.cost_breakdown.total_cost < best.cost_breakdown.total_cost ? curr : best
  );

  return {
    parameters: {
      tool_type: toolType,
      material,
      batch_size: batchSize,
      cycle_time_min: cycleTimeMin,
      effective_tool_life_min: round2(effectiveLife),
    },
    intervals,
    optimal: {
      replacement_at_wear_pct: optimum.replacement_at_wear_pct,
      interval_min: optimum.interval_min,
      cost_per_piece: optimum.cost_per_piece,
      total_cost: optimum.cost_breakdown.total_cost,
      productivity_pcs_per_hr: optimum.productivity_pcs_per_hr,
    },
    recommendation: `Replace at ${optimum.replacement_at_wear_pct}% wear (every ${optimum.interval_min} min) for optimal cost of $${optimum.cost_per_piece}/piece`,
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executePredictiveMaintenanceAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "pm_predict_wear":      return pmPredictWear(params);
    case "pm_schedule":          return pmSchedule(params);
    case "pm_failure_risk":      return pmFailureRisk(params);
    case "pm_optimize_intervals": return pmOptimizeIntervals(params);
    // Legacy maint_* actions (from intelligenceDispatcher binding)
    case "maint_analyze":        return pmPredictWear(params);
    case "maint_trend":          return pmPredictWear(params);
    case "maint_predict":        return pmPredictWear(params);
    case "maint_schedule":       return pmSchedule(params);
    case "maint_models":         return pmOptimizeIntervals(params);
    case "maint_thresholds":     return pmFailureRisk(params);
    case "maint_alerts":         return pmFailureRisk(params);
    case "maint_status":         return pmPredictWear(params);
    case "maint_history":        return pmSchedule(params);
    case "maint_get":            return pmPredictWear(params);
    default:
      throw new Error(`PredictiveMaintenanceEngine: unknown action "${action}"`);
  }
}

// Legacy alias for intelligenceDispatcher binding
export const predictiveMaintenance = executePredictiveMaintenanceAction;
