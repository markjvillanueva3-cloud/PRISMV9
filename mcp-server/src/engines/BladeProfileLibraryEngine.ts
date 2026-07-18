/**
 * BladeProfileLibraryEngine — U-CADC13 / CAD-COMPLETE-MS0
 *
 * Canonical NACA 4-digit and 5-digit airfoil profile generator + library.
 * Produces point lists for turbine-blade / propeller / impeller CAD
 * generators (U-CADC14 TurbineBladeCADEngine, U-CADC15 ImpellerCADEngine,
 * U-CADC16 BliskCADEngine).
 *
 * Formulas (all verified against NACA Report No. 460, "The Characteristics
 * of 78 Related Airfoil Sections from Tests in the Variable-Density Wind
 * Tunnel", Jacobs, Ward, Pinkerton, 1933, and NACA Technical Memorandum
 * 824 for the 5-digit series).
 *
 * 4-digit NACA MPXX:
 *   M = max camber (% chord), 0..9
 *   P = location of max camber (tenths of chord), 0..9
 *   XX = thickness (% chord), 01..40
 *
 *   Thickness distribution (chord-normalized x∈[0,1]):
 *     yt(x) = 5·t·[ 0.2969·√x
 *                 − 0.1260·x
 *                 − 0.3516·x²
 *                 + 0.2843·x³
 *                 − 0.1015·x⁴   // open TE; use −0.1036 for closed TE
 *             ]
 *
 *   Camber line (m = M/100, p = P/10):
 *     yc(x) = m/p²     · (2·p·x − x²)            for x ∈ [0, p]
 *     yc(x) = m/(1−p)² · ((1−2p) + 2p·x − x²)   for x ∈ [p, 1]
 *     θ(x)  = atan( dyc/dx )
 *
 *   Upper/lower surfaces:
 *     xu = x − yt·sin θ,  yu = yc + yt·cos θ
 *     xl = x + yt·sin θ,  yl = yc − yt·cos θ
 *
 * 5-digit NACA LPSTT (L=design CL×3/20, P=pos×20, S=refl/non-refl, TT=thick):
 *   Only the non-reflexed mean lines are implemented (S=0). Standard
 *   series: 210, 220, 230, 240, 250 (camber-line families 2…, matching
 *   position values 0.05, 0.10, 0.15, 0.20, 0.25). Coefficients from
 *   Abbott & von Doenhoff "Theory of Wing Sections", Appendix III.
 *
 * Cosine-spaced sampling concentrates points near leading/trailing edges
 * where curvature is highest, exactly matching how NURBSEngine expects
 * loft input rows to be parameterised.
 *
 * @module engines/BladeProfileLibraryEngine
 */

// ── Public types ─────────────────────────────────────────────────────────

export interface AirfoilPoint {
  /** Chord-normalized x (0 = leading edge, 1 = trailing edge). */
  x: number;
  /** Chord-normalized y. */
  y: number;
}

export interface AirfoilProfile {
  /** Canonical designation — "NACA 2412", "NACA 23012", etc. */
  designation: string;
  /** Series family — "naca-4" | "naca-5". */
  family: "naca-4" | "naca-5";
  /** Raw numeric digits (e.g. 2412 or 23012). */
  digits: string;
  /** Max camber as fraction of chord (0 for symmetric). */
  maxCamber: number;
  /** Chord-wise position of max camber (0..1). */
  maxCamberPos: number;
  /** Thickness as fraction of chord (e.g. 0.12 for 12% thick). */
  thickness: number;
  /** Upper-surface points, leading edge → trailing edge. */
  upper: ReadonlyArray<AirfoilPoint>;
  /** Lower-surface points, leading edge → trailing edge. */
  lower: ReadonlyArray<AirfoilPoint>;
  /** Full ordered contour (trailing edge → upper → LE → lower → TE). */
  contour: ReadonlyArray<AirfoilPoint>;
  /** Number of points per surface. */
  samplesPerSurface: number;
}

