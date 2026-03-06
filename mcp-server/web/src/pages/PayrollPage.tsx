/**
 * Payroll Page — Run payroll, view pay stubs, YTD summary.
 */
import { useState } from 'react';
import { runPayroll, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { PayStub } from '../api/types';

function lastPeriodStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function lastPeriodEnd(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function PayrollPage() {
  const [periodStart, setPeriodStart] = useState(lastPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(lastPeriodEnd());
  const [stubs, setStubs] = useState<PayStub[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const r = await runPayroll({ period_start: periodStart, period_end: periodEnd });
      setStubs((r.result as unknown as { stubs: PayStub[] }).stubs ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Payroll run failed');
    } finally {
      setLoading(false);
    }
  }

  const totalGross = stubs.reduce((s, p) => s + p.gross_pay, 0);
  const totalNet = stubs.reduce((s, p) => s + p.net_pay, 0);
  const totalDeductions = totalGross - totalNet;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="text-sm text-gray-500 mt-1">Run payroll and view pay stubs.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pr-start" className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
            <input id="pr-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <div>
            <label htmlFor="pr-end" className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
            <input id="pr-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500" />
          </div>
          <div className="flex items-end">
            <button onClick={handleRun} disabled={loading}
              className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors">
              Run Payroll
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingState label="Processing payroll..." />}
      {error && <ErrorState message={error} onRetry={handleRun} />}

      {stubs.length > 0 && !loading && (
        <div className="space-y-4">
          {/* Totals */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">Gross Pay</span>
                <span className="text-xl font-bold">${totalGross.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Deductions</span>
                <span className="text-xl font-bold text-red-600">${totalDeductions.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Net Pay</span>
                <span className="text-xl font-bold text-green-600">${totalNet.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pay stubs table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Regular</th>
                  <th className="px-4 py-3">OT</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stubs.map((s) => (
                  <tr key={s.employee_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{s.employee_name}</td>
                    <td className="px-4 py-2 font-mono">{s.regular_hours.toFixed(1)}h</td>
                    <td className="px-4 py-2 font-mono">{s.overtime_hours.toFixed(1)}h</td>
                    <td className="px-4 py-2 font-mono">${s.gross_pay.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-red-600">
                      ${s.deductions.reduce((t, d) => t + d.amount, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono font-bold">${s.net_pay.toFixed(2)}</td>
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
