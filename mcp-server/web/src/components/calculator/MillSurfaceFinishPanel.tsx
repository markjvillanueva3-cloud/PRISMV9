/**
 * MillSurfaceFinishPanel helpers -- Ra prediction + ISO 4287 grade table
 * ====================================================================
 * MILL-STUDIO-MS0/U-MSTUD-B6 intended API, extracted (oscar, SFC frontend).
 * Replaces the 2026-05-27 NOT_IMPLEMENTED stub (GOAL-TSC-FIX iter16) with the
 * real line-of-cusps surface-finish model the companion test pins.
 *
 * MODEL (theoretical / geometric, NOT a material constant):
 *   Ra ~= driver^2 / (8 * r)        [mm], then *1000 -> um
 *   - ball-nose: driver = stepover (ae), r = ball radius
 *   - face mill: driver = feed-per-tooth (fz), r = insert corner radius
 *   This is the cusp-height -> arithmetic-mean-roughness relation (line of
 *   cusps left by a round-edged tool). It is geometry, not Kienzle/Taylor --
 *   no physics/constants.ts coefficient applies. Real cuts run rougher (runout,
 *   built-up edge, deflection), so this is the BEST-CASE floor -- surfaced with
 *   the "runout will eat this" warning when the headroom is thin.
 *
 * ISO 4287 N-grade ladder is a standard classification table (Ra upper bounds
 * in um), not a tuned constant -- defined locally as reference data.
 *
 * @module components/calculator/MillSurfaceFinishPanel
 */

export type MillFinishMode = "ball-nose" | "face";
export type FinishZone = "mirror" | "fine" | "general" | "rough";

export interface MillSurfaceFinishInput {
  mode: MillFinishMode;
  /** Feed per tooth fz (mm) -- the Ra driver in FACE mode. */
  feed_per_tooth_mm: number;
  /** Stepover ae (mm) -- the Ra driver in BALL-NOSE mode. */
  stepover_mm: number;
  /** Tool radius (mm): ball radius (ball-nose) or insert corner radius (face). */
  tool_radius_mm: number;
  /** Target Ra (um). 0 (or negative) means "no target set". */
  target_ra_um: number;
}

export interface MillSurfaceFinishResult {
  ra_theoretical_um: number;
  iso_grade: string; // "N1".."N12" | ">N12" | "N/A"
  zone: FinishZone;
  /** Fractional headroom (target - Ra) / target. 0 when no target. <0 = over. */
  margin: number;
  recommendation: string;
}

/**
 * ISO 4287 roughness-grade ladder: each grade's Ra UPPER bound (um).
 * A measured Ra is graded to the smallest grade whose bound it does not exceed.
 */
const ISO_4287_LADDER: ReadonlyArray<readonly [grade: string, raUpperUm: number]> = [
  ["N1", 0.025],
  ["N2", 0.05],
  ["N3", 0.1],
  ["N4", 0.2],
  ["N5", 0.4],
  ["N6", 0.8],
  ["N7", 1.6],
  ["N8", 3.2],
  ["N9", 6.3],
  ["N10", 12.5],
  ["N11", 25],
  ["N12", 50],
];

/** Finish-zone Ra upper bounds (um). Above the general bound -> "rough". */
const ZONE_MIRROR_MAX_UM = 0.4;
const ZONE_FINE_MAX_UM = 1.6;
const ZONE_GENERAL_MAX_UM = 6.3;

/** Headroom under target below which real-world runout is likely to blow Ra. */
const TIGHT_MARGIN_FRACTION = 0.2;

/**
 * Theoretical arithmetic-mean roughness Ra (um) for a round-tool cusp:
 *   Ra = driver^2 / (8 * r), in mm, converted to um.
 * A non-positive tool radius is physically undefined -> Infinity (fail LOUD).
 */
export function raTheoreticalUm(driverMm: number, radiusMm: number): number {
  if (!(radiusMm > 0)) return Infinity; // zero / negative / NaN radius
  if (driverMm === 0) return 0;
  const raMm = (driverMm * driverMm) / (8 * radiusMm);
  return raMm * 1000; // mm -> um
}

/** Map a measured Ra (um) to its ISO 4287 N-grade. */
export function isoGradeForRa(raUm: number): string {
  if (!Number.isFinite(raUm) || raUm < 0) return "N/A";
  for (const [grade, upperUm] of ISO_4287_LADDER) {
    if (raUm <= upperUm) return grade;
  }
  return ">N12"; // off the standard ladder (Ra > 50 um)
}

/** Bucket a measured Ra (um) into a coarse finish zone. */
export function classifyFinish(raUm: number): FinishZone {
  if (!Number.isFinite(raUm) || raUm < 0) return "rough"; // invalid -> worst case
  if (raUm <= ZONE_MIRROR_MAX_UM) return "mirror";
  if (raUm <= ZONE_FINE_MAX_UM) return "fine";
  if (raUm <= ZONE_GENERAL_MAX_UM) return "general";
  return "rough";
}

/**
 * Full surface-finish assessment for a milling pass: predicts Ra from the
 * mode-appropriate driver, grades it (ISO 4287 + zone), and reports headroom
 * vs the target with an actionable recommendation.
 */
export function assessMillSurfaceFinish(input: MillSurfaceFinishInput): MillSurfaceFinishResult {
  const driverMm = input.mode === "face" ? input.feed_per_tooth_mm : input.stepover_mm;
  const ra = raTheoreticalUm(driverMm, input.tool_radius_mm);
  const isoGrade = isoGradeForRa(ra);
  const zone = classifyFinish(ra);

  const target = input.target_ra_um;
  let margin: number;
  let recommendation: string;

  if (!(target > 0)) {
    margin = 0;
    recommendation = "No target set -- predicted Ra " + fmt(ra) + " um (" + isoGrade + ").";
  } else {
    margin = (target - ra) / target;
    if (ra > target) {
      // Over target: name the corrective drivers (reduce the cusp driver or
      // grow the radius -- both shrink Ra = driver^2/(8r)).
      recommendation =
        "Reduce stepover/feed or increase tool radius -- predicted Ra " +
        fmt(ra) + " um exceeds target " + fmt(target) + " um.";
    } else if (margin > TIGHT_MARGIN_FRACTION) {
      recommendation =
        "Comfortable headroom -- predicted Ra " + fmt(ra) + " um vs target " +
        fmt(target) + " um (" + Math.round(margin * 100) + "% under).";
    } else {
      recommendation =
        "Tight margin -- runout will eat this. Predicted Ra " + fmt(ra) +
        " um vs target " + fmt(target) + " um (" + Math.round(margin * 100) + "% under).";
    }
  }

  return {
    ra_theoretical_um: ra,
    iso_grade: isoGrade,
    zone,
    margin,
    recommendation,
  };
}

function fmt(x: number): string {
  return Number.isFinite(x) ? x.toFixed(3).replace(/\.?0+$/, "") : String(x);
}
