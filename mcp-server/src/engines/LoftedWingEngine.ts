/**
 * LoftedWingEngine — U-CADC14 (PHASE-4 Complex Geometry Generation)
 *
 * Builds 3D wing geometry by lofting airfoil sections along a span with
 * configurable twist, taper, sweep, and dihedral. Outputs ribbed sections
 * (for CAD lofting) plus derived aerodynamic-geometry quantities.
 *
 * Coverage:
 *   - Straight, tapered, swept, dihedral, and washout wings from 2+ NACA
 *     profiles (or user-supplied Selig-format coordinate stacks).
 *   - Cosine spanwise clustering for CFD panel-method consumers.
 *   - Derived geometry: planform area, aspect ratio, mean aerodynamic chord,
 *     reference chord, taper ratio, quarter-chord sweep, wetted span.
 *
 * Formulae & references:
 *   - MAC (tapered trapezoidal wing, Raymer Aircraft Design §7.3):
 *       MAC = (2/3) · c_root · (1 + λ + λ²) / (1 + λ)      where λ = c_tip / c_root
 *   - Planform area (trapezoidal):
 *       S = 0.5 · b · (c_root + c_tip)
 *   - Aspect ratio:
 *       AR = b² / S
 *   - Spanwise cosine clustering (Schrenk lift-distribution approximation):
 *       y_i / (b/2) = 0.5 · (1 − cos(π · i / N))
 *   - Linear twist (washout) between root and tip, with optional jig-shape
 *     offset applied at the quarter-chord axis.
 *
 * Deliberately does NOT call NACAAirfoilEngine directly — callers pass
 * already-generated AirfoilProfile sections so this engine stays orthogonal
 * and testable against arbitrary coordinate sources (UIUC .dat imports,
 * custom CFD-optimized profiles, etc.).
 *
 * @engine LoftedWingEngine
 * @shortcode E2701
 * @dispatcher cadDispatcher
 * @milestone CAD-COMPLETE-MS0/U-CADC14
 */

import type { AirfoilProfile, Point2D } from "./NACAAirfoilEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WingSection {
  /** Profile sampled in normalized chord coordinates (airfoil local frame). */
  profile: AirfoilProfile;
  /** Spanwise station y ∈ [0, b/2] in meters (half-span from root). */
  station: number;
  /** Chord length at this station in meters. */
  chord: number;
  /** Local twist angle in radians (positive nose-up about quarter-chord axis). */
  twistRad: number;
  /** Quarter-chord x offset due to sweep, in meters. */
  sweepOffset: number;
  /** Vertical z offset due to dihedral, in meters. */
  dihedralOffset: number;
}

