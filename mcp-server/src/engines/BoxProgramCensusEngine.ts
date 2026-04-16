/**
 * BoxProgramCensusEngine — Recursive scan of all Box CNC folders
 *
 * Scans the entire Box drive (C:\Users\wompu\Box) to discover, classify,
 * and catalog every CNC program and CAD file. Infers machine type from
 * folder path and file content. Extracts metadata (size, date, customer,
 * extension) for downstream parsing and pattern mining.
 *
 * Supported file types:
 *   CNC Programs: .MIN, .nc, .hnc, .tap, .gcd, .txt (G-code)
 *   CAM Files: .mcx-8, .esp, .cps
 *   CAD Files: .ipt, .stp, .step, .dwg, .dxf, .iam, .idw
 *
 * Machine inference:
 *   - Path contains "LATHE" → okuma_lathe
 *   - Path contains "MULTUS" → okuma_multus
 *   - Path contains "HAAS" → haas_mill
 *   - Path contains "HURCO" → hurco_mill
 *   - Path contains "ROKU" → roku_roku
 *   - Path contains "OKUMA" + "MILL" → okuma_mill
 *   - Content-based: G18 plane + NAT labels → okuma_lathe, etc.
 *
 * @module BoxProgramCensusEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type MachineType =
  | "okuma_lathe"
  | "okuma_multus"
  | "okuma_mill"
  | "haas_mill"
  | "hurco_mill"
  | "roku_roku"
  | "wire_edm"
  | "engraving"
  | "unknown";

export type FileCategory =
  | "cnc_program"
  | "cam_file"
  | "cad_file"
  | "post_processor"
  | "macro_program"
  | "unknown";

export interface CensusEntry {
  file_path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  last_modified: string;
  parent_folder: string;
  customer_name: string;
  machine_type: MachineType;
  category: FileCategory;
  box_section: string;
}

export interface CensusSummary {
  total_files: number;
  by_extension: Record<string, number>;
  by_machine: Record<MachineType, number>;
  by_category: Record<FileCategory, number>;
  by_section: Record<string, number>;
  by_year: Record<string, number>;
  entries: CensusEntry[];
  scan_duration_ms: number;
  scan_errors: string[];
}

export interface CensusScanOptions {
  root_path?: string;
  max_depth?: number;
  include_cad?: boolean;
  recent_years_only?: number;
  sections?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CNC_EXTENSIONS = new Set([
  ".min", ".nc", ".hnc", ".tap", ".gcd", ".ngc", ".cnc", ".fan", ".prg",
]);

const CAM_EXTENSIONS = new Set([".mcx-8", ".esp", ".mcx"]);

const POST_EXTENSIONS = new Set([".cps"]);

const CAD_EXTENSIONS = new Set([
  ".ipt", ".stp", ".step", ".dwg", ".dxf", ".iam", ".idw", ".sat", ".iges", ".igs",
]);

const ALL_EXTENSIONS = new Set([
  ...CNC_EXTENSIONS, ...CAM_EXTENSIONS, ...POST_EXTENSIONS, ...CAD_EXTENSIONS,
]);

/** Box drive section folders and their expected machine types */
const SECTION_MAP: Record<string, { machine: MachineType; label: string }> = {
  "CNC LATHE":          { machine: "okuma_lathe",  label: "Okuma Lathe" },
  "CNC OKUMA MULTUS":   { machine: "okuma_multus", label: "Okuma Multus" },
  "CNC MILL OKUMA":     { machine: "okuma_mill",   label: "Okuma Mill" },
  "CNC MILL HAAS":      { machine: "haas_mill",    label: "Haas Mill" },
  "CNC MILL HAAS OLD":  { machine: "haas_mill",    label: "Haas Mill (Old)" },
  "CNC MILL HURCO":     { machine: "hurco_mill",   label: "Hurco Mill" },
  "ROKU-ROKU":          { machine: "roku_roku",    label: "Roku-Roku" },
  "MACRO PROGRAMS":     { machine: "okuma_lathe",  label: "Macro Programs" },
  "ENGRAVING JOBS":     { machine: "engraving",    label: "Engraving" },
  "FUSION POST PROCESSORS": { machine: "unknown",  label: "Post Processors" },
  "AUTODESK INVENTOR CNC FILES": { machine: "unknown", label: "Inventor CAD/CNC" },
};

// ============================================================================
// ENGINE
// ============================================================================

