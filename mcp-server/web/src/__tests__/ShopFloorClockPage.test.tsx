// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShopFloorClockPage } from '../pages/ShopFloorClockPage';
import {
  getActiveJobs,
  getShiftHandoff,
  jobTimePause,
  jobTimeResume,
  jobTimeStart,
  jobTimeStop,
  listEmployees,
  shiftClockIn,
  shiftClockOut,
  whoClockedIn,
} from '../api/client';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listEmployees: vi.fn(),
    shiftClockIn: vi.fn(),
    shiftClockOut: vi.fn(),
    jobTimeStart: vi.fn(),
    jobTimePause: vi.fn(),
    jobTimeResume: vi.fn(),
    jobTimeStop: vi.fn(),
    whoClockedIn: vi.fn(),
    getActiveJobs: vi.fn(),
    getShiftHandoff: vi.fn(),
  };
});

const mockListEmployees = vi.mocked(listEmployees);
const mockShiftClockIn = vi.mocked(shiftClockIn);
const mockShiftClockOut = vi.mocked(shiftClockOut);
const mockJobTimeStart = vi.mocked(jobTimeStart);
const mockJobTimePause = vi.mocked(jobTimePause);
const mockJobTimeResume = vi.mocked(jobTimeResume);
const mockJobTimeStop = vi.mocked(jobTimeStop);
const mockWhoClockedIn = vi.mocked(whoClockedIn);
const mockGetActiveJobs = vi.mocked(getActiveJobs);
const mockGetShiftHandoff = vi.mocked(getShiftHandoff);
const fetchMock = vi.fn();

const SCAN_PAYLOAD = 'PRISMJOB|job=JOB-TRACK-1|name=Titan%20Bracket|customer=Orbit%20Aero|part=TB-42|qty=24|due=2026-04-07|material=4140|priority=rush|departments=intake,setup,run,qc|operations=OP10,OP20,OP30';

