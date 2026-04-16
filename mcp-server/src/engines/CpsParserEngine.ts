/**
 * PRISM MCP Server - CPS Parser Engine
 *
 * Post processor metadata extractor that parses Fusion 360 / HSMWorks CPS files,
 * hyperMILL CYC (cycle definition) files, and machine configuration MCFG files.
 *
 * Source directories:
 *   1. H:/prism/resources/FUSION BASIC POSTS/   — 180 CPS files (Fusion 360)
 *   2. H:/prism/resources/HSMWorks 2026/posts/   — 100 CPS files (HSMWorks/SolidCAM)
 *   3. H:/prism/resources/POSTS AND MACHINES/    — 2,877 CYC cycle definition files
 *   4. H:/prism/resources/HSMWorks 2026/editor/MachineCfg/ — 49 MCFG machine configs
 *
 * CPS files are JavaScript-based post processor configurations. Metadata is
 * extracted via regex from the first 200 lines of each file — no eval required.
 *
 * Exported API (all static):
 *   getSources()  → SourceInfo[]       — directory metadata
 *   harvest()     → CpsParseResult     — full extraction
 *   audit()       → CpsAuditSummary    — quick summary stats
 */

import { readFile, readdir, stat } from "fs/promises";
import path from "path";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Metadata extracted from a single .cps post processor file. */
export interface PostProcessorEntry {
  filename: string;
  description: string;
  vendor: string;
  vendorUrl: string;
  certificationLevel: number | null;
  extension: string;
  capabilities: string[];
  programNameIsInteger: boolean;
  codePage: string | null;
  minimumRevision: number | null;
  propertyCount: number;
  source: "fusion" | "hsmworks";
  filePath: string;
}

/** Metadata extracted from a single .cyc cycle definition file. */
export interface CycleEntry {
  filename: string;
  directory: string;
  content: string;
  lineCount: number;
  variables: string[];
  cycleType: string;
  machine: string | null;
}

/** Metadata extracted from a single .mcfg machine configuration file. */
export interface MachineConfigEntry {
  filename: string;
  displayName: string;
  version: number | null;
  guid: string | null;
  axes: string[];
  machineType: string | null;
}

/** Full parse result from harvest(). */
export interface CpsParseResult {
  posts: PostProcessorEntry[];
  totalPosts: number;
  byVendor: Record<string, number>;
  byCapability: Record<string, number>;
  byExtension: Record<string, number>;
  cycles: CycleEntry[];
  totalCycles: number;
  byCycleType: Record<string, number>;
  machineConfigs: MachineConfigEntry[];
  totalMachineConfigs: number;
  timestamp: string;
}

/** Quick summary from audit(). */
export interface CpsAuditSummary {
  totalPosts: number;
  totalCycles: number;
  totalMachineConfigs: number;
  topVendors: Array<{ vendor: string; count: number }>;
  topCapabilities: Array<{ capability: string; count: number }>;
  topExtensions: Array<{ extension: string; count: number }>;
  timestamp: string;
}

/** Source directory info from getSources(). */
export interface SourceInfo {
  name: string;
  path: string;
  fileType: string;
  expectedCount: number;
  description: string;
}

// ============================================================================
// INTERNAL CONSTANTS
// ============================================================================

const FUSION_DIR = "H:/prism/resources/FUSION BASIC POSTS";
const HSMWORKS_DIR = "H:/prism/resources/HSMWorks 2026/posts";
const CYCLES_DIR = "H:/prism/resources/POSTS AND MACHINES";
const MACHINE_CFG_DIR = "H:/prism/resources/HSMWorks 2026/editor/MachineCfg";

/** Maps CAPABILITY_* flags from CPS files to human-readable names. */
const CAPABILITY_MAP: Record<string, string> = {
  CAPABILITY_MILLING: "milling",
  CAPABILITY_TURNING: "turning",
  CAPABILITY_JET: "jet",
  CAPABILITY_ADDITIVE: "additive",
  CAPABILITY_MACHINE_SIMULATION: "machine_simulation",
  CAPABILITY_SETUP_SHEET: "setup_sheet",
  CAPABILITY_INTERMEDIATE: "intermediate",
};

