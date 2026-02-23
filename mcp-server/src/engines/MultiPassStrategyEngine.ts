/**
 * R18-MS2: Multi-Pass Strategy Engine
 *
 * Optimal depth-of-cut distribution for multi-pass machining:
 *   - mps_roughing_plan:   Roughing pass distribution (constant MRR or constant chip load)
 *   - mps_finish_plan:     Finish pass optimization (allowance, step-over, surface quality)
 *   - mps_full_strategy:   Complete roughing → semi-finish → finish strategy
 *   - mps_evaluate:        Evaluate a given pass strategy (cycle time, force, tool wear)
 *
 * Builds on: R15 Kienzle force model, Taylor tool life, thermal model
 * References: Altintas "Manufacturing Automation", Stephenson & Agapiou
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface MaterialCuttingData {
  kc1_1: number;          // Kienzle specific cutting force (MPa)
  mc: number;             // Kienzle exponent
  taylor_C: number;       // Taylor tool life constant
  taylor_n: number;       // Taylor exponent
  max_ap_roughing_mm: number;  // Maximum depth of cut for roughing
  min_ap_finish_mm: number;    // Minimum finishing depth
  thermal_limit_vc: number;    // Max cutting speed before thermal issues (m/min)
}

interface RoughingPlanInput {
  total_depth_mm: number;
  finish_allowance_mm?: number;  // default 0.5
  material?: string;
  tool_diameter_mm?: number;
  max_ap_mm?: number;           // override max depth per pass
  strategy?: "constant_mrr" | "constant_ap" | "decreasing_ap";
  feed_per_tooth_mm?: number;
  cutting_speed_mpm?: number;
  num_flutes?: number;
}

interface PassInfo {
  pass_number: number;
  type: "roughing" | "semi_finish" | "finish";
  depth_mm: number;
  cumulative_depth_mm: number;
  remaining_mm: number;
  feed_per_tooth_mm: number;
  cutting_speed_mpm: number;
  mrr_cm3_per_min: number;
  specific_force_N: number;
  estimated_tool_life_min: number;
  estimated_time_min: number;
}

interface RoughingPlanResult {
  action: "mps_roughing_plan";
  total_depth_mm: number;
  finish_allowance_mm: number;
  roughing_depth_mm: number;
  passes: PassInfo[];
  total_roughing_passes: number;
  total_mrr_cm3: number;
  total_time_min: number;
  max_force_N: number;
  strategy: string;
}

interface FinishPlanResult {
  action: "mps_finish_plan";
  finish_allowance_mm: number;
  passes: PassInfo[];
  total_finish_passes: number;
  total_time_min: number;
  predicted_ra_um: number;
  predicted_rz_um: number;
  step_over_mm?: number;
}

interface FullStrategyResult {
  action: "mps_full_strategy";
  total_depth_mm: number;
  phases: Array<{
    phase: "roughing" | "semi_finish" | "finish";
    passes: PassInfo[];
    total_time_min: number;
    total_material_cm3: number;
  }>;
  summary: {
    total_passes: number;
    total_time_min: number;
    total_material_removed_cm3: number;
    max_force_N: number;
    estimated_tool_changes: number;
    cycle_efficiency_pct: number;
  };
}

interface EvaluateResult {
  action: "mps_evaluate";
  passes_evaluated: number;
  total_time_min: number;
  total_material_cm3: number;
  max_force_N: number;
  avg_mrr_cm3_per_min: number;
  tool_changes: number;
  bottleneck_pass: number;
  recommendations: string[];
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

const MATERIAL_DB: Record<string, MaterialCuttingData> = {
  steel_1045: { kc1_1: 1780, mc: 0.25, taylor_C: 350, taylor_n: 0.25, max_ap_roughing_mm: 5.0, min_ap_finish_mm: 0.2, thermal_limit_vc: 250 },
  steel_4140: { kc1_1: 2100, mc: 0.25, taylor_C: 280, taylor_n: 0.22, max_ap_roughing_mm: 4.0, min_ap_finish_mm: 0.2, thermal_limit_vc: 200 },
  aluminum_6061: { kc1_1: 790, mc: 0.23, taylor_C: 800, taylor_n: 0.35, max_ap_roughing_mm: 8.0, min_ap_finish_mm: 0.15, thermal_limit_vc: 600 },
  aluminum_7075: { kc1_1: 850, mc: 0.23, taylor_C: 700, taylor_n: 0.33, max_ap_roughing_mm: 7.0, min_ap_finish_mm: 0.15, thermal_limit_vc: 500 },
  titanium_ti6al4v: { kc1_1: 1650, mc: 0.22, taylor_C: 80, taylor_n: 0.18, max_ap_roughing_mm: 2.5, min_ap_finish_mm: 0.3, thermal_limit_vc: 80 },
  stainless_304: { kc1_1: 2200, mc: 0.26, taylor_C: 200, taylor_n: 0.20, max_ap_roughing_mm: 3.5, min_ap_finish_mm: 0.25, thermal_limit_vc: 150 },
  cast_iron: { kc1_1: 1100, mc: 0.20, taylor_C: 400, taylor_n: 0.28, max_ap_roughing_mm: 6.0, min_ap_finish_mm: 0.2, thermal_limit_vc: 300 },
  inconel_718: { kc1_1: 2800, mc: 0.28, taylor_C: 40, taylor_n: 0.15, max_ap_roughing_mm: 1.5, min_ap_finish_mm: 0.3, thermal_limit_vc: 50 },
};

function getMaterial(name?: string): MaterialCuttingData {
  if (!name) return MATERIAL_DB.steel_1045;
  const key = name.toLowerCase().replace(/[\s-]/g, "_");
  return MATERIAL_DB[key] ?? MATERIAL_DB.steel_1045;
}

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

/** Kienzle specific cutting force (N/mm²) for chip thickness h */
function kienzleForce(kc1_1: number, mc: number, h_mm: number, ap_mm: number, ae_mm: number): number {
  const hClamp = Math.max(h_mm, 0.01);
  const kc = kc1_1 * Math.pow(hClamp, -mc);
  return kc * ap_mm * ae_mm;  // Force in N (simplified)
}

