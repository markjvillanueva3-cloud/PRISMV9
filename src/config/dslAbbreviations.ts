/**
 * PRISM DSL Abbreviation Map — Token Density Optimization
 * ========================================================
 *
 * Maps common PRISM terms to compact abbreviations for token savings.
 * Used by the token density system to compress verbose outputs.
 * Covers all registry domains: operations, parameters, materials,
 * tools, machines, controllers, safety, formulas, and system terms.
 *
 * @module config/dslAbbreviations
 * @version 2.0.0 — L0-P1-MS1 full coverage
 */

/** Common PRISM term abbreviations for token density optimization */
export const DSL_ABBREVIATIONS: Record<string, string> = {
  // ── Operations ──
  "milling": "MIL",
  "turning": "TRN",
  "drilling": "DRL",
  "threading": "THR",
  "grinding": "GRD",
  "boring": "BOR",
  "reaming": "REM",
  "tapping": "TAP",
  "roughing": "RGHG",
  "finishing": "FNSH",
  "chamfering": "CHMF",
  "grooving": "GRVG",
  "parting": "PRTG",
  "facing": "FACG",
  "profiling": "PRFL",
  "pocketing": "PCKT",
  "contouring": "CNTR",
  "slotting": "SLOT",
  "plunging": "PLNG",
  "ramping": "RAMP",
  "helical_interpolation": "HLXI",
  "adaptive_clearing": "ADCL",
  "high_speed_machining": "HSM",

  // ── Cutting Parameters ──
  "cutting_speed": "Vc",
  "feed_rate": "f",
  "feed_per_tooth": "fz",
  "feed_per_revolution": "fn",
  "depth_of_cut": "ap",
  "width_of_cut": "ae",
  "spindle_speed": "n",
  "surface_roughness": "Ra",
  "material_removal_rate": "MRR",
  "specific_cutting_force": "kc",
  "chip_thickness": "hm",
  "cutting_power": "Pc",
  "cutting_torque": "Mc",
  "tool_life": "TL",
  "surface_finish": "SF",
  "stepover": "SO",
  "stepdown": "SD",
  "lead_angle": "KAPA",
  "rake_angle": "RAKE",
  "clearance_angle": "CLR_A",
  "nose_radius": "r_eps",
  "helix_angle": "HLX_A",
  "number_of_flutes": "z",

  // ── Materials — ISO Groups ──
  "stainless_steel": "SS",
  "carbon_steel": "CS",
  "alloy_steel": "AS",
  "tool_steel": "TS",
  "free_machining_steel": "FMS",
  "hsla_steel": "HSLA",
  "aluminum": "AL",
  "titanium": "Ti",
  "inconel": "IN",
  "cast_iron": "CI",
  "gray_cast_iron": "GCI",
  "ductile_iron": "DI",
  "malleable_iron": "MI",
  "white_cast_iron": "WCI",
  "austenitic_stainless": "AUST",
  "ferritic_stainless": "FERR",
  "martensitic_stainless": "MART",
  "duplex_stainless": "DPLX",
  "ph_stainless": "PH_SS",
  "wrought_aluminum": "W_AL",
  "cast_aluminum": "C_AL",
  "copper": "Cu",
  "brass": "BRS",
  "bronze": "BRZ",
  "magnesium": "Mg",
  "nickel_alloy": "NiA",
  "cobalt_alloy": "CoA",
  "titanium_alloy": "TiA",
  "superalloy": "SPRALY",

  // ── Tool Types ──
  "end_mill": "EM",
  "face_mill": "FM",
  "ball_mill": "BM",
  "bull_mill": "BLM",
  "boring_bar": "BB",
  "turning_tool": "TT",
  "threading_tool": "THRT",
  "grooving_tool": "GRVT",
  "chamfer_mill": "CHM",
  "slot_drill": "SLD",
  "insert": "INS",
  "indexable": "IDX",

  // ── Tool Materials ──
  "carbide": "WC",
  "coated_carbide": "CWC",
  "cermet": "CRM",
  "ceramic": "CER",
  "high_speed_steel": "HSS",
  "hss_cobalt": "HSSCo",
  "polycrystalline_diamond": "PCD",
  "cubic_boron_nitride": "CBN",

  // ── Coatings ──
  "titanium_nitride": "TiN",
  "titanium_carbonitride": "TiCN",
  "titanium_aluminum_nitride": "TiAlN",
  "aluminum_titanium_nitride": "AlTiN",
  "aluminum_chromium_nitride": "AlCrN",
  "diamond_like_carbon": "DLC",
  "uncoated": "UC",

  // ── Machine Types ──
  "vertical_mill": "VMC",
  "horizontal_mill": "HMC",
  "5_axis": "5AX",
  "turn_mill": "MTM",
  "multi_spindle": "MSP",
  "edm_wire": "WEDM",
  "edm_sinker": "SEDM",
  "grinder": "GRND",
  "swiss": "SWS",
  "lathe": "LTH",

  // ── Controller Families ──
  "fanuc": "FNC",
  "siemens": "SIE",
  "heidenhain": "HH",
  "mitsubishi": "MIT",
  "mazak": "MZK",
  "okuma": "OKM",
  "brother": "BRO",
  "doosan": "DSN",
  "dmg_mori": "DMG",

  // ── Spindle & Bearings ──
  "belt_drive": "BDR",
  "gear_drive": "GDR",
  "direct_drive": "DDR",
  "integral_motor": "IMT",
  "high_speed_electric": "HSE",
  "angular_contact": "ACB",
  "cylindrical_roller": "CRB",
  "hydrostatic": "HYD",
  "magnetic": "MAG",
  "hybrid_ceramic": "HCB",

  // ── Coolant & Workholding ──
  "flood_coolant": "FLD",
  "mist_coolant": "MST",
  "through_spindle": "TSC",
  "minimum_quantity": "MQL",
  "cryogenic": "CRYO",
  "high_pressure": "HPC",
  "three_jaw_chuck": "3JC",
  "collet_chuck": "CCK",
  "hydraulic_vise": "HVS",
  "vacuum_table": "VTB",
  "magnetic_chuck": "MCK",
  "fixture_plate": "FPL",

  // ── Thread Types ──
  "metric_thread": "M_THR",
  "unified_thread": "UN_THR",
  "pipe_thread": "PIPE",
  "acme_thread": "ACME",
  "buttress_thread": "BUTT",
  "trapezoidal_thread": "TR_THR",

  // ── Alarm Categories ──
  "servo_alarm": "SRV_A",
  "spindle_alarm": "SPD_A",
  "atc_alarm": "ATC_A",
  "overtravel": "OVT",
  "overload": "OVL",
  "communication": "COMM",
  "lubrication": "LUBE",
  "pneumatic": "PNEU",
  "hydraulic": "HYDR",

  // ── Formula Domains ──
  "kienzle": "KZL",
  "taylor": "TYL",
  "johnson_cook": "J-C",
  "merchant": "MRC",
  "deflection": "DEFL",
  "stability": "STAB",

  // ── Quality & Safety ──
  "safety_score": "S_SCR",
  "omega_score": "OM_SCR",
  "confidence": "CONF",
  "reliability": "REL",
  "repeatability": "RPT",
  "uncertainty": "UNC",
  "severity": "SEV",
  "probability": "PROB",
  "risk_level": "RSK",

  // ── System Components ──
  "dispatcher": "DSP",
  "engine": "ENG",
  "registry": "REG",
  "validator": "VAL",
  "orchestrator": "ORC",
  "calculator": "CALC",
  "algorithm": "ALG",
  "hook": "HK",
  "cadence": "CDN",
  "middleware": "MW",
  "schema": "SCH",
  "skill": "SKL",
  "script": "SCR",
  "agent": "AGT",
  "swarm": "SWM",
  "pipeline": "PPL",
  "telemetry": "TLM",
  "knowledge_base": "KB",

  // ── Dispatchers (DSL shortcuts) ──
  "prism_calc": "PC",
  "prism_data": "PD",
  "prism_safety": "PS",
  "prism_session": "PSN",
  "prism_context": "PCX",
  "prism_guard": "PG",
  "prism_dev": "PDV",
  "prism_hook": "PHK",
  "prism_skill": "PSK",
  "prism_intelligence": "PI",
  "prism_toolpath": "PTP",
  "prism_thread": "PTH",
  "prism_omega": "POM",
  "prism_gsd": "PGSD",
  "prism_ralph": "PRL",
  "prism_doc": "PDC",
  "prism_validate": "PVL",
  "prism_autopilot": "PAP",
  "prism_manus": "PMN",
  "prism_orchestration": "POR",
  "prism_knowledge": "PKN",
  "prism_cad": "PCA",
  "prism_cam": "PCM",
  "prism_quality": "PQL",
  "prism_scheduling": "PSCH",
  "prism_export": "PEX",
  "prism_turning": "PTRN",
  "prism_5axis": "P5X",
  "prism_edm": "PEDM",
  "prism_grinding": "PGRD",
  "prism_industry": "PIND",
  "prism_automation": "PAUT",
  "prism_telemetry": "PTLM",
  "prism_pfp": "PPFP",
  "prism_memory": "PMEM",
  "prism_nl_hook": "PNLH",
  "prism_compliance": "PCMP",
  "prism_tenant": "PTNT",
  "prism_bridge": "PBRG",
  "prism_l2": "PL2",
  "prism_atcs": "PATC",
  "prism_autonomous": "PATN",
  "prism_auth": "PAUTH",
  "prism_generator": "PGEN",
  "prism_sp": "PSP",

  // ── Key Algorithms ──
  "kienzle_force": "KFM",
  "taylor_tool_life": "TTL",
  "johnson_cook_flow": "JCF",
  "bayesian_optimizer": "BOPT",
  "genetic_optimizer": "GOPT",
  "particle_swarm": "PSO",
  "simulated_annealing": "SA",
  "kalman_filter": "KF",
  "monte_carlo": "MC",
  "fft_analysis": "FFT",
  "neural_inference": "NI",
  "stability_lobe": "SLD",
  "fuzzy_controller": "FZC",
  "pid_controller": "PID",
  "digital_twin": "DTE",

  // ── Engine Categories ──
  "predictive_failure": "PFE",
  "computation_cache": "CCH",
  "session_lifecycle": "SLE",
  "context_budget": "CBE",
  "tool_selection": "TSE",
  "surface_finish_engine": "SFE",
  "thermal_sim": "THE",
  "quality_prediction": "QPE",
  "cost_estimation": "CSE",
  "scheduling": "SCHE",
  "process_plan": "PPE",
  "feature_recognition": "FRE",

  // ── System Terms ──
  "manufacturing": "MFG",
  "calculation": "CLCN",
  "validation": "VALD",
  "optimization": "OPT",
  "prediction": "PRED",
  "configuration": "CFG",
  "specification": "SPEC",
  "temperature": "TEMP",
  "coefficient": "COEF",
  "parameter": "PARAM",
  "tolerance": "TOL",
  "dimension": "DIM",
  "recommendation": "REC",
  "workpiece": "WP",
  "fixture": "FXT",
  "clearance": "CLR",
  "interference": "INTF",
  "simulation": "SIM",
  "collision": "COLL",
  "toolpath": "TP",
  "operation": "OP",
  "process": "PROC",
  "machine": "MCH",
  "material": "MTL",
  "geometry": "GEO",
  "diameter": "DIA",
  "length": "LEN",
  "velocity": "VEL",
  "acceleration": "ACC",
  "deceleration": "DEC",
  "interpolation": "INTP",
  "compensation": "COMP",
  "calibration": "CAL",
  "maintenance": "MAINT",
  "diagnostic": "DIAG",
  "certificate": "CERT",
  "compliance": "CMPL",
};

