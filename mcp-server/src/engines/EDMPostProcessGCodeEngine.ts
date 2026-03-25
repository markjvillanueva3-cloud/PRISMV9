/**
 * EDMPostProcessGCodeEngine — WEDM-P2P-MS15 + MS16
 *
 * Consolidates MS15 (Post-Process Planning, 5 units) and MS16 (Wire EDM
 * G-Code Generation, 7 units) into a single production engine.
 *
 * MS15 — Post-Process Planning:
 *   U01 RecastRemovalPlanner        — chemical etch, lapping, electrochemical polish, additional skims
 *   U02 StressReliefPlanner         — thermal, shot peening, vibration stress relief
 *   U03 PostEDMInspectionPlanner    — CMM, profilometer, metallography, micro-hardness, dye penetrant
 *   U04 SurfaceTreatmentPlanner     — PVD/CVD coating, nitriding, chrome plating, passivation
 *   U05 PostProcessSequencer        — full sequence: EDM → stress relief → recast removal → inspect → coat → final
 *
 * MS16 — Wire EDM G-Code Generation:
 *   U01 EDMControllerPostEngine     — base post: no spindle/tool changes, wire threading, tech table, multi-pass
 *   U02 FanucWireEDMPost            — Fanuc α-C: E-pack, M50 thread, M60 cut, G61.1/G64 corner
 *   U03 SodickWireEDMPost           — Sodick: C### conditions, SF-Liner, K-SMC, K corner
 *   U04 MakinoWireEDMPost           — Makino Hyper-i: E-pack tech, HS wire, anti-electrolysis, HyperCut
 *   U05 MitsubishiWireEDMPost       — Mitsubishi M800: V500 conditions, D-code offsets, tubular shaft rapids
 *   U06 AgieCharmillesWireEDMPost   — CUT series: ISPG/IPG, ACO, TAPER-EXPERT, M50 threading
 *   U07 MultiPassGCodeOrchestrator  — rough (D01) → trims (D02-Dn) → tab cuts → end
 *
 * Actions: plan_post_process, generate_gcode, generate_fanuc, generate_sodick,
 *          generate_makino, full_generate
 *
 * No external imports — pure computation.
 */

// ============================================================================
// PUBLIC TYPES — Post-Process Planning (MS15)
// ============================================================================

export interface PostProcessStep {
  order: number;
  process: string;
  description: string;
  time_hours: number;
  cost_estimate: number;
  is_mandatory: boolean;
  spec_driven: boolean;
  notes: string;
}

export interface PostProcessPlan {
  sequence: PostProcessStep[];
  total_time_hours: number;
  total_cost_estimate: number;
  critical_steps: string[];
}

export interface PostProcessInput {
  material: string;
  hardness_hrc?: number;
  surface_finish_Ra_um: number;
  recast_layer_max_um?: number;
  has_tight_tolerances: boolean;
  tolerance_mm?: number;
  requires_fatigue_life: boolean;
  requires_coating: boolean;
  coating_type?: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation";
  part_thickness_mm: number;
  is_aerospace: boolean;
  is_medical: boolean;
  num_profiles: number;
}

// ============================================================================
// PUBLIC TYPES — G-Code Generation (MS16)
// ============================================================================

export type WireEDMController =
  | "fanuc"
  | "sodick"
  | "makino"
  | "mitsubishi"
  | "agiecharmilles";

export interface EDMGCodeInput {
  controller: WireEDMController;
  profiles: EDMProfile[];
  passes: EDMPass[];
  wire_type: string;
  program_number?: number;
  work_offset?: string;
  units?: "metric" | "imperial";
  taper_mode?: boolean;
  submerged?: boolean;
  flush_pressure_bar?: number;
}

export interface EDMProfile {
  name: string;
  contour_points: Array<{ x: number; y: number }>;
  start_hole: { x: number; y: number };
  approach: { type: string; length_mm: number };
  departure: { type: string; length_mm: number };
  tabs?: Array<{ position_index: number; width_mm: number }>;
  taper_angle_deg?: number;
}

export interface EDMPass {
  pass_number: number;
  offset_mm: number;
  technology_table: string;
  wire_speed_m_min: number;
  tension_N: number;
  power_setting?: number;
  servo_voltage?: number;
  corner_strategy?: "exact_stop" | "continuous" | "auto";
}