/** Taylor tool life (minutes) for cutting speed vc */
function taylorLife(C: number, n: number, vc_mpm: number): number {
  if (vc_mpm <= 0) return 9999;
  return Math.pow(C / vc_mpm, 1 / n);
}

/** MRR in cm³/min */
function mrr(ap_mm: number, ae_mm: number, vf_mm_min: number): number {
  return (ap_mm * ae_mm * vf_mm_min) / 1000;
}

/** Machining time for a given length at feed rate */
function machiningTime(length_mm: number, vf_mm_min: number): number {
  return vf_mm_min > 0 ? length_mm / vf_mm_min : 0;
}

/** Surface roughness Ra from feed per tooth (simplified) */
function raFromFeed(fz_mm: number, tool_radius_mm: number): number {
  // Ra ≈ fz² / (32 × r) for round insert / ball nose
  const r = Math.max(tool_radius_mm, 0.4);  // min 0.4mm nose radius
  return (fz_mm ** 2) / (32 * r) * 1000;  // convert to μm
}

// ============================================================================
// ACTION: mps_roughing_plan
// ============================================================================

function roughingPlan(params: Record<string, unknown>): RoughingPlanResult {
  const input = params as unknown as RoughingPlanInput;
  const totalDepth = Number(input.total_depth_mm);
  if (!totalDepth || totalDepth <= 0) throw new Error("[MultiPassStrategy] total_depth_mm required (> 0)");

  const mat = getMaterial(input.material as string);
  const finishAllow = Number(input.finish_allowance_mm ?? 0.5);
  const roughingDepth = Math.max(totalDepth - finishAllow, 0);
  const maxAp = Number(input.max_ap_mm ?? mat.max_ap_roughing_mm);
  const strategy = input.strategy ?? "constant_ap";
  const fz = Number(input.feed_per_tooth_mm ?? 0.15);
  const vc = Math.min(Number(input.cutting_speed_mpm ?? 180), mat.thermal_limit_vc);
  const z = Number(input.num_flutes ?? 4);
  const toolDia = Number(input.tool_diameter_mm ?? 20);
  const ae = toolDia * 0.6;  // 60% radial engagement for roughing
  const nRPM = (vc * 1000) / (Math.PI * toolDia);
  const vf = fz * z * nRPM;
  const passLength = Number(params.pass_length_mm ?? 100);

  const passes: PassInfo[] = [];
  let remaining = roughingDepth;
  let cumulative = 0;

  if (strategy === "constant_ap") {
    const nPasses = Math.ceil(roughingDepth / maxAp);
    const apPerPass = roughingDepth / nPasses;
    for (let i = 0; i < nPasses; i++) {
      const ap = Math.min(apPerPass, remaining);
      cumulative += ap;
      remaining -= ap;
      const force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
      const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
      const mrrVal = mrr(ap, ae, vf);
      const time = machiningTime(passLength, vf);
      passes.push({
        pass_number: i + 1,
        type: "roughing",
        depth_mm: round4(ap),
        cumulative_depth_mm: round4(cumulative),
        remaining_mm: round4(Math.max(remaining, 0)),
        feed_per_tooth_mm: fz,
        cutting_speed_mpm: round4(vc),
        mrr_cm3_per_min: round4(mrrVal),
        specific_force_N: round4(force),
        estimated_tool_life_min: round4(toolLife),
        estimated_time_min: round4(time),
      });
    }
  } else if (strategy === "decreasing_ap") {
    // First pass at max, each subsequent 80% of previous
    let ap = Math.min(maxAp, remaining);
    let passNum = 0;
    while (remaining > 0.01) {
      passNum++;
      const thisAp = Math.min(ap, remaining);
      cumulative += thisAp;
      remaining -= thisAp;
      const force = kienzleForce(mat.kc1_1, mat.mc, fz, thisAp, ae);
      const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
      const mrrVal = mrr(thisAp, ae, vf);
      const time = machiningTime(passLength, vf);
      passes.push({
        pass_number: passNum,
        type: "roughing",
        depth_mm: round4(thisAp),
        cumulative_depth_mm: round4(cumulative),
        remaining_mm: round4(Math.max(remaining, 0)),
        feed_per_tooth_mm: fz,
        cutting_speed_mpm: round4(vc),
        mrr_cm3_per_min: round4(mrrVal),
        specific_force_N: round4(force),
        estimated_tool_life_min: round4(toolLife),
        estimated_time_min: round4(time),
      });
      ap *= 0.8;
      if (ap < mat.min_ap_finish_mm) ap = mat.min_ap_finish_mm;
      if (passNum > 20) break;  // safety
    }
  } else {
    // constant_mrr: vary ap to maintain constant MRR
    const targetMRR = mrr(maxAp * 0.8, ae, vf);
    let passNum = 0;
    while (remaining > 0.01) {
      passNum++;
      const apForMRR = (targetMRR * 1000) / (ae * vf);
      const thisAp = Math.min(Math.min(apForMRR, maxAp), remaining);
      cumulative += thisAp;
      remaining -= thisAp;
      const force = kienzleForce(mat.kc1_1, mat.mc, fz, thisAp, ae);
      const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
      const mrrVal = mrr(thisAp, ae, vf);
      const time = machiningTime(passLength, vf);
      passes.push({
        pass_number: passNum,
        type: "roughing",
        depth_mm: round4(thisAp),
        cumulative_depth_mm: round4(cumulative),
        remaining_mm: round4(Math.max(remaining, 0)),
        feed_per_tooth_mm: fz,
        cutting_speed_mpm: round4(vc),
        mrr_cm3_per_min: round4(mrrVal),
        specific_force_N: round4(force),
        estimated_tool_life_min: round4(toolLife),
        estimated_time_min: round4(time),
      });
      if (passNum > 20) break;
    }
  }

  const totalMRR = passes.reduce((s, p) => s + p.mrr_cm3_per_min * p.estimated_time_min, 0);
  const totalTime = passes.reduce((s, p) => s + p.estimated_time_min, 0);
  const maxForce = Math.max(...passes.map(p => p.specific_force_N));

  log.info(`[MultiPassStrategy] Roughing: ${passes.length} passes, ${strategy}, total=${roughingDepth}mm, time=${totalTime.toFixed(2)}min`);

  return {
    action: "mps_roughing_plan",
    total_depth_mm: totalDepth,
    finish_allowance_mm: finishAllow,
    roughing_depth_mm: round4(roughingDepth),
    passes,
    total_roughing_passes: passes.length,
    total_mrr_cm3: round4(totalMRR),
    total_time_min: round4(totalTime),
    max_force_N: round4(maxForce),
    strategy,
  };
}

