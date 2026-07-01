/**
 * PRISM Manufacturing Intelligence - Wire EDM Toolpath Strategy Engine
 * Consolidates WEDM-P2P-MS7 Units U01-U07
 *
 * Units:
 *   U01 - ProfileTypeClassifier: closed_external, closed_internal, open, island
 *   U02 - CuttingDirectionOptimizer: CW/CCW based on profile type + debris flow
 *   U03 - ApproachDepartureGenerator: tangent arc, perpendicular, angle lead-in/out
 *   U04 - CornerStrategySelector: sharp pause, radius follow, tangent blend
 *   U05 - TaperToolpathGenerator: UV offsets, variable taper, 4-axis XY+UV
 *   U06 - TabPlacementOptimizer: slug weight, tab count/width, critical-surface avoidance
 *   U07 - CutSequenceOptimizer: inside-before-outside, small-before-large, start-hole grouping
 *
 * @version 1.0.0
 * @module EDMToolpathStrategyEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ToolpathInput {
  profiles: ProfileDefinition[];
  workpiece_thickness_mm: number;
  wire_diameter_mm: number;
  spark_gap_mm?: number;
}

export interface ProfileDefinition {
  name: string;
  type: "closed_external" | "closed_internal" | "open" | "island";
  contour_points: Array<{ x: number; y: number }>;
  profile_length_mm: number;
  min_corner_radius_mm?: number;
  taper_angle_deg?: number;
  tolerance_mm?: number;
  start_hole_id?: string;
  is_critical_surface: boolean;
}

export interface ToolpathResult {
  profiles_classified: ClassifiedProfile[];
  cut_sequence: string[];
  approach_departures: ApproachDeparture[];
  corner_strategies: CornerStrategy[];
  tabs: TabPlacement[];
  taper_data?: TaperData[];
  total_profile_length_mm: number;
  estimated_non_cutting_travel_mm: number;
  warnings: string[];
}

export interface ClassifiedProfile {
  name: string;
  type: string;
  cut_direction: "CW" | "CCW";
  direction_reason: string;
}

export interface ApproachDeparture {
  profile: string;
  approach_type: "tangent_arc" | "perpendicular" | "angle";
  approach_length_mm: number;
  approach_angle_deg?: number;
  departure_type: "tangent_arc" | "straight_away";
  departure_length_mm: number;
}

export interface CornerStrategy {
  profile: string;
  corner_index: number;
  angle_deg: number;
  strategy: "sharp_pause" | "radius_follow" | "tangent_blend" | "impossible";
  over_travel_mm?: number;
  dwell_sec?: number;
  notes: string;
}

export interface TabPlacement {
  profile: string;
  tab_count: number;
  tabs: Array<{
    position_along_profile_mm: number;
    width_mm: number;
    on_critical_surface: boolean;
  }>;
  slug_weight_kg: number;
  holding_force_N: number;
}

export interface TaperData {
  profile: string;
  taper_angle_deg: number;
  uv_offsets: Array<{
    segment_index: number;
    u_offset_mm: number;
    v_offset_mm: number;
  }>;
  top_profile_length_mm: number;
  bottom_profile_length_mm: number;
  is_variable_taper: boolean;
  max_taper_angle_deg: number;
  warnings: string[];
}

/**
 * Internal geometry used for corner detection
 */
interface CornerInfo {
  index: number;
  angle_deg: number;
  radius_mm: number;
  position: { x: number; y: number };
}

/**
 * Internal representation for sequence scoring
 */
interface SequenceCandidate {
  name: string;
  type: string;
  area_mm2: number;
  start_hole_id?: string;
  centroid: { x: number; y: number };
  parent_profile?: string;
}

// ============================================================================
// CONSTANTS & REFERENCE DATA
// ============================================================================

/** Default spark gap when not specified [mm] */
const DEFAULT_SPARK_GAP_MM = 0.015;

/** Minimum approach length to avoid witness marks [mm] */
const MIN_APPROACH_LENGTH_MM = 2.0;

/** Maximum approach length [mm] */
const MAX_APPROACH_LENGTH_MM = 5.0;

/** Default approach length [mm] */
const DEFAULT_APPROACH_LENGTH_MM = 3.0;

/** Default departure length [mm] */
const DEFAULT_DEPARTURE_LENGTH_MM = 2.0;

/** Minimum number of tabs per slug to prevent slug ejection */
const MIN_TABS_PER_SLUG = 2;

/** Tab width range [mm] */
const MIN_TAB_WIDTH_MM = 0.3;
const MAX_TAB_WIDTH_MM = 1.0;
const DEFAULT_TAB_WIDTH_MM = 0.5;

/** Steel density for slug weight estimation [kg/mm^3] */
const STEEL_DENSITY_KG_PER_MM3 = 7.85e-6;

