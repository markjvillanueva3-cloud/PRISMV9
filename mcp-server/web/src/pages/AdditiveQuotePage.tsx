/**
 * Additive Manufacturing Quote Page — 3D printing cost estimation and technology comparison.
 */
import { useState, useEffect } from 'react';
import { additiveQuote, additiveListMaterials, additiveCompareTech, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { AdditiveQuoteResult, AdditiveMaterial } from '../api/types';

type Tab = 'quote' | 'materials' | 'compare';

export function AdditiveQuotePage() {
  const [tab, setTab] = useState<Tab>('quote');
  const [result, setResult] = useState<AdditiveQuoteResult | null>(null);
  const [materials, setMaterials] = useState<AdditiveMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);

  const [form, setForm] = useState({
    technology: 'SLS', material: 'PA12_Nylon', quantity: '10',
    volume_cm3: '50', surface_area_cm2: '200', support_volume_pct: '15',
  });

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const r = await additiveQuote({
        technology: form.technology, material: form.material,
        quantity: parseInt(form.quantity) || 1,
        volume_cm3: parseFloat(form.volume_cm3) || 50,
        surface_area_cm2: parseFloat(form.surface_area_cm2) || 200,
        support_volume_pct: parseFloat(form.support_volume_pct) || 15,
      });
      setResult(r.result as unknown as AdditiveQuoteResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    setLoading(true);
    setError(null);
    try {
      const r = await additiveListMaterials();
      setMaterials((r.result as any)?.materials ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (tab === 'materials') loadMaterials(); }, [tab]);

  const technologies = ['SLS', 'SLA', 'FDM', 'DMLS', 'MJF', 'EBM', 'Binder_Jetting'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Additive Manufacturing Quote</h1>
        <p className="text-sm text-gray-500 mt-1">3D printing cost estimation across technologies and materials.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('quote')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'quote' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Quote
        </button>
        <button onClick={() => setTab('materials')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'materials' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Materials
        </button>
        <button onClick={() => setTab('compare')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'compare' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Compare Tech
        </button>
      </div>

      {tab === 'quote' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
              <select value={form.technology} onChange={(e) => setForm({ ...form, technology: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                {technologies.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            {[
              { label: 'Quantity', key: 'quantity' },
              { label: 'Volume (cm³)', key: 'volume_cm3' },
              { label: 'Surface Area (cm²)', key: 'surface_area_cm2' },
              { label: 'Support Volume %', key: 'support_volume_pct' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="number" value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={handleQuote} disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Generate Quote
          </button>
        </div>
      )}

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'quote' && result && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Unit Price', value: `$${result.unit_price.toFixed(2)}` },
              { label: 'Total', value: `$${result.total.toFixed(2)}` },
              { label: 'Build Time', value: `${result.build_time_hours.toFixed(1)}h` },
              { label: 'Technology', value: result.technology },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{c.label}</span>
                <span className="text-xl font-bold text-gray-900">{c.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Cost Breakdown</h3>
            {[
              { label: 'Material', value: result.material_cost },
              { label: 'Machine Time', value: result.machine_cost },
              { label: 'Post-Processing', value: result.post_processing_cost },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2 text-sm">
                <span>{row.label}</span>
                <span className="font-mono">${row.value.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t font-bold">
              <span>Total</span>
              <span className="font-mono">${result.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'materials' && materials.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Technology</th>
                <th className="px-4 py-3 text-right">Price/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2">{m.technology}</td>
                  <td className="px-4 py-2 text-right font-mono">${m.price_per_kg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Compare Technologies */}
      {tab === 'compare' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Compare AM Technologies</h2>
            <p className="text-sm text-gray-500 mb-4">
              Compare cost, speed, and quality across additive technologies for your part.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await additiveCompareTech({
                  volume_cm3: parseFloat(form.volume_cm3) || 50,
                  surface_area_cm2: parseFloat(form.surface_area_cm2) || 200,
                  quantity: parseInt(form.quantity) || 10,
                });
                setCompareResult(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Compare failed');
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
              Compare All Technologies
            </button>
          </div>
          {compareResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <pre className="text-xs font-mono overflow-auto max-h-96">
                {JSON.stringify(compareResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
