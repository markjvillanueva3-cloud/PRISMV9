/**
 * WorkholdingSurfaceInferenceEngine — CAMX-MS21/U03
 *
 * Automatically identifies workholding-suitable surfaces from part geometry,
 * tracks surface survival through machining sequences, scores suitability
 * for each workholding method, and detects dead-end operation orderings
 * where a needed clamping surface is removed before it is used.
 *
 * Algorithms:
 *   1. Surface classification — planar/cylindrical/conical discriminator
 *   2. Suitability scoring — weighted multi-criteria (area, flatness, parallelism, depth)
 *   3. Dependency graph — op → surfaces_removed, surfaces_needed_for_clamping
 *   4. Dead-end detection — topological scan for forward conflicts
 *   5. Setup sequence recommendation — greedy assignment by suitability score
 *
 * Physics thresholds (from Rong & Zhu "Computer-Aided Fixture Design", Ch.4-6):
 *   Vise:   area > 400mm², flatness < 0.05mm, opposing faces, depth >= 10mm
 *   Chuck:  cylindrical, 10mm <= dia <= 500mm, length > 15mm, conc < 0.025mm
 *   Vacuum: flat, area > 2500mm², no through-holes, continuous seal
 *   Fixture plate: flat bottom, min 4 clamp points, bolt access
 *   Soft jaw: cylindrical or prismatic, conformable shape
 *
 * Actions: infer_surfaces, track_survival, detect_dead_ends
 *
 * @shortcode E1085
 * @module engines/WorkholdingSurfaceInferenceEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Surface geometry type. */
export type SurfaceType = "planar" | "cylindrical" | "conical" | "spherical" | "freeform";

/** Workholding method that can be applied to a surface. */
export type WorkholdingMethod = "vise" | "chuck" | "collet" | "vacuum" | "fixture_plate" | "soft_jaw" | "magnetic";

/** GD&T datum label. */
export type DatumLabel = "A" | "B" | "C" | "D" | "E" | "F";

/** Face orientation for surface location on bounding box. */
export type FaceOrientation = "top" | "bottom" | "front" | "back" | "left" | "right" | "internal";

/**
 * A geometric surface on the part. This is the primary input element.
 * Each surface represents a distinct geometric face on the workpiece.
 */
export interface PartSurface {
  id: string;
  type: SurfaceType;
  normal: { x: number; y: number; z: number };
  area_mm2: number;
  position: { x: number; y: number; z: number };
  flatness_mm?: number;
  diameter_mm?: number;
  length_mm?: number;
  concentricity_mm?: number;
  depth_mm?: number;
  face: FaceOrientation;
  datum?: DatumLabel;
  has_through_holes?: boolean;
  is_continuous?: boolean;
  opposing_surface_id?: string;
  bolt_hole_count?: number;
}

/**
 * A machining operation that affects part surfaces.
 */
export interface MachiningOp {
  id: string;
  name: string;
  sequence_index: number;
  surfaces_removed: string[];
  surfaces_created?: string[];
  clamping_surfaces_needed: string[];
  workholding_method?: WorkholdingMethod;
  cutting_force_N?: number;
}

/**
 * Input for the surface inference analysis.
 */
export interface SurfaceInferenceInput {
  surfaces: PartSurface[];
  operations?: MachiningOp[];
  part_material?: string;
  part_weight_N?: number;
  max_cutting_force_N?: number;
}

/**
 * A viable workholding surface with scored methods.
 */
export interface ViableSurface {
  surface_id: string;
  type: SurfaceType;
  suitability_score: number;
  workholding_methods: ScoredMethod[];
  at_risk_after_operation: string | null;
  is_datum: boolean;
  datum_label: DatumLabel | null;
}

/**
 * A workholding method scored for a particular surface.
 */
export interface ScoredMethod {
  method: WorkholdingMethod;
  score: number;
  meets_threshold: boolean;
  limiting_factor: string | null;
}

/**
 * A dead-end condition where an operation sequence is self-defeating.
 */
export interface DeadEnd {
  operation: string;
  removes_surface: string;
  needed_by_operation: string;
  needed_at_sequence_index: number;
  resolution: string;
}

/**
 * A recommended setup within the machining sequence.
 */
export interface RecommendedSetup {
  setup_id: string;
  workholding_method: WorkholdingMethod;
  clamping_surfaces: string[];
  operations: string[];
  suitability_score: number;
}

/**
 * Full output of the surface inference engine.
 */
export interface SurfaceInferenceResult {
  viable_surfaces: ViableSurface[];
  dead_ends: DeadEnd[];
  recommended_setup_sequence: RecommendedSetup[];
  warnings: string[];
  surface_count: number;
  viable_count: number;
  dead_end_count: number;
  formula: string;
}

/**
 * Output from survival tracking across operations.
 */
export interface SurvivalTrackingResult {
  surface_status: SurfaceStatus[];
  operations_analyzed: number;
  surfaces_at_risk: number;
  warnings: string[];
}

/**
 * Status of a single surface through the operation sequence.
 */
