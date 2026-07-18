/**
 * BarFeederEngine — Bar Feeder Optimization Calculator
 *
 * Calculates bar stock utilization and production metrics:
 * - Parts per bar from stock length and cutoff
 * - Remnant length and waste percentage
 * - Feed time between parts
 * - Collet capacity verification
 * - Production rate (bars/shift, parts/shift)
 * - Bar whip speed limits
 *
 * Key physics: Parts per bar = floor((L_bar - L_remnant) /
 * (L_part + L_cutoff)). Bar whip critical speed depends on
 * unsupported length and bar diameter — limit surface speed
 * to prevent vibration. Guide bushing clearance affects
 * Swiss-type accuracy.
 *
 * Reference: LNS bar feeder technical guide,
 *            IEMCA Genius operating manual,
 *            Swiss-type machining handbook
 *
 * Actions: bar_feeder_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BarFeederInput {
  bar_length_mm?: number;
  bar_diameter_mm: number;
  part_length_mm: number;
  cutoff_width_mm?: number;
  facing_allowance_mm?: number;
  remnant_min_mm?: number;
  collet_capacity_mm?: number;
  feeder_type?: "short" | "long" | "magazine";
  machine_type?: "cnc_lathe" | "swiss" | "multispindle";
  cycle_time_sec?: number;
  bar_feed_speed_mm_sec?: number;
  spindle_rpm?: number;
  shift_hours?: number;
  bars_available?: number;
}

export interface BarFeederResult {
  parts_per_bar: AtomicValue;
  total_part_pitch: AtomicValue;
  remnant_length: AtomicValue;
  waste_percent: AtomicValue;
  bar_feed_time: AtomicValue;
  bar_change_time: AtomicValue;
  parts_per_shift: AtomicValue;
  bars_per_shift: AtomicValue;
  material_utilization: AtomicValue;
  max_rpm_whip: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard bar lengths (mm) */
const BAR_LENGTHS: Record<string, number> = {
  short: 1500,  // short loader
  long: 3000,   // standard long bar
  magazine: 3000,
};

/** Bar change time (seconds) by feeder type */
const CHANGE_TIMES: Record<string, number> = {
  short: 15,
  long: 30,
  magazine: 8,
};

