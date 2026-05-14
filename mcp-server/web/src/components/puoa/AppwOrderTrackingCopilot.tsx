import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwOrderTrackingCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  selectedOrderId?: string | null;
  selectedJobId?: string | null;
  partNumber?: string | null;
  machine?: string | null;
  status?: string | null;
  quantity?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  activeOrderCount?: number;
  queueDepth?: number;
  queueRowCount?: number;
  onTimePct?: number | null;
  avgLeadDays?: number | null;
  activeWorkOrders?: number | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  orderReference?: string | null;
  continuityNote?: string | null;
  createResult?: Record<string, unknown> | null;
  executionResult?: Record<string, unknown> | null;
}

function formatHours(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return `${value} hr`;
}

function buildSummary(props: AppwOrderTrackingCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.selectedJobId) posture.push(`job ${props.selectedJobId}`);
  if (props.selectedOrderId) posture.push(`order ${props.selectedOrderId}`);
  if (props.partNumber) posture.push(`part ${props.partNumber}`);
  if (props.status) posture.push(`status ${props.status}`);
  if (props.machine) posture.push(`machine ${props.machine}`);
  if (typeof props.quantity === 'number') posture.push(`${props.quantity} pcs`);

  const estHours = formatHours(props.estimatedHours);
  const actualHours = formatHours(props.actualHours);
  if (estHours || actualHours) {
    posture.push(`${actualHours ?? '0 hr'} actual / ${estHours ?? '0 hr'} est`);
  }

  posture.push(`${props.activeOrderCount ?? 0} active orders`);
  posture.push(`${props.queueDepth ?? 0} queued jobs`);
  posture.push(`${props.queueRowCount ?? 0} machine queue rows`);

  if (typeof props.onTimePct === 'number') posture.push(`${props.onTimePct}% on time`);
  if (typeof props.avgLeadDays === 'number') posture.push(`${props.avgLeadDays} day average lead`);
  if (typeof props.activeWorkOrders === 'number') posture.push(`${props.activeWorkOrders} active work orders`);
  if (props.createResult) posture.push('new order response mounted');
  if (props.executionResult) posture.push('execution response mounted');
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.orderReference) posture.push(`reference ${props.orderReference}`);

  return `PRISM AI is reasoning over live order posture, machine queue depth, order-health metrics, recent execution writes, and workflow continuity for the Order Tracking desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwOrderTrackingCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if (props.selectedJobId || props.selectedOrderId) {
    suggestions.push({
      id: 'execution-next',
      label: 'Execution next move',
      query: `Given the live order, queue, and metrics posture, what should happen next for ${props.selectedJobId ?? props.selectedOrderId}? Separate operator, planner, and billing follow-up actions.`,
    });
  }

  if ((props.queueDepth ?? 0) > 0 || (props.queueRowCount ?? 0) > 0) {
    suggestions.push({
      id: 'queue-risk',
      label: 'Queue bottleneck risk',
      query: `Review the current machine queue posture and explain where the next bottleneck is likely to land, what should be expedited, and what should stay queued.`,
    });
  }

  if (typeof props.onTimePct === 'number' || typeof props.avgLeadDays === 'number') {
    suggestions.push({
      id: 'schedule-health',
      label: 'Schedule health',
      query: `Summarize schedule health from the current on-time, queue-depth, and lead-time signals. Explain what the team should do next to protect delivery performance.`,
    });
  }

  if (props.executionResult || props.createResult) {
    suggestions.push({
      id: 'write-interpretation',
      label: 'Interpret latest write',
      query: `Interpret the latest order write response and explain what changed in the live workspace, what still needs verification, and what downstream desk should receive the next handoff.`,
    });
  }

  if (props.launcherSourceLabel || props.upstreamSourceLabel || props.continuityNote) {
    suggestions.push({
      id: 'continuity',
      label: 'Cross-desk continuity',
      query: `Explain how Order Tracking should preserve continuity with the upstream workflow context and what must survive if the user pivots into Jobs, Invoices, or Messages.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      label: 'Open order brief',
      query: `Review the ${props.deskLabel} context and recommend the next order-control, queue, and follow-up actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwOrderTrackingCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    selected_order_id: props.selectedOrderId,
    selected_job_id: props.selectedJobId,
    part_number: props.partNumber,
    machine: props.machine,
    status: props.status,
    quantity: props.quantity ?? 0,
    estimated_hours: props.estimatedHours ?? 0,
    actual_hours: props.actualHours ?? 0,
    active_order_count: props.activeOrderCount ?? 0,
    queue_depth: props.queueDepth ?? 0,
    queue_row_count: props.queueRowCount ?? 0,
    on_time_pct: props.onTimePct ?? null,
    avg_lead_days: props.avgLeadDays ?? null,
    active_work_orders: props.activeWorkOrders ?? null,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    order_reference: props.orderReference,
    continuity_note: props.continuityNote,
    create_result: props.createResult ?? null,
    execution_result: props.executionResult ?? null,
    appw_stage: 'APPW-MS1 order tracking intelligence hardening',
    desk_type: 'order_tracking',
  };
}

export function AppwOrderTrackingCopilot(props: AppwOrderTrackingCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneLabel,
      props.activeOrderCount,
      props.activeWorkOrders,
      props.actualHours,
      props.avgLeadDays,
      props.createResult,
      props.estimatedHours,
      props.executionResult,
      props.launcherSourceLabel,
      props.machine,
      props.onTimePct,
      props.orderReference,
      props.partNumber,
      props.quantity,
      props.queueDepth,
      props.queueRowCount,
      props.selectedJobId,
      props.selectedOrderId,
      props.status,
      props.upstreamSourceLabel,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.continuityNote,
      props.createResult,
      props.deskLabel,
      props.executionResult,
      props.launcherSourceLabel,
      props.onTimePct,
      props.avgLeadDays,
      props.queueDepth,
      props.queueRowCount,
      props.selectedJobId,
      props.selectedOrderId,
      props.upstreamSourceLabel,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.activeOrderCount,
      props.activeWorkOrders,
      props.actualHours,
      props.avgLeadDays,
      props.continuityNote,
      props.createResult,
      props.deskLabel,
      props.estimatedHours,
      props.executionResult,
      props.launcherSourceLabel,
      props.machine,
      props.onTimePct,
      props.orderReference,
      props.partNumber,
      props.quantity,
      props.queueDepth,
      props.queueRowCount,
      props.selectedJobId,
      props.selectedOrderId,
      props.status,
      props.upstreamSourceLabel,
    ],
  );

  return (
    <div data-testid="appw-order-tracking-copilot">
      <WorkspaceAICopilot
        workspaceLabel={props.deskLabel}
        summary={summary}
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
}

export default AppwOrderTrackingCopilot;
