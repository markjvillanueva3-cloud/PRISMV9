/**
 * EmployeeDirectoryPage.test.tsx -- regression oracle for the erp envelope-unwrap fix.
 *
 * R9/R12: all 6 erp client fns this page reads route through bizRoute/bizGet (src/routes/erp.ts:
 * employees 283, employee-search 287, employee-create 284, employee-add-skill 288,
 * employee-dept-summary 290, employee-utilization 289) and emit the { ok, data } envelope -- so the
 * old bare `.result` reads were ALL undefined and the roster/departments/utilization/onboard lanes
 * were dead. Each mock uses the real { ok, data } shape; each assertion checks a value that only
 * renders if `.data` was unwrapped, so a revert to bare `.result` fails the test. The four read shapes
 * are exercised: nested `(payload as any)?.employees ?? payload` (roster + search), nested
 * `?.departments ?? payload` (departments), simple `setUtilData(unwrapPrism(res))` (utilization), and
 * simple `setSkillResult(unwrapPrism(res))` (add-skill; identical shape to the employeeCreate read).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeDirectoryPage } from '../pages/EmployeeDirectoryPage';
import {
  ApiError,
  employeeAddSkill,
  employeeDeptSummary,
  employeeSearch,
  employeeUtilization,
  listEmployees,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    employeeAddSkill: vi.fn(),
    employeeDeptSummary: vi.fn(),
    employeeSearch: vi.fn(),
    employeeUtilization: vi.fn(),
    listEmployees: vi.fn(),
  };
});

const mockAddSkill = vi.mocked(employeeAddSkill);
const mockDept = vi.mocked(employeeDeptSummary);
const mockSearch = vi.mocked(employeeSearch);
const mockUtil = vi.mocked(employeeUtilization);
const mockList = vi.mocked(listEmployees);

const ROSTER = [
  { id: 'E1', first_name: 'Ana', last_name: 'Lopez', department: 'Machining', role: 'Operator', status: 'active', skills: ['Mill'], certifications: [], labor_rates: { regular: 32 } },
];

function renderDirectory() {
  return render(
    <MemoryRouter initialEntries={['/employees']}>
      <EmployeeDirectoryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockList.mockReset().mockResolvedValue({ ok: true, data: { employees: ROSTER } } as any);
  mockSearch.mockReset().mockResolvedValue({ ok: true, data: { employees: ROSTER } } as any);
  mockDept.mockReset().mockResolvedValue({ ok: true, data: { departments: [] } } as any);
  mockUtil.mockReset().mockResolvedValue({ ok: true, data: {} } as any);
  mockAddSkill.mockReset().mockResolvedValue({ ok: true, data: { ok: true } } as any);
});

describe('EmployeeDirectoryPage erp envelope unwrap', () => {
  it('loads the roster from listEmployees { ok, data: { employees } } on mount', async () => {
    renderDirectory();
    // 'Ana Lopez' renders only if .data unwraps; a bare .result read -> [] -> empty-roster prompt.
    await waitFor(() => expect(screen.getByText('Ana Lopez')).toBeDefined());
    expect(screen.queryByText(/Search the roster to load employees/i)).toBeNull();
  });

  it('loads searched employees from employeeSearch { ok, data: { employees } }', async () => {
    mockSearch.mockResolvedValue({
      ok: true,
      data: { employees: [{ id: 'E2', first_name: 'Boris', last_name: 'Petrov', department: 'Grinding', role: 'Grinder', status: 'active', skills: [], certifications: [], labor_rates: { regular: 30 } }] },
    } as any);

    renderDirectory();
    await waitFor(() => expect(screen.getByText('Ana Lopez')).toBeDefined());
    fireEvent.change(screen.getByPlaceholderText(/Search by name, skill, or department/i), { target: { value: 'Boris' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    // employeeSearch is the searchQuery branch of line 73-75; its result must unwrap too.
    await waitFor(() => expect(screen.getByText('Boris Petrov')).toBeDefined());
  });

  it('loads department posture from employeeDeptSummary { ok, data: { departments } } on the Departments tab', async () => {
    mockDept.mockResolvedValue({
      ok: true,
      data: { departments: [{ department: 'Machining', headcount: 4, utilization_pct: 80, avg_rate: 32 }] },
    } as any);

    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'Departments' }));
    // 'Machining' renders (dept card + largest-team tile) only via unwrapped .data; bare .result -> []
    // -> "summary will populate here" + largest-team "Pending".
    await waitFor(() => expect(screen.getAllByText('Machining').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Department summary will populate here/i)).toBeNull();
  });

  it('renders utilization from employeeUtilization { ok, data } after selecting an employee', async () => {
    mockUtil.mockResolvedValue({ ok: true, data: { utilization_pct: 82, billable_hours: 6, total_hours: 8, active_jobs: 2 } } as any);

    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'Utilization' }));
    // The util Select is populated from the loaded roster -> wait for the option, then pick it.
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'E1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check utilization' }));
    // 82% renders only if setUtilData stored the unwrapped .data; bare .result -> null -> no grid.
    await waitFor(() => expect(screen.getByText('82%')).toBeDefined());
  });

  it('confirms skill assignment from employeeAddSkill { ok, data } on the Onboard tab', async () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: 'Onboard' }));
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'E1' } });
    fireEvent.change(screen.getByPlaceholderText(/5-axis programming/i), { target: { value: 'EDM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    // setSkillResult(unwrapPrism(res)) -> truthy -> confirmation; bare .result -> undefined -> no message.
    // (employeeCreate's `const result = unwrapPrism(res)` read at line ~206 is the identical shape.)
    await waitFor(() => expect(screen.getByText(/Skill was attached to the selected employee record/i)).toBeDefined());
  });

  it('surfaces a fail-loud error state when listEmployees rejects', async () => {
    mockList.mockRejectedValue(new ApiError(500, 'Directory offline'));
    renderDirectory();
    await waitFor(() => expect(screen.getByText('Directory offline')).toBeDefined());
  });
});
