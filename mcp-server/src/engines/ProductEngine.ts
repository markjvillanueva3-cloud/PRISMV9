/**
 * PRISM Product Engine — R11 Product Packaging
 * =============================================
 * Composition layer that orchestrates existing physics engines into
 * unified product workflows. Each product (SFC, PPG, ShopManager, ACNC)
 * composes multiple engine calls into a single end-to-end pipeline.
 *
 * MS0: Speed & Feed Calculator (SFC) — 10 actions
 * MS1: Post Processor Generator (PPG) — 10 actions
 * MS2: Shop Manager / Quoting — 10 actions
 * MS3: Auto CNC Programmer (ACNC) — 10 actions
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  calculateSpeedFeed,
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSurfaceFinish,
  calculateMRR,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS,
  type SpeedFeedResult,
  type CuttingForceResult,
  type ToolLifeResult,
  type SurfaceFinishResult,
  type MRRResult,
} from "./ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  optimizeCuttingParameters,
} from "./AdvancedCalculations.js";

import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  estimateCycleTime,
  generateGCodeSnippet,
} from "./ToolpathCalculations.js";

import {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
  type GCodeResult,
  type GCodeParams,
  type ControllerFamily,
  type GCodeOperation,
} from "./GCodeTemplateEngine.js";

import {
  generateParameterBlock,
  executeDNCTransfer,
  generateQRData,
} from "./DNCTransferEngine.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductTier = "free" | "pro" | "enterprise";
export type SFCAction =
  | "sfc_calculate"
  | "sfc_compare"
  | "sfc_optimize"
  | "sfc_quick"
  | "sfc_materials"
  | "sfc_tools"
  | "sfc_formulas"
  | "sfc_safety"
  | "sfc_history"
  | "sfc_get";

export type PPGAction =
  | "ppg_validate"
  | "ppg_translate"
  | "ppg_templates"
  | "ppg_generate"
  | "ppg_controllers"
  | "ppg_compare"
  | "ppg_syntax"
  | "ppg_batch"
  | "ppg_history"
  | "ppg_get";

export type ShopAction =
  | "shop_quote"
  | "shop_cost"
  | "shop_job"
  | "shop_schedule"
  | "shop_dashboard"
  | "shop_report"
  | "shop_compare"
  | "shop_materials"
  | "shop_history"
  | "shop_get";

export type ACNCAction =
  | "acnc_program"
  | "acnc_feature"
  | "acnc_simulate"
  | "acnc_output"
  | "acnc_tools"
  | "acnc_strategy"
  | "acnc_validate"
  | "acnc_batch"
  | "acnc_history"
  | "acnc_get";

export type ProductAction = SFCAction | PPGAction | ShopAction | ACNCAction;

export interface SFCInput {
  material?: string;
  material_hardness?: number;
  material_group?: string;
  tool_material?: string;
  tool_diameter?: number;
  number_of_teeth?: number;
  operation?: string;
  depth_of_cut?: number;
  width_of_cut?: number;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  tier?: ProductTier;
}

export interface SFCResult {
  // Core parameters
  cutting_speed_m_min: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  table_feed_mm_min: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;

  // Cutting force (Kienzle)
  cutting_force_N: number;
  power_kW: number;
  torque_Nm: number;
  specific_cutting_force_N_mm2: number;

  // Tool life (Taylor)
  tool_life_min: number;
  optimal_speed_m_min: number;

  // Surface finish
  surface_roughness_Ra_um: number;
  surface_finish_grade: string;

  // Material removal rate
  mrr_cm3_min: number;

  // Safety
  safety_score: number;
  safety_status: "safe" | "warning" | "danger";
  safety_warnings: string[];

  // Uncertainty bounds
  uncertainty: {
    cutting_speed_range: [number, number];
    force_range: [number, number];
    tool_life_range: [number, number];
    surface_roughness_range: [number, number];
  };

  // Sustainability (pro+enterprise only)
  sustainability?: {
    energy_kWh_per_part: number;
    co2_kg_per_part: number;
    coolant_liters_per_hour: number;
  };

  // Model info
  formulas_used: string[];
  calculation_time_ms: number;
  tier: ProductTier;
  tier_limited: boolean;
}

export interface SFCCompareResult {
  approaches: Array<{
    name: string;
    cutting_speed: number;
    feed: number;
    tool_life: number;
    mrr: number;
    power: number;
    surface_roughness: number;
    score: number;
  }>;
  recommended: string;
  comparison_notes: string[];
}

export interface SFCOptimizeResult {
  objective: string;
  original: { vc: number; fz: number; ap: number; ae: number };
  optimized: { vc: number; fz: number; ap: number; ae: number };
  improvement_pct: number;
  constraints_met: boolean;
  iterations: number;
}

// ─── Material Hardness Lookup ───────────────────────────────────────────────

const MATERIAL_HARDNESS: Record<string, { hardness: number; group: string; kc1_1: number; mc: number; C: number; n: number }> = {
  "1045": { hardness: 200, group: "steel_medium_carbon", kc1_1: 1800, mc: 0.25, C: 250, n: 0.25 },
  "4140": { hardness: 280, group: "steel_alloy", kc1_1: 2000, mc: 0.25, C: 220, n: 0.22 },
  "4340": { hardness: 300, group: "steel_alloy", kc1_1: 2100, mc: 0.25, C: 200, n: 0.20 },
  "316": { hardness: 180, group: "stainless_austenitic", kc1_1: 2100, mc: 0.21, C: 180, n: 0.20 },
  "316L": { hardness: 170, group: "stainless_austenitic", kc1_1: 2050, mc: 0.21, C: 180, n: 0.20 },
  "304": { hardness: 170, group: "stainless_austenitic", kc1_1: 2000, mc: 0.21, C: 190, n: 0.20 },
  "6061": { hardness: 95, group: "aluminum_wrought", kc1_1: 700, mc: 0.30, C: 800, n: 0.30 },
  "6061-T6": { hardness: 95, group: "aluminum_wrought", kc1_1: 700, mc: 0.30, C: 800, n: 0.30 },
  "7075": { hardness: 150, group: "aluminum_wrought", kc1_1: 750, mc: 0.28, C: 700, n: 0.28 },
  "7075-T6": { hardness: 150, group: "aluminum_wrought", kc1_1: 750, mc: 0.28, C: 700, n: 0.28 },
  "A356": { hardness: 80, group: "aluminum_cast", kc1_1: 600, mc: 0.28, C: 900, n: 0.32 },
  "Ti-6Al-4V": { hardness: 334, group: "titanium", kc1_1: 1650, mc: 0.23, C: 80, n: 0.18 },
  "Inconel 718": { hardness: 380, group: "superalloy", kc1_1: 2800, mc: 0.22, C: 50, n: 0.15 },
  "GG25": { hardness: 190, group: "cast_iron_gray", kc1_1: 1100, mc: 0.28, C: 300, n: 0.25 },
  "GGG50": { hardness: 220, group: "cast_iron_ductile", kc1_1: 1300, mc: 0.26, C: 280, n: 0.24 },
  "C360": { hardness: 80, group: "copper_brass", kc1_1: 550, mc: 0.32, C: 600, n: 0.30 },
  "PEEK": { hardness: 100, group: "plastic_engineering", kc1_1: 250, mc: 0.35, C: 1000, n: 0.35 },
};

// ─── SFC Engine Functions ───────────────────────────────────────────────────

function resolveMaterial(material?: string, hardness?: number, group?: string) {
  const key = material?.replace(/\s+/g, "") ?? "";
  const lookup = MATERIAL_HARDNESS[key] ?? MATERIAL_HARDNESS[material ?? ""] ?? null;

  if (lookup) {
    return {
      hardness: hardness ?? lookup.hardness,
      group: group ?? lookup.group,
      kc1_1: lookup.kc1_1,
      mc: lookup.mc,
      C: lookup.C,
      n: lookup.n,
      name: material ?? key,
      resolved: true,
    };
  }

  // Fallback: use provided hardness or default medium carbon steel
  return {
    hardness: hardness ?? 200,
    group: group ?? "steel_medium_carbon",
    kc1_1: 1800,
    mc: 0.25,
    C: 250,
    n: 0.25,
    name: material ?? "unknown",
    resolved: false,
  };
}

function calculateSafetyScore(
  vc: number,
  fz: number,
  ap: number,
  ae: number,
  toolDiam: number,
  power: number,
  machinePower?: number,
  force?: number,
): { score: number; status: "safe" | "warning" | "danger"; warnings: string[] } {
  const warnings: string[] = [];
  let score = 1.0;

  // Speed range check
  if (vc < SAFETY_LIMITS.MIN_CUTTING_SPEED) {
    score -= 0.3;
    warnings.push(`Cutting speed ${vc.toFixed(0)} m/min below minimum`);
  }
  if (vc > SAFETY_LIMITS.MAX_CUTTING_SPEED) {
    score -= 0.4;
    warnings.push(`Cutting speed ${vc.toFixed(0)} m/min exceeds maximum safe limit`);
  }

  // Feed range check
  if (fz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) {
    score -= 0.3;
    warnings.push(`Feed per tooth ${fz.toFixed(3)} mm exceeds safe limit`);
  }

  // Depth of cut check
  if (ap > toolDiam * 2) {
    score -= 0.2;
    warnings.push(`Depth of cut ${ap.toFixed(1)} mm > 2× tool diameter — high deflection risk`);
  }
  if (ap > SAFETY_LIMITS.MAX_DEPTH_OF_CUT) {
    score -= 0.3;
    warnings.push(`Depth of cut exceeds maximum limit`);
  }

  // Width (radial) check
  if (ae > toolDiam) {
    score -= 0.15;
    warnings.push(`Width of cut ${ae.toFixed(1)} mm > tool diameter — full slot`);
  }

  // Power check
  if (machinePower && power > machinePower * 0.95) {
    score -= 0.3;
    warnings.push(`Required power ${power.toFixed(1)} kW at ${((power / machinePower) * 100).toFixed(0)}% of machine capacity`);
  } else if (machinePower && power > machinePower * 0.80) {
    score -= 0.1;
    warnings.push(`Power usage at ${((power / machinePower) * 100).toFixed(0)}% of machine capacity — consider reducing`);
  }

  // Force check
  if (force && force > 10000) {
    score -= 0.1;
    warnings.push(`High cutting force: ${force.toFixed(0)} N`);
  }

  score = Math.max(0, Math.min(1, score));
  const status = score >= 0.7 ? "safe" : score >= 0.4 ? "warning" : "danger";
  return { score: Math.round(score * 100) / 100, status, warnings };
}

function mapOperation(op: string): "roughing" | "finishing" | "semi-finishing" {
  if (op.includes("finish")) return "finishing";
  if (op.includes("semi")) return "semi-finishing";
  return "roughing"; // milling, drilling, turning, etc. default to roughing
}

function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
  const startTime = Date.now();
  const tier = params.tier ?? "pro";

  // Resolve material
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);

  // Defaults
  const toolMat = params.tool_material ?? "Carbide";
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const operation = params.operation ?? "milling";
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  // 1. Speed & Feed
  const sfResult: SpeedFeedResult = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: toolMat as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const rpm = sfResult.spindle_speed;
  const vf = sfResult.feed_rate;

  // 2. Cutting Force (Kienzle)
  const forceResult: CuttingForceResult = calculateKienzleCuttingForce(
    {
      cutting_speed: vc,
      feed_per_tooth: fz,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  // 3. Tool Life (Taylor)
  const taylorResult: ToolLifeResult = calculateTaylorToolLife(
    vc,
    { C: mat.C, n: mat.n, material_id: mat.name },
    fz,
    ap,
  );

  // 4. Surface Finish
  const noseRadius = toolDiam > 6 ? 0.8 : 0.4;
  const raResult: SurfaceFinishResult = calculateSurfaceFinish(
    fz * numTeeth, noseRadius, true, ae, toolDiam, operation,
  );

  // 5. MRR
  const mrrResult: MRRResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // 6. Safety scoring
  const safety = calculateSafetyScore(
    vc, fz, ap, ae, toolDiam,
    forceResult.power, params.machine_power_kw, forceResult.Fc,
  );

  // RPM machine limit check
  if (params.machine_max_rpm && rpm > params.machine_max_rpm) {
    safety.warnings.push(`Calculated RPM ${rpm} exceeds machine max ${params.machine_max_rpm}`);
    safety.score = Math.max(0, safety.score - 0.15);
  }

  // Material resolution warning
  if (!mat.resolved) {
    safety.warnings.push(`Material "${params.material}" not in product database — using defaults`);
  }

  // 7. Uncertainty bounds
  const uncertaintyFactor = mat.resolved ? 0.15 : 0.25;
  const uncertainty = {
    cutting_speed_range: [
      Math.round(vc * (1 - uncertaintyFactor)),
      Math.round(vc * (1 + uncertaintyFactor)),
    ] as [number, number],
    force_range: [
      Math.round(forceResult.Fc * (1 - uncertaintyFactor)),
      Math.round(forceResult.Fc * (1 + uncertaintyFactor)),
    ] as [number, number],
    tool_life_range: [
      Math.round(taylorResult.tool_life_minutes * (1 - uncertaintyFactor * 1.5)),
      Math.round(taylorResult.tool_life_minutes * (1 + uncertaintyFactor * 1.5)),
    ] as [number, number],
    surface_roughness_range: [
      Math.round(raResult.Ra * (1 - uncertaintyFactor) * 100) / 100,
      Math.round(raResult.Ra * (1 + uncertaintyFactor) * 100) / 100,
    ] as [number, number],
  };

  // 8. Sustainability (pro + enterprise only)
  let sustainability: SFCResult["sustainability"];
  if (tier !== "free") {
    const cuttingTimeMin = 10; // Assume 10 min per part for estimation
    const energyKwh = forceResult.power * (cuttingTimeMin / 60);
    const co2Kg = energyKwh * 0.5; // ~0.5 kg CO2/kWh grid average
    const coolantLph = operation.includes("drill") ? 5 : ae >= toolDiam * 0.8 ? 12 : 8;
    sustainability = {
      energy_kWh_per_part: Math.round(energyKwh * 100) / 100,
      co2_kg_per_part: Math.round(co2Kg * 100) / 100,
      coolant_liters_per_hour: coolantLph,
    };
  }

  // 9. Surface finish grade
  const ra = raResult.Ra;
  const sfGrade = ra <= 0.4 ? "N3 (mirror)" : ra <= 0.8 ? "N4 (fine)" : ra <= 1.6 ? "N5 (smooth)"
    : ra <= 3.2 ? "N6 (good)" : ra <= 6.3 ? "N7 (fair)" : "N8+ (rough)";

  // Formulas used
  const formulas = ["Kienzle cutting force", "Taylor tool life"];
  if (tier !== "free") {
    formulas.push("Theoretical surface roughness (Ra)", "Volumetric MRR");
  }

  // Tier limiting
  const tierLimited = tier === "free";

  const result: SFCResult = {
    cutting_speed_m_min: Math.round(vc),
    spindle_rpm: Math.round(rpm),
    feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
    table_feed_mm_min: Math.round(vf),
    depth_of_cut_mm: Math.round(ap * 10) / 10,
    width_of_cut_mm: Math.round(ae * 10) / 10,
    cutting_force_N: Math.round(forceResult.Fc),
    power_kW: Math.round(forceResult.power * 100) / 100,
    torque_Nm: Math.round(forceResult.torque * 100) / 100,
    specific_cutting_force_N_mm2: Math.round(forceResult.specific_force),
    tool_life_min: taylorResult.tool_life_minutes,
    optimal_speed_m_min: taylorResult.optimal_speed ?? vc,
    surface_roughness_Ra_um: Math.round(ra * 100) / 100,
    surface_finish_grade: sfGrade,
    mrr_cm3_min: Math.round(mrrResult.mrr * 100) / 100,
    safety_score: safety.score,
    safety_status: safety.status as "safe" | "warning" | "danger",
    safety_warnings: safety.warnings,
    uncertainty,
    sustainability,
    formulas_used: formulas,
    calculation_time_ms: Date.now() - startTime,
    tier,
    tier_limited: tierLimited,
  };

  return { result };
}

function sfcCompare(params: SFCInput): { result: SFCCompareResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const toolMaterials = ["Carbide", "HSS", "Ceramic"];
  const approaches: SFCCompareResult["approaches"] = [];

  for (const tool of toolMaterials) {
    const sf = calculateSpeedFeed({
      material_hardness: mat.hardness,
      tool_material: tool as any,
      operation: mapOperation(params.operation ?? "milling"),
      tool_diameter: toolDiam,
      number_of_teeth: numTeeth,
    });

    const force = calculateKienzleCuttingForce(
      {
        cutting_speed: sf.cutting_speed,
        feed_per_tooth: sf.feed_per_tooth,
        axial_depth: ap,
        radial_depth: ae,
        tool_diameter: toolDiam,
        number_of_teeth: numTeeth,
      },
      { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
    );

    const tl = calculateTaylorToolLife(
      sf.cutting_speed,
      {
        C: mat.C * (tool === "HSS" ? 0.4 : tool === "Ceramic" ? 1.8 : 1.0),
        n: mat.n * (tool === "HSS" ? 1.0 : tool === "Ceramic" ? 0.8 : 1.0),
        material_id: mat.name,
      },
      sf.feed_per_tooth, ap,
    );

    const ra = calculateSurfaceFinish(
      sf.feed_per_tooth * numTeeth, 0.8, true, ae, toolDiam,
    );

    const mrr = calculateMRR({
      cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap, radial_depth: ae,
      tool_diameter: toolDiam, number_of_teeth: numTeeth,
    });

    // Composite score: balanced across productivity, tool life, quality
    const score = (mrr.mrr / 100) * 0.3 + (tl.tool_life_minutes / 60) * 0.3
      + (1 / (ra.Ra + 0.1)) * 0.2 + (1 - force.power / 20) * 0.2;

    approaches.push({
      name: `${tool} endmill`,
      cutting_speed: Math.round(sf.cutting_speed),
      feed: Math.round(sf.feed_per_tooth * 1000) / 1000,
      tool_life: Math.round(tl.tool_life_minutes * 10) / 10,
      mrr: Math.round(mrr.mrr * 100) / 100,
      power: Math.round(force.power * 100) / 100,
      surface_roughness: Math.round(ra.Ra * 100) / 100,
      score: Math.round(score * 1000) / 1000,
    });
  }

  approaches.sort((a, b) => b.score - a.score);

  return {
    result: {
      approaches,
      recommended: approaches[0].name,
      comparison_notes: [
        `Material: ${mat.name} (${mat.group}, HB ${mat.hardness})`,
        `Best overall: ${approaches[0].name} (score ${approaches[0].score})`,
        approaches[0].name.includes("Carbide")
          ? "Carbide offers best balance of speed and tool life for most applications"
          : approaches[0].name.includes("Ceramic")
            ? "Ceramic recommended for high-speed finishing of hard materials"
            : "HSS suitable for low-speed operations or interrupted cuts",
      ],
    },
  };
}

function sfcOptimize(params: SFCInput & { objective?: string }): { result: SFCOptimizeResult } | { error: string } {
  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
  const toolDiam = params.tool_diameter ?? 12;
  const numTeeth = params.number_of_teeth ?? 4;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;
  const objective = params.objective ?? "balanced";

  // Get baseline
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // Optimization: grid search around baseline
  let bestVc = sf.cutting_speed;
  let bestFz = sf.feed_per_tooth;
  let bestAp = ap;
  let bestAe = ae;
  let bestScore = -Infinity;
  let iterations = 0;

  const vcRange = [sf.cutting_speed * 0.7, sf.cutting_speed * 1.3];
  const fzRange = [sf.feed_per_tooth * 0.7, sf.feed_per_tooth * 1.3];

  for (let vcMult = 0.7; vcMult <= 1.3; vcMult += 0.1) {
    for (let fzMult = 0.7; fzMult <= 1.3; fzMult += 0.1) {
      iterations++;
      const testVc = sf.cutting_speed * vcMult;
      const testFz = sf.feed_per_tooth * fzMult;

      const tl = calculateTaylorToolLife(
        testVc, { C: mat.C, n: mat.n, material_id: mat.name }, testFz, ap,
      );

      const mrr = calculateMRR({
        cutting_speed: testVc, feed_per_tooth: testFz,
        axial_depth: ap, radial_depth: ae,
        tool_diameter: toolDiam, number_of_teeth: numTeeth,
      });

      const force = calculateKienzleCuttingForce(
        {
          cutting_speed: testVc,
          feed_per_tooth: testFz,
          axial_depth: ap,
          radial_depth: ae,
          tool_diameter: toolDiam,
          number_of_teeth: numTeeth,
        },
        { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
      );

      const ra = calculateSurfaceFinish(
        testFz * numTeeth, 0.8, true, ae, toolDiam,
      );

      // Score based on objective
      let score = 0;
      if (objective === "productivity" || objective === "mrr") {
        score = mrr.mrr * 0.6 + tl.tool_life_minutes * 0.2 - force.power * 0.2;
      } else if (objective === "tool_life") {
        score = tl.tool_life_minutes * 0.6 + mrr.mrr * 0.2 - ra.Ra * 0.2;
      } else if (objective === "quality" || objective === "surface") {
        score = (1 / (ra.Ra + 0.01)) * 0.6 + tl.tool_life_minutes * 0.3 - force.power * 0.1;
      } else if (objective === "cost") {
        const toolCostPerMin = 0.5;
        const machineCostPerMin = 2.0;
        const costPerPart = (10 / mrr.mrr) * machineCostPerMin + (10 / tl.tool_life_minutes) * toolCostPerMin * 30;
        score = -costPerPart; // Minimize cost
      } else {
        // Balanced
        score = mrr.mrr * 0.25 + tl.tool_life_minutes * 0.25 + (1 / (ra.Ra + 0.1)) * 0.25 - force.power * 0.25;
      }

      // Safety constraint: reject dangerous parameters
      if (testVc > SAFETY_LIMITS.MAX_CUTTING_SPEED || testFz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) continue;
      if (tl.tool_life_minutes < 3) continue; // Minimum tool life constraint
      if (params.machine_power_kw && force.power > params.machine_power_kw * 0.95) continue;

      if (score > bestScore) {
        bestScore = score;
        bestVc = testVc;
        bestFz = testFz;
      }
    }
  }

  // Calculate improvement
  const origMRR = calculateMRR({
    cutting_speed: sf.cutting_speed, feed_per_tooth: sf.feed_per_tooth,
    axial_depth: ap, radial_depth: ae,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const optMRR = calculateMRR({
    cutting_speed: bestVc, feed_per_tooth: bestFz,
    axial_depth: bestAp, radial_depth: bestAe,
    tool_diameter: toolDiam, number_of_teeth: numTeeth,
  });
  const improvement = origMRR.mrr > 0
    ? ((optMRR.mrr - origMRR.mrr) / origMRR.mrr) * 100
    : 0;

  return {
    result: {
      objective,
      original: {
        vc: Math.round(sf.cutting_speed),
        fz: Math.round(sf.feed_per_tooth * 1000) / 1000,
        ap: Math.round(ap * 10) / 10,
        ae: Math.round(ae * 10) / 10,
      },
      optimized: {
        vc: Math.round(bestVc),
        fz: Math.round(bestFz * 1000) / 1000,
        ap: Math.round(bestAp * 10) / 10,
        ae: Math.round(bestAe * 10) / 10,
      },
      improvement_pct: Math.round(improvement * 10) / 10,
      constraints_met: true,
      iterations,
    },
  };
}

function sfcQuick(params: { material?: string; operation?: string }): any {
  // Minimal input → full result using smart defaults
  return sfcCalculate({
    material: params.material ?? "4140",
    operation: params.operation ?? "milling",
    tool_material: "Carbide",
    tool_diameter: 12,
    number_of_teeth: 4,
    tier: "pro",
  });
}

function sfcMaterials(): { materials: Array<{ id: string; group: string; hardness: number }> } {
  return {
    materials: Object.entries(MATERIAL_HARDNESS).map(([id, m]) => ({
      id,
      group: m.group,
      hardness: m.hardness,
    })),
  };
}

function sfcTools(): { tools: Array<{ material: string; speed_range: string; applications: string }> } {
  return {
    tools: [
      { material: "HSS", speed_range: "10-60 m/min", applications: "General purpose, interrupted cuts, low cost" },
      { material: "Carbide", speed_range: "80-400 m/min", applications: "Most materials, best balance of speed and life" },
      { material: "Ceramic", speed_range: "200-1200 m/min", applications: "Hard materials, high-speed finishing" },
      { material: "CBN", speed_range: "150-500 m/min", applications: "Hardened steel (>45 HRC), cast iron" },
      { material: "Diamond", speed_range: "300-3000 m/min", applications: "Non-ferrous metals, composites, plastics" },
    ],
  };
}

function sfcFormulas(): { formulas: Array<{ name: string; use: string; equation: string }> } {
  return {
    formulas: [
      { name: "Kienzle", use: "Cutting force & power", equation: "Fc = kc1.1 × h^(1-mc) × ap × ae/D" },
      { name: "Taylor", use: "Tool life prediction", equation: "V × T^n = C" },
      { name: "Theoretical Ra", use: "Surface roughness", equation: "Ra = f²/(32×r)" },
      { name: "MRR", use: "Material removal rate", equation: "Q = Vc × fz × z × ap × ae / (π×D)" },
      { name: "Stability Lobes", use: "Chatter avoidance", equation: "RPM = 60×f/(z×(k+0.5))" },
    ],
  };
}

function sfcSafety(params: SFCInput): any {
  const mat = resolveMaterial(params.material, params.material_hardness);
  const sf = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: (params.tool_material ?? "Carbide") as any,
    operation: mapOperation(params.operation ?? "milling"),
    tool_diameter: params.tool_diameter ?? 12,
    number_of_teeth: params.number_of_teeth ?? 4,
  });
  const toolDiam = params.tool_diameter ?? 12;
  const ap = params.depth_of_cut ?? toolDiam * 0.5;
  const ae = params.width_of_cut ?? toolDiam * 0.5;

  const force = calculateKienzleCuttingForce(
    {
      cutting_speed: sf.cutting_speed,
      feed_per_tooth: sf.feed_per_tooth,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: toolDiam,
      number_of_teeth: params.number_of_teeth ?? 4,
    },
    { kc1_1: mat.kc1_1, mc: mat.mc, material_id: mat.name },
  );

  return calculateSafetyScore(
    sf.cutting_speed, sf.feed_per_tooth, ap, ae, toolDiam,
    force.power, params.machine_power_kw, force.Fc,
  );
}

// ─── SFC History (in-memory for session) ────────────────────────────────────

const sfcHistory: Array<{ timestamp: string; action: string; input: any; material: string }> = [];

function recordHistory(action: string, input: any): void {
  sfcHistory.push({
    timestamp: new Date().toISOString(),
    action,
    input,
    material: input.material ?? "unknown",
  });
  if (sfcHistory.length > 100) sfcHistory.shift();
}

// ─── Main SFC Dispatcher ────────────────────────────────────────────────────

export function productSFC(action: string, params: Record<string, any>): any {
  recordHistory(action, params);

  switch (action) {
    case "sfc_calculate":
      return sfcCalculate(params as SFCInput);
    case "sfc_compare":
      return sfcCompare(params as SFCInput);
    case "sfc_optimize":
      return sfcOptimize(params as SFCInput & { objective?: string });
    case "sfc_quick":
      return sfcQuick(params);
    case "sfc_materials":
      return sfcMaterials();
    case "sfc_tools":
      return sfcTools();
    case "sfc_formulas":
      return sfcFormulas();
    case "sfc_safety":
      return sfcSafety(params as SFCInput);
    case "sfc_history":
      return { history: sfcHistory.slice(-50) };
    case "sfc_get":
      return {
        product: "Speed & Feed Calculator",
        version: "1.0.0",
        actions: ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
          "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety",
          "sfc_history", "sfc_get"],
        tiers: ["free", "pro", "enterprise"],
        materials_count: Object.keys(MATERIAL_HARDNESS).length,
        formulas: ["Kienzle", "Taylor", "Theoretical Ra", "MRR"],
      };
    default:
      return { error: `Unknown SFC action: ${action}` };
  }
}

// ─── PPG Product Engine (MS1) ───────────────────────────────────────────────
// Post Processor Generator — composes GCodeTemplateEngine + DNCTransferEngine
// + ToolpathCalculations into a unified G-code workflow product.
//
// Pipeline: Input G-code/params → Validate → Translate/Generate → Compare → Output
// ─────────────────────────────────────────────────────────────────────────────

const ppgHistory: Array<{ action: string; timestamp: string; controller?: string; summary: string }> = [];

/** G-code syntax patterns per controller family for validation */
const CONTROLLER_SYNTAX: Record<string, {
  comment_open: string; comment_close: string;
  modal_groups: string[]; canned_cycles: string[];
  line_prefix: string; program_end: string;
  dialect_notes: string[];
}> = {
  fanuc: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Parentheses for comments", "O-number program ID", "G43 H-word tool length comp"],
  },
  haas: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible syntax", "Setting 15 for G/M code checks", "Macro B compatible"],
  },
  siemens: {
    comment_open: ";", comment_close: "",
    modal_groups: ["G0/G1/G2/G3", "G17/G18/G19", "G90/G91", "TRANS/ATRANS", "D (tool offset)"],
    canned_cycles: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Semicolon comments", "CYCLE81/83/84 canned cycles", "R-parameters", "TRANSMIT for C-axis"],
  },
  heidenhain: {
    comment_open: ";", comment_close: "",
    modal_groups: ["L (linear)", "CC/C (arc center/arc)", "CYCL DEF", "TOOL CALL", "BLK FORM"],
    canned_cycles: ["CYCL DEF 1", "CYCL DEF 200", "CYCL DEF 203", "CYCL DEF 205", "CYCL DEF 207"],
    line_prefix: "", program_end: "END PGM",
    dialect_notes: ["Conversational/plaintext syntax", "CYCL DEF for cycles", "TOOL CALL for tool changes", "FK free contour programming"],
  },
  mazak: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "Mazatrol conversational mode available", "Smooth CNC extensions"],
  },
  okuma: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "OSP-P300 extensions", "Navi-program available"],
  },
};

