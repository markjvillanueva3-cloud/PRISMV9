import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwPurchaseOrdersCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  orderCount?: number;
  filterLabel?: string | null;
  activePoId?: string | null;
  activeSupplier?: string | null;
  pendingApprovalCount?: number;
  readyToReceiveCount?: number;
  agingTotal?: number | null;
  agingCritical?: number | null;
  spendCategoryCount?: number;
  topSpendCategory?: string | null;
  topSpendAmount?: number | null;
  matchPoId?: string | null;
  matchStatus?: string | null;
  ordersRefreshedAt?: number | null;
  agingRefreshedAt?: number | null;
  matchRefreshedAt?: number | null;
  spendRefreshedAt?: number | null;
  ordersIssue?: string | null;
  agingIssue?: string | null;
  matchIssue?: string | null;
  spendIssue?: string | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  upstreamRecordLabel?: string | null;
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return `$${value.toFixed(2)}`;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function buildSummary(props: AppwPurchaseOrdersCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if ((props.orderCount ?? 0) > 0) posture.push(`${props.orderCount} orders staged`);
  if (props.filterLabel) posture.push(`filter ${props.filterLabel}`);
  if (props.activePoId) posture.push(`focus ${props.activePoId}`);
  if (props.activeSupplier) posture.push(`supplier ${props.activeSupplier}`);
  if ((props.pendingApprovalCount ?? 0) > 0) posture.push(`${props.pendingApprovalCount} pending approval`);
  if ((props.readyToReceiveCount ?? 0) > 0) posture.push(`${props.readyToReceiveCount} ready to receive`);
  const agingTotal = formatMoney(props.agingTotal);
  if (agingTotal) posture.push(`${agingTotal} total AP`);
  const agingCritical = formatMoney(props.agingCritical);
  if (agingCritical) posture.push(`${agingCritical} 90+ aging`);
  if ((props.spendCategoryCount ?? 0) > 0) posture.push(`${props.spendCategoryCount} spend categories staged`);
  if (props.topSpendCategory) posture.push(`top spend ${props.topSpendCategory}`);
  const topSpendAmount = formatMoney(props.topSpendAmount);
  if (topSpendAmount) posture.push(`${topSpendAmount} leading spend bucket`);
  if (props.matchPoId) posture.push(`3-way target ${props.matchPoId}`);
  if (props.matchStatus) posture.push(`match ${props.matchStatus}`);
  if (props.ordersIssue) posture.push('orders lane degraded');
  if (props.agingIssue) posture.push('aging lane degraded');
  if (props.matchIssue) posture.push('match lane degraded');
  if (props.spendIssue) posture.push('spend lane degraded');
  posture.push(`orders ${formatRefresh(props.ordersRefreshedAt)}`);
  posture.push(`aging ${formatRefresh(props.agingRefreshedAt)}`);
  posture.push(`match ${formatRefresh(props.matchRefreshedAt)}`);
  posture.push(`spend ${formatRefresh(props.spendRefreshedAt)}`);
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.upstreamRecordLabel) posture.push(`record ${props.upstreamRecordLabel}`);

  return `Kienzle AI is reasoning over live purchase-order flow, approval and receiving pressure, AP aging, three-way match posture, spend concentration, route freshness, degraded-lane signals, and workflow continuity for the Purchase Orders desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwPurchaseOrdersCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.pendingApprovalCount ?? 0) > 0 || (props.readyToReceiveCount ?? 0) > 0) {
    suggestions.push({
      id: 'triage-orders',
      label: 'Triage active orders',
      query: `Use the live purchase-order board to triage approval and receiving pressure. Explain which orders should be approved, received, or escalated first and why.`,
    });
  }

  if (props.agingTotal != null || props.agingCritical != null) {
    suggestions.push({
      id: 'reconcile-aging',
      label: 'Reconcile AP pressure',
      query: `Interpret the current AP aging posture and explain whether purchasing should hold new demand, accelerate receipt closure, or shift supplier sequencing before issuing more orders.`,
    });
  }

  if (props.matchPoId || props.matchStatus) {
    suggestions.push({
      id: 'interpret-match',
      label: 'Interpret 3-way match',
      query: `Interpret the current three-way match posture${props.matchPoId ? ` for ${props.matchPoId}` : ''}. Explain whether the buyer should trust the record, inspect receiving evidence, or open a supplier follow-up before Inventory proceeds.`,
    });
  }

  if (props.topSpendCategory || (props.spendCategoryCount ?? 0) > 0) {
    suggestions.push({
      id: 'review-spend',
      label: 'Review spend concentration',
      query: `Use the live spend analysis to explain where purchasing dollars are concentrated and whether that concentration creates supplier, cash, or schedule risk.`,
    });
  }

  if (props.ordersIssue || props.agingIssue || props.matchIssue || props.spendIssue) {
    suggestions.push({
      id: 'recover-po-lanes',
      label: 'Recover degraded lanes',
      query: `One or more purchase-order lanes are degraded. Explain the safest recovery sequence so procurement can restore order, aging, match, and spend confidence without losing operational continuity.`,
    });
  }

  if (props.launcherSourceLabel || props.upstreamSourceLabel || props.upstreamRecordLabel) {
    suggestions.push({
      id: 'preserve-procurement-continuity',
      label: 'Preserve procurement continuity',
      query: `Explain how Purchase Orders should preserve continuity with upstream workflow context${props.upstreamRecordLabel ? ` for ${props.upstreamRecordLabel}` : ''} when handing off into Inventory, Messages, Quote Builder, or Capture Ops.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-po-brief',
      label: 'Open PO brief',
      query: `Review the ${props.deskLabel} context and recommend the next purchasing, receiving, and supplier follow-up actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwPurchaseOrdersCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    order_count: props.orderCount ?? 0,
    filter_label: props.filterLabel,
    active_po_id: props.activePoId,
    active_supplier: props.activeSupplier,
    pending_approval_count: props.pendingApprovalCount ?? 0,
    ready_to_receive_count: props.readyToReceiveCount ?? 0,
    aging_total: props.agingTotal ?? null,
    aging_critical: props.agingCritical ?? null,
    spend_category_count: props.spendCategoryCount ?? 0,
    top_spend_category: props.topSpendCategory,
    top_spend_amount: props.topSpendAmount ?? null,
    match_po_id: props.matchPoId,
    match_status: props.matchStatus,
    orders_refreshed_at: props.ordersRefreshedAt ?? null,
    aging_refreshed_at: props.agingRefreshedAt ?? null,
    match_refreshed_at: props.matchRefreshedAt ?? null,
    spend_refreshed_at: props.spendRefreshedAt ?? null,
    orders_issue: props.ordersIssue,
    aging_issue: props.agingIssue,
    match_issue: props.matchIssue,
    spend_issue: props.spendIssue,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    upstream_record: props.upstreamRecordLabel,
    appw_stage: 'APPW-MS1 purchase orders intelligence hardening',
    desk_type: 'purchase_orders',
  };
}

export function AppwPurchaseOrdersCopilot(props: AppwPurchaseOrdersCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneLabel,
      props.activePoId,
      props.activeSupplier,
      props.agingCritical,
      props.agingIssue,
      props.agingRefreshedAt,
      props.agingTotal,
      props.filterLabel,
      props.launcherSourceLabel,
      props.matchIssue,
      props.matchPoId,
      props.matchRefreshedAt,
      props.matchStatus,
      props.orderCount,
      props.ordersIssue,
      props.ordersRefreshedAt,
      props.pendingApprovalCount,
      props.readyToReceiveCount,
      props.spendCategoryCount,
      props.spendIssue,
      props.spendRefreshedAt,
      props.topSpendAmount,
      props.topSpendCategory,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.agingCritical,
      props.agingTotal,
      props.deskLabel,
      props.launcherSourceLabel,
      props.matchIssue,
      props.matchPoId,
      props.matchStatus,
      props.ordersIssue,
      props.pendingApprovalCount,
      props.readyToReceiveCount,
      props.spendCategoryCount,
      props.spendIssue,
      props.topSpendCategory,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.activePoId,
      props.activeSupplier,
      props.agingCritical,
      props.agingIssue,
      props.agingRefreshedAt,
      props.agingTotal,
      props.deskLabel,
      props.filterLabel,
      props.launcherSourceLabel,
      props.matchIssue,
      props.matchPoId,
      props.matchRefreshedAt,
      props.matchStatus,
      props.orderCount,
      props.ordersIssue,
      props.ordersRefreshedAt,
      props.pendingApprovalCount,
      props.readyToReceiveCount,
      props.spendCategoryCount,
      props.spendIssue,
      props.spendRefreshedAt,
      props.topSpendAmount,
      props.topSpendCategory,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  return (
    <div data-testid="appw-purchase-orders-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwPurchaseOrdersCopilot;
