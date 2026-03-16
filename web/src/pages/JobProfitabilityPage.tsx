/**
 * Job Profitability Page — Estimated vs actual cost, variance analysis, margin tracking.
 */
import { useState } from 'react';
import { getJobProfitability, actualCostForecast, actualCostMarginAlerts, financialBreakeven, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { JobProfitability, ActualVsEstimate, CostForecast, MarginAlert, BreakevenResult } from '../api/shopTypes';

type Tab = 'profitability' | 'forecast' | 'alerts' | 'breakeven';

export function JobProfitabilityPage() {
  const [jobId, setJobId] = useState('');
  const [profitability, setProfitability] = useState<JobProfitability | null>(null);
  const [variances, setVariances] = useState<ActualVsEstimate[]>([]);
  const [tab, setTab] = useState<Tab>('profitability');
  const [forecasts, setForecasts] = useState<CostForecast[]>([]);
  const [marginAlerts, setMarginAlerts] = useState<MarginAlert[]>([]);
  const [breakeven, setBreakeven] = useState<BreakevenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadForecast() {
    setLoading(true); setError(null);
    try {
      const r = await actualCostForecast({ periods: 6 });
      setForecasts((r.result as any)?.forecasts ?? (r.result as any) ?? []);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }

  async function loadAlerts() {
    setLoading(true); setError(null);
    try {
      const r = await actualCostMarginAlerts({ threshold_pct: 15 });
      setMarginAlerts((r.result as any)?.alerts ?? (r.result as any) ?? []);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }

  async function loadBreakeven() {
    setLoading(true); setError(null);
    try {
      const r = await financialBreakeven({ fixed_costs: 50000, unit_price: 150, variable_cost_per_unit: 85 });
      setBreakeven(r.result as unknown as BreakevenResult);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }

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

      <div className="flex gap-2 mb-6">
        {([
          { key: 'profitability', label: 'Job Analysis' },
          { key: 'forecast', label: 'Cost Forecast' },
          { key: 'alerts', label: 'Margin Alerts' },
          { key: 'breakeven', label: 'Breakeven' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'forecast') loadForecast(); if (t.key === 'alerts') loadAlerts(); if (t.key === 'breakeven') loadBreakeven(); }}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profitability' && (
      <>
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
      </>
      )}

      {profitability && !loading && tab === 'profitability' && (
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
      {tab === 'forecast' && forecasts.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-3">Period</th><th className="px-4 py-3 text-right">Projected Cost</th>
              <th className="px-4 py-3 text-right">Projected Revenue</th><th className="px-4 py-3 text-right">Margin</th>
              <th className="px-4 py-3">Trend</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {forecasts.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{f.period}</td>
                  <td className="px-4 py-2 text-right font-mono">${f.projected_cost?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono">${f.projected_revenue?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">{f.projected_margin_pct?.toFixed(1)}%</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.trend === 'improving' ? 'bg-green-100 text-green-700' : f.trend === 'declining' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{f.trend}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'alerts' && !loading && (
        <div className="space-y-3">
          {marginAlerts.length > 0 ? marginAlerts.map((a, i) => (
            <div key={i} className={`rounded-lg border p-4 shadow-sm ${a.alert_type === 'negative' ? 'bg-red-50 border-red-200' : a.alert_type === 'below_target' ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex justify-between"><span className="font-medium">{a.job_id} — {a.customer}</span><span className="font-mono font-bold">{a.current_margin_pct?.toFixed(1)}% margin</span></div>
              <p className="text-sm text-gray-600 mt-1">{a.recommendation}</p>
            </div>
          )) : <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">All jobs above margin threshold. No alerts.</div>}
        </div>
      )}

      {tab === 'breakeven' && breakeven && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Breakeven Units', value: breakeven.breakeven_units?.toFixed(0) },
            { label: 'Breakeven Revenue', value: `$${breakeven.breakeven_revenue?.toLocaleString()}` },
            { label: 'Margin of Safety', value: `${breakeven.margin_of_safety_pct?.toFixed(1)}%` },
            { label: 'Contribution Margin', value: `$${breakeven.contribution_margin?.toFixed(2)}` },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">{c.label}</span>
              <span className="text-xl font-bold text-gray-900">{c.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