// ============================================================================
// REGEX PATTERNS — applied to first 200 lines of each CPS
// ============================================================================

const RE_DESCRIPTION = /^description\s*=\s*"([^"]+)"/m;
const RE_VENDOR = /^vendor\s*=\s*"([^"]+)"/m;
const RE_VENDOR_URL = /^vendorUrl\s*=\s*"([^"]+)"/m;
const RE_CERT_LEVEL = /^certificationLevel\s*=\s*(\d+)/m;
const RE_EXTENSION = /^extension\s*=\s*"([^"]+)"/m;
const RE_CAPABILITIES = /^capabilities\s*=\s*(.+);/m;
const RE_PROGRAM_NAME_INT = /^programNameIsInteger\s*=\s*(true|false)/m;
const RE_CODE_PAGE = /setCodePage\(\s*"([^"]+)"\s*\)/m;
const RE_MIN_REVISION = /^minimumRevision\s*=\s*(\d+)/m;

/**
 * Matches the start of a property definition inside a `properties = { ... }` block.
 * Looks for patterns like `propertyName: {` which is the standard CPS convention.
 */
const RE_PROPERTY_DEF = /^\s{2,}\w[\w]*\s*:\s*\{/;

/** Extracts $variableName$ patterns from CYC file content. */
const RE_CYC_VARIABLE = /\$([^$]+)\$/g;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CpsParserEngine — extracts metadata from CPS, CYC, and MCFG files.
 *
 * All methods are static; no instantiation required.
 */
export class CpsParserEngine {
  /**
   * Returns metadata about the source directories this engine scans.
   * @returns Array of SourceInfo objects describing each directory
   */
  static getSources(): SourceInfo[] {
    return [
      {
        name: "Fusion 360 Posts",
        path: FUSION_DIR,
        fileType: ".cps",
        expectedCount: 180,
        description:
          "Autodesk Fusion 360 built-in post processor library (Fanuc, Haas, Mazak, Heidenhain, etc.)",
      },
      {
        name: "HSMWorks Posts",
        path: HSMWORKS_DIR,
        fileType: ".cps",
        expectedCount: 100,
        description:
          "HSMWorks / SolidCAM post processor library for SolidWorks-based CAM",
      },
      {
        name: "Cycle Definitions",
        path: CYCLES_DIR,
        fileType: ".cyc",
        expectedCount: 2877,
        description:
          "hyperMILL cycle definition files with G-code templates and variable substitution",
      },
      {
        name: "Machine Configurations",
        path: MACHINE_CFG_DIR,
        fileType: ".mcfg",
        expectedCount: 49,
        description:
          "HSMWorks machine configuration JSON files with axis definitions and travel limits",
      },
    ];
  }

  /**
   * Main extraction method. Scans all source directories and returns
   * a comprehensive CpsParseResult with posts, cycles, and machine configs.
   * @returns Promise resolving to CpsParseResult
   */
  static async harvest(): Promise<CpsParseResult> {
    // Run all three scans in parallel for maximum throughput
    const [fusionPosts, hsmworksPosts, cycles, machineConfigs] =
      await Promise.all([
        CpsParserEngine.scanCpsDirectory(FUSION_DIR, "fusion"),
        CpsParserEngine.scanCpsDirectory(HSMWORKS_DIR, "hsmworks"),
        CpsParserEngine.scanCycleDirectory(CYCLES_DIR),
        CpsParserEngine.scanMachineConfigs(MACHINE_CFG_DIR),
      ]);

    const posts = [...fusionPosts, ...hsmworksPosts];

    // Build aggregation maps
    const byVendor: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    const byExtension: Record<string, number> = {};

    for (const p of posts) {
      const vendorKey = p.vendor || "Unknown";
      byVendor[vendorKey] = (byVendor[vendorKey] || 0) + 1;

      for (const cap of p.capabilities) {
        byCapability[cap] = (byCapability[cap] || 0) + 1;
      }

      const extKey = p.extension || "unknown";
      byExtension[extKey] = (byExtension[extKey] || 0) + 1;
    }

    const byCycleType: Record<string, number> = {};
    for (const c of cycles) {
      byCycleType[c.cycleType] = (byCycleType[c.cycleType] || 0) + 1;
    }

    return {
      posts,
      totalPosts: posts.length,
      byVendor,
      byCapability,
      byExtension,
      cycles,
      totalCycles: cycles.length,
      byCycleType,
      machineConfigs,
      totalMachineConfigs: machineConfigs.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns a quick audit summary without the full post/cycle arrays.
   * @returns Promise resolving to CpsAuditSummary
   */
  static async audit(): Promise<CpsAuditSummary> {
    const result = await CpsParserEngine.harvest();

    const topVendors = Object.entries(result.byVendor)
      .map(([vendor, count]) => ({ vendor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCapabilities = Object.entries(result.byCapability)
      .map(([capability, count]) => ({ capability, count }))
      .sort((a, b) => b.count - a.count);

    const topExtensions = Object.entries(result.byExtension)
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPosts: result.totalPosts,
      totalCycles: result.totalCycles,
      totalMachineConfigs: result.totalMachineConfigs,
      topVendors,
      topCapabilities,
      topExtensions,
      timestamp: result.timestamp,
    };
  }

  // ==========================================================================
  // PRIVATE — CPS scanning
  // ==========================================================================

  /**
   * Scans a directory for .cps files and extracts metadata from each.
   * @param dirPath - Absolute path to the directory
   * @param source - Source label ("fusion" or "hsmworks")
   * @returns Array of PostProcessorEntry
   */
  private static async scanCpsDirectory(
    dirPath: string,
    source: "fusion" | "hsmworks"
  ): Promise<PostProcessorEntry[]> {
    if (!(await CpsParserEngine.dirExists(dirPath))) {
      return [];
    }

    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      return [];
    }

    const cpsFiles = entries.filter((f) =>
      f.toLowerCase().endsWith(".cps")
    );

    const results: PostProcessorEntry[] = [];
    // Process files in parallel batches of 50 to avoid file handle exhaustion
    for (let i = 0; i < cpsFiles.length; i += 50) {
      const batch = cpsFiles.slice(i, i + 50);
      const batchResults = await Promise.all(
        batch.map((f) =>
          CpsParserEngine.parseCpsFile(path.join(dirPath, f), source)
        )
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    return results;
  }

  /**
   * Parses a single CPS file, extracting metadata from the first 200 lines.
   * @param filePath - Absolute path to the .cps file
   * @param source - Source label
   * @returns PostProcessorEntry or null if file could not be read
   */
  private static async parseCpsFile(
    filePath: string,
    source: "fusion" | "hsmworks"
  ): Promise<PostProcessorEntry | null> {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      return null;
    }

    // Only parse first 200 lines for metadata extraction
    const lines = content.split("\n");
    const header = lines.slice(0, 200).join("\n");

    const description =
      header.match(RE_DESCRIPTION)?.[1] ?? path.basename(filePath, ".cps");
    const vendor = header.match(RE_VENDOR)?.[1] ?? "";
    const vendorUrl = header.match(RE_VENDOR_URL)?.[1] ?? "";
    const certMatch = header.match(RE_CERT_LEVEL);
    const certificationLevel = certMatch ? parseInt(certMatch[1], 10) : null;
    const extension = header.match(RE_EXTENSION)?.[1] ?? "";
    const capabilities = CpsParserEngine.parseCapabilities(header);
    const progMatch = header.match(RE_PROGRAM_NAME_INT);
    const programNameIsInteger = progMatch ? progMatch[1] === "true" : false;
    const codePage = header.match(RE_CODE_PAGE)?.[1] ?? null;
    const revMatch = header.match(RE_MIN_REVISION);
    const minimumRevision = revMatch ? parseInt(revMatch[1], 10) : null;

    // Count properties: look for property definitions inside the properties block
    const propertyCount = CpsParserEngine.countProperties(content);

    return {
      filename: path.basename(filePath),
      description,
      vendor,
      vendorUrl,
      certificationLevel,
      extension,
      capabilities,
      programNameIsInteger,
      codePage,
      minimumRevision,
      propertyCount,
      source,
      filePath,
    };
  }

  /**
   * Parses the capabilities line from a CPS file into an array of strings.
   * Example input: "CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION"
   * Example output: ["milling", "machine_simulation"]
   * @param header - The first 200 lines of the CPS file
   * @returns Array of capability strings
   */
  static parseCapabilities(header: string): string[] {
    const match = header.match(RE_CAPABILITIES);
    if (!match) return [];

    const raw = match[1];
    const caps: string[] = [];

    for (const [flag, name] of Object.entries(CAPABILITY_MAP)) {
      if (raw.includes(flag)) {
        caps.push(name);
      }
    }

    return caps;
  }

  /**
   * Counts the number of user-defined properties in a CPS file.
   * Properties are defined as named objects inside a `properties = { }` block.
   * @param content - Full file content
   * @returns Number of properties found
   */
  private static countProperties(content: string): number {
    const lines = content.split("\n");
    let inProperties = false;
    let braceDepth = 0;
    let count = 0;

    for (const line of lines) {
      // Detect start of properties block
      if (!inProperties && /^properties\s*=\s*\{/.test(line)) {
        inProperties = true;
        braceDepth = 1;
        continue;
      }

      if (!inProperties) continue;

      // Track brace depth to know when properties block ends
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      // A property definition is a line at depth 1 matching `name: {`
      if (braceDepth === 2 && RE_PROPERTY_DEF.test(line)) {
        count++;
      }

      // Properties block ended
      if (braceDepth <= 0) break;
    }

    return count;
  }

  // ==========================================================================
  // PRIVATE — CYC scanning
  // ==========================================================================

  /**
   * Recursively scans for .cyc files in the POSTS AND MACHINES directory.
   * @param dirPath - Root directory to scan
   * @returns Array of CycleEntry
   */
  private static async scanCycleDirectory(
    dirPath: string
  ): Promise<CycleEntry[]> {
    if (!(await CpsParserEngine.dirExists(dirPath))) {
      return [];
    }

    const cycFiles = await CpsParserEngine.findFilesRecursive(dirPath, ".cyc");
    const results: CycleEntry[] = [];

    // Process in parallel batches
    for (let i = 0; i < cycFiles.length; i += 100) {
      const batch = cycFiles.slice(i, i + 100);
      const batchResults = await Promise.all(
        batch.map((f) => CpsParserEngine.parseCycFile(f))
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    return results;
  }

  /**
   * Parses a single .cyc file for variables and cycle type classification.
   * @param filePath - Absolute path to the .cyc file
   * @returns CycleEntry or null if file could not be read
   */
  private static async parseCycFile(
    filePath: string
  ): Promise<CycleEntry | null> {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      return null;
    }

    const lines = content.split("\n");
    const variables: string[] = [];
    let match: RegExpExecArray | null;
    const varRegex = new RegExp(RE_CYC_VARIABLE.source, "g");

    while ((match = varRegex.exec(content)) !== null) {
      const varName = match[1];
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    const directory = path.dirname(filePath);
    const machine = CpsParserEngine.extractMachineFromPath(filePath);
    const cycleType = CpsParserEngine.classifyCycleType(filePath, content);

    return {
      filename: path.basename(filePath),
      directory,
      content: content.trim(),
      lineCount: lines.length,
      variables,
      cycleType,
      machine,
    };
  }

  /**
   * Classifies the cycle type from file path and content.
   *
   * Classification rules (in priority order):
   * 1. Path contains "Probing" or "probe" (case-insensitive) → "probing"
   * 2. Path contains "ToolChange" → "tool_change"
   * 3. Content contains G73, G81-G89 canned cycle codes → "canned"
   * 4. Content has "O" program number at line start → "macro"
   * 5. Otherwise → "general"
   *
   * @param filePath - Full path to the .cyc file
   * @param content - File content
   * @returns Cycle type classification string
   */
  static classifyCycleType(filePath: string, content: string): string {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes("probing") || pathLower.includes("probe")) {
      return "probing";
    }
    if (pathLower.includes("toolchange")) {
      return "tool_change";
    }

    // Check for canned cycle G-codes
    if (/G7[3-9]|G8[1-9]\b/.test(content)) {
      return "canned";
    }

    // Check for macro program number (e.g., "O1234" at start of line)
    if (/^O\d{4}/m.test(content)) {
      return "macro";
    }

    return "general";
  }

  /**
   * Extracts the machine name from a CYC file path.
   * Paths follow the pattern: .../MachineName__Controller_Version/...
   * The top-level directory under POSTS AND MACHINES contains the machine name.
   *
   * @param filePath - Full path to the .cyc file
   * @returns Machine name or null
   */
  private static extractMachineFromPath(filePath: string): string | null {
    // Normalize path separators
    const normalized = filePath.replace(/\\/g, "/");
    const cyclesRoot = CYCLES_DIR.replace(/\\/g, "/");

    if (!normalized.startsWith(cyclesRoot)) return null;

    const relative = normalized.slice(cyclesRoot.length + 1);
    const firstDir = relative.split("/")[0];
    if (!firstDir) return null;

    // The folder name is like "Haas_VF-2__H-VF_R12c_E19" — extract before "__"
    const machinePartBeforeDouble = firstDir.split("__")[0];
    // Replace underscores with spaces for readability
    return machinePartBeforeDouble.replace(/_/g, " ");
  }

  // ==========================================================================
  // PRIVATE — MCFG scanning
  // ==========================================================================

  /**
   * Scans the MachineCfg directory for .mcfg files and extracts metadata.
   * @param dirPath - Absolute path to MachineCfg directory
   * @returns Array of MachineConfigEntry
   */
  private static async scanMachineConfigs(
    dirPath: string
  ): Promise<MachineConfigEntry[]> {
    if (!(await CpsParserEngine.dirExists(dirPath))) {
      return [];
    }

    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      return [];
    }

    const mcfgFiles = entries.filter((f) =>
      f.toLowerCase().endsWith(".mcfg")
    );

    const results: MachineConfigEntry[] = [];
    const batchResults = await Promise.all(
      mcfgFiles.map((f) =>
        CpsParserEngine.parseMcfgFile(path.join(dirPath, f))
      )
    );
    for (const r of batchResults) {
      if (r) results.push(r);
    }

    return results;
  }

  /**
   * Parses a single .mcfg file (JSON) and extracts machine definition metadata.
   * @param filePath - Absolute path to the .mcfg file
   * @returns MachineConfigEntry or null if file could not be parsed
   */
  private static async parseMcfgFile(
    filePath: string
  ): Promise<MachineConfigEntry | null> {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      return null;
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }

    const machineDef = json.MachineDefinition as
      | Record<string, unknown>
      | undefined;
    if (!machineDef) return null;

    const header = machineDef.Header as Record<string, unknown> | undefined;
    const displayName = (header?.DisplayName as string) ?? path.basename(filePath, ".mcfg");
    const version = (header?.Version as number) ?? null;
    const guid = (header?.GUID as string) ?? null;

    // Extract axes recursively from MachinePartGroups
    const partGroups = machineDef.MachinePartGroups as
      | Array<Record<string, unknown>>
      | undefined;
    const axes: string[] = [];
    if (partGroups) {
      for (const group of partGroups) {
        CpsParserEngine.extractAxes(
          group.Axis as Record<string, unknown> | undefined,
          axes
        );
      }
    }

    const machineType = CpsParserEngine.inferMachineType(axes, displayName);

    return {
      filename: path.basename(filePath),
      displayName,
      version,
      guid,
      axes,
      machineType,
    };
  }

  /**
   * Recursively extracts axis names from nested MCFG axis definitions.
   * MCFG files nest axes: { Name: "Z", Axis: { Name: "Y", Axis: { Name: "X" } } }
   *
   * @param axisObj - Current axis object node
   * @param axes - Accumulator array for axis names
   */
  private static extractAxes(
    axisObj: Record<string, unknown> | undefined,
    axes: string[]
  ): void {
    if (!axisObj) return;

    const name = axisObj.Name as string | undefined;
    if (name && !axes.includes(name)) {
      axes.push(name);
    }

    // Recurse into nested axis
    const child = axisObj.Axis as Record<string, unknown> | undefined;
    if (child) {
      CpsParserEngine.extractAxes(child, axes);
    }
  }

  /**
   * Infers machine type from its axis configuration and display name.
   *
   * - 5+ axes (including A/B/C rotaries) → "5-axis"
   * - 4 axes (one rotary) → "4-axis"
   * - 3 linear axes → "3-axis"
   * - Name contains "lathe" or "turn" → "lathe"
   * - Name contains "mill-turn" → "mill-turn"
   *
   * @param axes - Array of axis names (e.g., ["X", "Y", "Z", "B", "C"])
   * @param displayName - Machine display name
   * @returns Inferred machine type string or null
   */
  private static inferMachineType(
    axes: string[],
    displayName: string
  ): string | null {
    const nameLower = displayName.toLowerCase();
    if (nameLower.includes("mill-turn") || nameLower.includes("millturn")) {
      return "mill-turn";
    }
    if (nameLower.includes("lathe") || nameLower.includes("turn")) {
      return "lathe";
    }

    const rotaryAxes = axes.filter((a) => ["A", "B", "C"].includes(a));
    const linearAxes = axes.filter((a) => ["X", "Y", "Z"].includes(a));

    if (rotaryAxes.length >= 2 && linearAxes.length >= 3) return "5-axis";
    if (rotaryAxes.length === 1 && linearAxes.length >= 3) return "4-axis";
    if (linearAxes.length >= 3) return "3-axis";

    return null;
  }

  // ==========================================================================
  // PRIVATE — Utilities
  // ==========================================================================

  /**
   * Checks whether a directory exists.
   * @param dirPath - Absolute path
   * @returns true if path exists and is a directory
   */
  private static async dirExists(dirPath: string): Promise<boolean> {
    try {
      const s = await stat(dirPath);
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Recursively finds all files with a given extension in a directory tree.
   * @param dirPath - Root directory
   * @param ext - File extension including dot (e.g., ".cyc")
   * @returns Array of absolute file paths
   */
  private static async findFilesRecursive(
    dirPath: string,
    ext: string
  ): Promise<string[]> {
    const results: string[] = [];
    const stack: string[] = [dirPath];

    while (stack.length > 0) {
      const current = stack.pop()!;
      let entries: string[];
      try {
        entries = await readdir(current);
      } catch {
        continue;
      }

      // Process entries: batch stat calls for performance
      const fullPaths = entries.map((e) => path.join(current, e));
      const statResults = await Promise.all(
        fullPaths.map(async (fp) => {
          try {
            const s = await stat(fp);
            return { fp, isDir: s.isDirectory(), isFile: s.isFile() };
          } catch {
            return { fp, isDir: false, isFile: false };
          }
        })
      );

      for (const { fp, isDir, isFile } of statResults) {
        if (isDir) {
          stack.push(fp);
        } else if (isFile && fp.toLowerCase().endsWith(ext)) {
          results.push(fp);
        }
      }
    }

    return results;
  }
}