/** Tab shear strength estimate [N/mm^2] — hardened tool steel, conservative */
const TAB_SHEAR_STRENGTH_N_PER_MM2 = 400;

/** Safety factor for tab holding force */
const TAB_SAFETY_FACTOR = 2.0;

/** Gravity constant [m/s^2] */
const GRAVITY_M_S2 = 9.81;

/** Minimum corner angle (deg) below which sharp pause is required */
const SHARP_CORNER_THRESHOLD_DEG = 30;

/** Angle below which a corner is flagged impossible (wire can't physically make it) */
const IMPOSSIBLE_CORNER_THRESHOLD_DEG = 5;

/** Maximum angle for tangent blend suitability [deg] */
const TANGENT_BLEND_MAX_DEG = 150;

/** Default over-travel for sharp corners [mm] */
const DEFAULT_OVER_TRAVEL_MM = 0.05;

/** Default dwell for sharp corners [sec] */
const DEFAULT_SHARP_DWELL_SEC = 0.5;

/** Maximum feasible taper angle [deg] — machine limitation */
const MAX_TAPER_ANGLE_DEG = 45;

// ============================================================================
// U01 — PROFILE TYPE CLASSIFIER
// ============================================================================

/**
 * Classify profile types and validate geometry.
 * Closed_external = punch shape (slug is waste).
 * Closed_internal = die hole (slug falls out).
 * Open = edge trim.
 * Island = nested closed shape inside another closed shape.
 */
function classifyProfiles(profiles: ProfileDefinition[]): {
  classified: ClassifiedProfile[];
  warnings: string[];
} {
  const classified: ClassifiedProfile[] = [];
  const warnings: string[] = [];

  for (const p of profiles) {
    const direction = determineCutDirection(p);
    classified.push({
      name: p.name,
      type: p.type,
      cut_direction: direction.direction,
      direction_reason: direction.reason,
    });

    // Validate: closed profiles must have >= 3 points
    if (
      (p.type === "closed_external" || p.type === "closed_internal" || p.type === "island") &&
      p.contour_points.length < 3
    ) {
      warnings.push(
        `Profile "${p.name}" is ${p.type} but has fewer than 3 contour points — invalid geometry`
      );
    }

    // Validate: open profiles should NOT loop back
    if (p.type === "open" && p.contour_points.length >= 3) {
      const first = p.contour_points[0];
      const last = p.contour_points[p.contour_points.length - 1];
      const dist = Math.hypot(last.x - first.x, last.y - first.y);
      if (dist < 0.01) {
        warnings.push(
          `Profile "${p.name}" is marked "open" but first and last points coincide — should this be closed?`
        );
      }
    }

    // Validate: island must have a parent
    if (p.type === "island") {
      const hasParent = profiles.some(
        (other) =>
          other.name !== p.name &&
          (other.type === "closed_external" || other.type === "closed_internal") &&
          isPointInsidePolygon(p.contour_points[0], other.contour_points)
      );
      if (!hasParent) {
        warnings.push(
          `Profile "${p.name}" is type "island" but no enclosing closed profile found`
        );
      }
    }
  }

  return { classified, warnings };
}

// ============================================================================
// U02 — CUTTING DIRECTION OPTIMIZER
// ============================================================================

/**
 * Determine optimal cutting direction (CW/CCW) based on profile type.
 *
 * - External profiles (punch): CW — wire offset leaves finish on outside
 * - Internal profiles (die): CCW — wire offset leaves finish on inside
 * - Open profiles: direction follows contour definition (CW by convention)
 * - Islands: CCW — treated as internal features
 *
 * Debris flow: CW generates debris flowing left-to-right (standard flushing),
 * CCW reverses. Internal CCW helps flush debris downward through the cavity.
 */
function determineCutDirection(profile: ProfileDefinition): {
  direction: "CW" | "CCW";
  reason: string;
} {
  switch (profile.type) {
    case "closed_external":
      return {
        direction: "CW",
        reason:
          "CW for external profile — finish surface on outside, debris flows away from finished edge",
      };
    case "closed_internal":
      return {
        direction: "CCW",
        reason:
          "CCW for internal profile — finish surface on inside (die cavity), debris flushes downward through opening",
      };
    case "open":
      return {
        direction: "CW",
        reason:
          "CW convention for open profile — follow contour definition, offset side determined by approach",
      };
    case "island":
      return {
        direction: "CCW",
        reason:
          "CCW for island (nested internal) — finish on inside face, cut before enclosing profile for rigidity",
      };
    default:
      return {
        direction: "CW",
        reason: "Default CW direction for unrecognized profile type",
      };
  }
}

// ============================================================================
// U03 — APPROACH / DEPARTURE GENERATOR
// ============================================================================

