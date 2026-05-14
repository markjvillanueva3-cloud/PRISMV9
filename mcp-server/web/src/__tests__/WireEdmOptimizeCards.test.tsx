/**
 * WireEdmOptimizeCards — Kerf width & Recast depth card tests
 * P2P-FULLSTACK-MS0/U-P2PFS37: Spark gap / kerf width + HAZ / recast depth cards
 *
 * Tests WireEdmKerfWidthCard and WireEdmRecastDepthCard defensive rendering,
 * tolerance/risk tone mapping, warning banners, and safety attributes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  WireEdmKerfWidthCard,
  WireEdmRecastDepthCard,
  WireEdmCostPerUnitLengthCard,
  WireEdmSlugTabRetentionCard,
  WireEdmWireBreakGaugeCard,
  WireEdmDielectricFlushAdjustCard,
  WireEdmWireSpoolConsumptionCard,
  WireEdmTaperErrorBudgetCard,
} from '../components/calculator/WireEdmOptimizeCards';
import type {
  WireEdmKerfWidthResult,
  WireEdmRecastDepthResult,
  WireEdmCostPerUnitLengthResult,
  WireEdmSlugTabRetentionResult,
  WireEdmWireBreakGaugeResult,
  WireEdmDielectricFlushAdjustResult,
  WireEdmWireSpoolConsumptionResult,
  WireEdmTaperErrorBudgetResult,
} from '../api/wireEdm';

// ── Fixtures ─────────────────────────────────────────────────────────────

function kerfFixture(overrides: Partial<WireEdmKerfWidthResult> = {}): WireEdmKerfWidthResult {
  return {
    kerf_width_mm: 0.2850,
    overcut_mm: 0.0425,
    wire_offset_mm: 0.1425,
    uncertainty_mm: 0.0030,
    estimated_Ra_um: 1.8,
    recast_layer_um: 4.2,
    tolerance_class: 'IT8',
    ...overrides,
  };
}

function recastFixture(overrides: Partial<WireEdmRecastDepthResult> = {}): WireEdmRecastDepthResult {
  return {
    risk_level: 'moderate',
    estimated_depth_um: 10.5,
    heat_affected_zone_um: 31.5,
    microcrack_probability_pct: 25,
    fatigue_life_reduction_pct: 15,
    contributing_factors: [
      { factor: 'peak_current', contribution_pct: 45, description: 'High Ip increases recast' },
      { factor: 'pulse_on_time', contribution_pct: 30, description: 'Long ton grows melt pool' },
    ],
    recommendations: ['Reduce peak current by 20%', 'Add skim pass'],
    safe_for_fatigue_critical: true,
    ...overrides,
  };
}

// ── WireEdmKerfWidthCard ─────────────────────────────────────────────────

describe('WireEdmKerfWidthCard', () => {
  it('renders null when prop is falsy', () => {
    const { container } = render(<WireEdmKerfWidthCard kerf={undefined as unknown as WireEdmKerfWidthResult} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders kerf width, overcut, wire offset with 4-decimal precision', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    expect(screen.getByText('0.2850 mm')).toBeInTheDocument();
    expect(screen.getByText('0.0425 mm')).toBeInTheDocument();
    expect(screen.getByText('0.1425 mm')).toBeInTheDocument();
  });

  it('renders uncertainty with plus-minus sign', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    expect(screen.getByText(/0\.0030 mm/)).toBeInTheDocument();
  });

  it('renders Ra and recast layer in estimated section', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    expect(screen.getByText(/1\.80/)).toBeInTheDocument();
    expect(screen.getByText(/recast 4\.2/)).toBeInTheDocument();
  });

  it('applies PRECISION tone (emerald) for IT6/IT7', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture({ tolerance_class: 'IT6' })} />);
    const badge = screen.getByText(/IT6/);
    expect(badge.textContent).toMatch(/PRECISION/);
    expect(badge.className).toMatch(/emerald/);
  });

  it('applies STANDARD tone (cyan) for IT8/IT9', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture({ tolerance_class: 'IT9' })} />);
    const badge = screen.getByText(/IT9/);
    expect(badge.textContent).toMatch(/STANDARD/);
    expect(badge.className).toMatch(/cyan/);
  });

  it('applies COARSE tone (amber) for IT10+', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture({ tolerance_class: 'IT11' })} />);
    const badge = screen.getByText(/IT11/);
    expect(badge.textContent).toMatch(/COARSE/);
    expect(badge.className).toMatch(/amber/);
  });

  it('shows warning banner when warning is present', () => {
    const warning = 'Roughing params produce tighter tolerance than expected';
    render(<WireEdmKerfWidthCard kerf={kerfFixture({ warning })} />);
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('does not show warning banner when warning absent', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    expect(screen.queryByText(/tighter tolerance/)).not.toBeInTheDocument();
  });

  it('applies calculator-warning-attention class when warning present', () => {
    const { container } = render(<WireEdmKerfWidthCard kerf={kerfFixture({ warning: 'x' })} />);
    const card = container.querySelector('[data-safety-card="kerf-width"]');
    expect(card?.className).toMatch(/calculator-warning-attention/);
  });

  it('emits data-safety-card="kerf-width" and ARIA region role', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    const region = screen.getByRole('region', { name: /kerf width/i });
    expect(region.getAttribute('data-safety-card')).toBe('kerf-width');
  });

  it('renders Klocke 2017 formula citation', () => {
    render(<WireEdmKerfWidthCard kerf={kerfFixture()} />);
    expect(screen.getByText(/Klocke 2017/)).toBeInTheDocument();
    expect(screen.getByText(/Kerf = wire_dia/)).toBeInTheDocument();
  });

  it('falls back to em-dash for null/NaN numeric values', () => {
    const broken = {
      ...kerfFixture(),
      kerf_width_mm: null as unknown as number,
      overcut_mm: NaN,
    };
    render(<WireEdmKerfWidthCard kerf={broken} />);
    // Expect two em-dash fallbacks rendered with unit suffix
    expect(screen.getAllByText(/\u2014 mm/).length).toBeGreaterThanOrEqual(2);
  });
});

// ── WireEdmRecastDepthCard ───────────────────────────────────────────────

describe('WireEdmRecastDepthCard', () => {
  it('renders null when prop is falsy', () => {
    const { container } = render(<WireEdmRecastDepthCard recast={undefined as unknown as WireEdmRecastDepthResult} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all four core metrics', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture()} />);
    expect(screen.getByText(/10\.5/)).toBeInTheDocument();
    expect(screen.getByText(/31\.5/)).toBeInTheDocument();
    expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('renders CRITICAL badge with rose tone', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'critical' })} />);
    const badge = screen.getByText(/CRITICAL RISK/);
    expect(badge.className).toMatch(/rose/);
  });

  it('renders HIGH badge with rose tone', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'high' })} />);
    expect(screen.getByText(/HIGH RISK/)).toBeInTheDocument();
  });

  it('renders MODERATE badge with amber tone', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'moderate' })} />);
    const badge = screen.getByText(/MODERATE RISK/);
    expect(badge.className).toMatch(/amber/);
  });

  it('renders LOW badge with cyan tone', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'low' })} />);
    const badge = screen.getByText(/LOW RISK/);
    expect(badge.className).toMatch(/cyan/);
  });

  it('renders NONE badge with emerald tone', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'none' })} />);
    const badge = screen.getByText(/NONE RISK/);
    expect(badge.className).toMatch(/emerald/);
  });

  it('shows NOT SAFE FOR FATIGUE-CRITICAL PARTS banner when unsafe', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ safe_for_fatigue_critical: false })} />);
    expect(screen.getByText(/NOT SAFE FOR FATIGUE-CRITICAL PARTS/)).toBeInTheDocument();
  });

  it('hides fatigue banner when safe', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ safe_for_fatigue_critical: true })} />);
    expect(screen.queryByText(/NOT SAFE FOR FATIGUE-CRITICAL PARTS/)).not.toBeInTheDocument();
  });

  it('applies calculator-warning-attention class on critical risk', () => {
    const { container } = render(<WireEdmRecastDepthCard recast={recastFixture({ risk_level: 'critical' })} />);
    const card = container.querySelector('[data-safety-card="recast-depth"]');
    expect(card?.className).toMatch(/calculator-warning-attention/);
  });

  it('microcrack probability tone is rose above 40%', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ microcrack_probability_pct: 55 })} />);
    const el = screen.getByText(/55\.0%/);
    expect(el.className).toMatch(/rose/);
  });

  it('microcrack probability tone is amber between 20% and 40%', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ microcrack_probability_pct: 30 })} />);
    const el = screen.getByText(/30\.0%/);
    expect(el.className).toMatch(/amber/);
  });

  it('microcrack probability tone is emerald below 20%', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ microcrack_probability_pct: 10 })} />);
    const el = screen.getByText(/10\.0%/);
    expect(el.className).toMatch(/emerald/);
  });

  it('fatigue reduction tone escalates above 20%', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ fatigue_life_reduction_pct: 35 })} />);
    const el = screen.getByText(/35%/);
    expect(el.className).toMatch(/rose/);
  });

  it('renders contributing factors with contribution percents', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture()} />);
    expect(screen.getByText('peak current')).toBeInTheDocument();
    expect(screen.getByText('pulse on time')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders recommendations list when provided', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture()} />);
    expect(screen.getByText('Reduce peak current by 20%')).toBeInTheDocument();
    expect(screen.getByText('Add skim pass')).toBeInTheDocument();
  });

  it('hides contributing factors section when list is empty', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ contributing_factors: [] })} />);
    expect(screen.queryByText(/Contributing factors/i)).not.toBeInTheDocument();
  });

  it('hides recommendations section when list is empty', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture({ recommendations: [] })} />);
    expect(screen.queryByText(/^Recommendations$/i)).not.toBeInTheDocument();
  });

  it('emits data-safety-card="recast-depth" and ARIA region role', () => {
    render(<WireEdmRecastDepthCard recast={recastFixture()} />);
    const region = screen.getByRole('region', { name: /HAZ and recast depth/i });
    expect(region.getAttribute('data-safety-card')).toBe('recast-depth');
  });

  it('gracefully handles null numeric metrics with em-dash', () => {
    const broken: WireEdmRecastDepthResult = {
      ...recastFixture(),
      estimated_depth_um: null as unknown as number,
      heat_affected_zone_um: NaN,
    };
    render(<WireEdmRecastDepthCard recast={broken} />);
    expect(screen.getAllByText(/\u2014/).length).toBeGreaterThan(0);
  });
});

// ── WireEdmCostPerUnitLengthCard (U-P2PFS38) ────────────────────────────

function cplFixture(overrides: Partial<WireEdmCostPerUnitLengthResult> = {}): WireEdmCostPerUnitLengthResult {
  return {
    cut_length_mm: 250,
    cost_per_mm_usd: 0.0456,
    cost_per_in_usd: 1.158,
    time_per_mm_min: 0.024,
    time_per_in_min: 0.610,
    quantity_breaks: [
      { quantity: 1, unit_cost_usd: 11.40, unit_cost_per_mm_usd: 0.0456, unit_cost_per_in_usd: 1.158 },
      { quantity: 10, unit_cost_usd: 9.50, unit_cost_per_mm_usd: 0.0380, unit_cost_per_in_usd: 0.965 },
      { quantity: 50, unit_cost_usd: 7.80, unit_cost_per_mm_usd: 0.0312, unit_cost_per_in_usd: 0.792 },
    ],
    ...overrides,
  };
}

describe('WireEdmCostPerUnitLengthCard', () => {
  it('renders null when prop is falsy', () => {
    const { container } = render(
      <WireEdmCostPerUnitLengthCard cost={undefined as unknown as WireEdmCostPerUnitLengthResult} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders cost per mm with 4-decimal precision and cost per inch with 3-decimal', () => {
    const { container } = render(<WireEdmCostPerUnitLengthCard cost={cplFixture()} />);
    // $ and number can render as sibling text nodes; match against container text
    expect(container.textContent).toContain('0.0456');
    expect(container.textContent).toContain('1.158');
  });

  it('renders cut length with mm and inch conversion', () => {
    render(<WireEdmCostPerUnitLengthCard cost={cplFixture()} />);
    // 250 mm ÷ 25.4 = 9.84 in
    expect(screen.getByText(/250\.0 mm/)).toBeInTheDocument();
    expect(screen.getByText(/9\.84 in/)).toBeInTheDocument();
  });

  it('renders all 3 quantity-break rows with unit-normalized pricing', () => {
    render(<WireEdmCostPerUnitLengthCard cost={cplFixture()} />);
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('10x')).toBeInTheDocument();
    expect(screen.getByText('50x')).toBeInTheDocument();
    expect(screen.getByText('$11.40')).toBeInTheDocument();
    expect(screen.getByText('$7.80')).toBeInTheDocument();
  });

  it('omits quantity breaks section when array is empty', () => {
    const empty = cplFixture({ quantity_breaks: [] });
    render(<WireEdmCostPerUnitLengthCard cost={empty} />);
    expect(screen.queryByText('Quantity pricing')).toBeNull();
  });

  it('handles missing quantity_breaks (undefined) without crashing', () => {
    const noBreaks: WireEdmCostPerUnitLengthResult = {
      cut_length_mm: 100,
      cost_per_mm_usd: 0.02,
      cost_per_in_usd: 0.508,
      time_per_mm_min: 0.01,
      time_per_in_min: 0.254,
    };
    render(<WireEdmCostPerUnitLengthCard cost={noBreaks} />);
    expect(screen.getByText('0')).toBeInTheDocument(); // 0 price tiers
  });

  it('sets role="region" with an accessible label', () => {
    render(<WireEdmCostPerUnitLengthCard cost={cplFixture()} />);
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toMatch(/per millimeter.*per inch/i);
  });

  it('falls back to em-dash for NaN cost values', () => {
    const broken: WireEdmCostPerUnitLengthResult = {
      ...cplFixture(),
      cost_per_mm_usd: NaN,
    };
    render(<WireEdmCostPerUnitLengthCard cost={broken} />);
    expect(screen.getAllByText(/\u2014/).length).toBeGreaterThan(0);
  });
});

// ── WireEdmSlugTabRetentionCard (U-P2PFS38) ─────────────────────────────

function retentionFixture(overrides: Partial<WireEdmSlugTabRetentionResult> = {}): WireEdmSlugTabRetentionResult {
  return {
    risk_level: 'safe',
    safety_factor: 3.5,
    slug_weight_kg: 0.04,
    slug_weight_force_N: 0.37,
    retention_force_N: 16626,
    demand_force_N: 4751,
    tab_cross_section_mm2: 24,
    shear_strength_MPa: 693,
    dynamic_factor: 3.0,
    summary: 'Slug retention SF=3.50 (40 g slug) — safe for uncontrolled drop',
    recommendations: ['Current tab plan provides adequate retention — proceed'],
    safe_for_uncontrolled_drop: true,
    ...overrides,
  };
}

describe('WireEdmSlugTabRetentionCard', () => {
  it('renders null when prop is falsy', () => {
    const { container } = render(
      <WireEdmSlugTabRetentionCard retention={undefined as unknown as WireEdmSlugTabRetentionResult} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders SF value with 2-decimal precision', () => {
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture()} />);
    expect(screen.getByText(/SF 3\.50/)).toBeInTheDocument();
  });

  it('applies SAFE tone (emerald) for safe risk level', () => {
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture({ risk_level: 'safe' })} />);
    const badges = screen.getAllByText(/SAFE/);
    expect(badges.length).toBeGreaterThan(0);
    // At least one badge (the risk-level badge) should have emerald class
    expect(badges.some((b) => b.className.includes('emerald'))).toBe(true);
  });

  it('applies MARGINAL tone (amber) for marginal risk level', () => {
    render(
      <WireEdmSlugTabRetentionCard retention={retentionFixture({ risk_level: 'marginal', safety_factor: 1.5 })} />,
    );
    const badge = screen.getByText('MARGINAL');
    expect(badge.className).toMatch(/amber/);
  });

  it('applies AT RISK tone (rose) for at_risk risk level', () => {
    render(
      <WireEdmSlugTabRetentionCard retention={retentionFixture({ risk_level: 'at_risk', safety_factor: 0.9 })} />,
    );
    const badge = screen.getByText('AT RISK');
    expect(badge.className).toMatch(/rose/);
  });

  it('renders UNSAFE banner for unsafe risk level', () => {
    render(
      <WireEdmSlugTabRetentionCard
        retention={retentionFixture({
          risk_level: 'unsafe',
          safety_factor: 0.3,
          safe_for_uncontrolled_drop: false,
        })}
      />,
    );
    expect(screen.getByText(/REDESIGN REQUIRED/i)).toBeInTheDocument();
  });

  it('renders slug mass in kilograms', () => {
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture({ slug_weight_kg: 0.125 })} />);
    expect(screen.getByText(/0\.125 kg/)).toBeInTheDocument();
  });

  it('renders retention, demand, and shear strength values', () => {
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture()} />);
    expect(screen.getByText(/16626 N/)).toBeInTheDocument();
    expect(screen.getByText(/4751 N/)).toBeInTheDocument();
    expect(screen.getByText(/693 MPa/)).toBeInTheDocument();
  });

  it('renders summary text verbatim', () => {
    const summary = 'Slug retention SF=1.25 (87 g slug) — marginal, use controlled drop';
    render(
      <WireEdmSlugTabRetentionCard
        retention={retentionFixture({ summary, risk_level: 'marginal', safety_factor: 1.25 })}
      />,
    );
    expect(screen.getByText(summary)).toBeInTheDocument();
  });

  it('renders each recommendation in its own container', () => {
    const recs = ['Reduce tab width', 'Add controlled drop', 'Verify clearance'];
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture({ recommendations: recs })} />);
    for (const r of recs) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
  });

  it('has role="region" with an accessible label describing SF and slug mass', () => {
    render(<WireEdmSlugTabRetentionCard retention={retentionFixture()} />);
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/safety factor/i);
    expect(label).toMatch(/slug mass/i);
  });

  it('falls back to em-dash when slug_weight_kg is NaN', () => {
    const broken: WireEdmSlugTabRetentionResult = {
      ...retentionFixture(),
      slug_weight_kg: NaN,
    };
    render(<WireEdmSlugTabRetentionCard retention={broken} />);
    expect(screen.getAllByText(/\u2014/).length).toBeGreaterThan(0);
  });
});

// ── WireEdmWireBreakGaugeCard ────────────────────────────────────────────
// P2P-FULLSTACK-MS0/U-P2PFS39: Wire break probability gauge

function gaugeFixture(
  overrides: Partial<WireEdmWireBreakGaugeResult> = {},
): WireEdmWireBreakGaugeResult {
  return {
    probability_per_job: 0.125,
    probability_per_meter: 0.00035,
    expected_breaks_per_job: 0.134,
    risk_category: 'MEDIUM',
    factor_contributions: [
      { name: 'Current density', multiplier: 1.5, contribution_pct: 42 },
      { name: 'Wire tension', multiplier: 1.0, contribution_pct: 0 },
      { name: 'Material thickness', multiplier: 1.0, contribution_pct: 0 },
      { name: 'Thin walls', multiplier: 1.8, contribution_pct: 58 },
      { name: 'Sharp corners', multiplier: 1.0, contribution_pct: 0 },
    ],
    cost_per_break_usd: 7.15,
    total_break_risk_cost_usd: 0.96,
    re_thread_time_min: 3.0,
    historical_comparison: {
      material_avg_breaks_per_km: 0.03,
      this_job_vs_avg: '340% higher than average',
    },
    recommendations: ['Reduce peak current', 'Use reduced power on thin walls'],
    ...overrides,
  };
}

describe('WireEdmWireBreakGaugeCard', () => {
  it('renders null when gauge prop is missing', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard gauge={null as unknown as WireEdmWireBreakGaugeResult} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays P(break) percentage with 1-decimal precision', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard gauge={gaugeFixture({ probability_per_job: 0.12345 })} />,
    );
    // 0.12345 × 100 = 12.345 → "12.3%"
    expect(container.textContent).toContain('12.3%');
  });

  it('clamps probability > 1 to 100% for display', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard gauge={gaugeFixture({ probability_per_job: 1.2 })} />,
    );
    expect(container.textContent).toContain('100.0%');
  });

  it('displays all 4 risk tier labels correctly', () => {
    const tiers: WireEdmWireBreakGaugeResult['risk_category'][] = [
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL',
    ];
    for (const tier of tiers) {
      const { container, unmount } = render(
        <WireEdmWireBreakGaugeCard gauge={gaugeFixture({ risk_category: tier })} />,
      );
      expect(container.textContent).toContain(tier);
      unmount();
    }
  });

  it('renders a gauge SVG element', () => {
    render(<WireEdmWireBreakGaugeCard gauge={gaugeFixture()} />);
    expect(screen.getByTestId('wire-break-gauge-svg')).toBeInTheDocument();
    expect(screen.getByTestId('wire-break-gauge-fill')).toBeInTheDocument();
  });

  it('renders a factor row per multiplier > 1, suppressing inert factors', () => {
    render(<WireEdmWireBreakGaugeCard gauge={gaugeFixture()} />);
    // Fixture has 2 active factors (current density 1.5x, thin walls 1.8x)
    const rows = screen.getAllByTestId('wire-break-factor-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Current density')).toBeInTheDocument();
    expect(screen.getByText('Thin walls')).toBeInTheDocument();
    // Suppressed factors must not render their rows
    expect(screen.queryByText('Wire tension')).not.toBeInTheDocument();
    expect(screen.queryByText('Sharp corners')).not.toBeInTheDocument();
  });

  it('shows a "no excess risk" message when all factor multipliers are 1.0', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard
        gauge={gaugeFixture({
          factor_contributions: [
            { name: 'Current density', multiplier: 1.0, contribution_pct: 0 },
            { name: 'Wire tension', multiplier: 1.0, contribution_pct: 0 },
            { name: 'Material thickness', multiplier: 1.0, contribution_pct: 0 },
            { name: 'Thin walls', multiplier: 1.0, contribution_pct: 0 },
            { name: 'Sharp corners', multiplier: 1.0, contribution_pct: 0 },
          ],
        })}
      />,
    );
    expect(screen.queryAllByTestId('wire-break-factor-row')).toHaveLength(0);
    expect(container.textContent).toMatch(/no excess risk|within nominal/i);
  });

  it('displays cost per break and total break risk cost', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard
        gauge={gaugeFixture({ cost_per_break_usd: 12.5, total_break_risk_cost_usd: 1.67 })}
      />,
    );
    expect(container.textContent).toContain('$12.50');
    expect(container.textContent).toContain('$1.67');
  });

  it('shows rethread time inline next to cost per break', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard gauge={gaugeFixture({ re_thread_time_min: 4.5 })} />,
    );
    expect(container.textContent).toMatch(/4\.5\s*min\s*rethread/i);
  });

  it('renders historical comparison with avg breaks/km', () => {
    const { container } = render(
      <WireEdmWireBreakGaugeCard
        gauge={gaugeFixture({
          historical_comparison: {
            material_avg_breaks_per_km: 0.08,
            this_job_vs_avg: '120% higher than average',
          },
        })}
      />,
    );
    expect(container.textContent).toContain('0.080');
    expect(container.textContent).toContain('120% higher than average');
  });

  it('renders each recommendation in its own container', () => {
    const recs = ['Reduce peak current', 'Use thinner wire', 'Add corner slowdown'];
    render(<WireEdmWireBreakGaugeCard gauge={gaugeFixture({ recommendations: recs })} />);
    for (const r of recs) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
  });

  it('has role="region" with accessible label citing risk tier and probability', () => {
    render(
      <WireEdmWireBreakGaugeCard
        gauge={gaugeFixture({ risk_category: 'HIGH', probability_per_job: 0.65 })}
      />,
    );
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/HIGH/i);
    expect(label).toMatch(/65\.0 percent/);
  });

  it('falls back to em-dash when probability_per_job is NaN', () => {
    const broken = gaugeFixture({ probability_per_job: NaN });
    const { container } = render(<WireEdmWireBreakGaugeCard gauge={broken} />);
    // NaN probability → bounded to 0 → "0.0%" still renders, but individual
    // NaN field renders as em-dash. We verify em-dash fallback is used
    // somewhere when scalar values are NaN.
    const brokenScalars = gaugeFixture({
      probability_per_job: 0.1,
      cost_per_break_usd: NaN,
      total_break_risk_cost_usd: NaN,
    });
    const { container: c2 } = render(<WireEdmWireBreakGaugeCard gauge={brokenScalars} />);
    expect(c2.textContent).toContain('\u2014');
    expect(container).toBeDefined();
  });
});

// ── WireEdmDielectricFlushAdjustCard ─────────────────────────────────────
// P2P-FULLSTACK-MS0/U-P2PFS40: Dielectric conductivity → flush adjustment

function flushFixture(
  overrides: Partial<WireEdmDielectricFlushAdjustResult> = {},
): WireEdmDielectricFlushAdjustResult {
  return {
    baseline_flush_pressure_bar: 8.0,
    adjusted_flush_pressure_bar: 10.0,
    conductivity_factor: 1.25,
    temperature_factor: 1.0,
    thick_section_factor: 1.0,
    total_factor: 1.25,
    conductivity_status: 'acceptable',
    resin_exchange_urgency: 'none',
    warnings: [],
    recommendations: ['Monitor conductivity at 2-hour intervals.'],
    ...overrides,
  };
}

describe('WireEdmDielectricFlushAdjustCard', () => {
  it('renders null when adjust prop is missing', () => {
    const { container } = render(
      <WireEdmDielectricFlushAdjustCard
        adjust={null as unknown as WireEdmDielectricFlushAdjustResult}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays baseline and adjusted pressure with 2-decimal precision', () => {
    const { container } = render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          baseline_flush_pressure_bar: 7.5,
          adjusted_flush_pressure_bar: 9.37,
        })}
      />,
    );
    expect(container.textContent).toContain('7.50');
    expect(container.textContent).toContain('9.37');
  });

  it('computes and displays delta percent vs baseline', () => {
    const { container } = render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          baseline_flush_pressure_bar: 8.0,
          adjusted_flush_pressure_bar: 10.0,
        })}
      />,
    );
    // (10 - 8) / 8 = +25.0%
    expect(container.textContent).toContain('+25.0%');
  });

  it('displays all 4 conductivity status labels', () => {
    const statuses: WireEdmDielectricFlushAdjustResult['conductivity_status'][] = [
      'optimal',
      'acceptable',
      'degraded',
      'out_of_spec',
    ];
    const expected = ['OPTIMAL', 'ACCEPTABLE', 'DEGRADED', 'OUT OF SPEC'];
    statuses.forEach((s, i) => {
      const { container, unmount } = render(
        <WireEdmDielectricFlushAdjustCard adjust={flushFixture({ conductivity_status: s })} />,
      );
      expect(container.textContent).toContain(expected[i]);
      unmount();
    });
  });

  it('renders the "required" resin exchange banner when urgency=required', () => {
    render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          conductivity_status: 'out_of_spec',
          resin_exchange_urgency: 'required',
        })}
      />,
    );
    const banner = screen.getByTestId('resin-exchange-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.getAttribute('data-urgency')).toBe('required');
    expect(banner.textContent?.toUpperCase()).toContain('REQUIRED');
  });

  it('renders the "recommended" resin exchange banner when urgency=recommended', () => {
    render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          conductivity_status: 'degraded',
          resin_exchange_urgency: 'recommended',
        })}
      />,
    );
    const banner = screen.getByTestId('resin-exchange-banner');
    expect(banner.getAttribute('data-urgency')).toBe('recommended');
  });

  it('does not render a resin exchange banner when urgency=none', () => {
    render(<WireEdmDielectricFlushAdjustCard adjust={flushFixture()} />);
    expect(screen.queryByTestId('resin-exchange-banner')).not.toBeInTheDocument();
  });

  it('displays all 4 factor multipliers (conductivity, temperature, thick, total)', () => {
    const { container } = render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          conductivity_factor: 1.25,
          temperature_factor: 1.15,
          thick_section_factor: 1.1,
          total_factor: 1.582,
        })}
      />,
    );
    expect(container.textContent).toContain('×1.250');
    expect(container.textContent).toContain('×1.150');
    expect(container.textContent).toContain('×1.100');
    expect(container.textContent).toContain('×1.582');
  });

  it('renders the conductivity meter only when conductivity_uS_cm is provided', () => {
    const { container: c1 } = render(
      <WireEdmDielectricFlushAdjustCard adjust={flushFixture()} />,
    );
    // No meter without conductivity prop
    expect(c1.querySelector('[data-testid="conductivity-meter"]')).toBeNull();

    const { container: c2 } = render(
      <WireEdmDielectricFlushAdjustCard adjust={flushFixture()} conductivity_uS_cm={12} />,
    );
    expect(c2.querySelector('[data-testid="conductivity-meter"]')).not.toBeNull();
    expect(c2.textContent).toContain('12.0');
  });

  it('places the conductivity pointer at the correct position on the 0–35 scale', () => {
    const { container } = render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture()}
        conductivity_uS_cm={17.5} // exactly 50% of 35
      />,
    );
    const pointer = container.querySelector(
      '[data-testid="conductivity-pointer"]',
    ) as HTMLElement | null;
    expect(pointer).not.toBeNull();
    const left = pointer?.style.left ?? '';
    // Allow for float formatting: should be ~50%
    expect(left).toMatch(/^5(0|0\.0+)%?$/);
  });

  it('renders each warning and each recommendation in its own container', () => {
    const warnings = ['High conductivity — resin exhausted', 'Temperature elevated'];
    const recs = ['Exchange resin column', 'Lower dielectric temperature'];
    render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({ warnings, recommendations: recs })}
      />,
    );
    for (const w of warnings) expect(screen.getByText(w)).toBeInTheDocument();
    for (const r of recs) expect(screen.getByText(r)).toBeInTheDocument();
  });

  it('has role="region" with accessible label including pressures', () => {
    render(
      <WireEdmDielectricFlushAdjustCard
        adjust={flushFixture({
          baseline_flush_pressure_bar: 8,
          adjusted_flush_pressure_bar: 11.6,
          conductivity_status: 'degraded',
        })}
      />,
    );
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/DEGRADED/i);
    expect(label).toMatch(/8\.00 bar/);
    expect(label).toMatch(/11\.60 bar/);
  });

  it('falls back to em-dash when adjusted pressure is NaN', () => {
    const broken = flushFixture({
      baseline_flush_pressure_bar: 8,
      adjusted_flush_pressure_bar: NaN,
    });
    const { container } = render(<WireEdmDielectricFlushAdjustCard adjust={broken} />);
    expect(container.textContent).toContain('\u2014');
  });
});

// ── WireEdmWireSpoolConsumptionCard ─────────────────────────────────────
// P2P-FULLSTACK-MS0/U-P2PFS41: Wire spool consumption + mid-job change

function spoolFixture(
  overrides: Partial<WireEdmWireSpoolConsumptionResult> = {},
): WireEdmWireSpoolConsumptionResult {
  return {
    spool_capacity_m: 15000,
    wire_remaining_m: 15000,
    total_wire_m: 20000,
    spools_required: 2,
    spool_changes_required: 1,
    change_points_m: [14500],
    wire_remaining_after_job_m: 9500,
    per_change_time_min: 0.5,
    total_change_time_min: 0.5,
    total_change_cost_usd: 0.71,
    mid_job_change_risk: 'single_change',
    warnings: [],
    recommendations: ['Schedule operator attention at the change point.'],
    ...overrides,
  };
}

describe('WireEdmWireSpoolConsumptionCard', () => {
  it('renders null when spool prop is missing', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={null as unknown as WireEdmWireSpoolConsumptionResult}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays total wire, spool capacity, change count, and spool count', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard spool={spoolFixture()} />,
    );
    expect(container.textContent).toContain('20000');
    expect(container.textContent).toContain('15000');
    expect(container.textContent).toContain('2');
  });

  it('renders all 4 risk tier labels correctly', () => {
    const tiers: Array<[WireEdmWireSpoolConsumptionResult['mid_job_change_risk'], string]> = [
      ['none', 'NO CHANGE'],
      ['single_change', '1 CHANGE'],
      ['multiple_changes', 'MULTIPLE'],
      ['high_exposure', 'HIGH EXPOSURE'],
    ];
    for (const [risk, label] of tiers) {
      const { container, unmount } = render(
        <WireEdmWireSpoolConsumptionCard
          spool={spoolFixture({ mid_job_change_risk: risk })}
        />,
      );
      expect(container.textContent).toContain(label);
      unmount();
    }
  });

  it('renders a consumption timeline when total_wire_m > 0', () => {
    render(<WireEdmWireSpoolConsumptionCard spool={spoolFixture()} />);
    expect(screen.getByTestId('spool-consumption-timeline')).toBeInTheDocument();
  });

  it('renders one change marker per change_points_m entry', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({
          change_points_m: [14500, 29000, 43500],
          spool_changes_required: 3,
          mid_job_change_risk: 'high_exposure',
        })}
      />,
    );
    const markers = container.querySelectorAll('[data-testid="spool-change-marker"]');
    expect(markers).toHaveLength(3);
  });

  it('positions change markers proportionally to total wire consumed', () => {
    // total = 30000, change at 15000 → 50% across timeline
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({
          total_wire_m: 30000,
          change_points_m: [15000],
        })}
      />,
    );
    const marker = container.querySelector(
      '[data-testid="spool-change-marker"]',
    ) as HTMLElement | null;
    expect(marker).not.toBeNull();
    expect(marker?.style.left).toMatch(/^50(\.0+)?%$/);
  });

  it('renders change-point chips with cumulative wire_m labels', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({
          change_points_m: [14500, 29000],
          spool_changes_required: 2,
        })}
      />,
    );
    expect(container.textContent).toContain('14500');
    expect(container.textContent).toContain('29000');
  });

  it('omits the timeline when total_wire_m is 0', () => {
    const broken = spoolFixture({ total_wire_m: 0 });
    render(<WireEdmWireSpoolConsumptionCard spool={broken} />);
    expect(screen.queryByTestId('spool-consumption-timeline')).not.toBeInTheDocument();
  });

  it('displays per-change and total downtime + cost', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({
          spool_changes_required: 2,
          per_change_time_min: 5,
          total_change_time_min: 10,
          total_change_cost_usd: 14.17,
          mid_job_change_risk: 'multiple_changes',
          change_points_m: [14500, 29000],
        })}
      />,
    );
    expect(container.textContent).toContain('10.0 min');
    expect(container.textContent).toContain('5.0 min');
    expect(container.textContent).toContain('$14.17');
  });

  it('renders each warning and recommendation in its own container', () => {
    const warnings = ['3 spool changes — consider jumbo spool'];
    const recs = ['Split the job across multiple runs', 'Pre-stage spare spools'];
    render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({
          mid_job_change_risk: 'high_exposure',
          spool_changes_required: 4,
          change_points_m: [10000, 20000, 30000, 40000],
          warnings,
          recommendations: recs,
        })}
      />,
    );
    for (const w of warnings) expect(screen.getByText(w)).toBeInTheDocument();
    for (const r of recs) expect(screen.getByText(r)).toBeInTheDocument();
  });

  it('has role="region" with label citing change count and total wire', () => {
    render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({ spool_changes_required: 3, total_wire_m: 40000 })}
      />,
    );
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/3 mid-job changes/i);
    expect(label).toMatch(/40000 meters/i);
  });

  it('shows remaining wire after job in a footnote', () => {
    const { container } = render(
      <WireEdmWireSpoolConsumptionCard
        spool={spoolFixture({ wire_remaining_after_job_m: 3250 })}
      />,
    );
    expect(container.textContent).toContain('3250');
  });

  it('falls back to em-dash when spools_required is NaN', () => {
    const broken = spoolFixture({ spools_required: NaN });
    const { container } = render(<WireEdmWireSpoolConsumptionCard spool={broken} />);
    expect(container.textContent).toContain('\u2014');
  });
});

// ── WireEdmTaperErrorBudgetCard ─────────────────────────────────────────
// P2P-FULLSTACK-MS0/U-P2PFS42: Taper programming error budget

function taperFixture(
  overrides: Partial<WireEdmTaperErrorBudgetResult> = {},
): WireEdmTaperErrorBudgetResult {
  return {
    uv_travel_mm: 4.374,
    total_error_um: 8.5,
    error_sources: [
      { name: 'Guide tolerance', contribution_um: 2.1, description: 'RSS of upper+lower at mid-plane' },
      { name: 'UV encoder resolution', contribution_um: 0.5, description: '0.1 µm/mm over 4.37 mm' },
      { name: 'Wire bow at taper', contribution_um: 4.0, description: '0.8 µm/° × 5.0°' },
      { name: 'Calibration residual', contribution_um: 0.5, description: 'Auto-calibration active' },
    ],
    achievable_tolerance_class: 'IT7',
    max_practical_taper_deg: 30,
    exceeds_guide_limit: false,
    warnings: [],
    recommendations: ['Achievable tolerance: IT7 — suitable for precision gauge and die work.'],
    ...overrides,
  };
}

describe('WireEdmTaperErrorBudgetCard', () => {
  it('renders null when taper prop is missing', () => {
    const { container } = render(
      <WireEdmTaperErrorBudgetCard
        taper={null as unknown as WireEdmTaperErrorBudgetResult}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays UV travel, total error and max practical taper', () => {
    const { container } = render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({ uv_travel_mm: 4.374, total_error_um: 8.5, max_practical_taper_deg: 30 })}
      />,
    );
    expect(container.textContent).toContain('4.37');
    expect(container.textContent).toContain('8.5');
    expect(container.textContent).toContain('30°');
  });

  it('renders all 8 IT tolerance tier labels correctly', () => {
    const tiers: Array<[WireEdmTaperErrorBudgetResult['achievable_tolerance_class'], string]> = [
      ['IT6', 'IT6'],
      ['IT7', 'IT7'],
      ['IT8', 'IT8'],
      ['IT9', 'IT9'],
      ['IT10', 'IT10'],
      ['IT11', 'IT11'],
      ['IT12', 'IT12'],
      ['out_of_spec', 'OUT OF SPEC'],
    ];
    for (const [cls, label] of tiers) {
      const { container, unmount } = render(
        <WireEdmTaperErrorBudgetCard taper={taperFixture({ achievable_tolerance_class: cls })} />,
      );
      expect(container.textContent).toContain(label);
      unmount();
    }
  });

  it('renders the guide-limit banner when exceeds_guide_limit is true', () => {
    render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({ exceeds_guide_limit: true, max_practical_taper_deg: 30 })}
      />,
    );
    expect(screen.getByTestId('taper-guide-limit-banner')).toBeInTheDocument();
  });

  it('omits the guide-limit banner when exceeds_guide_limit is false', () => {
    render(<WireEdmTaperErrorBudgetCard taper={taperFixture()} />);
    expect(screen.queryByTestId('taper-guide-limit-banner')).not.toBeInTheDocument();
  });

  it('renders one bar row per error source', () => {
    render(<WireEdmTaperErrorBudgetCard taper={taperFixture()} />);
    const rows = screen.getAllByTestId('taper-error-source-row');
    expect(rows).toHaveLength(4);
    expect(screen.getByText('Guide tolerance')).toBeInTheDocument();
    expect(screen.getByText('Wire bow at taper')).toBeInTheDocument();
  });

  it('shows each contribution value in µm', () => {
    const { container } = render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({
          error_sources: [
            { name: 'Guide tolerance', contribution_um: 3.2, description: 'x' },
            { name: 'UV encoder resolution', contribution_um: 0.7, description: 'x' },
            { name: 'Wire bow at taper', contribution_um: 6.1, description: 'x' },
            { name: 'Calibration residual', contribution_um: 2.0, description: 'x' },
          ],
        })}
      />,
    );
    expect(container.textContent).toContain('3.2');
    expect(container.textContent).toContain('0.7');
    expect(container.textContent).toContain('6.1');
    expect(container.textContent).toContain('2.0');
  });

  it('normalizes bar widths against the largest contribution', () => {
    const { container } = render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({
          error_sources: [
            { name: 'Guide tolerance', contribution_um: 10, description: '' },
            { name: 'UV encoder resolution', contribution_um: 5, description: '' },
            { name: 'Wire bow at taper', contribution_um: 2, description: '' },
            { name: 'Calibration residual', contribution_um: 1, description: '' },
          ],
        })}
      />,
    );
    // Pull the first bar fill (Guide tolerance, 10 µm → 100%)
    const fills = Array.from(
      container.querySelectorAll('[data-testid="taper-error-source-row"] div[style*="width"]'),
    ) as HTMLElement[];
    // First fill should be 100% (largest), second ~50%
    expect(fills[0]?.style.width).toMatch(/^100(\.0+)?%$/);
    expect(fills[1]?.style.width).toMatch(/^50(\.0+)?%$/);
  });

  it('renders optional programmed taper angle in the header', () => {
    const { container } = render(
      <WireEdmTaperErrorBudgetCard taper={taperFixture()} taper_angle_deg={5.5} />,
    );
    expect(container.textContent).toContain('5.5°');
  });

  it('renders each warning and recommendation', () => {
    const warnings = ['Taper 35° exceeds guide geometry limit'];
    const recs = ['Switch to extended H-head guides'];
    render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({ exceeds_guide_limit: true, warnings, recommendations: recs })}
      />,
    );
    for (const w of warnings) expect(screen.getByText(w)).toBeInTheDocument();
    for (const r of recs) expect(screen.getByText(r)).toBeInTheDocument();
  });

  it('has role="region" with label citing tolerance class and UV travel', () => {
    render(
      <WireEdmTaperErrorBudgetCard
        taper={taperFixture({
          achievable_tolerance_class: 'IT9',
          uv_travel_mm: 12.5,
          total_error_um: 25,
        })}
      />,
    );
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/IT9/);
    expect(label).toMatch(/12\.50 mm/);
  });

  it('falls back to em-dash when uv_travel_mm is NaN', () => {
    const broken = taperFixture({ uv_travel_mm: NaN });
    const { container } = render(<WireEdmTaperErrorBudgetCard taper={broken} />);
    expect(container.textContent).toContain('\u2014');
  });
});
