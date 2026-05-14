/**
 * WedmTribalTipCard tests
 * P2P-FULLSTACK-MS0 / U-P2PFS49
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmTribalTipCard,
  confidenceTier,
  type WedmTribalTip,
  type WedmScoredTribalTip,
} from '../components/wedm/WedmTribalTipCard';

function bareTip(overrides: Partial<WedmTribalTip> = {}): WedmTribalTip {
  return {
    id: 'tip-001',
    title: 'Lead with a skim pass on thin walls',
    body: 'When cutting walls under 2 mm, lead with a skim pass at 60% energy before the rough pass — the thin wall flexes into the cut and eats kerf otherwise.',
    category: 'thin_wall',
    tags: ['thin_wall', 'skim', 'rough'],
    operation_types: ['rough', 'skim'],
    confidence: 0.82,
    source: 'JM_DIE_OPERATOR_FLOOR',
    created_at: '2025-08-11',
    usage_count: 17,
    ...overrides,
  };
}

function scored(overrides: Partial<WedmScoredTribalTip> = {}): WedmScoredTribalTip {
  return {
    tip: bareTip(),
    score: 3.42,
    matchedKeywords: ['thin', 'wall'],
    matchedTags: ['thin_wall'],
    ...overrides,
  };
}

// ── confidenceTier (pure) ────────────────────────────────────────────────

describe('confidenceTier', () => {
  it('maps the four bands correctly', () => {
    expect(confidenceTier(0.95)).toBe('expert');
    expect(confidenceTier(0.7)).toBe('high');
    expect(confidenceTier(0.5)).toBe('medium');
    expect(confidenceTier(0.2)).toBe('low');
  });

  it('clamps non-finite/out-of-range confidence to "low"', () => {
    expect(confidenceTier(Number.NaN)).toBe('low');
    expect(confidenceTier(-1)).toBe('low');
  });

  it('clamps confidence > 1 down to expert (not past it)', () => {
    expect(confidenceTier(5)).toBe('expert');
  });
});

// ── Component ────────────────────────────────────────────────────────────

describe('WedmTribalTipCard', () => {
  it('renders an empty placeholder when no tip provided', () => {
    render(<WedmTribalTipCard />);
    expect(screen.getByTestId('wedm-tribal-tip-empty')).toBeInTheDocument();
  });

  it('renders a bare tip (no match metadata → no match-score pill)', () => {
    render(<WedmTribalTipCard tip={bareTip()} />);
    expect(screen.getByTestId('tribal-tip-title').textContent).toContain('skim pass on thin walls');
    expect(screen.queryByTestId('tribal-match-score-pill')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('wedm-tribal-tip-card').getAttribute('data-has-match-metadata'),
    ).toBe('false');
  });

  it('renders a scored tip (match-score pill + matched-keywords row + matched-tag highlight)', () => {
    render(<WedmTribalTipCard scored={scored()} />);
    expect(screen.getByTestId('tribal-match-score-pill').textContent).toMatch(/3\.42/);
    expect(screen.getByTestId('tribal-matched-keywords').textContent).toContain('thin');
    expect(
      screen.getByTestId('tribal-tag-thin_wall').getAttribute('data-matched'),
    ).toBe('true');
    expect(
      screen.getByTestId('tribal-tag-skim').getAttribute('data-matched'),
    ).toBe('false');
  });

  it('sets data-confidence-tier from the tip confidence', () => {
    render(<WedmTribalTipCard tip={bareTip({ confidence: 0.92 })} />);
    expect(
      screen.getByTestId('wedm-tribal-tip-card').getAttribute('data-confidence-tier'),
    ).toBe('expert');
  });

  it('confidence pill shows rounded percent', () => {
    render(<WedmTribalTipCard tip={bareTip({ confidence: 0.827 })} />);
    const pill = screen.getByTestId('tribal-confidence-pill');
    expect(pill.getAttribute('data-confidence-pct')).toBe('83');
    expect(pill.textContent).toContain('83%');
    expect(pill.textContent?.toLowerCase()).toContain('high');
  });

  it('renders source + created_at + usage count in attribution row', () => {
    render(<WedmTribalTipCard tip={bareTip()} />);
    const src = screen.getByTestId('tribal-source-attribution');
    expect(src.textContent).toContain('JM_DIE_OPERATOR_FLOOR');
    expect(src.textContent).toContain('2025-08-11');
    expect(src.textContent).toMatch(/17/);
  });

  it('fires onFeedback with tipId + feedback kind', () => {
    const fn = vi.fn();
    render(<WedmTribalTipCard scored={scored()} onFeedback={fn} />);
    fireEvent.click(screen.getByTestId('tribal-helpful'));
    fireEvent.click(screen.getByTestId('tribal-not-helpful'));
    expect(fn).toHaveBeenNthCalledWith(1, 'tip-001', 'helpful');
    expect(fn).toHaveBeenNthCalledWith(2, 'tip-001', 'not_helpful');
  });

  it('fires onOpenMore when "More" button is clicked', () => {
    const fn = vi.fn();
    render(<WedmTribalTipCard scored={scored()} onOpenMore={fn} />);
    fireEvent.click(screen.getByTestId('tribal-open-more'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hides body + attribution row in compact mode', () => {
    const { container } = render(<WedmTribalTipCard tip={bareTip()} compact />);
    expect(screen.queryByTestId('tribal-tip-body')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tribal-source-attribution')).not.toBeInTheDocument();
    // But title + confidence pill still render.
    expect(container.textContent).toContain('skim pass on thin walls');
  });

  it('prefers scored.tip when both scored and tip are passed', () => {
    const s = scored({ tip: bareTip({ title: 'From scored wrapper' }) });
    const bare = bareTip({ title: 'Bare tip title' });
    render(<WedmTribalTipCard scored={s} tip={bare} />);
    expect(screen.getByTestId('tribal-tip-title').textContent).toBe('From scored wrapper');
  });

  it('ARIA label cites title + confidence + category', () => {
    render(<WedmTribalTipCard tip={bareTip()} />);
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toContain('skim pass on thin walls');
    expect(label).toContain('82%');
    expect(label).toContain('thin_wall');
  });

  it('handles missing tags gracefully (no tag row rendered)', () => {
    render(<WedmTribalTipCard tip={bareTip({ tags: [] })} />);
    expect(screen.queryByTestId('tribal-tag-row')).not.toBeInTheDocument();
  });
});