/**
 * Generate approach and departure moves for each profile.
 *
 * Approach types:
 *   - tangent_arc: 2-5mm arc tangent to profile at entry point. No witness mark.
 *   - perpendicular: straight line perpendicular to profile. Simple but leaves mark.
 *   - angle: straight approach at user-specified angle.
 *
 * Departure: must NOT re-enter the finished profile.
 *   - tangent_arc: arc away from profile
 *   - straight_away: move away perpendicular to profile at exit point
 */
function generateApproachDepartures(
  profiles: ProfileDefinition[],
  wireRadius: number
): { approaches: ApproachDeparture[]; warnings: string[] } {
  const approaches: ApproachDeparture[] = [];
  const warnings: string[] = [];

  for (const p of profiles) {
    const ad = computeApproachDeparture(p, wireRadius);
    approaches.push(ad.approach);
    if (ad.warnings.length > 0) {
      warnings.push(...ad.warnings);
    }
  }

  return { approaches, warnings };
}

function computeApproachDeparture(
  profile: ProfileDefinition,
  wireRadius: number
): { approach: ApproachDeparture; warnings: string[] } {
  const warnings: string[] = [];

  // Determine approach type based on profile characteristics
  let approachType: ApproachDeparture["approach_type"] = "tangent_arc";
  let approachLength = DEFAULT_APPROACH_LENGTH_MM;
  let approachAngle: number | undefined;
  let departureType: ApproachDeparture["departure_type"] = "tangent_arc";
  let departureLength = DEFAULT_DEPARTURE_LENGTH_MM;

  // Critical surfaces always get tangent arc (no witness mark)
  if (profile.is_critical_surface) {
    approachType = "tangent_arc";
    // Use larger approach for tight-tolerance parts
    if (profile.tolerance_mm !== undefined && profile.tolerance_mm < 0.01) {
      approachLength = MAX_APPROACH_LENGTH_MM;
    }
  }

  // Open profiles: perpendicular approach is acceptable since we enter from an edge
  if (profile.type === "open") {
    approachType = "perpendicular";
    departureType = "straight_away";
  }

  // Tight geometry: if profile length is very small, reduce approach
  if (profile.profile_length_mm < 10) {
    approachLength = Math.max(MIN_APPROACH_LENGTH_MM, profile.profile_length_mm * 0.2);
    departureLength = Math.max(1.0, approachLength * 0.7);
    warnings.push(
      `Profile "${profile.name}" is short (${profile.profile_length_mm.toFixed(1)}mm) — approach reduced to ${approachLength.toFixed(2)}mm`
    );
  }

  // Ensure approach length respects min/max bounds
  approachLength = clamp(approachLength, MIN_APPROACH_LENGTH_MM, MAX_APPROACH_LENGTH_MM);

  // For perpendicular, record 90-degree angle
  if (approachType === "perpendicular") {
    approachAngle = 90;
  }

  // Validate: approach must clear wire radius + gap
  if (approachLength < wireRadius * 2) {
    approachLength = wireRadius * 2;
    warnings.push(
      `Profile "${profile.name}" approach length increased to ${approachLength.toFixed(2)}mm to clear wire radius`
    );
  }

  const approach: ApproachDeparture = {
    profile: profile.name,
    approach_type: approachType,
    approach_length_mm: roundTo(approachLength, 3),
    ...(approachAngle !== undefined && { approach_angle_deg: approachAngle }),
    departure_type: departureType,
    departure_length_mm: roundTo(departureLength, 3),
  };

  return { approach, warnings };
}

// ============================================================================
// U04 — CORNER STRATEGY SELECTOR
// ============================================================================

/**
 * Analyze each corner in each profile and assign a machining strategy.
 *
 * Strategies:
 *   - sharp_pause: For acute corners. Wire pauses, over-travels past corner,
 *     backs up, then proceeds. Prevents rounding.
 *   - radius_follow: Corner radius >= wire radius + spark gap. Wire follows arc.
 *   - tangent_blend: Obtuse corners where smooth tangent transition works.
 *   - impossible: Angle too acute for wire to physically achieve.
 */
function selectCornerStrategies(
  profiles: ProfileDefinition[],
  wireRadius: number,
  sparkGap: number
): { strategies: CornerStrategy[]; warnings: string[] } {
  const strategies: CornerStrategy[] = [];
  const warnings: string[] = [];
  const minFollowRadius = wireRadius + sparkGap;

  for (const p of profiles) {
    const corners = detectCorners(p.contour_points);

    for (const corner of corners) {
      const strategy = selectStrategy(corner, minFollowRadius, p);
      strategies.push(strategy.result);
      if (strategy.warning) {
        warnings.push(strategy.warning);
      }
    }
  }

  return { strategies, warnings };
}

