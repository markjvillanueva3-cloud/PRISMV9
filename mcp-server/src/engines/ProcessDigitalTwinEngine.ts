/**
 * ProcessDigitalTwinEngine — Unified multi-physics machining simulation.
 *
 * Cascades 7 physics models into a single coherent prediction:
 * 1. Kienzle → Cutting Force
 * 2. Force → Deflection (cantilever beam)
 * 3. Force → Temperature (Jaeger moving heat source)
 * 4. Temperature → Thermal expansion → Dimension shift
 * 5. Taylor → Tool life (with temperature correction)
 * 6. Brammertz → Surface roughness (with deflection + runout)
 * 7. All → Cost model (tool + machine + energy + scrap)
 *
 * The key innovation: each model feeds the next, creating coupled
 * predictions that capture interactions individual models miss.
 *
 * Example: Higher speed → lower force → less deflection BUT higher temp
 * → more thermal growth → net dimensional error depends on both.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface DigitalTwinInput {
  tool: {
    diameter_mm: number;
    flute_count: number;
    helix_angle_deg?: number;
    nose_radius_mm?: number;
    overhang_mm: number;
    material: "carbide" | "hss" | "cermet" | "cbn" | "pcd";
    coating?: "TiAlN" | "TiN" | "AlCrN" | "DLC" | "uncoated";
  };
  cutting: {
    cutting_speed_m_min: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    coolant: "flood" | "mist" | "mql" | "dry";
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
  };
  workpiece: {
    min_wall_mm?: number;       // for springback
    tolerance_mm: number;
    volume_to_remove_cm3?: number;
  };
  machine: {
    spindle_power_kw: number;
    max_rpm: number;
    runout_tir_um?: number;
  };
}

export interface CoupledPrediction {
  // Stage 1: Force
  force: { tangential_n: number; radial_n: number; axial_n: number; torque_nm: number; power_kw: number };
  // Stage 2: Deflection
  deflection: { tool_mm: number; workpiece_mm: number; total_mm: number };
  // Stage 3: Temperature
  temperature: { tool_c: number; chip_c: number; workpiece_surface_c: number };
  // Stage 4: Thermal growth
  thermal: { tool_growth_um: number; workpiece_growth_um: number; net_dim_shift_um: number };
  // Stage 5: Tool life
  tool_life: { minutes: number; meters_cut: number; parts_estimate: number; wear_rate_um_min: number };
  // Stage 6: Surface quality
  surface: { ra_um: number; rz_um: number; waviness_um: number; quality_grade: string };
  // Stage 7: Cost
  cost: {
    tool_cost_per_part: number;
    machine_cost_per_part: number;
    energy_cost_per_part: number;
    total_cost_per_part: number;
    cycle_time_min: number;
  };
  // Cross-domain insights
  dimensional_error_budget: {
    deflection_um: number;
    thermal_um: number;
    runout_um: number;
    total_um: number;
    within_tolerance: boolean;
  };
  bottleneck: string;
  recommendations: string[];
}

const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };
const MC_EXP: Record<string, number> = { P: 0.25, M: 0.25, K: 0.25, N: 0.23, S: 0.28, H: 0.27 };
const TAYLOR_N: Record<string, number> = { P: 0.25, M: 0.20, K: 0.25, N: 0.40, S: 0.15, H: 0.15 };
const TAYLOR_C: Record<string, number> = { P: 350, M: 250, K: 400, N: 600, S: 200, H: 150 };
const THERMAL_K: Record<string, number> = { P: 50, M: 15, K: 80, N: 170, S: 7, H: 30 };
const E_MOD: Record<string, number> = { carbide: 600000, hss: 210000, cermet: 450000, cbn: 700000, pcd: 800000 };
const CTE: Record<string, number> = { P: 12, M: 16, K: 10, N: 23, S: 9, H: 12 }; // μm/m/°C

export class ProcessDigitalTwinEngine {
  compute(input: DigitalTwinInput): AtomicValue<CoupledPrediction> {
    const { tool, cutting, material, workpiece, machine } = input;
    const D = tool.diameter_mm;
    const Z = tool.flute_count;
    const fz = cutting.feed_per_tooth_mm;
    const ap = cutting.axial_depth_mm;
    const ae = cutting.radial_depth_mm;
    const vc = cutting.cutting_speed_m_min;

    // ═══ Stage 1: Cutting Force (Kienzle) ═══
    const kc11 = KC11[material.iso_group] || 2100;
    const mc = MC_EXP[material.iso_group] || 0.25;
    const hm = fz * Math.sqrt(ae / D);
    const Fc = kc11 * ap * hm * Math.pow(Math.max(0.001, hm), -mc);
    const Fr = Fc * 0.35; // radial
    const Fa = Fc * 0.25; // axial
    const torque = (Fc * D / 2) / 1000; // N·m
    const power = (Fc * vc) / 60000; // kW

    // ═══ Stage 2: Deflection ═══
    const E = E_MOD[tool.material] || 600000;
    const I = (Math.PI / 64) * Math.pow(D, 4);
    const L = tool.overhang_mm;
    const toolDeflection = (Fc * L * L * L) / (3 * E * I);

    let wpDeflection = 0;
    if (workpiece.min_wall_mm && workpiece.min_wall_mm < 5) {
      const Ewp = material.iso_group === "N" ? 70000 : 210000;
      const Iwp = (50 * Math.pow(workpiece.min_wall_mm, 3)) / 12; // rough
      wpDeflection = (Fr * 30 * 30 * 30) / (3 * Ewp * Iwp); // assume 30mm height
    }
    const totalDeflection = toolDeflection + wpDeflection;

    // ═══ Stage 3: Temperature (simplified Jaeger) ═══
    const thermalK = THERMAL_K[material.iso_group] || 50;
    const chipTemp = 300 * Math.pow(vc / 100, 0.5) * Math.pow(fz / 0.1, 0.3) / Math.pow(thermalK / 50, 0.4);
    const coolantFactor = cutting.coolant === "flood" ? 0.6 : cutting.coolant === "mql" ? 0.75 : cutting.coolant === "mist" ? 0.7 : 1.0;
    const toolTemp = chipTemp * 0.7 * coolantFactor;
    const wpSurfaceTemp = chipTemp * 0.2 * coolantFactor;

    // ═══ Stage 4: Thermal Growth ═══
    const toolCTE = tool.material === "carbide" ? 6 : tool.material === "hss" ? 12 : 8;
    const toolGrowth = toolCTE * L * (toolTemp - 20) / 1000; // μm
    const wpCTE = CTE[material.iso_group] || 12;
    const wpGrowth = wpCTE * 50 * wpSurfaceTemp / 1000; // μm, assume 50mm feature
    const netDimShift = Math.abs(toolGrowth) + Math.abs(wpGrowth * 0.3); // partial penetration

    // ═══ Stage 5: Tool Life (Taylor with temp correction) ═══
    const n = TAYLOR_N[material.iso_group] || 0.25;
    const C = TAYLOR_C[material.iso_group] || 350;
    const baseTaylorLife = Math.pow(C / Math.max(1, vc), 1 / n);
    // Temperature correction: hotter → shorter life
    const tempCorrection = Math.pow(Math.max(0.5, 600 / Math.max(100, chipTemp)), 0.3);
    // Coating factor
    const coatingFactor = tool.coating === "TiAlN" ? 1.5 : tool.coating === "AlCrN" ? 1.4 :
      tool.coating === "TiN" ? 1.2 : tool.coating === "DLC" ? 1.1 : 1.0;
    const toolLifeMin = baseTaylorLife * tempCorrection * coatingFactor;
    const rpm = (vc * 1000) / (Math.PI * D);
    const feedRate = fz * Z * rpm;
    const metersCut = (toolLifeMin * feedRate) / 1000;
    const mrr = (ap * ae * feedRate) / 1000; // cm³/min
    const volumePerPart = workpiece.volume_to_remove_cm3 || 50;
    const cycleTime = volumePerPart / Math.max(mrr, 0.01) * 1.2; // 20% non-cutting
    const partsPerTool = Math.floor(toolLifeMin / Math.max(cycleTime, 0.01));
    const wearRate = 300 / Math.max(toolLifeMin, 0.1); // VB_max / life

    // ═══ Stage 6: Surface Quality ═══
    const Rn = tool.nose_radius_mm || 0.8;
    const fpr = fz * Z;
    const kinematicRa = ((fpr * fpr) / (8 * Rn)) / 4; // mm → μm would need ×1000
    const deflectionEffect = totalDeflection * 0.3; // 30% of deflection shows as roughness
    const runoutTIR = (machine.runout_tir_um ?? 5) / 1000; // mm
    const runoutEffect = runoutTIR * 0.5;
    const Ra = (kinematicRa + deflectionEffect + runoutEffect) * 1000; // μm
    const Rz = Ra * 4;
    const waviness = (machine.runout_tir_um ?? 5); // μm

    const grade = Ra <= 0.1 ? "N4" : Ra <= 0.2 ? "N5" : Ra <= 0.4 ? "N6" :
      Ra <= 0.8 ? "N7" : Ra <= 1.6 ? "N8" : Ra <= 3.2 ? "N9" : "N10";

    // ═══ Stage 7: Cost ═══
    const toolPrice = tool.material === "carbide" ? 25 : tool.material === "cbn" ? 150 : 15;
    const toolCostPerPart = toolPrice / Math.max(partsPerTool, 1);
    const machineRate = 85; // $/hr
    const machineCostPerPart = (cycleTime / 60) * machineRate;
    const energyCostPerPart = (power * cycleTime / 60) * 0.12; // $/kWh
    const totalCost = toolCostPerPart + machineCostPerPart + energyCostPerPart;

    // ═══ Dimensional Error Budget ═══
    const deflectionErr = totalDeflection * 1000; // μm
    const thermalErr = netDimShift;
    const runoutErr = machine.runout_tir_um ?? 5;
    const totalErr = Math.sqrt(deflectionErr * deflectionErr + thermalErr * thermalErr + runoutErr * runoutErr);
    const tolUm = workpiece.tolerance_mm * 1000;
    const withinTol = totalErr < tolUm;

    // Bottleneck identification
    const bottlenecks: [string, number][] = [
      ["power", power / machine.spindle_power_kw],
      ["deflection", deflectionErr / tolUm],
      ["thermal", thermalErr / tolUm],
      ["tool_life", 30 / Math.max(toolLifeMin, 0.1)], // 30 min target
      ["surface", Ra / 1.6], // 1.6 μm target
    ];
    const bottleneck = bottlenecks.sort((a, b) => b[1] - a[1])[0][0];

    // Recommendations
    const recs: string[] = [];
    if (power > machine.spindle_power_kw * 0.9) {
      recs.push(`Power ${power.toFixed(1)}kW near limit ${machine.spindle_power_kw}kW — reduce depth or speed.`);
    }
    if (!withinTol) {
      recs.push(`Total error ${totalErr.toFixed(1)}μm > tolerance ${tolUm}μm. Largest: ${
        deflectionErr > thermalErr ? "deflection" : "thermal"}.`);
    }
    if (toolLifeMin < 15) {
      recs.push(`Short tool life ${toolLifeMin.toFixed(0)}min — reduce speed or upgrade coating.`);
    }
    if (partsPerTool < 5) {
      recs.push(`Only ${partsPerTool} parts/tool — high tool cost $${toolCostPerPart.toFixed(2)}/part.`);
    }

    const r = (v: number) => Math.round(v * 1000) / 1000;

    return {
      value: {
        force: { tangential_n: r(Fc), radial_n: r(Fr), axial_n: r(Fa), torque_nm: r(torque), power_kw: r(power) },
        deflection: { tool_mm: r(toolDeflection), workpiece_mm: r(wpDeflection), total_mm: r(totalDeflection) },
        temperature: { tool_c: Math.round(toolTemp), chip_c: Math.round(chipTemp), workpiece_surface_c: Math.round(wpSurfaceTemp) },
        thermal: { tool_growth_um: r(toolGrowth), workpiece_growth_um: r(wpGrowth), net_dim_shift_um: r(netDimShift) },
        tool_life: { minutes: r(toolLifeMin), meters_cut: r(metersCut), parts_estimate: partsPerTool, wear_rate_um_min: r(wearRate) },
        surface: { ra_um: r(Ra), rz_um: r(Rz), waviness_um: r(waviness), quality_grade: grade },
        cost: {
          tool_cost_per_part: r(toolCostPerPart), machine_cost_per_part: r(machineCostPerPart),
          energy_cost_per_part: r(energyCostPerPart), total_cost_per_part: r(totalCost), cycle_time_min: r(cycleTime),
        },
        dimensional_error_budget: {
          deflection_um: r(deflectionErr), thermal_um: r(thermalErr), runout_um: runoutErr,
          total_um: r(totalErr), within_tolerance: withinTol,
        },
        bottleneck,
        recommendations: recs,
      },
      unit: "digital_twin",
      formula: "Cascade: Kienzle→Beam→Jaeger→CTE→Taylor→Brammertz→Cost",
      confidence: 0.78,
    };
  }
}

export const processDigitalTwinEngine = new ProcessDigitalTwinEngine();
