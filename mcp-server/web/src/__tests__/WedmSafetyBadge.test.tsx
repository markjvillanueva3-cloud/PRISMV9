/**
 * WedmSafetyBadge tests
 * P2P-FULLSTACK-MS0 / U-P2PFS44
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmSafetyBadge,
  type WedmSafetyEnvelopeSnapshot,
  type WedmSafetyConstraintState,
} from '../components/wedm/WedmSafetyBadge';

// ── Fixtures ─────────────────────────────────────────────────────────────

function constraint(
  overrides: Partial<WedmSafetyConstraintState> = {},
): WedmSafetyConstraintState {
  return {
    id: 'wire_tension',
    label: 'Wire tension',
    value: 1200,
    unit: 'gf',
    min: 500,
    max: 2000,
    status: 'ok',
    ...overrides,
  };
}

function allSixConstraints(
  overrideStatuses: Partial<Record<WedmSafetyConstraintState['id'], 'ok' | 'warning' | 'critical'>> = {},
): WedmSafetyConstraintState[] {
  const defs: WedmSafetyConstraintState[] = [
    { id: 'wire_tension',  label: 'Wire tension',     value: 1200, unit: 'gf',      min: 500, max: 2000, status: 'ok' },
    { id: 'gap_voltage',   label: 'Spark gap voltage', value: 50,  unit: 'V',       min: 20, max: 80,    status: 'ok' },
    { id: 'resistivity',   label: 'Water resistivity', value: 5.2, unit: 'MΩ·cm',   min: 3,  max: null,  status: 'ok' },
    { id: 'tank_level',    label: 'Tank level',        value: 85,  unit: '%',       min: 40, max: null,  status: 'ok' },
    { id: 'axis_travel',   label: 'Axis travel',       value: 0,   unit: 'mm',      min: -150, max: 150, status: 'ok' },
    { id: 'wire_breaks',   label: 'Wire breaks / window', value: 0, unit: 'count',  min: null, max: 3,   status: 'ok' },
  ];
  return defs.map((c) => ({ ...c, status: overrideStatuses[c.id] ?? c.status }));
}

function snapshot(
  overrides: Partial<WedmSafetyEnvelopeSnapshot> = {},
): WedmSafetyEnvelopeSnapshot {
  return {
    envelopeId: 'JM_DIE_MV2400S',
    constraints: allSixConstraints(),
    sampledAt: '2026-04-19T12:00:00Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('WedmSafetyBadge', () => {
  it('renders null when snapshot is missing', () => {
    const { container } = render(
      <WedmSafetyBadge snapshot={null as unknown as WedmSafetyEnvelopeSnapshot} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all 6 constraint rows in stable order', () => {
    render(<WedmSafetyBadge snapshot={snapshot()} />);
    const rows = screen.getAllByTestId('safety-constraint-row');
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.getAttribute('data-constraint-id'))).toEqual([
      'wire_tension',
      'gap_voltage',
      'resistivity',
      'tank_level',
      'axis_travel',
      'wire_breaks',
    ]);
  });

  it('marks overall severity as the worst across all constraints (critical > warning > ok)', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: allSixConstraints({ gap_voltage: 'warning', wire_breaks: 'critical' }),
        })}
      />,
    );
    const root = container.querySelector('[data-testid="wedm-safety-badge"]');
    expect(root?.getAttribute('data-overall-severity')).toBe('critical');
  });

  it('shows "WITHIN ENVELOPE" pill when all constraints are ok', () => {
    render(<WedmSafetyBadge snapshot={snapshot()} />);
    expect(screen.getByTestId('safety-badge-pill').textContent).toBe('WITHIN ENVELOPE');
    expect(screen.getByTestId('safety-all-ok')).toBeInTheDocument();
  });

  it('shows APPROACHING LIMIT pill when highest severity is warning', () => {
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: allSixConstraints({ wire_tension: 'warning' }),
        })}
      />,
    );
    expect(screen.getByTestId('safety-badge-pill').textContent).toBe('APPROACHING LIMIT');
  });

  it('shows OUT OF SPEC pill when any constraint is critical', () => {
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: allSixConstraints({ tank_level: 'critical' }),
        })}
      />,
    );
    expect(screen.getByTestId('safety-badge-pill').textContent).toBe('OUT OF SPEC');
  });

  it('surfaces critical and warning counters', () => {
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: allSixConstraints({
            wire_tension: 'warning',
            gap_voltage: 'warning',
            tank_level: 'critical',
          }),
        })}
      />,
    );
    expect(screen.getByTestId('safety-critical-count').textContent).toContain('1 critical');
    expect(screen.getByTestId('safety-warning-count').textContent).toContain('2 warning');
  });

  it('renders current value + unit for each constraint', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ value: 1800, unit: 'gf' })],
        })}
      />,
    );
    expect(container.textContent).toContain('1800');
    expect(container.textContent).toContain('gf');
  });

  it('formats limit as "min–max" when both are present', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ min: 500, max: 2000 })],
        })}
      />,
    );
    expect(container.textContent).toMatch(/500.*2000|2000.*500/);
  });

  it('formats limit as "≥ min" when max is null', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ min: 3, max: null })],
        })}
      />,
    );
    expect(container.textContent).toContain('≥ 3');
  });

  it('formats limit as "≤ max" when min is null', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ id: 'wire_breaks', label: 'Wire breaks', value: 0, unit: 'count', min: null, max: 3, status: 'ok' })],
        })}
      />,
    );
    expect(container.textContent).toContain('≤ 3');
  });

  it('surfaces a reason line for non-ok constraints', () => {
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ status: 'warning', reason: 'Approaching low tension band' })],
        })}
      />,
    );
    expect(screen.getByTestId('safety-constraint-reason').textContent).toBe(
      'Approaching low tension band',
    );
  });

  it('does NOT render reason line for ok constraints even if reason string is present', () => {
    // Some telemetry backends may emit a reason for all rows; for ok rows we
    // want the badge clean.
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ status: 'ok', reason: 'stale reason' })],
        })}
      />,
    );
    expect(screen.queryByTestId('safety-constraint-reason')).not.toBeInTheDocument();
  });

  it('omits per-constraint rows in compact mode', () => {
    render(<WedmSafetyBadge snapshot={snapshot()} compact />);
    expect(screen.queryByTestId('safety-constraint-list')).not.toBeInTheDocument();
  });

  it('renders the envelope id in the header', () => {
    const { container } = render(
      <WedmSafetyBadge snapshot={snapshot({ envelopeId: 'CUSTOM_MV2400' })} />,
    );
    expect(container.textContent).toContain('CUSTOM_MV2400');
  });

  it('renders the sampledAt footer when provided', () => {
    const { container } = render(
      <WedmSafetyBadge snapshot={snapshot({ sampledAt: '2026-04-19T08:30:00Z' })} />,
    );
    expect(container.textContent).toContain('2026-04-19T08:30:00Z');
  });

  it('fires onOpenDetails when the details button is clicked', () => {
    const fn = vi.fn();
    render(<WedmSafetyBadge snapshot={snapshot()} onOpenDetails={fn} />);
    fireEvent.click(screen.getByTestId('safety-open-details'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('falls back to em-dash for NaN value readings', () => {
    const { container } = render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: [constraint({ value: NaN })],
        })}
      />,
    );
    expect(container.textContent).toContain('\u2014');
  });

  it('has role="region" with label citing overall severity and counts', () => {
    render(
      <WedmSafetyBadge
        snapshot={snapshot({
          constraints: allSixConstraints({
            wire_tension: 'warning',
            tank_level: 'critical',
          }),
        })}
      />,
    );
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toMatch(/OUT OF SPEC/);
    expect(label).toMatch(/1 critical/);
    expect(label).toMatch(/1 warning/);
  });
});
