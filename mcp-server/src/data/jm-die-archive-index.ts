/**
 * JM Die Archive Index — Complete program archive inventory
 * Source: H:/PRISM/JM DIE/ (36,928 files, 1,956 directories)
 * Generated: 2026-04-10
 *
 * This index maps the entire JM Die file archive into a queryable structure.
 * Used by: ShopConfigurationEngine, ProgramCompareEngine, PrintToProgramPipeline,
 *          QuoteEstimatorEngine (program lookup), BatchUpgrade pipeline
 */

// ============================================================================
// ARCHIVE STRUCTURE
// ============================================================================

export const JM_DIE_ARCHIVE_ROOT = "JM DIE";

export interface ArchiveDirectory {
  path: string;
  label: string;
  machine_id?: string;
  file_count: number;
  primary_extensions: string[];
  customer_folders: number;
}

export const JM_DIE_ARCHIVE_DIRECTORIES: ArchiveDirectory[] = [
  { path: "CNC LATHE",         label: "CNC Lathe Programs",        machine_id: "LTH-*",  file_count: 19_839, primary_extensions: [".MIN", ".mcx-8"],     customer_folders: 119 },
  { path: "OKUMA",             label: "Okuma 5-Axis Mill",         machine_id: "VMC-02", file_count: 6_276,  primary_extensions: [".ipt", ".cyc", ".dxf"], customer_folders: 31 },
  { path: "WIRE EDM",          label: "Wire EDM Programs",         machine_id: "WEDM-01", file_count: 4_058,  primary_extensions: [".mcx-8", ".MCX", ".esp"], customer_folders: 92 },
  { path: "HAAS-HURCO",        label: "Haas VF-2 + Hurco VM30i",  machine_id: "VMC-01,VMC-03", file_count: 1_873, primary_extensions: [".ipt", ".iam", ".hnc"], customer_folders: 63 },
  { path: "ROKU-ROKU",         label: "Roku-Roku HC 658-II Mill",  machine_id: "VMC-05", file_count: 1_108,  primary_extensions: [".mcx-8", ".x_b"],    customer_folders: 79 },
  { path: "CNC MILL HAAS",     label: "Haas VF-2 Mill Programs",   machine_id: "VMC-03", file_count: 533,    primary_extensions: [".mcx-8"],            customer_folders: 54 },
  { path: "JM DIE COMPANY",    label: "Internal Company Files",    file_count: 369,    primary_extensions: [".ipt", ".pdf"],      customer_folders: 0 },
  { path: "QUEUE",             label: "Test Parts / Dev Queue",    file_count: 354,    primary_extensions: [".dwg", ".pdf"],      customer_folders: 0 },
  { path: "CNC OKUMA MULTUS",  label: "Okuma Multus B250II",       machine_id: "LTH-07", file_count: 18,     primary_extensions: [".MIN", ".cps"],      customer_folders: 3 },
  { path: "SETUPS",            label: "Machine Setup Models",      file_count: 5,      primary_extensions: [".stp"],              customer_folders: 0 },
  { path: "REVERSE ENGINEERING", label: "Reverse Engineered Parts", file_count: 47,     primary_extensions: [".ipt", ".jpg"],      customer_folders: 0 },
];

// ============================================================================
// FILE TYPE INVENTORY
// ============================================================================

export const JM_DIE_FILE_COUNTS = {
  // CNC Programs
  min_lathe: 16_947,
  nc_generic: 76,
  hnc_hurco: 43,
  hmc_hypermill: 31,
  // CAM Projects
  mcx8_mastercam: 7_092,
  mcx_mastercam_legacy: 1_779,
  mcx6_mastercam: 106,
  esp_esprit: 28,
  hypermill_projects: 3,
  // CAD Models
  ipt_inventor: 4_151,
  iam_inventor: 599,
  stp_step: 112,
  step_alt: 66,
  x_b_parasolid: 55,
  stl_mesh: 53,
  sldprt_solidworks: 38,
  x_t_parasolid: 18,
  igs_iges: 12,
  // Drawings
  dxf: 1_445,
  idw_inventor: 272,
  dwg_autocad: 208,
  // Documents
  pdf: 225,
  txt: 127,
  xlsx: 16,
  // hyperMILL
  cyc_hypermill: 2_876,
  pof_toolpath: 42,
  def_hypermill: 43,
  tooldb_hypermill: 1,
  // Total
  total: 36_928,
} as const;

// ============================================================================
// CUSTOMER DIRECTORY — deduplicated across all machine folders
// ============================================================================

export interface CustomerDirectory {
  /** Canonical name (uppercase, normalized) */
  name: string;
  /** Alternate names found in folder names */
  aliases: string[];
  /** Which machine directories have programs for this customer */
  machine_dirs: string[];
  /** Approximate total file count across all directories */
  approx_files: number;
  /** Part number pattern (regex-friendly) */
  part_number_pattern?: string;
}

