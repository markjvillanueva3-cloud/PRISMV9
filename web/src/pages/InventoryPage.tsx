import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { inventoryABC, inventoryEOQ, inventorySafetyStock, inventoryToolOptimize, ApiError } from '../api/client';
import type { EOQResult, ABCClassification } from '../api/types';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type {
  InventoryCheckoutRecord,
  InventoryOperationsWorkspace,
  InventoryReceivingRecord,
  InventoryUsagePulse,
} from '../features/operating-system/contracts';
import { buildCapturePath } from '../utils/captureRoute';
import { normalizeTrackedDepartment } from '../utils/jobTracking';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'documents' | 'receiving' | 'checkout' | 'eoq' | 'abc' | 'safety' | 'toolopt';

function isTab(value: string | null): value is Tab {
  return value === 'documents'
    || value === 'receiving'
    || value === 'checkout'
    || value === 'eoq'
    || value === 'abc'
    || value === 'safety'
    || value === 'toolopt';
}

function SummaryTile({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-emerald-400/22 via-emerald-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  documents: { label: 'Documents', detail: 'Use purchase orders, delivery orders, and tooling invoices to populate inventory automatically.' },
  receiving: { label: 'Receiving', detail: 'Check material or tooling in, then route it into the department that owns it.' },
  checkout: { label: 'Checkout', detail: 'Issue inserts, holders, and tools to jobs while keeping indexed-edge usage visible.' },
  eoq: { label: 'EOQ', detail: 'Balance order frequency against carrying cost.' },
  abc: { label: 'ABC', detail: 'Classify spend so inventory attention goes where it matters.' },
  safety: { label: 'Safety Stock', detail: 'Protect service level without bloating the shelf.' },
  toolopt: { label: 'Tool Optimize', detail: 'Review tool-life economics and regrind posture.' },
};

function statusTone(status: 'ready' | 'watch' | 'blocked') {
  if (status === 'ready') return 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100';
  if (status === 'blocked') return 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100';
  return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100';
}

function renderUsageLabel(pulse: InventoryUsagePulse) {
  return `${pulse.indexedEdges}/${pulse.maxEdges} edges used`;
}

export function InventoryPage() {
  const location = useLocation();
  const operatingSystem = useOperatingSystem();
  const [tab, setTab] = useState<Tab>(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    return isTab(requestedTab) ? requestedTab : 'documents';
  });
  const [operationsWorkspace, setOperationsWorkspace] = useState<InventoryOperationsWorkspace | null>(null);
  const [receivingQueue, setReceivingQueue] = useState<InventoryReceivingRecord[]>([]);
  const [checkoutQueue, setCheckoutQueue] = useState<InventoryCheckoutRecord[]>([]);
  const [usagePulses, setUsagePulses] = useState<InventoryUsagePulse[]>([]);
  const [receivedIds, setReceivedIds] = useState<string[]>([]);
  const [checkedOutIds, setCheckedOutIds] = useState<string[]>([]);
  const [eoqResult, setEoqResult] = useState<EOQResult | null>(null);
  const [abcResult, setAbcResult] = useState<ABCClassification | null>(null);
  const [safetyResult, setSafetyResult] = useState<Record<string, number> | null>(null);
  const [toolOptResult, setToolOptResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eoqForm, setEoqForm] = useState({ annual_demand: '1000', order_cost: '50', holding_cost: '2' });
  const [safetyForm, setSafetyForm] = useState({ avg_demand: '100', demand_std: '20', lead_time_days: '5', lead_time_std: '1', service_level: '0.95' });
  const [toolOptForm, setToolOptForm] = useState({ tool_id: '', current_life_min: '45', cost_per_tool: '25', regrind_cost: '8', max_regrinds: '3' });

  const activeTab = TAB_CONFIG[tab];
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const sourceContext = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSourceContext = routeContext.origin.source && routeContext.origin.source !== sourceContext
    ? routeContext.origin.source
    : '';
  const upstreamSourceLabel = useMemo(
    () => formatWorkflowSourceLabel(upstreamSourceContext),
    [upstreamSourceContext],
  );
  const seededToolId = routeParams.get('toolId') ?? '';
  const activeReceivingRecord = receivingQueue[0] ?? null;
  const activeCheckoutRecord = checkoutQueue[0] ?? null;
  const activeUsagePulse = usagePulses[0] ?? null;
  const activeCheckoutDepartment = useMemo(() => {
    const locationLabel = activeCheckoutRecord?.location?.toLowerCase() ?? '';
    const routedDepartment = operationsWorkspace?.departmentRoutes.find((route) => {
      const routeRoot = route.department.split(' ')[0]?.toLowerCase() ?? '';
      return routeRoot ? locationLabel.includes(routeRoot) : false;
    })?.department;

    if (routedDepartment) {
      return routedDepartment;
    }

    if (locationLabel.includes('tool crib') || locationLabel.includes('presetter')) {
      return 'Tool crib';
    }

    return operationsWorkspace?.departmentRoutes[0]?.department ?? '';
  }, [activeCheckoutRecord?.location, operationsWorkspace?.departmentRoutes]);
  const activeDepartment =
    tab === 'receiving' || tab === 'documents'
      ? activeReceivingRecord?.department ?? operationsWorkspace?.departmentRoutes[0]?.department ?? ''
      : activeCheckoutDepartment || normalizeTrackedDepartment(activeUsagePulse?.state ?? '', activeUsagePulse?.label ?? '') || 'Run cycle';
  const toolingFocusId = activeCheckoutRecord?.toolId ?? activeUsagePulse?.id ?? (tab === 'toolopt' ? seededToolId : '');
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'inventory-desk',
            recordType: tab === 'receiving' || tab === 'documents' ? 'Inventory receipt' : 'Tooling',
            recordId:
              (tab === 'receiving' || tab === 'documents'
                ? activeReceivingRecord?.reference
                : toolingFocusId) ?? '',
            customer: routeContext.origin.customer,
            note: routeContext.origin.note || routeParams.get('note') || '',
            threadId: routeContext.origin.threadId,
          },
    [activeReceivingRecord?.reference, routeContext.origin, routeParams, tab, toolingFocusId],
  );
  const effectiveFocus = useMemo(
    () => {
      if (
        routeContext.focus.id
        && (routeContext.focus.type === 'inventory' || routeContext.focus.type === 'tooling')
      ) {
        return routeContext.focus;
      }
      const focusId =
        (tab === 'receiving' || tab === 'documents'
          ? activeReceivingRecord?.reference
          : toolingFocusId) ?? '';
      if (!focusId) {
        return undefined;
      }
      return {
        type: tab === 'receiving' || tab === 'documents' ? 'inventory' : 'tooling',
        id: focusId,
      };
    },
    [activeReceivingRecord?.reference, routeContext.focus, tab, toolingFocusId],
  );
  const inventoryCapturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'inventory-desk',
        target: 'inventory',
        job:
          (tab === 'receiving' || tab === 'documents'
            ? activeReceivingRecord?.reference
            : toolingFocusId) ?? '',
        department: activeDepartment,
        machine: activeUsagePulse?.machine ?? '',
        note:
          tab === 'receiving' || tab === 'documents'
            ? `Capture receiving proof, part labels, and routing evidence for ${activeReceivingRecord?.reference ?? 'the active inventory record'}.`
            : `Capture tooling condition, insert indexing, and checkout proof for ${activeCheckoutRecord?.label ?? activeUsagePulse?.label ?? 'the active tooling record'}.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [activeCheckoutRecord?.label, activeDepartment, activeReceivingRecord?.reference, activeUsagePulse?.label, activeUsagePulse?.machine, effectiveFocus, effectiveOrigin, location.pathname, location.search, tab, toolingFocusId],
  );
  const inventoryShopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'inventory-desk',
        job:
          (tab === 'receiving' || tab === 'documents'
            ? activeReceivingRecord?.reference
            : toolingFocusId) ?? '',
        department: activeDepartment,
        operation: tab === 'receiving' || tab === 'documents' ? 'Receiving handoff' : 'Tooling update',
        machine: activeUsagePulse?.machine ?? '',
        note:
          tab === 'receiving' || tab === 'documents'
            ? `Carry receiving and department-route context from Inventory into the floor desk so the next owner knows what arrived and where it belongs.`
            : `Carry tooling checkout and insert-edge context into Shop Floor so usage, indexing, and cost-per-part stay connected.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [activeDepartment, activeReceivingRecord?.reference, activeUsagePulse?.machine, effectiveFocus, effectiveOrigin, location.pathname, location.search, tab, toolingFocusId],
  );
  const inventoryMessagesPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'inventory-desk',
          note:
            tab === 'receiving' || tab === 'documents'
              ? `Follow up on receiving, routing, and ownership for ${activeReceivingRecord?.reference ?? 'the active inventory record'} without losing the upstream commercial origin.`
              : `Follow up on tooling checkout, insert indexing, and cost-per-part posture for ${activeCheckoutRecord?.label ?? activeUsagePulse?.label ?? 'the active tooling record'} without losing the upstream commercial origin.`,
        },
      }),
    [activeCheckoutRecord?.label, activeReceivingRecord?.reference, activeUsagePulse?.label, effectiveFocus, effectiveOrigin, location.search, tab],
  );
  const classColors: Record<string, string> = {
    A: 'bg-red-300/18 text-red-100 border border-red-300/16',
    B: 'bg-amber-300/18 text-amber-100 border border-amber-300/16',
    C: 'bg-emerald-300/18 text-emerald-100 border border-emerald-300/16',
  };

  useEffect(() => {
    const requestedTab = routeParams.get('tab');
    if (isTab(requestedTab) && requestedTab !== tab) {
      setTab(requestedTab);
    }

    if (seededToolId) {
      setToolOptForm((current) => current.tool_id === seededToolId ? current : { ...current, tool_id: seededToolId });
    }
  }, [location.search, routeParams, seededToolId, tab]);

  useEffect(() => {
    let active = true;
    operatingSystem.getInventoryOperationsWorkspace().then((workspace) => {
      if (!active) return;
      setOperationsWorkspace(workspace);
      setReceivingQueue(workspace.receivingQueue);
      setCheckoutQueue(workspace.checkoutQueue);
      setUsagePulses(workspace.usagePulses);
    }).catch(() => {
      if (active) setOperationsWorkspace(null);
    });
    return () => {
      active = false;
    };
  }, [operatingSystem]);

  async function calcEOQ() {
    setLoading(true); setError(null);
    try {
      const response = await inventoryEOQ({ annual_demand: parseFloat(eoqForm.annual_demand) || 0, order_cost: parseFloat(eoqForm.order_cost) || 0, holding_cost_per_unit: parseFloat(eoqForm.holding_cost) || 0 });
      setEoqResult(response.result as unknown as EOQResult); setTab('eoq');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to calculate EOQ');
    } finally { setLoading(false); }
  }

  async function calcABC() {
    setLoading(true); setError(null);
    try {
      const response = await inventoryABC({ items: [
        { id: 'ITEM-001', name: 'Carbide Inserts', annual_usage: 500, unit_cost: 12 },
        { id: 'ITEM-002', name: 'Coolant 5gal', annual_usage: 50, unit_cost: 45 },
        { id: 'ITEM-003', name: 'End Mills 1/2"', annual_usage: 200, unit_cost: 35 },
        { id: 'ITEM-004', name: 'Drill Bits Set', annual_usage: 100, unit_cost: 8 },
        { id: 'ITEM-005', name: 'Safety Glasses', annual_usage: 300, unit_cost: 5 },
      ] });
      setAbcResult(response.result as unknown as ABCClassification); setTab('abc');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to run ABC analysis');
    } finally { setLoading(false); }
  }

  async function calcSafetyStock() {
    setLoading(true); setError(null);
    try {
      const response = await inventorySafetyStock({
        avg_demand: parseFloat(safetyForm.avg_demand) || 0,
        demand_std_dev: parseFloat(safetyForm.demand_std) || 0,
        lead_time_days: parseFloat(safetyForm.lead_time_days) || 0,
        lead_time_std_dev: parseFloat(safetyForm.lead_time_std) || 0,
        service_level: parseFloat(safetyForm.service_level) || 0.95,
      });
      setSafetyResult((response.result as Record<string, number>) ?? null); setTab('safety');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Calculation failed');
    } finally { setLoading(false); }
  }

  async function calcToolOptimize() {
    setLoading(true); setError(null);
    try {
      const response = await inventoryToolOptimize({
        tool_id: toolOptForm.tool_id,
        current_life_min: parseFloat(toolOptForm.current_life_min) || 0,
        cost_per_tool: parseFloat(toolOptForm.cost_per_tool) || 0,
        regrind_cost: parseFloat(toolOptForm.regrind_cost) || 0,
        max_regrinds: parseInt(toolOptForm.max_regrinds, 10) || 3,
      });
      setToolOptResult(response.result); setTab('toolopt');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Optimization failed');
    } finally { setLoading(false); }
  }

  function markReceived(recordId: string) {
    if (!receivedIds.includes(recordId)) setReceivedIds((current) => [...current, recordId]);
  }

  function markCheckedOut(recordId: string) {
    if (!checkedOutIds.includes(recordId)) setCheckedOutIds((current) => [...current, recordId]);
  }

  function logIndexedEdge(pulseId: string) {
    setUsagePulses((current) => current.map((pulse) => pulse.id !== pulseId ? pulse : {
      ...pulse,
      indexedEdges: Math.min(pulse.indexedEdges + 1, pulse.maxEdges),
      state: pulse.indexedEdges + 1 >= pulse.maxEdges ? 'Needs replacement' : 'Edge indexed',
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(8,28,24,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-emerald-300/16 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">Inventory intelligence</span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Inventory Optimization</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">Run receiving, department routing, insert checkout, and inventory analysis from one command surface instead of treating inventory like disconnected calculators.</p>
              {sourceContext === 'quote-builder' ? (
                <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                  Quote Builder opened Inventory with calibration context. Use this lane to tie supplier documents, tooling economics, and inventory ownership back to the original quote assumptions.
                </div>
              ) : null}
              {upstreamSourceLabel ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                  Upstream commercial origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>. Keep that provenance attached while receiving, tooling, and evidence workflows branch from Inventory.
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
              <SummaryTile label="Receiving queue" value={operationsWorkspace ? String(receivingQueue.length) : 'Standby'} hint={operationsWorkspace ? 'Documents, receipts, and department routes stay tied together here.' : 'Loading receiving posture...'} accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="Live tooling" value={operationsWorkspace ? `${usagePulses.length} tracked` : 'Standby'} hint="Insert indexing and cost-per-part signals stay visible while analysis catches up." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Inventory lanes</div>
            <div className="mt-4 grid gap-3">
              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-[22px] border px-4 py-4 text-left transition ${active ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50' : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'}`}>
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Refreshing inventory analysis..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      <SurfaceStatusNotice
        title="Inventory convergence"
        surfaces={['inventoryOperations']}
      />

      {operationsWorkspace ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Convergence brief</div>
            <div className="mt-2">{operationsWorkspace.summary}</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current shell note</div>
            <div className="mt-2">{operationsWorkspace.shellNote}</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Inventory command surface" subtitle="Use operations lanes for receiving and tooling custody, then keep analysis lanes for policy and cost optimization.">
            {tab === 'documents' ? (
              <div className="grid gap-4">
                {operationsWorkspace ? operationsWorkspace.documentTemplates.map((template) => (
                  <div key={template.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{template.label}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{template.summary}</div>
                      </div>
                      <span className="rounded-full border border-emerald-300/16 bg-emerald-300/[0.08] px-3 py-1 text-xs font-semibold text-emerald-100">Inventory-ready</span>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Extract targets</div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                          {template.extractionTargets.map((target) => <li key={target}>- {target}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-slate-300">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sample path</div>
                        <div className="mt-2 break-all font-mono text-xs text-slate-400">{template.samplePath}</div>
                        <div className="mt-3 text-slate-300">{template.confidencePosture}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">Inventory document templates are still loading.</div>
                )}
              </div>
            ) : null}

            {tab === 'receiving' ? (
              <div className="grid gap-4">
                {receivingQueue.map((record) => {
                  const received = receivedIds.includes(record.id);
                  return (
                    <div key={record.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{record.reference}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{record.supplier}</div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${received ? 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100' : statusTone(record.status)}`}>
                          {received ? `Checked into ${record.department}` : record.status}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="text-sm leading-6 text-slate-300">
                          <div>{record.partCount}</div>
                          <div className="mt-2">{record.note}</div>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Department route</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{record.department}</div>
                          <button type="button" onClick={() => markReceived(record.id)} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${received ? 'bg-white/90 text-slate-950' : 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'}`}>
                            {received ? 'Already checked in' : 'Check into department'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === 'checkout' ? (
              <div className="grid gap-4">
                {checkoutQueue.map((record) => {
                  const checkedOut = checkedOutIds.includes(record.id);
                  return (
                    <div key={record.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{record.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{record.toolId}</div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${checkedOut ? 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-100' : statusTone(record.status === 'ready' ? 'ready' : 'watch')}`}>
                          {checkedOut ? 'Checked out' : record.status}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="text-sm leading-6 text-slate-300">
                          <div>{record.category} · {record.location}</div>
                          <div className="mt-2">{record.note}</div>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cost posture</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{record.priceLabel}</div>
                          <button type="button" onClick={() => markCheckedOut(record.id)} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${checkedOut ? 'bg-white/90 text-slate-950' : 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'}`}>
                            {checkedOut ? 'Assigned to job' : 'Check out to job'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === 'eoq' ? (
              <div className="grid gap-4 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Annual demand</span>
                  <input type="number" value={eoqForm.annual_demand} onChange={(event) => setEoqForm((current) => ({ ...current, annual_demand: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Order cost</span>
                  <input type="number" value={eoqForm.order_cost} onChange={(event) => setEoqForm((current) => ({ ...current, order_cost: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Holding cost / unit</span>
                  <input type="number" value={eoqForm.holding_cost} onChange={(event) => setEoqForm((current) => ({ ...current, holding_cost: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={calcEOQ} className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">Calculate EOQ</button>
                </div>
              </div>
            ) : null}

            {tab === 'abc' ? (
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                ABC classification uses the stocked sample catalog already wired into the backend. Run it here to stage the ranked spend classes in the results pane.
                <div className="mt-4">
                  <button type="button" onClick={calcABC} className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">Run ABC Analysis</button>
                </div>
              </div>
            ) : null}

            {tab === 'safety' ? (
              <div className="grid gap-4 md:grid-cols-5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Avg demand / day</span>
                  <input type="number" value={safetyForm.avg_demand} onChange={(event) => setSafetyForm((current) => ({ ...current, avg_demand: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Demand std dev</span>
                  <input type="number" value={safetyForm.demand_std} onChange={(event) => setSafetyForm((current) => ({ ...current, demand_std: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lead time days</span>
                  <input type="number" value={safetyForm.lead_time_days} onChange={(event) => setSafetyForm((current) => ({ ...current, lead_time_days: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lead time std dev</span>
                  <input type="number" value={safetyForm.lead_time_std} onChange={(event) => setSafetyForm((current) => ({ ...current, lead_time_std: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={calcSafetyStock} className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">Calculate</button>
                </div>
              </div>
            ) : null}

            {tab === 'toolopt' ? (
              <div className="grid gap-4 md:grid-cols-5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tool ID</span>
                  <input type="text" value={toolOptForm.tool_id} onChange={(event) => setToolOptForm((current) => ({ ...current, tool_id: event.target.value }))} placeholder="TOOL-001" className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Life (min)</span>
                  <input type="number" value={toolOptForm.current_life_min} onChange={(event) => setToolOptForm((current) => ({ ...current, current_life_min: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cost / tool</span>
                  <input type="number" value={toolOptForm.cost_per_tool} onChange={(event) => setToolOptForm((current) => ({ ...current, cost_per_tool: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Regrind cost</span>
                  <input type="number" value={toolOptForm.regrind_cost} onChange={(event) => setToolOptForm((current) => ({ ...current, regrind_cost: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32" />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={calcToolOptimize} className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">Optimize</button>
                </div>
              </div>
            ) : null}
          </PanelCard>

          {tab === 'documents' && operationsWorkspace ? (
            <PanelCard title="Inventory population targets" subtitle="These document packs should feed the tool crib, machine inventory, purchasing, and alarm desks together.">
              <div className="grid gap-4 xl:grid-cols-2">
                {operationsWorkspace.documentTemplates.map((template) => (
                  <div key={`${template.id}-summary`} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">{template.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{template.extractionTargets.join(' · ')}</div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'receiving' && operationsWorkspace ? (
            <PanelCard title="Department routes" subtitle="Receiving is only complete when the item is staged in the department that actually owns it.">
              <div className="grid gap-3 md:grid-cols-2">
                {operationsWorkspace.departmentRoutes.map((route) => (
                  <div key={route.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{route.department}</div>
                        <div className="mt-2 text-sm text-slate-300">{route.routingNote}</div>
                      </div>
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-3 py-1 text-xs font-semibold text-cyan-100">{route.queuedItems}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'checkout' ? (
            <PanelCard title="Live tooling usage" subtitle="Workers should be able to log tool usage and insert indexing quickly without leaving the job flow.">
              <div className="grid gap-4">
                {usagePulses.map((pulse) => (
                  <div key={pulse.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{pulse.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{pulse.machine} · {pulse.operator}</div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pulse.indexedEdges >= pulse.maxEdges ? 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100' : 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100'}`}>
                        {pulse.state}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="text-sm leading-6 text-slate-300">
                        <div>{renderUsageLabel(pulse)}</div>
                        <div className="mt-2">Current tooling efficiency: {pulse.costPerPart}</div>
                        <div className="mt-2">{pulse.nextAction}</div>
                      </div>
                      <button type="button" onClick={() => logIndexedEdge(pulse.id)} disabled={pulse.indexedEdges >= pulse.maxEdges} className="rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500">
                        {pulse.indexedEdges >= pulse.maxEdges ? 'Replace insert or tool' : 'Indexed insert'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'eoq' && eoqResult ? (
            <PanelCard title="EOQ output" subtitle="Use the inventory posture below to explain ordering cadence to purchasing.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="EOQ" value={eoqResult.eoq.toFixed(0)} hint="Recommended order quantity." />
                <SummaryTile label="Orders / year" value={eoqResult.orders_per_year.toFixed(1)} hint="Expected purchasing cadence." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                <SummaryTile label="Order cost" value={`$${eoqResult.annual_order_cost.toFixed(2)}`} hint="Annual ordering burden." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                <SummaryTile label="Total cost" value={`$${eoqResult.total_cost.toFixed(2)}`} hint="Combined carrying and ordering posture." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
              </div>
            </PanelCard>
          ) : null}

          {tab === 'abc' && abcResult ? (
            <PanelCard title="ABC output" subtitle="High-value items should float to the top without forcing users through a spreadsheet.">
              <div className="grid gap-3 md:grid-cols-3">
                {abcResult.summary.map((summary) => (
                  <div key={summary.class} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${classColors[summary.class] ?? 'bg-white/10 text-slate-100'}`}>Class {summary.class}</span>
                    <div className="mt-3 text-lg font-semibold text-slate-50">{summary.count} items</div>
                    <div className="mt-2 text-sm text-slate-400">{summary.value_pct.toFixed(1)}% of annual value</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                {abcResult.items.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_110px_110px]">
                    <div className="font-mono text-xs text-slate-400">{item.id}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{item.name}</div>
                      <div className="mt-2 text-xs text-slate-400">Class {item.class}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Annual value</div>
                      <div className="mt-2 font-mono text-slate-100">${item.annual_value.toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Cumulative</div>
                      <div className="mt-2 font-mono text-slate-100">{item.cumulative_pct.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'safety' && safetyResult ? (
            <PanelCard title="Safety stock output" subtitle="Service-level buffers stay readable here instead of getting buried in raw numbers.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="Safety stock" value={(safetyResult.safety_stock ?? 0).toFixed(0)} hint="Recommended buffer inventory." />
                <SummaryTile label="Reorder point" value={(safetyResult.reorder_point ?? 0).toFixed(0)} hint="Trigger point for replenishment." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                <SummaryTile label="Service level" value={`${((safetyResult.service_level ?? 0) * 100).toFixed(0)}%`} hint="Requested coverage probability." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                <SummaryTile label="Avg inventory" value={(safetyResult.avg_inventory ?? 0).toFixed(0)} hint="Expected on-hand posture." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
              </div>
            </PanelCard>
          ) : null}

          {tab === 'toolopt' && toolOptResult ? (
            <PanelCard title="Tool optimization output" subtitle="The raw optimization payload stays visible until we build the richer visualization layer.">
              <pre className="max-h-[560px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">{JSON.stringify(toolOptResult, null, 2)}</pre>
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Inventory brief" subtitle="Keep the operating model and the math visible together.">
            <div className="space-y-3">
              <SummaryTile label="Demand basis" value={`${safetyForm.avg_demand}/day`} hint={`Lead time ${safetyForm.lead_time_days}d · service ${(parseFloat(safetyForm.service_level) * 100).toFixed(0)}%`} accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="Tool economics" value={toolOptForm.tool_id || 'Standby'} hint={`Life ${toolOptForm.current_life_min} min · regrind $${toolOptForm.regrind_cost}`} accent="from-amber-300/22 via-amber-200/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Shared formulas" subtitle="A small shared set of formulas should drive receiving, tooling, and analytics together.">
            <div className="space-y-3">
              {(operationsWorkspace?.formulaNotes ?? []).map((formula) => (
                <div key={formula.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-50">{formula.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{formula.purpose}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{formula.output}</div>
                  <div className="mt-2 text-sm text-slate-400">{formula.note}</div>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Recommended use" subtitle="Keep the team working in the right order instead of jumping between calculators.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">1. Start with documents and receiving so the part, tool, and department records are clean before consumption begins.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">2. Use checkout and insert indexing to attribute tooling cost to the right job, machine, and operator.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">3. Layer EOQ, ABC, safety stock, and tool economics on top so purchasing policy reflects real usage instead of guesses.</div>
            </div>
          </PanelCard>

          <PanelCard title="Operations handoff" subtitle="Inventory should hand work forward with context instead of making the next desk rediscover why the record matters.">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                {tab === 'receiving' || tab === 'documents' ? (
                    <>
                      Receiving focus: <span className="font-semibold text-slate-100">{activeReceivingRecord?.reference ?? 'No active receipt'}</span>
                      {' -> '}{activeReceivingRecord?.department ?? operationsWorkspace?.departmentRoutes[0]?.department ?? 'Department pending'}
                    </>
                ) : (
                  <>
                    Tooling focus: <span className="font-semibold text-slate-100">{activeCheckoutRecord?.label ?? activeUsagePulse?.label ?? 'No active tool record'}</span>
                    {' -> '}{activeCheckoutDepartment || activeUsagePulse?.machine || 'Machine pending'}
                  </>
                )}
              </div>
              <Link
                to={inventoryCapturePath}
                className="block rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
              >
                <div>Open Capture Ops</div>
                <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
                  Capture receiving labels, tooling condition, indexing proof, and record photos without losing the inventory context.
                </div>
              </Link>
              <Link
                to={inventoryShopFloorPath}
                className="block rounded-[20px] border border-emerald-300/20 bg-emerald-300/[0.1] px-4 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.16]"
              >
                <div>Open Shop Floor follow-up</div>
                <div className="mt-2 text-sm font-normal leading-6 text-emerald-50/80">
                  Push receiving or tooling context forward so floor-side ownership, usage, and cost tracking pick up where Inventory left off.
                </div>
              </Link>
              <Link
                to={inventoryMessagesPath}
                className="block rounded-[20px] border border-sky-300/20 bg-sky-300/[0.1] px-4 py-4 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/[0.16]"
              >
                <div>Open Messages follow-up</div>
                <div className="mt-2 text-sm font-normal leading-6 text-sky-50/80">
                  Keep supplier, receiving, and tooling follow-up attached to the same record instead of making the inbox rediscover why Inventory opened it.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
