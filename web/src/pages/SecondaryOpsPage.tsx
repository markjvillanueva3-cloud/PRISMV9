/**
 * Secondary Operations Page — Browse, quote, and find vendors for secondary ops.
 */
import { useState, useEffect } from 'react';
import { secOpsList, secOpsQuote, secOpsRecommend, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { SecondaryOp, SecOpsQuote } from '../api/shopTypes';

export function SecondaryOpsPage() {
  const [ops, setOps] = useState<SecondaryOp[]>([]);
  const [quoteResult, setQuoteResult] = useState<SecOpsQuote | null>(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [recMaterial, setRecMaterial] = useState('6061-T6');
  const [recommendations, setRecommendations] = useState<any[]>([]);

  async function loadOps() {
    setLoading(true);
    setError(null);
    try {
      const r = await secOpsList(category !== 'all' ? { category } : undefined);
      setOps((r.result as any)?.operations ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOps(); }, [category]);

  async function handleQuote() {
    if (!selectedOp) return;
    setLoading(true);
    setError(null);
    try {
      const r = await secOpsQuote({
        operation_id: selectedOp,
        quantity: parseInt(quantity) || 100,
      });
      setQuoteResult(r.result as unknown as SecOpsQuote);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to quote');
    } finally {
      setLoading(false);
    }
  }

  const categories = ['all', 'anodize', 'heat_treat', 'plating', 'grinding', 'ndt', 'coating', 'passivation'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Secondary Operations</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and quote heat treat, anodize, plating, NDT, and more.</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${category === c ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {c === 'all' ? 'All' : c.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} onRetry={loadOps} />}

      {/* Recommend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Get Recommended Sec Ops for Material
            </label>
            <input type="text" value={recMaterial}
              onChange={e => setRecMaterial(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={async () => {
            setLoading(true); setError(null);
            try {
              const r = await secOpsRecommend({ material: recMaterial, application: 'general' });
              setRecommendations(
                (r.result as any)?.recommendations ?? (r.result as any) ?? []
              );
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Failed');
            } finally { setLoading(false); }
          }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
            Recommend
          </button>
        </div>
        {recommendations.length > 0 && (
          <div className="mt-3 space-y-1">
            {recommendations.map((r: any, i: number) => (
              <div key={i} className="text-sm bg-blue-50 rounded p-2">
                <span className="font-medium">{r.operation ?? r.name}</span>
                {r.reason && <span className="text-gray-500 ml-2">— {r.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Quote */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
          <select value={selectedOp} onChange={(e) => setSelectedOp(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Select...</option>
            {ops.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={handleQuote} disabled={!selectedOp || loading}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          Get Quote
        </button>
      </div>

      {quoteResult && !loading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-800">Quote Result</h3>
          <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
            <div><span className="text-gray-500 block text-xs">Operation</span><span className="font-medium">{quoteResult.operation}</span></div>
            <div><span className="text-gray-500 block text-xs">Unit Cost</span><span className="font-mono font-bold">${quoteResult.unit_cost.toFixed(2)}</span></div>
            <div><span className="text-gray-500 block text-xs">Total</span><span className="font-mono font-bold">${quoteResult.total.toFixed(2)}</span></div>
            <div><span className="text-gray-500 block text-xs">Lead Time</span><span className="font-medium">{quoteResult.lead_time_days} days</span></div>
          </div>
        </div>
      )}

      {/* Operations Catalog */}
      {ops.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Cost Range</th>
                <th className="px-4 py-3 text-right">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ops.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOp(o.id)}>
                  <td className="px-4 py-2 font-mono text-xs">{o.id}</td>
                  <td className="px-4 py-2 font-medium">{o.name}</td>
                  <td className="px-4 py-2 capitalize">{o.category}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{o.description}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${o.typical_cost_range.min.toFixed(2)} – ${o.typical_cost_range.max.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">{o.lead_time_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
