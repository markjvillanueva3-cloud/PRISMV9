type MessageScope = "admin" | "machinist" | "inspector" | "planner";
type MessageThreadSource = "email" | "app" | "workflow";
type MessageThreadPriority = "normal" | "watch" | "hot";

interface MessageWorkspaceInput {
  profileId?: string;
  email?: string | null;
  threadId?: string | null;
}

interface LinkedRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  detail: string;
  workspaceLabel: string;
  workspaceRoute: string;
  to: string;
  keywords: string[];
}

interface MessageChannelSummary {
  id: string;
  label: string;
  detail: string;
  countLabel: string;
}

interface MessageThreadSummary {
  id: string;
  channelId: string;
  subject: string;
  preview: string;
  participantsLabel: string;
  ownerLabel: string;
  updatedLabel: string;
  source: MessageThreadSource;
  priority: MessageThreadPriority;
  unreadCount: number;
  linkedRecordIds: string[];
}

interface MessageEntry {
  id: string;
  sender: string;
  senderRole: string;
  sentLabel: string;
  body: string;
  source: MessageThreadSource;
  direction: "inbound" | "outbound" | "internal";
}

export interface MessagesWorkspace {
  summary: string;
  identityLabel: string;
  activeMailbox: string;
  connectionNote: string;
  channels: MessageChannelSummary[];
  threads: MessageThreadSummary[];
  selectedThreadId: string;
  selectedThreadEntries: MessageEntry[];
  actionLabels: string[];
  linkedRecords: LinkedRecord[];
}

interface IdentityRecord {
  scope: MessageScope;
  displayName: string;
  role: string;
  email: string;
}

const CHANNEL_LABELS: Record<string, { label: string; detail: string }> = {
  customer: {
    label: "Customer email",
    detail: "Messages that originated from customer email threads and need shop follow-up.",
  },
  floor: {
    label: "Floor handoffs",
    detail: "Cell-side handoffs, setup notes, and quick escalations from the shop.",
  },
  quality: {
    label: "Quality",
    detail: "Inspection, NCR, and release evidence conversations that need visibility.",
  },
  supplier: {
    label: "Supplier",
    detail: "Distributor, tooling, and purchase-order responses routed into PRISM.",
  },
  planning: {
    label: "Planning",
    detail: "Dispatch, due-date, and release sequencing coordination threads.",
  },
};

const IDENTITIES: IdentityRecord[] = [
  {
    scope: "admin",
    displayName: "Olivia Reyes",
    role: "Operations Manager",
    email: "olivia.reyes@orchidprecision.com",
  },
  {
    scope: "machinist",
    displayName: "Avery Stone",
    role: "Machinist",
    email: "avery.stone@orchidprecision.com",
  },
  {
    scope: "inspector",
    displayName: "Morgan Hale",
    role: "Quality Inspector",
    email: "morgan.hale@orchidprecision.com",
  },
  {
    scope: "planner",
    displayName: "Jordan Vale",
    role: "Planner",
    email: "jordan.vale@orchidprecision.com",
  },
];

