import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwPurchasingCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  material?: string | null;
  query?: string | null;
  supplierCount?: number;
  averageLeadDays?: number | null;
  bestSupplier?: string | null;
  bestScore?: number | null;
  bestUnitPrice?: number | null;
  bestLeadDays?: number | null;
  marketPosture?: string | null;
  marketLeadDays?: number | null;
  marketSupplierCount?: number | null;
  marketSpend?: number | null;
  manufacturerCount?: number;
  searchRefreshedAt?: number | null;
  recommendRefreshedAt?: number | null;
  summaryRefreshedAt?: number | null;
  searchIssue?: string | null;
  recommendIssue?: string | null;
  summaryIssue?: string | null;
  launcherSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  upstreamRecordLabel?: string | null;
  sourcingReference?: string | null;
  continuityNote?: string | null;
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

function buildSummary(props: AppwPurchasingCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.material) posture.push(`material ${props.material}`);
  if (props.query?.trim()) posture.push(`query ${props.query.trim()}`);
  if ((props.supplierCount ?? 0) > 0) posture.push(`${props.supplierCount} suppliers staged`);
  if (typeof props.averageLeadDays === 'number' && props.supplierCount) {
    posture.push(`${props.averageLeadDays.toFixed(1)} day supplier average lead`);
  }
  if (props.bestSupplier) posture.push(`best supplier ${props.bestSupplier}`);
  if (typeof props.bestScore === 'number') posture.push(`score ${props.bestScore}/100`);
  if (typeof props.bestLeadDays === 'number') posture.push(`${props.bestLeadDays} day best lead`);
  const bestPrice = formatMoney(props.bestUnitPrice);
  if (bestPrice) posture.push(`${bestPrice}/kg best price`);
  if (props.marketPosture) posture.push(`market ${props.marketPosture}`);
  if (typeof props.marketLeadDays === 'number') posture.push(`${props.marketLeadDays} day market lead`);
  if (typeof props.marketSupplierCount === 'number') posture.push(`${props.marketSupplierCount} market suppliers`);
  const marketSpend = formatMoney(props.marketSpend);
  if (marketSpend) posture.push(`${marketSpend} tracked spend`);
  if ((props.manufacturerCount ?? 0) > 0) posture.push(`${props.manufacturerCount} manufacturers surfaced`);
  if (props.searchIssue) posture.push('search lane degraded');
  if (props.recommendIssue) posture.push('recommendation lane degraded');
  if (props.summaryIssue) posture.push('summary lane degraded');
  posture.push(`search ${formatRefresh(props.searchRefreshedAt)}`);
  posture.push(`recommendations ${formatRefresh(props.recommendRefreshedAt)}`);
  posture.push(`summary ${formatRefresh(props.summaryRefreshedAt)}`);
  if (props.launcherSourceLabel) posture.push(`launched from ${props.launcherSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.upstreamRecordLabel) posture.push(`record ${props.upstreamRecordLabel}`);
  if (props.sourcingReference) posture.push(`reference ${props.sourcingReference}`);

  return `Kienzle AI is reasoning over live supplier breadth, best-fit recommendation quality, market summary posture, route freshness, degraded-lane signals, and sourcing continuity for the Purchasing desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwPurchasingCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.supplierCount ?? 0) > 0) {
    suggestions.push({
      id: 'compare-suppliers',
      label: 'Compare supplier field',
      query: `Compare the live supplier field for ${props.material ?? 'the active material'} and explain which supplier posture looks safest by lead time, rating, and readiness to buy now.`,
    });
  }

  if (props.bestSupplier) {
    suggestions.push({
      id: 'challenge-best-fit',
      label: 'Challenge best-fit vendor',
      query: `Stress-test the current best recommendation for ${props.material ?? 'the active material'}: ${props.bestSupplier}${typeof props.bestScore === 'number' ? ` scored ${props.bestScore}/100` : ''}${typeof props.bestLeadDays === 'number' ? ` with a ${props.bestLeadDays}-day lead` : ''}${formatMoney(props.bestUnitPrice) ? ` at ${formatMoney(props.bestUnitPrice)}/kg` : ''}. Explain whether the buyer should accept, negotiate, or hold.`,
    });
  }

  if (props.marketPosture || (props.manufacturerCount ?? 0) > 0) {
    suggestions.push({
      id: 'market-reconciliation',
      label: 'Reconcile market posture',
      query: `Reconcile the live recommendation lane with the current market summary for ${props.material ?? 'the active material'}. Explain whether sourcing should optimize for price, lead time, alternate manufacturers, or risk reduction.`,
    });
  }

  if (props.searchIssue || props.recommendIssue || props.summaryIssue) {
    suggestions.push({
      id: 'recover-degraded-lane',
      label: 'Recover degraded lane',
      query: `One or more purchasing lanes are degraded. Explain the safest recovery sequence for supplier search, recommendation scoring, and market summary refresh without losing the current sourcing decision context.`,
    });
  }

  if (props.launcherSourceLabel || props.upstreamSourceLabel || props.upstreamRecordLabel || props.continuityNote) {
    suggestions.push({
      id: 'preserve-continuity',
      label: 'Preserve sourcing continuity',
      query: `Explain how Purchasing should preserve continuity with the upstream workflow context${props.upstreamRecordLabel ? ` for ${props.upstreamRecordLabel}` : ''}. Include what must survive if the user pivots into Inventory, Messages, or Capture Ops.${props.continuityNote ? ` Context note: ${props.continuityNote}` : ''}`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      label: 'Open purchasing brief',
      query: `Review the ${props.deskLabel} context and recommend the next sourcing, supplier, and follow-up actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwPurchasingCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    material: props.material,
    query: props.query,
    supplier_count: props.supplierCount ?? 0,
    average_lead_days: props.averageLeadDays ?? null,
    best_supplier: props.bestSupplier,
    best_score: props.bestScore ?? null,
    best_unit_price: props.bestUnitPrice ?? null,
    best_lead_days: props.bestLeadDays ?? null,
    market_posture: props.marketPosture,
    market_lead_days: props.marketLeadDays ?? null,
    market_supplier_count: props.marketSupplierCount ?? null,
    market_spend: props.marketSpend ?? null,
    manufacturer_count: props.manufacturerCount ?? 0,
    search_refreshed_at: props.searchRefreshedAt ?? null,
    recommend_refreshed_at: props.recommendRefreshedAt ?? null,
    summary_refreshed_at: props.summaryRefreshedAt ?? null,
    search_issue: props.searchIssue,
    recommend_issue: props.recommendIssue,
    summary_issue: props.summaryIssue,
    launcher_source: props.launcherSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    upstream_record: props.upstreamRecordLabel,
    sourcing_reference: props.sourcingReference,
    continuity_note: props.continuityNote,
    appw_stage: 'APPW-MS1 purchasing intelligence hardening',
    desk_type: 'purchasing',
  };
}

export function AppwPurchasingCopilot(props: AppwPurchasingCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneLabel,
      props.averageLeadDays,
      props.bestLeadDays,
      props.bestScore,
      props.bestSupplier,
      props.bestUnitPrice,
      props.launcherSourceLabel,
      props.manufacturerCount,
      props.marketLeadDays,
      props.marketPosture,
      props.marketSpend,
      props.marketSupplierCount,
      props.material,
      props.query,
      props.recommendIssue,
      props.recommendRefreshedAt,
      props.searchIssue,
      props.searchRefreshedAt,
      props.sourcingReference,
      props.supplierCount,
      props.summaryIssue,
      props.summaryRefreshedAt,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.bestLeadDays,
      props.bestScore,
      props.bestSupplier,
      props.bestUnitPrice,
      props.continuityNote,
      props.deskLabel,
      props.launcherSourceLabel,
      props.manufacturerCount,
      props.marketPosture,
      props.material,
      props.recommendIssue,
      props.searchIssue,
      props.supplierCount,
      props.summaryIssue,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.averageLeadDays,
      props.bestLeadDays,
      props.bestScore,
      props.bestSupplier,
      props.bestUnitPrice,
      props.continuityNote,
      props.deskLabel,
      props.launcherSourceLabel,
      props.manufacturerCount,
      props.marketLeadDays,
      props.marketPosture,
      props.marketSpend,
      props.marketSupplierCount,
      props.material,
      props.query,
      props.recommendIssue,
      props.recommendRefreshedAt,
      props.searchIssue,
      props.searchRefreshedAt,
      props.sourcingReference,
      props.supplierCount,
      props.summaryIssue,
      props.summaryRefreshedAt,
      props.upstreamRecordLabel,
      props.upstreamSourceLabel,
    ],
  );

  return (
    <div data-testid="appw-purchasing-copilot">
      <WorkspaceAICopilot
        workspaceLabel={props.deskLabel}
        summary={summary}
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
}

export default AppwPurchasingCopilot;
