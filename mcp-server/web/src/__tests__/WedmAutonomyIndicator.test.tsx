/**
 * WedmAutonomyIndicator tests
 * P2P-FULLSTACK-MS0 / U-P2PFS43
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WedmAutonomyIndicator } from '../components/wedm/WedmAutonomyIndicator';
import type { AutonomyStatusSnapshot, AutonomyLevel } from '../api/wedmCoordination';

function snapshot(
  overrides: Partial<AutonomyStatusSnapshot> = {},
): AutonomyStatusSnapshot {
  return {
    currentLevel: 2,
    levelName: 'Semi-automatic',
    humanRole: 'Reviewer',
    metrics: {
      errorRate: 0.01,
      awarenessAdoption: 0.85,
      silentMinutes: 5,
      blackboardActive: 3,
      bridgeLatencyMs: 120,
      feedbackTotal: 45,
      tipsLearned: 12,
      coordinations: 8,
      lastActivityAt: '2026-04-19T12:00:00Z',
    },
    eligibleForPromotion: true,
    promotionBlockers: [],
    degradeWarnings: [],
    capabilities: {
      suggest_parameters: true,
      auto_adjust_parameters: true,
      execute_job_supervised: false,
      execute_job_unattended: false,
      self_modify_policy: false,
    },
    nextLevelRequirements: {
      maxErrorRate: 0.005,
      minAwarenessAdoption: 0.9,
      maxSilentMinutes: 10,
      minCoordinations: 20,
      sustainedHours: 24,
      requiresCounterSign: false,
    },
    ...overrides,
  };
}

describe('WedmAutonomyIndicator', () => {
  it('renders null when snapshot is missing', () => {
    const { container } = render(
      <WedmAutonomyIndicator
        snapshot={null as unknown as AutonomyStatusSnapshot}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays the level badge with L-prefix', () => {
    render(<WedmAutonomyIndicator snapshot={snapshot({ currentLevel: 3 })} />);
    const badge = screen.getByTestId('autonomy-level-badge');
    expect(badge.textContent).toBe('L3');
  });

  it('renders level name and human role', () => {
    const { container } = render(
      <WedmAutonomyIndicator
        snapshot={snapshot({ levelName: 'Supervised', humanRole: 'Supervisor' })}
      />,
    );
    expect(container.textContent).toContain('Supervised');
    expect(container.textContent).toContain('Supervisor');
  });

  it('applies a distinct data-level attribute for each of the 6 tiers', () => {
    const levels: AutonomyLevel[] = [0, 1, 2, 3, 4, 5];
    for (const lv of levels) {
      const { container, unmount } = render(
        <WedmAutonomyIndicator snapshot={snapshot({ currentLevel: lv })} />,
      );
      const root = container.querySelector('[data-testid="wedm-autonomy-indicator"]');
      expect(root?.getAttribute('data-level')).toBe(String(lv));
      unmount();
    }
  });

  it('renders all 5 capability chips in stable order', () => {
    render(<WedmAutonomyIndicator snapshot={snapshot()} />);
    const chips = screen.getAllByTestId('autonomy-capability-chip');
    expect(chips).toHaveLength(5);
    expect(chips.map((c) => c.getAttribute('data-capability'))).toEqual([
      'suggest_parameters',
      'auto_adjust_parameters',
      'execute_job_supervised',
      'execute_job_unattended',
      'self_modify_policy',
    ]);
  });

  it('marks granted vs ungranted capabilities via data-granted', () => {
    render(<WedmAutonomyIndicator snapshot={snapshot()} />);
    const chips = screen.getAllByTestId('autonomy-capability-chip');
    const granted = chips.filter((c) => c.getAttribute('data-granted') === 'true');
    const denied = chips.filter((c) => c.getAttribute('data-granted') === 'false');
    // Fixture grants 2 of 5.
    expect(granted).toHaveLength(2);
    expect(denied).toHaveLength(3);
  });

  it('shows granted/total summary (e.g. "2/5")', () => {
    const { container } = render(<WedmAutonomyIndicator snapshot={snapshot()} />);
    expect(container.textContent).toContain('2/5');
  });

  it('omits the capability list when variant="compact"', () => {
    render(<WedmAutonomyIndicator snapshot={snapshot()} variant="compact" />);
    expect(screen.queryByTestId('autonomy-capability-list')).not.toBeInTheDocument();
  });

  it('renders the escalation path with next-level requirements', () => {
    const { container } = render(<WedmAutonomyIndicator snapshot={snapshot()} />);
    expect(screen.getByTestId('autonomy-escalation-path')).toBeInTheDocument();
    // 0.005 × 100 = 0.5% error rate
    expect(container.textContent).toContain('0.5%');
    expect(container.textContent).toContain('90.0%'); // awareness adoption
    expect(container.textContent).toContain('10'); // max silent min
  });

  it('shows "Path to L{next}" heading with correct next level', () => {
    const { container } = render(
      <WedmAutonomyIndicator snapshot={snapshot({ currentLevel: 2 })} />,
    );
    expect(container.textContent).toContain('Path to L3');
  });

  it('caps the next-level hint at L5 (no L6 overshoot)', () => {
    const { container } = render(
      <WedmAutonomyIndicator snapshot={snapshot({ currentLevel: 5 })} />,
    );
    // Either there is no escalation (nextLevelRequirements=null) OR the header
    // caps at L5. The fixture still has nextLevelRequirements set, so the
    // heading should read "Path to L5" (min(5+1,5)=5).
    if (screen.queryByTestId('autonomy-escalation-path')) {
      expect(container.textContent).toContain('Path to L5');
    }
  });

  it('renders eligible vs blocked tag based on snapshot.eligibleForPromotion', () => {
    const { container: eligible } = render(
      <WedmAutonomyIndicator snapshot={snapshot({ eligibleForPromotion: true })} />,
    );
    expect(eligible.textContent).toContain('eligible');

    const { container: blocked } = render(
      <WedmAutonomyIndicator
        snapshot={snapshot({
          eligibleForPromotion: false,
          promotionBlockers: ['error rate too high'],
        })}
      />,
    );
    expect(blocked.textContent).toContain('blocked');
    expect(blocked.textContent).toContain('error rate too high');
  });

  it('renders the degrade warning banner when warnings are present', () => {
    render(
      <WedmAutonomyIndicator
        snapshot={snapshot({
          degradeWarnings: ['Bridge latency > 500ms', 'Silent window > 10 min'],
        })}
      />,
    );
    const banner = screen.getByTestId('autonomy-degrade-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('Bridge latency > 500ms');
    expect(banner.textContent).toContain('Silent window > 10 min');
  });

  it('omits the degrade banner when no warnings are present', () => {
    render(<WedmAutonomyIndicator snapshot={snapshot()} />);
    expect(screen.queryByTestId('autonomy-degrade-banner')).not.toBeInTheDocument();
  });

  it('surfaces counter-sign requirement when requiresCounterSign=true', () => {
    const { container } = render(
      <WedmAutonomyIndicator
        snapshot={snapshot({
          nextLevelRequirements: {
            maxErrorRate: 0.001,
            minAwarenessAdoption: 0.95,
            maxSilentMinutes: 5,
            requiresCounterSign: true,
          },
        })}
      />,
    );
    expect(container.textContent?.toLowerCase()).toContain('counter-sign');
  });

  it('renders "no further promotion path" footnote at L5 with no next requirement', () => {
    const { container } = render(
      <WedmAutonomyIndicator
        snapshot={snapshot({ currentLevel: 5, nextLevelRequirements: null })}
      />,
    );
    expect(container.textContent?.toLowerCase()).toMatch(/top-level|no further/i);
  });

  it('fires onOpenDetails callback when the details button is clicked', () => {
    const onOpenDetails = vi.fn();
    render(
      <WedmAutonomyIndicator snapshot={snapshot()} onOpenDetails={onOpenDetails} />,
    );
    fireEvent.click(screen.getByTestId('autonomy-open-details'));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('has role="region" with accessible label citing the level', () => {
    render(
      <WedmAutonomyIndicator
        snapshot={snapshot({
          currentLevel: 3,
          levelName: 'Supervised',
          degradeWarnings: ['bridge down'],
        })}
      />,
    );
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/Level 3/);
    expect(label).toMatch(/Supervised/);
    expect(label).toMatch(/degrade signal active/i);
  });

  it('falls back to "\u2014" em-dash when maxErrorRate is NaN', () => {
    const { container } = render(
      <WedmAutonomyIndicator
        snapshot={snapshot({
          nextLevelRequirements: {
            maxErrorRate: NaN,
            minAwarenessAdoption: 0.9,
            maxSilentMinutes: 10,
          },
        })}
      />,
    );
    expect(container.textContent).toContain('\u2014');
  });
});
