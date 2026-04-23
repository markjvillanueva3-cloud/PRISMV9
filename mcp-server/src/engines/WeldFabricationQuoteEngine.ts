/**
 * WeldFabricationQuoteEngine — Welding & Fabrication Cost Estimator
 *
 * Quotes welded assemblies: joint prep, welding (MIG/TIG/stick/flux-core/sub-arc),
 * consumables, welder labor, NDE inspection, stress relief, finishing.
 *
 * @engine WeldFabricationQuoteEngine
 * @dispatcher businessDispatcher
 * @actions weld_fab_quote, weld_fab_joint_cost, weld_fab_consumables
 */

// ── Weld process data ──
interface WeldProcess {
  name: string;
  deposition_rate_kg_hr: number;    // filler metal deposition rate
  duty_cycle_pct: number;           // arc-on time %
  consumable_cost_per_kg: number;   // filler + gas/flux per kg deposited
  labor_rate_per_hr: number;        // welder rate
  overhead_mult: number;            // overhead on labor
  position_factors: Record<string, number>;  // flat=1.0, horizontal, vertical, overhead
  thickness_range_mm: [number, number];
}

const WELD_PROCESSES: Record<string, WeldProcess> = {
  gmaw_mig: {
    name: "GMAW (MIG)", deposition_rate_kg_hr: 3.5, duty_cycle_pct: 40,
    consumable_cost_per_kg: 6.00, labor_rate_per_hr: 45, overhead_mult: 1.35,
    position_factors: { flat: 1.0, horizontal: 1.15, vertical: 1.40, overhead: 1.60 },
    thickness_range_mm: [1.5, 25],
  },
  gmaw_pulse: {
    name: "Pulsed MIG", deposition_rate_kg_hr: 3.0, duty_cycle_pct: 45,
    consumable_cost_per_kg: 6.50, labor_rate_per_hr: 50, overhead_mult: 1.35,
    position_factors: { flat: 1.0, horizontal: 1.10, vertical: 1.25, overhead: 1.40 },
    thickness_range_mm: [1.0, 20],
  },
  gtaw_tig: {
    name: "GTAW (TIG)", deposition_rate_kg_hr: 1.0, duty_cycle_pct: 30,
    consumable_cost_per_kg: 12.00, labor_rate_per_hr: 55, overhead_mult: 1.40,
    position_factors: { flat: 1.0, horizontal: 1.10, vertical: 1.30, overhead: 1.50 },
    thickness_range_mm: [0.5, 12],
  },
  smaw_stick: {
    name: "SMAW (Stick)", deposition_rate_kg_hr: 1.8, duty_cycle_pct: 25,
    consumable_cost_per_kg: 5.50, labor_rate_per_hr: 40, overhead_mult: 1.30,
    position_factors: { flat: 1.0, horizontal: 1.15, vertical: 1.35, overhead: 1.55 },
    thickness_range_mm: [3, 50],
  },
  fcaw: {
    name: "FCAW (Flux Core)", deposition_rate_kg_hr: 5.0, duty_cycle_pct: 45,
    consumable_cost_per_kg: 5.00, labor_rate_per_hr: 45, overhead_mult: 1.35,
    position_factors: { flat: 1.0, horizontal: 1.10, vertical: 1.25, overhead: 1.40 },
    thickness_range_mm: [3, 40],
  },
  saw: {
    name: "SAW (Submerged Arc)", deposition_rate_kg_hr: 8.0, duty_cycle_pct: 60,
    consumable_cost_per_kg: 4.00, labor_rate_per_hr: 45, overhead_mult: 1.30,
    position_factors: { flat: 1.0, horizontal: 1.0, vertical: 99, overhead: 99 }, // flat only
    thickness_range_mm: [6, 100],
  },
};

// ── Joint types: cross-section area per mm of weld length ──
// Area in mm² per mm of length, parameterized by thickness
type JointAreaFn = (t: number, gap?: number, root_face?: number) => number;

const JOINT_AREA: Record<string, JointAreaFn> = {
  // Butt joints
  square_butt: (t, gap = 0) => t * (gap || 1.5),
  single_v: (t, _gap, root = 1.5) => {
    const angle_rad = (60 * Math.PI) / 180; // 60° included
    const h = t - root;
    return root * 1.5 + 0.5 * h * h * Math.tan(angle_rad / 2);
  },
  double_v: (t) => {
    const h = t / 2;
    const angle_rad = (60 * Math.PI) / 180;
    return 2 * (0.5 * h * h * Math.tan(angle_rad / 2));
  },
  // Fillet welds
  fillet: (t) => 0.5 * t * t, // leg = thickness
  double_fillet: (t) => t * t,
  // T-joints
  single_bevel_t: (t) => {
    const angle_rad = (45 * Math.PI) / 180;
    return 0.5 * t * t * Math.tan(angle_rad);
  },
  // Lap joint
  lap: (t) => 0.5 * t * t,
};

