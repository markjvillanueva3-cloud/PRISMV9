/**
 * RoughnessConversionEngine — Surface Finish Scale Converter
 *
 * Converts between surface roughness measurement scales:
 * Ra, Rz, Rq (RMS), Rt, CLA (microinch), N-grade (ISO 1302).
 *
 * References:
 *   ISO 4287:1997 — Surface texture parameters
 *   ISO 1302:2002 — Surface texture indication
 *   Machinery's Handbook, 31st Ed., Ch. Surface Texture
 *
 * Actions: roughness_convert
 */

// ============================================================================
// TYPES
// ============================================================================

export type RoughnessScale = "Ra_um" | "Rz_um" | "Rq_um" | "Rt_um" | "Ra_uin" | "N_grade";

/** Roughness Conversion Input configuration/data structure.
 */
export interface RoughnessConversionInput {
  value: number;
  from_scale: RoughnessScale;
  to_scale: RoughnessScale;
}

/** Roughness Conversion Result configuration/data structure.
 */
export interface RoughnessConversionResult {
  input_value: number;
  input_scale: RoughnessScale;
  output_value: number;
  output_scale: RoughnessScale;
  uncertainty_pct: number;
  all_equivalents: Record<RoughnessScale, number>;
  n_grade_label: string;
  typical_process: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * N-grade to Ra(µm) mapping per ISO 1302.
 * N1=0.025, N2=0.05, ..., N12=50
 */
const N_GRADE_RA: Record<number, number> = {
  1: 0.025, 2: 0.05, 3: 0.1, 4: 0.2,
  5: 0.4,   6: 0.8,  7: 1.6, 8: 3.2,
  9: 6.3,  10: 12.5, 11: 25, 12: 50,
};

/**
 * Typical manufacturing process for each N-grade range.
 * Source: Machinery's Handbook, surface texture chapter.
 */
const PROCESS_BY_N: Record<number, string> = {
  1: "Superfinishing, lapping",
  2: "Lapping, honing",
  3: "Honing, fine grinding",
  4: "Grinding, fine honing",
  5: "Grinding, fine reaming",
  6: "Grinding, precision turning",
  7: "Fine turning, fine milling",
  8: "Turning, milling",
  9: "Rough turning, milling",
  10: "Rough milling, drilling",
  11: "Rough machining, sawing",
  12: "Sawing, flame cutting",
};

// ============================================================================
// CONVERSION FACTORS (relative to Ra in µm)
// ============================================================================

/**
 * Approximate conversion ratios (ISO 4287 and empirical):
 *   Rz ≈ 4.0 × Ra  (ISO, typical for machined surfaces)
 *   Rq ≈ 1.11 × Ra (Gaussian surface assumption)
 *   Rt ≈ 6.5 × Ra  (typical machined surface)
 *   Ra(µin) = Ra(µm) × 39.37
 *
 * Uncertainty: Rz/Ra ratio varies 3.5–5.5 depending on process;
 * 4.0 is the standard approximation. Rq/Ra is theoretically exact
 * for Gaussian surfaces (π/2√2 ≈ 1.11).
 */
const TO_RA_UM: Record<RoughnessScale, (v: number) => number> = {
  Ra_um:  (v) => v,
  Rz_um:  (v) => v / 4.0,
  Rq_um:  (v) => v / 1.11,
  Rt_um:  (v) => v / 6.5,
  Ra_uin: (v) => v / 39.37,
  N_grade:(v) => N_GRADE_RA[Math.round(v)] ?? v,
};

const FROM_RA_UM: Record<RoughnessScale, (ra: number) => number> = {
  Ra_um:  (ra) => ra,
  Rz_um:  (ra) => ra * 4.0,
  Rq_um:  (ra) => ra * 1.11,
  Rt_um:  (ra) => ra * 6.5,
  Ra_uin: (ra) => ra * 39.37,
  N_grade:(ra) => raToNGrade(ra),
};

/** Uncertainty by conversion path (% of output value) */
const UNCERTAINTY: Record<RoughnessScale, number> = {
  Ra_um:   0,
  Rz_um:  15,   // Rz/Ra ratio varies 3.5–5.5
  Rq_um:   2,   // Rq/Ra is near-exact for Gaussian
  Rt_um:  20,   // Rt is highly variable
  Ra_uin:  0,   // exact unit conversion
  N_grade: 0,   // discrete scale, no interpolation error
};

// ============================================================================
// HELPERS
// ============================================================================

function raToNGrade(ra_um: number): number {
  if (ra_um <= 0) return 1;
  const entries = Object.entries(N_GRADE_RA).map(([n, r]) => [Number(n), r] as [number, number]);
  let closest = entries[0];
  for (const entry of entries) {
    if (Math.abs(entry[1] - ra_um) < Math.abs(closest[1] - ra_um)) {
      closest = entry;
    }
  }
  return closest[0];
}

function nGradeLabel(ra_um: number): string {
  const n = raToNGrade(ra_um);
  return `N${n} (Ra ${N_GRADE_RA[n]} µm)`;
}

function typicalProcess(ra_um: number): string {
  const n = raToNGrade(ra_um);
  return PROCESS_BY_N[n] ?? "Unknown process";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Roughness Conversion Engine engine/manager.
 */
export class RoughnessConversionEngine {
  convert(input: RoughnessConversionInput): RoughnessConversionResult {
    /** If.
     * @param input.value - input.value
     * @returns void
     */
    if (input.value < 0) {
      throw new Error("Roughness value must be non-negative");
    }

    // Convert input → Ra(µm) as the canonical intermediate
    const ra_um = TO_RA_UM[input.from_scale](input.value);

    // Convert Ra(µm) → target scale
    const output = FROM_RA_UM[input.to_scale](ra_um);

    // Compute combined uncertainty from both conversion steps
    const uncFrom = input.from_scale === "Ra_um" ? 0 : UNCERTAINTY[input.from_scale];
    const uncTo = input.to_scale === "Ra_um" ? 0 : UNCERTAINTY[input.to_scale];
    const combinedUnc = Math.sqrt(uncFrom ** 2 + uncTo ** 2);

    // Build all-equivalents map
    const all: Record<RoughnessScale, number> = {
      Ra_um:   round4(ra_um),
      Rz_um:   round4(FROM_RA_UM.Rz_um(ra_um)),
      Rq_um:   round4(FROM_RA_UM.Rq_um(ra_um)),
      Rt_um:   round4(FROM_RA_UM.Rt_um(ra_um)),
      Ra_uin:  round4(FROM_RA_UM.Ra_uin(ra_um)),
      N_grade: raToNGrade(ra_um),
    };

    return {
      input_value: input.value,
      input_scale: input.from_scale,
      output_value: round4(output),
      output_scale: input.to_scale,
      uncertainty_pct: Math.round(combinedUnc * 10) / 10,
      all_equivalents: all,
      n_grade_label: nGradeLabel(ra_um),
      typical_process: typicalProcess(ra_um),
    };
  }

  /** List all supported scales */
  scales(): RoughnessScale[] {
    return ["Ra_um", "Rz_um", "Rq_um", "Rt_um", "Ra_uin", "N_grade"];
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Roughness Conversion Engine constant.
 */
export const roughnessConversionEngine = new RoughnessConversionEngine();
