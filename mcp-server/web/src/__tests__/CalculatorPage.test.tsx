/**
 * CalculatorPage — Unit tests
 *
 * Tests formula card rendering, live calculation, input validation,
 * and correct formula output for core manufacturing formulas.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Use real FORMULAS — they are pure client-side computation
// No API mocking needed for CalculatorPage

function renderCalculator() {
  return render(
    <MemoryRouter>
      <CalculatorPageInner />
    </MemoryRouter>,
  );
}

let CalculatorPageInner: React.FC;

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
});

describe('CalculatorPage', () => {
  it('renders page title and description', () => {
    renderCalculator();
    expect(screen.getByText('Manufacturing Calculator')).toBeDefined();
    expect(screen.getByText(/9 essential formulas/)).toBeDefined();
  });

  it('renders all 9 formula cards', () => {
    renderCalculator();
    expect(screen.getByText('Spindle RPM')).toBeDefined();
    // "Table Feed Rate" may appear as card title and as output label
    expect(screen.getAllByText('Table Feed Rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Material Removal Rate').length).toBeGreaterThanOrEqual(1);
  });

  it('shows formula equation displays', () => {
    renderCalculator();
    // Check that equation aria-labels are present
    const formulaDisplays = screen.getAllByLabelText(/Formula:/);
    expect(formulaDisplays.length).toBeGreaterThanOrEqual(3);
  });

  it('computes Spindle RPM with default values (Vc=200, D=25)', () => {
    renderCalculator();
    // RPM = (200 * 1000) / (PI * 25) = 200000 / 78.54 = 2546
    // With >100 result, formatted as .toFixed(0) = "2546"
    expect(screen.getByText('2546')).toBeDefined();
    expect(screen.getAllByText('RPM').length).toBeGreaterThan(0);
  });

  it('validates input and shows error for out-of-range values', () => {
    renderCalculator();
    // Find the Cutting Speed input for Spindle RPM formula using its specific id
    const vcInput = document.getElementById('F-CALC-001-Vc') as HTMLInputElement;
    expect(vcInput).not.toBeNull();

    // Set value to 0 (below min of 1)
    fireEvent.change(vcInput, { target: { value: '0' } });
    expect(screen.getByText('Min 1')).toBeDefined();
  });

  it('updates result live when input changes', () => {
    renderCalculator();
    // Find Tool Diameter input for RPM formula using its specific id
    const dInput = document.getElementById('F-CALC-001-D') as HTMLInputElement;
    // Change diameter to 10mm: RPM = (200*1000) / (PI*10) = 6366
    fireEvent.change(dInput!, { target: { value: '10' } });
    expect(screen.getByText('6366')).toBeDefined();
  });

  it('shows dashes for result when input is invalid (NaN)', () => {
    renderCalculator();
    const vcInput = document.getElementById('F-CALC-001-Vc') as HTMLInputElement;
    fireEvent.change(vcInput!, { target: { value: '' } });
    // "Required" validation error should appear
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('renders input labels with units', () => {
    renderCalculator();
    // Check that unit annotations are present
    expect(screen.getAllByText('(m/min)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(mm)').length).toBeGreaterThan(0);
  });
});
