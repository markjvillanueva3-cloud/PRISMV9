import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PayrollPage } from '../pages/PayrollPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { GeneralLedgerPage } from '../pages/GeneralLedgerPage';
import { ExportsPage } from '../pages/ExportsPage';
import { FinancialAnalysisPage } from '../pages/FinancialAnalysisPage';
import { glChartOfAccounts, integrationFormats, listInvoices } from '../api/client';

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
    glChartOfAccounts: vi.fn(),
    integrationFormats: vi.fn(),
    listInvoices: vi.fn(),
  };
});

const mockGlChartOfAccounts = vi.mocked(glChartOfAccounts);
const mockIntegrationFormats = vi.mocked(integrationFormats);
const mockListInvoices = vi.mocked(listInvoices);

function renderFinanceWorkflow(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/general-ledger" element={<GeneralLedgerPage />} />
        <Route path="/exports" element={<ExportsPage />} />
        <Route path="/financial-analysis" element={<FinancialAnalysisPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

beforeEach(() => {
  mockGlChartOfAccounts.mockReset();
  mockIntegrationFormats.mockReset();
  mockListInvoices.mockReset();

  mockGlChartOfAccounts.mockResolvedValue({
    result: {
      accounts: [{ number: '1000', name: 'Cash', type: 'asset', balance: 250000 }],
    },
  } as any);

  mockIntegrationFormats.mockResolvedValue({
    result: {
      formats: [
        { format: 'QuickBooks IIF', description: 'Intuit interchange', use_case: 'Import to QB' },
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
});

describe('finance continuity chain', () => {
  it('preserves workforce context from payroll through general ledger into exports', async () => {
    renderFinanceWorkflow(
      '/payroll?source=timecards&originSource=employee-directory&originType=Employee&recordType=Employee&originId=EMP-001&recordId=EMP-001&focusType=employee&focusId=EMP-001&employeeId=EMP-001',
    );

    expect(screen.getByText(/Timecards opened Payroll with workforce context/i)).toBeDefined();
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();

    const generalLedgerLink = screen.getByRole('link', { name: /Open General Ledger follow-up/i });
    const generalLedgerUrl = parseRelativeUrl(generalLedgerLink.getAttribute('href') ?? '');
    expect(generalLedgerUrl.pathname).toBe('/general-ledger');
    expect(generalLedgerUrl.searchParams.get('source')).toBe('payroll');
    expect(generalLedgerUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(generalLedgerUrl.searchParams.get('originType')).toBe('Employee');
    expect(generalLedgerUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(generalLedgerUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(generalLedgerUrl.searchParams.get('focusType')).toBe('employee');
    expect(generalLedgerUrl.searchParams.get('focusId')).toBe('EMP-001');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Payroll opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const exportsLink = screen.getByRole('link', { name: /Open Exports follow-up/i });
    const exportsUrl = parseRelativeUrl(exportsLink.getAttribute('href') ?? '');
    expect(exportsUrl.pathname).toBe('/exports');
    expect(exportsUrl.searchParams.get('source')).toBe('general-ledger');
    expect(exportsUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(exportsUrl.searchParams.get('originType')).toBe('Employee');
    expect(exportsUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(exportsUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(exportsUrl.searchParams.get('focusType')).toBe('employee');
    expect(exportsUrl.searchParams.get('focusId')).toBe('EMP-001');

    fireEvent.click(exportsLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Exports with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
    });

    const payrollLink = screen.getByRole('link', { name: /Return to Payroll/i });
    const payrollUrl = parseRelativeUrl(payrollLink.getAttribute('href') ?? '');
    expect(payrollUrl.pathname).toBe('/payroll');
    expect(payrollUrl.searchParams.get('source')).toBe('exports');
    expect(payrollUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(payrollUrl.searchParams.get('originType')).toBe('Employee');
    expect(payrollUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('focusType')).toBe('employee');
    expect(payrollUrl.searchParams.get('focusId')).toBe('EMP-001');

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis follow-up/i });
    const financialAnalysisUrl = parseRelativeUrl(financialAnalysisLink.getAttribute('href') ?? '');
    expect(financialAnalysisUrl.pathname).toBe('/financial-analysis');
    expect(financialAnalysisUrl.searchParams.get('source')).toBe('exports');
    expect(financialAnalysisUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(financialAnalysisUrl.searchParams.get('originType')).toBe('Employee');
    expect(financialAnalysisUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(financialAnalysisUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(financialAnalysisUrl.searchParams.get('focusType')).toBe('employee');
    expect(financialAnalysisUrl.searchParams.get('focusId')).toBe('EMP-001');

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/Exports opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
    });

    const backToLedgerLink = screen.getByRole('link', { name: /Return to General Ledger/i });
    const backToLedgerUrl = parseRelativeUrl(backToLedgerLink.getAttribute('href') ?? '');
    expect(backToLedgerUrl.pathname).toBe('/general-ledger');
    expect(backToLedgerUrl.searchParams.get('source')).toBe('financial-analysis');
    expect(backToLedgerUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(backToLedgerUrl.searchParams.get('originType')).toBe('Employee');
    expect(backToLedgerUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(backToLedgerUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(backToLedgerUrl.searchParams.get('focusType')).toBe('employee');
    expect(backToLedgerUrl.searchParams.get('focusId')).toBe('EMP-001');
  });

  it('preserves commercial context from invoices through general ledger into financial analysis', async () => {
    renderFinanceWorkflow(
      '/invoices?originSource=customers&source=jobs&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001',
    );

    await waitFor(() => {
      expect(screen.getByText(/Jobs opened Invoices with billing context/i)).toBeDefined();
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
    expect(generalLedgerUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(generalLedgerUrl.searchParams.get('focusType')).toBe('job');
    expect(generalLedgerUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(generalLedgerUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
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

    const backToInvoicesLink = screen.getByRole('link', { name: /Return to Invoices/i });
    const backToInvoicesUrl = parseRelativeUrl(backToInvoicesLink.getAttribute('href') ?? '');
    expect(backToInvoicesUrl.pathname).toBe('/invoices');
    expect(backToInvoicesUrl.searchParams.get('source')).toBe('financial-analysis');
    expect(backToInvoicesUrl.searchParams.get('originSource')).toBe('customers');
    expect(backToInvoicesUrl.searchParams.get('originType')).toBe('Customer');
    expect(backToInvoicesUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(backToInvoicesUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(backToInvoicesUrl.searchParams.get('focusType')).toBe('job');
    expect(backToInvoicesUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(backToInvoicesUrl.searchParams.get('focusJobId')).toBe('JOB-001');
  });

  it('preserves packet and invoice context from invoices through exports into financial analysis', async () => {
    renderFinanceWorkflow(
      '/invoices?source=order-tracking&originSource=messages&originType=Quote&recordType=Quote&originId=QUOTE-900&recordId=QUOTE-900&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300',
    );

    await waitFor(() => {
      expect(screen.getByText(/Order Tracking opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getByText(/Upstream billing origin:/i)).toBeDefined();
    });

    const generalLedgerLink = screen.getByRole('link', { name: /Open General Ledger follow-up/i });
    const generalLedgerUrl = parseRelativeUrl(generalLedgerLink.getAttribute('href') ?? '');
    expect(generalLedgerUrl.pathname).toBe('/general-ledger');
    expect(generalLedgerUrl.searchParams.get('source')).toBe('invoices');
    expect(generalLedgerUrl.searchParams.get('originSource')).toBe('messages');
    expect(generalLedgerUrl.searchParams.get('originType')).toBe('Quote');
    expect(generalLedgerUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(generalLedgerUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(generalLedgerUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(generalLedgerUrl.searchParams.get('focusType')).toBe('packet');
    expect(generalLedgerUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(generalLedgerUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(generalLedgerUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Quote QUOTE-900/i)).toBeDefined();
    });

    const exportsLink = screen.getByRole('link', { name: /Open Exports follow-up/i });
    const exportsUrl = parseRelativeUrl(exportsLink.getAttribute('href') ?? '');
    expect(exportsUrl.pathname).toBe('/exports');
    expect(exportsUrl.searchParams.get('source')).toBe('general-ledger');
    expect(exportsUrl.searchParams.get('originSource')).toBe('messages');
    expect(exportsUrl.searchParams.get('originType')).toBe('Quote');
    expect(exportsUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(exportsUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(exportsUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(exportsUrl.searchParams.get('focusType')).toBe('packet');
    expect(exportsUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(exportsUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(exportsUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(exportsLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Exports with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Quote QUOTE-900/i)).toBeDefined();
    });

    const backToLedgerLink = screen.getByRole('link', { name: /Return to General Ledger/i });
    const backToLedgerUrl = parseRelativeUrl(backToLedgerLink.getAttribute('href') ?? '');
    expect(backToLedgerUrl.pathname).toBe('/general-ledger');
    expect(backToLedgerUrl.searchParams.get('source')).toBe('exports');
    expect(backToLedgerUrl.searchParams.get('originSource')).toBe('messages');
    expect(backToLedgerUrl.searchParams.get('originType')).toBe('Quote');
    expect(backToLedgerUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(backToLedgerUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(backToLedgerUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(backToLedgerUrl.searchParams.get('focusType')).toBe('packet');
    expect(backToLedgerUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(backToLedgerUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(backToLedgerUrl.searchParams.get('focusJobId')).toBeNull();

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis follow-up/i });
    const financialAnalysisUrl = parseRelativeUrl(financialAnalysisLink.getAttribute('href') ?? '');
    expect(financialAnalysisUrl.pathname).toBe('/financial-analysis');
    expect(financialAnalysisUrl.searchParams.get('source')).toBe('exports');
    expect(financialAnalysisUrl.searchParams.get('originSource')).toBe('messages');
    expect(financialAnalysisUrl.searchParams.get('originType')).toBe('Quote');
    expect(financialAnalysisUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(financialAnalysisUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(financialAnalysisUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(financialAnalysisUrl.searchParams.get('focusType')).toBe('packet');
    expect(financialAnalysisUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(financialAnalysisUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(financialAnalysisUrl.searchParams.get('focusJobId')).toBeNull();

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/Exports opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Quote QUOTE-900/i)).toBeDefined();
    });

    const backToInvoicesLink = screen.getByRole('link', { name: /Return to Invoices/i });
    const backToInvoicesUrl = parseRelativeUrl(backToInvoicesLink.getAttribute('href') ?? '');
    expect(backToInvoicesUrl.pathname).toBe('/invoices');
    expect(backToInvoicesUrl.searchParams.get('source')).toBe('financial-analysis');
    expect(backToInvoicesUrl.searchParams.get('originSource')).toBe('messages');
    expect(backToInvoicesUrl.searchParams.get('originType')).toBe('Quote');
    expect(backToInvoicesUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(backToInvoicesUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(backToInvoicesUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(backToInvoicesUrl.searchParams.get('focusType')).toBe('packet');
    expect(backToInvoicesUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(backToInvoicesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(backToInvoicesUrl.searchParams.get('focusJobId')).toBeNull();
  });
});
