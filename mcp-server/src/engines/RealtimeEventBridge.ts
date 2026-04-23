/**
 * RealtimeEventBridge — Connects EventBus to WebSocket channels
 *
 * Subscribes to internal EventBus events and pushes them to WebSocket rooms
 * so connected frontend clients receive real-time updates from backend operations.
 *
 * Channel mappings:
 *   machine:all   ← machine:status, machine:alarm events
 *   job:all       ← job:progress, job:complete, job:error events
 *   tool:all      ← tool:wear, tool:change events
 *   safety:all    ← safety:alert events
 *   quote:all     ← quote:update events
 *   system:all    ← system:health, notification events
 *
 * Also supports per-entity rooms: machine:{id}, job:{id}, etc.
 *
 * Dispatcher: realtimeDispatcher (ws_broadcast, ws_room_send, ws_unicast, ws_stats)
 */
import { eventBus, type PrismEvent } from "./EventBus.js";
import { webSocketEngine, type WSEventType } from "./WebSocketEngine.js";
import { log } from "../utils/Logger.js";

// ── Channel Mapping ──────────────────────────────────────────────────

interface ChannelMapping {
  /** EventBus pattern to subscribe to (supports wildcards) */
  busPattern: string;
  /** WebSocket room to broadcast into */
  wsRoom: string;
  /** WSEventType to send */
  wsEventType: WSEventType;
  /** Extract entity-specific room from event payload (optional) */
  entityRoomFn?: (payload: Record<string, unknown>) => string | null;
}

const CHANNEL_MAPPINGS: ChannelMapping[] = [
  // Machine events
  {
    busPattern: "machine.status.*",
    wsRoom: "machine:all",
    wsEventType: "machine:status",
    entityRoomFn: (p) => p.machine_id ? `machine:${p.machine_id}` : null,
  },
  {
    busPattern: "machine.alarm.*",
    wsRoom: "machine:all",
    wsEventType: "machine:alarm",
    entityRoomFn: (p) => p.machine_id ? `machine:${p.machine_id}` : null,
  },
  // Job events
  {
    busPattern: "task.started",
    wsRoom: "job:all",
    wsEventType: "job:progress",
    entityRoomFn: (p) => p.job_id ? `job:${p.job_id}` : null,
  },
  {
    busPattern: "task.completed",
    wsRoom: "job:all",
    wsEventType: "job:complete",
    entityRoomFn: (p) => p.job_id ? `job:${p.job_id}` : null,
  },
  {
    busPattern: "task.failed",
    wsRoom: "job:all",
    wsEventType: "job:error",
    entityRoomFn: (p) => p.job_id ? `job:${p.job_id}` : null,
  },
  {
    busPattern: "calculation.completed",
    wsRoom: "job:all",
    wsEventType: "job:progress",
    entityRoomFn: (p) => p.job_id ? `job:${p.job_id}` : null,
  },
  // Tool events
  {
    busPattern: "tool.wear.*",
    wsRoom: "tool:all",
    wsEventType: "tool:wear",
    entityRoomFn: (p) => p.tool_id ? `tool:${p.tool_id}` : null,
  },
  {
    busPattern: "tool.change.*",
    wsRoom: "tool:all",
    wsEventType: "tool:change",
    entityRoomFn: (p) => p.tool_id ? `tool:${p.tool_id}` : null,
  },
  // Safety events
  {
    busPattern: "quality.gate.*",
    wsRoom: "safety:all",
    wsEventType: "safety:alert",
  },
  {
    busPattern: "system.warning",
    wsRoom: "safety:all",
    wsEventType: "safety:alert",
  },
  // Quote events
  {
    busPattern: "quote.*",
    wsRoom: "quote:all",
    wsEventType: "quote:update",
    entityRoomFn: (p) => p.quote_id ? `quote:${p.quote_id}` : null,
  },
  // System health
  {
    busPattern: "system.startup",
    wsRoom: "system:all",
    wsEventType: "system:health",
  },
  {
    busPattern: "system.shutdown",
    wsRoom: "system:all",
    wsEventType: "system:health",
  },
  {
    busPattern: "system.error",
    wsRoom: "system:all",
    wsEventType: "system:health",
  },
  // Data updates → system notification
  {
    busPattern: "data.updated",
    wsRoom: "system:all",
    wsEventType: "notification",
  },
];

// ── SSE Connection Manager ───────────────────────────────────────────

export interface SSEClient {
  id: string;
  res: { write: (data: string) => boolean; end: () => void };
  channels: Set<string>;
  connectedAt: number;
}

// ── Bridge Engine ────────────────────────────────────────────────────

export class RealtimeEventBridge {
  private subscriptionIds: string[] = [];
  private running = false;
  private eventsSent = 0;
  private sseClients = new Map<string, SSEClient>();

