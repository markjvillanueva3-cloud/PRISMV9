/**
 * InjectionMoldQuoteEngine — Injection Molding Cost Estimator
 *
 * Estimates tooling (mold) cost + per-part pricing for injection-molded plastic parts.
 * Covers: mold base, cavities, actions/slides, EDM, polishing, hot runners, DfM warnings.
 * Per-part: material, cycle time, machine rate, secondary ops, overhead.
 *
 * @engine InjectionMoldQuoteEngine
 * @dispatcher businessDispatcher
 * @actions injection_mold_quote, injection_mold_materials, injection_mold_dfm
 */

// ── Mold base cost by class ──
const MOLD_CLASS: Record<string, { base_usd: number; life_shots: number; lead_weeks: number; description: string }> = {
  prototype:   { base_usd: 3_500,   life_shots: 500,     lead_weeks: 2,  description: "Aluminum proto mold, 1 cavity" },
  class_105:   { base_usd: 5_000,   life_shots: 500,     lead_weeks: 3,  description: "Prototype, <500 parts" },
  class_104:   { base_usd: 12_000,  life_shots: 100_000, lead_weeks: 6,  description: "Low production, soft steel" },
  class_103:   { base_usd: 25_000,  life_shots: 500_000, lead_weeks: 10, description: "Medium production, P20 steel" },
  class_102:   { base_usd: 50_000,  life_shots: 1_000_000, lead_weeks: 14, description: "High production, H13 hardened" },
  class_101:   { base_usd: 100_000, life_shots: 2_000_000, lead_weeks: 20, description: "Very high production, premium steel" },
};

// ── Material database (per-kg pricing, density, shrinkage, process window) ──
interface MoldMaterial {
  name: string;
  price_per_kg: number;
  density_g_cm3: number;
  shrinkage_pct: number;      // linear shrinkage %
  melt_temp_c: number;
  mold_temp_c: number;
  max_wall_mm: number;
  min_wall_mm: number;
  drying_required: boolean;
  cooling_factor: number;     // multiplier vs ABS baseline (1.0)
}

