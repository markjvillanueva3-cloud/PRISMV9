import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AppwMessagesCopilot } from '../components/puoa/AppwMessagesCopilot';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { StatusPill } from '../components/workspace/WorkspacePrimitives';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { toEmployeeShellPath } from '../features/operating-system/employeeShellRoutes';
import { loadShellSession } from '../features/operating-system/shellSession';
import type { HotJobRecord, MessageEntry, MessageThreadSummary, MessagesWorkspace } from '../features/operating-system/contracts';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

function priorityTone(priority: MessageThreadSummary['priority']) {
  if (priority === 'hot') return 'rose';
  if (priority === 'watch') return 'amber';
  return 'sky';
}

function sourceLabel(source: MessageThreadSummary['source']) {
  if (source === 'email') return 'Email feed';
  if (source === 'workflow') return 'Workflow';
  return 'App thread';
}

function directionClasses(direction: MessageEntry['direction']) {
  if (direction === 'outbound') {
    return 'ml-auto border-cyan-300/20 bg-cyan-300/[0.10] text-cyan-50';
  }

  if (direction === 'internal') {
    return 'border-violet-300/20 bg-violet-300/[0.10] text-violet-50';
  }

  return 'border-white/10 bg-white/[0.04] text-slate-100';
}

interface MessageActionLink {
  label: string;
  to: string;
}

interface MessageActionWorkspaceCard {
  label: string;
  title: string;
  detail: string;
  draftLabel: string;
  defaultDraft: string;
  guidance: string[];
  primaryLink: MessageActionLink;
  secondaryLink?: MessageActionLink;
}

function MessagesSourcePostureCard({
  label,
  detail,
  refreshedAt,
  issue,
}: {
  label: string;
  detail: string;
  refreshedAt?: number | null;
  issue?: string | null;
}) {
  const status = issue ? 'Unavailable' : refreshedAt ? 'Live in session' : 'Standby';
  const tone = issue
    ? 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100'
    : refreshedAt
      ? 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100'
      : 'border-white/10 bg-white/[0.04] text-slate-200';
  const refreshLabel = refreshedAt
    ? new Date(refreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Not refreshed yet';

  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{label}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
          {status}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{issue ?? refreshLabel}</div>
    </div>
  );
}

function formatLinkedRecordLabel(record: MessagesWorkspace['linkedRecords'][number] | null) {
  if (!record) {
    return '';
  }

  return `${record.type} ${record.id}`;
}

