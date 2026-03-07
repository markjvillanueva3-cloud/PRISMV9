/**
 * CastingQuoteEngine — Casting Process Cost Estimator
 *
 * Covers 3 major casting processes:
 * - Die Casting (HPDC): high-volume aluminum/zinc/magnesium
 * - Investment Casting (lost wax): aerospace/medical precision parts
 * - Sand Casting: large parts, low-volume, ferrous and non-ferrous
 *
 * Estimates: tooling cost, per-part cost, lead time, DfM warnings.
 *
 * @engine CastingQuoteEngine
 * @dispatcher businessDispatcher
 * @actions casting_quote, casting_materials, casting_compare_processes, casting_dfm
 */

// ── Die casting: tooling + per-part ──
interface DieCastTooling {
  base_usd: number;
  life_shots: number;
  lead_weeks: number;
  cavity_mult: number;     // cost multiplier per additional cavity
}

const DIE_CAST_TOOLING: Record<string, DieCastTooling> = {
  small:  { base_usd: 8_000,  life_shots: 100_000, lead_weeks: 8,  cavity_mult: 0.55 },
  medium: { base_usd: 25_000, life_shots: 200_000, lead_weeks: 12, cavity_mult: 0.50 },
  large:  { base_usd: 60_000, life_shots: 300_000, lead_weeks: 16, cavity_mult: 0.45 },
  xlarge: { base_usd: 120_000, life_shots: 500_000, lead_weeks: 20, cavity_mult: 0.40 },
};

// ── Investment casting: shell + wax ──
interface InvestmentTooling {
  wax_die_usd: number;
  lead_weeks: number;
  pattern_cost_each: number;  // per-part wax pattern cost
}

const INVESTMENT_TOOLING: Record<string, InvestmentTooling> = {
  small:  { wax_die_usd: 3_000,  lead_weeks: 6,  pattern_cost_each: 2.50 },
  medium: { wax_die_usd: 8_000,  lead_weeks: 10, pattern_cost_each: 8.00 },
  large:  { wax_die_usd: 18_000, lead_weeks: 14, pattern_cost_each: 20.00 },
  xlarge: { wax_die_usd: 35_000, lead_weeks: 18, pattern_cost_each: 45.00 },
};

// ── Sand casting: pattern + core ──
interface SandTooling {
  pattern_usd: number;
  lead_weeks: number;
  core_box_usd: number;      // per core box
}

const SAND_TOOLING: Record<string, SandTooling> = {
  small:  { pattern_usd: 1_500,  lead_weeks: 4,  core_box_usd: 800 },
  medium: { pattern_usd: 4_000,  lead_weeks: 6,  core_box_usd: 2_000 },
  large:  { pattern_usd: 10_000, lead_weeks: 8,  core_box_usd: 4_000 },
  xlarge: { pattern_usd: 25_000, lead_weeks: 12, core_box_usd: 8_000 },
};

// ── Material properties ──
interface CastMaterial {
  name: string;
  density_g_cm3: number;
  price_per_kg: number;
  processes: Array<"die_cast" | "investment" | "sand">;
  pour_temp_c: number;
  shrinkage_pct: number;
  min_wall_mm: number;
  tolerance_mm_per_25mm: number;     // typical as-cast tolerance
  machinability: number;              // 0-1, higher = easier secondary machining
}

