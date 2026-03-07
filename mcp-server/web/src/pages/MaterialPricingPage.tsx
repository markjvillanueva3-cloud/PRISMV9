/**
 * Material Pricing Page — Market prices, surcharges, and material comparison.
 */
import { useState } from 'react';
import { materialPriceLookup, materialPriceCompare, materialSurcharge, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { PriceLookupResult, PriceComparison } from '../api/types';

type Tab = 'lookup' | 'compare' | 'surcharge';

export function MaterialPricingPage() {
  const [tab, setTab] = useState<Tab>('lookup');
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surchargeResult, setSurchargeResult] = useState<any>(null);
  const [surchargeMat, setSurchargeMat] = useState('6061-T6');

  const [lookupForm, setLookupForm] = useState({ material: '6061-T6', form: 'bar', region: 'us_midwest' });
  const [compareForm, setCompareForm] = useState({ materials: '6061-T6, 7075-T6, 304 Stainless, 4140 Steel', form: 'bar' });

  async function handleLookup() {
    setLoading(true);
    setError(null);
    try {
      const r = await materialPriceLookup({
        material: lookupForm.material,
        form: lookupForm.form,
        region: lookupForm.region,
      });
      setLookupResult(r.result as unknown as PriceLookupResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const mats = compareForm.materials.split(',').map((m) => m.trim()).filter(Boolean);
      const r = await materialPriceCompare({ materials: mats, form: compareForm.form });
      setComparisons((r.result as any)?.comparisons ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">Market-adjusted material prices, surcharges, and cost comparison.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('lookup')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'lookup' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Price Lookup
        </button>
        <button onClick={() => setTab('compare')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'compare' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Compare Materials
        </button>
        <button onClick={() => setTab('surcharge')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'surcharge' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Surcharges
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'lookup' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input type="text" value={lookupForm.material}
                  onChange={(e) => setLookupForm({ ...lookupForm, material: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                <select value={lookupForm.form}
                  onChange={(e) => setLookupForm({ ...lookupForm, form: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="bar">Bar</option>
                  <option value="plate">Plate</option>
                  <option value="sheet">Sheet</option>
                  <option value="tube">Tube</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select value={lookupForm.region}
                  onChange={(e) => setLookupForm({ ...lookupForm, region: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="us_midwest">US Midwest</option>
                  <option value="us_west">US West</option>
                  <option value="us_east">US East</option>
                  <option value="europe">Europe</option>
                  <option value="asia">Asia</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleLookup} disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 w-full">
                  Lookup
                </button>
              </div>
            </div>
          </div>

          {lookupResult && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Material</span>
                  <span className="text-lg font-bold">{lookupResult.material}</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Base Price</span>
                  <span className="text-lg font-mono">${lookupResult.base_price_kg.toFixed(2)}/kg</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Adjusted</span>
                  <span className="text-lg font-mono">${lookupResult.adjusted_price_kg.toFixed(2)}/kg</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Total w/ Surcharges</span>
                  <span className="text-lg font-mono font-bold text-green-700">${lookupResult.total_per_kg.toFixed(2)}/kg</span>
                </div>
              </div>

              {lookupResult.surcharges.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Surcharges</h4>
                  {lookupResult.surcharges.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="capitalize">{s.type}</span>
                      <span className="font-mono">${s.amount.toFixed(2)}/kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'compare' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Materials (comma-separated)</label>
                <input type="text" value={compareForm.materials}
                  onChange={(e) => setCompareForm({ ...compareForm, materials: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end gap-2">
                <select value={compareForm.form}
                  onChange={(e) => setCompareForm({ ...compareForm, form: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="bar">Bar</option>
                  <option value="plate">Plate</option>
                  <option value="sheet">Sheet</option>
                </select>
                <button onClick={handleCompare} disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  Compare
                </button>
              </div>
            </div>
          </div>

          {comparisons.length > 0 && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-right">Price/kg</th>
                    <th className="px-4 py-3">Relative Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisons.map((c) => {
                    const maxPrice = Math.max(...comparisons.map((x) => x.total_per_kg));
                    return (
                      <tr key={c.material} className={`hover:bg-gray-50 ${c.rank === 1 ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-2 font-bold text-gray-400">{c.rank}</td>
                        <td className="px-4 py-2 font-medium">{c.material}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">${c.total_per_kg.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className={`h-3 rounded-full ${c.rank === 1 ? 'bg-green-500' : 'bg-blue-400'}`}
                              style={{ width: `${maxPrice > 0 ? (c.total_per_kg / maxPrice) * 100 : 0}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {tab === 'surcharge' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Material Surcharge Lookup</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input type="text" value={surchargeMat}
                  onChange={e => setSurchargeMat(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await materialSurcharge({ material: surchargeMat });
                  setSurchargeResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
                Lookup
              </button>
            </div>
          </div>
          {surchargeResult && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <pre className="text-xs font-mono overflow-auto max-h-64">
                {JSON.stringify(surchargeResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
