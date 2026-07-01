import { buildRecordRoute, SHELL_RECORDS } from '../../components/shell/shellCatalog';
import { getEmployeeShellHomePath } from './employeeShellRoutes';
import type {
  EmailLoginOption,
  MessageChannelSummary,
  MessageEntry,
  MessageThreadSource,
  MessageThreadSummary,
  MessagesWorkspace,
  RecentEntity,
} from './contracts';

type MessageScope = 'admin' | 'machinist' | 'inspector' | 'planner';

function toRecentEntity(recordId: string): RecentEntity | null {
  const record = SHELL_RECORDS.find((entry) => entry.id === recordId);
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    type: record.type,
    status: record.status,
    owner: record.owner,
    detail: record.detail,
    workspaceLabel: record.workspaceLabel,
    workspaceRoute: record.workspaceRoute,
    to: buildRecordRoute(record),
    keywords: [...record.keywords],
  };
}

const CHANNEL_LABELS: Record<string, { label: string; detail: string }> = {
  customer: {
    label: 'Customer email',
    detail: 'Messages that originated from customer email threads and need shop follow-up.',
  },
  floor: {
    label: 'Floor handoffs',
    detail: 'Cell-side handoffs, setup notes, and quick escalations from the shop.',
  },
  quality: {
    label: 'Quality',
    detail: 'Inspection, NCR, and release evidence conversations that need visibility.',
  },
  supplier: {
    label: 'Supplier',
    detail: 'Distributor, tooling, and purchase-order responses routed into Kienzle.',
  },
  planning: {
    label: 'Planning',
    detail: 'Dispatch, due-date, and release sequencing coordination threads.',
  },
};

export const EMAIL_LOGIN_OPTIONS: EmailLoginOption[] = [
  {
    id: 'login-ops-manager',
    email: 'olivia.reyes@orchidprecision.com',
    displayName: 'Olivia Reyes',
    role: 'Operations Manager',
    department: 'Management',
    shellKind: 'admin',
    destination: '/messages',
    tagline: 'Full-shell access with the shared management inbox and cross-shop routing visibility.',
    unreadCount: 5,
  },
  {
    id: 'login-machinist',
    email: 'avery.stone@orchidprecision.com',
    displayName: 'Avery Stone',
    role: 'Machinist',
    department: 'Machining',
    shellKind: 'employee',
    profileId: 'machinist',
    destination: '/employee/messages?profile=machinist',
    tagline: 'Floor-ready login with handoffs, quality follow-up, and cell-side message routing.',
    unreadCount: 2,
  },
  {
    id: 'login-inspector',
    email: 'morgan.hale@orchidprecision.com',
    displayName: 'Morgan Hale',
    role: 'Quality Inspector',
    department: 'Quality',
    shellKind: 'employee',
    profileId: 'inspector',
    destination: '/employee/messages?profile=inspector',
    tagline: 'Inspection-first inbox with release questions, cert follow-up, and NCR communication.',
    unreadCount: 3,
  },
  {
    id: 'login-planner',
    email: 'jordan.vale@orchidprecision.com',
    displayName: 'Jordan Vale',
    role: 'Planner',
    department: 'Planning',
    shellKind: 'employee',
    profileId: 'planner',
    destination: '/employee/messages?profile=planner',
    tagline: 'Dispatch and scheduling coordination with due-date pull-ins and supplier slips.',
    unreadCount: 4,
  },
];

