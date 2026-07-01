/**
 * PRISM Employee Portal API Client (hotel iter8, 2026-05-24, U-EMPLOYEE-MOBILE-PORTAL-FRONTEND)
 *
 * Phone-first shop-floor employee portal — thin REST wrapper over the
 * `prism_shop` MCP dispatcher's `emp_*` actions. Server-side mounts these
 * routes via mcp-server/src/routes/* (see follow-up: U-PORTAL-EXPRESS-ROUTES).
 *
 * All requests post a single `{ action, params }` envelope; the backend
 * resolves to `prism_shop.{action}(params)` and returns the dispatcher
 * `result` object verbatim (including `{ok: boolean, ...}`).
 */

const API_BASE = '/api/v1/portal';

export class EmployeePortalApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'EmployeePortalApiError';
  }
}

async function callAction<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('prism_auth_token') : null;
  const res = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new EmployeePortalApiError(res.status, text);
  }
  return (await res.json()) as T;
}

// ─── Task state machine (W0) ─────────────────────────────────────────────────
export const empScanIn = (p: { payload: string; employee_id: string; source?: 'qr' | 'barcode' | 'manual' }) =>
  callAction<{ ok: boolean; task: ActiveTask }>('emp_scan_in', p);
export const empStartTask = (p: { job_id: string; operation_id: string; task_id: string; employee_id: string }) =>
  callAction<{ ok: boolean; task: ActiveTask }>('emp_start_task', p);
export const empPauseTask = (p: { task_id: string; employee_id: string; reason: string }) =>
  callAction<{ ok: boolean; task: ActiveTask }>('emp_pause_task', p);
export const empResumeTask = (p: { task_id: string; employee_id: string }) =>
  callAction<{ ok: boolean; task: ActiveTask }>('emp_resume_task', p);
export const empStopTask = (p: { task_id: string; employee_id: string; completed: boolean; reason?: string }) =>
  callAction<{ ok: boolean; task: ActiveTask }>('emp_stop_task', p);
export const empGetActiveTask = (p: { employee_id: string }) =>
  callAction<{ ok: boolean; task: ActiveTask | null }>('emp_get_active_task', p);

// ─── Messaging ───────────────────────────────────────────────────────────────
export const empSendMessage = (p: { from_employee_id: string; to_employee_id: string; body: string }) =>
  callAction<{ ok: boolean; message: EmployeeMessage }>('emp_send_message', p);
export const empListMessages = (p: { employee_id: string; unread_only?: boolean }) =>
  callAction<{ ok: boolean; count: number; messages: EmployeeMessage[] }>('emp_list_messages', p);
export const empMarkRead = (p: { message_id: string }) =>
  callAction<{ ok: boolean; message: EmployeeMessage }>('emp_mark_message_read', p);

// ─── Hot-job priority + delegation ───────────────────────────────────────────
export const empBumpPriority = (p: { job_id: string; new_priority: number; admin_id: string; reason: string }) =>
  callAction<{ ok: boolean; entry: JobPriorityEntry }>('emp_bump_job_priority', p);
export const empRankJobs = () =>
  callAction<{ ok: boolean; count: number; ranked: Array<{ job_id: string; priority: number; last_bumped_at: string }> }>('emp_rank_jobs');
export const empDelegate = (p: { task_id: string; from_manager_id: string; to_employee_id: string; reason: string }) =>
  callAction<{ ok: boolean; entry: DelegationEntry }>('emp_delegate_task', p);
export const empListDelegations = (p: { employee_id: string; unacknowledged_only?: boolean }) =>
  callAction<{ ok: boolean; count: number; delegations: DelegationEntry[] }>('emp_list_delegations', p);

// ─── Calculators (W1) ────────────────────────────────────────────────────────
export const empCalcSpeedFeed = (p: Record<string, unknown>) =>
  callAction<{ ok: boolean; calc: unknown }>('emp_calc_speed_feed', p);
export const empCalcCostQuick = (p: { material: string; cycle_time_min: number; quantity?: number; machine_type?: string }) =>
  callAction<{ ok: boolean; estimate: { perPart: number; total: number; breakdown: string } }>('emp_calc_cost_quick', p);
export const empCalcKienzleForces = (p: { material: string; ap_mm: number; fz_mm: number }) =>
  callAction<{ ok: boolean; calc: unknown }>('emp_calc_kienzle_forces', p);

// ─── Document intake (W2) ────────────────────────────────────────────────────
export const empDocIngest = (p: Record<string, unknown>) =>
  callAction<{ ok: boolean; ingest: unknown }>('emp_doc_ingest', p);
export const empDocList = () =>
  callAction<{ ok: boolean; items: unknown[]; total: number }>('emp_doc_list');

// ─── DNC / CIMCO (W4) ────────────────────────────────────────────────────────
export const empDncMachines = () =>
  callAction<{ ok: boolean; count: number; machines: unknown[] }>('emp_dnc_machines');
export const empDncSafetyCheck = (p: { content: string }) =>
  callAction<{ ok: boolean; check: { safe: boolean; score: number; criticalIssues: string[] } }>('emp_dnc_safety_check', p);

// ─── 3D layout (W5) ──────────────────────────────────────────────────────────
export const empLayoutList = () =>
  callAction<{ ok: boolean; count: number; entries: MachineLayoutEntry[] }>('emp_layout_list');
export const empLayoutMachineAtPoint = (p: { point: { x: number; y: number; z: number } }) =>
  callAction<{ ok: boolean; entry: MachineLayoutEntry | null }>('emp_layout_machine_at_point', p);

// ─── Office surface (P2) ─────────────────────────────────────────────────────
export const empOfficeWhoOnWhat = () =>
  callAction<{ ok: boolean; count: number; assignments: Array<{ employee_id: string; active_task: ActiveTask }> }>('emp_office_who_on_what');
export const empOfficePriorityQueue = (p?: { limit?: number }) =>
  callAction<{ ok: boolean; count: number; ranked: Array<{ job_id: string; priority: number; last_bumped_at: string }> }>('emp_office_priority_queue', p ?? {});
export const empOfficePendingDelegations = () =>
  callAction<{ ok: boolean; count: number; delegations: DelegationEntry[] }>('emp_office_pending_delegations');

// ─── Types (mirror backend shapes) ───────────────────────────────────────────
export interface ActiveTask {
  task_id: string;
  job_id: string;
  operation_id: string;
  employee_id: string;
  status: 'running' | 'paused' | 'completed' | 'stopped';
  started_at: string;
  paused_at?: string;
  pause_reason?: string;
  completed_at?: string;
  stopped_at?: string;
  total_runtime_ms: number;
  total_pause_ms: number;
  last_event_at: string;
}
export interface EmployeeMessage {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  body: string;
  sent_at: string;
  read_at?: string;
}
export interface JobPriorityEntry {
  job_id: string;
  priority: number;
  bumped_by: string;
  reason: string;
  bumped_at: string;
}
export interface DelegationEntry {
  id: string;
  task_id: string;
  from_manager_id: string;
  to_employee_id: string;
  reason: string;
  delegated_at: string;
  acknowledged_at?: string;
}
export interface MachineLayoutEntry {
  machine_id: string;
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  tagged_by: string;
  tagged_at: string;
  capture_session_id: string;
  notes?: string;
}
