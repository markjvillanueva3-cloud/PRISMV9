/**
 * BIZ-MS4 U-BIZ32: Vendor Scorecard
 * Composite quality/delivery metrics per vendor, ranked list.
 */
import { useEffect, useMemo, useState } from 'react';
import { ApiError, vendorList } from '../api/client';
import { AppwVendorScorecardCopilot } from '../components/puoa/AppwVendorScorecardCopilot';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { PanelCard, StatusPill, SummaryTile, WorkspaceHero } from '../components/workspace/WorkspacePrimitives';

interface Vendor {
  vendor_id: string;
  name: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  composite_score: number;
  total_orders: number;
  ncr_count: number;
  on_time_pct: number;
  avg_lead_days: number;
}

function scoreTone(v: number): 'emerald' | 'amber' | 'rose' {
  return v >= 80 ? 'emerald' : v >= 60 ? 'amber' : 'rose';
}

function formatRefreshLabel(timestamp: number | null) {
  if (!timestamp) {
    return 'Not refreshed in this session';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function VendorSourcePostureCard({
  refreshedAt,
  vendorCount,
  unavailableReason,
}: {
  refreshedAt: number | null;
  vendorCount: number;
  unavailableReason?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vendor list route</div>
          <div className="mt-2 font-semibold text-slate-100">Mounted vendorList route</div>
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
        <div>Suppliers staged: {vendorCount}</div>
      </div>
      {unavailableReason ? (
        <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3 text-xs leading-5 text-amber-50">
          Unavailable reason: {unavailableReason}
        </div>
      ) : null}
    </div>
  );
}

export default function VendorScorecardPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [sourceIssue, setSourceIssue] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      setLoading(true);
      setError(null);
      setSourceIssue(null);

      try {
        const response = await vendorList();
        if (cancelled) {
          return;
        }

        const nextVendors = ((response as any).data ?? (response as any).result ?? []) as Vendor[];
        setVendors(Array.isArray(nextVendors) ? nextVendors : []);
        setRefreshedAt(Date.now());
      } catch (issue) {
        if (cancelled) {
          return;
        }

        const message = issue instanceof ApiError ? issue.message : 'Failed to load vendor scorecard';
        setError(message);
        setSourceIssue(message);
        setVendors([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVendors();

    return () => {
      cancelled = true;
    };
  }, [refreshSeed]);

  const sortedVendors = useMemo(
    () => [...vendors].sort((left, right) => right.composite_score - left.composite_score),
    [vendors],
  );
  const avgScore = sortedVendors.length
    ? Math.round(sortedVendors.reduce((sum, vendor) => sum + vendor.composite_score, 0) / sortedVendors.length)
    : 0;
  const topVendor = sortedVendors[0] ?? null;
  const weakestVendor = sortedVendors.length > 0 ? sortedVendors[sortedVendors.length - 1] : null;
  const qualityRiskCount = sortedVendors.filter((vendor) => vendor.quality_score < 75 || vendor.ncr_count > 2).length;
  const deliveryRiskCount = sortedVendors.filter((vendor) => vendor.delivery_score < 75 || vendor.on_time_pct < 90).length;
  const priceRiskCount = sortedVendors.filter((vendor) => vendor.price_score < 70).length;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Supply chain"
        title="Vendor Scorecard"
        description="Rank suppliers on quality, delivery, and price with live composite posture, not a static vendor ledger."
        metrics={
          <>
            <SummaryTile
              label="Avg score"
              value={`${avgScore}/100`}
              hint="Average composite posture across staged vendors."
              accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
            />
            <SummaryTile label="Vendors" value={String(sortedVendors.length)} hint="Suppliers currently staged in the scorecard." />
            <SummaryTile
              label="At risk"
              value={String(new Set([...sortedVendors.filter((vendor) => vendor.composite_score < 75).map((vendor) => vendor.vendor_id)]).size)}
              hint="Suppliers below a healthy composite threshold."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Composite rank is only useful if the team can still see what is driving the score. This desk keeps quality, delivery, and price posture visible together.
            </div>
            <div className="flex flex-wrap gap-2">
              {topVendor ? <StatusPill label={`Top ${topVendor.name}`} tone="emerald" /> : null}
              {weakestVendor ? <StatusPill label={`Watch ${weakestVendor.name}`} tone="amber" /> : null}
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Refreshing vendor scorecard..." /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setRefreshSeed((current) => current + 1);
          }}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <PanelCard title="Vendor rankings" subtitle="Suppliers sorted by composite score so sourcing can see the strongest and weakest relationships immediately.">
            {sortedVendors.length > 0 ? (
              <div className="overflow-x-auto rounded-[20px] border border-white/8">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.02]">
                      <th className="px-4 py-3 text-xs uppercase text-slate-500">Vendor</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Quality</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Delivery</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Price</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Composite</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">On-time</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Lead days</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Orders</th>
                      <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">NCRs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVendors.map((vendor) => (
                      <tr key={vendor.vendor_id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-2.5 font-semibold text-slate-100">{vendor.name}</td>
                        <td className="px-4 py-2.5 text-right">
                          <StatusPill label={`${vendor.quality_score}`} tone={scoreTone(vendor.quality_score)} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <StatusPill label={`${vendor.delivery_score}`} tone={scoreTone(vendor.delivery_score)} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <StatusPill label={`${vendor.price_score}`} tone={scoreTone(vendor.price_score)} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">{vendor.composite_score}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{vendor.on_time_pct}%</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{vendor.avg_lead_days}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{vendor.total_orders}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{vendor.ncr_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No vendor data available.</div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <AppwVendorScorecardCopilot
            deskLabel="Vendor Scorecard desk"
            vendorCount={sortedVendors.length}
            averageScore={sortedVendors.length > 0 ? avgScore : null}
            topVendorName={topVendor?.name ?? null}
            topVendorScore={topVendor?.composite_score ?? null}
            weakestVendorName={weakestVendor?.name ?? null}
            weakestVendorScore={weakestVendor?.composite_score ?? null}
            qualityRiskCount={qualityRiskCount}
            deliveryRiskCount={deliveryRiskCount}
            priceRiskCount={priceRiskCount}
            refreshedAt={refreshedAt}
            issue={sourceIssue}
          />

          <PanelCard title="Scorecard brief" subtitle="Keep supplier-governance intent explicit while buyers review rank and recovery posture.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">
                  {topVendor ? `${topVendor.name} leads the board` : 'Awaiting live supplier data'}
                </div>
                <div className="mt-2 leading-6 text-slate-400">
                  {weakestVendor
                    ? `${weakestVendor.name} is the weakest staged supplier and should be reviewed before the next committed buy.`
                    : 'Refresh the vendor route to stage supplier confidence and recovery context.'}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Composite rank should not hide whether the actual pain is delivery, NCR pressure, or price weakness.</li>
                  <li>Low on-time percentage with acceptable price still creates schedule risk for the shop floor.</li>
                  <li>Use the bottom of the board for recovery and sourcing alternatives, not just supplier blame.</li>
                </ul>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Source posture" subtitle="Expose freshness and route health so supplier ranking never looks more authoritative than the mounted ERP seam.">
            <VendorSourcePostureCard refreshedAt={refreshedAt} vendorCount={sortedVendors.length} unavailableReason={sourceIssue} />
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