// ============================================================================
// ACTION: mps_finish_plan
// ============================================================================

function finishPlan(params: Record<string, unknown>): FinishPlanResult {
  const finishAllow = Number(params.finish_allowance_mm ?? params.allowance_mm ?? 0.5);
  const mat = getMaterial(params.material as string);
  const toolDia = Number(params.tool_diameter_mm ?? 12);
  const noseRadius = Number(params.nose_radius_mm ?? 0.8);
  const targetRa = Number(params.target_ra_um ?? 1.6);
  const passLength = Number(params.pass_length_mm ?? 100);

  // Calculate max fz for target Ra
  // Ra ≈ fz² / (32 × r) × 1000 → fz = sqrt(Ra × 32 × r / 1000)
  const fzForRa = Math.sqrt((targetRa * 32 * noseRadius) / 1000);
  const fz = Math.min(fzForRa, 0.1);  // cap at 0.1mm/tooth for finishing

  // Finishing speed: higher than roughing (lower force)
  const vcFinish = Math.min(mat.thermal_limit_vc * 0.9, Number(params.cutting_speed_mpm ?? mat.thermal_limit_vc * 0.8));
  const z = Number(params.num_flutes ?? 4);
  const nRPM = (vcFinish * 1000) / (Math.PI * toolDia);
  const vf = fz * z * nRPM;

  // Semi-finish + finish passes
  const passes: PassInfo[] = [];
  let remaining = finishAllow;
  let cumulative = 0;

  if (finishAllow > mat.min_ap_finish_mm * 2) {
    // Semi-finish pass
    const semiAp = finishAllow - mat.min_ap_finish_mm;
    cumulative += semiAp;
    remaining -= semiAp;
    const ae = toolDia * 0.3;
    const force = kienzleForce(mat.kc1_1, mat.mc, fz, semiAp, ae);
    passes.push({
      pass_number: 1,
      type: "semi_finish",
      depth_mm: round4(semiAp),
      cumulative_depth_mm: round4(cumulative),
      remaining_mm: round4(remaining),
      feed_per_tooth_mm: round4(fz * 1.2),  // slightly higher for semi
      cutting_speed_mpm: round4(vcFinish * 0.9),
      mrr_cm3_per_min: round4(mrr(semiAp, ae, vf)),
      specific_force_N: round4(force),
      estimated_tool_life_min: round4(taylorLife(mat.taylor_C, mat.taylor_n, vcFinish * 0.9)),
      estimated_time_min: round4(machiningTime(passLength, vf)),
    });
  }

  // Final finish pass
  const finAp = remaining > 0 ? remaining : mat.min_ap_finish_mm;
  cumulative += finAp;
  const ae = toolDia * 0.15;  // light radial engagement
  const force = kienzleForce(mat.kc1_1, mat.mc, fz, finAp, ae);
  passes.push({
    pass_number: passes.length + 1,
    type: "finish",
    depth_mm: round4(finAp),
    cumulative_depth_mm: round4(cumulative),
    remaining_mm: 0,
    feed_per_tooth_mm: round4(fz),
    cutting_speed_mpm: round4(vcFinish),
    mrr_cm3_per_min: round4(mrr(finAp, ae, vf)),
    specific_force_N: round4(force),
    estimated_tool_life_min: round4(taylorLife(mat.taylor_C, mat.taylor_n, vcFinish)),
    estimated_time_min: round4(machiningTime(passLength, vf)),
  });

  const predictedRa = raFromFeed(fz, noseRadius);
  const predictedRz = predictedRa * 4.5;  // Rz ≈ 4-5 × Ra typically
  const totalTime = passes.reduce((s, p) => s + p.estimated_time_min, 0);
  const stepOver = Number(params.step_over_mm ?? undefined);

  log.info(`[MultiPassStrategy] Finish: ${passes.length} passes, Ra=${predictedRa.toFixed(2)}μm, target=${targetRa}μm`);

  return {
    action: "mps_finish_plan",
    finish_allowance_mm: finishAllow,
    passes,
    total_finish_passes: passes.length,
    total_time_min: round4(totalTime),
    predicted_ra_um: round4(predictedRa),
    predicted_rz_um: round4(predictedRz),
    step_over_mm: stepOver || undefined,
  };
}

