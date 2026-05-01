import { useEffect, useState } from 'react';
import { ApiError, injectionMoldDfm, injectionMoldMaterials, injectionMoldQuote } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { DfmResult, InjectionMoldMaterial, InjectionMoldQuoteResult } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'quote' | 'materials' | 'dfm';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  quote: {
    label: 'Mold Quote',
    detail: 'Keep tooling cost, amortized part economics, and cycle time in one mold-commercial desk.',
  },
  materials: {
    label: 'Materials',
    detail: 'Review molding material ranges before the quote overcommits to one resin family.',
  },
  dfm: {
    label: 'DFM Check',
    detail: 'Check manufacturability posture early so the tooling quote is honest about risk.',
  },
};

export function InjectionMoldPage() {
  const [tab, setTab] = useState<Tab>('quote');
  const [result, setResult] = useState<InjectionMoldQuoteResult | null>(null);
  const [materials, setMaterials] = useState<InjectionMoldMaterial[]>([]);
  const [dfm, setDfm] = useState<DfmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    material: 'ABS',
    quantity: '10000',
    part_volume_cm3: '25',
    part_weight_g: '28',
    num_cavities: '4',
    wall_thickness_mm: '2.5',
    num_undercuts: '0',
    projected_area_cm2: '30',
    runner_type: 'hot',
  });

  const activeTab = TAB_CONFIG[tab];

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await injectionMoldQuote({
        material: form.material,
        quantity: parseInt(form.quantity, 10) || 10000,
        part_volume_cm3: parseFloat(form.part_volume_cm3) || 25,
        part_weight_g: parseFloat(form.part_weight_g) || 28,
        num_cavities: parseInt(form.num_cavities, 10) || 4,
        wall_thickness_mm: parseFloat(form.wall_thickness_mm) || 2.5,
        num_undercuts: parseInt(form.num_undercuts, 10) || 0,
        projected_area_cm2: parseFloat(form.projected_area_cm2) || 30,
        runner_type: form.runner_type,
      });
      setResult((response.result as unknown as InjectionMoldQuoteResult) ?? null);
      setTab('quote');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    setLoading(true);
    setError(null);
    try {
      const response = await injectionMoldMaterials();
      const next =
        (response.result as unknown as { materials?: InjectionMoldMaterial[] })?.materials ??
        (response.result as unknown as InjectionMoldMaterial[]) ??
        [];
      setMaterials(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  async function runDfm() {
    setLoading(true);
    setError(null);
    try {
      const response = await injectionMoldDfm({
        wall_thickness_mm: parseFloat(form.wall_thickness_mm) || 2.5,
        num_undercuts: parseInt(form.num_undercuts, 10) || 0,
        draft_angle_deg: 1.5,
        material: form.material,
      });
      setDfm((response.result as unknown as DfmResult) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'DFM analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'materials') void loadMaterials();
    if (tab === 'dfm') void runDfm();
  }, [tab]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Tooling and molding economics"
        title="Injection Mold Quote"
        description="Stage tooling cost, part economics, resin context, and DFM posture together so the mold quote tells the truth about both risk and reward."
        metrics={
          <>
            <SummaryTile label="Resin" value={form.material} hint={`${form.runner_type} runner · qty ${form.quantity}`} />
            <SummaryTile
              label="Cavity posture"
              value={`${form.num_cavities} cav.`}
              hint={`${form.wall_thickness_mm} mm wall · ${form.num_undercuts} undercuts`}
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
            <SummaryTile
              label="Output state"
              value={result || dfm ? 'Prepared' : 'Standby'}
              hint={activeTab.detail}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this desk when the commercial problem is tooling amortization, cycle time, and manufacturability risk, not just simple per-part cost.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
              <ActionButton
                tone="amber"
                onClick={() => {
                  setTab('dfm');
                  void runDfm();
                }}
              >
                Run DFM
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

      {loading ? <LoadingState label="Refreshing injection mold desk..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'quote' ? handleQuote : tab === 'materials' ? loadMaterials : runDfm} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'quote' ? (
            <>
              <PanelCard title="Mold quote inputs" subtitle="Keep the tooling basis readable before the quote hardens around a resin, cavity count, and projected area assumption.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Material">
                    <Input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
                  </Field>
                  <Field label="Production quantity">
                    <Input type="number" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
                  </Field>
                  <Field label="Part volume (cm³)">
                    <Input type="number" value={form.part_volume_cm3} onChange={(event) => updateField('part_volume_cm3', event.target.value)} />
                  </Field>
                  <Field label="Part weight (g)">
                    <Input type="number" value={form.part_weight_g} onChange={(event) => updateField('part_weight_g', event.target.value)} />
                  </Field>
                  <Field label="Cavities">
                    <Input type="number" value={form.num_cavities} onChange={(event) => updateField('num_cavities', event.target.value)} />
                  </Field>
                  <Field label="Wall thickness (mm)">
                    <Input type="number" value={form.wall_thickness_mm} onChange={(event) => updateField('wall_thickness_mm', event.target.value)} />
                  </Field>
                  <Field label="Undercuts">
                    <Input type="number" value={form.num_undercuts} onChange={(event) => updateField('num_undercuts', event.target.value)} />
                  </Field>
                  <Field label="Projected area (cm²)">
                    <Input type="number" value={form.projected_area_cm2} onChange={(event) => updateField('projected_area_cm2', event.target.value)} />
                  </Field>
                  <Field label="Runner">
                    <Select value={form.runner_type} onChange={(event) => updateField('runner_type', event.target.value)}>
                      <option value="cold">Cold Runner</option>
                      <option value="hot">Hot Runner</option>
                    </Select>
                  </Field>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
                </div>
              </PanelCard>

              {result ? (
                <>
                  <PanelCard title="Commercial summary" subtitle="Keep tooling cost, part economics, and cycle time readable before debating amortization strategy.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile label="Mold cost" value={`$${result.mold_cost.toLocaleString()}`} hint="Estimated tooling investment." />
                      <SummaryTile
                        label="Per part"
                        value={`$${result.per_part_cost.toFixed(3)}`}
                        hint="Direct molded-part cost before sell price."
                        accent="from-sky-400/22 via-sky-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Cycle time"
                        value={`${result.cycle_time_s.toFixed(1)}s`}
                        hint="Cycle time posture for the current tooling plan."
                        accent="from-violet-400/22 via-violet-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Unit price"
                        value={`$${result.unit_price.toFixed(3)}`}
                        hint="Commercial price per part at the staged assumptions."
                        accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                      />
                    </div>
                  </PanelCard>

                  <PanelCard title="Economic breakdown" subtitle="Use the cost stack to separate resin, amortization, and total program spend.">
                    <div className="space-y-3">
                      {[
                        { label: 'Material / part', value: result.material_cost_per_part },
                        { label: 'Amortized mold', value: result.amortized_mold_cost },
                        { label: 'Total cost', value: result.total_cost },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="font-mono font-semibold text-slate-100">
                            {row.label === 'Total cost' ? `$${row.value.toLocaleString()}` : `$${row.value.toFixed(3)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </PanelCard>
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'materials' ? (
            <PanelCard title="Resin guide" subtitle="Keep the resin envelope visible before the tooling quote hardens around one material choice.">
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div key={material.key} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{material.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            Min wall {material.min_wall_mm} mm · Max wall {material.max_wall_mm} mm
                          </div>
                        </div>
                        <div className="text-sm font-mono font-semibold text-slate-100">${material.price_per_kg.toFixed(2)}/kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No injection materials are currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'dfm' ? (
            <PanelCard title="DFM posture" subtitle="Read the molding warnings early so the quote doesn’t imply a tooling confidence the design hasn’t earned yet.">
              {dfm ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-50">DFM score</div>
                      <div className="flex items-center gap-3">
                        <StatusPill label={dfm.pass ? 'PASS' : 'FAIL'} tone={dfm.pass ? 'emerald' : 'rose'} />
                        <div className="text-sm font-mono font-semibold text-slate-100">{dfm.score.toFixed(0)}/100</div>
                      </div>
                    </div>
                  </div>
                  {dfm.warnings.length > 0 ? (
                    <div className="space-y-3">
                      {dfm.warnings.map((warning, index) => (
                        <div key={`${warning.message}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-50">{warning.message}</div>
                            <StatusPill
                              label={warning.severity.toUpperCase()}
                              tone={warning.severity === 'critical' ? 'rose' : warning.severity === 'warning' ? 'amber' : 'sky'}
                            />
                          </div>
                          <div className="mt-3 text-sm leading-6 text-slate-300">{warning.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-8 text-sm text-emerald-100">
                      No DFM issues were staged. The current molding concept looks manufacturable.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No DFM analysis is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Mold tooling brief" subtitle="Keep the commercial and manufacturability posture visible while the quote is being shaped.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>DFM should shape the quote early because tooling risk is part of the commercial reality, not a downstream note.</li>
                  <li>High cavity counts and hot runners can improve part economics while increasing tooling complexity.</li>
                  <li>Use the material lane to challenge whether the chosen resin still supports the wall and shrinkage posture.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
