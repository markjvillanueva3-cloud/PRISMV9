/**
 * SurfaceFinishEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Surface finish prediction: Ra, Rz, Rt from cutting parameters.
 * Models: theoretical Ra = f²/(32r), with correction factors for
 * material, tool wear, coolant, vibration. Provides achievable finish
 * recommendations by process type.
 *
 * Actions: surface_predict, surface_achievable, surface_compare
 */

// ============================================================================
// TYPES
// ============================================================================

export type SurfaceProcess = "turning" | "milling" | "grinding" | "lapping" | "honing" | "polishing" | "edm" | "reaming";

export interface SurfaceFinishInput {
  process: SurfaceProcess;
  feed_per_rev_mm?: number;         // turning, boring
  feed_per_tooth_mm?: number;       // milling
  tool_nose_radius_mm?: number;     // turning
  tool_diameter_mm?: number;        // milling
  number_of_flutes?: number;
  cutting_speed_mmin?: number;
  iso_material_group?: string;      // P, M, K, N, S, H
  coolant?: "flood" | "mist" | "air" | "none";
  tool_wear_pct?: number;           // 0-100
  depth_of_cut_mm?: number;
}

export interface SurfaceFinishResult {
  ra_um: number;                    // arithmetic mean roughness
  rz_um: number;                    // mean peak-to-valley
  rt_um: number;                    // total peak-to-valley
  rq_um: number;                    // RMS roughness
  process: SurfaceProcess;
  theoretical_ra_um: number;
  correction_factors: { factor: string; multiplier: number }[];
  achievable_range: { min_ra: number; max_ra: number };
  recommendations: string[];
}

export interface AchievableFinish {
  process: SurfaceProcess;
  typical_ra_range_um: [number, number];
  best_ra_um: number;
  notes: string;
}

// ============================================================================
// PROCESS FINISH DATA
// ============================================================================

const PROCESS_RANGES: Record<SurfaceProcess, { min: number; max: number; best: number; note: string }> = {
  turning:   { min: 0.4, max: 6.3, best: 0.2, note: "Fine turning with sharp tool, low feed" },
  milling:   { min: 0.4, max: 6.3, best: 0.2, note: "Finish milling with small stepover" },
  grinding:  { min: 0.05, max: 1.6, best: 0.025, note: "Fine grinding with dressed wheel" },
  lapping:   { min: 0.012, max: 0.4, best: 0.006, note: "Precision lapping with fine abrasive" },
  honing:    { min: 0.05, max: 0.8, best: 0.025, note: "Plateau honing for bearing surfaces" },
  polishing: { min: 0.006, max: 0.2, best: 0.003, note: "Mirror polishing — labor intensive" },
  edm:       { min: 0.8, max: 12.5, best: 0.4, note: "Fine EDM with low power settings" },
  reaming:   { min: 0.4, max: 3.2, best: 0.2, note: "Precision reaming with sharp tool" },
};

