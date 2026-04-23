/**
 * AdditiveQuoteEngine — 3D printing / additive manufacturing quoting.
 *
 * Supports FDM, SLA, SLS, MJF, and DMLS technologies with material-specific
 * pricing, build time estimation, post-processing costs, and support structure
 * calculations. Opens the fastest-growing manufacturing segment.
 *
 * @module AdditiveQuoteEngine
 */

// ─── Types ───────────────────────────────────────────────────

export interface AdditiveInput {
  part_name?: string;
  quantity: number;

  // Part geometry
  bounding_box_mm: { x: number; y: number; z: number };
  part_volume_cm3: number;
  surface_area_cm2?: number;

  // Technology
  technology: "fdm" | "sla" | "sls" | "mjf" | "dmls";
  material: string;

  // Options
  layer_height_mm?: number;
  infill_pct?: number;          // FDM only, 0-100
  support_volume_pct?: number;  // estimated support as % of part vol
  orientation?: "optimal" | "xy_flat" | "z_tall";
  post_process?: string[];      // "support_removal" | "sanding" | "vapor_smooth" | "heat_treat" | "machining" | "painting" | "dyeing"
  tolerance_mm?: number;
  surface_finish?: "as_printed" | "sanded" | "polished" | "machined";

  // Pricing
  rush?: boolean;
  customer_tier?: "A" | "B" | "C" | "new";
  /** @internal Used to prevent recursive price-break calculation */
  _skipBreaks?: boolean;
}

export interface AdditiveQuoteResult {
  quote_id: string;
  part_name: string;
  quantity: number;
  technology: string;
  material: string;
  costs: {
    material: { volume_cm3: number; support_cm3: number; price_per_cm3: number; total: number };
    machine_time: { build_hours: number; rate_hr: number; total: number };
    setup: { prep_hours: number; total: number };
    post_processing: { operations: Array<{ type: string; cost: number }>; total: number };
    inspection: { total: number };
    overhead_pct: number;
    overhead: number;
    total_cost: number;
    cost_per_part: number;
  };
  pricing: {
    unit_price: number;
    total_price: number;
    margin_pct: number;
  };
  lead_time: {
    print_days: number;
    post_process_days: number;
    total_standard_days: number;
    total_rush_days: number;
  };
  build_info: {
    layer_height_mm: number;
    num_layers: number;
    estimated_support_pct: number;
    build_height_mm: number;
    parts_per_build: number;
  };
  dfm_warnings: string[];
  price_breaks: Array<{ qty: number; unit_price: number; total: number }>;
}

// ─── Technology Databases ────────────────────────────────────

interface TechProfile {
  default_layer_mm: number;
  build_speed_cm3_hr: number;     // volumetric deposition rate
  machine_rate_hr: number;
  setup_hours: number;
  max_build_mm: { x: number; y: number; z: number };
  min_wall_mm: number;
  tolerance_mm: number;
  surface_ra_um: number;
}

const TECH_PROFILES: Record<string, TechProfile> = {
  fdm:  { default_layer_mm: 0.2, build_speed_cm3_hr: 15, machine_rate_hr: 8, setup_hours: 0.25,
           max_build_mm: { x: 330, y: 240, z: 300 }, min_wall_mm: 0.8, tolerance_mm: 0.3, surface_ra_um: 15 },
  sla:  { default_layer_mm: 0.05, build_speed_cm3_hr: 8, machine_rate_hr: 20, setup_hours: 0.5,
           max_build_mm: { x: 335, y: 200, z: 300 }, min_wall_mm: 0.4, tolerance_mm: 0.1, surface_ra_um: 3 },
  sls:  { default_layer_mm: 0.1, build_speed_cm3_hr: 25, machine_rate_hr: 40, setup_hours: 1.0,
           max_build_mm: { x: 340, y: 340, z: 600 }, min_wall_mm: 0.7, tolerance_mm: 0.2, surface_ra_um: 10 },
  mjf:  { default_layer_mm: 0.08, build_speed_cm3_hr: 35, machine_rate_hr: 45, setup_hours: 1.0,
           max_build_mm: { x: 380, y: 284, z: 380 }, min_wall_mm: 0.5, tolerance_mm: 0.15, surface_ra_um: 8 },
  dmls: { default_layer_mm: 0.03, build_speed_cm3_hr: 5, machine_rate_hr: 135, setup_hours: 2.0,
           max_build_mm: { x: 250, y: 250, z: 325 }, min_wall_mm: 0.4, tolerance_mm: 0.05, surface_ra_um: 6 },
};

interface AdditiveMaterial {
  price_per_cm3: number;
  density_g_cm3: number;
  technologies: string[];
}

