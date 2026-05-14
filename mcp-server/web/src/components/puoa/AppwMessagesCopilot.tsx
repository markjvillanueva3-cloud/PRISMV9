import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwMessagesCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  workspaceSummary?: string | null;
  identityLabel?: string | null;
  activeMailbox?: string | null;
  channelCount?: number;
  threadCount?: number;
  unreadThreadCount?: number;
  totalUnreadCount?: number;
  linkedRecordCount?: number;
  actionCount?: number;
  selectedThreadId?: string | null;
  selectedThreadSubject?: string | null;
  selectedThreadOwner?: string | null;
  selectedThreadSource?: string | null;
  selectedThreadPriority?: string | null;
  selectedThreadUnreadCount?: number;
  selectedThreadParticipants?: string | null;
  selectedThreadUpdatedLabel?: string | null;
  selectedEntryCount?: number;
  selectedActionLabel?: string | null;
  actionDraftLength?: number;
  primaryLinkedRecordLabel?: string | null;
  primaryLinkedRecordStatus?: string | null;
  hotJobCount?: number;
  topHotJobId?: string | null;
  topHotJobCustomer?: string | null;
  topHotJobNote?: string | null;
  workflowReference?: string | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  contextCustomer?: string | null;
  contextNote?: string | null;
  workspaceRefreshedAt?: number | null;
  hotJobsRefreshedAt?: number | null;
  workspaceIssue?: string | null;
  hotJobsIssue?: string | null;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function buildSummary(props: AppwMessagesCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.workspaceSummary) posture.push(props.workspaceSummary);
  if (props.identityLabel) posture.push(`identity ${props.identityLabel}`);
  if (props.activeMailbox) posture.push(`mailbox ${props.activeMailbox}`);
  if ((props.channelCount ?? 0) > 0) posture.push(`${props.channelCount} channels staged`);
  if ((props.threadCount ?? 0) > 0) posture.push(`${props.threadCount} threads staged`);
  if ((props.unreadThreadCount ?? 0) > 0) posture.push(`${props.unreadThreadCount} unread threads`);
  if ((props.totalUnreadCount ?? 0) > 0) posture.push(`${props.totalUnreadCount} unread messages`);
  if ((props.linkedRecordCount ?? 0) > 0) posture.push(`${props.linkedRecordCount} linked records`);
  if ((props.actionCount ?? 0) > 0) posture.push(`${props.actionCount} staged actions`);
  if (props.selectedThreadId) posture.push(`thread ${props.selectedThreadId}`);
  if (props.selectedThreadSubject) posture.push(props.selectedThreadSubject);
  if (props.selectedThreadOwner) posture.push(`owner ${props.selectedThreadOwner}`);
  if (props.selectedThreadSource) posture.push(`source ${props.selectedThreadSource}`);
  if (props.selectedThreadPriority) posture.push(`priority ${props.selectedThreadPriority}`);
  if ((props.selectedThreadUnreadCount ?? 0) > 0) posture.push(`${props.selectedThreadUnreadCount} unread in focus`);
  if (props.selectedThreadParticipants) posture.push(props.selectedThreadParticipants);
  if (props.selectedThreadUpdatedLabel) posture.push(`updated ${props.selectedThreadUpdatedLabel}`);
  if ((props.selectedEntryCount ?? 0) > 0) posture.push(`${props.selectedEntryCount} entries in focus`);
  if (props.selectedActionLabel) posture.push(`action ${props.selectedActionLabel}`);
  if ((props.actionDraftLength ?? 0) > 0) posture.push(`${props.actionDraftLength} staged draft chars`);
  if (props.primaryLinkedRecordLabel) posture.push(`linked ${props.primaryLinkedRecordLabel}`);
  if (props.primaryLinkedRecordStatus) posture.push(`linked status ${props.primaryLinkedRecordStatus}`);
  if ((props.hotJobCount ?? 0) > 0) posture.push(`${props.hotJobCount} shop hot follow-ups`);
  if (props.topHotJobId) posture.push(`top hot ${props.topHotJobId}`);
  if (props.topHotJobCustomer) posture.push(`hot customer ${props.topHotJobCustomer}`);
  if (props.topHotJobNote) posture.push(props.topHotJobNote);
  if (props.contextCustomer) posture.push(`customer ${props.contextCustomer}`);
  if (props.contextNote) posture.push(props.contextNote);
  if (props.workspaceIssue) posture.push('messages workspace degraded');
  if (props.hotJobsIssue) posture.push('hot-job feed degraded');
  posture.push(`workspace ${formatRefresh(props.workspaceRefreshedAt)}`);
  posture.push(`hot jobs ${formatRefresh(props.hotJobsRefreshedAt)}`);
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.workflowReference) posture.push(`record ${props.workflowReference}`);

  return `PRISM AI is reasoning over live inbox posture, selected-thread urgency, staged action workspace continuity, linked-record routing, shop-hot follow-up, route freshness, degraded feed signals, and workflow continuity for the Messages desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwMessagesCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.unreadThreadCount ?? 0) > 0 || (props.totalUnreadCount ?? 0) > 0) {
    suggestions.push({
      id: 'triage-inbox',
      label: 'Triage inbox pressure',
      query: 'Use the live inbox posture to explain which thread should be answered or escalated first, what makes it urgent, and which downstream desk should receive continuity after the message is handled.',
    });
  }

  if (props.selectedThreadSubject || props.selectedThreadId) {
    suggestions.push({
      id: 'assess-selected-thread',
      label: 'Assess selected thread',
      query: `Assess the active message thread${props.selectedThreadSubject ? ` about "${props.selectedThreadSubject}"` : ''}. Explain the next best response posture, the main operational or commercial risk, and whether the follow-up belongs in jobs, release, or another linked record.`,
    });
  }

  if (props.selectedActionLabel || (props.actionDraftLength ?? 0) > 0) {
    suggestions.push({
      id: 'review-staged-action',
      label: 'Review staged action',
      query: `Review the currently staged message action${props.selectedActionLabel ? ` (${props.selectedActionLabel})` : ''}. Explain whether the draft preserves the right continuity, what it still needs, and which follow-up link should be used next.`,
    });
  }

  if ((props.linkedRecordCount ?? 0) > 0 || props.primaryLinkedRecordLabel) {
    suggestions.push({
      id: 'route-linked-records',
      label: 'Route linked records',
      query: 'Interpret the linked records on the current message thread and explain which record should anchor the next handoff so the inbox does not lose operational continuity.',
    });
  }

  if ((props.hotJobCount ?? 0) > 0 || props.topHotJobId) {
    suggestions.push({
      id: 'align-shop-hot-follow-up',
      label: 'Align shop-hot follow-up',
      query: `Use the live shop-hot follow-up feed${props.topHotJobId ? ` for ${props.topHotJobId}` : ''} to explain whether the inbox should escalate, defer, or route the current thread differently before more messages stack up.`,
    });
  }

  if (props.workspaceIssue || props.hotJobsIssue || props.launcherSourceLabel || props.upstreamSourceLabel || props.workflowReference) {
    suggestions.push({
      id: 'preserve-message-continuity',
      label: 'Preserve message continuity',
      query: `Explain how Messages should preserve continuity${props.workflowReference ? ` for ${props.workflowReference}` : ''} while the inbox workspace${props.workspaceIssue || props.hotJobsIssue ? ' recovers from degraded feeds and ' : ' '}hands work back into jobs, release, or linked records.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-messages-brief',
      label: 'Open messages brief',
      query: `Review the ${props.deskLabel} context and recommend the next inbox, routing, and follow-up actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwMessagesCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    workspace_summary: props.workspaceSummary,
    identity_label: props.identityLabel,
    active_mailbox: props.activeMailbox,
    channel_count: props.channelCount ?? 0,
    thread_count: props.threadCount ?? 0,
    unread_thread_count: props.unreadThreadCount ?? 0,
    total_unread_count: props.totalUnreadCount ?? 0,
    linked_record_count: props.linkedRecordCount ?? 0,
    action_count: props.actionCount ?? 0,
    selected_thread_id: props.selectedThreadId,
    selected_thread_subject: props.selectedThreadSubject,
    selected_thread_owner: props.selectedThreadOwner,
    selected_thread_source: props.selectedThreadSource,
    selected_thread_priority: props.selectedThreadPriority,
    selected_thread_unread_count: props.selectedThreadUnreadCount ?? 0,
    selected_thread_participants: props.selectedThreadParticipants,
    selected_thread_updated_label: props.selectedThreadUpdatedLabel,
    selected_entry_count: props.selectedEntryCount ?? 0,
    selected_action_label: props.selectedActionLabel,
    action_draft_length: props.actionDraftLength ?? 0,
    primary_linked_record_label: props.primaryLinkedRecordLabel,
    primary_linked_record_status: props.primaryLinkedRecordStatus,
    hot_job_count: props.hotJobCount ?? 0,
    top_hot_job_id: props.topHotJobId,
    top_hot_job_customer: props.topHotJobCustomer,
    top_hot_job_note: props.topHotJobNote,
    workflow_reference: props.workflowReference,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    context_customer: props.contextCustomer,
    context_note: props.contextNote,
    workspace_refreshed_at: props.workspaceRefreshedAt ?? null,
    hot_jobs_refreshed_at: props.hotJobsRefreshedAt ?? null,
    workspace_issue: props.workspaceIssue,
    hot_jobs_issue: props.hotJobsIssue,
    appw_stage: 'APPW-MS1 messages intelligence hardening',
    desk_type: 'messages',
  };
}

export function AppwMessagesCopilot(props: AppwMessagesCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.actionCount,
      props.actionDraftLength,
      props.activeLaneLabel,
      props.activeMailbox,
      props.channelCount,
      props.contextCustomer,
      props.contextNote,
      props.hotJobCount,
      props.hotJobsIssue,
      props.hotJobsRefreshedAt,
      props.identityLabel,
      props.launcherSourceLabel,
      props.linkedRecordCount,
      props.primaryLinkedRecordLabel,
      props.primaryLinkedRecordStatus,
      props.selectedActionLabel,
      props.selectedEntryCount,
      props.selectedThreadId,
      props.selectedThreadOwner,
      props.selectedThreadParticipants,
      props.selectedThreadPriority,
      props.selectedThreadSource,
      props.selectedThreadSubject,
      props.selectedThreadUnreadCount,
      props.selectedThreadUpdatedLabel,
      props.threadCount,
      props.topHotJobCustomer,
      props.topHotJobId,
      props.topHotJobNote,
      props.totalUnreadCount,
      props.unreadThreadCount,
      props.upstreamSourceLabel,
      props.workflowReference,
      props.workspaceIssue,
      props.workspaceRefreshedAt,
      props.workspaceSummary,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.actionDraftLength,
      props.deskLabel,
      props.hotJobCount,
      props.hotJobsIssue,
      props.launcherSourceLabel,
      props.linkedRecordCount,
      props.selectedActionLabel,
      props.selectedThreadId,
      props.selectedThreadSubject,
      props.topHotJobId,
      props.totalUnreadCount,
      props.unreadThreadCount,
      props.upstreamSourceLabel,
      props.workflowReference,
      props.workspaceIssue,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.actionCount,
      props.actionDraftLength,
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.activeMailbox,
      props.channelCount,
      props.contextCustomer,
      props.contextNote,
      props.deskLabel,
      props.hotJobCount,
      props.hotJobsIssue,
      props.hotJobsRefreshedAt,
      props.identityLabel,
      props.launcherSourceLabel,
      props.linkedRecordCount,
      props.primaryLinkedRecordLabel,
      props.primaryLinkedRecordStatus,
      props.selectedActionLabel,
      props.selectedEntryCount,
      props.selectedThreadId,
      props.selectedThreadOwner,
      props.selectedThreadParticipants,
      props.selectedThreadPriority,
      props.selectedThreadSource,
      props.selectedThreadSubject,
      props.selectedThreadUnreadCount,
      props.selectedThreadUpdatedLabel,
      props.threadCount,
      props.topHotJobCustomer,
      props.topHotJobId,
      props.topHotJobNote,
      props.totalUnreadCount,
      props.unreadThreadCount,
      props.upstreamSourceLabel,
      props.workflowReference,
      props.workspaceIssue,
      props.workspaceRefreshedAt,
      props.workspaceSummary,
    ],
  );

  return (
    <div data-testid="appw-messages-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwMessagesCopilot;
