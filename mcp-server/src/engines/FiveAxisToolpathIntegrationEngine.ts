/**
 * FiveAxisToolpathIntegrationEngine — CK-MS5 5-Axis Toolpath Integration
 *
 * Unified 5-axis toolpath engine integrating:
 * 1. Contour milling — side-milling along complex surfaces with lead/lag/tilt
 * 2. Port machining — helical interpolation in bores with variable tool axis
 * 3. Singularity management — gimbal lock detection + smooth axis retraction
 * 4. Collision avoidance — tool+holder+spindle vs part+fixture AABB/OBB checking
 * 5. Simultaneous 5-axis roughing — 3+2 to full 5ax blending with zone strategy
 *
 * Physics: Rodrigues rotation, SLERP interpolation, Euler angle singularity
 * detection (det(J)→0), inverse kinematics (A/B/C from tool vector),
 * AABB overlap collision, Monte Carlo tool-axis error propagation.
 *
 * Actions: five_axis_contour, five_axis_port, five_axis_singularity_manage,
 *   five_axis_collision_avoid, five_axis_roughing
 *
 * @module FiveAxisToolpathIntegrationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 3D vector. */
export interface FATIVec3 {
  x: number;
  y: number;
  z: number;
}

/** Toolpath point with position, surface normal, and optional tool axis. */
export interface FATIToolpathPoint {
  position: FATIVec3;
  normal: FATIVec3;
  feed_dir?: FATIVec3;
  tool_axis?: FATIVec3;
  feed_rate_mm_min?: number;
}

/** Lead/lag/tilt angle specification (radians). */
export interface FATIAxisAngles {
  lead_rad: number;
  lag_rad: number;
  tilt_rad: number;
}

/** Machine kinematic configuration. */
export interface FATIKinematicConfig {
  type: "AC" | "BC" | "AB";
  /** Primary rotary axis limits [min_deg, max_deg]. */
  axis1_limits_deg: [number, number];
  /** Secondary rotary axis limits [min_deg, max_deg]. */
  axis2_limits_deg: [number, number];
  /** Maximum rotary axis velocity (deg/s). */
  max_rotary_vel_deg_s: number;
  /** Pivot length from rotary center to spindle face (mm). */
  pivot_length_mm: number;
  /** Tool gauge length (mm). */
  tool_gauge_length_mm: number;
}

/** Tool geometry for collision checks. */
export interface FATIToolGeometry {
  diameter_mm: number;
  cutting_length_mm: number;
  holder_diameter_mm: number;
  holder_length_mm: number;
  spindle_diameter_mm?: number;
  spindle_length_mm?: number;
}

/** AABB bounding box. */
export interface FATIAABB {
  min: FATIVec3;
  max: FATIVec3;
  id?: string;
}

// ---- Contour Milling Types ----

/** Input for 5-axis contour milling. */
export interface FATIContourInput {
  points: FATIToolpathPoint[];
  angles: Partial<FATIAxisAngles>;
  /** Tool diameter for offset calculation (mm). */
  tool_diameter_mm: number;
  /** Smoothing window size for axis vectors. */
  smoothing_window?: number;
  /** Boundary trim polygon (2D, XY plane). */
  boundary?: { x: number; y: number }[];
  /** Surface normal follow mode. */
  normal_follow: boolean;
}

/** Contour milling result point. */
export interface FATIContourResultPoint {
  position: FATIVec3;
  tool_axis: FATIVec3;
  A_deg: number;
  C_deg: number;
  feed_rate_mm_min: number;
  surface_deviation_mm: number;
}

/** Contour milling output. */
export interface FATIContourResult {
  points: FATIContourResultPoint[];
  total_length_mm: number;
  max_surface_deviation_mm: number;
  avg_tilt_deg: number;
  axis_smoothness_score: number;
}

// ---- Port Machining Types ----

/** Input for port machining. */
export interface FATIPortInput {
  /** Port center axis start (mm). */
  port_start: FATIVec3;
  /** Port center axis end (mm). */
  port_end: FATIVec3;
  /** Port bore diameter (mm). */
  port_diameter_mm: number;
  /** Tool diameter (mm). */
  tool_diameter_mm: number;
  /** Number of helical passes. */
  num_passes: number;
  /** Stepover per helix pass (mm). */
  stepover_mm: number;
  /** Detect undercuts in port wall. */
  detect_undercuts: boolean;
  /** Rest material tracking from prior ops. */
  rest_material_aabb?: FATIAABB[];
  /** Kinematic config for IK. */
  kinematic_config?: FATIKinematicConfig;
}

/** Port machining result. */
export interface FATIPortResult {
  passes: FATIPortPass[];
  total_points: number;
  undercuts_detected: number;
  rest_material_volume_mm3: number;
  max_tool_axis_change_deg: number;
}

/** Single helical pass in port machining. */
export interface FATIPortPass {
  pass_index: number;
  points: { position: FATIVec3; tool_axis: FATIVec3; radial_depth_mm: number }[];
  radial_depth_mm: number;
  is_undercut_region: boolean;
}

// ---- Singularity Management Types ----

/** Input for singularity management. */
export interface FATISingularityInput {
  points: FATIToolpathPoint[];
  kinematic_config: FATIKinematicConfig;
  /** Feed rate for angular velocity calculation. */
  feed_rate_mm_min: number;
  /** Singularity threshold — Jacobian determinant below this triggers detection. */
  singularity_threshold?: number;
  /** Maximum allowed retraction angle (deg). */
  max_retraction_deg?: number;
}

/** Singularity detection result. */
export interface FATISingularityResult {
  singular_zones: FATISingularityZone[];
  total_points_checked: number;
  is_safe: boolean;
  corrected_points: FATIToolpathPoint[];
  max_jacobian_condition: number;
  retraction_count: number;
}

