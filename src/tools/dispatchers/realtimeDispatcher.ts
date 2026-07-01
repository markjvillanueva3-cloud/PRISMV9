/**
 * Real-Time Dispatcher — WebSocket MCP Tool Surface
 * Actions: ws_broadcast, ws_room_send, ws_unicast, ws_stats
 *
 * Exposes WebSocketEngine functionality through MCP tool interface,
 * enabling AI agents to send real-time messages to connected clients.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { webSocketEngine } from "../../engines/WebSocketEngine.js";
import type { WSEventType } from "../../engines/WebSocketEngine.js";
import { realtimeEventBridge } from "../../engines/RealtimeEventBridge.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_REALTIME_SCHEMAS } from "../../schemas/realtimeActionSchemas.js";

const ACTIONS = ["ws_broadcast", "ws_room_send", "ws_unicast", "ws_stats", "rt_bridge_stats", "rt_bridge_emit"] as const;

const EVENT_TYPES: WSEventType[] = [
  "machine:status", "machine:alarm",
  "job:progress", "job:complete", "job:error",
  "tool:wear", "tool:change",
  "safety:alert", "quote:update",
  "notification", "system:health",
];

export function registerRealtimeDispatcher(server: any): void {
  server.tool(
    "prism_realtime",
    `Real-time WebSocket messaging. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("WebSocket action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_realtime] Action: ${action}`);

      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_REALTIME_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for ${action}: ${validation.errors?.join(", ")}`, action, "prism_realtime");
      }

      try {
        switch (action) {
          case "ws_broadcast": {
            const type = (params.type ?? "notification") as WSEventType;
            if (!EVENT_TYPES.includes(type)) {
              return dispatcherError(`Invalid event type: ${type}. Valid: ${EVENT_TYPES.join(", ")}`, action, "prism_realtime");
            }
            const sent = webSocketEngine.broadcast({
              type,
              payload: params.payload ?? { message: params.message ?? "broadcast" },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "ws_broadcast", event_type: type, clients_sent: sent }) }] };
          }

          case "ws_room_send": {
            const room = params.room;
            if (!room) return dispatcherError("Missing required param: room", action, "prism_realtime");
            const type = (params.type ?? "notification") as WSEventType;
            if (!EVENT_TYPES.includes(type)) {
              return dispatcherError(`Invalid event type: ${type}. Valid: ${EVENT_TYPES.join(", ")}`, action, "prism_realtime");
            }
            const sent = webSocketEngine.roomSend(room, {
              type,
              payload: params.payload ?? { message: params.message ?? "room message" },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "ws_room_send", room, event_type: type, clients_sent: sent }) }] };
          }

          case "ws_unicast": {
            const target = params.target_id ?? params.client_id ?? params.user_id;
            if (!target) return dispatcherError("Missing required param: target_id (client ID or user ID)", action, "prism_realtime");
            const type = (params.type ?? "notification") as WSEventType;
            if (!EVENT_TYPES.includes(type)) {
              return dispatcherError(`Invalid event type: ${type}. Valid: ${EVENT_TYPES.join(", ")}`, action, "prism_realtime");
            }
            const sent = webSocketEngine.unicast(target, {
              type,
              payload: params.payload ?? { message: params.message ?? "direct message" },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "ws_unicast", target, event_type: type, delivered: sent }) }] };
          }

          case "ws_stats": {
            const stats = webSocketEngine.stats();
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "ws_stats", ...stats }) }] };
          }

          case "rt_bridge_stats": {
            const bridgeStats = realtimeEventBridge.stats();
            const wsStats = webSocketEngine.stats();
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "rt_bridge_stats", bridge: bridgeStats, websocket: wsStats }) }] };
          }

          case "rt_bridge_emit": {
            const type = (params.type ?? "notification") as WSEventType;
            if (!EVENT_TYPES.includes(type)) {
              return dispatcherError(`Invalid event type: ${type}. Valid: ${EVENT_TYPES.join(", ")}`, action, "prism_realtime");
            }
            const room = params.room as string | undefined;
            const payload = (params.payload ?? { message: params.message ?? "bridge emit" }) as Record<string, unknown>;
            const sent = room
              ? realtimeEventBridge.emit(type, room, payload)
              : realtimeEventBridge.broadcast(type, payload);
            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "rt_bridge_emit", event_type: type, room: room ?? "broadcast", clients_sent: sent }) }] };
          }

          default:
            return dispatcherError(`Unknown action: ${action}. Valid: ${ACTIONS.join(", ")}`, action, "prism_realtime");
        }
      } catch (err: any) {
        log.error(`[prism_realtime] Error in ${action}:`, err.message);
        return dispatcherError(err, action, "prism_realtime");
      }
    }
  );

  log.debug(`Registered: prism_realtime (${ACTIONS.length} actions)`);
}
