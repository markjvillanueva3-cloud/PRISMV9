/**
 * DocuStrataMaterialPriorEngine — extract material-cost priors from JM Die's
 * DocuStrata document manifest and expose a per-grade unit-price lookup.
 *
 * QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-MATERIAL-PRIOR (slot:charlie iter53 2026-05-26).
 *
 * iter51's survey of the 111,745-doc DocuStrata manifest found 47 typed
 * docs (4 invoices + 43 inbound quotes) carrying 195 material line items,
 * $228K total spend. Vendors: Michigan Carbide Technologies, Griggs Steel,
 * Cincinnati Tool Steel, Specialty Metals, Creative Carbide.
 *
 * This engine parses those line items and exposes:
 *
 *   - getUnitPrice(grade, geometryClass?)  → median + p25/p75 unit price USD
 *   - getMaterialSpendBracket(grade)        → low/median/high per-job
 *   - listGrades()                          → all recognized material grades
 *   - getEvidence(grade)                    → raw line items for audit
 *
 * Grade normalization (per iter48's material-name taxonomy):
 *   M25, M20, M30 → carbide grade family
 *   A2, D2, H13, O1, S7 → tool steel grades
 *   M-3, M-2 → high-speed steel grades
 *   1018, 4140, 4340 → carbon steel
 *
 * Pure stateless engine — manifest path injected via DI for tests. Caches
 * parsed evidence after first load; manifest is large (~30 MB) so re-parse
 * is expensive. Cache is invalidated when a new manifestPath is passed.
 *
 * Wires into:
 *   - QuotingMaterialBridgeEngine (iter44) — replaces ISO_GROUP_USD_PER_KG_DEFAULT
 *     placeholder with real JM Die supplier evidence per grade.
 *   - QuoteEstimatorEngine (downstream) — replaces $75 substrate placeholder
 *     with real per-job material spend bracket.
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";

// ─── Named constants ───────────────────────────────────────────────────────

/** Default manifest path — JM Die's DocuStrata export root. */
export const DEFAULT_MANIFEST_PATH = resolve(process.cwd(), "Docustrata/manifest.json");

/** Per-grade aggregation thresholds — grades with fewer evidence rows than
 *  this don't have credible per-grade priors, fall back to family/global. */
const MIN_EVIDENCE_ROWS_PER_GRADE = 2;

/** Per-job material spend bracket multiplier — typical die job uses 1-3
 *  blanks. The bracket multiplies the unit-price distribution by these
 *  bounds to produce a per-job estimate. */
const PER_JOB_BLANKS_LOW = 1;
const PER_JOB_BLANKS_HIGH = 3;
const PER_JOB_BLANKS_MEDIAN = 2;

/** Quantile helpers — pure utility functions, no external dep. */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p)));
  return sortedAsc[idx];
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** Raw line item extracted from a DocuStrata invoice or quote. */
export interface MaterialLineItem {
  grade: string;             // canonical normalized grade (M25, A2, etc.)
  raw_description: string;   // original description for audit
  unit_price_usd: number;
  quantity: number;
  total_usd: number;
  vendor: string;
  date: string | null;
  doc_id: string;
}

/** Aggregated per-grade prior — what callers actually consume. */
export interface GradePrior {
  grade: string;
  evidence_count: number;
  unit_price_usd: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
  };
  total_spend_observed_usd: number;
  vendors: string[];
  per_job_spend_bracket_usd: {
    low: number;     // 1 blank at p25
    median: number;  // 2 blanks at median
    high: number;    // 3 blanks at p75
  };
}

export interface PriorSummary {
  manifest_path: string;
  total_line_items: number;
  total_spend_usd: number;
  distinct_grades: number;
  generated_at: string;
}

// ─── Grade normalizer ──────────────────────────────────────────────────────

/**
 * Normalize a free-text material/grade string to a canonical token. Returns
 * null when no recognizable grade is present (drops the line item from
 * aggregation rather than fabricating a bucket).
 *
 * Order is significant — more-specific patterns FIRST so "M25 C/G" doesn't
 * match the generic "M2" rule.
 */
