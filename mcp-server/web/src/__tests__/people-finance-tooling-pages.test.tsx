import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HRCompliancePage } from '../pages/HRCompliancePage';
import { JobProfitabilityPage } from '../pages/JobProfitabilityPage';
import { ToolingCostPage } from '../pages/ToolingCostPage';
import {
  actualCostMarginAlerts,
  getJobProfitability,
  getToolUsage,
  hrCompensationHistory,
  hrDashboard,
  hrTrainingHistory,
  toolReorderAlerts,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    hrDashboard: vi.fn(),
    hrTrainingHistory: vi.fn(),
    hrCompensationHistory: vi.fn(),
    getJobProfitability: vi.fn(),
    actualCostMarginAlerts: vi.fn(),
    getToolUsage: vi.fn(),
    toolReorderAlerts: vi.fn(),
  };
});

const mockHrDashboard = vi.mocked(hrDashboard);
const mockHrTrainingHistory = vi.mocked(hrTrainingHistory);
const mockHrCompensationHistory = vi.mocked(hrCompensationHistory);
const mockGetJobProfitability = vi.mocked(getJobProfitability);
const mockActualCostMarginAlerts = vi.mocked(actualCostMarginAlerts);
const mockGetToolUsage = vi.mocked(getToolUsage);
const mockToolReorderAlerts = vi.mocked(toolReorderAlerts);

beforeEach(() => {
  mockHrDashboard.mockReset();
  mockHrTrainingHistory.mockReset();
  mockHrCompensationHistory.mockReset();
  mockGetJobProfitability.mockReset();
  mockActualCostMarginAlerts.mockReset();
  mockGetToolUsage.mockReset();
  mockToolReorderAlerts.mockReset();

  mockHrDashboard.mockResolvedValue({
    result: {
      total_enrolled: 28,
      total_employer_benefit_cost: 12400,
      avg_pto_balance: 46,
      training_compliance_pct: 94,
      pending_reviews: 6,
      compliance_alerts: 2,
    },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'hr-dashboard', uncertainty: 0.05 },
  } as any);
});

afterEach(() => {
  cleanup();
});

describe('frontend roadmap people, finance, and tooling pages', () => {
  it('renders the rebuilt HR workspace and loads employee history', async () => {
    mockHrTrainingHistory.mockResolvedValue({
      result: { records: [{ course: 'Lockout/Tagout', status: 'current' }] },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'training-history', uncertainty: 0.06 },
    } as any);
    mockHrCompensationHistory.mockResolvedValue({
      result: { entries: [{ effective_date: '2026-01-01', rate: 32 }] },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'comp-history', uncertainty: 0.06 },
    } as any);

    render(<HRCompliancePage />);

    expect(await screen.findByRole('heading', { name: 'HR Compliance' })).toBeDefined();
    expect(screen.getByText('28')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.change(screen.getByPlaceholderText('EMP-001'), { target: { value: 'EMP-009' } });
    fireEvent.click(screen.getByRole('button', { name: /Load history/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lockout\/Tagout/i)).toBeDefined();
      expect(screen.getByText(/"rate": 32/i)).toBeDefined();
    });
  });

  it('renders the rebuilt profitability workspace and alert lane', async () => {
    mockGetJobProfitability.mockResolvedValue({
      result: {
        profitability: {
          job_id: 'JOB-001',
          customer: 'Acme',
          revenue: 4200,
          total_cost: 3150,
          profit: 1050,
          margin_percent: 25,
          cost_breakdown: [
            { category: 'Material', amount: 1200 },
            { category: 'Labor', amount: 950 },
          ],
        },
        variances: [
          { job_id: 'JOB-001', category: 'Labor', estimated: 800, actual: 950, variance: 150, variance_percent: 18.75 },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-profitability', uncertainty: 0.05 },
    } as any);
    mockActualCostMarginAlerts.mockResolvedValue({
      result: {
        alerts: [
          { job_id: 'JOB-017', customer: 'Orion', current_margin_pct: 8.4, threshold_pct: 15, alert_type: 'below_target', recommendation: 'Review setup time and pricing.' },
        ],
      },
      safety: { score: 0.93, warnings: [] },
      meta: { formula_used: 'margin-alerts', uncertainty: 0.07 },
    } as any);

    render(<JobProfitabilityPage />);

    expect(screen.getByRole('heading', { name: 'Job Profitability' })).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText('JOB-2026-001'), { target: { value: 'JOB-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Analyze job$/i }));

    await waitFor(() => {
      expect(screen.getByText('$4200.00')).toBeDefined();
      expect(screen.getByText('$3150.00')).toBeDefined();
      expect(screen.getByText('+18.8%')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Margin alerts' }));

    await waitFor(() => {
      expect(screen.getByText('JOB-017')).toBeDefined();
      expect(screen.getByText(/Review setup time and pricing/i)).toBeDefined();
    });
  });

  it('renders the rebuilt tooling workspace and reorder board', async () => {
    mockGetToolUsage.mockResolvedValue({
      result: {
        records: [
          { id: 'TU-1', tool_id: 'T-100', tool_name: '1/2 End Mill', job_id: 'JOB-100', operation: 'Finish profile', usage_minutes: 34, wear_percent: 62, cost: 48.5 },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'tool-usage', uncertainty: 0.05 },
    } as any);
    mockToolReorderAlerts.mockResolvedValue({
      result: {
        alerts: [
          { tool_id: 'T-100', tool_name: '1/2 End Mill', current_qty: 1, min_stock: 4, reorder_qty: 6, estimated_cost: 291, urgency: 'high' },
        ],
      },
      safety: { score: 0.92, warnings: [] },
      meta: { formula_used: 'tool-reorders', uncertainty: 0.08 },
    } as any);

    render(<ToolingCostPage />);

    expect(await screen.findByRole('heading', { name: 'Tooling Cost' })).toBeDefined();
    expect(screen.getByText('1/2 End Mill')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Reorders' }));

    await waitFor(() => {
      expect(screen.getAllByText('T-100').length).toBeGreaterThan(0);
      expect(screen.getByText('$291.00')).toBeDefined();
    });
  });
});
