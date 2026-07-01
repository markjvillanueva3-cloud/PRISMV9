// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobsPage } from '../pages/JobsPage';
import { ApiError, jobCreate, jobDashboard, jobSummary, jobUpdateStatus, milestoneAdvance, milestoneCreateTimeline, milestoneGetTimeline, milestoneGetSyncEvents, milestoneSyncMutation } from '../api/client';
import { getDispatchBoard, getTravelerSummary } from '../api/traveler';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import type { OperatingSystemServices, JobDeskRecord } from '../features/operating-system/contracts';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    jobDashboard: vi.fn(),
    jobCreate: vi.fn(),
    jobUpdateStatus: vi.fn(),
    jobSummary: vi.fn(),
    milestoneGetTimeline: vi.fn(),
    milestoneCreateTimeline: vi.fn(),
    milestoneAdvance: vi.fn(),
    milestoneSyncMutation: vi.fn(),
    milestoneGetSyncEvents: vi.fn(),
  };
});

vi.mock('../api/traveler', () => ({
  getDispatchBoard: vi.fn(),
  getTravelerSummary: vi.fn(),
}));

const mockJobDashboard = vi.mocked(jobDashboard);
const mockJobCreate = vi.mocked(jobCreate);
const mockJobUpdateStatus = vi.mocked(jobUpdateStatus);
const mockJobSummary = vi.mocked(jobSummary);
const mockMilestoneGetTimeline = vi.mocked(milestoneGetTimeline);
const mockMilestoneCreateTimeline = vi.mocked(milestoneCreateTimeline);
const mockMilestoneAdvance = vi.mocked(milestoneAdvance);
const mockMilestoneSyncMutation = vi.mocked(milestoneSyncMutation);
const mockMilestoneGetSyncEvents = vi.mocked(milestoneGetSyncEvents);
const mockGetDispatchBoard = vi.mocked(getDispatchBoard);
const mockGetTravelerSummary = vi.mocked(getTravelerSummary);

