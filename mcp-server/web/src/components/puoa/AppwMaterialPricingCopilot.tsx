import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwMaterialPricingCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  lookupMaterial?: string | null;
  lookupForm?: string | null;
  lookupRegion?: string | null;
  lookupBasePrice?: number | null;
  lookupAdjustedPrice?: number | null;
  lookupTotalPrice?: number | null;
  lookupSurchargeCount?: number;
  comparisonMaterialCount?: number;
  comparisonResultCount?: number;
  comparisonCheapestMaterial?: string | null;
  comparisonCheapestPrice?: number | null;
  surchargeMaterial?: string | null;
  surchargeSummary?: string | null;
  lookupRefreshedAt?: number | null;
  compareRefreshedAt?: number | null;
  surchargeRefreshedAt?: number | null;
  lookupIssue?: string | null;
  compareIssue?: string | null;
  surchargeIssue?: string | null;
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

function buildSummary(props: AppwMaterialPricingCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.lookupMaterial) posture.push(`lookup alloy ${props.lookupMaterial}`);
  if (props.lookupForm) posture.push(`form ${props.lookupForm}`);
  if (props.lookupRegion) posture.push(`region ${props.lookupRegion}`);
  const basePrice = formatMoney(props.lookupBasePrice);
  if (basePrice) posture.push(`${basePrice}/kg base`);
  const adjustedPrice = formatMoney(props.lookupAdjustedPrice);
  if (adjustedPrice) posture.push(`${adjustedPrice}/kg adjusted`);
  const totalPrice = formatMoney(props.lookupTotalPrice);
  if (totalPrice) posture.push(`${totalPrice}/kg all-in`);
  if ((props.lookupSurchargeCount ?? 0) > 0) posture.push(`${props.lookupSurchargeCount} surcharge drivers`);
  if ((props.comparisonMaterialCount ?? 0) > 0) posture.push(`${props.comparisonMaterialCount} alloys staged for compare`);
  if ((props.comparisonResultCount ?? 0) > 0) posture.push(`${props.comparisonResultCount} ranked comparison results`);
  if (props.comparisonCheapestMaterial) posture.push(`current cheapest ${props.comparisonCheapestMaterial}`);
  const cheapestPrice = formatMoney(props.comparisonCheapestPrice);
  if (cheapestPrice) posture.push(`${cheapestPrice}/kg lowest comparison price`);
  if (props.surchargeMaterial) posture.push(`surcharge focus ${props.surchargeMaterial}`);
  if (props.surchargeSummary) posture.push(props.surchargeSummary);
  if (props.lookupIssue) posture.push('lookup lane degraded');
  if (props.compareIssue) posture.push('compare lane degraded');
  if (props.surchargeIssue) posture.push('surcharge lane degraded');
  posture.push(`lookup ${formatRefresh(props.lookupRefreshedAt)}`);
  posture.push(`compare ${formatRefresh(props.compareRefreshedAt)}`);
  posture.push(`surcharge ${formatRefresh(props.surchargeRefreshedAt)}`);

  return `PRISM AI is reasoning over live material price lookup posture, alloy comparison ranking, surcharge volatility, freshness, and degraded-lane signals for the Material Pricing desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwMaterialPricingCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if (props.lookupMaterial && props.lookupTotalPrice != null) {
    suggestions.push({
      id: 'interpret-buy',
      label: 'Interpret active buy',
      query: `Interpret the live buy posture for ${props.lookupMaterial}${props.lookupForm ? ` ${props.lookupForm}` : ''}${props.lookupRegion ? ` in ${props.lookupRegion}` : ''}. Explain whether the quote team should accept the current all-in price, challenge the surcharge stack, or compare alternatives before quoting.`,
    });
  }

  if ((props.comparisonResultCount ?? 0) > 0) {
    suggestions.push({
      id: 'compare-alternatives',
      label: 'Compare alloy tradeoffs',
      query: `Use the live comparison board to explain which alloy should be preferred next. Separate lowest-cost posture from lowest-risk posture and call out where the team might be over-indexing on price alone.`,
    });
  }

  if (props.surchargeMaterial || props.surchargeSummary) {
    suggestions.push({
      id: 'surcharge-volatility',
      label: 'Interpret surcharge volatility',
      query: `Interpret the live surcharge posture for ${props.surchargeMaterial ?? 'the selected material'} and explain whether volatility is strong enough to change timing, supplier strategy, or alloy selection.`,
    });
  }

  if (props.lookupIssue || props.compareIssue || props.surchargeIssue) {
    suggestions.push({
      id: 'recover-lanes',
      label: 'Recover pricing lanes',
      query: `One or more material-pricing lanes are degraded. Explain the safest recovery sequence so the buyer can restore lookup, comparison, and surcharge confidence without losing the current quoting context.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      label: 'Open pricing brief',
      query: `Review the ${props.deskLabel} context and recommend the next pricing, comparison, and surcharge actions for the quoting team.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwMaterialPricingCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    lookup_material: props.lookupMaterial,
    lookup_form: props.lookupForm,
    lookup_region: props.lookupRegion,
    lookup_base_price: props.lookupBasePrice ?? null,
    lookup_adjusted_price: props.lookupAdjustedPrice ?? null,
    lookup_total_price: props.lookupTotalPrice ?? null,
    lookup_surcharge_count: props.lookupSurchargeCount ?? 0,
    comparison_material_count: props.comparisonMaterialCount ?? 0,
    comparison_result_count: props.comparisonResultCount ?? 0,
    comparison_cheapest_material: props.comparisonCheapestMaterial,
    comparison_cheapest_price: props.comparisonCheapestPrice ?? null,
    surcharge_material: props.surchargeMaterial,
    surcharge_summary: props.surchargeSummary,
    lookup_refreshed_at: props.lookupRefreshedAt ?? null,
    compare_refreshed_at: props.compareRefreshedAt ?? null,
    surcharge_refreshed_at: props.surchargeRefreshedAt ?? null,
    lookup_issue: props.lookupIssue,
    compare_issue: props.compareIssue,
    surcharge_issue: props.surchargeIssue,
    appw_stage: 'APPW-MS1 material pricing intelligence hardening',
    desk_type: 'material_pricing',
  };
}

export function AppwMaterialPricingCopilot(props: AppwMaterialPricingCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneLabel,
      props.compareIssue,
      props.compareRefreshedAt,
      props.comparisonCheapestMaterial,
      props.comparisonCheapestPrice,
      props.comparisonMaterialCount,
      props.comparisonResultCount,
      props.lookupAdjustedPrice,
      props.lookupBasePrice,
      props.lookupForm,
      props.lookupIssue,
      props.lookupMaterial,
      props.lookupRefreshedAt,
      props.lookupRegion,
      props.lookupSurchargeCount,
      props.lookupTotalPrice,
      props.surchargeIssue,
      props.surchargeMaterial,
      props.surchargeRefreshedAt,
      props.surchargeSummary,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.comparisonResultCount,
      props.deskLabel,
      props.lookupForm,
      props.lookupIssue,
      props.lookupMaterial,
      props.lookupRegion,
      props.lookupTotalPrice,
      props.compareIssue,
      props.surchargeIssue,
      props.surchargeMaterial,
      props.surchargeSummary,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.compareIssue,
      props.compareRefreshedAt,
      props.comparisonCheapestMaterial,
      props.comparisonCheapestPrice,
      props.comparisonMaterialCount,
      props.comparisonResultCount,
      props.deskLabel,
      props.lookupAdjustedPrice,
      props.lookupBasePrice,
      props.lookupForm,
      props.lookupIssue,
      props.lookupMaterial,
      props.lookupRefreshedAt,
      props.lookupRegion,
      props.lookupSurchargeCount,
      props.lookupTotalPrice,
      props.surchargeIssue,
      props.surchargeMaterial,
      props.surchargeRefreshedAt,
      props.surchargeSummary,
    ],
  );

  return (
    <div data-testid="appw-material-pricing-copilot">
      <WorkspaceAICopilot
        workspaceLabel={props.deskLabel}
        summary={summary}
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
}

export default AppwMaterialPricingCopilot;