const THREADS_BY_SCOPE: Record<MessageScope, MessageThreadSummary[]> = {
  admin: [
    {
      id: 'thread-admin-hot-job',
      channelId: 'customer',
      subject: 'Customer pull-in on JOB-4821 shipment',
      preview: 'Sales needs management approval on the expedited ship posture and hot-job lane.',
      participantsLabel: 'Sales, customer service, Archer Precision',
      ownerLabel: 'Operations',
      updatedLabel: '6 min ago',
      source: 'email',
      priority: 'hot',
      unreadCount: 2,
      linkedRecordIds: ['JOB-4821', 'ORD-5124'],
    },
    {
      id: 'thread-admin-tooling',
      channelId: 'supplier',
      subject: 'Insert replenishment quote and dock slip',
      preview: 'The supplier revised ETA and offered a local same-day option through the regional distributor.',
      participantsLabel: 'Purchasing, Tooling crib, National distributor',
      ownerLabel: 'Purchasing',
      updatedLabel: '22 min ago',
      source: 'email',
      priority: 'watch',
      unreadCount: 1,
      linkedRecordIds: ['PO-7789'],
    },
    {
      id: 'thread-admin-quality',
      channelId: 'quality',
      subject: 'NCR-221 release readiness',
      preview: 'Quality is ready to release once operations signs off the containment response.',
      participantsLabel: 'Quality, planning, operations',
      ownerLabel: 'Quality',
      updatedLabel: '39 min ago',
      source: 'workflow',
      priority: 'watch',
      unreadCount: 0,
      linkedRecordIds: ['NCR-221', 'JOB-4821'],
    },
  ],
  machinist: [
    {
      id: 'thread-machinist-handoff',
      channelId: 'floor',
      subject: 'MC-04 setup handoff for JOB-4821',
      preview: '2nd shift left a note on the fixture offset and first-part verification after the changeover.',
      participantsLabel: '2nd shift, Avery Stone',
      ownerLabel: 'Machining',
      updatedLabel: '9 min ago',
      source: 'app',
      priority: 'hot',
      unreadCount: 1,
      linkedRecordIds: ['JOB-4821'],
    },
    {
      id: 'thread-machinist-quality',
      channelId: 'quality',
      subject: 'Witness dimension after hold release',
      preview: 'Inspection wants one extra witness check on the first op-30 part once the hold clears.',
      participantsLabel: 'Quality, Avery Stone',
      ownerLabel: 'Quality',
      updatedLabel: '27 min ago',
      source: 'email',
      priority: 'watch',
      unreadCount: 1,
      linkedRecordIds: ['NCR-221', 'JOB-4821'],
    },
    {
      id: 'thread-machinist-tooling',
      channelId: 'supplier',
      subject: 'Tool crib confirmed finisher insert pack',
      preview: 'Replacement inserts are staged in crib, with a local backup option if the first edge fails early.',
      participantsLabel: 'Tool crib, Avery Stone',
      ownerLabel: 'Tooling',
      updatedLabel: '1 hr ago',
      source: 'workflow',
      priority: 'normal',
      unreadCount: 0,
      linkedRecordIds: ['PO-7789'],
    },
  ],
  inspector: [
    {
      id: 'thread-inspector-fai',
      channelId: 'quality',
      subject: 'FAI packet signoff for JOB-4821',
      preview: 'The packet is complete except for the final signoff and one cert attachment review.',
      participantsLabel: 'Quality, metrology, Morgan Hale',
      ownerLabel: 'Quality',
      updatedLabel: '11 min ago',
      source: 'email',
      priority: 'hot',
      unreadCount: 2,
      linkedRecordIds: ['NCR-221', 'JOB-4821'],
    },
    {
      id: 'thread-inspector-dispatch',
      channelId: 'planning',
      subject: 'Release posture update for customer service',
      preview: 'Dispatch needs a quick yes/no on shipment timing before promising the outbound window.',
      participantsLabel: 'Dispatch, Morgan Hale',
      ownerLabel: 'Operations',
      updatedLabel: '31 min ago',
      source: 'app',
      priority: 'watch',
      unreadCount: 1,
      linkedRecordIds: ['ORD-5124'],
    },
    {
      id: 'thread-inspector-certs',
      channelId: 'supplier',
      subject: 'Material cert request follow-up',
      preview: 'Supplier replied with the corrected cert bundle and asked for confirmation once attached.',
      participantsLabel: 'Supplier QA, Morgan Hale',
      ownerLabel: 'Purchasing',
      updatedLabel: '58 min ago',
      source: 'email',
      priority: 'normal',
      unreadCount: 0,
      linkedRecordIds: ['PO-7789'],
    },
  ],
  planner: [
    {
      id: 'thread-planner-hot-job',
      channelId: 'planning',
      subject: 'Hot-job resequence for JOB-4821',
      preview: 'Management marked the impeller package hot and wants it floated ahead of the normal due-date stack.',
      participantsLabel: 'Operations, planning, Jordan Vale',
      ownerLabel: 'Planning',
      updatedLabel: '4 min ago',
      source: 'workflow',
      priority: 'hot',
      unreadCount: 2,
      linkedRecordIds: ['JOB-4821'],
    },
    {
      id: 'thread-planner-orders',
      channelId: 'customer',
      subject: 'Customer asked for same-day ship confirmation',
      preview: 'The customer wants a release-time answer once heat treat and inspection are aligned.',
      participantsLabel: 'Customer service, Jordan Vale',
      ownerLabel: 'Orders',
      updatedLabel: '18 min ago',
      source: 'email',
      priority: 'watch',
      unreadCount: 1,
      linkedRecordIds: ['ORD-5124'],
    },
    {
      id: 'thread-planner-supplier',
      channelId: 'supplier',
      subject: 'Supplier slip threatens downstream handoff',
      preview: 'The dock delay is small, but it will matter if the evening release decision waits much longer.',
      participantsLabel: 'Purchasing, Jordan Vale',
      ownerLabel: 'Purchasing',
      updatedLabel: '43 min ago',
      source: 'email',
      priority: 'watch',
      unreadCount: 1,
      linkedRecordIds: ['PO-7789'],
    },
  ],
};

