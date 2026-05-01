/**
 * JM Die Company Profile
 *
 * Test shop for PRISM development: 21 machines, 24,545+ programs, 100+ customers.
 * Location: Machesney Park, IL
 *
 * This module provides constants for customer names, machine categories,
 * and shop-specific configuration used across PRISM engines.
 *
 * @module data/jm-die-profile
 */

/**
 * JM Die customer list — extracted from H:/PRISM/JM DIE/CNC LATHE/ folder structure.
 * 118 unique customers as of 2026-04-23.
 */
export const JM_DIE_CUSTOMERS: readonly string[] = [
  "ACME",
  "ACUMENT",
  "ADDISON FASTENERS",
  "AEROTECH",
  "AFI INDUSTRIES INC",
  "AGRATI",
  "AIR",
  "AJ",
  "AKKO",
  "ALCOA",
  "ALLFAST",
  "ALLSTAR",
  "AMGLO",
  "ANDERSON",
  "ARCHER",
  "ARCONIC",
  "ATF",
  "BELVIDERE",
  "BIRMINGHAM FASTENER",
  "BRAINARD RIVET",
  "BRICO",
  "BRISTOL",
  "CAMCAR",
  "CFC",
  "CHERRY",
  "CHOCTAW",
  "CLENDENIN",
  "CLENDENIN BROTHERS",
  "CRESCENT MANUFACTURING",
  "CSM",
  "CUSTOM",
  "CWR",
  "EJOT",
  "ELECTRODE",
  "ELGIN FASTENER",
  "ELITE",
  "FALL RIVER",
  "FASTENAL",
  "FASTRON",
  "FIOCCHI",
  "FONTANA",
  "FORGO",
  "FORM",
  "GESIPA",
  "GRANDER FASTENER",
  "GRANDEUR",
  "H&L",
  "HASSALL",
  "HEAD SET SOCKETS",
  "HEADALLOY",
  "HEADER",
  "HEARTLAND PRECISION",
  "HERRAMIENTAS",
  "HI-PERFORMANCE",
  "HOBRATH",
  "HOLBROOK",
  "HOLLY OPERATIONS",
  "HOLO-KROME",
  "HPFS",
  "IMAGE",
  "IMPACT TOOL",
  "ITW",
  "JACOBSON",
  "JEBCO",
  "JHON",
  "JM DIE",
  "KEYSTONE",
  "KOMAR",
  "LELAND",
  "MACOMB",
  "MAR-BRO",
  "MATDAN",
  "MEAD",
  "MICHIGAN BOLT",
  "MID CONTINENT",
  "MIDWEST",
  "MMG",
  "MULTI TECH",
  "NATEHOME",
  "NATHANS USB",
  "NORTH COAST",
  "NORTHEAST",
  "NORTHERN WIRE",
  "OLYMPIC",
  "OMG",
  "OMNI-LITE",
  "OPTIMAS",
  "PARKER",
  "PILGRIM",
  "PIONEER SCREW&NUT",
  "PRECIOSION FASTENER",
  "PRECIOSION FORM",
  "QUALITY FORM",
  "REED & PRINCE",
  "RING SCREW",
  "RUMCO",
  "SAFETY SOCKET",
  "SCREWS",
  "SEMBLEX",
  "SEMS",
  "SFS",
  "SHAMROCK",
  "SIG SAUER",
  "SILVI",
  "SOLUTIONS MANUF",
  "SOUTHERN FASTENERS",
  "STABIO",
  "STALCOP",
  "TCR",
  "TFI AEROSPACE",
  "THOMASON",
  "TOPURA",
  "UNITED STEEL",
  "VALLEY",
  "WHITESELL",
  "WRENTHAM",
  "WSR",
] as const;

/**
 * JM Die machine root paths — organized by machine type.
 */
