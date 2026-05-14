import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const fetchMock = vi.fn();

beforeEach(() => {
  mockListInvoices.mockReset();
  mockCreateInvoice.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/session/memory/recall')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            success: true,
            categories: ['identity', 'roadmap'],
            memory: {
              identity: {
                purpose: {
                  value: 'Safety-critical CNC manufacturing control system.',
                },
              },
              roadmap: {
                current_phase: {
                  value: 'Finish the active backend and frontend delivery tranche before opening a new expansion pass.',
                },
              },
            },
          },
        }),
      } as Response;
    }

    if (url.endsWith('/session/health')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            health_status: 'GREEN',
            advisory: 'Healthy. Continue normally.',
            estimated_tokens: 50000,
          },
        }),
      } as Response;
    }

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'invoice_brief',
            confidence: 0.92,
            tier: 'multi_domain',
            domains: ['finance', 'commercial'],
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
            domains: ['finance', 'commercial', 'erp'],
            complexity: 'high',
            reason: 'Invoice exposure spans billing, collections, and finance continuity.',
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
          task_id: 'TASK-INV-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'finance',
              result: {
                summary: 'Escalate the oldest overdue receivables before opening fresh billing demand.',
              },
            },
          ],
          final_result: {
            summary: 'Escalate the oldest overdue receivables before opening fresh billing demand.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.96,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Escalate the oldest overdue receivables before opening fresh billing demand.',
            'Keep invoice continuity attached as finance work moves into ledger review.',
          ],
        },
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <InvoicesPage />
    </MemoryRouter>,
  );
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
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

  it('keeps the PRISM AI copilot built into the invoices desk with persistent memory context', async () => {
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
            status: 'overdue',
            payments: [],
            balance_due: 1200,
          },
        ],
      },
    } as any);

    renderPage(['/invoices']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Invoices' })).toBeDefined();
      expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Persistent PRISM memory/i)).toBeDefined();
      expect(screen.getByText(/Safety-critical CNC manufacturing control system\./i)).toBeDefined();
      expect(screen.getByText(/Mounted listInvoices route/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Escalate the oldest overdue receivables before opening fresh billing demand\./i).length).toBeGreaterThan(0),
    );
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

    const ledgerUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '',
    );
    expect(ledgerUrl.pathname).toBe('/general-ledger');
    expect(ledgerUrl.searchParams.get('source')).toBe('invoices');
    expect(ledgerUrl.searchParams.get('originSource')).toBe('customers');
    expect(ledgerUrl.searchParams.get('originType')).toBe('Customer');
    expect(ledgerUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(ledgerUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(ledgerUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(ledgerUrl.searchParams.get('focusType')).toBe('job');
    expect(ledgerUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(ledgerUrl.searchParams.get('focusJobId')).toBe('JOB-001');

    const financeUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Financial Analysis follow-up/i }).getAttribute('href') ?? '',
    );
    expect(financeUrl.pathname).toBe('/financial-analysis');
    expect(financeUrl.searchParams.get('source')).toBe('invoices');
    expect(financeUrl.searchParams.get('originSource')).toBe('customers');
    expect(financeUrl.searchParams.get('originType')).toBe('Customer');
    expect(financeUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(financeUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(financeUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(financeUrl.searchParams.get('focusType')).toBe('job');
    expect(financeUrl.searchParams.get('focusId')).toBe('JOB-001');
    expect(financeUrl.searchParams.get('focusJobId')).toBe('JOB-001');
  });

  it('preserves explicit packet focus into finance follow-up links while still carrying invoice and job context', async () => {
    mockListInvoices.mockResolvedValue({
      result: {
        invoices: [
          {
            id: 'INV-001',
            job_id: 'JOB-001',
            customer_name: 'Orbit Aero',
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
      '/invoices?source=order-tracking&originSource=messages&originType=Quote&originId=QUOTE-900&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&jobId=JOB-001&note=Keep%20release%20packet%20attached',
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Order Tracking opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getByText(/Upstream billing origin:/i)).toBeDefined();
    });

    const ledgerUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '',
    );
    expect(ledgerUrl.pathname).toBe('/general-ledger');
    expect(ledgerUrl.searchParams.get('source')).toBe('invoices');
    expect(ledgerUrl.searchParams.get('originSource')).toBe('messages');
    expect(ledgerUrl.searchParams.get('originType')).toBe('Quote');
    expect(ledgerUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(ledgerUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(ledgerUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(ledgerUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(ledgerUrl.searchParams.get('focusType')).toBe('packet');
    expect(ledgerUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(ledgerUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(ledgerUrl.searchParams.get('focusJobId')).toBeNull();

    const financeUrl = parseRelativeUrl(
      screen.getByRole('link', { name: /Open Financial Analysis follow-up/i }).getAttribute('href') ?? '',
    );
    expect(financeUrl.pathname).toBe('/financial-analysis');
    expect(financeUrl.searchParams.get('source')).toBe('invoices');
    expect(financeUrl.searchParams.get('originSource')).toBe('messages');
    expect(financeUrl.searchParams.get('originType')).toBe('Quote');
    expect(financeUrl.searchParams.get('originId')).toBe('QUOTE-900');
    expect(financeUrl.searchParams.get('originThreadId')).toBe('thread-rfq');
    expect(financeUrl.searchParams.get('invoiceId')).toBe('INV-001');
    expect(financeUrl.searchParams.get('jobId')).toBe('JOB-001');
    expect(financeUrl.searchParams.get('focusType')).toBe('packet');
    expect(financeUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(financeUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(financeUrl.searchParams.get('focusJobId')).toBeNull();
  });
});
