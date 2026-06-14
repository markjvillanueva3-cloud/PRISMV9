/**
 * HistoricalMaterialPriceEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM02
 *
 * Date → commodity price lookup. MS0 ships CSV-seeded LME monthly averages for
 * 4 spanning materials: A36 carbon steel, 6061 aluminum, C110 copper, 304 stainless.
 *
 * Lookup strategy:
 *   1. Exact (year-month) match → return price + source="exact"
 *   2. Nearest prior month within 12 months → return price + source="nearest-prior"
 *   3. No data within 12 months → return null + reason (R12 fail-loud)
 *
 * Real-time LME API integration is MS1; MS0 ships canonical historical baseline
 * for 2020-2026 to enable retrospective training on the JM Die archive.
 *
 * Per R5: pure CSV lookup + nearest-prior fallback. No LLM, no I/O at call time.
 *
 * @milestone JM-DIE-FINANCIAL-BASELINE-MS0/U-JM02-HISTORICAL-PRICE
 * @author slot:charlie /goal-14 iter1, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type Material = "steel_a36" | "aluminum_6061" | "copper_c110" | "stainless_304";

export interface PriceRecord {
  month_year: string; // YYYY-MM
  material: Material;
  price_per_lb_usd: number;
  source: string;
}

export interface PriceLookupResult {
  found: boolean;
  material: Material;
  query_month_year: string;
  price_per_lb_usd: number | null;
  match_month_year: string | null;
  match_type: "exact" | "nearest-prior" | "none";
  source: string;
  reason?: string;
}

// Resolve to <package_root>/data/price-history/ relative to this engine file.
// __filename equivalent for ESM that works after compile to dist/ too.
function resolveCsvPath(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // src/engines/ → ../data/price-history/  OR  dist/engines/ → ../data/price-history/
    return path.resolve(here, "../../data/price-history/lme-monthly-avg.csv");
  } catch {
    return path.resolve(process.cwd(), "data/price-history/lme-monthly-avg.csv");
  }
}
const DEFAULT_CSV_PATH = resolveCsvPath();
const MAX_FALLBACK_MONTHS = 12;

function parseCsv(content: string): PriceRecord[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const records: PriceRecord[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 4) continue;
    const month_year = cols[0].trim();
    const material = cols[1].trim() as Material;
    const price = parseFloat(cols[2]);
    const source = cols[3].trim();
    if (!Number.isFinite(price)) continue;
    if (!/^\d{4}-\d{2}$/.test(month_year)) continue;
    records.push({ month_year, material, price_per_lb_usd: price, source });
  }
  return records;
}

function monthsBetween(a: string, b: string): number {
  // a, b are YYYY-MM; returns (a - b) in months
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
}

function dateToMonthYear(isoDate: string): string | null {
  if (!isoDate || typeof isoDate !== "string") return null;
  const m = isoDate.match(/^(\d{4})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

export class HistoricalMaterialPriceEngine {
  private records: PriceRecord[] | null = null;
  private csvPath: string;

  constructor(csvPath?: string) {
    this.csvPath = csvPath ?? DEFAULT_CSV_PATH;
  }

  /** Lazy-load + cache. */
  private loadRecords(): PriceRecord[] {
    if (this.records) return this.records;
    if (!fs.existsSync(this.csvPath)) {
      this.records = [];
      return this.records;
    }
    try {
      const content = fs.readFileSync(this.csvPath, "utf8");
      this.records = parseCsv(content);
    } catch {
      this.records = [];
    }
    return this.records;
  }

  /** Allow tests to inject records inline (no I/O). */
  loadFromInline(records: PriceRecord[]): void {
    this.records = records;
  }

  /** Lookup price for material at given ISO date. */
  lookup(material: Material, isoDate: string): PriceLookupResult {
    const queryMonth = dateToMonthYear(isoDate);
    if (!queryMonth) {
      return {
        found: false, material, query_month_year: String(isoDate),
        price_per_lb_usd: null, match_month_year: null, match_type: "none",
        source: "engine", reason: "invalid-date-format-expected-YYYY-MM-DD",
      };
    }
    const records = this.loadRecords();
    const forMaterial = records.filter((r) => r.material === material);
    if (forMaterial.length === 0) {
      return {
        found: false, material, query_month_year: queryMonth,
        price_per_lb_usd: null, match_month_year: null, match_type: "none",
        source: "engine", reason: `no-price-data-for-material:${material}`,
      };
    }

    // Exact match
    const exact = forMaterial.find((r) => r.month_year === queryMonth);
    if (exact) {
      return {
        found: true, material, query_month_year: queryMonth,
        price_per_lb_usd: exact.price_per_lb_usd, match_month_year: exact.month_year,
        match_type: "exact", source: exact.source,
      };
    }

    // Nearest prior (within MAX_FALLBACK_MONTHS)
    const priors = forMaterial.filter((r) => monthsBetween(queryMonth, r.month_year) >= 0);
    if (priors.length === 0) {
      return {
        found: false, material, query_month_year: queryMonth,
        price_per_lb_usd: null, match_month_year: null, match_type: "none",
        source: "engine", reason: "no-prior-month-data-available",
      };
    }
    priors.sort((a, b) => monthsBetween(queryMonth, a.month_year) - monthsBetween(queryMonth, b.month_year));
    const best = priors[0];
    const gap = monthsBetween(queryMonth, best.month_year);
    if (gap > MAX_FALLBACK_MONTHS) {
      return {
        found: false, material, query_month_year: queryMonth,
        price_per_lb_usd: null, match_month_year: null, match_type: "none",
        source: "engine", reason: `nearest-prior-too-far:${gap}-months-back`,
      };
    }
    return {
      found: true, material, query_month_year: queryMonth,
      price_per_lb_usd: best.price_per_lb_usd, match_month_year: best.month_year,
      match_type: "nearest-prior", source: best.source,
    };
  }

  /** Enumerate all loaded materials (for introspection). */
  supportedMaterials(): Material[] {
    const records = this.loadRecords();
    return [...new Set(records.map((r) => r.material))] as Material[];
  }
}

export const historicalMaterialPriceEngine = new HistoricalMaterialPriceEngine();