const CAST_MATERIALS: Record<string, CastMaterial> = {
  aluminum_a380: {
    name: "A380 (Die Cast Al)", density_g_cm3: 2.71, price_per_kg: 4.50,
    processes: ["die_cast"], pour_temp_c: 620, shrinkage_pct: 0.6,
    min_wall_mm: 1.0, tolerance_mm_per_25mm: 0.10, machinability: 0.7,
  },
  aluminum_a356: {
    name: "A356-T6 (Investment/Sand)", density_g_cm3: 2.68, price_per_kg: 5.50,
    processes: ["investment", "sand"], pour_temp_c: 620, shrinkage_pct: 1.2,
    min_wall_mm: 2.5, tolerance_mm_per_25mm: 0.25, machinability: 0.8,
  },
  aluminum_a413: {
    name: "A413 (Die Cast)", density_g_cm3: 2.66, price_per_kg: 4.80,
    processes: ["die_cast"], pour_temp_c: 580, shrinkage_pct: 0.5,
    min_wall_mm: 0.8, tolerance_mm_per_25mm: 0.10, machinability: 0.6,
  },
  zinc_zamak3: {
    name: "Zamak 3 (Zinc Die Cast)", density_g_cm3: 6.60, price_per_kg: 3.50,
    processes: ["die_cast"], pour_temp_c: 400, shrinkage_pct: 0.7,
    min_wall_mm: 0.6, tolerance_mm_per_25mm: 0.05, machinability: 0.9,
  },
  zinc_zamak5: {
    name: "Zamak 5", density_g_cm3: 6.60, price_per_kg: 3.70,
    processes: ["die_cast"], pour_temp_c: 400, shrinkage_pct: 0.7,
    min_wall_mm: 0.6, tolerance_mm_per_25mm: 0.05, machinability: 0.9,
  },
  magnesium_az91d: {
    name: "AZ91D (Mg Die Cast)", density_g_cm3: 1.81, price_per_kg: 8.00,
    processes: ["die_cast"], pour_temp_c: 650, shrinkage_pct: 0.5,
    min_wall_mm: 1.2, tolerance_mm_per_25mm: 0.10, machinability: 0.8,
  },
  steel_8620: {
    name: "8620 (Investment Cast)", density_g_cm3: 7.85, price_per_kg: 6.00,
    processes: ["investment", "sand"], pour_temp_c: 1600, shrinkage_pct: 2.0,
    min_wall_mm: 3.0, tolerance_mm_per_25mm: 0.40, machinability: 0.5,
  },
  steel_17_4ph: {
    name: "17-4 PH (Investment Cast)", density_g_cm3: 7.80, price_per_kg: 14.00,
    processes: ["investment"], pour_temp_c: 1580, shrinkage_pct: 2.0,
    min_wall_mm: 2.0, tolerance_mm_per_25mm: 0.25, machinability: 0.4,
  },
  stainless_cf8m: {
    name: "CF8M/316 (Investment/Sand)", density_g_cm3: 7.90, price_per_kg: 10.00,
    processes: ["investment", "sand"], pour_temp_c: 1600, shrinkage_pct: 2.5,
    min_wall_mm: 2.5, tolerance_mm_per_25mm: 0.30, machinability: 0.4,
  },
  gray_iron_30: {
    name: "Gray Iron Class 30", density_g_cm3: 7.15, price_per_kg: 2.00,
    processes: ["sand"], pour_temp_c: 1400, shrinkage_pct: 1.0,
    min_wall_mm: 4.0, tolerance_mm_per_25mm: 0.50, machinability: 0.9,
  },
  ductile_iron_65: {
    name: "Ductile Iron 65-45-12", density_g_cm3: 7.10, price_per_kg: 2.50,
    processes: ["sand"], pour_temp_c: 1400, shrinkage_pct: 1.5,
    min_wall_mm: 4.0, tolerance_mm_per_25mm: 0.50, machinability: 0.7,
  },
  bronze_c95800: {
    name: "C95800 Nickel Aluminum Bronze", density_g_cm3: 7.64, price_per_kg: 12.00,
    processes: ["investment", "sand"], pour_temp_c: 1230, shrinkage_pct: 1.8,
    min_wall_mm: 3.0, tolerance_mm_per_25mm: 0.35, machinability: 0.5,
  },
  inconel_713c: {
    name: "Inconel 713C (Investment)", density_g_cm3: 7.91, price_per_kg: 60.00,
    processes: ["investment"], pour_temp_c: 1400, shrinkage_pct: 2.0,
    min_wall_mm: 1.5, tolerance_mm_per_25mm: 0.20, machinability: 0.2,
  },
  titanium_ti6al4v: {
    name: "Ti-6Al-4V (Investment)", density_g_cm3: 4.43, price_per_kg: 80.00,
    processes: ["investment"], pour_temp_c: 1670, shrinkage_pct: 2.0,
    min_wall_mm: 2.0, tolerance_mm_per_25mm: 0.25, machinability: 0.3,
  },
};

