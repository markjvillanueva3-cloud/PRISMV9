/**
 * MacroConversionAnalyzerEngine — RES-MS26: Macro Conversion Analysis
 *
 * Identifies which .MIN programs in the JM Die CNC LATHE archive can be collapsed
 * into parametric macros. Works by:
 *
 * 1. Reading existing macro examples (CASING_MACRO.MIN, CBORE_CASING_MACRO.MIN)
 *    to understand Okuma variable patterns (V1, V2, IF/GOTO logic).
 * 2. Sampling .MIN programs from the archive (first N customers, up to M programs each).
 * 3. Extracting a "fingerprint" for each program — the sequence of G-codes and M-codes
 *    with numeric values stripped. Programs with identical fingerprints are candidates
 *    for macro conversion (same structure, different dimensions).
 * 4. Grouping programs by fingerprint similarity and ranking by group size.
 * 5. For each candidate group, identifying which numeric values vary between programs.
 *
 * Key Okuma domain knowledge (from 140-agent audit):
 * - G85/G87 roughing-finishing pairs (97% of programs)
 * - Tool format: TxxxxLLHH (T010101 = tool 1, offset 01, wear 01)
 * - G96 S### = CSS mode, G97 S### = RPM mode, G50 S### = max clamp
 * - Varying params: X (diameters), Z (lengths), F (feed), S (speed)
 * - Macro variables: V1..V200 with arithmetic expressions in brackets
 * - Macro logic: IF/GOTO, conditional blocks
 *
 * @module MacroConversionAnalyzerEngine
 */

import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Fingerprint extracted from a single .MIN program. */
export interface ProgramFingerprint {
  /** Original filename */
  filename: string;
  /** Customer folder name (from path) */
  customer: string;
  /** G/M code sequence without numeric values — the structural signature */
  fingerprint: string;
  /** Unique G-codes used in the program */
  gCodes: string[];
  /** Unique M-codes used in the program */
  mCodes: string[];
  /** Number of tool changes (T-codes) found */
  toolCount: number;
  /** Total line count of the program */
  lineCount: number;
  /** Extracted numeric parameter values keyed by context (e.g. "X", "Z", "F", "S") */
  variableValues: Record<string, number[]>;
}

/** A group of programs with matching fingerprints — macro conversion candidates. */
export interface MacroCandidateGroup {
  /** The shared fingerprint string */
  fingerprint: string;
  /** How many programs share this fingerprint */
  programCount: number;
  /** Filenames of programs in this group */
  programs: string[];
  /** Unique customers represented */
  customers: string[];
  /** Which parameter categories vary between programs (e.g. "X", "Z", "F", "S") */
  varyingParams: string[];
  /** Human-readable savings estimate */
  estimatedSavings: string;
}

/** Full result of the macro conversion analysis. */
export interface MacroConversionResult {
  /** Total programs analyzed */
  totalAnalyzed: number;
  /** Number of unique fingerprints found */
  uniqueFingerprints: number;
  /** All candidate groups with 2+ programs */
  candidateGroups: MacroCandidateGroup[];
  /** Top 20 candidate groups sorted by program count */
  topCandidates: MacroCandidateGroup[];
  /** Names of existing macro files found */
  existingMacros: string[];
  /** Ratio of unique fingerprints to total programs (lower = more compressible) */
  compressionRatio: number;
  /** ISO timestamp of analysis */
  timestamp: string;
}

