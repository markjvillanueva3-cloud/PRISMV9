import { getAuthHeaders } from './authToken';
/**
 * CAM Model Serving API client (U-CAM123 — AI Health Dashboard).
 *
 * Read-only wrappers over /api/v1/cam/serve/* routes that bridge to the
 * cam_serve_* dispatcher actions backed by CAMModelServingEngine
 * (U-CAM122). Lifecycle-mutating actions (deploy/promote/rollback) are
 * intentionally NOT exposed here — the dashboard reads + acknowledges
 * only; promotion decisions stay with the operator runbook.
 */

const BASE_URL = "/api/v1/cam/serve";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(errBody.message ?? res.statusText);
    }
    const wrapped = (await res.json()) as { result?: T };
    if (wrapped.result === undefined) {
      throw new Error("Malformed response: missing 'result' envelope");
    }
    return wrapped.result;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Type surface ────────────────────────────────────────────────
// Mirrors CAMModelServingEngine output shapes; kept narrow + Optional
// where the engine returns engine-version specific extra fields. The
// dispatcher always wraps as { success: true, ...payload }.

export type ModelStatus =
  | "pending"
  | "shadow"
  | "canary"
  | "active"
  | "retired"
  | "rollback_pending";

export interface CamServeModel {
  id: string;
  name?: string;
  status: ModelStatus;
  task?: string;
  cam_system?: string;
  endpoint?: string;
  created_at?: string;
  promoted_at?: string;
  rolled_back_at?: string;
  weight?: number;
  rate_limit?: { capacity: number; refill_per_sec: number };
  // engine returns additional metadata; keep open
  [k: string]: unknown;
}

export interface CamServeHealth {
  model_id: string;
  status: ModelStatus | "unknown";
  request_count: number;
  error_count: number;
  error_rate: number;     // 0..1
  p50_latency_ms?: number;
  p95_latency_ms: number;
  p99_latency_ms?: number;
  drift_score?: number;   // 0..1, higher = more drift
  queue_depth?: number;
  last_metric_at?: string;
  [k: string]: unknown;
}

export interface CamServeRoutingPolicy {
  cam_system: string;
  task: string;
  kind: string;
  bucket_count?: number;
  weights?: Record<string, number>;
  epsilon?: number;
  min_samples_for_promotion?: number;
  [k: string]: unknown;
}

export interface CamServePendingConfirmation {
  id: string;
  model_id: string;
  action: string;
  reason?: string;
  requires_human_approval: boolean;
  applied: boolean;
  created_at?: string;
  [k: string]: unknown;
}

// ─── Response envelopes ──────────────────────────────────────────

interface ListModelsResponse { success: boolean; models: CamServeModel[] }
interface GetModelResponse { success: boolean; model: CamServeModel | null }
interface ListHealthResponse { success: boolean; health: CamServeHealth[] }
interface GetHealthResponse { success: boolean; health: CamServeHealth | null }
interface ListPoliciesResponse { success: boolean; policies: CamServeRoutingPolicy[] }
interface ListConfirmationsResponse { success: boolean; confirmations: CamServePendingConfirmation[] }

// ─── Public client ───────────────────────────────────────────────

export const camServeApi = {
  listModels: (filter?: Partial<{ status: ModelStatus; task: string; cam_system: string }>) =>
    post<ListModelsResponse>("/list-models", { filter }),

  getModel: (id: string) =>
    post<GetModelResponse>("/get-model", { id }),

  listHealth: () =>
    post<ListHealthResponse>("/list-health", {}),

  getHealth: (id: string) =>
    post<GetHealthResponse>("/get-health", { id }),

  listRoutingPolicies: () =>
    post<ListPoliciesResponse>("/list-routing-policies", {}),

  listPendingConfirmations: (filter?: Partial<{ model_id: string; action: string }>) =>
    post<ListConfirmationsResponse>("/list-pending-confirmations", { filter }),
};