export interface SurfaceStatus {
  surface_id: string;
  surviving: boolean;
  removed_by_operation: string | null;
  removed_at_sequence_index: number | null;
  used_for_clamping_in: string[];
}

// ============================================================================
// CONSTANTS — Workholding Suitability Thresholds
// ============================================================================

/** Minimum area for vise clamping (mm²). Rong & Zhu Ch.4 recommends >= 400. */
const VISE_MIN_AREA_MM2 = 400;

/** Maximum flatness deviation for vise clamping (mm). */
const VISE_MAX_FLATNESS_MM = 0.05;

/** Minimum jaw depth for secure vise grip (mm). */
const VISE_MIN_DEPTH_MM = 10;

/** Minimum diameter for chuck/collet clamping (mm). */
const CHUCK_MIN_DIAMETER_MM = 10;

/** Maximum diameter for chuck/collet clamping (mm). */
const CHUCK_MAX_DIAMETER_MM = 500;

/** Minimum cylindrical length for chuck clamping (mm). */
const CHUCK_MIN_LENGTH_MM = 15;

/** Maximum concentricity for chuck suitability (mm). */
const CHUCK_MAX_CONCENTRICITY_MM = 0.025;

/** Minimum area for vacuum fixture seal (mm²). */
const VACUUM_MIN_AREA_MM2 = 2500;

/** Minimum clamping points for fixture plate. */
const FIXTURE_PLATE_MIN_CLAMP_POINTS = 4;

/** Collet max diameter — collets are for smaller diameters than chucks. */
const COLLET_MAX_DIAMETER_MM = 100;

/** Collet min diameter. */
const COLLET_MIN_DIAMETER_MM = 3;

/** Magnetic chuck minimum area (mm²). */
const MAGNETIC_MIN_AREA_MM2 = 1000;

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

/** Weights for vise suitability sub-scores. */
const VISE_WEIGHTS = {
  area: 0.30,
  flatness: 0.25,
  opposing: 0.25,
  depth: 0.20,
} as const;

/** Weights for chuck suitability sub-scores. */
const CHUCK_WEIGHTS = {
  diameter: 0.30,
  length: 0.30,
  concentricity: 0.25,
  surface_quality: 0.15,
} as const;

/** Weights for vacuum suitability sub-scores. */
const VACUUM_WEIGHTS = {
  area: 0.35,
  continuity: 0.30,
  no_holes: 0.25,
  flatness: 0.10,
} as const;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * WorkholdingSurfaceInferenceEngine identifies, scores, and validates
 * workholding surfaces throughout a machining sequence.
 */
export class WorkholdingSurfaceInferenceEngine {

  // --------------------------------------------------------------------------
  // Action: infer_surfaces
  // --------------------------------------------------------------------------

  /**
   * Analyze part geometry to identify all workholding-viable surfaces,
   * score each for applicable methods, detect dead-ends, and recommend
   * setup sequence.
   *
   * @param input - Part surfaces and optional machining operations
   * @returns Full inference result with viable surfaces, dead-ends, setups
   */
  inferSurfaces(input: SurfaceInferenceInput): SurfaceInferenceResult {
    const warnings: string[] = [];
    const { surfaces, operations = [] } = input;

    if (surfaces.length === 0) {
      warnings.push("No surfaces provided — cannot infer workholding");
      return this.emptyResult(warnings);
    }

    log.info(`[WorkholdingSurfaceInference] Analyzing ${surfaces.length} surfaces, ${operations.length} operations`);

    // 1. Classify and score each surface for all workholding methods
    const viableSurfaces = this.classifyAndScore(surfaces, warnings);

    // 2. Track surface survival through machining sequence
    const survivalMap = operations.length > 0
      ? this.buildSurvivalMap(surfaces, operations)
      : new Map<string, string | null>();

    // 3. Annotate at-risk surfaces
    for (const vs of viableSurfaces) {
      vs.at_risk_after_operation = survivalMap.get(vs.surface_id) ?? null;
    }

    // 4. Detect dead-ends in operation sequence
    const deadEnds = operations.length > 0
      ? this.detectDeadEnds(operations, viableSurfaces)
      : [];

    if (deadEnds.length > 0) {
      warnings.push(
        `${deadEnds.length} dead-end(s) detected — operation sequence will remove needed clamping surfaces`
      );
    }

    // 5. Recommend setup sequence
    const setupSequence = operations.length > 0
      ? this.recommendSetups(operations, viableSurfaces, deadEnds, warnings)
      : [];

    // 6. Additional warnings
    this.generateWarnings(viableSurfaces, operations, input, warnings);

    return {
      viable_surfaces: viableSurfaces,
      dead_ends: deadEnds,
      recommended_setup_sequence: setupSequence,
      warnings,
      surface_count: surfaces.length,
      viable_count: viableSurfaces.length,
      dead_end_count: deadEnds.length,
      formula:
        "vise_score = 0.30*area + 0.25*flatness + 0.25*opposing + 0.20*depth; " +
        "chuck_score = 0.30*dia + 0.30*len + 0.25*conc + 0.15*finish; " +
        "vacuum_score = 0.35*area + 0.30*continuity + 0.25*no_holes + 0.10*flat; " +
        "dead_end = op_N removes surface_S AND op_M(M>N) needs surface_S",
    };
  }

