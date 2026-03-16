/**
 * Batch Planning Page — Group jobs by material/setup, optimize sequence, analyze capacity.
 */
import { useState } from 'react';
import { batchGroup, batchSequence, ApiError } from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { BatchGroup, BatchSequence } from '../api/shopTypes';

type Tab = 'group' | 'sequence';

export function BatchPlanningPage() {
  const [tab, setTab] = useState<Tab>('group');
  const [groups, setGroups] = useState<BatchGroup[]>([]);
  const [sequence, setSequence] = useState<BatchSequence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobIds, setJobIds] = useState('J-001, J-002, J-003, J-004');

  async function handleGroup() {
    setLoading(true);
    setError(null);
    try {
      const ids = jobIds.split(',').map(s => s.trim()).filter(Boolean);
      const r = await batchGroup({ job_ids: ids });
      setGroups((r.result as any)?.groups ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Grouping failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSequence() {
    setLoading(true);
    setError(null);
    try {
      const ids = jobIds.split(',').map(s => s.trim()).filter(Boolean);
      const r = await batchSequence({ job_ids: ids });
      setSequence(r.result as unknown as BatchSequence);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sequencing failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Batch Planning</h1>
        <p className="text-sm text-gray-500 mt-1">Group jobs by material/setup and optimize production sequence.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('group')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'group' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Group Jobs
        </button>
        <button onClick={() => setTab('sequence')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'sequence' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Sequence
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Job IDs (comma-separated)</label>
          <input type="text" value={jobIds} onChange={e => setJobIds(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={tab === 'group' ? handleGroup : handleSequence} disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {tab === 'group' ? 'Group' : 'Optimize Sequence'}
        </button>
      </div>

      {loading && <LoadingState label="Optimizing..." />}
      {error && <ErrorState message={error} />}

      {tab === 'group' && groups.length > 0 && !loading && (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <div key={g.group_id ?? i} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Group {i + 1}: {g.material}</span>
                <span className="text-sm text-green-600 font-mono">Saves {g.setup_savings_min?.toFixed(0)}min setup</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(g.jobs ?? []).map(j => (
                  <span key={j} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono">{j}</span>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">Total time: {g.total_time_min?.toFixed(0)} min</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sequence' && sequence && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Total Setup</span>
              <span className="text-xl font-bold font-mono">{sequence.total_setup_min?.toFixed(0)} min</span>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Savings vs Naive</span>
              <span className="text-xl font-bold text-green-600 font-mono">{sequence.savings_vs_naive_pct?.toFixed(1)}%</span>
            </div>
          </div>

          {(sequence.sequence ?? []).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3 text-right">Setup (min)</th>
                    <th className="px-4 py-3 text-right">Run (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sequence.sequence.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-4 py-2 font-mono">{s.job_id}</td>
                      <td className="px-4 py-2 text-right font-mono">{s.setup_min?.toFixed(0)}</td>
                      <td className="px-4 py-2 text-right font-mono">{s.run_min?.toFixed(0)}</td>
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
