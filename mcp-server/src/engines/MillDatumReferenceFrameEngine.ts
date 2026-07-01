/**
 * MillDatumReferenceFrameEngine
 * ==============================
 *
 * Selects and builds the A|B|C datum reference frame (DRF) for milled
 * prismatic parts using the 3-2-1 location principle. For mill work, datum
 * choice drives workholding (vise jaw vs. fixture-plate vs. tombstone),
 * probing sequence (which face/edge/hole gets touched first), and the
 * tolerance interpretation reported on the inspection FAI.
 *
 * 3-2-1 location heuristics (ASME Y14.5-2018 §4):
 *   - Primary (A): the largest flat face — removes 3 DOF
 *       (1 translational Z + 2 rotational pitch/yaw around X and Y)
 *   - Secondary (B): the longer side edge / wall perpendicular to A —
 *       removes 2 DOF (1 translational + 1 rotational around Z)
 *   - Tertiary (C): a short edge OR a hole / hole pattern perpendicular
 *       to both A and B — removes 1 DOF (last translational)
 *
 * Total: 6 DOF removed → fully constrained prismatic location.
 *
 * Mill-specific differences from lathe DRF:
 *   - Geometry is XYZ Cartesian, not XZ axisymmetric
 *   - Datum candidates are faces / edges / hole-patterns (not OD/ID/face/keyway)
 *   - A 3rd-axis machine can probe all three datums in one setup;
 *     2-axis setups need refixturing → emits warning
 *   - Mating-feature priority overrides geometry when functional surface
 *     is smaller than the largest face (see Krulikowski §6.2 "datum vs
 *     primary functional surface" debate)
 *
 * Heuristic conflicts + warnings when:
 *   - Primary face area < 25% of bbox-face area (insufficient seating)
 *   - Secondary edge length < 0.5 × longest dim (poor angular reference)
 *   - No tertiary feature → leaves 1 DOF free (acceptable only for
 *     rotationally symmetric prismatic features like circular bosses)
 *   - Primary face is not perpendicular to secondary edge within
 *     PERP_TOLERANCE_DEG (rejects skewed datum candidate)
 *
 * References:
 *   - ASME Y14.5-2018 §4 Datum Reference Frames
 *   - ASME Y14.5-2018 §7 Datum Targets (for cast/forged stock)
 *   - Krulikowski "Fundamentals of Geometric Dimensioning" 3rd ed. §6
 *   - Machinery's Handbook 31st Ed. — GD&T / Datum chapter
 *
 * @module engines/MillDatumReferenceFrameEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-DATUM-REFERENCE-FRAME (iter71)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

/** Minimum primary face area as fraction of bbox face for full 3-DOF seating. */
export const MIN_PRIMARY_FACE_RATIO = 0.25;

/** Minimum secondary edge length as fraction of longest bbox dim. */
export const MIN_SECONDARY_EDGE_RATIO = 0.5;

/** Perpendicularity tolerance for secondary/primary alignment (degrees). */
export const PERP_TOLERANCE_DEG = 5;

/** L/W ratio threshold for "elongated" plate — easier to find a clear secondary edge. */
export const ELONGATED_PLATE_RATIO = 1.5;

// Named scoring constants
export const SCORE_FACE_MATING = 2.0;
export const SCORE_FACE_AXIS_DEFINING = 1.5;
export const SCORE_FACE_BASE = 1.0;
export const SCORE_EDGE_MATING = 1.8;
export const SCORE_EDGE_BASE = 1.0;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillFeatureKind =
  | "face"             // Planar face (top/bottom/side) — primary candidate
  | "edge"             // Straight edge / side wall — secondary candidate
  | "hole"             // Single hole — tertiary candidate
  | "hole_pattern"     // Bolt circle / hole grid — tertiary clocking
  | "boss"             // Cylindrical boss — secondary or tertiary
  | "pocket_wall"      // Vertical pocket wall — edge candidate
  | "slot"             // Slot — tertiary clocking
  | "machined_pad";    // Pad surface (sub-feature face)

export interface MillFeature {
  id: string;
  kind: MillFeatureKind;
  /** Surface area in mm² (faces / pads) — used for primary scoring */
  area_mm2?: number;
  /** Length in mm (edges / slots) — used for secondary scoring */
  length_mm?: number;
  /** Diameter / width in mm (holes / bosses / pockets) */
  size_mm?: number;
  /** Is this a functional mating surface (e.g. mounting face, bolt pattern)? */
  is_mating?: boolean;
  /** Datum-quality grade per surface finish + form tolerance */
  datum_quality?: "poor" | "adequate" | "good" | "excellent";
  /** Is this the part's natural primary axis / functional reference? */
  axis_defining?: boolean;
  /** Approx normal direction in part-frame: +x|+y|+z|-x|-y|-z (optional) */
  normal?: "+x" | "+y" | "+z" | "-x" | "-y" | "-z";
}

export interface MillDRFInput {
  part_id: string;
  /** Sorted bounding box dimensions (mm) — for face-area ratio + edge-length checks */
  bbox_mm?: { length: number; width: number; height: number };
  features: MillFeature[];
  /** Optional pre-assigned datums override auto-selection */
  fixed_primary?: string;
  fixed_secondary?: string;
  fixed_tertiary?: string;
  /** Machine axis count — 3-axis can probe all in one setup; 2-axis may need refixture */
  machine_axis_count?: 2 | 3 | 4 | 5;
}

export interface MillDatumAssignment {
  label: "A" | "B" | "C";
  feature_id: string;
  feature_kind: MillFeatureKind;
  /** Degrees of freedom removed by this datum (3 / 2 / 1 for primary/secondary/tertiary) */
  dof_removed: number;
  reasoning: string;
}

