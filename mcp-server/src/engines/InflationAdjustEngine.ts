/**
 * InflationAdjustEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP02
 *
 * Adjusts a historical USD amount from fromDate's purchasing power to
 * toDate's purchasing power using canonical BLS CPI-U (NSA) monthly index.
 *
 *   adjusted_usd = usd × (cpi_to / cpi_from)
 *
 * MS0 ships canonical 2020-2026 CPI-U seed. Real-time BLS API integration is MS1.
 *
 * Per CLAUDE.md R5: pure CSV lookup. Per R12: missing CPI data → explicit reason.
 *
 * @milestone JM-DIE-PROGRAM-ANALYSIS-MS0/U-JP02-INFLATION
 * @author slot:charlie /goal-15 iter1, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface CpiRecord {
  month_year: string;
  cpi_u: number;
  source: string;
}

export interface InflationAdjustResult {
  ok: boolean;
  reason?: string;
  from_date: string;
  to_date: string;
  original_usd: number;
  adjusted_usd: number;
  cpi_from: number | null;
  cpi_to: number | null;
  cpi_ratio: number | null;
}

function resolveCsvPath(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, "../../data/price-history/cpi-u-monthly.csv");
  } catch {
    return path.resolve(process.cwd(), "data/price-history/cpi-u-monthly.csv");
  }
}
const DEFAULT_CSV_PATH = resolveCsvPath();

function dateToMonthYear(isoDate: string): string | null {
  if (!isoDate || typeof isoDate !== "string") return null;
  const m = isoDate.match(/^(\d{4})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
}

function parseCsv(content: string): CpiRecord[] {
  const lines = content.trim().split(/\r?\n/);
  const out: CpiRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 3) continue;
    const cpi = parseFloat(cols[1]);
    if (!Number.isFinite(cpi)) continue;
    if (!/^\d{4}-\d{2}$/.test(cols[0])) continue;
    out.push({ month_year: cols[0].trim(), cpi_u: cpi, source: cols[2].trim() });
  }
  return out;
}

const MAX_FALLBACK_MONTHS = 12;

export class InflationAdjustEngine {
  private records: CpiRecord[] | null = null;
  private csvPath: string;

  constructor(csvPath?: string) {
    this.csvPath = csvPath ?? DEFAULT_CSV_PATH;
  }

  loadFromInline(records: CpiRecord[]): void {
    this.records = records;
  }

  private loadRecords(): CpiRecord[] {
    if (this.records) return this.records;
    if (!fs.existsSync(this.csvPath)) { this.records = []; return this.records; }
    try {
      this.records = parseCsv(fs.readFileSync(this.csvPath, "utf8"));
    } catch {
      this.records = [];
    }
    return this.records;
  }

  private lookupCpi(monthYear: string): { cpi: number; matched: string } | null {
    const records = this.loadRecords();
    if (records.length === 0) return null;
    const exact = records.find((r) => r.month_year === monthYear);
    if (exact) return { cpi: exact.cpi_u, matched: exact.month_year };
    // nearest prior within MAX_FALLBACK_MONTHS
    const priors = records.filter((r) => monthsBetween(monthYear, r.month_year) >= 0);
    if (priors.length === 0) return null;
    priors.sort((a, b) => monthsBetween(monthYear, a.month_year) - monthsBetween(monthYear, b.month_year));
    const best = priors[0];
    if (monthsBetween(monthYear, best.month_year) > MAX_FALLBACK_MONTHS) return null;
    return { cpi: best.cpi_u, matched: best.month_year };
  }

  adjust(usd: number, fromIsoDate: string, toIsoDate: string): InflationAdjustResult {
    const empty: InflationAdjustResult = {
      ok: false, from_date: fromIsoDate, to_date: toIsoDate, original_usd: usd,
      adjusted_usd: usd, cpi_from: null, cpi_to: null, cpi_ratio: null,
    };
    if (typeof usd !== "number" || !Number.isFinite(usd)) {
      return { ...empty, reason: "non-finite-usd" };
    }
    const fromMy = dateToMonthYear(fromIsoDate);
    const toMy = dateToMonthYear(toIsoDate);
    if (!fromMy || !toMy) {
      return { ...empty, reason: "invalid-date-format" };
    }
    const fromCpi = this.lookupCpi(fromMy);
    const toCpi = this.lookupCpi(toMy);
    if (!fromCpi) return { ...empty, reason: `no-cpi-data-for-from:${fromMy}` };
    if (!toCpi) return { ...empty, reason: `no-cpi-data-for-to:${toMy}` };
    const ratio = toCpi.cpi / fromCpi.cpi;
    return {
      ok: true,
      from_date: fromIsoDate,
      to_date: toIsoDate,
      original_usd: usd,
      adjusted_usd: Math.round(usd * ratio * 100) / 100,
      cpi_from: fromCpi.cpi,
      cpi_to: toCpi.cpi,
      cpi_ratio: Math.round(ratio * 10000) / 10000,
    };
  }
}

export const inflationAdjustEngine = new InflationAdjustEngine();
