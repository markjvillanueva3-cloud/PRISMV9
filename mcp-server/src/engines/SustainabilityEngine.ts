/**
 * SustainabilityEngine.ts — R10-Rev8
 * ====================================
 * Adds sustainability as a first-class optimization objective.
 * Green mode optimization, near-net-shape analysis, coolant lifecycle,
 * energy tracking, and carbon footprint per part.
 *
 * Key capabilities:
 *   - Standard vs Green mode parameter comparison
 *   - Energy consumption estimation per operation
 *   - Carbon footprint calculation
 *   - MQL/dry machining recommendation
 *   - Near-net-shape blank analysis
 *   - Coolant lifecycle optimization
 *   - Chip waste minimization
 *
 * 10 dispatcher actions:
 *   sustain_optimize, sustain_compare, sustain_energy, sustain_carbon,
 *   sustain_coolant, sustain_nearnet, sustain_report, sustain_materials,
 *   sustain_history, sustain_get
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type OptimizationMode = "standard" | "green" | "ultra_green";
export type CoolantStrategy = "flood" | "mql" | "dry" | "cryogenic";
export type StockType = "bar" | "plate" | "forging" | "casting" | "additive" | "billet";

export interface EnergyBreakdown {
  cutting_kwh: number;
  spindle_idle_kwh: number;
  rapid_move_kwh: number;
  coolant_pump_kwh: number;
  compressed_air_kwh: number;
  total_kwh: number;
}

export interface CarbonBreakdown {
  machining_kg_co2: number;
  coolant_kg_co2: number;
  tool_wear_kg_co2: number;
  chip_disposal_kg_co2: number;
  total_kg_co2: number;
}

export interface SustainabilityResult {
  optimization_id: string;
  mode: OptimizationMode;
  material: string;
  operation: string;
  standard: OperationMetrics;
  green: OperationMetrics;
  savings: SavingsMetrics;
  recommendations: string[];
}

export interface OperationMetrics {
  cost_per_part_usd: number;
  cycle_time_min: number;
  energy: EnergyBreakdown;
  carbon: CarbonBreakdown;
  coolant_strategy: CoolantStrategy;
  coolant_liters_per_part: number;
  chip_weight_g: number;
  tool_life_min: number;
  mrr_cm3_min: number;
}

export interface SavingsMetrics {
  cost_delta_usd: number;
  cost_delta_pct: number;
  energy_saved_kwh: number;
  energy_saved_pct: number;
  carbon_saved_kg: number;
  carbon_saved_pct: number;
  coolant_saved_liters: number;
  coolant_saved_pct: number;
  chip_saved_g: number;
  chip_saved_pct: number;
  tool_life_gained_pct: number;
}

export interface NearNetShapeResult {
  analysis_id: string;
  material: string;
  finished_weight_g: number;
  stock_options: StockOption[];
  recommendation: string;
  best_option: string;
}

export interface StockOption {
  stock_type: StockType;
  raw_weight_g: number;
  material_utilization_pct: number;
  blank_cost_usd: number;
  machining_cost_usd: number;
  total_cost_usd: number;
  chip_weight_g: number;
  machining_time_min: number;
  carbon_footprint_kg: number;
  feasibility: string;
}

export interface CoolantAnalysis {
  current_type: string;
  recommended_type: string;
  current_life_months: number;
  recommended_life_months: number;
  annual_cost_current_usd: number;
  annual_cost_recommended_usd: number;
  annual_savings_usd: number;
  disposal_cost_reduction_pct: number;
  environmental_benefit: string;
}

// ─── Material Sustainability Profiles ───────────────────────────────────────

interface MaterialSustainProfile {
  name: string;
  density_g_cm3: number;
  specific_cutting_energy_j_cm3: number;  // Energy per cm³ of material removed
  mql_suitable: boolean;
  dry_suitable: boolean;
  cryogenic_benefit: boolean;
  chip_recyclability_pct: number;
  typical_coolant: CoolantStrategy;
  green_coolant: CoolantStrategy;
  vc_standard_m_min: number;
  vc_green_m_min: number;       // Slightly lower Vc for longer tool life
  fz_standard_mm: number;
  fz_green_mm: number;
  tool_life_standard_min: number;
  tool_life_green_min: number;  // Longer life with green parameters
  carbon_intensity_kg_per_kg: number;  // CO2 to produce 1 kg of raw material
}

const MATERIAL_PROFILES: Record<string, MaterialSustainProfile> = {
  aluminum: {
    name: "Aluminum 7075-T6",
    density_g_cm3: 2.81,
    specific_cutting_energy_j_cm3: 800,
    mql_suitable: true,
    dry_suitable: true,
    cryogenic_benefit: false,
    chip_recyclability_pct: 95,
    typical_coolant: "flood",
    green_coolant: "mql",
    vc_standard_m_min: 300,
    vc_green_m_min: 250,
    fz_standard_mm: 0.15,
    fz_green_mm: 0.12,
    tool_life_standard_min: 60,
    tool_life_green_min: 90,
    carbon_intensity_kg_per_kg: 8.24,
  },
  steel: {
    name: "AISI 4140 Steel",
    density_g_cm3: 7.85,
    specific_cutting_energy_j_cm3: 2200,
    mql_suitable: true,
    dry_suitable: false,
    cryogenic_benefit: false,
    chip_recyclability_pct: 90,
    typical_coolant: "flood",
    green_coolant: "mql",
    vc_standard_m_min: 200,
    vc_green_m_min: 170,
    fz_standard_mm: 0.12,
    fz_green_mm: 0.10,
    tool_life_standard_min: 45,
    tool_life_green_min: 65,
    carbon_intensity_kg_per_kg: 1.85,
  },
  stainless: {
    name: "304 Stainless Steel",
    density_g_cm3: 8.0,
    specific_cutting_energy_j_cm3: 2800,
    mql_suitable: false,
    dry_suitable: false,
    cryogenic_benefit: true,
    chip_recyclability_pct: 85,
    typical_coolant: "flood",
    green_coolant: "cryogenic",
    vc_standard_m_min: 150,
    vc_green_m_min: 130,
    fz_standard_mm: 0.10,
    fz_green_mm: 0.08,
    tool_life_standard_min: 30,
    tool_life_green_min: 45,
    carbon_intensity_kg_per_kg: 5.0,
  },
  titanium: {
    name: "Ti-6Al-4V",
    density_g_cm3: 4.43,
    specific_cutting_energy_j_cm3: 3500,
    mql_suitable: false,
    dry_suitable: false,
    cryogenic_benefit: true,
    chip_recyclability_pct: 80,
    typical_coolant: "flood",
    green_coolant: "cryogenic",
    vc_standard_m_min: 60,
    vc_green_m_min: 50,
    fz_standard_mm: 0.08,
    fz_green_mm: 0.06,
    tool_life_standard_min: 25,
    tool_life_green_min: 40,
    carbon_intensity_kg_per_kg: 36.0,
  },
  inconel: {
    name: "Inconel 718",
    density_g_cm3: 8.19,
    specific_cutting_energy_j_cm3: 4000,
    mql_suitable: false,
    dry_suitable: false,
    cryogenic_benefit: true,
    chip_recyclability_pct: 75,
    typical_coolant: "flood",
    green_coolant: "cryogenic",
    vc_standard_m_min: 40,
    vc_green_m_min: 35,
    fz_standard_mm: 0.06,
    fz_green_mm: 0.05,
    tool_life_standard_min: 20,
    tool_life_green_min: 30,
    carbon_intensity_kg_per_kg: 12.0,
  },
  cast_iron: {
    name: "Gray Cast Iron FC250",
    density_g_cm3: 7.2,
    specific_cutting_energy_j_cm3: 1500,
    mql_suitable: true,
    dry_suitable: true,
    cryogenic_benefit: false,
    chip_recyclability_pct: 95,
    typical_coolant: "flood",
    green_coolant: "dry",
    vc_standard_m_min: 180,
    vc_green_m_min: 150,
    fz_standard_mm: 0.15,
    fz_green_mm: 0.12,
    tool_life_standard_min: 50,
    tool_life_green_min: 70,
    carbon_intensity_kg_per_kg: 1.91,
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const GRID_CO2_KG_PER_KWH = 0.42;   // Average US grid
const COOLANT_CO2_PER_LITER = 0.15;  // Production + disposal
const TOOL_CO2_PER_INSERT = 0.5;     // Carbide insert production
const CHIP_CO2_PER_KG = 0.05;        // Transport + recycling
const SHOP_RATE_USD_PER_HR = 185;

// ─── Calculation Functions ──────────────────────────────────────────────────

function findProfile(material: string): MaterialSustainProfile | undefined {
  const key = material.toLowerCase();
  if (key.includes("alum") || key.includes("7075") || key.includes("6061")) return MATERIAL_PROFILES.aluminum;
  if (key.includes("4140") || key === "steel") return MATERIAL_PROFILES.steel;
  if (key.includes("304") || key.includes("stainless") || key.includes("17-4")) return MATERIAL_PROFILES.stainless;
  if (key.includes("ti") || key.includes("titanium")) return MATERIAL_PROFILES.titanium;
  if (key.includes("inconel") || key.includes("718")) return MATERIAL_PROFILES.inconel;
  if (key.includes("cast") || key.includes("fc250")) return MATERIAL_PROFILES.cast_iron;
  return undefined;
}

function calculateOperationMetrics(
  profile: MaterialSustainProfile,
  mode: OptimizationMode,
  tool_diameter_mm: number,
  depth_mm: number,
  width_mm: number,
  length_mm: number,
): OperationMetrics {
  const isGreen = mode !== "standard";
  const isUltra = mode === "ultra_green";

  const vc = isGreen ? profile.vc_green_m_min * (isUltra ? 0.85 : 1) : profile.vc_standard_m_min;
  const fz = isGreen ? profile.fz_green_mm * (isUltra ? 0.85 : 1) : profile.fz_standard_mm;
  const flutes = 4;
  const ap = depth_mm;
  const ae = Math.min(width_mm, tool_diameter_mm * (isUltra ? 0.35 : 0.5));

  // MRR
  const rpm = (vc * 1000) / (Math.PI * tool_diameter_mm);
  const feed_mm_min = fz * flutes * rpm;
  const mrr = (ap * ae * feed_mm_min) / 1000; // cm³/min

  // Volume to remove
  const volume_cm3 = (depth_mm * width_mm * length_mm) / 1000;
  const cutting_time_min = volume_cm3 / Math.max(mrr, 0.1);
  const cycle_time_min = cutting_time_min * 1.3; // Add rapid + tool change overhead

  // Chip weight
  const chip_weight_g = volume_cm3 * profile.density_g_cm3;

  // Energy — realistic power draw per subsystem
  const cutting_energy = (profile.specific_cutting_energy_j_cm3 * volume_cm3) / 3600000; // kWh
  const spindle_power_factor = isGreen ? (isUltra ? 0.6 : 0.75) : 1.0; // Lower RPM = less idle power
  const spindle_idle = cycle_time_min * 0.005 * spindle_power_factor;
  const rapid_energy = cycle_time_min * 0.002;
  const coolant_strategy = isGreen ? profile.green_coolant : profile.typical_coolant;
  const coolant_pump = coolant_strategy === "flood" ? cycle_time_min * 0.025   // 1.5 kW high-pressure pump + chiller
    : coolant_strategy === "mql" ? cycle_time_min * 0.001                      // 0.06 kW minimal pump
    : coolant_strategy === "cryogenic" ? cycle_time_min * 0.008                // 0.48 kW LN2 delivery
    : 0;                                                                        // dry
  const compressed_air = coolant_strategy === "mql" ? cycle_time_min * 0.003
    : coolant_strategy === "dry" ? cycle_time_min * 0.001
    : 0;
  const total_kwh = cutting_energy + spindle_idle + rapid_energy + coolant_pump + compressed_air;

  // Coolant consumption
  const coolant_liters = coolant_strategy === "flood" ? cycle_time_min * 0.08
    : coolant_strategy === "mql" ? cycle_time_min * 0.005
    : coolant_strategy === "cryogenic" ? cycle_time_min * 0.02
    : 0;

  // Tool life
  const tool_life = isGreen ? profile.tool_life_green_min * (isUltra ? 1.3 : 1) : profile.tool_life_standard_min;

  // Carbon
  const machining_co2 = total_kwh * GRID_CO2_KG_PER_KWH;
  const coolant_co2 = coolant_liters * COOLANT_CO2_PER_LITER;
  const tool_co2 = (cutting_time_min / tool_life) * TOOL_CO2_PER_INSERT;
  const chip_co2 = (chip_weight_g / 1000) * CHIP_CO2_PER_KG;

  // Cost
  const cost = (cycle_time_min / 60) * SHOP_RATE_USD_PER_HR +
    (cutting_time_min / tool_life) * 15 + // tool cost per insert
    coolant_liters * 0.5; // coolant cost

  return {
    cost_per_part_usd: round2(cost),
    cycle_time_min: round2(cycle_time_min),
    energy: {
      cutting_kwh: round4(cutting_energy),
      spindle_idle_kwh: round4(spindle_idle),
      rapid_move_kwh: round4(rapid_energy),
      coolant_pump_kwh: round4(coolant_pump),
      compressed_air_kwh: round4(compressed_air),
      total_kwh: round4(total_kwh),
    },
    carbon: {
      machining_kg_co2: round4(machining_co2),
      coolant_kg_co2: round4(coolant_co2),
      tool_wear_kg_co2: round4(tool_co2),
      chip_disposal_kg_co2: round4(chip_co2),
      total_kg_co2: round4(machining_co2 + coolant_co2 + tool_co2 + chip_co2),
    },
    coolant_strategy,
    coolant_liters_per_part: round3(coolant_liters),
    chip_weight_g: round1(chip_weight_g),
    tool_life_min: round1(tool_life),
    mrr_cm3_min: round2(mrr),
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function calculateSavings(standard: OperationMetrics, green: OperationMetrics): SavingsMetrics {
  const pct = (a: number, b: number) => b > 0 ? round2(((a - b) / a) * 100) : 0;
  return {
    cost_delta_usd: round2(green.cost_per_part_usd - standard.cost_per_part_usd),
    cost_delta_pct: round2(((green.cost_per_part_usd - standard.cost_per_part_usd) / standard.cost_per_part_usd) * 100),
    energy_saved_kwh: round4(standard.energy.total_kwh - green.energy.total_kwh),
    energy_saved_pct: pct(standard.energy.total_kwh, green.energy.total_kwh),
    carbon_saved_kg: round4(standard.carbon.total_kg_co2 - green.carbon.total_kg_co2),
    carbon_saved_pct: pct(standard.carbon.total_kg_co2, green.carbon.total_kg_co2),
    coolant_saved_liters: round3(standard.coolant_liters_per_part - green.coolant_liters_per_part),
    coolant_saved_pct: pct(standard.coolant_liters_per_part, green.coolant_liters_per_part),
    chip_saved_g: round1(standard.chip_weight_g - green.chip_weight_g),
    chip_saved_pct: pct(standard.chip_weight_g, green.chip_weight_g),
    tool_life_gained_pct: round2(((green.tool_life_min - standard.tool_life_min) / standard.tool_life_min) * 100),
  };
}

function buildRecommendations(profile: MaterialSustainProfile, savings: SavingsMetrics): string[] {
  const recs: string[] = [];
  if (profile.mql_suitable && profile.typical_coolant === "flood") {
    recs.push(`Switch from flood coolant to MQL for ${profile.name}. Reduces coolant consumption by ~90% with minimal impact on tool life.`);
  }
  if (profile.dry_suitable) {
    recs.push(`${profile.name} can be machined dry with appropriate tool coatings. Eliminates coolant cost and disposal entirely.`);
  }
  if (profile.cryogenic_benefit) {
    recs.push(`Consider cryogenic (CO2 or LN2) cooling for ${profile.name}. Improves tool life 50-100% while eliminating coolant disposal.`);
  }
  if (savings.tool_life_gained_pct > 20) {
    recs.push(`Green mode increases tool life by ${savings.tool_life_gained_pct}%, reducing tool waste and insert purchases.`);
  }
  if (savings.energy_saved_pct > 10) {
    recs.push(`Energy reduction of ${savings.energy_saved_pct}% achieved through optimized cutting parameters.`);
  }
  if (profile.chip_recyclability_pct >= 90) {
    recs.push(`${profile.name} chips are ${profile.chip_recyclability_pct}% recyclable. Ensure chip collection and segregation by material.`);
  }
  if (savings.carbon_saved_pct > 5) {
    recs.push(`CO2 reduction of ${savings.carbon_saved_kg} kg per part (${savings.carbon_saved_pct}%).`);
  }
  return recs;
}

// ─── Near-Net-Shape Analysis ────────────────────────────────────────────────

function analyzeNearNetShape(
  material: string,
  finished_weight_g: number,
  part_dims_mm: { x: number; y: number; z: number },
): NearNetShapeResult {
  const profile = findProfile(material);
  if (!profile) {
    return { analysis_id: "NNS-ERR", material, finished_weight_g, stock_options: [], recommendation: "Material not found", best_option: "unknown" };
  }

  const finished_vol_cm3 = finished_weight_g / profile.density_g_cm3;
  const bounding_vol_cm3 = (part_dims_mm.x * part_dims_mm.y * part_dims_mm.z) / 1000;

  const options: StockOption[] = [];

  // Bar stock — add 10mm per side
  const barVolCm3 = ((part_dims_mm.x + 20) * (part_dims_mm.y + 20) * (part_dims_mm.z + 10)) / 1000;
  const barWeight = barVolCm3 * profile.density_g_cm3;
  const barUtil = round1((finished_weight_g / barWeight) * 100);
  const barChip = round1(barWeight - finished_weight_g);
  const barMachTime = (barChip / profile.density_g_cm3) / 5; // rough MRR 5 cm³/min
  const barMachCost = round2((barMachTime / 60) * SHOP_RATE_USD_PER_HR);
  const barBlankCost = round2((barWeight / 1000) * 3.0);  // ~$3/kg for bar
  options.push({
    stock_type: "bar",
    raw_weight_g: round1(barWeight),
    material_utilization_pct: barUtil,
    blank_cost_usd: barBlankCost,
    machining_cost_usd: barMachCost,
    total_cost_usd: round2(barBlankCost + barMachCost),
    chip_weight_g: barChip,
    machining_time_min: round1(barMachTime),
    carbon_footprint_kg: round3((barWeight / 1000) * profile.carbon_intensity_kg_per_kg + barMachTime * 0.01),
    feasibility: "Standard — always available",
  });

  // Forging — near-net adds 3mm per side
  const forgeVolCm3 = ((part_dims_mm.x + 6) * (part_dims_mm.y + 6) * (part_dims_mm.z + 6)) / 1000;
  const forgeWeight = forgeVolCm3 * profile.density_g_cm3 * 0.85; // forging is closer to finished shape
  const forgeUtil = round1((finished_weight_g / forgeWeight) * 100);
  const forgeChip = round1(Math.max(0, forgeWeight - finished_weight_g));
  const forgeMachTime = (forgeChip / profile.density_g_cm3) / 5;
  const forgeMachCost = round2((forgeMachTime / 60) * SHOP_RATE_USD_PER_HR);
  const forgeBlankCost = round2((forgeWeight / 1000) * 8.0); // $8/kg for forging
  options.push({
    stock_type: "forging",
    raw_weight_g: round1(forgeWeight),
    material_utilization_pct: forgeUtil,
    blank_cost_usd: forgeBlankCost,
    machining_cost_usd: forgeMachCost,
    total_cost_usd: round2(forgeBlankCost + forgeMachCost),
    chip_weight_g: forgeChip,
    machining_time_min: round1(forgeMachTime),
    carbon_footprint_kg: round3((forgeWeight / 1000) * profile.carbon_intensity_kg_per_kg * 0.7 + forgeMachTime * 0.01),
    feasibility: "Requires forging tooling — economical above 100+ parts",
  });

  // Casting — near-net adds 2mm per side
  const castVolCm3 = ((part_dims_mm.x + 4) * (part_dims_mm.y + 4) * (part_dims_mm.z + 4)) / 1000;
  const castWeight = castVolCm3 * profile.density_g_cm3 * 0.80;
  const castUtil = round1((finished_weight_g / castWeight) * 100);
  const castChip = round1(Math.max(0, castWeight - finished_weight_g));
  const castMachTime = (castChip / profile.density_g_cm3) / 5;
  const castMachCost = round2((castMachTime / 60) * SHOP_RATE_USD_PER_HR);
  const castBlankCost = round2((castWeight / 1000) * 6.0);
  options.push({
    stock_type: "casting",
    raw_weight_g: round1(castWeight),
    material_utilization_pct: castUtil,
    blank_cost_usd: castBlankCost,
    machining_cost_usd: castMachCost,
    total_cost_usd: round2(castBlankCost + castMachCost),
    chip_weight_g: castChip,
    machining_time_min: round1(castMachTime),
    carbon_footprint_kg: round3((castWeight / 1000) * profile.carbon_intensity_kg_per_kg * 0.6 + castMachTime * 0.01),
    feasibility: "Requires casting pattern — economical above 200+ parts",
  });

  // Additive (3D printed) — near-net adds 1mm per side
  const addVolCm3 = ((part_dims_mm.x + 2) * (part_dims_mm.y + 2) * (part_dims_mm.z + 2)) / 1000;
  const addWeight = addVolCm3 * profile.density_g_cm3 * 0.95;
  const addUtil = round1((finished_weight_g / addWeight) * 100);
  const addChip = round1(Math.max(0, addWeight - finished_weight_g));
  const addMachTime = (addChip / profile.density_g_cm3) / 5;
  const addMachCost = round2((addMachTime / 60) * SHOP_RATE_USD_PER_HR);
  const addBlankCost = round2((addWeight / 1000) * 80.0); // $80/kg for metal AM
  options.push({
    stock_type: "additive",
    raw_weight_g: round1(addWeight),
    material_utilization_pct: addUtil,
    blank_cost_usd: addBlankCost,
    machining_cost_usd: addMachCost,
    total_cost_usd: round2(addBlankCost + addMachCost),
    chip_weight_g: addChip,
    machining_time_min: round1(addMachTime),
    carbon_footprint_kg: round3((addWeight / 1000) * profile.carbon_intensity_kg_per_kg * 1.5 + addMachTime * 0.01),
    feasibility: "Suitable for complex geometries and small batches (1-50 parts)",
  });

  // Sort by total cost
  options.sort((a, b) => a.total_cost_usd - b.total_cost_usd);

  // Find most sustainable
  const greenest = [...options].sort((a, b) => a.carbon_footprint_kg - b.carbon_footprint_kg)[0];

  const bestOption = options[0].stock_type;
  let recommendation = `Most cost-effective: ${options[0].stock_type} at $${options[0].total_cost_usd}/part.`;
  if (barUtil < 30) {
    recommendation += ` WARNING: Bar stock utilization is only ${barUtil}% — you're cutting away ${100 - barUtil}% of the material.`;
    recommendation += ` Consider near-net-shape options to reduce waste.`;
  }
  if (greenest.stock_type !== bestOption) {
    recommendation += ` Lowest carbon: ${greenest.stock_type} at ${greenest.carbon_footprint_kg} kg CO2.`;
  }

  nnsCounter++;
  return {
    analysis_id: `NNS-${String(nnsCounter).padStart(4, "0")}`,
    material: profile.name,
    finished_weight_g,
    stock_options: options,
    recommendation,
    best_option: bestOption,
  };
}

// ─── Coolant Lifecycle ──────────────────────────────────────────────────────

interface CoolantType {
  name: string;
  type: string;
  life_months: number;
  cost_per_liter: number;
  disposal_cost_per_liter: number;
  suitable_for: string[];
  environmental_rating: string;
}

const COOLANT_TYPES: CoolantType[] = [
  {
    name: "Soluble Oil (conventional)",
    type: "soluble_oil",
    life_months: 6,
    cost_per_liter: 2.5,
    disposal_cost_per_liter: 1.5,
    suitable_for: ["steel", "stainless", "cast_iron"],
    environmental_rating: "Poor — high disposal cost, bacterial growth risk",
  },
  {
    name: "Semi-Synthetic",
    type: "semi_synthetic",
    life_months: 12,
    cost_per_liter: 4.0,
    disposal_cost_per_liter: 0.8,
    suitable_for: ["steel", "aluminum", "cast_iron", "stainless"],
    environmental_rating: "Good — longer life, lower bacterial risk",
  },
  {
    name: "Full Synthetic",
    type: "full_synthetic",
    life_months: 18,
    cost_per_liter: 6.0,
    disposal_cost_per_liter: 0.5,
    suitable_for: ["steel", "aluminum", "cast_iron", "stainless", "titanium"],
    environmental_rating: "Very Good — minimal waste, no bacterial issues",
  },
  {
    name: "Vegetable-based (Ester)",
    type: "vegetable_ester",
    life_months: 10,
    cost_per_liter: 5.0,
    disposal_cost_per_liter: 0.3,
    suitable_for: ["aluminum", "steel", "cast_iron"],
    environmental_rating: "Excellent — biodegradable, low toxicity",
  },
];

function analyzeCoolant(
  current_type: string,
  job_mix: string[],
  sump_liters: number,
): CoolantAnalysis {
  const current = COOLANT_TYPES.find((c) => c.type === current_type) ?? COOLANT_TYPES[0];
  // Recommend based on job mix
  const hasTi = job_mix.some((j) => j.includes("titanium") || j.includes("inconel"));
  const recommended = hasTi ? COOLANT_TYPES[2] : COOLANT_TYPES[1]; // synthetic for Ti, semi-synthetic otherwise

  const replacementsCurrentPerYear = 12 / current.life_months;
  const replacementsRecommendedPerYear = 12 / recommended.life_months;

  const annualCurrent = sump_liters * (current.cost_per_liter + current.disposal_cost_per_liter) * replacementsCurrentPerYear;
  const annualRecommended = sump_liters * (recommended.cost_per_liter + recommended.disposal_cost_per_liter) * replacementsRecommendedPerYear;

  return {
    current_type: current.name,
    recommended_type: recommended.name,
    current_life_months: current.life_months,
    recommended_life_months: recommended.life_months,
    annual_cost_current_usd: round2(annualCurrent),
    annual_cost_recommended_usd: round2(annualRecommended),
    annual_savings_usd: round2(annualCurrent - annualRecommended),
    disposal_cost_reduction_pct: round1(((current.disposal_cost_per_liter - recommended.disposal_cost_per_liter) / current.disposal_cost_per_liter) * 100),
    environmental_benefit: recommended.environmental_rating,
  };
}

// ─── State ──────────────────────────────────────────────────────────────────

let optimizationCounter = 0;
let nnsCounter = 0;
const optimizationHistory: SustainabilityResult[] = [];

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export function sustainabilityEngine(action: string, params: Record<string, any>): any {
  switch (action) {
    // ── sustain_optimize: Compare standard vs green mode ──
    case "sustain_optimize": {
      const material = params.material as string ?? "steel";
      const profile = findProfile(material);
      if (!profile) return { error: `Material not found: ${material}. Available: aluminum, steel, stainless, titanium, inconel, cast_iron` };

      const diameter = params.tool_diameter_mm ?? 10;
      const depth = params.depth_mm ?? 5;
      const width = params.width_mm ?? 20;
      const length = params.length_mm ?? 100;
      const mode = (params.mode as OptimizationMode) ?? "green";

      const standard = calculateOperationMetrics(profile, "standard", diameter, depth, width, length);
      const green = calculateOperationMetrics(profile, mode, diameter, depth, width, length);
      const savings = calculateSavings(standard, green);
      const recommendations = buildRecommendations(profile, savings);

      optimizationCounter++;
      const result: SustainabilityResult = {
        optimization_id: `SO-${String(optimizationCounter).padStart(4, "0")}`,
        mode,
        material: profile.name,
        operation: `${diameter}mm endmill, ${depth}×${width}×${length}mm pocket`,
        standard,
        green,
        savings,
        recommendations,
      };
      optimizationHistory.push(result);
      return result;
    }

    // ── sustain_compare: Compare all materials for sustainability ──
    case "sustain_compare": {
      const diameter = params.tool_diameter_mm ?? 10;
      const depth = params.depth_mm ?? 5;
      const width = params.width_mm ?? 20;
      const length = params.length_mm ?? 100;

      const comparisons = Object.entries(MATERIAL_PROFILES).map(([key, profile]) => {
        const std = calculateOperationMetrics(profile, "standard", diameter, depth, width, length);
        const grn = calculateOperationMetrics(profile, "green", diameter, depth, width, length);
        return {
          material: profile.name,
          key,
          standard_cost: std.cost_per_part_usd,
          green_cost: grn.cost_per_part_usd,
          energy_savings_pct: round2(((std.energy.total_kwh - grn.energy.total_kwh) / std.energy.total_kwh) * 100),
          carbon_savings_pct: round2(((std.carbon.total_kg_co2 - grn.carbon.total_kg_co2) / std.carbon.total_kg_co2) * 100),
          mql_suitable: profile.mql_suitable,
          dry_suitable: profile.dry_suitable,
          chip_recyclability_pct: profile.chip_recyclability_pct,
        };
      });

      return {
        total: comparisons.length,
        operation: `${diameter}mm endmill, ${depth}×${width}×${length}mm pocket`,
        comparisons,
      };
    }

    // ── sustain_energy: Detailed energy breakdown ──
    case "sustain_energy": {
      const material = params.material as string ?? "steel";
      const profile = findProfile(material);
      if (!profile) return { error: `Material not found: ${material}` };

      const diameter = params.tool_diameter_mm ?? 10;
      const depth = params.depth_mm ?? 5;
      const width = params.width_mm ?? 20;
      const length = params.length_mm ?? 100;

      const std = calculateOperationMetrics(profile, "standard", diameter, depth, width, length);
      const grn = calculateOperationMetrics(profile, "green", diameter, depth, width, length);

      return {
        material: profile.name,
        standard_energy: std.energy,
        green_energy: grn.energy,
        savings_kwh: round4(std.energy.total_kwh - grn.energy.total_kwh),
        savings_pct: round2(((std.energy.total_kwh - grn.energy.total_kwh) / std.energy.total_kwh) * 100),
        grid_co2_factor: GRID_CO2_KG_PER_KWH,
      };
    }

    // ── sustain_carbon: Carbon footprint analysis ──
    case "sustain_carbon": {
      const material = params.material as string ?? "steel";
      const profile = findProfile(material);
      if (!profile) return { error: `Material not found: ${material}` };

      const diameter = params.tool_diameter_mm ?? 10;
      const depth = params.depth_mm ?? 5;
      const width = params.width_mm ?? 20;
      const length = params.length_mm ?? 100;

      const std = calculateOperationMetrics(profile, "standard", diameter, depth, width, length);
      const grn = calculateOperationMetrics(profile, "green", diameter, depth, width, length);

      // Raw material carbon
      const chip_vol_cm3 = (depth * width * length) / 1000;
      const raw_material_co2 = (chip_vol_cm3 * profile.density_g_cm3 / 1000) * profile.carbon_intensity_kg_per_kg;

      return {
        material: profile.name,
        carbon_intensity_per_kg: profile.carbon_intensity_kg_per_kg,
        raw_material_co2_kg: round4(raw_material_co2),
        standard_carbon: std.carbon,
        green_carbon: grn.carbon,
        savings_kg_co2: round4(std.carbon.total_kg_co2 - grn.carbon.total_kg_co2),
        savings_pct: round2(((std.carbon.total_kg_co2 - grn.carbon.total_kg_co2) / std.carbon.total_kg_co2) * 100),
        annual_savings_at_1000_parts: round2((std.carbon.total_kg_co2 - grn.carbon.total_kg_co2) * 1000),
      };
    }

    // ── sustain_coolant: Coolant lifecycle optimization ──
    case "sustain_coolant": {
      const currentType = params.current_type as string ?? "soluble_oil";
      const jobMix = params.job_mix as string[] ?? ["steel", "aluminum"];
      const sumpLiters = params.sump_liters as number ?? 200;
      return analyzeCoolant(currentType, jobMix, sumpLiters);
    }

    // ── sustain_nearnet: Near-net-shape analysis ──
    case "sustain_nearnet": {
      const material = params.material as string ?? "steel";
      const finishedWeight = params.finished_weight_g as number ?? 500;
      const dims = params.dimensions_mm ?? { x: 100, y: 80, z: 50 };
      return analyzeNearNetShape(material, finishedWeight, dims);
    }

    // ── sustain_report: Comprehensive sustainability report ──
    case "sustain_report": {
      const material = params.material as string ?? "steel";
      const profile = findProfile(material);
      if (!profile) return { error: `Material not found: ${material}` };

      const diameter = params.tool_diameter_mm ?? 10;
      const depth = params.depth_mm ?? 5;
      const width = params.width_mm ?? 20;
      const length = params.length_mm ?? 100;
      const batchSize = params.batch_size ?? 200;

      const std = calculateOperationMetrics(profile, "standard", diameter, depth, width, length);
      const grn = calculateOperationMetrics(profile, "green", diameter, depth, width, length);
      const savings = calculateSavings(std, grn);
      const recs = buildRecommendations(profile, savings);

      return {
        material: profile.name,
        batch_size: batchSize,
        per_part: {
          standard_cost: std.cost_per_part_usd,
          green_cost: grn.cost_per_part_usd,
          cost_delta: savings.cost_delta_usd,
        },
        batch_totals: {
          standard_cost: round2(std.cost_per_part_usd * batchSize),
          green_cost: round2(grn.cost_per_part_usd * batchSize),
          energy_saved_kwh: round2(savings.energy_saved_kwh * batchSize),
          carbon_saved_kg: round2(savings.carbon_saved_kg * batchSize),
          coolant_saved_liters: round2(savings.coolant_saved_liters * batchSize),
          chip_saved_kg: round2((savings.chip_saved_g * batchSize) / 1000),
        },
        recommendations: recs,
        coolant_strategy_change: `${std.coolant_strategy} → ${grn.coolant_strategy}`,
        tool_life_improvement: `${std.tool_life_min} → ${grn.tool_life_min} min (+${savings.tool_life_gained_pct}%)`,
        chip_recyclability_pct: profile.chip_recyclability_pct,
      };
    }

    // ── sustain_materials: List material sustainability profiles ──
    case "sustain_materials": {
      const material = params.material as string | undefined;
      if (material) {
        const profile = findProfile(material);
        if (!profile) return { error: `Material not found: ${material}` };
        return {
          name: profile.name,
          density_g_cm3: profile.density_g_cm3,
          specific_cutting_energy_j_cm3: profile.specific_cutting_energy_j_cm3,
          mql_suitable: profile.mql_suitable,
          dry_suitable: profile.dry_suitable,
          cryogenic_benefit: profile.cryogenic_benefit,
          chip_recyclability_pct: profile.chip_recyclability_pct,
          typical_coolant: profile.typical_coolant,
          green_coolant: profile.green_coolant,
          carbon_intensity_kg_per_kg: profile.carbon_intensity_kg_per_kg,
          green_parameters: {
            vc_reduction_pct: round1(((profile.vc_standard_m_min - profile.vc_green_m_min) / profile.vc_standard_m_min) * 100),
            tool_life_gain_pct: round1(((profile.tool_life_green_min - profile.tool_life_standard_min) / profile.tool_life_standard_min) * 100),
          },
        };
      }
      return {
        total: Object.keys(MATERIAL_PROFILES).length,
        materials: Object.entries(MATERIAL_PROFILES).map(([key, p]) => ({
          key,
          name: p.name,
          mql_suitable: p.mql_suitable,
          dry_suitable: p.dry_suitable,
          chip_recyclability_pct: p.chip_recyclability_pct,
          carbon_intensity: p.carbon_intensity_kg_per_kg,
        })),
      };
    }

    // ── sustain_history: Optimization history ──
    case "sustain_history": {
      return {
        total: optimizationHistory.length,
        optimizations: optimizationHistory.map((o) => ({
          optimization_id: o.optimization_id,
          material: o.material,
          mode: o.mode,
          cost_delta_pct: o.savings.cost_delta_pct,
          energy_saved_pct: o.savings.energy_saved_pct,
          carbon_saved_pct: o.savings.carbon_saved_pct,
        })),
      };
    }

    // ── sustain_get: Get specific optimization by ID ──
    case "sustain_get": {
      const id = params.optimization_id as string;
      if (!id) return { error: "optimization_id is required" };
      const found = optimizationHistory.find((o) => o.optimization_id === id);
      if (!found) return { error: `Optimization ${id} not found` };
      return found;
    }

    default:
      return { error: `Unknown sustain action: ${action}. Available: sustain_optimize, sustain_compare, sustain_energy, sustain_carbon, sustain_coolant, sustain_nearnet, sustain_report, sustain_materials, sustain_history, sustain_get` };
  }
}
