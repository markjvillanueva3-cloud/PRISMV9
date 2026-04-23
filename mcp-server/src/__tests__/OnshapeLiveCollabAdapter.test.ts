/**
 * OnshapeLiveCollabAdapter.test.ts — U-CAD-APP-10 (PHASE-48)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  OnshapeLiveCollabAdapter,
  type OnshapeCollabTransport,
  type OnshapeCollabClock,
  type PRISMCollabEvent,
  type PresenceEntry,
  type SessionBinding,
} from "../engines/OnshapeLiveCollabAdapter.js";
import type { OnshapeWebhookPayload, OnshapeWebhookEvent } from "../schemas/cadOnshapeSchema.js";

function makeClock(): OnshapeCollabClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms: number) => {
      mono += ms;
      iso += ms;
    },
  };
}

function makeTransport(): OnshapeCollabTransport & {
  emit(payload: OnshapeWebhookPayload): void;
  lastWebhook: { url: string; events: OnshapeWebhookEvent[]; filter?: string } | null;
} {
  let callback: ((payload: OnshapeWebhookPayload) => void) | null = null;
  return {
    lastWebhook: null,
    subscribe(cb) {
      callback = cb;
      return () => {
        callback = null;
      };
    },
    registerWebhook(url, events, filter) {
      this.lastWebhook = { url, events, filter };
      return { webhookId: "wh-" + Date.now(), success: true };
    },
    unregisterWebhook() {
      return true;
    },
    emit(payload: OnshapeWebhookPayload) {
      if (callback) callback(payload);
    },
  };
}

function makePayload(overrides: Partial<OnshapeWebhookPayload> = {}): OnshapeWebhookPayload {
  return {
    event: "onshape.model.changed",
    documentId: "doc-001",
    workspaceId: "ws-001",
    elementId: "elem-001",
    userId: "user-001",
    timestamp: "2026-04-22T00:00:00Z",
    webhookId: "wh-001",
    ...overrides,
  };
}

describe("OnshapeLiveCollabAdapter (U-CAD-APP-10)", () => {
  let adapter: OnshapeLiveCollabAdapter;
  let transport: ReturnType<typeof makeTransport>;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    transport = makeTransport();
    clock = makeClock();
    adapter = new OnshapeLiveCollabAdapter({ transport, clock, bufferWindowMs: 0 });
  });

  describe("connection management", () => {
    it("starts disconnected", () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it("connect() enables event reception", () => {
      adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it("disconnect() stops event reception", () => {
      adapter.connect();
      adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it("connect() is idempotent", () => {
      adapter.connect();
      adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it("registerWebhooks() calls transport", () => {
      const result = adapter.registerWebhooks(
        "https://example.com/hook",
        ["onshape.model.changed", "onshape.comment.created"],
        "docId=doc-001",
      );
      expect(result.success).toBe(true);
      expect(transport.lastWebhook?.url).toBe("https://example.com/hook");
      expect(transport.lastWebhook?.events).toContain("onshape.model.changed");
    });

    it("unregisterAllWebhooks() clears registered hooks", () => {
      adapter.registerWebhooks("https://example.com/hook", ["onshape.model.changed"]);
      adapter.registerWebhooks("https://example.com/hook2", ["onshape.comment.created"]);
      const count = adapter.unregisterAllWebhooks();
      expect(count).toBe(2);
    });
  });

  describe("session binding", () => {
    it("bindSession() registers a session", () => {
      const binding: SessionBinding = {
        sessionId: "sess-001",
        documentIds: ["doc-001", "doc-002"],
      };
      adapter.bindSession(binding);
      expect(adapter.getSessionBinding("sess-001")).toEqual(binding);
    });

    it("unbindSession() removes a session", () => {
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
      expect(adapter.unbindSession("sess-001")).toBe(true);
      expect(adapter.getSessionBinding("sess-001")).toBeUndefined();
    });

    it("listSessionBindings() returns all bindings", () => {
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
      adapter.bindSession({ sessionId: "sess-002", documentIds: ["doc-002"] });
      const bindings = adapter.listSessionBindings();
      expect(bindings.length).toBe(2);
    });

    it("updateSessionFilter() modifies existing binding", () => {
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
      adapter.updateSessionFilter("sess-001", { eventFilter: ["document_changed"] });
      expect(adapter.getSessionBinding("sess-001")?.eventFilter).toEqual(["document_changed"]);
    });

    it("updateSessionFilter() returns false for unknown session", () => {
      expect(adapter.updateSessionFilter("unknown", { documentIds: ["doc-999"] })).toBe(false);
    });
  });

  describe("event processing", () => {
    beforeEach(() => {
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
    });

    it("converts onshape.model.changed to document_changed", () => {
      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.model.changed" }));

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("document_changed");
      expect(events[0].documentId).toBe("doc-001");
    });

    it("converts onshape.revision.created to version_created", () => {
      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.revision.created" }));

      expect(events[0].type).toBe("version_created");
    });

    it("converts onshape.comment.created to comment_added", () => {
      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.comment.created" }));

      expect(events[0].type).toBe("comment_added");
    });

    it("converts onshape.model.translation.complete to translation_complete", () => {
      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.model.translation.complete" }));

      expect(events[0].type).toBe("translation_complete");
    });

    it("converts onshape.workflow.transition to workflow_transition", () => {
      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.workflow.transition" }));

      expect(events[0].type).toBe("workflow_transition");
    });

    it("routes events to matching sessions only", () => {
      adapter.bindSession({ sessionId: "sess-002", documentIds: ["doc-002"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ documentId: "doc-001" }));

      expect(events[0].sessionIds).toContain("sess-001");
      expect(events[0].sessionIds).not.toContain("sess-002");
    });

    it("applies element filter to session binding", () => {
      adapter.updateSessionFilter("sess-001", { elementIds: ["elem-002"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ elementId: "elem-001" }));

      expect(events[0].sessionIds).not.toContain("sess-001");
    });

    it("applies user filter to session binding", () => {
      adapter.updateSessionFilter("sess-001", { userFilter: ["user-002"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ userId: "user-001" }));

      expect(events[0].sessionIds).not.toContain("sess-001");
    });

    it("applies event type filter to session binding", () => {
      adapter.updateSessionFilter("sess-001", { eventFilter: ["comment_added"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload({ event: "onshape.model.changed" }));

      expect(events[0].sessionIds).not.toContain("sess-001");
    });

    it("event subscription can be unsubscribed", () => {
      const events: PRISMCollabEvent[] = [];
      const unsub = adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload());
      expect(events.length).toBe(1);

      unsub();
      transport.emit(makePayload());
      expect(events.length).toBe(1);
    });
  });

  describe("event buffering", () => {
    it("bufferWindowMs=0 delivers immediately", () => {
      adapter = new OnshapeLiveCollabAdapter({ transport, clock, bufferWindowMs: 0 });
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload());
      expect(events.length).toBe(1);
    });

    it("flushBuffer() delivers pending events", () => {
      adapter = new OnshapeLiveCollabAdapter({ transport, clock, bufferWindowMs: 1000 });
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload());
      expect(events.length).toBe(0);

      const flushed = adapter.flushBuffer();
      expect(flushed.length).toBe(1);
      expect(events.length).toBe(1);
    });

    it("setBufferWindow() updates window", () => {
      adapter.setBufferWindow(500);
      expect(adapter.getBufferWindow()).toBe(500);
    });
  });

  describe("event log", () => {
    beforeEach(() => {
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
    });

    it("getEventLog() returns processed events", () => {
      transport.emit(makePayload());
      transport.emit(makePayload());

      const log = adapter.getEventLog();
      expect(log.length).toBe(2);
    });

    it("getEventLog() with limit", () => {
      for (let i = 0; i < 10; i++) {
        transport.emit(makePayload());
      }

      const log = adapter.getEventLog({ limit: 3 });
      expect(log.length).toBe(3);
    });

    it("getEventLog() filters by documentId", () => {
      adapter.bindSession({ sessionId: "sess-002", documentIds: ["doc-002"] });
      transport.emit(makePayload({ documentId: "doc-001" }));
      transport.emit(makePayload({ documentId: "doc-002" }));

      const log = adapter.getEventLog({ documentId: "doc-001" });
      expect(log.length).toBe(1);
      expect(log[0].documentId).toBe("doc-001");
    });

    it("getEventLog() filters by event type", () => {
      transport.emit(makePayload({ event: "onshape.model.changed" }));
      transport.emit(makePayload({ event: "onshape.comment.created" }));

      const log = adapter.getEventLog({ type: "comment_added" });
      expect(log.length).toBe(1);
      expect(log[0].type).toBe("comment_added");
    });

    it("clearEventLog() empties the log", () => {
      transport.emit(makePayload());
      expect(adapter.getEventLog().length).toBe(1);

      const cleared = adapter.clearEventLog();
      expect(cleared).toBe(1);
      expect(adapter.getEventLog().length).toBe(0);
    });

    it("log respects maxLogSize", () => {
      adapter = new OnshapeLiveCollabAdapter({ transport, clock, bufferWindowMs: 0, maxLogSize: 5 });
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });

      for (let i = 0; i < 10; i++) {
        transport.emit(makePayload());
      }

      expect(adapter.getEventLog().length).toBe(5);
    });
  });

  describe("presence tracking", () => {
    it("userJoin() adds user to presence", () => {
      adapter.userJoin({
        userId: "user-001",
        userName: "Alice",
        documentId: "doc-001",
        isEditing: false,
      });

      const presence = adapter.getPresence();
      expect(presence.length).toBe(1);
      expect(presence[0].userId).toBe("user-001");
      expect(presence[0].userName).toBe("Alice");
    });

    it("userActivity() updates lastSeenAt", () => {
      adapter.userJoin({
        userId: "user-001",
        userName: "Alice",
        documentId: "doc-001",
        isEditing: false,
      });

      clock.tickMs(5000);
      adapter.userActivity("user-001", { isEditing: true });

      const entry = adapter.getPresence()[0];
      expect(entry.isEditing).toBe(true);
      expect(entry.lastSeenAt).not.toBe(entry.joinedAt);
    });

    it("userActivity() returns false for unknown user", () => {
      expect(adapter.userActivity("unknown")).toBe(false);
    });

    it("userLeave() removes user from presence", () => {
      adapter.userJoin({
        userId: "user-001",
        userName: "Alice",
        documentId: "doc-001",
        isEditing: false,
      });

      expect(adapter.userLeave("user-001")).toBe(true);
      expect(adapter.getPresence().length).toBe(0);
    });

    it("userLeave() returns false for unknown user", () => {
      expect(adapter.userLeave("unknown")).toBe(false);
    });

    it("getDocumentPresence() filters by document", () => {
      adapter.userJoin({ userId: "user-001", userName: "Alice", documentId: "doc-001", isEditing: false });
      adapter.userJoin({ userId: "user-002", userName: "Bob", documentId: "doc-002", isEditing: false });

      const presence = adapter.getDocumentPresence("doc-001");
      expect(presence.length).toBe(1);
      expect(presence[0].userId).toBe("user-001");
    });

    it("presence subscription receives join/update/leave events", () => {
      const events: Array<{ entry: PresenceEntry; action: string }> = [];
      adapter.subscribeToPresence((entry, action) => events.push({ entry, action }));

      adapter.userJoin({ userId: "user-001", userName: "Alice", documentId: "doc-001", isEditing: false });
      adapter.userActivity("user-001", { isEditing: true });
      adapter.userLeave("user-001");

      expect(events.length).toBe(3);
      expect(events[0].action).toBe("join");
      expect(events[1].action).toBe("update");
      expect(events[2].action).toBe("leave");
    });

    it("presence subscription can be unsubscribed", () => {
      const events: Array<{ entry: PresenceEntry; action: string }> = [];
      const unsub = adapter.subscribeToPresence((entry, action) => events.push({ entry, action }));

      adapter.userJoin({ userId: "user-001", userName: "Alice", documentId: "doc-001", isEditing: false });
      unsub();
      adapter.userJoin({ userId: "user-002", userName: "Bob", documentId: "doc-001", isEditing: false });

      expect(events.length).toBe(1);
    });
  });

  describe("manual event injection", () => {
    beforeEach(() => {
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });
    });

    it("injectEvent() adds event to log", () => {
      const event = adapter.injectEvent({
        type: "selection_changed",
        documentId: "doc-001",
        userId: "user-001",
        timestamp: clock.now(),
        payload: { selectedIds: ["part-001"] },
      });

      expect(event.id).toMatch(/^collab-/);
      expect(event.sessionIds).toContain("sess-001");

      const log = adapter.getEventLog();
      expect(log.length).toBe(1);
      expect(log[0].type).toBe("selection_changed");
    });

    it("injectRawPayload() processes webhook payload", () => {
      adapter.connect();

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      adapter.injectRawPayload(makePayload());

      expect(events.length).toBe(1);
    });
  });

  describe("error handling", () => {
    it("subscriber errors do not block other subscribers", () => {
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents(() => {
        throw new Error("subscriber error");
      });
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit(makePayload());

      expect(events.length).toBe(1);
    });

    it("invalid payload is ignored", () => {
      adapter.connect();
      adapter.bindSession({ sessionId: "sess-001", documentIds: ["doc-001"] });

      const events: PRISMCollabEvent[] = [];
      adapter.subscribeToEvents((e) => events.push(e));

      transport.emit({ invalid: "payload" } as unknown as OnshapeWebhookPayload);

      expect(events.length).toBe(0);
    });
  });
});
