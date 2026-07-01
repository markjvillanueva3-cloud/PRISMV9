/**
 * Tests for ERP frontend pages batch 3:
 * Jobs, OrderTracking, EmployeeDirectory, Purchasing, MachineRates, BatchPlanning
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/client', () => ({
  ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
  jobDashboard: vi.fn().mockResolvedValue({ result: { total_active: 12, on_schedule: 8, at_risk: 3, overdue: 1, revenue_pipeline: 45000, jobs: [] } }),
  jobCreate: vi.fn().mockResolvedValue({ result: {} }),
  jobUpdateStatus: vi.fn().mockResolvedValue({ result: {} }),
  jobSummary: vi.fn().mockResolvedValue({ result: {} }),
  orderList: vi.fn().mockResolvedValue({ result: [] }),
  orderMetrics: vi.fn().mockResolvedValue({ result: { total_orders: 25, on_time_pct: 92, avg_lead_days: 5, queue_depth: 8, active_work_orders: 6 } }),
  orderMachineQueue: vi.fn().mockResolvedValue({ result: [] }),
  listEmployees: vi.fn().mockResolvedValue({ result: [] }),
  employeeSearch: vi.fn().mockResolvedValue({ result: [] }),
  employeeDeptSummary: vi.fn().mockResolvedValue({ result: [] }),
  purchasingSearch: vi.fn().mockResolvedValue({ result: [] }),
  purchasingRecommend: vi.fn().mockResolvedValue({ result: [] }),
  purchasingSummary: vi.fn().mockResolvedValue({ result: {} }),
  machineRateList: vi.fn().mockResolvedValue({ result: [] }),
  machineRateCompare: vi.fn().mockResolvedValue({ result: [] }),
  batchGroup: vi.fn().mockResolvedValue({ result: [] }),
  batchSequence: vi.fn().mockResolvedValue({ result: {} }),
}));

function renderPage(Component: React.FC) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
}

describe('JobsPage', () => {
  it('renders title and tabs', async () => {
    const { JobsPage } = await import('../pages/JobsPage');
    renderPage(JobsPage);
    expect(screen.getByText('Jobs')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('New Job')).toBeDefined();
  });
});

describe('OrderTrackingPage', () => {
  it('renders title and tabs', async () => {
    const { OrderTrackingPage } = await import('../pages/OrderTrackingPage');
    renderPage(OrderTrackingPage);
    expect(screen.getByText('Order Tracking')).toBeDefined();
    expect(screen.getByText('Orders')).toBeDefined();
    expect(screen.getByText('Machine Queue')).toBeDefined();
    expect(screen.getByText('Metrics')).toBeDefined();
  });
});

describe('EmployeeDirectoryPage', () => {
  it('renders title and search', async () => {
    const { EmployeeDirectoryPage } = await import('../pages/EmployeeDirectoryPage');
    renderPage(EmployeeDirectoryPage);
    expect(screen.getByText('Employee Directory')).toBeDefined();
    expect(screen.getByText('Directory')).toBeDefined();
    expect(screen.getByText('Departments')).toBeDefined();
  });
});

describe('PurchasingPage', () => {
  it('renders title and tabs', async () => {
    const { PurchasingPage } = await import('../pages/PurchasingPage');
    renderPage(PurchasingPage);
    expect(screen.getByText('Purchasing')).toBeDefined();
    expect(screen.getByText('Supplier Search')).toBeDefined();
    expect(screen.getByText('Recommendations')).toBeDefined();
  });
});

describe('MachineRatesPage', () => {
  it('renders title', async () => {
    const { MachineRatesPage } = await import('../pages/MachineRatesPage');
    renderPage(MachineRatesPage);
    expect(screen.getByText('Machine Rates')).toBeDefined();
  });
});

describe('BatchPlanningPage', () => {
  it('renders title and tabs', async () => {
    const { BatchPlanningPage } = await import('../pages/BatchPlanningPage');
    renderPage(BatchPlanningPage);
    expect(screen.getByText('Batch Planning')).toBeDefined();
    expect(screen.getByText('Group Jobs')).toBeDefined();
    expect(screen.getByText('Sequence')).toBeDefined();
  });
});
