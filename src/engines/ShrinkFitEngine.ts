/**
 * ShrinkFitEngine — Interference Fit Assembly Calculator
 *
 * Models: Shrink/press fit joint design and assembly.
 * - Required interference from torque/axial load
 * - Interface pressure (Lamé equations)
 * - Assembly temperature differential
 * - Hub stress (hoop, radial)
 * - Shaft stress (compressive)
 * - Grip force and transmittable torque
 *
 * Key physics: p = δ/(d × (C_hub/E_hub + C_shaft/E_shaft)).
 * Lamé: C = (d_o²+d_i²)/(d_o²−d_i²) + ν.
 * ΔT = δ/(α×d) + clearance margin.
 *
 * Reference: Shigley Ch.3 (Stress in Cylindrical Pressure Vessels),
 *            DIN 7190 (interference fits),
 *            Budynas — Advanced Strength Ch.4
 *
 * Actions: shrink_fit_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ShrinkFitInput {
  shaft_diameter_mm?: number;
  hub_outer_diameter_mm?: number;
  shaft_inner_diameter_mm?: number;
  fit_length_mm?: number;
  interference_mm?: number;
  required_torque_nm?: number;
  required_axial_force_n?: number;
  friction_coeff?: number;
  shaft_material_e_gpa?: number;
  hub_material_e_gpa?: number;
  shaft_poisson?: number;
  hub_poisson?: number;
  shaft_yield_mpa?: number;
  hub_yield_mpa?: number;
  shaft_cte_um_m_c?: number;
  hub_cte_um_m_c?: number;
  assembly_method?: "shrink" | "press" | "hydraulic";
}

export interface ShrinkFitResult {
  interface_pressure: AtomicValue;
  required_interference: AtomicValue;
  hub_hoop_stress: AtomicValue;
  shaft_compressive_stress: AtomicValue;
  transmittable_torque: AtomicValue;
  transmittable_axial: AtomicValue;
  assembly_temp_delta: AtomicValue;
  hub_safety_factor: AtomicValue;
  shaft_safety_factor: AtomicValue;
  fit_feasible: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class ShrinkFitEngine {
  calculate(input: ShrinkFitInput): ShrinkFitResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm ?? 50;       // interface diameter
    const Do = input.hub_outer_diameter_mm ?? 100;  // hub OD
    const Di = input.shaft_inner_diameter_mm ?? 0;   // hollow shaft ID
    const L = input.fit_length_mm ?? (d * 1.5);
    const mu = input.friction_coeff ?? 0.12;

    const Esh = (input.shaft_material_e_gpa ?? 210) * 1000; // MPa
    const Ehub = (input.hub_material_e_gpa ?? 210) * 1000;
    const nush = input.shaft_poisson ?? 0.3;
    const nuhub = input.hub_poisson ?? 0.3;
    const Sysh = input.shaft_yield_mpa ?? 350;
    const Syhub = input.hub_yield_mpa ?? 250;
    const cteSh = input.shaft_cte_um_m_c ?? 12;
    const cteHub = input.hub_cte_um_m_c ?? 12;

    // Lamé constants
    const rRatio_hub = (Do / d);  // Do/d
    const rRatio_sh = Di > 0 ? (d / Di) : Infinity;

    const C_hub = ((rRatio_hub ** 2 + 1) / (rRatio_hub ** 2 - 1)) + nuhub;
    const C_sh = Di > 0
      ? ((1 + (Di / d) ** 2) / (1 - (Di / d) ** 2)) - nush
      : (1 - nush); // solid shaft simplification

    // If interference given, calculate pressure
    // If torque given, calculate required interference
    let delta: number; // total diametral interference (mm)
    let pressure: number; // interface pressure (MPa)

    if (input.interference_mm !== undefined) {
      delta = input.interference_mm;
      pressure = delta / (d * (C_hub / Ehub + C_sh / Esh));
    } else if (input.required_torque_nm !== undefined) {
      // T = μ × p × π × d × L × d/2
      const T = input.required_torque_nm * 1000; // N·mm
      pressure = (2 * T) / (mu * Math.PI * d * d * L);
      delta = pressure * d * (C_hub / Ehub + C_sh / Esh);
    } else if (input.required_axial_force_n !== undefined) {
      // F = μ × p × π × d × L
      pressure = input.required_axial_force_n / (mu * Math.PI * d * L);
      delta = pressure * d * (C_hub / Ehub + C_sh / Esh);
    } else {
      // Default: H7/p6 medium interference ≈ 0.001 × d
      delta = d * 0.001;
      pressure = delta / (d * (C_hub / Ehub + C_sh / Esh));
    }

    // Hub hoop stress (max at bore): σ_θ = p × (Do²+d²)/(Do²−d²)
    const hubHoop = pressure * (Do * Do + d * d) / (Do * Do - d * d);

    // Shaft compressive stress: σ_r = -p (at interface)
    const shaftComp = pressure; // compressive magnitude

    // Transmittable torque: T = μ × p × π × d² × L / 2
    const transTorque = mu * pressure * Math.PI * d * d * L / 2 / 1000; // N·m

    // Transmittable axial force
    const transAxial = mu * pressure * Math.PI * d * L; // N

    // Assembly temperature
    // ΔT = δ / (α × d) + clearance_margin
    // For shrink: heat hub. ΔT_hub = (δ + 0.02mm) / (cteHub × 1e-6 × d)
    const clearance = 0.02; // mm assembly clearance
    const deltaT = (delta + clearance) / (cteHub * 1e-6 * d);

    // Safety factors
    const sfHub = Syhub / Math.max(hubHoop, 0.01);
    const sfShaft = Sysh / Math.max(shaftComp, 0.01);

    // Feasibility
    const feasible = sfHub >= 1.5 && sfShaft >= 1.5 && delta > 0;

    // Warnings
    if (sfHub < 1.5) {
      warnings.push(`Hub hoop stress SF=${r2(sfHub)} < 1.5 — increase hub OD or use stronger material`);
    }
    if (sfShaft < 1.5) {
      warnings.push(`Shaft compressive SF=${r2(sfShaft)} < 1.5 — reduce interference`);
    }
    if (sfHub < 1.0 || sfShaft < 1.0) {
      warnings.push("CRITICAL: Yielding will occur — joint will lose grip over time");
    }
    if (deltaT > 350) {
      warnings.push(`Assembly ΔT=${r0(deltaT)}°C > 350°C — may affect heat treatment`);
    }
    if (L / d < 0.5) {
      warnings.push(`Fit length/diameter ratio ${r2(L / d)} < 0.5 — short engagement`);
    }
    if (L / d > 2.0) {
      warnings.push(`Fit length/diameter ratio ${r2(L / d)} > 2.0 — difficult assembly`);
    }
    if (input.assembly_method === "press" && delta > d * 0.002) {
      warnings.push("Heavy interference — shrink fit preferred over press fit to avoid galling");
    }

    const src = "ShrinkFitEngine (DIN 7190/Shigley Lamé)";

    return {
      interface_pressure: mkAv(r1(pressure), "MPa", pressure * 0.05, "Lamé equations"),
      required_interference: mkAv(r3(delta), "mm", delta * 0.1,
        `diametral on ${d}mm`),
      hub_hoop_stress: mkAv(r0(hubHoop), "MPa", hubHoop * 0.05,
        `p×(Do²+d²)/(Do²−d²)`),
      shaft_compressive_stress: mkAv(r0(shaftComp), "MPa", shaftComp * 0.05,
        "Interface pressure"),
      transmittable_torque: mkAv(r1(transTorque), "N·m", transTorque * 0.1,
        `μ=${mu}, L=${L}mm`),
      transmittable_axial: mkAv(r0(transAxial), "N", transAxial * 0.1,
        `μ=${mu}, L=${L}mm`),
      assembly_temp_delta: mkAv(r0(deltaT), "°C", deltaT * 0.1,
        `Hub heating for ${r3(delta + clearance)}mm expansion`),
      hub_safety_factor: mkAv(r2(sfHub), "×", 0.1, `${Syhub}/${r0(hubHoop)}`),
      shaft_safety_factor: mkAv(r2(sfShaft), "×", 0.1, `${Sysh}/${r0(shaftComp)}`),
      fit_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const shrinkFitEngine = new ShrinkFitEngine();
