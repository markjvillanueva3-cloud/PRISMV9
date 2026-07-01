import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedSpeedFeedPanel from '../components/sfc/AdvancedSpeedFeedPanel';
import type { MaterialEntry } from '../data/materials';
import type { OperationType } from '../data/operations';
import type { SfcParams } from '../components/sfc/ParameterPanel';

// Control the orchestrate hook; the normalize/classify contract + the params
// mapper run for REAL (round-trip), so the rendered numbers are derived from a
// realistic orchestrate response, not stubbed.
const h = vi.hoisted(() => ({
  state: { data: null as unknown, loading: false, error: null as string | null, execute: vi.fn(), reset: vi.fn() },
}));

vi.mock('../hooks/useSpeedFeed', () => ({
  useSpeedFeedOrchestrate: () => h.state,
}));

const material: MaterialEntry = {
  id: '4140', name: '4140 Steel', group: 'P', groupLabel: 'Steel (P)',
  hardness: 200, tensileStrength: 655, machinability: 70,
};
const operation: OperationType = {
  id: 'face_milling', label: 'Face Milling', category: 'milling', icon: 'x',
  defaults: { tool_diameter: 12, number_of_teeth: 4, depth: 2, width: 6, tool_material: 'Carbide', coolant: 'flood' },
};
const params: SfcParams = {
  tool_diameter: 12, number_of_teeth: 4, depth: 2, width: 6, tool_material: 'Carbide', coolant: 'flood',
};

const SOLVE_RESPONSE = {
  result: {
    value: {
      spindle_rpm: 3200,
      cutting_speed_mpm: 120,
      feed_rate_mmmin: 800,
      feed_per_tooth_mm: 0.0625,
      mrr_cm3min: 18,
      power_kw: 4.2,
      tool_life_min: 45,
      surface_finish_Ra_um: 0.8,
      overall_confidence: 0.86,
      limiting_factors: [{ parameter: 'spindle_power', severity: 'warning', constraint: 'near 90% load' }],
      engines_called: ['SpeedFeedOrchestratorEngine'],
    },
  },
};

beforeEach(() => {
  h.state = { data: null, loading: false, error: null, execute: vi.fn(), reset: vi.fn() };
});

describe('AdvancedSpeedFeedPanel', () => {
  it('disables the solve until a material + operation are selected', () => {
    render(<AdvancedSpeedFeedPanel material={null} operation={null} tool={null} params={params} />);
    const btn = screen.getByRole('button', { name: /Run 9-Axis Solve/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/Select a material and operation/i).textContent ?? '').toContain('orchestrated solve');
  });

  it('enables the solve and calls execute with mapped params when ready', () => {
    render(<AdvancedSpeedFeedPanel material={material} operation={operation} tool={null} params={params} />);
    const btn = screen.getByRole('button', { name: /Run 9-Axis Solve/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(h.state.execute).toHaveBeenCalledTimes(1);
    const sent = h.state.execute.mock.calls[0][0];
    expect(sent.material).toBe('4140 Steel');
    expect(sent.operation).toBe('face_milling');
    expect(sent.iso_group).toBe('P');
    expect(sent.output_detail).toBe('full');
  });

  it('renders metrics + confidence + advisory from a real orchestrate response (round-trip)', () => {
    h.state = { ...h.state, data: SOLVE_RESPONSE };
    render(<AdvancedSpeedFeedPanel material={material} operation={operation} tool={null} params={params} />);
    // RPM metric value (decimals 0) rendered in the monospace metric cell.
    const rpm = screen.getByText('3200');
    expect(rpm.className).toContain('font-mono');
    // Confidence comes from overall_confidence 0.86 -> 86% (classify contract).
    expect(screen.getByText(/Confidence/).textContent ?? '').toContain('86%');
    // Limiting factor surfaced as the advisory (parameter: constraint). The
    // normalizer lists it under both limitingFactors + warnings, so >=1 hit.
    const advisories = screen.getAllByText(/spindle_power/);
    expect(advisories.length).toBeGreaterThan(0);
    expect(advisories[0].textContent ?? '').toContain('near 90% load');
  });

  it('shows a busy state while solving', () => {
    h.state = { ...h.state, loading: true };
    render(<AdvancedSpeedFeedPanel material={material} operation={operation} tool={null} params={params} />);
    const btn = screen.getByRole('button', { name: /Solving/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('surfaces a solve error', () => {
    h.state = { ...h.state, error: 'spindle power exceeded' };
    render(<AdvancedSpeedFeedPanel material={material} operation={operation} tool={null} params={params} />);
    expect(screen.getByRole('alert').textContent ?? '').toContain('spindle power exceeded');
  });
});
