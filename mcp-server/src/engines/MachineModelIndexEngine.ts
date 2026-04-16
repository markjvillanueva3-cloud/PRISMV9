/**
 * MachineModelIndexEngine — Indexes OEM machine model STEP files + generic models
 *
 * Scans two resource directories:
 *   1. MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION — 12 OEM subdirectories
 *      (HAAS, Hurco, MAZAK, OKUMA, BROTHER, MATSUURA, DATRON, DN SOLUTIONS,
 *       KERN, MAKINO, HELLER, DMG MORI) containing 234 .step + 1 .mch files
 *   2. GENERIC MACHINE MODELS — 34 generic axis configuration models
 *
 * Extracts OEM, model name, machine type, and axis configuration from
 * the filename convention: "[OEM] [Model].step"
 *
 * Skips .zip duplicates (both "-uploaded.zip" and plain ".zip").
 *
 * @module engines/MachineModelIndexEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Machine type classification derived from model name keywords. */
export type MachineType =
  | "vmc"
  | "hmc"
  | "lathe"
  | "mill_turn"
  | "drill_mill"
  | "router"
  | "wire_edm"
  | "sinker_edm"
  | "grinder"
  | "5axis"
  | "high_speed"
  | "unknown";

/** Axis configuration derived from model name and machine type. */
export type AxisConfig =
  | "3axis"
  | "4axis"
  | "5axis"
  | "turning_2axis"
  | "turning_with_milling"
  | "mill_turn"
  | "unknown";

/** A single indexed machine model. */
export interface MachineModelEntry {
  /** Original filename including extension. */
  filename: string;
  /** OEM / manufacturer name (from parent directory or filename prefix). */
  oem: string;
  /** Model name extracted from filename (OEM prefix and extension stripped). */
  modelName: string;
  /** Classified machine type. */
  machineType: MachineType;
  /** Classified axis configuration. */
  axisConfig: AxisConfig;
  /** Absolute file path. */
  filePath: string;
  /** File size in bytes. */
  fileSize: number;
  /** Source directory: "oem" for OEM subdirs, "generic" for generic models. */
  source: "oem" | "generic";
  /** File format: "step" or "mch". */
  format: "step" | "mch";
}

/** Result of a full harvest across all machine model directories. */
export interface MachineModelIndexResult {
  /** All indexed machine models. */
  models: MachineModelEntry[];
  /** Total number of models indexed. */
  totalModels: number;
  /** Count per OEM (e.g., { HAAS: 65, Hurco: 46 }). */
  byOem: Record<string, number>;
  /** Count per machine type (e.g., { vmc: 120, hmc: 30 }). */
  byMachineType: Record<string, number>;
  /** Count per axis configuration. */
  byAxisConfig: Record<string, number>;
  /** Count per file format (step vs mch). */
  byFormat: Record<string, number>;
  /** Number of distinct OEMs. */
  oemCount: number;
  /** ISO timestamp of harvest. */
  timestamp: string;
}

