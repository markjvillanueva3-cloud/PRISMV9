/**
 * ResourceOptimizationEngine — R23-MS4
 *
 * Optimizes energy usage per manufacturing process, recommends resource
 * allocation strategies, generates green manufacturing recommendations,
 * and verifies compliance with environmental sustainability standards.
 *
 * Actions:
 *   res_optimize — Optimize energy/resource usage for a process
 *   res_allocate — Resource allocation optimization across shop floor
 *   res_green    — Green manufacturing recommendations
 *   res_comply   — Environmental compliance verification
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OptimizeInput {
  machine_id?: string;
  operation?: string;
  material?: string;
  current_params?: Record<string, number>;
  objective?: "energy" | "cost" | "carbon" | "balanced";
  constraints?: Record<string, number>;
}

interface AllocateInput {
  facility?: string;
  machines?: string[];
  jobs?: { part_id: string; operation: string; priority: number; deadline_hours?: number }[];
  optimize_for?: "energy" | "throughput" | "carbon" | "cost";
  shift_hours?: number;
}

interface GreenInput {
  facility?: string;
  scope?: "process" | "facility" | "supply_chain" | "all";
  maturity_level?: "beginner" | "intermediate" | "advanced";
  industry?: string;
  include_roi?: boolean;
}

interface ComplyInput {
  facility?: string;
  standards?: string[];
  include_gaps?: boolean;
  include_action_plan?: boolean;
  region?: string;
}

// ---------------------------------------------------------------------------
// Seeded data — optimization baselines
// ---------------------------------------------------------------------------

interface ProcessBaseline {
  operation: string;
  energy_kwh_baseline: number;
  energy_kwh_optimized: number;
  co2_kg_baseline: number;
  co2_kg_optimized: number;
  cost_usd_baseline: number;
  cost_usd_optimized: number;
  optimization_levers: string[];
}

const PROCESS_BASELINES: ProcessBaseline[] = [
  { operation: "rough_turning", energy_kwh_baseline: 8.5, energy_kwh_optimized: 6.8, co2_kg_baseline: 3.28, co2_kg_optimized: 2.62, cost_usd_baseline: 0.81, cost_usd_optimized: 0.65, optimization_levers: ["adaptive_feed_rate", "high_efficiency_toolpath", "optimal_depth_of_cut"] },
  { operation: "finish_turning", energy_kwh_baseline: 4.2, energy_kwh_optimized: 3.5, co2_kg_baseline: 1.62, co2_kg_optimized: 1.35, cost_usd_baseline: 0.40, cost_usd_optimized: 0.33, optimization_levers: ["constant_chip_load", "optimized_surface_speed", "reduced_air_cutting"] },
  { operation: "rough_milling", energy_kwh_baseline: 12.0, energy_kwh_optimized: 9.0, co2_kg_baseline: 4.63, co2_kg_optimized: 3.47, cost_usd_baseline: 1.14, cost_usd_optimized: 0.86, optimization_levers: ["trochoidal_milling", "adaptive_feed", "high_efficiency_milling", "optimal_stepover"] },
  { operation: "finish_milling", energy_kwh_baseline: 5.5, energy_kwh_optimized: 4.2, co2_kg_baseline: 2.12, co2_kg_optimized: 1.62, cost_usd_baseline: 0.52, cost_usd_optimized: 0.40, optimization_levers: ["constant_engagement", "rest_machining", "optimized_lead_angle"] },
  { operation: "drilling", energy_kwh_baseline: 2.8, energy_kwh_optimized: 2.3, co2_kg_baseline: 1.08, co2_kg_optimized: 0.89, cost_usd_baseline: 0.27, cost_usd_optimized: 0.22, optimization_levers: ["peck_cycle_optimization", "through_tool_coolant", "optimal_point_geometry"] },
  { operation: "grinding", energy_kwh_baseline: 7.5, energy_kwh_optimized: 5.8, co2_kg_baseline: 2.90, co2_kg_optimized: 2.24, cost_usd_baseline: 0.71, cost_usd_optimized: 0.55, optimization_levers: ["continuous_dressing", "optimal_wheel_speed", "creep_feed_vs_reciprocating"] },
  { operation: "heat_treatment", energy_kwh_baseline: 45.0, energy_kwh_optimized: 36.0, co2_kg_baseline: 17.37, co2_kg_optimized: 13.90, cost_usd_baseline: 4.28, cost_usd_optimized: 3.42, optimization_levers: ["batch_optimization", "insulation_upgrade", "waste_heat_recovery", "shorter_cycle_validation"] },
  { operation: "surface_treatment", energy_kwh_baseline: 15.0, energy_kwh_optimized: 12.5, co2_kg_baseline: 5.79, co2_kg_optimized: 4.83, cost_usd_baseline: 1.43, cost_usd_optimized: 1.19, optimization_levers: ["bath_life_extension", "drag_out_reduction", "rinse_water_recycling"] },
];

// Machine energy efficiency ratings
const MACHINE_EFFICIENCY: Record<string, { current_efficiency: number; best_in_class: number; age_years: number }> = {
  cnc_3axis_01: { current_efficiency: 0.72, best_in_class: 0.88, age_years: 8 },
  cnc_5axis_01: { current_efficiency: 0.78, best_in_class: 0.91, age_years: 4 },
  cnc_5axis_02: { current_efficiency: 0.80, best_in_class: 0.91, age_years: 2 },
  cnc_lathe_01: { current_efficiency: 0.70, best_in_class: 0.86, age_years: 10 },
  cnc_lathe_02: { current_efficiency: 0.75, best_in_class: 0.86, age_years: 5 },
  cnc_grinder_01: { current_efficiency: 0.68, best_in_class: 0.84, age_years: 12 },
  cnc_edm_01: { current_efficiency: 0.65, best_in_class: 0.82, age_years: 7 },
  furnace_01: { current_efficiency: 0.60, best_in_class: 0.85, age_years: 15 },
  plating_line_01: { current_efficiency: 0.62, best_in_class: 0.80, age_years: 9 },
};

// Environmental standards database
interface EnvironmentalStandard {
  id: string;
  name: string;
  scope: string;
  requirements: string[];
  documentation: string[];
  audit_frequency: string;
}

const ENV_STANDARDS: EnvironmentalStandard[] = [
  { id: "ISO_14001", name: "ISO 14001:2015 Environmental Management", scope: "EMS framework", requirements: ["Environmental policy", "Aspects & impacts assessment", "Legal compliance register", "Objectives & targets", "Operational controls", "Emergency preparedness", "Monitoring & measurement", "Internal audit program", "Management review"], documentation: ["Environmental manual", "Procedures", "Work instructions", "Records"], audit_frequency: "annual" },
  { id: "ISO_50001", name: "ISO 50001:2018 Energy Management", scope: "Energy performance", requirements: ["Energy policy", "Energy review", "Energy baseline", "Energy performance indicators", "Action plans", "Operational controls", "Procurement spec", "Monitoring plan"], documentation: ["Energy manual", "Energy data records", "Action plans", "Audit reports"], audit_frequency: "annual" },
  { id: "EMAS", name: "EU Eco-Management and Audit Scheme", scope: "EU environmental excellence", requirements: ["Environmental review", "Environmental policy", "EMS implementation", "Environmental audit", "Environmental statement", "Third-party verification", "Public disclosure", "Continuous improvement"], documentation: ["Environmental statement", "Validation certificate", "Audit reports", "Improvement plans"], audit_frequency: "annual" },
  { id: "EPA_TRI", name: "EPA Toxic Release Inventory", scope: "US chemical reporting", requirements: ["Chemical inventory", "Release tracking", "Waste management", "Threshold determination", "Form R submission", "Pollution prevention"], documentation: ["Form R", "Chemical inventory", "Release calculations", "Waste manifests"], audit_frequency: "annual" },
  { id: "REACH", name: "EU REACH Regulation", scope: "Chemical safety", requirements: ["Substance registration", "Safety data sheets", "Candidate list screening", "Authorization tracking", "Restriction compliance", "Supply chain communication"], documentation: ["Safety data sheets", "Registration dossiers", "SCIP notifications", "Compliance declarations"], audit_frequency: "continuous" },
  { id: "RoHS", name: "EU RoHS Directive", scope: "Hazardous substances", requirements: ["Restricted substance testing", "Declaration of conformity", "Technical documentation", "Supply chain due diligence", "Material declarations"], documentation: ["Test reports", "Declarations", "Material composition data"], audit_frequency: "per_product" },
  { id: "ISO_14064", name: "ISO 14064 GHG Accounting", scope: "Greenhouse gas", requirements: ["GHG inventory", "Quantification methodology", "Uncertainty assessment", "Quality management", "Reporting", "Third-party verification"], documentation: ["GHG inventory report", "Methodology documentation", "Verification statement"], audit_frequency: "annual" },
  { id: "SBTi", name: "Science Based Targets initiative", scope: "Climate targets", requirements: ["Near-term target setting", "Long-term target setting", "Scope 1+2 coverage", "Scope 3 assessment", "Annual progress reporting", "Target validation"], documentation: ["Target submission", "Progress reports", "Methodology documentation"], audit_frequency: "annual" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

function getBaseline(op: string): ProcessBaseline {
  return PROCESS_BASELINES.find((b) => op.includes(b.operation) || b.operation.includes(op)) ?? PROCESS_BASELINES[0];
}

// ---------------------------------------------------------------------------
// res_optimize — Optimize energy/resources for a process
// ---------------------------------------------------------------------------

function optimizeResources(input: OptimizeInput) {
  const {
    machine_id = "cnc_5axis_01",
    operation = "rough_milling",
    material = "steel_4140",
    objective = "balanced",
  } = input;

  const baseline = getBaseline(operation);
  const machineEff = MACHINE_EFFICIENCY[machine_id] ?? { current_efficiency: 0.72, best_in_class: 0.88, age_years: 8 };
  const seed = hashStr(machine_id + operation);

  // Material-specific adjustment
  const hardMaterials = ["titanium", "inconel", "hastelloy"];
  const isHard = hardMaterials.some((m) => material.toLowerCase().includes(m));
  const materialFactor = isHard ? 1.35 : 1.0;

  // Calculate current and optimized states
  const currentEnergy = baseline.energy_kwh_baseline * materialFactor / machineEff.current_efficiency;
  const optimizedEnergy = baseline.energy_kwh_optimized * materialFactor / machineEff.best_in_class;

  const currentCO2 = baseline.co2_kg_baseline * materialFactor;
  const optimizedCO2 = baseline.co2_kg_optimized * materialFactor * 0.85; // renewable mix benefit

  const currentCost = baseline.cost_usd_baseline * materialFactor;
  const optimizedCost = baseline.cost_usd_optimized * materialFactor;

  // Weight objectives
  const weights = {
    energy: objective === "energy" ? 0.6 : objective === "balanced" ? 0.33 : 0.2,
    carbon: objective === "carbon" ? 0.6 : objective === "balanced" ? 0.33 : 0.2,
    cost: objective === "cost" ? 0.6 : objective === "balanced" ? 0.34 : 0.2,
  };

  // Generate specific recommendations
  const recommendations = baseline.optimization_levers.map((lever, idx) => {
    const energySaving = (currentEnergy - optimizedEnergy) * (0.2 + ((seed + idx) % 30) / 100) / baseline.optimization_levers.length;
    const co2Saving = (currentCO2 - optimizedCO2) * (0.2 + ((seed + idx * 3) % 30) / 100) / baseline.optimization_levers.length;
    return {
      lever: lever.replace(/_/g, " "),
      energy_saving_kwh: Math.round(energySaving * 1000) / 1000,
      co2_saving_kg: Math.round(co2Saving * 1000) / 1000,
      implementation_effort: idx < 2 ? "low" : idx < 4 ? "medium" : "high",
      priority: idx < 2 ? "high" : idx < 4 ? "medium" : "low",
    };
  });

  const totalSavingKwh = currentEnergy - optimizedEnergy;
  const totalSavingCO2 = currentCO2 - optimizedCO2;
  const totalSavingCost = currentCost - optimizedCost;

  return {
    machine_id,
    operation,
    material,
    objective,
    weights,
    current_state: {
      energy_kwh: Math.round(currentEnergy * 1000) / 1000,
      co2_kg: Math.round(currentCO2 * 1000) / 1000,
      cost_usd: Math.round(currentCost * 1000) / 1000,
      machine_efficiency: machineEff.current_efficiency,
    },
    optimized_state: {
      energy_kwh: Math.round(optimizedEnergy * 1000) / 1000,
      co2_kg: Math.round(optimizedCO2 * 1000) / 1000,
      cost_usd: Math.round(optimizedCost * 1000) / 1000,
      target_efficiency: machineEff.best_in_class,
    },
    savings: {
      energy_kwh: Math.round(totalSavingKwh * 1000) / 1000,
      energy_pct: Math.round((totalSavingKwh / currentEnergy) * 1000) / 10,
      co2_kg: Math.round(totalSavingCO2 * 1000) / 1000,
      co2_pct: Math.round((totalSavingCO2 / currentCO2) * 1000) / 10,
      cost_usd: Math.round(totalSavingCost * 1000) / 1000,
      cost_pct: Math.round((totalSavingCost / currentCost) * 1000) / 10,
    },
    recommendations,
    machine_upgrade: machineEff.age_years > 10
      ? { recommendation: "Consider machine replacement — current unit exceeds 10 years", efficiency_gap: Math.round((machineEff.best_in_class - machineEff.current_efficiency) * 100) }
      : machineEff.age_years > 7
        ? { recommendation: "Schedule major overhaul — retrofit with IE4 motors and modern controls", efficiency_gap: Math.round((machineEff.best_in_class - machineEff.current_efficiency) * 100) }
        : { recommendation: "Machine in good condition — focus on process optimization", efficiency_gap: Math.round((machineEff.best_in_class - machineEff.current_efficiency) * 100) },
  };
}

// ---------------------------------------------------------------------------
// res_allocate — Resource allocation optimization
// ---------------------------------------------------------------------------

function allocateResources(input: AllocateInput) {
  const {
    facility = "main_shop",
    machines = Object.keys(MACHINE_EFFICIENCY),
    jobs = [
      { part_id: "PART-001", operation: "rough_milling", priority: 1, deadline_hours: 8 },
      { part_id: "PART-002", operation: "finish_turning", priority: 2, deadline_hours: 12 },
      { part_id: "PART-003", operation: "heat_treatment", priority: 1, deadline_hours: 24 },
      { part_id: "PART-004", operation: "grinding", priority: 3, deadline_hours: 16 },
      { part_id: "PART-005", operation: "rough_turning", priority: 2, deadline_hours: 6 },
      { part_id: "PART-006", operation: "finish_milling", priority: 1, deadline_hours: 10 },
    ],
    optimize_for = "energy",
    shift_hours = 8,
  } = input;

  const seed = hashStr(facility);

  // Score each machine-job pair
  interface Assignment {
    job: { part_id: string; operation: string; priority: number; deadline_hours?: number };
    machine_id: string;
    energy_kwh: number;
    duration_hours: number;
    co2_kg: number;
    score: number;
  }

  const assignments: Assignment[] = [];
  const usedMachines = new Set<string>();

  // Sort jobs by priority then deadline
  const sortedJobs = [...jobs].sort((a, b) => a.priority - b.priority || (a.deadline_hours ?? 99) - (b.deadline_hours ?? 99));

  for (const job of sortedJobs) {
    const baseline = getBaseline(job.operation);

    // Find best available machine for this job
    let bestAssignment: Assignment | null = null;

    for (const machineId of machines) {
      if (usedMachines.has(machineId)) continue;

      const eff = MACHINE_EFFICIENCY[machineId] ?? { current_efficiency: 0.72, best_in_class: 0.88, age_years: 8 };
      const energy = baseline.energy_kwh_baseline / eff.current_efficiency;
      const duration = (baseline.energy_kwh_baseline / 15) + ((seed + hashStr(machineId)) % 10) / 10; // hours
      const co2 = baseline.co2_kg_baseline;

      // Score based on objective
      let score: number;
      if (optimize_for === "energy") score = 1 / energy;
      else if (optimize_for === "carbon") score = 1 / co2;
      else if (optimize_for === "throughput") score = 1 / duration;
      else score = 1 / (energy * 0.095 + co2 * 0.1); // cost proxy

      if (!bestAssignment || score > bestAssignment.score) {
        bestAssignment = {
          job,
          machine_id: machineId,
          energy_kwh: Math.round(energy * 100) / 100,
          duration_hours: Math.round(duration * 100) / 100,
          co2_kg: Math.round(co2 * 100) / 100,
          score: Math.round(score * 10000) / 10000,
        };
      }
    }

    if (bestAssignment) {
      assignments.push(bestAssignment);
      usedMachines.add(bestAssignment.machine_id);
    }
  }

  const totalEnergy = assignments.reduce((s, a) => s + a.energy_kwh, 0);
  const totalCO2 = assignments.reduce((s, a) => s + a.co2_kg, 0);
  const totalDuration = Math.max(...assignments.map((a) => a.duration_hours), 0);
  const utilization = assignments.length / machines.length;

  return {
    facility,
    optimize_for,
    shift_hours,
    generated_at: new Date().toISOString(),
    summary: {
      jobs_allocated: assignments.length,
      jobs_total: jobs.length,
      machines_used: usedMachines.size,
      machines_available: machines.length,
      utilization_pct: Math.round(utilization * 1000) / 10,
      total_energy_kwh: Math.round(totalEnergy * 100) / 100,
      total_co2_kg: Math.round(totalCO2 * 100) / 100,
      makespan_hours: Math.round(totalDuration * 100) / 100,
      fits_in_shift: totalDuration <= shift_hours,
    },
    schedule: assignments.map((a) => ({
      part_id: a.job.part_id,
      operation: a.job.operation,
      machine_id: a.machine_id,
      priority: a.job.priority,
      energy_kwh: a.energy_kwh,
      duration_hours: a.duration_hours,
      co2_kg: a.co2_kg,
      deadline_hours: a.job.deadline_hours,
      on_time: a.duration_hours <= (a.job.deadline_hours ?? 99),
    })),
    idle_machines: machines.filter((m) => !usedMachines.has(m)),
    recommendations: [
      ...(utilization < 0.6 ? ["Low machine utilization — consider consolidating jobs or batch scheduling"] : []),
      ...(assignments.some((a) => !a.job.deadline_hours || a.duration_hours > a.job.deadline_hours) ? ["Some jobs may miss deadlines — consider parallel processing or overtime"] : []),
      optimize_for === "energy" ? "Energy-optimized schedule active — jobs routed to most efficient machines" : `Schedule optimized for ${optimize_for}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// res_green — Green manufacturing recommendations
// ---------------------------------------------------------------------------

function greenRecommendations(input: GreenInput) {
  const {
    facility = "main_shop",
    scope = "all",
    maturity_level = "intermediate",
    industry = "precision_machining",
    include_roi = true,
  } = input;

  const seed = hashStr(facility);

  // Green manufacturing recommendations by scope
  interface GreenRec {
    id: string;
    scope: string;
    category: string;
    title: string;
    description: string;
    maturity: "beginner" | "intermediate" | "advanced";
    impact_level: "high" | "medium" | "low";
    co2_reduction_pct: number;
    implementation_cost_usd: number;
    annual_savings_usd: number;
    payback_years: number;
  }

  const allRecs: GreenRec[] = [
    // Process scope
    { id: "GR-001", scope: "process", category: "machining", title: "Minimum Quantity Lubrication (MQL)", description: "Replace flood coolant with MQL — reduces coolant waste by 95%, energy for coolant pumping by 80%", maturity: "beginner", impact_level: "high", co2_reduction_pct: 3.5, implementation_cost_usd: 15000, annual_savings_usd: 8000, payback_years: 1.9 },
    { id: "GR-002", scope: "process", category: "machining", title: "Cryogenic machining for titanium/Inconel", description: "LN2 cooling eliminates cutting fluid for difficult materials, improves tool life 200-400%", maturity: "advanced", impact_level: "medium", co2_reduction_pct: 2.0, implementation_cost_usd: 45000, annual_savings_usd: 12000, payback_years: 3.75 },
    { id: "GR-003", scope: "process", category: "tooling", title: "Extended tool life coatings (AlTiN, TiSiN)", description: "Advanced PVD coatings extend tool life 50-150%, reducing tool consumption and associated carbon", maturity: "intermediate", impact_level: "medium", co2_reduction_pct: 1.5, implementation_cost_usd: 8000, annual_savings_usd: 5000, payback_years: 1.6 },
    { id: "GR-004", scope: "process", category: "parameters", title: "AI-optimized cutting parameters", description: "Machine learning models optimize speed/feed per material to minimize energy while maintaining quality", maturity: "advanced", impact_level: "high", co2_reduction_pct: 4.0, implementation_cost_usd: 80000, annual_savings_usd: 25000, payback_years: 3.2 },
    // Facility scope
    { id: "GR-005", scope: "facility", category: "energy", title: "Solar PV rooftop installation", description: "25-50 kWp rooftop solar covering 15-30% of electricity demand", maturity: "intermediate", impact_level: "high", co2_reduction_pct: 8.0, implementation_cost_usd: 60000, annual_savings_usd: 15000, payback_years: 4.0 },
    { id: "GR-006", scope: "facility", category: "energy", title: "Power factor correction", description: "Install capacitor banks to improve power factor from 0.82 to 0.95+, reducing reactive power charges", maturity: "beginner", impact_level: "medium", co2_reduction_pct: 1.0, implementation_cost_usd: 12000, annual_savings_usd: 4000, payback_years: 3.0 },
    { id: "GR-007", scope: "facility", category: "hvac", title: "Heat recovery from compressors", description: "Capture waste heat from air compressors for space/water heating — typical 70-90% heat recovery", maturity: "intermediate", impact_level: "medium", co2_reduction_pct: 2.5, implementation_cost_usd: 20000, annual_savings_usd: 6000, payback_years: 3.3 },
    { id: "GR-008", scope: "facility", category: "lighting", title: "Smart LED + occupancy sensors", description: "Replace HID/fluorescent with LED + motion sensors in shop floor and offices", maturity: "beginner", impact_level: "low", co2_reduction_pct: 1.2, implementation_cost_usd: 10000, annual_savings_usd: 5500, payback_years: 1.8 },
    // Supply chain scope
    { id: "GR-009", scope: "supply_chain", category: "materials", title: "Green steel procurement (EAF-sourced)", description: "Switch to electric arc furnace steel — 75% lower CO2 than blast furnace steel", maturity: "intermediate", impact_level: "high", co2_reduction_pct: 6.0, implementation_cost_usd: 5000, annual_savings_usd: -2000, payback_years: 0 },
    { id: "GR-010", scope: "supply_chain", category: "logistics", title: "Supplier consolidation + local sourcing", description: "Reduce transport emissions by consolidating suppliers and prioritizing local sources within 200km", maturity: "beginner", impact_level: "medium", co2_reduction_pct: 1.8, implementation_cost_usd: 3000, annual_savings_usd: 4000, payback_years: 0.75 },
    { id: "GR-011", scope: "supply_chain", category: "packaging", title: "Returnable packaging program", description: "Replace single-use with reusable containers for inbound material deliveries", maturity: "beginner", impact_level: "low", co2_reduction_pct: 0.8, implementation_cost_usd: 8000, annual_savings_usd: 3000, payback_years: 2.7 },
    { id: "GR-012", scope: "supply_chain", category: "circular", title: "Closed-loop chip-to-billet recycling", description: "Partner with mini-mill to convert chips back to usable bar stock for low-criticality parts", maturity: "advanced", impact_level: "high", co2_reduction_pct: 5.0, implementation_cost_usd: 25000, annual_savings_usd: 10000, payback_years: 2.5 },
  ];

  // Filter by scope and maturity
  let filtered = allRecs;
  if (scope !== "all") filtered = filtered.filter((r) => r.scope === scope);
  const maturityOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  filtered = filtered.filter((r) => maturityOrder[r.maturity] <= maturityOrder[maturity_level]);

  // Sort by impact
  filtered.sort((a, b) => b.co2_reduction_pct - a.co2_reduction_pct);

  const totalReduction = filtered.reduce((s, r) => s + r.co2_reduction_pct, 0);
  const totalCost = filtered.reduce((s, r) => s + r.implementation_cost_usd, 0);
  const totalSavings = filtered.reduce((s, r) => s + Math.max(0, r.annual_savings_usd), 0);

  return {
    facility,
    scope,
    maturity_level,
    industry,
    generated_at: new Date().toISOString(),
    summary: {
      recommendations_count: filtered.length,
      total_co2_reduction_pct: Math.round(totalReduction * 10) / 10,
      total_implementation_cost_usd: totalCost,
      total_annual_savings_usd: totalSavings,
      portfolio_payback_years: totalSavings > 0 ? Math.round((totalCost / totalSavings) * 10) / 10 : 0,
      quick_wins: filtered.filter((r) => r.payback_years < 2 && r.payback_years > 0).length,
    },
    recommendations: filtered.map((r) => ({
      ...r,
      co2_reduction_pct: Math.round(r.co2_reduction_pct * 10) / 10,
      ...(include_roi
        ? {
            roi_5yr_pct: r.implementation_cost_usd > 0
              ? Math.round(((r.annual_savings_usd * 5 - r.implementation_cost_usd) / r.implementation_cost_usd) * 100)
              : 0,
            net_present_value_5yr: Math.round(r.annual_savings_usd * 4.2 - r.implementation_cost_usd), // ~5% discount
          }
        : {}),
    })),
    implementation_roadmap: {
      phase_1_quick_wins: filtered.filter((r) => r.maturity === "beginner" && r.payback_years < 3).map((r) => r.id),
      phase_2_core: filtered.filter((r) => r.maturity === "intermediate").map((r) => r.id),
      phase_3_advanced: filtered.filter((r) => r.maturity === "advanced").map((r) => r.id),
    },
  };
}

// ---------------------------------------------------------------------------
// res_comply — Environmental compliance verification
// ---------------------------------------------------------------------------

function verifyCompliance(input: ComplyInput) {
  const {
    facility = "main_shop",
    standards = ["ISO_14001", "ISO_50001", "ISO_14064"],
    include_gaps = true,
    include_action_plan = true,
    region = "US",
  } = input;

  const seed = hashStr(facility);

  const results = standards.map((stdId) => {
    const std = ENV_STANDARDS.find((s) => s.id === stdId);
    if (!std) return { standard: stdId, status: "unknown", message: `Standard '${stdId}' not in database` };

    // Simulate compliance status per requirement
    const reqResults = std.requirements.map((req, idx) => {
      const isCompliant = ((seed + idx * 17) % 10) > 2; // ~70% compliance
      const evidence = isCompliant ? "documented" : ((seed + idx) % 3) === 0 ? "partial" : "missing";
      return {
        requirement: req,
        status: isCompliant ? "compliant" : "non_compliant",
        evidence,
        last_reviewed: new Date(Date.now() - ((seed + idx) % 180) * 86400000).toISOString().slice(0, 10),
      };
    });

    const compliantCount = reqResults.filter((r) => r.status === "compliant").length;
    const totalReqs = reqResults.length;
    const compliancePct = Math.round((compliantCount / totalReqs) * 1000) / 10;

    // Gap analysis
    const gaps = include_gaps
      ? reqResults
          .filter((r) => r.status === "non_compliant")
          .map((r) => ({
            requirement: r.requirement,
            evidence_status: r.evidence,
            severity: r.evidence === "missing" ? "high" : "medium",
            estimated_effort: r.evidence === "missing" ? "2-4 weeks" : "1-2 weeks",
          }))
      : undefined;

    // Action plan
    const actions = include_action_plan && gaps && gaps.length > 0
      ? gaps.map((g, idx) => ({
          action_id: `ACT-${stdId}-${String(idx + 1).padStart(2, "0")}`,
          requirement: g.requirement,
          action: g.evidence_status === "missing"
            ? `Develop and implement ${g.requirement.toLowerCase()} documentation`
            : `Complete and formalize existing ${g.requirement.toLowerCase()} records`,
          responsible: idx % 2 === 0 ? "EHS_Manager" : "Quality_Manager",
          target_date: new Date(Date.now() + (idx + 1) * 14 * 86400000).toISOString().slice(0, 10),
          priority: g.severity,
        }))
      : undefined;

    let overallStatus: string;
    if (compliancePct >= 95) overallStatus = "certified";
    else if (compliancePct >= 80) overallStatus = "partially_compliant";
    else if (compliancePct >= 60) overallStatus = "in_progress";
    else overallStatus = "non_compliant";

    return {
      standard: stdId,
      name: std.name,
      scope: std.scope,
      overall_status: overallStatus,
      compliance_pct: compliancePct,
      requirements_met: compliantCount,
      requirements_total: totalReqs,
      audit_frequency: std.audit_frequency,
      next_audit_due: new Date(Date.now() + ((seed % 180) + 30) * 86400000).toISOString().slice(0, 10),
      documentation_required: std.documentation,
      requirement_details: reqResults,
      gaps,
      action_plan: actions,
    };
  });

  const avgCompliance = results.reduce((s, r: any) => s + (r.compliance_pct ?? 0), 0) / results.length;
  const certified = results.filter((r: any) => r.overall_status === "certified").length;
  const totalGaps = results.reduce((s, r: any) => s + (r.gaps?.length ?? 0), 0);

  return {
    facility,
    region,
    generated_at: new Date().toISOString(),
    summary: {
      standards_assessed: results.length,
      certified: certified,
      partially_compliant: results.filter((r: any) => r.overall_status === "partially_compliant").length,
      non_compliant: results.filter((r: any) => r.overall_status === "non_compliant" || r.overall_status === "in_progress").length,
      avg_compliance_pct: Math.round(avgCompliance * 10) / 10,
      total_gaps: totalGaps,
      estimated_remediation_weeks: totalGaps * 2,
    },
    standards: results,
    recommendations: [
      ...(avgCompliance < 80 ? ["Overall compliance below 80% — prioritize gap closure before next audit cycle"] : []),
      ...(totalGaps > 10 ? [`${totalGaps} compliance gaps identified — assign dedicated EHS resource for remediation`] : []),
      certified === results.length ? "All assessed standards certified — maintain through regular internal audits" : `${results.length - certified} standard(s) need attention before certification`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeResourceOptimizationAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "res_optimize":
      return optimizeResources(params as unknown as OptimizeInput);
    case "res_allocate":
      return allocateResources(params as unknown as AllocateInput);
    case "res_green":
      return greenRecommendations(params as unknown as GreenInput);
    case "res_comply":
      return verifyCompliance(params as unknown as ComplyInput);
    default:
      throw new Error(`ResourceOptimizationEngine: unknown action "${action}"`);
  }
}
