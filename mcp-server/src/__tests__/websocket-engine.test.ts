/**
 * Tests for WebSocketEngine — RT-MS0
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WebSocketEngine } from "../engines/WebSocketEngine.js";
import type { WSMessage } from "../engines/WebSocketEngine.js";

describe("WebSocketEngine", () => {
  let engine: WebSocketEngine;

  beforeEach(() => {
    engine = new WebSocketEngine();
  });

  it("exports singleton instance", async () => {
    const { webSocketEngine } = await import("../engines/WebSocketEngine.js");
    expect(webSocketEngine).toBeDefined();
    expect(webSocketEngine).toBeInstanceOf(WebSocketEngine);
  });

  it("stats returns zero when no connections", () => {
    const stats = engine.stats();
    expect(stats.connected_clients).toBe(0);
    expect(stats.authenticated_clients).toBe(0);
    expect(stats.total_messages).toBe(0);
    expect(stats.rooms).toEqual({});
  });

  it("broadcast returns 0 when no clients connected", () => {
    const sent = engine.broadcast({
      type: "notification",
      payload: { message: "test" },
    });
    expect(sent).toBe(0);
  });

  it("roomSend returns 0 for empty room", () => {
    const sent = engine.roomSend("machine:haas-vf2", {
      type: "machine:status",
      payload: { status: "running" },
    });
    expect(sent).toBe(0);
  });

  it("unicast returns false when client not found", () => {
    const result = engine.unicast("nonexistent", {
      type: "notification",
      payload: { message: "test" },
    });
    expect(result).toBe(false);
  });

  it("shutdown is safe when not attached", () => {
    expect(() => engine.shutdown()).not.toThrow();
  });

  it("WSMessage type covers all event types", () => {
    const msg: WSMessage = {
      type: "machine:status",
      room: "machine:haas-vf2",
      payload: { status: "running", spindle_rpm: 8000 },
      timestamp: new Date().toISOString(),
      sender: "system",
      id: "msg-001",
    };
    expect(msg.type).toBe("machine:status");
    expect(msg.room).toBe("machine:haas-vf2");
  });

  it("handles all defined event types", () => {
    const types: WSMessage["type"][] = [
      "machine:status", "machine:alarm",
      "job:progress", "job:complete", "job:error",
      "tool:wear", "tool:change",
      "safety:alert", "quote:update",
      "notification", "system:health",
      "ping", "pong",
      "subscribe", "unsubscribe", "error",
    ];
    expect(types.length).toBe(16);
    for (const t of types) {
      const msg: WSMessage = { type: t, payload: {}, timestamp: new Date().toISOString() };
      expect(msg.type).toBe(t);
    }
  });
});
