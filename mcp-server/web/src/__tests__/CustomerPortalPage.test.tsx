// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { CustomerPortalPage } from '../pages/CustomerPortalPage';
import {
  addPortalQualityDocument,
  advancePortalMilestone,
  createPortalServiceCase,
  createPortalMilestoneTimeline,
  createPortalToken,
  getPortalMilestoneTimeline,
  getPortalOrderStatus,
  getPortalQuoteView,
  listPortalServiceCases,
  listPortalOrderDocuments,
  listPortalOrderMessages,
  listPortalQualityDocuments,
  listPortalTokens,
  respondToPortalQuote,
  revokePortalToken,
  sendPortalOrderMessage,
  updatePortalServiceCase,
} from '../api/portal';

vi.mock('../api/portal', () => ({
  createPortalToken: vi.fn(),
  revokePortalToken: vi.fn(),
  listPortalTokens: vi.fn(),
  getPortalQuoteView: vi.fn(),
  getPortalOrderStatus: vi.fn(),
  listPortalOrderDocuments: vi.fn(),
  listPortalOrderMessages: vi.fn(),
  createPortalMilestoneTimeline: vi.fn(),
  getPortalMilestoneTimeline: vi.fn(),
  advancePortalMilestone: vi.fn(),
  addPortalQualityDocument: vi.fn(),
  listPortalQualityDocuments: vi.fn(),
  listPortalServiceCases: vi.fn(),
  createPortalServiceCase: vi.fn(),
  updatePortalServiceCase: vi.fn(),
  respondToPortalQuote: vi.fn(),
  sendPortalOrderMessage: vi.fn(),
}));

const mockCreatePortalToken = vi.mocked(createPortalToken);
const mockRevokePortalToken = vi.mocked(revokePortalToken);
const mockListPortalTokens = vi.mocked(listPortalTokens);
const mockGetPortalQuoteView = vi.mocked(getPortalQuoteView);
const mockGetPortalOrderStatus = vi.mocked(getPortalOrderStatus);
const mockListPortalOrderDocuments = vi.mocked(listPortalOrderDocuments);
const mockListPortalOrderMessages = vi.mocked(listPortalOrderMessages);
const mockCreatePortalMilestoneTimeline = vi.mocked(createPortalMilestoneTimeline);
const mockGetPortalMilestoneTimeline = vi.mocked(getPortalMilestoneTimeline);
const mockAdvancePortalMilestone = vi.mocked(advancePortalMilestone);
const mockAddPortalQualityDocument = vi.mocked(addPortalQualityDocument);
const mockListPortalQualityDocuments = vi.mocked(listPortalQualityDocuments);
const mockListPortalServiceCases = vi.mocked(listPortalServiceCases);
const mockCreatePortalServiceCase = vi.mocked(createPortalServiceCase);
const mockUpdatePortalServiceCase = vi.mocked(updatePortalServiceCase);
const mockRespondToPortalQuote = vi.mocked(respondToPortalQuote);
const mockSendPortalOrderMessage = vi.mocked(sendPortalOrderMessage);

function renderPage(initialEntry = '/customer-portal') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CustomerPortalPage />
    </MemoryRouter>,
  );
}

