/**
 * WorkholdingForceEngine — Workholding Clamping Force Calculations
 *
 * Calculates required clamping forces for workholding:
 * - Vise clamping force for milling
 * - Chuck jaw force for turning
 * - Vacuum/magnetic holding force
 * - Safety factor validation
 * - Friction coefficient effects
 *
 * Key physics: Clamping force must overcome cutting forces with
 * a safety factor. F_clamp = F_cutting × SF / μ where μ is the
 * friction coefficient between workpiece and fixture.
 *
 * Reference: Carr Lane workholding guide,
 *            SME Fundamentals of Tool Design Ch.8,
 *            Machinery's Handbook Ch.25
 *
 * Actions: clamp_force_calc, chuck_force, vacuum_hold
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type WorkholdingType =
  | "vise" | "chuck_3jaw" | "chuck_6jaw"
  | "vacuum" | "magnetic" | "fixture_plate";

export interface ClampForceInput {
  cutting_force_n: number;
  workholding_type?: WorkholdingType;
  friction_coefficient?: number;
  safety_factor?: number;
  num_clamps?: number;
  workpiece_mass_kg?: number;
}

export interface ClampForceResult {
  required_force: AtomicValue;
  force_per_clamp: AtomicValue;
  friction_coefficient: AtomicValue;
  safety_factor: AtomicValue;
  torque_nm: AtomicValue;
  is_sufficient: boolean;
  warnings: string[];
}

export interface ChuckForceInput {
  cutting_force_tangential_n: number;
  cutting_force_radial_n?: number;
  workpiece_diameter_mm: number;
  chuck_diameter_mm?: number;
  rpm: number;
  workpiece_mass_kg: number;
  num_jaws?: number;
  friction_coefficient?: number;
  safety_factor?: number;
}

export interface ChuckForceResult {
  required_grip_force: AtomicValue;
  centrifugal_force: AtomicValue;
  total_required: AtomicValue;
  force_per_jaw: AtomicValue;
  is_safe: boolean;
  max_safe_rpm: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Default friction coefficients by workholding type */
const FRICTION_COEFF: Record<WorkholdingType, number> = {
  vise: 0.15,          // smooth jaws on metal
  chuck_3jaw: 0.20,    // serrated jaws
  chuck_6jaw: 0.25,    // more contact area
  vacuum: 0.30,        // rubber seal
  magnetic: 0.20,      // steel on magnet
  fixture_plate: 0.25, // clamp pads
};

