import type { Job } from '../../api/types';
import { buildJobTrackingPacket } from '../../utils/jobTracking';
import type { ApprovalSummary, JobDeskRecord, JobIntakeDraft, TravelerStepStatus } from './contracts';

const WORKCENTERS = ['Mill 4', 'Lathe 2', '5-Axis Cell', 'Inspection', 'Deburr', 'Assembly'];
const OWNERS = ['Programming', 'Planning', 'Quality', 'Production', 'Purchasing', 'Shipping'];
const ATTACHMENT_LIBRARY = [
  { label: 'Traveler packet', type: 'PDF' },
  { label: 'Inspection plan', type: 'Checklist' },
  { label: 'Customer print rev B', type: 'Drawing' },
  { label: 'Setup sheet', type: 'CAM' },
  { label: 'Material cert bundle', type: 'Cert' },
  { label: 'Packout notes', type: 'Doc' },
];

function normalizeDate(value?: string) {
  if (!value) return 'Unscheduled';
  return value;
}

function safeHours(value?: number) {
  return typeof value === 'number' ? value : 0;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function buildDraftPreviewJob(form: JobIntakeDraft): Job {
  const previewNumber = `JOB-${new Date().getFullYear()}-${(form.part_number || 'NEW')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, 'X')}`;

  return {
    id: previewNumber,
    customer: form.customer || 'Pending customer',
    part_number: form.part_number || 'NEW-PART',
    description: form.description || form.part_number || 'New traveler packet',
    status: 'planned',
    quantity: parseInt(form.quantity, 10) || 0,
    due_date: form.due_date || todayStamp(),
    priority: (form.priority as Job['priority']) || 'normal',
    material: form.material || 'TBD',
    estimated_hours: 8,
    actual_hours: 0,
    created_at: todayStamp(),
  };
}

function getSeed(job: Job, index: number) {
  return Array.from(`${job.id}-${job.part_number}-${index}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function buildJobApprovals(job: Job): ApprovalSummary[] {
  if (job.status === 'quoted') {
    return [
      {
        id: `${job.id}-planner-release`,
        label: 'Planner release',
        owner: 'Planning',
        status: 'waiting',
        detail: 'Planner still needs to release the traveler and initial route.',
      },
      {
        id: `${job.id}-customer-commitment`,
        label: 'Customer commitment',
        owner: 'Sales',
        status: 'ready',
        detail: 'Due date and split-ship promise can be confirmed once release happens.',
      },
    ];
  }

  if (job.status === 'planned') {
    return [
      {
        id: `${job.id}-traveler-signed`,
        label: 'Traveler signed',
        owner: 'Planning',
        status: 'approved',
        detail: 'Initial packet is released and ready to move into setup.',
      },
      {
        id: `${job.id}-setup-review`,
        label: 'Setup review',
        owner: 'Programming',
        status: 'waiting',
        detail: 'Fixture, offsets, and setup sheet need final confirmation before run release.',
      },
    ];
  }

  if (job.status === 'in_progress') {
    return [
      {
        id: `${job.id}-packet-live`,
        label: 'Packet live',
        owner: 'Production',
        status: 'approved',
        detail: 'Traveler is active on the floor and operator timing is attached.',
      },
      {
        id: `${job.id}-ship-readiness`,
        label: 'Ship readiness',
        owner: 'Shipping',
        status: 'ready',
        detail: 'Prepare docs and labels so downstream release does not wait on paperwork.',
      },
    ];
  }

  return [
    {
      id: `${job.id}-closed`,
      label: 'Production close',
      owner: 'Operations',
      status: 'approved',
      detail: 'The traveler and follow-up actions are already cleared for this job state.',
    },
  ];
}

export function buildJobDeskRecord(job: Job, index: number): JobDeskRecord {
  const seed = getSeed(job, index);
  const workcenter = WORKCENTERS[seed % WORKCENTERS.length];
  const owner = OWNERS[seed % OWNERS.length];
  const travelerStatuses: TravelerStepStatus[] =
    job.status === 'quoted'
      ? ['ready', 'blocked', 'blocked', 'blocked']
      : job.status === 'planned'
        ? ['complete', 'ready', 'blocked', 'blocked']
        : job.status === 'in_progress'
          ? ['complete', 'running', 'ready', 'blocked']
          : job.status === 'complete'
            ? ['complete', 'complete', 'complete', 'ready']
            : ['complete', 'complete', 'complete', 'complete'];

  const shortages =
    job.status === 'quoted' || job.status === 'invoiced'
      ? []
      : [
          {
            id: `${job.id}-shortage-0`,
            item: seed % 2 === 0 ? `${job.material ?? 'Material'} bar stock` : 'Roughing insert set',
            eta: seed % 2 === 0 ? 'Dock 14:30 today' : 'Supplier ETA tomorrow 09:00',
            severity: job.status === 'in_progress' ? ('high' as const) : ('watch' as const),
            action: seed % 2 === 0 ? 'Reserve heat lot' : 'Convert shortage to PO expedite',
            owner: seed % 2 === 0 ? 'Inventory' : 'Purchasing',
          },
          ...(job.status === 'in_progress'
            ? [
                {
                  id: `${job.id}-shortage-1`,
                  item: 'Inspection fixture',
                  eta: 'Toolroom queue 2 hrs',
                  severity: 'watch' as const,
                  action: 'Coordinate fixture release',
                  owner: 'Toolroom',
                },
              ]
            : []),
        ];

  return {
    jobId: job.id,
    owner,
    workcenter,
    queueSlot: `Q-${((seed % 5) + 1).toString().padStart(2, '0')}`,
    isHot: false,
    hotNote: null,
    traveler: [
      {
        id: `${job.id}-traveler-op10`,
        code: 'OP10',
        title: 'Material + prep',
        machine: 'Saw / staging',
        estimate: '1.4 hr',
        status: travelerStatuses[0],
        note: `${job.material ?? 'Material'} staged with cut list and traveler release.`,
      },
      {
        id: `${job.id}-traveler-op20`,
        code: 'OP20',
        title: 'Primary machine cycle',
        machine: workcenter,
        estimate: `${Math.max(2.5, safeHours(job.estimated_hours) * 0.55 || 4.8).toFixed(1)} hr`,
        status: travelerStatuses[1],
        note: 'Fixture, offsets, and tool-life checks tied to the dispatch lane.',
      },
      {
        id: `${job.id}-traveler-op30`,
        code: 'OP30',
        title: 'Inspection + secondary',
        machine: seed % 2 === 0 ? 'CMM / deburr' : 'Bench / QC',
        estimate: `${Math.max(1.2, safeHours(job.estimated_hours) * 0.2 || 1.8).toFixed(1)} hr`,
        status: travelerStatuses[2],
        note: 'First article, burr review, and cert packet packaging stay linked here.',
      },
      {
        id: `${job.id}-traveler-op40`,
        code: 'OP40',
        title: 'Packout + ship release',
        machine: 'Shipping',
        estimate: '0.8 hr',
        status: travelerStatuses[3],
        note: 'Customer docs, labels, and ASN release happen from the same job desk.',
      },
    ],
    shortages,
    approvals: buildJobApprovals(job),
    attachments: [
      ATTACHMENT_LIBRARY[seed % ATTACHMENT_LIBRARY.length],
      ATTACHMENT_LIBRARY[(seed + 2) % ATTACHMENT_LIBRARY.length],
      ATTACHMENT_LIBRARY[(seed + 4) % ATTACHMENT_LIBRARY.length],
    ].map((item, attachmentIndex) => ({
      id: `${job.id}-attachment-${attachmentIndex}`,
      ...item,
      freshness:
        attachmentIndex === 0
          ? 'Updated 28 min ago'
          : attachmentIndex === 1
            ? 'Synced today'
            : 'Available on release',
    })),
    timeline: [
      {
        id: `${job.id}-timeline-0`,
        time: '07:18',
        title: 'Planner released traveler',
        detail: `Queue slot ${((seed % 4) + 1).toString().padStart(2, '0')} assigned at ${workcenter}.`,
        tone: 'neutral',
      },
      {
        id: `${job.id}-timeline-1`,
        time: '09:05',
        title: job.status === 'in_progress' ? 'Operator clocked into primary op' : 'Setup review queued',
        detail:
          job.status === 'in_progress'
            ? 'Offsets and tool pack were confirmed against setup sheet.'
            : 'Setup confirmation is waiting on the current machine release.',
        tone: job.status === 'in_progress' ? 'good' : 'watch',
      },
      {
        id: `${job.id}-timeline-2`,
        time: '11:40',
        title: shortages.length > 0 ? 'Material / tooling exception posted' : 'No open material exceptions',
        detail: shortages.length > 0 ? shortages[0].action : 'Dispatch board shows clear supply posture for the selected job.',
        tone: shortages.length > 0 ? 'watch' : 'good',
      },
      {
        id: `${job.id}-timeline-3`,
        time: '13:10',
        title: 'Customer-facing commitment synced',
        detail: `Due date remains ${normalizeDate(job.due_date)} with ${job.priority} priority posture.`,
        tone: 'neutral',
      },
    ],
    purchasingActions:
      shortages.length > 0
        ? shortages.map((shortage) => shortage.action)
        : ['No purchasing escalation needed', 'Keep supplier and cert documents linked to this job'],
    nextActions:
      shortages.length > 0
        ? ['Resolve shortage and confirm ETA', 'Keep traveler tied to the selected workcenter', 'Push any due-date impact into the customer timeline']
        : ['Release next traveler step', 'Confirm inspection packet readiness', 'Stage packout and final docs'],
  };
}

export function buildJobDeskRecords(jobs: Job[]) {
  return jobs.map((job, index) => buildJobDeskRecord(job, index));
}

export function buildJobIntakePreview(form: JobIntakeDraft) {
  const previewJob = buildDraftPreviewJob(form);
  return {
    previewJob,
    packet: buildJobTrackingPacket(previewJob),
  };
}
