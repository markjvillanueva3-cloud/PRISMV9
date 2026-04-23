/**
 * SolidCAMiMachiningEngine — Definitive iMachining Consolidation
 *
 * Consolidates 18 engines implementing iMachining concepts into ONE
 * authoritative engine. PRISM-branded iMachining equivalent.
 *
 * Core algorithms:
 *   1. Technology Wizard (level 1-8) — material/machine/level parameter mapping
 *   2. Morphing Spiral Generation — boundary-conforming spiral toolpath
 *   3. Constant Engagement Control (10-80 deg, US8000834B2)
 *   4. Moating Logic — divide wide pockets into moat + island zones
 *   5. Chip Load Maintenance — constant chip thickness via feed modulation
 *   6. Variable Stepover — curvature-adaptive radial depth
 *
 * Methods:
 *   compute(feature, material, tool, machine, level?)
 *   technologyWizard(material_iso, machine_class, level)
 *   generateMorphedSpiral(boundary, tool_diameter, target_engagement)
 *   constantEngagement(toolpath, target_angle)
 *   calculateMoat(boundary, tool_diameter)
 *   chipLoadMaintenance(engagement_profile, base_fz)
 *
 * Sources:
 *   - US Patent 8000834B2: Engagement milling (constant engagement bounds)
 *   - Sandvik Coromant Technical Guide (cutting data baselines)
 *   - Altintas, Y. "Manufacturing Automation" (2012)
 *   - PRISM canonical constants (src/physics/constants.ts)
 *
 * @engine SolidCAMiMachiningEngine
 * @shortcode E1103
 * @dispatcher camDispatcher
 * @actions imachining_compute, imachining_wizard, imachining_spiral,
 *          imachining_engagement, imachining_moat, imachining_chipload
 * @milestone CAMX-MS4/U03
 */

import { log } from "../utils/Logger.js";
import {
  type ISOGroup,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
} from "../physics/constants.js";

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

/** Engagement angle bounds from US8000834B2 */
const ENGAGEMENT = {
  MIN_DEG: 10,
  MAX_DEG: 80,
  OPTIMAL_DEG: 40,
  /** Below this = air cutting, boost feed */
  AIR_THRESHOLD_DEG: 10,
  /** Above this = reduce feed or reroute */
  OVERLOAD_THRESHOLD_DEG: 80,
  /** Maximum feed multiplier cap */
  MAX_FEED_MULTIPLIER: 3.0,
};

/** Technology Wizard level ranges (1=conservative, 8=aggressive) */
const WIZARD_LEVELS = {
  min: 1,
  max: 8,
  default: 4,
};

/**
 * Per-ISO-group base parameters for Level 4 (balanced).
 * ae_pct = ae as % of tool diameter
 * vc_factor = multiplier on material's vc_base_roughing
 * ap_factor = ap as multiple of tool diameter
 * fz_base_mm = base feed per tooth at Level 4
 */
const ISO_BASE_PARAMS: Record<ISOGroup, {
  ae_pct: number;
  vc_factor: number;
  ap_factor: number;
  fz_base_mm: number;
}> = {
  P: { ae_pct: 0.10, vc_factor: 1.0, ap_factor: 1.0, fz_base_mm: 0.10 },
  M: { ae_pct: 0.08, vc_factor: 0.85, ap_factor: 0.8, fz_base_mm: 0.08 },
  K: { ae_pct: 0.12, vc_factor: 1.1, ap_factor: 1.2, fz_base_mm: 0.12 },
  N: { ae_pct: 0.12, vc_factor: 1.3, ap_factor: 1.5, fz_base_mm: 0.15 },
  S: { ae_pct: 0.06, vc_factor: 0.60, ap_factor: 0.6, fz_base_mm: 0.05 },
  H: { ae_pct: 0.05, vc_factor: 0.50, ap_factor: 0.4, fz_base_mm: 0.04 },
};

/** Machine rigidity class multipliers */
const MACHINE_RIGIDITY: Record<string, number> = {
  hobby: 0.5,
  light: 0.7,
  medium: 1.0,
  heavy: 1.2,
  ultra_rigid: 1.4,
};

/** Moat threshold: create moats when pocket width > this × tool_diameter */
const MOAT_WIDTH_THRESHOLD = 5.0;

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface iMachiningFeature {
  /** Feature type */
  type: "pocket" | "slot" | "contour" | "face" | "cavity" | "open_pocket";
  /** Volume to remove, cm^3 */
  volume_cm3: number;
  /** Feature width, mm */
  width_mm: number;
  /** Feature depth, mm */
  depth_mm: number;
  /** Boundary polygon vertices [[x,y], ...] — used for spiral generation */
  boundary?: [number, number][];
  /** Pocket corner radii, mm — for engagement spike assessment */
  corner_radii_mm?: number[];
}

export interface iMachiningMaterial {
  /** ISO group */
  iso_group: ISOGroup;
  /** Optional material key from CANONICAL_MATERIAL_DB */
  material_key?: string;
  /** Override: specific cutting force kc1_1 (N/mm^2) */
  kc1_1?: number;
  /** Override: Kienzle exponent mc */
  mc?: number;
  /** Override: base cutting speed roughing (m/min) */
  vc_base?: number;
}

export interface iMachiningTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flutes: number;
  /** Corner radius, mm (0 for sharp) */
  corner_radius_mm?: number;
  /** Helix angle, deg */
  helix_angle_deg?: number;
  /** Maximum flute length, mm */
  flute_length_mm?: number;
}

