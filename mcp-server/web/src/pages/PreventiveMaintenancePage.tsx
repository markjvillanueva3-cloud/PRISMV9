import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  maintenanceWorkOrderComplete,
  maintenanceWorkOrders,
  pmGenerateWorkOrder,
  pmSchedules,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  firstText,
  formatDateLabel,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function PreventiveMaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [scheduleAlerts, setScheduleAlerts] = useState<Record<string, unknown>[]>([]);
  const [workOrders, setWorkOrders] = useState<Record<string, unknown>[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [laborHours, setLaborHours] = useState('1.5');
  const [notes, setNotes] = useState('');

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleResponse, workOrderResponse] = await Promise.all([
        pmSchedules(),
        maintenanceWorkOrders(),
      ]);

      setScheduleAlerts(arrayFromPayload(scheduleResponse, ['alerts', 'schedules', 'items', 'records']));
      setWorkOrders(arrayFromPayload(workOrderResponse, ['work_orders', 'orders', 'items', 'records']));
    } catch (issue) {
      setScheduleAlerts([]);
      setWorkOrders([]);
      setError(errorMessage(issue, 'The preventive maintenance desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (!selectedAlertId && scheduleAlerts[0]) {
      setSelectedAlertId(firstText(scheduleAlerts[0], ['alert_id', 'id', 'machine_id']));
    }
  }, [scheduleAlerts, selectedAlertId]);

  useEffect(() => {
    if (!selectedWorkOrderId && workOrders[0]) {
      setSelectedWorkOrderId(firstText(workOrders[0], ['wo_id', 'id', 'work_order_id']));
    }
  }, [selectedWorkOrderId, workOrders]);

  async function handleGenerateWorkOrder() {
    if (!selectedAlertId) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await pmGenerateWorkOrder(selectedAlertId);
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || `Generated a work order from alert ${selectedAlertId}.`);
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to generate a PM work order.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteWorkOrder() {
    if (!selectedWorkOrderId) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await maintenanceWorkOrderComplete({
        wo_id: selectedWorkOrderId,
        labor_hours: Number(laborHours) || 1,
        notes: notes.trim() || undefined,
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || `Completed work order ${selectedWorkOrderId}.`);
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to complete the maintenance work order.'));
    } finally {
      setActionLoading(false);
    }
  }

  const overdueCount = scheduleAlerts.filter((entry) => firstText(entry, ['status', 'severity']).toLowerCase().includes('over')).length;
  const openHours = workOrders.reduce((sum, entry) => sum + (firstNumber(entry, ['estimated_hours', 'labor_hours']) ?? 0), 0);

  const metrics = useMemo(() => ([
    {
      label: 'PM Alerts',
      value: String(scheduleAlerts.length),
      hint: `${overdueCount} overdue posture`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Open Work Orders',
      value: String(workOrders.length),
      hint: `${openHours.toFixed(1)} planned labor hours`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Selected Alert',
      value: selectedAlertId || 'None',
      hint: 'Generation target',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [openHours, overdueCount, scheduleAlerts.length, selectedAlertId, workOrders.length]);

  const aiContext = useMemo(() => ({
    workspace: 'preventive-maintenance',
    appw_stage: 'APPW-MS0 operations support',
    schedule_alerts: scheduleAlerts,
    work_orders: workOrders,
    selected_alert_id: selectedAlertId,
    selected_work_order_id: selectedWorkOrderId,
  }), [scheduleAlerts, selectedAlertId, selectedWorkOrderId, workOrders]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Maintenance operations"
      title="Preventive Maintenance"
      description="This APPW maintenance desk is back on a live scaffold: PM alerts, work orders, and completion flow are mounted to the backend while PRISM AI reasons over the current shop-floor maintenance posture."
      surfaces={['inventoryOperations', 'shopFloor']}
      metrics={metrics}
      aiSummary="PRISM AI can prioritize PM alerts, decide which work order should move first, and explain the likely maintenance risk if the current queue does not move."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'pm-priority',
          label: 'Rank the PM queue',
          query: 'Rank the current preventive maintenance alerts and work orders by operational risk and downtime exposure.',
        },
        {
          id: 'pm-gap',
          label: 'Explain the maintenance gap',
          query: 'What maintenance backlog gap is visible right now, and what should the lead team do next?',
        },
      ]}
    >
      <PanelCard title="PM posture" subtitle="Mounted against PM schedule, work-order generation, and work-order completion routes.">
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh desk'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`Open WO ${workOrders.length}`} tone="sky" />
          <StatusPill label={`Overdue ${overdueCount}`} tone={overdueCount > 0 ? 'amber' : 'slate'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <PanelCard title="PM alert queue" subtitle="Schedule alerts and predictive work waiting to become shop-floor action.">
          <div className="space-y-3">
            {scheduleAlerts.length > 0 ? scheduleAlerts.slice(0, 8).map((entry, index) => (
              <div key={`${firstText(entry, ['alert_id', 'id', 'machine_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100">
                    {firstText(entry, ['machine_name', 'asset_name', 'alert_id']) || `Alert ${index + 1}`}
                  </div>
                  <StatusPill label={firstText(entry, ['status', 'severity']) || 'scheduled'} tone="amber" />
                </div>
                <div className="mt-1 text-slate-400">
                  Due {formatDateLabel(entry.due_date ?? entry.next_due ?? entry.target_date)}
                </div>
                <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No preventive maintenance alerts are mounted right now.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Dispatch maintenance action" subtitle="Generate a work order from a PM alert or complete an existing order.">
          <div className="space-y-4">
            <Field label="Generate Work Order From Alert">
              <Select value={selectedAlertId} onChange={(event) => setSelectedAlertId(event.target.value)}>
                {scheduleAlerts.length > 0 ? scheduleAlerts.map((entry, index) => {
                  const value = firstText(entry, ['alert_id', 'id', 'machine_id']) || `alert-${index}`;
                  const label = firstText(entry, ['machine_name', 'asset_name', 'alert_id']) || value;
                  return <option key={value} value={value}>{label}</option>;
                }) : <option value="">No alerts available</option>}
              </Select>
            </Field>
            <ActionButton onClick={() => void handleGenerateWorkOrder()} disabled={actionLoading || !selectedAlertId} tone="amber">
              {actionLoading ? 'Working...' : 'Generate work order'}
            </ActionButton>

            <div className="h-px bg-white/10" />

            <Field label="Complete Work Order">
              <Select value={selectedWorkOrderId} onChange={(event) => setSelectedWorkOrderId(event.target.value)}>
                {workOrders.length > 0 ? workOrders.map((entry, index) => {
                  const value = firstText(entry, ['wo_id', 'id', 'work_order_id']) || `wo-${index}`;
                  const label = firstText(entry, ['title', 'machine_name', 'wo_id']) || value;
                  return <option key={value} value={value}>{label}</option>;
                }) : <option value="">No work orders available</option>}
              </Select>
            </Field>
            <Field label="Labor Hours">
              <Input value={laborHours} onChange={(event) => setLaborHours(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Completion notes" />
            </Field>
            <ActionButton onClick={() => void handleCompleteWorkOrder()} disabled={actionLoading || !selectedWorkOrderId} tone="emerald">
              {actionLoading ? 'Saving...' : 'Complete work order'}
            </ActionButton>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Open work orders" subtitle="Current maintenance execution lane.">
        <div className="grid gap-3 md:grid-cols-2">
          {workOrders.length > 0 ? workOrders.slice(0, 8).map((entry, index) => (
            <div key={`${firstText(entry, ['wo_id', 'id', 'work_order_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">{firstText(entry, ['title', 'machine_name', 'wo_id']) || `Work order ${index + 1}`}</div>
              <div className="mt-1 text-slate-400">{firstText(entry, ['status', 'priority']) || 'Status unavailable'}</div>
              <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
              No open maintenance work orders are currently mounted.
            </div>
          )}
        </div>
      </PanelCard>
    </WorkspaceRecoveryScaffold>
  );
}

export default PreventiveMaintenancePage;
