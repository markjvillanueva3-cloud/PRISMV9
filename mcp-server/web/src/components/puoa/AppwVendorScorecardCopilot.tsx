import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwVendorScorecardCopilotProps {
  deskLabel: string;
  vendorCount: number;
  averageScore: number | null;
  topVendorName?: string | null;
  topVendorScore?: number | null;
  weakestVendorName?: string | null;
  weakestVendorScore?: number | null;
  qualityRiskCount?: number;
  deliveryRiskCount?: number;
  priceRiskCount?: number;
  refreshedAt?: number | null;
  issue?: string | null;
}

function formatScore(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return `${Math.round(value)}/100`;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function buildSummary(props: AppwVendorScorecardCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.vendorCount} vendors staged`);
  const averageScore = formatScore(props.averageScore);
  if (averageScore) posture.push(`average composite ${averageScore}`);
  if (props.topVendorName) posture.push(`top vendor ${props.topVendorName}`);
  const topVendorScore = formatScore(props.topVendorScore);
  if (topVendorScore) posture.push(`top vendor score ${topVendorScore}`);
  if (props.weakestVendorName) posture.push(`lowest vendor ${props.weakestVendorName}`);
  const weakestVendorScore = formatScore(props.weakestVendorScore);
  if (weakestVendorScore) posture.push(`lowest vendor score ${weakestVendorScore}`);
  if ((props.qualityRiskCount ?? 0) > 0) posture.push(`${props.qualityRiskCount} quality-risk vendors`);
  if ((props.deliveryRiskCount ?? 0) > 0) posture.push(`${props.deliveryRiskCount} delivery-risk vendors`);
  if ((props.priceRiskCount ?? 0) > 0) posture.push(`${props.priceRiskCount} price-risk vendors`);
  if (props.issue) posture.push('vendor lane degraded');
  posture.push(formatRefresh(props.refreshedAt));

  return `Kienzle AI is reasoning over live supplier scorecard posture, balancing composite rank against delivery, quality, and price risk instead of trusting a single leaderboard. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwVendorScorecardCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if (props.topVendorName && props.weakestVendorName) {
    suggestions.push({
      id: 'compare-suppliers',
      label: 'Compare strongest vs weakest',
      query: `Compare ${props.topVendorName} against ${props.weakestVendorName}. Explain whether the gap is mainly quality, delivery, price, or order history, and which supplier action should happen next.`,
    });
  }

  if ((props.deliveryRiskCount ?? 0) > 0 || (props.qualityRiskCount ?? 0) > 0) {
    suggestions.push({
      id: 'recover-supplier-risk',
      label: 'Recover supplier risk',
      query: 'Use the live vendor scorecard to identify the riskiest supplier relationships and recommend the safest recovery sequence for delivery, NCR pressure, and sourcing continuity.',
    });
  }

  if ((props.priceRiskCount ?? 0) > 0) {
    suggestions.push({
      id: 'price-vs-service',
      label: 'Balance price against service',
      query: 'Interpret where the current supplier list may be over-indexing on price score while underestimating delivery or quality risk. Recommend which tradeoffs should be tolerated and which should be rejected.',
    });
  }

  if (props.issue) {
    suggestions.push({
      id: 'recover-scorecard-route',
      label: 'Recover scorecard route',
      query: 'The vendor scorecard lane is degraded. Explain the safest way to restore supplier-confidence signals without losing the current sourcing context.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-scorecard-brief',
      label: 'Open supplier brief',
      query: `Review the ${props.deskLabel} context and recommend the next supplier actions for quality, delivery, and price governance.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwVendorScorecardCopilotProps) {
  return {
    desk: props.deskLabel,
    vendor_count: props.vendorCount,
    average_score: props.averageScore ?? null,
    top_vendor_name: props.topVendorName,
    top_vendor_score: props.topVendorScore ?? null,
    weakest_vendor_name: props.weakestVendorName,
    weakest_vendor_score: props.weakestVendorScore ?? null,
    quality_risk_count: props.qualityRiskCount ?? 0,
    delivery_risk_count: props.deliveryRiskCount ?? 0,
    price_risk_count: props.priceRiskCount ?? 0,
    refreshed_at: props.refreshedAt ?? null,
    issue: props.issue,
    appw_stage: 'APPW-MS1 vendor scorecard intelligence hardening',
    desk_type: 'vendor_scorecard',
  };
}

export function AppwVendorScorecardCopilot(props: AppwVendorScorecardCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.averageScore,
      props.deliveryRiskCount,
      props.issue,
      props.priceRiskCount,
      props.qualityRiskCount,
      props.refreshedAt,
      props.topVendorName,
      props.topVendorScore,
      props.vendorCount,
      props.weakestVendorName,
      props.weakestVendorScore,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.deliveryRiskCount,
      props.deskLabel,
      props.issue,
      props.priceRiskCount,
      props.qualityRiskCount,
      props.topVendorName,
      props.weakestVendorName,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.averageScore,
      props.deliveryRiskCount,
      props.deskLabel,
      props.issue,
      props.priceRiskCount,
      props.qualityRiskCount,
      props.refreshedAt,
      props.topVendorName,
      props.topVendorScore,
      props.vendorCount,
      props.weakestVendorName,
      props.weakestVendorScore,
    ],
  );

  return (
    <div data-testid="appw-vendor-scorecard-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwVendorScorecardCopilot;
