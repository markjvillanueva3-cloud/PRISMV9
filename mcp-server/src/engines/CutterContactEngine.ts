/**
 * CutterContactEngine — Analytical cutter-contact point computation
 * ==================================================================
 * Computes cutter-contact (CC) points on analytical surfaces for toolpath
 * generation. Supports 5 surface types × 4 cutter types with scallop height
 * prediction and 5-axis tool axis optimization.
 *
 * Surface types: plane, cylinder, cone, sphere, torus
 * Cutter types: ball, flat, bull-nose (toroidal), barrel
 *
 * Physics/geometry references:
 * - CC point computation: [Choi & Jerard, "Sculptured Surface Machining", 1998]
 * - Scallop height: h = R - sqrt(R² - (ae/2)²) for ball cutter
 * - Principal curvatures: κ₁, κ₂ → effective radius for scallop [do Carmo, 1976]
 * - Tool axis: Rodrigues' rotation formula for tilt/lead angles
 * - Gouge detection: offset surface method [Lee & Chang, 1995]
 *
 * @module engines/CutterContactEngine
 * @version 1.0.0
 * @milestone CAMK-MS0/U03
 */

// ============================================================================
// TYPES
// ============================================================================

/** Supported analytical surface types */
export type SurfaceType = "plane" | "cylinder" | "cone" | "sphere" | "torus";

/** Supported cutter types */
export type CutterType = "ball" | "flat" | "bull_nose" | "barrel";

/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Surface definition */
export interface SurfaceDefinition {
  type: SurfaceType;
  /** Surface origin point */
  origin: Vec3;
  /** Surface normal at origin (for planes) or axis (for cylinders/cones) */
  axis: Vec3;
  /** Primary radius (cylinder/sphere/torus major) in mm */
  radius_mm?: number;
  /** Secondary radius (torus minor, cone base) in mm */
  radius2_mm?: number;
  /** Half-angle for cones in degrees */
  half_angle_deg?: number;
}

/** Cutter geometry */
export interface CutterGeometry {
  type: CutterType;
  diameter_mm: number;
  /** Corner radius for bull-nose (mm) */
  corner_radius_mm?: number;
  /** Barrel radius for barrel cutters (mm) — the large sweeping radius */
  barrel_radius_mm?: number;
  /** Effective cutting length (mm) */
  flute_length_mm?: number;
}

/** Cutter-contact point result */
export interface CCPoint {
  /** Contact point on surface */
  cc: Vec3;
  /** Cutter location (center of cutter at contact) */
  cl: Vec3;
  /** Surface normal at contact point */
  normal: Vec3;
  /** Tool axis vector (unit) */
  tool_axis: Vec3;
  /** Scallop height at this point for given stepover (mm) */
  scallop_height_mm: number;
  /** Effective cutting radius at contact (mm) */
  effective_radius_mm: number;
  /** Gouge-free: true if no gouging detected */
  gouge_free: boolean;
}

/** CC computation input */
export interface CCInput {
  surface: SurfaceDefinition;
  cutter: CutterGeometry;
  /** Parameter along surface (u = 0..1) */
  u: number;
  /** Parameter across surface (v = 0..1) */
  v: number;
  /** Stepover distance for scallop computation (mm) */
  stepover_mm: number;
  /** Tool tilt angle from surface normal (degrees, 0 = normal to surface) */
  tilt_deg?: number;
  /** Tool lead angle (degrees, 0 = no lead) */
  lead_deg?: number;
}

/** Batch CC result */
export interface CCResult {
  points: CCPoint[];
  surface_type: SurfaceType;
  cutter_type: CutterType;
  avg_scallop_mm: number;
  max_scallop_mm: number;
  gouge_free: boolean;
  warnings: string[];
}

// ============================================================================
// VECTOR MATH
// ============================================================================

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scale(v: Vec3, s: number): Vec3 {
  return vec3(v.x * s, v.y * s, v.z * s);
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < 1e-12) return vec3(0, 0, 1);
  return scale(v, 1 / len);
}

/**
 * Rodrigues' rotation formula: rotate vector v around axis k by angle theta
 * v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
 */
function rodrigues(v: Vec3, k: Vec3, theta_rad: number): Vec3 {
  const kn = normalize(k);
  const cosT = Math.cos(theta_rad);
  const sinT = Math.sin(theta_rad);
  const kxv = cross(kn, v);
  const kdv = dot(kn, v);
  return add(
    add(scale(v, cosT), scale(kxv, sinT)),
    scale(kn, kdv * (1 - cosT))
  );
}

// ============================================================================
// SURFACE POINT & NORMAL EVALUATION
// ============================================================================

