import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import {
  ApiError,
  milestoneAdvance,
  milestoneCreateTimeline,
  milestoneGetTimeline,
  milestoneGetSyncEvents,
  milestoneSyncMutation,
  orderCreate,
  orderList,
  orderLogProduction,
  orderLogTime,
  orderMachineQueue,
  orderMetrics,
  orderUpdateStatus,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    orderList: vi.fn(),
    orderMachineQueue: vi.fn(),
    orderMetrics: vi.fn(),
    orderCreate: vi.fn(),
    orderLogTime: vi.fn(),
    orderLogProduction: vi.fn(),
    orderUpdateStatus: vi.fn(),
    milestoneGetTimeline: vi.fn(),
    milestoneCreateTimeline: vi.fn(),
    milestoneAdvance: vi.fn(),
    milestoneSyncMutation: vi.fn(),
    milestoneGetSyncEvents: vi.fn(),
  };
});

const mockOrderList = vi.mocked(orderList);
const mockOrderMachineQueue = vi.mocked(orderMachineQueue);
const mockOrderMetrics = vi.mocked(orderMetrics);
const mockOrderCreate = vi.mocked(orderCreate);
const mockOrderLogTime = vi.mocked(orderLogTime);
const mockOrderLogProduction = vi.mocked(orderLogProduction);
const mockOrderUpdateStatus = vi.mocked(orderUpdateStatus);
const mockMilestoneGetTimeline = vi.mocked(milestoneGetTimeline);
const mockMilestoneCreateTimeline = vi.mocked(milestoneCreateTimeline);
const mockMilestoneAdvance = vi.mocked(milestoneAdvance);
const mockMilestoneSyncMutation = vi.mocked(milestoneSyncMutation);
const mockMilestoneGetSyncEvents = vi.mocked(milestoneGetSyncEvents);

function renderPage(initialEntries = ['/']) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={initialEntries}>
        <OrderTrackingPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeEach(() => {
  mockOrderList.mockReset();
  mockOrderMachineQueue.mockReset();
  mockOrderMetrics.mockReset();
  mockOrderCreate.mockReset();
  mockOrderLogTime.mockReset();
  mockOrderLogProduction.mockReset();
  mockOrderUpdateStatus.mockReset();
  mockMilestoneGetTimeline.mockReset();
  mockMilestoneCreateTimeline.mockReset();
  mockMilestoneAdvance.mockReset();
  mockMilestoneSyncMutation.mockReset();
  mockMilestoneGetSyncEvents.mockReset();
  mockMilestoneGetTimeline.mockRejectedValue(new ApiError(404, 'No milestone found for job'));
  mockMilestoneCreateTimeline.mockResolvedValue({} as any);
  mockMilestoneAdvance.mockResolvedValue({} as any);
  mockMilestoneSyncMutation.mockResolvedValue({
    event: {
      id: 'sync-order-1',
      job_id: 'JOB-001',
      source: 'order-tracking',
      trigger: 'order-time-logged',
      outcome: 'aligned',
      summary: 'Aligned the work-order timeline.',
      details: ['Execution update captured.'],
      timestamp: '2026-04-15T00:00:00Z',
      cli_command: 'prism milestone align --job JOB-001 --surface order-tracking',
    },
    timeline: null,
    refresh_timeline: true,
    recent_events: [],
  } as any);
  mockMilestoneGetSyncEvents.mockResolvedValue([]);
});

