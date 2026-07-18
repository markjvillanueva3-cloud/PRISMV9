/**
 * EDMCostDocumentationEngine — WEDM Cost Estimation + Documentation & Setup Sheet
 *
 * MS17 (Cost Estimation) U01-U05 + MS18 (Documentation & Setup Sheet) U01-U05
 *
 * MS17 Calculators:
 *   U01 MachineTimeCostCalculator  — setup, cutting, tab, threading, idle
 *   U02 WireCostCalculator         — wire length, weight, cost by type
 *   U03 ConsumablesCostCalculator  — filters, guides, nozzles, resin, electrodes
 *   U04 PostProcessCostCalculator  — etch, stress relief, shot peen, inspection, coating
 *   U05 TotalJobCostAggregator     — subtotal + overhead + margin, qty breaks, process compare
 *
 * MS18 Generators:
 *   U01 EDMSetupSheetGenerator     — full setup sheet with checklist
 *   U02 TechnologyTableReference   — per-pass parameter cards
 *   U03 CutSequenceDocumentation   — profile order, tabs, slugs, time
 *   U04 InspectionPlanGenerator    — feature/tolerance/instrument/when
 *   U05 SafetyNotesGenerator       — dielectric, electrical, sharp edges, fume (BeCu)
 *
 * Actions: estimate_cost, generate_setup_sheet, generate_documentation,
 *          generate_inspection_plan, full_package
 */

// ============================================================================
// TYPES — MS17 COST
// ============================================================================

export interface MachineTimeInput {
  /** Machine hourly rate $/hr. Typical range $40-$120 */
  machine_rate_per_hr: number;
  /** Setup labour hours (fixtuting, datum, wire threading). Typical 1-4 hrs */
  setup_hrs: number;
  /** Active cutting time in hours */
  cutting_hrs: number;
  /** Tab cutting time in hours (slower, careful passes) */
  tab_cutting_hrs?: number;
  /** Wire re-threading time per thread event, hours */
  threading_time_per_event_hr?: number;
  /** Number of threading events (start holes + breaks) */
  threading_events?: number;
  /** Idle / inspection / job changeover hours */
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

export type WireType = "brass" | "coated" | "molybdenum" | "tungsten" | "zinc_coated";

export interface WireInput {
  /** Wire type — determines cost per metre */
  wire_type: WireType;
  /** Wire diameter mm — affects cut speed and cost */
  wire_diameter_mm: number;
  /** Total cutting time hours */
  cutting_hrs: number;
  /** Wire feed speed mm/min — machine setting */
  wire_speed_mm_per_min: number;
  /** Spool size kg — for waste/remnant calculation */
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
  /** Total cutting hours for this job */
  cutting_hrs: number;
  /** Number of flush nozzle sets required */
  nozzle_sets?: number;
  /** Number of start holes (each needs electrode tube) */
  start_holes?: number;
  /** Number of precision wire guides (upper + lower) to replace */
  guides_replaced?: number;
  /** Number of filters to replace */
  filters_replaced?: number;
  /** Hours since last deionizer resin change — for prorating resin cost */
  resin_hrs_since_last_change?: number;
  /** Total hours between resin changes (default 500 hrs) */
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
    /** CMM time in hours (for inspection ops) */
    inspection_hrs?: number;
    /** For coating: area in cm² */
    area_cm2?: number;
    /** Batch discount — number of parts in same heat/batch */
    batch_qty?: number;
  }>;
}

export interface PostProcessCost {
  items: Array<{ name: string; op: PostProcessOp; cost: number; notes: string }>;
  total: number;
}

