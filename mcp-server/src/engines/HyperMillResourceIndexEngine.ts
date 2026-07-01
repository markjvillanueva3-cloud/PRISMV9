// WIRE-EXEMPT: U-EFF33 only normalised Dirent.name (Buffer|string → string) in the scanner loop; engine is a resource indexer consumed by hyperMILL extraction pipelines, not directly dispatched.
/**
 * HyperMillResourceIndexEngine — hyperMILL 73K File Resource Index
 *
 * RES-MS7 U-HM01: Catalogs the hyperMILL resource tree (18,868 files in
 * HYPERMILL/ + 54,116 in OPEN MIND/) by file type, directory structure,
 * and manufacturing relevance. This is the first unit — building the index
 * that subsequent units use for deep mining.
 *
 * Key file types:
 *   - .py  (306) — Python automation scripts (AutomationCenter)
 *   - .hms (247) — Strategy macro definitions (binary)
 *   - .hmc (238) — Cycle/clamp configs (binary ZIP)
 *   - .cfg (930) — Configuration files (text)
 *   - .loc (3,385) — Localization key-value pairs (UTF-16)
 *   - .cyc (in OPEN MIND) — Cycle definition files
 *   - .sub (110) — Subroutine definitions
 *   - .xml (411) — XML configs and metadata
 *
 * @module HyperMillResourceIndexEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** A directory node in the hyperMILL resource tree. */
export interface HmDirectoryNode {
  /** Directory path relative to root. */
  relativePath: string;
  /** Total files in this directory (non-recursive). */
  fileCount: number;
  /** File extension counts in this directory. */
  extensionCounts: Record<string, number>;
  /** Total size in bytes. */
  totalSize: number;
}

/** Result of indexing the full hyperMILL resource tree. */
export interface HyperMillResourceIndexResult {
  /** Total files indexed. */
  totalFiles: number;
  /** Total size in bytes. */
  totalSizeBytes: number;
  /** File count by extension (lowercase). */
  byExtension: Record<string, number>;
  /** File count by top-level category directory. */
  byCategory: Record<string, number>;
  /** Directory nodes with per-dir stats. */
  directories: HmDirectoryNode[];
  /** hyperMILL versions found. */
  versions: string[];
  /** Python script count (automation). */
  pythonScriptCount: number;
  /** Strategy macro count (.hms). */
  strategyMacroCount: number;
  /** Cycle config count (.hmc). */
  cycleConfigCount: number;
  /** Localization file count (.loc). */
  localizationCount: number;
  /** Configuration file count (.cfg). */
  configCount: number;
  /** XML file count. */
  xmlCount: number;
  /** Subroutine count (.sub). */
  subroutineCount: number;
  /** Cycle definition count (.cyc). */
  cycleDefCount: number;
  /** ISO timestamp. */
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HYPERMILL_ROOT = "H:/prism/resources/HYPERMILL";
const OPENMIND_ROOT = "H:/prism/resources/OPEN MIND";

/** Max directory depth to prevent runaway traversal. */
const MAX_DEPTH = 15;

// ============================================================================
// ENGINE
// ============================================================================

export class HyperMillResourceIndexEngine {
  /**
   * Returns source directory paths and expected counts.
   */
  static getSources() {
    return {
      hyperMillRoot: HYPERMILL_ROOT,
      openMindRoot: OPENMIND_ROOT,
      expectedHyperMillFiles: 18868,
      expectedOpenMindFiles: 54116,
      description: "hyperMILL (18,868 files) + OPEN MIND (54,116 files) resource directories",
    };
  }

