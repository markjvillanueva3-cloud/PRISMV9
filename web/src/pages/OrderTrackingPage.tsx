import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  orderCreate,
  orderList,
  orderLogProduction,
  orderLogTime,
  orderMachineQueue,
  orderMetrics,
  orderUpdateStatus,
  ApiError,
} from '../api/client';
import { MilestoneTimelinePanel } from '../components/erp/MilestoneTimelinePanel';
import { syncMilestoneMutation, type MilestoneSyncEvent } from '../components/erp/milestoneIntelligence';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { MilestoneSyncResult, OrderMetrics } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'orders' | 'queue' | 'metrics' | 'create' | 'logtime';

type OrderRecord = {
  id?: string;
  job_id?: string;
  status?: string;
  machine?: string;
  est_hours?: number;
  actual_hours?: number;
  quantity?: number;
  part_number?: string;
  notes?: string;
};

type QueueRecord = {
  machine?: string;
  machine_name?: string;
  current_job?: string;
  queue_depth?: number;
  queued_jobs?: number;
  est_completion?: string;
};

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  orders: { label: 'Orders', detail: 'Active work orders, owners, and progress posture.' },
  queue: { label: 'Queue', detail: 'Machine-side queue depth and near-term completion posture.' },
  metrics: { label: 'Metrics', detail: 'Lead-time, on-time, and work-order health snapshot.' },
  create: { label: 'Create', detail: 'Stage a new work order without leaving the dispatch desk.' },
  logtime: { label: 'Execution', detail: 'Capture labor, production, and status changes from one lane.' },
};

function statusTone(status?: string): 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' {
  switch ((status ?? '').toLowerCase()) {
    case 'complete':
    case 'completed':
      return 'emerald';
    case 'in_progress':
    case 'running':
      return 'sky';
    case 'hold':
    case 'pending':
      return 'amber';
    case 'blocked':
    case 'late':
      return 'rose';
    default:
      return 'slate';
  }
}

