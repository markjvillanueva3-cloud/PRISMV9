/**
 * PRISM Manufacturing Intelligence - EDM Start Hole & Setup Engine
 * Consolidated WEDM-P2P MS5 (Start Hole Planning) + MS6 (Workholding & Setup)
 *
 * MS5 Units:
 *   U01: StartHolePlanner — location, diameter, optimization
 *   U02: StartHoleMethodSelector — drill vs EDM hole popper by hardness
 *   U03: StartHolePositionOptimizer — edge clearance, wire travel, thin-wall avoidance
 *   U04: StartHoleDrillingParams — drill/hole popper parameters + time estimate
 *   U05: ThreadingSequencePlanner — profile order, slug management, auto-thread
 *
 * MS6 Units:
 *   U01: EDMFixtureDesigner — fixture type selection, wire/flushing clearance
 *   U02: DatumAlignmentPlanner — edge-find, hole center-find, indicator alignment
 *   U03: WorkpieceLevelingGuide — DTI indication, shimming, tolerance
 *   U04: SubmergedLevelCalculator — dielectric level + volume calculation
 *   U05: SetupSequenceGenerator — complete setup checklist
 *
 * @version 1.0.0
 * @module EDMStartHoleSetupEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Start hole drilling/popping method */
export type StartHoleMethod = "drill" | "edm_hole_popper";

/** Fixture type for WEDM workholding */
export type FixtureType =
  | "magnetic_chuck"
  | "precision_vise"
  | "pallet_system"
  | "dedicated_fixture"
  | "angle_plate"
  | "v_block"
  | "step_clamp";

/** Datum alignment strategy */
export type DatumMethod =
  | "wire_edge_find"
  | "hole_center_find"
  | "indicator_alignment"
  | "optical_edge_find"
  | "touch_probe";

/** Threading direction relative to profile start */
export type ThreadingDirection = "down" | "up";

/** Material category for method selection */
export type MaterialCategory =
  | "mild_steel"
  | "tool_steel"
  | "stainless_steel"
  | "aluminum"
  | "carbide"
  | "copper"
  | "titanium"
  | "hardened_steel"
  | "inconel";

/** Profile geometry input for start hole planning */
export interface ProfileGeometry {
  id: string;
  /** Profile perimeter vertices or bounding box */
  min_x_mm: number;
  min_y_mm: number;
  max_x_mm: number;
  max_y_mm: number;
  /** Interior cut — slug must be managed */
  is_interior: boolean;
  /** Approach point on profile */
  approach_x_mm: number;
  approach_y_mm: number;
  /** Narrowest wall near approach */
  min_wall_thickness_mm?: number;
  /** Expected slug weight for interior profiles */
  slug_weight_kg?: number;
  /** Whether auto-threading is physically possible for this profile */
  auto_thread_possible?: boolean;
}

/** A single planned start hole */
export interface StartHole {
  id: string;
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
  depth_mm: number;
  method: StartHoleMethod;
  serves_profiles: string[];
  auto_thread_compatible: boolean;
}

/** Complete start hole plan */
export interface StartHolePlan {
  holes: StartHole[];
  total_count: number;
  method: "drill" | "edm_hole_popper" | "mixed";
  estimated_time_min: number;
  notes: string[];
}

/** Workpiece specification for setup planning */
export interface WorkpieceSpec {
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  material: MaterialCategory;
  hardness_hrc: number;
  weight_kg: number;
  /** True if heat-treated / through-hardened */
  is_hardened: boolean;
  /** Magnetic permeability (for magnetic chuck suitability) */
  is_magnetic?: boolean;
}

/** Machine tank specification */
export interface TankSpec {
  /** Internal tank dimensions */
  tank_length_mm: number;
  tank_width_mm: number;
  /** Maximum fill height */
  max_fill_height_mm: number;
  /** Dielectric already in tank */
  current_volume_liters?: number;
}

/** Complete setup plan */
export interface SetupPlan {
  fixture_type: string;
  fixture_details: string;
  datum_method: string;
  leveling_required: boolean;
  leveling_tolerance_mm: number;
  dielectric_level_mm: number;
  dielectric_volume_liters: number;
  setup_checklist: string[];
  estimated_setup_time_min: number;
  threading_sequence: string[];
}

/** Threading sequence plan */
export interface ThreadingSequencePlan {
  sequence: ThreadingSequenceEntry[];
  total_profiles: number;
  auto_thread_count: number;
  manual_thread_count: number;
  notes: string[];
}

/** Single threading sequence entry */
export interface ThreadingSequenceEntry {
  order: number;
  profile_id: string;
  start_hole_id: string;
  threading_direction: ThreadingDirection;
  auto_thread: boolean;
  slug_management: string;
  notes: string[];
}

/** Start hole drilling/popping parameters */
export interface StartHoleDrillingParams {
  hole_id: string;
  method: StartHoleMethod;
  diameter_mm: number;
  depth_mm: number;
  /** Drill-specific */
  drill_rpm?: number;
  drill_feed_mmpm?: number;
  peck_depth_mm?: number;
  /** EDM hole popper specific */
  electrode_diameter_mm?: number;
  electrode_material?: string;
  pulse_on_us?: number;
  pulse_off_us?: number;
  current_a?: number;
  estimated_time_min: number;
  notes: string[];
}

/** Full combined plan output */
export interface FullEDMSetupPlan {
  start_holes: StartHolePlan;
  threading_sequence: ThreadingSequencePlan;
  setup: SetupPlan;
  drilling_params: StartHoleDrillingParams[];
  total_estimated_time_min: number;
  timestamp: string;
}

// ============================================================================
// CONSTANTS & REFERENCE DATA
// ============================================================================

/** Hardness threshold: above this, EDM hole popper is required */
const HARDNESS_DRILL_LIMIT_HRC = 45;

/** Standard start hole diameters by method [mm] */
const STANDARD_HOLE_DIAMETERS: Record<StartHoleMethod, number[]> = {
  drill: [1.0, 1.5, 2.0, 2.5, 3.0],
  edm_hole_popper: [0.3, 0.5, 1.0, 1.5, 2.0, 3.0],
};

