import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  vendorCatalogQuery,
  vendorComputeScorecard,
  vendorRank,
  type ErpVendorRole,
  type RankedVendor,
  type VendorCatalogFilter,
  type VendorRecord,
  type VendorScorecard,
} from '../api/vendorNetwork';
import { LoadingState, ErrorState } from '../components/LoadingState';

/**
 * VendorCatalogPage — browse charlie's ingested vendor-catalog corpus (VENDOR-NETWORK-MS0) and the
 * vendor-performance surface, then push a chosen vendor straight into purchasing. Distinct from
 * VendorScorecardPage (which scores already-known vendors) — this is the discovery/sourcing surface
 * over the 30+ ingested tool-maker / job-shop catalogs.
 *
 * Identity: Direction C (Indigo/Graphite, dark rail) per qb-parity-erp-ux-design-spec.md §4 —
 * indigo primary, violet accent, graphite surfaces; emerald is reserved for positive status only.
 */
type Tab = 'catalog' | 'performance';

const ROLE_OPTIONS: ReadonlyArray<{ value: '' | ErpVendorRole; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'purchasing-vendor', label: 'Purchasing (tools / consumables)' },
  { value: 'marketplace-supplier', label: 'Marketplace supplier (job shops)' },
  { value: 'equipment-vendor', label: 'Equipment (machine builders)' },
];

