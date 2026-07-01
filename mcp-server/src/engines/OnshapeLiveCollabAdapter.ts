// WIRE-EXEMPT: U-CAD-APP live-collab adapter -- heavy injected session/transport deps, no singleton; driven by the Onshape live-collaboration host (delta/CAD), not a standalone prism_* dispatcher action.
/**
 * OnshapeLiveCollabAdapter — U-CAD-APP-10 (PHASE-48)
 *
 * Bridges real-time Onshape document events to PRISM's internal event bus.
 * Converts Onshape webhook payloads into normalized collaboration events
 * that downstream PRISM AI sessions and engines can consume.
 *
 * Features:
 *   - Webhook event ingestion (model changed, revision, comment, translation)
 *   - Session binding (route events to specific PRISM sessions by doc/element)
 *   - Event buffering with configurable batch window
 *   - Presence tracking (who's viewing/editing a document)
 *   - Event filtering by document, element, user, event type
 *   - Reconnection/retry handling for webhook subscriptions
 *
 * Transport is injected — typically backed by Onshape webhook callbacks
 * in production, or an in-memory emitter for tests.
 *
 * @module engines/OnshapeLiveCollabAdapter
 */

import {
  OnshapeWebhookPayloadSchema,
  type OnshapeWebhookPayload,
  type OnshapeWebhookEvent,
} from "../schemas/cadOnshapeSchema.js";

// ── Event Types ─────────────────────────────────────────────────────────────

export const PRISM_COLLAB_EVENTS = [
  "document_changed",
  "version_created",
  "comment_added",
  "translation_complete",
  "workflow_transition",
  "user_joined",
  "user_left",
  "selection_changed",
  "feature_modified",
  "assembly_changed",
] as const;
export type PRISMCollabEventType = (typeof PRISM_COLLAB_EVENTS)[number];

export interface PRISMCollabEvent {
  id: string;
  type: PRISMCollabEventType;
  documentId: string;
  workspaceId?: string;
  elementId?: string;
  userId: string;
  userName?: string;
  timestamp: string;
  sessionIds: string[];
  payload: Record<string, unknown>;
  sourceEvent?: OnshapeWebhookEvent;
}

export interface PresenceEntry {
  userId: string;
  userName: string;
  documentId: string;
  elementId?: string;
  joinedAt: string;
  lastSeenAt: string;
  isEditing: boolean;
}

export interface SessionBinding {
  sessionId: string;
  documentIds: string[];
  elementIds?: string[];
  userFilter?: string[];
  eventFilter?: PRISMCollabEventType[];
}

// ── Transport Interface ─────────────────────────────────────────────────────

export interface OnshapeCollabClock {
  now(): string;
  monotonicMs(): number;
}

export interface OnshapeCollabTransport {
  /**
   * Subscribe to events. Returns cleanup function.
   */
  subscribe(callback: (payload: OnshapeWebhookPayload) => void): () => void;

  /**
   * Register a webhook subscription with Onshape.
   */
  registerWebhook(
    url: string,
    events: OnshapeWebhookEvent[],
    filter?: string,
  ): { webhookId: string; success: boolean };

  /**
   * Unregister a webhook subscription.
   */
  unregisterWebhook(webhookId: string): boolean;
}

function defaultClock(): OnshapeCollabClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

// ── Adapter Implementation ──────────────────────────────────────────────────

type CollabEventSubscriber = (event: PRISMCollabEvent) => void;
type PresenceSubscriber = (event: PresenceEntry, action: "join" | "update" | "leave") => void;

export class OnshapeLiveCollabAdapter {
  private transport: OnshapeCollabTransport;
  private clock: OnshapeCollabClock;

  private sessions = new Map<string, SessionBinding>();
  private presence = new Map<string, PresenceEntry>();
  private eventBuffer: PRISMCollabEvent[] = [];
  private eventLog: PRISMCollabEvent[] = [];

  private eventSubscribers: CollabEventSubscriber[] = [];
  private presenceSubscribers: PresenceSubscriber[] = [];

  private webhookIds: string[] = [];
  private transportUnsub: (() => void) | null = null;

  private bufferWindowMs = 100;
  private bufferTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxLogSize = 1000;
  private eventCounter = 0;

  private connected = false;

