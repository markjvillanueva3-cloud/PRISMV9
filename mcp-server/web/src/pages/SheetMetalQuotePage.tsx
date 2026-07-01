import { useMemo, useState } from 'react';
import { ApiError, sheetMetalQuote } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { GatedError } from '../components/entitlement';
import type { SheetMetalQuoteResult } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

export function SheetMetalQuotePage() {
  const [result, setResult] = useState<SheetMetalQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [form, setForm] = useState({
    material: 'mild_steel',
    thickness_mm: '2',
    length_mm: '300',
    width_mm: '200',
    quantity: '50',
    num_bends: '4',
    num_holes: '6',
    finish: 'powder_coat',
  });

  const flatPattern = `${Number(form.length_mm || 0).toFixed(0)} × ${Number(form.width_mm || 0).toFixed(0)} mm`;
  const bendIntensity = useMemo(() => {
    const bends = parseInt(form.num_bends, 10) || 0;
    if (bends >= 8) return 'High';
    if (bends >= 4) return 'Medium';
    return 'Low';
  }, [form.num_bends]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await sheetMetalQuote({
        material: form.material,
        thickness_mm: parseFloat(form.thickness_mm) || 2,
        length_mm: parseFloat(form.length_mm) || 300,
        width_mm: parseFloat(form.width_mm) || 200,
        quantity: parseInt(form.quantity, 10) || 50,
        num_bends: parseInt(form.num_bends, 10) || 0,
        num_holes: parseInt(form.num_holes, 10) || 0,
        finish: form.finish,
      });
      setResult((response.result as unknown as SheetMetalQuoteResult) ?? null);
    } catch (issue) {
      setGateError(issue);
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  // U-SHEETMETAL-FLAT-ADAPT (page guard, 3-of-3 arm A/B/C P1): the cost-breakdown bars are
  // redacted (absent) for an anonymous caller -- only the authed cost stack carries them. Filter
  // to bars whose value is a finite number so an anon result renders the commercial summary
  // without crashing on `undefined.toFixed()`. (The route omits material/cutting/bending/finishing
  // for anon; this filter is the FE half the adapter's contract relies on.)
  const breakdown = result
    ? (
        [
          { label: 'Material', value: result.material_cost, tone: 'bg-sky-300' },
          { label: 'Cutting', value: result.cutting_cost, tone: 'bg-emerald-300' },
          { label: 'Bending', value: result.bending_cost, tone: 'bg-amber-300' },
          { label: 'Finishing', value: result.finishing_cost, tone: 'bg-violet-300' },
        ] as Array<{ label: string; value: number | undefined; tone: string }>
      ).filter((row): row is { label: string; value: number; tone: string } =>
        typeof row.value === 'number' && Number.isFinite(row.value),
      )
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Fabrication quoting"
        title="Sheet Metal Quote"
        description="Keep flat pattern, bend load, finishing posture, and commercial output in one fabrication desk instead of a loose estimate form."
        metrics={
          <>
            <SummaryTile label="Flat pattern" value={flatPattern} hint={`${form.material} · ${form.thickness_mm} mm`} />
            <SummaryTile
              label="Bend posture"
              value={bendIntensity}
              hint={`${form.num_bends} bends · ${form.num_holes} pierce features`}
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
            <SummaryTile
              label="Quote posture"
              value={result ? 'Prepared' : 'Standby'}
              hint="Result desk stays ready for fabrication review once priced."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this lane when the commercial conversation is really about cut geometry, press-brake work, and finishing drag rather than general machining assumptions.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Calculating fabrication quote..." /> : null}
      {error ? <GatedError error={gateError} feature='quoting' fallback={<ErrorState message={error} onRetry={handleQuote} />} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <PanelCard title="Fabrication inputs" subtitle="Keep the flat-pattern assumptions visible so estimating and process review stay on the same footing.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Material">
                <Select value={form.material} onChange={(event) => updateField('material', event.target.value)}>
                  <option value="mild_steel">Mild Steel</option>
                  <option value="stainless_304">304 Stainless</option>
                  <option value="stainless_316">316 Stainless</option>
                  <option value="aluminum_5052">Aluminum 5052</option>
                  <option value="aluminum_6061">Aluminum 6061</option>
                  <option value="copper">Copper</option>
                  <option value="brass">Brass</option>
                </Select>
              </Field>
              <Field label="Thickness (mm)">
                <Input type="number" value={form.thickness_mm} onChange={(event) => updateField('thickness_mm', event.target.value)} />
              </Field>
              <Field label="Length (mm)">
                <Input type="number" value={form.length_mm} onChange={(event) => updateField('length_mm', event.target.value)} />
              </Field>
              <Field label="Width (mm)">
                <Input type="number" value={form.width_mm} onChange={(event) => updateField('width_mm', event.target.value)} />
              </Field>
              <Field label="Quantity">
                <Input type="number" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
              </Field>
              <Field label="Bends">
                <Input type="number" value={form.num_bends} onChange={(event) => updateField('num_bends', event.target.value)} />
              </Field>
              <Field label="Holes">
                <Input type="number" value={form.num_holes} onChange={(event) => updateField('num_holes', event.target.value)} />
              </Field>
              <Field label="Finish">
                <Select value={form.finish} onChange={(event) => updateField('finish', event.target.value)}>
                  <option value="none">None</option>
                  <option value="powder_coat">Powder Coat</option>
                  <option value="anodize">Anodize</option>
                  <option value="paint">Paint</option>
                  <option value="plating">Plating</option>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
            </div>
          </PanelCard>

          {result ? (
            <>
              <PanelCard title="Commercial summary" subtitle="Read unit price, total, and promise posture before opening the detailed cost stack.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {/* null-safe: an anon/degraded result can carry null price/total (cost basis redacted
                      or unpriced) -- show a dash rather than crashing on `null.toFixed`. */}
                  <SummaryTile label="Unit price" value={typeof result.unit_price === 'number' ? `$${result.unit_price.toFixed(2)}` : '--'} hint="Commercial unit value from the staged fabrication route." />
                  <SummaryTile
                    label="Total"
                    value={typeof result.total === 'number' ? `$${result.total.toFixed(2)}` : '--'}
                    hint="Aggregate price for the current lot."
                    accent="from-sky-400/22 via-sky-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Lead time"
                    value={result.lead_time_days != null ? `${result.lead_time_days} days` : '--'}
                    hint="Current promise posture for the batch."
                    accent="from-amber-300/22 via-amber-200/8 to-transparent"
                  />
                </div>
              </PanelCard>

              {/* Cost breakdown is authed-only (anon = cost basis redacted -> breakdown empty). Gate
                  the whole panel on having at least one priced bar so anon sees the commercial
                  summary cleanly without an empty/blank cost panel. */}
              {breakdown.length > 0 ? (
              <PanelCard title="Cost breakdown" subtitle="Keep the fabrication stack readable so material, cut time, press brake work, and finish drag stay visible.">
                <div className="space-y-4">
                  {breakdown.map((row) => {
                    const total = typeof result.total === 'number' ? result.total : 0;
                    const width = total > 0 ? Math.min((row.value / total) * 100, 100) : 0;
                    return (
                      <div key={row.label} className="grid grid-cols-[112px_minmax(0,1fr)_96px] items-center gap-3">
                        <div className="text-sm text-slate-300">{row.label}</div>
                        <div className="h-4 overflow-hidden rounded-full bg-white/8">
                          <div className={`h-4 rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
                        </div>
                        <div className="text-right text-sm font-mono text-slate-100">${row.value.toFixed(2)}</div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold text-slate-100">
                    <span>Total</span>
                    <span className="font-mono">{typeof result.total === 'number' ? `$${result.total.toFixed(2)}` : '--'}</span>
                  </div>
                </div>
              </PanelCard>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Fabrication brief" subtitle="Keep the intent of the lane visible while the part is being priced.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">When to use this page</div>
                <div className="mt-2 leading-6 text-slate-400">
                  Use this for flat-pattern work where cutting, bending, and finishing are the real economic drivers rather than general machine-cycle assumptions.
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>High bend counts and premium finishes should be challenged early because they can swing the commercial posture fast.</li>
                  <li>Flat pattern size is a material decision and a nesting decision, not just a dimension readout.</li>
                  <li>If the part becomes primarily machining-driven after forming, hand it back to the main quote desk.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
