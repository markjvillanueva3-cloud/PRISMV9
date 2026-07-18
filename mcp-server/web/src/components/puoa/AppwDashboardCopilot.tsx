import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwDashboardCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  snapshotSource?: 'live' | 'mixed' | 'demo';
  snapshotNote?: string | null;
  machineCount?: number;
  runningCount?: number;
  alarmCount?: number;
  avgUptime?: number | null;
  activeJobCount?: number;
  nextDispatchJob?: string | null;
  nextDispatchEtaMinutes?: number | null;
  nextDispatchOperation?: string | null;
  nextToolRiskName?: string | null;
  nextToolRiskMachine?: string | null;
  nextToolRiskRemainingPct?: number | null;
  hotJobCount?: number;
  nextHotJobId?: string | null;
  nextHotJobCustomer?: string | null;
  nextHotJobNote?: string | null;
  safetyScorePct?: number | null;
  oeePct?: number | null;
  unreadAlertCount?: number;
  telemetryConnected?: boolean;
  learningShopLabel?: string | null;
  rolloutActionCount?: number;
  networkShopCountLabel?: string | null;
  releaseMachineCount?: number;
  releaseFixtureCount?: number;
  snapshotRefreshedAt?: number | null;
  learningRefreshedAt?: number | null;
  releaseRefreshedAt?: number | null;
  hotJobsRefreshedAt?: number | null;
  telemetryUpdatedAt?: number | null;
  snapshotIssue?: string | null;
  learningIssue?: string | null;
  releaseIssue?: string | null;
  hotJobsIssue?: string | null;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return `${Math.round(value)}%`;
}

