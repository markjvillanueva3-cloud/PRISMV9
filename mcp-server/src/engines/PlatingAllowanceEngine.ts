/**
 * PlatingAllowanceEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates material allowances and dimensional adjustments for
 * plated/coated parts. Ensures machined dimensions account for coating
 * thickness to achieve final specification.
 *
 * Covers: hard chrome, electroless nickel, zinc, cadmium, anodize,
 * chrome plating, PVD/CVD coatings, thermal spray.
 *
 * Actions: plating_allowance, plating_tolerance, plating_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type PlatingProcess =
  | "hard_chrome" | "electroless_nickel" | "zinc" | "cadmium"
  | "anodize_type2" | "anodize_type3" | "chrome_decorative"
  | "pvd" | "cvd" | "thermal_spray" | "phosphate";

export type DimensionType = "od" | "id" | "flat" | "thread";

export interface PlatingAllowanceInput {
  process: PlatingProcess;
  target_thickness_um: number;           // desired coating thickness
  tolerance_um?: number;                 // coating thickness tolerance
  dimension_type: DimensionType;
  nominal_dimension_mm: number;
  dimension_tolerance_mm: number;        // part tolerance band
  substrate_material: string;            // e.g., "4140 steel", "6061-T6"
  surface_finish_Ra_before_um: number;
  is_masking_required: boolean;
}

export interface PlatingAllowanceResult {
  machine_to_mm: number;                 // dimension to machine before plating
  stock_allowance_per_side_mm: number;
  buildup_per_side_um: number;
  final_dimension_mm: number;
  surface_finish_after_Ra_um: number;
  hydrogen_embrittlement_risk: boolean;
  bake_required: boolean;
  bake_temp_C?: number;
  bake_time_hr?: number;
  masking_notes: string;
  recommendations: string[];
}

export interface PlatingToleranceResult {
  achievable_tolerance_mm: number;
  thickness_uniformity_pct: number;
  edge_buildup_factor: number;           // edges get thicker
  recess_thinning_factor: number;        // recesses get thinner
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Typical deposition characteristics per process
const PROCESS_DATA: Record<PlatingProcess, {
  uniformity_pct: number;      // thickness uniformity (100% = perfectly uniform)
  edge_factor: number;         // edge buildup multiplier
  recess_factor: number;       // recess thinning multiplier
  finish_factor: number;       // surface finish change (< 1 = smoother)
  h2_risk: boolean;            // hydrogen embrittlement risk
  bake_temp_C: number;         // bake temp if required
  bake_time_hr: number;
  growth_direction: "buildup" | "penetrate" | "both";  // how it affects dimensions
}> = {
  hard_chrome: { uniformity_pct: 85, edge_factor: 1.8, recess_factor: 0.5, finish_factor: 0.6, h2_risk: true, bake_temp_C: 190, bake_time_hr: 3, growth_direction: "buildup" },
  electroless_nickel: { uniformity_pct: 95, edge_factor: 1.1, recess_factor: 0.9, finish_factor: 0.8, h2_risk: true, bake_temp_C: 190, bake_time_hr: 4, growth_direction: "buildup" },
  zinc: { uniformity_pct: 80, edge_factor: 2.0, recess_factor: 0.4, finish_factor: 1.2, h2_risk: true, bake_temp_C: 190, bake_time_hr: 8, growth_direction: "buildup" },
  cadmium: { uniformity_pct: 85, edge_factor: 1.5, recess_factor: 0.6, finish_factor: 1.0, h2_risk: true, bake_temp_C: 190, bake_time_hr: 23, growth_direction: "buildup" },
  anodize_type2: { uniformity_pct: 90, edge_factor: 1.2, recess_factor: 0.8, finish_factor: 1.1, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "both" },
  anodize_type3: { uniformity_pct: 88, edge_factor: 1.3, recess_factor: 0.7, finish_factor: 1.3, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "both" },
  chrome_decorative: { uniformity_pct: 75, edge_factor: 2.5, recess_factor: 0.3, finish_factor: 0.5, h2_risk: true, bake_temp_C: 190, bake_time_hr: 3, growth_direction: "buildup" },
  pvd: { uniformity_pct: 92, edge_factor: 1.1, recess_factor: 0.85, finish_factor: 0.9, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "buildup" },
  cvd: { uniformity_pct: 94, edge_factor: 1.05, recess_factor: 0.95, finish_factor: 0.85, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "buildup" },
  thermal_spray: { uniformity_pct: 70, edge_factor: 1.5, recess_factor: 0.6, finish_factor: 2.0, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "buildup" },
  phosphate: { uniformity_pct: 85, edge_factor: 1.2, recess_factor: 0.8, finish_factor: 1.5, h2_risk: false, bake_temp_C: 0, bake_time_hr: 0, growth_direction: "penetrate" },
};

// High-strength steels (>1000 MPa) require H2 embrittlement bake
const HIGH_STRENGTH_KEYWORDS = ["4340", "4140", "300M", "D2", "H13", "A2", "S7", "M2", "maraging"];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PlatingAllowanceEngine {
  calculateAllowance(input: PlatingAllowanceInput): PlatingAllowanceResult {
    const pd = PROCESS_DATA[input.process];
    const thickness_mm = input.target_thickness_um / 1000;

    // Buildup per side
    let buildupPerSide_um: number;
    if (pd.growth_direction === "penetrate") {
      buildupPerSide_um = 0; // phosphate — no dimensional change
    } else if (pd.growth_direction === "both") {
      // Anodize: ~50% penetrates, ~50% builds up
      buildupPerSide_um = input.target_thickness_um * 0.5;
    } else {
      buildupPerSide_um = input.target_thickness_um;
    }

    const allowancePerSide_mm = buildupPerSide_um / 1000;

    // Machine-to dimension (pre-plating)
    let machineTo: number;
    if (input.dimension_type === "od") {
      // OD: machine undersized, plating builds it up
      machineTo = input.nominal_dimension_mm - 2 * allowancePerSide_mm;
    } else if (input.dimension_type === "id") {
      // ID: machine oversized, plating closes it down
      machineTo = input.nominal_dimension_mm + 2 * allowancePerSide_mm;
    } else {
      // Flat/thread: one-side allowance for flat, special handling for thread
      machineTo = input.nominal_dimension_mm - allowancePerSide_mm;
    }

    // Final dimension after plating (should equal nominal)
    const finalDim = input.dimension_type === "od"
      ? machineTo + 2 * allowancePerSide_mm
      : input.dimension_type === "id"
        ? machineTo - 2 * allowancePerSide_mm
        : machineTo + allowancePerSide_mm;

    // Surface finish after plating
    const finishAfter = Math.round(input.surface_finish_Ra_before_um * pd.finish_factor * 100) / 100;

    // H2 embrittlement assessment
    const isHighStrength = HIGH_STRENGTH_KEYWORDS.some(kw =>
      input.substrate_material.toLowerCase().includes(kw.toLowerCase())
    );
    const h2Risk = pd.h2_risk && isHighStrength;
    const bakeRequired = h2Risk;

    // Masking notes
    const maskNotes = input.is_masking_required
      ? `Mask non-plated areas before ${input.process}. Edge buildup factor: ${pd.edge_factor}x — allow extra masking margin at boundaries.`
      : "No masking required — full coverage.";

    // Recommendations
    const recs: string[] = [];
    if (h2Risk) {
      recs.push(`SAFETY: Hydrogen embrittlement risk — bake at ${pd.bake_temp_C}°C for ${pd.bake_time_hr}hr within 4 hours of plating`);
    }
    if (input.target_thickness_um > 100 && input.process === "hard_chrome") {
      recs.push("Thick chrome (>100µm) may need intermediate grinding between layers");
    }
    if (input.surface_finish_Ra_before_um > 3.2) {
      recs.push("Pre-plate finish >3.2µm Ra — consider polishing before plating for uniform deposition");
    }
    if (input.dimension_type === "thread" && input.process !== "electroless_nickel") {
      recs.push("Thread plating: electroless nickel preferred for uniform coverage in thread roots");
    }
    if (pd.uniformity_pct < 80) {
      recs.push(`Low uniformity process (${pd.uniformity_pct}%) — consider conforming anodes or auxiliary anodes`);
    }
    if (recs.length === 0) {
      recs.push("Plating allowance within standard parameters — proceed");
    }

    return {
      machine_to_mm: Math.round(machineTo * 10000) / 10000,
      stock_allowance_per_side_mm: Math.round(allowancePerSide_mm * 10000) / 10000,
      buildup_per_side_um: Math.round(buildupPerSide_um * 10) / 10,
      final_dimension_mm: Math.round(finalDim * 10000) / 10000,
      surface_finish_after_Ra_um: finishAfter,
      hydrogen_embrittlement_risk: h2Risk,
      bake_required: bakeRequired,
      bake_temp_C: bakeRequired ? pd.bake_temp_C : undefined,
      bake_time_hr: bakeRequired ? pd.bake_time_hr : undefined,
      masking_notes: maskNotes,
      recommendations: recs,
    };
  }

  calculateTolerance(input: PlatingAllowanceInput): PlatingToleranceResult {
    const pd = PROCESS_DATA[input.process];
    const toleranceUm = input.tolerance_um || input.target_thickness_um * 0.15;

    // Achievable tolerance considering plating non-uniformity
    const platingContrib = toleranceUm * 2 / 1000; // both sides
    const totalTol = Math.sqrt(input.dimension_tolerance_mm ** 2 + platingContrib ** 2);

    const recs: string[] = [];
    if (totalTol > input.dimension_tolerance_mm * 1.5) {
      recs.push("Plating thickness variation significantly affects part tolerance — consider post-plate grinding");
    }
    if (pd.edge_factor > 1.5) {
      recs.push(`Edge buildup ${pd.edge_factor}x average — radius sharp edges or use thieving electrodes`);
    }
    if (recs.length === 0) {
      recs.push("Tolerance stack acceptable with plating process");
    }

    return {
      achievable_tolerance_mm: Math.round(totalTol * 10000) / 10000,
      thickness_uniformity_pct: pd.uniformity_pct,
      edge_buildup_factor: pd.edge_factor,
      recess_thinning_factor: pd.recess_factor,
      recommendations: recs,
    };
  }

  recommend(substrate: string, application: "wear" | "corrosion" | "cosmetic" | "electrical"): {
    process: PlatingProcess; typical_thickness_um: number; notes: string;
  } {
    switch (application) {
      case "wear":
        return { process: "hard_chrome", typical_thickness_um: 50, notes: "Hard chrome 50-100µm for wear surfaces. Grind to final dimension." };
      case "corrosion":
        return { process: "electroless_nickel", typical_thickness_um: 25, notes: "EN 25µm for corrosion protection. Uniform thickness even in recesses." };
      case "cosmetic":
        return { process: "chrome_decorative", typical_thickness_um: 0.5, notes: "Decorative chrome 0.3-0.8µm over nickel undercoat." };
      case "electrical":
        return { process: "zinc", typical_thickness_um: 12, notes: "Zinc 8-15µm with chromate conversion coating for electrical/corrosion." };
    }
  }
}

export const platingAllowanceEngine = new PlatingAllowanceEngine();
