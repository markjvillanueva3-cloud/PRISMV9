/**
 * Tests for RealtimeEventBridge — M-3-2-RT
 * Verifies EventBus → WebSocket channel forwarding, SSE client management, and bridge stats.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock WebSocketEngine
const mockRoomSend = vi.fn().mockReturnValue(2);
const mockBroadcast = vi.fn().mockReturnValue(3);

vi.mock("../engines/WebSocketEngine.js", () => ({
  webSocketEngine: {
    roomSend: mockRoomSend,
    broadcast: mockBroadcast,
  },
}));

// Mock EventBus — capture subscriptions
const subscriptions = new Map<string, (event: any) => void>();
let subCounter = 0;
const mockSubscribe = vi.fn((pattern: string, handler: (event: any) => void) => {
  const id = `sub_${++subCounter}`;
  subscriptions.set(id, handler);
  return id;
});
const mockUnsubscribe = vi.fn((id: string) => subscriptions.delete(id));

vi.mock("../engines/EventBus.js", () => ({
  eventBus: {
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  },
}));

describe("RealtimeEventBridge", () => {
  let bridge: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    subscriptions.clear();
    subCounter = 0;
    const mod = await import("../engines/RealtimeEventBridge.js");
    bridge = new mod.RealtimeEventBridge();
  });

  afterEach(() => {
    bridge.stop();
  });

  describe("start/stop lifecycle", () => {
    it("subscribes to EventBus patterns on start", () => {
      bridge.start();
      // Should subscribe to all channel mappings (15 patterns)
      expect(mockSubscribe.mock.calls.length).toBeGreaterThanOrEqual(10);
      expect(bridge.stats().running).toBe(true);
    });

    it("unsubscribes all on stop", () => {
      bridge.start();
      const subCount = mockSubscribe.mock.calls.length;
      bridge.stop();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(subCount);
      expect(bridge.stats().running).toBe(false);
    });

    it("prevents double start", () => {
      bridge.start();
      const firstCount = mockSubscribe.mock.calls.length;
      bridge.start(); // should be no-op
      expect(mockSubscribe.mock.calls.length).toBe(firstCount);
    });
  });

  describe("event forwarding", () => {
    it("forwards EventBus machine events to machine:all WS room", () => {
      bridge.start();
      // Find the machine.status.* subscription
      const machineCall = mockSubscribe.mock.calls.find(
        (c: any[]) => c[0] === "machine.status.*"
      );
      expect(machineCall).toBeDefined();

      // Simulate EventBus event
      const handler = machineCall![1];
      handler({
        id: "evt_1",
        type: "machine.status.changed",
        source: "machineLive",
        timestamp: new Date(),
        payload: { machine_id: "haas-vf2", status: "running" },
      });

      expect(mockRoomSend).toHaveBeenCalledWith("machine:all", expect.objectContaining({
        type: "machine:status",
        payload: expect.objectContaining({ machine_id: "haas-vf2", status: "running" }),
      }));
    });

    it("forwards to entity-specific room when machine_id present", () => {
      bridge.start();
      const machineCall = mockSubscribe.mock.calls.find(
        (c: any[]) => c[0] === "machine.status.*"
      );
      const handler = machineCall![1];
      handler({
        id: "evt_2",
        type: "machine.status.changed",
        source: "machineLive",
        timestamp: new Date(),
        payload: { machine_id: "dmg-5x", status: "alarm" },
      });

      // Should send to both machine:all and machine:dmg-5x
      expect(mockRoomSend).toHaveBeenCalledTimes(2);
      expect(mockRoomSend).toHaveBeenCalledWith("machine:dmg-5x", expect.objectContaining({
        type: "machine:status",
      }));
    });

    it("forwards task.completed to job:all as job:complete", () => {
      bridge.start();
      const taskCall = mockSubscribe.mock.calls.find(
        (c: any[]) => c[0] === "task.completed"
      );
      expect(taskCall).toBeDefined();

      taskCall![1]({
        id: "evt_3",
        type: "task.completed",
        source: "jobLifecycle",
        timestamp: new Date(),
        payload: { job_id: "J-1234", duration_ms: 5000 },
      });

      expect(mockRoomSend).toHaveBeenCalledWith("job:all", expect.objectContaining({
        type: "job:complete",
      }));
    });

    it("forwards quality gate events to safety:all", () => {
      bridge.start();
      const qualityCall = mockSubscribe.mock.calls.find(
        (c: any[]) => c[0] === "quality.gate.*"
      );
      expect(qualityCall).toBeDefined();

      qualityCall![1]({
        id: "evt_4",
        type: "quality.gate.failed",
        source: "qualityEngine",
        timestamp: new Date(),
        payload: { score: 0.65, reason: "Surface finish out of tolerance" },
      });

      expect(mockRoomSend).toHaveBeenCalledWith("safety:all", expect.objectContaining({
        type: "safety:alert",
      }));
    });
  });

  describe("direct emit", () => {
    it("emits directly to a WS room via bridge.emit()", () => {
      const sent = bridge.emit("notification", "system:all", { message: "test" });
      expect(mockRoomSend).toHaveBeenCalledWith("system:all", {
        type: "notification",
        payload: { message: "test" },
      });
      expect(sent).toBe(2);
    });

    it("broadcasts to all WS clients via bridge.broadcast()", () => {
      const sent = bridge.broadcast("system:health", { status: "ok" });
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "system:health",
        payload: { status: "ok" },
      });
      expect(sent).toBe(3);
    });
  });

  describe("SSE client management", () => {
    it("adds and removes SSE clients", () => {
      const mockRes = { write: vi.fn().mockReturnValue(true), end: vi.fn() };
      bridge.addSSEClient("sse-1", mockRes, ["machine:all", "job:all"]);
      expect(bridge.stats().sse_clients).toBe(1);

      bridge.removeSSEClient("sse-1");
      expect(bridge.stats().sse_clients).toBe(0);
    });

    it("writes SSE events to subscribed clients", () => {
      const mockRes = { write: vi.fn().mockReturnValue(true), end: vi.fn() };
      bridge.addSSEClient("sse-2", mockRes, ["machine:all"]);

      bridge.emit("machine:status", "machine:all", { machine_id: "haas-vf2" });

      expect(mockRes.write).toHaveBeenCalledTimes(1);
      const written = mockRes.write.mock.calls[0][0] as string;
      expect(written).toContain("event: machine:status");
      expect(written).toContain("haas-vf2");
    });

    it("does not write to clients on non-subscribed channels", () => {
      const mockRes = { write: vi.fn().mockReturnValue(true), end: vi.fn() };
      bridge.addSSEClient("sse-3", mockRes, ["job:all"]);

      bridge.emit("machine:status", "machine:all", { machine_id: "haas-vf2" });

      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it("closes all SSE clients on stop", () => {
      const mockRes = { write: vi.fn().mockReturnValue(true), end: vi.fn() };
      bridge.addSSEClient("sse-4", mockRes, ["system:all"]);
      bridge.start();
      bridge.stop();
      expect(mockRes.end).toHaveBeenCalledTimes(1);
      expect(bridge.stats().sse_clients).toBe(0);
    });
  });

  describe("stats", () => {
    it("reports accurate bridge statistics", () => {
      bridge.start();
      bridge.emit("notification", "system:all", { msg: "a" });
      bridge.emit("notification", "system:all", { msg: "b" });

      const stats = bridge.stats();
      expect(stats.running).toBe(true);
      expect(stats.channel_mappings).toBeGreaterThanOrEqual(10);
      expect(stats.events_forwarded).toBe(2);
      expect(stats.sse_clients).toBe(0);
    });
  });
});