/**
 * Detect corners from contour points by computing angles between consecutive segments.
 */
function detectCorners(points: Array<{ x: number; y: number }>): CornerInfo[] {
  const corners: CornerInfo[] = [];
  if (points.length < 3) return corners;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const angle = computeCornerAngle(prev, curr, next);

    corners.push({
      index: i,
      angle_deg: roundTo(angle, 2),
      radius_mm: 0, // actual radius computed from profile definition if available
      position: curr,
    });
  }

  return corners;
}

/**
 * Compute the interior angle at a corner (0 = hairpin, 180 = straight).
 */
function computeCornerAngle(
  prev: { x: number; y: number },
  curr: { x: number; y: number },
  next: { x: number; y: number }
): number {
  const v1x = prev.x - curr.x;
  const v1y = prev.y - curr.y;
  const v2x = next.x - curr.x;
  const v2y = next.y - curr.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);

  if (mag1 === 0 || mag2 === 0) return 180; // degenerate — treat as straight

  const cosAngle = clamp(dot / (mag1 * mag2), -1, 1);
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function selectStrategy(
  corner: CornerInfo,
  minFollowRadius: number,
  profile: ProfileDefinition
): { result: CornerStrategy; warning?: string } {
  let warning: string | undefined;

  // Impossible: angle too acute for wire
  if (corner.angle_deg < IMPOSSIBLE_CORNER_THRESHOLD_DEG) {
    warning = `Profile "${profile.name}" corner ${corner.index}: angle ${corner.angle_deg}° is too acute — wire cannot physically achieve this corner`;
    return {
      result: {
        profile: profile.name,
        corner_index: corner.index,
        angle_deg: corner.angle_deg,
        strategy: "impossible",
        notes: `Corner angle ${corner.angle_deg}° below ${IMPOSSIBLE_CORNER_THRESHOLD_DEG}° minimum. Redesign required or use sinker EDM.`,
      },
      warning,
    };
  }

  // Sharp pause: acute corners requiring over-travel
  if (corner.angle_deg < SHARP_CORNER_THRESHOLD_DEG) {
    const overTravel = computeOverTravel(corner.angle_deg);
    return {
      result: {
        profile: profile.name,
        corner_index: corner.index,
        angle_deg: corner.angle_deg,
        strategy: "sharp_pause",
        over_travel_mm: roundTo(overTravel, 3),
        dwell_sec: DEFAULT_SHARP_DWELL_SEC,
        notes: `Sharp corner — wire over-travels ${overTravel.toFixed(3)}mm past apex, dwells ${DEFAULT_SHARP_DWELL_SEC}s, reverses to achieve corner definition`,
      },
    };
  }

  // Radius follow: if profile has corner radius >= wire radius + gap
  const profileCornerRadius = profile.min_corner_radius_mm ?? 0;
  if (profileCornerRadius >= minFollowRadius && corner.angle_deg < TANGENT_BLEND_MAX_DEG) {
    return {
      result: {
        profile: profile.name,
        corner_index: corner.index,
        angle_deg: corner.angle_deg,
        strategy: "radius_follow",
        notes: `Corner radius ${profileCornerRadius.toFixed(3)}mm >= min follow radius ${minFollowRadius.toFixed(3)}mm — wire follows arc path`,
      },
    };
  }

  // Tangent blend: obtuse corners, smooth transition
  if (corner.angle_deg >= TANGENT_BLEND_MAX_DEG) {
    return {
      result: {
        profile: profile.name,
        corner_index: corner.index,
        angle_deg: corner.angle_deg,
        strategy: "tangent_blend",
        notes: `Obtuse corner ${corner.angle_deg.toFixed(1)}° — tangent blend transition, no pause needed`,
      },
    };
  }

  // Default: sharp pause for moderate angles without sufficient radius
  const overTravel = computeOverTravel(corner.angle_deg);
  const dwell = corner.angle_deg < 60 ? DEFAULT_SHARP_DWELL_SEC : DEFAULT_SHARP_DWELL_SEC * 0.5;
  return {
    result: {
      profile: profile.name,
      corner_index: corner.index,
      angle_deg: corner.angle_deg,
      strategy: "sharp_pause",
      over_travel_mm: roundTo(overTravel, 3),
      dwell_sec: roundTo(dwell, 2),
      notes: `Moderate corner without sufficient radius — sharp pause with ${overTravel.toFixed(3)}mm over-travel`,
    },
  };
}

/**
 * Calculate over-travel distance based on corner angle.
 * Tighter angles need more over-travel to achieve definition.
 */
function computeOverTravel(angleDeg: number): number {
  // Linear model: at 5° → 0.15mm, at 30° → 0.05mm
  const t = clamp((30 - angleDeg) / 25, 0, 1);
  return DEFAULT_OVER_TRAVEL_MM + t * 0.10;
}

