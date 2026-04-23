/**
 * CrossSessionOrchestratorEngine (U-COORD04)
 *
 * Unified facade over cross-session coordination engines:
 * - AtomicClaimBrokerEngine (CAS claiming)
 * - CrossTerminalBroadcastEngine (file watching + EventEmitter)
 * - SessionHandoffV2Engine (structured handoff)
 *
 * Provides single API for all cross-session coordination needs.
 *
 * @unit COORD-MS0/U-COORD04
 */

import { atomicClaimBrokerEngine } from "./AtomicClaimBrokerEngine.js";
import * as fs from "fs";
import * as os from "os";
import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

interface SessionInfo {
  id: string;
  family: string;
  pid: number;
  hostname: string;
  startedAt: string;
  lastHeartbeat: string;
  currentWork?: string;
}

interface BroadcastMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "info" | "warning" | "request" | "response";
  content: string;
  ttlMs?: number;
}

interface CoordinationStatus {
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

interface ClaimRequest {
  resource: string;
  ttlMs?: number;
  reason?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SUMMARY_PATH = "H:/prism/state/shared/AGENT_COORDINATION_SUMMARY.json";
const BROADCAST_PATH = "H:/prism/state/shared/BROADCAST_CHANNEL.jsonl";
const HANDOFF_DIR = "H:/prism/state/shared/handoffs";

// ============================================================================
// Engine Class
// ============================================================================

class CrossSessionOrchestratorEngine extends EventEmitter {
  private static instance: CrossSessionOrchestratorEngine;
  private readonly sessionId: string;
  private readonly hostname: string;
  private readonly pid: number;

  private constructor() {
    super();
    this.hostname = os.hostname();
    this.pid = process.pid;
    this.sessionId = `${process.env.PRISM_AGENT_FAMILY || "Claude"}@${this.hostname}/pid-${this.pid}`;
  }

  static getInstance(): CrossSessionOrchestratorEngine {
    if (!CrossSessionOrchestratorEngine.instance) {
      CrossSessionOrchestratorEngine.instance = new CrossSessionOrchestratorEngine();
    }
    return CrossSessionOrchestratorEngine.instance;
  }

  /**
   * Get current coordination status (from summary file)
   */
  getStatus(): CoordinationStatus {
    try {
      const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf-8"));
      return {
        healthy: summary.health === "healthy",
        daemonActive: summary.daemon_active || false,
        activeSessions: summary.active_sessions || 0,
        sessions: (summary.sessions || []).map((s: { id: string; family: string }) => ({
          id: s.id,
          family: s.family,
          pid: this.extractPid(s.id),
          hostname: this.extractHostname(s.id),
          startedAt: "",
          lastHeartbeat: summary.generated_at,
        })),
        pendingClaims: atomicClaimBrokerEngine.getActiveClaims().length,
        latestActivity: summary.latest_activity,
      };
    } catch {
      return {
        healthy: false,
        daemonActive: false,
        activeSessions: 0,
        sessions: [],
        pendingClaims: 0,
      };
    }
  }

  /**
   * Claim a resource for this session
   */
  claim(request: ClaimRequest): { success: boolean; error?: string } {
    const result = atomicClaimBrokerEngine.acquireClaim(
      request.resource,
      request.ttlMs
    );

    if (result.success) {
      this.emit("claim:acquired", { resource: request.resource, holder: this.sessionId });
    } else {
      this.emit("claim:rejected", { resource: request.resource, reason: result.error });
    }

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Release a claimed resource
   */
  release(resource: string): boolean {
    const released = atomicClaimBrokerEngine.releaseClaim(resource);
    if (released) {
      this.emit("claim:released", { resource, holder: this.sessionId });
    }
    return released;
  }

  /**
   * Broadcast a message to all sessions
   */
  broadcast(message: Omit<BroadcastMessage, "id" | "from" | "timestamp">): void {
    const fullMessage: BroadcastMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: this.sessionId,
      timestamp: new Date().toISOString(),
      ...message,
    };

    try {
      fs.appendFileSync(BROADCAST_PATH, JSON.stringify(fullMessage) + "\n");
      this.emit("broadcast:sent", fullMessage);
    } catch (err) {
      this.emit("broadcast:error", { error: (err as Error).message });
    }
  }

  /**
   * Get other active sessions (excluding self)
   */
  getOtherSessions(): SessionInfo[] {
    const status = this.getStatus();
    return status.sessions.filter(s => !s.id.includes(`pid-${this.pid}`));
  }

  /**
   * Check if another session is working on a file
   */
  isFileClaimedByOther(filePath: string): { claimed: boolean; holder?: string } {
    const claims = atomicClaimBrokerEngine.getActiveClaims();
    const claim = claims.find(c => c.resource === filePath && c.holder !== this.sessionId);

    return {
      claimed: !!claim,
      holder: claim?.holder,
    };
  }

  /**
   * Get compact status line for injection
   */
  getStatusLine(): string {
    const status = this.getStatus();
    if (!status.healthy) return "";

    const otherCount = this.getOtherSessions().length;
    if (otherCount === 0) return "";

    return `(${otherCount} online)`;
  }

  /**
   * Create handoff data for session transfer
   */
  createHandoff(data: {
    nextSession?: string;
    currentWork: string;
    context: string;
    nextSteps: string[];
  }): string {
    const handoffId = `handoff-${Date.now()}`;
    const handoffPath = `${HANDOFF_DIR}/${handoffId}.json`;

    const handoff = {
      id: handoffId,
      from: this.sessionId,
      to: data.nextSession || "any",
      timestamp: new Date().toISOString(),
      currentWork: data.currentWork,
      context: data.context,
      nextSteps: data.nextSteps,
    };

    try {
      fs.mkdirSync(HANDOFF_DIR, { recursive: true });
      fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
      return handoffId;
    } catch {
      return "";
    }
  }

  /**
   * Get this session's ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private extractPid(sessionId: string): number {
    const match = sessionId.match(/pid-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractHostname(sessionId: string): string {
    const match = sessionId.match(/@([^/]+)/);
    return match ? match[1] : "";
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const crossSessionOrchestratorEngine = CrossSessionOrchestratorEngine.getInstance();

export type {
  SessionInfo,
  BroadcastMessage,
  CoordinationStatus,
  ClaimRequest,
};
