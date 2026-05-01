import type { Employee, Job } from '../api/types';

export type PacketDepartmentStatus = 'pending' | 'current' | 'complete';

export type PacketDepartment = {
  id: string;
  label: string;
  owner: string;
  status: PacketDepartmentStatus;
  note: string;
};

export type PacketOperation = {
  id: string;
  code: string;
  label: string;
  department: string;
  estimatedMinutes: number;
  cycleSeconds: number;
  quantityTarget: number;
  note: string;
};

export type JobTrackingPacket = {
  jobId: string;
  jobName: string;
  customer: string;
  partNumber: string;
  quantity: number;
  dueDate: string;
  material: string;
  priority: string;
  qrPayload: string;
  stickerLabel: string;
  departments: PacketDepartment[];
  operations: PacketOperation[];
  packetNotes: string[];
};

export type ParsedJobTrackingPayload = {
  raw: string;
  jobId: string;
  jobName: string;
  customer: string;
  partNumber: string;
  quantity: number;
  dueDate: string;
  material: string;
  priority: string;
  departments: string[];
  operations: string[];
};

export type MobileTaskTemplate = {
  id: string;
  title: string;
  department: string;
  operationCode: string;
  quantityTarget: number;
  cycleSeconds: number;
  note: string;
};

const DEPARTMENT_FLOW = [
  { id: 'intake', label: 'Intake', owner: 'Planning', note: 'Register the job, print stickers, and staple the front sheet to the packet.' },
  { id: 'cad', label: 'CAD work', owner: 'Engineering', note: 'Release or confirm model changes before toolpath and print packets move downstream.' },
  { id: 'cam', label: 'CAM programming', owner: 'Programming', note: 'Toolpath, setup sheet, and simulation sign-off live with the traveler.' },
  { id: 'setup', label: 'Job setup', owner: 'Production', note: 'Fixture, offsets, probing, and first-piece setup should be confirmed here.' },
  { id: 'run', label: 'Run cycle', owner: 'Production', note: 'Track cycle time, quantity made, and any overrun for inventory or safety stock.' },
  { id: 'qc', label: 'Quality', owner: 'Quality', note: 'Inspection, NCR checks, and cert packet updates belong on the same packet.' },
  { id: 'shipping', label: 'Shipping', owner: 'Shipping', note: 'Packout, labels, and customer-facing release complete the job packet.' },
];