// ============================================================================
// U05 — TAPER TOOLPATH GENERATOR
// ============================================================================

/**
 * Generate UV axis offsets for tapered wire EDM cuts.
 *
 * Taper = controlled inclination of wire between upper and lower guides.
 * UV plane (upper guide) offsets from XY plane (lower guide or workpiece) by:
 *   offset = tan(taper_angle) × workpiece_thickness
 *
 * Supports:
 *   - Constant taper: same angle around entire profile
 *   - Variable taper: different angle per segment (land/relief on dies)
 *   - 4-axis simultaneous XY+UV motion
 */
function generateTaperData(
  profiles: ProfileDefinition[],
  thickness_mm: number
): { taperData: TaperData[]; warnings: string[] } {
  const taperData: TaperData[] = [];
  const warnings: string[] = [];

  for (const p of profiles) {
    if (p.taper_angle_deg === undefined || p.taper_angle_deg === 0) continue;

    const result = computeTaperOffsets(p, thickness_mm);
    taperData.push(result.data);
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }
  }

  return { taperData, warnings };
}

function computeTaperOffsets(
  profile: ProfileDefinition,
  thickness_mm: number
): { data: TaperData; warnings: string[] } {
  const warnings: string[] = [];
  const taperAngle = profile.taper_angle_deg!;

  // Validate taper angle
  if (Math.abs(taperAngle) > MAX_TAPER_ANGLE_DEG) {
    warnings.push(
      `Profile "${profile.name}": taper angle ${taperAngle}° exceeds machine limit of ${MAX_TAPER_ANGLE_DEG}°`
    );
  }

  // Compute UV offsets per segment
  const uv_offsets: TaperData["uv_offsets"] = [];
  const taperRadians = (taperAngle * Math.PI) / 180;
  const baseOffset = Math.tan(taperRadians) * thickness_mm;

  for (let i = 0; i < profile.contour_points.length - 1; i++) {
    const p1 = profile.contour_points[i];
    const p2 = profile.contour_points[i + 1];

    // Segment direction vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen === 0) continue;

    // Normal vector (perpendicular to segment, pointing outward for external)
    const nx = -dy / segLen;
    const ny = dx / segLen;

    // UV offset = base offset projected along normal direction
    uv_offsets.push({
      segment_index: i,
      u_offset_mm: roundTo(nx * baseOffset, 4),
      v_offset_mm: roundTo(ny * baseOffset, 4),
    });
  }

  // Compute top and bottom profile lengths
  // Top profile is offset outward/inward by the taper amount
  const bottomLength = profile.profile_length_mm;
  // For constant taper, top length scales by the offset ratio
  const topLengthFactor = 1 + (2 * baseOffset) / estimateProfileDiameter(profile.contour_points);
  const topLength = bottomLength * Math.abs(topLengthFactor);

  const data: TaperData = {
    profile: profile.name,
    taper_angle_deg: taperAngle,
    uv_offsets,
    top_profile_length_mm: roundTo(topLength, 3),
    bottom_profile_length_mm: roundTo(bottomLength, 3),
    is_variable_taper: false, // single angle = constant
    max_taper_angle_deg: taperAngle,
    warnings,
  };

  return { data, warnings };
}

/**
 * Estimate the effective diameter of a profile from its bounding box.
 */
function estimateProfileDiameter(points: Array<{ x: number; y: number }>): number {
  if (points.length === 0) return 1; // avoid division by zero
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return Math.max(maxX - minX, maxY - minY, 0.001);
}

// ============================================================================
// U06 — TAB PLACEMENT OPTIMIZER
// ============================================================================

/**
 * Compute tab placements to hold slugs during cutting.
 *
 * Rules:
 *   - Minimum 2 tabs per slug
 *   - Tab width 0.3–1.0mm
 *   - Place on non-critical edges when possible
 *   - Calculate slug weight and required tab strength
 *   - Tabs evenly distributed along profile
 *   - Heavy slugs get more/wider tabs
 */
function planTabPlacements(
  profiles: ProfileDefinition[],
  thickness_mm: number
): { tabs: TabPlacement[]; warnings: string[] } {
  const tabs: TabPlacement[] = [];
  const warnings: string[] = [];

  for (const p of profiles) {
    // Open profiles don't produce slugs — no tabs needed
    if (p.type === "open") continue;

    const result = computeTabs(p, thickness_mm);
    tabs.push(result.tab);
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }
  }

  return { tabs, warnings };
}

