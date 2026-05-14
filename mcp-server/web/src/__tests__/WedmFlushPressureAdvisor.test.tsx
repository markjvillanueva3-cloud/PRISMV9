/**
 * WedmFlushPressureAdvisor tests
 * P2P-FULLSTACK-MS0 / U-P2PFS51
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmFlushPressureAdvisor,
  computeFlushPressure,
} from '../components/wedm/WedmFlushPressureAdvisor';

// ── computeFlushPressure (pure) ──────────────────────────────────────────

describe('computeFlushPressure', () => {
  it('returns the steel baseline at 25 mm thickness, 0° taper', () => {
    const r = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 25,
      taper_deg: 0,
    });
    expect(r.valid).toBe(true);
    // base = 5 + 0.4 * 25 = 15 → clamped to 14 by regulator ceiling
    expect(r.base_bar).toBeCloseTo(15, 1);
    expect(r.upper_bar).toBe(14); // ceiling-clamped
    expect(r.lower_bar).toBe(14);
    expect(r.high_taper_flag).toBe(false);
  });

  it('raises upper and reduces lower with increasing taper', () => {
    const flat = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 15, // base = 11 bar, unclamped
      taper_deg: 0,
    });
    const tapered = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 15,
      taper_deg: 10,
    });
    expect(tapered.upper_bar).toBeGreaterThan(flat.upper_bar);
    expect(tapered.lower_bar).toBeLessThan(flat.lower_bar);
  });

  it('applies the material multiplier (WC > steel > graphite)', () => {
    const wc = computeFlushPressure({
      material_group: 'tungsten_carbide',
      thickness_mm: 15,
      taper_deg: 0,
    });
    const steel = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 15,
      taper_deg: 0,
    });
    const graphite = computeFlushPressure({
      material_group: 'graphite',
      thickness_mm: 15,
      taper_deg: 0,
    });
    expect(wc.upper_bar).toBeGreaterThan(steel.upper_bar);
    expect(graphite.upper_bar).toBeLessThan(steel.upper_bar);
    expect(wc.k_mat_upper).toBeCloseTo(1.25, 3);
    expect(graphite.k_mat_upper).toBeCloseTo(0.7, 3);
  });

  it('high_taper_flag asserts above 5° on > 20 mm stock, false otherwise', () => {
    const thickShallow = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 25,
      taper_deg: 3,
    });
    const thickSteep = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 25,
      taper_deg: 7,
    });
    const thinSteep = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 10,
      taper_deg: 10,
    });
    expect(thickShallow.high_taper_flag).toBe(false);
    expect(thickSteep.high_taper_flag).toBe(true);
    expect(thinSteep.high_taper_flag).toBe(false); // below thickness threshold
  });

  it('treats negative taper the same as positive (absolute value)', () => {
    const pos = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 15,
      taper_deg: 8,
    });
    const neg = computeFlushPressure({
      material_group: 'tool_steel',
      thickness_mm: 15,
      taper_deg: -8,
    });
    expect(pos.upper_bar).toBeCloseTo(neg.upper_bar, 3);
    expect(pos.lower_bar).toBeCloseTo(neg.lower_bar, 3);
  });

  it('flags invalid on non-positive thickness or NaN inputs', () => {
    expect(
      computeFlushPressure({ material_group: 'tool_steel', thickness_mm: 0, taper_deg: 0 }).valid,
    ).toBe(false);
    expect(
      computeFlushPressure({ material_group: 'tool_steel', thickness_mm: NaN, taper_deg: 0 }).valid,
    ).toBe(false);
    expect(
      computeFlushPressure({ material_group: 'tool_steel', thickness_mm: 10, taper_deg: NaN }).valid,
    ).toBe(false);
  });

  it('clamps results into the [2, 14] bar regulator envelope', () => {
    // Huge thickness would blow past ceiling.
    const huge = computeFlushPressure({
      material_group: 'superalloy',
      thickness_mm: 200,
      taper_deg: 15,
    });
    expect(huge.upper_bar).toBeLessThanOrEqual(14);
    expect(huge.lower_bar).toBeGreaterThanOrEqual(2);
  });
});

// ── Component ────────────────────────────────────────────────────────────

describe('WedmFlushPressureAdvisor', () => {
  it('renders default uncontrolled state with valid readouts', () => {
    render(<WedmFlushPressureAdvisor />);
    const card = screen.getByTestId('wedm-flush-pressure-advisor');
    expect(card.getAttribute('data-valid')).toBe('true');
    expect(card.getAttribute('data-high-taper')).toBe('false');
  });

  it('shows high-taper badge when thickness > 20 mm and taper > 5°', () => {
    render(
      <WedmFlushPressureAdvisor
        inputs={{ material_group: 'tool_steel', thickness_mm: 30, taper_deg: 8 }}
      />,
    );
    expect(screen.getByTestId('flush-high-taper-badge')).toBeInTheDocument();
    expect(
      screen.getByTestId('wedm-flush-pressure-advisor').getAttribute('data-high-taper'),
    ).toBe('true');
  });

  it('shows invalid badge + em-dash readouts when thickness is zero', () => {
    render(
      <WedmFlushPressureAdvisor
        inputs={{ material_group: 'tool_steel', thickness_mm: 0, taper_deg: 0 }}
      />,
    );
    expect(screen.getByTestId('flush-invalid-badge')).toBeInTheDocument();
    expect(screen.getByTestId('flush-result-upper').textContent).toContain('\u2014');
    expect(screen.getByTestId('flush-result-lower').textContent).toContain('\u2014');
  });

  it('fires onChange in controlled mode when thickness is edited', () => {
    const fn = vi.fn();
    render(
      <WedmFlushPressureAdvisor
        inputs={{ material_group: 'tool_steel', thickness_mm: 25, taper_deg: 0 }}
        onChange={fn}
      />,
    );
    fireEvent.change(screen.getByTestId('flush-input-thickness'), {
      target: { value: '40' },
    });
    expect(fn).toHaveBeenCalledWith({
      material_group: 'tool_steel',
      thickness_mm: 40,
      taper_deg: 0,
    });
  });

  it('fires onChange when material dropdown is changed', () => {
    const fn = vi.fn();
    render(
      <WedmFlushPressureAdvisor
        inputs={{ material_group: 'tool_steel', thickness_mm: 25, taper_deg: 0 }}
        onChange={fn}
      />,
    );
    fireEvent.change(screen.getByTestId('flush-input-material'), {
      target: { value: 'tungsten_carbide' },
    });
    expect(fn).toHaveBeenCalledWith({
      material_group: 'tungsten_carbide',
      thickness_mm: 25,
      taper_deg: 0,
    });
  });

  it('updates internal state + readouts when uncontrolled taper is edited', () => {
    render(
      <WedmFlushPressureAdvisor defaultInputs={{ thickness_mm: 15, taper_deg: 0 }} />,
    );
    const before = screen.getByTestId('flush-result-upper').textContent ?? '';
    fireEvent.change(screen.getByTestId('flush-input-taper'), {
      target: { value: '10' },
    });
    const after = screen.getByTestId('flush-result-upper').textContent ?? '';
    // Taper bias should nudge the upper pressure upward.
    expect(after).not.toBe(before);
  });

  it('aria-label includes upper/lower pressures and mentions taper warning when active', () => {
    render(
      <WedmFlushPressureAdvisor
        inputs={{ material_group: 'tool_steel', thickness_mm: 30, taper_deg: 8 }}
      />,
    );
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toMatch(/upper/i);
    expect(label).toMatch(/lower/i);
    expect(label).toMatch(/high-taper/i);
  });
});
