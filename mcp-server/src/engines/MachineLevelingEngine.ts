/**
 * MachineLevelingEngine — Machine Tool Leveling & Foundation Calculator
 *
 * Calculates leveling requirements:
 * - Maximum allowable tilt for accuracy target
 * - Number and placement of leveling mounts
 * - Foundation thickness requirement
 * - Vibration isolation needs
 * - Geometric error from unlevel condition
 * - Releveling check interval
 *
 * Key physics: A tilt of θ radians causes positioning error
 * ε = L × sin(θ) ≈ L × θ for small angles. For 0.02mm/m
 * precision level bubble = 4 arc-seconds. Foundation mass
 * should be 3-5× machine mass for vibration isolation.
 * Natural frequency of mount system f_n = (1/2π)√(k/m).
 *
 * Reference: ISO 230-1 (geometric accuracy testing),
 *            Renishaw machine leveling guide,
 *            Aerotech machine installation handbook
 *
 * Actions: machine_leveling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface MachineLevelingInput {
  machine_length_mm?: number;
  machine_width_mm?: number;
  machine_mass_kg?: number;
  required_accuracy_mm?: number;
  machine_class?: "standard" | "precision" | "ultraprecision";
  floor_type?: "ground" | "suspended" | "on_grade" | "isolated_pad";
  nearby_vibration?: "none" | "light" | "moderate" | "heavy";
  level_sensitivity_mm_m?: number;
  mount_count?: number;
}

export interface MachineLevelingResult {
  max_tilt_arcsec: AtomicValue;
  max_tilt_mm_per_m: AtomicValue;
  geometric_error: AtomicValue;
  mount_count: AtomicValue;
  foundation_mass: AtomicValue;
  foundation_thickness: AtomicValue;
  isolation_needed: AtomicValue;
  natural_frequency: AtomicValue;
  recheck_interval: AtomicValue;
  level_grade: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Level precision grades (mm/m) */
const LEVEL_GRADES: Record<string, number> = {
  standard: 0.04,       // 8 arc-sec
  precision: 0.02,      // 4 arc-sec
  ultraprecision: 0.005, // 1 arc-sec
};

/** Foundation mass multiplier */
const FOUNDATION_MULT: Record<string, number> = {
  standard: 3,
  precision: 4,
  ultraprecision: 5,
};

// ── Engine ─────────────────────────────────────────────────────────

