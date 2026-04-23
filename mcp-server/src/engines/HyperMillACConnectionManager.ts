/**
 * HyperMillACConnectionManager — Session & health for OPEN MIND AutomationCenter (AC).
 *
 * Thin connection wrapper used by HyperMILLAutomationBridge. In mock mode
 * (PRISM_CAD_MOCK=1 or mockMode:true), no network traffic is made and
 * connect()/disconnect() return deterministic results for tests.
 *
 * Real-mode behavior performs a lightweight TCP reachability probe to the AC
 * host:port. Full AC session handshake is the responsibility of the script
 * executor — this class owns only connection state.
 *
 * @module engines/HyperMillACConnectionManager
 * @shortcode E1305
 */
import { log } from "../utils/Logger.js";
import * as net from "node:net";

export interface ACConnectOptions {
  host?: string;
  port?: number;
  mockMode?: boolean;
  timeout_ms?: number;
}

export interface ACConnectResult {
  connected: boolean;
  message?: string;
  sessionId?: string;
  host: string;
  port: number;
}

export interface ACDisconnectResult {
  disconnected: boolean;
  message?: string;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18365;
const DEFAULT_TIMEOUT_MS = 2000;

export class HyperMillACConnectionManager {
  private readonly host: string;
  private readonly port: number;
  private readonly mockMode: boolean;
  private readonly timeout_ms: number;
  private sessionId: string | null = null;
  private lastError: string | null = null;

  constructor(opts: ACConnectOptions = {}) {
    this.host = opts.host ?? DEFAULT_HOST;
    this.port = opts.port ?? DEFAULT_PORT;
    this.mockMode = opts.mockMode ?? process.env.PRISM_CAD_MOCK === "1";
    this.timeout_ms = opts.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Open a session to the AC.
   * In mock mode returns a deterministic fake session.
   */
  async connect(): Promise<ACConnectResult> {
    if (this.mockMode) {
      this.sessionId = `mock-${Date.now()}`;
      log.info(`[HyperMillACConnection] MOCK connect → ${this.sessionId}`);
      return {
        connected: true,
        sessionId: this.sessionId,
        host: this.host,
        port: this.port,
      };
    }

    try {
      await this.probeTCP();
      this.sessionId = `ac-${Date.now()}`;
      return {
        connected: true,
        sessionId: this.sessionId,
        host: this.host,
        port: this.port,
      };
    } catch (err: any) {
      this.lastError = err.message;
      return {
        connected: false,
        message: err.message,
        host: this.host,
        port: this.port,
      };
    }
  }

  /**
   * Close the AC session.
   */
  disconnect(): ACDisconnectResult {
    if (!this.sessionId) {
      return { disconnected: true, message: "no active session" };
    }
    log.info(`[HyperMillACConnection] disconnect ${this.sessionId}`);
    this.sessionId = null;
    return { disconnected: true };
  }

  /**
   * True if a session is currently active.
   */
  isActive(): boolean {
    return this.sessionId !== null;
  }

  /**
   * Get the current session id (or null).
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Quick health check — in mock mode always healthy, otherwise re-probe.
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    if (this.mockMode) return { healthy: true };
    if (!this.sessionId) return { healthy: false, message: "no session" };
    try {
      await this.probeTCP();
      return { healthy: true };
    } catch (err: any) {
      return { healthy: false, message: err.message };
    }
  }

  private probeTCP(): Promise<void> {
    return new Promise((resolvePromise, rejectPromise) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        rejectPromise(new Error(`TCP probe to ${this.host}:${this.port} timed out`));
      }, this.timeout_ms);

      socket.once("connect", () => {
        clearTimeout(timer);
        socket.end();
        resolvePromise();
      });
      socket.once("error", (err) => {
        clearTimeout(timer);
        socket.destroy();
        rejectPromise(err);
      });
      socket.connect(this.port, this.host);
    });
  }
}

export const hyperMillACConnectionManager = new HyperMillACConnectionManager({
  mockMode: process.env.PRISM_CAD_MOCK === "1",
});
