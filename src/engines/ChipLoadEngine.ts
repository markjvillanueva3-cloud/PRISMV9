/**
 * ChipLoadEngine — Chip Load Optimization Calculator
 *
 * Calculates and optimizes chip load (feed per tooth):
 * - Recommended chip load from tool/material combination
 * - Chip thinning compensation for radial engagement < 50%
 * - Adjusted feed rate for programmed vs actual chip load
 * - Min/max chip load limits to avoid rubbing/breakage
 * - Speed-feed-DOC optimization triangle
 *
 * Key physics: When radial engagement (ae) < 50% of tool
 * diameter, the maximum chip thickness is thinner than
 * the programmed fz. To maintain the correct actual chip
 * load, feed must be increased by the chip thinning factor:
 * fz_prog = fz_actual × Dt / (2 × √(ae × (Dt - ae)))
 *
 * Reference: Sandvik Chip Thinning Application Notes,
 *            Helical Solutions Feeds & Speeds Guide,
 *            Machinery's Handbook Ch.28 (Chip Load)
 *
 * Actions: chip_load_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChipLoadInput {
  tool_diameter_mm: number;
  flutes: number;
  radial_engagement_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  tool_material?: "carbide" | "hss" | "cermet" | "cbn";
  cutting_speed_mpm?: number;
  operation?: "slotting" | "side_milling" | "finishing"
    | "roughing" | "trochoidal";
}

export interface ChipLoadResult {
  recommended_fz: AtomicValue;
  chip_thinning_factor: AtomicValue;
  programmed_fz: AtomicValue;
  table_feed: AtomicValue;
  spindle_rpm: AtomicValue;
  min_chip_load: AtomicValue;
  max_chip_load: AtomicValue;
  radial_engagement_percent: AtomicValue;
  engagement_angle: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Base chip load (mm/tooth) for carbide end mills [roughing] */
const BASE_FZ: Record<string, Record<string, number>> = {
  carbide: {
    steel: 0.08,
    aluminum: 0.12,
    titanium: 0.05,
    stainless: 0.06,
    cast_iron: 0.10,
    brass: 0.10,
  },
  hss: {
    steel: 0.05,
    aluminum: 0.08,
    titanium: 0.03,
    stainless: 0.04,
    cast_iron: 0.06,
    brass: 0.07,
  },
  cermet: {
    steel: 0.06,
    aluminum: 0.10,
    titanium: 0.04,
    stainless: 0.05,
    cast_iron: 0.08,
    brass: 0.08,
  },
  cbn: {
    steel: 0.04,
    aluminum: 0.08,
    titanium: 0.03,
    stainless: 0.04,
    cast_iron: 0.06,
    brass: 0.06,
  },
};

const DEFAULT_VC: Record<string, number> = {
  steel: 120,
  aluminum: 300,
  titanium: 50,
  stainless: 80,
  cast_iron: 100,
  brass: 150,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChipLoadEngine {
  calculate(input: ChipLoadInput): ChipLoadResult {
    const warnings: string[] = [];
    const Dt = input.tool_diameter_mm;
    const z = input.flutes;
    const mat = input.material_type ?? "steel";
    const toolMat = input.tool_material ?? "carbide";
    const op = input.operation ?? "roughing";

    // Default radial engagement by operation
    const defaultAe = op === "slotting" ? Dt
      : op === "trochoidal" ? Dt * 0.1
      : op === "finishing" ? Dt * 0.05
      : op === "side_milling" ? Dt * 0.3
      : Dt * 0.4; // roughing
    const ae = input.radial_engagement_mm ?? defaultAe;
    const aePct = (ae / Dt) * 100;

    // Base chip load from table
    const matTable = BASE_FZ[toolMat] ?? BASE_FZ.carbide;
    let baseFz = matTable[mat] ?? 0.08;

    // Diameter scaling: larger tools can take more
    const diaFactor = Math.pow(Dt / 10, 0.3);
    baseFz *= diaFactor;

    // Operation factor
    const opFactor = op === "finishing" ? 0.5
      : op === "slotting" ? 0.6
      : op === "trochoidal" ? 1.2
      : 1.0;
    const recFz = baseFz * opFactor;

    // Chip thinning factor
    // When ae < Dt/2, actual max chip thickness < programmed fz
    // CTF = Dt / (2 × √(ae × (Dt - ae)))
    let ctf = 1.0;
    if (ae < Dt / 2) {
      const denominator = 2 * Math.sqrt(ae * (Dt - ae));
      ctf = denominator > 0 ? Dt / denominator : 1;
    }

    // Programmed fz (compensated for chip thinning)
    const progFz = recFz * ctf;

    // Engagement angle
    const engAngle = ae >= Dt
      ? 180
      : (Math.acos(1 - (2 * ae / Dt)) * 180) / Math.PI;

    // RPM and table feed
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 120;
    const rpm = r0((Vc * 1000) / (Math.PI * Dt));
    const tableFeed = r1(progFz * z * rpm);

    // Min/max chip load limits
    const minFz = recFz * 0.3; // below this: rubbing
    const maxFz = recFz * 2.0; // above this: breakage risk

    // Warnings
    if (ctf > 2.0) {
      warnings.push(
        `High chip thinning factor ${r2(ctf)}× — ` +
        "programmed feed significantly higher than actual"
      );
    }
    if (aePct > 100) {
      warnings.push(
        "Radial engagement > tool diameter — check input"
      );
    }
    if (op === "slotting" && z > 3) {
      warnings.push(
        `${z} flutes in slotting — chip space limited, ` +
        "use 2-3 flutes"
      );
    }
    if (recFz < 0.02) {
      warnings.push(
        "Very low chip load — risk of rubbing and work hardening"
      );
    }
    if (op === "trochoidal" && ae > Dt * 0.15) {
      warnings.push(
        "Trochoidal ae > 15% of Dt — " +
        "reduce for proper dynamic milling"
      );
    }

    return {
      recommended_fz: av(r4(recFz), "mm/tooth", 0.005,
        `${toolMat}/${mat}, Dt=${Dt}, ${op}`),
      chip_thinning_factor: av(r2(ctf), "×", 0.05,
        ae < Dt / 2
          ? `ae=${r1(ae)}mm < Dt/2 — thin chip compensation`
          : "No thinning — ae ≥ 50%"),
      programmed_fz: av(r4(progFz), "mm/tooth", 0.005,
        `Base ${r4(recFz)} × CTF ${r2(ctf)}`),
      table_feed: av(tableFeed, "mm/min", 5,
        `fz_prog=${r4(progFz)} × ${z}fl × ${rpm}rpm`),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${Dt}mm`),
      min_chip_load: av(r4(minFz), "mm/tooth", 0.002,
        "30% of recommended — rubbing limit"),
      max_chip_load: av(r4(maxFz), "mm/tooth", 0.005,
        "200% of recommended — breakage limit"),
      radial_engagement_percent: av(r1(aePct), "%", 1,
        `${r1(ae)}mm / ${Dt}mm`),
      engagement_angle: av(r1(engAngle), "deg", 1,
        ae >= Dt ? "Full slot" : "Partial engagement"),
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
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const chipLoadEngine = new ChipLoadEngine();
