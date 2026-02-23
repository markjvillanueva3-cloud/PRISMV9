/**
 * PRISM Product Engine — Shop Manager / Quoting
 * ===============================================
 * MS2: Shop Manager — 10 actions
 *
 * Composes physics engines into a business workflow:
 * job planning -> cost estimation -> quote generation -> scheduling -> reporting
 *
 * Pipeline: Part Description -> Job Plan -> Cost Breakdown -> Quote -> Schedule
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  calculateSpeedFeed,
  calculateTaylorToolLife,
  calculateMRR,
} from "./ManufacturingCalculations.js";

import {
  MATERIAL_HARDNESS,
  resolveMaterial,
  calculateSafetyScore,
  mapOperation,
  type ProductTier,
} from "./ProductEngineShared.js";

// ─── Shop History ───────────────────────────────────────────────────────────

const shopHistory: Array<{ action: string; timestamp: string; summary: string }> = [];

// ─── Shop Constants ─────────────────────────────────────────────────────────

/** Material database for Shop Manager — derived from SFC MATERIAL_HARDNESS */
export const MATERIAL_DB: Record<string, { name: string; group: string; hardness: number }> = Object.fromEntries(
  Object.entries(MATERIAL_HARDNESS).map(([key, v]) => [
    key,
    { name: key.includes("-") || key.includes(" ") ? key : (v.group.includes("aluminum") ? `Aluminum ${key}` : v.group.includes("steel") ? `Steel ${key}` : v.group.includes("stainless") ? `Stainless ${key}` : v.group.includes("titanium") ? `Titanium ${key}` : v.group.includes("superalloy") ? `Superalloy ${key}` : v.group.includes("cast_iron") ? `Cast Iron ${key}` : v.group.includes("copper") ? `Brass ${key}` : v.group.includes("plastic") ? `Engineering Plastic ${key}` : key), group: v.group, hardness: v.hardness },
  ]),
);

/** Machine rate database ($/hour) */
export const MACHINE_RATES: Record<string, { name: string; rate_per_hour: number; type: string; max_rpm: number; power_kw: number }> = {
  "3axis_vertical": { name: "3-Axis Vertical Mill", rate_per_hour: 75, type: "milling", max_rpm: 12000, power_kw: 15 },
  "3axis_horizontal": { name: "3-Axis Horizontal Mill", rate_per_hour: 95, type: "milling", max_rpm: 10000, power_kw: 22 },
  "5axis_mill": { name: "5-Axis Mill", rate_per_hour: 150, type: "milling", max_rpm: 15000, power_kw: 25 },
  "cnc_lathe": { name: "CNC Lathe", rate_per_hour: 65, type: "turning", max_rpm: 6000, power_kw: 18 },
  "mill_turn": { name: "Mill-Turn Center", rate_per_hour: 175, type: "multi", max_rpm: 12000, power_kw: 30 },
  "wire_edm": { name: "Wire EDM", rate_per_hour: 45, type: "edm", max_rpm: 0, power_kw: 5 },
  "surface_grinder": { name: "Surface Grinder", rate_per_hour: 55, type: "grinding", max_rpm: 3600, power_kw: 5 },
};

/** Labor rate categories */
export const LABOR_RATES: Record<string, number> = {
  setup: 55,       // $/hour for setup
  programming: 65, // $/hour for CAM programming
  inspection: 50,  // $/hour for QC
  deburring: 40,   // $/hour for manual deburring
};

// ─── Shop Core Functions ────────────────────────────────────────────────────

