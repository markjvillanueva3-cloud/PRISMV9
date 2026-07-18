import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwOperatorCopilotProps {
  deskLabel: string;
  employeeName?: string;
  employeeRole?: string;
  jobId?: string;
  operation?: string;
  department?: string;
  machineId?: string;
  continuityNote?: string | null;
  hotJobNote?: string | null;
  roiSignals?: string[];
  launchSourceLabel?: string;
  upstreamSourceLabel?: string;
  launchReference?: string;
  customer?: string;
  threadId?: string;
  connectionStatus?: string;
  shiftStatus?: string | null;
  activeJobStatus?: string | null;
  trackedTaskTitle?: string | null;
  trackedTaskStatus?: string | null;
  trackedTaskCount?: number;
  runningTaskCount?: number;
  trackedLaborCost?: number;
  trackedPartsCompleted?: number;
  trackedExtras?: number;
  departmentCheckInCount?: number;
  skillsLabel?: string;
  pendingSyncCount?: number;
  isSyncing?: boolean;
}

function formatMoney(value?: number) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return `$${value.toFixed(2)}`;
}

function buildSummary(props: AppwOperatorCopilotProps) {
  const posture: string[] = [];
  const employeeLabel = props.employeeName
    ? props.employeeRole
      ? `${props.employeeName} (${props.employeeRole})`
      : props.employeeName
    : '';

  if (employeeLabel) posture.push(employeeLabel);
  if (props.shiftStatus) posture.push(`shift ${props.shiftStatus}`);
  if (props.connectionStatus) posture.push(`connection ${props.connectionStatus}`);
  if (props.department) posture.push(`department ${props.department}`);
  if (props.operation) posture.push(`operation ${props.operation}`);
  if (props.activeJobStatus) posture.push(`job ${props.activeJobStatus}`);
  if (props.trackedTaskTitle && props.trackedTaskStatus) {
    posture.push(`${props.trackedTaskTitle} ${props.trackedTaskStatus}`);
  }
  if ((props.runningTaskCount ?? 0) > 0 || (props.trackedTaskCount ?? 0) > 0) {
    posture.push(`${props.runningTaskCount ?? 0} running / ${props.trackedTaskCount ?? 0} staged tasks`);
  }
  if ((props.departmentCheckInCount ?? 0) > 0) {
    posture.push(`${props.departmentCheckInCount} department check-ins`);
  }
  const trackedLabor = formatMoney(props.trackedLaborCost);
  if (trackedLabor) posture.push(`${trackedLabor} tracked labor`);
  if ((props.trackedPartsCompleted ?? 0) > 0) {
    posture.push(`${props.trackedPartsCompleted} completed parts`);
  }
  if ((props.trackedExtras ?? 0) > 0) {
    posture.push(`${props.trackedExtras} extras captured`);
  }
  if (props.hotJobNote) posture.push('hot job escalation active');
  if ((props.roiSignals?.length ?? 0) > 0) posture.push(`${props.roiSignals?.length ?? 0} ROI signals`);
  if ((props.pendingSyncCount ?? 0) > 0) {
    posture.push(
      props.isSyncing
        ? `${props.pendingSyncCount} offline actions syncing now`
        : `${props.pendingSyncCount} offline actions pending sync`,
    );
  }
  if (props.launchSourceLabel) posture.push(`launched from ${props.launchSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.launchReference) posture.push(`record ${props.launchReference}`);

  const summaryTail = posture.length > 0
    ? ` Current posture: ${posture.join(' | ')}.`
    : ' Current posture is forming from the live floor desk context.';

  return `Kienzle AI is reasoning over the live operator, shift, task, commercial handoff, and escalation state from this APPW desk.${summaryTail}`;
}

function buildSuggestions(props: AppwOperatorCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if (props.jobId) {
    suggestions.push({
      id: 'job-risk',
      label: 'Summarize floor risk',
      query: `Autonomously summarize the current floor risk for ${props.jobId} and tell the operator and lead what to do next.`,
    });
  }

  if (props.employeeName && props.jobId) {
    suggestions.push({
      id: 'operator-brief',
      label: 'Operator next actions',
      query: `What should ${props.employeeName} watch next on ${props.jobId}${props.operation ? ` during ${props.operation}` : ''}?`,
    });
  }

  if (props.trackedTaskTitle || props.operation) {
    suggestions.push({
      id: 'task-stability',
      label: 'Stabilize current operation',
      query: `Review the current ${props.trackedTaskTitle ?? props.operation ?? 'shop-floor'} operation and explain the safest next machine, labor, and quality checks before the next cycle starts.`,
    });
  }

  if (props.continuityNote) {
    suggestions.push({
      id: 'handoff',
      label: 'Explain handoff',
      query: `Turn this continuity note into a clear shift handoff brief with operator actions and lead escalation points: ${props.continuityNote}`,
    });
  }

  if (props.hotJobNote) {
    suggestions.push({
      id: 'hot-job',
      label: 'Hot job response',
      query: `Given this hot-job note, what should the floor team do immediately and what should be escalated before the next cycle: ${props.hotJobNote}`,
    });
  }

  if (props.roiSignals && props.roiSignals.length > 0) {
    suggestions.push({
      id: 'roi',
      label: 'Translate signal',
      query: `Translate these live floor ROI signals into operator guidance and lead follow-up actions: ${props.roiSignals.slice(0, 3).join(' | ')}`,
    });
  }

  if ((props.pendingSyncCount ?? 0) > 0) {
    suggestions.push({
      id: 'offline-sync',
      label: 'Offline sync posture',
      query: `The shop-floor kiosk has ${props.pendingSyncCount} pending offline action${props.pendingSyncCount === 1 ? '' : 's'}. Explain what the operator should trust right now and what the lead should verify after sync completes.`,
    });
  }

  if (props.launchSourceLabel || props.launchReference || props.customer) {
    suggestions.push({
      id: 'workflow-continuity',
      label: 'Cross-workflow continuity',
      query: `Explain how the current floor desk should preserve continuity with the upstream workflow context${props.launchReference ? ` for ${props.launchReference}` : ''}${props.customer ? ` and customer ${props.customer}` : ''}.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      label: 'Open floor brief',
      query: `Review the ${props.deskLabel} context and produce the safest next actions for the operator and the lead.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwOperatorCopilotProps) {
  return {
    desk: props.deskLabel,
    employee_name: props.employeeName,
    employee_role: props.employeeRole,
    job_id: props.jobId,
    operation: props.operation,
    department: props.department,
    machine_id: props.machineId,
    continuity_note: props.continuityNote,
    hot_job_note: props.hotJobNote,
    roi_signals: props.roiSignals ?? [],
    launch_source: props.launchSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    launch_reference: props.launchReference,
    customer: props.customer,
    thread_id: props.threadId,
    connection_status: props.connectionStatus,
    shift_status: props.shiftStatus,
    active_job_status: props.activeJobStatus,
    tracked_task_title: props.trackedTaskTitle,
    tracked_task_status: props.trackedTaskStatus,
    tracked_task_count: props.trackedTaskCount ?? 0,
    running_task_count: props.runningTaskCount ?? 0,
    tracked_labor_cost: props.trackedLaborCost ?? 0,
    tracked_parts_completed: props.trackedPartsCompleted ?? 0,
    tracked_extras: props.trackedExtras ?? 0,
    department_check_in_count: props.departmentCheckInCount ?? 0,
    skills_snapshot: props.skillsLabel,
    pending_sync_count: props.pendingSyncCount ?? 0,
    syncing_now: props.isSyncing ?? false,
    hot_job_present: Boolean(props.hotJobNote),
    appw_stage: 'APPW-MS1 operator intelligence hardening',
  };
}

export function AppwOperatorCopilot(props: AppwOperatorCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeJobStatus,
      props.connectionStatus,
      props.continuityNote,
      props.department,
      props.departmentCheckInCount,
      props.deskLabel,
      props.employeeName,
      props.employeeRole,
      props.hotJobNote,
      props.isSyncing,
      props.jobId,
      props.launchReference,
      props.launchSourceLabel,
      props.operation,
      props.pendingSyncCount,
      props.roiSignals,
      props.runningTaskCount,
      props.shiftStatus,
      props.trackedExtras,
      props.trackedLaborCost,
      props.trackedPartsCompleted,
      props.trackedTaskCount,
      props.trackedTaskStatus,
      props.trackedTaskTitle,
      props.upstreamSourceLabel,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.continuityNote,
      props.customer,
      props.deskLabel,
      props.employeeName,
      props.hotJobNote,
      props.jobId,
      props.launchReference,
      props.launchSourceLabel,
      props.operation,
      props.pendingSyncCount,
      props.roiSignals,
      props.trackedTaskTitle,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeJobStatus,
      props.connectionStatus,
      props.continuityNote,
      props.customer,
      props.department,
      props.departmentCheckInCount,
      props.deskLabel,
      props.employeeName,
      props.employeeRole,
      props.hotJobNote,
      props.isSyncing,
      props.jobId,
      props.launchReference,
      props.launchSourceLabel,
      props.machineId,
      props.operation,
      props.pendingSyncCount,
      props.roiSignals,
      props.runningTaskCount,
      props.shiftStatus,
      props.skillsLabel,
      props.threadId,
      props.trackedExtras,
      props.trackedLaborCost,
      props.trackedPartsCompleted,
      props.trackedTaskCount,
      props.trackedTaskStatus,
      props.trackedTaskTitle,
      props.upstreamSourceLabel,
    ],
  );

  return (
    <div data-testid="appw-operator-copilot">
      <WorkspaceAICopilot
        workspaceLabel={props.deskLabel}
        summary={summary}
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
}

export default AppwOperatorCopilot;