const MATERIALS: Record<string, MoldMaterial> = {
  abs:          { name: "ABS",           price_per_kg: 2.20, density_g_cm3: 1.04, shrinkage_pct: 0.5, melt_temp_c: 230, mold_temp_c: 60,  max_wall_mm: 3.5, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.0 },
  pc:           { name: "Polycarbonate", price_per_kg: 3.80, density_g_cm3: 1.20, shrinkage_pct: 0.6, melt_temp_c: 300, mold_temp_c: 95,  max_wall_mm: 4.0, min_wall_mm: 1.0,  drying_required: true,  cooling_factor: 1.3 },
  pc_abs:       { name: "PC/ABS Blend",  price_per_kg: 3.40, density_g_cm3: 1.12, shrinkage_pct: 0.5, melt_temp_c: 260, mold_temp_c: 80,  max_wall_mm: 3.5, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.15 },
  nylon_6:      { name: "Nylon 6 (PA6)", price_per_kg: 3.50, density_g_cm3: 1.13, shrinkage_pct: 1.5, melt_temp_c: 260, mold_temp_c: 80,  max_wall_mm: 3.0, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.2 },
  nylon_66:     { name: "Nylon 66",      price_per_kg: 4.20, density_g_cm3: 1.14, shrinkage_pct: 1.6, melt_temp_c: 280, mold_temp_c: 85,  max_wall_mm: 3.0, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.25 },
  nylon_gf30:   { name: "Nylon 6 GF30",  price_per_kg: 4.50, density_g_cm3: 1.36, shrinkage_pct: 0.4, melt_temp_c: 270, mold_temp_c: 85,  max_wall_mm: 3.5, min_wall_mm: 1.0,  drying_required: true,  cooling_factor: 1.1 },
  pp:           { name: "Polypropylene", price_per_kg: 1.50, density_g_cm3: 0.91, shrinkage_pct: 1.8, melt_temp_c: 230, mold_temp_c: 40,  max_wall_mm: 4.0, min_wall_mm: 0.65, drying_required: false, cooling_factor: 1.1 },
  pe_hd:        { name: "HDPE",          price_per_kg: 1.40, density_g_cm3: 0.95, shrinkage_pct: 2.5, melt_temp_c: 230, mold_temp_c: 35,  max_wall_mm: 4.0, min_wall_mm: 0.8,  drying_required: false, cooling_factor: 1.15 },
  pom:          { name: "Acetal (POM)",   price_per_kg: 3.00, density_g_cm3: 1.41, shrinkage_pct: 2.0, melt_temp_c: 210, mold_temp_c: 90,  max_wall_mm: 3.0, min_wall_mm: 0.75, drying_required: false, cooling_factor: 0.9 },
  pbt:          { name: "PBT",           price_per_kg: 3.20, density_g_cm3: 1.31, shrinkage_pct: 1.8, melt_temp_c: 250, mold_temp_c: 70,  max_wall_mm: 3.0, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.0 },
  pbt_gf30:     { name: "PBT GF30",      price_per_kg: 4.00, density_g_cm3: 1.53, shrinkage_pct: 0.5, melt_temp_c: 260, mold_temp_c: 80,  max_wall_mm: 3.5, min_wall_mm: 1.0,  drying_required: true,  cooling_factor: 0.95 },
  pei:          { name: "ULTEM (PEI)",    price_per_kg: 25.00, density_g_cm3: 1.27, shrinkage_pct: 0.6, melt_temp_c: 380, mold_temp_c: 150, max_wall_mm: 3.0, min_wall_mm: 1.0, drying_required: true,  cooling_factor: 1.5 },
  peek:         { name: "PEEK",          price_per_kg: 90.00, density_g_cm3: 1.30, shrinkage_pct: 1.2, melt_temp_c: 380, mold_temp_c: 180, max_wall_mm: 3.5, min_wall_mm: 1.0, drying_required: true,  cooling_factor: 1.8 },
  tpe:          { name: "TPE",           price_per_kg: 4.50, density_g_cm3: 1.10, shrinkage_pct: 1.5, melt_temp_c: 210, mold_temp_c: 40,  max_wall_mm: 4.0, min_wall_mm: 0.8,  drying_required: false, cooling_factor: 1.0 },
  lcp:          { name: "LCP",           price_per_kg: 18.00, density_g_cm3: 1.40, shrinkage_pct: 0.2, melt_temp_c: 330, mold_temp_c: 80,  max_wall_mm: 2.5, min_wall_mm: 0.4,  drying_required: true,  cooling_factor: 0.7 },
  pps_gf40:     { name: "PPS GF40",      price_per_kg: 12.00, density_g_cm3: 1.65, shrinkage_pct: 0.3, melt_temp_c: 320, mold_temp_c: 140, max_wall_mm: 3.0, min_wall_mm: 1.0, drying_required: true,  cooling_factor: 1.4 },
  pmma:         { name: "Acrylic (PMMA)", price_per_kg: 3.00, density_g_cm3: 1.19, shrinkage_pct: 0.5, melt_temp_c: 240, mold_temp_c: 70,  max_wall_mm: 4.0, min_wall_mm: 0.6,  drying_required: true,  cooling_factor: 1.1 },
  asa:          { name: "ASA",           price_per_kg: 3.00, density_g_cm3: 1.07, shrinkage_pct: 0.5, melt_temp_c: 250, mold_temp_c: 70,  max_wall_mm: 3.5, min_wall_mm: 0.75, drying_required: true,  cooling_factor: 1.0 },
};

// ── Machine rates by tonnage ──
const MACHINE_RATES: Array<{ tonnage: number; rate_per_hr: number; shot_size_cm3: number }> = [
  { tonnage: 50,   rate_per_hr: 35,  shot_size_cm3: 30 },
  { tonnage: 100,  rate_per_hr: 45,  shot_size_cm3: 80 },
  { tonnage: 200,  rate_per_hr: 60,  shot_size_cm3: 200 },
  { tonnage: 300,  rate_per_hr: 75,  shot_size_cm3: 400 },
  { tonnage: 500,  rate_per_hr: 100, shot_size_cm3: 800 },
  { tonnage: 750,  rate_per_hr: 130, shot_size_cm3: 1500 },
  { tonnage: 1000, rate_per_hr: 170, shot_size_cm3: 2500 },
  { tonnage: 1500, rate_per_hr: 220, shot_size_cm3: 4000 },
  { tonnage: 2000, rate_per_hr: 280, shot_size_cm3: 6000 },
];

export interface InjectionMoldInput {
  material: string;
  part_volume_cm3: number;
  projected_area_cm2: number;         // projected area for clamp force calc
  wall_thickness_mm?: number;          // avg wall thickness
  quantity: number;
  annual_volume?: number;
  num_cavities?: number;               // override auto-calc
  mold_class?: string;                 // override auto-selection
  num_side_actions?: number;           // slides, lifters
  num_unscrewing?: number;             // threaded features
  surface_finish?: "spi_a1" | "spi_a2" | "spi_a3" | "spi_b1" | "spi_b2" | "spi_b3" | "spi_c1" | "spi_c2" | "spi_d1" | "spi_d2" | "textured";
  hot_runner?: boolean;
  insert_molding?: boolean;
  overmolding?: boolean;
  secondary_ops?: string[];            // painting, pad printing, ultrasonic welding, etc.
  tight_tolerance?: boolean;           // +/- 0.05mm or tighter
  undercuts?: number;
  markup_pct?: number;                 // default 25%
}

