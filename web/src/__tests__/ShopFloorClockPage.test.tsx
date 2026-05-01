// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShopFloorClockPage } from '../pages/ShopFloorClockPage';
import { getShiftHandoff, jobTimePause, jobTimeStart, jobTimeStop, listEmployees, shiftClockIn, shiftClockOut, whoClockedIn } from '../api/client';
import { getMilestoneSyncEvents, syncMilestoneMutation } from '../components/erp/milestoneIntelligence';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { useWebSocket } from '../hooks/useWebSocket';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listEmployees: vi.fn(),
    shiftClockIn: vi.fn(),
    shiftClockOut: vi.fn(),
    jobTimeStart: vi.fn(),
    jobTimePause: vi.fn(),
    jobTimeStop: vi.fn(),
    whoClockedIn: vi.fn(),
    getShiftHandoff: vi.fn(),
  };
});

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

vi.mock('../components/erp/milestoneIntelligence', async () => {
  const actual = await vi.importActual<typeof import('../components/erp/milestoneIntelligence')>('../components/erp/milestoneIntelligence');
  return {
    ...actual,
    getMilestoneSyncEvents: vi.fn(),
    syncMilestoneMutation: vi.fn(),
  };
});

const mockListEmployees = vi.mocked(listEmployees);
const mockShiftClockIn = vi.mocked(shiftClockIn);
const mockShiftClockOut = vi.mocked(shiftClockOut);
const mockJobTimeStart = vi.mocked(jobTimeStart);
const mockJobTimePause = vi.mocked(jobTimePause);
const mockJobTimeStop = vi.mocked(jobTimeStop);
const mockWhoClockedIn = vi.mocked(whoClockedIn);
const mockGetShiftHandoff = vi.mocked(getShiftHandoff);
const mockUseWebSocket = vi.mocked(useWebSocket);
const mockGetMilestoneSyncEvents = vi.mocked(getMilestoneSyncEvents);
const mockSyncMilestoneMutation = vi.mocked(syncMilestoneMutation);

const SCAN_PAYLOAD = 'PRISMJOB|job=JOB-TRACK-1|name=Titan%20Bracket|customer=Orbit%20Aero|part=TB-42|qty=24|due=2026-04-07|material=4140|priority=rush|departments=intake,setup,run,qc|operations=OP10,OP20,OP30';

const syncEvent = {
  id: 'floor-sync-1',
  job_id: 'JOB-TRACK-1',
  source: 'shop-floor-clock' as const,
  trigger: 'shop-floor-department-check-in' as const,
  outcome: 'aligned' as const,
  summary: 'Aligned the timeline to the department currently owning the packet.',
  details: ['The packet checked into Job Setup.'],
  timestamp: '2026-04-14T12:30:00Z',
  target_milestone: 'setup' as const,
  cli_command: 'prism milestone align --job JOB-TRACK-1 --surface shop-floor-clock --target setup',
};

