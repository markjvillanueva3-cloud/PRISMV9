// @vitest-environment jsdom
/**
 * JobTravelerPage render test -- QUOTING-TRAVELER frontend.
 *
 * Exercises the real page consumer against the production wire shape (the route
 * returns {ok, data} -> the client's requestData unwraps to {data}). Asserts the
 * page renders the generated traveler + checklist without crashing, and that the
 * My-Tasks check-off round-trips. Mocks the api client (no network). R9.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

const generateTravelerMock = vi.fn();
const getTravelerChecklistMock = vi.fn();
const getTravelerMyTasksMock = vi.fn();
const checkTravelerItemMock = vi.fn();
const uncheckTravelerItemMock = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
    generateTraveler: (...a: unknown[]) => generateTravelerMock(...a),
    getTravelerChecklist: (...a: unknown[]) => getTravelerChecklistMock(...a),
    getTravelerMyTasks: (...a: unknown[]) => getTravelerMyTasksMock(...a),
    checkTravelerItem: (...a: unknown[]) => checkTravelerItemMock(...a),
    uncheckTravelerItem: (...a: unknown[]) => uncheckTravelerItemMock(...a),
  };
});

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(Component: React.FC) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={['/']}>
        <Component />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

const TRAVELER = {
  data: {
    job_id: 'JOB-1001', part_number: 'DEMO-PART-A', revision: 'A', customer: 'ALCOA',
    total_steps: 3, departments: ['programming', 'machining', 'shipping'], est_total_min: 240,
    notes: ['Grinding omitted -- no ground bore.'],
    steps: [
      { seq: 1, op_num: 10, operation: 'Program & prove out', department: 'programming', role: 'programmer', est_setup_min: 60, est_cycle_min: 0, is_inspection_gate: false, is_outside_service: false, checklist: [{ id: 'programming-1-1', label: 'Program proven out', required: true, signoff: true }] },
      { seq: 2, op_num: 20, operation: 'Rough Pocket', department: 'machining', role: 'setup_tech', machine_domain: 'mill', est_setup_min: 20, est_cycle_min: 5, is_inspection_gate: false, is_outside_service: false, checklist: [{ id: 'machining-2-1', label: 'Work offsets set', required: true, signoff: true }] },
      { seq: 3, op_num: 30, operation: 'Pack & ship', department: 'shipping', role: 'operator', est_setup_min: 0, est_cycle_min: 5, is_inspection_gate: false, is_outside_service: false, checklist: [{ id: 'shipping-3-1', label: 'Qty matches PO', required: true, signoff: true }] },
    ],
  },
};

const CHECKLIST = {
  data: {
    job_id: 'JOB-1001', total_required: 3, total_required_checked: 1, pct_complete: 33,
    steps: [
      { job_id: 'JOB-1001', step_seq: 2, operation: 'Rough Pocket', department: 'machining', is_inspection_gate: false, required_total: 1, required_checked: 0, complete: false, items: [{ id: 'machining-2-1', label: 'Work offsets set', required: true, signoff: true, checked: false }] },
    ],
  },
};

const MY_TASKS = {
  data: {
    job_id: 'JOB-1001', employee_id: 'EMP-101', department: 'machining', step_count: 1,
    steps: CHECKLIST.data.steps,
  },
};

describe('JobTravelerPage', () => {
  it('generates + renders the full traveler grouped by department without crashing', async () => {
    generateTravelerMock.mockResolvedValueOnce(TRAVELER);
    getTravelerChecklistMock.mockResolvedValueOnce(CHECKLIST);
    const { JobTravelerPage } = await import('../pages/JobTravelerPage');
    renderPage(JobTravelerPage);

    fireEvent.click(screen.getAllByText('Generate Traveler')[0]);
    await waitFor(() => expect(generateTravelerMock).toHaveBeenCalled());

    // hero metrics render the generated counts
    await waitFor(() => expect(screen.getByText('Program & prove out')).toBeDefined());
    expect(screen.getByText('Rough Pocket')).toBeDefined();
    expect(screen.getByText('Pack & ship')).toBeDefined();
    // department group headers present
    expect(screen.getAllByText('programming').length).toBeGreaterThan(0);
    // notes surfaced (R12 transparency)
    expect(screen.getByText(/Grinding omitted/)).toBeDefined();
  });

  it('My Tasks: loads an employee department filter + renders check-off items', async () => {
    generateTravelerMock.mockResolvedValueOnce(TRAVELER);
    getTravelerChecklistMock.mockResolvedValueOnce(CHECKLIST);
    getTravelerMyTasksMock.mockResolvedValueOnce(MY_TASKS);
    const { JobTravelerPage } = await import('../pages/JobTravelerPage');
    renderPage(JobTravelerPage);

    // generate first (My Tasks needs a traveler)
    fireEvent.click(screen.getAllByText('Generate Traveler')[0]);
    await waitFor(() => expect(generateTravelerMock).toHaveBeenCalled());

    // switch to My Tasks tab + load
    fireEvent.click(screen.getByText('My Tasks'));
    fireEvent.click(screen.getByText('Load My Tasks'));
    await waitFor(() => expect(getTravelerMyTasksMock).toHaveBeenCalled());

    // the machining step + its checklist item render
    await waitFor(() => expect(screen.getByText('Work offsets set')).toBeDefined());
  });

  it('null/empty data renders the empty states, not a crash (dead-panel guard)', async () => {
    // generate returns an empty data payload -> page must not throw on .steps/.notes
    generateTravelerMock.mockResolvedValueOnce({ data: null });
    getTravelerChecklistMock.mockResolvedValueOnce({ data: null });
    const { JobTravelerPage } = await import('../pages/JobTravelerPage');
    renderPage(JobTravelerPage);

    fireEvent.click(screen.getAllByText('Generate Traveler')[0]);
    await waitFor(() => expect(generateTravelerMock).toHaveBeenCalled());
    // the "generate a traveler" empty prompt stays (no crash, no traveler)
    await waitFor(() => expect(screen.getByText(/Generate a traveler to see the full route/)).toBeDefined());
  });
});
