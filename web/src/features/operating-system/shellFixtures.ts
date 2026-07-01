import { buildRecordRoute, SHELL_RECORDS } from '../../components/shell/shellCatalog';
import type {
  DeskCounts,
  EmployeeShellBootstrap,
  EmployeeShellProfileSummary,
  SearchResult,
  ShellBootstrap,
} from './contracts';

export function toSearchResult(record: (typeof SHELL_RECORDS)[number]): SearchResult {
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

export const FIXTURE_RESULTS = SHELL_RECORDS.map(toSearchResult);

export function matchesSearchResult(result: SearchResult, query: string) {
  return [
    result.id,
    result.title,
    result.type,
    result.status,
    result.owner,
    result.detail,
    result.workspaceLabel,
    ...result.keywords,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export const SHELL_DESK_COUNTS: DeskCounts = {
  inbox: 11,
  approvals: 4,
  atRisk: 3,
  liveJobs: 6,
};

export const SHELL_BOOTSTRAP: ShellBootstrap = {
  deskCounts: SHELL_DESK_COUNTS,
  pinnedEntities: [FIXTURE_RESULTS[0], FIXTURE_RESULTS[1], FIXTURE_RESULTS[3]],
  recentEntities: [FIXTURE_RESULTS[4], FIXTURE_RESULTS[8], FIXTURE_RESULTS[2]],
  shellNote:
    'Frontend shell search, pins, recents, and desk counts now flow through provider seams so Claude-owned backend payloads can replace fixtures without rewriting the shell.',
};

export const EMPLOYEE_BOOTSTRAPS: Record<string, EmployeeShellBootstrap> = {
  machinist: {
    profileId: 'machinist',
    employeeId: 'EMP-001',
    displayName: 'Avery Stone',
    role: 'Machinist',
    department: 'Machining',
    subtitle: 'Touch-first floor view with only the work, checks, and learning a cell-side operator needs.',
    homeModules: [
      { id: 'my-jobs', title: 'My active jobs', detail: 'Current routed work with traveler posture and due-date focus.', to: '/jobs?focusId=JOB-4821&focusType=job', countLabel: '2 active' },
      { id: 'shop-clock', title: 'Shop clock', detail: 'Scan, check in, and move between timed tasks quickly on a phone.', to: '/shop-clock?scan=PRISMJOB|job=JOB-4821', countLabel: 'Ready now' },
      { id: 'capture', title: 'Capture ops', detail: 'Camera, QR, setup photos, and troubleshooting evidence from the floor.', to: '/capture', countLabel: 'Camera ready' },
      { id: 'messages', title: 'Messages', detail: 'Email-linked handoffs, supervisor notes, and quality follow-up routed into one inbox.', to: '/messages', countLabel: '2 unread' },
      { id: 'learning', title: 'Recommended learning', detail: 'Targeted lessons tied to current work and recent issues.', to: '/learning', countLabel: '1 lesson' },
    ],
    navGroups: [
      {
        id: 'today',
        label: 'Today',
        items: [
          { id: 'today-jobs', label: 'Jobs', to: '/jobs?focusId=JOB-4821&focusType=job', description: 'Dispatch view filtered to the job that needs action.', countLabel: '2 at risk' },
          { id: 'today-clock', label: 'Shop Clock', to: '/shop-clock?scan=PRISMJOB|job=JOB-4821', description: 'QR-driven clock, department check-in, and task switching.', countLabel: 'Touch ready' },
        ],
      },
      {
        id: 'support',
        label: 'Support',
        items: [
          { id: 'support-quality', label: 'Quality', to: '/quality?focusId=NCR-221&focusType=quality', description: 'Open quality holds relevant to current work.', countLabel: '1 hold' },
          { id: 'support-capture', label: 'Capture Ops', to: '/capture', description: 'Use the camera, mic, and QR tools for setup evidence, machine mapping, and troubleshooting.', countLabel: 'Field ready' },
          { id: 'support-messages', label: 'Messages', to: '/messages', description: 'Email-fed handoffs and replies that belong in the floor shell.', countLabel: '2 unread' },
          { id: 'support-learning', label: 'Learning', to: '/learning', description: 'Lessons and shop knowledge without admin clutter.' },
        ],
      },
    ],
    accessCards: [
      {
        id: 'machinist-floor',
        label: 'Primary lane',
        value: 'Cell-side execution',
        detail: 'Jobs, shop clock, and learning stay in reach without office-shell clutter.',
        tone: 'emerald',
      },
      {
        id: 'machinist-quality',
        label: 'Quality scope',
        value: 'Relevant holds only',
        detail: 'Operators can see the quality issues that block their current work, not the whole admin quality desk.',
        tone: 'sky',
      },
      {
        id: 'machinist-privacy',
        label: 'Private surfaces',
        value: 'Hidden by policy',
        detail: 'Payroll, HR, finance, and unrelated customer/accounting pages stay outside the employee shell.',
        tone: 'violet',
      },
    ],
    shiftPriorities: [
      {
        id: 'machinist-priority-setup',
        label: 'Now',
        title: 'Setup changeover at MC-04',
        detail: 'Swap to the queued fixture pack, confirm the traveler, and get the next cycle running before the due-date buffer closes.',
        to: '/shop-clock?scan=PRISMJOB|job=JOB-4821',
        badge: '18 min buffer',
        tone: 'amber',
      },
      {
        id: 'machinist-priority-hold',
        label: 'Watch',
        title: 'Quality hold on op 30',
        detail: 'Stay on the current traveler packet until the inspection hold clears, then return to runtime capture without leaving the floor shell.',
        to: '/quality?focusId=NCR-221&focusType=quality',
        badge: '1 hold',
        tone: 'rose',
      },
      {
        id: 'machinist-priority-learning',
        label: 'Improve',
        title: 'Probe recovery refresher',
        detail: 'One targeted learning card is queued because the last setup needed a manual probe recovery.',
        to: '/learning',
        badge: '6 min lesson',
        tone: 'sky',
      },
    ],
    attentionItems: [
      {
        id: 'machinist-alert-tooling',
        label: 'Watch',
        title: 'Tool life watch on T08 finisher',
        detail: 'The current finisher is near its expected wear window, so the next setup should confirm insert condition before cycle release.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
        tone: 'rose',
      },
      {
        id: 'machinist-alert-scan',
        label: 'Blocker',
        title: 'Department scan still missing on op 30',
        detail: 'One routed step is still missing the downstream department handoff, which will keep the traveler from closing cleanly.',
        to: '/shop-clock?scan=PRISMJOB|job=JOB-4821',
        tone: 'amber',
      },
    ],
    handoffNotes: [
      {
        id: 'machinist-handoff-night',
        author: '2nd Shift',
        timestampLabel: '18 min ago',
        detail: 'Fixture offset was re-zeroed after the last run. Confirm the first part on the next setup changeover before full runtime resumes.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
      },
      {
        id: 'machinist-handoff-quality',
        author: 'Quality',
        timestampLabel: '42 min ago',
        detail: 'Inspection wants one extra witness dimension on the first op-30 part after the hold clears.',
        to: '/quality?focusId=NCR-221&focusType=quality',
      },
    ],
    restrictedSurfaces: [
      {
        id: 'machinist-payroll',
        label: 'Payroll and timecard review',
        detail: 'Supervisor and payroll workflows stay out of the machinist shell even though touch-first clocking is available.',
      },
      {
        id: 'machinist-finance',
        label: 'Finance, invoicing, and ledger',
        detail: 'Commercial and accounting surfaces are intentionally hidden from floor execution roles.',
      },
      {
        id: 'machinist-hr',
        label: 'HR and private people records',
        detail: 'Employee privacy and compliance data remain outside the floor-facing experience.',
      },
    ],
    hotJobs: [],
    deskCounts: { inbox: 3, approvals: 1, atRisk: 2, liveJobs: 2 },
    pins: [FIXTURE_RESULTS[0], FIXTURE_RESULTS[8]],
    recents: [FIXTURE_RESULTS[0], FIXTURE_RESULTS[4]],
    policyNote:
      'Fixture claims mirror the role-filtered portal Codex will bind to backend-issued claims later. HR, payroll, finance, and private people data remain out of this employee shell.',
  },
  inspector: {
    profileId: 'inspector',
    employeeId: 'EMP-014',
    displayName: 'Morgan Hale',
    role: 'Quality Inspector',
    department: 'Quality',
    subtitle: 'Quality-facing shell with traveler visibility, NCR focus, and no finance or private HR surfaces.',
    homeModules: [
      { id: 'quality-holds', title: 'Quality holds', detail: 'NCRs, first article status, and shipment blockers in one strip.', to: '/quality?focusId=NCR-221&focusType=quality', countLabel: '1 NCR' },
      { id: 'jobs-review', title: 'Job review', detail: 'Open job desks with traveler and attachment context.', to: '/jobs?focusId=JOB-4821&focusType=job', countLabel: '2 jobs' },
      { id: 'quality-capture', title: 'Capture ops', detail: 'Take photos, scans, and evidence clips for FAI, NCR, and release records.', to: '/capture', countLabel: 'Evidence lane' },
      { id: 'quality-messages', title: 'Messages', detail: 'Inspection replies, cert follow-up, and release questions in one inbox.', to: '/messages', countLabel: '3 unread' },
      { id: 'shop-clock', title: 'Clock + scans', detail: 'Department registration and inspection task capture.', to: '/shop-clock?scan=PRISMJOB|job=JOB-4821', countLabel: 'Inspection lane' },
    ],
    navGroups: [
      {
        id: 'quality',
        label: 'Quality',
        items: [
          { id: 'quality-ncr', label: 'NCR desk', to: '/quality?focusId=NCR-221&focusType=quality', description: 'Containment, cert traceability, and release blockers.', countLabel: '1 open' },
          { id: 'quality-jobs', label: 'Jobs', to: '/jobs?focusId=JOB-4821&focusType=job', description: 'Traveler, attachments, and inspection packet status.' },
        ],
      },
      {
        id: 'quality-support',
        label: 'Support',
        items: [
          { id: 'quality-clock', label: 'Shop Clock', to: '/shop-clock?scan=PRISMJOB|job=JOB-4821', description: 'Capture inspection time and scan state without leaving the floor.' },
          { id: 'quality-capture-nav', label: 'Capture Ops', to: '/capture', description: 'Stage photos, print scans, and audio/video evidence into inspection and setup records.', countLabel: 'Evidence lane' },
          { id: 'quality-messages-nav', label: 'Messages', to: '/messages', description: 'Email-fed FAI, cert, and release communication for inspection roles.', countLabel: '3 unread' },
          { id: 'quality-learning', label: 'Learning', to: '/learning', description: 'Training and reference content only.' },
        ],
      },
    ],
    accessCards: [
      {
        id: 'inspector-quality',
        label: 'Primary lane',
        value: 'Inspection release',
        detail: 'NCRs, traveler context, and inspection-time capture stay visible together.',
        tone: 'emerald',
      },
      {
        id: 'inspector-jobs',
        label: 'Job visibility',
        value: 'Traveler + packet view',
        detail: 'Inspectors can review the job packet and release blockers without entering planning or finance desks.',
        tone: 'sky',
      },
      {
        id: 'inspector-boundary',
        label: 'Private surfaces',
        value: 'Restricted',
        detail: 'Payroll, HR, customer credit, and broader admin tools remain outside the quality shell.',
        tone: 'violet',
      },
    ],
    shiftPriorities: [
      {
        id: 'inspector-priority-fai',
        label: 'Release',
        title: 'FAI packet on JOB-4821',
        detail: 'The first-article packet is waiting on signoff before the job can move past inspection release.',
        to: '/quality?focusId=NCR-221&focusType=quality',
        badge: 'Shipment blocker',
        tone: 'rose',
      },
      {
        id: 'inspector-priority-traveler',
        label: 'Verify',
        title: 'Traveler packet completeness',
        detail: 'Two routed packets need attachment and cert checks before the queue can be released cleanly.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
        badge: '2 packets',
        tone: 'amber',
      },
      {
        id: 'inspector-priority-clock',
        label: 'Capture',
        title: 'Inspection time capture',
        detail: 'Stay in the touch-ready clock lane while moving between dimensional checks and release evidence capture.',
        to: '/shop-clock?scan=PRISMJOB|job=JOB-4821',
        badge: 'Cell-side',
        tone: 'sky',
      },
    ],
    attentionItems: [
      {
        id: 'inspector-alert-release',
        label: 'Blocker',
        title: 'FAI signoff still holding shipment',
        detail: 'The release packet is complete except for one first-article signoff, so the queue stays blocked until inspection closes it.',
        to: '/quality?focusId=NCR-221&focusType=quality',
        tone: 'rose',
      },
      {
        id: 'inspector-alert-cert',
        label: 'Watch',
        title: 'Material cert attachment missing',
        detail: 'One traveler packet is still missing the cert attachment needed for a clean outbound release.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
        tone: 'amber',
      },
    ],
    handoffNotes: [
      {
        id: 'inspector-handoff-dispatch',
        author: 'Dispatch',
        timestampLabel: '24 min ago',
        detail: 'Customer was told inspection would confirm release posture before 4:30 PM, so the packet needs a quick answer either way.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
      },
      {
        id: 'inspector-handoff-metrology',
        author: 'Metrology',
        timestampLabel: '1 hr ago',
        detail: 'Use the updated check fixture for the final witness dimension on the next part through inspection.',
        to: '/learning',
      },
    ],
    restrictedSurfaces: [
      {
        id: 'inspector-payroll',
        label: 'Payroll and finance operations',
        detail: 'Inspectors can capture time and quality evidence, but not access payroll, invoicing, or ledger workflows.',
      },
      {
        id: 'inspector-hr',
        label: 'HR and private employee records',
        detail: 'Private people data and HR compliance actions stay hidden from inspection roles.',
      },
      {
        id: 'inspector-planning',
        label: 'Broad scheduling and dispatch control',
        detail: 'Inspectors see release blockers, not the full production-planning control room.',
      },
    ],
    hotJobs: [],
    deskCounts: { inbox: 4, approvals: 2, atRisk: 1, liveJobs: 3 },
    pins: [FIXTURE_RESULTS[6], FIXTURE_RESULTS[0]],
    recents: [FIXTURE_RESULTS[6], FIXTURE_RESULTS[4]],
    policyNote:
      'This quality shell intentionally excludes payroll, HR, customer credit, and finance desks while keeping inspection-relevant job context visible.',
  },
  planner: {
    profileId: 'planner',
    employeeId: 'EMP-021',
    displayName: 'Jordan Vale',
    role: 'Planner',
    department: 'Planning',
    subtitle: 'Planning-focused shell with dispatch, scheduling, and exception management, but still no payroll or private HR data.',
    homeModules: [
      { id: 'planner-jobs', title: 'Dispatch board', detail: 'Queue-first jobs desk with traveler, shortages, and approvals.', to: '/jobs?focusId=JOB-4821&focusType=job', countLabel: '6 live' },
      { id: 'planner-scheduling', title: 'Scheduling', detail: 'Planner studies, release gates, and exception review.', to: '/scheduling', countLabel: '4 studies' },
      { id: 'planner-orders', title: 'Orders', detail: 'Customer-facing release and ship posture.', to: '/orders?focusId=ORD-5124&focusType=order', countLabel: '1 ready' },
      { id: 'planner-messages', title: 'Messages', detail: 'Hot-job notes, customer pull-ins, and supplier slips routed into the planner inbox.', to: '/messages', countLabel: '4 unread' },
    ],
    navGroups: [
      {
        id: 'planning',
        label: 'Planning',
        items: [
          { id: 'planning-jobs', label: 'Jobs', to: '/jobs?focusId=JOB-4821&focusType=job', description: 'Dispatch board with traveler and shortage context.', countLabel: '6 live' },
          { id: 'planning-scheduling', label: 'Scheduling', to: '/scheduling', description: 'Release readiness, bottlenecks, and publish posture.', countLabel: '2 holds' },
          { id: 'planning-orders', label: 'Orders', to: '/orders?focusId=ORD-5124&focusType=order', description: 'Delivery posture and customer-facing follow-up.' },
        ],
      },
      {
        id: 'planning-support',
        label: 'Support',
        items: [
          { id: 'planning-quality', label: 'Quality', to: '/quality?focusId=NCR-221&focusType=quality', description: 'Quality holds that block release.' },
          { id: 'planning-capture', label: 'Capture Ops', to: '/capture', description: 'Capture setup evidence, machine notes, and supplier/troubleshooting media without leaving the planning shell.' },
          { id: 'planning-messages', label: 'Messages', to: '/messages', description: 'Dispatch, customer, and supplier communication without leaving the employee shell.', countLabel: '4 unread' },
          { id: 'planning-learning', label: 'Learning', to: '/learning', description: 'Training and references only.' },
        ],
      },
    ],
    accessCards: [
      {
        id: 'planner-dispatch',
        label: 'Primary lane',
        value: 'Dispatch + scheduling',
        detail: 'Planning roles can move between the jobs desk, scheduling posture, and order-release visibility.',
        tone: 'emerald',
      },
      {
        id: 'planner-exceptions',
        label: 'Exception scope',
        value: 'Cross-desk blockers',
        detail: 'Quality holds and order-release blockers stay visible without exposing the full finance or HR suite.',
        tone: 'amber',
      },
      {
        id: 'planner-privacy',
        label: 'Private surfaces',
        value: 'Still hidden',
        detail: 'Even planners stay out of payroll, HR, and accounting pages in the employee-only shell.',
        tone: 'violet',
      },
    ],
    shiftPriorities: [
      {
        id: 'planner-priority-release',
        label: 'Release',
        title: 'Release JOB-4821 to heat treat',
        detail: 'Traveler, shortage posture, and the downstream supplier handoff are all close to ready but still need one dispatch decision.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
        badge: 'Due today',
        tone: 'rose',
      },
      {
        id: 'planner-priority-schedule',
        label: 'Balance',
        title: 'Machine-cell bottleneck at MC-06',
        detail: 'The latest study shows a spindle conflict that needs resequencing before the evening release window.',
        to: '/scheduling',
        badge: '2 holds',
        tone: 'amber',
      },
      {
        id: 'planner-priority-orders',
        label: 'Follow up',
        title: 'Customer-ready ship update',
        detail: 'One order is ready for outbound communication once the release desk confirms final traveler posture.',
        to: '/orders?focusId=ORD-5124&focusType=order',
        badge: '1 ready',
        tone: 'sky',
      },
    ],
    attentionItems: [
      {
        id: 'planner-alert-bottleneck',
        label: 'Blocker',
        title: 'MC-06 bottleneck is eating release buffer',
        detail: 'The current schedule study still leaves a spindle conflict that will delay one routed job if sequencing is not adjusted.',
        to: '/scheduling',
        tone: 'rose',
      },
      {
        id: 'planner-alert-shortage',
        label: 'Watch',
        title: 'Heat treat handoff needs dispatch confirmation',
        detail: 'Supplier timing is available, but the release lane still needs the final go/no-go from planning.',
        to: '/jobs?focusId=JOB-4821&focusType=job',
        tone: 'amber',
      },
    ],
    handoffNotes: [
      {
        id: 'planner-handoff-orders',
        author: 'Customer service',
        timestampLabel: '12 min ago',
        detail: 'Customer requested a same-day update once the heat-treat release decision is made.',
        to: '/orders?focusId=ORD-5124&focusType=order',
      },
      {
        id: 'planner-handoff-quality',
        author: 'Quality',
        timestampLabel: '36 min ago',
        detail: 'Inspection is prepared to clear the hold once planning confirms the resequenced op order.',
        to: '/quality?focusId=NCR-221&focusType=quality',
      },
    ],
    restrictedSurfaces: [
      {
        id: 'planner-payroll',
        label: 'Payroll and HR operations',
        detail: 'Planning roles can coordinate work release, but private people operations remain outside the shell.',
      },
      {
        id: 'planner-ledger',
        label: 'Ledger, invoicing, and finance closes',
        detail: 'Commercial release posture is visible, but accounting execution stays in the admin shell.',
      },
      {
        id: 'planner-private-customer',
        label: 'Private customer credit and admin-only records',
        detail: 'Planning sees operational order context, not the full private commercial desk.',
      },
    ],
    hotJobs: [],
    deskCounts: { inbox: 6, approvals: 3, atRisk: 3, liveJobs: 6 },
    pins: [FIXTURE_RESULTS[0], FIXTURE_RESULTS[4], FIXTURE_RESULTS[3]],
    recents: [FIXTURE_RESULTS[4], FIXTURE_RESULTS[0], FIXTURE_RESULTS[1]],
    policyNote:
      'Planning claims expand into dispatch and scheduling, but still keep finance, payroll, and HR-compliance routes out of the employee-only shell.',
  },
};

export function listEmployeeProfileSummaries(): EmployeeShellProfileSummary[] {
  return Object.values(EMPLOYEE_BOOTSTRAPS).map<EmployeeShellProfileSummary>((bootstrap) => ({
    id: bootstrap.profileId,
    displayName: bootstrap.displayName,
    role: bootstrap.role,
    department: bootstrap.department,
    tagline: bootstrap.subtitle,
  }));
}

export function getEmployeeBootstrap(profileId?: string): EmployeeShellBootstrap {
  return EMPLOYEE_BOOTSTRAPS[profileId ?? 'machinist'] ?? EMPLOYEE_BOOTSTRAPS.machinist;
}
