// WIRE-EXEMPT: U-EFF33 only normalised Dirent.name (Buffer|string → string) in the scanner loop; engine is a library index consumed by downstream part-matching flows, not directly dispatched.
/**
 * CadPartLibraryEngine — Feature-Tagged CAD Part Library Index
 *
 * RES-MS10 U-PART01: Indexes 70+ STEP/STP parts from JM Die's production files
 * and general-purpose CAD examples. Each part is tagged with inferred manufacturing
 * features, complexity, required operations, and recommended machine type.
 *
 * Data sources:
 *   - PART MODELS FOR LEARNING ENGINE/BATCH 1/ — 30 JM Die production parts
 *   - CAD FILES/ — 39 general/reference parts (aerospace, workholding, etc.)
 *   - PRISM CAD-CAM TRAINING/ — 2 training casing parts
 *
 * @module CadPartLibraryEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Complexity classification for a part. */
export type PartComplexity = "simple" | "medium" | "complex" | "extreme";

/** Manufacturing operation type required. */
export type ManufacturingOp =
  | "turning"
  | "3axis_milling"
  | "5axis_milling"
  | "mill_turn"
  | "edm"
  | "grinding"
  | "assembly"
  | "workholding";

/** Source directory classification. */
export type PartSource = "jm_die_production" | "cad_reference" | "training";

/** A single indexed CAD part with manufacturing metadata. */
export interface CadPart {
  /** Filename without path. */
  filename: string;
  /** Absolute file path. */
  filePath: string;
  /** File extension in lowercase (.step or .stp). */
  extension: string;
  /** File size in bytes. */
  fileSize: number;
  /** Part name extracted from filename (cleaned). */
  partName: string;
  /** Source classification. */
  source: PartSource;
  /** Inferred machine assignment from filename (e.g., "MACHINE 5", "HURCO", "MULTUS"). */
  machineHint: string | null;
  /** Inferred complexity from file size and name patterns. */
  complexity: PartComplexity;
  /** Inferred primary manufacturing operations. */
  operations: ManufacturingOp[];
  /** Inferred feature tags from filename keywords. */
  featureTags: string[];
  /** Whether this is a JM Die production part (vs. reference/training). */
  isProduction: boolean;
}