/** Evaluate surface point and normal at parameters (u, v) */
function evaluateSurface(
  surface: SurfaceDefinition,
  u: number,
  v: number
): { point: Vec3; normal: Vec3; kappa1: number; kappa2: number } {
  const { origin, axis } = surface;
  const ax = normalize(axis);

  switch (surface.type) {
    case "plane": {
      // Plane: point = origin + u*e1 + v*e2, normal = axis
      const e1 = normalize(
        Math.abs(ax.z) < 0.9
          ? cross(ax, vec3(0, 0, 1))
          : cross(ax, vec3(1, 0, 0))
      );
      const e2 = normalize(cross(ax, e1));
      const pt = add(origin, add(scale(e1, u * 100), scale(e2, v * 100)));
      return { point: pt, normal: ax, kappa1: 0, kappa2: 0 };
    }

    case "cylinder": {
      const R = surface.radius_mm ?? 25;
      const theta = u * 2 * Math.PI;
      const h = v * 100; // height along axis
      // Local frame
      const e1 = normalize(
        Math.abs(ax.z) < 0.9
          ? cross(ax, vec3(0, 0, 1))
          : cross(ax, vec3(1, 0, 0))
      );
      const e2 = normalize(cross(ax, e1));
      const radial = add(scale(e1, Math.cos(theta)), scale(e2, Math.sin(theta)));
      const pt = add(origin, add(scale(radial, R), scale(ax, h)));
      const normal = normalize(radial);
      return { point: pt, normal, kappa1: 1 / R, kappa2: 0 };
    }

    case "cone": {
      const halfAngle = (surface.half_angle_deg ?? 15) * Math.PI / 180;
      const baseR = surface.radius_mm ?? 30;
      const theta = u * 2 * Math.PI;
      const h = v * 100;
      const r = baseR + h * Math.tan(halfAngle);
      const e1 = normalize(
        Math.abs(ax.z) < 0.9
          ? cross(ax, vec3(0, 0, 1))
          : cross(ax, vec3(1, 0, 0))
      );
      const e2 = normalize(cross(ax, e1));
      const radial = add(scale(e1, Math.cos(theta)), scale(e2, Math.sin(theta)));
      const pt = add(origin, add(scale(radial, r), scale(ax, h)));
      // Cone normal: tilted outward by half-angle
      const outward = normalize(radial);
      const normal = normalize(
        add(scale(outward, Math.cos(halfAngle)), scale(ax, -Math.sin(halfAngle)))
      );
      return { point: pt, normal, kappa1: 1 / (r / Math.cos(halfAngle)), kappa2: 0 };
    }

    case "sphere": {
      const R = surface.radius_mm ?? 25;
      const phi = u * Math.PI; // polar angle
      const theta = v * 2 * Math.PI; // azimuthal
      const pt = add(origin, vec3(
        R * Math.sin(phi) * Math.cos(theta),
        R * Math.sin(phi) * Math.sin(theta),
        R * Math.cos(phi)
      ));
      const normal = normalize(sub(pt, origin));
      return { point: pt, normal, kappa1: 1 / R, kappa2: 1 / R };
    }

    case "torus": {
      const majorR = surface.radius_mm ?? 40;
      const minorR = surface.radius2_mm ?? 10;
      const theta = u * 2 * Math.PI; // around major
      const phi = v * 2 * Math.PI; // around minor
      const cx = (majorR + minorR * Math.cos(phi)) * Math.cos(theta);
      const cy = (majorR + minorR * Math.cos(phi)) * Math.sin(theta);
      const cz = minorR * Math.sin(phi);
      const pt = add(origin, vec3(cx, cy, cz));
      // Center of the tube cross-section
      const tubeCenter = add(origin, vec3(
        majorR * Math.cos(theta),
        majorR * Math.sin(theta),
        0
      ));
      const normal = normalize(sub(pt, tubeCenter));
      const kappa1 = 1 / minorR;
      const kappa2 = Math.cos(phi) / (majorR + minorR * Math.cos(phi));
      return { point: pt, normal, kappa1, kappa2 };
    }

    default:
      return { point: origin, normal: vec3(0, 0, 1), kappa1: 0, kappa2: 0 };
  }
}

// ============================================================================
// SCALLOP HEIGHT COMPUTATION
// ============================================================================

/**
 * Compute scallop height given effective cutting radius and stepover
 * h = R_eff - sqrt(R_eff² - (ae/2)²)
 * For ae > 2*R_eff, returns R_eff (full scallop)
 */