// ── NDE inspection costs ──
const NDE_COSTS: Record<string, { per_meter: number; per_joint: number }> = {
  visual: { per_meter: 5, per_joint: 2 },
  dye_penetrant: { per_meter: 15, per_joint: 8 },
  magnetic_particle: { per_meter: 20, per_joint: 10 },
  ultrasonic: { per_meter: 40, per_joint: 20 },
  radiographic: { per_meter: 80, per_joint: 50 },
};

export interface WeldJoint {
  type: string;                    // square_butt, single_v, double_v, fillet, etc.
  length_mm: number;
  thickness_mm: number;
  position?: "flat" | "horizontal" | "vertical" | "overhead";
  gap_mm?: number;
  root_face_mm?: number;
}

export interface WeldFabQuoteInput {
  joints: WeldJoint[];
  process?: string;                // default: gmaw_mig
  material: string;                // for filler metal density
  material_density_kg_m3?: number; // override density
  filler_density_kg_m3?: number;   // filler density (default: 7850 for steel)
  nde_method?: string;             // inspection method
  nde_coverage_pct?: number;       // % of joints inspected (default 100)
  stress_relief?: boolean;
  hot_dip_galvanize?: boolean;
  blast_and_paint?: boolean;
  quantity?: number;               // number of assemblies
  fit_up_hours?: number;           // manual override for fit-up labor
  markup_pct?: number;
}

export interface WeldFabQuoteResult {
  process: string;
  joints_summary: { count: number; total_length_m: number; total_weld_volume_cm3: number; total_filler_kg: number };
  cost_breakdown: {
    fit_up_labor: number;
    welding_labor: number;
    consumables: number;
    nde_inspection: number;
    stress_relief: number;
    finishing: number;
    overhead: number;
    total_per_assembly: number;
  };
  price_per_assembly: number;
  total_price: number;
  welding_hours: number;
  warnings: string[];
}

export class WeldFabricationQuoteEngine {
  quote(input: WeldFabQuoteInput): WeldFabQuoteResult {
    const proc = WELD_PROCESSES[input.process ?? "gmaw_mig"];
    if (!proc) throw new Error(`Unknown weld process: ${input.process}. Options: ${Object.keys(WELD_PROCESSES).join(", ")}`);

    const fillerDensity = (input.filler_density_kg_m3 ?? 7850) / 1e6; // kg/mm³
    const markup = (input.markup_pct ?? 25) / 100;
    const qty = input.quantity ?? 1;
    const warnings: string[] = [];

    let totalLengthMm = 0;
    let totalVolumeMm3 = 0;
    let totalWeldTime_hr = 0;

    for (const joint of input.joints) {
      const areaFn = JOINT_AREA[joint.type];
      if (!areaFn) {
        warnings.push(`Unknown joint type: ${joint.type} — using fillet as default`);
      }
      const fn = areaFn ?? JOINT_AREA.fillet;
      const crossArea = fn(joint.thickness_mm, joint.gap_mm, joint.root_face_mm);
      const volume = crossArea * joint.length_mm; // mm³
      totalVolumeMm3 += volume;
      totalLengthMm += joint.length_mm;

      const fillerKg = volume * fillerDensity;
      const posFactor = proc.position_factors[joint.position ?? "flat"] ?? 1.0;

      if (posFactor > 10) {
        warnings.push(`${proc.name} cannot weld in ${joint.position} position — use different process`);
      }

      const depositTime = fillerKg / (proc.deposition_rate_kg_hr * (proc.duty_cycle_pct / 100));
      totalWeldTime_hr += depositTime * posFactor;
    }

    const totalFillerKg = totalVolumeMm3 * fillerDensity;
    const totalLengthM = totalLengthMm / 1000;
    const totalVolumeCm3 = totalVolumeMm3 / 1000;

    // ── Fit-up labor: ~50-100% of weld time ──
    const fitUpHrs = input.fit_up_hours ?? totalWeldTime_hr * 0.7;
    const fitUpCost = fitUpHrs * 40; // fitter rate

    // ── Welding labor ──
    const weldLaborCost = totalWeldTime_hr * proc.labor_rate_per_hr;

    // ── Consumables ──
    const consumablesCost = totalFillerKg * proc.consumable_cost_per_kg;

    // ── NDE ──
    let ndeCost = 0;
    if (input.nde_method) {
      const nde = NDE_COSTS[input.nde_method];
      if (nde) {
        const coverage = (input.nde_coverage_pct ?? 100) / 100;
        ndeCost = (nde.per_meter * totalLengthM + nde.per_joint * input.joints.length) * coverage;
      }
    }

    // ── Post-weld treatments ──
    let stressReliefCost = 0;
    if (input.stress_relief) {
      stressReliefCost = 150 + totalFillerKg * 5; // base + per-kg furnace cost
    }

    let finishingCost = 0;
    if (input.hot_dip_galvanize) finishingCost += 100 + totalFillerKg * 3;
    if (input.blast_and_paint) finishingCost += 80 + totalLengthM * 15;

    // ── Overhead ──
    const directLabor = fitUpCost + weldLaborCost;
    const overheadCost = directLabor * (proc.overhead_mult - 1);

    const totalPerAssembly = fitUpCost + weldLaborCost + consumablesCost + ndeCost + stressReliefCost + finishingCost + overheadCost;
    const pricePerAssembly = totalPerAssembly * (1 + markup);

    // ── Warnings ──
    if (totalWeldTime_hr > 40) warnings.push("Very long weld time (>40 hrs) — consider automated/robotic welding");
    if (totalFillerKg > 50) warnings.push("High filler usage (>50 kg) — consider SAW for flat joints");

    return {
      process: proc.name,
      joints_summary: {
        count: input.joints.length,
        total_length_m: Math.round(totalLengthM * 100) / 100,
        total_weld_volume_cm3: Math.round(totalVolumeCm3 * 100) / 100,
        total_filler_kg: Math.round(totalFillerKg * 1000) / 1000,
      },
      cost_breakdown: {
        fit_up_labor: Math.round(fitUpCost * 100) / 100,
        welding_labor: Math.round(weldLaborCost * 100) / 100,
        consumables: Math.round(consumablesCost * 100) / 100,
        nde_inspection: Math.round(ndeCost * 100) / 100,
        stress_relief: Math.round(stressReliefCost * 100) / 100,
        finishing: Math.round(finishingCost * 100) / 100,
        overhead: Math.round(overheadCost * 100) / 100,
        total_per_assembly: Math.round(totalPerAssembly * 100) / 100,
      },
      price_per_assembly: Math.round(pricePerAssembly * 100) / 100,
      total_price: Math.round(pricePerAssembly * qty),
      welding_hours: Math.round(totalWeldTime_hr * 100) / 100,
      warnings,
    };
  }

