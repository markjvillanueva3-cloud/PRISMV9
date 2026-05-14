import { useMemo, useState } from 'react';
import { ApiError, stockSizeCatalog, stockSizeOptimize } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { StockCatalog, StockOptimizeResult } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'optimize' | 'catalog';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  optimize: {
    label: 'Optimizer',
    detail: 'Choose stock form and size by waste posture and material spend instead of by habit.',
  },
  catalog: {
    label: 'Stock Catalog',
    detail: 'Keep available bar, plate, and thickness ranges visible while you stage the quote.',
  },
};

export function StockOptimizerPage() {
  const [tab, setTab] = useState<Tab>('optimize');
  const [result, setResult] = useState<StockOptimizeResult | null>(null);
  const [catalog, setCatalog] = useState<StockCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    material: '6061-T6',
    part_length_mm: '100',
    part_width_mm: '50',
    part_height_mm: '25',
    quantity: '50',
  });
  const [catalogMaterial, setCatalogMaterial] = useState('6061-T6');

  const activeTab = TAB_CONFIG[tab];
  const envelope = useMemo(
    () => `${Number(form.part_length_mm || 0).toFixed(0)} × ${Number(form.part_width_mm || 0).toFixed(0)} × ${Number(form.part_height_mm || 0).toFixed(0)} mm`,
    [form.part_height_mm, form.part_length_mm, form.part_width_mm],
  );

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    try {
      const response = await stockSizeOptimize({
        material: form.material,
        part_length_mm: parseFloat(form.part_length_mm) || 100,
        part_width_mm: parseFloat(form.part_width_mm) || 50,
        part_height_mm: parseFloat(form.part_height_mm) || 25,
        quantity: parseInt(form.quantity, 10) || 50,
      });
      setResult((response.result as unknown as StockOptimizeResult) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to optimize');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const response = await stockSizeCatalog({ material: catalogMaterial });
      setCatalog((response.result as unknown as StockCatalog) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Material utilization"
        title="Stock Size Optimizer"
        description="Choose bar, plate, and stock posture with the same discipline as a machining route: waste, cost, and available catalog ranges stay visible in one desk."
        metrics={
          <>
            <SummaryTile label="Envelope" value={envelope} hint={`${form.material} · qty ${form.quantity}`} />
            <SummaryTile
              label="Best state"
              value={result?.best ? result.best.form : 'Standby'}
              hint={result?.best ? `${result.best.size} · ${result.best.waste_pct.toFixed(1)}% waste` : 'Run the optimizer to stage a recommended stock form.'}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} accent="from-sky-400/22 via-sky-300/8 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Keep stock decisions grounded in material spend and available forms, not just what the shop normally grabs off the rack.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleOptimize}>Find optimal stock</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('catalog');
                  void loadCatalog();
                }}
              >
                Load catalog
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

      {loading ? <LoadingState label="Refreshing stock optimizer..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'catalog' ? loadCatalog : handleOptimize} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'optimize' ? (
            <>
              <PanelCard title="Optimization inputs" subtitle="Stage the material and part envelope first so the stock recommendation reflects the real manufacturing shape.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Material">
                    <Input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
                  </Field>
                  <Field label="Length (mm)">
                    <Input type="number" value={form.part_length_mm} onChange={(event) => updateField('part_length_mm', event.target.value)} />
                  </Field>
                  <Field label="Width (mm)">
                    <Input type="number" value={form.part_width_mm} onChange={(event) => updateField('part_width_mm', event.target.value)} />
                  </Field>
                  <Field label="Height (mm)">
                    <Input type="number" value={form.part_height_mm} onChange={(event) => updateField('part_height_mm', event.target.value)} />
                  </Field>
                  <Field label="Quantity">
                    <Input type="number" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
                  </Field>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionButton onClick={handleOptimize}>Find optimal stock</ActionButton>
                </div>
              </PanelCard>

              {result ? (
                <>
                  {result.best ? (
                    <PanelCard title="Best option" subtitle="Keep the preferred form and waste posture visible before comparing alternates.">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryTile label="Form" value={result.best.form} hint="Recommended stock family for this part envelope." />
                        <SummaryTile label="Size" value={result.best.size} hint="Preferred stock size from the current optimizer pass." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                        <SummaryTile label="Waste" value={`${result.best.waste_pct.toFixed(1)}%`} hint="Estimated material waste at the chosen stock size." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                        <SummaryTile label="Cost" value={`$${result.best.cost.toFixed(2)}`} hint="Estimated stock cost for the preferred option." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                      </div>
                    </PanelCard>
                  ) : null}

                  <PanelCard title="Recommended options" subtitle="Use the alternate list to balance waste against cost and stock-form availability.">
                    {result.recommended.length > 0 ? (
                      <div className="space-y-3">
                        {result.recommended.map((option, index) => (
                          <div key={`${option.size}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold capitalize text-slate-50">{option.form}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{option.size}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-mono text-slate-100">${option.cost.toFixed(2)}</div>
                                <div className="mt-1 text-xs text-slate-500">{option.waste_pct.toFixed(1)}% waste</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                        No alternate stock recommendations are currently staged.
                      </div>
                    )}
                  </PanelCard>
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'catalog' ? (
            <PanelCard title="Stock catalog" subtitle="Keep live stock families visible so optimization stays grounded in what can actually be purchased.">
              <div className="mb-5 flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <Field label="Catalog material">
                    <Input value={catalogMaterial} onChange={(event) => setCatalogMaterial(event.target.value)} />
                  </Field>
                </div>
                <ActionButton onClick={loadCatalog}>Load catalog</ActionButton>
              </div>
              {catalog ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Round bars</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {catalog.round_bars.map((diameter) => (
                        <span key={diameter} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-200">
                          ⌀{diameter}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Plate thicknesses</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {catalog.plate_thicknesses.map((thickness) => (
                        <span key={thickness} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-200">
                          {thickness} mm
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Flat bar matrix</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {catalog.flat_bars.map((pair, index) => (
                        <span key={`${pair.join('-')}-${index}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-200">
                          {pair[0]} × {pair[1]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                    <div className="text-sm font-semibold text-slate-50">Material basis</div>
                    <div className="mt-3 space-y-2">
                      <div>Cost: ${catalog.cost_per_kg.toFixed(2)}/kg</div>
                      <div>Density: {catalog.density_kg_m3.toLocaleString()} kg/m³</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No stock catalog is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Utilization brief" subtitle="Keep the intent of the stock decision visible while evaluating forms and waste.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Stock selection should answer both waste and sourcing, not just whichever size looks closest to the part.</li>
                  <li>Keep the catalog lane nearby so “best option” still reflects what the shop can actually buy.</li>
                  <li>For larger lot sizes, small waste improvements often matter more than small per-piece convenience gains.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
