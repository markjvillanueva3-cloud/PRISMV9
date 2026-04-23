/**
 * PultrusionProcessEngine — Continuous composite pultrusion analysis
 *
 * Models: Pull force, die heating, resin cure kinetics,
 *         fiber tension, wetout quality, line speed optimization
 * References: Starr 2000, Baran et al., ASTM D3917
 */

export type PultrusionProfile = "solid_rod" | "hollow_tube" | "I_beam" | "channel" | "flat_strip" | "angle";
export type PultrusionResin = "polyester" | "vinyl_ester" | "epoxy" | "phenolic" | "polyurethane";

export interface PultrusionProcessInput {
  profile?: PultrusionProfile;
  resin?: PultrusionResin;
  cross_section_area_mm2: number;
  perimeter_mm: number;
  fiber_volume_fraction?: number;    // default 0.65
  line_speed_m_min?: number;         // default 0.5
  die_length_mm?: number;            // default 900
  die_temperature_C?: number;        // default 150
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PultrusionProcessResult {
  pull_force_kN: AtomicValue;
  production_rate_m_h: AtomicValue;
  degree_of_cure_pct: AtomicValue;
  residence_time_s: AtomicValue;
  heat_input_kW: AtomicValue;
  fiber_tension_MPa: AtomicValue;
  wetout_index: AtomicValue;
  specific_energy_kJ_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Resin: [viscosity_Pa_s, cure_rate_1/s_at_150C, exotherm_kJ/kg, density_g/cm3]
const RESIN_DATA: Record<PultrusionResin, [number, number, number, number]> = {
  polyester:    [0.4, 0.02, 250, 1.20],
  vinyl_ester:  [0.3, 0.015, 300, 1.15],
  epoxy:        [0.8, 0.008, 400, 1.18],
  phenolic:     [1.5, 0.025, 200, 1.30],
  polyurethane: [0.5, 0.03, 280, 1.22],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PultrusionProcessEngine {
  calculate(input: PultrusionProcessInput): PultrusionProcessResult {
    const {
      profile = "solid_rod",
      resin = "polyester",
      cross_section_area_mm2: A,
      perimeter_mm: P,
      fiber_volume_fraction: Vf = 0.65,
      line_speed_m_min: v = 0.5,
      die_length_mm: Ldie = 900,
      die_temperature_C: Tdie = 150,
    } = input;

    const recs: string[] = [];
    const [eta, kCure, exotherm, rhoR] = RESIN_DATA[resin];

    // Composite density
    const rhoF = 2.5; // glass fiber density g/cm³
    const rhoC = Vf * rhoF + (1 - Vf) * rhoR;
    const massPerMeter = rhoC * A / 1000; // kg/m

    // Residence time in die
    const vMs = v / 60; // m/s
    const Lm = Ldie / 1000; // m
    const tRes = Lm / (vMs + 0.001); // s

    // Degree of cure (1st order kinetics with temperature boost)
    const kEff = kCure * Math.exp(0.05 * (Tdie - 150));
    const alpha = 1 - Math.exp(-kEff * tRes);
    const curePct = alpha * 100;

    // Pull force components
    // 1. Viscous drag: F_drag = η × v × P × L / gap
    const gap = 0.5; // mm resin film
    const Fdrag = eta * vMs * (P / 1000) * Lm / (gap / 1000); // N
    // 2. Compaction force
    const Fcompact = 0.3 * A / 1000 * (P / 1000) * 1e5; // N (pressure × contact area)
    // 3. Friction from cured section
    const mu = 0.15;
    const Ffriction = mu * Fcompact * 0.5;
    const Ftotal = (Fdrag + Fcompact + Ffriction) / 1000; // kN

    // Profile complexity modifier
    const profMod = profile === "I_beam" ? 1.3 : profile === "hollow_tube" ? 1.2 :
      profile === "channel" ? 1.15 : profile === "angle" ? 1.1 : 1.0;
    const pullForce = Ftotal * profMod;

    // Production rate
    const prodRate = v * 60; // m/h

    // Heat input
    const heatCapacity = 1.2; // kJ/kg·K composite
    const deltaT = Tdie - 25;
    const massFlow = massPerMeter * vMs; // kg/s
    const Qheat = massFlow * heatCapacity * deltaT + massFlow * exotherm * alpha * (1 - Vf);
    const heatKW = Qheat;

    // Fiber tension
    const fiberArea = A * Vf;
    const fiberTension = pullForce * 1000 / (fiberArea + 0.001); // MPa

    // Wetout index (0-1, higher is better)
    const wetout = Math.min(1.0, (tRes / 30) * (1 / (eta + 0.1)) * 0.5);

    // Specific energy
    const specEnergy = (heatKW + pullForce * vMs) / (massFlow + 0.001); // kJ/kg

    const isSafe = curePct > 85 && fiberTension < 50 && pullForce < 50;

    if (curePct < 90) recs.push(`Low cure ${curePct.toFixed(1)}% — reduce line speed or increase die temperature`);
    if (curePct < 70) recs.push(`CRITICAL: cure ${curePct.toFixed(1)}% — part will be under-cured`);
    if (fiberTension > 30) recs.push(`High fiber tension ${fiberTension.toFixed(1)}MPa — reduce pull speed`);
    if (wetout < 0.6) recs.push(`Poor wetout ${(wetout * 100).toFixed(0)}% — slow speed or reduce viscosity`);
    if (v > 1.5 && resin === "epoxy") recs.push(`Fast speed ${v}m/min with epoxy — cure may be insufficient`);
    if (recs.length === 0) recs.push(`Pultrusion nominal — ${prodRate.toFixed(0)}m/h, cure=${curePct.toFixed(0)}%, F=${pullForce.toFixed(1)}kN`);

    return {
      pull_force_kN: mkAv(Math.round(pullForce * 100) / 100, "kN", pullForce * 0.15, "drag_compact_friction"),
      production_rate_m_h: mkAv(prodRate, "m/h", prodRate * 0.02, "line_speed"),
      degree_of_cure_pct: mkAv(Math.round(curePct * 10) / 10, "%", curePct * 0.05, "1st_order_kinetics"),
      residence_time_s: mkAv(Math.round(tRes * 10) / 10, "s", tRes * 0.02, "L_v"),
      heat_input_kW: mkAv(Math.round(heatKW * 1000) / 1000, "kW", heatKW * 0.15, "mcpDT_exotherm"),
      fiber_tension_MPa: mkAv(Math.round(fiberTension * 10) / 10, "MPa", fiberTension * 0.15, "F_Af"),
      wetout_index: mkAv(Math.round(wetout * 100) / 100, "ratio", wetout * 0.20, "time_viscosity"),
      specific_energy_kJ_kg: mkAv(Math.round(specEnergy), "kJ/kg", specEnergy * 0.20, "Q_mdot"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const pultrusionProcessEngine = new PultrusionProcessEngine();