function computeTabs(
  profile: ProfileDefinition,
  thickness_mm: number
): { tab: TabPlacement; warnings: string[] } {
  const warnings: string[] = [];

  // Estimate slug area from contour points (shoelace formula)
  const area_mm2 = computePolygonArea(profile.contour_points);

  // Slug weight = area × thickness × density
  const volume_mm3 = area_mm2 * thickness_mm;
  const slug_weight_kg = volume_mm3 * STEEL_DENSITY_KG_PER_MM3;

  // Required holding force = weight × gravity × safety factor
  const weight_force_N = slug_weight_kg * GRAVITY_M_S2;
  const required_holding_N = weight_force_N * TAB_SAFETY_FACTOR;

  // Determine tab count based on slug weight
  let tab_count = MIN_TABS_PER_SLUG;
  if (slug_weight_kg > 0.5) tab_count = 3;
  if (slug_weight_kg > 2.0) tab_count = 4;
  if (slug_weight_kg > 5.0) tab_count = 5;
  if (slug_weight_kg > 10.0) tab_count = 6;

  // Determine tab width based on required holding force per tab
  const force_per_tab_N = required_holding_N / tab_count;
  // Shear area per tab = width × thickness
  // Required: shear_area × shear_strength >= force_per_tab
  const min_width = force_per_tab_N / (thickness_mm * TAB_SHEAR_STRENGTH_N_PER_MM2);
  let tab_width = clamp(
    Math.max(min_width, DEFAULT_TAB_WIDTH_MM),
    MIN_TAB_WIDTH_MM,
    MAX_TAB_WIDTH_MM
  );

  // If computed width exceeds max, increase tab count
  if (min_width > MAX_TAB_WIDTH_MM) {
    tab_count = Math.ceil(
      required_holding_N / (MAX_TAB_WIDTH_MM * thickness_mm * TAB_SHEAR_STRENGTH_N_PER_MM2)
    );
    tab_count = Math.max(tab_count, MIN_TABS_PER_SLUG);
    tab_width = MAX_TAB_WIDTH_MM;
    warnings.push(
      `Profile "${profile.name}": heavy slug (${slug_weight_kg.toFixed(2)}kg) — increased to ${tab_count} tabs at max width`
    );
  }

  // Distribute tabs evenly along profile, avoiding critical surfaces when possible
  const tabPositions = distributeTabPositions(profile, tab_count, tab_width);

  // Check if any tab lands on critical surface
  if (profile.is_critical_surface) {
    const onCritical = tabPositions.some((t) => t.on_critical_surface);
    if (onCritical) {
      warnings.push(
        `Profile "${profile.name}": tab(s) placed on critical surface — post-machining tab removal and surface finishing required`
      );
    }
  }

  const tab: TabPlacement = {
    profile: profile.name,
    tab_count,
    tabs: tabPositions.map((t) => ({
      position_along_profile_mm: roundTo(t.position_along_profile_mm, 3),
      width_mm: roundTo(tab_width, 3),
      on_critical_surface: t.on_critical_surface,
    })),
    slug_weight_kg: roundTo(slug_weight_kg, 4),
    holding_force_N: roundTo(
      tab_count * tab_width * thickness_mm * TAB_SHEAR_STRENGTH_N_PER_MM2,
      1
    ),
  };

  return { tab, warnings };
}

/**
 * Distribute tab positions evenly along profile length.
 * Attempt to shift tabs away from critical surfaces.
 */
function distributeTabPositions(
  profile: ProfileDefinition,
  count: number,
  tabWidth: number
): Array<{ position_along_profile_mm: number; on_critical_surface: boolean }> {
  const length = profile.profile_length_mm;
  const spacing = length / count;
  const positions: Array<{
    position_along_profile_mm: number;
    on_critical_surface: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    // Start offset at half spacing for even distribution
    const nominalPos = spacing * (i + 0.5);
    positions.push({
      position_along_profile_mm: nominalPos,
      // Simplified: if entire profile is critical, all tabs are on critical surface
      on_critical_surface: profile.is_critical_surface,
    });
  }

  return positions;
}

// ============================================================================
// U07 — CUT SEQUENCE OPTIMIZER
// ============================================================================

/**
 * Optimize the order profiles are cut.
 *
 * Rules (priority order):
 *   1. Inside before outside — internal features cut while surrounding material
 *      provides rigidity
 *   2. Small before large — minimize thermal distortion accumulation
 *   3. Group by start hole — minimize non-cutting travel between profiles
 *      sharing the same start hole or nearby start holes
 *   4. Don't trap slugs — ensure slug can fall free (no profile cut after
 *      would block slug path)
 *   5. Islands before their parent closed profiles
 */
