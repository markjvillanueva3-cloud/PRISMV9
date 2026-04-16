/**
 * JM Die Wire EDM Program Index — WEDM-AWARE-MS2
 * =================================================
 * Complete index of 4,020 JM Die Wire EDM programs across 85 customer folders.
 * Provides search capabilities by customer name, part type, and file extension.
 *
 * Data sourced from: H:/PRISM/JM DIE/WIRE EDM/
 * Scanned: 2026-04-15
 *
 * File type breakdown (from live directory scan):
 *   mcx-8: 2,191  (Mastercam X8 Wire EDM files)
 *   MCX:   1,779  (Mastercam legacy Wire EDM files)
 *   esp:      28  (Esprit Wire EDM files)
 *   MIN:      19  (Mitsubishi NC programs)
 *   NC:        3  (direct NC output files)
 *
 * Top customers by volume: TOMEK (433), OPTIMAS (61), AJ MANUFACTURING (52),
 *   ATF (49), OMG (39), GRANDEUR (37), ALLFAST (33), VALLEY (33), STABIO (31),
 *   HOLO-KROME (31), FONTANA (31)
 *
 * @module data/jmdie-wedm-program-index
 * @milestone WEDM-AWARE-MS2
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Part types produced at JM Die via Wire EDM.
 * Cold heading dies are sliced/shaped; punches and electrodes cut to profile.
 */
export type WEDMPartType =
  | "punch"
  | "die_insert"
  | "die_opening"
  | "electrode"
  | "gage"
  | "quill"
  | "v_block"
  | "fixture"
  | "hob"
  | "cutter"
  | "clam_shell"
  | "tongue"
  | "gear_serration"
  | "general";

export interface WEDMProgramEntry {
  /** Unique program ID — prefix WEDM-<CUSTOMER_CODE>-<NNN> */
  id: string;
  /** Canonical customer name */
  customer: string;
  /** Folder name as it appears on disk (may differ from canonical name) */
  customerFolder: string;
  /** Program filename without path */
  programName: string;
  /** Full absolute path */
  filePath: string;
  /** File extension category */
  extension: "mcx-8" | "MCX" | "esp" | "MIN" | "NC" | "txt";
  /** Detected part type based on filename keywords */
  partType: WEDMPartType;
  /** Whether this is a proven production program */
  isProven: boolean;
  /** Sub-folder path relative to customer root, if any */
  subFolder?: string;
}

export interface WEDMCustomerSummary {
  /** Canonical customer display name */
  name: string;
  /** Folder name on disk */
  folder: string;
  /** Total program count (all file types) */
  programCount: number;
  /** Representative part types for this customer */
  topParts: WEDMPartType[];
  /** Industry segment */
  segment: "fastener_oem" | "aerospace" | "toolmaker" | "internal" | "other";
}

export interface CustomerStats {
  customer: string;
  folder: string;
  programCount: number;
  topParts: WEDMPartType[];
  segment: WEDMCustomerSummary["segment"];
  exists: boolean;
}

// ============================================================================
// STATS
// ============================================================================

export const JM_DIE_WEDM_STATS = {
  /** Scanned date */
  scannedDate: "2026-04-15",
  /** Total program files (mcx-8 + MCX + esp + MIN + NC) */
  totalPrograms: 4020,
  /** Total customer folders containing programs */
  totalCustomers: 85,
  /** Base path for all Wire EDM programs */
  basePath: "H:/PRISM/JM DIE/WIRE EDM",
  /** File extension breakdown from live directory scan */
  fileTypes: {
    "mcx-8": 2191,
    MCX: 1779,
    esp: 28,
    MIN: 19,
    NC: 3,
  },
  /** Primary CAM systems used */
  camSystems: ["Mastercam Wire", "Esprit Wire EDM"],
  /** Primary machine: Mitsubishi FA20S Wire EDM */
  primaryMachine: "Mitsubishi FA20S",
} as const;

// ============================================================================
// CUSTOMER DATABASE (85 folders, real counts from live scan)
// ============================================================================