/** Audit summary returned by audit(). */
export interface MachineModelAuditResult {
  totalModels: number;
  oemCount: number;
  byOem: Record<string, number>;
  byMachineType: Record<string, number>;
  byAxisConfig: Record<string, number>;
  byFormat: Record<string, number>;
  genericCount: number;
  oemModelCount: number;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OEM_ROOT =
  "H:/prism/resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION";

const GENERIC_ROOT = "H:/prism/resources/GENERIC MACHINE MODELS";

/** Valid model file extensions (lowercase). */
const VALID_EXTENSIONS = new Set([".step", ".mch"]);

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

/**
 * Classify machine type from model name keywords.
 * Rules applied in priority order (first match wins).
 *
 * @param modelName - Model name string (e.g., "INTEGREX e-1060V-6 II")
 * @param oem - OEM name for additional context
 * @param isGeneric - Whether this is a generic model
 * @returns Classified MachineType
 */
function classifyMachineType(
  modelName: string,
  oem: string,
  isGeneric: boolean
): MachineType {
  const upper = modelName.toUpperCase();
  const combined = `${oem.toUpperCase()} ${upper}`;

  // Mill-turn / multitasking (highest priority — these are complex machines)
  if (
    upper.includes("INTEGREX") ||
    upper.includes("MULTUS") ||
    upper.includes("MILL-TURN") ||
    upper.includes("MILL TURN") ||
    upper.includes("VTM")
  ) {
    return "mill_turn";
  }

  // Horizontal machining centers
  if (
    upper.includes("HMC") ||
    /\bEC-/.test(upper) ||
    /\bNH\b/.test(upper) ||
    upper.includes("NHX") ||
    /\bHCN/.test(upper) ||
    /\bMA-/.test(upper) ||
    /\bMB-\d+H/.test(upper) ||
    upper.includes("DCX")
  ) {
    return "hmc";
  }

  // 5-axis machines (before VMC since some 5-axis have VM-like prefixes)
  if (
    upper.includes("UMC") ||
    upper.includes("VARIAXIS") ||
    upper.includes("VCU") ||
    /\bMU-/.test(upper) ||
    upper.includes("5AX") ||
    upper.includes("5X") ||
    upper.includes("5SI") ||
    upper.includes("DVF") ||
    upper.includes("MAM7") ||
    upper.includes("D200Z") ||
    upper.includes("DA300") ||
    upper.includes("PYRAMID") ||
    upper.includes("MICRO VARIO") ||
    (upper.includes("EVO") && oem.toUpperCase() === "KERN") ||
    upper.includes("TRUNNION")
  ) {
    return "5axis";
  }

  // High-speed machines
  if (upper.includes("SPEEDIO")) {
    return "high_speed";
  }

  // Vertical machining centers
  if (
    /\bVMC\b/.test(upper) ||
    /\bVM[\s-]/.test(upper) ||
    /\bVM\d/.test(upper) ||
    upper.includes("VM ONE") ||
    /\bVF-/.test(upper) ||
    /\bVR-/.test(upper) ||
    upper.includes("GENOS M") ||
    /\bMX-/.test(upper) ||
    /\bVC-/.test(upper) ||
    /\bVC\d/.test(upper) ||
    /\bVCN/.test(upper) ||
    /\bVCX/.test(upper) ||
    /\bVTC/.test(upper) ||
    upper.includes("MINI MILL") ||
    upper.includes("SUPER MINI") ||
    upper.includes("DESKTOP MILL") ||
    /\bCM-/.test(upper) ||
    /\bCV\d/.test(upper) ||
    /\bFJV/.test(upper) ||
    upper.includes("HBMX") ||
    /\bVMX/.test(upper) ||
    /\bBX\s?\d/.test(upper) ||
    upper.includes("HF ") ||
    upper.includes("DNM") ||
    /\bDT-/.test(upper) ||
    upper.includes("MILLAC") ||
    upper.includes("MCR") ||
    upper.includes("CMX") ||
    upper.includes("VX-") ||
    upper.includes("AM") && oem.toUpperCase() === "MAZAK"
  ) {
    return "vmc";
  }

  // Lathes / turning centers
  if (
    /\bTM[\s-]?\d/.test(upper) ||
    /\bTMX/.test(upper) ||
    upper.includes("GENOS L") ||
    /\bLB\d/.test(upper) ||
    upper.includes("SPACE TURN") ||
    /\bQT/.test(upper) ||
    upper.includes("TURN")
  ) {
    return "lathe";
  }

  // Drill-mill
  if (/\bDM-/.test(upper)) {
    return "drill_mill";
  }

  // EDM
  if (upper.includes("EDM") || upper.includes("WEDM")) {
    return "wire_edm";
  }

  // Generic models — classify from filename patterns
  if (isGeneric) {
    const lowerName = modelName.toLowerCase();
    if (lowerName.includes("router")) return "router";
    if (lowerName.includes("5")) return "5axis";
    if (lowerName.includes("4")) return "vmc"; // 4-axis VMC variant
    if (lowerName.includes("3")) return "vmc";
    return "unknown";
  }

  return "unknown";
}

/**
 * Classify axis configuration from machine type and model name.
 *
 * @param machineType - Already-classified machine type
 * @param modelName - Model name for detail extraction
 * @param isGeneric - Whether this is a generic model
 * @returns Classified AxisConfig
 */
function classifyAxisConfig(
  machineType: MachineType,
  modelName: string,
  isGeneric: boolean
): AxisConfig {
  const upper = modelName.toUpperCase();

  // Generic models: parse axis count from filename
  if (isGeneric) {
    const lower = modelName.toLowerCase();
    if (lower.includes("5-axis") || lower.includes("5 axis")) return "5axis";
    if (lower.includes("4-axis") || lower.includes("4 axis")) return "4axis";
    if (lower.includes("3-axis") || lower.includes("3 axis")) return "3axis";
    return "unknown";
  }

  // Mill-turn machines
  if (machineType === "mill_turn") return "mill_turn";

  // Lathes — check for Y-axis milling capability (MY suffix)
  if (machineType === "lathe") {
    if (/MY\b/i.test(upper)) return "turning_with_milling";
    return "turning_2axis";
  }

  // Explicitly 5-axis machines
  if (machineType === "5axis") return "5axis";

  // Check for 5-axis indicators in VMC/HMC models
  if (
    upper.includes("5AX") ||
    upper.includes("5X") ||
    upper.includes("5SI") ||
    upper.includes("TRUNNION") ||
    upper.includes("UMC") ||
    upper.includes("VARIAXIS") ||
    /\bMU-/.test(upper) ||
    upper.includes("SR") ||
    upper.includes("SRT") ||
    upper.includes("UD")
  ) {
    return "5axis";
  }

  // Check for 4-axis indicators (rotary table/indexer)
  if (
    upper.includes("4AX") ||
    upper.includes("4 AXIS") ||
    upper.includes("HRT") ||
    upper.includes("ROTARY") ||
    /\b4AX\b/.test(upper)
  ) {
    return "4axis";
  }

  // VMC/HMC default to 3-axis
  if (machineType === "vmc" || machineType === "hmc") return "3axis";

  // High-speed defaults
  if (machineType === "high_speed") return "3axis";

  // Drill-mill defaults
  if (machineType === "drill_mill") return "3axis";

  return "unknown";
}

/**
 * Extract model name from filename by stripping OEM prefix and extension.
 *
 * Examples:
 *   "HAAS EC-1600.step" with oem "HAAS" -> "EC-1600"
 *   "Hurco VM 30 i.step" with oem "HURCO" -> "VM 30 i"
 *   "Mazak INTEGREX e-1060V-6 II.step" with oem "MAZAK" -> "INTEGREX e-1060V-6 II"
 *
 * @param filename - Full filename including extension
 * @param oem - OEM name to strip from prefix
 * @returns Cleaned model name
 */
function extractModelName(filename: string, oem: string): string {
  // Remove extension
  const noExt = filename.replace(/\.(step|mch)$/i, "");

  // Strip OEM prefix (case-insensitive) and leading whitespace
  const oemPattern = new RegExp(`^${escapeRegex(oem)}\\s+`, "i");
  let model = noExt.replace(oemPattern, "");

  // Handle edge case: "Hurco Hurco VMX 42 SR.step" -> strip double OEM
  const doubleOem = new RegExp(`^${escapeRegex(oem)}\\s+`, "i");
  model = model.replace(doubleOem, "");

  return model.trim();
}

/** Escape special regex characters in a string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a directory exists using stat().
 *
 * @param dirPath - Absolute path to check
 * @returns true if path exists and is a directory
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const s = await stat(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * MachineModelIndexEngine — Indexes 306 OEM machine model STEP files + generic models.
 *
 * Static class following PRISM engine conventions:
 *   - getSources() — returns directory paths and expected counts
 *   - harvest() — main indexing method
 *   - audit() — summary statistics
 *   - findByOem() — filter by manufacturer
 *   - findByType() — filter by machine type
 */
export class MachineModelIndexEngine {
  /**
   * Returns the source directories and expected file counts.
   *
   * @returns Object with oemRoot, genericRoot, and expected counts
   */
  static getSources(): {
    oemRoot: string;
    genericRoot: string;
    expectedOemSubdirs: number;
    expectedGenericModels: number;
  } {
    return {
      oemRoot: OEM_ROOT,
      genericRoot: GENERIC_ROOT,
      expectedOemSubdirs: 12,
      expectedGenericModels: 34,
    };
  }

