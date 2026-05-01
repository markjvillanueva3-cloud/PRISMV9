import { useEffect, useMemo, useState } from 'react';
import { secOpsList, secOpsQuote, secOpsRecommend, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { SecondaryOp, SecOpsQuote } from '../api/types';

const CATEGORIES = ['all', 'anodize', 'heat_treat', 'plating', 'grinding', 'ndt', 'coating', 'passivation'] as const;

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-fuchsia-400/22 via-fuchsia-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function SecondaryOpsPage() {
  const [ops, setOps] = useState<SecondaryOp[]>([]);
  const [quoteResult, setQuoteResult] = useState<SecOpsQuote | null>(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [recMaterial, setRecMaterial] = useState('6061-T6');
  const [recommendations, setRecommendations] = useState<Array<Record<string, unknown>>>([]);

  const selectedOperation = useMemo(
    () => ops.find((item) => item.id === selectedOp) ?? null,
    [ops, selectedOp],
  );

  async function loadOps() {
    setLoading(true);
    setError(null);
    try {
      const response = await secOpsList(category !== 'all' ? { category } : undefined);
      const raw = (response.result as unknown as { operations?: SecondaryOp[] })?.operations ??
        (response.result as unknown as SecondaryOp[]);
      const nextOps = Array.isArray(raw) ? raw : [];
      setOps(nextOps);
      if (nextOps.length > 0 && !nextOps.some((item) => item.id === selectedOp)) {
        setSelectedOp(nextOps[0].id);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOps();
  }, [category]);

  async function handleQuote() {
    if (!selectedOp) return;
    setLoading(true);
    setError(null);
    try {
      const response = await secOpsQuote({
        operation_id: selectedOp,
        quantity: parseInt(quantity, 10) || 100,
      });
      setQuoteResult(response.result as unknown as SecOpsQuote);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to quote');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend() {
    setLoading(true);
    setError(null);
    try {
      const response = await secOpsRecommend({ material: recMaterial, application: 'general' });
      setRecommendations(
        (((response.result as { recommendations?: Array<Record<string, unknown>> })?.recommendations ??
          response.result) as Array<Record<string, unknown>>) ?? [],
      );
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-fuchsia-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(31,12,37,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-fuchsia-300/16 bg-fuchsia-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-100">
              Secondary operations
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Secondary Operations
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Browse and quote heat treat, anodize, plating, NDT, and other downstream processes from one cleaner vendor and quote desk.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Category"
                value={category === 'all' ? 'All' : category.replace(/_/g, ' ')}
                hint="Current filter for the live secondary-ops catalog."
                accent="from-fuchsia-400/22 via-fuchsia-300/8 to-transparent"
              />
              <SummaryTile
                label="Catalog size"
                value={String(ops.length)}
                hint="Operations currently visible in the filtered catalog."
                accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
              />
              <SummaryTile
                label="Selected op"
                value={selectedOperation?.name ?? 'Standby'}
                hint={selectedOperation?.description ?? 'Choose an operation to quote or review in more detail.'}
                accent="from-amber-300/22 via-amber-200/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current brief</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-[22px] border border-fuchsia-300/12 bg-fuchsia-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100">Best use</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Use this page to answer three questions quickly: what secondary ops fit the material, which vendors or processes should be shortlisted, and what the likely quote range looks like.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recommendation lane</div>
                  <div className="mt-2 text-sm text-slate-300">Material-first shortlist for what should happen after machining.</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Quote lane</div>
                  <div className="mt-2 text-sm text-slate-300">Quick quote for the selected operation with quantity and lead-time context.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PanelCard title="Category filter" subtitle="Use the left-to-right category rail to reduce the vendor and process list.">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                  active
                    ? 'border-fuchsia-300/24 bg-fuchsia-300/[0.08] text-fuchsia-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:text-white'
                }`}
              >
                {item === 'all' ? 'All' : item.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      </PanelCard>

      {(loading && ops.length === 0) ? <LoadingState label="Loading..." /> : null}
      {error && ops.length === 0 ? <ErrorState message={error} onRetry={loadOps} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Recommendation desk" subtitle="Ask for material-driven secondary op suggestions before quoting.">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <label className="block flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Get Recommended Sec Ops for Material
                </span>
                <input
                  type="text"
                  value={recMaterial}
                  onChange={(event) => setRecMaterial(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-fuchsia-300/32"
                />
              </label>
              <button
                type="button"
                onClick={handleRecommend}
                className="rounded-2xl bg-fuchsia-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200"
              >
                Recommend
              </button>
            </div>

            {recommendations.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {recommendations.map((item, index) => (
                  <div key={`${String(item.operation ?? item.name ?? index)}-${index}`} className="rounded-[22px] border border-fuchsia-300/12 bg-fuchsia-300/[0.05] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">{String(item.operation ?? item.name ?? 'Recommendation')}</div>
                    {'reason' in item && item.reason ? (
                      <div className="mt-2 text-sm leading-6 text-slate-300">{String(item.reason)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Run a recommendation to build a shortlist of likely secondary operations for the selected material.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Operations Catalog" subtitle="Click an operation to stage it for quoting and vendor review.">
            {loading && ops.length > 0 ? <LoadingState label="Loading..." /> : null}
            {error && ops.length > 0 ? <ErrorState message={error} onRetry={loadOps} /> : null}
            {!loading && ops.length > 0 ? (
              <div className="grid gap-3">
                {ops.map((operation) => {
                  const active = operation.id === selectedOp;
                  return (
                    <button
                      key={operation.id}
                      type="button"
                      onClick={() => setSelectedOp(operation.id)}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        active
                          ? 'border-cyan-300/24 bg-cyan-300/[0.08] shadow-[0_18px_40px_rgba(34,211,238,0.10)]'
                          : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.045]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{operation.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{operation.id} · {operation.category}</div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>${operation.typical_cost_range.min.toFixed(2)} – ${operation.typical_cost_range.max.toFixed(2)}</div>
                          <div className="mt-1">{operation.lead_time_days}d lead</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{operation.description}</div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Quick Quote" subtitle="Get a fast quantity-based quote for the selected secondary operation.">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Operation</span>
                <select
                  value={selectedOp}
                  onChange={(event) => setSelectedOp(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {ops.length === 0 ? <option value="">Select...</option> : null}
                  {ops.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      {operation.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quantity</span>
                <input
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>

              <button
                type="button"
                onClick={handleQuote}
                disabled={!selectedOp || loading}
                className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Get Quote
              </button>
            </div>

            {quoteResult ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  label="Operation"
                  value={quoteResult.operation}
                  hint="Quoted operation name."
                  accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                />
                <SummaryTile
                  label="Unit Cost"
                  value={`$${quoteResult.unit_cost.toFixed(2)}`}
                  hint="Quoted unit cost."
                  accent="from-sky-400/22 via-sky-300/8 to-transparent"
                />
                <SummaryTile
                  label="Total"
                  value={`$${quoteResult.total.toFixed(2)}`}
                  hint="Quantity-adjusted quote total."
                  accent="from-amber-300/22 via-amber-200/8 to-transparent"
                />
                <SummaryTile
                  label="Lead Time"
                  value={`${quoteResult.lead_time_days} days`}
                  hint="Expected turnaround posture."
                  accent="from-fuchsia-400/22 via-fuchsia-300/8 to-transparent"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select an operation and quantity, then quote it here to stage the price and lead-time summary.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Selected operation brief" subtitle="Keep a cleaner snapshot of the currently staged operation.">
            {selectedOperation ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-semibold text-slate-50">{selectedOperation.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{selectedOperation.id} · {selectedOperation.category}</div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                  {selectedOperation.description}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryTile
                    label="Cost Range"
                    value={`$${selectedOperation.typical_cost_range.min.toFixed(2)} – $${selectedOperation.typical_cost_range.max.toFixed(2)}`}
                    hint="Typical cost range from the catalog."
                    accent="from-sky-400/22 via-sky-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Lead Time"
                    value={`${selectedOperation.lead_time_days}d`}
                    hint="Typical lead-time guidance from the catalog."
                    accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Once you choose an operation from the catalog, its key description and quote posture will show here.
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