/** Validate G-code content against controller syntax rules */
function ppgValidateGCode(gcode: string, controller: string): {
  valid: boolean; errors: string[]; warnings: string[]; line_count: number;
  controller: string; controller_family: string; score: number;
} {
  const ctrl = resolveController(controller);
  const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
  const lines = gcode.split("\n").filter(l => l.trim().length > 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Program end code
  const hasEnd = lines.some(l => l.includes(syntax.program_end));
  if (!hasEnd) errors.push(`Missing program end (${syntax.program_end})`);

  // Check 2: Comment syntax
  if (ctrl.family === "siemens" || ctrl.family === "heidenhain") {
    const parenComments = lines.filter(l => l.includes("(") && l.includes(")"));
    if (parenComments.length > 0) {
      warnings.push(`Found ${parenComments.length} parenthesis comments — ${ctrl.name} uses semicolon comments`);
    }
  } else {
    const semiComments = lines.filter(l => {
      const stripped = l.replace(/\(.*?\)/g, "");
      return stripped.includes(";") && !stripped.startsWith(";");
    });
    if (semiComments.length > 0) {
      warnings.push(`Found ${semiComments.length} semicolon comments — ${ctrl.name} uses parenthesis comments`);
    }
  }

  // Check 3: Canned cycle compatibility
  const gCodes = lines.flatMap(l => {
    const matches = l.match(/G\d{1,3}/gi) || [];
    return matches.map(m => m.toUpperCase());
  });
  if (ctrl.family === "siemens") {
    const fanucCycles = gCodes.filter(g => ["G73", "G76", "G81", "G82", "G83", "G84", "G85", "G86"].includes(g));
    if (fanucCycles.length > 0) {
      errors.push(`Fanuc-style canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCLE81/83/84/86`);
    }
  }
  if (ctrl.family === "heidenhain") {
    const fanucCycles = gCodes.filter(g => /^G[78]\d$/.test(g));
    if (fanucCycles.length > 0) {
      errors.push(`G-code canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCL DEF`);
    }
  }

  // Check 4: Feed rate present
  const hasFeed = lines.some(l => /F[\d.]+/.test(l));
  if (!hasFeed) warnings.push("No feed rate (F-word) found in program");

  // Check 5: Spindle speed present
  const hasSpindle = lines.some(l => /S\d+/.test(l));
  if (!hasSpindle) warnings.push("No spindle speed (S-word) found in program");

  // Check 6: Work offset
  const hasWorkOffset = lines.some(l => /G5[4-9]/.test(l));
  if (!hasWorkOffset) warnings.push("No work offset (G54-G59) found — machine may use G54 default");

  // Check 7: Tool change
  const hasToolChange = lines.some(l => /T\d+/.test(l) && (/M6/i.test(l) || /M06/i.test(l)));
  if (!hasToolChange) warnings.push("No tool change (T## M6) found");

  const score = Math.max(0, 1 - errors.length * 0.25 - warnings.length * 0.05);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    line_count: lines.length,
    controller: ctrl.name,
    controller_family: ctrl.family,
    score: Math.round(score * 100) / 100,
  };
}

