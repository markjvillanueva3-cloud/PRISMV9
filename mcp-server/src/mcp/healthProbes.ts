/**
 * PRISM Health Probes — PROD-MS2 P2-U05
 *
 * Kubernetes-compatible health check endpoints:
 * - /health — overall system health with component status
 * - /ready — readiness probe (are dependencies loaded?)
 * - /live — liveness probe (is process alive?)
 *
 * @module mcp/healthProbes
 */

import type { Request, Response } from "express";

// Track startup state
let serverReady = false;
let startTime = Date.now();

/** Mark server as ready (call after initialization) */
export function markReady(): void {
  serverReady = true;
}

/** Get uptime in seconds */
function uptimeSeconds(): number {
  return Math.round((Date.now() - startTime) / 1000);
}

// --- Extensible component health checks ------------------------------------
// Any module (DB pool, Qdrant, Ollama bridge, ...) can register a CHEAP,
// SYNCHRONOUS deep probe; healthHandler folds the results into /health
// additively. With nothing registered the probe behaves exactly as before.
// Keep callbacks fast and non-throwing -- a thrown check is caught and reported
// as "fail", it never takes down the probe itself.
export interface HealthCheckResult {
  status: "pass" | "warn" | "fail";
  value?: string | number;
}
export type HealthCheckFn = () => HealthCheckResult;

const componentChecks = new Map<string, HealthCheckFn>();

/** Register a named component health check (overwrites an existing same name). */
export function registerHealthCheck(name: string, fn: HealthCheckFn): void {
  componentChecks.set(name, fn);
}

/** Remove a previously registered component health check. */
export function unregisterHealthCheck(name: string): void {
  componentChecks.delete(name);
}

/**
 * /health — Detailed health check.
 * Returns 200 if healthy, 503 if degraded.
 */
export function healthHandler(_req: Request, res: Response): void {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);

  const checks: Record<string, {
    status: "pass" | "warn" | "fail";
    value?: string | number;
  }> = {
    uptime: {
      status: "pass",
      value: `${uptimeSeconds()}s`,
    },
    memory_heap: {
      status: heapUsedMB > 2048 ? "warn" : "pass",
      value: `${heapUsedMB}/${heapTotalMB} MB`,
    },
    memory_rss: {
      status: rssMB > 4096 ? "warn" : "pass",
      value: `${rssMB} MB`,
    },
    node_version: {
      status: "pass",
      value: process.version,
    },
    ready: {
      status: serverReady ? "pass" : "fail",
    },
  };

  // Fold in any registered component checks (DB pool, vector store, local LLM,
  // ...). A throwing check degrades to "fail" instead of crashing the probe.
  for (const [name, fn] of componentChecks) {
    try {
      checks[name] = fn();
    } catch (err) {
      checks[name] = {
        status: "fail",
        value: `check threw: ${(err as Error)?.message ?? String(err)}`,
      };
    }
  }

  const overallStatus = Object.values(checks).some(
    c => c.status === "fail"
  )
    ? "fail"
    : Object.values(checks).some(c => c.status === "warn")
      ? "warn"
      : "pass";

  const statusCode = overallStatus === "fail" ? 503 : 200;

  res.status(statusCode).json({
    status: overallStatus,
    version: "9.0.0",
    service: "prism-mcp-server",
    uptime: uptimeSeconds(),
    checks,
  });
}

/**
 * /ready — Readiness probe.
 * Returns 200 when the server has finished initialization.
 * Returns 503 during startup.
 */
export function readyHandler(_req: Request, res: Response): void {
  if (serverReady) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({
      status: "not_ready",
      message: "Server is still initializing",
    });
  }
}

/**
 * /live — Liveness probe.
 * Always returns 200 if the process is running.
 * Only fails if the event loop is completely blocked (which means
 * this handler wouldn't run anyway).
 */
export function liveHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "alive", pid: process.pid });
}

/**
 * Register all health probe routes on an Express app.
 */
export function registerHealthProbes(
  app: { get: (path: string, handler: (req: Request, res: Response) => void) => void }
): void {
  app.get("/health", healthHandler);
  app.get("/ready", readyHandler);
  app.get("/live", liveHandler);
}
