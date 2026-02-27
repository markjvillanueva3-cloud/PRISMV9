/**
 * EnergyOptimizationEngine — Manufacturing Intelligence Layer
 *
 * Optimizes CNC machining processes for energy consumption while
 * maintaining quality and throughput. Composes SustainabilityEngine.
 *
 * Actions: energy_analyze, energy_optimize, energy_compare, energy_report
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EnergyInput {
  operations: EnergyOperation[];
  machine_power_kW: number;          // spindle motor rated power
  idle_power_kW?: number;            // power when idle (default 20% of rated)
  rapid_power_kW?: number;           // power during rapids (default 30% of rated)
  coolant_pump_kW?: number;          // default 2.2
  air_pressure_kW?: number;          // compressed air system (default 3.0)
  electricity_cost_per_kWh?: number; // default $0.12
}

export interface EnergyOperation {
  operation_name: string;
  cutting_time_min: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  depth_of_cut_mm: number;
  radial_depth_mm: number;
  tool_diameter_mm: number;
  material_iso_group: string;
  coolant_active: boolean;
}

export interface EnergyAnalysis {
  total_energy_kWh: number;
  cutting_energy_kWh: number;
  idle_energy_kWh: number;
  auxiliary_energy_kWh: number;
  sec_per_unit: number;              // specific energy consumption (kWh per cm³ removed)
  carbon_footprint_kg_CO2: number;
  cost: number;
  by_operation: { name: string; energy_kWh: number; pct: number }[];
}

export interface EnergyOptimization {
  original_energy_kWh: number;
  optimized_energy_kWh: number;
  savings_kWh: number;
  savings_pct: number;
  savings_cost: number;
  savings_CO2_kg: number;
  changes: EnergyChange[];
}

export interface EnergyChange {
  operation: string;
  parameter: string;
  old_value: number;
  new_value: number;
  energy_saved_kWh: number;
  rationale: string;
}

// ============================================================================
// ENERGY MODELS
// ============================================================================

/** Specific cutting energy by ISO group (W·s/mm³ = J/mm³) */
const SPECIFIC_CUTTING_ENERGY: Record<string, number> = {
  P: 2.5, M: 3.2, K: 1.8, N: 0.9, S: 4.5, H: 3.8,
};

/** CO2 emission factor: kg CO2 per kWh (US grid average) */
const CO2_PER_KWH = 0.42;

/**
 * Cutting power: P_c = k_c × Q / 60000
 * where k_c = specific cutting energy (N/mm²)
 * Q = MRR (mm³/min) = ae × ap × vf
 */
