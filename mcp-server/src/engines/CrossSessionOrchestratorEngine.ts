/**
 * CrossSessionOrchestratorEngine — Unified Facade for cross-session coordination
 *
 * COORD-MS0/U-COORD04: One API surface over the three primitives every PRISM
 * session needs to coordinate with its peers:
 *   - AtomicClaimBrokerEngine       — CAS file/resource claims with TTL + zombie reaping
 *   - CrossTerminalBroadcastEngine  — file-watch + JSONL broadcast channel + subscribers
 *   - SessionHandoffV2Engine        — schema-validated handoff payload builder
 *
 * The pre-refactor version of this engine only wired AtomicClaimBroker and
 * duplicated the broadcast/handoff logic with raw `fs.appendFileSync` +
 * ad-hoc JSON. That made the contract drift across multiple paths
 * (`state/shared/BROADCAST_CHANNEL.jsonl` vs the canonical
 * `mcp-server/data/state/BROADCAST_CHANNEL.jsonl`) and bypassed the v2
 * handoff validator. This rewrite delegates *everything* to the wrapped
 * engines so there is exactly one path-of-truth per primitive.
 *
 * Identity policy
 *   - sessionId is built from PRISM_AGENT_FAMILY|claude + hostname + pid so a
 *     given chat is addressable consistently across its lifetime.
 *   - claim/release proxy to AtomicClaimBroker, which uses its own holder-id
 *     derived from CLAUDE_SESSION_ID + hostname. Both ids are surfaced so
 *     callers can correlate.
 *
 * @module engines/CrossSessionOrchestratorEngine
 * @unit COORD-MS0/U-COORD04
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { atomicClaimBrokerEngine } from "./AtomicClaimBrokerEngine.js";
import { CrossTerminalBroadcastEngine } from "./CrossTerminalBroadcastEngine.js";
import {
  sessionHandoffV2Engine,
  type HandoffIdentity,
  type HandoffPosition,
  type HandoffOpenGoal,
  type HandoffInsightSummary,
  type HandoffNextAction,
  type SessionHandoffV2,
} from "./SessionHandoffV2Engine.js";

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

export interface SessionInfo {
  id: string;
  family: string;
  pid: number;
  hostname: string;
  startedAt: string;
  lastHeartbeat: string;
  currentWork?: string;
}

export interface BroadcastMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "info" | "warning" | "request" | "response" | "registry_change" | "asset_added" | "asset_removed" | "cache_invalidate";
  content?: string;
  payload?: Record<string, unknown>;
  ttlMs?: number;
}

export interface CoordinationStatus {
  healthy: boolean;
  daemonActive: boolean;
  activeSessions: number;
  sessions: SessionInfo[];
  pendingClaims: number;
  latestActivity?: {
    who: string;
    what: string;
    when: string;
  };
}

export interface ClaimRequest {
  resource: string;
  ttlMs?: number;
  reason?: string;
}

export interface ClaimResult {
  success: boolean;
  resource: string;
  holder?: string;
  error?: string;
  conflictingHolder?: string;
  suggestedAction?: "wait" | "steal" | "abort";
}

export interface HandoffOutcome {
  ok: boolean;
  filename: string;
  payload?: SessionHandoffV2;
  serialized?: string;
  errors?: string[];
}

export interface CreateHandoffInput {
  identity?: Partial<HandoffIdentity>;
  position?: HandoffPosition;
  openGoals?: HandoffOpenGoal[];
  keyInsights?: HandoffInsightSummary[];
  nextActions?: HandoffNextAction[];
  /** Optional explicit ISO timestamp (test-friendliness; defaults to now) */
  writtenAt?: string;
  /** Optional explicit start time (test-friendliness; defaults to writtenAt) */
  startedAt?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Summary file produced by the agent-coordination daemon. Read-only for the
 * orchestrator. Path is configurable through the `PRISM_COORD_SUMMARY_PATH`
 * env var to keep tests hermetic.
 */
const DEFAULT_SUMMARY_PATH = "H:/prism/state/shared/AGENT_COORDINATION_SUMMARY.json";

function resolveSummaryPath(): string {
  return process.env.PRISM_COORD_SUMMARY_PATH || DEFAULT_SUMMARY_PATH;
}

// ============================================================================
// Engine
// ============================================================================

class CrossSessionOrchestratorEngine extends EventEmitter {
  private static instance: CrossSessionOrchestratorEngine;
  private readonly sessionId: string;
  private readonly hostname: string;
  private readonly pid: number;
  private readonly family: string;
  private readonly broadcast: CrossTerminalBroadcastEngine;
  /** Subscriber handles created via this facade — tracked for cleanup. */
  private readonly subscriptions: Set<{ id: string; unsubscribe: () => void }> = new Set();

  private constructor() {
    super();
    this.hostname = os.hostname();
    this.pid = process.pid;
    this.family = process.env.PRISM_AGENT_FAMILY || "Claude";
    this.sessionId = `${this.family}@${this.hostname}/pid-${this.pid}`;
    this.broadcast = new CrossTerminalBroadcastEngine();
  }

  static getInstance(): CrossSessionOrchestratorEngine {
    if (!CrossSessionOrchestratorEngine.instance) {
      CrossSessionOrchestratorEngine.instance = new CrossSessionOrchestratorEngine();
    }
    return CrossSessionOrchestratorEngine.instance;
  }

  /** Reset the singleton for tests. Not for production use. */
  static __resetForTests(): void {
    if (CrossSessionOrchestratorEngine.instance) {
      CrossSessionOrchestratorEngine.instance.disposeSubscriptions();
    }
    CrossSessionOrchestratorEngine.instance = undefined as unknown as CrossSessionOrchestratorEngine;
  }

  // --------------------------------------------------------------------------
  // Identity
  // --------------------------------------------------------------------------

  getSessionId(): string {
    return this.sessionId;
  }

  getIdentity(): Pick<HandoffIdentity, "sessionId" | "family" | "machine" | "instance"> {
    return {
      sessionId: this.sessionId,
      family: this.normalizeFamily(this.family),
      machine: this.hostname,
      instance: `pid-${this.pid}`,
    };
  }

  // --------------------------------------------------------------------------
  // Claim broker pass-through
  // --------------------------------------------------------------------------

  claim(request: ClaimRequest): ClaimResult {
    const resource = String(request.resource ?? "");
    if (!resource) {
      return { success: false, resource, error: "resource must be a non-empty string" };
    }
    const ttlMs = this.sanitizeTtl(request.ttlMs);
    const result = atomicClaimBrokerEngine.acquireClaim(resource, ttlMs);
    const out: ClaimResult = {
      success: result.success,
      resource,
      holder: result.claim?.holder,
      error: result.error,
      conflictingHolder: result.conflictingHolder,
      suggestedAction: result.suggestedAction,
    };
    if (result.success) {
      this.emit("claim:acquired", { resource, holder: out.holder ?? this.sessionId });
    } else {
      this.emit("claim:rejected", { resource, reason: result.error });
    }
    return out;
  }

  release(resource: string): boolean {
    if (!resource || typeof resource !== "string") return false;
    const released = atomicClaimBrokerEngine.releaseClaim(resource);
    if (released) this.emit("claim:released", { resource });
    return released;
  }

  isFileClaimedByOther(filePath: string): { claimed: boolean; holder?: string } {
    if (!filePath || typeof filePath !== "string") return { claimed: false };
    const claims = atomicClaimBrokerEngine.getActiveClaims();
    const claim = claims.find(c => c.resource === filePath && !this.isSelf(c.holder));
    return claim ? { claimed: true, holder: claim.holder } : { claimed: false };
  }

  getActiveClaims(): ReturnType<typeof atomicClaimBrokerEngine.getActiveClaims> {
    return atomicClaimBrokerEngine.getActiveClaims();
  }

  // --------------------------------------------------------------------------
  // Broadcast pass-through (delegated to CrossTerminalBroadcastEngine)
  // --------------------------------------------------------------------------