  /**
   * Harvest all machine models from OEM and generic directories.
   *
   * Scans each OEM subdirectory for .step/.mch files, extracts metadata,
   * classifies machine type and axis config, then scans generic models.
   * Skips .zip files (both "-uploaded.zip" and plain ".zip" duplicates).
   *
   * @returns MachineModelIndexResult with all models and summary counts
   */
  static async harvest(): Promise<MachineModelIndexResult> {
    const models: MachineModelEntry[] = [];

    // ------------------------------------------------------------------
    // 1. Scan OEM subdirectories
    // ------------------------------------------------------------------
    if (await directoryExists(OEM_ROOT)) {
      const oemEntries = await readdir(OEM_ROOT, { withFileTypes: true });

      // Process files at root level (e.g., DMG MORI CMX 50 U.mch)
      for (const entry of oemEntries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!VALID_EXTENSIONS.has(ext)) continue;
        if (entry.name.toLowerCase().endsWith(".zip")) continue;

        const filePath = path.join(OEM_ROOT, entry.name);
        const fileStat = await stat(filePath);

        // Infer OEM from filename prefix (before first space or known OEM)
        const oem = inferOemFromFilename(entry.name);
        const modelName = extractModelName(entry.name, oem);

        const machineType = classifyMachineType(modelName, oem, false);
        const axisConfig = classifyAxisConfig(machineType, modelName, false);

        models.push({
          filename: entry.name,
          oem,
          modelName,
          machineType,
          axisConfig,
          filePath: filePath.replace(/\\/g, "/"),
          fileSize: fileStat.size,
          source: "oem",
          format: ext.replace(".", "") as "step" | "mch",
        });
      }

      // Process OEM subdirectories
      for (const entry of oemEntries) {
        if (!entry.isDirectory()) continue;

        const oemDir = path.join(OEM_ROOT, entry.name);
        const oemName = entry.name;
        let files: string[];

        try {
          files = await readdir(oemDir);
        } catch (err) {
          log.warn(
            `MachineModelIndexEngine: cannot read OEM directory ${oemDir}: ${err}`
          );
          continue;
        }

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();

          // Skip non-model files and all zip files
          if (!VALID_EXTENSIONS.has(ext)) continue;
          if (file.toLowerCase().endsWith(".zip")) continue;

          const filePath = path.join(oemDir, file);
          let fileStat: Awaited<ReturnType<typeof stat>>;

          try {
            fileStat = await stat(filePath);
          } catch {
            continue;
          }

          if (!fileStat.isFile()) continue;

          const modelName = extractModelName(file, oemName);
          const machineType = classifyMachineType(modelName, oemName, false);
          const axisConfig = classifyAxisConfig(machineType, modelName, false);

          models.push({
            filename: file,
            oem: oemName,
            modelName,
            machineType,
            axisConfig,
            filePath: filePath.replace(/\\/g, "/"),
            fileSize: fileStat.size,
            source: "oem",
            format: ext.replace(".", "") as "step" | "mch",
          });
        }
      }
    } else {
      log.warn(
        `MachineModelIndexEngine: OEM root not found: ${OEM_ROOT}`
      );
    }

