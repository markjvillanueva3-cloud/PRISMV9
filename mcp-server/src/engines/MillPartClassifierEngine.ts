/**
 * MS-PRINT-PROGRAM-LOOP, U-PPL-A5
 * MillPartClassifierEngine — 4-family mill part classifier (with thin-wall + tight-tol overrides)
 *
 * Mill counterpart of LathePartClassifierEngine (LATHE-PRO-MS3 U-LPS01).
 * Classifies prismatic / 2.5D-pocket / 3D-mold / thin-wall families from
 * bounding-box geometry + feature signature + stock form. Each family drives:
 *   - Default workholding (vise / soft-jaws / vacuum / fixture-plate / magnetic / tombstone)
 *   - Default toolpath strategy (adaptive-clearing / waterline / scallop / trochoidal / hsm)
 *   - Operation sequence template
 *   - Thermal management approach
 *
 * Pure-transform engine — no fs, no network, no state. Composes shared
 * MATERIAL_KEYWORDS / ISO_GROUP constants from sibling engines but does NOT
 * fork them (per [[feedback_compose_never_fork]]).
 *
 * WIRE-EXEMPT(prism_cad): mill-only data-engine surface. The unit spec lists
 * prism_cad as a candidate but the actual CAD consumer (U-PPL-B3 mill
 * re-optimization batch + U-PPL-D5 .mcx fingerprinting) calls
 * prism_mill:mill_part_classify directly. Wiring to prism_cad would create
 * dead actions; mirrors the WIRE-EXEMPT precedent established by
 * CustomerMaterialMapEngine (U-PPL-C2).
 *
 * Reference: Peter Smid "CNC Programming Handbook" Ch. 5 (Milling Process Planning).
 * Reference: Sandvik "Modern Metal Cutting" Section 4 (Milling).
 * Reference: Machinery's Handbook 31st Ed. — Milling chapter (chip thinning, HSM).
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — locked + sourced
// ═══════════════════════════════════════════════════════════════════════

/** Wall-thickness ratio below which thin-wall override fires. */
export const THIN_WALL_RATIO = 0.08;

/** Aspect ratio (height / min(L,W)) above which prismatic becomes "deep pocket". */
export const DEEP_POCKET_ASPECT = 1.5;

/** Aspect ratio threshold for "tall slim" prismatic (e.g. tombstoned). */
export const TALL_SLIM_ASPECT = 2.0;

/** Tolerance below which workholding upgrades to higher-rigidity option. */
export const TIGHT_TOL_MM = 0.02;

/** Tolerance below which thermal upgrades to rough_cool_finish. */
export const THERMAL_TOL_MM = 0.05;

/** Confidence floor for fallback (no specific family signal). */
export const FALLBACK_CONFIDENCE = 0.50;

/** Secondary-family inclusion window (within N points of winner). */
export const SECONDARY_WINDOW = 15;

/** Maximum feature label length — defensive cap against pathological inputs. */
export const MAX_FEATURE_LABEL_LEN = 256;

/** Pocket depth ÷ dMid above which "deep pocket" candidate fires. */
export const DEEP_POCKET_DEPTH_RATIO = 0.25;

/** Very-thin-plate height threshold for tape-on-sub-plate override (mm). */
export const TAPE_PLATE_MAX_HEIGHT_MM = 3;

/** Minimum face area for tape-on-sub-plate override (mm²). */
export const TAPE_MIN_FACE_AREA_MM2 = 5000;

/**
 * Maximum batch size for classifyBatch / mill_part_classify_batch (memory cap).
 * Exported so the dispatcher schema + tests share the constant
 * (Reviewer B P1-3 anti-drift fix, 2026-05-15).
 */
export const MILL_PART_CLASSIFY_BATCH_MAX = 1000;

