/**
 * FolderScannerEngine — Recursive directory scanner with change detection
 *
 * Scans JM Die source_roots paths, detects new/changed files via mtime
 * comparison, classifies by file type, and queues for ingestion.
 * Uses polling (not fs.watch — unreliable on network/mapped drives).
 *
 * Stores scan state in data/state/folder-scan-state.json so subsequent
 * scans only process files that changed since last scan.
 *
 * INGEST-MS0 / U-ING01
 * @module FolderScannerEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type FileType =
  | "cnc_program"     // .MIN, .nc, .hnc, .tap, .gcd
  | "cam_file"        // .mcx-8, .mcx, .MCX-6, .esp
  | "cad_file"        // .ipt, .iam, .idw, .stp, .step, .SLDPRT, .SLDASM
  | "drawing"         // .dwg, .dxf
  | "pdf"             // .pdf
  | "spreadsheet"     // .xlsx, .xls, .csv
  | "image"           // .jpg, .jpeg, .png, .tif, .tiff, .bmp
  | "post_processor"  // .cps, .cfg, .def (hyperPOST configs)
  | "probing_cycle"   // .cyc (Renishaw/Blum probing cycles)
  | "formula_script"  // .js (machining knowledge formula files)
  | "hypermill_file"  // .hmc, .hmpf (hyperMILL projects/fixtures)
  | "material_db"     // .sldmat (SolidWorks material databases)
  | "tool_database"   // .tooldb, .db (tool/cutting databases)
  | "macro_vba"       // .dvb, .xlsm (VBA macros, Excel automation)
  | "config_file"     // .xml, .json, .ini (configuration files)
  | "archive"         // .zip, .rar, .7z
  | "other";

export type SeedDomainId =
  | "programs"
  | "employee_database"
  | "machines"
  | "controllers"
  | "tool_holders"
  | "tooling"
  | "materials"
  | "prints"
  | "formulas"
  | "post_configs"
  | "probing"
  | "training"
  | "catalogs"
  | "hypermill"
  | "fixtures"
  | "electrodes"
  | "cad_cam";

export interface ScannedFile {
  file_path: string;
  relative_path: string;
  filename: string;
  extension: string;
  file_type: FileType;
  size_bytes: number;
  mtime_ms: number;
  parent_folder: string;
  seed_domain: SeedDomainId | null;
  is_new: boolean;
  is_changed: boolean;
}

export interface ScanState {
  last_scan_at: string;
  file_index: Record<string, { mtime_ms: number; size_bytes: number }>;
  total_files_tracked: number;
}

export interface ScanResult {
  root_scanned: string;
  total_files: number;
  new_files: number;
  changed_files: number;
  unchanged_files: number;
  by_type: Record<FileType, number>;
  by_domain: Record<string, number>;
  files: ScannedFile[];
  scan_duration_ms: number;
  errors: string[];
}

export interface ScanOptions {
  root_path: string;
  max_depth?: number;
  include_unchanged?: boolean;
  seed_domain?: SeedDomainId;
  file_types?: FileType[];
}

// ============================================================================
// EXTENSION → TYPE MAPPING
// ============================================================================

const EXTENSION_MAP: Record<string, FileType> = {
  // CNC programs
  ".min": "cnc_program", ".nc": "cnc_program", ".hnc": "cnc_program",
  ".tap": "cnc_program", ".gcd": "cnc_program", ".ngc": "cnc_program",
  // CAM files
  ".mcx-8": "cam_file", ".mcx": "cam_file", ".mcx-6": "cam_file",
  ".esp": "cam_file", ".emcx-8": "cam_file",
  // CAD files
  ".ipt": "cad_file", ".iam": "cad_file", ".idw": "cad_file",
  ".stp": "cad_file", ".step": "cad_file",
  ".sldprt": "cad_file", ".sldasm": "cad_file", ".slddrw": "cad_file",
  ".f3d": "cad_file", ".f3z": "cad_file",
  // Drawings
  ".dwg": "drawing", ".dxf": "drawing",
  // Documents
  ".pdf": "pdf",
  // Spreadsheets
  ".xlsx": "spreadsheet", ".xls": "spreadsheet", ".csv": "spreadsheet",
  // Images
  ".jpg": "image", ".jpeg": "image", ".png": "image",
  ".tif": "image", ".tiff": "image", ".bmp": "image",
  // Post processors + hyperPOST configs
  ".cps": "post_processor", ".cfg": "post_processor", ".def": "post_processor",
  // Probing cycles
  ".cyc": "probing_cycle",
  // Formula/knowledge scripts
  ".js": "formula_script",
  // hyperMILL project files
  ".hmc": "hypermill_file", ".hmpf": "hypermill_file",
  // Material databases
  ".sldmat": "material_db",
  // Tool databases
  ".tooldb": "tool_database", ".db": "tool_database",
  // VBA macros / Excel automation
  ".dvb": "macro_vba", ".xlsm": "macro_vba",
  // Config files
  ".xml": "config_file", ".ini": "config_file",
  // Archives
  ".zip": "archive", ".rar": "archive", ".7z": "archive",
};

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

const STATE_DIR = path.resolve("data/state");
const STATE_FILE = path.join(STATE_DIR, "folder-scan-state.json");

function loadScanState(): Record<string, ScanState> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) {
    log.warn("[FolderScanner] Failed to load scan state, starting fresh");
  }
  return {};
}

function saveScanState(state: Record<string, ScanState>): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error("[FolderScanner] Failed to save scan state", e);
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class FolderScannerEngine {
  private states: Record<string, ScanState> = loadScanState();

  /**
   * Classify a file extension into a FileType.
   * Uses case-insensitive matching.
   */
  classifyFile(filename: string): FileType {
    const lower = filename.toLowerCase();
    // Handle compound extensions like .mcx-8
    for (const [ext, type] of Object.entries(EXTENSION_MAP)) {
      if (lower.endsWith(ext)) return type;
    }
    const simpleExt = path.extname(lower);
    return EXTENSION_MAP[simpleExt] ?? "other";
  }

  /**
   * Infer which seed domain a file path belongs to based on its
   * location relative to the source roots.
   */
  inferSeedDomain(filePath: string, rootPath: string): SeedDomainId | null {
    const rel = filePath.replace(/\\/g, "/").toLowerCase();
    const root = rootPath.replace(/\\/g, "/").toLowerCase();
    const relative = rel.startsWith(root) ? rel.slice(root.length) : rel;

    if (/\/(programs?|cnc|lathe|mill|edm|wire|roku)/i.test(relative)) return "programs";
    if (/\/(employee|hr|personnel|staff)/i.test(relative)) return "employee_database";
    if (/\/(machine|equipment)/i.test(relative)) return "machines";
    if (/\/(controller|post)/i.test(relative)) return "controllers";
    if (/\/(tool.?holder|holder|collet|chuck|arbor)/i.test(relative)) return "tool_holders";
    if (/\/(material|stock|steel|carbide)/i.test(relative)) return "materials";
    if (/\/(print|drawing|blueprint|dwg)/i.test(relative)) return "prints";
    if (/\/(tool|insert|cutter|endmill|drill)/i.test(relative)) return "tooling";

    // Resources-specific domain inference (H:/prism/resources/ structure)
    if (/\/(formula|knowledge.?formula|cross.?disciplinary)/i.test(relative)) return "formulas";
    if (/\/(posts?\s+and\s+machines|hyperpost|cps.?files)/i.test(relative)) return "post_configs";
    if (/\/(prob|renishaw|blum|quickstart)/i.test(relative)) return "probing";
    if (/\/(training|learning|course|class|intro)/i.test(relative)) return "training";
    if (/\/(catalog|manufacturer|sandvik|guhring|kennametal)/i.test(relative)) return "catalogs";
    if (/\/(hypermill|open.?mind|hm.?|im_)/i.test(relative)) return "hypermill";
    if (/\/(fixture|workholding|vise|clamp|jig)/i.test(relative)) return "fixtures";
    if (/\/(electrode|sinker|edm.?electrode)/i.test(relative)) return "electrodes";
    if (/\/(cad|cam|solidworks|mastercam|inventor|fusion)/i.test(relative)) return "cad_cam";

    // Infer from file type as fallback
    const fileType = this.classifyFile(path.basename(filePath));
    if (fileType === "cnc_program" || fileType === "cam_file") return "programs";
    if (fileType === "drawing" || fileType === "cad_file") return "prints";
    if (fileType === "post_processor") return "post_configs";
    if (fileType === "probing_cycle") return "probing";
    if (fileType === "formula_script") return "formulas";
    if (fileType === "hypermill_file") return "hypermill";
    if (fileType === "material_db") return "materials";
    if (fileType === "tool_database") return "tooling";
    if (fileType === "macro_vba") return "programs";
    if (fileType === "spreadsheet") return null;
    if (fileType === "pdf") return "prints";

    return null;
  }

  /**
   * Scan a directory recursively. Detects new and changed files by
   * comparing against previously saved scan state.
   */
  scan(options: ScanOptions): ScanResult {
    const start = Date.now();
    const rootPath = path.resolve(options.root_path);
    const maxDepth = options.max_depth ?? 20;
    const includeUnchanged = options.include_unchanged ?? false;
    const filterTypes = options.file_types ? new Set(options.file_types) : null;
    const filterDomain = options.seed_domain ?? null;

    const stateKey = rootPath.replace(/\\/g, "/");
    const prevState = this.states[stateKey] ?? { last_scan_at: "", file_index: {}, total_files_tracked: 0 };
    const prevIndex = prevState.file_index;

    const newIndex: Record<string, { mtime_ms: number; size_bytes: number }> = {};
    const files: ScannedFile[] = [];
    const errors: string[] = [];
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    let newCount = 0;
    let changedCount = 0;
    let unchangedCount = 0;

    const walk = (dir: string, depth: number): void => {
      if (depth > maxDepth) return;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e: any) {
        errors.push(`${dir}: ${e.message}`);
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip known noise directories
          if (entry.name.startsWith(".") || entry.name === "$RECYCLE.BIN" ||
              entry.name === "node_modules" || entry.name === "OldVersions" ||
              entry.name === "Thumbs.db") continue;
          walk(fullPath, depth + 1);
          continue;
        }

        if (!entry.isFile()) continue;

        const fileType = this.classifyFile(entry.name);
        if (filterTypes && !filterTypes.has(fileType)) continue;

        const domain = this.inferSeedDomain(fullPath, rootPath);
        if (filterDomain && domain !== filterDomain) continue;

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch (e: any) {
          errors.push(`stat ${fullPath}: ${e.message}`);
          continue;
        }

        const normalKey = fullPath.replace(/\\/g, "/");
        const prev = prevIndex[normalKey];
        const isNew = !prev;
        const isChanged = !isNew && prev.mtime_ms !== stat.mtimeMs;

        newIndex[normalKey] = { mtime_ms: stat.mtimeMs, size_bytes: stat.size };

        if (isNew) newCount++;
        else if (isChanged) changedCount++;
        else unchangedCount++;

        if (!includeUnchanged && !isNew && !isChanged) continue;

        const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");

        const scanned: ScannedFile = {
          file_path: fullPath.replace(/\\/g, "/"),
          relative_path: relativePath,
          filename: entry.name,
          extension: path.extname(entry.name).toLowerCase(),
          file_type: fileType,
          size_bytes: stat.size,
          mtime_ms: stat.mtimeMs,
          parent_folder: path.basename(path.dirname(fullPath)),
          seed_domain: domain,
          is_new: isNew,
          is_changed: isChanged,
        };

        files.push(scanned);
        byType[fileType] = (byType[fileType] ?? 0) + 1;
        if (domain) byDomain[domain] = (byDomain[domain] ?? 0) + 1;
      }
    };

    if (!fs.existsSync(rootPath)) {
      errors.push(`Root path does not exist: ${rootPath}`);
    } else {
      walk(rootPath, 0);
    }

    // Save updated state
    this.states[stateKey] = {
      last_scan_at: new Date().toISOString(),
      file_index: newIndex,
      total_files_tracked: Object.keys(newIndex).length,
    };
    saveScanState(this.states);

    const duration = Date.now() - start;
    log.info(`[FolderScanner] Scanned ${rootPath}: ${Object.keys(newIndex).length} files, ${newCount} new, ${changedCount} changed in ${duration}ms`);

    return {
      root_scanned: rootPath.replace(/\\/g, "/"),
      total_files: Object.keys(newIndex).length,
      new_files: newCount,
      changed_files: changedCount,
      unchanged_files: unchangedCount,
      by_type: byType as Record<FileType, number>,
      by_domain: byDomain,
      files,
      scan_duration_ms: duration,
      errors,
    };
  }

  /**
   * Scan all source roots from the shop configuration.
   * Returns combined results across all roots.
   */
  scanAllRoots(roots: Record<string, string>): ScanResult[] {
    const results: ScanResult[] = [];
    for (const [key, rootPath] of Object.entries(roots)) {
      if (!rootPath || typeof rootPath !== "string") continue;
      try {
        results.push(this.scan({ root_path: rootPath }));
      } catch (e: any) {
        log.error(`[FolderScanner] Failed to scan ${key}: ${e.message}`);
      }
    }
    return results;
  }

  /**
   * Get the current scan state for a given root path.
   */
  getState(rootPath: string): ScanState | null {
    const key = path.resolve(rootPath).replace(/\\/g, "/");
    return this.states[key] ?? null;
  }

  /**
   * Get scan state summary across all tracked roots.
   */
  getSummary(): {
    roots_tracked: number;
    total_files_tracked: number;
    roots: Array<{ root: string; files: number; last_scan: string }>;
  } {
    const roots = Object.entries(this.states).map(([root, state]) => ({
      root,
      files: state.total_files_tracked,
      last_scan: state.last_scan_at,
    }));
    return {
      roots_tracked: roots.length,
      total_files_tracked: roots.reduce((sum, r) => sum + r.files, 0),
      roots,
    };
  }

  /**
   * Reset scan state for a root (forces full rescan next time).
   */
  resetState(rootPath: string): void {
    const key = path.resolve(rootPath).replace(/\\/g, "/");
    delete this.states[key];
    saveScanState(this.states);
  }

  /**
   * Reset all scan state.
   */
  resetAllState(): void {
    this.states = {};
    saveScanState(this.states);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const folderScannerEngine = new FolderScannerEngine();
