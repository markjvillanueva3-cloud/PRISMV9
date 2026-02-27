/**
 * MaskingCalculatorEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates masking requirements for selective plating, coating,
 * and heat treatment operations. Determines mask type, coverage area,
 * edge clearance, and thermal limits.
 *
 * Actions: masking_calc, masking_layout, masking_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type MaskMethod = "tape" | "paint" | "plug" | "cap" | "fixture" | "wax";
export type MaskProcess = "plating" | "anodize" | "paint_coat" | "heat_treat" | "shot_peen" | "passivation";

export interface MaskingInput {
  process: MaskProcess;
  process_temp_C: number;
  areas_to_mask: { id: string; geometry: "bore" | "od" | "face" | "thread" | "groove" | "cavity"; dimension_mm: number }[];
  part_material: string;
  tolerance_at_mask_edge_mm: number;
  batch_size: number;
}

export interface MaskingResult {
  mask_assignments: { area_id: string; method: MaskMethod; material: string; notes: string }[];
  total_mask_area_mm2: number;
  mask_application_time_min: number;
  mask_removal_time_min: number;
  edge_bleed_risk_mm: number;
  max_process_temp_C: number;
  cost_per_part_usd: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MaskingCalculatorEngine {
  calculate(input: MaskingInput): MaskingResult {
    const assignments: MaskingResult["mask_assignments"] = [];
    let totalArea = 0;
    let appTime = 0;
    let remTime = 0;
    let costPerPart = 0;

    for (const area of input.areas_to_mask) {
      const { method, material, notes, areaEst, time, cost } = this._selectMask(area, input);
      assignments.push({ area_id: area.id, method, material, notes });
      totalArea += areaEst;
      appTime += time;
      remTime += time * 0.5;
      costPerPart += cost;
    }

    // Edge bleed risk based on tolerance
    const bleedRisk = input.tolerance_at_mask_edge_mm < 0.5 ? 0.3 : input.tolerance_at_mask_edge_mm < 1.0 ? 0.15 : 0.05;

    // Max temp for mask materials
    const maxTemp = assignments.some(a => a.method === "tape") ? 200
      : assignments.some(a => a.method === "paint") ? 350
      : assignments.some(a => a.method === "wax") ? 100
      : 500;

    const recs: string[] = [];
    if (input.process_temp_C > maxTemp) {
      recs.push(`Process temp ${input.process_temp_C}°C exceeds mask limit ${maxTemp}°C — use fixture masking or high-temp mask`);
    }
    if (bleedRisk > 0.2) {
      recs.push("Tight mask edge tolerance — use precision fixture masking instead of tape/paint");
    }
    if (input.batch_size > 100 && appTime > 10) {
      recs.push("High volume + long mask time — invest in fixture masking for consistency and speed");
    }
    if (recs.length === 0) recs.push("Masking plan acceptable — proceed");

    return {
      mask_assignments: assignments,
      total_mask_area_mm2: Math.round(totalArea),
      mask_application_time_min: Math.round(appTime * 10) / 10,
      mask_removal_time_min: Math.round(remTime * 10) / 10,
      edge_bleed_risk_mm: bleedRisk,
      max_process_temp_C: maxTemp,
      cost_per_part_usd: Math.round(costPerPart * 100) / 100,
      recommendations: recs,
    };
  }

  private _selectMask(area: MaskingInput["areas_to_mask"][0], input: MaskingInput): {
    method: MaskMethod; material: string; notes: string; areaEst: number; time: number; cost: number;
  } {
    const dim = area.dimension_mm;
    const areaEst = dim * dim * Math.PI * 0.25; // rough area

    if (area.geometry === "bore" || area.geometry === "thread") {
      return {
        method: "plug", material: "Silicone plug",
        notes: `${dim}mm ${area.geometry} — press-fit silicone plug`,
        areaEst, time: 0.5, cost: 0.50,
      };
    }
    if (area.geometry === "od" && dim > 50) {
      return {
        method: "tape", material: "Polyester high-temp tape",
        notes: `Wrap ${area.geometry} with 2-layer tape`,
        areaEst: dim * Math.PI * 10, time: 2, cost: 0.30,
      };
    }
    if (area.geometry === "cavity" || area.geometry === "groove") {
      return {
        method: "wax", material: "Maskant wax",
        notes: `Fill ${area.geometry} with peelable wax`,
        areaEst, time: 3, cost: 0.80,
      };
    }
    if (input.process_temp_C > 200) {
      return {
        method: "paint", material: "High-temp stop-off paint",
        notes: `Paint mask for ${input.process} at ${input.process_temp_C}°C`,
        areaEst, time: 2, cost: 0.40,
      };
    }
    return {
      method: "tape", material: "Vinyl mask tape",
      notes: `Standard tape mask for ${area.geometry}`,
      areaEst, time: 1, cost: 0.20,
    };
  }
}

export const maskingCalculatorEngine = new MaskingCalculatorEngine();
