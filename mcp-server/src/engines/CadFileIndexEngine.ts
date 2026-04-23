/**
 * CadFileIndexEngine — Index all CAD files in Box drive
 *
 * Catalogs .ipt, .stp, .step, .dwg, .dxf, .iam, .idw, .mcx-8, .esp files.
 * Extracts metadata from filename conventions and associates CAD files
 * with their corresponding CNC programs by naming convention matching.
 *
 * @module CadFileIndexEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface CadFileEntry {
  file_path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  last_modified: string;
  part_name: string;
  part_number: string | null;
  material_hint: string | null;
  cad_type: CadFileType;
  associated_programs: string[];
  parent_folder: string;
}

export type CadFileType =
  | "inventor_part"
  | "inventor_assembly"
  | "inventor_drawing"
  | "step"
  | "dwg"
  | "dxf"
  | "mastercam"
  | "esprit"
  | "unknown";

export interface CadIndexSummary {
  total_files: number;
  by_type: Record<CadFileType, number>;
  by_extension: Record<string, number>;
  files_with_programs: number;
  entries: CadFileEntry[];
  scan_duration_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CAD_EXT_MAP: Record<string, CadFileType> = {
  ".ipt": "inventor_part",
  ".iam": "inventor_assembly",
  ".idw": "inventor_drawing",
  ".stp": "step",
  ".step": "step",
  ".dwg": "dwg",
  ".dxf": "dxf",
  ".mcx-8": "mastercam",
  ".mcx": "mastercam",
  ".esp": "esprit",
};

const ALL_CAD_EXTS = new Set(Object.keys(CAD_EXT_MAP));

// ============================================================================
// ENGINE
// ============================================================================

export class CadFileIndexEngine {
  /**
   * Index all CAD files found in the given root paths.
   */
  index(rootPaths: string[]): CadIndexSummary {
    const start = Date.now();
    const entries: CadFileEntry[] = [];

    for (const rootPath of rootPaths) {
      if (!fs.existsSync(rootPath)) continue;
      this._walkForCad(rootPath, entries, 0, 20);
    }

    // Try to associate programs
    this._associatePrograms(entries, rootPaths);

    const byType: Record<CadFileType, number> = {
      inventor_part: 0, inventor_assembly: 0, inventor_drawing: 0,
      step: 0, dwg: 0, dxf: 0, mastercam: 0, esprit: 0, unknown: 0,
    };
    const byExt: Record<string, number> = {};

    for (const e of entries) {
      byType[e.cad_type]++;
      byExt[e.extension] = (byExt[e.extension] ?? 0) + 1;
    }

    return {
      total_files: entries.length,
      by_type: byType,
      by_extension: byExt,
      files_with_programs: entries.filter(e => e.associated_programs.length > 0).length,
      entries,
      scan_duration_ms: Date.now() - start,
    };
  }

  /**
   * Extract part number from filename.
   * Common conventions: "A10-002-028.ipt", "500-33300-00000-01.ipt", "57-CC-87.ipt"
   */
  extractPartNumber(filename: string): string | null {
    const base = path.parse(filename).name;

    // Pattern: digits-digits-digits (part number with dashes)
    const dashPattern = base.match(/^(\d[\w-]+\d)/);
    if (dashPattern) return dashPattern[1];

    // Pattern: letters-digits
    const alphaNum = base.match(/^([A-Z][\w-]+)/i);
    if (alphaNum) return alphaNum[1];

    return null;
  }

  /**
   * Guess material from filename or folder.
   */
  extractMaterialHint(filename: string, folderPath: string): string | null {
    const combined = `${filename} ${folderPath}`.toUpperCase();

    if (combined.includes("STEEL") || combined.includes("4140") || combined.includes("4340")) return "steel";
    if (combined.includes("ALUM") || combined.includes("6061") || combined.includes("7075")) return "aluminum";
    if (combined.includes("STAINLESS") || combined.includes("303") || combined.includes("304") || combined.includes("316")) return "stainless";
    if (combined.includes("BRASS")) return "brass";
    if (combined.includes("COPPER")) return "copper";
    if (combined.includes("TITANIUM") || combined.includes("TI-6")) return "titanium";
    if (combined.includes("PLASTIC") || combined.includes("DELRIN") || combined.includes("NYLON")) return "plastic";
    if (combined.includes("INCONEL") || combined.includes("718")) return "inconel";
    if (combined.includes("H13") || combined.includes("A2") || combined.includes("D2") || combined.includes("S7")) return "tool_steel";

    return null;
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _walkForCad(dirPath: string, entries: CadFileEntry[], depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        this._walkForCad(fullPath, entries, depth + 1, maxDepth);
        continue;
      }

      if (!item.isFile()) continue;

      const ext = path.extname(item.name).toLowerCase();
      if (!ALL_CAD_EXTS.has(ext)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      const partNumber = this.extractPartNumber(item.name);
      const materialHint = this.extractMaterialHint(item.name, dirPath);

      entries.push({
        file_path: fullPath,
        filename: item.name,
        extension: ext,
        size_bytes: stat.size,
        last_modified: stat.mtime.toISOString(),
        part_name: path.parse(item.name).name,
        part_number: partNumber,
        material_hint: materialHint,
        cad_type: CAD_EXT_MAP[ext] ?? "unknown",
        associated_programs: [],
        parent_folder: dirPath,
      });
    }
  }

  private _associatePrograms(cadEntries: CadFileEntry[], rootPaths: string[]): void {
    // Build a map of CNC program basenames for fast lookup
    const programNames = new Map<string, string[]>();

    for (const rootPath of rootPaths) {
      this._collectProgramNames(rootPath, programNames, 0, 20);
    }

    // Match CAD files to programs by part number / base name
    for (const cad of cadEntries) {
      const baseName = path.parse(cad.filename).name.toUpperCase();
      const partNum = cad.part_number?.toUpperCase();

      // Exact match on base name
      if (programNames.has(baseName)) {
        cad.associated_programs.push(...programNames.get(baseName)!);
      }

      // Match on part number
      if (partNum && partNum !== baseName && programNames.has(partNum)) {
        cad.associated_programs.push(...programNames.get(partNum)!);
      }

      // Fuzzy: check if any program name starts with the part number
      if (partNum) {
        for (const [pName, pPaths] of programNames) {
          if (pName.startsWith(partNum) && !cad.associated_programs.includes(pPaths[0])) {
            cad.associated_programs.push(...pPaths);
          }
        }
      }
    }
  }

  private _collectProgramNames(dirPath: string, map: Map<string, string[]>, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    const cncExts = new Set([".min", ".nc", ".hnc", ".tap", ".gcd"]);

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        this._collectProgramNames(fullPath, map, depth + 1, maxDepth);
        continue;
      }

      if (!item.isFile()) continue;

      const ext = path.extname(item.name).toLowerCase();
      if (!cncExts.has(ext)) continue;

      const baseName = path.parse(item.name).name.toUpperCase();
      if (!map.has(baseName)) map.set(baseName, []);
      map.get(baseName)!.push(fullPath);
    }
  }
}

export const cadFileIndexEngine = new CadFileIndexEngine();
