/**
 * HelicalInterpolationEngine — Helical Milling Calculations
 *
 * Calculates parameters for helical interpolation operations:
 * - Thread milling (internal/external threads via helix)
 * - Helical bore milling (circular interpolation for bores)
 * - Helical ramping entry into pockets
 * - Effective cutting parameters during helix
 *
 * Key physics: During helical interpolation, the effective
 * chip load and cutting speed differ from linear milling due
 * to the helical tool path geometry.
 *
 * Reference: Sandvik Thread Milling Guide,
 *            Emuge thread milling handbook,
 *            Machinery's Handbook Ch.26 "Thread Milling"
 *
 * Actions: helix_thread_mill, helix_bore_mill, helix_ramp,
 *          helix_effective_params
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ThreadMillInput {
  thread_diameter_mm: number;
  pitch_mm: number;
  thread_type?: "internal" | "external";
  tool_diameter_mm: number;
  num_flutes: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  depth_mm?: number;
  single_pass?: boolean;
}

export interface ThreadMillResult {
  helix_diameter: AtomicValue;
  programmed_feed: AtomicValue;
  effective_chip_load: AtomicValue;
  spindle_rpm: AtomicValue;
  cutting_speed: AtomicValue;
  number_of_passes: AtomicValue;
  cycle_time: AtomicValue;
  climb_or_conventional: string;
  g_code_hint: string;
  warnings: string[];
}

export interface BoreMillInput {
  target_diameter_mm: number;
  tool_diameter_mm: number;
  num_flutes: number;
  depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  step_down_mm?: number;
}

export interface BoreMillResult {
  helix_diameter: AtomicValue;
  radial_depth: AtomicValue;
  axial_step: AtomicValue;
  spindle_rpm: AtomicValue;
  programmed_feed: AtomicValue;
  effective_chip_load: AtomicValue;
  number_of_helixes: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

export interface RampInput {
  pocket_diameter_mm: number;
  tool_diameter_mm: number;
  ramp_angle_deg?: number;
  depth_mm: number;
  num_flutes: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface RampResult {
  ramp_angle: AtomicValue;
  helix_diameter: AtomicValue;
  axial_feed_per_rev: AtomicValue;
  programmed_feed: AtomicValue;
  number_of_ramp_revs: AtomicValue;
  ramp_distance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Base cutting speed for thread/bore milling (m/min) */
const HELIX_SPEEDS: Record<string, number> = {
  P: 100, M: 60, K: 120, N: 250, S: 35, H: 50,
};

/** Base chip load (mm/tooth) for thread milling */
const THREAD_CHIP_LOADS: Record<string, number> = {
  P: 0.05, M: 0.04, K: 0.06, N: 0.08, S: 0.03, H: 0.03,
};

/** Max ramp angle by material (degrees) */
const MAX_RAMP_ANGLES: Record<string, number> = {
  P: 3.0, M: 2.0, K: 4.0, N: 5.0, S: 1.5, H: 1.5,
};

// ── Engine ─────────────────────────────────────────────────────────

export class HelicalInterpolationEngine {
  /**
   * Calculate thread milling parameters.
   */
  threadMill(input: ThreadMillInput): ThreadMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.thread_diameter_mm;
    const d = input.tool_diameter_mm;
    const pitch = input.pitch_mm;
    const z = input.num_flutes;
    const isInternal = (input.thread_type ?? "internal") === "internal";

    // Helix diameter = thread diameter - tool diameter (internal)
    // or thread diameter + tool diameter (external)
    const helixDia = isInternal ? D - d : D + d;

    if (helixDia <= 0) {
      warnings.push(
        "Tool diameter exceeds thread diameter — " +
        "cannot thread mill internally"
      );
    }

    // Cutting speed and RPM (based on tool diameter)
    const vc = HELIX_SPEEDS[iso] ?? 100;
    const rpm = (vc * 1000) / (Math.PI * d);

    // Chip load at tool center
    const fzBase = THREAD_CHIP_LOADS[iso] ?? 0.05;

    // Effective chip load compensation
    // When milling on a helix, the actual chip load is:
    // fz_eff = fz_programmed × (D_helix / D_tool)
    // So: fz_programmed = fz_desired × (D_tool / D_helix)
    const fzProgrammed = helixDia > 0
      ? fzBase * (d / helixDia)
      : fzBase;

    // Programmed feed rate (mm/min)
    const feedProgrammed = fzProgrammed * z * rpm;

    // Number of passes (single-form: 1 pass per thread pitch)
    const depth = input.depth_mm ?? D;
    const numPasses = input.single_pass
      ? 1
      : Math.ceil(depth / pitch);

    // Cycle time
    // Each pass = one helix revolution at pitch
    const helixCircumference = Math.PI * Math.abs(helixDia);
    const timePerPass = helixCircumference > 0
      ? helixCircumference / feedProgrammed
      : 0;
    const cycleTime = timePerPass * numPasses;

    // Climb vs conventional
    const direction = isInternal ? "climb (G3)" : "conventional (G2)";

