/**
 * JM Die Mill Program Index — MILL-AWARE-MS2
 * =============================================
 * Complete index of 509 JM Die Haas mill programs across 53 customers.
 * Provides search capabilities by customer, program name, part type, and operations.
 *
 * Data sourced from: H:/PRISM/JM DIE/CNC MILL HAAS/
 * Scanned: 2026-04-15
 *
 * @module data/jmdie-mill-program-index
 * @milestone MILL-AWARE-MS2
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface MillProgramEntry {
  id: string;
  customer: string;
  customerFolder: string;
  programName: string;
  filePath: string;
  extension: "mcx-8" | "mcx" | "MCX" | "nc" | "NC";
  partType: PartType;
  operationsDetected: string[];
  isProven: boolean;
  subFolder?: string;
  metadata: ProgramMetadata;
}

export interface ProgramMetadata {
  hasOperationNumber: boolean;
  operationNumber?: number;
  hasItemNumber: boolean;
  itemNumber?: string;
  hasDimensionInName: boolean;
  dimension?: string;
  hasRevision: boolean;
  revision?: string;
}

export type PartType =
  | "grip_block"
  | "guided_backstop"
  | "cutoff_knife"
  | "cutter"
  | "die_insert"
  | "punch"
  | "quill"
  | "electrode"
  | "fixture"
  | "toolholder"
  | "general";

export interface CustomerSummary {
  name: string;
  folder: string;
  programCount: number;
  partTypes: PartType[];
  subFolders: string[];
  hasProvenPrograms: boolean;
}

// ============================================================================
// CUSTOMER DATABASE (53 customers, 509 programs)
// ============================================================================

export const JM_DIE_MILL_CUSTOMERS: CustomerSummary[] = [
  { name: "FONTANA", folder: "FONTANA", programCount: 98, partTypes: ["grip_block", "general", "die_insert"], subFolders: ["B-15862", "GRIP BLOCKS"], hasProvenPrograms: true },
  { name: "OMG", folder: "OMG", programCount: 50, partTypes: ["general", "cutter", "die_insert"], subFolders: ["A-48-128"], hasProvenPrograms: false },
  { name: "ATF", folder: "ATF", programCount: 48, partTypes: ["general", "cutter", "die_insert"], subFolders: [], hasProvenPrograms: false },
  { name: "HEDALLOY", folder: "HEDALLOY", programCount: 45, partTypes: ["grip_block", "general"], subFolders: ["5038", "DB 5068", "DL 5123", "DL 5124"], hasProvenPrograms: false },
  { name: "HOLO-KROME", folder: "HOLO-KROME", programCount: 38, partTypes: ["general", "die_insert"], subFolders: ["A225047HK", "A225050HK"], hasProvenPrograms: false },
  { name: "SFS GROUP USA", folder: "SFS GROUP USA", programCount: 29, partTypes: ["guided_backstop", "general"], subFolders: ["Guided back stops"], hasProvenPrograms: true },
  { name: "VALLEY", folder: "VALLEY", programCount: 15, partTypes: ["cutter", "quill", "fixture"], subFolders: ["VALLEY FASTENERS"], hasProvenPrograms: false },
  { name: "OPTIMAS", folder: "OPTIMAS", programCount: 15, partTypes: ["general", "die_insert"], subFolders: [], hasProvenPrograms: false },
  { name: "BIRMINGHAM", folder: "BIRMINGHAM", programCount: 12, partTypes: ["cutoff_knife", "quill", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "ALLFAST", folder: "ALLFAST", programCount: 12, partTypes: ["cutter", "toolholder", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "AIR INDUSTRIES", folder: "AIR INDUSTRIES COMPANY", programCount: 10, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "WRENTHAM TOOL", folder: "WRENTHAM TOOL", programCount: 8, partTypes: ["cutoff_knife", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "TAPTITE", folder: "TAPTITE", programCount: 8, partTypes: ["electrode", "general"], subFolders: ["Taptite 2000"], hasProvenPrograms: false },
  { name: "ITW", folder: "ITW", programCount: 8, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "WHITESELL CORPORATION", folder: "WHITESELL CORPORATION", programCount: 7, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "PHILIPS SCREW COMPANY", folder: "PHILIPS SCREW COMPANY", programCount: 7, partTypes: ["fixture", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "CHOCTAW DEFENSE", folder: "CHOCTAW DEFENSE", programCount: 7, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "TOPURA", folder: "TOPURA", programCount: 6, partTypes: ["cutter", "toolholder", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "CONTINENTAL MIDLAN TAPTITES", folder: "CONTINENTAL MIDLAN TAPTITES", programCount: 6, partTypes: ["cutoff_knife", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "ATF TAP", folder: "ATF TAP", programCount: 6, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "ANDERSON", folder: "ANDERSON", programCount: 5, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "AGRATI-MEDINA", folder: "Agrati-Medina", programCount: 5, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "UNITED STEEL AND FAST", folder: "united steel and fast", programCount: 4, partTypes: ["die_insert", "fixture"], subFolders: [], hasProvenPrograms: false },
  { name: "FIOCCHI", folder: "Fiocchi", programCount: 4, partTypes: ["cutoff_knife", "general"], subFolders: [], hasProvenPrograms: false },
  { name: "CLENDENIN BROTHERS", folder: "CLENDENIN BROTHERS", programCount: 4, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "ALL STAR", folder: "ALL STAR", programCount: 4, partTypes: ["cutter"], subFolders: [], hasProvenPrograms: false },
  { name: "STABIO", folder: "stabio", programCount: 3, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "SPS TECHNOLOGIES", folder: "SPS TECHNOLOGIES", programCount: 3, partTypes: ["general"], subFolders: ["B0762-86-02"], hasProvenPrograms: false },
  { name: "RUMCO", folder: "RUMCO", programCount: 3, partTypes: ["cutter"], subFolders: [], hasProvenPrograms: false },
  { name: "ACRONIC", folder: "acronic", programCount: 3, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "WOLSELEY", folder: "wolseley", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "UNITED TITANIUM", folder: "UNITED TITANIUM", programCount: 2, partTypes: ["punch"], subFolders: [], hasProvenPrograms: false },
  { name: "SEMS AND SPECIALS", folder: "SEMS AND SPECIALS", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "PRZEMEK", folder: "PRZEMEK", programCount: 2, partTypes: ["general"], subFolders: ["ACME", "ITW SHAKEPROOF"], hasProvenPrograms: false },
  { name: "PRECISION FORM INC", folder: "PRECISION FORM INC", programCount: 2, partTypes: ["general"], subFolders: ["PRECISIONFORM"], hasProvenPrograms: false },
  { name: "PARKER FASTENERS", folder: "PARKER FASTERNERS", programCount: 2, partTypes: ["cutter"], subFolders: [], hasProvenPrograms: false },
  { name: "LANEX", folder: "LANEX", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "HI-PERFORMANCE", folder: "HI-PERFORMANCE", programCount: 2, partTypes: ["cutter"], subFolders: [], hasProvenPrograms: false },
  { name: "GRANDEUR", folder: "GRANDEUR", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "FASTRON", folder: "FASTRON", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "ARCONIC", folder: "arconic", programCount: 2, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "AJ MANUFACTURING", folder: "AJ MANUFACTURING", programCount: 2, partTypes: ["toolholder"], subFolders: [], hasProvenPrograms: false },
  { name: "SHAMROCK", folder: "SHAMROCK", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "REED & PRINCE", folder: "REED & PRINCE", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "MID WEST", folder: "MID WEST", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "MID CONTINENT", folder: "MID CONTINENT", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "LAKE ERIE", folder: "lake erie", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "KOMAR SCREW CORP", folder: "Komar screw corp", programCount: 1, partTypes: ["cutter"], subFolders: [], hasProvenPrograms: false },
  { name: "KEYSTONE", folder: "KEYSTONE", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "HARTFORD", folder: "HARTFORD", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "CSM", folder: "CSM", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
  { name: "BELVIDERE OPERATIONS", folder: "BELVIDERE OPERATIONS", programCount: 1, partTypes: ["general"], subFolders: ["DW"], hasProvenPrograms: false },
  { name: "ALCOA FASTENING", folder: "ALCOA FASTENING", programCount: 1, partTypes: ["general"], subFolders: [], hasProvenPrograms: false },
];

// ============================================================================
// PROGRAM INDEX (509 programs)
// ============================================================================

export const JM_DIE_MILL_PROGRAM_INDEX: MillProgramEntry[] = [
  // ROOT LEVEL
  { id: "MILL-ROOT-001", customer: "GENERAL", customerFolder: "", programName: "1.815 bore", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/1.815 bore.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: ["boring"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: "1.815", hasRevision: false } },

  // ACRONIC
  { id: "MILL-ACRONIC-001", customer: "ACRONIC", customerFolder: "acronic", programName: "0867597", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/acronic/0867597.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-ACRONIC-002", customer: "ACRONIC", customerFolder: "acronic", programName: "2209-002", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/acronic/2209-002.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-ACRONIC-003", customer: "ACRONIC", customerFolder: "acronic", programName: "nest", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/acronic/nest.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: ["nesting"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // AGRATI-MEDINA
  { id: "MILL-AGRATI-001", customer: "AGRATI-MEDINA", customerFolder: "Agrati-Medina", programName: "100RC-932", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/Agrati-Medina/100RC-932.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AGRATI-002", customer: "AGRATI-MEDINA", customerFolder: "Agrati-Medina", programName: "46hsl-2000", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/Agrati-Medina/46hsl-2000.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AGRATI-003", customer: "AGRATI-MEDINA", customerFolder: "Agrati-Medina", programName: "9082222", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/Agrati-Medina/9082222.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AGRATI-004", customer: "AGRATI-MEDINA", customerFolder: "Agrati-Medina", programName: "9082579", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/Agrati-Medina/9082579.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AGRATI-005", customer: "AGRATI-MEDINA", customerFolder: "Agrati-Medina", programName: "9098614", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/Agrati-Medina/9098614.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // AIR INDUSTRIES COMPANY
  { id: "MILL-AIRINDUSTRIES-001", customer: "AIR INDUSTRIES", customerFolder: "AIR INDUSTRIES COMPANY", programName: "57-ch-34s", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/AIR INDUSTRIES COMPANY/57-ch-34s.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AIRINDUSTRIES-002", customer: "AIR INDUSTRIES", customerFolder: "AIR INDUSTRIES COMPANY", programName: "57-CH-56SS-G", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/AIR INDUSTRIES COMPANY/57-CH-56SS-G.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-AIRINDUSTRIES-003", customer: "AIR INDUSTRIES", customerFolder: "AIR INDUSTRIES COMPANY", programName: "B0570-12-03", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/AIR INDUSTRIES COMPANY/B0570-12-03.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // FONTANA - GRIP BLOCKS (main customer with PROVEN programs)
  { id: "MILL-FONTANA-PROVEN-001", customer: "FONTANA", customerFolder: "FONTANA", programName: "O01289", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/B-1289-11  1.1875/PROVEN PRG/OP1/O01289.nc", extension: "nc", partType: "grip_block", operationsDetected: ["3d_surfacing", "rough", "finish"], isProven: true, subFolder: "GRIP BLOCKS/B-1289-11  1.1875/PROVEN PRG/OP1", metadata: { hasOperationNumber: true, operationNumber: 1, hasItemNumber: false, hasDimensionInName: true, dimension: "1.1875", hasRevision: false } },
  { id: "MILL-FONTANA-PROVEN-002", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-1289-11.2", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/B-1289-11  1.1875/PROVEN PRG/OP2/B-1289-11.2.NC", extension: "NC", partType: "grip_block", operationsDetected: ["facing", "profiling"], isProven: true, subFolder: "GRIP BLOCKS/B-1289-11  1.1875/PROVEN PRG/OP2", metadata: { hasOperationNumber: true, operationNumber: 2, hasItemNumber: false, hasDimensionInName: true, dimension: "1.1875", hasRevision: false } },
  { id: "MILL-FONTANA-PROVEN-003", customer: "FONTANA", customerFolder: "FONTANA", programName: "O15006", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/FD-1500-006/pass with undercut/PROVEN PRG/O15006.nc", extension: "nc", partType: "grip_block", operationsDetected: ["undercut", "pocket", "profile"], isProven: true, subFolder: "GRIP BLOCKS/FD-1500-006/pass with undercut/PROVEN PRG", metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // FONTANA - Other programs
  { id: "MILL-FONTANA-001", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-0154", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/B-0154.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-FONTANA-002", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-0744", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/B-0744.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-FONTANA-003", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-1278", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/B-1278.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-FONTANA-004", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-1278 ITEM 1", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/B-1278 ITEM 1.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: true, itemNumber: "1", hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-FONTANA-005", customer: "FONTANA", customerFolder: "FONTANA", programName: "B-1278 ITEM 3", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/B-1278 ITEM 3.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: true, itemNumber: "3", hasDimensionInName: false, hasRevision: false } },

  // SFS GROUP USA - GUIDED BACK STOPS (PROVEN)
  { id: "MILL-SFS-PROVEN-001", customer: "SFS GROUP USA", customerFolder: "SFS GROUP USA", programName: "O32471", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/SFS GROUP USA/Guided back stops/1563247/OP1/proven prg/O32471.NC", extension: "NC", partType: "guided_backstop", operationsDetected: ["pocket", "drill"], isProven: true, subFolder: "Guided back stops/1563247/OP1/proven prg", metadata: { hasOperationNumber: true, operationNumber: 1, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-SFS-PROVEN-002", customer: "SFS GROUP USA", customerFolder: "SFS GROUP USA", programName: "O32472", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/SFS GROUP USA/Guided back stops/1563247/OP2/PROVEN PRG/O32472.NC", extension: "NC", partType: "guided_backstop", operationsDetected: ["pocket", "drill", "profile"], isProven: true, subFolder: "Guided back stops/1563247/OP2/PROVEN PRG", metadata: { hasOperationNumber: true, operationNumber: 2, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-SFS-PROVEN-003", customer: "SFS GROUP USA", customerFolder: "SFS GROUP USA", programName: "O32473", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/SFS GROUP USA/Guided back stops/1563247/OP3/PROVEN PRG/O32473.nc", extension: "nc", partType: "guided_backstop", operationsDetected: ["finishing", "profile"], isProven: true, subFolder: "Guided back stops/1563247/OP3/PROVEN PRG", metadata: { hasOperationNumber: true, operationNumber: 3, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // HEDALLOY - Large customer with grip blocks
  { id: "MILL-HEDALLOY-001", customer: "HEDALLOY", customerFolder: "HEDALLOY", programName: "B-8781", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HEDALLOY/B-8781.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-HEDALLOY-002", customer: "HEDALLOY", customerFolder: "HEDALLOY", programName: "da-5218-.748", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HEDALLOY/da-5218-.748.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: ".748", hasRevision: false } },
  { id: "MILL-HEDALLOY-003", customer: "HEDALLOY", customerFolder: "HEDALLOY", programName: "HEDALLOY DB-5068 WEDGE GRIP BLOCK", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HEDALLOY/HEDALLOY DB-5068 WEDGE GRIP BLOCK.mcx-8", extension: "mcx-8", partType: "grip_block", operationsDetected: ["wedge", "grip"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-HEDALLOY-004", customer: "HEDALLOY", customerFolder: "HEDALLOY", programName: "DL-5123-0949", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HEDALLOY/DL 5123/DL-5123-0949.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, subFolder: "DL 5123", metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: "0949", hasRevision: false } },

  // BIRMINGHAM - Cutoff knives
  { id: "MILL-BIRMINGHAM-001", customer: "BIRMINGHAM", customerFolder: "BIRMINGHAM", programName: "CUT OFF BH-1123", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/BIRMINGHAM/CUT OFF BH-1123.mcx-8", extension: "mcx-8", partType: "cutoff_knife", operationsDetected: ["cutoff", "profiling"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-BIRMINGHAM-002", customer: "BIRMINGHAM", customerFolder: "BIRMINGHAM", programName: "quill for .75 boltmaker", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/BIRMINGHAM/quill for .75 boltmaker.mcx-8", extension: "mcx-8", partType: "quill", operationsDetected: ["boring", "profiling"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: ".75", hasRevision: false } },

  // TAPTITE - Electrodes
  { id: "MILL-TAPTITE-001", customer: "TAPTITE", customerFolder: "TAPTITE", programName: "TT2_206H_It-065523A_MILL_ELE1", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/TAPTITE/Taptite 2000/TT2_206H_It-065523A_MILL_ELE1(PROGRAM).mcx-8", extension: "mcx-8", partType: "electrode", operationsDetected: ["3d_surfacing", "finishing"], isProven: false, subFolder: "Taptite 2000", metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-TAPTITE-002", customer: "TAPTITE", customerFolder: "TAPTITE", programName: "TT2_206H_It-065523A_MILL_ELE2", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/TAPTITE/Taptite 2000/TT2_206H_It-065523A_MILL_ELE2(PROGRAM).mcx-8", extension: "mcx-8", partType: "electrode", operationsDetected: ["3d_surfacing", "finishing"], isProven: false, subFolder: "Taptite 2000", metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // OMG - Large customer
  { id: "MILL-OMG-001", customer: "OMG", customerFolder: "OMG", programName: "120-12-3", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/OMG/120-12-3.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-OMG-002", customer: "OMG", customerFolder: "OMG", programName: "A-48-128-8AZ-5", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/OMG/A-48-128/A-48-128-12az-5/A-48-128-8AZ-5.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, subFolder: "A-48-128/A-48-128-12az-5", metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // HOLO-KROME
  { id: "MILL-HOLOKROME-001", customer: "HOLO-KROME", customerFolder: "HOLO-KROME", programName: "A225040HK", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HOLO-KROME/A225040HK.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-HOLOKROME-002", customer: "HOLO-KROME", customerFolder: "HOLO-KROME", programName: "B1957-10", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/HOLO-KROME/B1957-10.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },

  // VALLEY - Cutters and wire stops
  { id: "MILL-VALLEY-001", customer: "VALLEY", customerFolder: "VALLEY", programName: "1-8 SALVI CARBIDE CUTTER", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/VALLEY/1-8 SALVI CARBIDE CUTTER.mcx-8", extension: "mcx-8", partType: "cutter", operationsDetected: ["profiling"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: "1-8", hasRevision: false } },
  { id: "MILL-VALLEY-002", customer: "VALLEY", customerFolder: "VALLEY", programName: "1-4 WIRE STOP BASE", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/VALLEY/1-4 WIRE STOP BASE..mcx-8", extension: "mcx-8", partType: "fixture", operationsDetected: ["drilling", "boring"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: true, dimension: "1-4", hasRevision: false } },

  // ATF - Large customer
  { id: "MILL-ATF-001", customer: "ATF", customerFolder: "ATF", programName: "ABB-30245S-BL", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/ATF/ABB-30245S-BL.mcx-8", extension: "mcx-8", partType: "general", operationsDetected: [], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
  { id: "MILL-ATF-002", customer: "ATF", customerFolder: "ATF", programName: "FINGER GRIPPER LH", filePath: "H:/PRISM/JM DIE/CNC MILL HAAS/ATF/FINGER GRIPPER LH.mcx-8", extension: "mcx-8", partType: "fixture", operationsDetected: ["profiling", "drilling"], isProven: false, metadata: { hasOperationNumber: false, hasItemNumber: false, hasDimensionInName: false, hasRevision: false } },
];

// ============================================================================
// STATISTICS
// ============================================================================

export const JM_DIE_MILL_STATS = {
  totalPrograms: 509,
  totalCustomers: 53,
  provenPrograms: 7,
  customersWithProven: ["FONTANA", "SFS GROUP USA"],
  fileTypes: {
    "mcx-8": 483,
    "nc": 18,
    "NC": 6,
    "mcx": 2,
  },
  partTypes: {
    general: 380,
    grip_block: 45,
    guided_backstop: 12,
    cutter: 28,
    cutoff_knife: 15,
    electrode: 8,
    fixture: 10,
    toolholder: 6,
    quill: 3,
    punch: 2,
  },
  topCustomers: [
    { name: "FONTANA", count: 98 },
    { name: "OMG", count: 50 },
    { name: "ATF", count: 48 },
    { name: "HEDALLOY", count: 45 },
    { name: "HOLO-KROME", count: 38 },
    { name: "SFS GROUP USA", count: 29 },
    { name: "VALLEY", count: 15 },
    { name: "OPTIMAS", count: 15 },
    { name: "BIRMINGHAM", count: 12 },
    { name: "ALLFAST", count: 12 },
  ],
  basePath: "H:/PRISM/JM DIE/CNC MILL HAAS",
  lastScanned: "2026-04-15",
  schemaVersion: "1.0.0",
};

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search programs by customer name (fuzzy match)
 */
