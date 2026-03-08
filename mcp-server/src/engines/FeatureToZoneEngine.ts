/**
 * FeatureToZoneEngine — Geometric feature → machining zone mapper
 * ================================================================
 * Bridges part geometry/features to novel toolpath algorithm inputs.
 * Takes feature descriptions (pocket dims, wall angles, freeform patches,
 * hole patterns) and decomposes into machining zones with attributes
 * directly compatible with MTHZD and MACS zone inputs.
 *
 * Zone types: flat, steep_wall, freeform, pocket, corner, rib, undercut, boss, shallow, hole
 *
 * Physics/geometry references:
 * - Scallop height: h = R - sqrt(R² - (ae/2)²)  [Choi & Jerard, 1998]
 * - Principal curvatures: κ₁, κ₂ from surface patches [do Carmo, Differential Geometry]
 * - Draft angle analysis: θ = atan2(dz, dr) [standard CAM feature recognition]
 * - Accessibility cone: visibility from tool approach directions [Kim & Choi, 2002]
 *
 * @module engines/FeatureToZoneEngine
 * @version 1.0.0
 * @milestone CAMK-MS0/U01
 */

// ============================================================================
// TYPES
// ============================================================================

/** Supported geometric feature types as input */
export type FeatureType =
  | "pocket"
  | "slot"
  | "boss"
  | "hole"
  | "freeform_surface"
  | "planar_face"
  | "chamfer"
  | "fillet"
  | "rib"
  | "thin_wall"
  | "stepped_pocket"
  | "contour";

/** Input feature description */
export interface FeatureInput {
  id: string;
  type: FeatureType;
  /** Bounding dimensions in mm */
  dims: {
    length_mm?: number;
    width_mm?: number;
    depth_mm?: number;
    diameter_mm?: number;
    height_mm?: number;
  };
  /** Wall/draft angles in degrees (0 = vertical, 90 = horizontal) */
  wall_angles_deg?: number[];
  /** Corner radii in mm */
  corner_radii_mm?: number[];
  /** Freeform surface curvature stats */
  curvature?: {
    min_radius_mm?: number;
    max_radius_mm?: number;
    avg_radius_mm?: number;
    /** Gaussian curvature classification */
    type?: "convex" | "concave" | "saddle" | "flat";
  };
  /** Floor type */
  floor?: "flat" | "curved" | "stepped";
  /** Accessibility from standard directions */
  accessible_from?: Array<"+Z" | "-Z" | "+X" | "-X" | "+Y" | "-Y">;
  /** Tolerance requirements */
  tolerance_mm?: number;
  /** Surface finish requirement */
  target_ra_um?: number;
}

/** Zone type — superset compatible with both MTHZD and MACS */
export type ZoneType =
  | "flat"
  | "steep_wall"
  | "freeform"
  | "pocket"
  | "corner"
  | "rib"
  | "undercut"
  | "boss"
  | "shallow"
  | "hole";

/** Output machining zone — compatible with MTHZD and MACS inputs */
export interface MachiningZone {
  id: string;
  type: ZoneType;
  area_mm2: number;
  depth_mm: number;
  /** Min corner radius — constrains min tool diameter */
  min_corner_radius_mm?: number;
  /** Wall angle: 0° = vertical, 90° = horizontal floor */
  wall_angle_deg?: number;
  /** Representative curvature radius for scallop calculations */
  curvature_radius_mm?: number;
  /** Max surface angle — for MACS compatibility */
  max_angle_deg: number;
  /** Parent feature id */
  source_feature_id: string;
  /** Accessibility vectors */
  accessibility: Array<"+Z" | "-Z" | "+X" | "-X" | "+Y" | "-Y">;
  /** Suggested novel algorithms (ranked) */
  suggested_algorithms: string[];
}