// Named scoring constants — see decision tree priority docs.
export const SCORE_THIN_WALL = 92;
export const SCORE_3D_EXPLICIT = 88;
export const SCORE_3D_KEYWORD = 80;
export const SCORE_POCKET_MULTI = 85;
export const SCORE_POCKET_DEEP_ONLY = 78;
export const SCORE_POCKET_SINGLE = 72;
export const SCORE_PRISMATIC_EXPLICIT = 70;
export const SCORE_PRISMATIC_TALL = 65;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 4 mill part families (per U-PPL-A5 spec).
 *
 * NOTE on taxonomy disambiguation (Reviewer B P1.1, 2026-05-15):
 * `MillPartFamily` is the GEOMETRY-ONLY 4-class decision-tree taxonomy used by
 * this classifier — driven by bbox dims + pocket count + 3D-surface signal +
 * wall ratio. It is intentionally INDEPENDENT of `MillTemplateFamily` (defined
 * in `MillPartFamilyTemplateExtractorEngine`), which is the corpus-derived
 * family axis used by `MillPartFamilyMatcherEngine` for template matching.
 * Do NOT unify the two without a documented join table — they describe
 * overlapping concepts at different granularities and the consumer (U-PPL-B3,
 * U-PPL-D5) is responsible for bridging them.
 */
export type MillPartFamily =
  | "prismatic"      // Block / plate / housing — primarily flat surfaces, 2.5D dominant
  | "pocket_2_5d"    // Pocketed plate — vertical-walled pockets, recessed features
  | "mold_3d"        // Mold / die / impeller — 3D contoured surface, scallop-driven
  | "thin_wall";     // Thin-wall part — flex / chatter risk dominates strategy

export type MillStockForm =
  | "plate"          // Sawn flat plate (most common)
  | "block"          // Cube/rectangular block
  | "near_net_cast"  // Near-net casting (skin removal)
  | "near_net_forged"// Near-net forging (skin removal)
  | "weldment"       // Welded fabrication
  | "extrusion";     // Extruded profile

export type MillToolpathStrategy =
  | "adaptive_clearing"  // Constant-engagement roughing (high MRR, low force variation)
  | "waterline"          // Z-level constant finishing (3D contour)
  | "scallop"            // Constant-scallop finishing (3D contour)
  | "trochoidal"         // Small-radius circular pattern (low radial engagement)
  | "hsm"                // High-speed machining (light cuts, high feed)
  | "pocketing_2_5d"     // Standard 2.5D pocket roughing
  | "contour_2_5d"       // 2.5D side milling (profile)
  | "peel_milling";      // Axial peel for slot/pocket walls

export type MillWorkholdingDefault =
  | "vise_standard"      // 6" precision vise — the default
  | "vise_soft_jaws"     // Soft jaws machined to part outline
  | "fixture_plate"      // Sub-plate with locating bushings + clamps
  | "vacuum_chuck"       // Vacuum table for thin plate (controlled pressure)
  | "magnetic_chuck"     // Magnetic chuck (ferrous parts only)
  | "tombstone"          // Tombstone fixture (multi-side, 4th axis)
  | "tape_double_sided"  // Double-sided tape on sub-plate (thin/fragile)
  | "controlled_pressure"; // Low clamp force (thin-wall override)

export type MillThermalApproach =
  | "standard"
  | "rough_cool_finish"
  | "controlled_coolant"
  | "cryogenic_option";

export interface MillPartGeometryInput {
  /** Overall length (longest bbox dim) in mm. Required. */
  length_mm: number;
  /** Overall width (middle bbox dim) in mm. Required. */
  width_mm: number;
  /** Overall height (shortest bbox dim) in mm. Required. */
  height_mm: number;
  /** Minimum wall thickness in mm (for thin-wall detection). */
  min_wall_thickness_mm?: number;
  /** Maximum pocket depth in mm (for 2.5D-pocket detection). */
  max_pocket_depth_mm?: number;
  /** Count of recognized pockets (≥1 → pocket-family candidate). */
  pocket_count?: number;
  /** Has 3D contoured / sculpted surface (mold/die/impeller). */
  has_3d_surface?: boolean;
  /** Has bolt-pattern / mounting holes. */
  has_bolt_pattern?: boolean;
  /** Has thru-holes (drilling-dominant). */
  has_thru_holes?: boolean;
  /** Has threaded holes (tapping required). */
  has_threads?: boolean;
  /** Has counterbores / countersinks. */
  has_counterbores?: boolean;
  /** Stock form (informs roughing + workholding). */
  stock_form?: MillStockForm;
  /** Feature signature keywords (e.g., "mold_cavity", "core_pin", "rib", "boss"). */
  features?: string[];
  /** Tightest tolerance present in mm (drives workholding + thermal upgrades). */
  tightest_tolerance_mm?: number;
  /** Material ISO group (P/M/K/N/S/H). */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Is part magnetically grippable (ferrous + flat bottom)? Enables magnetic-chuck. */
  is_ferrous?: boolean;
  /** Surface area of largest face for vacuum/tape decisions (mm²). */
  largest_face_area_mm2?: number;
}

