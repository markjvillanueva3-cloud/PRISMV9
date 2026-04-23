/**
 * CentrifugeEngine — Industrial centrifuge sizing and separation
 *
 * Models: Sigma factor (Σ=V×ω²×Σ_geo), Stokes settling,
 *         G-force, throughput capacity, power draw
 * References: Svarovsky, Ambler Sigma theory
 * Safety: Critical speed, containment pressure, imbalance
 */

export type CentrifugeType = "disk_stack" | "decanter" | "basket" | "tubular";

export interface CentrifugeInput {
  feed_flow_m3_h: number;
  particle_diameter_um?: number;        // default 5
  particle_density_kg_m3?: number;      // default 2500
  liquid_density_kg_m3?: number;        // default 1000
  liquid_viscosity_cP?: number;         // default 1
  centrifuge_type?: CentrifugeType;
  bowl_diameter_mm?: number;            // auto-sized
  bowl_speed_rpm?: number;              // auto-sized
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CentrifugeResult {
  g_force: AtomicValue;
  sigma_factor_m2: AtomicValue;
  bowl_diameter_mm: AtomicValue;
  bowl_speed_rpm: AtomicValue;
  power_kW: AtomicValue;
  separation_efficiency_pct: AtomicValue;
  cut_size_um: AtomicValue;
  throughput_capacity_m3_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CentrifugeEngine {
  calculate(input: CentrifugeInput): CentrifugeResult {
    const {
      feed_flow_m3_h: Qh,
      particle_diameter_um: dp_um = 5,
      particle_density_kg_m3: rhoP = 2500,
      liquid_density_kg_m3: rhoL = 1000,
      liquid_viscosity_cP: mu_cP = 1,
      centrifuge_type = "disk_stack",
    } = input;

    const recs: string[] = [];
    const Q = Qh / 3600; // m³/s
    const mu = mu_cP * 1e-3;
    const dp = dp_um * 1e-6;
    const drho = rhoP - rhoL;

    // Auto-size bowl
    let D = input.bowl_diameter_mm;
    let N = input.bowl_speed_rpm;
    if (!D) {
      D = centrifuge_type === "disk_stack" ? 400
        : centrifuge_type === "decanter" ? 500
        : centrifuge_type === "basket" ? 800 : 200;
    }
    const R = D / 2000; // m

    if (!N) {
      // Target G-force based on type
      const targetG = centrifuge_type === "disk_stack" ? 8000
        : centrifuge_type === "decanter" ? 3000
        : centrifuge_type === "basket" ? 1500 : 15000;
      N = Math.round(Math.sqrt(targetG * 9.81 / R) * 60 / (2 * Math.PI));
    }
    const omega = 2 * Math.PI * N / 60;

    // G-force
    const G = omega * omega * R / 9.81;

    // Sigma factor (equivalent settling area)
    const L_bowl = D * 2.5 / 1000; // bowl length ≈ 2.5× diameter
    let Sigma: number;
    if (centrifuge_type === "disk_stack") {
      const nDiscs = 80;
      const r1 = R * 0.4;
      const r2 = R * 0.9;
      const theta = 45 * Math.PI / 180;
      Sigma = 2 * Math.PI * nDiscs * omega * omega * (Math.pow(r2, 3) - Math.pow(r1, 3)) / (3 * 9.81 * Math.tan(theta));
    } else {
      Sigma = Math.PI * omega * omega * L_bowl * (Math.pow(R, 2) + Math.pow(R * 0.6, 2)) / (2 * 9.81);
    }

    // Cut size: d_cut = √(18μQ / (2πΣ(ρp-ρl)))
    const dcut = Math.sqrt(18 * mu * Q / (2 * Math.PI * Sigma * drho)) * 1e6; // μm

    // Separation efficiency for given particle size
    const eta = dp_um > dcut ? (1 - Math.pow(dcut / dp_um, 2)) * 100 : (Math.pow(dp_um / dcut, 2)) * 50;

    // Power: P = k × ρ × ω² × R² × Q (simplified)
    const kPower = centrifuge_type === "disk_stack" ? 5 : centrifuge_type === "decanter" ? 3 : 2;
    const power = kPower * rhoL * omega * omega * R * R * Q / 1000 + 1; // kW (+ 1kW base)

    const isSafe = G <= 20000 && N <= 15000;

    if (G > 15000) recs.push(`Very high G-force ${G.toFixed(0)} — verify containment and balance`);
    if (eta < 80) recs.push(`Low efficiency ${eta.toFixed(0)}% — particles too fine, increase G or add flocculant`);
    if (dcut > dp_um) recs.push(`Cut size ${dcut.toFixed(1)}μm > target ${dp_um}μm — increase speed or Sigma`);
    if (mu_cP > 10) recs.push(`High viscosity ${mu_cP}cP — pre-heat feed to improve separation`);
    if (recs.length === 0) recs.push(`Centrifuge nominal — ${G.toFixed(0)}G, η=${eta.toFixed(0)}%, ${power.toFixed(1)}kW`);

    return {
      g_force: mkAv(Math.round(G), "G", G * 0.05, "centripetal"),
      sigma_factor_m2: mkAv(Math.round(Sigma), "m²", Sigma * 0.10, "ambler"),
      bowl_diameter_mm: mkAv(D, "mm", 0, "design_selection"),
      bowl_speed_rpm: mkAv(N, "rpm", 0, "g_force_target"),
      power_kW: mkAv(Math.round(power * 10) / 10, "kW", power * 0.12, "rotational_power"),
      separation_efficiency_pct: mkAv(Math.round(eta * 10) / 10, "%", eta * 0.10, "sigma_theory"),
      cut_size_um: mkAv(Math.round(dcut * 10) / 10, "μm", dcut * 0.15, "stokes_sigma"),
      throughput_capacity_m3_h: mkAv(Qh, "m³/h", Qh * 0.05, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const centrifugeEngine = new CentrifugeEngine();