const ADDITIVE_MATERIALS: Record<string, AdditiveMaterial> = {
  // FDM
  pla:      { price_per_cm3: 0.05, density_g_cm3: 1.24, technologies: ["fdm"] },
  abs:      { price_per_cm3: 0.06, density_g_cm3: 1.04, technologies: ["fdm"] },
  petg:     { price_per_cm3: 0.07, density_g_cm3: 1.27, technologies: ["fdm"] },
  asa:      { price_per_cm3: 0.08, density_g_cm3: 1.07, technologies: ["fdm"] },
  nylon_fdm: { price_per_cm3: 0.12, density_g_cm3: 1.14, technologies: ["fdm"] },
  pc:       { price_per_cm3: 0.10, density_g_cm3: 1.20, technologies: ["fdm"] },
  cf_nylon: { price_per_cm3: 0.25, density_g_cm3: 1.18, technologies: ["fdm"] },
  ultem:    { price_per_cm3: 0.85, density_g_cm3: 1.27, technologies: ["fdm"] },
  // SLA
  standard_resin: { price_per_cm3: 0.12, density_g_cm3: 1.18, technologies: ["sla"] },
  tough_resin:    { price_per_cm3: 0.18, density_g_cm3: 1.15, technologies: ["sla"] },
  flexible_resin: { price_per_cm3: 0.20, density_g_cm3: 1.10, technologies: ["sla"] },
  dental_resin:   { price_per_cm3: 0.35, density_g_cm3: 1.30, technologies: ["sla"] },
  castable_resin: { price_per_cm3: 0.30, density_g_cm3: 1.10, technologies: ["sla"] },
  // SLS / MJF
  nylon_pa12: { price_per_cm3: 0.15, density_g_cm3: 1.01, technologies: ["sls", "mjf"] },
  nylon_pa11: { price_per_cm3: 0.18, density_g_cm3: 1.03, technologies: ["sls", "mjf"] },
  tpu:        { price_per_cm3: 0.22, density_g_cm3: 1.12, technologies: ["sls", "mjf"] },
  glass_nylon: { price_per_cm3: 0.25, density_g_cm3: 1.22, technologies: ["sls", "mjf"] },
  // DMLS
  stainless_316l: { price_per_cm3: 1.20, density_g_cm3: 7.99, technologies: ["dmls"] },
  ti64:           { price_per_cm3: 3.50, density_g_cm3: 4.43, technologies: ["dmls"] },
  inconel_625:    { price_per_cm3: 4.00, density_g_cm3: 8.44, technologies: ["dmls"] },
  aluminum_alsi10mg: { price_per_cm3: 1.80, density_g_cm3: 2.67, technologies: ["dmls"] },
  maraging_steel: { price_per_cm3: 2.20, density_g_cm3: 8.10, technologies: ["dmls"] },
  cobalt_chrome:  { price_per_cm3: 5.00, density_g_cm3: 8.30, technologies: ["dmls"] },
};

const POST_PROCESS_COSTS: Record<string, number> = {
  support_removal: 15,  // per part, labor
  sanding: 10,
  vapor_smooth: 8,
  heat_treat: 25,
  machining: 50,       // per part, CNC finishing
  painting: 12,
  dyeing: 5,
  media_blast: 6,
  tumble: 4,
};

// ─── Engine ──────────────────────────────────────────────────

let _amSeq = 1;