const ENTRIES_BY_THREAD: Record<string, MessageEntry[]> = {
  'thread-admin-hot-job': [
    {
      id: 'entry-admin-hot-job-1',
      sender: 'Alicia Chen',
      senderRole: 'Customer service',
      sentLabel: '10 min ago',
      body: 'Customer pulled the requested ship date in by one day. If management approves the hot-job posture, they want the updated timing sent before lunch.',
      source: 'email',
      direction: 'inbound',
    },
    {
      id: 'entry-admin-hot-job-2',
      sender: 'Kienzle workflow',
      senderRole: 'System',
      sentLabel: '8 min ago',
      body: 'JOB-4821 was marked shop hot and moved to the front of the dispatch queue for all floor-facing desks.',
      source: 'workflow',
      direction: 'internal',
    },
    {
      id: 'entry-admin-hot-job-3',
      sender: 'Olivia Reyes',
      senderRole: 'Operations Manager',
      sentLabel: '6 min ago',
      body: 'Approve the pull-in if scheduling can resequence MC-06 without breaking the outbound order promise.',
      source: 'app',
      direction: 'outbound',
    },
  ],
  'thread-admin-tooling': [
    {
      id: 'entry-admin-tooling-1',
      sender: 'North Shore Tool Supply',
      senderRole: 'Distributor',
      sentLabel: '24 min ago',
      body: 'Dock slipped to tomorrow morning, but the local branch can hand-carry the insert pack today if you want us to split the order.',
      source: 'email',
      direction: 'inbound',
    },
    {
      id: 'entry-admin-tooling-2',
      sender: 'Kienzle purchasing',
      senderRole: 'Workflow',
      sentLabel: '22 min ago',
      body: 'Local expedite option is likely positive ROI because the same insert pack protects two at-risk jobs.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-admin-quality': [
    {
      id: 'entry-admin-quality-1',
      sender: 'Morgan Hale',
      senderRole: 'Quality Inspector',
      sentLabel: '45 min ago',
      body: 'Containment is complete. I only need operations approval on the response note before I clear the packet.',
      source: 'app',
      direction: 'inbound',
    },
    {
      id: 'entry-admin-quality-2',
      sender: 'Kienzle workflow',
      senderRole: 'System',
      sentLabel: '39 min ago',
      body: 'Release posture is now waiting on one management acknowledgment instead of two separate signatures.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-machinist-handoff': [
    {
      id: 'entry-machinist-handoff-1',
      sender: '2nd Shift',
      senderRole: 'Machinist',
      sentLabel: '13 min ago',
      body: 'Offset was re-zeroed after the last run. First part should get a slower prove-out before you resume full runtime.',
      source: 'app',
      direction: 'inbound',
    },
    {
      id: 'entry-machinist-handoff-2',
      sender: 'Kienzle workflow',
      senderRole: 'System',
      sentLabel: '9 min ago',
      body: 'Traveler packet is still waiting on the op-30 department scan, so keep the handoff note attached to the current run.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-machinist-quality': [
    {
      id: 'entry-machinist-quality-1',
      sender: 'Morgan Hale',
      senderRole: 'Quality Inspector',
      sentLabel: '29 min ago',
      body: 'When the hold clears, please grab one extra witness dimension on the first part and attach it to the packet before runtime continues.',
      source: 'email',
      direction: 'inbound',
    },
  ],
  'thread-machinist-tooling': [
    {
      id: 'entry-machinist-tooling-1',
      sender: 'Tool crib',
      senderRole: 'Crib attendant',
      sentLabel: '1 hr ago',
      body: 'Your backup finisher inserts are staged in crib. If you index early, send a quick note so cost-per-part stays accurate.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-inspector-fai': [
    {
      id: 'entry-inspector-fai-1',
      sender: 'Metrology',
      senderRole: 'Inspection support',
      sentLabel: '15 min ago',
      body: 'Use the updated fixture on the witness dimension, then the FAI packet is ready for your final release note.',
      source: 'email',
      direction: 'inbound',
    },
    {
      id: 'entry-inspector-fai-2',
      sender: 'Kienzle workflow',
      senderRole: 'System',
      sentLabel: '11 min ago',
      body: 'The packet will unblock shipment as soon as the final signoff is attached to the traveler record.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-inspector-dispatch': [
    {
      id: 'entry-inspector-dispatch-1',
      sender: 'Dispatch',
      senderRole: 'Planner',
      sentLabel: '31 min ago',
      body: 'Customer service is waiting on your yes/no before they update the outbound promise. Even a blocker answer is helpful right now.',
      source: 'app',
      direction: 'inbound',
    },
  ],
  'thread-inspector-certs': [
    {
      id: 'entry-inspector-certs-1',
      sender: 'Titan Alloy QA',
      senderRole: 'Supplier QA',
      sentLabel: '58 min ago',
      body: 'Attached corrected certs. Reply here once they are linked to the packet and we will close the supplier follow-up.',
      source: 'email',
      direction: 'inbound',
    },
  ],
  'thread-planner-hot-job': [
    {
      id: 'entry-planner-hot-job-1',
      sender: 'Olivia Reyes',
      senderRole: 'Operations Manager',
      sentLabel: '5 min ago',
      body: 'Keep the hot-job posture visible in every to-do list until the shipment risk is back inside buffer.',
      source: 'app',
      direction: 'inbound',
    },
    {
      id: 'entry-planner-hot-job-2',
      sender: 'Kienzle workflow',
      senderRole: 'System',
      sentLabel: '4 min ago',
      body: 'Jobs desk, shop clock, and employee shift-priority surfaces were reordered to put JOB-4821 first.',
      source: 'workflow',
      direction: 'internal',
    },
  ],
  'thread-planner-orders': [
    {
      id: 'entry-planner-orders-1',
      sender: 'Customer service',
      senderRole: 'Office',
      sentLabel: '18 min ago',
      body: 'As soon as you know whether the heat-treat release will hold, I need one sentence I can send back to the customer.',
      source: 'email',
      direction: 'inbound',
    },
  ],
  'thread-planner-supplier': [
    {
      id: 'entry-planner-supplier-1',
      sender: 'Purchasing',
      senderRole: 'Buyer',
      sentLabel: '43 min ago',
      body: 'Supplier slip is manageable if dispatch chooses the local expedite option before the evening wave.',
      source: 'email',
      direction: 'inbound',
    },
  ],
};

function determineScope(profileId?: string, email?: string | null): MessageScope {
  if (profileId === 'machinist' || profileId === 'inspector' || profileId === 'planner') {
    return profileId;
  }

  const matchedIdentity = email ? resolveEmailLoginFixture(email) : null;
  if (matchedIdentity?.profileId === 'machinist' || matchedIdentity?.profileId === 'inspector' || matchedIdentity?.profileId === 'planner') {
    return matchedIdentity.profileId;
  }

  return 'admin';
}

function getDefaultIdentity(scope: MessageScope) {
  if (scope === 'admin') {
    return EMAIL_LOGIN_OPTIONS[0];
  }

  return EMAIL_LOGIN_OPTIONS.find((option) => option.profileId === scope) ?? EMAIL_LOGIN_OPTIONS[0];
}

function buildChannelSummaries(threads: MessageThreadSummary[]): MessageChannelSummary[] {
  const channels = new Map<string, { count: number; unread: number }>();

  for (const thread of threads) {
    const current = channels.get(thread.channelId) ?? { count: 0, unread: 0 };
    current.count += 1;
    current.unread += thread.unreadCount;
    channels.set(thread.channelId, current);
  }

  return [...channels.entries()].map(([channelId, stats]) => ({
    id: channelId,
    label: CHANNEL_LABELS[channelId]?.label ?? channelId,
    detail: CHANNEL_LABELS[channelId]?.detail ?? 'Thread routing summary.',
    countLabel: `${stats.count} thread${stats.count === 1 ? '' : 's'} · ${stats.unread} unread`,
  }));
}

function buildActionLabels(scope: MessageScope, source: MessageThreadSource) {
  if (scope === 'admin') {
    return source === 'email'
      ? ['Reply by email', 'Route to owner', 'Post shop-wide note']
      : ['Acknowledge in Kienzle', 'Promote to management note', 'Jump to linked record'];
  }

  return source === 'email'
    ? ['Reply by email', 'Acknowledge in app', 'Jump to linked job']
    : ['Acknowledge handoff', 'Reply in Kienzle', 'Open linked record'];
}

export function resolveEmailLoginFixture(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return EMAIL_LOGIN_OPTIONS.find((option) => option.email.toLowerCase() === normalized) ?? null;
}

export function buildMessagesWorkspaceFixture(input?: {
  profileId?: string;
  email?: string | null;
  threadId?: string | null;
}): MessagesWorkspace {
  const scope = determineScope(input?.profileId, input?.email);
  const identity = resolveEmailLoginFixture(input?.email ?? '') ?? getDefaultIdentity(scope);
  const threads = THREADS_BY_SCOPE[scope];
  const selectedThreadId = threads.some((thread) => thread.id === input?.threadId) ? input?.threadId ?? threads[0].id : threads[0].id;
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0];
  const linkedRecords = selectedThread.linkedRecordIds
    .map((recordId) => toRecentEntity(recordId))
    .filter((record): record is RecentEntity => record !== null);

  const summaryByScope: Record<MessageScope, string> = {
    admin: 'Shared management inbox that merges customer email, supplier replies, and workflow escalations into one operating thread view.',
    machinist: 'Floor-facing inbox that keeps setup handoffs, quality replies, and tooling updates inside the same app shell as the job and clock.',
    inspector: 'Inspection inbox that combines FAI, cert, and release communication with traveler-linked records in one view.',
    planner: 'Planning inbox for hot-job posture, due-date pull-ins, supplier slips, and dispatch coordination without leaving the employee shell.',
  };

  return {
    summary: summaryByScope[scope],
    identityLabel: `${identity.displayName} · ${identity.role}`,
    activeMailbox: identity.email,
    connectionNote:
      'Email-linked conversations are staged as Kienzle message threads here so the frontend can converge on Claude-owned mailbox ingestion, delivery, and read-state routes later.',
    channels: buildChannelSummaries(threads),
    threads,
    selectedThreadId,
    selectedThreadEntries: ENTRIES_BY_THREAD[selectedThreadId] ?? [],
    actionLabels: buildActionLabels(scope, selectedThread.source),
    linkedRecords,
  };
}

export function getDefaultSignInDestinationForScope(scope: MessageScope) {
  if (scope === 'admin') {
    return '/messages';
  }

  return getEmployeeShellHomePath(scope);
}
