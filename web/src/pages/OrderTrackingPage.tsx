/**
 * Order Tracking Page — Work orders, production logging, machine queue.
 */
import { useState, useEffect } from 'react';
import {
  orderList, orderMetrics, orderMachineQueue,
  orderCreate, orderUpdateStatus, orderLogTime, orderLogProduction, ApiError,
} from '../api/shop';
import { LoadingState, ErrorState } from '../components/shared/LoadingState';
import type { OrderMetrics } from '../api/shopTypes';

type Tab = 'orders' | 'queue' | 'metrics' | 'create' | 'logtime';

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

  const [createResult, setCreateResult] = useState<any>(null);
  const [logResult, setLogResult] = useState<any>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Orders' },
    { key: 'queue', label: 'Machine Queue' },
    { key: 'metrics', label: 'Metrics' },
    { key: 'create', label: 'New Order' },
    { key: 'logtime', label: 'Log Time' },
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

      {/* Create Order Tab */}
      {tab === 'create' && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create Work Order</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setLoading(true); setError(null);
            try {
              const r = await orderCreate({
                job_id: fd.get('job_id'), part_number: fd.get('part_number'),
                quantity: parseInt(fd.get('quantity') as string) || 1,
                machine_id: fd.get('machine_id'), priority: fd.get('priority') || 'normal',
                notes: fd.get('notes'),
              });
              setCreateResult(r.result);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Failed to create order');
            } finally { setLoading(false); }
          }}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
                <input name="job_id" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="JOB-2026-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                <input name="part_number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="BRK-1001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input name="quantity" type="number" defaultValue={1} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                <input name="machine_id" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="CNC-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="rush">Rush</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input name="notes" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700">
              Create Order
            </button>
          </form>
          {createResult && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
              Order created: {JSON.stringify(createResult)}
            </div>
          )}
        </div>
      )}

      {/* Log Time Tab */}
      {tab === 'logtime' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Log Time</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                const r = await orderLogTime({
                  order_id: fd.get('order_id'),
                  employee_id: fd.get('employee_id'),
                  hours: parseFloat(fd.get('hours') as string) || 0,
                  operation: fd.get('operation'),
                });
                setLogResult(r.result);
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to log time');
              } finally { setLoading(false); }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input name="order_id" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="WO-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="employee_id" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="EMP-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <input name="hours" type="number" step="0.25" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                  <input name="operation" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="roughing" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">Log Time</button>
            </form>
            {logResult && <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">Time logged.</div>}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Update Order Status</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                await orderUpdateStatus({
                  order_id: fd.get('upd_order_id') as string,
                  status: fd.get('upd_status') as string,
                });
                setLogResult({ status_updated: true });
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to update');
              } finally { setLoading(false); }
            }}>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input name="upd_order_id" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="WO-001" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select name="upd_status" className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="queued">Queued</option>
                    <option value="in_progress">In Progress</option>
                    <option value="complete">Complete</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Update</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Log Production</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true); setError(null);
              try {
                await orderLogProduction({
                  order_id: fd.get('prod_order_id'),
                  good_qty: parseInt(fd.get('good_qty') as string) || 0,
                  scrap_qty: parseInt(fd.get('scrap_qty') as string) || 0,
                  operation: fd.get('prod_operation'),
                });
                setLogResult({ production_logged: true });
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed');
              } finally { setLoading(false); }
            }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input name="prod_order_id" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="WO-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Good Qty</label>
                  <input name="good_qty" type="number" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scrap Qty</label>
                  <input name="scrap_qty" type="number" defaultValue={0} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                  <input name="prod_operation" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="finishing" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm font-medium">Log Production</button>
            </form>
          </div>
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