    // ------------------------------------------------------------------
    // 2. Scan generic models
    // ------------------------------------------------------------------
    if (await directoryExists(GENERIC_ROOT)) {
      let genericFiles: string[];

      try {
        genericFiles = await readdir(GENERIC_ROOT);
      } catch (err) {
        log.warn(
          `MachineModelIndexEngine: cannot read generic directory: ${err}`
        );
        genericFiles = [];
      }

      for (const file of genericFiles) {
        const ext = path.extname(file).toLowerCase();
        if (!VALID_EXTENSIONS.has(ext)) continue;
        if (file.toLowerCase().endsWith(".zip")) continue;

        const filePath = path.join(GENERIC_ROOT, file);
        let fileStat: Awaited<ReturnType<typeof stat>>;

        try {
          fileStat = await stat(filePath);
        } catch {
          continue;
        }

        if (!fileStat.isFile()) continue;

        const modelName = file.replace(/\.(step|mch)$/i, "");
        const machineType = classifyMachineType(modelName, "GENERIC", true);
        const axisConfig = classifyAxisConfig(machineType, modelName, true);

        models.push({
          filename: file,
          oem: "GENERIC",
          modelName,
          machineType,
          axisConfig,
          filePath: filePath.replace(/\\/g, "/"),
          fileSize: fileStat.size,
          source: "generic",
          format: ext.replace(".", "") as "step" | "mch",
        });
      }
    } else {
      log.warn(
        `MachineModelIndexEngine: generic root not found: ${GENERIC_ROOT}`
      );
    }

