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
import { ApiError, glChartOfAccounts, jobDashboard, listInvoices, milestoneAdvance, milestoneCreateTimeline, milestoneGetTimeline, orderList } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    jobDashboard: vi.fn(),
    orderList: vi.fn(),
    listInvoices: vi.fn(),
    glChartOfAccounts: vi.fn(),
    milestoneGetTimeline: vi.fn(),
    milestoneCreateTimeline: vi.fn(),
    milestoneAdvance: vi.fn(),
  };
});

const mockJobDashboard = vi.mocked(jobDashboard);
const mockOrderList = vi.mocked(orderList);
const mockListInvoices = vi.mocked(listInvoices);
const mockGlChartOfAccounts = vi.mocked(glChartOfAccounts);
const mockMilestoneGetTimeline = vi.mocked(milestoneGetTimeline);
const mockMilestoneCreateTimeline = vi.mocked(milestoneCreateTimeline);
const mockMilestoneAdvance = vi.mocked(milestoneAdvance);

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

describe('order tracking continuity chain', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    clearShellSession();
    vi.clearAllMocks();
    mockMilestoneGetTimeline.mockRejectedValue(new ApiError(404, 'No milestone found for job'));
    mockMilestoneCreateTimeline.mockResolvedValue({} as any);
    mockMilestoneAdvance.mockResolvedValue({} as any);

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
    const orderTrackingHref = orderTrackingLink.getAttribute('href') ?? '';
    expect(orderTrackingHref).toContain('/order-tracking?');
    expect(orderTrackingHref).toContain('source=jobs-desk');
    expect(orderTrackingHref).toContain('originSource=customers');
    expect(orderTrackingHref).toContain('focusJobId=JOB-001');

    fireEvent.click(orderTrackingLink);

    await waitFor(() => {
      expect(screen.getByText(/Jobs desk opened Order Tracking with execution context/i)).toBeDefined();
      expect(screen.getByText(/Upstream order origin:/i)).toBeDefined();
    });

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const messagesHref = messagesLink.getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=order-tracking');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusJobId=JOB-001');

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
    const invoicesHref = invoicesLink.getAttribute('href') ?? '';
    expect(invoicesHref).toContain('/invoices?');
    expect(invoicesHref).toContain('source=order-tracking');
    expect(invoicesHref).toContain('originSource=customers');
    expect(invoicesHref).toContain('focusJobId=JOB-001');

    fireEvent.click(invoicesLink);

    await waitFor(() => {
      expect(screen.getByText(/Order Tracking opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getByText(/Upstream billing origin:/i)).toBeDefined();
    });

    const generalLedgerLink = screen.getByRole('link', { name: /Open General Ledger follow-up/i });
    const generalLedgerHref = generalLedgerLink.getAttribute('href') ?? '';
    expect(generalLedgerHref).toContain('/general-ledger?');
    expect(generalLedgerHref).toContain('source=invoices');
    expect(generalLedgerHref).toContain('originSource=customers');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis/i });
    const financialAnalysisHref = financialAnalysisLink.getAttribute('href') ?? '';
    expect(financialAnalysisHref).toContain('/financial-analysis?');
    expect(financialAnalysisHref).toContain('source=general-ledger');
    expect(financialAnalysisHref).toContain('originSource=customers');

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
    });
  });
});