export class MachineLevelingEngine {
  calculate(input: MachineLevelingInput): MachineLevelingResult {
    const warnings: string[] = [];
    const machL = input.machine_length_mm ?? 2000;
    const machW = input.machine_width_mm ?? 1500;
    const machMass = input.machine_mass_kg ?? 5000;
    const reqAcc = input.required_accuracy_mm ?? 0.010;
    const mClass = input.machine_class ?? "precision";
    const floorType = input.floor_type ?? "on_grade";
    const vibration = input.nearby_vibration ?? "light";
    const levelSens = input.level_sensitivity_mm_m
      ?? LEVEL_GRADES[mClass] ?? 0.02;

    // Max tilt for required accuracy
    // ε = L × θ → θ = ε / L (radians)
    const diagLength = Math.sqrt(machL * machL + machW * machW);
    const maxTiltRad = reqAcc / (diagLength);
    const maxTiltArcSec = maxTiltRad * 206265; // rad to arc-sec
    const maxTiltMmM = maxTiltRad * 1000; // mm/m

    // Geometric error at current level sensitivity
    const geoError = levelSens * (diagLength / 1000);

    // Mount count (one per ~600mm perimeter, minimum 3)
    const perimeter = 2 * (machL + machW);
    const mountCount = input.mount_count
      ?? Math.max(Math.ceil(perimeter / 600), 3);

    // Foundation requirements
    const foundMult = FOUNDATION_MULT[mClass] ?? 4;
    const foundMass = machMass * foundMult;
    // Thickness: assume 2400 kg/m³ concrete, area = machine footprint × 1.3
    const footprint = (machL / 1000) * (machW / 1000) * 1.3;
    const foundThickness = footprint > 0
      ? foundMass / (2400 * footprint) : 0.3;

    // Vibration isolation needed?
    let isoNeeded: boolean;
    if (vibration === "heavy") isoNeeded = true;
    else if (vibration === "moderate" && mClass !== "standard") isoNeeded = true;
    else if (mClass === "ultraprecision") isoNeeded = true;
    else isoNeeded = false;

    // Natural frequency of mount system
    // f_n = (1/2π)√(k/m), target < 5 Hz for isolation
    // With anti-vibration mounts, typical f_n = 3-8 Hz
    const natFreq = mClass === "ultraprecision" ? 2
      : mClass === "precision" ? 5 : 8;

    // Recheck interval (months)
    let recheckMonths: number;
    if (mClass === "ultraprecision") recheckMonths = 1;
    else if (mClass === "precision") recheckMonths = 3;
    else recheckMonths = 6;
    if (floorType === "suspended") recheckMonths = Math.max(recheckMonths - 1, 1);

    // Level grade description
    const gradeDesc = `${levelSens} mm/m`;

    // Warnings
    if (geoError > reqAcc) {
      warnings.push(
        `Level sensitivity ${levelSens} mm/m gives ${r4(geoError)}mm error — ` +
        `exceeds ${reqAcc}mm target, use finer level`
      );
    }
    if (floorType === "suspended") {
      warnings.push(
        "Suspended floor — deflection from machine weight may " +
        "cause leveling issues, verify floor capacity"
      );
    }
    if (vibration === "heavy") {
      warnings.push(
        "Heavy nearby vibration — isolation pads mandatory, " +
        "consider isolated foundation"
      );
    }
    if (foundThickness > 0.5) {
      warnings.push(
        `Foundation ${r2(foundThickness)}m thick needed — ` +
        "verify floor loading capacity"
      );
    }
    if (mClass === "ultraprecision" && floorType !== "isolated_pad") {
      warnings.push(
        "Ultraprecision machine needs isolated foundation pad"
      );
    }
    if (maxTiltArcSec < 2) {
      warnings.push(
        `Required tilt < 2 arc-sec — ` +
        "precision electronic level needed for verification"
      );
    }

    return {
      max_tilt_arcsec: mkAv(r1(maxTiltArcSec), "arc-sec", 0.2,
        `${reqAcc}mm / ${r0(diagLength)}mm diagonal`),
      max_tilt_mm_per_m: mkAv(r4(maxTiltMmM), "mm/m", 0.001,
        `${maxTiltArcSec} arc-sec converted`),
      geometric_error: mkAv(r4(geoError), "mm", 0.002,
        `${levelSens} mm/m × ${r1(diagLength / 1000)}m`),
      mount_count: mkAv(mountCount, "mounts", 0,
        `Perimeter ${r0(perimeter)}mm / 600mm`),
      foundation_mass: mkAv(r0(foundMass), "kg", 100,
        `${machMass}kg × ${foundMult}`),
      foundation_thickness: mkAv(r2(foundThickness), "m", 0.02,
        `${r0(foundMass)}kg / (2400 × ${r1(footprint)}m²)`),
      isolation_needed: mkAv(isoNeeded ? 1 : 0,
        isoNeeded ? "YES" : "NO", 0,
        `${mClass}, ${vibration} vibration`),
      natural_frequency: mkAv(natFreq, "Hz", 1,
        `Target for ${mClass} class`),
      recheck_interval: mkAv(recheckMonths, "months", 0,
        `${mClass}, ${floorType} floor`),
      level_grade: mkAv(levelSens * 1000, gradeDesc, 0,
        `${mClass} standard`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const machineLevelingEngine = new MachineLevelingEngine();
