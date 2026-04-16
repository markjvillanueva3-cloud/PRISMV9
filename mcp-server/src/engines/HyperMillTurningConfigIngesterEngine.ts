/**
 * HyperMillTurningConfigIngesterEngine (E099)
 * ==============================================
 *
 * Parses hyperMILL turning configuration files:
 *   - cycTurn.def — canned-cycle definition file (key/value text)
 *   - Stocklist.xlsx — stock material registry (XLSX via csv fallback)
 *   - Bibliothek files (.ctl, .cav) — tool library metadata
 *
 * No external XLSX dependency — parses a CSV export of Stocklist.xlsx
 * (user runs "Save As CSV" once, then this engine handles the rest).
 *
 * @module engines/HyperMillTurningConfigIngesterEngine
 * @milestone LATHE-AWARE-HARDEN MS5 (U-LAT37)
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CycTurnCycle {
  name: string;
  id?: number;
  description?: string;
  parameters: Record<string, string>;
}

export interface StockEntry {
  name: string;
  material_group?: string;
  hardness_hrc?: number;
  density_g_cm3?: number;
  kc11?: number;
  supplier?: string;
  raw: Record<string, string>;
}

export interface HyperMillConfigResult {
  source: string;
  cycles: CycTurnCycle[];
  stock_entries: StockEntry[];
  parse_warnings: string[];
  generated_at: string;
}

// ── Parsers ────────────────────────────────────────────────────────────────

/**
 * Parse hyperMILL cycTurn.def — key/value text with [Section] blocks.
 * Example:
 *   [CYCLE_G71_ROUGHING]
 *   Name=Roughing
 *   ID=71
 *   P=FirstPass
 *   Q=LastPass
 */
function parseCycTurnDef(content: string): { cycles: CycTurnCycle[]; warnings: string[] } {
  const cycles: CycTurnCycle[] = [];
  const warnings: string[] = [];
  let current: CycTurnCycle | null = null;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (line.length === 0 || line.startsWith(";") || line.startsWith("#")) continue;

    // Section header [NAME]
    const section = line.match(/^\[(.+)\]$/);
    if (section) {
      if (current) cycles.push(current);
      current = { name: section[1]!, parameters: {} };
      continue;
    }

    // Key=Value
    const kv = line.match(/^([^=]+)=(.*)$/);
    if (kv && current) {
      const key = kv[1]!.trim();
      const value = kv[2]!.trim();
      if (key.toLowerCase() === "name") current.name = value || current.name;
      else if (key.toLowerCase() === "id") {
        const id = parseInt(value, 10);
        if (!Number.isNaN(id)) current.id = id;
      } else if (key.toLowerCase() === "description") {
        current.description = value;
      } else {
        current.parameters[key] = value;
      }
      continue;
    }

    if (line.length > 0 && !section && !kv) {
      warnings.push(`Line ${i + 1}: unparseable "${line}"`);
    }
  }
  if (current) cycles.push(current);

  return { cycles, warnings };
}

/**
 * Parse a CSV export of Stocklist.xlsx — tab or comma separated, first row
 * treated as headers.
 */
function parseStocklistCsv(content: string): { entries: StockEntry[]; warnings: string[] } {
  const entries: StockEntry[] = [];
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { entries, warnings: ["Empty stocklist"] };
  }

  // Determine separator
  const firstLine = lines[0]!;
  const separator = firstLine.includes("\t") ? "\t" : ",";
  const headers = firstLine.split(separator).map((h) => h.trim());

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(separator).map((c) => c.trim());
    if (cells.length !== headers.length && cells.length < headers.length - 1) {
      warnings.push(`Row ${i + 1}: column count mismatch (${cells.length} vs ${headers.length})`);
      continue;
    }
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]!] = cells[c] ?? "";
    }
    const nameKey = headers.find((h) => /name|material/i.test(h));
    const name = nameKey ? row[nameKey] ?? "" : "";
    if (!name) continue;

    entries.push({
      name,
      material_group: findField(row, /group|iso|category/i),
      hardness_hrc: parseNumber(findField(row, /hardness|hrc/i)),
      density_g_cm3: parseNumber(findField(row, /density/i)),
      kc11: parseNumber(findField(row, /kc.*1\.?1|kc_?11/i)),
      supplier: findField(row, /supplier|vendor/i),
      raw: row,
    });
  }

  return { entries, warnings };
}

