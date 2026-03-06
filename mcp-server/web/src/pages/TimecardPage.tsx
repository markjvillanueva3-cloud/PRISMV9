/**
 * Timecard Page — Weekly timecard with job breakdowns and approval workflow.
 */
import { useState } from 'react';
import { getTimecard, listEmployees, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Employee, TimecardSummary } from '../api/types';
import { useEffect } from 'react';

function weekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function weekEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().slice(0, 10);
}

export function TimecardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [periodStart, setPeriodStart] = useState(weekStart());
  const [periodEnd, setPeriodEnd] = useState(weekEnd());
  const [timecard, setTimecard] = useState<TimecardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees()
      .then((r) => setEmployees((r.result as unknown as { employees: Employee[] }).employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  async function handleFetch() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getTimecard({
        employee_id: selectedEmployee,
        period_start: periodStart,
        period_end: periodEnd,
      });
      setTimecard(r.result as unknown as TimecardSummary);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load timecard');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timecards</h1>
        <p className="text-sm text-gray-500 mt-1">Weekly timecard with job breakdowns.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="tc-emp" className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              id="tc-emp"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              <option value="">-- Select --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tc-start" className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
            <input id="tc-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <div>
            <label htmlFor="tc-end" className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
            <input id="tc-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <div className="flex items-end">
            <button onClick={handleFetch} disabled={loading || !selectedEmployee}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors">
              Load Timecard
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingState label="Loading timecard..." />}
      {error && <ErrorState message={error} onRetry={handleFetch} />}

      {timecard && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{timecard.employee_name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[timecard.status] ?? statusColors.draft}`}>
                {timecard.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">Regular</span>
                <span className="text-xl font-bold">{timecard.regular_hours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Overtime</span>
                <span className="text-xl font-bold text-yellow-600">{timecard.overtime_hours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Double Time</span>
                <span className="text-xl font-bold text-red-600">{timecard.double_time_hours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Total</span>
                <span className="text-xl font-bold">{timecard.total_hours.toFixed(1)}h</span>
              </div>
            </div>
          </div>

          {/* Job breakdown */}
          {timecard.jobs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Job ID</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Labor Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timecard.jobs.map((j) => (
                    <tr key={j.job_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{j.job_id}</td>
                      <td className="px-4 py-2 font-mono">{j.hours.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">${j.cost.toFixed(2)}</td>
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