const LINKED_RECORDS: Record<string, LinkedRecord> = {
  "JOB-4821": {
    id: "JOB-4821",
    title: "Impeller finish pass",
    type: "Job",
    status: "hot",
    owner: "Archer Precision",
    detail: "Hot impeller package with customer pull-in risk and linked shop-floor continuity.",
    workspaceLabel: "Jobs",
    workspaceRoute: "/jobs",
    to: "/jobs?focusId=JOB-4821&focusType=job",
    keywords: ["JOB-4821", "impeller", "archer precision"],
  },
  "ORD-5124": {
    id: "ORD-5124",
    title: "Outbound order 5124",
    type: "Order",
    status: "watch",
    owner: "Customer service",
    detail: "Order promise under review pending release and ship confirmation.",
    workspaceLabel: "Order Tracking",
    workspaceRoute: "/order-tracking",
    to: "/order-tracking?focusId=ORD-5124&focusType=order",
    keywords: ["ORD-5124", "shipment", "customer service"],
  },
  "PO-7789": {
    id: "PO-7789",
    title: "Insert replenishment PO",
    type: "PO",
    status: "watch",
    owner: "Purchasing",
    detail: "Critical tooling replenishment with alternate local sourcing option.",
    workspaceLabel: "Purchase Orders",
    workspaceRoute: "/purchase-orders",
    to: "/purchase-orders?focusId=PO-7789&focusType=po",
    keywords: ["PO-7789", "tooling", "insert"],
  },
  "NCR-221": {
    id: "NCR-221",
    title: "NCR-221 containment",
    type: "Quality",
    status: "review",
    owner: "Quality",
    detail: "Release packet is waiting on containment acknowledgement and final evidence review.",
    workspaceLabel: "Quality",
    workspaceRoute: "/quality",
    to: "/quality?focusId=NCR-221&focusType=quality",
    keywords: ["NCR-221", "quality", "containment"],
  },
};

const THREADS_BY_SCOPE: Record<MessageScope, MessageThreadSummary[]> = {
  admin: [
    {
      id: "thread-admin-hot-job",
      channelId: "customer",
      subject: "Customer pull-in on JOB-4821 shipment",
      preview: "Sales needs management approval on the expedited ship posture and hot-job lane.",
      participantsLabel: "Sales, customer service, Archer Precision",
      ownerLabel: "Operations",
      updatedLabel: "6 min ago",
      source: "email",
      priority: "hot",
      unreadCount: 2,
      linkedRecordIds: ["JOB-4821", "ORD-5124"],
    },
    {
      id: "thread-admin-tooling",
      channelId: "supplier",
      subject: "Insert replenishment quote and dock slip",
      preview: "The supplier revised ETA and offered a local same-day option through the regional distributor.",
      participantsLabel: "Purchasing, Tooling crib, National distributor",
      ownerLabel: "Purchasing",
      updatedLabel: "22 min ago",
      source: "email",
      priority: "watch",
      unreadCount: 1,
      linkedRecordIds: ["PO-7789"],
    },
  ],
  machinist: [
    {
      id: "thread-machinist-handoff",
      channelId: "floor",
      subject: "MC-04 setup handoff for JOB-4821",
      preview: "2nd shift left a note on the fixture offset and first-part verification after the changeover.",
      participantsLabel: "2nd shift, Avery Stone",
      ownerLabel: "Machining",
      updatedLabel: "9 min ago",
      source: "app",
      priority: "hot",
      unreadCount: 1,
      linkedRecordIds: ["JOB-4821"],
    },
    {
      id: "thread-machinist-tooling",
      channelId: "supplier",
      subject: "Tool crib confirmed finisher insert pack",
      preview: "Replacement inserts are staged in crib, with a local backup option if the first edge fails early.",
      participantsLabel: "Tool crib, Avery Stone",
      ownerLabel: "Tooling",
      updatedLabel: "1 hr ago",
      source: "workflow",
      priority: "normal",
      unreadCount: 0,
      linkedRecordIds: ["PO-7789"],
    },
  ],
  inspector: [
    {
      id: "thread-inspector-fai",
      channelId: "quality",
      subject: "FAI packet signoff for JOB-4821",
      preview: "The packet is complete except for the final signoff and one cert attachment review.",
      participantsLabel: "Quality, metrology, Morgan Hale",
      ownerLabel: "Quality",
      updatedLabel: "11 min ago",
      source: "email",
      priority: "hot",
      unreadCount: 2,
      linkedRecordIds: ["NCR-221", "JOB-4821"],
    },
    {
      id: "thread-inspector-dispatch",
      channelId: "planning",
      subject: "Release posture update for customer service",
      preview: "Dispatch needs a quick yes/no on shipment timing before promising the outbound window.",
      participantsLabel: "Dispatch, Morgan Hale",
      ownerLabel: "Operations",
      updatedLabel: "31 min ago",
      source: "app",
      priority: "watch",
      unreadCount: 1,
      linkedRecordIds: ["ORD-5124"],
    },
  ],
  planner: [
    {
      id: "thread-planner-hot-job",
      channelId: "planning",
      subject: "Hot-job resequence for JOB-4821",
      preview: "Management marked the impeller package hot and wants it floated ahead of the normal due-date stack.",
      participantsLabel: "Operations, planning, Jordan Vale",
      ownerLabel: "Planning",
      updatedLabel: "4 min ago",
      source: "workflow",
      priority: "hot",
      unreadCount: 2,
      linkedRecordIds: ["JOB-4821"],
    },
    {
      id: "thread-planner-orders",
      channelId: "customer",
      subject: "Customer asked for same-day ship confirmation",
      preview: "The customer wants a release-time answer once heat treat and inspection are aligned.",
      participantsLabel: "Customer service, Jordan Vale",
      ownerLabel: "Orders",
      updatedLabel: "18 min ago",
      source: "email",
      priority: "watch",
      unreadCount: 1,
      linkedRecordIds: ["ORD-5124"],
    },
  ],
};