function cuttingPower(
  kc_Nmm2: number, ae_mm: number, ap_mm: number, feedRate_mmmin: number
): number {
  const Q = ae_mm * ap_mm * feedRate_mmmin; // mm³/min
  return (kc_Nmm2 * Q) / (60 * 1000); // kW
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EnergyOptimizationEngine {
  analyze(input: EnergyInput): EnergyAnalysis {
    const idlePower = input.idle_power_kW || input.machine_power_kW * 0.2;
    const coolantPower = input.coolant_pump_kW || 2.2;
    const airPower = input.air_pressure_kW || 3.0;
    const costPerKwh = input.electricity_cost_per_kWh || 0.12;

    let totalCutEnergy = 0;
    let totalIdleEnergy = 0;
    let totalAuxEnergy = 0;
    let totalVolumeRemoved = 0;
    const byOp: EnergyAnalysis["by_operation"] = [];

    for (const op of input.operations) {
      const kc = (SPECIFIC_CUTTING_ENERGY[op.material_iso_group] || 2.5) * 1000; // convert to N/mm²
      const Pc = cuttingPower(kc, op.radial_depth_mm, op.depth_of_cut_mm, op.feed_rate_mmmin);
      const cutEnergy = Math.min(Pc, input.machine_power_kW) * (op.cutting_time_min / 60);

      // Auxiliary: coolant + air during cutting
      const auxEnergy = (op.coolant_active ? coolantPower : 0 + airPower) * (op.cutting_time_min / 60);

      totalCutEnergy += cutEnergy;
      totalAuxEnergy += auxEnergy;

      // Volume removed for SEC calculation
      const Q = op.radial_depth_mm * op.depth_of_cut_mm * op.feed_rate_mmmin;
      totalVolumeRemoved += (Q * op.cutting_time_min) / 1000; // cm³

      byOp.push({ name: op.operation_name, energy_kWh: Math.round((cutEnergy + auxEnergy) * 1000) / 1000, pct: 0 });
    }

    // Idle time estimate: 15% of total cutting time for tool changes, rapids
    const totalCutTime = input.operations.reduce((s, o) => s + o.cutting_time_min, 0);
    totalIdleEnergy = idlePower * (totalCutTime * 0.15) / 60;

    const totalEnergy = totalCutEnergy + totalIdleEnergy + totalAuxEnergy;

    // Calculate percentages
    for (const op of byOp) { op.pct = Math.round((op.energy_kWh / Math.max(totalEnergy, 0.001)) * 10000) / 100; }

    const sec = totalVolumeRemoved > 0 ? totalEnergy / totalVolumeRemoved : 0;

    return {
      total_energy_kWh: Math.round(totalEnergy * 1000) / 1000,
      cutting_energy_kWh: Math.round(totalCutEnergy * 1000) / 1000,
      idle_energy_kWh: Math.round(totalIdleEnergy * 1000) / 1000,
      auxiliary_energy_kWh: Math.round(totalAuxEnergy * 1000) / 1000,
      sec_per_unit: Math.round(sec * 10000) / 10000,
      carbon_footprint_kg_CO2: Math.round(totalEnergy * CO2_PER_KWH * 1000) / 1000,
      cost: Math.round(totalEnergy * costPerKwh * 100) / 100,
      by_operation: byOp,
    };
  }

  optimize(input: EnergyInput): EnergyOptimization {
    const original = this.analyze(input);
    const changes: EnergyChange[] = [];
    const costPerKwh = input.electricity_cost_per_kWh || 0.12;

    // Clone operations for optimization
    const optimizedOps = input.operations.map(op => ({ ...op }));

    for (let i = 0; i < optimizedOps.length; i++) {
      const op = optimizedOps[i];
      const origOp = input.operations[i];

      // Strategy 1: Optimize MRR — increase depth of cut, reduce speed
      // Higher MRR at lower speed = same throughput with less energy
      if (op.depth_of_cut_mm < op.tool_diameter_mm * 0.4) {
        const newDoc = Math.min(op.tool_diameter_mm * 0.5, op.depth_of_cut_mm * 1.3);
        const rpmReduction = 0.9; // reduce RPM 10% to compensate
        const timeReduction = op.depth_of_cut_mm / newDoc;

        const oldEnergy = this.opEnergy(origOp, input.machine_power_kW);
        op.depth_of_cut_mm = Math.round(newDoc * 100) / 100;
        op.spindle_rpm = Math.round(op.spindle_rpm * rpmReduction);
        op.cutting_time_min = Math.round(op.cutting_time_min * timeReduction * 100) / 100;
        const newEnergy = this.opEnergy(op, input.machine_power_kW);

        if (newEnergy < oldEnergy) {
          changes.push({
            operation: op.operation_name, parameter: "depth_of_cut_mm",
            old_value: origOp.depth_of_cut_mm, new_value: op.depth_of_cut_mm,
            energy_saved_kWh: Math.round((oldEnergy - newEnergy) * 1000) / 1000,
            rationale: "Increased DoC with reduced RPM — same throughput, less energy",
          });
        }
      }

      // Strategy 2: Switch to mist coolant if flooding
      if (op.coolant_active && op.material_iso_group !== "S" && op.material_iso_group !== "M") {
        const coolantSaved = (input.coolant_pump_kW || 2.2) * 0.6 * (op.cutting_time_min / 60);
        if (coolantSaved > 0.01) {
          changes.push({
            operation: op.operation_name, parameter: "coolant",
            old_value: 1, new_value: 0.4,
            energy_saved_kWh: Math.round(coolantSaved * 1000) / 1000,
            rationale: "Switch flood to mist coolant — 60% pump energy reduction",
          });
        }
      }
    }

    const optimized = this.analyze({ ...input, operations: optimizedOps });
    const savings = original.total_energy_kWh - optimized.total_energy_kWh;

    return {
      original_energy_kWh: original.total_energy_kWh,
      optimized_energy_kWh: optimized.total_energy_kWh,
      savings_kWh: Math.round(savings * 1000) / 1000,
      savings_pct: Math.round((savings / Math.max(original.total_energy_kWh, 0.001)) * 10000) / 100,
      savings_cost: Math.round(savings * costPerKwh * 100) / 100,
      savings_CO2_kg: Math.round(savings * CO2_PER_KWH * 1000) / 1000,
      changes,
    };
  }

  compare(scenarios: { name: string; input: EnergyInput }[]): { name: string; analysis: EnergyAnalysis }[] {
    return scenarios.map(s => ({ name: s.name, analysis: this.analyze(s.input) }));
  }

  private opEnergy(op: EnergyOperation, machinePower: number): number {
    const kc = (SPECIFIC_CUTTING_ENERGY[op.material_iso_group] || 2.5) * 1000;
    const Pc = cuttingPower(kc, op.radial_depth_mm, op.depth_of_cut_mm, op.feed_rate_mmmin);
    return Math.min(Pc, machinePower) * (op.cutting_time_min / 60);
  }
}

export const energyOptimizationEngine = new EnergyOptimizationEngine();