  async broadcastMessage(
    message: Omit<BroadcastMessage, "id" | "from" | "timestamp"> & { type?: BroadcastMessage["type"] }
  ): Promise<BroadcastMessage> {
    const type = (message.type ?? "info") as BroadcastMessage["type"];
    const payload: Record<string, unknown> = {
      ...(message.payload ?? {}),
    };
    if (message.content) payload.content = message.content;
    if (typeof message.ttlMs === "number" && Number.isFinite(message.ttlMs)) {
      payload.ttlMs = message.ttlMs;
    }
    // Map "info"/"warning"/"request"/"response" onto the underlying engine's
    // event-type space. The underlying engine only emits the four canonical
    // event types; we carry the original type via payload.semantic_type so
    // subscribers can recover it.
    const downstreamType = this.mapToBroadcastEventType(type);
    if (downstreamType !== type) payload.semantic_type = type;
    await this.broadcast.broadcast({ type: downstreamType, payload });
    this.emit("broadcast:sent", { type, payload });
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: this.sessionId,
      timestamp: new Date().toISOString(),
      type,
      content: message.content,
      payload: message.payload,
      ttlMs: message.ttlMs,
    };
  }

  /** Subscribe to broadcast events. Returns an unsubscribe handle. */
  subscribe(callback: (event: BroadcastMessage) => void): { id: string; unsubscribe: () => void } {
    const handle = this.broadcast.subscribe(evt => {
      callback({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: evt.sessionId,
        timestamp: evt.timestamp,
        type: evt.type as BroadcastMessage["type"],
        payload: evt.payload,
      });
    });
    this.subscriptions.add(handle);
    return handle;
  }

  async getRecentEvents(limit: number = 50): Promise<BroadcastMessage[]> {
    const safeLimit = this.sanitizeLimit(limit);
    const events = await this.broadcast.getRecentEvents(safeLimit);
    return events.map(e => ({
      id: `evt-${e.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
      from: e.sessionId,
      timestamp: e.timestamp,
      type: e.type as BroadcastMessage["type"],
      payload: e.payload,
    }));
  }

  async forceInvalidateAll(): Promise<void> {
    await this.broadcast.forceInvalidateAll();
    this.emit("broadcast:invalidate-all");
  }

  // --------------------------------------------------------------------------
  // Handoff (delegated to SessionHandoffV2Engine)
  // --------------------------------------------------------------------------

  /**
   * Build a SessionHandoffV2 payload (schema-validated) plus the canonical
   * `targetPath` filename. The caller is responsible for persistence —
   * keeping this engine pure lets us reuse it from hooks/CLI/tests.
   */
  createHandoff(input: CreateHandoffInput): HandoffOutcome {
    const identity = this.buildHandoffIdentity(input.identity, input.startedAt, input.writtenAt);
    // Sanitize writtenAt before delegating to v2 builder — non-ISO strings
    // would otherwise propagate to the payload and fail validate().
    const writtenAtIso = (input.writtenAt && /^\d{4}-\d{2}-\d{2}T/.test(input.writtenAt))
      ? input.writtenAt
      : identity.endedAt;
    const payload = sessionHandoffV2Engine.build({
      identity,
      position: input.position ?? {},
      openGoals: input.openGoals ?? [],
      keyInsights: input.keyInsights ?? [],
      nextActions: input.nextActions ?? [],
      writtenAt: writtenAtIso,
    });
    const validation = sessionHandoffV2Engine.validate(payload);
    if (!validation.ok) {
      return {
        ok: false,
        filename: "",
        errors: validation.errors,
      };
    }
    const filename = sessionHandoffV2Engine.targetPath(identity);
    const serialized = sessionHandoffV2Engine.serialize(payload);
    return {
      ok: true,
      filename,
      payload,
      serialized,
    };
  }

  /** Persist a previously-built handoff to disk. Returns the absolute path. */
  persistHandoff(outcome: HandoffOutcome, dir: string): string {
    if (!outcome.ok || !outcome.serialized) {
      throw new Error(`Cannot persist invalid handoff: ${(outcome.errors || []).join(", ") || "unknown error"}`);
    }
    fs.mkdirSync(dir, { recursive: true });
    const abs = path.join(dir, outcome.filename);
    fs.writeFileSync(abs, outcome.serialized);
    return abs;
  }

  // --------------------------------------------------------------------------
  // Coordination status (reads daemon summary file)
  // --------------------------------------------------------------------------

  getStatus(): CoordinationStatus {
    const summaryPath = resolveSummaryPath();
    try {
      if (!fs.existsSync(summaryPath)) {
        return this.emptyStatus();
      }
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      const sessions: SessionInfo[] = (summary.sessions || []).map((s: { id?: string; family?: string }) => {
        const id = String(s.id || "");
        return {
          id,
          family: String(s.family || "unknown"),
          pid: this.extractPid(id),
          hostname: this.extractHostname(id),
          startedAt: "",
          lastHeartbeat: String(summary.generated_at || ""),
        };
      });
      return {
        healthy: summary.health === "healthy",
        daemonActive: Boolean(summary.daemon_active),
        activeSessions: Number(summary.active_sessions) || sessions.length,
        sessions,
        pendingClaims: atomicClaimBrokerEngine.getActiveClaims().length,
        latestActivity: summary.latest_activity,
      };
    } catch {
      return this.emptyStatus();
    }
  }

  getOtherSessions(): SessionInfo[] {
    const status = this.getStatus();
    return status.sessions.filter(s => !this.isSelf(s.id));
  }

  getStatusLine(): string {
    const status = this.getStatus();
    if (!status.healthy) return "";
    const others = this.getOtherSessions().length;
    if (others === 0) return "";
    return `(${others} online)`;
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  disposeSubscriptions(): void {
    for (const sub of this.subscriptions) {
      try {
        sub.unsubscribe();
      } catch { /* swallow */ }
    }
    this.subscriptions.clear();
  }

  private emptyStatus(): CoordinationStatus {
    return {
      healthy: false,
      daemonActive: false,
      activeSessions: 0,
      sessions: [],
      pendingClaims: atomicClaimBrokerEngine.getActiveClaims().length,
    };
  }

  /** Map broadcast semantic types to the underlying engine's canonical set. */
  private mapToBroadcastEventType(
    t: BroadcastMessage["type"]
  ): "registry_change" | "asset_added" | "asset_removed" | "cache_invalidate" {
    switch (t) {
      case "registry_change":
      case "asset_added":
      case "asset_removed":
      case "cache_invalidate":
        return t;
      default:
        // info/warning/request/response are higher-level messages — they ride
        // on the cache_invalidate channel so subscribers see them and can
        // dispatch on payload.semantic_type.
        return "cache_invalidate";
    }
  }

  private buildHandoffIdentity(
    override: Partial<HandoffIdentity> | undefined,
    startedAt: string | undefined,
    writtenAt: string | undefined
  ): HandoffIdentity {
    const now = new Date().toISOString();
    const ended = writtenAt && /^\d{4}-\d{2}-\d{2}T/.test(writtenAt) ? writtenAt : now;
    const started = startedAt && /^\d{4}-\d{2}-\d{2}T/.test(startedAt) ? startedAt : ended;
    return {
      sessionId: override?.sessionId || this.sessionId,
      family: override?.family ?? this.normalizeFamily(this.family),
      machine: override?.machine || this.hostname,
      instance: override?.instance || `pid-${this.pid}`,
      startedAt: started,
      endedAt: ended,
    };
  }

  private normalizeFamily(raw: string): HandoffIdentity["family"] {
    const v = String(raw || "").toLowerCase();
    if (v === "claude") return "claude";
    if (v === "codex") return "codex";
    return "other";
  }

  private sanitizeTtl(ttl: number | undefined): number | undefined {
    if (ttl === undefined || ttl === null) return undefined;
    const n = Number(ttl);
    if (Number.isNaN(n) || n <= 0) return undefined;
    // Cap at 24h to prevent runaway claims if a caller passes
    // Number.POSITIVE_INFINITY or Number.MAX_SAFE_INTEGER.
    const TTL_CAP_MS = 24 * 60 * 60 * 1000;
    if (!Number.isFinite(n)) return TTL_CAP_MS;
    return Math.min(n, TTL_CAP_MS);
  }

  private sanitizeLimit(limit: number): number {
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(Math.floor(n), 10000);
  }

  private isSelf(holderOrId: string): boolean {
    if (!holderOrId) return false;
    if (holderOrId === this.sessionId) return true;
    // Orchestrator format: "${family}@${hostname}/pid-${pid}" — prefix or pid match
    if (holderOrId.startsWith(this.sessionId + "-")) return true;
    if (holderOrId.includes(`pid-${this.pid}`)) return true;
    // AtomicClaimBroker format: "${CLAUDE_SESSION_ID ?? `session-${pid}`}-${hostname}".
    // When CLAUDE_SESSION_ID is unset (typical in our process), the broker
    // holder is `session-${pid}-${hostname}` — recognize that as self.
    if (holderOrId === `session-${this.pid}-${this.hostname}`) return true;
    if (holderOrId.startsWith(`session-${this.pid}-`)) return true;
    // When CLAUDE_SESSION_ID IS set, the holder is `${envSessionId}-${hostname}`
    // and the env sessionId is unrelated to pid. Compare against the actual
    // broker holderId via env lookup.
    const envSession = process.env.CLAUDE_SESSION_ID;
    if (envSession && holderOrId === `${envSession}-${this.hostname}`) return true;
    return false;
  }

  private extractPid(id: string): number {
    const m = id.match(/pid-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  private extractHostname(id: string): string {
    const m = id.match(/@([^/]+)/);
    return m ? m[1] : "";
  }
}

// ============================================================================
// Export singleton + class (class exported for tests)
// ============================================================================

export const crossSessionOrchestratorEngine = CrossSessionOrchestratorEngine.getInstance();
export { CrossSessionOrchestratorEngine };
export type {
  HandoffIdentity,
  HandoffPosition,
  HandoffOpenGoal,
  HandoffInsightSummary,
  HandoffNextAction,
  SessionHandoffV2,
};