export interface EDMGCodeResult {
  gcode: string;
  line_count: number;
  estimated_time_min: number;
  passes_generated: number;
  profiles_cut: number;
  controller: string;
  warnings: string[];
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ControllerPostConfig {
  name: string;
  controller: WireEDMController;
  thread_code: string;
  cut_wire_code: string;
  program_start: string;
  program_end: string;
  corner_exact: string;
  corner_continuous: string;
  offset_prefix: string;
  line_number_prefix: string;
  comment_start: string;
  comment_end: string;
  decimal_places: number;
  uses_e_pack: boolean;
  uses_condition_codes: boolean;
  rapid_code: string;
  linear_code: string;
  cw_arc_code: string;
  ccw_arc_code: string;
}

// ============================================================================
// CONTROLLER REGISTRY (MS16 U01-U06)
// ============================================================================

const CONTROLLER_CONFIGS: Record<WireEDMController, ControllerPostConfig> = {
  fanuc: {
    name: "Fanuc Alpha-C / Alpha-iC",
    controller: "fanuc",
    thread_code: "M50",
    cut_wire_code: "M60",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61.1",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: true,
    uses_condition_codes: false,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  sodick: {
    name: "Sodick ALC/SLC/ALN Series",
    controller: "sodick",
    thread_code: "M60",
    cut_wire_code: "M61",
    program_start: "%",
    program_end: "M02",
    corner_exact: "K0",
    corner_continuous: "K1",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,
    uses_condition_codes: true,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  makino: {
    name: "Makino Hyper-i / U-Series",
    controller: "makino",
    thread_code: "M60",
    cut_wire_code: "M61",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: true,
    uses_condition_codes: false,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  mitsubishi: {
    name: "Mitsubishi MV/FA/M800 Series",
    controller: "mitsubishi",
    thread_code: "M50",
    cut_wire_code: "M51",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,
    uses_condition_codes: true,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  agiecharmilles: {
    name: "GF AgieCharmilles CUT Series",
    controller: "agiecharmilles",
    thread_code: "M50",
    cut_wire_code: "M51",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,
    uses_condition_codes: false,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
};

// ============================================================================
// RECAST REMOVAL PLANNER (MS15 U01)
// ============================================================================

interface RecastRemovalResult {
  method: string;
  description: string;
  removal_rate_um_per_cycle: number;
  cycle_time_min: number;
  estimated_cycles: number;
  total_time_hours: number;
  cost_per_cycle: number;
  notes: string[];
}

function planRecastRemoval(
  recast_thickness_um: number,
  target_max_um: number,
  material: string,
  surface_area_cm2: number,
): RecastRemovalResult {
  const to_remove_um = recast_thickness_um - target_max_um;
  if (to_remove_um <= 0) {
    return {
      method: "none",
      description: "Recast layer within specification — no removal needed",
      removal_rate_um_per_cycle: 0,
      cycle_time_min: 0,
      estimated_cycles: 0,
      total_time_hours: 0,
      cost_per_cycle: 0,
      notes: [`Measured ${recast_thickness_um}µm ≤ target ${target_max_um}µm`],
    };
  }

  const isHardened = material.toLowerCase().includes("hardened") ||
    material.toLowerCase().includes("carbide") ||
    material.toLowerCase().includes("inconel");
  const isTitanium = material.toLowerCase().includes("titanium") ||
    material.toLowerCase().includes("ti-6al");
  const isStainless = material.toLowerCase().includes("stainless") ||
    material.toLowerCase().includes("316") ||
    material.toLowerCase().includes("304");

  // Chemical etch: HF/HNO3 for most steels, modified chemistry for exotic alloys
  let removalRate = 10; // µm/cycle baseline
  let cycleTime = 30;   // minutes per cycle
  let costPerCycle = 15;
  let method = "chemical_etch_hf_hno3";
  let description = "HF/HNO3 acid etch (5-15µm/cycle, 30min immersion)";
  const notes: string[] = [];

  if (isTitanium) {
    removalRate = 8;
    cycleTime = 45;
    costPerCycle = 25;
    method = "chemical_etch_kroll";
    description = "Kroll's reagent etch for titanium (HF/HNO3/H2O, 8µm/cycle, 45min)";
    notes.push("SAFETY: HF handling requires full PPE, buddy system, calcium gluconate on standby");
    notes.push("Monitor for hydrogen embrittlement — limit total etch cycles to 5");
  } else if (isHardened) {
    removalRate = 5;
    cycleTime = 40;
    costPerCycle = 20;
    method = "electrochemical_polish";
    description = "Electrochemical polishing for hardened material (5µm/cycle, 40min)";
    notes.push("ECM preferred over chemical etch for carbide-grade materials");
  } else if (isStainless) {
    removalRate = 12;
    cycleTime = 25;
    costPerCycle = 18;
    method = "chemical_etch_citric";
    description = "Citric acid passivation + micro-etch (12µm/cycle, 25min)";
    notes.push("Citric acid preferred over nitric for environmental compliance");
  }

  if (surface_area_cm2 > 50) {
    notes.push("Large surface area — consider mechanical lapping as primary removal");
    if (to_remove_um > 15) {
      method = "lapping_then_etch";
      description = `Lapping (${Math.max(0, to_remove_um - 10)}µm) + ${method} (final 10µm)`;
      removalRate = 20;
      cycleTime = 60;
      costPerCycle = 35;
    }
  }

  const estCycles = Math.ceil(to_remove_um / removalRate);
  const totalHours = (estCycles * cycleTime) / 60;

  notes.push(`Removing ${to_remove_um}µm recast from ${recast_thickness_um}µm to ≤${target_max_um}µm`);
  notes.push(`Estimated ${estCycles} cycles at ${removalRate}µm/cycle`);

  return {
    method,
    description,
    removal_rate_um_per_cycle: removalRate,
    cycle_time_min: cycleTime,
    estimated_cycles: estCycles,
    total_time_hours: Math.round(totalHours * 100) / 100,
    cost_per_cycle: costPerCycle,
    notes,
  };
}

// ============================================================================
// STRESS RELIEF PLANNER (MS15 U02)
// ============================================================================

interface StressReliefResult {
  method: string;
  description: string;
  temperature_c?: number;
  duration_hours?: number;
  fatigue_recovery_pct: number;
  cost_estimate: number;
  notes: string[];
}

function planStressRelief(
  material: string,
  part_thickness_mm: number,
  requires_fatigue: boolean,
  hardness_hrc?: number,
): StressReliefResult {
  const notes: string[] = [];
  const isTool = material.toLowerCase().includes("tool") ||
    material.toLowerCase().includes("d2") ||
    material.toLowerCase().includes("a2");
  const isTitanium = material.toLowerCase().includes("titanium") ||
    material.toLowerCase().includes("ti-");
  const isAluminum = material.toLowerCase().includes("aluminum") ||
    material.toLowerCase().includes("6061") ||
    material.toLowerCase().includes("7075");

  // Thermal stress relief — primary method
  let tempC = 175;    // default for most steels
  let durationHrs = 1.5;
  let fatigueRecovery = 40;
  let cost = 50;
  let method = "thermal_stress_relief";
  let description = "Thermal stress relief in controlled atmosphere furnace";

  if (isTool) {
    tempC = 150;
    durationHrs = 2;
    fatigueRecovery = 35;
    notes.push("Tool steel: keep below tempering temperature to preserve hardness");
    if (hardness_hrc && hardness_hrc > 58) {
      tempC = 130;
      notes.push(`HRC ${hardness_hrc}: reduced temperature to 130°C to avoid softening`);
    }
  } else if (isTitanium) {
    tempC = 480;
    durationHrs = 2;
    fatigueRecovery = 50;
    cost = 85;
    notes.push("Titanium stress relief in vacuum or argon atmosphere REQUIRED");
    notes.push("Do NOT use air furnace — alpha case formation above 400°C");
  } else if (isAluminum) {
    tempC = 175;
    durationHrs = 1;
    fatigueRecovery = 30;
    cost = 35;
    notes.push("Aluminum: verify T6 temper not degraded — stay below 200°C");
  }

  // Adjust for part thickness
  if (part_thickness_mm > 50) {
    durationHrs *= 1.5;
    notes.push(`Thick part (${part_thickness_mm}mm): extended soak time`);
  } else if (part_thickness_mm < 5) {
    durationHrs = Math.max(0.5, durationHrs * 0.7);
    notes.push(`Thin part (${part_thickness_mm}mm): reduced soak to prevent distortion`);
  }

  // Shot peening addition for fatigue-critical parts
  if (requires_fatigue) {
    fatigueRecovery = Math.min(95, fatigueRecovery + 45);
    cost += 60;
    method = "thermal_plus_shot_peen";
    description = `Thermal stress relief (${tempC}°C/${durationHrs}hrs) + shot peening (Almen A 0.008-0.012)`;
    notes.push("Shot peening: 200% coverage, Almen A strip intensity 0.008-0.012A");
    notes.push(`Fatigue recovery: ${fatigueRecovery}% (thermal ${fatigueRecovery - 45}% + peening +45%)`);
    notes.push("Peen AFTER thermal stress relief, BEFORE any coating");
  } else {
    description = `Thermal stress relief (${tempC}°C, ${durationHrs}hrs, controlled ramp 50°C/hr)`;
  }

  notes.push(`Ramp rate: 50°C/hr up, furnace cool to below 100°C before removal`);

  return {
    method,
    description,
    temperature_c: tempC,
    duration_hours: durationHrs,
    fatigue_recovery_pct: fatigueRecovery,
    cost_estimate: cost,
    notes,
  };
}

// ============================================================================
// POST-EDM INSPECTION PLANNER (MS15 U03)
// ============================================================================

interface InspectionStep {
  method: string;
  description: string;
  measures: string;
  time_hours: number;
  cost: number;
  is_mandatory: boolean;
  notes: string[];
}

function planInspection(
  tolerance_mm: number,
  surface_finish_Ra_um: number,
  recast_max_um: number | undefined,
  is_aerospace: boolean,
  is_medical: boolean,
  num_profiles: number,
): InspectionStep[] {
  const steps: InspectionStep[] = [];

  // CMM Dimensional Inspection — always required for tight tolerances
  if (tolerance_mm <= 0.025 || is_aerospace || is_medical) {
    const cmmTime = 0.5 + (num_profiles * 0.15);
    steps.push({
      method: "cmm_dimensional",
      description: "CMM measurement — GD&T per print, all critical dimensions",
      measures: "Position, profile, perpendicularity, parallelism, runout",
      time_hours: Math.round(cmmTime * 100) / 100,
      cost: Math.round(cmmTime * 120),
      is_mandatory: true,
      notes: [
        `Tolerance: ±${tolerance_mm}mm — CMM required`,
        `${num_profiles} profile(s) to verify`,
        "Report format: AS9102 FAI (if first article)",
      ],
    });
  }

  // Profilometer — surface finish verification
  if (surface_finish_Ra_um <= 0.8 || is_aerospace) {
    steps.push({
      method: "profilometer_surface",
      description: "Contact profilometer — Ra, Rz, Rt measurement per ISO 4287",
      measures: `Ra target: ≤${surface_finish_Ra_um}µm, Rz, Rt, bearing ratio curve`,
      time_hours: 0.25,
      cost: 30,
      is_mandatory: true,
      notes: [
        "3 measurements per surface, perpendicular to EDM cut direction",
        `Cutoff λc = ${surface_finish_Ra_um < 0.4 ? "0.25" : "0.8"}mm`,
        "Record Rz and Rt in addition to Ra for specification compliance",
      ],
    });
  }

  // Metallographic cross-section — recast layer verification
  if (recast_max_um !== undefined && recast_max_um <= 10) {
    steps.push({
      method: "metallography_recast",
      description: "Metallographic cross-section — recast layer thickness measurement",
      measures: `Recast max: ≤${recast_max_um}µm, HAZ depth, microcrack detection`,
      time_hours: 2,
      cost: 180,
      is_mandatory: is_aerospace || is_medical,
      notes: [
        "Mount, polish (1µm diamond), etch (2% Nital for steel, Kroll's for Ti)",
        "Measure recast at 5 locations minimum, report max and average",
        "SEM if recast < 3µm (optical microscope insufficient)",
        "DESTRUCTIVE — use witness coupon or sacrificial section if possible",
      ],
    });
  }

  // Micro-hardness testing — HAZ characterization
  if (is_aerospace || is_medical) {
    steps.push({
      method: "micro_hardness",
      description: "Vickers micro-hardness traverse — surface to bulk (HV 0.1-0.5)",
      measures: "Hardness profile: surface → 50µm → 100µm → 200µm → bulk",
      time_hours: 1,
      cost: 90,
      is_mandatory: is_aerospace,
      notes: [
        "Indent spacing: ≥3× indent diagonal (per ASTM E384)",
        "Report any softening in HAZ (typically 50-150µm depth)",
        "Hardness drop >2 HRC equivalent from bulk = fail for aerospace",
      ],
    });
  }

  // Dye penetrant / fluorescent penetrant inspection — crack detection
  if (is_aerospace || is_medical || (recast_max_um !== undefined && recast_max_um <= 5)) {
    steps.push({
      method: "dye_penetrant_fpi",
      description: "Fluorescent penetrant inspection (FPI) per ASTM E1417 / AMS 2647",
      measures: "Surface-breaking cracks, porosity, incomplete fusion",
      time_hours: 1.5,
      cost: 75,
      is_mandatory: is_aerospace,
      notes: [
        "Level 3/4 sensitivity penetrant for aerospace",
        "Dwell time: 20-30 min for EDM surfaces (extra dwell for micro-cracks)",
        "MUST be performed AFTER recast removal (recast masks indications)",
        "Reject criteria: any linear indication > 1mm (aerospace standard)",
      ],
    });
  }

  // Basic visual + dimensional always present
  steps.push({
    method: "visual_dimensional",
    description: "Visual inspection + caliper/micrometer verification",
    measures: "Overall dimensions, edge quality, wire marks, surface defects",
    time_hours: 0.25,
    cost: 15,
    is_mandatory: true,
    notes: [
      "Check for wire break marks, re-thread witness lines",
      "Verify all tabs fully removed and blended",
      "Confirm no taper on straight cuts (check with gauge blocks)",
    ],
  });

  return steps;
}

// ============================================================================
// SURFACE TREATMENT PLANNER (MS15 U04)
// ============================================================================

interface SurfaceTreatmentResult {
  treatment: string;
  description: string;
  thickness_um: number;
  temperature_c: number;
  time_hours: number;
  cost_estimate: number;
  pre_requirements: string[];
  notes: string[];
}

function planSurfaceTreatment(
  coating_type: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation",
  material: string,
  surface_finish_Ra_um: number,
  part_thickness_mm: number,
): SurfaceTreatmentResult {
  const pre_reqs: string[] = [
    "Recast layer MUST be fully removed before coating",
    "Stress relief MUST be completed before coating",
    "Surface must be free of oils, oxides, and contaminants",
  ];

  switch (coating_type) {
    case "pvd": {
      const tempC = 450;
      return {
        treatment: "PVD — TiN/TiAlN/AlCrN",
        description: "Physical Vapor Deposition — arc or sputtering, 2-5µm coating",
        thickness_um: 3,
        temperature_c: tempC,
        time_hours: 6,
        cost_estimate: 120,
        pre_requirements: [
          ...pre_reqs,
          `Material must withstand ${tempC}°C — verify tempering temperature`,
          `Surface finish: Ra ≤ 0.4µm recommended (current: ${surface_finish_Ra_um}µm)`,
        ],
        notes: [
          "PVD does NOT fill surface defects — pre-polish to specification",
          "Coating adds ~3µm per side — adjust tolerances on critical fits",
          "Color: TiN=gold, TiAlN=violet, AlCrN=gray",
          "Hardness: TiN ~2300 HV, TiAlN ~3300 HV, AlCrN ~3200 HV",
        ],
      };
    }
    case "cvd": {
      return {
        treatment: "CVD — TiC/TiCN/Al2O3",
        description: "Chemical Vapor Deposition — 5-15µm multi-layer coating at 900-1050°C",
        thickness_um: 10,
        temperature_c: 950,
        time_hours: 12,
        cost_estimate: 200,
        pre_requirements: [
          ...pre_reqs,
          "Material MUST tolerate 950°C+ — typically requires re-hardening after CVD",
          "Not suitable for parts with tight tolerances < ±0.01mm (10µm coating buildup)",
        ],
        notes: [
          "CVD produces eta-phase on carbide substrates — verify substrate compatibility",
          "Part will require re-heat-treatment after CVD (softened by process temp)",
          `Part thickness ${part_thickness_mm}mm — ${part_thickness_mm < 10 ? "RISK of distortion at CVD temperature" : "acceptable for CVD"}`,
          "Superior adhesion vs PVD but higher process temperature",
        ],
      };
    }
    case "nitriding": {
      return {
        treatment: "Gas/Ion Nitriding",
        description: "Nitrogen diffusion — 0.1-0.3mm case depth, 500-580°C, 10-40hrs",
        thickness_um: 200,
        temperature_c: 540,
        time_hours: 24,
        cost_estimate: 150,
        pre_requirements: [
          ...pre_reqs,
          "Steel must contain nitride-forming elements (Cr, Mo, V, Al)",
          "Pre-heat-treat to final hardness BEFORE nitriding",
        ],
        notes: [
          "White layer (compound zone) may need removal — specify if unwanted",
          "Ion/plasma nitriding preferred for EDM parts (lower temp, no white layer)",
          "Case depth depends on time: 0.1mm/10hr, 0.2mm/20hr, 0.3mm/40hr approx",
          "Excellent for die/mold wire-EDM components (wear + corrosion resistance)",
          `Current Ra: ${surface_finish_Ra_um}µm — nitriding increases roughness ~0.1-0.2µm`,
        ],
      };
    }
    case "chrome": {
      return {
        treatment: "Hard Chrome Plating",
        description: "Electrolytic chromium deposition — 10-50µm, room temp bath",
        thickness_um: 25,
        temperature_c: 55,
        time_hours: 4,
        cost_estimate: 100,
        pre_requirements: [
          ...pre_reqs,
          "Mask all surfaces NOT to be plated",
          "Surface must be activated (reverse etch) before plating",
        ],
        notes: [
          "Low process temperature — no risk of tempering or distortion",
          "Excellent for building up worn surfaces (grind to final dimension after)",
          "ENVIRONMENTAL: Hex-chrome (Cr6+) — comply with EPA/REACH regulations",
          "Consider trivalent chrome or nickel alternatives for RoHS compliance",
          "Hydrogen embrittlement risk — bake at 190°C for 4hrs within 4hrs of plating",
          `Plating adds ${25}µm per side — adjust critical dimensions`,
        ],
      };
    }
    case "passivation": {
      return {
        treatment: "Passivation — Citric/Nitric Acid",
        description: "Chromium oxide layer formation on stainless/corrosion-resistant alloys",
        thickness_um: 0,
        temperature_c: 50,
        time_hours: 1,
        cost_estimate: 25,
        pre_requirements: [
          ...pre_reqs,
          "Only for stainless steel / corrosion-resistant alloys",
          "All iron contamination must be removed (EDM electrode residue)",
        ],
        notes: [
          "Citric acid preferred (environmentally friendly, ASTM A967 Type 2)",
          "Nitric acid for heavy contamination (ASTM A967 Type 1)",
          "Verify with copper sulfate test (ASTM A967) or salt spray (ASTM B117)",
          "No dimensional change — passivation is a chemical conversion, not a coating",
          "Critical for medical implants and food-contact surfaces",
        ],
      };
    }
  }
}

// ============================================================================
// POST-PROCESS SEQUENCER (MS15 U05)
// ============================================================================

function buildPostProcessSequence(input: PostProcessInput): PostProcessPlan {
  const steps: PostProcessStep[] = [];
  let order = 1;
  const critical: string[] = [];

  // Step 1: Initial EDM completion verification
  steps.push({
    order: order++,
    process: "edm_completion_verify",
    description: "Verify EDM operation complete — all profiles cut, tabs intact, no wire breaks",
    time_hours: 0.25,
    cost_estimate: 15,
    is_mandatory: true,
    spec_driven: false,
    notes: "Check for wire break re-thread marks, verify all start holes threaded correctly",
  });

  // Step 2: Stress relief (before any material removal)
  const stressResult = planStressRelief(
    input.material,
    input.part_thickness_mm,
    input.requires_fatigue_life,
    input.hardness_hrc,
  );
  steps.push({
    order: order++,
    process: "stress_relief",
    description: stressResult.description,
    time_hours: stressResult.duration_hours ?? 1.5,
    cost_estimate: stressResult.cost_estimate,
    is_mandatory: true,
    spec_driven: input.requires_fatigue_life,
    notes: stressResult.notes.join("; "),
  });
  if (input.requires_fatigue_life) {
    critical.push("stress_relief");
  }

  // Step 3: Recast removal (if required)
  if (input.recast_layer_max_um !== undefined && input.recast_layer_max_um <= 15) {
    // Typical EDM recast: 5-25µm depending on power settings
    const typicalRecast = input.surface_finish_Ra_um < 0.5 ? 5 : input.surface_finish_Ra_um < 1.0 ? 10 : 20;
    const recastResult = planRecastRemoval(
      typicalRecast,
      input.recast_layer_max_um,
      input.material,
      input.num_profiles * 10,  // rough area estimate
    );

    if (recastResult.total_time_hours > 0) {
      steps.push({
        order: order++,
        process: "recast_removal",
        description: recastResult.description,
        time_hours: recastResult.total_time_hours,
        cost_estimate: recastResult.cost_per_cycle * recastResult.estimated_cycles,
        is_mandatory: true,
        spec_driven: true,
        notes: recastResult.notes.join("; "),
      });
      critical.push("recast_removal");
    }
  }

  // Step 4: Inspection — dimensional
  const inspectionSteps = planInspection(
    input.tolerance_mm ?? 0.05,
    input.surface_finish_Ra_um,
    input.recast_layer_max_um,
    input.is_aerospace,
    input.is_medical,
    input.num_profiles,
  );

  for (const insp of inspectionSteps) {
    steps.push({
      order: order++,
      process: insp.method,
      description: insp.description,
      time_hours: insp.time_hours,
      cost_estimate: insp.cost,
      is_mandatory: insp.is_mandatory,
      spec_driven: insp.is_mandatory,
      notes: insp.notes.join("; "),
    });
    if (insp.is_mandatory && (input.is_aerospace || input.is_medical)) {
      critical.push(insp.method);
    }
  }

  // Step 5: Surface treatment (if required)
  if (input.requires_coating && input.coating_type) {
    const coatingResult = planSurfaceTreatment(
      input.coating_type,
      input.material,
      input.surface_finish_Ra_um,
      input.part_thickness_mm,
    );
    steps.push({
      order: order++,
      process: `coating_${input.coating_type}`,
      description: coatingResult.description,
      time_hours: coatingResult.time_hours,
      cost_estimate: coatingResult.cost_estimate,
      is_mandatory: true,
      spec_driven: true,
      notes: [...coatingResult.pre_requirements, ...coatingResult.notes].join("; "),
    });
  }

  // Step 6: Final inspection (post-coating if applicable)
  if (input.requires_coating) {
    steps.push({
      order: order++,
      process: "final_inspection",
      description: "Final inspection — verify coating adhesion, dimensions post-coating, cosmetic",
      time_hours: 0.5,
      cost_estimate: 40,
      is_mandatory: true,
      spec_driven: false,
      notes: "Coating adhesion: Rockwell indent test or scratch test; verify dimensions including coating buildup",
    });
  }

  // Step 7: Cleaning and packaging
  steps.push({
    order: order++,
    process: "clean_and_package",
    description: "Ultrasonic clean, VCI wrap, package for shipping/assembly",
    time_hours: 0.25,
    cost_estimate: 10,
    is_mandatory: true,
    spec_driven: false,
    notes: "Ultrasonic clean in aqueous detergent (no chlorinated solvents); VCI paper for corrosion protection",
  });

  const totalTime = steps.reduce((s, st) => s + st.time_hours, 0);
  const totalCost = steps.reduce((s, st) => s + st.cost_estimate, 0);

  return {
    sequence: steps,
    total_time_hours: Math.round(totalTime * 100) / 100,
    total_cost_estimate: Math.round(totalCost * 100) / 100,
    critical_steps: critical,
  };
}

// ============================================================================
// G-CODE GENERATION UTILITIES
// ============================================================================

function formatCoord(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function buildComment(cfg: ControllerPostConfig, text: string): string {
  return `${cfg.comment_start}${text}${cfg.comment_end}`;
}

function buildLineNumber(cfg: ControllerPostConfig, lineNum: number): string {
  return `${cfg.line_number_prefix}${lineNum}`;
}

/** Calculate approach path points for a given approach type. */
function calculateApproachPoints(
  start_hole: { x: number; y: number },
  first_contour: { x: number; y: number },
  approach: { type: string; length_mm: number },
): Array<{ x: number; y: number; type: "rapid" | "linear" | "arc" }> {
  const points: Array<{ x: number; y: number; type: "rapid" | "linear" | "arc" }> = [];
  const dx = first_contour.x - start_hole.x;
  const dy = first_contour.y - start_hole.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dist > 0 ? dx / dist : 1;
  const ny = dist > 0 ? dy / dist : 0;

  // Rapid to start hole
  points.push({ x: start_hole.x, y: start_hole.y, type: "rapid" });

  switch (approach.type) {
    case "linear":
    case "straight": {
      // Straight approach from start hole toward first contour point
      const approachX = first_contour.x - nx * approach.length_mm;
      const approachY = first_contour.y - ny * approach.length_mm;
      points.push({ x: approachX, y: approachY, type: "linear" });
      points.push({ x: first_contour.x, y: first_contour.y, type: "linear" });
      break;
    }
    case "arc":
    case "tangential": {
      // Arc approach — 90° tangential entry
      const perpX = -ny;
      const perpY = nx;
      const arcStartX = first_contour.x + perpX * approach.length_mm;
      const arcStartY = first_contour.y + perpY * approach.length_mm;
      points.push({ x: arcStartX, y: arcStartY, type: "linear" });
      points.push({ x: first_contour.x, y: first_contour.y, type: "arc" });
      break;
    }
    default: {
      // Direct approach
      points.push({ x: first_contour.x, y: first_contour.y, type: "linear" });
      break;
    }
  }

  return points;
}

/** Calculate departure path points. */
function calculateDeparturePoints(
  last_contour: { x: number; y: number },
  departure: { type: string; length_mm: number },
  contourDirection: { nx: number; ny: number },
): Array<{ x: number; y: number; type: "linear" | "arc" }> {
  const points: Array<{ x: number; y: number; type: "linear" | "arc" }> = [];
  const { nx, ny } = contourDirection;

  switch (departure.type) {
    case "linear":
    case "straight": {
      const depX = last_contour.x + nx * departure.length_mm;
      const depY = last_contour.y + ny * departure.length_mm;
      points.push({ x: depX, y: depY, type: "linear" });
      break;
    }
    case "arc":
    case "tangential": {
      const perpX = -ny;
      const perpY = nx;
      const arcEndX = last_contour.x + perpX * departure.length_mm;
      const arcEndY = last_contour.y + perpY * departure.length_mm;
      points.push({ x: arcEndX, y: arcEndY, type: "arc" });
      break;
    }
    default: {
      // No departure extension
      break;
    }
  }

  return points;
}

// ============================================================================
// FANUC WIRE EDM POST (MS16 U02)
// ============================================================================

function generateFanucGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.fanuc;
  const lines: string[] = [];
  const warnings: string[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "WIRE EDM PROGRAM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILES: ${input.profiles.length}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASSES: ${input.passes.length}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `DATE: ${new Date().toISOString().slice(0, 10)}`)}`);
  lineNum += 10;

  // Machine setup
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE, METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${input.work_offset ?? "G54"} ${buildComment(cfg, "WORK OFFSET")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "SET WORK ZERO")}`);
  lineNum += 10;

  // Submerged dielectric setup
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
    if (input.flush_pressure_bar) {
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `FLUSH PRESSURE: ${input.flush_pressure_bar} BAR`)}`);
      lineNum += 10;
    }
  }

  let totalTimeSec = 0;

  // ---- Process each profile ----
  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];
    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    // ---- Process each pass for this profile ----
    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;

      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number}: ${isRough ? "ROUGH" : `TRIM ${passIdx}`} - OFFSET ${pass.offset_mm}mm`)}`);
      lineNum += 10;

