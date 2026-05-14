import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WhatIfPage } from '../pages/WhatIfPage';

vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

describe('WhatIfPage', () => {
  it('renders the scenario lab heading and parameter controls', () => {
    render(<WhatIfPage />);

    expect(screen.getByRole('heading', { name: 'What-If Analysis' })).toBeDefined();
    expect(screen.getByText('Parameter strategy')).toBeDefined();
    expect(screen.getByLabelText('Cutting Speed')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reset to Baseline' })).toBeDefined();
  });

  it('applies a throughput preset and updates the live parameter display', () => {
    render(<WhatIfPage />);

    fireEvent.click(screen.getByRole('button', { name: /Throughput Push/ }));

    expect(screen.getAllByText('Throughput Push').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/285 m\/min/)).toBeDefined();
    expect(screen.getByText(/0.16 mm\/tooth/)).toBeDefined();
  });

  it('switches into custom tuning when the operator moves a slider', () => {
    render(<WhatIfPage />);

    fireEvent.change(screen.getByLabelText('Cutting Speed'), { target: { value: '300' } });

    expect(screen.getAllByText('Custom Tuning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/300 m\/min/)).toBeDefined();
  });

  it('resets the page back to the balanced baseline recipe', () => {
    render(<WhatIfPage />);

    fireEvent.click(screen.getByRole('button', { name: /Throughput Push/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Baseline' }));

    expect(screen.getAllByText('Balanced Baseline').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/200 m\/min/)).toBeDefined();
  });
});