export function normalizeGrade(description: string, parsedGrade?: string): string | null {
  // If the extractor already parsed a grade field, trust it (post-validation).
  if (parsedGrade && typeof parsedGrade === "string") {
    const p = parsedGrade.trim().toUpperCase();
    if (/^(M20|M25|M30|M40|A2|D2|D6|H13|O1|S7|M-?2|M-?3|1018|1045|4140|4340)$/i.test(p)) {
      return p.replace(/-/g, "");
    }
  }
  const d = (description || "").toUpperCase();
  // Carbide grades — M20/M25/M30/M40
  if (/(?<![A-Z0-9])M40(?![A-Z0-9])/.test(d)) return "M40";
  if (/(?<![A-Z0-9])M30(?![A-Z0-9])/.test(d)) return "M30";
  if (/(?<![A-Z0-9])M25(?![A-Z0-9])/.test(d)) return "M25";
  if (/(?<![A-Z0-9])M20(?![A-Z0-9])/.test(d)) return "M20";
  // Tool steel — A2/D2/D6/H13/O1/S7
  if (/(?<![A-Z0-9])D6(?![A-Z0-9])/.test(d)) return "D6";
  if (/(?<![A-Z0-9])D2(?![A-Z0-9])/.test(d)) return "D2";
  if (/(?<![A-Z0-9])H13(?![A-Z0-9])/.test(d)) return "H13";
  if (/(?<![A-Z0-9])A2(?![A-Z0-9])/.test(d)) return "A2";
  if (/(?<![A-Z0-9])O1(?![A-Z0-9])/.test(d)) return "O1";
  if (/(?<![A-Z0-9])S7(?![A-Z0-9])/.test(d)) return "S7";
  // HSS — M-2 / M-3
  if (/(?<![A-Z0-9])M-?3(?![A-Z0-9])/.test(d)) return "M3";
  if (/(?<![A-Z0-9])M-?2(?![A-Z0-9])/.test(d)) return "M2";
  // Carbon steel
  if (/(?<![A-Z0-9])4340(?![A-Z0-9])/.test(d)) return "4340";
  if (/(?<![A-Z0-9])4140(?![A-Z0-9])/.test(d)) return "4140";
  if (/(?<![A-Z0-9])1045(?![A-Z0-9])/.test(d)) return "1045";
  if (/(?<![A-Z0-9])1018(?![A-Z0-9])/.test(d)) return "1018";
  return null;
}

// ─── Extraction ────────────────────────────────────────────────────────────

/**
 * Walk a DocuStrata manifest object and yield every parseable material
 * line item. Pure — accepts the parsed manifest, returns the list.
 *
 * Manifest shape (from `Docustrata/manifest.json`):
 *   { documents: [ { document_type, extracted_data: {
 *       date, vendor:{name}, line_items: [
 *         { unit_price, quantity, amount, description, parsed:{grade,...} }
 *       ]
 *   } } ] }
 */
export function extractLineItems(manifest: unknown): MaterialLineItem[] {
  const m = manifest as { documents?: Array<{
    id?: string;
    document_type?: string;
    extracted_data?: {
      date?: string;
      vendor?: { name?: string };
      line_items?: Array<{
        unit_price?: number;
        quantity?: number;
        amount?: number;
        description?: string;
        parsed?: { grade?: string };
      }>;
    };
  }> };
  const docs = m.documents ?? [];
  const items: MaterialLineItem[] = [];
  for (const d of docs) {
    if (d.document_type !== "invoice" && d.document_type !== "quote") continue;
    const ed = d.extracted_data;
    if (!ed) continue;
    const lineItems = ed.line_items ?? [];
    for (const li of lineItems) {
      if (typeof li.unit_price !== "number" || li.unit_price <= 0) continue;
      if (typeof li.quantity !== "number" || li.quantity <= 0) continue;
      const grade = normalizeGrade(li.description ?? "", li.parsed?.grade);
      if (!grade) continue;
      items.push({
        grade,
        raw_description: li.description ?? "",
        unit_price_usd: li.unit_price,
        quantity: li.quantity,
        total_usd: typeof li.amount === "number" ? li.amount : li.unit_price * li.quantity,
        vendor: ed.vendor?.name ?? "unknown",
        date: ed.date ?? null,
        doc_id: d.id ?? "",
      });
    }
  }
  return items;
}

/**
 * Aggregate line items into per-grade priors. Pure.
 */
