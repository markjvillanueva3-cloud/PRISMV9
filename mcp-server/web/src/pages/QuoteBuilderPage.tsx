/**
 * Quote Builder Page — Generate physics-backed quotes with material comparison and what-if.
 */
import { useState } from 'react';
import { quoteEstimate, quoteCompareMaterials, quotingGenerate, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { QuoteEstimate, MaterialComparison } from '../api/types';

type Tab = 'estimate' | 'compare' | 'generate';

export function QuoteBuilderPage() {
  const [tab, setTab] = useState<Tab>('estimate');
  const [estimate, setEstimate] = useState<QuoteEstimate | null>(null);
  const [comparisons, setComparisons] = useState<MaterialComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteDoc, setQuoteDoc] = useState<any>(null);

  const [form, setForm] = useState({
    material: '6061-T6', operation: 'milling', quantity: '100',
    part_length_mm: '100', part_width_mm: '50', part_height_mm: '25',
    complexity: 'medium', tolerance_mm: '0.05',
  });

  async function handleEstimate() {
    setLoading(true);
    setError(null);
    try {
      const r = await quoteEstimate({
        material: form.material, operation: form.operation,
        quantity: parseInt(form.quantity) || 1,
        part_length_mm: parseFloat(form.part_length_mm) || 100,
        part_width_mm: parseFloat(form.part_width_mm) || 50,
        part_height_mm: parseFloat(form.part_height_mm) || 25,
        complexity: form.complexity,
        tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
      });
      setEstimate(r.result as unknown as QuoteEstimate);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate estimate');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const r = await quoteCompareMaterials({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        materials: ['6061-T6', '7075-T6', '304 Stainless', '4140 Steel', 'Ti-6Al-4V'],
      });
      setComparisons((r.result as any)?.comparisons ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to compare materials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quote Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Physics-backed cost estimation with material comparison.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('estimate')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'estimate' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Estimate
        </button>
        <button onClick={() => setTab('compare')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'compare' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Compare Materials
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Part Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Material', key: 'material', type: 'text' },
            { label: 'Operation', key: 'operation', type: 'text' },
            { label: 'Quantity', key: 'quantity', type: 'number' },
            { label: 'Tolerance (mm)', key: 'tolerance_mm', type: 'number' },
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
            <select value={form.complexity} onChange={(e) => setForm({ ...form, complexity: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={handleEstimate} disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Generate Estimate
          </button>
          <button onClick={handleCompare} disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Compare Materials
          </button>
          <button onClick={async () => {
            setLoading(true); setError(null);
            try {
              const r = await quotingGenerate({
                material: form.material, operation: form.operation,
                quantity: parseInt(form.quantity) || 1,
                complexity: form.complexity,
                tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
              });
              setQuoteDoc(r.result);
              setTab('generate');
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Failed');
            } finally { setLoading(false); }
          }} disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
            Generate Quote Doc
          </button>
        </div>
      </div>

      {loading && <LoadingState label="Calculating..." />}
      {error && <ErrorState message={error} />}

      {/* Estimate Result */}
      {tab === 'estimate' && estimate && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Unit Price', value: `$${estimate.unit_price.toFixed(2)}` },
              { label: 'Total', value: `$${estimate.total.toFixed(2)}` },
              { label: 'Cycle Time', value: `${estimate.cycle_time_min.toFixed(1)} min` },
              { label: 'Confidence', value: `${(estimate.confidence * 100).toFixed(0)}%` },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{c.label}</span>
                <span className="text-2xl font-bold text-gray-900">{c.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Cost Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: 'Material', value: estimate.material_cost },
                { label: 'Machining', value: estimate.machining_cost },
                { label: 'Setup', value: estimate.setup_cost },
                { label: 'Tooling', value: estimate.tooling_cost },
                { label: 'Overhead', value: estimate.overhead },
                { label: 'Margin', value: estimate.margin },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-1 text-sm">
                  <span>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-prism-500 h-2 rounded-full"
                        style={{ width: `${estimate.total > 0 ? (row.value / estimate.total) * 100 : 0}%` }} />
                    </div>
                    <span className="font-mono w-20 text-right">${row.value.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t font-bold text-sm">
                <span>Total</span>
                <span className="font-mono">${estimate.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {estimate.price_breaks && estimate.price_breaks.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-3">Price Breaks</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {estimate.price_breaks.map((pb) => (
                  <div key={pb.quantity} className="border border-gray-200 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">{pb.quantity} pcs</span>
                    <span className="text-lg font-bold">${pb.unit_price.toFixed(2)}</span>
                    <span className="text-xs text-green-600 block">-{pb.savings_pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Material Comparison */}
      {tab === 'compare' && comparisons.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Cycle Time</th>
                <th className="px-4 py-3 text-right">Tool Life Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comparisons.map((c) => (
                <tr key={c.material} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{c.material}</td>
                  <td className="px-4 py-2 text-right font-mono">${c.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">${c.total.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">{c.cycle_time_min.toFixed(1)} min</td>
                  <td className="px-4 py-2 text-right font-mono">{c.tool_life_factor.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Generated Quote Doc */}
      {tab === 'generate' && quoteDoc && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Generated Quote Document</h2>
          <pre className="text-xs font-mono overflow-auto max-h-96">
            {JSON.stringify(quoteDoc, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
