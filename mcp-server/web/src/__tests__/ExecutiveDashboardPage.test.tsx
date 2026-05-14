import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ExecutiveDashboardPage } from '../pages/ExecutiveDashboardPage';
import { ApiError, glIncomeStatement, operationsKPIs } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    glIncomeStatement: vi.fn(),
    operationsKPIs: vi.fn(),
  };
});

const mockGlIncomeStatement = vi.mocked(glIncomeStatement);
const mockOperationsKPIs = vi.mocked(operationsKPIs);

beforeEach(() => {
  mockGlIncomeStatement.mockReset();
  mockOperationsKPIs.mockReset();
});

describe('ExecutiveDashboardPage', () => {
  it('fails closed when executive feeds are unavailable', async () => {
    mockGlIncomeStatement.mockRejectedValue(new ApiError(503, 'Ledger offline'));
    mockOperationsKPIs.mockRejectedValue(new ApiError(503, 'Operations offline'));

    render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Executive finance and operations feeds are both unavailable/i)).toBeDefined();
    });

    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText(/Leadership numbers are no longer implied/i)).toBeDefined();
    expect(screen.getAllByText('Ledger offline').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operations offline').length).toBeGreaterThan(0);
  });

  it('renders mounted finance and operations summaries', async () => {
    mockGlIncomeStatement.mockResolvedValue({
      result: {
        total_revenue: 125000,
        total_expenses: 80000,
        net_income: 45000,
      },
    } as any);
    mockOperationsKPIs.mockResolvedValue({
      result: {
        oee_avg_pct: 78.2,
        on_time_delivery_pct: 94.1,
        scrap_rate_pct: 1.8,
        jobs_completed_mtd: 46,
        jobs_in_progress: 12,
        headcount_active: 29,
      },
    } as any);

    render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('$125,000').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('36.0%').length).toBeGreaterThan(0);
    expect(screen.getByText('94.1%')).toBeDefined();
    expect(screen.getByText('29')).toBeDefined();
  });
});
