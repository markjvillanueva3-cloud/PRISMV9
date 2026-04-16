import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PayrollPage } from '../pages/PayrollPage';
import { TimecardPage } from '../pages/TimecardPage';
import { ShopFloorClockPage } from '../pages/ShopFloorClockPage';
import { EmployeeDirectoryPage } from '../pages/EmployeeDirectoryPage';
import { PurchasingPage } from '../pages/PurchasingPage';
import {
  employeeAddSkill,
  employeeCreate,
  employeeDeptSummary,
  employeeSearch,
  employeeUtilization,
  createPayrollPeriod,
  getTimecardAuditLog,
  getTimecard,
  jobTimePause,
  jobTimeStart,
  jobTimeStop,
  listEmployees,
  purchasingManufacturers,
  purchasingRecommend,
  purchasingSearch,
  purchasingSummary,
  runPayroll,
  shiftClockIn,
  shiftClockOut,
  updateEmployeeStatus,
  updateTimecardStatus,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listEmployees: vi.fn(),
    runPayroll: vi.fn(),
    getTimecard: vi.fn(),
    shiftClockIn: vi.fn(),
    shiftClockOut: vi.fn(),
    jobTimeStart: vi.fn(),
    jobTimePause: vi.fn(),
    jobTimeStop: vi.fn(),
    employeeSearch: vi.fn(),
    employeeDeptSummary: vi.fn(),
    employeeCreate: vi.fn(),
    employeeAddSkill: vi.fn(),
    employeeUtilization: vi.fn(),
    createPayrollPeriod: vi.fn(),
    getTimecardAuditLog: vi.fn(),
    purchasingSearch: vi.fn(),
    purchasingRecommend: vi.fn(),
    purchasingSummary: vi.fn(),
    purchasingManufacturers: vi.fn(),
    updateEmployeeStatus: vi.fn(),
    updateTimecardStatus: vi.fn(),
  };
});

const mockListEmployees = vi.mocked(listEmployees);
const mockRunPayroll = vi.mocked(runPayroll);
const mockGetTimecard = vi.mocked(getTimecard);
const mockShiftClockIn = vi.mocked(shiftClockIn);
const mockShiftClockOut = vi.mocked(shiftClockOut);
const mockJobTimeStart = vi.mocked(jobTimeStart);
const mockJobTimePause = vi.mocked(jobTimePause);
const mockJobTimeStop = vi.mocked(jobTimeStop);
const mockEmployeeSearch = vi.mocked(employeeSearch);
const mockEmployeeDeptSummary = vi.mocked(employeeDeptSummary);
const mockEmployeeCreate = vi.mocked(employeeCreate);
const mockEmployeeAddSkill = vi.mocked(employeeAddSkill);
const mockEmployeeUtilization = vi.mocked(employeeUtilization);
const mockCreatePayrollPeriod = vi.mocked(createPayrollPeriod);
const mockGetTimecardAuditLog = vi.mocked(getTimecardAuditLog);
const mockPurchasingSearch = vi.mocked(purchasingSearch);
const mockPurchasingRecommend = vi.mocked(purchasingRecommend);
const mockPurchasingSummary = vi.mocked(purchasingSummary);
const mockPurchasingManufacturers = vi.mocked(purchasingManufacturers);
const mockUpdateEmployeeStatus = vi.mocked(updateEmployeeStatus);
const mockUpdateTimecardStatus = vi.mocked(updateTimecardStatus);

function renderPage(node: ReactNode, initialEntries = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>);
}