/** Estimate operation cycle time using physics engines */
function shopEstimateOpCycleTime(
  material: string,
  feature: string,
  dimensions: { depth: number; width?: number; length?: number; diameter?: number },
  toolDiam: number,
  numTeeth: number,
): { cycle_time_min: number; cutting_speed: number; feed_rate: number; mrr: number; tool_life_min: number; safety_score: number } {
  const mat = MATERIAL_DB[material] || MATERIAL_DB["4140"];
  const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];
  const operation = feature.includes("finish") ? "finishing" : "roughing";

  // Get speed/feed from physics engine
  const sfResult = calculateSpeedFeed({
    material_hardness: mat.hardness,
    tool_material: "Carbide" as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const ap = Math.min(dimensions.depth, toolDiam * 0.5);
  const ae = toolDiam * 0.6;

  // MRR
  const mrrResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  // Volume to remove (cm^3)
  const depth = dimensions.depth;
  const width = dimensions.width || 50;
  const length = dimensions.length || 50;
  const volume = (depth * width * length) / 1000; // mm^3 -> cm^3

  // Cycle time = volume / MRR + rapids + tool changes
  const cuttingTime = mrrResult.mrr > 0 ? volume / mrrResult.mrr : 5;
  const rapidTime = cuttingTime * 0.15; // 15% overhead for rapids
  const totalTime = cuttingTime + rapidTime;

  // Tool life (use physics material constants C and n)
  const taylorResult = calculateTaylorToolLife(vc, { C: matPhysics.C, n: matPhysics.n, material_id: material }, fz, ap);

  // Safety score — estimate power = F * vc / 60000
  const estimatedPower = (matPhysics.kc1_1 * fz * ap * ae) * vc / (60000 * 1000);
  const safetyResult = calculateSafetyScore(vc, fz, ap, ae, toolDiam, estimatedPower);

  return {
    cycle_time_min: Math.round(totalTime * 10) / 10,
    cutting_speed: Math.round(vc),
    feed_rate: Math.round(sfResult.feed_rate),
    mrr: Math.round(mrrResult.mrr * 100) / 100,
    tool_life_min: Math.round(taylorResult.tool_life_minutes * 10) / 10,
    safety_score: safetyResult.score,
  };
}

/** Generate a job plan from part description */
function shopJobPlan(params: Record<string, any>): any {
  const material = params.material || "4140";
  const features = params.features || params.operations || [{ feature: "pocket", depth: 10, width: 50, length: 100 }];
  const toolDiam = params.tool_diameter || 12;
  const numTeeth = params.number_of_teeth || 4;
  const batchSize = Math.max(1, params.batch_size || 1);

  const operations = features.map((f: any, i: number) => {
    const feat = typeof f === "string" ? { feature: f, depth: 10, width: 50, length: 50 } : f;
    const estimate = shopEstimateOpCycleTime(
      material,
      feat.feature || "pocket",
      { depth: feat.depth || 10, width: feat.width || 50, length: feat.length || 50, diameter: feat.diameter },
      toolDiam,
      numTeeth,
    );
    return {
      step: i + 1,
      feature: feat.feature || "pocket",
      dimensions: { depth: feat.depth || 10, width: feat.width || 50, length: feat.length || 50 },
      ...estimate,
    };
  });

  const totalCycleTime = operations.reduce((sum: number, op: any) => sum + op.cycle_time_min, 0);
  const minToolLife = Math.min(...operations.map((op: any) => op.tool_life_min));
  const avgSafety = operations.reduce((sum: number, op: any) => sum + op.safety_score, 0) / operations.length;

  return {
    material,
    batch_size: batchSize,
    operations,
    total_cycle_time_min: Math.round(totalCycleTime * 10) / 10,
    min_tool_life_min: Math.round(minToolLife * 10) / 10,
    parts_per_tool_edge: minToolLife > 0 ? Math.floor(minToolLife / totalCycleTime) : 1,
    average_safety_score: Math.round(avgSafety * 100) / 100,
  };
}

/** Calculate full cost breakdown */
function shopCostBreakdown(params: Record<string, any>): any {
  const jobPlan = shopJobPlan(params);
  const machineId = params.machine || "3axis_vertical";
  const machine = MACHINE_RATES[machineId] || MACHINE_RATES["3axis_vertical"];
  const batchSize = jobPlan.batch_size;
  const setupTimeMin = params.setup_time_min || 30;
  const programmingMin = params.programming_time_min || (jobPlan.operations.length * 20);
  const inspectionMin = params.inspection_time_min || 5;
  const toolCost = params.tool_cost || 45;
  const materialCostPerPart = params.material_cost_per_part || 15;
  const margin = params.margin_percent || 30;

  // Machine cost per part
  const machineCostPerPart = (jobPlan.total_cycle_time_min / 60) * machine.rate_per_hour;

  // Tool cost per part
  const partsPerEdge = Math.max(1, jobPlan.parts_per_tool_edge);
  const toolCostPerPart = toolCost / partsPerEdge;

  // Setup cost amortized over batch
  const setupCostPerPart = (setupTimeMin / 60 * machine.rate_per_hour) / batchSize;

  // Programming cost amortized over batch
  const programmingCostPerPart = (programmingMin / 60 * LABOR_RATES.programming) / batchSize;

  // Inspection cost per part
  const inspectionCostPerPart = (inspectionMin / 60 * LABOR_RATES.inspection);

  // Totals
  const directCost = machineCostPerPart + toolCostPerPart + materialCostPerPart + inspectionCostPerPart;
  const overheadCost = setupCostPerPart + programmingCostPerPart;
  const totalCostPerPart = directCost + overheadCost;
  const pricePerPart = totalCostPerPart * (1 + margin / 100);
  const batchTotal = pricePerPart * batchSize;

  return {
    cost_per_part: Math.round(totalCostPerPart * 100) / 100,
    price_per_part: Math.round(pricePerPart * 100) / 100,
    batch_total: Math.round(batchTotal * 100) / 100,
    margin_percent: margin,
    breakdown: {
      machine_cost: Math.round(machineCostPerPart * 100) / 100,
      tool_cost: Math.round(toolCostPerPart * 100) / 100,
      material_cost: Math.round(materialCostPerPart * 100) / 100,
      inspection_cost: Math.round(inspectionCostPerPart * 100) / 100,
      setup_cost: Math.round(setupCostPerPart * 100) / 100,
      programming_cost: Math.round(programmingCostPerPart * 100) / 100,
    },
    machine: { id: machineId, name: machine.name, rate_per_hour: machine.rate_per_hour },
    job_plan: jobPlan,
    cycle_time_min: jobPlan.total_cycle_time_min,
    tool_life_min: jobPlan.min_tool_life_min,
    parts_per_edge: partsPerEdge,
    batch_size: batchSize,
  };
}

/** Generate a professional quote */
function shopQuote(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const customerName = params.customer || "Customer";
  const partName = params.part_name || "Custom Part";
  const leadTimeDays = params.lead_time_days || Math.max(5, Math.ceil(cost.batch_size / 10) + 3);
  const quoteNumber = `Q-${Date.now().toString(36).toUpperCase()}`;
  const validDays = params.quote_valid_days || 30;

  return {
    quote_number: quoteNumber,
    date: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10),
    customer: customerName,
    part: {
      name: partName,
      material: cost.job_plan.material,
      operations: cost.job_plan.operations.length,
    },
    pricing: {
      unit_price: cost.price_per_part,
      quantity: cost.batch_size,
      subtotal: cost.batch_total,
      currency: "USD",
    },
    lead_time_days: leadTimeDays,
    cost_breakdown: cost.breakdown,
    cycle_time_min: cost.cycle_time_min,
    notes: [
      `Machine: ${cost.machine.name} at $${cost.machine.rate_per_hour}/hr`,
      `Tool life: ${cost.tool_life_min} min (${cost.parts_per_edge} parts/edge)`,
      `Safety score: ${cost.job_plan.average_safety_score}`,
      cost.batch_size >= 100 ? "Volume discount may apply — contact sales" : "",
    ].filter(Boolean),
  };
}

