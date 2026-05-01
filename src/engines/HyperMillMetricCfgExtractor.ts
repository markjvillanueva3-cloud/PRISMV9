/**
 * HyperMillMetricCfgExtractor — Parse Metric.cfg files into cycle parameter schemas
 *
 * HM-KC-MS0 / U-HKC01: Reads all .cfg files from the hyperMILL Metric.cfg directory
 * and extracts structured parameter definitions per cycle type.
 *
 * File format (Open Mind proprietary INI variant):
 *   # comment lines
 *   *PARAMETER_NAME value  # optional inline description
 *
 * Value types:
 *   numeric  — pure number (int or float): 2.0, 300, -1
 *   formula  — expression referencing tool/job vars: T:Rad*0.8, mtol*0.9
 *   text     — anything else: J:Fxy, identifier strings
 *
 * Formula reference tokens:
 *   T:Rad, T:Dia, T:CornerRad, T:rad (case variants)
 *   J:Fxy, J:F, J:MTol, J:Vf
 *   mtol (machining tolerance variable)
 *
 * @engine HyperMillMetricCfgExtractor
 * @milestone HM-KC-MS0/U-HKC01
 */

import * as fsPromises from "node:fs/promises";
import * as path from "node:path";

// ── Public Interface ──────────────────────────────────────────────────────────

export interface CfgParameter {
  /** Parameter name without the leading asterisk, e.g. "VERTZUSTEL" */
  name: string;
  /** Raw default value — numeric when parseable, otherwise the raw string */
  defaultValue: string | number;
  /** Description extracted from inline comment (after `#`), or empty string */
  description: string;
  /** Inferred value type */
  valueType: "numeric" | "formula" | "text";
  /** Cross-reference tokens found in formula values, e.g. ["T:Rad", "mtol"] */
  formulaRefs: string[];
}

export interface CycleParameterSchema {
  /** Cycle type derived from filename without extension, e.g. "HMCAST" */
  cycleType: string;
  /** Original filename including extension, e.g. "HMCAST.CFG" */
  sourceFile: string;
  parameters: CfgParameter[];
  parameterCount: number;
}

export interface ExtractionResult {
  schemas: CycleParameterSchema[];
  totalParameters: number;
  totalCycleTypes: number;
  extractedAt: string;
  errors: string[];
}

// ── Formula Reference Detection ───────────────────────────────────────────────

/**
 * Tokens that identify a value as a formula expression.
 * Matched case-insensitively on the whole value string.
 */
const FORMULA_INDICATORS: ReadonlyArray<string> = [
  "T:Rad",
  "T:rad",
  "T:Dia",
  "T:dia",
  "T:CornerRad",
  "T:cornerrad",
  "J:Fxy",
  "J:F",
  "J:MTol",
  "J:Vf",
  "J:",
  "T:",
  "mtol",
];

/**
 * Regex to split a formula value into candidate reference tokens.
 * Splits on operators and whitespace, keeping alphanumeric+colon+underscore groups.
 */
const TOKEN_SPLITTER = /[*+\-/|,\s]+/;

/**
 * Known reference token patterns (prefix match, case-insensitive).
 */
const REF_PREFIXES: ReadonlyArray<string> = ["T:", "J:", "mtol"];

// ── Engine Class ──────────────────────────────────────────────────────────────

export class HyperMillMetricCfgExtractor {
  readonly cfgDir: string;

  /**
   * @param cfgDir - Path to the Metric.cfg directory. Defaults to hyperMILL 33.0 install location.
   */
  constructor(cfgDir = "H:/prism/HYPERMILL/hyperMILL/33.0/Metric.cfg") {
    this.cfgDir = cfgDir;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Reads and parses all .cfg files from the configured directory.
   * Files that cannot be read are skipped and recorded in `errors`.
   * Never throws — always resolves.
   *
   * @returns ExtractionResult with all cycle schemas and aggregate counts
   */
  async extractAll(): Promise<ExtractionResult> {
    const extractedAt = new Date().toISOString();
    const errors: string[] = [];
    const schemas: CycleParameterSchema[] = [];

    let entries: string[];
    try {
      entries = await fsPromises.readdir(this.cfgDir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cannot read directory "${this.cfgDir}": ${msg}`);
      return {
        schemas: [],
        totalParameters: 0,
        totalCycleTypes: 0,
        extractedAt,
        errors,
      };
    }

    const cfgFiles = entries
      .filter(f => f.toUpperCase().endsWith(".CFG"))
      .sort();

    for (const filename of cfgFiles) {
      const filePath = path.join(this.cfgDir, filename);
      try {
        const schema = await this.extractFile(filePath);
        schemas.push(schema);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${filename}: ${msg}`);
      }
    }

    const totalParameters = schemas.reduce((sum, s) => sum + s.parameterCount, 0);

    return {
      schemas,
      totalParameters,
      totalCycleTypes: schemas.length,
      extractedAt,
      errors,
    };
  }