/** Default safety factors */
const SAFETY_FACTORS: Record<WorkholdingType, number> = {
  vise: 2.0,
  chuck_3jaw: 2.5,
  chuck_6jaw: 2.0,
  vacuum: 3.0,
  magnetic: 3.0,
  fixture_plate: 2.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class WorkholdingForceEngine {
  /**
   * Calculate required clamping force.
   */
  clampForce(input: ClampForceInput): ClampForceResult {
    const warnings: string[] = [];
    const type = input.workholding_type ?? "vise";
    const mu = input.friction_coefficient ?? FRICTION_COEFF[type];
    const sf = input.safety_factor ?? SAFETY_FACTORS[type];
    const nClamps = input.num_clamps ?? (type === "vise" ? 1 : 2);
    const fc = input.cutting_force_n;

    // Required total clamping force
    // F_clamp = F_cutting × SF / μ
    const requiredForce = (fc * sf) / mu;

    // Force per clamp
    const forcePerClamp = requiredForce / nClamps;

    // Vise torque (Nm) — approximate from bolt size
    // Standard vise: M12 bolt, pitch 1.75mm
    // T = F × d × (0.16 + μ_thread) ≈ F × 0.002
    const torque = forcePerClamp * 0.002;

    // Check gravity for vertical setups
    if (input.workpiece_mass_kg) {
      const gravity = input.workpiece_mass_kg * 9.81;
      if (gravity > requiredForce * mu * 0.5) {
        warnings.push(
          "Workpiece weight significant relative to " +
          "clamping friction — verify orientation"
        );
      }
    }

    if (type === "vacuum" && fc > 500) {
      warnings.push(
        "High cutting force for vacuum holding — " +
        "consider mechanical backup"
      );
    }
    if (type === "magnetic" && fc > 1000) {
      warnings.push(
        "High cutting force for magnetic chuck — " +
        "add mechanical stops"
      );
    }
    if (sf < 1.5) {
      warnings.push(
        "Safety factor < 1.5 — dangerously low"
      );
    }

    return {
      required_force: av(Math.round(requiredForce), "N", 0.15,
        "F_cut × SF / μ"),
      force_per_clamp: av(Math.round(forcePerClamp), "N", 0.15,
        "Total / num_clamps"),
      friction_coefficient: av(mu, "ratio", 0.1,
        `${type} default or specified`),
      safety_factor: av(sf, "ratio", 0,
        `${type} recommended SF`),
      torque_nm: av(r1(torque), "Nm", 0.2,
        "F × 0.002 (M12 bolt approx)"),
      is_sufficient: true, // calculation gives required, not check
      warnings,
    };
  }

  /**
   * Calculate chuck jaw grip force for turning.
   */
  chuckForce(input: ChuckForceInput): ChuckForceResult {
    const warnings: string[] = [];
    const nJaws = input.num_jaws ?? 3;
    const mu = input.friction_coefficient ?? 0.20;
    const sf = input.safety_factor ?? 2.5;
    const rpm = input.rpm;
    const mass = input.workpiece_mass_kg;
    const wpDia = input.workpiece_diameter_mm;
    const ft = input.cutting_force_tangential_n;
    const fr = input.cutting_force_radial_n ?? ft * 0.4;

    // Required grip force from cutting forces
    // F_grip = (F_tangential × SF) / (μ × n_jaws)
    const gripFromCutting = (ft * sf) / (mu * nJaws);

    // Centrifugal force on workpiece
    // F_cent = m × ω² × r
    const omega = (2 * Math.PI * rpm) / 60;
    const r = (wpDia / 2) / 1000; // mm → m
    const centrifugalForce = mass * omega * omega * r;

    // Total required per jaw
    const totalRequired = gripFromCutting +
      (centrifugalForce / nJaws);
    const forcePerJaw = totalRequired;

    // Max safe RPM (where centrifugal = 50% of grip)
    // m × ω² × r = 0.5 × F_grip_static
    const gripStatic = gripFromCutting * nJaws;
    const maxOmega = Math.sqrt(
      (0.5 * gripStatic) / (mass * Math.max(r, 0.001))
    );
    const maxRpm = (maxOmega * 60) / (2 * Math.PI);

    // Warnings
    if (rpm > maxRpm * 0.8) {
      warnings.push(
        `RPM ${rpm} approaching max safe RPM ${Math.round(maxRpm)} — ` +
        "increase grip force or reduce speed"
      );
    }
    if (centrifugalForce > gripFromCutting * nJaws * 0.3) {
      warnings.push(
        "Centrifugal force > 30% of grip — " +
        "significant at this RPM"
      );
    }
    if (nJaws === 3 && wpDia > 200) {
      warnings.push(
        "Large workpiece in 3-jaw — consider 6-jaw " +
        "for better grip distribution"
      );
    }

    const isSafe = rpm <= maxRpm;

    return {
      required_grip_force: av(
        Math.round(gripFromCutting), "N", 0.15,
        "F_cut × SF / (μ × n_jaws)"
      ),
      centrifugal_force: av(
        Math.round(centrifugalForce), "N", 0.1,
        "m × ω² × r"
      ),
      total_required: av(
        Math.round(totalRequired), "N/jaw", 0.15,
        "Grip + centrifugal per jaw"
      ),
      force_per_jaw: av(
        Math.round(forcePerJaw), "N", 0.15,
        "Total required per jaw"
      ),
      is_safe: isSafe,
      max_safe_rpm: av(
        Math.round(maxRpm), "rev/min", 0.15,
        "Where centrifugal = 50% grip"
      ),
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

export const workholdingForceEngine =
  new WorkholdingForceEngine();
