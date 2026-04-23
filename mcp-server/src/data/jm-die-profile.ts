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
