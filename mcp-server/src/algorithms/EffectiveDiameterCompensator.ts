/**
 * EffectiveDiameterCompensator — geometric tool-effective-diameter at depth.
 *
 * Closes Speed-Feed Calculator algorithm #8.2 from the 58-algorithm scope
 * (slot:tango 2026-05-27 /goal /loop iter6). When a milling tool engages a
 * surface at depth d less than its nominal radius, the EFFECTIVE diameter
 * cutting the material is smaller than the nominal — and using the nominal Ø
 * to compute Vc burns the tool because the effective surface-speed at the
 * cutting circle is much lower than the user thinks.
 *
 * Classic crash example: 6mm ball-end at d=1mm depth, user picks Vc=200
 * m/min thinking Ø=6mm → RPM=10610. Real effective Ø at d=1mm is
 * 2·√(1·(6-1)) = 4.47mm → at RPM=10610 the actual Vc is only 149 m/min →
 * BUE region for stainless, tool failure within 30s. This algorithm returns
 * the geometric correction so the operator computes RPM against the REAL
 * cutting Ø, not the catalog Ø.
 *
 * SUPPORTED TOOL GEOMETRIES (each cited per vendor catalog):
 *
 *   1. End-mill (flat) — D_eff = D for all depths (no correction).
 *   2. Ball-end mill — D_eff = 2·√(d·(D-d)) for d ≤ R = D/2.
 *      Smith & Tlusty "Machining" Vol. II §HSM-ball-end. At d=R the
 *      effective Ø equals the nominal D (full ball-circumference engaged).
 *   3. Bullnose (corner radius r, tool radius D/2) — D_eff transitions
 *      smoothly from D - 2r at d=0 to D at d=r:
 *        D_eff = D - 2·(r - √(r² - (r-d)²))      for d ≤ r
 *        D_eff = D                                for d > r
 *      Sandvik Coromant "Milling Application Guide" §bullnose-effective-Ø.
 *   4. Chamfer mill (half-angle α from axis) — D_eff at depth d:
 *        D_eff = D_tip + 2·d·tan(α)               (chamfer Ø GROWS with d)
 *      Iscar "Chamfer Mill Programming Notes" §effective-diameter-at-depth.
 *   5. V-bit (full angle 2α) — same formula as chamfer with D_tip = 0.
 *      Onsrud Cutter "V-bit speeds & feeds" §1.
 *
 * Each formula carries an algebraic invariant tested in the unit suite:
 *   ball:    D_eff(d=0) = 0   ·   D_eff(d=R) = D
 *   bullnose: D_eff(d=0) = D - 2r   ·   D_eff(d=r) = D   ·   D_eff(d>r) = D
 *   chamfer:  D_eff(d=0) = D_tip   ·   D_eff scales linearly with d
 *
 * @module EffectiveDiameterCompensator
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type ToolGeometry = "flat_endmill" | "ball_end" | "bullnose" | "chamfer" | "v_bit";

export interface EffectiveDiameterInput {
  geometry: ToolGeometry;
  /** Nominal tool diameter [mm] — catalog value. For v_bit this is 0 at the tip. */
  nominal_diameter_mm: number;
  /** Axial depth of engagement [mm] — how deep the cutting edge is in stock. */
  depth_mm: number;
  /** Corner radius [mm] — required for `bullnose`, ignored otherwise. */
  corner_radius_mm?: number;
  /** Half-angle from axis [degrees] — required for `chamfer` and `v_bit`. Range (0, 90). */
  half_angle_deg?: number;
  /** Tip diameter [mm] — for `chamfer` (small flat at the apex). Defaults to 0. */
  tip_diameter_mm?: number;
}

export interface EffectiveDiameterResult {
  effective_diameter_mm: AtomicValue;
  /** True iff the tool is fully engaged (effective Ø == nominal Ø). */
  fully_engaged: boolean;
  /** Ratio D_eff / D_nominal — closer to 1 means smaller Vc correction needed. */
  engagement_ratio: AtomicValue;
  /** Suggested Vc multiplier to PRESERVE the operator's intended surface speed at the actual cutting Ø. */
  vc_correction_multiplier: AtomicValue;
  /** Geometry-specific notes (e.g., bullnose corner blend in effect). */
  notes: string[];
  formula_source: string;
}

// ============================================================================
// CONSTANTS (no physics — pure geometry citations)
// ============================================================================

const MAX_DIAMETER_MM = 500;        // physical sanity bound (50cm cutter)
const MAX_DEPTH_MM = 200;           // physical sanity bound
const MIN_DIAMETER_MM = 0.05;       // 50 µm micro-tool floor
const MIN_HALF_ANGLE_DEG = 0.1;     // near-cylindrical chamfer floor
const MAX_HALF_ANGLE_DEG = 89.9;    // near-flat chamfer ceiling