  // --------------------------------------------------------------------------
  // Action: track_survival
  // --------------------------------------------------------------------------

  /**
   * Track which surfaces survive through each operation in the machining
   * sequence. Returns per-surface status including removal point and
   * clamping usage.
   *
   * @param input - Surfaces and operations to analyze
   * @returns Survival tracking result
   */
  trackSurvival(input: SurfaceInferenceInput): SurvivalTrackingResult {
    const warnings: string[] = [];
    const { surfaces, operations = [] } = input;

    if (operations.length === 0) {
      return { surface_status: [], operations_analyzed: 0, surfaces_at_risk: 0, warnings: ["No operations provided"] };
    }

    const sorted = [...operations].sort((a, b) => a.sequence_index - b.sequence_index);
    const removedBy = new Map<string, { op: string; idx: number }>();

    // Track removals
    for (const op of sorted) {
      for (const sid of op.surfaces_removed) {
        if (!removedBy.has(sid)) {
          removedBy.set(sid, { op: op.id, idx: op.sequence_index });
        }
      }
    }

    // Track clamping usage
    const clampUsage = new Map<string, string[]>();
    for (const op of sorted) {
      for (const sid of op.clamping_surfaces_needed) {
        const usage = clampUsage.get(sid) ?? [];
        usage.push(op.id);
        clampUsage.set(sid, usage);
      }
    }

    const statuses: SurfaceStatus[] = surfaces.map((s) => {
      const removal = removedBy.get(s.id);
      const usage = clampUsage.get(s.id) ?? [];
      return {
        surface_id: s.id,
        surviving: !removal,
        removed_by_operation: removal?.op ?? null,
        removed_at_sequence_index: removal?.idx ?? null,
        used_for_clamping_in: usage,
      };
    });

    // Detect at-risk: surface used for clamping after it's removed
    let atRisk = 0;
    for (const status of statuses) {
      if (status.removed_at_sequence_index !== null) {
        const laterClamp = status.used_for_clamping_in.some((opId) => {
          const op = sorted.find((o) => o.id === opId);
          return op && op.sequence_index > status.removed_at_sequence_index!;
        });
        if (laterClamp) {
          atRisk++;
          warnings.push(
            `Surface ${status.surface_id} removed at seq ${status.removed_at_sequence_index} ` +
            `but needed for clamping in later operation(s)`
          );
        }
      }
    }

    return {
      surface_status: statuses,
      operations_analyzed: operations.length,
      surfaces_at_risk: atRisk,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // Action: detect_dead_ends
  // --------------------------------------------------------------------------

  /**
   * Detect dead-end conditions in the machining sequence where an operation
   * removes a surface needed by a later operation for clamping.
   *
   * @param input - Surfaces and operations
   * @returns Dead-end list with resolution suggestions
   */
  detectDeadEndsDirect(input: SurfaceInferenceInput): { dead_ends: DeadEnd[]; warnings: string[] } {
    const warnings: string[] = [];
    const { surfaces, operations = [] } = input;

    if (operations.length === 0) {
      return { dead_ends: [], warnings: ["No operations provided for dead-end analysis"] };
    }

    const viableSurfaces = this.classifyAndScore(surfaces, []);
    const deadEnds = this.detectDeadEnds(operations, viableSurfaces);

    if (deadEnds.length > 0) {
      warnings.push(`Found ${deadEnds.length} dead-end(s) in operation sequence`);
    } else {
      warnings.push("No dead-ends detected — sequence is safe");
    }

    return { dead_ends: deadEnds, warnings };
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Surface Classification & Scoring
  // --------------------------------------------------------------------------

  /**
   * Classify each surface and score for all applicable workholding methods.
   * Returns only surfaces that score above threshold for at least one method.
   */
  private classifyAndScore(surfaces: PartSurface[], warnings: string[]): ViableSurface[] {
    const results: ViableSurface[] = [];
    const surfaceMap = new Map(surfaces.map((s) => [s.id, s]));

    for (const surface of surfaces) {
      const methods: ScoredMethod[] = [];

      // Score for vise clamping (planar surfaces only)
      if (surface.type === "planar") {
        methods.push(this.scoreVise(surface, surfaceMap));
      }

      // Score for chuck clamping (cylindrical surfaces)
      if (surface.type === "cylindrical") {
        methods.push(this.scoreChuck(surface));
      }

      // Score for collet (cylindrical, smaller diameter range)
      if (surface.type === "cylindrical") {
        methods.push(this.scoreCollet(surface));
      }

      // Score for vacuum (planar surfaces)
      if (surface.type === "planar") {
        methods.push(this.scoreVacuum(surface));
      }

      // Score for fixture plate (planar bottom surfaces)
      if (surface.type === "planar" && (surface.face === "bottom" || surface.face === "top")) {
        methods.push(this.scoreFixturePlate(surface));
      }

      // Score for soft jaw (cylindrical or planar prismatic)
      if (surface.type === "cylindrical" || surface.type === "planar") {
        methods.push(this.scoreSoftJaw(surface));
      }

      // Score for magnetic chuck (ferrous, planar)
      if (surface.type === "planar") {
        methods.push(this.scoreMagnetic(surface));
      }

      // Filter to methods that meet threshold
      const viable = methods.filter((m) => m.score > 0.2);

      if (viable.length > 0) {
        // Overall suitability = max method score, boosted by datum status
        const bestScore = Math.max(...viable.map((m) => m.score));
        const datumBoost = surface.datum ? 0.10 : 0;
        const finalScore = Math.min(1.0, bestScore + datumBoost);

        results.push({
          surface_id: surface.id,
          type: surface.type,
          suitability_score: parseFloat(finalScore.toFixed(3)),
          workholding_methods: viable.sort((a, b) => b.score - a.score),
          at_risk_after_operation: null,
          is_datum: !!surface.datum,
          datum_label: surface.datum ?? null,
        });
      }
    }

    if (results.length === 0) {
      warnings.push("No surfaces meet minimum suitability thresholds — custom fixturing required");
    }

    return results.sort((a, b) => b.suitability_score - a.suitability_score);
  }

  /**
   * Score a planar surface for vise clamping.
   *
   * Criteria: area > 400mm², flatness < 0.05mm, has opposing parallel surface,
   * depth >= 10mm for jaw engagement.
   */
  private scoreVise(surface: PartSurface, surfaceMap: Map<string, PartSurface>): ScoredMethod {
    let limitingFactor: string | null = null;

    // Area sub-score: ramp from 200mm² (0.0) to 800mm² (1.0)
    const areaScore = this.rampScore(surface.area_mm2, 200, 800);
    if (surface.area_mm2 < VISE_MIN_AREA_MM2) limitingFactor = `area ${surface.area_mm2.toFixed(0)}mm² < ${VISE_MIN_AREA_MM2}mm²`;

    // Flatness sub-score: 1.0 at 0mm, 0.0 at 0.10mm
    const flatness = surface.flatness_mm ?? 0.01;
    const flatnessScore = this.rampScoreInverse(flatness, 0.0, 0.10);
    if (flatness > VISE_MAX_FLATNESS_MM && !limitingFactor) {
      limitingFactor = `flatness ${flatness.toFixed(3)}mm > ${VISE_MAX_FLATNESS_MM}mm`;
    }

    // Opposing surface sub-score: 1.0 if opposing surface exists, 0.2 if not
    let opposingScore = 0.2;
    if (surface.opposing_surface_id) {
      const opp = surfaceMap.get(surface.opposing_surface_id);
      if (opp && opp.type === "planar") {
        // Check parallelism via dot product of normals (should be close to -1)
        const dot = surface.normal.x * opp.normal.x +
          surface.normal.y * opp.normal.y +
          surface.normal.z * opp.normal.z;
        opposingScore = Math.abs(dot + 1) < 0.1 ? 1.0 : 0.5;
      }
    }
    if (opposingScore < 0.5 && !limitingFactor) limitingFactor = "no opposing parallel surface";

    // Depth sub-score: ramp from 5mm (0.0) to 20mm (1.0)
    const depth = surface.depth_mm ?? 15;
    const depthScore = this.rampScore(depth, 5, 20);
    if (depth < VISE_MIN_DEPTH_MM && !limitingFactor) {
      limitingFactor = `depth ${depth.toFixed(1)}mm < ${VISE_MIN_DEPTH_MM}mm`;
    }

    const score = parseFloat((
      VISE_WEIGHTS.area * areaScore +
      VISE_WEIGHTS.flatness * flatnessScore +
      VISE_WEIGHTS.opposing * opposingScore +
      VISE_WEIGHTS.depth * depthScore
    ).toFixed(3));

    const meets = surface.area_mm2 >= VISE_MIN_AREA_MM2 &&
      flatness <= VISE_MAX_FLATNESS_MM &&
      depth >= VISE_MIN_DEPTH_MM;

    return { method: "vise", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  /**
   * Score a cylindrical surface for 3-jaw or 4-jaw chuck clamping.
   *
   * Criteria: diameter 10-500mm, length > 15mm, concentricity < 0.025mm.
   */
  private scoreChuck(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;
    const dia = surface.diameter_mm ?? 0;
    const len = surface.length_mm ?? 0;
    const conc = surface.concentricity_mm ?? 0.01;

    // Diameter sub-score: peak at 50-200mm range
    let diaScore = 0;
    if (dia >= CHUCK_MIN_DIAMETER_MM && dia <= CHUCK_MAX_DIAMETER_MM) {
      if (dia <= 200) {
        diaScore = this.rampScore(dia, 5, 50);
      } else {
        diaScore = this.rampScoreInverse(dia, 200, CHUCK_MAX_DIAMETER_MM);
      }
    }
    if (dia < CHUCK_MIN_DIAMETER_MM || dia > CHUCK_MAX_DIAMETER_MM) {
      limitingFactor = `diameter ${dia.toFixed(1)}mm outside ${CHUCK_MIN_DIAMETER_MM}-${CHUCK_MAX_DIAMETER_MM}mm range`;
    }

    // Length sub-score: ramp from 10mm (0.0) to 30mm (1.0)
    const lenScore = this.rampScore(len, 10, 30);
    if (len < CHUCK_MIN_LENGTH_MM && !limitingFactor) {
      limitingFactor = `length ${len.toFixed(1)}mm < ${CHUCK_MIN_LENGTH_MM}mm`;
    }

    // Concentricity sub-score: 1.0 at 0mm, 0.0 at 0.05mm
    const concScore = this.rampScoreInverse(conc, 0.0, 0.05);
    if (conc > CHUCK_MAX_CONCENTRICITY_MM && !limitingFactor) {
      limitingFactor = `concentricity ${conc.toFixed(3)}mm > ${CHUCK_MAX_CONCENTRICITY_MM}mm`;
    }

    // Surface quality sub-score (based on flatness as proxy for finish)
    const finishScore = surface.flatness_mm !== undefined
      ? this.rampScoreInverse(surface.flatness_mm, 0.0, 0.05)
      : 0.7;

    const score = parseFloat((
      CHUCK_WEIGHTS.diameter * diaScore +
      CHUCK_WEIGHTS.length * lenScore +
      CHUCK_WEIGHTS.concentricity * concScore +
      CHUCK_WEIGHTS.surface_quality * finishScore
    ).toFixed(3));

    const meets = dia >= CHUCK_MIN_DIAMETER_MM && dia <= CHUCK_MAX_DIAMETER_MM &&
      len >= CHUCK_MIN_LENGTH_MM && conc <= CHUCK_MAX_CONCENTRICITY_MM;

    return { method: "chuck", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  /**
   * Score a cylindrical surface for collet clamping.
   * Collets suit smaller diameters (3-100mm) and require tighter concentricity.
   */
  private scoreCollet(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;
    const dia = surface.diameter_mm ?? 0;
    const len = surface.length_mm ?? 0;
    const conc = surface.concentricity_mm ?? 0.01;

    const diaScore = (dia >= COLLET_MIN_DIAMETER_MM && dia <= COLLET_MAX_DIAMETER_MM)
      ? this.rampScore(dia, COLLET_MIN_DIAMETER_MM, 50)
      : 0;
    if (dia < COLLET_MIN_DIAMETER_MM || dia > COLLET_MAX_DIAMETER_MM) {
      limitingFactor = `diameter ${dia.toFixed(1)}mm outside collet range ${COLLET_MIN_DIAMETER_MM}-${COLLET_MAX_DIAMETER_MM}mm`;
    }

    const lenScore = this.rampScore(len, 10, 25);
    if (len < CHUCK_MIN_LENGTH_MM && !limitingFactor) {
      limitingFactor = `length ${len.toFixed(1)}mm < ${CHUCK_MIN_LENGTH_MM}mm`;
    }

    // Collets need tighter concentricity than chucks
    const concScore = this.rampScoreInverse(conc, 0.0, 0.03);
    if (conc > 0.015 && !limitingFactor) {
      limitingFactor = `concentricity ${conc.toFixed(3)}mm > 0.015mm for collet`;
    }

    const score = parseFloat((0.35 * diaScore + 0.30 * lenScore + 0.35 * concScore).toFixed(3));
    const meets = dia >= COLLET_MIN_DIAMETER_MM && dia <= COLLET_MAX_DIAMETER_MM &&
      len >= CHUCK_MIN_LENGTH_MM && conc <= 0.015;

    return { method: "collet", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  /**
   * Score a planar surface for vacuum fixturing.
   *
   * Criteria: flat, area > 2500mm², no through-holes (seal break), continuous surface.
   */
  private scoreVacuum(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;

    // Area sub-score: ramp from 1500mm² (0.0) to 5000mm² (1.0)
    const areaScore = this.rampScore(surface.area_mm2, 1500, 5000);
    if (surface.area_mm2 < VACUUM_MIN_AREA_MM2) {
      limitingFactor = `area ${surface.area_mm2.toFixed(0)}mm² < ${VACUUM_MIN_AREA_MM2}mm²`;
    }

    // Continuity sub-score: 1.0 if continuous, 0.0 if not
    const isContinuous = surface.is_continuous !== false;
    const continuityScore = isContinuous ? 1.0 : 0.0;
    if (!isContinuous && !limitingFactor) limitingFactor = "surface not continuous";

    // Through-hole sub-score: 1.0 if no through-holes, 0.0 if has them
    const hasHoles = surface.has_through_holes === true;
    const holeScore = hasHoles ? 0.0 : 1.0;
    if (hasHoles && !limitingFactor) limitingFactor = "through-holes break vacuum seal";

    // Flatness sub-score
    const flatness = surface.flatness_mm ?? 0.01;
    const flatnessScore = this.rampScoreInverse(flatness, 0.0, 0.10);

    const score = parseFloat((
      VACUUM_WEIGHTS.area * areaScore +
      VACUUM_WEIGHTS.continuity * continuityScore +
      VACUUM_WEIGHTS.no_holes * holeScore +
      VACUUM_WEIGHTS.flatness * flatnessScore
    ).toFixed(3));

    const meets = surface.area_mm2 >= VACUUM_MIN_AREA_MM2 && !hasHoles && isContinuous;

    return { method: "vacuum", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  /**
   * Score a planar surface for fixture plate mounting.
   *
   * Criteria: flat bottom/top, bolt hole pattern accessible, min 4 clamping points.
   */
  private scoreFixturePlate(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;

    // Area sub-score
    const areaScore = this.rampScore(surface.area_mm2, 500, 3000);

    // Bolt hole count sub-score: 4+ is ideal
    const boltCount = surface.bolt_hole_count ?? 0;
    const boltScore = this.rampScore(boltCount, 2, 6);
    if (boltCount < FIXTURE_PLATE_MIN_CLAMP_POINTS && !limitingFactor) {
      limitingFactor = `bolt holes: ${boltCount} < ${FIXTURE_PLATE_MIN_CLAMP_POINTS} required`;
    }

    // Flatness sub-score
    const flatness = surface.flatness_mm ?? 0.02;
    const flatnessScore = this.rampScoreInverse(flatness, 0.0, 0.10);

    // Face orientation bonus: bottom surfaces preferred
    const faceBonus = surface.face === "bottom" ? 1.0 : 0.6;

    const score = parseFloat((
      0.30 * areaScore + 0.30 * boltScore + 0.20 * flatnessScore + 0.20 * faceBonus
    ).toFixed(3));

    const meets = boltCount >= FIXTURE_PLATE_MIN_CLAMP_POINTS &&
      surface.area_mm2 >= 500 && flatness <= 0.10;

    return { method: "fixture_plate", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  /**
   * Score a surface for soft jaw workholding.
   * Soft jaws can conform to cylindrical or prismatic shapes.
   */
  private scoreSoftJaw(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;

    if (surface.type === "cylindrical") {
      const dia = surface.diameter_mm ?? 0;
      const len = surface.length_mm ?? 0;
      const diaScore = this.rampScore(dia, 10, 150);
      const lenScore = this.rampScore(len, 10, 30);
      const score = parseFloat((0.50 * diaScore + 0.50 * lenScore).toFixed(3));
      if (dia < 10) limitingFactor = `diameter ${dia.toFixed(1)}mm too small for soft jaw`;
      if (len < 10 && !limitingFactor) limitingFactor = `length ${len.toFixed(1)}mm too short for soft jaw`;
      return { method: "soft_jaw", score, meets_threshold: dia >= 10 && len >= 10, limiting_factor: limitingFactor };
    }

    // Planar/prismatic
    const areaScore = this.rampScore(surface.area_mm2, 200, 1000);
    const depthScore = this.rampScore(surface.depth_mm ?? 10, 5, 20);
    const score = parseFloat((0.50 * areaScore + 0.50 * depthScore).toFixed(3));
    if (surface.area_mm2 < 200) limitingFactor = `area ${surface.area_mm2.toFixed(0)}mm² too small for soft jaw`;
    return {
      method: "soft_jaw", score,
      meets_threshold: surface.area_mm2 >= 200 && (surface.depth_mm ?? 10) >= 5,
      limiting_factor: limitingFactor,
    };
  }

  /**
   * Score a planar surface for magnetic chuck.
   * Requires ferrous material (not checked here — caller responsibility).
   */
  private scoreMagnetic(surface: PartSurface): ScoredMethod {
    let limitingFactor: string | null = null;

    const areaScore = this.rampScore(surface.area_mm2, 500, 3000);
    if (surface.area_mm2 < MAGNETIC_MIN_AREA_MM2) {
      limitingFactor = `area ${surface.area_mm2.toFixed(0)}mm² < ${MAGNETIC_MIN_AREA_MM2}mm²`;
    }

    const flatness = surface.flatness_mm ?? 0.02;
    const flatnessScore = this.rampScoreInverse(flatness, 0.0, 0.05);

    const score = parseFloat((0.55 * areaScore + 0.45 * flatnessScore).toFixed(3));
    const meets = surface.area_mm2 >= MAGNETIC_MIN_AREA_MM2 && flatness <= 0.05;

    return { method: "magnetic", score, meets_threshold: meets, limiting_factor: limitingFactor };
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Surface Survival Tracking
  // --------------------------------------------------------------------------

  /**
   * Build a map of surface_id → first operation that removes it.
   * Returns null for surfaces that survive the entire sequence.
   */
  private buildSurvivalMap(
    surfaces: PartSurface[],
    operations: MachiningOp[]
  ): Map<string, string | null> {
    const sorted = [...operations].sort((a, b) => a.sequence_index - b.sequence_index);
    const result = new Map<string, string | null>();

    for (const s of surfaces) {
      result.set(s.id, null);
    }

    for (const op of sorted) {
      for (const sid of op.surfaces_removed) {
        if (result.has(sid) && result.get(sid) === null) {
          result.set(sid, op.id);
        }
      }
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Dead-End Detection
  // --------------------------------------------------------------------------

  /**
   * Scan operations for dead-end conditions: operation N removes surface S
   * that is needed by operation M (M > N) for clamping.
   *
   * For each dead-end, suggests resolution: reorder ops, use alternative
   * surface, or add a dedicated fixturing step.
   */
  private detectDeadEnds(operations: MachiningOp[], viableSurfaces: ViableSurface[]): DeadEnd[] {
    const sorted = [...operations].sort((a, b) => a.sequence_index - b.sequence_index);
    const deadEnds: DeadEnd[] = [];

    // Build removal schedule: surface_id → operation_id that removes it
    const removalSchedule = new Map<string, { op_id: string; seq: number }>();
    for (const op of sorted) {
      for (const sid of op.surfaces_removed) {
        if (!removalSchedule.has(sid)) {
          removalSchedule.set(sid, { op_id: op.id, seq: op.sequence_index });
        }
      }
    }

    // Check each operation's clamping needs against removal schedule
    for (const op of sorted) {
      for (const neededSid of op.clamping_surfaces_needed) {
        const removal = removalSchedule.get(neededSid);
        if (removal && removal.seq < op.sequence_index) {
          // Dead end: surface removed before it's needed for clamping
          const resolution = this.suggestResolution(
            neededSid, removal.op_id, op.id, sorted, viableSurfaces
          );
          deadEnds.push({
            operation: removal.op_id,
            removes_surface: neededSid,
            needed_by_operation: op.id,
            needed_at_sequence_index: op.sequence_index,
            resolution,
          });
        }
      }
    }

    return deadEnds;
  }

  /**
   * Suggest a resolution for a dead-end condition.
   * Strategies: reorder operations, use alternative surface, add fixture step.
   */
  private suggestResolution(
    surfaceId: string,
    removingOp: string,
    needingOp: string,
    operations: MachiningOp[],
    viableSurfaces: ViableSurface[]
  ): string {
    const removing = operations.find((o) => o.id === removingOp);
    const needing = operations.find((o) => o.id === needingOp);

    if (!removing || !needing) return "Unable to resolve — operation not found";

    // Check if reordering is possible (needing op has no dependency on removing op's output)
    const needingCreatesNothing = !removing.surfaces_created || removing.surfaces_created.length === 0;
    const canReorder = needingCreatesNothing ||
      !needing.clamping_surfaces_needed.some((s) => removing.surfaces_created?.includes(s));

    if (canReorder) {
      return `Reorder: move '${needingOp}' before '${removingOp}' (sequence ${needing.sequence_index} before ${removing.sequence_index})`;
    }

    // Find alternative surfaces with same workholding method
    const needingMethod = needing.workholding_method;
    if (needingMethod) {
      const alternatives = viableSurfaces.filter(
        (vs) => vs.surface_id !== surfaceId &&
          vs.workholding_methods.some((m) => m.method === needingMethod && m.meets_threshold)
      );
      if (alternatives.length > 0) {
        return `Use alternative surface '${alternatives[0].surface_id}' for ${needingMethod} clamping in '${needingOp}'`;
      }
    }

    // Fallback: dedicated fixture
    return `Add dedicated fixture step before '${needingOp}' — surface '${surfaceId}' is unavailable after '${removingOp}'`;
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Setup Sequence Recommendation
  // --------------------------------------------------------------------------

  /**
   * Recommend a setup sequence that avoids dead-ends and maximizes
   * clamping suitability. Uses greedy assignment by suitability score.
   */
  private recommendSetups(
    operations: MachiningOp[],
    viableSurfaces: ViableSurface[],
    deadEnds: DeadEnd[],
    warnings: string[]
  ): RecommendedSetup[] {
    const sorted = [...operations].sort((a, b) => a.sequence_index - b.sequence_index);
    const setups: RecommendedSetup[] = [];
    const viableMap = new Map(viableSurfaces.map((v) => [v.surface_id, v]));

    // Group operations by their clamping surface set
    let currentSurfaces: string[] = [];
    let currentOps: string[] = [];
    let currentMethod: WorkholdingMethod = "vise";
    let currentScore = 0;
    let setupCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const op = sorted[i];
      const neededSurfaces = op.clamping_surfaces_needed;

      // Check if current setup can serve this operation
      const canContinue = currentOps.length > 0 &&
        neededSurfaces.length > 0 &&
        neededSurfaces.every((s) => currentSurfaces.includes(s));

      if (canContinue) {
        currentOps.push(op.id);
      } else {
        // Flush previous setup
        if (currentOps.length > 0) {
          setupCount++;
          setups.push({
            setup_id: `SETUP-${String(setupCount).padStart(2, "0")}`,
            workholding_method: currentMethod,
            clamping_surfaces: [...currentSurfaces],
            operations: [...currentOps],
            suitability_score: parseFloat(currentScore.toFixed(3)),
          });
        }

        // Start new setup
        currentSurfaces = [...neededSurfaces];
        currentOps = [op.id];

        // Find best workholding method for these surfaces
        const bestMethod = this.findBestMethod(neededSurfaces, viableMap);
        currentMethod = bestMethod.method;
        currentScore = bestMethod.score;
      }
    }

    // Flush final setup
    if (currentOps.length > 0) {
      setupCount++;
      setups.push({
        setup_id: `SETUP-${String(setupCount).padStart(2, "0")}`,
        workholding_method: currentMethod,
        clamping_surfaces: [...currentSurfaces],
        operations: [...currentOps],
        suitability_score: parseFloat(currentScore.toFixed(3)),
      });
    }

    if (setups.length > 4) {
      warnings.push(`${setups.length} setups required — consider consolidating to reduce setup time`);
    }

    return setups;
  }

  /**
   * Find the best workholding method for a set of clamping surfaces.
   * Returns the method with the highest combined suitability score.
   */
  private findBestMethod(
    surfaceIds: string[],
    viableMap: Map<string, ViableSurface>
  ): { method: WorkholdingMethod; score: number } {
    const methodScores = new Map<WorkholdingMethod, number>();

    for (const sid of surfaceIds) {
      const vs = viableMap.get(sid);
      if (!vs) continue;
      for (const m of vs.workholding_methods) {
        const current = methodScores.get(m.method) ?? 0;
        methodScores.set(m.method, current + m.score);
      }
    }

    let bestMethod: WorkholdingMethod = "vise";
    let bestScore = 0;
    for (const [method, score] of Array.from(methodScores.entries())) {
      const avgScore = score / surfaceIds.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestMethod = method;
      }
    }

    return { method: bestMethod, score: bestScore };
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Warning Generation
  // --------------------------------------------------------------------------

  /**
   * Generate additional warnings based on analysis results.
   */
  private generateWarnings(
    viableSurfaces: ViableSurface[],
    operations: MachiningOp[],
    input: SurfaceInferenceInput,
    warnings: string[]
  ): void {
    // Warn if datum surfaces are at risk
    const datumSurfaces = viableSurfaces.filter((v) => v.is_datum);
    for (const ds of datumSurfaces) {
      if (ds.at_risk_after_operation) {
        warnings.push(
          `Datum ${ds.datum_label} (surface ${ds.surface_id}) at risk after operation '${ds.at_risk_after_operation}'`
        );
      }
    }

    // Warn on low suitability scores
    const lowScoring = viableSurfaces.filter((v) => v.suitability_score < 0.4);
    if (lowScoring.length > 0 && viableSurfaces.length === lowScoring.length) {
      warnings.push(
        "All viable surfaces have low suitability scores (<0.4) — verify workholding adequacy"
      );
    }

    // Warn if cutting forces are high relative to available clamping
    if (input.max_cutting_force_N && input.max_cutting_force_N > 5000) {
      const hasHighScoreMethod = viableSurfaces.some(
        (v) => v.workholding_methods.some((m) => m.meets_threshold && m.score > 0.7)
      );
      if (!hasHighScoreMethod) {
        warnings.push(
          `High cutting force (${input.max_cutting_force_N}N) but no high-confidence workholding surfaces`
        );
      }
    }

    // Warn if too many operations share a single clamping surface
    if (operations.length > 0) {
      const surfaceUsage = new Map<string, number>();
      for (const op of operations) {
        for (const sid of op.clamping_surfaces_needed) {
          surfaceUsage.set(sid, (surfaceUsage.get(sid) ?? 0) + 1);
        }
      }
      for (const [sid, count] of Array.from(surfaceUsage.entries())) {
        if (count > 6) {
          warnings.push(
            `Surface ${sid} used for clamping in ${count} operations — consider wear impact on surface quality`
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Scoring Utilities
  // --------------------------------------------------------------------------

  /**
   * Linear ramp from 0.0 at minVal to 1.0 at maxVal.
   * Clamps output to [0, 1].
   */
  private rampScore(value: number, minVal: number, maxVal: number): number {
    if (value <= minVal) return 0;
    if (value >= maxVal) return 1;
    return (value - minVal) / (maxVal - minVal);
  }

  /**
   * Inverse linear ramp: 1.0 at minVal, 0.0 at maxVal.
   * Clamps output to [0, 1].
   */
  private rampScoreInverse(value: number, minVal: number, maxVal: number): number {
    if (value <= minVal) return 1;
    if (value >= maxVal) return 0;
    return 1 - (value - minVal) / (maxVal - minVal);
  }

  /**
   * Return an empty result structure for degenerate inputs.
   */
  private emptyResult(warnings: string[]): SurfaceInferenceResult {
    return {
      viable_surfaces: [],
      dead_ends: [],
      recommended_setup_sequence: [],
      warnings,
      surface_count: 0,
      viable_count: 0,
      dead_end_count: 0,
      formula: "",
    };
  }
}

/** Singleton instance for dispatcher wiring. @shortcode E1085 */
export const workholdingSurfaceInferenceEngine = new WorkholdingSurfaceInferenceEngine();
