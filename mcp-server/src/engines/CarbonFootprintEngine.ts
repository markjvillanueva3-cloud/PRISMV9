/**
 * CarbonFootprintEngine — R23-MS2
 *
 * Calculates CO2 emissions per part, performs lifecycle carbon assessments,
 * generates carbon reduction recommendations, and produces emissions reports
 * for regulatory compliance and sustainability targets.
 *
 * Actions:
 *   co2_calculate — Calculate CO2 emissions for a manufacturing operation
 *   co2_lifecycle — Full lifecycle carbon assessment for a part
 *   co2_reduce    — Generate carbon reduction recommendations
 *   co2_report    — Produce emissions report for a period/facility
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CO2CalculateInput {
  part_id?: string;
  material?: string;
  weight_kg?: number;
  operations?: string[];
  machine_ids?: string[];
  energy_kwh?: number;
  transport_km?: number;
  include_scope3?: boolean;
}

interface LifecycleInput {
  part_id?: string;
  material?: string;
  weight_kg?: number;
  include_raw_material?: boolean;
  include_manufacturing?: boolean;
  include_transport?: boolean;
  include_use_phase?: boolean;
  include_end_of_life?: boolean;
  lifetime_years?: number;
}

interface ReduceInput {
  facility?: string;
  current_emissions_tco2?: number;
  target_reduction_pct?: number;
  budget_usd?: number;
  include_cost_benefit?: boolean;
  priority?: "cost" | "impact" | "speed";
}

interface ReportInput {
  facility?: string;
  period?: string;
  scope?: ("scope1" | "scope2" | "scope3")[];
  format?: "summary" | "detailed" | "regulatory";
  standard?: "GHG_Protocol" | "ISO_14064" | "CDP";
  include_trends?: boolean;
}

// ---------------------------------------------------------------------------
// Seeded data — carbon emission factors
// ---------------------------------------------------------------------------

// Material embodied carbon (kg CO2e per kg of material)
const MATERIAL_CARBON: Record<string, { embodied_kgco2_per_kg: number; recycled_fraction: number; recyclable: boolean }> = {
  aluminum_6061: { embodied_kgco2_per_kg: 8.24, recycled_fraction: 0.35, recyclable: true },
  aluminum_7075: { embodied_kgco2_per_kg: 9.16, recycled_fraction: 0.30, recyclable: true },
  steel_1045: { embodied_kgco2_per_kg: 1.85, recycled_fraction: 0.40, recyclable: true },
  steel_4140: { embodied_kgco2_per_kg: 2.10, recycled_fraction: 0.38, recyclable: true },
  steel_4340: { embodied_kgco2_per_kg: 2.35, recycled_fraction: 0.35, recyclable: true },
  stainless_304: { embodied_kgco2_per_kg: 4.50, recycled_fraction: 0.60, recyclable: true },
  stainless_316: { embodied_kgco2_per_kg: 5.20, recycled_fraction: 0.55, recyclable: true },
  titanium_6al4v: { embodied_kgco2_per_kg: 35.0, recycled_fraction: 0.15, recyclable: true },
  inconel_718: { embodied_kgco2_per_kg: 18.5, recycled_fraction: 0.20, recyclable: true },
  cast_iron: { embodied_kgco2_per_kg: 1.50, recycled_fraction: 0.45, recyclable: true },
  brass_360: { embodied_kgco2_per_kg: 3.60, recycled_fraction: 0.50, recyclable: true },
  copper_110: { embodied_kgco2_per_kg: 3.80, recycled_fraction: 0.55, recyclable: true },
};

// Grid electricity emission factors (kg CO2e per kWh)
const GRID_EMISSION_FACTORS: Record<string, number> = {
  us_average: 0.386,
  us_northeast: 0.280,
  us_midwest: 0.480,
  us_south: 0.420,
  us_west: 0.260,
  eu_average: 0.230,
  china: 0.555,
  india: 0.720,
  japan: 0.470,
  renewable_100: 0.0,
  renewable_mix_50: 0.193,
};

// Process-specific emission factors (kg CO2e per hour of operation)
const PROCESS_EMISSIONS: Record<string, { direct_kgco2_hr: number; indirect_kgco2_hr: number; category: string }> = {
  rough_turning: { direct_kgco2_hr: 0.05, indirect_kgco2_hr: 3.2, category: "machining" },
  finish_turning: { direct_kgco2_hr: 0.03, indirect_kgco2_hr: 2.1, category: "machining" },
  rough_milling: { direct_kgco2_hr: 0.06, indirect_kgco2_hr: 4.8, category: "machining" },
  finish_milling: { direct_kgco2_hr: 0.04, indirect_kgco2_hr: 2.5, category: "machining" },
  drilling: { direct_kgco2_hr: 0.03, indirect_kgco2_hr: 2.0, category: "machining" },
  grinding: { direct_kgco2_hr: 0.04, indirect_kgco2_hr: 3.0, category: "machining" },
  heat_treatment: { direct_kgco2_hr: 2.50, indirect_kgco2_hr: 15.0, category: "thermal" },
  surface_treatment: { direct_kgco2_hr: 1.80, indirect_kgco2_hr: 5.5, category: "chemical" },
  welding: { direct_kgco2_hr: 0.85, indirect_kgco2_hr: 3.8, category: "joining" },
  inspection: { direct_kgco2_hr: 0.01, indirect_kgco2_hr: 0.5, category: "quality" },
  packaging: { direct_kgco2_hr: 0.02, indirect_kgco2_hr: 0.3, category: "logistics" },
};

// Transport emission factors (kg CO2e per tonne-km)
const TRANSPORT_EMISSIONS: Record<string, number> = {
  road_truck: 0.062,
  rail: 0.022,
  sea_container: 0.008,
  air_freight: 0.602,
  local_van: 0.150,
};

// Coolant/lubricant factors
const COOLANT_EMISSION = 0.45; // kg CO2e per liter consumed
const TOOLING_EMISSION = 2.8;  // kg CO2e per tool change

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

function getMaterialCarbon(mat: string) {
  const key = mat.toLowerCase().replace(/[\s-]+/g, "_");
  for (const [k, v] of Object.entries(MATERIAL_CARBON)) {
    if (key.includes(k) || k.includes(key)) return { key: k, ...v };
  }
  return { key: "steel_4140", ...MATERIAL_CARBON.steel_4140 };
}

function getProcessEmission(op: string) {
  for (const [k, v] of Object.entries(PROCESS_EMISSIONS)) {
    if (op.includes(k) || k.includes(op)) return v;
  }
  return PROCESS_EMISSIONS.rough_milling;
}

// ---------------------------------------------------------------------------
// co2_calculate — Calculate CO2 for manufacturing
// ---------------------------------------------------------------------------

function calculateCO2(input: CO2CalculateInput) {
  const {
    part_id = "PART-001",
    material = "steel_4140",
    weight_kg = 3.5,
    operations = ["rough_turning", "finish_turning", "milling_features", "grinding", "heat_treatment", "inspection"],
    energy_kwh,
    transport_km = 500,
    include_scope3 = true,
  } = input;

  const matData = getMaterialCarbon(material);
  const seed = hashStr(part_id);

  // Buy-to-fly ratio (material purchased vs material in finished part)
  const buyToFly = 1.3 + (seed % 20) / 100;
  const rawMaterialKg = weight_kg * buyToFly;
  const chipKg = rawMaterialKg - weight_kg;

  // Scope 1: Direct emissions from processes
  const scope1 = operations.reduce((total, op) => {
    const proc = getProcessEmission(op);
    const hours = (15 + (seed % 30)) / 60; // 15-45 min per operation
    return total + proc.direct_kgco2_hr * hours;
  }, 0);

  // Scope 2: Indirect from electricity
  const gridFactor = GRID_EMISSION_FACTORS.us_average;
  const totalEnergy = energy_kwh ?? operations.length * (2.5 + (seed % 30) / 10);
  const scope2 = totalEnergy * gridFactor;

  // Scope 3: Supply chain (materials, transport, tooling, coolant, end-of-life)
  let scope3 = 0;
  let scope3Breakdown;
  if (include_scope3) {
    const materialEmissions = rawMaterialKg * matData.embodied_kgco2_per_kg;
    const transportEmissions = (rawMaterialKg / 1000) * transport_km * TRANSPORT_EMISSIONS.road_truck;
    const toolChanges = Math.ceil(operations.filter((o) => o.includes("turn") || o.includes("mill") || o.includes("grind")).length * 0.3);
    const toolingEmissions = toolChanges * TOOLING_EMISSION;
    const coolantLiters = operations.length * 0.5;
    const coolantEmissions = coolantLiters * COOLANT_EMISSION;
    const chipRecycleCredit = chipKg * matData.embodied_kgco2_per_kg * matData.recycled_fraction * -0.8;

    scope3 = materialEmissions + transportEmissions + toolingEmissions + coolantEmissions + chipRecycleCredit;
    scope3Breakdown = {
      raw_material_kgco2: Math.round(materialEmissions * 1000) / 1000,
      transport_kgco2: Math.round(transportEmissions * 1000) / 1000,
      tooling_kgco2: Math.round(toolingEmissions * 1000) / 1000,
      coolant_kgco2: Math.round(coolantEmissions * 1000) / 1000,
      chip_recycle_credit_kgco2: Math.round(chipRecycleCredit * 1000) / 1000,
    };
  }

  const totalCO2 = scope1 + scope2 + scope3;

  return {
    part_id,
    material: matData.key,
    weight_kg,
    buy_to_fly_ratio: buyToFly,
    raw_material_kg: Math.round(rawMaterialKg * 100) / 100,
    chip_waste_kg: Math.round(chipKg * 100) / 100,
    operations_count: operations.length,
    energy_consumed_kwh: Math.round(totalEnergy * 100) / 100,
    emissions: {
      scope1_direct_kgco2: Math.round(scope1 * 1000) / 1000,
      scope2_electricity_kgco2: Math.round(scope2 * 1000) / 1000,
      scope3_supply_chain_kgco2: include_scope3 ? Math.round(scope3 * 1000) / 1000 : undefined,
      total_kgco2: Math.round(totalCO2 * 1000) / 1000,
      per_kg_product_kgco2: Math.round((totalCO2 / weight_kg) * 1000) / 1000,
    },
    scope3_breakdown: scope3Breakdown,
    grid_emission_factor: gridFactor,
    carbon_intensity_rating: totalCO2 / weight_kg < 5 ? "low" : totalCO2 / weight_kg < 15 ? "medium" : "high",
  };
}

// ---------------------------------------------------------------------------
// co2_lifecycle — Full lifecycle carbon assessment
// ---------------------------------------------------------------------------

function lifecycleAssessment(input: LifecycleInput) {
  const {
    part_id = "PART-001",
    material = "steel_4140",
    weight_kg = 3.5,
    include_raw_material = true,
    include_manufacturing = true,
    include_transport = true,
    include_use_phase = true,
    include_end_of_life = true,
    lifetime_years = 10,
  } = input;

  const matData = getMaterialCarbon(material);
  const seed = hashStr(part_id);
  const buyToFly = 1.3 + (seed % 20) / 100;
  const rawKg = weight_kg * buyToFly;

  const phases: { phase: string; kgco2: number; pct?: number; details: string }[] = [];

  // Phase 1: Raw material extraction & processing
  if (include_raw_material) {
    const matCO2 = rawKg * matData.embodied_kgco2_per_kg;
    phases.push({
      phase: "raw_material_extraction",
      kgco2: Math.round(matCO2 * 1000) / 1000,
      details: `${rawKg.toFixed(1)} kg ${matData.key} at ${matData.embodied_kgco2_per_kg} kgCO2e/kg`,
    });
  }

  // Phase 2: Manufacturing
  if (include_manufacturing) {
    const energyKwh = 8 + (seed % 20);
    const electricityCO2 = energyKwh * GRID_EMISSION_FACTORS.us_average;
    const processCO2 = 6 * 0.05 * 0.5; // 6 ops, avg 0.05 direct, 0.5 hr each
    const coolantCO2 = 3 * COOLANT_EMISSION;
    const toolingCO2 = 2 * TOOLING_EMISSION;
    const mfgTotal = electricityCO2 + processCO2 + coolantCO2 + toolingCO2;
    phases.push({
      phase: "manufacturing",
      kgco2: Math.round(mfgTotal * 1000) / 1000,
      details: `${energyKwh} kWh electricity + process + coolant + tooling`,
    });
  }

  // Phase 3: Transport & distribution
  if (include_transport) {
    const inboundKm = 800 + (seed % 400);
    const outboundKm = 200 + (seed % 300);
    const inbound = (rawKg / 1000) * inboundKm * TRANSPORT_EMISSIONS.road_truck;
    const outbound = (weight_kg / 1000) * outboundKm * TRANSPORT_EMISSIONS.road_truck;
    const transportTotal = inbound + outbound;
    phases.push({
      phase: "transport_distribution",
      kgco2: Math.round(transportTotal * 1000) / 1000,
      details: `Inbound ${inboundKm}km + outbound ${outboundKm}km by road`,
    });
  }

  // Phase 4: Use phase (energy consumed during service life)
  if (include_use_phase) {
    // Assume the part is in a machine that uses energy proportional to weight
    const annualEnergyKwh = weight_kg * 5 * (1 + (seed % 10) / 10);
    const usePhaseKwh = annualEnergyKwh * lifetime_years;
    const useCO2 = usePhaseKwh * GRID_EMISSION_FACTORS.us_average;
    phases.push({
      phase: "use_phase",
      kgco2: Math.round(useCO2 * 1000) / 1000,
      details: `${annualEnergyKwh.toFixed(0)} kWh/year × ${lifetime_years} years service life`,
    });
  }

  // Phase 5: End of life
  if (include_end_of_life) {
    const recycleCredit = weight_kg * matData.embodied_kgco2_per_kg * matData.recycled_fraction * -0.8;
    const disposalCO2 = weight_kg * 0.15; // landfill/processing
    const eolTotal = disposalCO2 + recycleCredit;
    phases.push({
      phase: "end_of_life",
      kgco2: Math.round(eolTotal * 1000) / 1000,
      details: matData.recyclable
        ? `Recyclable — ${Math.round(matData.recycled_fraction * 100)}% recycled content credit applied`
        : "Not recyclable — disposal emissions only",
    });
  }

  const totalCO2 = phases.reduce((s, p) => s + p.kgco2, 0);

  // Calculate percentages
  const phasesWithPct = phases.map((p) => ({
    ...p,
    pct: totalCO2 > 0 ? Math.round((Math.abs(p.kgco2) / Math.abs(totalCO2)) * 10000) / 100 : 0,
  }));

  // Hotspot identification
  const hotspot = phasesWithPct.reduce((a, b) => (Math.abs(a.kgco2) > Math.abs(b.kgco2) ? a : b));

  return {
    part_id,
    material: matData.key,
    weight_kg,
    lifetime_years,
    lifecycle_phases: phasesWithPct,
    total_kgco2: Math.round(totalCO2 * 1000) / 1000,
    per_kg_kgco2: Math.round((totalCO2 / weight_kg) * 1000) / 1000,
    per_year_kgco2: Math.round((totalCO2 / lifetime_years) * 1000) / 1000,
    hotspot: {
      phase: hotspot.phase,
      contribution_pct: hotspot.pct,
      recommendation: hotspot.phase === "raw_material_extraction"
        ? "Consider lighter-weight design or lower-carbon materials"
        : hotspot.phase === "manufacturing"
          ? "Optimize energy efficiency and consider renewable energy sourcing"
          : hotspot.phase === "use_phase"
            ? "Design for energy efficiency during service life"
            : "Improve end-of-life recyclability",
    },
    comparison: {
      vs_industry_avg_pct: Math.round(((totalCO2 / weight_kg) / 12 - 1) * 100), // 12 kgCO2/kg industry avg
      rating: totalCO2 / weight_kg < 8 ? "below_average" : totalCO2 / weight_kg < 15 ? "average" : "above_average",
    },
  };
}

// ---------------------------------------------------------------------------
// co2_reduce — Carbon reduction recommendations
// ---------------------------------------------------------------------------

function generateReductions(input: ReduceInput) {
  const {
    facility = "main_shop",
    current_emissions_tco2 = 450,
    target_reduction_pct = 30,
    budget_usd = 500000,
    include_cost_benefit = true,
    priority = "impact",
  } = input;

  const targetEmissions = current_emissions_tco2 * (1 - target_reduction_pct / 100);
  const reductionNeeded = current_emissions_tco2 - targetEmissions;

  // Generate reduction opportunities
  const opportunities = [
    {
      id: "REC-001",
      category: "energy_source",
      title: "Switch to 50% renewable electricity",
      description: "Power purchase agreement for 50% renewable energy mix",
      reduction_tco2: current_emissions_tco2 * 0.18,
      implementation_cost_usd: 25000,
      annual_operating_cost_usd: -8000, // savings
      payback_years: 0,
      implementation_months: 3,
      difficulty: "easy",
    },
    {
      id: "REC-002",
      category: "energy_source",
      title: "Switch to 100% renewable electricity",
      description: "Full renewable energy sourcing via PPA + RECs",
      reduction_tco2: current_emissions_tco2 * 0.35,
      implementation_cost_usd: 80000,
      annual_operating_cost_usd: 12000,
      payback_years: 0,
      implementation_months: 6,
      difficulty: "moderate",
    },
    {
      id: "REC-003",
      category: "process_optimization",
      title: "Implement adaptive cutting parameters",
      description: "AI-driven cutting parameter optimization to reduce energy per part by 15%",
      reduction_tco2: current_emissions_tco2 * 0.08,
      implementation_cost_usd: 120000,
      annual_operating_cost_usd: -15000,
      payback_years: 8,
      implementation_months: 12,
      difficulty: "moderate",
    },
    {
      id: "REC-004",
      category: "process_optimization",
      title: "High-efficiency spindle motors (IE4)",
      description: "Replace standard motors with IE4 premium efficiency motors on 5 key machines",
      reduction_tco2: current_emissions_tco2 * 0.05,
      implementation_cost_usd: 75000,
      annual_operating_cost_usd: -6000,
      payback_years: 12.5,
      implementation_months: 4,
      difficulty: "moderate",
    },
    {
      id: "REC-005",
      category: "material_optimization",
      title: "Increase recycled material content",
      description: "Switch to suppliers with higher recycled content (target 60%+)",
      reduction_tco2: current_emissions_tco2 * 0.06,
      implementation_cost_usd: 15000,
      annual_operating_cost_usd: 5000,
      payback_years: 0,
      implementation_months: 6,
      difficulty: "easy",
    },
    {
      id: "REC-006",
      category: "material_optimization",
      title: "Chip recycling program expansion",
      description: "Partner with certified recyclers for closed-loop chip recovery",
      reduction_tco2: current_emissions_tco2 * 0.04,
      implementation_cost_usd: 20000,
      annual_operating_cost_usd: -3000,
      payback_years: 6.7,
      implementation_months: 3,
      difficulty: "easy",
    },
    {
      id: "REC-007",
      category: "facility",
      title: "LED lighting + smart HVAC",
      description: "Replace facility lighting with LED + install smart HVAC controls",
      reduction_tco2: current_emissions_tco2 * 0.03,
      implementation_cost_usd: 45000,
      annual_operating_cost_usd: -12000,
      payback_years: 3.75,
      implementation_months: 2,
      difficulty: "easy",
    },
    {
      id: "REC-008",
      category: "facility",
      title: "Compressed air leak detection & repair",
      description: "Ultrasonic leak detection program — typical 20-30% compressed air waste",
      reduction_tco2: current_emissions_tco2 * 0.02,
      implementation_cost_usd: 8000,
      annual_operating_cost_usd: -4500,
      payback_years: 1.8,
      implementation_months: 1,
      difficulty: "easy",
    },
    {
      id: "REC-009",
      category: "logistics",
      title: "Optimize inbound logistics routes",
      description: "Consolidate shipments and optimize routing for raw material deliveries",
      reduction_tco2: current_emissions_tco2 * 0.015,
      implementation_cost_usd: 10000,
      annual_operating_cost_usd: -2000,
      payback_years: 5,
      implementation_months: 3,
      difficulty: "easy",
    },
    {
      id: "REC-010",
      category: "digital",
      title: "Real-time energy monitoring IoT",
      description: "Install per-machine energy monitors for real-time visibility and anomaly detection",
      reduction_tco2: current_emissions_tco2 * 0.04,
      implementation_cost_usd: 60000,
      annual_operating_cost_usd: -8000,
      payback_years: 7.5,
      implementation_months: 4,
      difficulty: "moderate",
    },
  ];

  // Sort by priority
  if (priority === "impact") opportunities.sort((a, b) => b.reduction_tco2 - a.reduction_tco2);
  else if (priority === "cost") opportunities.sort((a, b) => a.implementation_cost_usd - b.implementation_cost_usd);
  else opportunities.sort((a, b) => a.implementation_months - b.implementation_months);

  // Build implementation plan within budget
  let cumulativeReduction = 0;
  let cumulativeCost = 0;
  const plan = opportunities
    .filter((o) => cumulativeCost + o.implementation_cost_usd <= budget_usd)
    .map((o) => {
      cumulativeReduction += o.reduction_tco2;
      cumulativeCost += o.implementation_cost_usd;
      return {
        ...o,
        reduction_tco2: Math.round(o.reduction_tco2 * 10) / 10,
        cumulative_reduction_tco2: Math.round(cumulativeReduction * 10) / 10,
        cumulative_cost_usd: Math.round(cumulativeCost),
        ...(include_cost_benefit
          ? {
              cost_per_tco2_avoided: o.reduction_tco2 > 0
                ? Math.round(o.implementation_cost_usd / o.reduction_tco2)
                : 0,
              roi_5yr_usd: Math.round(
                o.annual_operating_cost_usd * -5 - o.implementation_cost_usd
              ),
            }
          : {}),
      };
    });

  const totalReduction = plan.reduce((s, p) => s + p.reduction_tco2, 0);
  const totalCost = plan.reduce((s, p) => s + p.implementation_cost_usd, 0);
  const totalAnnualSavings = plan.reduce((s, p) => s + Math.max(0, -p.annual_operating_cost_usd), 0);

  return {
    facility,
    current_emissions_tco2,
    target_reduction_pct,
    target_emissions_tco2: Math.round(targetEmissions * 10) / 10,
    reduction_needed_tco2: Math.round(reductionNeeded * 10) / 10,
    budget_usd,
    priority,
    plan_summary: {
      recommendations_count: plan.length,
      total_reduction_tco2: Math.round(totalReduction * 10) / 10,
      reduction_achieved_pct: Math.round((totalReduction / current_emissions_tco2) * 1000) / 10,
      target_met: totalReduction >= reductionNeeded,
      total_implementation_cost_usd: Math.round(totalCost),
      annual_operating_savings_usd: Math.round(totalAnnualSavings),
      simple_payback_years: totalAnnualSavings > 0
        ? Math.round((totalCost / totalAnnualSavings) * 10) / 10
        : 0,
      remaining_budget_usd: budget_usd - totalCost,
    },
    recommendations: plan,
    gap_analysis: totalReduction < reductionNeeded
      ? {
          shortfall_tco2: Math.round((reductionNeeded - totalReduction) * 10) / 10,
          suggestion: "Increase budget or consider carbon offsets to close the gap",
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// co2_report — Emissions reporting
// ---------------------------------------------------------------------------

function generateEmissionsReport(input: ReportInput) {
  const {
    facility = "main_shop",
    period = "2026-Q1",
    scope = ["scope1", "scope2", "scope3"],
    format = "detailed",
    standard = "GHG_Protocol",
    include_trends = true,
  } = input;

  const seed = hashStr(facility + period);

  // Generate emissions data per scope
  const scope1Data = scope.includes("scope1")
    ? {
        total_tco2: Math.round((12 + (seed % 8)) * 10) / 10,
        sources: [
          { source: "natural_gas_heating", tco2: Math.round((4 + (seed % 3)) * 10) / 10 },
          { source: "process_emissions", tco2: Math.round((3 + (seed % 2)) * 10) / 10 },
          { source: "welding_gases", tco2: Math.round((1.5 + (seed % 2) / 2) * 10) / 10 },
          { source: "company_vehicles", tco2: Math.round((2 + (seed % 2)) * 10) / 10 },
          { source: "refrigerant_leakage", tco2: Math.round((0.5 + (seed % 1) / 2) * 10) / 10 },
        ],
      }
    : undefined;

  const scope2Data = scope.includes("scope2")
    ? {
        total_tco2: Math.round((85 + (seed % 30)) * 10) / 10,
        sources: [
          { source: "purchased_electricity", tco2: Math.round((75 + (seed % 25)) * 10) / 10, kwh: Math.round((195000 + seed * 50)), grid_factor: GRID_EMISSION_FACTORS.us_average },
          { source: "purchased_steam", tco2: Math.round((8 + (seed % 5)) * 10) / 10 },
        ],
        market_based_tco2: Math.round((65 + (seed % 20)) * 10) / 10,
      }
    : undefined;

  const scope3Data = scope.includes("scope3")
    ? {
        total_tco2: Math.round((45 + (seed % 20)) * 10) / 10,
        categories: [
          { category: "purchased_goods_materials", tco2: Math.round((20 + (seed % 10)) * 10) / 10 },
          { category: "upstream_transportation", tco2: Math.round((8 + (seed % 5)) * 10) / 10 },
          { category: "waste_generated", tco2: Math.round((5 + (seed % 3)) * 10) / 10 },
          { category: "business_travel", tco2: Math.round((3 + (seed % 2)) * 10) / 10 },
          { category: "employee_commuting", tco2: Math.round((6 + (seed % 4)) * 10) / 10 },
          { category: "downstream_transportation", tco2: Math.round((3 + (seed % 2)) * 10) / 10 },
        ],
      }
    : undefined;

  const totalEmissions = (scope1Data?.total_tco2 ?? 0) + (scope2Data?.total_tco2 ?? 0) + (scope3Data?.total_tco2 ?? 0);

  // Trends (last 4 quarters)
  const trends = include_trends
    ? Array.from({ length: 4 }, (_, i) => {
        const qSeed = seed + i * 37;
        const qTotal = totalEmissions * (1.05 - i * 0.02) + ((qSeed % 10) - 5);
        return {
          period: `Q${4 - i}-${i > 0 ? "2025" : "2026"}`,
          total_tco2: Math.round(qTotal * 10) / 10,
          yoy_change_pct: Math.round(((qSeed % 8) - 4) * 10) / 10,
        };
      }).reverse()
    : undefined;

  // KPIs
  const employees = 45 + (seed % 15);
  const revenue = 2500000 + seed * 100;
  const partsProduced = 8000 + (seed % 3000);

  return {
    report_title: `GHG Emissions Report — ${facility}`,
    period,
    standard,
    format,
    generated_at: new Date().toISOString(),
    facility_info: {
      name: facility,
      employees,
      annual_revenue_usd: revenue,
      parts_produced: partsProduced,
    },
    emissions_summary: {
      total_tco2: Math.round(totalEmissions * 10) / 10,
      scope1_tco2: scope1Data?.total_tco2,
      scope2_tco2: scope2Data?.total_tco2,
      scope3_tco2: scope3Data?.total_tco2,
      dominant_scope: [
        { scope: "scope1", val: scope1Data?.total_tco2 ?? 0 },
        { scope: "scope2", val: scope2Data?.total_tco2 ?? 0 },
        { scope: "scope3", val: scope3Data?.total_tco2 ?? 0 },
      ].sort((a, b) => b.val - a.val)[0].scope,
    },
    intensity_metrics: {
      tco2_per_employee: Math.round((totalEmissions / employees) * 100) / 100,
      tco2_per_million_revenue: Math.round((totalEmissions / (revenue / 1000000)) * 10) / 10,
      kgco2_per_part: Math.round((totalEmissions * 1000 / partsProduced) * 100) / 100,
    },
    scope1: scope1Data,
    scope2: scope2Data,
    scope3: scope3Data,
    trends,
    compliance: {
      standard,
      reporting_completeness: scope.length === 3 ? "full" : "partial",
      verification_status: "self_reported",
      next_verification_due: "2026-06-30",
    },
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeCarbonFootprintAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "co2_calculate":
      return calculateCO2(params as unknown as CO2CalculateInput);
    case "co2_lifecycle":
      return lifecycleAssessment(params as unknown as LifecycleInput);
    case "co2_reduce":
      return generateReductions(params as unknown as ReduceInput);
    case "co2_report":
      return generateEmissionsReport(params as unknown as ReportInput);
    default:
      throw new Error(`CarbonFootprintEngine: unknown action "${action}"`);
  }
}