/** A detected singularity zone. */
export interface FATISingularityZone {
  start_index: number;
  end_index: number;
  type: "gimbal_lock" | "pole" | "axis_reversal" | "high_velocity";
  severity: "warning" | "critical";
  jacobian_det_min: number;
  corrective_action: string;
}

// ---- Collision Avoidance Types ----

/** Input for collision avoidance. */
export interface FATICollisionInput {
  points: FATIToolpathPoint[];
  tool: FATIToolGeometry;
  part_aabb: FATIAABB;
  fixture_aabbs?: FATIAABB[];
  kinematic_config: FATIKinematicConfig;
  /** Maximum tilt adjustment for collision avoidance (deg). */
  max_tilt_adjust_deg?: number;
  /** Near-miss threshold (mm). */
  near_miss_threshold_mm?: number;
}

/** Collision avoidance result. */
export interface FATICollisionResult {
  collisions_detected: number;
  near_misses: number;
  adjusted_points: FATIToolpathPoint[];
  collision_details: FATICollisionDetail[];
  is_safe: boolean;
  min_clearance_mm: number;
}

/** Individual collision detail. */
export interface FATICollisionDetail {
  point_index: number;
  component: "tool" | "holder" | "spindle";
  obstacle: string;
  penetration_mm: number;
  tilt_adjustment_deg: number;
  resolved: boolean;
}

// ---- Simultaneous 5-Axis Roughing Types ----

/** Input for simultaneous 5-axis roughing. */
export interface FATIRoughingInput {
  /** Surface mesh as point cloud with normals. */
  surface_points: FATIToolpathPoint[];
  /** Tool geometry. */
  tool: FATIToolGeometry;
  /** Stock bounding box. */
  stock_aabb: FATIAABB;
  /** Stepover (mm). */
  stepover_mm: number;
  /** Stepdown (mm). */
  stepdown_mm: number;
  /** Kinematic config for zone selection. */
  kinematic_config: FATIKinematicConfig;
  /** Flatness threshold for 3+2 zone detection (cos of normal angle from Z). */
  flatness_cos_threshold?: number;
  /** Adaptive engagement target (fraction of tool diameter). */
  adaptive_ae_fraction?: number;
}

/** Roughing result. */
export interface FATIRoughingResult {
  zones: FATIRoughingZone[];
  total_points: number;
  zone_count_3plus2: number;
  zone_count_5ax: number;
  estimated_mrr_cm3_min: number;
  blend_transitions: number;
}

/** A roughing zone. */
export interface FATIRoughingZone {
  zone_index: number;
  strategy: "3plus2" | "full_5ax";
  fixed_orientation?: FATIVec3;
  points: { position: FATIVec3; tool_axis: FATIVec3; ae_mm: number; ap_mm: number }[];
  mrr_cm3_min: number;
}

// ---- Stochastic / Uncertainty Types ----

/** Stochastic analysis input. */
export interface FATIStochasticInput {
  nominal_points: FATIToolpathPoint[];
  axis_angle_std_dev_deg: number;
  position_std_dev_mm: number;
  num_samples?: number;
}

