/**
 * WedmProgramIndexEngine — Indexes Wire EDM and Electrode milling programs
 *
 * Scans two JM Die archive directories:
 *   1. WIRE EDM/ — MasterCam (.mcx-8, .MCX), ESPRIT (.esp), CNC (.MIN, .NC) files
 *      organized by customer subfolders (~99 customers, ~4,020 program files)
 *   2. ROKU-ROKU/ — Electrode milling programs, primarily MasterCam (.mcx-8)
 *      organized by customer subfolders (~78 customers, ~976 program files)
 *
 * Extracts customer from subfolder name. Files at the top level of either
 * directory are assigned customer = "UNASSIGNED".
 *
 * Machine controllers at JM Die:
 *   - Wire EDM: Mitsubishi (3 EDMs — 2 sinker + 1 wire)
 *   - Roku-Roku: Blum Quickstart probing (469 cycles), milling electrodes
 *
 * @module engines/WedmProgramIndexEngine
 */

import { readdir, stat } from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A single indexed Wire EDM or electrode milling program. */
export interface WedmProgramEntry {
  /** Original filename including extension. */
  filename: string;
  /** Absolute file path. */
  filePath: string;
  /** File extension in lowercase (e.g., ".mcx-8", ".mcx", ".min", ".esp", ".nc"). */
  extension: string;
  /** File size in bytes. */
  fileSize: number;
  /** Customer name extracted from parent subfolder. "UNASSIGNED" for top-level files. */
  customer: string;
  /** Source machine directory: "wire_edm" or "roku_roku". */
  machine: "wire_edm" | "roku_roku";
  /** Program type classification. */
  programType: "wire_edm" | "electrode_mill" | "unknown";
}

/** Result of a full harvest across Wire EDM and Roku-Roku directories. */
export interface WedmProgramIndexResult {
  /** All indexed programs. */
  programs: WedmProgramEntry[];
  /** Total number of programs indexed. */
  totalPrograms: number;
  /** Count per customer (e.g., { "ITW": 45, "ACME": 12 }). */
  byCustomer: Record<string, number>;
  /** Count per file extension (e.g., { ".mcx-8": 3163, ".mcx": 1779 }). */
  byExtension: Record<string, number>;
  /** Count per program type (e.g., { "wire_edm": 4020, "electrode_mill": 976 }). */
  byProgramType: Record<string, number>;
  /** Number of Wire EDM programs. */
  wireEdmCount: number;
  /** Number of electrode milling programs (Roku-Roku). */
  electrodeMillCount: number;
  /** Number of distinct customers. */
  customerCount: number;
  /** ISO timestamp of harvest. */
  timestamp: string;
}

/** Audit summary returned by audit(). */
export interface WedmAuditResult {
  totalPrograms: number;
  wireEdmCount: number;
  electrodeMillCount: number;
  customerCount: number;
  byExtension: Record<string, number>;
  byProgramType: Record<string, number>;
  topCustomers: Array<{ customer: string; count: number }>;
  timestamp: string;
}

/** Source directory metadata returned by getSources(). */
export interface WedmSourceInfo {
  wireEdmRoot: string;
  rokuRokuRoot: string;
  validExtensions: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Root path for Wire EDM programs. */
const WIRE_EDM_ROOT = "H:/PRISM/JM DIE/WIRE EDM";

/** Root path for Roku-Roku electrode milling programs. */
const ROKU_ROKU_ROOT = "H:/PRISM/JM DIE/ROKU-ROKU";

/**
 * Valid program file extensions (lowercase).
 * .mcx-8 — MasterCam X8+ native format
 * .mcx   — MasterCam legacy format (pre-X8)
 * .min   — CNC program (Okuma OSP / generic)
 * .esp   — ESPRIT CAM native format
 * .nc    — Standard CNC G-code
 */
const VALID_EXTENSIONS = new Set([".mcx-8", ".mcx", ".min", ".esp", ".nc"]);

/** Maximum directory recursion depth to prevent runaway traversal. */
const MAX_DEPTH = 10;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Static engine class for indexing Wire EDM and electrode milling programs
 * from the JM Die archive.
 */
export class WedmProgramIndexEngine {
  /**
   * Returns the source directory paths and valid extensions.
   *
   * @returns Source directory metadata
   */
  static getSources(): WedmSourceInfo {
    return {
      wireEdmRoot: WIRE_EDM_ROOT,
      rokuRokuRoot: ROKU_ROKU_ROOT,
      validExtensions: Array.from(VALID_EXTENSIONS),
    };
  }

