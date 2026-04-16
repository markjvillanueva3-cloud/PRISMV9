/**
 * JMDieProgramInventoryEngine — KAR-MS2 U-KAR10
 * Index all JM Die CNC programs with controller/machine classification.
 *
 * Scans H:/PRISM/JM DIE/ for:
 *   - .MIN files (Okuma OSP lathe programs)
 *   - .nc files (mill programs)
 *   - .mcx-8 / .mcx files (Mastercam CAM files)
 *
 * Classifies programs by:
 *   - Machine type (lathe, mill, wire EDM)
 *   - Controller (Okuma OSP, Haas NGC, Hurco WinMAX)
 *   - Customer (folder-based)
 *
 * @module JMDieProgramInventoryEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ProgramType = "lathe" | "mill" | "wire_edm" | "mill_turn" | "cam_file" | "unknown";
export type ControllerFamily = "okuma_osp" | "haas_ngc" | "hurco_winmax" | "fanuc" | "mitsubishi" | "mastercam" | "unknown";

export interface ProgramEntry {
  /** Absolute file path */
  filePath: string;
  /** Filename with extension */
  filename: string;
  /** File extension (lowercase, with dot) */
  extension: string;
  /** Program type classification */
  programType: ProgramType;
  /** Controller family */
  controller: ControllerFamily;
  /** Customer name (from folder structure) */
  customer: string;
  /** Top-level folder (e.g., "CNC LATHE", "CNC MILL HAAS") */
  topFolder: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Last modified timestamp */
  mtimeMs: number;
  /** First line of file (for format detection) */
  firstLine: string;
}

export interface InventoryStats {
  /** Total programs indexed */
  totalPrograms: number;
  /** Count by program type */
  byType: Record<ProgramType, number>;
  /** Count by controller family */
  byController: Record<ControllerFamily, number>;
  /** Count by customer (top 20) */
  byCustomerTop20: Array<{ customer: string; count: number }>;
  /** Count by extension */
  byExtension: Record<string, number>;
  /** Total file size in bytes */
  totalSizeBytes: number;
  /** Oldest program (by mtime) */
  oldestProgram: { path: string; date: string } | null;
  /** Newest program (by mtime) */
  newestProgram: { path: string; date: string } | null;
}

export interface InventoryResult {
  /** When inventory was created */
  createdAt: string;
  /** Root path scanned */
  rootPath: string;
  /** Scan duration in milliseconds */
  scanDurationMs: number;
  /** Inventory statistics */
  stats: InventoryStats;
  /** All program entries */
  programs: ProgramEntry[];
  /** Scan errors (paths that couldn't be read) */
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JM_DIE_ROOT = "H:/PRISM/JM DIE";
const STATE_FILE = "data/jm-die/program-inventory.json";

/** Extension to program type mapping */
const EXTENSION_TO_TYPE: Record<string, ProgramType> = {
  ".min": "lathe",
  ".nc": "mill",
  ".hnc": "mill",
  ".tap": "mill",
  ".mcx-8": "cam_file",
  ".mcx": "cam_file",
  ".emcx-8": "cam_file",
};

/** Top folder to controller mapping */
const FOLDER_TO_CONTROLLER: Record<string, ControllerFamily> = {
  "CNC LATHE": "okuma_osp",
  "CNC MILL HAAS": "haas_ngc",
  "CNC OKUMA MULTUS": "okuma_osp",
  "HAAS-HURCO": "haas_ngc",
  "OKUMA": "okuma_osp",
  "ROKU-ROKU": "fanuc",
  "WIRE EDM": "mitsubishi",
  "LATHE": "okuma_osp",
};

/** Top folder to program type mapping (overrides extension) */
const FOLDER_TO_TYPE: Record<string, ProgramType> = {
  "CNC LATHE": "lathe",
  "CNC MILL HAAS": "mill",
  "CNC OKUMA MULTUS": "mill_turn",
  "HAAS-HURCO": "mill",
  "OKUMA": "lathe",
  "ROKU-ROKU": "mill",
  "WIRE EDM": "wire_edm",
  "LATHE": "lathe",
};

// ============================================================================
// ENGINE
// ============================================================================

export class JMDieProgramInventoryEngine {
  private programs: ProgramEntry[] = [];
  private errors: string[] = [];