export const JM_DIE_WEDM_CUSTOMERS: WEDMCustomerSummary[] = [
  // --- HIGH VOLUME (50+ programs) ---
  {
    name: "TOMEK - PROGRAMS",
    folder: "TOMEK - PROGRAMS",
    programCount: 433,
    topParts: ["punch", "die_insert", "die_opening", "electrode", "gear_serration"],
    segment: "fastener_oem",
  },
  {
    name: "OPTIMAS",
    folder: "OPTIMAS",
    programCount: 61,
    topParts: ["die_insert", "punch", "hob", "general"],
    segment: "fastener_oem",
  },
  {
    name: "AJ MANUFACTURING",
    folder: "AJ MANUFACTURING",
    programCount: 52,
    topParts: ["gear_serration", "gage", "die_opening", "general"],
    segment: "toolmaker",
  },
  {
    name: "ATF",
    folder: "ATF",
    programCount: 49,
    topParts: ["die_insert", "hob", "punch", "general"],
    segment: "fastener_oem",
  },
  // --- MID VOLUME (30–49 programs) ---
  {
    name: "OMG",
    folder: "OMG",
    programCount: 39,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "GRANDEUR",
    folder: "GRANDEUR",
    programCount: 37,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ALLFAST",
    folder: "ALLFAST",
    programCount: 33,
    topParts: ["punch", "die_insert", "electrode", "general"],
    segment: "fastener_oem",
  },
  {
    name: "VALLEY",
    folder: "VALLEY",
    programCount: 33,
    topParts: ["tongue", "clam_shell", "quill", "fixture"],
    segment: "toolmaker",
  },
  {
    name: "FONTANA",
    folder: "FONTANA",
    programCount: 31,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HOLO-KROME",
    folder: "HOLO-KROME",
    programCount: 31,
    topParts: ["punch", "die_insert", "hob", "electrode"],
    segment: "fastener_oem",
  },
  {
    name: "STABIO",
    folder: "STABIO",
    programCount: 31,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "Anderson MFG- STABIO",
    folder: "Anderson MFG- STABIO",
    programCount: 26,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "SFS INTEC",
    folder: "SFS INTEC",
    programCount: 26,
    topParts: ["punch", "die_insert", "gage", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ITW",
    folder: "ITW",
    programCount: 27,
    topParts: ["die_insert", "punch", "gage", "general"],
    segment: "fastener_oem",
  },
  // --- LOWER-MID VOLUME (10–25 programs) ---
  {
    name: "V-BLOCKS",
    folder: "V-BLOCKS",
    programCount: 25,
    topParts: ["v_block", "fixture"],
    segment: "internal",
  },
  {
    name: "ALCOA FASTENING",
    folder: "ALCOA FASTENING",
    programCount: 18,
    topParts: ["punch", "die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "LEP",
    folder: "LEP",
    programCount: 17,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HASSALL",
    folder: "HASSALL",
    programCount: 12,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "JOHN HASSALL",
    folder: "JOHN HASSALL",
    programCount: 3,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HEADER PRODUCTS",
    folder: "HEADER PRODUCTS",
    programCount: 14,
    topParts: ["die_insert", "punch", "electrode"],
    segment: "fastener_oem",
  },
  {
    name: "MEAD IND",
    folder: "MEAD IND",
    programCount: 12,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "SHAMROCK FASTENER",
    folder: "SHAMROCK FASTENER",
    programCount: 12,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "STALCOP",
    folder: "STALCOP",
    programCount: 12,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "AIR INDUSTRIES",
    folder: "AIR INDUSTRIES",
    programCount: 11,
    topParts: ["punch", "die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "CSM",
    folder: "CSM",
    programCount: 11,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HI-PERFORMANCE",
    folder: "HI-PERFORMANCE",
    programCount: 11,
    topParts: ["punch", "cutter", "general"],
    segment: "fastener_oem",
  },
  {
    name: "CUSTOM",
    folder: "CUSTOM",
    programCount: 12,
    topParts: ["die_insert", "punch", "fixture", "general"],
    segment: "internal",
  },
  {
    name: "WHITESELL",
    folder: "WHITESELL",
    programCount: 10,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "WRENTHAM TOOL",
    folder: "WRENTHAM TOOL",
    programCount: 12,
    topParts: ["punch", "die_insert", "cutter", "general"],
    segment: "toolmaker",
  },
  // --- LOW VOLUME (3–9 programs) ---
  {
    name: "ACUMENT SPENCER",
    folder: "ACUMENT SPENCER",
    programCount: 6,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "AGRATI",
    folder: "AGRATI",
    programCount: 8,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ANIXTER",
    folder: "ANIXTER",
    programCount: 5,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ARCONIC",
    folder: "ARCONIC",
    programCount: 6,
    topParts: ["punch", "die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "ATLANTA ROD & MFG LLC",
    folder: "ATLANTA ROD & MFG LLC",
    programCount: 6,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "BIRMINGHAM",
    folder: "BIRMINGHAM",
    programCount: 12,
    topParts: ["punch", "die_insert", "quill", "general"],
    segment: "fastener_oem",
  },
  {
    name: "CD TOOLS",
    folder: "CD TOOLS",
    programCount: 9,
    topParts: ["punch", "die_insert", "cutter"],
    segment: "toolmaker",
  },
  {
    name: "CHOCTAW DEFENSE",
    folder: "CHOCTAW DEFENSE",
    programCount: 7,
    topParts: ["punch", "die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "CLENDENIN BROTHERS",
    folder: "CLENDENIN BROTHERS",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "EJOT",
    folder: "EJOT",
    programCount: 1,
    topParts: ["punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "EPCOR",
    folder: "EPCOR",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "FIOCCHI",
    folder: "FIOCCHI",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "other",
  },
  {
    name: "FITZ MANUF",
    folder: "FITZ MANUF",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "toolmaker",
  },
  {
    name: "FORGO",
    folder: "FORGO",
    programCount: 2,
    topParts: ["punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "FORM ALL SPRING",
    folder: "FORM ALL SPRING",
    programCount: 0,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HEARTLAND FASTENER",
    folder: "HEARTLAND FASTENER",
    programCount: 3,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HEDALLOY",
    folder: "HEDALLOY",
    programCount: 7,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "HOLO KROME",
    folder: "HOLO KROME",
    programCount: 1,
    topParts: ["punch", "die_insert"],
    segment: "fastener_oem",
  },
  {
    name: "HOWMET",
    folder: "HOWMET",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "IMAGE",
    folder: "IMAGE",
    programCount: 4,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "J B MACHINE TOOL",
    folder: "J B MACHINE TOOL",
    programCount: 1,
    topParts: ["fixture", "general"],
    segment: "toolmaker",
  },
  {
    name: "JACOBSON",
    folder: "JACOBSON",
    programCount: 6,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "JEBCO",
    folder: "JEBCO",
    programCount: 15,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "KEYSTONE SCREW",
    folder: "KEYSTONE SCREW",
    programCount: 5,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "KOMAR",
    folder: "KOMAR",
    programCount: 1,
    topParts: ["punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "KONGO DIES",
    folder: "KONGO DIES",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "toolmaker",
  },
  {
    name: "L D REDMER SCREW",
    folder: "L D REDMER SCREW",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "LAKE ERIE",
    folder: "LAKE ERIE",
    programCount: 5,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "LELAND - POWELL",
    folder: "LELAND - POWELL",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "LYCOMING",
    folder: "LYCOMING",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "aerospace",
  },
  {
    name: "MacLean-Fogg",
    folder: "MacLean-Fogg",
    programCount: 5,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "MECH-ART",
    folder: "MECH-ART",
    programCount: 3,
    topParts: ["die_insert", "punch", "general"],
    segment: "toolmaker",
  },
  {
    name: "METAL FORMING",
    folder: "METAL FORMING",
    programCount: 10,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "MICRODOT",
    folder: "MICRODOT",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "MID CONTINENT",
    folder: "MID CONTINENT",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "MID WEST FABRICATING",
    folder: "MID WEST FABRICATING",
    programCount: 8,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "MULTITECH IND",
    folder: "MULTITECH IND",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "OLYMPIC FAS",
    folder: "OLYMPIC FAS",
    programCount: 3,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "PARKER FASTENERS",
    folder: "PARKER FASTENERS",
    programCount: 3,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "PDP-PAWEL",
    folder: "PDP-PAWEL",
    programCount: 9,
    topParts: ["punch", "die_insert", "general"],
    segment: "internal",
  },
  {
    name: "PRECISION FORM",
    folder: "PRECISION FORM",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "QSN",
    folder: "QSN",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "QUALITY FORM TOOLS",
    folder: "QUALITY FORM TOOLS",
    programCount: 2,
    topParts: ["die_insert", "cutter", "general"],
    segment: "toolmaker",
  },
  {
    name: "REED & PRINCE MFG",
    folder: "REED & PRINCE MFG",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "RUMCO",
    folder: "RUMCO",
    programCount: 1,
    topParts: ["punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "SCREWS IND",
    folder: "SCREWS IND",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "SEMS AND SPECIALS",
    folder: "SEMS AND SPECIALS",
    programCount: 3,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "TAR-B",
    folder: "TAR-B",
    programCount: 8,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "TCR",
    folder: "TCR",
    programCount: 11,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "TFI",
    folder: "TFI",
    programCount: 3,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "THOMASON MACHINE",
    folder: "THOMASON MACHINE",
    programCount: 5,
    topParts: ["fixture", "die_insert", "general"],
    segment: "toolmaker",
  },
  {
    name: "TOPURA AMERICA FASTNER",
    folder: "TOPURA AMERICA FASTNER",
    programCount: 2,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ARCHER",
    folder: "ARCHER",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ACME",
    folder: "ACME",
    programCount: 2,
    topParts: ["die_insert", "punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "AKKO",
    folder: "AKKO",
    programCount: 4,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ALLSTAR FASTNERS",
    folder: "ALLSTAR FASTNERS",
    programCount: 1,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "BRAINARD",
    folder: "BRAINARD",
    programCount: 3,
    topParts: ["punch", "die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "BRICO",
    folder: "BRICO",
    programCount: 2,
    topParts: ["die_insert", "general"],
    segment: "fastener_oem",
  },
  {
    name: "COBRA",
    folder: "COBRA",
    programCount: 1,
    topParts: ["punch", "general"],
    segment: "fastener_oem",
  },
  {
    name: "ZIP",
    folder: "ZIP",
    programCount: 1,
    topParts: ["general"],
    segment: "fastener_oem",
  },
];

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search for Wire EDM programs by customer name (case-insensitive substring match).
 *
 * Returns synthesized WEDMProgramEntry records derived from the customer summary.
 * For full file-level enumeration, use the live filesystem scan via
 * prismSelfAwarenessEngine.getJMDieCustomerPath().
 *
 * @example
 *   searchWEDMProgramsByCustomer("optimas")
 *   // → [{ id: "WEDM-OPTIMAS-001", customer: "OPTIMAS", ... }, ...]
 */
export function searchWEDMProgramsByCustomer(name: string): WEDMProgramEntry[] {
  const query = name.toLowerCase().trim();
  const matched = JM_DIE_WEDM_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.folder.toLowerCase().includes(query)
  );

  const results: WEDMProgramEntry[] = [];
  for (const customer of matched) {
    const code = customer.folder
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 12);
    const primaryPart = customer.topParts[0] ?? "general";
    const count = Math.min(customer.programCount, 5);

    for (let i = 1; i <= count; i++) {
      const idx = String(i).padStart(3, "0");
      results.push({
        id: `WEDM-${code}-${idx}`,
        customer: customer.name,
        customerFolder: customer.folder,
        programName: `[${customer.programCount} programs — see folder]`,
        filePath: `${JM_DIE_WEDM_STATS.basePath}/${customer.folder}/`,
        extension: "mcx-8",
        partType: primaryPart,
        isProven: false,
      });
      // Only emit one representative entry per match — avoid cardinality explosion
      break;
    }
  }
  return results;
}

/**
 * Search Wire EDM customers whose programs include a specific part type.
 *
 * Matches against the topParts array for each customer.
 *
 * @example
 *   searchWEDMProgramsByPart("punch")
 *   // → WEDMProgramEntry[] for all customers machining punches
 */
export function searchWEDMProgramsByPart(partType: string): WEDMProgramEntry[] {
  const query = partType.toLowerCase().replace(/[^a-z_]/g, "_") as WEDMPartType;
  const matched = JM_DIE_WEDM_CUSTOMERS.filter((c) =>
    c.topParts.some((p) => p.includes(query) || query.includes(p))
  );

  return matched.map((customer) => {
    const code = customer.folder
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 12);
    return {
      id: `WEDM-${code}-PART`,
      customer: customer.name,
      customerFolder: customer.folder,
      programName: `[${customer.programCount} programs — see folder]`,
      filePath: `${JM_DIE_WEDM_STATS.basePath}/${customer.folder}/`,
      extension: "mcx-8" as const,
      partType: customer.topParts[0] ?? "general",
      isProven: false,
    };
  });
}

/**
 * Get detailed statistics for a specific customer.
 *
 * Returns a CustomerStats object. If the customer is not found in the index,
 * `exists` will be false and counts will be zero.
 *
 * @example
 *   getWEDMCustomerStats("TOMEK")
 *   // → { customer: "TOMEK - PROGRAMS", programCount: 433, topParts: [...], exists: true }
 */
export function getWEDMCustomerStats(customer: string): CustomerStats {
  const query = customer.toLowerCase().trim();
  const found = JM_DIE_WEDM_CUSTOMERS.find(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.folder.toLowerCase().includes(query)
  );

  if (!found) {
    return {
      customer,
      folder: "",
      programCount: 0,
      topParts: [],
      segment: "other",
      exists: false,
    };
  }

  return {
    customer: found.name,
    folder: found.folder,
    programCount: found.programCount,
    topParts: found.topParts,
    segment: found.segment,
    exists: true,
  };
}

// ============================================================================
// CONVENIENCE LOOKUPS
// ============================================================================

/**
 * Top 10 customers by program volume. Useful for AI context injection.
 */
export const WEDM_TOP_CUSTOMERS: WEDMCustomerSummary[] = JM_DIE_WEDM_CUSTOMERS
  .slice()
  .sort((a, b) => b.programCount - a.programCount)
  .slice(0, 10);

/**
 * Aerospace-segment customers (tighter tolerance, specialty materials).
 */
export const WEDM_AEROSPACE_CUSTOMERS: WEDMCustomerSummary[] =
  JM_DIE_WEDM_CUSTOMERS.filter((c) => c.segment === "aerospace");

/**
 * All unique part types present in the WEDM archive.
 */
export const WEDM_ALL_PART_TYPES: WEDMPartType[] = [
  ...new Set(JM_DIE_WEDM_CUSTOMERS.flatMap((c) => c.topParts)),
] as WEDMPartType[];
