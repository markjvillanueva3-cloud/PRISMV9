/**
 * DrawingTemplateIndexEngine — RES-MS24: Drawing Template & CAD Drawing Index
 *
 * Scans resource directories for drawing/blueprint files (.idw, .dwg, .dxf,
 * .slddrw, .edrw) and classifies each by type, purpose, and source directory.
 * Supports /blueprint-read accuracy by providing a structured inventory of
 * all drawing-related files available in the resources tree.
 *
 * Actual file counts (2026-04-11 audit):
 *   .dxf    — 1,430 (tool holder drawings, MST holders, CAD exchange)
 *   .slddrw —    23 (SOLIDWORKS drawings: tutorials, samples)
 *   .dwg    —    10 (AutoCAD drawings: tool holders, SW tutorials)
 *   .edrw   —     1 (eDrawings file)
 *   .idw    —     0 (no Inventor drawings found)
 *   Total   — 1,464 drawing files across 3 top-level source directories
 *
 * Actions: drawing_index, drawing_audit, drawing_filter_type, drawing_sources
 *
 * @module DrawingTemplateIndexEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Classification of drawing file format.
 * - inventor_drawing: Autodesk Inventor .idw files
 * - autocad_drawing: AutoCAD .dwg files
 * - dxf_exchange: DXF interchange format files
 * - solidworks_drawing: SOLIDWORKS .slddrw files
 * - edrawing: eDrawings .edrw files
 * - other: unrecognized drawing-adjacent files
 */
export type DrawingFileType =
  | "inventor_drawing"
  | "autocad_drawing"
  | "dxf_exchange"
  | "solidworks_drawing"
  | "edrawing"
  | "other";

/**
 * Classification of drawing purpose.
 * - template: drawing template or boilerplate (e.g. dissectiontemplate.slddrw)
 * - production_drawing: production-ready part/assembly drawing
 * - training: training exercise or tutorial drawing
 * - reference: reference/sample drawing (vendor catalogs, tutorials)
 * - tooling: tool holder or tooling vendor drawing (DXF/DWG from MST, Command)
 */
export type DrawingPurpose =
  | "template"
  | "production_drawing"
  | "training"
  | "reference"
  | "tooling";

/**
 * A single indexed drawing file entry with full metadata.
 */
export interface DrawingFileEntry {
  /** Absolute path to the file (forward slashes) */
  filePath: string;
  /** Basename of the file */
  filename: string;
  /** Lowercase extension including dot (e.g. ".dxf") */
  extension: string;
  /** File size in bytes */
  sizeBytes: number;
  /** ISO 8601 last-modified timestamp */
  lastModified: string;
  /** Immediate parent folder name */
  parentFolder: string;
  /** Full parent directory path (forward slashes) */
  directory: string;
  /** Drawing file type classification */
  drawingType: DrawingFileType;
  /** Drawing purpose classification */
  purpose: DrawingPurpose;
  /** Top-level source directory name under resources/ */
  source: string;
}

/**
 * Full harvest result containing all indexed drawings and aggregation maps.
 */
export interface DrawingTemplateIndexResult {
  /** All indexed drawing file entries */
  files: DrawingFileEntry[];
  /** Total count of drawing files found */
  totalFiles: number;
  /** Count by DrawingFileType */
  byType: Record<string, number>;
  /** Count by DrawingPurpose */
  byPurpose: Record<string, number>;
  /** Count by file extension */
  byExtension: Record<string, number>;
  /** Count by top-level source directory */
  bySource: Record<string, number>;
  /** ISO 8601 timestamp of scan completion */
  timestamp: string;
  /** Duration of the scan in milliseconds */
  scanDurationMs: number;
}

/**
 * Audit summary with top-N breakdowns.
 */
