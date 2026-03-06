/**
 * Job Profitability Page — Estimated vs actual cost, variance analysis, margin tracking.
 */
import { useState } from 'react';
import { getJobProfitability, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { JobProfitability, ActualVsEstimate } from '../api/types';

export function JobProfitabilityPage() {
  const [jobId, setJobId] = useState('');
  const [profitability, setProfitability] = useState<JobProfitability | null>(null);
  const [variances, setVariances] = useState<ActualVsEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getJobProfitability({ job_id: jobId });
      const data = r.result as unknown as { profitability: JobProfitability; variances: ActualVsEstimate[] };
      setProfitability(data.profitability);
      setVariances(data.variances ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  function varianceColor(pct: number): string {
    if (pct <= -10) return 'text-green-600';
    if (pct <= 5) return 'text-gray-700';
    if (pct <= 15) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Profitability</h1>
        <p className="text-sm text-gray-500 mt-1">Estimated vs actual cost breakdown and margin analysis.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label htmlFor="jp-job" className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
            <input id="jp-job" type="text" value={jobId} onChange={(e) => setJobId(e.target.value)}
              placeholder="JOB-2026-001"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <button onClick={handleAnalyze} disabled={loading || !jobId}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors">
            Analyze
          </button>
        </div>
      </div>

      {loading && <LoadingState label="Analyzing profitability..." />}
      {error && <ErrorState message={error} onRetry={handleAnalyze} />}

      {profitability && !loading && (
        <div className="space-y-4">
          {/* Profit summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">Revenue</span>
                <span className="text-xl font-bold">${profitability.revenue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Total Cost</span>
                <span className="text-xl font-bold">${profitability.total_cost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Profit</span>
                <span className={`text-xl font-bold ${profitability.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${profitability.profit.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Margin</span>
                <span className={`text-xl font-bold ${profitability.margin_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitability.margin_percent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          {profitability.cost_breakdown.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h3>
              <div className="space-y-2">
                {profitability.cost_breakdown.map((c) => {
                  const pct = profitability.total_cost > 0 ? (c.amount / profitability.total_cost) * 100 : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-gray-600">{c.category}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-prism-500 h-4 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="w-24 text-right text-sm font-mono">${c.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variance table */}
          {variances.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="text-sm font-medium text-gray-700">Estimated vs Actual Variance</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Estimated</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3">Variance</th>
                    <th className="px-4 py-3">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variances.map((v) => (
                    <tr key={v.category} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{v.category}</td>
                      <td className="px-4 py-2 font-mono">${v.estimated.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">${v.actual.toFixed(2)}</td>
                      <td className={`px-4 py-2 font-mono ${varianceColor(v.variance_percent)}`}>
                        {v.variance >= 0 ? '+' : ''}${v.variance.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 font-mono font-bold ${varianceColor(v.variance_percent)}`}>
                        {v.variance_percent >= 0 ? '+' : ''}{v.variance_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