/** Stochastic analysis result. */
export interface FATIStochasticResult {
  mean_surface_deviation_mm: number;
  std_surface_deviation_mm: number;
  p95_surface_deviation_mm: number;
  tilt_sensitivity_mm_per_deg: number;
  worst_case_index: number;
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

/** Normalize a 3D vector. Returns (0,0,1) for zero-length. */
function vecNorm(v: FATIVec3): FATIVec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Vector length. */
function vecLen(v: FATIVec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Dot product. */
function vecDot(a: FATIVec3, b: FATIVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Cross product. */
function vecCross(a: FATIVec3, b: FATIVec3): FATIVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Vector subtraction a - b. */
function vecSub(a: FATIVec3, b: FATIVec3): FATIVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Vector addition a + b. */
function vecAdd(a: FATIVec3, b: FATIVec3): FATIVec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Scalar multiply. */
function vecScale(v: FATIVec3, s: number): FATIVec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Distance between two points. */
function vecDist(a: FATIVec3, b: FATIVec3): number {
  return vecLen(vecSub(a, b));
}

/**
 * Rodrigues rotation — rotate vector v around axis k by angle theta (rad).
 * v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
 */
function rodrigues(v: FATIVec3, axis: FATIVec3, theta: number): FATIVec3 {
  const k = vecNorm(axis);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const kxv = vecCross(k, v);
  const kdv = vecDot(k, v);
  return {
    x: v.x * c + kxv.x * s + k.x * kdv * (1 - c),
    y: v.y * c + kxv.y * s + k.y * kdv * (1 - c),
    z: v.z * c + kxv.z * s + k.z * kdv * (1 - c),
  };
}

/**
 * SLERP — Spherical Linear Interpolation between unit vectors a and b.
 * Returns interpolated unit vector at parameter t ∈ [0,1].
 */
function slerp(a: FATIVec3, b: FATIVec3, t: number): FATIVec3 {
  const an = vecNorm(a);
  const bn = vecNorm(b);
  let dot = vecDot(an, bn);
  dot = Math.max(-1, Math.min(1, dot));
  if (dot > 0.9999) {
    // Nearly parallel — linear interpolation
    return vecNorm({
      x: an.x + t * (bn.x - an.x),
      y: an.y + t * (bn.y - an.y),
      z: an.z + t * (bn.z - an.z),
    });
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / sinOmega;
  const wb = Math.sin(t * omega) / sinOmega;
  return vecNorm({
    x: wa * an.x + wb * bn.x,
    y: wa * an.y + wb * bn.y,
    z: wa * an.z + wb * bn.z,
  });
}

/**
 * Inverse kinematics for AC-type table-table 5-axis machine.
 * Given tool axis vector (i,j,k), compute A and C angles.
 * A = rotation about X, C = rotation about Z.
 *
 * For AC config: tool axis (i,j,k) maps to:
 *   A = atan2(-j, k)  (tilt from Z toward -Y)
 *   C = atan2(i, -j*sin(A) + k*cos(A))  (rotation about Z)
 *
 * Returns angles in degrees.
 */
function inverseKinematicsAC(toolAxis: FATIVec3): { A_deg: number; C_deg: number } {
  const v = vecNorm(toolAxis);
  // A = angle from Z-axis in YZ plane
  const A = Math.atan2(-v.y, v.z);
  // After A rotation, effective projection for C
  const cosA = Math.cos(A);
  const sinA = Math.sin(A);
  const projZ = -v.y * sinA + v.z * cosA;
  const C = Math.atan2(v.x, Math.max(projZ, 1e-10));
  return { A_deg: A * 180 / Math.PI, C_deg: C * 180 / Math.PI };
}

/**
 * Inverse kinematics for BC-type head-head 5-axis machine.
 * B = rotation about Y, C = rotation about Z.
 *   B = atan2(-i, k)
 *   C = atan2(j, k*cos(B) - i*sin(B))
 */
function inverseKinematicsBC(toolAxis: FATIVec3): { B_deg: number; C_deg: number } {
  const v = vecNorm(toolAxis);
  const B = Math.atan2(-v.x, v.z);
  const cosB = Math.cos(B);
  const sinB = Math.sin(B);
  const projZ = v.z * cosB - v.x * sinB;
  const C = Math.atan2(v.y, Math.max(projZ, 1e-10));
  return { B_deg: B * 180 / Math.PI, C_deg: C * 180 / Math.PI };
}

/**
 * Compute Jacobian determinant for singularity detection.
 * For AC config: J = ∂(i,j,k)/∂(A,C).
 * Near gimbal lock (A≈0 and tool axis ≈ Z), det(J)→0.
 *
 * Simplified: det(J) ∝ sin(A) for AC config (singularity at A=0).
 * For BC config: det(J) ∝ sin(B).
 */
function jacobianDet(toolAxis: FATIVec3, kinType: "AC" | "BC" | "AB"): number {
  const v = vecNorm(toolAxis);
  if (kinType === "AC") {
    const A = Math.atan2(-v.y, v.z);
    // det(J) = sin(A) — zero at A=0 (tool parallel to Z)
    return Math.abs(Math.sin(A));
  } else if (kinType === "BC") {
    const B = Math.atan2(-v.x, v.z);
    return Math.abs(Math.sin(B));
  } else {
    // AB: singularity when both A and B near zero
    const A = Math.atan2(-v.y, v.z);
    const B = Math.atan2(-v.x, v.z);
    return Math.abs(Math.sin(A)) * Math.abs(Math.sin(B));
  }
}

/**
 * Check AABB overlap between two bounding boxes.
 * Returns overlap depth (negative = separation, positive = penetration).
 */
function aabbOverlap(a: FATIAABB, b: FATIAABB): number {
  const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const overlapY = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  const overlapZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
    return -Math.max(-overlapX, -overlapY, -overlapZ);
  }
  return Math.min(overlapX, overlapY, overlapZ);
}

/**
 * Build AABB for tool+holder at given position and tool axis.
 * Models tool as oriented cylinder → conservative AABB.
 */
function buildToolAABB(
  pos: FATIVec3,
  toolAxis: FATIVec3,
  tool: FATIToolGeometry,
  component: "tool" | "holder" | "spindle"
): FATIAABB {
  const axis = vecNorm(toolAxis);
  let radius: number;
  let length: number;
  let startOffset: number;

  if (component === "tool") {
    radius = tool.diameter_mm / 2;
    length = tool.cutting_length_mm;
    startOffset = 0;
  } else if (component === "holder") {
    radius = tool.holder_diameter_mm / 2;
    length = tool.holder_length_mm;
    startOffset = tool.cutting_length_mm;
  } else {
    radius = (tool.spindle_diameter_mm || tool.holder_diameter_mm * 1.2) / 2;
    length = tool.spindle_length_mm || 100;
    startOffset = tool.cutting_length_mm + tool.holder_length_mm;
  }

  // Start and end points along tool axis
  const start = vecAdd(pos, vecScale(axis, startOffset));
  const end = vecAdd(pos, vecScale(axis, startOffset + length));

  // Conservative AABB: envelope of both endpoints expanded by radius
  return {
    min: {
      x: Math.min(start.x, end.x) - radius,
      y: Math.min(start.y, end.y) - radius,
      z: Math.min(start.z, end.z) - radius,
    },
    max: {
      x: Math.max(start.x, end.x) + radius,
      y: Math.max(start.y, end.y) + radius,
      z: Math.max(start.z, end.z) + radius,
    },
  };
}

/** Gaussian smoothing kernel for axis vectors. */
function gaussianSmooth(values: FATIVec3[], windowSize: number): FATIVec3[] {
  if (windowSize < 2 || values.length < 3) return values.map(v => vecNorm(v));
  const half = Math.floor(windowSize / 2);
  const sigma = half / 2.5;
  const result: FATIVec3[] = [];
  for (let i = 0; i < values.length; i++) {
    let sx = 0, sy = 0, sz = 0, wt = 0;
    for (let j = -half; j <= half; j++) {
      const idx = Math.max(0, Math.min(values.length - 1, i + j));
      const g = Math.exp(-(j * j) / (2 * sigma * sigma));
      sx += values[idx].x * g;
      sy += values[idx].y * g;
      sz += values[idx].z * g;
      wt += g;
    }
    result.push(vecNorm({ x: sx / wt, y: sy / wt, z: sz / wt }));
  }
  return result;
}

/** Box-Muller normal random variate. */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class FiveAxisToolpathIntegrationEngineImpl {

  // ==========================================================================
  // 1. CONTOUR MILLING
  // ==========================================================================

  /**
   * 5-Axis contour milling along complex surfaces.
   *
   * Applies lead/lag/tilt angles to surface-normal-derived tool axis,
   * performs Gaussian axis smoothing, boundary trimming, and computes
   * inverse kinematics (A/C angles) for each point.
   *
   * Physics: Rodrigues rotation for lead/lag/tilt application,
   * Gaussian window smoothing for axis continuity.
   *
   * @param input - Contour milling parameters
   * @returns Optimized contour toolpath with IK solutions
   */
  contourMill(input: FATIContourInput): FATIContourResult {
    const {
      points, angles, tool_diameter_mm, smoothing_window = 5,
      boundary, normal_follow,
    } = input;
    const lead = angles.lead_rad ?? 0;
    const lag = angles.lag_rad ?? 0;
    const tilt = angles.tilt_rad ?? 0;

    if (!points || points.length === 0) {
      return {
        points: [], total_length_mm: 0, max_surface_deviation_mm: 0,
        avg_tilt_deg: 0, axis_smoothness_score: 1,
      };
    }

    // Step 1: Compute raw tool axes from surface normals + lead/lag/tilt
    const rawAxes: FATIVec3[] = [];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const n = vecNorm(pt.normal);
      let axis = { ...n };

      // Feed direction for lead/lag decomposition
      const fd = pt.feed_dir
        ? vecNorm(pt.feed_dir)
        : i < points.length - 1
          ? vecNorm(vecSub(points[i + 1].position, pt.position))
          : i > 0
            ? vecNorm(vecSub(pt.position, points[i - 1].position))
            : { x: 1, y: 0, z: 0 };

      // Tilt axis = normal × feed_dir (perpendicular to both)
      const tiltAxis = vecNorm(vecCross(n, fd));

      if (normal_follow) {
        // Lead: rotate axis toward feed direction
        if (Math.abs(lead) > 1e-6) {
          axis = rodrigues(axis, tiltAxis, lead);
        }
        // Lag: rotate axis away from feed direction
        if (Math.abs(lag) > 1e-6) {
          axis = rodrigues(axis, tiltAxis, -lag);
        }
        // Tilt: rotate axis perpendicular to feed direction
        if (Math.abs(tilt) > 1e-6) {
          axis = rodrigues(axis, fd, tilt);
        }
      }

      rawAxes.push(vecNorm(axis));
    }

    // Step 2: Gaussian axis smoothing
    const smoothedAxes = gaussianSmooth(rawAxes, smoothing_window);

    // Step 3: Build result points with IK, boundary trim, offset
    const resultPoints: FATIContourResultPoint[] = [];
    let totalLength = 0;
    let maxDeviation = 0;
    let tiltSum = 0;
    let smoothnessSum = 0;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const toolAxis = smoothedAxes[i];

      // Boundary check (point-in-polygon, XY plane)
      if (boundary && boundary.length >= 3) {
        if (!this._pointInPolygon(pt.position.x, pt.position.y, boundary)) {
          continue; // trimmed
        }
      }

      // Tool offset: shift position by half tool diameter perpendicular to surface
      const offsetDir = vecNorm(vecCross(toolAxis, pt.feed_dir || { x: 1, y: 0, z: 0 }));
      const offsetPos = vecAdd(pt.position, vecScale(offsetDir, tool_diameter_mm / 2));

      // Inverse kinematics
      const ik = inverseKinematicsAC(toolAxis);

      // Surface deviation estimate: angle between tool axis and surface normal
      const cosAngle = Math.abs(vecDot(toolAxis, vecNorm(pt.normal)));
      const deviation = tool_diameter_mm / 2 * (1 - cosAngle);
      maxDeviation = Math.max(maxDeviation, deviation);
      tiltSum += Math.acos(Math.min(1, cosAngle)) * 180 / Math.PI;

      // Smoothness: angular change between consecutive axes
      if (i > 0) {
        const prevAxis = smoothedAxes[i - 1];
        const angleDelta = Math.acos(Math.min(1, Math.abs(vecDot(toolAxis, prevAxis))));
        smoothnessSum += angleDelta;
      }

      // Path length
      if (i > 0) {
        totalLength += vecDist(pt.position, points[i - 1].position);
      }

      resultPoints.push({
        position: offsetPos,
        tool_axis: toolAxis,
        A_deg: ik.A_deg,
        C_deg: ik.C_deg,
        feed_rate_mm_min: pt.feed_rate_mm_min || 1000,
        surface_deviation_mm: deviation,
      });
    }

    const n = resultPoints.length || 1;
    const avgTilt = tiltSum / n;
    // Smoothness score: 1.0 = perfectly smooth, lower = more variation
    const avgAngularChange = smoothnessSum / Math.max(1, n - 1);
    const smoothnessScore = Math.max(0, 1 - avgAngularChange / (Math.PI / 6));

    return {
      points: resultPoints,
      total_length_mm: totalLength,
      max_surface_deviation_mm: maxDeviation,
      avg_tilt_deg: avgTilt,
      axis_smoothness_score: smoothnessScore,
    };
  }

  // ==========================================================================
  // 2. PORT MACHINING
  // ==========================================================================

  /**
   * Port machining with helical interpolation.
   *
   * Generates helical toolpath passes inside a cylindrical bore/port,
   * with variable tool axis following the port center axis. Detects
   * undercuts where tool cannot reach with given axis orientation.
   * Multi-pass roughing with rest material tracking.
   *
   * Physics: helical interpolation geometry, cylindrical coordinate
   * mapping, undercut detection via geometric analysis.
   *
   * @param input - Port machining parameters
   * @returns Multi-pass helical toolpath with undercut detection
   */
  portMachine(input: FATIPortInput): FATIPortResult {
    const {
      port_start, port_end, port_diameter_mm, tool_diameter_mm,
      num_passes, stepover_mm, detect_undercuts, rest_material_aabb,
    } = input;

    const portAxis = vecNorm(vecSub(port_end, port_start));
    const portLength = vecDist(port_start, port_end);
    const portRadius = port_diameter_mm / 2;
    const toolRadius = tool_diameter_mm / 2;

    if (portRadius <= toolRadius) {
      return {
        passes: [], total_points: 0, undercuts_detected: 0,
        rest_material_volume_mm3: 0, max_tool_axis_change_deg: 0,
      };
    }

    // Build perpendicular axes for helical coordinates
    const arbVec = Math.abs(portAxis.z) < 0.9
      ? { x: 0, y: 0, z: 1 }
      : { x: 1, y: 0, z: 0 };
    const u = vecNorm(vecCross(portAxis, arbVec));
    const v = vecCross(portAxis, u);

    const passes: FATIPortPass[] = [];
    let totalPoints = 0;
    let undercutsDetected = 0;
    let maxAxisChange = 0;

    for (let passIdx = 0; passIdx < num_passes; passIdx++) {
      // Radial depth for this pass: start from outside, work inward
      const radialDepth = Math.max(
        toolRadius,
        portRadius - (passIdx + 1) * stepover_mm
      );
      const helixRadius = radialDepth;

      // Number of points per revolution based on path complexity
      const circumference = 2 * Math.PI * helixRadius;
      const pointsPerRev = Math.max(36, Math.ceil(circumference / (tool_diameter_mm * 0.25)));

      // Number of revolutions to cover port length
      const axialPitchPerRev = stepover_mm * 2;
      const numRevolutions = Math.max(1, Math.ceil(portLength / axialPitchPerRev));
      const totalSteps = pointsPerRev * numRevolutions;

      const passPoints: { position: FATIVec3; tool_axis: FATIVec3; radial_depth_mm: number }[] = [];
      let isUndercut = false;
      let prevAxis: FATIVec3 | null = null;

      for (let step = 0; step <= totalSteps; step++) {
        const t = step / totalSteps; // 0..1 along port length
        const angle = (step / pointsPerRev) * 2 * Math.PI;

        // Position along port center axis
        const centerPt = vecAdd(port_start, vecScale(portAxis, t * portLength));

        // Helical offset in port cross-section
        const radialOffset = vecAdd(
          vecScale(u, helixRadius * Math.cos(angle)),
          vecScale(v, helixRadius * Math.sin(angle))
        );

        const position = vecAdd(centerPt, radialOffset);

        // Tool axis: primarily along port axis, with slight inward tilt for cutting
        const inwardDir = vecNorm(vecScale(radialOffset, -1));
        const tiltAmount = 0.05; // ~3° inward tilt
        const toolAxis = vecNorm(vecAdd(portAxis, vecScale(inwardDir, tiltAmount)));

        // Undercut detection: check if tool can reach position without gouging
        if (detect_undercuts) {
          // Undercut exists when radial position requires tool axis change
          // beyond what the port geometry allows (tool shank hits wall)
          const shankClearance = portRadius - helixRadius - tool_diameter_mm / 2;
          if (shankClearance < tool_diameter_mm * 0.1) {
            isUndercut = true;
            undercutsDetected++;
          }
        }

        // Track max axis change
        if (prevAxis) {
          const axisDot = Math.abs(vecDot(toolAxis, prevAxis));
          const angleChange = Math.acos(Math.min(1, axisDot)) * 180 / Math.PI;
          maxAxisChange = Math.max(maxAxisChange, angleChange);
        }
        prevAxis = toolAxis;

        passPoints.push({ position, tool_axis: toolAxis, radial_depth_mm: radialDepth });
      }

      totalPoints += passPoints.length;
      passes.push({
        pass_index: passIdx,
        points: passPoints,
        radial_depth_mm: helixRadius,
        is_undercut_region: isUndercut,
      });
    }

    // Rest material volume estimate (simplified cylindrical shell)
    const innerCutRadius = passes.length > 0
      ? passes[passes.length - 1].radial_depth_mm
      : portRadius;
    const restVolume = Math.PI * (innerCutRadius * innerCutRadius) * portLength;

    // Account for external rest material AABBs
    let externalRest = 0;
    if (rest_material_aabb) {
      for (const aabb of rest_material_aabb) {
        const dx = aabb.max.x - aabb.min.x;
        const dy = aabb.max.y - aabb.min.y;
        const dz = aabb.max.z - aabb.min.z;
        externalRest += dx * dy * dz;
      }
    }

    return {
      passes,
      total_points: totalPoints,
      undercuts_detected: undercutsDetected,
      rest_material_volume_mm3: restVolume + externalRest,
      max_tool_axis_change_deg: maxAxisChange,
    };
  }

  // ==========================================================================
  // 3. SINGULARITY MANAGEMENT
  // ==========================================================================

  /**
   * Singularity detection and management for 5-axis toolpaths.
   *
   * Detects gimbal lock zones where Jacobian determinant approaches zero,
   * applies smooth axis retraction/interpolation through singularities,
   * and computes safe tool-axis transition paths.
   *
   * Physics: Euler angle singularity analysis — for AC config, singularity
   * at A≈0 (tool ∥ Z). Jacobian condition number monitors proximity.
   * SLERP interpolation provides smooth axis transitions.
   *
   * @param input - Singularity management parameters
   * @returns Corrected toolpath with singularity zones documented
   */
  manageSingularities(input: FATISingularityInput): FATISingularityResult {
    const {
      points, kinematic_config, feed_rate_mm_min,
      singularity_threshold = 0.05,
      max_retraction_deg = 15,
    } = input;

    if (!points || points.length === 0) {
      return {
        singular_zones: [], total_points_checked: 0, is_safe: true,
        corrected_points: [], max_jacobian_condition: 1, retraction_count: 0,
      };
    }

    const kinType = kinematic_config.type;
    const maxRotVel = kinematic_config.max_rotary_vel_deg_s;

    // Step 1: Compute Jacobian det and rotary velocities for each point
    const jacDets: number[] = [];
    const rotaryVels: number[] = [];
    const corrected = points.map(p => ({ ...p }));

    for (let i = 0; i < points.length; i++) {
      const axis = vecNorm(points[i].tool_axis || points[i].normal);
      const jDet = jacobianDet(axis, kinType);
      jacDets.push(jDet);

      // Compute required rotary velocity between consecutive points
      if (i > 0) {
        const prevAxis = vecNorm(points[i - 1].tool_axis || points[i - 1].normal);
        const axisAngleDeg = Math.acos(Math.min(1, Math.abs(vecDot(axis, prevAxis)))) * 180 / Math.PI;
        const dist = vecDist(points[i].position, points[i - 1].position);
        const timeS = dist / (feed_rate_mm_min / 60);
        const requiredVel = timeS > 1e-9 ? axisAngleDeg / timeS : 0;
        rotaryVels.push(requiredVel);
      } else {
        rotaryVels.push(0);
      }
    }

    // Step 2: Identify singularity zones
    const zones: FATISingularityZone[] = [];
    let zoneStart = -1;
    let zoneMinJac = 1;
    let zoneType: FATISingularityZone["type"] = "gimbal_lock";

    for (let i = 0; i < points.length; i++) {
      const isSingular = jacDets[i] < singularity_threshold;
      const isHighVel = rotaryVels[i] > maxRotVel;

      if (isSingular || isHighVel) {
        if (zoneStart < 0) {
          zoneStart = i;
          zoneMinJac = jacDets[i];
          zoneType = isHighVel ? "high_velocity" : "gimbal_lock";
        }
        zoneMinJac = Math.min(zoneMinJac, jacDets[i]);
      } else if (zoneStart >= 0) {
        zones.push({
          start_index: zoneStart,
          end_index: i - 1,
          type: zoneType,
          severity: zoneMinJac < singularity_threshold * 0.2 ? "critical" : "warning",
          jacobian_det_min: zoneMinJac,
          corrective_action: zoneType === "high_velocity"
            ? "Feed rate reduction or axis retraction"
            : "Smooth axis retraction through singularity zone",
        });
        zoneStart = -1;
        zoneMinJac = 1;
      }
    }

    // Close any open zone
    if (zoneStart >= 0) {
      zones.push({
        start_index: zoneStart,
        end_index: points.length - 1,
        type: zoneType,
        severity: zoneMinJac < singularity_threshold * 0.2 ? "critical" : "warning",
        jacobian_det_min: zoneMinJac,
        corrective_action: "Smooth axis retraction through singularity zone",
      });
    }

    // Step 3: Apply corrections — SLERP-based axis retraction
    let retractionCount = 0;
    const maxRetrRad = max_retraction_deg * Math.PI / 180;

    for (const zone of zones) {
      // Find safe axes just before and after the zone
      const safeBeforeIdx = Math.max(0, zone.start_index - 1);
      const safeAfterIdx = Math.min(points.length - 1, zone.end_index + 1);

      const safeBefore = vecNorm(
        corrected[safeBeforeIdx].tool_axis || corrected[safeBeforeIdx].normal
      );
      const safeAfter = vecNorm(
        corrected[safeAfterIdx].tool_axis || corrected[safeAfterIdx].normal
      );

      // Apply retraction: tilt axis away from singularity
      const zoneLen = zone.end_index - zone.start_index + 1;
      for (let i = zone.start_index; i <= zone.end_index; i++) {
        const t = zoneLen > 1 ? (i - zone.start_index) / (zoneLen - 1) : 0.5;

        // SLERP between safe before and safe after
        let newAxis = slerp(safeBefore, safeAfter, t);

        // Additionally retract away from the singular direction
        // For AC: singular at A=0 means tool ∥ Z. Retract by tilting.
        const jDet = jacobianDet(newAxis, kinType);
        if (jDet < singularity_threshold) {
          // Retract: add small tilt in X or Y to move away from singularity
          const retrDir = kinType === "AC"
            ? { x: 0, y: Math.sin(maxRetrRad), z: 0 }
            : { x: Math.sin(maxRetrRad), y: 0, z: 0 };
          newAxis = vecNorm(vecAdd(newAxis, retrDir));
          retractionCount++;
        }

        corrected[i] = {
          ...corrected[i],
          tool_axis: newAxis,
        };
      }
    }

    const maxJacCondition = jacDets.length > 0 ? Math.max(...jacDets) : 1;
    const isSafe = zones.every(z => z.severity !== "critical");

    return {
      singular_zones: zones,
      total_points_checked: points.length,
      is_safe: isSafe && zones.length === 0,
      corrected_points: corrected,
      max_jacobian_condition: maxJacCondition,
      retraction_count: retractionCount,
    };
  }

  // ==========================================================================
  // 4. COLLISION AVOIDANCE
  // ==========================================================================

  /**
   * Real-time collision avoidance for 5-axis toolpaths.
   *
   * Checks tool+holder+spindle AABBs against part+fixture obstacles.
   * When collision detected, automatically adjusts tool tilt angle
   * to resolve. Reports near-misses and minimum clearances.
   *
   * Physics: AABB overlap detection, oriented tool envelope modeling,
   * iterative tilt adjustment with binary search for optimal angle.
   *
   * @param input - Collision avoidance parameters
   * @returns Adjusted toolpath with collision details
   */
  avoidCollisions(input: FATICollisionInput): FATICollisionResult {
    const {
      points, tool, part_aabb, fixture_aabbs = [],
      kinematic_config, max_tilt_adjust_deg = 10,
      near_miss_threshold_mm = 2.0,
    } = input;

    if (!points || points.length === 0) {
      return {
        collisions_detected: 0, near_misses: 0, adjusted_points: [],
        collision_details: [], is_safe: true, min_clearance_mm: Infinity,
      };
    }

    const obstacles: FATIAABB[] = [part_aabb, ...fixture_aabbs];
    const details: FATICollisionDetail[] = [];
    const adjusted = points.map(p => ({ ...p }));
    let totalCollisions = 0;
    let nearMisses = 0;
    let minClearance = Infinity;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const pos = pt.position;
      const axis = vecNorm(pt.tool_axis || pt.normal || { x: 0, y: 0, z: 1 });

      // Check each component against each obstacle
      const components: ("tool" | "holder" | "spindle")[] = ["tool", "holder", "spindle"];

      for (const comp of components) {
        const compAABB = buildToolAABB(pos, axis, tool, comp);

        for (const obstacle of obstacles) {
          const overlap = aabbOverlap(compAABB, obstacle);
          const clearance = -overlap; // positive = clearance, negative = penetration

          if (clearance < minClearance) {
            minClearance = clearance;
          }

          if (overlap > 0) {
            // Collision detected — attempt tilt adjustment
            totalCollisions++;
            let resolved = false;
            let tiltAdj = 0;

            // Binary search for minimum tilt that resolves collision
            let lo = 0;
            let hi = max_tilt_adjust_deg * Math.PI / 180;
            const fd = pt.feed_dir || { x: 1, y: 0, z: 0 };
            const tiltDir = vecNorm(vecCross(axis, fd));

            for (let iter = 0; iter < 12; iter++) {
              const mid = (lo + hi) / 2;
              const testAxis = rodrigues(axis, tiltDir, mid);
              const testAABB = buildToolAABB(pos, testAxis, tool, comp);
              const testOverlap = aabbOverlap(testAABB, obstacle);
              if (testOverlap <= 0) {
                hi = mid;
                resolved = true;
              } else {
                lo = mid;
              }
            }

            if (resolved) {
              const resolveAngle = hi;
              const newAxis = rodrigues(axis, tiltDir, resolveAngle);
              adjusted[i] = { ...adjusted[i], tool_axis: newAxis };
              tiltAdj = resolveAngle * 180 / Math.PI;
            }

            details.push({
              point_index: i,
              component: comp,
              obstacle: obstacle.id || "part",
              penetration_mm: overlap,
              tilt_adjustment_deg: tiltAdj,
              resolved,
            });
          } else if (clearance < near_miss_threshold_mm && clearance >= 0) {
            nearMisses++;
          }
        }
      }
    }

    return {
      collisions_detected: totalCollisions,
      near_misses: nearMisses,
      adjusted_points: adjusted,
      collision_details: details,
      is_safe: totalCollisions === 0 || details.every(d => d.resolved),
      min_clearance_mm: minClearance,
    };
  }

