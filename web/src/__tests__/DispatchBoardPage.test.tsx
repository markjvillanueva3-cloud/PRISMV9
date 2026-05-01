// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DispatchBoardPage } from '../pages/DispatchBoardPage';
import {
  getDispatchBoard,
  getDispatchQueue,
  queueDispatchJob,
  removeDispatchEntry,
  reorderDispatchQueue,
  runDispatchWhatIf,
} from '../api/traveler';
import { getMilestoneSyncEvents, syncMilestoneMutation } from '../components/erp/milestoneIntelligence';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

vi.mock('../api/traveler', async () => {
  const actual = await vi.importActual<typeof import('../api/traveler')>('../api/traveler');
  return {
    ...actual,
    getDispatchBoard: vi.fn(),
    getDispatchQueue: vi.fn(),
    queueDispatchJob: vi.fn(),
    reorderDispatchQueue: vi.fn(),
    runDispatchWhatIf: vi.fn(),
    removeDispatchEntry: vi.fn(),
  };
});

vi.mock('../components/erp/milestoneIntelligence', async () => {
  const actual = await vi.importActual<typeof import('../components/erp/milestoneIntelligence')>('../components/erp/milestoneIntelligence');
  return {
    ...actual,
    getMilestoneSyncEvents: vi.fn(),
    syncMilestoneMutation: vi.fn(),
  };
});

const mockGetDispatchBoard = vi.mocked(getDispatchBoard);
const mockGetDispatchQueue = vi.mocked(getDispatchQueue);
const mockQueueDispatchJob = vi.mocked(queueDispatchJob);
const mockReorderDispatchQueue = vi.mocked(reorderDispatchQueue);
const mockRunDispatchWhatIf = vi.mocked(runDispatchWhatIf);
const mockRemoveDispatchEntry = vi.mocked(removeDispatchEntry);
const mockGetMilestoneSyncEvents = vi.mocked(getMilestoneSyncEvents);
const mockSyncMilestoneMutation = vi.mocked(syncMilestoneMutation);

const syncEvent = {
  id: 'dispatch-sync-1',
  job_id: 'JOB-24018',
  source: 'dispatch-board' as const,
  trigger: 'dispatch-queue-reordered' as const,
  outcome: 'observed' as const,
  summary: 'Captured a dispatch reorder in canonical PRISM queue memory.',
  details: ['Dispatch reordered the live queue on VF-2SS.'],
  timestamp: '2026-04-14T12:20:00Z',
  cli_command: 'prism milestone align --job JOB-24018 --surface dispatch-board',
};

const machineQueue = {
  machine_id: 'VF-2SS',
  machine_name: 'VF-2SS Mill',
  entries: [
    {
      id: 'entry-active',
      machine_id: 'VF-2SS',
      job_id: 'JOB-ACTIVE',
      priority: 5,
      status: 'active' as const,
      actual_start: '2026-04-14T10:00:00Z',
      queued_at: '2026-04-14T09:50:00Z',
    },
    {
      id: 'entry-1',
      machine_id: 'VF-2SS',
      job_id: 'JOB-24018',
      priority: 10,
      status: 'queued' as const,
      estimated_start: '2026-04-14T11:00:00Z',
      estimated_complete: '2026-04-14T12:00:00Z',
      queued_at: '2026-04-14T10:05:00Z',
    },
    {
      id: 'entry-2',
      machine_id: 'VF-2SS',
      job_id: 'JOB-24021',
      priority: 20,
      status: 'queued' as const,
      estimated_start: '2026-04-14T12:00:00Z',
      estimated_complete: '2026-04-14T13:15:00Z',
      queued_at: '2026-04-14T10:10:00Z',
    },
  ],
  active_job: {
    id: 'entry-active',
    machine_id: 'VF-2SS',
    job_id: 'JOB-ACTIVE',
    priority: 5,
    status: 'active' as const,
    actual_start: '2026-04-14T10:00:00Z',
    queued_at: '2026-04-14T09:50:00Z',
  },
  total_queued: 2,
  total_est_min: 135,
};

const dispatchBoard = {
  machines: [
    machineQueue,
    {
      machine_id: 'UMC-500',
      machine_name: 'UMC-500',
      entries: [],
      total_queued: 0,
      total_est_min: 0,
    },
  ],
  total_queued_jobs: 2,
  timestamp: '2026-04-14T10:15:00Z',
};

const prismAnalysis = {
  prompt: 'dispatch prompt',
  aiIntent: {
    intent: 'dispatch_route',
    confidence: 0.91,
    suggestedAction: 'Reorder queued work so the hot job lands earlier.',
    entities: { machine_id: 'VF-2SS' },
    alternatives: [],
  },
  automation: {
    taskClass: 'dispatch_optimization',
    confidence: 0.9,
    chainId: 'dispatch-chain',
    tokenBudget: 1600,
    matchedKeywords: ['dispatch', 'queue', 'hot job'],
    chainSteps: ['read queue', 'evaluate pressure', 'suggest reorder'],
  },
  modelMatches: [
    {
      id: 'model-dispatch',
      name: 'Dispatch Planner',
      domain: 'planning',
      why: 'Optimized for queue depth, hot jobs, and machine-level dispatch pressure.',
    },
  ],
  agentCandidates: [
    {
      id: 'agent-dispatch',
      name: 'Dispatch Agent',
      category: 'planning',
      reason: 'Can explain the safest queue reorder with the least downstream delay.',
    },
  ],
  apprentice: {
    parameter: 'queue pressure',
    value: 'elevated',
    explanation: 'PRISM is weighting hot-job pressure and the what-if delay before it recommends a queue move.',
    depth: 'deep',
    factors: [{ factor: 'Hot jobs', impact: 'Rush work should move earlier if the delay profile stays acceptable.', physics: 'queueing' }],
  },
  suggestedSurface: {
    label: 'Traveler',
    route: '/travelers',
    actionLabel: 'Verify the upstream traveler packet before committing the queue reorder.',
    cliCommand: 'prism dispatch route --machine VF-2SS',
  },
  reasoningSummary: 'Move the hot job earlier only if the simulated delay stays below the lead threshold.',
  nextActions: ['Run the what-if insert', 'Use arrow fallback or drag reorder once the impact is acceptable'],
};

