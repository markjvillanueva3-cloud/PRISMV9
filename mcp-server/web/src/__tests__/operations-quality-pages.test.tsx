import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { ExportsPage } from '../pages/ExportsPage';
import { QualityManagementPage } from '../pages/QualityManagementPage';
import {
  integrationExportQB,
  integrationFormats,
  integrationReconcileBank,
  orderCreate,
  orderList,
  orderMachineQueue,
  orderMetrics,
  qualityCalibrationDashboard,
  qualityFAIList,
  qualityKPIs,
  qualityNCRList,
  qualityTraceJob,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    orderList: vi.fn(),
    orderMachineQueue: vi.fn(),
    orderMetrics: vi.fn(),
    orderCreate: vi.fn(),
    integrationFormats: vi.fn(),
    integrationReconcileBank: vi.fn(),
    integrationExportQB: vi.fn(),
    qualityKPIs: vi.fn(),
    qualityCalibrationDashboard: vi.fn(),
    qualityNCRList: vi.fn(),
    qualityFAIList: vi.fn(),
    qualityTraceJob: vi.fn(),
  };
});

const mockOrderList = vi.mocked(orderList);
const mockOrderMachineQueue = vi.mocked(orderMachineQueue);
const mockOrderMetrics = vi.mocked(orderMetrics);
const mockOrderCreate = vi.mocked(orderCreate);
const mockIntegrationFormats = vi.mocked(integrationFormats);
const mockIntegrationReconcileBank = vi.mocked(integrationReconcileBank);
const mockIntegrationExportQB = vi.mocked(integrationExportQB);
const mockQualityKpis = vi.mocked(qualityKPIs);
const mockQualityCalibrationDashboard = vi.mocked(qualityCalibrationDashboard);
const mockQualityNcrList = vi.mocked(qualityNCRList);
const mockQualityFaiList = vi.mocked(qualityFAIList);
const mockQualityTraceJob = vi.mocked(qualityTraceJob);

beforeEach(() => {
  mockOrderList.mockReset();
  mockOrderMachineQueue.mockReset();
  mockOrderMetrics.mockReset();
  mockOrderCreate.mockReset();
  mockIntegrationFormats.mockReset();
  mockIntegrationReconcileBank.mockReset();
  mockIntegrationExportQB.mockReset();
  mockQualityKpis.mockReset();
  mockQualityCalibrationDashboard.mockReset();
  mockQualityNcrList.mockReset();
  mockQualityFaiList.mockReset();
  mockQualityTraceJob.mockReset();
  mockOrderMachineQueue.mockResolvedValue({
    result: { queue: [] },
    safety: { score: 0.95, warnings: [] },
    meta: { formula_used: 'queue', uncertainty: 0.05 },
  } as any);
  mockOrderMetrics.mockResolvedValue({
    result: {
      total_orders: 12,
      on_time_pct: 92,
      avg_lead_days: 9,
      queue_depth: 4,
      active_work_orders: 7,
    },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'metrics', uncertainty: 0.06 },
  } as any);
  mockQualityCalibrationDashboard.mockResolvedValue({
    result: { calibrations: [] },
    safety: { score: 0.93, warnings: [] },
    meta: { formula_used: 'quality-cal', uncertainty: 0.07 },
  } as any);
  mockQualityNcrList.mockResolvedValue({
    result: { ncrs: [] },
    safety: { score: 0.93, warnings: [] },
    meta: { formula_used: 'quality-ncr', uncertainty: 0.07 },
  } as any);
  mockQualityFaiList.mockResolvedValue({
    result: { fais: [] },
    safety: { score: 0.93, warnings: [] },
    meta: { formula_used: 'quality-fai', uncertainty: 0.07 },
  } as any);
});

afterEach(() => {
  cleanup();
});