  // ==========================================================================
  // 5. SIMULTANEOUS 5-AXIS ROUGHING
  // ==========================================================================

  /**
   * Zone-based 5-axis roughing with 3+2 to full 5-axis blending.
   *
   * Classifies surface regions as flat (3+2 eligible) or freeform
   * (requires full 5-axis). Generates roughing toolpaths with adaptive
   * engagement control. Blends smoothly between zone strategies.
   *
   * Physics: Surface normal variance for zone classification,
   * material removal rate = ae × ap × Vc, adaptive engagement
   * maintains constant chip load across tool-axis changes.
   *
   * @param input - Roughing parameters with zone strategy selection
   * @returns Zone-based roughing plan with MRR estimates
   */
  roughing5Axis(input: FATIRoughingInput): FATIRoughingResult {
    const {
      surface_points, tool, stock_aabb, stepover_mm, stepdown_mm,
      kinematic_config,
      flatness_cos_threshold = 0.95,
      adaptive_ae_fraction = 0.4,
    } = input;

    if (!surface_points || surface_points.length === 0) {
      return {
        zones: [], total_points: 0, zone_count_3plus2: 0,
        zone_count_5ax: 0, estimated_mrr_cm3_min: 0, blend_transitions: 0,
      };
    }

    // Step 1: Classify each point as flat or freeform
    const zUp: FATIVec3 = { x: 0, y: 0, z: 1 };
    const isFlat: boolean[] = surface_points.map(pt => {
      const n = vecNorm(pt.normal);
      return Math.abs(vecDot(n, zUp)) >= flatness_cos_threshold;
    });

    // Step 2: Group consecutive points into zones
    const zones: FATIRoughingZone[] = [];
    let currentFlat = isFlat[0];
    let zoneStartIdx = 0;
    let blendTransitions = 0;

    const buildZone = (startIdx: number, endIdx: number, flat: boolean): FATIRoughingZone => {
      const zonePoints: FATIRoughingZone["points"] = [];
      const ae = tool.diameter_mm * adaptive_ae_fraction;

      // For 3+2: find average normal as fixed orientation
      let avgNormal: FATIVec3 = { x: 0, y: 0, z: 0 };
      for (let i = startIdx; i <= endIdx; i++) {
        const n = vecNorm(surface_points[i].normal);
        avgNormal = vecAdd(avgNormal, n);
      }
      avgNormal = vecNorm(avgNormal);

      for (let i = startIdx; i <= endIdx; i++) {
        const pt = surface_points[i];
        const toolAxis = flat ? avgNormal : vecNorm(pt.normal);
        zonePoints.push({
          position: pt.position,
          tool_axis: toolAxis,
          ae_mm: ae,
          ap_mm: stepdown_mm,
        });
      }

      // MRR = ae × ap × feed_rate / 1000 (approximate, mm³/min → cm³/min)
      const feedRate = 1000; // default mm/min
      const mrr = (ae * stepdown_mm * feedRate) / 1e3; // cm³/min

      return {
        zone_index: zones.length,
        strategy: flat ? "3plus2" : "full_5ax",
        fixed_orientation: flat ? avgNormal : undefined,
        points: zonePoints,
        mrr_cm3_min: mrr,
      };
    };

    for (let i = 1; i < surface_points.length; i++) {
      if (isFlat[i] !== currentFlat) {
        zones.push(buildZone(zoneStartIdx, i - 1, currentFlat));
        blendTransitions++;
        zoneStartIdx = i;
        currentFlat = isFlat[i];
      }
    }
    // Final zone
    zones.push(buildZone(zoneStartIdx, surface_points.length - 1, currentFlat));

    const totalPoints = zones.reduce((s, z) => s + z.points.length, 0);
    const zone3plus2 = zones.filter(z => z.strategy === "3plus2").length;
    const zone5ax = zones.filter(z => z.strategy === "full_5ax").length;
    const totalMRR = zones.reduce((s, z) => s + z.mrr_cm3_min, 0) / Math.max(1, zones.length);

    return {
      zones,
      total_points: totalPoints,
      zone_count_3plus2: zone3plus2,
      zone_count_5ax: zone5ax,
      estimated_mrr_cm3_min: totalMRR,
      blend_transitions: blendTransitions,
    };
  }

