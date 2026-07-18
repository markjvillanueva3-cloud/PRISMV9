/**
 * PRISM MCP Server — Heat Transfer Engine
 *
 * Fundamental heat transfer for machining environments:
 * - Steady-state 1D conduction (Fourier's law)
 * - Transient lumped capacitance cooling/heating
 * - Forced convection heat transfer coefficient (Nusselt correlations)
 * - Coolant effectiveness estimation
 *
 * Ported from PRISM_HEAT_TRANSFER_ENGINE.js (monolith R2.3.1).
 * FDM transient conduction omitted — see ThermalModelingEngine.fourierConduction1D.
 *
 * @module HeatTransferEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Conduction1DParams {
  thermalConductivity: number;  // W/(m·K)
  length: number;               // m
  crossSectionArea: number;     // m²
  T_hot: number;                // °C
  T_cold: number;               // °C
}

export interface Conduction1DResult {
  heatFlux_W: number;
  heatFlux_W_m2: number;
  thermalResistance_K_W: number;
  temperatureGradient_K_m: number;
}

export interface LumpedCapacitanceParams {
  mass: number;               // kg
  specificHeat: number;       // J/(kg·K)
  surfaceArea: number;        // m²
  heatTransferCoeff: number;  // W/(m²·K)
  T_initial: number;          // °C
  T_ambient: number;          // °C
  time: number;               // s
}

export interface LumpedCapacitanceResult {
  temperature_C: number;
  timeConstant_s: number;
  coolingRate_C_s: number;
  percentComplete: number;
  time95percent_s: number;
}

export interface ConvectionParams {
  velocity: number;              // m/s
  characteristicLength: number;  // m
  fluidType?: "air" | "water" | "oil" | "coolant";
}

export interface ConvectionResult {
  heatTransferCoeff_W_m2K: number;
  reynoldsNumber: number;
  nusseltNumber: number;
  prandtlNumber: number;
  flowRegime: "laminar" | "transition" | "turbulent";
}

export interface CoolantParams {
  cuttingSpeed: number;           // m/min
  flowRate: number;               // L/min
  coolantType?: "water_based" | "straight_oil" | "synthetic" | "semi_synthetic" | "mql";
  nozzleDiameter?: number;        // mm
  nozzleDistance?: number;         // mm
}

export interface CoolantResult {
  effectiveHTC_W_m2K: number;
  jetVelocity_m_s: number;
  momentumRatio: number;
  penetrationFactor: number;
  estimatedTempReduction_C: number;
  frictionReduction_percent: number;
  recommendation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class HeatTransferEngineImpl {

  /**
   * 1D steady-state conduction (Fourier's law).
   * q = k · A · ΔT / L
   */
  steadyStateConduction1D(params: Conduction1DParams): Conduction1DResult {
    const { thermalConductivity: k, length: L, crossSectionArea: A,
      T_hot, T_cold } = params;
    const dT = T_hot - T_cold;
    const q = k * A * dT / L;

    return {
      heatFlux_W: r2(q),
      heatFlux_W_m2: r2(k * dT / L),
      thermalResistance_K_W: r6(L / (k * A)),
      temperatureGradient_K_m: r2(-dT / L),
    };
  }

  /**
   * Transient cooling/heating via lumped capacitance model.
   * Valid when Biot number < 0.1.
   */
  transientLumpedCapacitance(params: LumpedCapacitanceParams): LumpedCapacitanceResult {
    const { mass: m, specificHeat: c, surfaceArea: A_s,
      heatTransferCoeff: h, T_initial, T_ambient, time: t } = params;

    const tau = m * c / (h * A_s);
    const T = T_ambient + (T_initial - T_ambient) * Math.exp(-t / tau);
    const dT_dt = -(T_initial - T_ambient) / tau * Math.exp(-t / tau);

    return {
      temperature_C: r2(T),
      timeConstant_s: r2(tau),
      coolingRate_C_s: r4(Math.abs(dT_dt)),
      percentComplete: r2((1 - Math.exp(-t / tau)) * 100),
      time95percent_s: r2(3 * tau),
    };
  }

  /**
   * Forced convection heat transfer coefficient.
   * Uses Nusselt correlations for flat plate (laminar/turbulent).
   */
  forcedConvectionCoefficient(params: ConvectionParams): ConvectionResult {
    const { velocity: U, characteristicLength: L, fluidType = "air" } = params;

    const fluids: Record<string, { rho: number; mu: number; k: number; cp: number; Pr: number }> = {
      air:     { rho: 1.2,   mu: 1.8e-5, k: 0.026, cp: 1006, Pr: 0.71 },
      water:   { rho: 1000,  mu: 1e-3,   k: 0.6,   cp: 4186, Pr: 7 },
      oil:     { rho: 870,   mu: 0.03,   k: 0.14,  cp: 1880, Pr: 400 },
      coolant: { rho: 1050,  mu: 2e-3,   k: 0.5,   cp: 3500, Pr: 14 },
    };

    const fluid = fluids[fluidType] ?? fluids.water;
    const Re = fluid.rho * U * L / fluid.mu;

    const flowRegime: ConvectionResult["flowRegime"] =
      Re < 2300 ? "laminar" : Re < 4000 ? "transition" : "turbulent";

    let Nu: number;
    if (Re < 2300) {
      Nu = 0.664 * Math.pow(Re, 0.5) * Math.pow(fluid.Pr, 1 / 3);
    } else if (Re < 5e5) {
      Nu = 0.0296 * Math.pow(Re, 0.8) * Math.pow(fluid.Pr, 1 / 3);
    } else {
      Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(fluid.Pr, 0.4);
    }

    return {
      heatTransferCoeff_W_m2K: r2(Nu * fluid.k / L),
      reynoldsNumber: r2(Re),
      nusseltNumber: r2(Nu),
      prandtlNumber: fluid.Pr,
      flowRegime,
    };
  }

  /**
   * Coolant effectiveness in machining.
   * Models jet penetration and momentum ratio.
   */
  coolantEffectiveness(params: CoolantParams): CoolantResult {
    const {
      cuttingSpeed: V, flowRate: Q,
      coolantType = "water_based",
      nozzleDiameter: d_n = 3,
      nozzleDistance: _L_n = 50,
    } = params;

    const coolants: Record<string, { h_eff: number; coolingCapacity: number; friction_reduction: number }> = {
      water_based:    { h_eff: 10000, coolingCapacity: 1.0, friction_reduction: 0.15 },
      straight_oil:   { h_eff: 3000,  coolingCapacity: 0.4, friction_reduction: 0.25 },
      synthetic:      { h_eff: 8000,  coolingCapacity: 0.8, friction_reduction: 0.20 },
      semi_synthetic: { h_eff: 7000,  coolingCapacity: 0.7, friction_reduction: 0.22 },
      mql:            { h_eff: 2000,  coolingCapacity: 0.15, friction_reduction: 0.30 },
    };

    const coolant = coolants[coolantType] ?? coolants.water_based;
    const A_nozzle = Math.PI * (d_n / 2 / 1000) ** 2;
    const V_jet = (Q / 60000) / A_nozzle;
    const V_chip = V / 60;
    const momentumRatio = V_jet / (V_chip || 1);

    const penetrationFactor = Math.min(1, momentumRatio / 2);
    const h_actual = coolant.h_eff * penetrationFactor;
    const T_reduction = penetrationFactor * coolant.coolingCapacity * 200;

    return {
      effectiveHTC_W_m2K: r2(h_actual),
      jetVelocity_m_s: r2(V_jet),
      momentumRatio: r4(momentumRatio),
      penetrationFactor: r4(penetrationFactor),
      estimatedTempReduction_C: r2(T_reduction),
      frictionReduction_percent: r2(coolant.friction_reduction * 100 * penetrationFactor),
      recommendation: momentumRatio < 1.5
        ? "Increase flow rate or reduce nozzle diameter for better penetration"
        : "Good coolant delivery",
    };
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function r6(v: number): number { return Math.round(v * 1e6) / 1e6; }

export const heatTransferEngine = new HeatTransferEngineImpl();