  /**
   * Index all files in HYPERMILL/ and OPEN MIND/ directories.
   * Counts files by extension and directory, without reading file contents.
   */
  static async harvest(): Promise<HyperMillResourceIndexResult> {
    const byExtension: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const directories: HmDirectoryNode[] = [];
    let totalFiles = 0;
    let totalSize = 0;
    const versions = new Set<string>();

    // Scan HYPERMILL/
    await this.scanTree(HYPERMILL_ROOT, HYPERMILL_ROOT, "HYPERMILL", byExtension, byCategory, directories, versions, 0);
    const hmTotal = totalFiles;

    // Count totals from directories
    for (const dir of directories) {
      totalFiles += dir.fileCount;
      totalSize += dir.totalSize;
    }

    const hmCount = totalFiles;

    // Scan OPEN MIND/
    const omDirectories: HmDirectoryNode[] = [];
    await this.scanTree(OPENMIND_ROOT, OPENMIND_ROOT, "OPEN MIND", byExtension, byCategory, omDirectories, versions, 0);

    let omTotal = 0;
    let omSize = 0;
    for (const dir of omDirectories) {
      omTotal += dir.fileCount;
      omSize += dir.totalSize;
    }

    totalFiles += omTotal;
    totalSize += omSize;
    directories.push(...omDirectories);

    return {
      totalFiles,
      totalSizeBytes: totalSize,
      byExtension,
      byCategory,
      directories,
      versions: [...versions].sort(),
      pythonScriptCount: byExtension[".py"] ?? 0,
      strategyMacroCount: byExtension[".hms"] ?? 0,
      cycleConfigCount: byExtension[".hmc"] ?? 0,
      localizationCount: (byExtension[".loc"] ?? 0),
      configCount: (byExtension[".cfg"] ?? 0),
      xmlCount: (byExtension[".xml"] ?? 0),
      subroutineCount: (byExtension[".sub"] ?? 0),
      cycleDefCount: (byExtension[".cyc"] ?? 0),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Recursively scan a directory tree, building extension counts.
   */
  private static async scanTree(
    dirPath: string,
    rootPath: string,
    categoryName: string,
    byExtension: Record<string, number>,
    byCategory: Record<string, number>,
    directories: HmDirectoryNode[],
    versions: Set<string>,
    depth: number
  ): Promise<void> {
    if (depth > MAX_DEPTH) return;

    let entries: import("fs").Dirent<string>[];
    try {
      entries = await readdir(dirPath, { withFileTypes: true, encoding: "utf8" });
    } catch {
      return;
    }

    const relativePath = path.relative(rootPath, dirPath).replace(/\\/g, "/") || ".";
    const extCounts: Record<string, number> = {};
    let fileCount = 0;
    let dirSize = 0;

    // Detect version directories (e.g., "31.0", "33.0")
    const versionMatch = relativePath.match(/(\d+\.\d+)/);
    if (versionMatch) {
      versions.add(versionMatch[1]);
    }

    for (const entry of entries) {
      // Normalise Dirent.name once so downstream string ops type-check.
      const name = String(entry.name);
      const fullPath = path.join(dirPath, name);

      if (entry.isDirectory()) {
        await this.scanTree(fullPath, rootPath, categoryName, byExtension, byCategory, directories, versions, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(name).toLowerCase();
        extCounts[ext] = (extCounts[ext] ?? 0) + 1;
        byExtension[ext] = (byExtension[ext] ?? 0) + 1;
        byCategory[categoryName] = (byCategory[categoryName] ?? 0) + 1;
        fileCount++;

        try {
          const s = await stat(fullPath);
          dirSize += s.size;
        } catch {
          // skip
        }
      }
    }

    if (fileCount > 0) {
      directories.push({
        relativePath,
        fileCount,
        extensionCounts: extCounts,
        totalSize: dirSize,
      });
    }
  }

  /**
   * Get all directories containing Python automation scripts.
   */
  static getPythonDirs(result: HyperMillResourceIndexResult): HmDirectoryNode[] {
    return result.directories.filter((d) => d.extensionCounts[".py"] > 0);
  }

  /**
   * Get all directories containing strategy macros (.hms).
   */
  static getStrategyDirs(result: HyperMillResourceIndexResult): HmDirectoryNode[] {
    return result.directories.filter((d) => d.extensionCounts[".hms"] > 0);
  }

  /**
   * Get all directories containing cycle configs (.hmc).
   */
  static getCycleDirs(result: HyperMillResourceIndexResult): HmDirectoryNode[] {
    return result.directories.filter((d) => d.extensionCounts[".hmc"] > 0);
  }

  /**
   * Get the top N directories by file count.
   */
  static getTopDirectories(result: HyperMillResourceIndexResult, limit = 20): HmDirectoryNode[] {
    return [...result.directories].sort((a, b) => b.fileCount - a.fileCount).slice(0, limit);
  }

  /**
   * Quick audit summary.
   */
  static async audit(): Promise<{
    totalFiles: number;
    totalSizeMb: number;
    versions: string[];
    topExtensions: Array<{ ext: string; count: number }>;
    pythonScripts: number;
    strategyMacros: number;
    cycleConfigs: number;
    directoryCount: number;
  }> {
    const result = await this.harvest();
    const topExt = Object.entries(result.byExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ext, count]) => ({ ext, count }));

    return {
      totalFiles: result.totalFiles,
      totalSizeMb: Math.round(result.totalSizeBytes / (1024 * 1024)),
      versions: result.versions,
      topExtensions: topExt,
      pythonScripts: result.pythonScriptCount,
      strategyMacros: result.strategyMacroCount,
      cycleConfigs: result.cycleConfigCount,
      directoryCount: result.directories.length,
    };
  }
}