  /**
   * Scan JM Die program archive and build inventory.
   * @param rootPath - Override root path (default: H:/PRISM/JM DIE)
   * @param maxDepth - Maximum folder depth (default: 10)
   */
  scan(rootPath: string = JM_DIE_ROOT, maxDepth: number = 10): InventoryResult {
    const startTime = Date.now();
    this.programs = [];
    this.errors = [];

    log.info(`[JMDieProgramInventory] Scanning ${rootPath}...`);

    this.scanDirectory(rootPath, "", 0, maxDepth);

    const stats = this.computeStats();
    const duration = Date.now() - startTime;

    log.info(`[JMDieProgramInventory] Found ${this.programs.length} programs in ${duration}ms`);

    const result: InventoryResult = {
      createdAt: new Date().toISOString(),
      rootPath,
      scanDurationMs: duration,
      stats,
      programs: this.programs,
      errors: this.errors,
    };

    return result;
  }

  /**
   * Get quick stats without full program list (for status queries).
   */
  getQuickStats(rootPath: string = JM_DIE_ROOT): InventoryStats {
    const result = this.scan(rootPath);
    return result.stats;
  }

  /**
   * Save inventory to JSON file.
   */
  saveInventory(result: InventoryResult, outputPath?: string): void {
    const targetPath = outputPath || path.join(process.cwd(), STATE_FILE);
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save stats-only version (programs array can be huge)
    const statsOnly = {
      ...result,
      programs: [], // Don't persist full program list
      programCount: result.programs.length,
    };

    fs.writeFileSync(targetPath, JSON.stringify(statsOnly, null, 2));
    log.info(`[JMDieProgramInventory] Saved stats to ${targetPath}`);
  }