/** Result of indexing the full part library. */
export interface CadPartLibraryResult {
  /** All indexed parts. */
  parts: CadPart[];
  /** Total part count. */
  totalParts: number;
  /** Count by source. */
  bySource: Record<string, number>;
  /** Count by complexity. */
  byComplexity: Record<string, number>;
  /** Count by primary operation. */
  byOperation: Record<string, number>;
  /** Count by extension. */
  byExtension: Record<string, number>;
  /** All unique feature tags found. */
  allFeatureTags: string[];
  /** ISO timestamp. */
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH1_DIR = "H:/prism/resources/PART MODELS FOR LEARNING ENGINE/BATCH 1";
const CAD_FILES_DIR = "H:/prism/resources/CAD FILES";
const TRAINING_DIR = "H:/prism/resources/PRISM CAD-CAM TRAINING";

const VALID_EXTENSIONS = new Set([".step", ".stp"]);

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

/** Extract a clean part name from the filename. */
function extractPartName(filename: string): string {
  return filename
    .replace(/\.(step|stp)$/i, "")
    .replace(/\s*-\s*(MACHINE \d+|HURCO|MULTUS|MARK|CUSTOMER SUPPLIED)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract machine hint from filename. */
function extractMachineHint(filename: string): string | null {
  const upper = filename.toUpperCase();
  const machineMatch = upper.match(/MACHINE\s*(\d+)/);
  if (machineMatch) return `MACHINE ${machineMatch[1]}`;
  if (upper.includes("HURCO")) return "HURCO";
  if (upper.includes("MULTUS")) return "MULTUS";
  if (upper.includes("ROKU")) return "ROKU-ROKU";
  return null;
}

/** Infer complexity from file size and filename patterns. */
function inferComplexity(fileSize: number, filename: string): PartComplexity {
  const upper = filename.toUpperCase();
  // Assemblies and very large files are extreme
  if (upper.includes("ASSEMBLY") || upper.includes("ASSY") || fileSize > 10_000_000) return "extreme";
  // Multi-feature parts, impellers, turbines are complex
  if (upper.includes("IMPELLER") || upper.includes("TURBINE") || upper.includes("BLISK") || fileSize > 2_000_000) return "complex";
  // Medium-sized parts
  if (fileSize > 100_000) return "medium";
  // Small simple parts
  return "simple";
}

/** Infer manufacturing operations from filename and context. */
function inferOperations(filename: string, source: PartSource, machineHint: string | null): ManufacturingOp[] {
  const upper = filename.toUpperCase();
  const ops: ManufacturingOp[] = [];

  // JM Die production parts are mostly turned (lathe-first shop)
  if (source === "jm_die_production") {
    if (machineHint === "MULTUS") {
      ops.push("mill_turn");
    } else if (machineHint === "HURCO") {
      ops.push("3axis_milling");
    } else {
      ops.push("turning");
    }
  }

  // Keyword-based inference
  if (upper.includes("IMPELLER") || upper.includes("TURBINE") || upper.includes("BLISK") || upper.includes("5AXIS")) {
    if (!ops.includes("5axis_milling")) ops.push("5axis_milling");
  }
  if (upper.includes("VISE") || upper.includes("CLAMP") || upper.includes("JAW") || upper.includes("GRIPPER") || upper.includes("CHUCK") || upper.includes("FIXTURE")) {
    if (!ops.includes("workholding")) ops.push("workholding");
  }
  if (upper.includes("ASSEMBLY") || upper.includes("ASSY") || upper.includes("MONTAGEM")) {
    if (!ops.includes("assembly")) ops.push("assembly");
  }
  if (upper.includes("GEAR") || upper.includes("ENGRENAGEM")) {
    if (!ops.includes("turning")) ops.push("turning");
    if (!ops.includes("grinding")) ops.push("grinding");
  }
  if (upper.includes("ROTOR") || upper.includes("SHAFT") || upper.includes("PIN") || upper.includes("BARREL")) {
    if (!ops.includes("turning")) ops.push("turning");
  }
  if (upper.includes("VALVE") || upper.includes("BODY") || upper.includes("CONNECTOR") || upper.includes("CONECTOR")) {
    if (!ops.includes("3axis_milling")) ops.push("3axis_milling");
  }
  if (upper.includes("DIE") || upper.includes("CASING") || upper.includes("CASE")) {
    if (!ops.includes("turning")) ops.push("turning");
  }

  // Default fallback
  if (ops.length === 0) {
    ops.push("3axis_milling");
  }

  return ops;
}

/** Extract feature tags from filename keywords. */
function extractFeatureTags(filename: string): string[] {
  const upper = filename.toUpperCase();
  const tags: string[] = [];

  const featureKeywords: Record<string, string> = {
    "BORE": "bore",
    "GROOVE": "groove",
    "THREAD": "thread",
    "HEX": "hex_feature",
    "TRIM": "trim",
    "LOBE": "lobe",
    "SLOT": "slot",
    "HOLE": "hole",
    "POCKET": "pocket",
    "FILLET": "fillet",
    "CHAMFER": "chamfer",
    "TAPER": "taper",
    "KNURL": "knurl",
    "FACE": "face",
    "PIN": "pin",
    "KNIFE": "knife",
    "ROLL": "roll",
    "CASING": "casing",
    "DIE": "die",
    "JAW": "jaw",
    "COATED": "coated",
    "IMPELLER": "impeller",
    "TURBINE": "turbine",
    "BLISK": "blisk",
    "GEAR": "gear",
    "VALVE": "valve",
    "SHAFT": "shaft",
    "ROTOR": "rotor",
    "CONNECTOR": "connector",
    "PATTERN": "pattern",
    "WEIGHT REDUCTION": "weight_reduction",
  };

  for (const [keyword, tag] of Object.entries(featureKeywords)) {
    if (upper.includes(keyword)) {
      tags.push(tag);
    }
  }

  return tags;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CadPartLibraryEngine {
  /**
   * Returns source directory paths and expected counts.
   */
  static getSources() {
    return {
      batch1Path: BATCH1_DIR,
      cadFilesPath: CAD_FILES_DIR,
      trainingPath: TRAINING_DIR,
      expectedParts: 71,
      description: "70+ STEP/STP parts: 30 JM Die production + 39 reference + 2 training",
    };
  }

  /**
   * Scan all source directories and index every STEP/STP part.
   */
  static async harvest(): Promise<CadPartLibraryResult> {
    const parts: CadPart[] = [];

    // Scan all three sources
    await this.scanDirectory(BATCH1_DIR, "jm_die_production", parts);
    await this.scanDirectory(CAD_FILES_DIR, "cad_reference", parts);
    await this.scanDirectoryRecursive(TRAINING_DIR, "training", parts);

    // Build aggregations
    const bySource: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    const tagSet = new Set<string>();

    for (const p of parts) {
      bySource[p.source] = (bySource[p.source] ?? 0) + 1;
      byComplexity[p.complexity] = (byComplexity[p.complexity] ?? 0) + 1;
      byExtension[p.extension] = (byExtension[p.extension] ?? 0) + 1;
      for (const op of p.operations) {
        byOperation[op] = (byOperation[op] ?? 0) + 1;
      }
      for (const tag of p.featureTags) {
        tagSet.add(tag);
      }
    }

    return {
      parts,
      totalParts: parts.length,
      bySource,
      byComplexity,
      byOperation,
      byExtension,
      allFeatureTags: [...tagSet].sort(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scan a flat directory for STEP/STP files.
   */
  private static async scanDirectory(
    dirPath: string,
    source: PartSource,
    parts: CadPart[]
  ): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      return;
    }

    for (const filename of entries) {
      const ext = path.extname(filename).toLowerCase();
      if (!VALID_EXTENSIONS.has(ext)) continue;

      const filePath = path.join(dirPath, filename).replace(/\\/g, "/");
      let fileSize = 0;
      try {
        const s = await stat(filePath);
        fileSize = s.size;
      } catch {
        continue;
      }

      const machineHint = extractMachineHint(filename);
      parts.push({
        filename,
        filePath,
        extension: ext,
        fileSize,
        partName: extractPartName(filename),
        source,
        machineHint,
        complexity: inferComplexity(fileSize, filename),
        operations: inferOperations(filename, source, machineHint),
        featureTags: extractFeatureTags(filename),
        isProduction: source === "jm_die_production",
      });
    }
  }

  /**
   * Recursively scan a directory tree for STEP/STP files.
   */
  private static async scanDirectoryRecursive(
    dirPath: string,
    source: PartSource,
    parts: CadPart[]
  ): Promise<void> {
    let entries: import("fs").Dirent[];
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      // fs/promises readdir with withFileTypes can type `name` as
      // Buffer | string depending on the overload chosen — normalise once.
      const name = String(entry.name);
      const fullPath = path.join(dirPath, name);
      if (entry.isDirectory()) {
        await this.scanDirectoryRecursive(fullPath, source, parts);
      } else if (entry.isFile()) {
        const ext = path.extname(name).toLowerCase();
        if (!VALID_EXTENSIONS.has(ext)) continue;

        let fileSize = 0;
        try {
          const s = await stat(fullPath);
          fileSize = s.size;
        } catch {
          continue;
        }

        const machineHint = extractMachineHint(name);
        parts.push({
          filename: name,
          filePath: fullPath.replace(/\\/g, "/"),
          extension: ext,
          fileSize,
          partName: extractPartName(name),
          source,
          machineHint,
          complexity: inferComplexity(fileSize, name),
          operations: inferOperations(name, source, machineHint),
          featureTags: extractFeatureTags(name),
          isProduction: false,
        });
      }
    }
  }

  /**
   * Filter parts by source classification.
   */
  static filterBySource(parts: CadPart[], source: PartSource): CadPart[] {
    return parts.filter((p) => p.source === source);
  }

  /**
   * Filter parts by complexity level.
   */
  static filterByComplexity(parts: CadPart[], complexity: PartComplexity): CadPart[] {
    return parts.filter((p) => p.complexity === complexity);
  }

  /**
   * Find parts requiring a specific manufacturing operation.
   */
  static filterByOperation(parts: CadPart[], op: ManufacturingOp): CadPart[] {
    return parts.filter((p) => p.operations.includes(op));
  }

  /**
   * Search parts by name substring (case-insensitive).
   */
  static findByName(parts: CadPart[], query: string): CadPart[] {
    const lower = query.toLowerCase();
    return parts.filter((p) => p.partName.toLowerCase().includes(lower));
  }

  /**
   * Find parts tagged with a specific feature.
   */
  static filterByFeature(parts: CadPart[], tag: string): CadPart[] {
    return parts.filter((p) => p.featureTags.includes(tag));
  }

  /**
   * Quick audit summary.
   */
  static async audit(): Promise<{
    totalParts: number;
    bySource: Record<string, number>;
    byComplexity: Record<string, number>;
    featureTagCount: number;
    productionParts: number;
    referenceParts: number;
  }> {
    const result = await this.harvest();
    return {
      totalParts: result.totalParts,
      bySource: result.bySource,
      byComplexity: result.byComplexity,
      featureTagCount: result.allFeatureTags.length,
      productionParts: result.parts.filter((p) => p.isProduction).length,
      referenceParts: result.parts.filter((p) => !p.isProduction).length,
    };
  }
}
