import { ApiError, getRequestHeaders } from './client';

const API_BASE = '/api/v1';

export interface TravelerStepSummaryRecord {
  id: string;
  job_id: string;
  step_number: number;
  operation: string;
  machine_id?: string;
  workcenter?: string;
  status: 'pending' | 'setup' | 'running' | 'complete' | 'skipped' | 'hold';
  setup_time_min: number;
  cycle_time_min: number;
  est_setup_min: number;
  est_cycle_min: number;
  parts_complete?: number;
  parts_scrapped?: number;
  operator_id?: string;
}

export interface TravelerTimerRecord {
  id: string;
  routing_step_id: string;
  job_id: string;
  entry_type: 'setup' | 'cycle';
  operator_id?: string;
  start_time: string;
  end_time?: string;
  duration_min?: number;
}

export interface TravelerSummaryRecord {
  job_id: string;
  total_steps: number;
  completed_steps: number;
  pct_complete: number;
  total_setup_min: number;
  total_cycle_min: number;
  est_total_setup_min: number;
  est_total_cycle_min: number;
  setup_variance_pct: number;
  cycle_variance_pct: number;
  current_step?: TravelerStepSummaryRecord;
  steps: TravelerStepSummaryRecord[];
  active_timer?: TravelerTimerRecord;
}

export interface DispatchQueueEntryRecord {
  id: string;
  machine_id: string;
  job_id: string;
  routing_step_id?: string;
  priority: number;
  status: 'queued' | 'active' | 'complete' | 'cancelled';
  estimated_start?: string;
  estimated_complete?: string;
  actual_start?: string;
  actual_complete?: string;
  queued_at: string;
  queued_by?: string;
}

export interface MachineQueueRecord {
  machine_id: string;
  machine_name?: string;
  entries: DispatchQueueEntryRecord[];
  active_job?: DispatchQueueEntryRecord;
  total_queued: number;
  total_est_min: number;
}

export interface DispatchBoardRecord {
  machines: MachineQueueRecord[];
  total_queued_jobs: number;
  timestamp: string;
}

type Envelope<T> = {
  ok: boolean;
  data: T;
  error?: string | { message?: string };
};

async function requestTravelerApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: getRequestHeaders(),
  });

  const payload = (await response.json().catch(() => ({ error: response.statusText }))) as Envelope<T>;

  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message || 'Traveler request failed';
    throw new ApiError(response.status, errorMessage);
  }

  return payload.data;
}

export async function getDispatchBoard() {
  return requestTravelerApi<DispatchBoardRecord>('/dispatch/board');
}

export async function getTravelerSummary(jobId: string) {
  return requestTravelerApi<TravelerSummaryRecord>(`/traveler/${encodeURIComponent(jobId)}`);
}