/** Summary returned by audit(). */
export interface MacroConversionAuditSummary {
  /** Total programs scanned */
  totalAnalyzed: number;
  /** Unique structural patterns found */
  uniqueFingerprints: number;
  /** Compression ratio (unique / total) */
  compressionRatio: number;
  /** How many groups have 10+ matching programs */
  groupsWith10Plus: number;
  /** Top 5 candidate groups (name, count, customers) */
  topFive: Array<{ fingerprint: string; count: number; customers: number }>;
  /** Number of existing macros found */
  existingMacroCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Root of the JM Die CNC Lathe archive. */
const JM_DIE_CNC_LATHE = "H:/PRISM/JM DIE/CNC LATHE";

/** Directory containing existing macro program examples. */
const MACRO_PROGRAMS_DIR = "H:/prism/resources/MACRO PROGRAMS";

/** Default number of customer folders to scan. */
const DEFAULT_CUSTOMER_LIMIT = 10;

/** Default max programs per customer folder. */
const DEFAULT_PROGRAMS_PER_CUSTOMER = 50;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/** Matches G-codes: G0, G1, G85, G87, G96, etc. */
const RE_GCODE = /G(\d{1,3})/g;

/** Matches M-codes: M1, M3, M8, M30, etc. */
const RE_MCODE = /M(\d{1,3})/g;

/** Matches tool changes: T followed by 6+ digits. */
const RE_TOOL = /T(\d{6,})/;

/** Matches X-axis values (diameters). */
const RE_X_VALUE = /X(-?[\d.]+)/g;

/** Matches Z-axis values (lengths). */
const RE_Z_VALUE = /Z(-?[\d.]+)/g;

/** Matches feed rate values. */
const RE_F_VALUE = /F([\d.]+)/g;

/** Matches spindle speed values. */
const RE_S_VALUE = /(?:^|\s)S([\d.]+)/g;

/** Matches D parameter in G85 (depth of cut). */
const RE_D_VALUE = /D([\d.]+)/g;

/** Matches comments in parentheses. */
const RE_COMMENT = /\([^)]*\)/g;

/** Matches Okuma macro variables: V1, V2, V100, etc. */
const RE_MACRO_VAR = /V(\d+)/g;

/** Matches IF/GOTO macro control flow. */
const RE_MACRO_FLOW = /\b(IF|GOTO|EQ|NE|GT|LT|GE|LE)\b/g;

/** Lines that are purely comments or blank. */
const RE_COMMENT_ONLY_LINE = /^\s*\(.*\)\s*$/;

/** Lines that are labels: NAT01, NTURN, NBORE, N1, N9000, etc. */
const RE_LABEL_LINE = /^(NAT?\w+)\s*$/;

/** Header line pattern: $FILENAME.MIN% or O#### (Fanuc/Okuma program number). */
const RE_HEADER_LINE = /^\$.*%$|^O\d+$/;

/** Bar feeder / machine setup lines that vary per machine, not per part geometry. */
const RE_SETUP_LINE = /^(NBAR|CLEAR|DEF\s|PS\s|END|DRAW|\/CALL)\b/;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts customer name from a file path.
 * Convention: first subfolder after "CNC LATHE/" in the path.
 *
 * @param filePath - Absolute or relative path containing CNC LATHE/customer/
 * @returns Uppercase customer name, or "UNKNOWN"
 */
function extractCustomer(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/CNC\s*LATHE\/([^/]+)/i);
  if (match) {
    const candidate = match[1];
    if (candidate.toUpperCase().endsWith(".MIN") || candidate.toUpperCase().endsWith(".MCX-8")) {
      return "UNKNOWN";
    }
    return candidate.toUpperCase();
  }
  return "UNKNOWN";
}

/**
 * Strips numeric values from a G/M code sequence to produce a structural fingerprint.
 * Removes comments, replaces all numeric values with "#", and normalizes whitespace.
 *
 * Example: "G0 X1.6 Z.05 M8" -> "G0 X# Z# M8"
 *
 * @param line - Single line of G-code
 * @returns Normalized line with numbers replaced
 */
function normalizeLine(line: string): string {
  // Remove comments
  let cleaned = line.replace(RE_COMMENT, "").trim();
  if (!cleaned) return "";

  // Skip header lines ($FILENAME.MIN%, O1001)
  if (RE_HEADER_LINE.test(cleaned)) return "";

  // Skip bar feeder / machine setup lines (not part geometry)
  if (RE_SETUP_LINE.test(cleaned)) return "";

  // Skip pure label lines (NAT01, NTURN, etc.) — they just define blocks
  if (/^N[A-Z]*\d*\s*$/.test(cleaned)) return "";

  // Replace numeric values after axis letters and parameters with #
  // Handles: X1.503, Z-1.3, F.007, S600, D.1, U.010, W.005, L.062, R.032, A135, I.13
  cleaned = cleaned.replace(/([XZFSDUWLRAIEO])(-?[\d]*\.[\d]+|-?\d+\.?)/gi, "$1#");

  // Replace standalone numbers (e.g., pure coordinate values)
  // but NOT G/M/T/N code numbers (those define the structure)
  cleaned = cleaned.replace(/\bT\d+/g, "T#");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Extracts numeric parameter values from a program line, keyed by axis letter.
 *
 * @param line - Single line of G-code (comments already stripped)
 * @returns Record mapping axis letters to arrays of parsed values
 */
function extractNumericValues(line: string): Record<string, number[]> {
  const values: Record<string, number[]> = {};

  // Remove comments first
  const cleaned = line.replace(RE_COMMENT, "");

  const patterns: Array<[string, RegExp]> = [
    ["X", /X(-?[\d]*\.[\d]+|-?\d+\.?)/g],
    ["Z", /Z(-?[\d]*\.[\d]+|-?\d+\.?)/g],
    ["F", /F([\d]*\.[\d]+|\d+\.?)/g],
    ["S", /(?:^|\s)S([\d]*\.[\d]+|\d+\.?)/g],
    ["D", /D([\d]*\.[\d]+|\d+\.?)/g],
    ["U", /U([\d]*\.[\d]+|\d+\.?)/g],
    ["W", /W([\d]*\.[\d]+|\d+\.?)/g],
  ];

  for (const [key, regex] of patterns) {
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) {
        if (!values[key]) values[key] = [];
        values[key].push(val);
      }
    }
  }

  return values;
}

/**
 * Merges two variableValues records by concatenating arrays.
 */
function mergeValues(
  target: Record<string, number[]>,
  source: Record<string, number[]>
): void {
  for (const [key, vals] of Object.entries(source)) {
    if (!target[key]) target[key] = [];
    target[key].push(...vals);
  }
}

/**
 * Determines which parameter categories vary between a set of fingerprinted programs.
 * Compares the variableValues across all programs in a group.
 *
 * @param programs - Array of ProgramFingerprint in the same group
 * @returns Array of parameter keys that have different values across programs
 */