export const JM_DIE_MACHINE_PATHS = {
  lathe: "H:\\PRISM\\JM DIE\\CNC LATHE",
  millHaas: "H:\\PRISM\\JM DIE\\CNC MILL HAAS",
  millHurco: "H:\\PRISM\\JM DIE\\HURCO",
  okumaMultus: "H:\\PRISM\\JM DIE\\CNC OKUMA MULTUS",
  wireEdm: "H:\\PRISM\\JM DIE\\WIRE EDM",
  sinkerEdm: "H:\\PRISM\\JM DIE\\SINKER EDM",
  rokuRoku: "H:\\PRISM\\JM DIE\\ROKU-ROKU",
  hypermill: "H:\\PRISM\\JM DIE\\HYPERMILL",
} as const;

/**
 * JM Die machine count: 21 machines across lathe, mill, EDM, and specialty.
 */
export const JM_DIE_MACHINE_COUNT = 21;

/**
 * JM Die program count (approximate): 24,545+ programs across all customers.
 */
export const JM_DIE_PROGRAM_COUNT = 24545;

/**
 * JM Die customer count: 100+ active customers.
 */
export const JM_DIE_CUSTOMER_COUNT = JM_DIE_CUSTOMERS.length;

export type JMDieCustomer = (typeof JM_DIE_CUSTOMERS)[number];
export type JMDieMachinePath = keyof typeof JM_DIE_MACHINE_PATHS;

// ============================================================================
// CONTROLLER MAP (U-EFF28: added so CAMPost* engines type-check; legacy
// data will be backfilled by the shop-controller ingestion pipeline)
// ============================================================================

/**
 * One row per physical machine on the JM Die shop floor, pairing it with
 * its controller family/model and the CAM post-processor registered for it.
 * `post_processor` paths are relative to JM_DIE_SOURCE_ROOTS.controllers_root.
 */
export interface MachineControllerPair {
  machine_id: string;
  machine_name: string;
  controller_family: string;
  controller_model: string;
  post_processor?: string;
}

/**
 * Where shared controller assets (post-processor files, macro libraries,
 * cycle catalogs) live on disk. Populated as the ingest pipeline maps them.
 */
/**
 * Canonical JM Die identity record. The shop ID matches
 * `ShopConfigurationEngine.DEFAULT_PROFILE_ID` so seed/summary code
 * can reference both interchangeably.
 */
export const JM_DIE_COMPANY = {
  id: "jm-die",
  name: "JM Die Company",
  industry: "Cold-heading dies & tooling (fastener industry)",
  location: {
    city: "Machesney Park",
    state: "IL",
    full: "Machesney Park, IL",
    timezone: "America/Chicago",
  },
  file_archive_path: "H:\PRISM\JM DIE",
  cad_systems: ["Mastercam", "Solidworks", "Fusion 360"] as readonly string[],
  cam_systems: ["Mastercam", "hyperMILL", "GibbsCAM"] as readonly string[],
} as const;

export const JM_DIE_SOURCE_ROOTS = {
  controllers_root: "H:\\PRISM\\JM DIE\\CONTROLLERS",
  posts_root: "H:\\PRISM\\JM DIE\\POSTS",
  macros_root: "H:\\PRISM\\JM DIE\\MACROS",
  tool_holders_root: "H:\\PRISM\\JM DIE\\TOOL HOLDERS",
  tooling_root: "H:\\PRISM\\JM DIE\\TOOLING",
  materials_root: "H:\\PRISM\\JM DIE\\MATERIALS",
  /** Source root for the JM Die employee database (Excel + CSV exports). */
  employee_database_root: "H:\\PRISM\\JM DIE\\EMPLOYEE DATABASE",
  /** Source root for engineering prints / drawings / blueprints. */
  prints_root: "H:\\PRISM\\JM DIE\\PRINTS",
  /** Generic shop-floor program archive (mixed lathe/mill/edm). */
  programs_root: "H:\\PRISM\\JM DIE",
} as const;

