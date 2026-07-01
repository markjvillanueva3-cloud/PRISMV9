import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SchedulingPage } from '../pages/SchedulingPage';
import { schedulingCPM, schedulingJobShop, schedulingJohnsons, schedulingSingleMachine } from '../api/client';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    schedulingJobShop: vi.fn(),
    schedulingSingleMachine: vi.fn(),
    schedulingJohnsons: vi.fn(),
    schedulingCPM: vi.fn(),
  };
});

const mockSchedulingJobShop = vi.mocked(schedulingJobShop);
const mockSchedulingSingleMachine = vi.mocked(schedulingSingleMachine);
const mockSchedulingJohnsons = vi.mocked(schedulingJohnsons);
const mockSchedulingCpm = vi.mocked(schedulingCPM);

beforeEach(() => {
  mockSchedulingJobShop.mockReset();
  mockSchedulingSingleMachine.mockReset();
  mockSchedulingJohnsons.mockReset();
  mockSchedulingCpm.mockReset();
});

describe('SchedulingPage', () => {
  function renderPage(services = fixtureOperatingSystemServices) {
    return render(
      <MemoryRouter>
        <OperatingSystemProvider services={services}>
          <SchedulingPage />
        </OperatingSystemProvider>
      </MemoryRouter>,
    );
  }

  it('renders the scheduling workspace', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Scheduling' })).toBeDefined();
      expect(screen.getByRole('button', { name: /Run Job Shop Schedule/i })).toBeDefined();
    });
  });

  it('tracks release-gate checks for the selected study', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Scheduling' });

    expect(screen.getAllByText('0/3 complete').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 checks remaining/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Material cleared/i }));

    expect(screen.getAllByText('1/3 complete').length).toBeGreaterThan(0);
    expect(screen.getByText(/2 checks remaining/i)).toBeDefined();
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
  });

  it('renders job-shop schedule output', async () => {
    mockSchedulingJobShop.mockResolvedValue({
      result: {
        makespan: 280,
        utilization: 0.84,
        schedule: [
          { job_id: 'J-001', machine: 'CNC-1', start: 0, end: 120 },
          { job_id: 'J-002', machine: 'CNC-2', start: 0, end: 90 },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-shop', uncertainty: 0.05 },
    } as any);

    renderPage();

    await screen.findByRole('heading', { name: 'Scheduling' });

    fireEvent.click(screen.getByRole('button', { name: /Run Job Shop Schedule/i }));

    await waitFor(() => {
      expect(screen.getAllByText('280 min').length).toBeGreaterThan(0);
      expect(screen.getAllByText('84.0%').length).toBeGreaterThan(0);
      expect(screen.getAllByText('J-001').length).toBeGreaterThan(0);
    });
  });

  it('renders the other scheduling study outputs', async () => {
    mockSchedulingSingleMachine.mockResolvedValue({
      result: { rule: 'wspt', sequence: ['J4', 'J2', 'J3', 'J1'] },
      safety: { score: 0.93, warnings: [] },
      meta: { formula_used: 'single-machine', uncertainty: 0.07 },
    } as any);
    mockSchedulingJohnsons.mockResolvedValue({
      result: { sequence: ['J1', 'J3', 'J2', 'J4'], makespan: 31 },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'johnsons', uncertainty: 0.06 },
    } as any);
    mockSchedulingCpm.mockResolvedValue({
      result: { critical_path: ['A', 'B', 'D', 'E'], duration: 13 },
      safety: { score: 0.92, warnings: [] },
      meta: { formula_used: 'cpm', uncertainty: 0.08 },
    } as any);

    renderPage();

    await screen.findByRole('heading', { name: 'Scheduling' });

    fireEvent.click(screen.getByRole('button', { name: /Single Machine/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run WSPT Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/"rule": "wspt"/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Johnson's Rule/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run Johnson's Algorithm/i }));

    await waitFor(() => {
      expect(screen.getByText(/"makespan": 31/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /CPM Critical path visibility/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run CPM Analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/"critical_path"/i)).toBeDefined();
      expect(screen.getByText(/"duration": 13/i)).toBeDefined();
    });
  });

  it('deep-links shop floor and capture ops from the selected study', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Scheduling' });

    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor prove-out/i });
    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });

    expect(shopFloorLink.getAttribute('href')).toContain('/shop-clock?');
    expect(shopFloorLink.getAttribute('href')).toContain('source=scheduling-desk');
    expect(shopFloorLink.getAttribute('href')).toContain('department=');
    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=scheduling-desk');
    expect(captureLink.getAttribute('href')).toContain('machine=');
  });

  it('shows the hot release queue and keeps release links record-aware', async () => {
    const services = {
      ...fixtureOperatingSystemServices,
      getHotJobs: vi.fn(async () => [
        {
          jobId: 'JOB-HOT-991',
          partNumber: 'Turbine Clamp',
          customer: 'North Axis Energy',
          dueDate: '2026-04-02',
          note: 'Prioritize release and setup review before the normal planner queue.',
          setBy: 'Upper management',
          setAt: '2026-03-29T11:30:00.000Z',
        },
      ]),
      subscribeHotJobs: vi.fn(() => () => undefined),
    };

    renderPage(services);

    await screen.findByRole('heading', { name: 'Scheduling' });

    expect(screen.getByText('Hot release queue')).toBeDefined();
    expect(screen.getByText('Turbine Clamp')).toBeDefined();
    expect(screen.getByText(/JOB-HOT-991 · North Axis Energy/)).toBeDefined();

    const releaseLink = screen.getByRole('link', { name: 'Open Print to CNC' });
    expect(releaseLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(releaseLink.getAttribute('href')).toContain('originSource=scheduling-desk');
    expect(releaseLink.getAttribute('href')).toContain('focusJobId=JOB-HOT-991');
  });
});