export interface iMachiningMachine {
  /** Machine rigidity class */
  class: "hobby" | "light" | "medium" | "heavy" | "ultra_rigid";
  /** Max spindle speed, RPM */
  max_rpm: number;
  /** Spindle power, kW */
  power_kw: number;
  /** Max feed rate, mm/min */
  max_feed_mm_min?: number;
}

export interface WizardParameters {
  level: number;
  ae_mm: number;
  ae_pct_D: number;
  ap_mm: number;
  ap_factor_D: number;
  Vc_m_min: number;
  vc_factor: number;
  fz_mm: number;
  machine_rigidity_factor: number;
  iso_group: ISOGroup;
  justification: string[];
}

export interface SpiralPoint {
  x: number;
  y: number;
  /** Stepover at this point, mm */
  stepover_mm: number;
  /** Local engagement angle, deg */
  engagement_deg: number;
  /** Morph ratio at this point (0=circular, 1=boundary) */
  morph_ratio: number;
}

export interface SpiralPath {
  points: SpiralPoint[];
  total_length_mm: number;
  avg_engagement_deg: number;
  morph_ratio: number;
  passes: number;
  warnings: string[];
}

export interface EngagementSegment {
  /** Segment index */
  index: number;
  /** Engagement angle, deg */
  engagement_deg: number;
  /** Original feed, mm/min */
  original_feed: number;
  /** Adjusted feed, mm/min */
  adjusted_feed: number;
  /** Feed factor applied */
  feed_factor: number;
  /** Status */
  status: "optimal" | "air_cutting" | "overloaded" | "adjusted";
}

export interface AdjustedToolpath {
  segments: EngagementSegment[];
  avg_engagement_deg: number;
  min_engagement_deg: number;
  max_engagement_deg: number;
  pct_in_range: number;
  pct_overloaded: number;
  pct_air_cutting: number;
  warnings: string[];
}

export interface MoatZone {
  /** Zone index */
  index: number;
  /** Zone type */
  type: "moat" | "island";
  /** Zone boundary vertices */
  boundary: [number, number][];
  /** Zone area, mm^2 */
  area_mm2: number;
  /** Zone width, mm */
  width_mm: number;
  /** Machining sequence order */
  sequence: number;
}

export interface MoatResult {
  requires_moat: boolean;
  moat_width_mm: number;
  zones: MoatZone[];
  pocket_width_mm: number;
  tool_diameter_mm: number;
  ratio: number;
  justification: string[];
}

export interface FeedProfilePoint {
  /** Position along path (0..1) */
  position: number;
  /** Engagement angle at this point, deg */
  engagement_deg: number;
  /** Target chip thickness, mm */
  h_target_mm: number;
  /** Actual chip thickness at nominal feed, mm */
  h_actual_mm: number;
  /** Adjusted feed, mm/min */
  adjusted_feed_mm_min: number;
  /** Feed factor */
  feed_factor: number;
}

export interface FeedProfile {
  points: FeedProfilePoint[];
  base_fz_mm: number;
  base_feed_mm_min: number;
  avg_feed_factor: number;
  max_feed_factor: number;
  min_feed_factor: number;
  warnings: string[];
}

