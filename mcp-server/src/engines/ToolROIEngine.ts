/**
 * ToolROIEngine — Tool Return-on-Investment Analyzer (E1081)
 *
 * For every tool decision, computes:
 * - Best tool from user's crib (inventory) with cost-per-part
 * - Best tool from 95K catalog at 3 price points (budget/standard/premium)
 * - ROI calculation: payback period vs current tool
 *
 * Key physics:
 *   Taylor tool life: T = (C / Vc)^(1/n) minutes
 *   Parts per tool: floor(T / cycle_time_per_part)
 *   Tool cost/part: price / parts_per_tool
 *   Machining cost/part: cycle_time * machine_rate / 60
 *   Total cost/part: tool_cost + machining_cost
 *
 * Reference: Taylor (1907) tool life equation,
 *            Sandvik tooling economics,
 *            ISO 3685 tool life testing
 *
 * Actions: tool_roi_analysis
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FeatureSpec {
  type: "hole" | "pocket" | "slot" | "face" | "contour" | "thread" | "bore" | "drill" | "chamfer";
  dimensions: { diameter_mm?: number; width_mm?: number; depth_mm?: number; length_mm?: number };
  tolerance_mm: number;
  surface_finish_Ra?: number;
}

export interface MaterialSpec {
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  name: string;
  kc1_1?: number;   // specific cutting force (N/mm^2)
  mc?: number;       // cutting force exponent
}

export interface MachineSpec {
  max_rpm: number;
  max_power_kw: number;
  machine_rate_per_hour?: number; // $/hr shop rate
}

export interface CurrentToolSpec {
  id: string;
  name: string;
  price: number;
  condition: "new" | "good" | "worn" | "needs_regrind";
}

export interface ToolInventoryItem {
  id: string;
  name: string;
  type: "endmill" | "drill" | "tap" | "reamer" | "insert" | "boring_bar" | "face_mill";
  diameter_mm: number;
  flutes?: number;
  material: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  max_depth_mm?: number;
  corner_radius_mm?: number;
  condition: "new" | "good" | "worn" | "needs_regrind" | "retired";
  price: number;
}

export interface ToolROIInput {
  feature: FeatureSpec;
  material: MaterialSpec;
  machine: MachineSpec;
  current_tool?: CurrentToolSpec;
  user_inventory?: ToolInventoryItem[];
  optimization_goal: "cost" | "performance" | "balanced";
  /** Annual production volume (parts/year) for the annual-savings extrapolation. When omitted,
   *  DEFAULT_ANNUAL_PARTS is used and annual_savings is labeled an assumed-default estimate. */
  annual_parts?: number;
}

export interface ToolRecommendation {
  tool: { id: string; name: string; diameter_mm: number; material: string; coating: string; price: number };
  cost_per_part: AtomicValue;
  rationale: string;
}

export interface ROIComparison {
  savings_per_part: AtomicValue;
  roi_parts: AtomicValue;
  payback_description: string;
}

export interface ToolROIResult {
  crib_recommendation: ToolRecommendation | null;
  budget_recommendation: ToolRecommendation;
  standard_recommendation: ToolRecommendation;
  premium_recommendation: ToolRecommendation;
  roi_vs_current: ROIComparison | null;
  total_cost_breakdown: {
    current_total_per_part: AtomicValue | null;
    best_total_per_part: AtomicValue;
    annual_savings: AtomicValue;
  };
  warnings: string[];
}

// ── Taylor Tool Life Constants by ISO Group ──────────────────────

import { CANONICAL_TAYLOR, CANONICAL_TOOL_MODULUS, CANONICAL_MILLING_SPEEDS } from "../physics/constants.js";
import type { ISOGroup } from "../physics/constants.js";

/**
 * Taylor C constant (m/min) by ISO material group and tool material.
 * Carbide values sourced from CANONICAL_TAYLOR; non-carbide are extensions.
 */