export const JM_DIE_CUSTOMERS_INDEXED: CustomerDirectory[] = [
  { name: "OMG",             aliases: ["OMG INC"],                             machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO", "CNC MILL HAAS", "OKUMA"], approx_files: 4_266, part_number_pattern: "\\d{2}-\\d{2,3}|MTP\\d{4}|PD\\d{4}" },
  { name: "FONTANA",         aliases: ["FONTANA FASTENERS"],                   machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO", "CNC MILL HAAS", "OKUMA"], approx_files: 1_399, part_number_pattern: "[A-Z]-\\d{4}|FD-\\d{4}-\\d{3}|TB-\\d{4}" },
  { name: "ITW",             aliases: ["ITW SHAKEPROOF"],                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 1_236, part_number_pattern: "\\d{3}-\\d{5}-\\d{5}-\\d{2}" },
  { name: "OPTIMAS",         aliases: ["ANIXTER-OPTIMAS"],                     machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO", "OKUMA"],                  approx_files: 1_074, part_number_pattern: "T-[A-Z0-9]+-[A-Z0-9-]+" },
  { name: "ATF",             aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "CNC MILL HAAS"],                        approx_files: 923,   part_number_pattern: "[A-Z]{2,3}-\\d{5}[SA]?-\\d[A-Z]\\d?" },
  { name: "BELVIDERE",       aliases: [],                                      machine_dirs: ["CNC LATHE"],                                                                  approx_files: 791 },
  { name: "VALLEY",          aliases: ["VALLEY FASTENER GROUP", "VALLEY RIVET"], machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO"],                         approx_files: 739 },
  { name: "HOLO-KROME",      aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO", "CNC MILL HAAS", "OKUMA"], approx_files: 643,   part_number_pattern: "A\\d{5,6}HK|B\\d{4}" },
  { name: "AGRATI",          aliases: [],                                      machine_dirs: ["CNC LATHE", "ROKU-ROKU", "OKUMA"],                                            approx_files: 530,   part_number_pattern: "9\\d{6}" },
  { name: "SFS",             aliases: ["SFS GROUP", "SFS GROUP USA"],          machine_dirs: ["CNC LATHE", "WIRE EDM", "HAAS-HURCO", "CNC MILL HAAS", "OKUMA"],               approx_files: 510,   part_number_pattern: "1\\d{6}" },
  { name: "AIR",             aliases: ["AIR INDUSTRIES"],                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "OKUMA"],                                approx_files: 481,   part_number_pattern: "[AB]\\d{4}-\\d{2}-\\d{2}" },
  { name: "HPFS",            aliases: ["HI-PERFORMANCE", "Hi-Performance Fastener Systems"], machine_dirs: ["CNC LATHE"],                                                    approx_files: 476 },
  { name: "ALLFAST",         aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO", "OKUMA"],                  approx_files: 430,   part_number_pattern: "\\d{2}-\\d{3}-\\d{3}" },
  { name: "TCR",             aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 398 },
  { name: "GRANDEUR",        aliases: ["GRANDEUR FAST.", "GRANDEUR FASTENER"], machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 383 },
  { name: "CSM",             aliases: ["CSM FASTENER PRODUCTS"],               machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU", "HAAS-HURCO"],                           approx_files: 360 },
  { name: "SEMS",            aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 330 },
  { name: "ACME",            aliases: ["ACME-ELEC"],                           machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 310,   part_number_pattern: "A?-?\\d{2}-\\d{5}-\\d" },
  { name: "EJOT",            aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 280 },
  { name: "WHITESELL",       aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 265 },
  { name: "AKKO",            aliases: ["AKKO ELECTR"],                         machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 250 },
  { name: "HEADER",          aliases: ["HEADER PRODUCTS"],                     machine_dirs: ["CNC LATHE", "WIRE EDM"],                                                      approx_files: 240 },
  { name: "ACUMENT",         aliases: ["ACUMENT SPENCER", "ACCUMENT"],         machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 230,   part_number_pattern: "B-\\d{5}" },
  { name: "ARCONIC",         aliases: [],                                      machine_dirs: ["CNC LATHE"],                                                                  approx_files: 200,   part_number_pattern: "189A\\d{4}" },
  { name: "BIRMINGHAM",      aliases: ["BIRMINGHAM FASTENER"],                 machine_dirs: ["CNC LATHE", "WIRE EDM"],                                                      approx_files: 180,   part_number_pattern: "BH-\\d{4}" },
  { name: "STALCOP",         aliases: ["STALCOP ELECT"],                       machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 170 },
  { name: "CLENDENIN",       aliases: ["CLENDENIN BROTHERS"],                  machine_dirs: ["CNC LATHE", "WIRE EDM"],                                                      approx_files: 160 },
  { name: "CHOCTAW",         aliases: ["CHOC EL"],                             machine_dirs: ["CNC LATHE", "WIRE EDM"],                                                      approx_files: 150 },
  { name: "JEBCO",           aliases: ["AMERICAN JEBCO"],                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 140 },
  { name: "KEYSTONE",        aliases: ["KEYSTONE ELECT"],                      machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 130 },
  { name: "FIOCCHI",         aliases: [],                                      machine_dirs: ["CNC LATHE", "WIRE EDM"],                                                      approx_files: 120 },
  { name: "AFI",             aliases: ["AFI INDUSTRIES", "AFI ELECTR"],        machine_dirs: ["CNC LATHE", "WIRE EDM", "ROKU-ROKU"],                                         approx_files: 110 },
  { name: "ADDISON",         aliases: ["ADDISON FASTENERS"],                   machine_dirs: ["CNC LATHE"],                                                                  approx_files: 100 },
];

// ============================================================================
// PART NUMBER TRACKING
// ============================================================================

export interface PartNumberEntry {
  part_number: string;
  customer: string;
  /** Directories where programs exist for this part */
  locations: string[];
  /** File types found */
  file_types: string[];
  /** Operation types inferred from filenames (OP1, OP2, ROUGH, FINISH, etc.) */
  operations?: string[];
  /** Whether a newer Fusion-baseline program exists (mid-2025 to Jan 2026) */
  has_baseline?: boolean;
}

/**
 * Part number extraction patterns per customer.
 * Used by the program parser to extract structured part numbers from filenames.
 */
export const PART_NUMBER_PATTERNS: Record<string, RegExp> = {
  ATF:        /([A-Z]{2,3}-\d{5}[SA]?-\d[A-Z]\d?)/i,
  AGRATI:     /(9\d{6})/,
  ACME:       /(A?-?\d{2}-\d{5}-\d)/,
  AIR:        /([AB]\d{4}-\d{2}-\d{2})/,
  ALLFAST:    /(\d{2}-\d{3}-\d{3})/,
  BIRMINGHAM: /(BH-\d{4})/,
  FONTANA:    /([A-Z]{1,2}-\d{4}(?:-\d{3})?)/,
  HOLO_KROME: /(A\d{5,6}HK|B\d{4})/,
  SFS:        /(1\d{6})/,
  ACUMENT:    /(B-\d{5})/,
  ARCONIC:    /(189A\d{4})/,
  ITW:        /(\d{3}-\d{5}-\d{5}-\d{2})/,
  OPTIMAS:    /(T-[A-Z0-9]+-[A-Z0-9-]+)/,
  OMG:        /(\d{2}-\d{2,3}|MTP\d{4}|PD\d{4})/,
  GENERIC:    /([A-Z]{1,4}[\-.]?\d{3,7}[\-.]?\d{0,4})/,
};

// ============================================================================
// PROGRAM AGE CLASSIFICATION
// ============================================================================

export const PROGRAM_AGE_TIERS = {
  /** Fusion 360 programs with optimized S/F — ground truth baseline */
  baseline: {
    label: "Fusion Baseline",
    date_range: { from: "2025-06-01", to: "2026-01-31" },
    count: 1_358,
    quality: "high",
    use: "validation_ground_truth",
  },
  /** Programs from 2024-2025 — mixed quality */
  recent: {
    label: "Recent",
    date_range: { from: "2024-01-01", to: "2025-05-31" },
    quality: "mixed",
    use: "upgrade_priority_2",
  },
  /** Programs before 2024 — likely amateur, conservative S/F */
  legacy: {
    label: "Legacy",
    date_range: { from: "2000-01-01", to: "2023-12-31" },
    quality: "low",
    use: "upgrade_priority_1",
  },
} as const;

// ============================================================================
// SPECIAL CONTENT
// ============================================================================

export const JM_DIE_SPECIAL_CONTENT = {
  /** hyperMILL training library with tool database */
  hypermill_training: "OKUMA/hyperCAD-S and hyperMILL Online Training/",
  /** Electrode programs organized by customer */
  electrode_library: "CNC LATHE/ELECTRODE/",
  /** Tomek's wire EDM program archive */
  tomek_wire_archive: "WIRE EDM/TOMEK - PROGRAMS/",
  /** Setup sheets and machine offset spreadsheets */
  setup_sheets: "HAAS-HURCO/SETUPS/",
  /** Finalized Okuma setups (vise, chuck, fixture models) */
  okuma_setups: "OKUMA/FINALIZED SETUPS/",
  /** Test/dev queue with Claude/ChatGPT outputs */
  dev_queue: "QUEUE/",
  /** Multus B250II post processor + config */
  multus_post: "CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps",
  /** Wafer die programs (standardized WCC/WNN/WRN/WRR series) */
  wafer_programs: "JM DIE COMPANY/",
  /** hyperMILL post packages per machine */
  hypermill_posts: "OKUMA/POSTS AND MACHINES/",
  /** Duplicate directory — ~95% overlaps HAAS-HURCO */
  duplicate_warning: "MATTHEW programs/",
} as const;
