/**
 * EDMCostDocumentationEngine - WEDM cost estimate compatibility surface.
 *
 * Restores the cost/documentation engine expected by WEDM ERP routes while
 * using the current canonical WEDM constants for wire cost, shop rates, and
 * overhead/margin defaults.
 */

import {
  WEDM_DEFAULT_RATES,
  lookupWireCostPerM,
} from "../physics/wedm-constants.js";

export type WireType = "brass" | "coated" | "molybdenum" | "tungsten" | "zinc_coated";

export interface MachineTimeInput {
  machine_rate_per_hr: number;
  setup_hrs: number;
  cutting_hrs: number;
  tab_cutting_hrs?: number;
  threading_time_per_event_hr?: number;
  threading_events?: number;
  idle_hrs?: number;
}

export interface MachineTimeCost {
  setup_hrs: number;
  cutting_hrs: number;
  tab_cutting_hrs: number;
  threading_hrs: number;
  idle_hrs: number;
  total_hrs: number;
  rate_per_hr: number;
  cost: number;
  breakdown: Array<{ phase: string; hrs: number; cost: number }>;
}

export interface WireInput {
  wire_type: WireType;
  wire_diameter_mm: number;
  cutting_hrs: number;
  wire_speed_mm_per_min: number;
  spool_size_kg?: number;
}

export interface WireCost {
  wire_type: WireType;
  diameter_mm: number;
  length_m: number;
  weight_kg: number;
  cost_per_m: number;
  cost: number;
  spools_used: number;
  remnant_kg: number;
  notes: string;
}

export interface ConsumablesInput {
  cutting_hrs: number;
  nozzle_sets?: number;
  start_holes?: number;
  guides_replaced?: number;
  filters_replaced?: number;
  resin_hrs_since_last_change?: number;
  resin_change_interval_hrs?: number;
}

export interface ConsumablesCost {
  filters: number;
  guides: number;
  nozzles: number;
  resin: number;
  electrodes: number;
  flush_fluid: number;
  total: number;
  detail: Array<{ item: string; qty: number; unit_cost: number; cost: number; life_hrs?: number }>;
}

export type PostProcessOp =
  | "chemical_etch"
  | "stress_relief"
  | "shot_peen"
  | "cmm_inspection"
  | "metallography"
  | "coating_pvd"
  | "coating_cvd"
  | "coating_electroless_nickel"
  | "deburr_manual"
  | "deburr_tumble"
  | "passivation"
  | "heat_treat_anneal";

export interface PostProcessInput {
  operations: Array<{
    op: PostProcessOp;
    inspection_hrs?: number;
    area_cm2?: number;
    batch_qty?: number;
  }>;
}

export interface PostProcessCost {
  items: Array<{ name: string; op: PostProcessOp; cost: number; notes: string }>;
  total: number;
}

export interface CostInput {
  part_id: string;
  material: string;
  machine_time: MachineTimeInput;
  wire: WireInput;
  consumables: ConsumablesInput;
  post_process?: PostProcessInput;
  overhead_pct?: number;
  margin_pct?: number;
  quantity?: number;
  compare_processes?: Array<"sinker_edm" | "milling" | "grinding" | "laser_cut" | "waterjet">;
}

export interface CostEstimate {
  part_id: string;
  material: string;
  machine_time: MachineTimeCost;
  wire: WireCost;
  consumables: ConsumablesCost;
  post_process: PostProcessCost;
  subtotal: number;
  overhead_pct: number;
  overhead: number;
  margin_pct: number;
  margin: number;
  total_per_part: number;
  quantity_breaks: Array<{ qty: number; setup_amortized: number; cost_per_part: number; total: number }>;
  comparison: Array<{ process: string; estimated_cost: number; notes: string }>;
  cost_drivers: Array<{ category: string; amount: number; pct_of_total: number }>;
}

const CONSUMABLE_COSTS = {
  filter_unit: 45,
  filter_life_hrs: 150,
  guide_unit: 125,
  guide_life_hrs: 1500,
  nozzle_set: 85,
  resin_per_change: 180,
  resin_change_hrs: 500,
  electrode_tube: 4.5,
  flush_fluid_per_hr: 0.15,
} as const;

const POST_PROCESS_COSTS: Record<PostProcessOp, { base: number; per_hr?: number; per_cm2?: number; notes: string }> = {
  chemical_etch: { base: 120, notes: "Chemical etch to remove recast layer" },
  stress_relief: { base: 300, notes: "Stress relief anneal" },
  shot_peen: { base: 100, notes: "Shot peen for compressive residual stress" },
  cmm_inspection: { base: 50, per_hr: 200, notes: "CMM inspection" },
  metallography: { base: 350, notes: "Metallographic section and report" },
  coating_pvd: { base: 200, per_cm2: 0.8, notes: "PVD coating" },
  coating_cvd: { base: 250, per_cm2: 0.9, notes: "CVD coating" },
  coating_electroless_nickel: { base: 150, per_cm2: 0.4, notes: "Electroless nickel" },
  deburr_manual: { base: 45, per_hr: 55, notes: "Manual deburr" },
  deburr_tumble: { base: 80, notes: "Tumble deburr batch" },
  passivation: { base: 90, notes: "Passivation" },
  heat_treat_anneal: { base: 200, notes: "Anneal heat treat" },
};