/** Default start hole diameter [mm] */
const DEFAULT_HOLE_DIAMETER_MM = 2.0;

/** Minimum edge clearance from profile to start hole center [mm] */
const MIN_EDGE_CLEARANCE_MM = 2.0;

/** Preferred edge clearance [mm] */
const PREFERRED_EDGE_CLEARANCE_MM = 5.0;

/** Minimum wall thickness for safe start hole placement [mm] */
const MIN_WALL_THICKNESS_MM = 1.5;

/** Dielectric level above workpiece top [mm] */
const DIELECTRIC_ABOVE_WORKPIECE_MM = 20;

/** Leveling tolerance target [mm] */
const LEVELING_TOLERANCE_MM = 0.005;

/** Liters per cubic mm */
const MM3_TO_LITERS = 1e-6;

/** Drill feed/speed reference by material (drill diameter 2mm baseline) */
const DRILL_PARAMS: Record<
  MaterialCategory,
  { rpm: number; feed_mmpm: number; peck_mm: number }
> = {
  mild_steel: { rpm: 3000, feed_mmpm: 150, peck_mm: 2.0 },
  tool_steel: { rpm: 2000, feed_mmpm: 80, peck_mm: 1.5 },
  stainless_steel: { rpm: 1800, feed_mmpm: 60, peck_mm: 1.0 },
  aluminum: { rpm: 6000, feed_mmpm: 300, peck_mm: 5.0 },
  carbide: { rpm: 800, feed_mmpm: 20, peck_mm: 0.5 },
  copper: { rpm: 4000, feed_mmpm: 200, peck_mm: 3.0 },
  titanium: { rpm: 1200, feed_mmpm: 40, peck_mm: 1.0 },
  hardened_steel: { rpm: 1000, feed_mmpm: 30, peck_mm: 0.8 },
  inconel: { rpm: 900, feed_mmpm: 25, peck_mm: 0.5 },
};

/** EDM hole popper parameters by material */
const HOLE_POPPER_PARAMS: Record<
  MaterialCategory,
  { pulse_on_us: number; pulse_off_us: number; current_a: number; rate_mm_per_min: number }
> = {
  mild_steel: { pulse_on_us: 8, pulse_off_us: 16, current_a: 6, rate_mm_per_min: 3.0 },
  tool_steel: { pulse_on_us: 10, pulse_off_us: 20, current_a: 5, rate_mm_per_min: 2.5 },
  stainless_steel: { pulse_on_us: 10, pulse_off_us: 24, current_a: 5, rate_mm_per_min: 2.0 },
  aluminum: { pulse_on_us: 6, pulse_off_us: 12, current_a: 8, rate_mm_per_min: 5.0 },
  carbide: { pulse_on_us: 4, pulse_off_us: 32, current_a: 3, rate_mm_per_min: 0.8 },
  copper: { pulse_on_us: 6, pulse_off_us: 14, current_a: 7, rate_mm_per_min: 4.0 },
  titanium: { pulse_on_us: 8, pulse_off_us: 20, current_a: 5, rate_mm_per_min: 2.2 },
  hardened_steel: { pulse_on_us: 10, pulse_off_us: 24, current_a: 4, rate_mm_per_min: 1.8 },
  inconel: { pulse_on_us: 12, pulse_off_us: 30, current_a: 4, rate_mm_per_min: 1.2 },
};

/** Fixture suitability matrix: material → preferred fixture types (ordered) */
const FIXTURE_PREFERENCE: Record<MaterialCategory, FixtureType[]> = {
  mild_steel: ["magnetic_chuck", "precision_vise", "pallet_system"],
  tool_steel: ["magnetic_chuck", "precision_vise", "pallet_system"],
  stainless_steel: ["precision_vise", "pallet_system", "dedicated_fixture"],
  aluminum: ["precision_vise", "pallet_system", "dedicated_fixture"],
  carbide: ["precision_vise", "dedicated_fixture", "v_block"],
  copper: ["precision_vise", "v_block", "dedicated_fixture"],
  titanium: ["precision_vise", "pallet_system", "dedicated_fixture"],
  hardened_steel: ["magnetic_chuck", "precision_vise", "pallet_system"],
  inconel: ["precision_vise", "dedicated_fixture", "pallet_system"],
};

