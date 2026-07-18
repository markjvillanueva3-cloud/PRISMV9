/**
 * EmployeeProfilePage.test.tsx -- regression oracle for the erp envelope-unwrap fix.
 *
 * R9/R12: this page reads 6 erp client fns. The route file (src/routes/erp.ts) proves they do NOT
 * all share one envelope -- four go through bizRoute/bizGet and emit { ok, data } (listEmployees,
 * getTimecard, employeeUtilization, hrTrainingHistory), while TWO are hand-written handlers under the
 * same /erp/ prefix that emit the calc envelope { result, safety, meta } (employeeCertifications,
 * employeeLearningPath). Each mock below uses the route's ACTUAL shape, so a revert to a bare
 * `.result` read for any of the four { ok, data } fns makes the asserted value disappear and the test
 * fails -- a genuine oracle, not a fiction. The learning tab deliberately asserts BOTH envelopes at
 * once (training history { ok, data } + learning path { result }) so a regression on either is caught.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EmployeeProfilePage } from '../pages/EmployeeProfilePage';
import {
  employeeCertifications,
  employeeLearningPath,
  employeeUtilization,
  getTimecard,
  hrTrainingHistory,
  listEmployees,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    employeeCertifications: vi.fn(),
    employeeLearningPath: vi.fn(),
    employeeUtilization: vi.fn(),
    getTimecard: vi.fn(),
    hrTrainingHistory: vi.fn(),
    listEmployees: vi.fn(),
  };
});

const mockCerts = vi.mocked(employeeCertifications);
const mockLearning = vi.mocked(employeeLearningPath);
const mockUtil = vi.mocked(employeeUtilization);
const mockTimecard = vi.mocked(getTimecard);
const mockTraining = vi.mocked(hrTrainingHistory);
const mockList = vi.mocked(listEmployees);

const EMP = {
  id: 'EMP-01',
  first_name: 'Rosa',
  last_name: 'Diaz',
  role: 'Machinist',
  department: 'Machining',
  status: 'active',
  clearance_level: 'shop_floor',
  hire_date: '2024-03-01',
  email: 'rosa@jmdie.test',
  skills: ['Milling'],
  certifications: [],
  labor_rates: { regular: 32, overtime: 48, double_time: 64 },
  overtime_policy: { rule: 'weekly', weekly_threshold_hrs: 40, ot_multiplier: 1.5 },
};

function renderProfile(id = 'EMP-01') {
  return render(
    <MemoryRouter initialEntries={[`/employees/${id}`]}>
      <Routes>
        <Route path="/employees/:employeeId" element={<EmployeeProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Benign defaults so an un-exercised tab's fetch never rejects undefined.
  // listEmployees uses the bizGet { ok, data } envelope (the bug case).
  mockList.mockReset().mockResolvedValue({ ok: true, data: { employees: [EMP] } } as any);
  mockCerts.mockReset().mockResolvedValue({ result: { certifications: [] }, safety: { score: 1, warnings: [] }, meta: {} } as any);
  mockTimecard.mockReset().mockResolvedValue({ ok: true, data: {} } as any);
  mockUtil.mockReset().mockResolvedValue({ ok: true, data: {} } as any);
  mockLearning.mockReset().mockResolvedValue({ result: {}, safety: { score: 1, warnings: [] }, meta: {} } as any);
  mockTraining.mockReset().mockResolvedValue({ ok: true, data: { records: [] } } as any);
});

describe('EmployeeProfilePage erp envelope unwrap', () => {
  it('finds the employee via listEmployees { ok, data } (bare .result would yield an empty directory)', async () => {
    renderProfile();
    // Only resolvable if listEmployees unwraps .data -> {employees:[EMP]} -> find succeeds.
    // A bare `.result` read returns [] -> "Employee EMP-01 not found".
    await waitFor(() => {
      expect(screen.getByText('Rosa Diaz')).toBeDefined();
    });
    expect(screen.queryByText(/not found/i)).toBeNull();
  });

  it('renders utilization from employeeUtilization { ok, data } on the Cost tab', async () => {
    mockUtil.mockResolvedValue({
      ok: true,
      data: { utilization_pct: 82, billable_hours: 6.6, total_hours: 8, active_jobs: 2 },
    } as any);

    renderProfile();
    await waitFor(() => expect(screen.getByText('Rosa Diaz')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Cost Analysis' }));
    // 82% appears only if .data is unwrapped; a bare .result read -> utilData=null -> "No utilization data".
    await waitFor(() => expect(screen.getByText('82%')).toBeDefined());
    expect(screen.queryByText(/No utilization data/i)).toBeNull();
  });

  it('renders timecard totals from getTimecard { ok, data } on the Time tab', async () => {
    mockTimecard.mockResolvedValue({
      ok: true,
      data: { regular_hours: 72, overtime_hours: 5, total_hours: 77, jobs: [{ job_id: 'JOB-1', hours: 8, cost: 400 }] },
    } as any);

    renderProfile();
    await waitFor(() => expect(screen.getByText('Rosa Diaz')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Time History' }));
    await waitFor(() => expect(screen.getByText('JOB-1')).toBeDefined());
    expect(screen.getByText('77')).toBeDefined();
    expect(screen.queryByText(/No timecard data/i)).toBeNull();
  });

  it('renders BOTH envelopes on the Learning tab: training { ok, data } AND learning path { result }', async () => {
    mockLearning.mockResolvedValue({
      result: { courses: [{ id: 'C1', title: 'Safety 101', status: 'completed', progress_pct: 100 }] },
      safety: { score: 1, warnings: [] },
      meta: {},
    } as any);
    mockTraining.mockResolvedValue({
      ok: true,
      data: { records: [{ id: 'R1', course_name: 'Forklift Cert', category: 'Safety', completed_date: '2026-01-01' }] },
    } as any);

    renderProfile();
    await waitFor(() => expect(screen.getByText('Rosa Diaz')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Learning' }));
    // 'Safety 101' proves the { result } learning-path unwrap; 'Forklift Cert' proves the { ok, data }
    // training-history unwrap. Both in one tab -> a regression on either envelope fails this test.
    await waitFor(() => expect(screen.getByText('Safety 101')).toBeDefined());
    expect(screen.getByText('Forklift Cert')).toBeDefined();
  });

  it('renders fetched certifications from employeeCertifications { result } on the Skills tab', async () => {
    // EMP.certifications is [] so the rendered cert can ONLY come from the fetched { result } payload.
    mockCerts.mockResolvedValue({
      result: { certifications: [{ name: 'CNC Mill Operator' }] },
      safety: { score: 1, warnings: [] },
      meta: {},
    } as any);

    renderProfile();
    await waitFor(() => expect(screen.getByText('Rosa Diaz')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Skills & Certs' }));
    // EMP.certifications is [], so 'CNC Mill Operator' can ONLY come from the fetched { result }
    // payload -- a bare-then-renamed read that broke the unwrap would leave "No certifications on file".
    await waitFor(() => expect(screen.getByText('CNC Mill Operator')).toBeDefined());
    expect(screen.queryByText(/No certifications on file/i)).toBeNull();
  });

  it('surfaces a not-found error when the employee id is absent from the { ok, data } directory', async () => {
    mockList.mockResolvedValue({ ok: true, data: { employees: [EMP] } } as any);
    renderProfile('EMP-999');
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeDefined());
  });
});
