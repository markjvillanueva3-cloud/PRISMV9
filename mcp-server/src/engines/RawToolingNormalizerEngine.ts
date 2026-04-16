/**
 * RawToolingNormalizerEngine — Normalizes raw PDF-extracted tooling tables
 *
 * Processes 4,710 raw tables from 10 manufacturer catalogs, identifies product
 * specification tables, and extracts structured tool records with part numbers,
 * dimensions, and cutting parameters.
 *
 * Input: JS files containing `const PRISM_<NAME> = { manufacturer, catalog, tables[] }`
 * Output: Normalized tool records with part numbers, dimensions, categories, confidence scores
 *
 * @module RawToolingNormalizerEngine
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface RawTable {
  page: number;
  header: string[];
  rows: string[][];
}

export interface RawCatalog {
  manufacturer: string;
  catalog: string;
  tables: RawTable[];
}

export type ToolCategory =
  | 'end_mill' | 'drill' | 'tap' | 'insert' | 'holder'
  | 'boring' | 'reamer' | 'threading' | 'unknown';

export type TableClassification =
  | 'product' | 'formula' | 'marketing' | 'index' | 'unknown';

export interface NormalizedToolRecord {
  manufacturer: string;
  partNumber?: string;
  description?: string;
  category: ToolCategory;
  diameter?: number;
  length?: number;
  fluteLength?: number;
  flutes?: number;
  coating?: string;
  grade?: string;
  material?: string;
  sourcePage: number;
  rawHeader: string[];
  confidence: number;       // 0-1 how confident we are in the extraction
}

export interface NormalizationResult {
  manufacturer: string;
  catalog: string;
  totalTables: number;
  productTables: number;
  skippedTables: number;
  extractedRecords: number;
  records: NormalizedToolRecord[];
  skippedReasons: Record<string, number>;
}

export interface NormalizationSummary {
  totalFiles: number;
  totalTables: number;
  totalProductTables: number;
  totalSkippedTables: number;
  totalRecords: number;
  byManufacturer: Record<string, { tables: number; productTables: number; records: number }>;
  skippedReasons: Record<string, number>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const BASE_PATH = 'C:/Users/Admin.DIGITALSTORM-PC/Box/PRISM/TOOLING DATABASE THAT NEEDS INTEGRATION/';

const CATALOG_FILES = [
  'Korloy_Complete.js',
  'Tungaloy_US_Tooling.js',
  'OSG_Complete.js',
  'Ingersoll_Complete.js',
  'Sandvik_Complete.js',
  'EMUGE_Complete.js',
  'MA_Ford_Complete.js',
  'ISCAR_Complete.js',
  'BIG_DAISHOWA_Complete.js',
  'Haimer_Complete.js',
];

// Header term patterns for product table detection
const PART_NUMBER_TERMS = /\b(part\s*(no|number|#)?|cat\.?\s*no|order\s*(no|number)|item\s*(no|number)?|edp|sku|stock\s*no|product\s*(code|no))\b/i;
const DIAMETER_TERMS = /\b(diameter|dia\.?|[øo]d|d1|d2|dconms|dc|dcon|cutting\s*dia)\b/i;
const LENGTH_TERMS = /\b(length|loc|oal|l1|l2|flute\s*length|overall\s*length|reach|lf|lu)\b/i;
const FLUTE_TERMS = /\b(flute|teeth|z\b|no\.?\s*of\s*flutes|number\s*of\s*flutes)\b/i;
const COATING_TERMS = /\b(coating|grade|material|substrate|carbide\s*grade)\b/i;
const SPEED_FEED_TERMS = /\b(rpm|sfm|feed|speed|vc|fz|fn|ap|ae|apmx|kapr|ipr|ipm)\b/i;
const ISO_DIM_TERMS = /\b(apmx|dconms|kapr|cict|rmpx|wfmx|bmc|dcon|dmin|lu|rpmx|oal|re)\b/i;

// Non-product header patterns
const FORMULA_TERMS = /\b(formula|equation|calculation|symbol|legend|variable)\b/i;
const MARKETING_TERMS = /\b(feature|benefit|advantage|application\s*guide|overview|introduction|about)\b/i;
const INDEX_TERMS = /\b(cat\.?\s*pg|tech\s*pg|page\s*(no|number)?|table\s*of\s*contents|index)\b/i;

// Category detection from headers and context
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: ToolCategory }> = [
  { pattern: /\b(end\s*mill|endmill|ball\s*nose|bull\s*nose|corner\s*rad|square\s*end)\b/i, category: 'end_mill' },
  { pattern: /\b(drill|boring\s*drill|step\s*drill|spot\s*drill|center\s*drill|twist\s*drill)\b/i, category: 'drill' },
  { pattern: /\b(tap|tapping|thread\s*form)\b/i, category: 'tap' },
  { pattern: /\b(insert|turning\s*insert|milling\s*insert|cnmg|wnmg|dnmg|ccmt|vcmt|tnmg|snmg|cnmm|vnmg|rcmt|rpmt|apmt|apkt|sdmt|xdmt|lnmt)\b/i, category: 'insert' },
  { pattern: /\b(holder|collet|chuck|arbor|adapter|shank|extension|tool\s*holder|shrink\s*fit|hydraulic)\b/i, category: 'holder' },
  { pattern: /\b(boring|bore|boring\s*bar|boring\s*head|fine\s*boring)\b/i, category: 'boring' },
  { pattern: /\b(reamer|ream)\b/i, category: 'reamer' },
  { pattern: /\b(thread\s*mill|threading|thread\s*turning)\b/i, category: 'threading' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Try to parse a numeric value from a cell, stripping units and whitespace. */
