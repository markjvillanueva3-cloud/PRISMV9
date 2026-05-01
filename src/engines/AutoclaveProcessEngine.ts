/**
 * AutoclaveProcessEngine — Composite autoclave curing analysis
 *
 * Models: Cure kinetics (Kamal-Sourour), temperature/pressure profiles,
 *         void compaction, residual stress, degree of cure monitoring
 * References: Loos & Springer, ASTM D5528, Kamal-Sourour model
 */

export type PrepreqSystem = "carbon_epoxy_350F" | "carbon_epoxy_250F" | "glass_epoxy" | "carbon_BMI" | "carbon_PEEK";
export type CureProfile = "standard" | "fast_cure" | "two_hold" | "ramp_soak";

export interface AutoclaveProcessInput {
  prepreg?: PrepreqSystem;
  cure_profile?: CureProfile;
  part_thickness_mm: number;
  part_area_m2?: number;             // default 1
  num_plies?: number;                // default auto from thickness
  autoclave_pressure_bar?: number;   // default 6
  vacuum_bag_pressure_bar?: number;  // default 1
  ramp_rate_C_min?: number;          // default 2
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AutoclaveProcessResult {
  total_cycle_h: AtomicValue;
  degree_of_cure_pct: AtomicValue;
  peak_exotherm_C: AtomicValue;
  void_content_pct: AtomicValue;
  consolidation_pressure_bar: AtomicValue;
  residual_stress_MPa: AtomicValue;
  energy_consumption_kWh: AtomicValue;
  Tg_final_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Prepreg: [cure_temp_C, hold_time_min, Tg_max_C, ply_thickness_mm, exotherm_kJ/kg]
const PREPREG: Record<PrepreqSystem, [number, number, number, number, number]> = {
  carbon_epoxy_350F: [177, 120, 200, 0.13, 350],
  carbon_epoxy_250F: [121, 90,  150, 0.15, 280],
  glass_epoxy:       [177, 120, 190, 0.20, 320],
  carbon_BMI:        [190, 240, 260, 0.12, 400],
  carbon_PEEK:       [380, 30,  250, 0.14, 50],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AutoclaveProcessEngine {
  calculate(input: AutoclaveProcessInput): AutoclaveProcessResult {
    const {
      prepreg = "carbon_epoxy_350F",
      cure_profile = "standard",
      part_thickness_mm: t,
      part_area_m2: area = 1,
      autoclave_pressure_bar: Pautoclave = 6,
      vacuum_bag_pressure_bar: Pvac = 1,
      ramp_rate_C_min: rampRate = 2,
    } = input;

    const recs: string[] = [];
    const [Tcure, holdMin, TgMax, plyT, exotherm] = PREPREG[prepreg];
    const numPlies = input.num_plies ?? Math.round(t / plyT);

    // Ramp time
    const deltaT = Tcure - 25;
    const rampTime = deltaT / rampRate; // min

    // Hold time adjustment for thickness
    const thicknessFactor = t > 10 ? 1.5 : t > 5 ? 1.2 : 1.0;
    const profileMod = cure_profile === "fast_cure" ? 0.7 :
      cure_profile === "two_hold" ? 1.3 : cure_profile === "ramp_soak" ? 1.1 : 1.0;
    const actualHold = holdMin * thicknessFactor * profileMod;

    // Cool-down (typically 2-3°C/min)
    const coolTime = deltaT / 2.5;

    // Total cycle
    const totalMin = rampTime + actualHold + coolTime +
      (cure_profile === "two_hold" ? rampTime * 0.3 + 30 : 0); // intermediate hold
    const totalH = totalMin / 60;

    // Degree of cure (Kamal-Sourour simplified)
    const k = 0.02 * Math.exp(0.04 * (Tcure - 150));
    const cure = 1 - Math.exp(-k * actualHold);
    const curePct = cure * 100;

    // Peak exotherm (thick parts: internal temperature overshoot)
    const exothermMass = area * t / 1000 * 1500; // kg (composite ~1500 kg/m³)
    const peakExo = Tcure + exotherm * (1 - Vf_est()) / (1.2 * 1000) * t; // °C overshoot
    function Vf_est() { return 0.60; }

    // Void content
    const consolidationP = Pautoclave + Pvac;
    const voidBase = 2.0 / (consolidationP / 6 + 0.1);
    const voidPct = Math.max(voidBase * (1 - cure * 0.5), 0.1);

    // Residual stress (CTE mismatch on cooling)
    const residualStress = 0.5 * deltaT * 0.002; // MPa simplified

    // Glass transition temperature
    const TgFinal = TgMax * cure;

    // Energy consumption
    const autoclaveVol = Math.max(area * 2, 1); // m³ estimate
    const energy = autoclaveVol * deltaT * 1.5 * totalH * 0.3; // kWh rough

    const isSafe = curePct > 95 && voidPct < 2 && peakExo < Tcure + 20;

    if (curePct < 95) recs.push(`Under-cure ${curePct.toFixed(1)}% — extend hold time`);
    if (peakExo > Tcure + 15) recs.push(`Exotherm overshoot ${(peakExo - Tcure).toFixed(0)}°C — slow ramp for thick parts`);
    if (voidPct > 1) recs.push(`Void content ${voidPct.toFixed(1)}% — increase pressure or improve debulk`);
    if (t > 20) recs.push(`Thick laminate ${t}mm — consider two-hold cure to manage exotherm`);
    if (numPlies > 100) recs.push(`${numPlies} plies — layup complexity, consider automated tape laying`);
    if (recs.length === 0) recs.push(`Autoclave nominal — ${totalH.toFixed(1)}h, cure=${curePct.toFixed(0)}%, voids=${voidPct.toFixed(1)}%`);

    return {
      total_cycle_h: mkAv(Math.round(totalH * 10) / 10, "h", totalH * 0.10, "ramp_hold_cool"),
      degree_of_cure_pct: mkAv(Math.round(curePct * 10) / 10, "%", curePct * 0.03, "kamal_sourour"),
      peak_exotherm_C: mkAv(Math.round(peakExo * 10) / 10, "°C", peakExo * 0.10, "energy_balance"),
      void_content_pct: mkAv(Math.round(voidPct * 100) / 100, "%", voidPct * 0.30, "pressure_cure"),
      consolidation_pressure_bar: mkAv(consolidationP, "bar", consolidationP * 0.05, "P_auto_vac"),
      residual_stress_MPa: mkAv(Math.round(residualStress * 100) / 100, "MPa", residualStress * 0.25, "CTE_mismatch"),
      energy_consumption_kWh: mkAv(Math.round(energy), "kWh", energy * 0.25, "vol_DT_time"),
      Tg_final_C: mkAv(Math.round(TgFinal), "°C", TgFinal * 0.05, "cure_degree"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const autoclaveProcessEngine = new AutoclaveProcessEngine();
