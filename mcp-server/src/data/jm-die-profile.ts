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
 * Authoritative JM Die controller inventory. Start with an empty array —
 * downstream engines treat `resolveMachine(id) === null` as "unknown" and
 * surface an actionable error, so missing rows degrade gracefully. Rows
 * are added as machines are onboarded via `/machine-harden`.
 */
export const JM_DIE_CONTROLLER_MAP: readonly MachineControllerPair[] = [] as const;

// Backward-compat (esbuild fix 2026-04-25) — production seed list lives
// in shop-config; this empty stub keeps callers compilable.
export interface JMDieDevelopmentSeed {
  domain: string;
  priority: number;
}
export const JM_DIE_DEVELOPMENT_SEEDS: readonly JMDieDevelopmentSeed[] = [];

