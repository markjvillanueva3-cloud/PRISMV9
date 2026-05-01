/**
 * Tests for realtimeDispatcher — RT-MS1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WebSocketEngine before import
const mockBroadcast = vi.fn().mockReturnValue(0);
const mockRoomSend = vi.fn().mockReturnValue(0);
const mockUnicast = vi.fn().mockReturnValue(false);
const mockStats = vi.fn().mockReturnValue({
  connected_clients: 3,
  authenticated_clients: 2,
  rooms: { "machine:haas-vf2": 2, "job:12345": 1 },
  total_messages: 42,
  uptime_seconds: 600,
});

vi.mock("../engines/WebSocketEngine.js", () => ({
  webSocketEngine: {
    broadcast: mockBroadcast,
    roomSend: mockRoomSend,
    unicast: mockUnicast,
    stats: mockStats,
  },
}));

// Mock server registration
let registeredHandler: any;
const mockServer = {
  tool: (_name: string, _desc: string, _schema: any, handler: any) => {
    registeredHandler = handler;
  },
};

describe("realtimeDispatcher", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { registerRealtimeDispatcher } = await import("../tools/dispatchers/realtimeDispatcher.js");
    registerRealtimeDispatcher(mockServer);
  });

  it("registers the prism_realtime tool", () => {
    expect(registeredHandler).toBeDefined();
  });

  describe("ws_broadcast", () => {
    it("broadcasts a notification", async () => {
      const result = await registeredHandler({ action: "ws_broadcast", params: { type: "notification", payload: { message: "hello" } } });
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "notification",
        payload: { message: "hello" },
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.action).toBe("ws_broadcast");
      expect(data.clients_sent).toBe(0);
    });

    it("defaults to notification type", async () => {
      await registeredHandler({ action: "ws_broadcast", params: { message: "test" } });
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "notification",
        payload: { message: "test" },
      });
    });

    it("rejects invalid event type", async () => {
      const result = await registeredHandler({ action: "ws_broadcast", params: { type: "invalid:type" } });
      expect(result.isError).toBe(true);
    });
  });

  describe("ws_room_send", () => {
    it("sends to a room", async () => {
      await registeredHandler({ action: "ws_room_send", params: { room: "machine:haas-vf2", type: "machine:status", payload: { status: "running" } } });
      expect(mockRoomSend).toHaveBeenCalledWith("machine:haas-vf2", {
        type: "machine:status",
        payload: { status: "running" },
      });
    });

    it("rejects missing room", async () => {
      const result = await registeredHandler({ action: "ws_room_send", params: { type: "notification" } });
      expect(result.isError).toBe(true);
    });
  });

  describe("ws_unicast", () => {
    it("sends to a target", async () => {
      await registeredHandler({ action: "ws_unicast", params: { target_id: "ws-abc123", type: "notification", payload: { message: "hi" } } });
      expect(mockUnicast).toHaveBeenCalledWith("ws-abc123", {
        type: "notification",
        payload: { message: "hi" },
      });
    });

    it("accepts client_id alias", async () => {
      await registeredHandler({ action: "ws_unicast", params: { client_id: "ws-xyz", type: "notification" } });
      expect(mockUnicast).toHaveBeenCalledWith("ws-xyz", expect.any(Object));
    });

    it("accepts user_id alias", async () => {
      await registeredHandler({ action: "ws_unicast", params: { user_id: "user-1", type: "notification" } });
      expect(mockUnicast).toHaveBeenCalledWith("user-1", expect.any(Object));
    });

    it("rejects missing target", async () => {
      const result = await registeredHandler({ action: "ws_unicast", params: { type: "notification" } });
      expect(result.isError).toBe(true);
    });
  });

  describe("ws_stats", () => {
    it("returns connection statistics", async () => {
      const result = await registeredHandler({ action: "ws_stats", params: {} });
      const data = JSON.parse(result.content[0].text);
      expect(data.action).toBe("ws_stats");
      expect(data.connected_clients).toBe(3);
      expect(data.authenticated_clients).toBe(2);
      expect(data.rooms).toEqual({ "machine:haas-vf2": 2, "job:12345": 1 });
      expect(data.total_messages).toBe(42);
    });
  });
});
