// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomersPage } from '../pages/CustomersPage';
import {
  customerAnalytics,
  customerCommHistory,
  customerCreate,
  customerCreditCheck,
  customerFollowUps,
  customerList,
  customerLogComm,
  customerPipeline,
  customerSearch,
  customerTop,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    customerList: vi.fn(),
    customerSearch: vi.fn(),
    customerPipeline: vi.fn(),
    customerTop: vi.fn(),
    customerFollowUps: vi.fn(),
    customerCreate: vi.fn(),
    customerCreditCheck: vi.fn(),
    customerAnalytics: vi.fn(),
    customerLogComm: vi.fn(),
    customerCommHistory: vi.fn(),
  };
});

const mockCustomerList = vi.mocked(customerList);
const mockCustomerSearch = vi.mocked(customerSearch);
const mockCustomerPipeline = vi.mocked(customerPipeline);
const mockCustomerTop = vi.mocked(customerTop);
const mockCustomerFollowUps = vi.mocked(customerFollowUps);
const mockCustomerCreate = vi.mocked(customerCreate);
const mockCustomerCreditCheck = vi.mocked(customerCreditCheck);
const mockCustomerAnalytics = vi.mocked(customerAnalytics);
const mockCustomerLogComm = vi.mocked(customerLogComm);
const mockCustomerCommHistory = vi.mocked(customerCommHistory);

beforeEach(() => {
  cleanup();
  mockCustomerList.mockReset();
  mockCustomerSearch.mockReset();
  mockCustomerPipeline.mockReset();
  mockCustomerTop.mockReset();
  mockCustomerFollowUps.mockReset();
  mockCustomerCreate.mockReset();
  mockCustomerCreditCheck.mockReset();
  mockCustomerAnalytics.mockReset();
  mockCustomerLogComm.mockReset();
  mockCustomerCommHistory.mockReset();
});

function renderPage(initialEntries = ['/customers']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CustomersPage />
    </MemoryRouter>,
  );
}

