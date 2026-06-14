export interface MachineStatus {
  id: string;
  name: string;
  brand: string;
  status: 'running' | 'idle' | 'alarm' | 'offline' | 'setup';
  spindle_rpm: number;
  feed_rate: number;
  current_program: string;
  uptime_pct: number;
}

export interface JobProgress {
  id: string;
  job_number: string;
  part_name: string;
  material?: string;
  machine: string;
  progress_pct: number;
  completed: number;
  total: number;
  eta_minutes: number;
  current_op: string;
}

export interface ToolLife {
  id: string;
  tool_name: string;
  machine: string;
  life_remaining_pct: number;
  estimated_minutes: number;
  wear_rate: 'normal' | 'elevated' | 'critical';
}

export interface OEEData {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export type DashboardSnapshotSource = 'live' | 'mixed' | 'demo';

export interface DashboardSnapshot {
  source: DashboardSnapshotSource;
  note: string;
  machines: MachineStatus[];
  jobs: JobProgress[];
  tools: ToolLife[];
  oee: OEEData;
}

const API_BASE = '/api/v1';

// JM Die Company shop-floor seed — the REAL 21-machine fleet (Okuma/Hurco/Haas/Mitsubishi/Roku-Roku
// per src/data/jm-die-profile.ts JM_DIE_CONTROLLER_MAP) running real cold-heading die/punch work for
// JM's fastener customers (HOLO-KROME, ITW, SEMBLEX…). This is the initial display until the live
// machine/job/tool/telemetry routes are reachable. NOT generic placeholder hardware.
export const DEMO_MACHINES: MachineStatus[] = [
  { id: 'm1', name: 'Hurco VM30i', brand: 'Hurco', status: 'running', spindle_rpm: 9000, feed_rate: 1800, current_program: '1042', uptime_pct: 93 },
  { id: 'm2', name: 'Okuma GENOS L300-M', brand: 'Okuma', status: 'running', spindle_rpm: 3500, feed_rate: 220, current_program: 'O2207', uptime_pct: 90 },
  { id: 'm3', name: 'Haas VF-2', brand: 'Haas', status: 'idle', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 84 },
  { id: 'm4', name: 'Okuma Multus B250II', brand: 'Okuma', status: 'setup', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 81 },
  { id: 'm5', name: 'Mitsubishi EA12S', brand: 'Mitsubishi', status: 'alarm', spindle_rpm: 0, feed_rate: 0, current_program: 'EA-0571', uptime_pct: 70 },
  { id: 'm6', name: 'Okuma M460V-5AX', brand: 'Okuma', status: 'running', spindle_rpm: 12000, feed_rate: 2400, current_program: 'DIE_CAV.MIN', uptime_pct: 88 },
];

export const DEMO_JOBS: JobProgress[] = [
  { id: 'j1', job_number: 'JM-24-0412', part_name: 'Cold-Header Die — HOLO-KROME 3/8-16 SHCS', machine: 'Hurco VM30i', progress_pct: 72, completed: 36, total: 50, eta_minutes: 85, current_op: 'Op 30 - Cavity Mill' },
  { id: 'j2', job_number: 'JM-24-0418', part_name: 'Trim Die Insert — ITW Shakeproof', machine: 'Okuma GENOS L300-M', progress_pct: 45, completed: 9, total: 20, eta_minutes: 210, current_op: 'Op 20 - OD Turn' },
  { id: 'j3', job_number: 'JM-24-0421', part_name: 'Carbide Punch — SEMBLEX T-25 TORX', machine: 'Okuma M460V-5AX', progress_pct: 90, completed: 18, total: 20, eta_minutes: 22, current_op: 'Op 40 - Finish Profile' },
];

export const DEMO_TOOLS: ToolLife[] = [
  { id: 't1', tool_name: 'EM 6mm 4F AlTiN (D2 die steel)', machine: 'Hurco VM30i', life_remaining_pct: 35, estimated_minutes: 42, wear_rate: 'elevated' },
  { id: 't2', tool_name: 'Carbide Drill 4.2mm', machine: 'Hurco VM30i', life_remaining_pct: 78, estimated_minutes: 156, wear_rate: 'normal' },
  { id: 't3', tool_name: 'CNMG 432 Carbide (M2 HSS)', machine: 'Okuma GENOS L300-M', life_remaining_pct: 12, estimated_minutes: 8, wear_rate: 'critical' },
  { id: 't4', tool_name: 'Ball EM 3mm 2F (H13)', machine: 'Okuma M460V-5AX', life_remaining_pct: 65, estimated_minutes: 95, wear_rate: 'normal' },
];

export const DEMO_OEE: OEEData = { availability: 0.87, performance: 0.82, quality: 0.96, oee: 0.685 };

function buildDemoSnapshot(note: string): DashboardSnapshot {
  return {
    source: 'demo',
    note,
    machines: DEMO_MACHINES,
    jobs: DEMO_JOBS,
    tools: DEMO_TOOLS,
    oee: DEMO_OEE,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function unwrapPayload(payload: unknown): unknown {
  let current = payload;
  while (true) {
    const record = asRecord(current);
    if (!record) {
      return current;
    }
    if ('result' in record && record.result !== undefined) {
      current = record.result;
      continue;
    }
    if ('data' in record && record.data !== undefined) {
      current = record.data;
      continue;
    }
    return current;
  }
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function normalizePercent(value: number | null, fallback = 0): number {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }
  const scaled = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function normalizeRatio(value: number | null, fallback: number): number {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function normalizeMachineState(value: string | null): MachineStatus['status'] {
  if (!value) {
    return 'idle';
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('alarm') || normalized.includes('fault')) {
    return 'alarm';
  }
  if (normalized.includes('setup') || normalized.includes('changeover')) {
    return 'setup';
  }
  if (normalized.includes('offline') || normalized.includes('disconnect') || normalized.includes('down')) {
    return 'offline';
  }
  if (normalized.includes('run') || normalized.includes('cycle') || normalized.includes('cut')) {
    return 'running';
  }
  return 'idle';
}

function normalizeWearRate(value: string | null, lifeRemainingPct: number): ToolLife['wear_rate'] {
  if (value) {
    const normalized = value.toLowerCase();
    if (normalized === 'normal' || normalized === 'elevated' || normalized === 'critical') {
      return normalized;
    }
  }

  if (lifeRemainingPct <= 15) {
    return 'critical';
  }
  if (lifeRemainingPct <= 40) {
    return 'elevated';
  }
  return 'normal';
}

function normalizeMachineList(payload: unknown): MachineStatus[] {
  const unwrapped = unwrapPayload(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped.flatMap<MachineStatus>((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          return [];
        }

        const id = readString(record, ['id', 'machine_id', 'machineId']) ?? `machine-${index + 1}`;
        const name = readString(record, ['name', 'machine_name', 'machineName', 'label']) ?? `Machine ${index + 1}`;
        const brand = readString(record, ['brand', 'make', 'manufacturer']) ?? name.split(' ')[0] ?? 'Machine';
        const status = normalizeMachineState(readString(record, ['status', 'state', 'machine_status']));

        return {
          id,
          name,
          brand,
          status,
          spindle_rpm: Math.max(0, Math.round(readNumber(record, ['spindle_rpm', 'spindleRpm', 'rpm']) ?? 0)),
          feed_rate: Math.max(0, Math.round(readNumber(record, ['feed_rate', 'feedRate', 'feed']) ?? 0)),
          current_program: readString(record, ['current_program', 'program', 'program_name', 'programName']) ?? '',
          uptime_pct: normalizePercent(readNumber(record, ['uptime_pct', 'uptime', 'uptime_percent']), 0),
        };
      })
      .filter((machine): machine is MachineStatus => Boolean(machine));
  }

  const record = asRecord(unwrapped);
  if (!record) {
    return [];
  }

  for (const key of ['machines', 'items', 'fleet', 'machine_status', 'statuses']) {
    if (key in record) {
      return normalizeMachineList(record[key]);
    }
  }

  return [];
}

function normalizeJobList(payload: unknown): JobProgress[] {
  const unwrapped = unwrapPayload(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped.flatMap((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          return [];
        }

        const completed = Math.max(
          0,
          Math.round(
            readNumber(record, ['completed', 'qty_completed', 'quantity_completed', 'parts_completed', 'actual_count']) ?? 0,
          ),
        );
        const total = Math.max(
          completed,
          Math.round(
            readNumber(record, ['total', 'quantity', 'qty', 'planned_count', 'target_count']) ?? completed,
          ),
        );
        const derivedProgress =
          total > 0 ? (completed / total) * 100 : readNumber(record, ['actual_hours', 'progress_hours']) ?? 0;
        const progressPct = normalizePercent(
          readNumber(record, ['progress_pct', 'progress_percent', 'progress']) ?? derivedProgress,
          0,
        );

        return [{
          id: readString(record, ['id', 'job_id', 'jobId']) ?? `job-${index + 1}`,
          job_number: readString(record, ['job_number', 'number', 'jobNumber']) ?? `JOB-${index + 1}`,
          part_name: readString(record, ['part_name', 'partName', 'description', 'part_number', 'partNumber']) ?? 'Unnamed part',
          material: readString(record, ['material', 'material_name', 'stock_material']) ?? undefined,
          machine: readString(record, ['machine', 'machine_name', 'machineName', 'workcenter']) ?? 'Dispatch pending',
          progress_pct: progressPct,
          completed,
          total,
          eta_minutes: Math.max(
            0,
            Math.round(readNumber(record, ['eta_minutes', 'eta_min', 'remaining_minutes', 'remaining_min']) ?? 0),
          ),
          current_op:
            readString(record, ['current_op', 'current_operation', 'operation', 'status']) ??
            'Awaiting live progress',
        }];
      });
  }

  const record = asRecord(unwrapped);
  if (!record) {
    return [];
  }

  for (const key of ['jobs', 'items', 'queue', 'records']) {
    if (key in record) {
      return normalizeJobList(record[key]);
    }
  }

  return [];
}

function normalizeToolList(payload: unknown): ToolLife[] {
  const unwrapped = unwrapPayload(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          return null;
        }

        const wearPercent = normalizePercent(readNumber(record, ['wear_percent', 'wear_pct']), 0);
        const lifeRemainingPct = normalizePercent(
          readNumber(record, ['life_remaining_pct', 'life_pct', 'remaining_pct']) ?? 100 - wearPercent,
          0,
        );

        return {
          id: readString(record, ['id', 'tool_id', 'toolId']) ?? `tool-${index + 1}`,
          tool_name: readString(record, ['tool_name', 'toolName', 'name']) ?? 'Unnamed tool',
          machine: readString(record, ['machine', 'machine_name', 'machineName']) ?? 'Unassigned machine',
          life_remaining_pct: lifeRemainingPct,
          estimated_minutes: Math.max(
            0,
            Math.round(readNumber(record, ['estimated_minutes', 'remaining_minutes', 'tool_life_minutes']) ?? 0),
          ),
          wear_rate: normalizeWearRate(
            readString(record, ['wear_rate', 'wearRate']),
            lifeRemainingPct,
          ),
        };
      })
      .filter((tool): tool is ToolLife => Boolean(tool));
  }