// Material correction for surface finish (relative to steel baseline)
const MATERIAL_CORRECTION: Record<string, number> = {
  P: 1.0,   // steel baseline
  M: 1.15,  // stainless — BUE tendency worsens finish
  K: 0.9,   // cast iron — consistent chip formation
  N: 0.85,  // aluminum — good finish achievable
  S: 1.25,  // superalloys — poor finish
  H: 1.1,   // hardened — decent with CBN
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SurfaceFinishEngine {
  predict(input: SurfaceFinishInput): SurfaceFinishResult {
    const corrections: { factor: string; multiplier: number }[] = [];
    let theoreticalRa: number;

    if (input.process === "turning" || input.process === "reaming") {
      // Turning: Ra = f² / (32 × r)
      const f = input.feed_per_rev_mm || 0.15;
      const r = input.tool_nose_radius_mm || 0.8;
      theoreticalRa = (f * f) / (32 * r) * 1000; // convert to µm
    } else if (input.process === "milling") {
      // Milling: Ra ≈ f_z² / (32 × (D/2)) for ball mill, or f² / (32 × r_corner) for flat
      const fz = input.feed_per_tooth_mm || 0.1;
      const r = (input.tool_diameter_mm || 10) / 2;
      theoreticalRa = (fz * fz) / (32 * r) * 1000;
    } else {
      // Use process typical value
      const range = PROCESS_RANGES[input.process];
      theoreticalRa = (range.min + range.max) / 2;
    }

    let correctedRa = theoreticalRa;

    // Material correction
    if (input.iso_material_group) {
      const matCorr = MATERIAL_CORRECTION[input.iso_material_group] || 1.0;
      corrections.push({ factor: "material", multiplier: matCorr });
      correctedRa *= matCorr;
    }

    // Tool wear correction
    if (input.tool_wear_pct !== undefined && input.tool_wear_pct > 0) {
      const wearCorr = 1 + (input.tool_wear_pct / 100) * 0.8; // up to 1.8× at 100% wear
      corrections.push({ factor: "tool_wear", multiplier: Math.round(wearCorr * 100) / 100 });
      correctedRa *= wearCorr;
    }

    // Coolant correction
    if (input.coolant) {
      const coolantCorr = input.coolant === "flood" ? 0.85 : input.coolant === "mist" ? 0.92 : input.coolant === "air" ? 0.98 : 1.0;
      corrections.push({ factor: "coolant", multiplier: coolantCorr });
      correctedRa *= coolantCorr;
    }

    // Speed correction (higher speed generally improves finish)
    if (input.cutting_speed_mmin && input.cutting_speed_mmin > 150) {
      const speedCorr = Math.max(0.8, 1 - (input.cutting_speed_mmin - 150) / 1000);
      corrections.push({ factor: "cutting_speed", multiplier: Math.round(speedCorr * 100) / 100 });
      correctedRa *= speedCorr;
    }

    const ra = Math.max(0.003, correctedRa);
    const range = PROCESS_RANGES[input.process];
    const recommendations: string[] = [];

    if (ra > range.max) {
      recommendations.push("Predicted Ra exceeds typical range — reduce feed or increase tool radius");
    }
    if (input.tool_wear_pct && input.tool_wear_pct > 60) {
      recommendations.push("Tool wear >60% — replace tool for better surface finish");
    }
    if (input.process === "milling" && input.feed_per_tooth_mm && input.feed_per_tooth_mm > 0.2) {
      recommendations.push("High feed per tooth — consider finishing pass with lower feed");
    }

    return {
      ra_um: Math.round(ra * 1000) / 1000,
      rz_um: Math.round(ra * 5 * 1000) / 1000,     // Rz ≈ 5 × Ra (typical)
      rt_um: Math.round(ra * 7 * 1000) / 1000,      // Rt ≈ 7 × Ra
      rq_um: Math.round(ra * 1.11 * 1000) / 1000,   // Rq ≈ 1.11 × Ra (Gaussian)
      process: input.process,
      theoretical_ra_um: Math.round(theoreticalRa * 1000) / 1000,
      correction_factors: corrections,
      achievable_range: { min_ra: range.min, max_ra: range.max },
      recommendations,
    };
  }

  achievable(process?: SurfaceProcess): AchievableFinish[] {
    const processes = process ? [process] : Object.keys(PROCESS_RANGES) as SurfaceProcess[];
    return processes.map(p => {
      const r = PROCESS_RANGES[p];
      return {
        process: p,
        typical_ra_range_um: [r.min, r.max] as [number, number],
        best_ra_um: r.best,
        notes: r.note,
      };
    });
  }

  compare(inputs: SurfaceFinishInput[]): { inputs: SurfaceFinishInput[]; results: SurfaceFinishResult[]; best_index: number } {
    const results = inputs.map(i => this.predict(i));
    let bestIdx = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].ra_um < results[bestIdx].ra_um) bestIdx = i;
    }
    return { inputs, results, best_index: bestIdx };
  }
}

export const surfaceFinishEngine = new SurfaceFinishEngine();
