import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvoicesPage } from '../pages/InvoicesPage';
import { createInvoice, listInvoices } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listInvoices: vi.fn(),
    createInvoice: vi.fn(),
  };
});

const mockListInvoices = vi.mocked(listInvoices);
const mockCreateInvoice = vi.mocked(createInvoice);

beforeEach(() => {
  mockListInvoices.mockReset();
  mockCreateInvoice.mockReset();
});

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <InvoicesPage />
    </MemoryRouter>,
  );
}

describe('InvoicesPage', () => {
  it('renders the invoice desk and billing totals', async () => {
    mockListInvoices.mockResolvedValue({
      result: {
        invoices: [
          {
            id: 'INV-001',
            job_id: 'JOB-001',
            customer_name: 'Acme',
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

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Invoices' })).toBeDefined();
      expect(screen.getByText('Acme')).toBeDefined();
      expect(screen.getAllByText('$1200.00').length).toBeGreaterThan(0);
    });
  });

  it('creates an invoice from a job', async () => {
    mockListInvoices
      .mockResolvedValueOnce({ result: { invoices: [] } } as any)
      .mockResolvedValueOnce({ result: { invoices: [] } } as any);
    mockCreateInvoice.mockResolvedValue({ result: { id: 'INV-NEW' } } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Refreshing invoice desk/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Invoice/i }));
    fireEvent.change(screen.getByLabelText(/Job ID/i), { target: { value: 'JOB-2026-001' } });
    fireEvent.change(screen.getByLabelText(/Markup %/i), { target: { value: '22' } });
    fireEvent.click(screen.getByRole('button', { name: /Create invoice/i }));

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith({ job_id: 'JOB-2026-001', markup_percent: 22 });
    });
  });

  it('filters the invoice desk by status', async () => {
    mockListInvoices
      .mockResolvedValueOnce({ result: { invoices: [] } } as any)
      .mockResolvedValueOnce({ result: { invoices: [] } } as any);

    renderPage();

    await waitFor(() => {
      expect(mockListInvoices).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText(/Status filter/i), { target: { value: 'paid' } });

    await waitFor(() => {
      expect(mockListInvoices).toHaveBeenLastCalledWith({ status: 'paid' });
    });
  });

  it('preserves commercial context into finance handoff links', async () => {
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

    renderPage([
      '/invoices?originSource=customers&source=jobs&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Jobs opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getByText(/Upstream billing origin:/i)).toBeDefined();
    });

    const ledgerHref = screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '';
    expect(ledgerHref).toContain('/general-ledger?');
    expect(ledgerHref).toContain('source=invoices');
    expect(ledgerHref).toContain('originSource=customers');
    expect(ledgerHref).toContain('focusJobId=JOB-001');

    const financeHref = screen.getByRole('link', { name: /Open Financial Analysis follow-up/i }).getAttribute('href') ?? '';
    expect(financeHref).toContain('/financial-analysis?');
    expect(financeHref).toContain('source=invoices');
    expect(financeHref).toContain('originSource=customers');
  });
});
