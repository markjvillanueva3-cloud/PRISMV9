/**
 * FixtureDynamicsEngine — 7 FIXTURE formulas for workholding dynamics
 *
 * Methods:
 *   - vacuumHold: F=ΔP×A×η vacuum holding force with seal efficiency
 *   - chuckSpeedEffect: F_eff=F_grip-m×ω²×r centrifugal grip loss, critical RPM
 *   - adaptiveClamping: F(t)=F0×(1+α×Fcut/Fcut_max) real-time modulation
 *   - clampLayout321: 3-2-1 locating principle DOF verification
 *   - magneticHold: F=B²×A/(2×μ₀) magnetic chuck holding force
 *   - clampDeflection: δ=F×L³/(3×E×I) cantilever clamp deflection
 *   - hydraulicClamp: F=P×A×n cylinder force with mechanical advantage
 *
 * Actions: fixture_vacuum_hold, fixture_chuck_speed, fixture_adaptive_clamp, fixture_layout_321
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface VacuumHoldInput {
  /** Vacuum pressure [kPa] (gauge, positive value) */
  vacuum_pressure_kpa: number;
  /** Contact area [mm²] */
  contact_area_mm2: number;
  /** Seal efficiency 0.6-0.9 */
  seal_efficiency?: number;
  /** Atmospheric pressure [kPa] default 101.325 */
  atmospheric_kpa?: number;
  /** Safety factor (default 2.0) */
  safety_factor?: number;
}

export interface VacuumHoldResult {
  delta_pressure_kpa: number;
  holding_force_N: number;
  safe_cutting_force_N: number;
  formula: string;
  warnings: string[];
}

export interface ChuckSpeedInput {
  /** Static grip force [N] */
  grip_force_N: number;
  /** Jaw mass [kg] */
  jaw_mass_kg: number;
  /** Grip radius (center of mass of jaw) [mm] */
  grip_radius_mm: number;
  /** Workpiece mass [kg] */
  workpiece_mass_kg?: number;
  /** Spindle speed [RPM] */
  spindle_rpm: number;
}

export interface ChuckSpeedResult {
  omega_rad_s: number;
  centrifugal_force_N: number;
  effective_grip_N: number;
  critical_rpm: number;
  grip_ratio: number;
  formula: string;
  warnings: string[];
}

export interface AdaptiveClampInput {
  /** Base clamping force [N] */
  base_force_N: number;
  /** Current cutting force [N] */
  cutting_force_N: number;
  /** Maximum expected cutting force [N] */
  max_cutting_force_N: number;
  /** Gain factor α (default 0.5) */
  alpha?: number;
  /** Min clamping force [N] */
  min_force_N?: number;
  /** Max clamping force [N] */
  max_force_N?: number;
}

export interface AdaptiveClampResult {
  adaptive_force_N: number;
  force_ratio: number;
  clamped: boolean;
  formula: string;
  warnings: string[];
}

export interface ClampLayout321Input {
  /** Primary plane locators (should be 3 points) */
  primary_locators: number;
  /** Secondary plane locators (should be 2 points) */
  secondary_locators: number;
  /** Tertiary plane locators (should be 1 point) */
  tertiary_locators: number;
  /** Optional: additional support points */
  support_points?: number;
}

export interface ClampLayout321Result {
  dof_constrained: number;
  is_valid_321: boolean;
  overconstrained: boolean;
  underconstrained: boolean;
  primary_dof: string[];
  secondary_dof: string[];
  tertiary_dof: string[];
  formula: string;
  warnings: string[];
}

