/**
 * BIZ-MS4 U-BIZ30: Quote Follow-Up Workflow
 * Mounted on the current ERP + quotes routes instead of demo-only quote desk assumptions.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  customerCommHistory,
  customerCreateOpportunity,
  customerFollowUps,
  customerLogComm,
  quoteHistory,
  quoteStatusChange,
} from '../api/client';
import type { InstantQuoteHistory, InstantQuoteStatus } from '../api/types';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { buildWorkflowPath, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

interface FollowUpRecord {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  details: string;
  type: string;
  dueDate: string | null;
  status: string;
  quoteId: string;
}

interface CommunicationRecord {
  id: string;
  date: string;
  type: string;
  subject: string;
  details: string;
  loggedBy: string;
  followUpDate: string | null;
}

interface OpportunityRecord {
  id: string;
  stage: string;
  probabilityPct: number;
  estimatedValue: number;
  closeDate: string | null;
  quoteId: string;
}

type OutcomeReason =
  | 'price'
  | 'lead_time'
  | 'capability'
  | 'relationship'
  | 'competitor'
  | 'budget_cut'
  | 'other';

const OUTCOME_REASONS: { value: OutcomeReason; label: string }[] = [
  { value: 'price', label: 'Price too high' },
  { value: 'lead_time', label: 'Lead time too long' },
  { value: 'capability', label: 'Capability gap' },
  { value: 'relationship', label: 'Existing relationship elsewhere' },
  { value: 'competitor', label: 'Competitor won' },
  { value: 'budget_cut', label: 'Customer budget cut' },
  { value: 'other', label: 'Other' },
];

const COMMUNICATION_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'rfq', label: 'RFQ' },
  { value: 'note', label: 'Internal note' },
] as const;

const OPPORTUNITY_STAGES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'rfq_received', label: 'RFQ received' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
] as const;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeFollowUp(
  value: Record<string, unknown>,
  index: number,
  context: { customerName?: string; quoteId?: string },
): FollowUpRecord {
  const customerId = readString(value.customer_id);
  const customerName =
    readString(value.customer_name) ||
    readString(value.customer) ||
    context.customerName ||
    customerId ||
    `Customer ${index + 1}`;
  const subject =
    readString(value.subject) ||
    readString(value.notes) ||
    readString(value.title) ||
    readString(value.details) ||
    'Follow-up';
  const details = readString(value.details) || readString(value.notes) || 'No additional follow-up notes yet.';
  const dueDate =
    readString(value.follow_up_date) ||
    readString(value.due_date) ||
    readString(value.next_follow_up) ||
    null;
  const status =
    readString(value.status) ||
    (readBoolean(value.follow_up_done) ? 'done' : 'pending');
  const quoteId = readString(value.quote_id) || context.quoteId || '';

  return {
    id: readString(value.id) || `${customerId || customerName}-${dueDate || index}`,
    customerId,
    customerName,
    subject,
    details,
    type: readString(value.type) || readString(value.follow_up_type) || 'note',
    dueDate,
    status,
    quoteId,
  };
}

function normalizeCommunication(value: Record<string, unknown>, index: number): CommunicationRecord {
  return {
    id: readString(value.id) || `comm-${index}`,
    date: readString(value.date) || readString(value.created_at) || '',
    type: readString(value.type) || 'note',
    subject: readString(value.subject) || 'Communication',
    details: readString(value.details) || readString(value.notes) || '',
    loggedBy: readString(value.logged_by) || readString(value.sender_name) || 'PRISM',
    followUpDate: readString(value.follow_up_date) || null,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not scheduled';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatSourceLabel(source: string): string {
  if (!source) {
    return 'Workflow';
  }

  return source
    .split(/[-_]/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');
}

function statusTone(status: string): 'slate' | 'sky' | 'amber' | 'emerald' | 'rose' {
  const normalized = status.toLowerCase();
  if (normalized === 'accepted' || normalized === 'won' || normalized === 'done') {
    return 'emerald';
  }
  if (normalized === 'rejected' || normalized === 'lost' || normalized === 'overdue') {
    return 'rose';
  }
  if (normalized === 'viewed' || normalized === 'pending') {
    return 'amber';
  }
  if (normalized === 'sent') {
    return 'sky';
  }
  return 'slate';
}

function buildOutcomeTransitions(
  currentStatus: InstantQuoteStatus,
  target: Extract<InstantQuoteStatus, 'accepted' | 'rejected'>,
): InstantQuoteStatus[] {
  if (currentStatus === target) {
    return [];
  }

  switch (currentStatus) {
    case 'draft':
      return ['sent', 'viewed', target];
    case 'sent':
      return ['viewed', target];
    case 'viewed':
      return [target];
    case 'revised':
      return ['draft', 'sent', 'viewed', target];
    default:
      return [];
  }
}

export function QuoteFollowUpPage() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const routeSource = routeContext.origin.source || readString(searchParams.get('source'));
  const routeCustomerName = routeContext.origin.customer || readString(searchParams.get('customer'));
  const routeQuoteId =
    routeContext.focus.quoteId ||
    (routeContext.focus.type === 'quote' ? routeContext.focus.id : '') ||
    (searchParams.get('recordType') === 'Quote'
      ? readString(searchParams.get('recordId'))
      : readString(searchParams.get('quoteId')) || readString(searchParams.get('focusQuoteId')));

  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [quoteIdInput, setQuoteIdInput] = useState(routeQuoteId);
  const [quoteHistoryData, setQuoteHistoryData] = useState<InstantQuoteHistory | null>(null);
  const [commHistory, setCommHistory] = useState<CommunicationRecord[]>([]);
  const [createdOpportunity, setCreatedOpportunity] = useState<OpportunityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [outcomeModal, setOutcomeModal] = useState<{ type: 'won' | 'lost' } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState<OutcomeReason>('other');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [commType, setCommType] = useState<(typeof COMMUNICATION_TYPES)[number]['value']>('note');
  const [commSubject, setCommSubject] = useState('');
  const [commDetails, setCommDetails] = useState('');
  const [commFollowUpDate, setCommFollowUpDate] = useState('');
  const [opportunityDescription, setOpportunityDescription] = useState('');
  const [opportunityValue, setOpportunityValue] = useState('');
  const [opportunityStage, setOpportunityStage] = useState<(typeof OPPORTUNITY_STAGES)[number]['value']>('quoted');
  const [opportunityProbability, setOpportunityProbability] = useState('60');
  const [opportunityCloseDate, setOpportunityCloseDate] = useState('');

  async function loadFollowUpQueue() {
    setLoading(true);
    setError(null);

    try {
      const response = await customerFollowUps();
      const payload = (response.result ??[]) as unknown;
      const entries =
        (payload as { follow_ups?: Array<Record<string, unknown>> })?.follow_ups ??
        (Array.isArray(payload) ? payload : []);
      setFollowUps(
        entries.map((entry, index) =>
          normalizeFollowUp(entry, index, {
            customerName: routeCustomerName,
            quoteId: routeQuoteId,
          }),
        ),
      );
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load follow-up queue');
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadActivity(customerId: string, quoteId: string) {
    setActivityLoading(true);
    setActivityError(null);

    const commPromise = customerId ? customerCommHistory({ customer_id: customerId }) : Promise.resolve(null);
    const quotePromise = quoteId ? quoteHistory(quoteId) : Promise.resolve(null);
    const [commResult, quoteResult] = await Promise.allSettled([commPromise, quotePromise]);

    if (commResult.status === 'fulfilled' && commResult.value) {
      const payload = (commResult.value.result ??[]) as unknown;
      const entries =
        (payload as { communications?: Array<Record<string, unknown>> })?.communications ??
        (Array.isArray(payload) ? payload : []);
      setCommHistory(entries.map((entry, index) => normalizeCommunication(entry, index)));
    } else {
      setCommHistory([]);
    }

    if (quoteResult.status === 'fulfilled' && quoteResult.value) {
      setQuoteHistoryData(quoteResult.value.data ?? null);
    } else {
      setQuoteHistoryData(null);
    }

    if (
      commResult.status === 'rejected' &&
      quoteResult.status === 'rejected' &&
      (customerId || quoteId)
    ) {
      const commMessage = commResult.reason instanceof Error ? commResult.reason.message : String(commResult.reason);
      const quoteMessage = quoteResult.reason instanceof Error ? quoteResult.reason.message : String(quoteResult.reason);
      setActivityError(`Unable to refresh quote activity: ${commMessage}; ${quoteMessage}`);
    } else {
      setActivityError(null);
    }

    setActivityLoading(false);
  }

  useEffect(() => {
    void loadFollowUpQueue();
  }, []);

  useEffect(() => {
    if (followUps.length === 0) {
      if (selectedFollowUpId !== null) {
        setSelectedFollowUpId(null);
      }
      return;
    }

    if (!selectedFollowUpId || !followUps.some((followUp) => followUp.id === selectedFollowUpId)) {
      setSelectedFollowUpId(followUps[0].id);
    }
  }, [followUps, selectedFollowUpId]);

  const selectedFollowUp = followUps.find((followUp) => followUp.id === selectedFollowUpId) ?? null;

  useEffect(() => {
    if (!quoteIdInput) {
      const candidate = selectedFollowUp?.quoteId || routeQuoteId;
      if (candidate) {
        setQuoteIdInput(candidate);
      }
    }
  }, [quoteIdInput, routeQuoteId, selectedFollowUp?.quoteId]);

  const resolvedQuoteId = quoteIdInput.trim() || selectedFollowUp?.quoteId || routeQuoteId;

  useEffect(() => {
    const customerId = selectedFollowUp?.customerId ?? '';
    const quoteId = resolvedQuoteId;

    if (!customerId && !quoteId) {
      setCommHistory([]);
      setQuoteHistoryData(null);
      setActivityError(null);
      setActivityLoading(false);
      return;
    }

    void loadActivity(customerId, quoteId);
  }, [resolvedQuoteId, selectedFollowUp?.customerId]);

  const overdueCount = followUps.filter((followUp) => {
    if (!followUp.dueDate) {
      return false;
    }

    return new Date(followUp.dueDate) < new Date() && followUp.status.toLowerCase() !== 'done';
  }).length;
  const quoteLinkedCount = followUps.filter((followUp) => Boolean(followUp.quoteId)).length;
  const selectedReference =
    selectedFollowUp?.customerName ||
    selectedFollowUp?.customerId ||
    routeCustomerName ||
    'Select a follow-up';
  const continuityQuoteId = resolvedQuoteId || routeQuoteId || selectedFollowUp?.quoteId || '';
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? {
            ...routeContext.origin,
            customer: routeContext.origin.customer || selectedFollowUp?.customerName || routeCustomerName,
            note:
              routeContext.origin.note ||
              'Carry quote follow-up context into adjacent commercial and customer-response desks.',
          }
        : {
            source: 'quote-follow-up',
            recordType: 'Quote',
            recordId: continuityQuoteId || selectedFollowUp?.id || '',
            customer: selectedFollowUp?.customerName || routeCustomerName,
            note: 'Carry quote follow-up context into adjacent commercial and customer-response desks.',
            threadId: routeContext.origin.threadId,
          },
    [
      continuityQuoteId,
      routeContext.origin,
      routeCustomerName,
      selectedFollowUp?.customerName,
      selectedFollowUp?.id,
    ],
  );
  const continuityFocus = useMemo(
    () =>
      continuityQuoteId || routeContext.focus.packetId
        ? {
            type: 'quote',
            id: continuityQuoteId,
            quoteId: continuityQuoteId,
            packetId: routeContext.focus.packetId,
          }
        : undefined,
    [continuityQuoteId, routeContext.focus.packetId],
  );
  const continuityLinks = useMemo(
    () => ({
      customers: buildWorkflowPath('/customers', location.search, {
        origin: effectiveOrigin,
        focus: continuityFocus,
        extras: {
          source: 'quote-follow-up',
          note: 'Carry quote follow-up context back into Customers & CRM.',
        },
      }),
      messages: buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: continuityFocus,
        extras: {
          source: 'quote-follow-up',
          note: 'Carry quote follow-up context into Messages follow-up.',
        },
      }),
      portal: buildWorkflowPath('/customer-portal', location.search, {
        origin: effectiveOrigin,
        focus: continuityFocus,
        extras: {
          source: 'quote-follow-up',
          note: 'Carry quote follow-up context into customer portal response and messaging.',
        },
      }),
      quoteBuilder: buildWorkflowPath('/quote-builder', location.search, {
        origin: effectiveOrigin,
        focus: continuityFocus,
        extras: {
          source: 'quote-follow-up',
          note: 'Carry quote follow-up learning back into quote strategy and revision planning.',
        },
      }),
    }),
    [continuityFocus, effectiveOrigin, location.search],
  );

  async function handleOutcome() {
    if (!outcomeModal) {
      return;
    }

    if (!resolvedQuoteId) {
      setError('Enter a quote ID before recording an outcome.');
      return;
    }

    if (!quoteHistoryData) {
      setError(`Quote history is required before ${resolvedQuoteId} can be marked won or lost.`);
      return;
    }

    const targetStatus: Extract<InstantQuoteStatus, 'accepted' | 'rejected'> =
      outcomeModal.type === 'won' ? 'accepted' : 'rejected';
    const currentStatus = quoteHistoryData.current_status;

    if (
      (currentStatus === 'accepted' || currentStatus === 'rejected' || currentStatus === 'expired') &&
      currentStatus !== targetStatus
    ) {
      setError(`Quote ${resolvedQuoteId} is already ${currentStatus}. Revise it before recording a new outcome.`);
      return;
    }

    const transitions = buildOutcomeTransitions(currentStatus, targetStatus);

    if (transitions.length === 0) {
      setActionNotice(`Quote ${resolvedQuoteId} is already ${targetStatus}.`);
      setOutcomeModal(null);
      return;
    }

    try {
      setError(null);
      setActionNotice(null);

      for (const transition of transitions) {
        const isFinalTransition = transition === targetStatus;
        await quoteStatusChange({
          quote_id: resolvedQuoteId,
          to_status: transition,
          reason: isFinalTransition
            ? OUTCOME_REASONS.find((reason) => reason.value === outcomeReason)?.label ?? outcomeReason
            : `Follow-up workflow advanced ${resolvedQuoteId} to ${transition}.`,
          metadata: isFinalTransition
            ? {
                source: 'quote-follow-up',
                outcome_reason: outcomeReason,
                notes: outcomeNotes || undefined,
                competitor_name: competitorName || undefined,
              }
            : {
                source: 'quote-follow-up',
                intermediate: true,
              },
        });
      }

      setOutcomeModal(null);
      setOutcomeReason('other');
      setOutcomeNotes('');
      setCompetitorName('');
      setActionNotice(`Recorded ${targetStatus === 'accepted' ? 'won' : 'lost'} outcome for ${resolvedQuoteId}.`);

      await Promise.all([
        loadFollowUpQueue(),
        loadActivity(selectedFollowUp?.customerId ?? '', resolvedQuoteId),
      ]);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to update quote outcome');
    }
  }

  async function handleLogCommunication() {
    if (!selectedFollowUp?.customerId) {
      setError('Select a follow-up with a customer ID before logging communication.');
      return;
    }

    try {
      setError(null);
      setActionNotice(null);

      await customerLogComm({
        customer_id: selectedFollowUp.customerId,
        type: commType,
        subject: commSubject.trim() || selectedFollowUp.subject,
        details: commDetails.trim() || selectedFollowUp.details,
        logged_by: 'quote-follow-up',
        follow_up_date: commFollowUpDate || undefined,
        quote_id: resolvedQuoteId || undefined,
      });

      setCommSubject('');
      setCommDetails('');
      setCommFollowUpDate('');
      setActionNotice(`Logged ${commType} follow-up for ${selectedFollowUp.customerName}.`);

      await Promise.all([
        loadFollowUpQueue(),
        loadActivity(selectedFollowUp.customerId, resolvedQuoteId),
      ]);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to log communication');
    }
  }

  async function handleCreateOpportunity() {
    if (!selectedFollowUp?.customerId) {
      setError('Select a follow-up with a customer ID before creating an opportunity.');
      return;
    }

    try {
      setError(null);
      setActionNotice(null);

      const response = await customerCreateOpportunity({
        customer_id: selectedFollowUp.customerId,
        description: opportunityDescription.trim() || selectedFollowUp.subject,
        estimated_value: Number.parseFloat(opportunityValue) || 0,
        stage: opportunityStage,
        probability_pct: Number.parseFloat(opportunityProbability) || 0,
        close_date: opportunityCloseDate || undefined,
        quote_id: resolvedQuoteId || undefined,
      });

      const payload = (response.result ??{}) as Record<string, unknown>;
      setCreatedOpportunity({
        id: readString(payload.id) || 'opportunity-created',
        stage: readString(payload.stage) || opportunityStage,
        probabilityPct: readNumber(payload.probability_pct) || Number.parseFloat(opportunityProbability) || 0,
        estimatedValue: readNumber(payload.estimated_value) || Number.parseFloat(opportunityValue) || 0,
        closeDate: readString(payload.close_date) || opportunityCloseDate || null,
        quoteId: readString(payload.quote_id) || resolvedQuoteId,
      });
      setActionNotice(`Created opportunity from ${selectedFollowUp.customerName}.`);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create opportunity');
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Sales Operations"
        title="Quote Follow-Up"
        description="Work the mounted CRM follow-up queue, keep quote history visible, and push real customer communication back through the existing ERP and quotes routes."
        metrics={
          <>
            <SummaryTile label="Open follow-ups" value={`${followUps.length}`} hint="Mounted CRM reminders that still need a response." />
            <SummaryTile
              label="Overdue"
              value={`${overdueCount}`}
              hint="Follow-ups scheduled before today."
              accent={overdueCount > 0 ? 'from-red-400/22 via-red-300/10 to-transparent' : 'from-emerald-400/22 via-emerald-300/10 to-transparent'}
            />
            <SummaryTile
              label="Quote-linked"
              value={`${quoteLinkedCount}`}
              hint="Rows already carrying quote context into the desk."
              accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-3">
            <SummaryTile label="Active reference" value={selectedReference} hint="Selected customer or routed workflow context." />
            <ActionButton onClick={() => void loadFollowUpQueue()}>Refresh queue</ActionButton>
          </div>
        }
      />

      {routeSource || routeQuoteId ? (
        <PanelCard
          title="Workflow context"
          subtitle="This desk stays aware of the upstream workflow so quote review and customer communication keep the same attached record."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Opened from" value={formatSourceLabel(routeSource)} hint="Upstream workflow source." />
            <SummaryTile label="Routed customer" value={routeCustomerName || 'Not provided'} hint="Customer context passed into the desk." />
            <SummaryTile label="Routed quote" value={routeQuoteId || 'Not provided'} hint="Quote context passed into the desk." />
          </div>
        </PanelCard>
      ) : null}

      <PanelCard
        title="Workflow continuity"
        subtitle="Keep the same quote, customer, and packet context when follow-up branches into CRM, messages, portal, or pricing revision."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to={continuityLinks.customers}
            className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]"
          >
            Open Customers follow-up
          </Link>
          <Link
            to={continuityLinks.messages}
            className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]"
          >
            Open Messages follow-up
          </Link>
          <Link
            to={continuityLinks.portal}
            className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]"
          >
            Open Customer Portal
          </Link>
          <Link
            to={continuityLinks.quoteBuilder}
            className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]"
          >
            Open Quote Builder
          </Link>
        </div>
      </PanelCard>

      {loading ? <LoadingState label="Loading follow-up queue..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {actionNotice ? (
        <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-4 text-sm text-emerald-100">
          {actionNotice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <PanelCard
          title="Follow-up queue"
          subtitle="Mounted follow-up reminders sorted by due date, with quote context normalized when the queue carries it."
        >
          {followUps.length > 0 ? (
            <div className="space-y-3">
              {[...followUps]
                .sort((left, right) => {
                  if (!left.dueDate) {
                    return 1;
                  }
                  if (!right.dueDate) {
                    return -1;
                  }
                  return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
                })
                .map((followUp) => {
                  const isSelected = followUp.id === selectedFollowUp?.id;
                  const isOverdue = Boolean(followUp.dueDate) && new Date(followUp.dueDate as string) < new Date();

                  return (
                    <button
                      key={followUp.id}
                      type="button"
                      onClick={() => setSelectedFollowUpId(followUp.id)}
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-cyan-300/28 bg-cyan-300/[0.08]'
                          : isOverdue
                            ? 'border-red-400/26 bg-red-400/[0.05]'
                            : 'border-white/8 bg-white/[0.03] hover:border-white/14'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-50">{followUp.customerName}</div>
                          <div className="text-xs text-slate-400">{followUp.customerId || 'No customer ID'} · {followUp.subject}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill label={followUp.status} tone={statusTone(followUp.status)} />
                          {isOverdue ? <StatusPill label="OVERDUE" tone="rose" /> : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Type: {followUp.type}</span>
                        <span>Due: {formatDate(followUp.dueDate)}</span>
                        <span>Quote: {followUp.quoteId || 'Attach quote manually'}</span>
                      </div>
                      <div className="mt-3 text-sm text-slate-300">{followUp.details}</div>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="text-sm text-slate-400">No mounted follow-ups are currently due.</div>
          )}
        </PanelCard>

        <div className="space-y-6">
          <PanelCard
            title="Active follow-up"
            subtitle="Use the selected reminder to drive quote status, comms logging, and opportunity creation without leaving the mounted backend contract."
          >
            {selectedFollowUp ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryTile label="Customer" value={selectedFollowUp.customerName} hint={selectedFollowUp.customerId || 'No customer ID on this row.'} />
                  <SummaryTile label="Due date" value={formatDate(selectedFollowUp.dueDate)} hint={`Reminder type: ${selectedFollowUp.type}`} />
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Current reminder</div>
                  <div className="mt-3 font-semibold text-slate-100">{selectedFollowUp.subject}</div>
                  <div className="mt-2 leading-6">{selectedFollowUp.details}</div>
                </div>
                <Field label="Focused quote ID">
                  <Input
                    aria-label="Focused quote ID"
                    value={quoteIdInput}
                    onChange={(event) => setQuoteIdInput(event.target.value)}
                    placeholder="QUO-1933"
                  />
                </Field>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setOutcomeModal({ type: 'won' })}
                    disabled={!resolvedQuoteId || !quoteHistoryData}
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Mark won
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeModal({ type: 'lost' })}
                    disabled={!resolvedQuoteId || !quoteHistoryData}
                    className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Mark lost
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Select a follow-up from the queue to load quote and communication context.</div>
            )}
          </PanelCard>

          {activityLoading ? <LoadingState label="Refreshing quote and communication activity..." /> : null}
          {activityError ? <ErrorState message={activityError} /> : null}

          <PanelCard
            title="Quote history"
            subtitle="This is the mounted quote revision surface, not a synthetic card. It reflects the actual quotes route contract."
          >
            {quoteHistoryData ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryTile label="Quote ID" value={quoteHistoryData.quote_id} hint="Mounted quotes route." />
                  <SummaryTile label="Current status" value={quoteHistoryData.current_status} hint="Current backend status for this quote." />
                  <SummaryTile label="Current revision" value={`${quoteHistoryData.current_revision}`} hint="Latest revision number on record." />
                </div>
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent status changes</div>
                  {quoteHistoryData.status_history.length > 0 ? (
                    quoteHistoryData.status_history.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill label={entry.from_status} tone={statusTone(entry.from_status)} />
                          <span className="text-slate-500">→</span>
                          <StatusPill label={entry.to_status} tone={statusTone(entry.to_status)} />
                        </div>
                        <div className="mt-2 text-xs text-slate-400">{formatDateTime(entry.created_at)}</div>
                        <div className="mt-2">{entry.reason || 'No status reason recorded.'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">No mounted status transitions are available yet.</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent revisions</div>
                  {quoteHistoryData.revisions.length > 0 ? (
                    quoteHistoryData.revisions.slice(0, 3).map((revision) => (
                      <div key={revision.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="font-semibold text-slate-100">Revision {revision.revision_number}</div>
                          <div>${revision.total_price_usd.toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">{formatDateTime(revision.created_at)}</div>
                        <div className="mt-2">{revision.change_summary || 'No change summary recorded.'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">No mounted revisions are available for this quote yet.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Enter or route a quote ID to load the mounted history and status trail.
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Customer communication"
            subtitle="Log follow-up directly against the customer communication route and keep the recent history in view."
          >
            <div className="space-y-4">
              {commHistory.length > 0 ? (
                <div className="space-y-3">
                  {commHistory.slice(0, 4).map((entry) => (
                    <div key={entry.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-semibold text-slate-100">{entry.subject}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.type}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">{formatDateTime(entry.date)} · {entry.loggedBy}</div>
                      <div className="mt-2">{entry.details || 'No communication details recorded.'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No mounted communication history is available for the selected customer yet.</div>
              )}

              <div className="grid gap-4">
                <Field label="Communication type">
                  <Select aria-label="Communication type" value={commType} onChange={(event) => setCommType(event.target.value as (typeof COMMUNICATION_TYPES)[number]['value'])}>
                    {COMMUNICATION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subject">
                  <Input
                    aria-label="Communication subject"
                    value={commSubject}
                    onChange={(event) => setCommSubject(event.target.value)}
                    placeholder="Customer asked for a revised finish option"
                  />
                </Field>
                <Field label="Details">
                  <textarea
                    aria-label="Communication details"
                    value={commDetails}
                    onChange={(event) => setCommDetails(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    placeholder="Capture the customer request, timing, and next step."
                  />
                </Field>
                <Field label="Next follow-up date">
                  <Input
                    aria-label="Next follow-up date"
                    type="date"
                    value={commFollowUpDate}
                    onChange={(event) => setCommFollowUpDate(event.target.value)}
                  />
                </Field>
                <ActionButton onClick={() => void handleLogCommunication()} tone="sky">
                  Log communication
                </ActionButton>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Create opportunity"
            subtitle="Use the live customer opportunity route so follow-up can turn into a tracked commercial motion instead of a dead-end note."
          >
            <div className="space-y-4">
              <Field label="Description">
                <Input
                  aria-label="Opportunity description"
                  value={opportunityDescription}
                  onChange={(event) => setOpportunityDescription(event.target.value)}
                  placeholder="Bridge this quote into a production RFQ opportunity"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Estimated value">
                  <Input
                    aria-label="Estimated value"
                    type="number"
                    value={opportunityValue}
                    onChange={(event) => setOpportunityValue(event.target.value)}
                    placeholder="25000"
                  />
                </Field>
                <Field label="Probability %">
                  <Input
                    aria-label="Probability percent"
                    type="number"
                    value={opportunityProbability}
                    onChange={(event) => setOpportunityProbability(event.target.value)}
                    placeholder="60"
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Stage">
                  <Select aria-label="Opportunity stage" value={opportunityStage} onChange={(event) => setOpportunityStage(event.target.value as (typeof OPPORTUNITY_STAGES)[number]['value'])}>
                    {OPPORTUNITY_STAGES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Close date">
                  <Input
                    aria-label="Opportunity close date"
                    type="date"
                    value={opportunityCloseDate}
                    onChange={(event) => setOpportunityCloseDate(event.target.value)}
                  />
                </Field>
              </div>
              <ActionButton onClick={() => void handleCreateOpportunity()} tone="emerald">
                Create opportunity
              </ActionButton>
              {createdOpportunity ? (
                <div className="rounded-[18px] border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm text-emerald-100">
                  Opportunity {createdOpportunity.id} is now in {createdOpportunity.stage} at {createdOpportunity.probabilityPct}% probability.
                </div>
              ) : null}
            </div>
          </PanelCard>
        </div>
      </div>

      {outcomeModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOutcomeModal(null);
            }
          }}
        >
          <div className="mx-4 w-full max-w-md rounded-[24px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-slate-50">
              Mark Quote {outcomeModal.type === 'won' ? 'Won' : 'Lost'}
            </h2>
            <div className="space-y-4">
              <Field label="Reason">
                <Select
                  aria-label="Outcome reason"
                  value={outcomeReason}
                  onChange={(event) => setOutcomeReason(event.target.value as OutcomeReason)}
                >
                  {OUTCOME_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </Select>
              </Field>
              {outcomeModal.type === 'lost' ? (
                <Field label="Competitor name (if known)">
                  <Input
                    aria-label="Competitor name"
                    type="text"
                    value={competitorName}
                    onChange={(event) => setCompetitorName(event.target.value)}
                    placeholder="Competitor shop name"
                  />
                </Field>
              ) : null}
              <Field label="Notes">
                <textarea
                  aria-label="Outcome notes"
                  value={outcomeNotes}
                  onChange={(event) => setOutcomeNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder="Details about the customer outcome and next step."
                />
              </Field>
            </div>
            <div className="mt-5 flex gap-3">
              <ActionButton onClick={() => void handleOutcome()} tone={outcomeModal.type === 'won' ? 'emerald' : 'rose'}>
                Confirm {outcomeModal.type === 'won' ? 'Won' : 'Lost'}
              </ActionButton>
              <button
                type="button"
                onClick={() => setOutcomeModal(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