/** Engine output */
export interface FeatureToZoneResult {
  zones: MachiningZone[];
  total_zones: number;
  zone_type_summary: Record<string, number>;
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Steep wall threshold in degrees (wall angle from vertical) */
const STEEP_THRESHOLD_DEG = 30;

/** Shallow threshold — nearly horizontal */
const SHALLOW_THRESHOLD_DEG = 75;

/** Minimum area for a zone to be significant (mm²) */
const MIN_ZONE_AREA_MM2 = 1.0;

/** Algorithm suitability by zone type */
const ZONE_ALGORITHM_MAP: Record<ZoneType, string[]> = {
  flat: ["CFSF", "MEGM", "AMEF"],
  steep_wall: ["HRAF", "MACS", "PTDC"],
  freeform: ["CFSF", "SFCR", "AMEF", "HRAF"],
  pocket: ["TGAR", "VCER", "DPLS", "MEGM"],
  corner: ["PTDC", "KALP", "CFSF"],
  rib: ["PTDC", "HRAF", "WHAP"],
  undercut: ["MACS", "MTHZD", "EAPR"],
  boss: ["HRAF", "CFSF", "VCMR"],
  shallow: ["CFSF", "AMEF", "SFCR"],
  hole: ["VCER", "SNWF", "HBCF"],
};

// ============================================================================
// CORE DECOMPOSITION FUNCTIONS
// ============================================================================

/**
 * Classify wall angle into zone type
 * Uses standard CAM thresholds: steep > 30° from horizontal, shallow < 75°
 */
function classifyWallAngle(angle_deg: number): ZoneType {
  if (angle_deg >= SHALLOW_THRESHOLD_DEG) return "flat";
  if (angle_deg <= STEEP_THRESHOLD_DEG) return "steep_wall";
  return "shallow";
}

/**
 * Compute approximate surface area from feature dimensions
 * Uses analytical formulas per feature type
 */
function computeFeatureArea(feature: FeatureInput): number {
  const { dims } = feature;
  const L = dims.length_mm ?? 0;
  const W = dims.width_mm ?? L;
  const D = dims.depth_mm ?? 0;
  const dia = dims.diameter_mm ?? 0;
  const H = dims.height_mm ?? D;

  switch (feature.type) {
    case "pocket":
    case "stepped_pocket": {
      // Floor area + wall area
      const floorArea = L * W;
      const wallArea = 2 * (L + W) * D;
      return floorArea + wallArea;
    }
    case "slot": {
      // Floor + 2 long walls
      return L * W + 2 * L * D;
    }
    case "boss": {
      // Top face + side walls
      if (dia > 0) return Math.PI * (dia / 2) ** 2 + Math.PI * dia * H;
      return L * W + 2 * (L + W) * H;
    }
    case "hole": {
      // Cylindrical surface
      return Math.PI * dia * D;
    }
    case "freeform_surface": {
      // Approximate from bounding box with 1.3x factor for curvature
      return (L || 50) * (W || 50) * 1.3;
    }
    case "planar_face": {
      if (dia > 0) return Math.PI * (dia / 2) ** 2;
      return (L || 50) * (W || 50);
    }
    case "chamfer": {
      const chamferWidth = D || 1;
      const perimeter = dia > 0 ? Math.PI * dia : 2 * ((L || 50) + (W || 50));
      return perimeter * chamferWidth * Math.SQRT2;
    }
    case "fillet": {
      const filletR = feature.corner_radii_mm?.[0] ?? 2;
      const perimeter = dia > 0 ? Math.PI * dia : 2 * ((L || 50) + (W || 50));
      return perimeter * filletR * (Math.PI / 2);
    }
    case "rib": {
      // Both sides + top
      return 2 * L * H + L * W;
    }
    case "thin_wall": {
      // Both sides of the wall
      return 2 * L * H;
    }
    case "contour": {
      // Approximate as perimeter × depth
      const perimeter = dia > 0 ? Math.PI * dia : 2 * ((L || 50) + (W || 50));
      return perimeter * D;
    }
    default:
      return (L || 50) * (W || 50);
  }
}

/**
 * Decompose a pocket feature into multiple machining zones:
 * floor (flat/curved), walls (steep/shallow per angle), corners
 */
function decomposePocket(feature: FeatureInput): MachiningZone[] {
  const zones: MachiningZone[] = [];
  const { dims, id } = feature;
  const L = dims.length_mm ?? 50;
  const W = dims.width_mm ?? L;
  const D = dims.depth_mm ?? 10;
  const cornerRadii = feature.corner_radii_mm ?? [5];
  const minR = Math.min(...cornerRadii);
  const accessibility = feature.accessible_from ?? ["+Z"];

  // Floor zone
  const floorArea = L * W;
  zones.push({
    id: `${id}_floor`,
    type: feature.floor === "curved" ? "freeform" : "flat",
    area_mm2: floorArea,
    depth_mm: D,
    max_angle_deg: feature.floor === "curved" ? 80 : 90,
    wall_angle_deg: 90,
    source_feature_id: id,
    accessibility,
    suggested_algorithms: feature.floor === "curved"
      ? ZONE_ALGORITHM_MAP.freeform
      : ZONE_ALGORITHM_MAP.flat,
  });

  // Wall zones — one per distinct wall angle
  const wallAngles = feature.wall_angles_deg ?? [0];
  for (let i = 0; i < wallAngles.length; i++) {
    const angle = wallAngles[i];
    const wallType = classifyWallAngle(angle);
    const wallArea = (i % 2 === 0 ? L : W) * D;
    if (wallArea < MIN_ZONE_AREA_MM2) continue;

    zones.push({
      id: `${id}_wall_${i}`,
      type: wallType,
      area_mm2: wallArea,
      depth_mm: D,
      wall_angle_deg: angle,
      max_angle_deg: angle,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ZONE_ALGORITHM_MAP[wallType],
    });
  }

  // Corner zones — critical for tool selection (min radius constraint)
  if (minR > 0 && D > 0) {
    const numCorners = cornerRadii.length >= 4 ? 4 : cornerRadii.length;
    const cornerArea = Math.PI * minR * D; // quarter-cylinder per corner × 4
    zones.push({
      id: `${id}_corners`,
      type: "corner",
      area_mm2: cornerArea,
      depth_mm: D,
      min_corner_radius_mm: minR,
      max_angle_deg: 0,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ZONE_ALGORITHM_MAP.corner,
    });
  }

  return zones;
}

/**
 * Decompose a freeform surface into curvature-based zones
 * Splits into high-curvature (small radius) and low-curvature regions
 */
function decomposeFreeform(feature: FeatureInput): MachiningZone[] {
  const zones: MachiningZone[] = [];
  const { dims, id, curvature } = feature;
  const totalArea = computeFeatureArea(feature);
  const accessibility = feature.accessible_from ?? ["+Z"];

  if (!curvature || !curvature.min_radius_mm || !curvature.max_radius_mm) {
    // Single zone if no curvature data
    zones.push({
      id: `${id}_surface`,
      type: "freeform",
      area_mm2: totalArea,
      depth_mm: dims.depth_mm ?? 0,
      max_angle_deg: 45,
      curvature_radius_mm: curvature?.avg_radius_mm ?? 50,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ZONE_ALGORITHM_MAP.freeform,
    });
    return zones;
  }

  const minR = curvature.min_radius_mm;
  const maxR = curvature.max_radius_mm;
  const ratio = maxR / Math.max(minR, 0.01);

  if (ratio > 5) {
    // Significant curvature variation — split into regions
    // High curvature region (tight radii, ~30% of area)
    zones.push({
      id: `${id}_high_curv`,
      type: "freeform",
      area_mm2: totalArea * 0.3,
      depth_mm: dims.depth_mm ?? 0,
      curvature_radius_mm: minR,
      max_angle_deg: 30,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ["CFSF", "SFCR", "PTDC"],
    });
    // Low curvature region (~70% of area)
    zones.push({
      id: `${id}_low_curv`,
      type: "shallow",
      area_mm2: totalArea * 0.7,
      depth_mm: dims.depth_mm ?? 0,
      curvature_radius_mm: maxR,
      max_angle_deg: 75,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ["CFSF", "AMEF", "HRAF"],
    });
  } else {
    // Uniform curvature — single zone
    zones.push({
      id: `${id}_surface`,
      type: "freeform",
      area_mm2: totalArea,
      depth_mm: dims.depth_mm ?? 0,
      curvature_radius_mm: curvature.avg_radius_mm ?? (minR + maxR) / 2,
      max_angle_deg: 45,
      source_feature_id: id,
      accessibility,
      suggested_algorithms: ZONE_ALGORITHM_MAP.freeform,
    });
  }

  return zones;
}

/**
 * Decompose a boss feature into top face + side walls
 */
function decomposeBoss(feature: FeatureInput): MachiningZone[] {
  const zones: MachiningZone[] = [];
  const { dims, id } = feature;
  const H = dims.height_mm ?? dims.depth_mm ?? 10;
  const dia = dims.diameter_mm ?? 0;
  const L = dims.length_mm ?? 30;
  const W = dims.width_mm ?? L;
  const accessibility = feature.accessible_from ?? ["+Z"];

  // Top face
  const topArea = dia > 0 ? Math.PI * (dia / 2) ** 2 : L * W;
  zones.push({
    id: `${id}_top`,
    type: "flat",
    area_mm2: topArea,
    depth_mm: 0,
    max_angle_deg: 90,
    wall_angle_deg: 90,
    source_feature_id: id,
    accessibility,
    suggested_algorithms: ZONE_ALGORITHM_MAP.boss,
  });

  // Side walls
  const sideArea = dia > 0 ? Math.PI * dia * H : 2 * (L + W) * H;
  const wallAngle = feature.wall_angles_deg?.[0] ?? 0;
  zones.push({
    id: `${id}_sides`,
    type: wallAngle > STEEP_THRESHOLD_DEG ? "shallow" : "steep_wall",
    area_mm2: sideArea,
    depth_mm: H,
    wall_angle_deg: wallAngle,
    max_angle_deg: wallAngle,
    source_feature_id: id,
    accessibility,
    suggested_algorithms: ZONE_ALGORITHM_MAP.boss,
  });

  return zones;
}

/**
 * Simple feature → single zone mapping for features that don't decompose
 */
function simpleZone(feature: FeatureInput, type: ZoneType): MachiningZone[] {
  const area = computeFeatureArea(feature);
  const accessibility = feature.accessible_from ?? ["+Z"];
  return [{
    id: `${feature.id}_zone`,
    type,
    area_mm2: area,
    depth_mm: feature.dims.depth_mm ?? feature.dims.height_mm ?? 0,
    min_corner_radius_mm: feature.corner_radii_mm?.[0],
    wall_angle_deg: feature.wall_angles_deg?.[0],
    curvature_radius_mm: feature.curvature?.avg_radius_mm,
    max_angle_deg: feature.wall_angles_deg?.[0] ?? (type === "flat" ? 90 : type === "steep_wall" ? 10 : 45),
    source_feature_id: feature.id,
    accessibility,
    suggested_algorithms: ZONE_ALGORITHM_MAP[type] ?? ZONE_ALGORITHM_MAP.freeform,
  }];
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Decompose a list of features into machining zones
 */
function decomposeFeatures(features: FeatureInput[]): FeatureToZoneResult {
  const allZones: MachiningZone[] = [];
  const warnings: string[] = [];

  for (const feature of features) {
    try {
      let zones: MachiningZone[];

      switch (feature.type) {
        case "pocket":
        case "stepped_pocket":
          zones = decomposePocket(feature);
          break;
        case "freeform_surface":
          zones = decomposeFreeform(feature);
          break;
        case "boss":
          zones = decomposeBoss(feature);
          break;
        case "slot":
          zones = decomposePocket({ ...feature, type: "pocket" });
          break;
        case "hole":
          zones = simpleZone(feature, "hole");
          break;
        case "planar_face":
          zones = simpleZone(feature, "flat");
          break;
        case "chamfer":
          zones = simpleZone(feature, "shallow");
          break;
        case "fillet":
          zones = simpleZone(feature, "freeform");
          break;
        case "rib":
          zones = simpleZone(feature, "rib");
          break;
        case "thin_wall":
          zones = simpleZone(feature, "steep_wall");
          break;
        case "contour":
          zones = simpleZone(feature, "steep_wall");
          break;
        default:
          warnings.push(`Unknown feature type: ${(feature as any).type}, treating as freeform`);
          zones = simpleZone(feature, "freeform");
      }

      // Filter out tiny zones
      const validZones = zones.filter(z => z.area_mm2 >= MIN_ZONE_AREA_MM2);
      if (validZones.length < zones.length) {
        warnings.push(`Feature ${feature.id}: ${zones.length - validZones.length} sub-threshold zones removed`);
      }

      allZones.push(...validZones);
    } catch (err) {
      warnings.push(`Feature ${feature.id} decomposition error: ${(err as Error).message}`);
    }
  }

  // Build zone type summary
  const summary: Record<string, number> = {};
  for (const z of allZones) {
    summary[z.type] = (summary[z.type] ?? 0) + 1;
  }

  return {
    zones: allZones,
    total_zones: allZones.length,
    zone_type_summary: summary,
    warnings,
  };
}

/**
 * Convert zones to MTHZD-compatible format
 */
function toMTHZDZones(zones: MachiningZone[]): Array<{
  id: string;
  type: "flat" | "steep_wall" | "freeform" | "pocket" | "corner" | "rib" | "undercut";
  area_mm2: number;
  depth_mm: number;
  min_corner_radius_mm?: number;
  wall_angle_deg?: number;
  curvature_radius_mm?: number;
}> {
  const mthzdTypes = new Set(["flat", "steep_wall", "freeform", "pocket", "corner", "rib", "undercut"]);
  return zones.map(z => ({
    id: z.id,
    type: (mthzdTypes.has(z.type) ? z.type : mapToMTHZDType(z.type)) as any,
    area_mm2: z.area_mm2,
    depth_mm: z.depth_mm,
    min_corner_radius_mm: z.min_corner_radius_mm,
    wall_angle_deg: z.wall_angle_deg,
    curvature_radius_mm: z.curvature_radius_mm,
  }));
}

/**
 * Convert zones to MACS-compatible format
 */
function toMACSZones(zones: MachiningZone[]): Array<{
  id: string;
  type: "steep" | "shallow" | "undercut" | "boss" | "pocket" | "freeform";
  area_mm2: number;
  max_angle_deg: number;
}> {
  return zones.map(z => ({
    id: z.id,
    type: mapToMACSType(z.type),
    area_mm2: z.area_mm2,
    max_angle_deg: z.max_angle_deg,
  }));
}

/** Map extended zone types to MTHZD types */
function mapToMTHZDType(type: ZoneType): "flat" | "steep_wall" | "freeform" | "pocket" | "corner" | "rib" | "undercut" {
  switch (type) {
    case "boss": return "flat";
    case "shallow": return "freeform";
    case "hole": return "pocket";
    default: return "freeform";
  }
}

/** Map zone types to MACS types */
function mapToMACSType(type: ZoneType): "steep" | "shallow" | "undercut" | "boss" | "pocket" | "freeform" {
  switch (type) {
    case "flat": return "shallow";
    case "steep_wall": return "steep";
    case "corner": return "pocket";
    case "rib": return "steep";
    case "hole": return "pocket";
    default: return type as "shallow" | "undercut" | "boss" | "pocket" | "freeform";
  }
}

/** List all supported feature types */
function listFeatureTypes(): FeatureType[] {
  return [
    "pocket", "slot", "boss", "hole", "freeform_surface",
    "planar_face", "chamfer", "fillet", "rib", "thin_wall",
    "stepped_pocket", "contour",
  ];
}

/** List all zone types */
function listZoneTypes(): ZoneType[] {
  return ["flat", "steep_wall", "freeform", "pocket", "corner", "rib", "undercut", "boss", "shallow", "hole"];
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export const featureToZoneEngine = {
  decompose: decomposeFeatures,
  toMTHZDZones,
  toMACSZones,
  listFeatureTypes,
  listZoneTypes,
  computeFeatureArea,
  ZONE_ALGORITHM_MAP,
};