  const record = asRecord(unwrapped);
  if (!record) {
    return [];
  }

  for (const key of ['tools', 'items', 'records', 'usage']) {
    if (key in record) {
      return normalizeToolList(record[key]);
    }
  }

  return [];
}

function normalizeOee(payload: unknown): OEEData | null {
  const unwrapped = unwrapPayload(payload);
  const record = asRecord(unwrapped);
  if (!record) {
    return null;
  }

  for (const key of ['oee', 'summary', 'metrics', 'kpis']) {
    if (key in record) {
      const nested = normalizeOee(record[key]);
      if (nested) {
        return nested;
      }
    }
  }

  const availability = normalizeRatio(readNumber(record, ['availability', 'availability_pct']), DEMO_OEE.availability);
  const performance = normalizeRatio(readNumber(record, ['performance', 'performance_pct']), DEMO_OEE.performance);
  const quality = normalizeRatio(readNumber(record, ['quality', 'quality_pct']), DEMO_OEE.quality);
  const oee = normalizeRatio(
    readNumber(record, ['oee', 'overall_oee', 'overall']),
    availability * performance * quality,
  );

  return { availability, performance, quality, oee };
}

async function fetchRoute(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Dashboard route ${path} failed: ${response.status}`);
  }

  return response.json();
}

function describeDashboardSource(surfaceSources: Array<[string, boolean]>): Pick<DashboardSnapshot, 'source' | 'note'> {
  const live = surfaceSources.filter(([, isLive]) => isLive).map(([surface]) => surface);
  const fallback = surfaceSources.filter(([, isLive]) => !isLive).map(([surface]) => surface);

  if (fallback.length === 0) {
    return {
      source: 'live',
      note: 'Dashboard is running from live machine, dispatch, tooling, and telemetry data.',
    };
  }

  if (live.length === 0) {
    return {
      source: 'demo',
      note: 'Dashboard is using the local demo fleet until live machine, job, tool, and telemetry routes are reachable.',
    };
  }

  return {
    source: 'mixed',
    note: `Live ${live.join(', ')} data is available, while ${fallback.join(', ')} is still using the local fallback set.`,
  };
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [machineResult, jobResult, toolResult, telemetryResult] = await Promise.allSettled([
    fetchRoute('/machine-live/list', 'POST', {}),
    fetchRoute('/erp/job-dashboard', 'GET'),
    fetchRoute('/erp/tool-usage', 'POST', {}),
    fetchRoute('/telemetry/dashboard', 'GET'),
  ]);

  const machines = machineResult.status === 'fulfilled' ? normalizeMachineList(machineResult.value) : [];
  const jobs = jobResult.status === 'fulfilled' ? normalizeJobList(jobResult.value) : [];
  const tools = toolResult.status === 'fulfilled' ? normalizeToolList(toolResult.value) : [];
  const oee = telemetryResult.status === 'fulfilled' ? normalizeOee(telemetryResult.value) : null;

  const snapshot = {
    machines: machines.length > 0 ? machines : DEMO_MACHINES,
    jobs: jobs.length > 0 ? jobs : DEMO_JOBS,
    tools: tools.length > 0 ? tools : DEMO_TOOLS,
    oee: oee ?? DEMO_OEE,
  };

  const sourcePosture = describeDashboardSource([
    ['machine', machines.length > 0],
    ['dispatch', jobs.length > 0],
    ['tooling', tools.length > 0],
    ['telemetry', Boolean(oee)],
  ]);

  return {
    ...snapshot,
    ...sourcePosture,
  };
}

export async function loadDashboardSnapshotWithFallback(): Promise<DashboardSnapshot> {
  try {
    return await loadDashboardSnapshot();
  } catch {
    return buildDemoSnapshot(
      'Dashboard routes could not be loaded, so PRISM is using the local demo control-room snapshot.',
    );
  }
}
