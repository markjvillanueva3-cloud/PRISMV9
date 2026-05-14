// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JobsPage } from '../pages/JobsPage';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { MessagesPage } from '../pages/MessagesPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { GeneralLedgerPage } from '../pages/GeneralLedgerPage';
import { FinancialAnalysisPage } from '../pages/FinancialAnalysisPage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { clearShellSession, persistAdminShellSession } from '../features/operating-system/shellSession';
import { glChartOfAccounts, jobDashboard, listInvoices, orderList } from '../api/client';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    jobDashboard: vi.fn(),
    orderList: vi.fn(),
    listInvoices: vi.fn(),
    glChartOfAccounts: vi.fn(),
  };
});

const mockJobDashboard = vi.mocked(jobDashboard);
const mockOrderList = vi.mocked(orderList);
const mockListInvoices = vi.mocked(listInvoices);
const mockGlChartOfAccounts = vi.mocked(glChartOfAccounts);

function renderWorkflow(initialEntry: string) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/order-tracking" element={<OrderTrackingPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/general-ledger" element={<GeneralLedgerPage />} />
          <Route path="/financial-analysis" element={<FinancialAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

describe('order tracking continuity chain', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    clearShellSession();
    vi.clearAllMocks();

    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

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
            customer: 'Acme Aerospace',
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

    mockListInvoices.mockResolvedValue({
      result: {
        invoices: [
          {
            id: 'INV-001',
            job_id: 'JOB-001',
            customer_name: 'Acme Aerospace',
            date: '2026-03-20',
            due_date: '2026-04-20',
            line_items: [],
            subtotal: 1200,
            tax: 0,
            total: 1200,
            status: 'sent',
            payments: [],
            balance_due: 1200,
          },
        ],
      },
    } as any);

    mockGlChartOfAccounts.mockResolvedValue({
      result: {
        accounts: [{ number: '1000', name: 'Cash', type: 'asset', balance: 250000 }],
      },
    } as any);
  });

  it('preserves commercial provenance from jobs through order tracking into messages', async () => {
    renderWorkflow(
      '/jobs?source=quote-builder&originSource=customers&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001',
    );

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Jobs with context/i)).toBeDefined();
    });

    const orderTrackingLink = screen.getByRole('link', { name: /Open Order Tracking/i });
    const orderTrackingUrl = parseRelativeUrl(orderTrackingLink.getAttribute('href') ?? '');
    expect(orderTrackingUrl.pathname).toBe('/order-tracking');
    expect(orderTrackingUrl.searchParams.get('source')).toBe('jobs-desk');
    expect(orderTrackingUrl.searchParams.get('originSource')).toBe('customers');
    expect(orderTrackingUrl.searchParams.get('originType')).toBe('Customer');
    expect(orderTrackingUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(orderTrackingUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(orderTrackingUrl.searchParams.get('focusType')).toBe('job');
    expect(orderTrackingUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(orderTrackingUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(orderTrackingLink);

    await waitFor(() => {
      expect(screen.getByText(/Jobs desk opened Order Tracking with execution context/i)).toBeDefined();
      expect(screen.getByText(/Upstream order origin:/i)).toBeDefined();
    });

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const messagesUrl = parseRelativeUrl(messagesLink.getAttribute('href') ?? '');
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('originType')).toBe('Customer');
    expect(messagesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(messagesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(messagesUrl.searchParams.get('focusType')).toBe('job');
    expect(messagesUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(messagesUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(messagesLink);

    await waitFor(() => {
      expect(screen.getByText(/Order Tracking opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText(/Customers & CRM/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Focus:/)).toBeDefined();
    });
  });

  it('bridges jobs through order tracking into invoices, ledger review, and financial analysis', async () => {
    renderWorkflow(
      '/jobs?source=quote-builder&originSource=customers&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001',
    );

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Jobs with context/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('link', { name: /Open Order Tracking/i }));

    await waitFor(() => {
      expect(screen.getByText(/Jobs desk opened Order Tracking with execution context/i)).toBeDefined();
    });

    const invoicesLink = screen.getByRole('link', { name: /Open Invoices follow-up/i });
    const invoicesUrl = parseRelativeUrl(invoicesLink.getAttribute('href') ?? '');
    expect(invoicesUrl.pathname).toBe('/invoices');
    expect(invoicesUrl.searchParams.get('source')).toBe('order-tracking');
    expect(invoicesUrl.searchParams.get('originSource')).toBe('customers');
    expect(invoicesUrl.searchParams.get('originType')).toBe('Customer');
    expect(invoicesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(invoicesUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(invoicesUrl.searchParams.get('focusType')).toBe('job');
    expect(invoicesUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(invoicesUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(invoicesLink);

    await waitFor(() => {
      expect(screen.getByText(/Order Tracking opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getByText(/Upstream billing origin:/i)).toBeDefined();
    });

    const generalLedgerLink = screen.getByRole('link', { name: /Open General Ledger follow-up/i });
    const generalLedgerUrl = parseRelativeUrl(generalLedgerLink.getAttribute('href') ?? '');
    expect(generalLedgerUrl.pathname).toBe('/general-ledger');
    expect(generalLedgerUrl.searchParams.get('source')).toBe('invoices');
    expect(generalLedgerUrl.searchParams.get('originSource')).toBe('customers');
    expect(generalLedgerUrl.searchParams.get('originType')).toBe('Customer');
    expect(generalLedgerUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(generalLedgerUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(generalLedgerUrl.searchParams.get('focusType')).toBe('job');
    expect(generalLedgerUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(generalLedgerUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis/i });
    const financialAnalysisUrl = parseRelativeUrl(financialAnalysisLink.getAttribute('href') ?? '');
    expect(financialAnalysisUrl.pathname).toBe('/financial-analysis');
    expect(financialAnalysisUrl.searchParams.get('source')).toBe('general-ledger');
    expect(financialAnalysisUrl.searchParams.get('originSource')).toBe('customers');
    expect(financialAnalysisUrl.searchParams.get('originType')).toBe('Customer');
    expect(financialAnalysisUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(financialAnalysisUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(financialAnalysisUrl.searchParams.get('focusType')).toBe('job');
    expect(financialAnalysisUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(financialAnalysisUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
    });
  });
});
