/**
 * PressFitEngine — Interference Fit Calculator
 *
 * Calculates press/shrink fit parameters:
 * - Interference from ISO fit tolerances (H7/p6, H7/s6, etc.)
 * - Press force estimation (Lame's equations)
 * - Contact pressure on interface
 * - Thermal assembly: heating/cooling temperatures
 * - Torque and axial load capacity of the joint
 * - Stress check (von Mises) against yield
 *
 * Key physics: The interference creates contact pressure
 * p = δ/(d × (C_hub/E_hub + C_shaft/E_shaft)) where
 * C = (d²+D²)/(D²-d²) + ν for hub. Press force F = μ×p×π×d×L.
 * For thermal assembly, ΔT = δ/(α×d) + clearance margin.
 *
 * Reference: Machinery's Handbook Ch.23 (Fits & Tolerances),
 *            ISO 286 (Limits and fits),
 *            Shigley's Ch.3 (Press/shrink fits)
 *
 * Actions: press_fit_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PressFitInput {
  shaft_diameter_mm: number;
  hub_outer_diameter_mm: number;
  engagement_length_mm: number;
  interference_mm?: number;
  fit_class?: "H7p6" | "H7r6" | "H7s6" | "H7u6";
  shaft_material?: "steel" | "aluminum" | "titanium"
    | "stainless" | "bronze";
  hub_material?: "steel" | "aluminum" | "cast_iron"
    | "stainless" | "bronze";
  assembly_method?: "press" | "thermal" | "cryo";
  friction_coefficient?: number;
}

export interface PressFitResult {
  interference: AtomicValue;
  contact_pressure: AtomicValue;
  press_force: AtomicValue;
  max_hub_stress: AtomicValue;
  max_shaft_stress: AtomicValue;
  safety_factor: AtomicValue;
  torque_capacity: AtomicValue;
  axial_load_capacity: AtomicValue;
  heating_temperature: AtomicValue;
  cooling_temperature: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Young's modulus (GPa), Poisson's ratio, yield (MPa), CTE (μm/m/°C) */
const MATPROPS: Record<string, {
  E: number; nu: number; Sy: number; alpha: number;
}> = {
  steel: { E: 210, nu: 0.3, Sy: 350, alpha: 12 },
  aluminum: { E: 70, nu: 0.33, Sy: 270, alpha: 23 },
  titanium: { E: 114, nu: 0.34, Sy: 880, alpha: 8.6 },
  stainless: { E: 193, nu: 0.3, Sy: 250, alpha: 16 },
  bronze: { E: 110, nu: 0.34, Sy: 200, alpha: 18 },
  cast_iron: { E: 170, nu: 0.26, Sy: 200, alpha: 10.5 },
};

/** Typical interference for common fit classes (μm per mm diameter) */
const FIT_INTERFERENCE: Record<string, number> = {
  H7p6: 0.001,    // light press
  H7r6: 0.0015,   // medium press
  H7s6: 0.002,    // heavy press
  H7u6: 0.003,    // force fit
};

// ── Engine ─────────────────────────────────────────────────────────

export class PressFitEngine {
  calculate(input: PressFitInput): PressFitResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm;
    const D = input.hub_outer_diameter_mm;
    const L = input.engagement_length_mm;
    const mu = input.friction_coefficient ?? 0.15;
    const method = input.assembly_method ?? "press";
    const shaftMat = input.shaft_material ?? "steel";
    const hubMat = input.hub_material ?? "steel";

    const shaft = MATPROPS[shaftMat] ?? MATPROPS.steel;
    const hub = MATPROPS[hubMat] ?? MATPROPS.steel;

    // Interference
    const delta = input.interference_mm
      ?? (input.fit_class
        ? (FIT_INTERFERENCE[input.fit_class] ?? 0.001) * d
        : d * 0.001);

    // Lame's equation for contact pressure
    // p = δ / (d × (C_hub/E_hub + C_shaft/E_shaft))
    const k = D / d; // diameter ratio
    const C_hub = ((k * k + 1) / (k * k - 1)) + hub.nu;
    const C_shaft = shaft.nu; // solid shaft: (1-2ν) but simplified
    const C_shaft_full = ((1) / 1) - shaft.nu; // solid shaft factor

