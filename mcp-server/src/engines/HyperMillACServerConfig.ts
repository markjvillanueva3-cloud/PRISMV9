/**
 * HyperMillACServerConfig — Automation Center Companion HTTP Server Configuration
 *
 * Provides configuration for the PRISM-side AC companion HTTP server that
 * bridges MCP commands to hyperMILL's Automation Center API.
 *
 * Key design decisions:
 *   - Binds ONLY to 127.0.0.1 (loopback) — never 0.0.0.0 — preventing
 *     unintended network exposure on shop-floor machines.
 *   - Port 18365 — matches HyperMillACBridgeEngine (E1144) and AC default.
 *   - Routes: /status, /execute, /job-status, /extract, /optimize
 *   - CORS restricted to hyperCAD-S HTML panel origins.
 *   - Auth: loopback-only (no token needed for 127.0.0.1 clients).
 *
 * Agent 18 finding: AC companion server missing, port mismatch.
 * This module fixes the port and binding configuration.
 *
 * @engine HyperMillACServerConfig
 * @shortcode E1165
 * @milestone HM-REV-MS9/U-HMR46
 */

// ─── Port & Binding Constants ──────────────────────────────────────────────────

/** Default port for the AC companion HTTP server.
 *  Matches HyperMillACBridgeEngine (E1144) default port.
 *  Source: hyperMILL Automation Center HTTP API specification v33.0 */
export const AC_SERVER_DEFAULT_PORT = 18365;

/** Loopback-only binding — prevents network exposure on shop-floor machines. */
export const AC_SERVER_BIND_HOST = "127.0.0.1";

/** Default request timeout in milliseconds. */
export const AC_SERVER_DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum number of concurrent AC script executions. */
export const AC_SERVER_MAX_CONCURRENT = 4;

// ─── Route Definitions ────────────────────────────────────────────────────────

/** Named route paths served by the AC companion HTTP server. */
export const AC_ROUTES = {
  /** Health probe — returns { status: "ok", version, uptime_ms } */
  STATUS: "/status",
  /** Execute an AC Python script — POST { script, params, timeout_ms? } */
  EXECUTE: "/execute",
  /** Job status poll — GET /job-status?job_id=<id> */
  JOB_STATUS: "/job-status",
  /** Data extraction trigger — POST { databases: string[], output_dir: string } */
  EXTRACT: "/extract",
  /** PPP optimization trigger — POST { nc_content, controller, material } */
  OPTIMIZE: "/optimize",
} as const;

export type ACRoute = typeof AC_ROUTES[keyof typeof AC_ROUTES];

// ─── CORS Configuration ───────────────────────────────────────────────────────

/**
 * CORS configuration for hyperCAD-S HTML panel origins.
 *
 * hyperCAD-S renders HTML panels from local file:// URIs and
 * from its bundled dev server at localhost:3000.
 * All other origins are blocked.
 */
export interface ACCorsConfig {
  /** Allowed origins for CORS. Only hyperCAD-S panel origins. */
  allowedOrigins: readonly string[];
  /** Allowed HTTP methods. */
  allowedMethods: readonly string[];
  /** Allowed headers for API calls. */
  allowedHeaders: readonly string[];
  /** Whether preflight requests are cached and for how long (seconds). */
  maxAgeSecs: number;
}

export const DEFAULT_AC_CORS_CONFIG: ACCorsConfig = {
  allowedOrigins: [
    "http://localhost:3000",         // hyperCAD-S dev server
    "http://127.0.0.1:3000",         // hyperCAD-S dev server (loopback)
    "null",                          // file:// origin (HTML panels)
  ],
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-PRISM-Client", "X-AC-Session"],
  maxAgeSecs: 600,
};

// ─── Full Server Configuration ────────────────────────────────────────────────

/**
 * Complete configuration for the AC companion HTTP server.
 * All fields have safe defaults — callers override only what they need.
 */
