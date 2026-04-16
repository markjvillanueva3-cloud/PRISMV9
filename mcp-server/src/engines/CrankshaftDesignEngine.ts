/**
 * CrankshaftDesignEngine — Crankshaft stress, balance, and fatigue
 *
 * Models: Bending + torsion combined stress (von Mises),
 *         counterweight balance, critical speed, fatigue (Goodman)
 * References: SAE J1099, Shigley crankshaft design
 * Safety: Fatigue life, fillet stress concentration, balance quality
 */

// ─── Types ─────────────────────────────────────────────────────────

export type CrankMaterial = "forged_steel_4340" | "cast_iron" | "forged_steel_1045"
  | "billet_4140" | "micro_alloy";

export interface CrankshaftDesignInput {
  bore_mm: number;
  stroke_mm: number;
  num_cylinders: number;
  max_rpm: number;
  max_combustion_pressure_MPa?: number;  // default 8
  con_rod_length_mm?: number;            // default 2× stroke
  journal_diameter_mm?: number;          // auto-sized
  pin_diameter_mm?: number;              // auto-sized
  material?: CrankMaterial;              // default forged_steel_4340
  piston_mass_g?: number;                // default estimated
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface CrankshaftDesignResult {
  max_gas_force_kN: AtomicValue;
  max_inertia_force_kN: AtomicValue;
  bending_stress_MPa: AtomicValue;
  torsional_stress_MPa: AtomicValue;
  von_mises_stress_MPa: AtomicValue;
  fatigue_safety_factor: AtomicValue;
  critical_speed_rpm: AtomicValue;
  journal_diameter_mm: AtomicValue;
  pin_diameter_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const CRANK_MAT: Record<CrankMaterial, {
  uts_MPa: number; ys_MPa: number; endurance_MPa: number;
  E_GPa: number; density: number
}> = {
  forged_steel_4340:  { uts_MPa: 1100, ys_MPa: 900, endurance_MPa: 450, E_GPa: 207, density: 7850 },
  forged_steel_1045:  { uts_MPa: 700, ys_MPa: 530, endurance_MPa: 300, E_GPa: 207, density: 7850 },
  cast_iron:          { uts_MPa: 350, ys_MPa: 230, endurance_MPa: 130, E_GPa: 170, density: 7200 },
  billet_4140:        { uts_MPa: 950, ys_MPa: 750, endurance_MPa: 400, E_GPa: 207, density: 7850 },
  micro_alloy:        { uts_MPa: 800, ys_MPa: 600, endurance_MPa: 350, E_GPa: 207, density: 7850 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class CrankshaftDesignEngine {
  calculate(input: CrankshaftDesignInput): CrankshaftDesignResult {
    const {
      bore_mm: bore,
      stroke_mm: stroke,
      num_cylinders: nCyl,
      max_rpm: rpm,
      max_combustion_pressure_MPa: pMax = 8,
      material = "forged_steel_4340",
    } = input;

    const recs: string[] = [];
    const mp = CRANK_MAT[material];
    const R = stroke / 2; // crank radius mm
    const conRodLen = input.con_rod_length_mm ?? stroke * 2;
    const lambda = R / conRodLen;

    // Piston area
    const Ap = Math.PI * bore * bore / 4; // mm²

    // Gas force
    const Fgas = pMax * Ap / 1000; // kN

    // Piston mass estimation (if not given)
    const pistonMass = input.piston_mass_g
      ?? (0.5 * bore * bore * 0.001); // rough: 0.5g/mm² of bore area
    const omega = 2 * Math.PI * rpm / 60;

    // Inertia force (1st + 2nd order)
    const Finertia = (pistonMass / 1000) * omega * omega
      * R / 1000 * (1 + lambda); // kN

    // Journal sizing (if not given)
    let dj = input.journal_diameter_mm;
    if (!dj) {
      // Rule of thumb: journal ≈ 0.6-0.75 × bore
      dj = bore * 0.65;
      dj = Math.ceil(dj / 5) * 5;
    }
    let dp = input.pin_diameter_mm;
    if (!dp) {
      dp = bore * 0.55;
      dp = Math.ceil(dp / 5) * 5;
    }

    // Bending stress on crank pin
    // M_bend ≈ F × L/4 (simplified beam between journals)
    const journalSpacing = bore * 1.2; // approx
    const Ftotal = Math.max(Fgas, Finertia);
    const Mbend = Ftotal * journalSpacing / 4; // kN·mm
    const Zpin = Math.PI * dp * dp * dp / 32; // section modulus mm³
    const sigmaBend = Mbend * 1000 / Zpin; // MPa

    // Torsional stress
    const T = Ftotal * R; // kN·mm
    const tauTorsion = T * 1000 * 16 / (Math.PI * dp * dp * dp); // MPa

    // Von Mises combined
    const sigmaVM = Math.sqrt(
      sigmaBend * sigmaBend + 3 * tauTorsion * tauTorsion
    );

    // Fatigue safety factor (Goodman)
    const Kt = 2.5; // fillet stress concentration
    const sigmaA = sigmaVM * Kt / 2; // alternating
    const sigmaM = sigmaVM * Kt / 2; // mean
    const Se = mp.endurance_MPa * 0.7; // surface/size correction
    const sfFatigue = 1 / (sigmaA / Se + sigmaM / mp.uts_MPa);

    // Critical speed (Dunkerley, simplified single-span beam)
    const I = Math.PI * dj * dj * dj * dj / 64;
    const totalLength = nCyl * journalSpacing;
    const mPerLen = mp.density * Math.PI * dj * dj / 4 / 1e6; // kg/mm
    const critSpeed = (Math.PI / (totalLength * totalLength))
      * Math.sqrt(mp.E_GPa * 1e3 * I / mPerLen) * 60
      / (2 * Math.PI);

    const isSafe = sfFatigue >= 1.5 && rpm < critSpeed * 0.8;

    if (sfFatigue < 2.0) {
      recs.push(
        `Fatigue SF=${sfFatigue.toFixed(2)} — increase fillet `
        + `radius or upgrade material`
      );
    }
    if (rpm > critSpeed * 0.7) {
      recs.push(
        `Operating speed ${rpm}rpm near critical `
        + `${Math.round(critSpeed)}rpm — add damper`
      );
    }
    if (Finertia > Fgas) {
      recs.push(
        `Inertia-dominated (${Finertia.toFixed(1)}kN > `
        + `${Fgas.toFixed(1)}kN gas) — lightweight pistons help`
      );
    }
    if (nCyl % 2 !== 0 && nCyl > 1) {
      recs.push(
        `Odd cylinder count ${nCyl} — inherent primary `
        + `imbalance, balance shaft recommended`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Crankshaft nominal — SF=${sfFatigue.toFixed(1)}, `
        + `VM=${sigmaVM.toFixed(0)}MPa`
      );
    }

    return {
      max_gas_force_kN: mkAv(
        Math.round(Fgas * 10) / 10, "kN",
        Fgas * 0.05, "pressure_area"
      ),
      max_inertia_force_kN: mkAv(
        Math.round(Finertia * 10) / 10, "kN",
        Finertia * 0.08, "kinematic_model"
      ),
      bending_stress_MPa: mkAv(
        Math.round(sigmaBend * 10) / 10, "MPa",
        sigmaBend * 0.12, "beam_bending"
      ),
      torsional_stress_MPa: mkAv(
        Math.round(tauTorsion * 10) / 10, "MPa",
        tauTorsion * 0.12, "shaft_torsion"
      ),
      von_mises_stress_MPa: mkAv(
        Math.round(sigmaVM * 10) / 10, "MPa",
        sigmaVM * 0.12, "combined_stress"
      ),
      fatigue_safety_factor: mkAv(
        Math.round(sfFatigue * 100) / 100, "ratio",
        sfFatigue * 0.15, "goodman_diagram"
      ),
      critical_speed_rpm: mkAv(
        Math.round(critSpeed), "rpm",
        critSpeed * 0.15, "dunkerley_method"
      ),
      journal_diameter_mm: mkAv(dj, "mm", 0, "sizing_rule"),
      pin_diameter_mm: mkAv(dp, "mm", 0, "sizing_rule"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const crankshaftDesignEngine = new CrankshaftDesignEngine();