const ENTRIES_BY_THREAD: Record<string, MessageEntry[]> = {
  "thread-admin-hot-job": [
    {
      id: "entry-admin-hot-job-1",
      sender: "Alicia Chen",
      senderRole: "Customer service",
      sentLabel: "10 min ago",
      body: "Customer pulled the requested ship date in by one day. If management approves the hot-job posture, they want the updated timing sent before lunch.",
      source: "email",
      direction: "inbound",
    },
    {
      id: "entry-admin-hot-job-2",
      sender: "PRISM workflow",
      senderRole: "System",
      sentLabel: "8 min ago",
      body: "JOB-4821 was marked shop hot and moved to the front of the dispatch queue for all floor-facing desks.",
      source: "workflow",
      direction: "internal",
    },
  ],
  "thread-admin-tooling": [
    {
      id: "entry-admin-tooling-1",
      sender: "North Shore Tool Supply",
      senderRole: "Distributor",
      sentLabel: "24 min ago",
      body: "Dock slipped to tomorrow morning, but the local branch can hand-carry the insert pack today if you want us to split the order.",
      source: "email",
      direction: "inbound",
    },
  ],
  "thread-machinist-handoff": [
    {
      id: "entry-machinist-handoff-1",
      sender: "2nd Shift",
      senderRole: "Machinist",
      sentLabel: "13 min ago",
      body: "Offset was re-zeroed after the last run. First part should get a slower prove-out before you resume full runtime.",
      source: "app",
      direction: "inbound",
    },
  ],
  "thread-machinist-tooling": [
    {
      id: "entry-machinist-tooling-1",
      sender: "Tool crib",
      senderRole: "Crib attendant",
      sentLabel: "1 hr ago",
      body: "Your backup finisher inserts are staged in crib. If you index early, send a quick note so cost-per-part stays accurate.",
      source: "workflow",
      direction: "internal",
    },
  ],
  "thread-inspector-fai": [
    {
      id: "entry-inspector-fai-1",
      sender: "Metrology",
      senderRole: "Inspection support",
      sentLabel: "15 min ago",
      body: "Use the updated fixture on the witness dimension, then the FAI packet is ready for your final release note.",
      source: "email",
      direction: "inbound",
    },
  ],
  "thread-inspector-dispatch": [
    {
      id: "entry-inspector-dispatch-1",
      sender: "Dispatch",
      senderRole: "Planner",
      sentLabel: "31 min ago",
      body: "Customer service is waiting on your yes/no before they update the outbound promise. Even a blocker answer is helpful right now.",
      source: "app",
      direction: "inbound",
    },
  ],
  "thread-planner-hot-job": [
    {
      id: "entry-planner-hot-job-1",
      sender: "Olivia Reyes",
      senderRole: "Operations Manager",
      sentLabel: "5 min ago",
      body: "Keep the hot-job posture visible in every to-do list until the shipment risk is back inside buffer.",
      source: "app",
      direction: "inbound",
    },
  ],
  "thread-planner-orders": [
    {
      id: "entry-planner-orders-1",
      sender: "Customer service",
      senderRole: "Office",
      sentLabel: "18 min ago",
      body: "As soon as you know whether the heat-treat release will hold, I need one sentence I can send back to the customer.",
      source: "email",
      direction: "inbound",
    },
  ],
};

