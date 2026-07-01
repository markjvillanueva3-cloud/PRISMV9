/**
 * FurnaceHeatingEngine — Industrial furnace thermal analysis
 *
 * Models: Heat balance, wall loss (Fourier), combustion efficiency,
 *         soak time (Heisler chart), atmosphere control, fuel consumption
 * References: Trinks & Mawhinney, API 560, NFPA 86
 */

export type FurnaceType = "batch_box" | "continuous_roller" | "pit" | "bell" | "rotary" | "vacuum" | "induction";
export type AtmosphereType = "air" | "nitrogen" | "endothermic" | "exothermic" | "hydrogen" | "vacuum" | "argon";
export type FuelType = "natural_gas" | "propane" | "electric" | "fuel_oil";

export interface FurnaceHeatingInput {
  furnace_type?: FurnaceType;
  atmosphere?: AtmosphereType;
  fuel?: FuelType;
  target_temperature_C: number;
  workpiece_mass_kg: number;
  workpiece_material?: string;       // default "steel"
  initial_temperature_C?: number;    // default 25
  soak_time_min?: number;            // default auto
  furnace_volume_m3?: number;        // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FurnaceHeatingResult {
  heating_time_min: AtomicValue;
  total_cycle_min: AtomicValue;
  heat_required_kWh: AtomicValue;
  fuel_consumption_m3_h: AtomicValue;
  wall_loss_kW: AtomicValue;
  thermal_efficiency_pct: AtomicValue;
  soak_time_min: AtomicValue;
  co2_emission_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [density_kg/m3, specific_heat_J/kgK, thermal_diffusivity_m2/s]
const MATERIAL_THERMAL: Record<string, [number, number, number]> = {
  steel:      [7850, 500, 1.2e-5],
  aluminum:   [2700, 900, 9.7e-5],
  copper:     [8960, 385, 1.1e-4],
  titanium:   [4430, 520, 9.0e-6],
  stainless:  [8000, 500, 4.0e-6],
  cast_iron:  [7200, 460, 1.1e-5],
};

// Fuel data: [heating_value_MJ/m3, CO2_kg/MJ]
const FUEL_DATA: Record<FuelType, [number, number]> = {
  natural_gas: [36, 0.056],
  propane:     [91, 0.063],
  fuel_oil:    [38, 0.074],
  electric:    [3.6, 0], // kWh → MJ, no direct CO2
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FurnaceHeatingEngine {
  calculate(input: FurnaceHeatingInput): FurnaceHeatingResult {
    const {
      furnace_type = "batch_box",
      atmosphere = "air",
      fuel = "natural_gas",
      target_temperature_C: Ttarget,
      workpiece_mass_kg: m,
      workpiece_material = "steel",
      initial_temperature_C: T0 = 25,
      furnace_volume_m3: Vf = 1,
    } = input;

    const recs: string[] = [];
    const mat = MATERIAL_THERMAL[workpiece_material] ?? MATERIAL_THERMAL.steel;
    const [rho, cp, alpha] = mat;
    const [HV, co2Factor] = FUEL_DATA[fuel];

    const deltaT = Ttarget - T0;

    // Heat required for workpiece
    const Qwork = m * cp * deltaT / 3.6e6; // kWh

    // Characteristic dimension (approximate sphere)
    const volume = m / rho; // m³
    const Lc = Math.pow(volume * 3 / (4 * Math.PI), 1 / 3); // radius

    // Heating time (Heisler chart simplified: Fo = α×t/L² for center temp)
    // For 95% of ΔT at center: Fo ≈ 0.5 (slab), adjust for geometry
    const Fo_target = 0.5;
    const heatingTime = Fo_target * Lc * Lc / alpha / 60; // min

    // Soak time (rule: 1 min per mm of thickness, min 15 min)
    const thickness_mm = Lc * 2000;
    const soakTime = input.soak_time_min ?? Math.max(thickness_mm * 0.5, 15);

    const totalCycle = heatingTime + soakTime;

    // Wall losses (Fourier through refractory)
    const wallThickness = 0.2; // m typical
    const kWall = 1.5; // W/mK for firebrick
    const surfaceArea = Math.pow(Vf, 2 / 3) * 6; // cube approximation
    const wallLoss = kWall * surfaceArea * deltaT / wallThickness / 1000; // kW

    // Atmosphere losses (door openings, purge)
    const atmoLoss = atmosphere === "vacuum" ? 0 :
      atmosphere === "air" ? wallLoss * 0.1 : wallLoss * 0.3;

    // Total heat and efficiency
    const totalHeat = Qwork + (wallLoss + atmoLoss) * totalCycle / 60; // kWh
    const efficiency = Qwork / (totalHeat + 0.001) * 100;

    // Fuel consumption
    const fuelRate = fuel === "electric" ? 0 :
      totalHeat * 3.6 / HV / (totalCycle / 60); // m³/h

    // CO2 emissions
    const co2 = totalHeat * 3.6 * co2Factor;

    // Furnace type modifiers
    const typeMod = furnace_type === "vacuum" ? 0.85 :
      furnace_type === "induction" ? 0.90 : furnace_type === "continuous_roller" ? 1.1 : 1.0;
    const adjEfficiency = Math.min(efficiency * typeMod, 95);

    const isSafe = Ttarget < 1300 && efficiency > 15 && soakTime > 5;

    if (Ttarget > 1200) recs.push(`High temperature ${Ttarget}°C — verify refractory rating`);
    if (efficiency < 30) recs.push(`Low efficiency ${adjEfficiency.toFixed(0)}% — improve insulation or load factor`);
    if (atmosphere === "air" && Ttarget > 800) recs.push(`Air atmosphere at ${Ttarget}°C — heavy scale, use protective atmosphere`);
    if (heatingTime > 120) recs.push(`Long heating ${heatingTime.toFixed(0)}min — consider preheating or smaller workpieces`);
    if (furnace_type === "vacuum" && Ttarget < 400) recs.push(`Vacuum furnace for ${Ttarget}°C — consider simpler atmosphere furnace`);
    if (recs.length === 0) recs.push(`Furnace nominal — ${totalCycle.toFixed(0)}min cycle, η=${adjEfficiency.toFixed(0)}%, ${totalHeat.toFixed(1)}kWh`);

    return {
      heating_time_min: mkAv(Math.round(heatingTime * 10) / 10, "min", heatingTime * 0.20, "heisler_Fo"),
      total_cycle_min: mkAv(Math.round(totalCycle * 10) / 10, "min", totalCycle * 0.15, "heat_soak"),
      heat_required_kWh: mkAv(Math.round(totalHeat * 100) / 100, "kWh", totalHeat * 0.15, "mcpDT_losses"),
      fuel_consumption_m3_h: mkAv(Math.round(fuelRate * 1000) / 1000, "m³/h", fuelRate * 0.10, "Q_HV"),
      wall_loss_kW: mkAv(Math.round(wallLoss * 100) / 100, "kW", wallLoss * 0.25, "fourier_wall"),
      thermal_efficiency_pct: mkAv(Math.round(adjEfficiency * 10) / 10, "%", adjEfficiency * 0.10, "Qwork_Qtotal"),
      soak_time_min: mkAv(soakTime, "min", soakTime * 0.15, "thickness_rule"),
      co2_emission_kg: mkAv(Math.round(co2 * 100) / 100, "kg", co2 * 0.10, "fuel_factor"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const furnaceHeatingEngine = new FurnaceHeatingEngine();
