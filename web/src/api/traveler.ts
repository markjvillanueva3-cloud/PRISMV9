/**
 * Traveler API client — frontend wire to the REAL backend at mcp-server/src/routes/traveler.ts
 * (createTravelerRouter, mounted under /api/v1), backed by JobTravelerEngine.
 *
 * The backend wraps every payload as `{ ok: boolean, data?: T, error?: string }`. These wrappers
 * unwrap `data` (throwing the backend `error` on failure) so the page consumes records directly.
 *
 * The record types mirror the engine's exported interfaces (JobTravelerEngine.ts):
 *   TravelerStepSummaryRecord  <- RoutingStep
 *   TravelerTimerRecord        <- RoutingTimeEntry
 *   TravelerSummaryRecord      <- TravelerSummary
 * `prism_sync` is an OPTIONAL milestone-sync envelope the page reads only via optional chaining
 * (`if (result.prism_sync) ...`). The current backend does not emit it, so it is `undefined` at
 * runtime — declared optional here so a future backend that DOES emit it stays type-compatible
 * without a client change. We never fabricate it.
 *
 * This client was missing entirely (web/src/api/traveler.ts was never committed) while the page,
 * the backend route, and JobTravelerEngine all shipped — a dead frontend->backend wire. Building
 * the client closes the wire against the real route; it does not invent any backend behavior.
 */

const BASE_URL = "/api/v1";
const TIMEOUT_MS = 15_000;

export type RoutingStepStatus =
  | "pending" | "setup" | "running" | "complete" | "skipped" | "hold";

/** Mirror of engine RoutingStep. */
export interface TravelerStepSummaryRecord {
  id: string;
  job_id: string;
  step_number: number;
  operation: string;
  machine_id?: string;
  workcenter?: string;
  description?: string;
  status: RoutingStepStatus;
  setup_time_min: number;
  cycle_time_min: number;
  est_setup_min: number;
  est_cycle_min: number;
  quantity?: number;
  parts_complete?: number;
  parts_scrapped?: number;
  cycle_time_per_part?: number;
  is_outside_service?: boolean;
  vendor_name?: string;
  outside_po_number?: string;
  ship_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  outside_lead_days?: number;
  is_inspection_gate?: boolean;
  lot_number?: string;
  serial_numbers?: string[];
  operator_id?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

/** Mirror of engine RoutingTimeEntry. */
export interface TravelerTimerRecord {
  id: string;
  routing_step_id: string;
  job_id: string;
  entry_type: "setup" | "cycle";
  operator_id?: string;
  start_time: string;
  end_time?: string;
  duration_min?: number;
  notes?: string;
  created_at: string;
}

/** Mirror of engine TravelerSummary, plus the optional milestone-sync envelope the page reads. */
export interface TravelerSummaryRecord {
  job_id: string;
  total_steps: number;
  completed_steps: number;
  current_step?: TravelerStepSummaryRecord;
  pct_complete: number;
  total_setup_min: number;
  total_cycle_min: number;
  est_total_setup_min: number;
  est_total_cycle_min: number;
  setup_variance_pct: number;
  cycle_variance_pct: number;
  steps: TravelerStepSummaryRecord[];
  active_timer?: TravelerTimerRecord;
  /** Optional milestone-sync envelope (not emitted by the current backend; read via optional chaining). */
  prism_sync?: PrismSyncEnvelope;
}

/** Optional milestone-sync envelope the page may surface (recent cross-system sync events). */
export interface PrismSyncEnvelope {
  recent_events: unknown[];
}

/** A single step spec for createTraveler (mirror of engine CreateTravelerInput.steps[]). */
export interface CreateTravelerStepInput {
  step_number: number;
  operation: string;
  machine_id?: string;
  workcenter?: string;
  description?: string;
  est_setup_min?: number;
  est_cycle_min?: number;
  quantity?: number;
}

export interface CreateTravelerInput {
  job_id: string;
  steps: CreateTravelerStepInput[];
  created_by?: string;
}

/** Result of a step transition (start setup/cycle, complete) + optional sync envelope. */
export interface StepActionResult {
  step?: TravelerStepSummaryRecord;
  summary?: TravelerSummaryRecord;
  timer?: TravelerTimerRecord;
  prism_sync?: PrismSyncEnvelope;
}

export interface ScanInput {
  code: string;
  operator_id: string;
  action?: "start_setup" | "start_cycle" | "complete";
}

export interface ScanResult {
  action?: string;
  step?: TravelerStepSummaryRecord;
  summary?: TravelerSummaryRecord;
  prism_sync?: PrismSyncEnvelope;
}

/** Backend envelope: every traveler route returns { ok, data?, error? }. */
interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.error ?? res.statusText ?? "Traveler request failed");
    }
    return body.data as T;
  } finally {
    clearTimeout(timeout);
  }
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body != null ? JSON.stringify(body) : undefined });
}
function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

