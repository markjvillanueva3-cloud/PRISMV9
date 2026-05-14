import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  purchasingManufacturers,
  purchasingRecommend,
  purchasingSearch,
  purchasingSummary,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { PurchasingRecommendation, SupplierResult } from '../api/types';
import { buildCapturePath } from '../utils/captureRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';
import { AppwPurchasingCopilot } from '../components/puoa/AppwPurchasingCopilot';

type PurchasingTab = 'search' | 'recommend' | 'summary';

function money(value: number | undefined): string {
  return value != null ? `$${value.toFixed(2)}` : '$0.00';
}

function formatRefreshLabel(timestamp: number | null): string {
  if (!timestamp) {
    return 'Not refreshed in this session';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function humanizeSummaryKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatSummaryValue(value: unknown) {
  if (value == null) {
    return 'Unavailable';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatSummaryValue(entry)).join(', ');
  }

  return JSON.stringify(value);
}

function readSummaryNumber(summaryData: unknown, keys: string[]) {
  if (!summaryData || typeof summaryData !== 'object' || Array.isArray(summaryData)) {
    return null;
  }

  for (const key of keys) {
    const value = (summaryData as Record<string, unknown>)[key];
    if (typeof value === 'number') {
      return value;
    }
  }

  return null;
}

function readSummaryString(summaryData: unknown, keys: string[]) {
  if (!summaryData || typeof summaryData !== 'object' || Array.isArray(summaryData)) {
    return '';
  }

  for (const key of keys) {
    const value = (summaryData as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return '';
}

function SourcePostureCard({
  label,
  source,
  refreshedAt,
  selection,
  unavailableReason,
}: {
  label: string;
  source: string;
  refreshedAt: number | null;
  selection: string;
  unavailableReason?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 font-semibold text-slate-100">{source}</div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            unavailableReason
              ? 'border-amber-300/22 bg-amber-300/[0.10] text-amber-50'
              : 'border-emerald-300/22 bg-emerald-300/[0.10] text-emerald-50'
          }`}
        >
          {unavailableReason ? 'Unavailable' : 'Mounted'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>Last refresh: {formatRefreshLabel(refreshedAt)}</div>
        <div>Selection: {selection}</div>
      </div>
      {unavailableReason ? (
        <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3 text-xs leading-5 text-amber-50">
          Unavailable reason: {unavailableReason}
        </div>
      ) : null}
    </div>
  );
}

function parsePurchasingTab(value: string | null): PurchasingTab {
  return value === 'recommend' || value === 'summary' ? value : 'search';
}

export function PurchasingPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const [tab, setTab] = useState<PurchasingTab>(() => parsePurchasingTab(routeParams.get('tab')));
  const [suppliers, setSuppliers] = useState<SupplierResult[]>([]);
  const [recommendations, setRecommendations] = useState<PurchasingRecommendation[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState(() => routeParams.get('material') || '6061-T6');
  const [query, setQuery] = useState(() => routeParams.get('query') || '');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [searchRefreshedAt, setSearchRefreshedAt] = useState<number | null>(null);
  const [recommendRefreshedAt, setRecommendRefreshedAt] = useState<number | null>(null);
  const [summaryRefreshedAt, setSummaryRefreshedAt] = useState<number | null>(null);
  const [searchIssue, setSearchIssue] = useState<string | null>(null);
  const [recommendIssue, setRecommendIssue] = useState<string | null>(null);
  const [summaryIssue, setSummaryIssue] = useState<string | null>(null);

  useEffect(() => {
    setTab(parsePurchasingTab(routeParams.get('tab')));
    setMaterial(routeParams.get('material') || '6061-T6');
    setQuery(routeParams.get('query') || '');
  }, [routeParams]);

  const launcherSource = routeParams.get('source') || '';
  const upstreamSource = routeContext.origin.source;
  const sourceContext = launcherSource || upstreamSource;
  const upstreamCommercialSource = upstreamSource && upstreamSource !== sourceContext ? upstreamSource : '';
  const sourceContextLabel = useMemo(() => formatWorkflowSourceLabel(sourceContext), [sourceContext]);
  const upstreamSourceLabel = useMemo(() => formatWorkflowSourceLabel(upstreamCommercialSource), [upstreamCommercialSource]);
  const activeTab = useMemo(() => {
    switch (tab) {
      case 'recommend':
        return {
          label: 'Recommendations',
          detail: 'Validate best-fit supplier scoring, then decide whether to buy, negotiate, or hold for more field evidence.',
        };
      case 'summary':
        return {
          label: 'Market Summary',
          detail: 'Read the broader market posture before a buyer commits to a supplier path or alternate manufacturer.',
        };
      default:
        return {
          label: 'Supplier Search',
          detail: 'Build a live supplier field first so recommendation and market posture have something concrete to compare.',
        };
    }
  }, [tab]);
  const upstreamRecordLabel = useMemo(() => {
    if (!routeContext.origin.recordType && !routeContext.origin.recordId) {
      return '';
    }

    if (routeContext.origin.recordType && routeContext.origin.recordId) {
      return `${routeContext.origin.recordType} ${routeContext.origin.recordId}`;
    }

    return routeContext.origin.recordType || routeContext.origin.recordId;
  }, [routeContext.origin.recordId, routeContext.origin.recordType]);
  const sourcingReference = routeContext.origin.customer || upstreamRecordLabel || material;
  const effectiveContinuityNote =
    routeContext.origin.note || `Carry sourcing posture for ${material} into receiving, capture, and supplier follow-up.`;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'purchasing',
            recordType: 'Material',
            recordId: material,
            customer: '',
            note: effectiveContinuityNote,
            threadId: '',
          },
    [effectiveContinuityNote, material, routeContext.origin],
  );
  const effectiveFocus = routeContext.focus.id ? routeContext.focus : undefined;
  const inventoryHandoffPath = useMemo(
    () =>
      buildWorkflowPath('/inventory', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'purchasing',
          tab: 'documents',
          material,
          supplier: recommendations[0]?.supplier_name,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, material, recommendations],
  );
  const messagesHandoffPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'purchasing',
          material,
          supplier: recommendations[0]?.supplier_name,
          note: `Follow up on sourcing posture for ${material}${recommendations[0]?.supplier_name ? ` with ${recommendations[0].supplier_name}` : ''} and keep the commercial origin attached.`,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, material, recommendations],
  );
  const captureHandoffPath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'purchasing',
        target: 'inventory',
        department: 'Purchasing',
        note: `Capture supplier certs, stock condition, quotes, and sourcing evidence for ${material}.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          material,
          supplier: recommendations[0]?.supplier_name,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, material, recommendations],
  );

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setSearchIssue(null);
    try {
      const response = await purchasingSearch({ material, query });
      setSuppliers((((response.result as any)?.suppliers ?? response.result ?? []) as SupplierResult[]));
      setSearchRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Supplier search failed';
      setError(message);
      setSearchIssue(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend() {
    setLoading(true);
    setError(null);
    setRecommendIssue(null);
    try {
      const response = await purchasingRecommend({ material });
      setRecommendations((((response.result as any)?.recommendations ?? response.result ?? []) as PurchasingRecommendation[]));
      setRecommendRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Failed to get purchasing recommendations';
      setError(message);
      setRecommendIssue(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummary() {
    setLoading(true);
    setError(null);
    setSummaryIssue(null);
    try {
      const [summaryResponse, manufacturerResponse] = await Promise.all([
        purchasingSummary(),
        purchasingManufacturers({ material }),
      ]);
      setSummaryData(summaryResponse.result);
      setManufacturers((((manufacturerResponse.result as any)?.manufacturers ?? manufacturerResponse.result ?? []) as any[]));
      setSummaryRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Failed to load purchasing summary';
      setError(message);
      setSummaryIssue(message);
    } finally {
      setLoading(false);
    }
  }

  const bestRecommendation = recommendations[0];
  const supplierCount = suppliers.length;
  const averageLead = supplierCount
    ? suppliers.reduce((sum, supplier) => sum + supplier.lead_time_days, 0) / supplierCount
    : 0;
  const marketPosture = readSummaryString(summaryData, ['market_posture', 'marketPosture', 'posture']) || 'Pending';
  const marketLeadDays = readSummaryNumber(summaryData, ['average_lead_days', 'averageLeadDays', 'lead_days']);
  const marketSupplierCount = readSummaryNumber(summaryData, ['supplier_count', 'supplierCount', 'sources']);
  const marketSpend = readSummaryNumber(summaryData, ['spend', 'monthly_spend', 'monthlySpend']);
  const summaryFields = useMemo(() => {
    if (!summaryData || typeof summaryData !== 'object' || Array.isArray(summaryData)) {
      return [] as Array<{ key: string; label: string; value: string }>;
    }

    return Object.entries(summaryData as Record<string, unknown>).map(([key, value]) => ({
      key,
      label: humanizeSummaryKey(key),
      value: formatSummaryValue(value),
    }));
  }, [summaryData]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Vendor intelligence"
        title="Purchasing"
        description="Search the supplier field, compare lead-time posture, and surface the best-fit vendor path for the material you need to buy."
        metrics={
          <>
            <SummaryTile label="Suppliers" value={`${supplierCount}`} hint="Search results currently loaded into the vendor board." />
            <SummaryTile label="Best score" value={bestRecommendation ? `${bestRecommendation.score}/100` : '—'} hint="Top recommendation score for the active material." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="Average lead" value={supplierCount ? `${averageLead.toFixed(1)}d` : '—'} hint="Mean lead time across the active supplier result set." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Purchasing lanes</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Work from search to recommendation to market summary. Each lane keeps the material context pinned so buyers can move quickly.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === 'search'} onClick={() => setTab('search')}>Supplier Search</TabButton>
              <TabButton active={tab === 'recommend'} onClick={() => setTab('recommend')}>Recommendations</TabButton>
              <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Market Summary</TabButton>
            </div>
          </div>
        }
      />

      <SurfaceStatusNotice
        title="Commercial source posture"
        surfaces={['commerce']}
      />

      {sourceContext ? (
        <div className="rounded-[24px] border border-cyan-300/18 bg-cyan-300/[0.08] px-5 py-4 text-sm leading-6 text-cyan-50">
          <div>
            {sourceContextLabel || 'Upstream workspace'} opened Purchasing with sourcing context for{' '}
            <span className="font-semibold text-white">{sourcingReference}</span>.
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/70">Launcher</div>
              <div className="mt-2 font-semibold text-white">{sourceContextLabel || sourceContext}</div>
            </div>
            {upstreamCommercialSource ? (
              <div className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/70">Upstream origin</div>
                <div className="mt-2 font-semibold text-white">{upstreamSourceLabel || upstreamCommercialSource}</div>
              </div>
            ) : null}
            {upstreamRecordLabel ? (
              <div className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/70">Record</div>
                <div className="mt-2 font-semibold text-white">{upstreamRecordLabel}</div>
              </div>
            ) : null}
            {routeContext.origin.customer ? (
              <div className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/70">Customer</div>
                <div className="mt-2 font-semibold text-white">{routeContext.origin.customer}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? <LoadingState label="Refreshing vendor desk..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {tab === 'search' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <PanelCard title="Supplier search" subtitle="Stage the material and search term, then compare supplier quality and lead-time posture.">
            <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_220px]">
              <Field label="Material">
                <Input type="text" value={material} onChange={(event) => setMaterial(event.target.value)} />
              </Field>
              <Field label="Search query">
                <Input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, region, or specialty" />
              </Field>
              <div className="flex items-end">
                <ActionButton onClick={() => void handleSearch()} disabled={loading} className="w-full">
                  Search
                </ActionButton>
              </div>
            </div>

            {suppliers.length > 0 ? (
              <div className="grid gap-3">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[minmax(0,1fr)_160px_120px_140px]"
                  >
                    <div>
                      <div className="text-lg font-semibold text-slate-50">{supplier.name}</div>
                      <div className="mt-2 text-sm text-slate-400">{supplier.location}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(supplier.materials ?? []).slice(0, 4).map((entry) => (
                          <span key={`${supplier.id}-${entry}`} className="rounded-full bg-slate-300/12 px-3 py-1 text-xs font-semibold text-slate-200">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rating</div>
                      <div className="mt-2 text-lg font-semibold text-slate-100">{supplier.rating}/5</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lead time</div>
                      <div className="mt-2 font-mono text-slate-100">{supplier.lead_time_days}d</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Min order</div>
                      <div className="mt-2 font-mono text-slate-100">{supplier.min_order}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Search suppliers to populate the vendor comparison lane.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Search brief" subtitle="Quick reading on how strong the current search field looks.">
            <div className="grid gap-3">
              <SummaryTile label="Material" value={material} hint="Material family being sourced." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
              <SummaryTile label="Query mode" value={query || 'Broad'} hint="Empty query means a broad supplier search for the selected material." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      ) : null}

      {tab === 'recommend' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <PanelCard title="Purchasing recommendations" subtitle="Ask for the best-fit material source and keep score, price, and lead time visible.">
            <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="Material">
                <Input type="text" value={material} onChange={(event) => setMaterial(event.target.value)} />
              </Field>
              <div className="flex items-end">
                <ActionButton onClick={() => void handleRecommend()} disabled={loading} tone="emerald" className="w-full">
                  Get recommendations
                </ActionButton>
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid gap-3">
                {recommendations.map((recommendation, index) => (
                  <div
                    key={`${recommendation.supplier_id}-${recommendation.material}`}
                    className={`rounded-[22px] border px-4 py-4 ${
                      index === 0
                        ? 'border-emerald-300/20 bg-emerald-300/[0.08]'
                        : 'border-white/8 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-50">{recommendation.supplier_name}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-300/12 px-3 py-1 text-xs font-semibold text-slate-200">
                            {recommendation.material}
                          </span>
                          <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-100">
                            {recommendation.score}/100
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-mono text-lg text-slate-100">{money(recommendation.unit_price)}/kg</div>
                        <div className="mt-2 text-slate-400">{recommendation.lead_time_days} day lead</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{recommendation.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Generate recommendations to compare best-fit suppliers for the selected material.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Recommendation brief" subtitle="Keep the best vendor candidate visible while buyers compare alternatives.">
            <div className="grid gap-3">
              <SummaryTile label="Top supplier" value={bestRecommendation?.supplier_name ?? 'Pending'} hint="Best supplier returned by the scoring engine." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="Best price" value={bestRecommendation ? money(bestRecommendation.unit_price) : '—'} hint="Best-fit supplier unit price for the current material." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      ) : null}

      {tab === 'summary' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <PanelCard title="Market summary" subtitle="Pull the current purchasing summary and supporting manufacturer set for the active material.">
            <div className="mb-4">
              <ActionButton onClick={() => void handleSummary()} disabled={loading}>
                Load summary
              </ActionButton>
            </div>

            {summaryData ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile
                    label="Market posture"
                    value={marketPosture}
                    hint="Current sourcing tightness or supply posture returned by the mounted summary route."
                    accent="from-amber-400/22 via-amber-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Average lead"
                    value={marketLeadDays != null ? `${marketLeadDays}d` : 'Unavailable'}
                    hint="Summary-route lead-time posture for the active material."
                    accent="from-sky-400/22 via-sky-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Supplier count"
                    value={marketSupplierCount != null ? String(marketSupplierCount) : 'Unavailable'}
                    hint="Live supplier breadth reported in the current summary payload."
                    accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Tracked spend"
                    value={marketSpend != null ? money(marketSpend) : 'Unavailable'}
                    hint="Summary spend signal when the purchasing route provides it."
                    accent="from-violet-400/22 via-violet-300/10 to-transparent"
                  />
                </div>
                {summaryFields.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {summaryFields.map((entry) => (
                      <div key={entry.key} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{entry.label}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">{entry.value}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {manufacturers.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {manufacturers.map((manufacturer, index) => (
                      <div key={`${manufacturer.name ?? 'manufacturer'}-${index}`} className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                        <div className="text-lg font-semibold text-slate-50">{manufacturer.name ?? manufacturer.company ?? `Manufacturer ${index + 1}`}</div>
                        <div className="mt-2 text-sm text-slate-400">
                          {(manufacturer.materials ?? manufacturer.specialties ?? []).join(', ') || 'No specialty tags returned.'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Load the summary to pull the current material market payload and manufacturer list.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Market brief" subtitle="High-level signals for sourcing strategy while the summary is open.">
            <div className="grid gap-3">
              <SummaryTile label="Manufacturers" value={`${manufacturers.length}`} hint="Manufacturers or source companies returned for the active material." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="Material focus" value={material} hint="Pinned material for the summary and manufacturer sweep." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
              <SummaryTile label="Summary posture" value={marketPosture} hint="Keep the market signal readable without opening raw payload blocks." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
            </div>
          </PanelCard>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <PanelCard title="Source posture" subtitle="Expose source, freshness, and unavailable posture directly in the desk before a sourcing or buy decision leaves this page.">
          <div className="grid gap-3 xl:grid-cols-1 2xl:grid-cols-3">
            <SourcePostureCard
              label="Supplier search"
              source="Mounted purchasingSearch route"
              refreshedAt={searchRefreshedAt}
              selection={query.trim().length > 0 ? `${material} / ${query.trim()}` : `${material} / broad query`}
              unavailableReason={searchIssue}
            />
            <SourcePostureCard
              label="Recommendations"
              source="Mounted purchasingRecommend route"
              refreshedAt={recommendRefreshedAt}
              selection={material}
              unavailableReason={recommendIssue}
            />
            <SourcePostureCard
              label="Market summary"
              source="Mounted purchasingSummary + purchasingManufacturers routes"
              refreshedAt={summaryRefreshedAt}
              selection={`${material} / ${manufacturers.length} manufacturer${manufacturers.length === 1 ? '' : 's'}`}
              unavailableReason={summaryIssue}
            />
          </div>
        </PanelCard>

        <AppwPurchasingCopilot
          deskLabel="Purchasing desk"
          activeLaneLabel={activeTab.label}
          activeLaneDetail={activeTab.detail}
          material={material}
          query={query}
          supplierCount={supplierCount}
          averageLeadDays={supplierCount ? averageLead : null}
          bestSupplier={bestRecommendation?.supplier_name ?? null}
          bestScore={bestRecommendation?.score ?? null}
          bestUnitPrice={bestRecommendation?.unit_price ?? null}
          bestLeadDays={bestRecommendation?.lead_time_days ?? null}
          marketPosture={marketPosture}
          marketLeadDays={marketLeadDays}
          marketSupplierCount={marketSupplierCount}
          marketSpend={marketSpend}
          manufacturerCount={manufacturers.length}
          searchRefreshedAt={searchRefreshedAt}
          recommendRefreshedAt={recommendRefreshedAt}
          summaryRefreshedAt={summaryRefreshedAt}
          searchIssue={searchIssue}
          recommendIssue={recommendIssue}
          summaryIssue={summaryIssue}
          launcherSourceLabel={sourceContextLabel || null}
          upstreamSourceLabel={upstreamSourceLabel || null}
          upstreamRecordLabel={upstreamRecordLabel || null}
          sourcingReference={sourcingReference}
          continuityNote={effectiveContinuityNote}
        />
      </div>

      <PanelCard title="Workflow continuity" subtitle="Sourcing should stay attached to the commercial record, then hand receiving and supplier follow-up forward without dropping context.">
        <div className="grid gap-3 xl:grid-cols-3">
          <Link
            to={inventoryHandoffPath}
            className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.10] px-4 py-4 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/[0.16]"
          >
            <div>Open Inventory intake</div>
            <div className="mt-2 text-sm font-normal leading-6 text-amber-50/80">
              Carry this sourcing posture into receiving and document intake before the material hits the floor.
            </div>
          </Link>
          <Link
            to={messagesHandoffPath}
            className="rounded-[20px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/[0.16]"
          >
            <div>Open Messages follow-up</div>
            <div className="mt-2 text-sm font-normal leading-6 text-sky-50/80">
              Keep supplier follow-up attached to the originating commercial record instead of restating the job by hand.
            </div>
          </Link>
          <Link
            to={captureHandoffPath}
            className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
          >
            <div>Open Capture Ops</div>
            <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
              Capture supplier quotes, certifications, labels, and material condition evidence without losing sourcing context.
            </div>
          </Link>
        </div>
      </PanelCard>
    </div>
  );
}
