/**
 * ERP Frontend Pages — Unit tests
 * Tests rendering, user interactions, and API call wiring for all 6 ERP pages.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShopFloorClockPage } from '../pages/ShopFloorClockPage';
import { TimecardPage } from '../pages/TimecardPage';
import { PayrollPage } from '../pages/PayrollPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { JobProfitabilityPage } from '../pages/JobProfitabilityPage';
import { ToolingCostPage } from '../pages/ToolingCostPage';

// Mock API client
vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  listEmployees: vi.fn().mockResolvedValue({
    result: {
      employees: [
        { id: 'EMP-001', first_name: 'John', last_name: 'Doe', department: 'Machining', role: 'Operator', status: 'active', labor_rates: { regular: 35, overtime: 52.5, double_time: 70 }, skills: ['CNC'], certifications: [], hire_date: '2020-01-01' },
        { id: 'EMP-002', first_name: 'Jane', last_name: 'Smith', department: 'QC', role: 'Inspector', status: 'active', labor_rates: { regular: 40, overtime: 60, double_time: 80 }, skills: ['CMM'], certifications: [], hire_date: '2019-06-15' },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  shiftClockIn: vi.fn().mockResolvedValue({
    result: { id: 'S-001', employee_id: 'EMP-001', shift_start: '2026-03-06T08:00:00', status: 'clocked_in', breaks: [] },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  shiftClockOut: vi.fn().mockResolvedValue({
    result: { id: 'S-001', employee_id: 'EMP-001', shift_start: '2026-03-06T08:00:00', shift_end: '2026-03-06T16:30:00', status: 'clocked_out', breaks: [], total_hours: 8.5, overtime_hours: 0.5 },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  jobTimeStart: vi.fn().mockResolvedValue({
    result: { id: 'JT-001', employee_id: 'EMP-001', job_id: 'JOB-001', start_time: '2026-03-06T08:05:00', status: 'running' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  jobTimePause: vi.fn().mockResolvedValue({
    result: { id: 'JT-001', employee_id: 'EMP-001', job_id: 'JOB-001', status: 'paused' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  jobTimeResume: vi.fn().mockResolvedValue({
    result: { id: 'JT-001', employee_id: 'EMP-001', job_id: 'JOB-001', status: 'running', start_time: '2026-03-06T08:05:00' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  jobTimeStop: vi.fn().mockResolvedValue({
    result: { id: 'JT-001', employee_id: 'EMP-001', job_id: 'JOB-001', status: 'completed', elapsed_hours: 2.5, labor_cost: 87.5 },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  whoClockedIn: vi.fn().mockResolvedValue({
    result: [],
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getActiveJobs: vi.fn().mockResolvedValue({
    result: [],
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getShiftHandoff: vi.fn().mockResolvedValue({
    result: { carried_jobs: [] },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getTimecard: vi.fn().mockResolvedValue({
    result: {
      employee_id: 'EMP-001', employee_name: 'John Doe',
      period_start: '2026-03-01', period_end: '2026-03-07',
      regular_hours: 40, overtime_hours: 2.5, double_time_hours: 0, total_hours: 42.5,
      jobs: [
        { job_id: 'JOB-001', hours: 24, cost: 840 },
        { job_id: 'JOB-002', hours: 18.5, cost: 647.5 },
      ],
      status: 'submitted',
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getTimecardAuditLog: vi.fn().mockResolvedValue({
    result: { records: [] },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  updateTimecardStatus: vi.fn().mockResolvedValue({
    result: { ok: true },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  createPayrollPeriod: vi.fn().mockResolvedValue({
    result: {
      id: 'PP-001',
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      pay_date: '2026-04-07',
      status: 'open',
      type: 'monthly',
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  runPayroll: vi.fn().mockResolvedValue({
    result: {
      period_id: 'PP-001',
      stubs: [
        { employee_id: 'EMP-001', employee_name: 'John Doe', period: '2026-03', regular_hours: 80, overtime_hours: 5, gross_pay: 3062.5, deductions: [{ type: 'Federal Tax', amount: 459.38 }, { type: 'State Tax', amount: 153.13 }], net_pay: 2450 },
        { employee_id: 'EMP-002', employee_name: 'Jane Smith', period: '2026-03', regular_hours: 80, overtime_hours: 0, gross_pay: 3200, deductions: [{ type: 'Federal Tax', amount: 480 }, { type: 'State Tax', amount: 160 }], net_pay: 2560 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  createInvoice: vi.fn().mockResolvedValue({
    result: { id: 'INV-001', job_id: 'JOB-001', status: 'draft' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  listInvoices: vi.fn().mockResolvedValue({
    result: {
      invoices: [
        { id: 'INV-001', job_id: 'JOB-001', customer_name: 'Acme Corp', date: '2026-03-01', due_date: '2026-03-31', line_items: [], subtotal: 5000, tax: 400, total: 5400, status: 'sent', payments: [], balance_due: 5400 },
        { id: 'INV-002', job_id: 'JOB-002', customer_name: 'Widget Inc', date: '2026-02-15', due_date: '2026-03-15', line_items: [], subtotal: 3000, tax: 240, total: 3240, status: 'paid', payments: [{ date: '2026-03-10', amount: 3240, method: 'check' }], balance_due: 0 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getJobProfitability: vi.fn().mockResolvedValue({
    result: {
      profitability: { job_id: 'JOB-001', customer: 'Acme Corp', revenue: 5400, total_cost: 3200, profit: 2200, margin_percent: 40.7, cost_breakdown: [{ category: 'Labor', amount: 1800 }, { category: 'Material', amount: 800 }, { category: 'Tooling', amount: 400 }, { category: 'Overhead', amount: 200 }] },
      variances: [
        { job_id: 'JOB-001', category: 'Labor', estimated: 1600, actual: 1800, variance: 200, variance_percent: 12.5 },
        { job_id: 'JOB-001', category: 'Material', estimated: 850, actual: 800, variance: -50, variance_percent: -5.9 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  getToolUsage: vi.fn().mockResolvedValue({
    result: {
      records: [
        { id: 'TU-001', tool_id: 'T-001', tool_name: '12mm Carbide End Mill', job_id: 'JOB-001', operation: 'Roughing', usage_minutes: 45, wear_percent: 35, cost: 12.5 },
        { id: 'TU-002', tool_id: 'T-002', tool_name: '6mm Ball Nose', job_id: 'JOB-001', operation: 'Finishing', usage_minutes: 90, wear_percent: 85, cost: 28.0 },
        { id: 'TU-003', tool_id: 'T-003', tool_name: '20mm Face Mill', job_id: 'JOB-002', operation: 'Facing', usage_minutes: 15, wear_percent: 12, cost: 5.0 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  toolReorderAlerts: vi.fn().mockResolvedValue({
    result: {
      alerts: [
        { tool_id: 'T-002', tool_name: '6mm Ball Nose', current_stock: 1, reorder_point: 2, reorder_qty: 5, estimated_cost: 140 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  actualCostMarginAlerts: vi.fn().mockResolvedValue({
    result: {
      alerts: [
        { job_id: 'JOB-001', customer: 'Acme Corp', current_margin_pct: 12.1, threshold_pct: 15, alert_type: 'low_margin', recommendation: 'Review labor overrun before next release.' },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  financialBreakeven: vi.fn().mockResolvedValue({
    result: {
      breakeven_units: 125,
      breakeven_revenue: 25000,
      margin_of_safety_pct: 18.4,
      contribution_margin: 200,
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
}));

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// --- ShopFloorClockPage ---
describe('ShopFloorClockPage', () => {
  it('renders title and employee selector', async () => {
    wrap(<ShopFloorClockPage />);
    expect(screen.getByText('Shop Floor Clock')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeDefined();
    });
  });

  it('shows clock in button after selecting employee', async () => {
    wrap(<ShopFloorClockPage />);
    await waitFor(() => screen.getByText(/John Doe/));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    expect(screen.getByText('CLOCK IN')).toBeDefined();
  });

  it('shows timer display with 00:00:00 format', async () => {
    wrap(<ShopFloorClockPage />);
    await waitFor(() => screen.getByText(/John Doe/));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    // Clock in first
    fireEvent.click(screen.getByText('CLOCK IN'));
    await waitFor(() => screen.getByText('CLOCK OUT'));
    expect(screen.getByText('00:00:00')).toBeDefined();
  });
});

// --- TimecardPage ---
describe('TimecardPage', () => {
  it('renders title and date pickers', async () => {
    wrap(<TimecardPage />);
    expect(screen.getByText('Timecards')).toBeDefined();
    expect(screen.getByLabelText(/Period start/i)).toBeDefined();
    expect(screen.getByLabelText(/Period end/i)).toBeDefined();
  });

  it('loads timecard with job breakdown', async () => {
    wrap(<TimecardPage />);
    await waitFor(() => screen.getByText(/John Doe/));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Load timecard/i }));
    await waitFor(() => {
      expect(screen.getAllByText('42.5h').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/submitted/i).length).toBeGreaterThan(0);
      expect(screen.getByText('JOB-001')).toBeDefined();
    });
  });
});

// --- PayrollPage ---
describe('PayrollPage', () => {
  it('renders title and period inputs', () => {
    wrap(<PayrollPage />);
    expect(screen.getByText('Payroll')).toBeDefined();
    expect(screen.getByLabelText(/Period start/i)).toBeDefined();
    expect(screen.getByLabelText(/Period end/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Run payroll/i })).toBeDefined();
  });

  it('runs payroll and shows stubs', async () => {
    wrap(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /Run payroll/i }));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });
  });
});

// --- InvoicesPage ---
describe('InvoicesPage', () => {
  it('renders title and loads invoices', async () => {
    wrap(<InvoicesPage />);
    expect(screen.getByText('Invoices')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeDefined();
      expect(screen.getByText('SENT')).toBeDefined();
      expect(screen.getByText('PAID')).toBeDefined();
    });
  });

  it('shows outstanding balance', async () => {
    wrap(<InvoicesPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/5400\.00/).length).toBeGreaterThan(0);
    });
  });

  it('toggles create invoice form', () => {
    wrap(<InvoicesPage />);
    fireEvent.click(screen.getByRole('button', { name: /New Invoice/i }));
    expect(screen.getByLabelText(/Job ID/i)).toBeDefined();
    expect(screen.getByLabelText(/Markup/i)).toBeDefined();
    expect(screen.getAllByText(/Create invoice/i).length).toBeGreaterThan(0);
  });
});

// --- JobProfitabilityPage ---
describe('JobProfitabilityPage', () => {
  it('renders title and job input', () => {
    wrap(<JobProfitabilityPage />);
    expect(screen.getByText('Job Profitability')).toBeDefined();
    expect(screen.getByLabelText('Job ID')).toBeDefined();
  });

  it('analyzes profitability and shows variance', async () => {
    wrap(<JobProfitabilityPage />);
    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'JOB-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Analyze job$/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/5400\.00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/40\.7%/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Labor').length).toBeGreaterThan(0);
    });
  });
});

// --- ToolingCostPage ---
describe('ToolingCostPage', () => {
  it('renders title and loads usage data', async () => {
    wrap(<ToolingCostPage />);
    expect(screen.getByText('Tooling Cost')).toBeDefined();
    await waitFor(() => {
      expect(screen.getAllByText('12mm Carbide End Mill').length).toBeGreaterThan(0);
      expect(screen.getAllByText('6mm Ball Nose').length).toBeGreaterThan(0);
    });
  });

  it('shows reorder alerts for high wear tools', async () => {
    wrap(<ToolingCostPage />);
    fireEvent.click(screen.getByRole('button', { name: /Open reorder board/i }));
    await waitFor(() => {
      expect(screen.getByText(/Reorder qty:/i)).toBeDefined();
    });
    expect(screen.getAllByText(/6mm Ball Nose/).length).toBeGreaterThan(0);
  });

  it('calculates total cost', async () => {
    wrap(<ToolingCostPage />);
    await waitFor(() => {
      expect(screen.getByText(/45\.50/)).toBeDefined(); // 12.5 + 28 + 5
    });
  });
});