/** Estimate schedule for batch production */
function shopSchedule(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const startDate = params.start_date ? new Date(params.start_date) : new Date();
  const setupTimeMin = params.setup_time_min || 30;
  const hoursPerDay = params.hours_per_day || 8;
  const efficiency = params.efficiency || 0.85; // 85% OEE

  const totalMachineMin = cost.cycle_time_min * cost.batch_size + setupTimeMin;
  const effectiveMinPerDay = hoursPerDay * 60 * efficiency;
  const productionDays = Math.ceil(totalMachineMin / effectiveMinPerDay);
  const partsPerDay = Math.floor(effectiveMinPerDay / cost.cycle_time_min);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + productionDays);

  return {
    batch_size: cost.batch_size,
    cycle_time_min: cost.cycle_time_min,
    setup_time_min: setupTimeMin,
    total_machine_time_min: Math.round(totalMachineMin),
    production_days: productionDays,
    parts_per_day: partsPerDay,
    hours_per_day: hoursPerDay,
    efficiency_pct: efficiency * 100,
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
    machine: cost.machine,
    milestones: [
      { phase: "Setup", day: 1, description: `Machine setup and first article (${setupTimeMin} min)` },
      { phase: "Production Start", day: 1, description: `Begin batch production (${partsPerDay} parts/day)` },
      { phase: "Midpoint", day: Math.ceil(productionDays / 2), description: `~${Math.floor(cost.batch_size / 2)} parts complete` },
      { phase: "Completion", day: productionDays, description: `All ${cost.batch_size} parts complete` },
      { phase: "QC/Ship", day: productionDays + 1, description: "Final inspection and shipping" },
    ],
  };
}

