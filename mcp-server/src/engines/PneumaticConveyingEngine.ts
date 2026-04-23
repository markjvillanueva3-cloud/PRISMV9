/**
 * PneumaticConveyingEngine — Pneumatic conveying system analysis
 *
 * Models: Pressure drop (acceleration, friction, lifting),
 *         saltation velocity, pickup velocity, air requirement
 * References: Mills "Pneumatic Conveying Design Guide", Zenz & Othmer, ISO 21360
 */

export type ConveyMode = "dilute_phase" | "dense_phase" | "plug_flow" | "vacuum" | "pressure";
export type BulkMaterial = "cement" | "flour" | "sugar" | "plastic_pellets" | "calcium_carbonate" | "coal" | "sand";

export interface PneumaticConveyingInput {
  mode?: ConveyMode;
  material?: BulkMaterial;
  capacity_tph?: number;             // tonnes per hour, default 10
  pipe_diameter_mm?: number;         // default auto
  pipe_length_m?: number;            // default 50
  elevation_m?: number;              // default 10
  num_bends?: number;                // default 4
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PneumaticConveyingResult {
  air_velocity_m_s: AtomicValue;
  pressure_drop_bar: AtomicValue;
  air_flow_m3_min: AtomicValue;
  pipe_diameter_mm: AtomicValue;
  solids_loading_ratio: AtomicValue;
  power_kW: AtomicValue;
  pickup_velocity_m_s: AtomicValue;
  saltation_velocity_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [bulk_density_kg/m3, particle_density_kg/m3, particle_size_mm, angle_of_repose_deg, friability_index]
const BULK_DATA: Record<BulkMaterial, [number, number, number, number, number]> = {
  cement:             [1500, 3150, 0.03, 40, 0.3],
  flour:              [600,  1450, 0.08, 45, 0.8],
  sugar:              [800,  1550, 0.5,  35, 0.6],
  plastic_pellets:    [550,  900,  3.0,  25, 0.1],
  calcium_carbonate:  [1200, 2700, 0.01, 50, 0.2],
  coal:               [900,  1400, 2.0,  38, 0.7],
  sand:               [1600, 2650, 0.3,  34, 0.1],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PneumaticConveyingEngine {
  calculate(input: PneumaticConveyingInput): PneumaticConveyingResult {
    const {
      mode = "dilute_phase",
      material = "cement",
      capacity_tph: cap = 10,
      pipe_length_m: L = 50,
      elevation_m: H = 10,
      num_bends: bends = 4,
    } = input;

    const recs: string[] = [];
    const [rhoBulk, rhoParticle, dPart, repose, friability] = BULK_DATA[material];

    // Saltation velocity (minimum for horizontal dilute phase)
    const saltation = 3.0 * Math.pow(rhoParticle / 1000, 0.4) * Math.pow(dPart, 0.1) + 8;

    // Pickup velocity
    const pickup = saltation * 0.8;

    // Operating velocity
    const airVelocity = mode === "dilute_phase" ? saltation * 1.5 :
      mode === "dense_phase" ? saltation * 0.5 :
      mode === "plug_flow" ? saltation * 0.3 :
      mode === "vacuum" ? saltation * 1.4 : saltation * 1.6;

    // Pipe diameter (from capacity and velocity)
    const massFlow = cap * 1000 / 3600; // kg/s
    const solidsLoadingTarget = mode === "dilute_phase" ? 10 : mode === "dense_phase" ? 30 : 50;
    const airMassFlow = massFlow / solidsLoadingTarget; // kg/s
    const rhoAir = 1.2; // kg/m³
    const airVolFlow = airMassFlow / rhoAir; // m³/s
    const pipeDiam = input.pipe_diameter_mm ??
      Math.round(Math.sqrt(4 * airVolFlow / (Math.PI * airVelocity)) * 1000);
    const pipeArea = Math.PI * Math.pow(pipeDiam / 2000, 2); // m²

    // Actual air velocity
    const actualVelocity = airVolFlow / pipeArea;

    // Solids loading ratio (μ = m_s / m_a)
    const SLR = massFlow / (airMassFlow + 0.001);

    // Pressure drop components
    const frictionFactor = 0.005; // Darcy friction
    const dpAccel = 0.5 * rhoAir * actualVelocity * actualVelocity * (1 + SLR * 0.5) / 1e5; // bar
    const dpFriction = frictionFactor * L / (pipeDiam / 1000) * rhoAir * actualVelocity * actualVelocity / 2 * (1 + SLR * 0.3) / 1e5;
    const dpElevation = (rhoAir + rhoBulk * SLR / (SLR + 1) * 0.01) * 9.81 * H / 1e5;
    const dpBends = bends * 0.2 * rhoAir * actualVelocity * actualVelocity / 2 * (1 + SLR * 0.2) / 1e5;
    const totalDP = dpAccel + dpFriction + dpElevation + dpBends;

    // Air flow rate
    const airFlowM3Min = airVolFlow * 60;

    // Blower power (isothermal compression)
    const power = airFlowM3Min / 60 * totalDP * 1e5 / 0.7 / 1000; // kW (70% efficiency)

    const isSafe = actualVelocity > pickup && totalDP < 6 && cap > 0;

    if (actualVelocity < saltation && mode === "dilute_phase") recs.push(`Velocity ${actualVelocity.toFixed(1)}m/s below saltation ${saltation.toFixed(1)} — blockage risk`);
    if (totalDP > 3) recs.push(`High ΔP ${totalDP.toFixed(2)}bar — consider larger pipe or dense phase`);
    if (friability > 0.5 && mode === "dilute_phase") recs.push(`Friable ${material} in dilute phase — particle degradation, use dense phase`);
    if (SLR > 50) recs.push(`Very high loading ratio ${SLR.toFixed(0)} — plug flow regime, need bypass valves`);
    if (bends > 6) recs.push(`${bends} bends — high pressure loss, minimize routing`);
    if (recs.length === 0) recs.push(`Conveying nominal — ${actualVelocity.toFixed(0)}m/s, ΔP=${totalDP.toFixed(2)}bar, SLR=${SLR.toFixed(0)}`);

    return {
      air_velocity_m_s: mkAv(Math.round(actualVelocity * 10) / 10, "m/s", actualVelocity * 0.10, "Q_A"),
      pressure_drop_bar: mkAv(Math.round(totalDP * 1000) / 1000, "bar", totalDP * 0.15, "sum_components"),
      air_flow_m3_min: mkAv(Math.round(airFlowM3Min * 100) / 100, "m³/min", airFlowM3Min * 0.10, "mass_rho"),
      pipe_diameter_mm: mkAv(pipeDiam, "mm", pipeDiam * 0.05, "Q_v"),
      solids_loading_ratio: mkAv(Math.round(SLR * 10) / 10, "kg/kg", SLR * 0.10, "ms_ma"),
      power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.15, "Q_dP_eta"),
      pickup_velocity_m_s: mkAv(Math.round(pickup * 10) / 10, "m/s", pickup * 0.15, "saltation"),
      saltation_velocity_m_s: mkAv(Math.round(saltation * 10) / 10, "m/s", saltation * 0.15, "Zenz"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const pneumaticConveyingEngine = new PneumaticConveyingEngine();
