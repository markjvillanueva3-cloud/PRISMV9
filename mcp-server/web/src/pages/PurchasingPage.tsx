/**
 * Purchasing Page — Supplier search, recommendations, manufacturer directory.
 */
import { useState } from 'react';
import { purchasingSearch, purchasingRecommend, purchasingSummary, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { SupplierResult, PurchasingRecommendation } from '../api/types';

type Tab = 'search' | 'recommend' | 'summary';

export function PurchasingPage() {
  const [tab, setTab] = useState<Tab>('search');
  const [suppliers, setSuppliers] = useState<SupplierResult[]>([]);
  const [recommendations, setRecommendations] = useState<PurchasingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState('6061-T6');
  const [query, setQuery] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const r = await purchasingSearch({ material, query });
      setSuppliers((r.result as any)?.suppliers ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend() {
    setLoading(true);
    setError(null);
    try {
      const r = await purchasingRecommend({ material });
      setRecommendations((r.result as any)?.recommendations ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchasing</h1>
        <p className="text-sm text-gray-500 mt-1">Search suppliers, get recommendations, and manage vendor relationships.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('search')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'search' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Supplier Search
        </button>
        <button onClick={() => setTab('recommend')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'recommend' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Recommendations
        </button>
        <button onClick={() => setTab('summary')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'summary' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Summary
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'search' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={material} onChange={e => setMaterial(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Company name, location..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={handleSearch} disabled={loading}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm hover:bg-prism-700 disabled:opacity-50">
              Search
            </button>
          </div>

          {suppliers.length > 0 && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Materials</th>
                    <th className="px-4 py-3 text-right">Rating</th>
                    <th className="px-4 py-3 text-right">Lead Time</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-xs">{(s.materials ?? []).join(', ')}</td>
                      <td className="px-4 py-2 text-right font-mono">{s.rating}/5</td>
                      <td className="px-4 py-2 text-right font-mono">{s.lead_time_days}d</td>
                      <td className="px-4 py-2 text-xs">{s.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'recommend' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={material} onChange={e => setMaterial(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={handleRecommend} disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              Get Recommendations
            </button>
          </div>

          {recommendations.length > 0 && !loading && (
            <div className="space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className={`bg-white rounded-lg border p-4 shadow-sm ${i === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{r.supplier_name}</span>
                      <span className="text-sm text-gray-500 ml-2">{r.material}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold">${r.unit_price?.toFixed(2)}/kg</span>
                      <span className="text-xs text-gray-500 ml-2">{r.lead_time_days}d lead</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">Score: {r.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Purchasing Summary</h2>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await purchasingSummary();
                setSummaryData(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Failed');
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
              Load Summary
            </button>
          </div>
          {summaryData && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <pre className="text-xs font-mono overflow-auto max-h-96">
                {JSON.stringify(summaryData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