export interface DrawingAuditResult {
  /** Total drawing files indexed */
  totalFiles: number;
  /** Top extensions by count */
  topExtensions: Array<{ extension: string; count: number }>;
  /** Type breakdown */
  typeBreakdown: Record<string, number>;
  /** Purpose breakdown */
  purposeBreakdown: Record<string, number>;
  /** Source directory breakdown */
  sourceBreakdown: Record<string, number>;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Source directory descriptor.
 */
export interface DrawingSourceInfo {
  /** Human-readable name */
  name: string;
  /** Absolute filesystem path */
  path: string;
  /** Description of what this source contains */
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RESOURCES_ROOT = "H:/prism/resources";

/**
 * Drawing-related file extensions mapped to their DrawingFileType.
 * Extensions are lowercase with leading dot.
 */
const DRAWING_EXT_MAP: Record<string, DrawingFileType> = {
  ".idw": "inventor_drawing",
  ".dwg": "autocad_drawing",
  ".dxf": "dxf_exchange",
  ".slddrw": "solidworks_drawing",
  ".edrw": "edrawing",
};

const DRAWING_EXTS = new Set(Object.keys(DRAWING_EXT_MAP));

/**
 * Source directories known to contain drawing files.
 * Scanned recursively up to a depth limit.
 */
const SOURCE_DIRS: DrawingSourceInfo[] = [
  {
    name: "Training Day 2",
    path: path.join(RESOURCES_ROOT, "2- Basic Training Day 2"),
    description:
      "Tool holder DXF/DWG drawings from MST Holders, Command Holders, and tooling vendors",
  },
  {
    name: "SOLIDWORKS",
    path: path.join(RESOURCES_ROOT, "SOLIDWORKS"),
    description:
      "SOLIDWORKS sample/tutorial drawings (.slddrw, .dwg, .dxf, .edrw)",
  },
  {
    name: "MasterCam",
    path: path.join(RESOURCES_ROOT, "MasterCam"),
    description: "MasterCam art import / point cloud DXF files",
  },
  {
    name: "Training Day 1",
    path: path.join(RESOURCES_ROOT, "1- Basic Training Day 1"),
    description: "Basic 2D drawing training projects",
  },
  {
    name: "PRISM CAD-CAM TRAINING",
    path: path.join(RESOURCES_ROOT, "PRISM CAD-CAM TRAINING"),
    description: "PRISM internal CAD-CAM training drawings",
  },
];

/** Maximum recursion depth for directory walking */
const MAX_DEPTH = 25;

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

/**
 * Classifies a file's DrawingFileType from its extension.
 * @param ext - lowercase extension with leading dot
 * @returns the DrawingFileType or "other"
 */
function classifyType(ext: string): DrawingFileType {
  return DRAWING_EXT_MAP[ext.toLowerCase()] ?? "other";
}

/**
 * Classifies the purpose of a drawing file from its path and filename.
 * @param filename - basename of the file
 * @param fullPath - absolute file path
 * @param sourceName - name of the top-level source directory
 * @returns the DrawingPurpose classification
 */
function classifyPurpose(
  filename: string,
  fullPath: string,
  sourceName: string
): DrawingPurpose {
  const lower = (filename + " " + fullPath).toLowerCase();

  // Templates: files with "template" in name or path
  if (/template/.test(lower)) return "template";

  // Tooling: MST holders, command holders, tool database DXF/DWG
  if (
    /mst.?holder|command.?holder|tool.?database|tooling|holder/i.test(lower)
  ) {
    return "tooling";
  }

  // Training: training day directories, tutorial, sample
  if (/training|tutorial|sample|introsw|advdrawing/.test(lower)) {
    return "training";
  }

  // Reference: SOLIDWORKS, MasterCam reference files
  if (
    sourceName === "SOLIDWORKS" ||
    sourceName === "MasterCam"
  ) {
    return "reference";
  }

  // Default for Training Day 2 (mostly tooling DXF/DWG)
  if (sourceName === "Training Day 2") return "tooling";

  return "reference";
}

// ============================================================================
// DIRECTORY SCANNER
// ============================================================================

/**
 * Recursively collects drawing files from a directory tree.
 * Only includes files whose extension is in DRAWING_EXTS.
 * @param dirPath - root directory to scan
 * @param maxDepth - maximum recursion depth
 * @returns array of absolute file paths (forward slashes)
 */
async function collectDrawingFiles(
  dirPath: string,
  maxDepth: number = MAX_DEPTH
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "Thumbs.db" || entry === "desktop.ini") {
        continue;
      }

      const fullPath = path.join(dir, entry);
      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (stats.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        if (DRAWING_EXTS.has(ext)) {
          results.push(fullPath.replace(/\\/g, "/"));
        }
      }
    }
  }

  await walk(dirPath, 0);
  return results;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function incrementMap(map: Record<string, number>, key: string): void {
  map[key] = (map[key] || 0) + 1;
}