class AdditiveQuoteEngine {
  /**
   * Generate a complete additive manufacturing quote.
   */
  quote(input: AdditiveInput): AdditiveQuoteResult {
    const warnings: string[] = [];
    const tech = TECH_PROFILES[input.technology];
    if (!tech) throw new Error(`Unknown technology: ${input.technology}`);

    const mat = ADDITIVE_MATERIALS[input.material];
    if (!mat) {
      warnings.push(`Unknown material "${input.material}", using PLA pricing`);
    }
    const m = mat ?? ADDITIVE_MATERIALS.pla;
    const qty = Math.max(1, input.quantity);

    // Validate material-technology compatibility
    if (mat && !mat.technologies.includes(input.technology)) {
      warnings.push(
        `Material "${input.material}" not typically used with ${input.technology}. ` +
        `Compatible technologies: ${mat.technologies.join(", ")}`
      );
    }

    // ── 1. Build geometry ──
    const bb = input.bounding_box_mm;
    const buildHeight = input.orientation === "z_tall"
      ? Math.max(bb.x, bb.y, bb.z)
      : Math.min(bb.x, bb.y, bb.z);
    const layerH = input.layer_height_mm ?? tech.default_layer_mm;
    const numLayers = Math.ceil(buildHeight / layerH);

    // Support estimation
    const supportPct = input.support_volume_pct
      ?? (input.technology === "sls" || input.technology === "mjf" ? 0 : 15);
    const supportVol = input.part_volume_cm3 * supportPct / 100;

    // Parts per build (nesting)
    const buildVol = tech.max_build_mm.x * tech.max_build_mm.y * tech.max_build_mm.z / 1000;
    const partBuildVol = bb.x * bb.y * bb.z / 1000;
    const partsPerBuild = Math.max(1, Math.floor(buildVol / (partBuildVol * 1.3))); // 30% spacing

    // ── 2. Material Cost ──
    const totalPartVol = input.part_volume_cm3 * qty;
    const totalSupportVol = supportVol * qty;
    const infillFactor = input.technology === "fdm"
      ? (input.infill_pct ?? 20) / 100
      : 1.0;
    const effectiveVol = totalPartVol * infillFactor + totalSupportVol;
    const materialTotal = round2(effectiveVol * m.price_per_cm3);

    // ── 3. Machine Time ──
    const effectivePartVol = input.part_volume_cm3 * infillFactor + supportVol;
    const buildHoursPerPart = effectivePartVol / tech.build_speed_cm3_hr;
    // Batch efficiency: multiple parts per build
    const builds = Math.ceil(qty / partsPerBuild);
    const totalBuildHours = buildHoursPerPart * qty; // simplified (actual nesting is complex)
    const machineTotal = round2(totalBuildHours * tech.machine_rate_hr);

    // ── 4. Setup ──
    const setupTotal = round2(tech.setup_hours * builds * 45); // $45/hr labor

    // ── 5. Post-Processing ──
    const postOps = input.post_process ?? this.defaultPostProcess(input.technology);
    const postItems = postOps.map(op => ({
      type: op,
      cost: round2((POST_PROCESS_COSTS[op] ?? 10) * qty),
    }));
    const postTotal = postItems.reduce((s, p) => s + p.cost, 0);

    // ── 6. Inspection ──
    const inspTotal = round2(qty * 1.50 + (input.tolerance_mm && input.tolerance_mm < 0.1 ? 50 : 0));

    // ── 7. Overhead ──
    const overheadPct = 10;
    const directCost = materialTotal + machineTotal + setupTotal + postTotal + inspTotal;
    const overhead = round2(directCost * overheadPct / 100);
    const totalCost = round2(directCost + overhead);
    const costPerPart = round2(totalCost / qty);

    // ── 8. Pricing ──
    const margin = this.getMargin(input.customer_tier);
    let unitPrice = round2(costPerPart / (1 - margin / 100));
    if (input.rush) unitPrice = round2(unitPrice * 1.35);
    if (qty >= 50) unitPrice = round2(unitPrice * 0.93);
    else if (qty >= 20) unitPrice = round2(unitPrice * 0.96);
    unitPrice = this.roundPrice(unitPrice);

    // ── 9. Lead Time ──
    const printDays = Math.ceil(builds * buildHoursPerPart * partsPerBuild / 20); // 20 hr/day
    const postDays = postOps.includes("heat_treat") ? 3
      : postOps.includes("machining") ? 2
      : postOps.length > 0 ? 1 : 0;
    const totalDays = Math.max(2, printDays + postDays + 1);

    // ── 10. Warnings ──
    this.generateWarnings(input, tech, warnings);

    // ── 11. Price Breaks ──
    const priceBreaks: AdditiveQuoteResult["price_breaks"] = [];
    if (!input._skipBreaks) {
      const breakQtys = [1, 5, 10, 25, 50, 100].filter(q => q !== qty);
      for (const q of breakQtys) {
        const bResult = this.quote({ ...input, quantity: q, _skipBreaks: true });
        priceBreaks.push({
          qty: q,
          unit_price: bResult.pricing.unit_price,
          total: round2(bResult.pricing.unit_price * q),
        });
      }
    }

    return {
      quote_id: `AM${new Date().getFullYear().toString().slice(-2)}-${String(_amSeq++).padStart(5, "0")}`,
      part_name: input.part_name ?? "3D Printed Part",
      quantity: qty,
      technology: input.technology.toUpperCase(),
      material: input.material,
      costs: {
        material: {
          volume_cm3: round2(totalPartVol * infillFactor),
          support_cm3: round2(totalSupportVol),
          price_per_cm3: m.price_per_cm3,
          total: materialTotal,
        },
        machine_time: {
          build_hours: round2(totalBuildHours),
          rate_hr: tech.machine_rate_hr,
          total: machineTotal,
        },
        setup: { prep_hours: round2(tech.setup_hours * builds), total: setupTotal },
        post_processing: { operations: postItems, total: postTotal },
        inspection: { total: inspTotal },
        overhead_pct: overheadPct,
        overhead,
        total_cost: totalCost,
        cost_per_part: costPerPart,
      },
      pricing: {
        unit_price: unitPrice,
        total_price: round2(unitPrice * qty),
        margin_pct: round2(((unitPrice - costPerPart) / unitPrice) * 100),
      },
      lead_time: {
        print_days: printDays,
        post_process_days: postDays,
        total_standard_days: totalDays,
        total_rush_days: Math.max(1, Math.ceil(totalDays * 0.5)),
      },
      build_info: {
        layer_height_mm: layerH,
        num_layers: numLayers,
        estimated_support_pct: supportPct,
        build_height_mm: buildHeight,
        parts_per_build: Math.min(partsPerBuild, qty),
      },
      dfm_warnings: warnings,
      price_breaks: priceBreaks,
    };
  }

