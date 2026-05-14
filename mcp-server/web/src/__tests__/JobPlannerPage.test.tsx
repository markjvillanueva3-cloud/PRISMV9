import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JobPlannerPage } from '../pages/JobPlannerPage';
import { ApiError, createJobPlan } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    createJobPlan: vi.fn(),
  };
});

vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

const mockCreateJobPlan = vi.mocked(createJobPlan);

beforeEach(() => {
  mockCreateJobPlan.mockReset();
});

describe('JobPlannerPage', () => {
  it('renders the planner heading and setup controls', () => {
    render(<JobPlannerPage />);

    expect(screen.getByRole('heading', { name: 'Job Planner' })).toBeDefined();
    expect(screen.getByLabelText('Material')).toBeDefined();
    expect(screen.getByLabelText('Part Type')).toBeDefined();
    expect(screen.getByLabelText('Machine')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Generate Plan' })).toBeDefined();
  });

  it('shows loading then renders the returned plan', async () => {
    mockCreateJobPlan.mockResolvedValue({
      result: {
        total_time_min: 37.5,
        operations: [
          {
            sequence: 10,
            type: 'Facing',
            tool: 'Face Mill 63mm',
            speed_rpm: 2200,
            feed_mmrev: 0.22,
            doc_mm: 1.5,
            time_min: 8.5,
          },
          {
            sequence: 20,
            type: 'Pocket Rough',
            tool: 'EM 12mm 5F',
            speed_rpm: 6800,
            feed_mmrev: 0.09,
            doc_mm: 6,
            time_min: 29,
          },
        ],
        safety_score: 0.91,
        gcode_preview: 'G54\nT01 M06\nS2200 M03',
      },
      safety: { score: 0.91, warnings: [] },
      meta: { formula_used: 'job-plan', uncertainty: 0.12 },
    });

    render(<JobPlannerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Plan' }));

    expect(screen.getByText('Generating machining plan...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Facing')).toBeDefined();
    });

    expect(screen.getByText('37.5 min')).toBeDefined();
    expect(screen.getByText('Pocket Rough')).toBeDefined();
    expect(screen.getAllByText('Face Mill 63mm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('G-Code Preview')).toBeDefined();
  });

  it('shows an actionable error state and retries', async () => {
    mockCreateJobPlan
      .mockRejectedValueOnce(new ApiError(500, 'Planner unavailable'))
      .mockResolvedValueOnce({
        result: {
          total_time_min: 12,
          operations: [
            {
              sequence: 10,
              type: 'Contour',
              tool: 'EM 10mm 4F',
              speed_rpm: 5400,
              feed_mmrev: 0.08,
              doc_mm: 2,
              time_min: 12,
            },
          ],
          safety_score: 0.84,
        },
        safety: { score: 0.84, warnings: ['Keep finish allowance stable'] },
        meta: { formula_used: 'job-plan', uncertainty: 0.18 },
      });

    render(<JobPlannerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Plan' }));

    await waitFor(() => {
      expect(screen.getByText('Planner unavailable')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Contour')).toBeDefined();
    });

    expect(mockCreateJobPlan).toHaveBeenCalledTimes(2);
  });
});