/** Translate G-code from source controller to target controller */
function ppgTranslateGCode(gcode: string, sourceController: string, targetController: string): {
  original_controller: string; target_controller: string;
  translated_gcode: string; changes_made: string[];
  line_count: number; warnings: string[];
} {
  const src = resolveController(sourceController);
  const tgt = resolveController(targetController);
  const srcSyntax = CONTROLLER_SYNTAX[src.family] || CONTROLLER_SYNTAX.fanuc;
  const tgtSyntax = CONTROLLER_SYNTAX[tgt.family] || CONTROLLER_SYNTAX.fanuc;
  const changes: string[] = [];
  const warnings: string[] = [];
  let translated = gcode;

  // Same family — minimal translation
  if (src.family === tgt.family) {
    changes.push(`Same controller family (${src.family}) — minimal translation needed`);
    return {
      original_controller: src.name,
      target_controller: tgt.name,
      translated_gcode: translated,
      changes_made: changes,
      line_count: translated.split("\n").filter(l => l.trim()).length,
      warnings: ["Source and target share the same dialect — only header updated"],
    };
  }

  // Comment translation
  if (srcSyntax.comment_open !== tgtSyntax.comment_open) {
    if (srcSyntax.comment_open === "(") {
      // Fanuc-style → Siemens/Heidenhain
      translated = translated.replace(/\(([^)]*)\)/g, `${tgtSyntax.comment_open} $1`);
      changes.push(`Converted parenthesis comments to ${tgt.family} semicolon comments`);
    } else {
      // Siemens/Heidenhain → Fanuc-style
      translated = translated.replace(/;\s*(.*?)$/gm, `(${srcSyntax.comment_open === ";" ? "$1" : "$1"})`);
      changes.push(`Converted semicolon comments to ${tgt.family} parenthesis comments`);
    }
  }

  // Canned cycle translation: Fanuc → Siemens
  if ((src.family === "fanuc" || src.family === "haas" || src.family === "mazak" || src.family === "okuma") && tgt.family === "siemens") {
    translated = translated.replace(/G81\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G81 → CYCLE81 (standard drilling)");
      return `CYCLE81(${r},0,${z}) F${f}\n`;
    });
    translated = translated.replace(/G83\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const q = args.match(/Q([\d.]+)/i)?.[1] || "3";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G83 → CYCLE83 (deep-hole drilling with peck)");
      return `CYCLE83(${r},0,${z},${q}) F${f}\n`;
    });
    translated = translated.replace(/G84\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const pitch = args.match(/(?:F|K)([\d.]+)/i)?.[1] || "1.5";
      changes.push("G84 → CYCLE84 (tapping)");
      return `CYCLE84(${r},0,${z},${pitch})\n`;
    });
  }

  // Canned cycle translation: Siemens → Fanuc
  if (src.family === "siemens" && (tgt.family === "fanuc" || tgt.family === "haas" || tgt.family === "mazak" || tgt.family === "okuma")) {
    translated = translated.replace(/CYCLE81\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE81 → G81 (standard drilling)");
      return `G81 R${parts[0] || "5"} Z${parts[2] || "-10"} F100`;
    });
    translated = translated.replace(/CYCLE83\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE83 → G83 (peck drilling)");
      return `G83 R${parts[0] || "5"} Z${parts[2] || "-10"} Q${parts[3] || "3"} F100`;
    });
    translated = translated.replace(/CYCLE84\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE84 → G84 (tapping)");
      return `G84 R${parts[0] || "5"} Z${parts[2] || "-10"} F${parts[3] || "1.5"}`;
    });
  }

  // Heidenhain ↔ Fanuc-family (flag as manual)
  if (src.family === "heidenhain" || tgt.family === "heidenhain") {
    if (changes.length === 0 || (changes.length === 1 && changes[0].includes("comment"))) {
      warnings.push("Heidenhain conversational ↔ ISO G-code requires careful manual review");
      warnings.push("CYCL DEF / TOOL CALL patterns may not auto-translate — verify output");
    }
  }

  // Program end translation
  if (srcSyntax.program_end !== tgtSyntax.program_end) {
    translated = translated.replace(new RegExp(srcSyntax.program_end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), tgtSyntax.program_end);
    changes.push(`Program end: ${srcSyntax.program_end} → ${tgtSyntax.program_end}`);
  }

  return {
    original_controller: src.name,
    target_controller: tgt.name,
    translated_gcode: translated,
    changes_made: changes.length > 0 ? changes : ["No structural changes needed"],
    line_count: translated.split("\n").filter(l => l.trim()).length,
    warnings,
  };
}

