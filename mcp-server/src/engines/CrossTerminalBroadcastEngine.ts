/**
 * CrossTerminalBroadcastEngine — Cross-Session Asset Synchronization
 *
 * Phase 0.2 from AGI proximity plan. Provides real-time notification
 * when cross-session-asset-registry.json changes, allowing all active
 * sessions to invalidate their caches and stay synchronized.
 *
 * Uses file system watching (no external dependencies).
 * Push notifications via named pipe / socket when available.
 *
 * @module engines/CrossTerminalBroadcastEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";

// ============================================================================
// TYPES
// ============================================================================

export type BroadcastEventType =
  | "registry_change"
  | "asset_added"
  | "asset_removed"
  | "cache_invalidate"
  | "operator_message";

export type OperatorMessageType = "info" | "warning" | "request" | "response";

export interface BroadcastEvent {
  type: BroadcastEventType;
  timestamp: string;
  sessionId: string;
  payload?: Record<string, unknown>;
}

export interface OperatorBroadcastResult {
  ok: true;
  event: BroadcastEvent;
  channel: string;
  /** Approximate number of recent events visible on the channel (last 30s window). */
  recent_event_count: number;
}

export interface OperatorBroadcastError {
  ok: false;
  error: "empty_message" | "invalid_message_type" | "write_failed";
  detail?: string;
}

