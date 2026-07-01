/**
 * OperatingSystemCoordinationEngine
 * =================================
 *
 * Lightweight backend authority for operating-system messages and hot jobs.
 * This intentionally starts as in-memory state so frontend live-provider swaps
 * can converge without blocking on persistence, auth stitching, or realtime.
 */

export interface HotJobRecord {
  jobId: string;
  partNumber: string;
  customer: string;
  dueDate: string;
  note: string;
  setBy: string;
  setAt: string;
}

export interface MessageChannelSummary {
  id: string;
  label: string;
  detail: string;
  countLabel: string;
}

export interface MessageThreadSummary {
  id: string;
  channelId: string;
  subject: string;
  preview: string;
  participantsLabel: string;
  ownerLabel: string;
  updatedLabel: string;
  source: "email" | "app" | "workflow";
  priority: "normal" | "watch" | "hot";
  unreadCount: number;
  linkedRecordIds: string[];
}

export interface MessageEntry {
  id: string;
  sender: string;
  senderRole: string;
  sentLabel: string;
  body: string;
  source: "email" | "app" | "workflow";
  direction: "inbound" | "outbound" | "internal";
}

export interface LinkedRecord {
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

type MessageScope = "admin" | "machinist" | "inspector" | "planner";

type InboxIdentity = {
  email: string;
  displayName: string;
  role: string;
  profileId?: "machinist" | "inspector" | "planner";
};

const IDENTITIES: InboxIdentity[] = [
  {
    email: "olivia.reyes@orchidprecision.com",
    displayName: "Olivia Reyes",
    role: "Operations Manager",
  },
  {
    email: "avery.stone@orchidprecision.com",
    displayName: "Avery Stone",
    role: "Machinist",
    profileId: "machinist",
  },
  {
    email: "morgan.hale@orchidprecision.com",
    displayName: "Morgan Hale",
    role: "Quality Inspector",
    profileId: "inspector",
  },
  {
    email: "jordan.vale@orchidprecision.com",
    displayName: "Jordan Vale",
    role: "Planner",
    profileId: "planner",
  },
];

const LINKED_RECORDS: Record<string, LinkedRecord> = {
  "JOB-4821": {
    id: "JOB-4821",
    title: "IMP-2041",
    type: "Job",
    status: "running",
    owner: "Archer Precision",
    detail: "Impeller package in active execution.",
    workspaceLabel: "Jobs",
    workspaceRoute: "/jobs",
    to: "/jobs?focusId=JOB-4821&focusType=job",
    keywords: ["JOB-4821", "IMP-2041", "Archer Precision"],
  },
  "ORD-5124": {
    id: "ORD-5124",
    title: "Order 5124",
    type: "Order",
    status: "watch",
    owner: "Archer Precision",
    detail: "Outbound order tied to the customer ship promise.",
    workspaceLabel: "Order Tracking",
    workspaceRoute: "/order-tracking",
    to: "/order-tracking?focusId=ORD-5124&focusType=order",
    keywords: ["ORD-5124", "order", "Archer Precision"],
  },
  "NCR-221": {
    id: "NCR-221",
    title: "NCR-221",
    type: "Quality",
    status: "review",
    owner: "Quality",
    detail: "Containment and release posture still tracked in quality.",
    workspaceLabel: "Quality",
    workspaceRoute: "/quality",
    to: "/quality?focusId=NCR-221&focusType=quality",
    keywords: ["NCR-221", "quality", "release"],
  },
  "PO-7789": {
    id: "PO-7789",
    title: "PO-7789",
    type: "PO",
    status: "watch",
    owner: "Purchasing",
    detail: "Supplier slip and expedite choice remain open.",
    workspaceLabel: "Purchase Orders",
    workspaceRoute: "/purchase-orders",
    to: "/purchase-orders?focusId=PO-7789&focusType=po",
    keywords: ["PO-7789", "purchasing", "supplier"],
  },
};

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
    {
      id: "thread-admin-quality",
      channelId: "quality",
      subject: "NCR-221 release readiness",
      preview: "Quality is ready to release once operations signs off the containment response.",
      participantsLabel: "Quality, planning, operations",
      ownerLabel: "Quality",
      updatedLabel: "39 min ago",
      source: "workflow",
      priority: "watch",
      unreadCount: 0,
      linkedRecordIds: ["NCR-221", "JOB-4821"],
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
      id: "thread-machinist-quality",
      channelId: "quality",
      subject: "Witness dimension after hold release",
      preview: "Inspection wants one extra witness check on the first op-30 part once the hold clears.",
      participantsLabel: "Quality, Avery Stone",
      ownerLabel: "Quality",
      updatedLabel: "27 min ago",
      source: "email",
      priority: "watch",
      unreadCount: 1,
      linkedRecordIds: ["NCR-221", "JOB-4821"],
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
    {
      id: "thread-inspector-certs",
      channelId: "supplier",
      subject: "Material cert request follow-up",
      preview: "Supplier replied with the corrected cert bundle and asked for confirmation once attached.",
      participantsLabel: "Supplier QA, Morgan Hale",
      ownerLabel: "Purchasing",
      updatedLabel: "58 min ago",
      source: "email",
      priority: "normal",
      unreadCount: 0,
      linkedRecordIds: ["PO-7789"],
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
    {
      id: "thread-planner-supplier",
      channelId: "supplier",
      subject: "Supplier slip threatens downstream handoff",
      preview: "The dock delay is small, but it will matter if the evening release decision waits much longer.",
      participantsLabel: "Purchasing, Jordan Vale",
      ownerLabel: "Purchasing",
      updatedLabel: "43 min ago",
      source: "email",
      priority: "watch",
      unreadCount: 1,
      linkedRecordIds: ["PO-7789"],
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
    {
      id: "entry-admin-hot-job-3",
      sender: "Olivia Reyes",
      senderRole: "Operations Manager",
      sentLabel: "6 min ago",
      body: "Approve the pull-in if scheduling can resequence MC-06 without breaking the outbound order promise.",
      source: "app",
      direction: "outbound",
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
    {
      id: "entry-machinist-handoff-2",
      sender: "PRISM workflow",
      senderRole: "System",
      sentLabel: "9 min ago",
      body: "Traveler packet is still waiting on the op-30 department scan, so keep the handoff note attached to the current run.",
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
    {
      id: "entry-inspector-fai-2",
      sender: "PRISM workflow",
      senderRole: "System",
      sentLabel: "11 min ago",
      body: "The packet will unblock shipment as soon as the final signoff is attached to the traveler record.",
      source: "workflow",
      direction: "internal",
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
    {
      id: "entry-planner-hot-job-2",
      sender: "PRISM workflow",
      senderRole: "System",
      sentLabel: "4 min ago",
      body: "Jobs desk, shop clock, and employee shift-priority surfaces were reordered to put JOB-4821 first.",
      source: "workflow",
      direction: "internal",
    },
  ],
};

let hotJobs: HotJobRecord[] = [];

function toDueRank(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function sortHotJobs(records: HotJobRecord[]) {
  return [...records].sort((left, right) => {
    const dueRank = toDueRank(left.dueDate) - toDueRank(right.dueDate);
    if (dueRank !== 0) return dueRank;

    const setAtRank = Date.parse(right.setAt) - Date.parse(left.setAt);
    if (Number.isFinite(setAtRank) && setAtRank !== 0) return setAtRank;

    return left.jobId.localeCompare(right.jobId);
  });
}

function normalizeHotJobRecord(record: Partial<HotJobRecord> & Pick<HotJobRecord, "jobId">): HotJobRecord {
  return {
    jobId: record.jobId,
    partNumber: record.partNumber?.trim() || record.jobId,
    customer: record.customer?.trim() || "Unassigned customer",
    dueDate: record.dueDate?.trim() || "Unscheduled",
    note: record.note?.trim() || "Upper management flagged this job hot for shop-wide execution ordering.",
    setBy: record.setBy?.trim() || "Upper management",
    setAt: record.setAt?.trim() || new Date().toISOString(),
  };
}

function determineScope(profileId?: string, email?: string | null): MessageScope {
  if (profileId === "machinist" || profileId === "inspector" || profileId === "planner") {
    return profileId;
  }

  const identity = resolveIdentity(email);
  if (identity?.profileId) {
    return identity.profileId;
  }

  return "admin";
}

function resolveIdentity(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  return IDENTITIES.find((record) => record.email.toLowerCase() === normalized) ?? null;
}

function getDefaultIdentity(scope: MessageScope) {
  if (scope === "admin") return IDENTITIES[0];
  return IDENTITIES.find((record) => record.profileId === scope) ?? IDENTITIES[0];
}

function buildChannelSummaries(threads: MessageThreadSummary[]): MessageChannelSummary[] {
  const counts = new Map<string, { count: number; unread: number }>();

  for (const thread of threads) {
    const current = counts.get(thread.channelId) ?? { count: 0, unread: 0 };
    current.count += 1;
    current.unread += thread.unreadCount;
    counts.set(thread.channelId, current);
  }

  return [...counts.entries()].map(([channelId, stats]) => ({
    id: channelId,
    label: CHANNEL_LABELS[channelId]?.label ?? channelId,
    detail: CHANNEL_LABELS[channelId]?.detail ?? "Thread routing summary.",
    countLabel: `${stats.count} thread${stats.count === 1 ? "" : "s"} · ${stats.unread} unread`,
  }));
}

function buildActionLabels(scope: MessageScope, source: MessageThreadSummary["source"]) {
  if (scope === "admin") {
    return source === "email"
      ? ["Reply by email", "Route to owner", "Post shop-wide note"]
      : ["Acknowledge in PRISM", "Promote to management note", "Jump to linked record"];
  }

  return source === "email"
    ? ["Reply by email", "Acknowledge in app", "Jump to linked job"]
    : ["Acknowledge handoff", "Reply in PRISM", "Open linked record"];
}

export class OperatingSystemCoordinationEngine {
  static listHotJobs(): HotJobRecord[] {
    return sortHotJobs(hotJobs);
  }

  static setHotJob(record: Partial<HotJobRecord> & Pick<HotJobRecord, "jobId">): HotJobRecord[] {
    const nextRecord = normalizeHotJobRecord(record);
    hotJobs = sortHotJobs([...hotJobs.filter((entry) => entry.jobId !== nextRecord.jobId), nextRecord]);
    return OperatingSystemCoordinationEngine.listHotJobs();
  }

  static clearHotJob(jobId: string): HotJobRecord[] {
    hotJobs = hotJobs.filter((record) => record.jobId !== jobId);
    return OperatingSystemCoordinationEngine.listHotJobs();
  }

  static buildMessagesWorkspace(input?: {
    profileId?: string;
    email?: string | null;
    threadId?: string | null;
  }): MessagesWorkspace {
    const scope = determineScope(input?.profileId, input?.email);
    const identity = resolveIdentity(input?.email) ?? getDefaultIdentity(scope);
    const threads = THREADS_BY_SCOPE[scope];
    const selectedThreadId = threads.some((thread) => thread.id === input?.threadId)
      ? input?.threadId ?? threads[0].id
      : threads[0].id;
    const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0];
    const linkedRecords = selectedThread.linkedRecordIds
      .map((recordId) => LINKED_RECORDS[recordId] ?? null)
      .filter((record): record is LinkedRecord => record !== null);

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
        "Email-linked conversations are staged as PRISM message threads here so the frontend can converge on full mailbox ingestion, delivery, and read-state routes later.",
      channels: buildChannelSummaries(threads),
      threads,
      selectedThreadId,
      selectedThreadEntries: ENTRIES_BY_THREAD[selectedThreadId] ?? [],
      actionLabels: buildActionLabels(scope, selectedThread.source),
      linkedRecords,
    };
  }
}

export const operatingSystemCoordinationEngine = new OperatingSystemCoordinationEngine();
