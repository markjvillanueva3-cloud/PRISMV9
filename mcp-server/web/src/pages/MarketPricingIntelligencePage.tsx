/**
 * MarketPricingIntelligencePage -- OPERATOR-INTERNAL market pricing intelligence (U-MKTPRICE01).
 *
 * Surfaces two ADMIN-ONLY pricing priors that bracket a quote:
 *   Panel A -- Outbound SOLD-price prior (sell-side market): the shop's real sold-price distribution
 *              mined from jm-sold-orders. Confidence-gated, OCR-noisy, ADVISORY ONLY. Answers
 *              "what have we actually charged for work like this?"
 *   Panel B -- AP COST-index prior (cost-side): the shop's internal procurement cost basis per
 *              category. Answers "what does the raw material/service actually cost us?"
 *
 * HARD BOUNDARY (charlie soul refuse-list): the cost-index prior is COST BASIS. This page is
 * OPERATOR-INTERNAL only -- it emits no quote, computes no margin, and passes no cost-basis value to
 * any packet / share-token / public-quote flow. It only READS the priors and displays them; nothing
 * flows outward. The two backend verbs are admin-gated (verifyToken + requireRole("admin")); a
 * non-admin session yields null -> this page renders an auth-required state.
 *
 * UNITS CAVEAT (cost-index): unitCost.median BLENDS $/bar + $/foot + $/piece across a category --
 * shown ONLY with the inline "units-blended" caveat for spend-concentration / cold-start range
 * context, NEVER as a clean per-unit cost.
 *
 * Design per web/CLAUDE.md: dark-HUD aesthetic, monospace numerics, 5-color status palette,
 * >=44pt tap targets, token references (no inline hex beyond the established page-base values).
 *
 * @milestone QUOTING / U-MKTPRICE01
 * @author slot:charlie, 2026-06-23
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  outboundPricePrior,
  costIndexPrior,
  type PricePriorResult,
  type PriceDistribution,
  type OrderConfidence,
  type CostIndexPriorResult,
  type CategoryPrior,
} from '../api/client';

// ------------------------------------------------------------------------
// Formatting helpers (pure)
// ------------------------------------------------------------------------

/** USD formatter; '--' for null/non-finite so a missing prior never renders NaN. */
function usd(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '--';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

/** Integer count; '--' for null. */
function intOf(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '--';
  return Math.round(v).toLocaleString('en-US');
}

/** Percent of a [0,1] fraction; '--' for null. */
function pct(frac: number | null | undefined): string {
  if (typeof frac !== 'number' || !Number.isFinite(frac)) return '--';
  return `${(frac * 100).toFixed(1)}%`;
}

const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace';
const CHROME = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';

/** OCR floor-spike threshold: when a distribution's minMassFrac exceeds this, warn the low tail is
 * likely OCR "$1" artifacts (matches the engine's own >0.25 warn signature). */
const FLOOR_SPIKE_THRESHOLD = 0.25;

// ------------------------------------------------------------------------
// Shared local UI (matches the QuotingCalibrationHealthPage dark-HUD idiom)
// ------------------------------------------------------------------------

const TONE_CARD: Record<string, string> = {
  emerald: 'border-emerald-400/30 from-emerald-500/15',
  cyan: 'border-cyan-400/30 from-cyan-500/15',
  violet: 'border-violet-400/30 from-violet-500/15',
  amber: 'border-amber-400/30 from-amber-500/15',
  red: 'border-red-400/30 from-red-500/15',
};

function StatusCard({ tone, label, value, hint }: { tone: string; label: string; value: string; hint: string }) {
  return (
    <div className={`rounded-md border bg-gradient-to-br to-transparent ${TONE_CARD[tone] ?? TONE_CARD.cyan} p-4`}>
      <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-slate-50 mt-1" style={{ fontFamily: MONO }}>{value}</div>
      <div className="text-xs text-slate-400 mt-1 truncate" title={hint}>{hint}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-md border border-slate-600/30 bg-[#1a1c23] p-4 md:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-400 mt-1">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** Always-on advisory banner for the outbound prior (it is OCR-noisy + advisory by construction). */
function AdvisoryBanner({ advisoryOnly, caveat }: { advisoryOnly: boolean; caveat: string | null }) {
  return (
    <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <span className="font-semibold">{advisoryOnly ? 'Advisory only' : 'Reference'}</span>
      {' -- '}
      {caveat ?? 'Real outbound sold-price distribution (OCR-noisy market prior). Treat as a directional reference, not a quote.'}
    </div>
  );
}

/** OCR floor-spike warning -- shown iff a distribution's minMassFrac exceeds the threshold. */
function FloorSpikeWarning({ dist, label }: { dist: PriceDistribution; label: string }) {
  if (dist.minMassFrac <= FLOOR_SPIKE_THRESHOLD) return null;
  return (
    <div className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      {pct(dist.minMassFrac)} of {label} values sit at the {usd(dist.min)} floor -- likely OCR &quot;$1&quot;
      artifacts. Treat the low tail (p5/p10/min) with suspicion.
    </div>
  );
}

/** Render one PriceDistribution as a compact percentile table; null -> honest empty row. */
function DistributionTable({ title, dist }: { title: string; dist: PriceDistribution | null }) {
  if (!dist) {
    return (
      <div className="rounded-md border border-slate-600/20 bg-[#0f1014] p-3">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">{title}</div>
        <div className="text-sm text-slate-500 italic">No data (no qualifying orders at this confidence gate).</div>
      </div>
    );
  }
  const rows: Array<[string, number]> = [
    ['min', dist.min], ['p5', dist.p5], ['p10', dist.p10], ['p25', dist.p25],
    ['median', dist.median], ['p75', dist.p75], ['p90', dist.p90], ['p95', dist.p95],
    ['max', dist.max], ['mean', dist.mean],
  ];
  return (
    <div className="rounded-md border border-slate-600/20 bg-[#0f1014] p-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-slate-400">{title}</div>
        <div className="text-xs text-slate-500" style={{ fontFamily: MONO }}>n={intOf(dist.n)}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1" style={{ fontFamily: MONO }}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-slate-500">{k}</span>
            <span className={k === 'median' ? 'text-emerald-300 font-semibold' : 'text-slate-200'}>{usd(v)}</span>
          </div>
        ))}
      </div>
      <FloorSpikeWarning dist={dist} label={title.toLowerCase()} />
    </div>
  );
}

const CONFIDENCE_TIERS: OrderConfidence[] = ['high', 'medium', 'low', 'none'];

// ------------------------------------------------------------------------
// Panel A -- Outbound sold-price prior (sell-side market)
// ------------------------------------------------------------------------

function OutboundPriorPanel() {
  const [minConfidence, setMinConfidence] = useState<OrderConfidence>('high');
  const [data, setData] = useState<PricePriorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (conf: OrderConfidence) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await outboundPricePrior({ minConfidence: conf });
      // null = admin-gate rejection (not authorized) OR malformed body -> auth-required state.
      if (res === null) { setAuthBlocked(true); setData(null); }
      else { setAuthBlocked(false); setData(res); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(minConfidence); }, [load, minConfidence]);

  return (
    <Panel
      title="Outbound Sold-Price Prior"
      subtitle="The shop's REAL sold-price distribution (jm-sold-orders). Sell-side market reference -- what we have actually charged."
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-400 mr-1">Min confidence</span>
        {CONFIDENCE_TIERS.map((tier) => (
          <button
            key={tier}
            onClick={() => setMinConfidence(tier)}
            className={`h-11 md:h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
              minConfidence === tier
                ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-600/30 bg-[#0f1014] text-slate-300 hover:bg-slate-700/30'
            }`}
            style={{ transition: '0.18s ease' }}
          >
            {tier}
          </button>
        ))}
        {loading ? <span className="text-xs text-slate-500 ml-2">Loading...</span> : null}
      </div>

      {authBlocked ? (
        <div className="rounded-md border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          This prior is admin-only. Sign in with an operator/admin account to view the shop's real
          outbound sold-price distribution.
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Error: {err}
        </div>
      ) : !data ? (
        <div className="text-sm text-slate-400 italic py-2">Loading prior...</div>
      ) : !data.ok ? (
        <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No prior available ({data.caveat ?? 'no qualifying outbound orders at this confidence gate'}).
        </div>
      ) : (
        <>
          <AdvisoryBanner advisoryOnly={data.advisoryOnly} caveat={data.caveat} />
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatusCard tone="cyan" label="Included orders" value={intOf(data.includedOrders)} hint={`of ${intOf(data.recordsAvailable)} available`} />
            <StatusCard tone="violet" label="Processed" value={intOf(data.ordersProcessed)} hint={`gate: >= ${data.minConfidence}`} />
            <StatusCard tone="emerald" label="Confirmed ext. revenue" value={usd(data.confirmedExtRevenue)} hint="sum of confirmed line revenue" />
            <StatusCard tone="amber" label="Advisory" value={data.advisoryOnly ? 'YES' : 'REF'} hint="OCR-noisy market prior" />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <DistributionTable title="Unit price" dist={data.unitPrice} />
            <DistributionTable title="Ext price" dist={data.extPrice} />
            <DistributionTable title="Order total" dist={data.orderTotal} />
          </div>

          <div className="rounded-md border border-slate-600/20 bg-[#0f1014] p-3">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Orders by confidence</div>
            <div className="grid grid-cols-4 gap-2" style={{ fontFamily: MONO }}>
              {CONFIDENCE_TIERS.map((tier) => (
                <div key={tier} className="flex flex-col">
                  <span className="text-xs text-slate-500">{tier}</span>
                  <span className="text-base text-slate-200">{intOf(data.byConfidence[tier])}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------------
// Panel B -- AP cost-index prior (cost-side)
// ------------------------------------------------------------------------

/** Top-N categories by spend; pure sort, no mutation of the source map. */
function topCategoriesBySpend(categories: Record<string, CategoryPrior> | undefined, n: number): CategoryPrior[] {
  if (!categories) return [];
  return Object.values(categories).sort((a, b) => b.spend - a.spend).slice(0, n);
}

function CostIndexPanel() {
  const [category, setCategory] = useState('');
  const [data, setData] = useState<CostIndexPriorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    setErr(null);
    try {
      const params = cat.trim() ? { category: cat.trim() } : {};
      const res = await costIndexPrior(params);
      if (res === null) { setAuthBlocked(true); setData(null); }
      else { setAuthBlocked(false); setData(res); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all-categories totals on mount.
  useEffect(() => { void load(''); }, [load]);

  const topCats = useMemo(() => topCategoriesBySpend(data?.categories, 8), [data]);

  return (
    <Panel
      title="AP Cost-Index Prior"
      subtitle="The shop's INTERNAL procurement cost basis (jm-vendor-cost-index). Cost-side reference -- what the raw material/service costs us. OPERATOR-INTERNAL: never on a customer quote."
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          inputMode="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(category); }}
          placeholder="category (blank = all)"
          className="h-11 md:h-9 px-3 rounded-md border border-slate-600/30 bg-[#0f1014] text-slate-200 text-sm w-56"
          style={{ fontFamily: MONO }}
        />
        <button
          onClick={() => void load(category)}
          disabled={loading}
          className="h-11 md:h-9 px-4 rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 font-medium text-sm"
          style={{ transition: '0.18s ease' }}
        >
          {loading ? 'Loading...' : 'Query'}
        </button>
      </div>

      {authBlocked ? (
        <div className="rounded-md border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          This prior is admin-only. Sign in with an operator/admin account to view the shop's internal
          AP cost basis.
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Error: {err}
        </div>
      ) : !data ? (
        <div className="text-sm text-slate-400 italic py-2">Loading cost index...</div>
      ) : !data.ok ? (
        <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No cost-index data available (path: {data.path ?? 'unresolved'}).
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatusCard tone="cyan" label="Records" value={intOf(data.totals.records)} hint="line items in the index" />
            <StatusCard tone="emerald" label="Net spend" value={usd(data.totals.netSpend)} hint="gross minus credits" />
            <StatusCard tone="violet" label="Gross spend" value={usd(data.totals.grossSpend)} hint="before credits" />
            <StatusCard tone="amber" label="Credits" value={usd(data.totals.creditTotal)} hint="returns / credits" />
            <StatusCard tone="cyan" label="Vendors" value={intOf(data.totals.vendorCount)} hint="distinct vendors" />
          </section>

          {/* Single-category view (when a category was queried) */}
          {data.category ? (
            <CategoryDetail prior={data.prior ?? null} category={data.category} />
          ) : (
            <div className="rounded-md border border-slate-600/20 bg-[#0f1014] p-3">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-slate-400">Top categories by spend</div>
                <div className="text-xs text-slate-500">{topCats.length} of {data.categories ? Object.keys(data.categories).length : 0}</div>
              </div>
              {topCats.length === 0 ? (
                <div className="text-sm text-slate-500 italic">No categories.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ fontFamily: MONO }}>
                    <thead>
                      <tr className="text-slate-500 text-left border-b border-slate-700/40">
                        <th className="py-1 pr-3 font-normal">category</th>
                        <th className="py-1 px-3 font-normal text-right">spend</th>
                        <th className="py-1 px-3 font-normal text-right">count</th>
                        <th className="py-1 px-3 font-normal text-right">vendors</th>
                        <th className="py-1 pl-3 font-normal text-right">unit-cost median*</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCats.map((c) => (
                        <tr key={c.category} className="border-b border-slate-800/40">
                          <td className="py-1.5 pr-3 text-slate-200" style={{ fontFamily: CHROME }}>{c.category}</td>
                          <td className="py-1.5 px-3 text-right text-emerald-300">{usd(c.spend)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-300">{intOf(c.count)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-300">{intOf(c.vendorCount)}</td>
                          <td className="py-1.5 pl-3 text-right text-slate-400">{c.unitCost ? usd(c.unitCost.median) : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <UnitsBlendedCaveat />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/** Detail view for a single queried category. */
function CategoryDetail({ prior, category }: { prior: CategoryPrior | null; category: string }) {
  if (!prior) {
    return (
      <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        No cost-index data for category &quot;{category}&quot;.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-slate-600/20 bg-[#0f1014] p-3">
      <div className="text-xs uppercase tracking-widest text-slate-400 mb-2" style={{ fontFamily: CHROME }}>{prior.category}</div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatusCard tone="emerald" label="Spend" value={usd(prior.spend)} hint={`${intOf(prior.count)} line items`} />
        <StatusCard tone="cyan" label="Vendors" value={intOf(prior.vendorCount)} hint="distinct in category" />
        <StatusCard tone="violet" label="Unit-cost median*" value={prior.unitCost ? usd(prior.unitCost.median) : '--'} hint="units-blended (see below)" />
        <StatusCard tone="amber" label="Unit-cost range*" value={prior.unitCost ? `${usd(prior.unitCost.min)} - ${usd(prior.unitCost.max)}` : '--'} hint={prior.unitCost ? `n=${intOf(prior.unitCost.n)}` : 'no unit-cost obs'} />
      </section>
      <UnitsBlendedCaveat />
    </div>
  );
}

/** The mandatory units-blended caveat -- unitCost blends $/bar + $/foot + $/piece across a category. */
function UnitsBlendedCaveat() {
  return (
    <div className="mt-2 text-xs text-amber-300/80">
      * Unit-cost blends $/bar + $/foot + $/piece across the category -- use for spend-concentration /
      cold-start range context, NOT as a clean per-unit cost.
    </div>
  );
}

// ------------------------------------------------------------------------
// Page
// ------------------------------------------------------------------------

export function MarketPricingIntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-100 p-4 md:p-8" style={{ fontFamily: CHROME }}>
      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400">Quoting Operations -- internal</div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mt-1 [font-family:var(--font-display)]">Market Pricing Intelligence</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl">
          Two admin-only priors that bracket a quote: the shop's REAL outbound sold-price distribution
          (sell-side market) and the internal AP cost basis (cost-side). Sanity-check a quote against
          reality. Cost basis is operator-internal -- it never reaches a customer quote, packet, or
          share link.
        </p>
      </header>

      <OutboundPriorPanel />
      <CostIndexPanel />
    </div>
  );
}

export default MarketPricingIntelligencePage;
