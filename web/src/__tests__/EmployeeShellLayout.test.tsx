// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { EmployeeShellLayout } from '../components/employee/EmployeeShellLayout';

function renderShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/employee" element={<EmployeeShellLayout />}>
          <Route index element={<div>Employee home</div>} />
          <Route path="jobs" element={<div>Employee jobs desk</div>} />
          <Route path="messages" element={<div>Employee messages desk</div>} />
          <Route path="capture" element={<div>Employee capture desk</div>} />
          <Route path="shop-clock" element={<div>Employee shop clock</div>} />
          <Route path="scheduling" element={<div>Employee scheduling desk</div>} />
          <Route path="*" element={<div>Fallback child</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmployeeShellLayout', () => {
  it('shows only role-filtered nav for a machinist profile and mounts allowed desks', async () => {
    renderShell('/employee/jobs?profile=machinist');

    await waitFor(() => {
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('link', { name: /Jobs/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Shop Clock/i })).toBeDefined();
    expect(screen.queryByText('Payroll')).toBeNull();
    expect(screen.queryByText('General Ledger')).toBeNull();
    expect(screen.getByText('Employee jobs desk')).toBeDefined();
  });

  it('blocks a machinist from opening a planner-only scheduling route', async () => {
    renderShell('/employee/scheduling?profile=machinist');

    await waitFor(() => {
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/This role does not have access to that workspace/i)).toBeDefined();
    expect(screen.getByText(/Try one of your allowed desks/i)).toBeDefined();
    expect(screen.getByText('My active jobs')).toBeDefined();
    expect(screen.getByText('Finance, invoicing, and ledger')).toBeDefined();
    expect(screen.queryByText('Employee scheduling desk')).toBeNull();
  });

  it('allows the planner profile to open the scheduling desk', async () => {
    renderShell('/employee/scheduling?profile=planner');

    await waitFor(() => {
      expect(screen.getAllByText('Jordan Vale').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('link', { name: /Scheduling/i })).toBeDefined();
    expect(screen.getByText('Employee scheduling desk')).toBeDefined();
  });

  it('allows the machinist profile to open the messages desk', async () => {
    renderShell('/employee/messages?profile=machinist');

    await waitFor(() => {
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('link', { name: /Messages/i })).toBeDefined();
    expect(screen.getByText('Employee messages desk')).toBeDefined();
  });

  it('allows the machinist profile to open the capture workspace', async () => {
    renderShell('/employee/capture?profile=machinist');

    await waitFor(() => {
      expect(screen.getAllByText('Avery Stone').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('link', { name: /Capture Ops/i })).toBeDefined();
    expect(screen.getByText('Employee capture desk')).toBeDefined();
  });

  it('keeps shell commerce controls visible in the employee shell too', async () => {
    renderShell('/employee?profile=machinist');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tier features' })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: 'Add-on features' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unit system inch' })).toBeDefined();
  });
});
