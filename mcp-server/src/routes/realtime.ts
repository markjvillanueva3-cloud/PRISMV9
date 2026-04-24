/**
 * Realtime Route — SSE + bridge status endpoints
 *
 * GET  /api/v1/realtime/stream   — Server-Sent Events stream (channels via ?channels=machine:all,job:all)
 * POST /api/v1/realtime/emit     — Push an event into the bridge (for testing / orchestration)
 * GET  /api/v1/realtime/stats    — Bridge + WebSocket statistics
 */
import { Router } from "express";
import { realtimeEventBridge } from "../engines/RealtimeEventBridge.js";
import { webSocketEngine, type WSEventType } from "../engines/WebSocketEngine.js";
import { log } from "../utils/Logger.js";

const VALID_EVENT_TYPES: WSEventType[] = [
  "machine:status", "machine:alarm",
  "job:progress", "job:complete", "job:error",
  "tool:wear", "tool:change",
  "safety:alert", "quote:update",
  "notification", "system:health",
];

export function createRealtimeRouter(): Router {
  const router = Router();

  /**
   * GET /stream — Server-Sent Events
   * Query params:
   *   channels — comma-separated room names (default: "system:all")
   */
  router.get("/stream", (req, res) => {
    const channelParam = (req.query.channels as string) || "system:all";
    const channels = channelParam.split(",").map(c => c.trim()).filter(Boolean);
    const clientId = `sse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Configure SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",  // Disable nginx buffering
    });

    // Send initial connection event
    const welcome = JSON.stringify({
      type: "system:health",
      payload: { status: "connected", client_id: clientId, channels },
      timestamp: new Date().toISOString(),
    });
    res.write(`event: system:health\ndata: ${welcome}\n\n`);

    // Register with the bridge
    realtimeEventBridge.addSSEClient(clientId, res, channels);

    // Keep-alive every 25 seconds (prevents proxy timeouts)
    const keepAlive = setInterval(() => {
      res.write(`:keepalive ${new Date().toISOString()}\n\n`);
    }, 25_000);

    // Clean up on disconnect
    req.on("close", () => {
      clearInterval(keepAlive);
      realtimeEventBridge.removeSSEClient(clientId);
      log.info(`[SSE] Client disconnected: ${clientId}`);
    });
  });

  /**
   * POST /emit — Push an event through the bridge
   * Body: { type: WSEventType, room: string, payload: object }
   */
  router.post("/emit", (req, res) => {
    const { type, room, payload } = req.body ?? {};

    if (!type || !VALID_EVENT_TYPES.includes(type)) {
      res.status(400).json({
        ok: false,
        error: `Invalid event type. Valid: ${VALID_EVENT_TYPES.join(", ")}`,
      });
      return;
    }

    const eventPayload = typeof payload === "object" && payload !== null ? payload : {};

    let sent: number;
    if (room) {
      sent = realtimeEventBridge.emit(type, room, eventPayload);
    } else {
      sent = realtimeEventBridge.broadcast(type, eventPayload);
    }

    res.json({ ok: true, type, room: room || "broadcast", clients_sent: sent });
  });

  /**
   * GET /stats — Bridge + WebSocket statistics
   */
  router.get("/stats", (_req, res) => {
    const bridgeStats = realtimeEventBridge.stats();
    const wsStats = webSocketEngine.stats();

    res.json({
      ok: true,
      bridge: bridgeStats,
      websocket: wsStats,
    });
  });

  return router;
}