const TAYLOR_C: Record<string, Record<string, number>> = {
  P: { carbide: CANONICAL_TAYLOR.P.C, hss: 120, cermet: 400, ceramic: 800, cbn: 1200, pcd: 600 },
  M: { carbide: CANONICAL_TAYLOR.M.C, hss: 80,  cermet: 300, ceramic: 600, cbn: 900,  pcd: 450 },
  K: { carbide: CANONICAL_TAYLOR.K.C, hss: 150, cermet: 450, ceramic: 900, cbn: 1400, pcd: 800 },
  N: { carbide: CANONICAL_TAYLOR.N.C, hss: 250, cermet: 500, ceramic: 700, cbn: 800,  pcd: 1500 },
  S: { carbide: CANONICAL_TAYLOR.S.C, hss: 50,  cermet: 200, ceramic: 400, cbn: 700,  pcd: 350 },
  H: { carbide: CANONICAL_TAYLOR.H.C, hss: 40,  cermet: 180, ceramic: 500, cbn: 1000, pcd: 300 },
};

/** Taylor n exponent by tool material — carbide uses canonical per ISO group */
function getTaylorN(isoGroup: string, toolMat: string): number {
  if (toolMat === "carbide") return (CANONICAL_TAYLOR as any)[isoGroup]?.n ?? 0.25;
  const NON_CARBIDE_N: Record<string, number> = {
    hss: 0.125, cermet: 0.28, ceramic: 0.35, cbn: 0.40, pcd: 0.38,
  };
  return NON_CARBIDE_N[toolMat] ?? 0.25;
}

/** @deprecated Use getTaylorN(isoGroup, toolMat) for per-group n values */
const TAYLOR_N: Record<string, number> = {
  carbide: 0.25, hss: 0.125, cermet: 0.28, ceramic: 0.35, cbn: 0.40, pcd: 0.38,
};

/** Default cutting speeds (m/min) by ISO group for endmill roughing */
const DEFAULT_VC: Record<string, Record<string, number>> = {
  P: { carbide: 200, hss: 30, cermet: 250, ceramic: 500, cbn: 200, pcd: 150 },
  M: { carbide: 150, hss: 20, cermet: 180, ceramic: 350, cbn: 150, pcd: 120 },
  K: { carbide: 250, hss: 40, cermet: 280, ceramic: 600, cbn: 300, pcd: 400 },
  N: { carbide: 400, hss: 80, cermet: 350, ceramic: 500, cbn: 300, pcd: 800 },
  S: { carbide: 50,  hss: 12, cermet: 60,  ceramic: 200, cbn: 100, pcd: 80 },
  H: { carbide: 80,  hss: 15, cermet: 100, ceramic: 300, cbn: 250, pcd: 100 },
};

/** Condition derate factors */
const CONDITION_DERATE: Record<string, number> = {
  new: 1.0,
  good: 0.95,
  worn: 0.80,
  needs_regrind: 0.65,
  retired: 0,
};

/** Catalog tool archetypes at 3 price tiers */
interface CatalogArchetype {
  id: string;
  name: string;
  material: string;
  coating: string;
  price: number;
  vc_factor: number;     // multiplier vs default Vc
  life_factor: number;   // multiplier vs baseline Taylor life
}

