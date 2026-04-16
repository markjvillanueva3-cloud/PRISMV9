/**
 * HyperMillOmCyclesExtractor — Parse omCycles.txt into a typed cycle catalog
 *
 * Reads the hyperVIEW omCycles.txt file which maps display names (as shown in
 * the hyperMILL UI cycle selector) to canonical cycle IDs used internally by
 * the hyperMILL post-processor and knowledge-capture pipeline.
 *
 * File format:
 *   ; comment lines (ignored)
 *   "Display Name" := "CATEGORY:Short Name"
 *
 * Categories found in the file:
 *   DR   — Drilling cycles
 *   2D   — 2D milling + 5-axis drilling (routed via 2D prefix) + probing + grinding
 *   TP   — Tapping / threading
 *   3D   — 3D milling
 *   5X   — 5-axis milling
 *   MT   — Mill-turn (Millturn)
 *   NC   — NC text
 *   3L   — 3D link
 *   5L   — 5-axis link
 *
 * @engine HyperMillOmCyclesExtractor
 * @shortcode E1170
 * @dispatcher camDispatcher
 * @actions hypermill_extract_om_cycles
 * @milestone HM-KC-MS0/U-HKC02
 */

import * as fs from "node:fs/promises";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CycleMapping {
  /** Display name as shown in hyperMILL UI, e.g. "3D Curve Milling" */
  displayName: string;
  /** Canonical cycle ID used by hyperMILL internally, e.g. "3D:Curve Milling" */
  canonicalId: string;
  /** Category prefix extracted from canonicalId, e.g. "3D" */
  category: string;
  /** Short name after the category prefix, e.g. "Curve Milling" */
  shortName: string;
}

export interface CycleCatalog {
  /** All cycle mappings in file order */
  mappings: CycleMapping[];
  /** Mappings grouped by category key */
  categories: Record<string, CycleMapping[]>;
  /** Total number of mapping entries parsed */
  totalMappings: number;
  /** ISO 8601 timestamp of extraction */
  extractedAt: string;
}

// ── Regex ─────────────────────────────────────────────────────────────────────

/**
 * Matches lines of the form:
 *   "Display Name"   := "CATEGORY:Short Name"
 * Captures group 1 = display name, group 2 = canonical id.
 */
const MAPPING_RE = /^\s*"([^"]+)"\s*:=\s*"([^"]+)"\s*$/;

// ── Engine ────────────────────────────────────────────────────────────────────

export class HyperMillOmCyclesExtractor {
  private readonly filePath: string;

  constructor(
    filePath = "H:/prism/HYPERMILL/hyperVIEW/33.0/core/omCycles.txt"
  ) {
    this.filePath = filePath;
  }

  /**
   * Read and parse the omCycles.txt file.
   *
   * @returns A fully-populated CycleCatalog with all mappings and categories.
   * @throws Error if the file cannot be read or contains no valid mappings.
   */
  async extract(): Promise<CycleCatalog> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, "utf-8");
    } catch (err) {
      throw new Error(
        `HyperMillOmCyclesExtractor: cannot read "${this.filePath}": ${String(err)}`
      );
    }

    const lines = raw.split(/\r?\n/);
    const mappings: CycleMapping[] = [];

    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (parsed !== null) {
        mappings.push(parsed);
      }
    }

    if (mappings.length === 0) {
      throw new Error(
        `HyperMillOmCyclesExtractor: no valid mappings found in "${this.filePath}"`
      );
    }

    const categories = this.categorize(mappings);

    return {
      mappings,
      categories,
      totalMappings: mappings.length,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Parse a single line from omCycles.txt.
   *
   * Returns null for comment lines (starting with `;`), blank lines, and any
   * line that does not match the `"Display" := "ID"` pattern.
   *
   * @param line - Raw text line from the file.
   * @returns A CycleMapping if the line is a valid mapping entry, otherwise null.
   */
  parseLine(line: string): CycleMapping | null {
    // Skip comments and blank lines quickly
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith(";")) {
      return null;
    }

    const match = MAPPING_RE.exec(line);
    if (!match) {
      return null;
    }

    const displayName = match[1].trim();
    const canonicalId = match[2].trim();

    // Extract category: everything before the first ":"
    const colonIndex = canonicalId.indexOf(":");
    if (colonIndex === -1) {
      // Malformed canonical id — skip
      return null;
    }

    const category = canonicalId.slice(0, colonIndex);
    const shortName = canonicalId.slice(colonIndex + 1).trim();

    return { displayName, canonicalId, category, shortName };
  }

  /**
   * Group an array of CycleMappings by their category key.
   *
   * @param mappings - Flat list of all parsed cycle mappings.
   * @returns A record mapping each category string to its CycleMappings.
   */
  categorize(mappings: CycleMapping[]): Record<string, CycleMapping[]> {
    const result: Record<string, CycleMapping[]> = {};
    for (const m of mappings) {
      if (!result[m.category]) {
        result[m.category] = [];
      }
      result[m.category].push(m);
    }
    return result;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const hyperMillOmCyclesExtractor = new HyperMillOmCyclesExtractor();