function findVaryingParams(programs: ProgramFingerprint[]): string[] {
  if (programs.length < 2) return [];

  const allKeys = new Set<string>();
  for (const p of programs) {
    for (const k of Object.keys(p.variableValues)) {
      allKeys.add(k);
    }
  }

  const varying: string[] = [];
  for (const key of allKeys) {
    // Collect a representative value set from each program for this key
    const valueSets = programs.map((p) => {
      const vals = p.variableValues[key] ?? [];
      return vals.sort((a, b) => a - b).join(",");
    });

    // If any program differs from the first, this param varies
    const first = valueSets[0];
    if (valueSets.some((v) => v !== first)) {
      varying.push(key);
    }
  }

  return varying.sort();
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * MacroConversionAnalyzerEngine — Identifies CNC programs that can be collapsed
 * into parametric macros by fingerprinting their G/M code structure.
 *
 * Static class following PRISM engine conventions.
 */
export class MacroConversionAnalyzerEngine {
  // ==========================================================================
  // getSources
  // ==========================================================================

  /**
   * Returns paths and expected counts for the data sources used by this engine.
   *
   * @returns Source metadata including archive path and macro program directory
   */
  static getSources() {
    return {
      archivePath: JM_DIE_CNC_LATHE,
      macroProgramsPath: MACRO_PROGRAMS_DIR,
      expectedCustomers: 118,
      expectedPrograms: 15599,
      existingMacros: ["CASING_MACRO.MIN", "CBORE_CASING_MACRO.MIN"],
      description:
        "JM Die CNC LATHE archive (~15,599 .MIN programs across 118 customers) " +
        "plus 2 existing parametric macros in resources/MACRO PROGRAMS/",
    };
  }

  // ==========================================================================
  // analyzeProgram
  // ==========================================================================

  /**
   * Extracts a structural fingerprint from a single .MIN program.
   * The fingerprint is the sequence of G/M codes with numeric values stripped,
   * allowing structural comparison between programs that differ only in dimensions.
   *
   * @param content - Raw text content of the .MIN file
   * @param filename - Filename (for labeling)
   * @param customerOverride - Optional customer name override (otherwise extracted from filename path)
   * @returns ProgramFingerprint with structural signature and extracted values
   */
  static analyzeProgram(
    content: string,
    filename: string,
    customerOverride?: string
  ): ProgramFingerprint {
    const lines = content.split(/\r?\n/);
    const customer = customerOverride ?? extractCustomer(filename);

    const gCodeSet = new Set<string>();
    const mCodeSet = new Set<string>();
    let toolCount = 0;
    const allValues: Record<string, number[]> = {};
    const fingerprintLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip pure comment lines
      if (RE_COMMENT_ONLY_LINE.test(line)) continue;

      // Extract G-codes
      const lineForGCodes = line.replace(RE_COMMENT, "");
      let gMatch;
      const gRegex = /G(\d{1,3})/g;
      while ((gMatch = gRegex.exec(lineForGCodes)) !== null) {
        gCodeSet.add(`G${gMatch[1]}`);
      }

      // Extract M-codes
      let mMatch;
      const mRegex = /M(\d{1,3})/g;
      while ((mMatch = mRegex.exec(lineForGCodes)) !== null) {
        mCodeSet.add(`M${mMatch[1]}`);
      }

      // Count tool changes
      if (RE_TOOL.test(lineForGCodes)) {
        toolCount++;
      }

      // Extract numeric values
      const values = extractNumericValues(line);
      mergeValues(allValues, values);

      // Build fingerprint line
      const normalized = normalizeLine(line);
      if (normalized) {
        fingerprintLines.push(normalized);
      }
    }

    // Build fingerprint: join all normalized lines
    const fingerprint = fingerprintLines.join("|");

    return {
      filename,
      customer,
      fingerprint,
      gCodes: [...gCodeSet].sort(),
      mCodes: [...mCodeSet].sort(),
      toolCount,
      lineCount: lines.length,
      variableValues: allValues,
    };
  }

  // ==========================================================================
  // findMacroCandidates
  // ==========================================================================

  /**
   * Groups an array of fingerprints by structural similarity and ranks by group size.
   * Programs with identical fingerprints are the strongest macro candidates.
   *
   * @param fingerprints - Array of ProgramFingerprint from analyzeProgram()
   * @param minGroupSize - Minimum programs in a group to be considered a candidate (default: 2)
   * @returns Array of MacroCandidateGroup sorted by programCount descending
   */
  static findMacroCandidates(
    fingerprints: ProgramFingerprint[],
    minGroupSize: number = 2
  ): MacroCandidateGroup[] {
    // Group by fingerprint
    const groups = new Map<string, ProgramFingerprint[]>();
    for (const fp of fingerprints) {
      if (!fp.fingerprint) continue; // skip empty fingerprints
      const existing = groups.get(fp.fingerprint);
      if (existing) {
        existing.push(fp);
      } else {
        groups.set(fp.fingerprint, [fp]);
      }
    }

    // Build candidate groups for groups meeting minimum size
    const candidates: MacroCandidateGroup[] = [];
    for (const [fingerprint, members] of groups) {
      if (members.length < minGroupSize) continue;

      const customers = [...new Set(members.map((m) => m.customer))].sort();
      const programs = members.map((m) => m.filename);
      const varyingParams = findVaryingParams(members);

      candidates.push({
        fingerprint,
        programCount: members.length,
        programs,
        customers,
        varyingParams,
        estimatedSavings: `${members.length} programs -> 1 macro`,
      });
    }

    // Sort by program count descending
    candidates.sort((a, b) => b.programCount - a.programCount);

    return candidates;
  }

  // ==========================================================================
  // listExistingMacros
  // ==========================================================================

  /**
   * Lists existing macro files in the MACRO PROGRAMS directory.
   *
   * @returns Array of filenames of existing macros
   */
  static async listExistingMacros(): Promise<string[]> {
    try {
      const entries = await readdir(MACRO_PROGRAMS_DIR);
      return entries.filter((f) => f.toUpperCase().endsWith(".MIN")).sort();
    } catch {
      log.warn("MacroConversionAnalyzerEngine: MACRO PROGRAMS directory not accessible");
      return [];
    }
  }

  // ==========================================================================
  // scanCustomerFolder
  // ==========================================================================

  /**
   * Scans a single customer folder and returns fingerprints for up to maxPrograms .MIN files.
   *
   * @param customerName - Folder name under CNC LATHE/
   * @param maxPrograms - Maximum programs to analyze (default: 50)
   * @returns Array of ProgramFingerprint for this customer
   */
  static async scanCustomerFolder(
    customerName: string,
    maxPrograms: number = DEFAULT_PROGRAMS_PER_CUSTOMER
  ): Promise<ProgramFingerprint[]> {
    const customerDir = path.join(JM_DIE_CNC_LATHE, customerName);
    const results: ProgramFingerprint[] = [];

    let entries: string[];
    try {
      entries = await readdir(customerDir);
    } catch {
      return results;
    }

    const minFiles = entries
      .filter((f) => f.toUpperCase().endsWith(".MIN"))
      .slice(0, maxPrograms);

    for (const file of minFiles) {
      try {
        const filePath = path.join(customerDir, file);
        const content = await readFile(filePath, "utf-8");
        const fp = MacroConversionAnalyzerEngine.analyzeProgram(
          content,
          file,
          customerName.toUpperCase()
        );
        results.push(fp);
      } catch {
        // Skip files that can't be read
      }
    }

    return results;
  }

  // ==========================================================================
  // harvest
  // ==========================================================================

  /**
   * Full macro conversion analysis across the JM Die CNC LATHE archive.
   * Scans up to customerLimit customers, maxProgramsPerCustomer programs each.
   *
   * @param customerLimit - Max customer folders to scan (default: 10)
   * @param maxProgramsPerCustomer - Max .MIN files per customer (default: 50)
   * @returns MacroConversionResult with all analysis data
   */
  static async harvest(
    customerLimit: number = DEFAULT_CUSTOMER_LIMIT,
    maxProgramsPerCustomer: number = DEFAULT_PROGRAMS_PER_CUSTOMER
  ): Promise<MacroConversionResult> {
    const allFingerprints: ProgramFingerprint[] = [];

    // List existing macros
    const existingMacros = await MacroConversionAnalyzerEngine.listExistingMacros();

    // List customer folders
    let customerFolders: string[] = [];
    try {
      const entries = await readdir(JM_DIE_CNC_LATHE, { withFileTypes: true });
      customerFolders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .slice(0, customerLimit);
    } catch {
      log.warn("MacroConversionAnalyzerEngine: CNC LATHE archive not accessible");
    }

    // Scan each customer folder
    for (const customerName of customerFolders) {
      const customerFps = await MacroConversionAnalyzerEngine.scanCustomerFolder(
        customerName,
        maxProgramsPerCustomer
      );
      allFingerprints.push(...customerFps);
    }

    // Also scan root-level .MIN files (programs not in customer folders)
    try {
      const rootEntries = await readdir(JM_DIE_CNC_LATHE);
      const rootMinFiles = rootEntries
        .filter((f) => f.toUpperCase().endsWith(".MIN"))
        .slice(0, maxProgramsPerCustomer);

      for (const file of rootMinFiles) {
        try {
          const filePath = path.join(JM_DIE_CNC_LATHE, file);
          const content = await readFile(filePath, "utf-8");
          const fp = MacroConversionAnalyzerEngine.analyzeProgram(content, file, "ROOT");
          allFingerprints.push(fp);
        } catch {
          // Skip unreadable
        }
      }
    } catch {
      // Root scan failed
    }

    // Find candidates
    const candidateGroups = MacroConversionAnalyzerEngine.findMacroCandidates(allFingerprints);

    // Unique fingerprints
    const uniqueFingerprints = new Set(
      allFingerprints.filter((fp) => fp.fingerprint).map((fp) => fp.fingerprint)
    ).size;

    const totalAnalyzed = allFingerprints.length;
    const compressionRatio = totalAnalyzed > 0 ? uniqueFingerprints / totalAnalyzed : 1;

    return {
      totalAnalyzed,
      uniqueFingerprints,
      candidateGroups,
      topCandidates: candidateGroups.slice(0, 20),
      existingMacros,
      compressionRatio,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // audit
  // ==========================================================================

  /**
   * Returns a compact summary of the macro conversion analysis.
   * Runs a harvest with default parameters and distills the results.
   *
   * @param customerLimit - Max customer folders to scan (default: 10)
   * @param maxProgramsPerCustomer - Max .MIN files per customer (default: 50)
   * @returns MacroConversionAuditSummary
   */
  static async audit(
    customerLimit: number = DEFAULT_CUSTOMER_LIMIT,
    maxProgramsPerCustomer: number = DEFAULT_PROGRAMS_PER_CUSTOMER
  ): Promise<MacroConversionAuditSummary> {
    const result = await MacroConversionAnalyzerEngine.harvest(
      customerLimit,
      maxProgramsPerCustomer
    );

    const groupsWith10Plus = result.candidateGroups.filter(
      (g) => g.programCount >= 10
    ).length;

    const topFive = result.topCandidates.slice(0, 5).map((g) => ({
      fingerprint:
        g.fingerprint.length > 80
          ? g.fingerprint.substring(0, 80) + "..."
          : g.fingerprint,
      count: g.programCount,
      customers: g.customers.length,
    }));

    return {
      totalAnalyzed: result.totalAnalyzed,
      uniqueFingerprints: result.uniqueFingerprints,
      compressionRatio: result.compressionRatio,
      groupsWith10Plus,
      topFive,
      existingMacroCount: result.existingMacros.length,
    };
  }

  // ==========================================================================
  // detectMacroPatterns
  // ==========================================================================

  /**
   * Detects whether a program already uses macro-style patterns (V-variables, IF/GOTO).
   * Used to identify programs that are already parametric and don't need conversion.
   *
   * @param content - Raw text content of a .MIN file
   * @returns Object with isMacro flag and counts of macro features found
   */
  static detectMacroPatterns(content: string): {
    isMacro: boolean;
    variableCount: number;
    controlFlowCount: number;
    variableNames: string[];
  } {
    const lines = content.split(/\r?\n/);
    const variableNames = new Set<string>();
    let controlFlowCount = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Count V-variable assignments and references
      let vMatch;
      const vRegex = /V(\d+)/g;
      while ((vMatch = vRegex.exec(line)) !== null) {
        variableNames.add(`V${vMatch[1]}`);
      }

      // Count IF/GOTO flow control
      if (/\bIF\b/.test(line) || /\bGOTO\b/.test(line)) {
        controlFlowCount++;
      }
    }

    // A program is "macro-style" if it has 5+ unique variables AND any control flow
    const isMacro = variableNames.size >= 5 && controlFlowCount >= 1;

    return {
      isMacro,
      variableCount: variableNames.size,
      controlFlowCount,
      variableNames: [...variableNames].sort(),
    };
  }
}

// Singleton export per PRISM conventions
export const macroConversionAnalyzerEngine = new MacroConversionAnalyzerEngine();
