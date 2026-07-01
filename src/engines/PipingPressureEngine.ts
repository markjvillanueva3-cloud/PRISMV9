/**
 * PipingPressureEngine — Pipe Flow & Pressure Drop Calculator
 *
 * Models: Fluid flow through pipes, pressure drop, pipe sizing.
 * - Darcy-Weisbach friction loss
 * - Reynolds number and flow regime
 * - Moody friction factor (Colebrook-White)
 * - Minor losses (fittings, valves)
 * - Pipe wall thickness (Barlow's formula)
 * - Flow velocity check
 *
 * Key physics: ΔP = f×(L/D)×(ρv²/2) (Darcy-Weisbach).
 * Re = ρvD/μ. 1/√f = -2log(ε/(3.7D) + 2.51/(Re√f)).
 * Barlow: t = PD/(2S).
 *
 * Reference: Crane TP-410 (flow of fluids),
 *            ASME B31.3 (process piping),
 *            Moody Chart
 *
 * Actions: piping_pressure_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PipingPressureInput {
  flow_rate_lpm?: number;
  pipe_inner_dia_mm?: number;
  pipe_length_m?: number;
  fluid?: "water" | "oil_hydraulic" | "air" | "coolant";
  fluid_density_kg_m3?: number;
  fluid_viscosity_pa_s?: number;
  fluid_temp_c?: number;
  roughness_mm?: number;
  num_elbows_90?: number;
  num_elbows_45?: number;
  num_tees?: number;
  num_valves_gate?: number;
  num_valves_globe?: number;
  elevation_change_m?: number;
  pipe_material?: "carbon_steel" | "stainless" | "copper" | "pvc";
  design_pressure_bar?: number;
}

export interface PipingPressureResult {
  velocity: AtomicValue;
  reynolds_number: AtomicValue;
  flow_regime: AtomicValue;
  friction_factor: AtomicValue;
  friction_loss: AtomicValue;
  minor_loss: AtomicValue;
  elevation_loss: AtomicValue;
  total_pressure_drop: AtomicValue;
  min_wall_thickness: AtomicValue;
  pipe_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Fluid properties: [density_kg_m3, viscosity_Pa_s] at ~20°C */
const FLUIDS: Record<string, [number, number]> = {
  water: [998, 0.001],
  oil_hydraulic: [870, 0.032],
  air: [1.2, 0.000018],
  coolant: [1020, 0.0015],
};

/** Pipe roughness (mm) */
const ROUGHNESS: Record<string, number> = {
  carbon_steel: 0.045,
  stainless: 0.015,
  copper: 0.0015,
  pvc: 0.0015,
};

/** Minor loss K values */
const K_VALUES = {
  elbow_90: 0.75,
  elbow_45: 0.35,
  tee: 1.0,
  valve_gate: 0.15,
  valve_globe: 6.0,
};

