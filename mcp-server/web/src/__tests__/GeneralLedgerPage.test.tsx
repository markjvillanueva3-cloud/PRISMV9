import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GeneralLedgerPage } from '../pages/GeneralLedgerPage';
import {
  glBalanceSheet,
  glChartOfAccounts,
  glIncomeStatement,
  glJournalEntry,
  glRecordInvoice,
  glRecordPayment,
  glRecordPayroll,
  glRecordPurchase,
  glTrialBalance,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    glChartOfAccounts: vi.fn(),
    glTrialBalance: vi.fn(),
    glIncomeStatement: vi.fn(),
    glBalanceSheet: vi.fn(),
    glRecordInvoice: vi.fn(),
    glRecordPayment: vi.fn(),
    glRecordPurchase: vi.fn(),
    glRecordPayroll: vi.fn(),
    glJournalEntry: vi.fn(),
  };
});

const mockGlChartOfAccounts = vi.mocked(glChartOfAccounts);
const mockGlTrialBalance = vi.mocked(glTrialBalance);
const mockGlIncomeStatement = vi.mocked(glIncomeStatement);
const mockGlBalanceSheet = vi.mocked(glBalanceSheet);
const mockGlRecordInvoice = vi.mocked(glRecordInvoice);
const mockGlRecordPayment = vi.mocked(glRecordPayment);
const mockGlRecordPurchase = vi.mocked(glRecordPurchase);
const mockGlRecordPayroll = vi.mocked(glRecordPayroll);
const mockGlJournalEntry = vi.mocked(glJournalEntry);

beforeEach(() => {
  mockGlChartOfAccounts.mockReset();
  mockGlTrialBalance.mockReset();
  mockGlIncomeStatement.mockReset();
  mockGlBalanceSheet.mockReset();
  mockGlRecordInvoice.mockReset();
  mockGlRecordPayment.mockReset();
  mockGlRecordPurchase.mockReset();
  mockGlRecordPayroll.mockReset();
  mockGlJournalEntry.mockReset();
});

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <GeneralLedgerPage />
    </MemoryRouter>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

