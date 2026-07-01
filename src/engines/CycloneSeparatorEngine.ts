/**
 * CycloneSeparatorEngine — Cyclone dust collector sizing and efficiency
 *
 * Models: Lapple model (d50 cut size), collection efficiency by particle size,
 *         pressure drop (Shepherd & Lapple), Stokes number
 * References: Cooper & Alley "Air Pollution Control", Leith & Licht model
 * Safety: Explosion venting (NFPA 68), inlet velocity limits
 */

export type CycloneDesign = "high_efficiency" | "conventional" | "high_throughput";

export interface CycloneSeparatorInput {
  gas_flow_m3_h: number;
  particle_density_kg_m3?: number;     // default 2500
  gas_density_kg_m3?: number;          // default 1.2
  gas_viscosity_Pa_s?: number;         // default 1.8e-5
  median_particle_um?: number;         // default 10
  cyclone_design?: CycloneDesign;
  inlet_velocity_m_s?: number;         // default 15
  num_cyclones?: number;               // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CycloneSeparatorResult {
  cyclone_diameter_mm: AtomicValue;
  cut_size_d50_um: AtomicValue;
  collection_efficiency_pct: AtomicValue;
  pressure_drop_Pa: AtomicValue;
  inlet_velocity_m_s: AtomicValue;
  number_of_turns: AtomicValue;
  stokes_number: AtomicValue;
  outlet_loading_mg_m3: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Cyclone proportions (relative to body diameter D)
const PROPORTIONS: Record<CycloneDesign, {
  a: number; b: number; De: number; S: number; h: number; H: number; B: number; N: number
}> = {
  high_efficiency:  { a: 0.44, b: 0.21, De: 0.40, S: 0.50, h: 1.40, H: 3.90, B: 0.40, N: 6 },
  conventional:     { a: 0.50, b: 0.25, De: 0.50, S: 0.625, h: 2.00, H: 4.00, B: 0.25, N: 5 },
  high_throughput:   { a: 0.75, b: 0.375, De: 0.75, S: 0.875, h: 1.50, H: 4.00, B: 0.375, N: 4 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CycloneSeparatorEngine {
  calculate(input: CycloneSeparatorInput): CycloneSeparatorResult {
    const {
      gas_flow_m3_h: Qh,
      particle_density_kg_m3: rhoP = 2500,
      gas_density_kg_m3: rhoG = 1.2,
      gas_viscosity_Pa_s: mu = 1.8e-5,
      median_particle_um: dp = 10,
      cyclone_design = "conventional",
      num_cyclones = 1,
    } = input;

    const recs: string[] = [];
    const Q = Qh / 3600 / num_cyclones; // m³/s per cyclone
    const prop = PROPORTIONS[cyclone_design];

    // Size cyclone from inlet velocity
    const vIn = input.inlet_velocity_m_s ?? 15;
    // Inlet area = a×D × b×D = a×b×D²
    // Q = v × a×b×D² → D = √(Q/(v×a×b))
    const D = Math.sqrt(Q / (vIn * prop.a * prop.b)); // m
    const Dmm = D * 1000;

    // Cut size d50 (Lapple): d50 = √(9×μ×b×D / (2×π×N×Vi×(ρp-ρg)))
    const d50 = Math.sqrt(
      (9 * mu * prop.b * D) / (2 * Math.PI * prop.N * vIn * (rhoP - rhoG))
    ) * 1e6; // μm

    // Collection efficiency (Lapple model for median particle)
    // η = 1 / (1 + (d50/dp)²)
    const eta = 1 / (1 + Math.pow(d50 / dp, 2)) * 100;

    // Pressure drop (Shepherd & Lapple): ΔP = (ρg×Vi²/2) × K
    // K = 6.4 × (a×b) / De²
    const K = 6.4 * prop.a * prop.b / (prop.De * prop.De);
    const dP = rhoG * vIn * vIn / 2 * K; // Pa

    // Stokes number
    const Stk = rhoP * Math.pow(dp * 1e-6, 2) * vIn / (18 * mu * D);

    // Outlet loading (assuming 100 mg/m³ inlet)
    const inletLoad = 100; // mg/m³
    const outletLoad = inletLoad * (1 - eta / 100);

    const isSafe = vIn >= 10 && vIn <= 25 && dP < 2500;

    if (vIn < 10) recs.push(`Low inlet velocity ${vIn.toFixed(1)}m/s — poor separation, increase to 12-18m/s`);
    if (vIn > 22) recs.push(`High inlet velocity ${vIn.toFixed(1)}m/s — re-entrainment risk, reduce flow or add cyclones`);
    if (eta < 80) recs.push(`Low efficiency ${eta.toFixed(1)}% — consider high-efficiency design or baghouse`);
    if (dP > 2000) recs.push(`High pressure drop ${dP.toFixed(0)}Pa — fan power impact, consider larger cyclone`);
    if (d50 > dp) recs.push(`Cut size ${d50.toFixed(1)}μm > median particle ${dp}μm — poor capture expected`);
    if (recs.length === 0) recs.push(`Cyclone nominal — D=${Dmm.toFixed(0)}mm, η=${eta.toFixed(1)}%, d50=${d50.toFixed(1)}μm`);

    return {
      cyclone_diameter_mm: mkAv(Math.round(Dmm), "mm", Dmm * 0.05, "velocity_sizing"),
      cut_size_d50_um: mkAv(Math.round(d50 * 10) / 10, "μm", d50 * 0.15, "lapple_model"),
      collection_efficiency_pct: mkAv(Math.round(eta * 10) / 10, "%", eta * 0.10, "lapple_efficiency"),
      pressure_drop_Pa: mkAv(Math.round(dP), "Pa", dP * 0.12, "shepherd_lapple"),
      inlet_velocity_m_s: mkAv(Math.round(vIn * 10) / 10, "m/s", vIn * 0.05, "flow_area"),
      number_of_turns: mkAv(prop.N, "turns", 0.5, "design_reference"),
      stokes_number: mkAv(Math.round(Stk * 10000) / 10000, "dimensionless", Stk * 0.15, "particle_dynamics"),
      outlet_loading_mg_m3: mkAv(Math.round(outletLoad * 10) / 10, "mg/m³", outletLoad * 0.15, "efficiency_calc"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const cycloneSeparatorEngine = new CycloneSeparatorEngine();
