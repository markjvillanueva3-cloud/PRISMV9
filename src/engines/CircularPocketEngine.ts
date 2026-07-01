/**
 * CircularPocketEngine — Circular Pocket Milling Calculator
 *
 * Calculates circular pocket milling parameters:
 * - Stepover pattern (concentric rings from center outward)
 * - Helical plunge entry parameters
 * - Number of radial passes
 * - Floor finish passes
 * - Effective engagement at each ring
 * - Cycle time estimation
 *
 * Key physics: Circular pockets are milled as concentric
 * circles expanding from the center. Entry is by helical
 * interpolation. The first pass at center has full-slot
 * engagement (180°), while outer passes have controlled
 * radial engagement. Floor flatness depends on stepover
 * and tool corner radius.
 *
 * Reference: Sandvik Pocket Milling Application Guide,
 *            Machinery's Handbook Ch.28 (Milling),
 *            Mastercam Circular Pocket Toolpath Guide
 *
 * Actions: circular_pocket_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CircularPocketInput {
  pocket_diameter_mm: number;
  pocket_depth_mm: number;
  tool_diameter_mm: number;
  flutes?: number;
  stepover_percent?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  cutting_speed_mpm?: number;
  feed_per_tooth_mm?: number;
  helix_angle_deg?: number;
  floor_finish?: boolean;
}

export interface CircularPocketResult {
  number_of_radial_passes: AtomicValue;
  stepover: AtomicValue;
  axial_depth_per_level: AtomicValue;
  number_of_levels: AtomicValue;
  helix_entry_diameter: AtomicValue;
  helix_pitch: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  total_path_length: AtomicValue;
  mrr: AtomicValue;
  cycle_time: AtomicValue;
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
  steel: 0.08,
  aluminum: 0.12,
  titanium: 0.05,
  stainless: 0.06,
  cast_iron: 0.10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CircularPocketEngine {
  calculate(input: CircularPocketInput): CircularPocketResult {
    const warnings: string[] = [];
    const Dp = input.pocket_diameter_mm;
    const depth = input.pocket_depth_mm;
    const Dt = input.tool_diameter_mm;
    const mat = input.material_type ?? "steel";
    const flutes = input.flutes ?? 4;
    const stepPct = input.stepover_percent ?? 40;
    const floorFinish = input.floor_finish ?? false;

    // Validate tool vs pocket
    if (Dt >= Dp) {
      warnings.push("Tool must be smaller than pocket diameter");
    }
    const toolRatio = Dt / Dp;
    if (toolRatio > 0.8) {
      warnings.push(
        "Tool > 80% of pocket — very few radial passes, poor chip evacuation"
      );
    }

    // Stepover
    const ae = Dt * (stepPct / 100);

    // Number of radial passes from center to wall
    const pocketRadius = Dp / 2;
    const toolRadius = Dt / 2;
    const radialDistance = pocketRadius - toolRadius;
    const nRadial = Math.max(
      1,
      Math.ceil(radialDistance / ae)
    );

    // Axial depth per level
    const apMax = Math.min(Dt * 0.5, 10);
    const ap = Math.min(apMax, depth);
    const nLevels = Math.ceil(depth / ap);

    // Helical entry parameters
    const helixAngle = input.helix_angle_deg ?? 3;
    const helixAngleRad = (helixAngle * Math.PI) / 180;
    // Helix diameter: tool can ramp in a circle of Dt diameter
    const helixDia = Math.min(Dt * 0.8, radialDistance);
    // Helix pitch: per revolution of helix path
    const helixPitch = Math.PI * helixDia * Math.tan(helixAngleRad);

    // Cutting speed and RPM
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 120;
    const rpm = r0((Vc * 1000) / (Math.PI * Dt));

    // Feed
    const fz = input.feed_per_tooth_mm ?? DEFAULT_FZ[mat] ?? 0.08;
    const feedRate = r1(fz * flutes * rpm);

    // Total path length estimation
    // Center pass: one circle at ~0 radius (full-slot)
    // Each subsequent ring: circumference at that radius
    let totalPath = 0;
    for (let i = 0; i < nRadial; i++) {
      const ringRadius = toolRadius + ae * (i + 1);
      const circ = 2 * Math.PI * Math.min(ringRadius, pocketRadius);
      totalPath += circ;
    }
    // Add center plunge circle
    totalPath += Math.PI * helixDia;
    // Multiply by number of levels
    totalPath *= nLevels;
    // Add floor finish pass if requested
    if (floorFinish) {
      totalPath += nRadial * 2 * Math.PI * (pocketRadius / 2);
    }

    // MRR
    const mrrVal = (ae * ap * feedRate) / 1000;

    // Cycle time
    const helixEntryTime = nLevels * (ap / helixPitch)
      * (Math.PI * helixDia) / (feedRate * 0.5);
    const cuttingTime = feedRate > 0 ? totalPath / feedRate : 0;
    const totalTime = cuttingTime + helixEntryTime;

    // Warnings
    if (depth > Dt * 3) {
      warnings.push(
        `Deep pocket (${r1(depth / Dt)}×D) — ensure long reach tool`
      );
    }
    if (stepPct > 60) {
      warnings.push(
        "Stepover > 60% — high tool engagement, risk of chatter"
      );
    }
    if (helixDia < 2) {
      warnings.push(
        "Helix entry diameter very small — risk of tool rubbing"
      );
    }
    if (mat === "titanium" && stepPct > 30) {
      warnings.push(
        "Titanium with > 30% stepover — reduce for heat management"
      );
    }

    return {
      number_of_radial_passes: av(nRadial, "passes", 0,
        `${r1(radialDistance)}mm / ${r1(ae)}mm stepover`),
      stepover: av(r2(ae), "mm", 0.05,
        `${stepPct}% of Ø${Dt}mm`),
      axial_depth_per_level: av(r2(ap), "mm", 0.1,
        `Min(0.5×Dt, ${depth}mm depth)`),
      number_of_levels: av(nLevels, "levels", 0,
        `${depth}mm / ${r2(ap)}mm per level`),
      helix_entry_diameter: av(r2(helixDia), "mm", 0.1,
        "80% of tool dia or available space"),
      helix_pitch: av(r3(helixPitch), "mm/rev", 0.05,
        `π × ${r2(helixDia)} × tan(${helixAngle}°)`),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${Dt}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fz=${fz} × ${flutes}fl × ${rpm}rpm`),
      total_path_length: av(r0(totalPath), "mm", 50,
        `${nRadial} rings × ${nLevels} levels`),
      mrr: av(r2(mrrVal), "cm³/min", 0.5,
        "ae × ap × feed / 1000"),
      cycle_time: av(r2(totalTime), "min", 0.2,
        "Cutting + helical entries"),
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

export const circularPocketEngine = new CircularPocketEngine();