  /**
   * Load previously saved inventory stats.
   */
  loadInventory(inputPath?: string): InventoryResult | null {
    const targetPath = inputPath || path.join(process.cwd(), STATE_FILE);

    if (!fs.existsSync(targetPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(targetPath, "utf-8");
      return JSON.parse(data) as InventoryResult;
    } catch (e) {
      log.warn(`[JMDieProgramInventory] Failed to load inventory: ${e}`);
      return null;
    }
  }

  /**
   * Find programs by customer name (case-insensitive).
   */
  findByCustomer(customer: string): ProgramEntry[] {
    const lowerCustomer = customer.toLowerCase();
    return this.programs.filter(p => p.customer.toLowerCase().includes(lowerCustomer));
  }

  /**
   * Find programs by controller family.
   */
  findByController(controller: ControllerFamily): ProgramEntry[] {
    return this.programs.filter(p => p.controller === controller);
  }

  /**
   * Find programs by type.
   */
  findByType(programType: ProgramType): ProgramEntry[] {
    return this.programs.filter(p => p.programType === programType);
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private scanDirectory(dirPath: string, topFolder: string, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (e) {
      this.errors.push(`Failed to read ${dirPath}: ${e}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Track top-level folder for classification
        const currentTop = depth === 0 ? entry.name : topFolder;
        this.scanDirectory(fullPath, currentTop, depth + 1, maxDepth);
      } else if (entry.isFile()) {
        this.processFile(fullPath, topFolder);
      }
    }
  }

  private processFile(filePath: string, topFolder: string): void {
    const ext = path.extname(filePath).toLowerCase();

    // Only process CNC-related files
    if (!EXTENSION_TO_TYPE[ext]) {
      return;
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      this.errors.push(`Failed to stat ${filePath}: ${e}`);
      return;
    }

    // Read first line for format detection
    let firstLine = "";
    try {
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(256);
      fs.readSync(fd, buffer, 0, 256, 0);
      fs.closeSync(fd);
      firstLine = buffer.toString("utf-8").split(/[\r\n]/)[0].trim();
    } catch {
      // Ignore read errors for first line
    }

    // Determine customer from folder path
    const relativePath = path.relative(JM_DIE_ROOT, filePath);
    const pathParts = relativePath.split(path.sep);
    const customer = pathParts.length >= 2 ? pathParts[1] : "UNKNOWN";

    // Classify program type and controller
    const programType = this.classifyProgramType(ext, topFolder, firstLine);
    const controller = this.classifyController(topFolder, ext, firstLine);

    const entry: ProgramEntry = {
      filePath: filePath.replace(/\\/g, "/"),
      filename: path.basename(filePath),
      extension: ext,
      programType,
      controller,
      customer,
      topFolder,
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
      firstLine,
    };

    this.programs.push(entry);
  }

  private classifyProgramType(ext: string, topFolder: string, firstLine: string): ProgramType {
    // Folder-based classification takes priority
    if (FOLDER_TO_TYPE[topFolder]) {
      return FOLDER_TO_TYPE[topFolder];
    }

    // Extension-based classification
    if (EXTENSION_TO_TYPE[ext]) {
      return EXTENSION_TO_TYPE[ext];
    }

    // Content-based hints
    if (firstLine.includes("G71") || firstLine.includes("G72")) {
      return "lathe"; // Okuma turning cycles
    }

    return "unknown";
  }

  private classifyController(topFolder: string, ext: string, firstLine: string): ControllerFamily {
    // CAM files are Mastercam
    if (ext === ".mcx-8" || ext === ".mcx" || ext === ".emcx-8") {
      return "mastercam";
    }

    // Folder-based classification
    if (FOLDER_TO_CONTROLLER[topFolder]) {
      return FOLDER_TO_CONTROLLER[topFolder];
    }

    // Content-based hints for Okuma OSP
    if (firstLine.includes("$") || firstLine.includes("NAT")) {
      return "okuma_osp";
    }

    return "unknown";
  }

  private computeStats(): InventoryStats {
    const byType: Record<ProgramType, number> = {
      lathe: 0,
      mill: 0,
      wire_edm: 0,
      mill_turn: 0,
      cam_file: 0,
      unknown: 0,
    };

    const byController: Record<ControllerFamily, number> = {
      okuma_osp: 0,
      haas_ngc: 0,
      hurco_winmax: 0,
      fanuc: 0,
      mitsubishi: 0,
      mastercam: 0,
      unknown: 0,
    };

    const byExtension: Record<string, number> = {};
    const customerCounts: Record<string, number> = {};
    let totalSizeBytes = 0;
    let oldest: ProgramEntry | null = null;
    let newest: ProgramEntry | null = null;

    for (const p of this.programs) {
      byType[p.programType]++;
      byController[p.controller]++;
      byExtension[p.extension] = (byExtension[p.extension] || 0) + 1;
      customerCounts[p.customer] = (customerCounts[p.customer] || 0) + 1;
      totalSizeBytes += p.sizeBytes;

      if (!oldest || p.mtimeMs < oldest.mtimeMs) {
        oldest = p;
      }
      if (!newest || p.mtimeMs > newest.mtimeMs) {
        newest = p;
      }
    }

    // Top 20 customers by program count
    const byCustomerTop20 = Object.entries(customerCounts)
      .map(([customer, count]) => ({ customer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalPrograms: this.programs.length,
      byType,
      byController,
      byCustomerTop20,
      byExtension,
      totalSizeBytes,
      oldestProgram: oldest ? { path: oldest.filePath, date: new Date(oldest.mtimeMs).toISOString() } : null,
      newestProgram: newest ? { path: newest.filePath, date: new Date(newest.mtimeMs).toISOString() } : null,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const jmDieProgramInventoryEngine = new JMDieProgramInventoryEngine();