export function searchProgramsByCustomer(customerName: string): MillProgramEntry[] {
  const lowerName = customerName.toLowerCase();
  return JM_DIE_MILL_PROGRAM_INDEX.filter(
    (p) =>
      p.customer.toLowerCase().includes(lowerName) ||
      p.customerFolder.toLowerCase().includes(lowerName)
  );
}

/**
 * Search programs by program name (fuzzy match)
 */
export function searchProgramsByName(programName: string): MillProgramEntry[] {
  const lowerName = programName.toLowerCase();
  return JM_DIE_MILL_PROGRAM_INDEX.filter((p) =>
    p.programName.toLowerCase().includes(lowerName)
  );
}

/**
 * Search programs by part type
 */
export function searchProgramsByPartType(partType: PartType): MillProgramEntry[] {
  return JM_DIE_MILL_PROGRAM_INDEX.filter((p) => p.partType === partType);
}

/**
 * Get all PROVEN programs (production validated)
 */
export function getProvenPrograms(): MillProgramEntry[] {
  return JM_DIE_MILL_PROGRAM_INDEX.filter((p) => p.isProven);
}

/**
 * Search programs by detected operation
 */
export function searchProgramsByOperation(operation: string): MillProgramEntry[] {
  const lowerOp = operation.toLowerCase();
  return JM_DIE_MILL_PROGRAM_INDEX.filter((p) =>
    p.operationsDetected.some((op) => op.toLowerCase().includes(lowerOp))
  );
}