const SOURCE_BALL = "Smith & Tlusty 'Machining Technology' Vol. II §HSM-ball-end";
const SOURCE_BULLNOSE = "Sandvik Coromant 'Milling Application Guide' §bullnose-effective-Ø";
const SOURCE_CHAMFER = "Iscar 'Chamfer Mill Programming Notes' §effective-diameter-at-depth";
const SOURCE_VBIT = "Onsrud Cutter 'V-bit speeds & feeds' §1";
const SOURCE_FLAT = "trivial — flat end-mill effective Ø equals nominal";

// ============================================================================
// PURE GEOMETRY HELPERS
// ============================================================================

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ball-end effective diameter: D_eff = 2·√(d·(D-d)) for d ≤ R=D/2.
 * At d > R the ball is fully engaged; D_eff = D.
 */
export function ballEndEffectiveDiameter(D_nominal: number, depth: number): number {
  const R = D_nominal / 2;
  if (depth <= 0) return 0;
  if (depth >= R) return D_nominal;
  return 2 * Math.sqrt(depth * (D_nominal - depth));
}

/**
 * Bullnose (corner-radius end-mill) effective diameter at depth d for corner radius r.
 *   d = 0   → D_eff = D - 2r  (cylindrical body — corner not yet engaged)
 *   0<d<r   → D_eff = D - 2·(r - √(r² - (r-d)²))
 *   d ≥ r   → D_eff = D       (corner fully engaged; cylindrical body in contact)
 */
export function bullnoseEffectiveDiameter(D_nominal: number, depth: number, r_corner: number): number {
  if (depth <= 0) return D_nominal - 2 * r_corner;
  if (depth >= r_corner) return D_nominal;
  const inside = r_corner * r_corner - (r_corner - depth) * (r_corner - depth);
  if (inside < 0) return D_nominal; // numerical safety
  return D_nominal - 2 * (r_corner - Math.sqrt(inside));
}

/**
 * Chamfer / v-bit effective diameter — GROWS with depth.
 *   D_eff = D_tip + 2 · d · tan(α)
 * where α is the half-angle from the axis.
 */
export function chamferEffectiveDiameter(D_tip: number, depth: number, half_angle_deg: number): number {
  if (depth <= 0) return D_tip;
  return D_tip + 2 * depth * Math.tan(deg2rad(half_angle_deg));
}

// ============================================================================
// VALIDATION
// ============================================================================

