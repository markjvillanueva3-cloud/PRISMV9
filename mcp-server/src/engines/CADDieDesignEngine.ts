/**
 * CADDieDesignEngine -- first-class die-design geometry for PRISM CAD (JM Die's core trade):
 * blanking and piercing die/punch dimensions from a feature size + material thickness + die
 * clearance. Closes the coverage-meter "die-design: absent" gap.
 *
 * Die clearance per side = (clearancePctPerSide / 100) * materialThickness. The clearance percentage
 * is a CALLER-SUPPLIED parameter (material-dependent, e.g. ~5-10%/side for cold-rolled steel) -- it is
 * NEVER inlined here (a material clearance table is data, not an engine constant). Blanking: the BLANK
 * is the part, the punch matches the blank, the die is larger by 2x clearance. Piercing: the HOLE is
 * the part, the die matches the hole, the punch is smaller by 2x clearance.
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw), units mm.
 */

/** Die-design operation mode. */
export type DieMode = "blank" | "pierce";

/** Result of a die-design clearance computation. */
export interface DieResult {
  mode: DieMode;
  success: boolean;
  /** The finished feature size (blank or hole) in mm. */
  feature_dim_mm: number;
  /** Computed die opening dimension (mm). */
  die_opening_mm: number;
  /** Computed punch dimension (mm). */
  punch_dim_mm: number;
  /** Diametral/edge clearance per side (mm). */
  clearance_per_side_mm: number;
  cadquery_op: string;
  notes: string[];
}

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function fail(mode: DieMode, featureDim: number, note: string): DieResult {
  return { mode, success: false, feature_dim_mm: featureDim, die_opening_mm: 0, punch_dim_mm: 0, clearance_per_side_mm: 0, cadquery_op: "", notes: [note] };
}

/** Die-design engine. */
export class CADDieDesignEngine {
  /** Per-side clearance from a clearance percentage of material thickness. */
  private perSide(thicknessMm: number, clearancePctPerSide: number): number {
    return (clearancePctPerSide / 100) * thicknessMm;
  }

  /** Blanking: blank = part. punch matches the blank; die is larger by 2x clearance. */
  blank(blankDimMm: number, thicknessMm: number, clearancePctPerSide: number): DieResult {
    if (!allFinite(blankDimMm, thicknessMm, clearancePctPerSide)) return fail("blank", blankDimMm, "non-finite input");
    if (blankDimMm <= 0 || thicknessMm <= 0) return fail("blank", blankDimMm, "non-positive dimension");
    if (clearancePctPerSide <= 0 || clearancePctPerSide >= 50) return fail("blank", blankDimMm, "clearance%/side must be in (0,50)");
    const c = this.perSide(thicknessMm, clearancePctPerSide);
    return {
      mode: "blank", success: true, feature_dim_mm: blankDimMm, die_opening_mm: blankDimMm + 2 * c, punch_dim_mm: blankDimMm,
      clearance_per_side_mm: c, cadquery_op: `.rect(${blankDimMm + 2 * c}, ${blankDimMm + 2 * c})  # blank die opening, mm`, notes: [],
    };
  }

  /** Piercing: hole = part. die matches the hole; punch is smaller by 2x clearance. */
  pierce(holeDimMm: number, thicknessMm: number, clearancePctPerSide: number): DieResult {
    if (!allFinite(holeDimMm, thicknessMm, clearancePctPerSide)) return fail("pierce", holeDimMm, "non-finite input");
    if (holeDimMm <= 0 || thicknessMm <= 0) return fail("pierce", holeDimMm, "non-positive dimension");
    if (clearancePctPerSide <= 0 || clearancePctPerSide >= 50) return fail("pierce", holeDimMm, "clearance%/side must be in (0,50)");
    const c = this.perSide(thicknessMm, clearancePctPerSide);
    const punch = holeDimMm - 2 * c;
    if (punch <= 0) return fail("pierce", holeDimMm, "clearance exceeds hole -- punch dimension non-positive");
    return {
      mode: "pierce", success: true, feature_dim_mm: holeDimMm, die_opening_mm: holeDimMm, punch_dim_mm: punch,
      clearance_per_side_mm: c, cadquery_op: `.hole(${punch})  # pierce punch, mm`, notes: [],
    };
  }

  /** Dispatcher entrypoint: route a params object to blank/pierce. */
  apply(params: Record<string, unknown>): DieResult {
    const mode = String(params.mode ?? "");
    const n = (k: string): number => Number(params[k]);
    switch (mode) {
      case "blank": return this.blank(n("feature_dim_mm"), n("thickness_mm"), n("clearance_pct_per_side"));
      case "pierce": return this.pierce(n("feature_dim_mm"), n("thickness_mm"), n("clearance_pct_per_side"));
      default: return fail("blank", Number(params.feature_dim_mm) || 0, `unknown die mode '${mode}' (expected blank|pierce)`);
    }
  }
}

export const cadDieDesignEngine = new CADDieDesignEngine();
