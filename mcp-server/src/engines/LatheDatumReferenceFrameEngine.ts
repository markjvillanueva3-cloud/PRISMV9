/**
 * LatheDatumReferenceFrameEngine
 * ================================
 *
 * Selects and builds the A|B|C datum reference frame (DRF) for turned
 * parts. For lathe work, good datum selection is critical: the wrong
 * datum forces workholding that cannot meet tolerances, drives multiple
 * refixturing, or produces non-functional parts.
 *
 * Heuristics for turned parts (ASME Y14.5 §4-5):
 *   - Primary (A): the longest accurate cylindrical surface, functional
 *     mating bore/shaft, or the rotational axis derived from largest OD
 *   - Secondary (B): a face perpendicular to A (3 degrees of freedom
 *     removed)
 *   - Tertiary (C): a rotational / clocking feature (keyway, flat,
 *     hole bolt circle)
 *
 * Degrees of freedom removed:
 *   - Primary (axis): 4 DOF (2 translational + 2 rotational)
 *   - Secondary (face): 1 translational (Z)
 *   - Tertiary (clocking): 1 rotational (θ around axis)
 *
 * Datum selection conflicts + warnings when primary ≠ functional
 * mating feature, or when secondary face is non-flat, or when no
 * clocking feature exists.
 *
 * References:
 *   - ASME Y14.5-2018 §4 Datum Reference Frames
 *   - Krulikowski "Fundamentals of Geometric Dimensioning" 3rd ed.
 *
 * @module engines/LatheDatumReferenceFrameEngine
 * @milestone LATHE-PRO-MS8
 */

export type TurnedFeatureKind =
  | "od_cylinder"
  | "id_bore"
  | "face"
  | "chamfer"
  | "groove"
  | "keyway"
  | "flat"
  | "thread"
  | "hole"
  | "hole_pattern";

export interface TurnedFeature {
  id: string;
  kind: TurnedFeatureKind;
  /** Nominal size (diameter for cylinders/bores, width for flats/keys) */
  nominal_mm: number;
  /** Axial length (0 for faces/flats) */
  length_mm?: number;
  /** Is this a functional mating feature? */
  is_mating?: boolean;
  /** Surface finish / form tolerance good enough to be a datum? */
  datum_quality?: "poor" | "adequate" | "good" | "excellent";
  /** Is this geometrically the main rotational axis? */
  axis_defining?: boolean;
}

export interface DRFInput {
  part_id: string;
  features: TurnedFeature[];
  /** Optional pre-assigned datums override auto-selection */
  fixed_primary?: string;
  fixed_secondary?: string;
  fixed_tertiary?: string;
}

export interface DatumAssignment {
  label: "A" | "B" | "C";
  feature_id: string;
  feature_kind: TurnedFeatureKind;
  dof_removed: number;
  reasoning: string;
}

export interface DRFResult {
  assignments: DatumAssignment[];
  total_dof_removed: number;
  fully_constrained: boolean;
  warnings: string[];
  rejected_candidates: Array<{ feature_id: string; reason: string }>;
}

function qualityScore(q?: TurnedFeature["datum_quality"]): number {
  switch (q) {
    case "excellent": return 1.0;
    case "good":      return 0.75;
    case "adequate":  return 0.5;
    case "poor":      return 0.1;
    default:          return 0.5;
  }
}

function findBy(features: TurnedFeature[], id: string): TurnedFeature | undefined {
  return features.find((f) => f.id === id);
}

