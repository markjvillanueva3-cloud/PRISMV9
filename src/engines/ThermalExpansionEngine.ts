/**
 * PRISM MCP Server -- Thermal Expansion Engine
 *
 * Thermal dimensional accuracy analysis:
 * - Linear thermal expansion with CTE database (12 materials)
 * - Machine tool thermal error (Bryan's principles)
 * - Thermal compensation (sensor-based)
 *
 * Based on MIT 2.75 (Precision Machine Design), Bryan Principles.
 * Ported from PRISM_THERMAL_EXPANSION_ENGINE.js (monolith R2.3.1).
 *
 * @module ThermalExpansionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExpansionResult {
  expansion_mm: number;
  expansion_um: number;
  percentChange: number;
  CTE_per_C: number;
  material: string;
}

export interface MachineGeometry {
  X_axis_length?: number;
  Y_axis_length?: number;
  Z_axis_length?: number;
}

export interface TemperatureField {
  X_gradient?: number;
  Y_gradient?: number;
  Z_gradient?: number;
  spindle_delta?: number;
}

export interface ThermalErrorResult {
  linearErrors_mm: { X: number; Y: number; Z: number };
  linearErrors_um: { X: number; Y: number; Z: number };
  spindleGrowth_um: number;
  angularErrors_urad: { X: number; Y: number };
  totalVolumetricError_um: number;
  recommendations: string[];
}

export interface CompensationResult {
  compensation_X_um: number;
  compensation_Y_um: number;
  compensation_Z_um: number;
  temperatureDeltas: Array<{ sensor: string; delta: number; position?: unknown }>;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const CTE_DB: Record<string, number> = {
  steel: 11.7e-6,
  stainless_steel: 17.3e-6,
  aluminum: 23.1e-6,
  brass: 19e-6,
  copper: 16.5e-6,
  cast_iron: 10.5e-6,
  granite: 6e-6,
  invar: 1.2e-6,
  super_invar: 0.6e-6,
  zerodur: 0.02e-6,
  ceramic: 7e-6,
  carbide: 5.5e-6,
};

class ThermalExpansionEngineImpl {

  /** Linear thermal expansion: ΔL = L × α × ΔT. */
  linearExpansion(originalLength: number, temperatureChange: number, material?: string, CTE?: number): ExpansionResult {
    const alpha = CTE ?? CTE_DB[material?.toLowerCase() ?? ""] ?? 12e-6;
    const dL = originalLength * alpha * temperatureChange;
    return {
      expansion_mm: dL,
      expansion_um: dL * 1000,
      percentChange: (dL / originalLength) * 100,
      CTE_per_C: alpha,
      material: material ?? "default_steel",
    };
  }

  /** Machine tool thermal error (Bryan's principles). */
  machineToolThermalError(geometry: MachineGeometry, temps: TemperatureField): ThermalErrorResult {
    const Xlen = geometry.X_axis_length ?? 500;
    const Ylen = geometry.Y_axis_length ?? 400;
    const Zlen = geometry.Z_axis_length ?? 300;
    const Xg = temps.X_gradient ?? 1;
    const Yg = temps.Y_gradient ?? 0.5;
    const Zg = temps.Z_gradient ?? 0.8;
    const spDelta = temps.spindle_delta ?? 5;

    const alpha_s = 10.5e-6; // cast iron structure
    const alpha_sp = 11.7e-6; // steel spindle

    const dX = Xlen * alpha_s * Xg;
    const dY = Ylen * alpha_s * Yg;
    const dZ = Zlen * alpha_s * Zg;
    const spindleGrowth = 150 * alpha_sp * spDelta; // 150mm spindle length

    const height = 300;
    const angX = Math.atan(Xlen * alpha_s * Xg / height) * 1e6;
    const angY = Math.atan(Ylen * alpha_s * Yg / height) * 1e6;

    const totalZ = dZ + spindleGrowth;
    const total = Math.sqrt(dX * dX + dY * dY + totalZ * totalZ);

    return {
      linearErrors_mm: { X: dX, Y: dY, Z: totalZ },
      linearErrors_um: { X: dX * 1000, Y: dY * 1000, Z: totalZ * 1000 },
      spindleGrowth_um: spindleGrowth * 1000,
      angularErrors_urad: { X: angX, Y: angY },
      totalVolumetricError_um: total * 1000,
      recommendations: this._thermalRecommendations(total * 1000, temps),
    };
  }

  /** Thermal compensation from sensor readings. */
  thermalCompensation(
    measured: Array<{ sensor_id: string; temp: number; position?: unknown }>,
    reference: Array<{ sensor_id: string; temp: number }>,
    compensationMatrix?: Array<{ X: number; Y: number; Z: number }>,
  ): CompensationResult {
    const deltas = measured.map((m, i) => ({
      sensor: m.sensor_id,
      delta: m.temp - (reference[i]?.temp ?? 20),
      position: m.position,
    }));

    if (!compensationMatrix) {
      const avg = deltas.reduce((s, t) => s + t.delta, 0) / deltas.length;
      return {
        compensation_X_um: avg * 10,
        compensation_Y_um: avg * 8,
        compensation_Z_um: avg * 12,
        temperatureDeltas: deltas,
        method: "simple_average",
      };
    }

    let cX = 0, cY = 0, cZ = 0;
    for (let i = 0; i < deltas.length; i++) {
      if (compensationMatrix[i]) {
        cX += compensationMatrix[i].X * deltas[i].delta;
        cY += compensationMatrix[i].Y * deltas[i].delta;
        cZ += compensationMatrix[i].Z * deltas[i].delta;
      }
    }

    return {
      compensation_X_um: cX,
      compensation_Y_um: cY,
      compensation_Z_um: cZ,
      temperatureDeltas: deltas,
      method: "matrix_compensation",
    };
  }

  /** Get CTE for a material. */
  getCTE(material: string): number {
    return CTE_DB[material.toLowerCase()] ?? 12e-6;
  }

  private _thermalRecommendations(totalError_um: number, temps: TemperatureField): string[] {
    const recs: string[] = [];
    if (totalError_um > 50) recs.push("Consider active thermal compensation");
    if ((temps.spindle_delta ?? 0) > 3) recs.push("Improve spindle cooling or increase warmup time");
    if ((temps.X_gradient ?? 0) > 1 || (temps.Y_gradient ?? 0) > 1) recs.push("Check environmental temperature control");
    if (totalError_um > 10) recs.push("Allow thermal stabilization before precision operations");
    return recs.length > 0 ? recs : ["Thermal errors within acceptable limits"];
  }
}

export const thermalExpansionEngine = new ThermalExpansionEngineImpl();