  /** Calculate cost for a single weld joint. */
  jointCost(input: {
    type: string;
    length_mm: number;
    thickness_mm: number;
    process?: string;
    position?: string;
  }): { filler_kg: number; weld_time_hr: number; labor_cost: number; consumable_cost: number; total: number } {
    const proc = WELD_PROCESSES[input.process ?? "gmaw_mig"] ?? WELD_PROCESSES.gmaw_mig;
    const fn = JOINT_AREA[input.type] ?? JOINT_AREA.fillet;
    const area = fn(input.thickness_mm);
    const volume = area * input.length_mm;
    const fillerKg = volume * (7850 / 1e6);
    const posFactor = proc.position_factors[input.position ?? "flat"] ?? 1.0;
    const time = (fillerKg / (proc.deposition_rate_kg_hr * proc.duty_cycle_pct / 100)) * posFactor;
    const labor = time * proc.labor_rate_per_hr;
    const consumable = fillerKg * proc.consumable_cost_per_kg;
    return {
      filler_kg: Math.round(fillerKg * 1000) / 1000,
      weld_time_hr: Math.round(time * 1000) / 1000,
      labor_cost: Math.round(labor * 100) / 100,
      consumable_cost: Math.round(consumable * 100) / 100,
      total: Math.round((labor + consumable) * 100) / 100,
    };
  }

  /** Estimate consumable requirements for a set of joints. */
  consumables(input: {
    joints: WeldJoint[];
    process?: string;
  }): { filler_kg: number; gas_liters: number; consumable_cost_total: number } {
    const proc = WELD_PROCESSES[input.process ?? "gmaw_mig"] ?? WELD_PROCESSES.gmaw_mig;
    let totalFillerKg = 0;
    for (const j of input.joints) {
      const fn = JOINT_AREA[j.type] ?? JOINT_AREA.fillet;
      const vol = fn(j.thickness_mm) * j.length_mm;
      totalFillerKg += vol * (7850 / 1e6);
    }
    // Gas usage: ~15 L/min for MIG/TIG, 0 for SMAW/SAW
    const gasPerKg = proc.name.includes("MIG") || proc.name.includes("TIG") ? 200 : 0; // L per kg deposited
    return {
      filler_kg: Math.round(totalFillerKg * 1000) / 1000,
      gas_liters: Math.round(totalFillerKg * gasPerKg),
      consumable_cost_total: Math.round(totalFillerKg * proc.consumable_cost_per_kg * 100) / 100,
    };
  }
}

export const weldFabricationQuoteEngine = new WeldFabricationQuoteEngine();