/** Dashboard — aggregate shop metrics */
function shopDashboard(params: Record<string, any>): any {
  const machines = Object.entries(MACHINE_RATES).map(([id, m]) => ({
    id,
    name: m.name,
    type: m.type,
    rate_per_hour: m.rate_per_hour,
    utilization_pct: 60 + Math.random() * 30, // simulated 60-90%
    status: Math.random() > 0.1 ? "running" : "idle",
  }));

  const activeMachines = machines.filter(m => m.status === "running").length;
  const avgUtilization = machines.reduce((sum, m) => sum + m.utilization_pct, 0) / machines.length;

  return {
    timestamp: new Date().toISOString(),
    machines,
    summary: {
      total_machines: machines.length,
      active: activeMachines,
      idle: machines.length - activeMachines,
      average_utilization_pct: Math.round(avgUtilization),
    },
    recent_jobs: shopHistory.filter(h => h.action === "shop_job" || h.action === "shop_quote").slice(-10),
    labor_rates: LABOR_RATES,
  };
}

/** Generate sustainability/cost report */
function shopReport(params: Record<string, any>): any {
  const cost = shopCostBreakdown(params);
  const material = params.material || "4140";
  const mat = MATERIAL_DB[material] || MATERIAL_DB["4140"];

  // Estimate energy consumption
  const machineKw = (MACHINE_RATES[params.machine || "3axis_vertical"] || MACHINE_RATES["3axis_vertical"]).power_kw;
  const energyKwh = (cost.cycle_time_min / 60) * machineKw * 0.6; // 60% average load
  const energyCostPerPart = energyKwh * 0.12; // $0.12/kWh

  // CO2 estimate (grid average ~0.4 kg CO2/kWh)
  const co2PerPart = energyKwh * 0.4;

  // Material waste estimate
  const stockRemovalPct = 40 + Math.random() * 30; // 40-70%
  const recyclablePct = mat.name.includes("luminum") ? 95 : mat.name.includes("Steel") ? 90 : 70;

  return {
    material: mat.name,
    batch_size: cost.batch_size,
    cost_summary: {
      cost_per_part: cost.cost_per_part,
      price_per_part: cost.price_per_part,
      batch_total: cost.batch_total,
    },
    energy: {
      kwh_per_part: Math.round(energyKwh * 100) / 100,
      cost_per_part: Math.round(energyCostPerPart * 100) / 100,
    },
    sustainability: {
      co2_kg_per_part: Math.round(co2PerPart * 100) / 100,
      stock_removal_pct: Math.round(stockRemovalPct),
      recyclable_pct: recyclablePct,
      coolant_type: "semi-synthetic",
    },
    optimization_suggestions: [
      cost.cycle_time_min > 10 ? "Consider trochoidal milling to reduce cycle time 15-25%" : null,
      cost.parts_per_edge < 5 ? "Low tool life — consider coated carbide inserts" : null,
      cost.batch_size < 10 ? "Small batch — setup cost dominates; consider grouping orders" : null,
      energyKwh > 1 ? "High energy use — evaluate HSM strategies for efficiency" : null,
    ].filter(Boolean),
    breakdown: cost.breakdown,
  };
}

