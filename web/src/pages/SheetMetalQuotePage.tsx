/**
 * Sheet Metal Quote Page — Quote sheet metal parts with cutting, bending, and finishing.
 */
import { useState } from 'react';
import { sheetMetalQuote, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { SheetMetalQuoteResult } from '../api/shopTypes';

export function SheetMetalQuotePage() {
  const [result, setResult] = useState<SheetMetalQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    material: 'mild_steel', thickness_mm: '2', length_mm: '300', width_mm: '200',
    quantity: '50', num_bends: '4', num_holes: '6', finish: 'powder_coat',
  });

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const r = await sheetMetalQuote({
        material: form.material,
        thickness_mm: parseFloat(form.thickness_mm) || 2,
        length_mm: parseFloat(form.length_mm) || 300,
        width_mm: parseFloat(form.width_mm) || 200,
        quantity: parseInt(form.quantity) || 50,
        num_bends: parseInt(form.num_bends) || 0,
        num_holes: parseInt(form.num_holes) || 0,
        finish: form.finish,
      });
      setResult(r.result as unknown as SheetMetalQuoteResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sheet Metal Quote</h1>
        <p className="text-sm text-gray-500 mt-1">Estimate cutting, bending, and finishing costs for sheet metal parts.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="mild_steel">Mild Steel</option>
              <option value="stainless_304">304 Stainless</option>
              <option value="stainless_316">316 Stainless</option>
              <option value="aluminum_5052">Aluminum 5052</option>
              <option value="aluminum_6061">Aluminum 6061</option>
              <option value="copper">Copper</option>
              <option value="brass">Brass</option>
            </select>
          </div>
          {[
            { label: 'Thickness (mm)', key: 'thickness_mm' },
            { label: 'Length (mm)', key: 'length_mm' },
            { label: 'Width (mm)', key: 'width_mm' },
            { label: 'Quantity', key: 'quantity' },
            { label: 'Bends', key: 'num_bends' },
            { label: 'Holes', key: 'num_holes' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="number" value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
            <select value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="none">None</option>
              <option value="powder_coat">Powder Coat</option>
              <option value="anodize">Anodize</option>
              <option value="paint">Paint</option>
              <option value="plating">Plating</option>
            </select>
          </div>
        </div>
        <button onClick={handleQuote} disabled={loading}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          Generate Quote
        </button>
      </div>

      {loading && <LoadingState label="Calculating..." />}
      {error && <ErrorState message={error} />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Unit Price</span>
              <span className="text-2xl font-bold text-gray-900">${result.unit_price.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Total</span>
              <span className="text-2xl font-bold text-gray-900">${result.total.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Lead Time</span>
              <span className="text-2xl font-bold text-gray-900">{result.lead_time_days} days</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Cost Breakdown</h3>
            {[
              { label: 'Material', value: result.material_cost, color: 'bg-blue-400' },
              { label: 'Cutting', value: result.cutting_cost, color: 'bg-green-400' },
              { label: 'Bending', value: result.bending_cost, color: 'bg-yellow-400' },
              { label: 'Finishing', value: result.finishing_cost, color: 'bg-purple-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 text-sm">
                <span className="w-24">{row.label}</span>
                <div className="flex-1 mx-4 bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${row.color}`}
                    style={{ width: `${result.total > 0 ? (row.value / result.total) * 100 : 0}%` }} />
                </div>
                <span className="font-mono w-24 text-right">${row.value.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t font-bold text-sm mt-2">
              <span>Total</span>
              <span className="font-mono">${result.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