const CATALOG_TIERS: Record<string, { budget: CatalogArchetype; standard: CatalogArchetype; premium: CatalogArchetype }> = {
  endmill: {
    budget:   { id: "CAT-EM-B", name: "Economy Carbide Endmill",   material: "carbide", coating: "TiN",    price: 25,  vc_factor: 0.85, life_factor: 0.8 },
    standard: { id: "CAT-EM-S", name: "Performance Carbide Endmill", material: "carbide", coating: "AlTiN", price: 65,  vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-EM-P", name: "Premium Carbide Endmill",   material: "carbide", coating: "nACRo",  price: 145, vc_factor: 1.20, life_factor: 1.5 },
  },
  drill: {
    budget:   { id: "CAT-DR-B", name: "Economy Carbide Drill",     material: "carbide", coating: "TiN",    price: 18,  vc_factor: 0.85, life_factor: 0.8 },
    standard: { id: "CAT-DR-S", name: "Performance Carbide Drill", material: "carbide", coating: "AlTiN",  price: 55,  vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-DR-P", name: "Premium Carbide Drill",     material: "carbide", coating: "TiAlSiN", price: 120, vc_factor: 1.15, life_factor: 1.4 },
  },
  face_mill: {
    budget:   { id: "CAT-FM-B", name: "Economy Face Mill Body + Inserts", material: "carbide", coating: "CVD",  price: 85,  vc_factor: 0.85, life_factor: 0.8 },
    standard: { id: "CAT-FM-S", name: "Standard Face Mill + Inserts",    material: "carbide", coating: "PVD",  price: 180, vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-FM-P", name: "Premium Face Mill + Inserts",     material: "cermet",  coating: "PVD",  price: 350, vc_factor: 1.15, life_factor: 1.3 },
  },
  tap: {
    budget:   { id: "CAT-TP-B", name: "Economy HSS Tap",            material: "hss",     coating: "TiN",   price: 12,  vc_factor: 0.85, life_factor: 0.7 },
    standard: { id: "CAT-TP-S", name: "Performance Carbide Tap",    material: "carbide", coating: "TiCN",  price: 45,  vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-TP-P", name: "Premium Carbide Thread Mill", material: "carbide", coating: "AlTiN", price: 95,  vc_factor: 1.10, life_factor: 1.3 },
  },
  reamer: {
    budget:   { id: "CAT-RM-B", name: "Economy HSS Reamer",         material: "hss",     coating: "none",  price: 15,  vc_factor: 0.80, life_factor: 0.7 },
    standard: { id: "CAT-RM-S", name: "Carbide Reamer",             material: "carbide", coating: "TiAlN", price: 65,  vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-RM-P", name: "PCD-Tipped Reamer",          material: "pcd",     coating: "none",  price: 220, vc_factor: 1.25, life_factor: 2.0 },
  },
  boring_bar: {
    budget:   { id: "CAT-BB-B", name: "Economy Boring Bar + Insert", material: "carbide", coating: "CVD",  price: 60,  vc_factor: 0.85, life_factor: 0.8 },
    standard: { id: "CAT-BB-S", name: "Standard Boring Bar + Insert", material: "carbide", coating: "PVD", price: 130, vc_factor: 1.0,  life_factor: 1.0 },
    premium:  { id: "CAT-BB-P", name: "Anti-Vibration Boring Bar",   material: "carbide", coating: "PVD",  price: 380, vc_factor: 1.10, life_factor: 1.4 },
  },
};

// ── Engine ─────────────────────────────────────────────────────────

// Fallback annual production volume (parts/year) used ONLY when the caller supplies no
// input.annual_parts. The annual_savings figure is then labeled an assumed-default estimate.
const DEFAULT_ANNUAL_PARTS = 5000;

export class ToolROIEngine {
  readonly name = "ToolROIEngine";

  calculate(input: ToolROIInput): ToolROIResult {
    const warnings: string[] = [];
    const machineRate = input.machine.machine_rate_per_hour ?? 85; // $/hr default
    const toolType = this.featureToToolType(input.feature.type);
    const targetDia = input.feature.dimensions.diameter_mm
      ?? input.feature.dimensions.width_mm ?? 12;

    // ── Estimate cycle time per part for this feature ──────────
    const cycleTime = this.estimateCycleTime(input.feature, input.material, targetDia);

    // ── 1. Crib recommendation (user inventory) ───────────────
    let cribRec: ToolRecommendation | null = null;
    if (input.user_inventory && input.user_inventory.length > 0) {
      cribRec = this.findBestFromInventory(
        input.user_inventory, input.feature, input.material,
        targetDia, cycleTime, machineRate, warnings
      );
    }

    // ── 2. Catalog recommendations at 3 price points ──────────
    const tiers = CATALOG_TIERS[toolType] ?? CATALOG_TIERS.endmill;
    const budgetRec = this.evaluateCatalogTool(
      tiers.budget, targetDia, input.material, cycleTime, machineRate, "budget"
    );
    const standardRec = this.evaluateCatalogTool(
      tiers.standard, targetDia, input.material, cycleTime, machineRate, "standard"
    );
    const premiumRec = this.evaluateCatalogTool(
      tiers.premium, targetDia, input.material, cycleTime, machineRate, "premium"
    );

    // ── 3. Validate: budget must have >15min life, deflection < tol ──
    this.validateBudget(budgetRec, input, targetDia, warnings);

    // ── 4. ROI vs current tool ────────────────────────────────
    let roiVsCurrent: ROIComparison | null = null;
    let currentCostPerPart: AtomicValue | null = null;

    // Select best recommendation based on optimization goal
    const bestRec = this.selectBest(
      input.optimization_goal, cribRec, budgetRec, standardRec, premiumRec
    );

    if (input.current_tool) {
      const condFactor = CONDITION_DERATE[input.current_tool.condition] ?? 0.85;
      const currentToolMat = "carbide"; // assume carbide if not specified
      const currentLife = this.taylorLife(
        DEFAULT_VC[input.material.iso_group]?.[currentToolMat] ?? 200,
        input.material.iso_group, currentToolMat
      ) * condFactor;
      const currentPartsPerTool = Math.max(1, Math.floor(currentLife / cycleTime));
      const currentToolCpp = input.current_tool.price / currentPartsPerTool;
      const currentMachCpp = cycleTime * machineRate / 60;
      const currentTotalCpp = currentToolCpp + currentMachCpp;

      currentCostPerPart = av(r3(currentTotalCpp), "$/part", 0.02,
        `Current tool: $${r2(input.current_tool.price)} / ${currentPartsPerTool} parts + machining`);

      const bestCpp = bestRec.cost_per_part.value;
      const savings = currentTotalCpp - bestCpp;
      const roiParts = savings > 0
        ? Math.ceil(bestRec.tool.price / savings)
        : 0;

      roiVsCurrent = {
        savings_per_part: av(r3(Math.max(0, savings)), "$/part", 0.01,
          `$${r3(currentTotalCpp)} current - $${r3(bestCpp)} recommended`),
        roi_parts: av(roiParts, "parts", 1,
          `$${r2(bestRec.tool.price)} / $${r3(Math.max(0.001, savings))}/part`),
        payback_description: savings > 0
          ? `Buy ${bestRec.tool.name} for $${r2(bestRec.tool.price)}, saves $${r3(savings)}/part vs current tool, ROI in ${roiParts} parts`
          : "Current tool is already cost-effective; no upgrade needed",
      };
    }

    // ── 5. Annual savings estimate ────────────────────────────
    // Use the caller's real annual volume when supplied; else a named default (labeled below).
    const annualPartsIsDefault = !(input.annual_parts && input.annual_parts > 0);
    const annualParts = annualPartsIsDefault ? DEFAULT_ANNUAL_PARTS : input.annual_parts!;
    const bestCpp = bestRec.cost_per_part.value;
    const currentCpp = currentCostPerPart?.value ?? bestCpp;
    const annualSavings = Math.max(0, (currentCpp - bestCpp) * annualParts);

    // ── 6. Generate warnings ──────────────────────────────────
    if (budgetRec.cost_per_part.value > premiumRec.cost_per_part.value) {
      warnings.push(
        "Premium tool has lower cost-per-part than budget — " +
        "longer life offsets higher price"
      );
    }
    if (cribRec && cribRec.cost_per_part.value > standardRec.cost_per_part.value * 1.5) {
      warnings.push(
        `Inventory tool costs ${r1(cribRec.cost_per_part.value / standardRec.cost_per_part.value)}x more per part than catalog standard — ` +
        "consider purchasing replacement"
      );
    }
    if (input.material.iso_group === "S" || input.material.iso_group === "H") {
      warnings.push(
        `Difficult material (ISO ${input.material.iso_group}) — ` +
        "premium tooling typically has best ROI"
      );
    }

    return {
      crib_recommendation: cribRec,
      budget_recommendation: budgetRec,
      standard_recommendation: standardRec,
      premium_recommendation: premiumRec,
      roi_vs_current: roiVsCurrent,
      total_cost_breakdown: {
        current_total_per_part: currentCostPerPart,
        best_total_per_part: av(r3(bestCpp), "$/part", 0.01,
          `Best option: ${bestRec.tool.name}`),
        annual_savings: av(r0(annualSavings), "$/year", 50,
          annualPartsIsDefault
            ? `Savings over an ASSUMED ${annualParts} parts/year (default; pass annual_parts for your real volume)`
            : `Savings over ${annualParts} parts/year`),
      },
      warnings,
    };
  }

  // ── Taylor Tool Life ──────────────────────────────────────────

  /** Taylor tool life: T = (C/Vc)^(1/n) in minutes */
  private taylorLife(vc: number, isoGroup: string, toolMaterial: string): number {
    const C = TAYLOR_C[isoGroup]?.[toolMaterial] ?? 350;
    const n = TAYLOR_N[toolMaterial] ?? 0.25;

    if (vc <= 0) return 60; // fallback

    // T = (C / Vc)^(1/n)
    const ratio = C / vc;
    if (ratio <= 0) return 1;

    const T = Math.pow(ratio, 1 / n);

    // Clamp to reasonable range: 1 min to 480 min (8 hours)
    return Math.max(1, Math.min(480, T));
  }

  // ── Cycle Time Estimation ─────────────────────────────────────

  /** Rough cycle time estimate (minutes) for a single feature pass */
  private estimateCycleTime(
    feature: FeatureSpec, material: MaterialSpec, toolDia: number
  ): number {
    const depth = feature.dimensions.depth_mm ?? 10;
    const length = feature.dimensions.length_mm ?? feature.dimensions.width_mm ?? toolDia;

    // Feed rate estimate: ~0.1 mm/tooth, 4 flutes, Vc-based RPM
    const vc = DEFAULT_VC[material.iso_group]?.carbide ?? 200;
    const rpm = Math.min(
      (vc * 1000) / (Math.PI * toolDia),
      10000 // practical cap
    );
    const fz = 0.1; // mm/tooth
    const z = 4;     // flutes
    const vf = rpm * fz * z; // mm/min feed rate

    // Axial passes
    const ae = toolDia * 0.5; // radial engagement
    const ap = toolDia * 0.8; // axial depth of cut
    const axialPasses = Math.max(1, Math.ceil(depth / ap));
    const radialPasses = feature.type === "pocket"
      ? Math.max(1, Math.ceil(length / ae))
      : 1;

    const cutLength = length * axialPasses * radialPasses;
    const cutTime = vf > 0 ? cutLength / vf : 1;

    // Add 15% for rapids, tool changes, positioning
    return Math.max(0.1, cutTime * 1.15);
  }

  // ── Inventory Search ──────────────────────────────────────────

  private findBestFromInventory(
    inventory: ToolInventoryItem[],
    feature: FeatureSpec,
    material: MaterialSpec,
    targetDia: number,
    cycleTime: number,
    machineRate: number,
    warnings: string[],
  ): ToolRecommendation | null {
    // Filter to active, fitting tools
    const candidates = inventory.filter(t =>
      t.condition !== "retired"
      && this.toolTypeMatchesFeature(t.type, feature.type)
      && t.diameter_mm <= targetDia * 1.05
      && t.diameter_mm >= targetDia * 0.3
    );

    if (candidates.length === 0) {
      warnings.push("No suitable tools found in user inventory");
      return null;
    }

    // Score each candidate by cost-per-part
    let best: ToolInventoryItem | null = null;
    let bestCpp = Infinity;
    let bestLife = 0;

    for (const tool of candidates) {
      const condFactor = CONDITION_DERATE[tool.condition] ?? 0.85;
      const vc = (DEFAULT_VC[material.iso_group]?.[tool.material] ?? 200);
      const life = this.taylorLife(vc, material.iso_group, tool.material) * condFactor;
      const partsPerTool = Math.max(1, Math.floor(life / cycleTime));
      const toolCpp = tool.price / partsPerTool;
      const machCpp = cycleTime * machineRate / 60;
      const totalCpp = toolCpp + machCpp;

      if (totalCpp < bestCpp) {
        bestCpp = totalCpp;
        best = tool;
        bestLife = life;
      }
    }

    if (!best) return null;

    const partsPerTool = Math.max(1, Math.floor(bestLife / cycleTime));

    return {
      tool: {
        id: best.id,
        name: best.name,
        diameter_mm: best.diameter_mm,
        material: best.material,
        coating: best.coating ?? "none",
        price: best.price,
      },
      cost_per_part: av(r3(bestCpp), "$/part", 0.02,
        `$${r2(best.price)} / ${partsPerTool} parts + $${r2(cycleTime * machineRate / 60)} machining`),
      rationale: `Best from inventory: ${best.name} (${best.condition}), ` +
        `${partsPerTool} parts/tool, $${r3(bestCpp)}/part total`,
    };
  }

  // ── Catalog Evaluation ────────────────────────────────────────

  private evaluateCatalogTool(
    archetype: CatalogArchetype,
    targetDia: number,
    material: MaterialSpec,
    cycleTime: number,
    machineRate: number,
    tier: string,
  ): ToolRecommendation {
    // Scale price by diameter
    const priceFactor = Math.max(1, targetDia / 12);
    const price = r2(archetype.price * priceFactor);

    // Adjusted cutting speed and tool life
    const baseVc = DEFAULT_VC[material.iso_group]?.[archetype.material] ?? 200;
    const vc = baseVc * archetype.vc_factor;
    const baseLife = this.taylorLife(vc, material.iso_group, archetype.material);
    const life = baseLife * archetype.life_factor;

    // Adjust cycle time for speed differences (faster Vc = shorter cycle)
    const adjustedCycle = cycleTime / archetype.vc_factor;

    const partsPerTool = Math.max(1, Math.floor(life / adjustedCycle));
    const toolCpp = price / partsPerTool;
    const machCpp = adjustedCycle * machineRate / 60;
    const totalCpp = toolCpp + machCpp;

    const tierLabel = tier === "budget" ? "Budget" : tier === "standard" ? "Standard" : "Premium";

    return {
      tool: {
        id: `${archetype.id}-${r0(targetDia)}`,
        name: `${archetype.name} ${r1(targetDia)}mm`,
        diameter_mm: targetDia,
        material: archetype.material,
        coating: archetype.coating,
        price,
      },
      cost_per_part: av(r3(totalCpp), "$/part", 0.02,
        `${tierLabel}: $${r2(price)} / ${partsPerTool} parts + $${r2(machCpp)} machining`),
      rationale: `${tierLabel}: ${archetype.name}, ${r0(life)}min life, ` +
        `${partsPerTool} parts/tool, $${r3(totalCpp)}/part total`,
    };
  }

  // ── Validation ────────────────────────────────────────────────

  private validateBudget(
    budgetRec: ToolRecommendation, input: ToolROIInput,
    targetDia: number, warnings: string[]
  ): void {
    // Check minimum 15min tool life
    const tiers = CATALOG_TIERS[this.featureToToolType(input.feature.type)] ?? CATALOG_TIERS.endmill;
    const baseVc = DEFAULT_VC[input.material.iso_group]?.[tiers.budget.material] ?? 200;
    const vc = baseVc * tiers.budget.vc_factor;
    const life = this.taylorLife(vc, input.material.iso_group, tiers.budget.material) * tiers.budget.life_factor;

    if (life < 15) {
      warnings.push(
        `Budget tool life only ${r1(life)}min — below 15min minimum; ` +
        "consider standard tier"
      );
    }

    // Check deflection vs tolerance (simplified beam model)
    // Deflection ~ F * L^3 / (3 * E * I), I = pi/64 * d^4
    const depth = input.feature.dimensions.depth_mm ?? 10;
    const overhang = depth * 1.5; // typical stick-out
    const E = 600000; // carbide Young's modulus (N/mm^2)
    const I = (Math.PI / 64) * Math.pow(targetDia, 4);
    const F = (input.material.kc1_1 ?? 2000) * 0.5 * 0.1; // rough cutting force
    const deflection = (F * Math.pow(overhang, 3)) / (3 * E * I);

    if (deflection > input.feature.tolerance_mm) {
      warnings.push(
        `Budget tool deflection ${r3(deflection)}mm exceeds tolerance ${input.feature.tolerance_mm}mm — ` +
        "use larger diameter or stiffer tool"
      );
    }
  }

  // ── Best Selection ────────────────────────────────────────────

  private selectBest(
    goal: "cost" | "performance" | "balanced",
    crib: ToolRecommendation | null,
    budget: ToolRecommendation,
    standard: ToolRecommendation,
    premium: ToolRecommendation,
  ): ToolRecommendation {
    const options = [budget, standard, premium];
    if (crib) options.push(crib);

    switch (goal) {
      case "cost":
        // Lowest cost per part
        return options.reduce((a, b) =>
          a.cost_per_part.value <= b.cost_per_part.value ? a : b);
      case "performance":
        // Premium always wins on performance
        return premium;
      case "balanced":
      default:
        // Standard is the balanced choice, unless crib beats it
        if (crib && crib.cost_per_part.value < standard.cost_per_part.value * 0.9) {
          return crib;
        }
        return standard;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private featureToToolType(featureType: string): string {
    switch (featureType) {
      case "hole": case "drill": return "drill";
      case "thread": return "tap";
      case "bore": return "boring_bar";
      case "face": return "face_mill";
      default: return "endmill";
    }
  }

  private toolTypeMatchesFeature(
    toolType: string, featureType: string
  ): boolean {
    const expected = this.featureToToolType(featureType);
    if (toolType === expected) return true;
    // Endmills are versatile
    if (toolType === "endmill" && ["pocket", "slot", "contour", "face", "chamfer", "hole"].includes(featureType)) return true;
    return false;
  }
}

// ── Rounding & AtomicValue Helpers ──────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const toolROIEngine = new ToolROIEngine();
