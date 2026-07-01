/**
 * CodeSystemIndexEngine -- DSL shortcode to path mapping for token savings
 *
 * Maps 1800+ PRISM files to compact codes (E0001, D01, A05, etc.)
 * Usage: resolve("E0001") -> full path, lookup("src/engines/QuickCalcEngine.ts") -> "E0423"
 * Saves ~50-200 tokens per file reference in conversation context.
 *
 * Categories: E=Engine, D=Dispatcher, A=Algorithm, S=Schema, H=Hook,
 *             U=Util, V=Validation, SV=Service, T=Test, C=Catalog,
 *             R=Root, M=Milestone, DOC=Docs, X=External
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";


export interface CodeEntry {
  code: string;
  path: string;
  name: string;
  category?: string;
}

export interface CodeSystemMeta {
  version: string;
  generated: string;
  total_codes: number;
  root: string;
}

export interface CodeSystemData {
  _meta: CodeSystemMeta;
  categories: Record<string, { label: string; prefix: string; count: number; dir?: string }>;
  codes: Record<string, CodeEntry>;
  reverse: Record<string, string>;
}

export class CodeSystemIndexEngine {
  private data: CodeSystemData | null = null;
  private loaded = false;

  private ensureLoaded(): CodeSystemData {
    if (this.data && this.loaded) return this.data;

    const indexPath = join(import.meta.dirname, "../../data/docs/CODE_SYSTEM_INDEX.json");
    if (!existsSync(indexPath)) {
      throw new Error("CODE_SYSTEM_INDEX.json not found -- run code index generator");
    }

    this.data = JSON.parse(readFileSync(indexPath, "utf-8")) as CodeSystemData;
    this.loaded = true;
    return this.data;
  }

  /** Resolve shortcode to full path. E.g. resolve("E0001") -> "src/engines/AHPEngine.ts" */
  resolve(code: string): CodeEntry | null {
    const data = this.ensureLoaded();
    return data.codes[code.toUpperCase()] ?? null;
  }

  /** Lookup path to get shortcode. E.g. lookup("src/engines/AHPEngine.ts") -> "E0001" */
  lookup(path: string): string | null {
    const data = this.ensureLoaded();
    if (data.reverse[path]) return data.reverse[path];
    const norm = path.replace(/\\/g, "/");
    if (data.reverse[norm]) return data.reverse[norm];
    for (const [p, code] of Object.entries(data.reverse)) {
      if (p.endsWith("/" + path) || p.endsWith(path)) return code;
    }
    return null;
  }

  /** Search codes by name pattern. E.g. search("Quick") -> [{code: "E0423", ...}] */
  search(pattern: string, limit = 20): CodeEntry[] {
    const data = this.ensureLoaded();
    const pat = pattern.toLowerCase();
    const results: CodeEntry[] = [];
    for (const entry of Object.values(data.codes)) {
      if (!entry.name || !entry.path) continue;
      if (entry.name.toLowerCase().includes(pat) || entry.path.toLowerCase().includes(pat)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /** List all codes in a category. E.g. listCategory("D") -> all dispatchers */
  listCategory(prefix: string): CodeEntry[] {
    const data = this.ensureLoaded();
    return Object.values(data.codes).filter(e => e.code && e.code.startsWith(prefix.toUpperCase()));
  }

  /** Get category summary */
  categories(): Record<string, { label: string; count: number }> {
    const data = this.ensureLoaded();
    const result: Record<string, { label: string; count: number }> = {};
    for (const [k, v] of Object.entries(data.categories)) {
      result[k] = { label: v.label, count: v.count };
    }
    return result;
  }

  /** Get metadata */
  meta(): CodeSystemMeta {
    return this.ensureLoaded()._meta;
  }

  /** Total number of codes */
  totalCodes(): number {
    return this.ensureLoaded()._meta.total_codes;
  }

  /** Batch resolve multiple codes */
  resolveMany(codes: string[]): Record<string, CodeEntry | null> {
    const result: Record<string, CodeEntry | null> = {};
    for (const code of codes) {
      result[code] = this.resolve(code);
    }
    return result;
  }

  /** Get compact representation for context loading */
  compact(): string {
    const data = this.ensureLoaded();
    const lines: string[] = ["PRISM DSL: " + data._meta.total_codes + " codes"];
    for (const [k, v] of Object.entries(data.categories)) {
      lines.push(k + ":" + v.label + "(" + v.count + ")");
    }
    return lines.join(" | ");
  }
}

export const codeSystemIndexEngine = new CodeSystemIndexEngine();