export interface ProfileQuery {
  /** Exact match, e.g. "NACA 2412". */
  designation?: string;
  /** Or filter by family. */
  family?: "naca-4" | "naca-5";
  /** Thickness filter — returns profiles within +/- tolerance of target. */
  thicknessPct?: number;
  thicknessToleranceAbs?: number;
}

export interface ProfileCatalogEntry {
  designation: string;
  family: "naca-4" | "naca-5";
  maxCamberPct: number;
  maxCamberPosTenths: number;
  thicknessPct: number;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class AirfoilParseError extends Error {
  constructor(designation: string, reason: string) {
    super(`Cannot parse airfoil designation "${designation}": ${reason}`);
    this.name = "AirfoilParseError";
  }
}

// ── NACA constants ───────────────────────────────────────────────────────

/** NACA 4-digit thickness coefficients (open trailing edge). */
const NACA4_A0 = 0.2969;
const NACA4_A1 = -0.126;
const NACA4_A2 = -0.3516;
const NACA4_A3 = 0.2843;
const NACA4_A4 = -0.1015;

/**
 * NACA 5-digit non-reflexed mean lines (Abbott & von Doenhoff Table).
 * Keyed by the first three digits of the designation.
 */
const NACA5_MEAN_LINE: Record<string, { m: number; k1: number; r: number }> = {
  "210": { m: 0.058, k1: 361.4, r: 0.05 },
  "220": { m: 0.126, k1: 51.64, r: 0.1 },
  "230": { m: 0.2025, k1: 15.957, r: 0.15 },
  "240": { m: 0.29, k1: 6.643, r: 0.2 },
  "250": { m: 0.391, k1: 3.23, r: 0.25 },
};

// ── Engine ───────────────────────────────────────────────────────────────

export class BladeProfileLibraryEngine {
  private readonly cache = new Map<string, AirfoilProfile>();
  /** Pre-registered catalog of designations this library can generate. */
  private readonly catalog: ProfileCatalogEntry[];

  constructor() {
    this.catalog = buildCatalog();
  }

  // ─── Catalog queries ──────────────────────────────────────────────────

  /** Total number of profiles the library can synthesize on demand. */
  profileCount(): number {
    return this.catalog.length;
  }

  /** Return the full catalog entry list (cheap — no geometry). */
  listCatalog(): ReadonlyArray<ProfileCatalogEntry> {
    return this.catalog;
  }

  /** Filter catalog entries by family / thickness window / designation. */
  query(q: ProfileQuery = {}): ProfileCatalogEntry[] {
    const out: ProfileCatalogEntry[] = [];
    for (const e of this.catalog) {
      if (q.designation && e.designation !== q.designation) continue;
      if (q.family && e.family !== q.family) continue;
      if (q.thicknessPct !== undefined) {
        const tol = q.thicknessToleranceAbs ?? 1.0;
        if (Math.abs(e.thicknessPct - q.thicknessPct) > tol) continue;
      }
      out.push(e);
    }
    return out;
  }

  // ─── Generation ───────────────────────────────────────────────────────

