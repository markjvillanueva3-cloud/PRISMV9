/**
 * JM Die Company — Canonical Test Shop Profile
 *
 * JM Die is a cold heading die & tooling shop in the fastener industry.
 * This is the reference shop for all PRISM development and testing.
 * Every quoting, costing, scheduling, and capacity engine uses this as
 * its primary integration target.
 *
 * Location: Midwest US
 * Industry: Fastener tooling — cold heading dies, punches, electrodes
 * Specialties: Electrode manufacturing (graphite + copper), wire EDM,
 *   sinker EDM, CNC lathe punches, trilobe punch programs
 * Customers: 100+ fastener manufacturers (ITW, Alcoa, Optimas, SFS, etc.)
 */

// ============================================================================
// COMPANY METADATA
// ============================================================================

export const JM_DIE_COMPANY = {
  id: "jm-die",
  name: "JM Die Company",
  domain: "jmdie.com",
  industry: "fastener_tooling",
  specialties: [
    "cold_heading_dies",
    "punches",
    "electrode_manufacturing",
    "wire_edm_tooling",
    "sinker_edm",
    "trilobe_electrodes",
  ],
  location: {
    region: "midwest_us",
    timezone: "America/Chicago",
  },
  operating_hours: {
    shifts_per_day: 1,
    hours_per_shift: 10,
    days_per_week: 5,
  },
  cam_systems: ["mastercam", "esprit", "fusion360", "hypermill"],
  cad_systems: ["inventor", "solidworks", "fusion360"],
  file_archive_path: "JM DIE",
  software_seats: {
    mastercam: [
      { seat: "MCAM-MILL-01", product: "Mastercam Mill", version: "X8+" },
      { seat: "MCAM-MILL-02", product: "Mastercam Mill", version: "X8+" },
      { seat: "MCAM-LATHE-01", product: "Mastercam Lathe", version: "X8+" },
      { seat: "MCAM-LATHE-02", product: "Mastercam Lathe", version: "X8+" },
      { seat: "MCAM-WIRE-01", product: "Mastercam Wire", version: "X8+" },
      { seat: "MCAM-WIRE-02", product: "Mastercam Wire", version: "X8+" },
    ],
    esprit: [
      { seat: "ESPRIT-WIRE-01", product: "Esprit Wire EDM" },
    ],
    fusion360: [
      { seat: "F360-01", product: "Fusion 360", machining_extension: true },
      { seat: "F360-02", product: "Fusion 360", machining_extension: true },
      { seat: "F360-03", product: "Fusion 360", machining_extension: false },
      { seat: "F360-04", product: "Fusion 360", machining_extension: false },
    ],
    hypermill: [
      { seat: "HMILL-01", product: "hyperMILL" },
    ],
  },
} as const;

// ============================================================================
// CANONICAL APP / MCP PROFILE ROOTS
// ============================================================================

export const JM_DIE_SOURCE_ROOTS = {
  company_root: "H:\\PRISM\\JM DIE",
  programs_root: "H:\\PRISM\\JM DIE\\Programs",
  employee_database_root: "H:\\PRISM\\JM DIE\\Employee Database",
  machines_root: "H:\\PRISM\\JM DIE\\Machines",
  controllers_root: "H:\\PRISM\\JM DIE\\Controllers",
  tool_holders_root: "H:\\PRISM\\JM DIE\\Tool Holders",
  tooling_root: "H:\\PRISM\\JM DIE\\Tooling",
  materials_root: "H:\\PRISM\\JM DIE\\Materials",
  prints_root: "H:\\PRISM\\JM DIE\\Prints",
} as const;

export type DevelopmentSeedStatus = "seeded" | "in_progress" | "planned";

export interface DevelopmentSeedDomain {
  id:
    | "programs"
    | "employee_database"
    | "machines"
    | "controllers"
    | "tool_holders"
    | "tooling"
    | "materials"
    | "prints";
  label: string;
  status: DevelopmentSeedStatus;
  note: string;
  source_path: string;
}

