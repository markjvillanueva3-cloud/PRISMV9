import { useCallback, useEffect, useMemo, useState } from 'react';
import { maintenanceWorkOrderQueue, maintenanceWorkOrderRefresh } from '../api/client';
import {
  ActionButton,
  PanelCard,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type WorkOrderStatus = 'open' | 'in_progress' | 'waiting_parts' | 'complete' | 'cancelled';
type WorkOrderPriority = 'critical' | 'high' | 'normal' | 'low';

interface WorkOrder {
  id: string;
  asset_id: string;
  asset_name: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignee?: string;
  opened_at: string;
  due_at?: string;
  est_labor_hours?: number;
}

const EMPTY_ORDERS: WorkOrder[] = [];

function statusTone(status: WorkOrderStatus): 'emerald' | 'amber' | 'slate' | 'sky' | 'rose' {
  if (status === 'complete') return 'emerald';
  if (status === 'in_progress') return 'sky';
  if (status === 'waiting_parts') return 'amber';
  if (status === 'cancelled') return 'rose';
  return 'slate';
}

function priorityTone(priority: WorkOrderPriority): 'emerald' | 'amber' | 'slate' | 'rose' {
  if (priority === 'critical') return 'rose';
  if (priority === 'high') return 'amber';
  if (priority === 'low') return 'slate';
  return 'emerald';
}

export default function MaintenanceWorkOrderPage() {
  const [orders, setOrders] = useState<WorkOrder[]>(EMPTY_ORDERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | WorkOrderStatus>('all');

  // Read the work-order queue through the typed api/client (auth header attached) rather than a raw fetch().
  // The route returns { ok, orders: WorkOrder[] } (PMWorkOrder adapted to the FE shape server-side).
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = (await maintenanceWorkOrderQueue()) as unknown as { ok?: boolean; orders?: WorkOrder[]; error?: string };
      if (payload?.ok === false) throw new Error(payload.error || 'Work-order queue unavailable');
      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (issue) {
      setOrders(EMPTY_ORDERS);
      setError(issue instanceof Error ? issue.message : 'Work-order queue unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const open = orders.filter((o) => o.status === 'open').length;
    const inProgress = orders.filter((o) => o.status === 'in_progress').length;
    const waiting = orders.filter((o) => o.status === 'waiting_parts').length;
    const critical = orders.filter((o) => o.priority === 'critical' && o.status !== 'complete').length;
    return { open, inProgress, waiting, critical };
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <WorkspaceHero
        eyebrow="ERP · Maintenance"
        title="Maintenance work orders"
        description="Open preventive and corrective work orders across all shop assets."
        metrics={
          <>
            <SummaryTile label="Open" value={summary.open.toString()} hint="unclaimed" />
            <SummaryTile label="In progress" value={summary.inProgress.toString()} hint="being worked" />
            <SummaryTile label="Waiting parts" value={summary.waiting.toString()} hint="blocked on supply" />
            <SummaryTile
              label="Critical"
              value={summary.critical.toString()}
              hint="highest priority"
              accent={summary.critical > 0 ? 'rose' : 'emerald'}
            />
          </>
        }
      />

      <PanelCard
        title="Work orders"
        subtitle={loading ? 'Loading…' : error ?? `${visible.length} shown of ${orders.length}`}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'waiting_parts', 'complete', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              type="button"
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : visible.length === 0 && !loading ? (
          <div className="text-slate-400 text-sm">No work orders matching this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400 text-xs uppercase">
                <tr>
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Assignee</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Est hrs</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id} className="border-t border-slate-800">
                    <td className="py-2 pr-4 font-mono text-xs">{order.id}</td>
                    <td className="py-2 pr-4">{order.asset_name}</td>
                    <td className="py-2 pr-4">{order.description}</td>
                    <td className="py-2 pr-4">
                      <StatusPill label={order.priority} tone={priorityTone(order.priority)} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusPill label={order.status} tone={statusTone(order.status)} />
                    </td>
                    <td className="py-2 pr-4">{order.assignee ?? '—'}</td>
                    <td className="py-2 pr-4">{order.due_at ?? '—'}</td>
                    <td className="py-2 pr-4">{order.est_labor_hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <ActionButton
            onClick={async () => {
              // Refresh re-lists through the typed client (auth header attached); the route does a real re-list,
              // and we reload local state from its response so the table reflects the fresh queue.
              await maintenanceWorkOrderRefresh();
              await load();
            }}
          >
            Refresh
          </ActionButton>
        </div>
      </PanelCard>
    </div>
  );
}