  /**
   * List available materials for a technology.
   */
  listMaterials(technology: string): Array<{ id: string; price_per_cm3: number; density: number }> {
    return Object.entries(ADDITIVE_MATERIALS)
      .filter(([, m]) => m.technologies.includes(technology))
      .map(([id, m]) => ({ id, price_per_cm3: m.price_per_cm3, density: m.density_g_cm3 }));
  }

  /**
   * Compare technologies for the same part.
   */
  compareTechnologies(
    baseInput: Omit<AdditiveInput, "technology" | "material">,
    options: Array<{ technology: AdditiveInput["technology"]; material: string }>,
  ): Array<{ technology: string; material: string; unit_price: number; lead_days: number; warnings: string[] }> {
    return options.map(opt => {
      const result = this.quote({ ...baseInput, ...opt } as AdditiveInput);
      return {
        technology: opt.technology,
        material: opt.material,
        unit_price: result.pricing.unit_price,
        lead_days: result.lead_time.total_standard_days,
        warnings: result.dfm_warnings,
      };
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private defaultPostProcess(tech: string): string[] {
    switch (tech) {
      case "fdm": return ["support_removal"];
      case "sla": return ["support_removal", "sanding"];
      case "sls": return ["media_blast"];
      case "mjf": return ["media_blast"];
      case "dmls": return ["support_removal", "heat_treat", "media_blast"];
      default: return [];
    }
  }

  private getMargin(tier?: string): number {
    const margins: Record<string, number> = { A: 30, B: 35, C: 40, new: 38 };
    return margins[tier ?? "B"] ?? 35;
  }

  private roundPrice(price: number): number {
    if (price < 5) return Math.ceil(price * 100) / 100;
    if (price < 50) return Math.ceil(price * 10) / 10;
    if (price < 500) return Math.ceil(price / 5) * 5;
    return Math.ceil(price / 10) * 10;
  }

  private generateWarnings(input: AdditiveInput, tech: TechProfile, warnings: string[]): void {
    const bb = input.bounding_box_mm;

    // Build volume check
    if (bb.x > tech.max_build_mm.x || bb.y > tech.max_build_mm.y || bb.z > tech.max_build_mm.z) {
      warnings.push(
        `Part exceeds build volume (${bb.x}×${bb.y}×${bb.z}mm vs ` +
        `${tech.max_build_mm.x}×${tech.max_build_mm.y}×${tech.max_build_mm.z}mm) — ` +
        `requires splitting or larger machine`
      );
    }

    // Wall thickness
    if (input.tolerance_mm && input.tolerance_mm < tech.tolerance_mm) {
      warnings.push(
        `Requested tolerance ${input.tolerance_mm}mm < ${input.technology.toUpperCase()} capability ` +
        `${tech.tolerance_mm}mm — post-machining required`
      );
    }

    // Technology-specific
    if (input.technology === "fdm" && input.surface_finish === "polished") {
      warnings.push("FDM parts require extensive post-processing for polished finish — consider SLA");
    }
    if (input.technology === "dmls" && input.part_volume_cm3 > 500) {
      warnings.push("Large DMLS parts are very expensive — consider casting or CNC for volumes > 500cm3");
    }
    if (input.technology === "sla" && input.quantity > 50) {
      warnings.push("SLA is slow for production quantities — consider MJF or SLS for qty > 50");
    }
    if ((input.support_volume_pct ?? 0) > 40) {
      warnings.push("High support volume (>40%) — reorient part or redesign overhangs to reduce cost");
    }
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const additiveQuoteEngine = new AdditiveQuoteEngine();
export { AdditiveQuoteEngine };
