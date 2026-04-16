/**
 * BallScrewSelectionEngine — Ball Screw Sizing & Selection Calculator
 *
 * Calculates ball screw requirements for machine axes:
 * - Shaft diameter from load and speed (DN value)
 * - Lead selection for speed vs force tradeoff
 * - Critical speed (whip) calculation
 * - Column buckling load (Euler)
 * - Life expectancy (L10) in hours
 * - Preload class and drag torque
 *
 * Key physics: Critical speed N_cr = f×(d/L²)×60×10⁷ where
 * f depends on end fixity. Buckling load P_cr = f²×π²×E×I/L².
 * Life L10 = (C_a/F_m)³ × 10⁶ revolutions. DN value = bore × RPM
 * limits speed. Higher lead = faster traverse but less thrust.
 *
 * Reference: THK ball screw technical guide,
 *            NSK precision ball screw catalog,
 *            ISO 3408 (ball screws)
 *
 * Actions: ball_screw_selection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BallScrewSelectionInput {
  axis_travel_mm: number;
  max_feed_rate_mm_min?: number;
  rapid_rate_mm_min?: number;
  max_thrust_n?: number;
  table_mass_kg?: number;
  screw_lead_mm?: number;
  end_fixity?: "fixed_fixed" | "fixed_supported"
    | "fixed_free" | "supported_supported";
  accuracy_class?: "C0" | "C1" | "C2" | "C3" | "C5" | "C7";
  preload_type?: "none" | "light" | "medium" | "heavy";
  duty_cycle_pct?: number;
}

export interface BallScrewSelectionResult {
  min_shaft_diameter: AtomicValue;
  recommended_lead: AtomicValue;
  max_rpm: AtomicValue;
  critical_speed: AtomicValue;
  buckling_load: AtomicValue;
  required_motor_torque: AtomicValue;
  l10_life_hours: AtomicValue;
  dn_value: AtomicValue;
  positioning_accuracy: AtomicValue;
  drag_torque: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** End fixity factors for critical speed and buckling */
const FIXITY: Record<string, { speed: number; buckle: number }> = {
  fixed_fixed:       { speed: 4.730, buckle: 4.0 },
  fixed_supported:   { speed: 3.927, buckle: 2.0 },
  supported_supported: { speed: 3.142, buckle: 1.0 },
  fixed_free:        { speed: 1.875, buckle: 0.25 },
};

/** Accuracy class lead error (µm/300mm) */
const ACCURACY: Record<string, number> = {
  C0: 3, C1: 5, C2: 7, C3: 8, C5: 18, C7: 50,
};

