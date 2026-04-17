/**
 * wedmCoordination.ts — WEDM Coordination Substrate API Client
 * MS-P1-FRONT-WIRE U-P1-FW-02
 *
 * Typed API functions for the Round 4 coordination substrate endpoints:
 *   - Snapshot (combined state of all engines)
 *   - Ledger (reasoning traces)
 *   - Blackboard (shared observations/decisions)
 *   - Bridge (glue layer stats)
 *   - Dispatch (coordination stats)
 */

// ============================================================================
// TYPES — Ledger
// ============================================================================

export interface ReasoningTraceEntry {
  schemaVersion: 1;
  id: string;
  at: string;
  dispatcher: string;
  action: string;
  keywords: string[];
  inputs_summary?: string;
  outputs_summary?: string;
  confidence?: number;
  awareness_used: boolean;
  tribal_tips_used?: number;
  duration_ms?: number;
  engines_consulted?: string[];
  error?: string;
}

export interface LedgerStats {
  totalTraces: number;
  recentWindowSize: number;
  recentRate_per_min: number;
  topActions: Array<{ action: string; count: number }>;
  errorRate: number;
  awarenessAdoption: number;
  lastTraceAt: string | null;
  silentMinutes: number;
}

// ============================================================================
// TYPES — Blackboard
// ============================================================================

export type BlackboardTag =
  | "observation"
  | "hypothesis"
  | "constraint"
  | "decision"
  | "warning"
  | "recommendation"
  | "intermediate";

export interface BlackboardEntry {
  schemaVersion: 1;
  id: string;
  namespace: string;
  key: string;
  value: unknown;
  tag: BlackboardTag;
  source: string;
  confidence?: number;
  at: string;
  expiresAt: string;
  version: number;
}

export interface BlackboardStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  namespaceCount: number;
  largestNamespace: { namespace: string; count: number } | null;
  subscribers: number;
  recentPostRate_per_min: number;
  lastPostAt: string | null;
}

// ============================================================================
// TYPES — Bridge
// ============================================================================

export interface BridgeStats {
  totalBridges: number;
  avgLatencyMs: number;
  avgTipsIngested: number;
  avgPriorObservations: number;
  recentBridgeRate_per_min: number;
}

// ============================================================================
// TYPES — Dispatch
// ============================================================================

export interface DispatchStats {
  totalCoordinations: number;
  totalOutcomes: number;
  coordinationFailures: number;
  avgCoordLatencyMs: number;
  avgTotalLatencyMs: number;
  decisionsPosted: number;
  warningsPosted: number;
  lastCoordinationAt: string | null;
}

// ============================================================================
// TYPES — Snapshot (combined)
// ============================================================================

export interface CoordinationSnapshot {
  blackboard: BlackboardStats;
  ledger: LedgerStats;
  bridge: BridgeStats;
  dispatch: DispatchStats;
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

const BASE_URL = "/api/v1/edm";
const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function get<T>(endpoint: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, error: errBody.message ?? errBody.error ?? res.statusText };
    }

    const json = await res.json();
    return { ok: true, data: json.data ?? json };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === "AbortError") {
      return { ok: false, error: "Request timed out" };
    }
    return { ok: false, error: error.message ?? "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function post<T>(endpoint: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, error: errBody.message ?? errBody.error ?? res.statusText };
    }

    const json = await res.json();
    return { ok: true, data: json.data ?? json };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === "AbortError") {
      return { ok: false, error: "Request timed out" };
    }
    return { ok: false, error: error.message ?? "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// COORDINATION API
// ============================================================================

export const coordinationApi = {
  /** Get combined snapshot of all coordination substrate engines */
  getSnapshot: () => get<CoordinationSnapshot>("/coordination/snapshot"),

  /** Get recent reasoning trace entries */
  getLedgerRecent: (limit = 50) =>
    get<ReasoningTraceEntry[]>(`/coordination/ledger/recent?limit=${limit}`),

  /** Get ledger statistics */
  getLedgerStats: () => get<LedgerStats>("/coordination/ledger/stats"),

  /** Get blackboard statistics */
  getBlackboardStats: () => get<BlackboardStats>("/coordination/blackboard/stats"),

  /** Query blackboard entries by namespace prefix */
  queryBlackboard: (prefix: string, tag?: BlackboardTag) =>
    post<BlackboardEntry[]>("/coordination/blackboard/query", { prefix, tag }),

  /** Get bridge statistics */
  getBridgeStats: () => get<BridgeStats>("/coordination/bridge/stats"),

  /** Get dispatch coordinator statistics */
  getDispatchStats: () => get<DispatchStats>("/coordination/dispatch/stats"),
};
