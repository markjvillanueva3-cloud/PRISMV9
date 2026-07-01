import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToolpathAdvisorPage } from '../pages/ToolpathAdvisorPage';

vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

describe('ToolpathAdvisorPage', () => {
  it('renders the advisor heading and setup controls', () => {
    render(<ToolpathAdvisorPage />);

    expect(screen.getByRole('heading', { name: 'Toolpath Advisor' })).toBeDefined();
    expect(screen.getByLabelText('Feature Type')).toBeDefined();
    expect(screen.getByLabelText('Material Family')).toBeDefined();
    expect(screen.getByLabelText('Machine Axes')).toBeDefined();
    expect(screen.getByLabelText('Planning Priority')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Get Strategies' })).toBeDefined();
  });

  it('shows ranked strategies for the default pocket setup', () => {
    render(<ToolpathAdvisorPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    expect(screen.getByText('#1 Recommended')).toBeDefined();
    expect(screen.getByText('Adaptive Clearing')).toBeDefined();
    expect(screen.getAllByText('Trochoidal Milling').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Contour-Parallel')).toBeDefined();
  });

  it('re-ranks contour strategies when finish quality is prioritized', () => {
    render(<ToolpathAdvisorPage />);

    fireEvent.change(screen.getByLabelText('Feature Type'), {
      target: { value: 'contour' },
    });
    fireEvent.change(screen.getByLabelText('Planning Priority'), {
      target: { value: 'surface_finish' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    const recommendedCard = screen.getAllByText('#1 Recommended')[0].closest('article');
    expect(recommendedCard?.textContent).toContain('High-Speed Contouring');
  });

  it('surfaces single-point threading when the machine posture is lathe', () => {
    render(<ToolpathAdvisorPage />);

    fireEvent.change(screen.getByLabelText('Feature Type'), {
      target: { value: 'threading' },
    });
    fireEvent.change(screen.getByLabelText('Machine Axes'), {
      target: { value: 'lathe' },
    });
    fireEvent.change(screen.getByLabelText('Planning Priority'), {
      target: { value: 'tool_life' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    const recommendedCard = screen.getAllByText('#1 Recommended')[0].closest('article');
    expect(recommendedCard?.textContent).toContain('Single-Point Threading');
  });
});