export interface InjectionMoldResult {
  // Tooling
  mold_class: string;
  mold_cost_usd: number;
  mold_lead_weeks: number;
  mold_life_shots: number;
  num_cavities: number;
  // Per-part
  material_cost: number;
  cycle_time_s: number;
  machine_tonnage: number;
  machine_rate_hr: number;
  machine_cost: number;
  secondary_ops_cost: number;
  overhead_cost: number;
  unit_cost: number;
  // Total
  total_cost: number;
  amortized_tool_per_part: number;
  price_per_part: number;
  total_price: number;
  margin_pct: number;
  // DfM
  dfm_warnings: string[];
  // Price breaks
  price_breaks?: Array<{ qty: number; price_per_part: number; amortized_tool: number }>;
}

export class InjectionMoldQuoteEngine {
  /**
   * Generate injection mold quote with tooling + per-part costs.
   */
  quote(input: InjectionMoldInput): InjectionMoldResult {
    const mat = MATERIALS[input.material];
    if (!mat) throw new Error(`Unknown injection mold material: ${input.material}. Use listMaterials() for options.`);

    const dfm: string[] = [];
    const wallT = input.wall_thickness_mm ?? 2.0;
    const markup = (input.markup_pct ?? 25) / 100;

    // ── DfM checks ──
    if (wallT < mat.min_wall_mm) dfm.push(`Wall ${wallT}mm below min ${mat.min_wall_mm}mm for ${mat.name} — risk of short shots`);
    if (wallT > mat.max_wall_mm) dfm.push(`Wall ${wallT}mm exceeds recommended ${mat.max_wall_mm}mm for ${mat.name} — sink marks likely`);
    if (mat.shrinkage_pct > 1.5 && input.tight_tolerance) dfm.push(`${mat.name} has ${mat.shrinkage_pct}% shrinkage — tight tolerance (+/-0.05mm) will be difficult`);
    if (input.undercuts && input.undercuts > 0 && !input.num_side_actions) dfm.push(`${input.undercuts} undercuts detected but no side actions specified — mold cost will increase`);
    if (input.part_volume_cm3 > 500 && wallT < 1.5) dfm.push("Large part with thin walls — consider gas-assist injection molding");
    if (mat.name === "PEEK" || mat.name === "PPS GF40") dfm.push(`${mat.name} requires high mold temps (${mat.mold_temp_c}°C) — special thermal management needed`);
    if (input.insert_molding && input.overmolding) dfm.push("Both insert molding and overmolding specified — verify process sequence");

    // ── Mold class selection ──
    const totalVolume = input.annual_volume ?? input.quantity;
    let moldClass = input.mold_class ?? "class_103";
    if (!input.mold_class) {
      if (totalVolume <= 500) moldClass = "prototype";
      else if (totalVolume <= 10_000) moldClass = "class_104";
      else if (totalVolume <= 100_000) moldClass = "class_103";
      else if (totalVolume <= 500_000) moldClass = "class_102";
      else moldClass = "class_101";
    }
    const mold = MOLD_CLASS[moldClass] ?? MOLD_CLASS.class_103;

    // ── Cavity count ──
    let cavities = input.num_cavities ?? 1;
    if (!input.num_cavities) {
      if (totalVolume > 500_000) cavities = 8;
      else if (totalVolume > 100_000) cavities = 4;
      else if (totalVolume > 10_000) cavities = 2;
      else cavities = 1;
    }

    // ── Mold cost buildup ──
    let moldCost = mold.base_usd;
    // Cavity multiplier (diminishing: each extra cavity ~60% of single)
    moldCost *= 1 + (cavities - 1) * 0.6;
    // Side actions: $3K-$8K each
    const actions = (input.num_side_actions ?? 0) + (input.undercuts ?? 0);
    moldCost += actions * 5_500;
    // Unscrewing: $6K each
    moldCost += (input.num_unscrewing ?? 0) * 6_000;
    // Surface finish premium
    const finishMult: Record<string, number> = {
      spi_a1: 1.30, spi_a2: 1.20, spi_a3: 1.12,
      spi_b1: 1.08, spi_b2: 1.05, spi_b3: 1.03,
      spi_c1: 1.02, spi_c2: 1.01, spi_d1: 1.00, spi_d2: 1.00,
      textured: 1.15,
    };
    moldCost *= finishMult[input.surface_finish ?? "spi_c1"] ?? 1.0;
    // Hot runner: adds $8K-$15K depending on cavities
    if (input.hot_runner) moldCost += 8_000 + cavities * 1_500;
    // Insert/overmolding complexity
    if (input.insert_molding) moldCost *= 1.15;
    if (input.overmolding) moldCost *= 1.20;
    // Tight tolerance
    if (input.tight_tolerance) moldCost *= 1.10;

    moldCost = Math.round(moldCost);
    const moldLeadWeeks = mold.lead_weeks + (actions > 2 ? 2 : 0) + (input.hot_runner ? 2 : 0);

    // ── Clamp tonnage ──
    // Rule of thumb: 3-5 tons per sq inch of projected area (use 4)
    const area_in2 = input.projected_area_cm2 / 6.4516;
    const clampTons = Math.max(50, Math.ceil(area_in2 * 4 * cavities / 50) * 50);
    const machine = MACHINE_RATES.find(m => m.tonnage >= clampTons) ?? MACHINE_RATES[MACHINE_RATES.length - 1];

    // ── Cycle time ──
    // Cooling time dominates: t_cool ≈ (wall²)/(π² × α) × ln(8/π² × (Tmelt-Tmold)/(Teject-Tmold))
    // Simplified: base = wall² × 2.5s/mm², adjusted by material cooling factor
    const coolTime = wallT * wallT * 2.5 * mat.cooling_factor;
    const fillTime = (input.part_volume_cm3 * cavities) / (machine.shot_size_cm3 * 0.8) * 3; // ~3s for full shot
    const packTime = coolTime * 0.3; // pack/hold ~30% of cool
    const moldOpenClose = 3; // seconds for mold open/close/eject
    const cycleTime = Math.max(fillTime + packTime + coolTime + moldOpenClose, 8); // min 8s

    // ── Per-part costs ──
    const partWeight_kg = (input.part_volume_cm3 * mat.density_g_cm3) / 1000;
    const runnerWaste = input.hot_runner ? 1.02 : 1.10; // 2% vs 10% runner waste
    const materialCost = partWeight_kg * runnerWaste * mat.price_per_kg;

    const partsPerHour = (3600 / cycleTime) * cavities;
    const machineCost = machine.rate_per_hr / partsPerHour;

    // Secondary ops
    const SEC_OPS_COST: Record<string, number> = {
      painting: 1.50, pad_printing: 0.80, laser_marking: 0.40,
      ultrasonic_welding: 0.60, heat_staking: 0.30, assembly: 2.00,
      plating: 3.00, hot_stamping: 0.50, degating: 0.15,
      inspection: 0.25, packaging: 0.10,
    };
    const secOpsCost = (input.secondary_ops ?? []).reduce((sum, op) => sum + (SEC_OPS_COST[op] ?? 0.50), 0);

    const overhead = (materialCost + machineCost) * 0.15;
    const unitCost = materialCost + machineCost + secOpsCost + overhead;
    const amortizedTool = moldCost / input.quantity;
    const pricePerPart = (unitCost + amortizedTool) * (1 + markup);
    const totalPrice = pricePerPart * input.quantity;
    const totalCost = unitCost * input.quantity + moldCost;

    // ── Price breaks ──
    const breakQtys = [100, 500, 1000, 5000, 10000, 50000, 100000].filter(q => q !== input.quantity && q > input.quantity * 0.5);
    const priceBreaks = breakQtys.map(qty => {
      const amort = moldCost / qty;
      return { qty, price_per_part: Math.round((unitCost + amort) * (1 + markup) * 100) / 100, amortized_tool: Math.round(amort * 100) / 100 };
    });

    return {
      mold_class: moldClass,
      mold_cost_usd: moldCost,
      mold_lead_weeks: moldLeadWeeks,
      mold_life_shots: mold.life_shots,
      num_cavities: cavities,
      material_cost: Math.round(materialCost * 100) / 100,
      cycle_time_s: Math.round(cycleTime * 10) / 10,
      machine_tonnage: machine.tonnage,
      machine_rate_hr: machine.rate_per_hr,
      machine_cost: Math.round(machineCost * 100) / 100,
      secondary_ops_cost: Math.round(secOpsCost * 100) / 100,
      overhead_cost: Math.round(overhead * 100) / 100,
      unit_cost: Math.round(unitCost * 100) / 100,
      total_cost: Math.round(totalCost),
      amortized_tool_per_part: Math.round(amortizedTool * 100) / 100,
      price_per_part: Math.round(pricePerPart * 100) / 100,
      total_price: Math.round(totalPrice),
      margin_pct: Math.round(((pricePerPart - (unitCost + amortizedTool)) / pricePerPart) * 100),
      dfm_warnings: dfm,
      price_breaks: priceBreaks.length > 0 ? priceBreaks : undefined,
    };
  }

  /** List available injection mold materials with properties. */
  listMaterials(): Array<{ key: string; name: string; price_per_kg: number; shrinkage_pct: number; max_wall_mm: number; min_wall_mm: number }> {
    return Object.entries(MATERIALS).map(([key, m]) => ({
      key, name: m.name, price_per_kg: m.price_per_kg,
      shrinkage_pct: m.shrinkage_pct, max_wall_mm: m.max_wall_mm, min_wall_mm: m.min_wall_mm,
    }));
  }

  /** DfM analysis for injection molding. */
  analyzeDfm(input: {
    material: string;
    wall_thickness_mm: number;
    draft_angle_deg?: number;
    rib_thickness_ratio?: number;    // rib/wall ratio (ideal: 0.5-0.6)
    boss_diameter_mm?: number;
    boss_wall_ratio?: number;        // boss wall / nominal wall
    undercuts?: number;
    max_depth_mm?: number;           // deepest feature
    gate_type?: "edge" | "sub" | "pin" | "hot_tip" | "fan" | "tab";
    living_hinge?: boolean;
    snap_fit?: boolean;
    surface_finish?: "spi_a1" | "spi_a2" | "spi_a3" | "spi_b1" | "spi_b2" | "spi_b3" | "spi_c1" | "spi_c2" | "spi_d1" | "spi_d2" | "textured";
  }): { score: number; warnings: string[]; suggestions: string[] } {
    const mat = MATERIALS[input.material];
    if (!mat) return { score: 0, warnings: [`Unknown material: ${input.material}`], suggestions: [] };

    const w: string[] = [];
    const s: string[] = [];
    let score = 100;

    // Draft angle
    const draft = input.draft_angle_deg ?? 0;
    if (draft < 0.5) { w.push("Draft angle < 0.5° — ejection problems likely"); score -= 20; }
    else if (draft < 1.0) { w.push("Draft angle < 1° — may cause drag marks"); score -= 5; }
    if (input.surface_finish === "textured" && draft < 1.5) w.push("Textured surface needs ≥1.5° draft per 0.025mm texture depth");

    // Wall thickness
    if (input.wall_thickness_mm < mat.min_wall_mm) { w.push(`Wall ${input.wall_thickness_mm}mm < min ${mat.min_wall_mm}mm`); score -= 25; }
    if (input.wall_thickness_mm > mat.max_wall_mm) { w.push(`Wall ${input.wall_thickness_mm}mm > recommended ${mat.max_wall_mm}mm — sink marks`); score -= 10; }

    // Rib design
    if (input.rib_thickness_ratio !== undefined) {
      if (input.rib_thickness_ratio > 0.7) { w.push(`Rib/wall ratio ${input.rib_thickness_ratio} > 0.7 — sink marks on opposite side`); score -= 10; }
      else if (input.rib_thickness_ratio < 0.4) s.push("Consider increasing rib thickness to 50-60% of wall for strength");
    }

    // Boss design
    if (input.boss_wall_ratio !== undefined && input.boss_wall_ratio > 0.7) {
      w.push(`Boss wall ratio ${input.boss_wall_ratio} > 0.7 — sink marks likely`); score -= 8;
    }

    // Undercuts
    if (input.undercuts && input.undercuts > 4) { w.push(`${input.undercuts} undercuts — complex mold with many side actions`); score -= 15; }

    // Living hinge
    if (input.living_hinge) {
      if (input.material !== "pp" && input.material !== "pe_hd") {
        w.push(`Living hinge with ${mat.name} — only PP/PE recommended`); score -= 20;
      }
      s.push("Living hinge: use 0.25-0.50mm thickness, orient flow perpendicular to hinge");
    }

    // Gate
    if (input.gate_type === "pin" && input.wall_thickness_mm > 2.5) s.push("Pin gate may limit fill for thick walls — consider fan or edge gate");

    // Depth
    if (input.max_depth_mm && input.max_depth_mm > 150) { w.push("Deep cavity (>150mm) — consider special venting and sequential valve gating"); score -= 5; }

    return { score: Math.max(0, score), warnings: w, suggestions: s };
  }
}

export const injectionMoldQuoteEngine = new InjectionMoldQuoteEngine();