export class BoxProgramCensusEngine {
  /**
   * Full census scan of the Box drive.
   * Recursively walks all CNC-related folders and catalogs every file.
   */
  scan(options: CensusScanOptions = {}): CensusSummary {
    const rootPath = options.root_path ?? "C:\\Users\\wompu\\Box";
    const maxDepth = options.max_depth ?? 20;
    const includeCad = options.include_cad ?? true;
    const recentYearsOnly = options.recent_years_only;

    const startTime = Date.now();
    const entries: CensusEntry[] = [];
    const errors: string[] = [];

    // Determine which sections to scan
    const sectionsToScan = options.sections ?? Object.keys(SECTION_MAP);

    for (const section of sectionsToScan) {
      const sectionPath = path.join(rootPath, section);
      if (!fs.existsSync(sectionPath)) {
        errors.push(`Section not found: ${sectionPath}`);
        continue;
      }

      const sectionInfo = SECTION_MAP[section] ?? { machine: "unknown" as MachineType, label: section };

      try {
        this._walkDirectory(
          sectionPath,
          section,
          sectionInfo.machine,
          entries,
          errors,
          0,
          maxDepth,
          includeCad,
          recentYearsOnly,
        );
      } catch (err) {
        errors.push(`Error scanning ${section}: ${(err as Error).message}`);
      }
    }

    // Also scan root-level files (not in subdirectories)
    try {
      this._scanRootFiles(rootPath, entries, errors, includeCad);
    } catch (err) {
      errors.push(`Error scanning root: ${(err as Error).message}`);
    }

    const duration = Date.now() - startTime;

    // Build summary
    const summary = this._buildSummary(entries, duration, errors);

    log.info(`BoxProgramCensus: ${summary.total_files} files in ${duration}ms (${errors.length} errors)`);

    return summary;
  }

  /**
   * Quick count scan — just counts files per section without full metadata extraction.
   * Much faster for getting an overview.
   */
  quickCount(rootPath = "C:\\Users\\wompu\\Box"): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    for (const section of Object.keys(SECTION_MAP)) {
      const sectionPath = path.join(rootPath, section);
      if (!fs.existsSync(sectionPath)) continue;

      const counts: Record<string, number> = {};
      this._countFiles(sectionPath, counts, 0, 20);
      if (Object.keys(counts).length > 0) {
        result[section] = counts;
      }
    }