  /**
   * Scans WIRE EDM/ and ROKU-ROKU/ directories for all program files.
   *
   * For WIRE EDM: scans for .mcx-8, .MCX, .esp, .MIN, .NC files.
   * For ROKU-ROKU: scans for .mcx-8, .MIN, .NC files (electrode milling).
   *
   * Customer is extracted from the immediate subfolder name. Files at the
   * top level of each root directory get customer = "UNASSIGNED".
   *
   * @returns Full index result with programs, counts, and breakdowns
   */
  static async harvest(): Promise<WedmProgramIndexResult> {
    const programs: WedmProgramEntry[] = [];

    // Scan Wire EDM directory
    await WedmProgramIndexEngine._scanRoot(
      WIRE_EDM_ROOT,
      "wire_edm",
      "wire_edm",
      programs
    );

    // Scan Roku-Roku directory
    await WedmProgramIndexEngine._scanRoot(
      ROKU_ROKU_ROOT,
      "roku_roku",
      "electrode_mill",
      programs
    );

    // Build breakdowns
    const byCustomer: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    const byProgramType: Record<string, number> = {};
    let wireEdmCount = 0;
    let electrodeMillCount = 0;

    for (const p of programs) {
      byCustomer[p.customer] = (byCustomer[p.customer] ?? 0) + 1;
      byExtension[p.extension] = (byExtension[p.extension] ?? 0) + 1;
      byProgramType[p.programType] = (byProgramType[p.programType] ?? 0) + 1;

      if (p.machine === "wire_edm") wireEdmCount++;
      else electrodeMillCount++;
    }

    const result: WedmProgramIndexResult = {
      programs,
      totalPrograms: programs.length,
      byCustomer,
      byExtension,
      byProgramType,
      wireEdmCount,
      electrodeMillCount,
      customerCount: Object.keys(byCustomer).length,
      timestamp: new Date().toISOString(),
    };

    log.info(
      `[WedmProgramIndexEngine] Harvested ${result.totalPrograms} programs ` +
        `(${wireEdmCount} wire EDM, ${electrodeMillCount} electrode mill) ` +
        `across ${result.customerCount} customers`
    );

    return result;
  }

  /**
   * Returns an audit summary with top-level statistics and top customers.
   *
   * @returns Audit summary object
   */
  static async audit(): Promise<WedmAuditResult> {
    const result = await WedmProgramIndexEngine.harvest();
    const topCustomers = WedmProgramIndexEngine.getTopCustomers(
      result,
      10
    );

    return {
      totalPrograms: result.totalPrograms,
      wireEdmCount: result.wireEdmCount,
      electrodeMillCount: result.electrodeMillCount,
      customerCount: result.customerCount,
      byExtension: result.byExtension,
      byProgramType: result.byProgramType,
      topCustomers,
      timestamp: result.timestamp,
    };
  }

  /**
   * Filters programs by customer name (case-insensitive).
   *
   * @param result - Harvest result containing all programs
   * @param customer - Customer name to filter by (case-insensitive)
   * @returns Array of programs belonging to that customer
   */
  static getCustomerPrograms(
    result: WedmProgramIndexResult,
    customer: string
  ): WedmProgramEntry[] {
    const upper = customer.toUpperCase();
    return result.programs.filter(
      (p) => p.customer.toUpperCase() === upper
    );
  }