/** Create a traveler for a job. Backend returns { steps, count }; the page reads the optional
 * `prism_sync` envelope on the result, so we return the data plus an (absent) prism_sync slot. */
export async function createTraveler(
  input: CreateTravelerInput,
): Promise<{ steps: TravelerStepSummaryRecord[]; count: number; prism_sync?: PrismSyncEnvelope }> {
  return post("/traveler", input);
}

/** Get the summary for a single job's traveler. */
export function getTravelerSummary(jobId: string): Promise<TravelerSummaryRecord> {
  return get(`/traveler/${encodeURIComponent(jobId)}`);
}

/** Get all active travelers. Backend returns { travelers, count }; the page expects the array. */
export async function getActiveTravelers(): Promise<TravelerSummaryRecord[]> {
  const data = await get<{ travelers: TravelerSummaryRecord[]; count: number }>("/traveler");
  return data.travelers ?? [];
}

/** Start setup on a routing step. */
export function startTravelerSetup(
  jobId: string,
  stepNumber: number,
  body: { operator_id?: string; notes?: string },
): Promise<StepActionResult> {
  return post(`/traveler/${encodeURIComponent(jobId)}/steps/${stepNumber}/start-setup`, body);
}

/** Transition a routing step from setup into cycle run. */
export function startTravelerCycle(
  jobId: string,
  stepNumber: number,
  body: { operator_id?: string; notes?: string },
): Promise<StepActionResult> {
  return post(`/traveler/${encodeURIComponent(jobId)}/steps/${stepNumber}/start-cycle`, body);
}

/** Complete (or skip) a routing step. */
export function completeTravelerStep(
  jobId: string,
  stepNumber: number,
  body: {
    operator_id?: string;
    notes?: string;
    skip?: boolean;
    parts_complete?: number;
    parts_scrapped?: number;
  },
): Promise<StepActionResult> {
  return post(`/traveler/${encodeURIComponent(jobId)}/steps/${stepNumber}/complete`, body);
}

/** QR/barcode scan — the backend auto-detects the next action. */
export function scanTravelerCode(input: ScanInput): Promise<ScanResult> {
  return post("/traveler/scan", input);
}

// Dispatch board functions (used by DispatchBoardPage)
export interface DispatchBoardEntry {
  entry_id: string;
  job_id: string;
  machine_id: string;
  priority: number;
  status: string;
  created_at: string;
}

export interface DispatchBoard {
  machines: Record<string, DispatchBoardEntry[]>;
}

export function getDispatchBoard(): Promise<DispatchBoard> {
  return get("/dispatch/board");
}

export function getDispatchQueue(machineId: string): Promise<DispatchBoardEntry[]> {
  return get(`/dispatch/queue/${encodeURIComponent(machineId)}`);
}

export function queueDispatchJob(body: { job_id: string; machine_id: string; priority?: number }): Promise<DispatchBoardEntry> {
  return post("/dispatch/assign", body);
}

export function reorderDispatchQueue(body: { machine_id: string; ordered_entry_ids: string[] }): Promise<DispatchBoardEntry[]> {
  return post("/dispatch/reorder", body);
}

export function removeDispatchJob(entryId: string, removedBy?: string): Promise<{ entry_id: string; removed: boolean }> {
  return post("/dispatch/remove", { entry_id: entryId, removed_by: removedBy });
}

export function removeDispatchEntry(entryId: string, removedBy?: string): Promise<{ entry_id: string; removed: boolean }> {
  return post("/dispatch/remove", { entry_id: entryId, removed_by: removedBy });
}

export function runDispatchWhatIf(body: { job_id: string; machine_id: string; priority?: number }): Promise<{ would_block: boolean; reason?: string; position?: number }> {
  return post("/dispatch/what-if", body);
}