function determineScope(profileId?: string, email?: string | null): MessageScope {
  if (profileId === "machinist") {
    return "machinist";
  }

  if (profileId === "inspector" || profileId === "quality") {
    return "inspector";
  }

  if (profileId === "planner" || profileId === "lead") {
    return "planner";
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const matchedIdentity = IDENTITIES.find((identity) => identity.email.toLowerCase() === normalizedEmail);
    if (matchedIdentity) {
      return matchedIdentity.scope;
    }
  }

  return "admin";
}

function getIdentity(scope: MessageScope, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const matchedIdentity = IDENTITIES.find((identity) => identity.email.toLowerCase() === normalizedEmail);
    if (matchedIdentity) {
      return matchedIdentity;
    }
  }

  return IDENTITIES.find((identity) => identity.scope === scope) ?? IDENTITIES[0];
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
    detail: CHANNEL_LABELS[channelId]?.detail ?? "Thread routing summary.",
    countLabel: `${stats.count} thread${stats.count === 1 ? "" : "s"} · ${stats.unread} unread`,
  }));
}

function buildActionLabels(scope: MessageScope, source: MessageThreadSource) {
  if (scope === "admin") {
    return source === "email"
      ? ["Reply by email", "Route to owner", "Post shop-wide note"]
      : ["Acknowledge in PRISM", "Promote to management note", "Open linked record"];
  }

  return source === "email"
    ? ["Reply by email", "Acknowledge in app", "Open linked record"]
    : ["Acknowledge handoff", "Reply in PRISM", "Open linked record"];
}

export class OperatingSystemMessagesEngine {
  static buildWorkspace(input?: MessageWorkspaceInput): MessagesWorkspace {
    const scope = determineScope(input?.profileId, input?.email);
    const identity = getIdentity(scope, input?.email);
    const threads = THREADS_BY_SCOPE[scope];
    const selectedThreadId = threads.some((thread) => thread.id === input?.threadId)
      ? input?.threadId ?? threads[0].id
      : threads[0].id;
    const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0];
    const linkedRecords = selectedThread.linkedRecordIds
      .map((recordId) => LINKED_RECORDS[recordId])
      .filter((record): record is LinkedRecord => Boolean(record));

    const summaryByScope: Record<MessageScope, string> = {
      admin: "Shared management inbox that merges customer email, supplier replies, and workflow escalations into one operating thread view.",
      machinist: "Floor-facing inbox that keeps setup handoffs, quality replies, and tooling updates inside the same app shell as the job and clock.",
      inspector: "Inspection inbox that combines FAI, cert, and release communication with traveler-linked records in one view.",
      planner: "Planning inbox for hot-job posture, due-date pull-ins, supplier slips, and dispatch coordination without leaving the employee shell.",
    };

    return {
      summary: summaryByScope[scope],
      identityLabel: `${identity.displayName} · ${identity.role}`,
      activeMailbox: identity.email,
      connectionNote:
        "Backend-owned messages workspace is active for thread composition, linked-record continuity, and hot-job context. Delivery/read-state actions still deepen as mailbox authority converges further.",
      channels: buildChannelSummaries(threads),
      threads,
      selectedThreadId,
      selectedThreadEntries: ENTRIES_BY_THREAD[selectedThreadId] ?? [],
      actionLabels: buildActionLabels(scope, selectedThread.source),
      linkedRecords,
    };
  }
}

export const operatingSystemMessagesEngine = new OperatingSystemMessagesEngine();