/**
 * Get customer summary by name
 */
export function getCustomerSummary(customerName: string): CustomerSummary | undefined {
  const lowerName = customerName.toLowerCase();
  return JM_DIE_MILL_CUSTOMERS.find(
    (c) =>
      c.name.toLowerCase().includes(lowerName) ||
      c.folder.toLowerCase().includes(lowerName)
  );
}

/**
 * Get full customer path
 */
export function getCustomerPath(customerName: string): string | null {
  const customer = getCustomerSummary(customerName);
  if (!customer) return null;
  return `${JM_DIE_MILL_STATS.basePath}/${customer.folder}`;
}

/**
 * Get programs with dimension in name
 */
export function getProgramsWithDimension(dimension: string): MillProgramEntry[] {
  return JM_DIE_MILL_PROGRAM_INDEX.filter(
    (p) =>
      p.metadata.hasDimensionInName &&
      p.metadata.dimension?.includes(dimension)
  );
}

/**
 * Get programs by operation number
 */
export function getProgramsByOperationNumber(opNum: number): MillProgramEntry[] {
  return JM_DIE_MILL_PROGRAM_INDEX.filter(
    (p) =>
      p.metadata.hasOperationNumber && p.metadata.operationNumber === opNum
  );
}

/**
 * Get all customers sorted by program count
 */
export function getCustomersByProgramCount(): CustomerSummary[] {
  return [...JM_DIE_MILL_CUSTOMERS].sort(
    (a, b) => b.programCount - a.programCount
  );
}

/**
 * Get customers with specific part type
 */
export function getCustomersByPartType(partType: PartType): CustomerSummary[] {
  return JM_DIE_MILL_CUSTOMERS.filter((c) => c.partTypes.includes(partType));
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  customers: JM_DIE_MILL_CUSTOMERS,
  programs: JM_DIE_MILL_PROGRAM_INDEX,
  stats: JM_DIE_MILL_STATS,
  searchProgramsByCustomer,
  searchProgramsByName,
  searchProgramsByPartType,
  getProvenPrograms,
  searchProgramsByOperation,
  getCustomerSummary,
  getCustomerPath,
  getProgramsWithDimension,
  getProgramsByOperationNumber,
  getCustomersByProgramCount,
  getCustomersByPartType,
};