export interface CostInput {
  /** Job / part identifier */
  part_id: string;
  /** Material name */
  material: string;
  /** Machine time details */
  machine_time: MachineTimeInput;
  /** Wire details */
  wire: WireInput;
  /** Consumables details */
  consumables: ConsumablesInput;
  /** Post-process operations */
  post_process?: PostProcessInput;
  /** Overhead percentage 15-25% */
  overhead_pct?: number;
  /** Margin percentage 10-30% */
  margin_pct?: number;
  /** Quantity for quantity breaks (default 1) */
  quantity?: number;
  /** Process alternatives to compare against */
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

// ============================================================================
// TYPES — MS18 DOCUMENTATION
// ============================================================================

export interface StartHole {
  id: string;
  x: number;
  y: number;
  dia_mm: number;
  /** "sinker_edm" | "drill" | "laser" | "pre_existing" */
  method: string;
}

export interface TechTableEntry {
  pass: number;
  table_id: string;
  offset_mm: number;
  /** Expected surface finish Ra µm */
  expected_ra_um?: number;
  /** Expected stock removal per side µm */
  stock_removal_um?: number;
  notes?: string;
}

export interface SetupSheet {
  header: {
    program: string;
    revision: string;
    machine: string;
    date: string;
    operator?: string;
    job_number?: string;
  };
  workpiece: {
    material: string;
    hardness?: string;
    dimensions: string;
    weight_kg: number;
    drawing_ref?: string;
  };
  wire: {
    type: WireType;
    diameter_mm: number;
    spool_kg: number;
    tension_N?: number;
    feed_mm_per_min?: number;
  };
  dielectric: {
    type: "deionized_water" | "oil";
    conductivity_target_uS: string;
    level_mm: string;
    temp_C: string;
    pressure_bar?: string;
  };
  fixture: {
    type: string;
    clamping_force_N?: number;
    notes: string;
  };
  datum: {
    method: string;
    x_ref: string;
    y_ref: string;
    z_ref: string;
    edgefind_required?: boolean;
  };
  start_holes: StartHole[];
  tech_tables: TechTableEntry[];
  estimated_time: {
    setup_min: number;
    cutting_min: number;
    total_min: number;
  };
  checklist: string[];
  special_instructions?: string[];
}

export interface TechTableRef {
  machine_model: string;
  material: string;
  wire_type: WireType;
  wire_dia_mm: number;
  thickness_mm: number;
  passes: Array<{
    pass_number: number;
    table_id: string;
    description: string;
    offset_mm: number;
    power_kW?: number;
    frequency_kHz?: number;
    pulse_on_us?: number;
    pulse_off_us?: number;
    voltage_V?: number;
    current_A?: number;
    wire_speed_mm_min?: number;
    feed_rate_mm_min?: number;
    flush_pressure_bar?: string;
    expected_ra_um: number;
    stock_removal_um: number;
    notes?: string;
  }>;
  notes: string[];
}

export interface CutProfile {
  id: string;
  description: string;
  /** Sequence order — lower cuts first */
  order: number;
  start_hole_id: string;
  /** Approximate wire path length mm */
  path_length_mm: number;
  num_passes: number;
  /** Does this profile produce a slug that must be removed? */
  produces_slug: boolean;
  slug_removal_method?: string;
  /** Tab positions if tabbed */
  tabs: Array<{ position_description: string; tab_width_mm: number }>;
  estimated_time_min: number;
  notes?: string;
}

export interface CutSequenceDoc {
  job_id: string;
  total_profiles: number;
  total_estimated_time_min: number;
  wire_cuts_total: number;
  slug_count: number;
  profiles: CutProfile[];
  tab_summary: string;
  slug_removal_sequence: string[];
}

export interface InspectionFeature {
  feature_id: string;
  description: string;
  nominal_mm?: number;
  tolerance_plus_mm?: number;
  tolerance_minus_mm?: number;
  /** e.g. "Ra 0.8µm" or "Rz 3.2µm" */
  surface_finish?: string;
  /** e.g. "CMM", "micrometer", "surface_plate", "optical_comparator", "profilometer" */
  instrument: string;
  /** "in_process" | "first_article" | "final" | "100_percent" | "sampling" */
  when: string;
  measurement_points?: number;
  drawing_callout?: string;
  notes?: string;
}

export interface InspectionPlan {
  job_id: string;
  part_id: string;
  revision: string;
  features: InspectionFeature[];
  first_article_required: boolean;
  cmm_program_ref?: string;
  sampling_plan?: string;
  total_inspection_time_min: number;
  notes: string[];
}

export interface SetupSheetInput {
  program: string;
  revision?: string;
  machine: string;
  material: string;
  material_hardness?: string;
  dimensions: string;
  weight_kg: number;
  wire_type: WireType;
  wire_diameter_mm: number;
  wire_spool_kg?: number;
  dielectric_type?: "deionized_water" | "oil";
  dielectric_conductivity_uS?: string;
  fixture_type?: string;
  fixture_notes?: string;
  datum_method?: string;
  start_holes?: StartHole[];
  tech_tables?: TechTableEntry[];
  setup_min?: number;
  cutting_min?: number;
  operator?: string;
  job_number?: string;
  drawing_ref?: string;
  special_instructions?: string[];
}

export interface TechTableInput {
  machine_model: string;
  material: string;
  wire_type: WireType;
  wire_dia_mm: number;
  thickness_mm: number;
  /** Override number of passes (default inferred) */
  num_passes?: number;
}

export interface CutSequenceInput {
  job_id: string;
  profiles: Array<{
    id: string;
    description: string;
    path_length_mm: number;
    num_passes?: number;
    start_hole_id?: string;
    produces_slug?: boolean;
    slug_removal_method?: string;
    tab_count?: number;
    tab_width_mm?: number;
    /** Cutting speed mm/min for time estimate */
    cutting_speed_mm_per_min?: number;
    notes?: string;
  }>;
  /** Default cutting speed if not per-profile */
  default_cutting_speed_mm_per_min?: number;
}

export interface InspectionPlanInput {
  job_id: string;
  part_id: string;
  revision?: string;
  material: string;
  features: Array<{
    feature_id: string;
    description: string;
    nominal_mm?: number;
    tolerance_plus_mm?: number;
    tolerance_minus_mm?: number;
    surface_finish?: string;
    instrument?: string;
    when?: string;
    measurement_points?: number;
    drawing_callout?: string;
    notes?: string;
  }>;
  first_article_required?: boolean;
  cmm_program_ref?: string;
  sampling_plan?: string;
}

export interface FullPackageInput {
  cost_input: CostInput;
  setup_input: SetupSheetInput;
  tech_table_input: TechTableInput;
  cut_sequence_input: CutSequenceInput;
  inspection_input: InspectionPlanInput;
}

export interface EDMDocumentationPackage {
  cost_estimate: CostEstimate;
  setup_sheet: SetupSheet;
  tech_table_reference: TechTableRef;
  cut_sequence: CutSequenceDoc;
  inspection_plan: InspectionPlan;
  safety_notes: string[];
  generated_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Wire cost per metre by type */
const WIRE_COST_PER_M: Record<WireType, number> = {
  brass: 0.02,
  coated: 0.04,
  molybdenum: 0.15,
  tungsten: 0.20,
  zinc_coated: 0.05,
};

/** Wire density g/m for common diameters — brass baseline */
const wireMassPerMetre_g = (dia_mm: number, type: WireType): number => {
  // mass = π/4 * d² * density_g_cm3 * 10 (m→cm conversion)
  const densities: Record<WireType, number> = {
    brass: 8.5, coated: 8.5, zinc_coated: 8.5, molybdenum: 10.2, tungsten: 19.3,
  };
  const d_cm = dia_mm / 10;
  return (Math.PI / 4) * d_cm * d_cm * (densities[type] || 8.5) * 100; // g/m
};

/** Spool sizes kg by wire type */
const SPOOL_STD_KG: Record<WireType, number> = {
  brass: 8, coated: 5, zinc_coated: 5, molybdenum: 1, tungsten: 0.5,
};

/** Consumable unit costs */
const CONSUMABLE_COSTS = {
  filter_unit: 45,          // $ per filter
  filter_life_hrs: 150,     // hours per filter
  guide_unit: 125,          // $ per guide (upper or lower)
  guide_life_hrs: 1500,     // hours
  nozzle_set: 85,           // $ per flush nozzle set (upper + lower)
  nozzle_life_hrs: 500,     // hours
  resin_per_change: 180,    // $ for deionizer resin bed
  resin_change_hrs: 500,    // hours between changes
  electrode_tube: 4.50,     // $ per sinker-EDM electrode tube for start hole
  flush_fluid_per_hr: 0.15, // $ per cutting hour (DI water additive/evaporation)
};

/** Post-process cost ranges (midpoint used) */
const POST_PROCESS_COSTS: Record<PostProcessOp, { base: number; per_hr?: number; per_cm2?: number; notes: string }> = {
  chemical_etch:             { base: 120,  notes: "Chemical etch to remove recast layer" },
  stress_relief:             { base: 300,  notes: "Stress relief anneal in controlled atmosphere furnace" },
  shot_peen:                 { base: 100,  notes: "Shot peen for compressive residual stress" },
  cmm_inspection:            { base: 50,   per_hr: 200, notes: "CMM first article / final inspection" },
  metallography:             { base: 350,  notes: "Metallographic section + report" },
  coating_pvd:               { base: 200,  per_cm2: 0.80, notes: "PVD hard coating (TiN/TiAlN)" },
  coating_cvd:               { base: 250,  per_cm2: 0.90, notes: "CVD coating" },
  coating_electroless_nickel:{ base: 150,  per_cm2: 0.40, notes: "Electroless nickel 25µm" },
  deburr_manual:             { base: 45,   per_hr: 55, notes: "Manual deburr & edge break" },
  deburr_tumble:             { base: 80,   notes: "Tumble deburr batch" },
  passivation:               { base: 90,   notes: "Passivation per ASTM A967" },
  heat_treat_anneal:         { base: 200,  notes: "Full anneal, controlled atmosphere" },
};

/** Quantity break setup amortisation. Setup hrs * rate is the fixed cost. */
const QTY_BREAKS = [1, 5, 10, 25, 100];

/** Process comparison multipliers vs WEDM cost */
const PROCESS_COMPARISON: Record<string, { mult: number; notes: string }> = {
  sinker_edm:   { mult: 1.40, notes: "Sinker EDM — higher electrode cost, slower for complex profiles" },
  milling:      { mult: 0.65, notes: "CNC milling — faster for simple profiles; not viable for hardened steel pockets" },
  grinding:     { mult: 0.90, notes: "Surface/profile grinding — limited to 2D shapes, excellent finish" },
  laser_cut:    { mult: 0.45, notes: "Laser cutting — fast, but limited thickness and HAZ concerns" },
  waterjet:     { mult: 0.55, notes: "Waterjet — no HAZ, but rougher finish and less precision" },
};

// ============================================================================
// TECHNOLOGY TABLE DATA (simplified parametric model)
// ============================================================================

/** Inferred passes by surface-finish requirement and thickness */
function inferPassCount(thickness_mm: number, wire_type: WireType): number {
  if (thickness_mm <= 20) return 3;
  if (thickness_mm <= 60) return 4;
  if (thickness_mm <= 150) return 5;
  return 6;
}

/** Approximate per-pass parameters — parametric model, not machine-specific */
function buildPassParameters(
  pass: number,
  totalPasses: number,
  material: string,
  wireDia: number,
  thickness: number
): TechTableRef["passes"][0] {
  const isSteelHard = /h13|d2|m2|tool_steel|hardened|hrc/i.test(material);
  const isAluminum = /alum|6061|7075/i.test(material);
  const isTitanium = /titan|ti-6|ti64/i.test(material);
  const isCarbide = /carbide|wc/i.test(material);

  // Ra target per pass: rough → finish
  const raTargets = [3.2, 1.6, 0.8, 0.4, 0.2, 0.1];
  const stockRemoval = [0, 40, 15, 8, 4, 2]; // µm per side

  const raIdx = Math.min(pass - 1, raTargets.length - 1);
  const ra = raTargets[raIdx];
  const sr = stockRemoval[raIdx];

  // Table offset: first cut is 0, subsequent cuts reduce offset
  const offsetBase = wireDia / 2 + 0.01; // core offset
  const offsets = [
    offsetBase + 0.04,  // rough + kerf oversize
    offsetBase + 0.015,
    offsetBase + 0.006,
    offsetBase + 0.002,
    offsetBase + 0.001,
    offsetBase,
  ];
  const offset = offsets[Math.min(pass - 1, offsets.length - 1)];

  // Feed rate by pass — rough pass fastest
  const feedMultiplier = pass === 1 ? 1.0 : 0.6 - (pass - 2) * 0.1;
  const baseFeed = isCarbide ? 0.6 : isAluminum ? 3.5 : isTitanium ? 1.0 : 2.0; // mm/min rough
  const feed = Math.max(0.1, baseFeed * feedMultiplier);

  // Table ID naming convention: C01, C02 ... for cuts, F01 for finish
  const tableId = pass === 1 ? `C${String(pass).padStart(2, "0")}` :
    pass === totalPasses ? `F${String(pass).padStart(2, "0")}` :
    `T${String(pass).padStart(2, "0")}`;

  const descriptions = [
    "Rough cut — maximum material removal",
    "Second cut — dimensional accuracy",
    "Third cut — surface improvement",
    "Fourth cut — fine finish",
    "Fifth cut — near-mirror finish",
    "Sixth cut — mirror finish",
  ];

  return {
    pass_number: pass,
    table_id: tableId,
    description: descriptions[Math.min(pass - 1, descriptions.length - 1)],
    offset_mm: Math.round(offset * 1000) / 1000,
    expected_ra_um: ra,
    stock_removal_um: sr,
    feed_rate_mm_min: Math.round(feed * 100) / 100,
    flush_pressure_bar: pass === 1 ? "10-12" : pass <= 3 ? "6-8" : "2-4",
    notes: pass === 1 ? "Confirm slug support before rough cut" : undefined,
  };
}

// ============================================================================
// CHECKLIST BUILDER
// ============================================================================

function buildSetupChecklist(input: SetupSheetInput): string[] {
  const checks: string[] = [
    "[ ] Verify machine dielectric level within target range",
    "[ ] Check dielectric conductivity within spec",
    "[ ] Inspect and clean upper/lower flush nozzles",
    "[ ] Confirm wire type and diameter match job card",
    "[ ] Thread wire and auto-thread test at start hole",
    "[ ] Verify wire tension setting",
    "[ ] Clean workpiece — remove oil, burrs, and scale",
    "[ ] Mount workpiece in fixture, torque to spec",
    "[ ] Set workpiece datum (edge-find X, Y; Z surface)",
    "[ ] Load program, verify against drawing",
    "[ ] Dry run without cutting — check clearances",
  ];

  if (input.start_holes && input.start_holes.length > 0) {
    checks.push(`[ ] Verify all ${input.start_holes.length} start hole(s) are clear and within tolerance`);
  }

  if (input.material_hardness) {
    checks.push(`[ ] Confirm workpiece hardness ${input.material_hardness} before cutting`);
  }

  if (/becu|beryllium/i.test(input.material)) {
    checks.push("[ ] BERYLLIUM-COPPER: Fume extraction MUST be running. PPE — P100 respirator required");
    checks.push("[ ] BeCu: Wet cutting only. Collect all swarf as hazardous waste");
  }

  checks.push(
    "[ ] Confirm slug support (magnets, wax, or adhesive) for all through-cuts",
    "[ ] Verify inspection tools are calibrated and available",
    "[ ] Sign and date setup sheet before first cut"
  );

  return checks;
}

// ============================================================================
// SAFETY NOTES GENERATOR (MS18-U05)
// ============================================================================

function generateSafetyNotes(material: string, wireType: WireType, dielectricType: "deionized_water" | "oil"): string[] {
  const notes: string[] = [];

  // Dielectric hazards
  if (dielectricType === "oil") {
    notes.push("DIELECTRIC (OIL): Fire hazard — maintain dielectric level above workpiece at all times. No sparks near machine.");
    notes.push("DIELECTRIC (OIL): Wear nitrile gloves when handling dielectric. Dispose per local hazardous waste regulations.");
    notes.push("DIELECTRIC (OIL): Oil mist extraction must be operational. Flash point concern — no open flames near machine.");
  } else {
    notes.push("DIELECTRIC (DI WATER): Maintain conductivity within 2-20 µS/cm. High conductivity causes poor cut quality.");
    notes.push("DIELECTRIC (DI WATER): Water creates slipping hazard — clean spills immediately.");
    notes.push("DIELECTRIC (DI WATER): Deionized water is aggressive — avoid prolonged skin contact. Rinse after contact.");
  }

  // Electrical hazards
  notes.push("ELECTRICAL: Machine operates at up to 300V DC with high-frequency discharge. Never reach into cutting zone during operation.");
  notes.push("ELECTRICAL: Ground the workpiece fixture independently. Verify continuity before cutting.");
  notes.push("ELECTRICAL: In case of electrical fault — emergency stop then power isolator. Do not use water on electrical fire.");

  // Sharp edges / slugs
  notes.push("SHARP EDGES: EDM-cut parts have sharp kerf edges. Wear cut-resistant gloves when handling parts and slugs.");
  notes.push("SLUGS: Secure all slugs before rough cut starts. Unsupported slugs can shift and cause wire breakage or part damage.");
  notes.push("SLUGS: Remove slugs only after the machine has stopped and wire is clear. Use pliers — do not grab by hand.");

  // Wire hazards
  notes.push("WIRE: Spent wire is sharp and tangled. Use wire chopper — do not handle loose spent wire. Dispose in designated bin.");
  notes.push("WIRE: Wire under tension can snap. Keep face and hands clear of wire path when threading.");

  // Material-specific
  if (/becu|beryllium/i.test(material)) {
    notes.push("BERYLLIUM COPPER (BeCu): CARCINOGEN. P100 respirator mandatory during setup, cutting, and cleanup.");
    notes.push("BeCu: All swarf, filters, and dielectric contaminated with BeCu must be treated as hazardous waste. Label containers.");
    notes.push("BeCu: No dry machining, grinding, or sanding of BeCu. Wet cutting only. No eating/drinking/smoking in machining area.");
    notes.push("BeCu: Notify safety officer before commencing BeCu operations. Log all personnel exposure.");
  }

  if (/graphite|edm_graphite/i.test(material)) {
    notes.push("GRAPHITE: Conductive dust. Fume extraction required. Clean machine thoroughly after graphite work.");
  }

  if (/titan|ti-6|ti64/i.test(material)) {
    notes.push("TITANIUM: Titanium swarf is flammable in fine particle form. Collect wet. No grinding of Ti swarf.");
  }

  if (/magnesium|mg_alloy/i.test(material)) {
    notes.push("MAGNESIUM: Highly flammable — do not use water or CO2 on Mg fire. Use Class D extinguisher.");
  }

  // Fume extraction — general
  notes.push("FUME EXTRACTION: Verify extraction is operational before cutting any material. Replace filters per manufacturer schedule.");

  // Ergonomics / general
  notes.push("GENERAL: Do not leave machine unattended during first cut or when running unfamiliar programs.");
  notes.push("GENERAL: Inspect wire spool brake — ensure proper tension. Loose tension causes wire breakage and potential whip.");

  return notes;
}

// ============================================================================
// MS17-U01 — MACHINE TIME COST CALCULATOR
// ============================================================================

function calculateMachineTimeCost(input: MachineTimeInput): MachineTimeCost {
  const threading_hrs =
    (input.threading_time_per_event_hr || 0.05) * (input.threading_events || 1);
  const tab_cutting_hrs = input.tab_cutting_hrs || 0;
  const idle_hrs = input.idle_hrs || 0;

  const breakdown: MachineTimeCost["breakdown"] = [
    { phase: "Setup",        hrs: input.setup_hrs,    cost: input.setup_hrs    * input.machine_rate_per_hr },
    { phase: "Cutting",      hrs: input.cutting_hrs,  cost: input.cutting_hrs  * input.machine_rate_per_hr },
    { phase: "Tab Cutting",  hrs: tab_cutting_hrs,    cost: tab_cutting_hrs    * input.machine_rate_per_hr },
    { phase: "Threading",    hrs: threading_hrs,      cost: threading_hrs      * input.machine_rate_per_hr },
    { phase: "Idle/Inspect", hrs: idle_hrs,           cost: idle_hrs           * input.machine_rate_per_hr * 0.5 }, // idle at half rate
  ].map(b => ({ ...b, cost: Math.round(b.cost * 100) / 100 }));

  const total_hrs = breakdown.reduce((s, b) => s + b.hrs, 0);
  const cost = breakdown.reduce((s, b) => s + b.cost, 0);

  return {
    setup_hrs: input.setup_hrs,
    cutting_hrs: input.cutting_hrs,
    tab_cutting_hrs,
    threading_hrs: Math.round(threading_hrs * 1000) / 1000,
    idle_hrs,
    total_hrs: Math.round(total_hrs * 1000) / 1000,
    rate_per_hr: input.machine_rate_per_hr,
    cost: Math.round(cost * 100) / 100,
    breakdown,
  };
}

// ============================================================================
// MS17-U02 — WIRE COST CALCULATOR
// ============================================================================

function calculateWireCost(input: WireInput): WireCost {
  const length_m = input.wire_speed_mm_per_min * input.cutting_hrs * 60 / 1000;
  const massPerM_g = wireMassPerMetre_g(input.wire_diameter_mm, input.wire_type);
  const weight_kg = (length_m * massPerM_g) / 1000;
  const cost_per_m = WIRE_COST_PER_M[input.wire_type];
  const cost = length_m * cost_per_m;

  const spoolKg = input.spool_size_kg || SPOOL_STD_KG[input.wire_type];
  const spools_used = weight_kg / spoolKg;
  const spools_full = Math.floor(spools_used);
  const remnant_kg = Math.max(0, spoolKg - (weight_kg - spools_full * spoolKg));

  const typeNotes: Record<WireType, string> = {
    brass: "Standard brass wire — good all-round performance",
    coated: "Zinc-coated brass — faster cutting speed, reduced wire breakage",
    zinc_coated: "Zinc-coated — improved flush performance",
    molybdenum: "Moly wire — used for very thin stock or small radius cuts",
    tungsten: "Tungsten wire — extremely fine diameter precision cutting",
  };

  return {
    wire_type: input.wire_type,
    diameter_mm: input.wire_diameter_mm,
    length_m: Math.round(length_m),
    weight_kg: Math.round(weight_kg * 100) / 100,
    cost_per_m,
    cost: Math.round(cost * 100) / 100,
    spools_used: Math.round(spools_used * 10) / 10,
    remnant_kg: Math.round(remnant_kg * 100) / 100,
    notes: typeNotes[input.wire_type],
  };
}

// ============================================================================
// MS17-U03 — CONSUMABLES COST CALCULATOR
// ============================================================================

function calculateConsumablesCost(input: ConsumablesInput): ConsumablesCost {
  const C = CONSUMABLE_COSTS;

  // Filters — prorate by cutting hours
  const filters_qty = input.filters_replaced !== undefined
    ? input.filters_replaced
    : Math.ceil(input.cutting_hrs / C.filter_life_hrs);
  const filters_cost = filters_qty * C.filter_unit;

  // Guides — prorate if not specified
  const guides_qty = input.guides_replaced !== undefined
    ? input.guides_replaced
    : Math.max(0, Math.floor(input.cutting_hrs / C.guide_life_hrs)); // usually 0 for a single job
  const guides_cost = guides_qty * C.guide_unit;

  // Nozzles
  const nozzles_qty = input.nozzle_sets !== undefined
    ? input.nozzle_sets
    : Math.ceil(input.cutting_hrs / C.nozzle_life_hrs);
  const nozzles_cost = nozzles_qty * C.nozzle_set;

  // Resin — prorate
  const sinceChange = input.resin_hrs_since_last_change || 0;
  const changeInterval = input.resin_change_interval_hrs || C.resin_change_hrs;
  const resin_fraction = Math.min(1, input.cutting_hrs / (changeInterval - sinceChange));
  const resin_cost = resin_fraction * C.resin_per_change;

  // Electrode tubes for start holes
  const electrodes_qty = input.start_holes || 0;
  const electrodes_cost = electrodes_qty * C.electrode_tube;

  // Flush fluid
  const flush_cost = input.cutting_hrs * C.flush_fluid_per_hr;

  const detail: ConsumablesCost["detail"] = [
    { item: "Dielectric filters",      qty: filters_qty,    unit_cost: C.filter_unit,   cost: filters_cost,    life_hrs: C.filter_life_hrs },
    { item: "Wire guides",             qty: guides_qty,     unit_cost: C.guide_unit,    cost: guides_cost,     life_hrs: C.guide_life_hrs },
    { item: "Flush nozzle sets",       qty: nozzles_qty,    unit_cost: C.nozzle_set,    cost: nozzles_cost,    life_hrs: C.nozzle_life_hrs },
    { item: "Deionizer resin (share)", qty: 1,              unit_cost: C.resin_per_change, cost: Math.round(resin_cost * 100) / 100 },
    { item: "Electrode tubes (start holes)", qty: electrodes_qty, unit_cost: C.electrode_tube, cost: electrodes_cost },
    { item: "Flush fluid/additives",   qty: 1,              unit_cost: C.flush_fluid_per_hr, cost: Math.round(flush_cost * 100) / 100 },
  ].map(d => ({ ...d, cost: Math.round(d.cost * 100) / 100 }));

  const total = detail.reduce((s, d) => s + d.cost, 0);

  return {
    filters: Math.round(filters_cost * 100) / 100,
    guides: Math.round(guides_cost * 100) / 100,
    nozzles: Math.round(nozzles_cost * 100) / 100,
    resin: Math.round(resin_cost * 100) / 100,
    electrodes: Math.round(electrodes_cost * 100) / 100,
    flush_fluid: Math.round(flush_cost * 100) / 100,
    total: Math.round(total * 100) / 100,
    detail,
  };
}

// ============================================================================
// MS17-U04 — POST-PROCESS COST CALCULATOR
// ============================================================================

function calculatePostProcessCost(input: PostProcessInput | undefined): PostProcessCost {
  if (!input || input.operations.length === 0) {
    return { items: [], total: 0 };
  }

  const items: PostProcessCost["items"] = input.operations.map(opInput => {
    const cfg = POST_PROCESS_COSTS[opInput.op];
    let cost = cfg.base;

    if (cfg.per_hr && opInput.inspection_hrs) {
      cost += cfg.per_hr * opInput.inspection_hrs;
    }
    if (cfg.per_cm2 && opInput.area_cm2) {
      cost += cfg.per_cm2 * opInput.area_cm2;
    }

    // Batch discount — ops like heat treat / passivation scale sublinearly
    if (opInput.batch_qty && opInput.batch_qty > 1) {
      const batchFactor = 1 / Math.sqrt(opInput.batch_qty);
      cost = cost * batchFactor;
    }

    return {
      name: cfg.notes,
      op: opInput.op,
      cost: Math.round(cost * 100) / 100,
      notes: cfg.notes,
    };
  });

  const total = items.reduce((s, i) => s + i.cost, 0);
  return { items, total: Math.round(total * 100) / 100 };
}

// ============================================================================
// MS17-U05 — TOTAL JOB COST AGGREGATOR
// ============================================================================

function aggregateTotalCost(input: CostInput): CostEstimate {
  const machineTimeCost = calculateMachineTimeCost(input.machine_time);
  const wireCost = calculateWireCost(input.wire);
  const consumablesCost = calculateConsumablesCost(input.consumables);
  const postProcessCost = calculatePostProcessCost(input.post_process);

  const overhead_pct = input.overhead_pct ?? 20;
  const margin_pct = input.margin_pct ?? 20;

  const subtotal = machineTimeCost.cost + wireCost.cost + consumablesCost.total + postProcessCost.total;
  const overhead = subtotal * (overhead_pct / 100);
  const margin = (subtotal + overhead) * (margin_pct / 100);
  const total_per_part = subtotal + overhead + margin;

  // Quantity breaks — setup is fixed cost, amortise over qty
  const setupCost = input.machine_time.setup_hrs * input.machine_time.machine_rate_per_hr;
  const varCost = total_per_part - setupCost * (1 + overhead_pct / 100) * (1 + margin_pct / 100);

  const quantity_breaks = QTY_BREAKS.map(qty => {
    const setupAmortized = (setupCost * (1 + overhead_pct / 100) * (1 + margin_pct / 100)) / qty;
    const cost_per_part = Math.max(varCost + setupAmortized, varCost * 1.02);
    return {
      qty,
      setup_amortized: Math.round(setupAmortized * 100) / 100,
      cost_per_part: Math.round(cost_per_part * 100) / 100,
      total: Math.round(cost_per_part * qty * 100) / 100,
    };
  });

  // Process comparison
  const comparison = (input.compare_processes || ["sinker_edm", "milling", "laser_cut"]).map(proc => {
    const cfg = PROCESS_COMPARISON[proc] || { mult: 1.0, notes: "Unknown process" };
    return {
      process: proc.replace(/_/g, " "),
      estimated_cost: Math.round(total_per_part * cfg.mult * 100) / 100,
      notes: cfg.notes,
    };
  });

  // Cost drivers
  const categories = [
    { category: "Machine Time", amount: machineTimeCost.cost },
    { category: "Wire",         amount: wireCost.cost },
    { category: "Consumables",  amount: consumablesCost.total },
    { category: "Post-Process", amount: postProcessCost.total },
    { category: "Overhead",     amount: overhead },
    { category: "Margin",       amount: margin },
  ];

  const cost_drivers = categories.map(c => ({
    category: c.category,
    amount: Math.round(c.amount * 100) / 100,
    pct_of_total: Math.round((c.amount / total_per_part) * 1000) / 10,
  }));

  return {
    part_id: input.part_id,
    material: input.material,
    machine_time: machineTimeCost,
    wire: wireCost,
    consumables: consumablesCost,
    post_process: postProcessCost,
    subtotal: Math.round(subtotal * 100) / 100,
    overhead_pct,
    overhead: Math.round(overhead * 100) / 100,
    margin_pct,
    margin: Math.round(margin * 100) / 100,
    total_per_part: Math.round(total_per_part * 100) / 100,
    quantity_breaks,
    comparison,
    cost_drivers,
  };
}

// ============================================================================
// MS18-U01 — SETUP SHEET GENERATOR
// ============================================================================

function generateSetupSheet(input: SetupSheetInput): SetupSheet {
  const defaultTechTables: TechTableEntry[] = input.tech_tables || [
    { pass: 1, table_id: "C01", offset_mm: 0.170 },
    { pass: 2, table_id: "T02", offset_mm: 0.145 },
    { pass: 3, table_id: "F03", offset_mm: 0.135 },
  ];

  const defaultStartHoles: StartHole[] = input.start_holes || [];
  const cuttingMin = input.cutting_min || 60;
  const setupMin = input.setup_min || 90;

  const dielectricType = input.dielectric_type || "deionized_water";

  return {
    header: {
      program: input.program,
      revision: input.revision || "A",
      machine: input.machine,
      date: new Date().toISOString().slice(0, 10),
      operator: input.operator,
      job_number: input.job_number,
    },
    workpiece: {
      material: input.material,
      hardness: input.material_hardness,
      dimensions: input.dimensions,
      weight_kg: input.weight_kg,
      drawing_ref: input.drawing_ref,
    },
    wire: {
      type: input.wire_type,
      diameter_mm: input.wire_diameter_mm,
      spool_kg: input.wire_spool_kg || SPOOL_STD_KG[input.wire_type],
      tension_N: input.wire_diameter_mm <= 0.10 ? 5 : input.wire_diameter_mm <= 0.20 ? 12 : 18,
      feed_mm_per_min: input.wire_diameter_mm <= 0.10 ? 5 : input.wire_diameter_mm <= 0.20 ? 10 : 12,
    },
    dielectric: {
      type: dielectricType,
      conductivity_target_uS: input.dielectric_conductivity_uS ||
        (dielectricType === "oil" ? "N/A (oil)" : "3-8 µS/cm"),
      level_mm: "≥ 30mm above workpiece top surface",
      temp_C: "20 ± 2°C",
      pressure_bar: "8-12 bar (rough), 3-6 bar (finish)",
    },
    fixture: {
      type: input.fixture_type || "magnetic chuck with tooling block",
      notes: input.fixture_notes || "Ensure workpiece is clean and fully seated. Zero Z from workpiece top.",
    },
    datum: {
      method: input.datum_method || "Edge-find all four sides; set origin at lower-left corner",
      x_ref: "Part lower-left edge, X+",
      y_ref: "Part lower-left edge, Y+",
      z_ref: "Top surface of workpiece (Z=0)",
      edgefind_required: true,
    },
    start_holes: defaultStartHoles,
    tech_tables: defaultTechTables,
    estimated_time: {
      setup_min: setupMin,
      cutting_min: cuttingMin,
      total_min: setupMin + cuttingMin,
    },
    checklist: buildSetupChecklist(input),
    special_instructions: input.special_instructions,
  };
}

// ============================================================================
// MS18-U02 — TECHNOLOGY TABLE REFERENCE
// ============================================================================

function generateTechTableReference(input: TechTableInput): TechTableRef {
  const numPasses = input.num_passes || inferPassCount(input.thickness_mm, input.wire_type);

  const passes = Array.from({ length: numPasses }, (_, i) =>
    buildPassParameters(i + 1, numPasses, input.material, input.wire_dia_mm, input.thickness_mm)
  );

  const notes: string[] = [
    `Technology tables are parametric estimates. Always verify against ${input.machine_model} technology library.`,
    `Workpiece material: ${input.material}, thickness: ${input.thickness_mm}mm`,
    `Wire: ${input.wire_type} Ø${input.wire_dia_mm}mm`,
    "After first cut, inspect kerf width with optical comparator to validate offset before continuing.",
    "Adjust feed rate ±20% based on actual wire break frequency and surface quality observation.",
    "Flush pressure should be reduced on finish passes to avoid part deflection.",
  ];

  if (/ti-6|titan/i.test(input.material)) {
    notes.push("Titanium: Reduce power settings 15-20% vs. steel defaults. Increased wire break risk.");
  }
  if (/inconel|nickel_super/i.test(input.material)) {
    notes.push("Inconel/Superalloy: Expect 40-60% slower cutting than steel. Monitor wire tension closely.");
  }
  if (/carbide|wc/i.test(input.material)) {
    notes.push("Carbide: Use pure water dielectric. Cobalt binder leaching — dispose of spent dielectric as hazardous.");
  }

  return {
    machine_model: input.machine_model,
    material: input.material,
    wire_type: input.wire_type,
    wire_dia_mm: input.wire_dia_mm,
    thickness_mm: input.thickness_mm,
    passes,
    notes,
  };
}

// ============================================================================
// MS18-U03 — CUT SEQUENCE DOCUMENTATION
// ============================================================================

function generateCutSequence(input: CutSequenceInput): CutSequenceDoc {
  const defaultSpeed = input.default_cutting_speed_mm_per_min || 2.0; // mm/min

  const profiles: CutProfile[] = input.profiles.map((p, idx) => {
    const numPasses = p.num_passes || 3;
    const cuttingSpeed = p.cutting_speed_mm_per_min || defaultSpeed;
    const estimated_time_min = Math.round((p.path_length_mm / cuttingSpeed) * numPasses + 5); // +5 min threading

    const tabs: CutProfile["tabs"] = [];
    const tabCount = p.tab_count || 0;
    for (let t = 0; t < tabCount; t++) {
      tabs.push({
        position_description: `Tab ${t + 1} of ${tabCount} — evenly distributed on profile perimeter`,
        tab_width_mm: p.tab_width_mm || 1.0,
      });
    }

    return {
      id: p.id,
      description: p.description,
      order: idx + 1,
      start_hole_id: p.start_hole_id || `SH${String(idx + 1).padStart(2, "0")}`,
      path_length_mm: p.path_length_mm,
      num_passes: numPasses,
      produces_slug: p.produces_slug !== undefined ? p.produces_slug : true,
      slug_removal_method: p.produces_slug !== false
        ? (p.slug_removal_method || "Support with wax or adhesive tape. Remove slug after rough cut completes.")
        : undefined,
      tabs,
      estimated_time_min,
      notes: p.notes,
    };
  });

  // Topological ordering note: cut internal profiles first, then outer
  const totalTime = profiles.reduce((s, p) => s + p.estimated_time_min, 0);
  const slugCount = profiles.filter(p => p.produces_slug).length;
  const wireCuts = profiles.reduce((s, p) => s + p.num_passes, 0);
  const tabbedProfiles = profiles.filter(p => p.tabs.length > 0);

  const slugSequence = profiles
    .filter(p => p.produces_slug)
    .map(p => `Profile ${p.id}: ${p.description} — ${p.slug_removal_method}`);

  const tabSummary = tabbedProfiles.length === 0
    ? "No tabbed profiles — all profiles cut free."
    : `${tabbedProfiles.length} tabbed profile(s). Tabs must be manually cut after all wire passes complete. Use small flush cutters or hand saw. Deburr tab stubs.`;

  return {
    job_id: input.job_id,
    total_profiles: profiles.length,
    total_estimated_time_min: totalTime,
    wire_cuts_total: wireCuts,
    slug_count: slugCount,
    profiles,
    tab_summary: tabSummary,
    slug_removal_sequence: slugSequence,
  };
}

// ============================================================================
// MS18-U04 — INSPECTION PLAN GENERATOR
// ============================================================================

function generateInspectionPlan(input: InspectionPlanInput): InspectionPlan {
  const features: InspectionFeature[] = input.features.map(f => {
    // Infer instrument if not provided
    let instrument = f.instrument;
    if (!instrument) {
      if (f.surface_finish) {
        instrument = "profilometer";
      } else if (f.tolerance_plus_mm !== undefined && Math.abs(f.tolerance_plus_mm) <= 0.005) {
        instrument = "CMM";
      } else if (f.tolerance_plus_mm !== undefined && Math.abs(f.tolerance_plus_mm) <= 0.05) {
        instrument = "micrometer";
      } else {
        instrument = "caliper";
      }
    }

    // Infer inspection stage if not provided
    const when = f.when || (
      (f.tolerance_plus_mm !== undefined && Math.abs(f.tolerance_plus_mm) <= 0.010)
        ? "first_article"
        : "final"
    );

    return {
      feature_id: f.feature_id,
      description: f.description,
      nominal_mm: f.nominal_mm,
      tolerance_plus_mm: f.tolerance_plus_mm,
      tolerance_minus_mm: f.tolerance_minus_mm ?? f.tolerance_plus_mm,
      surface_finish: f.surface_finish,
      instrument,
      when,
      measurement_points: f.measurement_points || 3,
      drawing_callout: f.drawing_callout,
      notes: f.notes,
    };
  });

  // Estimate inspection time: 2 min per feature + 15 min CMM setup if CMM used
  const hasCMM = features.some(f => f.instrument === "CMM");
  const baseTime = features.reduce((s, f) => {
    const t = f.instrument === "CMM" ? 5 : f.instrument === "profilometer" ? 4 : 2;
    return s + t * (f.measurement_points || 3);
  }, 0);
  const total_inspection_time_min = baseTime + (hasCMM ? 15 : 0);

  const notes: string[] = [
    "All inspections to be performed after part has reached thermal equilibrium (20 ± 2°C).",
    "CMM probe qualification required before first measurement.",
  ];

  if (hasCMM) {
    notes.push(`CMM program reference: ${input.cmm_program_ref || "TBD — create before first article"}`);
  }
  if (input.features.some(f => f.surface_finish)) {
    notes.push("Surface roughness: Measure perpendicular to lay direction. Minimum 3 traces per feature.");
  }
  notes.push("Record all measurements on inspection report. Non-conformances require NCR before disposition.");

  return {
    job_id: input.job_id,
    part_id: input.part_id,
    revision: input.revision || "A",
    features,
    first_article_required: input.first_article_required !== undefined ? input.first_article_required : true,
    cmm_program_ref: input.cmm_program_ref,
    sampling_plan: input.sampling_plan || "First article: 100%. Production: AQL 1.0 per ANSI/ASQ Z1.4.",
    total_inspection_time_min: Math.round(total_inspection_time_min),
    notes,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** EDM Cost Documentation Engine — MS17 (Cost) + MS18 (Documentation) */
export class EDMCostDocumentationEngine {

  /**
   * estimate_cost — MS17-U05
   * Aggregates machine time, wire, consumables, post-process into full cost estimate
   * with overhead, margin, quantity breaks, and process comparison.
   */
  estimateCost(input: CostInput): CostEstimate {
    return aggregateTotalCost(input);
  }

  /**
   * generate_setup_sheet — MS18-U01
   * Builds a complete WEDM setup sheet including checklist, datum, wire params,
   * dielectric settings, start holes, and tech table references.
   */
  generateSetupSheet(input: SetupSheetInput): SetupSheet {
    return generateSetupSheet(input);
  }

  /**
   * generate_documentation — MS18-U02 + U03
   * Builds technology table reference card and cut sequence documentation.
   */
  generateDocumentation(
    techInput: TechTableInput,
    sequenceInput: CutSequenceInput
  ): { tech_table_reference: TechTableRef; cut_sequence: CutSequenceDoc } {
    return {
      tech_table_reference: generateTechTableReference(techInput),
      cut_sequence: generateCutSequence(sequenceInput),
    };
  }

  /**
   * generate_inspection_plan — MS18-U04
   * Builds a structured inspection plan with instrument, when, and measurement points
   * for each feature. Infers instrument from tolerance if not provided.
   */
  generateInspectionPlan(input: InspectionPlanInput): InspectionPlan {
    return generateInspectionPlan(input);
  }

  /**
   * full_package — Combined MS17 + MS18 complete deliverable
   * Returns cost estimate + full documentation package in one call.
   */
  fullPackage(input: FullPackageInput): EDMDocumentationPackage {
    const cost_estimate = aggregateTotalCost(input.cost_input);
    const setup_sheet = generateSetupSheet(input.setup_input);
    const { tech_table_reference, cut_sequence } = this.generateDocumentation(
      input.tech_table_input,
      input.cut_sequence_input
    );
    const inspection_plan = generateInspectionPlan(input.inspection_input);
    const safety_notes = generateSafetyNotes(
      input.setup_input.material,
      input.setup_input.wire_type,
      input.setup_input.dielectric_type || "deionized_water"
    );

    return {
      cost_estimate,
      setup_sheet,
      tech_table_reference,
      cut_sequence,
      inspection_plan,
      safety_notes,
      generated_at: new Date().toISOString(),
    };
  }

  // ---- Individual sub-calculator accessors (for unit testing) ----

  /** MS17-U01 — Machine time cost only */
  calcMachineTime(input: MachineTimeInput): MachineTimeCost {
    return calculateMachineTimeCost(input);
  }

  /** MS17-U02 — Wire cost only */
  calcWireCost(input: WireInput): WireCost {
    return calculateWireCost(input);
  }

  /** MS17-U03 — Consumables cost only */
  calcConsumablesCost(input: ConsumablesInput): ConsumablesCost {
    return calculateConsumablesCost(input);
  }

  /** MS17-U04 — Post-process cost only */
  calcPostProcessCost(input: PostProcessInput): PostProcessCost {
    return calculatePostProcessCost(input);
  }

  /** MS18-U05 — Safety notes only */
  getSafetyNotes(material: string, wireType: WireType, dielectricType: "deionized_water" | "oil"): string[] {
    return generateSafetyNotes(material, wireType, dielectricType);
  }
}

/** Singleton instance */
export const edmCostDocumentationEngine = new EDMCostDocumentationEngine();
