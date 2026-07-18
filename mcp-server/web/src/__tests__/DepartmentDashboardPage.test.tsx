import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DepartmentDashboardPage } from '../pages/DepartmentDashboardPage';
import {
  ApiError,
  employeeDeptSummary,
  employeeUtilization,
  whoClockedIn,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    employeeDeptSummary: vi.fn(),
    employeeUtilization: vi.fn(),
    whoClockedIn: vi.fn(),
  };
});

const mockEmployeeDeptSummary = vi.mocked(employeeDeptSummary);
const mockEmployeeUtilization = vi.mocked(employeeUtilization);
const mockWhoClockedIn = vi.mocked(whoClockedIn);

beforeEach(() => {
  mockEmployeeDeptSummary.mockReset();
  mockEmployeeUtilization.mockReset();
  mockWhoClockedIn.mockReset();
});

describe('DepartmentDashboardPage', () => {
  it('renders mounted overview, utilization, downtime, and cost lanes', async () => {
    mockWhoClockedIn.mockResolvedValue({
      ok: true,
      data: {
        employees: [
          {
            employee_id: 'EMP-01',
            name: 'Rosa Diaz',
            clock_in_time: '06:55',
            department: 'Machining',
            active_job: 'JOB-2026-001',
            machine: 'VM-1',
          },
        ],
        downtime_pareto: [
          {
            reason: 'Setup',
            occurrences: 1,
            total_minutes: 12,
          },
        ],
      },
    } as any);
    mockEmployeeDeptSummary.mockResolvedValue({
      ok: true,
      data: {
        departments: [
          {
            department: 'Machining',
            headcount: 4,
            clocked_in: 1,
            active_jobs: 1,
            labor_cost: 4200,
            overhead_cost: 1800,
            total_cost: 6000,
          },
        ],
      },
    } as any);
    mockEmployeeUtilization.mockResolvedValue({
      ok: true,
      data: {
        utilization_pct: 82,
        billable_hours: 6.6,
        total_hours: 8,
      },
    } as any);

    render(<DepartmentDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Rosa Diaz').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('82%').length).toBeGreaterThan(0);
    expect(screen.getByText(/Mounted from \/api\/v1\/erp\/employee-utilization for 1 active employee currently on the clock\./i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Downtime' }));
    expect(screen.getByText('Setup')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cost' }));
    expect(screen.getAllByText('$6,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$4,200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,800').length).toBeGreaterThan(0);
  });

  it('fails closed when utilization or cost fields are missing', async () => {
    mockWhoClockedIn.mockResolvedValue({
      ok: true,
      data: {
        employees: [
          {
            employee_id: 'EMP-77',
            name: 'Sam Carter',
            clock_in_time: '07:02',
            department: 'Grinding',
            active_job: 'JOB-2026-404',
            machine: 'GR-2',
          },
        ],
        downtime_pareto: [],
      },
    } as any);
    mockEmployeeDeptSummary.mockResolvedValue({
      ok: true,
      data: {
        departments: [
          {
            department: 'Grinding',
            headcount: 4,
            clocked_in: 1,
            active_jobs: 1,
          },
        ],
      },
    } as any);
    mockEmployeeUtilization.mockRejectedValue(new ApiError(503, 'Utilization route offline'));

    render(<DepartmentDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/instead of zero-filling missing responses/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/instead of inferring spend from headcount/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cost' }));
    expect(screen.queryByText('$8,400')).toBeNull();
    expect(screen.queryByText('$5,600')).toBeNull();
    expect(screen.queryByText('$2,800')).toBeNull();
  });
});
