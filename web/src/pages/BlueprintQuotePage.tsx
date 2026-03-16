/**
 * Blueprint to Quote Page — Convert blueprint analysis into a structured quote.
 */
import { useState } from 'react';
import { blueprintToQuote, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { BlueprintQuoteResult } from '../api/shopTypes';

export function BlueprintQuotePage() {
  const [result, setResult] = useState<BlueprintQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    material: '6061-T6', quantity: '25',
    features: 'pocket, holes, chamfer',
    tolerance_mm: '0.05', surface_finish_um: '1.6',
    part_length_mm: '150', part_width_mm: '80', part_height_mm: '30',
  });

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const r = await blueprintToQuote({
        material: form.material,
        quantity: parseInt(form.quantity) || 25,
        features: form.features.split(',').map((f) => f.trim()),
        tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
        surface_finish_um: parseFloat(form.surface_finish_um) || 1.6,
        part_length_mm: parseFloat(form.part_length_mm) || 150,
        part_width_mm: parseFloat(form.part_width_mm) || 80,
        part_height_mm: parseFloat(form.part_height_mm) || 30,
      });
      setResult(r.result as unknown as BlueprintQuoteResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blueprint to Quote</h1>
        <p className="text-sm text-gray-500 mt-1">Convert part specifications into a structured manufacturing quote.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Part Specifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Material', key: 'material', type: 'text' },
            { label: 'Quantity', key: 'quantity', type: 'number' },
            { label: 'Tolerance (mm)', key: 'tolerance_mm', type: 'number' },
            { label: 'Surface Finish (µm)', key: 'surface_finish_um', type: 'number' },
            { label: 'Length (mm)', key: 'part_length_mm', type: 'number' },
            { label: 'Width (mm)', key: 'part_width_mm', type: 'number' },
            { label: 'Height (mm)', key: 'part_height_mm', type: 'number' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
            <input type="text" value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder="pocket, holes, chamfer"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
        </div>
        <button onClick={handleQuote} disabled={loading}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          Generate Quote
        </button>
      </div>

      {loading && <LoadingState label="Analyzing blueprint..." />}
      {error && <ErrorState message={error} />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Material', value: result.material },
              { label: 'Unit Price', value: `$${result.unit_price.toFixed(2)}` },
              { label: 'Total Cost', value: `$${result.total_cost.toFixed(2)}` },
              { label: 'Lead Time', value: `${result.lead_time_days} days` },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{c.label}</span>
                <span className="text-xl font-bold text-gray-900">{c.value}</span>
              </div>
            ))}
          </div>

          {result.operations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3 text-right">Time (min)</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.operations.map((op, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium capitalize">{op.type}</td>
                      <td className="px-4 py-2 text-right font-mono">{op.time_min.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right font-mono">${op.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {result.operations.reduce((s, o) => s + o.time_min, 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">${result.total_cost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