  /**
   * Generate a profile by designation. Cached — repeated calls return the
   * same object reference.
   */
  getProfile(designation: string, samplesPerSurface = 80): AirfoilProfile {
    const key = `${normaliseDesignation(designation)}|${samplesPerSurface}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const parsed = parseDesignation(designation);
    let profile: AirfoilProfile;
    if (parsed.family === "naca-4") {
      profile = this.generateNACA4(parsed, samplesPerSurface);
    } else {
      profile = this.generateNACA5(parsed, samplesPerSurface);
    }
    this.cache.set(key, profile);
    return profile;
  }

  /**
   * Interpolate y at an arbitrary chord-wise x on the upper or lower
   * surface of a generated profile. Linear interpolation between the
   * two bracketing sampled points — the cosine spacing keeps error low
   * where it matters (near LE/TE). Throws on out-of-range x.
   */
  interpolate(
    profile: AirfoilProfile,
    x: number,
    surface: "upper" | "lower",
  ): number {
    if (!Number.isFinite(x) || x < 0 || x > 1) {
      throw new RangeError(`x=${x} outside chord [0, 1]`);
    }
    const pts = surface === "upper" ? profile.upper : profile.lower;
    // Binary search for bracketing x's — pts are sorted by x ascending.
    let lo = 0;
    let hi = pts.length - 1;
    if (x <= pts[0]!.x) return pts[0]!.y;
    if (x >= pts[hi]!.x) return pts[hi]!.y;
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1;
      if (pts[mid]!.x <= x) lo = mid;
      else hi = mid;
    }
    const a = pts[lo]!;
    const b = pts[hi]!;
    const t = (x - a.x) / (b.x - a.x);
    return a.y + t * (b.y - a.y);
  }

  // ─── Capability probe ─────────────────────────────────────────────────

  /**
   * Can this library synthesize the given designation? Parse-only (no
   * geometry). Returns a structured result instead of throwing, so downstream
   * generators (e.g. BliskCADEngine.validate) can fail loud at *validate* time
   * rather than throwing at generate(). Uses the same parser, so
   * `canGenerate(d).ok` iff `getProfile(d)` will not throw a parse/library
   * error. U-BLISK-6SERIES-PARSE.
   *
   * @param designation NACA designation, e.g. "NACA 0012".
   * @returns `{ ok: true }` when generatable, else `{ ok:false, reason }`.
   */
  canGenerate(designation: string): { ok: boolean; reason?: string } {
    try {
      const parsed = parseDesignation(designation);
      if (parsed.family === "naca-5") {
        const key = parsed.digits.slice(0, 3);
        if (!NACA5_MEAN_LINE[key]) {
          return {
            ok: false,
            reason: `NACA 5-digit mean-line "${key}" is not implemented (supported: ${Object.keys(NACA5_MEAN_LINE).join(", ")})`,
          };
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }

  // ─── NACA 4-digit ─────────────────────────────────────────────────────

  private generateNACA4(
    p: ParsedNACA4,
    n: number,
  ): AirfoilProfile {
    const { m, pos, t, designation } = p;
    const xs = cosineSpacing(n);
    const upper: AirfoilPoint[] = [];
    const lower: AirfoilPoint[] = [];
    for (const x of xs) {
      const yt = thickness4(x, t);
      const { yc, dyc } = camber4(x, m, pos);
      const theta = Math.atan(dyc);
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      upper.push({ x: round6(x - yt * sinT), y: round6(yc + yt * cosT) });
      lower.push({ x: round6(x + yt * sinT), y: round6(yc - yt * cosT) });
    }
    return packProfile({
      designation,
      family: "naca-4",
      digits: p.digits,
      maxCamber: m,
      maxCamberPos: pos,
      thickness: t,
      upper,
      lower,
      samplesPerSurface: n,
    });
  }

  // ─── NACA 5-digit ─────────────────────────────────────────────────────

  private generateNACA5(p: ParsedNACA5, n: number): AirfoilProfile {
    const { digits, designation, t } = p;
    const meanLineKey = digits.slice(0, 3);
    const mean = NACA5_MEAN_LINE[meanLineKey];
    if (!mean)
      throw new AirfoilParseError(
        designation,
        `NACA 5-digit mean-line "${meanLineKey}" is not in the implemented table (supported: ${Object.keys(NACA5_MEAN_LINE).join(", ")})`,
      );
    const xs = cosineSpacing(n);
    const upper: AirfoilPoint[] = [];
    const lower: AirfoilPoint[] = [];
    for (const x of xs) {
      const yt = thickness4(x, t);
      const { yc, dyc } = camber5(x, mean.m, mean.k1);
      const theta = Math.atan(dyc);
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      upper.push({ x: round6(x - yt * sinT), y: round6(yc + yt * cosT) });
      lower.push({ x: round6(x + yt * sinT), y: round6(yc - yt * cosT) });
    }
    return packProfile({
      designation,
      family: "naca-5",
      digits,
      maxCamber: mean.m, // camber metric is not a direct digit in 5-series
      maxCamberPos: mean.r,
      thickness: t,
      upper,
      lower,
      samplesPerSurface: n,
    });
  }
}

export const bladeProfileLibraryEngine = new BladeProfileLibraryEngine();

// ── Generation helpers ───────────────────────────────────────────────────

function thickness4(x: number, t: number): number {
  return (
    5 *
    t *
    (NACA4_A0 * Math.sqrt(x) +
      NACA4_A1 * x +
      NACA4_A2 * x * x +
      NACA4_A3 * x * x * x +
      NACA4_A4 * x * x * x * x)
  );
}

function camber4(
  x: number,
  m: number,
  p: number,
): { yc: number; dyc: number } {
  if (m === 0 || p === 0) return { yc: 0, dyc: 0 };
  if (x < p) {
    const yc = (m / (p * p)) * (2 * p * x - x * x);
    const dyc = ((2 * m) / (p * p)) * (p - x);
    return { yc, dyc };
  }
  const yc =
    (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
  const dyc = ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
  return { yc, dyc };
}

function camber5(
  x: number,
  m: number,
  k1: number,
): { yc: number; dyc: number } {
  if (x < m) {
    const yc = (k1 / 6) * (x * x * x - 3 * m * x * x + m * m * (3 - m) * x);
    const dyc = (k1 / 6) * (3 * x * x - 6 * m * x + m * m * (3 - m));
    return { yc, dyc };
  }
  const yc = ((k1 * m * m * m) / 6) * (1 - x);
  const dyc = -(k1 * m * m * m) / 6;
  return { yc, dyc };
}

function cosineSpacing(n: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const beta = (Math.PI * i) / (n - 1);
    xs.push(0.5 * (1 - Math.cos(beta)));
  }
  xs[0] = 0;
  xs[n - 1] = 1;
  return xs;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

interface PackArgs {
  designation: string;
  family: "naca-4" | "naca-5";
  digits: string;
  maxCamber: number;
  maxCamberPos: number;
  thickness: number;
  upper: ReadonlyArray<AirfoilPoint>;
  lower: ReadonlyArray<AirfoilPoint>;
  samplesPerSurface: number;
}

function packProfile(a: PackArgs): AirfoilProfile {
  // Selig/Lednicer-style ordered contour: upper trailing edge → LE → lower TE.
  const contour: AirfoilPoint[] = [];
  for (let i = a.upper.length - 1; i >= 0; i--) contour.push(a.upper[i]!);
  for (let i = 1; i < a.lower.length; i++) contour.push(a.lower[i]!);
  return { ...a, contour };
}

// ── Parsing ──────────────────────────────────────────────────────────────

interface ParsedNACA4 {
  family: "naca-4";
  digits: string;
  designation: string;
  m: number;
  pos: number;
  t: number;
}

interface ParsedNACA5 {
  family: "naca-5";
  digits: string;
  designation: string;
  t: number;
}

function normaliseDesignation(d: string): string {
  return d.trim().toUpperCase().replace(/\s+/g, " ");
}

function parseDesignation(d: string): ParsedNACA4 | ParsedNACA5 {
  const norm = normaliseDesignation(d);
  // NACA 6-series (laminar-flow) -- e.g. "NACA 65-010", "NACA 65(216)-010",
  // "NACA 64A010". Their basic thickness form is TABULATED (NACA Report 824 /
  // Abbott & von Doenhoff, "Theory of Wing Sections", App. I), derived by
  // conformal mapping -- NOT the analytic 4-/5-digit polynomial implemented
  // here -- so this library cannot synthesize them yet. Fail loud with an
  // honest, actionable message; NEVER silently substitute a 4-digit section
  // (its thickness distribution differs -> wrong blade geometry). The dash or
  // 'A' modifier distinguishes them from valid 4-/5-digit designations, which
  // never contain either. See unit U-BLISK-6SERIES-ORDINATES.
  if (/^NACA\s*6\d.*-\d{3}$/.test(norm) || /^NACA\s*6\dA\d{3}$/.test(norm)) {
    throw new AirfoilParseError(
      d,
      "NACA 6-series (laminar-flow) sections require tabulated thickness-form " +
        "ordinates (NACA Report 824 / Abbott & von Doenhoff App. I) not yet " +
        "loaded in this library; supported families: NACA 4-digit and 5-digit",
    );
  }
  const m = norm.match(/^NACA\s*(\d{4,5})$/);
  if (!m) throw new AirfoilParseError(d, "expected 'NACA <4-or-5-digits>'");
  const digits = m[1]!;
  if (digits.length === 4) {
    const camberDigit = parseInt(digits[0]!, 10);
    const posDigit = parseInt(digits[1]!, 10);
    const thicknessDigits = parseInt(digits.slice(2), 10);
    if (thicknessDigits === 0)
      throw new AirfoilParseError(d, "thickness must be > 0");
    return {
      family: "naca-4",
      digits,
      designation: `NACA ${digits}`,
      m: camberDigit / 100,
      pos: posDigit / 10,
      t: thicknessDigits / 100,
    };
  }
  // 5-digit
  const thicknessDigits = parseInt(digits.slice(3), 10);
  if (thicknessDigits === 0)
    throw new AirfoilParseError(d, "thickness must be > 0");
  return {
    family: "naca-5",
    digits,
    designation: `NACA ${digits}`,
    t: thicknessDigits / 100,
  };
}

// ── Catalog seeding ──────────────────────────────────────────────────────

function buildCatalog(): ProfileCatalogEntry[] {
  const out: ProfileCatalogEntry[] = [];

  // 4-digit symmetric: NACA 00XX, XX ∈ {06, 08, 09, 10, 12, 15, 18, 21, 24}
  for (const t of [6, 8, 9, 10, 12, 15, 18, 21, 24]) {
    const tt = t.toString().padStart(2, "0");
    out.push({
      designation: `NACA 00${tt}`,
      family: "naca-4",
      maxCamberPct: 0,
      maxCamberPosTenths: 0,
      thicknessPct: t,
    });
  }

  // 4-digit cambered: M ∈ {1..6}, P ∈ {2..5}, XX ∈ {08, 09, 10, 12, 15, 18, 21}
  for (let M = 1; M <= 6; M++) {
    for (let P = 2; P <= 5; P++) {
      for (const t of [8, 9, 10, 12, 15, 18, 21]) {
        const digits = `${M}${P}${t.toString().padStart(2, "0")}`;
        out.push({
          designation: `NACA ${digits}`,
          family: "naca-4",
          maxCamberPct: M,
          maxCamberPosTenths: P,
          thicknessPct: t,
        });
      }
    }
  }

  // 5-digit: mean lines 210, 220, 230, 240, 250 × TT ∈ {09, 10, 12, 15, 18, 21}
  for (const meanLine of ["210", "220", "230", "240", "250"]) {
    for (const t of [9, 10, 12, 15, 18, 21]) {
      const digits = `${meanLine}${t.toString().padStart(2, "0")}`;
      out.push({
        designation: `NACA ${digits}`,
        family: "naca-5",
        maxCamberPct: parseInt(meanLine[0]!, 10),
        maxCamberPosTenths: parseInt(meanLine[1]!, 10),
        thicknessPct: t,
      });
    }
  }

  return out;
}
