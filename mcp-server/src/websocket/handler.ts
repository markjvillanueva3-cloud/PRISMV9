/**
 * PRISM MCP Server — WebSocket Handler
 * Real-time updates for machine status, SPC data, and calculation results
 */
import type { Server as HttpServer } from "http";
import { log } from "../utils/Logger.js";
import type { CallToolFn } from "../routes/index.js";

interface WsClient {
  id: string;
  ws: any;
  subscriptions: Set<string>;
  lastPing: number;
}

/** Available WebSocket channels */
export type WsChannel =
  | "machine-status"     // Real-time machine state updates
  | "spc-data"          // SPC measurement streaming
  | "calculation"       // Long-running calculation progress
  | "alerts"            // Safety/maintenance/quality alerts
  | "schedule"          // Schedule change notifications
  | "oee";              // OEE metric streaming

const CHANNELS: WsChannel[] = ["machine-status", "spc-data", "calculation", "alerts", "schedule", "oee"];

export class WebSocketHandler {
  private clients: Map<string, WsClient> = new Map();
  private wss: any = null;
  private callTool: CallToolFn;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(callTool: CallToolFn) {
    this.callTool = callTool;
  }

  /**
   * Attach WebSocket server to existing HTTP server
   */
  async attach(httpServer: HttpServer): Promise<void> {
    try {
      const { WebSocketServer } = await import("ws");
      this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });

      this.wss.on("connection", (ws: any) => {
        const clientId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const client: WsClient = { id: clientId, ws, subscriptions: new Set(), lastPing: Date.now() };
        this.clients.set(clientId, client);

        log.info(`[WS] Client connected: ${clientId} (${this.clients.size} total)`);

        ws.on("message", (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            this.handleMessage(client, msg);
          } catch {
            ws.send(JSON.stringify({ error: "Invalid JSON" }));
          }
        });

        ws.on("close", () => {
          this.clients.delete(clientId);
          log.info(`[WS] Client disconnected: ${clientId} (${this.clients.size} remaining)`);
        });

        ws.on("pong", () => { client.lastPing = Date.now(); });

        // Send welcome message with available channels
        ws.send(JSON.stringify({ type: "welcome", clientId, channels: CHANNELS }));
      });

      // Ping interval to detect stale connections
      this.pingInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, client] of this.clients) {
          if (now - client.lastPing > 60000) {
            client.ws.terminate();
            this.clients.delete(id);
          } else {
            client.ws.ping();
          }
        }
      }, 30000);

      log.info(`[WS] WebSocket server attached at /ws (${CHANNELS.length} channels)`);
    } catch {
      log.warn("[WS] ws package not available — WebSocket disabled");
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(client: WsClient, msg: any): Promise<void> {
    switch (msg.type) {
      case "subscribe":
        if (CHANNELS.includes(msg.channel)) {
          client.subscriptions.add(msg.channel);
          client.ws.send(JSON.stringify({ type: "subscribed", channel: msg.channel }));
        } else {
          client.ws.send(JSON.stringify({ error: `Unknown channel: ${msg.channel}`, channels: CHANNELS }));
        }
        break;

      case "unsubscribe":
        client.subscriptions.delete(msg.channel);
        client.ws.send(JSON.stringify({ type: "unsubscribed", channel: msg.channel }));
        break;

      case "calculate":
        // Delegate calculation to MCP tool and stream progress
        try {
          const result = await this.callTool(msg.tool || "prism_calc", msg.action || "speed_feed", msg.params || {});
          client.ws.send(JSON.stringify({ type: "result", requestId: msg.requestId, data: result }));
        } catch (e: any) {
          client.ws.send(JSON.stringify({ type: "error", requestId: msg.requestId, message: e.message }));
        }
        break;

      default:
        client.ws.send(JSON.stringify({ error: `Unknown message type: ${msg.type}` }));
    }
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  broadcast(channel: WsChannel, data: any): void {
    const msg = JSON.stringify({ type: "broadcast", channel, data, timestamp: Date.now() });
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel) && client.ws.readyState === 1) {
        client.ws.send(msg);
      }
    }
  }

  /**
   * Get connection count
   */
  get connectionCount(): number {
    return this.clients.size;
  }

  /**
   * Cleanup on shutdown
   */
  close(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    if (this.wss) this.wss.close();
  }
}