/** Preload as fraction of dynamic capacity */
const PRELOAD_FRAC: Record<string, number> = {
  none: 0, light: 0.03, medium: 0.07, heavy: 0.10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BallScrewSelectionEngine {
  calculate(input: BallScrewSelectionInput): BallScrewSelectionResult {
    const warnings: string[] = [];
    const travel = input.axis_travel_mm;
    const rapidRate = input.rapid_rate_mm_min ?? 30000;
    const maxFeed = input.max_feed_rate_mm_min ?? 15000;
    const thrust = input.max_thrust_n ?? 5000;
    const tableMass = input.table_mass_kg ?? 200;
    const fixity = input.end_fixity ?? "fixed_supported";
    const accClass = input.accuracy_class ?? "C3";
    const preloadType = input.preload_type ?? "medium";
    const dutyCycle = input.duty_cycle_pct ?? 50;

    const fix = FIXITY[fixity] ?? FIXITY.fixed_supported;

    // Recommended lead (from rapid rate and reasonable RPM)
    // Target max RPM around 3000-4000 for ball screw
    const targetRpm = 3000;
    const recLead = input.screw_lead_mm
      ?? Math.ceil(rapidRate / targetRpm / 5) * 5; // round to 5mm
    const lead = Math.max(recLead, 5);

    // Max RPM from rapid rate
    const maxRpm = rapidRate / lead;

    // Unsupported length (travel + overtravel margin)
    const unsupported = travel + 100; // 50mm each end

    // Critical speed: N_cr = f × (d/L²) × 60 × 10⁷
    // Solve for minimum d: d_min = N_cr × L² / (f × 60 × 10⁷)
    // Need d such that N_cr > maxRpm × 1.5 (safety factor)
    const nCrTarget = maxRpm * 1.5;
    const L_m = unsupported / 1000;
    // N_cr = f × d × 60e7 / L² → d = N_cr × L² / (f × 60e7)
    const minDia_cr = (nCrTarget * L_m * L_m) /
      (fix.speed * 60e7) * 1000; // mm

    // Buckling load: P_cr = f² × π² × E × I / L²
    // Need P_cr > thrust × 3 (safety factor)
    // I = π × d⁴/64, so d = (P × L² × 64 / (f² × π³ × E))^(1/4)
    const E = 206000; // MPa for steel
    const pTarget = thrust * 3;
    const minDia_buck = Math.pow(
      (pTarget * unsupported * unsupported * 64) /
      (fix.buckle * fix.buckle * Math.PI * Math.PI * Math.PI * E),
      0.25);

    // Take larger of the two
    const minDia = Math.max(minDia_cr, minDia_buck, 16);
    // Round up to standard sizes
    const stdSizes = [16, 20, 25, 32, 40, 50, 63, 80];
    const recDia = stdSizes.find(s => s >= minDia) ?? 80;

    // Actual critical speed with recommended diameter
    const actualCritSpeed = fix.speed * (recDia / 1000) *
      60e7 / (L_m * L_m);

    // Actual buckling load
    const I = Math.PI * Math.pow(recDia, 4) / 64; // mm⁴
    const bucklingLoad = fix.buckle * fix.buckle *
      Math.PI * Math.PI * E * I /
      (unsupported * unsupported);

    // DN value
    const dnValue = recDia * maxRpm;

    // Motor torque: T = F × lead / (2π × η)
    const efficiency = 0.9; // ball screw efficiency
    const gravity = tableMass * 9.81;
    const totalThrust = thrust + gravity * 0.1; // 10% gravity component
    const motorTorque = (totalThrust * lead) /
      (2 * Math.PI * efficiency * 1000); // Nm

    // Life L10 (simplified)
    // Dynamic capacity roughly proportional to d²
    const Ca = recDia * recDia * 2; // rough kN estimate
    const Fm = totalThrust / 1000; // kN
    const L10_rev = Ca > 0 && Fm > 0
      ? Math.pow(Ca / Fm, 3) * 1e6 : 1e9;
    const avgRpm = maxRpm * dutyCycle / 100;
    const L10_hours = avgRpm > 0
      ? L10_rev / (60 * avgRpm) : 999999;

    // Positioning accuracy
    const accPerM = (ACCURACY[accClass] ?? 18) / 300 * 1000; // µm/m
    const posAcc = accPerM * (travel / 1000); // µm over travel

    // Drag torque from preload
    const preloadFrac = PRELOAD_FRAC[preloadType] ?? 0.07;
    const preloadForce = Ca * preloadFrac * 1000; // N
    const dragTorque = (preloadForce * lead * 0.003) /
      (2 * Math.PI * 1000); // Nm (friction ~0.003)

    // Warnings
    if (maxRpm > actualCritSpeed * 0.8) {
      warnings.push(
        `RPM ${r0(maxRpm)} approaches critical speed ` +
        `${r0(actualCritSpeed)} — increase shaft diameter`
      );
    }
    if (thrust > bucklingLoad * 0.5) {
      warnings.push(
        `Thrust load ${thrust}N is >${r0(bucklingLoad * 0.5)}N ` +
        `(50% of buckling) — increase diameter`
      );
    }
    if (dnValue > 100000) {
      warnings.push(
        `DN value ${r0(dnValue)} is high — ` +
        "consider roller screw for high-speed/high-load"
      );
    }
    if (L10_hours < 20000) {
      warnings.push(
        `Screw life ${r0(L10_hours)}h — ` +
        "consider larger screw or reduce loads"
      );
    }
    if (accClass === "C7" || accClass === "C5") {
      warnings.push(
        `Accuracy class ${accClass} — ` +
        "not suitable for precision machining"
      );
    }

    return {
      min_shaft_diameter: mkAv(recDia, "mm", 0,
        `Max of critical speed (${r0(minDia_cr)}mm) and ` +
        `buckling (${r0(minDia_buck)}mm)`),
      recommended_lead: mkAv(lead, "mm", 0,
        `${rapidRate} mm/min / ${targetRpm} RPM target`),
      max_rpm: mkAv(r0(maxRpm), "rpm", 10,
        `${rapidRate} / ${lead}mm lead`),
      critical_speed: mkAv(r0(actualCritSpeed), "rpm", 50,
        `f=${fix.speed}, d=${recDia}mm, L=${unsupported}mm`),
      buckling_load: mkAv(r0(bucklingLoad), "N", 100,
        `Euler, ${fixity}, d=${recDia}mm`),
      required_motor_torque: mkAv(r2(motorTorque), "Nm", 0.1,
        `F×lead/(2π×η)`),
      l10_life_hours: mkAv(r0(Math.min(L10_hours, 999999)),
        "hours", 0.1,
        `(Ca/Fm)³ at ${r0(avgRpm)} avg RPM`),
      dn_value: mkAv(r0(dnValue), "mm·rpm", 0,
        `${recDia}mm × ${r0(maxRpm)} RPM`),
      positioning_accuracy: mkAv(r1(posAcc), "µm", 1,
        `${accClass} over ${travel}mm`),
      drag_torque: mkAv(r3(dragTorque), "Nm", 0.01,
        `${preloadType} preload`),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const ballScrewSelectionEngine = new BallScrewSelectionEngine();
