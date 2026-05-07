/**
 * InvoluteGearEngine — U-CADC15 (PHASE-4 Complex Geometry Generation)
 *
 * Generates involute spur-gear tooth profiles and computes canonical gear
 * geometry (pitch, base, tip, root diameters; addendum, dedendum, circular
 * pitch, contact ratio with a mating gear).
 *
 * Formulae (Litvin & Fuentes, "Gear Geometry and Applied Theory" 2004):
 *   - Module-based dimensions (ISO 53, metric):
 *       Pitch diameter    d   = m · z
 *       Base diameter     d_b = d · cos(α)
 *       Addendum          h_a = m
 *       Dedendum          h_d = 1.25 · m   (standard profile-shifted)
 *       Tip diameter      d_a = d + 2·m
 *       Root diameter     d_f = d − 2·1.25·m
 *       Circular pitch    p   = π · m
 *   - Involute curve parametric form:
 *       x(t) = r_b · (cos t + t · sin t)
 *       y(t) = r_b · (sin t − t · cos t)
 *     where r_b is base-circle radius and t is the involute roll angle.
 *   - Involute function:
 *       inv(α) = tan(α) − α
 *   - Tooth half-angle at pitch circle:
 *       θ_p = π / (2·z) + inv(α)
 *
 * Gear standards:
 *   - ISO 53 (20° pressure angle): α = 20° is the global default.
 *   - AGMA 20° full-depth US coarse pitch: diametral pitch P = z/d, related
 *     to module by m = 25.4 / P.
 *
 * @engine InvoluteGearEngine
 * @shortcode E2702
 * @dispatcher cadDispatcher
 * @milestone CAD-COMPLETE-MS0/U-CADC15
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface GearSpec {
  /** Number of teeth z (>= 5). */
  teeth: number;
  /** Module m in mm. */
  module: number;
  /** Pressure angle in degrees. Default 20 (ISO 53). */
  pressureAngleDeg?: number;
  /** Face width in mm (informational, propagated to result). Default 0. */
  faceWidth?: number;
  /** Profile shift coefficient x (default 0). */
  profileShift?: number;
  /** Addendum coefficient h_a* (default 1.0 per ISO 53). */
  addendumCoeff?: number;
  /** Dedendum coefficient h_d* (default 1.25 per ISO 53). */
  dedendumCoeff?: number;
}