describe('CustomersPage', () => {
  it('renders the customer list and search lane', async () => {
    mockCustomerList.mockResolvedValue({
      result: {
        customers: [
          {
            id: 'CUST-001',
            company: 'Acme',
            contact_name: 'Jane Doe',
            pricing_tier: 'preferred',
            status: 'active',
            credit_limit: 50000,
            current_balance: 12000,
            email: 'jane@acme.test',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'customer-list', uncertainty: 0.05 },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Customers & CRM/i })).toBeDefined();
      expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByPlaceholderText('Search customers...'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => {
      expect(mockCustomerSearch).toHaveBeenCalledWith({ query: 'Acme' });
    });
  });

  it('renders pipeline and credit analytics lanes', async () => {
    mockCustomerList.mockResolvedValue({ result: { customers: [] } } as any);
    mockCustomerPipeline.mockResolvedValue({
      result: {
        total_pipeline: 250000,
        weighted_pipeline: 180000,
        win_rate: 42,
        avg_deal_size: 32000,
        stages: [],
      },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'pipeline', uncertainty: 0.06 },
    } as any);
    mockCustomerCreditCheck.mockResolvedValue({
      result: { approved: true, credit_limit: 50000, current_balance: 12000, available_credit: 38000, risk_score: 12 },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'credit', uncertainty: 0.05 },
    } as any);
    mockCustomerAnalytics.mockResolvedValue({
      result: { total_revenue: 120000, total_jobs: 24, avg_job_value: 5000 },
      safety: { score: 0.94, warnings: [] },
      meta: { formula_used: 'analytics', uncertainty: 0.06 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Sales Pipeline/i }));

    await waitFor(() => {
      expect(screen.getByText('$250,000')).toBeDefined();
      expect(screen.getByText('$180,000')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Credit \+ Analytics/i }));
    fireEvent.change(screen.getByPlaceholderText('Customer ID'), { target: { value: 'CUST-001' } });
    fireEvent.change(screen.getByPlaceholderText('Order Amount'), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Check$/i }));

    await waitFor(() => {
      expect(screen.getByText(/approved/i)).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('Analytics Customer ID'), { target: { value: 'CUST-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Get Analytics/i }));

    await waitFor(() => {
      expect(screen.getByText(/120000/)).toBeDefined();
    });
  });

  it('creates a customer and logs communications', async () => {
    mockCustomerList.mockResolvedValue({ result: { customers: [] } } as any);
    mockCustomerCreate.mockResolvedValue({ result: { id: 'CUST-NEW' } } as any);
    mockCustomerLogComm.mockResolvedValue({ result: { ok: true } } as any);
    mockCustomerCommHistory.mockResolvedValue({
      result: { communications: [{ date: '2026-03-26', type: 'email', notes: 'Followed up', user: 'Alex' }] },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'comm-history', uncertainty: 0.05 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /New Customer/i }));
    fireEvent.change(screen.getByPlaceholderText('Company'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Customer/i }));

    await waitFor(() => {
      expect(mockCustomerCreate).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Communications/i }));
    fireEvent.change(screen.getByPlaceholderText('Customer ID'), { target: { value: 'CUST-001' } });
    fireEvent.change(screen.getByPlaceholderText('Notes'), { target: { value: 'Followed up' } });
    fireEvent.click(screen.getByRole('button', { name: /^Log$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Communication logged/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /View History/i }));

    await waitFor(() => {
      expect(screen.getByText(/Followed up/i)).toBeDefined();
    });
  });

  it('routes customer context into quote builder, messages, portal, and quote follow-up with upstream packet continuity', async () => {
    mockCustomerList.mockResolvedValue({
      result: {
        customers: [
          {
            id: 'CUST-001',
            company: 'Acme Aerospace',
            contact_name: 'Jane Doe',
            pricing_tier: 'preferred',
            status: 'active',
            credit_limit: 50000,
            current_balance: 12000,
            email: 'jane@acme.test',
          },
        ],
      },
    } as any);

    renderPage([
      '/customers?source=quote-follow-up&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&focusQuoteId=QUO-1933&focusPacketId=PACK-1933',
    ]);

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteUrl = new URL(
      screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(quoteUrl.pathname).toBe('/quote-builder');
    expect(quoteUrl.searchParams.get('source')).toBe('customers');
    expect(quoteUrl.searchParams.get('originSource')).toBe('quote-follow-up');
    expect(quoteUrl.searchParams.get('originType')).toBe('Customer');
    expect(quoteUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(quoteUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');
    expect(quoteUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');

    const portalUrl = new URL(
      screen.getByRole('link', { name: 'Open Customer Portal' }).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(portalUrl.pathname).toBe('/customer-portal');
    expect(portalUrl.searchParams.get('source')).toBe('customers');
    expect(portalUrl.searchParams.get('originSource')).toBe('quote-follow-up');
    expect(portalUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');
    expect(portalUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');

    const followUpUrl = new URL(
      screen.getByRole('link', { name: 'Open Quote Follow-Up' }).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(followUpUrl.pathname).toBe('/quote-follow-up');
    expect(followUpUrl.searchParams.get('source')).toBe('customers');
    expect(followUpUrl.searchParams.get('originSource')).toBe('quote-follow-up');
    expect(followUpUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');
    expect(followUpUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');

    const messagesUrl = new URL(
      screen.getByRole('link', { name: 'Open Messages follow-up' }).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('customers');
    expect(messagesUrl.searchParams.get('originSource')).toBe('quote-follow-up');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');

    const captureLink = screen.getByRole('link', { name: 'Open Capture Ops' });
    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=customers');
    expect(captureLink.getAttribute('href')).toContain('department=Quoting');
    expect(captureLink.getAttribute('href')).toContain('job=CUST-001');
  });
});
