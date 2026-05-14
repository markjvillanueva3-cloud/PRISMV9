/**
 * WedmPassPlanner tests
 * P2P-FULLSTACK-MS0 / U-P2PFS46
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WedmPassPlanner } from '../components/wedm/WedmPassPlanner';
import type { WireEdmPassDetail } from '../api/wireEdm';

// ── Fixtures ─────────────────────────────────────────────────────────────

function pass(overrides: Partial<WireEdmPassDetail> = {}): WireEdmPassDetail {
  return {
    type: 'rough',
    offset_mm: 0.18,
    energy_pct: 95,
    speed_mm_min: 3.5,
    time_min: 12,
    wire_m: 40,
    predicted_Ra_um: 2.8,
    predicted_recast_um: 6.0,
    t_on_us: 20,
    t_off_us: 4,
    peak_current_A: 12,
    servo_voltage_V: 55,
    wire_speed_m_min: 10,
    power_pct: 90,
    ...overrides,
  };
}

function standardSequence(): WireEdmPassDetail[] {
  return [
    pass({ type: 'rough', offset_mm: 0.18, predicted_Ra_um: 2.8, predicted_recast_um: 6.0, time_min: 12 }),
    pass({ type: 'skim1', offset_mm: 0.08, predicted_Ra_um: 1.4, predicted_recast_um: 3.2, time_min: 5 }),
    pass({ type: 'skim2', offset_mm: 0.04, predicted_Ra_um: 0.8, predicted_recast_um: 1.6, time_min: 3 }),
    pass({ type: 'trim',  offset_mm: 0.01, predicted_Ra_um: 0.6, predicted_recast_um: 0.8, time_min: 2 }),
  ];
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('WedmPassPlanner', () => {
  it('renders an empty placeholder when passes is missing', () => {
    const { container } = render(
      <WedmPassPlanner passes={null as unknown as WireEdmPassDetail[]} />,
    );
    expect(container.textContent).toMatch(/no passes/i);
    expect(screen.getByTestId('wedm-pass-planner-empty')).toBeInTheDocument();
  });

  it('renders an empty placeholder when passes is an empty array', () => {
    render(<WedmPassPlanner passes={[]} />);
    expect(screen.getByTestId('wedm-pass-planner-empty')).toBeInTheDocument();
  });

  it('renders one lane per pass in input order', () => {
    render(<WedmPassPlanner passes={standardSequence()} />);
    const lanes = screen.getAllByTestId('pass-lane');
    expect(lanes).toHaveLength(4);
    expect(lanes.map((l) => l.getAttribute('data-pass-index'))).toEqual(['0', '1', '2', '3']);
  });

  it('classifies pass types via data-pass-type', () => {
    render(<WedmPassPlanner passes={standardSequence()} />);
    const lanes = screen.getAllByTestId('pass-lane');
    expect(lanes[0].getAttribute('data-pass-type')).toBe('rough');
    expect(lanes[1].getAttribute('data-pass-type')).toBe('skim');
    expect(lanes[2].getAttribute('data-pass-type')).toBe('skim');
    expect(lanes[3].getAttribute('data-pass-type')).toBe('trim');
  });

  it('sets flex-grow proportional to pass time_min', () => {
    render(<WedmPassPlanner passes={standardSequence()} />);
    const lanes = screen.getAllByTestId('pass-lane') as HTMLElement[];
    // time values: 12, 5, 3, 2
    expect(lanes[0].style.flex).toMatch(/^12/); // flex-grow=12
    expect(lanes[1].style.flex).toMatch(/^5/);
    expect(lanes[2].style.flex).toMatch(/^3/);
    expect(lanes[3].style.flex).toMatch(/^2/);
  });

  it('shows total time and final-pass Ra in the header', () => {
    render(<WedmPassPlanner passes={standardSequence()} />);
    // total = 22 min
    expect(screen.getByTestId('pass-total-time').textContent).toContain('22.0 min');
    // final Ra = trim pass = 0.60
    expect(screen.getByTestId('pass-final-ra').textContent).toContain('Ra 0.60');
  });

  it('shows per-pass offset + Ra + recast + time inside each lane (full mode)', () => {
    const { container } = render(<WedmPassPlanner passes={[standardSequence()[0]]} />);
    // First pass: offset 0.180 mm, Ra 2.80 µm, recast 6.0 µm, 12.0 min
    expect(container.textContent).toContain('0.180');
    expect(container.textContent).toContain('2.80');
    expect(container.textContent).toContain('6.0');
    expect(container.textContent).toContain('12.0');
  });

  it('omits per-pass inner details in compact mode', () => {
    const { container } = render(
      <WedmPassPlanner passes={[standardSequence()[0]]} compact />,
    );
    // Header total time still present, but inner "ofs" / "rc" details gone
    expect(container.textContent).not.toContain('ofs');
    expect(container.textContent).not.toContain('rc');
  });

  it('falls back to "other" pass type for unrecognized labels', () => {
    render(<WedmPassPlanner passes={[pass({ type: 'mystery' })]} />);
    const lane = screen.getAllByTestId('pass-lane')[0];
    expect(lane.getAttribute('data-pass-type')).toBe('other');
  });

  it('renders Ra spec chip and marks PASS when finalRa ≤ target', () => {
    render(<WedmPassPlanner passes={standardSequence()} target_ra_um={1.0} />);
    const chip = screen.getByTestId('pass-ra-spec');
    expect(chip.getAttribute('data-spec-pass')).toBe('true');
    expect(chip.textContent).toContain('0.60');
    expect(chip.textContent).toContain('1.00');
    expect(chip.textContent).toMatch(/PASS/);
  });

  it('marks Ra spec FAIL when finalRa > target', () => {
    render(<WedmPassPlanner passes={standardSequence()} target_ra_um={0.4} />);
    const chip = screen.getByTestId('pass-ra-spec');
    expect(chip.getAttribute('data-spec-pass')).toBe('false');
    expect(chip.textContent).toMatch(/FAIL/);
  });

  it('renders recast spec chip independently of Ra target', () => {
    render(<WedmPassPlanner passes={standardSequence()} target_recast_um={4.0} />);
    // worst recast = 6.0 across passes, which exceeds 4.0 → FAIL
    const chip = screen.getByTestId('pass-recast-spec');
    expect(chip.getAttribute('data-spec-pass')).toBe('false');
    // Ra chip should NOT render since target_ra_um was not supplied
    expect(screen.queryByTestId('pass-ra-spec')).not.toBeInTheDocument();
  });

  it('sets data-overall-pass="pass" when all active spec gates pass', () => {
    const { container } = render(
      <WedmPassPlanner
        passes={standardSequence()}
        target_ra_um={1.0}
        target_recast_um={10.0}
      />,
    );
    const root = container.querySelector('[data-testid="wedm-pass-planner"]');
    expect(root?.getAttribute('data-overall-pass')).toBe('pass');
  });

  it('sets data-overall-pass="fail" when any active spec gate fails', () => {
    const { container } = render(
      <WedmPassPlanner
        passes={standardSequence()}
        target_ra_um={0.4}
        target_recast_um={10.0}
      />,
    );
    const root = container.querySelector('[data-testid="wedm-pass-planner"]');
    expect(root?.getAttribute('data-overall-pass')).toBe('fail');
  });

  it('sets data-overall-pass="na" when no spec targets are supplied', () => {
    const { container } = render(<WedmPassPlanner passes={standardSequence()} />);
    const root = container.querySelector('[data-testid="wedm-pass-planner"]');
    expect(root?.getAttribute('data-overall-pass')).toBe('na');
    expect(screen.queryByTestId('pass-spec-grid')).not.toBeInTheDocument();
  });

  it('renders aggregate metrics: total passes, worst Ra, worst recast', () => {
    const { container } = render(<WedmPassPlanner passes={standardSequence()} />);
    // worst Ra = 2.80 (rough), worst recast = 6.0 (rough)
    expect(container.textContent).toContain('Total passes:');
    expect(container.textContent).toContain('Worst Ra:');
    expect(container.textContent).toContain('2.80');
    expect(container.textContent).toContain('Worst recast:');
    expect(container.textContent).toContain('6.0');
  });

  it('has role="region" with label citing pass count + total time + final Ra', () => {
    render(<WedmPassPlanner passes={standardSequence()} />);
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toMatch(/4 passes/);
    expect(label).toMatch(/22\.0 min/);
    expect(label).toMatch(/0\.60/);
  });

  it('em-dashes per-pass values when fields are NaN', () => {
    const { container } = render(
      <WedmPassPlanner
        passes={[
          pass({
            type: 'rough',
            offset_mm: NaN,
            predicted_Ra_um: NaN,
            predicted_recast_um: NaN,
            time_min: NaN,
          }),
        ]}
      />,
    );
    // At least one em-dash should appear for the NaN scalars.
    expect(container.textContent).toContain('\u2014');
  });
});
