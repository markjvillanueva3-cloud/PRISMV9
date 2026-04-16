/**
 * ToolBalancingEngine — Tool Assembly Balancing Calculations
 *
 * Calculates balance quality requirements for rotating tool assemblies:
 * - ISO 1940-1 balance grade (G2.5, G6.3, G16, G40)
 * - Permissible residual unbalance from RPM and mass
 * - Centrifugal force from unbalance at speed
 * - Required balance grade for target surface finish
 * - Balancing ring mass/position calculations
 *
 * Reference: ISO 1940-1:2003 (Balance quality requirements),
 *            ANSI S2.19, DIN ISO 1940,
 *            Haimer balance technology guide
 *
 * Actions: balance_grade, balance_force, balance_check,
 *          balance_correction
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type BalanceGrade =
  | "G0.4" | "G1" | "G2.5" | "G6.3"
  | "G16" | "G40" | "G100";

export interface BalanceInput {
  rpm: number;
  tool_mass_kg: number;
  holder_mass_kg?: number;
  balance_grade?: BalanceGrade;
  measured_unbalance_gmm?: number;
}

export interface BalanceResult {
  balance_grade: BalanceGrade;
  permissible_unbalance: AtomicValue;
  permissible_eccentricity: AtomicValue;
  centrifugal_force_at_rpm: AtomicValue;
  is_balanced: boolean;
  recommendation: string;
  warnings: string[];
}

export interface BalanceCorrectionResult {
  correction_mass: AtomicValue;
  correction_radius: AtomicValue;
  correction_angle: AtomicValue;
  alternative_masses: Array<{
    mass_g: number;
    radius_mm: number;
  }>;
}

export interface BalanceForceResult {
  centrifugal_force: AtomicValue;
  bearing_load_increase: AtomicValue;
  vibration_amplitude: AtomicValue;
  safe_for_spindle: boolean;
}

// ── ISO 1940-1 Balance Grade Data ─────────────────────────────────

/** ISO 1940-1 balance grade → permissible specific unbalance (mm/s) */
const GRADE_EPER: Record<BalanceGrade, number> = {
  "G0.4": 0.4,
  "G1": 1.0,
  "G2.5": 2.5,
  "G6.3": 6.3,
  "G16": 16,
  "G40": 40,
  "G100": 100,
};

/** Recommended balance grade by RPM range */
function recommendedGrade(rpm: number): BalanceGrade {
  if (rpm >= 30000) return "G1";
  if (rpm >= 20000) return "G2.5";
  if (rpm >= 12000) return "G2.5";
  if (rpm >= 8000) return "G6.3";
  if (rpm >= 4000) return "G6.3";
  return "G16";
}

// ── Engine ─────────────────────────────────────────────────────────

export class ToolBalancingEngine {
  /**
   * Calculate balance requirements for a tool assembly.
   */
  calculate(input: BalanceInput): BalanceResult {
    const warnings: string[] = [];
    const rpm = input.rpm;
    const totalMass = input.tool_mass_kg + (input.holder_mass_kg ?? 0);
    const grade = input.balance_grade ?? recommendedGrade(rpm);
    const eper = GRADE_EPER[grade]; // mm/s

    // Angular velocity (rad/s)
    const omega = (2 * Math.PI * rpm) / 60;

    // Permissible residual unbalance (g·mm)
    // U_per = eper × m × 1000 / omega
    // (eper in mm/s, mass in kg → U in g·mm)
    const uPer = (eper * totalMass * 1000) / omega;

    // Permissible eccentricity (μm)
    // e = U / (m × 1000) in mm → convert to μm
    const eccentricity = (uPer / (totalMass * 1000)) * 1000;

    // Centrifugal force from measured unbalance
    let force = 0;
    let isBalanced = true;
    if (input.measured_unbalance_gmm !== undefined) {
      // F = U × omega² / 1000000 (U in g·mm → F in N)
      force = (input.measured_unbalance_gmm * omega * omega) / 1e6;
      isBalanced = input.measured_unbalance_gmm <= uPer;
    }

    // Warnings
    if (rpm > 30000 && grade !== "G0.4" && grade !== "G1") {
      warnings.push(
        `RPM ${rpm} with ${grade} may cause vibration — ` +
        "consider G1 or G0.4"
      );
    }
    if (totalMass > 15 && rpm > 10000) {
      warnings.push("Heavy assembly at high RPM — verify spindle capacity");
    }
    if (!isBalanced && input.measured_unbalance_gmm) {
      warnings.push(
        `Measured unbalance ${input.measured_unbalance_gmm} g·mm ` +
        `exceeds limit ${round1(uPer)} g·mm`
      );
    }

    let recommendation: string;
    if (!input.measured_unbalance_gmm) {
      recommendation = `Balance to ${grade} (≤${round1(uPer)} g·mm)`;
    } else if (isBalanced) {
      recommendation = `Assembly is balanced — ${grade} requirement met`;
    } else {
      recommendation =
        `Re-balance required — remove ` +
        `${round1(input.measured_unbalance_gmm - uPer)} g·mm`;
    }

    return {
      balance_grade: grade,
      permissible_unbalance: av(round1(uPer), "g·mm", 0.05,
        "ISO 1940-1: U = eper × m / ω"),
      permissible_eccentricity: av(round2(eccentricity), "μm", 0.05,
        "ISO 1940-1: e = U / m"),
      centrifugal_force_at_rpm: av(round1(force), "N", 0.1,
        "F = U × ω² / 10⁶"),
      is_balanced: isBalanced,
      recommendation,
      warnings,
    };
  }

