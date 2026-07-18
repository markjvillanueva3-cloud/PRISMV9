import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import {
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
  };
});

const mockOrderList = vi.mocked(orderList);
const mockOrderMachineQueue = vi.mocked(orderMachineQueue);
const mockOrderMetrics = vi.mocked(orderMetrics);
const mockOrderCreate = vi.mocked(orderCreate);
const mockOrderLogTime = vi.mocked(orderLogTime);
const mockOrderLogProduction = vi.mocked(orderLogProduction);
const mockOrderUpdateStatus = vi.mocked(orderUpdateStatus);
const fetchMock = vi.fn();

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <OrderTrackingPage />
    </MemoryRouter>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

beforeEach(() => {
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
            subcategory: 'order_control_brief',
            confidence: 0.9,
            tier: 'multi_domain',
            domains: ['orders', 'operations'],
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
            domains: ['orders', 'operations', 'erp'],
            complexity: 'high',
            reason: 'Order-control guidance spans execution, queue posture, and downstream billing follow-up.',
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
          task_id: 'TASK-ORDER-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'orders',
              result: {
                summary: 'Protect queue flow and confirm the next execution update before billing handoff.',
              },
            },
          ],
          final_result: {
            summary: 'Protect queue flow and confirm the next execution update before billing handoff.',
          },
          authority_resolution: {
            winning_source: 'proven',
            confidence: 0.93,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Review queue bottlenecks before changing the active work order.',
            'Verify execution status before opening billing follow-up.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  mockOrderList.mockReset();
  mockOrderMachineQueue.mockReset();
  mockOrderMetrics.mockReset();
  mockOrderCreate.mockReset();
  mockOrderLogTime.mockReset();
  mockOrderLogProduction.mockReset();
  mockOrderUpdateStatus.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
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

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order Tracking' })).toBeDefined();
      expect(screen.getByText('JOB-001')).toBeDefined();
      expect(screen.getByText('BRK-1001')).toBeDefined();
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

    const jobsUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href') ?? '');
    expect(jobsUrl.pathname).toBe('/jobs');
    expect(jobsUrl.searchParams.get('source')).toBe('order-tracking');
    expect(jobsUrl.searchParams.get('originSource')).toBe('customers');
    expect(jobsUrl.searchParams.get('originType')).toBe('Customer');
    expect(jobsUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(jobsUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(jobsUrl.searchParams.get('focusType')).toBe('job');
    expect(jobsUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(jobsUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    const invoicesUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Invoices follow-up/i }).getAttribute('href') ?? '');
    expect(invoicesUrl.pathname).toBe('/invoices');
    expect(invoicesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(invoicesUrl.searchParams.get('originSource')).toBe('customers');
    expect(invoicesUrl.searchParams.get('originType')).toBe('Customer');
    expect(invoicesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(invoicesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(invoicesUrl.searchParams.get('focusType')).toBe('job');
    expect(invoicesUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(invoicesUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    const messagesUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '');
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('originType')).toBe('Customer');
    expect(messagesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(messagesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(messagesUrl.searchParams.get('focusType')).toBe('job');
    expect(messagesUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(messagesUrl.searchParams.get('focusJobId')).toBe('JOB-001');
  });

  it('preserves explicit packet focus on follow-up links while still carrying the active job id', async () => {
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
      '/order-tracking?source=jobs-desk&originSource=messages&originType=Quote&originId=QUOTE-900&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&jobId=JOB-001&note=Keep%20release%20packet%20attached',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Jobs desk opened Order Tracking with execution context/i)).toBeDefined();
      expect(screen.getByText(/Upstream order origin:/i)).toBeDefined();
    });

    const jobsUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href') ?? '');
    expect(jobsUrl.pathname).toBe('/jobs');
    expect(jobsUrl.searchParams.get('source')).toBe('order-tracking');
    expect(jobsUrl.searchParams.get('originSource')).toBe('messages');
    expect(jobsUrl.searchParams.get('originType')).toBe('Quote');
    expect(jobsUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(jobsUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(jobsUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(jobsUrl.searchParams.get('focusType')).toBe('packet');
    expect(jobsUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(jobsUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(jobsUrl.searchParams.get('focusJobId')).toBeNull();

    const invoicesUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Invoices follow-up/i }).getAttribute('href') ?? '');
    expect(invoicesUrl.pathname).toBe('/invoices');
    expect(invoicesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(invoicesUrl.searchParams.get('originSource')).toBe('messages');
    expect(invoicesUrl.searchParams.get('originType')).toBe('Quote');
    expect(invoicesUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(invoicesUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(invoicesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(invoicesUrl.searchParams.get('focusType')).toBe('packet');
    expect(invoicesUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(invoicesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(invoicesUrl.searchParams.get('focusJobId')).toBeNull();

    const messagesUrl = parseRelativeUrl(screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '');
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(messagesUrl.searchParams.get('originSource')).toBe('messages');
    expect(messagesUrl.searchParams.get('originType')).toBe('Quote');
    expect(messagesUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(messagesUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(messagesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(messagesUrl.searchParams.get('focusType')).toBe('packet');
    expect(messagesUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(messagesUrl.searchParams.get('focusJobId')).toBeNull();
  });

  it('keeps the Kienzle AI copilot built into the order desk and auto-briefs live order context', async () => {
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
    mockOrderMachineQueue.mockResolvedValue({
      result: {
        queue: [
          {
            machine: 'VF-2SS',
            current_job: 'JOB-001',
            queue_depth: 3,
            est_completion: '2026-04-16T10:00:00Z',
          },
        ],
      },
    } as any);
    mockOrderMetrics.mockResolvedValue({
      result: {
        total_orders: 4,
        on_time_pct: 92,
        avg_lead_days: 5,
        queue_depth: 3,
        active_work_orders: 2,
      },
    } as any);

    renderPage(['/order-tracking?source=jobs&jobId=JOB-001']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order Tracking' })).toBeDefined();
      expect(screen.getByText('JOB-001')).toBeDefined();
    });
    await waitFor(() => expect(screen.getByText(/Kienzle AI copilot/i)).toBeDefined());
    await waitFor(() => expect(screen.getByText(/Autonomous desk brief on/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() => expect(screen.getByText(/Review queue bottlenecks before changing the active work order\./i)).toBeDefined());
  });

  it('refreshes the live workspace after creating an order', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'WO-001',
            job_id: 'JOB-001',
            status: 'planned',
            machine: 'VF-2SS',
            est_hours: 5,
            actual_hours: 0,
            quantity: 12,
            part_number: 'BRK-1001',
          },
        ],
      },
    } as any);
    mockOrderMachineQueue.mockResolvedValue({ result: { queue: [] } } as any);
    mockOrderMetrics.mockResolvedValue({
      result: {
        total_orders: 1,
        on_time_pct: 100,
        avg_lead_days: 4,
        queue_depth: 0,
        active_work_orders: 1,
      },
    } as any);
    mockOrderCreate.mockResolvedValue({
      result: {
        id: 'WO-002',
        job_id: 'JOB-002',
        status: 'planned',
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('JOB-001')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'JOB-002' } });
    fireEvent.change(screen.getByLabelText('Part number'), { target: { value: 'BRK-2002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create order' }));

    await waitFor(() => {
      expect(mockOrderCreate).toHaveBeenCalledTimes(1);
      expect(mockOrderList).toHaveBeenCalledTimes(2);
      expect(mockOrderMachineQueue).toHaveBeenCalledTimes(1);
      expect(mockOrderMetrics).toHaveBeenCalledTimes(1);
    });
  });

  it('refreshes the live workspace after saving an execution update', async () => {
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
          },
        ],
      },
    } as any);
    mockOrderMachineQueue.mockResolvedValue({ result: { queue: [] } } as any);
    mockOrderMetrics.mockResolvedValue({
      result: {
        total_orders: 1,
        on_time_pct: 98,
        avg_lead_days: 5,
        queue_depth: 1,
        active_work_orders: 1,
      },
    } as any);
    mockOrderLogTime.mockResolvedValue({
      result: {
        saved: true,
        order_id: 'WO-001',
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('JOB-001')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Execution' }));
    fireEvent.change(screen.getByLabelText('Order ID'), { target: { value: 'WO-001' } });
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: 'EMP-001' } });
    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'Roughing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save execution update' }));

    await waitFor(() => {
      expect(mockOrderLogTime).toHaveBeenCalledTimes(1);
      expect(mockOrderList).toHaveBeenCalledTimes(2);
      expect(mockOrderMachineQueue).toHaveBeenCalledTimes(1);
      expect(mockOrderMetrics).toHaveBeenCalledTimes(1);
    });
  });
});