function renderJobsPage(initialEntry = '/jobs', services: OperatingSystemServices = fixtureOperatingSystemServices) {
  return render(
    <OperatingSystemProvider services={services}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <JobsPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

function getSearchParams(href: string | null) {
  return new URL(href ?? '/', 'http://localhost').searchParams;
}

beforeEach(() => {
  window.localStorage.clear();
  mockJobDashboard.mockReset();
  mockJobCreate.mockReset();
  mockJobUpdateStatus.mockReset();
  mockJobSummary.mockReset();
  mockMilestoneGetTimeline.mockReset();
  mockMilestoneCreateTimeline.mockReset();
  mockMilestoneAdvance.mockReset();
  mockMilestoneSyncMutation.mockReset();
  mockMilestoneGetSyncEvents.mockReset();
  mockGetDispatchBoard.mockReset();
  mockGetTravelerSummary.mockReset();
  mockMilestoneGetTimeline.mockRejectedValue(new ApiError(404, 'No milestone found for job'));
  mockMilestoneCreateTimeline.mockResolvedValue({} as any);
  mockMilestoneAdvance.mockResolvedValue({} as any);
  mockMilestoneSyncMutation.mockResolvedValue({
    event: {
      id: 'sync-1',
      job_id: 'JOB-001',
      source: 'jobs-desk',
      trigger: 'job-status-changed',
      outcome: 'aligned',
      summary: 'Aligned the job timeline.',
      details: ['Dispatch update captured.'],
      timestamp: '2026-04-15T00:00:00Z',
      cli_command: 'prism milestone align --job JOB-001 --surface jobs-desk',
    },
    timeline: null,
    refresh_timeline: true,
    recent_events: [],
  } as any);
  mockMilestoneGetSyncEvents.mockResolvedValue([]);
  mockGetDispatchBoard.mockResolvedValue({
    machines: [],
    total_queued_jobs: 0,
    timestamp: '2026-03-30T00:00:00Z',
  } as any);
  mockGetTravelerSummary.mockRejectedValue(new ApiError(404, 'No traveler found for job'));
});

describe('JobsPage', () => {
  it('renders the jobs workspace with the dispatch inspector', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 12,
        on_schedule: 9,
        at_risk: 2,
        overdue: 1,
        revenue_pipeline: 120000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'high',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 2,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage();

    await screen.findByRole('heading', { name: 'Jobs' });
    await screen.findByText('Traveler steps');

    expect(screen.getAllByText('BRKT-01').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$120,000')).toBeDefined();
    expect(screen.getByText('Material shortages')).toBeDefined();

    const captureLink = screen.getByRole('link', { name: /Capture Ops/i });
    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=jobs-desk');
    expect(captureLink.getAttribute('href')).toContain('job=JOB-001');
  });

  it('surfaces mounted traveler and dispatch snapshots inside the selected job inspector', async () => {
    const controlledServices: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      buildJobDeskRecords: async () => [
        {
          jobId: 'JOB-001',
          owner: 'Dispatch',
          workcenter: 'Mill 1',
          queueSlot: 'Queue 01',
          isHot: false,
          hotNote: null,
          traveler: [
            {
              id: 'desk-step-1',
              code: 'OP05',
              title: 'Op 05 Lathe rough',
              machine: 'ST-20',
              estimate: '45 min',
              status: 'ready',
              note: 'Fixture and first-op setup still pending.',
            },
          ],
          shortages: [],
          approvals: [],
          attachments: [],
          timeline: [],
          purchasingActions: [],
          nextActions: [],
        } satisfies JobDeskRecord,
      ],
      analyzePrismPrompt: async () => ({
        prompt: 'Advance JOB-001 milestone',
        aiIntent: {
          intent: 'milestone-routing',
          confidence: 0.93,
          suggestedAction: 'Advance the active milestone after setup signoff.',
          entities: { jobId: 'JOB-001', machine: 'VF-2' },
          alternatives: [{ intent: 'dispatch-review', confidence: 0.41 }],
        },
        automation: {
          taskClass: 'roadmap',
          confidence: 0.91,
          chainId: 'chain-roadmap',
          tokenBudget: 1800,
          matchedKeywords: ['milestone', 'dispatch'],
          chainSteps: ['classify', 'reason', 'route'],
        },
        modelMatches: [
          {
            id: 'intent_classifier',
            name: 'Milestone Intent Classifier',
            domain: 'dispatch',
            why: 'Matched milestone progression and queue posture signals.',
          },
        ],
        agentCandidates: [
          {
            id: 'ops-agent',
            name: 'Operations Routing Agent',
            category: 'routing',
            reason: 'Best fit for dispatch and milestone coordination.',
          },
        ],
        apprentice: {
          parameter: 'milestone-risk',
          value: 'guarded',
          explanation: 'Programming is the current milestone and mounted queue pressure suggests keeping the handoff explicit.',
          depth: 'surface',
          factors: [
            { factor: 'queue-load', impact: 'moderate', physics: 'Mounted machine queue is still loaded.' },
          ],
        },
        suggestedSurface: {
          label: 'PRISM Intelligence',
          route: '/intelligence',
          actionLabel: 'Open intelligence shell',
          cliCommand: 'prism classify "Advance JOB-001 milestone"',
        },
        reasoningSummary: 'Advance the current milestone only after the mounted queue and traveler step stay aligned.',
        nextActions: ['Advance the active milestone after setup signoff.', 'Route escalation through the intelligence shell if queue load spikes.'],
      }),
    };
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 12000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 2,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);
    mockGetDispatchBoard.mockResolvedValue({
      machines: [
        {
          machine_id: 'VF-2',
          total_queued: 2,
          total_est_min: 135,
          entries: [
            { id: 'mq-1', machine_id: 'VF-2', job_id: 'JOB-001', priority: 10, status: 'queued', queued_at: '2026-03-30T00:00:00Z' },
            { id: 'mq-2', machine_id: 'VF-2', job_id: 'JOB-004', priority: 20, status: 'queued', queued_at: '2026-03-30T00:02:00Z' },
          ],
        },
      ],
      total_queued_jobs: 2,
      timestamp: '2026-03-30T00:00:00Z',
    } as any);
    mockGetTravelerSummary.mockResolvedValue({
      job_id: 'JOB-001',
      total_steps: 3,
      completed_steps: 1,
      pct_complete: 33,
      total_setup_min: 20,
      total_cycle_min: 35,
      est_total_setup_min: 18,
      est_total_cycle_min: 30,
      setup_variance_pct: 11.1,
      cycle_variance_pct: 16.7,
      current_step: {
        id: 'rs-20',
        job_id: 'JOB-001',
        step_number: 20,
        operation: 'Op 20 Mill',
        machine_id: 'VF-2',
        status: 'running',
        setup_time_min: 20,
        cycle_time_min: 35,
        est_setup_min: 18,
        est_cycle_min: 30,
      },
      steps: [],
      active_timer: {
        id: 'timer-1',
        routing_step_id: 'rs-20',
        job_id: 'JOB-001',
        entry_type: 'cycle',
        start_time: '2026-03-30T00:10:00Z',
      },
    } as any);
    mockMilestoneGetTimeline.mockResolvedValue({
      job_id: 'JOB-001',
      current_milestone: 'programming',
      current_idx: 6,
      total_milestones: 14,
      completed_count: 6,
      progress_pct: 43,
      estimated_delivery: '2026-04-05T17:00:00Z',
      created_at: '2026-03-25T00:00:00Z',
      updated_at: '2026-03-30T00:12:00Z',
      milestones: [
        { id: 'm1', job_id: 'JOB-001', milestone_key: 'quote_sent', milestone_idx: 0, label: 'Quote Sent', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-20T00:00:00Z' },
        { id: 'm2', job_id: 'JOB-001', milestone_key: 'quote_accepted', milestone_idx: 1, label: 'Quote Accepted', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-20T06:00:00Z' },
        { id: 'm3', job_id: 'JOB-001', milestone_key: 'order_confirmed', milestone_idx: 2, label: 'Order Confirmed', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-21T00:00:00Z' },
        { id: 'm4', job_id: 'JOB-001', milestone_key: 'design_review', milestone_idx: 3, label: 'Design Review', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-22T00:00:00Z' },
        { id: 'm5', job_id: 'JOB-001', milestone_key: 'material_ordered', milestone_idx: 4, label: 'Material Ordered', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-23T00:00:00Z' },
        { id: 'm6', job_id: 'JOB-001', milestone_key: 'material_received', milestone_idx: 5, label: 'Material Received', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-24T00:00:00Z' },
        { id: 'm7', job_id: 'JOB-001', milestone_key: 'programming', milestone_idx: 6, label: 'Programming', status: 'active', metadata: {}, created_at: '', updated_at: '', started_at: '2026-03-30T00:10:00Z' },
        { id: 'm8', job_id: 'JOB-001', milestone_key: 'setup', milestone_idx: 7, label: 'Machine Setup', status: 'pending', metadata: {}, created_at: '', updated_at: '' },
      ],
    } as any);
    mockMilestoneAdvance.mockResolvedValue({
      job_id: 'JOB-001',
      current_milestone: 'setup',
      current_idx: 7,
      total_milestones: 14,
      completed_count: 7,
      progress_pct: 50,
      estimated_delivery: '2026-04-05T17:00:00Z',
      created_at: '2026-03-25T00:00:00Z',
      updated_at: '2026-03-30T00:16:00Z',
      milestones: [
        { id: 'm1', job_id: 'JOB-001', milestone_key: 'quote_sent', milestone_idx: 0, label: 'Quote Sent', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-20T00:00:00Z' },
        { id: 'm2', job_id: 'JOB-001', milestone_key: 'quote_accepted', milestone_idx: 1, label: 'Quote Accepted', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-20T06:00:00Z' },
        { id: 'm3', job_id: 'JOB-001', milestone_key: 'order_confirmed', milestone_idx: 2, label: 'Order Confirmed', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-21T00:00:00Z' },
        { id: 'm4', job_id: 'JOB-001', milestone_key: 'design_review', milestone_idx: 3, label: 'Design Review', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-22T00:00:00Z' },
        { id: 'm5', job_id: 'JOB-001', milestone_key: 'material_ordered', milestone_idx: 4, label: 'Material Ordered', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-23T00:00:00Z' },
        { id: 'm6', job_id: 'JOB-001', milestone_key: 'material_received', milestone_idx: 5, label: 'Material Received', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-24T00:00:00Z' },
        { id: 'm7', job_id: 'JOB-001', milestone_key: 'programming', milestone_idx: 6, label: 'Programming', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-30T00:15:00Z' },
        { id: 'm8', job_id: 'JOB-001', milestone_key: 'setup', milestone_idx: 7, label: 'Machine Setup', status: 'active', metadata: {}, created_at: '', updated_at: '', started_at: '2026-03-30T00:16:00Z' },
      ],
    } as any);

    renderJobsPage('/jobs', controlledServices);

    expect(await screen.findByText('Mounted traveler route')).toBeDefined();
    expect(screen.getByText('1/3 complete')).toBeDefined();
    expect(screen.getByText('Op 20 · Op 20 Mill')).toBeDefined();
    expect(screen.getByText('Setup 11.1% · Cycle 16.7%')).toBeDefined();
    expect(screen.getByText('Mounted dispatch board')).toBeDefined();
    expect(screen.getByText('VF-2 · 2 queued')).toBeDefined();
    expect(screen.getByText('JOB-001 queued first')).toBeDefined();
    expect(screen.getByText('135 min')).toBeDefined();

    const trackerParams = getSearchParams(screen.getByRole('link', { name: /Open mobile tracker/i }).getAttribute('href'));
    const captureParams = getSearchParams(screen.getByRole('link', { name: /Capture Ops/i }).getAttribute('href'));
    expect(trackerParams.get('operation')).toBe('Op 20 Mill');
    expect(trackerParams.get('department')).toBe('Run cycle');
    expect(trackerParams.get('machine')).toBe('VF-2');
    expect(captureParams.get('department')).toBe('Run cycle');
    expect(captureParams.get('machine')).toBe('VF-2');
    expect(captureParams.get('job')).toBe('JOB-001');
    expect(screen.getByText('Milestone timeline')).toBeDefined();
    expect(screen.getByText('PRISM milestone copilot')).toBeDefined();
    expect(screen.getByText('Programming')).toBeDefined();
    expect(screen.getByText(/CLI route:/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Advance active milestone/i }));
    await waitFor(() => {
      expect(mockMilestoneAdvance).toHaveBeenCalledWith(
        'JOB-001',
        expect.objectContaining({ advanced_by: 'jobs-desk' }),
      );
    });
    expect(screen.getByText('Machine Setup')).toBeDefined();
  });

  it('surfaces dispatch-board fetch failures instead of silently blending fallback data into the mounted card', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 8000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 2,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);
    mockGetDispatchBoard.mockRejectedValueOnce(new Error('Dispatch board offline'));

    renderJobsPage();

    expect(await screen.findByText('Dispatch board offline')).toBeDefined();
  });

  it('surfaces non-404 mounted traveler failures so the Jobs desk does not silently pretend the route is healthy', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 8000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 2,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);
    mockGetTravelerSummary.mockRejectedValueOnce(new Error('Traveler route offline'));

    renderJobsPage();

    expect(await screen.findByText('Traveler route offline')).toBeDefined();
  });

  it('creates a new job and looks up summary output', async () => {
    mockJobDashboard.mockResolvedValue({
      result: { total_active: 0, on_schedule: 0, at_risk: 0, overdue: 0, revenue_pipeline: 0, jobs: [] },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);
    mockJobCreate.mockResolvedValue({ result: { id: 'JOB-NEW' } } as any);
    mockJobSummary.mockResolvedValue({
      result: { id: 'JOB-2026-001', status: 'planned', route: ['saw', 'mill'] },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'job-summary', uncertainty: 0.06 },
    } as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing jobs workspace/i)).toBeNull();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /New Job/i })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Job/i }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.change(screen.getByLabelText(/Customer/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/Part number/i), { target: { value: 'SHAFT-02' } });
    fireEvent.change(screen.getByDisplayValue('6061-T6'), { target: { value: '4140' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Job/i }));

    await waitFor(() => {
      expect(mockJobCreate).toHaveBeenCalled();
    });
    expect(mockMilestoneSyncMutation).toHaveBeenCalledWith('JOB-NEW', expect.objectContaining({
      source: 'jobs-desk',
      trigger: 'job-created',
      note: expect.stringContaining('Acme'),
    }));
    expect(mockMilestoneGetSyncEvents).toHaveBeenCalledWith('JOB-NEW', 6);
    expect(mockMilestoneCreateTimeline).not.toHaveBeenCalledWith({
      job_id: 'JOB-NEW',
      start_at_milestone: 'programming',
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Job Summary/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('JOB-2026-001'), { target: { value: 'JOB-2026-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Get Summary/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/JOB-2026-001/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('builds a traveler packet preview and QR handoff during intake', async () => {
    mockJobDashboard.mockResolvedValue({
      result: { total_active: 0, on_schedule: 0, at_risk: 0, overdue: 0, revenue_pipeline: 0, jobs: [] },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing jobs workspace/i)).toBeNull();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /New Job/i })[0]);
    fireEvent.change(screen.getByLabelText(/Customer/i), { target: { value: 'Orbit Aero' } });
    fireEvent.change(screen.getByLabelText(/Part number/i), { target: { value: 'TB-42' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Titan Bracket' } });
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText(/Material/i), { target: { value: '4140' } });
    fireEvent.change(screen.getByLabelText(/Due date/i), { target: { value: '2026-04-07' } });

    await waitFor(() => {
      expect(screen.getByText('Traveler front sheet')).toBeDefined();
      expect(screen.getByText('Titan Bracket')).toBeDefined();
      expect(screen.getByText('Department checkoff')).toBeDefined();
      expect(screen.getByText('Traveler operations')).toBeDefined();
    });

    const trackerLink = screen.getByRole('link', { name: /Open employee tracker/i });
    expect(trackerLink.getAttribute('href')).toContain('/shop-clock?');
    expect(trackerLink.getAttribute('href')).toContain('scan=');
    expect(trackerLink.getAttribute('href')).toContain('source=jobs-desk');
    expect(trackerLink.getAttribute('href')).toContain('department=');
    expect(trackerLink.getAttribute('href')).toContain('operation=');
  });

  it('updates job status from the dispatch board', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 1000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);
    mockJobUpdateStatus.mockResolvedValue({ result: { ok: true } } as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getAllByText('BRKT-01').length).toBeGreaterThanOrEqual(1);
    });

    const statusSelect = (await waitFor(() =>
      within(screen.getByTestId('dispatch-job-JOB-001')).getByLabelText('Update status'),
    )) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

    await waitFor(() => {
      expect(mockJobUpdateStatus).toHaveBeenCalledWith({ job_id: 'JOB-001', status: 'in_progress' });
    });
    expect(mockMilestoneSyncMutation).toHaveBeenCalledWith('JOB-001', expect.objectContaining({
      source: 'jobs-desk',
      trigger: 'job-status-changed',
      status: 'in_progress',
    }));
  });

  it('hydrates summary and selection from focus query params', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 4000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs?focusId=JOB-001&focusType=job');

    await waitFor(() => {
      expect(screen.getAllByText('JOB-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('JOB-001').length).toBeGreaterThan(0);
    });
  });

  it('ignores non-job focus types and keeps operational follow-up anchored to the selected job', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 4000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs?source=print-to-cnc&recordType=Quote&recordId=QUOTE-77&focusType=quote&focusId=QUOTE-77&focusQuoteId=QUOTE-77&focusPacketId=pkt__release__77');

    await waitFor(() => {
      expect(screen.getAllByText('JOB-001').length).toBeGreaterThanOrEqual(1);
    });

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const orderTrackingLink = screen
      .getAllByRole('link', { name: /Open Order Tracking/i })
      .find((link) => link.getAttribute('href')?.includes('/order-tracking?'));
    expect(messagesLink.getAttribute('href')).toContain('focusType=job');
    expect(messagesLink.getAttribute('href')).toContain('focusJobId=JOB-001');
    expect(messagesLink.getAttribute('href')).not.toContain('focusQuoteId=QUOTE-77');
    expect(messagesLink.getAttribute('href')).not.toContain('focusPacketId=pkt__release__77');
    expect(orderTrackingLink).toBeDefined();
    expect(orderTrackingLink?.getAttribute('href')).toContain('/order-tracking?');
    expect(orderTrackingLink?.getAttribute('href')).toContain('source=jobs-desk');
    expect(orderTrackingLink?.getAttribute('href')).toContain('focusType=job');
    expect(orderTrackingLink?.getAttribute('href')).toContain('focusJobId=JOB-001');
    expect(orderTrackingLink?.getAttribute('href')).not.toContain('focusQuoteId=QUOTE-77');
  });

  it('preserves message context and offers forward links into operations', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 4000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Orbit Aero',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs?source=messages&recordType=PO&recordId=PO-44&customer=Orbit%20Aero&note=Confirm%20dock%20date');

    await waitFor(() => {
      expect(screen.getByText(/Messages opened Jobs with context/i)).toBeDefined();
    });

    expect(screen.getByText(/PO PO-44/i)).toBeDefined();
    expect(screen.getByText(/Confirm dock date/i)).toBeDefined();

    const jobsLink = screen
      .getAllByRole('link', { name: /Open Messages follow-up/i })
      .find((link) => link.getAttribute('href')?.includes('originSource=messages'));
    const printLink = screen
      .getAllByRole('link', { name: /Open Print to CNC/i })
      .find((link) => link.getAttribute('href')?.includes('originSource=messages'));
    const orderTrackingLink = screen
      .getAllByRole('link', { name: /Open Order Tracking/i })
      .find((link) => link.getAttribute('href')?.includes('/order-tracking?'));

    expect(jobsLink).toBeDefined();
    expect(printLink).toBeDefined();
    expect(orderTrackingLink).toBeDefined();
    expect(jobsLink?.getAttribute('href')).toContain('/messages?');
    expect(jobsLink?.getAttribute('href')).toContain('originSource=messages');
    expect(jobsLink?.getAttribute('href')).toContain('originType=PO');
    expect(jobsLink?.getAttribute('href')).toContain('originId=PO-44');
    expect(jobsLink?.getAttribute('href')).toContain('source=messages');
    expect(jobsLink?.getAttribute('href')).toContain('recordType=PO');
    expect(jobsLink?.getAttribute('href')).toContain('focusType=job');
    expect(jobsLink?.getAttribute('href')).toContain('focusJobId=JOB-001');
    expect(printLink?.getAttribute('href')).toContain('/print-to-cnc?');
    expect(printLink?.getAttribute('href')).toContain('originSource=messages');
    expect(printLink?.getAttribute('href')).toContain('originType=PO');
    expect(printLink?.getAttribute('href')).toContain('originId=PO-44');
    expect(printLink?.getAttribute('href')).toContain('source=messages');
    expect(printLink?.getAttribute('href')).toContain('focusType=job');
    expect(printLink?.getAttribute('href')).toContain('focusJobId=JOB-001');
    expect(orderTrackingLink?.getAttribute('href')).toContain('/order-tracking?');
    expect(orderTrackingLink?.getAttribute('href')).toContain('originSource=messages');
    expect(orderTrackingLink?.getAttribute('href')).toContain('originType=PO');
    expect(orderTrackingLink?.getAttribute('href')).toContain('originId=PO-44');
    expect(orderTrackingLink?.getAttribute('href')).toContain('source=jobs-desk');
    expect(orderTrackingLink?.getAttribute('href')).toContain('focusType=job');
    expect(orderTrackingLink?.getAttribute('href')).toContain('focusJobId=JOB-001');
  });

  it('ignores non-job focus types and keeps the dispatch board on the ranked job', async () => {
    const controlledServices: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      rankJobsForTodo: (jobs) => [...jobs].reverse(),
      buildJobDeskRecords: async () => [
        {
          jobId: 'JOB-001',
          owner: 'Dispatch',
          workcenter: 'Mill 1',
          queueSlot: 'Queue 01',
          isHot: false,
          hotNote: null,
          traveler: [],
          shortages: [],
          approvals: [],
          attachments: [],
          timeline: [],
          purchasingActions: [],
          nextActions: [],
        },
        {
          jobId: 'JOB-002',
          owner: 'Dispatch',
          workcenter: 'Lathe 2',
          queueSlot: 'Queue 02',
          isHot: false,
          hotNote: null,
          traveler: [],
          shortages: [],
          approvals: [],
          attachments: [],
          timeline: [],
          purchasingActions: [],
          nextActions: [],
        },
      ],
    };

    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 2,
        on_schedule: 2,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 6000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'FIRST-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 40,
            description: 'First job',
            priority: 'normal',
            material: '4140',
            estimated_hours: 6,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
          {
            id: 'JOB-002',
            customer: 'Orbit Aero',
            part_number: 'SECOND-02',
            status: 'planned',
            due_date: '2026-04-05',
            quantity: 12,
            description: 'Second job',
            priority: 'normal',
            material: '17-4',
            estimated_hours: 5,
            actual_hours: 0,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs?focusType=quote&focusQuoteId=QUOTE-9&focusJobId=JOB-001', controlledServices);

    await waitFor(() => {
      expect(screen.getAllByText('JOB-002').length).toBeGreaterThan(0);
      const trackerLink = screen.getByRole('link', { name: /Open mobile tracker/i });
      expect(trackerLink.getAttribute('href')).toContain('job=JOB-002');
      expect(trackerLink.getAttribute('href')).not.toContain('job=JOB-001');
    });
  });

  it('lets management mark a job hot and moves it to the front of the dispatch board', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 2,
        on_schedule: 2,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 6000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'EARLY-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 40,
            description: 'Early job',
            priority: 'normal',
            material: '4140',
            estimated_hours: 6,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
          {
            id: 'JOB-002',
            customer: 'Orbit Aero',
            part_number: 'HOT-99',
            status: 'planned',
            due_date: '2026-04-05',
            quantity: 12,
            description: 'Hot job',
            priority: 'normal',
            material: '17-4',
            estimated_hours: 5,
            actual_hours: 0,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByTestId('dispatch-job-JOB-001')).toBeDefined();
      expect(screen.getByTestId('dispatch-job-JOB-002')).toBeDefined();
    });

    const markHotButton = await waitFor(() =>
      within(screen.getByTestId('dispatch-job-JOB-002')).getByRole('button', { name: 'Mark hot' }),
    );
    fireEvent.click(markHotButton);

    await waitFor(() => {
      expect(screen.getAllByText('Shop hot').length).toBeGreaterThan(0);
      expect(screen.getByText('Upper management flagged this job hot for shop-wide execution ordering.')).toBeDefined();
      expect(window.localStorage.getItem('prism.hot-jobs.v1')).toContain('JOB-002');
    });

    const orderedCards = screen.getAllByTestId(/dispatch-job-/);
    expect(orderedCards[0].getAttribute('data-testid')).toBe('dispatch-job-JOB-002');
  });

  it('reacts to staged hot-job updates pushed from outside the jobs desk', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 2,
        on_schedule: 2,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 6000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'EARLY-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 40,
            description: 'Early job',
            priority: 'normal',
            material: '4140',
            estimated_hours: 6,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
          {
            id: 'JOB-002',
            customer: 'Orbit Aero',
            part_number: 'HOT-99',
            status: 'planned',
            due_date: '2026-04-05',
            quantity: 12,
            description: 'Hot job',
            priority: 'normal',
            material: '17-4',
            estimated_hours: 5,
            actual_hours: 0,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByTestId('dispatch-job-JOB-001')).toBeDefined();
      expect(screen.getByTestId('dispatch-job-JOB-002')).toBeDefined();
    });

    await act(async () => {
      await fixtureOperatingSystemServices.setJobHot({
        jobId: 'JOB-002',
        partNumber: 'HOT-99',
        customer: 'Orbit Aero',
        dueDate: '2026-04-05',
        note: 'Management pushed this ahead of the normal queue from another desk.',
        setBy: 'Management',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText('Management pushed this ahead of the normal queue from another desk.')).toBeDefined();
      expect(screen.getAllByText('Shop hot').length).toBeGreaterThan(0);
    });

    const orderedCards = screen.getAllByTestId(/dispatch-job-/);
    expect(orderedCards[0].getAttribute('data-testid')).toBe('dispatch-job-JOB-002');
  });

  it('surfaces an execution-order lane so run-now, prep, and blocked work are easy to scan', async () => {
    const controlledServices: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      buildJobDeskRecords: async () => {
        const records: JobDeskRecord[] = [
          {
            jobId: 'JOB-001',
            owner: 'Dispatch',
            workcenter: 'Mill 4',
            queueSlot: 'Run 01',
            isHot: true,
            hotNote: 'Management hot flag',
            traveler: [
              { id: 't1', code: '10', title: 'Setup', machine: 'Mill 4', estimate: '0.8 hr', status: 'ready', note: 'Setup ready' },
            ],
            shortages: [],
            approvals: [],
            attachments: [],
            timeline: [],
            purchasingActions: [],
            nextActions: ['Run first'],
          },
          {
            jobId: 'JOB-002',
            owner: 'Planning',
            workcenter: 'Lathe 2',
            queueSlot: 'Prep 02',
            isHot: false,
            hotNote: null,
            traveler: [
              { id: 't2', code: '20', title: 'Program review', machine: 'Lathe 2', estimate: '1.1 hr', status: 'ready', note: 'Ready for setup' },
            ],
            shortages: [],
            approvals: [{ id: 'a1', label: 'Planner sign-off', owner: 'Planning', status: 'ready', detail: 'Ready to release' }],
            attachments: [],
            timeline: [],
            purchasingActions: [],
            nextActions: ['Prep setup'],
          },
          {
            jobId: 'JOB-003',
            owner: 'Purchasing',
            workcenter: '5X-02',
            queueSlot: 'Hold 03',
            isHot: false,
            hotNote: null,
            traveler: [],
            shortages: [{ id: 's1', item: '1/2 carbide EM', eta: 'Awaiting PO', severity: 'high', action: 'Buy tooling', owner: 'Purchasing' }],
            approvals: [],
            attachments: [],
            timeline: [],
            purchasingActions: ['Buy tooling'],
            nextActions: ['Clear shortage'],
          },
        ];

        return records;
      },
    };

    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 3,
        on_schedule: 2,
        at_risk: 1,
        overdue: 0,
        revenue_pipeline: 8000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'HOT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 20,
            description: 'Hot job',
            priority: 'normal',
            material: '4140',
            estimated_hours: 6,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
          {
            id: 'JOB-002',
            customer: 'Orbit Aero',
            part_number: 'PREP-02',
            status: 'planned',
            due_date: '2026-04-02',
            quantity: 30,
            description: 'Prep job',
            priority: 'normal',
            material: '17-4',
            estimated_hours: 5,
            actual_hours: 0,
            created_at: '2026-03-25',
          },
          {
            id: 'JOB-003',
            customer: 'North Shop',
            part_number: 'BLOCK-03',
            status: 'planned',
            due_date: '2026-04-03',
            quantity: 15,
            description: 'Blocked job',
            priority: 'normal',
            material: '6061-T6',
            estimated_hours: 4,
            actual_hours: 0,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs', controlledServices);

    await waitFor(() => {
      expect(screen.getAllByText('Execution order').length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const runNowLane = screen.getByTestId('execution-lane-run-now');
      const prepLane = screen.getByTestId('execution-lane-prep-next');
      const blockedLane = screen.getByTestId('execution-lane-blocked');

      expect(within(runNowLane).getByText('HOT-01')).toBeDefined();
      expect(within(prepLane).getByText('PREP-02')).toBeDefined();
      expect(within(blockedLane).getByText('BLOCK-03')).toBeDefined();
    });
  });

  it('deep-links Capture Ops with the selected job context', async () => {
    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 1000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage();

    await waitFor(() => {
      const link = screen
        .getAllByRole('link', { name: /Capture Ops/i })
        .find((element) => element.getAttribute('href')?.includes('source=jobs-desk'));
      expect(link?.getAttribute('href')).toContain('/capture?');
      expect(link?.getAttribute('href')).toContain('source=jobs-desk');
      expect(link?.getAttribute('href')).toContain('target=job');
    });
  });

  it('shows upstream message context and prefills intake customer from that route', async () => {
    mockJobDashboard.mockResolvedValue({
      result: { total_active: 0, on_schedule: 0, at_risk: 0, overdue: 0, revenue_pipeline: 0, jobs: [] },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    renderJobsPage('/jobs?source=messages&recordType=Customer&recordId=CUST-001&thread=thread-rfq&customer=Acme%20Aerospace&note=Carry%20RFQ%20context');

    await waitFor(() => {
      expect(screen.getAllByText(/Messages opened Jobs with context/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
    expect(screen.getByText(/Carry RFQ context/i)).toBeDefined();

    fireEvent.click(screen.getAllByRole('button', { name: /New Job/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const printLink = screen.getByRole('link', { name: /Open Print to CNC/i });

    expect(messagesLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(messagesLink.getAttribute('href')).toContain('originSource=messages');
    expect(messagesLink.getAttribute('href')).toContain('originType=Customer');
    expect(messagesLink.getAttribute('href')).toContain('originId=CUST-001');
    expect(messagesLink.getAttribute('href')).not.toContain('focusType=');
    expect(messagesLink.getAttribute('href')).not.toContain('focusJobId=');
    expect(printLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(printLink.getAttribute('href')).toContain('originSource=messages');
    expect(printLink.getAttribute('href')).toContain('recordType=Customer');
    expect(printLink.getAttribute('href')).toContain('originId=CUST-001');
    expect(printLink.getAttribute('href')).not.toContain('focusType=');
    expect(printLink.getAttribute('href')).not.toContain('focusJobId=');
  });
});
