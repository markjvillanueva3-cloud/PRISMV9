import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OEEDashboardPage } from '../pages/OEEDashboardPage';
import { analyticsOEE, analyticsOEELosses, analyticsOEETrend, ApiError } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    analyticsOEE: vi.fn(),
    analyticsOEELosses: vi.fn(),
    analyticsOEETrend: vi.fn(),
  };
});

const mockAnalyticsOEE = vi.mocked(analyticsOEE);
const mockAnalyticsOEELosses = vi.mocked(analyticsOEELosses);
const mockAnalyticsOEETrend = vi.mocked(analyticsOEETrend);

beforeEach(() => {
  mockAnalyticsOEE.mockReset();
  mockAnalyticsOEELosses.mockReset();
  mockAnalyticsOEETrend.mockReset();
});

describe('OEEDashboardPage', () => {
  it('fails closed when live feeds are unavailable', async () => {
    mockAnalyticsOEE.mockRejectedValue(new ApiError(503, 'OEE route offline'));
    mockAnalyticsOEELosses.mockResolvedValue({ result: [] } as any);
    mockAnalyticsOEETrend.mockResolvedValue({ result: [] } as any);

    render(<OEEDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Live OEE analytics are currently unavailable/i)).toBeDefined();
    });

    expect(screen.queryByText('67.4%')).toBeNull();
    expect(screen.getByText(/fail-closed/i)).toBeDefined();
    expect(screen.getAllByText('OEE route offline').length).toBeGreaterThan(0);
  });

  it('renders mounted OEE, losses, and trends', async () => {
    mockAnalyticsOEE.mockResolvedValue({
      result: {
        availability_pct: 91.2,
        performance_pct: 84.4,
        quality_pct: 98.1,
        oee_pct: 75.4,
        machines: [
          {
            machine_id: 'VF-2',
            machine_name: 'Haas VF-2',
            availability_pct: 91.2,
            performance_pct: 84.4,
            quality_pct: 98.1,
            oee_pct: 75.4,
            status: 'running',
          },
        ],
      },
    } as any);
    mockAnalyticsOEELosses.mockResolvedValue({
      result: [
        {
          id: 'setup',
          name: 'Setup / Adjustment',
          category: 'availability',
          minutes_lost: 180,
          description: 'Live setup loss from the mounted ERP feed.',
        },
      ],
    } as any);
    mockAnalyticsOEETrend.mockResolvedValue({
      result: [
        {
          date: '2026-04-01',
          availability_pct: 90.1,
          performance_pct: 82.3,
          quality_pct: 97.6,
          oee_pct: 72.5,
        },
      ],
    } as any);

    render(<OEEDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('75.4%').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Machines' }));
    expect(screen.getByText('Haas VF-2')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Losses' }));
    expect(screen.getByText('Setup / Adjustment')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Trends' }));
    expect(screen.getByText('2026-04-01')).toBeDefined();
  });
});
