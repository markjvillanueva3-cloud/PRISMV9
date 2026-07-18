import { useEffect, useMemo, useState } from 'react';
import { additiveCompareTech, additiveListMaterials, additiveQuote, ApiError } from '../api/client';
import { GatedError } from '../components/entitlement';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { AdditiveMaterial, AdditiveQuoteResult } from '../api/types';
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

type Tab = 'quote' | 'materials' | 'compare';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  quote: {
    label: 'Quote',
    detail: 'Stage additive cost around build time, support burden, and post-processing demand.',
  },
  materials: {
    label: 'Materials',
    detail: 'Review the available material families before the technology decision gets locked.',
  },
  compare: {
    label: 'Compare Tech',
    detail: 'Use the same part envelope to compare additive process posture side by side.',
  },
};

export function AdditiveQuotePage() {
  const [tab, setTab] = useState<Tab>('quote');
  const [result, setResult] = useState<AdditiveQuoteResult | null>(null);
  const [materials, setMaterials] = useState<AdditiveMaterial[]>([]);
  const [compareResult, setCompareResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [form, setForm] = useState({
    technology: 'SLS',
    material: 'PA12_Nylon',
    quantity: '10',
    volume_cm3: '50',
    surface_area_cm2: '200',
    support_volume_pct: '15',
  });

  const activeTab = TAB_CONFIG[tab];
  const supportPosture = useMemo(() => {
    const support = parseFloat(form.support_volume_pct) || 0;
    if (support >= 25) return 'Heavy';
    if (support >= 10) return 'Moderate';
    return 'Light';
  }, [form.support_volume_pct]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await additiveQuote({
        technology: form.technology,
        material: form.material,
        quantity: parseInt(form.quantity, 10) || 1,
        volume_cm3: parseFloat(form.volume_cm3) || 50,
        surface_area_cm2: parseFloat(form.surface_area_cm2) || 200,
        support_volume_pct: parseFloat(form.support_volume_pct) || 15,
      });
      setResult((response.result as unknown as AdditiveQuoteResult) ?? null);
      setTab('quote');
    } catch (issue) {
      setGateError(issue);
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    setLoading(true);
    setError(null);
    try {
      const response = await additiveListMaterials();
      const next =
        (response.result as unknown as { materials?: AdditiveMaterial[] })?.materials ??
        (response.result as unknown as AdditiveMaterial[]) ??
        [];
      setMaterials(Array.isArray(next) ? next : []);
    } catch (issue) {
      setGateError(issue);
      setError(issue instanceof ApiError ? issue.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  async function loadComparison() {
    setLoading(true);
    setError(null);
    try {
      const response = await additiveCompareTech({
        volume_cm3: parseFloat(form.volume_cm3) || 50,
        surface_area_cm2: parseFloat(form.surface_area_cm2) || 200,
        quantity: parseInt(form.quantity, 10) || 10,
      });
      setCompareResult(response.result);
    } catch (issue) {
      setGateError(issue);
      setError(issue instanceof ApiError ? issue.message : 'Compare failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'materials') void loadMaterials();
  }, [tab]);

  const technologies = ['SLS', 'SLA', 'FDM', 'DMLS', 'MJF', 'EBM', 'Binder_Jetting'];

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Additive quoting"
        title="Additive Manufacturing Quote"
        description="Quote additive work with the same rigor as machining: build time, support burden, post-processing drag, and material choice all stay visible in one desk."
        metrics={
          <>
            <SummaryTile label="Technology" value={form.technology} hint={`${form.material} · qty ${form.quantity}`} />
            <SummaryTile
              label="Support posture"
              value={supportPosture}
              hint={`${form.support_volume_pct}% support volume`}
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
            <SummaryTile
              label="Output state"
              value={result || compareResult ? 'Prepared' : 'Standby'}
              hint={activeTab.detail}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Keep additive quoting centered on build economics and downstream finishing load, not just a generic material-times-volume estimate.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('compare');
                  void loadComparison();
                }}
              >
                Compare technologies
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

      {loading ? <LoadingState label="Refreshing additive quote desk..." /> : null}
      {error ? <GatedError error={gateError} feature='quoting' fallback={<ErrorState message={error} onRetry={tab === 'compare' ? loadComparison : tab === 'materials' ? loadMaterials : handleQuote} />} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'quote' ? (
            <>
              <PanelCard title="Additive inputs" subtitle="Stage the build basis so quoting, process choice, and customer expectations stay aligned.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Technology">
                    <Select value={form.technology} onChange={(event) => updateField('technology', event.target.value)}>
                      {technologies.map((technology) => (
                        <option key={technology} value={technology}>
                          {technology}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Material">
                    <Input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
                  </Field>
                  <Field label="Quantity">
                    <Input type="number" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
                  </Field>
                  <Field label="Volume (cm³)">
                    <Input type="number" value={form.volume_cm3} onChange={(event) => updateField('volume_cm3', event.target.value)} />
                  </Field>
                  <Field label="Surface area (cm²)">
                    <Input type="number" value={form.surface_area_cm2} onChange={(event) => updateField('surface_area_cm2', event.target.value)} />
                  </Field>
                  <Field label="Support volume %">
                    <Input type="number" value={form.support_volume_pct} onChange={(event) => updateField('support_volume_pct', event.target.value)} />
                  </Field>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
                </div>
              </PanelCard>

              {result ? (
                <>
                  <PanelCard title="Build summary" subtitle="Keep unit price, build time, and technology visible before opening the deeper cost split.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile label="Unit price" value={`$${result.unit_price.toFixed(2)}`} hint="Commercial unit value for the staged build." />
                      <SummaryTile
                        label="Total"
                        value={`$${result.total.toFixed(2)}`}
                        hint="Aggregate batch price for the current quantity."
                        accent="from-sky-400/22 via-sky-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Build time"
                        value={`${result.build_time_hours.toFixed(1)}h`}
                        hint="Machine occupancy for the current setup."
                        accent="from-violet-400/22 via-violet-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Technology"
                        value={result.technology}
                        hint="Process path currently driving the quote."
                        accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                      />
                    </div>
                  </PanelCard>

                  <PanelCard title="Cost stack" subtitle="Material, machine time, and post-processing stay visible so the quote tells a manufacturing story.">
                    <div className="space-y-3">
                      {[
                        { label: 'Material', value: result.material_cost },
                        { label: 'Machine time', value: result.machine_cost },
                        { label: 'Post-processing', value: result.post_processing_cost },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="font-mono font-semibold text-slate-100">${row.value.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold text-slate-100">
                        <span>Total</span>
                        <span className="font-mono">${result.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </PanelCard>
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'materials' ? (
            <PanelCard title="Material library" subtitle="Review additive-capable materials by process so the quote stays grounded in what can actually run.">
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div key={material.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{material.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{material.technology}</div>
                        </div>
                        <div className="text-sm font-mono font-semibold text-slate-100">${material.price_per_kg.toFixed(2)}/kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No additive materials are currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'compare' ? (
            <PanelCard title="Technology comparison" subtitle="Compare additive routes with the same part envelope so you can choose a process, not just a material.">
              <div className="mb-4 flex flex-wrap gap-3">
                <ActionButton onClick={loadComparison}>Compare technologies</ActionButton>
              </div>
              {compareResult ? (
                Array.isArray(compareResult) ? (
                  <div className="space-y-3">
                    {compareResult.map((entry: any, index) => (
                      <div key={`${entry?.technology ?? 'tech'}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-50">{entry?.technology ?? `Option ${index + 1}`}</div>
                          <div className="text-sm font-mono text-slate-100">
                            {typeof entry?.unit_price === 'number' ? `$${entry.unit_price.toFixed(2)}` : 'See details'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                    <pre className="max-h-[28rem] overflow-auto text-xs text-slate-200">{JSON.stringify(compareResult, null, 2)}</pre>
                  </div>
                )
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No additive technology comparison is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Additive brief" subtitle="Keep the quoting intent visible so the selected process still matches the customer outcome.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>High support volume is a geometry and finishing problem, not just a machine-time problem.</li>
                  <li>Material price alone should not choose the process if build time or post-processing dominates.</li>
                  <li>Use comparison when the customer outcome is flexible and the process route is still negotiable.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
