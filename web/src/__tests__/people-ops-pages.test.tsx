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
    purchasingSearch: vi.fn(),
    purchasingRecommend: vi.fn(),
    purchasingSummary: vi.fn(),
    purchasingManufacturers: vi.fn(),
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
const mockPurchasingSearch = vi.mocked(purchasingSearch);
const mockPurchasingRecommend = vi.mocked(purchasingRecommend);
const mockPurchasingSummary = vi.mocked(purchasingSummary);
const mockPurchasingManufacturers = vi.mocked(purchasingManufacturers);

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
  mockPurchasingSearch.mockReset();
  mockPurchasingRecommend.mockReset();
  mockPurchasingSummary.mockReset();
  mockPurchasingManufacturers.mockReset();

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
  });

  it('forwards workforce context into general ledger follow-up', async () => {
    renderPage(
      <PayrollPage />,
      ['/payroll?source=employee-directory&originSource=employee-directory&recordType=Employee&originType=Employee&recordId=EMP-001&originId=EMP-001&focusType=employee&focusId=EMP-001&employeeId=EMP-001'],
    );

    const ledgerHref = screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '';
    expect(ledgerHref).toContain('/general-ledger?');
    expect(ledgerHref).toContain('source=payroll');
    expect(ledgerHref).toContain('employeeId=EMP-001');
    expect(ledgerHref).toContain('originSource=employee-directory');
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

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Load timecard/i }));

    await waitFor(() => {
      expect(screen.getByText('JOB-42')).toBeDefined();
      expect(screen.getAllByText(/submitted/i).length).toBeGreaterThan(0);
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
    const timecardsHref = timecardsLink.getAttribute('href') ?? '';
    expect(timecardsHref).toContain('/timecards?');
    expect(timecardsHref).toContain('source=employee-directory');
    expect(timecardsHref).toContain('employeeId=EMP-001');
    expect(timecardsHref).toContain('focusType=employee');

    fireEvent.click(timecardsLink);

    await waitFor(() => {
      expect(screen.getByText(/Employee Directory opened Timecards with workforce context/i)).toBeDefined();
    });
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();

    const payrollLink = screen.getByRole('link', { name: /Open Payroll follow-up/i });
    const payrollHref = payrollLink.getAttribute('href') ?? '';
    expect(payrollHref).toContain('/payroll?');
    expect(payrollHref).toContain('source=timecards');
    expect(payrollHref).toContain('employeeId=EMP-001');
    expect(payrollHref).toContain('focusType=employee');

    fireEvent.click(payrollLink);

    await waitFor(() => {
      expect(screen.getByText(/Timecards opened Payroll with workforce context/i)).toBeDefined();
    });
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
  });

  it('launches shop floor clock from employee directory with employee focus intact', async () => {
    renderPeopleWorkflow('/employees');

    await waitFor(() => expect(screen.getByText('Avery Stone')).toBeDefined());

    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor Clock/i });
    const shopFloorHref = shopFloorLink.getAttribute('href') ?? '';
    expect(shopFloorHref).toContain('/shop-clock?');
    expect(shopFloorHref).toContain('source=employee-directory');
    expect(shopFloorHref).toContain('employeeId=EMP-001');
    expect(shopFloorHref).toContain('focusType=employee');

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

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=purchasing');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=quote');
    expect(messagesHref).toContain('focusQuoteId=quote-4140');

    const captureHref = screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href') ?? '';
    expect(captureHref).toContain('/capture?');
    expect(captureHref).toContain('source=purchasing');
    expect(captureHref).toContain('originSource=customers');
  });
});