/** Pipe material yield strength (MPa) */
const PIPE_YIELD: Record<string, number> = {
  carbon_steel: 240,
  stainless: 205,
  copper: 70,
  pvc: 45,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PipingPressureEngine {
  calculate(input: PipingPressureInput): PipingPressureResult {
    const warnings: string[] = [];
    const Q = (input.flow_rate_lpm ?? 100) / 60000; // L/min → m³/s
    const D = (input.pipe_inner_dia_mm ?? 50) / 1000; // mm → m
    const L = input.pipe_length_m ?? 20;
    const fluidKey = input.fluid ?? "water";
    const [rho, mu] = FLUIDS[fluidKey] ?? FLUIDS.water;
    const density = input.fluid_density_kg_m3 ?? rho;
    const visc = input.fluid_viscosity_pa_s ?? mu;
    const pipeMat = input.pipe_material ?? "carbon_steel";
    const eps = (input.roughness_mm ?? ROUGHNESS[pipeMat] ?? 0.045) / 1000; // mm → m

    // Velocity
    const A = Math.PI * D * D / 4;
    const v = Q / A;

    // Reynolds number
    const Re = density * v * D / visc;

    // Flow regime
    const regime = Re < 2300 ? "laminar" : Re < 4000 ? "transition" : "turbulent";

    // Friction factor (Colebrook-White, iterative)
    let f: number;
    if (Re < 2300) {
      f = 64 / Re;
    } else {
      // Swamee-Jain explicit approximation
      const term = eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9);
      f = 0.25 / Math.pow(Math.log10(term), 2);
    }

    // Friction loss: ΔP = f × (L/D) × (ρv²/2) in Pa → bar
    const frictionLoss = f * (L / D) * (density * v * v / 2); // Pa

    // Minor losses
    const nElb90 = input.num_elbows_90 ?? 4;
    const nElb45 = input.num_elbows_45 ?? 0;
    const nTee = input.num_tees ?? 1;
    const nGate = input.num_valves_gate ?? 1;
    const nGlobe = input.num_valves_globe ?? 0;

    const Ktotal = nElb90 * K_VALUES.elbow_90 +
      nElb45 * K_VALUES.elbow_45 +
      nTee * K_VALUES.tee +
      nGate * K_VALUES.valve_gate +
      nGlobe * K_VALUES.valve_globe;

    const minorLoss = Ktotal * (density * v * v / 2); // Pa

    // Elevation loss
    const dH = input.elevation_change_m ?? 0;
    const elevLoss = density * 9.81 * dH; // Pa

    // Total pressure drop
    const totalDrop = (frictionLoss + minorLoss + elevLoss) / 1e5; // Pa → bar

    // Wall thickness (Barlow's formula): t = P×D/(2×S×E)
    const designP = input.design_pressure_bar ?? Math.max(totalDrop * 2, 10);
    const S = PIPE_YIELD[pipeMat] ?? 240;
    const E_weld = 0.85; // weld joint efficiency
    const tMin = (designP * 0.1 * D * 1000) / (2 * S * E_weld); // mm
    // Add corrosion allowance
    const tMinCorr = tMin + (pipeMat === "carbon_steel" ? 1.5 : 0.5);

    // Feasibility
    const feasible = v > 0 && v < 6 && totalDrop < 10;

    // Warnings
    if (v > 3 && fluidKey === "water") {
      warnings.push(`Velocity ${r2(v)} m/s > 3 m/s — erosion risk in water service`);
    }
    if (v > 6) {
      warnings.push(`Velocity ${r2(v)} m/s very high — noise, vibration, erosion`);
    }
    if (v < 0.5 && fluidKey !== "air") {
      warnings.push(`Velocity ${r2(v)} m/s < 0.5 — sedimentation risk`);
    }
    if (regime === "transition") {
      warnings.push("Transition flow regime — unstable, results less accurate");
    }
    if (totalDrop > 5) {
      warnings.push(`Total ΔP ${r2(totalDrop)} bar — consider larger pipe or booster pump`);
    }
    if (nGlobe > 0) {
      warnings.push(`${nGlobe} globe valve(s) — high resistance, consider gate or ball valve`);
    }

    const src = "PipingPressureEngine (Crane TP-410/ASME B31.3)";
    const Dmm = D * 1000;

    return {
      velocity: mkAv(r2(v), "m/s", v * 0.03, `Q/${r1(A * 1e6)}mm²`),
      reynolds_number: mkAv(r0(Re), "Re", Re * 0.05, `ρvD/μ`),
      flow_regime: mkAv(Re < 2300 ? 1 : Re < 4000 ? 2 : 3, regime, 0, `Re=${r0(Re)}`),
      friction_factor: mkAv(r4(f), "f", f * 0.05, regime === "laminar" ? "64/Re" : "Swamee-Jain"),
      friction_loss: mkAv(r3(frictionLoss / 1e5), "bar", frictionLoss / 1e5 * 0.1,
        `f×L/D×ρv²/2, L=${L}m`),
      minor_loss: mkAv(r3(minorLoss / 1e5), "bar", minorLoss / 1e5 * 0.15,
        `ΣK=${r1(Ktotal)}`),
      elevation_loss: mkAv(r3(elevLoss / 1e5), "bar", 0, `ρgH, H=${dH}m`),
      total_pressure_drop: mkAv(r3(totalDrop), "bar", totalDrop * 0.1,
        "friction + minor + elevation"),
      min_wall_thickness: mkAv(r1(tMinCorr), "mm", 0.5,
        `Barlow at ${designP}bar + corrosion`),
      pipe_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const pipingPressureEngine = new PipingPressureEngine();