function renderPage(initialEntry = '/shop-clock') {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ShopFloorClockPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'shop_floor_brief',
            confidence: 0.91,
            tier: 'multi_domain',
            domains: ['shop_floor', 'operations'],
          },
        }),
      } as Response;
    }

    if (url.endsWith('/route')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            tier: 'full_chain',
            domains: ['shop_floor', 'operations', 'erp'],
            complexity: 'high',
            reason: 'Operator guidance needs floor, labor, and dispatch context.',
            estimated_steps: 3,
          },
        }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          task_id: 'TASK-OP-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'shop_floor',
              result: {
                summary: 'Keep OP20 staged and escalate the hot job before the next cycle.',
              },
            },
          ],
          final_result: {
            summary: 'Keep OP20 staged and escalate the hot job before the next cycle.',
          },
          authority_resolution: {
            winning_source: 'proven',
            confidence: 0.93,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Confirm OP20 machine readiness before the next cycle.',
            'Escalate the hot job note to the lead before dispatch changes the queue.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  mockListEmployees.mockReset();
  mockShiftClockIn.mockReset();
  mockShiftClockOut.mockReset();
  mockJobTimeStart.mockReset();
  mockJobTimePause.mockReset();
  mockJobTimeResume.mockReset();
  mockJobTimeStop.mockReset();
  mockWhoClockedIn.mockReset();
  mockGetActiveJobs.mockReset();
  mockGetShiftHandoff.mockReset();

  mockListEmployees.mockResolvedValue({
    result: {
      employees: [
        {
          id: 'EMP-001',
          first_name: 'Avery',
          last_name: 'Stone',
          department: 'Machining',
          role: 'Machinist',
          status: 'active',
          labor_rates: { regular: 32, overtime: 48, double_time: 64 },
          skills: ['Setup', 'Production'],
          certifications: [],
          hire_date: '2024-01-01',
        },
      ],
    },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'employees', uncertainty: 0.05 },
  } as any);

  mockShiftClockIn.mockResolvedValue({
    result: {
      id: 'SHIFT-1',
      employee_id: 'EMP-001',
      shift_start: '2026-03-27T08:00:00Z',
      breaks: [],
      status: 'clocked_in',
    },
    safety: { score: 0.96, warnings: [] },
    meta: { formula_used: 'shift-in', uncertainty: 0.04 },
  } as any);

  mockShiftClockOut.mockResolvedValue({
    result: {
      id: 'SHIFT-1',
      employee_id: 'EMP-001',
      shift_start: '2026-03-27T08:00:00Z',
      shift_end: '2026-03-27T16:00:00Z',
      breaks: [],
      status: 'clocked_out',
      total_hours: 8,
    },
    safety: { score: 0.96, warnings: [] },
    meta: { formula_used: 'shift-out', uncertainty: 0.04 },
  } as any);

  mockJobTimeStart.mockResolvedValue({
    result: {
      id: 'JT-1',
      employee_id: 'EMP-001',
      job_id: 'JOB-TRACK-1',
      operation: 'OP20',
      start_time: '2026-03-27T08:15:00Z',
      status: 'running',
    },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'job-start', uncertainty: 0.05 },
  } as any);

  mockJobTimePause.mockResolvedValue({
    result: {
      id: 'JT-1',
      employee_id: 'EMP-001',
      job_id: 'JOB-TRACK-1',
      operation: 'OP20',
      status: 'paused',
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'job-pause', uncertainty: 0.06 },
  } as any);

  mockJobTimeResume.mockResolvedValue({
    result: {
      id: 'JT-1',
      employee_id: 'EMP-001',
      job_id: 'JOB-TRACK-1',
      operation: 'OP20',
      status: 'active',
      start_time: '2026-03-27T08:15:00Z',
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'job-resume', uncertainty: 0.06 },
  } as any);

  mockJobTimeStop.mockResolvedValue({
    result: {
      id: 'JT-1',
      employee_id: 'EMP-001',
      job_id: 'JOB-TRACK-1',
      operation: 'OP20',
      status: 'completed',
      elapsed_hours: 1.25,
      labor_cost: 40,
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'job-stop', uncertainty: 0.06 },
  } as any);

  mockWhoClockedIn.mockResolvedValue({
    result: [],
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'who-clocked-in', uncertainty: 0.05 },
  } as any);

  mockGetActiveJobs.mockResolvedValue({
    result: [],
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'active-jobs', uncertainty: 0.05 },
  } as any);

  mockGetShiftHandoff.mockResolvedValue({
    result: { carried_jobs: [] },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'shift-handoff', uncertainty: 0.05 },
  } as any);

});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('ShopFloorClockPage', () => {
  it('registers a scanned traveler packet and checks it into the suggested department', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Job setup')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    await waitFor(() => {
      expect(screen.getByText(/JOB-TRACK-1 registered/i)).toBeDefined();
      expect(screen.getByText('Titan Bracket')).toBeDefined();
      expect(screen.getByText(/Qty 24/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));

    await waitFor(() => {
      expect(screen.getByText(/JOB-TRACK-1 checked into Job setup/i)).toBeDefined();
      expect(screen.getByText(/checked in by Avery Stone/i)).toBeDefined();
    });
  });

  it('shows an inline warning when a job is scanned into the same department twice', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    await waitFor(() => expect(screen.getByText(/JOB-TRACK-1 registered/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));
    await waitFor(() => expect(screen.getByText(/checked into Job setup/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));

    await waitFor(() => {
      expect(screen.getByText(/already checked into Job setup/i)).toBeDefined();
    });
  });

  it('keeps the PRISM AI copilot built into the opening shop-floor desk and auto-briefs the live floor context', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    await waitFor(() => expect(screen.getByText(/JOB-TRACK-1 registered/i)).toBeDefined());

    expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Preview route/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ask PRISM AI/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Summarize floor risk/i })).toBeDefined();
    expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm OP20 machine readiness before the next cycle/i })).toBeDefined();
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('adopts provider-synced department check-ins after a check-in write instead of only prepending local state', async () => {
    const originalCheckIntoDepartment = fixtureOperatingSystemServices.checkIntoDepartment.bind(fixtureOperatingSystemServices);
    const checkIntoDepartmentSpy = vi
      .spyOn(fixtureOperatingSystemServices, 'checkIntoDepartment')
      .mockImplementation(async (input) => {
        const result = await originalCheckIntoDepartment(input);
        return {
          ...result,
          checkIns: result.entry
            ? [
                {
                  ...result.entry,
                  employeeName: 'Server Synced Avery',
                },
              ]
            : result.checkIns,
        };
      });

    try {
      renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

      await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
      fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
      fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

      await waitFor(() => expect(screen.getByText(/JOB-TRACK-1 registered/i)).toBeDefined());

      fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));

      await waitFor(() => {
        expect(screen.getByText(/checked in by Server Synced Avery/i)).toBeDefined();
        expect(checkIntoDepartmentSpy).toHaveBeenCalledWith(expect.objectContaining({
          selectedDepartment: 'Job setup',
        }));
      });
    } finally {
      checkIntoDepartmentSpy.mockRestore();
    }
  });

  it('lets operators start and pause a seeded mobile task without leaving the tracker', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    const scoped = within(await screen.findByTestId('mobile-task-run-cycle'));

    fireEvent.click(scoped.getByRole('button', { name: /^Start$/i }));

    await waitFor(() => {
      expect(scoped.getByText('Running')).toBeDefined();
      expect(mockJobTimeStart).toHaveBeenCalledWith(expect.objectContaining({
        employee_id: 'EMP-001',
        job_id: 'JOB-TRACK-1',
        operation: 'OP20',
        process_type: 'production_run',
      }));
    });

    fireEvent.change(scoped.getByLabelText(/Completed/i), { target: { value: '6' } });
    fireEvent.change(scoped.getByLabelText(/Extras/i), { target: { value: '2' } });
    fireEvent.click(scoped.getByRole('button', { name: /Pause/i }));

    await waitFor(() => {
      expect(scoped.getByText('Paused')).toBeDefined();
      expect(screen.getByText(/2 extras captured beyond the job target for inventory signal/i)).toBeDefined();
      expect(mockJobTimePause).toHaveBeenCalledWith(expect.objectContaining({
        employee_id: 'EMP-001',
        job_id: 'JOB-TRACK-1',
        operation: 'OP20',
      }));
    });
  });

  it('adopts provider-synced task state after a task-event write instead of only trusting local task mutation', async () => {
    const originalRecordTaskEvent = fixtureOperatingSystemServices.recordTaskEvent.bind(fixtureOperatingSystemServices);
    const recordTaskEventSpy = vi
      .spyOn(fixtureOperatingSystemServices, 'recordTaskEvent')
      .mockImplementation(async (input) => {
        const result = await originalRecordTaskEvent(input);
        return {
          tasks: result.tasks.map((task) =>
            task.id === input.taskId
              ? {
                  ...task,
                  extraParts: 5,
                }
              : task,
          ),
        };
      });

    try {
      renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

      await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
      fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
      fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

      const scoped = within(await screen.findByTestId('mobile-task-run-cycle'));

      fireEvent.click(scoped.getByRole('button', { name: /^Start$/i }));

      await waitFor(() => {
        expect(scoped.getByText('Running')).toBeDefined();
      });

      fireEvent.change(scoped.getByLabelText(/Completed/i), { target: { value: '6' } });
      fireEvent.change(scoped.getByLabelText(/Extras/i), { target: { value: '2' } });
      fireEvent.click(scoped.getByRole('button', { name: /Pause/i }));

      await waitFor(() => {
        expect(scoped.getByText('Paused')).toBeDefined();
        expect(screen.getByText(/5 extras captured beyond the job target for inventory signal/i)).toBeDefined();
        expect(recordTaskEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          action: 'pause',
          extraParts: 2,
        }));
      });
    } finally {
      recordTaskEventSpy.mockRestore();
    }
  });

  it('auto-pauses the previous mobile task when the operator switches to another operation', async () => {
    mockJobTimeStart
      .mockResolvedValueOnce({
        result: {
          id: 'JT-1',
          employee_id: 'EMP-001',
          job_id: 'JOB-TRACK-1',
          operation: 'OP20',
          process_type: 'production_run',
          start_time: '2026-03-27T08:15:00Z',
          status: 'running',
        },
        safety: { score: 0.95, warnings: [] },
        meta: { formula_used: 'job-start', uncertainty: 0.05 },
      } as any)
      .mockResolvedValueOnce({
        result: {
          id: 'JT-2',
          employee_id: 'EMP-001',
          job_id: 'JOB-TRACK-1',
          operation: 'OP25',
          process_type: 'secondary_ops',
          start_time: '2026-03-27T08:20:00Z',
          status: 'running',
        },
        safety: { score: 0.95, warnings: [] },
        meta: { formula_used: 'job-start', uncertainty: 0.05 },
      } as any);

    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    const runCycleTask = within(await screen.findByTestId('mobile-task-run-cycle'));
    const secondaryTask = within(await screen.findByTestId('mobile-task-secondary-op'));

    fireEvent.click(runCycleTask.getByRole('button', { name: /^Start$/i }));

    await waitFor(() => {
      expect(runCycleTask.getByText('Running')).toBeDefined();
    });

    fireEvent.click(secondaryTask.getByRole('button', { name: /^Start$/i }));

    await waitFor(() => {
      expect(runCycleTask.getByText('Paused')).toBeDefined();
      expect(secondaryTask.getByText('Running')).toBeDefined();
      expect(mockJobTimeStart).toHaveBeenLastCalledWith(expect.objectContaining({
        employee_id: 'EMP-001',
        job_id: 'JOB-TRACK-1',
        operation: 'OP25',
        process_type: 'secondary_ops',
      }));
    });
  });

  it('blocks shift clock-out while an operation punch is still active', async () => {
    renderPage('/shop-clock?job=JOB-TRACK-1&operation=OP20');

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^Start$/i })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }));

    await waitFor(() => {
      expect(screen.getByText('OP20')).toBeDefined();
      expect(screen.getByText(/running/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Clock out/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stop or complete OP20 before clocking out/i)).toBeDefined();
    });
    expect(mockShiftClockOut).not.toHaveBeenCalled();
  });

  it('shows shop-wide hot-job awareness on the floor tracker', async () => {
    window.localStorage.setItem(
      'prism.hot-jobs.v1',
      JSON.stringify([
        {
          jobId: 'JOB-TRACK-1',
          partNumber: 'TB-42',
          customer: 'Orbit Aero',
          dueDate: '2026-04-07',
          note: 'Management wants this packet run ahead of every normal queue item today.',
        },
      ]),
    );

    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getAllByText(/Management wants this packet run ahead of every normal queue item today\./).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    await waitFor(() => {
      expect(screen.getByText(/Run this packet ahead of normal due-date order until management clears the hot flag\./)).toBeDefined();
      expect(screen.getAllByText(/Shop hot/i).length).toBeGreaterThan(0);
    });
  });

  it('refreshes the floor hot queue when management flags a job after the tracker is already open', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    expect(screen.getByText(/No shop-wide hot jobs are staged right now\./)).toBeDefined();

    await act(async () => {
      await fixtureOperatingSystemServices.setJobHot({
        jobId: 'JOB-TRACK-1',
        partNumber: 'TB-42',
        customer: 'Orbit Aero',
        dueDate: '2026-04-07',
        note: 'Management escalated this packet while the floor tracker stayed open.',
        setBy: 'Management',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText('TB-42')).toBeDefined();
      expect(screen.getAllByText(/Management escalated this packet while the floor tracker stayed open\./).length).toBeGreaterThan(0);
    });
  });

  it('prefills launch context from print-to-cnc while preserving upstream packet focus and quote provenance', async () => {
    renderPage('/shop-clock?source=print-to-cnc&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&job=JOB-TRACK-1&department=Job%20setup&operation=Run%20cycle&machine=Haas%20VF-2SS&note=Track%20actual-vs-standard%20from%20the%20quote%20desk.');

    await waitFor(() => expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined());
    expect(screen.getByText(/Context loaded from/i)).toBeDefined();
    expect(screen.getAllByText(/Print to CNC/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getAllByText(/Quote Builder/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Record:/)).toBeDefined();
    expect(screen.getByText(/Customer:/)).toBeDefined();
    expect(screen.getByText(/Thread:/)).toBeDefined();
    expect(screen.getByText(/Machine target:/)).toBeDefined();
    expect(screen.getByText(/Seeded operation:/)).toBeDefined();
    expect(screen.getByText(/Track actual-vs-standard from the quote desk\./)).toBeDefined();
    expect((screen.getByRole('option', { name: 'Job setup' }) as HTMLOptionElement).selected).toBe(true);
    const captureHref = screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href');
    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href');
    expect(captureHref).toBeTruthy();
    expect(messagesHref).toBeTruthy();

    const captureUrl = parseRelativeUrl(captureHref ?? '');
    expect(captureUrl.pathname).toBe('/capture');
    expect(captureUrl.searchParams.get('source')).toBe('print-to-cnc');
    expect(captureUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(captureUrl.searchParams.get('originType')).toBe('Quote');
    expect(captureUrl.searchParams.get('originId')).toBe('QUOTE-902');
    expect(captureUrl.searchParams.get('originCustomer')).toBe('Orbit Aero');
    expect(captureUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(captureUrl.searchParams.get('focusType')).toBe('packet');
    expect(captureUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(captureUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(captureUrl.searchParams.get('focusJobId')).toBeNull();
    expect(captureUrl.searchParams.get('job')).toBe('JOB-TRACK-1');
    expect(captureUrl.searchParams.get('department')).toBe('Job setup');
    expect(captureUrl.searchParams.get('machine')).toBe('Haas VF-2SS');

    const messagesUrl = parseRelativeUrl(messagesHref ?? '');
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('shop-floor-clock');
    expect(messagesUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(messagesUrl.searchParams.get('originType')).toBe('Quote');
    expect(messagesUrl.searchParams.get('originId')).toBe('QUOTE-902');
    expect(messagesUrl.searchParams.get('originCustomer')).toBe('Orbit Aero');
    expect(messagesUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(messagesUrl.searchParams.get('focusType')).toBe('packet');
    expect(messagesUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(messagesUrl.searchParams.get('focusJobId')).toBeNull();

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clock out/i })).toBeDefined();
      expect((screen.getByLabelText(/Operation/i) as HTMLInputElement).value).toBe('Run cycle');
    });
  });

  it('preserves operation context when resuming an operation punch', async () => {
    renderPage('/shop-clock?job=JOB-TRACK-1&operation=OP20');

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^Start$/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }));
    await waitFor(() => expect(screen.getByText(/running/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Pause$/i }));
    await waitFor(() => expect(screen.getByText(/^paused$/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Resume$/i }));

    await waitFor(() => {
      expect(mockJobTimeResume).toHaveBeenCalledWith(expect.objectContaining({
        employee_id: 'EMP-001',
        job_id: 'JOB-TRACK-1',
        operation: 'OP20',
      }));
    });
  });
});