function computeScallopHeight(effectiveR_mm: number, stepover_mm: number): number {
  if (effectiveR_mm <= 0) return 0;
  const halfAe = stepover_mm / 2;
  if (halfAe >= effectiveR_mm) return effectiveR_mm;
  return effectiveR_mm - Math.sqrt(effectiveR_mm ** 2 - halfAe ** 2);
}

/**
 * Get effective cutting radius for scallop computation
 * Depends on cutter type and surface curvature
 */
function getEffectiveRadius(cutter: CutterGeometry, kappa1: number, kappa2: number): number {
  const R = cutter.diameter_mm / 2;

  switch (cutter.type) {
    case "ball":
      // Effective R considers surface curvature: 1/R_eff = 1/R - κ_cross
      // κ_cross is curvature in stepover direction (typically κ2)
      if (Math.abs(kappa2) > 1e-8) {
        const rEff = 1 / (1 / R - kappa2);
        return rEff > 0 ? rEff : R;
      }
      return R;

    case "flat":
      // Flat end mill: scallop is purely geometric, effective R = infinity for flat surfaces
      // For curved surfaces, cusp height depends on geometry
      return R * 100; // Very large → tiny scallop (flat leaves cusps only at edges)

    case "bull_nose": {
      // Bull-nose: corner radius determines scallop
      const cr = cutter.corner_radius_mm ?? 1;
      if (Math.abs(kappa2) > 1e-8) {
        const rEff = 1 / (1 / cr - kappa2);
        return rEff > 0 ? rEff : cr;
      }
      return cr;
    }

    case "barrel": {
      // Barrel cutter: large barrel radius dominates scallop
      // Effective R ≈ barrel_radius (much larger than ball of same diameter)
      const barrelR = cutter.barrel_radius_mm ?? R * 10;
      if (Math.abs(kappa2) > 1e-8) {
        const rEff = 1 / (1 / barrelR - kappa2);
        return rEff > 0 ? rEff : barrelR;
      }
      return barrelR;
    }

    default:
      return R;
  }
}

// ============================================================================
// CUTTER LOCATION COMPUTATION
// ============================================================================

/**
 * Compute CL (cutter location) from CC point, surface normal, and cutter geometry
 */
function computeCL(
  cc: Vec3,
  normal: Vec3,
  toolAxis: Vec3,
  cutter: CutterGeometry
): Vec3 {
  const R = cutter.diameter_mm / 2;

  switch (cutter.type) {
    case "ball":
      // CL = CC + R * normal (ball center is R above contact along normal)
      return add(cc, scale(normal, R));

    case "flat":
      // CL = CC + R * tool_axis (tool tip center offset along axis)
      return add(cc, scale(toolAxis, 0)); // CC is at the tip already
      // Actually for flat: CL = CC + offset to tool center
      // Simplified: CL is at CC elevated by tool axis

    case "bull_nose": {
      const cr = cutter.corner_radius_mm ?? 1;
      // CL = CC + cr * normal + (R - cr) * projection onto plane
      return add(cc, scale(normal, cr));
    }

    case "barrel": {
      const barrelR = cutter.barrel_radius_mm ?? R * 10;
      // Barrel: CL offset by barrel geometry
      return add(cc, scale(normal, R));
    }

    default:
      return add(cc, scale(normal, R));
  }
}

/**
 * Compute tool axis with tilt and lead angles applied
 * Base axis = surface normal, then rotate by tilt (around feed dir) and lead (around cross-feed)
 */
function computeToolAxis(
  normal: Vec3,
  tilt_deg: number,
  lead_deg: number,
  feedDir?: Vec3
): Vec3 {
  let axis = normalize(normal);

  if (Math.abs(tilt_deg) < 0.01 && Math.abs(lead_deg) < 0.01) {
    return axis;
  }

  // Create feed direction if not provided
  const feed = feedDir ?? normalize(
    Math.abs(axis.z) < 0.9
      ? cross(axis, vec3(0, 0, 1))
      : cross(axis, vec3(1, 0, 0))
  );
  const crossFeed = normalize(cross(axis, feed));

  // Apply tilt: rotate around cross-feed direction
  if (Math.abs(tilt_deg) > 0.01) {
    axis = rodrigues(axis, crossFeed, tilt_deg * Math.PI / 180);
  }

  // Apply lead: rotate around feed direction
  if (Math.abs(lead_deg) > 0.01) {
    axis = rodrigues(axis, feed, lead_deg * Math.PI / 180);
  }

  return normalize(axis);
}

/**
 * Check for gouging: does the cutter body intersect the surface?
 * Simplified check: compare offset distance to cutter radius
 */
