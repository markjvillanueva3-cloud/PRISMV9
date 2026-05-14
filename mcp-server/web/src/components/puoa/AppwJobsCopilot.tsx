import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

type DispatchLaneSnapshot = {
  label: string;
  count: number;
};

export interface AppwJobsCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  selectedJobId?: string | null;
  partNumber?: string | null;
  customer?: string | null;
  jobStatus?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  workcenter?: string | null;
  queueSlot?: string | null;
  travelerProgress?: string | null;
  travelerStep?: string | null;
  travelerVariance?: string | null;
  dispatchQueueStatus?: string | null;
  queueLead?: string | null;
  queueLoad?: string | null;
  shortageCount?: number;
  blockedApprovalCount?: number;
  hotJobCount?: number;
  hotJobNote?: string | null;
  nextActions?: string[];
  purchasingActions?: string[];
  dispatchLaneSnapshot?: DispatchLaneSnapshot[];
  upstreamSourceLabel?: string | null;
  upstreamRecordLabel?: string | null;
  upstreamContextNote?: string | null;
  wsConnected?: boolean;
  onSchedule?: number;
  atRisk?: number;
  overdue?: number;
  revenuePipeline?: number;
}

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return `$${value.toLocaleString()}`;
}

function buildSummary(props: AppwJobsCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  posture.push(props.wsConnected ? 'live websocket updates connected' : 'websocket reconnecting');

  if (props.selectedJobId) posture.push(`job ${props.selectedJobId}`);
  if (props.partNumber) posture.push(`part ${props.partNumber}`);
  if (props.customer) posture.push(`customer ${props.customer}`);
  if (props.jobStatus) posture.push(`status ${props.jobStatus}`);
  if (props.priority) posture.push(`priority ${props.priority}`);
  if (props.workcenter) posture.push(`workcenter ${props.workcenter}`);
  if (props.queueSlot) posture.push(`queue slot ${props.queueSlot}`);
  if (props.travelerProgress) posture.push(`traveler ${props.travelerProgress}`);
  if (props.travelerStep) posture.push(`current step ${props.travelerStep}`);
  if (props.travelerVariance) posture.push(`variance ${props.travelerVariance}`);
  if (props.dispatchQueueStatus) posture.push(`dispatch queue ${props.dispatchQueueStatus}`);
  if (props.queueLead) posture.push(`queue lead ${props.queueLead}`);
  if (props.queueLoad) posture.push(`queue load ${props.queueLoad}`);
  if ((props.shortageCount ?? 0) > 0) posture.push(`${props.shortageCount} shortages active`);
  if ((props.blockedApprovalCount ?? 0) > 0) posture.push(`${props.blockedApprovalCount} approvals blocked`);
  if ((props.hotJobCount ?? 0) > 0) posture.push(`${props.hotJobCount} hot jobs staged`);
  if (props.hotJobNote) posture.push('selected job escalated shop hot');

  const pipelineValue = formatCurrency(props.revenuePipeline);
  if (pipelineValue) {
    posture.push(`${pipelineValue} pipeline`);
  }

  if (typeof props.onSchedule === 'number' || typeof props.atRisk === 'number' || typeof props.overdue === 'number') {
    posture.push(`${props.onSchedule ?? 0} on schedule / ${props.atRisk ?? 0} at risk / ${props.overdue ?? 0} overdue`);
  }

  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.upstreamRecordLabel) posture.push(`record ${props.upstreamRecordLabel}`);

  return `PRISM AI is reasoning over live dispatch order, traveler progress, machine queue posture, hot-job escalation, shortages, approvals, and workflow continuity for the Jobs desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwJobsCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if (props.selectedJobId) {
    suggestions.push({
      id: 'dispatch-next',
      label: 'Dispatch next move',
      query: `Using the live dispatch board, traveler route, queue state, and shortage posture, what is the next best move for ${props.selectedJobId}?`,
    });
  }

  if ((props.shortageCount ?? 0) > 0 || (props.blockedApprovalCount ?? 0) > 0) {
    suggestions.push({
      id: 'unblock-job',
      label: 'Unblock execution',
      query: `Explain how to unblock ${props.selectedJobId ?? 'the selected job'} given ${props.shortageCount ?? 0} shortages and ${props.blockedApprovalCount ?? 0} blocked approvals, and separate operator actions from planner or buyer actions.`,
    });
  }

  if (props.hotJobNote || (props.hotJobCount ?? 0) > 0) {
    suggestions.push({
      id: 'hot-job-sequence',
      label: 'Hot-job sequencing',
      query: `Re-rank the dispatch response for ${props.selectedJobId ?? 'the selected queue'} with the hot-job escalation in view and explain what should run now, what should be prepped, and what should stay blocked.`,
    });
  }

  if (props.customer || props.dueDate || typeof props.atRisk === 'number' || typeof props.overdue === 'number') {
    suggestions.push({
      id: 'promise-risk',
      label: 'Customer promise risk',
      query: `Summarize customer-commitment risk for ${props.selectedJobId ?? 'the active board'} and identify which dispatch, traveler, or purchasing actions would protect the promise date${props.dueDate ? ` of ${props.dueDate}` : ''}.`,
    });
  }

  if ((props.purchasingActions?.length ?? 0) > 0) {
    suggestions.push({
      id: 'purchasing-follow-up',
      label: 'Purchasing follow-up',
      query: `Translate these linked purchasing actions into a concise buyer and planner follow-up plan for ${props.selectedJobId ?? 'the selected job'}: ${(props.purchasingActions ?? []).slice(0, 3).join(' | ')}`,
    });
  }

  if (props.upstreamSourceLabel || props.upstreamRecordLabel || props.upstreamContextNote) {
    suggestions.push({
      id: 'continuity',
      label: 'Preserve workflow continuity',
      query: `Explain how Jobs should preserve continuity with the upstream workflow context${props.upstreamRecordLabel ? ` for ${props.upstreamRecordLabel}` : ''}. Include what must survive if the user pivots into Order Tracking, Print to CNC, or Messages.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      label: 'Open jobs brief',
      query: `Review the live ${props.deskLabel} desk context and produce the safest next dispatch, traveler, and escalation actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwJobsCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    selected_job_id: props.selectedJobId,
    part_number: props.partNumber,
    customer: props.customer,
    job_status: props.jobStatus,
    priority: props.priority,
    due_date: props.dueDate,
    workcenter: props.workcenter,
    queue_slot: props.queueSlot,
    traveler_progress: props.travelerProgress,
    traveler_step: props.travelerStep,
    traveler_variance: props.travelerVariance,
    dispatch_queue_status: props.dispatchQueueStatus,
    queue_lead: props.queueLead,
    queue_load: props.queueLoad,
    shortage_count: props.shortageCount ?? 0,
    blocked_approval_count: props.blockedApprovalCount ?? 0,
    hot_job_count: props.hotJobCount ?? 0,
    hot_job_note: props.hotJobNote,
    next_actions: props.nextActions ?? [],
    purchasing_actions: props.purchasingActions ?? [],
    dispatch_lane_snapshot: props.dispatchLaneSnapshot ?? [],
    upstream_source: props.upstreamSourceLabel,
    upstream_record: props.upstreamRecordLabel,
    upstream_context_note: props.upstreamContextNote,
    websocket_connected: props.wsConnected ?? false,
    on_schedule: props.onSchedule ?? 0,
    at_risk: props.atRisk ?? 0,
    overdue: props.overdue ?? 0,
    revenue_pipeline: props.revenuePipeline ?? 0,
    appw_stage: 'APPW-MS1 jobs intelligence hardening',
    desk_type: 'jobs_dispatch',
  };
}

export function AppwJobsCopilot(props: AppwJobsCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneLabel,
      props.atRisk,
      props.blockedApprovalCount,
      props.customer,
      props.dispatchQueueStatus,
      props.dueDate,
      props.hotJobCount,
      props.hotJobNote,
      props.jobStatus,
      props.onSchedule,
      props.overdue,
      props.partNumber,
      props.priority,
      props.queueLead,
      props.queueLoad,
      props.queueSlot,
      props.revenuePipeline,
      props.selectedJobId,
      props.shortageCount,
      props.travelerProgress,
      props.travelerStep,
      props.travelerVariance,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
      props.workcenter,
      props.wsConnected,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.atRisk,
      props.blockedApprovalCount,
      props.customer,
      props.dueDate,
      props.deskLabel,
      props.hotJobCount,
      props.hotJobNote,
      props.purchasingActions,
      props.selectedJobId,
      props.shortageCount,
      props.upstreamContextNote,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.atRisk,
      props.blockedApprovalCount,
      props.customer,
      props.deskLabel,
      props.dispatchLaneSnapshot,
      props.dispatchQueueStatus,
      props.dueDate,
      props.hotJobCount,
      props.hotJobNote,
      props.jobStatus,
      props.nextActions,
      props.onSchedule,
      props.overdue,
      props.partNumber,
      props.priority,
      props.purchasingActions,
      props.queueLead,
      props.queueLoad,
      props.queueSlot,
      props.revenuePipeline,
      props.selectedJobId,
      props.shortageCount,
      props.travelerProgress,
      props.travelerStep,
      props.travelerVariance,
      props.upstreamContextNote,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
      props.workcenter,
      props.wsConnected,
    ],
  );

  return (
    <div data-testid="appw-jobs-copilot">
      <WorkspaceAICopilot
        workspaceLabel={props.deskLabel}
        summary={summary}
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
}

export default AppwJobsCopilot;
