/**
 * WedmKerfCalculator tests
 * P2P-FULLSTACK-MS0 / U-P2PFS47
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmKerfCalculator,
  computeKerf,
  DEFAULT_KERF_K,
  type WedmKerfCalculatorInputs,
} from '../components/wedm/WedmKerfCalculator';

// ── computeKerf (pure function) ─────────────────────────────────────────

describe('computeKerf', () => {
  it('returns valid result for canonical brass/DI inputs', () => {
    const r = computeKerf({ wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 20 });
    expect(r.valid).toBe(true);
    // overcut = 0.015 * sqrt(10 * 20) = 0.015 * sqrt(200) ≈ 0.2121 mm
    expect(r.overcut_mm).toBeCloseTo(0.212, 2);
    // kerf = 0.25 + 2 * 0.212 = 0.674 mm
    expect(r.kerf_mm).toBeCloseTo(0.674, 2);
    // offset = 0.25/2 + 0.212 = 0.337 mm
    expect(r.offset_mm).toBeCloseTo(0.337, 2);
    expect(r.k).toBe(DEFAULT_KERF_K);
  });

  it('is monotonic in peak current (kerf grows with I_p)', () => {
    const base = { wire_diameter_mm: 0.25, pulse_on_us: 20 };
    const lo = computeKerf({ ...base, peak_current_A: 5 });
    const hi = computeKerf({ ...base, peak_current_A: 20 });
    expect(hi.kerf_mm).toBeGreaterThan(lo.kerf_mm);
    expect(hi.overcut_mm).toBeGreaterThan(lo.overcut_mm);
  });

  it('is monotonic in pulse-on time (kerf grows with t_on)', () => {
    const base = { wire_diameter_mm: 0.25, peak_current_A: 10 };
    const lo = computeKerf({ ...base, pulse_on_us: 5 });
    const hi = computeKerf({ ...base, pulse_on_us: 50 });
    expect(hi.kerf_mm).toBeGreaterThan(lo.kerf_mm);
  });

  it('scales kerf linearly with wire diameter when discharge params fixed', () => {
    const a = computeKerf({ wire_diameter_mm: 0.20, peak_current_A: 10, pulse_on_us: 20 });
    const b = computeKerf({ wire_diameter_mm: 0.30, peak_current_A: 10, pulse_on_us: 20 });
    // Kerf difference should equal wire-diameter difference (overcut identical).
    expect(b.kerf_mm - a.kerf_mm).toBeCloseTo(0.1, 3);
    expect(a.overcut_mm).toBeCloseTo(b.overcut_mm, 3);
  });

  it('flags invalid on zero or negative inputs', () => {
    expect(computeKerf({ wire_diameter_mm: 0, peak_current_A: 10, pulse_on_us: 20 }).valid).toBe(false);
    expect(computeKerf({ wire_diameter_mm: 0.25, peak_current_A: -1, pulse_on_us: 20 }).valid).toBe(false);
    expect(computeKerf({ wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 0 }).valid).toBe(false);
  });

  it('flags invalid on NaN / Infinity', () => {
    expect(
      computeKerf({ wire_diameter_mm: NaN, peak_current_A: 10, pulse_on_us: 20 }).valid,
    ).toBe(false);
    expect(
      computeKerf({
        wire_diameter_mm: 0.25,
        peak_current_A: Number.POSITIVE_INFINITY,
        pulse_on_us: 20,
      }).valid,
    ).toBe(false);
  });

  it('honors custom k coefficient', () => {
    const default_ = computeKerf({ wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 20 });
    const tight = computeKerf(
      { wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 20 },
      0.010,
    );
    expect(tight.overcut_mm).toBeLessThan(default_.overcut_mm);
    expect(tight.kerf_mm).toBeLessThan(default_.kerf_mm);
    expect(tight.k).toBe(0.010);
  });

  it('rejects non-positive k', () => {
    const r = computeKerf({ wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 20 }, -0.01);
    expect(r.valid).toBe(false);
  });

  it('results are rounded to 3 decimals', () => {
    const r = computeKerf({ wire_diameter_mm: 0.25, peak_current_A: 10, pulse_on_us: 20 });
    // Round-trip: Number-to-string has at most 3 decimals for millimeter values.
    expect(r.kerf_mm).toBe(Math.round(r.kerf_mm * 1000) / 1000);
    expect(r.overcut_mm).toBe(Math.round(r.overcut_mm * 1000) / 1000);
    expect(r.offset_mm).toBe(Math.round(r.offset_mm * 1000) / 1000);
  });

  it('kerf = diameter + 2 × overcut; offset = diameter/2 + overcut (identity)', () => {
    const inputs = { wire_diameter_mm: 0.30, peak_current_A: 15, pulse_on_us: 30 };
    const r = computeKerf(inputs);
    expect(r.kerf_mm).toBeCloseTo(inputs.wire_diameter_mm + 2 * r.overcut_mm, 3);
    expect(r.offset_mm).toBeCloseTo(inputs.wire_diameter_mm / 2 + r.overcut_mm, 3);
  });
});

// ── WedmKerfCalculator (component) ─────────────────────────────────────

describe('WedmKerfCalculator', () => {
  it('renders with default inputs in uncontrolled mode', () => {
    render(<WedmKerfCalculator />);
    expect(screen.getByTestId('wedm-kerf-calculator')).toBeInTheDocument();
    // Default: 0.25 mm wire, 10 A, 20 µs → kerf ≈ 0.674 mm
    expect(screen.getByTestId('kerf-result-kerf').textContent).toContain('0.674');
  });

  it('marks valid="true" on root when inputs are healthy', () => {
    render(<WedmKerfCalculator />);
    expect(screen.getByTestId('wedm-kerf-calculator').getAttribute('data-valid')).toBe('true');
  });

  it('marks valid="false" + shows amber badge when any input is zero', () => {
    render(<WedmKerfCalculator defaultInputs={{ peak_current_A: 0 }} />);
    expect(screen.getByTestId('wedm-kerf-calculator').getAttribute('data-valid')).toBe('false');
    expect(screen.getByTestId('kerf-invalid-badge')).toBeInTheDocument();
  });

  it('em-dashes readouts when inputs are invalid', () => {
    render(<WedmKerfCalculator defaultInputs={{ wire_diameter_mm: 0 }} />);
    expect(screen.getByTestId('kerf-result-kerf').textContent).toContain('\u2014');
    expect(screen.getByTestId('kerf-result-overcut').textContent).toContain('\u2014');
    expect(screen.getByTestId('kerf-result-offset').textContent).toContain('\u2014');
  });

  it('updates readouts when inputs are edited (uncontrolled)', () => {
    render(<WedmKerfCalculator />);
    const currentInput = screen.getByTestId('kerf-input-peak-current') as HTMLInputElement;
    // Double the peak current — kerf should rise.
    fireEvent.change(currentInput, { target: { value: '40' } });
    const kerfText = screen.getByTestId('kerf-result-kerf').textContent ?? '';
    // overcut = 0.015 * sqrt(40*20) = 0.015 * sqrt(800) ≈ 0.4243; kerf = 0.25 + 2*0.4243 ≈ 1.099
    expect(kerfText).toContain('1.099');
  });

  it('fires onChange in controlled mode and does not self-mutate', () => {
    const fn = vi.fn();
    const controlled: WedmKerfCalculatorInputs = {
      wire_diameter_mm: 0.25,
      peak_current_A: 10,
      pulse_on_us: 20,
    };
    render(<WedmKerfCalculator inputs={controlled} onChange={fn} />);
    const input = screen.getByTestId('kerf-input-pulse-on') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '50' } });
    expect(fn).toHaveBeenCalledTimes(1);
    const [next] = fn.mock.calls[0];
    expect(next.pulse_on_us).toBe(50);
    // Controlled input value didn't change because parent didn't re-render.
    expect(input.value).toBe('20');
  });

  it('honors k_override when positive & finite', () => {
    const { rerender } = render(<WedmKerfCalculator k_override={0.010} />);
    // overcut = 0.010 * sqrt(10*20) ≈ 0.141
    expect(screen.getByTestId('kerf-result-overcut').textContent).toContain('0.141');
    // Rerender with invalid override → falls back to default.
    rerender(<WedmKerfCalculator k_override={-1} />);
    expect(screen.getByTestId('kerf-result-overcut').textContent).toContain('0.212');
  });

  it('exposes kerf value in aria-label for screen readers', () => {
    render(<WedmKerfCalculator />);
    const region = screen.getByRole('region');
    const label = region.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/kerf/i);
    expect(label).toContain('0.674');
  });

  it('displays the k coefficient in the formula footer', () => {
    const { container } = render(<WedmKerfCalculator k_override={0.0123} />);
    expect(container.textContent).toContain('k=0.0123');
  });

  it('tolerates non-numeric text entry by emitting NaN → invalid badge', () => {
    render(<WedmKerfCalculator />);
    const input = screen.getByTestId('kerf-input-wire-dia') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('kerf-invalid-badge')).toBeInTheDocument();
    expect(screen.getByTestId('wedm-kerf-calculator').getAttribute('data-valid')).toBe('false');
  });
});
