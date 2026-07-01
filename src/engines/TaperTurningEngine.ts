/**
 * TaperTurningEngine — Taper Turning Parameter Calculator
 *
 * Calculates taper turning parameters:
 * - Taper angle from dimensions (large/small dia over length)
 * - Compound rest angle setting
 * - Taper attachment offset
 * - Tailstock offset for between-centers tapers
 * - Feed and speed at effective diameter
 * - Taper per foot / taper per inch conversion
 *
 * Key physics: Taper angle = atan((D-d)/(2×L)). The compound
 * rest is set to the half-angle. Tailstock offset =
 * (D-d)×total_length/(2×taper_length). For CNC, tapers are
 * simply programmed as linear interpolation between diameters.
 *
 * Reference: Machinery's Handbook Ch.30 (Tapers),
 *            Morse/Brown&Sharpe/Jarno taper standards,
 *            ISO 1947 (Self-holding tapers)
 *
 * Actions: taper_turning_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface TaperTurningInput {
  large_diameter_mm: number;
  small_diameter_mm: number;
  taper_length_mm: number;
  total_part_length_mm?: number;
  method?: "compound_rest" | "taper_attachment"
    | "tailstock_offset" | "cnc";
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  cutting_speed_mpm?: number;
  feed_per_rev_mm?: number;
  depth_of_cut_mm?: number;
  standard_taper?: string;
}

export interface TaperTurningResult {
  taper_angle: AtomicValue;
  half_angle: AtomicValue;
  taper_per_foot: AtomicValue;
  included_angle: AtomicValue;
  compound_rest_angle: AtomicValue;
  tailstock_offset: AtomicValue;
  effective_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  number_of_passes: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 120,
  aluminum: 250,
  titanium: 50,
  stainless: 80,
  cast_iron: 90,
  brass: 150,
};

/** Standard taper specs [name, tpf (taper per foot in inches)] */
const STD_TAPERS: Record<string, number> = {
  "MT0": 0.6246,
  "MT1": 0.5986,
  "MT2": 0.5994,
  "MT3": 0.6024,
  "MT4": 0.6233,
  "MT5": 0.6315,
  "BT30": 3.500,
  "BT40": 3.500,
  "BT50": 3.500,
  "R8": 3.500,
  "5C": 1.500,
};

// ── Engine ─────────────────────────────────────────────────────────

export class TaperTurningEngine {
  calculate(input: TaperTurningInput): TaperTurningResult {
    const warnings: string[] = [];
    const D = input.large_diameter_mm;
    const d = input.small_diameter_mm;
    const L = input.taper_length_mm;
    const totalL = input.total_part_length_mm ?? L;
    const mat = input.material_type ?? "steel";
    const method = input.method ?? "cnc";
    const doc = input.depth_of_cut_mm ?? 1.0;

    if (D <= d) {
      warnings.push(
        "Large diameter must be greater than small diameter"
      );
    }

    // Taper calculations
    const taperDiff = D - d;
    const halfAngleRad = Math.atan(taperDiff / (2 * L));
    const halfAngleDeg = (halfAngleRad * 180) / Math.PI;
    const includedAngleDeg = halfAngleDeg * 2;

    // Taper per foot (inches per foot)
    const tpf = (taperDiff / L) * (304.8); // mm/mm × 12in
    const tpfInches = tpf / 25.4;

    // Compound rest angle = half angle
    const compoundAngle = halfAngleDeg;

    // Tailstock offset = (D-d) × totalLength / (2 × taperLength)
    const tailstockOffset = (taperDiff * totalL) / (2 * L);

    // Effective cutting diameter (midpoint)
    const Deff = (D + d) / 2;

    // Cutting parameters
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 120;
    const rpm = r0((Vc * 1000) / (Math.PI * Deff));
    const fr = input.feed_per_rev_mm ?? 0.15;
    const feedRate = r1(fr * rpm);

    // Number of passes
    const radialStock = taperDiff / 2;
    const nPasses = Math.max(1, Math.ceil(radialStock / doc));

    // Method-specific warnings
    if (method === "tailstock_offset") {
      if (tailstockOffset > 15) {
        warnings.push(
          `Tailstock offset ${r2(tailstockOffset)}mm is large — ` +
          "may cause excessive bearing wear"
        );
      }
      if (includedAngleDeg > 8) {
        warnings.push(
          "Steep taper — tailstock offset not suitable, " +
          "use compound rest or taper attachment"
        );
      }
    }
    if (method === "compound_rest" && L > 75) {
      warnings.push(
        "Long taper on compound rest — limited travel, " +
        "consider taper attachment"
      );
    }
    if (halfAngleDeg > 30) {
      warnings.push(
        `Very steep taper (${r1(includedAngleDeg)}°) — ` +
        "consider facing or forming operation instead"
      );
    }

    // Check against standard taper
    if (input.standard_taper && STD_TAPERS[input.standard_taper]) {
      const stdTpf = STD_TAPERS[input.standard_taper];
      const diff = Math.abs(tpfInches - stdTpf);
      if (diff > 0.01) {
        warnings.push(
          `Dimensions don't match ${input.standard_taper} ` +
          `standard (TPF=${stdTpf}″ vs calculated ${r4(tpfInches)}″)`
        );
      }
    }

    return {
      taper_angle: av(r4(halfAngleDeg), "deg", 0.01,
        "atan((D-d)/(2L))"),
      half_angle: av(r4(halfAngleDeg), "deg", 0.01,
        "Half of included angle"),
      taper_per_foot: av(r4(tpfInches), "in/ft", 0.001,
        "(D-d)/L × 12"),
      included_angle: av(r3(includedAngleDeg), "deg", 0.02,
        "2 × half_angle"),
      compound_rest_angle: av(r3(compoundAngle), "deg", 0.02,
        "Set compound to half-angle"),
      tailstock_offset: av(r3(tailstockOffset), "mm", 0.05,
        `(D-d)×${totalL}/(2×${L})`),
      effective_diameter: av(r2(Deff), "mm", 0.1,
        "Midpoint diameter"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${r2(Deff)}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fr=${fr} × ${rpm}rpm`),
      number_of_passes: av(nPasses, "passes", 0,
        `${r2(radialStock)}mm radial / ${doc}mm DOC`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const taperTurningEngine = new TaperTurningEngine();
