/**
 * NCPatternMinerEngine — NC Pattern Mining for JM Die .MIN Lathe Programs
 *
 * Extracts cutting conditions, tool usage, spindle data, and machining patterns
 * from Okuma OSP G-code (.MIN) files found in the JM Die CNC LATHE archive.
 *
 * Key domain knowledge (from 140-agent audit):
 * - G85/G87 roughing-finishing pairs (97% of programs, NOT Fanuc G71/G70)
 * - G85 = roughing cycle with NTURN label, params: D (depth), U (radial stock), W (axial stock), F (feed)
 * - G87 = back-boring/finishing cycle referencing NTURN label
 * - G81 = drilling cycles
 * - G76 = threading
 * - Tool format: TxxxxLLHH (T010101 = tool 1, offset 01, wear 01)
 * - G96 S### = constant surface speed (CSS) mode
 * - G97 S### = RPM mode
 * - G50 S### = max spindle speed clamp
 * - Comments in parens describe operations: (OD RGH. TURN .032R)
 * - First line: $FILENAME.MIN% (header, no metadata)
 * - Customer inferred from first subfolder after CNC LATHE/ in path
 *
 * @module NCPatternMinerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Parsed tool extracted from a .MIN program. */
export interface ParsedTool {
  /** Tool number (first 2 digits of Txxxxxx, e.g. T010101 -> 1) */
  toolNumber: number;
  /** Raw T-code string as found in program (e.g. "T010101") */
  rawCode: string;
  /** Description extracted from comment on or near the tool line */
  description: string;
  /** Inferred operation type based on comment keywords and G-codes */
  operationType: "rough" | "finish" | "drill" | "thread" | "bore" | "cutoff" | "unknown";
}

/** A parsed machining operation from a .MIN program. */
export interface ParsedOp {
  /** G-code type that defines this operation */
  type: string;
  /** Tool number active during this operation */
  toolNumber: number;
  /** Feed rate (F value) if present, in IPR */
  feedRate: number | null;
  /** Spindle mode: "css" for G96, "rpm" for G97, null if not set */
  spindleMode: "css" | "rpm" | null;
  /** Spindle speed value (S word) */
  spindleSpeed: number | null;
  /** Max RPM clamp from G50 S### */
  maxRpm: number | null;
  /** Depth of cut from G85 D parameter */
  depthOfCut: number | null;
  /** Radial finish stock from G85 U parameter */
  finishStockRadial: number | null;
  /** Axial finish stock from G85 W parameter */
  finishStockAxial: number | null;
}

/** Spindle data aggregated from a single program. */
export interface SpindleData {
  /** Whether CSS mode (G96) was used anywhere in the program */
  cssMode: boolean;
  /** CSS surface speed values found (from G96 S###) */
  cssSpeeds: number[];
  /** RPM values found (from G97 S###) */
  rpmSpeeds: number[];
  /** Max spindle speed clamp values found (from G50 S###) */
  maxClamps: number[];
}

/** Result of parsing a single .MIN program. */
export interface ProgramParseResult {
  /** File path that was parsed */
  filePath: string;
  /** Tools found in the program */
  tools: ParsedTool[];
  /** Operations extracted from the program */
  operations: ParsedOp[];
  /** Spindle data summary */
  spindleData: SpindleData;
  /** Customer name inferred from folder path */
  customer: string;
  /** Machine type inferred from folder path */
  machine: string;
  /** Total line count */
  lineCount: number;
  /** Program header (first line) */
  header: string;
}

/** Aggregate patterns mined from a directory scan. */
export interface AggregatePatterns {
  /** Frequency count of each G-code encountered */
  gCodeFrequency: Map<string, number>;
  /** Feed rate statistics across all programs */
  feedRanges: { min: number; max: number; median: number; values: number[] };
  /** Spindle speed statistics across all programs */
  spindleRanges: { min: number; max: number; median: number; values: number[] };
  /** How many times each tool number was used */
  toolUsage: Map<number, number>;
  /** Breakdown of operation types found */
  operationBreakdown: Map<string, number>;
  /** Most common tool descriptions */
  toolDescriptions: Map<string, number>;
}