export interface SubscriptionHandle {
  id: string;
  unsubscribe: () => void;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossTerminalBroadcastEngine extends EventEmitter {
  private baseDir: string;
  private registryPath: string;
  private broadcastPath: string;
  private watcher: fs.FSWatcher | null = null;
  private lastMtime: number = 0;
  private sessionId: string;
  private isWatching: boolean = false;

  constructor() {
    super();
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.registryPath = path.join(this.baseDir, "data", "state", "cross-session-asset-registry.json");
    this.broadcastPath = path.join(this.baseDir, "data", "state", "BROADCAST_CHANNEL.jsonl");
    this.sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;
    log.info("[CrossTerminalBroadcast] Initialized — cross-session synchronization");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Start watching for registry changes
   * Emits 'change' event when registry is modified
   */
  startWatching(): void {
    if (this.isWatching) return;

    try {
      // Get initial mtime
      if (fs.existsSync(this.registryPath)) {
        this.lastMtime = fs.statSync(this.registryPath).mtimeMs;
      }

      // Watch registry file
      this.watcher = fs.watch(this.registryPath, { persistent: false }, (eventType) => {
        if (eventType === "change") {
          this.handleRegistryChange();
        }
      });

      // Also watch broadcast channel for explicit notifications
      this.watchBroadcastChannel();

      this.isWatching = true;
      log.info("[CrossTerminalBroadcast] Started watching registry");
    } catch (err) {
      log.warn(`[CrossTerminalBroadcast] Could not start watcher: ${err}`);
    }
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    log.info("[CrossTerminalBroadcast] Stopped watching");
  }

  /**
   * Subscribe to change events
   */
  subscribe(callback: (event: BroadcastEvent) => void): SubscriptionHandle {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const handler = (event: BroadcastEvent) => {
      callback(event);
    };

    this.on("change", handler);

    return {
      id,
      unsubscribe: () => {
        this.off("change", handler);
      },
    };
  }

  /**
   * Broadcast a change to all sessions
   */
  async broadcast(event: Omit<BroadcastEvent, "timestamp" | "sessionId">): Promise<void> {
    const fullEvent: BroadcastEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    // Write to broadcast channel
    await this.writeToBroadcastChannel(fullEvent);

    // Emit locally
    this.emit("change", fullEvent);

    log.info(`[CrossTerminalBroadcast] Broadcast: ${event.type}`);
  }

  /**
   * Notify that an asset was added (call after registerNewAsset)
   */
  async notifyAssetAdded(assetType: string, assetName: string, assetPath: string): Promise<void> {
    await this.broadcast({
      type: "asset_added",
      payload: { assetType, assetName, assetPath },
    });
  }

  /**
   * Force all sessions to invalidate cache
   */
  async forceInvalidateAll(): Promise<void> {
    await this.broadcast({
      type: "cache_invalidate",
      payload: { reason: "manual_invalidate" },
    });
  }

  /**
   * Broadcast an operator message to all active sessions (TRAINING-LEARNING-MS0
   * adjacent / COORD-MS0 U-COORD08).
   *
   * Wraps the engine's `broadcast()` with operator-friendly semantics: free-text
   * content + a `msgType` from {info, warning, request, response}. The event
   * type is fixed as `"operator_message"` so consumers like
   * `session-awareness-inject.mjs` can distinguish operator chatter from cache
   * events.
   *
   * Validates inputs and returns a discriminated `{ok}` result rather than
   * throwing — keeps the dispatcher case-handler simple.
   *
   * @param content — free-form text from the operator. Trimmed; empty rejected.
   * @param msgType — one of info|warning|request|response (default info).
   * @returns OperatorBroadcastResult on success or OperatorBroadcastError.
   */
  async broadcastOperatorMessage(
    content: string,
    msgType: OperatorMessageType = "info",
  ): Promise<OperatorBroadcastResult | OperatorBroadcastError> {
    if (typeof content !== "string" || content.trim().length === 0) {
      return { ok: false, error: "empty_message", detail: "content must be a non-empty string" };
    }
    const validTypes: ReadonlySet<OperatorMessageType> = new Set([
      "info",
      "warning",
      "request",
      "response",
    ]);
    if (!validTypes.has(msgType)) {
      return {
        ok: false,
        error: "invalid_message_type",
        detail: `msgType must be one of info|warning|request|response, got ${String(msgType)}`,
      };
    }

    const trimmed = content.trim();
    const event: BroadcastEvent = {
      type: "operator_message",
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      payload: {
        msgType,
        content: trimmed,
        from: this.sessionId,
      },
    };

    try {
      await this.writeToBroadcastChannel(event);
    } catch (err) {
      return { ok: false, error: "write_failed", detail: (err as Error).message };
    }

    // Best-effort recent-event count for delivery confirmation (last 30s window).
    let recentCount = 0;
    try {
      const recent = await this.getRecentEvents(100);
      const cutoff = Date.now() - 30000;
      recentCount = recent.filter((e) => new Date(e.timestamp).getTime() > cutoff).length;
    } catch {
      // ignore — count is advisory
    }

    // Emit locally so subscribed listeners in this process see it too.
    this.emit("change", event);

    log.info(`[CrossTerminalBroadcast] Operator broadcast (${msgType}): ${trimmed.slice(0, 80)}`);

    return {
      ok: true,
      event,
      channel: this.broadcastPath,
      recent_event_count: recentCount,
    };
  }

  /** Returns the current session id (deterministic since constructor sets it). */
  getSessionId(): string {
    return this.sessionId;
  }

  /** @internal — exposed so tests can override the broadcast channel path. */
  _setBroadcastPath(p: string): void {
    this.broadcastPath = p;
  }

  /**
   * Check if registry has changed since last check
   */
  hasRegistryChanged(): boolean {
    try {
      if (!fs.existsSync(this.registryPath)) return false;
      const currentMtime = fs.statSync(this.registryPath).mtimeMs;
      return currentMtime > this.lastMtime;
    } catch {
      return false;
    }
  }

  /**
   * Get recent broadcast events
   */
  async getRecentEvents(limit = 50): Promise<BroadcastEvent[]> {
    const events: BroadcastEvent[] = [];

    try {
      if (!fs.existsSync(this.broadcastPath)) return events;

      const content = fs.readFileSync(this.broadcastPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines.slice(-limit)) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // Channel doesn't exist yet
    }

    return events;
  }

  /**
   * Get events from other sessions (not this one)
   */
  async getExternalEvents(sinceTimestamp?: string): Promise<BroadcastEvent[]> {
    const events = await this.getRecentEvents(100);
    const cutoff = sinceTimestamp ? new Date(sinceTimestamp).getTime() : 0;

    return events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return e.sessionId !== this.sessionId && eventTime > cutoff;
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private handleRegistryChange(): void {
    try {
      const currentMtime = fs.statSync(this.registryPath).mtimeMs;
      if (currentMtime > this.lastMtime) {
        this.lastMtime = currentMtime;

        const event: BroadcastEvent = {
          type: "registry_change",
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
        };

        this.emit("change", event);
        log.info("[CrossTerminalBroadcast] Registry changed");
      }
    } catch (err) {
      log.warn(`[CrossTerminalBroadcast] Error handling change: ${err}`);
    }
  }

  private watchBroadcastChannel(): void {
    // Poll broadcast channel for events from other sessions
    const pollInterval = setInterval(async () => {
      if (!this.isWatching) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const externalEvents = await this.getExternalEvents(
          new Date(Date.now() - 30000).toISOString() // Last 30 seconds
        );

        for (const event of externalEvents) {
          if (event.type === "cache_invalidate" || event.type === "asset_added") {
            this.emit("change", event);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000); // Poll every 5 seconds

    // Clean up on process exit
    process.on("exit", () => clearInterval(pollInterval));
  }

  private async writeToBroadcastChannel(event: BroadcastEvent): Promise<void> {
    try {
      const dir = path.dirname(this.broadcastPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Append to channel (JSONL format)
      fs.appendFileSync(this.broadcastPath, JSON.stringify(event) + "\n");

      // Trim channel if too large (keep last 1000 lines)
      const content = fs.readFileSync(this.broadcastPath, "utf-8");
      const lines = content.trim().split("\n");
      if (lines.length > 1000) {
        fs.writeFileSync(this.broadcastPath, lines.slice(-1000).join("\n") + "\n");
      }
    } catch (err) {
      log.warn(`[CrossTerminalBroadcast] Could not write to channel: ${err}`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const crossTerminalBroadcastEngine = new CrossTerminalBroadcastEngine();
