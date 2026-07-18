/**
 * HRCompliancePage.test.tsx -- regression oracle for the erp envelope-unwrap fix.
 *
 * R9/R12: every one of this page's 12 erp client fns routes through bizRoute/bizGet in
 * src/routes/erp.ts (lines 575-586 + /erp/employees + /erp/hr-training) and therefore emits the
 * { ok, data } envelope -- so the page's old bare `.result` reads were ALL undefined and the entire
 * data layer was dead (every tab rendered its empty-state fallback, every form payload showed null).
 * Each mock below uses the real { ok, data } shape, and each assertion checks a value that only renders
 * if `.data` is unwrapped -- a revert to bare `.result` makes the asserted value vanish and fails the
 * test. The four distinct read shapes in the page are each exercised:
 *   - setDash(unwrapPrism(res) as HRDashboard)                  -> Dashboard tab
 *   - (payload as any)?.X ?? payload ?? []                      -> Benefits/Training/Alerts/Reviews/Employees
 *   - setPtoPayload(unwrapPrism(res) as Record<...>)            -> PTO balance form (same shape as the
 *                                                                  PTO-request / enroll / review-create sites)
 *   - { training: unwrapPrism(a), compensation: unwrapPrism(b) }-> History lookup
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HRCompliancePage } from '../pages/HRCompliancePage';
import {
  ApiError,
  hrBenefitsList,
  hrCompensationHistory,
  hrComplianceAlerts,
  hrDashboard,
  hrPTOBalance,
  hrReviews,
  hrTrainingExpiring,
  hrTrainingHistory,
  listEmployees,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    hrBenefitsList: vi.fn(),
    hrCompensationHistory: vi.fn(),
    hrComplianceAlerts: vi.fn(),
    hrDashboard: vi.fn(),
    hrPTOBalance: vi.fn(),
    hrReviews: vi.fn(),
    hrTrainingExpiring: vi.fn(),
    hrTrainingHistory: vi.fn(),
    listEmployees: vi.fn(),
  };
});

const mockBenefits = vi.mocked(hrBenefitsList);
const mockComp = vi.mocked(hrCompensationHistory);
const mockAlerts = vi.mocked(hrComplianceAlerts);
const mockDash = vi.mocked(hrDashboard);
const mockPto = vi.mocked(hrPTOBalance);
const mockReviews = vi.mocked(hrReviews);
const mockExpiring = vi.mocked(hrTrainingExpiring);
const mockTraining = vi.mocked(hrTrainingHistory);
const mockList = vi.mocked(listEmployees);

const DASH = {
  total_enrolled: 42,
  total_employer_benefit_cost: 12500,
  avg_pto_balance: 64,
  training_compliance_pct: 87,
  pending_reviews: 5,
  compliance_alerts: 3,
};

beforeEach(() => {
  // Dashboard loads on mount (default tab) in EVERY test -> always give it a valid { ok, data }.
  mockDash.mockReset().mockResolvedValue({ ok: true, data: DASH } as any);
  mockBenefits.mockReset().mockResolvedValue({ ok: true, data: { plans: [] } } as any);
  mockExpiring.mockReset().mockResolvedValue({ ok: true, data: { records: [] } } as any);
  mockAlerts.mockReset().mockResolvedValue({ ok: true, data: { alerts: [] } } as any);
  mockReviews.mockReset().mockResolvedValue({ ok: true, data: { reviews: [] } } as any);
  mockList.mockReset().mockResolvedValue({ ok: true, data: { employees: [] } } as any);
  mockPto.mockReset().mockResolvedValue({ ok: true, data: {} } as any);
  mockTraining.mockReset().mockResolvedValue({ ok: true, data: { records: [] } } as any);
  mockComp.mockReset().mockResolvedValue({ ok: true, data: { history: [] } } as any);
});

describe('HRCompliancePage erp envelope unwrap', () => {
  it('renders dashboard metrics from hrDashboard { ok, data } on mount', async () => {
    render(<HRCompliancePage />);
    // 87% renders only if .data unwraps to DASH; bare .result -> dash=null -> "Standby" + "not loaded".
    await waitFor(() => expect(screen.getAllByText('87%').length).toBeGreaterThan(0));
    expect(screen.queryByText('Standby')).toBeNull();
    expect(screen.queryByText(/dashboard metrics are not loaded/i)).toBeNull();
  });

  it('renders benefit plans from hrBenefitsList { ok, data: { plans } } on the Benefits tab', async () => {
    mockBenefits.mockResolvedValue({
      ok: true,
      data: { plans: [{ id: 'BEN-1', name: 'Health PPO', type: 'medical', provider: 'Aetna', employer_contribution: 400, employee_contribution: 120 }] },
    } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Benefits' }));
    await waitFor(() => expect(screen.getByText('Health PPO')).toBeDefined());
    expect(screen.queryByText(/No benefit plans are staged/i)).toBeNull();
  });

  it('renders expiring training from hrTrainingExpiring { ok, data: { records } } on the Training tab', async () => {
    mockExpiring.mockResolvedValue({
      ok: true,
      data: { records: [{ id: 'T1', course_name: 'OSHA 10', employee_id: 'EMP-1', category: 'Safety', status: 'expiring', expiration_date: '2026-08-01' }] },
    } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Training' }));
    await waitFor(() => expect(screen.getByText('OSHA 10')).toBeDefined());
    expect(screen.queryByText(/No training records are expiring/i)).toBeNull();
  });

  it('renders compliance alerts from hrComplianceAlerts { ok, data: { alerts } } on the Alerts tab', async () => {
    mockAlerts.mockResolvedValue({
      ok: true,
      data: { alerts: [{ type: 'I-9 Missing', severity: 'critical', description: 'Form I-9 absent', regulation: 'IRCA' }] },
    } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Alerts' }));
    await waitFor(() => expect(screen.getByText('I-9 Missing')).toBeDefined());
    expect(screen.queryByText(/No compliance alerts are staged/i)).toBeNull();
  });

  it('renders the review queue from hrReviews { ok, data: { reviews } } on the Reviews tab', async () => {
    mockReviews.mockResolvedValue({
      ok: true,
      data: { reviews: [{ employee_id: 'EMP-REVIEW-1', type: 'annual', status: 'pending', date: '2026-07-01', rating: 4 }] },
    } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }));
    await waitFor(() => expect(screen.getByText('EMP-REVIEW-1')).toBeDefined());
    expect(screen.queryByText(/No review queue is staged/i)).toBeNull();
  });

  it('renders the employee roster from listEmployees { ok, data: { employees } } on the Employees tab', async () => {
    mockList.mockResolvedValue({
      ok: true,
      data: { employees: [{ id: 'E1', first_name: 'Ana', last_name: 'Lopez', department: 'Machining', role: 'Operator', status: 'active', skills: ['Mill'] }] },
    } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Employees' }));
    await waitFor(() => expect(screen.getByText('Ana Lopez')).toBeDefined());
    expect(screen.queryByText(/No employees are staged/i)).toBeNull();
  });

  it('renders the PTO payload from hrPTOBalance { ok, data } after submitting the balance form', async () => {
    // Covers the setPtoPayload(unwrapPrism(res) as Record<...>) shape -- byte-identical to the
    // PTO-request / enroll / review-create sites fixed in the same sweep.
    mockPto.mockResolvedValue({ ok: true, data: { balance_hours: 80, employee_id: 'EMP-1' } } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'PTO' }));
    const checkBtn = await screen.findByRole('button', { name: 'Check PTO' });
    const form = checkBtn.closest('form') as HTMLFormElement;
    const input = form.querySelector('input[name="pto_emp"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'EMP-1' } });
    fireEvent.submit(form);
    // The <pre> JSON.stringify(ptoPayload) only renders when ptoPayload is non-null (unwrapped .data);
    // bare .result -> null -> no <pre> -> 'balance_hours' never appears.
    await waitFor(() => expect(screen.getByText(/balance_hours/)).toBeDefined());
  });

  it('renders history from hrTrainingHistory + hrCompensationHistory { ok, data } via the History lookup', async () => {
    mockTraining.mockResolvedValue({ ok: true, data: { records: [{ course_name: 'Forklift Cert' }] } } as any);
    mockComp.mockResolvedValue({ ok: true, data: { history: [{ amount: 50000, effective_date: '2026-01-01' }] } } as any);

    render(<HRCompliancePage />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load history' }));
    // historyPayload = { training: unwrapPrism(a), compensation: unwrapPrism(b) }. With the bug, both
    // unwrap to undefined and JSON.stringify drops them -> '{}' -> 'Forklift Cert' absent.
    await waitFor(() => expect(screen.getByText(/Forklift Cert/)).toBeDefined());
    expect(screen.getByText(/50000/)).toBeDefined();
  });

  it('surfaces a fail-loud error state when hrDashboard rejects', async () => {
    mockDash.mockRejectedValue(new ApiError(500, 'HR dashboard offline'));
    render(<HRCompliancePage />);
    await waitFor(() => expect(screen.getByText('HR dashboard offline')).toBeDefined());
  });
});