  // ==========================================================================
  // STOCHASTIC ANALYSIS
  // ==========================================================================

  /**
   * Monte Carlo tool-axis error propagation analysis.
   *
   * Propagates axis angle uncertainty and position uncertainty through
   * the toolpath to estimate surface quality sensitivity. Uses Box-Muller
   * normal variates for MC sampling.
   *
   * Physics: δ_surface ≈ R × (1 - cos(δθ)) for tilt error,
   * combined with linear position error via RSS.
   *
   * @param input - Stochastic analysis parameters
   * @returns Surface deviation statistics and sensitivity
   */
  stochasticAnalysis(input: FATIStochasticInput): FATIStochasticResult {
    const {
      nominal_points, axis_angle_std_dev_deg,
      position_std_dev_mm, num_samples = 200,
    } = input;

    if (!nominal_points || nominal_points.length === 0) {
      return {
        mean_surface_deviation_mm: 0, std_surface_deviation_mm: 0,
        p95_surface_deviation_mm: 0, tilt_sensitivity_mm_per_deg: 0,
        worst_case_index: 0,
      };
    }

    const angleStdRad = axis_angle_std_dev_deg * Math.PI / 180;
    const toolRadius = 5; // default 10mm tool

    // MC sampling of surface deviations at each point
    const pointDeviations: number[][] = nominal_points.map(() => []);

    for (let s = 0; s < num_samples; s++) {
      for (let i = 0; i < nominal_points.length; i++) {
        // Random axis perturbation
        const dTheta = randn() * angleStdRad;
        const dPhi = randn() * angleStdRad;

        // Surface deviation from tilt error: δ = R × (1 - cos(δθ))
        const tiltDeviation = toolRadius * (1 - Math.cos(Math.sqrt(dTheta * dTheta + dPhi * dPhi)));

        // Position error (RSS)
        const dx = randn() * position_std_dev_mm;
        const dy = randn() * position_std_dev_mm;
        const dz = randn() * position_std_dev_mm;
        const posDeviation = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Combined deviation (RSS of tilt and position components)
        const totalDev = Math.sqrt(tiltDeviation * tiltDeviation + posDeviation * posDeviation);
        pointDeviations[i].push(totalDev);
      }
    }

    // Aggregate statistics
    let maxMean = 0;
    let worstIdx = 0;
    const allDeviations: number[] = [];

    for (let i = 0; i < nominal_points.length; i++) {
      const devs = pointDeviations[i];
      const mean = devs.reduce((a, b) => a + b, 0) / devs.length;
      if (mean > maxMean) {
        maxMean = mean;
        worstIdx = i;
      }
      allDeviations.push(...devs);
    }

    allDeviations.sort((a, b) => a - b);
    const mean = allDeviations.reduce((a, b) => a + b, 0) / allDeviations.length;
    const variance = allDeviations.reduce((s, d) => s + (d - mean) * (d - mean), 0) / allDeviations.length;
    const std = Math.sqrt(variance);
    const p95 = allDeviations[Math.floor(allDeviations.length * 0.95)] || mean + 1.645 * std;

    // Tilt sensitivity: dSurface/dAngle ≈ R × sin(θ) ≈ R × θ for small angles
    const tiltSensitivity = toolRadius * angleStdRad; // mm per rad, convert to per deg
    const tiltSensPerDeg = tiltSensitivity * Math.PI / 180;

    return {
      mean_surface_deviation_mm: mean,
      std_surface_deviation_mm: std,
      p95_surface_deviation_mm: p95,
      tilt_sensitivity_mm_per_deg: tiltSensPerDeg,
      worst_case_index: worstIdx,
    };
  }

