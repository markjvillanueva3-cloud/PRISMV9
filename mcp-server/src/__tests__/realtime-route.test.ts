/**
 * Tests for realtime route — M-3-2-RT
 * Verifies SSE endpoint, emit endpoint, and stats endpoint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock RealtimeEventBridge
const mockEmit = vi.fn().mockReturnValue(2);
const mockBroadcast = vi.fn().mockReturnValue(3);
const mockAddSSEClient = vi.fn();
const mockRemoveSSEClient = vi.fn();
const mockStats = vi.fn().mockReturnValue({
  running: true,
  channel_mappings: 15,
  subscriptions: 15,
  events_forwarded: 42,
  sse_clients: 1,
});

vi.mock("../engines/RealtimeEventBridge.js", () => ({
  realtimeEventBridge: {
    emit: mockEmit,
    broadcast: mockBroadcast,
    addSSEClient: mockAddSSEClient,
    removeSSEClient: mockRemoveSSEClient,
    stats: mockStats,
  },
}));

// Mock WebSocketEngine
vi.mock("../engines/WebSocketEngine.js", () => ({
  webSocketEngine: {
    stats: vi.fn().mockReturnValue({
      connected_clients: 3,
      authenticated_clients: 2,
      rooms: {},
      total_messages: 100,
      uptime_seconds: 600,
    }),
  },
}));

describe("realtime route", () => {
  let createRealtimeRouter: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../routes/realtime.js");
    createRealtimeRouter = mod.createRealtimeRouter;
  });

  it("exports createRealtimeRouter function", () => {
    expect(typeof createRealtimeRouter).toBe("function");
  });

  it("creates a router with 3 routes", () => {
    const router = createRealtimeRouter();
    // Express Router has a stack of layers
    const routes = router.stack?.filter((layer: any) => layer.route) ?? [];
    expect(routes.length).toBe(3);
  });

  describe("POST /emit integration", () => {
    it("calls bridge.emit when room is provided", async () => {
      const router = createRealtimeRouter();
      const emitRoute = router.stack?.find(
        (layer: any) => layer.route?.path === "/emit" && layer.route?.methods?.post
      );
      expect(emitRoute).toBeDefined();

      // Simulate handler call
      const req = { body: { type: "notification", room: "system:all", payload: { msg: "test" } } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await emitRoute.route.stack[0].handle(req, res);

      expect(mockEmit).toHaveBeenCalledWith("notification", "system:all", { msg: "test" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, clients_sent: 2 }));
    });

    it("calls bridge.broadcast when no room", async () => {
      const router = createRealtimeRouter();
      const emitRoute = router.stack?.find(
        (layer: any) => layer.route?.path === "/emit" && layer.route?.methods?.post
      );

      const req = { body: { type: "system:health", payload: { status: "ok" } } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await emitRoute.route.stack[0].handle(req, res);

      expect(mockBroadcast).toHaveBeenCalledWith("system:health", { status: "ok" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, room: "broadcast" }));
    });

    it("rejects invalid event type", async () => {
      const router = createRealtimeRouter();
      const emitRoute = router.stack?.find(
        (layer: any) => layer.route?.path === "/emit" && layer.route?.methods?.post
      );

      const req = { body: { type: "invalid:bad" } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await emitRoute.route.stack[0].handle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    });
  });

  describe("GET /stats integration", () => {
    it("returns bridge and websocket stats", async () => {
      const router = createRealtimeRouter();
      const statsRoute = router.stack?.find(
        (layer: any) => layer.route?.path === "/stats" && layer.route?.methods?.get
      );
      expect(statsRoute).toBeDefined();

      const req = {};
      const res = { json: vi.fn() };
      await statsRoute.route.stack[0].handle(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        bridge: expect.objectContaining({ running: true, events_forwarded: 42 }),
        websocket: expect.objectContaining({ connected_clients: 3 }),
      }));
    });
  });
});