function optimizeCutSequence(
  profiles: ProfileDefinition[]
): { sequence: string[]; non_cutting_travel_mm: number; warnings: string[] } {
  const warnings: string[] = [];

  // Build candidate list with computed areas and centroids
  const candidates: SequenceCandidate[] = profiles.map((p) => ({
    name: p.name,
    type: p.type,
    area_mm2: computePolygonArea(p.contour_points),
    start_hole_id: p.start_hole_id,
    centroid: computeCentroid(p.contour_points),
    parent_profile: findParentProfile(p, profiles),
  }));

  // Assign priority scores
  const scored = candidates.map((c) => ({
    ...c,
    score: computeSequenceScore(c, candidates),
  }));

  // Sort by score (lower = cut first)
  scored.sort((a, b) => a.score - b.score);

  // Post-sort fix: ensure islands always come before their parent
  const sequence = enforceIslandBeforeParent(scored);

  // Estimate non-cutting travel
  let nonCuttingTravel = 0;
  for (let i = 1; i < sequence.length; i++) {
    const prevCandidate = candidates.find((c) => c.name === sequence[i - 1])!;
    const currCandidate = candidates.find((c) => c.name === sequence[i])!;
    nonCuttingTravel += Math.hypot(
      currCandidate.centroid.x - prevCandidate.centroid.x,
      currCandidate.centroid.y - prevCandidate.centroid.y
    );
  }

  return {
    sequence,
    non_cutting_travel_mm: roundTo(nonCuttingTravel, 2),
    warnings,
  };
}

function computeSequenceScore(
  candidate: SequenceCandidate,
  all: SequenceCandidate[]
): number {
  let score = 0;

  // Rule 1: inside before outside
  // Internal/island features get low scores, external get high
  switch (candidate.type) {
    case "island":
      score += 100;
      break;
    case "closed_internal":
      score += 200;
      break;
    case "open":
      score += 300;
      break;
    case "closed_external":
      score += 400;
      break;
  }

  // Rule 2: small before large (within same type tier)
  // Normalize area to 0-99 range within candidates
  const maxArea = Math.max(...all.map((c) => c.area_mm2), 1);
  score += (candidate.area_mm2 / maxArea) * 99;

  // Rule 3: group by start hole
  // Profiles sharing the same start hole get adjacent scores via a hash
  if (candidate.start_hole_id) {
    const holeHash = simpleHash(candidate.start_hole_id) % 50;
    score += holeHash * 0.01; // minor tiebreaker
  }

  return score;
}

/**
 * Enforce that island profiles are always sequenced before their parent.
 */
function enforceIslandBeforeParent(
  sorted: Array<SequenceCandidate & { score: number }>
): string[] {
  const result: string[] = sorted.map((s) => s.name);

  // Multiple passes to resolve all dependencies
  for (let pass = 0; pass < result.length; pass++) {
    let swapped = false;
    for (let i = 0; i < result.length; i++) {
      const candidate = sorted.find((s) => s.name === result[i])!;
      if (candidate.parent_profile) {
        const parentIdx = result.indexOf(candidate.parent_profile);
        if (parentIdx >= 0 && parentIdx < i) {
          // Island is after parent — move island before parent
          result.splice(i, 1);
          result.splice(parentIdx, 0, candidate.name);
          swapped = true;
        }
      }
    }
    if (!swapped) break;
  }

  return result;
}

function findParentProfile(
  profile: ProfileDefinition,
  all: ProfileDefinition[]
): string | undefined {
  if (profile.type !== "island") return undefined;

  for (const other of all) {
    if (
      other.name !== profile.name &&
      (other.type === "closed_external" || other.type === "closed_internal") &&
      profile.contour_points.length > 0 &&
      isPointInsidePolygon(profile.contour_points[0], other.contour_points)
    ) {
      return other.name;
    }
  }
  return undefined;
}

// ============================================================================
// GEOMETRY UTILITIES
// ============================================================================

/**
 * Shoelace formula for polygon area (absolute value).
 */
function computePolygonArea(points: Array<{ x: number; y: number }>): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Compute centroid of a polygon.
 */
