/**
 * HyperMillACConnectionManager — Automation Center COM/API Bridge Abstraction
 *
 * Manages the connection lifecycle between PRISM and hyperMILL's Automation
 * Center (AC).  In production, the AC is accessed via the COM/API bridge
 * exposed by HyperMillACBridgeEngine (E1144) on port 18365.
 * In CI/mock mode, all calls return synthetic responses without any network
 * activity — enabling full test coverage on machines without hyperMILL.
 *
 * Features:
 *   - Connection state tracking (disconnected → connecting → connected → error)
 *   - Retry logic with exponential backoff (3 attempts, base 500ms)
 *   - Configurable host/port via ACServerConfig
 *   - Mock mode for CI (returns connected=true, simulated actions)
 *   - Health check — /status probe with latency measurement
 *
 * Agent 18 finding: AC companion server missing — this manager wires the gap.
 *
 * @engine HyperMillACConnectionManager
 * @shortcode E1166
 * @dispatcher camDispatcher
 * @actions hypermill_ac_connect (already declared — now implemented here)
 * @milestone HM-REV-MS9/U-HMR47
 */

import {
  type ACServerConfig,
  buildACServerConfig,
  AC_SERVER_DEFAULT_PORT,
  AC_SERVER_BIND_HOST,
} from "./HyperMillACServerConfig.js";

// ─── Connection State ─────────────────────────────────────────────────────────

export type ACConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ACConnectionStatus {
  state: ACConnectionState;
  host: string;
  port: number;
  mockMode: boolean;
  sessionId: string | undefined;
  serverVersion: string | undefined;
  latencyMs: number | undefined;
  lastErrorMessage: string | undefined;
  connectedAt: number | undefined;    // Unix epoch ms
  attemptCount: number;
}

export interface ACConnectResult {
  connected: boolean;
  state: ACConnectionState;
  host: string;
  port: number;
  mockMode: boolean;
  sessionId: string | undefined;
  serverVersion: string | undefined;
  latencyMs: number | undefined;
  message: string;
  attempts: number;
}

// ─── Retry Configuration ──────────────────────────────────────────────────────

export interface ACRetryConfig {
  /** Maximum number of connection attempts (including the first). */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff. */
  baseDelayMs: number;
  /** Jitter factor [0, 1] applied to each delay. */
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: ACRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  jitterFactor: 0.2,
};

/**
 * Calculate the delay before the nth retry.
 * Formula: baseDelay * 2^(attempt-1) * (1 + jitter * random)
 *
 * @param attempt - 1-based attempt index (1 = first retry, i.e., after first failure).
 * @param config  - Retry configuration.
 * @returns Delay in milliseconds.
 */
export function calcRetryDelay(attempt: number, config: ACRetryConfig): number {
  const base = config.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = 1 + config.jitterFactor * Math.random();
  return Math.round(base * jitter);
}

// ─── Mock Response Helpers ────────────────────────────────────────────────────

/** Generate a deterministic mock session ID based on host:port. */
function mockSessionId(host: string, port: number): string {
  return `mock-ac-${host.replace(/\./g, "-")}-${port}-${Date.now().toString(36)}`;
}

// ─── HyperMillACConnectionManager ────────────────────────────────────────────

/**
 * HyperMillACConnectionManager
 *
 * Manages the PRISM → hyperMILL Automation Center connection.
 *
 * Usage:
 *   const mgr = new HyperMillACConnectionManager({ mockMode: true });
 *   const result = await mgr.connect();
 *   console.log(result.connected); // true (mock)
 *
 *   const mgr2 = new HyperMillACConnectionManager();
 *   const result2 = await mgr2.connect("localhost", 18365);
 *   // → attempts real HTTP connection with retry
 */