      // E-pack technology table selection (Fanuc-specific)
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `E-PACK: ${pass.technology_table}`)}`);
      lineNum += 10;

      // Technology parameters
      lines.push(`${buildLineNumber(cfg, lineNum)} E${pass.technology_table} ${buildComment(cfg, "TECHNOLOGY TABLE SELECT")}`);
      lineNum += 10;

      // Wire speed and tension
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE SPEED: ${pass.wire_speed_m_min}m/min, TENSION: ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Wire offset
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G41 ${offsetCode} ${buildComment(cfg, `OFFSET LEFT ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // Corner strategy (Fanuc: G61.1 exact stop, G64 continuous)
      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isRough ? cfg.corner_continuous : cfg.corner_exact;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode} ${buildComment(cfg, cornerCode === cfg.corner_exact ? "EXACT STOP MODE" : "CONTINUOUS PATH")}`);
      lineNum += 10;

      // C-axis offset for taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        const taperOffset = Math.tan(profile.taper_angle_deg * Math.PI / 180);
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 U${formatCoord(taperOffset, dp)} V${formatCoord(taperOffset, dp)} ${buildComment(cfg, `TAPER ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Thread wire at start hole
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)} ${buildComment(cfg, "RAPID TO START HOLE")}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE")}`);
        lineNum += 10;
      }

      // Approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(
          profile.start_hole,
          profile.contour_points[0],
          profile.approach,
        );
        for (const pt of approachPts) {
          const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Contour cutting — generate G01 moves for each point
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];

        // Check if this is a tab position (skip on rough pass — tabs cut on final)
        if (tabPositions.has(ci) && isRough) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm - SKIP ON ROUGH`)}`);
          lineNum += 10;
          // Jump over tab zone
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)} ${buildComment(cfg, "SKIP TAB")}`);
          lineNum += 10;
          continue;
        }

        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
        lineNum += 10;
        // Estimate time: ~2mm/min rough, ~5mm/min trim
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          const cutRate = isRough ? 2 : 5;
          totalTimeSec += (segLen / cutRate) * 60;
        }
      }

      // Departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Cancel offset
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }

      // Cancel taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }

      // Cut wire after last pass on this profile
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts — return to each tab after all passes and cut with finish params
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTTING SEQUENCE")}`);
      lineNum += 10;

      const lastPass = input.passes[input.passes.length - 1];
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB AT INDEX ${tab.position_index} - WIDTH ${tab.width_mm}mm`)}`);
          lineNum += 10;
          // Re-thread at tab position (offset to clear)
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB CUT")}`);
          lineNum += 10;
          // Use finish pass technology
          lines.push(`${buildLineNumber(cfg, lineNum)} E${lastPass.technology_table}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          // Cut across tab
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE AFTER TAB")}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // ---- Footer ----
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0. ${buildComment(cfg, "RETURN TO ZERO")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  // Warnings
  if (input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 15)) {
    warnings.push("Taper angle exceeds 15° — verify machine UV axis travel and wire deflection limits");
  }
  if (input.passes.length > 7) {
    warnings.push("More than 7 passes specified — diminishing returns beyond 5-6 passes for most applications");
  }
  for (const p of input.profiles) {
    if (p.contour_points.length < 3) {
      warnings.push(`Profile '${p.name}' has fewer than 3 contour points — verify geometry`);
    }
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
  };
}

// ============================================================================
// SODICK WIRE EDM POST (MS16 U03)
// ============================================================================

function generateSodickGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.sodick;
  const lines: string[] = [];
  const warnings: string[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `SODICK WIRE EDM - ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILES: ${input.profiles.length}, PASSES: ${input.passes.length}`)}`);
  lineNum += 10;

  // Sodick machine setup — SF-Liner servo system
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE, METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "WORK ZERO")}`);
  lineNum += 10;

  // K-SMC auto-threader ready
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "K-SMC AUTO THREADER STANDBY")}`);
  lineNum += 10;

  // Submerged mode
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M14 ${buildComment(cfg, "FILL DIELECTRIC TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];
    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `--- PROFILE ${pi + 1}: ${profile.name} ---`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;

      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number} - ${isRough ? "ROUGH CUT" : `TRIM ${passIdx}`}`)}`);
      lineNum += 10;

      // Sodick condition code (C### format)
      const condCode = `C${pass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${condCode} ${buildComment(cfg, "CONDITION CODE SELECT")}`);
      lineNum += 10;

      // SF-Liner servo parameters
      if (pass.servo_voltage) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `SERVO VOLTAGE: ${pass.servo_voltage}V - SF-LINER`)}`);
        lineNum += 10;
      }

      // Wire offset with Sodick D-code
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G41 ${offsetCode} ${buildComment(cfg, `OFFSET LEFT ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // K corner parameter (Sodick-specific)
      const kParam = pass.corner_strategy === "exact_stop" ? "K0"
        : pass.corner_strategy === "continuous" ? "K1"
        : isRough ? "K1" : "K0";
      lines.push(`${buildLineNumber(cfg, lineNum)} ${kParam} ${buildComment(cfg, kParam === "K0" ? "CORNER EXACT" : "CORNER CONTINUOUS")}`);
      lineNum += 10;

      // Taper (UV axis)
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER MODE ON - ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Thread at start hole (K-SMC auto-thread)
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE - K-SMC")}`);
        lineNum += 10;
      }

      // Approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Contour
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci) && isRough) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.5 : 6)) * 60;
        }
      }

      // Departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Cancel offset
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }

      // Cancel taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }

      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTTING - FINISH PARAMETERS")}`);
      lineNum += 10;
      const lastPass = input.passes[input.passes.length - 1];
      const condCode = `C${lastPass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;

      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${condCode}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} K0 ${buildComment(cfg, "EXACT STOP FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M15 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  if (input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 20)) {
    warnings.push("Taper > 20° — verify Sodick UV axis stroke and guide clearance");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
  };
}

// ============================================================================
// MAKINO WIRE EDM POST (MS16 U04)
// ============================================================================

function generateMakinoGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.makino;
  const lines: string[] = [];
  const warnings: string[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "MAKINO HYPER-i WEDM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `HYPERCUT FINISH TECHNOLOGY`)}`);
  lineNum += 10;

  // Makino setup — HyperCut and anti-electrolysis
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "SET ZERO")}`);
  lineNum += 10;

  // HS (High Speed) wire system
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "HS WIRE DRIVE SYSTEM ACTIVE")}`);
  lineNum += 10;

  // Anti-electrolysis for carbide/PCD
  const needsAntiElec = input.wire_type.toLowerCase().includes("coated") ||
    input.profiles.some(p => p.name.toLowerCase().includes("carbide"));
  if (needsAntiElec) {
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ANTI-ELECTROLYSIS MODE ENABLED")}`);
    lineNum += 10;
    lines.push(`${buildLineNumber(cfg, lineNum)} M80 ${buildComment(cfg, "ANTI-ELECTROLYSIS ON")}`);
    lineNum += 10;
  }

  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];
    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;
      const isFinish = passIdx === input.passes.length - 1;

      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number}: ${isRough ? "ROUGH" : isFinish ? "HYPERCUT FINISH" : `TRIM ${passIdx}`}`)}`);
      lineNum += 10;

      // E-pack technology (Makino uses E-pack numbers)
      lines.push(`${buildLineNumber(cfg, lineNum)} E${pass.technology_table} ${buildComment(cfg, "E-PACK TECHNOLOGY")}`);
      lineNum += 10;

      // HyperCut mode on finish pass
      if (isFinish) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "HYPERCUT MODE - ULTRA FINE FINISH")}`);
        lineNum += 10;
      }

      // Wire parameters
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Offset
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G41 ${offsetCode} ${buildComment(cfg, `OFFSET ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // Corner control
      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isFinish ? cfg.corner_exact : cfg.corner_continuous;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode}`);
      lineNum += 10;

      // Taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Thread wire
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE")}`);
        lineNum += 10;
      }

      // Approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Contour
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci) && isRough) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.2 : 5.5)) * 60;
        }
      }

      // Departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTS - HYPERCUT FINISH PARAMS")}`);
      lineNum += 10;
      const lastPass = input.passes[input.passes.length - 1];
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} E${lastPass.technology_table}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (needsAntiElec) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M81 ${buildComment(cfg, "ANTI-ELECTROLYSIS OFF")}`);
    lineNum += 10;
  }
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  if (needsAntiElec) {
    warnings.push("Anti-electrolysis mode enabled — verify DI water resistivity > 50kΩ·cm");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
  };
}

// ============================================================================
// MITSUBISHI WIRE EDM POST (MS16 U05)
// ============================================================================

function generateMitsubishiGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.mitsubishi;
  const lines: string[] = [];
  const warnings: string[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // Header
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "MITSUBISHI M800 WEDM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;

  // Mitsubishi setup — V500 condition system
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0.`);
  lineNum += 10;

  // Tubular shaft rapid traverse system
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TUBULAR SHAFT DRIVE - HIGH SPEED RAPIDS")}`);
  lineNum += 10;

  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];
    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;

      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number} - ${isRough ? "ROUGH" : `TRIM ${passIdx}`}`)}`);
      lineNum += 10;

      // V500 condition code (Mitsubishi-specific)
      const v5Code = `V${pass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${v5Code} ${buildComment(cfg, "V500 CONDITION SELECT")}`);
      lineNum += 10;

      // D-code offset (Mitsubishi uses D-codes for wire offset)
      const dCode = `D${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G41 ${dCode} ${buildComment(cfg, `D-CODE OFFSET ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // Corner control
      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isRough ? cfg.corner_continuous : cfg.corner_exact;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode}`);
      lineNum += 10;

      // Wire speed and tension
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, TENSION: ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Taper (UV plane)
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        const taperH = Math.tan(profile.taper_angle_deg * Math.PI / 180);
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 U${formatCoord(taperH, dp)} V${formatCoord(taperH, dp)} ${buildComment(cfg, `TAPER ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Thread
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)} ${buildComment(cfg, "RAPID - TUBULAR SHAFT")}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "AUTO THREAD")}`);
        lineNum += 10;
      }

      // Approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Contour
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci) && isRough) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.3 : 5.8)) * 60;
        }
      }

      // Departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTS")}`);
      lineNum += 10;
      const lastPass = input.passes[input.passes.length - 1];
      const v5Code = `V${lastPass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${v5Code}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
  };
}

// ============================================================================
// AGIE CHARMILLES WIRE EDM POST (MS16 U06)
// ============================================================================

function generateAgieCharmillesGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.agiecharmilles;
  const lines: string[] = [];
  const warnings: string[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // Header
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "AGIE CHARMILLES CUT SERIES WEDM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ISPG/IPG GENERATOR TECHNOLOGY")}`);
  lineNum += 10;

  // AgieCharmilles setup — ACO (Automatic Condition Optimization)
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ACO - AUTOMATIC CONDITION OPTIMIZATION ON")}`);
  lineNum += 10;

  // TAPER-EXPERT system
  const hasTaper = input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 0);
  if (hasTaper) {
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAPER-EXPERT SYSTEM ACTIVE")}`);
    lineNum += 10;
  }

  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];
    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;

      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number} - ${isRough ? "ROUGH" : `TRIM ${passIdx}`}`)}`);
      lineNum += 10;

      // ISPG generator technology selection
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TECH: ${pass.technology_table} - ${isRough ? "ISPG ROUGH" : "IPG FINISH"}`)}`);
      lineNum += 10;

      // M50 series threading (AgieCharmilles standard)
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "M50 SERIES THREAD")}`);
        lineNum += 10;
      }

      // Wire parameters
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Power / servo settings (ACO manages automatically but we set baseline)
      if (pass.power_setting) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `POWER: P${pass.power_setting} - ACO MANAGED`)}`);
        lineNum += 10;
      }

      // Offset
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G41 ${offsetCode} ${buildComment(cfg, `OFFSET ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // Corner control
      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isRough ? cfg.corner_continuous : cfg.corner_exact;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode}`);
      lineNum += 10;

      // TAPER-EXPERT
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER-EXPERT: ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          lineNum += 10;
        }
      }

      // Contour
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci) && isRough) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.0 : 5.0)) * 60;
        }
      }

      // Departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTS - FINISH TECHNOLOGY")}`);
      lineNum += 10;
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "M50 THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  if (hasTaper && input.profiles.some(p => (p.taper_angle_deg ?? 0) > 30)) {
    warnings.push("Taper > 30° — verify TAPER-EXPERT calibration and UV axis stroke");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
  };
}