  // ==========================================================================
  // UNIFIED CALCULATE METHOD
  // ==========================================================================

  /**
   * Unified calculate entry point for dispatcher integration.
   *
   * @param action - Sub-action name
   * @param params - Action-specific parameters
   * @returns Action result
   */
  calculate(action: string, params: Record<string, any>): any {
    switch (action) {
      case "five_axis_contour":
        return this.contourMill(params as FATIContourInput);
      case "five_axis_port":
        return this.portMachine(params as FATIPortInput);
      case "five_axis_singularity_manage":
        return this.manageSingularities(params as FATISingularityInput);
      case "five_axis_collision_avoid":
        return this.avoidCollisions(params as FATICollisionInput);
      case "five_axis_roughing":
        return this.roughing5Axis(params as FATIRoughingInput);
      case "five_axis_stochastic":
        return this.stochasticAnalysis(params as FATIStochasticInput);
      default:
        return { error: `Unknown five-axis integration action: ${action}` };
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Point-in-polygon test (ray casting algorithm, 2D XY plane).
   */
  private _pointInPolygon(
    px: number, py: number,
    polygon: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of FiveAxisToolpathIntegrationEngine. */
export const fiveAxisToolpathIntegrationEngine = new FiveAxisToolpathIntegrationEngineImpl();
export { FiveAxisToolpathIntegrationEngineImpl as FiveAxisToolpathIntegrationEngine };