export interface ACServerConfig {
  /**
   * Host to bind to.
   * MUST be "127.0.0.1" in production — never "0.0.0.0".
   * @default "127.0.0.1"
   */
  host: string;

  /**
   * TCP port to listen on.
   * @default 18365
   */
  port: number;

  /**
   * Request timeout in milliseconds.
   * Applies to AC Python script execution.
   * @default 30000
   */
  timeoutMs: number;

  /**
   * Maximum concurrent script executions.
   * Prevents overloading the hyperMILL AC COM interface.
   * @default 4
   */
  maxConcurrent: number;

  /** CORS policy for HTML panel clients. */
  cors: ACCorsConfig;

  /**
   * Whether the server operates in mock/CI mode.
   * In mock mode, AC actions return synthetic responses without
   * contacting the real hyperMILL Automation Center.
   * @default false
   */
  mockMode: boolean;

  /**
   * Path to write access logs.
   * Null = no file logging (stderr only).
   */
  accessLogPath: string | null;
}

/**
 * Build an ACServerConfig with sensible defaults.
 *
 * @param overrides - Partial config to override defaults.
 * @returns Fully-populated ACServerConfig.
 */
export function buildACServerConfig(
  overrides: Partial<ACServerConfig> = {}
): ACServerConfig {
  return {
    host:          overrides.host          ?? AC_SERVER_BIND_HOST,
    port:          overrides.port          ?? AC_SERVER_DEFAULT_PORT,
    timeoutMs:     overrides.timeoutMs     ?? AC_SERVER_DEFAULT_TIMEOUT_MS,
    maxConcurrent: overrides.maxConcurrent ?? AC_SERVER_MAX_CONCURRENT,
    cors:          overrides.cors          ?? DEFAULT_AC_CORS_CONFIG,
    mockMode:      overrides.mockMode      ?? false,
    accessLogPath: overrides.accessLogPath ?? null,
  };
}

/**
 * Validate an ACServerConfig and return a list of validation errors.
 * An empty array means the config is valid.
 *
 * @param config - Config to validate.
 * @returns Array of error strings (empty = valid).
 */
export function validateACServerConfig(config: ACServerConfig): string[] {
  const errors: string[] = [];

  if (config.host !== "127.0.0.1" && config.host !== "localhost") {
    errors.push(
      `Security violation: host must be "127.0.0.1" (loopback-only). ` +
      `Got "${config.host}". The AC companion server must never be exposed to the network.`
    );
  }

  if (config.port < 1024 || config.port > 65535) {
    errors.push(`Port ${config.port} is outside the valid range [1024, 65535].`);
  }

  if (config.timeoutMs < 1000 || config.timeoutMs > 300_000) {
    errors.push(
      `timeoutMs ${config.timeoutMs} is outside the valid range [1000, 300000].`
    );
  }

  if (config.maxConcurrent < 1 || config.maxConcurrent > 16) {
    errors.push(`maxConcurrent ${config.maxConcurrent} must be between 1 and 16.`);
  }

  return errors;
}

/**
 * Return a human-readable summary of the server config.
 * Used for log startup messages.
 */
export function describeACServerConfig(config: ACServerConfig): string {
  const routes = Object.values(AC_ROUTES).join(", ");
  return [
    `AC Companion Server:`,
    `  Bind:        ${config.host}:${config.port}`,
    `  Timeout:     ${config.timeoutMs}ms`,
    `  Concurrent:  ${config.maxConcurrent} max`,
    `  Mock mode:   ${config.mockMode}`,
    `  Routes:      ${routes}`,
    `  CORS origins: ${config.cors.allowedOrigins.join(", ")}`,
  ].join("\n");
}

// ─── Singleton default config ─────────────────────────────────────────────────

/** Default production config — use buildACServerConfig() to customise. */
export const DEFAULT_AC_SERVER_CONFIG = buildACServerConfig();