export interface GearGeometry {
  teeth: number;
  module: number;
  pressureAngleDeg: number;
  pitchDiameter: number;
  baseDiameter: number;
  tipDiameter: number;
  rootDiameter: number;
  addendum: number;
  dedendum: number;
  circularPitch: number;
  basePitch: number;
  toothThicknessAtPitch: number;
  profileShift: number;
  faceWidth: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface GearToothProfile {
  geometry: GearGeometry;
  /** One full tooth profile (right-flank involute + tip arc + left-flank involute). */
  singleToothProfile: Point2D[];
  /** Complete gear outline, all teeth replicated around the gear center. */
  fullProfile: Point2D[];
  /** Centerline angles of each tooth in radians. */
  toothAngles: number[];
}

export interface ContactRatioResult {
  contactRatio: number;
  centerDistance: number;
  pressureAngleDeg: number;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class InvoluteGearEngine {
  /**
   * Compute canonical gear geometry per ISO 53 with optional profile-shift.
   *
   * @param spec Gear parameters. Teeth ≥ 5, module > 0.
   * @returns All reference diameters + pitch quantities.
   * @throws Error on teeth < 5, module ≤ 0, or pressure angle out of (0°, 45°).
   */
  computeGeometry(spec: GearSpec): GearGeometry {
    this.validateSpec(spec);
    const z = spec.teeth;
    const m = spec.module;
    const alphaDeg = spec.pressureAngleDeg ?? 20;
    const alphaRad = deg2rad(alphaDeg);
    const x = spec.profileShift ?? 0;
    const haStar = spec.addendumCoeff ?? 1.0;
    const hdStar = spec.dedendumCoeff ?? 1.25;

    const pitchDiameter = m * z;
    const baseDiameter = pitchDiameter * Math.cos(alphaRad);
    const addendum = (haStar + x) * m;
    const dedendum = (hdStar - x) * m;
    const tipDiameter = pitchDiameter + 2 * addendum;
    const rootDiameter = pitchDiameter - 2 * dedendum;
    const circularPitch = Math.PI * m;
    const basePitch = circularPitch * Math.cos(alphaRad);
    const toothThicknessAtPitch =
      m * (Math.PI / 2 + 2 * x * Math.tan(alphaRad));

    return {
      teeth: z,
      module: m,
      pressureAngleDeg: alphaDeg,
      pitchDiameter,
      baseDiameter,
      tipDiameter,
      rootDiameter,
      addendum,
      dedendum,
      circularPitch,
      basePitch,
      toothThicknessAtPitch,
      profileShift: x,
      faceWidth: spec.faceWidth ?? 0,
    };
  }

  /**
   * Generate full 2D tooth profile (involute flanks + tip arc + root fillet
   * approximation), replicated around the gear center.
   *
   * @param spec Gear parameters.
   * @param options Sampling controls.
   * @returns Single-tooth + full-gear perimeter coordinates centered at origin.
   */
  generateToothProfile(
    spec: GearSpec,
    options: { samplesPerFlank?: number } = {}
  ): GearToothProfile {
    const geometry = this.computeGeometry(spec);
    const samples = Math.max(5, options.samplesPerFlank ?? 25);
    const alphaRad = deg2rad(geometry.pressureAngleDeg);
    const rb = geometry.baseDiameter / 2;
    const rp = geometry.pitchDiameter / 2;
    const ra = geometry.tipDiameter / 2;
    const rf = Math.max(geometry.rootDiameter / 2, 1e-6);

    const tMax = Math.sqrt((ra / rb) ** 2 - 1);
    const flankRight: Point2D[] = [];
    const tStart = rf > rb ? Math.sqrt((rf / rb) ** 2 - 1) : 0;
    for (let i = 0; i <= samples; i++) {
      const t = tStart + (tMax - tStart) * (i / samples);
      flankRight.push({
        x: rb * (Math.cos(t) + t * Math.sin(t)),
        y: rb * (Math.sin(t) - t * Math.cos(t)),
      });
    }

    // Half tooth thickness angle at the pitch circle.
    const toothHalfAngle =
      Math.PI / (2 * geometry.teeth) + involute(alphaRad) +
      (2 * geometry.profileShift * Math.tan(alphaRad)) / geometry.teeth;

    // Rotate right flank so pitch-circle intersection sits at +toothHalfAngle
    // above the tooth centerline (centerline = x-axis).
    const flankPitchAngle = this.angleOfPointOnFlank(flankRight, rp);
    const offset = toothHalfAngle - flankPitchAngle;
    const rightRotated = flankRight.map((p) => rotatePoint(p, offset));

    // Mirror across tooth centerline (x-axis) to produce left flank.
    const leftMirrored = rightRotated.map((p) => ({ x: p.x, y: -p.y }));

    // Tip arc connects right-flank tip to left-flank tip.
    const tipArcSamples = Math.max(5, Math.round(samples / 2));
    const rightTip = rightRotated[rightRotated.length - 1]!;
    const leftTip = leftMirrored[leftMirrored.length - 1]!;
    const rightTipAngle = Math.atan2(rightTip.y, rightTip.x);
    const leftTipAngle = Math.atan2(leftTip.y, leftTip.x);
    const tipArc: Point2D[] = [];
    for (let i = 1; i < tipArcSamples; i++) {
      const t = i / tipArcSamples;
      const theta = rightTipAngle + (leftTipAngle - rightTipAngle) * t;
      tipArc.push({ x: ra * Math.cos(theta), y: ra * Math.sin(theta) });
    }

    // Single tooth: right flank root→tip + tip arc + left flank tip→root (reversed)
    const singleToothProfile: Point2D[] = [
      ...rightRotated,
      ...tipArc,
      ...leftMirrored.slice().reverse(),
    ];

    // Replicate around the gear.
    const toothAngles: number[] = [];
    const fullProfile: Point2D[] = [];
    const toothPitchAngle = (2 * Math.PI) / geometry.teeth;
    for (let k = 0; k < geometry.teeth; k++) {
      const angle = k * toothPitchAngle;
      toothAngles.push(angle);
      for (const p of singleToothProfile) {
        fullProfile.push(rotatePoint(p, angle));
      }
    }

    return {
      geometry,
      singleToothProfile,
      fullProfile,
      toothAngles,
    };
  }

  /**
   * Contact ratio for a standard external spur gear mesh (ISO/AGMA).
   *
   * ε = sqrt(r_a1² − r_b1²) + sqrt(r_a2² − r_b2²) − C·sin(α)
   *     ────────────────────────────────────────────────────
   *                     p_b
   *
   * where p_b is base pitch (same for both gears), C is center distance,
   * r_a the tip radius, r_b the base radius.
   *
   * @throws Error if modules or pressure angles differ between the two gears.
   */
  computeContactRatio(gear1: GearSpec, gear2: GearSpec): ContactRatioResult {
    const g1 = this.computeGeometry(gear1);
    const g2 = this.computeGeometry(gear2);
    if (Math.abs(g1.module - g2.module) > 1e-9) {
      throw new Error(
        `Mesh requires equal modules (got ${g1.module} and ${g2.module})`
      );
    }
    if (Math.abs(g1.pressureAngleDeg - g2.pressureAngleDeg) > 1e-9) {
      throw new Error(
        `Mesh requires equal pressure angles (got ${g1.pressureAngleDeg}° and ${g2.pressureAngleDeg}°)`
      );
    }
    const ra1 = g1.tipDiameter / 2;
    const rb1 = g1.baseDiameter / 2;
    const ra2 = g2.tipDiameter / 2;
    const rb2 = g2.baseDiameter / 2;
    const centerDistance = (g1.pitchDiameter + g2.pitchDiameter) / 2;
    const alphaRad = deg2rad(g1.pressureAngleDeg);
    const numerator =
      Math.sqrt(ra1 * ra1 - rb1 * rb1) +
      Math.sqrt(ra2 * ra2 - rb2 * rb2) -
      centerDistance * Math.sin(alphaRad);
    const contactRatio = numerator / g1.basePitch;

    return {
      contactRatio,
      centerDistance,
      pressureAngleDeg: g1.pressureAngleDeg,
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private validateSpec(spec: GearSpec): void {
    if (!(spec.teeth >= 5)) {
      throw new Error(`teeth must be ≥ 5 (got ${spec.teeth})`);
    }
    if (!Number.isInteger(spec.teeth)) {
      throw new Error(`teeth must be an integer (got ${spec.teeth})`);
    }
    if (!(spec.module > 0)) {
      throw new Error(`module must be > 0 (got ${spec.module})`);
    }
    const alpha = spec.pressureAngleDeg ?? 20;
    if (!(alpha > 0 && alpha < 45)) {
      throw new Error(
        `pressureAngleDeg must be in (0°, 45°) (got ${alpha}°)`
      );
    }
  }

  private angleOfPointOnFlank(flank: Point2D[], targetRadius: number): number {
    let bestIndex = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < flank.length; i++) {
      const p = flank[i]!;
      const r = Math.hypot(p.x, p.y);
      const diff = Math.abs(r - targetRadius);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }
    const p = flank[bestIndex]!;
    return Math.atan2(p.y, p.x);
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function involute(alpha: number): number {
  return Math.tan(alpha) - alpha;
}

function rotatePoint(p: Point2D, angle: number): Point2D {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

// ── Singleton Export ──────────────────────────────────────────────────────

export const involuteGearEngine = new InvoluteGearEngine();