export function OrderTrackingPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedJobId = routeParams.get('jobId') || routeContext.focus.jobId || (routeContext.focus.type === 'job' ? routeContext.focus.id : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [queue, setQueue] = useState<QueueRecord[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<Record<string, unknown> | null>(null);
  const [executionResult, setExecutionResult] = useState<Record<string, unknown> | null>(null);
  const [milestoneEvents, setMilestoneEvents] = useState<Record<string, MilestoneSyncEvent[]>>({});
  const [milestoneRefreshKeys, setMilestoneRefreshKeys] = useState<Record<string, number>>({});
  const activeTab = TAB_CONFIG[tab];

  const applyMilestoneEventWindow = useCallback((jobId: string, events: MilestoneSyncEvent[], refreshTimeline: boolean) => {
    setMilestoneEvents((current) => ({
      ...current,
      [jobId]: events,
    }));
    if (refreshTimeline) {
      setMilestoneRefreshKeys((current) => ({
        ...current,
        [jobId]: (current[jobId] ?? 0) + 1,
      }));
    }
  }, []);

  const applyServerMilestoneSync = useCallback((jobId: string, prismSync?: MilestoneSyncResult | null) => {
    if (!prismSync) {
      return false;
    }

    applyMilestoneEventWindow(jobId, prismSync.recent_events, prismSync.refresh_timeline);
    return true;
  }, [applyMilestoneEventWindow]);

  const activeOrderCount = useMemo(
    () => orders.filter((entry) => (entry.status ?? '').toLowerCase() !== 'complete').length,
    [orders],
  );

  const queueDepth = useMemo(
    () => queue.reduce((sum, entry) => sum + Number(entry.queue_depth ?? entry.queued_jobs ?? 0), 0),
    [queue],
  );
  const activeOrder = useMemo(
    () => orders.find((entry) => entry.job_id === routedJobId || entry.id === routedJobId) ?? orders[0] ?? null,
    [orders, routedJobId],
  );
  const workflowRecordType = activeOrder ? 'Order' : routeContext.origin.recordType;
  const workflowRecordId = activeOrder?.id || activeOrder?.job_id || routedJobId || routeContext.origin.recordId;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'order-tracking',
            recordType: workflowRecordType,
            recordId: workflowRecordId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || `Keep ${activeOrder?.job_id || 'the active order'} attached while execution moves into jobs, billing, or follow-up.`,
            threadId: routeContext.origin.threadId,
          },
    [activeOrder?.job_id, launcherSource, routeContext.origin, workflowRecordId, workflowRecordType],
  );
  const effectiveFocus = useMemo(
    () =>
      activeOrder?.job_id
        ? {
            type: 'job',
            id: activeOrder.job_id,
            jobId: activeOrder.job_id,
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [activeOrder?.job_id, routeContext.focus],
  );
  const orderReference = workflowRecordType && workflowRecordId ? `${workflowRecordType} ${workflowRecordId}` : '';
  const jobsPath = useMemo(
    () =>
      buildWorkflowPath('/jobs', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'order-tracking',
          jobId: activeOrder?.job_id || routedJobId,
        },
      }),
    [activeOrder?.job_id, effectiveFocus, effectiveOrigin, location.search, routedJobId],
  );
  const invoicesPath = useMemo(
    () =>
      buildWorkflowPath('/invoices', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'order-tracking',
          jobId: activeOrder?.job_id || routedJobId,
        },
      }),
    [activeOrder?.job_id, effectiveFocus, effectiveOrigin, location.search, routedJobId],
  );
  const messagesPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'order-tracking',
          jobId: activeOrder?.job_id || routedJobId,
          note:
            routeContext.origin.note
            || `Follow up on execution posture for ${activeOrder?.job_id || routedJobId || 'the active order'} without losing the upstream origin.`,
        },
      }),
    [activeOrder?.job_id, effectiveFocus, effectiveOrigin, location.search, routeContext.origin.note, routedJobId],
  );

  async function loadData(target: Tab = tab) {
    setLoading(true);
    setError(null);
    try {
      if (target === 'orders') {
        const response = await orderList();
        const next = (response.result as any)?.orders ?? (response.result as any) ?? [];
        setOrders(Array.isArray(next) ? next : []);
      }
      if (target === 'queue') {
        const response = await orderMachineQueue();
        const next = (response.result as any)?.queue ?? (response.result as any) ?? [];
        setQueue(Array.isArray(next) ? next : []);
      }
      if (target === 'metrics') {
        const response = await orderMetrics();
        setMetrics((response.result as unknown as OrderMetrics) ?? null);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load order data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'orders' || tab === 'queue' || tab === 'metrics') {
      void loadData(tab);
    }
  }, [tab]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const jobId = String(form.get('job_id') ?? '');
    setLoading(true);
    setError(null);
    try {
      const response = await orderCreate({
        job_id: jobId,
        part_number: form.get('part_number'),
        quantity: Number(form.get('quantity') ?? 1) || 1,
        machine_id: form.get('machine_id'),
        priority: form.get('priority') || 'normal',
        notes: form.get('notes'),
      });
      const resultPayload = (response.result as (Record<string, unknown> & { prism_sync?: MilestoneSyncResult }) | undefined);
      setCreateResult(resultPayload ?? { created: true });
      if (jobId) {
        if (!applyServerMilestoneSync(jobId, resultPayload?.prism_sync)) {
          const milestoneSync = await syncMilestoneMutation({
            jobId,
            source: 'order-tracking',
            trigger: 'order-created',
            note: `Machine ${String(form.get('machine_id') ?? 'unassigned')} staged ${String(form.get('part_number') ?? jobId)} into the work-order lane.`,
          });
          applyMilestoneEventWindow(jobId, milestoneSync.recentEvents, milestoneSync.refreshTimeline);
        }
      }
      await loadData('orders');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create work order');
    } finally {
      setLoading(false);
    }
  }

  async function handleExecution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get('action') ?? 'time');
    const orderId = String(form.get('order_id') ?? '');
    const jobId =
      orders.find((entry) => entry.id === orderId || entry.job_id === orderId)?.job_id
      || activeOrder?.job_id
      || routedJobId
      || orderId;
    setLoading(true);
    setError(null);
    try {
      let response;
      if (action === 'status') {
        response = await orderUpdateStatus({
          order_id: orderId,
          status: String(form.get('status') ?? 'in_progress'),
          job_id: jobId || undefined,
        });
      } else if (action === 'production') {
        response = await orderLogProduction({
          order_id: orderId,
          job_id: jobId,
          quantity_completed: Number(form.get('quantity_completed') ?? 0),
          scrap_qty: Number(form.get('scrap_qty') ?? 0),
          notes: form.get('production_notes'),
        });
      } else {
        response = await orderLogTime({
          order_id: orderId,
          job_id: jobId,
          employee_id: form.get('employee_id'),
          hours: Number(form.get('hours') ?? 0),
          operation: form.get('operation'),
        });
      }
      const resultPayload = (response.result as (Record<string, unknown> & { prism_sync?: MilestoneSyncResult }) | undefined);
      setExecutionResult(resultPayload ?? { saved: true });
      if (jobId) {
        if (!applyServerMilestoneSync(jobId, resultPayload?.prism_sync)) {
          const milestoneSync = await syncMilestoneMutation(
            action === 'status'
              ? {
                  jobId,
                  source: 'order-tracking',
                  trigger: 'order-status-changed',
                  status: String(form.get('status') ?? 'in_progress'),
                  note: `Order control updated ${orderId} through the execution lane.`,
                }
              : action === 'production'
                ? {
                    jobId,
                    source: 'order-tracking',
                    trigger: 'order-production-logged',
                    quantityCompleted: Number(form.get('quantity_completed') ?? 0),
                    scrapQty: Number(form.get('scrap_qty') ?? 0),
                    note: String(form.get('production_notes') ?? ''),
                  }
                : {
                    jobId,
                    source: 'order-tracking',
                    trigger: 'order-time-logged',
                    operation: String(form.get('operation') ?? ''),
                    hours: Number(form.get('hours') ?? 0),
                    note: `Employee ${String(form.get('employee_id') ?? 'unknown')} logged time against ${orderId}.`,
                  },
          );
          applyMilestoneEventWindow(jobId, milestoneSync.recentEvents, milestoneSync.refreshTimeline);
        }
      }
      await loadData('orders');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to save execution update');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Order control"
        title="Order Tracking"
        description="Manage work orders, watch machine queues, and record execution without dropping back into the older white-card dispatch screens."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Open orders"
              value={String(activeOrderCount || metrics?.active_work_orders || 0)}
              hint="Work still moving across machines and routing steps."
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Queue posture"
              value={String(queueDepth || metrics?.queue_depth || 0)}
              hint="Total queued jobs across the current machine snapshot."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Dispatch brief</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Keep orders, queue, and execution updates in one operator-facing shell so status drift is visible before it hits planning.
              </div>
            </div>
            {launcherSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Order Tracking with execution context.{' '}
                {effectiveOrigin.note || 'Keep the active order attached while work moves into jobs, billing, or follow-up.'}
                {orderReference ? (
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                    Record: <span className="font-semibold normal-case tracking-normal">{orderReference}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {upstreamSourceLabel ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                Upstream order origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
              </div>
            ) : null}
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('orders')}>Open live orders</ActionButton>
              <ActionButton tone="emerald" onClick={() => setTab('create')}>
                Stage new work order
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing order workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'orders' || tab === 'queue' || tab === 'metrics' ? () => void loadData(tab) : undefined} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          {tab === 'orders' ? (
            <PanelCard title="Order board" subtitle="Active work orders stay visible with status, machine, and hour posture.">
              <div className="space-y-3">
                {orders.length > 0 ? (
                  orders.map((order, index) => (
                    <div
                      key={order.id ?? `${order.job_id ?? 'order'}-${index}`}
                      className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{order.job_id ?? order.id ?? `WO-${index + 1}`}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {order.part_number ?? 'Part number pending'}
                          </div>
                        </div>
                        <StatusPill label={(order.status ?? 'unknown').replace(/_/g, ' ')} tone={statusTone(order.status)} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Machine</div>
                          <div className="mt-1">{order.machine ?? 'Unassigned'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Quantity</div>
                          <div className="mt-1">{order.quantity ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Est hours</div>
                          <div className="mt-1">{order.est_hours ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actual hours</div>
                          <div className="mt-1">{order.actual_hours ?? '-'}</div>
                        </div>
                      </div>
                      {order.notes ? <div className="mt-3 text-sm text-slate-400">{order.notes}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No active work orders loaded for this snapshot.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'queue' ? (
            <PanelCard title="Machine queue" subtitle="Queue depth and completion posture by machine instead of a flat spreadsheet view.">
              <div className="grid gap-3 md:grid-cols-2">
                {queue.length > 0 ? (
                  queue.map((entry, index) => (
                    <div key={`${entry.machine ?? entry.machine_name ?? 'queue'}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{entry.machine ?? entry.machine_name ?? 'Unknown machine'}</div>
                        <StatusPill label={`${entry.queue_depth ?? entry.queued_jobs ?? 0} queued`} tone="amber" />
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-300">
                        <div>
                          <span className="text-slate-500">Current job:</span> {entry.current_job ?? 'Idle'}
                        </div>
                        <div>
                          <span className="text-slate-500">Estimated completion:</span> {entry.est_completion ?? 'No estimate'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    Queue data is not available for this machine snapshot.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'metrics' ? (
            <PanelCard title="Order health" subtitle="Lead time, queue, and on-time posture staged as operational summary tiles.">
              {metrics ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryTile label="Total orders" value={String(metrics.total_orders)} hint="Orders currently tracked in the current reporting window." />
                  <SummaryTile
                    label="On-time"
                    value={`${metrics.on_time_pct}%`}
                    hint="Portion of orders landing on or ahead of promise."
                    accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Average lead"
                    value={`${metrics.avg_lead_days} d`}
                    hint="Average end-to-end lead time."
                    accent="from-sky-400/22 via-sky-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Queue depth"
                    value={String(metrics.queue_depth)}
                    hint="Queued jobs still waiting on machine time."
                    accent="from-amber-300/22 via-amber-200/8 to-transparent"
                  />
                  <SummaryTile
                    label="Active work orders"
                    value={String(metrics.active_work_orders)}
                    hint="Orders actively moving through production right now."
                    accent="from-violet-400/22 via-violet-300/8 to-transparent"
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  Run the metrics lane to stage the current order-health snapshot.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'create' ? (
            <PanelCard title="Create work order" subtitle="Stage a new order with the minimum routing and planning detail needed to get it moving.">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
                <Field label="Job ID">
                  <Input name="job_id" placeholder="JOB-2026-001" required />
                </Field>
                <Field label="Part number">
                  <Input name="part_number" placeholder="BRK-1001" />
                </Field>
                <Field label="Quantity">
                  <Input name="quantity" type="number" defaultValue={1} min={1} />
                </Field>
                <Field label="Machine">
                  <Input name="machine_id" placeholder="VF-2SS / ST-20 / UMC-750" />
                </Field>
                <Field label="Priority">
                  <Select name="priority" defaultValue="normal">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="rush">Rush</option>
                  </Select>
                </Field>
                <Field label="Notes">
                  <Input name="notes" placeholder="Fixture posture, deadline, or routing notes" />
                </Field>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Create order
                  </button>
                  {createResult ? <StatusPill label="Order staged" tone="emerald" /> : null}
                </div>
                {createResult ? (
                  <div className="md:col-span-2 rounded-[22px] border border-emerald-300/16 bg-emerald-300/8 px-4 py-4 text-sm text-emerald-100">
                    {JSON.stringify(createResult, null, 2)}
                  </div>
                ) : null}
              </form>
            </PanelCard>
          ) : null}

          {tab === 'logtime' ? (
            <div className="space-y-6">
              <PanelCard title="Execution updates" subtitle="Capture labor, quantity, and status changes in one operator-ready lane.">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleExecution}>
                  <Field label="Action">
                    <Select name="action" defaultValue="time">
                      <option value="time">Log time</option>
                      <option value="status">Update status</option>
                      <option value="production">Log production</option>
                    </Select>
                  </Field>
                  <Field label="Order ID">
                    <Input name="order_id" placeholder="WO-001" required />
                  </Field>
                  <Field label="Employee ID">
                    <Input name="employee_id" placeholder="EMP-001" />
                  </Field>
                  <Field label="Hours">
                    <Input name="hours" type="number" step="0.25" placeholder="2.5" />
                  </Field>
                  <Field label="Operation">
                    <Input name="operation" placeholder="Roughing / inspection / deburr" />
                  </Field>
                  <Field label="Status">
                    <Select name="status" defaultValue="in_progress">
                      <option value="in_progress">In progress</option>
                      <option value="hold">Hold</option>
                      <option value="complete">Complete</option>
                    </Select>
                  </Field>
                  <Field label="Quantity completed">
                    <Input name="quantity_completed" type="number" placeholder="24" />
                  </Field>
                  <Field label="Scrap quantity">
                    <Input name="scrap_qty" type="number" placeholder="0" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Production notes">
                      <Input name="production_notes" placeholder="Setup notes, downtime reason, or quality callout" />
                    </Field>
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                    >
                      Save execution update
                    </button>
                    {executionResult ? <StatusPill label="Execution saved" tone="emerald" /> : null}
                  </div>
                </form>
              </PanelCard>

              {executionResult ? (
                <PanelCard title="Last execution response" subtitle="Keep the last operator payload visible for quick review.">
                  <pre className="overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                </PanelCard>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Control room brief" subtitle="Keep the current lane and operational posture visible while working deeper in the forms.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dispatch cues</div>
                  <ul className="mt-3 space-y-2 text-slate-300">
                    <li>Keep the queue lane open during rush periods to spot bottleneck spikes.</li>
                    <li>Use the execution lane to tie labor and completed quantity to the same order update.</li>
                    <li>Refresh metrics after larger scheduling changes to keep lead-time posture honest.</li>
                  </ul>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Snapshot</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <SummaryTile label="Orders loaded" value={String(orders.length)} hint="Current list payload size." />
                    <SummaryTile
                      label="Machines in queue"
                      value={String(queue.length)}
                      hint="Machine rows staged in the queue lane."
                      accent="from-violet-400/22 via-violet-300/8 to-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>

          <MilestoneTimelinePanel
            jobId={activeOrder?.job_id || routedJobId || null}
            surface="order-tracking"
            customer={routeContext.origin.customer}
            partNumber={activeOrder?.part_number}
            jobStatus={activeOrder?.status}
            dueDate={metrics ? `${metrics.avg_lead_days} day average lead` : undefined}
            machine={activeOrder?.machine}
            queueSummary={
              queue.length > 0
                ? `${queueDepth} queued jobs across ${queue.length} machine rows.`
                : metrics
                  ? `${metrics.queue_depth} queued jobs in the current metrics snapshot.`
                  : undefined
            }
            estimatedHours={activeOrder?.est_hours}
            actualHours={activeOrder?.actual_hours}
            signals={[
              launcherSource ? `${launcherSourceLabel || 'The upstream workspace'} launched the order desk.` : '',
              upstreamSourceLabel ? `Upstream order origin is ${upstreamSourceLabel}.` : '',
              activeOrder?.notes ? `Execution note: ${activeOrder.notes}` : '',
              metrics ? `On-time performance is ${metrics.on_time_pct}% with ${metrics.avg_lead_days} average lead days.` : '',
            ]}
            intelligenceEvents={milestoneEvents[activeOrder?.job_id || routedJobId || ''] ?? []}
            refreshKey={milestoneRefreshKeys[activeOrder?.job_id || routedJobId || ''] ?? 0}
          />

          <PanelCard title="Execution handoff" subtitle="Carry order context into dispatch, billing, and communication without restating the record.">
            <div className="grid gap-3">
              <Link
                to={jobsPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Open Jobs follow-up</div>
                <div className="mt-2 text-sky-50/80">
                  Carry the active order into the dispatch desk without losing upstream commercial or workflow origin.
                </div>
              </Link>

              <Link
                to={invoicesPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm leading-6 text-violet-50 transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="font-semibold">Open Invoices follow-up</div>
                <div className="mt-2 text-violet-50/80">
                  Keep billing and collections attached to the same work-order context instead of starting from a blank invoice desk.
                </div>
              </Link>

              <Link
                to={messagesPath}
                className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm leading-6 text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
              >
                <div className="font-semibold">Open Messages follow-up</div>
                <div className="mt-2 text-cyan-50/80">
                  Bring the same order, customer, and execution posture into the communication lane for quick follow-up.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