describe('frontend roadmap operations and quality pages', () => {
  it('renders the rebuilt order tracking workspace and can create an order', async () => {
    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          { id: 'WO-001', job_id: 'JOB-001', status: 'in_progress', machine: 'VF-2SS', est_hours: 4, actual_hours: 2 },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'order-list', uncertainty: 0.05 },
    } as any);
    mockOrderCreate.mockResolvedValue({
      result: { order_id: 'WO-002', status: 'created' },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'order-create', uncertainty: 0.06 },
    } as any);

    render(
      <MemoryRouter>
        <OrderTrackingPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Order Tracking' })).toBeDefined();
    expect(await screen.findByText('JOB-001')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.change(screen.getByPlaceholderText('JOB-2026-001'), { target: { value: 'JOB-002' } });
    fireEvent.click(screen.getByRole('button', { name: /Create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/WO-002/i)).toBeDefined();
    });
  });

  it('renders exports workspace formats and reconciliation output', async () => {
    mockIntegrationFormats.mockResolvedValue({
      result: {
        formats: [
          { format: 'QuickBooks IIF', description: 'Accountant-ready import package.', use_case: 'Monthly close' },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'export-formats', uncertainty: 0.05 },
    } as any);
    mockIntegrationReconcileBank.mockResolvedValue({
      result: {
        statement_date: '2026-03-26',
        bank_balance: 50000,
        book_balance: 49750,
        adjusted_bank: 49750,
        adjusted_book: 49750,
        reconciled: true,
        difference: 0,
      },
      safety: { score: 0.96, warnings: [] },
      meta: { formula_used: 'bank-reconcile', uncertainty: 0.04 },
    } as any);
    mockIntegrationExportQB.mockResolvedValue({
      result: { format: 'IIF', entries: 84 },
      safety: { score: 0.93, warnings: [] },
      meta: { formula_used: 'qb-export', uncertainty: 0.07 },
    } as any);

    render(
      <MemoryRouter>
        <ExportsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Exports' })).toBeDefined();
    expect(await screen.findByText('QuickBooks IIF')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    fireEvent.change(screen.getByPlaceholderText('50000'), { target: { value: '50000' } });
    fireEvent.change(screen.getByPlaceholderText('48500'), { target: { value: '49750' } });
    fireEvent.click(screen.getByRole('button', { name: /Reconcile bank statement/i }));

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'QuickBooks' }));
    fireEvent.click(screen.getByRole('button', { name: /Generate QB export/i }));

    await waitFor(() => {
      expect(screen.getByText(/"entries": 84/i)).toBeDefined();
    });
  });

  it('renders quality KPIs and traceability output in the rebuilt quality workspace', async () => {
    mockQualityKpis.mockResolvedValue({
      result: {
        first_pass_yield: 97.2,
        scrap_rate: 1.1,
        ncr_count: 2,
        calibration_compliance: 98.5,
        fai_count: 11,
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'quality-kpi', uncertainty: 0.05 },
    } as any);
    mockQualityTraceJob.mockResolvedValue({
      result: { job_id: 'JOB-2026-001', lot: 'HL-42', inspection_records: 3 },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'trace-job', uncertainty: 0.06 },
    } as any);

    render(
      <MemoryRouter>
        <QualityManagementPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Quality Management' })).toBeDefined();
    expect((await screen.findAllByText('97.2%')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Run traceability/i }));
    await screen.findByText('Traceability lookup');
    const traceInput = screen.getByLabelText('Job ID');
    fireEvent.change(traceInput, { target: { value: 'JOB-2026-001' } });
    const traceButton = await screen.findByRole('button', { name: /Trace job/i });
    fireEvent.click(traceButton);

    await waitFor(() => {
      expect(screen.getByText(/"inspection_records": 3/i)).toBeDefined();
    });
  });

  it('preserves upstream quote context and forwards quality follow-up', async () => {
    mockQualityFaiList.mockResolvedValue({
      result: {
        fais: [
          {
            id: 'FAI-10',
            part_number: 'MANIFOLD-7',
            job_id: 'JOB-77',
            inspector: 'QA-01',
            date: '2026-03-27',
            characteristics: [{ id: 'c1' }],
            overall_pass: true,
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'quality-fai', uncertainty: 0.05 },
    } as any);

    render(
      <MemoryRouter
        initialEntries={[
          '/quality?source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quote&focusId=quote-4140&focusQuoteId=quote-4140&tab=fai',
        ]}
      >
        <QualityManagementPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/opened Quality Management with workflow context/i)).toBeDefined();
    expect(screen.getByText(/Customers & CRM/i)).toBeDefined();
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/FAI FAI-10/i)).toBeDefined();

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=quality-management');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=quote');

    const jobsHref = screen.getByRole('link', { name: /Return to Jobs/i }).getAttribute('href') ?? '';
    expect(jobsHref).toContain('/jobs?');
    expect(jobsHref).toContain('source=quality-management');
    expect(jobsHref).toContain('originSource=customers');
  });
});