  constructor(opts: {
    transport: OnshapeCollabTransport;
    clock?: OnshapeCollabClock;
    bufferWindowMs?: number;
    maxLogSize?: number;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.bufferWindowMs !== undefined) this.bufferWindowMs = opts.bufferWindowMs;
    if (opts.maxLogSize !== undefined) this.maxLogSize = opts.maxLogSize;
  }

  // ── Connection Management ─────────────────────────────────────────────────

  connect(): void {
    if (this.connected) return;
    this.transportUnsub = this.transport.subscribe((payload) => {
      this.handleWebhookPayload(payload);
    });
    this.connected = true;
  }

  disconnect(): void {
    if (!this.connected) return;
    if (this.transportUnsub) {
      this.transportUnsub();
      this.transportUnsub = null;
    }
    this.flushBuffer();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  registerWebhooks(
    callbackUrl: string,
    events: OnshapeWebhookEvent[],
    filter?: string,
  ): { webhookId: string; success: boolean } {
    const result = this.transport.registerWebhook(callbackUrl, events, filter);
    if (result.success) {
      this.webhookIds.push(result.webhookId);
    }
    return result;
  }

  unregisterAllWebhooks(): number {
    let count = 0;
    for (const id of this.webhookIds) {
      if (this.transport.unregisterWebhook(id)) count++;
    }
    this.webhookIds = [];
    return count;
  }

  // ── Session Binding ───────────────────────────────────────────────────────

  bindSession(binding: SessionBinding): void {
    this.sessions.set(binding.sessionId, { ...binding });
  }

  unbindSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getSessionBinding(sessionId: string): SessionBinding | undefined {
    return this.sessions.get(sessionId);
  }

  listSessionBindings(): SessionBinding[] {
    return [...this.sessions.values()];
  }

  updateSessionFilter(
    sessionId: string,
    update: Partial<Pick<SessionBinding, "documentIds" | "elementIds" | "userFilter" | "eventFilter">>,
  ): boolean {
    const binding = this.sessions.get(sessionId);
    if (!binding) return false;
    if (update.documentIds) binding.documentIds = update.documentIds;
    if (update.elementIds !== undefined) binding.elementIds = update.elementIds;
    if (update.userFilter !== undefined) binding.userFilter = update.userFilter;
    if (update.eventFilter !== undefined) binding.eventFilter = update.eventFilter;
    return true;
  }

  // ── Event Subscriptions ───────────────────────────────────────────────────

  subscribeToEvents(callback: CollabEventSubscriber): () => void {
    this.eventSubscribers.push(callback);
    return () => {
      const idx = this.eventSubscribers.indexOf(callback);
      if (idx >= 0) this.eventSubscribers.splice(idx, 1);
    };
  }

  subscribeToPresence(callback: PresenceSubscriber): () => void {
    this.presenceSubscribers.push(callback);
    return () => {
      const idx = this.presenceSubscribers.indexOf(callback);
      if (idx >= 0) this.presenceSubscribers.splice(idx, 1);
    };
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  getPresence(): PresenceEntry[] {
    return [...this.presence.values()];
  }

  getDocumentPresence(documentId: string): PresenceEntry[] {
    return [...this.presence.values()].filter(p => p.documentId === documentId);
  }

  userJoin(entry: Omit<PresenceEntry, "joinedAt" | "lastSeenAt">): void {
    const now = this.clock.now();
    const full: PresenceEntry = {
      ...entry,
      joinedAt: now,
      lastSeenAt: now,
    };
    this.presence.set(entry.userId, full);
    this.notifyPresence(full, "join");
  }

  userActivity(userId: string, opts?: { isEditing?: boolean; elementId?: string }): boolean {
    const entry = this.presence.get(userId);
    if (!entry) return false;
    entry.lastSeenAt = this.clock.now();
    if (opts?.isEditing !== undefined) entry.isEditing = opts.isEditing;
    if (opts?.elementId !== undefined) entry.elementId = opts.elementId;
    this.notifyPresence(entry, "update");
    return true;
  }

  userLeave(userId: string): boolean {
    const entry = this.presence.get(userId);
    if (!entry) return false;
    this.presence.delete(userId);
    this.notifyPresence(entry, "leave");
    return true;
  }

  // ── Event Log ─────────────────────────────────────────────────────────────

  getEventLog(opts?: { limit?: number; documentId?: string; type?: PRISMCollabEventType }): PRISMCollabEvent[] {
    let events = [...this.eventLog];
    if (opts?.documentId) events = events.filter(e => e.documentId === opts.documentId);
    if (opts?.type) events = events.filter(e => e.type === opts.type);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearEventLog(): number {
    const count = this.eventLog.length;
    this.eventLog = [];
    return count;
  }

  // ── Buffer Config ─────────────────────────────────────────────────────────

  setBufferWindow(ms: number): void {
    this.bufferWindowMs = Math.max(0, ms);
  }

  getBufferWindow(): number {
    return this.bufferWindowMs;
  }

  flushBuffer(): PRISMCollabEvent[] {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    for (const event of events) {
      this.deliverEvent(event);
    }
    return events;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private handleWebhookPayload(payload: OnshapeWebhookPayload): void {
    const parsed = OnshapeWebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) return;

    const data = parsed.data;
    const event = this.convertToCollabEvent(data);
    if (!event) return;

    this.bufferEvent(event);
  }

  private convertToCollabEvent(payload: OnshapeWebhookPayload): PRISMCollabEvent | null {
    const type = this.mapEventType(payload.event);
    if (!type) return null;

    const matchingSessions = this.findMatchingSessions(payload.documentId, payload.elementId, payload.userId, type);

    this.eventCounter++;
    return {
      id: `collab-${this.eventCounter}-${Date.now()}`,
      type,
      documentId: payload.documentId,
      workspaceId: payload.workspaceId,
      elementId: payload.elementId,
      userId: payload.userId,
      timestamp: payload.timestamp,
      sessionIds: matchingSessions,
      payload: payload.data ?? {},
      sourceEvent: payload.event,
    };
  }

  private mapEventType(onshapeEvent: OnshapeWebhookEvent): PRISMCollabEventType | null {
    switch (onshapeEvent) {
      case "onshape.model.changed":
        return "document_changed";
      case "onshape.revision.created":
        return "version_created";
      case "onshape.comment.created":
        return "comment_added";
      case "onshape.model.translation.complete":
        return "translation_complete";
      case "onshape.workflow.transition":
        return "workflow_transition";
      case "onshape.model.lifecycle.changed":
        return "feature_modified";
      default:
        return null;
    }
  }

  private findMatchingSessions(
    documentId: string,
    elementId: string | undefined,
    userId: string,
    eventType: PRISMCollabEventType,
  ): string[] {
    const matches: string[] = [];
    for (const [sessionId, binding] of this.sessions) {
      if (!binding.documentIds.includes(documentId)) continue;
      if (binding.elementIds && elementId && !binding.elementIds.includes(elementId)) continue;
      if (binding.userFilter && !binding.userFilter.includes(userId)) continue;
      if (binding.eventFilter && !binding.eventFilter.includes(eventType)) continue;
      matches.push(sessionId);
    }
    return matches;
  }

  private bufferEvent(event: PRISMCollabEvent): void {
    if (this.bufferWindowMs === 0) {
      this.deliverEvent(event);
      return;
    }

    this.eventBuffer.push(event);

    if (!this.bufferTimeout) {
      this.bufferTimeout = setTimeout(() => {
        this.flushBuffer();
      }, this.bufferWindowMs);
    }
  }

  private deliverEvent(event: PRISMCollabEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    for (const sub of this.eventSubscribers) {
      try {
        sub(event);
      } catch {
        // subscriber errors don't block delivery
      }
    }
  }

  private notifyPresence(entry: PresenceEntry, action: "join" | "update" | "leave"): void {
    for (const sub of this.presenceSubscribers) {
      try {
        sub(entry, action);
      } catch {
        // subscriber errors don't block delivery
      }
    }
  }

  // ── Manual Event Injection (for testing/bridging) ─────────────────────────

  injectEvent(event: Omit<PRISMCollabEvent, "id" | "sessionIds">): PRISMCollabEvent {
    this.eventCounter++;
    const full: PRISMCollabEvent = {
      ...event,
      id: `collab-${this.eventCounter}-${Date.now()}`,
      sessionIds: this.findMatchingSessions(
        event.documentId,
        event.elementId,
        event.userId,
        event.type,
      ),
    };
    this.bufferEvent(full);
    return full;
  }

  injectRawPayload(payload: OnshapeWebhookPayload): void {
    this.handleWebhookPayload(payload);
  }
}