  /**
   * Returns the top N customers sorted by program count (descending).
   *
   * @param result - Harvest result containing byCustomer map
   * @param limit - Maximum number of customers to return (default 10)
   * @returns Array of { customer, count } sorted descending by count
   */
  static getTopCustomers(
    result: WedmProgramIndexResult,
    limit: number = 10
  ): Array<{ customer: string; count: number }> {
    return Object.entries(result.byCustomer)
      .map(([customer, count]) => ({ customer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Scans a root directory for program files, extracting customer from
   * immediate subdirectory name.
   *
   * @param rootPath - Absolute path to root directory (WIRE EDM or ROKU-ROKU)
   * @param machine - Machine classification ("wire_edm" or "roku_roku")
   * @param defaultProgramType - Default program type for this root
   * @param programs - Accumulator array to push entries into
   */
  private static async _scanRoot(
    rootPath: string,
    machine: "wire_edm" | "roku_roku",
    defaultProgramType: "wire_edm" | "electrode_mill",
    programs: WedmProgramEntry[]
  ): Promise<void> {
    let items: Dirent<string>[];
    try {
      items = await readdir(rootPath, { withFileTypes: true });
    } catch (err) {
      log.warn(
        `[WedmProgramIndexEngine] Cannot read directory ${rootPath}: ${err}`
      );
      return;
    }

    for (const item of items) {
      const fullPath = path.join(rootPath, item.name);

      if (item.isDirectory()) {
        // Customer subfolder — recurse and tag all files with this customer name
        await WedmProgramIndexEngine._scanDirectory(
          fullPath,
          item.name,
          machine,
          defaultProgramType,
          programs,
          0
        );
      } else if (item.isFile()) {
        // Top-level file — check if it's a valid program
        const entry = await WedmProgramIndexEngine._tryParseFile(
          fullPath,
          item.name,
          "UNASSIGNED",
          machine,
          defaultProgramType
        );
        if (entry) programs.push(entry);
      }
    }
  }

  /**
   * Recursively scans a customer subdirectory for program files.
   *
   * @param dirPath - Absolute path to current directory
   * @param customer - Customer name (from top-level subfolder)
   * @param machine - Machine classification
   * @param defaultProgramType - Default program type
   * @param programs - Accumulator array
   * @param depth - Current recursion depth
   */
  private static async _scanDirectory(
    dirPath: string,
    customer: string,
    machine: "wire_edm" | "roku_roku",
    defaultProgramType: "wire_edm" | "electrode_mill",
    programs: WedmProgramEntry[],
    depth: number
  ): Promise<void> {
    if (depth > MAX_DEPTH) return;

    let items: Dirent<string>[];
    try {
      items = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        await WedmProgramIndexEngine._scanDirectory(
          fullPath,
          customer,
          machine,
          defaultProgramType,
          programs,
          depth + 1
        );
      } else if (item.isFile()) {
        const entry = await WedmProgramIndexEngine._tryParseFile(
          fullPath,
          item.name,
          customer,
          machine,
          defaultProgramType
        );
        if (entry) programs.push(entry);
      }
    }
  }

  /**
   * Attempts to parse a file as a valid program entry.
   * Returns null if the file extension is not a recognized program format.
   *
   * @param filePath - Absolute file path
   * @param filename - Filename (basename)
   * @param customer - Customer name
   * @param machine - Machine classification
   * @param defaultProgramType - Default program type
   * @returns WedmProgramEntry if valid, null otherwise
   */
  private static async _tryParseFile(
    filePath: string,
    filename: string,
    customer: string,
    machine: "wire_edm" | "roku_roku",
    defaultProgramType: "wire_edm" | "electrode_mill"
  ): Promise<WedmProgramEntry | null> {
    const ext = WedmProgramIndexEngine._getExtension(filename);
    if (!VALID_EXTENSIONS.has(ext)) return null;

    let fileStat: Awaited<ReturnType<typeof stat>>;
    try {
      fileStat = await stat(filePath);
    } catch {
      return null;
    }

    return {
      filename,
      filePath: filePath.replace(/\\/g, "/"),
      extension: ext,
      fileSize: fileStat.size,
      customer,
      machine,
      programType: defaultProgramType,
    };
  }

  /**
   * Extracts the file extension in lowercase, handling compound extensions
   * like ".mcx-8" correctly.
   *
   * @param filename - Filename to extract extension from
   * @returns Lowercase extension string (e.g., ".mcx-8", ".mcx", ".min")
   */
  private static _getExtension(filename: string): string {
    // Handle .mcx-8 compound extension specially
    if (filename.toLowerCase().endsWith(".mcx-8")) {
      return ".mcx-8";
    }
    return path.extname(filename).toLowerCase();
  }
}
