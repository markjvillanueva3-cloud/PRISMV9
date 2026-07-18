/**
 * PRISM MCP Server — Thermal Modeling Engine
 *
 * Analytical and numerical thermal models for machining:
 * - Loewen-Shaw cutting temperature (shear zone + interface)
 * - Trigger equation (quick temperature estimation)
 * - Fourier 1D finite-difference heat conduction (explicit)
 * - Thermal expansion compensation
 *
 * Ported from PRISM_THERMAL_MODELING.js (monolith R2.3.1).
 *
 * @module ThermalModelingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LoewenShawParams {
  cuttingSpeed: number;          // m/min
  feed: number;                  // mm/rev (uncut chip thickness)
  depthOfCut: number;            // mm
  specificCuttingForce: number;  // N/mm²
  materialDensity: number;       // kg/m³
  specificHeat: number;          // J/(kg·K)
  thermalConductivity: number;   // W/(m·K)
  ambientTemp?: number;          // °C (default 20)
}

export interface LoewenShawResult {
  shearZoneTemp_C: number;
  interfaceTemp_C: number;
  maxToolTemp_C: number;
  pecletNumber: number;
  powerGenerated_W: number;
  temperatureRise_C: number;
  heatPartition: { chip: number; tool: number; workpiece: number };
}

export interface TriggerParams {
  specificEnergy: number;   // J/mm³
  cuttingSpeed: number;     // m/min
  thermalNumber: number;    // Non-dimensional (0.1–1.0)
}

export interface TriggerResult {
  temperature_C: number;
  criticalTemp_C: number;
  safetyMargin_pct: number;
}

export interface FourierConfig {
  length: number;              // Domain length (mm)
  nodes?: number;              // Number of nodes (default 50)
  timeSteps?: number;          // (default 100)
  dt: number;                  // Time step (s)
  thermalDiffusivity: number;  // α = k/(ρ·c)  (mm²/s)
  initialTemp: number | number[];
  leftBC: { type: "dirichlet" | "neumann"; value: number };
  rightBC: { type: "dirichlet" | "neumann"; value: number };
  heatSource?: { position: number; magnitude: number } | null;
}

export interface FourierResult {
  finalTemperature: number[];
  maxTemp: number;
  minTemp: number;
  history: Array<{ time: number; T: number[] }>;
  fourierNumber: number;
  stable: boolean;
}

export interface ThermalExpansionParams {
  length: number;               // mm
  temperatureChange: number;    // ΔT in °C
  expansionCoefficient: number; // α in 1/°C (e.g. steel ≈ 12e-6)
}

export interface ThermalExpansionResult {
  expansion_mm: number;
  expansion_um: number;
  strainPercent: number;
  compensation_mm: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class ThermalModelingEngineImpl {

  /**
   * Loewen-Shaw analytical cutting temperature model.
   * Predicts shear-zone, tool-chip interface, and max tool temperatures.
   */
  loewenShawTemperature(params: LoewenShawParams): LoewenShawResult {
    const {
      cuttingSpeed, feed, depthOfCut,
      specificCuttingForce, materialDensity, specificHeat,
      thermalConductivity, ambientTemp = 20,
    } = params;

    const V = cuttingSpeed / 60;  // m/s
    const t = feed;               // uncut chip thickness (mm)
    const b = depthOfCut;

    const Fc = specificCuttingForce * t * b;   // N
    const P = Fc * V;                           // W

    const alpha = thermalConductivity / (materialDensity * specificHeat); // m^2/s
    const tM = t / 1000; // uncut chip thickness mm -> m (Pe previously used mm: 1000x high)
    const Pe = (V * tM) / (2 * alpha);

    // Loewen-Shaw (1954) shear-plane temperature: theta_s = theta_0 + Gamma * u_s/(rho*c).
    //  - u_s = shear-zone specific energy ~ SHEAR_ENERGY_FRACTION * total specific cutting
    //    energy (u [N/mm^2 = MPa] = 1e6 J/m^3; shear typically carries ~75% of the total).
    //  - Gamma = fraction of shear heat convected into the chip; Boothroyd/Weiner form
    //    beta_work = 1/(1 + 1.328*sqrt(V*t/alpha)), Gamma = 1 - beta_work (fast cuts sweep
    //    the heat into the chip; V -> 0 sends it all to the work, deltaT -> 0).
    // Row 15 of the verified SFC fix-plan: the previous expression mixed mm/m/s bases and
    // returned K*m^-0.5*s^-0.5 -- outputs on the order of 1e7 "C" (nonphysical; steel at
    // 150 m/min now gives ~335 K rise / ~355 C shear temp, the published Loewen-Shaw band).
    // The register's own FILED replacement carried a spurious Vc factor (K*m/s) and was
    // rejected by the live-code physics pass -- adjudicated to this form
    // (SFC-ROWS-VERIFY-BATCH2-2026-07-01.md).
    const SHEAR_ENERGY_FRACTION = 0.75; // Boothroyd & Knight: shear ~70-80% of total energy
    const u_s = specificCuttingForce * 1e6 * SHEAR_ENERGY_FRACTION; // J/m^3
    const betaWork = 1 / (1 + 1.328 * Math.sqrt(Math.max((V * tM) / alpha, 0)));
    const gammaChip = 1 - betaWork;
    const deltaT = (gammaChip * u_s) / (materialDensity * specificHeat);

    return {
      shearZoneTemp_C: r2(ambientTemp + deltaT),
      interfaceTemp_C: r2(ambientTemp + deltaT * 1.3),
      maxToolTemp_C: r2(ambientTemp + deltaT * 1.1),
      pecletNumber: r4(Pe),
      powerGenerated_W: r2(P),
      temperatureRise_C: r2(deltaT),
      heatPartition: { chip: 0.75, tool: 0.15, workpiece: 0.10 },
    };
  }

  /**
   * Trigger equation — quick temperature estimation.
   * θ = C · u^a · V^b · thermalNumber
   */
  triggerTemperature(params: TriggerParams): TriggerResult {
    const { specificEnergy, cuttingSpeed, thermalNumber } = params;
    const C = 300, a = 0.9, b = 0.3;
    const temperature = C
      * Math.pow(specificEnergy, a)
      * Math.pow(cuttingSpeed / 100, b)
      * thermalNumber;

    return {
      temperature_C: r2(temperature),
      criticalTemp_C: 800,
      safetyMargin_pct: r2((800 - temperature) / 800 * 100),
    };
  }

  /**
   * Fourier 1D finite-difference heat conduction (explicit method).
   * Supports Dirichlet/Neumann BCs and optional point heat source.
   */
  fourierConduction1D(config: FourierConfig): FourierResult {
    const {
      length, nodes = 50, timeSteps = 100, dt,
      thermalDiffusivity, initialTemp,
      leftBC, rightBC, heatSource = null,
    } = config;

    const dx = length / (nodes - 1);
    const Fo = thermalDiffusivity * dt / (dx * dx);

    let T: number[];
    if (Array.isArray(initialTemp)) {
      T = [...initialTemp];
    } else {
      T = Array(nodes).fill(initialTemp);
    }

    const history: FourierResult["history"] = [{ time: 0, T: [...T] }];

    for (let n = 0; n < timeSteps; n++) {
      const Tnew = [...T];

      for (let i = 1; i < nodes - 1; i++) {
        Tnew[i] = T[i] + Fo * (T[i + 1] - 2 * T[i] + T[i - 1]);
        if (heatSource && Math.abs(i * dx - heatSource.position) < dx) {
          Tnew[i] += heatSource.magnitude * dt;
        }
      }

      if (leftBC.type === "dirichlet") {
        Tnew[0] = leftBC.value;
      } else {
        Tnew[0] = Tnew[1] - leftBC.value * dx;
      }

      if (rightBC.type === "dirichlet") {
        Tnew[nodes - 1] = rightBC.value;
      } else {
        Tnew[nodes - 1] = Tnew[nodes - 2] + rightBC.value * dx;
      }

      T = Tnew;

      if ((n + 1) % 10 === 0) {
        history.push({ time: r4((n + 1) * dt), T: [...T] });
      }
    }

    return {
      finalTemperature: T.map(r2),
      maxTemp: r2(Math.max(...T)),
      minTemp: r2(Math.min(...T)),
      history,
      fourierNumber: r4(Fo),
      stable: Fo <= 0.5,
    };
  }

  /**
   * Thermal expansion compensation.
   * ΔL = L · α · ΔT
   */
  thermalExpansion(params: ThermalExpansionParams): ThermalExpansionResult {
    const { length, temperatureChange, expansionCoefficient } = params;
    const expansion = length * expansionCoefficient * temperatureChange;

    return {
      expansion_mm: r6(expansion),
      expansion_um: r2(expansion * 1000),
      strainPercent: r6(expansionCoefficient * temperatureChange * 100),
      compensation_mm: r6(-expansion),
    };
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function r6(v: number): number { return Math.round(v * 1e6) / 1e6; }

export const thermalModelingEngine = new ThermalModelingEngineImpl();