function findField(row: Record<string, string>, pattern: RegExp): string | undefined {
  const key = Object.keys(row).find((k) => pattern.test(k));
  return key ? row[key] : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class HyperMillTurningConfigIngesterEngineImpl {
  /**
   * Parse cycTurn.def content from text.
   */
  parseCycTurnText(content: string, sourceName = "in-memory"): HyperMillConfigResult {
    const { cycles, warnings } = parseCycTurnDef(content);
    return {
      source: sourceName,
      cycles,
      stock_entries: [],
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Parse cycTurn.def from filesystem.
   */
  parseCycTurnFile(filePath: string): HyperMillConfigResult {
    if (!fs.existsSync(filePath)) {
      log.warn(`[HyperMillConfig] cycTurn file not found: ${filePath}`);
      return this.emptyResult(filePath, [`File not found: ${filePath}`]);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return this.parseCycTurnText(content, filePath);
  }

  /**
   * Parse Stocklist CSV content from text.
   */
  parseStocklistText(content: string, sourceName = "in-memory"): HyperMillConfigResult {
    const { entries, warnings } = parseStocklistCsv(content);
    return {
      source: sourceName,
      cycles: [],
      stock_entries: entries,
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Parse Stocklist CSV from filesystem.
   */
  parseStocklistFile(filePath: string): HyperMillConfigResult {
    if (!fs.existsSync(filePath)) {
      log.warn(`[HyperMillConfig] Stocklist file not found: ${filePath}`);
      return this.emptyResult(filePath, [`File not found: ${filePath}`]);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return this.parseStocklistText(content, filePath);
  }

  /**
   * Ingest a hyperMILL config directory — looks for cycTurn.def + Stocklist.csv.
   */
  ingestDirectory(dirPath: string): HyperMillConfigResult {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return this.emptyResult(dirPath, [`Directory not found: ${dirPath}`]);
    }
    const entries = fs.readdirSync(dirPath);
    const cycFile = entries.find((f) => /cyc.*turn.*\.def$/i.test(f));
    const stockFile = entries.find((f) => /stocklist.*\.(csv|tsv|txt)$/i.test(f));

    const result: HyperMillConfigResult = {
      source: dirPath,
      cycles: [],
      stock_entries: [],
      parse_warnings: [],
      generated_at: new Date().toISOString(),
    };

    if (cycFile) {
      const cyc = this.parseCycTurnFile(path.join(dirPath, cycFile));
      result.cycles = cyc.cycles;
      result.parse_warnings.push(...cyc.parse_warnings);
    } else {
      result.parse_warnings.push("cycTurn.def not found in directory");
    }

    if (stockFile) {
      const stock = this.parseStocklistFile(path.join(dirPath, stockFile));
      result.stock_entries = stock.stock_entries;
      result.parse_warnings.push(...stock.parse_warnings);
    } else {
      result.parse_warnings.push("Stocklist CSV not found in directory");
    }

    return result;
  }

  private emptyResult(source: string, warnings: string[] = []): HyperMillConfigResult {
    return {
      source,
      cycles: [],
      stock_entries: [],
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  getStats(): {
    supported_file_types: string[];
    stock_fields_inferred: string[];
  } {
    return {
      supported_file_types: ["cycTurn.def", "Stocklist.csv", "Stocklist.tsv", "Stocklist.txt"],
      stock_fields_inferred: [
        "material_group",
        "hardness_hrc",
        "density_g_cm3",
        "kc11",
        "supplier",
      ],
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const hyperMillTurningConfigIngesterEngine =
  new HyperMillTurningConfigIngesterEngineImpl();
export type { HyperMillTurningConfigIngesterEngineImpl };