class LatheDatumReferenceFrameEngineImpl {
  assign(i: DRFInput): DRFResult {
    const warnings: string[] = [];
    const rejected: Array<{ feature_id: string; reason: string }> = [];
    const assignments: DatumAssignment[] = [];

    // ---- Primary (axis) ----
    let primary: TurnedFeature | undefined;
    if (i.fixed_primary) {
      primary = findBy(i.features, i.fixed_primary);
      if (!primary) warnings.push(`fixed_primary '${i.fixed_primary}' not found in features`);
    }
    if (!primary) {
      // Score: axis_defining × mating × length × quality × size
      const axisCandidates = i.features
        .filter((f) => f.kind === "od_cylinder" || f.kind === "id_bore")
        .map((f) => ({
          f,
          score:
            (f.axis_defining ? 2 : 1) *
            (f.is_mating ? 2 : 1) *
            (f.length_mm ?? 1) *
            qualityScore(f.datum_quality) *
            Math.sqrt(Math.max(1, f.nominal_mm)),
        }))
        .sort((a, b) => b.score - a.score);
      primary = axisCandidates[0]?.f;
      for (const c of axisCandidates.slice(1)) {
        rejected.push({
          feature_id: c.f.id,
          reason: `Lower score (${c.score.toFixed(1)}) than selected primary`,
        });
      }
    }
    if (primary) {
      let reason = `${primary.kind} ${primary.nominal_mm}mm`;
      if (primary.is_mating) reason += " (mating)";
      if (primary.axis_defining) reason += " (axis-defining)";
      if (primary.length_mm) reason += ` × ${primary.length_mm}mm long`;
      assignments.push({
        label: "A",
        feature_id: primary.id,
        feature_kind: primary.kind,
        dof_removed: 4,
        reasoning: reason,
      });
      if (!primary.is_mating) {
        warnings.push(
          `Primary datum '${primary.id}' is not marked as a mating feature — confirm this is functionally correct`
        );
      }
      if ((primary.length_mm ?? 0) < (primary.nominal_mm ?? 0) * 0.5) {
        warnings.push(
          `Primary datum L/D ratio < 0.5 — short cylinder is a poor rotational reference`
        );
      }
    } else {
      warnings.push("No suitable primary axis datum found — part may be fundamentally un-inspectable");
    }

    // ---- Secondary (face) ----
    let secondary: TurnedFeature | undefined;
    if (i.fixed_secondary) {
      secondary = findBy(i.features, i.fixed_secondary);
      if (!secondary) warnings.push(`fixed_secondary '${i.fixed_secondary}' not found`);
    }
    if (!secondary) {
      const faceCandidates = i.features
        .filter((f) => f.kind === "face" && f.id !== primary?.id)
        .sort((a, b) => qualityScore(b.datum_quality) - qualityScore(a.datum_quality));
      secondary = faceCandidates[0];
    }
    if (secondary) {
      assignments.push({
        label: "B",
        feature_id: secondary.id,
        feature_kind: secondary.kind,
        dof_removed: 1,
        reasoning: `Face perpendicular to A, quality=${secondary.datum_quality ?? "adequate"}`,
      });
      if (qualityScore(secondary.datum_quality) < 0.5) {
        warnings.push(
          `Secondary datum face '${secondary.id}' has poor quality — may not seat repeatably`
        );
      }
    } else {
      warnings.push("No secondary face datum available — Z-axis location will be loose");
    }

    // ---- Tertiary (clocking) ----
    let tertiary: TurnedFeature | undefined;
    if (i.fixed_tertiary) {
      tertiary = findBy(i.features, i.fixed_tertiary);
      if (!tertiary) warnings.push(`fixed_tertiary '${i.fixed_tertiary}' not found`);
    }
    if (!tertiary) {
      const clockingCandidates = i.features
        .filter(
          (f) =>
            (f.kind === "keyway" || f.kind === "flat" || f.kind === "hole" || f.kind === "hole_pattern") &&
            f.id !== primary?.id &&
            f.id !== secondary?.id
        )
        .sort((a, b) => qualityScore(b.datum_quality) - qualityScore(a.datum_quality));
      tertiary = clockingCandidates[0];
    }
    if (tertiary) {
      assignments.push({
        label: "C",
        feature_id: tertiary.id,
        feature_kind: tertiary.kind,
        dof_removed: 1,
        reasoning: `Clocking / rotational location from ${tertiary.kind}`,
      });
    } else {
      warnings.push(
        "No tertiary clocking feature — part is rotationally symmetric or missing reference; accept if axisymmetric"
      );
    }

    const totalDof = assignments.reduce((s, a) => s + a.dof_removed, 0);
    const fully = totalDof >= 6 || (totalDof >= 5 && !tertiary); // axisymmetric OK at 5

    return {
      assignments,
      total_dof_removed: totalDof,
      fully_constrained: fully,
      warnings,
      rejected_candidates: rejected,
    };
  }

  getStats(): { dof_model: string; rules_applied: string[] } {
    return {
      dof_model: "Primary=4, Secondary=1, Tertiary=1 (total 6 for non-axisymmetric)",
      rules_applied: [
        "Primary: axis-defining × mating × length × quality × sqrt(size)",
        "Secondary: face with best quality",
        "Tertiary: keyway / flat / hole pattern with best quality",
        "Warning if primary L/D < 0.5",
        "Warning if mating flag missing on primary",
        "Warning if secondary face quality poor",
      ],
    };
  }
}

export const latheDatumReferenceFrameEngine = new LatheDatumReferenceFrameEngineImpl();
export type { LatheDatumReferenceFrameEngineImpl };
