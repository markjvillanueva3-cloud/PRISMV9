import { useMemo, useState } from 'react';
import { ApiError, materialPriceCompare, materialPriceLookup, materialSurcharge } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { PriceComparison, PriceLookupResult } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'lookup' | 'compare' | 'surcharge';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  lookup: {
    label: 'Price Lookup',
    detail: 'Read the live material posture for one alloy, form, and buying region.',
  },
  compare: {
    label: 'Compare Materials',
    detail: 'Compare alloys side by side so the quote team can see ranking, not just one lookup result.',
  },
  surcharge: {
    label: 'Surcharges',
    detail: 'Keep surcharge posture visible when volatility is the real driver of the buy.',
  },
};

export function MaterialPricingPage() {
  const [tab, setTab] = useState<Tab>('lookup');
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [surchargeResult, setSurchargeResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupForm, setLookupForm] = useState({ material: '6061-T6', form: 'bar', region: 'us_midwest' });
  const [compareForm, setCompareForm] = useState({ materials: '6061-T6, 7075-T6, 304 Stainless, 4140 Steel', form: 'bar' });
  const [surchargeMaterial, setSurchargeMaterial] = useState('6061-T6');

  const activeTab = TAB_CONFIG[tab];
  const comparisonCount = useMemo(() => compareForm.materials.split(',').map((entry) => entry.trim()).filter(Boolean).length, [compareForm.materials]);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    try {
      const response = await materialPriceLookup({
        material: lookupForm.material,
        form: lookupForm.form,
        region: lookupForm.region,
      });
      setLookupResult((response.result as unknown as PriceLookupResult) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const materials = compareForm.materials.split(',').map((item) => item.trim()).filter(Boolean);
      const response = await materialPriceCompare({ materials, form: compareForm.form });
      const next =
        (response.result as unknown as { comparisons?: PriceComparison[] })?.comparisons ??
        (response.result as unknown as PriceComparison[]) ??
        [];
      setComparisons(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSurchargeLookup() {
    setLoading(true);
    setError(null);
    try {
      const response = await materialSurcharge({ material: surchargeMaterial });
      setSurchargeResult(response.result);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load surcharge data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Commercial material intelligence"
        title="Material Pricing"
        description="Keep base price, surcharges, regional posture, and alloy comparisons in one buying desk instead of spreading them across disconnected lookup widgets."
        metrics={
          <>
            <SummaryTile label="Lookup alloy" value={lookupForm.material} hint={`${lookupForm.form} · ${lookupForm.region}`} />
            <SummaryTile
              label="Compare set"
              value={String(comparisonCount)}
              hint="Alloys currently staged in the comparison lane."
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
            <SummaryTile
              label="Current lane"
              value={activeTab.label}
              hint={activeTab.detail}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Material price drives more than raw buy cost. This desk keeps surcharge posture and relative alloy ranking visible while a quote is still forming.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleLookup}>Lookup price</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('compare');
                  void handleCompare();
                }}
              >
                Compare materials
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing material pricing..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'compare' ? handleCompare : tab === 'surcharge' ? handleSurchargeLookup : handleLookup} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'lookup' ? (
            <>
              <PanelCard title="Price lookup inputs" subtitle="Stage alloy, form, and buying region so the lookup result answers a real purchasing question.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Material">
                    <Input value={lookupForm.material} onChange={(event) => setLookupForm((current) => ({ ...current, material: event.target.value }))} />
                  </Field>
                  <Field label="Form">
                    <Select value={lookupForm.form} onChange={(event) => setLookupForm((current) => ({ ...current, form: event.target.value }))}>
                      <option value="bar">Bar</option>
                      <option value="plate">Plate</option>
                      <option value="sheet">Sheet</option>
                      <option value="tube">Tube</option>
                    </Select>
                  </Field>
                  <Field label="Region">
                    <Select value={lookupForm.region} onChange={(event) => setLookupForm((current) => ({ ...current, region: event.target.value }))}>
                      <option value="us_midwest">US Midwest</option>
                      <option value="us_west">US West</option>
                      <option value="us_east">US East</option>
                      <option value="europe">Europe</option>
                      <option value="asia">Asia</option>
                    </Select>
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleLookup}>Lookup price</ActionButton>
                  </div>
                </div>
              </PanelCard>

              {lookupResult ? (
                <>
                  <PanelCard title="Market posture" subtitle="Keep base, adjusted, and all-in price visible before comparing alternative alloys.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile label="Material" value={lookupResult.material} hint={`${lookupResult.form} · ${lookupResult.region}`} />
                      <SummaryTile label="Base price" value={`$${lookupResult.base_price_kg.toFixed(2)}/kg`} hint="Unadjusted material price baseline." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                      <SummaryTile label="Adjusted" value={`$${lookupResult.adjusted_price_kg.toFixed(2)}/kg`} hint="Price after regional and market posture adjustment." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                      <SummaryTile label="Total / kg" value={`$${lookupResult.total_per_kg.toFixed(2)}/kg`} hint="All-in price including surcharge posture." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                    </div>
                  </PanelCard>

                  <PanelCard title="Surcharge stack" subtitle="Break out surcharge drivers so the buyer can explain why the all-in number moved.">
                    {lookupResult.surcharges.length > 0 ? (
                      <div className="space-y-3">
                        {lookupResult.surcharges.map((surcharge, index) => (
                          <div key={`${surcharge.type}-${index}`} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm">
                            <span className="capitalize text-slate-300">{surcharge.type}</span>
                            <span className="font-mono font-semibold text-slate-100">${surcharge.amount.toFixed(2)}/kg</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                        No surcharge data is currently staged for this lookup.
                      </div>
                    )}
                  </PanelCard>
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'compare' ? (
            <>
              <PanelCard title="Compare inputs" subtitle="Use one region and one form so the alloy ranking remains commercially fair.">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <Field label="Materials">
                    <Input value={compareForm.materials} onChange={(event) => setCompareForm((current) => ({ ...current, materials: event.target.value }))} />
                  </Field>
                  <Field label="Form">
                    <Select value={compareForm.form} onChange={(event) => setCompareForm((current) => ({ ...current, form: event.target.value }))}>
                      <option value="bar">Bar</option>
                      <option value="plate">Plate</option>
                      <option value="sheet">Sheet</option>
                    </Select>
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleCompare}>Compare</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Comparison board" subtitle="Rank alloys by all-in cost so the team can argue from price posture, not memory.">
                {comparisons.length > 0 ? (
                  <div className="space-y-3">
                    {comparisons.map((comparison) => {
                      const maxPrice = Math.max(...comparisons.map((item) => item.total_per_kg));
                      const width = maxPrice > 0 ? (comparison.total_per_kg / maxPrice) * 100 : 0;
                      return (
                        <div key={comparison.material} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-50">{comparison.material}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Rank {comparison.rank}</div>
                            </div>
                            <div className="text-sm font-mono font-semibold text-slate-100">${comparison.total_per_kg.toFixed(2)}/kg</div>
                          </div>
                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                            <div className={`h-3 rounded-full ${comparison.rank === 1 ? 'bg-emerald-300' : 'bg-sky-300'}`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No comparison set is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'surcharge' ? (
            <PanelCard title="Surcharge lookup" subtitle="Use the surcharge lane when price volatility is the real decision-maker.">
              <div className="mb-5 flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <Field label="Material">
                    <Input value={surchargeMaterial} onChange={(event) => setSurchargeMaterial(event.target.value)} />
                  </Field>
                </div>
                <ActionButton onClick={handleSurchargeLookup}>Lookup</ActionButton>
              </div>
              {surchargeResult ? (
                <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                  <pre className="max-h-[28rem] overflow-auto text-xs text-slate-200">{JSON.stringify(surchargeResult, null, 2)}</pre>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No surcharge lookup is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Pricing brief" subtitle="Keep the material-buying intent visible while the numbers are being staged.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Lookup is for one buying decision, compare is for route tradeoffs, and surcharge is for explaining volatility.</li>
                  <li>Keep form and region explicit so alloy comparisons stay commercially honest.</li>
                  <li>If surcharges dominate, the buyer should challenge timing and buy strategy, not just alloy choice.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
