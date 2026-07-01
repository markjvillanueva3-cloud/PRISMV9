/**
 * MaterialMarketPriceResolverEngine -- QUOTING-OPTIMAL-MS0 / U3 (live-ish material pricing)
 *
 * The operator asked to "utilize live real-world pricing by pulling up live market conditions."
 * A truly live commodity-API feed needs operator-provisioned keys + network (out of scope here,
 * flagged). What IS buildable now -- and is the honest, high-value interpretation -- is a UNIFIED
 * RESOLVER over PRISM's THREE existing material-price sources, returning the FRESHEST authoritative
 * $/in3 per grade WITH an explicit as-of date, provenance, and a STALENESS GATE so a quote never
 * silently costs material against a 6-month-old steel price.
 *
 * Sources (freshest/most-authoritative first), all already built (R8 -- composed, not rebuilt):
 *   1. AP-LEDGER COST BASIS (VendorCostIndexEngine.materialCostForVolume) -- what JM actually PAYS,
 *      density-free $/in3 from the $10M AP ledger. Most authoritative for JM-specific quoting.
 *   2. DOCUSTRATA PURCHASE PRIORS (DocuStrataMaterialPriorEngine.getUnitPrice) -- per-grade median
 *      from JM's own purchase documents.
 *   3. HISTORICAL COMMODITY (HistoricalMaterialPriceEngine.lookup) -- LME monthly $/lb, the public
 *      market signal, date-stamped + nearest-prior fallback.
 *
 * The resolver returns the first source that yields a usable price AND is within the staleness
 * window; if the freshest source is stale it falls through to the next, and flags `stale:true` +
 * `reason` when nothing fresh exists (R12 -- never silently use a stale price, never fabricate one).
 *
 * Deps are injected (the live impl wraps the three singletons) so this engine is pure + testable.
 *
 * @milestone QUOTING-OPTIMAL-MS0/U3-MATERIAL-MARKET-PRICE-RESOLVER
 * @author slot:juliett (build-it-all-here), 2026-06-30
 */

/** Max age (days) before a material price is flagged stale. Steel moves; ~90d is a safe quote window. */
export const DEFAULT_MAX_PRICE_AGE_DAYS = 90;

export type PriceSourceTag = "ap-ledger" | "docustrata-prior" | "commodity-lme" | "none";

/** A single source's answer for a grade. */
export interface SourcePrice {
  source: PriceSourceTag;
  usd_per_in3: number | null;
  as_of: string | null; // ISO date the price is dated to; null = undated (treated as freshest-unknown)
  confidence: number;    // 0..1
  detail?: string;
}

/** Injectable source deps -- live impl wraps the three existing engines. */
export interface MaterialPriceSources {
  apLedger(grade: string): SourcePrice | null;
  docustrataPrior(grade: string): SourcePrice | null;
  commodity(grade: string, isoDate: string): SourcePrice | null;
}

export interface ResolveOptions {
  /** Reference "today" ISO date for staleness math (injected -- Date.now is banned in pure core). */
  asOfDate: string;
  maxAgeDays?: number;
}

export interface ResolvedMaterialPrice {
  ok: boolean;
  grade: string;
  usd_per_in3: number | null;
  source: PriceSourceTag;
  as_of: string | null;
  age_days: number | null;
  stale: boolean;
  confidence: number;
  /** Every source's answer, for audit (R12 -- the resolution is never a black box). */
  considered: SourcePrice[];
  reason?: string;
}

function daysBetween(a: string, b: string): number | null {
  const ta = Date.parse(a), tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

export class MaterialMarketPriceResolverEngine {
  /**
   * Resolve the freshest in-window $/in3 for a grade across the three sources.
   * Priority order: ap-ledger -> docustrata-prior -> commodity. The first source that
   * yields a positive price within the staleness window wins. If none is fresh, the
   * freshest STALE price is returned with stale:true (so the caller can decide), and if
   * no source yields any price at all, ok:false (R12 -- never fabricate).
   */
  resolve(grade: string, sources: MaterialPriceSources, opts: ResolveOptions): ResolvedMaterialPrice {
    const maxAge = opts?.maxAgeDays ?? DEFAULT_MAX_PRICE_AGE_DAYS;
    const today = opts?.asOfDate;
    const g = String(grade ?? "").trim();

    const base: ResolvedMaterialPrice = {
      ok: false, grade: g, usd_per_in3: null, source: "none", as_of: null,
      age_days: null, stale: false, confidence: 0, considered: [],
    };
    if (!g) return { ...base, reason: "empty-grade" };
    if (!today || !Number.isFinite(Date.parse(today))) return { ...base, reason: "invalid-as-of-date" };

    const considered: SourcePrice[] = [];
    const ordered: Array<SourcePrice | null> = [
      safeCall(() => sources.apLedger(g)),
      safeCall(() => sources.docustrataPrior(g)),
      safeCall(() => sources.commodity(g, today)),
    ];

    let freshest: { sp: SourcePrice; age: number } | null = null; // best in-window
    let freshestStale: { sp: SourcePrice; age: number } | null = null; // fallback if all stale

    for (const sp of ordered) {
      if (!sp) continue;
      considered.push(sp);
      const price = sp.usd_per_in3;
      if (!(typeof price === "number" && Number.isFinite(price) && price > 0)) continue;

      // Undated source: treat as fresh (age 0) -- it carries no staleness signal.
      const age = sp.as_of ? daysBetween(sp.as_of, today) : 0;
      const effAge = age == null ? 0 : age;

      if (effAge <= maxAge && effAge >= 0) {
        // First in-window price wins (sources are already in priority order).
        if (!freshest) freshest = { sp, age: effAge };
        break;
      } else {
        // Stale candidate -- keep the LEAST stale as the fallback.
        if (!freshestStale || effAge < freshestStale.age) freshestStale = { sp, age: effAge };
      }
    }

    const pick = freshest ?? freshestStale;
    if (!pick) {
      return { ...base, considered, reason: "no-priced-source" };
    }
    const stale = !freshest;
    return {
      ok: true,
      grade: g,
      usd_per_in3: pick.sp.usd_per_in3,
      source: pick.sp.source,
      as_of: pick.sp.as_of,
      age_days: pick.age,
      stale,
      confidence: stale ? pick.sp.confidence * 0.5 : pick.sp.confidence, // halve confidence on stale
      considered,
      reason: stale ? `all-sources-stale; freshest is ${pick.age}d > ${maxAge}d window` : undefined,
    };
  }
}

function safeCall(fn: () => SourcePrice | null): SourcePrice | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export const materialMarketPriceResolverEngine = new MaterialMarketPriceResolverEngine();