function renderPeopleWorkflow(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/employees" element={<EmployeeDirectoryPage />} />
        <Route path="/timecards" element={<TimecardPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/shop-clock" element={<ShopFloorClockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

beforeEach(() => {
  mockListEmployees.mockReset();
  mockRunPayroll.mockReset();
  mockGetTimecard.mockReset();
  mockShiftClockIn.mockReset();
  mockShiftClockOut.mockReset();
  mockJobTimeStart.mockReset();
  mockJobTimePause.mockReset();
  mockJobTimeStop.mockReset();
  mockEmployeeSearch.mockReset();
  mockEmployeeDeptSummary.mockReset();
  mockEmployeeCreate.mockReset();
  mockEmployeeAddSkill.mockReset();
  mockEmployeeUtilization.mockReset();
  mockCreatePayrollPeriod.mockReset();
  mockGetTimecardAuditLog.mockReset();
  mockPurchasingSearch.mockReset();
  mockPurchasingRecommend.mockReset();
  mockPurchasingSummary.mockReset();
  mockPurchasingManufacturers.mockReset();
  mockUpdateEmployeeStatus.mockReset();
  mockUpdateTimecardStatus.mockReset();

  mockListEmployees.mockResolvedValue({
    result: {
      employees: [
        {
          id: 'EMP-001',
          first_name: 'Avery',
          last_name: 'Stone',
          department: 'CNC Milling',
          role: 'Machinist',
          status: 'active',
          labor_rates: { regular: 32, overtime: 48, double_time: 64 },
          skills: ['3-axis setup', '5-axis programming'],
          certifications: [],
          hire_date: '2024-01-01',
        },
      ],
    },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'employees', uncertainty: 0.05 },
  } as any);
  mockCreatePayrollPeriod.mockResolvedValue({
    result: {
      id: 'PP-100',
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      pay_date: '2026-04-07',
      status: 'open',
      type: 'monthly',
    },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'payroll-period', uncertainty: 0.05 },
  } as any);
  mockGetTimecardAuditLog.mockResolvedValue({
    result: { records: [] },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'audit-log', uncertainty: 0.05 },
  } as any);
  mockUpdateEmployeeStatus.mockResolvedValue({
    result: { ok: true },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'employee-status', uncertainty: 0.05 },
  } as any);
  mockUpdateTimecardStatus.mockResolvedValue({
    result: { ok: true },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'timecard-status', uncertainty: 0.05 },
  } as any);
});

