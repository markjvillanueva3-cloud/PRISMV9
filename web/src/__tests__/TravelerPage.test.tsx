// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TravelerPage } from '../pages/TravelerPage';
import {
  completeTravelerStep,
  createTraveler,
  getActiveTravelers,
  getTravelerSummary,
  scanTravelerCode,
  startTravelerCycle,
  startTravelerSetup,
} from '../api/traveler';
import { getMilestoneSyncEvents, syncMilestoneMutation } from '../components/erp/milestoneIntelligence';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

vi.mock('../api/traveler', async () => {
  const actual = await vi.importActual<typeof import('../api/traveler')>('../api/traveler');
  return {
    ...actual,
    getActiveTravelers: vi.fn(),
    getTravelerSummary: vi.fn(),
    createTraveler: vi.fn(),
    startTravelerSetup: vi.fn(),
    startTravelerCycle: vi.fn(),
    completeTravelerStep: vi.fn(),
    scanTravelerCode: vi.fn(),
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

const mockGetActiveTravelers = vi.mocked(getActiveTravelers);
const mockGetTravelerSummary = vi.mocked(getTravelerSummary);
const mockCreateTraveler = vi.mocked(createTraveler);
const mockStartTravelerSetup = vi.mocked(startTravelerSetup);
const mockStartTravelerCycle = vi.mocked(startTravelerCycle);
const mockCompleteTravelerStep = vi.mocked(completeTravelerStep);
const mockScanTravelerCode = vi.mocked(scanTravelerCode);
const mockGetMilestoneSyncEvents = vi.mocked(getMilestoneSyncEvents);
const mockSyncMilestoneMutation = vi.mocked(syncMilestoneMutation);

const syncEvent = {
  id: 'sync-1',
  job_id: 'JOB-24018',
  source: 'traveler-desk' as const,
  trigger: 'traveler-step-completed' as const,
  outcome: 'aligned' as const,
  summary: 'Used traveler completion feedback to align the live routing timeline.',
  details: ['Traveler step 20 Run Cycle completed.'],
  timestamp: '2026-04-14T12:10:00Z',
  target_milestone: 'production' as const,
  cli_command: 'prism milestone align --job JOB-24018 --surface traveler-desk --target production',
};

const travelerSummary = {
  job_id: 'JOB-24018',
  total_steps: 3,
  completed_steps: 1,
  pct_complete: 33,
  total_setup_min: 28,
  total_cycle_min: 18,
  est_total_setup_min: 30,
  est_total_cycle_min: 64,
  setup_variance_pct: -6.7,
  cycle_variance_pct: 8.5,
  current_step: {
    id: 'step-20',
    job_id: 'JOB-24018',
    step_number: 20,
    operation: 'Run cycle',
    machine_id: 'VF-2SS',
    workcenter: 'Machining',
    status: 'running' as const,
    setup_time_min: 28,
    cycle_time_min: 18,
    est_setup_min: 0,
    est_cycle_min: 64,
    quantity: 24,
  },
  active_timer: {
    id: 'timer-20',
    routing_step_id: 'step-20',
    job_id: 'JOB-24018',
    entry_type: 'cycle' as const,
    operator_id: 'EMP-001',
    start_time: '2026-04-14T12:00:00Z',
  },
  steps: [
    {
      id: 'step-10',
      job_id: 'JOB-24018',
      step_number: 10,
      operation: 'Setup',
      machine_id: 'VF-2SS',
      workcenter: 'Setup',
      status: 'complete' as const,
      setup_time_min: 28,
      cycle_time_min: 0,
      est_setup_min: 28,
      est_cycle_min: 0,
    },
    {
      id: 'step-20',
      job_id: 'JOB-24018',
      step_number: 20,
      operation: 'Run cycle',
      machine_id: 'VF-2SS',
      workcenter: 'Machining',
      status: 'running' as const,
      setup_time_min: 28,
      cycle_time_min: 18,
      est_setup_min: 0,
      est_cycle_min: 64,
      quantity: 24,
    },
    {
      id: 'step-30',
      job_id: 'JOB-24018',
      step_number: 30,
      operation: 'Inspection',
      workcenter: 'Quality',
      status: 'pending' as const,
      setup_time_min: 0,
      cycle_time_min: 0,
      est_setup_min: 0,
      est_cycle_min: 18,
      is_inspection_gate: true,
    },
  ],
};

const prismAnalysis = {
  prompt: 'traveler prompt',
  aiIntent: {
    intent: 'route_traveler',
    confidence: 0.94,
    suggestedAction: 'Complete the running cycle before quality release.',
    entities: { job_id: 'JOB-24018' },
    alternatives: [],
  },
  automation: {
    taskClass: 'traveler_orchestration',
    confidence: 0.92,
    chainId: 'traveler-chain',
    tokenBudget: 1800,
    matchedKeywords: ['traveler', 'cycle', 'inspection'],
    chainSteps: ['summarize traveler', 'evaluate risk', 'route next action'],
  },
  modelMatches: [
    {
      id: 'model-floor',
      name: 'Floor Ops Model',
      domain: 'shop_floor',
      why: 'Best fit for traveler timing and queue-dependent routing.',
    },
  ],
  agentCandidates: [
    {
      id: 'agent-routing',
      name: 'Routing Agent',
      category: 'shop_floor',
      reason: 'Can explain the safest next routing action for the live step deck.',
    },
  ],
  apprentice: {
    parameter: 'traveler status',
    value: 'running',
    explanation: 'PRISM keeps the operator focused on the active cycle so inspection does not open before the packet is ready.',
    depth: 'deep',
    factors: [{ factor: 'Current cycle state', impact: 'Finishing the active cycle protects sequence integrity.', physics: 'sequence' }],
  },
  suggestedSurface: {
    label: 'Dispatch Board',
    route: '/dispatch',
    actionLabel: 'Review the downstream queue before opening inspection.',
    cliCommand: 'prism traveler route --job JOB-24018',
  },
  reasoningSummary: 'Finish the active cycle, then route the packet into the inspection gate.',
  nextActions: ['Complete the active cycle', 'Hand off to quality once the cycle closes'],
};

function renderPage() {
  return render(
    <OperatingSystemProvider
      services={{
        ...fixtureOperatingSystemServices,
        analyzePrismPrompt: vi.fn().mockResolvedValue(prismAnalysis as any),
      }}
    >
      <MemoryRouter initialEntries={['/travelers']}>
        <TravelerPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeEach(() => {
  cleanup();
  mockGetActiveTravelers.mockReset();
  mockGetTravelerSummary.mockReset();
  mockCreateTraveler.mockReset();
  mockStartTravelerSetup.mockReset();
  mockStartTravelerCycle.mockReset();
  mockCompleteTravelerStep.mockReset();
  mockScanTravelerCode.mockReset();
  mockGetMilestoneSyncEvents.mockReset();
  mockSyncMilestoneMutation.mockReset();

  mockGetActiveTravelers.mockResolvedValue([travelerSummary as any]);
  mockGetTravelerSummary.mockResolvedValue(travelerSummary as any);
  mockCreateTraveler.mockResolvedValue({ steps: travelerSummary.steps, count: travelerSummary.steps.length } as any);
  mockStartTravelerSetup.mockResolvedValue({ step: travelerSummary.steps[1], summary: travelerSummary } as any);
  mockStartTravelerCycle.mockResolvedValue({ step: travelerSummary.steps[1], summary: travelerSummary } as any);
  mockCompleteTravelerStep.mockResolvedValue({
    step: { ...travelerSummary.steps[1], status: 'complete' },
    summary: { ...travelerSummary, completed_steps: 2, pct_complete: 67 },
  } as any);
  mockScanTravelerCode.mockResolvedValue({ summary: travelerSummary, action: 'start_cycle' } as any);
  mockGetMilestoneSyncEvents.mockResolvedValue([syncEvent] as any);
  mockSyncMilestoneMutation.mockResolvedValue({
    event: syncEvent,
    recentEvents: [syncEvent],
    refreshTimeline: false,
  } as any);
});

describe('TravelerPage', () => {
  it('renders the traveler deck with live reasoning context', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('JOB-24018')).toBeDefined());

    expect(screen.getByText(/Inspection gate/i)).toBeDefined();
    expect(screen.getByText(/PRISM traveler copilot/i)).toBeDefined();
    expect(screen.getByText(/Finish the active cycle/i)).toBeDefined();
    expect(screen.getByText(/Deep-learning matches/i)).toBeDefined();
    expect(screen.getByText(/Reasoning agents/i)).toBeDefined();
    expect(screen.getByText(/CLI route:/i)).toBeDefined();
    expect(screen.getByText(/Live cycle timer/i)).toBeDefined();
    expect(screen.getAllByText(/PRISM sync memory/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/traveler step completed/i)).toBeDefined();
  });

  it('routes a step completion through the traveler action seam', async () => {
    renderPage();

    await screen.findByText(/Step 20: Run cycle/i);
    fireEvent.click(screen.getByRole('button', { name: /Complete step/i }));

    await waitFor(() => {
      expect(mockCompleteTravelerStep).toHaveBeenCalledWith(
        'JOB-24018',
        20,
        expect.objectContaining({
          operator_id: 'EMP-001',
          parts_complete: 0,
          parts_scrapped: 0,
        }),
      );
      expect(mockSyncMilestoneMutation).toHaveBeenCalledWith(expect.objectContaining({
        jobId: 'JOB-24018',
        trigger: 'traveler-step-completed',
        operation: 'Run cycle',
      }));
    });
  });

  it('renders the roadmap empty state when no travelers are active', async () => {
    mockGetActiveTravelers.mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No active travelers/i)).toBeDefined();
    });
  });
});
