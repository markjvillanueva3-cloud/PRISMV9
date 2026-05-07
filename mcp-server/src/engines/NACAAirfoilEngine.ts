/**
 * NACAAirfoilEngine — U-CADC13 (PHASE-4 Complex Geometry Generation)
 *
 * Generates airfoil coordinates for aerospace-grade CAD using canonical
 * NACA formulae and the UIUC airfoil database .dat format.
 *
 * Coverage:
 *   - NACA 4-digit series (e.g. 2412, 0012): maximum camber, location of max
 *     camber, maximum thickness.
 *   - NACA 5-digit series (e.g. 23012): design-lift coefficient, position of
 *     max camber, reflex/standard, thickness.
 *   - Parses experimental-data .dat files from the UIUC Airfoil Coordinates
 *     Database (Selig format: name + x/c y/c coordinate pairs).
 *
 * Formulae (Abbott & von Doenhoff, Theory of Wing Sections, 1959):
 *   Thickness distribution (closed trailing edge, a₄ = -0.1036):
 *     y_t(x) = (t/0.2) * (0.2969√x − 0.1260x − 0.3516x² + 0.2843x³ − 0.1036x⁴)
 *   Thickness distribution (open trailing edge, a₄ = -0.1015):
 *     y_t(x) = (t/0.2) * (0.2969√x − 0.1260x − 0.3516x² + 0.2843x³ − 0.1015x⁴)
 *   Camber line (4-digit, x ≤ p):
 *     y_c = (m/p²) * (2p·x − x²)
 *   Camber line (4-digit, x > p):
 *     y_c = (m/(1-p)²) * (1 − 2p + 2p·x − x²)
 *
 * Where t = max thickness, m = max camber, p = position of max camber, all
 * normalized to chord length c ∈ [0,1].
 *
 * Point distribution uses cosine clustering to densify leading-edge
 * resolution (standard for CFD/CAD consumers):
 *     x_i = 0.5 · (1 − cos(π·i/N))
 *
 * @engine NACAAirfoilEngine
 * @shortcode E2700
 * @dispatcher cadDispatcher
 * @milestone CAD-COMPLETE-MS0/U-CADC13
 */

// ── Constants ──────────────────────────────────────────────────────────────

/**
 * NACA thickness polynomial coefficients (Abbott & von Doenhoff §6.5).
 * a₀..a₃ are universal; a₄ = -0.1036 gives a closed (zero-thickness) trailing
 * edge, a₄ = -0.1015 leaves a small open gap (original NACA specification).
 */
const NACA_THICKNESS_COEFFS = {
  a0: 0.2969,
  a1: -0.1260,
  a2: -0.3516,
  a3: 0.2843,
  a4Closed: -0.1036,
  a4Open: -0.1015,
} as const;

/**
 * NACA 5-digit camber-line constants from Jacobs & Pinkerton (NACA TR-537,
 * 1935). The first digit encodes design-lift coefficient (Cl = 0.15 × digit),
 * the second-third encode 2 × position of max camber in percent chord, the
 * last two are maximum thickness.
 */
interface Naca5CamberParams {
  m: number; // transformed camber position
  k1: number; // forward-loading factor
  k2OverK1?: number; // reflex (only for reflexed airfoils)
}

/**
 * Lookup table for NACA 5-digit camber parameters (Abbott §6.5 Table 6.2 +
 * NACA TR-537). Index by "LPQ" where L=lift-coefficient tag (always 2 for
 * design Cl=0.3), P=position tag {1..5}, Q=reflex tag {0=standard,1=reflex}.
 */