export interface CastingQuoteInput {
  process: "die_cast" | "investment" | "sand";
  material: string;
  part_volume_cm3: number;
  bounding_box_cm3?: number;       // for complexity estimation
  quantity: number;
  annual_volume?: number;
  num_cores?: number;               // internal cavities
  num_slides?: number;              // die cast side actions
  surface_finish?: "as_cast" | "machined" | "polished" | "plated" | "painted";
  secondary_machining?: boolean;    // post-cast CNC work
  xray_inspection?: boolean;        // radiographic NDT
  heat_treat?: boolean;
  tight_tolerance?: boolean;        // tighter than standard as-cast
  markup_pct?: number;
}

export interface CastingQuoteResult {
  process: string;
  tooling_cost_usd: number;
  tooling_lead_weeks: number;
  tooling_life: number | string;
  per_part: {
    material_cost: number;
    process_cost: number;
    finishing_cost: number;
    inspection_cost: number;
    secondary_machining_cost: number;
    total_unit_cost: number;
  };
  amortized_tooling: number;
  price_per_part: number;
  total_price: number;
  margin_pct: number;
  part_weight_kg: number;
  dfm_warnings: string[];
  price_breaks?: Array<{ qty: number; price_per_part: number }>;
}

export class CastingQuoteEngine {
  quote(input: CastingQuoteInput): CastingQuoteResult {
    const mat = CAST_MATERIALS[input.material];
    if (!mat) throw new Error(`Unknown casting material: ${input.material}`);
    if (!mat.processes.includes(input.process)) {
      throw new Error(`${mat.name} not available for ${input.process}. Use: ${mat.processes.join(", ")}`);
    }

    const markup = (input.markup_pct ?? 25) / 100;
    const dfm: string[] = [];
    const partWeight = (input.part_volume_cm3 * mat.density_g_cm3) / 1000; // kg

    // ── Size class ──
    const vol = input.part_volume_cm3;
    const sizeClass = vol <= 50 ? "small" : vol <= 500 ? "medium" : vol <= 3000 ? "large" : "xlarge";

    // ── Tooling ──
    let toolingCost = 0;
    let toolingLead = 0;
    let toolingLife: number | string = 0;

    if (input.process === "die_cast") {
      const t = DIE_CAST_TOOLING[sizeClass];
      toolingCost = t.base_usd;
      toolingLead = t.lead_weeks;
      toolingLife = t.life_shots;
      if (input.num_slides) toolingCost += input.num_slides * 4000;
      if (input.num_cores) toolingCost += input.num_cores * 3000;
    } else if (input.process === "investment") {
      const t = INVESTMENT_TOOLING[sizeClass];
      toolingCost = t.wax_die_usd;
      toolingLead = t.lead_weeks;
      toolingLife = "unlimited (wax die)";
    } else {
      const t = SAND_TOOLING[sizeClass];
      toolingCost = t.pattern_usd;
      if (input.num_cores) toolingCost += input.num_cores * t.core_box_usd;
      toolingLead = t.lead_weeks;
      toolingLife = "unlimited (pattern)";
    }

    // ── Per-part material ──
    const scrapFactor = input.process === "die_cast" ? 1.05 : input.process === "investment" ? 1.15 : 1.25;
    const materialCost = partWeight * scrapFactor * mat.price_per_kg;

    // ── Process cost ──
    let processCost = 0;
    if (input.process === "die_cast") {
      // Machine rate $80-150/hr, 30-120 shots/hr depending on size
      const shotsPerHr = sizeClass === "small" ? 100 : sizeClass === "medium" ? 60 : sizeClass === "large" ? 30 : 15;
      const machineRate = sizeClass === "small" ? 80 : sizeClass === "medium" ? 100 : sizeClass === "large" ? 130 : 160;
      processCost = machineRate / shotsPerHr;
    } else if (input.process === "investment") {
      // Shell cost + pattern cost + furnace time
      const t = INVESTMENT_TOOLING[sizeClass];
      const shellCost = partWeight * 15; // ~$15/kg for shell build
      processCost = t.pattern_cost_each + shellCost;
    } else {
      // Sand mold labor + materials
      const moldTime = sizeClass === "small" ? 0.25 : sizeClass === "medium" ? 0.5 : sizeClass === "large" ? 1.0 : 2.0; // hours
      processCost = moldTime * 50; // $50/hr molder rate
    }

    // ── Finishing ──
    let finishCost = 0;
    const finish = input.surface_finish ?? "as_cast";
    if (finish === "machined") finishCost = partWeight * 8;
    else if (finish === "polished") finishCost = partWeight * 15;
    else if (finish === "plated") finishCost = partWeight * 12;
    else if (finish === "painted") finishCost = partWeight * 5;
    if (input.heat_treat) finishCost += partWeight * 4;

    // ── Inspection ──
    let inspCost = 0.50; // base visual
    if (input.xray_inspection) inspCost += partWeight < 1 ? 15 : partWeight < 5 ? 25 : 50;
    if (input.tight_tolerance) inspCost += 2.00;

    // ── Secondary machining ──
    let machCost = 0;
    if (input.secondary_machining) {
      // Rough estimate: $30-80/hr, 0.1-1.0 hr per part depending on size
      const machHrs = sizeClass === "small" ? 0.1 : sizeClass === "medium" ? 0.25 : sizeClass === "large" ? 0.5 : 1.0;
      const machRate = 55 / mat.machinability; // harder = more expensive
      machCost = machHrs * machRate;
    }

    const unitCost = materialCost + processCost + finishCost + inspCost + machCost;
    const amortizedTooling = toolingCost / input.quantity;
    const pricePerPart = (unitCost + amortizedTooling) * (1 + markup);
    const totalPrice = pricePerPart * input.quantity;

    // ── DfM ──
    if (input.process === "die_cast" && partWeight > 15) dfm.push("Part >15kg — verify die cast machine tonnage availability");
    if (input.process === "die_cast" && (input.num_cores ?? 0) > 4) dfm.push("Many cores increase die cost and cycle time significantly");
    if (input.process === "investment" && partWeight > 50) dfm.push("Large investment castings (>50kg) may need structural shell reinforcement");
    if (input.process === "sand" && input.tight_tolerance) dfm.push("Sand casting tolerances are coarse — secondary machining likely needed for tight features");
    if (mat.pour_temp_c > 1500 && input.process === "die_cast") dfm.push(`${mat.name} pour temp ${mat.pour_temp_c}°C too high for die casting`);
    if (input.quantity < 500 && input.process === "die_cast") dfm.push("Die casting tooling expensive for <500 parts — consider investment or sand casting");
    if (input.quantity > 10000 && input.process === "sand") dfm.push("High volume (>10K) — consider die casting for lower per-part cost");

    // ── Price breaks ──
    const breakQtys = [100, 500, 1000, 5000, 10000, 50000].filter(q => q !== input.quantity);
    const priceBreaks = breakQtys.map(qty => {
      const amort = toolingCost / qty;
      return { qty, price_per_part: Math.round((unitCost + amort) * (1 + markup) * 100) / 100 };
    });

    return {
      process: input.process,
      tooling_cost_usd: Math.round(toolingCost),
      tooling_lead_weeks: toolingLead,
      tooling_life: toolingLife,
      per_part: {
        material_cost: Math.round(materialCost * 100) / 100,
        process_cost: Math.round(processCost * 100) / 100,
        finishing_cost: Math.round(finishCost * 100) / 100,
        inspection_cost: Math.round(inspCost * 100) / 100,
        secondary_machining_cost: Math.round(machCost * 100) / 100,
        total_unit_cost: Math.round(unitCost * 100) / 100,
      },
      amortized_tooling: Math.round(amortizedTooling * 100) / 100,
      price_per_part: Math.round(pricePerPart * 100) / 100,
      total_price: Math.round(totalPrice),
      margin_pct: Math.round(markup * 100),
      part_weight_kg: Math.round(partWeight * 1000) / 1000,
      dfm_warnings: dfm,
      price_breaks: priceBreaks.length > 0 ? priceBreaks : undefined,
    };
  }

