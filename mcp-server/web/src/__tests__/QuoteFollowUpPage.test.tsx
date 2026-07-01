// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuoteFollowUpPage } from '../pages/QuoteFollowUpPage';
import {
  customerCommHistory,
  customerCreateOpportunity,
  customerFollowUps,
  customerLogComm,
  quoteHistory,
  quoteStatusChange,
} from '../api/client';

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  customerFollowUps: vi.fn(),
  customerCommHistory: vi.fn(),
  customerCreateOpportunity: vi.fn(),
  customerLogComm: vi.fn(),
  quoteHistory: vi.fn(),
  quoteStatusChange: vi.fn(),
}));

const mockCustomerFollowUps = vi.mocked(customerFollowUps);
const mockCustomerCommHistory = vi.mocked(customerCommHistory);
const mockCustomerCreateOpportunity = vi.mocked(customerCreateOpportunity);
const mockCustomerLogComm = vi.mocked(customerLogComm);
const mockQuoteHistory = vi.mocked(quoteHistory);
const mockQuoteStatusChange = vi.mocked(quoteStatusChange);

function renderPage(initialEntry = '/quote-follow-up?source=customers&recordType=Quote&recordId=QUO-1933&customer=Acme%20Aerospace&focusPacketId=PACK-1933') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QuoteFollowUpPage />
    </MemoryRouter>,
  );
}

const followUpRows = [
  {
    id: 'follow-1',
    customer_id: 'CUST-001',
    customer_name: 'Acme Aerospace',
    type: 'email',
    subject: 'Requested revised finish',
    details: 'Customer needs alternate anodize options before approving the quote.',
    follow_up_date: '2026-04-10',
    status: 'pending',
    quote_id: 'QUO-1933',
  },
];

const viewedQuoteHistory = {
  ok: true,
  data: {
    quote_id: 'QUO-1933',
    current_status: 'viewed',
    current_revision: 2,
    revisions: [
      {
        id: 'rev-2',
        quote_id: 'QUO-1933',
        revision_number: 2,
        unit_price_usd: 42,
        total_price_usd: 4200,
        quantity: 100,
        cost_breakdown: {},
        quantity_breaks: [],
        lead_time_options: [],
        dfm_issues: [],
        change_summary: 'Updated finish pricing',
        created_at: '2026-04-11T08:30:00Z',
      },
    ],
    status_history: [
      {
        id: 'status-1',
        quote_id: 'QUO-1933',
        from_status: 'sent',
        to_status: 'viewed',
        reason: 'Customer opened the quote link',
        created_at: '2026-04-11T09:00:00Z',
      },
    ],
  },
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  mockCustomerFollowUps.mockResolvedValue({
    result: followUpRows,
  } as any);
  mockCustomerCommHistory.mockResolvedValue({
    result: {
      communications: [
        {
          id: 'comm-1',
          customer_id: 'CUST-001',
          date: '2026-04-09T10:00:00Z',
          type: 'email',
          subject: 'Finish clarification',
          details: 'Customer asked whether the finish could shift to hardcoat anodize.',
          logged_by: 'Jamie',
        },
      ],
    },
  } as any);
  mockQuoteHistory.mockResolvedValue(viewedQuoteHistory as any);
  mockQuoteStatusChange.mockResolvedValue({
    result: { id: 'status-2', quote_id: 'QUO-1933', to_status: 'accepted' },
  } as any);
  mockCustomerLogComm.mockResolvedValue({
    result: { id: 'comm-2' },
  } as any);
  mockCustomerCreateOpportunity.mockResolvedValue({
    result: {
      id: 'OPP-441',
      stage: 'negotiating',
      probability_pct: 72,
      estimated_value: 25000,
      quote_id: 'QUO-1933',
    },
  } as any);
});