/** Compare cost across different machines or materials */
function shopCompare(params: Record<string, any>): any {
  const comparisons = params.machines || ["3axis_vertical", "5axis_mill"];
  const results = comparisons.map((machineId: string) => {
    const cost = shopCostBreakdown({ ...params, machine: machineId });
    return {
      machine: cost.machine,
      cost_per_part: cost.cost_per_part,
      price_per_part: cost.price_per_part,
      cycle_time_min: cost.cycle_time_min,
      batch_total: cost.batch_total,
      breakdown: cost.breakdown,
    };
  });

  // Sort by cost
  results.sort((a: any, b: any) => a.cost_per_part - b.cost_per_part);

  return {
    material: params.material || "4140",
    batch_size: params.batch_size || 1,
    results,
    recommendation: results[0]
      ? `${results[0].machine.name} is most cost-effective at $${results[0].cost_per_part}/part`
      : "No machines compared",
  };
}

// ─── Main Shop Dispatcher ───────────────────────────────────────────────────

export function productShop(action: string, params: Record<string, any>): any {
  const tier: ProductTier = params.tier || "pro";

  switch (action) {
    case "shop_job": {
      const plan = shopJobPlan(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${plan.operations.length} ops, ${plan.total_cycle_time_min} min` });
      return plan;
    }

    case "shop_cost": {
      const cost = shopCostBreakdown(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `$${cost.cost_per_part}/part, batch=${cost.batch_size}` });
      return cost;
    }

    case "shop_quote": {
      if (tier === "free") return { error: "Quote generation requires Pro tier or higher" };
      const quote = shopQuote(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${quote.quote_number}: $${quote.pricing.unit_price}/unit x${quote.pricing.quantity}` });
      return quote;
    }

    case "shop_schedule": {
      const schedule = shopSchedule(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${schedule.production_days} days, ${schedule.parts_per_day}/day` });
      return schedule;
    }

    case "shop_dashboard": {
      const dashboard = shopDashboard(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${dashboard.summary.total_machines} machines, ${dashboard.summary.average_utilization_pct}% util` });
      return dashboard;
    }

    case "shop_report": {
      if (tier === "free") return { error: "Sustainability reports require Pro tier or higher" };
      const report = shopReport(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `$${report.cost_summary.cost_per_part}/part, ${report.sustainability.co2_kg_per_part} kg CO2` });
      return report;
    }

    case "shop_compare": {
      const comparison = shopCompare(params);
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${comparison.results.length} machines compared` });
      return comparison;
    }

    case "shop_materials": {
      const materials = Object.entries(MATERIAL_DB).map(([key, mat]) => ({
        id: key,
        name: mat.name,
        group: mat.group,
        hardness_hb: mat.hardness,
        machinability: mat.hardness < 200 ? "excellent" : mat.hardness < 300 ? "good" : mat.hardness < 350 ? "moderate" : "difficult",
      }));
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: `${materials.length} materials` });
      return { materials, total: materials.length };
    }

    case "shop_history":
      shopHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: shopHistory.slice(-50), total: shopHistory.length };

    case "shop_get":
      return {
        product: "Shop Manager",
        version: "1.0.0",
        actions: ["shop_job", "shop_cost", "shop_quote", "shop_schedule", "shop_dashboard", "shop_report", "shop_compare", "shop_materials", "shop_history", "shop_get"],
        machines: Object.keys(MACHINE_RATES).length,
        materials: Object.keys(MATERIAL_DB).length,
        tiers: ["free", "pro", "enterprise"],
        labor_categories: Object.keys(LABOR_RATES).length,
      };

    default:
      return { error: `Unknown Shop action: ${action}` };
  }
}