    // ------------------------------------------------------------------
    // 3. Build summary counts
    // ------------------------------------------------------------------
    const byOem: Record<string, number> = {};
    const byMachineType: Record<string, number> = {};
    const byAxisConfig: Record<string, number> = {};
    const byFormat: Record<string, number> = {};

    for (const m of models) {
      byOem[m.oem] = (byOem[m.oem] || 0) + 1;
      byMachineType[m.machineType] = (byMachineType[m.machineType] || 0) + 1;
      byAxisConfig[m.axisConfig] = (byAxisConfig[m.axisConfig] || 0) + 1;
      byFormat[m.format] = (byFormat[m.format] || 0) + 1;
    }

    const result: MachineModelIndexResult = {
      models,
      totalModels: models.length,
      byOem,
      byMachineType,
      byAxisConfig,
      byFormat,
      oemCount: Object.keys(byOem).length,
      timestamp: new Date().toISOString(),
    };

    log.info(
      `MachineModelIndexEngine: harvested ${result.totalModels} models from ${result.oemCount} OEMs`
    );

    return result;
  }

  /**
   * Produce an audit summary of the machine model index.
   *
   * @returns Audit result with counts, breakdowns, and OEM/generic splits
   */
  static async audit(): Promise<MachineModelAuditResult> {
    const result = await MachineModelIndexEngine.harvest();

    const genericCount = result.models.filter(
      (m) => m.source === "generic"
    ).length;
    const oemModelCount = result.models.filter(
      (m) => m.source === "oem"
    ).length;

    return {
      totalModels: result.totalModels,
      oemCount: result.oemCount,
      byOem: result.byOem,
      byMachineType: result.byMachineType,
      byAxisConfig: result.byAxisConfig,
      byFormat: result.byFormat,
      genericCount,
      oemModelCount,
      timestamp: result.timestamp,
    };
  }

  /**
   * Filter models by OEM name (case-insensitive match).
   *
   * @param models - Array of MachineModelEntry to filter
   * @param oem - OEM name to match (e.g., "HAAS", "hurco")
   * @returns Filtered array of models matching the OEM
   */
  static findByOem(
    models: MachineModelEntry[],
    oem: string
  ): MachineModelEntry[] {
    const target = oem.toUpperCase();
    return models.filter((m) => m.oem.toUpperCase() === target);
  }

  /**
   * Filter models by machine type.
   *
   * @param models - Array of MachineModelEntry to filter
   * @param machineType - MachineType to match
   * @returns Filtered array of models matching the type
   */
  static findByType(
    models: MachineModelEntry[],
    machineType: MachineType
  ): MachineModelEntry[] {
    return models.filter((m) => m.machineType === machineType);
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Infer OEM name from a filename at the root level (not in a subdirectory).
 * Uses known OEM names to match against the filename prefix.
 *
 * @param filename - e.g., "DMG MORI CMX 50 U.mch"
 * @returns Matched OEM name or "UNKNOWN"
 */
function inferOemFromFilename(filename: string): string {
  const upper = filename.toUpperCase();
  const knownOems = [
    "DMG MORI",
    "DN SOLUTIONS",
    "HAAS",
    "HURCO",
    "MAZAK",
    "OKUMA",
    "BROTHER",
    "MATSUURA",
    "DATRON",
    "KERN",
    "MAKINO",
    "HELLER",
  ];
  for (const oem of knownOems) {
    if (upper.startsWith(oem)) return oem;
  }
  return "UNKNOWN";
}