const PROCESS_COMPARISON: Record<string, { mult: number; notes: string }> = {
  sinker_edm: { mult: 1.4, notes: "Higher electrode cost; useful for blind cavities" },
  milling: { mult: 0.65, notes: "Lower cost for accessible/simple geometry" },
  grinding: { mult: 0.9, notes: "Excellent finish; geometry-limited" },
  laser_cut: { mult: 0.45, notes: "Fast but heat affected zone and thickness limits apply" },
  waterjet: { mult: 0.55, notes: "No HAZ; rougher edge and lower precision" },
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeRate(value: number | undefined, fallback: number): number {
  const v = value ?? fallback;
  return v <= 1 ? v : v / 100;
}

function wireDensityGPerCm3(type: WireType): number {
  if (type === "molybdenum") return 10.2;
  if (type === "tungsten") return 19.3;
  return 8.5;
}

function wireMassKg(lengthM: number, diameterMm: number, type: WireType): number {
  const radiusCm = (diameterMm / 10) / 2;
  const volumeCm3 = Math.PI * radiusCm * radiusCm * (lengthM * 100);
  return (volumeCm3 * wireDensityGPerCm3(type)) / 1000;
}

function calculateMachineTimeCost(input: MachineTimeInput): MachineTimeCost {
  const tab = input.tab_cutting_hrs ?? 0;
  const threading = (input.threading_events ?? 0) * (input.threading_time_per_event_hr ?? 0);
  const idle = input.idle_hrs ?? 0;
  const total = input.setup_hrs + input.cutting_hrs + tab + threading + idle;
  const rate = input.machine_rate_per_hr || WEDM_DEFAULT_RATES.machine_rate_usd_hr;
  const phases = [
    ["setup", input.setup_hrs],
    ["cutting", input.cutting_hrs],
    ["tab_cutting", tab],
    ["threading", threading],
    ["idle", idle],
  ] as const;

  return {
    setup_hrs: input.setup_hrs,
    cutting_hrs: input.cutting_hrs,
    tab_cutting_hrs: tab,
    threading_hrs: threading,
    idle_hrs: idle,
    total_hrs: total,
    rate_per_hr: rate,
    cost: money(total * rate),
    breakdown: phases
      .filter(([, hrs]) => hrs > 0)
      .map(([phase, hrs]) => ({ phase, hrs, cost: money(hrs * rate) })),
  };
}

function calculateWireCost(input: WireInput): WireCost {
  const lengthM = Math.max(0, input.wire_speed_mm_per_min * input.cutting_hrs * 60) / 1000;
  const weightKg = wireMassKg(lengthM, input.wire_diameter_mm, input.wire_type);
  const costPerM = lookupWireCostPerM(input.wire_type, input.wire_diameter_mm);
  const spoolKg = input.spool_size_kg ?? (input.wire_type === "tungsten" ? 0.5 : input.wire_type === "molybdenum" ? 1 : 8);
  const spoolsUsed = spoolKg > 0 ? Math.ceil(weightKg / spoolKg) : 0;
  const remnantKg = spoolsUsed > 0 ? Math.max(0, spoolsUsed * spoolKg - weightKg) : 0;

  return {
    wire_type: input.wire_type,
    diameter_mm: input.wire_diameter_mm,
    length_m: money(lengthM),
    weight_kg: money(weightKg),
    cost_per_m: costPerM,
    cost: money(lengthM * costPerM),
    spools_used: spoolsUsed,
    remnant_kg: money(remnantKg),
    notes: "Wire length derived from feed speed and active cutting hours.",
  };
}

function calculateConsumablesCost(input: ConsumablesInput): ConsumablesCost {
  const c = CONSUMABLE_COSTS;
  const filtersQty = input.filters_replaced ?? input.cutting_hrs / c.filter_life_hrs;
  const guidesQty = input.guides_replaced ?? input.cutting_hrs / c.guide_life_hrs;
  const nozzlesQty = input.nozzle_sets ?? input.cutting_hrs / 500;
  const resinInterval = input.resin_change_interval_hrs ?? c.resin_change_hrs;
  const resinQty = resinInterval > 0 ? input.cutting_hrs / resinInterval : 0;
  const electrodesQty = input.start_holes ?? 0;
  const detail = [
    { item: "Dielectric filters", qty: filtersQty, unit_cost: c.filter_unit, cost: filtersQty * c.filter_unit, life_hrs: c.filter_life_hrs },
    { item: "Wire guides", qty: guidesQty, unit_cost: c.guide_unit, cost: guidesQty * c.guide_unit, life_hrs: c.guide_life_hrs },
    { item: "Flush nozzle sets", qty: nozzlesQty, unit_cost: c.nozzle_set, cost: nozzlesQty * c.nozzle_set },
    { item: "Deionizer resin share", qty: resinQty, unit_cost: c.resin_per_change, cost: resinQty * c.resin_per_change, life_hrs: resinInterval },
    { item: "Start-hole electrode tubes", qty: electrodesQty, unit_cost: c.electrode_tube, cost: electrodesQty * c.electrode_tube },
    { item: "Flush fluid/additives", qty: input.cutting_hrs, unit_cost: c.flush_fluid_per_hr, cost: input.cutting_hrs * c.flush_fluid_per_hr },
  ].map((line) => ({ ...line, qty: money(line.qty), cost: money(line.cost) }));

  const total = money(detail.reduce((sum, line) => sum + line.cost, 0));
  return {
    filters: detail[0].cost,
    guides: detail[1].cost,
    nozzles: detail[2].cost,
    resin: detail[3].cost,
    electrodes: detail[4].cost,
    flush_fluid: detail[5].cost,
    total,
    detail,
  };
}

function calculatePostProcessCost(input: PostProcessInput | undefined): PostProcessCost {
  if (!input?.operations?.length) return { items: [], total: 0 };
  const items = input.operations.map((operation) => {
    const cfg = POST_PROCESS_COSTS[operation.op];
    let cost = cfg.base;
    if (cfg.per_hr && operation.inspection_hrs) cost += cfg.per_hr * operation.inspection_hrs;
    if (cfg.per_cm2 && operation.area_cm2) cost += cfg.per_cm2 * operation.area_cm2;
    if (operation.batch_qty && operation.batch_qty > 1) cost /= Math.sqrt(operation.batch_qty);
    return { name: cfg.notes, op: operation.op, cost: money(cost), notes: cfg.notes };
  });
  return { items, total: money(items.reduce((sum, item) => sum + item.cost, 0)) };
}

function aggregateTotalCost(input: CostInput): CostEstimate {
  const machine = calculateMachineTimeCost(input.machine_time);
  const wire = calculateWireCost(input.wire);
  const consumables = calculateConsumablesCost(input.consumables);
  const post = calculatePostProcessCost(input.post_process);
  const overheadPct = normalizeRate(input.overhead_pct, WEDM_DEFAULT_RATES.overhead_pct);
  const marginPct = normalizeRate(input.margin_pct, WEDM_DEFAULT_RATES.margin_pct);
  const subtotal = money(machine.cost + wire.cost + consumables.total + post.total);
  const overhead = money(subtotal * overheadPct);
  const margin = money((subtotal + overhead) * marginPct);
  const total = money(subtotal + overhead + margin);
  const setupLoaded = input.machine_time.setup_hrs * machine.rate_per_hr * (1 + overheadPct) * (1 + marginPct);
  const variableLoaded = Math.max(0, total - setupLoaded);
  const qtyBreaks = [1, 5, 10, 25, 100].map((qty) => {
    const setupAmortized = setupLoaded / qty;
    const costPerPart = money(Math.max(variableLoaded + setupAmortized, variableLoaded * 1.02));
    return { qty, setup_amortized: money(setupAmortized), cost_per_part: costPerPart, total: money(costPerPart * qty) };
  });
  const comparison = (input.compare_processes ?? ["sinker_edm", "milling", "laser_cut"]).map((process) => {
    const cfg = PROCESS_COMPARISON[process] ?? { mult: 1, notes: "No comparison model available" };
    return { process: process.replace(/_/g, " "), estimated_cost: money(total * cfg.mult), notes: cfg.notes };
  });
  const drivers = [
    ["Machine Time", machine.cost],
    ["Wire", wire.cost],
    ["Consumables", consumables.total],
    ["Post-Process", post.total],
    ["Overhead", overhead],
    ["Margin", margin],
  ] as const;

  return {
    part_id: input.part_id,
    material: input.material,
    machine_time: machine,
    wire,
    consumables,
    post_process: post,
    subtotal,
    overhead_pct: overheadPct,
    overhead,
    margin_pct: marginPct,
    margin,
    total_per_part: total,
    quantity_breaks: qtyBreaks,
    comparison,
    cost_drivers: drivers.map(([category, amount]) => ({
      category,
      amount: money(amount),
      pct_of_total: total > 0 ? money((amount / total) * 100) : 0,
    })),
  };
}

export class EDMCostDocumentationEngine {
  estimateCost(input: CostInput): CostEstimate {
    return aggregateTotalCost(input);
  }

  calcMachineTime(input: MachineTimeInput): MachineTimeCost {
    return calculateMachineTimeCost(input);
  }

  calcWireCost(input: WireInput): WireCost {
    return calculateWireCost(input);
  }

  calcConsumablesCost(input: ConsumablesInput): ConsumablesCost {
    return calculateConsumablesCost(input);
  }

  calcPostProcessCost(input: PostProcessInput): PostProcessCost {
    return calculatePostProcessCost(input);
  }
}

export const edmCostDocumentationEngine = new EDMCostDocumentationEngine();
