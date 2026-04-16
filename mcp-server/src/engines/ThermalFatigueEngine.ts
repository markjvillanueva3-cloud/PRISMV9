/**
 * ThermalFatigueEngine — Thermal Cycling Fatigue Life Calculator
 *
 * Models: Low-cycle thermal fatigue (TMF) analysis.
 * - Thermal strain range from ΔT and CTE
 * - Coffin-Manson fatigue life estimation
 * - Elastic + plastic strain decomposition
 * - Hold-time creep-fatigue interaction
 * - Stress relaxation during hold
 * - ASME NH / RCC-MRx compliance
 *
 * Key physics: Δε_th = α×ΔT. Δε_p = ε_f'×(2Nf)^c.
 * Δε_e = σ_f'/(E)×(2Nf)^b. Coffin-Manson total.
 *
 * Reference: Coffin — Thermal Fatigue of Metals,
 *            Manson — Thermal Stress and Low-Cycle Fatigue,
 *            ASME Section III Div 1 NH
 *
 * Actions: thermal_fatigue_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ThermalFatigueInput {
  material?: "carbon_steel" | "stainless_304" | "inconel_718"
    | "aluminum_6061";
  delta_t_c?: number;
  max_temp_c?: number;
  hold_time_min?: number;
  constraint_factor?: number;
  cycles_required?: number;
  surface_finish?: "machined" | "ground" | "polished" | "as_cast";
}

export interface ThermalFatigueResult {
  thermal_strain_range: AtomicValue;
  elastic_strain: AtomicValue;
  plastic_strain: AtomicValue;
  fatigue_life_cycles: AtomicValue;
  creep_fatigue_life: AtomicValue;
  safety_factor: AtomicValue;
  max_thermal_stress: AtomicValue;
  strain_ratio: AtomicValue;
  hold_time_damage: AtomicValue;
  surface_derating: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [E_GPa, alpha_um/mC, sigma_f_MPa, epsilon_f, b, c] */
const MAT_DATA: Record<string, [number, number, number, number, number, number]> = {
  carbon_steel:   [200, 12.0, 900, 0.25, -0.12, -0.60],
  stainless_304:  [193, 17.3, 1000, 0.30, -0.10, -0.50],
  inconel_718:    [205, 13.0, 1400, 0.15, -0.08, -0.65],
  aluminum_6061:  [69,  23.6, 500,  0.40, -0.10, -0.55],
};