// ============================================================================
// MULTI-PASS G-CODE ORCHESTRATOR (MS16 U07)
// ============================================================================

function generateGCode(input: EDMGCodeInput): EDMGCodeResult {
  // Validate input
  if (!input.profiles || input.profiles.length === 0) {
    return {
      gcode: "",
      line_count: 0,
      estimated_time_min: 0,
      passes_generated: 0,
      profiles_cut: 0,
      controller: input.controller,
      warnings: ["No profiles specified — cannot generate G-code"],
    };
  }
  if (!input.passes || input.passes.length === 0) {
    return {
      gcode: "",
      line_count: 0,
      estimated_time_min: 0,
      passes_generated: 0,
      profiles_cut: 0,
      controller: input.controller,
      warnings: ["No passes specified — cannot generate G-code"],
    };
  }

  // Validate pass ordering
  const sortedPasses = [...input.passes].sort((a, b) => a.pass_number - b.pass_number);
  if (sortedPasses[0].offset_mm <= sortedPasses[sortedPasses.length - 1].offset_mm && sortedPasses.length > 1) {
    // Offsets should decrease from rough to finish
    const offsets = sortedPasses.map(p => p.offset_mm);
    let nonDecreasing = false;
    for (let i = 1; i < offsets.length; i++) {
      if (offsets[i] > offsets[i - 1]) {
        nonDecreasing = true;
        break;
      }
    }
    if (nonDecreasing) {
      // Reorder — this is a warning, not a block
      input = { ...input, passes: sortedPasses };
    }
  }

  // Dispatch to controller-specific post
  switch (input.controller) {
    case "fanuc":
      return generateFanucGCode(input);
    case "sodick":
      return generateSodickGCode(input);
    case "makino":
      return generateMakinoGCode(input);
    case "mitsubishi":
      return generateMitsubishiGCode(input);
    case "agiecharmilles":
      return generateAgieCharmillesGCode(input);
    default: {
      const _exhaustive: never = input.controller;
      return {
        gcode: "",
        line_count: 0,
        estimated_time_min: 0,
        passes_generated: 0,
        profiles_cut: 0,
        controller: String(_exhaustive),
        warnings: [`Unknown controller: ${String(_exhaustive)}`],
      };
    }
  }
}