export class HyperMillACConnectionManager {
  private _config: ACServerConfig;
  private _retry: ACRetryConfig;
  private _state: ACConnectionState = "disconnected";
  private _sessionId: string | undefined;
  private _serverVersion: string | undefined;
  private _latencyMs: number | undefined;
  private _lastError: string | undefined;
  private _connectedAt: number | undefined;
  private _attemptCount = 0;

  constructor(
    configOverrides: Partial<ACServerConfig> = {},
    retryConfig: Partial<ACRetryConfig> = {}
  ) {
    this._config = buildACServerConfig(configOverrides);
    this._retry = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  // ── Public read-only properties ────────────────────────────────────────────

  get state(): ACConnectionState { return this._state; }
  get isConnected(): boolean { return this._state === "connected"; }
  get sessionId(): string | undefined { return this._sessionId; }
  get mockMode(): boolean { return this._config.mockMode; }

  // ── Status snapshot ────────────────────────────────────────────────────────

  /**
   * Return a snapshot of the current connection status.
   * Does not perform any network activity.
   */
  getStatus(): ACConnectionStatus {
    return {
      state:              this._state,
      host:               this._config.host,
      port:               this._config.port,
      mockMode:           this._config.mockMode,
      sessionId:          this._sessionId,
      serverVersion:      this._serverVersion,
      latencyMs:          this._latencyMs,
      lastErrorMessage:   this._lastError,
      connectedAt:        this._connectedAt,
      attemptCount:       this._attemptCount,
    };
  }

  // ── Mock connect ───────────────────────────────────────────────────────────

  private _connectMock(host: string, port: number): ACConnectResult {
    this._state = "connected";
    this._sessionId = mockSessionId(host, port);
    this._serverVersion = "mock-v33.0";
    this._latencyMs = 1;
    this._connectedAt = Date.now();
    this._attemptCount = 1;

    return {
      connected: true,
      state: "connected",
      host,
      port,
      mockMode: true,
      sessionId: this._sessionId,
      serverVersion: this._serverVersion,
      latencyMs: 1,
      message: `[MOCK] Connected to hyperMILL AC at ${host}:${port} (session: ${this._sessionId})`,
      attempts: 1,
    };
  }

  // ── Real connect (with retry) ──────────────────────────────────────────────

  private async _fetchStatus(host: string, port: number, timeoutMs: number): Promise<{
    ok: boolean;
    latencyMs: number;
    version?: string;
    sessionId?: string;
    error?: string;
  }> {
    const t0 = Date.now();
    const url = `http://${host}:${port}/status`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let fetchFn: typeof fetch;
      if (typeof globalThis.fetch === "function") {
        fetchFn = globalThis.fetch.bind(globalThis);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import("node-fetch" as any);
        fetchFn = (mod.default ?? mod) as unknown as typeof fetch;
      }

      const res = await fetchFn(url, {
        method: "GET",
        headers: { "X-PRISM-Client": "E1166" },
        signal: controller.signal as AbortSignal,
      });

      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        return { ok: false, latencyMs, error: `HTTP ${res.status}` };
      }

      let body: Record<string, unknown> = {};
      try {
        body = await res.json() as Record<string, unknown>;
      } catch { /* ignore parse error */ }

      return {
        ok: true,
        latencyMs,
        version:   String(body.version ?? body.server_version ?? "unknown"),
        sessionId: String(body.session_id ?? ""),
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - t0;
      const isAbort = (err as { name?: string })?.name === "AbortError";
      return {
        ok: false,
        latencyMs,
        error: isAbort ? `Timeout after ${timeoutMs}ms` : String((err as Error)?.message ?? err),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async _connectReal(host: string, port: number): Promise<ACConnectResult> {
    this._state = "connecting";
    let lastError = "";
    const maxAttempts = this._retry.maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this._attemptCount = attempt;
      const probe = await this._fetchStatus(host, port, this._config.timeoutMs);

      if (probe.ok) {
        this._state = "connected";
        this._sessionId = probe.sessionId || mockSessionId(host, port);
        this._serverVersion = probe.version;
        this._latencyMs = probe.latencyMs;
        this._connectedAt = Date.now();
        this._lastError = undefined;

        return {
          connected: true,
          state: "connected",
          host,
          port,
          mockMode: false,
          sessionId: this._sessionId,
          serverVersion: this._serverVersion,
          latencyMs: probe.latencyMs,
          message: `Connected to hyperMILL AC at ${host}:${port} after ${attempt} attempt(s)`,
          attempts: attempt,
        };
      }

      lastError = probe.error ?? "Unknown error";

      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        const delay = calcRetryDelay(attempt, this._retry);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    this._state = "error";
    this._lastError = lastError;

    return {
      connected: false,
      state: "error",
      host,
      port,
      mockMode: false,
      sessionId: undefined,
      serverVersion: undefined,
      latencyMs: undefined,
      message: `Failed to connect to hyperMILL AC at ${host}:${port} after ${maxAttempts} attempt(s). Last error: ${lastError}`,
      attempts: maxAttempts,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Connect to the hyperMILL Automation Center.
   *
   * In mock mode: returns connected=true immediately with no network activity.
   * In real mode: probes /status endpoint with exponential-backoff retry.
   *
   * @param host - Override host (default: config.host = "127.0.0.1").
   * @param port - Override port (default: config.port = 18365).
   * @returns ACConnectResult with connection details.
   */
  async connect(
    host: string = this._config.host,
    port: number = this._config.port
  ): Promise<ACConnectResult> {
    if (this._config.mockMode) {
      return this._connectMock(host, port);
    }
    return this._connectReal(host, port);
  }

  /**
   * Disconnect from the AC and reset connection state.
   *
   * @returns Object describing the result.
   */
  disconnect(): { disconnected: boolean; message: string } {
    const wasConnected = this._state === "connected";
    this._state = "disconnected";
    this._sessionId = undefined;
    this._serverVersion = undefined;
    this._latencyMs = undefined;
    this._connectedAt = undefined;
    this._lastError = undefined;
    this._attemptCount = 0;

    return {
      disconnected: true,
      message: wasConnected
        ? "Disconnected from hyperMILL AC."
        : "Connection was not active.",
    };
  }

  /**
   * Health check — probe /status without starting a new session.
   * Does NOT reset _connected state.
   *
   * @returns Object with alive flag and latency.
   */
  async healthCheck(): Promise<{
    alive: boolean;
    latencyMs: number | undefined;
    host: string;
    port: number;
    mockMode: boolean;
    message: string;
  }> {
    if (this._config.mockMode) {
      return {
        alive: true,
        latencyMs: 1,
        host: this._config.host,
        port: this._config.port,
        mockMode: true,
        message: "[MOCK] hyperMILL AC health check: OK",
      };
    }

    const probe = await this._fetchStatus(
      this._config.host,
      this._config.port,
      5_000
    );

    return {
      alive: probe.ok,
      latencyMs: probe.latencyMs,
      host: this._config.host,
      port: this._config.port,
      mockMode: false,
      message: probe.ok
        ? `hyperMILL AC is reachable at ${this._config.host}:${this._config.port} (${probe.latencyMs}ms)`
        : `hyperMILL AC not reachable: ${probe.error}`,
    };
  }
}

// ─── Singleton (mock mode for CI, real for production) ────────────────────────

/** Default production connection manager — uses loopback 127.0.0.1:18365. */
export const hyperMillACConnectionManager = new HyperMillACConnectionManager({
  host: AC_SERVER_BIND_HOST,
  port: AC_SERVER_DEFAULT_PORT,
  mockMode: false,
});

/** Mock connection manager for CI/test environments. */
export const hyperMillACConnectionManagerMock = new HyperMillACConnectionManager({
  host: AC_SERVER_BIND_HOST,
  port: AC_SERVER_DEFAULT_PORT,
  mockMode: true,
});