/** Result of scanning a directory of .MIN files. */
export interface DirectoryScanResult {
  /** Total .MIN files found */
  totalFiles: number;
  /** Successfully parsed count */
  parsed: number;
  /** Failed to parse count */
  failed: number;
  /** List of files that failed to parse with error messages */
  failures: Array<{ file: string; error: string }>;
  /** Aggregate patterns mined from all parsed programs */
  patterns: AggregatePatterns;
  /** Per-customer breakdown */
  customerBreakdown: Map<string, number>;
}

/** A frequent machining pattern mined from the archive. */
export interface MiningPattern {
  /** Human-readable pattern description */
  description: string;
  /** How many programs exhibited this pattern */
  frequency: number;
  /** Percentage of parsed programs with this pattern */
  percentOfTotal: number;
  /** Category of the pattern */
  category: "cycle" | "tool" | "speed" | "feed" | "operation";
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/** Tool change: T followed by 6+ digits. First 2 digits = tool number. */
const RE_TOOL_CHANGE = /^[NT]?(?:AT)?\s*T(\d{2})(\d{2})(\d{2})\b/;

/** G85 roughing cycle with optional parameters D, U, W, F */
const RE_G85 = /G85\s+(\w+)\s*(.*)/;

/** G87 finishing cycle referencing a label */
const RE_G87 = /G87\s+(\w+)/;

/** G96 constant surface speed */
const RE_G96 = /G96\s+S([\d.]+)/;

/** G97 RPM mode */
const RE_G97 = /G97\s+S([\d.]+)/;

/** G50 max spindle speed clamp */
const RE_G50 = /G50\s+S([\d.]+)/;

/** G76 threading */
const RE_G76 = /G76\s+(.*)/;

/** G81 drilling */
const RE_G81_STANDALONE = /^G81\b/;

/** G74 peck drilling */
const RE_G74 = /G74\s+(.*)/;

/** Feed rate on any line */
const RE_FEED = /F([\d.]+)/;

/** S-word on any line (spindle speed) */
const RE_S_WORD = /S([\d.]+)/;

/** Comment in parentheses */
const RE_COMMENT = /\(([^)]+)\)/;

/** Generic G-code extractor */
const RE_GCODE = /G(\d{1,3})/g;

/** Tool line: starts with T or NAT followed by Txxxxxx */
const RE_TOOL_LINE = /T(\d{6,})/;

// ============================================================================
// OPERATION TYPE INFERENCE
// ============================================================================

/**
 * Infers operation type from a comment string using JM Die naming conventions.
 *
 * JM Die comment patterns (from audit):
 * - "OD RGH. TURN .032R" -> rough
 * - "OD FIN. TURN .032R" -> finish
 * - "CENTER DRILL" -> drill
 * - "DRILL.828 DIA." -> drill
 * - "ROUGH ID. .866 DIA." -> bore (roughing bore)
 * - "FINISH ID. .866 DIA." -> bore (finishing bore)
 * - "CARBIDE BORING BAR" -> bore
 * - "CUT OFF" or "CUTOFF" -> cutoff
 * - "THREAD" -> thread
 *
 * @param comment - Text extracted from parenthesized comment
 * @returns Inferred operation type
 */