const TIER_STYLE: Record<string, string> = {
  preferred: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  approved: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  probation: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  disqualified: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

function pct(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';
}

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLE[tier] ?? 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${style}`}>
      {tier}
    </span>
  );
}

export function VendorCatalogPage() {
  const [tab, setTab] = useState<Tab>('catalog');

  // ── Catalog browse state ──
  const [filter, setFilter] = useState<VendorCatalogFilter>({});
  const [vendors, setVendors] = useState<VendorRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function runQuery(next: VendorCatalogFilter) {
    setLoading(true);
    setError(null);
    try {
      setVendors(await vendorCatalogQuery(next));
    } catch (e) {
      setError(e);
      setVendors(null);
    } finally {
      setLoading(false);
    }
  }

  // Load the full corpus once on mount so the page is never a blank screen (R5).
  // Intentional mount-only effect: runQuery is recreated each render but we only want the initial
  // unfiltered fetch here (subsequent fetches are user-driven via the form), so empty deps is correct.
  useEffect(() => {
    void runQuery({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed fetch; see comment above
  }, []);

  // ── Performance state ──
  const [ranked, setRanked] = useState<RankedVendor[] | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState<unknown>(null);
  const [scorecardId, setScorecardId] = useState('');
  const [scorecard, setScorecard] = useState<VendorScorecard | null>(null);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  async function loadRanking() {
    setRankLoading(true);
    setRankError(null);
    try {
      setRanked(await vendorRank({}));
    } catch (e) {
      setRankError(e);
    } finally {
      setRankLoading(false);
    }
  }

  async function lookupScorecard() {
    const id = scorecardId.trim();
    if (!id) return;
    setScorecardError(null);
    setScorecard(null);
    try {
      setScorecard(await vendorComputeScorecard({ vendor_id: id }));
    } catch (e) {
      // A < 3-PO vendor (or bad id) surfaces a BusinessDispatchError — show its actual reason,
      // never swallow it (R12). Normalize to a string so the message renders verbatim.
      setScorecardError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-50">Vendor Catalog</h1>
        <p className="text-sm text-slate-400">
          Source from the ingested vendor corpus — tool makers, consumable resellers, and job shops —
          then rank and push a vendor into purchasing.
        </p>
      </header>

      <nav className="flex gap-2" aria-label="Vendor catalog views">
        {(['catalog', 'performance'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {t === 'catalog' ? 'Catalog' : 'Performance'}
          </button>
        ))}
      </nav>

      {tab === 'catalog' && (
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              void runQuery(filter);
            }}
          >
            <input
              aria-label="Filter by category"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder="Category (e.g. drills)"
              value={filter.category ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value || undefined }))}
            />
            <input
              aria-label="Filter by region"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder="Region (e.g. US)"
              value={filter.region ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value || undefined }))}
            />
            <select
              aria-label="Filter by vendor role"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              value={filter.role ?? ''}
              onChange={(e) =>
                setFilter((f) => ({ ...f, role: (e.target.value || undefined) as ErpVendorRole | undefined }))
              }
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900">
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="accent-indigo-500"
                checked={filter.verifiedOnly ?? false}
                onChange={(e) => setFilter((f) => ({ ...f, verifiedOnly: e.target.checked || undefined }))}
              />
              Verified only
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search catalog'}
            </button>
          </form>

          {loading && <LoadingState label="Loading vendor corpus…" />}
          {error ? <ErrorState error={error} onRetry={() => void runQuery(filter)} /> : null}

          {!loading && !error && vendors && (
            <>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
              </p>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {vendors.map((v) => {
                  // Defensive: categories/regions are typed non-optional, but the corpus crosses an
                  // untyped network boundary (scraped catalogs) — guard against a malformed record.
                  const categories = v.categories ?? [];
                  const regions = v.regions ?? [];
                  // VendorRecord has no id; key on intrinsic identity, NOT the array index, so a
                  // filtered re-order does not remount the wrong card.
                  const key = `${v.name}|${v.source_tag ?? ''}|${v.website ?? ''}`;
                  // Only render a website link for an http(s) URL — a scraped `javascript:` href is XSS.
                  const safeWebsite = v.website && /^https?:\/\//i.test(v.website) ? v.website : null;
                  return (
                    <li
                      key={key}
                      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-50">{v.name}</div>
                          <div className="text-xs text-slate-400">{v.vendor_type}</div>
                        </div>
                        {v.verified ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                            Verified
                          </span>
                        ) : null}
                      </div>
                      {categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {categories.slice(0, 6).map((c) => (
                            <span key={c} className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        {regions.length > 0 ? regions.join(' · ') : 'region n/a'}
                        {v.source_tag ? ` · ${v.source_tag}` : ''}
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-sm">
                        {safeWebsite ? (
                          <a
                            href={safeWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-300 hover:text-indigo-200"
                          >
                            Website
                          </a>
                        ) : null}
                        <Link
                          to={`/purchase-orders?vendor=${encodeURIComponent(v.name)}&source=vendor-catalog`}
                          className="font-medium text-violet-300 hover:text-violet-200"
                        >
                          Create PO
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {vendors.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
                  No vendors match this filter. Try a broader category or clear the filters.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'performance' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Vendor ranking</h2>
              <button
                type="button"
                onClick={() => void loadRanking()}
                disabled={rankLoading}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rankLoading ? 'Ranking…' : 'Rank vendors'}
              </button>
            </div>
            {rankLoading && <LoadingState label="Ranking vendors…" />}
            {rankError ? <ErrorState error={rankError} onRetry={() => void loadRanking()} /> : null}
            {ranked && (
              <ol className="mt-3 space-y-2">
                {ranked.map((r, i) => (
                  <li
                    key={r.vendor_id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-slate-500">{i + 1}.</span>
                      <span className="font-medium text-slate-100">{r.vendor_id}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-slate-300">{pct(r.composite_score)}</span>
                      <TierBadge tier={r.tier} />
                    </span>
                  </li>
                ))}
                {ranked.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">No ranked vendors yet (need PO history).</li>
                )}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold text-slate-100">Scorecard lookup</h2>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                placeholder="Vendor ID"
                value={scorecardId}
                onChange={(e) => setScorecardId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void lookupScorecard();
                }}
              />
              <button
                type="button"
                onClick={() => void lookupScorecard()}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Compute
              </button>
            </div>
            {scorecardError ? (
              <ErrorState message={scorecardError} />
            ) : scorecard ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Vendor</dt>
                  <dd className="flex items-center gap-2 font-medium text-slate-100">
                    {scorecard.vendor_id}
                    <TierBadge tier={scorecard.tier} />
                  </dd>
                </div>
                <div className="flex justify-between"><dt className="text-slate-400">Composite</dt><dd className="tabular-nums text-indigo-300">{pct(scorecard.composite_score)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">On-time delivery</dt><dd className="tabular-nums">{pct(scorecard.on_time_delivery)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Quality acceptance</dt><dd className="tabular-nums">{pct(scorecard.quality_acceptance)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Responsiveness</dt><dd className="tabular-nums">{pct(scorecard.responsiveness)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Price competitiveness</dt><dd className="tabular-nums">{pct(scorecard.price_competitiveness)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">PO count / window</dt><dd className="tabular-nums">{scorecard.po_count} / {scorecard.evaluation_window_days}d</dd></div>
                {scorecard.rationale.length > 0 && (
                  <div className="pt-2">
                    <dt className="text-slate-400">Rationale</dt>
                    <dd className="mt-1 list-inside list-disc text-xs text-slate-400">
                      {scorecard.rationale.map((r, i) => (
                        <div key={i}>• {r}</div>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Enter a vendor ID to compute its performance scorecard.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default VendorCatalogPage;
