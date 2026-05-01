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
  revokePortalToken,
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
    expect(decodeURIComponent(customersLink.getAttribute('href') ?? '')).toContain('source=customer-portal');
    expect(decodeURIComponent(messagesLink.getAttribute('href') ?? '')).toContain('source=customer-portal');
    expect(decodeURIComponent(ordersLink.getAttribute('href') ?? '')).toContain('focusType=quote');
    expect(decodeURIComponent(ordersLink.getAttribute('href') ?? '')).toContain('focusQuoteId=QUO-1933');
    expect(decodeURIComponent(qualityLink.getAttribute('href') ?? '')).toContain('focusType=quote');
    expect(decodeURIComponent(qualityLink.getAttribute('href') ?? '')).toContain('focusQuoteId=QUO-1933');
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