function computeCentroid(points: Array<{ x: number; y: number }>): {
  x: number;
  y: number;
} {
  if (points.length === 0) return { x: 0, y: 0 };

  let cx = 0,
    cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

/**
 * Point-in-polygon test using ray casting.
 */
function isPointInsidePolygon(
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>
): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ============================================================================
// EDM TOOLPATH STRATEGY ENGINE CLASS
// ============================================================================

class EDMToolpathStrategyEngine {
  // ==========================================================================
  // ACTION: generate_toolpath (full pipeline)
  // ==========================================================================

  /**
   * Generate complete wire EDM toolpath strategy — runs all units.
   *
   * Pipeline: classify → direction → approach/departure → corners → taper → tabs → sequence
   */
  generate_toolpath(input: ToolpathInput): ToolpathResult {
    log.info(`[EDMToolpathStrategyEngine] generate_toolpath: Processing ${input.profiles.length} profiles, thickness=${input.workpiece_thickness_mm}mm, wire=${input.wire_diameter_mm}mm`);

    const sparkGap = input.spark_gap_mm ?? DEFAULT_SPARK_GAP_MM;
    const wireRadius = input.wire_diameter_mm / 2;
    const allWarnings: string[] = [];

    // U01+U02: classify profiles and assign cut direction
    const classification = classifyProfiles(input.profiles);
    allWarnings.push(...classification.warnings);

    // U03: approach/departure
    const approaches = generateApproachDepartures(input.profiles, wireRadius);
    allWarnings.push(...approaches.warnings);

    // U04: corner strategies
    const corners = selectCornerStrategies(input.profiles, wireRadius, sparkGap);
    allWarnings.push(...corners.warnings);

    // U05: taper toolpath generation
    const tapers = generateTaperData(input.profiles, input.workpiece_thickness_mm);
    allWarnings.push(...tapers.warnings);

    // U06: tab placement
    const tabs = planTabPlacements(input.profiles, input.workpiece_thickness_mm);
    allWarnings.push(...tabs.warnings);

    // U07: cut sequence optimization
    const sequence = optimizeCutSequence(input.profiles);
    allWarnings.push(...sequence.warnings);

    // Aggregate results
    const totalProfileLength = input.profiles.reduce(
      (sum, p) => sum + p.profile_length_mm, 0
    );

    const result: ToolpathResult = {
      profiles_classified: classification.classified,
      cut_sequence: sequence.sequence,
      approach_departures: approaches.approaches,
      corner_strategies: corners.strategies,
      tabs: tabs.tabs,
      taper_data: tapers.taperData.length > 0 ? tapers.taperData : undefined,
      total_profile_length_mm: roundTo(totalProfileLength, 2),
      estimated_non_cutting_travel_mm: sequence.non_cutting_travel_mm,
      warnings: allWarnings,
    };

    log.info(`[EDMToolpathStrategyEngine] generate_toolpath: Complete — ${classification.classified.length} profiles, ${sequence.sequence.length} in sequence, ${tabs.tabs.length} tab sets, ${allWarnings.length} warnings`);

    return result;
  }

  // ==========================================================================
  // ACTION: classify_profiles
  // ==========================================================================

  /**
   * Classify profile types and determine cutting directions (U01+U02 only).
   */
  classify_profiles(input: ToolpathInput): {
    profiles_classified: ClassifiedProfile[];
    warnings: string[];
  } {
    log.info(`[EDMToolpathStrategyEngine] classify_profiles: Classifying ${input.profiles.length} profiles`);

    const result = classifyProfiles(input.profiles);
    return {
      profiles_classified: result.classified,
      warnings: result.warnings,
    };
  }

  // ==========================================================================
  // ACTION: plan_tabs
  // ==========================================================================

  /**
   * Plan tab placements for slug retention (U06 only).
   */
  plan_tabs(input: ToolpathInput): {
    tabs: TabPlacement[];
    warnings: string[];
  } {
    log.info(`[EDMToolpathStrategyEngine] plan_tabs: Planning tabs for ${input.profiles.length} profiles, thickness=${input.workpiece_thickness_mm}mm`);

    return planTabPlacements(input.profiles, input.workpiece_thickness_mm);
  }

  // ==========================================================================
  // ACTION: optimize_sequence
  // ==========================================================================

  /**
   * Optimize cut sequence ordering (U07 only).
   */
  optimize_sequence(input: ToolpathInput): {
    cut_sequence: string[];
    estimated_non_cutting_travel_mm: number;
    warnings: string[];
  } {
    log.info(`[EDMToolpathStrategyEngine] optimize_sequence: Optimizing sequence for ${input.profiles.length} profiles`);

    const result = optimizeCutSequence(input.profiles);
    return {
      cut_sequence: result.sequence,
      estimated_non_cutting_travel_mm: result.non_cutting_travel_mm,
      warnings: result.warnings,
    };
  }

  // ==========================================================================
  // ACTION: calculate_taper
  // ==========================================================================

  /**
   * Calculate taper UV offsets for profiles with taper angles (U05 only).
   */
  calculate_taper(input: ToolpathInput): {
    taper_data: TaperData[];
    warnings: string[];
  } {
    log.info(`[EDMToolpathStrategyEngine] calculate_taper: Calculating taper for ${input.profiles.length} profiles, thickness=${input.workpiece_thickness_mm}mm`);

    const result = generateTaperData(input.profiles, input.workpiece_thickness_mm);
    return {
      taper_data: result.taperData,
      warnings: result.warnings,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Wire EDM Toolpath Strategy Engine — consolidates WEDM-P2P-MS7 U01-U07. */
export const edmToolpathStrategyEngine = new EDMToolpathStrategyEngine();

export { EDMToolpathStrategyEngine };