const SURFACE_FACTOR: Record<string, number> = {
  polished: 1.0, ground: 0.90, machined: 0.75, as_cast: 0.55,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThermalFatigueEngine {
  calculate(input: ThermalFatigueInput): ThermalFatigueResult {
    const warnings: string[] = [];
    const mat = input.material ?? "stainless_304";
    const dT = input.delta_t_c ?? 200;
    const Tmax = input.max_temp_c ?? 550;
    const holdMin = input.hold_time_min ?? 0;
    const Cf = input.constraint_factor ?? 1.0;
    const Nreq = input.cycles_required ?? 10000;
    const surf = input.surface_finish ?? "machined";

    const [Egpa, alpha, sigF, epsF, b, c] =
      MAT_DATA[mat] ?? MAT_DATA.stainless_304;
    const E = Egpa * 1000; // MPa
    const kSurf = SURFACE_FACTOR[surf] ?? 0.75;

    // Thermal strain range
    const epsTherm = alpha * 1e-6 * dT * Cf;

    // Max thermal stress (fully constrained)
    const sigMax = E * epsTherm;

    // Elastic strain range
    // From Basquin: Δε_e/2 = (σ_f'/E)×(2Nf)^b
    // Plastic: Δε_p/2 = ε_f'×(2Nf)^c

    // Solve Coffin-Manson iteratively for Nf
    // Δε/2 = (σ_f'/E)×(2Nf)^b + ε_f'×(2Nf)^c
    const halfStrain = epsTherm / 2;
    let Nf = 1000; // initial guess
    for (let i = 0; i < 50; i++) {
      const twoNf = 2 * Nf;
      const epsE = (sigF * kSurf / E)
        * Math.pow(twoNf, b);
      const epsP = (epsF * kSurf)
        * Math.pow(twoNf, c);
      const total = epsE + epsP;
      const ratio = halfStrain / total;
      // Newton-like adjustment
      const bEff = (b * epsE + c * epsP) / total;
      Nf = Nf * Math.pow(ratio, 1 / bEff);
      Nf = Math.max(1, Math.min(Nf, 1e12));
    }

    // Decompose at solution
    const twoNf = 2 * Nf;
    const epsElastic = (sigF * kSurf / E)
      * Math.pow(twoNf, b) * 2;
    const epsPlastic = (epsF * kSurf)
      * Math.pow(twoNf, c) * 2;

    // Creep-fatigue interaction (hold time damage)
    let holdDamage = 0;
    let NfCreep = Nf;
    if (holdMin > 0) {
      // Robinson's rule: creep damage per cycle
      // Approximate rupture time at Tmax
      const tRupture = Tmax > 400
        ? Math.pow(10, 5 - (Tmax - 400) / 100)
        : 1e8;
      holdDamage = holdMin / (60 * tRupture); // per cycle
      // Creep-fatigue: 1/Nf_cf = 1/Nf + holdDamage
      NfCreep = 1 / (1 / Nf + holdDamage);
      NfCreep = Math.max(1, NfCreep);
    }

    // Safety factor
    const SF = NfCreep / Math.max(Nreq, 1);

    // Strain ratio (elastic/total)
    const strainRatio = epsElastic / Math.max(epsTherm, 1e-10);

    // Warnings
    if (SF < 2) {
      warnings.push(
        `Fatigue SF ${r1(SF)} < 2 — reduce ΔT or add flexibility`
      );
    }
    if (SF < 1) {
      warnings.push("FAILS — fatigue life < required cycles");
    }
    if (epsPlastic > epsElastic) {
      warnings.push(
        "Plastic-dominated — low-cycle fatigue regime"
      );
    }
    if (holdMin > 60 && Tmax > 500) {
      warnings.push(
        "Long hold at high temp — creep-fatigue interaction significant"
      );
    }
    if (Tmax > 600 && mat === "carbon_steel") {
      warnings.push("Carbon steel > 600°C — oxidation/scaling");
    }
    if (sigMax > sigF) {
      warnings.push(
        `Thermal stress ${r0(sigMax)} MPa exceeds fatigue strength`
      );
    }

    const src = "ThermalFatigueEngine (Coffin-Manson)";

    return {
      thermal_strain_range: mkAv(r5(epsTherm), "mm/mm",
        epsTherm * 0.05, `α×ΔT×Cf`),
      elastic_strain: mkAv(r5(epsElastic), "mm/mm",
        epsElastic * 0.1, "Basquin"),
      plastic_strain: mkAv(r5(epsPlastic), "mm/mm",
        epsPlastic * 0.15, "Coffin-Manson"),
      fatigue_life_cycles: mkAv(r0(Nf), "cycles",
        Nf * 0.3, "pure fatigue"),
      creep_fatigue_life: mkAv(r0(NfCreep), "cycles",
        NfCreep * 0.3, "with hold time"),
      safety_factor: mkAv(r1(SF), "×",
        SF * 0.15, `Nf/N_req`),
      max_thermal_stress: mkAv(r0(sigMax), "MPa",
        sigMax * 0.1, `E×α×ΔT`),
      strain_ratio: mkAv(r2(strainRatio), "×",
        strainRatio * 0.1, "elastic/total"),
      hold_time_damage: mkAv(r5(holdDamage), "/cycle",
        holdDamage * 0.3, "Robinson"),
      surface_derating: mkAv(r2(kSurf), "×", 0, src),
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
function r5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

export const thermalFatigueEngine = new ThermalFatigueEngine();
