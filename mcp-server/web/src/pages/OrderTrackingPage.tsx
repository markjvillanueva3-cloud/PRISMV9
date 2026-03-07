/**
 * Order Tracking Page — Work orders, production logging, machine queue.
 */
import { useState, useEffect } from 'react';
import { orderList, orderMetrics, orderMachineQueue, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { OrderMetrics } from '../api/types';

type Tab = 'orders' | 'queue' | 'metrics';

export function OrderTrackingPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'orders': {
          const r = await orderList();
          setOrders((r.result as any)?.orders ?? (r.result as any) ?? []);
          break;
        }
        case 'queue': {
          const r = await orderMachineQueue();
          setQueue((r.result as any)?.queue ?? (r.result as any) ?? []);
          break;
        }
        case 'metrics': {
          const r = await orderMetrics();
          setMetrics(r.result as unknown as OrderMetrics);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Orders' },
    { key: 'queue', label: 'Machine Queue' },
    { key: 'metrics', label: 'Metrics' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Work orders, production logging, and machine queue management.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'orders' && orders.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3 text-right">Est Hours</th>
                <th className="px-4 py-3 text-right">Actual Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o: any, i: number) => (
                <tr key={o.id ?? i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{o.id ?? '-'}</td>
                  <td className="px-4 py-2">{o.job_id ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === 'complete' ? 'bg-green-100 text-green-700' :
                      o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{o.status ?? 'unknown'}</span>
                  </td>
                  <td className="px-4 py-2">{o.machine ?? '-'}</td>
                  <td className="px-4 py-2 text-right font-mono">{o.est_hours ?? '-'}</td>
                  <td className="px-4 py-2 text-right font-mono">{o.actual_hours ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'queue' && queue.length > 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Current Job</th>
                <th className="px-4 py-3">Queue Depth</th>
                <th className="px-4 py-3 text-right">Est Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.map((q: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{q.machine ?? q.machine_name ?? '-'}</td>
                  <td className="px-4 py-2">{q.current_job ?? '-'}</td>
                  <td className="px-4 py-2 font-mono">{q.queue_depth ?? q.queued_jobs ?? '-'}</td>
                  <td className="px-4 py-2 text-right text-xs">{q.est_completion ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'metrics' && metrics && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Orders', value: metrics.total_orders },
            { label: 'On-Time %', value: `${metrics.on_time_pct}%` },
            { label: 'Avg Lead Days', value: metrics.avg_lead_days },
            { label: 'Queue Depth', value: metrics.queue_depth },
            { label: 'Active WOs', value: metrics.active_work_orders },
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