function sortedTopN(
  map: Record<string, number>,
  n: number
): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * DrawingTemplateIndexEngine — indexes drawing template and CAD drawing files
 * from the resources directory tree to support /blueprint-read accuracy.
 *
 * All methods are static. No instantiation required.
 */
export class DrawingTemplateIndexEngine {
  /**
   * Returns the source directories that are scanned for drawing files.
   * @returns array of DrawingSourceInfo objects
   */
  static getSources(): DrawingSourceInfo[] {
    return SOURCE_DIRS.map((s) => ({ ...s }));
  }

  /**
   * Full scan of all source directories. Collects every drawing file,
   * classifies it by type and purpose, and builds aggregation maps.
   *
   * @returns DrawingTemplateIndexResult with all entries and summary counts
   */
  static async harvest(): Promise<DrawingTemplateIndexResult> {
    const start = Date.now();
    const files: DrawingFileEntry[] = [];
    const byType: Record<string, number> = {};
    const byPurpose: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const source of SOURCE_DIRS) {
      const filePaths = await collectDrawingFiles(source.path);

      for (const filePath of filePaths) {
        const filename = path.basename(filePath);
        const directory = path.dirname(filePath).replace(/\\/g, "/");
        const ext = path.extname(filename).toLowerCase();
        const parentFolder = path.basename(directory);

        let fileSize = 0;
        let lastModified = new Date().toISOString();
        try {
          const s = await stat(filePath);
          fileSize = s.size;
          lastModified = s.mtime.toISOString();
        } catch {
          // stat may fail on edge-case paths; fall back to defaults
        }

        const drawingType = classifyType(ext);
        const purpose = classifyPurpose(filename, filePath, source.name);

        const entry: DrawingFileEntry = {
          filePath,
          filename,
          extension: ext,
          sizeBytes: fileSize,
          lastModified,
          parentFolder,
          directory,
          drawingType,
          purpose,
          source: source.name,
        };

        files.push(entry);

        incrementMap(byType, drawingType);
        incrementMap(byPurpose, purpose);
        incrementMap(byExtension, ext);
        incrementMap(bySource, source.name);
      }
    }

    return {
      files,
      totalFiles: files.length,
      byType,
      byPurpose,
      byExtension,
      bySource,
      timestamp: new Date().toISOString(),
      scanDurationMs: Date.now() - start,
    };
  }

  /**
   * Returns a summary audit of all indexed drawing files.
   * @returns DrawingAuditResult with top extensions, breakdowns
   */
  static async audit(): Promise<DrawingAuditResult> {
    const result = await DrawingTemplateIndexEngine.harvest();

    const topExtensions = sortedTopN(result.byExtension, 10).map((e) => ({
      extension: e.key,
      count: e.count,
    }));

    return {
      totalFiles: result.totalFiles,
      topExtensions,
      typeBreakdown: result.byType,
      purposeBreakdown: result.byPurpose,
      sourceBreakdown: result.bySource,
      timestamp: result.timestamp,
    };
  }

  /**
   * Filters an array of drawing entries by DrawingFileType.
   * @param drawings - array of DrawingFileEntry
   * @param type - the DrawingFileType to keep
   * @returns filtered array containing only entries matching the given type
   */
  static filterByType(
    drawings: DrawingFileEntry[],
    type: DrawingFileType
  ): DrawingFileEntry[] {
    return drawings.filter((d) => d.drawingType === type);
  }

  /**
   * Filters an array of drawing entries by DrawingPurpose.
   * @param drawings - array of DrawingFileEntry
   * @param purpose - the DrawingPurpose to keep
   * @returns filtered array containing only entries matching the given purpose
   */
  static filterByPurpose(
    drawings: DrawingFileEntry[],
    purpose: DrawingPurpose
  ): DrawingFileEntry[] {
    return drawings.filter((d) => d.purpose === purpose);
  }

  /**
   * Filters an array of drawing entries by source directory name.
   * @param drawings - array of DrawingFileEntry
   * @param source - the source name to keep (e.g. "Training Day 2")
   * @returns filtered array
   */
  static filterBySource(
    drawings: DrawingFileEntry[],
    source: string
  ): DrawingFileEntry[] {
    return drawings.filter((d) => d.source === source);
  }
}