function inferOperationType(comment: string): ParsedTool["operationType"] {
  const upper = comment.toUpperCase();

  if (/CUT\s*OFF/.test(upper)) return "cutoff";
  if (/THREAD/.test(upper)) return "thread";
  if (/DRILL/.test(upper) || /CENTER\s*DRILL/.test(upper)) return "drill";
  if (/BOR(?:E|ING)/.test(upper) || /\bID\b/.test(upper)) return "bore";
  if (/RGH|ROUGH/.test(upper)) return "rough";
  if (/FIN(?:ISH)?\.?\s/.test(upper) || /\bFIN\b/.test(upper)) return "finish";

  return "unknown";
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts customer name from a file path.
 * Convention: first subfolder after "CNC LATHE/" (or "CNC LATHE\\") in the path.
 * Falls back to "UNKNOWN" if the pattern is not found.
 *
 * @param filePath - Absolute path to the .MIN file
 * @returns Customer name string
 */
function extractCustomer(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/CNC\s*LATHE\/([^/]+)/i);
  if (match) {
    const candidate = match[1];
    // If the match is a .MIN file (files in root of CNC LATHE/), return UNKNOWN
    if (candidate.toUpperCase().endsWith(".MIN") || candidate.toUpperCase().endsWith(".MCX-8")) {
      return "UNKNOWN";
    }
    return candidate.toUpperCase();
  }
  return "UNKNOWN";
}

/**
 * Extracts machine type from a file path.
 * Convention: the parent directory type (CNC LATHE, CNC MILL, WIRE EDM, etc.)
 *
 * @param filePath - Absolute path to the .MIN file
 * @returns Machine type string
 */
function extractMachine(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").toUpperCase();
  if (normalized.includes("CNC LATHE")) return "CNC LATHE";
  if (normalized.includes("CNC MILL")) return "CNC MILL";
  if (normalized.includes("WIRE EDM")) return "WIRE EDM";
  if (normalized.includes("SINKER EDM")) return "SINKER EDM";
  return "UNKNOWN";
}

/**
 * Extracts G85 cycle parameters from the remainder of a G85 line.
 * Pattern: G85 NTURN D.1 U.010 W.005 F.01
 *
 * @param paramStr - Text after "G85 LABEL" on the line
 * @returns Object with depth, radial stock, axial stock, feed rate
 */
function parseG85Params(paramStr: string): {
  depth: number | null;
  radialStock: number | null;
  axialStock: number | null;
  feedRate: number | null;
} {
  const dMatch = paramStr.match(/D([\d.]+)/);
  const uMatch = paramStr.match(/U([\d.]+)/);
  const wMatch = paramStr.match(/W([\d.]+)/);
  const fMatch = paramStr.match(/F([\d.]+)/);

  return {
    depth: dMatch ? parseFloat(dMatch[1]) : null,
    radialStock: uMatch ? parseFloat(uMatch[1]) : null,
    axialStock: wMatch ? parseFloat(wMatch[1]) : null,
    feedRate: fMatch ? parseFloat(fMatch[1]) : null,
  };
}

/**
 * Computes the median of a numeric array.
 *
 * @param values - Array of numbers
 * @returns Median value, or 0 if array is empty
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * NCPatternMinerEngine - Mines cutting conditions and machining patterns
 * from JM Die .MIN (Okuma OSP) lathe programs.
 *
 * Designed for the 15,251 .MIN files in H:/PRISM/JM DIE/CNC LATHE/,
 * organized by customer subfolder.
 */
export class NCPatternMinerEngine {
  // ==========================================================================
  // parseProgram
  // ==========================================================================