function renderPage(initialEntry = '/shop-clock') {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ShopFloorClockPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  mockListEmployees.mockReset();
  mockShiftClockIn.mockReset();
  mockShiftClockOut.mockReset();
  mockJobTimeStart.mockReset();
  mockJobTimePause.mockReset();
  mockJobTimeStop.mockReset();
  mockWhoClockedIn.mockReset();
  mockGetShiftHandoff.mockReset();
  mockUseWebSocket.mockReset();
  mockGetMilestoneSyncEvents.mockReset();
  mockSyncMilestoneMutation.mockReset();

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
      status: 'paused',
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'job-pause', uncertainty: 0.06 },
  } as any);

  mockJobTimeStop.mockResolvedValue({
    result: {
      id: 'JT-1',
      employee_id: 'EMP-001',
      job_id: 'JOB-TRACK-1',
      status: 'completed',
      elapsed_hours: 1.25,
      labor_cost: 40,
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'job-stop', uncertainty: 0.06 },
  } as any);

  mockWhoClockedIn.mockResolvedValue({
    result: {
      employees: [
        {
          employee_id: 'EMP-001',
          employee_name: 'Avery Stone',
          department: 'Machining',
          status: 'clocked_in',
          active_job_id: 'JOB-TRACK-1',
          clocked_in_at: '2026-03-27T08:00:00Z',
        },
      ],
    },
  } as any);

  mockGetShiftHandoff.mockResolvedValue({
    result: {
      summary: 'Quality hold was cleared on first article, but keep inspection attention high through the next cycle.',
    },
  } as any);

  mockUseWebSocket.mockReturnValue({
    state: 'connected',
    lastMessage: { type: 'job:progress', payload: {}, timestamp: '2026-03-27T08:16:00Z' },
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    isConnected: true,
  } as any);

  mockGetMilestoneSyncEvents.mockResolvedValue([syncEvent] as any);
  mockSyncMilestoneMutation.mockResolvedValue({
    event: syncEvent,
    recentEvents: [syncEvent],
    refreshTimeline: true,
  } as any);

  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
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
      expect(mockSyncMilestoneMutation).toHaveBeenCalledWith(expect.objectContaining({
        jobId: 'JOB-TRACK-1',
        trigger: 'shop-floor-department-check-in',
        department: 'Job setup',
      }));
    });
  });

  it('shows an alert when a job is scanned into the same department twice', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Register job/i }));

    await waitFor(() => expect(screen.getByText(/JOB-TRACK-1 registered/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));
    await waitFor(() => expect(screen.getByText(/checked into Job setup/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Check into department/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
      expect(screen.getByText(/already checked into Job setup/i)).toBeDefined();
    });
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
    });

    fireEvent.change(scoped.getByLabelText(/Completed/i), { target: { value: '6' } });
    fireEvent.change(scoped.getByLabelText(/Extras/i), { target: { value: '2' } });
    fireEvent.click(scoped.getByRole('button', { name: /Pause/i }));

    await waitFor(() => {
      expect(scoped.getByText('Paused')).toBeDefined();
      expect(screen.getByText(/2 extras captured/i)).toBeDefined();
    });
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

  it('surfaces live attendance, handoff, and PRISM floor-copilot reasoning directly in the kiosk', async () => {
    renderPage(`/shop-clock?scan=${encodeURIComponent(SCAN_PAYLOAD)}`);

    await waitFor(() => expect(screen.getByText(/Socket live/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Quality hold was cleared on first article/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/PRISM floor copilot/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Prior-shift handoff signal is still active/i)).toBeDefined());
    expect(screen.getByText(/Quality Management/)).toBeDefined();
    expect(screen.getByText(/Manufacturing Intent Classifier/)).toBeDefined();
    expect(screen.getByText(/Task Orchestrator/)).toBeDefined();
    expect(screen.getAllByText(/PRISM sync memory/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/shop floor department check in/i)).toBeDefined();
  });

  it('prefills launch context from print-to-cnc while keeping upstream quote provenance visible', async () => {
    renderPage('/shop-clock?source=print-to-cnc&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&department=Job%20setup&operation=Run%20cycle&machine=Haas%20VF-2SS&note=Track%20actual-vs-standard%20from%20the%20quote%20desk.');

    expect(screen.getByText(/Context loaded from/i)).toBeDefined();
    expect(screen.getByText(/Print to CNC/)).toBeDefined();
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getAllByText(/Quote Builder/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Record:/)).toBeDefined();
    expect(screen.getByText(/Customer:/)).toBeDefined();
    expect(screen.getByText(/Thread:/)).toBeDefined();
    expect(screen.getByText(/Machine target:/)).toBeDefined();
    expect(screen.getByText(/Seeded operation:/)).toBeDefined();
    expect(screen.getByText(/Track actual-vs-standard from the quote desk\./)).toBeDefined();
    expect((screen.getByRole('option', { name: 'Job setup' }) as HTMLOptionElement).selected).toBe(true);
    expect(screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href')).toContain('machine=Haas+VF-2SS');
    expect(screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href')).toContain('originSource=quote-builder');
    expect(screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href')).toContain('focusJobId=JOB-TRACK-1');
    expect(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href')).toContain('/messages?');
    expect(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href')).toContain('source=shop-floor-clock');
    expect(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href')).toContain('originSource=quote-builder');
    expect(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href')).toContain('focusJobId=JOB-TRACK-1');

    await waitFor(() => expect(screen.getByText(/Avery Stone/)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Employee/i), { target: { value: 'EMP-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clock out/i })).toBeDefined();
      expect((screen.getByLabelText(/Operation/i) as HTMLInputElement).value).toBe('Run cycle');
    });
  });
});
