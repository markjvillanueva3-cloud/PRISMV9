/**
 * R19-MS1: Decision Support Engine
 *
 * Multi-factor parameter recommendation synthesizing R15-R18:
 *   - ds_recommend:  Recommend cutting parameters for a given scenario
 *   - ds_validate:   Validate proposed parameters against all constraints
 *   - ds_compare:    Compare two parameter sets across all dimensions
 *   - ds_explain:    Explain why a recommendation was made (decision rationale)
 *
 * Integrates: Kienzle force, Taylor tool life, thermal, surface quality,
 *   SPC capability, tool wear, multi-pass strategy, cost models
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface ScenarioInput {
  material: string;
  operation: "roughing" | "finishing" | "semi_finish" | "drilling" | "turning";
  tool_diameter_mm: number;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;
  target_ra_um?: number;
  tolerance_mm?: number;
  batch_size?: number;
  priority?: "quality" | "productivity" | "cost" | "balanced";
  machine_power_kw?: number;
  max_force_N?: number;
  tool_material?: string;
  coolant?: boolean;
}

interface RecommendResult {
  action: "ds_recommend";
  recommended: {
    cutting_speed_mpm: number;
    feed_per_tooth_mm: number;
    depth_of_cut_mm: number;
    width_of_cut_mm: number;
    spindle_rpm: number;
    feed_rate_mm_min: number;
  };
  predictions: {
    cutting_force_N: number;
    spindle_power_kw: number;
    tool_life_min: number;
    surface_ra_um: number;
    mrr_cm3_min: number;
    cycle_time_min_per_100mm: number;
    dimensional_error_um: number;
    temperature_rise_C: number;
  };
  constraints_met: Array<{ constraint: string; value: number; limit: number; margin_pct: number; status: string }>;
  confidence: number;
  rationale: string[];
}

interface ValidateResult {
  action: "ds_validate";
  valid: boolean;
  score: number;  // 0-100
  checks: Array<{
    check: string;
    status: "pass" | "warn" | "fail";
    actual: number;
    limit: number;
    margin_pct: number;
  }>;
  warnings: string[];
  blockers: string[];
}

interface CompareResult {
  action: "ds_compare";
  set_a: { label: string; scores: Record<string, number> };
  set_b: { label: string; scores: Record<string, number> };
  winner: string;
  dimensions: Array<{
    dimension: string;
    a_value: number;
    b_value: number;
    better: "a" | "b" | "tie";
    importance: number;
  }>;
  recommendation: string;
}

interface ExplainResult {
  action: "ds_explain";
  decision_tree: Array<{ step: number; factor: string; reasoning: string; impact: string }>;
  trade_offs: Array<{ between: string; choice: string; why: string }>;
  sensitivity: Array<{ parameter: string; if_increased_10pct: string; if_decreased_10pct: string }>;
  confidence_factors: Array<{ factor: string; confidence: number; basis: string }>;
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MaterialData {
  kc1_1: number; mc: number;
  taylor_C: number; taylor_n: number;
  vc_range: [number, number];  // Recommended speed range
  fz_range: [number, number];  // Feed per tooth range
  thermal_limit: number;
  hardness_hrc?: number;
}

const MATERIALS: Record<string, MaterialData> = {
  steel_1045: { kc1_1: 1780, mc: 0.25, taylor_C: 350, taylor_n: 0.25, vc_range: [120, 250], fz_range: [0.08, 0.25], thermal_limit: 250 },
  steel_4140: { kc1_1: 2100, mc: 0.25, taylor_C: 280, taylor_n: 0.22, vc_range: [100, 200], fz_range: [0.06, 0.20], thermal_limit: 200 },
  aluminum_6061: { kc1_1: 790, mc: 0.23, taylor_C: 800, taylor_n: 0.35, vc_range: [200, 600], fz_range: [0.08, 0.30], thermal_limit: 600 },
  aluminum_7075: { kc1_1: 850, mc: 0.23, taylor_C: 700, taylor_n: 0.33, vc_range: [180, 500], fz_range: [0.08, 0.28], thermal_limit: 500 },
  titanium_ti6al4v: { kc1_1: 1650, mc: 0.22, taylor_C: 80, taylor_n: 0.18, vc_range: [30, 80], fz_range: [0.05, 0.15], thermal_limit: 80 },
  stainless_304: { kc1_1: 2200, mc: 0.26, taylor_C: 200, taylor_n: 0.20, vc_range: [80, 150], fz_range: [0.06, 0.18], thermal_limit: 150 },
  cast_iron: { kc1_1: 1100, mc: 0.20, taylor_C: 400, taylor_n: 0.28, vc_range: [150, 300], fz_range: [0.10, 0.30], thermal_limit: 300 },
  inconel_718: { kc1_1: 2800, mc: 0.28, taylor_C: 40, taylor_n: 0.15, vc_range: [15, 50], fz_range: [0.04, 0.12], thermal_limit: 50 },
};

function getMat(name: string): MaterialData {
  const key = name.toLowerCase().replace(/[\s-]/g, "_");
  return MATERIALS[key] ?? MATERIALS.steel_1045;
}

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

function kienzleForce(kc1_1: number, mc: number, h: number, ap: number, ae: number): number {
  return kc1_1 * Math.pow(Math.max(h, 0.01), -mc) * ap * ae;
}

function taylorLife(C: number, n: number, vc: number): number {
  return vc > 0 ? Math.pow(C / vc, 1 / n) : 9999;
}

function raFromFeed(fz: number, noseRadius: number): number {
  return (fz ** 2) / (32 * Math.max(noseRadius, 0.4)) * 1000;
}

function spindlePower(force: number, vc: number): number {
  return (force * vc) / (60000 * 0.85);  // kW, 85% efficiency
}

// ============================================================================
// ACTION: ds_recommend
// ============================================================================

function recommend(params: Record<string, unknown>): RecommendResult {
  const input = params as unknown as ScenarioInput;
  const mat = getMat(input.material ?? "steel_1045");
  const toolDia = Number(input.tool_diameter_mm ?? 20);
  const priority = input.priority ?? "balanced";
  const operation = input.operation ?? "roughing";
  const noseR = toolDia > 10 ? 0.8 : 0.4;
  const z = operation === "drilling" ? 2 : 4;
  const coolant = input.coolant !== false;
  const machinePower = Number(input.machine_power_kw ?? 15);
  const maxForce = Number(input.max_force_N ?? 5000);

  // Priority weights
  const weights: Record<string, { speed: number; feed: number; doc: number }> = {
    quality: { speed: 0.85, feed: 0.6, doc: 0.5 },
    productivity: { speed: 0.95, feed: 0.9, doc: 0.85 },
    cost: { speed: 0.7, feed: 0.8, doc: 0.7 },
    balanced: { speed: 0.8, feed: 0.75, doc: 0.7 },
  };
  const w = weights[priority] ?? weights.balanced;

  // Start from material range midpoints, adjust by priority
  const vcBase = mat.vc_range[0] + (mat.vc_range[1] - mat.vc_range[0]) * w.speed;
  const fzBase = mat.fz_range[0] + (mat.fz_range[1] - mat.fz_range[0]) * w.feed;

  // Depth of cut based on operation
  const maxAp = operation === "finishing" ? 0.5 : operation === "semi_finish" ? 1.5 : toolDia * 0.25;
  let ap = Number(input.depth_of_cut_mm ?? maxAp * w.doc);
  let ae = Number(input.width_of_cut_mm ?? (operation === "finishing" ? toolDia * 0.15 : toolDia * 0.6));

  // Surface finish constraint
  let fz = fzBase;
  if (input.target_ra_um) {
    const maxFzForRa = Math.sqrt((Number(input.target_ra_um) * 32 * noseR) / 1000);
    fz = Math.min(fz, maxFzForRa * 0.9);  // 10% margin
  }

  let vc = Math.min(vcBase, mat.thermal_limit * (coolant ? 1.0 : 0.8));

  // Force constraint: iterate down if needed
  let force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
  let iterations = 0;
  while (force > maxForce && iterations < 10) {
    if (ap > 0.5) ap *= 0.85;
    else fz *= 0.9;
    force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
    iterations++;
  }

  // Power constraint
  let power = spindlePower(force, vc);
  while (power > machinePower * 0.9 && iterations < 20) {
    vc *= 0.95;
    power = spindlePower(force, vc);
    iterations++;
  }

  const rpm = (vc * 1000) / (Math.PI * toolDia);
  const vf = fz * z * rpm;
  const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
  const ra = raFromFeed(fz, noseR);
  const mrrVal = (ap * ae * vf) / 1000;
  const cycleTime100 = 100 / vf;
  const dimError = (force / 50000) * 1000;  // simplified: error in μm
  const tempRise = vc * fz * ap * 0.5;  // simplified thermal model

  // Constraint checks
  const constraints = [
    { constraint: "cutting_force", value: r4(force), limit: maxForce, margin_pct: r4((1 - force / maxForce) * 100), status: force <= maxForce ? "pass" : "fail" },
    { constraint: "spindle_power", value: r4(power), limit: machinePower, margin_pct: r4((1 - power / machinePower) * 100), status: power <= machinePower ? "pass" : "fail" },
    { constraint: "thermal_limit", value: r4(vc), limit: mat.thermal_limit, margin_pct: r4((1 - vc / mat.thermal_limit) * 100), status: vc <= mat.thermal_limit ? "pass" : "fail" },
    { constraint: "tool_life_min_30", value: r4(toolLife), limit: 30, margin_pct: r4((toolLife / 30 - 1) * 100), status: toolLife >= 30 ? "pass" : "warn" },
  ];
  if (input.target_ra_um) {
    constraints.push({ constraint: "surface_finish", value: r4(ra), limit: Number(input.target_ra_um), margin_pct: r4((1 - ra / Number(input.target_ra_um)) * 100), status: ra <= Number(input.target_ra_um) ? "pass" : "fail" });
  }

  const allPass = constraints.every(c => c.status !== "fail");
  const confidence = allPass ? (constraints.filter(c => c.status === "pass").length / constraints.length) * 100 : 50;

  const rationale: string[] = [];
  rationale.push(`Priority: ${priority} → speed=${(w.speed * 100).toFixed(0)}%, feed=${(w.feed * 100).toFixed(0)}%, depth=${(w.doc * 100).toFixed(0)}% of range`);
  rationale.push(`Material: ${input.material ?? "steel_1045"} (kc1.1=${mat.kc1_1}, Taylor C=${mat.taylor_C})`);
  if (iterations > 0) rationale.push(`Adjusted ${iterations} times to meet force/power constraints`);
  if (input.target_ra_um) rationale.push(`Feed limited to fz=${fz.toFixed(3)}mm for Ra≤${input.target_ra_um}μm`);

  log.info(`[DecisionSupport] Recommend: vc=${vc.toFixed(0)}, fz=${fz.toFixed(3)}, ap=${ap.toFixed(2)}, confidence=${confidence.toFixed(0)}%`);

  return {
    action: "ds_recommend",
    recommended: {
      cutting_speed_mpm: r4(vc), feed_per_tooth_mm: r4(fz), depth_of_cut_mm: r4(ap),
      width_of_cut_mm: r4(ae), spindle_rpm: r4(rpm), feed_rate_mm_min: r4(vf),
    },
    predictions: {
      cutting_force_N: r4(force), spindle_power_kw: r4(power), tool_life_min: r4(toolLife),
      surface_ra_um: r4(ra), mrr_cm3_min: r4(mrrVal), cycle_time_min_per_100mm: r4(cycleTime100),
      dimensional_error_um: r4(dimError), temperature_rise_C: r4(tempRise),
    },
    constraints_met: constraints,
    confidence: r4(confidence),
    rationale,
  };
}

// ============================================================================
// ACTION: ds_validate
// ============================================================================

function validate(params: Record<string, unknown>): ValidateResult {
  const mat = getMat((params.material as string) ?? "steel_1045");
  const vc = Number(params.cutting_speed_mpm ?? 0);
  const fz = Number(params.feed_per_tooth_mm ?? 0);
  const ap = Number(params.depth_of_cut_mm ?? 0);
  const ae = Number(params.width_of_cut_mm ?? Number(params.tool_diameter_mm ?? 20) * 0.5);
  const toolDia = Number(params.tool_diameter_mm ?? 20);
  const machinePower = Number(params.machine_power_kw ?? 15);
  const maxForce = Number(params.max_force_N ?? 5000);

  if (!vc || !fz || !ap) throw new Error("[DecisionSupport] ds_validate: cutting_speed_mpm, feed_per_tooth_mm, depth_of_cut_mm required");

  const force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
  const power = spindlePower(force, vc);
  const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
  const noseR = toolDia > 10 ? 0.8 : 0.4;
  const ra = raFromFeed(fz, noseR);

  const checks: ValidateResult["checks"] = [
    { check: "cutting_speed_range", status: vc >= mat.vc_range[0] && vc <= mat.vc_range[1] ? "pass" : vc <= mat.thermal_limit ? "warn" : "fail", actual: r4(vc), limit: mat.vc_range[1], margin_pct: r4((1 - vc / mat.vc_range[1]) * 100) },
    { check: "feed_range", status: fz >= mat.fz_range[0] && fz <= mat.fz_range[1] ? "pass" : "warn", actual: r4(fz), limit: mat.fz_range[1], margin_pct: r4((1 - fz / mat.fz_range[1]) * 100) },
    { check: "cutting_force", status: force <= maxForce ? "pass" : "fail", actual: r4(force), limit: maxForce, margin_pct: r4((1 - force / maxForce) * 100) },
    { check: "spindle_power", status: power <= machinePower ? "pass" : power <= machinePower * 1.1 ? "warn" : "fail", actual: r4(power), limit: machinePower, margin_pct: r4((1 - power / machinePower) * 100) },
    { check: "tool_life", status: toolLife >= 30 ? "pass" : toolLife >= 15 ? "warn" : "fail", actual: r4(toolLife), limit: 30, margin_pct: r4((toolLife / 30 - 1) * 100) },
    { check: "thermal_limit", status: vc <= mat.thermal_limit ? "pass" : "fail", actual: r4(vc), limit: mat.thermal_limit, margin_pct: r4((1 - vc / mat.thermal_limit) * 100) },
    { check: "depth_ratio", status: ap <= toolDia * 0.5 ? "pass" : ap <= toolDia ? "warn" : "fail", actual: r4(ap), limit: r4(toolDia * 0.5), margin_pct: r4((1 - ap / (toolDia * 0.5)) * 100) },
  ];

  if (params.target_ra_um) {
    const targetRa = Number(params.target_ra_um);
    checks.push({ check: "surface_finish", status: ra <= targetRa ? "pass" : "fail", actual: r4(ra), limit: targetRa, margin_pct: r4((1 - ra / targetRa) * 100) });
  }

  const blockers = checks.filter(c => c.status === "fail").map(c => `${c.check}: ${c.actual} exceeds ${c.limit}`);
  const warnings = checks.filter(c => c.status === "warn").map(c => `${c.check}: ${c.actual} near limit ${c.limit}`);
  const score = checks.reduce((s, c) => s + (c.status === "pass" ? 100 : c.status === "warn" ? 60 : 0), 0) / checks.length;

  log.info(`[DecisionSupport] Validate: score=${score.toFixed(0)}, blockers=${blockers.length}, warnings=${warnings.length}`);

  return {
    action: "ds_validate",
    valid: blockers.length === 0,
    score: r4(score),
    checks,
    warnings,
    blockers,
  };
}

// ============================================================================
// ACTION: ds_compare
// ============================================================================

function compare(params: Record<string, unknown>): CompareResult {
  const setA = params.set_a as Record<string, unknown>;
  const setB = params.set_b as Record<string, unknown>;
  if (!setA || !setB) throw new Error("[DecisionSupport] ds_compare: set_a and set_b required");

  const mat = getMat((params.material as string) ?? "steel_1045");
  const toolDia = Number(params.tool_diameter_mm ?? 20);
  const noseR = toolDia > 10 ? 0.8 : 0.4;
  const z = 4;

  function evaluate(s: Record<string, unknown>) {
    const vc = Number(s.cutting_speed_mpm ?? 0);
    const fz = Number(s.feed_per_tooth_mm ?? 0);
    const ap = Number(s.depth_of_cut_mm ?? 0);
    const ae = Number(s.width_of_cut_mm ?? toolDia * 0.5);
    const rpm = (vc * 1000) / (Math.PI * toolDia);
    const vf = fz * z * rpm;
    const force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
    return {
      mrr: (ap * ae * vf) / 1000,
      force,
      power: spindlePower(force, vc),
      toolLife: taylorLife(mat.taylor_C, mat.taylor_n, vc),
      ra: raFromFeed(fz, noseR),
      cycleTime: vf > 0 ? 100 / vf : 999,
      costPerMin: (force * vc) / 60000 * 0.01 + 15 / taylorLife(mat.taylor_C, mat.taylor_n, vc),
    };
  }

  const a = evaluate(setA);
  const b = evaluate(setB);

  const dims: CompareResult["dimensions"] = [
    { dimension: "mrr_cm3_min", a_value: r4(a.mrr), b_value: r4(b.mrr), better: a.mrr > b.mrr ? "a" : b.mrr > a.mrr ? "b" : "tie", importance: 0.2 },
    { dimension: "cutting_force_N", a_value: r4(a.force), b_value: r4(b.force), better: a.force < b.force ? "a" : b.force < a.force ? "b" : "tie", importance: 0.15 },
    { dimension: "tool_life_min", a_value: r4(a.toolLife), b_value: r4(b.toolLife), better: a.toolLife > b.toolLife ? "a" : b.toolLife > a.toolLife ? "b" : "tie", importance: 0.2 },
    { dimension: "surface_ra_um", a_value: r4(a.ra), b_value: r4(b.ra), better: a.ra < b.ra ? "a" : b.ra < a.ra ? "b" : "tie", importance: 0.2 },
    { dimension: "cycle_time_min", a_value: r4(a.cycleTime), b_value: r4(b.cycleTime), better: a.cycleTime < b.cycleTime ? "a" : b.cycleTime < a.cycleTime ? "b" : "tie", importance: 0.15 },
    { dimension: "cost_per_min", a_value: r4(a.costPerMin), b_value: r4(b.costPerMin), better: a.costPerMin < b.costPerMin ? "a" : b.costPerMin < a.costPerMin ? "b" : "tie", importance: 0.1 },
  ];

  // Weighted score
  let scoreA = 0, scoreB = 0;
  for (const d of dims) {
    if (d.better === "a") scoreA += d.importance;
    else if (d.better === "b") scoreB += d.importance;
    else { scoreA += d.importance * 0.5; scoreB += d.importance * 0.5; }
  }

  const winner = scoreA > scoreB ? "set_a" : scoreB > scoreA ? "set_b" : "tie";
  const labelA = (setA.label as string) ?? "Set A";
  const labelB = (setB.label as string) ?? "Set B";

  log.info(`[DecisionSupport] Compare: A=${scoreA.toFixed(2)}, B=${scoreB.toFixed(2)}, winner=${winner}`);

  return {
    action: "ds_compare",
    set_a: { label: labelA, scores: { total: r4(scoreA), mrr: r4(a.mrr), tool_life: r4(a.toolLife), ra: r4(a.ra) } },
    set_b: { label: labelB, scores: { total: r4(scoreB), mrr: r4(b.mrr), tool_life: r4(b.toolLife), ra: r4(b.ra) } },
    winner,
    dimensions: dims,
    recommendation: winner === "tie" ? "Both parameter sets are comparable" : `${winner === "set_a" ? labelA : labelB} is recommended (score: ${Math.max(scoreA, scoreB).toFixed(2)} vs ${Math.min(scoreA, scoreB).toFixed(2)})`,
  };
}

// ============================================================================
// ACTION: ds_explain
// ============================================================================

function explain(params: Record<string, unknown>): ExplainResult {
  const mat = getMat((params.material as string) ?? "steel_1045");
  const operation = (params.operation as string) ?? "roughing";
  const priority = (params.priority as string) ?? "balanced";
  const vc = Number(params.cutting_speed_mpm ?? 0);
  const fz = Number(params.feed_per_tooth_mm ?? 0);
  const ap = Number(params.depth_of_cut_mm ?? 0);

  const decisionTree: ExplainResult["decision_tree"] = [
    { step: 1, factor: "material_properties", reasoning: `${params.material ?? "steel_1045"}: kc1.1=${mat.kc1_1}MPa, Taylor C=${mat.taylor_C}, vc_range=[${mat.vc_range}]`, impact: "Sets base parameter ranges" },
    { step: 2, factor: "operation_type", reasoning: `${operation}: determines depth/engagement strategy`, impact: operation === "finishing" ? "Low depth, high speed, tight feed" : "Higher depth, balanced speed/feed" },
    { step: 3, factor: "priority_weighting", reasoning: `${priority}: adjusts position within parameter ranges`, impact: priority === "quality" ? "Conservative parameters, wide margins" : priority === "productivity" ? "Aggressive parameters, tight margins" : "Balanced trade-offs" },
    { step: 4, factor: "constraint_satisfaction", reasoning: "Check force, power, thermal, surface limits", impact: "Parameters clamped to stay within all limits" },
    { step: 5, factor: "tool_life_optimization", reasoning: `Taylor life at vc=${vc}: T=${taylorLife(mat.taylor_C, mat.taylor_n, vc).toFixed(1)}min`, impact: "Speed adjusted for acceptable tool life" },
  ];

  const tradeOffs: ExplainResult["trade_offs"] = [
    { between: "Speed vs Tool Life", choice: vc > mat.vc_range[0] + (mat.vc_range[1] - mat.vc_range[0]) * 0.7 ? "Higher speed" : "Conservative speed", why: priority === "productivity" ? "Productivity prioritized over tool cost" : "Balanced for tool economy" },
    { between: "Feed vs Surface Quality", choice: fz > mat.fz_range[0] + (mat.fz_range[1] - mat.fz_range[0]) * 0.5 ? "Higher feed" : "Lower feed", why: params.target_ra_um ? `Feed limited by Ra≤${params.target_ra_um}μm target` : "Standard feed for operation type" },
    { between: "Depth vs Force", choice: ap > 2 ? "Aggressive depth" : "Conservative depth", why: `Force constraint: ${kienzleForce(mat.kc1_1, mat.mc, fz || 0.15, ap || 2, 10).toFixed(0)}N` },
  ];

  const sensitivity: ExplainResult["sensitivity"] = [
    { parameter: "cutting_speed", if_increased_10pct: `Tool life decreases ~${(30).toFixed(0)}%, power increases ~10%`, if_decreased_10pct: `Tool life increases ~${(40).toFixed(0)}%, MRR decreases ~10%` },
    { parameter: "feed_per_tooth", if_increased_10pct: "Force increases ~10%, Ra increases ~21% (quadratic)", if_decreased_10pct: "Force decreases ~10%, Ra improves ~19%, cycle time increases ~11%" },
    { parameter: "depth_of_cut", if_increased_10pct: "Force increases ~10%, MRR increases ~10%, tool life slightly decreases", if_decreased_10pct: "Force decreases ~10%, MRR decreases ~10%" },
  ];

  const confidenceFactors: ExplainResult["confidence_factors"] = [
    { factor: "material_data", confidence: MATERIALS[(params.material as string)?.toLowerCase().replace(/[\s-]/g, "_") ?? ""] ? 90 : 60, basis: "Known material in database vs generic" },
    { factor: "physics_model", confidence: 85, basis: "Kienzle + Taylor well-validated for conventional machining" },
    { factor: "constraint_margins", confidence: vc <= mat.thermal_limit * 0.8 ? 95 : 70, basis: "Distance from hard limits" },
    { factor: "operation_knowledge", confidence: ["roughing", "finishing", "semi_finish"].includes(operation) ? 90 : 70, basis: "Standard vs non-standard operation" },
  ];

  log.info(`[DecisionSupport] Explain: ${decisionTree.length} steps, ${tradeOffs.length} trade-offs, ${sensitivity.length} sensitivities`);

  return { action: "ds_explain", decision_tree: decisionTree, trade_offs: tradeOffs, sensitivity, confidence_factors: confidenceFactors };
}

// ============================================================================
// HELPERS
// ============================================================================

function r4(v: number): number { return Math.round(v * 1e4) / 1e4; }

// ============================================================================
// DISPATCHER ENTRY
// ============================================================================

export function executeDecisionSupportAction(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "ds_recommend": return recommend(params);
    case "ds_validate": return validate(params);
    case "ds_compare": return compare(params);
    case "ds_explain": return explain(params);
    default:
      throw new Error(`[DecisionSupportEngine] Unknown action: ${action}`);
  }
}