export function aggregateGradePriors(items: MaterialLineItem[]): Map<string, GradePrior> {
  const byGrade = new Map<string, MaterialLineItem[]>();
  for (const it of items) {
    const list = byGrade.get(it.grade) ?? [];
    list.push(it);
    byGrade.set(it.grade, list);
  }
  const priors = new Map<string, GradePrior>();
  for (const [grade, list] of byGrade) {
    if (list.length < MIN_EVIDENCE_ROWS_PER_GRADE) continue;
    const prices = list.map((i) => i.unit_price_usd).sort((a, b) => a - b);
    const median = percentile(prices, 0.5);
    const p25 = percentile(prices, 0.25);
    const p75 = percentile(prices, 0.75);
    const vendors = [...new Set(list.map((i) => i.vendor))];
    priors.set(grade, {
      grade,
      evidence_count: list.length,
      unit_price_usd: {
        min: round2(prices[0]),
        p25: round2(p25),
        median: round2(median),
        p75: round2(p75),
        max: round2(prices[prices.length - 1]),
      },
      total_spend_observed_usd: round2(list.reduce((s, i) => s + i.total_usd, 0)),
      vendors,
      per_job_spend_bracket_usd: {
        low: round2(PER_JOB_BLANKS_LOW * p25),
        median: round2(PER_JOB_BLANKS_MEDIAN * median),
        high: round2(PER_JOB_BLANKS_HIGH * p75),
      },
    });
  }
  return priors;
}

// ─── Engine class ──────────────────────────────────────────────────────────

interface CachedPriors {
  manifestPath: string;
  items: MaterialLineItem[];
  priors: Map<string, GradePrior>;
  summary: PriorSummary;
}

export class DocuStrataMaterialPriorEngine {
  private static cache: CachedPriors | null = null;

  /**
   * Load (and cache) priors from the manifest. Subsequent calls with the
   * same manifestPath return the cached priors; a different path invalidates
   * the cache and reloads.
   */
  static async load(manifestPath?: string): Promise<CachedPriors> {
    const path = manifestPath ?? DEFAULT_MANIFEST_PATH;
    if (this.cache && this.cache.manifestPath === path) return this.cache;
    const raw = await fs.readFile(path, "utf8");
    const manifest = JSON.parse(raw);
    const items = extractLineItems(manifest);
    const priors = aggregateGradePriors(items);
    const summary: PriorSummary = {
      manifest_path: path,
      total_line_items: items.length,
      total_spend_usd: round2(items.reduce((s, i) => s + i.total_usd, 0)),
      distinct_grades: priors.size,
      generated_at: new Date().toISOString(),
    };
    this.cache = { manifestPath: path, items, priors, summary };
    return this.cache;
  }

  /** Look up the unit-price distribution for a given grade. Returns null
   *  when the grade has insufficient evidence. */
  static async getUnitPrice(grade: string, manifestPath?: string): Promise<GradePrior["unit_price_usd"] | null> {
    const loaded = await this.load(manifestPath);
    const p = loaded.priors.get(grade.toUpperCase());
    return p ? p.unit_price_usd : null;
  }

  /** Look up the per-job material spend bracket for a given grade. */
  static async getMaterialSpendBracket(grade: string, manifestPath?: string): Promise<GradePrior["per_job_spend_bracket_usd"] | null> {
    const loaded = await this.load(manifestPath);
    const p = loaded.priors.get(grade.toUpperCase());
    return p ? p.per_job_spend_bracket_usd : null;
  }

  /** List all grades with credible priors (≥ MIN_EVIDENCE_ROWS evidence). */
  static async listGrades(manifestPath?: string): Promise<string[]> {
    const loaded = await this.load(manifestPath);
    return [...loaded.priors.keys()].sort();
  }

  /** Raw evidence rows for a grade — for audit + debug. */
  static async getEvidence(grade: string, manifestPath?: string): Promise<MaterialLineItem[]> {
    const loaded = await this.load(manifestPath);
    return loaded.items.filter((i) => i.grade === grade.toUpperCase());
  }

  /** Summary of the entire prior store. */
  static async getSummary(manifestPath?: string): Promise<PriorSummary> {
    const loaded = await this.load(manifestPath);
    return loaded.summary;
  }

  /** Reset the in-process cache (test affordance + manual invalidation). */
  static resetCache(): void {
    this.cache = null;
  }

  /** Expose tunables for test introspection. */
  static readonly MIN_EVIDENCE_ROWS_PER_GRADE = MIN_EVIDENCE_ROWS_PER_GRADE;
  static readonly PER_JOB_BLANKS = Object.freeze({
    LOW: PER_JOB_BLANKS_LOW,
    MEDIAN: PER_JOB_BLANKS_MEDIAN,
    HIGH: PER_JOB_BLANKS_HIGH,
  });
}

export const docuStrataMaterialPriorEngine = DocuStrataMaterialPriorEngine;
export default docuStrataMaterialPriorEngine;