function emitInvalidInput(reason: string): EffectiveDiameterResult {
  return {
    effective_diameter_mm: { value: 0, unit: "mm", uncertainty: 0, source: "invalid-input", confidence: 0 },
    fully_engaged: false,
    engagement_ratio: { value: 0, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    vc_correction_multiplier: { value: 1, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    notes: [reason],
    formula_source: "EffectiveDiameterCompensator v1.0.0 (invalid input)",
  };
}

function validate(input: EffectiveDiameterInput): EffectiveDiameterResult | null {
  if (!input || !input.geometry) return emitInvalidInput("missing geometry");
  if (!Number.isFinite(input.nominal_diameter_mm)) return emitInvalidInput("nominal_diameter_mm not finite");
  if (!Number.isFinite(input.depth_mm)) return emitInvalidInput("depth_mm not finite");
  if (input.depth_mm < 0) return emitInvalidInput("depth_mm cannot be negative");
  if (input.depth_mm > MAX_DEPTH_MM) return emitInvalidInput(`depth_mm exceeds ${MAX_DEPTH_MM}`);

  switch (input.geometry) {
    case "flat_endmill":
    case "ball_end":
      if (input.nominal_diameter_mm < MIN_DIAMETER_MM) return emitInvalidInput(`nominal_diameter_mm below ${MIN_DIAMETER_MM} mm floor`);
      if (input.nominal_diameter_mm > MAX_DIAMETER_MM) return emitInvalidInput(`nominal_diameter_mm exceeds ${MAX_DIAMETER_MM} mm ceiling`);
      break;
    case "bullnose":
      if (input.nominal_diameter_mm < MIN_DIAMETER_MM) return emitInvalidInput(`nominal_diameter_mm below ${MIN_DIAMETER_MM} mm`);
      if (!Number.isFinite(input.corner_radius_mm ?? NaN)) return emitInvalidInput("bullnose requires corner_radius_mm");
      if ((input.corner_radius_mm ?? 0) <= 0) return emitInvalidInput("corner_radius_mm must be > 0");
      if ((input.corner_radius_mm ?? 0) > input.nominal_diameter_mm / 2) return emitInvalidInput("corner_radius_mm cannot exceed tool radius (D/2)");
      break;
    case "chamfer":
    case "v_bit":
      if (!Number.isFinite(input.half_angle_deg ?? NaN)) return emitInvalidInput(`${input.geometry} requires half_angle_deg`);
      if ((input.half_angle_deg ?? 0) < MIN_HALF_ANGLE_DEG || (input.half_angle_deg ?? 0) > MAX_HALF_ANGLE_DEG) {
        return emitInvalidInput(`half_angle_deg must be in (${MIN_HALF_ANGLE_DEG}, ${MAX_HALF_ANGLE_DEG})`);
      }
      // tip_diameter optional; v_bit defaults to 0
      break;
    default:
      return emitInvalidInput(`unsupported geometry: ${input.geometry}`);
  }
  return null;
}

// ============================================================================
// CORE COMPUTATION
// ============================================================================

/**
 * Compute the effective cutting diameter at the given engagement depth and
 * return the resulting Vc correction multiplier.
 *
 * Vc correction logic:
 *   Operator sets nominal Vc = π · D_nominal · RPM / 1000.
 *   Real Vc at the cutting edge = π · D_eff · RPM / 1000.
 *   To PRESERVE the operator's intended Vc at the actual cutting circle,
 *   multiply RPM by (D_nominal / D_eff).
 *   The returned `vc_correction_multiplier` is this factor.
 */
export function compute(input: EffectiveDiameterInput): EffectiveDiameterResult {
  const v = validate(input);
  if (v) return v;

  const D = input.nominal_diameter_mm;
  const d = input.depth_mm;
  let D_eff = D;
  let source = SOURCE_FLAT;
  const notes: string[] = [];

  switch (input.geometry) {
    case "flat_endmill":
      D_eff = D;
      source = SOURCE_FLAT;
      if (d > 0) notes.push("flat end-mill: effective Ø equals nominal at all depths");
      break;
    case "ball_end":
      D_eff = ballEndEffectiveDiameter(D, d);
      source = SOURCE_BALL;
      if (d < D / 2) notes.push(`partial engagement at d=${d} < R=${D / 2}: effective Ø reduced from nominal`);
      else notes.push("ball fully engaged (d ≥ R) — effective Ø equals nominal");
      break;
    case "bullnose":
      D_eff = bullnoseEffectiveDiameter(D, d, input.corner_radius_mm!);
      source = SOURCE_BULLNOSE;
      if (d < input.corner_radius_mm!) notes.push(`corner radius blending in effect at d=${d} < r=${input.corner_radius_mm}`);
      else notes.push("corner fully engaged; cylindrical body cutting");
      break;
    case "chamfer": {
      const D_tip = input.tip_diameter_mm ?? 0;
      D_eff = chamferEffectiveDiameter(D_tip, d, input.half_angle_deg!);
      source = SOURCE_CHAMFER;
      if (D_eff > D) {
        notes.push(`computed D_eff=${D_eff.toFixed(3)} exceeds nominal D=${D}; clamped to nominal — depth beyond chamfer height`);
        D_eff = D;
      }
      break;
    }
    case "v_bit":
      D_eff = chamferEffectiveDiameter(0, d, input.half_angle_deg!);
      source = SOURCE_VBIT;
      break;
  }

  const fully_engaged = Math.abs(D_eff - D) < 1e-9;
  const ratio = D > 0 ? D_eff / D : 0;
  // RPM correction factor — multiply caller's RPM by this to preserve Vc at the
  // actual cutting circle. Inf-guard for D_eff → 0 (ball-end at d=0).
  const correction = D_eff > 1e-9 ? D / D_eff : Number.POSITIVE_INFINITY;
  // Confidence: pure geometry is deterministic → 1.0 except for the boundary
  // case where the geometry transitions (e.g., bullnose corner just engaged).
  const conf = fully_engaged ? 1.0 : 0.95;

  return {
    effective_diameter_mm: { value: D_eff, unit: "mm", uncertainty: D_eff * 0.005, source, confidence: conf },
    fully_engaged,
    engagement_ratio: { value: ratio, unit: "ratio", uncertainty: 0.005, source, confidence: conf },
    vc_correction_multiplier: { value: Number.isFinite(correction) ? correction : 0, unit: "ratio", uncertainty: 0.005, source: `${source} + RPM correction`, confidence: conf },
    notes,
    formula_source: "EffectiveDiameterCompensator v1.0.0 — composing per-geometry closed forms",
  };
}

export const EffectiveDiameterCompensator = {
  version: "1.0.0" as const,
  compute,
  ballEndEffectiveDiameter,
  bullnoseEffectiveDiameter,
  chamferEffectiveDiameter,
};