// ============================================================================
// ACTION: mps_full_strategy
// ============================================================================

function fullStrategy(params: Record<string, unknown>): FullStrategyResult {
  const totalDepth = Number(params.total_depth_mm);
  if (!totalDepth || totalDepth <= 0) throw new Error("[MultiPassStrategy] total_depth_mm required (> 0)");

  const mat = getMaterial(params.material as string);
  const finishAllow = Number(params.finish_allowance_mm ?? 0.5);
  const semiFinishAllow = Number(params.semi_finish_allowance_mm ?? Math.min(0.3, finishAllow * 0.6));
  const totalFinishZone = finishAllow + semiFinishAllow;
  const roughingDepth = Math.max(totalDepth - totalFinishZone, 0);

  const phases: FullStrategyResult["phases"] = [];

  // Phase 1: Roughing
  if (roughingDepth > 0.01) {
    const roughResult = roughingPlan({ ...params, total_depth_mm: roughingDepth + finishAllow, finish_allowance_mm: totalFinishZone });
    const roughingMaterial = roughResult.passes.reduce((s, p) => {
      const ae = (Number(params.tool_diameter_mm) || 20) * 0.6;
      return s + (p.depth_mm * ae * (Number(params.pass_length_mm) || 100)) / 1000;
    }, 0);
    phases.push({
      phase: "roughing",
      passes: roughResult.passes,
      total_time_min: roughResult.total_time_min,
      total_material_cm3: round4(roughingMaterial),
    });
  }

  // Phase 2: Semi-finish
  if (semiFinishAllow > 0.01) {
    const toolDia = Number(params.tool_diameter_mm ?? 12);
    const fz = 0.08;
    const vcSemi = mat.thermal_limit_vc * 0.85;
    const ae = toolDia * 0.25;
    const nRPM = (vcSemi * 1000) / (Math.PI * toolDia);
    const z = Number(params.num_flutes ?? 4);
    const vf = fz * z * nRPM;
    const passLength = Number(params.pass_length_mm ?? 100);
    const force = kienzleForce(mat.kc1_1, mat.mc, fz, semiFinishAllow, ae);
    const time = machiningTime(passLength, vf);
    const matVol = (semiFinishAllow * ae * passLength) / 1000;

    phases.push({
      phase: "semi_finish",
      passes: [{
        pass_number: 1,
        type: "semi_finish",
        depth_mm: round4(semiFinishAllow),
        cumulative_depth_mm: round4(totalDepth - finishAllow),
        remaining_mm: round4(finishAllow),
        feed_per_tooth_mm: fz,
        cutting_speed_mpm: round4(vcSemi),
        mrr_cm3_per_min: round4(mrr(semiFinishAllow, ae, vf)),
        specific_force_N: round4(force),
        estimated_tool_life_min: round4(taylorLife(mat.taylor_C, mat.taylor_n, vcSemi)),
        estimated_time_min: round4(time),
      }],
      total_time_min: round4(time),
      total_material_cm3: round4(matVol),
    });
  }

  // Phase 3: Finish
  const finResult = finishPlan({ ...params, finish_allowance_mm: finishAllow });
  const finMaterial = finResult.passes.reduce((s, p) => {
    const ae = (Number(params.tool_diameter_mm) || 12) * 0.15;
    return s + (p.depth_mm * ae * (Number(params.pass_length_mm) || 100)) / 1000;
  }, 0);
  phases.push({
    phase: "finish",
    passes: finResult.passes,
    total_time_min: finResult.total_time_min,
    total_material_cm3: round4(finMaterial),
  });

  // Summary
  const allPasses = phases.flatMap(p => p.passes);
  const totalTime = phases.reduce((s, p) => s + p.total_time_min, 0);
  const totalMat = phases.reduce((s, p) => s + p.total_material_cm3, 0);
  const maxForce = Math.max(...allPasses.map(p => p.specific_force_N));

  // Estimate tool changes: assume change every tool_life_min
  const avgToolLife = allPasses.reduce((s, p) => s + p.estimated_tool_life_min, 0) / allPasses.length;
  const toolChanges = avgToolLife > 0 ? Math.floor(totalTime / avgToolLife) : 0;

  // Cycle efficiency: cutting time / (cutting + non-cutting)
  const toolChangeTime = toolChanges * 0.5;  // 30s per change
  const rapidTime = allPasses.length * 0.05;  // 3s per rapid traverse
  const efficiency = totalTime / (totalTime + toolChangeTime + rapidTime) * 100;

  log.info(`[MultiPassStrategy] Full: ${allPasses.length} passes, ${phases.length} phases, time=${totalTime.toFixed(2)}min, efficiency=${efficiency.toFixed(1)}%`);

  return {
    action: "mps_full_strategy",
    total_depth_mm: totalDepth,
    phases,
    summary: {
      total_passes: allPasses.length,
      total_time_min: round4(totalTime),
      total_material_removed_cm3: round4(totalMat),
      max_force_N: round4(maxForce),
      estimated_tool_changes: toolChanges,
      cycle_efficiency_pct: round4(efficiency),
    },
  };
}