/** Setup time estimates [minutes] */
const SETUP_TIME: Record<string, number> = {
  fixture_magnetic: 5,
  fixture_vise: 10,
  fixture_pallet: 8,
  fixture_dedicated: 20,
  fixture_angle_plate: 15,
  fixture_v_block: 12,
  fixture_step_clamp: 15,
  leveling: 15,
  edge_find: 10,
  hole_center_find: 8,
  indicator_alignment: 20,
  fill_dielectric: 5,
  thread_wire_auto: 1,
  thread_wire_manual: 3,
  verify_program: 5,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMStartHoleSetupEngine {
  // ==========================================================================
  // MS5 U01: START HOLE PLANNER
  // ==========================================================================

  /**
   * Plan start holes for a set of profiles.
   * Minimizes hole count by sharing holes between nearby profiles.
   * Selects diameter (1-3mm) based on wire diameter + clearance.
   */
  planStartHoles(
    profiles: ProfileGeometry[],
    workpiece: WorkpieceSpec,
    wireDiameter_mm: number = 0.25
  ): StartHolePlan {
    log.info(`Planning start holes for ${profiles.length} profiles`, { engine: "EDMStartHoleSetupEngine" });

    const notes: string[] = [];
    const method = this.selectMethod(workpiece);
    const holeDiameter = this.selectDiameter(method, wireDiameter_mm);

    // Generate candidate hole positions for each profile
    const candidates = profiles.map((p) => ({
      profile: p,
      optimal: this.optimizeHolePosition(p, workpiece),
    }));

    // Merge nearby holes to minimize count
    const merged = this.mergeNearbyHoles(candidates, holeDiameter);

    const holes: StartHole[] = merged.map((m, idx) => ({
      id: `SH-${String(idx + 1).padStart(3, "0")}`,
      x_mm: round4(m.x),
      y_mm: round4(m.y),
      diameter_mm: holeDiameter,
      depth_mm: workpiece.thickness_mm,
      method: method === "mixed" ? this.selectMethodForHole(workpiece, m.profiles) : (method as StartHoleMethod),
      serves_profiles: m.profiles.map((p) => p.id),
      auto_thread_compatible: m.profiles.every((p) => p.auto_thread_possible !== false),
    }));

    // Determine overall method summary
    const methods = new Set(holes.map((h) => h.method));
    const overallMethod: StartHolePlan["method"] =
      methods.size > 1 ? "mixed" : methods.has("edm_hole_popper") ? "edm_hole_popper" : "drill";

    // Estimate total time
    const drillingParams = holes.map((h) =>
      this.calculateDrillingParams(h, workpiece)
    );
    const estimatedTime = drillingParams.reduce((sum, p) => sum + p.estimated_time_min, 0);

    if (holes.length < profiles.length) {
      notes.push(
        `Optimized: ${profiles.length} profiles served by ${holes.length} shared start holes`
      );
    }
    if (workpiece.hardness_hrc >= HARDNESS_DRILL_LIMIT_HRC) {
      notes.push(
        `Material hardness ${workpiece.hardness_hrc} HRC requires EDM hole popper (threshold: ${HARDNESS_DRILL_LIMIT_HRC} HRC)`
      );
    }
    if (holeDiameter < 1.5) {
      notes.push("Small hole diameter — verify auto-threading capability");
    }

    return {
      holes,
      total_count: holes.length,
      method: overallMethod,
      estimated_time_min: round2(estimatedTime),
      notes,
    };
  }

  // ==========================================================================
  // MS5 U02: START HOLE METHOD SELECTOR
  // ==========================================================================

  /**
   * Select start hole method based on material hardness and type.
   * Decision matrix: drill if HRC<45 and drillable, else EDM hole popper.
   */
  selectMethod(workpiece: WorkpieceSpec): StartHoleMethod | "mixed" {
    // Carbide always requires EDM hole popper regardless of hardness reading
    if (workpiece.material === "carbide") {
      return "edm_hole_popper";
    }

    // Hardened or high-hardness materials
    if (workpiece.is_hardened || workpiece.hardness_hrc >= HARDNESS_DRILL_LIMIT_HRC) {
      return "edm_hole_popper";
    }

    // Inconel is tough — drill possible but EDM hole popper preferred above 35 HRC
    if (workpiece.material === "inconel" && workpiece.hardness_hrc >= 35) {
      return "edm_hole_popper";
    }

    // Titanium drillable but slow
    if (workpiece.material === "titanium" && workpiece.hardness_hrc >= 40) {
      return "edm_hole_popper";
    }

    return "drill";
  }

  /**
   * Select method for a specific hole when overall plan is mixed.
   * Individual holes may differ if some profiles are in hardened zones.
   */
  private selectMethodForHole(
    workpiece: WorkpieceSpec,
    _profiles: ProfileGeometry[]
  ): StartHoleMethod {
    // In mixed mode, default to the material-based method
    // A future enhancement could check zone-specific hardness
    if (workpiece.is_hardened || workpiece.hardness_hrc >= HARDNESS_DRILL_LIMIT_HRC) {
      return "edm_hole_popper";
    }
    return "drill";
  }

  /**
   * Select hole diameter based on method and wire diameter.
   * Hole must be large enough for wire + flushing clearance.
   */
  private selectDiameter(method: StartHoleMethod | "mixed", wireDiameter_mm: number): number {
    const minClearance = wireDiameter_mm + 0.5; // wire + 0.5mm flush clearance minimum
    const available =
      method === "mixed"
        ? STANDARD_HOLE_DIAMETERS.drill
        : STANDARD_HOLE_DIAMETERS[method];

    // Find smallest standard diameter >= minClearance, prefer 2mm range
    const suitable = available.filter((d) => d >= minClearance);
    if (suitable.length === 0) {
      return DEFAULT_HOLE_DIAMETER_MM;
    }

    // Prefer a diameter around 2mm for good auto-threading compatibility
    const preferred = suitable.find((d) => d >= 1.5 && d <= 2.5);
    return preferred ?? suitable[0];
  }

  // ==========================================================================
  // MS5 U03: START HOLE POSITION OPTIMIZER
  // ==========================================================================

  /**
   * Optimize start hole position for a profile.
   * Goals: maximize distance from profile edges, minimize wire travel to approach,
   * avoid thin walls.
   */
  private optimizeHolePosition(
    profile: ProfileGeometry,
    workpiece: WorkpieceSpec
  ): { x: number; y: number; score: number } {
    if (profile.is_interior) {
      return this.optimizeInteriorHole(profile, workpiece);
    }
    return this.optimizeExteriorHole(profile, workpiece);
  }

  /**
   * Interior profile: place hole inside the slug area, away from profile edges.
   */
  private optimizeInteriorHole(
    profile: ProfileGeometry,
    _workpiece: WorkpieceSpec
  ): { x: number; y: number; score: number } {
    const cx = (profile.min_x_mm + profile.max_x_mm) / 2;
    const cy = (profile.min_y_mm + profile.max_y_mm) / 2;
    const halfW = (profile.max_x_mm - profile.min_x_mm) / 2;
    const halfH = (profile.max_y_mm - profile.min_y_mm) / 2;

    // Start from center — best edge clearance
    let bestX = cx;
    let bestY = cy;
    let bestScore = Math.min(halfW, halfH); // edge clearance = min half-dimension

    // Try shifting toward approach point to reduce wire travel
    const dx = profile.approach_x_mm - cx;
    const dy = profile.approach_y_mm - cy;
    const shiftFraction = 0.3; // move 30% toward approach

    const candidateX = cx + dx * shiftFraction;
    const candidateY = cy + dy * shiftFraction;

    // Compute edge clearance for shifted candidate
    const edgeClearX = Math.min(
      candidateX - profile.min_x_mm,
      profile.max_x_mm - candidateX
    );
    const edgeClearY = Math.min(
      candidateY - profile.min_y_mm,
      profile.max_y_mm - candidateY
    );
    const edgeClearance = Math.min(edgeClearX, edgeClearY);

    if (edgeClearance >= MIN_EDGE_CLEARANCE_MM) {
      // Shifted position is valid — score by edge clearance minus travel penalty
      const travel = Math.hypot(
        candidateX - profile.approach_x_mm,
        candidateY - profile.approach_y_mm
      );
      const centerTravel = Math.hypot(
        cx - profile.approach_x_mm,
        cy - profile.approach_y_mm
      );
      const travelSaving = centerTravel - travel;
      const shiftedScore = edgeClearance + travelSaving * 0.1;

      if (shiftedScore > bestScore || edgeClearance >= PREFERRED_EDGE_CLEARANCE_MM) {
        bestX = candidateX;
        bestY = candidateY;
        bestScore = shiftedScore;
      }
    }

    // Thin wall check
    if (
      profile.min_wall_thickness_mm !== undefined &&
      profile.min_wall_thickness_mm < MIN_WALL_THICKNESS_MM
    ) {
      // Fall back to geometric center for safety
      bestX = cx;
      bestY = cy;
      bestScore = Math.min(halfW, halfH) * 0.8; // penalize
    }

    return { x: round4(bestX), y: round4(bestY), score: bestScore };
  }

  /**
   * Exterior profile: place hole outside the profile bounding box,
   * in scrap material, close to approach point.
   */
  private optimizeExteriorHole(
    profile: ProfileGeometry,
    workpiece: WorkpieceSpec
  ): { x: number; y: number; score: number } {
    // Place hole offset from approach point, away from profile
    const offsetDist = PREFERRED_EDGE_CLEARANCE_MM;
    const cx = (profile.min_x_mm + profile.max_x_mm) / 2;
    const cy = (profile.min_y_mm + profile.max_y_mm) / 2;

    // Direction: from profile center through approach, then offset further
    const dx = profile.approach_x_mm - cx;
    const dy = profile.approach_y_mm - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    let hx = profile.approach_x_mm + ux * offsetDist;
    let hy = profile.approach_y_mm + uy * offsetDist;

    // Clamp to workpiece bounds with margin
    const margin = 3.0;
    hx = clamp(hx, margin, workpiece.length_mm - margin);
    hy = clamp(hy, margin, workpiece.width_mm - margin);

    const travel = Math.hypot(hx - profile.approach_x_mm, hy - profile.approach_y_mm);
    const score = 10 - travel * 0.1; // prefer shorter travel

    return { x: round4(hx), y: round4(hy), score };
  }

  /**
   * Merge nearby start hole candidates to reduce total hole count.
   * Two profiles can share a hole if their optimal positions are within merge radius.
   */
  private mergeNearbyHoles(
    candidates: { profile: ProfileGeometry; optimal: { x: number; y: number; score: number } }[],
    holeDiameter: number
  ): { x: number; y: number; profiles: ProfileGeometry[] }[] {
    const mergeRadius = Math.max(holeDiameter * 3, 8.0); // mm
    const groups: { x: number; y: number; profiles: ProfileGeometry[] }[] = [];

    for (const c of candidates) {
      let merged = false;

      for (const g of groups) {
        const dist = Math.hypot(c.optimal.x - g.x, c.optimal.y - g.y);
        if (dist <= mergeRadius) {
          // Merge: average position weighted by profile count
          const totalProfiles = g.profiles.length + 1;
          g.x = (g.x * g.profiles.length + c.optimal.x) / totalProfiles;
          g.y = (g.y * g.profiles.length + c.optimal.y) / totalProfiles;
          g.profiles.push(c.profile);
          merged = true;
          break;
        }
      }

      if (!merged) {
        groups.push({
          x: c.optimal.x,
          y: c.optimal.y,
          profiles: [c.profile],
        });
      }
    }

    return groups;
  }

  // ==========================================================================
  // MS5 U04: START HOLE DRILLING PARAMS
  // ==========================================================================

  /**
   * Calculate drilling or EDM hole popper parameters for a start hole.
   * Estimates time per hole.
   */
  calculateDrillingParams(
    hole: StartHole,
    workpiece: WorkpieceSpec
  ): StartHoleDrillingParams {
    const notes: string[] = [];

    if (hole.method === "drill") {
      return this.calculateDrillParams(hole, workpiece, notes);
    }
    return this.calculateHolePopperParams(hole, workpiece, notes);
  }

  private calculateDrillParams(
    hole: StartHole,
    workpiece: WorkpieceSpec,
    notes: string[]
  ): StartHoleDrillingParams {
    const baseParams = DRILL_PARAMS[workpiece.material] ?? DRILL_PARAMS.mild_steel;

    // Scale RPM inversely with diameter ratio (baseline 2mm)
    const diamRatio = 2.0 / hole.diameter_mm;
    const rpm = Math.round(baseParams.rpm * diamRatio);
    const feed = round2(baseParams.feed_mmpm * (hole.diameter_mm / 2.0));
    const peck = round2(baseParams.peck_mm * (hole.diameter_mm / 2.0));

    // Time estimate: depth / effective_feed, with peck retract overhead ~30%
    const effectiveFeed = feed * 0.7; // peck overhead
    const time = hole.depth_mm / effectiveFeed;

    if (hole.depth_mm / hole.diameter_mm > 10) {
      notes.push("High L/D ratio — use through-coolant drill or pilot first");
    }
    if (hole.diameter_mm < 1.5) {
      notes.push("Small drill — reduce feed, use spot drill first");
    }

    return {
      hole_id: hole.id,
      method: "drill",
      diameter_mm: hole.diameter_mm,
      depth_mm: hole.depth_mm,
      drill_rpm: rpm,
      drill_feed_mmpm: feed,
      peck_depth_mm: peck,
      estimated_time_min: round2(time),
      notes,
    };
  }

  private calculateHolePopperParams(
    hole: StartHole,
    workpiece: WorkpieceSpec,
    notes: string[]
  ): StartHoleDrillingParams {
    const params = HOLE_POPPER_PARAMS[workpiece.material] ?? HOLE_POPPER_PARAMS.tool_steel;

    // Electrode is typically copper or brass tube
    const electrodeDiam = hole.diameter_mm <= 1.0 ? hole.diameter_mm : hole.diameter_mm * 0.8;

    // Time: depth / burn rate, adjusted for diameter
    const diamFactor = hole.diameter_mm / 1.0; // baseline 1mm
    const effectiveRate = params.rate_mm_per_min / Math.sqrt(diamFactor);
    const time = hole.depth_mm / effectiveRate;

    if (hole.depth_mm > 50) {
      notes.push("Deep hole — monitor electrode wear, may need electrode replacement mid-burn");
    }
    if (workpiece.material === "carbide") {
      notes.push("Carbide: use copper-tungsten electrode, reduce current, expect slow burn rate");
    }

    return {
      hole_id: hole.id,
      method: "edm_hole_popper",
      diameter_mm: hole.diameter_mm,
      depth_mm: hole.depth_mm,
      electrode_diameter_mm: round2(electrodeDiam),
      electrode_material: workpiece.material === "carbide" ? "copper-tungsten" : "brass_tube",
      pulse_on_us: params.pulse_on_us,
      pulse_off_us: params.pulse_off_us,
      current_a: params.current_a,
      estimated_time_min: round2(time),
      notes,
    };
  }

  // ==========================================================================
  // MS5 U05: THREADING SEQUENCE PLANNER
  // ==========================================================================

  /**
   * Plan the order of profile cutting and threading.
   * Considers slug management, auto-thread compatibility, and wire travel.
   */
  planThreadingSequence(
    profiles: ProfileGeometry[],
    holes: StartHole[]
  ): ThreadingSequencePlan {
    const notes: string[] = [];

    // Build profile-to-hole mapping
    const holeMap = new Map<string, StartHole>();
    for (const h of holes) {
      for (const pid of h.serves_profiles) {
        holeMap.set(pid, h);
      }
    }

    // Sort profiles: exterior first (no slug issues), then interior by slug weight ascending
    const sorted = [...profiles].sort((a, b) => {
      // Exterior before interior
      if (!a.is_interior && b.is_interior) return -1;
      if (a.is_interior && !b.is_interior) return 1;

      // Among interiors: lightest slug first (easier auto-thread after slug drop)
      const wa = a.slug_weight_kg ?? 0;
      const wb = b.slug_weight_kg ?? 0;
      return wa - wb;
    });

    let autoCount = 0;
    let manualCount = 0;

    const sequence: ThreadingSequenceEntry[] = sorted.map((p, idx) => {
      const hole = holeMap.get(p.id);
      const autoThread = hole?.auto_thread_compatible ?? p.auto_thread_possible ?? false;

      if (autoThread) autoCount++;
      else manualCount++;

      const slugNotes: string[] = [];
      let slugManagement = "none";

      if (p.is_interior) {
        const slugW = p.slug_weight_kg ?? 0;
        if (slugW > 0.5) {
          slugManagement = "glue_tab_or_magnet";
          slugNotes.push(
            `Heavy slug (${slugW}kg) — use glue tab or magnetic holder to prevent drop damage`
          );
        } else if (slugW > 0.1) {
          slugManagement = "controlled_drop";
          slugNotes.push("Medium slug — allow controlled drop, verify clearance below workpiece");
        } else {
          slugManagement = "free_drop";
          slugNotes.push("Light slug — free drop into tank, no special management needed");
        }
      }

      return {
        order: idx + 1,
        profile_id: p.id,
        start_hole_id: hole?.id ?? "UNKNOWN",
        threading_direction: "down" as ThreadingDirection,
        auto_thread: autoThread,
        slug_management: slugManagement,
        notes: slugNotes,
      };
    });

    if (manualCount > 0) {
      notes.push(
        `${manualCount} profile(s) require manual threading — plan operator attendance`
      );
    }
    if (autoCount === profiles.length) {
      notes.push("All profiles auto-thread compatible — unattended operation possible");
    }

    // Note if interior profiles with heavy slugs exist
    const heavySlugs = profiles.filter(
      (p) => p.is_interior && (p.slug_weight_kg ?? 0) > 0.5
    );
    if (heavySlugs.length > 0) {
      notes.push(
        `${heavySlugs.length} interior profile(s) with heavy slugs — verify slug retention strategy`
      );
    }

    return {
      sequence,
      total_profiles: profiles.length,
      auto_thread_count: autoCount,
      manual_thread_count: manualCount,
      notes,
    };
  }

  // ==========================================================================
  // MS6 U01: EDM FIXTURE DESIGNER
  // ==========================================================================

  /**
   * Select and specify fixture for WEDM workholding.
   * Must not obstruct wire path or flushing nozzles.
   */
  designFixture(
    workpiece: WorkpieceSpec,
    profiles: ProfileGeometry[]
  ): { fixture_type: FixtureType; details: string; notes: string[] } {
    const notes: string[] = [];

    // Get preferred fixtures for material
    const preferences = FIXTURE_PREFERENCE[workpiece.material] ?? FIXTURE_PREFERENCE.mild_steel;

    // Check magnetic chuck suitability
    let fixtureType = preferences[0];

    if (fixtureType === "magnetic_chuck") {
      if (workpiece.is_magnetic === false) {
        notes.push("Non-magnetic material — cannot use magnetic chuck");
        fixtureType = preferences[1] ?? "precision_vise";
      } else if (workpiece.thickness_mm < 5) {
        notes.push("Thin workpiece — magnetic holding force may be insufficient");
        fixtureType = preferences[1] ?? "precision_vise";
      } else if (this.hasPerimeterCuts(profiles, workpiece)) {
        notes.push(
          "Perimeter cuts may release workpiece from magnetic chuck — use mechanical clamping"
        );
        fixtureType = "step_clamp";
      }
    }

    // Check if vise jaws would obstruct wire
    if (fixtureType === "precision_vise") {
      const maxProfileY = Math.max(...profiles.map((p) => p.max_y_mm));
      if (maxProfileY > workpiece.width_mm * 0.8) {
        notes.push("Profiles extend near vise jaw — verify wire clearance from fixed jaw");
      }
    }

    // Build fixture details
    let details: string;
    switch (fixtureType) {
      case "magnetic_chuck":
        details = `Fine-pole magnetic chuck. Holding force: ~${round2(workpiece.weight_kg * 3)}N minimum. ` +
          `Ensure poles perpendicular to wire travel. Clean chuck surface before mounting. ` +
          `Keep flushing nozzles clear of chuck edges.`;
        break;
      case "precision_vise":
        details = `Precision vise with ground jaws. Clamp on ${workpiece.thickness_mm >= workpiece.width_mm ? "width" : "thickness"} dimension. ` +
          `Set parallels for Z-clearance below workpiece. ` +
          `Torque jaws to spec — overtightening distorts thin parts. ` +
          `Position vise so wire path is fully clear of jaws.`;
        break;
      case "pallet_system":
        details = `3R/Erowa pallet with precision locating pins. Zero-point repeatability <0.002mm. ` +
          `Mount workpiece to sub-plate, qualify datum edges. ` +
          `Pallet provides full 360° wire access around workpiece.`;
        break;
      case "dedicated_fixture":
        details = `Custom fixture required. Design considerations: ` +
          `(1) Wire clearance all around profiles + 10mm margin, ` +
          `(2) Flushing nozzle clearance top and bottom, ` +
          `(3) Clamping forces distributed to avoid distortion, ` +
          `(4) Fixture material must be compatible with dielectric.`;
        break;
      case "step_clamp":
        details = `Step clamps on workpiece perimeter. Position clamps >${PREFERRED_EDGE_CLEARANCE_MM}mm from nearest wire path. ` +
          `Use minimum 4 clamps for stability. Torque evenly. ` +
          `Verify no clamp interferes with upper/lower flushing heads.`;
        break;
      case "angle_plate":
        details = `Angle plate for vertical workpiece orientation. ` +
          `Bolt workpiece to plate, indicate true. Verify wire can access all profiles.`;
        break;
      case "v_block":
        details = `V-block for round/cylindrical stock. Strap clamp to secure. ` +
          `Indicate to find center, set work coordinates accordingly.`;
        break;
      default:
        details = `Standard workholding — verify wire and flushing clearance.`;
    }

    notes.push("Verify upper and lower flushing nozzle clearance before starting cut");
    notes.push("Ensure fixture does not contact wire guide assemblies during axis travel");

    return { fixture_type: fixtureType, details, notes };
  }

  /**
   * Check if any profiles cut near the workpiece perimeter (risk of releasing part from fixture).
   */
  private hasPerimeterCuts(profiles: ProfileGeometry[], workpiece: WorkpieceSpec): boolean {
    const margin = 3.0; // mm from edge
    return profiles.some(
      (p) =>
        !p.is_interior &&
        (p.min_x_mm < margin ||
          p.min_y_mm < margin ||
          p.max_x_mm > workpiece.length_mm - margin ||
          p.max_y_mm > workpiece.width_mm - margin)
    );
  }

  // ==========================================================================
  // MS6 U02: DATUM ALIGNMENT PLANNER
  // ==========================================================================

  /**
   * Plan datum alignment method based on workpiece geometry and available features.
   */
  planDatumAlignment(
    workpiece: WorkpieceSpec,
    hasReferenceHole: boolean = false,
    hasMachineEdges: boolean = true
  ): { method: DatumMethod; steps: string[]; estimated_time_min: number; notes: string[] } {
    const notes: string[] = [];
    const steps: string[] = [];
    let method: DatumMethod;
    let time: number;

    if (hasReferenceHole) {
      method = "hole_center_find";
      time = SETUP_TIME.hole_center_find;
      steps.push(
        "1. Jog wire to approximate hole center visually",
        "2. Run hole-center-find routine (automatic on most WEDM controllers)",
        "3. Controller probes 4 points on hole wall with wire contact sensing",
        "4. Computed center becomes datum origin (or offset)",
        "5. Record coordinates, verify with second measurement",
        "6. If two reference holes: find both, compute rotation angle"
      );
      notes.push("Hole center-find provides excellent repeatability (<0.002mm)");
      if (!workpiece.is_hardened) {
        notes.push("Unhardened hole may show burrs — deburr before probing");
      }
    } else if (hasMachineEdges) {
      method = "wire_edge_find";
      time = SETUP_TIME.edge_find;
      steps.push(
        "1. Jog wire near X-reference edge, ~5mm away",
        "2. Run edge-find routine: wire approaches edge at slow speed",
        "3. Contact detected via electrical continuity → X datum set",
        "4. Move to Y-reference edge, repeat edge-find",
        "5. Y datum set — origin established at corner intersection",
        "6. Verify by jogging to known dimension and checking with indicator"
      );
      notes.push("Wire edge-find accuracy: ±0.003mm typical");
      notes.push("Ensure edges are clean, burr-free, and square for accurate results");
    } else {
      method = "indicator_alignment";
      time = SETUP_TIME.indicator_alignment;
      steps.push(
        "1. Mount DTI (dial test indicator) in wire guide holder or spindle",
        "2. Indicate X-reference surface along full travel — adjust rotation until <0.005mm TIR",
        "3. Set X datum at indicated surface",
        "4. Indicate Y-reference surface, set Y datum",
        "5. Remove indicator, re-mount wire guides",
        "6. Verify datum with edge-find as confirmation"
      );
      notes.push("Indicator alignment is slowest but works on any geometry");
      notes.push("Requires removing wire guides — plan for re-threading after alignment");
    }

    return { method, steps, estimated_time_min: time, notes };
  }

  // ==========================================================================
  // MS6 U03: WORKPIECE LEVELING GUIDE
  // ==========================================================================

  /**
   * Generate workpiece leveling procedure.
   * Target: <0.005mm over part length.
   */
  generateLevelingGuide(
    workpiece: WorkpieceSpec
  ): {
    required: boolean;
    tolerance_mm: number;
    steps: string[];
    estimated_time_min: number;
    notes: string[];
  } {
    const notes: string[] = [];
    const steps: string[] = [];

    // Leveling is always required for WEDM — wire must be perpendicular to workpiece
    const required = true;
    const tolerance = LEVELING_TOLERANCE_MM;
    const time = SETUP_TIME.leveling;

    // Determine measurement points based on workpiece size
    const diagLength = Math.hypot(workpiece.length_mm, workpiece.width_mm);
    const numPoints = diagLength > 200 ? 8 : diagLength > 100 ? 6 : 4;

    steps.push(
      "1. Clean workpiece top surface and fixture mounting surface thoroughly",
      "2. Mount workpiece on fixture, snug but not fully tightened",
      `3. Mount DTI (0.001mm resolution) on wire guide head or machine column`,
      `4. Zero DTI at first measurement point (near datum corner)`,
      `5. Traverse X-axis full length — record deviation at ${Math.ceil(numPoints / 2)} equally-spaced points`,
      `6. If X deviation > ${tolerance}mm: shim under low side, re-measure`,
      `7. Traverse Y-axis full width — record deviation at ${Math.floor(numPoints / 2)} equally-spaced points`,
      `8. If Y deviation > ${tolerance}mm: shim under low side, re-measure`,
      "9. Re-check X after Y adjustment (adjustments interact)",
      `10. Final verification: both axes within ${tolerance}mm over full travel`,
      "11. Fully tighten fixture clamps, re-verify level did not shift",
      "12. Record final DTI readings in setup sheet"
    );

    if (workpiece.thickness_mm < 5) {
      notes.push("Thin workpiece — clamp force may cause deflection. Use minimal clamping force.");
    }
    if (diagLength > 300) {
      notes.push(
        "Large workpiece — thermal expansion significant. Allow part to temperature-soak before final leveling."
      );
    }
    if (workpiece.weight_kg > 20) {
      notes.push("Heavy workpiece — use crane/hoist, verify fixture capacity");
    }

    notes.push(`Target: <${tolerance}mm deviation over ${round1(diagLength)}mm diagonal`);

    return { required, tolerance_mm: tolerance, steps, estimated_time_min: time, notes };
  }

  // ==========================================================================
  // MS6 U04: SUBMERGED LEVEL CALCULATOR
  // ==========================================================================

  /**
   * Calculate required dielectric level and volume.
   * Rule: dielectric level = top of workpiece + 20mm minimum.
   */
  calculateDielectricLevel(
    workpiece: WorkpieceSpec,
    tank: TankSpec,
    fixtureHeight_mm: number = 0
  ): {
    dielectric_level_mm: number;
    dielectric_volume_liters: number;
    fill_additional_liters: number;
    notes: string[];
  } {
    const notes: string[] = [];

    // Total height: fixture + workpiece + margin
    const workpieceTop = fixtureHeight_mm + workpiece.thickness_mm;
    const requiredLevel = workpieceTop + DIELECTRIC_ABOVE_WORKPIECE_MM;

    // Check against tank max fill
    if (requiredLevel > tank.max_fill_height_mm) {
      notes.push(
        `WARNING: Required level (${round1(requiredLevel)}mm) exceeds tank max fill (${tank.max_fill_height_mm}mm). ` +
        `Reduce fixture height or use taller tank.`
      );
    }

    const effectiveLevel = Math.min(requiredLevel, tank.max_fill_height_mm);

    // Volume calculation: tank cross-section × fill height
    // Subtract approximate workpiece + fixture volume displacement
    const tankVolume_mm3 = tank.tank_length_mm * tank.tank_width_mm * effectiveLevel;
    const workpieceVolume_mm3 =
      workpiece.length_mm * workpiece.width_mm * workpiece.thickness_mm;
    // Rough fixture displacement estimate: 10% of workpiece volume
    const fixtureVolume_mm3 = workpieceVolume_mm3 * 0.1;

    const netVolume_mm3 = tankVolume_mm3 - workpieceVolume_mm3 - fixtureVolume_mm3;
    const requiredLiters = round2(netVolume_mm3 * MM3_TO_LITERS);
    const currentLiters = tank.current_volume_liters ?? 0;
    const additionalLiters = round2(Math.max(0, requiredLiters - currentLiters));

    notes.push(`Workpiece top at ${round1(workpieceTop)}mm above table`);
    notes.push(`Dielectric level set to ${round1(effectiveLevel)}mm (${DIELECTRIC_ABOVE_WORKPIECE_MM}mm above workpiece)`);
    if (additionalLiters > 0) {
      notes.push(`Add ${additionalLiters} liters of dielectric fluid`);
    } else {
      notes.push("Sufficient dielectric volume already in tank");
    }

    return {
      dielectric_level_mm: round2(effectiveLevel),
      dielectric_volume_liters: requiredLiters,
      fill_additional_liters: additionalLiters,
      notes,
    };
  }

  // ==========================================================================
  // MS6 U05: SETUP SEQUENCE GENERATOR
  // ==========================================================================

  /**
   * Generate complete WEDM setup checklist.
   * Sequence: clean → mount → level → fill → thread → edge-find → load tech → verify → start
   */
  generateSetupSequence(
    workpiece: WorkpieceSpec,
    profiles: ProfileGeometry[],
    holes: StartHole[],
    tank: TankSpec,
    wireDiameter_mm: number = 0.25
  ): SetupPlan {
    // Compute each sub-plan
    const fixture = this.designFixture(workpiece, profiles);
    const datum = this.planDatumAlignment(workpiece);
    const leveling = this.generateLevelingGuide(workpiece);
    const dielectric = this.calculateDielectricLevel(workpiece, tank);
    const threading = this.planThreadingSequence(profiles, holes);

    // Build checklist
    const checklist: string[] = [
      // Phase 1: Clean
      "1. CLEAN: Wipe machine table and tank interior — remove swarf and residue",
      "2. CLEAN: Inspect and clean upper/lower wire guides, flush nozzles, power contacts",
      `3. CLEAN: Degrease workpiece mounting surfaces with solvent`,

      // Phase 2: Mount
      `4. MOUNT: Install ${fixture.fixture_type} on machine table`,
      `5. MOUNT: Place workpiece on fixture — ${fixture.details.split(".")[0]}`,
      "6. MOUNT: Snug clamps (do not fully tighten yet — leveling first)",

      // Phase 3: Level
      `7. LEVEL: Mount DTI on machine head`,
      `8. LEVEL: Indicate X and Y axes — target <${leveling.tolerance_mm}mm over full travel`,
      "9. LEVEL: Shim as needed, re-check both axes after each adjustment",
      "10. LEVEL: Fully tighten clamps, re-verify level",

      // Phase 4: Fill
      `11. FILL: Set dielectric level to ${round1(dielectric.dielectric_level_mm)}mm`,
      `12. FILL: Verify workpiece fully submerged with >${DIELECTRIC_ABOVE_WORKPIECE_MM}mm margin`,
      "13. FILL: Check dielectric conductivity and filtration status",

      // Phase 5: Thread
      `14. THREAD: Load wire spool — ${wireDiameter_mm}mm diameter, verify wire type matches tech`,
      "15. THREAD: Run wire through upper guide → workpiece gap → lower guide → take-up",
      "16. THREAD: Set wire tension per machine manual for wire diameter",
      "17. THREAD: Test auto-thread function in start hole (if equipped)",

      // Phase 6: Edge-find / Datum
      `18. DATUM: ${datum.steps[0]}`,
      `19. DATUM: Run ${datum.method.replace(/_/g, " ")} routine`,
      "20. DATUM: Set work coordinate system origin",
      "21. DATUM: Verify datum by jogging to known reference point",

      // Phase 7: Load tech
      "22. TECH: Load NC program / technology file for first profile",
      "23. TECH: Verify cutting conditions match material and wire type",
      "24. TECH: Set offset/compensation values for finish dimension",

      // Phase 8: Verify
      "25. VERIFY: Dry-run first profile in graphics/simulation mode",
      "26. VERIFY: Check wire path clears fixture, clamps, and tank walls",
      "27. VERIFY: Confirm start hole positions match programmed positions",
      "28. VERIFY: Check flushing pressure settings (upper and lower nozzles)",

      // Phase 9: Start
      "29. START: Close tank doors / enable interlock",
      "30. START: Press cycle start — monitor first few minutes for stable cutting",
      "31. START: Verify wire tension stable, flushing adequate, no sparking anomalies",
    ];

    // Threading sequence as strings
    const threadingSeq = threading.sequence.map(
      (s) =>
        `${s.order}. Profile ${s.profile_id} via hole ${s.start_hole_id} ` +
        `[${s.auto_thread ? "auto-thread" : "MANUAL thread"}] ` +
        `${s.slug_management !== "none" ? `(slug: ${s.slug_management})` : ""}`
    );

    // Total time
    const fixtureTimeKey = `fixture_${fixture.fixture_type.split("_")[0]}` as string;
    const fixtureTime = SETUP_TIME[fixtureTimeKey] ?? 15;
    const totalTime =
      fixtureTime +
      leveling.estimated_time_min +
      datum.estimated_time_min +
      SETUP_TIME.fill_dielectric +
      threading.sequence.reduce(
        (sum, s) =>
          sum + (s.auto_thread ? SETUP_TIME.thread_wire_auto : SETUP_TIME.thread_wire_manual),
        0
      ) +
      SETUP_TIME.verify_program;

    return {
      fixture_type: fixture.fixture_type,
      fixture_details: fixture.details,
      datum_method: datum.method,
      leveling_required: leveling.required,
      leveling_tolerance_mm: leveling.tolerance_mm,
      dielectric_level_mm: dielectric.dielectric_level_mm,
      dielectric_volume_liters: dielectric.dielectric_volume_liters,
      setup_checklist: checklist,
      estimated_setup_time_min: round2(totalTime),
      threading_sequence: threadingSeq,
    };
  }

  // ==========================================================================
  // ACTION DISPATCH: plan_start_holes, plan_setup, plan_threading_sequence, full_plan
  // ==========================================================================

  /**
   * Action: plan_start_holes
   * Plans all start holes for the given profiles and workpiece.
   */
  action_plan_start_holes(params: {
    profiles: ProfileGeometry[];
    workpiece: WorkpieceSpec;
    wire_diameter_mm?: number;
  }): StartHolePlan {
    return this.planStartHoles(
      params.profiles,
      params.workpiece,
      params.wire_diameter_mm ?? 0.25
    );
  }

  /**
   * Action: plan_setup
   * Plans complete workholding and setup for WEDM.
   */
  action_plan_setup(params: {
    profiles: ProfileGeometry[];
    workpiece: WorkpieceSpec;
    holes: StartHole[];
    tank: TankSpec;
    wire_diameter_mm?: number;
  }): SetupPlan {
    return this.generateSetupSequence(
      params.workpiece,
      params.profiles,
      params.holes,
      params.tank,
      params.wire_diameter_mm ?? 0.25
    );
  }

  /**
   * Action: plan_threading_sequence
   * Plans threading/cutting order for all profiles.
   */
  action_plan_threading_sequence(params: {
    profiles: ProfileGeometry[];
    holes: StartHole[];
  }): ThreadingSequencePlan {
    return this.planThreadingSequence(params.profiles, params.holes);
  }

  /**
   * Action: full_plan
   * Runs all planning stages and returns a consolidated result.
   */
  action_full_plan(params: {
    profiles: ProfileGeometry[];
    workpiece: WorkpieceSpec;
    tank: TankSpec;
    wire_diameter_mm?: number;
  }): FullEDMSetupPlan {
    const wireDiam = params.wire_diameter_mm ?? 0.25;

    // MS5: Start hole planning
    const startHoles = this.planStartHoles(params.profiles, params.workpiece, wireDiam);

    // MS5: Drilling parameters for each hole
    const drillingParams = startHoles.holes.map((h) =>
      this.calculateDrillingParams(h, params.workpiece)
    );

    // MS5: Threading sequence
    const threadingSequence = this.planThreadingSequence(params.profiles, startHoles.holes);

    // MS6: Complete setup
    const setup = this.generateSetupSequence(
      params.workpiece,
      params.profiles,
      startHoles.holes,
      params.tank,
      wireDiam
    );

    // Total time: start holes + setup
    const totalTime =
      startHoles.estimated_time_min + setup.estimated_setup_time_min;

    return {
      start_holes: startHoles,
      threading_sequence: threadingSequence,
      setup,
      drilling_params: drillingParams,
      total_estimated_time_min: round2(totalTime),
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** EDM Start Hole & Setup Engine — consolidated MS5 + MS6. */
export const edmStartHoleSetupEngine = new EDMStartHoleSetupEngine();

export { EDMStartHoleSetupEngine as EDMStartHoleSetupEngineClass };
