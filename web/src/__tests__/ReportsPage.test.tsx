import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReportsPage } from '../pages/ReportsPage';
import {
  reportingDashboard,
  reportingPareto,
  reportingProduction,
  reportingQuality,
  reportingFinancial,
  reportingTrend,
  ApiError,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    reportingDashboard: vi.fn(),
    reportingPareto: vi.fn(),
    reportingProduction: vi.fn(),
    reportingQuality: vi.fn(),
    reportingFinancial: vi.fn(),
    reportingTrend: vi.fn(),
  };
});

const mockReportingDashboard = vi.mocked(reportingDashboard);
const mockReportingPareto = vi.mocked(reportingPareto);
const mockReportingProduction = vi.mocked(reportingProduction);
const mockReportingQuality = vi.mocked(reportingQuality);
const mockReportingFinancial = vi.mocked(reportingFinancial);
const mockReportingTrend = vi.mocked(reportingTrend);

beforeEach(() => {
  mockReportingDashboard.mockReset();
  mockReportingPareto.mockReset();
  mockReportingProduction.mockReset();
  mockReportingQuality.mockReset();
  mockReportingFinancial.mockReset();
  mockReportingTrend.mockReset();
});

describe('ReportsPage', () => {
  it('renders the reporting workspace and main tabs', () => {
    render(<ReportsPage />);

    expect(screen.getByRole('heading', { name: 'Reports' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Report Generator/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Business Reports/i })).toBeDefined();
  });

  it('generates a shop-floor report package', () => {
    render(<ReportsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(screen.getByText('Generated output')).toBeDefined();
    expect(screen.getAllByText('Safety Audit Report').length).toBeGreaterThan(0);
    expect(screen.getByText('Overall Safety Score')).toBeDefined();
  });

  it('runs a business report and renders the returned data', async () => {
    mockReportingDashboard.mockResolvedValue({
      result: { revenue: 125000, margin: 0.24 },
      safety: { score: 0.91, warnings: [] },
      meta: { formula_used: 'dashboard', uncertainty: 0.08 },
    });

    render(<ReportsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Business Reports/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => {
      expect(screen.getByText(/125000/)).toBeDefined();
    });
  });

  it('shows an actionable business error state', async () => {
    mockReportingDashboard.mockRejectedValue(new ApiError(500, 'Dashboard unavailable'));

    render(<ReportsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Business Reports/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard unavailable')).toBeDefined();
    });
  });
});