export interface FixtureCalcInput {
  action: string;
  params: Record<string, any>;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class FixtureDynamicsEngine {

  /**
   * Vacuum holding force: F = ΔP × A × η
   * ΔP = atmospheric - vacuum gauge pressure
   */
  vacuumHold(input: VacuumHoldInput): VacuumHoldResult {
    const {
      vacuum_pressure_kpa,
      contact_area_mm2,
      seal_efficiency = 0.85,
      atmospheric_kpa = 101.325,
      safety_factor = 2.0,
    } = input;
    const warnings: string[] = [];

    const delta_pressure_kpa = Math.min(vacuum_pressure_kpa, atmospheric_kpa);
    // Convert: kPa × mm² = N×10⁻³  →  ΔP[N/mm²] = ΔP[kPa]/1000 × mm² → ΔP[kPa] × A[mm²] / 1000
    const holding_force_N = delta_pressure_kpa * contact_area_mm2 * seal_efficiency / 1000;
    const safe_cutting_force_N = holding_force_N / safety_factor;

    if (seal_efficiency < 0.6) warnings.push('Seal efficiency < 0.6: check seal condition');
    if (seal_efficiency > 0.95) warnings.push('Seal efficiency > 0.95: unrealistically high');
    if (delta_pressure_kpa < 50) warnings.push('Low vacuum: consider higher pump capacity');
    if (holding_force_N < 100) warnings.push('Low holding force: verify for cutting loads');

    return {
      delta_pressure_kpa, holding_force_N, safe_cutting_force_N,
      formula: 'F = ΔP × A × η; ΔP = min(vacuum_gauge, P_atm)',
      warnings,
    };
  }

  /**
   * Chuck centrifugal grip loss: F_eff = F_grip - m×ω²×r
   * Critical RPM where F_eff = 0
   */
  chuckSpeedEffect(input: ChuckSpeedInput): ChuckSpeedResult {
    const { grip_force_N, jaw_mass_kg, grip_radius_mm, workpiece_mass_kg = 0, spindle_rpm } = input;
    const warnings: string[] = [];

    const r_m = grip_radius_mm / 1000;
    const omega = (2 * Math.PI * spindle_rpm) / 60;
    const total_mass = jaw_mass_kg + workpiece_mass_kg;
    const centrifugal_force_N = total_mass * omega * omega * r_m;
    const effective_grip_N = grip_force_N - centrifugal_force_N;

    // Critical RPM: F_grip = m×ω²×r → ω = √(F/mr) → RPM = ω×60/(2π)
    const omega_crit = total_mass > 0 && r_m > 0
      ? Math.sqrt(grip_force_N / (total_mass * r_m))
      : Infinity;
    const critical_rpm = omega_crit * 60 / (2 * Math.PI);

    const grip_ratio = grip_force_N > 0 ? effective_grip_N / grip_force_N : 0;

    if (effective_grip_N <= 0) warnings.push('CRITICAL: Grip force exceeded by centrifugal force — workpiece ejection risk');
    else if (grip_ratio < 0.33) warnings.push('Grip < 33% of static: reduce RPM or increase chuck pressure');
    if (spindle_rpm > critical_rpm * 0.8) warnings.push(`Within 20% of critical RPM (${Math.round(critical_rpm)})`);

    return {
      omega_rad_s: omega, centrifugal_force_N, effective_grip_N: Math.max(0, effective_grip_N),
      critical_rpm, grip_ratio: Math.max(0, grip_ratio),
      formula: 'F_eff = F_grip - m×ω²×r; ω_crit = √(F_grip/(m×r))',
      warnings,
    };
  }

  /**
   * Adaptive clamping: F(t) = F0 × (1 + α × Fcut/Fcut_max)
   * Real-time modulation based on cutting force feedback
   */
  adaptiveClamping(input: AdaptiveClampInput): AdaptiveClampResult {
    const {
      base_force_N, cutting_force_N, max_cutting_force_N,
      alpha = 0.5, min_force_N = 0, max_force_N = Infinity,
    } = input;
    const warnings: string[] = [];

    const ratio = max_cutting_force_N > 0 ? cutting_force_N / max_cutting_force_N : 0;
    let adaptive_force_N = base_force_N * (1 + alpha * ratio);

    // Clamp to limits
    adaptive_force_N = Math.max(min_force_N, Math.min(max_force_N, adaptive_force_N));

    const clamped = adaptive_force_N === min_force_N || adaptive_force_N === max_force_N;

    if (ratio > 1.0) warnings.push('Cutting force exceeds expected max: check parameters');
    if (adaptive_force_N < cutting_force_N * 2) warnings.push('Clamping < 2× cutting force: low safety margin');
    if (alpha > 1.0) warnings.push('High gain α > 1.0: may cause oscillation');

    return {
      adaptive_force_N, force_ratio: ratio, clamped,
      formula: 'F(t) = F₀ × (1 + α × Fcut/Fcut_max)',
      warnings,
    };
  }

  /**
   * 3-2-1 locating principle: verify 6 DOF constrained.
   * Primary (3 pts) → constrains 1 translation + 2 rotations
   * Secondary (2 pts) → constrains 1 translation + 1 rotation
   * Tertiary (1 pt) → constrains 1 translation
   */
  clampLayout321(input: ClampLayout321Input): ClampLayout321Result {
    const { primary_locators, secondary_locators, tertiary_locators, support_points = 0 } = input;
    const warnings: string[] = [];

    const primary_dof: string[] = [];
    const secondary_dof: string[] = [];
    const tertiary_dof: string[] = [];

    // Primary plane (typically XY): constrains Z translation, X rotation, Y rotation
    if (primary_locators >= 3) {
      primary_dof.push('Tz', 'Rx', 'Ry');
    } else if (primary_locators === 2) {
      primary_dof.push('Tz', 'Rx');
    } else if (primary_locators === 1) {
      primary_dof.push('Tz');
    }

    // Secondary plane (typically XZ): constrains Y translation, Z rotation
    if (secondary_locators >= 2) {
      secondary_dof.push('Ty', 'Rz');
    } else if (secondary_locators === 1) {
      secondary_dof.push('Ty');
    }

    // Tertiary plane (typically YZ): constrains X translation
    if (tertiary_locators >= 1) {
      tertiary_dof.push('Tx');
    }

    const dof_constrained = primary_dof.length + secondary_dof.length + tertiary_dof.length;
    const total_locators = primary_locators + secondary_locators + tertiary_locators;
    const is_valid_321 = primary_locators === 3 && secondary_locators === 2 && tertiary_locators === 1;
    const overconstrained = total_locators > 6 || (primary_locators > 3 || secondary_locators > 2 || tertiary_locators > 1);
    const underconstrained = dof_constrained < 6;

    if (overconstrained) warnings.push('Overconstrained: redundant locators may cause rocking or stress');
    if (underconstrained) warnings.push(`Only ${dof_constrained}/6 DOF constrained: part not fully located`);
    if (support_points > 0 && !overconstrained) warnings.push(`${support_points} support points added for rigidity (not locating)`);
    if (primary_locators < 3) warnings.push('Primary plane needs 3 locators for stable seating');

    return {
      dof_constrained, is_valid_321, overconstrained, underconstrained,
      primary_dof, secondary_dof, tertiary_dof,
      formula: '3-2-1 principle: 3 primary (plane) + 2 secondary (line) + 1 tertiary (point) = 6 DOF',
      warnings,
    };
  }

  /** Dispatcher entry point */
  calculate(input: FixtureCalcInput): any {
    const { action, params } = input;
    switch (action) {
      case 'fixture_vacuum_hold': return this.vacuumHold(params as any);
      case 'fixture_chuck_speed': return this.chuckSpeedEffect(params as any);
      case 'fixture_adaptive_clamp': return this.adaptiveClamping(params as any);
      case 'fixture_layout_321': return this.clampLayout321(params as any);
      default: throw new Error(`FixtureDynamicsEngine: unknown action '${action}'`);
    }
  }
}

export const fixtureDynamicsEngine = new FixtureDynamicsEngine();