  /**
   * Calculate correction mass needed to balance.
   */
  correction(input: {
    measured_unbalance_gmm: number;
    permissible_unbalance_gmm: number;
    correction_radius_mm: number;
    unbalance_angle_deg?: number;
  }): BalanceCorrectionResult {
    const excess = Math.max(
      0,
      input.measured_unbalance_gmm - input.permissible_unbalance_gmm
    );
    const corrMass = excess / input.correction_radius_mm;
    const angle = input.unbalance_angle_deg ?? 0;

    // Alternative correction masses at different radii
    const alternatives = [10, 15, 20, 25, 30, 40, 50].map(r => ({
      mass_g: round2(excess / r),
      radius_mm: r,
    })).filter(a => a.mass_g > 0.01);

    return {
      correction_mass: av(round2(corrMass), "g", 0.05,
        "U_excess / r_correction"),
      correction_radius: av(
        input.correction_radius_mm, "mm", 0,
        "User-specified correction radius"
      ),
      correction_angle: av(angle + 180, "deg", 0,
        "Opposite to measured unbalance"),
      alternative_masses: alternatives,
    };
  }

  /**
   * Calculate centrifugal force and vibration from unbalance.
   */
  forceAnalysis(input: {
    unbalance_gmm: number;
    rpm: number;
    bearing_span_mm?: number;
    spindle_max_force_n?: number;
  }): BalanceForceResult {
    const omega = (2 * Math.PI * input.rpm) / 60;

    // Centrifugal force (N)
    const force = (input.unbalance_gmm * omega * omega) / 1e6;

    // Bearing load increase (each bearing sees ~50% of force)
    const bearingLoad = force * 0.5;

    // Vibration amplitude (μm) ≈ U / (m_spindle × k)
    // Simplified: amplitude ≈ force / (spindle_stiffness)
    // Typical spindle stiffness: 50-200 N/μm
    const stiffness = 100; // N/μm typical
    const amplitude = force / stiffness;

    // Safe for spindle?
    const maxForce = input.spindle_max_force_n ?? 50;
    const safe = force < maxForce;

    return {
      centrifugal_force: av(round1(force), "N", 0.1,
        "F = U × ω² / 10⁶"),
      bearing_load_increase: av(round1(bearingLoad), "N", 0.15,
        "F / 2 per bearing"),
      vibration_amplitude: av(round2(amplitude), "μm", 0.25,
        "F / k_spindle (est. 100 N/μm)"),
      safe_for_spindle: safe,
    };
  }

  /**
   * Get recommended balance grade for application.
   */
  recommendGrade(input: {
    rpm: number;
    application?: string;
  }): {
    grade: BalanceGrade;
    reason: string;
  } {
    const app = input.application?.toLowerCase() ?? "";

    if (app.includes("grinding") || app.includes("precision")) {
      return { grade: "G1", reason: "Precision grinding spindle" };
    }
    if (app.includes("high speed") || input.rpm > 25000) {
      return { grade: "G1", reason: "High-speed machining (>25k RPM)" };
    }
    if (app.includes("finish") || input.rpm > 15000) {
      return { grade: "G2.5", reason: "Finish machining / high RPM" };
    }

    const grade = recommendedGrade(input.rpm);
    return {
      grade,
      reason: `Standard recommendation for ${input.rpm} RPM`,
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const toolBalancingEngine = new ToolBalancingEngine();
