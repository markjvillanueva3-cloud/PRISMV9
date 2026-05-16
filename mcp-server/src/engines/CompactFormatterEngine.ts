/**
 * CompactFormatterEngine — Token-efficient output formatting
 *
 * Converts verbose data structures into compact, human-readable formats
 * optimized for LLM context windows. Reduces typical output by 60-80%.
 *
 * @version 1.0.0
 */

export interface CompactOptions {
  /** Max output length in characters (default: 2000) */
  maxChars?: number;
  /** Compression level: 'minimal' | 'standard' | 'verbose' */
  level?: "minimal" | "standard" | "verbose";
  /** Include field names (default: true for verbose, false for minimal) */
  includeKeys?: boolean;
}

export type Primitive = string | number | boolean | null | undefined;

export class CompactFormatterEngine {

  /**
   * Format an array of objects as a compact table string.
   * Input: [{name: "Foo", count: 5}, {name: "Bar", count: 3}]
   * Output: "Foo:5 | Bar:3"
   */
  table(data: Record<string, Primitive>[], keyField: string, valueField: string, sep = " | "): string {
    return data.map(row => `${row[keyField]}:${row[valueField]}`).join(sep);
  }

  /**
   * Format a record as "key=value" pairs, one per line or inline.
   */
  kvPairs(data: Record<string, Primitive>, inline = true): string {
    const pairs = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${v}`);
    return inline ? pairs.join(" ") : pairs.join("\n");
  }

  /**
   * Summarize an array: show first N items + "...and X more"
   */
  summarizeArray<T>(arr: T[], maxItems: number = 5, formatter?: (item: T) => string): string {
    const fmt = formatter || String;
    if (arr.length <= maxItems) {
      return arr.map(fmt).join(", ");
    }
    const shown = arr.slice(0, maxItems).map(fmt).join(", ");
    return `${shown} ...+${arr.length - maxItems} more`;
  }

  /**
   * Compact a deeply nested object into a flat summary.
   * Truncates strings, collapses arrays, limits depth.
   */
  compact(data: any, opts: CompactOptions = {}): string {
    const { maxChars = 2000, level = "standard" } = opts;
    const maxDepth = level === "minimal" ? 1 : level === "standard" ? 2 : 4;
    const maxStringLen = level === "minimal" ? 30 : level === "standard" ? 80 : 200;

    const result = this._compactValue(data, 0, maxDepth, maxStringLen);
    if (result.length > maxChars) {
      return result.slice(0, maxChars - 20) + `...[truncated ${result.length - maxChars + 20}ch]`;
    }
    return result;
  }

  /**
   * Format engine/dispatcher counts as a single compact line.
   */
  systemLine(counts: Record<string, number>): string {
    const abbrev: Record<string, string> = {
      engines: "E", dispatchers: "D", actions: "A", algorithms: "Alg",
      registries: "R", hooks: "H", test_files: "T", data_modules: "DM",
      formulas: "F", cadences: "C"
    };
    return Object.entries(counts)
      .map(([k, v]) => `${v}${abbrev[k] || k}`)
      .join("/");
  }

  /**
   * Compress a git diff stat output into a compact summary.
   */
  compactDiffStat(diffStat: string): string {
    const lines = diffStat.trim().split("\n");
    if (lines.length === 0) return "no changes";
    const summary = lines[lines.length - 1]; // Last line is the summary
    const fileLines = lines.slice(0, -1);
    if (fileLines.length <= 5) {
      return fileLines.map(l => l.trim().split("|")[0].trim()).join(", ") + ` (${summary.trim()})`;
    }
    return `${fileLines.length} files changed (${summary.trim()})`;
  }

  /**
   * Format test results into a compact string.
   * Input: "5848 passed, 1 failed, 11 skipped"
   * Output: "5848✓ 1✗ 11⊘"
   */
  compactTestResult(passed: number, failed: number, skipped: number = 0): string {
    const parts = [`${passed}✓`];
    if (failed > 0) parts.push(`${failed}✗`);
    if (skipped > 0) parts.push(`${skipped}⊘`);
    return parts.join(" ");
  }

  /**
   * Truncate a string intelligently (at word boundaries).
   */
  truncate(text: string, maxLen: number = 100): string {
    if (text.length <= maxLen) return text;
    const cut = text.lastIndexOf(" ", maxLen - 3);
    return text.slice(0, cut > maxLen / 2 ? cut : maxLen - 3) + "...";
  }

  // ── Private ──────────────────────────────────────────────────────

  private _compactValue(val: any, depth: number, maxDepth: number, maxStr: number): string {
    if (val === null || val === undefined) return "null";
    if (typeof val === "string") return val.length > maxStr ? val.slice(0, maxStr) + "..." : val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);

    if (Array.isArray(val)) {
      if (depth >= maxDepth) return `[${val.length} items]`;
      if (val.length === 0) return "[]";
      const items = val.slice(0, 5).map(v => this._compactValue(v, depth + 1, maxDepth, maxStr));
      const suffix = val.length > 5 ? ` +${val.length - 5}` : "";
      return `[${items.join(", ")}${suffix}]`;
    }

    if (typeof val === "object") {
      if (depth >= maxDepth) {
        const keys = Object.keys(val);
        return `{${keys.length} keys}`;
      }
      const entries = Object.entries(val).slice(0, 10);
      const pairs = entries.map(([k, v]) => `${k}:${this._compactValue(v, depth + 1, maxDepth, maxStr)}`);
      const suffix = Object.keys(val).length > 10 ? ` +${Object.keys(val).length - 10}` : "";
      return `{${pairs.join(", ")}${suffix}}`;
    }

    return String(val);
  }
}

export const compactFormatterEngine = new CompactFormatterEngine();