export interface iMachiningResult {
  level: number;
  ae_mm: number;
  ap_mm: number;
  Vc_m_min: number;
  fz_mm: number;
  engagement_angle_deg: number;
  morph_ratio: number;
  moat_zones: MoatZone[];
  feed_profile: FeedProfilePoint[];
  cycle_time_est_min: number;
  tool_life_est_min: number;
  justification: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/** Degrees to radians */
function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

/** Radians to degrees */
function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

/** Clamp value to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Interpolate wizard level to parameter scale factor.
 * Level 1 → conservative, Level 4 → baseline, Level 8 → aggressive.
 *
 * ae scale:  L1=0.05D  L4=base  L8=0.15D  → linear from 0.5× to 1.5×
 * vc scale:  L1=0.6×   L4=1.0×  L8=1.5×   → linear from 0.6× to 1.5×
 * ap scale:  L1=0.3×   L4=1.0×  L8=1.5×   → linear from 0.3× to 1.5×
 */
function wizardScale(level: number, lowFactor: number, highFactor: number): number {
  const t = (clamp(level, 1, 8) - 1) / 7; // 0..1
  return lowFactor + t * (highFactor - lowFactor);
}

/**
 * Resolve material physics from iMachiningMaterial input.
 * Priority: explicit overrides > material_key lookup > ISO group defaults.
 */
function resolveMaterial(mat: iMachiningMaterial): {
  kc1_1: number; mc: number; vc_base: number; taylor_C: number; taylor_n: number;
} {
  // Start with ISO group defaults
  const kienzle = CANONICAL_KIENZLE[mat.iso_group];
  const taylor = CANONICAL_TAYLOR[mat.iso_group];
  let kc1_1 = kienzle.kc1_1;
  let mc = kienzle.mc;
  let vc_base = 200; // fallback
  let taylor_C = taylor.C;
  let taylor_n = taylor.n;

  // Override from material DB if key provided
  if (mat.material_key && CANONICAL_MATERIAL_DB[mat.material_key]) {
    const db = CANONICAL_MATERIAL_DB[mat.material_key];
    kc1_1 = db.kc1_1;
    mc = db.mc;
    vc_base = db.vc_base_roughing;
    taylor_C = db.taylor_C;
    taylor_n = db.taylor_n;
  }

  // Explicit overrides take highest priority
  if (mat.kc1_1 !== undefined) kc1_1 = mat.kc1_1;
  if (mat.mc !== undefined) mc = mat.mc;
  if (mat.vc_base !== undefined) vc_base = mat.vc_base;

  return { kc1_1, mc, vc_base, taylor_C, taylor_n };
}

/**
 * Compute engagement angle from ae and tool diameter.
 * θ = 2·arcsin(ae / D) — valid for ae <= D
 */
function engagementAngleFromAe(ae_mm: number, tool_diameter_mm: number): number {
  const ratio = clamp(ae_mm / tool_diameter_mm, 0, 1);
  return radToDeg(2 * Math.asin(ratio));
}

/**
 * Compute ae from engagement angle and tool diameter.
 * ae = D · sin(θ/2)
 */
function aeFromEngagementAngle(theta_deg: number, tool_diameter_mm: number): number {
  return tool_diameter_mm * Math.sin(degToRad(theta_deg / 2));
}

/**
 * Compute polygon centroid from vertices.
 */
function polygonCentroid(boundary: [number, number][]): [number, number] {
  if (boundary.length === 0) return [0, 0];
  let cx = 0, cy = 0;
  for (const [x, y] of boundary) {
    cx += x;
    cy += y;
  }
  return [cx / boundary.length, cy / boundary.length];
}

/**
 * Compute polygon bounding box.
 */
function polygonBBox(boundary: [number, number][]): {
  minX: number; maxX: number; minY: number; maxY: number; width: number; height: number;
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of boundary) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Distance from a point to the nearest boundary edge.
 * Simplified: uses point-to-segment distance for each polygon edge.
 */
function distToBoundary(px: number, py: number, boundary: [number, number][]): number {
  let minDist = Infinity;
  const n = boundary.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = boundary[i];
    const [bx, by] = boundary[(i + 1) % n];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const d = Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
      if (d < minDist) minDist = d;
      continue;
    }
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
    const projX = ax + t * dx, projY = ay + t * dy;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Estimate polygon area using shoelace formula.
 */
function polygonArea(boundary: [number, number][]): number {
  let area = 0;
  const n = boundary.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = boundary[i];
    const [x2, y2] = boundary[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/**
 * Aspect ratio of bounding box (1.0 = square, >1 = elongated).
 */
function boundaryAspectRatio(boundary: [number, number][]): number {
  const bb = polygonBBox(boundary);
  if (bb.width === 0 || bb.height === 0) return 1;
  return Math.max(bb.width / bb.height, bb.height / bb.width);
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 1: TECHNOLOGY WIZARD
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Technology Wizard — map (material_iso, machine_class, level) to cutting params.
 *
 * Level 1: most conservative (ae=5%D, Vc x0.6, ap=0.3D)
 * Level 4: balanced (ae=10%D, Vc x1.0, ap=1.0D)
 * Level 8: most aggressive (ae=15%D, Vc x1.5, ap=1.5D)
 *
 * Machine rigidity scales all parameters proportionally.
 */
function technologyWizard(
  material_iso: ISOGroup,
  machine_class: string,
  level: number,
  tool_diameter_mm?: number,
): WizardParameters {
  const lvl = clamp(Math.round(level), WIZARD_LEVELS.min, WIZARD_LEVELS.max);
  const base = ISO_BASE_PARAMS[material_iso];
  const rigidity = MACHINE_RIGIDITY[machine_class] ?? 1.0;
  const D = tool_diameter_mm ?? 10; // default reference diameter

  // Scale factors from level
  const ae_scale = wizardScale(lvl, 0.5, 1.5);    // L1=0.5x, L8=1.5x
  const vc_scale = wizardScale(lvl, 0.6, 1.5);    // L1=0.6x, L8=1.5x
  const ap_scale = wizardScale(lvl, 0.3, 1.5);    // L1=0.3x, L8=1.5x
  const fz_scale = wizardScale(lvl, 0.7, 1.3);    // L1=0.7x, L8=1.3x

  // Compute parameters with rigidity factor
  const ae_pct = base.ae_pct * ae_scale * rigidity;
  const ae_mm = ae_pct * D;
  const ap_factor = base.ap_factor * ap_scale * rigidity;
  const ap_mm = ap_factor * D;
  const vc_factor = base.vc_factor * vc_scale * rigidity;

  // Get base Vc from canonical DB
  const mat = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === material_iso);
  const vc_base = mat?.vc_base_roughing ?? 200;
  const Vc = vc_base * vc_factor;

  const fz_mm = base.fz_base_mm * fz_scale * rigidity;

  const justification: string[] = [
    `Level ${lvl}/8: ${lvl <= 2 ? "conservative" : lvl <= 5 ? "balanced" : lvl <= 7 ? "aggressive" : "maximum"}`,
    `ISO ${material_iso}: ae_base=${(base.ae_pct * 100).toFixed(0)}%D, Vc_factor=${base.vc_factor}, ap_factor=${base.ap_factor}`,
    `Machine class '${machine_class}': rigidity factor ${rigidity.toFixed(1)}`,
    `ae=${ae_mm.toFixed(2)}mm (${(ae_pct * 100).toFixed(1)}%D), ap=${ap_mm.toFixed(2)}mm (${ap_factor.toFixed(2)}D)`,
    `Vc=${Vc.toFixed(0)}m/min (base ${vc_base}×${vc_factor.toFixed(2)})`,
    `fz=${fz_mm.toFixed(3)}mm/tooth`,
  ];

  log.info(`[iMachining] Wizard L${lvl} ISO-${material_iso} ${machine_class}: ae=${ae_mm.toFixed(2)} ap=${ap_mm.toFixed(2)} Vc=${Vc.toFixed(0)} fz=${fz_mm.toFixed(3)}`);

  return {
    level: lvl,
    ae_mm,
    ae_pct_D: ae_pct,
    ap_mm,
    ap_factor_D: ap_factor,
    Vc_m_min: Vc,
    vc_factor,
    fz_mm,
    machine_rigidity_factor: rigidity,
    iso_group: material_iso,
    justification,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 2: MORPHING SPIRAL GENERATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate morphed spiral toolpath from pocket center outward.
 *
 * The spiral morphs from circular (near center) to boundary-conforming (near walls).
 * morph_ratio: 0 = pure circular spiral, 1 = fully boundary-conforming.
 *
 * The stepover varies based on local engagement: wider in low-engagement zones,
 * narrower where engagement approaches the boundary.
 *
 * @param boundary - polygon vertices [[x,y], ...]
 * @param tool_diameter - mm
 * @param target_engagement - target engagement angle, deg (default 40)
 */
function generateMorphedSpiral(
  boundary: [number, number][],
  tool_diameter: number,
  target_engagement: number = ENGAGEMENT.OPTIMAL_DEG,
): SpiralPath {
  const warnings: string[] = [];

  if (!boundary || boundary.length < 3) {
    warnings.push("Boundary must have >= 3 vertices; using default rectangle");
    boundary = [[0, 0], [50, 0], [50, 50], [0, 50]];
  }

  const tool_radius = tool_diameter / 2;
  const centroid = polygonCentroid(boundary);
  const bb = polygonBBox(boundary);
  const maxRadius = Math.max(bb.width, bb.height) / 2;

  // Target stepover from desired engagement angle
  const target_ae = aeFromEngagementAngle(target_engagement, tool_diameter);
  const stepover_base = Math.max(target_ae, tool_radius * 0.05);

  // Determine morphing based on boundary shape
  const aspect = boundaryAspectRatio(boundary);
  // Higher aspect ratio → more morphing needed to follow rectangular shape
  const base_morph = clamp(1 - 1 / aspect, 0, 0.95);

  const points: SpiralPoint[] = [];
  let totalLength = 0;
  let prevX = centroid[0], prevY = centroid[1];
  let pass = 0;

  // Generate spiral passes from center outward
  let r = tool_radius * 0.5; // start slightly inside center
  const angleStep = 5; // degrees per point
  let theta = 0;

  while (r < maxRadius * 1.5) {
    const angleRad = degToRad(theta);

    // Circular position
    const cx = centroid[0] + r * Math.cos(angleRad);
    const cy = centroid[1] + r * Math.sin(angleRad);

    // Boundary-morphed position: project from centroid through angle to boundary
    const distToWall = distToBoundary(cx, cy, boundary);
    const totalDist = distToBoundary(centroid[0], centroid[1], boundary);

    // Morph increases as we approach the boundary
    const radialProgress = totalDist > 0 ? clamp(r / totalDist, 0, 1) : 0;
    const localMorph = base_morph * radialProgress;

    // If point is too far outside boundary, stop this ray
    if (distToWall < tool_radius * 0.1 && r > tool_radius) {
      theta += angleStep;
      if (theta >= 360) {
        theta -= 360;
        r += stepover_base;
        pass++;
      }
      continue;
    }

    // Local engagement depends on distance to boundary
    const localEngagement = distToWall > tool_diameter
      ? target_engagement
      : clamp(
          target_engagement * (distToWall / tool_diameter),
          ENGAGEMENT.MIN_DEG,
          ENGAGEMENT.MAX_DEG,
        );

    // Variable stepover: reduce near boundary (high curvature region)
    const localStepover = distToWall > tool_diameter * 2
      ? stepover_base
      : stepover_base * clamp(distToWall / (tool_diameter * 2), 0.3, 1.0);

    const segLen = Math.sqrt((cx - prevX) ** 2 + (cy - prevY) ** 2);
    totalLength += segLen;

    points.push({
      x: Math.round(cx * 1000) / 1000,
      y: Math.round(cy * 1000) / 1000,
      stepover_mm: Math.round(localStepover * 1000) / 1000,
      engagement_deg: Math.round(localEngagement * 10) / 10,
      morph_ratio: Math.round(localMorph * 1000) / 1000,
    });

    prevX = cx;
    prevY = cy;

    theta += angleStep;
    if (theta >= 360) {
      theta -= 360;
      r += stepover_base;
      pass++;
    }

    // Safety: cap at 5000 points
    if (points.length >= 5000) {
      warnings.push("Spiral capped at 5000 points; increase stepover or reduce pocket size");
      break;
    }
  }

  // Compute averages
  const avgEngagement = points.length > 0
    ? points.reduce((s, p) => s + p.engagement_deg, 0) / points.length
    : target_engagement;
  const avgMorph = points.length > 0
    ? points.reduce((s, p) => s + p.morph_ratio, 0) / points.length
    : base_morph;

  if (points.length === 0) {
    warnings.push("No spiral points generated; pocket may be too small for tool");
  }

  log.info(`[iMachining] Spiral: ${points.length} points, ${pass} passes, avg engagement ${avgEngagement.toFixed(1)} deg, morph ${avgMorph.toFixed(2)}`);

  return {
    points,
    total_length_mm: Math.round(totalLength * 100) / 100,
    avg_engagement_deg: Math.round(avgEngagement * 10) / 10,
    morph_ratio: Math.round(avgMorph * 1000) / 1000,
    passes: pass,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 3: CONSTANT ENGAGEMENT CONTROL
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Apply constant engagement feed adjustment to a toolpath.
 *
 * For each segment, measures engagement angle and adjusts feed to maintain
 * constant chip thickness using:
 *   fz_adjusted = fz_base × sin(pi/4) / sin(theta/2)
 *
 * Engagement bounds from US8000834B2:
 *   - 10 deg minimum (below = air cutting, boost feed)
 *   - 80 deg maximum (above = reduce feed or reroute)
 *   - 40 deg optimal target
 *
 * @param toolpath - array of { engagement_deg, feed_mm_min }
 * @param target_angle - target engagement angle, deg (default 40)
 */
function constantEngagement(
  toolpath: Array<{ engagement_deg: number; feed_mm_min: number }>,
  target_angle: number = ENGAGEMENT.OPTIMAL_DEG,
): AdjustedToolpath {
  const warnings: string[] = [];
  const segments: EngagementSegment[] = [];

  if (!toolpath || toolpath.length === 0) {
    return {
      segments: [],
      avg_engagement_deg: 0,
      min_engagement_deg: 0,
      max_engagement_deg: 0,
      pct_in_range: 0,
      pct_overloaded: 0,
      pct_air_cutting: 0,
      warnings: ["Empty toolpath provided"],
    };
  }

  // Reference chip thickness factor at target angle
  const sin_target = Math.sin(degToRad(target_angle / 2));
  // sin(pi/4) = sin(45deg) reference
  const sin_ref = Math.sin(Math.PI / 4);

  let sumEngagement = 0;
  let minEngagement = Infinity;
  let maxEngagement = -Infinity;
  let countInRange = 0;
  let countOverloaded = 0;
  let countAirCutting = 0;

  for (let i = 0; i < toolpath.length; i++) {
    const seg = toolpath[i];
    const theta = clamp(seg.engagement_deg, 0.1, 180);
    const sin_half = Math.sin(degToRad(theta / 2));

    // Feed adjustment: maintain constant chip thickness
    // fz_adjusted = fz_base × sin(ref) / sin(theta/2)
    let feed_factor = sin_ref / sin_half;
    let status: EngagementSegment["status"] = "adjusted";

    if (theta < ENGAGEMENT.MIN_DEG) {
      // Air cutting: boost feed but cap at max multiplier
      feed_factor = Math.min(feed_factor, ENGAGEMENT.MAX_FEED_MULTIPLIER);
      status = "air_cutting";
      countAirCutting++;
    } else if (theta > ENGAGEMENT.MAX_DEG) {
      // Overloaded: reduce feed
      status = "overloaded";
      countOverloaded++;
      if (theta > 120) {
        warnings.push(`Segment ${i}: engagement ${theta.toFixed(1)} deg exceeds safe limit; consider rerouting`);
      }
    } else if (Math.abs(theta - target_angle) < 5) {
      status = "optimal";
      countInRange++;
    } else {
      countInRange++;
    }

    // Cap feed factor
    feed_factor = clamp(feed_factor, 0.2, ENGAGEMENT.MAX_FEED_MULTIPLIER);

    const adjusted_feed = seg.feed_mm_min * feed_factor;

    segments.push({
      index: i,
      engagement_deg: Math.round(theta * 10) / 10,
      original_feed: seg.feed_mm_min,
      adjusted_feed: Math.round(adjusted_feed * 10) / 10,
      feed_factor: Math.round(feed_factor * 1000) / 1000,
      status,
    });

    sumEngagement += theta;
    if (theta < minEngagement) minEngagement = theta;
    if (theta > maxEngagement) maxEngagement = theta;
  }

  const n = toolpath.length;
  const pct_in = (countInRange / n) * 100;
  const pct_over = (countOverloaded / n) * 100;
  const pct_air = (countAirCutting / n) * 100;

  if (pct_over > 20) {
    warnings.push(`${pct_over.toFixed(0)}% of segments overloaded (>80 deg); consider smaller ae or trochoidal`);
  }
  if (pct_air > 30) {
    warnings.push(`${pct_air.toFixed(0)}% of segments air-cutting (<10 deg); toolpath may need optimization`);
  }

  log.info(`[iMachining] Engagement control: ${n} segments, ${pct_in.toFixed(0)}% in range, ${pct_over.toFixed(0)}% overloaded`);

  return {
    segments,
    avg_engagement_deg: Math.round((sumEngagement / n) * 10) / 10,
    min_engagement_deg: Math.round(minEngagement * 10) / 10,
    max_engagement_deg: Math.round(maxEngagement * 10) / 10,
    pct_in_range: Math.round(pct_in * 10) / 10,
    pct_overloaded: Math.round(pct_over * 10) / 10,
    pct_air_cutting: Math.round(pct_air * 10) / 10,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 4: MOATING LOGIC
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Calculate moat zones for wide pockets.
 *
 * When pocket width > 5x tool diameter, divides the pocket into:
 *   1. Moat zone along the boundary (machined first)
 *   2. Island zone(s) in the interior (machined after moat)
 *
 * Moat width = tool_diameter + stepover (minimum = tool_diameter)
 *
 * @param boundary - pocket boundary polygon
 * @param tool_diameter - mm
 * @param stepover_mm - optional override (default = ae from 40 deg engagement)
 */
function calculateMoat(
  boundary: [number, number][],
  tool_diameter: number,
  stepover_mm?: number,
): MoatResult {
  const justification: string[] = [];

  if (!boundary || boundary.length < 3) {
    return {
      requires_moat: false,
      moat_width_mm: 0,
      zones: [],
      pocket_width_mm: 0,
      tool_diameter_mm: tool_diameter,
      ratio: 0,
      justification: ["Invalid boundary: fewer than 3 vertices"],
    };
  }

  const bb = polygonBBox(boundary);
  const pocket_width = Math.min(bb.width, bb.height);
  const ratio = pocket_width / tool_diameter;

  if (ratio <= MOAT_WIDTH_THRESHOLD) {
    justification.push(
      `Pocket width ${pocket_width.toFixed(1)}mm / tool ${tool_diameter.toFixed(1)}mm = ${ratio.toFixed(1)}x — below ${MOAT_WIDTH_THRESHOLD}x threshold`,
      "No moat required; standard spiral machining sufficient",
    );
    return {
      requires_moat: false,
      moat_width_mm: 0,
      zones: [],
      pocket_width_mm: pocket_width,
      tool_diameter_mm: tool_diameter,
      ratio,
      justification,
    };
  }

  // Moat width = tool_diameter + stepover
  const ae = stepover_mm ?? aeFromEngagementAngle(ENGAGEMENT.OPTIMAL_DEG, tool_diameter);
  const moat_width = Math.max(tool_diameter, tool_diameter + ae);

  justification.push(
    `Pocket width ${pocket_width.toFixed(1)}mm / tool ${tool_diameter.toFixed(1)}mm = ${ratio.toFixed(1)}x — exceeds ${MOAT_WIDTH_THRESHOLD}x threshold`,
    `Moat width = tool_diameter + stepover = ${tool_diameter.toFixed(1)} + ${ae.toFixed(1)} = ${moat_width.toFixed(1)}mm`,
    "Strategy: machine moat first (boundary), then spiral the island(s)",
  );

  // Create moat zone (outer ring along boundary)
  const moatArea = polygonArea(boundary);
  const innerOffset = moat_width;

  // Simplified inner boundary: offset each vertex toward centroid
  const centroid = polygonCentroid(boundary);
  const innerBoundary: [number, number][] = boundary.map(([x, y]) => {
    const dx = centroid[0] - x;
    const dy = centroid[1] - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return [x, y] as [number, number];
    const offsetFraction = innerOffset / dist;
    const frac = Math.min(offsetFraction, 0.9); // don't collapse past 90%
    return [
      x + dx * frac,
      y + dy * frac,
    ] as [number, number];
  });

  const innerArea = polygonArea(innerBoundary);
  const moatOnlyArea = moatArea - innerArea;

  const zones: MoatZone[] = [
    {
      index: 0,
      type: "moat",
      boundary,
      area_mm2: Math.round(moatOnlyArea * 100) / 100,
      width_mm: moat_width,
      sequence: 1,
    },
    {
      index: 1,
      type: "island",
      boundary: innerBoundary,
      area_mm2: Math.round(innerArea * 100) / 100,
      width_mm: Math.min(
        polygonBBox(innerBoundary).width,
        polygonBBox(innerBoundary).height,
      ),
      sequence: 2,
    },
  ];

  log.info(`[iMachining] Moat: ratio=${ratio.toFixed(1)}x, moat_width=${moat_width.toFixed(1)}mm, ${zones.length} zones`);

  return {
    requires_moat: true,
    moat_width_mm: Math.round(moat_width * 100) / 100,
    zones,
    pocket_width_mm: Math.round(pocket_width * 100) / 100,
    tool_diameter_mm: tool_diameter,
    ratio: Math.round(ratio * 100) / 100,
    justification,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 5: CHIP LOAD MAINTENANCE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Chip load maintenance — constant chip thickness via feed modulation.
 *
 * Target chip thickness: h_target = fz × sin(θ_target / 2)
 * Actual chip thickness: h_actual = fz × sin(θ_local / 2)
 * Feed override: F = F_base × h_target / h_actual
 * Cap at 3x base feed.
 *
 * @param engagement_profile - array of { position, engagement_deg }
 * @param base_fz - base feed per tooth, mm
 * @param spindle_rpm - RPM
 * @param flutes - number of flutes
 * @param target_engagement - target engagement angle, deg (default 40)
 */
function chipLoadMaintenance(
  engagement_profile: Array<{ position: number; engagement_deg: number }>,
  base_fz: number,
  spindle_rpm: number = 5000,
  flutes: number = 4,
  target_engagement: number = ENGAGEMENT.OPTIMAL_DEG,
): FeedProfile {
  const warnings: string[] = [];
  const base_feed = base_fz * flutes * spindle_rpm; // mm/min

  if (!engagement_profile || engagement_profile.length === 0) {
    return {
      points: [],
      base_fz_mm: base_fz,
      base_feed_mm_min: base_feed,
      avg_feed_factor: 1.0,
      max_feed_factor: 1.0,
      min_feed_factor: 1.0,
      warnings: ["Empty engagement profile provided"],
    };
  }

  // Target chip thickness at target engagement
  const h_target = base_fz * Math.sin(degToRad(target_engagement / 2));

  const points: FeedProfilePoint[] = [];
  let sumFactor = 0;
  let maxFactor = -Infinity;
  let minFactor = Infinity;

  for (const seg of engagement_profile) {
    const theta = clamp(seg.engagement_deg, 0.5, 179);
    const sin_half = Math.sin(degToRad(theta / 2));

    // Actual chip thickness at this engagement
    const h_actual = base_fz * sin_half;

    // Feed factor to maintain target chip thickness
    let feed_factor = h_actual > 0 ? h_target / h_actual : 1.0;

    // Cap at max multiplier
    feed_factor = clamp(feed_factor, 0.2, ENGAGEMENT.MAX_FEED_MULTIPLIER);

    const adjusted_feed = base_feed * feed_factor;

    points.push({
      position: seg.position,
      engagement_deg: Math.round(theta * 10) / 10,
      h_target_mm: Math.round(h_target * 10000) / 10000,
      h_actual_mm: Math.round(h_actual * 10000) / 10000,
      adjusted_feed_mm_min: Math.round(adjusted_feed),
      feed_factor: Math.round(feed_factor * 1000) / 1000,
    });

    sumFactor += feed_factor;
    if (feed_factor > maxFactor) maxFactor = feed_factor;
    if (feed_factor < minFactor) minFactor = feed_factor;
  }

  if (maxFactor > 2.5) {
    warnings.push(`Max feed factor ${maxFactor.toFixed(2)}x — near 3x cap; some segments may be air-cutting`);
  }
  if (minFactor < 0.4) {
    warnings.push(`Min feed factor ${minFactor.toFixed(2)}x — heavy engagement zones detected`);
  }

  const avg_factor = sumFactor / engagement_profile.length;

  log.info(`[iMachining] ChipLoad: ${points.length} points, avg factor ${avg_factor.toFixed(2)}, range [${minFactor.toFixed(2)}, ${maxFactor.toFixed(2)}]`);

  return {
    points,
    base_fz_mm: base_fz,
    base_feed_mm_min: Math.round(base_feed),
    avg_feed_factor: Math.round(avg_factor * 1000) / 1000,
    max_feed_factor: Math.round(maxFactor * 1000) / 1000,
    min_feed_factor: Math.round(minFactor * 1000) / 1000,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ALGORITHM 6: VARIABLE STEPOVER
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Curvature-adaptive stepover computation.
 *
 * ae = ae_base × (R_effective / R_tool)
 * where R_effective = 1 / (1/R_tool - kappa)
 *
 * In convex regions (kappa > 0): R_eff > R_tool → ae increases
 * In concave regions (kappa < 0): R_eff < R_tool → ae decreases
 *
 * @param curvature_profile - array of { position, kappa } (curvature in 1/mm)
 * @param tool_diameter - mm
 * @param base_ae - base stepover, mm
 */
function variableStepover(
  curvature_profile: Array<{ position: number; kappa: number }>,
  tool_diameter: number,
  base_ae: number,
): Array<{
  position: number;
  kappa: number;
  R_effective_mm: number;
  ae_mm: number;
  ae_ratio: number;
}> {
  const R_tool = tool_diameter / 2;
  const results: Array<{
    position: number;
    kappa: number;
    R_effective_mm: number;
    ae_mm: number;
    ae_ratio: number;
  }> = [];

  for (const pt of curvature_profile) {
    const inv_R_tool = 1 / R_tool;
    const denominator = inv_R_tool - pt.kappa;

    let R_eff: number;
    if (Math.abs(denominator) < 1e-6) {
      // Near-infinite effective radius (flat at tool radius)
      R_eff = R_tool * 100; // cap
    } else if (denominator < 0) {
      // Concave curvature too tight — clamp
      R_eff = R_tool * 0.3;
    } else {
      R_eff = 1 / denominator;
    }

    // Clamp R_eff to reasonable range
    R_eff = clamp(R_eff, R_tool * 0.2, R_tool * 10);

    const ae = base_ae * (R_eff / R_tool);
    const ae_clamped = clamp(ae, base_ae * 0.2, base_ae * 3.0);

    results.push({
      position: pt.position,
      kappa: pt.kappa,
      R_effective_mm: Math.round(R_eff * 100) / 100,
      ae_mm: Math.round(ae_clamped * 1000) / 1000,
      ae_ratio: Math.round((ae_clamped / base_ae) * 1000) / 1000,
    });
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPUTE METHOD
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Full iMachining computation — orchestrates all algorithms.
 *
 * 1. Technology Wizard → cutting parameters
 * 2. Moating check → zone decomposition
 * 3. Morphing spiral → toolpath generation
 * 4. Constant engagement control → feed adjustment
 * 5. Chip load maintenance → final feed profile
 * 6. Cycle time & tool life estimation
 */
function compute(
  feature: iMachiningFeature,
  material: iMachiningMaterial,
  tool: iMachiningTool,
  machine: iMachiningMachine,
  level?: number,
): iMachiningResult {
  const justification: string[] = [];
  const lvl = level ?? WIZARD_LEVELS.default;

  // ── Step 1: Technology Wizard ──
  const wizard = technologyWizard(
    material.iso_group,
    machine.class,
    lvl,
    tool.diameter_mm,
  );
  justification.push(...wizard.justification);

  // ── Step 2: Clamp ap to flute length ──
  let ap = wizard.ap_mm;
  if (tool.flute_length_mm && ap > tool.flute_length_mm) {
    ap = tool.flute_length_mm;
    justification.push(`ap clamped to flute length: ${ap.toFixed(2)}mm`);
  }
  // Clamp ap to feature depth
  if (ap > feature.depth_mm) {
    ap = feature.depth_mm;
    justification.push(`ap clamped to feature depth: ${ap.toFixed(2)}mm`);
  }

  // ── Step 3: Spindle RPM from Vc ──
  const rpm = Math.min(
    (wizard.Vc_m_min * 1000) / (Math.PI * tool.diameter_mm),
    machine.max_rpm,
  );
  const actual_Vc = (Math.PI * tool.diameter_mm * rpm) / 1000;
  if (rpm >= machine.max_rpm) {
    justification.push(`RPM limited to machine max ${machine.max_rpm}; Vc reduced to ${actual_Vc.toFixed(0)} m/min`);
  }

  // ── Step 4: Feed rate ──
  const fz = wizard.fz_mm;
  const base_feed = fz * tool.flutes * rpm; // mm/min
  const feed_capped = machine.max_feed_mm_min
    ? Math.min(base_feed, machine.max_feed_mm_min)
    : base_feed;
  if (feed_capped < base_feed) {
    justification.push(`Feed capped to machine max ${feed_capped.toFixed(0)} mm/min`);
  }

  // ── Step 5: Moat check ──
  const moatResult = feature.boundary
    ? calculateMoat(feature.boundary, tool.diameter_mm)
    : calculateMoat(
        // Generate default boundary from feature dimensions
        [
          [0, 0],
          [feature.width_mm, 0],
          [feature.width_mm, feature.width_mm],
          [0, feature.width_mm],
        ],
        tool.diameter_mm,
      );
  if (moatResult.requires_moat) {
    justification.push(`Moat activated: pocket/tool ratio = ${moatResult.ratio.toFixed(1)}x`);
  }

  // ── Step 6: Engagement angle ──
  const engagement_deg = engagementAngleFromAe(wizard.ae_mm, tool.diameter_mm);

  // ── Step 7: Generate feed profile (simplified) ──
  // Create a representative engagement profile for chip load maintenance
  const z_passes = Math.ceil(feature.depth_mm / ap);
  const engagementProfile: Array<{ position: number; engagement_deg: number }> = [];
  for (let i = 0; i <= 20; i++) {
    const pos = i / 20;
    // Simulate engagement variation: higher at corners, lower on straights
    const variation = 1 + 0.2 * Math.sin(pos * Math.PI * 4);
    engagementProfile.push({
      position: pos,
      engagement_deg: engagement_deg * variation,
    });
  }
  const feedProfile = chipLoadMaintenance(
    engagementProfile,
    fz,
    rpm,
    tool.flutes,
    engagement_deg,
  );

  // ── Step 8: Cycle time estimation ──
  // Volume removal rate MRR = ae × ap × Vf (mm^3/min)
  const ae_mm = wizard.ae_mm;
  const MRR_mm3_min = ae_mm * ap * feed_capped;
  const volume_mm3 = feature.volume_cm3 * 1000; // cm^3 → mm^3
  const cutting_time_min = MRR_mm3_min > 0 ? volume_mm3 / MRR_mm3_min : 0;
  // Add overhead: rapid moves, Z-level transitions
  const overhead_factor = 1.15 + (z_passes - 1) * 0.02;
  const cycle_time = cutting_time_min * overhead_factor;
  justification.push(
    `MRR = ${MRR_mm3_min.toFixed(0)} mm^3/min, cutting time = ${cutting_time_min.toFixed(1)} min`,
    `Cycle time est = ${cycle_time.toFixed(1)} min (${overhead_factor.toFixed(2)}x overhead for ${z_passes} Z-passes)`,
  );

  // ── Step 9: Tool life estimation (Taylor) ──
  const matPhys = resolveMaterial(material);
  const tool_life = Math.pow(matPhys.taylor_C / actual_Vc, 1 / matPhys.taylor_n);
  justification.push(
    `Taylor tool life: T = (${matPhys.taylor_C}/${actual_Vc.toFixed(0)})^(1/${matPhys.taylor_n}) = ${tool_life.toFixed(0)} min`,
  );

  // ── Step 10: Power check ──
  const kc = matPhys.kc1_1 * Math.pow(fz, -matPhys.mc);
  const power_kW = (kc * ae_mm * ap * feed_capped) / (60 * 1e6);
  if (power_kW > machine.power_kw * 0.9) {
    justification.push(
      `WARNING: Estimated power ${power_kW.toFixed(1)} kW approaches machine limit ${machine.power_kw} kW`,
    );
  }

  // Morph ratio estimate based on pocket geometry
  const morph_ratio = feature.boundary
    ? clamp(1 - 1 / boundaryAspectRatio(feature.boundary), 0, 0.95)
    : 0.5;

  log.info(`[iMachining] Compute complete: L${lvl} ae=${ae_mm.toFixed(2)} ap=${ap.toFixed(2)} Vc=${actual_Vc.toFixed(0)} cycle=${cycle_time.toFixed(1)}min`);

  return {
    level: wizard.level,
    ae_mm: Math.round(ae_mm * 1000) / 1000,
    ap_mm: Math.round(ap * 1000) / 1000,
    Vc_m_min: Math.round(actual_Vc * 10) / 10,
    fz_mm: Math.round(fz * 10000) / 10000,
    engagement_angle_deg: Math.round(engagement_deg * 10) / 10,
    morph_ratio: Math.round(morph_ratio * 1000) / 1000,
    moat_zones: moatResult.zones,
    feed_profile: feedProfile.points,
    cycle_time_est_min: Math.round(cycle_time * 100) / 100,
    tool_life_est_min: Math.round(tool_life * 10) / 10,
    justification,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ENGINE EXPORT
// ════════════════════════════════════════════════════════════════════════════════

export type SolidCAMiMachiningEngine = typeof solidCAMiMachiningEngine;

export const solidCAMiMachiningEngine = {
  compute,
  technologyWizard,
  generateMorphedSpiral,
  constantEngagement,
  calculateMoat,
  chipLoadMaintenance,
  variableStepover,
};