function normalizedText(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeTrackedDepartment(value: string, operation = '') {
  const department = normalizedText(value);
  const operationText = normalizedText(operation);

  if (!department) {
    return '';
  }

  const exactMatch = DEPARTMENT_FLOW.find((entry) => normalizedText(entry.label) === department);
  if (exactMatch) {
    return exactMatch.label;
  }

  if (department.includes('quality') || department.includes('inspect')) return 'Quality';
  if (department.includes('ship')) return 'Shipping';
  if (department.includes('receiv') || department.includes('intake') || department.includes('plan')) return 'Intake';
  if (department.includes('cad') || department.includes('engineer')) return 'CAD work';
  if (department.includes('program')) return 'CAM programming';
  if (department.includes('quote')) return 'Job setup';
  if (
    department.includes('setup') ||
    operationText.includes('setup') ||
    operationText.includes('prove') ||
    operationText.includes('probe') ||
    operationText.includes('fixture')
  ) {
    return 'Job setup';
  }
  if (
    department.includes('machin') ||
    department.includes('production') ||
    department.includes('run') ||
    department.includes('mill') ||
    department.includes('turn') ||
    department.includes('lathe')
  ) {
    return 'Run cycle';
  }

  return '';
}

function departmentStatus(jobStatus: Job['status'], departmentIndex: number): PacketDepartmentStatus {
  if (jobStatus === 'quoted') {
    return departmentIndex === 0 ? 'current' : 'pending';
  }
  if (jobStatus === 'planned') {
    if (departmentIndex <= 1) return 'complete';
    return departmentIndex === 2 ? 'current' : 'pending';
  }
  if (jobStatus === 'in_progress') {
    if (departmentIndex <= 3) return 'complete';
    return departmentIndex === 4 ? 'current' : 'pending';
  }
  if (jobStatus === 'complete') {
    return departmentIndex === DEPARTMENT_FLOW.length - 1 ? 'current' : 'complete';
  }
  return 'complete';
}

export function buildJobTrackingPacket(job: Job, options?: { seed?: number; jobNameOverride?: string }): JobTrackingPacket {
  const seed = options?.seed ?? 0;
  const quantity = Math.max(job.quantity || 0, 1);
  const partNumber = job.part_number || 'UNASSIGNED';
  const jobName = options?.jobNameOverride || job.description || partNumber;
  const cycleSecondsBase = Math.max(Math.round(((job.estimated_hours || 8) * 3600) / quantity), 24);
  const operations: PacketOperation[] = [
    {
      id: `${job.id}-cad`,
      code: 'CAD',
      label: 'CAD work',
      department: 'CAD work',
      estimatedMinutes: Math.max(20, Math.round((job.estimated_hours || 8) * 10)),
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: 'Model revisions and print alignment should stay connected to the traveler.',
    },
    {
      id: `${job.id}-cam`,
      code: 'CAM',
      label: 'CAM programming',
      department: 'CAM programming',
      estimatedMinutes: Math.max(30, Math.round((job.estimated_hours || 8) * 14)),
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: 'Toolpath, tooling, and post output should be ready before release to setup.',
    },
    {
      id: `${job.id}-setup`,
      code: 'OP10',
      label: 'Job setup',
      department: 'Job setup',
      estimatedMinutes: Math.max(35, Math.round((job.estimated_hours || 8) * 18)),
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: 'Fixtures, offsets, and proving passes should be clocked independently from run time.',
    },
    {
      id: `${job.id}-run`,
      code: 'OP20',
      label: 'Run cycle',
      department: 'Run cycle',
      estimatedMinutes: Math.max(45, Math.round((job.estimated_hours || 8) * 28)),
      cycleSeconds: cycleSecondsBase + (seed % 4) * 11,
      quantityTarget: quantity,
      note: 'Operators can clock extra pieces for inventory or safety stock without overwriting the job target.',
    },
    {
      id: `${job.id}-qc`,
      code: 'OP30',
      label: 'Inspection',
      department: 'Quality',
      estimatedMinutes: Math.max(18, Math.round((job.estimated_hours || 8) * 8)),
      cycleSeconds: Math.max(Math.round(cycleSecondsBase * 0.3), 12),
      quantityTarget: quantity,
      note: 'Tie first article, in-process checks, and final inspection to the same packet.',
    },
    {
      id: `${job.id}-ship`,
      code: 'OP40',
      label: 'Packout / shipping',
      department: 'Shipping',
      estimatedMinutes: 20,
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: 'Finalize labels, certs, and delivery notes from the traveler front sheet.',
    },
  ];

  const departments = DEPARTMENT_FLOW.map((department, index) => ({
    id: department.id,
    label: department.label,
    owner: department.owner,
    status: departmentStatus(job.status, index),
    note: department.note,
  }));

  const payloadParts = [
    'PRISMJOB',
    `job=${encodeURIComponent(job.id)}`,
    `name=${encodeURIComponent(jobName)}`,
    `customer=${encodeURIComponent(job.customer || 'Pending customer')}`,
    `part=${encodeURIComponent(partNumber)}`,
    `qty=${quantity}`,
    `due=${encodeURIComponent(job.due_date || 'Unscheduled')}`,
    `material=${encodeURIComponent(job.material || 'TBD')}`,
    `priority=${encodeURIComponent(job.priority || 'normal')}`,
    `departments=${encodeURIComponent(departments.map((department) => department.id).join(','))}`,
    `operations=${encodeURIComponent(operations.map((operation) => operation.code).join(','))}`,
  ];

  return {
    jobId: job.id,
    jobName,
    customer: job.customer || 'Pending customer',
    partNumber,
    quantity,
    dueDate: job.due_date || 'Unscheduled',
    material: job.material || 'TBD',
    priority: job.priority || 'normal',
    qrPayload: payloadParts.join('|'),
    stickerLabel: `${job.id} · ${partNumber}`,
    departments,
    operations,
    packetNotes: [
      'Print this front page with the job packet and keep department signoff visible.',
      'Sticker payload can be scanned from a phone or wedge scanner directly into the employee job tracker.',
      'Clocked task time should feed quote accuracy, labor cost, and tooling / machine ROI decisions.',
    ],
  };
}

export function parseJobTrackingPayload(rawValue: string): ParsedJobTrackingPayload | null {
  const raw = rawValue.trim();
  if (!raw) return null;

  if (!raw.startsWith('PRISMJOB|')) {
    return {
      raw,
      jobId: raw,
      jobName: raw,
      customer: 'Unknown customer',
      partNumber: 'Unspecified',
      quantity: 0,
      dueDate: 'Unscheduled',
      material: 'TBD',
      priority: 'normal',
      departments: [],
      operations: [],
    };
  }

  const entries = raw.split('|').slice(1).map((segment) => {
    const [key, ...rest] = segment.split('=');
    return [key, decodeURIComponent(rest.join('='))] as const;
  });

  const values = Object.fromEntries(entries);
  return {
    raw,
    jobId: values.job || 'UNKNOWN-JOB',
    jobName: values.name || values.job || 'Unnamed job',
    customer: values.customer || 'Unknown customer',
    partNumber: values.part || 'Unspecified',
    quantity: Number(values.qty || 0) || 0,
    dueDate: values.due || 'Unscheduled',
    material: values.material || 'TBD',
    priority: values.priority || 'normal',
    departments: values.departments ? values.departments.split(',').filter(Boolean) : [],
    operations: values.operations ? values.operations.split(',').filter(Boolean) : [],
  };
}

export function suggestedDepartment(employee?: Pick<Employee, 'department' | 'role'> | null) {
  const department = normalizedText(employee?.department || '');
  const role = normalizedText(employee?.role || '');

  if (department.includes('quality') || role.includes('quality')) return 'Quality';
  if (department.includes('engineer') || role.includes('engineer') || role.includes('cad')) return 'CAD work';
  if (department.includes('program') || role.includes('cam') || role.includes('program')) return 'CAM programming';
  if (department.includes('shipping') || role.includes('shipping')) return 'Shipping';
  if (department.includes('planning')) return 'Intake';
  return 'Job setup';
}

export function buildMobileTaskTemplates({
  department,
  packet,
  role,
}: {
  department: string;
  packet: ParsedJobTrackingPayload | null;
  role?: string;
}): MobileTaskTemplate[] {
  const normalizedDepartment = normalizedText(department);
  const normalizedRole = normalizedText(role || '');
  const quantityTarget = packet?.quantity || 0;

  if (normalizedDepartment.includes('cad') || normalizedRole.includes('engineer')) {
    return [
      { id: 'cad-work', title: 'CAD work', department: 'CAD work', operationCode: 'CAD', quantityTarget, cycleSeconds: 0, note: 'Model changes, print cleanup, and revision release.' },
      { id: 'cam-programming', title: 'CAM programming', department: 'CAM programming', operationCode: 'CAM', quantityTarget, cycleSeconds: 0, note: 'Toolpath updates, simulation, and setup-sheet alignment.' },
    ];
  }

  if (normalizedDepartment.includes('quality') || normalizedRole.includes('quality')) {
    return [
      { id: 'first-article', title: 'First article', department: 'Quality', operationCode: 'OP30', quantityTarget, cycleSeconds: 0, note: 'First-piece dimensional release and setup validation.' },
      { id: 'final-inspection', title: 'Final inspection', department: 'Quality', operationCode: 'OP30', quantityTarget, cycleSeconds: 0, note: 'Final quantity, cert packet, and ship release checks.' },
    ];
  }

  if (normalizedDepartment.includes('shipping') || normalizedRole.includes('ship')) {
    return [
      { id: 'packout', title: 'Packout', department: 'Shipping', operationCode: 'OP40', quantityTarget, cycleSeconds: 0, note: 'Label, box, and document packout preparation.' },
      { id: 'ship-release', title: 'Ship release', department: 'Shipping', operationCode: 'OP40', quantityTarget, cycleSeconds: 0, note: 'Final scan, carrier handoff, and shipment confirmation.' },
    ];
  }

  const runCycleSeconds = Math.max(40, Math.round((((packet?.quantity || 1) + 1) * 7)));

  return [
    { id: 'setup', title: 'Job setup', department: 'Job setup', operationCode: 'OP10', quantityTarget, cycleSeconds: 0, note: 'Fixture, offsets, tool prove-out, and first-piece setup.' },
    { id: 'run-cycle', title: 'Run cycle', department: 'Run cycle', operationCode: 'OP20', quantityTarget, cycleSeconds: runCycleSeconds, note: 'Cycle production time with parts completed and extras captured.' },
    { id: 'secondary-op', title: 'Secondary op / deburr', department: 'Run cycle', operationCode: 'OP25', quantityTarget, cycleSeconds: Math.max(Math.round(runCycleSeconds * 0.35), 16), note: 'Secondary handling, deburr, or cell-side finishing.' },
  ];
}
