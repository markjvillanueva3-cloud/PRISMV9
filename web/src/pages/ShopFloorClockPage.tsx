/**
 * Shop Floor Clock Page — Operator-facing time clock interface.
 * Big-button clock in/out, job timer start/pause/stop.
 * Designed for touchscreen kiosk use on the shop floor.
 */
import { useState, useEffect, useRef } from 'react';
import {
  shiftClockIn, shiftClockOut,
  jobTimeStart, jobTimePause, jobTimeStop,
  listEmployees, ApiError,
} from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { Employee, ShiftEntry, JobTimeEntry } from '../api/shopTypes';

export function ShopFloorClockPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [shiftStatus, setShiftStatus] = useState<ShiftEntry | null>(null);
  const [activeJob, setActiveJob] = useState<JobTimeEntry | null>(null);
  const [jobId, setJobId] = useState('');
  const [operation, setOperation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listEmployees()
      .then((r) => setEmployees((r.result as unknown as { employees: Employee[] }).employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (activeJob?.status === 'running') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeJob?.status]);

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function handleShiftIn() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const r = await shiftClockIn({ employee_id: selectedEmployee });
      setShiftStatus(r.result as unknown as ShiftEntry);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleShiftOut() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const r = await shiftClockOut({ employee_id: selectedEmployee });
      setShiftStatus(r.result as unknown as ShiftEntry);
      setActiveJob(null);
      setElapsed(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStart() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await jobTimeStart({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operation || undefined,
      });
      setActiveJob(r.result as unknown as JobTimeEntry);
      setElapsed(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Job start failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobPause() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    try {
      const r = await jobTimePause({ employee_id: selectedEmployee, job_id: jobId });
      setActiveJob(r.result as unknown as JobTimeEntry);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pause failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStop() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    try {
      const r = await jobTimeStop({ employee_id: selectedEmployee, job_id: jobId });
      setActiveJob(r.result as unknown as JobTimeEntry);
      setElapsed(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Stop failed');
    } finally {
      setLoading(false);
    }
  }

  const isClockedIn = shiftStatus?.status === 'clocked_in' || shiftStatus?.status === 'on_break';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shop Floor Clock</h1>
        <p className="text-sm text-gray-500 mt-1">Clock in/out and track job time.</p>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}
      {loading && <LoadingState label="Processing..." />}

      {/* Employee selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <label htmlFor="sfc-employee" className="block text-sm font-medium text-gray-700 mb-2">
          Select Employee
        </label>
        <select
          id="sfc-employee"
          value={selectedEmployee}
          onChange={(e) => { setSelectedEmployee(e.target.value); setShiftStatus(null); setActiveJob(null); }}
          className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
        >
          <option value="">-- Select --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} — {emp.department}
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <>
          {/* Shift clock */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Shift Clock</h2>
            <div className="flex gap-4">
              {!isClockedIn ? (
                <button
                  onClick={handleShiftIn}
                  disabled={loading}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  CLOCK IN
                </button>
              ) : (
                <button
                  onClick={handleShiftOut}
                  disabled={loading}
                  className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  CLOCK OUT
                </button>
              )}
            </div>
            {shiftStatus && (
              <div className="mt-3 text-sm text-gray-600">
                Status: <span className="font-medium">{shiftStatus.status.replace('_', ' ').toUpperCase()}</span>
                {shiftStatus.total_hours != null && (
                  <span className="ml-4">Hours: <span className="font-mono">{shiftStatus.total_hours.toFixed(2)}</span></span>
                )}
              </div>
            )}
          </div>

          {/* Job timer */}
          {isClockedIn && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Job Timer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="sfc-job" className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
                  <input
                    id="sfc-job"
                    type="text"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    placeholder="e.g. JOB-2026-001"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
                  />
                </div>
                <div>
                  <label htmlFor="sfc-op" className="block text-sm font-medium text-gray-700 mb-1">Operation (optional)</label>
                  <input
                    id="sfc-op"
                    type="text"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    placeholder="e.g. OP10 Roughing"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
                  />
                </div>
              </div>

              {/* Timer display */}
              <div className="text-center mb-4">
                <span className="text-5xl font-mono font-bold text-gray-900">{formatTime(elapsed)}</span>
                {activeJob && (
                  <div className="text-sm text-gray-500 mt-1">
                    {activeJob.job_id} — {activeJob.status.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Timer controls */}
              <div className="flex justify-center gap-4">
                {(!activeJob || activeJob.status === 'completed') && (
                  <button
                    onClick={handleJobStart}
                    disabled={loading || !jobId}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    START
                  </button>
                )}
                {activeJob?.status === 'running' && (
                  <>
                    <button
                      onClick={handleJobPause}
                      disabled={loading}
                      className="bg-yellow-500 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                    >
                      PAUSE
                    </button>
                    <button
                      onClick={handleJobStop}
                      disabled={loading}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      STOP
                    </button>
                  </>
                )}
                {activeJob?.status === 'paused' && (
                  <>
                    <button
                      onClick={handleJobStart}
                      disabled={loading}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      RESUME
                    </button>
                    <button
                      onClick={handleJobStop}
                      disabled={loading}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      STOP
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