const NACA_5DIGIT_TABLE: Record<string, Naca5CamberParams> = {
  // Standard (non-reflexed): 210, 220, 230, 240, 250
  "210": { m: 0.0580, k1: 361.4 },
  "220": { m: 0.1260, k1: 51.64 },
  "230": { m: 0.2025, k1: 15.957 },
  "240": { m: 0.2900, k1: 6.643 },
  "250": { m: 0.3910, k1: 3.230 },
  // Reflexed: 221, 231, 241, 251
  "221": { m: 0.1300, k1: 51.990, k2OverK1: 0.000764 },
  "231": { m: 0.2170, k1: 15.793, k2OverK1: 0.006770 },
  "241": { m: 0.3180, k1: 6.520, k2OverK1: 0.030300 },
  "251": { m: 0.4410, k1: 3.191, k2OverK1: 0.135500 },
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface NACAGenerateOptions {
  /** Number of points per surface (upper + lower). Default 81 → 161 total. */
  numPoints?: number;
  /** Chord length in meters; coordinates scaled by this factor. Default 1. */
  chord?: number;
  /** Leading-edge cosine clustering. Default true (denser LE, standard CFD/CAD practice). */
  cosineSpacing?: boolean;
  /** Closed trailing edge (a₄ = -0.1036). Default true. */
  closedTrailingEdge?: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface AirfoilProfile {
  /** Airfoil designator (e.g. "NACA 2412"). */
  name: string;
  /** Maximum camber as fraction of chord. */
  maxCamber: number;
  /** Position of maximum camber as fraction of chord. */
  maxCamberPosition: number;
  /** Maximum thickness as fraction of chord. */
  maxThickness: number;
  /** Upper surface coordinates (leading edge → trailing edge). */
  upper: Point2D[];
  /** Lower surface coordinates (leading edge → trailing edge). */
  lower: Point2D[];
  /** Combined perimeter (upper reversed + lower, Selig convention). */
  selig: Point2D[];
  /** Chord length in physical units (meters or whatever the caller passes). */
  chord: number;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class NACAAirfoilEngine {
  /**
   * Generate an airfoil profile for a 4-digit NACA designation.
   *
   * @param designation 4-digit NACA code (e.g. "2412", "0012").
   * @param options Sampling + chord scaling options.
   * @returns AirfoilProfile with upper/lower/selig coordinates.
   * @throws Error if designation is not exactly 4 digits.
   */
  generate4Digit(
    designation: string,
    options: NACAGenerateOptions = {}
  ): AirfoilProfile {
    const cleaned = this.stripNacaPrefix(designation);
    if (!/^\d{4}$/.test(cleaned)) {
      throw new Error(
        `NACA 4-digit designation must be 4 digits (got '${designation}')`
      );
    }

    const maxCamber = parseInt(cleaned[0]!, 10) / 100;
    const maxCamberPos = parseInt(cleaned[1]!, 10) / 10;
    const maxThickness = parseInt(cleaned.slice(2), 10) / 100;

    return this.buildProfile(
      `NACA ${cleaned}`,
      maxCamber,
      maxCamberPos,
      maxThickness,
      (x) => this.camber4Digit(x, maxCamber, maxCamberPos),
      (x) => this.camberSlope4Digit(x, maxCamber, maxCamberPos),
      options
    );
  }

  /**
   * Generate an airfoil profile for a 5-digit NACA designation.
   * Standard and reflexed cambers supported (per NACA TR-537).
   *
   * @param designation 5-digit NACA code (e.g. "23012", "24118").
   * @param options Sampling + chord scaling options.
   * @throws Error if designation is invalid or uses an unsupported camber tag.
   */
  generate5Digit(
    designation: string,
    options: NACAGenerateOptions = {}
  ): AirfoilProfile {
    const cleaned = this.stripNacaPrefix(designation);
    if (!/^\d{5}$/.test(cleaned)) {
      throw new Error(
        `NACA 5-digit designation must be 5 digits (got '${designation}')`
      );
    }

    const camberTag = cleaned.slice(0, 3);
    const camberParams = NACA_5DIGIT_TABLE[camberTag];
    if (!camberParams) {
      throw new Error(
        `NACA 5-digit camber tag '${camberTag}' not in lookup table (valid: ${Object.keys(NACA_5DIGIT_TABLE).join(", ")})`
      );
    }

    const designCl = parseInt(camberTag[0]!, 10) * 0.15; // lift coefficient
    const maxCamberPos = parseInt(camberTag[1]!, 10) / 20; // 2P/100 convention
    const maxThickness = parseInt(cleaned.slice(3), 10) / 100;
    const isReflex = camberTag[2] === "1";

    return this.buildProfile(
      `NACA ${cleaned}`,
      designCl * 0.055, // approximate visual max camber ratio
      maxCamberPos,
      maxThickness,
      (x) => this.camber5Digit(x, camberParams, isReflex),
      (x) => this.camberSlope5Digit(x, camberParams, isReflex),
      options
    );
  }

  /**
   * Parse a UIUC Airfoil Database .dat file (Selig format).
   *
   * Selig format: first line = airfoil name, subsequent lines = whitespace-
   * separated x/c y/c pairs in perimeter order (upper TE → LE → lower TE).
   *
   * @param content Raw file content.
   * @param chord Optional chord scaling (default 1).
   * @throws Error if file has fewer than 2 coordinate lines or malformed rows.
   */
  parseUIUCDat(content: string, chord: number = 1): AirfoilProfile {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 3) {
      throw new Error(
        `UIUC .dat file must have a name line plus ≥2 coordinate rows (got ${lines.length} non-empty lines)`
      );
    }

    const name = lines[0]!;
    const coords: Point2D[] = [];
    for (let index = 1; index < lines.length; index++) {
      const tokens = lines[index]!.split(/\s+/).map(Number);
      if (tokens.length < 2 || tokens.some(Number.isNaN)) {
        // Lerbs/header-format files sometimes include a count row; skip rows
        // that don't parse as 2+ numeric columns rather than rejecting the
        // whole file.
        if (index === 1 && tokens.length === 2) continue;
        continue;
      }
      coords.push({ x: tokens[0]! * chord, y: tokens[1]! * chord });
    }

    if (coords.length < 3) {
      throw new Error(
        `UIUC .dat file yielded only ${coords.length} valid coordinate rows (need ≥3)`
      );
    }

    // Split perimeter at leading edge (min x) into upper (TE→LE) and lower
    // (LE→TE). For Selig ordering we reverse upper to get LE→TE.
    let leIndex = 0;
    for (let index = 1; index < coords.length; index++) {
      if (coords[index]!.x < coords[leIndex]!.x) leIndex = index;
    }
    const upperRev = coords.slice(0, leIndex + 1);
    const lowerFwd = coords.slice(leIndex);
    const upper = [...upperRev].reverse();
    const lower = lowerFwd;

    // Derive metadata from coordinates.
    const maxThickness = this.estimateMaxThickness(upper, lower);
    const [maxCamber, maxCamberPos] = this.estimateMaxCamber(upper, lower);

    return {
      name,
      maxCamber,
      maxCamberPosition: maxCamberPos,
      maxThickness,
      upper,
      lower,
      selig: coords,
      chord,
    };
  }

  // ── Internal: profile assembly ─────────────────────────────────────────

  private buildProfile(
    name: string,
    maxCamber: number,
    maxCamberPos: number,
    maxThickness: number,
    camberFn: (x: number) => number,
    camberSlopeFn: (x: number) => number,
    options: NACAGenerateOptions
  ): AirfoilProfile {
    const numPoints = Math.max(3, options.numPoints ?? 81);
    const chord = options.chord ?? 1;
    const cosine = options.cosineSpacing ?? true;
    const closedTE = options.closedTrailingEdge ?? true;
    const a4 = closedTE
      ? NACA_THICKNESS_COEFFS.a4Closed
      : NACA_THICKNESS_COEFFS.a4Open;

    const xs = this.samplePoints(numPoints, cosine);
    const upper: Point2D[] = [];
    const lower: Point2D[] = [];

    for (const x of xs) {
      const yt = this.thickness(x, maxThickness, a4);
      const yc = camberFn(x);
      const theta = Math.atan(camberSlopeFn(x));
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      upper.push({
        x: (x - yt * sinT) * chord,
        y: (yc + yt * cosT) * chord,
      });
      lower.push({
        x: (x + yt * sinT) * chord,
        y: (yc - yt * cosT) * chord,
      });
    }

    // Selig convention: upper reversed (TE→LE) then lower (LE→TE).
    const selig = [...upper].reverse().concat(lower.slice(1));

    return {
      name,
      maxCamber,
      maxCamberPosition: maxCamberPos,
      maxThickness,
      upper,
      lower,
      selig,
      chord,
    };
  }

  // ── Thickness & camber formulae ────────────────────────────────────────

  /**
   * NACA 4-digit thickness polynomial evaluation.
   * x ∈ [0, 1], t is max-thickness-to-chord ratio.
   */
  private thickness(x: number, t: number, a4: number): number {
    const { a0, a1, a2, a3 } = NACA_THICKNESS_COEFFS;
    // Clamp to [0,1] — x < 0 produces NaN from √x; x > 1 is out-of-range.
    const xc = Math.min(Math.max(x, 0), 1);
    return (
      (t / 0.2) *
      (a0 * Math.sqrt(xc) +
        a1 * xc +
        a2 * xc * xc +
        a3 * xc * xc * xc +
        a4 * xc * xc * xc * xc)
    );
  }

  private camber4Digit(x: number, m: number, p: number): number {
    if (m === 0 || p === 0) return 0;
    if (x <= p) return (m / (p * p)) * (2 * p * x - x * x);
    return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
  }

  private camberSlope4Digit(x: number, m: number, p: number): number {
    if (m === 0 || p === 0) return 0;
    if (x <= p) return (2 * m / (p * p)) * (p - x);
    return (2 * m / ((1 - p) * (1 - p))) * (p - x);
  }

  /**
   * NACA 5-digit camber line. For standard (non-reflexed) airfoils:
   *   x < m: y_c = (k1/6) · (x³ − 3m·x² + m²(3−m)·x)
   *   x ≥ m: y_c = (k1·m³/6) · (1 − x)
   *
   * Reflexed airfoils add the k2/k1 term (NACA TR-537 eq. 2.27).
   */
  private camber5Digit(
    x: number,
    params: Naca5CamberParams,
    reflex: boolean
  ): number {
    const { m, k1 } = params;
    if (!reflex) {
      if (x < m) {
        return (k1 / 6) * (x * x * x - 3 * m * x * x + m * m * (3 - m) * x);
      }
      return ((k1 * m * m * m) / 6) * (1 - x);
    }
    const ratio = params.k2OverK1 ?? 0;
    if (x < m) {
      return (
        (k1 / 6) *
        (Math.pow(x - m, 3) -
          ratio * Math.pow(1 - m, 3) * x -
          m * m * m * x +
          m * m * m)
      );
    }
    return (
      (k1 / 6) *
      (ratio * Math.pow(x - m, 3) -
        ratio * Math.pow(1 - m, 3) * x -
        m * m * m * x +
        m * m * m)
    );
  }

  private camberSlope5Digit(
    x: number,
    params: Naca5CamberParams,
    reflex: boolean
  ): number {
    const { m, k1 } = params;
    if (!reflex) {
      if (x < m) return (k1 / 6) * (3 * x * x - 6 * m * x + m * m * (3 - m));
      return -((k1 * m * m * m) / 6);
    }
    const ratio = params.k2OverK1 ?? 0;
    if (x < m) {
      return (
        (k1 / 6) *
        (3 * (x - m) * (x - m) - ratio * Math.pow(1 - m, 3) - m * m * m)
      );
    }
    return (
      (k1 / 6) *
      (3 * ratio * (x - m) * (x - m) - ratio * Math.pow(1 - m, 3) - m * m * m)
    );
  }

  // ── Sampling + metadata ────────────────────────────────────────────────

  private samplePoints(n: number, cosine: boolean): number[] {
    const xs: number[] = [];
    if (cosine) {
      for (let i = 0; i < n; i++) {
        xs.push(0.5 * (1 - Math.cos((Math.PI * i) / (n - 1))));
      }
    } else {
      for (let i = 0; i < n; i++) xs.push(i / (n - 1));
    }
    return xs;
  }

  private estimateMaxThickness(upper: Point2D[], lower: Point2D[]): number {
    let maxT = 0;
    // Sample upper surface x-values; interpolate lower at those x's.
    for (const u of upper) {
      const l = this.interpY(lower, u.x);
      if (l !== null) {
        const thickness = u.y - l;
        if (thickness > maxT) maxT = thickness;
      }
    }
    return maxT;
  }

  private estimateMaxCamber(
    upper: Point2D[],
    lower: Point2D[]
  ): [number, number] {
    let maxC = 0;
    let posAtMax = 0;
    for (const u of upper) {
      const l = this.interpY(lower, u.x);
      if (l !== null) {
        const camber = (u.y + l) / 2;
        if (Math.abs(camber) > Math.abs(maxC)) {
          maxC = camber;
          posAtMax = u.x;
        }
      }
    }
    return [maxC, posAtMax];
  }

  private interpY(points: Point2D[], targetX: number): number | null {
    if (points.length < 2) return null;
    // Find bracketing points (assumes points are ordered by increasing x).
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      if (
        (a.x <= targetX && targetX <= b.x) ||
        (b.x <= targetX && targetX <= a.x)
      ) {
        const denominator = b.x - a.x;
        if (denominator === 0) return a.y;
        const t = (targetX - a.x) / denominator;
        return a.y + t * (b.y - a.y);
      }
    }
    return null;
  }

  private stripNacaPrefix(designation: string): string {
    return designation.replace(/^naca[\s-]*/i, "").trim();
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────

export const nacaAirfoilEngine = new NACAAirfoilEngine();
