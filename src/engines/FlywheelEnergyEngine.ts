/**
 * FlywheelEnergyEngine — Rotational Energy Storage Calculator
 *
 * Models: Flywheel kinetic energy storage and discharge.
 * - Kinetic energy E = ½Iω²
 * - Moment of inertia for solid/hollow disc
 * - Speed ratio and usable energy
 * - Coefficient of fluctuation
 * - Stress from centripetal force (rim stress σ = ρω²r²)
 * - Power smoothing for presses/punches
 *
 * Key physics: E_usable = ½I(ω_max² - ω_min²). Cf = (ω_max-ω_min)/ω_avg.
 * σ_rim = ρ×v² where v = ω×r.
 *
 * Reference: Shigley — Mechanical Engineering Design,
 *            Spotts — Design of Machine Elements,
 *            ASME flywheel standards
 *
 * Actions: flywheel_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FlywheelEnergyInput {
  geometry?: "solid_disc" | "hollow_disc" | "rim" | "spoked";
  outer_radius_mm?: number;
  inner_radius_mm?: number;
  width_mm?: number;
  material?: "steel" | "cast_iron" | "aluminum" | "titanium";
  max_rpm?: number;
  min_rpm?: number;
  energy_required_j?: number;
}

export interface FlywheelEnergyResult {
  moment_of_inertia: AtomicValue;
  max_energy: AtomicValue;
  usable_energy: AtomicValue;
  coefficient_of_fluctuation: AtomicValue;
  flywheel_mass: AtomicValue;
  rim_stress: AtomicValue;
  rim_velocity: AtomicValue;
  power_at_max_rpm: AtomicValue;
  safety_factor_burst: AtomicValue;
  required_width: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [density_kg_m3, tensile_strength_MPa] */
const MAT_PROPS: Record<string, [number, number]> = {
  steel:     [7850, 550],
  cast_iron: [7200, 200],
  aluminum:  [2700, 310],
  titanium:  [4510, 900],
};

// ── Engine ─────────────────────────────────────────────────────────

export class FlywheelEnergyEngine {
  calculate(input: FlywheelEnergyInput): FlywheelEnergyResult {
    const warnings: string[] = [];
    const geo = input.geometry ?? "solid_disc";
    const ro = (input.outer_radius_mm ?? 200) / 1000; // m
    const ri = (input.inner_radius_mm ?? (geo === "hollow_disc" || geo === "rim" ? 100 : 0)) / 1000;
    const w = (input.width_mm ?? 50) / 1000; // m
    const matKey = input.material ?? "steel";
    const maxRPM = input.max_rpm ?? 1500;
    const minRPM = input.min_rpm ?? maxRPM * 0.9;

    const [rho, sigmaUlt] = MAT_PROPS[matKey] ?? MAT_PROPS.steel;

    const omegaMax = maxRPM * 2 * Math.PI / 60;
    const omegaMin = minRPM * 2 * Math.PI / 60;
    const omegaAvg = (omegaMax + omegaMin) / 2;

    // Moment of inertia
    let I: number;
    let mass: number;
    if (geo === "solid_disc") {
      mass = rho * Math.PI * ro * ro * w;
      I = 0.5 * mass * ro * ro;
    } else {
      // hollow disc, rim, spoked
      mass = rho * Math.PI * (ro * ro - ri * ri) * w;
      I = 0.5 * mass * (ro * ro + ri * ri);
    }

    // Kinetic energy
    const Emax = 0.5 * I * omegaMax * omegaMax;
    const Emin = 0.5 * I * omegaMin * omegaMin;
    const Eusable = Emax - Emin;

    // Coefficient of fluctuation
    const Cf = omegaAvg > 0 ? (omegaMax - omegaMin) / omegaAvg : 0;

    // Rim stress (σ = ρ × v²)
    const vRim = omegaMax * ro;
    const sigmaRim = rho * vRim * vRim / 1e6; // MPa

    // Safety factor against burst
    const SF = sigmaRim > 0 ? sigmaUlt / sigmaRim : 999;

    // Power at max RPM (if energy discharged over 1 revolution)
    const tRev = maxRPM > 0 ? 60 / maxRPM : 1;
    const powerMax = Eusable / tRev / 1000; // kW

    // Required width if energy_required_j specified
    let reqWidth = w * 1000;
    if (input.energy_required_j && Eusable > 0) {
      reqWidth = (input.energy_required_j / Eusable) * w * 1000;
    }

    // Warnings
    if (SF < 3) {
      warnings.push(`Burst safety factor ${r1(SF)} < 3.0 — reduce speed or increase material strength`);
    }
    if (vRim > 200) {
      warnings.push(`Rim velocity ${r0(vRim)} m/s exceeds 200 m/s — containment required`);
    }
    if (Cf > 0.2) {
      warnings.push(`Coefficient of fluctuation ${r2(Cf)} > 0.2 — speed variation too high`);
    }
    if (Cf < 0.01 && Cf > 0) {
      warnings.push(`Cf ${r3(Cf)} very small — flywheel may be oversized`);
    }
    if (matKey === "cast_iron" && vRim > 50) {
      warnings.push("Cast iron at high rim speed — brittle fracture risk, use steel or ductile iron");
    }

    const src = "FlywheelEnergyEngine (Shigley/Spotts)";

    return {
      moment_of_inertia: mkAv(r3(I), "kg·m²", I * 0.03, `${geo} ρ=${rho}`),
      max_energy: mkAv(r0(Emax), "J", Emax * 0.05, `½Iω² at ${maxRPM}rpm`),
      usable_energy: mkAv(r0(Eusable), "J", Eusable * 0.05,
        `½I(ω_max²-ω_min²) ${maxRPM}-${minRPM}rpm`),
      coefficient_of_fluctuation: mkAv(r3(Cf), "ratio", Cf * 0.02,
        `(ω_max-ω_min)/ω_avg`),
      flywheel_mass: mkAv(r1(mass), "kg", mass * 0.03, `${geo} ${matKey}`),
      rim_stress: mkAv(r1(sigmaRim), "MPa", sigmaRim * 0.05, `ρv² at r=${r0(ro * 1000)}mm`),
      rim_velocity: mkAv(r1(vRim), "m/s", vRim * 0.02, `ω×r at ${maxRPM}rpm`),
      power_at_max_rpm: mkAv(r2(powerMax), "kW", powerMax * 0.1, `E_usable per revolution`),
      safety_factor_burst: mkAv(r1(SF), "×", SF * 0.1, `σ_ult/σ_rim = ${sigmaUlt}/${r1(sigmaRim)}`),
      required_width: mkAv(r1(reqWidth), "mm", reqWidth * 0.1, src),
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

export const flywheelEnergyEngine = new FlywheelEnergyEngine();
