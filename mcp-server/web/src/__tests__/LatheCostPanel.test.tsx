// @vitest-environment jsdom
/**
 * LatheCostPanel.test.tsx -- U-LW-COSTPANEL-TEST (slot:whiskey, MISC-007)
 * ============================================================================
 * Value-level test of the per-part turning cost calculator. Reference values are
 * hand-computed from the component's own formulas at the DEFAULT inputs (R9):
 *   partVolume = pi*(50/2000)^2*((60+5)/1000) = 1.27627e-4 m3; weight*7850 = 1.00187 kg
 *   material = *3.5 = 3.5066 -> $3.51 | machine = 180/3600*85 = $4.25
 *   tooling = 2*(12/4)/50 = $0.12 | setup = (30/60)*85/100 = 0.425
 *   overhead = 0.20*(3.5066+4.25+0.12) = 1.5753 -> $1.58
 *   TOTAL = 9.8769 -> $9.88 | batch(100) = $987.69
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LatheCostPanel } from '../components/calculator/LatheCostPanel';

function renderAndCalculate() {
  const utils = render(<LatheCostPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Calculate Cost' }));
  return utils;
}

describe('LatheCostPanel', () => {
  it('renders the input grid and no breakdown before calculating', () => {
    render(<LatheCostPanel />);
    expect(screen.getByRole('button', { name: 'Calculate Cost' })).toBeDefined();
    expect(screen.queryByText('TOTAL PER PART')).toBeNull();
    expect(screen.queryByText('Quantity Pricing')).toBeNull();
  });

  it('computes the default-input reference breakdown: material $3.51, machine $4.25, total $9.88', () => {
    renderAndCalculate();
    expect(screen.getByText('TOTAL PER PART')).toBeDefined();
    expect(screen.getByText('$3.51')).toBeDefined(); // material (cylinder + 5mm allowance, 7850 kg/m3)
    expect(screen.getByText('$4.25')).toBeDefined(); // machine time 180s @ $85/hr
    // total appears TWICE by construction: the per-part total AND the qty-100 pricing tile
    // (setup amortization cancels exactly when qty === batchSize) -- pin both
    expect(screen.getAllByText('$9.88')).toHaveLength(2);
  });

  it('overhead line is 20% of direct cost ($1.58 at defaults)', () => {
    renderAndCalculate();
    expect(screen.getByText('Overhead (20%)')).toBeDefined();
    expect(screen.getByText('$1.58')).toBeDefined(); // 0.20 * (3.5066+4.25+0.12)
  });

  it('batch total = unrounded per-part total x batch size ($987.69 for 100)', () => {
    renderAndCalculate();
    expect(screen.getByText('Batch of 100')).toBeDefined();
    expect(screen.getByText('$987.69')).toBeDefined(); // 9.87686 * 100, NOT 9.88*100=988.00
  });

  it('renders all 7 quantity-pricing tiles (1..1000)', () => {
    renderAndCalculate();
    expect(screen.getByText('Quantity Pricing')).toBeDefined();
    expect(screen.getByText('1 pc')).toBeDefined();
    for (const qty of [10, 25, 50, 100, 500, 1000]) {
      expect(screen.getByText(`${qty} pcs`)).toBeDefined();
    }
  });

  it('SENSITIVITY: doubling the machine rate to $170/hr doubles machine time cost and lifts total to $15.40', () => {
    render(<LatheCostPanel />);
    // machine-rate input is the only one displaying 85
    fireEvent.change(screen.getByDisplayValue('85'), { target: { value: '170' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Cost' }));
    expect(screen.getByText('$8.50')).toBeDefined(); // 180/3600 * 170
    // total = (3.5066+8.5+0.12)*1.2 + (30/60)*170/100 = 14.552 + 0.85 = 15.402
    // (also appears in the qty-100 tile -- amortization cancels at qty === batchSize)
    expect(screen.getAllByText('$15.40').length).toBeGreaterThanOrEqual(1);
  });

  it('SECONDARY OPS: $10/part flows into direct cost AND its 20% overhead (total $21.88)', () => {
    render(<LatheCostPanel />);
    // secondary-ops input is the only one displaying 0
    fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Cost' }));
    expect(screen.getByText('$10.00')).toBeDefined(); // secondary ops line
    expect(screen.getByText('$3.58')).toBeDefined(); // overhead = 0.20*(3.5066+4.25+0.12+10)
    expect(screen.getAllByText('$21.88').length).toBeGreaterThanOrEqual(1); // 17.87655*1.2 + 0.425 (also qty-100 tile)
  });

  it('BOUNDARY: zero setup minutes removes the amortized setup from the total ($9.45)', () => {
    render(<LatheCostPanel />);
    // setup-minutes input is the only one displaying 30
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Cost' }));
    expect(screen.getAllByText('$9.45').length).toBeGreaterThanOrEqual(1); // 9.87686 - 0.425 setup (also qty tiles)
  });
});
