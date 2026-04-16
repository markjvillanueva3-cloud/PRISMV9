import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwInventoryCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  workflowReference?: string | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  workspaceSummary?: string | null;
  documentTemplateCount?: number;
  receivingCount?: number;
  checkoutCount?: number;
  usagePulseCount?: number;
  departmentRouteCount?: number;
  formulaNoteCount?: number;
  activeReceivingReference?: string | null;
  activeReceivingSupplier?: string | null;
  activeReceivingDepartment?: string | null;
  activeReceivingStatus?: string | null;
  activeCheckoutToolId?: string | null;
  activeCheckoutLabel?: string | null;
  activeCheckoutLocation?: string | null;
  activeCheckoutStatus?: string | null;
  activeUsageMachine?: string | null;
  activeUsageOperator?: string | null;
  activeUsageState?: string | null;
  activeUsageEdgesLabel?: string | null;
  activeUsageCostPerPart?: string | null;
  eoqValue?: number | null;
  abcClassCount?: number;
  topAbcClass?: string | null;
  safetyStockValue?: number | null;
  reorderPointValue?: number | null;
  toolOptimizationReady?: boolean;
  toolOptimizationFocus?: string | null;
  workspaceRefreshedAt?: number | null;
  eoqRefreshedAt?: number | null;
  abcRefreshedAt?: number | null;
  safetyRefreshedAt?: number | null;
  toolOptRefreshedAt?: number | null;
  workspaceIssue?: string | null;
  eoqIssue?: string | null;
  abcIssue?: string | null;
  safetyIssue?: string | null;
  toolOptIssue?: string | null;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function buildSummary(props: AppwInventoryCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.workspaceSummary) posture.push(props.workspaceSummary);
  if ((props.documentTemplateCount ?? 0) > 0) posture.push(`${props.documentTemplateCount} document templates`);
  if ((props.receivingCount ?? 0) > 0) posture.push(`${props.receivingCount} receiving records staged`);
  if ((props.checkoutCount ?? 0) > 0) posture.push(`${props.checkoutCount} checkout records staged`);
  if ((props.usagePulseCount ?? 0) > 0) posture.push(`${props.usagePulseCount} live tooling pulses`);
  if ((props.departmentRouteCount ?? 0) > 0) posture.push(`${props.departmentRouteCount} department routes`);
  if ((props.formulaNoteCount ?? 0) > 0) posture.push(`${props.formulaNoteCount} shared formulas`);
  if (props.activeReceivingReference) posture.push(`receiving focus ${props.activeReceivingReference}`);
  if (props.activeReceivingSupplier) posture.push(`supplier ${props.activeReceivingSupplier}`);
  if (props.activeReceivingDepartment) posture.push(`department ${props.activeReceivingDepartment}`);
  if (props.activeReceivingStatus) posture.push(`receiving ${props.activeReceivingStatus}`);
  if (props.activeCheckoutToolId) posture.push(`tool ${props.activeCheckoutToolId}`);
  if (props.activeCheckoutLabel) posture.push(props.activeCheckoutLabel);
  if (props.activeCheckoutLocation) posture.push(`location ${props.activeCheckoutLocation}`);
  if (props.activeCheckoutStatus) posture.push(`checkout ${props.activeCheckoutStatus}`);
  if (props.activeUsageMachine) posture.push(`machine ${props.activeUsageMachine}`);
  if (props.activeUsageOperator) posture.push(`operator ${props.activeUsageOperator}`);
  if (props.activeUsageState) posture.push(`usage ${props.activeUsageState}`);
  if (props.activeUsageEdgesLabel) posture.push(props.activeUsageEdgesLabel);
  if (props.activeUsageCostPerPart) posture.push(`cost ${props.activeUsageCostPerPart}`);
  if (props.eoqValue != null) posture.push(`EOQ ${props.eoqValue.toFixed(0)}`);
  if ((props.abcClassCount ?? 0) > 0) posture.push(`${props.abcClassCount} ABC classes`);
  if (props.topAbcClass) posture.push(`top class ${props.topAbcClass}`);
  if (props.safetyStockValue != null) posture.push(`safety stock ${props.safetyStockValue.toFixed(0)}`);
  if (props.reorderPointValue != null) posture.push(`reorder point ${props.reorderPointValue.toFixed(0)}`);
  if (props.toolOptimizationReady) posture.push(`tool optimization ready${props.toolOptimizationFocus ? ` for ${props.toolOptimizationFocus}` : ''}`);
  if (props.workspaceIssue) posture.push('workspace lane degraded');
  if (props.eoqIssue) posture.push('EOQ lane degraded');
  if (props.abcIssue) posture.push('ABC lane degraded');
  if (props.safetyIssue) posture.push('safety-stock lane degraded');
  if (props.toolOptIssue) posture.push('tool-optimization lane degraded');
  posture.push(`workspace ${formatRefresh(props.workspaceRefreshedAt)}`);
  posture.push(`EOQ ${formatRefresh(props.eoqRefreshedAt)}`);
  posture.push(`ABC ${formatRefresh(props.abcRefreshedAt)}`);
  posture.push(`safety ${formatRefresh(props.safetyRefreshedAt)}`);
  posture.push(`tooling ${formatRefresh(props.toolOptRefreshedAt)}`);
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.workflowReference) posture.push(`record ${props.workflowReference}`);

  return `PRISM AI is reasoning over live inventory custody, receiving and tooling flow, department routing, usage pulses, replenishment policy, tool economics, route freshness, degraded-lane signals, and workflow continuity for the Inventory desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwInventoryCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.receivingCount ?? 0) > 0 || (props.departmentRouteCount ?? 0) > 0) {
    suggestions.push({
      id: 'triage-receiving',
      label: 'Triage receiving and routing',
      query: 'Use the live inventory desk to explain which receiving records should be checked in first, which department route is most important, and what evidence should be captured before ownership moves downstream.',
    });
  }

  if ((props.checkoutCount ?? 0) > 0 || (props.usagePulseCount ?? 0) > 0) {
    suggestions.push({
      id: 'stabilize-tooling-custody',
      label: 'Stabilize tooling custody',
      query: 'Interpret the current checkout and usage posture. Explain which tooling record or live pulse needs action first, whether insert indexing is enough, and when the team should replace, regrind, or escalate tooling risk.',
    });
  }

  if (
    props.eoqValue != null
    || (props.abcClassCount ?? 0) > 0
    || props.safetyStockValue != null
    || props.toolOptimizationReady
  ) {
    suggestions.push({
      id: 'interpret-inventory-policy',
      label: 'Interpret inventory policy',
      query: 'Combine the live EOQ, ABC, safety-stock, and tool-economics signals to explain what inventory policy should change next and which replenishment or tooling decision is most likely to improve schedule confidence.',
    });
  }

  if (props.activeReceivingReference || props.activeCheckoutToolId || props.activeUsageMachine) {
    suggestions.push({
      id: 'assess-active-inventory-focus',
      label: 'Assess active inventory focus',
      query: `Assess the active inventory context${props.activeReceivingReference ? ` for ${props.activeReceivingReference}` : ''}${props.activeCheckoutToolId ? ` and tool ${props.activeCheckoutToolId}` : ''}. Explain the next best action, the main operational risk, and which downstream desk should receive continuity next.`,
    });
  }

  if (props.workspaceIssue || props.eoqIssue || props.abcIssue || props.safetyIssue || props.toolOptIssue) {
    suggestions.push({
      id: 'recover-inventory-lanes',
      label: 'Recover degraded inventory lanes',
      query: 'One or more inventory lanes are degraded. Explain the safest recovery sequence so receiving, tooling custody, and replenishment policy can recover without losing workflow continuity or operator trust.',
    });
  }

  if (props.launcherSourceLabel || props.upstreamSourceLabel || props.workflowReference) {
    suggestions.push({
      id: 'preserve-inventory-continuity',
      label: 'Preserve inventory continuity',
      query: `Explain how Inventory should preserve continuity with upstream workflow context${props.workflowReference ? ` for ${props.workflowReference}` : ''} when handing work into Capture Ops, Shop Floor, Messages, or purchasing follow-up.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-inventory-brief',
      label: 'Open inventory brief',
      query: `Review the ${props.deskLabel} context and recommend the next receiving, tooling, and inventory-policy actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwInventoryCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    workflow_reference: props.workflowReference,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    workspace_summary: props.workspaceSummary,
    document_template_count: props.documentTemplateCount ?? 0,
    receiving_count: props.receivingCount ?? 0,
    checkout_count: props.checkoutCount ?? 0,
    usage_pulse_count: props.usagePulseCount ?? 0,
    department_route_count: props.departmentRouteCount ?? 0,
    formula_note_count: props.formulaNoteCount ?? 0,
    active_receiving_reference: props.activeReceivingReference,
    active_receiving_supplier: props.activeReceivingSupplier,
    active_receiving_department: props.activeReceivingDepartment,
    active_receiving_status: props.activeReceivingStatus,
    active_checkout_tool_id: props.activeCheckoutToolId,
    active_checkout_label: props.activeCheckoutLabel,
    active_checkout_location: props.activeCheckoutLocation,
    active_checkout_status: props.activeCheckoutStatus,
    active_usage_machine: props.activeUsageMachine,
    active_usage_operator: props.activeUsageOperator,
    active_usage_state: props.activeUsageState,
    active_usage_edges_label: props.activeUsageEdgesLabel,
    active_usage_cost_per_part: props.activeUsageCostPerPart,
    eoq_value: props.eoqValue ?? null,
    abc_class_count: props.abcClassCount ?? 0,
    top_abc_class: props.topAbcClass,
    safety_stock_value: props.safetyStockValue ?? null,
    reorder_point_value: props.reorderPointValue ?? null,
    tool_optimization_ready: props.toolOptimizationReady ?? false,
    tool_optimization_focus: props.toolOptimizationFocus,
    workspace_refreshed_at: props.workspaceRefreshedAt ?? null,
    eoq_refreshed_at: props.eoqRefreshedAt ?? null,
    abc_refreshed_at: props.abcRefreshedAt ?? null,
    safety_refreshed_at: props.safetyRefreshedAt ?? null,
    tool_opt_refreshed_at: props.toolOptRefreshedAt ?? null,
    workspace_issue: props.workspaceIssue,
    eoq_issue: props.eoqIssue,
    abc_issue: props.abcIssue,
    safety_issue: props.safetyIssue,
    tool_opt_issue: props.toolOptIssue,
    appw_stage: 'APPW-MS1 inventory intelligence hardening',
    desk_type: 'inventory',
  };
}

export function AppwInventoryCopilot(props: AppwInventoryCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.abcClassCount,
      props.abcIssue,
      props.abcRefreshedAt,
      props.activeCheckoutLabel,
      props.activeCheckoutLocation,
      props.activeCheckoutStatus,
      props.activeCheckoutToolId,
      props.activeLaneLabel,
      props.activeReceivingDepartment,
      props.activeReceivingReference,
      props.activeReceivingStatus,
      props.activeReceivingSupplier,
      props.activeUsageCostPerPart,
      props.activeUsageEdgesLabel,
      props.activeUsageMachine,
      props.activeUsageOperator,
      props.activeUsageState,
      props.checkoutCount,
      props.departmentRouteCount,
      props.documentTemplateCount,
      props.eoqIssue,
      props.eoqRefreshedAt,
      props.eoqValue,
      props.formulaNoteCount,
      props.launcherSourceLabel,
      props.receivingCount,
      props.reorderPointValue,
      props.safetyIssue,
      props.safetyRefreshedAt,
      props.safetyStockValue,
      props.toolOptIssue,
      props.toolOptRefreshedAt,
      props.toolOptimizationFocus,
      props.toolOptimizationReady,
      props.topAbcClass,
      props.upstreamSourceLabel,
      props.usagePulseCount,
      props.workflowReference,
      props.workspaceIssue,
      props.workspaceRefreshedAt,
      props.workspaceSummary,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.abcClassCount,
      props.activeCheckoutToolId,
      props.activeReceivingReference,
      props.activeUsageMachine,
      props.checkoutCount,
      props.deskLabel,
      props.departmentRouteCount,
      props.eoqValue,
      props.launcherSourceLabel,
      props.receivingCount,
      props.reorderPointValue,
      props.safetyIssue,
      props.safetyStockValue,
      props.toolOptIssue,
      props.toolOptimizationReady,
      props.upstreamSourceLabel,
      props.usagePulseCount,
      props.workflowReference,
      props.workspaceIssue,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.abcClassCount,
      props.abcIssue,
      props.abcRefreshedAt,
      props.activeCheckoutLabel,
      props.activeCheckoutLocation,
      props.activeCheckoutStatus,
      props.activeCheckoutToolId,
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.activeReceivingDepartment,
      props.activeReceivingReference,
      props.activeReceivingStatus,
      props.activeReceivingSupplier,
      props.activeUsageCostPerPart,
      props.activeUsageEdgesLabel,
      props.activeUsageMachine,
      props.activeUsageOperator,
      props.activeUsageState,
      props.checkoutCount,
      props.departmentRouteCount,
      props.deskLabel,
      props.documentTemplateCount,
      props.eoqIssue,
      props.eoqRefreshedAt,
      props.eoqValue,
      props.formulaNoteCount,
      props.launcherSourceLabel,
      props.receivingCount,
      props.reorderPointValue,
      props.safetyIssue,
      props.safetyRefreshedAt,
      props.safetyStockValue,
      props.toolOptIssue,
      props.toolOptRefreshedAt,
      props.toolOptimizationFocus,
      props.toolOptimizationReady,
      props.topAbcClass,
      props.upstreamSourceLabel,
      props.usagePulseCount,
      props.workflowReference,
      props.workspaceIssue,
      props.workspaceRefreshedAt,
      props.workspaceSummary,
    ],
  );

  return (
    <div data-testid="appw-inventory-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwInventoryCopilot;