describe('OrderTrackingPage', () => {
  it('renders the order board and active job posture', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'WO-001',
            job_id: 'JOB-001',
            status: 'in_progress',
            machine: 'VF-2SS',
            est_hours: 5,
            actual_hours: 2,
            quantity: 24,
            part_number: 'BRK-1001',
            notes: 'Fixture staged',
          },
        ],
      },
    } as any);
    mockMilestoneGetTimeline.mockResolvedValue({
      job_id: 'JOB-001',
      current_milestone: 'production',
      current_idx: 9,
      total_milestones: 14,
      completed_count: 9,
      progress_pct: 64,
      estimated_delivery: '2026-04-08T12:00:00Z',
      created_at: '2026-03-25T00:00:00Z',
      updated_at: '2026-03-30T08:00:00Z',
      milestones: [
        { id: 'm1', job_id: 'JOB-001', milestone_key: 'quote_sent', milestone_idx: 0, label: 'Quote Sent', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-20T00:00:00Z' },
        { id: 'm2', job_id: 'JOB-001', milestone_key: 'programming', milestone_idx: 6, label: 'Programming', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-27T00:00:00Z' },
        { id: 'm3', job_id: 'JOB-001', milestone_key: 'setup', milestone_idx: 7, label: 'Machine Setup', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-28T00:00:00Z' },
        { id: 'm4', job_id: 'JOB-001', milestone_key: 'first_article', milestone_idx: 8, label: 'First Article Inspection', status: 'completed', metadata: {}, created_at: '', updated_at: '', completed_at: '2026-03-29T00:00:00Z' },
        { id: 'm5', job_id: 'JOB-001', milestone_key: 'production', milestone_idx: 9, label: 'Production Run', status: 'active', metadata: {}, created_at: '', updated_at: '', started_at: '2026-03-30T08:00:00Z' },
      ],
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order Tracking' })).toBeDefined();
      expect(screen.getByText('JOB-001')).toBeDefined();
      expect(screen.getByText('BRK-1001')).toBeDefined();
      expect(screen.getByText('Milestone timeline')).toBeDefined();
      expect(screen.getByText('PRISM milestone copilot')).toBeDefined();
      expect(screen.getByText('Production Run')).toBeDefined();
    });
  });

  it('preserves job context through execution handoff links', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'WO-001',
            job_id: 'JOB-001',
            status: 'in_progress',
            machine: 'VF-2SS',
            est_hours: 5,
            actual_hours: 2,
            quantity: 24,
            part_number: 'BRK-1001',
            notes: 'Fixture staged',
          },
        ],
      },
    } as any);

    renderPage([
      '/order-tracking?originSource=customers&source=jobs&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001&jobId=JOB-001',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Jobs opened Order Tracking with execution context/i)).toBeDefined();
      expect(screen.getByText(/Upstream order origin:/i)).toBeDefined();
    });

    const jobsHref = screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href') ?? '';
    expect(jobsHref).toContain('/jobs?');
    expect(jobsHref).toContain('source=order-tracking');
    expect(jobsHref).toContain('originSource=customers');
    expect(jobsHref).toContain('focusJobId=JOB-001');

    const invoicesHref = screen.getByRole('link', { name: /Open Invoices follow-up/i }).getAttribute('href') ?? '';
    expect(invoicesHref).toContain('/invoices?');
    expect(invoicesHref).toContain('source=order-tracking');
    expect(invoicesHref).toContain('originSource=customers');

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=order-tracking');
    expect(messagesHref).toContain('originSource=customers');
  });

  it('seeds milestone intelligence when a new work order is created', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [],
      },
    } as any);
    mockOrderCreate.mockResolvedValue({
      result: { id: 'WO-NEW', job_id: 'JOB-NEW' },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order Tracking' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'JOB-NEW' } });
    fireEvent.change(screen.getByLabelText('Part number'), { target: { value: 'BRK-9001' } });
    fireEvent.change(screen.getByLabelText('Machine'), { target: { value: 'VF-2SS' } });
    fireEvent.click(screen.getByRole('button', { name: /Create order/i }));

    await waitFor(() => {
      expect(mockOrderCreate).toHaveBeenCalled();
    });
    expect(mockMilestoneSyncMutation).toHaveBeenCalledWith('JOB-NEW', expect.objectContaining({
      source: 'order-tracking',
      trigger: 'order-created',
    }));
  });

  it('records execution updates into PRISM sync memory and aligns the timeline', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'WO-001',
            job_id: 'JOB-001',
            status: 'planned',
            machine: 'VF-2SS',
            est_hours: 5,
            actual_hours: 1,
            quantity: 24,
            part_number: 'BRK-1001',
            notes: 'Ready for prove-out',
          },
        ],
      },
    } as any);
    mockOrderLogTime.mockResolvedValue({
      result: { saved: true },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('JOB-001')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Execution' }));
    fireEvent.change(screen.getByLabelText('Order ID'), { target: { value: 'WO-001' } });
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: 'EMP-007' } });
    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'Setup prove-out' } });
    fireEvent.click(screen.getByRole('button', { name: /Save execution update/i }));

    await waitFor(() => {
      expect(mockOrderLogTime).toHaveBeenCalled();
    });
    expect(mockMilestoneSyncMutation).toHaveBeenCalledWith('JOB-001', expect.objectContaining({
      source: 'order-tracking',
      trigger: 'order-time-logged',
      operation: 'Setup prove-out',
    }));
    expect(await screen.findByText('PRISM sync memory')).toBeDefined();
  });
});
