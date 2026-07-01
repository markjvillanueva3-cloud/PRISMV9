/**
 * TimecardPage.test.tsx -- regression oracle for the erp envelope-unwrap fix.
 *
 * R9/R12: the two FIXED reads consume listEmployees (GET /erp/employees bizGet) and getTimecard
 * (POST /erp/timecard bizRoute) -- both emit the { ok, data } envelope (src/routes/erp.ts:264,283), so
 * the old bare `.result` reads were undefined: the employee dropdown rendered empty (page unusable) and
 * the loaded timecard was always null. Each mock uses the real { ok, data } shape and each assertion
 * checks a value that only renders if `.data` was unwrapped, so a revert to bare `.result` fails the
 * test. (The page's third read, getTimecardAuditLog via the local extractResponsePayload helper, is a
 * `.result ?? .data` mirror of unwrapPrism -- already safe -- and that route is 501, so it is untouched.)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TimecardPage } from '../pages/TimecardPage';
import { ApiError, getTimecard, listEmployees } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getTimecard: vi.fn(),
    listEmployees: vi.fn(),
  };
});

const mockTimecard = vi.mocked(getTimecard);
const mockList = vi.mocked(listEmployees);

const EMP = { id: 'E1', first_name: 'Ana', last_name: 'Lopez', department: 'Machining', role: 'Operator', status: 'active', skills: ['Mill'] };

const TIMECARD = {
  employee_id: 'E1',
  employee_name: 'Ana Lopez',
  period_start: '2026-06-21',
  period_end: '2026-06-27',
  regular_hours: 40,
  overtime_hours: 2,
  double_time_hours: 0,
  total_hours: 42,
  status: 'submitted',
  jobs: [{ job_id: 'JOB-1', hours: 8, cost: 400, operations: [], operation_details: [] }],
};

function renderTimecards() {
  return render(
    <MemoryRouter initialEntries={['/timecards']}>
      <TimecardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockList.mockReset().mockResolvedValue({ ok: true, data: { employees: [EMP] } } as any);
  mockTimecard.mockReset().mockResolvedValue({ ok: true, data: TIMECARD } as any);
});

describe('TimecardPage erp envelope unwrap', () => {
  it('populates the employee dropdown from listEmployees { ok, data: { employees } }', async () => {
    renderTimecards();
    // The 'Ana Lopez' <option> only exists if listEmployees unwraps .data; a bare .result read -> []
    // -> the dropdown shows only "Select employee" and the page cannot load any timecard.
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
  });

  it('loads the timecard from getTimecard { ok, data } after selecting an employee', async () => {
    renderTimecards();
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'E1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load timecard' }));
    // 'JOB-1' renders only inside a loaded timecard; a bare .result read -> normalizeTimecardSummary(
    // undefined) -> null -> "Choose an employee and date range" empty state.
    await waitFor(() => expect(screen.getByText('JOB-1')).toBeDefined());
    expect(screen.queryByText(/Choose an employee and date range/i)).toBeNull();
  });

  it('surfaces a fail-loud error when getTimecard rejects', async () => {
    mockTimecard.mockRejectedValue(new ApiError(500, 'Timecard service down'));
    renderTimecards();
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'E1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load timecard' }));
    await waitFor(() => expect(screen.getByText('Timecard service down')).toBeDefined());
  });

  it('renders an empty timecard from a sparse getTimecard { ok, data: {} } payload without crashing', async () => {
    mockTimecard.mockResolvedValue({ ok: true, data: {} } as any);
    renderTimecards();
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Lopez/ })).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'E1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load timecard' }));
    // unwrapPrism({ok:true,data:{}}) -> {} (NOT undefined), so normalizeTimecardSummary returns a
    // defaulted card and the job-allocation empty row renders -- not the "choose an employee" prompt.
    await waitFor(() => expect(screen.getByText(/has no job allocation rows yet/i)).toBeDefined());
    expect(screen.queryByText(/Choose an employee and date range/i)).toBeNull();
  });

  it('degrades gracefully when listEmployees rejects (dropdown placeholder stays, no crash)', async () => {
    mockList.mockRejectedValue(new ApiError(503, 'Directory offline'));
    renderTimecards();
    // The .catch sets employees=[]; the placeholder option must still render and no 'Ana Lopez' leaks.
    await waitFor(() => expect(screen.getByRole('option', { name: 'Select employee' })).toBeDefined());
    expect(screen.queryByRole('option', { name: /Ana Lopez/ })).toBeNull();
  });
});