function parseNumeric(val: string): number | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const cleaned = val.replace(/[^\d.\-\/]/g, '').trim();
  if (!cleaned || cleaned === '.' || cleaned === '-') return undefined;
  // Handle fractions like "1/4"
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    return undefined;
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

/** Check if a string looks like a part number (alphanumeric mix, dashes, dots). */
function looksLikePartNumber(val: string): boolean {
  if (!val || val.length < 2 || val.length > 40) return false;
  // Part numbers typically have digits and letters, or digits with dashes/dots
  const hasDigit = /\d/.test(val);
  const hasLetter = /[a-zA-Z]/.test(val);
  const tooMuchProse = val.split(/\s+/).length > 5;
  if (tooMuchProse) return false;
  // Pure numeric with length 3+ is plausible
  if (hasDigit && /^[\d\-\.\/\s]+$/.test(val) && val.replace(/\D/g, '').length >= 3) return true;
  // Alphanumeric mix is strong indicator
  if (hasDigit && hasLetter) return true;
  return false;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class RawToolingNormalizerEngine {
  private results: Map<string, NormalizationResult> = new Map();

  /**
   * Parse a JS file and extract the raw catalog JSON.
   * Files are formatted as `const PRISM_XXX = { ... };`
   */
  private parseCatalogFile(filePath: string): RawCatalog {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Find the JSON object between `= {` and the final `};`
    const startIdx = content.indexOf('= {');
    if (startIdx === -1) {
      throw new Error(`Could not find '= {' in ${filePath}`);
    }
    const jsonStart = startIdx + 2; // start at the `{`
    // Find the last `};` in the file
    const lastSemicolon = content.lastIndexOf('};');
    if (lastSemicolon === -1) {
      throw new Error(`Could not find closing '};' in ${filePath}`);
    }
    const jsonStr = content.substring(jsonStart, lastSemicolon + 1); // include the `}`
    try {
      return JSON.parse(jsonStr) as RawCatalog;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`JSON parse error in ${filePath}: ${msg}`);
    }
  }

  /**
   * Score a table to determine if it contains product/tool specification data.
   * Returns the numeric score; product tables score >= 3.
   */
  private scoreTable(table: RawTable): number {
    let score = 0;
    const headerJoined = table.header.join(' ');

    // Positive signals
    if (PART_NUMBER_TERMS.test(headerJoined)) score += 3;
    if (DIAMETER_TERMS.test(headerJoined)) score += 2;
    if (LENGTH_TERMS.test(headerJoined)) score += 2;
    if (FLUTE_TERMS.test(headerJoined)) score += 1;
    if (COATING_TERMS.test(headerJoined)) score += 1;
    if (SPEED_FEED_TERMS.test(headerJoined)) score += 1;
    if (ISO_DIM_TERMS.test(headerJoined)) score += 2;
    if (table.header.filter(h => h.trim().length > 0).length >= 4) score += 1;
    if (table.rows.length > 0 && table.rows.some(r => r.filter(c => c.trim().length > 0).length >= 3)) score += 1;

    // Negative signals
    const hasLongCell = table.rows.some(row => row.some(cell => cell.length > 100));
    if (hasLongCell) score -= 3;
    if (FORMULA_TERMS.test(headerJoined) && headerJoined.toLowerCase().includes('description')) score -= 2;
    if (table.rows.length < 2) score -= 1;

    // Extra penalty for purely empty headers
    const nonEmptyHeaders = table.header.filter(h => h.trim().length > 0);
    if (nonEmptyHeaders.length === 0) score -= 3;

    return score;
  }

  /**
   * Classify a table into a category: product, formula, marketing, index, or unknown.
   */
  classifyTable(table: RawTable): TableClassification {
    const headerJoined = table.header.join(' ');
    const allText = headerJoined + ' ' + table.rows.map(r => r.join(' ')).join(' ');

    if (FORMULA_TERMS.test(headerJoined)) return 'formula';
    if (INDEX_TERMS.test(headerJoined) && !PART_NUMBER_TERMS.test(headerJoined)) return 'index';
    if (MARKETING_TERMS.test(headerJoined) && !PART_NUMBER_TERMS.test(headerJoined)) return 'marketing';

    // Check row content for marketing prose
    const avgCellLength = table.rows.length > 0
      ? table.rows.reduce((sum, r) => sum + r.reduce((s, c) => s + c.length, 0), 0) / Math.max(table.rows.length, 1)
      : 0;
    if (avgCellLength > 200 && !PART_NUMBER_TERMS.test(headerJoined)) return 'marketing';

    if (this.scoreTable(table) >= 3) return 'product';

    return 'unknown';
  }

  /**
   * Determine if a table contains product specification data.
   */
  isProductTable(table: RawTable): boolean {
    return this.scoreTable(table) >= 3;
  }

  /**
   * Detect the tool category from table headers and row content.
   */
  private detectCategory(table: RawTable, manufacturer: string): ToolCategory {
    const headerText = table.header.join(' ');
    // Also sample first few rows for context clues
    const sampleRows = table.rows.slice(0, Math.min(5, table.rows.length));
    const rowText = sampleRows.map(r => r.join(' ')).join(' ');
    const combined = headerText + ' ' + rowText;

    for (const { pattern, category } of CATEGORY_PATTERNS) {
      if (pattern.test(combined)) return category;
    }
    return 'unknown';
  }

  /**
   * Map header columns to known field types for extraction.
   */
  private mapHeaderColumns(header: string[]): Map<number, string> {
    const mapping = new Map<number, string>();
    for (let i = 0; i < header.length; i++) {
      const h = header[i].trim();
      if (!h) continue;
      if (PART_NUMBER_TERMS.test(h)) mapping.set(i, 'partNumber');
      else if (DIAMETER_TERMS.test(h)) mapping.set(i, 'diameter');
      else if (/\b(flute\s*length|loc|lu|lf)\b/i.test(h)) mapping.set(i, 'fluteLength');
      else if (LENGTH_TERMS.test(h)) mapping.set(i, 'length');
      else if (FLUTE_TERMS.test(h)) mapping.set(i, 'flutes');
      else if (/\bcoating\b/i.test(h)) mapping.set(i, 'coating');
      else if (/\bgrade\b/i.test(h)) mapping.set(i, 'grade');
      else if (/\b(material|substrate)\b/i.test(h)) mapping.set(i, 'material');
      else if (/\b(description|desc\.?)\b/i.test(h)) mapping.set(i, 'description');
    }
    return mapping;
  }

  /**
   * Attempt to find the part number column by heuristic when header mapping fails.
   * Scans first column and first few rows for part-number-like values.
   */
  private findPartNumberColumn(table: RawTable): number {
    // Check each column for part-number-like patterns
    const maxCol = Math.min(table.header.length, 6); // only check first 6 columns
    let bestCol = -1;
    let bestScore = 0;

    for (let col = 0; col < maxCol; col++) {
      let hits = 0;
      const sampleSize = Math.min(table.rows.length, 10);
      for (let row = 0; row < sampleSize; row++) {
        if (col < table.rows[row].length && looksLikePartNumber(table.rows[row][col].trim())) {
          hits++;
        }
      }
      const ratio = sampleSize > 0 ? hits / sampleSize : 0;
      if (ratio > bestScore && ratio >= 0.4) {
        bestScore = ratio;
        bestCol = col;
      }
    }
    return bestCol;
  }

  /**
   * Extract structured records from a single product table.
   */
  extractRecords(table: RawTable, manufacturer: string): NormalizedToolRecord[] {
    const records: NormalizedToolRecord[] = [];
    const colMap = this.mapHeaderColumns(table.header);
    const category = this.detectCategory(table, manufacturer);

    // If no part number column mapped from header, try heuristic
    let partNumCol = -1;
    for (const [idx, field] of colMap.entries()) {
      if (field === 'partNumber') { partNumCol = idx; break; }
    }
    if (partNumCol === -1) {
      partNumCol = this.findPartNumberColumn(table);
      if (partNumCol >= 0) colMap.set(partNumCol, 'partNumber');
    }

    // Calculate base confidence from how many fields we can map
    const mappedFields = new Set(colMap.values());
    let baseConfidence = 0.3; // minimum for being a product table
    if (mappedFields.has('partNumber')) baseConfidence += 0.25;
    if (mappedFields.has('diameter')) baseConfidence += 0.15;
    if (mappedFields.has('length') || mappedFields.has('fluteLength')) baseConfidence += 0.1;
    if (mappedFields.has('flutes')) baseConfidence += 0.05;
    if (mappedFields.has('coating') || mappedFields.has('grade') || mappedFields.has('material')) baseConfidence += 0.05;
    baseConfidence = Math.min(baseConfidence, 0.95);

    for (const row of table.rows) {
      // Skip rows that are entirely empty
      const nonEmpty = row.filter(c => c.trim().length > 0);
      if (nonEmpty.length < 2) continue;

      // Skip rows that look like sub-headers or section dividers
      const allAlpha = nonEmpty.every(c => /^[a-zA-Z\s\-\/]+$/.test(c.trim()) && c.trim().length < 30);
      if (allAlpha && nonEmpty.length <= 2) continue;

      const record: NormalizedToolRecord = {
        manufacturer,
        category,
        sourcePage: table.page,
        rawHeader: table.header,
        confidence: baseConfidence,
      };

      let hasSignificantData = false;

      for (const [colIdx, fieldName] of colMap.entries()) {
        if (colIdx >= row.length) continue;
        const cellVal = row[colIdx].trim();
        if (!cellVal) continue;

        switch (fieldName) {
          case 'partNumber':
            if (looksLikePartNumber(cellVal)) {
              record.partNumber = cellVal;
              hasSignificantData = true;
            }
            break;
          case 'description':
            record.description = cellVal;
            break;
          case 'diameter': {
            const d = parseNumeric(cellVal);
            if (d !== undefined && d > 0 && d < 1000) {
              record.diameter = d;
              hasSignificantData = true;
            }
            break;
          }
          case 'length': {
            const l = parseNumeric(cellVal);
            if (l !== undefined && l > 0 && l < 5000) record.length = l;
            break;
          }
          case 'fluteLength': {
            const fl = parseNumeric(cellVal);
            if (fl !== undefined && fl > 0 && fl < 2000) record.fluteLength = fl;
            break;
          }
          case 'flutes': {
            const f = parseNumeric(cellVal);
            if (f !== undefined && f > 0 && f <= 100) record.flutes = Math.round(f);
            break;
          }
          case 'coating':
            if (cellVal.length < 50) record.coating = cellVal;
            break;
          case 'grade':
            if (cellVal.length < 50) record.grade = cellVal;
            break;
          case 'material':
            if (cellVal.length < 50) record.material = cellVal;
            break;
        }
      }

      // Only emit record if we got at least a part number or diameter
      if (hasSignificantData) {
        // Adjust confidence down if missing part number
        if (!record.partNumber) record.confidence = Math.max(record.confidence - 0.2, 0.1);
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Process a single JS catalog file and return normalization results.
   */
  analyzeFile(filePath: string): NormalizationResult {
    const catalog = this.parseCatalogFile(filePath);
    const result: NormalizationResult = {
      manufacturer: catalog.manufacturer,
      catalog: catalog.catalog,
      totalTables: catalog.tables.length,
      productTables: 0,
      skippedTables: 0,
      extractedRecords: 0,
      records: [],
      skippedReasons: {},
    };

    for (const table of catalog.tables) {
      const classification = this.classifyTable(table);

      if (classification !== 'product') {
        result.skippedTables++;
        result.skippedReasons[classification] = (result.skippedReasons[classification] || 0) + 1;
        continue;
      }

      result.productTables++;
      const records = this.extractRecords(table, catalog.manufacturer);
      result.records.push(...records);
      result.extractedRecords += records.length;
    }

    // Cache result
    this.results.set(catalog.manufacturer.toLowerCase(), result);

    return result;
  }

  /**
   * Process all 10 catalog files and return normalization results.
   */
  analyzeAllFiles(): NormalizationResult[] {
    const results: NormalizationResult[] = [];

    for (const file of CATALOG_FILES) {
      const fullPath = path.join(BASE_PATH, file);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[RawToolingNormalizerEngine] File not found: ${fullPath}`);
        continue;
      }
      try {
        const result = this.analyzeFile(fullPath);
        results.push(result);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[RawToolingNormalizerEngine] Error processing ${file}: ${msg}`);
      }
    }

    return results;
  }

  /**
   * Get summary statistics across all processed files.
   */
  getSummary(): NormalizationSummary {
    const byManufacturer: NormalizationSummary['byManufacturer'] = {};
    const skippedReasons: Record<string, number> = {};
    let totalTables = 0;
    let totalProductTables = 0;
    let totalSkippedTables = 0;
    let totalRecords = 0;

    for (const [key, result] of this.results.entries()) {
      totalTables += result.totalTables;
      totalProductTables += result.productTables;
      totalSkippedTables += result.skippedTables;
      totalRecords += result.extractedRecords;

      byManufacturer[result.manufacturer] = {
        tables: result.totalTables,
        productTables: result.productTables,
        records: result.extractedRecords,
      };

      for (const [reason, count] of Object.entries(result.skippedReasons)) {
        skippedReasons[reason] = (skippedReasons[reason] || 0) + count;
      }
    }

    return {
      totalFiles: this.results.size,
      totalTables,
      totalProductTables,
      totalSkippedTables,
      totalRecords,
      byManufacturer,
      skippedReasons,
    };
  }

  /**
   * Get all extracted records for a specific manufacturer.
   */
  getByManufacturer(name: string): NormalizedToolRecord[] {
    const key = name.toLowerCase();
    // Try exact match first
    const result = this.results.get(key);
    if (result) return result.records;

    // Try partial match
    for (const [k, v] of this.results.entries()) {
      if (k.includes(key) || v.manufacturer.toLowerCase().includes(key)) {
        return v.records;
      }
    }

    return [];
  }
}

export const rawToolingNormalizerEngine = new RawToolingNormalizerEngine();