function checkGouge(
  cc: Vec3,
  normal: Vec3,
  toolAxis: Vec3,
  cutter: CutterGeometry,
  kappa1: number,
  kappa2: number
): boolean {
  const R = cutter.diameter_mm / 2;

  // For ball cutter: gouge-free if ball radius ≤ min surface radius of curvature
  if (cutter.type === "ball") {
    if (kappa1 > 0 && 1 / kappa1 < R * 0.95) return false; // might gouge
    if (kappa2 > 0 && 1 / kappa2 < R * 0.95) return false;
  }

  // Check tool axis alignment: large tilt on concave surfaces can gouge
  const axisDotNormal = Math.abs(dot(toolAxis, normal));
  if (axisDotNormal < 0.3 && (kappa1 > 0 || kappa2 > 0)) {
    return false; // extreme tilt on convex surface
  }

  return true; // gouge-free
}

// ============================================================================
// MAIN CC COMPUTATION
// ============================================================================

/**
 * Compute a single CC point
 */
function computeCCPoint(input: CCInput): CCPoint {
  const { surface, cutter, u, v, stepover_mm, tilt_deg = 0, lead_deg = 0 } = input;

  // 1. Evaluate surface at (u, v)
  const { point, normal, kappa1, kappa2 } = evaluateSurface(surface, u, v);

  // 2. Compute tool axis with tilt/lead
  const toolAxis = computeToolAxis(normal, tilt_deg, lead_deg);

  // 3. Compute CL from CC
  const cl = computeCL(point, normal, toolAxis, cutter);

  // 4. Effective radius and scallop height
  const effectiveR = getEffectiveRadius(cutter, kappa1, kappa2);
  const scallop = computeScallopHeight(effectiveR, stepover_mm);

  // 5. Gouge check
  const gougeFree = checkGouge(point, normal, toolAxis, cutter, kappa1, kappa2);

  return {
    cc: point,
    cl,
    normal,
    tool_axis: toolAxis,
    scallop_height_mm: scallop,
    effective_radius_mm: effectiveR,
    gouge_free: gougeFree,
  };
}

/**
 * Compute CC points along a grid on the surface
 */
function computeCCGrid(
  surface: SurfaceDefinition,
  cutter: CutterGeometry,
  stepover_mm: number,
  u_steps: number,
  v_steps: number,
  tilt_deg = 0,
  lead_deg = 0
): CCResult {
  const points: CCPoint[] = [];
  const warnings: string[] = [];
  let maxScallop = 0;
  let totalScallop = 0;
  let allGougeFree = true;

  for (let i = 0; i <= u_steps; i++) {
    for (let j = 0; j <= v_steps; j++) {
      const u = i / Math.max(u_steps, 1);
      const v = j / Math.max(v_steps, 1);

      const pt = computeCCPoint({
        surface,
        cutter,
        u,
        v,
        stepover_mm,
        tilt_deg,
        lead_deg,
      });

      points.push(pt);
      totalScallop += pt.scallop_height_mm;
      if (pt.scallop_height_mm > maxScallop) maxScallop = pt.scallop_height_mm;
      if (!pt.gouge_free) allGougeFree = false;
    }
  }

  if (!allGougeFree) {
    warnings.push("Potential gouging detected — consider reducing tilt or using smaller cutter");
  }

  if (maxScallop > 0.05) {
    warnings.push(`Max scallop ${maxScallop.toFixed(4)} mm — consider reducing stepover`);
  }

  return {
    points,
    surface_type: surface.type,
    cutter_type: cutter.type,
    avg_scallop_mm: points.length > 0 ? totalScallop / points.length : 0,
    max_scallop_mm: maxScallop,
    gouge_free: allGougeFree,
    warnings,
  };
}

/**
 * Compute optimal stepover for target scallop height
 * ae = 2 * sqrt(2 * R_eff * h_target)
 */
function optimalStepover(
  cutter: CutterGeometry,
  targetScallop_mm: number,
  kappa1 = 0,
  kappa2 = 0
): number {
  const effectiveR = getEffectiveRadius(cutter, kappa1, kappa2);
  if (effectiveR <= 0 || targetScallop_mm <= 0) return 0;
  // ae = 2 * sqrt(2 * R_eff * h) — derived from scallop formula inversion
  return 2 * Math.sqrt(2 * effectiveR * targetScallop_mm);
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export const cutterContactEngine = {
  computeCC: computeCCPoint,
  computeGrid: computeCCGrid,
  optimalStepover,
  evaluateSurface,
  computeScallopHeight,
  getEffectiveRadius,
  computeToolAxis,
};