describe('QuoteFollowUpPage', () => {
  it('renders mounted follow-up, communication, and quote history data together', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Quote Follow-Up' })).toBeDefined();
    expect(await screen.findByText('Requested revised finish')).toBeDefined();
    expect(screen.getByDisplayValue('QUO-1933')).toBeDefined();
    expect(await screen.findByText('Revision 2')).toBeDefined();
    expect(await screen.findByText('Customer opened the quote link')).toBeDefined();
    expect(await screen.findByText('Finish clarification')).toBeDefined();

    expect(mockCustomerCommHistory).toHaveBeenCalledWith({ customer_id: 'CUST-001' });
    expect(mockQuoteHistory).toHaveBeenCalledWith('QUO-1933');

    const customersUrl = new URL(
      (await screen.findByRole('link', { name: 'Open Customers follow-up' })).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(customersUrl.pathname).toBe('/customers');
    expect(customersUrl.searchParams.get('source')).toBe('quote-follow-up');
    expect(customersUrl.searchParams.get('originSource')).toBe('customers');
    expect(customersUrl.searchParams.get('originType')).toBe('Quote');
    expect(customersUrl.searchParams.get('originId')).toBe('QUO-1933');
    expect(customersUrl.searchParams.get('focusType')).toBe('quote');
    expect(customersUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');
    expect(customersUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');

    const quoteBuilderUrl = new URL(
      (await screen.findByRole('link', { name: 'Open Quote Builder' })).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(quoteBuilderUrl.pathname).toBe('/quote-builder');
    expect(quoteBuilderUrl.searchParams.get('source')).toBe('quote-follow-up');
    expect(quoteBuilderUrl.searchParams.get('originSource')).toBe('customers');
    expect(quoteBuilderUrl.searchParams.get('focusPacketId')).toBe('PACK-1933');
    expect(quoteBuilderUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');
  });

  it('bridges sent quotes through viewed before recording a lost outcome', async () => {
    mockQuoteHistory.mockResolvedValue({
      ...viewedQuoteHistory,
      data: {
        ...viewedQuoteHistory.data,
        current_status: 'sent',
      },
    } as any);

    renderPage();

    expect(await screen.findByText('Requested revised finish')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Mark lost' }));
    fireEvent.change(screen.getByLabelText('Outcome reason'), {
      target: { value: 'competitor' },
    });
    fireEvent.change(screen.getByLabelText('Competitor name'), {
      target: { value: 'Rival Tool' },
    });
    fireEvent.change(screen.getByLabelText('Outcome notes'), {
      target: { value: 'Customer awarded the quote to a competitor with an existing relationship.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Lost' }));

    await waitFor(() => {
      expect(mockQuoteStatusChange).toHaveBeenCalledTimes(2);
    });

    expect(mockQuoteStatusChange).toHaveBeenNthCalledWith(1, expect.objectContaining({
      quote_id: 'QUO-1933',
      to_status: 'viewed',
      metadata: expect.objectContaining({
        source: 'quote-follow-up',
        intermediate: true,
      }),
    }));
    expect(mockQuoteStatusChange).toHaveBeenNthCalledWith(2, expect.objectContaining({
      quote_id: 'QUO-1933',
      to_status: 'rejected',
      reason: 'Competitor won',
      metadata: expect.objectContaining({
        source: 'quote-follow-up',
        competitor_name: 'Rival Tool',
        outcome_reason: 'competitor',
        notes: 'Customer awarded the quote to a competitor with an existing relationship.',
      }),
    }));
    expect(await screen.findByText(/Recorded lost outcome for QUO-1933\./i)).toBeDefined();
  });

  it('logs communication and creates an opportunity from the selected follow-up', async () => {
    renderPage();

    expect(await screen.findByText('Requested revised finish')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Communication type'), {
      target: { value: 'meeting' },
    });
    fireEvent.change(screen.getByLabelText('Communication subject'), {
      target: { value: 'Reviewed finish and lead-time options' },
    });
    fireEvent.change(screen.getByLabelText('Communication details'), {
      target: { value: 'Customer wants hardcoat anodize and a one-week lead-time pull-in.' },
    });
    fireEvent.change(screen.getByLabelText('Next follow-up date'), {
      target: { value: '2026-04-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log communication' }));

    await waitFor(() => {
      expect(mockCustomerLogComm).toHaveBeenCalledWith(expect.objectContaining({
        customer_id: 'CUST-001',
        type: 'meeting',
        subject: 'Reviewed finish and lead-time options',
        details: 'Customer wants hardcoat anodize and a one-week lead-time pull-in.',
        follow_up_date: '2026-04-14',
        quote_id: 'QUO-1933',
      }));
    });

    fireEvent.change(screen.getByLabelText('Opportunity description'), {
      target: { value: 'Convert this follow-up into a production RFQ expansion' },
    });
    fireEvent.change(screen.getByLabelText('Estimated value'), {
      target: { value: '25000' },
    });
    fireEvent.change(screen.getByLabelText('Probability percent'), {
      target: { value: '72' },
    });
    fireEvent.change(screen.getByLabelText('Opportunity stage'), {
      target: { value: 'negotiating' },
    });
    fireEvent.change(screen.getByLabelText('Opportunity close date'), {
      target: { value: '2026-04-21' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create opportunity' }));

    await waitFor(() => {
      expect(mockCustomerCreateOpportunity).toHaveBeenCalledWith({
        customer_id: 'CUST-001',
        description: 'Convert this follow-up into a production RFQ expansion',
        estimated_value: 25000,
        stage: 'negotiating',
        probability_pct: 72,
        close_date: '2026-04-21',
        quote_id: 'QUO-1933',
      });
    });

    expect(await screen.findByText(/Opportunity OPP-441 is now in negotiating at 72% probability\./i)).toBeDefined();
  });
});