function buildMessageActionWorkspace(input: {
  actionLabel: string;
  selectedThread: MessageThreadSummary;
  linkedRecords: MessagesWorkspace['linkedRecords'];
  launcherSourceLabel: string;
  contextReference: string;
  contextFocusLabel: string;
  derivedCustomer: string;
  contextNote: string;
  jobsPath: string;
  programReleasePath: string;
  hotJobs: HotJobRecord[];
  toShellRoute: (to: string) => string;
}): MessageActionWorkspaceCard {
  const {
    actionLabel,
    selectedThread,
    linkedRecords,
    launcherSourceLabel,
    contextReference,
    contextFocusLabel,
    derivedCustomer,
    contextNote,
    jobsPath,
    programReleasePath,
    hotJobs,
    toShellRoute,
  } = input;
  const normalized = actionLabel.toLowerCase();
  const primaryLinkedRecord = linkedRecords[0] ?? null;
  const primaryRecordRoute = primaryLinkedRecord ? toShellRoute(primaryLinkedRecord.to) : jobsPath;
  const primaryRecordLabel = formatLinkedRecordLabel(primaryLinkedRecord);
  const primaryRecordActionLabel = primaryLinkedRecord
    ? /job/i.test(primaryLinkedRecord.type)
      ? 'Open linked job'
      : `Open linked ${primaryLinkedRecord.type.toLowerCase()}`
    : 'Open Jobs follow-up';
  const focusOrRecordReference = contextReference || contextFocusLabel || primaryRecordLabel || selectedThread.id;
  const customerLine = derivedCustomer ? `Customer: ${derivedCustomer}` : '';
  const hotJobLine =
    hotJobs.length > 0 ? `Shop hot follow-up: ${hotJobs[0].jobId} stays at the front of the queue.` : '';
  const commonDraftLines = [
    `Thread: ${selectedThread.subject}`,
    `Reference: ${focusOrRecordReference}`,
    customerLine,
    contextNote || '',
    hotJobLine,
  ].filter(Boolean);

  if (normalized.includes('reply')) {
    return {
      label: actionLabel,
      title: `${actionLabel} workspace`,
      detail:
        'Stage the reply inside Kienzle so the message stays attached to the customer, order, or job while mailbox delivery routes converge on the backend.',
      draftLabel: `${actionLabel} draft`,
      defaultDraft: [
        `Re: ${selectedThread.subject}`,
        '',
        ...commonDraftLines,
        '',
        `Kienzle staged this reply from ${launcherSourceLabel || 'Messages'} so the same thread can continue into jobs or release work without retyping context.`,
      ].join('\n'),
      guidance: [
        'Keep the launcher and upstream origin attached to this thread.',
        'Use linked records instead of duplicating identifiers by hand.',
      ],
      primaryLink: {
        label: primaryRecordActionLabel,
        to: primaryRecordRoute,
      },
      secondaryLink: {
        label: 'Open Print to CNC',
        to: programReleasePath,
      },
    };
  }

  if (normalized.includes('route to owner')) {
    return {
      label: actionLabel,
      title: `${actionLabel} workspace`,
      detail:
        'Stage the owner route note locally so operations can keep the thread tied to the right packet while backend assignment and delivery logic converge.',
      draftLabel: 'Owner route note',
      defaultDraft: [
        `Owner route for ${selectedThread.subject}`,
        '',
        ...commonDraftLines,
        '',
        'Requested action: confirm ownership, response posture, and next follow-up before committing back to the mailbox feed.',
      ].join('\n'),
      guidance: [
        'Route the thread against the linked packet, not as a detached note.',
        'Keep the downstream job or release handoff visible to the next owner.',
      ],
      primaryLink: {
        label: 'Open Jobs follow-up',
        to: jobsPath,
      },
      secondaryLink: {
        label: primaryRecordActionLabel,
        to: primaryRecordRoute,
      },
    };
  }

  if (normalized.includes('shop-wide note') || normalized.includes('management note')) {
    return {
      label: actionLabel,
      title: `${actionLabel} workspace`,
      detail:
        'Stage the management note in the inbox first so the same commercial context can feed hot-job and shop-wide follow-up without breaking continuity.',
      draftLabel: 'Management note',
      defaultDraft: [
        `${actionLabel}: ${selectedThread.subject}`,
        '',
        ...commonDraftLines,
        '',
        'Management posture: keep the commercial thread visible while dispatch and release lanes absorb the update.',
      ].join('\n'),
      guidance: [
        'Management notes should keep the same thread reference for auditability.',
        'If the packet is hot, keep the queue impact visible in jobs before pushing additional follow-up.',
      ],
      primaryLink: {
        label: hotJobs.length > 0 ? 'Open hot-job follow-up' : 'Open Jobs follow-up',
        to: hotJobs.length > 0 ? jobsPath : jobsPath,
      },
      secondaryLink: {
        label: 'Open Print to CNC',
        to: programReleasePath,
      },
    };
  }

  if (normalized.includes('jump') || normalized.includes('open linked')) {
    return {
      label: actionLabel,
      title: `${actionLabel} workspace`,
      detail:
        'Use the linked record handoff instead of copy-pasting identifiers into another desk. This keeps the same origin, focus, and thread continuity intact.',
      draftLabel: 'Linked record handoff note',
      defaultDraft: [
        `${actionLabel}: ${focusOrRecordReference}`,
        '',
        ...commonDraftLines,
        '',
        'Open the linked record from this staged handoff and keep the thread attached to the same operational follow-up.',
      ].join('\n'),
      guidance: [
        'Prefer the linked record route over a generic workspace jump.',
        'Do not replace the upstream commercial origin with the local message launcher.',
      ],
      primaryLink: {
        label: primaryRecordActionLabel,
        to: primaryRecordRoute,
      },
      secondaryLink: {
        label: 'Open Jobs follow-up',
        to: jobsPath,
      },
    };
  }

  return {
    label: actionLabel,
    title: `${actionLabel} workspace`,
    detail:
      'Stage the local Kienzle response here so the thread stays attached to the same job, order, or release packet while backend message actions continue converging.',
    draftLabel: `${actionLabel} note`,
    defaultDraft: [
      `${actionLabel}: ${selectedThread.subject}`,
      '',
      ...commonDraftLines,
      '',
      'Kienzle staged this action locally. Keep the same linked record and downstream follow-up when you continue the thread.',
    ].join('\n'),
    guidance: [
      'Keep the thread and linked record connected while this action stays staged.',
      'Use downstream follow-up links instead of recreating the context from scratch.',
    ],
    primaryLink: {
      label: primaryRecordActionLabel,
      to: primaryRecordRoute,
    },
    secondaryLink: {
      label: 'Open Jobs follow-up',
      to: jobsPath,
    },
  };
}

