/**
 * VendorCostIndexEngine — QUOTING-SYNERGY-MS0 / U-QP-COST-BASIS-WIRE (slot:charlie 2026-06-01)
 *
 * Reads the persisted JM vendor cost-basis index (`state/shared/quoting/jm-vendor-cost-index.json`,
 * built from 20,736 real AP line-items — $10.02M net spend, 174 vendors) and exposes per-category
 * unit-cost priors + vendor spend lookups to the quote cost-decomposition path.
 *
 * WHY: until this engine the cost-index was a BUILT-BUT-UNWIRED data artifact — zero consumers
 * (the QUOTING-DATA-INDEX "consumed by should_cost/secondary-ops/..." note was aspirational).
 * The index is the COST-BASIS half of the quoting data ceiling (what JM PAYS vendors); the
 * OUTBOUND half (what JM charges = the calibration target) stays OCR-locked (xray pipeline).
 * This engine makes the cost-basis usable so should-cost decomposition can ground on REAL
 * category medians instead of guessed defaults.
 *
 * SAFETY: NO inline shop-rate / margin / physics constants. Every cost number returned is READ
 * from the data file (derived from real invoices), never hardcoded. The only literals are the
 * quote-slot→category name map and the file-resolution walk-up depth.
 *
 * Fail-soft: a missing/unreadable/corrupt index returns an empty shape (ok:false), never throws —
 * a quote path that consumes a prior must degrade to its own default, not crash.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type CostCategory =
  | "material"
  | "outside-process"
  | "freight-shipping"
  | "tooling-consumable"
  | "inspection-quality"
  | "overhead-utility"
  | "misc";

export interface UnitCostStat {
  min: number;
  median: number;
  max: number;
  n: number;
}

export interface CategoryPrior {
  category: string;
  count: number;
  spend: number;
  vendorCount: number;
  unitCost: UnitCostStat | null;
}

export interface CostIndexTotals {
  records: number;
  grossSpend: number;
  creditTotal: number;
  netSpend: number;
  vendorCount: number;
}

export interface VendorSpend {
  name: string;
  count: number;
  spend: number;
  categories: Record<string, number>;
  firstDate?: string;
  lastDate?: string;
}

export interface CostIndexLoadResult {
  ok: boolean;
  path: string | null;
  schemaVersion: string | null;
  totals: CostIndexTotals;
  categories: Record<string, CategoryPrior>;
  vendors: Record<string, VendorSpend>;
}

const DEFAULT_REL = "state/shared/quoting/jm-vendor-cost-index.json";
// U-QP-COST-BASIS-NORMALIZE (2026-06-12): the units-CORRECT companion artifact --
// per-grade $/in3 from the same AP ledger, density-free, block-only consumable.
const MATERIAL_BASIS_REL = "state/shared/quoting/jm-material-cost-basis.json";
const WALK_UP_DEPTH = 8;

// Quote-time cost slot → cost-index category. Accepts both snake_case and the index's own
// hyphenated keys so a caller can pass whichever it has. Pure name mapping (no cost values).
const QUOTE_SLOT_TO_CATEGORY: Record<string, CostCategory> = {
  material: "material",
  outside_process: "outside-process",
  "outside-process": "outside-process",
  outsource: "outside-process",
  freight: "freight-shipping",
  shipping: "freight-shipping",
  "freight-shipping": "freight-shipping",
  tooling: "tooling-consumable",
  consumable: "tooling-consumable",
  "tooling-consumable": "tooling-consumable",
  inspection: "inspection-quality",
  quality: "inspection-quality",
  "inspection-quality": "inspection-quality",
  overhead: "overhead-utility",
  utility: "overhead-utility",
  "overhead-utility": "overhead-utility",
  misc: "misc",
};

function emptyTotals(): CostIndexTotals {
  return { records: 0, grossSpend: 0, creditTotal: 0, netSpend: 0, vendorCount: 0 };
}

function emptyResult(path: string | null): CostIndexLoadResult {
  return { ok: false, path, schemaVersion: null, totals: emptyTotals(), categories: {}, vendors: {} };
}

/** Best-effort resolution of the index file: walk up from cwd, then from this module's dir. */
function resolveRelPath(rel: string): string | null {
  const roots: string[] = [];
  let d = process.cwd();
  for (let i = 0; i < WALK_UP_DEPTH; i++) {
    roots.push(d);
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  try {
    let m = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < WALK_UP_DEPTH; i++) {
      roots.push(m);
      const up = dirname(m);
      if (up === m) break;
      m = up;
    }
  } catch {
    /* import.meta unavailable in this runtime — cwd candidates suffice */
  }
  for (const r of roots) {
    const candidate = join(r, rel);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
function autoResolveIndexPath(): string | null {
  return resolveRelPath(DEFAULT_REL);
}

/** Units-correct per-grade material cost basis (from jm-material-cost-basis.json). */
export interface MaterialGradeBasis {
  grade: string;
  usd_per_in3: number | null;   // CONSUMABLE: block-form median; null when only advisory data
  confidence: "high" | "low-n" | "none";
  block_n: number;
  round_advisory_median: number | null;
}
/** Result of costing a known part volume against the grade basis. */
export interface MaterialCostForVolume {
  ok: boolean;
  grade: string;
  volume_in3: number;
  usd_per_in3: number | null;
  material_cost_usd: number | null;
  confidence: "high" | "low-n" | "none";
  reason?: string;
}

/** Ordinal rank for the basis confidence tiers (none < low-n < high). Used to
 *  gate `materialCostForVolume` against a caller-supplied minimum confidence. */
const CONF_RANK: Record<MaterialGradeBasis["confidence"], number> = { none: 0, "low-n": 1, high: 2 };

export class VendorCostIndexEngine {
  private cache: { path: string; result: CostIndexLoadResult } | null = null;
  private materialBasisCache: { path: string; grades: Record<string, MaterialGradeBasis> } | null = null;

  /**
   * Load + cache the cost index. `indexPath` overrides auto-resolution (tests pass the real
   * path explicitly so they never depend on cwd). Fail-soft on missing/corrupt file.
   */
  load(indexPath?: string): CostIndexLoadResult {
    const path = indexPath ?? autoResolveIndexPath();
    if (path && this.cache && this.cache.path === path) return this.cache.result;
    if (!path || !existsSync(path)) return emptyResult(path ?? null);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return emptyResult(path);
    }
    const j = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const t = j.totals && typeof j.totals === "object" ? j.totals : {};
    const totals: CostIndexTotals = {
      records: Number(t.records) || 0,
      grossSpend: Number(t.grossSpend) || 0,
      creditTotal: Number(t.creditTotal) || 0,
      netSpend: Number(t.netSpend) || 0,
      vendorCount: Number(t.vendorCount) || 0,
    };
    const categories: Record<string, CategoryPrior> = {};
    if (j.categories && typeof j.categories === "object") {
      for (const [name, v] of Object.entries(j.categories as Record<string, any>)) {
        const uc = v && typeof v.unitCost === "object" && v.unitCost ? v.unitCost : null;
        categories[name] = {
          category: name,
          count: Number(v?.count) || 0,
          spend: Number(v?.spend) || 0,
          vendorCount: Number(v?.vendorCount) || 0,
          unitCost: uc
            ? { min: Number(uc.min) || 0, median: Number(uc.median) || 0, max: Number(uc.max) || 0, n: Number(uc.n) || 0 }
            : null,
        };
      }
    }
    const vendors: Record<string, VendorSpend> = {};
    if (j.vendors && typeof j.vendors === "object" && !Array.isArray(j.vendors)) {
      for (const [name, v] of Object.entries(j.vendors as Record<string, any>)) {
        vendors[name] = {
          name,
          count: Number(v?.count) || 0,
          spend: Number(v?.spend) || 0,
          categories: v?.categories && typeof v.categories === "object" ? v.categories : {},
          firstDate: typeof v?.firstDate === "string" ? v.firstDate : undefined,
          lastDate: typeof v?.lastDate === "string" ? v.lastDate : undefined,
        };
      }
    }
    const result: CostIndexLoadResult = {
      ok: true,
      path,
      schemaVersion: typeof j.schemaVersion === "string" ? j.schemaVersion : null,
      totals,
      categories,
      vendors,
    };
    this.cache = { path, result };
    return result;
  }

  /**
   * Per-category prior ({count, spend, vendorCount, unitCost{min,median,max,n}}) or null if absent.
   *
   * ⚠ UNITS WARNING (U-QP-COST-BASIS-CONSUME finding, 2026-06-01 — R12 + units-first rail):
   * `unitCost.median` is a BLENDED-ACROSS-HETEROGENEOUS-UNITS line-item statistic, NOT a clean
   * per-unit price. Verified against the AP ledger: within `material`, rows mix $/bar ($157 @ qty1),
   * $/foot ($1.46 @ qty202), $/piece ($51 @ qty8) and per-order; `outside-process` rows are
   * per-ORDER with the real piece-count buried in the free-text description ("38PCS"); freight is
   * sometimes mis-categorized into material. So a category median ($3.39 material / $3.25
   * outside-process) is a coarse spend-analysis central tendency — **DO NOT inject it into a
   * customer quote as a per-unit cost** (that is a units error). SAFE uses: spend / vendor-
   * concentration analysis, cold-start sanity range, advisory context. A unit-safe per-quote prior
   * requires the AP ledger to be NORMALIZED first (parse units + piece-counts from descriptions,
   * de-mix freight) — a data (juliett) prerequisite, the corrected U-QP-COST-BASIS-CONSUME path.
   */
  getCategoryPrior(category: string | null | undefined, indexPath?: string): CategoryPrior | null {
    if (typeof category !== "string" || !category) return null;
    const { categories } = this.load(indexPath);
    return categories[category] ?? null;
  }

  /**
   * Load the units-correct per-grade material cost basis (jm-material-cost-basis.json,
   * produced by scripts/material-cost-basis-normalize.mjs). UNLIKE getCategoryPrior's
   * units-blended median, `usd_per_in3` here is a clean density-free $/in3 (block-form,
   * exact volume) -- the gotcha #25 units-correct path. Fail-soft: missing/corrupt -> {}.
   */
  loadMaterialCostBasis(basisPath?: string): Record<string, MaterialGradeBasis> {
    const path = basisPath ?? resolveRelPath(MATERIAL_BASIS_REL);
    if (path && this.materialBasisCache && this.materialBasisCache.path === path) return this.materialBasisCache.grades;
    if (!path || !existsSync(path)) return {};
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return {};
    }
    const j = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const src = j.grades && typeof j.grades === "object" ? (j.grades as Record<string, any>) : {};
    const grades: Record<string, MaterialGradeBasis> = {};
    for (const [rawGrade, v] of Object.entries(src)) {
      // Normalize the artifact key the SAME way getMaterialGradeBasis normalizes a
      // query (dash/space-stripped, upper) so a hyphenated artifact key (H-13) and
      // a hyphenated query both resolve. The normalizer already emits normalized
      // keys, so this is defensive hardening against a hand-edited/foreign artifact.
      const grade = rawGrade.toUpperCase().replace(/[-\s]/g, "");
      const per = v?.usd_per_in3;
      const conf = v?.confidence;
      grades[grade] = {
        grade,
        usd_per_in3: typeof per === "number" && Number.isFinite(per) ? per : null,
        confidence: conf === "high" || conf === "low-n" ? conf : "none",
        block_n: Number(v?.block_n) || 0,
        round_advisory_median: typeof v?.round_advisory_median === "number" && Number.isFinite(v.round_advisory_median) ? v.round_advisory_median : null,
      };
    }
    this.materialBasisCache = { path, grades };
    return grades;
  }

  /** Per-grade material basis (case-insensitive, dash/space-stripped) or null. */
  getMaterialGradeBasis(grade: string | null | undefined, basisPath?: string): MaterialGradeBasis | null {
    if (typeof grade !== "string" || !grade) return null;
    const key = grade.toUpperCase().replace(/[-\s]/g, "");
    const grades = this.loadMaterialCostBasis(basisPath);
    return grades[key] ?? null;
  }

  /**
   * Cost a known part volume against the per-grade basis. CONSERVATIVE: returns a
   * material_cost ONLY when the grade has a CONSUMABLE (block-derived, confidence
   * != "none") $/in3 -- a `none`/advisory-only grade returns ok:false (the caller
   * must fall back to its own default, never to the units-ambiguous round figure).
   * No inline constants -- all $ read from the artifact.
   */
  materialCostForVolume(
    grade: string | null | undefined,
    volumeIn3: number,
    basisPath?: string,
    opts?: { minConfidence?: "high" | "low-n" },
  ): MaterialCostForVolume {
    const g = typeof grade === "string" ? grade.toUpperCase().replace(/[-\s]/g, "") : "";
    const base: MaterialCostForVolume = { ok: false, grade: g, volume_in3: volumeIn3, usd_per_in3: null, material_cost_usd: null, confidence: "none" };
    if (!g) return { ...base, reason: "no-grade" };
    if (!(Number.isFinite(volumeIn3) && volumeIn3 > 0)) return { ...base, reason: "bad-volume" };
    const b = this.getMaterialGradeBasis(g, basisPath);
    if (!b) return { ...base, reason: "grade-not-in-basis" };
    // `!(>0)` also rejects a malformed high-confidence artifact row with a 0 / negative /
    // NaN usd_per_in3 -> never let a non-positive material cost reach a caller that trusts
    // ok:true alone (defense-in-depth; the InstantQuote callsite re-guards too).
    if (b.confidence === "none" || b.usd_per_in3 == null || !(b.usd_per_in3 > 0)) return { ...base, confidence: b.confidence, reason: "advisory-only-not-consumable" };
    // U-QP-CONSUME-FMV-DEDUP: confidence floor. Default "low-n" preserves prior
    // behavior (any non-"none" grade is consumable). Customer-facing callers
    // (InstantQuoteEngine) pass minConfidence:"high" so low-n AP-ledger outliers
    // (e.g. D2 block_n=2 -> $251/in3, ~40x other tool steels) are REFUSED here
    // rather than re-gated inline at every call site. usd_per_in3 is surfaced on
    // a below-floor refusal (informative) but material_cost_usd stays null (ok:false).
    const minConf = opts?.minConfidence ?? "low-n";
    if (CONF_RANK[b.confidence] < CONF_RANK[minConf]) {
      return { ...base, confidence: b.confidence, usd_per_in3: b.usd_per_in3, reason: "below-min-confidence" };
    }
    return {
      ok: true,
      grade: g,
      volume_in3: volumeIn3,
      usd_per_in3: b.usd_per_in3,
      material_cost_usd: b.usd_per_in3 * volumeIn3,
      confidence: b.confidence,
    };
  }

  /** List of category names present in the index. */
  listCategories(indexPath?: string): string[] {
    return Object.keys(this.load(indexPath).categories);
  }

  /** Index totals (record count, gross/net spend, vendor count). */
  getTotals(indexPath?: string): CostIndexTotals {
    return this.load(indexPath).totals;
  }

  /** Case-insensitive vendor spend lookup, or null. */
  getVendorSpend(name: string | null | undefined, indexPath?: string): VendorSpend | null {
    if (typeof name !== "string" || !name) return null;
    const { vendors } = this.load(indexPath);
    if (vendors[name]) return vendors[name];
    const lc = name.trim().toLowerCase();
    for (const v of Object.values(vendors)) {
      if (v.name.toLowerCase() === lc) return v;
    }
    return null;
  }

  /** Map a quote-time cost slot (material/outside_process/freight/tooling/inspection/overhead) to its index category. */
  categoryForQuoteSlot(slot: string | null | undefined): CostCategory | null {
    if (typeof slot !== "string" || !slot) return null;
    return QUOTE_SLOT_TO_CATEGORY[slot.trim().toLowerCase()] ?? null;
  }

  /** Convenience for the dispatcher: a category's prior, or all priors + totals when no category given. */
  prior(params: { category?: string; indexPath?: string } = {}): {
    ok: boolean;
    totals: CostIndexTotals;
    category?: string;
    prior?: CategoryPrior | null;
    categories?: Record<string, CategoryPrior>;
    path: string | null;
  } {
    const loaded = this.load(params.indexPath);
    if (params.category) {
      return {
        ok: loaded.ok,
        totals: loaded.totals,
        category: params.category,
        prior: loaded.categories[params.category] ?? null,
        path: loaded.path,
      };
    }
    return { ok: loaded.ok, totals: loaded.totals, categories: loaded.categories, path: loaded.path };
  }
}

export const vendorCostIndexEngine = new VendorCostIndexEngine();