/** Count of abbreviation entries */
export const DSL_ENTRY_COUNT = Object.keys(DSL_ABBREVIATIONS).length;

/** Reverse map for expansion */
export const DSL_EXPANSIONS: Record<string, string> = Object.fromEntries(
  Object.entries(DSL_ABBREVIATIONS).map(([k, v]) => [v, k])
);

/**
 * Apply abbreviations to a text string.
 * Replaces full terms with compact abbreviations.
 * Only applies to word-boundary matches (case-insensitive).
 */
export function compactText(text: string): string {
  let result = text;
  for (const [full, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
    // Escape special regex chars in the full term (e.g. underscores in key names)
    const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), abbr);
  }
  return result;
}

/**
 * Apply abbreviations to JSON string values only (not keys).
 * Safer than compactText for structured data — preserves key names.
 */
export function compactJsonValues(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr);
    const compacted = compactObjectValues(obj);
    return JSON.stringify(compacted);
  } catch {
    return compactText(jsonStr);
  }
}

/** Recursively compact string values in an object (not keys) */
function compactObjectValues(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') return compactText(val);
  if (typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(compactObjectValues);
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    result[k] = compactObjectValues(v);
  }
  return result;
}

/** Expand abbreviations back to full terms */
export function expandText(text: string): string {
  let result = text;
  for (const [abbr, full] of Object.entries(DSL_EXPANSIONS)) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), full);
  }
  return result;
}

/** Generate a compact legend string for DSL mode responses */
export function getDslLegend(): string {
  const categories: Record<string, string[]> = {};
  for (const [full, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
    const cat = full.includes('_') ? 'compound' : 'simple';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(`${abbr}=${full}`);
  }
  return `[DSL:${DSL_ENTRY_COUNT} abbrs active]`;
}
