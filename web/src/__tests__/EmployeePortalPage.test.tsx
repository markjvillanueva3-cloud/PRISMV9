// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmployeePortalPage } from '../pages/EmployeePortalPage';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

function renderPortal(initialEntry = '/employee?profile=machinist') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <EmployeePortalPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('EmployeePortalPage', () => {
  it('renders a role-filtered machinist shell without private admin modules', async () => {
    renderPortal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Avery Stone' })).toBeDefined();
    });

    expect(screen.getByText('My active jobs')).toBeDefined();
    expect(screen.getByText('Shop clock')).toBeDefined();
    expect(screen.getByText('Access posture')).toBeDefined();
    expect(screen.getByText('Shift priorities')).toBeDefined();
    expect(screen.getByText('Setup changeover at MC-04')).toBeDefined();
    expect(screen.getByText('Blockers and handoffs')).toBeDefined();
    expect(screen.getByText('Tool life watch on T08 finisher')).toBeDefined();
    expect(screen.getByText('Fixture offset was re-zeroed after the last run. Confirm the first part on the next setup changeover before full runtime resumes.')).toBeDefined();
    expect(screen.getByText('Intentionally hidden')).toBeDefined();
    expect(screen.getByText('Finance, invoicing, and ledger')).toBeDefined();
    expect(screen.queryByText('Payroll')).toBeNull();
    expect(screen.queryByText('HR')).toBeNull();
    expect(screen.queryByText('General Ledger')).toBeNull();
  });

  it('switches to the planner profile and shows planning desks only', async () => {
    renderPortal('/employee?profile=planner');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Jordan Vale' })).toBeDefined();
    });

    expect(screen.getByText('Dispatch board')).toBeDefined();
    expect(screen.getAllByText('Scheduling').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
    expect(screen.getByText('Dispatch + scheduling')).toBeDefined();
    expect(screen.getByText('Release JOB-4821 to heat treat')).toBeDefined();
    expect(screen.getByText('MC-06 bottleneck is eating release buffer')).toBeDefined();
    expect(screen.getByText('Customer requested a same-day update once the heat-treat release decision is made.')).toBeDefined();
    expect(screen.getByText('Ledger, invoicing, and finance closes')).toBeDefined();
    expect(screen.queryByText('Payroll')).toBeNull();
    expect(screen.queryByText('HR')).toBeNull();
  });

  it('pushes hot jobs to the top of employee shift priorities', async () => {
    window.localStorage.setItem(
      'prism.hot-jobs.v1',
      JSON.stringify([
        {
          jobId: 'JOB-HOT-1',
          partNumber: 'FIRE-01',
          customer: 'Atlas Medical',
          dueDate: '2026-03-29',
          note: 'Management wants this job run ahead of the normal queue today.',
        },
      ]),
    );

    renderPortal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Avery Stone' })).toBeDefined();
    });

    expect(screen.getByText('1 shop hot')).toBeDefined();
    expect(screen.getByText('FIRE-01 · Atlas Medical')).toBeDefined();
    expect(screen.getByText(/Management wants this job run ahead of the normal queue today\./)).toBeDefined();
    expect(screen.getByText('Due 2026-03-29')).toBeDefined();
  });

  it('updates shift priorities when a hot job is flagged after the employee shell is already open', async () => {
    renderPortal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Avery Stone' })).toBeDefined();
    });

    expect(screen.queryByText('1 shop hot')).toBeNull();

    await act(async () => {
      await fixtureOperatingSystemServices.setJobHot({
        jobId: 'JOB-HOT-2',
        partNumber: 'FIRE-02',
        customer: 'Orbit Aero',
        dueDate: '2026-04-02',
        note: 'Management raised this packet from another desk while the shell stayed open.',
        setBy: 'Management',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('1 shop hot')).toBeDefined();
      expect(screen.getByText('FIRE-02 · Orbit Aero')).toBeDefined();
      expect(screen.getByText(/Management raised this packet from another desk while the shell stayed open\./)).toBeDefined();
    });
  });
});
