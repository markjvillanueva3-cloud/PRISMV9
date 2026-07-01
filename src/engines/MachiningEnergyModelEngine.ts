/**
 * MachiningEnergyModelEngine — Physics-based energy consumption model per part.
 *
 * Models total energy: spindle power + axis drives + coolant + ATC + idle.
 * Uses Gutowski energy model + Kienzle cutting force.
 * SEC (Specific Energy Consumption) = E_total / V_removed.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface MachiningEnergyInput {
  cutting: {
    spindle_rpm: number;
    feed_rate_mmmin: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    cutting_speed_m_min: number;
  };
  tool: { diameter_mm: number; flute_count: number };
  material: { iso_group: "P" | "M" | "K" | "N" | "S" | "H"; volume_to_remove_cm3: number };
  machine: {
    standby_power_kw: number;
    spindle_efficiency?: number;
    axis_power_kw?: number;
    coolant_pump_kw?: number;
    atc_time_s?: number;
    tool_changes: number;
  };
  coolant_type: "flood" | "mist" | "mql" | "dry";
  electricity_cost_per_kwh?: number;
}

export interface MachiningEnergyResult {
  spindle_kwh: number;
  axis_kwh: number;
  coolant_kwh: number;
  idle_kwh: number;
  atc_kwh: number;
  total_kwh: number;
  sec_j_mm3: number;
  cycle_time_min: number;
  co2_kg: number;
  cost_energy: number;
  efficiency_pct: number;
  recommendations: string[];
}

const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };

export class MachiningEnergyModelEngine {
  compute(input: MachiningEnergyInput): AtomicValue<MachiningEnergyResult> {
    const { cutting, tool, material, machine, coolant_type } = input;
    const kc11 = KC11[material.iso_group] || 2100;
    const fz = cutting.feed_rate_mmmin / (cutting.spindle_rpm * tool.flute_count);
    const hm = fz * Math.sqrt(cutting.radial_depth_mm / tool.diameter_mm);
    const Fc = kc11 * cutting.axial_depth_mm * hm * Math.pow(Math.max(0.001, hm), -0.25);
    const spindlePower = (Fc * cutting.cutting_speed_m_min) / 60000;
    const mrr = (cutting.axial_depth_mm * cutting.radial_depth_mm * cutting.feed_rate_mmmin) / 1000;
    const cycleTime = material.volume_to_remove_cm3 / Math.max(mrr, 0.001) * 1.15;
    const h = cycleTime / 60;
    const eff = machine.spindle_efficiency || 0.85;
    const sE = (spindlePower / eff) * h;
    const aE = (machine.axis_power_kw || 1.5) * h;
    const cP = coolant_type === "flood" ? (machine.coolant_pump_kw || 2.5) : coolant_type === "mist" ? 0.5 : coolant_type === "mql" ? 0.3 : 0;
    const cE = cP * h;
    const iE = machine.standby_power_kw * h * 0.1;
    const atcH = (machine.atc_time_s || 5) * machine.tool_changes / 3600;
    const atcE = machine.standby_power_kw * atcH;
    const total = sE + aE + cE + iE + atcE;
    const sec = (total * 3600000) / (material.volume_to_remove_cm3 * 1000);
    const efficiency = (spindlePower * h / total) * 100;
    const recs: string[] = [];
    if (efficiency < 30) recs.push(`Low cutting efficiency (${efficiency.toFixed(0)}%) — increase MRR.`);
    if (sec > 10) recs.push(`SEC ${sec.toFixed(1)} J/mm³ — increase depth or feed.`);

    const r = (v: number) => Math.round(v * 10000) / 10000;
    return {
      value: {
        spindle_kwh: r(sE), axis_kwh: r(aE), coolant_kwh: r(cE),
        idle_kwh: r(iE), atc_kwh: r(atcE), total_kwh: r(total),
        sec_j_mm3: Math.round(sec * 100) / 100,
        cycle_time_min: Math.round(cycleTime * 100) / 100,
        co2_kg: Math.round(total * 0.42 * 1000) / 1000,
        cost_energy: Math.round(total * (input.electricity_cost_per_kwh || 0.12) * 1000) / 1000,
        efficiency_pct: Math.round(efficiency * 10) / 10,
        recommendations: recs,
      },
      unit: "kWh",
      formula: "Gutowski: E=Σ(P_i×t), SEC=E/V",
      confidence: 0.8,
    };
  }
}

export const machiningEnergyModelEngine = new MachiningEnergyModelEngine();