describe('PayrollPage', () => {
  it('runs payroll and renders the register', async () => {
    mockRunPayroll.mockResolvedValue({
      result: {
        stubs: [
          {
            employee_id: 'EMP-001',
            employee_name: 'Avery Stone',
            period: '2026-03',
            regular_hours: 80,
            overtime_hours: 6,
            gross_pay: 3100,
            deductions: [{ type: 'Tax', amount: 620 }],
            net_pay: 2480,
          },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'payroll', uncertainty: 0.06 },
    } as any);

    renderPage(<PayrollPage />);

    fireEvent.click(screen.getByRole('button', { name: /Run payroll/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$2480.00').length).toBeGreaterThan(0);
    });

    expect(mockCreatePayrollPeriod).toHaveBeenCalledTimes(1);
    expect(mockRunPayroll).toHaveBeenCalledWith({ period_id: 'PP-100' });
  });

  it('forwards workforce context into general ledger follow-up', async () => {
    renderPage(
      <PayrollPage />,
      ['/payroll?source=employee-directory&originSource=employee-directory&recordType=Employee&originType=Employee&recordId=EMP-001&originId=EMP-001&focusType=employee&focusId=EMP-001&employeeId=EMP-001'],
    );

    const ledgerUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '',
    );
    expect(ledgerUrl.pathname).toBe('/general-ledger');
    expect(ledgerUrl.searchParams.get('source')).toBe('payroll');
    expect(ledgerUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(ledgerUrl.searchParams.get('originType')).toBe('Employee');
    expect(ledgerUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(ledgerUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(ledgerUrl.searchParams.get('focusType')).toBe('employee');
    expect(ledgerUrl.searchParams.get('focusId')).toBe('EMP-001');
    expect(ledgerUrl.searchParams.get('focusJobId')).toBeNull();
  });
});

describe('TimecardPage', () => {
  it('loads a weekly timecard and shows job allocation', async () => {
    mockGetTimecard.mockResolvedValue({
      result: {
        employee_id: 'EMP-001',
        employee_name: 'Avery Stone',
        period_start: '2026-03-22',
        period_end: '2026-03-28',
        regular_hours: 38,
        overtime_hours: 4,
        double_time_hours: 0,
        total_hours: 42,
        jobs: [{ job_id: 'JOB-42', hours: 14, cost: 532 }],
        status: 'submitted',
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'timecard', uncertainty: 0.05 },
    } as any);

    renderPage(<TimecardPage />);

    await waitFor(() => expect(screen.getAllByText(/Avery Stone/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Load timecard/i }));

    await waitFor(() => {
      expect(screen.getByText('JOB-42')).toBeDefined();
      expect(screen.getAllByText(/submitted/i).length).toBeGreaterThan(0);
    });
  });

  it('shows operation-level labor detail and carries the exact lane back to shop floor', async () => {
    mockGetTimecard.mockResolvedValue({
      result: {
        employee_id: 'EMP-001',
        employee_name: 'Avery Stone',
        period_start: '2026-03-22',
        period_end: '2026-03-28',
        regular_hours: 38,
        overtime_hours: 4,
        double_time_hours: 0,
        total_hours: 42,
        jobs: [{
          job_id: 'JOB-42',
          hours: 14,
          cost: 532,
          operations: ['OP20', 'OP25'],
          operation_details: [
            {
              operation: 'OP20',
              process_type: 'production_run',
              machine_id: 'MC-07',
              hours: 10,
              cost: 380,
              good_parts: 24,
              scrap_count: 1,
            },
            {
              operation: 'OP25',
              process_type: 'secondary_ops',
              machine_id: 'MC-07',
              hours: 4,
              cost: 152,
              good_parts: 24,
              scrap_count: 0,
            },
          ],
        }],
        status: 'submitted',
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'timecard', uncertainty: 0.05 },
    } as any);

    renderPage(
      <TimecardPage />,
      ['/timecards?source=employee-directory&originSource=employee-directory&recordType=Employee&originType=Employee&recordId=EMP-001&originId=EMP-001&focusType=employee&focusId=EMP-001&employeeId=EMP-001'],
    );

    await waitFor(() => expect(screen.getAllByText(/Avery Stone/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Load timecard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Operation breakdown/i)).toBeDefined();
      expect(screen.getAllByText('OP20').length).toBeGreaterThan(0);
      expect(screen.getAllByText('OP25').length).toBeGreaterThan(0);
      expect(screen.getByText(/production run/i)).toBeDefined();
      expect(screen.getByText(/secondary ops/i)).toBeDefined();
      expect(screen.getAllByText(/24 good/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/1 scrap/i)).toBeDefined();
    });

    const launchLinks = screen.getAllByRole('link', { name: /Resume on shop floor/i });
    const shopFloorUrl = parseRelativeUrl(launchLinks[0].getAttribute('href') ?? '');
    expect(shopFloorUrl.pathname).toBe('/shop-clock');
    expect(shopFloorUrl.searchParams.get('source')).toBe('timecards');
    expect(shopFloorUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(shopFloorUrl.searchParams.get('originType')).toBe('Employee');
    expect(shopFloorUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('focusType')).toBe('employee');
    expect(shopFloorUrl.searchParams.get('focusId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('focusJobId')).toBeNull();
    expect(shopFloorUrl.searchParams.get('job')).toBe('JOB-42');
    expect(shopFloorUrl.searchParams.get('operation')).toBe('OP20');
    expect(shopFloorUrl.searchParams.get('machine')).toBe('MC-07');
  });

  it('keeps CSV export locked until approval and requires a note for supervisor transitions', async () => {
    mockGetTimecard.mockResolvedValue({
      result: {
        employee_id: 'EMP-001',
        employee_name: 'Avery Stone',
        period_start: '2026-03-22',
        period_end: '2026-03-28',
        regular_hours: 38,
        overtime_hours: 4,
        double_time_hours: 0,
        total_hours: 42,
        jobs: [{ job_id: 'JOB-42', hours: 14, cost: 532 }],
        status: 'submitted',
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'timecard', uncertainty: 0.05 },
    } as any);

    renderPage(<TimecardPage />);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Load timecard/i }));

    await waitFor(() => {
      expect(screen.getByText(/CSV export unlocks after approval/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Add a status note before approving/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Status note/i), { target: { value: 'Supervisor approved after audit review.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));

    await waitFor(() => {
      expect(mockUpdateTimecardStatus).toHaveBeenCalledWith({
        employee_id: 'EMP-001',
        week_start: '2026-03-22',
        status: 'approved',
        change_reason: 'Supervisor approved after audit review.',
      });
    });
  });
});

describe('ShopFloorClockPage', () => {
  it('clocks in an operator and starts a job timer', async () => {
    mockShiftClockIn.mockResolvedValue({
      result: {
        id: 'SHIFT-1',
        employee_id: 'EMP-001',
        shift_start: '2026-03-26T08:00:00Z',
        breaks: [],
        status: 'clocked_in',
      },
      safety: { score: 0.96, warnings: [] },
      meta: { formula_used: 'shift-in', uncertainty: 0.04 },
    } as any);

    mockJobTimeStart.mockResolvedValue({
      result: {
        id: 'JT-1',
        employee_id: 'EMP-001',
        job_id: 'JOB-100',
        start_time: '2026-03-26T08:15:00Z',
        status: 'running',
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-start', uncertainty: 0.05 },
    } as any);

    renderPage(<ShopFloorClockPage />);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    await waitFor(() => expect(screen.getByText(/Clocked in/i)).toBeDefined());

    fireEvent.change(screen.getByLabelText(/Job ID/i), { target: { value: 'JOB-100' } });
    fireEvent.change(screen.getByLabelText(/Operation/i), { target: { value: 'OP20 Finish' } });
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }));

    await waitFor(() => {
      expect(screen.getAllByText('JOB-100').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/running/i).length).toBeGreaterThan(0);
    });
  });
});

describe('EmployeeDirectoryPage', () => {
  it('renders the roster and utilization lane', async () => {
    renderPage(<EmployeeDirectoryPage />);

    await waitFor(() => expect(screen.getByText('Avery Stone')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Utilization/i }));

    await waitFor(() => {
      expect(screen.getByText(/Utilization lookup/i)).toBeDefined();
      expect(screen.getByText(/Utilization brief/i)).toBeDefined();
    });
  });

  it('preserves workforce context from employee directory into timecards and payroll', async () => {
    renderPeopleWorkflow('/employees');

    await waitFor(() => expect(screen.getByText('Avery Stone')).toBeDefined());

    const timecardsLink = screen.getByRole('link', { name: /Open Timecards follow-up/i });
    const timecardsUrl = parseRelativeUrl(timecardsLink.getAttribute('href') ?? '');
    expect(timecardsUrl.pathname).toBe('/timecards');
    expect(timecardsUrl.searchParams.get('source')).toBe('employee-directory');
    expect(timecardsUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(timecardsUrl.searchParams.get('originType')).toBe('Employee');
    expect(timecardsUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(timecardsUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(timecardsUrl.searchParams.get('focusType')).toBe('employee');
    expect(timecardsUrl.searchParams.get('focusId')).toBe('EMP-001');
    expect(timecardsUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(timecardsLink);

    await waitFor(() => {
      expect(screen.getByText(/Employee Directory opened Timecards with workforce context/i)).toBeDefined();
    });
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();

    const payrollLink = screen.getByRole('link', { name: /Open Payroll follow-up/i });
    const payrollUrl = parseRelativeUrl(payrollLink.getAttribute('href') ?? '');
    expect(payrollUrl.pathname).toBe('/payroll');
    expect(payrollUrl.searchParams.get('source')).toBe('timecards');
    expect(payrollUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(payrollUrl.searchParams.get('originType')).toBe('Employee');
    expect(payrollUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('focusType')).toBe('employee');
    expect(payrollUrl.searchParams.get('focusId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(payrollLink);

    await waitFor(() => {
      expect(screen.getByText(/Timecards opened Payroll with workforce context/i)).toBeDefined();
    });
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
  });

  it('supports manager clock actions and status changes from the roster', async () => {
    mockShiftClockIn.mockResolvedValue({
      result: { id: 'SHIFT-10', employee_id: 'EMP-001', shift_start: '2026-04-09T08:00:00Z', breaks: [], status: 'clocked_in' },
      safety: { score: 0.96, warnings: [] },
      meta: { formula_used: 'shift-in', uncertainty: 0.04 },
    } as any);
    mockShiftClockOut.mockResolvedValue({
      result: { id: 'SHIFT-10', employee_id: 'EMP-001', shift_start: '2026-04-09T08:00:00Z', shift_end: '2026-04-09T16:00:00Z', breaks: [], status: 'clocked_out' },
      safety: { score: 0.96, warnings: [] },
      meta: { formula_used: 'shift-out', uncertainty: 0.04 },
    } as any);

    renderPage(<EmployeeDirectoryPage />);

    await waitFor(() => expect(screen.getByText('Avery Stone')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Clock In For/i }));
    await waitFor(() => {
      expect(mockShiftClockIn).toHaveBeenCalledWith({ employee_id: 'EMP-001' });
      expect(screen.getByText(/Clocked in Avery Stone successfully/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Clock Out For/i }));
    await waitFor(() => {
      expect(mockShiftClockOut).toHaveBeenCalledWith({
        employee_id: 'EMP-001',
        handoff_notes: 'Manager clocked out Avery Stone from the employee directory.',
      });
      expect(screen.getByText(/Clocked out Avery Stone successfully/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Status$/i }));
    fireEvent.change(screen.getByLabelText(/New status/i), { target: { value: 'on_leave' } });
    fireEvent.change(screen.getByLabelText(/Change reason/i), { target: { value: 'Medical leave approved.' } });
    fireEvent.change(screen.getByLabelText(/Expected return date/i), { target: { value: '2026-04-16' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Status/i }));

    await waitFor(() => {
      expect(mockUpdateEmployeeStatus).toHaveBeenCalledWith({
        employee_id: 'EMP-001',
        new_status: 'on_leave',
        change_reason: 'Medical leave approved.',
        return_date: '2026-04-16',
      });
      expect(screen.getByText(/Avery Stone is now on leave/i)).toBeDefined();
    });
  });

  it('launches shop floor clock from employee directory with employee focus intact', async () => {
    renderPeopleWorkflow('/employees');

    await waitFor(() => expect(screen.getByText('Avery Stone')).toBeDefined());

    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor Clock/i });
    const shopFloorUrl = parseRelativeUrl(shopFloorLink.getAttribute('href') ?? '');
    expect(shopFloorUrl.pathname).toBe('/shop-clock');
    expect(shopFloorUrl.searchParams.get('source')).toBe('employee-directory');
    expect(shopFloorUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(shopFloorUrl.searchParams.get('originType')).toBe('Employee');
    expect(shopFloorUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('focusType')).toBe('employee');
    expect(shopFloorUrl.searchParams.get('focusId')).toBe('EMP-001');
    expect(shopFloorUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(shopFloorLink);

    await waitFor(() => {
      expect(screen.getByText(/Employee Directory/i)).toBeDefined();
      expect(screen.getByText(/Record:/i)).toBeDefined();
      expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
    });
  });
});

describe('PurchasingPage', () => {
  it('searches suppliers and loads recommendations', async () => {
    mockPurchasingSearch.mockResolvedValue({
      result: {
        suppliers: [
          {
            id: 'SUP-1',
            name: 'Midwest Metals',
            materials: ['6061-T6', '7075'],
            rating: 4.7,
            lead_time_days: 5,
            min_order: 250,
            location: 'Chicago, IL',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'search', uncertainty: 0.05 },
    } as any);

    mockPurchasingRecommend.mockResolvedValue({
      result: {
        recommendations: [
          {
            supplier_id: 'SUP-1',
            supplier_name: 'Midwest Metals',
            material: '6061-T6',
            unit_price: 3.2,
            lead_time_days: 5,
            score: 91,
            reason: 'Fast lead with strong pricing history.',
          },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'recommend', uncertainty: 0.06 },
    } as any);

    mockPurchasingSummary.mockResolvedValue({ result: { spend: 42000 } } as any);
    mockPurchasingManufacturers.mockResolvedValue({ result: { manufacturers: [] } } as any);

    renderPage(<PurchasingPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => expect(screen.getByText('Midwest Metals')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Recommendations/i }));
    fireEvent.click(screen.getByRole('button', { name: /Get recommendations/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Midwest Metals').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/91\/100/i).length).toBeGreaterThan(0);
    });
  });

  it('preserves upstream quote context and forwards sourcing follow-up', async () => {
    mockPurchasingRecommend.mockResolvedValue({
      result: {
        recommendations: [
          {
            supplier_id: 'SUP-1',
            supplier_name: 'Midwest Metals',
            material: '4140 Steel',
            unit_price: 4.75,
            lead_time_days: 6,
            score: 88,
            reason: 'Best current mix of price and lead time.',
          },
        ],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'recommend', uncertainty: 0.06 },
    } as any);

    renderPage(
      <PurchasingPage />,
      [
        '/purchasing?source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quote&focusId=quote-4140&focusQuoteId=quote-4140&material=4140%20Steel&tab=recommend',
      ],
    );

    expect(screen.getByText(/Quote Builder opened Purchasing with sourcing context/i)).toBeDefined();
    expect(screen.getByText(/Customers & CRM/i)).toBeDefined();
    expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Get recommendations/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Midwest Metals').length).toBeGreaterThan(0);
    });

    const messagesUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '',
    );
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('purchasing');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('originType')).toBe('Customer');
    expect(messagesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(messagesUrl.searchParams.get('material')).toBe('4140 Steel');
    expect(messagesUrl.searchParams.get('supplier')).toBe('Midwest Metals');
    expect(messagesUrl.searchParams.get('focusType')).toBe('quote');
    expect(messagesUrl.searchParams.get('focusId')).toBe('quote-4140');
    expect(messagesUrl.searchParams.get('focusQuoteId')).toBe('quote-4140');

    const captureUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href') ?? '',
    );
    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('source')).toBe('purchasing');
    expect(captureUrl.searchParams.get('originSource')).toBe('customers');
    expect(captureUrl.searchParams.get('originType')).toBe('Customer');
    expect(captureUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(captureUrl.searchParams.get('material')).toBe('4140 Steel');
    expect(captureUrl.searchParams.get('supplier')).toBe('Midwest Metals');
    expect(captureUrl.searchParams.get('focusType')).toBe('quote');
    expect(captureUrl.searchParams.get('focusId')).toBe('quote-4140');
    expect(captureUrl.searchParams.get('focusQuoteId')).toBe('quote-4140');
  });
});
