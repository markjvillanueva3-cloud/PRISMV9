/**
 * Capacity Planning Page — Machine loads, utilization, bottleneck detection.
 */
import { useState, useEffect } from 'react';
import { capacityAllLoads, capacityBottlenecks, capacitySummary, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { MachineLoad, Bottleneck } from '../api/types';

export function CapacityPlanningPage() {
  const [loads, setLoads] = useState<MachineLoad[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(2);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [loadsR, bnR, sumR] = await Promise.all([
        capacityAllLoads({ period_weeks: weeks }),
        capacityBottlenecks({ period_weeks: weeks }),
        capacitySummary(),
      ]);
      setLoads((loadsR.result as any)?.loads ?? []);
      setBottlenecks((bnR.result as any)?.bottlenecks ?? []);
      setSummary(sumR.result as Record<string, any>);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load capacity data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [weeks]);

  function utilColor(pct: number) {
    if (pct >= 95) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacity Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Machine loads, utilization, and bottleneck detection.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Period:</label>
          <select value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm">
            <option value={1}>1 Week</option>
            <option value={2}>2 Weeks</option>
            <option value={4}>4 Weeks</option>
          </select>
        </div>
      </div>

      {loading && <LoadingState label="Loading capacity data..." />}
      {error && <ErrorState message={error} onRetry={loadAll} />}

      {/* Summary Cards */}
      {summary && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Machines', value: summary.total_machines ?? 0 },
            { label: 'Avg Utilization', value: `${summary.avg_utilization ?? 0}%` },
            { label: 'Active Jobs', value: summary.active_jobs ?? 0 },
            { label: 'Bottlenecks', value: bottlenecks.length, color: bottlenecks.length > 0 ? 'text-red-600' : 'text-green-600' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">{c.label}</span>
              <span className={`text-xl font-bold ${c.color ?? 'text-gray-900'}`}>{c.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Machine Load Bars */}
      {loads.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Machine Utilization</h2>
          <div className="space-y-3">
            {loads.map((m) => (
              <div key={m.machine_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{m.machine_name}</span>
                  <span className="font-mono">{m.utilization_pct.toFixed(0)}% ({m.total_hours.toFixed(1)}h / {m.capacity_hours}h)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${utilColor(m.utilization_pct)}`}
                    style={{ width: `${Math.min(m.utilization_pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && !loading && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-3">Bottlenecks Detected</h2>
          <div className="space-y-3">
            {bottlenecks.map((b) => (
              <div key={b.machine_id} className="bg-white rounded-lg border border-red-100 p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{b.machine_name}</span>
                  <span className="text-red-600 font-bold">{b.utilization_pct.toFixed(0)}% — {b.overload_hours.toFixed(1)}h overloaded</span>
                </div>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {b.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