  /**
   * Start the bridge — subscribe to EventBus and forward to WebSocket.
   * Call once at server startup, after WebSocketEngine.attach().
   */
  start(): void {
    if (this.running) {
      log.warn("[RealtimeEventBridge] Already running");
      return;
    }

    for (const mapping of CHANNEL_MAPPINGS) {
      const subId = eventBus.subscribe(mapping.busPattern, (event: PrismEvent) => {
        this.forwardToWebSocket(event, mapping);
      });
      this.subscriptionIds.push(subId);
    }

    this.running = true;
    log.info(`[RealtimeEventBridge] Started — ${CHANNEL_MAPPINGS.length} channel mappings active`);
  }

  /**
   * Stop the bridge — unsubscribe all EventBus listeners.
   */
  stop(): void {
    for (const subId of this.subscriptionIds) {
      eventBus.unsubscribe(subId);
    }
    this.subscriptionIds = [];
    this.running = false;

    // Close all SSE connections
    for (const client of this.sseClients.values()) {
      client.res.end();
    }
    this.sseClients.clear();

    log.info("[RealtimeEventBridge] Stopped");
  }

  /**
   * Emit a typed event into the bridge, bypassing EventBus.
   * Use for direct real-time pushes from route handlers (e.g., SSE progress).
   */
  emit(wsEventType: WSEventType, room: string, payload: Record<string, unknown>): number {
    const wsSent = webSocketEngine.roomSend(room, { type: wsEventType, payload });
    this.sendToSSEClients(room, wsEventType, payload);
    this.eventsSent++;
    return wsSent;
  }

  /**
   * Broadcast to all WebSocket clients and SSE streams.
   */
  broadcast(wsEventType: WSEventType, payload: Record<string, unknown>): number {
    const wsSent = webSocketEngine.broadcast({ type: wsEventType, payload });
    // SSE broadcast goes to all clients regardless of channel
    for (const client of this.sseClients.values()) {
      this.writeSSE(client, wsEventType, payload);
    }
    this.eventsSent++;
    return wsSent;
  }

  // ── SSE Client Management ──────────────────────────────────────────

  /**
   * Register an SSE client connection.
   * @param id Unique client ID
   * @param res Express response object configured for SSE
   * @param channels Channels to subscribe to (e.g., ["machine:all", "job:all"])
   */
  addSSEClient(id: string, res: SSEClient["res"], channels: string[] = []): void {
    this.sseClients.set(id, {
      id,
      res,
      channels: new Set(channels.length > 0 ? channels : ["system:all"]),
      connectedAt: Date.now(),
    });
    log.info(`[RealtimeEventBridge] SSE client connected: ${id} channels=${channels.join(",") || "system:all"}`);
  }

  /**
   * Remove an SSE client (on disconnect).
   */
  removeSSEClient(id: string): void {
    this.sseClients.delete(id);
  }

  // ── Stats ──────────────────────────────────────────────────────────

  stats(): {
    running: boolean;
    channel_mappings: number;
    subscriptions: number;
    events_forwarded: number;
    sse_clients: number;
  } {
    return {
      running: this.running,
      channel_mappings: CHANNEL_MAPPINGS.length,
      subscriptions: this.subscriptionIds.length,
      events_forwarded: this.eventsSent,
      sse_clients: this.sseClients.size,
    };
  }

  // ── Private ────────────────────────────────────────────────────────

  private forwardToWebSocket(event: PrismEvent, mapping: ChannelMapping): void {
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload as Record<string, unknown>
      : { data: event.payload };

    // Enrich payload with event metadata
    const enrichedPayload = {
      ...payload,
      _event_id: event.id,
      _event_type: event.type,
      _source: event.source,
      _timestamp: event.timestamp.toISOString(),
    };

    // Send to the broad room (e.g., "machine:all")
    webSocketEngine.roomSend(mapping.wsRoom, {
      type: mapping.wsEventType,
      payload: enrichedPayload,
    });

    // Also send to entity-specific room if applicable
    if (mapping.entityRoomFn) {
      const entityRoom = mapping.entityRoomFn(payload);
      if (entityRoom && entityRoom !== mapping.wsRoom) {
        webSocketEngine.roomSend(entityRoom, {
          type: mapping.wsEventType,
          payload: enrichedPayload,
        });
      }
    }

    // Forward to SSE clients subscribed to this room
    this.sendToSSEClients(mapping.wsRoom, mapping.wsEventType, enrichedPayload);

    this.eventsSent++;
    log.debug(`[RealtimeEventBridge] Forwarded ${event.type} → WS room ${mapping.wsRoom} as ${mapping.wsEventType}`);
  }

  private sendToSSEClients(room: string, eventType: WSEventType, payload: Record<string, unknown>): void {
    for (const client of this.sseClients.values()) {
      if (client.channels.has(room) || client.channels.has("*")) {
        this.writeSSE(client, eventType, payload);
      }
    }
  }

  private writeSSE(client: SSEClient, eventType: string, payload: Record<string, unknown>): void {
    try {
      const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
      client.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
    } catch {
      // Client disconnected — will be cleaned up by close handler
      this.sseClients.delete(client.id);
    }
  }
}

export const realtimeEventBridge = new RealtimeEventBridge();