export interface LoftedWingResult {
  sections: WingSection[];
  /** 3D perimeter of each section (upper+lower concatenated) transformed
   *  into wing-frame coordinates {x: chordwise, y: spanwise, z: vertical}. */
  ribs3D: Array<Array<Point3D>>;
  planformArea: number;
  aspectRatio: number;
  meanAerodynamicChord: number;
  referenceChord: number;
  taperRatio: number;
  quarterChordSweepDeg: number;
  dihedralDeg: number;
  halfSpan: number;
  twistDistributionDeg: number[];
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface LoftOptions {
  /** Half-span (tip-to-root distance), meters. Required. */
  halfSpan: number;
  /** Root chord, meters. Required. */
  rootChord: number;
  /** Tip chord, meters. Required. Taper ratio = tipChord / rootChord. */
  tipChord: number;
  /** Quarter-chord sweep angle in degrees (leading-edge back-sweep positive). */
  quarterChordSweepDeg?: number;
  /** Dihedral angle in degrees (positive raises tip above root). */
  dihedralDeg?: number;
  /** Linear twist applied tip-to-root in degrees (washout is negative). */
  tipTwistDeg?: number;
  /** Root twist in degrees (default 0). */
  rootTwistDeg?: number;
  /** Number of spanwise stations including root and tip. Default 11. */
  numStations?: number;
  /** Use cosine spanwise clustering. Default true. */
  cosineSpanwise?: boolean;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class LoftedWingEngine {
  /**
   * Loft a single-profile wing by scaling one airfoil across all stations.
   * Twist is linearly interpolated between root and tip.
   *
   * @param profile Normalized airfoil (chord ≈ 1) to use at every station.
   * @param options Wing geometry parameters.
   * @returns Lofted wing with 3D ribs and aerodynamic-geometry properties.
   * @throws Error if halfSpan, rootChord, or tipChord is non-positive, or if
   *         numStations < 2.
   */
  loftSingleProfile(
    profile: AirfoilProfile,
    options: LoftOptions
  ): LoftedWingResult {
    this.validateOptions(options);
    const numStations = Math.max(2, options.numStations ?? 11);
    const ys = this.spanwiseStations(numStations, options.halfSpan, options.cosineSpanwise ?? true);
    const sections: WingSection[] = ys.map((y) => this.buildSection(profile, y, options));
    return this.assembleResult(sections, options);
  }

  /**
   * Loft a wing by interpolating between a root and tip airfoil profile.
   * The profiles need not have the same point count; they are resampled on a
   * shared x/c grid before blending with a linear weight along the span.
   *
   * @param rootProfile Airfoil at the root station (y=0).
   * @param tipProfile Airfoil at the tip station (y=halfSpan).
   * @param options Wing geometry parameters.
   * @throws Error if either profile has fewer than 3 points per surface.
   */
  loftBetweenProfiles(
    rootProfile: AirfoilProfile,
    tipProfile: AirfoilProfile,
    options: LoftOptions
  ): LoftedWingResult {
    this.validateOptions(options);
    if (rootProfile.upper.length < 3 || tipProfile.upper.length < 3) {
      throw new Error(
        `Root/tip profiles must each have ≥3 upper-surface points (got root=${rootProfile.upper.length}, tip=${tipProfile.upper.length})`
      );
    }
    const numStations = Math.max(2, options.numStations ?? 11);
    const ys = this.spanwiseStations(numStations, options.halfSpan, options.cosineSpanwise ?? true);

    const sections: WingSection[] = ys.map((y) => {
      const weight = options.halfSpan === 0 ? 0 : y / options.halfSpan;
      const blended = this.blendProfiles(rootProfile, tipProfile, weight);
      return this.buildSection(blended, y, options);
    });

    return this.assembleResult(sections, options);
  }

  /**
   * Compute aerodynamic-geometry metrics for an arbitrary wing description
   * without re-lofting. Useful when the caller has hand-built sections.
   *
   * @param sections Ordered spanwise sections (root→tip).
   * @returns Same metrics as the loft methods.
   */
  computeWingProperties(sections: WingSection[]): Omit<LoftedWingResult, "ribs3D" | "sections" | "twistDistributionDeg"> {
    if (sections.length < 2) {
      throw new Error("Need ≥2 sections to compute wing properties");
    }
    const root = sections[0]!;
    const tip = sections[sections.length - 1]!;
    const halfSpan = tip.station - root.station;
    const planformArea = this.trapezoidalArea(sections);
    const referenceChord = (root.chord + tip.chord) / 2;
    const taperRatio = root.chord === 0 ? 0 : tip.chord / root.chord;
    const mac = this.meanAerodynamicChord(root.chord, tip.chord);
    const aspectRatio = planformArea === 0 ? 0 : (2 * halfSpan) ** 2 / (2 * planformArea);
    const sweepDeg = this.quarterChordSweepDeg(root, tip, halfSpan);
    const dihedralDeg = this.dihedralFromSections(root, tip, halfSpan);

    return {
      planformArea: 2 * planformArea, // full wing (both halves)
      aspectRatio,
      meanAerodynamicChord: mac,
      referenceChord,
      taperRatio,
      quarterChordSweepDeg: sweepDeg,
      dihedralDeg,
      halfSpan,
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private validateOptions(options: LoftOptions): void {
    if (!(options.halfSpan > 0)) {
      throw new Error(`halfSpan must be > 0 (got ${options.halfSpan})`);
    }
    if (!(options.rootChord > 0)) {
      throw new Error(`rootChord must be > 0 (got ${options.rootChord})`);
    }
    if (!(options.tipChord > 0)) {
      throw new Error(`tipChord must be > 0 (got ${options.tipChord})`);
    }
  }

  private spanwiseStations(n: number, halfSpan: number, cosine: boolean): number[] {
    const stations: number[] = [];
    if (cosine) {
      for (let i = 0; i < n; i++) {
        stations.push(halfSpan * 0.5 * (1 - Math.cos((Math.PI * i) / (n - 1))));
      }
    } else {
      for (let i = 0; i < n; i++) stations.push((halfSpan * i) / (n - 1));
    }
    return stations;
  }

  private buildSection(
    profile: AirfoilProfile,
    station: number,
    options: LoftOptions
  ): WingSection {
    const span = options.halfSpan;
    const weight = span === 0 ? 0 : station / span;
    const chord =
      options.rootChord + (options.tipChord - options.rootChord) * weight;
    const rootTwist = deg2rad(options.rootTwistDeg ?? 0);
    const tipTwist = deg2rad(options.tipTwistDeg ?? 0);
    const twistRad = rootTwist + (tipTwist - rootTwist) * weight;
    const sweepRad = deg2rad(options.quarterChordSweepDeg ?? 0);
    const dihedralRad = deg2rad(options.dihedralDeg ?? 0);
    // Interpret quarterChordSweepDeg as the quarter-chord axis sweep angle.
    // At station y with local chord c(y), the LE offset must satisfy:
    //   QC_x(y) − QC_x(root) = y · tan(sweepDeg)
    //   (sweepOffset + 0.25·c(y)) − (0 + 0.25·rootChord) = y · tan(sweepDeg)
    // → sweepOffset = y · tan(sweepDeg) − 0.25·(c(y) − rootChord)
    const sweepOffset = station * Math.tan(sweepRad) - 0.25 * (chord - options.rootChord);
    const dihedralOffset = station * Math.tan(dihedralRad);

    // Store the profile scaled to local chord so ribs3D reflects physical size.
    const scaled = scaleProfile(profile, chord / Math.max(profile.chord, 1e-12));
    return {
      profile: scaled,
      station,
      chord,
      twistRad,
      sweepOffset,
      dihedralOffset,
    };
  }

  private assembleResult(sections: WingSection[], options: LoftOptions): LoftedWingResult {
    const ribs3D = sections.map((s) => this.sectionTo3D(s));
    const props = this.computeWingProperties(sections);
    const twistDistributionDeg = sections.map((s) => rad2deg(s.twistRad));
    return {
      sections,
      ribs3D,
      twistDistributionDeg,
      ...props,
    };
  }

  private sectionTo3D(section: WingSection): Point3D[] {
    const cosT = Math.cos(section.twistRad);
    const sinT = Math.sin(section.twistRad);
    // Rotate profile about quarter-chord axis (standard aerodynamics
    // convention): use x - 0.25·c as the pitch axis.
    const pitchAxisX = 0.25 * section.chord;
    return section.profile.selig.map((p) => {
      const xLocal = p.x - pitchAxisX;
      const zLocal = p.y;
      const xRot = xLocal * cosT - zLocal * sinT;
      const zRot = xLocal * sinT + zLocal * cosT;
      return {
        x: xRot + pitchAxisX + section.sweepOffset,
        y: section.station,
        z: zRot + section.dihedralOffset,
      };
    });
  }

  /**
   * Trapezoidal area integrator over spanwise sections (half-wing).
   *
   * A_half = Σ 0.5 · (c_i + c_{i+1}) · (y_{i+1} − y_i)
   */
  private trapezoidalArea(sections: WingSection[]): number {
    let area = 0;
    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1]!;
      const cur = sections[i]!;
      area += 0.5 * (prev.chord + cur.chord) * (cur.station - prev.station);
    }
    return area;
  }

  /**
   * MAC for tapered trapezoidal wing per Raymer §7.3:
   *   MAC = (2/3) · c_root · (1 + λ + λ²) / (1 + λ)
   */
  private meanAerodynamicChord(rootChord: number, tipChord: number): number {
    if (rootChord === 0) return 0;
    const lambda = tipChord / rootChord;
    return (2 / 3) * rootChord * (1 + lambda + lambda * lambda) / (1 + lambda);
  }

  private quarterChordSweepDeg(
    root: WingSection,
    tip: WingSection,
    halfSpan: number
  ): number {
    if (halfSpan === 0) return 0;
    // Quarter-chord x moves by (tip.sweepOffset + 0.25·c_tip) − (root.sweepOffset + 0.25·c_root)
    const deltaX =
      tip.sweepOffset + 0.25 * tip.chord - (root.sweepOffset + 0.25 * root.chord);
    return rad2deg(Math.atan2(deltaX, halfSpan));
  }

  private dihedralFromSections(
    root: WingSection,
    tip: WingSection,
    halfSpan: number
  ): number {
    if (halfSpan === 0) return 0;
    return rad2deg(Math.atan2(tip.dihedralOffset - root.dihedralOffset, halfSpan));
  }

  /**
   * Linear blend of two profiles by resampling both onto the root profile's
   * x/c grid, then interpolating y-values at each station.
   */
  private blendProfiles(
    a: AirfoilProfile,
    b: AirfoilProfile,
    weight: number
  ): AirfoilProfile {
    const clampedW = Math.min(Math.max(weight, 0), 1);
    // Resample b onto a's upper-surface x-values using linear interpolation.
    const upper = a.upper.map((pa, index) => {
      const bInterp = interpY(b.upper, pa.x);
      const bY = bInterp ?? b.upper[index]?.y ?? pa.y;
      return { x: pa.x, y: pa.y * (1 - clampedW) + bY * clampedW };
    });
    const lower = a.lower.map((pa, index) => {
      const bInterp = interpY(b.lower, pa.x);
      const bY = bInterp ?? b.lower[index]?.y ?? pa.y;
      return { x: pa.x, y: pa.y * (1 - clampedW) + bY * clampedW };
    });
    const selig = [...upper].reverse().concat(lower.slice(1));
    return {
      name: `${a.name}↔${b.name}@${clampedW.toFixed(2)}`,
      maxCamber: a.maxCamber * (1 - clampedW) + b.maxCamber * clampedW,
      maxCamberPosition:
        a.maxCamberPosition * (1 - clampedW) + b.maxCamberPosition * clampedW,
      maxThickness: a.maxThickness * (1 - clampedW) + b.maxThickness * clampedW,
      upper,
      lower,
      selig,
      chord: a.chord * (1 - clampedW) + b.chord * clampedW,
    };
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function scaleProfile(profile: AirfoilProfile, factor: number): AirfoilProfile {
  const scalePt = (p: Point2D): Point2D => ({ x: p.x * factor, y: p.y * factor });
  return {
    name: profile.name,
    maxCamber: profile.maxCamber,
    maxCamberPosition: profile.maxCamberPosition,
    maxThickness: profile.maxThickness,
    upper: profile.upper.map(scalePt),
    lower: profile.lower.map(scalePt),
    selig: profile.selig.map(scalePt),
    chord: profile.chord * factor,
  };
}

function interpY(points: Point2D[], targetX: number): number | null {
  if (points.length < 2) return null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if ((a.x <= targetX && targetX <= b.x) || (b.x <= targetX && targetX <= a.x)) {
      const denominator = b.x - a.x;
      if (denominator === 0) return a.y;
      const t = (targetX - a.x) / denominator;
      return a.y + t * (b.y - a.y);
    }
  }
  return null;
}

// ── Singleton Export ──────────────────────────────────────────────────────

export const loftedWingEngine = new LoftedWingEngine();
