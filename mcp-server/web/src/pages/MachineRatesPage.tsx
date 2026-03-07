/**
 * Machine Rates Page — Machine rate database, comparison, and effective rate lookup.
 */
import { useState, useEffect } from 'react';
import { machineRateList, machineRateCompare, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { MachineRate } from '../api/types';

export function MachineRatesPage() {
  const [rates, setRates] = useState<MachineRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRates() {
    setLoading(true);
    setError(null);
    try {
      const r = await machineRateList();
      setRates((r.result as any)?.rates ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRates(); }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Machine Rates</h1>
        <p className="text-sm text-gray-500 mt-1">Hourly rates, setup costs, and overhead for each machine.</p>
      </div>

      {loading && <LoadingState label="Loading rates..." />}
      {error && <ErrorState message={error} />}

      {rates.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Hourly Rate</th>
                <th className="px-4 py-3 text-right">Setup Rate</th>
                <th className="px-4 py-3 text-right">Overhead</th>
                <th className="px-4 py-3 text-right">Effective Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map(r => (
                <tr key={r.machine_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.machine_name}</td>
                  <td className="px-4 py-2 capitalize">{r.type}</td>
                  <td className="px-4 py-2 text-right font-mono">${r.hourly_rate?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">${r.setup_rate?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono">${r.overhead_rate?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">${r.effective_rate?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
