/**
 * PRISM WebSocket Engine — Real-Time Communication Infrastructure
 *
 * Provides WebSocket server alongside Express HTTP, with:
 * - JWT-authenticated connections
 * - Heartbeat/ping-pong keep-alive
 * - Room-based subscriptions (job, machine, user channels)
 * - Typed message schema with event routing
 * - Broadcast, room-cast, and unicast messaging
 *
 * Dispatcher: realtimeDispatcher (ws_broadcast, ws_room_send, ws_stats)
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HTTPServer } from "http";
import { authEngine } from "./AuthEngine.js";
import { log } from "../utils/Logger.js";

// ── Message Schema (U04) ──────────────────────────────────────────

export type WSEventType =
  | "machine:status"      // Machine state change
  | "machine:alarm"       // Machine alarm triggered
  | "job:progress"        // Job progress update
  | "job:complete"        // Job completed
  | "job:error"           // Job error
  | "tool:wear"           // Tool wear update
  | "tool:change"         // Tool change event
  | "safety:alert"        // Safety score change
  | "quote:update"        // Quote status change
  | "notification"        // General notification
  | "system:health"       // System health update
  | "ping"                // Heartbeat ping
  | "pong"                // Heartbeat pong
  | "subscribe"           // Client subscribes to room
  | "unsubscribe"         // Client unsubscribes from room
  | "error";              // Error message

export interface WSMessage {
  type: WSEventType;
  room?: string;          // Target room (e.g., "machine:haas-vf2", "job:12345")
  payload: Record<string, unknown>;
  timestamp: string;
  sender?: string;        // User ID of sender (set by server)
  id?: string;            // Message ID for dedup
}

export interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  roles: string[];
  rooms: Set<string>;
  lastPing: number;
  connectedAt: number;
  ip: string;
}

// ── WebSocket Engine (U01-U03) ────────────────────────────────────

export class WebSocketEngine {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WSClient>();
  private rooms = new Map<string, Set<string>>();  // room → client IDs
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageCount = 0;
  private startTime = 0;

  private readonly HEARTBEAT_INTERVAL_MS = 30_000;
  private readonly HEARTBEAT_TIMEOUT_MS = 45_000;
  private readonly MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB

  /**
   * Attach WebSocket server to an existing HTTP server.
   * Call this after Express app.listen().
   */
  attach(httpServer: HTTPServer): void {
    if (this.wss) {
      log.warn("[WS] WebSocket server already attached");
      return;
    }

    this.wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
    });
    this.startTime = Date.now();

    this.// @ts-ignore - WebSocket callback types
    wss.on("connection", (ws: any, req: { socket?: { remoteAddress?: string }; url?: string; headers?: { host?: string } }) => {
      const ip = (req.socket?.remoteAddress ?? "unknown").replace("::ffff:", "");
      const clientId = this._generateId();

      // Parse auth token from query string or first message
      const url = new URL(req.url ?? "/", `http://${req.headers?.host ?? "localhost"}`);
      const token = url.searchParams.get("token");

      const client: WSClient = {
        id: clientId,
        ws,
        roles: [],
        rooms: new Set(),
        lastPing: Date.now(),
        connectedAt: Date.now(),
        ip,
      };

      // Authenticate if token provided
      if (token) {
        const validation = authEngine.validateToken(token);
        if (validation.valid) {
          client.userId = validation.user_id;
          client.roles = validation.roles ?? [];
        } else {
          ws.close(4001, "Invalid token");
          return;
        }
      }

      this.clients.set(clientId, client);
      log.info(`[WS] Client connected: ${clientId} user=${client.userId ?? "anon"} ip=${ip}`);

      // Send welcome message
      this._send(client, {
        type: "system:health",
        payload: { status: "connected", client_id: clientId, server_time: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });

      ws.on("message", (data: Buffer | string) => this._handleMessage(client, data));
      ws.on("close", () => this._handleDisconnect(client));
      ws.on("error", (err: Error) => log.error(`[WS] Client error ${clientId}:`, err.message));
      ws.on("pong", () => { client.lastPing = Date.now(); });
    });

    // Start heartbeat checker
    this.heartbeatInterval = setInterval(() => this._checkHeartbeats(), this.HEARTBEAT_INTERVAL_MS);

    log.info("[WS] WebSocket server attached on /ws");
  }

  /**
   * Broadcast message to all connected clients.
   */
  broadcast(message: Omit<WSMessage, "timestamp">): number {
    const msg: WSMessage = { ...message, timestamp: new Date().toISOString() };
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this._send(client, msg);
        sent++;
      }
    }
    this.messageCount++;
    return sent;
  }

  /**
   * Send message to all clients in a specific room.
   */
  roomSend(room: string, message: Omit<WSMessage, "timestamp" | "room">): number {
    const clientIds = this.rooms.get(room);
    if (!clientIds || clientIds.size === 0) return 0;

    const msg: WSMessage = { ...message, room, timestamp: new Date().toISOString() };
    let sent = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this._send(client, msg);
        sent++;
      }
    }
    this.messageCount++;
    return sent;
  }

  /**
   * Send message to a specific client by ID or user ID.
   */
  unicast(targetId: string, message: Omit<WSMessage, "timestamp">): boolean {
    // Try by client ID first, then by user ID
    let client = this.clients.get(targetId);
    if (!client) {
      for (const c of this.clients.values()) {
        if (c.userId === targetId) { client = c; break; }
      }
    }
    if (!client || client.ws.readyState !== WebSocket.OPEN) return false;
    this._send(client, { ...message, timestamp: new Date().toISOString() });
    this.messageCount++;
    return true;
  }

  /**
   * Get connection statistics.
   */
  stats(): {
    connected_clients: number;
    authenticated_clients: number;
    rooms: Record<string, number>;
    total_messages: number;
    uptime_seconds: number;
  } {
    const authed = [...this.clients.values()].filter(c => c.userId).length;
    const roomStats: Record<string, number> = {};
    for (const [room, members] of this.rooms) {
      roomStats[room] = members.size;
    }
    return {
      connected_clients: this.clients.size,
      authenticated_clients: authed,
      rooms: roomStats,
      total_messages: this.messageCount,
      uptime_seconds: this.wss ? Math.round((Date.now() - this.startTime) / 1000) : 0,
    };
  }

  /**
   * Graceful shutdown — close all connections.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.rooms.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    log.info("[WS] WebSocket server shut down");
  }

  // ── Private Methods ─────────────────────────────────────────────

  private _handleMessage(client: WSClient, data: unknown): void {
    let msg: WSMessage;
    try {
      msg = JSON.parse(String(data));
    } catch {
      this._send(client, {
        type: "error",
        payload: { message: "Invalid JSON" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    client.lastPing = Date.now();

    switch (msg.type) {
      case "ping":
        this._send(client, { type: "pong", payload: {}, timestamp: new Date().toISOString() });
        break;

      case "subscribe":
        this._subscribe(client, msg.room ?? String(msg.payload.room ?? ""));
        break;

      case "unsubscribe":
        this._unsubscribe(client, msg.room ?? String(msg.payload.room ?? ""));
        break;

      default:
        // Forward to room if specified, otherwise ignore
        if (msg.room) {
          msg.sender = client.userId;
          this.roomSend(msg.room, msg);
        }
        break;
    }
  }

  private _subscribe(client: WSClient, room: string): void {
    if (!room) return;

    client.rooms.add(room);
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client.id);

    log.info(`[WS] Client ${client.id} subscribed to room: ${room}`);
    this._send(client, {
      type: "notification",
      payload: { message: `Subscribed to ${room}`, room },
      timestamp: new Date().toISOString(),
    });
  }

  private _unsubscribe(client: WSClient, room: string): void {
    if (!room) return;

    client.rooms.delete(room);
    const roomSet = this.rooms.get(room);
    if (roomSet) {
      roomSet.delete(client.id);
      if (roomSet.size === 0) this.rooms.delete(room);
    }

    log.info(`[WS] Client ${client.id} unsubscribed from room: ${room}`);
  }

  private _handleDisconnect(client: WSClient): void {
    // Remove from all rooms
    for (const room of client.rooms) {
      const roomSet = this.rooms.get(room);
      if (roomSet) {
        roomSet.delete(client.id);
        if (roomSet.size === 0) this.rooms.delete(room);
      }
    }
    this.clients.delete(client.id);
    log.info(`[WS] Client disconnected: ${client.id} user=${client.userId ?? "anon"}`);
  }

  private _checkHeartbeats(): void {
    const now = Date.now();
    for (const client of this.clients.values()) {
      if (now - client.lastPing > this.HEARTBEAT_TIMEOUT_MS) {
        log.warn(`[WS] Client ${client.id} timed out (no heartbeat)`);
        client.ws.terminate();
        this._handleDisconnect(client);
      } else if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }

  private _send(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private _generateId(): string {
    return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const webSocketEngine = new WebSocketEngine();