  /** Compare all 3 casting processes for a given part (where material allows). */
  compareProcesses(input: {
    material: string;
    part_volume_cm3: number;
    quantity: number;
  }): Array<CastingQuoteResult & { recommended: boolean }> {
    const mat = CAST_MATERIALS[input.material];
    if (!mat) throw new Error(`Unknown material: ${input.material}`);

    const results: Array<CastingQuoteResult & { recommended: boolean }> = [];
    for (const proc of mat.processes) {
      const r = this.quote({ process: proc, material: input.material, part_volume_cm3: input.part_volume_cm3, quantity: input.quantity });
      results.push({ ...r, recommended: false });
    }
    results.sort((a, b) => a.price_per_part - b.price_per_part);
    if (results.length > 0) results[0].recommended = true;
    return results;
  }

  /** List all casting materials with process compatibility. */
  listMaterials(): Array<{ key: string; name: string; processes: string[]; price_per_kg: number; min_wall_mm: number }> {
    return Object.entries(CAST_MATERIALS).map(([key, m]) => ({
      key, name: m.name, processes: m.processes,
      price_per_kg: m.price_per_kg, min_wall_mm: m.min_wall_mm,
    }));
  }

  /** DfM analysis for casting. */
  analyzeDfm(input: {
    process: "die_cast" | "investment" | "sand";
    material: string;
    wall_thickness_mm: number;
    draft_angle_deg?: number;
    undercuts?: number;
    max_section_mm?: number;
    cores?: number;
  }): { score: number; warnings: string[]; suggestions: string[] } {
    const mat = CAST_MATERIALS[input.material];
    if (!mat) return { score: 0, warnings: [`Unknown: ${input.material}`], suggestions: [] };

    const w: string[] = [];
    const s: string[] = [];
    let score = 100;

    if (input.wall_thickness_mm < mat.min_wall_mm) {
      w.push(`Wall ${input.wall_thickness_mm}mm < min ${mat.min_wall_mm}mm for ${input.process}`);
      score -= 25;
    }

    const draft = input.draft_angle_deg ?? 0;
    if (input.process === "die_cast" && draft < 1.0) { w.push("Die cast draft < 1° — ejection issues"); score -= 15; }
    if (input.process === "sand" && draft < 3.0) { w.push("Sand casting draft < 3° — pattern pull issues"); score -= 10; }

    if (input.undercuts && input.undercuts > 0 && input.process === "die_cast") {
      w.push(`${input.undercuts} undercuts require side actions — adds $${input.undercuts * 4000} to die cost`);
      score -= input.undercuts * 5;
    }

    if (input.max_section_mm && input.max_section_mm > 50) {
      w.push("Thick section (>50mm) — shrinkage porosity risk, consider coring out");
      score -= 10;
      s.push("Add feed risers or reduce section thickness to <30mm");
    }

    const ratio = input.max_section_mm && input.wall_thickness_mm > 0
      ? input.max_section_mm / input.wall_thickness_mm : 1;
    if (ratio > 4) {
      w.push(`Section ratio ${ratio.toFixed(1)}:1 — hot spots likely at junctions`);
      score -= 10;
      s.push("Maintain uniform wall thickness (ratio < 3:1) to prevent shrinkage defects");
    }

    return { score: Math.max(0, score), warnings: w, suggestions: s };
  }
}

export const castingQuoteEngine = new CastingQuoteEngine();
