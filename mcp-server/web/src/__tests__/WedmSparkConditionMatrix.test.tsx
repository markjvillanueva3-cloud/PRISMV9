/**
 * WedmSparkConditionMatrix tests
 * P2P-FULLSTACK-MS0 / U-P2PFS48
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WedmSparkConditionMatrix,
  CANONICAL_SPARK_SIGNATURES,
  type WedmSparkSignatureRow,
} from '../components/wedm/WedmSparkConditionMatrix';

function twoRows(): WedmSparkSignatureRow[] {
  return [
    {
      key: 'D2',
      display_name: 'D2 Cold-Work Tool Steel',
      peak_current_nominal_A: 8,
      pulse_on_nominal_us: 10,
      gap_voltage_nominal_V: 60,
      mrr_factor: 0.95,
      wire_wear_factor: 1.1,
      flags: ['HIGH_CRACK_RISK'],
      debris_colour: 'bluish-white',
    },
    {
      key: 'WC',
      display_name: 'Tungsten Carbide',
      peak_current_nominal_A: 5,
      pulse_on_nominal_us: 6,
      gap_voltage_nominal_V: 80,
      mrr_factor: 0.45,
      wire_wear_factor: 2.0,
      flags: ['SLOW_CUT'],
      debris_colour: 'dark-grey',
    },
  ];
}

describe('WedmSparkConditionMatrix', () => {
  it('seeds all 12 canonical materials in uncontrolled mode by default', () => {
    render(<WedmSparkConditionMatrix />);
    const rows = screen.getAllByTestId('spark-row');
    expect(rows).toHaveLength(12);
    expect(rows.map((r) => r.getAttribute('data-material-key'))).toContain('D2');
    expect(rows.map((r) => r.getAttribute('data-material-key'))).toContain('Inconel_718');
  });

  it('CANONICAL_SPARK_SIGNATURES has all 12 distinct keys', () => {
    const keys = CANONICAL_SPARK_SIGNATURES.map((r) => r.key);
    expect(new Set(keys).size).toBe(12);
  });

  it('renders exactly the rows passed in controlled mode', () => {
    render(<WedmSparkConditionMatrix signatures={twoRows()} />);
    const rows = screen.getAllByTestId('spark-row');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.getAttribute('data-material-key'))).toEqual(['D2', 'WC']);
  });

  it('fires onChange with a full patched signature list on numeric edit', () => {
    const fn = vi.fn();
    render(<WedmSparkConditionMatrix signatures={twoRows()} onChange={fn} />);
    fireEvent.change(screen.getByTestId('spark-input-D2-ip'), { target: { value: '12' } });
    expect(fn).toHaveBeenCalledTimes(1);
    const [next] = fn.mock.calls[0];
    expect(next).toHaveLength(2);
    expect(next[0].peak_current_nominal_A).toBe(12);
    expect(next[1].peak_current_nominal_A).toBe(5); // untouched
  });

  it('mutates internal state in uncontrolled mode (no onChange required)', () => {
    render(<WedmSparkConditionMatrix defaultSignatures={twoRows()} />);
    const ton = screen.getByTestId('spark-input-WC-ton') as HTMLInputElement;
    fireEvent.change(ton, { target: { value: '14' } });
    expect(ton.value).toBe('14');
  });

  it('marks rows invalid when numeric inputs go negative or NaN', () => {
    render(<WedmSparkConditionMatrix defaultSignatures={twoRows()} />);
    fireEvent.change(screen.getByTestId('spark-input-D2-mrr'), { target: { value: '-0.5' } });
    const d2Row = screen.getAllByTestId('spark-row').find(
      (r) => r.getAttribute('data-material-key') === 'D2',
    );
    expect(d2Row?.getAttribute('data-invalid')).toBe('true');
    expect(screen.getByTestId('spark-invalid-chip').textContent).toContain('1 invalid');
    expect(
      screen.getByTestId('wedm-spark-condition-matrix').getAttribute('data-invalid-count'),
    ).toBe('1');
  });

  it('clears invalid state when the edit is reverted', () => {
    render(<WedmSparkConditionMatrix defaultSignatures={twoRows()} />);
    fireEvent.change(screen.getByTestId('spark-input-D2-mrr'), { target: { value: '-1' } });
    expect(screen.queryByTestId('spark-invalid-chip')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('spark-input-D2-mrr'), { target: { value: '0.95' } });
    expect(screen.queryByTestId('spark-invalid-chip')).not.toBeInTheDocument();
  });

  it('reset button restores canonical row values', () => {
    render(<WedmSparkConditionMatrix defaultSignatures={twoRows()} />);
    // Corrupt the D2 row first.
    fireEvent.change(screen.getByTestId('spark-input-D2-ip'), { target: { value: '99' } });
    expect((screen.getByTestId('spark-input-D2-ip') as HTMLInputElement).value).toBe('99');
    fireEvent.click(screen.getByTestId('spark-reset-D2'));
    // Canonical D2 peak current is 8 A.
    expect((screen.getByTestId('spark-input-D2-ip') as HTMLInputElement).value).toBe('8');
  });

  it('highlights the selected row via data-selected=true', () => {
    render(<WedmSparkConditionMatrix signatures={twoRows()} selectedKey="WC" />);
    const wc = screen.getAllByTestId('spark-row').find(
      (r) => r.getAttribute('data-material-key') === 'WC',
    );
    const d2 = screen.getAllByTestId('spark-row').find(
      (r) => r.getAttribute('data-material-key') === 'D2',
    );
    expect(wc?.getAttribute('data-selected')).toBe('true');
    expect(d2?.getAttribute('data-selected')).toBe('false');
  });

  it('fires onSelect when a material name is clicked', () => {
    const fn = vi.fn();
    render(<WedmSparkConditionMatrix signatures={twoRows()} onSelect={fn} />);
    fireEvent.click(screen.getByTestId('spark-select-WC'));
    expect(fn).toHaveBeenCalledWith('WC');
  });

  it('renders risk flags as chips when provided', () => {
    render(<WedmSparkConditionMatrix signatures={twoRows()} />);
    const flagChips = screen.getAllByTestId(/^spark-flag-/);
    expect(flagChips.length).toBeGreaterThan(0);
    // D2 row has HIGH_CRACK_RISK flag.
    const d2Flag = flagChips.find((c) => c.textContent === 'HIGH_CRACK_RISK');
    expect(d2Flag).toBeInTheDocument();
  });

  it('omits the Notes column in compact mode', () => {
    const { container } = render(
      <WedmSparkConditionMatrix signatures={twoRows()} compact />,
    );
    expect(container.textContent).not.toContain('HIGH_CRACK_RISK');
    expect(container.textContent).not.toContain('bluish-white');
  });

  it('ARIA label cites row count and invalid count', () => {
    render(<WedmSparkConditionMatrix signatures={twoRows()} />);
    const label = screen.getByRole('region').getAttribute('aria-label') ?? '';
    expect(label).toMatch(/2 materials/);
    expect(label).toMatch(/0 invalid/);
  });

  it('renders rows with pre-existing NaN fields as invalid', () => {
    const corrupt = twoRows();
    corrupt[0].gap_voltage_nominal_V = NaN;
    render(<WedmSparkConditionMatrix signatures={corrupt} />);
    const d2Row = screen.getAllByTestId('spark-row').find(
      (r) => r.getAttribute('data-material-key') === 'D2',
    );
    expect(d2Row?.getAttribute('data-invalid')).toBe('true');
    expect(
      screen.getByTestId('wedm-spark-condition-matrix').getAttribute('data-invalid-count'),
    ).toBe('1');
  });
});