function buildSummary(props: AppwDashboardCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} active`);
  if (props.snapshotSource) posture.push(`snapshot ${props.snapshotSource}`);
  if (props.snapshotNote) posture.push(props.snapshotNote);
  if ((props.machineCount ?? 0) > 0) posture.push(`${props.machineCount} machines staged`);
  if ((props.runningCount ?? 0) > 0) posture.push(`${props.runningCount} running`);
  if ((props.alarmCount ?? 0) > 0) posture.push(`${props.alarmCount} alarms`);
  const avgUptime = formatPercent(props.avgUptime);
  if (avgUptime) posture.push(`fleet uptime ${avgUptime}`);
  if ((props.activeJobCount ?? 0) > 0) posture.push(`${props.activeJobCount} active jobs`);
  if (props.nextDispatchJob) posture.push(`dispatch ${props.nextDispatchJob}`);
  if (props.nextDispatchEtaMinutes != null) posture.push(`dispatch ETA ${props.nextDispatchEtaMinutes} min`);
  if (props.nextDispatchOperation) posture.push(props.nextDispatchOperation);
  if (props.nextToolRiskName) posture.push(`tool risk ${props.nextToolRiskName}`);
  if (props.nextToolRiskMachine) posture.push(`risk machine ${props.nextToolRiskMachine}`);
  const nextToolRiskRemaining = formatPercent(props.nextToolRiskRemainingPct);
  if (nextToolRiskRemaining) posture.push(`tool remaining ${nextToolRiskRemaining}`);
  if ((props.hotJobCount ?? 0) > 0) posture.push(`${props.hotJobCount} hot priorities`);
  if (props.nextHotJobId) posture.push(`hot ${props.nextHotJobId}`);
  if (props.nextHotJobCustomer) posture.push(`hot customer ${props.nextHotJobCustomer}`);
  if (props.nextHotJobNote) posture.push(props.nextHotJobNote);
  const safety = formatPercent(props.safetyScorePct);
  if (safety) posture.push(`safety ${safety}`);
  const oee = formatPercent(props.oeePct);
  if (oee) posture.push(`OEE ${oee}`);
  if ((props.unreadAlertCount ?? 0) > 0) posture.push(`${props.unreadAlertCount} unread alerts`);
  posture.push(props.telemetryConnected ? 'telemetry connected' : 'telemetry reconnecting');
  if (props.learningShopLabel) posture.push(`learning ${props.learningShopLabel}`);
  if ((props.rolloutActionCount ?? 0) > 0) posture.push(`${props.rolloutActionCount} rollout actions`);
  if (props.networkShopCountLabel) posture.push(props.networkShopCountLabel);
  if ((props.releaseMachineCount ?? 0) > 0) posture.push(`${props.releaseMachineCount} release machines`);
  if ((props.releaseFixtureCount ?? 0) > 0) posture.push(`${props.releaseFixtureCount} fixture profiles`);
  if (props.snapshotIssue) posture.push('dashboard snapshot degraded');
  if (props.learningIssue) posture.push('learning fabric degraded');
  if (props.releaseIssue) posture.push('release readiness degraded');
  if (props.hotJobsIssue) posture.push('hot priority feed degraded');
  posture.push(`snapshot ${formatRefresh(props.snapshotRefreshedAt)}`);
  posture.push(`learning ${formatRefresh(props.learningRefreshedAt)}`);
  posture.push(`release ${formatRefresh(props.releaseRefreshedAt)}`);
  posture.push(`hot jobs ${formatRefresh(props.hotJobsRefreshedAt)}`);
  posture.push(`telemetry ${formatRefresh(props.telemetryUpdatedAt)}`);

  return `Kienzle AI is reasoning over live fleet telemetry, dispatch pressure, tool risk, safety and OEE posture, shop-hot escalation, learning fabric, release readiness, route freshness, and degraded-lane signals for the Manufacturing Dashboard. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwDashboardCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.hotJobCount ?? 0) > 0 || (props.alarmCount ?? 0) > 0) {
    suggestions.push({
      id: 'triage-command-surface',
      label: 'Triage command surface',
      query: 'Use the live dashboard posture to explain what the control room should act on first across hot priorities, alarms, dispatch, and safety, and which desk should receive the next handoff after the first intervention.',
    });
  }

  if (props.nextDispatchJob || props.activeJobCount || props.nextToolRiskName) {
    suggestions.push({
      id: 'stabilize-shift-flow',
      label: 'Stabilize shift flow',
      query: `Review the current dashboard flow${props.nextDispatchJob ? ` around ${props.nextDispatchJob}` : ''}${props.nextToolRiskName ? ` and ${props.nextToolRiskName}` : ''}. Explain the best next dispatch sequence, tooling coverage move, and whether operations should pause for risk recovery before pushing more work into the cell.`,
    });
  }

  if (props.learningShopLabel || props.networkShopCountLabel || props.rolloutActionCount) {
    suggestions.push({
      id: 'translate-learning-fabric',
      label: 'Translate learning fabric',
      query: 'Interpret the live learning fabric and explain which rollout or policy action should happen next on the floor, what it improves, and what should remain local versus network-promoted.',
    });
  }

  if ((props.releaseMachineCount ?? 0) > 0 || (props.releaseFixtureCount ?? 0) > 0) {
    suggestions.push({
      id: 'assess-release-readiness',
      label: 'Assess release readiness',
      query: 'Use the release-readiness context on the dashboard to explain whether the current hot or next-dispatch job can move straight into Print to CNC or still needs machine, fixture, or tooling alignment first.',
    });
  }

  if (props.snapshotIssue || props.learningIssue || props.releaseIssue || props.hotJobsIssue || !props.telemetryConnected) {
    suggestions.push({
      id: 'recover-dashboard-lanes',
      label: 'Recover degraded lanes',
      query: 'One or more dashboard intelligence lanes are degraded or reconnecting. Explain the safest recovery order so the command surface regains trust without hiding fleet, dispatch, or escalation risk.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-dashboard-brief',
      label: 'Open dashboard brief',
      query: `Review the ${props.deskLabel} context and recommend the next control-room, dispatch, and escalation actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwDashboardCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    snapshot_source: props.snapshotSource ?? null,
    snapshot_note: props.snapshotNote,
    machine_count: props.machineCount ?? 0,
    running_count: props.runningCount ?? 0,
    alarm_count: props.alarmCount ?? 0,
    avg_uptime_pct: props.avgUptime ?? null,
    active_job_count: props.activeJobCount ?? 0,
    next_dispatch_job: props.nextDispatchJob,
    next_dispatch_eta_minutes: props.nextDispatchEtaMinutes ?? null,
    next_dispatch_operation: props.nextDispatchOperation,
    next_tool_risk_name: props.nextToolRiskName,
    next_tool_risk_machine: props.nextToolRiskMachine,
    next_tool_risk_remaining_pct: props.nextToolRiskRemainingPct ?? null,
    hot_job_count: props.hotJobCount ?? 0,
    next_hot_job_id: props.nextHotJobId,
    next_hot_job_customer: props.nextHotJobCustomer,
    next_hot_job_note: props.nextHotJobNote,
    safety_score_pct: props.safetyScorePct ?? null,
    oee_pct: props.oeePct ?? null,
    unread_alert_count: props.unreadAlertCount ?? 0,
    telemetry_connected: props.telemetryConnected ?? false,
    learning_shop_label: props.learningShopLabel,
    rollout_action_count: props.rolloutActionCount ?? 0,
    network_shop_count_label: props.networkShopCountLabel,
    release_machine_count: props.releaseMachineCount ?? 0,
    release_fixture_count: props.releaseFixtureCount ?? 0,
    snapshot_refreshed_at: props.snapshotRefreshedAt ?? null,
    learning_refreshed_at: props.learningRefreshedAt ?? null,
    release_refreshed_at: props.releaseRefreshedAt ?? null,
    hot_jobs_refreshed_at: props.hotJobsRefreshedAt ?? null,
    telemetry_updated_at: props.telemetryUpdatedAt ?? null,
    snapshot_issue: props.snapshotIssue,
    learning_issue: props.learningIssue,
    release_issue: props.releaseIssue,
    hot_jobs_issue: props.hotJobsIssue,
    appw_stage: 'APPW-MS1 dashboard intelligence hardening',
    desk_type: 'dashboard_command',
  };
}

export function AppwDashboardCopilot(props: AppwDashboardCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeJobCount,
      props.activeLaneLabel,
      props.alarmCount,
      props.avgUptime,
      props.hotJobCount,
      props.hotJobsIssue,
      props.hotJobsRefreshedAt,
      props.learningIssue,
      props.learningRefreshedAt,
      props.learningShopLabel,
      props.machineCount,
      props.networkShopCountLabel,
      props.nextDispatchEtaMinutes,
      props.nextDispatchJob,
      props.nextDispatchOperation,
      props.nextHotJobCustomer,
      props.nextHotJobId,
      props.nextHotJobNote,
      props.nextToolRiskMachine,
      props.nextToolRiskName,
      props.nextToolRiskRemainingPct,
      props.oeePct,
      props.releaseFixtureCount,
      props.releaseIssue,
      props.releaseMachineCount,
      props.releaseRefreshedAt,
      props.rolloutActionCount,
      props.runningCount,
      props.safetyScorePct,
      props.snapshotIssue,
      props.snapshotNote,
      props.snapshotRefreshedAt,
      props.snapshotSource,
      props.telemetryConnected,
      props.telemetryUpdatedAt,
      props.unreadAlertCount,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.activeJobCount,
      props.alarmCount,
      props.deskLabel,
      props.hotJobCount,
      props.hotJobsIssue,
      props.learningIssue,
      props.learningShopLabel,
      props.networkShopCountLabel,
      props.nextDispatchJob,
      props.nextToolRiskName,
      props.releaseFixtureCount,
      props.releaseIssue,
      props.releaseMachineCount,
      props.rolloutActionCount,
      props.snapshotIssue,
      props.telemetryConnected,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeJobCount,
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.alarmCount,
      props.avgUptime,
      props.deskLabel,
      props.hotJobCount,
      props.hotJobsIssue,
      props.hotJobsRefreshedAt,
      props.learningIssue,
      props.learningRefreshedAt,
      props.learningShopLabel,
      props.machineCount,
      props.networkShopCountLabel,
      props.nextDispatchEtaMinutes,
      props.nextDispatchJob,
      props.nextDispatchOperation,
      props.nextHotJobCustomer,
      props.nextHotJobId,
      props.nextHotJobNote,
      props.nextToolRiskMachine,
      props.nextToolRiskName,
      props.nextToolRiskRemainingPct,
      props.oeePct,
      props.releaseFixtureCount,
      props.releaseIssue,
      props.releaseMachineCount,
      props.releaseRefreshedAt,
      props.rolloutActionCount,
      props.runningCount,
      props.safetyScorePct,
      props.snapshotIssue,
      props.snapshotNote,
      props.snapshotRefreshedAt,
      props.snapshotSource,
      props.telemetryConnected,
      props.telemetryUpdatedAt,
      props.unreadAlertCount,
    ],
  );

  return (
    <div data-testid="appw-dashboard-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwDashboardCopilot;