export function productPPG(action: string, params: Record<string, any>): any {
  const tier: ProductTier = params.tier || "pro";

  switch (action) {
    case "ppg_validate": {
      const gcode = params.gcode || params.content || "";
      const controller = params.controller || "fanuc";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to validate)" };

      const result = ppgValidateGCode(gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Valid=${result.valid}, score=${result.score}, errors=${result.errors.length}` });
      return result;
    }

    case "ppg_translate": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const target = params.target_controller || params.target || "siemens";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to translate)" };

      const result = ppgTranslateGCode(gcode, source, target);

      // Auto-validate translated output
      const validation = ppgValidateGCode(result.translated_gcode, target);

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: `${source}→${target}`, summary: `${result.changes_made.length} changes, valid=${validation.valid}` });
      return { ...result, validation };
    }

    case "ppg_templates": {
      const controllers = listControllers();
      const operations = listOperations();
      const templates = controllers.flatMap(ctrl =>
        operations.slice(0, tier === "free" ? 4 : operations.length).map(op => ({
          controller: ctrl.name,
          controller_family: ctrl.family,
          operation: op,
          available: true,
        }))
      );
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${templates.length} templates listed` });
      return { templates, total: templates.length, controllers: controllers.length, operations: operations.length };
    }

    case "ppg_generate": {
      const controller = params.controller || "fanuc";
      const operation = params.operation || "facing";
      const rpm = params.rpm || 3200;
      const feedRate = params.feed_rate || params.vf || 800;

      // Multi-operation mode
      if (params.operations && Array.isArray(params.operations)) {
        const result = generateProgram(controller, params.operations);
        const validation = ppgValidateGCode(result.gcode, controller);
        ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Program: ${params.operations.length} ops, ${result.line_count} lines` });
        return { ...result, validation };
      }

      // Single operation
      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -3,
        work_offset: params.work_offset || "G54",
        peck_depth: params.peck_depth,
        dwell: params.dwell,
        pitch: params.pitch,
        thread_diameter: params.thread_diameter,
        thread_pitch: params.thread_pitch,
        thread_depth: params.thread_depth,
        thread_direction: params.thread_direction,
        pocket_diameter: params.pocket_diameter,
        pocket_depth: params.pocket_depth,
        tool_diameter: params.tool_diameter,
        stepover_percent: params.stepover_percent,
        profile_points: params.profile_points,
        comp_side: params.comp_side,
        x_start: params.x_start,
        y_start: params.y_start,
        x_end: params.x_end,
        y_end: params.y_end,
        program_number: params.program_number,
        program_name: params.program_name,
      };

      const result = generateGCode(controller, operation, gcParams);
      const validation = ppgValidateGCode(result.gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `${operation}: ${result.line_count} lines` });
      return { ...result, validation };
    }

    case "ppg_controllers": {
      const controllers = listControllers();
      const enriched = controllers.map(ctrl => ({
        ...ctrl,
        syntax: CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc,
      }));
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${controllers.length} controllers` });
      return { controllers: enriched, total: enriched.length };
    }

    case "ppg_compare": {
      const operation = params.operation || "drilling";
      const rpm = params.rpm || 2000;
      const feedRate = params.feed_rate || params.vf || 500;
      const controllers = params.controllers || ["fanuc", "siemens", "heidenhain"];

      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -15,
        peck_depth: params.peck_depth || 3,
      };

      const results = controllers.map((ctrl: string) => {
        try {
          const result = generateGCode(ctrl, operation, gcParams);
          const validation = ppgValidateGCode(result.gcode, ctrl);
          return {
            controller: result.controller,
            controller_family: result.controller_family,
            gcode: result.gcode,
            line_count: result.line_count,
            validation_score: validation.score,
            warnings: result.warnings,
          };
        } catch (err: any) {
          return { controller: ctrl, error: err.message };
        }
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `Compared ${controllers.length} controllers for ${operation}` });
      return { operation, parameters: gcParams, results, controllers_compared: results.length };
    }

    case "ppg_syntax": {
      const controller = params.controller || "fanuc";
      const ctrl = resolveController(controller);
      const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Syntax ref for ${ctrl.name}` });
      return {
        controller: ctrl.name,
        controller_family: ctrl.family,
        syntax,
        supported_operations: listOperations(),
      };
    }

    case "ppg_batch": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const targets = params.targets || params.target_controllers || ["siemens", "heidenhain", "haas"];
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to batch-translate)" };

      if (tier === "free" && targets.length > 2) {
        return { error: "Free tier limited to 2 target controllers per batch. Upgrade to Pro for unlimited batch translation." };
      }

      const results = targets.map((target: string) => {
        const translation = ppgTranslateGCode(gcode, source, target);
        const validation = ppgValidateGCode(translation.translated_gcode, target);
        return {
          target_controller: translation.target_controller,
          translated_gcode: translation.translated_gcode,
          changes_made: translation.changes_made,
          validation_score: validation.score,
          valid: validation.valid,
          warnings: [...translation.warnings, ...validation.warnings],
        };
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: source, summary: `Batch: ${source} → ${targets.length} targets` });
      const resolvedSource = resolveController(source);
      return { source_controller: resolvedSource.name, results, total_targets: results.length };
    }

    case "ppg_history":
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: ppgHistory.slice(-50), total: ppgHistory.length };

    case "ppg_get":
      return {
        product: "Post Processor Generator",
        version: "1.0.0",
        actions: ["ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get"],
        controllers: listControllers().length,
        operations: listOperations().length,
        tiers: ["free", "pro", "enterprise"],
        dialect_families: Object.keys(CONTROLLER_SYNTAX).length,
      };

    default:
      return { error: `Unknown PPG action: ${action}` };
  }
}

// ─── Shop Manager Placeholder (MS2) ─────────────────────────────────────────

export function productShop(action: string, params: Record<string, any>): any {
  return { error: "Shop Manager product not yet implemented (R11-MS2)" };
}

// ─── ACNC Placeholder (MS3) ─────────────────────────────────────────────────

export function productACNC(action: string, params: Record<string, any>): any {
  return { error: "ACNC product not yet implemented (R11-MS3)" };
}
