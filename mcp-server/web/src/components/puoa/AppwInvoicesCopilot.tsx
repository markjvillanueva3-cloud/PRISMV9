import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwInvoicesCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  filterLabel?: string | null;
  invoiceCount?: number;
  totalOutstanding?: number | null;
  totalPaid?: number | null;
  overdueCount?: number;
  sentCount?: number;
  draftCount?: number;
  activeInvoiceId?: string | null;
  activeJobId?: string | null;
  activeCustomer?: string | null;
  activeStatus?: string | null;
  invoicesRefreshedAt?: number | null;
  createCompletedAt?: number | null;
  listIssue?: string | null;
  createIssue?: string | null;
  lastCreatedJobId?: string | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  workflowReference?: string | null;
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

function buildSummary(props: AppwInvoicesCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} active`);
  if (props.filterLabel) posture.push(`filter ${props.filterLabel}`);
  if ((props.invoiceCount ?? 0) > 0) posture.push(`${props.invoiceCount} invoices staged`);
  const totalOutstanding = formatMoney(props.totalOutstanding);
  if (totalOutstanding) posture.push(`${totalOutstanding} outstanding`);
  const totalPaid = formatMoney(props.totalPaid);
  if (totalPaid) posture.push(`${totalPaid} paid`);
  if ((props.overdueCount ?? 0) > 0) posture.push(`${props.overdueCount} overdue`);
  if ((props.sentCount ?? 0) > 0) posture.push(`${props.sentCount} sent awaiting payment`);
  if ((props.draftCount ?? 0) > 0) posture.push(`${props.draftCount} draft invoices`);
  if (props.activeInvoiceId) posture.push(`focus ${props.activeInvoiceId}`);
  if (props.activeJobId) posture.push(`job ${props.activeJobId}`);
  if (props.activeCustomer) posture.push(`customer ${props.activeCustomer}`);
  if (props.activeStatus) posture.push(`status ${props.activeStatus}`);
  if (props.lastCreatedJobId) posture.push(`last create ${props.lastCreatedJobId}`);
  if (props.listIssue) posture.push('list lane degraded');
  if (props.createIssue) posture.push('create lane degraded');
  posture.push(`list ${formatRefresh(props.invoicesRefreshedAt)}`);
  posture.push(`create ${formatRefresh(props.createCompletedAt)}`);
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.workflowReference) posture.push(`record ${props.workflowReference}`);

  return `Kienzle AI is reasoning over live invoice exposure, collection pressure, billing readiness, route freshness, degraded-lane signals, and finance continuity for the Invoices desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwInvoicesCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.overdueCount ?? 0) > 0 || (props.totalOutstanding ?? 0) > 0) {
    suggestions.push({
      id: 'triage-receivables',
      label: 'Triage receivables pressure',
      query: 'Use the live invoice desk to explain which receivables should be escalated first, which customers need follow-up, and whether finance should change collection posture before new billing work opens.',
    });
  }

  if ((props.draftCount ?? 0) > 0 || props.lastCreatedJobId) {
    suggestions.push({
      id: 'review-billing-readiness',
      label: 'Review billing readiness',
      query: 'Review the current invoice desk and explain whether billing should create, send, or hold invoices based on the active exposure, customer posture, and collection pressure.',
    });
  }

  if (props.activeInvoiceId || props.activeJobId || props.activeCustomer) {
    suggestions.push({
      id: 'focus-active-invoice',
      label: 'Assess active invoice',
      query: `Assess the active billing context${props.activeInvoiceId ? ` for ${props.activeInvoiceId}` : ''}${props.activeJobId ? ` on job ${props.activeJobId}` : ''}. Explain the next best finance action and what risk is most likely to slow collection or margin confidence.`,
    });
  }

  if (props.listIssue || props.createIssue) {
    suggestions.push({
      id: 'recover-billing-lanes',
      label: 'Recover degraded billing lanes',
      query: 'One or more invoice desk lanes are degraded. Explain the safest recovery sequence so billing can restore invoice visibility, create readiness, and finance continuity without losing commercial context.',
    });
  }

  if (props.launcherSourceLabel || props.upstreamSourceLabel || props.workflowReference) {
    suggestions.push({
      id: 'preserve-finance-continuity',
      label: 'Preserve finance continuity',
      query: `Explain how Invoices should preserve continuity with upstream workflow context${props.workflowReference ? ` for ${props.workflowReference}` : ''} when handing work into ledger review or financial analysis.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-invoice-brief',
      label: 'Open invoice brief',
      query: `Review the ${props.deskLabel} context and recommend the next billing, collections, and finance follow-up actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwInvoicesCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    filter_label: props.filterLabel,
    invoice_count: props.invoiceCount ?? 0,
    total_outstanding: props.totalOutstanding ?? null,
    total_paid: props.totalPaid ?? null,
    overdue_count: props.overdueCount ?? 0,
    sent_count: props.sentCount ?? 0,
    draft_count: props.draftCount ?? 0,
    active_invoice_id: props.activeInvoiceId,
    active_job_id: props.activeJobId,
    active_customer: props.activeCustomer,
    active_status: props.activeStatus,
    invoices_refreshed_at: props.invoicesRefreshedAt ?? null,
    create_completed_at: props.createCompletedAt ?? null,
    list_issue: props.listIssue,
    create_issue: props.createIssue,
    last_created_job_id: props.lastCreatedJobId,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    workflow_reference: props.workflowReference,
    appw_stage: 'APPW-MS1 invoices intelligence hardening',
    desk_type: 'invoices',
  };
}

export function AppwInvoicesCopilot(props: AppwInvoicesCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeCustomer,
      props.activeInvoiceId,
      props.activeJobId,
      props.activeLaneLabel,
      props.activeStatus,
      props.createCompletedAt,
      props.createIssue,
      props.draftCount,
      props.filterLabel,
      props.invoiceCount,
      props.invoicesRefreshedAt,
      props.lastCreatedJobId,
      props.launcherSourceLabel,
      props.listIssue,
      props.overdueCount,
      props.sentCount,
      props.totalOutstanding,
      props.totalPaid,
      props.upstreamSourceLabel,
      props.workflowReference,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.activeCustomer,
      props.activeInvoiceId,
      props.activeJobId,
      props.createIssue,
      props.deskLabel,
      props.draftCount,
      props.lastCreatedJobId,
      props.launcherSourceLabel,
      props.listIssue,
      props.overdueCount,
      props.totalOutstanding,
      props.upstreamSourceLabel,
      props.workflowReference,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeCustomer,
      props.activeInvoiceId,
      props.activeJobId,
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.activeStatus,
      props.createCompletedAt,
      props.createIssue,
      props.draftCount,
      props.filterLabel,
      props.invoiceCount,
      props.invoicesRefreshedAt,
      props.lastCreatedJobId,
      props.launcherSourceLabel,
      props.listIssue,
      props.overdueCount,
      props.sentCount,
      props.totalOutstanding,
      props.totalPaid,
      props.upstreamSourceLabel,
      props.workflowReference,
    ],
  );

  return (
    <div data-testid="appw-invoices-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwInvoicesCopilot;