export const JM_DIE_DEVELOPMENT_SEEDS: DevelopmentSeedDomain[] = [
  {
    id: "programs",
    label: "Programs",
    status: "in_progress",
    note: "Primary archive landing zone for JM Die CNC, EDM, and electrode program packets.",
    source_path: JM_DIE_SOURCE_ROOTS.programs_root,
  },
  {
    id: "employee_database",
    label: "Employee database",
    status: "in_progress",
    note: "Canonical roster, shell identities, clearance levels, and machine/program authority are seeded while live company-record import is built.",
    source_path: JM_DIE_SOURCE_ROOTS.employee_database_root,
  },
  {
    id: "machines",
    label: "Machines",
    status: "in_progress",
    note: "JM Die machine roster is seeded and now projects into canonical APPW and Program Release selectors while live folder-backed ingest is built.",
    source_path: JM_DIE_SOURCE_ROOTS.machines_root,
  },
  {
    id: "controllers",
    label: "Controllers",
    status: "in_progress",
    note: "Exact machine-to-controller registry now anchors JM Die APPW and Program Release selectors while controller package ingest is built.",
    source_path: JM_DIE_SOURCE_ROOTS.controllers_root,
  },
  {
    id: "tool_holders",
    label: "Tool holders",
    status: "in_progress",
    note: "Canonical JM Die holder seeds now anchor APPW and Program Release selectors while the folder-backed Tool Holders ingest is still pending.",
    source_path: JM_DIE_SOURCE_ROOTS.tool_holders_root,
  },
  {
    id: "tooling",
    label: "Tooling",
    status: "in_progress",
    note: "Fusion-exported JM Die shop tools now drive the seeded tooling packages while the dedicated Tooling folder is still being built.",
    source_path: JM_DIE_SOURCE_ROOTS.tooling_root,
  },
  {
    id: "materials",
    label: "Materials",
    status: "in_progress",
    note: "JM Die material/stock seed profiles now anchor Program Release selectors while folder-backed materials and print lineage ingest are still pending.",
    source_path: JM_DIE_SOURCE_ROOTS.materials_root,
  },
  {
    id: "prints",
    label: "Prints",
    status: "planned",
    note: "The print library will become the release-side truth source for JM Die routing and programs.",
    source_path: JM_DIE_SOURCE_ROOTS.prints_root,
  },
];

// ============================================================================
// MACHINE → CONTROLLER MAPPING (exact pairings from shop floor)
// ============================================================================

export interface MachineControllerPair {
  machine_id: string;
  machine_name: string;
  controller_family: string;
  controller_model: string;
  post_processor?: string;
}

export const JM_DIE_CONTROLLER_MAP: MachineControllerPair[] = [
  // Okuma Lathes
  { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",       controller_family: "okuma",      controller_model: "OSP-P300L-R",    post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps" },
  { machine_id: "LTH-02", machine_name: "Okuma GENOS L200E-M",      controller_family: "okuma",      controller_model: "OSP-P200LA-R",   post_processor: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps" },
  { machine_id: "LTH-03", machine_name: "Okuma LNC8",               controller_family: "okuma",      controller_model: "OSP-U10L",       post_processor: "OKUMA_LNC8_PRISM.cps" },
  { machine_id: "LTH-04", machine_name: "Okuma Crown L1060",        controller_family: "okuma",      controller_model: "OSP-U10L",       post_processor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps" },
  { machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E",     controller_family: "okuma",      controller_model: "OSP-P300LA-E",   post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps" },
  { machine_id: "LTH-06", machine_name: "Okuma LB 3000EX Big Bore", controller_family: "okuma",      controller_model: "OSP-P500",       post_processor: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps" },
  { machine_id: "LTH-07", machine_name: "Okuma Multus B250II",      controller_family: "okuma",      controller_model: "OSP-P300SA",     post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps" },
  // Mills
  { machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller_family: "hurco",      controller_model: "WinMAX v10",     post_processor: "HURCO_VM30i_PRISM_v11.cps" },
  { machine_id: "VMC-02", machine_name: "Okuma M460V-5AX",          controller_family: "okuma",      controller_model: "OSP-P300MA-H",   post_processor: "OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps" },
  { machine_id: "VMC-03", machine_name: "Haas VF-2",                controller_family: "haas",       controller_model: "PRE-NGC",        post_processor: "HAAS_VF2_-Ai-Enhanced_(iMachining).cps" },
  { machine_id: "VMC-04", machine_name: "Haas OM-2",                controller_family: "haas",       controller_model: "PRE-NGC",        post_processor: "HAAS_OM-2_PRE-NGC_PRISM.cps" },
  { machine_id: "VMC-05", machine_name: "Roku-Roku HC 658-II",      controller_family: "fanuc",      controller_model: "Fanuc 31i-B5" },
  // Sinker EDM
  { machine_id: "EDM-01", machine_name: "Mitsubishi EA12S",         controller_family: "mitsubishi", controller_model: "FP80S",          post_processor: "MITSUBISHI_EA12S_FP80S_PRISM.cps" },
  { machine_id: "EDM-02", machine_name: "Mitsubishi EA12D",         controller_family: "mitsubishi", controller_model: "C30EA-2",        post_processor: "MITSUBISHI_EA12D_C30EA-2_PRISM.cps" },
  // Wire EDM (3 controller variants on same machine)
  { machine_id: "WEDM-01", machine_name: "Mitsubishi FA10S",        controller_family: "mitsubishi", controller_model: "W31MV-2",        post_processor: "MITSUBISHI_FA10S_W31MV-2_PRISM.cps" },
];

// ============================================================================
// CUSTOMER LIST (top fastener manufacturers served)
// ============================================================================

export const JM_DIE_CUSTOMERS = [
  "ACME", "ACUMENT", "AFI INDUSTRIES", "AGRATI", "AIR", "AKKO", "ALCOA",
  "ALLFAST", "ALLSTAR", "ANDERSON", "ARCHER", "ARCONIC", "ATF",
  "BIRMINGHAM FASTENER", "BRAINARD RIVET", "BRICO",
  "CAMCAR", "CFC", "CHERRY", "CHOCTAW", "CLENDENIN", "CSM", "CUSTOM",
  "EJOT", "ELGIN FASTENER", "ELITE",
  "FALL RIVER", "FASTENAL", "FASTRON", "FIOCCHI", "FONTANA",
  "GRANDEUR", "H&L", "HASSALL", "HEDALLOY", "HOLO-KROME",
  "ITW", "JEBCO",
  "KEYSTONE", "KONGO DIES",
  "LELAND", "LEP", "LYCOMING",
  "MEAD", "MECH-ART", "MICRODOT", "MID-CONTINENT", "MIDWEST",
  "OMG", "OPTIMAS",
  "PARKER", "PDP-PAWEL", "PRECISION FORM",
  "QSN", "REED & PRINCE", "RUMCO",
  "SEMS", "SFS", "SIMPSON", "SOUTHERN", "STALCOP",
  "TCR", "TFI", "THOMASON", "TOPURA",
  "VALLEY RIVET", "WHITESELL", "WOJTEK", "WRENTHAM TOOL", "WSR",
] as const;

// ============================================================================
// PROGRAM ARCHIVE STATISTICS
// ============================================================================

export const JM_DIE_ARCHIVE_STATS = {
  total_files: 36_928,
  total_directories: 1_956,
  unique_customers: 290,         // deduplicated across machine folders
  // CNC Programs
  min_lathe_programs: 16_947,    // .MIN files (dominant type — 46% of archive)
  nc_programs: 76,               // .NC files
  hnc_hurco: 43,                 // .HNC Hurco programs
  hmc_hypermill: 31,             // .HMC hyperMILL projects
  // CAM Projects
  mastercam_x8: 7_092,           // .mcx-8 files
  mastercam_legacy: 1_779,       // .MCX files
  mastercam_x6: 106,             // .mcx-6 files
  esprit_wire: 28,               // .esp files
  // CAD Models
  inventor_parts: 4_151,         // .ipt files
  inventor_assemblies: 599,      // .iam files
  inventor_drawings: 272,        // .idw files
  step_models: 178,              // .stp + .step files
  solidworks_parts: 38,          // .SLDPRT files
  stl_meshes: 53,                // .stl files
  // Drawings
  dxf_drawings: 1_445,           // .dxf files (incl. hyperMILL tool holder library)
  dwg_drawings: 208,             // .dwg files
  // hyperMILL
  hypermill_cycles: 2_876,       // .cyc cycle definition files
  hypermill_toolpaths: 42,       // .pof toolpath output
  // Documents
  pdf_documents: 225,            // engineering prints, setup sheets, manuals
  spreadsheets: 17,              // .xlsx + .xls
  // Program age tiers
  baseline_programs: 1_358,      // Fusion-generated (mid-2025 to Jan 2026) — ground truth
  legacy_programs: 21_453,       // older programs to upgrade via PRISM engines
  electrode_brands: 42,          // distinct electrode customer libraries
} as const;

// ============================================================================
// POST PROCESSOR INVENTORY
// ============================================================================

export type PostStatus = "production" | "testing" | "prism_enhanced" | "vendor_stock" | "deprecated";

export interface PostProcessorEntry {
  filename: string;
  machine_id?: string;
  machine_name: string;
  controller: string;
  source: "prism_enhanced" | "fusion_stock" | "custom" | "ai_enhanced";
  status: PostStatus;
  notes?: string;
}

/**
 * JM Die post processors — organized by validation status.
 * "production" = validated on real parts, trusted for shop floor use.
 * "testing" = PRISM-enhanced or Ai-Enhanced, needs validation against known-good programs.
 * "vendor_stock" = stock Fusion 360 post, unmodified.
 *
 * Posts live in: data/posts/prism-enhanced/ and data/posts/box-basic/
 * Fusion cache (464 stock posts): data/posts/fusion-cache/
 */
export const JM_DIE_POST_PROCESSORS: PostProcessorEntry[] = [
  // ── PRISM-ENHANCED (JM Die machines — need testing & validation) ────────
  { filename: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps",           machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",       controller: "OSP-P300L-R",  source: "prism_enhanced", status: "testing" },
  { filename: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps",         machine_id: "LTH-02", machine_name: "Okuma GENOS L200E-M",      controller: "OSP-P200LA-R", source: "prism_enhanced", status: "testing" },
  { filename: "OKUMA_LNC8_PRISM.cps",                               machine_id: "LTH-03", machine_name: "Okuma LNC8",               controller: "OSP-U10L",     source: "prism_enhanced", status: "testing" },
  { filename: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps",              machine_id: "LTH-04", machine_name: "Okuma Crown L1060",        controller: "OSP-U10L",     source: "prism_enhanced", status: "testing" },
  { filename: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps",          machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E",     controller: "OSP-P300LA-E", source: "ai_enhanced",    status: "testing" },
  { filename: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps",                machine_id: "LTH-06", machine_name: "Okuma LB 3000EX Big Bore", controller: "OSP-P500",     source: "ai_enhanced",    status: "testing" },
  { filename: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps",         machine_id: "LTH-07", machine_name: "Okuma Multus B250II",      controller: "OSP-P300SA",   source: "ai_enhanced",    status: "testing" },
  { filename: "OKUMA_MULTUS_B250IIW-Ai-Enhanced.cps",               machine_id: "LTH-07", machine_name: "Okuma Multus B250II",      controller: "OSP-P300SA",   source: "ai_enhanced",    status: "deprecated", notes: "Replaced by -Fixed variant" },
  { filename: "HURCO_VM30i_PRISM_v11.cps",                          machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller: "WinMAX v10",   source: "prism_enhanced", status: "testing" },
  { filename: "HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps",            machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller: "WinMAX v10",   source: "prism_enhanced", status: "testing", notes: "Alternate enhanced version" },
  { filename: "HURCO-VM30i-Ai-Enhanced.cps",                        machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller: "WinMAX v10",   source: "ai_enhanced",    status: "testing" },
  { filename: "HURCO_VM30i_Ai-Enhanced (iMachining).cps",           machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller: "WinMAX v10",   source: "ai_enhanced",    status: "testing", notes: "iMachining variant" },
  { filename: "HURCO_VM30i_Enhanced (variable feedrate test).cps",  machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller: "WinMAX v10",   source: "ai_enhanced",    status: "testing", notes: "Variable feedrate experiment" },
  { filename: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps",       machine_id: "VMC-02", machine_name: "Okuma M460V-5AX",          controller: "OSP-P300MA-H", source: "ai_enhanced",    status: "testing" },
  { filename: "OKUMA-M460V-5AX-Ai Enhanced-Simulation (test for hardcode).cps", machine_id: "VMC-02", machine_name: "Okuma M460V-5AX", controller: "OSP-P300MA-H", source: "ai_enhanced", status: "testing", notes: "Simulation test variant" },
  { filename: "HAAS_VF2_-Ai-Enhanced (iMachining).cps",             machine_id: "VMC-03", machine_name: "Haas VF-2",                controller: "PRE-NGC",      source: "ai_enhanced",    status: "testing" },
  { filename: "haas 2024 Mark's Custom.cps",                        machine_id: "VMC-03", machine_name: "Haas VF-2",                controller: "PRE-NGC",      source: "custom",         status: "production", notes: "Mark's custom production post" },
  { filename: "HAAS_OM-2_PRE-NGC_PRISM.cps",                        machine_id: "VMC-04", machine_name: "Haas OM-2",                controller: "PRE-NGC",      source: "prism_enhanced", status: "testing" },
  { filename: "Roku-Roku-Ai-Enhanced.cps",                          machine_id: "VMC-05", machine_name: "Roku-Roku HC 658-II",      controller: "Fanuc 31i-B5", source: "ai_enhanced",    status: "testing" },
  { filename: "fanuc.cps",                                          machine_id: "VMC-05", machine_name: "Roku-Roku HC 658-II",      controller: "Fanuc 31i-B5", source: "fusion_stock",   status: "production", notes: "Generic Fanuc post used in production" },
  { filename: "MITSUBISHI_EA12S_FP80S_PRISM.cps",                   machine_id: "EDM-01", machine_name: "Mitsubishi EA12S",         controller: "FP80S",        source: "prism_enhanced", status: "testing" },
  { filename: "MITSUBISHI_EA12D_C30EA-2_PRISM.cps",                 machine_id: "EDM-02", machine_name: "Mitsubishi EA12D",         controller: "C30EA-2",      source: "prism_enhanced", status: "testing" },
  { filename: "MITSUBISHI_FA10S_W21FAS-2_PRISM.cps",                machine_id: "WEDM-01", machine_name: "Mitsubishi FA10S",        controller: "W21FAS-2",     source: "prism_enhanced", status: "testing" },
  { filename: "MITSUBISHI_FA10S_W30FAS-2_PRISM.cps",                machine_id: "WEDM-01", machine_name: "Mitsubishi FA10S",        controller: "W30FAS-2",     source: "prism_enhanced", status: "testing" },
  { filename: "MITSUBISHI_FA10S_W31MV-2_PRISM.cps",                 machine_id: "WEDM-01", machine_name: "Mitsubishi FA10S",        controller: "W31MV-2",      source: "prism_enhanced", status: "testing" },
];

/** Summary counts for quick reference */
export const JM_DIE_POST_SUMMARY = {
  jm_die_machine_posts: 25,         // posts for JM Die's actual machines
  production_validated: 2,           // "haas 2024 Mark's Custom.cps", "fanuc.cps"
  testing_needs_validation: 21,      // PRISM-enhanced and Ai-Enhanced, need shop floor validation
  deprecated: 1,                     // superseded by newer version
  fusion_stock_library: 464,         // stock Fusion 360 posts in fusion-cache/ (machines we don't have)
  box_basic_library: 180,            // Autodesk box-basic posts (machines we don't have)
} as const;