/**
 * Authoritative JM Die controller inventory — 15 production machines.
 * Restored 2026-05-01 from initial-commit b7e0b298f after `U-EFF28`
 * inadvertently wiped this map to `[]` while clearing TS2551/TS2305
 * clusters. Wipe broke `CAMPostSelectorUIEngine.dashboard()` /
 * `recommendForMachine()` / `getMachine()` and 16 of its tests plus
 * 2 plugins-integration tests; restoration re-enables U-CAM100 and
 * U-CAM104 exit conditions ("All 21 machines selectable" / "all
 * plugin tests pass"). Categories derived by `categorize()` from
 * machine_id prefix (LTH→lathe, VMC/HMC→mill, EDM→sinker_edm,
 * WEDM→wire_edm). Post paths are relative to JM_DIE_SOURCE_ROOTS.posts_root.
 */
export const JM_DIE_CONTROLLER_MAP: readonly MachineControllerPair[] = [
  // Okuma lathes (7) — 6× horizontal turning + 1× Multus B-axis multitasking
  { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",       controller_family: "okuma",      controller_model: "OSP-P300L-R",    post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps" },
  { machine_id: "LTH-02", machine_name: "Okuma GENOS L200E-M",      controller_family: "okuma",      controller_model: "OSP-P200LA-R",   post_processor: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps" },
  { machine_id: "LTH-03", machine_name: "Okuma LNC8",               controller_family: "okuma",      controller_model: "OSP-U10L",       post_processor: "OKUMA_LNC8_PRISM.cps" },
  { machine_id: "LTH-04", machine_name: "Okuma Crown L1060",        controller_family: "okuma",      controller_model: "OSP-U10L",       post_processor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps" },
  { machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E",     controller_family: "okuma",      controller_model: "OSP-P300LA-E",   post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps" },
  { machine_id: "LTH-06", machine_name: "Okuma LB 3000EX Big Bore", controller_family: "okuma",      controller_model: "OSP-P500",       post_processor: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps" },
  { machine_id: "LTH-07", machine_name: "Okuma Multus B250II",      controller_family: "okuma",      controller_model: "OSP-P300SA",     post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps" },
  // Mills (5) — Hurco WinMAX, Okuma 5-axis, two Haas, Roku-Roku Fanuc
  { machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller_family: "hurco",      controller_model: "WinMAX v10",     post_processor: "HURCO_VM30i_PRISM_v11.cps" },
  { machine_id: "VMC-02", machine_name: "Okuma M460V-5AX",          controller_family: "okuma",      controller_model: "OSP-P300MA-H",   post_processor: "OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps" },
  { machine_id: "VMC-03", machine_name: "Haas VF-2",                controller_family: "haas",       controller_model: "PRE-NGC",        post_processor: "HAAS_VF2_-Ai-Enhanced_(iMachining).cps" },
  { machine_id: "VMC-04", machine_name: "Haas OM-2",                controller_family: "haas",       controller_model: "PRE-NGC",        post_processor: "HAAS_OM-2_PRE-NGC_PRISM.cps" },
  { machine_id: "VMC-05", machine_name: "Roku-Roku HC 658-II",      controller_family: "fanuc",      controller_model: "Fanuc 31i-B5" }, // no post yet — engine surfaces no_post_available
  // Sinker EDMs (2) — Mitsubishi EA family
  { machine_id: "EDM-01", machine_name: "Mitsubishi EA12S",         controller_family: "mitsubishi", controller_model: "FP80S",          post_processor: "MITSUBISHI_EA12S_FP80S_PRISM.cps" },
  { machine_id: "EDM-02", machine_name: "Mitsubishi EA12D",         controller_family: "mitsubishi", controller_model: "C30EA-2",        post_processor: "MITSUBISHI_EA12D_C30EA-2_PRISM.cps" },
  // Wire EDM (1) — Mitsubishi FA10S, primary controller variant W31MV-2
  { machine_id: "WEDM-01", machine_name: "Mitsubishi FA10S",        controller_family: "mitsubishi", controller_model: "W31MV-2",        post_processor: "MITSUBISHI_FA10S_W31MV-2_PRISM.cps" },
];

// Backward-compat (esbuild fix 2026-04-25) — production seed list lives
// in shop-config; this empty stub keeps callers compilable.
export interface JMDieDevelopmentSeed {
  domain: string;
  priority: number;
}
export const JM_DIE_DEVELOPMENT_SEEDS: readonly JMDieDevelopmentSeed[] = [];

