/**
 * FluidCouplingEngine — Fluid Coupling Design Calculator
 *
 * Models: Hydrodynamic (Föttinger) fluid couplings.
 * - Torque transmission T = ρ×n²×D⁵×λ
 * - Slip and efficiency
 * - Heat generation from slip losses
 * - Stall torque and overload protection
 * - Fill level effect on torque
 * - Thermal capacity and cooling
 *
 * Key physics: T = λ×ρ×n²×D⁵. η = n_out/n_in = 1-s.
 * P_loss = P_in × s. Stall T ≈ 2-3× rated T.
 *
 * Reference: Voith Turbo — Fluid Coupling Design,
 *            DIN 3138 — Hydrodynamic Couplings,
 *            Bohl — Technical Fluid Mechanics
 *
 * Actions: fluid_coupling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FluidCouplingInput {
  coupling_diameter_mm?: number;
  input_speed_rpm?: number;
  rated_power_kw?: number;
  fill_level_pct?: number;
  fluid_density_kg_m3?: number;
  slip_pct?: number;
  ambient_temp_c?: number;
  cooling?: "natural" | "fan" | "water";
}

export interface FluidCouplingResult {
  transmitted_torque: AtomicValue;
  output_speed: AtomicValue;
  efficiency: AtomicValue;
  heat_generated: AtomicValue;
  stall_torque: AtomicValue;
  overload_ratio: AtomicValue;
  fluid_volume: AtomicValue;
  thermal_capacity: AtomicValue;
  max_continuous_slip: AtomicValue;
  coupling_size_factor: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Cooling capacity W/°C */
const COOL_CAP: Record<string, number> = {
  natural: 5, fan: 25, water: 100,
};

// ── Engine ─────────────────────────────────────────────────────────

export class FluidCouplingEngine {
  calculate(input: FluidCouplingInput): FluidCouplingResult {
    const warnings: string[] = [];
    const D = input.coupling_diameter_mm ?? 400;
    const nIn = input.input_speed_rpm ?? 1500;
    const Prated = input.rated_power_kw ?? 75;
    const fillPct = input.fill_level_pct ?? 85;
    const rhoFluid = input.fluid_density_kg_m3 ?? 870;
    const slipPct = input.slip_pct ?? 3;
    const Tamb = input.ambient_temp_c ?? 40;
    const cooling = input.cooling ?? "natural";

    const slip = slipPct / 100;
    const Dm = D / 1000; // m

    // Transmitted torque from power
    const omega = nIn * 2 * Math.PI / 60;
    const Trated = omega > 0 ? Prated * 1000 / omega : 0;

    // Output speed
    const nOut = nIn * (1 - slip);

    // Efficiency
    const eta = 1 - slip;

    // Heat generated (slip losses)
    const Ploss = Prated * slip; // kW
    const Qloss = Ploss * 1000; // W

    // Stall torque (typically 2-2.5× at full fill)
    const fillFactor = Math.pow(fillPct / 100, 2);
    const stallRatio = 2.5 * fillFactor;
    const Tstall = Trated * stallRatio;

    // Fluid volume
    const Vfluid = 0.4 * Math.PI / 4 * Dm * Dm * Dm
      * 0.3 * fillPct / 100 * 1000; // litres

    // Coupling size factor (λ)
    // T = λ × ρ × n² × D⁵
    const nRps = nIn / 60;
    const lambda = nRps > 0
      ? Trated / (rhoFluid * nRps * nRps
        * Math.pow(Dm, 5))
      : 0;

    // Thermal capacity
    const coolCap = COOL_CAP[cooling] ?? 5;
    const maxTempRise = 80; // °C
    const maxContSlip = coolCap * maxTempRise
      / Math.max(Prated * 10, 1) * 100; // %

    // Thermal capacity (time to overheat at stall)
    const fluidMass = Vfluid * rhoFluid / 1000; // kg
    const Cp = 2000; // J/kgK for oil
    const thermalCap = fluidMass * Cp * maxTempRise
      / 1000; // kJ

    // Warnings
    if (slip > 0.05) {
      warnings.push(
        `Slip ${slipPct}% > 5% — excessive heat generation`
      );
    }
    if (Qloss > coolCap * maxTempRise) {
      warnings.push(
        `Heat ${r0(Qloss)}W exceeds cooling capacity — overheating`
      );
    }
    if (fillPct < 60) {
      warnings.push(
        `Fill ${fillPct}% < 60% — reduced torque and soft start`
      );
    }
    if (fillPct > 95) {
      warnings.push(
        `Fill ${fillPct}% > 95% — risk of hydraulic lock`
      );
    }
    if (Prated > 500 && cooling === "natural") {
      warnings.push(
        "High power with natural cooling — use fan or water"
      );
    }
    if (nIn > 3600) {
      warnings.push("Speed > 3600 RPM — verify coupling balance");
    }

    const src = "FluidCouplingEngine (Voith/DIN 3138)";

    return {
      transmitted_torque: mkAv(r0(Trated), "N·m",
        Trated * 0.05, `P/ω`),
      output_speed: mkAv(r0(nOut), "RPM", 0,
        `n_in×(1-s)`),
      efficiency: mkAv(r1(eta * 100), "%", 0,
        `1-slip`),
      heat_generated: mkAv(r0(Qloss), "W",
        Qloss * 0.1, `P×s`),
      stall_torque: mkAv(r0(Tstall), "N·m",
        Tstall * 0.15, `${r1(stallRatio)}× rated`),
      overload_ratio: mkAv(r1(stallRatio), "×",
        stallRatio * 0.1, `fill=${fillPct}%`),
      fluid_volume: mkAv(r1(Vfluid), "L",
        Vfluid * 0.1, `${fillPct}% fill`),
      thermal_capacity: mkAv(r0(thermalCap), "kJ",
        thermalCap * 0.15, "to max temp"),
      max_continuous_slip: mkAv(r1(maxContSlip), "%",
        maxContSlip * 0.2, cooling),
      coupling_size_factor: mkAv(r4(lambda), "λ",
        lambda * 0.1, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const fluidCouplingEngine = new FluidCouplingEngine();