  /**
   * Parses a single .MIN program and extracts tools, operations, and spindle data.
   *
   * @param content - Raw text content of the .MIN file
   * @param filePath - Absolute path to the file (used for customer/machine inference)
   * @returns Structured parse result with tools, operations, spindle data
   */
  static parseProgram(content: string, filePath: string): ProgramParseResult {
    const lines = content.split(/\r?\n/);
    const tools: ParsedTool[] = [];
    const operations: ParsedOp[] = [];
    const spindleData: SpindleData = {
      cssMode: false,
      cssSpeeds: [],
      rpmSpeeds: [],
      maxClamps: [],
    };

    const customer = extractCustomer(filePath);
    const machine = extractMachine(filePath);
    const header = lines.length > 0 ? lines[0].trim() : "";

    let currentToolNumber = 0;
    let currentSpindleMode: "css" | "rpm" | null = null;
    let currentSpindleSpeed: number | null = null;
    let currentMaxRpm: number | null = null;
    let pendingComment = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // --- Extract comment from this line ---
      const commentMatch = line.match(RE_COMMENT);
      const lineComment = commentMatch ? commentMatch[1].trim() : "";

      // --- Tool change detection ---
      const toolMatch = line.match(RE_TOOL_LINE);
      if (toolMatch) {
        const rawDigits = toolMatch[1];
        const toolNum = parseInt(rawDigits.substring(0, 2), 10);
        const rawCode = `T${rawDigits}`;

        // JM Die convention: NAT line comment is the primary operation description,
        // T line comment is supplementary (often tool geometry info).
        // Priority: pendingComment (NAT line) > prev line comment > T line comment > next line comment
        let description = "";

        // 1. Pending comment from preceding NAT line (highest priority)
        if (pendingComment) {
          description = pendingComment;
        }
        // 2. Previous line comment (if prev line is a NAT line)
        if (!description && i > 0) {
          const prevLine = lines[i - 1].trim();
          const prevComment = prevLine.match(RE_COMMENT);
          if (prevComment) description = prevComment[1].trim();
        }
        // 3. Comment on the T line itself
        if (!description) {
          description = lineComment;
        }
        // 4. Next line comment as last resort
        if (!description && i < lines.length - 1) {
          const nextComment = lines[i + 1].match(RE_COMMENT);
          if (nextComment) description = nextComment[1].trim();
        }

        const operationType = description
          ? inferOperationType(description)
          : "unknown";

        tools.push({ toolNumber: toolNum, rawCode, description, operationType });
        currentToolNumber = toolNum;
        pendingComment = "";
        continue;
      }

      // --- NAT line with comment (tool description often precedes T line) ---
      if (/^NAT\d+/.test(line) || /^N[A-Z]+\d*\s/.test(line)) {
        if (lineComment) {
          pendingComment = lineComment;
        }
      }

      // --- G50 max spindle speed clamp ---
      const g50Match = line.match(RE_G50);
      if (g50Match) {
        const maxSpd = parseFloat(g50Match[1]);
        currentMaxRpm = maxSpd;
        spindleData.maxClamps.push(maxSpd);
        operations.push({
          type: "G50",
          toolNumber: currentToolNumber,
          feedRate: null,
          spindleMode: currentSpindleMode,
          spindleSpeed: null,
          maxRpm: maxSpd,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G96 CSS mode ---
      const g96Match = line.match(RE_G96);
      if (g96Match) {
        const speed = parseFloat(g96Match[1]);
        currentSpindleMode = "css";
        currentSpindleSpeed = speed;
        spindleData.cssMode = true;
        spindleData.cssSpeeds.push(speed);
        operations.push({
          type: "G96",
          toolNumber: currentToolNumber,
          feedRate: null,
          spindleMode: "css",
          spindleSpeed: speed,
          maxRpm: currentMaxRpm,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G97 RPM mode ---
      const g97Match = line.match(RE_G97);
      if (g97Match) {
        const speed = parseFloat(g97Match[1]);
        currentSpindleMode = "rpm";
        currentSpindleSpeed = speed;
        spindleData.rpmSpeeds.push(speed);
        operations.push({
          type: "G97",
          toolNumber: currentToolNumber,
          feedRate: null,
          spindleMode: "rpm",
          spindleSpeed: speed,
          maxRpm: currentMaxRpm,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G85 roughing cycle ---
      const g85Match = line.match(RE_G85);
      if (g85Match) {
        const paramStr = g85Match[2] || "";
        const params = parseG85Params(paramStr);
        operations.push({
          type: "G85",
          toolNumber: currentToolNumber,
          feedRate: params.feedRate,
          spindleMode: currentSpindleMode,
          spindleSpeed: currentSpindleSpeed,
          maxRpm: currentMaxRpm,
          depthOfCut: params.depth,
          finishStockRadial: params.radialStock,
          finishStockAxial: params.axialStock,
        });
      }

      // --- G87 finishing cycle ---
      const g87Match = line.match(RE_G87);
      if (g87Match) {
        // G87 references a label defined by G85; extract feed from nearby lines
        let feedRate: number | null = null;
        // Look ahead for F word
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const fMatch = lines[j].match(RE_FEED);
          if (fMatch) {
            feedRate = parseFloat(fMatch[1]);
            break;
          }
        }
        operations.push({
          type: "G87",
          toolNumber: currentToolNumber,
          feedRate,
          spindleMode: currentSpindleMode,
          spindleSpeed: currentSpindleSpeed,
          maxRpm: currentMaxRpm,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G76 threading ---
      const g76Match = line.match(RE_G76);
      if (g76Match) {
        const paramStr = g76Match[1];
        const fMatch = paramStr.match(RE_FEED);
        operations.push({
          type: "G76",
          toolNumber: currentToolNumber,
          feedRate: fMatch ? parseFloat(fMatch[1]) : null,
          spindleMode: currentSpindleMode,
          spindleSpeed: currentSpindleSpeed,
          maxRpm: currentMaxRpm,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G74 peck drilling ---
      const g74Match = line.match(RE_G74);
      if (g74Match) {
        const paramStr = g74Match[1];
        const fMatch = paramStr.match(RE_FEED);
        operations.push({
          type: "G74",
          toolNumber: currentToolNumber,
          feedRate: fMatch ? parseFloat(fMatch[1]) : null,
          spindleMode: currentSpindleMode,
          spindleSpeed: currentSpindleSpeed,
          maxRpm: currentMaxRpm,
          depthOfCut: null,
          finishStockRadial: null,
          finishStockAxial: null,
        });
      }

      // --- G1 feed moves (extract feed rate) ---
      if (/^G1\b/.test(line) || /^G01\b/.test(line)) {
        const fMatch = line.match(RE_FEED);
        if (fMatch) {
          operations.push({
            type: "G1",
            toolNumber: currentToolNumber,
            feedRate: parseFloat(fMatch[1]),
            spindleMode: currentSpindleMode,
            spindleSpeed: currentSpindleSpeed,
            maxRpm: currentMaxRpm,
            depthOfCut: null,
            finishStockRadial: null,
            finishStockAxial: null,
          });
        }
      }
    }

    return {
      filePath,
      tools,
      operations,
      spindleData,
      customer,
      machine,
      lineCount: lines.length,
      header,
    };
  }

  // ==========================================================================
  // scanDirectory
  // ==========================================================================

  /**
   * Scans a directory for .MIN files and aggregates machining patterns.
   *
   * @param dirPath - Directory to scan (e.g. "H:/PRISM/JM DIE/CNC LATHE/")
   * @param maxFiles - Maximum number of files to process (default: all)
   * @returns Aggregated pattern data from all parsed programs
   */
  static async scanDirectory(
    dirPath: string,
    maxFiles?: number
  ): Promise<DirectoryScanResult> {
    const { readdir, readFile, stat } = await import("fs/promises");
    const { join } = await import("path");

    const patterns: AggregatePatterns = {
      gCodeFrequency: new Map(),
      feedRanges: { min: Infinity, max: -Infinity, median: 0, values: [] },
      spindleRanges: { min: Infinity, max: -Infinity, median: 0, values: [] },
      toolUsage: new Map(),
      operationBreakdown: new Map(),
      toolDescriptions: new Map(),
    };

    const customerBreakdown = new Map<string, number>();
    const failures: Array<{ file: string; error: string }> = [];
    let totalFiles = 0;
    let parsed = 0;

    // Recursively collect .MIN files
    const minFiles: string[] = [];

    async function collectFiles(dir: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        log.warn(`NCPatternMiner: Cannot read directory ${dir}: ${(err as Error).message}`);
        return;
      }
      for (const entry of entries) {
        if (maxFiles !== undefined && minFiles.length >= maxFiles) return;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await collectFiles(fullPath);
        } else if (entry.name.toUpperCase().endsWith(".MIN")) {
          minFiles.push(fullPath);
        }
      }
    }

    await collectFiles(dirPath);
    totalFiles = minFiles.length;

    if (maxFiles !== undefined) {
      minFiles.splice(maxFiles);
    }

    log.info(`NCPatternMiner: Found ${totalFiles} .MIN files, processing ${minFiles.length}`);

    // Parse each file
    for (const filePath of minFiles) {
      try {
        const content = await readFile(filePath, "utf-8");
        const result = NCPatternMinerEngine.parseProgram(content, filePath);

        // Aggregate G-code frequency
        for (const op of result.operations) {
          const count = patterns.gCodeFrequency.get(op.type) || 0;
          patterns.gCodeFrequency.set(op.type, count + 1);
        }

        // Aggregate feed rates
        for (const op of result.operations) {
          if (op.feedRate !== null && op.feedRate > 0) {
            patterns.feedRanges.values.push(op.feedRate);
            if (op.feedRate < patterns.feedRanges.min) patterns.feedRanges.min = op.feedRate;
            if (op.feedRate > patterns.feedRanges.max) patterns.feedRanges.max = op.feedRate;
          }
        }

        // Aggregate spindle speeds
        for (const speed of result.spindleData.cssSpeeds) {
          patterns.spindleRanges.values.push(speed);
          if (speed < patterns.spindleRanges.min) patterns.spindleRanges.min = speed;
          if (speed > patterns.spindleRanges.max) patterns.spindleRanges.max = speed;
        }
        for (const speed of result.spindleData.rpmSpeeds) {
          patterns.spindleRanges.values.push(speed);
          if (speed < patterns.spindleRanges.min) patterns.spindleRanges.min = speed;
          if (speed > patterns.spindleRanges.max) patterns.spindleRanges.max = speed;
        }

        // Aggregate tool usage
        for (const tool of result.tools) {
          const count = patterns.toolUsage.get(tool.toolNumber) || 0;
          patterns.toolUsage.set(tool.toolNumber, count + 1);
          if (tool.description) {
            const descCount = patterns.toolDescriptions.get(tool.description) || 0;
            patterns.toolDescriptions.set(tool.description, descCount + 1);
          }
        }

        // Aggregate operation types
        for (const tool of result.tools) {
          const count = patterns.operationBreakdown.get(tool.operationType) || 0;
          patterns.operationBreakdown.set(tool.operationType, count + 1);
        }

        // Customer breakdown
        const custCount = customerBreakdown.get(result.customer) || 0;
        customerBreakdown.set(result.customer, custCount + 1);

        parsed++;
      } catch (err) {
        failures.push({ file: filePath, error: (err as Error).message });
      }
    }

    // Compute medians
    patterns.feedRanges.median = median(patterns.feedRanges.values);
    patterns.spindleRanges.median = median(patterns.spindleRanges.values);

    // Fix Infinity for empty ranges
    if (patterns.feedRanges.min === Infinity) patterns.feedRanges.min = 0;
    if (patterns.feedRanges.max === -Infinity) patterns.feedRanges.max = 0;
    if (patterns.spindleRanges.min === Infinity) patterns.spindleRanges.min = 0;
    if (patterns.spindleRanges.max === -Infinity) patterns.spindleRanges.max = 0;

    log.info(`NCPatternMiner: Parsed ${parsed}/${totalFiles}, ${failures.length} failures`);

    return {
      totalFiles,
      parsed,
      failed: failures.length,
      failures,
      patterns,
      customerBreakdown,
    };
  }

  // ==========================================================================
  // mineCustomerPatterns
  // ==========================================================================

  /**
   * Mines machining patterns for a specific customer subfolder.
   *
   * @param customer - Customer folder name (e.g. "ACME", "FONTANA")
   * @param basePath - Base CNC LATHE directory (default: H:/PRISM/JM DIE/CNC LATHE)
   * @returns Directory scan result scoped to the customer
   */
  static async mineCustomerPatterns(
    customer: string,
    basePath: string = "H:/PRISM/JM DIE/CNC LATHE"
  ): Promise<DirectoryScanResult> {
    const { join } = await import("path");
    const customerDir = join(basePath, customer);
    log.info(`NCPatternMiner: Mining patterns for customer "${customer}" at ${customerDir}`);
    return NCPatternMinerEngine.scanDirectory(customerDir);
  }

  // ==========================================================================
  // getTopPatterns
  // ==========================================================================

  /**
   * Scans the full JM Die CNC LATHE archive and returns the most frequent
   * machining patterns, ranked by occurrence.
   *
   * @param limit - Maximum number of patterns to return (default: 20)
   * @param basePath - Base CNC LATHE directory (default: H:/PRISM/JM DIE/CNC LATHE)
   * @param maxFiles - Maximum files to scan (default: 500 for performance)
   * @returns Ranked list of the most common machining patterns
   */
  static async getTopPatterns(
    limit: number = 20,
    basePath: string = "H:/PRISM/JM DIE/CNC LATHE",
    maxFiles: number = 500
  ): Promise<MiningPattern[]> {
    const scan = await NCPatternMinerEngine.scanDirectory(basePath, maxFiles);
    const total = scan.parsed;
    const patterns: MiningPattern[] = [];

    // G-code frequency patterns
    const sortedGCodes = Array.from(scan.patterns.gCodeFrequency.entries())
      .sort((a, b) => b[1] - a[1]);
    for (const [code, freq] of sortedGCodes) {
      patterns.push({
        description: `G-code ${code} used ${freq} times`,
        frequency: freq,
        percentOfTotal: total > 0 ? (freq / total) * 100 : 0,
        category: "cycle",
      });
    }

    // Tool usage patterns
    const sortedTools = Array.from(scan.patterns.toolUsage.entries())
      .sort((a, b) => b[1] - a[1]);
    for (const [toolNum, freq] of sortedTools) {
      patterns.push({
        description: `Tool #${toolNum} used ${freq} times`,
        frequency: freq,
        percentOfTotal: total > 0 ? (freq / total) * 100 : 0,
        category: "tool",
      });
    }

    // Operation type patterns
    const sortedOps = Array.from(scan.patterns.operationBreakdown.entries())
      .sort((a, b) => b[1] - a[1]);
    for (const [opType, freq] of sortedOps) {
      patterns.push({
        description: `Operation type "${opType}" found ${freq} times`,
        frequency: freq,
        percentOfTotal: total > 0 ? (freq / total) * 100 : 0,
        category: "operation",
      });
    }

    // Feed rate pattern
    if (scan.patterns.feedRanges.values.length > 0) {
      patterns.push({
        description: `Feed rates: min=${scan.patterns.feedRanges.min}, max=${scan.patterns.feedRanges.max}, median=${scan.patterns.feedRanges.median}`,
        frequency: scan.patterns.feedRanges.values.length,
        percentOfTotal: 100,
        category: "feed",
      });
    }

    // Spindle speed pattern
    if (scan.patterns.spindleRanges.values.length > 0) {
      patterns.push({
        description: `Spindle speeds: min=${scan.patterns.spindleRanges.min}, max=${scan.patterns.spindleRanges.max}, median=${scan.patterns.spindleRanges.median}`,
        frequency: scan.patterns.spindleRanges.values.length,
        percentOfTotal: 100,
        category: "speed",
      });
    }

    // Sort all patterns by frequency descending, return top N
    patterns.sort((a, b) => b.frequency - a.frequency);
    return patterns.slice(0, limit);
  }
}

/** Singleton instance for lazy import pattern. */
export const ncPatternMinerEngine = new NCPatternMinerEngine();