function renderPage() {
  return render(
    <OperatingSystemProvider
      services={{
        ...fixtureOperatingSystemServices,
        analyzePrismPrompt: vi.fn().mockResolvedValue(prismAnalysis as any),
        getHotJobs: vi.fn().mockResolvedValue([
          {
            jobId: 'JOB-HOT-01',
            partNumber: 'PN-88',
            customer: 'Orbit Aero',
            dueDate: '2026-04-15',
            note: 'Customer expedition',
            setBy: 'Avery',
            setAt: '2026-04-14T09:00:00Z',
          },
        ]),
        subscribeHotJobs: vi.fn(() => () => undefined),
      }}
    >
      <MemoryRouter initialEntries={['/dispatch']}>
        <DispatchBoardPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeEach(() => {
  cleanup();
  mockGetDispatchBoard.mockReset();
  mockGetDispatchQueue.mockReset();
  mockQueueDispatchJob.mockReset();
  mockReorderDispatchQueue.mockReset();
  mockRunDispatchWhatIf.mockReset();
  mockRemoveDispatchEntry.mockReset();
  mockGetMilestoneSyncEvents.mockReset();
  mockSyncMilestoneMutation.mockReset();

  mockGetDispatchBoard.mockResolvedValue(dispatchBoard as any);
  mockGetDispatchQueue.mockResolvedValue(machineQueue as any);
  mockQueueDispatchJob.mockResolvedValue(machineQueue.entries[1] as any);
  mockReorderDispatchQueue.mockResolvedValue({
    ...machineQueue,
    entries: [
      machineQueue.entries[0],
      machineQueue.entries[2],
      machineQueue.entries[1],
    ],
  } as any);
  mockRunDispatchWhatIf.mockResolvedValue({
    original_queue: machineQueue.entries,
    modified_queue: machineQueue.entries,
    impact: {
      jobs_delayed: 1,
      max_delay_min: 18,
      total_delay_min: 18,
    },
  } as any);
  mockRemoveDispatchEntry.mockResolvedValue(machineQueue.entries[1] as any);
  mockGetMilestoneSyncEvents.mockResolvedValue([syncEvent] as any);
  mockSyncMilestoneMutation.mockResolvedValue({
    event: syncEvent,
    recentEvents: [syncEvent],
    refreshTimeline: false,
  } as any);
});

describe('DispatchBoardPage', () => {
  it('renders machine queues with the PRISM dispatch reasoning surface', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText(/VF-2SS Mill/i)).toBeDefined());

    expect(screen.getByText(/PRISM dispatch copilot/i)).toBeDefined();
    expect(screen.getByText(/Move the hot job earlier/i)).toBeDefined();
    expect(screen.getByText(/Deep-learning matches/i)).toBeDefined();
    expect(screen.getByText(/Reasoning agents/i)).toBeDefined();
    expect(screen.getByText(/CLI route:/i)).toBeDefined();
    expect(screen.getAllByText(/PRISM sync memory/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/dispatch queue reordered/i)).toBeDefined();
  });

  it('uses the arrow-button fallback to reorder queued work', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Move down/i }).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: /Move down/i })[0]);

    await waitFor(() => {
      expect(mockReorderDispatchQueue).toHaveBeenCalledWith({
        machine_id: 'VF-2SS',
        order: ['entry-2', 'entry-1'],
        reordered_by: 'lead',
      });
      expect(mockSyncMilestoneMutation).toHaveBeenCalledWith(expect.objectContaining({
        jobId: 'JOB-24018',
        trigger: 'dispatch-queue-reordered',
        machineId: 'VF-2SS',
      }));
    });
  });

  it('runs the what-if simulation and surfaces the impact summary', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText(/What-if simulation/i)).toBeDefined());

    fireEvent.change(screen.getByLabelText(/Hypothetical job/i), { target: { value: 'JOB-HYP-77' } });
    fireEvent.click(screen.getByRole('button', { name: /Run what-if/i }));

    await waitFor(() => {
      expect(mockRunDispatchWhatIf).toHaveBeenCalledWith({
        machine_id: 'VF-2SS',
        insert_position: 0,
        job_id: 'JOB-HYP-77',
        estimated_duration_min: 60,
      });
      expect(screen.getByText(/Impact summary/i)).toBeDefined();
      expect(screen.getAllByText(/18\.0 min/i).length).toBeGreaterThan(0);
    });
  });
});