    return result;
  }

  /**
   * Scan a single section/folder and return entries.
   */
  scanSection(sectionName: string, rootPath = "C:\\Users\\wompu\\Box"): CensusEntry[] {
    const sectionPath = path.join(rootPath, sectionName);
    if (!fs.existsSync(sectionPath)) return [];

    const sectionInfo = SECTION_MAP[sectionName] ?? { machine: "unknown" as MachineType, label: sectionName };
    const entries: CensusEntry[] = [];
    const errors: string[] = [];

    this._walkDirectory(sectionPath, sectionName, sectionInfo.machine, entries, errors, 0, 20, true);
    return entries;
  }

  /**
   * Infer machine type from file path and optionally content.
   */
  inferMachineType(filePath: string, content?: string): MachineType {
    const upper = filePath.toUpperCase();

    // Path-based inference (most reliable)
    if (upper.includes("CNC LATHE") || upper.includes("MACRO PROGRAMS")) return "okuma_lathe";
    if (upper.includes("MULTUS")) return "okuma_multus";
    if (upper.includes("HURCO")) return "hurco_mill";
    if (upper.includes("ROKU") || upper.includes("ROKU-ROKU")) return "roku_roku";
    if (upper.includes("HAAS")) return "haas_mill";
    if (upper.includes("CNC MILL OKUMA")) return "okuma_mill";
    if (upper.includes("ENGRAVING")) return "engraving";

    // Content-based inference
    if (content) {
      return this._inferFromContent(content);
    }

    return "unknown";
  }

  /**
   * Classify file extension into category.
   */
  classifyFile(ext: string): FileCategory {
    const lower = ext.toLowerCase();
    if (CNC_EXTENSIONS.has(lower)) return "cnc_program";
    if (CAM_EXTENSIONS.has(lower)) return "cam_file";
    if (POST_EXTENSIONS.has(lower)) return "post_processor";
    if (CAD_EXTENSIONS.has(lower)) return "cad_file";
    return "unknown";
  }

  /**
   * Extract customer name from folder path.
   * Convention: "CNC LATHE/<customer>/<program>.MIN"
   */
  extractCustomerName(filePath: string, section: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const sectionIdx = normalized.toUpperCase().indexOf(section.toUpperCase());
    if (sectionIdx === -1) return "unknown";

    const afterSection = normalized.substring(sectionIdx + section.length + 1);
    const parts = afterSection.split("/");

    // First directory after section is the customer/job folder
    if (parts.length >= 2) {
      return parts[0].trim();
    }

    return "root";
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _walkDirectory(
    dirPath: string,
    section: string,
    defaultMachine: MachineType,
    entries: CensusEntry[],
    errors: string[],
    depth: number,
    maxDepth: number,
    includeCad: boolean,
    recentYearsOnly?: number,
  ): void {
    if (depth > maxDepth) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      errors.push(`Cannot read ${dirPath}: ${(err as Error).message}`);
      return;
    }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        this._walkDirectory(fullPath, section, defaultMachine, entries, errors, depth + 1, maxDepth, includeCad, recentYearsOnly);
        continue;
      }

      if (!item.isFile()) continue;

      const ext = path.extname(item.name).toLowerCase();
      if (!ALL_EXTENSIONS.has(ext)) continue;

      const category = this.classifyFile(ext);
      if (!includeCad && category === "cad_file") continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        errors.push(`Cannot stat ${fullPath}`);
        continue;
      }

      // Filter by recent years if requested
      if (recentYearsOnly) {
        const fileYear = stat.mtime.getFullYear();
        const cutoffYear = new Date().getFullYear() - recentYearsOnly;
        if (fileYear < cutoffYear) continue;
      }

      const customer = this.extractCustomerName(fullPath, section);

      entries.push({
        file_path: fullPath,
        filename: item.name,
        extension: ext,
        size_bytes: stat.size,
        last_modified: stat.mtime.toISOString(),
        parent_folder: path.dirname(fullPath),
        customer_name: customer,
        machine_type: defaultMachine,
        category,
        box_section: section,
      });
    }
  }

  private _scanRootFiles(
    rootPath: string,
    entries: CensusEntry[],
    errors: string[],
    includeCad: boolean,
  ): void {
    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(rootPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      if (!item.isFile()) continue;

      const ext = path.extname(item.name).toLowerCase();
      if (!ALL_EXTENSIONS.has(ext)) continue;

      const category = this.classifyFile(ext);
      if (!includeCad && category === "cad_file") continue;

      const fullPath = path.join(rootPath, item.name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        errors.push(`Cannot stat ${fullPath}`);
        continue;
      }

      entries.push({
        file_path: fullPath,
        filename: item.name,
        extension: ext,
        size_bytes: stat.size,
        last_modified: stat.mtime.toISOString(),
        parent_folder: rootPath,
        customer_name: "root",
        machine_type: this.inferMachineType(fullPath),
        category,
        box_section: "ROOT",
      });
    }
  }

  private _countFiles(dirPath: string, counts: Record<string, number>, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      if (item.isDirectory()) {
        this._countFiles(path.join(dirPath, item.name), counts, depth + 1, maxDepth);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (ALL_EXTENSIONS.has(ext)) {
          counts[ext] = (counts[ext] ?? 0) + 1;
        }
      }
    }
  }

  private _inferFromContent(content: string): MachineType {
    const first500 = content.substring(0, 500).toUpperCase();

    // Okuma OSP indicators
    if (first500.includes("NAT01") || first500.includes("G85") || first500.includes("G15 H1")) {
      return first500.includes("G18") ? "okuma_lathe" : "okuma_mill";
    }

    // Haas indicators
    if (first500.includes("O0") && (first500.includes("G43") || first500.includes("M06"))) {
      return "haas_mill";
    }

    // Hurco WinMax
    if (first500.includes("WINMAX") || first500.includes("HURCO")) {
      return "hurco_mill";
    }

    // Roku-Roku / Mitsubishi high-speed
    if (first500.includes("G05") && first500.includes("P10000")) {
      return "roku_roku";
    }

    // Wire EDM
    if (first500.includes("WIRE") || first500.includes("G76") && first500.includes("G92")) {
      return "wire_edm";
    }

    return "unknown";
  }

  private _buildSummary(entries: CensusEntry[], durationMs: number, errors: string[]): CensusSummary {
    const byExt: Record<string, number> = {};
    const byMachine: Record<MachineType, number> = {
      okuma_lathe: 0, okuma_multus: 0, okuma_mill: 0,
      haas_mill: 0, hurco_mill: 0, roku_roku: 0,
      wire_edm: 0, engraving: 0, unknown: 0,
    };
    const byCategory: Record<FileCategory, number> = {
      cnc_program: 0, cam_file: 0, cad_file: 0,
      post_processor: 0, macro_program: 0, unknown: 0,
    };
    const bySection: Record<string, number> = {};
    const byYear: Record<string, number> = {};

    for (const entry of entries) {
      byExt[entry.extension] = (byExt[entry.extension] ?? 0) + 1;
      byMachine[entry.machine_type]++;
      byCategory[entry.category]++;
      bySection[entry.box_section] = (bySection[entry.box_section] ?? 0) + 1;

      const year = entry.last_modified.substring(0, 4);
      byYear[year] = (byYear[year] ?? 0) + 1;
    }

    return {
      total_files: entries.length,
      by_extension: byExt,
      by_machine: byMachine,
      by_category: byCategory,
      by_section: bySection,
      by_year: byYear,
      entries,
      scan_duration_ms: durationMs,
      scan_errors: errors,
    };
  }
}

export const boxProgramCensusEngine = new BoxProgramCensusEngine();
