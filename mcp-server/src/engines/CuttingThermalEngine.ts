/**
 * PRISM MCP Server -- Cutting Thermal Engine
 *
 * Cutting zone thermal analysis:
 * - Shear plane temperature (Trigger-Chao model)
 * - Tool-chip interface temperature (Jaeger moving heat source)
 * - Heat partition (Shaw effusivity model)
 *
 * Based on MIT 16.050, Trigger-Chao, Loewen-Shaw.
 * Ported from PRISM_CUTTING_THERMAL_ENGINE.js (monolith R2.3.1).
 *
 * @module CuttingThermalEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialThermal {
  density?: number;            // kg/m³
  specificHeat?: number;       // J/(kg·K)
  thermalConductivity?: number; // W/(m·K)
  ambientTemp?: number;        // °C
}

export interface ToolThermal {
  thermalConductivity?: number; // W/(m·K)
  density?: number;             // kg/m³
  specificHeat?: number;        // J/(kg·K)
}

export interface ShearPlaneParams {
  cuttingSpeed: number;   // m/min
  feed: number;           // mm/rev
  shearStrength: number;  // MPa
  shearAngle: number;     // radians
  rakeAngle?: number;     // radians
  material?: MaterialThermal;
}

export interface ShearPlaneResult {
  temperatureRise_C: number;
  shearZoneTemp_C: number;
  thermalNumber: number;
  shearVelocity_mps: number;
  heatRegime: "high_speed" | "low_speed";
}

export interface InterfaceTempParams {
  cuttingSpeed: number;       // m/min
  feed: number;               // mm/rev
  depthOfCut: number;         // mm
  specificCuttingEnergy: number; // J/mm³
  material?: MaterialThermal;
  tool?: ToolThermal;
}

export interface InterfaceTempResult {
  interfaceTemperature_C: number;
  toolAverageTemp_C: number;
  heatPartitionToTool: number;
  heatPartitionToChip: number;
  pecletNumber: number;
  contactLength_mm: number;
  heatFlux_W_m2: number;
  cuttingPower_W: number;
}

export interface HeatPartitionParams {
  cuttingSpeed: number;     // m/min
  workMaterial?: string;
  toolMaterial?: string;
}

export interface HeatPartitionResult {
  toChip_percent: number;
  toTool_percent: number;
  toWorkpiece_percent: number;
  effusivityWork: number;
  effusivityTool: number;
  speedFactor: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const MATERIAL_DB: Record<string, { k: number; rho: number; c: number }> = {
  steel:    { k: 50,  rho: 7850,  c: 500 },
  aluminum: { k: 205, rho: 2700,  c: 900 },
  titanium: { k: 7.2, rho: 4500,  c: 520 },
  carbide:  { k: 80,  rho: 14000, c: 300 },
  ceramic:  { k: 30,  rho: 3900,  c: 800 },
  hss:      { k: 27,  rho: 8100,  c: 460 },
};

class CuttingThermalEngineImpl {

  /** Shear plane temperature rise (Trigger-Chao model). */
  shearPlaneTemperature(params: ShearPlaneParams): ShearPlaneResult {
    const { cuttingSpeed: V, feed: f, shearStrength: tau_s, shearAngle: phi } = params;
    const alpha = params.rakeAngle ?? 0.1;
    const rho = params.material?.density ?? 7850;
    const c = params.material?.specificHeat ?? 500;
    const k = params.material?.thermalConductivity ?? 50;
    const T_0 = params.material?.ambientTemp ?? 25;

    const alpha_th = k / (rho * c);
    const V_ms = V / 60;
    const V_s = V_ms * Math.cos(alpha) / Math.cos(phi - alpha);
    const t_1 = f / 1000;
    const L = t_1 / Math.sin(phi);
    const R_t = V_s * L / alpha_th;

    let theta_s: number;
    if (R_t > 10) {
      theta_s = 0.4 * tau_s * 1e6 / (rho * c);
    } else {
      theta_s = (tau_s * 1e6 / (rho * c)) * (1 / (1 + Math.sqrt(1 / R_t)));
    }

    return {
      temperatureRise_C: theta_s,
      shearZoneTemp_C: T_0 + theta_s,
      thermalNumber: R_t,
      shearVelocity_mps: V_s,
      heatRegime: R_t > 10 ? "high_speed" : "low_speed",
    };
  }

  /** Tool-chip interface temperature (Jaeger moving heat source). */
  toolChipInterfaceTemp(params: InterfaceTempParams): InterfaceTempResult {
    const { cuttingSpeed: V, feed: f, depthOfCut: d, specificCuttingEnergy: u_c } = params;
    const rho_w = params.material?.density ?? 7850;
    const c_w = params.material?.specificHeat ?? 500;
    const k_w = params.material?.thermalConductivity ?? 50;
    const T_0 = params.material?.ambientTemp ?? 25;
    const k_t = params.tool?.thermalConductivity ?? 80;

    const alpha_w = k_w / (rho_w * c_w);
    const V_ms = V / 60;
    const L_c = f * 2; // Zorev approximation (mm)
    const MRR = V * f * d / 60000; // m³/s
    const P_cut = u_c * 1e9 * MRR;
    const A_contact = L_c * d / 1e6; // m²
    const q_flux = P_cut / A_contact;
    const L = L_c / 1000;
    const Pe = V_ms * L / (2 * alpha_w);

    let T_interface: number;
    if (Pe > 5) {
      T_interface = T_0 + 0.754 * q_flux * Math.sqrt(L / (k_w * rho_w * c_w * V_ms));
    } else {
      T_interface = T_0 + q_flux * L / k_w * 0.5;
    }

    const rho_t = params.tool?.density ?? 14000;
    const c_t = params.tool?.specificHeat ?? 300;
    const beta = Math.sqrt(k_w * rho_w * c_w);
    const beta_t = Math.sqrt(k_t * rho_t * c_t);
    const R_tool = beta / (beta + beta_t);
    const T_tool_avg = T_0 + (q_flux * R_tool) * Math.sqrt(L / (k_t * rho_t * c_t * V_ms));

    return {
      interfaceTemperature_C: T_interface,
      toolAverageTemp_C: T_tool_avg,
      heatPartitionToTool: R_tool,
      heatPartitionToChip: 1 - R_tool,
      pecletNumber: Pe,
      contactLength_mm: L_c,
      heatFlux_W_m2: q_flux,
      cuttingPower_W: P_cut,
    };
  }

  /** Heat partition model (Shaw effusivity). */
  heatPartition(params: HeatPartitionParams): HeatPartitionResult {
    const { cuttingSpeed: V, workMaterial, toolMaterial } = params;
    const work = MATERIAL_DB[workMaterial?.toLowerCase() ?? ""] ?? MATERIAL_DB.steel;
    const tool = MATERIAL_DB[toolMaterial?.toLowerCase() ?? ""] ?? MATERIAL_DB.carbide;

    const e_work = Math.sqrt(work.k * work.rho * work.c);
    const e_tool = Math.sqrt(tool.k * tool.rho * tool.c);

    const V_ref = 100;
    const speed_factor = 1 - 0.3 * Math.log10(V / V_ref);
    const R_chip = 0.6 + 0.2 * speed_factor;
    const R_tool = (1 - R_chip) * e_work / (e_work + e_tool);
    const R_work = 1 - R_chip - R_tool;

    return {
      toChip_percent: R_chip * 100,
      toTool_percent: R_tool * 100,
      toWorkpiece_percent: R_work * 100,
      effusivityWork: e_work,
      effusivityTool: e_tool,
      speedFactor: speed_factor,
    };
  }
}

export const cuttingThermalEngine = new CuttingThermalEngineImpl();
