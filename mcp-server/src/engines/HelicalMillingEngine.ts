/**
 * HelicalMillingEngine — Helical Interpolation Parameter Calculator
 *
 * Calculates parameters for helical bore milling:
 * - Helix diameter and pitch from bore diameter and tool
 * - Axial and radial depths of cut
 * - Feed rate compensation (actual vs programmed)
 * - Effective chip load at helix angle
 * - Cycle time for bore completion
 *
 * Key physics: In helical milling the tool follows a helix path,
 * so the programmed feed (center path) differs from the actual
 * peripheral cutting speed. The effective radial engagement
 * changes with the helix radius, and axial DOC per revolution
 * equals the helix pitch. Chip thinning occurs due to the
 * curvature — inner and outer edges see different chip loads.
 *
 * Reference: Sandvik Helical Milling Guide,
 *            Machinery's Handbook Ch.28 (Milling),
 *            ISO 1940 (Tool balance for high-speed helical)
 *
 * Actions: helical_milling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface HelicalMillingInput {
  bore_diameter_mm: number;
  tool_diameter_mm: number;
  flutes: number;
  cutting_speed_mpm?: number;
  feed_per_tooth_mm?: number;
  axial_pitch_mm?: number;
  bore_depth_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  finishing?: boolean;
}

export interface HelicalMillingResult {
  helix_diameter: AtomicValue;
  helix_pitch: AtomicValue;
  radial_depth_of_cut: AtomicValue;
  axial_depth_per_rev: AtomicValue;
  spindle_rpm: AtomicValue;
  programmed_feed: AtomicValue;
  peripheral_feed: AtomicValue;
  effective_chip_load: AtomicValue;
  number_of_helix_revs: AtomicValue;
  cycle_time: AtomicValue;
  mrr: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 120,
  aluminum: 300,
  titanium: 50,
  stainless: 80,
  cast_iron: 100,
};

const DEFAULT_FZ: Record<string, number> = {
  steel: 0.06,
  aluminum: 0.10,
  titanium: 0.04,
  stainless: 0.05,
  cast_iron: 0.08,
};

// ── Engine ─────────────────────────────────────────────────────────

export class HelicalMillingEngine {
  calculate(input: HelicalMillingInput): HelicalMillingResult {
    const warnings: string[] = [];
    const mat = input.material_type ?? "steel";
    const Db = input.bore_diameter_mm;
    const Dt = input.tool_diameter_mm;
    const z = input.flutes;
    const depth = input.bore_depth_mm ?? 20;
    const finishing = input.finishing ?? false;

    // Validate tool vs bore
    if (Dt >= Db) {
      warnings.push("Tool diameter must be smaller than bore diameter");
    }
    const toolRatio = Dt / Db;
    if (toolRatio > 0.7) {
      warnings.push(
        `Tool/bore ratio ${r2(toolRatio)} > 0.7 — poor chip evacuation`
      );
    }
    if (toolRatio < 0.3) {
      warnings.push(
        `Tool/bore ratio ${r2(toolRatio)} < 0.3 — many passes, slow cycle`
      );
    }

    // Recommended: tool 50-70% of bore diameter
    // Helix diameter = bore diameter - tool diameter
    const Dh = Db - Dt;

    // Radial DOC = (bore - tool) / 2 = ae
    const ae = Dh / 2;

    // Axial pitch (DOC per helix revolution)
    const ap = input.axial_pitch_mm
      ?? (finishing ? Math.min(0.3, Dt * 0.05) : Math.min(Dt * 0.15, 2.0));

    // Cutting speed and RPM
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 120;
    const rpm = r0((Vc * 1000) / (Math.PI * Dt));

    // Feed per tooth
    const fz = input.feed_per_tooth_mm ?? DEFAULT_FZ[mat] ?? 0.06;

    // Chip thinning factor: actual chip load is thicker on outer edge
    // fz_eff = fz * (Dh / Dt) for center-programmed feed
    const chipThinFactor = Dh > 0 ? Dt / (Dt + Dh) : 1;
    const fzEff = fz * chipThinFactor;

    // Programmed feed = along helix center path
    const feedCenter = r1(fz * z * rpm);

    // Peripheral feed (outer edge of tool) is faster
    // V_outer / V_center = (Dh/2 + Dt/2) / (Dh/2) = (Dh + Dt) / Dh
    const feedRatio = Dh > 0 ? (Dh + Dt) / Dh : 1;
    const feedPeripheral = r1(feedCenter * feedRatio);

    // Number of helix revolutions
    const nRevs = Math.ceil(depth / ap);

    // Path length per revolution = circumference of helix center path
    const helixCirc = Math.PI * Dh;
    const totalPath = helixCirc * nRevs;

    // Cycle time (minutes)
    const cycleTime = feedCenter > 0 ? totalPath / feedCenter : 0;

    // MRR: π × ae × ap × Dh × rpm_helix
    // Simplified: volume per helix rev = π × Db × ae × ap (annular cut)
    const mrrVal = feedCenter > 0
      ? (Math.PI * Db * ae * ap * (feedCenter / helixCirc)) / 1000
      : 0;

    if (ap > Dt * 0.3) {
      warnings.push(
        "Axial pitch > 30% of tool diameter — risk of deflection"
      );
    }
    if (rpm > 20000 && Dt > 20) {
      warnings.push(
        "High RPM with large tool — check spindle balance"
      );
    }

    return {
      helix_diameter: av(r2(Dh), "mm", 0.01,
        "bore_dia - tool_dia"),
      helix_pitch: av(r3(ap), "mm/rev", 0.05,
        "Axial DOC per helix revolution"),
      radial_depth_of_cut: av(r3(ae), "mm", 0.05,
        "(bore_dia - tool_dia) / 2"),
      axial_depth_per_rev: av(r3(ap), "mm", 0.05,
        finishing ? "Finish: 5% of Dt" : "Rough: 15% of Dt"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} m/min, Dt=${Dt}mm`),
      programmed_feed: av(feedCenter, "mm/min", 5,
        `fz=${fz} × ${z} flutes × ${rpm} rpm`),
      peripheral_feed: av(feedPeripheral, "mm/min", 5,
        `Center × ${r2(feedRatio)} ratio`),
      effective_chip_load: av(r4(fzEff), "mm/tooth", 0.005,
        "Chip-thinned by helix curvature"),
      number_of_helix_revs: av(nRevs, "revs", 0,
        `${depth}mm depth / ${r3(ap)}mm pitch`),
      cycle_time: av(r2(cycleTime), "min", 0.1,
        `${r0(totalPath)}mm path / ${feedCenter} mm/min`),
      mrr: av(r2(mrrVal), "cm³/min", 0.5,
        "Annular volume removal rate"),
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

export const helicalMillingEngine = new HelicalMillingEngine();