  /**
   * Reads and parses a single .cfg file.
   * Throws on read failure; parse errors on individual lines are silently skipped.
   *
   * @param filePath - Absolute path to the .cfg file
   * @returns CycleParameterSchema for that file
   */
  async extractFile(filePath: string): Promise<CycleParameterSchema> {
    const content = await fsPromises.readFile(filePath, "utf8");
    const filename = path.basename(filePath);
    const cycleType = path.basename(filePath, path.extname(filePath));

    const parameters: CfgParameter[] = [];
    for (const line of content.split(/\r?\n/)) {
      const param = this.parseLine(line);
      if (param !== null) {
        parameters.push(param);
      }
    }

    return {
      cycleType,
      sourceFile: filename,
      parameters,
      parameterCount: parameters.length,
    };
  }

  /**
   * Parses a single line from a .cfg file.
   *
   * Valid parameter lines start with `*` followed by the parameter name,
   * then whitespace-separated value(s), optionally followed by `# description`.
   *
   * Returns null for:
   *   - Empty lines
   *   - Comment-only lines (starting with `#`)
   *   - Lines not starting with `*`
   *   - Lines where the name cannot be extracted
   *
   * @param line - Raw text line from the file
   * @returns CfgParameter or null
   */
  parseLine(line: string): CfgParameter | null {
    const trimmed = line.trim();

    // Skip empty and pure comment lines
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      return null;
    }

    // Must start with *
    if (!trimmed.startsWith("*")) {
      return null;
    }

    // Strip the leading asterisk
    const rest = trimmed.slice(1);

    // Split into (name, remainder) on first whitespace
    const wsIdx = rest.search(/\s/);
    if (wsIdx === -1) {
      // No whitespace — name only, no value (e.g. "*COMMENT" alone)
      return {
        name: rest.trim(),
        defaultValue: "",
        description: "",
        valueType: "text",
        formulaRefs: [],
      };
    }

    const name = rest.slice(0, wsIdx).trim();
    const remainder = rest.slice(wsIdx).trim();

    // Split remainder into value and description on the first `#`
    const hashIdx = remainder.indexOf("#");
    const rawValue = hashIdx === -1
      ? remainder.trim()
      : remainder.slice(0, hashIdx).trim();
    const description = hashIdx === -1
      ? ""
      : remainder.slice(hashIdx + 1).trim();

    // Coerce the raw value
    const defaultValue = this._parseValue(rawValue);
    const valueType = this._inferValueType(rawValue);
    const formulaRefs = valueType === "formula"
      ? this.detectFormulaRefs(rawValue)
      : [];

    return {
      name,
      defaultValue,
      description,
      valueType,
      formulaRefs,
    };
  }

  /**
   * Detects formula cross-reference tokens within a value string.
   *
   * Splits the value on operators and whitespace, then returns tokens that
   * match known hyperMILL formula variable prefixes: `T:`, `J:`, `mtol`.
   *
   * Example: "T:Rad*0.8" → ["T:Rad"]
   * Example: "mtol*0.9|mtol*0.1|mtol*0.1" → ["mtol", "mtol", "mtol"] → deduped → ["mtol"]
   *
   * @param value - The raw value string to scan
   * @returns Deduplicated list of detected reference tokens
   */
  detectFormulaRefs(value: string): string[] {
    const tokens = value.split(TOKEN_SPLITTER).filter(t => t.length > 0);
    const refs: string[] = [];

    for (const token of tokens) {
      for (const prefix of REF_PREFIXES) {
        if (token.toLowerCase().startsWith(prefix.toLowerCase())) {
          // Normalize to the canonical form found in the token
          refs.push(token);
          break;
        }
      }
    }

    // Deduplicate while preserving order
    return [...new Set(refs)];
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Determines whether a raw value string is a formula expression.
   * Checks for known hyperMILL variable prefixes (T:, J:, mtol).
   */
  private _isFormula(raw: string): boolean {
    const lower = raw.toLowerCase();
    return FORMULA_INDICATORS.some(ind => lower.includes(ind.toLowerCase()));
  }

  /**
   * Infers the value type from the raw string.
   * Order of precedence: formula > numeric > text
   */
  private _inferValueType(raw: string): "numeric" | "formula" | "text" {
    if (this._isFormula(raw)) return "formula";
    const n = parseFloat(raw);
    if (!isNaN(n) && raw.trim() !== "") return "numeric";
    return "text";
  }

  /**
   * Parses a raw value string into a number (when purely numeric) or string.
   * Formula strings and multi-token values are returned as-is.
   */
  private _parseValue(raw: string): string | number {
    if (raw === "") return "";
    if (this._isFormula(raw)) return raw;
    const n = parseFloat(raw);
    if (!isNaN(n) && String(n) !== "NaN" && raw.trim() !== "") {
      // Verify the raw string is purely numeric (no trailing alpha)
      if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(raw.trim())) {
        return n;
      }
    }
    return raw;
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const hyperMillMetricCfgExtractor = new HyperMillMetricCfgExtractor();