describe('GeneralLedgerPage', () => {
  it('renders the chart of accounts lane', async () => {
    mockGlChartOfAccounts.mockResolvedValue({
      result: {
        accounts: [
          { number: '1000', name: 'Cash', type: 'asset', balance: 250000 },
        ],
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'General Ledger' })).toBeDefined();
      expect(screen.getByText('Cash')).toBeDefined();
      expect(screen.getAllByText('$250000.00').length).toBeGreaterThan(0);
    });
  });

  it('switches to trial balance and shows balanced posture', async () => {
    mockGlChartOfAccounts.mockResolvedValue({ result: { accounts: [] } } as any);
    mockGlTrialBalance.mockResolvedValue({
      result: {
        accounts: [
          { number: '1000', name: 'Cash', debit: 1000, credit: 0 },
          { number: '2000', name: 'AP', debit: 0, credit: 1000 },
        ],
        total_debits: 1000,
        total_credits: 1000,
        balanced: true,
      },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing ledger workspace/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Trial Balance/i }));

    await waitFor(() => {
      expect(mockGlTrialBalance).toHaveBeenCalled();
      expect(screen.getAllByText('Balanced').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$1000.00').length).toBeGreaterThan(0);
    });
  });

  it('records an invoice entry from the record lane', async () => {
    mockGlChartOfAccounts.mockResolvedValue({ result: { accounts: [] } } as any);
    mockGlRecordInvoice.mockResolvedValue({
      result: { ok: true, entry_id: 'GL-001' },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing ledger workspace/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Record Entry/i }));
    fireEvent.change(screen.getByLabelText(/Customer ID/i), { target: { value: 'CUST-001' } });
    fireEvent.change(screen.getByLabelText(/^Amount$/i), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText(/Invoice #/i), { target: { value: 'INV-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Record transaction/i }));

    await waitFor(() => {
      expect(mockGlRecordInvoice).toHaveBeenCalledWith({
        customer_id: 'CUST-001',
        amount: 2500,
        invoice_number: 'INV-001',
      });
      expect(screen.getByText(/GL-001/)).toBeDefined();
    });
  });

  it('preserves payroll context through ledger handoff links', async () => {
    mockGlChartOfAccounts.mockResolvedValue({
      result: {
        accounts: [{ number: '1000', name: 'Cash', type: 'asset', balance: 250000 }],
      },
    } as any);

    renderPage([
      '/general-ledger?source=payroll&originSource=employee-directory&originType=Employee&recordType=Employee&originId=EMP-001&recordId=EMP-001&focusType=employee&focusId=EMP-001&employeeId=EMP-001',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Payroll opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const payrollUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Return to Payroll/i }).getAttribute('href') ?? '',
    );
    expect(payrollUrl.pathname).toBe('/payroll');
    expect(payrollUrl.searchParams.get('source')).toBe('general-ledger');
    expect(payrollUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(payrollUrl.searchParams.get('originType')).toBe('Employee');
    expect(payrollUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(payrollUrl.searchParams.get('focusType')).toBe('employee');
    expect(payrollUrl.searchParams.get('focusId')).toBe('EMP-001');

    const financeUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Financial Analysis/i }).getAttribute('href') ?? '',
    );
    expect(financeUrl.pathname).toBe('/financial-analysis');
    expect(financeUrl.searchParams.get('source')).toBe('general-ledger');
    expect(financeUrl.searchParams.get('originSource')).toBe('employee-directory');
    expect(financeUrl.searchParams.get('originType')).toBe('Employee');
    expect(financeUrl.searchParams.get('originId')).toBe('EMP-001');
    expect(financeUrl.searchParams.get('employeeId')).toBe('EMP-001');
    expect(financeUrl.searchParams.get('focusType')).toBe('employee');
    expect(financeUrl.searchParams.get('focusId')).toBe('EMP-001');
  });

  it('preserves explicit packet focus from invoices while carrying invoice and period context through finance links', async () => {
    mockGlChartOfAccounts.mockResolvedValue({
      result: {
        accounts: [{ number: '1000', name: 'Cash', type: 'asset', balance: 250000 }],
      },
    } as any);

    renderPage([
      '/general-ledger?source=invoices&originSource=messages&originType=Quote&recordType=Quote&originId=QUOTE-900&recordId=QUOTE-900&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&invoiceId=INV-001&periodId=2026-04&periodStart=2026-04-01&periodEnd=2026-04-30',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Invoices opened General Ledger with finance context/i)).toBeDefined();
      expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();
    });

    const invoicesUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Return to Invoices/i }).getAttribute('href') ?? '',
    );
    expect(invoicesUrl.pathname).toBe('/invoices');
    expect(invoicesUrl.searchParams.get('source')).toBe('general-ledger');
    expect(invoicesUrl.searchParams.get('originSource')).toBe('messages');
    expect(invoicesUrl.searchParams.get('originType')).toBe('Quote');
    expect(invoicesUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(invoicesUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(invoicesUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(invoicesUrl.searchParams.get('periodId')).toBe('2026-04');
    expect(invoicesUrl.searchParams.get('periodStart')).toBe('2026-04-01');
    expect(invoicesUrl.searchParams.get('periodEnd')).toBe('2026-04-30');
    expect(invoicesUrl.searchParams.get('focusType')).toBe('packet');
    expect(invoicesUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(invoicesUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(invoicesUrl.searchParams.get('focusJobId')).toBeNull();

    const financeUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Financial Analysis/i }).getAttribute('href') ?? '',
    );
    expect(financeUrl.pathname).toBe('/financial-analysis');
    expect(financeUrl.searchParams.get('source')).toBe('general-ledger');
    expect(financeUrl.searchParams.get('originSource')).toBe('messages');
    expect(financeUrl.searchParams.get('originType')).toBe('Quote');
    expect(financeUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(financeUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(financeUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(financeUrl.searchParams.get('periodId')).toBe('2026-04');
    expect(financeUrl.searchParams.get('periodStart')).toBe('2026-04-01');
    expect(financeUrl.searchParams.get('periodEnd')).toBe('2026-04-30');
    expect(financeUrl.searchParams.get('focusType')).toBe('packet');
    expect(financeUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(financeUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(financeUrl.searchParams.get('focusJobId')).toBeNull();
  });
});