    const p = (delta / d)
      / (C_hub / (hub.E * 1000) + C_shaft_full / (shaft.E * 1000));

    // Press force: F = μ × p × π × d × L
    const pressForce = mu * p * Math.PI * d * L;

    // Hub stress (tangential at inner surface)
    const hubStress = p * (k * k + 1) / (k * k - 1);

    // Shaft stress (compressive = contact pressure)
    const shaftStress = p;

    // Safety factor (hub is typically the limiting element)
    const sfHub = hub.Sy / hubStress;
    const sfShaft = shaft.Sy / shaftStress;
    const sf = Math.min(sfHub, sfShaft);

    // Torque capacity: T = μ × p × π × d × L × d/2
    const torqueCapacity = pressForce * (d / 2) / 1000; // N·m

    // Axial load capacity = press force (same friction)
    const axialCapacity = pressForce;

    // Thermal assembly temperatures
    const clearanceNeeded = delta + 0.05; // 50μm assembly clearance
    // ΔT = δ_mm / (α_μm/m/°C × 1e-6 × d_mm × 1e-3)
    // = δ_mm / (α × d × 1e-9) = δ × 1e9 / (α × d)
    // Simplified: ΔT = clearance / (α × d) × 1e6
    //   (clearance in mm, α in μm/m/°C, d in mm → result in °C)
    const heatingTemp = 20 + (clearanceNeeded * 1000)
      / (hub.alpha * d);
    const coolingTemp = 20 - (clearanceNeeded * 1000)
      / (shaft.alpha * d);

    // Warnings
    if (sf < 1.0) {
      warnings.push(
        `Safety factor ${r2(sf)} < 1.0 — hub or shaft will yield!`
      );
    } else if (sf < 1.5) {
      warnings.push(
        `Safety factor ${r2(sf)} < 1.5 — marginal, ` +
        "consider lighter fit"
      );
    }
    if (L / d > 2) {
      warnings.push(
        "Engagement > 2×diameter — non-uniform pressure distribution"
      );
    }
    if (L / d < 0.5) {
      warnings.push(
        "Short engagement — low joint capacity"
      );
    }
    if (method === "thermal" && heatingTemp > 400) {
      warnings.push(
        `Heating to ${r0(heatingTemp)}°C may affect material properties`
      );
    }
    if (method === "cryo" && coolingTemp < -196) {
      warnings.push(
        "Liquid nitrogen (-196°C) insufficient — " +
        "need larger clearance or heating"
      );
    }
    if (shaftMat === "aluminum" && hubMat === "steel") {
      warnings.push(
        "Aluminum shaft in steel hub — differential thermal " +
        "expansion may loosen at temperature"
      );
    }

    return {
      interference: av(r4(delta), "mm", 0.002,
        input.fit_class ?? "Calculated from diameter"),
      contact_pressure: av(r1(p), "MPa", 5,
        "Lame's equation: δ/(d×(C_h/E_h+C_s/E_s))"),
      press_force: av(r0(pressForce), "N", 50,
        `μ=${mu} × p × π × d × L`),
      max_hub_stress: av(r1(hubStress), "MPa", 5,
        `Tangential: p×(k²+1)/(k²-1), Sy=${hub.Sy}`),
      max_shaft_stress: av(r1(shaftStress), "MPa", 5,
        `Compressive = contact pressure, Sy=${shaft.Sy}`),
      safety_factor: av(r2(sf), "ratio", 0.1,
        `min(Sy_hub/σ_hub, Sy_shaft/σ_shaft)`),
      torque_capacity: av(r1(torqueCapacity), "N·m", 5,
        "F_press × d/2"),
      axial_load_capacity: av(r0(axialCapacity), "N", 50,
        "Same as press force (friction-based)"),
      heating_temperature: av(r1(heatingTemp), "°C", 5,
        `ΔT = clearance / (α×d), α=${hub.alpha}`),
      cooling_temperature: av(r1(coolingTemp), "°C", 5,
        `ΔT = clearance / (α×d), α=${shaft.alpha}`),
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

export const pressFitEngine = new PressFitEngine();
