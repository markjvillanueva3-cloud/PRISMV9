import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PayrollPage } from '../pages/PayrollPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { GeneralLedgerPage } from '../pages/GeneralLedgerPage';
import { ExportsPage } from '../pages/ExportsPage';
import { FinancialAnalysisPage } from '../pages/FinancialAnalysisPage';
import { glChartOfAccounts, integrationFormats, listInvoices } from '../api/client';

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
    const generalLedgerHref = generalLedgerLink.getAttribute('href') ?? '';
    expect(generalLedgerHref).toContain('/general-ledger?');
    expect(generalLedgerHref).toContain('source=payroll');
    expect(generalLedgerHref).toContain('originSource=employee-directory');
    expect(generalLedgerHref).toContain('focusType=employee');
    expect(generalLedgerHref).toContain('employeeId=EMP-001');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Payroll opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const exportsLink = screen.getByRole('link', { name: /Open Exports follow-up/i });
    const exportsHref = exportsLink.getAttribute('href') ?? '';
    expect(exportsHref).toContain('/exports?');
    expect(exportsHref).toContain('source=general-ledger');
    expect(exportsHref).toContain('originSource=employee-directory');
    expect(exportsHref).toContain('focusType=employee');
    expect(exportsHref).toContain('employeeId=EMP-001');

    fireEvent.click(exportsLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Exports with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
    });

    const payrollLink = screen.getByRole('link', { name: /Return to Payroll/i });
    const payrollHref = payrollLink.getAttribute('href') ?? '';
    expect(payrollHref).toContain('/payroll?');
    expect(payrollHref).toContain('source=exports');
    expect(payrollHref).toContain('originSource=employee-directory');
    expect(payrollHref).toContain('employeeId=EMP-001');

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis follow-up/i });
    const financialAnalysisHref = financialAnalysisLink.getAttribute('href') ?? '';
    expect(financialAnalysisHref).toContain('/financial-analysis?');
    expect(financialAnalysisHref).toContain('source=exports');
    expect(financialAnalysisHref).toContain('originSource=employee-directory');
    expect(financialAnalysisHref).toContain('employeeId=EMP-001');

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/Exports opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Employee EMP-001/i)).toBeDefined();
    });

    const backToLedgerLink = screen.getByRole('link', { name: /Return to General Ledger/i });
    const backToLedgerHref = backToLedgerLink.getAttribute('href') ?? '';
    expect(backToLedgerHref).toContain('/general-ledger?');
    expect(backToLedgerHref).toContain('source=financial-analysis');
    expect(backToLedgerHref).toContain('originSource=employee-directory');
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
    const generalLedgerHref = generalLedgerLink.getAttribute('href') ?? '';
    expect(generalLedgerHref).toContain('/general-ledger?');
    expect(generalLedgerHref).toContain('source=invoices');
    expect(generalLedgerHref).toContain('originSource=customers');
    expect(generalLedgerHref).toContain('focusJobId=JOB-001');

    fireEvent.click(generalLedgerLink);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
    });

    const financialAnalysisLink = screen.getByRole('link', { name: /Open Financial Analysis/i });
    const financialAnalysisHref = financialAnalysisLink.getAttribute('href') ?? '';
    expect(financialAnalysisHref).toContain('/financial-analysis?');
    expect(financialAnalysisHref).toContain('source=general-ledger');
    expect(financialAnalysisHref).toContain('originSource=customers');
    expect(financialAnalysisHref).toContain('focusJobId=JOB-001');

    fireEvent.click(financialAnalysisLink);

    await waitFor(() => {
      expect(screen.getByText(/General Ledger opened Financial Analysis with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
      expect(screen.getByText(/Customer CUST-001/i)).toBeDefined();
    });

    const backToInvoicesLink = screen.getByRole('link', { name: /Return to Invoices/i });
    const backToInvoicesHref = backToInvoicesLink.getAttribute('href') ?? '';
    expect(backToInvoicesHref).toContain('/invoices?');
    expect(backToInvoicesHref).toContain('source=financial-analysis');
    expect(backToInvoicesHref).toContain('originSource=customers');
  });
});