    // G-code hint
    const gCode = isInternal
      ? `G0 X${r2(helixDia / 2)} Y0 Z2\n` +
        `G1 Z-${pitch} F${Math.round(feedProgrammed)}\n` +
        `G3 X${r2(helixDia / 2)} Y0 ` +
        `Z-${r2(pitch * 2)} ` +
        `I-${r2(helixDia / 2)} J0`
      : `G2 I-${r2(helixDia / 2)} J0 Z-${r2(pitch)}`;

    if (d / D > 0.75) {
      warnings.push("Tool/thread ratio > 75% — limited chip clearance");
    }

    return {
      helix_diameter: av(r2(Math.abs(helixDia)), "mm", 0.05,
        isInternal ? "D_thread - D_tool" : "D_thread + D_tool"),
      programmed_feed: av(Math.round(feedProgrammed), "mm/min", 0.1,
        "fz_prog × z × RPM"),
      effective_chip_load: av(r3(fzBase), "mm/tooth", 0.1,
        "Sandvik thread milling guide"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Thread milling speed tables"),
      number_of_passes: av(numPasses, "passes", 0,
        "depth / pitch"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "helix_circ / feed × passes"),
      climb_or_conventional: direction,
      g_code_hint: gCode,
      warnings,
    };
  }

  /**
   * Calculate helical bore milling parameters.
   */
  boreMill(input: BoreMillInput): BoreMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.target_diameter_mm;
    const d = input.tool_diameter_mm;
    const z = input.num_flutes;
    const depth = input.depth_mm;

    const helixDia = D - d;
    const radialDepth = helixDia / 2;
    const stepDown = input.step_down_mm ?? d * 0.5;

    if (helixDia <= 0) {
      warnings.push("Tool too large for target bore");
    }

    const vc = HELIX_SPEEDS[iso] ?? 100;
    const rpm = (vc * 1000) / (Math.PI * d);

    const fzBase = THREAD_CHIP_LOADS[iso] ?? 0.05;
    const fzProg = helixDia > 0
      ? fzBase * (d / helixDia)
      : fzBase;
    const feedProg = fzProg * z * rpm;

    const numHelixes = Math.ceil(depth / stepDown);
    const helixCirc = Math.PI * Math.abs(helixDia);
    const cycleTime = helixCirc > 0
      ? (helixCirc / feedProg) * numHelixes
      : 0;

    if (radialDepth > d * 0.5) {
      warnings.push(
        "Radial depth > 50% of tool diameter — " +
        "consider smaller step or larger tool"
      );
    }

    return {
      helix_diameter: av(r2(Math.abs(helixDia)), "mm", 0.05,
        "D_target - D_tool"),
      radial_depth: av(r2(radialDepth), "mm", 0.05,
        "helix_dia / 2"),
      axial_step: av(r2(stepDown), "mm", 0.05,
        "Step-down per helix revolution"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz_prog × z × RPM"),
      effective_chip_load: av(r3(fzBase), "mm/tooth", 0.1,
        "Compensated for helix path"),
      number_of_helixes: av(numHelixes, "revolutions", 0,
        "depth / step_down"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "helix_circ / feed × revolutions"),
      warnings,
    };
  }

  /**
   * Calculate helical ramping entry parameters.
   */
  ramp(input: RampInput): RampResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const pocketDia = input.pocket_diameter_mm;
    const d = input.tool_diameter_mm;
    const depth = input.depth_mm;
    const z = input.num_flutes;

    const maxAngle = MAX_RAMP_ANGLES[iso] ?? 3.0;
    const rampAngle = input.ramp_angle_deg ?? maxAngle * 0.8;

    if (rampAngle > maxAngle) {
      warnings.push(
        `Ramp angle ${rampAngle}° exceeds max ${maxAngle}° ` +
        `for ISO ${iso}`
      );
    }

    const helixDia = pocketDia - d;
    if (helixDia <= 0) {
      warnings.push("Tool too large to ramp in pocket");
    }

    // Axial feed per revolution
    const helixCirc = Math.PI * Math.abs(helixDia);
    const axialPerRev = helixCirc *
      Math.tan(rampAngle * Math.PI / 180);

    const numRevs = axialPerRev > 0
      ? Math.ceil(depth / axialPerRev) : 1;
    const rampDist = helixCirc * numRevs;

    const vc = (HELIX_SPEEDS[iso] ?? 100) * 0.7; // reduce for ramp
    const rpm = (vc * 1000) / (Math.PI * d);
    const fz = (THREAD_CHIP_LOADS[iso] ?? 0.05) * 0.6;
    const feedProg = fz * z * rpm;

    return {
      ramp_angle: av(r2(rampAngle), "deg", 0.1,
        "Max angle × 0.8 safety"),
      helix_diameter: av(r2(Math.abs(helixDia)), "mm", 0.05,
        "pocket_dia - tool_dia"),
      axial_feed_per_rev: av(r3(axialPerRev), "mm/rev", 0.1,
        "helix_circ × tan(angle)"),
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz × z × RPM (reduced 40%)"),
      number_of_ramp_revs: av(numRevs, "revolutions", 0,
        "depth / axial_per_rev"),
      ramp_distance: av(r1(rampDist), "mm", 0.1,
        "helix_circ × revolutions"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const helicalInterpolationEngine =
  new HelicalInterpolationEngine();