// ============================================================================
// ACTION: mps_evaluate
// ============================================================================

function evaluateStrategy(params: Record<string, unknown>): EvaluateResult {
  const passes = (params.passes ?? []) as PassInfo[];
  if (!passes.length) throw new Error("[MultiPassStrategy] mps_evaluate: passes array required");

  const mat = getMaterial(params.material as string);
  const passLength = Number(params.pass_length_mm ?? 100);
  const toolDia = Number(params.tool_diameter_mm ?? 16);

  let totalTime = 0, totalMat = 0, maxForce = 0, toolChanges = 0;
  let cumulativeWear = 0;
  const recommendations: string[] = [];

  for (let i = 0; i < passes.length; i++) {
    const p = passes[i];
    const ae = p.type === "roughing" ? toolDia * 0.6 : p.type === "semi_finish" ? toolDia * 0.25 : toolDia * 0.15;
    const fz = p.feed_per_tooth_mm ?? 0.15;
    const vc = p.cutting_speed_mpm ?? 180;
    const z = Number(params.num_flutes ?? 4);
    const nRPM = (vc * 1000) / (Math.PI * toolDia);
    const vf = fz * z * nRPM;
    const ap = p.depth_mm;

    const force = kienzleForce(mat.kc1_1, mat.mc, fz, ap, ae);
    const toolLife = taylorLife(mat.taylor_C, mat.taylor_n, vc);
    const time = machiningTime(passLength, vf);
    const mrrVal = mrr(ap, ae, vf);

    totalTime += time;
    totalMat += mrrVal * time;
    if (force > maxForce) maxForce = force;

    cumulativeWear += time / toolLife;
    if (cumulativeWear >= 1.0) {
      toolChanges++;
      cumulativeWear = 0;
    }

    // Check for issues
    if (ap > mat.max_ap_roughing_mm && p.type === "roughing") {
      recommendations.push(`Pass ${i + 1}: depth ${ap}mm exceeds max ${mat.max_ap_roughing_mm}mm for this material`);
    }
    if (vc > mat.thermal_limit_vc) {
      recommendations.push(`Pass ${i + 1}: speed ${vc}m/min exceeds thermal limit ${mat.thermal_limit_vc}m/min`);
    }
  }

  const avgMRR = totalTime > 0 ? totalMat / totalTime : 0;

  // Find bottleneck (slowest pass)
  let bottleneck = 0, maxPassTime = 0;
  for (let i = 0; i < passes.length; i++) {
    if (passes[i].estimated_time_min > maxPassTime) {
      maxPassTime = passes[i].estimated_time_min;
      bottleneck = i + 1;
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Strategy looks reasonable — no issues detected");
  }

  log.info(`[MultiPassStrategy] Evaluate: ${passes.length} passes, time=${totalTime.toFixed(2)}min, max_force=${maxForce.toFixed(0)}N`);

  return {
    action: "mps_evaluate",
    passes_evaluated: passes.length,
    total_time_min: round4(totalTime),
    total_material_cm3: round4(totalMat),
    max_force_N: round4(maxForce),
    avg_mrr_cm3_per_min: round4(avgMRR),
    tool_changes: toolChanges,
    bottleneck_pass: bottleneck,
    recommendations,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

// ============================================================================
// DISPATCHER ENTRY
// ============================================================================

export function executeMultiPassAction(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "mps_roughing_plan": return roughingPlan(params);
    case "mps_finish_plan": return finishPlan(params);
    case "mps_full_strategy": return fullStrategy(params);
    case "mps_evaluate": return evaluateStrategy(params);
    default:
      throw new Error(`[MultiPassStrategyEngine] Unknown action: ${action}`);
  }
}
