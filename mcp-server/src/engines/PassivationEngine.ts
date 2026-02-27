/**
 * PassivationEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates stainless steel passivation parameters per ASTM A967
 * and AMS 2700. Selects acid type (nitric, citric), concentration,
 * temperature, and immersion time based on alloy and contamination.
 *
 * Actions: passivation_calc, passivation_validate, passivation_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type PassivationMethod = "nitric_acid" | "citric_acid" | "electropolish";
export type StainlessFamily = "austenitic" | "ferritic" | "martensitic" | "duplex" | "PH";

export interface PassivationInput {
  alloy: string;                       // e.g., "304", "316L", "17-4PH"
  family: StainlessFamily;
  method: PassivationMethod;
  surface_condition: "machined" | "ground" | "welded" | "as_received";
  contamination_level: "light" | "moderate" | "heavy";
  part_surface_area_cm2: number;
  tank_volume_liters: number;
}

export interface PassivationResult {
  acid_concentration_pct: number;
  temperature_C: number;
  immersion_time_min: number;
  rinse_steps: string[];
  acceptance_test: string;
  chrome_ratio_target: number;         // Cr/Fe ratio target
  tank_loading_ratio: number;          // cm²/liter
  estimated_cost_per_part_USD: number;
  meets_spec: boolean;
  spec_reference: string;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PASSIVATION_PARAMS: Record<PassivationMethod, Record<StainlessFamily, {
  acid_pct: number; temp_C: number; time_min: number;
}>> = {
  nitric_acid: {
    austenitic: { acid_pct: 25, temp_C: 50, time_min: 30 },
    ferritic:   { acid_pct: 30, temp_C: 50, time_min: 30 },
    martensitic:{ acid_pct: 30, temp_C: 55, time_min: 30 },
    duplex:     { acid_pct: 25, temp_C: 50, time_min: 30 },
    PH:         { acid_pct: 30, temp_C: 50, time_min: 45 },
  },
  citric_acid: {
    austenitic: { acid_pct: 4, temp_C: 60, time_min: 20 },
    ferritic:   { acid_pct: 4, temp_C: 60, time_min: 20 },
    martensitic:{ acid_pct: 6, temp_C: 50, time_min: 30 },
    duplex:     { acid_pct: 4, temp_C: 60, time_min: 20 },
    PH:         { acid_pct: 6, temp_C: 50, time_min: 30 },
  },
  electropolish: {
    austenitic: { acid_pct: 0, temp_C: 55, time_min: 10 },
    ferritic:   { acid_pct: 0, temp_C: 55, time_min: 10 },
    martensitic:{ acid_pct: 0, temp_C: 50, time_min: 15 },
    duplex:     { acid_pct: 0, temp_C: 55, time_min: 10 },
    PH:         { acid_pct: 0, temp_C: 50, time_min: 15 },
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PassivationEngine {
  calculate(input: PassivationInput): PassivationResult {
    const params = PASSIVATION_PARAMS[input.method][input.family];

    // Adjust for contamination
    const timeMult = input.contamination_level === "heavy" ? 1.5
      : input.contamination_level === "moderate" ? 1.2
      : 1.0;
    const time = Math.round(params.time_min * timeMult);

    // Welded surfaces need extra time
    const weldAdj = input.surface_condition === "welded" ? 10 : 0;

    // Tank loading ratio (recommended max 6 cm²/liter for nitric)
    const loadingRatio = input.part_surface_area_cm2 / Math.max(input.tank_volume_liters, 1);
    const maxLoading = input.method === "nitric_acid" ? 6 : 10;

    // Rinse steps
    const rinse = [
      "DI water rinse (ambient, 2 min minimum)",
      "Inspect for water break — film should sheet uniformly",
    ];
    if (input.method === "nitric_acid") {
      rinse.unshift("Alkaline degrease if contaminated with oil/grease");
    }

    // Acceptance test per ASTM A967
    const acceptTest = input.family === "austenitic"
      ? "Copper sulfate test (ASTM A967 Practice A) — no copper deposits"
      : "High-humidity test (ASTM A967 Practice B) — no rust in 24h";

    // Target Cr/Fe ratio (passivated surface should show >1.5 by XPS/AES)
    const crRatioTarget = input.method === "electropolish" ? 2.5 : 1.5;

    // Cost estimate
    const acidCostPerLiter = input.method === "nitric_acid" ? 0.50
      : input.method === "citric_acid" ? 0.30
      : 2.00;
    const costPerPart = (acidCostPerLiter * input.tank_volume_liters * 0.01) +
      (time / 60) * 15; // labor $15/hr

    const meetsSpec = loadingRatio <= maxLoading && time >= params.time_min;
    const specRef = input.method === "citric_acid"
      ? "ASTM A967 Practice D (Citric Acid)"
      : input.method === "nitric_acid"
      ? "ASTM A967 Practice A/B/C (Nitric Acid)"
      : "ASTM B912 (Electropolishing)";

    const recs: string[] = [];
    if (loadingRatio > maxLoading) {
      recs.push(`Tank loading ${loadingRatio.toFixed(1)} cm²/L exceeds max ${maxLoading} — use larger tank or smaller batch`);
    }
    if (input.surface_condition === "welded") {
      recs.push("Welded surfaces — ensure heat tint removed by mechanical or chemical means before passivation");
    }
    if (input.family === "martensitic" && input.method === "nitric_acid") {
      recs.push("Martensitic SS with nitric acid — monitor closely, risk of flash attack on low-Cr grades");
    }
    if (input.method === "citric_acid") {
      recs.push("Citric acid method — environmentally preferred, verify acceptance with customer spec");
    }
    if (recs.length === 0) recs.push("Passivation parameters per specification — proceed");

    return {
      acid_concentration_pct: params.acid_pct,
      temperature_C: params.temp_C,
      immersion_time_min: time + weldAdj,
      rinse_steps: rinse,
      acceptance_test: acceptTest,
      chrome_ratio_target: crRatioTarget,
      tank_loading_ratio: Math.round(loadingRatio * 10) / 10,
      estimated_cost_per_part_USD: Math.round(costPerPart * 100) / 100,
      meets_spec: meetsSpec,
      spec_reference: specRef,
      recommendations: recs,
    };
  }
}

export const passivationEngine = new PassivationEngine();
