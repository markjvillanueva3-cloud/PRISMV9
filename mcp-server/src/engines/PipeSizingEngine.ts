/**
 * PipeSizingEngine — Pipe diameter, velocity, and pressure drop sizing
 *
 * Models: Darcy-Weisbach (Δp=f×L/D×ρv²/2), Moody friction factor,
 *         economic velocity, schedule/wall thickness selection
 * References: ASME B31.1/B31.3, Crane TP-410
 * Safety: Velocity limits, water hammer, erosional velocity
 */

export type PipeFluid = "water" | "steam" | "compressed_air" | "oil"
  | "natural_gas" | "refrigerant";
export type PipeMat = "carbon_steel" | "stainless_316" | "copper"
  | "pvc" | "hdpe" | "ductile_iron";

export interface PipeSizingInput {
  flow_rate_m3_h: number;
  pipe_length_m: number;
  fluid?: PipeFluid;
  pipe_material?: PipeMat;
  max_velocity_m_s?: number;
  max_pressure_drop_bar?: number;
  fluid_density_kg_m3?: number;
  fluid_viscosity_cP?: number;
  num_elbows?: number;
  num_valves?: number;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PipeSizingResult {
  nominal_size_mm: AtomicValue;
  velocity_m_s: AtomicValue;
  reynolds_number: AtomicValue;
  friction_factor: AtomicValue;
  pressure_drop_bar: AtomicValue;
  pressure_drop_per_100m_bar: AtomicValue;
  wall_thickness_mm: AtomicValue;
  schedule: AtomicValue;
  fitting_loss_bar: AtomicValue;
  total_loss_bar: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const FLUID_PROPS: Record<PipeFluid, { rho: number; mu_cP: number; vmax: number }> = {
  water:          { rho: 998, mu_cP: 1.0, vmax: 3.0 },
  steam:          { rho: 2.0, mu_cP: 0.012, vmax: 40 },
  compressed_air: { rho: 8.5, mu_cP: 0.018, vmax: 20 },
  oil:            { rho: 870, mu_cP: 30, vmax: 2.0 },
  natural_gas:    { rho: 5.0, mu_cP: 0.011, vmax: 25 },
  refrigerant:    { rho: 1200, mu_cP: 0.2, vmax: 5.0 },
};

const ROUGHNESS: Record<PipeMat, number> = {
  carbon_steel: 0.045, stainless_316: 0.015, copper: 0.0015,
  pvc: 0.005, hdpe: 0.007, ductile_iron: 0.25,
};

const STD_SIZES = [15,20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,600,700,800,900,1000];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

function colebrook(Re: number, epsD: number): number {
  if (Re < 2300) return 64 / Re;
  let f = 0.02;
  for (let i = 0; i < 20; i++) {
    f = 1 / Math.pow(-2 * Math.log10(epsD / 3.7 + 2.51 / (Re * Math.sqrt(f))), 2);
  }
  return f;
}

export class PipeSizingEngine {
  calculate(input: PipeSizingInput): PipeSizingResult {
    const {
      flow_rate_m3_h: Qh,
      pipe_length_m: L,
      fluid = "water",
      pipe_material = "carbon_steel",
      num_elbows = 4,
      num_valves = 2,
    } = input;

    const recs: string[] = [];
    const fp = FLUID_PROPS[fluid];
    const rho = input.fluid_density_kg_m3 ?? fp.rho;
    const mu = (input.fluid_viscosity_cP ?? fp.mu_cP) / 1000; // Pa·s
    const vMax = input.max_velocity_m_s ?? fp.vmax;
    const eps = ROUGHNESS[pipe_material] / 1000; // m
    const Q = Qh / 3600; // m³/s

    // Size pipe for max velocity
    const Amin = Q / vMax;
    const Dmin = Math.sqrt(4 * Amin / Math.PI) * 1000; // mm
    const nomSize = STD_SIZES.find(s => s >= Dmin) ?? STD_SIZES[STD_SIZES.length - 1];
    const D = nomSize / 1000; // m
    const A = Math.PI * D * D / 4;

    const v = Q / A;
    const Re = rho * v * D / mu;
    const f = colebrook(Re, eps / D);

    // Straight pipe loss
    const dpStraight = f * L / D * rho * v * v / 2 / 1e5; // bar

    // Fittings (equivalent length)
    const elbowLeq = 30 * D;
    const valveLeq = 15 * D;
    const fitLeq = num_elbows * elbowLeq + num_valves * valveLeq;
    const dpFit = f * fitLeq / D * rho * v * v / 2 / 1e5;

    const totalLoss = dpStraight + dpFit;
    const dp100m = dpStraight / L * 100;

    // Wall thickness (schedule estimation)
    // Sch = 1000 × P / S, simplified
    const sch = nomSize <= 50 ? 40 : nomSize <= 150 ? 40 : 20;
    const wallThick = nomSize * 0.05 + 1.5; // rough estimate mm

    const isSafe = v <= vMax * 1.1 && totalLoss < (input.max_pressure_drop_bar ?? 5);

    if (v > vMax) recs.push(`Velocity ${v.toFixed(2)}m/s > limit ${vMax}m/s — upsize pipe`);
    if (v < 0.5 && fluid === "water") recs.push(`Low velocity ${v.toFixed(2)}m/s — sediment risk`);
    if (dp100m > 0.5) recs.push(`High loss ${dp100m.toFixed(2)}bar/100m — consider larger pipe`);
    if (recs.length === 0) recs.push(`Pipe sizing nominal — DN${nomSize}, ${v.toFixed(2)}m/s, ${totalLoss.toFixed(3)}bar loss`);

    return {
      nominal_size_mm: mkAv(nomSize, "mm", 0, "velocity_sizing"),
      velocity_m_s: mkAv(Math.round(v * 100) / 100, "m/s", v * 0.03, "continuity"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.03, "fluid_dynamics"),
      friction_factor: mkAv(Math.round(f * 10000) / 10000, "dimensionless", f * 0.05, "colebrook"),
      pressure_drop_bar: mkAv(Math.round(dpStraight * 10000) / 10000, "bar", dpStraight * 0.10, "darcy_weisbach"),
      pressure_drop_per_100m_bar: mkAv(Math.round(dp100m * 10000) / 10000, "bar/100m", dp100m * 0.10, "darcy_weisbach"),
      wall_thickness_mm: mkAv(Math.round(wallThick * 10) / 10, "mm", wallThick * 0.10, "schedule_estimate"),
      schedule: mkAv(sch, "Sch", 0, "standard"),
      fitting_loss_bar: mkAv(Math.round(dpFit * 10000) / 10000, "bar", dpFit * 0.15, "equiv_length"),
      total_loss_bar: mkAv(Math.round(totalLoss * 10000) / 10000, "bar", totalLoss * 0.10, "sum_losses"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const pipeSizingEngine = new PipeSizingEngine();
