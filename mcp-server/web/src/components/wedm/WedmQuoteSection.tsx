/**
 * WedmQuoteSection — U-WEDM-ERP08
 *
 * Inline WEDM quote panel for QuoteBuilderPage. Accepts dimensions +
 * material, calls /api/v1/wedm-erp/quote/estimate, renders line items
 * + confidence interval.
 */
import { useState } from 'react';
import { wedmErpApi, type WedmEstimateInput } from '../../api/wedmErp';

type LineItem = {
  description: string;
  total: number;
  category: string;
  source: string;
};

export function WedmQuoteSection() {
  const [input, setInput] = useState<WedmEstimateInput>({
    material: 'D2',
    perimeter_mm: 200,
    thickness_mm: 32,
    pass_count: 3,
    wire_type: 'brass',
    wire_diameter_mm: 0.25,
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    lines: LineItem[];
    total: number;
    subtotal: number;
    uncertainty_pct: number;
    confidence_interval: { low: number; high: number; confidence: number };
  } | null>(null);

  const handleEstimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await wedmErpApi.estimate(input);
      if (!r.ok || !r.data) {
        setError(r.error ?? 'Estimate failed');
        setResult(null);
      } else {
        const q = r.data.quote;
        setResult({
          lines: q.line_items,
          total: q.total,
          subtotal: q.subtotal,
          uncertainty_pct: q.total_uncertainty_pct,
          confidence_interval: q.confidence_interval,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof WedmEstimateInput>(k: K, v: WedmEstimateInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));

  return (
    <section className="prism-glow-cyan rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-5">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-cyan-300">WEDM Quote</h3>
          <p className="text-xs text-slate-400">
            Quick estimate for Wire EDM based on perimeter, thickness, and material.
          </p>
        </div>
        <span className="prism-chip rounded-full bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300">
          WEDM-ERP
        </span>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Material">
          <input
            type="text"
            value={input.material}
            onChange={(e) => updateField('material', e.target.value)}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <Field label="Perimeter (mm)">
          <input
            type="number"
            value={input.perimeter_mm}
            onChange={(e) => updateField('perimeter_mm', Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <Field label="Thickness (mm)">
          <input
            type="number"
            value={input.thickness_mm}
            onChange={(e) => updateField('thickness_mm', Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <Field label="Passes">
          <input
            type="number"
            min={1}
            max={6}
            value={input.pass_count}
            onChange={(e) => updateField('pass_count', Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <Field label="Wire type">
          <select
            value={input.wire_type}
            onChange={(e) => updateField('wire_type', e.target.value as WedmEstimateInput['wire_type'])}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          >
            <option value="brass">brass</option>
            <option value="coated">coated</option>
            <option value="molybdenum">moly</option>
            <option value="tungsten">tungsten</option>
          </select>
        </Field>
        <Field label="Wire ⌀ (mm)">
          <input
            type="number"
            step="0.01"
            value={input.wire_diameter_mm}
            onChange={(e) => updateField('wire_diameter_mm', Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            value={input.quantity}
            onChange={(e) => updateField('quantity', Number(e.target.value))}
            className="w-full rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            disabled={loading}
            onClick={handleEstimate}
            className="w-full rounded bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {loading ? 'Estimating…' : 'Estimate cost'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">Quote preview</span>
            <span className="text-2xl font-semibold text-emerald-300">
              ${result.total.toFixed(2)}
            </span>
          </div>

          <table className="w-full text-sm text-slate-200">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-1 text-left">Line item</th>
                <th className="pb-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((li, idx) => (
                <tr key={idx} className="border-t border-white/5">
                  <td className="py-1">
                    {li.description}
                    <span className="ml-2 text-[10px] text-slate-500">({li.category})</span>
                  </td>
                  <td className="py-1 text-right tabular-nums">${li.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 font-semibold">
                <td className="py-1">Total</td>
                <td className="py-1 text-right tabular-nums">${result.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 text-xs text-slate-400">
            Uncertainty ±{result.uncertainty_pct.toFixed(1)}% ·{' '}
            {result.confidence_interval.confidence * 100}% CI [${result.confidence_interval.low.toFixed(2)}, $
            {result.confidence_interval.high.toFixed(2)}]
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