export function MessagesPage() {
  const services = useOperatingSystem();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const threadId = searchParams.get('thread');
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = searchParams.get('source') || '';
  const originSource = routeContext.origin.source || '';
  const sourceContext = launcherSource || originSource;
  const upstreamSourceContext = originSource && originSource !== launcherSource ? originSource : '';
  const contextRecordType = routeContext.origin.recordType;
  const contextRecordId = routeContext.origin.recordId;
  const contextCustomer = routeContext.origin.customer;
  const contextNote = routeContext.origin.note;
  const session = useMemo(() => loadShellSession(), []);
  const isEmployeeShell = location.pathname.startsWith('/employee');
  const profileId = isEmployeeShell
    ? searchParams.get('profile') ?? (session?.kind === 'employee' ? session.profileId : 'machinist')
    : undefined;
  const [workspace, setWorkspace] = useState<MessagesWorkspace | null>(null);
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [workspaceRefreshedAt, setWorkspaceRefreshedAt] = useState<number | null>(null);
  const [hotJobsRefreshedAt, setHotJobsRefreshedAt] = useState<number | null>(null);
  const [workspaceIssue, setWorkspaceIssue] = useState<string | null>(null);
  const [hotJobsIssue, setHotJobsIssue] = useState<string | null>(null);
  const [selectedActionLabel, setSelectedActionLabel] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setError(null);

      try {
        const nextWorkspace = await services.getMessagesWorkspace({
          profileId,
          email: session?.email ?? null,
          threadId,
        });

        if (cancelled) {
          return;
        }

        setWorkspace(nextWorkspace);
        setWorkspaceRefreshedAt(Date.now());
        setWorkspaceIssue(null);

        if (threadId !== nextWorkspace.selectedThreadId) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('thread', nextWorkspace.selectedThreadId);
          if (profileId) {
            nextParams.set('profile', profileId);
          }
          setSearchParams(nextParams, { replace: true });
        }
      } catch (issue) {
        if (!cancelled) {
          const message = issue instanceof Error ? issue.message : 'Messages workspace could not be loaded.';
          setError(message);
          setWorkspaceIssue(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [profileId, searchParams, services, session?.email, setSearchParams, threadId]);

  useEffect(() => {
    let active = true;

    services
      .getHotJobs()
      .then((records) => {
        if (active) {
          setHotJobs(records);
          setHotJobsRefreshedAt(Date.now());
          setHotJobsIssue(null);
        }
      })
      .catch(() => {
        if (active) {
          setHotJobs([]);
          setHotJobsIssue('Shop hot follow-up feed unavailable.');
        }
      });

    const unsubscribe = services.subscribeHotJobs((records) => {
      if (active) {
        setHotJobs(records);
        setHotJobsRefreshedAt(Date.now());
        setHotJobsIssue(null);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [services]);

  const selectedThread = workspace?.threads.find((thread) => thread.id === workspace.selectedThreadId) ?? workspace?.threads[0] ?? null;
  const linkedRecords = workspace?.linkedRecords ?? [];
  const primaryLinkedRecord = linkedRecords[0] ?? null;
  const selectedTone = selectedThread ? priorityTone(selectedThread.priority) : 'sky';
  const launcherSourceLabel = sourceContext ? formatWorkflowSourceLabel(sourceContext) : '';
  const upstreamSourceLabel = upstreamSourceContext ? formatWorkflowSourceLabel(upstreamSourceContext) : '';
  const contextReference = useMemo(() => {
    if (contextRecordType && contextRecordId) {
      return `${contextRecordType} ${contextRecordId}`;
    }
    return contextRecordType || contextRecordId || '';
  }, [contextRecordId, contextRecordType]);
  const contextFocusLabel = useMemo(() => {
    if (!routeContext.focus.id) {
      return '';
    }

    const focusTypeLabel = routeContext.focus.type
      ? routeContext.focus.type.replace(/-/g, ' ')
      : 'focus';
    const nextLabel = `${focusTypeLabel.charAt(0).toUpperCase()}${focusTypeLabel.slice(1)} ${routeContext.focus.id}`;

    return nextLabel === contextReference ? '' : nextLabel;
  }, [contextReference, routeContext.focus.id, routeContext.focus.type]);
  const derivedCustomer =
    contextCustomer ||
    linkedRecords.find((record) => /customer/i.test(record.type))?.title ||
    '';
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? {
            ...routeContext.origin,
            customer: derivedCustomer || routeContext.origin.customer,
            note: contextNote || routeContext.origin.note || `Follow up from ${launcherSourceLabel || 'Messages'}.`,
            threadId: selectedThread?.id || routeContext.origin.threadId,
          }
        : {
            source: originSource || sourceContext || 'messages',
            recordType: contextRecordType || 'Message thread',
            recordId: contextRecordId || selectedThread?.id || '',
            customer: derivedCustomer,
            note: contextNote || `Follow up from ${launcherSourceLabel || 'Messages'}.`,
            threadId: selectedThread?.id || routeContext.origin.threadId,
          },
    [contextNote, contextRecordId, contextRecordType, derivedCustomer, launcherSourceLabel, originSource, routeContext.origin, selectedThread?.id, sourceContext],
  );
  const upstreamOriginThreadId =
    routeContext.origin.threadId && routeContext.origin.threadId !== effectiveOrigin.threadId ? routeContext.origin.threadId : '';
  const downstreamJobFocusId =
    routeContext.focus.jobId ||
    (contextRecordType === 'Job' ? contextRecordId : '') ||
    (linkedRecords.find((record) => /job/i.test(record.type))?.id ?? '');
  const downstreamWorkflowFocus = routeContext.focus.id
    ? routeContext.focus
    : downstreamJobFocusId
      ? { type: 'job', id: downstreamJobFocusId, jobId: downstreamJobFocusId }
      : undefined;
  const downstreamProgramReleaseFocus = routeContext.focus.id
    ? routeContext.focus
    : downstreamJobFocusId
      ? { type: 'job', id: downstreamJobFocusId, jobId: downstreamJobFocusId, packetId: downstreamJobFocusId }
      : undefined;
  const launcherExtras = { source: 'messages' };
  const programReleaseLauncherExtras = useMemo(
    () => ({
      source: 'messages',
      machineId: searchParams.get('machineId') || undefined,
      machineFamilyId: searchParams.get('machineFamilyId') || undefined,
      machineManufacturer: searchParams.get('machineManufacturer') || undefined,
      partClassId: searchParams.get('partClassId') || undefined,
      cadSourceId: searchParams.get('cadSourceId') || undefined,
      toolholderId: searchParams.get('toolholderId') || undefined,
      toolingPackageId: searchParams.get('toolingPackageId') || undefined,
      fixtureId: searchParams.get('fixtureId') || undefined,
      stockId: searchParams.get('stockId') || undefined,
    }),
    [searchParams],
  );
  const upstreamJobsPath = buildWorkflowPath('/jobs', location.search, {
    origin: effectiveOrigin,
    focus: downstreamWorkflowFocus,
    extras: launcherExtras,
  });
  const upstreamProgramReleasePath = buildWorkflowPath('/print-to-cnc', location.search, {
    origin: {
      ...effectiveOrigin,
      note: contextNote || `Carry this message context into the release packet from ${launcherSourceLabel || 'Messages'}.`,
    },
    focus: downstreamProgramReleaseFocus,
    extras: programReleaseLauncherExtras,
  });
  const toShellRoute = (to: string) => (isEmployeeShell && profileId ? toEmployeeShellPath(to, profileId) : to);
  const hotJobLinks = useMemo(
    () =>
      hotJobs.slice(0, 3).map((hotJob) => ({
        ...hotJob,
        jobsPath: toShellRoute(
          buildWorkflowPath('/jobs', location.search, {
            origin: {
              ...effectiveOrigin,
              note: hotJob.note || effectiveOrigin.note || `Keep ${hotJob.jobId} ahead of the normal queue from Messages.`,
            },
            focus: { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId },
            extras: launcherExtras,
          }),
        ),
      })),
    [effectiveOrigin, hotJobs, isEmployeeShell, launcherExtras, location.search, profileId],
  );
  const selectedActionWorkspace = useMemo(() => {
    if (!selectedActionLabel || !selectedThread) {
      return null;
    }

    return buildMessageActionWorkspace({
      actionLabel: selectedActionLabel,
      selectedThread,
      linkedRecords,
      launcherSourceLabel,
      contextReference,
      contextFocusLabel,
      derivedCustomer,
      contextNote,
      jobsPath: upstreamJobsPath,
      programReleasePath: upstreamProgramReleasePath,
      hotJobs,
      toShellRoute,
    });
  }, [
    contextFocusLabel,
    contextNote,
    contextReference,
    derivedCustomer,
    hotJobs,
    launcherSourceLabel,
    linkedRecords,
    selectedActionLabel,
    selectedThread,
    toShellRoute,
    upstreamJobsPath,
    programReleaseLauncherExtras,
    upstreamProgramReleasePath,
  ]);
  const unreadThreadCount = workspace?.threads.filter((thread) => thread.unreadCount > 0).length ?? 0;
  const totalUnreadCount = workspace?.threads.reduce((total, thread) => total + thread.unreadCount, 0) ?? 0;
  const topHotJob = hotJobs[0] ?? null;
  const workflowReference = contextReference || contextFocusLabel || selectedThread?.id || '';
  const activeLaneLabel = selectedActionWorkspace ? 'Action workspace' : 'Inbox thread';
  const activeLaneDetail = selectedActionWorkspace?.detail
    ?? `Selected thread "${selectedThread?.subject ?? 'the active inbox thread'}" stays attached to linked records, downstream jobs, and release follow-up while the inbox remains the continuity anchor.`;

  const actionLabels = workspace?.actionLabels ?? [];

  useEffect(() => {
    setSelectedActionLabel((current) => {
      if (current && actionLabels.includes(current)) {
        return current;
      }

      return actionLabels[0] ?? null;
    });
  }, [actionLabels, selectedThread?.id]);

  useEffect(() => {
    if (!selectedActionWorkspace) {
      setActionDraft('');
      return;
    }

    setActionDraft(selectedActionWorkspace.defaultDraft);
  }, [selectedActionWorkspace]);

  const buildThreadParams = (nextThreadId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('thread', nextThreadId);
    if (profileId) {
      nextParams.set('profile', profileId);
    }
    return nextParams;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <LoadingState label="Loading messages workspace..." />
        </div>
      </div>
    );
  }

  if (error || !workspace || !selectedThread) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <ErrorState
            message={error ?? 'Messages workspace could not be staged.'}
            onRetry={() => {
              setLoading(true);
              setError(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(11,18,28,0.98)_0%,rgba(4,9,15,0.98)_56%,rgba(8,30,43,0.95)_100%)] px-6 py-6 shadow-[0_36px_120px_rgba(0,0,0,0.34)] sm:px-7">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Messaging desk
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Messages</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{workspace.summary}</p>
              <SurfaceStatusNotice title="Mailbox convergence" surfaces={['messages', 'emailLogin']} className="mt-4" />
              {sourceContext ? (
                <div className="mt-4 rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                  {launcherSourceLabel} opened Messages with follow-up context.{' '}
                  {contextNote || 'Use this thread to keep the upstream workflow connected to the inbox.'}
                  {contextReference || contextFocusLabel || derivedCustomer || effectiveOrigin.threadId ? (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                      {contextReference ? (
                        <span>
                          Record: <span className="font-semibold normal-case tracking-normal">{contextReference}</span>
                        </span>
                      ) : null}
                      {contextFocusLabel ? (
                        <span>
                          Focus: <span className="font-semibold normal-case tracking-normal">{contextFocusLabel}</span>
                        </span>
                      ) : null}
                      {derivedCustomer ? (
                        <span>
                          Customer: <span className="font-semibold normal-case tracking-normal">{derivedCustomer}</span>
                        </span>
                      ) : null}
                      {effectiveOrigin.threadId ? (
                        <span>
                          Thread: <span className="font-semibold normal-case tracking-normal">{effectiveOrigin.threadId}</span>
                        </span>
                      ) : null}
                      {upstreamOriginThreadId ? (
                        <span>
                          Origin thread:{' '}
                          <span className="font-semibold normal-case tracking-normal">{upstreamOriginThreadId}</span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {upstreamSourceLabel ? (
                <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                  Upstream commercial origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>. Keep that provenance attached while Messages routes the thread back into jobs and release work.
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill label={workspace.identityLabel} tone="sky" />
                <StatusPill label={sourceLabel(selectedThread.source)} tone={selectedTone} />
                {hotJobs.length > 0 ? <StatusPill label={`${hotJobs.length} shop hot`} tone="rose" /> : null}
                {selectedThread.unreadCount > 0 ? (
                  <StatusPill label={`${selectedThread.unreadCount} unread`} tone="amber" />
                ) : (
                  <StatusPill label="Caught up" tone="emerald" />
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Mailbox connection</div>
              <div className="mt-4 text-lg font-semibold text-slate-50">{workspace.activeMailbox}</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">{workspace.connectionNote}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Channels</div>
              <div className="mt-4 grid gap-3">
                {workspace.channels.map((channel) => (
                  <div key={channel.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-50">{channel.label}</div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                        {channel.countLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{channel.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Threads</div>
              <div className="mt-4 space-y-3">
                {workspace.threads.map((thread) => {
                  const active = thread.id === selectedThread.id;
                  const tone = priorityTone(thread.priority);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSearchParams(buildThreadParams(thread.id))}
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        active
                          ? 'border-cyan-300/24 bg-cyan-300/[0.10] text-cyan-50'
                          : 'border-white/8 bg-black/20 text-slate-100 hover:border-white/16 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-current">{thread.subject}</div>
                          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{thread.participantsLabel}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusPill label={thread.priority} tone={tone} />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{thread.updatedLabel}</span>
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{thread.preview}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{selectedThread.ownerLabel}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">{selectedThread.subject}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill label={sourceLabel(selectedThread.source)} tone={selectedTone} />
                    <StatusPill label={selectedThread.updatedLabel} tone="slate" />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {workspace.actionLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSelectedActionLabel(label)}
                      aria-pressed={selectedActionLabel === label}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                        selectedActionLabel === label
                          ? 'border-cyan-300/28 bg-cyan-300/12 text-cyan-100'
                          : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/24 hover:bg-cyan-300/10 hover:text-cyan-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedActionWorkspace ? (
                <div className="mt-5 rounded-[24px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                        Action workspace
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-cyan-50">{selectedActionWorkspace.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/90">{selectedActionWorkspace.detail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label="Staged locally" tone="amber" />
                      <button
                        type="button"
                        onClick={() => setSelectedActionLabel(null)}
                        className="rounded-full border border-cyan-200/20 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200/30 hover:bg-black/30"
                      >
                        Clear action
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.6fr)]">
                    <div>
                      <label
                        htmlFor="messages-action-draft"
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/80"
                      >
                        {selectedActionWorkspace.draftLabel}
                      </label>
                      <textarea
                        id="messages-action-draft"
                        aria-label={selectedActionWorkspace.draftLabel}
                        value={actionDraft}
                        onChange={(event) => setActionDraft(event.target.value)}
                        rows={9}
                        className="mt-3 w-full rounded-[22px] border border-cyan-200/16 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[22px] border border-cyan-200/16 bg-slate-950/60 px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
                          Continue from this thread
                        </div>
                        <div className="mt-3 flex flex-col gap-3">
                          <Link
                            to={selectedActionWorkspace.primaryLink.to}
                            className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                          >
                            {selectedActionWorkspace.primaryLink.label}
                          </Link>
                          {selectedActionWorkspace.secondaryLink ? (
                            <Link
                              to={selectedActionWorkspace.secondaryLink.to}
                              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                            >
                              {selectedActionWorkspace.secondaryLink.label}
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-300">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Keep attached
                        </div>
                        <ul className="mt-3 space-y-2">
                          {selectedActionWorkspace.guidance.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {workspace.selectedThreadEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`max-w-[720px] rounded-[22px] border px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${directionClasses(entry.direction)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{entry.sender}</div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">{entry.senderRole}</div>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{entry.sentLabel}</div>
                    </div>
                    <div className="mt-3 text-sm leading-7">{entry.body}</div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <AppwMessagesCopilot
                deskLabel="Messages"
                activeLaneLabel={activeLaneLabel}
                activeLaneDetail={activeLaneDetail}
                workspaceSummary={workspace.summary}
                identityLabel={workspace.identityLabel}
                activeMailbox={workspace.activeMailbox}
                channelCount={workspace.channels.length}
                threadCount={workspace.threads.length}
                unreadThreadCount={unreadThreadCount}
                totalUnreadCount={totalUnreadCount}
                linkedRecordCount={linkedRecords.length}
                actionCount={workspace.actionLabels.length}
                selectedThreadId={selectedThread.id}
                selectedThreadSubject={selectedThread.subject}
                selectedThreadOwner={selectedThread.ownerLabel}
                selectedThreadSource={sourceLabel(selectedThread.source)}
                selectedThreadPriority={selectedThread.priority}
                selectedThreadUnreadCount={selectedThread.unreadCount}
                selectedThreadParticipants={selectedThread.participantsLabel}
                selectedThreadUpdatedLabel={selectedThread.updatedLabel}
                selectedEntryCount={workspace.selectedThreadEntries.length}
                selectedActionLabel={selectedActionLabel}
                actionDraftLength={actionDraft.length}
                primaryLinkedRecordLabel={primaryLinkedRecord ? `${primaryLinkedRecord.type} ${primaryLinkedRecord.id}` : null}
                primaryLinkedRecordStatus={primaryLinkedRecord?.status ?? null}
                hotJobCount={hotJobs.length}
                topHotJobId={topHotJob?.jobId ?? null}
                topHotJobCustomer={topHotJob?.customer ?? null}
                topHotJobNote={topHotJob?.note ?? null}
                workflowReference={workflowReference}
                launcherSourceLabel={launcherSourceLabel || null}
                upstreamSourceLabel={upstreamSourceLabel || null}
                contextCustomer={derivedCustomer || null}
                contextNote={contextNote || null}
                workspaceRefreshedAt={workspaceRefreshedAt}
                hotJobsRefreshedAt={hotJobsRefreshedAt}
                workspaceIssue={workspaceIssue}
                hotJobsIssue={hotJobsIssue}
              />

              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Source posture</div>
                <div className="mt-4 space-y-3">
                  <MessagesSourcePostureCard
                    label="Mounted messages workspace"
                    detail="Canonical inbox workspace for mailbox identity, channel counts, selected thread state, linked records, and staged action labels."
                    refreshedAt={workspaceRefreshedAt}
                    issue={workspaceIssue}
                  />
                  <MessagesSourcePostureCard
                    label="Mounted shop hot feed"
                    detail="Live hot-job follow-up feed that keeps inbox triage aligned with the highest-pressure work already active on the floor."
                    refreshedAt={hotJobsRefreshedAt}
                    issue={hotJobsIssue}
                  />
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Linked records</div>
                <div className="mt-4 space-y-3">
                  {workspace.linkedRecords.map((record) => (
                    <Link
                      key={record.id}
                      to={toShellRoute(record.to)}
                      className="block rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{record.title}</div>
                          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {record.type} {record.id}
                          </div>
                        </div>
                        <StatusPill label={record.status} tone="sky" />
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{record.detail}</div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Shop hot follow-up</div>
                <div className="mt-4 space-y-3">
                  {hotJobLinks.length > 0 ? (
                    hotJobLinks.map((hotJob) => (
                      <Link
                        key={hotJob.jobId}
                        to={hotJob.jobsPath}
                        className="block rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4 transition hover:border-rose-300/32 hover:bg-rose-300/[0.12]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{hotJob.partNumber}</div>
                            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-100/80">
                              {hotJob.jobId} · {hotJob.customer}
                            </div>
                          </div>
                          <StatusPill label={hotJob.dueDate === 'Unscheduled' ? 'Hot' : `Due ${hotJob.dueDate}`} tone="rose" />
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-200">{hotJob.note}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-400">
                      No shop-wide hot jobs are active right now. Messages stays tied to the inbox, but normal due-date ordering remains in effect.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Why this matters</div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <p>Email no longer needs to live outside the app as a separate source of truth for hot jobs, handoffs, or supplier replies.</p>
                  <p>The selected thread stays tied to real work records, so the message desk can later converge onto Claude-owned auth, mailbox, and delivery routes.</p>
                </div>
              </section>

              {selectedThread ? (
                <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Workflow follow-up</div>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="font-semibold text-slate-50">Keep the thread moving</div>
                      <div className="mt-2 text-slate-400">
                        Use the same conversation, thread return, and upstream provenance to jump into jobs or release work without retyping the customer or record.
                      </div>
                    </div>
                    <Link
                      to={upstreamJobsPath}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                    >
                      Open Jobs follow-up
                    </Link>
                    <Link
                      to={upstreamProgramReleasePath}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      Open Print to CNC
                    </Link>
                  </div>
                </section>
              ) : null}
            </aside>
          </main>
        </section>
      </div>
    </div>
  );
}
