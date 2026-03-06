/**
 * Scheduling Page — Job shop scheduling visualization with Gantt-style display.
 */
import { useState } from 'react';
import { schedulingJobShop, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { ScheduleResult } from '../api/types';

export function SchedulingPage() {
  const [result, setResult] = useState<ScheduleResult | null>(null);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Shop Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">Optimize job sequencing across machines. Gantt-style visualization.</p>
        </div>
        <button onClick={runSchedule}
          className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-prism-700">
          Run Schedule
        </button>
      </div>

      {loading && <LoadingState label="Optimizing schedule..." />}
      {error && <ErrorState message={error} onRetry={runSchedule} />}

      {result && !loading && (
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
    </div>
  );
}
