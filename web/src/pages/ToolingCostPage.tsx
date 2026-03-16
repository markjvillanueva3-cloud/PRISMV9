/**
 * Tooling Cost Page — Tool usage tracking, cost per job, wear analysis, reorder alerts.
 */
import { useState, useEffect } from 'react';
import { getToolUsage, toolReorderAlerts, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { ToolUsageRecord, ReorderAlert } from '../api/shopTypes';

type Tab = 'usage' | 'reorders';

export function ToolingCostPage() {
  const [tab, setTab] = useState<Tab>('usage');
  const [records, setRecords] = useState<ToolUsageRecord[]>([]);
  const [reorders, setReorders] = useState<ReorderAlert[]>([]);
  const [jobFilter, setJobFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsage() {
    setLoading(true);
    setError(null);
    try {
      const r = await getToolUsage(jobFilter ? { job_id: jobFilter } : {});
      setRecords((r.result as unknown as { records: ToolUsageRecord[] }).records ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tool usage');
    } finally {
      setLoading(false);
    }
  }

  async function loadReorders() {
    setLoading(true); setError(null);
    try {
      const r = await toolReorderAlerts();
      setReorders((r.result as any)?.alerts ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load reorder alerts');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === 'usage') loadUsage();
    if (tab === 'reorders') loadReorders();
  }, [tab]);

  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const avgWear = records.length > 0 ? records.reduce((s, r) => s + r.wear_percent, 0) / records.length : 0;
  const highWear = records.filter((r) => r.wear_percent >= 80);

  function wearColor(pct: number): string {
    if (pct < 50) return 'text-green-600';
    if (pct < 80) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tooling Cost Report</h1>
        <p className="text-sm text-gray-500 mt-1">Track tool usage, wear, and cost per job.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('usage')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'usage' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Tool Usage
        </button>
        <button onClick={() => setTab('reorders')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'reorders' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Reorder Alerts
        </button>
      </div>

      {tab === 'usage' && (
      <>
      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label htmlFor="tc-job" className="block text-sm font-medium text-gray-700 mb-1">Filter by Job (optional)</label>
            <input id="tc-job" type="text" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
              placeholder="Leave empty for all jobs"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <button onClick={loadUsage} disabled={loading}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {loading && <LoadingState label="Loading tool usage..." />}
      {error && <ErrorState message={error} onRetry={loadUsage} />}

      {!loading && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <span className="text-xs text-gray-500 block">Total Tool Cost</span>
              <span className="text-xl font-bold">${totalCost.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <span className="text-xs text-gray-500 block">Tools Tracked</span>
              <span className="text-xl font-bold">{records.length}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <span className="text-xs text-gray-500 block">Avg Wear</span>
              <span className={`text-xl font-bold ${wearColor(avgWear)}`}>{avgWear.toFixed(0)}%</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <span className="text-xs text-gray-500 block">Reorder Alerts</span>
              <span className={`text-xl font-bold ${highWear.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {highWear.length}
              </span>
            </div>
          </div>

          {/* Reorder alerts */}
          {highWear.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-red-800 mb-2">Reorder Required</h3>
              <div className="space-y-1">
                {highWear.map((r) => (
                  <div key={r.id} className="text-sm text-red-700">
                    <span className="font-medium">{r.tool_name}</span> — {r.wear_percent}% worn (Job: {r.job_id})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage table */}
          {records.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Tool</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3">Usage (min)</th>
                    <th className="px-4 py-3">Wear</th>
                    <th className="px-4 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{r.tool_name}</td>
                      <td className="px-4 py-2">{r.job_id}</td>
                      <td className="px-4 py-2">{r.operation}</td>
                      <td className="px-4 py-2 font-mono">{r.usage_minutes.toFixed(1)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${r.wear_percent >= 80 ? 'bg-red-500' : r.wear_percent >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(r.wear_percent, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono ${wearColor(r.wear_percent)}`}>{r.wear_percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono">${r.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {tab === 'reorders' && reorders.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3 text-right">Current Qty</th>
                <th className="px-4 py-3 text-right">Min Stock</th>
                <th className="px-4 py-3 text-right">Reorder Qty</th>
                <th className="px-4 py-3 text-right">Est Cost</th>
                <th className="px-4 py-3">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reorders.map(r => (
                <tr key={r.tool_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.tool_name}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.current_qty}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.min_stock}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.reorder_qty}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${r.estimated_cost?.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.urgency === 'high' ? 'bg-red-100 text-red-700' :
                      r.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{r.urgency}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