/** Minimum remnant by machine type */
const MIN_REMNANTS: Record<string, number> = {
  cnc_lathe: 150,
  swiss: 80,
  multispindle: 200,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BarFeederEngine {
  calculate(input: BarFeederInput): BarFeederResult {
    const warnings: string[] = [];
    const feederType = input.feeder_type ?? "long";
    const machType = input.machine_type ?? "cnc_lathe";
    const barLen = input.bar_length_mm ?? BAR_LENGTHS[feederType] ?? 3000;
    const barDia = input.bar_diameter_mm;
    const partLen = input.part_length_mm;
    const cutoff = input.cutoff_width_mm ?? 3;
    const facing = input.facing_allowance_mm ?? 0.5;
    const remnantMin = input.remnant_min_mm
      ?? MIN_REMNANTS[machType] ?? 150;
    const colletCap = input.collet_capacity_mm ?? barDia + 5;
    const cycleTime = input.cycle_time_sec ?? 60;
    const feedSpeed = input.bar_feed_speed_mm_sec ?? 500;
    const rpm = input.spindle_rpm ?? 2000;
    const shiftHrs = input.shift_hours ?? 8;
    const barsAvail = input.bars_available;

    // Part pitch = part length + cutoff + facing
    const partPitch = partLen + cutoff + facing;

    // Usable bar length
    const usableLen = barLen - remnantMin;

    // Parts per bar
    const partsPerBar = Math.max(Math.floor(usableLen / partPitch), 0);

    // Actual remnant
    const usedLen = partsPerBar * partPitch;
    const remnant = barLen - usedLen;

    // Waste percentage (remnant + cutoff kerf)
    const totalCutoffWaste = partsPerBar * cutoff;
    const totalFacingWaste = partsPerBar * facing;
    const wasteLen = remnant + totalCutoffWaste + totalFacingWaste;
    const wastePct = barLen > 0 ? (wasteLen / barLen) * 100 : 100;

    // Material utilization (actual part material / bar)
    const partMaterial = partsPerBar * partLen;
    const utilization = barLen > 0
      ? (partMaterial / barLen) * 100 : 0;

    // Bar feed time per part
    const feedTime = feedSpeed > 0 ? partPitch / feedSpeed : 0;

    // Bar change time
    const changeTime = CHANGE_TIMES[feederType] ?? 30;

    // Production calculations
    const totalCyclePerPart = cycleTime + feedTime;
    const shiftSec = shiftHrs * 3600;
    // Account for bar changes
    const partsBeforeChange = partsPerBar;
    const timePerBar = partsBeforeChange > 0
      ? partsBeforeChange * totalCyclePerPart + changeTime : shiftSec;
    const barsPerShift = timePerBar > 0
      ? Math.floor(shiftSec / timePerBar) : 0;
    const partsPerShift = barsPerShift * partsPerBar;

    // Bar whip critical speed
    // Simplified: max surface speed = 25 m/s for unsupported bar
    // RPM = (25000 * 60) / (π * D)
    const maxRpmWhip = (25000 * 60) / (Math.PI * barDia);

    // Warnings
    if (barDia > colletCap) {
      warnings.push(
        `Bar diameter ${barDia}mm exceeds collet capacity ` +
        `${colletCap}mm — change collet`
      );
    }
    if (partsPerBar < 3) {
      warnings.push(
        `Only ${partsPerBar} parts per bar — ` +
        "consider shorter parts or longer bars"
      );
    }
    if (wastePct > 25) {
      warnings.push(
        `Waste ${r1(wastePct)}% is high — ` +
        "optimize part length or bar size"
      );
    }
    if (rpm > maxRpmWhip) {
      warnings.push(
        `RPM ${rpm} exceeds bar whip limit ${r0(maxRpmWhip)} — ` +
        "reduce speed or add guide bushing"
      );
    }
    if (remnant > remnantMin * 2) {
      warnings.push(
        `Large remnant ${r0(remnant)}mm — ` +
        "consider making one more shorter part"
      );
    }
    if (machType === "swiss" && barDia > 32) {
      warnings.push(
        "Bar diameter >32mm uncommon for Swiss — " +
        "verify machine capacity"
      );
    }

    return {
      parts_per_bar: av(partsPerBar, "pcs", 0,
        `floor((${barLen} - ${remnantMin}) / ${r1(partPitch)})`),
      total_part_pitch: av(r2(partPitch), "mm", 0.1,
        `${partLen} + ${cutoff} cutoff + ${facing} facing`),
      remnant_length: av(r1(remnant), "mm", 1,
        `${barLen} - ${partsPerBar} × ${r1(partPitch)}`),
      waste_percent: av(r1(wastePct), "%", 0.5,
        "Remnant + cutoff + facing waste"),
      bar_feed_time: av(r2(feedTime), "sec", 0.05,
        `${r1(partPitch)}mm / ${feedSpeed} mm/s`),
      bar_change_time: av(changeTime, "sec", 2,
        `${feederType} feeder`),
      parts_per_shift: av(partsPerShift, "pcs", 1,
        `${barsPerShift} bars × ${partsPerBar} pcs`),
      bars_per_shift: av(barsPerShift, "bars", 0,
        `${r0(shiftSec)}s / ${r1(timePerBar)}s per bar`),
      material_utilization: av(r1(utilization), "%", 0.5,
        "Part material / total bar"),
      max_rpm_whip: av(r0(maxRpmWhip), "rpm", 100,
        `25 m/s surface speed limit for ${barDia}mm bar`),
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

export const barFeederEngine = new BarFeederEngine();
