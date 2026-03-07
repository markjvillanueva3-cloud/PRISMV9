/**
 * Scheduling Page — Job shop scheduling visualization with Gantt-style display.
 */
import { useState } from 'react';
import { schedulingJobShop, schedulingSingleMachine, schedulingJohnsons, schedulingCPM, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { ScheduleResult } from '../api/types';

type Tab = 'jobshop' | 'single' | 'johnsons' | 'cpm';

export function SchedulingPage() {
  const [tab, setTab] = useState<Tab>('jobshop');
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [johnsonsResult, setJohnsonsResult] = useState<any>(null);
  const [cpmResult, setCpmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSchedule() {
    setLoading(true);
    setError(null);
    try {
      const sampleJobs = {
        jobs: [
          { id: 'J-001', operations: [{ machine: 'CNC-1', duration: 120 }, { machine: 'CNC-2', duration: 60 }] },
          { id: 'J-002', operations: [{ machine: 'CNC-2', duration: 90 }, { machine: 'CNC-1', duration: 45 }] },
          { id: 'J-003', operations: [{ machine: 'CNC-1', duration: 80 }, { machine: 'CNC-3', duration: 100 }] },
        ],
        method: 'job_shop',
      };
      const r = await schedulingJobShop(sampleJobs);
      setResult(r.result as unknown as ScheduleResult);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to run schedule');
    } finally {
      setLoading(false);
    }
  }

  const jobColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
        <p className="text-sm text-gray-500 mt-1">
          Job shop, single machine, Johnson's algorithm, and CPM scheduling.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          { key: 'jobshop', label: 'Job Shop' },
          { key: 'single', label: 'Single Machine' },
          { key: 'johnsons', label: "Johnson's Rule" },
          { key: 'cpm', label: 'CPM Network' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              tab === t.key
                ? 'bg-prism-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Optimizing schedule..." />}
      {error && <ErrorState message={error} onRetry={runSchedule} />}

      {/* Job Shop Tab */}
      {tab === 'jobshop' && !result && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
          <p className="text-gray-500 mb-4">
            Run sample 3-job schedule across CNC machines.
          </p>
          <button onClick={runSchedule}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700">
            Run Job Shop Schedule
          </button>
        </div>
      )}

      {tab === 'jobshop' && result && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Makespan</span>
              <span className="text-xl font-bold text-gray-900">{result.makespan} min</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Utilization</span>
              <span className="text-xl font-bold text-gray-900">{(result.utilization * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Operations</span>
              <span className="text-xl font-bold text-gray-900">{result.schedule.length}</span>
            </div>
          </div>

          {/* Gantt Chart (simplified) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule Gantt</h2>
            {(() => {
              const machines = [...new Set(result.schedule.map((s) => s.machine))];
              const maxEnd = Math.max(...result.schedule.map((s) => s.end), 1);
              const jobs = [...new Set(result.schedule.map((s) => s.job_id))];

              return (
                <div className="space-y-2">
                  {machines.map((machine) => (
                    <div key={machine} className="flex items-center">
                      <span className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">{machine}</span>
                      <div className="flex-1 bg-gray-100 rounded h-8 relative">
                        {result.schedule
                          .filter((s) => s.machine === machine)
                          .map((s, i) => {
                            const left = (s.start / maxEnd) * 100;
                            const width = ((s.end - s.start) / maxEnd) * 100;
                            const colorIdx = jobs.indexOf(s.job_id) % jobColors.length;
                            return (
                              <div key={i}
                                className={`absolute h-8 ${jobColors[colorIdx]} rounded text-xs text-white flex items-center justify-center font-medium`}
                                style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                                title={`${s.job_id}: ${s.start}-${s.end} min`}>
                                {width > 8 ? s.job_id : ''}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex gap-3 mt-3 pt-3 border-t">
                    {jobs.map((j, i) => (
                      <div key={j} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${jobColors[i % jobColors.length]}`} />
                        <span className="text-xs text-gray-600">{j}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Schedule Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Machine</th>
                  <th className="px-4 py-3">Start (min)</th>
                  <th className="px-4 py-3">End (min)</th>
                  <th className="px-4 py-3">Duration (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.schedule.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{s.job_id}</td>
                    <td className="px-4 py-2">{s.machine}</td>
                    <td className="px-4 py-2 font-mono">{s.start}</td>
                    <td className="px-4 py-2 font-mono">{s.end}</td>
                    <td className="px-4 py-2 font-mono">{s.end - s.start}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Single Machine */}
      {tab === 'single' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">
              Single Machine Scheduling
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Optimize job sequence on a single machine (SPT/EDD/WSPT).
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await schedulingSingleMachine({
                  jobs: [
                    { id: 'J1', processing_time: 10, due_date: 25, weight: 1 },
                    { id: 'J2', processing_time: 5, due_date: 15, weight: 2 },
                    { id: 'J3', processing_time: 8, due_date: 20, weight: 1 },
                    { id: 'J4', processing_time: 3, due_date: 10, weight: 3 },
                  ],
                  rule: 'wspt',
                });
                setSingleResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Scheduling failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
              Run WSPT Schedule
            </button>
          </div>
          {singleResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(singleResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Johnson's Rule */}
      {tab === 'johnsons' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">
              Johnson's Rule (2-Machine Flow Shop)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Optimal sequencing for 2-machine flow shop to minimize makespan.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await schedulingJohnsons({
                  jobs: [
                    { id: 'J1', machine1_time: 5, machine2_time: 8 },
                    { id: 'J2', machine1_time: 9, machine2_time: 3 },
                    { id: 'J3', machine1_time: 4, machine2_time: 7 },
                    { id: 'J4', machine1_time: 7, machine2_time: 2 },
                  ],
                });
                setJohnsonsResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Scheduling failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
              Run Johnson's Algorithm
            </button>
          </div>
          {johnsonsResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(johnsonsResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* CPM */}
      {tab === 'cpm' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">
              Critical Path Method (CPM)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Identify critical path and project duration.
            </p>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await schedulingCPM({
                  activities: [
                    { id: 'A', duration: 3, dependencies: [] },
                    { id: 'B', duration: 5, dependencies: ['A'] },
                    { id: 'C', duration: 2, dependencies: ['A'] },
                    { id: 'D', duration: 4, dependencies: ['B', 'C'] },
                    { id: 'E', duration: 1, dependencies: ['D'] },
                  ],
                });
                setCpmResult(r.result);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'CPM failed'
                );
              } finally { setLoading(false); }
            }}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium">
              Run CPM Analysis
            </button>
          </div>
          {cpmResult && (
            <pre className="bg-white rounded-lg border p-4 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(cpmResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