describe('CustomerPortalPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockListPortalTokens.mockResolvedValue([]);
    mockGetPortalQuoteView.mockResolvedValue({
      quote_id: 'QUO-1933',
      status: 'sent',
      revision_number: 2,
      unit_price_usd: 42,
      total_price_usd: 4200,
      quantity: 100,
      quantity_breaks: [],
      lead_time_options: [],
      dfm_score: 88,
      dfm_issues: [{ severity: 'warning', message: 'Thin wall near cross-hole' }],
    });
    mockGetPortalOrderStatus.mockResolvedValue({
      job_id: 'JOB-4821',
      part_number: 'PART-4821',
      quantity: 24,
      status: 'in_progress',
      current_milestone: 'production',
      progress_pct: 62,
      milestones: [{ key: 'production', label: 'Production', status: 'active' }],
    } as any);
    mockGetPortalMilestoneTimeline.mockResolvedValue({
      job_id: 'JOB-4821',
      current_milestone: 'production',
      milestones: [{ key: 'production', label: 'Production', status: 'active' }],
    });
    mockListPortalOrderDocuments.mockResolvedValue([
      { id: 'doc-1', job_id: 'JOB-4821', doc_type: 'inspection_report', title: 'Inspection packet', status: 'approved' } as any,
    ]);
    mockListPortalOrderMessages.mockResolvedValue([
      { id: 'msg-1', entity_type: 'order', entity_id: 'JOB-4821', sender_type: 'customer', sender_name: 'Jamie', message: 'Please confirm milestone visibility.' } as any,
    ]);
    mockListPortalQualityDocuments.mockResolvedValue([
      { id: 'doc-1', job_id: 'JOB-4821', doc_type: 'inspection_report', title: 'Inspection packet', status: 'approved' } as any,
    ]);
    mockListPortalServiceCases.mockResolvedValue([]);
    mockCreatePortalToken.mockResolvedValue({
      id: 'token-1',
      token: 'tok-quote-1',
      token_type: 'quote',
      entity_id: 'QUO-1933',
      scope: ['view', 'respond'],
      expires_at: '2026-04-28T00:00:00Z',
      revoked: false,
      access_count: 0,
      rate_limit: 10,
      created_at: '2026-03-29T00:00:00Z',
    } as any);
    mockRevokePortalToken.mockResolvedValue({ revoked: true });
    mockCreatePortalMilestoneTimeline.mockResolvedValue({
      job_id: 'JOB-4821',
      current_milestone: 'quote_sent',
      milestones: [{ key: 'quote_sent', label: 'Quote Sent', status: 'active' }],
    });
    mockAdvancePortalMilestone.mockResolvedValue({
      job_id: 'JOB-4821',
      current_milestone: 'quote_accepted',
      milestones: [{ key: 'quote_accepted', label: 'Quote Accepted', status: 'active' }],
    });
    mockAddPortalQualityDocument.mockResolvedValue({
      id: 'doc-2',
      job_id: 'JOB-4821',
      doc_type: 'material_cert',
      title: 'Material cert',
      status: 'approved',
    } as any);
    mockCreatePortalServiceCase.mockResolvedValue({
      id: 'case-1',
      entity_type: 'order',
      entity_id: 'JOB-4821',
      subject: 'Missed delivery concern',
      summary: 'Customer asked for an updated ETA before approving a downstream shipment.',
      severity: 'high',
      status: 'waiting_on_shop',
      owner: 'customer-success',
      sla_target_at: '2026-04-01T12:00:00Z',
      escalation_level: 0,
      opened_at: '2026-03-31T12:00:00Z',
      updated_at: '2026-03-31T12:00:00Z',
    } as any);
    mockUpdatePortalServiceCase.mockResolvedValue({
      id: 'case-1',
      entity_type: 'order',
      entity_id: 'JOB-4821',
      subject: 'Missed delivery concern',
      summary: 'Customer asked for an updated ETA before approving a downstream shipment.',
      severity: 'high',
      status: 'escalated',
      owner: 'customer-success',
      sla_target_at: '2026-04-01T12:00:00Z',
      escalation_level: 1,
      satisfaction_score: 5,
      opened_at: '2026-03-31T12:00:00Z',
      updated_at: '2026-03-31T12:10:00Z',
    } as any);
    mockRespondToPortalQuote.mockResolvedValue({
      recorded: true,
      response: 'request_changes',
      message_id: 'msg-quote-1',
    } as any);
    mockSendPortalOrderMessage.mockResolvedValue({
      id: 'msg-2',
      entity_type: 'order',
      entity_id: 'JOB-4821',
      sender_type: 'customer',
      sender_name: 'Jamie',
      message: 'Please confirm the next ship date after inspection.',
      created_at: '2026-03-31T12:30:00Z',
    } as any);
  });

  it('renders the quote portal lane with mounted preview data and continuity links', async () => {
    mockListPortalTokens.mockResolvedValue([
      {
        id: 'token-1',
        token: 'tok-quote-1',
        token_type: 'quote',
        entity_id: 'QUO-1933',
        scope: ['view', 'respond'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 3,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]);

    renderPage('/customer-portal?source=customers&recordType=Quote&recordId=QUO-1933&customer=Acme%20Aerospace');

    expect(screen.getByRole('heading', { name: 'Customer Portal' })).toBeDefined();
    expect(await screen.findByText(/Customers & CRM opened Customer Portal with workflow context/i)).toBeDefined();
    expect(await screen.findByText('Quote QUO-1933')).toBeDefined();
    expect(screen.getByText('Thin wall near cross-hole')).toBeDefined();

    const customersLink = screen.getByRole('link', { name: 'Open Customers follow-up' });
    const messagesLink = screen.getByRole('link', { name: 'Open Messages follow-up' });
    const ordersLink = screen.getByRole('link', { name: 'Open Order Tracking' });
    const qualityLink = screen.getByRole('link', { name: 'Open Quality follow-up' });
    const customersUrl = new URL(customersLink.getAttribute('href') ?? '', 'https://kienzle.test');
    const messagesUrl = new URL(messagesLink.getAttribute('href') ?? '', 'https://kienzle.test');
    const ordersUrl = new URL(ordersLink.getAttribute('href') ?? '', 'https://kienzle.test');
    const qualityUrl = new URL(qualityLink.getAttribute('href') ?? '', 'https://kienzle.test');
    expect(customersUrl.searchParams.get('originSource')).toBe('customers');
    expect(messagesUrl.searchParams.get('originSource')).toBe('customers');
    expect(ordersUrl.searchParams.get('focusType')).toBe('quote');
    expect(ordersUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');
    expect(qualityUrl.searchParams.get('focusType')).toBe('quote');
    expect(qualityUrl.searchParams.get('focusQuoteId')).toBe('QUO-1933');
  });

  it('creates and revokes quote tokens through the mounted consumer surface', async () => {
    mockListPortalTokens.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'token-1',
        token: 'tok-quote-1',
        token_type: 'quote',
        entity_id: 'QUO-1933',
        scope: ['view', 'respond'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 0,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]).mockResolvedValueOnce([]);

    renderPage('/customer-portal');

    fireEvent.change(screen.getByPlaceholderText('QUO-1933'), { target: { value: 'QUO-1933' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create portal token' }));

    await waitFor(() => {
      expect(mockCreatePortalToken).toHaveBeenCalledWith(expect.objectContaining({ entity_id: 'QUO-1933', token_type: 'quote' }));
    });

    expect(await screen.findByText('tok-quote-1')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    await waitFor(() => {
      expect(mockRevokePortalToken).toHaveBeenCalledWith('tok-quote-1');
    });
  });

  it('records customer quote responses through the mounted public portal route', async () => {
    mockListPortalTokens.mockResolvedValue([
      {
        id: 'token-1',
        token: 'tok-quote-1',
        token_type: 'quote',
        entity_id: 'QUO-1933',
        scope: ['view', 'respond'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 3,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]);

    renderPage('/customer-portal?source=customers&recordType=Quote&recordId=QUO-1933&customer=Acme%20Aerospace');

    expect(await screen.findByText('Quote QUO-1933')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Quote response action'), {
      target: { value: 'request_changes' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional message to the quoting desk'), {
      target: { value: 'Need alternate finish options and a shorter lead time.' },
    });
    fireEvent.change(screen.getByPlaceholderText('Requested changes (one per line or separated by semicolons)'), {
      target: { value: 'Alternate finish; Shorter lead time' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record quote response' }));

    await waitFor(() => {
      expect(mockRespondToPortalQuote).toHaveBeenCalledWith(
        'tok-quote-1',
        expect.objectContaining({
          response: 'request_changes',
          customer_name: 'Acme Aerospace',
          message: 'Need alternate finish options and a shorter lead time.',
          requested_changes: ['Alternate finish', 'Shorter lead time'],
        }),
      );
    });

    expect(await screen.findByText('Recorded quote response: request_changes.')).toBeDefined();
  });

  it('supports the order portal workflow for milestones, docs, and message visibility', async () => {
    mockListPortalTokens.mockResolvedValue([
      {
        id: 'token-2',
        token: 'tok-order-1',
        token_type: 'order',
        entity_id: 'JOB-4821',
        scope: ['view', 'documents', 'messages'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 1,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]);

    renderPage('/customer-portal?source=orders&focusType=job&focusId=JOB-4821&focusJobId=JOB-4821');

    expect(await screen.findByText('PART-4821')).toBeDefined();
    expect(screen.getByText('Production')).toBeDefined();
    expect(screen.getByText('Inspection packet')).toBeDefined();
    expect(screen.getByText(/Jamie: Please confirm milestone visibility\./)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Quote reference'), { target: { value: 'QUO-4821' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create milestone timeline' }));
    await waitFor(() => {
      expect(mockCreatePortalMilestoneTimeline).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'JOB-4821', quote_id: 'QUO-4821' }));
    });
    expect(await screen.findByText('Quote Sent')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Advance notes'), { target: { value: 'Customer approved milestone shift.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Advance portal milestone' }));
    await waitFor(() => {
      expect(mockAdvancePortalMilestone).toHaveBeenCalledWith('JOB-4821', expect.objectContaining({ notes: 'Customer approved milestone shift.' }));
    });
    expect(await screen.findByText('Quote Accepted')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Document title'), { target: { value: 'Material cert' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add quality doc' }));
    await waitFor(() => {
      expect(mockAddPortalQualityDocument).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'JOB-4821', title: 'Material cert' }));
    });

    const ordersUrl = new URL(screen.getByRole('link', { name: 'Open Order Tracking' }).getAttribute('href') ?? '', 'https://kienzle.test');
    const qualityUrl = new URL(screen.getByRole('link', { name: 'Open Quality follow-up' }).getAttribute('href') ?? '', 'https://kienzle.test');
    expect(ordersUrl.searchParams.get('originSource')).toBe('orders');
    expect(ordersUrl.searchParams.get('focusJobId')).toBe('JOB-4821');
    expect(qualityUrl.searchParams.get('originSource')).toBe('orders');
    expect(qualityUrl.searchParams.get('focusJobId')).toBe('JOB-4821');
  });

  it('sends customer-visible order messages through the mounted public portal route', async () => {
    mockListPortalTokens.mockResolvedValue([
      {
        id: 'token-2',
        token: 'tok-order-1',
        token_type: 'order',
        entity_id: 'JOB-4821',
        scope: ['view', 'documents', 'messages'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 1,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]);
    mockListPortalOrderMessages
      .mockResolvedValueOnce([
        { id: 'msg-1', entity_type: 'order', entity_id: 'JOB-4821', sender_type: 'customer', sender_name: 'Jamie', message: 'Please confirm milestone visibility.' } as any,
      ])
      .mockResolvedValueOnce([
        { id: 'msg-1', entity_type: 'order', entity_id: 'JOB-4821', sender_type: 'customer', sender_name: 'Jamie', message: 'Please confirm milestone visibility.' } as any,
        { id: 'msg-2', entity_type: 'order', entity_id: 'JOB-4821', sender_type: 'customer', sender_name: 'Jamie', message: 'Please confirm the next ship date after inspection.' } as any,
      ]);

    renderPage('/customer-portal?source=orders&focusType=job&focusId=JOB-4821&focusJobId=JOB-4821&customer=Jamie');

    expect(await screen.findByText('PART-4821')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Write a customer-visible portal message'), {
      target: { value: 'Please confirm the next ship date after inspection.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send portal message' }));

    await waitFor(() => {
      expect(mockSendPortalOrderMessage).toHaveBeenCalledWith(
        'tok-order-1',
        expect.objectContaining({
          sender_name: 'Jamie',
          message: 'Please confirm the next ship date after inspection.',
        }),
      );
    });

    expect(await screen.findByText(/Jamie: Please confirm the next ship date after inspection\./)).toBeDefined();
  });

  it('rehydrates the portal form when workflow context changes to a different record', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/customer-portal',
          element: <CustomerPortalPage />,
        },
      ],
      {
        initialEntries: ['/customer-portal?source=customers&recordType=Quote&recordId=QUO-1933&customer=Acme%20Aerospace'],
      },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByDisplayValue('QUO-1933')).toBeDefined();
    expect(screen.getByDisplayValue('Acme Aerospace')).toBeDefined();

    await act(async () => {
      await router.navigate('/customer-portal?source=orders&focusType=job&focusId=JOB-4821&focusJobId=JOB-4821');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('JOB-4821')).toBeDefined();
    });
    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: 'Portal lane' }) as HTMLSelectElement).value).toBe('order');
    });
    expect(screen.queryByDisplayValue('Acme Aerospace')).toBeNull();
  });

  it('creates, escalates, and scores service cases for the selected portal record', async () => {
    const baseCase = {
      id: 'case-1',
      entity_type: 'order',
      entity_id: 'JOB-4821',
      subject: 'Missed delivery concern',
      summary: 'Customer asked for an updated ETA before approving a downstream shipment.',
      severity: 'high',
      status: 'waiting_on_shop',
      owner: 'customer-success',
      sla_target_at: '2026-04-01T12:00:00Z',
      escalation_level: 0,
      opened_at: '2026-03-31T12:00:00Z',
      updated_at: '2026-03-31T12:00:00Z',
    };

    mockListPortalTokens.mockResolvedValue([
      {
        id: 'token-2',
        token: 'tok-order-1',
        token_type: 'order',
        entity_id: 'JOB-4821',
        scope: ['view', 'documents', 'messages'],
        expires_at: '2026-04-28T00:00:00Z',
        revoked: false,
        access_count: 1,
        rate_limit: 10,
        created_at: '2026-03-29T00:00:00Z',
      } as any,
    ]);
    mockListPortalServiceCases
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([baseCase as any])
      .mockResolvedValueOnce([{ ...baseCase, status: 'escalated', escalation_level: 1, satisfaction_score: 5 } as any]);

    renderPage('/customer-portal?source=orders&focusType=job&focusId=JOB-4821&focusJobId=JOB-4821');

    expect(await screen.findByText('Service cases and SLA')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Service case subject'), {
      target: { value: 'Missed delivery concern' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the customer issue, ask, or escalation reason'), {
      target: { value: 'Customer asked for an updated ETA before approving a downstream shipment.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create service case' }));

    await waitFor(() => {
      expect(mockCreatePortalServiceCase).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'order',
          entity_id: 'JOB-4821',
          subject: 'Missed delivery concern',
        }),
      );
    });

    expect(await screen.findByText('Missed delivery concern')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Satisfaction score for Missed delivery concern'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Escalate case' }));

    await waitFor(() => {
      expect(mockUpdatePortalServiceCase).toHaveBeenCalledWith(
        'case-1',
        expect.objectContaining({
          escalate: true,
          satisfaction_score: 5,
        }),
      );
    });

    expect(await screen.findByText('Service case escalated.')).toBeDefined();
  });
});