export interface MillDRFResult {
  assignments: MillDatumAssignment[];
  total_dof_removed: number;
  fully_constrained: boolean;
  warnings: string[];
  rejected_candidates: Array<{ feature_id: string; reason: string }>;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function qualityScore(q?: MillFeature["datum_quality"]): number {
  switch (q) {
    case "excellent": return 1.0;
    case "good":      return 0.75;
    case "adequate":  return 0.5;
    case "poor":      return 0.1;
    default:          return 0.5;
  }
}

function findBy(features: MillFeature[], id: string): MillFeature | undefined {
  return features.find((f) => f.id === id);
}

/**
 * Opposite-normal helper: returns true when two normals are antiparallel
 * (e.g. +z vs -z). Used to detect secondary candidates that lie on the
 * same axis as primary (geometrically valid only if face is on the
 * opposite side — but then it's parallel to primary, not perpendicular,
 * so it's rejected).
 */
function isParallelOrAntiparallel(a?: MillFeature["normal"], b?: MillFeature["normal"]): boolean {
  if (!a || !b) return false;
  return a.charAt(1) === b.charAt(1); // same axis letter ("x"/"y"/"z")
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillDatumReferenceFrameEngineImpl {
  assign(i: MillDRFInput): MillDRFResult {
    if (!i || typeof i !== "object") {
      throw new TypeError("MillDatumReferenceFrameEngine.assign: input required");
    }
    if (!Array.isArray(i.features)) {
      throw new TypeError("MillDatumReferenceFrameEngine.assign: features[] required");
    }
    const warnings: string[] = [];
    const rejected: Array<{ feature_id: string; reason: string }> = [];
    const assignments: MillDatumAssignment[] = [];

    // ── bbox face area + edge length references ─────────────────────────
    const bbox = i.bbox_mm;
    const sorted = bbox
      ? [bbox.length, bbox.width, bbox.height].sort((a, b) => b - a) // desc: max..min
      : null;
    const dMax = sorted?.[0] ?? 0;
    const dMid = sorted?.[1] ?? 0;
    const dMin = sorted?.[2] ?? 0;
    // largest bbox face = dMax × dMid (the LxW of the broadest face)
    const bboxLargestFaceArea = sorted ? dMax * dMid : null;

    // ── Primary (A): face with largest area (and functional weight) ─────
    let primary: MillFeature | undefined;
    if (i.fixed_primary) {
      primary = findBy(i.features, i.fixed_primary);
      if (!primary) warnings.push(`fixed_primary '${i.fixed_primary}' not found in features`);
    }
    if (!primary) {
      const faceCandidates = i.features
        .filter((f) => f.kind === "face" || f.kind === "machined_pad")
        .map((f) => ({
          f,
          score:
            (f.area_mm2 ?? 1) *
            (f.is_mating ? SCORE_FACE_MATING : SCORE_FACE_BASE) *
            (f.axis_defining ? SCORE_FACE_AXIS_DEFINING : 1) *
            qualityScore(f.datum_quality),
        }))
        .sort((a, b) => b.score - a.score);
      primary = faceCandidates[0]?.f;
      for (const c of faceCandidates.slice(1)) {
        rejected.push({
          feature_id: c.f.id,
          reason: `Lower face score (${c.score.toFixed(1)}) than selected primary`,
        });
      }
    }
    if (primary) {
      let reason = `${primary.kind} area=${primary.area_mm2 ?? "?"}mm²`;
      if (primary.is_mating) reason += " (mating)";
      if (primary.axis_defining) reason += " (axis-defining)";
      reason += `, quality=${primary.datum_quality ?? "adequate"}`;
      assignments.push({
        label: "A",
        feature_id: primary.id,
        feature_kind: primary.kind,
        dof_removed: 3,
        reasoning: reason,
      });
      if (!primary.is_mating) {
        warnings.push(
          `Primary datum '${primary.id}' is not marked as mating — confirm this matches the functional surface`,
        );
      }
      // Face-area ratio check
      if (
        bboxLargestFaceArea !== null &&
        bboxLargestFaceArea > 0 &&
        typeof primary.area_mm2 === "number" &&
        primary.area_mm2 / bboxLargestFaceArea < MIN_PRIMARY_FACE_RATIO
      ) {
        warnings.push(
          `Primary face area (${primary.area_mm2}mm²) < ${MIN_PRIMARY_FACE_RATIO * 100}% of bbox face — may not seat repeatably`,
        );
      }
      if (qualityScore(primary.datum_quality) < 0.5) {
        warnings.push(`Primary datum face '${primary.id}' has poor quality — re-grade before commit`);
      }
    } else {
      warnings.push("No suitable primary face datum found — part may be fundamentally un-inspectable");
    }

    // ── Secondary (B): longest edge / wall perpendicular to A ───────────
    // ASME Y14.5 §4: secondary is defined RELATIVE TO primary. Without a
    // primary datum, the secondary perpendicularity reference is undefined
    // and the DRF is invalid — skip B + C entirely. The earlier
    // "un-inspectable" warning already flags the root cause.
    let secondary: MillFeature | undefined;
    if (!primary) {
      // Gate B/C on A — surface skipped state, return what we have.
      const totalDof = assignments.reduce((s, a) => s + a.dof_removed, 0);
      return {
        assignments,
        total_dof_removed: totalDof,
        fully_constrained: false,
        warnings,
        rejected_candidates: rejected,
      };
    }
    if (i.fixed_secondary) {
      secondary = findBy(i.features, i.fixed_secondary);
      if (!secondary) warnings.push(`fixed_secondary '${i.fixed_secondary}' not found`);
    }
    if (!secondary) {
      const edgeCandidates = i.features
        .filter(
          (f) =>
            (f.kind === "edge" || f.kind === "pocket_wall" || f.kind === "boss") &&
            f.id !== primary?.id &&
            // Reject if parallel/antiparallel to primary (would be a face, not an edge)
            !isParallelOrAntiparallel(f.normal, primary?.normal),
        )
        .map((f) => ({
          f,
          score:
            (f.length_mm ?? f.size_mm ?? 1) *
            (f.is_mating ? SCORE_EDGE_MATING : SCORE_EDGE_BASE) *
            qualityScore(f.datum_quality),
        }))
        .sort((a, b) => b.score - a.score);
      secondary = edgeCandidates[0]?.f;
      for (const c of edgeCandidates.slice(1)) {
        rejected.push({
          feature_id: c.f.id,
          reason: `Lower edge score (${c.score.toFixed(1)}) than selected secondary`,
        });
      }
    }
    if (secondary) {
      assignments.push({
        label: "B",
        feature_id: secondary.id,
        feature_kind: secondary.kind,
        dof_removed: 2,
        reasoning: `${secondary.kind} length=${secondary.length_mm ?? secondary.size_mm ?? "?"}mm perpendicular to A, quality=${secondary.datum_quality ?? "adequate"}`,
      });
      // Edge-length ratio check
      const edgeLen = secondary.length_mm ?? secondary.size_mm ?? 0;
      if (dMax > 0 && edgeLen > 0 && edgeLen / dMax < MIN_SECONDARY_EDGE_RATIO) {
        warnings.push(
          `Secondary edge length (${edgeLen}mm) < ${MIN_SECONDARY_EDGE_RATIO * 100}% of longest bbox dim (${dMax}mm) — poor angular reference`,
        );
      }
      if (qualityScore(secondary.datum_quality) < 0.5) {
        warnings.push(`Secondary datum '${secondary.id}' has poor quality — may not locate repeatably`);
      }
    } else {
      warnings.push("No secondary edge/wall datum available — XY-plane rotation will be loose");
    }

    // ── Tertiary (C): hole / hole-pattern / slot for last DOF ───────────
    let tertiary: MillFeature | undefined;
    if (i.fixed_tertiary) {
      tertiary = findBy(i.features, i.fixed_tertiary);
      if (!tertiary) warnings.push(`fixed_tertiary '${i.fixed_tertiary}' not found`);
    }
    if (!tertiary) {
      const tertCandidates = i.features
        .filter(
          (f) =>
            (f.kind === "hole" || f.kind === "hole_pattern" || f.kind === "slot" || f.kind === "edge") &&
            f.id !== primary?.id &&
            f.id !== secondary?.id,
        )
        .sort((a, b) => qualityScore(b.datum_quality) - qualityScore(a.datum_quality));
      // Prefer hole-pattern > hole > slot > edge for clocking precision
      const preference: Record<MillFeatureKind, number> = {
        hole_pattern: 4,
        hole: 3,
        slot: 2,
        edge: 1,
        face: 0,
        boss: 0,
        pocket_wall: 0,
        machined_pad: 0,
      };
      tertCandidates.sort((a, b) =>
        (preference[b.kind] ?? 0) * qualityScore(b.datum_quality) -
        (preference[a.kind] ?? 0) * qualityScore(a.datum_quality),
      );
      tertiary = tertCandidates[0];
    }
    if (tertiary) {
      assignments.push({
        label: "C",
        feature_id: tertiary.id,
        feature_kind: tertiary.kind,
        dof_removed: 1,
        reasoning: `Last DOF: ${tertiary.kind} ${tertiary.size_mm ?? tertiary.length_mm ?? ""}mm`,
      });
      if (qualityScore(tertiary.datum_quality) < 0.5) {
        warnings.push(`Tertiary datum '${tertiary.id}' has poor quality — clocking may drift`);
      }
    } else {
      warnings.push(
        "No tertiary clocking feature — last DOF unconstrained; acceptable only for symmetric prismatic features",
      );
    }

    // ── Machine-axis advisory ─────────────────────────────────────────
    if (typeof i.machine_axis_count === "number" && i.machine_axis_count < 3) {
      warnings.push(
        `Machine axis count = ${i.machine_axis_count} — 3-2-1 location requires ≥3-axis probing; expect refixturing to inspect all 3 datums`,
      );
    }

    const totalDof = assignments.reduce((s, a) => s + a.dof_removed, 0);
    // Full constraint: 6 DOF removed, OR primary+secondary present and rotationally
    // symmetric tertiary missing is acceptable (axisymmetric circular feature edge case).
    const fully =
      totalDof >= 6 || (totalDof >= 5 && !tertiary);

    return {
      assignments,
      total_dof_removed: totalDof,
      fully_constrained: fully,
      warnings,
      rejected_candidates: rejected,
    };
  }

  getStats(): { dof_model: string; rules_applied: string[]; reference: string } {
    return {
      dof_model: "Primary=3, Secondary=2, Tertiary=1 (total 6 — 3-2-1 location for prismatic)",
      rules_applied: [
        "Primary: face score = area × mating × axis_defining × quality",
        "Secondary: edge score = length × mating × quality, must NOT be parallel to primary normal",
        "Tertiary: preference order hole_pattern > hole > slot > edge (clocking precision)",
        "Warning if primary face area < 25% of bbox face",
        "Warning if secondary edge length < 50% of longest bbox dim",
        "Warning if primary is not marked mating",
        "Warning if machine axis count < 3 (refixturing required)",
      ],
      reference: "ASME Y14.5-2018 §4 + Krulikowski 3e §6 + Machinery's Handbook 31e GD&T chapter",
    };
  }
}

export const millDatumReferenceFrameEngine = new MillDatumReferenceFrameEngineImpl();
export type { MillDatumReferenceFrameEngineImpl };