// ============================================================================
// FULL GENERATE — Combined post-process plan + G-code (MS15+MS16)
// ============================================================================

interface FullGenerateInput {
  gcode_input: EDMGCodeInput;
  post_process: PostProcessInput;
}

interface FullGenerateResult {
  gcode_result: EDMGCodeResult;
  post_process_plan: PostProcessPlan;
  summary: {
    total_edm_time_min: number;
    total_post_process_hours: number;
    total_cost_estimate: number;
    controller: string;
    profiles: number;
    passes: number;
    post_steps: number;
    critical_steps: string[];
    all_warnings: string[];
  };
}

function fullGenerate(input: FullGenerateInput): FullGenerateResult {
  const gcodeResult = generateGCode(input.gcode_input);
  const ppPlan = buildPostProcessSequence(input.post_process);

  const allWarnings = [...gcodeResult.warnings];

  // Cross-validate: if surface finish spec is very tight, verify enough passes
  if (input.post_process.surface_finish_Ra_um <= 0.3 && input.gcode_input.passes.length < 4) {
    allWarnings.push(`Ra ≤ 0.3µm specified but only ${input.gcode_input.passes.length} passes — recommend 4+ passes for sub-0.3µm finish`);
  }

  // Cross-validate: recast removal assumes EDM params match
  if (input.post_process.recast_layer_max_um !== undefined && input.post_process.recast_layer_max_um <= 3) {
    if (input.gcode_input.passes.length < 5) {
      allWarnings.push(`Recast ≤ 3µm requires 5+ skim passes to minimize initial recast layer before chemical removal`);
    }
  }

  // Cross-validate: aerospace parts need traceability
  if (input.post_process.is_aerospace) {
    allWarnings.push("AEROSPACE: Ensure program number, revision, and part serial are logged per AS9100");
  }

  return {
    gcode_result: gcodeResult,
    post_process_plan: ppPlan,
    summary: {
      total_edm_time_min: gcodeResult.estimated_time_min,
      total_post_process_hours: ppPlan.total_time_hours,
      total_cost_estimate: ppPlan.total_cost_estimate + gcodeResult.estimated_time_min * 2.5,
      controller: gcodeResult.controller,
      profiles: gcodeResult.profiles_cut,
      passes: gcodeResult.passes_generated,
      post_steps: ppPlan.sequence.length,
      critical_steps: ppPlan.critical_steps,
      all_warnings: allWarnings,
    },
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMPostProcessGCodeEngine {
  /**
   * Plan post-EDM process sequence (MS15 U01-U05).
   * Returns ordered steps: stress relief → recast removal → inspection → coating → final.
   */
  plan_post_process(input: PostProcessInput): PostProcessPlan {
    return buildPostProcessSequence(input);
  }

  /**
   * Generate wire EDM G-code for any supported controller (MS16 U01-U07).
   * Auto-dispatches to controller-specific post processor.
   */
  generate_gcode(input: EDMGCodeInput): EDMGCodeResult {
    return generateGCode(input);
  }

  /**
   * Generate Fanuc Alpha-C wire EDM G-code directly.
   * E-pack technology, M50 thread, M60 cut, G61.1/G64 corner control.
   */
  generate_fanuc(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateFanucGCode({ ...input, controller: "fanuc" });
  }

  /**
   * Generate Sodick wire EDM G-code directly.
   * C### condition codes, SF-Liner servo, K-SMC auto-threader, K corner params.
   */
  generate_sodick(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateSodickGCode({ ...input, controller: "sodick" });
  }

  /**
   * Generate Makino Hyper-i wire EDM G-code directly.
   * E-pack tech, HS wire, anti-electrolysis, HyperCut finish.
   */
  generate_makino(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateMakinoGCode({ ...input, controller: "makino" });
  }

  /**
   * Full generate: combined G-code generation + post-process planning.
   * Returns G-code, post-process plan, and cross-validated summary.
   */
  full_generate(input: FullGenerateInput): FullGenerateResult {
    return fullGenerate(input);
  }

  /**
   * Plan recast layer removal strategy.
   */
  plan_recast_removal(
    recast_um: number,
    target_um: number,
    material: string,
    area_cm2: number,
  ): RecastRemovalResult {
    return planRecastRemoval(recast_um, target_um, material, area_cm2);
  }

  /**
   * Plan stress relief strategy.
   */
  plan_stress_relief(
    material: string,
    thickness_mm: number,
    requires_fatigue: boolean,
    hardness_hrc?: number,
  ): StressReliefResult {
    return planStressRelief(material, thickness_mm, requires_fatigue, hardness_hrc);
  }

  /**
   * Plan post-EDM inspection sequence.
   */
  plan_inspection(
    tolerance_mm: number,
    surface_Ra_um: number,
    recast_max_um: number | undefined,
    is_aerospace: boolean,
    is_medical: boolean,
    num_profiles: number,
  ): InspectionStep[] {
    return planInspection(tolerance_mm, surface_Ra_um, recast_max_um, is_aerospace, is_medical, num_profiles);
  }

  /**
   * Plan surface treatment / coating.
   */
  plan_surface_treatment(
    coating: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation",
    material: string,
    surface_Ra_um: number,
    thickness_mm: number,
  ): SurfaceTreatmentResult {
    return planSurfaceTreatment(coating, material, surface_Ra_um, thickness_mm);
  }

  /**
   * List supported wire EDM controllers.
   */
  list_controllers(): Array<{ controller: WireEDMController; name: string }> {
    return Object.entries(CONTROLLER_CONFIGS).map(([key, cfg]) => ({
      controller: key as WireEDMController,
      name: cfg.name,
    }));
  }
}

/** EDM Post Process G Code Engine constant. */
export const edmPostProcessGCodeEngine = new EDMPostProcessGCodeEngine();
