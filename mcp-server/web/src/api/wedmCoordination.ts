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

import { getStoredAuthToken } from "./authToken";

// ============================================================================
// TYPES -- Ledger
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
// AUTH TOKEN SOURCE (WEDM-P2P-PRODUCTION-MS0 / U-PROD-23)
// ============================================================================

let currentAuthToken: string | null = null;

/** Set the Bearer token used on every subsequent request. */
export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
}

/** Resolve token: explicit set takes precedence, else canonical stored token. */
function resolveAuthToken(): string | null {
  if (currentAuthToken) return currentAuthToken;
  // getStoredAuthToken() reconciles the canonical 'prism-auth-token' (hyphen)
  // key AuthContext writes AND JSON-unwraps the {token} session object -- a bare
  // localStorage.getItem('prism_auth_token') missed both and 401'd (dead panel).
  return getStoredAuthToken();
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = resolveAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function get<T>(endpoint: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: buildHeaders(),
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
      headers: buildHeaders(),
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

// ============================================================================
// TYPES — Learning Loop (MS-P1-LEARN-LOOP)
// ============================================================================

export interface FeedbackSubmission {
  job_id: string;
  dispatcher: "edm" | "cam";
  action: string;
  original_params: Record<string, unknown>;
  success: boolean;
  predicted: Record<string, unknown>;
  actual: Record<string, unknown>;
  corrections?: Array<{
    key: string;
    original_value: unknown;
    corrected_value: unknown;
    reason?: string;
  }>;
  operator_notes?: string;
  material?: string;
  thickness_mm?: number;
  wire_type?: string;
  machine_id?: string;
  confidence?: number;
}

export interface FeedbackResult {
  ok: boolean;
  feedback_id: string;
  decisions_posted: number;
  observations_posted: number;
  tip_candidates_queued: number;
  ground_truth_updated: boolean;
  errors?: string[];
}

export interface FeedbackStats {
  totalFeedback: number;
  successfulJobs: number;
  failedJobs: number;
  correctionsReceived: number;
  tipCandidatesGenerated: number;
  groundTruthPoints: number;
  avgPredictionError: number;
  pendingTipCandidates: number;
  pendingGroundTruth: number;
}

export interface TipCandidate {
  id: string;
  source_job: string;
  pattern_type: "correction" | "success_pattern" | "failure_pattern" | "operator_note";
  keywords: string[];
  context: Record<string, unknown>;
  note?: string;
  created_at: string;
}

export interface GeneratedTip {
  id: string;
  source_candidate_id: string;
  text: string;
  keywords: string[];
  tags: string[];
  confidence: number;
  source: "learned";
  approved: boolean;
  created_at: string;
}

export interface LearningStats {
  totalProcessed: number;
  autoApproved: number;
  manuallyApproved: number;
  rejected: number;
  tipsGenerated: number;
  pendingReviewCount: number;
  learnedCorpusSize: number;
}

export interface CombinedLearningStats {
  ingestion: FeedbackStats;
  learning: LearningStats;
}

export interface ProcessTipsResult {
  processed: number;
  auto_approved: number;
  pending_review: number;
  rejected: number;
  new_tips: GeneratedTip[];
}

export interface FusionUpdateResult {
  updated: number;
  contexts?: number;
  message?: string;
}

// ============================================================================
// LEARNING LOOP API
// ============================================================================

// ============================================================================
// TYPES — Autonomy (MS-P1-AUTONOMY)
// ============================================================================

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type AutonomyCapability =
  | "suggest_parameters"
  | "auto_adjust_parameters"
  | "execute_job_supervised"
  | "execute_job_unattended"
  | "self_modify_policy";

export interface SubstrateHealthMetrics {
  errorRate: number;
  awarenessAdoption: number;
  silentMinutes: number;
  blackboardActive: number;
  bridgeLatencyMs: number;
  feedbackTotal: number;
  tipsLearned: number;
  coordinations: number;
  lastActivityAt: string | null;
}

export interface LevelRequirements {
  maxErrorRate: number;
  minAwarenessAdoption: number;
  maxSilentMinutes: number;
  minCoordinations?: number;
  minFeedbackCount?: number;
  requiresCounterSign?: boolean;
  sustainedHours?: number;
}

export interface AutonomyStatusSnapshot {
  currentLevel: AutonomyLevel;
  levelName: string;
  humanRole: string;
  metrics: SubstrateHealthMetrics;
  eligibleForPromotion: boolean;
  promotionBlockers: string[];
  degradeWarnings: string[];
  capabilities: Record<AutonomyCapability, boolean>;
  nextLevelRequirements: LevelRequirements | null;
}

export interface HealthGateResult {
  eligible: boolean;
  currentLevel: AutonomyLevel;
  targetLevel: AutonomyLevel;
  metrics: SubstrateHealthMetrics;
  requirements: LevelRequirements;
  failedChecks: string[];
  passedChecks: string[];
}

export interface DegradeCheckResult {
  shouldDegrade: boolean;
  currentLevel: AutonomyLevel;
  suggestedFloor: AutonomyLevel;
  triggers: string[];
  metrics: SubstrateHealthMetrics;
}

export interface AutonomyTransition {
  from: AutonomyLevel;
  to: AutonomyLevel;
  at: string;
  actor: string;
  reason: string;
  forced: boolean;
}

export interface AutonomySnapshot {
  level: AutonomyLevel;
  name: string;
  humanRole: string;
  version: number;
  last?: AutonomyTransition;
  history: AutonomyTransition[];
}

export interface GatedPromoteResult {
  success: boolean;
  newLevel?: AutonomyLevel;
  gate: HealthGateResult;
  error?: string;
}

export interface AutoDegradeResult {
  degraded: boolean;
  from?: AutonomyLevel;
  to?: AutonomyLevel;
  triggers: string[];
}

// ============================================================================
// AUTONOMY API
// ============================================================================

export type AutonomyAuditAction =
  | "promote"
  | "demote"
  | "auto_degrade"
  | "manual_degrade"
  | "status_read"
  | "history_read";

export type AutonomyAuditOutcome = "success" | "denied" | "failed";

export interface AutonomyAuditEntry {
  id: string;
  at: string;
  action: AutonomyAuditAction;
  user_id: string | null;
  user_roles: string[];
  remote_ip: string | null;
  actor: string | null;
  reason: string | null;
  level_from: number | null;
  level_to: number | null;
  outcome: AutonomyAuditOutcome;
  error: string | null;
  counter_signed: boolean;
}

export interface AutonomyAuditStats {
  totalEntries: number;
  byAction: Record<string, number>;
  byOutcome: Record<string, number>;
  deniedCount: number;
  lastEntryAt: string | null;
}

export interface AutonomyAuditResponse {
  entries: AutonomyAuditEntry[];
  stats: AutonomyAuditStats;
}

export const autonomyApi = {
  /** Get current autonomy status with health metrics */
  getStatus: () => get<AutonomyStatusSnapshot>("/autonomy/status"),

  /** Get substrate health metrics */
  getMetrics: () => get<SubstrateHealthMetrics>("/autonomy/metrics"),

  /** Check promotion eligibility */
  checkEligibility: () => get<HealthGateResult>("/autonomy/eligibility"),

  /** Request autonomy level promotion (requires supervisor or admin role) */
  promote: (actor?: string, reason?: string, counterSign?: string) =>
    post<GatedPromoteResult>("/autonomy/promote", {
      actor,
      reason,
      counter_sign: counterSign,
    }),

  /** Request autonomy level demotion (requires supervisor or admin role) */
  demote: (actor?: string, reason?: string) =>
    post<AutonomyTransition>("/autonomy/demote", { actor, reason }),

  /** Check if auto-degrade is warranted */
  checkDegrade: () => get<DegradeCheckResult>("/autonomy/degrade-check"),

  /** Trigger auto-degrade if warranted (requires supervisor or admin role) */
  autoDegrade: () => post<AutoDegradeResult>("/autonomy/auto-degrade", {}),

  /** Get autonomy transition history */
  getHistory: () => get<AutonomySnapshot>("/autonomy/history"),

  /** Fetch autonomy audit trail (admin only). */
  getAudit: (opts: { limit?: number; action?: AutonomyAuditAction; user?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.action) params.set("action", opts.action);
    if (opts.user) params.set("user", opts.user);
    const qs = params.toString();
    return get<AutonomyAuditResponse>(`/autonomy/audit${qs ? `?${qs}` : ""}`);
  },
};

// ============================================================================
// LEARNING LOOP API
// ============================================================================

export const learningApi = {
  /** Submit operator feedback from a completed job */
  submitFeedback: (feedback: FeedbackSubmission) =>
    post<FeedbackResult>("/coordination/feedback", feedback),

  /** Get recent feedback submissions */
  getRecentFeedback: (limit = 50) =>
    get<FeedbackSubmission[]>(`/coordination/feedback/recent?limit=${limit}`),

  /** Get feedback ingestion statistics */
  getFeedbackStats: () => get<FeedbackStats>("/coordination/feedback/stats"),

  /** Get pending tip candidates */
  getTipCandidates: (limit = 100) =>
    get<TipCandidate[]>(`/coordination/learning/tip-candidates?limit=${limit}`),

  /** Process pending tip candidates through tribal learner */
  processTips: (maxCandidates = 50, autoApproveThreshold = 0.85) =>
    post<ProcessTipsResult>("/coordination/learning/process-tips", {
      max_candidates: maxCandidates,
      auto_approve_threshold: autoApproveThreshold,
    }),

  /** Get combined learning statistics */
  getLearningStats: () => get<CombinedLearningStats>("/coordination/learning/stats"),

  /** Trigger neural fusion weight updates from ground truth */
  updateFusion: (target?: string, maxPoints = 100) =>
    post<FusionUpdateResult>("/coordination/learning/update-fusion", {
      target,
      max_points: maxPoints,
    }),

  /** Approve a pending tribal tip */
  approveTip: (tipId: string) =>
    post<{ approved: boolean }>("/coordination/learning/approve-tip", { tip_id: tipId }),

  /** Reject a pending tribal tip */
  rejectTip: (tipId: string) =>
    post<{ rejected: boolean }>("/coordination/learning/reject-tip", { tip_id: tipId }),

  /** Get tips pending manual review */
  getPendingTips: (limit = 50) =>
    get<GeneratedTip[]>(`/coordination/learning/pending-tips?limit=${limit}`),
};

// ============================================================================
// SELF-AWARENESS TYPES
// ============================================================================

export interface SelfAwarenessDigest {
  engineCount: number;
  skillCount: number;
  hookCount: number;
  formulaCount: number;
  tipCount: number;
  lastUpdated: string;
}

export interface SelfAwarenessSubstrate {
  ledger: {
    totalTraces: number;
    errorRate: number;
    awarenessAdoption: number;
    silentMinutes: number;
    topActions: Array<{ action: string; count: number }>;
    lastTraceAt: string | null;
  };
  blackboard: {
    totalEntries: number;
    activeEntries: number;
    namespaceCount: number;
  };
  bridge: {
    totalBridges: number;
    avgLatencyMs: number;
    avgTipsIngested: number;
  };
  dispatch: {
    totalCoordinations: number;
    totalOutcomes: number;
    decisionsPosted: number;
  };
}

export interface SelfAwarenessAutonomy {
  level: AutonomyLevel;
  levelName: string;
  humanRole: string;
  capabilities: Record<AutonomyCapability, boolean>;
  eligibleForPromotion: boolean;
  degradeWarnings: string[];
}

export interface SelfAwarenessLearning {
  feedbackTotal: number;
  successRate: number;
  tipsLearned: number;
  pendingReview: number;
  avgPredictionError: number;
}

export interface SelfAwarenessTribal {
  totalTips: number;
  learnedTips: number;
  totalSelections: number;
  topTipsByUse: Array<{ id: string; count: number }>;
}

export interface SelfAwarenessHealth {
  overall: "healthy" | "degraded" | "critical";
  issues: string[];
  recommendations: string[];
}

export interface SelfAwarenessCapabilities {
  canSuggestParameters: boolean;
  canAutoAdjust: boolean;
  canExecuteSupervised: boolean;
  canExecuteUnattended: boolean;
  canSelfImprove: boolean;
  learningLoopActive: boolean;
  coordinationActive: boolean;
}

export interface SelfAwarenessSnapshot {
  timestamp: string;
  digest: SelfAwarenessDigest;
  substrate: SelfAwarenessSubstrate;
  autonomy: SelfAwarenessAutonomy;
  learning: SelfAwarenessLearning;
  tribal: SelfAwarenessTribal;
  health: SelfAwarenessHealth;
  capabilities: SelfAwarenessCapabilities;
}

export interface CapabilityQueryResult {
  query: string;
  matchedEngines: Array<{
    name: string;
    category?: string;
    confidence: number;
  }>;
  matchedSkills: string[];
  relevantTips: Array<{
    id: string;
    title: string;
    confidence: number;
  }>;
  recommendations: string[];
}

export interface WEDMDigest {
  schemaVersion: number;
  generated: string;
  source: string;
  engines: {
    count: number;
    names: string[];
    byCategory?: Record<string, string[]>;
  };
  skills?: {
    count: number;
    names: string[];
  };
  hooks?: {
    count: number;
    names: string[];
  };
  playbooks?: {
    count: number;
    names: string[];
  };
  stateFiles?: {
    count: number;
    names: string[];
  };
  tribalTips?: {
    count: number;
    sources: string[];
  };
  formulas?: {
    count: number;
    names: string[];
  };
}

// ============================================================================
// SELF-AWARENESS API
// ============================================================================

export const selfAwarenessApi = {
  /** Get complete self-awareness snapshot */
  getSnapshot: () => get<SelfAwarenessSnapshot>("/self-awareness/snapshot"),

  /** Get human-readable status report */
  getReport: () => get<{ report: string }>("/self-awareness/report"),

  /** Get cached WEDM digest (engine inventory) */
  getDigest: () => get<WEDMDigest>("/self-awareness/digest"),

  /** Query WEDM capabilities by keyword */
  queryCapabilities: (query: string) =>
    post<CapabilityQueryResult>("/self-awareness/query", { query }),

  /** Get health assessment only */
  getHealth: () => get<SelfAwarenessHealth>("/self-awareness/health"),
};
