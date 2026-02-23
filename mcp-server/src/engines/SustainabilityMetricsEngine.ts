/**
 * SustainabilityMetricsEngine — R23-MS3
 *
 * Tracks manufacturing waste streams, recycling performance, water usage,
 * and computes environmental KPIs for sustainability dashboards and reporting.
 *
 * Actions:
 *   sus_waste   — Track and analyze waste streams
 *   sus_recycle — Monitor recycling rates and circular economy metrics
 *   sus_water   — Track water consumption and discharge quality
 *   sus_kpi     — Compute environmental sustainability KPIs
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WasteInput {
  facility?: string;
  period?: string;
  waste_type?: "all" | "metallic" | "chemical" | "packaging" | "hazardous";
  include_trends?: boolean;
  include_disposal?: boolean;
}

interface RecycleInput {
  facility?: string;
  period?: string;
  material_type?: string;
  include_circular_metrics?: boolean;
  include_revenue?: boolean;
}

interface WaterInput {
  facility?: string;
  period?: string;
  include_quality?: boolean;
  include_treatment?: boolean;
  include_benchmarks?: boolean;
}

interface KPIInput {
  facility?: string;
  period?: string;
  kpi_set?: "all" | "environmental" | "resource" | "circular" | "compliance";
  include_targets?: boolean;
  include_scoring?: boolean;
}

// ---------------------------------------------------------------------------
// Seeded data — waste stream profiles
// ---------------------------------------------------------------------------

interface WasteStream {
  stream_id: string;
  name: string;
  category: "metallic" | "chemical" | "packaging" | "hazardous" | "general";
  unit: string;
  monthly_qty: number;
  disposal_method: string;
  cost_per_unit_usd: number;
  recyclable: boolean;
  recycle_rate: number;
  hazard_class?: string;
}

const WASTE_STREAMS: WasteStream[] = [
  { stream_id: "WS-001", name: "Steel chips/swarf", category: "metallic", unit: "kg", monthly_qty: 4500, disposal_method: "recycler", cost_per_unit_usd: -0.15, recyclable: true, recycle_rate: 0.92 },
  { stream_id: "WS-002", name: "Aluminum chips/swarf", category: "metallic", unit: "kg", monthly_qty: 1800, disposal_method: "recycler", cost_per_unit_usd: -0.45, recyclable: true, recycle_rate: 0.95 },
  { stream_id: "WS-003", name: "Titanium chips", category: "metallic", unit: "kg", monthly_qty: 200, disposal_method: "specialty_recycler", cost_per_unit_usd: -3.50, recyclable: true, recycle_rate: 0.88 },
  { stream_id: "WS-004", name: "Spent cutting fluid", category: "chemical", unit: "liters", monthly_qty: 800, disposal_method: "licensed_treatment", cost_per_unit_usd: 0.85, recyclable: false, recycle_rate: 0, hazard_class: "H14" },
  { stream_id: "WS-005", name: "Coolant concentrate", category: "chemical", unit: "liters", monthly_qty: 120, disposal_method: "manufacturer_return", cost_per_unit_usd: 0.50, recyclable: true, recycle_rate: 0.30 },
  { stream_id: "WS-006", name: "Used lubricants", category: "chemical", unit: "liters", monthly_qty: 250, disposal_method: "re-refiner", cost_per_unit_usd: 0.35, recyclable: true, recycle_rate: 0.70 },
  { stream_id: "WS-007", name: "Cardboard packaging", category: "packaging", unit: "kg", monthly_qty: 600, disposal_method: "recycler", cost_per_unit_usd: -0.05, recyclable: true, recycle_rate: 0.85 },
  { stream_id: "WS-008", name: "Plastic packaging", category: "packaging", unit: "kg", monthly_qty: 200, disposal_method: "recycler", cost_per_unit_usd: 0.02, recyclable: true, recycle_rate: 0.45 },
  { stream_id: "WS-009", name: "Wood pallets", category: "packaging", unit: "units", monthly_qty: 40, disposal_method: "pallet_refurb", cost_per_unit_usd: -2.00, recyclable: true, recycle_rate: 0.80 },
  { stream_id: "WS-010", name: "Grinding sludge", category: "hazardous", unit: "kg", monthly_qty: 350, disposal_method: "licensed_disposal", cost_per_unit_usd: 1.20, recyclable: false, recycle_rate: 0, hazard_class: "H13" },
  { stream_id: "WS-011", name: "Waste oil/grease", category: "hazardous", unit: "liters", monthly_qty: 150, disposal_method: "re-refiner", cost_per_unit_usd: 0.40, recyclable: true, recycle_rate: 0.65, hazard_class: "H3" },
  { stream_id: "WS-012", name: "Filter cartridges", category: "general", unit: "units", monthly_qty: 25, disposal_method: "landfill", cost_per_unit_usd: 3.00, recyclable: false, recycle_rate: 0 },
];

// Water usage profiles
interface WaterProfile {
  source: string;
  monthly_m3: number;
  category: "process" | "cooling" | "cleaning" | "sanitary" | "fire_suppression";
  discharge_to: string;
  treatment_required: boolean;
  quality_parameters?: Record<string, { value: number; limit: number; unit: string }>;
}

const WATER_PROFILES: WaterProfile[] = [
  {
    source: "municipal_supply", monthly_m3: 280, category: "process",
    discharge_to: "industrial_sewer", treatment_required: true,
    quality_parameters: {
      pH: { value: 7.2, limit: 9.0, unit: "pH" },
      TSS: { value: 35, limit: 50, unit: "mg/L" },
      oil_grease: { value: 8, limit: 15, unit: "mg/L" },
      heavy_metals: { value: 0.3, limit: 1.0, unit: "mg/L" },
    },
  },
  {
    source: "municipal_supply", monthly_m3: 450, category: "cooling",
    discharge_to: "cooling_tower_recirculation", treatment_required: false,
  },
  {
    source: "municipal_supply", monthly_m3: 120, category: "cleaning",
    discharge_to: "industrial_sewer", treatment_required: true,
    quality_parameters: {
      pH: { value: 6.8, limit: 9.0, unit: "pH" },
      detergent: { value: 12, limit: 25, unit: "mg/L" },
    },
  },
  {
    source: "municipal_supply", monthly_m3: 60, category: "sanitary",
    discharge_to: "sanitary_sewer", treatment_required: false,
  },
  {
    source: "rainwater_harvest", monthly_m3: 35, category: "fire_suppression",
    discharge_to: "retention_pond", treatment_required: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

// ---------------------------------------------------------------------------
// sus_waste — Track and analyze waste streams
// ---------------------------------------------------------------------------

function analyzeWaste(input: WasteInput) {
  const {
    facility = "main_shop",
    period = "2026-Q1",
    waste_type = "all",
    include_trends = true,
    include_disposal = true,
  } = input;

  const seed = hashStr(facility + period);

  const streams = waste_type === "all"
    ? WASTE_STREAMS
    : WASTE_STREAMS.filter((w) => w.category === waste_type);

  // Generate monthly data with variation
  const monthlyData = streams.map((ws) => {
    const variation = 1 + ((seed + hashStr(ws.stream_id)) % 20 - 10) / 100;
    const qty = Math.round(ws.monthly_qty * variation * 100) / 100;
    const cost = Math.round(qty * ws.cost_per_unit_usd * 100) / 100;
    const recycledQty = Math.round(qty * ws.recycle_rate * 100) / 100;

    return {
      stream_id: ws.stream_id,
      name: ws.name,
      category: ws.category,
      quantity: qty,
      unit: ws.unit,
      recycled_quantity: recycledQty,
      recycle_rate_pct: Math.round(ws.recycle_rate * 100),
      disposal_cost_usd: cost,
      ...(include_disposal
        ? {
            disposal_method: ws.disposal_method,
            hazard_class: ws.hazard_class ?? "non-hazardous",
          }
        : {}),
    };
  });

  // Summary metrics
  const totalWasteKg = monthlyData
    .filter((m) => m.unit === "kg")
    .reduce((s, m) => s + m.quantity, 0);
  const totalRecycledKg = monthlyData
    .filter((m) => m.unit === "kg")
    .reduce((s, m) => s + m.recycled_quantity, 0);
  const totalCost = monthlyData.reduce((s, m) => s + m.disposal_cost_usd, 0);
  const revenue = monthlyData.filter((m) => m.disposal_cost_usd < 0).reduce((s, m) => s + Math.abs(m.disposal_cost_usd), 0);

  // Category breakdown
  const categories = ["metallic", "chemical", "packaging", "hazardous", "general"];
  const categoryBreakdown = categories.map((cat) => {
    const catStreams = monthlyData.filter((m) => m.category === cat);
    return {
      category: cat,
      streams_count: catStreams.length,
      total_disposal_cost_usd: Math.round(catStreams.reduce((s, m) => s + m.disposal_cost_usd, 0) * 100) / 100,
    };
  }).filter((c) => c.streams_count > 0);

  // Trends (last 4 months)
  const trends = include_trends
    ? Array.from({ length: 4 }, (_, i) => {
        const mSeed = seed + i * 31;
        const factor = 1 + ((mSeed % 10) - 5) / 100;
        return {
          month: new Date(Date.now() - (3 - i) * 30 * 86400000).toISOString().slice(0, 7),
          total_waste_kg: Math.round(totalWasteKg * factor),
          recycled_kg: Math.round(totalRecycledKg * factor * (1 + i * 0.01)),
          recycle_rate_pct: Math.round((totalRecycledKg * factor * (1 + i * 0.01)) / (totalWasteKg * factor) * 1000) / 10,
          net_disposal_cost_usd: Math.round(totalCost * factor * 100) / 100,
        };
      })
    : undefined;

  return {
    facility,
    period,
    waste_type,
    generated_at: new Date().toISOString(),
    summary: {
      total_streams: monthlyData.length,
      total_waste_kg: Math.round(totalWasteKg),
      total_recycled_kg: Math.round(totalRecycledKg),
      overall_recycle_rate_pct: totalWasteKg > 0
        ? Math.round((totalRecycledKg / totalWasteKg) * 1000) / 10
        : 0,
      landfill_diversion_pct: totalWasteKg > 0
        ? Math.round(((totalRecycledKg + totalWasteKg * 0.05) / totalWasteKg) * 1000) / 10 // +5% energy recovery
        : 0,
      net_disposal_cost_usd: Math.round(totalCost * 100) / 100,
      recycling_revenue_usd: Math.round(revenue * 100) / 100,
      hazardous_streams: monthlyData.filter((m) => m.category === "hazardous").length,
    },
    category_breakdown: categoryBreakdown,
    streams: monthlyData,
    trends,
    recommendations: [
      ...(totalRecycledKg / totalWasteKg < 0.80 ? ["Overall recycling rate below 80% — investigate non-recyclable streams for alternatives"] : []),
      ...(monthlyData.some((m) => m.category === "hazardous") ? ["Hazardous waste streams present — ensure compliance with local regulations"] : []),
      revenue > 0 ? `Metal chip recycling generating $${revenue.toFixed(0)}/month revenue — consider volume agreements for better rates` : "No recycling revenue — explore metal chip recovery programs",
    ],
  };
}

// ---------------------------------------------------------------------------
// sus_recycle — Monitor recycling and circular economy
// ---------------------------------------------------------------------------

function monitorRecycling(input: RecycleInput) {
  const {
    facility = "main_shop",
    period = "2026-Q1",
    include_circular_metrics = true,
    include_revenue = true,
  } = input;

  const seed = hashStr(facility + period);

  // Recyclable streams only
  const recyclables = WASTE_STREAMS.filter((w) => w.recyclable);

  const recycleData = recyclables.map((ws) => {
    const variation = 1 + ((seed + hashStr(ws.stream_id)) % 15 - 7) / 100;
    const generated = Math.round(ws.monthly_qty * variation);
    const recycled = Math.round(generated * ws.recycle_rate);
    const revenuePerUnit = ws.cost_per_unit_usd < 0 ? Math.abs(ws.cost_per_unit_usd) : 0;

    return {
      stream: ws.name,
      category: ws.category,
      unit: ws.unit,
      generated,
      recycled,
      recycle_rate_pct: Math.round(ws.recycle_rate * 100),
      ...(include_revenue ? {
        revenue_per_unit_usd: revenuePerUnit,
        monthly_revenue_usd: Math.round(recycled * revenuePerUnit * 100) / 100,
      } : {}),
      destination: ws.disposal_method,
    };
  });

  const totalGenerated = recycleData.filter((r) => r.unit === "kg").reduce((s, r) => s + r.generated, 0);
  const totalRecycled = recycleData.filter((r) => r.unit === "kg").reduce((s, r) => s + r.recycled, 0);
  const totalRevenue = include_revenue
    ? recycleData.reduce((s, r) => s + ((r as any).monthly_revenue_usd ?? 0), 0)
    : 0;

  // Circular economy metrics
  const circular = include_circular_metrics
    ? {
        material_circularity_index: Math.round((totalRecycled / Math.max(totalGenerated, 1)) * 0.9 * 10000) / 10000, // MCI simplified
        recycled_input_rate: 0.35 + (seed % 15) / 100, // fraction of inputs from recycled sources
        end_of_life_recycling_rate: totalGenerated > 0 ? Math.round((totalRecycled / totalGenerated) * 10000) / 10000 : 0,
        waste_to_landfill_pct: Math.round(((totalGenerated - totalRecycled) / Math.max(totalGenerated, 1)) * 0.7 * 1000) / 10, // 30% of non-recycled goes to energy recovery
        closed_loop_streams: recycleData.filter((r) => r.destination.includes("recycler") || r.destination.includes("return")).length,
        open_loop_streams: recycleData.filter((r) => !r.destination.includes("recycler") && !r.destination.includes("return")).length,
      }
    : undefined;

  return {
    facility,
    period,
    generated_at: new Date().toISOString(),
    summary: {
      recyclable_streams: recycleData.length,
      total_generated_kg: totalGenerated,
      total_recycled_kg: totalRecycled,
      overall_recycle_rate_pct: totalGenerated > 0 ? Math.round((totalRecycled / totalGenerated) * 1000) / 10 : 0,
      monthly_revenue_usd: Math.round(totalRevenue * 100) / 100,
      annual_revenue_projected_usd: Math.round(totalRevenue * 12 * 100) / 100,
    },
    streams: recycleData,
    circular_economy: circular,
    recommendations: [
      ...(circular && circular.material_circularity_index < 0.5 ? ["MCI below 0.5 — explore closed-loop supply agreements with material suppliers"] : []),
      ...(circular && circular.recycled_input_rate < 0.40 ? ["Low recycled input rate — increase procurement of recycled-content materials"] : []),
      totalRevenue > 500 ? "Significant recycling revenue — negotiate bulk recycling contracts for better rates" : "Explore metal recycling markets — steel/aluminum chips have commodity value",
    ],
  };
}

// ---------------------------------------------------------------------------
// sus_water — Track water consumption
// ---------------------------------------------------------------------------

function trackWater(input: WaterInput) {
  const {
    facility = "main_shop",
    period = "2026-Q1",
    include_quality = true,
    include_treatment = true,
    include_benchmarks = true,
  } = input;

  const seed = hashStr(facility + period);

  // Water consumption data
  const consumption = WATER_PROFILES.map((wp) => {
    const variation = 1 + ((seed + hashStr(wp.source + wp.category)) % 20 - 10) / 100;
    const m3 = Math.round(wp.monthly_m3 * variation * 10) / 10;
    const costPerM3 = wp.source === "rainwater_harvest" ? 0 : 2.85; // $/m³ municipal water

    return {
      category: wp.category,
      source: wp.source,
      monthly_m3: m3,
      cost_usd: Math.round(m3 * costPerM3 * 100) / 100,
      discharge_to: wp.discharge_to,
      treatment_required: wp.treatment_required,
      ...(include_quality && wp.quality_parameters
        ? {
            quality: Object.entries(wp.quality_parameters).map(([param, data]) => ({
              parameter: param,
              value: Math.round(data.value * (1 + ((seed % 10) - 5) / 100) * 100) / 100,
              limit: data.limit,
              unit: data.unit,
              compliant: data.value * (1 + ((seed % 10) - 5) / 100) <= data.limit,
            })),
          }
        : {}),
    };
  });

  const totalM3 = consumption.reduce((s, c) => s + c.monthly_m3, 0);
  const totalCost = consumption.reduce((s, c) => s + c.cost_usd, 0);
  const dischargeM3 = consumption
    .filter((c) => c.discharge_to.includes("sewer"))
    .reduce((s, c) => s + c.monthly_m3, 0);
  const recycledM3 = consumption
    .filter((c) => c.discharge_to.includes("recirculation"))
    .reduce((s, c) => s + c.monthly_m3, 0);

  // Category breakdown
  const categories = [...new Set(consumption.map((c) => c.category))];
  const categoryBreakdown = categories.map((cat) => {
    const catItems = consumption.filter((c) => c.category === cat);
    const catTotal = catItems.reduce((s, c) => s + c.monthly_m3, 0);
    return {
      category: cat,
      monthly_m3: Math.round(catTotal * 10) / 10,
      pct_of_total: Math.round((catTotal / totalM3) * 1000) / 10,
    };
  });

  // Treatment summary
  const treatment = include_treatment
    ? {
        streams_requiring_treatment: consumption.filter((c) => c.treatment_required).length,
        treated_volume_m3: Math.round(
          consumption.filter((c) => c.treatment_required).reduce((s, c) => s + c.monthly_m3, 0) * 10
        ) / 10,
        treatment_cost_usd: Math.round(
          consumption.filter((c) => c.treatment_required).reduce((s, c) => s + c.monthly_m3, 0) * 1.50 * 100
        ) / 100, // $1.50/m³ treatment
        discharge_quality_status: consumption.every((c) => {
          const q = (c as any).quality;
          return !q || q.every((p: any) => p.compliant);
        })
          ? "all_compliant"
          : "non_compliant_detected",
      }
    : undefined;

  // Industry benchmarks
  const benchmarks = include_benchmarks
    ? {
        water_intensity_m3_per_part: Math.round((totalM3 / (8000 + seed % 3000)) * 10000) / 10000,
        industry_avg_m3_per_part: 0.12,
        water_reuse_rate: Math.round((recycledM3 / totalM3) * 10000) / 10000,
        industry_avg_reuse_rate: 0.35,
        performance_vs_benchmark: (recycledM3 / totalM3) > 0.35 ? "above_average" : "below_average",
      }
    : undefined;

  return {
    facility,
    period,
    generated_at: new Date().toISOString(),
    summary: {
      total_intake_m3: Math.round(totalM3 * 10) / 10,
      total_discharge_m3: Math.round(dischargeM3 * 10) / 10,
      recycled_recirculated_m3: Math.round(recycledM3 * 10) / 10,
      net_consumption_m3: Math.round((totalM3 - recycledM3) * 10) / 10,
      total_cost_usd: Math.round(totalCost * 100) / 100,
      water_sources: [...new Set(consumption.map((c) => c.source))],
    },
    category_breakdown: categoryBreakdown,
    consumption_detail: consumption,
    treatment,
    benchmarks,
    recommendations: [
      ...(recycledM3 / totalM3 < 0.35 ? ["Water reuse rate below industry average (35%) — investigate cooling tower blowdown recycling"] : []),
      ...(treatment?.discharge_quality_status === "non_compliant_detected" ? ["Non-compliant discharge detected — immediate corrective action required"] : []),
      totalM3 > 800 ? "High water consumption — consider closed-loop coolant systems to reduce process water" : "Water consumption within normal range",
    ],
  };
}

// ---------------------------------------------------------------------------
// sus_kpi — Sustainability KPIs
// ---------------------------------------------------------------------------

function computeKPIs(input: KPIInput) {
  const {
    facility = "main_shop",
    period = "2026-Q1",
    kpi_set = "all",
    include_targets = true,
    include_scoring = true,
  } = input;

  const seed = hashStr(facility + period);
  const partsProduced = 8000 + (seed % 3000);
  const revenue = 2500000 + seed * 100;
  const employees = 45 + (seed % 15);

  // Compute KPIs
  interface KPI {
    id: string;
    name: string;
    category: string;
    value: number;
    unit: string;
    target?: number;
    status?: string;
    score?: number;
    trend?: string;
  }

  const allKPIs: KPI[] = [];

  // Environmental KPIs
  if (kpi_set === "all" || kpi_set === "environmental") {
    const totalCO2 = 142 + (seed % 30);
    const energyKwh = 370000 + (seed % 50000);

    allKPIs.push(
      { id: "ENV-001", name: "Total GHG Emissions", category: "environmental", value: totalCO2, unit: "tCO2e/year", target: 120, status: "", score: 0, trend: "" },
      { id: "ENV-002", name: "Energy Intensity", category: "environmental", value: Math.round((energyKwh / partsProduced) * 100) / 100, unit: "kWh/part", target: 40, status: "", score: 0, trend: "" },
      { id: "ENV-003", name: "Carbon Intensity", category: "environmental", value: Math.round((totalCO2 * 1000 / partsProduced) * 100) / 100, unit: "kgCO2e/part", target: 12, status: "", score: 0, trend: "" },
      { id: "ENV-004", name: "Renewable Energy Share", category: "environmental", value: 22 + (seed % 15), unit: "%", target: 50, status: "", score: 0, trend: "" },
    );
  }

  // Resource KPIs
  if (kpi_set === "all" || kpi_set === "resource") {
    allKPIs.push(
      { id: "RES-001", name: "Water Intensity", category: "resource", value: Math.round((945 / partsProduced) * 10000) / 10000, unit: "m3/part", target: 0.10, status: "", score: 0, trend: "" },
      { id: "RES-002", name: "Material Utilization", category: "resource", value: 72 + (seed % 10), unit: "%", target: 85, status: "", score: 0, trend: "" },
      { id: "RES-003", name: "Waste Generation Rate", category: "resource", value: Math.round((7500 / partsProduced) * 1000) / 1000, unit: "kg/part", target: 0.8, status: "", score: 0, trend: "" },
      { id: "RES-004", name: "Coolant Consumption", category: "resource", value: Math.round((800 / partsProduced) * 10000) / 10000, unit: "L/part", target: 0.08, status: "", score: 0, trend: "" },
    );
  }

  // Circular Economy KPIs
  if (kpi_set === "all" || kpi_set === "circular") {
    allKPIs.push(
      { id: "CIR-001", name: "Overall Recycling Rate", category: "circular", value: 82 + (seed % 10), unit: "%", target: 90, status: "", score: 0, trend: "" },
      { id: "CIR-002", name: "Landfill Diversion Rate", category: "circular", value: 88 + (seed % 8), unit: "%", target: 95, status: "", score: 0, trend: "" },
      { id: "CIR-003", name: "Recycled Input Rate", category: "circular", value: 35 + (seed % 12), unit: "%", target: 50, status: "", score: 0, trend: "" },
      { id: "CIR-004", name: "Material Circularity Index", category: "circular", value: Math.round((0.45 + (seed % 20) / 100) * 100) / 100, unit: "index", target: 0.60, status: "", score: 0, trend: "" },
    );
  }

  // Compliance KPIs
  if (kpi_set === "all" || kpi_set === "compliance") {
    allKPIs.push(
      { id: "COM-001", name: "Environmental Incidents", category: "compliance", value: seed % 3, unit: "count", target: 0, status: "", score: 0, trend: "" },
      { id: "COM-002", name: "Discharge Compliance Rate", category: "compliance", value: 96 + (seed % 4), unit: "%", target: 100, status: "", score: 0, trend: "" },
      { id: "COM-003", name: "Permit Violations", category: "compliance", value: 0, unit: "count", target: 0, status: "", score: 0, trend: "" },
      { id: "COM-004", name: "Environmental Audit Score", category: "compliance", value: 85 + (seed % 12), unit: "pts/100", target: 90, status: "", score: 0, trend: "" },
    );
  }

  // Compute status and scores
  for (const kpi of allKPIs) {
    if (include_targets && kpi.target !== undefined) {
      // For KPIs where lower is better (emissions, waste, incidents)
      const lowerIsBetter = ["tCO2e/year", "kWh/part", "kgCO2e/part", "m3/part", "kg/part", "L/part", "count"].includes(kpi.unit);
      if (lowerIsBetter) {
        kpi.status = kpi.value <= kpi.target ? "on_target" : kpi.value <= kpi.target * 1.1 ? "near_target" : "off_target";
      } else {
        kpi.status = kpi.value >= kpi.target ? "on_target" : kpi.value >= kpi.target * 0.9 ? "near_target" : "off_target";
      }
    }

    if (include_scoring) {
      // Score 0-100 based on target proximity
      if (kpi.target !== undefined) {
        const lowerIsBetter = ["tCO2e/year", "kWh/part", "kgCO2e/part", "m3/part", "kg/part", "L/part", "count"].includes(kpi.unit);
        const ratio = lowerIsBetter ? kpi.target / Math.max(kpi.value, 0.001) : kpi.value / Math.max(kpi.target, 0.001);
        kpi.score = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      }
    }

    // Trend simulation
    kpi.trend = (seed + hashStr(kpi.id)) % 3 === 0 ? "improving" : (seed + hashStr(kpi.id)) % 3 === 1 ? "stable" : "declining";
  }

  // Overall sustainability score
  const avgScore = allKPIs.reduce((s, k) => s + (k.score ?? 0), 0) / allKPIs.length;
  const onTarget = allKPIs.filter((k) => k.status === "on_target").length;
  const offTarget = allKPIs.filter((k) => k.status === "off_target").length;

  let overallRating: string;
  if (avgScore >= 85) overallRating = "excellent";
  else if (avgScore >= 70) overallRating = "good";
  else if (avgScore >= 55) overallRating = "fair";
  else overallRating = "needs_improvement";

  return {
    facility,
    period,
    kpi_set,
    generated_at: new Date().toISOString(),
    production_context: {
      parts_produced: partsProduced,
      revenue_usd: revenue,
      employees,
    },
    overall: {
      sustainability_score: Math.round(avgScore),
      rating: overallRating,
      kpis_on_target: onTarget,
      kpis_near_target: allKPIs.filter((k) => k.status === "near_target").length,
      kpis_off_target: offTarget,
      total_kpis: allKPIs.length,
    },
    kpis: allKPIs,
    priority_actions: allKPIs
      .filter((k) => k.status === "off_target")
      .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
      .slice(0, 5)
      .map((k) => ({
        kpi: k.name,
        current: k.value,
        target: k.target,
        gap: k.unit.includes("%") || k.unit === "index"
          ? `${Math.abs(Math.round((k.value - (k.target ?? 0)) * 10) / 10)} ${k.unit}`
          : `${Math.abs(Math.round((k.value - (k.target ?? 0)) * 100) / 100)} ${k.unit}`,
        priority: (k.score ?? 100) < 50 ? "high" : "medium",
      })),
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeSustainabilityMetricsAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "sus_waste":
      return analyzeWaste(params as unknown as WasteInput);
    case "sus_recycle":
      return monitorRecycling(params as unknown as RecycleInput);
    case "sus_water":
      return trackWater(params as unknown as WaterInput);
    case "sus_kpi":
      return computeKPIs(params as unknown as KPIInput);
    default:
      throw new Error(`SustainabilityMetricsEngine: unknown action "${action}"`);
  }
}