export interface MillClassificationResult {
  family: MillPartFamily;
  confidence: number;
  reasoning: string[];
  workholding_default: MillWorkholdingDefault;
  workholding_justification: string;
  toolpath_strategy: MillToolpathStrategy;
  toolpath_justification: string;
  sequence_template: string[];
  thermal_approach: MillThermalApproach;
  thin_wall_risk: boolean;
  deep_pocket_risk: boolean;
  secondary_families: MillPartFamily[];
}

// ═══════════════════════════════════════════════════════════════════════
// FAMILY PROFILES — strategy + workholding + sequence defaults per family
// ═══════════════════════════════════════════════════════════════════════

interface FamilyProfile {
  workholding: MillWorkholdingDefault;
  workholding_reason: string;
  strategy: MillToolpathStrategy;
  strategy_reason: string;
  sequence: string[];
  thermal: MillThermalApproach;
}

const FAMILY_PROFILES: Record<MillPartFamily, FamilyProfile> = {
  prismatic: {
    workholding: "vise_standard",
    workholding_reason: "Block/plate fits standard 6\" vise; jaws grip parallel faces",
    strategy: "adaptive_clearing",
    strategy_reason: "Block roughing — constant engagement maximizes MRR with bounded force",
    sequence: [
      "face_top",
      "rough_periphery",
      "drill_holes",
      "tap_threads",
      "finish_periphery",
      "deburr",
      "flip",
      "face_bottom",
    ],
    thermal: "standard",
  },
  pocket_2_5d: {
    workholding: "vise_soft_jaws",
    workholding_reason: "Soft jaws machined to part outline maintain workpiece location through pocket op",
    strategy: "pocketing_2_5d",
    strategy_reason: "Vertical-walled pockets — 2.5D pocketing cycle with ramp/helical entry",
    sequence: [
      "face_top",
      "rough_periphery",
      "rough_pockets_adaptive",
      "drill_holes",
      "tap_threads",
      "finish_pockets",
      "finish_periphery",
      "chamfer_edges",
    ],
    thermal: "rough_cool_finish",
  },
  mold_3d: {
    workholding: "fixture_plate",
    workholding_reason: "Mold blocks bolted to sub-plate; allows multi-side access + repeatable WCS",
    strategy: "waterline",
    strategy_reason: "Z-level constant finishing matches mold cavity geometry; scallop pass for shallow walls",
    sequence: [
      "rough_adaptive",
      "rest_machining",
      "semi_finish_waterline",
      "finish_waterline",
      "finish_scallop_shallow",
      "polish_prep",
      "edm_relief_setup",
    ],
    thermal: "controlled_coolant",
  },
  thin_wall: {
    workholding: "controlled_pressure",
    workholding_reason: "Thin walls flex under standard clamping — use low-pressure vise or vacuum",
    strategy: "trochoidal",
    strategy_reason: "Low radial engagement keeps cutting force off-wall; spring pass for finish",
    sequence: [
      "face_top_light",
      "rough_trochoidal",
      "rest_machining",
      "semi_finish",
      "finish_climb_only",
      "spring_pass",
      "deburr",
    ],
    thermal: "controlled_coolant",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFIER ENGINE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Sentinel for invalid input — never throw silently.
 * Declared as a `function` (not arrow constant) so the `: never` return
 * type propagates as a control-flow narrowing assertion (Reviewer A P0-1,
 * 2026-05-15). Arrow-constant `never` does NOT narrow downstream reads.
 */
function FAIL_LOUD(msg: string): never {
  throw new TypeError(`[MillPartClassifierEngine] ${msg}`);
}

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

class MillPartClassifierEngine {
  /**
   * Classify a mill part into one of 4 families.
   *
   * Decision tree priority:
   *   1. Thin-wall override (wall ratio < THIN_WALL_RATIO → thin_wall)
   *   2. 3D-surface feature signal → mold_3d
   *   3. Pocket count / depth signal → pocket_2_5d
   *   4. Default: prismatic
   * Workholding + strategy are then overridden by tight-tolerance or
   * stock-form rules.
   *
   * @param input  Part geometry + feature description
   * @returns      Classification with workholding, strategy, sequence defaults
   * @throws       TypeError on missing required bbox dimensions or NaN/Infinity
   */
  classify(input: MillPartGeometryInput): MillClassificationResult {
    // ── FAIL-LOUD on invalid input ────────────────────────────────────
    if (input == null || typeof input !== "object" || Array.isArray(input)) {
      FAIL_LOUD("classify() requires an object input");
    }
    if (!isFinitePositive(input.length_mm)) {
      FAIL_LOUD(`length_mm must be a finite positive number (got ${String(input.length_mm)})`);
    }
    if (!isFinitePositive(input.width_mm)) {
      FAIL_LOUD(`width_mm must be a finite positive number (got ${String(input.width_mm)})`);
    }
    if (!isFinitePositive(input.height_mm)) {
      FAIL_LOUD(`height_mm must be a finite positive number (got ${String(input.height_mm)})`);
    }

    const reasoning: string[] = [];
    const candidates: Array<{ family: MillPartFamily; score: number; reasons: string[] }> = [];

    // Sort dims for orientation-independent reasoning.
    const dims = [input.length_mm, input.width_mm, input.height_mm].sort((a, b) => a - b);
    const dMin = dims[0];   // smallest
    const dMid = dims[1];   // middle
    const dMax = dims[2];   // longest

    // P0-2 fix: aspect from SORTED dims (caller may pass length/width/height in
    // any order; we cannot assume Z is the up-axis). A "tall/slim" part is one
    // whose longest dim is far larger than its smallest — invariant under
    // re-orientation. The legacy `height_mm/footprintMin` calc misclassified
    // sticks-on-side because it assumed Z-up convention.
    const aspect = dMax / Math.max(dMin, 1e-6);
    const features = (input.features ?? [])
      .filter((f): f is string => typeof f === "string" && f.length > 0)
      .map(f => f.slice(0, MAX_FEATURE_LABEL_LEN).toLowerCase());
    const pocketCountRaw = input.pocket_count;
    const pocketCount =
      typeof pocketCountRaw === "number" && Number.isFinite(pocketCountRaw) && pocketCountRaw >= 0
        ? Math.floor(pocketCountRaw)
        : 0;
    const stockForm = input.stock_form ?? "plate";

    reasoning.push(`bbox (sorted): ${dMin.toFixed(1)} × ${dMid.toFixed(1)} × ${dMax.toFixed(1)} mm`);
    reasoning.push(`aspect (dMax/dMin): ${aspect.toFixed(2)}`);
    reasoning.push(`pocket_count=${pocketCount}, features=[${features.join(",")}], stock=${stockForm}`);

    // ── Priority 1: Thin-wall override ─────────────────────────────────
    // P0-1 fix: with FAIL_LOUD now narrowing as a function declaration AND
    // isFinitePositive as a type guard, the `as number` casts here are no
    // longer needed inside the narrowed branch.
    const minWallThickness = input.min_wall_thickness_mm;
    const thinWallRatio = isFinitePositive(minWallThickness)
      ? minWallThickness / Math.max(dMin, 1e-6)
      : null;
    // P1-2 fix: use `<=` for thin-wall boundary — industry rule-of-thumb is
    // "wall ≤ 8 % of section" not strict "<". Exactly 0.08 is the
    // canonical thin-wall ratio.
    const isThinWall = thinWallRatio !== null && thinWallRatio <= THIN_WALL_RATIO;
    if (isThinWall) {
      candidates.push({
        family: "thin_wall",
        score: SCORE_THIN_WALL,
        reasons: [
          `min_wall=${minWallThickness}mm vs bbox-min=${dMin.toFixed(1)}mm → ratio=${(thinWallRatio as number).toFixed(3)} ≤ ${THIN_WALL_RATIO} (thin-wall)`,
        ],
      });
    }

    // ── Priority 2: 3D surface signal → mold_3d ────────────────────────
    const moldKeywords = ["mold", "die_cavity", "impeller", "blade", "core", "sculpted", "freeform"];
    if (input.has_3d_surface === true || features.some(f => moldKeywords.some(k => f.includes(k)))) {
      const score = input.has_3d_surface === true ? SCORE_3D_EXPLICIT : SCORE_3D_KEYWORD;
      candidates.push({
        family: "mold_3d",
        score,
        reasons: [
          input.has_3d_surface === true
            ? "has_3d_surface=true → 3D mold/die family"
            : `feature signal: ${features.filter(f => moldKeywords.some(k => f.includes(k))).join(",")}`,
        ],
      });
    }

    // ── Priority 3: 2.5D pocket signal ─────────────────────────────────
    const maxPocketDepth = input.max_pocket_depth_mm;
    const pocketDepth = isFinitePositive(maxPocketDepth) ? maxPocketDepth : 0;
    // P1-3 fix: both hasDeepPocket and deepPocketRisk use dMid (sorted-dim
    // middle) for consistency. The prior raw-dim use of length/width
    // produced inconsistent thresholds depending on caller orientation.
    const hasDeepPocket = pocketDepth > 0 && pocketDepth >= DEEP_POCKET_DEPTH_RATIO * dMid;
    const deepPocketRisk = pocketDepth > 0 && pocketDepth >= DEEP_POCKET_ASPECT * dMid;
    if (pocketCount >= 1 || hasDeepPocket) {
      const score = pocketCount >= 2 ? SCORE_POCKET_MULTI : (hasDeepPocket ? SCORE_POCKET_DEEP_ONLY : SCORE_POCKET_SINGLE);
      // P1-7 fix: clearer reason when depth signal fires without explicit
      // pocket count — flag the inference so operators see the assumption.
      const reason =
        pocketCount >= 1
          ? `pocket_count=${pocketCount}` + (hasDeepPocket ? `, max_depth=${pocketDepth.toFixed(1)}mm` : "")
          : `pocket_count=0 but max_depth=${pocketDepth.toFixed(1)}mm ≥ ${DEEP_POCKET_DEPTH_RATIO}·dMid=${(DEEP_POCKET_DEPTH_RATIO * dMid).toFixed(1)}mm → assumed single pocket from depth signal`;
      candidates.push({
        family: "pocket_2_5d",
        score,
        reasons: [reason],
      });
    }

    // ── Priority 4: Prismatic — explicit boost for flat plate / block ──
    const isPlateOrBlock = stockForm === "plate" || stockForm === "block";
    const prismaticBoost = isPlateOrBlock && pocketCount === 0 && input.has_3d_surface !== true;
    if (prismaticBoost) {
      candidates.push({
        family: "prismatic",
        score: SCORE_PRISMATIC_EXPLICIT,
        reasons: [`${stockForm} stock + no pockets + no 3D surface → prismatic`],
      });
    }

    // ── Priority 5: Tall/slim aspect (tombstoned-friendly) — still prismatic ──
    if (aspect > TALL_SLIM_ASPECT && !isThinWall && input.has_3d_surface !== true) {
      candidates.push({
        family: "prismatic",
        score: SCORE_PRISMATIC_TALL,
        reasons: [`aspect=${aspect.toFixed(2)} > ${TALL_SLIM_ASPECT} (tall/slim) → prismatic`],
      });
    }

    // ── Fallback ───────────────────────────────────────────────────────
    if (candidates.length === 0) {
      candidates.push({
        family: "prismatic",
        score: FALLBACK_CONFIDENCE * 100,
        reasons: ["Fallback: no specific family signal → prismatic"],
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];
    const profile = FAMILY_PROFILES[winner.family];

    // Secondary families (score within SECONDARY_WINDOW of winner).
    // P1-1 fix: explicitly exclude winner.family — the legacy slice(1)+dedupe
    // could still surface the winner if a second candidate with the same
    // family landed in the post-slice array (e.g. both prismatic-boost AND
    // tall/slim push prismatic with different scores).
    const secondaries = candidates
      .slice(1)
      .map(c => c.family)
      .filter((f, i, arr) =>
        arr.indexOf(f) === i &&
        f !== winner.family &&
        (candidates.find(c => c.family === f)?.score ?? 0) >= winner.score - SECONDARY_WINDOW);

    // ── Workholding overrides ──────────────────────────────────────────
    let whDefault = profile.workholding;
    let whJustification = profile.workholding_reason;

    // Thin-wall trumps all
    if (isThinWall && whDefault !== "controlled_pressure" && whDefault !== "vacuum_chuck") {
      whDefault = "vacuum_chuck";
      whJustification = `Thin-wall override: ratio=${(thinWallRatio as number).toFixed(3)} → vacuum chuck (controlled pressure)`;
    }

    // Tight tolerance upgrades vise → fixture plate
    const tightTol = input.tightest_tolerance_mm;
    if (isFinitePositive(tightTol) && tightTol < TIGHT_TOL_MM && whDefault === "vise_standard") {
      whDefault = "fixture_plate";
      whJustification = `Tolerance ${tightTol}mm < ${TIGHT_TOL_MM}mm → fixture-plate for rigidity`;
    }

    // P1-4 fix: magnetic chuck enum was unreachable — make it actually fire
    // when (ferrous + plate + prismatic + standard vise + not thin-wall +
    // not already an upgraded fixture). This makes the magnetic_chuck enum
    // value reachable instead of dead. Operators can still override to vise.
    if (input.is_ferrous === true && stockForm === "plate" && winner.family === "prismatic"
        && whDefault === "vise_standard" && !isThinWall) {
      whDefault = "magnetic_chuck";
      whJustification = "Ferrous plate + prismatic + no thin-wall → magnetic chuck (full-face support, zero clamp distortion)";
    }

    // Tape (very thin plate, ≤ TAPE_PLATE_MAX_HEIGHT_MM, with usable face area)
    // P1-5 fix: add !isThinWall guard — a thin-wall part that defaulted to
    // controlled_pressure must NOT be regressed to tape (tape lacks the
    // off-wall force isolation thin-wall needs).
    const faceArea = input.largest_face_area_mm2;
    if (dMin <= TAPE_PLATE_MAX_HEIGHT_MM && isFinitePositive(faceArea)
        && faceArea > TAPE_MIN_FACE_AREA_MM2
        && whDefault !== "vacuum_chuck"
        && !isThinWall) {
      whDefault = "tape_double_sided";
      whJustification = `Very thin plate (h=${dMin.toFixed(1)}mm ≤ ${TAPE_PLATE_MAX_HEIGHT_MM}mm) + large face area (${faceArea}mm² > ${TAPE_MIN_FACE_AREA_MM2}) → double-sided tape on sub-plate`;
    }

    // ── Strategy overrides ─────────────────────────────────────────────
    let strategy = profile.strategy;
    let strategyJustification = profile.strategy_reason;
    if (isThinWall && strategy !== "trochoidal") {
      strategy = "trochoidal";
      strategyJustification = "Thin-wall override: trochoidal reduces radial engagement off-wall";
    }
    if (deepPocketRisk && strategy === "pocketing_2_5d") {
      strategy = "trochoidal";
      strategyJustification = `Deep pocket (depth=${pocketDepth.toFixed(1)}mm vs dMid=${dMid.toFixed(1)}mm) → trochoidal for chip evacuation`;
    }

    // ── Thermal override ───────────────────────────────────────────────
    // P1-8 fix: S-group (superalloy) is the case where cryogenic helps MOST,
    // including under tight tolerance. Compose the two signals rather than
    // letting the tight-tol branch shadow cryogenic. Order:
    //   1. iso_group=S → cryogenic_option (highest signal)
    //   2. tight tol < THERMAL_TOL_MM AND not already upgraded → rough_cool_finish
    let thermal = profile.thermal;
    if (input.iso_group === "S" && thermal === "standard") {
      thermal = "cryogenic_option";
    } else if (isFinitePositive(tightTol) && tightTol < THERMAL_TOL_MM && thermal === "standard") {
      thermal = "rough_cool_finish";
    }

    return {
      family: winner.family,
      confidence: winner.score / 100,
      reasoning: [...reasoning, ...winner.reasons],
      workholding_default: whDefault,
      workholding_justification: whJustification,
      toolpath_strategy: strategy,
      toolpath_justification: strategyJustification,
      sequence_template: profile.sequence,
      thermal_approach: thermal,
      thin_wall_risk: isThinWall,
      deep_pocket_risk: deepPocketRisk,
      secondary_families: secondaries,
    };
  }

  /** Batch-classify multiple parts. */
  classifyBatch(parts: MillPartGeometryInput[]): MillClassificationResult[] {
    if (!Array.isArray(parts)) {
      FAIL_LOUD("classifyBatch() requires an array input");
    }
    return parts.map(p => this.classify(p));
  }

  /** Get the family profile for a known family without running the classifier. */
  getFamilyProfile(family: MillPartFamily): FamilyProfile & { family: MillPartFamily } {
    const profile = FAMILY_PROFILES[family];
    if (!profile) {
      FAIL_LOUD(`Unknown family: ${String(family)}`);
    }
    return { family, ...profile };
  }

  /** List all 4 families with their default profiles. */
  listFamilies(): Array<{ family: MillPartFamily; workholding: MillWorkholdingDefault; strategy: MillToolpathStrategy; thermal: MillThermalApproach }> {
    return (Object.keys(FAMILY_PROFILES) as MillPartFamily[]).map(f => ({
      family: f,
      workholding: FAMILY_PROFILES[f].workholding,
      strategy: FAMILY_PROFILES[f].strategy,
      thermal: FAMILY_PROFILES[f].thermal,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Zod schemas for dispatcher boundary
// ═══════════════════════════════════════════════════════════════════════

export const MillPartGeometryInputSchema = z
  .object({
    length_mm: z.number().finite().positive(),
    width_mm: z.number().finite().positive(),
    height_mm: z.number().finite().positive(),
    min_wall_thickness_mm: z.number().finite().positive().optional(),
    max_pocket_depth_mm: z.number().finite().nonnegative().optional(),
    pocket_count: z.number().int().nonnegative().optional(),
    has_3d_surface: z.boolean().optional(),
    has_bolt_pattern: z.boolean().optional(),
    has_thru_holes: z.boolean().optional(),
    has_threads: z.boolean().optional(),
    has_counterbores: z.boolean().optional(),
    stock_form: z.enum(["plate", "block", "near_net_cast", "near_net_forged", "weldment", "extrusion"]).optional(),
    features: z.array(z.string().max(MAX_FEATURE_LABEL_LEN)).max(64).optional(),
    tightest_tolerance_mm: z.number().finite().positive().optional(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    is_ferrous: z.boolean().optional(),
    largest_face_area_mm2: z.number().finite().nonnegative().optional(),
  })
  .strict();

export const MillPartFamilySchema = z.enum(["prismatic", "pocket_2_5d", "mold_3d", "thin_wall"]);

// ═══════════════════════════════════════════════════════════════════════
// Singleton + class export
// ═══════════════════════════════════════════════════════════════════════

export { MillPartClassifierEngine };
export const millPartClassifierEngine = new MillPartClassifierEngine();
